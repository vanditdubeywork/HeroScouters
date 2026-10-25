import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, Check, Copy, ExternalLink, FileAudio, HelpCircle, Link2, ListPlus, Mail, Send, Sparkles, Table2,
} from 'lucide-react'
import { Dialog, InfoNote, ProposedChangesList } from '../components/hs'
import { Button, Checkbox, Input, Kbd, Segmented, Select, Textarea, cn } from '../components/ui'
import { REJECT_REASONS, proposedAsksFromTranscript } from '../data/mock'
import { useApp } from '../store/AppStore'
import {
  CLIENT_ASK_TYPES, ELIMINATOR_COLUMNS, NOT_INTERESTED_REASONS,
  type ClientAsk, type ClientAskType, type EmailDraftKind, type NotInterestedReason,
  type OutputDelivery, type ProposedChange, type RequirementColumn, type RequirementEffect,
} from '../data/types'

/* ==========================================================================
   Dialogs D-01 … D-10 + N27 DraftPanel (PRD v0.4 Appendix A)
   ========================================================================== */

/** D-01 · Reject with a reason (keys 1–7). Batch mode: one reason for the whole selection. */
export function RejectDialog({ open, onClose, candidateName, roleTitle, onConfirm, title, count, defaultReason }: {
  open: boolean; onClose: () => void; candidateName: string; roleTitle: string; onConfirm: (reason: string) => void; title?: string
  count?: number
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

/** D-02 · Rerun matching (re-scores only the candidates already scored; shows count first). */
export function RerunDialog({ open, onClose, roleLabel, count, onConfirm, force, newPassers, newScoreCount }: {
  open: boolean; onClose: () => void; roleLabel: string; count: number
  onConfirm: (opts?: { alsoScoreNew: boolean }) => void; force?: boolean
  newPassers?: number
  newScoreCount?: number
}) {
  const [alsoNew, setAlsoNew] = useState(false)
  useEffect(() => { if (open) setAlsoNew(false) }, [open])
  const extra = newPassers ? Math.min(newPassers, newScoreCount ?? newPassers) : 0
  const total = count + (alsoNew ? extra : 0)
  return (
    <Dialog open={open} onClose={onClose} title={`Re-score ${roleLabel}?`}
      description={<>
        {force && 'Nothing has changed since the last run. '}
        Re-scores only the <span className="font-mono text-foreground tnum">{count}</span> candidate{count === 1 ? '' : 's'} already scored. Earlier decisions stay: shortlisted stays shortlisted, rejected stays rejected, not interested stays hidden.
      </>}
      footer={<>
        <span className="mr-auto font-mono text-[11px] text-muted-foreground tnum">{total} AI scores</span>
        <Button variant="ghost" onClick={onClose}>Not now</Button>
        <Button variant="primary" data-autofocus onClick={() => { onConfirm({ alsoScoreNew: alsoNew }); onClose() }}>Re-score {total}</Button>
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
      description={<>Fails: <span className="text-foreground">{failing.join(' · ')}</span>. They'll be placed in Not scored so you can score or shortlist them. The override is logged.</>}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" data-autofocus onClick={() => { onConfirm(note); onClose() }}>Include anyway</Button></>}>
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

/** Generic named-consequence confirm */
export function ConfirmDialog({ open, onClose, title, body, confirmLabel, cancelLabel = 'Cancel', onConfirm, destructive }: {
  open: boolean; onClose: () => void; title: string; body: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; destructive?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={body}
      footer={<><Button variant="ghost" data-autofocus onClick={onClose}>{cancelLabel}</Button><Button variant={destructive ? 'destructive' : 'primary'} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button></>}
    />
  )
}

/** D-06 · Confirm assumed requirements before a bulk shortlist (PRD v0.4 §7.3). */
export function ConfirmAssumedDialog({ open, onClose, total, assumed, fieldCounts, outOfDate, onShortlistVerified, onShortlistAll, onAddQuestions }: {
  open: boolean; onClose: () => void
  total: number
  assumed: number
  fieldCounts: Record<string, number>
  outOfDate?: boolean
  onShortlistVerified: () => void; onShortlistAll: () => void; onAddQuestions?: () => void
}) {
  const verified = total - assumed
  const fields = Object.entries(fieldCounts).map(([f, n]) => `${f.toLowerCase()}${n > 1 ? ` ×${n}` : ''}`).join(', ')
  const [asked, setAsked] = useState(false)
  useEffect(() => { if (open) setAsked(false) }, [open])
  return (
    <Dialog open={open} onClose={onClose} width={500}
      title={assumed ? `Shortlist ${total} with assumed requirements?` : `Shortlist ${total} from an out-of-date run?`}
      description={assumed
        ? <><span className="font-mono text-foreground tnum">{assumed}</span> of <span className="font-mono text-foreground tnum">{total}</span> have assumed requirements ({fields}). Assumed means the value is missing and was treated as a pass.</>
        : 'Requirements changed since these were scored. Their recommendations may change after re-scoring.'}
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
          <p className="flex items-start gap-1.5 text-xs text-[#b45309]"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />The run is also out of date: requirements changed since these were scored.</p>
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
        {!assumed && <InfoNote>Shortlisting now is fine if you know these people. Re-score first if you want updated recommendations.</InfoNote>}
      </div>
    </Dialog>
  )
}

/* ---------- D-08 · Add requirement (v0.4 §7.1: unified Requirements list with Eliminates vs Improves score) ---------- */
export const ASK_COLUMNS: RequirementColumn[] = [
  'Minimum years',
  'Work authorization',
  'Location',
  'Category',
  'Sub-category',
  'Domain',
  'Skills',
  'Pay',
  'Availability',
]

export function suggestAskColumn(text: string): RequirementColumn | null {
  const t = text.toLowerCase()
  if (/\b(sponsor\w*|visa|h-?1b|green card|citizen\w*|work auth\w*|opt|transfer)\b/.test(t)) return 'Work authorization'
  if (/\b(nyc|new york|sf|san francisco|bay area|seattle|austin|boston|chicago|la|los angeles|location|based in|relocat\w*|city|metro|remote|onsite|hybrid)\b/.test(t)) return 'Location'
  if (/\d+\+?\s*(years|yrs)\b|\byears of\b/.test(t)) return 'Minimum years'
  if (/\b(engineer\w*|product|marketing|design|data|sales|ops)\b/.test(t) && /\b(category|function|role)\b/.test(t)) return 'Category'
  if (/\b(fintech|payments|b2b|saas|healthtech|marketplace|devtools|ai|ml|domain)\b/.test(t)) return 'Domain'
  if (/\b(sql|python|react|node|go|kafka|figma|braze|linkedin ads|dbt)\b/.test(t)) return 'Skills'
  return null
}

type AskSource = ClientAsk['source']
export interface AskDraft {
  text: string
  type: ClientAskType
  effect: RequirementEffect
  column: RequirementColumn | ''
  source: AskSource
  saidBy: string
  when: string
  typeTouched: boolean
}
const EMPTY_ASK: AskDraft = {
  text: '',
  type: 'must-signal',
  effect: 'improves',
  column: '',
  source: 'Call',
  saidBy: '',
  when: 'Today',
  typeTouched: false,
}

export function useAskDraft(roleId: string) {
  const app = useApp()
  const [d, setD] = useState<AskDraft>(EMPTY_ASK)
  const suggestion = suggestAskColumn(d.text)
  const setText = (text: string) => setD(x => {
    const s = suggestAskColumn(text)
    if (x.typeTouched) return { ...x, text }
    const canElim = !!s && ELIMINATOR_COLUMNS.includes(s)
    return {
      ...x,
      text,
      column: s ?? '',
      effect: canElim ? 'eliminates' : 'improves',
      type: canElim ? 'must-column' : 'must-signal',
    }
  })
  const valid = d.text.trim().length > 2
  const save = () => {
    if (!valid) return false
    const col = d.column || undefined
    const canElim = !!col && ELIMINATOR_COLUMNS.includes(col)
    const finalEffect: RequirementEffect = canElim && d.effect === 'eliminates' ? 'eliminates' : 'improves'
    app.addRequirement(roleId, {
      text: d.text.trim(),
      source: d.source,
      saidBy: d.saidBy.trim() || undefined,
      when: d.when.trim() || 'Today',
      effect: finalEffect,
      column: col,
    })
    return true
  }
  return { d, setD, setText, suggestion, valid, save, reset: () => setD(EMPTY_ASK) }
}

export function AskFields({ draft, compact }: { draft: ReturnType<typeof useAskDraft>; compact?: boolean }) {
  const { d, setD, setText, suggestion } = draft
  const canEliminate = !!d.column && ELIMINATOR_COLUMNS.includes(d.column)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ask-text">Requirement (in our words)</label>
        <Input id="ask-text" autoFocus={!compact} data-autofocus placeholder="e.g. “6+ years in PM”, “No sponsorship — transfer is fine”, or “Has led a team of 5+”" value={d.text} onChange={e => setText(e.target.value)} />
        {suggestion && !d.typeTouched && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            Maps to column <span className="font-medium text-foreground">{suggestion}</span> · default effect:{' '}
            <span className="font-medium text-foreground">{ELIMINATOR_COLUMNS.includes(suggestion) ? 'Eliminates (hard filter)' : 'Improves score'}</span>
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="text-sm font-medium">Stored column (if any)</span>
          <Select
            aria-label="Stored column"
            value={d.column || 'none'}
            onChange={v => {
              const col = v === 'none' ? '' : (v as RequirementColumn)
              const allowElim = !!col && ELIMINATOR_COLUMNS.includes(col)
              setD(x => ({
                ...x,
                column: col,
                typeTouched: true,
                effect: allowElim ? x.effect : 'improves',
              }))
            }}
            options={[
              { value: 'none', label: 'No column (free-text signal only)' },
              ...ASK_COLUMNS.map(c => ({
                value: c,
                label: `${c}${ELIMINATOR_COLUMNS.includes(c) ? ' (can eliminate)' : ' (improves score)'}`,
              })),
            ]}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Effect on pipeline</span>
          <div>
            <Segmented
              aria-label="Requirement effect"
              size="sm"
              value={canEliminate ? d.effect : 'improves'}
              onChange={eff => {
                if (eff === 'eliminates' && !canEliminate) return
                setD(x => ({ ...x, effect: eff, typeTouched: true, type: eff === 'eliminates' ? 'must-column' : 'must-signal' }))
              }}
              options={[
                { value: 'eliminates', label: 'Eliminates (Stage 1)', disabled: !canEliminate },
                { value: 'improves', label: 'Improves score (Stage 2)' },
              ]}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {canEliminate
              ? d.effect === 'eliminates'
                ? 'Hard filter on stored column. Re-runs Stage 1 for free; missing data still passes as Assumed.'
                : 'Checked during AI scoring instead of eliminating.'
              : 'Only Minimum years, Work authorization, Location and Category can eliminate.'}
          </p>
        </div>
      </div>

      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'sm:grid-cols-[auto_minmax(0,1fr)_120px]')}>
        <div className="space-y-2">
          <span className="text-sm font-medium">Source</span>
          <div><Segmented aria-label="Source" size="sm" value={d.source} onChange={v => setD(x => ({ ...x, source: v }))} options={['JD', 'Call', 'Email', 'Chat'] as AskSource[]} /></div>
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

/** US-42 · Turn a transcript into proposed requirements */
export function useTranscriptImport(roleId: string) {
  const app = useApp()
  const [link, setLink] = useState('')
  const [read, setRead] = useState(false)
  const [decisions, setDecisions] = useState<Record<number, 'accept' | 'skip'>>({})
  const accepted = proposedAsksFromTranscript.filter((_, i) => (decisions[i] ?? 'accept') === 'accept')
  const apply = () => {
    accepted.forEach(a => {
      const col = a.column as RequirementColumn | undefined
      const canElim = !!col && ELIMINATOR_COLUMNS.includes(col)
      app.addRequirement(roleId, {
        text: a.text,
        source: a.source,
        saidBy: a.saidBy,
        when: a.when,
        effect: a.type === 'must-column' && canElim ? 'eliminates' : 'improves',
        column: col,
      })
    })
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
          <Input id="ask-link" placeholder="Fathom or Granola link (e.g. fathom.video/share/nw-sean)" value={imp.link} onChange={e => { imp.setLink(e.target.value); imp.setRead(false) }} />
          <Button variant="outline" icon={<FileAudio />} disabled={!/\w+\.\w+/.test(imp.link)} onClick={() => imp.setRead(true)}>Read</Button>
          {!imp.link && (
            <Button variant="ghost" size="sm" onClick={() => { imp.setLink('https://fathom.video/share/northwind-sean-intake'); imp.setRead(true) }}>
              Use example call
            </Button>
          )}
        </div>
        {!imp.read && <InfoNote>We propose requirements from the call. Nothing is added until you accept it.</InfoNote>}
      </div>
      {imp.read && (
        <div className="space-y-2">
          <div className="eyebrow text-[10px] text-gray-1000">{proposedAsksFromTranscript.length} proposed requirements from the call</div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {proposedAsksFromTranscript.map((a, i) => {
              const d = imp.decisions[i] ?? 'accept'
              return (
                <li key={a.text} className={cn('flex items-center gap-3 px-3 py-2.5', d === 'skip' && 'opacity-50')}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.text}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{typeLabel(a.type)}{a.column ? ` · Column: ${a.column}` : ' · No column'} · {a.source}{a.saidBy ? ` · ${a.saidBy}` : ''}</div>
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

/** D-08 · Add requirement (also exported as AddClientAskDialog for compatibility). */
export function AddClientAskDialog({ open, onClose, roleId, initialMode = 'type' }: {
  open: boolean; onClose: () => void; roleId: string; initialMode?: 'type' | 'transcript'
}) {
  const [mode, setMode] = useState<'type' | 'transcript'>(initialMode)
  const draft = useAskDraft(roleId)
  const imp = useTranscriptImport(roleId)
  useEffect(() => { if (open) { setMode(initialMode); draft.reset(); imp.reset() } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onClose={onClose} width={600} title="Add requirement"
      description="Add what the client said on a call or email to the role’s unified Requirements list. Eliminates rules re-run Stage 1 for free."
      footer={mode === 'type' ? <>
        <span className="mr-auto text-[11px] text-muted-foreground">
          {draft.d.effect === 'eliminates' ? 'Eliminates (hard filter on column)' : 'Improves score (checked by AI)'}
        </span>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!draft.valid} onClick={() => { if (draft.save()) onClose() }}>Save requirement</Button>
      </> : <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!imp.read || !imp.accepted.length} onClick={() => { imp.apply(); onClose() }}>Add {imp.accepted.length} requirement{imp.accepted.length === 1 ? '' : 's'}</Button>
      </>}>
      <div className="space-y-4">
        <Segmented aria-label="How to add" size="sm" value={mode} onChange={setMode}
          options={[{ value: 'type', label: 'Type requirement' }, { value: 'transcript', label: 'Import from call transcript' }]} />
        {mode === 'type' ? <AskFields draft={draft} /> : <TranscriptImportFields imp={imp} />}
      </div>
    </Dialog>
  )
}
export const AddRequirementDialog = AddClientAskDialog

/* ---------- D-10 · Not interested in a role (v0.4 §7.4 · C10 · F-24 · US-51) ---------- */
export function NotInterestedDialog({
  open,
  onClose,
  candidateId,
  roleIds,
  onConfirmed,
}: {
  open: boolean
  onClose: () => void
  candidateId: string
  roleIds: string[]
  onConfirmed?: () => void
}) {
  const app = useApp()
  const c = app.candidate(candidateId)
  const [reason, setReason] = useState<NotInterestedReason>('Pay')
  const [applyProfileUpdate, setApplyProfileUpdate] = useState(true)

  useEffect(() => {
    if (open) {
      setReason('Pay')
      setApplyProfileUpdate(true)
    }
  }, [open])

  const roleLabels = roleIds.map(id => {
    const r = app.role(id)
    return r ? `${r.title} (${r.company})` : id
  })

  // Preview what profile update will be proposed when a preference reason is chosen
  const proposedPreview = useMemo(() => {
    if (!c) return null
    if (reason === 'Pay') return { field: 'Minimum pay expectation', from: c.pay ?? 'Not captured', to: '$190k–$215k' }
    if (reason === 'Location') return { field: 'Open to relocate', from: c.relocate ?? 'Not captured', to: `No (${c.metro ?? 'local'} only)` }
    if (reason === 'Role type') return { field: 'Target sub-category', from: `${c.category} · ${c.subcategory}`, to: `${c.category} · Core IC/Lead only` }
    if (reason === 'Company') return { field: 'Company stage preference', from: (c.companyPrefs ?? []).join(', ') || 'Not captured', to: 'Series B+, no early seed' }
    return null
  }, [c, reason])

  const confirm = () => {
    const prop = app.markNotInterested(candidateId, roleIds, reason)
    if (prop && applyProfileUpdate) {
      prop.apply()
    }
    onConfirmed?.()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={520}
      title={roleIds.length > 1 ? `Mark ${c?.name ?? 'candidate'} not interested in ${roleIds.length} roles?` : `Mark ${c?.name ?? 'candidate'} not interested?`}
      description={
        <>
          Role{roleIds.length > 1 ? 's' : ''}: <span className="font-medium text-foreground">{roleLabels.join(', ')}</span>. They move into the role’s collapsed <span className="font-medium text-foreground">Not interested</span> group and are never suggested for it again, even after reruns.
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" data-autofocus onClick={confirm}>
            {proposedPreview && applyProfileUpdate ? 'Mark not interested & update profile' : 'Mark not interested'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <span className="eyebrow text-[10px] text-gray-1000">Why did they decline? (one tap)</span>
          <div role="radiogroup" aria-label="Not interested reason" className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {NOT_INTERESTED_REASONS.map((r, i) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  'flex h-9 items-center gap-2 rounded-lg border px-2.5 text-left text-sm transition-colors',
                  reason === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
                )}
              >
                <Kbd className={reason === r ? 'border-primary-foreground/30 bg-transparent text-primary-foreground/70' : ''}>{i + 1}</Kbd>
                <span>{r}</span>
              </button>
            ))}
          </div>
        </div>

        {proposedPreview && (
          <div className="rounded-xl border border-info/40 bg-info/[0.06] p-3 space-y-2">
            <Checkbox
              checked={applyProfileUpdate}
              onChange={setApplyProfileUpdate}
              label={`Proposed profile update: ${proposedPreview.field}`}
              description={
                <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="line-through text-muted-foreground">{proposedPreview.from}</span>
                  <span>→</span>
                  <span className="font-semibold text-foreground">{proposedPreview.to}</span>
                  <span className="text-muted-foreground">(affects future matching across other roles)</span>
                </span>
              }
            />
          </div>
        )}
      </div>
    </Dialog>
  )
}

/* ---------- N27 · Email Draft Panel & CopyEmailDialog (v0.4 §7.5, §7.7 · C2, C3, C4 · Probe 1) ---------- */
const DRAFT_KIND_LABELS: { value: EmailDraftKind; label: string; to: string }[] = [
  { value: 'interest-check', label: '1 · Interest check (Candidate)', to: 'Candidate' },
  { value: 'profile-share', label: '2 · Profile share (“Want to talk?”)', to: 'Client' },
  { value: 'shortlist', label: '3 · Client shortlist', to: 'Client' },
  { value: 'pitch', label: '4 · Prospect pitch (masked)', to: 'Prospect' },
  { value: 'roles-for-you', label: '5 · Roles for you', to: 'Candidate' },
]

export function CopyEmailDialog({
  open,
  onClose,
  candidateIds,
  roleId,
  initialVariant,
  initialKind,
}: {
  open: boolean
  onClose: () => void
  candidateIds: string[]
  roleId?: string | null
  initialVariant?: 'prospect' | 'client'
  initialKind?: EmailDraftKind
}) {
  const app = useApp()
  const { candidate, role, toast, takeFor, member, currentUser } = app
  const r = roleId ? role(roleId) : undefined

  const defaultKind: EmailDraftKind = useMemo(() => {
    if (initialKind) return initialKind
    if (initialVariant === 'prospect' || r?.companyType === 'Prospect') return 'pitch'
    if (candidateIds.length === 1 && r?.companyType === 'Client') return 'profile-share'
    return 'shortlist'
  }, [initialKind, initialVariant, r?.companyType, candidateIds.length])

  const [kind, setKind] = useState<EmailDraftKind>(defaultKind)
  /** Probe 1 (C3): 'in-product' (Draft here) vs 'copied-prompt' (Copy prompt for Claude) */
  const [method, setMethod] = useState<'in-product' | 'copied-prompt'>('in-product')
  const [delivery, setDelivery] = useState<OutputDelivery>(r?.companyType === 'Prospect' ? 'link' : 'pdf')
  const [refineInput, setRefineInput] = useState('')
  const [rounds, setRounds] = useState(1)
  const [claudeRounds, setClaudeRounds] = useState<'1' | '2–3' | '4+'>('1')
  const [topOnly, setTopOnly] = useState(false)

  const ids = useMemo(() => (topOnly ? candidateIds.slice(0, 5) : candidateIds), [topOnly, candidateIds])
  const people = useMemo(() => ids.map(id => candidate(id)).filter((c): c is NonNullable<typeof c> => !!c), [ids, candidate])

  const recipientInfo = useMemo(() => {
    if (kind === 'interest-check' || kind === 'roles-for-you') {
      const c = people[0]
      return {
        name: c?.name ?? 'Candidate',
        email: c?.email ?? 'candidate@example.com',
        relation: 'Candidate' as const,
      }
    }
    if (kind === 'pitch' || r?.companyType === 'Prospect') {
      return {
        name: r?.hiringContact?.name ?? `Hiring team at ${r?.company ?? 'Prospect'}`,
        email: r?.hiringContact?.email ?? `talent@${(r?.company ?? 'company').toLowerCase().replace(/[^a-z]/g, '')}.com`,
        relation: 'New prospect' as const,
      }
    }
    return {
      name: r?.hiringContact?.name ?? `Hiring manager at ${r?.company ?? 'Client'}`,
      email: r?.hiringContact?.email ?? `hiring@${(r?.company ?? 'client').toLowerCase().replace(/[^a-z]/g, '')}.com`,
      relation: 'Onboarded client' as const,
    }
  }, [kind, people, r])

  const subject = useMemo(() => {
    if (kind === 'interest-check') return `${r?.title ?? 'Senior role'} at ${r?.company ?? 'a Series B fintech'} — worth a quick look?`
    if (kind === 'profile-share') return `${people[0]?.name ?? 'Candidate'} for ${r?.title ?? 'your open role'} — want to talk to them?`
    if (kind === 'pitch') return `${r?.title ?? 'Hiring'} at ${r?.company ?? 'your team'} — ${people.length} vetted profile${people.length === 1 ? '' : 's'} (masked)`
    if (kind === 'roles-for-you') return `Roles that match what we talked about`
    return `${r?.title ?? 'Role'} shortlist (${people.length}) — ${r?.company ?? 'HeroScouter'}`
  }, [kind, r, people])

  const buildDraft = (k: EmailDraftKind, deliv: OutputDelivery) => {
    const sign = `— ${currentUser.displayName}, ${currentUser.title}`
    const clientWords = (r?.requirements ?? []).filter(q => q.source === 'Call').map(q => `“${q.text}”`).join(', ')
    if (k === 'interest-check') {
      const c = people[0]
      return `Hi ${c?.name.split(' ')[0] ?? 'there'},\n\n${r?.company ?? 'A Series B fintech'} is hiring a ${r?.title ?? 'Senior Product Manager'} (${r?.location ?? 'SF'} · ${r?.workMode ?? 'Hybrid'} · ${r?.pay ?? '$170k–$190k'}).\n\n${clientWords ? `On our intake call they specifically asked for ${clientWords}. ` : ''}Given your work on ${c?.achievements[0]?.toLowerCase() ?? 'payments infrastructure'}, you’re the first person I thought of.\n\nWould you be open to me sharing your profile with ${r?.hiringContact?.name?.split(' ')[0] ?? 'their VP Product'}?\n\n${sign}`
    }
    if (k === 'profile-share') {
      const c = people[0]
      const t = c ? takeFor(c.id, roleId ?? null) : undefined
      const author = t?.status === 'signed' ? member(t.authorId) : undefined
      const takeLine = t?.status === 'signed' && author ? `\nOur take: “${t.text}” — ${author.displayName}, ${author.title}\n` : ''
      return `Hi ${recipientInfo.name.split(' ')[0]},\n\nBefore I check their interest, would you want to talk to ${c?.name ?? 'this candidate'} for the ${r?.title ?? 'role'}?\n\n• ${c?.headline ?? ''} (${c?.years ?? 7} yrs · ${c?.metro ?? 'SF'})\n• ${c?.achievements[0] ?? ''}\n• ${c?.achievements[1] ?? 'Strong domain fit'}${takeLine}\nSay the word and I’ll confirm their interest and set up an intro.\n\n${sign}`
    }
    if (k === 'pitch') {
      const lines = people.map((c, idx) => {
        const alias = `${c.headline.split(' · ')[0]} · ${c.years ?? '—'} yrs · ${c.metro ?? 'US'}${c.workModes ? ` (${c.workModes[0].toLowerCase()})` : ''} · ${c.skills.slice(0, 2).join(' + ') || c.subcategory}`
        const link = deliv === 'link' ? `\n  Read-only profile: https://heroscouter.com/p/${c.id}-masked` : ' (Masked PDF attached)'
        const t = takeFor(c.id, roleId ?? null)
        const author = t?.status === 'signed' ? member(t.authorId) : undefined
        const takeLine = t?.status === 'signed' && author ? `\n  “${t.text}” — ${author.displayName}, ${author.title}` : ''
        return `${idx + 1}. ${alias}${link}${takeLine}`
      })
      return `Hi ${recipientInfo.name.split(' ')[0]},\n\nSaw ${r?.company ?? 'your team'} is hiring a ${r?.title ?? 'role'}. We’ve already spoken with ${people.length === 1 ? 'a candidate who fits' : `${people.length} candidates who fit`} your stack:\n\n${lines.join('\n\n')}\n\nReply with who looks strongest and I’ll confirm their interest and share full details.\n\n${sign}`
    }
    if (k === 'roles-for-you') {
      const c = people[0]
      return `Hi ${c?.name.split(' ')[0] ?? 'there'},\n\nHere are the open roles that best fit what you told me on our call:\n\n1. ${r?.title ?? 'Senior Product Manager'} — ${r?.companyType === 'Prospect' ? 'Series A AI startup' : (r?.company ?? 'Northwind Pay')} (${r?.location ?? 'SF'} · ${r?.pay ?? '$170k–$190k'})\n\nWhich of these should I put your name forward for?\n\n${sign}`
    }
    // Client shortlist
    const lines = people.map((c, idx) => {
      const line = `${idx + 1}. ${c.name} — ${c.headline} (${c.years ?? '—'} yrs · ${c.metro ?? 'US'})\n   • ${c.achievements[0] ?? 'Strong requirement match'}`
      const t = takeFor(c.id, roleId ?? null)
      const author = t?.status === 'signed' ? member(t.authorId) : undefined
      return t?.status === 'signed' && author ? `${line}\n   • Take: “${t.text}” — ${author.displayName}, ${author.title}` : line
    })
    return `Hi ${recipientInfo.name.split(' ')[0]},\n\nHere is our shortlist for the ${r?.title ?? 'role'} at ${r?.company ?? 'your team'}, in the order I’d interview them:\n\n${lines.join('\n\n')}\n\n${deliv === 'link' ? 'Profile links are above.' : 'Resumes are attached.'} Who would you like to meet first?\n\n${sign}`
  }

  /** §7.7 Assembled prompt for "Copy prompt for Claude" (Probe 1 option b) */
  const assembledClaudePrompt = useMemo(() => {
    const reqList = (r?.requirements ?? []).map(q => `- [${q.effect.toUpperCase()}] ${q.text} (${q.source}${q.saidBy ? ` · ${q.saidBy}` : ''})`).join('\n')
    const candContext = people.map(c => {
      const t = takeFor(c.id, roleId ?? null)
      const author = t?.status === 'signed' ? member(t.authorId) : undefined
      const label = kind === 'pitch' ? `[MASKED ALIAS: ${c.headline.split(' · ')[0]} · ${c.years ?? 6} yrs · ${c.metro ?? 'US'}]` : `${c.name} (${c.headline})`
      return `Candidate: ${label}\n- Top facts: ${(c.achievements.slice(0, 2).join('; ')) || c.skills.join(', ')}\n- Signed take: ${t?.status === 'signed' && author ? `“${t.text}” — ${author.displayName}` : 'None (do not invent a take)'}`
    }).join('\n\n')

    return `You are drafting a ${kind} email for ${currentUser.displayName} (${currentUser.title}).

## 1. Recipient & Relationship
- To: ${recipientInfo.name} <${recipientInfo.email}>
- Relationship: ${recipientInfo.relation}
- The ask: ${kind === 'interest-check' ? 'Confirm candidate interest before sharing profile' : kind === 'profile-share' ? 'Ask client if they want to talk to this candidate before we check interest' : kind === 'pitch' ? 'Pitch masked candidates and get a reply' : 'Schedule first interviews'}

## 2. Role & Client's Own Words
- Role: ${r?.title ?? 'Role'} at ${r?.company ?? 'Company'} (${r?.location ?? 'US'} · ${r?.workMode ?? 'Hybrid'} · ${r?.pay ?? 'Competitive'})
- Why this company / research: ${r?.whatGood ?? r?.research ?? 'Fast-shipping product team'}
- Requirements:\n${reqList || '- Core role requirements'}

## 3. Candidate Highlights & Signed Takes
${candContext}

## 4. Guardrails (Locked)
- Keep under 160 words. One clear call to action.
- Never invent facts not listed above.
- ${kind === 'pitch' ? 'PROSPECT GUARDRAIL: Never reveal candidate names, current employers, or IDs.' : 'No internal candidate IDs.'}
`
  }, [kind, r, people, recipientInfo, currentUser, roleId, takeFor, member])

  const [text, setText] = useState(() => buildDraft(defaultKind, delivery))

  useEffect(() => {
    if (open) {
      setKind(defaultKind)
      setDelivery(r?.companyType === 'Prospect' ? 'link' : 'pdf')
      setRounds(1)
      setRefineInput('')
      setTopOnly(false)
      setText(buildDraft(defaultKind, r?.companyType === 'Prospect' ? 'link' : 'pdf'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultKind])

  const handleKindChange = (k: EmailDraftKind) => {
    // Guardrail: prospects only ever get pitch (masked)
    if (r?.companyType === 'Prospect' && (k === 'shortlist' || k === 'profile-share')) {
      toast('Prospect roles only send masked pitches')
      return
    }
    setKind(k)
    setText(buildDraft(k, delivery))
  }

  const applyRefine = (instruction: string) => {
    const ins = instruction.trim()
    if (!ins) return
    setRounds(n => n + 1)
    setRefineInput('')
    if (/short/i.test(ins)) {
      setText(prev => prev.split('\n\n').filter((_, i, arr) => i === 0 || i === 1 || i === arr.length - 1).join('\n\n'))
    } else if (/direct|less salesy/i.test(ins)) {
      setText(prev => prev.replace(/I saw .* and wanted to share/, 'Sharing').replace(/Would you be open to me sharing/, 'Can I send'))
    } else {
      setText(prev => `${prev}\n\nP.S. Note on "${ins}": highlighted from call notes.`)
    }
    toast(`Refined draft (round ${rounds + 1})`)
  }

  const createGmailDraft = () => {
    app.recordEmailDraft({
      kind,
      roleId: roleId ?? undefined,
      candidateIds: ids,
      recipientName: recipientInfo.name,
      recipientEmail: recipientInfo.email,
      recipientRelation: recipientInfo.relation,
      subject,
      body: text,
      method,
      rounds: method === 'in-product' ? rounds : (claudeRounds === '1' ? 1 : claudeRounds === '2–3' ? 2 : 4),
      gmailDraftId: `gmail-draft-${Date.now()}`,
      delivery,
    })
    toast(`Created Gmail draft to ${recipientInfo.name} · alignment updated`)
    onClose()
  }

  const copyOutreachSheetRows = () => {
    const today = new Date().toISOString().slice(0, 10)
    const rows = people.map(c => {
      const alias = `${c.headline.split(' · ')[0]} (${c.years ?? 6}y · ${c.metro ?? 'US'})`
      const link = `https://heroscouter.com/p/${c.id}-masked`
      return [r?.company ?? 'Prospect', r?.title ?? 'Role', alias, link, today, 'Pitched'].join('\t')
    }).join('\n')
    navigator.clipboard?.writeText(rows).catch(() => {})
    toast(`Copied ${people.length} row${people.length === 1 ? '' : 's'} for the outreach sheet`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={720}
      title="Align & draft email"
      description="Draft in the product or copy the assembled prompt for your own Claude (Probe 1). Creating a Gmail draft updates alignment pills automatically."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" icon={<Table2 />} onClick={copyOutreachSheetRows}>
              Copy sheet rows
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<ExternalLink />}
              onClick={() => {
                toast('Opened in Gmail compose (fallback)')
              }}
            >
              Open in Gmail
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="outline"
              icon={<Copy />}
              onClick={() => {
                navigator.clipboard?.writeText(method === 'in-product' ? text : assembledClaudePrompt).catch(() => {})
                app.recordEmailDraft({
                  kind,
                  roleId: roleId ?? undefined,
                  candidateIds: ids,
                  recipientName: recipientInfo.name,
                  recipientEmail: recipientInfo.email,
                  recipientRelation: recipientInfo.relation,
                  subject,
                  body: text,
                  method,
                  rounds: method === 'in-product' ? rounds : (claudeRounds === '1' ? 1 : claudeRounds === '2–3' ? 2 : 4),
                  delivery,
                })
                toast(method === 'in-product' ? `Copied email (${rounds} round${rounds === 1 ? '' : 's'})` : 'Copied assembled prompt for Claude (logged for Probe 1)')
                onClose()
              }}
            >
              {method === 'in-product' ? 'Copy email' : 'Copy prompt & mark sent'}
            </Button>
            <Button variant="primary" icon={<Mail />} data-autofocus onClick={createGmailDraft}>
              Create Gmail draft
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Top bar: Draft kind + Probe 1 option switch */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-[10px] text-gray-1000">Draft type</span>
            <Select
              aria-label="Draft type"
              value={kind}
              onChange={v => handleKindChange(v as EmailDraftKind)}
              options={DRAFT_KIND_LABELS.map(d => ({ value: d.value, label: d.label }))}
            />
          </div>

          <Segmented
            size="sm"
            aria-label="Drafting method (Probe 1)"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'in-product', label: '(a) Draft here' },
              { value: 'copied-prompt', label: '(b) Copy prompt for Claude' },
            ]}
          />
        </div>

        {/* Context strip (§7.7 table) */}
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-secondary/50 p-2.5 text-xs sm:grid-cols-3">
          <div>
            <span className="eyebrow text-[9px] text-gray-1000">To ({recipientInfo.relation})</span>
            <div className="mt-0.5 truncate font-medium text-foreground">{recipientInfo.name} &lt;{recipientInfo.email}&gt;</div>
          </div>
          <div>
            <span className="eyebrow text-[9px] text-gray-1000">Subject</span>
            <div className="mt-0.5 truncate font-medium text-foreground">{subject}</div>
          </div>
          <div>
            <span className="eyebrow text-[9px] text-gray-1000">Resume delivery</span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Segmented
                size="sm"
                aria-label="Delivery in email"
                value={delivery}
                onChange={d => { setDelivery(d); setText(buildDraft(kind, d)) }}
                options={[
                  { value: 'link', label: 'Web link' },
                  { value: 'pdf', label: 'PDF' },
                ]}
              />
            </div>
          </div>
        </div>

        {candidateIds.length > 6 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs">
            <span className="flex-1 text-gray-1100">{topOnly ? 'Sending your top 5.' : 'Long lists get fewer replies. Send your top 5?'}</span>
            <Button variant="link" className="text-xs" onClick={() => setTopOnly(t => !t)}>{topOnly ? `Use all ${candidateIds.length}` : 'Use top 5'}</Button>
          </div>
        )}

        {method === 'in-product' ? (
          <div className="space-y-2.5">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              className="min-h-[210px] font-mono text-[12.5px] leading-relaxed"
            />
            {/* Inline refine bar for email draft (US-57) */}
            <div className="rounded-xl border border-border bg-secondary/40 p-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="eyebrow text-[10px] text-gray-1000">Refine draft with AI · Probe 1 round {rounds}</span>
                <div className="flex flex-wrap gap-1">
                  {['Shorter', 'More direct', 'Lead with payments', 'Less salesy'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => applyRefine(chip)}
                      className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-gray-1100 hover:border-gray-700 hover:text-foreground"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Tell the AI what to change in this email…"
                  value={refineInput}
                  onChange={e => setRefineInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyRefine(refineInput) }}
                />
                <Button variant="outline" size="sm" icon={<Sparkles />} disabled={!refineInput.trim()} onClick={() => applyRefine(refineInput)}>
                  Refine
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Full assembled context (recipient, ask, client’s words, candidate green flags, signed take, guardrails):
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={<Copy />}
                onClick={() => {
                  navigator.clipboard?.writeText(assembledClaudePrompt).catch(() => {})
                  toast('Copied assembled prompt for Claude')
                }}
              >
                Copy prompt
              </Button>
            </div>
            <Textarea
              readOnly
              value={assembledClaudePrompt}
              className="min-h-[200px] font-mono text-[12px] leading-relaxed bg-secondary/40"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs">
              <span className="text-gray-1100">Probe 1 measure — how many rounds did it take in Claude before sending?</span>
              <Segmented
                size="sm"
                aria-label="Claude rounds"
                value={claudeRounds}
                onChange={setClaudeRounds}
                options={[
                  { value: '1', label: '1 round' },
                  { value: '2–3', label: '2–3 rounds' },
                  { value: '4+', label: '4+ rounds' },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}

/* ---------- D-09 · Create Gmail drafts in bulk / Prepare prospect pitches (v0.4 §7.5 · C4 · F-23 · US-54 · US-55) ---------- */
export function CreateGmailDraftsDialog({
  open,
  onClose,
  roleIds,
  candidateIdsByRole,
  mode = 'shortlist',
}: {
  open: boolean
  onClose: () => void
  roleIds: string[]
  candidateIdsByRole?: Record<string, string[]>
  mode?: 'shortlist' | 'prospect-pitches' | 'candidate-checks'
}) {
  const app = useApp()
  const [delivery, setDelivery] = useState<OutputDelivery>('link')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)

  const draftItems = useMemo(() => {
    const items: {
      key: string
      roleId: string
      roleTitle: string
      company: string
      toName: string
      toEmail: string
      subject: string
      attachLabel: string
      candidateIds: string[]
      body: string
    }[] = []

    for (const rId of roleIds) {
      const r = app.role(rId)
      if (!r) continue
      const cIds = candidateIdsByRole?.[rId]
        ?? app.matches.filter(m => m.roleId === rId && m.status === 'shortlisted').map(m => m.candidateId)
      const cands = cIds.map(id => app.candidate(id)).filter((c): c is NonNullable<typeof c> => !!c)

      if (mode === 'candidate-checks') {
        for (const c of cands) {
          items.push({
            key: `${rId}-${c.id}`,
            roleId: rId,
            roleTitle: r.title,
            company: r.company,
            toName: c.name,
            toEmail: c.email ?? `${c.id}@example.com`,
            subject: `${r.title} at ${r.company} (${r.pay}) — worth a quick chat?`,
            attachLabel: 'No attachment (interest check)',
            candidateIds: [c.id],
            body: `Hi ${c.name.split(' ')[0]} — ${r.company} is hiring a ${r.title} (${r.location} · ${r.workMode}). Given your work on ${c.achievements[0] ?? c.headline}, want me to share your profile?\n\n— ${app.currentUser.displayName}`,
          })
        }
      } else {
        const isProspect = r.companyType === 'Prospect' || mode === 'prospect-pitches'
        const toName = r.hiringContact?.name ?? `Hiring team (${r.company})`
        const toEmail = r.hiringContact?.email ?? `talent@${r.company.toLowerCase().replace(/[^a-z]/g, '')}.com`
        const aliases = cands.map((c, idx) => `${idx + 1}. ${ isProspect ? `${c.headline.split(' · ')[0]} (${c.years ?? 6} yrs · ${c.metro ?? 'US'})` : `${c.name} — ${c.headline}` }${delivery === 'link' ? `\n   Link: https://heroscouter.com/p/${c.id}-masked` : ''}`).join('\n')
        items.push({
          key: rId,
          roleId: rId,
          roleTitle: r.title,
          company: r.company,
          toName,
          toEmail,
          subject: isProspect
            ? `${r.title} at ${r.company} — ${cands.length || 1} vetted profile${cands.length === 1 ? '' : 's'} (masked)`
            : `${r.title} shortlist (${cands.length}) — ${r.company}`,
          attachLabel: delivery === 'link'
            ? `${cands.length || 1} read-only masked web link${cands.length === 1 ? '' : 's'}`
            : `${cands.length || 1} ${isProspect ? 'Masked' : 'Client'} PDF${cands.length === 1 ? '' : 's'} attached`,
          candidateIds: cIds,
          body: `Hi ${toName.split(' ')[0]},\n\n${isProspect ? `Saw ${r.company} is hiring a ${r.title}. Here ${cands.length === 1 ? 'is a vetted profile' : `are ${cands.length} vetted profiles`} (masked):` : `Here is our shortlist for ${r.title}:`}\n\n${aliases || '1. Senior candidate · 6 yrs · B2B SaaS'}\n\nReply with who looks strongest and I’ll set up intros.\n\n— ${app.currentUser.displayName}, ${app.currentUser.title}`,
        })
      }
    }
    return items
  }, [roleIds, candidateIdsByRole, mode, delivery, app])

  const createAll = () => {
    draftItems.forEach(item => {
      app.recordEmailDraft({
        kind: mode === 'candidate-checks' ? 'interest-check' : mode === 'prospect-pitches' ? 'pitch' : 'shortlist',
        roleId: item.roleId,
        candidateIds: item.candidateIds,
        recipientName: item.toName,
        recipientEmail: item.toEmail,
        recipientRelation: mode === 'candidate-checks' ? 'Candidate' : mode === 'prospect-pitches' ? 'New prospect' : 'Onboarded client',
        subject: item.subject,
        body: item.body,
        method: 'in-product',
        rounds: 1,
        gmailDraftId: `gmail-batch-${Date.now()}-${item.key}`,
        delivery,
      })
    })
    app.toast(`Created ${draftItems.length} Gmail draft${draftItems.length === 1 ? '' : 's'} in your Drafts folder · alignment updated`)
    onClose()
  }

  const copySheetRows = () => {
    const today = new Date().toISOString().slice(0, 10)
    const rows = draftItems.map(it => [it.company, it.roleTitle, `${it.candidateIds.length || 1} masked profiles`, `https://heroscouter.com/p/${it.roleId}`, today, 'Draft created'].join('\t')).join('\n')
    navigator.clipboard?.writeText(rows).catch(() => {})
    app.toast(`Copied ${draftItems.length} row${draftItems.length === 1 ? '' : 's'} for the outreach sheet`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={680}
      title={`Create ${draftItems.length} Gmail draft${draftItems.length === 1 ? '' : 's'} (review list)`}
      description="Each draft lands in your Gmail Drafts folder with To, subject, body and links/attachments filled in. A person still presses Send."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" icon={<Table2 />} onClick={copySheetRows}>
            Copy rows for outreach sheet
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon={<Send />} data-autofocus onClick={createAll}>
              Create {draftItems.length} Gmail draft{draftItems.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs">
          <span className="text-gray-1100">Delivery format for attached profiles:</span>
          <Segmented
            size="sm"
            aria-label="Bulk delivery format"
            value={delivery}
            onChange={setDelivery}
            options={[
              { value: 'link', label: 'Web links (1-click, no attachments)' },
              { value: 'pdf', label: 'PDF attachments' },
            ]}
          />
        </div>

        <ul className="divide-y divide-border rounded-xl border border-border">
          {draftItems.map((item, idx) => {
            const isExp = expandedIdx === idx
            return (
              <li key={item.key} className="px-3.5 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{item.toName}</span>
                      <span className="font-mono text-xs text-muted-foreground">&lt;{item.toEmail}&gt;</span>
                      <span className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-gray-1100">
                        {item.company} · {item.roleTitle}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gray-1100">Subject: {item.subject}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      <Link2 className="size-3" />{item.attachLabel}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedIdx(isExp ? null : idx)}>
                      {isExp ? 'Hide' : 'Preview'}
                    </Button>
                  </div>
                </div>
                {isExp && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-2.5 font-mono text-xs text-foreground">
                    {item.body}
                  </pre>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Dialog>
  )
}

export type { React }
