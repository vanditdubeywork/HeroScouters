import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Briefcase, Building2, Check, ChevronDown, CircleCheck, Copy, Download, Eye, FileSpreadsheet, Layers, Link2, ListChecks,
  Lock, Mail, MoreHorizontal, Pause, Pencil, Plus, RefreshCw, SearchX,
  Shield, Sparkles, Table2, Upload, Webhook,
} from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import {
  BezelCard, Button, CompanyTypeTag, EmptyState, ExampleMark, Field, Input, Menu, PageHeader, PillTabs, Segmented, Select, Tag, cn,
} from '../components/ui'
import { Banner, DataTable, Dialog, FilterChip, InfoNote, type Column } from '../components/hs'
import { ColumnsMenu, SelectionBar, useColumnPrefs, useListSelection } from '../components/v3'
import { CreateGmailDraftsDialog, RerunDialog } from './Dialogs'
import { useApp, useWireframeState } from '../store/AppStore'
import { CATEGORIES, type Role, type RoleStatus } from '../data/types'

/* ==========================================================================
   S-02 · Roles list (home) — SaaS action-driven table + Bulk Mask & Masked Links
   ========================================================================== */

type StatusTab = RoleStatus | 'All'
type TypeFilter = 'Client' | 'Prospect' | null

const WF_STATES = [
  { id: 'default', label: 'Default (live)' },
  { id: 'bulk-upload', label: 'Bulk role upload' },
  { id: 'empty', label: 'Empty' },
  { id: 'loading', label: 'Loading' },
  { id: 'filtered', label: 'Filtered empty' },
  { id: 'error', label: 'Error' },
]

const ROLE_COL_SPECS = [
  { key: 'title', label: 'Role & requirements', defaultVisible: true, locked: true },
  { key: 'company', label: 'Company & industry', defaultVisible: true },
  { key: 'pipeline', label: 'Shortlist & masked links', defaultVisible: true },
  { key: 'latest', label: 'Latest update', defaultVisible: true },
  { key: 'cat', label: 'Category (separate col)', defaultVisible: false },
]

/** Relative time → minutes, so "needs action first, then most recent" can sort */
export function agoMinutes(s: string): number {
  const t = s.toLowerCase()
  if (t.includes('just now')) return 0
  const n = parseInt(t, 10) || 1
  if (t.includes('min')) return n
  if (/\dh\b/.test(t) || t.includes('hour')) return n * 60
  if (t.includes('today')) return 120
  if (t.includes('yesterday')) return 1440
  if (t.includes('day')) return n * 1440
  if (t.includes('week')) return n * 10080
  if (t.includes('month')) return n * 43200
  return 999999
}

const CITY_SHORT: Record<string, string> = { 'San Francisco': 'SF', 'New York': 'NYC' }
export function mustHavesSummary(r: Role) {
  const city = r.location.split(',')[0]
  const loc = r.workMode === 'Remote' ? 'remote' : `${CITY_SHORT[city] ?? city} ${r.workMode.toLowerCase()}`
  const yrs = r.maxYears ? `${r.minYears}–${r.maxYears} yrs${r.yearsFlexibility === 'Flexible' ? ' (±1)' : ''}` : `${r.minYears}+ yrs`
  const pay = r.fixedPayMin && r.fixedPayMax ? `$${r.fixedPayMin}k–$${r.fixedPayMax}k${r.variablePay ? ` + $${r.variablePay}k var` : ''}` : ''
  return [yrs, loc, pay].filter(Boolean).join(' · ')
}

/** v0.3 · T2 status vocabulary: Not scored · Scored · Out of date */
export function matchStatusLabel(r: Role) {
  return r.matchStatus === 'out-of-date' ? 'Out of date' : r.matchStatus === 'not-run' ? 'Not scored' : 'Scored'
}

const needsAction = (r: Role) => r.matchStatus === 'out-of-date' || r.matchStatus === 'not-run' || (r.scoredCount ?? 0) === 0

export function RolesList() {
  const app = useApp()
  const { roles, matches, outputs } = app
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const attention = params.get('filter') === 'attention'
  const [wf, setWf] = useWireframeState('S-02', 'Roles list', WF_STATES)

  const [tab, setTab] = useState<StatusTab>('Open')
  const [type, setType] = useState<TypeFilter>(null)
  const [category, setCategory] = useState('all')
  const [q, setQ] = useState('')
  const [rerunRole, setRerunRole] = useState<Role | null>(null)
  const [pitchesOpen, setPitchesOpen] = useState(false)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(() => params.get('bulk') === '1')
  const colPrefs = useColumnPrefs('roles-v4-saas-no-next', ROLE_COL_SPECS.filter(s => s.defaultVisible).map(s => s.key))

  useEffect(() => {
    if (wf === 'bulk-upload') setBulkUploadOpen(true)
  }, [wf])

  useTopBar([{ label: 'Roles' }])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (rerunRole || pitchesOpen) return
      if (document.querySelector('[role="dialog"]')) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        navigate('/roles/new')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, rerunRole, pitchesOpen])

  const openCount = roles.filter(r => r.status === 'Open').length
  const shortlistCount = (r: Role) => {
    const own = matches.filter(m => m.roleId === r.id)
    return own.length ? own.filter(m => m.status === 'shortlisted').length : r.shortlisted
  }
  const maskedCount = (r: Role) => {
    const explicit = outputs.filter(o => o.type === 'Masked' && o.roleId === r.id).length
    return explicit || Math.max(1, shortlistCount(r))
  }

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return roles
      .filter(r => tab === 'All' || r.status === tab)
      .filter(r => !type || r.companyType === type)
      .filter(r => category === 'all' || r.category === category)
      .filter(r => !needle || `${r.title} ${r.company} ${r.subcategory}`.toLowerCase().includes(needle))
      .filter(r => !attention || needsAction(r))
      .sort((a, b) => (Number(needsAction(b)) - Number(needsAction(a))) || agoMinutes(a.latestUpdate?.when ?? a.updated) - agoMinutes(b.latestUpdate?.when ?? b.updated))
  }, [roles, tab, type, category, q, attention])

  const isEmpty = wf === 'empty'
  const tableRows = wf === 'filtered' || wf === 'error' ? [] : rows
  const sel = useListSelection(tableRows.map(r => r.id))
  const selectedRoles = useMemo(() => tableRows.filter(r => sel.selected.includes(r.id)), [tableRows, sel.selected])
  const prospectIds = useMemo(() => selectedRoles.filter(r => r.companyType === 'Prospect').map(r => r.id), [selectedRoles])

  const clearFilters = () => {
    setType(null); setCategory('all'); setQ(''); setTab('Open')
    if (attention) setParams({})
    if (wf === 'filtered') setWf('default')
  }

  const setStatus = (r: Role, status: RoleStatus) => {
    app.updateRole(r.id, { status, updated: 'Just now' })
    app.log({ what: `Status changed to ${status}`, record: `${r.title} — ${r.company}`, recordHref: `/roles/${r.id}`, kind: 'Roles', before: r.status, after: status })
    app.toast(status === 'On hold' ? `Put ${r.title} on hold` : `Closed ${r.title}`)
  }
  const duplicate = (r: Role) => {
    const copy: Role = { ...r, id: `${r.id}-copy-${Date.now().toString(36)}`, title: `${r.title} (copy)`, matchStatus: 'not-run', outOfDateReason: undefined, shortlisted: 0, jdVersion: 1, updated: 'Just now', status: 'Open', scoredCount: 0, aiScoresUsed: 0, latestUpdate: { text: `Duplicated from ${r.title}`, who: app.currentUser.displayName.split(' ')[0], when: 'Just now' } }
    app.addRole(copy)
    app.log({ what: `Duplicated role from ${r.title} — ${r.company}`, record: `${copy.title} — ${copy.company}`, recordHref: `/roles/${copy.id}`, kind: 'Roles' })
    app.toast(`Duplicated ${r.title}`, { action: { label: 'Edit', onClick: () => navigate(`/roles/${copy.id}/edit`) } })
  }

  const copyOutreachRows = () => {
    const today = new Date().toISOString().slice(0, 10)
    const tsv = selectedRoles
      .map(r => [
        r.company,
        r.title,
        r.hiringContact?.email ?? r.hiringContact?.name ?? 'Hiring team',
        `${shortlistCount(r) || r.suggestedCount || 1} masked pitch profile(s) · https://heroscouter.com/p/${r.id}`,
        today,
      ].join('\t'))
      .join('\n')
    navigator.clipboard?.writeText(tsv).catch(() => {})
    app.toast(`Copied ${sel.selected.length} rows for outreach sheet`)
  }

  const lastWhen = (r: Role) => agoMinutes(r.latestUpdate?.when ?? r.updated)
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  const allColumns: Column<Role>[] = [
    {
      key: 'title',
      header: 'Role & Requirements',
      icon: <Briefcase className="size-3" />,
      sortable: true,
      sortValue: r => r.title,
      render: r => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              title={`Status: ${r.status}`}
              className={cn(
                'size-2 shrink-0 rounded-full',
                r.status === 'Open' ? 'bg-emerald-400' : r.status === 'On hold' ? 'bg-amber-400' : 'bg-rose-400',
              )}
            />
            <span className="max-w-[175px] truncate font-semibold text-foreground">{r.title}</span>
            <span className="inline-flex h-4.5 items-center rounded-xs border border-border bg-secondary px-1.5 text-[10px] font-medium text-gray-1100">
              {r.category}
            </span>
            {r.status !== 'Open' && (
              <span
                className={cn(
                  'inline-flex h-4.5 items-center rounded-xs border px-1.5 font-mono text-[9.5px] font-medium',
                  r.status === 'On hold'
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                    : 'border-rose-500/40 bg-rose-500/15 text-rose-300',
                )}
              >
                {r.status}
              </span>
            )}
          </div>
          <div className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground" title={mustHavesSummary(r)}>
            {mustHavesSummary(r)}
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company & Industry',
      icon: <Building2 className="size-3" />,
      sortable: true,
      sortValue: r => r.company,
      render: r => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="max-w-[125px] truncate font-medium text-foreground">{r.company}</span>
            <CompanyTypeTag type={r.companyType} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 max-w-[190px] truncate text-[11px] text-muted-foreground">
            <span>{r.industry ?? r.subcategory}</span>
            {r.industryRule === 'eliminates' && (
              <span className="rounded border border-rose-500/40 bg-rose-500/10 px-1 font-mono text-[9px] font-semibold text-rose-300">
                Req
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'pipeline',
      header: 'Shortlist & Masked Links',
      icon: <Shield className="size-3" />,
      sortable: true,
      sortValue: r => shortlistCount(r),
      render: r => {
        const sc = shortlistCount(r)
        const mc = maskedCount(r)
        return (
          <div className="flex flex-wrap items-center gap-1.5" onClick={stop}>
            <button
              type="button"
              onClick={() => navigate(`/roles/${r.id}?tab=shortlist`)}
              className={cn(
                'inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-[11px] transition-colors hover:border-gray-700 tnum',
                sc ? 'border-border bg-secondary text-foreground' : 'border-border bg-background text-muted-foreground',
              )}
              title={`${sc} shortlisted candidates`}
            >
              <ListChecks className="size-3 text-muted-foreground" />
              <span>{sc} shortlisted</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/resumes/masked-view?role=${r.id}`)}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground transition-colors hover:border-gray-700 hover:bg-secondary"
              title="Open shareable Masked Role Links view"
            >
              <Shield className="size-3 text-success" />
              <span className="font-mono tnum">{mc}</span>
              <span>masked</span>
            </button>
          </div>
        )
      },
    },
    {
      key: 'latest',
      header: 'Latest Update',
      sortable: true,
      sortValue: r => lastWhen(r),
      render: r =>
        r.latestUpdate ? (
          <div className="min-w-0" title={`${r.latestUpdate.text} · ${r.latestUpdate.who} · ${r.latestUpdate.when}`}>
            <div className="max-w-[240px] truncate text-xs text-foreground">{r.latestUpdate.text}</div>
            <div className="mt-0.5 max-w-[240px] truncate font-mono text-[11px] text-muted-foreground tnum">
              {r.latestUpdate.who} · {r.latestUpdate.when}
            </div>
          </div>
        ) : (
          <span className="font-mono text-xs text-muted-foreground tnum">Updated {r.updated}</span>
        ),
    },
    {
      key: 'cat',
      header: 'Category',
      width: '140px',
      sortable: true,
      sortValue: r => r.category,
      render: r => (
        <div className="min-w-0">
          <span className="inline-flex h-5 items-center rounded-sm border border-border bg-secondary px-1.5 text-[11px] font-medium text-foreground">
            {r.category}
          </span>
          <div className="mt-0.5 max-w-[130px] truncate text-xs text-muted-foreground">{r.subcategory}</div>
        </div>
      ),
    },
  ]

  const visibleColumns = useMemo(
    () => allColumns.filter(c => colPrefs.visible.includes(c.key)),
    [allColumns, colPrefs.visible], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const rowActions = (r: Role) => (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Preview masked links for ${r.title}`}
        title="Preview client masked links"
        icon={<Eye />}
        onClick={() => navigate(`/resumes/masked-view?role=${r.id}`)}
      />
      <Menu
        width={210}
        trigger={({ toggle }) => (
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${r.title}`} onClick={toggle} icon={<MoreHorizontal />} />
        )}
        items={[
          { label: 'View masked role links', icon: <Eye />, onSelect: () => navigate(`/resumes/masked-view?role=${r.id}`) },
          { separator: true, label: '' },
          { label: 'Edit role', icon: <Pencil />, onSelect: () => navigate(`/roles/${r.id}/edit`) },
          { label: 'Put on hold', icon: <Pause />, disabled: r.status === 'On hold', onSelect: () => setStatus(r, 'On hold') },
          { label: 'Close role', icon: <Lock />, disabled: r.status === 'Closed', onSelect: () => setStatus(r, 'Closed') },
          { separator: true, label: '' },
          { label: 'Duplicate role', icon: <Copy />, onSelect: () => duplicate(r) },
        ]}
      />
    </>
  )

  const tabCount = (t: StatusTab) => roles.filter(r => t === 'All' || r.status === t).length
  const filterDesc = () => {
    const kind = type ? `${type.toLowerCase()} ` : ''
    const tabWord = tab === 'All' || tab === 'Open' ? '' : `${tab.toLowerCase()} `
    const cat = category !== 'all' ? ` in ${category}` : ''
    const search = q.trim() ? ` matching “${q.trim()}”` : ''
    return `No ${tabWord}${kind}roles${cat}${search}.`
  }

  return (
    <ScrollPage className="max-w-[1440px]" viewportLocked={!isEmpty}>
      <PageHeader
        title={<span className="flex items-center gap-2">Roles <ExampleMark /></span>}
        meta={<span className="tnum">{isEmpty ? 0 : openCount} open · {outputs.filter(o => o.type === 'Masked').length} masked links</span>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" icon={<FileSpreadsheet />} onClick={() => setBulkUploadOpen(true)}>
              Bulk upload roles
            </Button>
            <div className="inline-flex items-center">
              <Button
                variant="primary"
                icon={<Plus />}
                kbd="N"
                onClick={() => navigate('/roles/new')}
                className="rounded-r-none border-r border-background/20"
              >
                New role
              </Button>
              <Menu
                width={250}
                trigger={({ toggle }) => (
                  <Button
                    variant="primary"
                    size="icon"
                    aria-label="New role options"
                    onClick={toggle}
                    className="rounded-l-none px-2"
                    icon={<ChevronDown className="size-3.5" />}
                  />
                )}
                items={[
                  { label: 'Add single role (AI or manual)', icon: <Plus />, hint: 'N', onSelect: () => navigate('/roles/new') },
                  { label: 'Upload roles in bulk (Sheet / API)', icon: <FileSpreadsheet />, onSelect: () => setBulkUploadOpen(true) },
                ]}
              />
            </div>
          </div>
        }
      />

      {isEmpty ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState icon={<Briefcase />} title="No roles yet" body="No roles yet. Add a JD to start matching your candidate pool."
            action={<Button icon={<Plus />} onClick={() => navigate('/roles/new')}>New role</Button>} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          {wf === 'error' && (
            <Banner variant="error" actions={<Button onClick={() => setWf('default')}>Try again</Button>}>
              Couldn't load roles. Check your connection and try again.
            </Banner>
          )}
          {attention && wf === 'default' && (
            <Banner variant="warning" onDismiss={() => setParams({})}>
              Showing roles that need action: matches out of date or not scored yet.
            </Banner>
          )}

          {sel.selected.length > 0 ? (
            <SelectionBar
              count={sel.selected.length}
              shown={tableRows.length}
              onSelectAllShown={() => sel.selectAll(tableRows.map(r => r.id))}
              onClear={sel.clear}
              note={prospectIds.length > 0 && prospectIds.length < sel.selected.length ? `${prospectIds.length} prospect role(s)` : undefined}
            >
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw />}
                onClick={() => {
                  sel.selected.forEach(rid => {
                    const r = app.role(rid)
                    if (!r) return
                    if (r.matchStatus === 'not-run') app.findMatches(rid)
                    else app.rerun(rid)
                  })
                  app.toast(`Scanned / reran matches for ${sel.selected.length} role${sel.selected.length === 1 ? '' : 's'}`)
                  sel.clear()
                }}
              >
                Bulk rerun / scan ({sel.selected.length})
              </Button>
              <Button variant="outline" size="sm" icon={<Mail />} onClick={() => setPitchesOpen(true)}>
                Prepare pitches ({prospectIds.length || sel.selected.length})
              </Button>
              <Button variant="outline" size="sm" icon={<Table2 />} onClick={copyOutreachRows}>
                Copy rows for outreach sheet
              </Button>
              <Menu
                width={200}
                trigger={
                  <Button variant="ghost" size="sm" icon={<Layers />}>
                    Bulk status ▾
                  </Button>
                }
                items={[
                  {
                    label: `Set Open (${sel.selected.length})`,
                    icon: <CircleCheck />,
                    onSelect: () => {
                      sel.selected.forEach(rid => app.updateRole(rid, { status: 'Open' }))
                      app.toast(`Set ${sel.selected.length} roles to Open`)
                      sel.clear()
                    },
                  },
                  {
                    label: `Put on hold (${sel.selected.length})`,
                    icon: <Pause />,
                    onSelect: () => {
                      sel.selected.forEach(rid => app.updateRole(rid, { status: 'On hold' }))
                      app.toast(`Put ${sel.selected.length} roles on hold`)
                      sel.clear()
                    },
                  },
                  {
                    label: `Close roles (${sel.selected.length})`,
                    icon: <Lock />,
                    danger: true,
                    onSelect: () => {
                      sel.selected.forEach(rid => app.updateRole(rid, { status: 'Closed' }))
                      app.toast(`Closed ${sel.selected.length} roles`)
                      sel.clear()
                    },
                  },
                ]}
              />
            </SelectionBar>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PillTabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'Open', label: 'Open', icon: <CircleCheck />, count: tabCount('Open'), tone: 'success' },
                  { value: 'On hold', label: 'On hold', icon: <Pause />, count: tabCount('On hold'), tone: 'warning' },
                  { value: 'Closed', label: 'Closed', icon: <Lock />, count: tabCount('Closed'), tone: 'danger' },
                  { value: 'All', label: 'All', icon: <Layers />, count: tabCount('All'), tone: 'info' },
                ]}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {tableRows.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sel.selectAll(tableRows.map(r => r.id))}
                  >
                    Select all ({tableRows.length})
                  </Button>
                )}
                <FilterChip
                  active={type === 'Client'}
                  icon={<Building2 />}
                  onClick={() => setType(t => (t === 'Client' ? null : 'Client'))}
                >
                  Client
                </FilterChip>
                <FilterChip
                  active={type === 'Prospect'}
                  icon={<Sparkles />}
                  onClick={() => setType(t => (t === 'Prospect' ? null : 'Prospect'))}
                >
                  Prospect
                </FilterChip>
                <Select
                  aria-label="Category"
                  value={category}
                  onChange={setCategory}
                  options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
                />
                <div className="w-40">
                  <Input aria-label="Search roles" value={q} onChange={e => setQ(e.target.value)} placeholder="Search roles…" />
                </div>
                <ColumnsMenu
                  options={ROLE_COL_SPECS}
                  visible={colPrefs.visible}
                  onChange={colPrefs.setVisible}
                  onReset={colPrefs.reset}
                />
              </div>
            </div>
          )}

          <DataTable
            caption="Roles list"
            columns={visibleColumns}
            rows={tableRows}
            loading={wf === 'loading'}
            selectable
            quietCheckbox
            selected={sel.selected}
            onSelectedChange={sel.setSelected}
            onRowClick={r => navigate(`/roles/${r.id}`)}
            rowActions={rowActions}
            empty={
              <EmptyState
                icon={<SearchX />}
                title="No roles match these filters"
                body={filterDesc()}
                action={<Button onClick={clearFilters}>Clear filters</Button>}
              />
            }
          />
        </div>
      )}

      <RerunDialog
        open={!!rerunRole}
        onClose={() => setRerunRole(null)}
        roleLabel={rerunRole ? `${rerunRole.title} — ${rerunRole.company}` : ''}
        count={rerunRole?.scoredCount || rerunRole?.passCount || 0}
        onConfirm={() => {
          if (!rerunRole) return
          app.rerun(rerunRole.id)
          navigate(`/roles/${rerunRole.id}?tab=matches&reran=1`)
        }}
      />

      <CreateGmailDraftsDialog
        open={pitchesOpen}
        onClose={() => setPitchesOpen(false)}
        roleIds={prospectIds.length > 0 ? prospectIds : sel.selected}
        mode="prospect-pitches"
      />

      <BulkRoleUploadDialog
        open={bulkUploadOpen}
        onClose={() => {
          setBulkUploadOpen(false)
          if (wf === 'bulk-upload') setWf('default')
        }}
      />
    </ScrollPage>
  )
}

/* ==========================================================================
   Bulk Role Upload Dialog (Item 10 · Sheet template + API connection later)
   ========================================================================== */

const BULK_ROLE_COLUMNS = [
  { col: 'Company', req: true, example: 'Apex Cloud' },
  { col: 'Company type', req: true, example: 'Client | Prospect' },
  { col: 'Company industry', req: true, example: 'Developer Tools / Cloud' },
  { col: 'Same-industry rule', req: false, example: 'Green flag (default) | Requirement' },
  { col: 'Role title', req: true, example: 'Senior DevOps Engineer' },
  { col: 'Category', req: true, example: 'Engineering' },
  { col: 'Years min', req: true, example: '5' },
  { col: 'Years max', req: true, example: '8' },
  { col: 'Years flexibility', req: false, example: 'Flexible (±1 yr) | Rigid' },
  { col: 'Location & Work mode', req: true, example: 'Austin, TX · Hybrid' },
  { col: 'Relocation supported', req: true, example: 'Yes | No | Unknown' },
  { col: 'Accepted visas', req: false, example: 'H-1B, STEM OPT, TN, O-1' },
  { col: 'Visa support', req: false, example: 'Transfer & sponsorship | Transfer only | No' },
  { col: 'Fixed pay min ($k)', req: true, example: '165' },
  { col: 'Fixed pay max ($k)', req: true, example: '195' },
  { col: 'Variable pay ($k)', req: false, example: '25' },
  { col: 'Requirements (rules out)', req: true, example: 'Kubernetes; AWS; 5+ yrs infra' },
  { col: 'Green flags (raises score)', req: false, example: 'Terraform; SOC2 / FedRAMP' },
  { col: 'Red flags (lowers score)', req: false, example: 'Avg tenure < 12 months' },
  { col: 'JD link or text', req: false, example: 'https://jobs.ashbyhq.com/apex/...' },
]

const SAMPLE_BULK_ROLES: Array<{
  company: string
  companyType: 'Client' | 'Prospect'
  industry: string
  industryRule: 'improves' | 'eliminates'
  title: string
  category: Role['category']
  subcategory: string
  minYears: number
  maxYears: number
  yearsFlexibility: 'Flexible' | 'Rigid'
  location: string
  workMode: Role['workMode']
  relocationSupported: 'Yes' | 'No' | 'Unknown'
  acceptedVisas: string[]
  visaSupport: Role['visaSupport']
  fixedPayMin: number
  fixedPayMax: number
  variablePay: number
  mustSkills: string[]
  niceSkills: string[]
}> = [
  {
    company: 'Apex Cloud',
    companyType: 'Client',
    industry: 'DevTools / Infrastructure',
    industryRule: 'improves',
    title: 'Senior DevOps Engineer',
    category: 'Engineering',
    subcategory: 'DevOps / SRE',
    minYears: 5,
    maxYears: 8,
    yearsFlexibility: 'Flexible',
    location: 'Austin, TX',
    workMode: 'Hybrid',
    relocationSupported: 'Yes',
    acceptedVisas: ['H-1B', 'STEM OPT', 'TN', 'O-1'],
    visaSupport: 'Transfer & sponsorship',
    fixedPayMin: 165,
    fixedPayMax: 195,
    variablePay: 25,
    mustSkills: ['Kubernetes', 'AWS', 'Terraform'],
    niceSkills: ['Go', 'Datadog'],
  },
  {
    company: 'Veloce AI',
    companyType: 'Prospect',
    industry: 'AI / ML',
    industryRule: 'improves',
    title: 'Staff ML Platform Engineer',
    category: 'Engineering',
    subcategory: 'AI / ML',
    minYears: 6,
    maxYears: 10,
    yearsFlexibility: 'Flexible',
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    relocationSupported: 'Yes',
    acceptedVisas: ['H-1B', 'STEM OPT', 'F-1 / OPT', 'TN', 'O-1', 'L-1', 'E-3'],
    visaSupport: 'Transfer & sponsorship',
    fixedPayMin: 190,
    fixedPayMax: 230,
    variablePay: 35,
    mustSkills: ['PyTorch', 'CUDA / Ray', 'Python'],
    niceSkills: ['Rust', 'vLLM'],
  },
  {
    company: 'CivicShield Gov',
    companyType: 'Client',
    industry: 'Government / Defense',
    industryRule: 'eliminates',
    title: 'Principal Security Architect',
    category: 'Engineering',
    subcategory: 'Security',
    minYears: 7,
    maxYears: 12,
    yearsFlexibility: 'Rigid',
    location: 'Washington, DC',
    workMode: 'Onsite',
    relocationSupported: 'No',
    acceptedVisas: [],
    visaSupport: 'None',
    fixedPayMin: 180,
    fixedPayMax: 215,
    variablePay: 20,
    mustSkills: ['FedRAMP', 'Zero Trust', 'IAM'],
    niceSkills: ['NIST 800-53', 'CloudTrail'],
  },
]

function BulkRoleUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp()
  const [sourceTab, setSourceTab] = useState<'sheet' | 'api'>('sheet')
  const [sheetUrl, setSheetUrl] = useState('')
  const [sheetLoaded, setSheetLoaded] = useState(true)

  const downloadTemplate = () => {
    const header = BULK_ROLE_COLUMNS.map(c => `"${c.col}"`).join(',')
    const row1 = BULK_ROLE_COLUMNS.map(c => `"${c.example}"`).join(',')
    const csv = `${header}\n${row1}\n`
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'heroscouter-roles-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      /* ignore in headless */
    }
    app.toast('Downloaded heroscouter-roles-template.csv')
  }

  const handleImportRoles = () => {
    SAMPLE_BULK_ROLES.forEach((s, idx) => {
      const id = `bulk-role-${Date.now().toString(36)}-${idx}`
      const newRole: Role = {
        id,
        title: s.title,
        company: s.company,
        companyType: s.companyType,
        companySource: 'Client JD',
        industry: s.industry,
        industryRule: s.industryRule,
        category: s.category,
        subcategory: s.subcategory,
        seniority: 'Senior',
        status: 'Open',
        minYears: s.minYears,
        maxYears: s.maxYears,
        yearsFlexibility: s.yearsFlexibility,
        location: s.location,
        workMode: s.workMode,
        relocationAccepted: s.relocationSupported === 'Yes' ? true : s.relocationSupported === 'No' ? false : null,
        relocationSupported: s.relocationSupported,
        sponsorship: s.visaSupport === 'None' ? 'No' : 'Yes',
        transfer: s.visaSupport === 'None' ? 'No' : 'Yes',
        acceptedVisas: s.acceptedVisas,
        visaSupport: s.visaSupport,
        mustSkills: s.mustSkills,
        niceSkills: s.niceSkills,
        pay: `$${s.fixedPayMin}k–$${s.fixedPayMax}k + $${s.variablePay}k var`,
        fixedPayMin: s.fixedPayMin,
        fixedPayMax: s.fixedPayMax,
        variablePay: s.variablePay,
        whatGood: `Strong ${s.industry} track record.`,
        research: `Imported via bulk sheet template.`,
        interview: '3 rounds (Recruiter screen → Technical → Hiring Manager).',
        jdVersion: 1,
        matchStatus: 'not-run',
        shortlisted: 0,
        passCount: 24 + idx * 7,
        scoredCount: 0,
        aiScoresUsed: 0,
        updated: 'Just now',
        latestUpdate: {
          text: 'Imported via bulk role sheet template',
          who: app.currentUser.displayName.split(' ')[0],
          when: 'Just now',
        },
        jdText: `${s.title} at ${s.company} (${s.industry}). Requirements: ${s.mustSkills.join(', ')}.`,
      }
      app.addRole(newRole)
    })
    app.log({
      what: `Bulk uploaded ${SAMPLE_BULK_ROLES.length} roles from sheet template`,
      record: `${SAMPLE_BULK_ROLES.map(r => r.company).join(', ')}`,
      recordHref: '/roles',
      kind: 'Roles',
    })
    app.toast(`Imported ${SAMPLE_BULK_ROLES.length} roles in bulk`)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Bulk upload roles"
      description="Import multiple roles at once using our standardized sheet template (CSV / Google Sheet), or connect an ATS / API webhook."
      width={720}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {sourceTab === 'sheet' ? (
            <Button variant="primary" icon={<Upload />} onClick={handleImportRoles}>
              Upload {SAMPLE_BULK_ROLES.length} roles in bulk
            </Button>
          ) : (
            <Button variant="outline" onClick={() => { app.toast('Saved API webhook notification preference'); onClose() }}>
              Notify when ATS sync is live
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            aria-label="Bulk role upload source"
            value={sourceTab}
            onChange={setSourceTab}
            options={[
              { value: 'sheet', label: 'Sheet template (CSV / Google Sheet)' },
              { value: 'api', label: 'API / ATS connection (Later)' },
            ]}
          />
          {sourceTab === 'sheet' && (
            <Button variant="outline" size="sm" icon={<Download />} onClick={downloadTemplate}>
              Download sheet template (.csv)
            </Button>
          )}
        </div>

        {sourceTab === 'sheet' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="eyebrow">Required & optional template columns ({BULK_ROLE_COLUMNS.length})</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Fixed & Variable pay stored as numbers ($k) · Visa list + sponsorship support
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BULK_ROLE_COLUMNS.map(c => (
                  <span
                    key={c.col}
                    title={`Example: ${c.example}`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]',
                      c.req
                        ? 'border-foreground/25 bg-background font-medium text-foreground'
                        : 'border-border bg-background/60 text-muted-foreground',
                    )}
                  >
                    <span>{c.col}</span>
                    {c.req && <span className="font-mono text-[9px] text-emerald-400">req</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setSheetLoaded(true); app.toast('Loaded 3 roles from heroscouter-roles-q4.csv') }}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-700 bg-secondary/40 p-4 text-center transition-colors hover:border-foreground hover:bg-secondary cursor-pointer"
              >
                <FileSpreadsheet className="size-5 text-foreground" />
                <div className="text-xs font-medium text-foreground">Upload filled CSV / XLSX sheet</div>
                <div className="text-[11px] text-muted-foreground">Click to load sample 3-role batch · max 100 roles/run</div>
              </button>

              <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2">
                <Field label="Or link a Google Sheet (set template format)" hint="Anyone with link = Viewer">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={sheetUrl}
                      onChange={e => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1x9..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Link2 />}
                      onClick={() => {
                        setSheetLoaded(true)
                        app.toast('Validated columns from Google Sheet')
                      }}
                    >
                      Validate
                    </Button>
                  </div>
                </Field>
              </div>
            </div>

            {sheetLoaded && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Ready to import ({SAMPLE_BULK_ROLES.length} roles validated)</span>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="size-3.5" /> All required columns mapped
                  </span>
                </div>
                <div className="divide-y divide-border rounded-xl border border-border bg-background overflow-hidden">
                  {SAMPLE_BULK_ROLES.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-foreground">{r.title}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="font-medium text-foreground">{r.company}</span>
                          <CompanyTypeTag type={r.companyType} />
                          <Tag>{r.industry}{r.industryRule === 'eliminates' ? ' (Req)' : ' (Green flag)'}</Tag>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {r.minYears}–{r.maxYears} yrs ({r.yearsFlexibility}) · {r.location} ({r.workMode}) · Reloc: {r.relocationSupported} · Visas: {r.acceptedVisas.length ? `${r.acceptedVisas.length} accepted (${r.visaSupport})` : 'None'}
                        </div>
                      </div>
                      <div className="font-mono text-[11px] text-foreground tnum">
                        ${r.fixedPayMin}k–${r.fixedPayMax}k + ${r.variablePay}k var
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <InfoNote>
              Direct ATS / API role sync is planned for phase 2. Use the <span className="font-medium text-foreground">Sheet template</span> tab today to bulk-import roles with full Requirements, Green flags, Red flags, Visa checkboxes, and numeric Fixed/Variable pay.
            </InfoNote>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { name: 'Ashby ATS Sync', desc: 'Auto-pull open roles, hiring manager notes & comp bands via Ashby API key.' },
                { name: 'Greenhouse Harvest API', desc: 'Sync active requisitions, scorecards, and custom JD fields.' },
                { name: 'Lever Postings API', desc: 'Import open postings and stage-1 requirements automatically.' },
                { name: 'REST Webhook / JSON Endpoint', desc: 'POST /api/v1/roles/bulk with the standardized role schema.' },
              ].map(conn => (
                <div key={conn.name} className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-secondary/30 p-3.5">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Webhook className="size-3.5 text-muted-foreground" />
                        {conn.name}
                      </span>
                      <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        Later · API
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{conn.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
