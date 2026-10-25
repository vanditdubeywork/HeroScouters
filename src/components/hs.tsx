import React, { useEffect, useRef, useState } from 'react'
import {
  Check, Diamond, HelpCircle, AlertTriangle, X, ChevronLeft, ChevronRight, ExternalLink, Loader2,
  AlertCircle, Info, RefreshCw, ChevronDown, ArrowUp, ArrowDown, CircleCheck, ListPlus, Eye,
} from 'lucide-react'
import { Avatar, Button, Checkbox, Kbd, Menu, Skeleton, cn, type MenuItem } from './ui'
import { useApp } from '../store/AppStore'
import { RecommendationPill, RecommendationBlock } from './v3'
import type { Band, MatchChip, MatchRowStatus, ProposedChange, SourceKind, WorkAuth, Candidate, Role, Recommendation, RequirementMetItem, NotInterestedReason } from '../data/types'

/* ==========================================================================
   HeroScouter components N1–N15 (Product Design Doc §4.4)
   ========================================================================== */

/* ---------- N6 · Source badge ---------- */
export function SourceBadge({ kind, className }: { kind: SourceKind; className?: string }) {
  const tone: Record<SourceKind, string> = {
    RESUME: 'border-border text-gray-1000',
    CALL: 'border-border text-gray-1000',
    JD: 'border-border text-gray-1000',
    RESEARCH: 'border-border text-gray-1000',
    EDITED: 'border-gray-800 text-gray-1100',
    ASSUMED: 'border-dashed border-warning text-[#b45309] bg-warning/5',
    PREDICTED: 'border-info/50 text-[#0e7490] bg-info/5',
  }
  return (
    <span title={kind === 'ASSUMED' ? 'Missing, treated as a pass' : `Source: ${kind.toLowerCase()}`}
      className={cn('inline-flex h-4 items-center rounded-xs border px-1 font-mono text-[9px] leading-none tracking-[0.1em] uppercase', tone[kind], className)}>
      {kind}
    </span>
  )
}

/* ---------- N5 · Recommendation chip (v0.4 §7.2: Strong / Mild / Not recommended, no numeric score) ---------- */
const BAND_TIP: Record<Band, string> = {
  Strong: 'Strong recommendation: meets requirements on direct evidence with clear green flags.',
  Good: 'Mild recommendation: meets hard requirements, with predicted skills or minor caveats.',
  Stretch: 'Not recommended: passed Stage 1 hard filters, but lacks core role signals.',
}
export function BandChip({ band }: { band: Band; score?: number; forceScore?: boolean }) {
  const recLabel: Record<Band, Recommendation> = {
    Strong: 'Strong',
    Good: 'Mild',
    Stretch: 'Not recommended',
  }
  const style: Record<Band, string> = {
    Strong: 'bg-primary text-primary-foreground border-primary',
    Good: 'bg-background text-foreground border-gray-1100',
    Stretch: 'bg-background text-muted-foreground border-dashed border-gray-800',
  }
  return (
    <span title={BAND_TIP[band]} className="inline-flex items-center gap-1.5">
      <span className={cn('inline-flex h-[22px] items-center rounded-md border px-2 text-[11px] btn-type whitespace-nowrap', style[band])}>{recLabel[band]}</span>
    </span>
  )
}

/* ---------- Match chips (§6.3) — always icon + text ---------- */
export function MatchChipView({ chip, onAddToAsk }: { chip: MatchChip; onAddToAsk?: () => void }) {
  const map = {
    evidence: { icon: <Check />, cls: 'border-border bg-background text-foreground', title: 'Evidence: met on record' },
    predicted: { icon: <Diamond />, cls: 'border-info/40 bg-info/[0.06] text-[#0e7490]', title: `Predicted skill${chip.detail ? ` · ${chip.detail}` : ''}` },
    assumed: { icon: <HelpCircle />, cls: 'border-dashed border-warning bg-warning/[0.06] text-[#b45309]', title: 'Assumed: missing, treated as a pass' },
    gap: { icon: <AlertTriangle />, cls: 'border-destructive/40 bg-background text-destructive', title: 'Gap: a soft mismatch worth knowing' },
  }[chip.kind]
  return (
    <span title={map.title} className={cn('group/chip inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-xs whitespace-nowrap [&>svg]:size-3', map.cls)}>
      {map.icon}
      <span>{chip.label}</span>
      {chip.kind === 'predicted' && chip.detail && <span className="hidden text-[11px] opacity-80 xl:inline">· {chip.detail.replace(/^from /, 'from ')}</span>}
      {chip.kind === 'assumed' && <span className="sr-only">(assumed)</span>}
      {chip.kind === 'assumed' && onAddToAsk && (
        <button type="button" onClick={e => { e.stopPropagation(); onAddToAsk() }} title="Add to ask list"
          className="-mr-0.5 ml-0.5 inline-flex items-center gap-0.5 rounded-sm border-l border-dashed border-warning/60 pl-1 text-[11px] font-medium hover:underline">
          <ListPlus className="size-3" /> Ask
        </button>
      )}
    </span>
  )
}

export function ChipRow({ chips, max = 6, onAddToAsk }: { chips: MatchChip[]; max?: number; onAddToAsk?: (c: MatchChip) => void }) {
  const shown = chips.slice(0, max)
  const extra = chips.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((c, i) => <MatchChipView key={i} chip={c} onAddToAsk={onAddToAsk ? () => onAddToAsk(c) : undefined} />)}
      {extra > 0 && <span className="text-xs text-muted-foreground">+{extra}</span>}
    </div>
  )
}

/* ---------- N7 · Completeness meter ---------- */
export function CompletenessMeter({ value, onClick, compact }: { value: number; onClick?: () => void; compact?: boolean }) {
  const tone = value < 50 ? 'warning' : value >= 80 ? 'success' : 'neutral'
  const bar = { warning: 'bg-warning', success: 'bg-success', neutral: 'bg-gray-1100' }[tone]
  const text = { warning: 'text-[#b45309]', success: 'text-[#15803d]', neutral: 'text-foreground' }[tone]
  const inner = (
    <>
      {!compact && <span className="text-xs text-muted-foreground">Profile</span>}
      <span className={cn('font-mono text-xs tnum', compact && 'w-7 text-right', text)}>{value}%</span>
      <span className={cn('h-1 overflow-hidden rounded-full bg-muted', compact ? 'w-9' : 'w-16')}><span className={cn('block h-full transition-all duration-700', bar)} style={{ width: `${value}%` }} /></span>
    </>
  )
  if (compact) return <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={`Profile ${value}% complete`}>{inner}</span>
  return (
    <button type="button" onClick={onClick} title="Open the Ask on next call list"
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1 transition hover:border-gray-700">
      {inner}
    </button>
  )
}

/* ---------- N4 · Inline banner ---------- */
export function Banner({ variant, children, actions, onDismiss, progress }: {
  variant: 'warning' | 'info' | 'error' | 'success'; children: React.ReactNode; actions?: React.ReactNode; onDismiss?: () => void; progress?: number
}) {
  const cfg = {
    warning: { icon: <AlertTriangle />, cls: 'border-warning/40 bg-warning/[0.07]', ic: 'text-warning' },
    info: { icon: <Loader2 className="animate-spin" />, cls: 'border-info/30 bg-info/[0.05]', ic: 'text-info' },
    error: { icon: <AlertCircle />, cls: 'border-destructive/30 bg-destructive/[0.05]', ic: 'text-destructive' },
    success: { icon: <CircleCheck />, cls: 'border-success/30 bg-success/[0.06]', ic: 'text-success' },
  }[variant]
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn('relative flex flex-wrap items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 text-sm', cfg.cls)}>
      <span className={cn('shrink-0 [&>svg]:size-4', cfg.ic)}>{cfg.icon}</span>
      <div className="min-w-0 flex-1 text-foreground">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {onDismiss && <button aria-label="Dismiss" onClick={onDismiss} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}
      {progress !== undefined && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-info/10"><div className="h-full bg-info transition-all duration-500" style={{ width: `${progress}%` }} /></div>}
    </div>
  )
}

/* ---------- N1 · Data table (Double-Bezel + semantic <table>) ---------- */
export interface Column<T> {
  key: string
  header: React.ReactNode
  icon?: React.ReactNode
  width?: string
  sortable?: boolean
  align?: 'left' | 'right'
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
}

function parseColStyle(w?: string): React.CSSProperties | undefined {
  if (!w) return undefined
  if (w.endsWith('px') || w.endsWith('%') || w.endsWith('rem')) return { width: w }
  const m = w.match(/minmax\((\d+px)/)
  if (m) return { minWidth: m[1] }
  return undefined
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, selectable, selected, onSelectedChange, loading, empty, rowActions, rowClassName, dense,
  columnMenu, isSelectable, quietCheckbox, caption, toolbar, stickyActions = true,
}: {
  columns: Column<T>[]; rows: T[]; onRowClick?: (r: T) => void
  selectable?: boolean; selected?: string[]; onSelectedChange?: (ids: string[]) => void
  loading?: boolean; empty?: React.ReactNode; rowActions?: (r: T) => React.ReactNode; rowClassName?: (r: T) => string; dense?: boolean
  /** v0.3 · T4 Sheets-style header menu (Sort A→Z / Z→A · Filter this column · Hide column) */
  columnMenu?: (col: Column<T>, sort: { asc: () => void; desc: () => void }) => MenuItem[]
  /** v0.3 · T1 rows that can't be selected (e.g. rejected) */
  isSelectable?: (r: T) => boolean
  /** v0.3 · P8 checkbox hidden until hover or any selection */
  quietCheckbox?: boolean
  caption?: string
  toolbar?: React.ReactNode
  stickyActions?: boolean
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const anchor = useRef<string | null>(null)
  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const col = columns.find(c => c.key === sort.key)
    if (!col?.sortValue) return rows
    return [...rows].sort((a, b) => (col.sortValue!(a) > col.sortValue!(b) ? 1 : -1) * sort.dir)
  }, [rows, sort, columns])
  const sel = selected ?? []
  const selectableRows = isSelectable ? sorted.filter(isSelectable) : sorted
  const allSel = selectableRows.length > 0 && selectableRows.every(r => sel.includes(r.id))
  const anySel = sel.length > 0
  /** P10 · Shift-click selects the range from the last clicked row */
  const toggleRow = (id: string, on: boolean, shift: boolean) => {
    if (shift && anchor.current) {
      const ids = sorted.map(r => r.id)
      const a = ids.indexOf(anchor.current); const b = ids.indexOf(id)
      if (a >= 0 && b >= 0) {
        const range = sorted.slice(Math.min(a, b), Math.max(a, b) + 1).filter(r => !isSelectable || isSelectable(r)).map(r => r.id)
        onSelectedChange?.(Array.from(new Set([...sel, ...range])))
        return
      }
    }
    anchor.current = id
    onSelectedChange?.(on ? [...sel, id] : sel.filter(x => x !== id))
  }

  return (
    <section className="rounded-2xl border border-border bg-gray-100 p-1">
      {toolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          {toolbar}
        </div>
      )}
      <div
        tabIndex={0}
        role="region"
        aria-label={caption ?? 'Data table'}
        className="no-scrollbar overflow-x-auto rounded-xl border border-border bg-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <table role="table" className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr role="row" className="h-9 divide-x divide-border border-b border-border bg-gray-100/95 backdrop-blur-xs">
              {selectable && (
                <th className="w-8 px-2.5 py-2 align-middle">
                  <Checkbox aria-label={`Select all ${selectableRows.length} shown`} checked={allSel} onChange={v => onSelectedChange?.(v ? selectableRows.map(r => r.id) : [])} />
                </th>
              )}
              {columns.map(c => (
                <th
                  key={c.key}
                  role="columnheader"
                  style={parseColStyle(c.width)}
                  aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
                  className={cn('eyebrow px-3 py-2 text-[10px] font-medium whitespace-nowrap text-gray-1000 select-none', c.align === 'right' && 'text-right')}
                >
                  {columnMenu ? (
                    <Menu align="start" width={200}
                      trigger={({ toggle }) => (
                        <button type="button" onClick={toggle} className={cn('inline-flex items-center gap-1.5 uppercase transition-colors hover:text-foreground [&>svg]:size-3', sort?.key === c.key && 'text-foreground')}>
                          {c.icon}
                          {c.header}
                          {sort?.key === c.key ? (sort.dir === 1 ? <ArrowUp className="size-3 text-foreground" /> : <ArrowDown className="size-3 text-foreground" />) : <ChevronDown className="size-3 text-gray-800" />}
                        </button>
                      )}
                      items={columnMenu(c, { asc: () => setSort({ key: c.key, dir: 1 }), desc: () => setSort({ key: c.key, dir: -1 }) })}
                    />
                  ) : c.sortable ? (
                    <button
                      type="button"
                      className={cn('inline-flex items-center gap-1.5 uppercase transition-colors hover:text-foreground [&>svg]:size-3', sort?.key === c.key && 'text-foreground')}
                      onClick={() => setSort(s => s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 })}
                    >
                      {c.icon}
                      {c.header}
                      {sort?.key === c.key
                        ? (sort.dir === 1 ? <ArrowUp className="size-3 text-foreground" /> : <ArrowDown className="size-3 text-foreground" />)
                        : <span className="font-sans text-[9px] tracking-normal text-gray-800">↕</span>}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 [&>svg]:size-3">
                      {c.icon}
                      {c.header}
                    </span>
                  )}
                </th>
              ))}
              {rowActions && (
                <th
                  role="columnheader"
                  className={cn(
                    'eyebrow w-[1%] px-3 py-2 text-right text-[10px] font-medium whitespace-nowrap text-gray-1000 select-none',
                    stickyActions && 'sticky right-0 z-10 bg-gray-100/95 shadow-[-1px_0_0_0_var(--border)] backdrop-blur-xs',
                  )}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="h-12 divide-x divide-border">
                  {selectable && <td className="px-2.5 py-2.5"><Skeleton className="size-4 rounded-xl" /></td>}
                  {columns.map((c, j) => (
                    <td key={c.key} className="px-3 py-2.5">
                      <Skeleton className={cn('h-3.5', j === 0 ? 'w-3/4' : 'w-1/2')} />
                    </td>
                  ))}
                  {rowActions && <td className="px-3 py-2.5" />}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="p-0">
                  {empty}
                </td>
              </tr>
            ) : (
              sorted.map(r => {
                const isSel = sel.includes(r.id)
                const canSel = !isSelectable || isSelectable(r)
                return (
                  <tr
                    key={r.id}
                    role="row"
                    data-row-id={r.id}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick?.(r)}
                    onKeyDown={e => { if (e.key === 'Enter' && onRowClick) onRowClick(r) }}
                    className={cn(
                      'group/row divide-x divide-border transition-colors outline-none focus-visible:bg-secondary/80',
                      dense ? 'h-11' : 'h-14',
                      onRowClick && 'cursor-pointer hover:bg-secondary/50',
                      isSel && 'bg-secondary/75',
                      rowClassName?.(r),
                    )}
                  >
                    {selectable && (
                      <td className={cn('w-8 px-2.5 py-2 align-middle', quietCheckbox && !anySel && 'opacity-70 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100')}
                        onClickCapture={e => { if (e.shiftKey && canSel) { e.stopPropagation(); e.preventDefault(); toggleRow(r.id, !isSel, true) } }}
                        onClick={e => e.stopPropagation()}>
                        {canSel && <Checkbox aria-label="Select row" checked={isSel} onChange={v => toggleRow(r.id, v, false)} />}
                      </td>
                    )}
                    {columns.map(c => (
                      <td
                        key={c.key}
                        role="cell"
                        style={parseColStyle(c.width)}
                        className={cn('px-3 align-middle', dense ? 'py-2' : 'py-2.5', c.align === 'right' && 'text-right')}
                      >
                        {c.render(r)}
                      </td>
                    ))}
                    {rowActions && (
                      <td
                        className={cn(
                          'w-[1%] px-3 py-2 text-right align-middle whitespace-nowrap transition-colors',
                          stickyActions && 'sticky right-0 z-[5] bg-card/95 shadow-[-1px_0_0_0_var(--border)] backdrop-blur-xs group-hover/row:bg-secondary/90',
                          isSel && stickyActions && 'bg-secondary/95',
                        )}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5 opacity-90 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
                          {rowActions(r)}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ---------- N2 · Match row (v0.4 §7.2: Requirements met 4/4, green/red flags, Strong/Mild/Not recommended, no numeric score) ---------- */
export function MatchRow({
  rank, initials, title, subtitle, tag, band, score: _score, reason, chips, status, rejectReason, delta, focused,
  candidate, role,
  onPreview, onShortlist, onReject, onUndo, onMask, onAddToAsk, shortlistLabel = 'Shortlist', rejectLabel = 'Reject', onClick,
  selected, onToggleSelect, notScored, skipped, meta, footer, actionsDisabled,
  recommendation, suggested, requirementsMet, greenFlags, redFlags, notInterestedReason,
}: {
  rank: number; initials?: string; title: string; subtitle: string; tag?: React.ReactNode
  band: Band; score: number; reason: string; chips: MatchChip[]
  status: MatchRowStatus | 'not-a-fit'; rejectReason?: string; delta?: 'new' | 'moved' | 'requalified'
  dimmed?: boolean; focused?: boolean
  candidate?: Candidate; role?: Role
  onPreview?: () => void; onShortlist?: () => void; onReject?: () => void; onUndo?: () => void; onMask?: () => void; onAddToAsk?: (c: MatchChip) => void
  shortlistLabel?: string; rejectLabel?: string; onClick?: () => void
  selected?: boolean; onToggleSelect?: (shift: boolean) => void
  notScored?: boolean; skipped?: boolean
  meta?: React.ReactNode; footer?: React.ReactNode
  actionsDisabled?: { shortlist?: string; reject?: string }
  /** v0.4 · C6 / C10 */
  recommendation?: Recommendation; suggested?: boolean
  requirementsMet?: RequirementMetItem[]; greenFlags?: string[]; redFlags?: string[]
  notInterestedReason?: NotInterestedReason
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (focused) ref.current?.focus({ preventScroll: false }) }, [focused])

  if (status === 'rejected' || status === 'not-a-fit' || status === 'not-interested') {
    const label = status === 'not-interested'
      ? `Not interested${notInterestedReason ? ` · ${notInterestedReason}` : ''}`
      : `${status === 'rejected' ? 'Rejected' : 'Not a fit'}${rejectReason ? ` · ${rejectReason}` : ''}`
    return (
      <div className="flex h-11 items-center gap-3 rounded-xl border border-dashed border-border bg-gray-100/60 px-4 text-sm text-muted-foreground">
        {!notScored && <span className="font-mono text-[11px] tnum">#{rank}</span>}
        <span className="truncate font-medium text-gray-1100">{title}</span>
        <span className="text-xs">· {label}</span>
        {onUndo && <Button variant="link" className="ml-auto text-xs" onClick={onUndo}>Undo</Button>}
      </div>
    )
  }

  const shortlisted = status === 'shortlisted'
  const openPreview = onPreview ?? onClick

  // Clean 4-column key facts (single-line value per column, zero clutter)
  const facts: { label: string; value: string }[] = candidate
    ? [
        { label: 'Experience', value: `${candidate.years !== null ? `${candidate.years} yrs` : 'Not captured'} · ${candidate.category}` },
        { label: 'Location', value: `${candidate.metro ?? 'Not captured'}${candidate.workModes ? ` · ${candidate.workModes[0]}` : ''}` },
        { label: 'Work auth', value: workAuthShort(candidate.workAuth) ?? 'Not captured' },
        { label: 'Compensation', value: candidate.pay ?? 'Not captured' },
      ]
    : role
      ? [
          { label: 'Category', value: `${role.category} · ${role.subcategory}` },
          { label: 'Location', value: `${role.location} · ${role.workMode}` },
          { label: 'Requirement', value: `${role.minYears}+ yrs · ${role.sponsorship === 'No' ? 'No sponsor' : 'Sponsors'}` },
          { label: 'Compensation', value: role.pay },
        ]
      : []

  const approveText = shortlistLabel
  const rec: Recommendation = recommendation ?? (band === 'Strong' ? 'Strong' : band === 'Good' ? 'Mild' : 'Not recommended')
  const hasV4Breakdown = (requirementsMet && requirementsMet.length > 0) || (greenFlags && greenFlags.length > 0) || (redFlags && redFlags.length > 0)

  // When the 4-column facts strip is shown, omit evidence chips that merely repeat years, location/mode, or work auth
  const visibleChips = facts.length > 0
    ? chips.filter(ch => {
        if (ch.kind !== 'evidence') return true
        return !/(\b\d+\+?\s*yrs\b|\bhybrid\b|\bremote\b|\bonsite\b|\bopen to\b|\bcitizen\b|\bgreen card\b|\bh-1b\b|\bopt\b|\bsponsorship\b)/i.test(ch.label)
      })
    : chips

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={cn(
        'group/match relative rounded-2xl border bg-gray-100 p-1 transition-[box-shadow,border-color] outline-none',
        selected ? 'border-gray-1100 bg-secondary' : focused ? 'border-gray-1100 shadow-custom-hover' : shortlisted ? 'border-emerald-500/40' : 'border-border hover:border-gray-600',
      )}
    >
      <div className="grid grid-cols-1 gap-1 lg:grid-cols-4">
        {/* ==================== 3/4 LEFT SECTION: Clean Profile & Match Summary ==================== */}
        <div
          role={openPreview ? 'button' : undefined}
          tabIndex={openPreview ? 0 : undefined}
          onClick={openPreview}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ' ') && openPreview && e.target === e.currentTarget) {
              e.preventDefault()
              openPreview()
            }
          }}
          className={cn(
            'relative flex flex-col justify-between gap-3.5 rounded-xl border border-border bg-card px-5 py-4 text-left transition-colors lg:col-span-3',
            openPreview && 'cursor-pointer hover:border-gray-600 hover:bg-secondary/35',
          )}
        >
          {shortlisted && <span aria-hidden className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full bg-success" />}

          {/* Row 1: Identity + Recommendation Pill (no numeric score on screen) */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {onToggleSelect && (
                <span className={cn('transition-opacity', selected ? 'opacity-100' : 'opacity-75 group-hover/match:opacity-100 focus-within:opacity-100 [.any-selected_&]:opacity-100')}
                  onClick={e => { e.stopPropagation(); onToggleSelect(e.shiftKey) }}>
                  <span className="pointer-events-none"><Checkbox aria-label={`Select ${title}`} checked={!!selected} onChange={() => {}} /></span>
                </span>
              )}
              {!notScored && <span className="font-mono text-xs font-medium text-gray-1000 tnum">#{rank}</span>}
              {initials && <Avatar initials={initials} size={36} />}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</span>
                  {tag}
                  {status === 'requalified' && (
                    <span className="inline-flex h-5 items-center gap-1 rounded-md border border-iris/40 bg-iris/[0.07] px-1.5 text-[11px] font-medium text-iris">
                      <RefreshCw className="size-3" />Re-qualified
                    </span>
                  )}
                  {delta === 'new' && <span className="eyebrow rounded-sm bg-info/10 px-1.5 py-0.5 text-[9px] text-info">New</span>}
                  {delta === 'moved' && <span className="eyebrow rounded-sm bg-muted px-1.5 py-0.5 text-[9px] text-gray-1100">Moved ↑</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {candidate?.companies[0] ? `${candidate.companies[0].title} · ${candidate.companies[0].name} (${candidate.companies[0].descriptor.split(',')[0]})` : subtitle}
                </div>
              </div>
            </div>
            {notScored
              ? <span className={cn('eyebrow rounded-md border border-dashed px-1.5 py-0.5 text-[10px]', skipped ? 'border-gray-700 text-muted-foreground' : 'border-gray-800 text-gray-1100')}>Not scored</span>
              : <RecommendationPill recommendation={rec} suggested={suggested} />}
          </div>

          {/* Row 2: 4-Column Structured Profile Facts */}
          {facts.length > 0 && (
            <div className="grid grid-cols-2 gap-4 border-y border-border/80 py-2.5 sm:grid-cols-4">
              {facts.map(f => (
                <div key={f.label} className="min-w-0">
                  <div className="eyebrow text-[9px] text-gray-1000">{f.label}</div>
                  <div className="mt-0.5 truncate text-xs font-medium text-foreground">{f.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Row 3: Plain-English Reason + v0.4 Requirements Met / Flags Block */}
          {!notScored && (
            <div className="space-y-2">
              <p className="text-[13px] leading-snug text-gray-1100">“{reason}”</p>
              {hasV4Breakdown ? (
                <RecommendationBlock
                  requirementsMet={requirementsMet}
                  greenFlags={greenFlags}
                  redFlags={redFlags}
                  onAskAssumed={onAddToAsk ? label => onAddToAsk({ kind: 'assumed', label }) : undefined}
                />
              ) : (
                visibleChips.length > 0 && <ChipRow chips={visibleChips} onAddToAsk={onAddToAsk} />
              )}
            </div>
          )}
          {meta && <div onClick={e => e.stopPropagation()}>{meta}</div>}
        </div>

        {/* ==================== 1/4 RIGHT SECTION: 3 Big Centered Action Buttons ==================== */}
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 lg:col-span-1"
          onClick={e => e.stopPropagation()}
        >
          {/* 1. Colored Shortlist Button */}
          {onShortlist && (
            shortlisted ? (
              <button
                type="button"
                title="Click to undo shortlist"
                onClick={onUndo}
                className="flex h-9 w-full max-w-[190px] items-center justify-center gap-2 rounded-xl border border-emerald-400/70 bg-emerald-500/20 px-4 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30"
              >
                <Check className="size-4 shrink-0 stroke-[2.5]" />
                <span>Shortlisted</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onShortlist}
                disabled={!!actionsDisabled?.shortlist}
                title={actionsDisabled?.shortlist}
                className="flex h-9 w-full max-w-[190px] items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-400 transition-colors hover:border-emerald-400 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="size-4 shrink-0 stroke-[2.5]" />
                <span>{approveText}</span>
              </button>
            )
          )}

          {/* 2. Next-Step Mask Action (when shortlisted) OR Colored Reject Button */}
          {shortlisted && onMask ? (
            <button
              type="button"
              onClick={onMask}
              className="flex h-9 w-full max-w-[190px] items-center justify-center gap-2 rounded-xl border border-foreground bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90"
            >
              <span>Mask link →</span>
            </button>
          ) : onReject && (
            <button
              type="button"
              onClick={onReject}
              aria-label={actionsDisabled?.reject ? `${rejectLabel} — ${actionsDisabled.reject}` : rejectLabel}
              disabled={!!actionsDisabled?.reject}
              title={actionsDisabled?.reject}
              className="flex h-9 w-full max-w-[190px] items-center justify-center gap-2 rounded-xl border border-[#e5484d]/50 bg-[#e5484d]/15 px-4 text-xs font-semibold text-[#ff6b6e] transition-colors hover:border-[#e5484d] hover:bg-[#e5484d]/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="size-4 shrink-0 stroke-[2.5]" />
              <span>{rejectLabel}</span>
            </button>
          )}

          {/* 3. Preview Button */}
          {openPreview && (
            <button
              type="button"
              onClick={openPreview}
              className="flex h-9 w-full max-w-[190px] items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 text-xs font-medium text-foreground transition-colors hover:border-gray-700 hover:bg-gray-400"
            >
              <Eye className="size-4 shrink-0 text-gray-1100" />
              <span>{onPreview ? 'Preview' : 'Open role'}</span>
            </button>
          )}
          {footer}
        </div>
      </div>
    </div>
  )
}

/* ---------- §7.2 Funnel line (v0.4: 412 in pool → 385 eliminated → 27 not scored → 5 suggested → 3 shortlisted) ---------- */
export function FunnelLine({
  pool, pass, top, onSeeEliminated, eliminatedOpen,
  notScored, suggested, shortlisted, onSelectStage,
}: {
  pool: number; pass: number; top: number; onSeeEliminated?: () => void; eliminatedOpen?: boolean
  notScored?: number; suggested?: number; shortlisted?: number
  onSelectStage?: (stage: 'eliminated' | 'not-scored' | 'scored' | 'shortlisted') => void
}) {
  const elim = Math.max(0, pool - pass)
  const Step = ({ n, label, muted, onClick, active }: { n: number; label: string; muted?: boolean; onClick?: () => void; active?: boolean }) => {
    const inner = (
      <>
        <span className={cn('font-mono text-sm font-medium tnum', muted ? 'text-muted-foreground' : 'text-foreground')}>{n}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </>
    )
    if (!onClick) {
      return <span className="inline-flex items-baseline gap-1.5 px-1.5 py-0.5">{inner}</span>
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-baseline gap-1.5 rounded-lg border px-2 py-0.5 transition-colors cursor-pointer',
          active
            ? 'border-gray-900 bg-card text-foreground shadow-2xs'
            : 'border-transparent hover:border-border hover:bg-card/80',
        )}
      >
        {inner}
      </button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border bg-secondary/60 px-3.5 py-2">
      <Step n={pool} label="in pool" />
      <span className="text-gray-800">→</span>
      <Step
        n={elim}
        label="eliminated"
        muted
        active={eliminatedOpen}
        onClick={onSeeEliminated ?? (onSelectStage ? () => onSelectStage('eliminated') : undefined)}
      />
      <span className="text-gray-800">→</span>
      <Step
        n={notScored ?? Math.max(0, pass - top)}
        label="not scored"
        onClick={onSelectStage ? () => onSelectStage('not-scored') : undefined}
      />
      <span className="text-gray-800">→</span>
      <Step
        n={suggested ?? top}
        label={suggested !== undefined ? 'suggested / scored' : 'scored'}
        onClick={onSelectStage ? () => onSelectStage('scored') : undefined}
      />
      {shortlisted !== undefined && (
        <>
          <span className="text-gray-800">→</span>
          <Step
            n={shortlisted}
            label="shortlisted"
            onClick={onSelectStage ? () => onSelectStage('shortlisted') : undefined}
          />
        </>
      )}
      {onSeeEliminated && (
        <Button variant="link" className="ml-auto text-xs" onClick={onSeeEliminated} kbd="E">
          {eliminatedOpen ? 'Hide eliminated' : `See ${elim} eliminated`}
        </Button>
      )}
    </div>
  )
}

/* ---------- N9 · Rerun summary ---------- */
export function RerunSummary({ counts, active, onSelect, onDismiss }: {
  counts: { new: number; moved: number; requalified: number; dropped: number }; active?: string | null; onSelect?: (k: string | null) => void; onDismiss?: () => void
}) {
  const items = [
    { k: 'new', label: 'New in top 5', n: counts.new, cls: 'text-[#0e7490]' },
    { k: 'moved', label: 'Moved', n: counts.moved, cls: 'text-foreground' },
    { k: 'requalified', label: 'Re-qualified', n: counts.requalified, cls: 'text-iris' },
    { k: 'dropped', label: 'Dropped out', n: counts.dropped, cls: 'text-muted-foreground' },
  ]
  return (
    <div className="rounded-2xl border border-border bg-background">
      <div className="flex items-center gap-2 px-4 py-2.5"><RefreshCw className="size-4 text-muted-foreground" /><h2 className="text-sm font-semibold">What changed in this rerun</h2>
        {onDismiss && <Button variant="ghost" size="sm" className="ml-auto" onClick={onDismiss}>Dismiss</Button>}
      </div>
      <div className="mx-1 mb-1 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 md:grid-cols-4">
        {items.map(it => (
          <button key={it.k} onClick={() => onSelect?.(active === it.k ? null : it.k)} aria-pressed={active === it.k}
            className={cn('flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted', active === it.k && 'bg-muted ring-1 ring-border')}>
            <span className={cn('font-mono text-xl font-medium tnum', it.cls)}>{it.n}</span>
            <span className="text-xs text-muted-foreground">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- N3 · Side panel ---------- */
export function SidePanel({ open, onClose, header, footer, children, width = 480, label }: {
  open: boolean; onClose: () => void; header: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; width?: number; label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const prev = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    prev.current = document.activeElement as HTMLElement
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev.current?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="anim-fade absolute inset-0 bg-black/20" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} style={{ width }}
        className="anim-panel absolute inset-y-0 right-0 flex max-w-full flex-col border-l border-border bg-background shadow-2xl outline-none">
        <div className="shrink-0 border-b border-border px-4 py-3">{header}</div>
        <div className="no-scrollbar flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">{footer}</div>}
      </div>
    </div>
  )
}

export function PanelNav({ onPrev, onNext, index, total }: { onPrev?: () => void; onNext?: () => void; index: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" aria-label="Previous (K)" onClick={onPrev} disabled={!onPrev} icon={<ChevronLeft />} />
      <span className="font-mono text-[11px] text-muted-foreground tnum">{index + 1}/{total}</span>
      <Button variant="ghost" size="icon-sm" aria-label="Next (J)" onClick={onNext} disabled={!onNext} icon={<ChevronRight />} />
    </div>
  )
}

/* ---------- Dialog ---------- */
export function Dialog({ open, onClose, title, children, footer, width = 460, description }: {
  open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; footer: React.ReactNode; width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement
    const t = window.setTimeout(() => (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current)?.focus(), 10)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(t); document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="anim-fade absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} style={{ width }}
        className="anim-pop relative max-h-[90vh] max-w-full overflow-hidden rounded-2xl border border-border bg-gray-100 shadow-2xl outline-none">
        <div className="px-5 pt-4 pb-3">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="no-scrollbar mx-1 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card p-4">{children}</div>}
        <div className="flex items-center justify-end gap-2 px-5 py-3">{footer}</div>
      </div>
    </div>
  )
}

/* ---------- N8 · Proposed changes ---------- */
export function ProposedChangesList({ changes, decisions, onDecide }: {
  changes: ProposedChange[]; decisions: Record<string, 'accept' | 'reject'>; onDecide: (id: string, d: 'accept' | 'reject') => void
}) {
  return (
    <div className="divide-y divide-border">
      {changes.map(c => {
        const d = decisions[c.id] ?? 'accept'
        return (
          <div key={c.id} className={cn('grid grid-cols-[140px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 first:pt-0 last:pb-0', d === 'reject' && 'opacity-50')}>
            <div className="text-sm font-medium">{c.field}</div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
              <span className={cn('text-muted-foreground', d === 'accept' && 'line-through decoration-gray-800')}>{c.from}</span>
              <span className="text-gray-800">→</span>
              <span className="font-medium">{c.to}</span>
              <SourceBadge kind={c.source} />
            </div>
            <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
              <button onClick={() => onDecide(c.id, 'accept')} aria-pressed={d === 'accept'} className={cn('h-6 rounded-md px-2 text-xs font-medium', d === 'accept' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>Accept</button>
              <button onClick={() => onDecide(c.id, 'reject')} aria-pressed={d === 'reject'} className={cn('h-6 rounded-md px-2 text-xs font-medium', d === 'reject' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted')}>Reject</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- N10 · Document preview frame ---------- */
export function DocFrame({ children, toolbar, pageLabel = 'Page 1 of 1' }: { children: React.ReactNode; toolbar?: React.ReactNode; pageLabel?: string }) {
  const [zoom, setZoom] = useState<'fit' | '100'>('fit')
  return (
    <div className="flex h-full flex-col bg-muted/60">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4">
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{pageLabel}</span>
          <div className="flex rounded-lg border border-border bg-background p-0.5">
            {(['fit', '100'] as const).map(z => (
              <button key={z} onClick={() => setZoom(z)} className={cn('h-6 rounded-md px-2 text-[11px] font-medium', zoom === z ? 'bg-muted text-foreground' : 'text-muted-foreground')}>{z === 'fit' ? 'Fit' : '100%'}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="no-scrollbar flex-1 overflow-auto p-6">
        <div className={cn('mx-auto origin-top rounded-sm bg-card text-foreground shadow-[var(--shadow-custom-hover)] ring-1 ring-border transition-transform', zoom === 'fit' ? 'w-full max-w-[612px]' : 'w-[816px]')}
          style={{ aspectRatio: '8.5 / 11' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ---------- N11 · Toaster ---------- */
export function Toaster() {
  const { toasts, dismissToast } = useApp()
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[360px] flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="anim-toast pointer-events-auto flex items-center gap-3 rounded-xl border border-white/10 bg-[#111] px-3.5 py-2.5 text-sm text-white shadow-2xl">
          <CircleCheck className="size-4 shrink-0 text-success" />
          <span className="flex-1">{t.message}</span>
          {t.undo && <button className="text-xs font-semibold underline-offset-2 hover:underline" onClick={() => { t.undo!(); dismissToast(t.id) }}>Undo <span className="font-mono text-[10px] opacity-60">U</span></button>}
          {t.action && <button className="text-xs font-semibold hover:underline" onClick={() => { t.action!.onClick(); dismissToast(t.id) }}>{t.action.label}</button>}
          <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="text-white/50 hover:text-white"><X className="size-3.5" /></button>
        </div>
      ))}
    </div>
  )
}

/* ---------- N12 · Filter chip ---------- */
export function FilterChip({ active, onClick, children, count, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number; icon?: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-2xl border px-3 text-xs font-[510] tracking-[-0.011em] whitespace-nowrap transition-all duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 [&>svg]:size-3.5 [&>svg]:shrink-0',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
          : 'border-border bg-card text-gray-1100 hover:border-gray-700 hover:bg-secondary hover:text-foreground')}>
      {active ? <Check className="size-3.5 shrink-0" /> : icon}
      {children}
      {count !== undefined && (
        <span className={cn('rounded-sm px-1 py-0.2 font-mono text-[10px] tnum', active ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-secondary text-gray-1000')}>
          {count}
        </span>
      )}
    </button>
  )
}

/* ---------- N14 · Version chip ---------- */
export function VersionChip({ label, versions, onCompare }: { label: string; versions: { v: string; who: string; when: string }[]; onCompare?: () => void }) {
  return (
    <Menu width={260}
      trigger={({ toggle }) => (
        <button onClick={toggle} className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 font-mono text-[11px] text-foreground hover:bg-muted">
          {label}<ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      )}
      items={[
        ...versions.map((v, i) => ({ label: <span className="flex items-center gap-2"><span className="font-mono text-xs">{v.v}</span><span className="text-xs text-muted-foreground">{v.who} · {v.when}</span>{i === 0 && <span className="eyebrow text-[9px] text-gray-1000">current</span>}</span> })),
        { separator: true, label: '' },
        { label: 'Compare with current', onSelect: onCompare },
      ]}
    />
  )
}

/* ---------- N15 · AI progress stepper ---------- */
export function AIStepper({ steps, current, title }: { steps: string[]; current: number; title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-6 py-16">
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-muted"><div className="rainbow-line h-full w-full" /></div>
      {title && <p className="text-sm font-medium">{title}</p>}
      <ol className="space-y-2.5" aria-live="polite">
        {steps.map((s, i) => (
          <li key={s} className={cn('flex items-center gap-2.5 text-sm', i > current ? 'text-gray-900' : 'text-foreground')}>
            <span className={cn('flex size-5 items-center justify-center rounded-md border', i < current ? 'border-primary bg-primary text-primary-foreground' : i === current ? 'border-gray-1100' : 'border-border')}>
              {i < current ? <Check className="size-3" strokeWidth={3} /> : i === current ? <Loader2 className="size-3 animate-spin" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">You can keep working. We'll let you know when it's ready.</p>
    </div>
  )
}

/** Runs the stepper forward on a timer; returns current step index and whether done */
export function useStepper(total: number, running: boolean, msPerStep = 900) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!running) { setStep(0); return }
    if (step >= total) return
    const t = window.setTimeout(() => setStep(s => s + 1), msPerStep)
    return () => window.clearTimeout(t)
  }, [running, step, total, msPerStep])
  return { step, done: running && step >= total }
}

/* ---------- Helpers ---------- */
export function workAuthShort(w: WorkAuth): string | null {
  if (!w.status) return null
  if (w.status !== 'Visa') return w.status
  const parts = [w.visaType ?? 'Visa']
  if (w.needsTransfer) parts.push('transfer')
  if (w.needsSponsorship) parts.push('needs sponsorship')
  return parts.join(' · ')
}

export function WorkAuthChip({ w }: { w: WorkAuth }) {
  const s = workAuthShort(w)
  if (!s) return <span className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-warning px-1.5 text-xs text-[#b45309]"><HelpCircle className="size-3" />Work auth not captured</span>
  return <span className="inline-flex h-6 items-center rounded-md border border-border bg-muted px-2 text-xs font-medium">{s}</span>
}

/** "Not captured" value placeholder (warning, never hides a person) */
export function NotCaptured({ assumed }: { assumed?: boolean }) {
  return assumed
    ? <span className="inline-flex items-center gap-1.5 text-sm text-[#b45309]"><HelpCircle className="size-3.5" />Not captured <SourceBadge kind="ASSUMED" /></span>
    : <span className="text-sm text-[#b45309]">Not captured</span>
}

export function candidateLocation(c: Candidate) {
  if (!c.city) return null
  return `${c.metro ?? c.city}${c.workModes ? ` · ${c.workModes.join('/').toLowerCase()}` : ''}`
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />{children}</p>
}

export function ExternalLinkIcon() { return <ExternalLink className="size-3.5" /> }
export { Kbd }

/* ---------- Structured FIELD | VALUE Overview Grid Table ---------- */
export interface OverviewRow {
  icon?: React.ReactNode
  field: string
  value: React.ReactNode
}

export function OverviewGrid({ title = 'Overview', action, rows }: { title?: string; action?: React.ReactNode; rows: OverviewRow[] }) {
  return (
    <section className="rounded-2xl border border-border bg-gray-100 p-3">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="h-8 divide-x divide-border border-b border-border bg-secondary/50">
              <th className="eyebrow w-[148px] px-3.5 py-1.5 text-[10px] font-medium text-gray-1000">Field</th>
              <th className="eyebrow px-3.5 py-1.5 text-[10px] font-medium text-gray-1000">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(r => (
              <tr key={r.field} className="divide-x divide-border transition-colors hover:bg-secondary/25">
                <td className="w-[148px] px-3.5 py-2.5 align-middle font-medium whitespace-nowrap text-gray-1100">
                  <span className="inline-flex items-center gap-2">
                    {r.icon && <span className="text-gray-900 [&>svg]:size-3.5">{r.icon}</span>}
                    <span>{r.field}</span>
                  </span>
                </td>
                <td className="px-3.5 py-2.5 align-middle text-foreground">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
