import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Briefcase, CircleCheck, Copy, Lock, Mail, MoreHorizontal, Pause, Pencil, Plus, RefreshCw, Search, SearchX, Send, Sparkles, Table2 } from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import {
  Button, CompanyTypeTag, EmptyState, ExampleMark, Input, Menu, PageHeader, PillTabs, Select, cn,
} from '../components/ui'
import { Banner, DataTable, FilterChip, type Column } from '../components/hs'
import { SelectionBar, useListSelection } from '../components/v3'
import { CreateGmailDraftsDialog, RerunDialog } from './Dialogs'
import { useApp, useWireframeState } from '../store/AppStore'
import { CATEGORIES, type Role, type RoleStatus } from '../data/types'

/* ==========================================================================
   S-02 · Roles list (home) — see every role, spot what needs action, open one.
   ========================================================================== */

type StatusTab = RoleStatus | 'All'
type TypeFilter = 'Client' | 'Prospect' | null

const WF_STATES = [
  { id: 'default', label: 'Default (live)' },
  { id: 'empty', label: 'Empty' },
  { id: 'loading', label: 'Loading' },
  { id: 'filtered', label: 'Filtered empty' },
  { id: 'error', label: 'Error' },
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
  const auth = r.sponsorship === 'No' ? 'no sponsorship' : r.sponsorship === 'Yes' ? 'sponsorship offered' : 'sponsorship unknown'
  return `${r.minYears}+ yrs · ${loc} · ${auth}`
}

/** v0.3 · T2 status vocabulary: Not scored · Scored · Out of date */
export function matchStatusLabel(r: Role) {
  return r.matchStatus === 'out-of-date' ? 'Out of date' : r.matchStatus === 'not-run' ? 'Not scored' : 'Scored'
}

function MatchesStatus({ r }: { r: Role }) {
  if (r.matchStatus === 'out-of-date') {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-warning/40 bg-warning/[0.08] px-2 text-xs font-medium whitespace-nowrap text-[#b45309]">
        <AlertTriangle className="size-3.5 shrink-0 text-warning" />Out of date
      </span>
    )
  }
  if (r.matchStatus === 'not-run' || (r.scoredCount ?? 0) === 0) {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-dashed border-gray-700 px-2 text-xs whitespace-nowrap text-muted-foreground">
        <span className="size-1.5 rounded-full border border-gray-800" />Not scored
      </span>
    )
  }
  const isSuggestedOnly = (r.suggestedCount ?? 0) > 0 && r.scoredCount === r.suggestedCount
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-gray-100 px-2 text-xs whitespace-nowrap text-foreground">
      <CircleCheck className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="tnum">{isSuggestedOnly ? `${r.scoredCount} suggested` : `Scored (${r.scoredCount})`}</span>
    </span>
  )
}

const needsAction = (r: Role) => r.matchStatus === 'out-of-date' || r.matchStatus === 'not-run' || (r.scoredCount ?? 0) === 0

export function RolesList() {
  const app = useApp()
  const { roles, matches } = app
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

  useTopBar([{ label: 'Roles' }])

  const openCount = roles.filter(r => r.status === 'Open').length
  const shortlistCount = (r: Role) => {
    const own = matches.filter(m => m.roleId === r.id)
    return own.length ? own.filter(m => m.status === 'shortlisted').length : r.shortlisted
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

  const columns: Column<Role>[] = [
    {
      key: 'cat', header: 'Category', width: '150px', sortable: true, sortValue: r => r.category,
      render: r => (
        <div className="min-w-0">
          <span className="inline-flex h-5 items-center rounded-sm border border-border bg-secondary px-1.5 text-[11px] font-medium text-foreground">{r.category}</span>
          <div className="mt-0.5 max-w-[140px] truncate text-xs text-muted-foreground">{r.subcategory}</div>
        </div>
      ),
    },
    {
      key: 'company', header: 'Company', width: '17%', sortable: true, sortValue: r => r.company,
      render: r => (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-foreground">{r.company}</span><CompanyTypeTag type={r.companyType} />
        </div>
      ),
    },
    {
      key: 'title', header: 'Job title', width: '18%', sortable: true, sortValue: r => r.title,
      render: r => <div className="truncate font-medium text-foreground">{r.title}</div>,
    },
    {
      key: 'must', header: 'Must-haves', width: '18%',
      render: r => <div className="truncate text-xs text-gray-1100" title={mustHavesSummary(r)}>{mustHavesSummary(r)}</div>,
    },
    {
      key: 'latest', header: 'Latest update', sortable: true, sortValue: r => lastWhen(r),
      render: r => r.latestUpdate ? (
        <div className="min-w-0" title={`${r.latestUpdate.text} · ${r.latestUpdate.who} · ${r.latestUpdate.when}`}>
          <div className="truncate text-[13px] text-foreground">{r.latestUpdate.text}</div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground tnum">{r.latestUpdate.who} · {r.latestUpdate.when}</div>
        </div>
      ) : <span className="font-mono text-xs text-muted-foreground tnum">Updated {r.updated}</span>,
    },
    {
      key: 'next', header: 'Next step', width: '280px', sortable: true, sortValue: r => (r.matchStatus === 'out-of-date' ? 0 : (r.matchStatus === 'not-run' || (r.scoredCount ?? 0) === 0) ? 1 : 2),
      render: r => {
        const sc = shortlistCount(r)
        const notScoredYet = r.matchStatus === 'not-run' || (r.scoredCount ?? 0) === 0
        const readyToSend = !notScoredYet && r.matchStatus !== 'out-of-date' && sc >= 2 && (r.id === 'lumen-fse' || r.latestUpdate?.text.toLowerCase().includes('shortlist ready'))
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap" onClick={stop}>
            {!readyToSend && <MatchesStatus r={r} />}
            {r.matchStatus === 'out-of-date' ? (
              <Button variant="outline" size="sm" icon={<RefreshCw />} onClick={() => setRerunRole(r)}>Rerun</Button>
            ) : notScoredYet ? (
              <Button variant="outline" size="sm" icon={<Sparkles />} onClick={() => navigate(`/roles/${r.id}?tab=matches`)}>
                Score <span className="font-mono tnum">{r.passCount}</span>
              </Button>
            ) : readyToSend ? (
              <>
                <Button variant="primary" size="sm" icon={<Send />} onClick={() => navigate(`/roles/${r.id}?tab=shortlist`)}>
                  Send <span className="font-mono tnum">{sc}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/roles/${r.id}?tab=matches`)}>
                  Review <span className="font-mono tnum">{r.scoredCount}</span>
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate(`/roles/${r.id}?tab=matches`)}>
                Review <span className="font-mono tnum">{r.scoredCount}</span>
              </Button>
            )}
          </div>
        )
      },
    },
    {
      key: 'short', header: 'Shortlist', width: '96px', sortable: true, sortValue: r => shortlistCount(r),
      render: r => {
        const n = shortlistCount(r)
        return (
          <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-sm border px-1.5 font-mono text-[11px] tnum', n ? 'border-border bg-secondary text-foreground' : 'border-border bg-gray-100 text-muted-foreground')}
            aria-label={`${n} shortlisted`}>{n}</span>
        )
      },
    },
  ]

  const rowActions = (r: Role) => (
    <Menu width={200}
      trigger={({ toggle }) => <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${r.title}`} onClick={toggle} icon={<MoreHorizontal />} />}
      items={[
        { label: 'Edit role', icon: <Pencil />, onSelect: () => navigate(`/roles/${r.id}/edit`) },
        { label: 'Put on hold', icon: <Pause />, disabled: r.status === 'On hold', onSelect: () => setStatus(r, 'On hold') },
        { label: 'Close role', icon: <Lock />, disabled: r.status === 'Closed', onSelect: () => setStatus(r, 'Closed') },
        { separator: true, label: '' },
        { label: 'Duplicate role', icon: <Copy />, onSelect: () => duplicate(r) },
      ]}
    />
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
    <ScrollPage>
      <PageHeader
        title={<span className="flex items-center gap-2">Roles <ExampleMark /></span>}
        meta={<span className="tnum">{isEmpty ? 0 : openCount} open</span>}
        actions={<Button variant="primary" icon={<Plus />} onClick={() => navigate('/roles/new')}>New role</Button>}
      />

      {isEmpty ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState icon={<Briefcase />} title="No roles yet" body="No roles yet. Add a JD to start matching your candidate pool."
            action={<Button icon={<Plus />} onClick={() => navigate('/roles/new')}>New role</Button>} />
        </div>
      ) : (
        <div className="space-y-4">
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
              <Button variant="primary" size="sm" icon={<Mail />} onClick={() => setPitchesOpen(true)}>
                Prepare pitches ({prospectIds.length || sel.selected.length})
              </Button>
              <Button variant="outline" size="sm" icon={<Table2 />} onClick={copyOutreachRows}>
                Copy rows for outreach sheet
              </Button>
            </SelectionBar>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PillTabs value={tab} onChange={setTab}
                tabs={(['Open', 'On hold', 'Closed', 'All'] as StatusTab[]).map(t => ({ value: t, label: t, count: tabCount(t) }))} />
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip active={type === 'Client'} onClick={() => setType(t => (t === 'Client' ? null : 'Client'))}>Client</FilterChip>
                <FilterChip active={type === 'Prospect'} onClick={() => setType(t => (t === 'Prospect' ? null : 'Prospect'))}>Prospect</FilterChip>
                <Select aria-label="Category" value={category} onChange={setCategory}
                  options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
                <div className="relative w-56">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Search roles" placeholder="Search roles…" value={q} onChange={e => setQ(e.target.value)} className="h-8 pl-8" />
                </div>
              </div>
            </div>
          )}

          <DataTable
            columns={columns}
            rows={tableRows}
            loading={wf === 'loading'}
            selectable
            quietCheckbox
            selected={sel.selected}
            onSelectedChange={sel.setSelected}
            onRowClick={r => navigate(`/roles/${r.id}?tab=matches`)}
            rowActions={rowActions}
            empty={wf === 'error' ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">Roles will appear here once they load.</div> : (
              <EmptyState icon={<SearchX />} title="No roles match these filters"
                body={wf === 'filtered' ? 'No prospect roles in Marketing.' : filterDesc()}
                action={<Button onClick={clearFilters}>Clear filters</Button>} />
            )}
          />
          {wf === 'default' && rows.length > 0 && (
            <p className="eyebrow text-[10px] text-gray-1000">Sorted by needs action first, then latest update</p>
          )}
        </div>
      )}

      <RerunDialog open={!!rerunRole} onClose={() => setRerunRole(null)}
        roleLabel={rerunRole ? `${rerunRole.title} — ${rerunRole.company}` : ''}
        count={rerunRole ? matches.filter(m => m.roleId === rerunRole.id && m.scored).length || rerunRole.scoredCount : 0}
        newPassers={rerunRole ? matches.filter(m => m.roleId === rerunRole.id && !m.scored && !m.skipped && m.status !== 'rejected').length : 0}
        newScoreCount={app.defaultScoreCount}
        onConfirm={opts => {
          if (!rerunRole) return
          const r = rerunRole
          app.rerun(r.id)
          if (opts?.alsoScoreNew) app.scoreMatches(r.id, app.defaultScoreCount)
          app.toast(`Reran matching for ${r.title}`, { action: { label: 'Open', onClick: () => navigate(`/roles/${r.id}?tab=matches&reran=1`) } })
        }} />

      <CreateGmailDraftsDialog
        open={pitchesOpen}
        onClose={() => { setPitchesOpen(false); sel.clear() }}
        mode="prospect-pitches"
        roleIds={prospectIds.length ? prospectIds : sel.selected}
      />
    </ScrollPage>
  )
}
