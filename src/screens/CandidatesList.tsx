import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Copy, ChevronDown, Download, FileText, Users, ArrowUp, ArrowDown, Filter, EyeOff, SearchX, Smartphone } from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import { Avatar, Button, EmptyState, ExampleMark, Menu, PageHeader, Switch, Tag } from '../components/ui'
import { CompletenessMeter, DataTable, Dialog, NotCaptured, workAuthShort, type Column } from '../components/hs'
import {
  ColumnsMenu, FilterBar, FilterPicker, GatedButton, SelectionBar, TakeMarker, applyFilters, chipText, useColumnPrefs,
  type ColumnOption, type FilterField, type FilterState, type FilterValue,
} from '../components/v3'
import { CandidatePreview } from './CandidatePreview'
import { useApp, useWireframeState, whoCanText } from '../store/AppStore'
import { POOL_SIZE } from '../data/mock'
import { CATEGORIES, type Candidate } from '../data/types'

/* ==========================================================================
   S-05 · Candidates — PRD v0.3 §7.4 (T4)
   One filter bar (Sheets model: OR inside a column, AND across), Columns menu,
   Sheets-style header menu, P10 selection. AI Scout is parked (§8).
   ========================================================================== */

const WF_STATES = [
  { id: 'live', label: 'Default (live)' },
  { id: 'category', label: 'Category active' },
  { id: 'picker', label: 'Filter picker open' },
  { id: 'several', label: 'Several filters (Visa + Experience + Domain)' },
  { id: 'bulk', label: 'Bulk selection' },
  { id: 'columns', label: 'Columns menu open' },
  { id: 'noresults', label: 'No results' },
  { id: 'empty', label: 'Empty pool' },
  { id: 'loading', label: 'Loading' },
  { id: 'phone', label: 'Phone' },
]

const PAGE = 20
const MASKED_BATCH_CAP = 25 // Decision #14

/* ---------- Columns (N18) ---------- */
const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'name', label: 'Name', locked: true },
  { key: 'category', label: 'Category · sub' },
  { key: 'years', label: 'Years' },
  { key: 'location', label: 'Location · mode' },
  { key: 'auth', label: 'Work auth' },
  { key: 'completeness', label: 'Completeness' },
  { key: 'domain', label: 'Domain' },
  { key: 'pay', label: 'Pay' },
  { key: 'availability', label: 'Availability' },
  { key: 'search', label: 'Search status' },
  { key: 'skills', label: 'Skills' },
  { key: 'source', label: 'Source' },
  { key: 'resumes', label: 'Resumes' },
  { key: 'updated', label: 'Updated' },
  { key: 'take', label: 'Take' },
]
const DEFAULT_COLUMNS = ['name', 'category', 'years', 'location', 'auth', 'completeness']
/** Column → filter field (one filter state for both entry points) */
const COLUMN_FILTER: Record<string, string | undefined> = {
  category: 'category', years: 'years', location: 'metro', auth: 'auth', completeness: 'completeness', domain: 'domain',
  pay: 'pay', availability: 'availability', search: 'search', skills: 'skills', source: 'source', resumes: 'resumeLabel', updated: 'updated',
}

/* ---------- Helpers ---------- */
/** "$140k–$175k" → 140 (low end, in $k) */
function payLow(pay: string | null): number | null {
  const m = pay?.match(/(\d+(?:\.\d+)?)\s*k/i)
  return m ? Number(m[1]) : null
}
function authValue(c: Candidate): string | null {
  const w = c.workAuth
  if (!w.status) return null
  return w.status === 'Visa' ? (w.visaType ?? 'Visa') : w.status
}
function yesNo(c: Candidate, k: 'needsSponsorship' | 'needsTransfer'): string | null {
  const w = c.workAuth
  if (w.status === 'US citizen' || w.status === 'Green card') return 'No'
  const v = w[k]
  return v === true ? 'Yes' : v === false ? 'No' : null
}
/** F-07 masked line — no names, no IDs */
function maskedLine(c: Candidate) {
  const title = c.headline.split(' · ')[0]
  const domain = c.domains?.[0] ?? null
  const mode = c.workModes ? (c.workModes.includes('Hybrid') ? 'hybrid' : c.workModes[0].toLowerCase()) : null
  const loc = c.metro ? `${c.metro}${mode ? ` (${mode})` : ''}` : 'Location not captured'
  const skills = c.skills.length ? c.skills.slice(0, 2).join(' + ') : c.subcategory
  return [title, c.years !== null ? `${c.years} yrs` : 'Years not captured', domain, loc, workAuthShort(c.workAuth) ?? 'Work auth not captured', skills].filter(Boolean).join(' · ')
}
const fullLine = (c: Candidate) => `${c.name} — ${maskedLine(c)}${c.email ? ` · ${c.email}` : ''}`

function blankFilter<T>(f: FilterField<T>, rows: T[]): FilterValue {
  if (f.kind === 'number') {
    const nums = rows.map(r => f.num?.(r)).filter((n): n is number => n != null)
    return { kind: 'number', op: 'gte', a: nums.length ? Math.round(Math.min(...nums)) : 0, includeMissing: true }
  }
  if (f.kind === 'multi') return { kind: 'multi', values: [], mode: 'any', includeMissing: true }
  return { kind: 'values', values: [], includeMissing: true }
}
const isEmptyFilter = (v: FilterValue) => v.kind !== 'number' && v.values.length === 0 && v.includeMissing

/** Wireframe presets */
function presetFilters(wf: string): FilterState {
  if (wf === 'category') return { category: { kind: 'values', values: ['Marketing'], includeMissing: true } }
  if (wf === 'several') return {
    auth: { kind: 'values', values: ['US citizen', 'Green card'], includeMissing: true },
    years: { kind: 'number', op: 'gte', a: 5, includeMissing: true },
    domain: { kind: 'multi', values: ['B2B SaaS', 'Payments/Fintech'], mode: 'any', includeMissing: true },
  }
  if (wf === 'noresults') return {
    category: { kind: 'values', values: ['Design'], includeMissing: true },
    years: { kind: 'number', op: 'gte', a: 12, includeMissing: false },
    auth: { kind: 'values', values: ['H-1B'], includeMissing: false },
  }
  return {}
}

/* ==========================================================================
   Screen
   ========================================================================== */
export function CandidatesList() {
  const app = useApp()
  const navigate = useNavigate()
  const [wf] = useWireframeState('S-05', 'Candidates', WF_STATES, 'live')

  const [filters, setFilters] = useState<FilterState>(() => presetFilters(wf))
  const [includePredicted, setIncludePredicted] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [allMatching, setAllMatching] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [colFilter, setColFilter] = useState<string | null>(null)
  const { visible, setVisible, reset } = useColumnPrefs('candidates', DEFAULT_COLUMNS)
  const barRef = useRef<HTMLDivElement>(null)

  useTopBar([{ label: 'Candidates' }],
    <span className="inline-flex h-6 items-center rounded-full border border-border bg-secondary px-2.5 font-mono text-[11px] text-gray-1100 tnum">{POOL_SIZE} in pool</span>)

  /* ---------- Fields (§7.4 "Filterable at launch", Candidates column) ---------- */
  const fields = useMemo<FilterField<Candidate>[]>(() => [
    { key: 'category', label: 'Category', kind: 'values', pinned: true, options: CATEGORIES, get: c => c.category },
    { key: 'subcategory', label: 'Sub-category', kind: 'values', get: c => c.subcategory },
    { key: 'domain', label: 'Domain', kind: 'multi', options: app.domains, get: c => c.domains },
    { key: 'years', label: 'Experience', kind: 'number', unit: 'yrs', num: c => c.years },
    { key: 'metro', label: 'Location (metro)', kind: 'values', get: c => c.metro },
    { key: 'workMode', label: 'Work mode', kind: 'values', options: ['Remote', 'Hybrid', 'Onsite'], get: c => c.workModes },
    { key: 'relocate', label: 'Open to relocate', kind: 'values', options: ['Yes', 'No', 'Specific'], get: c => c.relocate },
    { key: 'auth', label: 'Visa', kind: 'values', options: ['US citizen', 'Green card', 'H-1B', 'OPT', 'STEM OPT', 'Other'], get: authValue },
    { key: 'sponsorship', label: 'Needs sponsorship', kind: 'values', options: ['Yes', 'No'], get: c => yesNo(c, 'needsSponsorship') },
    { key: 'transfer', label: 'Needs transfer', kind: 'values', options: ['Yes', 'No'], get: c => yesNo(c, 'needsTransfer') },
    { key: 'pay', label: 'Pay expectation', kind: 'number', unit: '$k', num: c => payLow(c.pay) },
    { key: 'availability', label: 'Availability', kind: 'values', get: c => c.availability },
    { key: 'search', label: 'Search status', kind: 'values', options: ['Active', 'Passive'], get: c => c.searchStatus },
    { key: 'skills', label: 'Skills', kind: 'multi', get: c => includePredicted ? [...c.skills, ...c.predicted.map(p => p.name)] : c.skills },
    { key: 'completeness', label: 'Profile completeness', kind: 'number', unit: '%', num: c => c.completeness },
    { key: 'source', label: 'Source', kind: 'values', options: ['Outreach', 'Referral', 'Inbound'], get: c => c.source },
    { key: 'updated', label: 'Last updated', kind: 'values', get: c => c.updated },
    { key: 'resumeLabel', label: 'Resume label', kind: 'values', get: c => app.resumesFor(c.id).map(r => r.label) },
  ], [app, includePredicted])

  /* ---------- Wireframe presets ---------- */
  const prevWf = useRef(wf)
  useEffect(() => {
    if (prevWf.current !== wf) {
      prevWf.current = wf
      setFilters(presetFilters(wf)); setSelected([]); setAllMatching(false); setLimit(PAGE)
    }
    if (wf === 'bulk') setSelected(app.candidates.slice(0, 5).map(c => c.id))
    // Open the real popovers for the "open" states
    const t = window.setTimeout(() => {
      const buttons = Array.from(barRef.current?.querySelectorAll('button') ?? [])
      if (wf === 'picker') buttons.find(b => b.textContent?.trim() === 'Filter')?.click()
      if (wf === 'columns') buttons.find(b => b.textContent?.trim() === 'Columns')?.click()
    }, 60)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wf])

  const pool = wf === 'empty' ? [] : app.candidates
  const filtered = useMemo(() => applyFilters(pool, fields, filters), [pool, fields, filters])

  /* ---------- Columns ---------- */
  const sortValues: Record<string, (c: Candidate) => string | number> = {
    name: c => c.name, category: c => `${c.category} ${c.subcategory}`, years: c => c.years ?? -1, location: c => c.metro ?? '~',
    auth: c => workAuthShort(c.workAuth) ?? '~', completeness: c => c.completeness, domain: c => c.domains?.join(', ') ?? '~',
    pay: c => payLow(c.pay) ?? -1, availability: c => c.availability ?? '~', search: c => c.searchStatus ?? '~', skills: c => c.skills.length,
    source: c => c.source, resumes: c => app.resumesFor(c.id).length, updated: c => c.updated, take: c => app.takeFor(c.id)?.status ?? '~',
  }
  const sorted = useMemo(() => {
    if (!sort) return filtered
    const v = sortValues[sort.key]
    return v ? [...filtered].sort((a, b) => (v(a) > v(b) ? 1 : v(a) < v(b) ? -1 : 0) * sort.dir) : filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort])
  const shown = sorted.slice(0, limit)

  const missing = <NotCaptured />
  const allColumns: Record<string, Column<Candidate>> = {
    name: {
      key: 'name', header: 'Name', width: 'minmax(220px,1fr)', sortValue: sortValues.name,
      render: c => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar initials={c.initials} size={28} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{c.name}</div>
            <div className="max-w-[220px] truncate text-xs text-muted-foreground">{c.headline}</div>
          </div>
        </div>
      ),
    },
    category: { key: 'category', header: 'Category · sub', sortValue: sortValues.category, render: c => <span className="text-sm whitespace-nowrap">{c.category} <span className="text-muted-foreground">· {c.subcategory}</span></span> },
    years: { key: 'years', header: 'Years', align: 'right', sortValue: sortValues.years, render: c => c.years === null ? missing : <span className="font-mono text-xs tnum">{c.years}</span> },
    location: { key: 'location', header: 'Location · mode', sortValue: sortValues.location, render: c => c.metro ? <span className="text-sm whitespace-nowrap">{c.metro}{c.workModes && <span className="text-muted-foreground"> · {c.workModes[0].toLowerCase()}</span>}</span> : missing },
    auth: { key: 'auth', header: 'Work auth', sortValue: sortValues.auth, render: c => { const s = workAuthShort(c.workAuth); return s ? <span className="text-sm whitespace-nowrap">{s}</span> : missing } },
    completeness: { key: 'completeness', header: 'Profile', sortValue: sortValues.completeness, render: c => <CompletenessMeter compact value={c.completeness} /> },
    domain: { key: 'domain', header: 'Domain', sortValue: sortValues.domain, render: c => c.domains?.length ? <span className="text-sm whitespace-nowrap">{c.domains.join(', ')}</span> : missing },
    pay: { key: 'pay', header: 'Pay', sortValue: sortValues.pay, render: c => c.pay ? <span className="font-mono text-xs whitespace-nowrap tnum">{c.pay}</span> : missing },
    availability: { key: 'availability', header: 'Availability', sortValue: sortValues.availability, render: c => c.availability ? <span className="text-sm whitespace-nowrap">{c.availability}</span> : missing },
    search: { key: 'search', header: 'Search status', sortValue: sortValues.search, render: c => c.searchStatus ? <span className="text-sm">{c.searchStatus}</span> : missing },
    skills: {
      key: 'skills', header: 'Skills', sortValue: sortValues.skills,
      render: c => c.skills.length ? (
        <span className="flex items-center gap-1">{c.skills.slice(0, 2).map(s => <Tag key={s} tone="outline">{s}</Tag>)}{c.skills.length > 2 && <span className="font-mono text-[10px] text-muted-foreground">+{c.skills.length - 2}</span>}</span>
      ) : missing,
    },
    source: { key: 'source', header: 'Source', sortValue: sortValues.source, render: c => <span className="text-sm">{c.source}</span> },
    resumes: {
      key: 'resumes', header: 'Resumes', sortValue: sortValues.resumes,
      render: c => { const rs = app.resumesFor(c.id); return <span className="text-sm whitespace-nowrap">{rs.map(r => r.label).join(', ')}{rs.length > 1 && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground tnum">{rs.length}</span>}</span> },
    },
    updated: { key: 'updated', header: 'Updated', sortValue: sortValues.updated, render: c => <span className="text-xs whitespace-nowrap text-muted-foreground">{c.updated}</span> },
    take: { key: 'take', header: 'Take', sortValue: sortValues.take, render: c => <TakeMarker candidateId={c.id} /> },
  }
  const visibleKeys = ['name', ...visible.filter(k => k !== 'name' && allColumns[k])]
  const columns = visibleKeys.map(k => allColumns[k])

  /* ---------- Filters ---------- */
  const openColumnFilter = (fieldKey: string) => {
    const f = fields.find(x => x.key === fieldKey)
    if (!f) return
    if (!filters[fieldKey]) setFilters(s => ({ ...s, [fieldKey]: blankFilter(f, pool) }))
    setColFilter(fieldKey)
  }
  const closeColumnFilter = () => {
    if (colFilter && filters[colFilter] && isEmptyFilter(filters[colFilter])) {
      setFilters(s => { const n = { ...s }; delete n[colFilter]; return n })
    }
    setColFilter(null)
  }
  const colField = colFilter ? fields.find(f => f.key === colFilter) : undefined

  const columnMenu = (col: Column<Candidate>, s: { asc: () => void; desc: () => void }) => {
    const fk = COLUMN_FILTER[col.key]
    const locked = COLUMN_OPTIONS.find(o => o.key === col.key)?.locked
    return [
      { label: 'Sort A → Z', icon: <ArrowUp />, onSelect: () => { setSort({ key: col.key, dir: 1 }); s.asc() } },
      { label: 'Sort Z → A', icon: <ArrowDown />, onSelect: () => { setSort({ key: col.key, dir: -1 }); s.desc() } },
      { separator: true, label: '' },
      { label: 'Filter this column', icon: <Filter />, disabled: !fk, onSelect: () => fk && openColumnFilter(fk) },
      { label: 'Hide column', icon: <EyeOff />, disabled: !!locked, onSelect: () => setVisible(visible.filter(k => k !== col.key)) },
    ]
  }

  /** Which filter, removed alone, brings back the most people */
  const bestRemoval = useMemo(() => {
    const keys = Object.keys(filters)
    if (!keys.length || filtered.length) return null
    const scored = keys.map(k => ({ k, n: applyFilters(pool, fields, filters, k).length })).sort((a, b) => b.n - a.n)
    const top = scored[0]
    const f = fields.find(x => x.key === top.k)
    return top && f && top.n > 0 ? { key: top.k, label: chipText(f, filters[top.k]), n: top.n } : null
  }, [filters, filtered.length, pool, fields])

  /* ---------- Selection (P10) ---------- */
  const targetIds = allMatching ? filtered.map(c => c.id) : selected
  const clearSel = () => { setSelected([]); setAllMatching(false) }
  const copyList = (fmt: 'Masked' | 'Full') => {
    const list = filtered.filter(c => targetIds.includes(c.id))
    navigator.clipboard?.writeText(list.map(fmt === 'Masked' ? maskedLine : fullLine).join('\n')).catch(() => {})
    app.toast(`Copied ${list.length} candidate${list.length === 1 ? '' : 's'}${fmt === 'Full' ? ' (full)' : ''}`)
    app.log({ what: `Copied list · ${list.length} candidates · ${fmt.toLowerCase()}`, record: 'Candidates', recordHref: '/candidates', kind: 'Outputs' })
  }
  const generateMasked = () => {
    const ids = targetIds.slice(0, MASKED_BATCH_CAP)
    navigate(`/resumes/masked?candidates=${ids.join(',')}`)
  }

  /* ---------- Keyboard: Space on a focused row → preview ---------- */
  const onTableKey = (e: React.KeyboardEvent) => {
    if (e.key !== ' ') return
    const row = (e.target as HTMLElement).closest('tr[data-row-id]')
    const id = row?.getAttribute('data-row-id')
    if (id) { e.preventDefault(); setPreview(id) }
  }

  const loading = wf === 'loading'
  const anySel = selected.length > 0 || allMatching

  const filterBar = (
    <div ref={barRef}>
      <FilterBar fields={fields} rows={pool} state={filters} onChange={s => { setFilters(s); setLimit(PAGE) }} count={filtered.length}
        right={<>
          {filters.skills && <Switch checked={includePredicted} onChange={setIncludePredicted} label="Include predicted" />}
          <ColumnsMenu options={COLUMN_OPTIONS} visible={visibleKeys} onChange={k => setVisible(['name', ...k.filter(x => x !== 'name')])} onReset={reset} />
        </>} />
    </div>
  )

  return (
    <ScrollPage className="max-w-[1440px]">
      <PageHeader
        title={<span className="flex items-center gap-2">Candidates <ExampleMark /></span>}
        meta={<span className="tnum">Sample of {app.candidates.length} · {POOL_SIZE} in pool</span>}
        actions={<Button variant={anySel ? 'outline' : 'primary'} icon={<Plus />} onClick={() => navigate('/candidates/new')}>New candidate</Button>}
      />

      {wf === 'empty' ? (
        <div className="rounded-2xl border border-border bg-gray-100 p-1">
          <div className="rounded-xl border border-border bg-card">
            <EmptyState icon={<Users />} title="No candidates yet" body="Add a resume to build your pool."
              action={<Button variant="primary" icon={<Plus />} onClick={() => navigate('/candidates/new')}>New candidate</Button>} />
          </div>
        </div>
      ) : wf === 'phone' ? (
        <PhoneFrame>
          <div className="space-y-2 border-b border-border p-3">
            {filterBar}
          </div>
          <CardList rows={shown} onOpen={id => navigate(`/candidates/${id}`)} />
        </PhoneFrame>
      ) : (
        <div className="space-y-3">
          {filterBar}

          {anySel && (
            <SelectionBar count={selected.length} shown={shown.length} matching={filtered.length} allMatchingSelected={allMatching}
              onSelectAllShown={() => setSelected(shown.map(c => c.id))}
              onSelectAllMatching={() => { setSelected(filtered.map(c => c.id)); setAllMatching(true) }}
              onClear={clearSel}
              note={targetIds.length > MASKED_BATCH_CAP ? `Masked resumes run ${MASKED_BATCH_CAP} per batch.` : undefined}>
              <GatedButton perm="genMasked" variant="primary" icon={<FileText />} onClick={generateMasked}>Generate masked resumes</GatedButton>
              <Menu width={250}
                trigger={({ toggle }) => <Button variant="outline" icon={<Copy />} iconRight={<ChevronDown />} onClick={toggle}>Copy list</Button>}
                items={[
                  { label: 'Masked · no names', hint: 'Default', onSelect: () => copyList('Masked') },
                  app.can('copyFull')
                    ? { label: 'Full · names and email', onSelect: () => copyList('Full') }
                    : { label: `Full · ${whoCanText('copyFull')}`, disabled: true },
                ]} />
              <GatedButton perm="exportCsv" variant="outline" icon={<Download />}
                onClick={() => app.toast(`Exported ${targetIds.length} candidates to CSV`)}>Export CSV</GatedButton>
            </SelectionBar>
          )}

          {/* Wide: table · Narrow: two-line cards */}
          <div className="hidden md:block" onKeyDown={onTableKey}>
            <DataTable
              columns={columns} rows={shown} loading={loading}
              onRowClick={c => navigate(`/candidates/${c.id}`)}
              selectable quietCheckbox selected={selected}
              onSelectedChange={ids => { setSelected(ids); setAllMatching(false) }}
              columnMenu={columnMenu}
              empty={<NoResults best={bestRemoval} onRemove={k => setFilters(s => { const n = { ...s }; delete n[k]; return n })} onClear={() => setFilters({})} />}
            />
          </div>
          <div className="md:hidden">
            {filtered.length === 0
              ? <NoResults best={bestRemoval} onRemove={k => setFilters(s => { const n = { ...s }; delete n[k]; return n })} onClear={() => setFilters({})} />
              : <div className="overflow-hidden rounded-2xl border border-border bg-card"><CardList rows={shown} onOpen={id => navigate(`/candidates/${id}`)} /></div>}
          </div>

          {!loading && sorted.length > shown.length && (
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground tnum">Showing {shown.length} of {sorted.length}</span>
              <Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, sorted.length - shown.length)} more</Button>
            </div>
          )}
          {!loading && filtered.length > 0 && <p className="text-[11px] text-muted-foreground">Missing values read “Not captured” and stay in the list. Space previews the focused row.</p>}
        </div>
      )}

      {/* "Filter this column" — same filter state as the bar */}
      <Dialog open={!!colField} onClose={closeColumnFilter} width={340} title={colField ? `Filter: ${colField.label}` : ''}
        description="Same filter as the bar above. OR inside a column, AND across columns."
        footer={<Button variant="primary" onClick={closeColumnFilter}>Done</Button>}>
        {colField && filters[colField.key] && (
          <FilterPicker field={colField} rows={applyFilters(pool, fields, filters, colField.key)} value={filters[colField.key]}
            onChange={v => setFilters(s => ({ ...s, [colField.key]: v }))}
            onRemove={() => { setFilters(s => { const n = { ...s }; delete n[colField.key]; return n }); setColFilter(null) }} />
        )}
      </Dialog>

      <CandidatePreview open={!!preview} onClose={() => setPreview(null)} candidateId={preview} list={shown.map(r => r.id)} onNavigate={setPreview} />
    </ScrollPage>
  )
}

/* ---------- No results (never a dead end) ---------- */
function NoResults({ best, onRemove, onClear }: { best: { key: string; label: string; n: number } | null; onRemove: (k: string) => void; onClear: () => void }) {
  return (
    <EmptyState icon={<SearchX />} title="No candidates match these filters."
      body={best ? <>Removing <span className="font-medium text-foreground">{best.label}</span> brings back <span className="font-mono tnum">{best.n}</span>.</> : 'Try fewer filters.'}
      action={<div className="flex items-center gap-2">
        {best && <Button variant="outline" onClick={() => onRemove(best.key)}>Remove {best.label.split(':')[0].split(' ≥')[0]}</Button>}
        <Button variant="ghost" onClick={onClear}>Clear all</Button>
      </div>} />
  )
}

/* ---------- Phone (two-line cards) ---------- */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="eyebrow flex items-center gap-1.5 text-[10px] text-gray-1000"><Smartphone className="size-3.5" />Phone · 390px</span>
      <div className="w-full max-w-[390px] overflow-hidden rounded-[28px] border border-border bg-background shadow-custom">{children}</div>
    </div>
  )
}
function CardList({ rows, onOpen }: { rows: Candidate[]; onOpen: (id: string) => void }) {
  return (
    <ul>
      {rows.map(c => (
        <li key={c.id}>
          <button type="button" onClick={() => onOpen(c.id)} className="flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left last:border-0 hover:bg-muted/60">
            <Avatar initials={c.initials} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="truncate text-sm font-medium">{c.name}</span><span className="ml-auto"><CompletenessMeter compact value={c.completeness} /></span></div>
              <div className="truncate text-xs text-muted-foreground">
                {c.category} · {c.years ?? <span className="text-[#b45309]">Not captured</span>} yrs · {c.metro ?? <span className="text-[#b45309]">Not captured</span>} · {workAuthShort(c.workAuth) ?? <span className="text-[#b45309]">Not captured</span>}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
