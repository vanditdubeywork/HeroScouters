import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, X, Search, Columns3, GripVertical, ChevronDown, Sparkles, Keyboard, Check, PenLine, BadgeCheck, Lock, RotateCcw, Info,
} from 'lucide-react'
import { Button, Checkbox, Kbd, Popover, Segmented, Textarea, cn, type ButtonProps } from './ui'
import { Dialog } from './hs'
import { useApp, whoCanText, SCORE_OPTIONS, SCORE_RUN_CAP } from '../store/AppStore'
import type { Permission, Take, TeamMember } from '../data/types'

/* ==========================================================================
   v0.3 shared components — PRD v0.3 Appendix A
   N16 SelectionBar · N17 FilterBar · N18 ColumnsMenu · N19 ScoreControl
   N21 SignedTakeBlock · N24 GatedButton · useListSelection (P10) · ShortcutSheet
   ========================================================================== */

/* ---------- N24 · Disabled-with-reason control ---------- */
/**
 * A Button that is visible but disabled when the signed-in role can't take the action,
 * with a "who can" tooltip (e.g. "Recruiters and Admins can reject").
 */
export function GatedButton({ perm, children, title, ...rest }: ButtonProps & { perm: Permission }) {
  const { can } = useApp()
  const allowed = can(perm)
  const reason = whoCanText(perm)
  if (allowed) return <Button title={title} {...rest}>{children}</Button>
  return (
    <span className="group/gate relative inline-flex" tabIndex={0} aria-label={`${typeof children === 'string' ? children : 'Action'} — ${reason}`}>
      <Button {...rest} disabled aria-disabled title={reason} icon={rest.icon ?? <Lock />}>{children}</Button>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-[11px] whitespace-nowrap text-foreground opacity-0 shadow-sm transition-opacity group-hover/gate:opacity-100 group-focus/gate:opacity-100">
        {reason}
      </span>
    </span>
  )
}
export function useCan() {
  const { can } = useApp()
  return { can, reason: whoCanText }
}

/* ---------- P10 · One selection pattern ---------- */
/**
 * Checkbox column state with Shift-click ranges. `orderedIds` is the visible order.
 * toggle(id, shiftKey) — Shift selects the range from the last clicked row.
 */
export function useListSelection(orderedIds: string[]) {
  const [selected, setSelected] = useState<string[]>([])
  const anchor = useRef<string | null>(null)
  // Drop selections that are no longer visible
  useEffect(() => {
    setSelected(sel => {
      const next = sel.filter(id => orderedIds.includes(id))
      return next.length === sel.length ? sel : next
    })
  }, [orderedIds.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback((id: string, shift = false) => {
    setSelected(sel => {
      if (shift && anchor.current && orderedIds.includes(anchor.current)) {
        const a = orderedIds.indexOf(anchor.current)
        const b = orderedIds.indexOf(id)
        const range = orderedIds.slice(Math.min(a, b), Math.max(a, b) + 1)
        return Array.from(new Set([...sel, ...range]))
      }
      anchor.current = id
      return sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
    })
  }, [orderedIds])
  const selectAll = useCallback((ids: string[] = orderedIds) => setSelected(ids), [orderedIds])
  const clear = useCallback(() => { setSelected([]); anchor.current = null }, [])
  return { selected, setSelected, toggle, selectAll, clear, isSelected: (id: string) => selected.includes(id) }
}

/* ---------- N16 · Selection bar ---------- */
/**
 * Replaces the toolbar while anything is selected; sticky.
 * "6 selected · Select all 42 that match these filters · [actions] · Clear (Esc)"
 */
export function SelectionBar({ count, shown, matching, allMatchingSelected, onSelectAllShown, onSelectAllMatching, onClear, note, children, className }: {
  count: number; shown: number; matching?: number; allMatchingSelected?: boolean
  onSelectAllShown?: () => void; onSelectAllMatching?: () => void; onClear: () => void
  note?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[role="dialog"]')) return
      onClear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClear])
  return (
    <div role="region" aria-label="Selection" className={cn('anim-slide-up sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-700 bg-card px-3 py-2 shadow-[var(--shadow-custom)]', className)}>
      <span className="inline-flex h-6 items-center rounded-md bg-primary px-2 font-mono text-[11px] font-medium text-primary-foreground tnum">{allMatchingSelected && matching ? matching : count} selected</span>
      {!allMatchingSelected && count < shown && onSelectAllShown && (
        <Button variant="link" className="text-xs" onClick={onSelectAllShown}>Select all {shown} shown</Button>
      )}
      {!allMatchingSelected && matching !== undefined && matching > shown && count >= shown && onSelectAllMatching && (
        <Button variant="link" className="text-xs" onClick={onSelectAllMatching}>Select all {matching} that match these filters</Button>
      )}
      {allMatchingSelected && matching !== undefined && <span className="text-xs text-muted-foreground">All {matching} that match are selected.</span>}
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {children}
        <Button variant="ghost" onClick={onClear} kbd="Esc">Clear</Button>
      </div>
    </div>
  )
}

/* ---------- N17 · Filter bar (Sheets model) ---------- */
export type FilterKind = 'values' | 'number' | 'multi'
export interface FilterField<T> {
  key: string
  label: string
  kind: FilterKind
  /** values / multi: the row's value(s); null/undefined/[] = Not captured */
  get?: (row: T) => string | string[] | null | undefined
  /** number: the row's number; null = Not captured */
  num?: (row: T) => number | null | undefined
  /** fixed option order (otherwise derived from rows) */
  options?: string[]
  unit?: string
  /** pinned fields render as an always-visible trigger (e.g. Category on Candidates) */
  pinned?: boolean
}
export type FilterValue =
  | { kind: 'values'; values: string[]; includeMissing: boolean }
  | { kind: 'number'; op: 'gte' | 'lte' | 'between'; a: number; b?: number; includeMissing: boolean }
  | { kind: 'multi'; values: string[]; mode: 'any' | 'all'; includeMissing: boolean }
export type FilterState = Record<string, FilterValue>

const asList = (v: string | string[] | null | undefined): string[] => v == null ? [] : Array.isArray(v) ? v : [v]

/** OR inside a column, AND across columns. Missing values pass when includeMissing (default true · P3). */
export function matchesFilter<T>(row: T, f: FilterField<T>, v: FilterValue): boolean {
  if (v.kind === 'number') {
    const n = f.num?.(row)
    if (n == null) return v.includeMissing
    if (v.op === 'gte') return n >= v.a
    if (v.op === 'lte') return n <= v.a
    return n >= v.a && n <= (v.b ?? v.a)
  }
  const vals = asList(f.get?.(row))
  if (!vals.length) return v.includeMissing
  if (!v.values.length) return true
  if (v.kind === 'multi' && v.mode === 'all') return v.values.every(x => vals.includes(x))
  return v.values.some(x => vals.includes(x))
}
export function applyFilters<T>(rows: T[], fields: FilterField<T>[], state: FilterState, except?: string): T[] {
  const active = Object.entries(state).filter(([k]) => k !== except)
  if (!active.length) return rows
  return rows.filter(r => active.every(([k, v]) => {
    const f = fields.find(x => x.key === k)
    return f ? matchesFilter(r, f, v) : true
  }))
}
/** Missing (Not captured) rows for a field within the current filter context */
export function missingCount<T>(rows: T[], f: FilterField<T>) {
  return rows.filter(r => f.kind === 'number' ? f.num?.(r) == null : asList(f.get?.(r)).length === 0).length
}

/** Plain-English chip text: "Visa: Citizen or Green card" · "Experience ≥ 5" · "Skills: React and Node" */
export function chipText<T>(f: FilterField<T>, v: FilterValue): string {
  if (v.kind === 'number') {
    const u = f.unit ? ` ${f.unit}` : ''
    if (v.op === 'gte') return `${f.label} ≥ ${v.a}${u}`
    if (v.op === 'lte') return `${f.label} ≤ ${v.a}${u}`
    return `${f.label} ${v.a}–${v.b ?? v.a}${u}`
  }
  const joiner = v.kind === 'multi' && v.mode === 'all' ? ' and ' : ' or '
  const shown = v.values.length > 3 ? `${v.values.slice(0, 2).join(joiner)}${joiner}${v.values.length - 2} more` : v.values.join(joiner)
  return `${f.label}: ${shown || 'Any'}${!v.includeMissing ? ' · excl. not captured' : ''}`
}

function defaultValue<T>(f: FilterField<T>, rows: T[]): FilterValue {
  if (f.kind === 'number') {
    const nums = rows.map(r => f.num?.(r)).filter((n): n is number => n != null)
    return { kind: 'number', op: 'gte', a: nums.length ? Math.round(Math.min(...nums)) : 0, includeMissing: true }
  }
  if (f.kind === 'multi') return { kind: 'multi', values: [], mode: 'any', includeMissing: true }
  return { kind: 'values', values: [], includeMissing: true }
}

/** Picker body for one column: values checklist · number op · any/all */
export function FilterPicker<T>({ field, rows, value, onChange, onRemove, onDone }: {
  field: FilterField<T>; rows: T[]; value: FilterValue; onChange: (v: FilterValue) => void; onRemove?: () => void; onDone?: () => void
}) {
  const [q, setQ] = useState('')
  const missing = missingCount(rows, field)
  const options = useMemo(() => {
    if (field.kind === 'number') return []
    const counts = new Map<string, number>()
    rows.forEach(r => asList(field.get?.(r)).forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1)))
    const keys = field.options ?? Array.from(counts.keys()).sort()
    return keys.map(k => ({ value: k, count: counts.get(k) ?? 0 }))
  }, [rows, field])
  const filtered = options.filter(o => o.value.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="eyebrow text-[10px] text-gray-1000">{field.label}</span>
        {onRemove && <Button variant="link" className="text-[11px] text-muted-foreground" onClick={onRemove}>Remove filter</Button>}
      </div>

      {value.kind === 'multi' && (
        <div className="px-1">
          <Segmented size="sm" aria-label="Match mode" value={value.mode}
            onChange={m => onChange({ ...value, mode: m })}
            options={[{ value: 'any', label: 'Any of' }, { value: 'all', label: 'All of' }]} />
        </div>
      )}

      {value.kind === 'number' ? (
        <div className="space-y-2 px-1">
          <Segmented size="sm" aria-label="Operator" value={value.op}
            onChange={op => onChange({ ...value, op })}
            options={[{ value: 'gte', label: '≥' }, { value: 'lte', label: '≤' }, { value: 'between', label: 'Between' }]} />
          <div className="flex items-center gap-2">
            <input type="number" aria-label={`${field.label} value`} value={value.a}
              onChange={e => onChange({ ...value, a: Number(e.target.value) })}
              className="h-8 w-24 rounded-lg border border-input bg-gray-100/50 px-2 text-sm tnum outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
            {value.op === 'between' && <>
              <span className="text-xs text-muted-foreground">and</span>
              <input type="number" aria-label={`${field.label} upper value`} value={value.b ?? value.a}
                onChange={e => onChange({ ...value, b: Number(e.target.value) })}
                className="h-8 w-24 rounded-lg border border-input bg-gray-100/50 px-2 text-sm tnum outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
            </>}
            {field.unit && <span className="font-mono text-[11px] text-muted-foreground">{field.unit}</span>}
          </div>
        </div>
      ) : (
        <>
          {options.length > 6 && (
            <div className="relative px-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${field.label.toLowerCase()}`} aria-label={`Search ${field.label}`}
                className="h-8 w-full rounded-lg border border-input bg-gray-100/50 pr-2 pl-8 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
            </div>
          )}
          <div className="flex items-center justify-between px-1">
            <Button variant="link" className="text-[11px]" onClick={() => onChange({ ...value, values: options.map(o => o.value) })}>Select all</Button>
            {value.values.length > 0 && <Button variant="link" className="text-[11px] text-muted-foreground" onClick={() => onChange({ ...value, values: [] })}>Clear</Button>}
          </div>
          <div className="max-h-56 space-y-0.5 overflow-auto">
            {filtered.map(o => {
              const on = value.values.includes(o.value)
              return (
                <button key={o.value} type="button" role="menuitemcheckbox" aria-checked={on}
                  onClick={() => onChange({ ...value, values: on ? value.values.filter(x => x !== o.value) : [...value.values, o.value] })}
                  className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-muted">
                  <span className={cn('flex size-4 items-center justify-center rounded-[5px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-700')}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                  <span className="flex-1 truncate">{o.value}</span>
                  <span className="font-mono text-[10px] text-muted-foreground tnum">{o.count}</span>
                </button>
              )
            })}
            {!filtered.length && <p className="px-2 py-3 text-xs text-muted-foreground">No values match “{q}”.</p>}
          </div>
        </>
      )}

      {/* P3 · Not captured is always listed, checked by default */}
      <div className="border-t border-border px-1 pt-2">
        <button type="button" role="menuitemcheckbox" aria-checked={value.includeMissing}
          onClick={() => onChange({ ...value, includeMissing: !value.includeMissing })}
          className="flex h-8 w-full items-center gap-2.5 rounded-lg px-1 text-left text-sm hover:bg-muted">
          <span className={cn('flex size-4 items-center justify-center rounded-[5px] border', value.includeMissing ? 'border-warning bg-warning text-white' : 'border-gray-700')}>{value.includeMissing && <Check className="size-3" strokeWidth={3} />}</span>
          <span className="flex-1 text-warning">Not captured</span>
          <span className="font-mono text-[10px] text-muted-foreground tnum">{missing}</span>
        </button>
        <p className="px-1 pt-1 text-[11px] leading-snug text-muted-foreground">Missing values stay in the list and show as Assumed.</p>
      </div>
      {onDone && <div className="flex justify-end px-1"><Button variant="primary" size="sm" onClick={onDone}>Done</Button></div>}
    </div>
  )
}

/**
 * [Category ▾]  [Visa: Citizen or Green card ×] and [Experience ≥ 5 ×]  [+ Filter]     42 match · Clear all   [Columns]
 */
export function FilterBar<T>({ fields, rows, state, onChange, count, countLabel = 'match', right, className }: {
  fields: FilterField<T>[]; rows: T[]; state: FilterState; onChange: (s: FilterState) => void
  count: number; countLabel?: string; right?: React.ReactNode; className?: string
}) {
  const [q, setQ] = useState('')
  const activeKeys = Object.keys(state)
  const pinned = fields.filter(f => f.pinned)
  const unpinnedActive = activeKeys.filter(k => !fields.find(f => f.key === k)?.pinned)
  const set = (k: string, v: FilterValue) => onChange({ ...state, [k]: v })
  const remove = (k: string) => { const n = { ...state }; delete n[k]; onChange(n) }
  /** counts inside a picker reflect every other active filter (Sheets behaviour) */
  const ctxRows = (k: string) => applyFilters(rows, fields, state, k)

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} role="toolbar" aria-label="Filters">
      {pinned.map(f => {
        const v = state[f.key]
        return (
          <Popover key={f.key} width={280} trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} aria-expanded={open}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors',
                v && (v.kind !== 'number' ? v.values.length : true) ? 'border-gray-1100 bg-secondary text-foreground' : 'border-border bg-background text-gray-1100 hover:bg-accent')}>
              {v ? chipText(f, v) : f.label}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          )}>
            {close => <FilterPicker field={f} rows={ctxRows(f.key)} value={v ?? defaultValue(f, rows)} onChange={nv => set(f.key, nv)} onRemove={v ? () => { remove(f.key); close() } : undefined} onDone={close} />}
          </Popover>
        )
      })}

      {unpinnedActive.map((k, i) => {
        const f = fields.find(x => x.key === k)
        if (!f) return null
        const v = state[k]
        return (
          <React.Fragment key={k}>
            {(i > 0 || pinned.some(p => state[p.key])) && <span className="px-0.5 font-mono text-[10px] text-muted-foreground">and</span>}
            <Popover width={280} trigger={({ toggle, open }) => (
              <span className="inline-flex h-8 items-center rounded-xl border border-gray-1100 bg-secondary text-xs font-medium text-foreground">
                <button type="button" onClick={toggle} aria-expanded={open} className="h-full rounded-l-xl pr-1 pl-2.5">{chipText(f, v)}</button>
                <button type="button" aria-label={`Remove ${f.label} filter`} onClick={() => remove(k)} className="flex h-full items-center rounded-r-xl px-1.5 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
              </span>
            )}>
              {close => <FilterPicker field={f} rows={ctxRows(k)} value={v} onChange={nv => set(k, nv)} onRemove={() => { remove(k); close() }} onDone={close} />}
            </Popover>
          </React.Fragment>
        )
      })}

      <Popover width={260} trigger={({ toggle, open }) => (
        <Button variant="ghost" icon={<Plus />} onClick={toggle} aria-expanded={open}>Filter</Button>
      )}>
        {close => (
          <div className="p-1">
            <div className="relative p-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by column…" aria-label="Search columns"
                className="h-8 w-full rounded-lg border border-input bg-gray-100/50 pr-2 pl-8 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
            </div>
            <div className="max-h-72 overflow-auto">
              {fields.filter(f => !f.pinned && f.label.toLowerCase().includes(q.toLowerCase())).map(f => (
                <button key={f.key} type="button" disabled={!!state[f.key]}
                  onClick={() => { set(f.key, defaultValue(f, rows)); close(); setQ('') }}
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm hover:bg-muted disabled:opacity-40">
                  <span className="flex-1 truncate">{f.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{f.kind === 'number' ? '≥ ≤' : f.kind === 'multi' ? 'any/all' : 'values'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Popover>

      <div className="ml-auto flex items-center gap-2">
        <span className="font-mono text-[11px] text-muted-foreground tnum" aria-live="polite"><span className="text-foreground">{count}</span> {countLabel}</span>
        {activeKeys.length > 0 && <Button variant="link" className="text-xs" onClick={() => onChange({})}>Clear all</Button>}
        {right}
      </div>
    </div>
  )
}

/* ---------- N18 · Columns menu (saved per person, per screen) ---------- */
export interface ColumnOption { key: string; label: string; locked?: boolean }
export function useColumnPrefs(screenKey: string, defaults: string[]) {
  const { currentUser } = useApp()
  const storageKey = `hs.cols.${currentUser.id}.${screenKey}`
  const read = () => {
    try { const v = localStorage.getItem(storageKey); return v ? (JSON.parse(v) as string[]) : defaults } catch { return defaults }
  }
  const [cols, setCols] = useState<string[]>(read)
  useEffect(() => { setCols(read()) }, [storageKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = (next: string[]) => { setCols(next); try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ } }
  return { visible: cols, setVisible: save, reset: () => save(defaults) }
}
export function ColumnsMenu({ options, visible, onChange, onReset }: {
  options: ColumnOption[]; visible: string[]; onChange: (keys: string[]) => void; onReset: () => void
}) {
  const [drag, setDrag] = useState<string | null>(null)
  // Ordered: visible first (in saved order), then hidden
  const ordered = [...visible.map(k => options.find(o => o.key === k)).filter((o): o is ColumnOption => !!o), ...options.filter(o => !visible.includes(o.key))]
  const move = (from: string, to: string) => {
    if (from === to || !visible.includes(from) || !visible.includes(to)) return
    const next = visible.filter(k => k !== from)
    next.splice(next.indexOf(to), 0, from)
    onChange(next)
  }
  return (
    <Popover align="end" width={260} trigger={({ toggle, open }) => (
      <Button variant="outline" icon={<Columns3 />} onClick={toggle} aria-expanded={open}>Columns</Button>
    )}>
      {() => (
        <div className="p-1">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="eyebrow text-[10px] text-gray-1000">Columns · {visible.length} shown</span>
            <Button variant="link" className="text-[11px]" icon={<RotateCcw className="size-3" />} onClick={onReset}>Reset to default</Button>
          </div>
          <ul className="max-h-80 space-y-0.5 overflow-auto">
            {ordered.map(o => {
              const on = visible.includes(o.key)
              return (
                <li key={o.key} draggable={on && !o.locked}
                  onDragStart={() => setDrag(o.key)} onDragOver={e => { e.preventDefault(); if (drag) move(drag, o.key) }} onDragEnd={() => setDrag(null)}
                  className={cn('flex h-8 items-center gap-2 rounded-lg px-1.5 text-sm hover:bg-muted', drag === o.key && 'bg-muted')}>
                  <GripVertical className={cn('size-3.5', on && !o.locked ? 'cursor-grab text-muted-foreground' : 'text-transparent')} aria-hidden />
                  <Checkbox aria-label={`Show ${o.label}`} checked={on} onChange={v => {
                    if (o.locked) return
                    onChange(v ? [...visible, o.key] : visible.filter(k => k !== o.key))
                  }} />
                  <span className={cn('flex-1 truncate', o.locked && 'text-muted-foreground')}>{o.label}</span>
                  {o.locked && <Lock className="size-3 text-muted-foreground" aria-label="Always shown" />}
                </li>
              )
            })}
          </ul>
          <p className="px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground">Drag to reorder. Saved for you on this screen.</p>
        </div>
      )}
    </Popover>
  )
}

/* ---------- N19 · Score control ---------- */
/**
 * "Score [10 ▾] with AI" — the number of candidates the AI scores (not a display limit).
 * Shows the AI-score count before running. Suggests All when ≤ 15 remain. Caps a run at 50.
 */
export function ScoreControl({ unscored, label = 'Score', more, onScore, className }: {
  unscored: number; label?: string; more?: boolean; onScore: (n: number) => void; className?: string
}) {
  const { defaultScoreCount, can } = useApp()
  const suggestAll = unscored > 0 && unscored <= 15
  const [n, setN] = useState<number>(suggestAll ? unscored : Math.min(defaultScoreCount, unscored || defaultScoreCount))
  useEffect(() => { if (suggestAll) setN(unscored) }, [unscored, suggestAll])
  const allowed = can('score')
  const effective = Math.min(n, unscored, SCORE_RUN_CAP)
  const opts = [
    ...SCORE_OPTIONS.filter(o => o < unscored).map(o => ({ value: String(o), label: String(o) })),
    { value: String(Math.min(unscored, SCORE_RUN_CAP)), label: unscored > SCORE_RUN_CAP ? `All · capped at ${SCORE_RUN_CAP} per run` : `All (${unscored})` },
  ]
  if (!unscored) return null
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div className={cn('inline-flex h-8 items-stretch overflow-hidden rounded-2xl border shadow-xs', allowed ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground')}>
        <button type="button" disabled={!allowed} onClick={() => onScore(effective)}
          title={allowed ? undefined : whoCanText('score')}
          className="inline-flex items-center gap-1.5 pr-2 pl-3 text-xs btn-type outline-none hover:bg-white/10 focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed">
          {allowed ? <Sparkles className="size-4" /> : <Lock className="size-4" />}
          {label} {more ? `${effective} more` : effective} with AI
        </button>
        <label className="relative flex items-center border-l border-white/20 pr-6 pl-2">
          <span className="sr-only">How many to score</span>
          <select disabled={!allowed} value={String(effective)} onChange={e => setN(Number(e.target.value))}
            className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed">
            {opts.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
          </select>
          <span className="font-mono text-[11px] tnum">{effective}</span>
          <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5" />
        </label>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground tnum">{allowed ? `${effective} AI scores` : whoCanText('score')}</span>
    </div>
  )
}

/* ---------- ? · Shortcut sheet (Gmail-aligned) ---------- */
export const MATCH_SHORTCUTS: [string, string][] = [
  ['J / K', 'Move down / up'],
  ['Space', 'Preview'],
  ['X', 'Select or unselect the focused row'],
  ['Shift + click', 'Select a range'],
  ['S', 'Shortlist the focused row, or every selected row'],
  ['E', 'Reject the focused row, or every selected row (reason dialog)'],
  ['U', 'Undo (the whole batch)'],
  ['Esc', 'Clear the selection'],
  ['?', 'This sheet'],
]
export function ShortcutSheet({ open, onClose, shortcuts = MATCH_SHORTCUTS }: { open: boolean; onClose: () => void; shortcuts?: [string, string][] }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" description="Same keys as Gmail. While anything is selected, S and E act on the selection."
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {shortcuts.map(([k, d]) => (
          <li key={k} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
            <span className="text-gray-1100">{d}</span>
            <span className="flex gap-1">{k.split(' / ').map(x => <Kbd key={x}>{x}</Kbd>)}</span>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
export function ShortcutHint({ onOpen }: { onOpen: () => void }) {
  return <Button variant="ghost" size="sm" icon={<Keyboard />} onClick={onOpen} aria-label="Keyboard shortcuts">?</Button>
}

/* ---------- N21 · Signed take block ---------- */
export type TakeState = 'empty' | 'draft' | 'signed-you' | 'signed-other' | 'edited'
export function takeState(take: Take | undefined, me: TeamMember, hasCall: boolean): TakeState {
  if (!take) return hasCall ? 'draft' : 'empty'
  if (take.status === 'signed') return take.authorId === me.id ? 'signed-you' : 'signed-other'
  if (take.editedSinceSigning) return 'edited'
  return 'draft'
}
/** "— Vandit D., Talent Partner, HeroScouter" */
export function signature(m: TeamMember | undefined) {
  return m ? `— ${m.displayName}, ${m.title}` : ''
}
const AI_DRAFT = (first: string) => `${first} came across as specific and grounded on our call: clear on what they owned, and honest about what they want next.`

/**
 * Builder/profile section "Our take". A draft never prints (P13).
 * States: Empty (no call) · Draft (unsigned, not printed) · Signed by you · Signed by someone else · Edited since signing.
 */
export function SignedTakeBlock({ candidateId, roleId, compact }: { candidateId: string; roleId?: string | null; compact?: boolean }) {
  const app = useApp()
  const c = app.candidate(candidateId)
  const take = app.takeFor(candidateId, roleId)
  const hasCall = (c?.calls?.length ?? 0) > 0 || !!c?.ourTake
  const st = takeState(take, app.currentUser, hasCall)
  const author = take ? app.member(take.authorId) : undefined
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(take?.text ?? '')
  useEffect(() => { setText(take?.text ?? ''); setEditing(false) }, [take?.id, take?.text])
  const canSign = app.can('signTake')

  const badge = {
    empty: <span className="eyebrow text-[10px] text-muted-foreground">No call yet</span>,
    draft: <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-warning/60 px-1.5 py-0.5 text-[11px] font-medium text-warning"><Info className="size-3" />Draft · not printed</span>,
    edited: <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-warning/60 px-1.5 py-0.5 text-[11px] font-medium text-warning"><Info className="size-3" />Edited since signing · not printed</span>,
    'signed-you': <span className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success"><BadgeCheck className="size-3" />Signed by you</span>,
    'signed-other': <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-gray-1100"><BadgeCheck className="size-3" />Signed by {author?.displayName}</span>,
  }[st]

  if (st === 'empty') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">{badge}</div>
        <p className="text-sm text-muted-foreground">Add your take after a call. A vouch without a conversation is just an AI summary.</p>
      </div>
    )
  }

  const startDraft = () => { app.saveTakeDraft(candidateId, AI_DRAFT(c?.name.split(' ')[0] ?? 'They'), { roleId, draftedByAI: true }) }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {badge}
        {take?.draftedByAI && take.status === 'draft' && <span className="eyebrow text-[10px] text-muted-foreground">AI draft from {c?.calls?.[0]?.label ?? 'call notes'}</span>}
      </div>

      {!take ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Sparkles />} onClick={startDraft} disabled={!canSign}>Draft from call</Button>
          <Button variant="ghost" icon={<PenLine />} onClick={() => { app.saveTakeDraft(candidateId, '', { roleId }); setEditing(true) }} disabled={!canSign}>Write it myself</Button>
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <Textarea aria-label="Our take" value={text} onChange={e => setText(e.target.value)} maxChars={280} rows={compact ? 2 : 3} />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { app.saveTakeDraft(candidateId, text, { roleId }); setEditing(false) }} disabled={text.length > 280}>Save draft</Button>
            <Button variant="ghost" size="sm" onClick={() => { setText(take.text); setEditing(false) }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <blockquote className={cn('rounded-xl border-l-2 px-3 py-2 text-sm leading-relaxed', take.status === 'signed' ? 'border-foreground bg-secondary/60 text-foreground' : 'border-dashed border-warning/60 bg-warning/[0.04] text-gray-1100')}>
          “{take.text || '…'}”
          {take.status === 'signed' && <footer className="mt-1.5 text-xs text-muted-foreground">{signature(author)}{take.approvedAt ? ` · ${take.approvedAt}` : ''}</footer>}
        </blockquote>
      )}

      {take && !editing && (
        <div className="flex flex-wrap items-center gap-1.5">
          {st === 'signed-other' ? (
            <Button variant="outline" size="sm" icon={<PenLine />} disabled={!canSign} onClick={() => { app.saveTakeDraft(candidateId, '', { roleId: roleId ?? null }); setEditing(true) }}>Write your own</Button>
          ) : (
            <>
              {take.status !== 'signed' && (
                canSign
                  ? <Button variant="primary" size="sm" icon={<BadgeCheck />} disabled={!take.text} onClick={() => app.approveTake(take.id)}>Approve and sign</Button>
                  : <GatedButton perm="signTake" variant="primary" size="sm">Approve and sign</GatedButton>
              )}
              <Button variant="ghost" size="sm" icon={<PenLine />} disabled={!canSign} onClick={() => setEditing(true)}>Edit</Button>
              {take.status !== 'signed' && <Button variant="ghost" size="sm" icon={<Sparkles />} disabled={!canSign} onClick={startDraft}>Redraft</Button>}
            </>
          )}
          {take.status === 'signed' && st === 'signed-you' && <span className="text-[11px] text-muted-foreground">Any edit needs re-approval.</span>}
        </div>
      )}
      {take?.status !== 'signed' && <p className="text-[11px] text-muted-foreground">Prints as “{text.slice(0, 24) || '…'}…” {signature(app.currentUser)} once you approve it.</p>}
    </div>
  )
}

/** Small inline marker used on lists: "Signed · Vandit D." / "Draft" / "—" */
export function TakeMarker({ candidateId }: { candidateId: string }) {
  const app = useApp()
  const t = app.takeFor(candidateId)
  if (!t) return <span className="text-xs text-muted-foreground">—</span>
  if (t.status === 'signed') return <span className="inline-flex items-center gap-1 text-xs text-gray-1100"><BadgeCheck className="size-3 text-success" />{app.member(t.authorId)?.displayName}</span>
  return <span className="text-xs text-warning">Draft</span>
}
