import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as mock from '../data/mock'
import type {
  Match, Role, Candidate, ResumeOutput, LogEntry, RoleMatchForCandidate, LogKind,
  TeamMember, Permission, AccessRole, Resume, ClientAsk, Take, PromptDef, OutputRevision, MatchChip, Band,
} from '../data/types'

/* ---------- v0.3 · T5 access matrix (PRD §7.5) ---------- */
export const PERMISSIONS: Record<Permission, AccessRole[]> = {
  addRecords: ['Admin', 'Recruiter', 'Associate'],
  editFacts: ['Admin', 'Recruiter'],
  score: ['Admin', 'Recruiter'],
  shortlist: ['Admin', 'Recruiter', 'Associate'],
  reject: ['Admin', 'Recruiter'],
  genMasked: ['Admin', 'Recruiter', 'Associate'],
  genIdentity: ['Admin', 'Recruiter'],
  copyMasked: ['Admin', 'Recruiter', 'Associate'],
  copyFull: ['Admin', 'Recruiter'],
  signTake: ['Admin', 'Recruiter', 'Associate'],
  exportCsv: ['Admin'],
  settings: ['Admin'],
  delete: ['Admin'],
}
const PERMISSION_VERB: Record<Permission, string> = {
  addRecords: 'add records', editFacts: 'edit facts and must-haves', score: 'score with AI', shortlist: 'shortlist',
  reject: 'reject', genMasked: 'generate masked resumes', genIdentity: 'generate editable or as-is resumes',
  copyMasked: 'copy masked lists', copyFull: 'copy full lists', signTake: 'sign takes', exportCsv: 'export CSV',
  settings: 'change Settings', delete: 'delete records',
}
/** "Recruiters and Admins can reject" */
export function whoCanText(p: Permission) {
  const roles = PERMISSIONS[p]
  const names = roles.map(r => `${r}s`)
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `${list} can ${PERMISSION_VERB[p]}`
}
/** Default number to score (Decision #2) and per-run cap (Decision #13) */
export const SCORE_OPTIONS = [5, 10, 25, 50] as const
export const SCORE_RUN_CAP = 50

/* ==========================================================================
   App store — in-memory, so flows feel real during the founder review.
   ========================================================================== */

export interface Toast { id: number; message: string; undo?: () => void; action?: { label: string; onClick: () => void } }

interface AppState {
  roles: Role[]
  candidates: Candidate[]
  matches: Match[]
  rolesForCandidate: Record<string, RoleMatchForCandidate[]>
  outputs: ResumeOutput[]
  activity: LogEntry[]
  /** Candidate IDs added to a role's ranking via "Include anyway" */
  included: Record<string, string[]>
  /** Candidate askList additions via "Add to ask list" */
  askAdds: Record<string, string[]>
  showScore: boolean
  needsAttention: boolean
  /* v0.3 */
  team: TeamMember[]
  currentUserId: string
  resumes: Resume[]
  clientAsks: ClientAsk[]
  takes: Take[]
  prompts: PromptDef[]
  defaultScoreCount: number
  domains: string[]
}

interface AppApi extends AppState {
  toasts: Toast[]
  toast: (message: string, opts?: { undo?: () => void; action?: Toast['action'] }) => void
  dismissToast: (id: number) => void
  log: (e: { what: string; record: string; recordHref: string; kind: LogKind; before?: string; after?: string }) => void

  setMatchStatus: (matchId: string, status: Match['status'], rejectReason?: string) => void
  shortlist: (matchId: string) => void
  reject: (matchId: string, reason: string) => void
  undoDecision: (matchId: string) => void
  reorderShortlist: (roleId: string, orderedMatchIds: string[]) => void

  updateRole: (id: string, patch: Partial<Role>) => void
  addRole: (r: Role) => void
  updateCandidate: (id: string, patch: Partial<Candidate>) => void
  addCandidate: (c: Candidate) => void

  rerun: (roleId: string) => void
  findMatches: (roleId: string) => void
  includeAnyway: (roleId: string, candidateId: string, note?: string) => void
  addToAskList: (candidateId: string, question: string) => void

  setCandidateRoleStatus: (candidateId: string, roleId: string, status: RoleMatchForCandidate['status']) => void
  addOutputs: (o: Omit<ResumeOutput, 'id' | 'created' | 'createdBy'>[]) => void

  setShowScore: (v: boolean) => void
  setNeedsAttention: (v: boolean) => void
  role: (id: string) => Role | undefined
  candidate: (id: string) => Candidate | undefined

  /* ---------- v0.3 ---------- */
  /** T5 · who is signed in (switchable from the sidebar user menu in the wireframe) */
  currentUser: TeamMember
  setCurrentUser: (id: string) => void
  can: (p: Permission) => boolean
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => void
  member: (id: string) => TeamMember | undefined

  /** T1 · bulk decisions, one undo per batch. Returns how many were skipped (already decided). */
  shortlistMany: (matchIds: string[], opts?: { onOpenShortlist?: () => void }) => { done: number; skipped: number }
  rejectMany: (matchIds: string[], reason: string) => { done: number; skipped: number }

  /** T2 · score in rounds */
  skipForScoring: (matchIds: string[], skip: boolean) => void
  scoreMatches: (roleId: string, n: number, opts?: { matchIds?: string[] }) => number
  setDefaultScoreCount: (n: number) => void

  /** T3 · resumes */
  resumesFor: (candidateId: string) => Resume[]
  addResume: (r: Omit<Resume, 'id'>) => string
  addResumeVersion: (resumeId: string, file: string, changesApplied: number) => void
  setPrimaryResume: (candidateId: string, resumeId: string) => void
  rescoreOnResume: (matchId: string, resumeId: string) => void

  /** T7 · client asks */
  asksFor: (roleId: string) => ClientAsk[]
  addClientAsk: (a: Omit<ClientAsk, 'id' | 'addedBy'>) => void
  removeClientAsk: (id: string) => void

  /** T8 · takes */
  takeFor: (candidateId: string, roleId?: string | null) => Take | undefined
  saveTakeDraft: (candidateId: string, text: string, opts?: { roleId?: string | null; draftedByAI?: boolean }) => void
  approveTake: (takeId: string) => void

  /** T5 · prompts */
  savePromptVersion: (id: string, text: string, note?: string) => void
  restorePromptVersion: (id: string, v: number) => void

  /** T6 · output revisions */
  addOutputRevision: (outputId: string, rev: Omit<OutputRevision, 'n' | 'createdBy' | 'at'>) => void

  /** T4 · domain list (Settings → Skill list) */
  setDomains: (d: string[]) => void
}

const Ctx = createContext<AppApi | null>(null)
let toastSeq = 1
let idSeq = 100

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => ({
    roles: mock.roles,
    candidates: mock.candidates,
    matches: mock.matches,
    rolesForCandidate: mock.rolesForCandidate,
    outputs: mock.outputs,
    activity: mock.activity,
    included: {},
    askAdds: {},
    showScore: true,
    needsAttention: true,
    team: mock.team,
    currentUserId: 'purvesh',
    resumes: mock.resumes,
    clientAsks: mock.clientAsks,
    takes: mock.takes,
    prompts: mock.prompts,
    defaultScoreCount: 10,
    domains: ['B2B SaaS', 'Payments/Fintech', 'Healthtech', 'Marketplace', 'Consumer', 'DevTools', 'AI/ML', 'E-commerce', 'Edtech', 'Enterprise'],
  }))
  const [toasts, setToasts] = useState<Toast[]>([])
  const prevStatus = useRef<Record<string, Match['status']>>({})

  const dismissToast = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])
  const toast = useCallback((message: string, opts?: { undo?: () => void; action?: Toast['action'] }) => {
    const id = toastSeq++
    setToasts(t => [...t.slice(-2), { id, message, ...opts }])
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])

  const log: AppApi['log'] = useCallback(e => {
    setState(s => {
      const who = s.team.find(m => m.id === s.currentUserId)?.displayName ?? 'Vandit D.'
      return { ...s, activity: [{ id: `l${idSeq++}`, who, when: 'Just now', ...e }, ...s.activity] }
    })
  }, [])

  const api = useMemo<AppApi>(() => {
    const role = (id: string) => state.roles.find(r => r.id === id)
    const candidate = (id: string) => state.candidates.find(c => c.id === id)
    const currentUser = state.team.find(m => m.id === state.currentUserId) ?? state.team[0]
    const can = (p: Permission) => PERMISSIONS[p].includes(currentUser.access)
    const resumesFor = (candidateId: string) => {
      const list = state.resumes.filter(r => r.candidateId === candidateId)
      if (list.length) return list
      const c = candidate(candidateId)
      return c ? [mock.defaultResumeFor(c)] : []
    }
    const setMatchStatus: AppApi['setMatchStatus'] = (matchId, status, rejectReason) =>
      setState(s => ({ ...s, matches: s.matches.map(m => m.id === matchId ? { ...m, status, rejectReason: status === 'rejected' ? rejectReason : m.rejectReason } : m) }))

    const matchLabel = (matchId: string) => {
      const m = state.matches.find(x => x.id === matchId)
      const c = m && candidate(m.candidateId)
      const r = m && role(m.roleId)
      return { m, c, r }
    }

    return {
      ...state, toasts, toast, dismissToast, log, role, candidate, setMatchStatus,
      shortlist: matchId => {
        const { m, c, r } = matchLabel(matchId)
        if (!m) return
        prevStatus.current[matchId] = m.status
        setMatchStatus(matchId, 'shortlisted')
        setState(s => ({ ...s, roles: s.roles.map(x => x.id === m.roleId ? { ...x, shortlisted: x.shortlisted + 1 } : x) }))
        log({ what: `Shortlisted ${c?.name}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${m.roleId}`, kind: 'Decisions' })
        toast(`Shortlisted ${c?.name}`, { undo: () => { setMatchStatus(matchId, prevStatus.current[matchId] ?? 'new'); setState(s => ({ ...s, roles: s.roles.map(x => x.id === m.roleId ? { ...x, shortlisted: Math.max(0, x.shortlisted - 1) } : x) })) } })
      },
      reject: (matchId, reason) => {
        const { m, c, r } = matchLabel(matchId)
        if (!m) return
        prevStatus.current[matchId] = m.status
        setMatchStatus(matchId, 'rejected', reason)
        log({ what: `Rejected ${c?.name} · ${reason}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${m.roleId}`, kind: 'Decisions' })
        toast(`Rejected ${c?.name}`, { undo: () => setMatchStatus(matchId, prevStatus.current[matchId] ?? 'new') })
      },
      undoDecision: matchId => setMatchStatus(matchId, 'new'),
      reorderShortlist: (roleId, ordered) => setState(s => {
        const rank = new Map(ordered.map((id, i) => [id, i]))
        const others = s.matches.filter(m => !rank.has(m.id))
        const sorted = s.matches.filter(m => rank.has(m.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
        return { ...s, matches: [...others, ...sorted] }
      }),

      updateRole: (id, patch) => setState(s => ({ ...s, roles: s.roles.map(r => r.id === id ? { ...r, ...patch } : r) })),
      addRole: r => setState(s => ({ ...s, roles: [r, ...s.roles] })),
      updateCandidate: (id, patch) => setState(s => ({ ...s, candidates: s.candidates.map(c => c.id === id ? { ...c, ...patch } : c) })),
      addCandidate: c => setState(s => ({ ...s, candidates: [c, ...s.candidates] })),

      rerun: roleId => {
        const r = role(roleId)
        setState(s => ({
          ...s,
          roles: s.roles.map(x => x.id === roleId ? { ...x, matchStatus: 'up-to-date', outOfDateReason: undefined, updated: 'Just now' } : x),
          matches: s.matches.map(m => {
            if (m.roleId !== roleId) return m
            const delta = roleId === 'northwind-spm' ? mock.northwindAfterRerun[m.id] : undefined
            // Rejected candidates who re-rank into the top 5 become Re-qualified (rejection reason kept)
            if (delta === 'requalified') return { ...m, delta, status: 'requalified', rank: 5 }
            if (m.id === 'm5' && roleId === 'northwind-spm') return { ...m, rank: 6, delta: undefined }
            return { ...m, delta }
          }),
        }))
        log({ what: `Matching rerun · ${r?.passCount} re-ranked`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Reruns' })
      },
      findMatches: roleId => {
        const r = role(roleId)
        setState(s => ({ ...s, roles: s.roles.map(x => x.id === roleId ? { ...x, matchStatus: 'up-to-date', updated: 'Just now' } : x) }))
        log({ what: `Matching run 1 · ${r?.passCount} ranked · top 5 shown`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Reruns' })
      },
      includeAnyway: (roleId, candidateId, note) => {
        const r = role(roleId); const c = candidate(candidateId)
        setState(s => ({
          ...s,
          included: { ...s.included, [roleId]: [...(s.included[roleId] ?? []), candidateId] },
          matches: [...s.matches, {
            id: `inc-${roleId}-${candidateId}`, roleId, candidateId, rank: 99, band: 'Stretch', score: 55, status: 'new', scored: false, similarity: 0,
            reason: `Included anyway by Vandit D.${note ? ` — “${note}”` : ''}. Ranked with everyone else.`,
            chips: [{ kind: 'gap', label: 'Fails a must-have (override)' }],
          }],
        }))
        log({ what: `Included ${c?.name} anyway${note ? ` · “${note}”` : ''}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Overrides' })
        toast(`Included ${c?.name} in ranking`)
      },
      addToAskList: (candidateId, question) => {
        setState(s => ({ ...s, askAdds: { ...s.askAdds, [candidateId]: [...(s.askAdds[candidateId] ?? []), question] } }))
        toast('Added to ask list')
      },
      setCandidateRoleStatus: (candidateId, roleId, status) => setState(s => ({
        ...s,
        rolesForCandidate: { ...s.rolesForCandidate, [candidateId]: (s.rolesForCandidate[candidateId] ?? []).map(x => x.roleId === roleId ? { ...x, status } : x) },
      })),
      addOutputs: list => setState(s => ({
        ...s,
        outputs: [...list.map(o => ({ ...o, id: `o${idSeq++}`, created: 'Just now', createdBy: currentUser.displayName })), ...s.outputs],
      })),
      setShowScore: v => setState(s => ({ ...s, showScore: v })),
      setNeedsAttention: v => setState(s => ({ ...s, needsAttention: v })),

      /* ================= v0.3 ================= */
      currentUser,
      setCurrentUser: id => setState(s => ({ ...s, currentUserId: id })),
      can,
      member: id => state.team.find(m => m.id === id),
      updateTeamMember: (id, patch) => setState(s => ({ ...s, team: s.team.map(m => m.id === id ? { ...m, ...patch } : m) })),

      shortlistMany: (ids, opts) => {
        const targets = state.matches.filter(m => ids.includes(m.id))
        const eligible = targets.filter(m => m.status !== 'shortlisted' && m.status !== 'rejected')
        const skipped = targets.length - eligible.length
        if (!eligible.length) return { done: 0, skipped }
        const prev = new Map(eligible.map(m => [m.id, m.status]))
        const roleId = eligible[0].roleId
        const r = role(roleId)
        setState(s => ({
          ...s,
          matches: s.matches.map(m => prev.has(m.id) ? { ...m, status: 'shortlisted' } : m),
          roles: s.roles.map(x => x.id === roleId ? { ...x, shortlisted: x.shortlisted + eligible.length } : x),
        }))
        log({ what: `Shortlisted ${eligible.length} in bulk`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Decisions',
          after: eligible.map(m => candidate(m.candidateId)?.name).join(', ') })
        eligible.forEach(m => log({ what: `Shortlisted ${candidate(m.candidateId)?.name} (batch of ${eligible.length})`, record: candidate(m.candidateId)?.name ?? '', recordHref: `/candidates/${m.candidateId}`, kind: 'Decisions' }))
        toast(`Shortlisted ${eligible.length}${skipped ? ` · ${skipped} already shortlisted` : ''}`, {
          undo: () => setState(s => ({
            ...s,
            matches: s.matches.map(m => prev.has(m.id) ? { ...m, status: prev.get(m.id)! } : m),
            roles: s.roles.map(x => x.id === roleId ? { ...x, shortlisted: Math.max(0, x.shortlisted - eligible.length) } : x),
          })),
          action: opts?.onOpenShortlist ? { label: 'Open shortlist', onClick: opts.onOpenShortlist } : undefined,
        })
        return { done: eligible.length, skipped }
      },
      rejectMany: (ids, reason) => {
        const targets = state.matches.filter(m => ids.includes(m.id))
        const eligible = targets.filter(m => m.status !== 'rejected')
        const skipped = targets.length - eligible.length
        if (!eligible.length) return { done: 0, skipped }
        const prev = new Map(eligible.map(m => [m.id, { status: m.status, reason: m.rejectReason }]))
        const roleId = eligible[0].roleId
        const r = role(roleId)
        const wasShortlisted = eligible.filter(m => m.status === 'shortlisted').length
        setState(s => ({
          ...s,
          matches: s.matches.map(m => prev.has(m.id) ? { ...m, status: 'rejected', rejectReason: reason } : m),
          roles: s.roles.map(x => x.id === roleId ? { ...x, shortlisted: Math.max(0, x.shortlisted - wasShortlisted) } : x),
        }))
        log({ what: `Rejected ${eligible.length} in bulk · ${reason}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Decisions',
          after: eligible.map(m => candidate(m.candidateId)?.name).join(', ') })
        eligible.forEach(m => log({ what: `Rejected ${candidate(m.candidateId)?.name} · ${reason} (batch of ${eligible.length})`, record: candidate(m.candidateId)?.name ?? '', recordHref: `/candidates/${m.candidateId}`, kind: 'Decisions' }))
        toast(`Rejected ${eligible.length} · ${reason}`, {
          undo: () => setState(s => ({
            ...s,
            matches: s.matches.map(m => prev.has(m.id) ? { ...m, status: prev.get(m.id)!.status, rejectReason: prev.get(m.id)!.reason } : m),
            roles: s.roles.map(x => x.id === roleId ? { ...x, shortlisted: x.shortlisted + wasShortlisted } : x),
          })),
        })
        return { done: eligible.length, skipped }
      },

      skipForScoring: (ids, skip) => {
        setState(s => ({ ...s, matches: s.matches.map(m => ids.includes(m.id) ? { ...m, skipped: skip } : m) }))
        toast(skip ? `Skipped ${ids.length} for scoring` : `Restored ${ids.length} for scoring`, {
          undo: () => setState(s => ({ ...s, matches: s.matches.map(m => ids.includes(m.id) ? { ...m, skipped: !skip } : m) })),
        })
      },
      scoreMatches: (roleId, n, opts) => {
        const r = role(roleId)
        const pool = state.matches
          .filter(m => m.roleId === roleId && !m.scored && !m.skipped && m.status !== 'rejected' && (!opts?.matchIds || opts.matchIds.includes(m.id)))
          .sort((a, b) => a.similarity - b.similarity)
          .slice(0, Math.min(n, SCORE_RUN_CAP))
        if (!pool.length) return 0
        const scoredBefore = state.matches.filter(m => m.roleId === roleId && m.scored)
        const maxRank = scoredBefore.reduce((a, m) => Math.max(a, m.rank), 0)
        const run = (scoredBefore.reduce((a, m) => Math.max(a, m.scoredInRun ?? 0), 0) || 0) + 1
        const results = new Map(pool.map((m, i) => [m.id, synthScore(candidate(m.candidateId), r, i, maxRank + i + 1, run)]))
        setState(s => ({
          ...s,
          matches: s.matches.map(m => results.has(m.id) ? { ...m, ...results.get(m.id)! } : m),
          roles: s.roles.map(x => x.id === roleId ? {
            ...x, scoredCount: x.scoredCount + pool.length, aiScoresUsed: x.aiScoresUsed + pool.length,
            matchStatus: x.matchStatus === 'not-run' ? 'up-to-date' : x.matchStatus, updated: 'Just now',
            latestUpdate: { text: `${pool.length} scored with AI`, who: currentUser.displayName.split(' ')[0], when: 'Just now' },
          } : x),
        }))
        log({ what: `Scored ${pool.length} with AI (run ${run}) · ${pool.length} AI scores`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Reruns' })
        toast(`Scored ${pool.length} candidates`)
        return pool.length
      },
      setDefaultScoreCount: n => setState(s => ({ ...s, defaultScoreCount: n })),

      resumesFor,
      addResume: r => {
        const id = `res-${r.candidateId}-${idSeq++}`
        setState(s => {
          // Materialise the implicit default resume first so the candidate ends up with 2 cards
          const existing = s.resumes.filter(x => x.candidateId === r.candidateId)
          const c = s.candidates.find(x => x.id === r.candidateId)
          const base = existing.length || !c ? [] : [mock.defaultResumeFor(c)]
          return { ...s, resumes: [...s.resumes, ...base, { ...r, id }] }
        })
        log({ what: `Added another resume: ${r.label}`, record: candidate(r.candidateId)?.name ?? '', recordHref: `/candidates/${r.candidateId}`, kind: 'Candidates' })
        return id
      },
      addResumeVersion: (resumeId, file, changesApplied) => {
        setState(s => {
          let list = s.resumes
          if (!list.some(x => x.id === resumeId)) {
            const c = s.candidates.find(x => `res-${x.id}` === resumeId)
            if (c) list = [...list, mock.defaultResumeFor(c)]
          }
          return {
            ...s,
            resumes: list.map(x => x.id === resumeId ? { ...x, versions: [...x.versions, { n: x.versions.length + 1, file, uploadedBy: currentUser.displayName, uploadedAt: 'Just now', changesApplied }] } : x),
            outputs: s.outputs.map(o => o.sourceResumeId === resumeId ? { ...o, stale: true, staleReason: 'Source resume has a new version' } : o),
          }
        })
      },
      setPrimaryResume: (candidateId, resumeId) => {
        setState(s => {
          let list = s.resumes
          if (!list.some(x => x.candidateId === candidateId)) {
            const c = s.candidates.find(x => x.id === candidateId)
            if (c) list = [...list, mock.defaultResumeFor(c)]
          }
          return { ...s, resumes: list.map(x => x.candidateId === candidateId ? { ...x, isPrimary: x.id === resumeId } : x) }
        })
        log({ what: 'Changed primary resume', record: candidate(candidateId)?.name ?? '', recordHref: `/candidates/${candidateId}`, kind: 'Candidates' })
      },
      rescoreOnResume: (matchId, resumeId) => {
        const m = state.matches.find(x => x.id === matchId)
        if (!m) return
        const res = resumesFor(m.candidateId).find(x => x.id === resumeId)
        const better: Band = m.band === 'Stretch' ? 'Good' : 'Strong'
        setState(s => ({
          ...s,
          matches: s.matches.map(x => x.id === matchId ? { ...x, scoredOnResumeId: resumeId, band: better, score: Math.min(95, x.score + 6) } : x),
          roles: s.roles.map(x => x.id === m.roleId ? { ...x, aiScoresUsed: x.aiScoresUsed + 1 } : x),
        }))
        log({ what: `Re-scored ${candidate(m.candidateId)?.name} on ${res?.label} resume · 1 AI score`, record: role(m.roleId)?.title ?? '', recordHref: `/roles/${m.roleId}`, kind: 'Reruns' })
        toast(`Re-scored on ${res?.label} resume`)
      },

      asksFor: roleId => state.clientAsks.filter(a => a.roleId === roleId),
      addClientAsk: a => {
        const r = role(a.roleId)
        const affects = a.type !== 'context'
        setState(s => ({
          ...s,
          clientAsks: [...s.clientAsks, { ...a, id: `ask-${idSeq++}`, addedBy: currentUser.displayName }],
          roles: s.roles.map(x => x.id === a.roleId ? {
            ...x,
            ...(affects && x.scoredCount > 0 ? { matchStatus: 'out-of-date' as const, outOfDateReason: `Client ask added: “${a.text}”.` } : {}),
            latestUpdate: { text: `Client ask: ${a.text}`, who: currentUser.displayName.split(' ')[0], when: 'Just now' },
          } : x),
        }))
        log({ what: `Added client ask · ${a.text}${a.saidBy ? ` (${a.source} · ${a.saidBy})` : ''}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${a.roleId}`, kind: 'Roles' })
        toast(affects && (r?.scoredCount ?? 0) > 0 ? 'Client ask added · matches are out of date' : 'Client ask added')
      },
      removeClientAsk: id => setState(s => ({ ...s, clientAsks: s.clientAsks.filter(a => a.id !== id) })),

      takeFor: (candidateId, roleId) =>
        (roleId ? state.takes.find(t => t.candidateId === candidateId && t.roleId === roleId) : undefined)
        ?? state.takes.find(t => t.candidateId === candidateId && !t.roleId),
      saveTakeDraft: (candidateId, text, opts) => setState(s => {
        const roleId = opts?.roleId ?? null
        const existing = s.takes.find(t => t.candidateId === candidateId && (t.roleId ?? null) === roleId)
        const c = s.candidates.find(x => x.id === candidateId)
        if (existing && existing.authorId === s.currentUserId) {
          return { ...s, takes: s.takes.map(t => t.id === existing.id ? {
            ...t, text, draftedByAI: opts?.draftedByAI ?? t.draftedByAI,
            status: t.status === 'signed' ? 'draft' : t.status,
            editedSinceSigning: t.status === 'signed' ? true : t.editedSinceSigning,
          } : t) }
        }
        // Someone else's take: "Write your own" replaces it for this output (role-specific) or the general take
        const others = existing ? s.takes.filter(t => t.id !== existing.id) : s.takes
        return { ...s, takes: [...others, {
          id: `take-${idSeq++}`, candidateId, roleId, text, status: 'draft', authorId: s.currentUserId,
          draftedByAI: opts?.draftedByAI, sourceCallIds: (c?.calls ?? []).map(x => x.id),
        }] }
      }),
      approveTake: takeId => {
        const t = state.takes.find(x => x.id === takeId)
        setState(s => ({ ...s, takes: s.takes.map(x => x.id === takeId ? { ...x, status: 'signed', approvedAt: 'Just now', editedSinceSigning: false, authorId: s.currentUserId } : x) }))
        if (t) log({ what: `Approved and signed take as ${currentUser.displayName}`, record: candidate(t.candidateId)?.name ?? '', recordHref: `/candidates/${t.candidateId}`, kind: 'Candidates', after: t.text })
        toast(`Take signed as ${currentUser.displayName}`)
      },

      savePromptVersion: (id, text, note) => {
        const p = state.prompts.find(x => x.id === id)
        setState(s => ({ ...s, prompts: s.prompts.map(x => {
          if (x.id !== id) return x
          const v = Math.max(...x.versions.map(y => y.v)) + 1
          return { ...x, activeVersion: v, versions: [...x.versions, { v, text, savedBy: currentUser.displayName, savedAt: 'Just now', note }] }
        }) }))
        if (p) {
          const v = Math.max(...p.versions.map(y => y.v)) + 1
          log({ what: `Saved ${p.name} prompt v${v}${note ? ` · ${note}` : ''}`, record: 'Settings · Prompts', recordHref: '/settings?tab=prompts', kind: 'Overrides', before: `v${p.activeVersion}`, after: `v${v}` })
          toast(`Saved ${p.name} prompt v${v}`)
        }
      },
      restorePromptVersion: (id, v) => {
        const p = state.prompts.find(x => x.id === id)
        setState(s => ({ ...s, prompts: s.prompts.map(x => x.id === id ? { ...x, activeVersion: v } : x) }))
        if (p) {
          log({ what: `Restored ${p.name} prompt to v${v}`, record: 'Settings · Prompts', recordHref: '/settings?tab=prompts', kind: 'Overrides', before: `v${p.activeVersion}`, after: `v${v}` })
          toast(`Restored v${v}`)
        }
      },

      addOutputRevision: (outputId, rev) => setState(s => ({
        ...s,
        outputs: s.outputs.map(o => o.id === outputId ? {
          ...o, revisions: [...(o.revisions ?? []), { ...rev, n: (o.revisions?.length ?? 0) + 1, createdBy: currentUser.displayName, at: 'Just now' }],
        } : o),
      })),

      setDomains: d => setState(s => ({ ...s, domains: d })),
    }
  }, [state, toasts, toast, dismissToast, log])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** v0.3 · T2 — deterministic placeholder for an AI score (wireframe only) */
function synthScore(c: Candidate | undefined, r: Role | undefined, i: number, rank: number, run: number): Partial<Match> {
  const score = Math.max(52, 82 - i * 3 - (c?.completeness && c.completeness < 60 ? 6 : 0))
  const band: Band = score >= 80 ? 'Strong' : score >= 70 ? 'Good' : 'Stretch'
  const chips: MatchChip[] = []
  if (c?.years != null) chips.push({ kind: 'evidence', label: `${c.years} yrs` })
  if (c?.metro) chips.push({ kind: 'evidence', label: c.metro })
  else chips.push({ kind: 'assumed', label: 'Location' })
  if (!c?.workAuth.status) chips.push({ kind: 'assumed', label: 'Work authorization' })
  const skill = r?.mustSkills[0]
  if (skill) chips.push(c?.skills.includes(skill) ? { kind: 'evidence', label: skill } : { kind: 'predicted', label: skill, detail: 'from adjacent skills' })
  if (c && r && c.category !== r.category) chips.push({ kind: 'gap', label: `${c.category}, not ${r.category}` })
  return {
    scored: true, scoredInRun: run, rank, band, score,
    reason: c ? `${c.headline.split('·')[0].trim()} with ${c.years ?? 'unknown'} years; ranked on evidence from the resume.` : 'Ranked on evidence.',
    chips, delta: 'new',
  }
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

/* ==========================================================================
   Wireframe state registry — powers the bottom-left state switcher.
   A screen calls useWireframeState('S-04', [...states]) and gets [state, set].
   ========================================================================== */

export interface WfState { id: string; label: string }
interface WfRegistration { screenId: string; title: string; states: WfState[] }
interface WfApi {
  current: WfRegistration | null
  register: (r: WfRegistration) => void
  unregister: (screenId: string) => void
  values: Record<string, string>
  setValue: (screenId: string, v: string) => void
}
const WfCtx = createContext<WfApi | null>(null)

export function WireframeProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<WfRegistration | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const api = useMemo<WfApi>(() => ({
    current, values,
    register: r => setCurrent(r),
    unregister: id => setCurrent(c => (c?.screenId === id ? null : c)),
    setValue: (id, v) => setValues(x => ({ ...x, [id]: v })),
  }), [current, values])
  return <WfCtx.Provider value={api}>{children}</WfCtx.Provider>
}

export function useWireframe() {
  const v = useContext(WfCtx)
  if (!v) throw new Error('useWireframe outside provider')
  return v
}

/**
 * Register a screen's reviewable states. Returns [state, setState].
 * `key` lets one screen register under a sub-ID (e.g. 'S-04 · Matches').
 */
export function useWireframeState(screenId: string, title: string, states: WfState[], initial?: string): [string, (v: string) => void] {
  const wf = useWireframe()
  const statesKey = states.map(s => s.id).join('|')
  useEffect(() => {
    wf.register({ screenId, title, states })
    return () => wf.unregister(screenId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId, title, statesKey])
  const value = wf.values[screenId] ?? initial ?? states[0]?.id ?? 'default'
  return [value, (v: string) => wf.setValue(screenId, v)]
}
