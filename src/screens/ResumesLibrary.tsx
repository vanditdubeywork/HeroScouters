import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Briefcase, Check, ChevronDown, CircleCheck, Copy, Download, Eye, EyeOff, FileCheck,
  FileText, Globe, Layers, Link2, Mail, MoreHorizontal, RefreshCw, SearchX, Shield,
  Sparkles, User, Wand2,
} from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import { Avatar, Button, CompanyTypeTag, EmptyState, ExampleMark, Menu, PageHeader, Select, Switch, cn } from '../components/ui'
import { DataTable, FilterChip, type Column } from '../components/hs'
import { ColumnsMenu, SelectionBar, useColumnPrefs, useListSelection } from '../components/v3'
import { latestVersion } from '../components/outputs'
import { BulkMaskForRoleDialog } from '../components/BulkMaskModal'
import { useApp, useWireframeState } from '../store/AppStore'
import { CopyEmailDialog } from './Dialogs'
import type { OutputType, ResumeOutput } from '../data/types'

/* ==========================================================================
   S-11 · Resumes library — SaaS action-driven table + Role Masked Links entry
   ========================================================================== */

const TYPES: OutputType[] = ['Masked', 'Editable', 'As-is']

const TYPE_META: Record<OutputType, { icon: React.ReactNode; badgeCls: string }> = {
  Masked: {
    icon: <Shield className="size-3.5" />,
    badgeCls: 'border-border bg-secondary text-foreground',
  },
  Editable: {
    icon: <Wand2 className="size-3.5" />,
    badgeCls: 'border-border bg-background text-foreground',
  },
  'As-is': {
    icon: <FileCheck className="size-3.5" />,
    badgeCls: 'border-border bg-background text-gray-1100',
  },
}

const STATES = [
  { id: 'default', label: 'Default (SaaS 5-col view)' },
  { id: 'empty', label: 'Empty' },
  { id: 'loading', label: 'Loading' },
]

const RESUME_COL_SPECS = [
  { key: 'candidate', label: 'Candidate & source', defaultVisible: true, locked: true },
  { key: 'type', label: 'Type & style', defaultVisible: true },
  { key: 'role', label: 'Target role', defaultVisible: true },
  { key: 'delivery', label: 'Share link & status', defaultVisible: true },
  { key: 'prompt', label: 'Prompt & revisions', defaultVisible: false },
  { key: 'by', label: 'Created by & date', defaultVisible: false },
]

export function ResumesLibrary() {
  const app = useApp()
  const navigate = useNavigate()
  const [wf] = useWireframeState('S-11', 'Resumes', STATES)
  useTopBar([{ label: 'Resumes' }])

  const [types, setTypes] = useState<OutputType[]>([])
  const [roleF, setRoleF] = useState('all')
  const [byF, setByF] = useState('all')
  const [email, setEmail] = useState<ResumeOutput | null>(null)
  const [bulkEmailCands, setBulkEmailCands] = useState<string[] | null>(null)
  const [bulkMaskCands, setBulkMaskCands] = useState<string[] | null>(null)
  const colPrefs = useColumnPrefs('resumes-v4-saas', RESUME_COL_SPECS.filter(s => s.defaultVisible).map(s => s.key))

  const all = wf === 'empty' ? [] : app.outputs
  const rows = useMemo(
    () =>
      all.filter(
        o =>
          (!types.length || types.includes(o.type)) &&
          (roleF === 'all' || (roleF === 'none' ? o.roleId === null : o.roleId === roleF)) &&
          (byF === 'all' || o.createdBy === byF),
      ),
    [all, types, roleF, byF],
  )

  const sel = useListSelection(rows.map(o => o.id))
  const selectedRows = useMemo(() => rows.filter(o => sel.selected.includes(o.id)), [rows, sel.selected])
  const selectedCandIds = useMemo(
    () => Array.from(new Set(selectedRows.map(o => o.candidateId))),
    [selectedRows],
  )
  const staleRowIds = useMemo(() => rows.filter(o => o.stale).map(o => o.id), [rows])

  const roleIds = Array.from(new Set(app.outputs.map(o => o.roleId).filter((x): x is string => !!x)))
  const people = Array.from(new Set(app.outputs.map(o => o.createdBy)))
  const filtered = types.length > 0 || roleF !== 'all' || byF !== 'all'
  const clear = () => {
    setTypes([])
    setRoleF('all')
    setByF('all')
  }

  const openBuilder = (o: ResumeOutput) => {
    if (o.type === 'Masked') navigate(`/resumes/masked?candidates=${o.candidateId}&role=${o.roleId ?? 'none'}`)
    else navigate(`/resumes/editable?role=${o.roleId ?? 'northwind-spm'}&candidates=${o.candidateId}`)
  }

  const download = (o: ResumeOutput) => {
    const c = app.candidate(o.candidateId)
    app.log({
      what: `Downloaded ${o.type.toLowerCase()} resume for ${c?.name}`,
      record: c?.name ?? '',
      recordHref: `/candidates/${o.candidateId}`,
      kind: 'Outputs',
    })
    app.toast(`${o.type === 'As-is' ? 'Resume' : `${o.type} resume`} downloaded`)
  }

  const sourceText = (o: ResumeOutput) => {
    const list = app.resumesFor(o.candidateId)
    const r =
      (o.sourceResumeId ? list.find(x => x.id === o.sourceResumeId) : undefined) ??
      list.find(x => x.isPrimary) ??
      list[0]
    const v = o.sourceVersion ?? latestVersion(r)
    return r ? `${r.label} resume v${v}` : `Resume v${v}`
  }

  const allColumns: Column<ResumeOutput>[] = [
    {
      key: 'candidate',
      header: 'Candidate & Source',
      icon: <User className="size-3" />,
      sortable: true,
      sortValue: o => app.candidate(o.candidateId)?.name ?? '',
      render: o => {
        const c = app.candidate(o.candidateId)
        const n = o.revisions?.length ?? 1
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar initials={c?.initials ?? '?'} size={28} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  to={`/candidates/${o.candidateId}`}
                  onClick={e => e.stopPropagation()}
                  className="max-w-[130px] truncate text-[13px] font-semibold text-foreground hover:underline"
                >
                  {c?.name}
                </Link>
                <span className="inline-flex h-4.5 items-center gap-1 rounded-xs border border-border bg-secondary px-1.5 text-[10px] font-medium text-gray-1100">
                  <FileText className="size-2.5 text-muted-foreground" />
                  {sourceText(o)}
                </span>
                {n > 1 && (
                  <span className="font-mono text-[10px] text-muted-foreground tnum">· v{n}</span>
                )}
              </div>
              <div className="mt-0.5 max-w-[220px] truncate text-xs text-muted-foreground">{c?.headline}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'type',
      header: 'Type & Style',
      icon: <Shield className="size-3" />,
      sortable: true,
      sortValue: o => o.type,
      render: o => {
        const st = o.style ?? (o.type === 'Masked' ? 'creative' : 'traditional')
        const meta = TYPE_META[o.type]
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap [&>svg]:size-3.5',
                  meta.badgeCls,
                )}
              >
                {meta.icon}
                {o.type}
              </span>
              <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
                {st === 'creative' ? <Sparkles className="size-2.5 text-foreground" /> : <FileText className="size-2.5" />}
                {st === 'creative' ? 'Creative' : 'Traditional'}
              </span>
            </div>
            <div className="max-w-[150px] truncate text-[11px] text-muted-foreground">{o.template}</div>
          </div>
        )
      },
    },
    {
      key: 'role',
      header: 'Target Role',
      icon: <Briefcase className="size-3" />,
      render: o => {
        const r = o.roleId ? app.role(o.roleId) : undefined
        return r ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/roles/${r.id}`}
                onClick={e => e.stopPropagation()}
                className="max-w-[165px] truncate text-xs font-semibold text-foreground hover:underline"
              >
                {r.title}
              </Link>
              <CompanyTypeTag type={r.companyType} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="max-w-[110px] truncate">{r.company}</span>
              {o.type === 'Masked' && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    navigate(`/resumes/masked-view?role=${r.id}&candidate=${o.candidateId}`)
                  }}
                  className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
                >
                  <Eye className="size-3" />Role portal
                </button>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">General pool (No role)</span>
        )
      },
    },
    {
      key: 'delivery',
      header: 'Share Link & Status',
      icon: <Link2 className="size-3" />,
      render: o => {
        const deliv = o.delivery ?? (o.type === 'Masked' ? 'link' : 'pdf')
        const active = o.linkActive ?? true
        return (
          <div className="space-y-1" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              {deliv === 'link' || o.shareUrl ? (
                <>
                  <button
                    type="button"
                    disabled={!active}
                    onClick={() => {
                      const url = o.shareUrl ?? `https://heroscouter.com/m/${o.roleId ?? 'pool'}/${o.candidateId}`
                      navigator.clipboard?.writeText(url).catch(() => {})
                      app.toast('Copied shareable masked web link · Read-only, revocable anytime')
                    }}
                    title={o.shareUrl ?? `https://heroscouter.com/m/${o.candidateId}`}
                    className={cn(
                      'inline-flex h-6 max-w-[155px] items-center gap-1.5 truncate rounded-md border px-2 font-mono text-[11px] font-medium whitespace-nowrap transition-colors hover:border-gray-700',
                      active
                        ? 'border-success/40 bg-success/[0.08] text-foreground cursor-pointer'
                        : 'border-border bg-muted text-muted-foreground line-through',
                    )}
                  >
                    <Globe className="size-3 shrink-0 text-success" />
                    <span className="truncate">{o.shareUrl ? o.shareUrl.replace(/^https?:\/\//, '') : `heroscouter.com/m/${o.candidateId}`}</span>
                    <Copy className="size-2.5 shrink-0 text-muted-foreground" />
                  </button>
                  <Switch
                    aria-label={`Web link for ${app.candidate(o.candidateId)?.name ?? o.candidateId}`}
                    checked={active}
                    onChange={next => app.toggleOutputLink(o.id, next)}
                  />
                </>
              ) : (
                <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-border bg-background px-1.5 font-mono text-[10px] font-medium uppercase text-gray-1100">
                  <FileText className="size-3" />
                  {deliv}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {o.stale ? (
                <span
                  title={o.staleReason ?? 'Profile changed since'}
                  className="inline-flex max-w-[210px] items-center gap-1 truncate font-medium text-[#b45309]"
                >
                  <AlertTriangle className="size-3 shrink-0 text-warning" />
                  <span className="truncate">Stale · {o.staleReason ?? 'profile updated'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CircleCheck className="size-3 shrink-0 text-success" />
                  <span>Ready · {o.created}</span>
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'prompt',
      header: 'Prompt & Revisions',
      render: o => {
        const n = o.revisions?.length ?? 1
        return (
          <div className="space-y-0.5">
            <span className="font-mono text-[11px] text-foreground">{o.promptVersion ?? 'Masking v4'}</span>
            <div className="font-mono text-[10px] text-muted-foreground tnum">v{n} revision{n === 1 ? '' : 's'}</div>
          </div>
        )
      },
    },
    {
      key: 'by',
      header: 'Created By',
      sortable: true,
      sortValue: o => o.createdBy,
      render: o => (
        <div className="space-y-0.5 text-xs">
          <div className="font-medium text-foreground">{o.createdBy}</div>
          <div className="font-mono text-[11px] text-muted-foreground tnum">{o.created}</div>
        </div>
      ),
    },
  ]

  const visibleColumns = useMemo(
    () => allColumns.filter(c => colPrefs.visible.includes(c.key)),
    [allColumns, colPrefs.visible], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const counts = Object.fromEntries(TYPES.map(t => [t, all.filter(o => o.type === t).length])) as Record<OutputType, number>

  return (
    <ScrollPage className="max-w-[1440px]" viewportLocked={all.length > 0}>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            Resumes &amp; Masked Outputs <ExampleMark />
          </span>
        }
        meta={
          <span className="tnum">
            {wf === 'loading' ? '—' : all.length} generated · {all.filter(o => o.type === 'Masked').length} masked links ·{' '}
            {all.filter(o => o.stale).length} stale
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              icon={<Eye />}
              onClick={() => navigate(`/resumes/masked-view?role=${roleF !== 'all' && roleF !== 'none' ? roleF : 'northwind-spm'}`)}
            >
              Masked Role Links View
            </Button>
            <Button variant="primary" icon={<Sparkles />} onClick={() => setBulkMaskCands(selectedCandIds.length > 0 ? selectedCandIds : [])}>
              Select resumes &amp; bulk mask
            </Button>
          </div>
        }
      />

      {/* Interactive Icon Filter Bar + Quick Bulk Select */}
      {sel.selected.length > 0 ? (
        <SelectionBar
          count={sel.selected.length}
          shown={rows.length}
          onSelectAllShown={() => sel.selectAll(rows.map(o => o.id))}
          onClear={sel.clear}
        >
          <Button
            variant="primary"
            size="sm"
            icon={<Shield />}
            onClick={() => setBulkMaskCands(selectedCandIds)}
          >
            Select resumes &amp; bulk mask ({selectedCandIds.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Link2 />}
            onClick={() => {
              const urls = selectedRows.map(o => o.shareUrl ?? `https://heroscouter.com/m/${o.roleId ?? 'pool'}/${o.candidateId}`)
              navigator.clipboard?.writeText(urls.join('\n')).catch(() => {})
              app.toast(`Copied ${urls.length} shareable web link${urls.length === 1 ? '' : 's'}`)
            }}
          >
            Copy {selectedRows.length} link{selectedRows.length === 1 ? '' : 's'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Wand2 />}
            onClick={() => {
              const firstRole = selectedRows.find(o => o.roleId)?.roleId ?? 'northwind-spm'
              navigate(`/resumes/masked?candidates=${selectedCandIds.join(',')}&role=${firstRole}`)
            }}
          >
            Open in Studio ({selectedCandIds.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Mail />}
            onClick={() => setBulkEmailCands(selectedCandIds)}
          >
            Draft email ({selectedCandIds.length})
          </Button>
          <Menu
            align="end"
            width={235}
            trigger={({ toggle }) => (
              <Button variant="outline" size="sm" iconRight={<ChevronDown className="size-3.5 text-muted-foreground" />} onClick={toggle}>
                More bulk actions
              </Button>
            )}
            items={[
              {
                label: `Enable ${selectedRows.length} web link(s)`,
                icon: <Globe />,
                onSelect: () => {
                  selectedRows.forEach(o => app.toggleOutputLink(o.id, true))
                  app.toast(`Enabled ${selectedRows.length} shareable link${selectedRows.length === 1 ? '' : 's'}`)
                },
              },
              {
                label: `Revoke / disable ${selectedRows.length} link(s)`,
                icon: <EyeOff />,
                onSelect: () => {
                  selectedRows.forEach(o => app.toggleOutputLink(o.id, false))
                  app.toast(`Revoked ${selectedRows.length} shareable link${selectedRows.length === 1 ? '' : 's'}`)
                },
              },
              { separator: true, label: '' },
              {
                label: `Download ${selectedRows.length} PDFs (ZIP)`,
                icon: <Download />,
                onSelect: () => {
                  app.toast(`Downloaded ${selectedRows.length} resume PDF${selectedRows.length === 1 ? '' : 's'} as ZIP`)
                  sel.clear()
                },
              },
            ]}
          />
        </SelectionBar>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              active={types.length === 0}
              icon={<Layers />}
              count={all.length}
              onClick={() => setTypes([])}
            >
              All outputs
            </FilterChip>
            {TYPES.map(t => (
              <FilterChip
                key={t}
                active={types.includes(t)}
                icon={TYPE_META[t].icon}
                count={counts[t]}
                onClick={() => setTypes(s => (s.includes(t) ? s.filter(x => x !== t) : [...s, t]))}
              >
                {t}
              </FilterChip>
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
            <Select
              aria-label="Filter by role"
              value={roleF}
              onChange={setRoleF}
              options={[
                { value: 'all', label: 'All roles' },
                ...roleIds.map(id => {
                  const r = app.role(id)
                  return { value: id, label: r ? `${r.title} — ${r.company}` : id }
                }),
                { value: 'none', label: 'No role' },
              ]}
            />
            <Select
              aria-label="Filter by creator"
              value={byF}
              onChange={setByF}
              options={[{ value: 'all', label: 'Created by anyone' }, ...people.map(p => ({ value: p, label: p }))]}
            />
            {filtered && (
              <Button variant="ghost" size="sm" onClick={clear}>
                Clear filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {staleRowIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon={<AlertTriangle className="text-warning" />}
                onClick={() => sel.selectAll(staleRowIds)}
              >
                Select stale ({staleRowIds.length})
              </Button>
            )}
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => sel.selectAll(rows.map(o => o.id))}>
                Select all ({rows.length})
              </Button>
            )}
            <ColumnsMenu
              options={RESUME_COL_SPECS}
              visible={colPrefs.visible}
              onChange={colPrefs.setVisible}
              onReset={colPrefs.reset}
            />
          </div>
        </div>
      )}

      <DataTable
        caption="Generated resumes and shareable masked links"
        columns={visibleColumns}
        rows={rows}
        loading={wf === 'loading'}
        selectable
        selected={sel.selected}
        onSelectedChange={sel.setSelected}
        onRowClick={o => {
          if (o.type === 'Masked') {
            navigate(`/resumes/masked-view?role=${o.roleId ?? 'northwind-spm'}&candidate=${o.candidateId}`)
          } else {
            openBuilder(o)
          }
        }}
        rowActions={o => (
          <>
            {o.type === 'Masked' ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Eye />}
                onClick={() => navigate(`/resumes/masked-view?role=${o.roleId ?? 'northwind-spm'}&candidate=${o.candidateId}`)}
              >
                Client view
              </Button>
            ) : (
              <Button variant="outline" size="sm" icon={<Download />} onClick={() => download(o)}>
                PDF
              </Button>
            )}
            <Button variant="outline" size="sm" icon={<Wand2 />} onClick={() => openBuilder(o)}>
              Refine
            </Button>
            <Menu
              width={210}
              trigger={({ toggle }) => (
                <Button variant="ghost" size="icon-sm" aria-label="More output actions" onClick={toggle} icon={<MoreHorizontal />} />
              )}
              items={[
                ...(o.type === 'Masked' || o.shareUrl
                  ? [
                      {
                        label: 'Copy shareable web link',
                        icon: <Link2 />,
                        disabled: o.linkActive === false,
                        onSelect: () => {
                          const url = o.shareUrl ?? `https://heroscouter.com/m/${o.roleId ?? 'pool'}/${o.candidateId}`
                          navigator.clipboard?.writeText(url).catch(() => {})
                          app.toast('Copied shareable masked web link · Read-only, revocable anytime')
                        },
                      },
                    ]
                  : []),
                { label: 'Download PDF', icon: <Download />, onSelect: () => download(o) },
                { label: 'Copy email text', icon: <Copy />, onSelect: () => setEmail(o) },
                { separator: true, label: '' },
                { label: 'Regenerate in Studio', icon: <RefreshCw />, onSelect: () => openBuilder(o) },
              ]}
            />
          </>
        )}
        empty={
          all.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title="No resumes yet"
              body="No resumes generated yet. Select candidates for a role and bulk mask their resumes."
              action={
                <Button variant="primary" icon={<Sparkles />} onClick={() => setBulkMaskCands([])}>
                  Select resumes &amp; bulk mask
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<SearchX />}
              title="No resumes match these filters"
              body="Try another type, role or person."
              action={<Button onClick={clear}>Clear filters</Button>}
            />
          )
        }
      />

      <BulkMaskForRoleDialog
        open={bulkMaskCands !== null}
        onClose={() => setBulkMaskCands(null)}
        initialRoleId={roleF !== 'all' && roleF !== 'none' ? roleF : undefined}
        initialCandidateIds={bulkMaskCands && bulkMaskCands.length > 0 ? bulkMaskCands : undefined}
      />

      <CopyEmailDialog
        key={email?.id ?? (bulkEmailCands ? bulkEmailCands.join(',') : 'none')}
        open={!!email || !!bulkEmailCands}
        onClose={() => { setEmail(null); setBulkEmailCands(null) }}
        candidateIds={bulkEmailCands ?? (email ? [email.candidateId] : [])}
        roleId={email?.roleId ?? (selectedRows.find(o => o.roleId)?.roleId ?? null)}
        initialVariant={(email?.type ?? selectedRows[0]?.type) === 'Masked' ? 'prospect' : 'client'}
      />
    </ScrollPage>
  )
}
