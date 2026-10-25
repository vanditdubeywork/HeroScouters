import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Download, FileText, Filter, GripVertical,
  ListChecks, Mail, MoreHorizontal, Pencil, RefreshCw, Search, Sparkles, X,
} from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import {
  Avatar, BezelCard, Button, CompanyTypeTag, EmptyState, ExampleMark, Fact, Menu, PillTabs, Segmented, Select, Skeleton, Switch, Tag, cn,
} from '../components/ui'
import {
  Banner, Dialog, FunnelLine, InfoNote, MatchChipView, MatchRow, NotCaptured, RerunSummary, SourceBadge, VersionChip, candidateLocation,
} from '../components/hs'
import { CandidatePreview } from './CandidatePreview'
import { CopyEmailDialog, IncludeAnywayDialog, RejectDialog, RerunDialog } from './Dialogs'
import { useApp, useWireframeState } from '../store/AppStore'
import { POOL_SIZE, eliminatedByRole, jdChangesNorthwind } from '../data/mock'
import type { Band, Eliminated, Match, MatchChip, OutputType, Role, RoleStatus } from '../data/types'

/* ==========================================================================
   S-04 · Role page — the core screen.
   Matches (default) · Shortlist · Details · History
   ========================================================================== */

type Tab = 'matches' | 'shortlist' | 'details' | 'history'
type View = 'never' | 'running' | 'ranked' | 'none' | 'few' | 'error'
type DeltaFilter = 'new' | 'moved' | 'requalified' | 'dropped'

/* ---------- Session-only matches for roles created in this prototype ----------
   Roles added via S-03 have no pre-computed matches in the example data, so we
   seed them from the closest example role. Kept outside React so decisions
   survive navigation within the session. */
let vMatches: Record<string, Match[]> = {}
const vListeners = new Set<() => void>()
const vSubscribe = (l: () => void) => { vListeners.add(l); return () => { vListeners.delete(l) } }
const vSet = (fn: (v: Record<string, Match[]>) => Record<string, Match[]>) => { vMatches = fn(vMatches); vListeners.forEach(l => l()) }
const useVirtualMatches = () => useSyncExternalStore(vSubscribe, () => vMatches)

function seedFor(role: Role, all: Match[], roles: Role[]): Match[] {
  const has = (rid: string) => all.some(m => m.roleId === rid && !m.id.startsWith('inc-'))
  const tpl = roles.find(r => r.id !== role.id && r.subcategory === role.subcategory && has(r.id))
    ?? roles.find(r => r.id !== role.id && r.category === role.category && has(r.id))
    ?? roles.find(r => r.id === 'northwind-spm')
  if (!tpl) return []
  return all
    .filter(m => m.roleId === tpl.id && !m.id.startsWith('inc-'))
    .map(m => ({ ...m, id: `v:${role.id}:${m.id}`, roleId: role.id, status: 'new' as const, rejectReason: undefined, delta: undefined }))
}

const ASK_QUESTIONS: Record<string, string> = {
  'Work mode': 'Remote, hybrid or onsite?',
  Location: 'Where are you based, and are you open to relocating?',
  'Work authorization': 'Are you on a visa? Which one, and when does it expire?',
  Relocation: 'Are you open to relocating? Where to?',
  'Relocation to Seattle': 'Are you open to relocating? Where to?',
  SQL: 'Do you write SQL day to day?',
}
const askFor = (chip: MatchChip) => ASK_QUESTIONS[chip.label] ?? `Can you confirm: ${chip.label.toLowerCase()}?`

const WF_STATES = [
  { id: 'live', label: 'Live (from store)' },
  { id: 'never', label: 'Never run' },
  { id: 'running', label: 'Running' },
  { id: 'top5', label: 'Top 5 (up to date)' },
  { id: 'out-of-date', label: 'Out of date (banner + dim)' },
  { id: 'after-rerun', label: 'After rerun (N9)' },
  { id: 'none', label: 'No one passes' },
  { id: 'few', label: 'Fewer than 5 pass' },
  { id: 'error', label: 'Error' },
  { id: 'eliminated', label: 'Eliminated view open' },
  { id: 'shortlist-prospect', label: 'Shortlist · prospect role' },
  { id: 'shortlist-client', label: 'Shortlist · client role' },
]

const DEFAULT_REASON = 'Must-haves changed since the last run: added SQL, minimum years 5 → 6.'

export function RolePage() {
  const { id = '' } = useParams()
  const app = useApp()
  const role = app.role(id)
  if (!role) return <RoleMissing />
  return <RoleView key={role.id} role={role} />
}

function RoleMissing() {
  const navigate = useNavigate()
  useTopBar([{ label: 'Roles', to: '/roles' }, { label: 'Role not found' }])
  return (
    <ScrollPage>
      <EmptyState icon={<Search />} title="Role not found" body="This role may have been removed or the link is wrong." action={<Button onClick={() => navigate('/roles')}>Back to roles</Button>} />
    </ScrollPage>
  )
}

function RoleView({ role }: { role: Role }) {
  const id = role.id
  const app = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (['matches', 'shortlist', 'details', 'history'].includes(params.get('tab') ?? '') ? params.get('tab') : 'matches') as Tab
  const setTab = (t: Tab) => { const p = new URLSearchParams(params); p.set('tab', t); setParams(p, { replace: true }) }
  const [wf, setWf] = useWireframeState('S-04', 'Role page', WF_STATES)

  const vm = useVirtualMatches()
  const own = useMemo(() => app.matches.filter(m => m.roleId === id), [app.matches, id])
  const virtual = vm[id] ?? []
  const all = useMemo(() => [...own, ...virtual], [own, virtual])
  const ranked = useMemo(() => [...all].sort((a, b) => a.rank - b.rank), [all])
  const shortlisted = all.filter(m => m.status === 'shortlisted')
  const label = `${role.title} — ${role.company}`

  /* Local UI state */
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [deltaFilter, setDeltaFilter] = useState<DeltaFilter | null>(null)
  const [elimOpen, setElimOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'top' | 'all'>('top')
  const [band, setBand] = useState<'all' | Band>('all')
  const [hideDecided, setHideDecided] = useState(false)
  const [shown, setShown] = useState(5)
  const [focusIdx, setFocusIdx] = useState(-1)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewFrom, setPreviewFrom] = useState<'matches' | 'shortlist'>('matches')
  const [rejectTarget, setRejectTarget] = useState<Match | null>(null)
  const [includeTarget, setIncludeTarget] = useState<Eliminated | null>(null)
  const [rerunOpen, setRerunOpen] = useState<null | 'normal' | 'force'>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [last, setLast] = useState<{ id: string; prev: Match['status'] } | null>(null)

  /* Seed session matches for roles created in the prototype */
  useEffect(() => {
    if (role.matchStatus !== 'not-run' && own.length === 0 && !vMatches[id]) {
      vSet(v => ({ ...v, [id]: seedFor(role, app.matches, app.roles) }))
    }
  }, [role.matchStatus, own.length, id]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Keep the list's shortlist count in sync for session roles */
  useEffect(() => {
    if (!virtual.length) return
    const n = virtual.filter(m => m.status === 'shortlisted').length
    if (n !== role.shortlisted) app.updateRole(id, { shortlisted: n })
  }, [virtual]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Arrivals from S-02 / S-03: ?run=1 shows the ranking banner, ?reran=1 opens N9 */
  useEffect(() => {
    const run = params.get('run'); const reran = params.get('reran')
    if (!run && !reran) return
    if (run) setRunning(true)
    if (reran) setSummaryOpen(true)
    const p = new URLSearchParams(params); p.delete('run'); p.delete('reran'); setParams(p, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Wireframe state side effects */
  useEffect(() => {
    if (wf === 'eliminated') { setElimOpen(true); if (tab !== 'matches') setTab('matches') }
    if (wf === 'after-rerun') { if (role.matchStatus !== 'up-to-date') app.rerun(id); setSummaryOpen(true); if (tab !== 'matches') setTab('matches') }
    if (wf === 'shortlist-prospect' && id !== 'lumen-fse') navigate('/roles/lumen-fse?tab=shortlist')
    if (wf === 'shortlist-client' && id !== 'northwind-spm') navigate('/roles/northwind-spm?tab=shortlist')
    if ((wf === 'shortlist-prospect' || wf === 'shortlist-client') && tab !== 'shortlist') setTab('shortlist')
    if (['never', 'running', 'top5', 'out-of-date', 'none', 'few', 'error'].includes(wf) && tab !== 'matches') setTab('matches')
  }, [wf]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Running simulation */
  useEffect(() => {
    if (!running) return
    setProgress(8)
    const iv = window.setInterval(() => setProgress(p => Math.min(96, p + 11)), 220)
    const t = window.setTimeout(() => {
      setRunning(false)
      app.toast(`Ranking finished · top ${Math.min(5, Math.max(ranked.length, 5))} ready`)
    }, 2300)
    return () => { window.clearInterval(iv); window.clearTimeout(t) }
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Derived view ---------- */
  const view: View = running || wf === 'running' ? 'running'
    : wf === 'never' ? 'never'
      : wf === 'none' ? 'none'
        : wf === 'error' ? 'error'
          : wf === 'few' ? 'few'
            : ['top5', 'out-of-date', 'after-rerun', 'eliminated'].includes(wf) ? 'ranked'
              : role.matchStatus === 'not-run' ? 'never' : 'ranked'
  const isLiveish = !['top5', 'out-of-date', 'after-rerun', 'never', 'none', 'few', 'error', 'running'].includes(wf)
  const stale = wf === 'out-of-date' || (isLiveish && role.matchStatus === 'out-of-date')
  const showSummary = view === 'ranked' && !stale && (wf === 'after-rerun' || (isLiveish && summaryOpen))
  const elim = eliminatedByRole[id] ?? {
    pool: POOL_SIZE, pass: role.passCount,
    rules: [
      { rule: 'Location', count: Math.round((POOL_SIZE - role.passCount) * 0.5) },
      { rule: 'Minimum years', count: Math.round((POOL_SIZE - role.passCount) * 0.3) },
      { rule: 'Sub-category', count: Math.round((POOL_SIZE - role.passCount) * 0.35) },
    ],
    rows: [],
  }
  const passCount = view === 'none' ? 0 : view === 'few' ? 3 : role.passCount

  const summaryCounts = id === 'northwind-spm'
    ? { new: 2, moved: 3, requalified: 1, dropped: 2 }
    : { new: all.filter(m => m.delta === 'new').length, moved: all.filter(m => m.delta === 'moved').length, requalified: all.filter(m => m.status === 'requalified').length, dropped: 0 }

  let list = ranked
  if (band !== 'all') list = list.filter(m => m.band === band)
  if (hideDecided) list = list.filter(m => m.status !== 'shortlisted' && m.status !== 'rejected')
  if (showSummary && deltaFilter) {
    list = deltaFilter === 'dropped' ? list.filter(m => m.rank > 5 && m.status !== 'rejected')
      : deltaFilter === 'requalified' ? list.filter(m => m.status === 'requalified')
        : list.filter(m => m.delta === deltaFilter)
  }
  if (view === 'few') list = list.slice(0, 3)
  const visible = viewMode === 'all' || (showSummary && deltaFilter) || view === 'few' ? list : list.slice(0, shown)
  const focusable = visible.filter(m => m.status !== 'rejected')
  const focusedId = focusIdx >= 0 ? focusable[Math.min(focusIdx, focusable.length - 1)]?.id : undefined

  /* ---------- Decisions (store for example roles, session for new roles) ---------- */
  const isV = (m: Match) => m.id.startsWith('v:')
  const vPatch = (mid: string, patch: Partial<Match>) => vSet(v => ({ ...v, [id]: (v[id] ?? []).map(m => (m.id === mid ? { ...m, ...patch } : m)) }))
  const nameOf = (m: Match) => app.candidate(m.candidateId)?.name ?? 'Candidate'
  const noteStale = (verb: string, m: Match) => { if (stale) app.log({ what: `${verb} ${nameOf(m)} · decided on an out-of-date run`, record: label, recordHref: `/roles/${id}`, kind: 'Decisions' }) }

  const doShortlist = (m: Match) => {
    if (m.status === 'shortlisted') return
    setLast({ id: m.id, prev: m.status })
    if (isV(m)) {
      vPatch(m.id, { status: 'shortlisted' })
      app.log({ what: `Shortlisted ${nameOf(m)}`, record: label, recordHref: `/roles/${id}`, kind: 'Decisions' })
      app.toast(`Shortlisted ${nameOf(m)}`, { undo: () => vPatch(m.id, { status: m.status }) })
    } else app.shortlist(m.id)
    noteStale('Shortlisted', m)
  }
  const doReject = (m: Match, reason: string) => {
    setLast({ id: m.id, prev: m.status })
    if (isV(m)) {
      vPatch(m.id, { status: 'rejected', rejectReason: reason })
      app.log({ what: `Rejected ${nameOf(m)} · ${reason}`, record: label, recordHref: `/roles/${id}`, kind: 'Decisions' })
      app.toast(`Rejected ${nameOf(m)}`, { undo: () => vPatch(m.id, { status: m.status }) })
    } else app.reject(m.id, reason)
    noteStale('Rejected', m)
  }
  const doUndo = (m: Match, prev: Match['status'] = 'new') => {
    if (isV(m)) vPatch(m.id, { status: prev, rejectReason: prev === 'rejected' ? m.rejectReason : undefined })
    else if (prev === 'new') app.undoDecision(m.id)
    else app.setMatchStatus(m.id, prev, m.rejectReason)
    app.log({ what: `Undid decision for ${nameOf(m)}`, record: label, recordHref: `/roles/${id}`, kind: 'Decisions' })
    app.toast(`Undid decision for ${nameOf(m)}`)
  }
  const undoLast = () => {
    if (!last) return
    const m = all.find(x => x.id === last.id)
    if (m) doUndo(m, last.prev)
    setLast(null)
  }
  const reorder = (ids: string[]) => {
    if (ids.some(x => x.startsWith('v:'))) {
      vSet(v => {
        const listV = v[id] ?? []
        const rank = new Map(ids.map((x, i) => [x, i]))
        return { ...v, [id]: [...listV.filter(m => !rank.has(m.id)), ...listV.filter(m => rank.has(m.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)] }
      })
    } else app.reorderShortlist(id, ids)
  }
  const ask = (m: Match, chip: MatchChip) => {
    app.addToAskList(m.candidateId, askFor(chip))
    app.log({ what: `Added to ask list: “${askFor(chip)}”`, record: nameOf(m), recordHref: `/candidates/${m.candidateId}`, kind: 'Candidates' })
  }

  const startRun = (kind: 'find' | 'rerun' | 'retry') => {
    if (kind === 'find') app.findMatches(id)
    if (kind === 'rerun') { app.rerun(id); setSummaryOpen(true); setDeltaFilter(null) }
    setFocusIdx(-1); setShown(5); setElimOpen(false)
    if (wf !== 'live') setWf('live')
    setRunning(true)
  }

  const changeStatus = (s: string) => {
    const status = s as RoleStatus
    app.updateRole(id, { status, updated: 'Just now' })
    app.log({ what: `Status changed to ${status}`, record: label, recordHref: `/roles/${id}`, kind: 'Roles', before: role.status, after: status })
    app.toast(`Status changed to ${status}`)
  }

  /* ---------- Keyboard: J/K · Space · S · X · U · E ---------- */
  useEffect(() => {
    if (tab !== 'matches' || (view !== 'ranked' && view !== 'few' && view !== 'none' && view !== 'error')) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return
      if (document.querySelector('[role="dialog"]')) return
      const k = e.key.toLowerCase()
      const cur = focusIdx >= 0 ? focusable[Math.min(focusIdx, focusable.length - 1)] : undefined
      if (k === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(focusable.length - 1, i + 1)) }
      else if (k === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(0, i - 1)) }
      else if (e.key === ' ' && cur && t.tagName !== 'BUTTON') { e.preventDefault(); setPreviewFrom('matches'); setPreviewId(cur.candidateId) }
      else if (k === 's' && cur) { e.preventDefault(); doShortlist(cur) }
      else if (k === 'x' && cur) { e.preventDefault(); setRejectTarget(cur) }
      else if (k === 'u') { e.preventDefault(); undoLast() }
      else if (k === 'e') { e.preventDefault(); setElimOpen(o => !o) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  /* ---------- Top bar ---------- */
  const pill = stale
    ? <span className="inline-flex h-6 items-center gap-1 rounded-md border border-warning/50 bg-warning/[0.07] px-2 text-[11px] font-medium text-[#b45309]"><AlertTriangle className="size-3" />Out of date</span>
    : <span className="inline-flex h-6 items-center rounded-md border border-border px-2 font-mono text-[11px] text-foreground">JD v{role.jdVersion}</span>
  useTopBar([{ label: 'Roles', to: '/roles' }, { label: role.title }], pill, [stale, role.jdVersion, id])

  const versions = Array.from({ length: role.jdVersion }, (_, i) => {
    const v = role.jdVersion - i
    return { v: `JD v${v}`, who: v === 1 ? 'Vandit D.' : 'Purvesh N.', when: i === 0 ? role.updated : v === 1 ? '2 weeks ago' : `${i * 3} days ago` }
  })

  const previewList = previewFrom === 'shortlist' ? shortlisted.map(m => m.candidateId) : focusable.map(m => m.candidateId)
  const previewMatch = previewId ? all.find(m => m.candidateId === previewId) : undefined

  /* ---------- Matches tab ---------- */
  const renderRow = (m: Match) => {
    const c = app.candidate(m.candidateId)
    if (!c) return null
    const loc = candidateLocation(c)
    const fIdx = focusable.findIndex(x => x.id === m.id)
    return (
      <MatchRow key={m.id}
        rank={m.rank} initials={c.initials} title={c.name} subtitle={`${c.headline}${loc ? ` · ${loc}` : ''}`}
        candidate={c}
        band={m.band} score={m.score} reason={m.reason} chips={m.chips}
        status={m.status} rejectReason={m.rejectReason} delta={m.delta === 'requalified' ? undefined : m.delta}
        dimmed={stale} focused={m.id === focusedId}
        onPreview={() => { setFocusIdx(fIdx); setPreviewFrom('matches'); setPreviewId(c.id) }}
        onShortlist={() => doShortlist(m)}
        onReject={() => setRejectTarget(m)}
        onUndo={() => doUndo(m)}
        onAddToAsk={chip => ask(m, chip)}
      />
    )
  }

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented aria-label="View" value={viewMode} onChange={setViewMode} options={[{ value: 'top', label: 'Top 5' }, { value: 'all', label: 'All ranked' }]} />
        <Select aria-label="Band" value={band} onChange={v => setBand(v as 'all' | Band)} options={[{ value: 'all', label: 'All bands' }, 'Strong', 'Good', 'Stretch']} />
        <Switch checked={hideDecided} onChange={setHideDecided} label="Hide decided" />
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] text-muted-foreground xl:inline">J/K move · Space preview · S shortlist · X reject · U undo · E eliminated</span>
        <Menu width={200}
          trigger={({ toggle }) => <Button variant="ghost" size="icon" aria-label="More matching actions" onClick={toggle} icon={<MoreHorizontal />} />}
          items={[{ label: 'Force rerun', icon: <RefreshCw />, onSelect: () => setRerunOpen('force') }]} />
      </div>
    </div>
  )

  const eliminatedView = elimOpen && (
    <EliminatedView
      pool={elim.pool} pass={passCount} rules={elim.rules} rows={elim.rows}
      included={app.included[id] ?? []}
      onInclude={row => setIncludeTarget(row)}
      onClose={() => setElimOpen(false)}
      noneMode={view === 'none'}
    />
  )

  const matchesTab = (() => {
    if (view === 'never') {
      return (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState icon={<Sparkles />} title="No matches yet"
            body="Matching hasn't run for this role yet. Find the best candidates in your pool."
            action={
              <div className="flex flex-col items-center gap-2">
                <Button variant="chroma" icon={<Sparkles />} onClick={() => startRun('find')}>Find matches</Button>
                <span className="text-xs text-muted-foreground">~<span className="font-mono tnum">{role.passCount}</span> of <span className="font-mono tnum">{POOL_SIZE}</span> candidates pass the must-haves</span>
              </div>
            } />
        </div>
      )
    }
    if (view === 'running') {
      return (
        <div className="space-y-4">
          <Banner variant="info" progress={wf === 'running' ? 45 : progress}>
            Ranking <span className="font-mono tnum">{role.passCount}</span> candidates… <span className="text-muted-foreground">You can keep working. We'll let you know when it's ready.</span>
          </Banner>
          <FunnelLine pool={elim.pool} pass={role.passCount} top={5} />
          <div className="space-y-2" aria-hidden>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)}</div>
        </div>
      )
    }
    if (view === 'none') {
      return (
        <div className="space-y-4">
          <FunnelLine pool={elim.pool} pass={0} top={0} onSeeEliminated={() => setElimOpen(o => !o)} eliminatedOpen={elimOpen} />
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState icon={<Filter />} title="No one passes"
              body="No candidates pass all must-haves. 23 fail only on location."
              action={<div className="flex gap-2"><Button onClick={() => setElimOpen(true)}>See them</Button><Button variant="ghost" icon={<Pencil />} onClick={() => navigate(`/roles/${id}/edit`)}>Edit must-haves</Button></div>} />
          </div>
          {eliminatedView}
        </div>
      )
    }
    return (
      <div className="space-y-4">
        {view === 'error' && (
          <Banner variant="error" actions={<Button onClick={() => startRun('retry')}>Try again</Button>}>
            Matching didn't finish. Nothing was changed.
          </Banner>
        )}
        {stale && view === 'ranked' && (
          <Banner variant="warning" actions={<Button variant="primary" icon={<RefreshCw />} onClick={() => setRerunOpen('normal')}>Rerun matching</Button>}>
            <span className="font-medium">Out of date.</span> {role.outOfDateReason ?? DEFAULT_REASON} <span className="font-mono tnum">{role.passCount}</span> candidates will be re-ranked.
          </Banner>
        )}
        {showSummary && (
          <RerunSummary counts={summaryCounts} active={deltaFilter} onSelect={k => setDeltaFilter(k as DeltaFilter | null)}
            onDismiss={() => { setSummaryOpen(false); setDeltaFilter(null); if (wf === 'after-rerun') setWf('live') }} />
        )}
        <FunnelLine pool={elim.pool} pass={passCount} top={Math.min(5, list.length)} onSeeEliminated={() => setElimOpen(o => !o)} eliminatedOpen={elimOpen} />
        {view === 'few' && <InfoNote>Only 3 candidates pass the must-haves. All of them are shown.</InfoNote>}
        {toolbar}
        {showSummary && deltaFilter && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{{ new: 'New in top 5', moved: 'Moved', requalified: 'Re-qualified', dropped: 'Dropped out' }[deltaFilter]}</span>
            <Button variant="link" className="text-xs" onClick={() => setDeltaFilter(null)}>Show all</Button>
          </div>
        )}
        {eliminatedView}
        <div className="space-y-2" aria-label="Ranked matches">
          {visible.length ? visible.map(renderRow) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No matches with these filters. <Button variant="link" className="text-sm" onClick={() => { setBand('all'); setHideDecided(false); setDeltaFilter(null) }}>Clear filters</Button>
            </div>
          )}
        </div>
        {viewMode === 'top' && !(showSummary && deltaFilter) && view !== 'few' && list.length > shown && (
          <div className="flex justify-center"><Button variant="ghost" icon={<ChevronDown />} onClick={() => setShown(s => s + 5)}>Show next 5</Button></div>
        )}
        <span className="sr-only" aria-live="polite">{!running && view === 'ranked' ? `Ranking finished: ${Math.min(5, list.length)} candidates` : ''}</span>
      </div>
    )
  })()

  return (
    <ScrollPage>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2"><h1 className="text-lg title-type text-foreground">{role.title}</h1><ExampleMark /></div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="text-foreground">{role.company}</span><CompanyTypeTag type={role.companyType} />
            <span className="text-gray-800">·</span><span>{role.category} · {role.subcategory}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Role status" value={role.status} onChange={changeStatus} options={['Open', 'On hold', 'Closed']} />
          <VersionChip label={`JD v${role.jdVersion}`} versions={versions} onCompare={() => setCompareOpen(true)} />
          <Button variant="outline" icon={<Pencil />} onClick={() => navigate(`/roles/${id}/edit`)}>Edit role</Button>
        </div>
      </header>

      <div className="border-b border-border pb-2">
        <PillTabs value={tab} onChange={setTab}
          tabs={[
            { value: 'matches', label: 'Matches' },
            { value: 'shortlist', label: 'Shortlist', count: shortlisted.length },
            { value: 'details', label: 'Details' },
            { value: 'history', label: 'History' },
          ]} />
      </div>

      {tab === 'matches' && matchesTab}
      {tab === 'shortlist' && (
        <ShortlistTab role={role} items={shortlisted}
          onReorder={reorder}
          onRemove={m => doUndo(m)}
          onPreview={cid => { setPreviewFrom('shortlist'); setPreviewId(cid) }}
          onCopyEmail={() => setEmailOpen(true)}
          onGoMatches={() => setTab('matches')} />
      )}
      {tab === 'details' && <DetailsTab role={role} versions={versions} onCompare={() => setCompareOpen(true)} />}
      {tab === 'history' && <HistoryTab roleId={id} />}

      {/* Overlays */}
      <CandidatePreview open={!!previewId} onClose={() => setPreviewId(null)} candidateId={previewId} list={previewList}
        onNavigate={cid => { setPreviewId(cid); const i = focusable.findIndex(m => m.candidateId === cid); if (i >= 0) setFocusIdx(i) }}
        match={previewMatch}
        onShortlist={previewMatch ? () => doShortlist(previewMatch) : undefined}
        onReject={previewMatch ? () => setRejectTarget(previewMatch) : undefined} />
      <RejectDialog open={!!rejectTarget} onClose={() => setRejectTarget(null)}
        candidateName={rejectTarget ? nameOf(rejectTarget) : ''} roleTitle={role.title}
        onConfirm={reason => { if (rejectTarget) doReject(rejectTarget, reason) }} />
      <RerunDialog open={!!rerunOpen} onClose={() => setRerunOpen(null)} roleLabel={label} count={role.passCount}
        force={rerunOpen === 'force' && !stale} onConfirm={() => startRun('rerun')} />
      <IncludeAnywayDialog open={!!includeTarget} onClose={() => setIncludeTarget(null)}
        candidateName={includeTarget ? app.candidate(includeTarget.candidateId)?.name ?? '' : ''} failing={includeTarget?.failing ?? []}
        onConfirm={note => { if (includeTarget) { app.includeAnyway(id, includeTarget.candidateId, note); setViewMode('all') } }} />
      <CopyEmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} candidateIds={shortlisted.map(m => m.candidateId)} roleId={id} />
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} width={560}
        title={`Compare JD v${Math.max(1, role.jdVersion - 1)} with v${role.jdVersion} (current)`}
        description="What changed in the role between versions."
        footer={<Button variant="primary" data-autofocus onClick={() => setCompareOpen(false)}>Close</Button>}>
        {role.jdVersion > 1 ? (
          <div className="divide-y divide-border">
            {jdChangesNorthwind.map(c => (
              <div key={c.id} className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium">{c.field}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-sm"><span className="text-muted-foreground line-through decoration-gray-800">{c.from}</span><span className="text-gray-800">→</span><span className="font-medium">{c.to}</span><SourceBadge kind={c.source} /></span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">This is the first version. Nothing to compare yet.</p>}
      </Dialog>
    </ScrollPage>
  )
}

/* ---------- §6.4 Eliminated view ---------- */
function EliminatedView({ pool, pass, rules, rows, included, onInclude, onClose, noneMode }: {
  pool: number; pass: number; rules: { rule: string; count: number }[]; rows: Eliminated[]; included: string[]
  onInclude: (r: Eliminated) => void; onClose: () => void; noneMode?: boolean
}) {
  const { candidate } = useApp()
  const sorted = [...rows].sort((a, b) => a.failing.length - b.failing.length)
  const near = sorted.filter(r => r.failing.length === 1)
  const rest = sorted.filter(r => r.failing.length > 1)
  const Row = ({ r }: { r: Eliminated }) => {
    const c = candidate(r.candidateId)
    if (!c) return null
    const done = included.includes(r.candidateId)
    return (
      <li className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
        <Avatar initials={c.initials} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{c.name}</div>
          <div className="truncate text-xs text-muted-foreground">{c.headline}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">{r.failing.map(f => <MatchChipView key={f} chip={{ kind: 'gap', label: f }} />)}</div>
        {done
          ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3.5" />Included in ranking</span>
          : <Button variant="ghost" onClick={() => onInclude(r)}>Include anyway</Button>}
      </li>
    )
  }
  return (
    <BezelCard icon={<Filter />} title={<span className="flex items-center gap-2">Eliminated <span className="font-mono text-xs font-normal text-muted-foreground tnum">{pool - pass}</span></span>}
      action={<Button variant="ghost" size="sm" onClick={onClose} iconRight={<X />}>Hide</Button>}
      description="A candidate can fail more than one rule, so the counts add up to more than the total. No must-have is final: include anyone who deserves a look.">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {rules.map(r => (
            <span key={r.rule} className="inline-flex h-7 items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-xs">
              {r.rule}<span className="font-mono text-muted-foreground tnum">{r.count}</span>
            </span>
          ))}
        </div>
        {noneMode && <InfoNote>23 candidates fail only on location. Widening location, or including them, is the fastest way to a shortlist.</InfoNote>}
        {near.length > 0 && (
          <div className="space-y-2">
            <div className="eyebrow text-[10px] text-gray-1000">Near misses · fail exactly 1 rule</div>
            <ul className="divide-y divide-border">{near.map(r => <Row key={r.candidateId} r={r} />)}</ul>
          </div>
        )}
        {rest.length > 0 && (
          <div className="space-y-2">
            <div className="eyebrow text-[10px] text-gray-1000">Fail 2 or more rules</div>
            <ul className="divide-y divide-border">{rest.map(r => <Row key={r.candidateId} r={r} />)}</ul>
          </div>
        )}
        {!rows.length && <p className="text-sm text-muted-foreground">No named examples for this role. Counts above show where candidates were eliminated.</p>}
      </div>
    </BezelCard>
  )
}

/* ---------- Shortlist tab ---------- */
function ShortlistTab({ role, items, onReorder, onRemove, onPreview, onCopyEmail, onGoMatches }: {
  role: Role; items: Match[]; onReorder: (ids: string[]) => void; onRemove: (m: Match) => void; onPreview: (cid: string) => void
  onCopyEmail: () => void; onGoMatches: () => void
}) {
  const app = useApp()
  const navigate = useNavigate()
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const isClient = role.companyType === 'Client'
  const ids = items.map(m => m.candidateId)
  const types: OutputType[] = isClient ? ['Masked', 'Tailored', 'As-is'] : ['Masked']
  const outFor = (cid: string, type: OutputType) => app.outputs.find(o => o.candidateId === cid && o.type === type && (o.roleId === role.id || (type === 'Masked' && o.roleId === null)))
  const readyCount = items.filter(m => types.some(t => outFor(m.candidateId, t))).length

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return
    const next = items.map(m => m.id)
    const [x] = next.splice(from, 1)
    next.splice(to, 0, x)
    onReorder(next)
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState icon={<ListChecks />} title="No one shortlisted yet"
          body="Shortlist candidates from the Matches tab. Their order here carries into the email and downloads."
          action={<Button onClick={onGoMatches}>Review matches</Button>} />
      </div>
    )
  }

  const masked = () => navigate(`/resumes/masked?role=${role.id}&candidates=${ids.join(',')}`)
  const tailored = () => navigate(`/resumes/tailored?role=${role.id}&candidates=${ids.join(',')}`)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground"><span className="font-mono text-foreground tnum">{items.length}</span> shortlisted · drag to set the order clients see</div>
        <div className="flex flex-wrap items-center gap-2">
          {isClient && <Button variant="primary" icon={<FileText />} onClick={tailored}>Prepare resumes for client</Button>}
          <Button variant={isClient ? 'outline' : 'primary'} icon={<Sparkles />} onClick={masked}>Generate masked resumes</Button>
          <Button variant="outline" icon={<Mail />} onClick={onCopyEmail}>Copy email text</Button>
          <Button variant="outline" icon={<Download />} disabled={!readyCount} title={readyCount ? undefined : 'No resumes generated yet'}
            onClick={() => { app.toast(`Downloaded ${readyCount} resume${readyCount === 1 ? '' : 's'} as one ZIP`); app.log({ what: `Downloaded ${readyCount} resumes (ZIP)`, record: `${role.title} — ${role.company}`, recordHref: `/roles/${role.id}`, kind: 'Outputs' }) }}>
            Download all
          </Button>
        </div>
      </div>
      {!isClient && <InfoNote>Prospect role: masked resumes are the only output here, so identities never reach a prospect by mistake.</InfoNote>}

      <ol className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Shortlist order">
        <li className="hidden h-9 items-center gap-4 border-b border-border bg-secondary/70 px-4 sm:flex" aria-hidden>
          <span className="eyebrow w-12 text-[10px] text-gray-1000">Order</span>
          <span className="eyebrow flex-1 text-[10px] text-gray-1000">Candidate</span>
          <span className="eyebrow w-[260px] text-[10px] text-gray-1000">Outputs</span>
          <span className="w-[176px]" />
        </li>
        {items.map((m, i) => {
          const c = app.candidate(m.candidateId)
          if (!c) return null
          return (
            <li key={m.id} draggable
              onDragStart={e => { setDrag(i); e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={e => { e.preventDefault(); setOver(i) }}
              onDrop={e => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null) }}
              onDragEnd={() => { setDrag(null); setOver(null) }}
              className={cn('flex flex-wrap items-center gap-4 border-b border-border px-4 py-3 transition-colors last:border-0',
                drag === i && 'opacity-50', over === i && drag !== null && drag !== i && 'bg-muted')}>
              <div className="flex w-12 items-center gap-1.5">
                <GripVertical className="size-4 cursor-grab text-gray-800" aria-hidden />
                <span className="font-mono text-xs text-gray-1000 tnum">{i + 1}</span>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar initials={c.initials} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.headline}</div>
                </div>
              </div>
              <div className="flex w-[260px] flex-wrap items-center gap-1.5">
                {types.map(t => {
                  const o = outFor(c.id, t)
                  return (
                    <span key={t} title={o ? `${t} · ${o.template} · ${o.created}` : `No ${t.toLowerCase()} resume yet`}
                      className={cn('inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-xs',
                        o?.stale ? 'border-dashed border-warning text-[#b45309]' : o ? 'border-border bg-background text-foreground' : 'border-border bg-muted/50 text-muted-foreground')}>
                      {t}
                      {o?.stale ? <><AlertTriangle className="size-3" />Stale</> : o ? <Check className="size-3" /> : <span aria-label="none">—</span>}
                    </span>
                  )
                })}
              </div>
              <div className="flex w-[176px] items-center justify-end gap-1">
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)} icon={<ArrowUp />} />
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${c.name} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)} icon={<ArrowDown />} />
                <Button size="sm" onClick={() => onPreview(c.id)}>Preview</Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${c.name} from shortlist`} title="Remove from shortlist" onClick={() => onRemove(m)} icon={<X />} />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ---------- Details tab ---------- */
function DetailsTab({ role, versions, onCompare }: { role: Role; versions: { v: string; who: string; when: string }[]; onCompare: () => void }) {
  const yn = (v: 'Yes' | 'No' | 'Unknown') => (v === 'Unknown' ? <span className="text-muted-foreground">Unknown</span> : v)
  const Text = ({ v }: { v?: string }) => (v ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{v}</p> : <NotCaptured />)
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <BezelCard title="Company">
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Company">{role.company}</Fact>
            <Fact label="Type"><CompanyTypeTag type={role.companyType} /></Fact>
            <Fact label="Source">{role.companySource}</Fact>
            <Fact label="Posting">{role.postingUrl ? <a href={role.postingUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{role.postingUrl.replace(/^https?:\/\//, '')}</a> : <span className="text-muted-foreground">—</span>}</Fact>
          </div>
        </BezelCard>
        <BezelCard title="Must-haves" description="Candidates who fail any of these are eliminated before ranking.">
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Minimum years"><span className="flex items-center gap-2"><span className="tnum">{role.minYears}+ yrs</span><SourceBadge kind="JD" /></span></Fact>
            <Fact label="Location"><span className="flex items-center gap-2">{role.location || <NotCaptured />}<SourceBadge kind="JD" /></span></Fact>
            <Fact label="Work mode"><span className="flex items-center gap-2">{role.workMode}<SourceBadge kind="JD" /></span></Fact>
            <Fact label="Relocation accepted">{role.relocationAccepted === null ? <NotCaptured /> : role.relocationAccepted ? 'Yes' : 'No'}</Fact>
            <Fact label="Sponsorship offered">{yn(role.sponsorship)}</Fact>
            <Fact label="Visa transfer supported">{yn(role.transfer)}</Fact>
          </div>
          <div className="mt-4 space-y-2">
            <div className="eyebrow text-[10px] text-gray-1000">Must-have skills</div>
            <div className="flex flex-wrap gap-1.5">{role.mustSkills.map(s => <Tag key={s} tone="dark">{s}</Tag>)}</div>
          </div>
        </BezelCard>
        <BezelCard title="Nice-to-haves">
          <div className="flex flex-wrap gap-1.5">{role.niceSkills.length ? role.niceSkills.map(s => <Tag key={s}>{s}</Tag>) : <span className="text-sm text-muted-foreground">None</span>}</div>
        </BezelCard>
        <BezelCard title="Pay">
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Range">{role.pay && role.pay !== '—' ? <span className="tnum">{role.pay}</span> : <NotCaptured />}</Fact>
            <Fact label="Seniority">{role.seniority}</Fact>
          </div>
        </BezelCard>
      </div>
      <div className="space-y-6">
        <BezelCard title="Context">
          <div className="space-y-4">
            <Fact label="What good looks like · past hires"><Text v={role.whatGood} /></Fact>
            <Fact label="Hiring team / founder research"><Text v={role.research} /></Fact>
            <Fact label="Interview process"><Text v={role.interview} /></Fact>
          </div>
        </BezelCard>
        <BezelCard title="Job description" action={<span className="font-mono text-[11px] text-muted-foreground">JD v{role.jdVersion}</span>}>
          {role.jdText
            ? <pre className="max-h-[360px] overflow-auto font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-gray-1100">{role.jdText}</pre>
            : <p className="text-sm text-muted-foreground">No JD text saved for this role.</p>}
        </BezelCard>
        <BezelCard title="Version history">
          <ul className="divide-y divide-border">
            {versions.map((v, i) => (
              <li key={v.v} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="font-mono text-xs">{v.v}</span>
                <span className="flex-1 text-xs text-muted-foreground">{v.who} · {v.when}</span>
                {i === 0 ? <span className="eyebrow text-[9px] text-gray-1000">Current</span> : <Button variant="ghost" size="sm" onClick={onCompare}>Compare</Button>}
              </li>
            ))}
          </ul>
        </BezelCard>
      </div>
    </div>
  )
}

/* ---------- History tab ---------- */
function HistoryTab({ roleId }: { roleId: string }) {
  const { activity } = useApp()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const entries = activity.filter(e => e.recordHref === `/roles/${roleId}`)
  if (!entries.length) {
    return <div className="rounded-2xl border border-border bg-card"><EmptyState icon={<FileText />} title="No history yet" body="Edits, runs, decisions, overrides and outputs for this role will show here." /></div>
  }
  const initials = (who: string) => who.split(/\s+/).map(s => s[0]).join('').replace(/[^A-Z]/gi, '').slice(0, 2).toUpperCase()
  return (
    <ol className="overflow-hidden rounded-xl border border-border bg-card">
      {entries.map(e => {
        const expandable = !!(e.before || e.after)
        const isOpen = open[e.id]
        return (
          <li key={e.id} className="border-b border-border px-4 py-3 last:border-0">
            <div className="flex items-start gap-3">
              <Avatar initials={initials(e.who)} size={24} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><span className="font-medium">{e.who}</span> <span className="text-gray-1100">{e.what}</span></p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="eyebrow text-[9px] text-gray-1000">{e.kind}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{e.when}</span>
                </div>
              </div>
              {expandable && (
                <Button variant="ghost" size="sm" aria-expanded={!!isOpen} iconRight={isOpen ? <ChevronDown /> : <ChevronRight />}
                  onClick={() => setOpen(o => ({ ...o, [e.id]: !o[e.id] }))}>{isOpen ? 'Hide change' : 'Show change'}</Button>
              )}
            </div>
            {expandable && isOpen && (
              <div className="mt-3 ml-9 grid gap-2 rounded-lg border border-border bg-background p-3 text-sm sm:grid-cols-2">
                <div><div className="eyebrow mb-1 text-[9px] text-gray-1000">Before</div><span className="text-muted-foreground">{e.before ?? '—'}</span></div>
                <div><div className="eyebrow mb-1 text-[9px] text-gray-1000">After</div><span>{e.after ?? '—'}</span></div>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export type { React }
