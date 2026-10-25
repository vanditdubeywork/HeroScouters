import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { Dialog, ProposedChangesList } from '../components/hs'
import { Button, Kbd, Segmented, Textarea, cn } from '../components/ui'
import { REJECT_REASONS } from '../data/mock'
import { useApp } from '../store/AppStore'
import type { ProposedChange } from '../data/types'

/* ==========================================================================
   Dialogs D-01 … D-05 (Product Design Doc §8 "Dialogs") + F-11 copy email
   ========================================================================== */

/** D-01 · Reject with a reason (keys 1–7) */
export function RejectDialog({ open, onClose, candidateName, roleTitle, onConfirm, title }: {
  open: boolean; onClose: () => void; candidateName: string; roleTitle: string; onConfirm: (reason: string) => void; title?: string
}) {
  const [reason, setReason] = useState<string>('')
  const [other, setOther] = useState('')
  useEffect(() => { if (open) { setReason(''); setOther('') } }, [open])
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
    <Dialog open={open} onClose={onClose} title={title ?? `Reject ${candidateName} for ${roleTitle}?`}
      description="You can undo this from the role's rejected list."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={!reason} onClick={confirm} data-autofocus>Reject</Button></>}>
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

/** D-02 · Rerun matching (cost visible before acting) */
export function RerunDialog({ open, onClose, roleLabel, count, onConfirm, force }: {
  open: boolean; onClose: () => void; roleLabel: string; count: number; onConfirm: () => void; force?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} title={`Rerun matching for ${roleLabel}?`}
      description={<>{force && 'Nothing has changed since the last run. '}<span className="font-mono text-foreground tnum">{count}</span> candidates will be re-ranked. Shortlisted and rejected decisions stay.</>}
      footer={<><Button variant="ghost" onClick={onClose}>Not now</Button><Button variant="primary" data-autofocus onClick={() => { onConfirm(); onClose() }}>Rerun matching</Button></>}
    />
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

/** F-11 · Copy email text — editable preview, two variants, descriptive one-liners, no IDs */
export function CopyEmailDialog({ open, onClose, candidateIds, roleId, initialVariant }: {
  open: boolean; onClose: () => void; candidateIds: string[]; roleId?: string | null; initialVariant?: 'prospect' | 'client'
}) {
  const { candidate, role, toast } = useApp()
  const r = roleId ? role(roleId) : undefined
  const [variant, setVariant] = useState<'prospect' | 'client'>(initialVariant ?? (r?.companyType === 'Client' ? 'client' : 'prospect'))
  const build = (v: 'prospect' | 'client') => {
    const people = candidateIds.map(id => candidate(id)).filter(Boolean)
    const lines = people.map(c => v === 'prospect'
      ? `• ${c!.headline.split(' · ')[0]} · ${c!.years ?? '—'} yrs · ${c!.metro ?? 'US'}${c!.workModes ? ` (${c!.workModes[0].toLowerCase()})` : ''} · ${c!.skills.slice(0, 2).join(' + ') || c!.subcategory}`
      : `• ${c!.name} — ${c!.headline}. ${c!.achievements[0] ?? ''}`)
    if (v === 'prospect') {
      return `Hi {first name},\n\nI saw ${r ? `you're hiring a ${r.title}` : 'your team is growing'} and wanted to share ${people.length === 1 ? 'someone' : `${people.length} people`} we've already vetted who ${people.length === 1 ? 'is' : 'are'} ready to talk:\n\n${lines.join('\n')}\n\nMasked profiles are attached. Reply and we'll set up intros this week.\n\nVandit\nHeroScouter`
    }
    return `Hi {first name},\n\nHere's the shortlist for ${r ? `the ${r.title} role` : 'the role'}, in the order I'd interview them:\n\n${lines.join('\n')}\n\nTailored resumes are attached. Reply and we'll set up intros this week.\n\nVandit\nHeroScouter`
  }
  const [text, setText] = useState(build(variant))
  useEffect(() => { if (open) setText(build(variant)) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, variant, candidateIds.join(',')])
  return (
    <Dialog open={open} onClose={onClose} width={620} title="Copy email text"
      description="Edit before copying. Short and personal; no candidate IDs."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" icon={<Copy />} data-autofocus onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); toast('Email text copied'); onClose() }}>Copy</Button>
      </>}>
      <div className="mb-3"><Segmented value={variant} onChange={setVariant} options={[{ value: 'prospect', label: 'Prospect pitch' }, { value: 'client', label: 'Client shortlist' }]} /></div>
      <Textarea value={text} onChange={e => setText(e.target.value)} className="min-h-[260px] font-mono text-[12.5px] leading-relaxed" />
    </Dialog>
  )
}
