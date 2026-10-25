import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Copy, Download, FileText, Link2, RefreshCw, SearchX, Wand2 } from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import { Avatar, Button, EmptyState, ExampleMark, PageHeader, Select, Switch, cn } from '../components/ui'
import { DataTable, FilterChip, type Column } from '../components/hs'
import { latestVersion } from '../components/outputs'
import { useApp, useWireframeState } from '../store/AppStore'
import { CopyEmailDialog } from './Dialogs'
import type { OutputType, ResumeOutput } from '../data/types'

/* ==========================================================================
   S-11 · Resumes library — find what was generated and sent, and reuse it.
   PRD v0.3 §7.3 (T3 Source column) & §7.6 (T6 Prompt + Revisions + Refine)
   ========================================================================== */

const TYPES: OutputType[] = ['Masked', 'Editable', 'As-is']
const STATES = [
  { id: 'default', label: 'Default' },
  { id: 'empty', label: 'Empty' },
  { id: 'loading', label: 'Loading' },
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

  const all = wf === 'empty' ? [] : app.outputs
  const rows = useMemo(() => all.filter(o =>
    (!types.length || types.includes(o.type))
    && (roleF === 'all' || (roleF === 'none' ? o.roleId === null : o.roleId === roleF))
    && (byF === 'all' || o.createdBy === byF)), [all, types, roleF, byF])

  const roleIds = Array.from(new Set(app.outputs.map(o => o.roleId).filter((x): x is string => !!x)))
  const people = Array.from(new Set(app.outputs.map(o => o.createdBy)))
  const filtered = types.length > 0 || roleF !== 'all' || byF !== 'all'
  const clear = () => { setTypes([]); setRoleF('all'); setByF('all') }

  const openBuilder = (o: ResumeOutput) => {
    if (o.type === 'Masked') navigate(`/resumes/masked?candidates=${o.candidateId}&role=${o.roleId ?? 'none'}`)
    else navigate(`/resumes/editable?role=${o.roleId ?? 'northwind-spm'}&candidates=${o.candidateId}`)
  }
  const download = (o: ResumeOutput) => {
    const c = app.candidate(o.candidateId)
    app.log({ what: `Downloaded ${o.type.toLowerCase()} resume for ${c?.name}`, record: c?.name ?? '', recordHref: `/candidates/${o.candidateId}`, kind: 'Outputs' })
    app.toast(`${o.type === 'As-is' ? 'Resume' : `${o.type} resume`} downloaded`)
  }

  const sourceText = (o: ResumeOutput) => {
    const list = app.resumesFor(o.candidateId)
    const r = (o.sourceResumeId ? list.find(x => x.id === o.sourceResumeId) : undefined) ?? list.find(x => x.isPrimary) ?? list[0]
    const v = o.sourceVersion ?? latestVersion(r)
    return r ? `${r.label} resume v${v}` : `Resume v${v}`
  }

  const columns: Column<ResumeOutput>[] = [
    {
      key: 'candidate', header: 'Candidate', sortable: true, sortValue: o => app.candidate(o.candidateId)?.name ?? '',
      render: o => {
        const c = app.candidate(o.candidateId)
        return (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar initials={c?.initials ?? '?'} size={28} />
            <div className="min-w-0">
              <Link to={`/candidates/${o.candidateId}`} onClick={e => e.stopPropagation()} className="block max-w-[140px] truncate text-[13px] font-medium hover:underline">{c?.name}</Link>
              <div className="max-w-[155px] truncate text-[11px] text-muted-foreground">{c?.headline}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'type', header: 'Type', sortable: true, sortValue: o => o.type,
      render: o => <span className="inline-flex h-5 items-center rounded-sm border border-border bg-secondary px-1.5 text-[11px] font-medium whitespace-nowrap">{o.type}</span>,
    },
    {
      key: 'role', header: 'Role',
      render: o => {
        const r = o.roleId ? app.role(o.roleId) : undefined
        return r
          ? <span className="block max-w-[165px] truncate text-xs font-medium text-foreground" title={`${r.title} — ${r.company}`}>{r.title} <span className="font-normal text-muted-foreground">· {r.company}</span></span>
          : <span className="text-xs text-muted-foreground">No role</span>
      },
    },
    {
      key: 'source', header: 'Source',
      render: o => <span className="block max-w-[130px] truncate text-xs text-gray-1100 whitespace-nowrap">{sourceText(o)}</span>,
    },
    {
      key: 'style', header: 'Style',
      render: o => {
        const st = o.style ?? (o.type === 'Masked' ? 'creative' : 'traditional')
        return (
          <div className="space-y-0.5">
            <span className={cn(
              'inline-flex h-5 items-center rounded-sm border px-1.5 text-[11px] font-medium whitespace-nowrap',
              st === 'creative' ? 'border-border bg-secondary text-foreground' : 'border-border bg-background text-gray-1100',
            )}>
              {st === 'creative' ? 'Creative' : 'Traditional'}
            </span>
            <div className="max-w-[115px] truncate text-[10px] text-muted-foreground">{o.template}</div>
          </div>
        )
      },
    },
    {
      key: 'delivery', header: 'Delivery & link',
      render: o => {
        const deliv = o.delivery ?? (o.type === 'Masked' ? 'link' : 'pdf')
        const active = o.linkActive ?? true
        if (deliv === 'link' || o.shareUrl) {
          return (
            <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
              <span className={cn(
                'inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] font-medium whitespace-nowrap',
                active ? 'border-success/40 bg-success/[0.08] text-foreground' : 'border-border bg-muted text-muted-foreground line-through',
              )}>
                <Link2 className="size-3" />
                {deliv === 'link' ? 'Web link' : `${deliv.toUpperCase()} + link`}
              </span>
              <Switch
                aria-label={`Web link for ${app.candidate(o.candidateId)?.name ?? o.candidateId}`}
                checked={active}
                onChange={next => app.toggleOutputLink(o.id, next)}
                label={active ? 'On' : 'Revoked'}
              />
            </div>
          )
        }
        return (
          <span className="inline-flex h-5 items-center rounded-sm border border-border bg-background px-1.5 font-mono text-[10px] font-medium uppercase text-gray-1100">
            {deliv}
          </span>
        )
      },
    },
    {
      key: 'prompt', header: 'Prompt',
      render: o => <span className="font-mono text-[11px] text-gray-1100 whitespace-nowrap">{o.promptVersion ?? 'Masking v4'}</span>,
    },
    {
      key: 'revisions', header: 'Revisions',
      render: o => {
        const n = o.revisions?.length ?? 1
        const latest = o.revisions?.[o.revisions.length - 1]
        return (
          <span title={latest ? `v${n}: ${latest.instruction} (${latest.scope})` : 'v1: Generated'} className="inline-flex h-5 items-center rounded-sm border border-border bg-background px-1.5 font-mono text-[11px] text-foreground tnum">
            v{n}
          </span>
        )
      },
    },
    { key: 'by', header: 'Created by', sortable: true, sortValue: o => o.createdBy, render: o => <span className="block max-w-[100px] truncate text-xs text-gray-1100 whitespace-nowrap">{o.createdBy}</span> },
    { key: 'created', header: 'Created', render: o => <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap tnum">{o.created}</span> },
    {
      key: 'status', header: 'Status',
      render: o => o.stale
        ? (
          <span title={o.staleReason ?? 'Profile changed since'} className="inline-flex h-6 max-w-[190px] items-center gap-1 rounded-md border border-warning/40 bg-warning/[0.08] px-2 text-xs whitespace-nowrap text-[#b45309]">
            <AlertTriangle className="size-3 shrink-0 text-warning" />
            <span className="truncate">Stale · {o.staleReason ?? 'changed'}</span>
          </span>
        )
        : <span className="inline-flex h-5 items-center rounded-sm border border-border bg-gray-100 px-2 text-[11px] text-muted-foreground">Ready</span>,
    },
  ]

  const counts = Object.fromEntries(TYPES.map(t => [t, all.filter(o => o.type === t).length])) as Record<OutputType, number>

  return (
    <ScrollPage>
      <PageHeader title={<span className="inline-flex items-center gap-2">Resumes <ExampleMark /></span>}
        meta={<span className="tnum">{wf === 'loading' ? '—' : all.length} generated · {all.filter(o => o.stale).length} stale</span>} />

      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map(t => (
          <FilterChip key={t} active={types.includes(t)} count={counts[t]} onClick={() => setTypes(s => (s.includes(t) ? s.filter(x => x !== t) : [...s, t]))}>{t}</FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Select aria-label="Role" value={roleF} onChange={setRoleF}
          options={[{ value: 'all', label: 'All roles' }, ...roleIds.map(id => { const r = app.role(id); return { value: id, label: r ? `${r.title} — ${r.company}` : id } }), { value: 'none', label: 'No role' }]} />
        <Select aria-label="Created by" value={byF} onChange={setByF} options={[{ value: 'all', label: 'Anyone' }, ...people.map(p => ({ value: p, label: p }))]} />
        {filtered && <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={wf === 'loading'}
        onRowClick={o => navigate(`/candidates/${o.candidateId}`)}
        rowActions={o => (
          <>
            {(o.delivery === 'link' || o.shareUrl) && (
              <Button
                variant="outline"
                size="sm"
                icon={<Link2 />}
                disabled={o.linkActive === false}
                title={o.linkActive === false ? 'Web link is switched off' : o.shareUrl ?? 'Copy web link'}
                onClick={() => app.toast('Copied shareable web link · Read-only, revocable anytime')}
              >
                Copy link
              </Button>
            )}
            <Button variant="outline" size="sm" icon={<Download />} onClick={() => download(o)}>Download</Button>
            <Button variant="ghost" size="icon-sm" aria-label="Copy email text" title="Copy email text" icon={<Copy />} onClick={() => setEmail(o)} />
            <Button variant="ghost" size="sm" icon={<Wand2 />} onClick={() => openBuilder(o)}>Refine</Button>
            <Button variant="ghost" size="icon-sm" aria-label="Regenerate" title="Regenerate" icon={<RefreshCw />} onClick={() => openBuilder(o)} />
          </>
        )}
        empty={all.length === 0
          ? <EmptyState icon={<FileText />} title="No resumes yet" body="No resumes generated yet. Open a candidate and choose Masked resume."
              action={<Button onClick={() => navigate('/candidates')}>Open candidates</Button>} />
          : <EmptyState icon={<SearchX />} title="No resumes match these filters" body="Try another type, role or person." action={<Button onClick={clear}>Clear filters</Button>} />}
      />

      <CopyEmailDialog key={email?.id ?? 'none'} open={!!email} onClose={() => setEmail(null)} candidateIds={email ? [email.candidateId] : []} roleId={email?.roleId ?? null}
        initialVariant={email?.type === 'Masked' ? 'prospect' : 'client'} />
    </ScrollPage>
  )
}
