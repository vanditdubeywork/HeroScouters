import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Copy, FileAudio, HelpCircle, ListPlus, Sparkles } from 'lucide-react'
import { Dialog, InfoNote, ProposedChangesList } from '../components/hs'
import { Button, Checkbox, Input, Kbd, Segmented, Select, Textarea, cn } from '../components/ui'
import { REJECT_REASONS, proposedAsksFromTranscript } from '../data/mock'
import { useApp } from '../store/AppStore'
import { CLIENT_ASK_TYPES, type ClientAsk, type ClientAskType, type ProposedChange } from '../data/types'

/* ==========================================================================
   Dialogs D-01 … D-08 (Product Design Doc §8 "Dialogs" + PRD v0.3 Appendix A) + F-11 copy email
   ========================================================================== */

/** D-01 · Reject with a reason (keys 1–7). v0.3 · batch mode: one reason for the whole selection. */
export function RejectDialog({ open, onClose, candidateName, roleTitle, onConfirm, title, count, defaultReason }: {
  open: boolean; onClose: () => void; candidateName: string; roleTitle: string; onConfirm: (reason: string) => void; title?: string
  /** v0.3 · T1 batch mode: "Reject 6 for Senior Product Manager?" */
  count?: number
  /** v0.3 · T1 pre-picked from the active filter (visa filter → "Work authorization") */
  defaultReason?: string
}) {
  const [reason, setReason] = useState<string>('')
  const [other, setOther] = useState('')
  const batch = (count ?? 0) > 1
  useEffect(() => { if (open) { setReason(defaultReason ?? ''); setOther('') } }, [open, defaultReason])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      const n = Number(e.key)
      if (n >= 1 && n <= REJECT_REASONS.length) setReason(REJECT_REASONS[n - 1])
      if (e.key === 'Enter' && reason) confirm()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  const confirm = () => { if (!reason) return; onConfirm(reason === 'Other' && other ? `Other — ${other}` : reason); onClose() }
  return (
    <Dialog open={open} onClose={onClose}
      title={title ?? (batch ? `Reject ${count} for ${roleTitle}?` : `Reject ${candidateName} for ${roleTitle}?`)}
      description={batch
        ? 'One reason for the whole batch. It’s logged for each person, and one Undo restores all of them.'
        : "You can undo this from the role's rejected list."}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={!reason} onClick={confirm} data-autofocus>{batch ? `Reject ${count}` : 'Reject'}</Button></>}>
      {batch && defaultReason && reason === defaultReason && (
        <p className="mb-3 text-xs text-muted-foreground">Picked from your filter. Change it if it doesn’t fit everyone.</p>
      )}
      <div role="radiogroup" aria-label="Reason" className="grid grid-cols-2 gap-1.5">
        {REJECT_REASONS.map((r, i) => (
          <button key={r} role="radio" aria-checked={reason === r} onClick={() => setReason(r)}
            className={cn('flex h-9 items-center gap-2 rounded-lg border px-2.5 text-left text-sm transition-colors', reason === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>
            <Kbd className={reason === r ? 'border-primary-foreground/30 bg-transparent text-primary-foreground/70' : ''}>{i + 1}</Kbd>{r}
          </button>
        ))}
      </div>
      {reason === 'Other' && <div className="mt-3"><Textarea autoFocus placeholder="What's the reason?" value={other} onChange={e => setOther(e.target.value)} /></div>}
    </Dialog>
  )
}

/**
 * D-02 · Rerun matching (cost visible before acting).
 * v0.3 · T2 — re-scores only the candidates already scored; optional "Also score new passers".
 */
export function RerunDialog({ open, onClose, roleLabel, count, onConfirm, force, newPassers, newScoreCount }: {
  open: boolean; onClose: () => void; roleLabel: string; count: number
  onConfirm: (opts?: { alsoScoreNew: boolean }) => void; force?: boolean
  /** v0.3 · unscored passers available for "Also score new passers" */
  newPassers?: number
  /** v0.3 · how many of them would be scored (default number to score) */
  newScoreCount?: number
}) {
  const [alsoNew, setAlsoNew] = useState(false)
  useEffect(() => { if (open) setAlsoNew(false) }, [open])
  const extra = newPassers ? Math.min(newPassers, newScoreCount ?? newPassers) : 0
  const total = count + (alsoNew ? extra : 0)
  return (
    <Dialog open={open} onClose={onClose} title={`Rerun matching for ${roleLabel}?`}
      description={<>
        {force && 'Nothing has changed since the last run. '}
        Re-scores only the <span className="font-mono text-foreground tnum">{count}</span> candidate{count === 1 ? '' : 's'} already scored. Earlier decisions stay: shortlisted stays shortlisted, rejected stays rejected.
      </>}
      footer={<>
        <span className="mr-auto font-mono text-[11px] text-muted-foreground tnum">{total} AI scores</span>
        <Button variant="ghost" onClick={onClose}>Not now</Button>
        <Button variant="primary" data-autofocus onClick={() => { onConfirm({ alsoScoreNew: alsoNew }); onClose() }}>Rerun {total}</Button>
      </>}>
      {newPassers !== undefined && newPassers > 0 ? (
        <Checkbox checked={alsoNew} onChange={setAlsoNew}
          label="Also score new passers"
          description={<>Scores the next <span className="font-mono tnum">{extra}</span> of <span className="font-mono tnum">{newPassers}</span> not scored yet, by similarity. +<span className="font-mono tnum">{extra}</span> AI scores.</>} />
      ) : undefined}
    </Dialog>
  )
}

/** D-03 · Review proposed changes (AI never overwrites without approval) */
export function ProposedChangesDialog({ open, onClose, changes, onApply, subtitle }: {
  open: boolean; onClose: () => void; changes: ProposedChange[]; onApply: (accepted: ProposedChange[]) => void; subtitle?: string
}) {
  const [decisions, setDecisions] = useState<Record<string, 'accept' | 'reject'>>({})
  useEffect(() => { if (open) setDecisions({}) }, [open])
  const accepted = changes.filter(c => (decisions[c.id] ?? 'accept') === 'accept')
  return (
    <Dialog open={open} onClose={onClose} width={640} title={`Review ${changes.length} proposed changes`}
      description={subtitle ?? 'Accepted changes are logged. Confirmed values are never overwritten without your approval.'}
      footer={<><Button variant="ghost" onClick={onClose}>Discard</Button><Button variant="primary" data-autofocus disabled={!accepted.length} onClick={() => { onApply(accepted); onClose() }}>Apply {accepted.length} change{accepted.length === 1 ? '' : 's'}</Button></>}>
      <ProposedChangesList changes={changes} decisions={decisions} onDecide={(id, d) => setDecisions(x => ({ ...x, [id]: d }))} />
    </Dialog>
  )
}

/** D-04 · Include anyway (override, explained + logged) */
export function IncludeAnywayDialog({ open, onClose, candidateName, failing, onConfirm }: {
  open: boolean; onClose: () => void; candidateName: string; failing: string[]; onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')
  useEffect(() => { if (open) setNote('') }, [open])
  return (
    <Dialog open={open} onClose={onClose} title={`Include ${candidateName} anyway?`}
      description={<>Fails: <span className="text-foreground">{failing.join(' · ')}</span>. They'll be ranked with everyone else. The override is logged.</>}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" data-autofocus onClick={() => { onConfirm(note); onClose() }}>Include in ranking</Button></>}>
      <Textarea placeholder="Optional note, e.g. “Open to relocating — told me on the call”" value={note} onChange={e => setNote(e.target.value)} />
    </Dialog>
  )
}

/** D-05 · Leave without saving */
export function LeaveDialog({ open, onClose, onLeave, what = 'this role' }: { open: boolean; onClose: () => void; onLeave: () => void; what?: string }) {
  return (
    <Dialog open={open} onClose={onClose} title="Leave without saving?" description={`Your changes to ${what} will be lost.`}
      footer={<><Button variant="ghost" onClick={onLeave}>Leave</Button><Button variant="primary" data-autofocus onClick={onClose}>Keep editing</Button></>}
    />
  )
}

/** Generic named-consequence confirm (e.g. Delete candidate) */
export function ConfirmDialog({ open, onClose, title, body, confirmLabel, cancelLabel = 'Cancel', onConfirm, destructive }: {
  open: boolean; onClose: () => void; title: string; body: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; destructive?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={body}
      footer={<><Button variant="ghost" data-autofocus onClick={onClose}>{cancelLabel}</Button><Button variant={destructive ? 'destructive' : 'primary'} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button></>}
    />
  )
}

/**
 * D-06 · Confirm assumed must-haves before a bulk shortlist (PRD v0.3 §7.1).
 * "2 of 6 have assumed must-haves (work authorization ×2)."
 * Shortlist the 4 verified (default) · Shortlist all 6 · Cancel · link: Add 2 questions to the ask list.
 */
export function ConfirmAssumedDialog({ open, onClose, total, assumed, fieldCounts, outOfDate, onShortlistVerified, onShortlistAll, onAddQuestions }: {
  open: boolean; onClose: () => void
  /** eligible rows in the selection (already-shortlisted excluded) */
  total: number
  /** rows with at least one assumed must-have */
  assumed: number
  /** { 'Work authorization': 2 } */
  fieldCounts: Record<string, number>
  /** the run is out of date (must-haves changed since scoring) */
  outOfDate?: boolean
  onShortlistVerified: () => void; onShortlistAll: () => void; onAddQuestions?: () => void
}) {
  const verified = total - assumed
  const fields = Object.entries(fieldCounts).map(([f, n]) => `${f.toLowerCase()}${n > 1 ? ` ×${n}` : ''}`).join(', ')
  const [asked, setAsked] = useState(false)
  useEffect(() => { if (open) setAsked(false) }, [open])
  return (
    <Dialog open={open} onClose={onClose} width={500}
      title={assumed ? `Shortlist ${total} with assumed must-haves?` : `Shortlist ${total} from an out-of-date run?`}
      description={assumed
        ? <><span className="font-mono text-foreground tnum">{assumed}</span> of <span className="font-mono text-foreground tnum">{total}</span> have assumed must-haves ({fields}). Assumed means the value is missing and was treated as a pass.</>
        : 'Must-haves changed since these were scored. Their bands may move after a rerun.'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {assumed > 0 && verified > 0 ? (
          <>
            <Button variant="outline" onClick={() => { onShortlistAll(); onClose() }}>Shortlist all {total}</Button>
            <Button variant="primary" data-autofocus icon={<Check />} onClick={() => { onShortlistVerified(); onClose() }}>Shortlist the {verified} verified</Button>
          </>
        ) : (
          <Button variant="primary" data-autofocus icon={<Check />} onClick={() => { onShortlistAll(); onClose() }}>Shortlist all {total}</Button>
        )}
      </>}>
      <div className="space-y-3">
        {assumed > 0 && outOfDate && (
          <p className="flex items-start gap-1.5 text-xs text-[#b45309]"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />The run is also out of date: must-haves changed since these were scored.</p>
        )}
        {assumed > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(fieldCounts).map(([f, n]) => (
              <span key={f} className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-warning bg-warning/[0.06] px-1.5 text-xs text-[#b45309]">
                <HelpCircle className="size-3" />{f}<span className="font-mono text-[10px] tnum">×{n}</span>
              </span>
            ))}
          </div>
        )}
        {assumed > 0 && onAddQuestions && (
          asked
            ? <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="size-3.5" />Added {assumed} question{assumed === 1 ? '' : 's'} to the ask list</p>
            : <Button variant="link" className="text-xs" icon={<ListPlus />} onClick={() => { onAddQuestions(); setAsked(true) }}>Add {assumed} question{assumed === 1 ? '' : 's'} to the ask list</Button>
        )}
        {!assumed && <InfoNote>Shortlisting now is fine if you know these people. Rerun first if you want fresh bands.</InfoNote>}
      </div>
    </Dialog>
  )
}

/* ---------- D-08 · Add client ask (PRD v0.3 §7.7) ---------- */
export const ASK_COLUMNS = ['Location', 'Work authorization', 'Minimum years', 'Work mode', 'Category'] as const
/** "NYC" → Location · "sponsor" → Work authorization · "5+ years" → Minimum years */
export function suggestAskColumn(text: string): (typeof ASK_COLUMNS)[number] | null {
  const t = text.toLowerCase()
  if (/\b(sponsor\w*|visa|h-?1b|green card|citizen\w*|work auth\w*|opt)\b/.test(t)) return 'Work authorization'
  if (/\b(nyc|new york|sf|san francisco|bay area|seattle|austin|boston|chicago|la|los angeles|location|based in|relocat\w*|city|metro)\b/.test(t)) return 'Location'
  if (/\d+\+?\s*(years|yrs)\b|\byears of\b/.test(t)) return 'Minimum years'
  if (/\b(remote|onsite|on-site|hybrid|in office|in-office)\b/.test(t)) return 'Work mode'
  return null
}

type AskSource = ClientAsk['source']
export interface AskDraft { text: string; type: ClientAskType; column: string; source: AskSource; saidBy: string; when: string; typeTouched: boolean }
const EMPTY_ASK: AskDraft = { text: '', type: 'must-signal', column: 'Location', source: 'Call', saidBy: '', when: 'Today', typeTouched: false }

/** Shared form state for D-08 and the inline composer on S-03 */
export function useAskDraft(roleId: string) {
  const app = useApp()
  const [d, setD] = useState<AskDraft>(EMPTY_ASK)
  const suggestion = suggestAskColumn(d.text)
  const setText = (text: string) => setD(x => {
    const s = suggestAskColumn(text)
    if (x.typeTouched) return { ...x, text }
    return s ? { ...x, text, type: 'must-column', column: s } : { ...x, text, type: x.type === 'must-column' ? 'must-signal' : x.type }
  })
  const valid = d.text.trim().length > 2
  const save = () => {
    if (!valid) return false
    app.addClientAsk({
      roleId, text: d.text.trim(), type: d.type, column: d.type === 'must-column' ? d.column : undefined,
      source: d.source, saidBy: d.saidBy.trim() || undefined, when: d.when.trim() || 'Today',
    })
    return true
  }
  return { d, setD, setText, suggestion, valid, save, reset: () => setD(EMPTY_ASK) }
}

export function AskFields({ draft, compact }: { draft: ReturnType<typeof useAskDraft>; compact?: boolean }) {
  const { d, setD, setText, suggestion } = draft
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ask-text">What did the client ask for?</label>
        <Input id="ask-text" autoFocus={!compact} data-autofocus placeholder="In our words, e.g. “Has led a team of 5+”" value={d.text} onChange={e => setText(e.target.value)} />
        {suggestion && d.type === 'must-column' && !d.typeTouched && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="size-3.5" />Matches a column: suggested <span className="text-foreground">Must-have (column) · {suggestion}</span></p>
        )}
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">Type</span>
        <div role="radiogroup" aria-label="Ask type" className={cn('grid gap-1.5', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          {CLIENT_ASK_TYPES.map(t => {
            const on = d.type === t.value
            return (
              <button key={t.value} type="button" role="radio" aria-checked={on}
                onClick={() => setD(x => ({ ...x, type: t.value, typeTouched: true, column: t.value === 'must-column' ? (suggestion ?? x.column) : x.column }))}
                className={cn('flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                  on ? 'border-gray-1100 bg-secondary' : 'border-border hover:bg-muted')}>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span className={cn('flex size-3.5 items-center justify-center rounded-full border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-700')}>{on && <Check className="size-2.5" strokeWidth={3} />}</span>
                  {t.label}
                  {suggestion && t.value === 'must-column' && <span className="eyebrow text-[9px] text-gray-1000">Suggested</span>}
                </span>
                <span className="pl-5 text-[11px] leading-snug text-muted-foreground">{t.effect}</span>
              </button>
            )
          })}
        </div>
        {d.type === 'must-column' && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Column</span>
            <Select aria-label="Column" value={d.column} onChange={v => setD(x => ({ ...x, column: v }))} options={[...ASK_COLUMNS]} />
          </div>
        )}
      </div>
      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'sm:grid-cols-[auto_minmax(0,1fr)_120px]')}>
        <div className="space-y-2">
          <span className="text-sm font-medium">Source</span>
          <div><Segmented aria-label="Source" size="sm" value={d.source} onChange={v => setD(x => ({ ...x, source: v }))} options={['Call', 'Email', 'Chat'] as AskSource[]} /></div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ask-who">Who said it</label>
          <Input id="ask-who" placeholder="e.g. Sean (VP Product)" value={d.saidBy} onChange={e => setD(x => ({ ...x, saidBy: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ask-when">When</label>
          <Input id="ask-when" value={d.when} onChange={e => setD(x => ({ ...x, when: e.target.value }))} />
        </div>
      </div>
    </div>
  )
}

/** US-42 · Turn a transcript into client asks (accept / skip each — proposed-changes pattern) */
export function useTranscriptImport(roleId: string) {
  const app = useApp()
  const [link, setLink] = useState('')
  const [read, setRead] = useState(false)
  const [decisions, setDecisions] = useState<Record<number, 'accept' | 'skip'>>({})
  const accepted = proposedAsksFromTranscript.filter((_, i) => (decisions[i] ?? 'accept') === 'accept')
  const apply = () => {
    accepted.forEach(a => app.addClientAsk({ ...a, roleId }))
    return accepted.length
  }
  return { link, setLink, read, setRead, decisions, setDecisions, accepted, apply, reset: () => { setLink(''); setRead(false); setDecisions({}) } }
}

export function TranscriptImportFields({ imp }: { imp: ReturnType<typeof useTranscriptImport> }) {
  const typeLabel = (t: ClientAskType) => CLIENT_ASK_TYPES.find(x => x.value === t)?.label ?? t
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ask-link">Intake call transcript</label>
        <div className="flex items-center gap-2">
          <Input id="ask-link" placeholder="Fathom or Granola link" value={imp.link} onChange={e => { imp.setLink(e.target.value); imp.setRead(false) }} />
          <Button variant="outline" icon={<FileAudio />} disabled={!/\w+\.\w+/.test(imp.link)} onClick={() => imp.setRead(true)}>Read</Button>
        </div>
        {!imp.read && <InfoNote>We propose asks from the call. Nothing is added until you accept it.</InfoNote>}
      </div>
      {imp.read && (
        <div className="space-y-2">
          <div className="eyebrow text-[10px] text-gray-1000">{proposedAsksFromTranscript.length} proposed from the call</div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {proposedAsksFromTranscript.map((a, i) => {
              const d = imp.decisions[i] ?? 'accept'
              return (
                <li key={a.text} className={cn('flex items-center gap-3 px-3 py-2.5', d === 'skip' && 'opacity-50')}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.text}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{typeLabel(a.type)}{a.column ? ` · ${a.column}` : ''} · {a.source}{a.saidBy ? ` · ${a.saidBy}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
                    <button type="button" aria-pressed={d === 'accept'} onClick={() => imp.setDecisions(x => ({ ...x, [i]: 'accept' }))}
                      className={cn('h-6 rounded-md px-2 text-xs font-medium', d === 'accept' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>Accept</button>
                    <button type="button" aria-pressed={d === 'skip'} onClick={() => imp.setDecisions(x => ({ ...x, [i]: 'skip' }))}
                      className={cn('h-6 rounded-md px-2 text-xs font-medium', d === 'skip' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted')}>Skip</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** D-08 · Add client ask — quick, without opening the full role edit. Two paths: type it · import from transcript. */
export function AddClientAskDialog({ open, onClose, roleId, initialMode = 'type' }: {
  open: boolean; onClose: () => void; roleId: string; initialMode?: 'type' | 'transcript'
}) {
  const [mode, setMode] = useState<'type' | 'transcript'>(initialMode)
  const draft = useAskDraft(roleId)
  const imp = useTranscriptImport(roleId)
  useEffect(() => { if (open) { setMode(initialMode); draft.reset(); imp.reset() } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const effect = CLIENT_ASK_TYPES.find(t => t.value === draft.d.type)
  return (
    <Dialog open={open} onClose={onClose} width={600} title="Add client ask"
      description="Something the client said outside the JD. Must-haves and nice-to-haves mark matches out of date; context doesn’t."
      footer={mode === 'type' ? <>
        {effect && <span className="mr-auto max-w-[260px] truncate text-[11px] text-muted-foreground" title={effect.effect}>{effect.effect}</span>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!draft.valid} onClick={() => { if (draft.save()) onClose() }}>Save ask</Button>
      </> : <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!imp.read || !imp.accepted.length} onClick={() => { imp.apply(); onClose() }}>Add {imp.accepted.length} ask{imp.accepted.length === 1 ? '' : 's'}</Button>
      </>}>
      <div className="space-y-4">
        <Segmented aria-label="How to add" size="sm" value={mode} onChange={setMode}
          options={[{ value: 'type', label: 'Type it' }, { value: 'transcript', label: 'Import from transcript' }]} />
        {mode === 'type' ? <AskFields draft={draft} /> : <TranscriptImportFields imp={imp} />}
      </div>
    </Dialog>
  )
}

/** F-11 · Copy email text — editable preview, two variants, descriptive one-liners, no IDs. v0.3 · signed takes go under each candidate (P13). */
export function CopyEmailDialog({ open, onClose, candidateIds, roleId, initialVariant }: {
  open: boolean; onClose: () => void; candidateIds: string[]; roleId?: string | null; initialVariant?: 'prospect' | 'client'
}) {
  const { candidate, role, toast, takeFor, member, currentUser } = useApp()
  const r = roleId ? role(roleId) : undefined
  const [variant, setVariant] = useState<'prospect' | 'client'>(initialVariant ?? (r?.companyType === 'Client' ? 'client' : 'prospect'))
  const [topOnly, setTopOnly] = useState(false)
  const ids = useMemo(() => (topOnly ? candidateIds.slice(0, 5) : candidateIds), [topOnly, candidateIds])
  const build = (v: 'prospect' | 'client') => {
    const people = ids.map(id => candidate(id)).filter((c): c is NonNullable<typeof c> => !!c)
    const lines = people.map(c => {
      const line = v === 'prospect'
        ? `• ${c.headline.split(' · ')[0]} · ${c.years ?? '—'} yrs · ${c.metro ?? 'US'}${c.workModes ? ` (${c.workModes[0].toLowerCase()})` : ''} · ${c.skills.slice(0, 2).join(' + ') || c.subcategory}`
        : `• ${c.name} — ${c.headline}. ${c.achievements[0] ?? ''}`
      // Only signed takes ever reach an email; drafts never print (US-44)
      const t = takeFor(c.id, roleId ?? null)
      const author = t?.status === 'signed' ? member(t.authorId) : undefined
      return t?.status === 'signed' && author ? `${line}\n  “${t.text}” — ${author.displayName}, ${author.title}` : line
    })
    const sign = `${currentUser.displayName.split(' ')[0]}\nHeroScouter`
    if (v === 'prospect') {
      return `Hi {first name},\n\nI saw ${r ? `you're hiring a ${r.title}` : 'your team is growing'} and wanted to share ${people.length === 1 ? 'someone' : `${people.length} people`} we've already vetted who ${people.length === 1 ? 'is' : 'are'} ready to talk:\n\n${lines.join('\n')}\n\nMasked profiles are attached. Reply and we'll set up intros this week.\n\n${sign}`
    }
    return `Hi {first name},\n\nHere's the shortlist for ${r ? `the ${r.title} role` : 'the role'}, in the order I'd interview them:\n\n${lines.join('\n')}\n\nResumes are attached. Reply and we'll set up intros this week.\n\n${sign}`
  }
  const [text, setText] = useState(build(variant))
  useEffect(() => { if (open) setTopOnly(false) }, [open])
  useEffect(() => { if (open) setText(build(variant)) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, variant, ids.join(',')])
  return (
    <Dialog open={open} onClose={onClose} width={620} title="Copy email text"
      description="Edit before copying. Short and personal; no candidate IDs. Signed takes go under each person."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" icon={<Copy />} data-autofocus onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); toast(`Copied email text for ${ids.length}`); onClose() }}>Copy</Button>
      </>}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented value={variant} onChange={setVariant} options={[{ value: 'prospect', label: 'Prospect pitch' }, { value: 'client', label: 'Client shortlist' }]} />
        <span className="font-mono text-[11px] text-muted-foreground tnum">{ids.length} candidate{ids.length === 1 ? '' : 's'} · in shortlist order</span>
      </div>
      {candidateIds.length > 6 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs">
          <span className="flex-1 text-gray-1100">{topOnly ? 'Sending your top 5.' : 'Long lists get fewer replies. Send your top 5?'}</span>
          <Button variant="link" className="text-xs" onClick={() => setTopOnly(t => !t)}>{topOnly ? `Use all ${candidateIds.length}` : 'Use top 5'}</Button>
        </div>
      )}
      <Textarea value={text} onChange={e => setText(e.target.value)} className="min-h-[260px] font-mono text-[12.5px] leading-relaxed" />
    </Dialog>
  )
}

export type { React }
