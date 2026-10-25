import React, { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowUpRight, Check, CircleCheck, FileStack, History, Loader2, RefreshCw, RotateCcw, Sparkles, Undo2, Wand2,
} from 'lucide-react'
import { Button, Select, cn } from './ui'
import { useApp } from '../store/AppStore'
import type { Candidate, OutputRevision, Resume, Take, TeamMember } from '../data/types'
import { signature } from './v3'

/* ==========================================================================
   v0.3 · Output builders (S-09 masked · S-10 editable) — PRD v0.3 §7.3, §7.6, §7.8
   N20 RefineBox with section diff · deterministic refine engine with the fact guardrail ·
   Revisions popover · Source resume select · inline-editable text · take on the page
   ========================================================================== */

/* ---------- Content model ---------- */
/** One refinable section of an output: \"Why we recommend\", \"Summary\", \"Experience · Ledgerly\"… */
export interface OutputSection { key: string; label: string; lines: string[]; kind: 'list' | 'text' }
export type SectionContent = Record<string, string[]>

export interface SectionChange { key: string; label: string; before: string[]; after: string[] }
export interface SectionBlock { key: string; label: string; reason: string }
export interface RefineResult { changes: SectionChange[]; blocked: SectionBlock[] }

/** A revision kept by the builder: the stored revision + a snapshot so Restore works */
export interface LocalRevision extends OutputRevision { snapshot: SectionContent }

/* ---------- Fact guardrail (P12) ---------- */
const KNOWN_EMPLOYERS = ['Google', 'Meta', 'Facebook', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Uber', 'Airbnb', 'Salesforce', 'Stripe', 'Shopify', 'Square', 'PayPal', 'Oracle', 'IBM', 'OpenAI', 'Coinbase', 'Adyen', 'Plaid']
const KNOWN_SKILLS = ['Kubernetes', 'Python', 'Java', 'Golang', 'Rust', 'AWS', 'GCP', 'Azure', 'Terraform', 'Docker', 'SQL', 'React', 'Node.js', 'TypeScript', 'Machine learning', 'Blockchain', 'Crypto', 'Tableau', 'Snowflake', 'Kafka', 'Spark', 'People management']
const NOT_FACTS = new Set(['b2b', 'saas', 'impact', 'payments', 'payment', 'shorter', 'more', 'less', 'the', 'a', 'an', 'it', 'numbers', 'number', 'summary', 'focus', 'lead', 'that', 'this', 'she', 'he', 'they', 'her', 'his', 'their'])

/** All facts on record as one lowercase haystack: profile + the source resume */
export function factHaystack(c: Candidate, resume?: Resume) {
  return [
    c.headline, c.subcategory, c.category, ...c.skills, ...c.tools, ...c.achievements,
    ...c.companies.flatMap(co => [co.name, co.descriptor, co.title, co.start, co.end]),
    c.education ? `${c.education.degree} ${c.education.field} ${c.education.school}` : '',
    c.years != null ? `${c.years} years` : '', c.metro ?? '', c.availability ?? '',
    resume?.headline ?? '', ...(resume?.emphasis ?? []),
  ].join(' \n ').toLowerCase()
}

/** Employer names, skills or numbers the instruction asks to add that aren't on record */
export function newFactsIn(instruction: string, facts: string): string[] {
  const out = new Set<string>()
  const lower = instruction.toLowerCase()
  ;[...KNOWN_EMPLOYERS, ...KNOWN_SKILLS].forEach(t => {
    const re = new RegExp(`(^|[^a-z])${t.toLowerCase().replace(/[.+]/g, '\\$&')}([^a-z]|$)`)
    if (re.test(lower) && !facts.includes(t.toLowerCase())) out.add(t)
  })
  // "mention X" / "add X" / "include X" / "worked at X" with a capitalised name
  const re = /(?:[Mm]ention|[Aa]dd|[Ii]nclude|[Ss]ay|[Ll]ist|worked at|knows|experience (?:with|in))\s+(?:that\s+)?(?:she|he|they)?\s*(?:worked at|knows|has|led)?\s*([A-Z][\w.+#&-]+(?:\s[A-Z][\w.+#&-]+)?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(instruction))) {
    const term = m[1].trim()
    if (NOT_FACTS.has(term.toLowerCase())) continue
    if (!facts.includes(term.toLowerCase())) out.add(term)
  }
  // Numbers typed into the instruction ("say 40% growth", "$2M") that aren't on record
  ;(instruction.match(/\$?\d[\d,.]*\s?(?:%|k|m|x|\+)?/gi) ?? []).forEach(n => {
    const v = n.trim().toLowerCase()
    if (v && !facts.includes(v.replace(/\s/g, ''))) out.add(n.trim())
  })
  return Array.from(out)
}

/* ---------- Deterministic refine engine (wireframe stand-in for the AI) ---------- */
const hasDigit = (s: string) => /\d/.test(s)
const stable = (lines: string[], pred: (s: string) => boolean) => [...lines.filter(pred), ...lines.filter(l => !pred(l))]

function shortenText(s: string): string {
  const first = s.split(/(?<=\.)\s/)[0]
  if (first.length <= 84) return first
  const cut = first.lastIndexOf(',', 84)
  return cut > 30 ? `${first.slice(0, cut)}.` : first
}
function deSales(s: string): string {
  return s
    .replace(/^(Proven impact|Commercially sharp|Rare talent|Standout):\s*/i, '')
    .replace(/\b(highly|extremely|incredibly|truly|very)\s+/gi, '')
    .replace(/a close match for/gi, 'relevant to')
    .replace(/\s?—\s?a rare find\.?/gi, '.')
    .replace(/^./, ch => ch.toUpperCase())
}
/** "lead with payments" → a predicate that floats matching lines to the top */
function leadPredicate(lower: string): ((s: string) => boolean) | null {
  const m = lower.match(/(?:lead with|focus on|emphasi[sz]e|open with|start with)\s+([a-z0-9/&\s-]+?)(?:[,.;]|$| and )/)
  if (!m) return null
  const topic = m[1].trim()
  if (/impact|result|number|metric|outcome/.test(topic)) return hasDigit
  if (/payment|payout|billing|fintech/.test(topic)) return s => /payment|payout|billing|invoic|checkout|fintech/i.test(s)
  if (/b2b|saas|enterprise/.test(topic)) return s => /b2b|saas|enterprise|merchant|accounts|platform/i.test(s)
  if (/pricing|monetis|monetiz/.test(topic)) return s => /pricing|arpa|revenue|monetiz/i.test(s)
  const stem = topic.split(/\s+/)[0].slice(0, 6)
  return stem.length >= 3 ? (s => s.toLowerCase().includes(stem)) : null
}

/**
 * Apply an instruction to the sections in scope. Deterministic demo rewrites:
 * Shorter → 2 bullets + a shorter summary · Lead with X → X lines first · More numbers → numbered lines first
 * (blocked when the section has none) · Less salesy → strips adjectives · new employer/skill/number → blocked.
 */
export function runRefine(sections: OutputSection[], instruction: string, scope: string, facts: string): RefineResult {
  const lower = instruction.toLowerCase()
  const inScope = sections.filter(s => scope === 'all' || s.key === scope)
  const changes: SectionChange[] = []
  const blocked: SectionBlock[] = []
  const added = newFactsIn(instruction, facts)
  // Facts that aren't in the profile block the targeted section (the first one for "Whole resume")
  const factTarget = added.length ? (inScope.find(s => s.key === 'skills') && added.some(a => KNOWN_SKILLS.includes(a)) ? 'skills' : inScope[0]?.key) : null
  const wantsNumbers = /(more|add)\s+(numbers|metrics)|quantif/.test(lower)
  const lead = leadPredicate(lower)

  inScope.forEach(s => {
    if (s.key === factTarget) {
      blocked.push({ key: s.key, label: s.label, reason: `This adds facts not in the profile: ${added.map(a => `“${a}”`).join(', ')}` })
      return
    }
    if (wantsNumbers && !s.lines.some(hasDigit)) {
      blocked.push({ key: s.key, label: s.label, reason: 'This adds facts not in the profile: there are no numbers on record for this section' })
      return
    }
    let next = [...s.lines]
    if (/salesy|tone it down|less hype|plain/.test(lower)) next = next.map(deSales)
    if (lead) next = stable(next, lead)
    if (wantsNumbers) next = stable(next, hasDigit)
    if (/short|concise|trim|tighter|brief/.test(lower)) next = s.kind === 'text' ? next.map(shortenText) : next.slice(0, 2)
    if (next.join('\n') !== s.lines.join('\n')) changes.push({ key: s.key, label: s.label, before: s.lines, after: next })
  })
  return { changes, blocked }
}

/* ---------- N20 · Refine box ---------- */
export function useRefinePresets(): string[] {
  const { prompts } = useApp()
  const p = prompts.find(x => x.id === 'refine-presets')
  const text = p?.versions.find(v => v.v === p.activeVersion)?.text ?? ''
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

/**
 * "Tell the AI what to change" + preset chips + scope select → Refine.
 * Every refinement counts toward AI usage (mono hint).
 */
export function RefineBox({ sections, busy, usage, onRefine, onRegenerateAll, disabled, className }: {
  sections: { key: string; label: string }[]; busy: boolean; usage: number
  onRefine: (instruction: string, scope: string) => void; onRegenerateAll?: () => void; disabled?: string; className?: string
}) {
  const presets = useRefinePresets()
  const [text, setText] = useState('')
  const [scope, setScope] = useState('all')
  const submit = () => { if (text.trim() && !busy && !disabled) onRefine(text.trim(), scope) }
  const addPreset = (p: string) => setText(t => (t.trim() ? `${t.trim().replace(/[,.]$/, '')}, ${p.toLowerCase()}` : p))
  return (
    <div className={cn('space-y-2 border-t border-border bg-background px-4 py-3', className)} role="group" aria-label="Refine with a prompt">
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 text-muted-foreground" aria-hidden />
        <label htmlFor="refine-input" className="text-xs font-medium">Refine with a prompt</label>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground tnum" aria-live="polite">
          {usage === 0 ? 'Each refinement uses 1 AI call' : `${usage} AI refinement${usage === 1 ? '' : 's'}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input id="refine-input" value={text} onChange={e => setText(e.target.value)} disabled={!!disabled}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          placeholder="Tell the AI what to change, e.g. “Shorter, lead with payments”"
          className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-gray-100/50 px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50" />
        <Select aria-label="Apply to" value={scope} onChange={setScope}
          options={[{ value: 'all', label: 'Whole resume' }, ...sections.map(s => ({ value: s.key, label: s.label }))]} />
        <Button variant="outline" icon={busy ? <Loader2 className="animate-spin" /> : <Sparkles />} disabled={!text.trim() || busy || !!disabled} onClick={submit}>
          {busy ? 'Refining…' : 'Refine'}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map(p => (
          <button key={p} type="button" onClick={() => addPreset(p)} disabled={!!disabled}
            className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-[11px] font-medium text-gray-1100 transition-colors hover:bg-muted disabled:opacity-50">
            {p}
          </button>
        ))}
        {onRegenerateAll && (
          <Button variant="ghost" size="sm" className="ml-auto" icon={<RefreshCw />} onClick={onRegenerateAll} disabled={busy}>Regenerate whole resume</Button>
        )}
      </div>
      {disabled
        ? <p className="text-[11px] text-muted-foreground">{disabled}</p>
        : <p className="text-[11px] text-muted-foreground">Wording only. A wrong fact? Use <span className="font-medium text-foreground">Fix in profile</span> on that line.</p>}
    </div>
  )
}

/** Status line after a refine: what changed, what was blocked, checks re-ran */
export function RefineStatus({ result, instruction, onDismiss }: { result: RefineResult | null; instruction: string; onDismiss: () => void }) {
  if (!result) return null
  const n = result.changes.length
  const b = result.blocked.length
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs">
      <span className="font-medium text-foreground">“{instruction}”</span>
      <span className="text-gray-1100">{n ? `${n} section${n === 1 ? '' : 's'} changed` : 'No section changed'}{b ? ` · ${b} blocked` : ''}</span>
      <span className="inline-flex items-center gap-1 text-[#15803d]"><CircleCheck className="size-3.5 text-success" />Identity check re-ran</span>
      <span className={cn('inline-flex items-center gap-1', b ? 'text-[#b45309]' : 'text-[#15803d]')}>
        {b ? <AlertTriangle className="size-3.5 text-warning" /> : <CircleCheck className="size-3.5 text-success" />}
        {b ? 'Fact check blocked new facts' : 'Fact check passed'}
      </span>
      {!n && !b && <span className="text-muted-foreground">Try a preset or name a section.</span>}
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onDismiss}>Dismiss</Button>
    </div>
  )
}

/**
 * A section on the page that can show a pending refine diff (strike old, show new + Keep / Undo),
 * a blocked refine (kept as it was), and a per-section Regenerate ghost action.
 */
export function DiffSection({ change, block, onKeep, onUndo, onDismissBlock, onRegenerate, renderLines, children, label }: {
  change?: SectionChange; block?: SectionBlock; label: string
  onKeep?: () => void; onUndo?: () => void; onDismissBlock?: () => void; onRegenerate?: () => void
  renderLines?: (lines: string[]) => React.ReactNode; children: React.ReactNode
}) {
  if (change) {
    const removed = change.before.filter(l => !change.after.includes(l))
    const moved = removed.length === 0 && change.before.length === change.after.length
    return (
      <div className="rounded-md border border-info/40 bg-info/[0.05] p-1.5 font-sans" aria-label={`${label}: refined`}>
        {children}
        {removed.length > 0 && (
          <div className="mt-1 space-y-0.5 border-t border-dashed border-info/30 pt-1" aria-label="Removed">
            {renderLines ? renderLines(removed) : removed.map((l, i) => <p key={i} className="text-[8.5px] text-gray-1000 line-through decoration-gray-800">{l}</p>)}
          </div>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[8.5px] text-gray-1100">{moved ? 'Reordered' : removed.length ? `${removed.length} line${removed.length === 1 ? '' : 's'} removed or reworded` : 'Reworded'}</span>
          <button type="button" onClick={onKeep} className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium text-foreground hover:bg-muted" aria-label={`Keep the change to ${label}`}>
            <Check className="size-2.5" />Keep
          </button>
          <button type="button" onClick={onUndo} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium text-gray-1100 hover:bg-muted" aria-label={`Undo the change to ${label}`}>
            <Undo2 className="size-2.5" />Undo
          </button>
        </div>
      </div>
    )
  }
  if (block) {
    return (
      <div className="rounded-md border border-dashed border-warning/60 bg-warning/[0.05] p-1.5 font-sans" aria-label={`${label}: change blocked`}>
        {children}
        <div className="mt-1 flex items-start gap-1.5">
          <AlertTriangle className="mt-px size-2.5 shrink-0 text-warning" aria-hidden />
          <span className="text-[8.5px] text-[#b45309]">{block.reason}. Kept as it was.</span>
          {onDismissBlock && <button type="button" onClick={onDismissBlock} className="ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-medium text-gray-1100 hover:bg-muted">OK</button>}
        </div>
      </div>
    )
  }
  return (
    <div className="group/sec relative">
      {children}
      {onRegenerate && (
        <button type="button" onClick={onRegenerate} aria-label={`Regenerate ${label}`}
          className="absolute -top-0.5 right-0 inline-flex items-center gap-1 rounded-md bg-card/90 px-1.5 py-0.5 font-sans text-[9px] font-medium text-gray-1000 opacity-0 transition-opacity group-hover/sec:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100">
          <RefreshCw className="size-2.5" />Regenerate
        </button>
      )}
    </div>
  )
}

/* ---------- Inline-editable text block (way 1 · edit a field directly) ---------- */
/**
 * Shows `display` (e.g. text with identity-check marks) until clicked, then edits the plain text in place.
 * Enter or blur saves · Esc cancels.
 */
export function EditableText({ value, onChange, label, className, display, disabled }: {
  value: string; onChange: (v: string) => void; label: string; className?: string; display?: React.ReactNode; disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!editing || !el) return
    el.textContent = value
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps
  if (disabled) return <span className={className}>{display ?? value}</span>
  if (!editing) {
    return (
      <span key="view" role="button" tabIndex={0} aria-label={`Edit ${label}`} title="Click to edit"
        onClick={() => setEditing(true)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true) } }}
        className={cn('cursor-text rounded-sm outline-none hover:bg-info/[0.08] focus-visible:ring-1 focus-visible:ring-info/60', className)}>
        {display ?? value}
      </span>
    )
  }
  return (
    <span key="edit" ref={ref} role="textbox" aria-label={`Editing ${label}`} contentEditable suppressContentEditableWarning
      onBlur={e => { const v = (e.currentTarget.textContent ?? '').trim(); setEditing(false); if (v && v !== value) onChange(v) }}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() }
        if (e.key === 'Escape') { e.currentTarget.textContent = value; e.currentTarget.blur() }
      }}
      className={cn('rounded-sm bg-info/[0.09] outline-none ring-1 ring-info/50', className)} />
  )
}

/** v0.3 · wireframe review: switch the signed-in person while a state is shown, restore afterwards */
export function useViewAsWhile(active: boolean, memberId: string) {
  const app = useApp()
  useEffect(() => {
    if (!active) return
    const prev = app.currentUser.id
    app.setCurrentUser(memberId)
    return () => app.setCurrentUser(prev)
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** "Fix in profile" link on fact lines (P12) — a prompt never changes facts */
export function FixInProfile({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Fix in profile: ${label}`}
      className="ml-1 inline-flex items-center gap-0.5 rounded-sm px-1 font-sans text-[8px] font-medium text-gray-1000 opacity-0 transition-opacity group-hover/fact:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100">
      Fix in profile<ArrowUpRight className="size-2" />
    </button>
  )
}

/* ---------- Revisions popover ---------- */
export function RevisionsPopover({ revisions, current, downloaded, onRestore, defaultOpen }: {
  revisions: LocalRevision[]; current: number; downloaded?: number | null; onRestore: (n: number) => void; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className="relative inline-flex">
      <Button variant="ghost" size="sm" icon={<History />} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        Revisions <span className="font-mono text-[10px] tnum">v{current}</span>
      </Button>
      {open && (
        <div role="dialog" aria-label="Revisions" className="anim-pop absolute top-full right-0 z-50 mt-1.5 w-80 rounded-2xl border border-border bg-background p-1 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="eyebrow text-[10px] text-gray-1000">Revisions · {revisions.length}</span>
            <span className="text-[10px] text-muted-foreground">The downloaded one is logged</span>
          </div>
          <ol className="max-h-72 space-y-0.5 overflow-auto">
            {[...revisions].reverse().map(r => (
              <li key={r.n} className={cn('flex items-start gap-2 rounded-lg px-2.5 py-2', r.n === current && 'bg-muted')}>
                <span className="mt-0.5 font-mono text-[11px] font-medium tnum">v{r.n}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{r.instruction}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{r.scope} · {r.createdBy} · {r.at}</div>
                  {downloaded === r.n && <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-gray-1100"><FileStack className="size-3" />Downloaded</div>}
                </div>
                {r.n === current
                  ? <span className="eyebrow mt-0.5 text-[9px] text-foreground">Current</span>
                  : <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => { onRestore(r.n); setOpen(false) }}>Restore</Button>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

/* ---------- T3 · Source resume ---------- */
/** Default = the resume used for that role's match, otherwise Primary */
export function useSourceResume(candidateId: string, roleId: string | null | undefined) {
  const app = useApp()
  const list = app.resumesFor(candidateId)
  const match = roleId ? app.matches.find(m => m.candidateId === candidateId && m.roleId === roleId) : undefined
  const fallback = list.find(r => r.id === match?.scoredOnResumeId) ?? list.find(r => r.isPrimary) ?? list[0]
  return { list, fallback, fromMatch: !!match?.scoredOnResumeId }
}
export const latestVersion = (r: Resume | undefined) => r ? Math.max(...r.versions.map(v => v.n), 1) : 1
export const resumeLabel = (r: Resume | undefined) => r ? `${r.label} resume v${latestVersion(r)}` : 'Resume'

export function SourceResumeSelect({ list, value, onChange, fromMatch, compact }: {
  list: Resume[]; value: string; onChange: (id: string) => void; fromMatch?: boolean; compact?: boolean
}) {
  if (list.length < 2) return null
  const cur = list.find(r => r.id === value)
  return (
    <div className={cn('flex flex-wrap items-center gap-2', compact ? '' : 'rounded-xl border border-border bg-card px-3 py-2.5')}>
      <FileStack className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-sm font-medium">Source resume</span>
      <Select aria-label="Source resume" value={value} onChange={onChange}
        options={list.map(r => ({ value: r.id, label: `${r.label} · v${latestVersion(r)}${r.isPrimary ? ' · Primary' : ''}` }))} />
      {!compact && cur && <span className="text-xs text-muted-foreground">{fromMatch && cur.id === list.find(r => r.isPrimary)?.id ? 'Used for this role’s match' : cur.isPrimary ? 'Primary' : `Targets ${cur.targetCategory}`}</span>}
    </div>
  )
}

/** Skills as this resume leads with them: its emphasis first, then the rest of the profile */
export function skillsFor(c: Candidate, r: Resume | undefined): string[] {
  const emph = r?.emphasis ?? []
  return [...emph, ...c.skills.filter(s => !emph.includes(s))]
}
/** Lines matching the resume's emphasis float to the top */
export function emphasise(lines: string[], r: Resume | undefined): string[] {
  if (!r || r.isPrimary) return lines
  const keys = r.emphasis.flatMap(e => e.toLowerCase().split(/[\s-]+/)).filter(w => w.length > 3)
  const keysPlus = [...keys, ...(keys.includes('pricing') ? ['arpa'] : []), ...(keys.includes('checkout') ? ['conversion'] : [])]
  return stable(lines, s => keysPlus.some(k => s.toLowerCase().includes(k)))
}

/* ---------- T8 · the take on the page ---------- */
/** Signed → quote + signature. Draft → a dashed placeholder in the preview only (never in the file). */
export function PageTake({ take, author, variant = 'quote' }: { take: Take | undefined; author: TeamMember | undefined; variant?: 'quote' | 'note' }) {
  if (!take || !take.text.trim()) return null
  if (take.status !== 'signed') {
    return (
      <section aria-label="Our take: draft, not printed" className="rounded-md border border-dashed border-gray-600 px-3 py-1.5 font-sans text-[8.5px] text-gray-1000">
        Our take · Draft not printed. Approve and sign it to put it on the page.
      </section>
    )
  }
  const text = take.text.trim().slice(0, 280)
  if (variant === 'note') {
    return (
      <section className="rounded-md border border-gray-500 bg-gray-100 px-3 py-2">
        <div className="font-mono text-[7.5px] font-medium tracking-[0.14em] text-gray-1000 uppercase">Note from HeroScouter</div>
        <p className="mt-0.5 text-[9.5px] leading-snug">“{text}”</p>
        <p className="mt-0.5 text-[8px] text-gray-1000">{signature(author)}</p>
      </section>
    )
  }
  return (
    <section className="border-l-2 border-gray-1100 pl-3">
      <p className="text-[10px] leading-snug italic">“{text}”</p>
      <p className="mt-0.5 text-[8px] text-gray-1000">{signature(author)}</p>
    </section>
  )
}

/** "Purvesh" from "Purvesh Naik" / "Aman" from "Aman K. (associate)" */
export const firstName = (m: TeamMember) => m.name.replace(/\(.*\)/, '').trim().split(/\s+/)[0]

/* ---------- T6 · stale after Fix in profile (survives navigating to the profile and back) ---------- */
const STALE_KEY = 'hs.staleOutputs'
export function readStale(key: string): string | null {
  try { return (JSON.parse(sessionStorage.getItem(STALE_KEY) ?? '{}') as Record<string, string>)[key] ?? null } catch { return null }
}
export function writeStale(key: string, reason: string | null) {
  try {
    const all = JSON.parse(sessionStorage.getItem(STALE_KEY) ?? '{}') as Record<string, string>
    if (reason) all[key] = reason
    else delete all[key]
    sessionStorage.setItem(STALE_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

/* ---------- Revisions helpers shared by both builders (per candidate) ---------- */
/** v1 "Generated", or the stored revisions of an output opened from the library (latest = current) */
export function initialRevisions(snapshot: SectionContent, by: string, seed?: OutputRevision[]): LocalRevision[] {
  if (seed?.length) return seed.map(r => ({ ...r, snapshot }))
  return [{ n: 1, instruction: 'Generated', scope: 'Whole resume', createdBy: by, at: 'Just now', snapshot }]
}
export function pushRevision(list: LocalRevision[], instruction: string, scope: string, by: string, snapshot: SectionContent): LocalRevision[] {
  return [...list, { n: list.length + 1, instruction, scope, createdBy: by, at: 'Just now', snapshot }]
}
/** Update one revision's snapshot (after Keep / Undo / a hand edit) */
export function amendRevision(list: LocalRevision[], n: number, snapshot: SectionContent): LocalRevision[] {
  return list.map(r => (r.n === n ? { ...r, snapshot } : r))
}
/** Stored form (no snapshot) up to and including the downloaded revision */
export function storedRevisions(list: LocalRevision[], upTo: number): OutputRevision[] {
  return list.filter(r => r.n <= upTo).map(r => ({ n: r.n, instruction: r.instruction, scope: r.scope, createdBy: r.createdBy, at: r.at }))
}
