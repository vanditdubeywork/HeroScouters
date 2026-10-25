import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Download, Eye, FileText, Filter, GripVertical,
  History as HistoryIcon, ListChecks, Mail, MessageSquarePlus, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Send, Shield, Sparkles, Table2, UserX, Wand2, X,
} from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import {
  Avatar, BezelCard, Button, Checkbox, CompanyTypeTag, EmptyState, ExampleMark, Fact, Menu, PillTabs, Select, Skeleton, cn,
} from '../components/ui'
import {
  Banner, Dialog, FunnelLine, InfoNote, MatchChipView, MatchRow, NotCaptured, RerunSummary, SourceBadge, VersionChip, candidateLocation,
} from '../components/hs'
import {
  AlignmentPills, FilterBar, type FilterField, type FilterState, GatedButton, RequirementRow, ScoreControl, SelectionBar, ShortcutHint, ShortcutSheet, applyFilters, useListSelection,
} from '../components/v3'
import { CandidatePreview } from './CandidatePreview'
import { RoleMaskedLinksSection } from './MaskedRoleView'
import { BulkMaskForRoleDialog } from '../components/BulkMaskModal'
import { AddRequirementDialog, ConfirmAssumedDialog, CopyEmailDialog, CreateGmailDraftsDialog, IncludeAnywayDialog, NotInterestedDialog, RejectDialog, RerunDialog } from './Dialogs'
import { useApp, useWireframeState, whoCanText } from '../store/AppStore'
import { POOL_SIZE, eliminatedByRole, jdChangesNorthwind } from '../data/mock'
import { type Eliminated, type EmailDraftKind, type Match, type MatchChip, type OutputType, type Role, type RoleStatus } from '../data/types'

/* ==========================================================================
   S-04 · Role page — the core screen (PRD v0.3).
   Matches (default) · Shortlist (n) · Details (includes Client asks + Recent activity)
   ========================================================================== */

type Tab = 'matches' | 'shortlist' | 'masked-links' | 'details' | 'history'
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
  const isScored = role.scoredCount > 0 && role.matchStatus !== 'not-run'
  return all
    .filter(m => m.roleId === tpl.id && !m.id.startsWith('inc-'))
    .map((m, i) => ({
      ...m,
      id: `v:${role.id}:${m.id}`,
      roleId: role.id,
      scored: isScored ? m.scored : false,
      similarity: m.similarity ?? i + 1,
      status: 'new' as const,
      rejectReason: undefined,
      delta: undefined,
    }))
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
  { id: 'not-scored', label: 'Not scored yet (stage-1 passers)' },
  { id: 'never', label: 'Never run' },
  { id: 'running', label: 'Running' },
  { id: 'top5', label: 'Scored (up to date)' },
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
  const rawTab = params.get('tab') ?? ''
  const tab: Tab = rawTab === 'shortlist' ? 'shortlist' : rawTab === 'masked-links' ? 'masked-links' : rawTab === 'details' ? 'details' : rawTab === 'history' ? 'history' : 'matches'
  const setTab = (t: Tab) => { const p = new URLSearchParams(params); p.set('tab', t); setParams(p, { replace: true }) }
  const [wf, setWf] = useWireframeState('S-04', 'Role page', WF_STATES)

  const vm = useVirtualMatches()
  const own = useMemo(() => app.matches.filter(m => m.roleId === id), [app.matches, id])
  const virtual = vm[id] ?? []
  const all = useMemo(() => [...own, ...virtual], [own, virtual])
  const shortlisted = all.filter(m => m.status === 'shortlisted')
  const label = `${role.title} — ${role.company}`

  /* Local UI state */
  const [running, setRunning] = useState(false)
  const [scoringCount, setScoringCount] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [deltaFilter, setDeltaFilter] = useState<DeltaFilter | null>(null)
  const [elimOpen, setElimOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})
  const [unscoredOpen, setUnscoredOpen] = useState(true)
  const [focusIdx, setFocusIdx] = useState(-1)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewFrom, setPreviewFrom] = useState<'matches' | 'shortlist'>('matches')
  const [rejectTarget, setRejectTarget] = useState<Match | null>(null)
  const [batchRejectOpen, setBatchRejectOpen] = useState(false)
  const [confirmAssumedOpen, setConfirmAssumedOpen] = useState(false)
  const [addAskOpen, setAddAskOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [includeTarget, setIncludeTarget] = useState<Eliminated | null>(null)
  const [rerunOpen, setRerunOpen] = useState<null | 'normal' | 'force'>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [emailCandidateIds, setEmailCandidateIds] = useState<string[] | null>(null)
  const [emailInitialKind, setEmailInitialKind] = useState<EmailDraftKind | undefined>(undefined)
  const [notInterestedCandId, setNotInterestedCandId] = useState<string | null>(null)
  const [bulkMaskCandIds, setBulkMaskCandIds] = useState<string[] | null>(null)
  const [last, setLast] = useState<{ id: string; prev: Match['status'] } | null>(null)

  /* Seed session matches for roles without explicit matches in mock.ts */
  useEffect(() => {
    if (own.length === 0 && !vMatches[id]) {
      vSet(v => ({ ...v, [id]: seedFor(role, app.matches, app.roles) }))
    }
  }, [own.length, id]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (['not-scored', 'never', 'running', 'top5', 'out-of-date', 'none', 'few', 'error'].includes(wf) && tab !== 'matches') setTab('matches')
  }, [wf]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Running / scoring progress simulation */
  useEffect(() => {
    if (!running && scoringCount === null) return
    setProgress(12)
    const iv = window.setInterval(() => setProgress(p => Math.min(96, p + 14)), 180)
    const t = window.setTimeout(() => {
      setRunning(false)
      setScoringCount(null)
    }, 1600)
    return () => { window.clearInterval(iv); window.clearTimeout(t) }
  }, [running, scoringCount])

  /* ---------- Derived view & scoring state ---------- */
  const forceNotScored = wf === 'not-scored' || wf === 'never'
  const isRowScored = (m: Match) => !forceNotScored && m.scored

  const view: View = wf === 'running' ? 'running'
    : wf === 'none' ? 'none'
      : wf === 'error' ? 'error'
        : wf === 'few' ? 'few'
          : 'ranked'

  const isLiveish = !['top5', 'out-of-date', 'after-rerun', 'not-scored', 'never', 'none', 'few', 'error', 'running'].includes(wf)
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

  /* ---------- FilterBar fields (N17) ---------- */
  const filterFields = useMemo<FilterField<Match>[]>(() => [
    {
      key: 'recommendation',
      label: 'Recommendation',
      kind: 'values',
      options: ['Strong', 'Mild', 'Not recommended'],
      pinned: true,
      get: m => (!forceNotScored && m.scored)
        ? (m.recommendation ?? (m.band === 'Strong' ? 'Strong' : m.band === 'Good' ? 'Mild' : 'Not recommended'))
        : null,
    },
    {
      key: 'status',
      label: 'Decision status',
      kind: 'values',
      options: ['New', 'Shortlisted', 'Rejected', 'Re-qualified', 'Not interested'],
      pinned: true,
      get: m => ({
        new: 'New',
        shortlisted: 'Shortlisted',
        rejected: 'Rejected',
        requalified: 'Re-qualified',
        'not-interested': 'Not interested',
      }[m.status]),
    },
    {
      key: 'scored',
      label: 'Scored or not',
      kind: 'values',
      options: ['Scored', 'Not scored'],
      get: m => (!forceNotScored && m.scored) ? 'Scored' : 'Not scored',
    },
    {
      key: 'assumed',
      label: 'Has assumed must-haves',
      kind: 'values',
      options: ['Yes', 'No'],
      get: m => {
        const c = app.candidate(m.candidateId)
        const hasAssumed = m.chips.some(ch => ch.kind === 'assumed') || !c?.workAuth.status || !c?.metro || c?.years === null
        return hasAssumed ? 'Yes' : 'No'
      },
    },
    {
      key: 'workAuth',
      label: 'Work authorization',
      kind: 'values',
      get: m => {
        const w = app.candidate(m.candidateId)?.workAuth
        if (!w?.status) return null
        return w.visaType ? [w.status, w.visaType] : [w.status]
      },
    },
    {
      key: 'sponsorship',
      label: 'Needs sponsorship',
      kind: 'values',
      options: ['Yes', 'No'],
      get: m => {
        const w = app.candidate(m.candidateId)?.workAuth
        if (w?.needsSponsorship == null) return null
        return w.needsSponsorship ? 'Yes' : 'No'
      },
    },
    {
      key: 'years',
      label: 'Years of experience',
      kind: 'number',
      unit: 'yrs',
      num: m => app.candidate(m.candidateId)?.years ?? null,
    },
    {
      key: 'location',
      label: 'Location',
      kind: 'values',
      get: m => app.candidate(m.candidateId)?.metro ?? null,
    },
    {
      key: 'workMode',
      label: 'Work mode',
      kind: 'values',
      options: ['Remote', 'Hybrid', 'Onsite'],
      get: m => app.candidate(m.candidateId)?.workModes ?? null,
    },
    {
      key: 'domain',
      label: 'Domain',
      kind: 'multi',
      get: m => app.candidate(m.candidateId)?.domains ?? null,
    },
    {
      key: 'skills',
      label: 'Skills',
      kind: 'multi',
      get: m => {
        const c = app.candidate(m.candidateId)
        return c?.skills.length ? c.skills : null
      },
    },
    {
      key: 'resumeLabel',
      label: 'Resume label',
      kind: 'values',
      get: m => app.resumesFor(m.candidateId).map(r => r.label),
    },
  ], [app, forceNotScored])

  const filteredMatches = useMemo(() => {
    let base = applyFilters(all, filterFields, filters)
    if (showSummary && deltaFilter) {
      base = deltaFilter === 'dropped' ? base.filter(m => m.rank > 5 && m.status !== 'rejected' && m.status !== 'not-interested')
        : deltaFilter === 'requalified' ? base.filter(m => m.status === 'requalified')
          : base.filter(m => m.delta === deltaFilter)
    }
    if (view === 'few') base = base.slice(0, 3)
    return base
  }, [all, filterFields, filters, showSummary, deltaFilter, view])

  const notInterestedRows = useMemo(
    () => all.filter(m => m.status === 'not-interested'),
    [all],
  )
  const activeFilteredMatches = useMemo(
    () => filteredMatches.filter(m => m.status !== 'not-interested'),
    [filteredMatches],
  )

  const allScoredCount = all.filter(m => m.status !== 'not-interested' && isRowScored(m)).length
  const notScoredYetMode = allScoredCount === 0

  const scoredRows = useMemo(
    () => activeFilteredMatches.filter(m => isRowScored(m)).sort((a, b) => a.rank - b.rank),
    [activeFilteredMatches, forceNotScored], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const unscoredRows = useMemo(
    () => activeFilteredMatches.filter(m => !isRowScored(m)).sort((a, b) => a.similarity - b.similarity),
    [activeFilteredMatches, forceNotScored], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const totalUnscoredPool = all.filter(m => !isRowScored(m) && m.status !== 'rejected' && m.status !== 'not-interested').length

  /* Visible rows for keyboard navigation & selection */
  const visibleRows = useMemo(() => {
    if (notScoredYetMode) {
      return unscoredRows
    }
    return [...scoredRows, ...(unscoredOpen ? unscoredRows : [])]
  }, [notScoredYetMode, scoredRows, unscoredRows, unscoredOpen])

  const focusable = useMemo(() => visibleRows.filter(m => m.status !== 'rejected' && m.status !== 'not-interested'), [visibleRows])
  const selectableIds = useMemo(() => focusable.map(m => m.id), [focusable])
  const sel = useListSelection(selectableIds)
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
    const q = chip.label.toLowerCase().startsWith('confirm ')
      ? (chip.label.endsWith('?') ? chip.label : `${chip.label}?`)
      : askFor(chip)
    app.addToAskList(m.candidateId, q)
    app.log({ what: `Added to ask list: “${q}”`, record: nameOf(m), recordHref: `/candidates/${m.candidateId}`, kind: 'Candidates' })
  }

  const triggerScore = (n: number) => {
    if (wf !== 'live') setWf('live')
    setScoringCount(n)
    const count = app.scoreMatches(id, n)
    if (count === 0 && virtual.length > 0) {
      vSet(v => {
        const listV = v[id] ?? []
        let left = n
        return {
          ...v,
          [id]: listV.map(m => {
            if (!m.scored && m.status !== 'rejected' && m.status !== 'not-interested' && left > 0) {
              left--
              return { ...m, scored: true }
            }
            return m
          }),
        }
      })
      app.updateRole(id, { scoredCount: role.scoredCount + n, aiScoresUsed: role.aiScoresUsed + n, matchStatus: 'up-to-date' })
    }
  }

  const startRun = (kind: 'find' | 'rerun' | 'retry', opts?: { alsoScoreNew?: boolean }) => {
    if (kind === 'find') app.findMatches(id)
    if (kind === 'rerun') {
      app.rerun(id)
      if (opts?.alsoScoreNew) app.scoreMatches(id, app.defaultScoreCount)
      setSummaryOpen(true)
      setDeltaFilter(null)
    }
    setFocusIdx(-1); setElimOpen(false)
    if (wf !== 'live') setWf('live')
    setRunning(true)
  }

  const changeStatus = (s: string) => {
    const status = s as RoleStatus
    app.updateRole(id, { status, updated: 'Just now' })
    app.log({ what: `Status changed to ${status}`, record: label, recordHref: `/roles/${id}`, kind: 'Roles', before: role.status, after: status })
    app.toast(`Status changed to ${status}`)
  }

  /* ---------- Bulk selection derived data ---------- */
  const selectedMatches = useMemo(() => all.filter(m => sel.selected.includes(m.id)), [all, sel.selected])
  const alreadyShortlistedCount = selectedMatches.filter(m => m.status === 'shortlisted').length
  const eligibleForShortlist = selectedMatches.filter(m => m.status !== 'shortlisted' && m.status !== 'rejected' && m.status !== 'not-interested')
  const eligibleForReject = selectedMatches.filter(m => m.status !== 'rejected' && m.status !== 'not-interested')

  const assumedSummary = useMemo(() => {
    const fieldCounts: Record<string, number> = {}
    const assumedRows: Match[] = []
    eligibleForShortlist.forEach(m => {
      const c = app.candidate(m.candidateId)
      const rowFields = new Set<string>()
      m.chips.filter(ch => ch.kind === 'assumed').forEach(ch => rowFields.add(ch.label))
      if (!c?.workAuth.status) rowFields.add('Work authorization')
      if (rowFields.size > 0) {
        assumedRows.push(m)
        rowFields.forEach(f => { fieldCounts[f] = (fieldCounts[f] ?? 0) + 1 })
      }
    })
    return { assumedRows, fieldCounts }
  }, [eligibleForShortlist, app])

  const inferredRejectReason = useMemo(() => {
    if (filters.workAuth || filters.sponsorship) return 'Work authorization'
    if (filters.location || filters.workMode) return 'Location'
    if (filters.years) return 'Seniority'
    if (filters.skills || filters.domain) return 'Skills'
    return undefined
  }, [filters])

  const handleBulkShortlist = () => {
    if (!eligibleForShortlist.length) return
    const needsConfirm = assumedSummary.assumedRows.length > 0 || stale || role.matchStatus === 'out-of-date'
    if (needsConfirm) {
      setConfirmAssumedOpen(true)
    } else {
      app.shortlistMany(sel.selected, { onOpenShortlist: () => setTab('shortlist') })
      sel.clear()
    }
  }

  /* ---------- v0.4 §7.3 Keyboard: J/K · Shift+J/K · Space · S · X · E · U · Esc · ? ---------- */
  useEffect(() => {
    if (tab !== 'matches' || (view !== 'ranked' && view !== 'few' && view !== 'none' && view !== 'error')) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.key === '?') { e.preventDefault(); setShortcutsOpen(true); return }
      if (e.key === 'Escape') {
        if (sel.selected.length > 0) { e.preventDefault(); sel.clear() }
        return
      }
      const k = e.key.toLowerCase()
      const curIdx = focusIdx >= 0 ? Math.min(focusIdx, focusable.length - 1) : 0
      const cur = focusable[curIdx]

      if (e.shiftKey && (k === 'j' || e.key === 'ArrowDown' || k === 'k' || e.key === 'ArrowUp')) {
        e.preventDefault()
        if (!focusable.length) return
        const nextIdx = (k === 'j' || e.key === 'ArrowDown')
          ? Math.min(focusable.length - 1, (focusIdx < 0 ? 0 : curIdx) + 1)
          : Math.max(0, (focusIdx < 0 ? 0 : curIdx) - 1)
        const fromRow = focusable[focusIdx < 0 ? 0 : curIdx]
        const nextRow = focusable[nextIdx]
        setFocusIdx(nextIdx)
        if (fromRow && nextRow) sel.extendTo(fromRow.id, nextRow.id)
        return
      }

      if (k === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(focusable.length - 1, i + 1)) }
      else if (k === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(0, i - 1)) }
      else if (e.key === ' ' && cur && t.tagName !== 'BUTTON') { e.preventDefault(); setPreviewFrom('matches'); setPreviewId(cur.candidateId) }
      else if (k === 's') {
        e.preventDefault()
        if (sel.selected.length > 0) handleBulkShortlist()
        else if (cur) doShortlist(cur)
      }
      else if (k === 'x') {
        e.preventDefault()
        if (!app.can('reject')) return
        if (sel.selected.length > 0) {
          if (eligibleForReject.length > 0) setBatchRejectOpen(true)
        } else if (cur) {
          setRejectTarget(cur)
        }
      }
      else if (k === 'e') {
        e.preventDefault()
        setElimOpen(v => !v)
      }
      else if (k === 'u') { e.preventDefault(); undoLast() }
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

  /* ---------- Render MatchRow ---------- */
  const renderRow = (m: Match, opts?: { forceUnscored?: boolean }) => {
    const c = app.candidate(m.candidateId)
    if (!c) return null
    const loc = candidateLocation(c)
    const fIdx = focusable.findIndex(x => x.id === m.id)
    const notScored = opts?.forceUnscored ?? !isRowScored(m)
    const canSelect = m.status !== 'rejected' && m.status !== 'not-interested'

    const resumes = app.resumesFor(m.candidateId)
    const currentResume = resumes.find(r => r.id === m.scoredOnResumeId) ?? resumes.find(r => r.isPrimary) ?? resumes[0]
    const otherResume = resumes.find(r => r.id !== currentResume?.id) ?? resumes[1]

    const hasResumeSwitch = !notScored && resumes.length > 1 && currentResume && otherResume
    const hasAskChips = !notScored && (m.askEvidence?.length ?? 0) > 0

    const metaNode = (hasResumeSwitch || hasAskChips) ? (
      <div className="space-y-2 pt-1">
        {hasAskChips && (
          <div className="flex flex-wrap items-center gap-1.5">
            {m.askEvidence!.map(ev => (
              <span
                key={ev.askId}
                title={ev.found ? 'Client ask: evidence found on record' : 'Client ask: not found on record'}
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-xs whitespace-nowrap',
                  ev.found
                    ? 'border-border bg-background text-foreground'
                    : 'border-dashed border-warning bg-warning/[0.06] text-[#b45309]',
                )}
              >
                {ev.found ? `✓ ${ev.label}` : `? ${ev.label} · not found`}
              </span>
            ))}
          </div>
        )}
        {hasResumeSwitch && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Scored on <span className="font-medium text-foreground">{currentResume.label}</span> resume ·</span>
            <button
              type="button"
              onClick={() => app.rescoreOnResume(m.id, otherResume.id)}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Use {otherResume.label} resume
            </button>
          </div>
        )}
      </div>
    ) : undefined

    return (
      <MatchRow key={m.id}
        rank={m.rank} initials={c.initials} title={c.name} subtitle={`${c.headline}${loc ? ` · ${loc}` : ''}`}
        candidate={c}
        band={m.band} score={m.score} reason={m.reason} chips={m.chips}
        recommendation={m.recommendation}
        suggested={m.suggested}
        requirementsMet={m.requirementsMet}
        greenFlags={m.greenFlags}
        redFlags={m.redFlags}
        notInterestedReason={m.notInterestedReason}
        status={m.status} rejectReason={m.rejectReason} delta={m.delta === 'requalified' ? undefined : m.delta}
        dimmed={stale} focused={m.id === focusedId}
        selected={canSelect ? sel.isSelected(m.id) : false}
        onToggleSelect={canSelect ? shift => sel.toggle(m.id, shift) : undefined}
        notScored={notScored}
        meta={metaNode}
        actionsDisabled={{
          shortlist: app.can('shortlist') ? undefined : whoCanText('shortlist'),
          reject: app.can('reject') ? undefined : whoCanText('reject'),
        }}
        onPreview={() => { setFocusIdx(fIdx); setPreviewFrom('matches'); setPreviewId(c.id) }}
        onShortlist={() => doShortlist(m)}
        onReject={() => setRejectTarget(m)}
        onUndo={() => m.status === 'not-interested' ? app.undoNotInterested(m.candidateId, role.id) : doUndo(m)}
        onAddToAsk={chip => ask(m, chip)}
      />
    )
  }

  const eliminatedView = elimOpen && (
    <EliminatedView
      pool={elim.pool} pass={passCount} rules={elim.rules} rows={elim.rows}
      included={app.included[id] ?? []}
      onInclude={row => setIncludeTarget(row)}
      onClose={() => setElimOpen(false)}
      noneMode={view === 'none'}
    />
  )

  const suggestedCount = scoredRows.filter(m => m.suggested).length || allScoredCount

  const matchesTab = (() => {
    if (view === 'running') {
      return (
        <div className="space-y-4">
          <Banner variant="info" progress={wf === 'running' ? 45 : progress}>
            Scoring <span className="font-mono tnum">{scoringCount ?? role.passCount}</span> candidates… <span className="text-muted-foreground">You can keep working. We'll let you know when it's ready.</span>
          </Banner>
          <FunnelLine pool={elim.pool} pass={role.passCount} top={allScoredCount} notScored={unscoredRows.length} suggested={suggestedCount} shortlisted={shortlisted.length} onSeeEliminated={() => setElimOpen(o => !o)} eliminatedOpen={elimOpen} />
          <div className="space-y-2" aria-hidden>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)}</div>
        </div>
      )
    }
    if (view === 'none') {
      return (
        <div className="space-y-4">
          <FunnelLine pool={elim.pool} pass={0} top={0} notScored={0} suggested={0} shortlisted={0} onSeeEliminated={() => setElimOpen(o => !o)} eliminatedOpen={elimOpen} />
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState icon={<Filter />} title="No one passes"
              body="No candidates pass all must-haves. 23 fail only on location."
              action={<div className="flex gap-2"><Button onClick={() => setElimOpen(true)}>See them</Button><Button variant="ghost" icon={<Pencil />} onClick={() => navigate(`/roles/${id}/edit`)}>Edit requirements</Button></div>} />
          </div>
          {eliminatedView}
        </div>
      )
    }

    return (
      <div className={cn('space-y-4', sel.selected.length > 0 && 'any-selected')}>
        {scoringCount !== null && (
          <Banner variant="info" progress={progress}>
            Scoring <span className="font-mono tnum">{scoringCount}</span> candidates… <span className="text-muted-foreground">You can keep working. We'll let you know when it's ready.</span>
          </Banner>
        )}
        {view === 'error' && (
          <Banner variant="error" actions={<Button onClick={() => startRun('retry')}>Try again</Button>}>
            Matching didn't finish. Nothing was changed.
          </Banner>
        )}
        {stale && view === 'ranked' && (
          <Banner variant="warning" actions={<Button variant="primary" icon={<RefreshCw />} onClick={() => setRerunOpen('normal')}>Rerun matching</Button>}>
            <span className="font-medium">Out of date.</span> {role.outOfDateReason ?? DEFAULT_REASON} <span className="font-mono tnum">{scoredRows.length}</span> scored candidates will be re-ranked.
          </Banner>
        )}
        {showSummary && (
          <RerunSummary counts={summaryCounts} active={deltaFilter} onSelect={k => setDeltaFilter(k as DeltaFilter | null)}
            onDismiss={() => { setSummaryOpen(false); setDeltaFilter(null); if (wf === 'after-rerun') setWf('live') }} />
        )}

        <FunnelLine
          pool={elim.pool}
          pass={passCount}
          top={allScoredCount}
          notScored={unscoredRows.length}
          suggested={suggestedCount}
          shortlisted={shortlisted.length}
          onSeeEliminated={() => setElimOpen(o => !o)}
          eliminatedOpen={elimOpen}
        />

        {view === 'few' && <InfoNote>Only 3 candidates pass the must-haves. All of them are shown.</InfoNote>}

        {sel.selected.length > 0 ? (
          <SelectionBar
            count={sel.selected.length}
            shown={selectableIds.length}
            matching={activeFilteredMatches.filter(m => m.status !== 'rejected').length}
            onSelectAllShown={() => sel.selectAll(selectableIds)}
            onClear={sel.clear}
            note={alreadyShortlistedCount > 0 ? `${alreadyShortlistedCount} already shortlisted` : undefined}
          >
            <Button variant="primary" size="sm" icon={<Check />} kbd="S" disabled={!eligibleForShortlist.length} onClick={handleBulkShortlist}>
              Shortlist
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Shield />}
              onClick={() => setBulkMaskCandIds(selectedMatches.map(m => m.candidateId))}
            >
              Select resumes &amp; bulk mask ({selectedMatches.length})
            </Button>
            <GatedButton perm="reject" variant="outline" size="sm" icon={<X />} kbd="X" disabled={!eligibleForReject.length} onClick={() => setBatchRejectOpen(true)}>
              Reject
            </GatedButton>
          </SelectionBar>
        ) : (
          <FilterBar
            fields={filterFields}
            rows={all}
            state={filters}
            onChange={setFilters}
            count={activeFilteredMatches.length}
            countLabel="match"
            right={<ShortcutHint onOpen={() => setShortcutsOpen(true)} />}
          />
        )}

        {showSummary && deltaFilter && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{{ new: 'New in top 5', moved: 'Moved', requalified: 'Re-qualified', dropped: 'Dropped out' }[deltaFilter]}</span>
            <Button variant="link" className="text-xs" onClick={() => setDeltaFilter(null)}>Show all</Button>
          </div>
        )}

        {eliminatedView}

        {/* Not scored yet state: stage-1 passers + primary ScoreControl in header bar */}
        {notScoredYetMode ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground">
                  Not scored ({unscoredRows.length})
                </div>
                <p className="text-xs text-muted-foreground">
                  Sorted by similarity to the JD. Not a score. Prune with filters or reject (X) before spending AI scores.
                </p>
              </div>
              <ScoreControl unscored={totalUnscoredPool || unscoredRows.length} onScore={n => triggerScore(n)} />
            </div>

            <div className="space-y-2" aria-label="Stage-1 passers">
              {unscoredRows.length > 0 ? (
                unscoredRows.map(m => renderRow(m, { forceUnscored: true }))
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  No matches with these filters. <Button variant="link" className="text-sm" onClick={() => { setFilters({}); setDeltaFilter(null) }}>Clear filters</Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Scored state: ranked scored rows on top + collapsible Not scored (N) */
          <div className="space-y-4">
            <div className="space-y-2" aria-label="Ranked matches">
              {scoredRows.length > 0 ? (
                scoredRows.map(m => renderRow(m))
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  No scored matches with these filters. <Button variant="link" className="text-sm" onClick={() => { setFilters({}); setDeltaFilter(null) }}>Clear filters</Button>
                </div>
              )}
            </div>

            {unscoredRows.length > 0 && (
              <section className="rounded-2xl border border-border bg-gray-100 p-1">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    aria-expanded={unscoredOpen}
                    onClick={() => setUnscoredOpen(o => !o)}
                    className="inline-flex items-center gap-2 text-left text-sm font-semibold text-foreground"
                  >
                    {unscoredOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    <span>Not scored ({unscoredRows.length})</span>
                    <span className="text-xs font-normal text-muted-foreground">· Sorted by similarity to the JD. Not a score.</span>
                  </button>
                  <ScoreControl unscored={unscoredRows.length} more onScore={n => triggerScore(n)} />
                </div>
                {unscoredOpen && (
                  <div className="space-y-2 rounded-xl border border-border bg-card p-2">
                    {unscoredRows.map(m => renderRow(m, { forceUnscored: true }))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* v0.4 · §7.4 / C10 Collapsed Not interested (N) group */}
        {notInterestedRows.length > 0 && (
          <details className="group rounded-2xl border border-border bg-gray-100 p-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-foreground select-none">
              <span className="inline-flex items-center gap-2">
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                <span>Not interested ({notInterestedRows.length})</span>
                <span className="text-xs font-normal text-muted-foreground">· never suggested again for this role</span>
              </span>
            </summary>
            <div className="space-y-2 rounded-xl border border-border bg-card p-2">
              {notInterestedRows.map(m => renderRow(m))}
            </div>
          </details>
        )}

        <span className="sr-only" aria-live="polite">{!running && view === 'ranked' ? `Ranking finished: ${scoredRows.length} scored candidates` : ''}</span>
      </div>
    )
  })()

  const focusedOrSelectedCandidateId = useMemo(() => {
    if (sel.selected.length > 0) {
      const m = all.find(x => x.id === sel.selected[0])
      if (m) return m.candidateId
    }
    if (focusIdx >= 0 && focusable[Math.min(focusIdx, focusable.length - 1)]) {
      return focusable[Math.min(focusIdx, focusable.length - 1)].candidateId
    }
    return all[0]?.candidateId ?? 'priya'
  }, [sel.selected, focusIdx, focusable, all])

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
          <Button variant="outline" icon={<Shield />} onClick={() => setBulkMaskCandIds(shortlisted.map(m => m.candidateId))}>
            Select resumes &amp; bulk mask
          </Button>
          <Button variant="outline" icon={<Pencil />} onClick={() => navigate(`/roles/${id}/edit`)}>Edit role</Button>
          <Menu width={240}
            trigger={({ toggle }) => <Button variant="ghost" size="icon" aria-label="More role actions" onClick={toggle} icon={<MoreHorizontal />} />}
            items={[
              { label: 'View masked role links', icon: <Eye />, onSelect: () => setTab('masked-links') },
              { label: 'Select resumes & bulk mask…', icon: <Sparkles />, onSelect: () => setBulkMaskCandIds(shortlisted.map(m => m.candidateId)) },
              { separator: true, label: '' },
              { label: 'Add requirement', icon: <MessageSquarePlus />, onSelect: () => setAddAskOpen(true) },
              { label: 'Mark candidate not interested…', icon: <UserX />, onSelect: () => setNotInterestedCandId(focusedOrSelectedCandidateId) },
              { separator: true, label: '' },
              { label: 'Force rerun', icon: <RefreshCw />, onSelect: () => setRerunOpen('force') },
            ]} />
        </div>
      </header>

      <div className="border-b border-border pb-2">
        <PillTabs value={tab} onChange={setTab}
          tabs={[
            { value: 'matches', label: 'Matches', icon: <Sparkles />, count: activeFilteredMatches.length },
            { value: 'shortlist', label: 'Shortlist', icon: <ListChecks />, count: shortlisted.length },
            { value: 'masked-links', label: 'Masked links', icon: <Shield />, count: Math.max(shortlisted.length, app.outputs.filter(o => o.type === 'Masked' && o.roleId === id).length) },
            { value: 'details', label: 'Details', icon: <FileText /> },
            { value: 'history', label: 'History', icon: <HistoryIcon /> },
          ]} />
      </div>

      {tab === 'matches' && matchesTab}
      {tab === 'shortlist' && (
        <ShortlistTab role={role} items={shortlisted}
          onReorder={reorder}
          onRemove={m => doUndo(m)}
          onPreview={cid => { setPreviewFrom('shortlist'); setPreviewId(cid) }}
          onOpenEmail={(kind, cids) => { setEmailInitialKind(kind); setEmailCandidateIds(cids) }}
          onMarkNotInterested={cid => setNotInterestedCandId(cid)}
          onGoMatches={() => setTab('matches')} />
      )}
      {tab === 'masked-links' && <RoleMaskedLinksSection roleId={id} embedded />}
      {tab === 'details' && <DetailsTab role={role} versions={versions} onCompare={() => setCompareOpen(true)} onAddAsk={() => setAddAskOpen(true)} />}
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

      <RejectDialog open={batchRejectOpen} onClose={() => setBatchRejectOpen(false)}
        candidateName={eligibleForReject.length === 1 ? nameOf(eligibleForReject[0]) : ''}
        roleTitle={role.title}
        count={eligibleForReject.length}
        defaultReason={inferredRejectReason}
        onConfirm={reason => { app.rejectMany(sel.selected, reason); sel.clear() }} />

      <ConfirmAssumedDialog
        open={confirmAssumedOpen}
        onClose={() => setConfirmAssumedOpen(false)}
        total={eligibleForShortlist.length}
        assumed={assumedSummary.assumedRows.length}
        fieldCounts={assumedSummary.fieldCounts}
        outOfDate={stale || role.matchStatus === 'out-of-date'}
        onShortlistVerified={() => {
          const verifiedIds = eligibleForShortlist
            .filter(m => !assumedSummary.assumedRows.some(a => a.id === m.id))
            .map(m => m.id)
          app.shortlistMany(verifiedIds, { onOpenShortlist: () => setTab('shortlist') })
          sel.clear()
        }}
        onShortlistAll={() => {
          app.shortlistMany(sel.selected, { onOpenShortlist: () => setTab('shortlist') })
          sel.clear()
        }}
        onAddQuestions={() => {
          assumedSummary.assumedRows.forEach(m => {
            const chs = m.chips.filter(ch => ch.kind === 'assumed')
            if (chs.length) chs.forEach(ch => ask(m, ch))
            else ask(m, { kind: 'assumed', label: 'Work authorization' })
          })
        }}
      />

      <RerunDialog
        open={!!rerunOpen}
        onClose={() => setRerunOpen(null)}
        roleLabel={label}
        count={scoredRows.length || role.scoredCount || role.passCount}
        newPassers={unscoredRows.length}
        newScoreCount={app.defaultScoreCount}
        force={rerunOpen === 'force' && !stale}
        onConfirm={opts => startRun('rerun', opts)}
      />

      <AddRequirementDialog open={addAskOpen} onClose={() => setAddAskOpen(false)} roleId={id} />

      <BulkMaskForRoleDialog
        open={bulkMaskCandIds !== null}
        onClose={() => setBulkMaskCandIds(null)}
        initialRoleId={id}
        initialCandidateIds={bulkMaskCandIds && bulkMaskCandIds.length > 0 ? bulkMaskCandIds : undefined}
        onCompleted={() => setTab('masked-links')}
      />

      <NotInterestedDialog
        open={!!notInterestedCandId}
        onClose={() => setNotInterestedCandId(null)}
        candidateId={notInterestedCandId ?? ''}
        roleIds={[id]}
      />

      <ShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <IncludeAnywayDialog open={!!includeTarget} onClose={() => setIncludeTarget(null)}
        candidateName={includeTarget ? app.candidate(includeTarget.candidateId)?.name ?? '' : ''} failing={includeTarget?.failing ?? []}
        onConfirm={note => { if (includeTarget) app.includeAnyway(id, includeTarget.candidateId, note) }} />

      <CopyEmailDialog
        open={!!emailCandidateIds}
        onClose={() => setEmailCandidateIds(null)}
        candidateIds={emailCandidateIds ?? shortlisted.map(m => m.candidateId)}
        roleId={id}
        initialKind={emailInitialKind}
      />

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

/* ---------- Shortlist tab (§7.5, C2, C3, C4, N26, N27, D-09) ---------- */
function ShortlistTab({ role, items, onReorder, onRemove, onPreview, onOpenEmail, onMarkNotInterested, onGoMatches }: {
  role: Role
  items: Match[]
  onReorder: (ids: string[]) => void
  onRemove: (m: Match) => void
  onPreview: (cid: string) => void
  onOpenEmail: (kind: EmailDraftKind, candidateIds: string[]) => void
  onMarkNotInterested: (candidateId: string) => void
  onGoMatches: () => void
}) {
  const app = useApp()
  const navigate = useNavigate()
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [sourceResumeByCandidate, setSourceResumeByCandidate] = useState<Record<string, string>>({})
  const [gmailDraftsOpen, setGmailDraftsOpen] = useState(false)

  const orderedIds = useMemo(() => items.map(m => m.id), [items])
  const sel = useListSelection(orderedIds)

  const isClient = role.companyType === 'Client'
  const activeItems = sel.selected.length > 0 ? items.filter(m => sel.isSelected(m.id)) : items
  const activeIds = activeItems.map(m => m.candidateId)

  const types: OutputType[] = isClient ? ['Masked', 'Editable', 'As-is'] : ['Masked']
  const outFor = (cid: string, type: OutputType) =>
    app.outputs.find(o => o.candidateId === cid && o.type === type && (o.roleId === role.id || (type === 'Masked' && o.roleId === null)))

  const readyCount = activeItems.filter(m => types.some(t => outFor(m.candidateId, t))).length
  const missingMasked = items.filter(m => !outFor(m.candidateId, 'Masked'))

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return
    const next = items.map(m => m.id)
    const [x] = next.splice(from, 1)
    next.splice(to, 0, x)
    onReorder(next)
  }

  const copyOutreachSheetRows = () => {
    const header = ['Order', 'Candidate', 'Title', 'Location', 'Recommendation', 'Candidate side', isClient ? 'Client side' : 'Prospect side', 'Role', 'Company'].join('\t')
    const lines = activeItems.map((m, idx) => {
      const c = app.candidate(m.candidateId)
      return [
        String(idx + 1),
        c?.name ?? m.candidateId,
        c?.headline ?? '',
        c ? candidateLocation(c) : '',
        m.recommendation ?? (m.band === 'Strong' ? 'Strong' : m.band === 'Good' ? 'Mild' : 'Not recommended'),
        m.alignment?.candidateSide ?? 'not-asked',
        isClient ? (m.alignment?.clientSide ?? 'not-sent') : (m.alignment?.prospectSide ?? 'not-pitched'),
        role.title,
        role.company,
      ].join('\t')
    })
    navigator.clipboard?.writeText([header, ...lines].join('\n')).catch(() => {})
    app.toast(`Copied ${activeItems.length} row${activeItems.length === 1 ? '' : 's'} for outreach sheet`)
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

  const masked = () => navigate(`/resumes/masked?role=${role.id}&candidates=${activeIds.join(',')}`)
  const editable = () => navigate(`/resumes/editable?role=${role.id}&candidates=${activeIds.join(',')}`)

  const allSelected = items.length > 0 && sel.selected.length === items.length

  return (
    <div className="space-y-4">
      {sel.selected.length > 0 ? (
        <SelectionBar
          count={sel.selected.length}
          shown={items.length}
          onSelectAllShown={() => sel.selectAll(orderedIds)}
          onClear={sel.clear}
        >
          {isClient && (
            <GatedButton perm="genIdentity" variant="primary" size="sm" icon={<FileText />} onClick={editable}>
              Prepare editable resumes
            </GatedButton>
          )}
          <Button variant={isClient ? 'outline' : 'primary'} size="sm" icon={<Sparkles />} onClick={masked}>
            Generate masked resumes
          </Button>
          <Button variant="outline" size="sm" icon={<Mail />} onClick={() => onOpenEmail(isClient ? 'shortlist' : 'pitch', activeIds)}>
            Draft emails / prompts
          </Button>
          <Button variant="outline" size="sm" icon={<Send />} onClick={() => setGmailDraftsOpen(true)}>
            Create Gmail drafts
          </Button>
          <Button variant="outline" size="sm" icon={<Table2 />} onClick={copyOutreachSheetRows}>
            Copy rows for outreach sheet
          </Button>
        </SelectionBar>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono text-foreground tnum">{items.length}</span> shortlisted · drag to set the order clients see
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isClient && (
              <GatedButton perm="genIdentity" variant="primary" icon={<FileText />} onClick={editable}>
                Prepare editable resumes
              </GatedButton>
            )}
            <Button variant={isClient ? 'outline' : 'primary'} icon={<Sparkles />} onClick={masked}>
              Generate masked resumes
            </Button>
            <Button variant="outline" icon={<Mail />} onClick={() => onOpenEmail(isClient ? 'shortlist' : 'pitch', activeIds)}>
              Draft emails / prompts
            </Button>
            <Button variant="outline" icon={<Send />} onClick={() => setGmailDraftsOpen(true)}>
              Create Gmail drafts
            </Button>
            <Button variant="outline" icon={<Table2 />} onClick={copyOutreachSheetRows}>
              Copy rows for outreach sheet
            </Button>
            <Button variant="outline" icon={<Download />} disabled={!readyCount} title={readyCount ? undefined : 'No resumes generated yet'}
              onClick={() => { app.toast(`Downloaded ${readyCount} resume${readyCount === 1 ? '' : 's'} as one ZIP`); app.log({ what: `Downloaded ${readyCount} resumes (ZIP)`, record: `${role.title} — ${role.company}`, recordHref: `/roles/${role.id}`, kind: 'Outputs' }) }}>
              Download
            </Button>
          </div>
        </div>
      )}

      {missingMasked.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/60 px-3.5 py-2 text-xs">
          <span className="text-foreground">
            <span className="font-mono font-medium tnum">{missingMasked.length}</span> without a masked resume
          </span>
          <Button
            variant="link"
            className="text-xs font-medium"
            onClick={() => navigate(`/resumes/masked?role=${role.id}&candidates=${missingMasked.map(m => m.candidateId).join(',')}`)}
          >
            Generate ({missingMasked.length})
          </Button>
        </div>
      )}

      {!isClient && <InfoNote>Prospect role: masked resumes are the only output here, so identities never reach a prospect by mistake.</InfoNote>}

      <ol className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Shortlist order">
        <li className="hidden h-9 items-center gap-4 border-b border-border bg-secondary/70 px-4 sm:flex" aria-hidden>
          <Checkbox
            aria-label="Select all shortlisted"
            checked={allSelected}
            onChange={v => (v ? sel.selectAll() : sel.clear())}
          />
          <span className="eyebrow w-12 text-[10px] text-gray-1000">Order</span>
          <span className="eyebrow flex-1 text-[10px] text-gray-1000">Candidate &amp; alignment</span>
          <span className="eyebrow w-[240px] text-[10px] text-gray-1000">Outputs</span>
          <span className="w-[220px]" />
        </li>
        {items.map((m, i) => {
          const c = app.candidate(m.candidateId)
          if (!c) return null
          const resumes = app.resumesFor(c.id)
          const selectedResumeId = sourceResumeByCandidate[c.id] ?? m.scoredOnResumeId ?? resumes.find(r => r.isPrimary)?.id ?? resumes[0]?.id ?? ''
          return (
            <li key={m.id} draggable
              onDragStart={e => { setDrag(i); e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={e => { e.preventDefault(); setOver(i) }}
              onDrop={e => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null) }}
              onDragEnd={() => { setDrag(null); setOver(null) }}
              className={cn('flex flex-wrap items-center gap-4 border-b border-border px-4 py-3.5 transition-colors last:border-0',
                sel.isSelected(m.id) && 'bg-secondary/60',
                drag === i && 'opacity-50', over === i && drag !== null && drag !== i && 'bg-muted')}>
              <span onClickCapture={e => { if (e.shiftKey) { e.stopPropagation(); e.preventDefault(); sel.toggle(m.id, true) } }}>
                <Checkbox aria-label={`Select ${c.name}`} checked={sel.isSelected(m.id)} onChange={() => sel.toggle(m.id, false)} />
              </span>
              <div className="flex w-12 items-center gap-1.5">
                <GripVertical className="size-4 cursor-grab text-gray-800" aria-hidden />
                <span className="font-mono text-xs text-gray-1000 tnum">{i + 1}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar initials={c.initials} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.headline}</div>
                  </div>
                  {resumes.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Source resume</span>
                      <Select
                        aria-label={`Source resume for ${c.name}`}
                        value={selectedResumeId}
                        onChange={rid => {
                          setSourceResumeByCandidate(s => ({ ...s, [c.id]: rid }))
                          app.rescoreOnResume(m.id, rid)
                        }}
                        options={resumes.map(r => ({ value: r.id, label: r.label }))}
                      />
                    </div>
                  )}
                </div>
                <AlignmentPills
                  companyType={role.companyType}
                  alignment={m.alignment}
                  candidateName={c.name}
                  onChangeSide={(side, val) => app.updateAlignment(m.id, side, val)}
                  onDraftCandidate={() => onOpenEmail('interest-check', [m.candidateId])}
                  onDraftClient={() => onOpenEmail(isClient ? 'profile-share' : 'pitch', [m.candidateId])}
                  onMarkNotInterested={() => onMarkNotInterested(m.candidateId)}
                />
              </div>
              <div className="flex w-[240px] flex-wrap items-center gap-1.5">
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
              <div className="flex w-[220px] items-center justify-end gap-1">
                <Button variant="ghost" size="sm" icon={<Wand2 />} onClick={() => navigate('/resumes/masked?candidates=' + m.candidateId + '&role=' + role.id)}>
                  Refine
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)} icon={<ArrowUp />} />
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${c.name} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)} icon={<ArrowDown />} />
                <Button size="sm" onClick={() => onPreview(c.id)}>Preview</Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${c.name} from shortlist`} title="Remove from shortlist" onClick={() => onRemove(m)} icon={<X />} />
              </div>
            </li>
          )
        })}
      </ol>

      <CreateGmailDraftsDialog
        open={gmailDraftsOpen}
        onClose={() => setGmailDraftsOpen(false)}
        roleIds={[role.id]}
        candidateIdsByRole={{ [role.id]: activeIds }}
        mode="shortlist"
      />
    </div>
  )
}

/* ---------- Details tab (§7.1, T7, T9) ---------- */
function DetailsTab({ role, versions, onCompare, onAddAsk }: { role: Role; versions: { v: string; who: string; when: string }[]; onCompare: () => void; onAddAsk: () => void }) {
  const app = useApp()
  const navigate = useNavigate()
  const [openDiff, setOpenDiff] = useState<Record<string, boolean>>({})

  const reqs = app.requirementsFor(role.id)
  const roleActivity = app.activity.filter(e => e.recordHref === `/roles/${role.id}`)
  const recentEntries = [...roleActivity, ...app.activity.filter(e => e.recordHref !== `/roles/${role.id}`)].slice(0, 5)

  const yn = (v: 'Yes' | 'No' | 'Unknown') => (v === 'Unknown' ? <span className="text-muted-foreground">Unknown</span> : v)
  const Text = ({ v }: { v?: string }) => (v ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{v}</p> : <NotCaptured />)
  const initials = (who: string) => who.split(/\s+/).map(s => s[0]).join('').replace(/[^A-Z]/gi, '').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <BezelCard title="Company">
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Company">{role.company}</Fact>
              <Fact label="Type"><CompanyTypeTag type={role.companyType} /></Fact>
              <Fact label="Source">{role.companySource}</Fact>
              <Fact label="Posting">{role.postingUrl ? <a href={role.postingUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{role.postingUrl.replace(/^https?:\/\//, '')}</a> : <span className="text-muted-foreground">—</span>}</Fact>
              <Fact label="Hiring contact">
                {role.hiringContact ? (
                  <span>
                    {role.hiringContact.name}
                    {role.hiringContact.email ? <span className="text-muted-foreground"> · {role.hiringContact.email}</span> : null}
                  </span>
                ) : (
                  <NotCaptured />
                )}
              </Fact>
            </div>
          </BezelCard>

          <BezelCard
            title={<span className="flex items-center gap-2">Requirements <span className="font-mono text-xs font-normal text-muted-foreground tnum">({reqs.length})</span></span>}
            action={<Button variant="ghost" size="sm" icon={<Plus />} onClick={onAddAsk}>+ Add requirement</Button>}
            description="Unified requirements from the JD, calls, emails, and manual edits. Toggle Eliminator (Stage 1) vs Nice to have (Stage 2)."
          >
            {reqs.length > 0 ? (
              <div className="space-y-2">
                {reqs.map(req => (
                  <RequirementRow
                    key={req.id}
                    req={req}
                    onToggleEffect={eff => app.toggleRequirementEffect(role.id, req.id, eff)}
                    onRemove={() => app.removeRequirement(role.id, req.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No requirements captured yet.</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-border bg-secondary/40 p-3">
              <Fact label="Minimum years"><span className="flex items-center gap-2"><span className="tnum">{role.minYears}+ yrs</span><SourceBadge kind="JD" /></span></Fact>
              <Fact label="Location"><span className="flex items-center gap-2">{role.location || <NotCaptured />}<SourceBadge kind="JD" /></span></Fact>
              <Fact label="Work mode"><span className="flex items-center gap-2">{role.workMode}<SourceBadge kind="JD" /></span></Fact>
              <Fact label="Relocation accepted">{role.relocationAccepted === null ? <NotCaptured /> : role.relocationAccepted ? 'Yes' : 'No'}</Fact>
              <Fact label="Sponsorship offered">{yn(role.sponsorship)}</Fact>
              <Fact label="Visa transfer supported">{yn(role.transfer)}</Fact>
            </div>

            {(role.mustSkills.length > 0 || role.niceSkills.length > 0) && (
              <div className="mt-4 grid gap-3 rounded-xl border border-border bg-secondary/40 p-3 sm:grid-cols-2">
                <Fact label="Must-have skills">
                  {role.mustSkills.length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {role.mustSkills.map(s => (
                        <span key={s} className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs">{s}</span>
                      ))}
                    </div>
                  ) : <span className="text-muted-foreground">None</span>}
                </Fact>
                <Fact label="Nice-to-have skills">
                  {role.niceSkills.length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {role.niceSkills.map(s => (
                        <span key={s} className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs">{s}</span>
                      ))}
                    </div>
                  ) : <span className="text-muted-foreground">None</span>}
                </Fact>
              </div>
            )}
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
            <details className="group" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-foreground select-none">
                <span>Job description text (JD v{role.jdVersion})</span>
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 border-t border-border pt-3">
                {role.jdText
                  ? <pre className="max-h-[360px] overflow-auto font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-gray-1100">{role.jdText}</pre>
                  : <p className="text-sm text-muted-foreground">No JD text saved for this role.</p>}
              </div>
            </details>
          </BezelCard>

          <BezelCard title="Version history" action={versions.length > 1 ? <Button variant="ghost" size="sm" onClick={onCompare}>Compare</Button> : undefined}>
            <ul className="divide-y divide-border">
              {versions.map((v, i) => (
                <li key={v.v} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">{v.v}</span>
                    {i === 0 && <span className="eyebrow rounded-sm bg-muted px-1.5 py-0.5 text-[9px] text-gray-1100">Current</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{v.who} · {v.when}</span>
                </li>
              ))}
            </ul>
          </BezelCard>
        </div>
      </div>

      {/* T9 · Recent activity (5) merged at the bottom of Details */}
      <BezelCard
        title={`Recent activity (${recentEntries.length})`}
        action={<Button variant="link" className="text-xs" onClick={() => navigate('/activity')}>See all in Activity</Button>}
      >
        {recentEntries.length > 0 ? (
          <ol className="divide-y divide-border">
            {recentEntries.map(e => {
              const expandable = !!(e.before || e.after)
              const isOpen = openDiff[e.id]
              return (
                <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
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
                        onClick={() => setOpenDiff(o => ({ ...o, [e.id]: !o[e.id] }))}>{isOpen ? 'Hide change' : 'Show change'}</Button>
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
        ) : (
          <p className="text-sm text-muted-foreground">No activity recorded for this role yet.</p>
        )}
      </BezelCard>
    </div>
  )
}

/* ---------- History tab ---------- */
function HistoryTab({ roleId }: { roleId: string }) {
  const { activity } = useApp()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const entries = activity.filter(e => e.recordHref === `/roles/${roleId}`)
  const initials = (who: string) => who.split(/\s+/).map(s => s[0]).join('').replace(/[^A-Z]/gi, '').slice(0, 2).toUpperCase()

  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <EmptyState icon={<RefreshCw />} title="No activity for this role yet" body="Decisions, reruns, and JD changes for this role will appear here." />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <ol className="divide-y divide-border">
        {entries.map(e => {
          const expandable = !!(e.before || e.after)
          const isOpen = open[e.id]
          return (
            <li key={e.id} className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <Avatar initials={initials(e.who)} size={28} className="mt-0.5" />
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
                <div className="mt-3 ml-10 grid gap-2 rounded-lg border border-border bg-secondary/70 p-3 text-sm sm:grid-cols-2">
                  <div><div className="eyebrow mb-1 text-[9px] text-gray-1000">Before</div><span className="text-muted-foreground">{e.before ?? '—'}</span></div>
                  <div><div className="eyebrow mb-1 text-[9px] text-gray-1000">After</div><span>{e.after ?? '—'}</span></div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export type { React }
