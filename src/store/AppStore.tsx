import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as mock from '../data/mock'
import type {
  Match, Role, Candidate, ResumeOutput, LogEntry, RoleMatchForCandidate, LogKind,
  TeamMember, Permission, AccessRole, Resume, ClientAsk, Take, PromptDef, OutputRevision, MatchChip, Band,
  RoleRequirement, RequirementEffect, NotInterestedReason, CandidateSideState, ClientSideState, ProspectSideState,
  OutputStyle, OutputDelivery, EmailDraftRecord, Recommendation,
} from '../data/types'

/* ---------- v0.4 · §7.8 access matrix ---------- */
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
  drafts: ['Admin', 'Recruiter', 'Associate'],
  exportCsv: ['Admin'],
  settings: ['Admin'],
  delete: ['Admin'],
}
const PERMISSION_VERB: Record<Permission, string> = {
  addRecords: 'add records',
  editFacts: 'edit requirements and candidate facts',
  score: 'score with AI',
  shortlist: 'shortlist',
  reject: 'reject',
  genMasked: 'generate masked resumes',
  genIdentity: 'generate editable or as-is resumes',
  copyMasked: 'copy masked lists',
  copyFull: 'copy full lists',
  signTake: 'sign their own take',
  drafts: 'draft outreach and create Gmail drafts',
  exportCsv: 'export CSV',
  settings: 'change Settings',
  delete: 'delete records',
}
/** "Recruiters and Admins can reject" */
export function whoCanText(p: Permission) {
  const roles = PERMISSIONS[p]
  const names = roles.map(r => `${r}s`)
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `${list} can ${PERMISSION_VERB[p]}`
}
/** v0.4 · §7.2: 25 or fewer remaining scores them all; >25 offers 10 · 25 · 50 · All (cap 50 per run) */
export const SCORE_OPTIONS = [10, 25, 50] as const
export const SCORE_AUTO_THRESHOLD = 25
export const SCORE_RUN_CAP = 50

/* ==========================================================================
   App store — in-memory, so flows feel real during the founder review.
   ========================================================================== */

export interface Toast { id: number; message: string; undo?: () => void; action?: { label: string; onClick: () => void } }

export interface ProposedProfileUpdate {
  candidateId: string
  candidateName: string
  field: string
  from: string
  to: string
  reason: NotInterestedReason
  apply: () => void
}

interface AppState {
  roles: Role[]
  candidates: Candidate[]
  matches: Match[]
  rolesForCandidate: Record<string, RoleMatchForCandidate[]>
  outputs: ResumeOutput[]
  activity: LogEntry[]
  included: Record<string, string[]>
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
  /* v0.4 */
  autoSuggestCount: number
  defaultStyle: { prospect: OutputStyle; client: OutputStyle }
  defaultDelivery: { prospect: OutputDelivery; client: OutputDelivery }
  emailDrafts: EmailDraftRecord[]
  probe1Stats: { inProductCount: number; inProductMedianRounds: number; claudeCount: number; claudeMedianRounds: number }
  probe2Stats: { creativeSends: number; creativeInterested: number; traditionalSends: number; traditionalInterested: number }
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
  currentUser: TeamMember
  setCurrentUser: (id: string) => void
  can: (p: Permission) => boolean
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => void
  member: (id: string) => TeamMember | undefined

  shortlistMany: (matchIds: string[], opts?: { onOpenShortlist?: () => void }) => { done: number; skipped: number }
  rejectMany: (matchIds: string[], reason: string) => { done: number; skipped: number }

  skipForScoring: (matchIds: string[], skip: boolean) => void
  scoreMatches: (roleId: string, n: number, opts?: { matchIds?: string[] }) => number
  setDefaultScoreCount: (n: number) => void

  resumesFor: (candidateId: string) => Resume[]
  addResume: (r: Omit<Resume, 'id'>) => string
  addResumeVersion: (resumeId: string, file: string, changesApplied: number) => void
  setPrimaryResume: (candidateId: string, resumeId: string) => void
  rescoreOnResume: (matchId: string, resumeId: string) => void

  asksFor: (roleId: string) => ClientAsk[]
  addClientAsk: (a: Omit<ClientAsk, 'id' | 'addedBy'>) => void
  removeClientAsk: (id: string) => void

  takeFor: (candidateId: string, roleId?: string | null) => Take | undefined
  saveTakeDraft: (candidateId: string, text: string, opts?: { roleId?: string | null; draftedByAI?: boolean }) => void
  approveTake: (takeId: string) => void

  savePromptVersion: (id: string, text: string, note?: string) => void
  restorePromptVersion: (id: string, v: number) => void

  addOutputRevision: (outputId: string, rev: Omit<OutputRevision, 'n' | 'createdBy' | 'at'>) => void
  setDomains: (d: string[]) => void

  /* ---------- v0.4 ---------- */
  /** §7.1 Unified role requirements */
  requirementsFor: (roleId: string) => RoleRequirement[]
  addRequirement: (roleId: string, req: Omit<RoleRequirement, 'id' | 'roleId' | 'addedBy'>) => void
  toggleRequirementEffect: (roleId: string, reqId: string, effect: RequirementEffect) => void
  removeRequirement: (roleId: string, reqId: string) => void
  setAutoSuggestCount: (n: number) => void

  /** §7.4 Mark "Not interested" per role (C10 / F-24) */
  markNotInterested: (candidateId: string, roleIds: string[], reason: NotInterestedReason) => ProposedProfileUpdate | null
  undoNotInterested: (candidateId: string, roleId: string) => void

  /** §7.5 Alignment pills (C2 / F-22) */
  updateAlignment: (matchId: string, side: 'candidate' | 'client' | 'prospect', value: CandidateSideState | ClientSideState | ProspectSideState) => void

  /** §7.6 Delivery & Style (C12 / Probe 2) */
  toggleOutputLink: (outputId: string, active: boolean) => void
  setDefaultStyle: (patch: Partial<{ prospect: OutputStyle; client: OutputStyle }>) => void
  setDefaultDelivery: (patch: Partial<{ prospect: OutputDelivery; client: OutputDelivery }>) => void

  /** §7.7 Email drafting & Gmail handoff (C3 / C4 / Probe 1) */
  recordEmailDraft: (draft: Omit<EmailDraftRecord, 'id'>) => string
}

const Ctx = createContext<AppApi | null>(null)
let toastSeq = 1
let idSeq = 200

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
    showScore: false, // v0.4 §7.2: no numeric score on screen
    needsAttention: true,
    team: mock.team,
    currentUserId: 'purvesh',
    resumes: mock.resumes,
    clientAsks: mock.clientAsks,
    takes: mock.takes,
    prompts: mock.prompts,
    defaultScoreCount: 10,
    domains: ['B2B SaaS', 'Payments/Fintech', 'Healthtech', 'Marketplace', 'Consumer', 'DevTools', 'AI/ML', 'E-commerce', 'Edtech', 'Enterprise'],
    autoSuggestCount: 5,
    defaultStyle: { prospect: 'creative', client: 'traditional' },
    defaultDelivery: { prospect: 'link', client: 'pdf' },
    emailDrafts: [],
    probe1Stats: { inProductCount: 18, inProductMedianRounds: 1.5, claudeCount: 14, claudeMedianRounds: 2.4 },
    probe2Stats: { creativeSends: 24, creativeInterested: 8, traditionalSends: 26, traditionalInterested: 9 },
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
      setState(s => ({
        ...s,
        matches: s.matches.map(m => m.id === matchId ? {
          ...m,
          status,
          rejectReason: status === 'rejected' ? rejectReason : m.rejectReason,
          alignment: status === 'shortlisted' && !m.alignment
            ? { candidateSide: 'not-asked', clientSide: 'not-sent', prospectSide: 'not-pitched', updatedBy: currentUser.displayName, at: 'Just now' }
            : m.alignment,
        } : m),
      }))

    const matchLabel = (matchId: string) => {
      const m = state.matches.find(x => x.id === matchId)
      const c = m && candidate(m.candidateId)
      const r = m && role(m.roleId)
      return { m, c, r }
    }

    const requirementsFor = (roleId: string): RoleRequirement[] => {
      const r = role(roleId)
      return r?.requirements ?? []
    }

    return {
      ...state, toasts, toast, dismissToast, log, role, candidate, setMatchStatus,
      shortlist: matchId => {
        const { m, c, r } = matchLabel(matchId)
        if (!m) return
        prevStatus.current[matchId] = m.status
        setMatchStatus(matchId, 'shortlisted')
        setState(s => ({ ...s, roles: s.roles.map(x => x.id === m.roleId ? { ...x, shortlisted: x.shortlisted + 1 } : x) }))
        log({ what: `Shortlisted ${c?.name}${!m.scored ? ' (not scored)' : ''}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${m.roleId}`, kind: 'Decisions' })
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
      reorderShortlist: (_roleId, ordered) => setState(s => {
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
            if (m.status === 'not-interested') return m // C10: never suggested again
            const delta = roleId === 'northwind-spm' ? mock.northwindAfterRerun[m.id] : undefined
            if (delta === 'requalified') return { ...m, delta, status: 'requalified', rank: 5 }
            if (m.id === 'm5' && roleId === 'northwind-spm') return { ...m, rank: 6, delta: undefined }
            return { ...m, delta }
          }),
        }))
        log({ what: `Re-scored ${r?.scoredCount ?? 7} candidates`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Reruns' })
      },
      findMatches: roleId => {
        const r = role(roleId)
        setState(s => ({ ...s, roles: s.roles.map(x => x.id === roleId ? { ...x, matchStatus: 'up-to-date', updated: 'Just now' } : x) }))
        log({ what: `Auto-scan · ${r?.passCount} not eliminated · ${state.autoSuggestCount} suggested`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Reruns' })
      },
      includeAnyway: (roleId, candidateId, note) => {
        const r = role(roleId); const c = candidate(candidateId)
        setState(s => ({
          ...s,
          included: { ...s.included, [roleId]: [...(s.included[roleId] ?? []), candidateId] },
          matches: [...s.matches, {
            id: `inc-${roleId}-${candidateId}`, roleId, candidateId, rank: 99, band: 'Stretch', recommendation: 'Mild', score: 55, status: 'new', scored: false, similarity: 0,
            reason: `Included anyway by ${currentUser.displayName}${note ? ` — “${note}”` : ''}. Placed in Not scored.`,
            chips: [{ kind: 'gap', label: 'Fails an eliminator (override)' }],
          }],
        }))
        log({ what: `Included ${c?.name} anyway${note ? ` · “${note}”` : ''}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Overrides' })
        toast(`Included ${c?.name} in Not scored`)
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
        outputs: [...list.map(o => ({
          ...o,
          id: `o${idSeq++}`,
          created: 'Just now',
          createdBy: currentUser.displayName,
          style: o.style ?? (o.type === 'Masked' ? s.defaultStyle.prospect : s.defaultStyle.client),
          delivery: o.delivery ?? (o.type === 'Masked' ? s.defaultDelivery.prospect : s.defaultDelivery.client),
          shareUrl: o.shareUrl ?? `https://heroscouter.com/p/${o.candidateId}-${idSeq}`,
          linkActive: o.linkActive ?? true,
        })), ...s.outputs],
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
        const eligible = targets.filter(m => m.status !== 'shortlisted' && m.status !== 'rejected' && m.status !== 'not-interested')
        const skipped = targets.length - eligible.length
        if (!eligible.length) return { done: 0, skipped }
        const prev = new Map(eligible.map(m => [m.id, m.status]))
        const roleId = eligible[0].roleId
        const r = role(roleId)
        setState(s => ({
          ...s,
          matches: s.matches.map(m => prev.has(m.id) ? {
            ...m,
            status: 'shortlisted',
            alignment: m.alignment ?? { candidateSide: 'not-asked', clientSide: 'not-sent', prospectSide: 'not-pitched', updatedBy: currentUser.displayName, at: 'Just now' },
          } : m),
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
        const eligible = targets.filter(m => m.status !== 'rejected' && m.status !== 'not-interested')
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
      },
      scoreMatches: (roleId, n, opts) => {
        const r = role(roleId)
        const pool = state.matches
          .filter(m => m.roleId === roleId && !m.scored && !m.skipped && m.status !== 'rejected' && m.status !== 'not-interested' && (!opts?.matchIds || opts.matchIds.includes(m.id)))
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
        const betterRec: Recommendation = m.recommendation === 'Not recommended' ? 'Mild' : 'Strong'
        setState(s => ({
          ...s,
          matches: s.matches.map(x => x.id === matchId ? { ...x, scoredOnResumeId: resumeId, band: better, recommendation: betterRec, score: Math.min(95, x.score + 6) } : x),
          roles: s.roles.map(x => x.id === m.roleId ? { ...x, aiScoresUsed: x.aiScoresUsed + 1 } : x),
        }))
        log({ what: `Re-scored ${candidate(m.candidateId)?.name} on ${res?.label} resume · 1 AI score`, record: role(m.roleId)?.title ?? '', recordHref: `/roles/${m.roleId}`, kind: 'Reruns' })
        toast(`Re-scored on ${res?.label} resume`)
      },

      asksFor: roleId => state.clientAsks.filter(a => a.roleId === roleId),
      addClientAsk: a => {
        const r = role(a.roleId)
        const affects = a.type !== 'context'
        const reqEffect: RequirementEffect = a.type === 'must-column' ? 'eliminates' : 'improves'
        const newReq: RoleRequirement = {
          id: `req-${idSeq++}`,
          roleId: a.roleId,
          text: a.text,
          source: a.source,
          saidBy: a.saidBy,
          when: a.when,
          effect: reqEffect,
          column: a.column as RoleRequirement['column'],
          addedBy: currentUser.displayName,
        }
        setState(s => ({
          ...s,
          clientAsks: [...s.clientAsks, { ...a, id: `ask-${idSeq++}`, addedBy: currentUser.displayName }],
          roles: s.roles.map(x => x.id === a.roleId ? {
            ...x,
            requirements: [...(x.requirements ?? []), newReq],
            ...(affects && x.scoredCount > 0 ? { matchStatus: 'out-of-date' as const, outOfDateReason: `Requirement added: “${a.text}”.` } : {}),
            latestUpdate: { text: `Requirement added: ${a.text}`, who: currentUser.displayName.split(' ')[0], when: 'Just now' },
          } : x),
        }))
        log({ what: `Added requirement · ${a.text}${a.saidBy ? ` (${a.source} · ${a.saidBy})` : ''}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${a.roleId}`, kind: 'Roles' })
        toast(affects && (r?.scoredCount ?? 0) > 0 ? 'Requirement added · scores flagged out of date' : 'Requirement added')
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

      /* ================= v0.4 ================= */
      requirementsFor,
      addRequirement: (roleId, req) => {
        const r = role(roleId)
        const newReq: RoleRequirement = { ...req, id: `req-${idSeq++}`, roleId, addedBy: currentUser.displayName, when: req.when ?? 'Just now' }
        setState(s => ({
          ...s,
          roles: s.roles.map(x => x.id === roleId ? {
            ...x,
            requirements: [...(x.requirements ?? []), newReq],
            ...(req.effect === 'eliminates' ? { passCount: Math.max(8, x.passCount - 4) } : {}),
            ...(x.scoredCount > 0 ? { matchStatus: 'out-of-date' as const, outOfDateReason: `Requirement added (${req.effect === 'eliminates' ? 'Eliminates' : 'Improves score'}): “${req.text}”.` } : {}),
            latestUpdate: { text: `Requirement added: ${req.text}`, who: currentUser.displayName.split(' ')[0], when: 'Just now' },
          } : x),
        }))
        log({ what: `Added requirement (${req.effect === 'eliminates' ? 'Eliminates' : 'Improves score'}) · ${req.text}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${roleId}`, kind: 'Roles' })
        toast(req.effect === 'eliminates' ? 'Requirement added · Stage 1 re-ran for free' : 'Requirement added · checked during scoring')
      },
      toggleRequirementEffect: (roleId, reqId, effect) => {
        const r = role(roleId)
        const target = r?.requirements?.find(q => q.id === reqId)
        setState(s => ({
          ...s,
          roles: s.roles.map(x => x.id === roleId ? {
            ...x,
            requirements: (x.requirements ?? []).map(q => q.id === reqId ? { ...q, effect } : q),
            passCount: effect === 'eliminates' ? Math.max(8, x.passCount - 5) : x.passCount + 5,
            ...(x.scoredCount > 0 ? { matchStatus: 'out-of-date' as const, outOfDateReason: `Changed “${target?.text ?? 'requirement'}” to ${effect === 'eliminates' ? 'Eliminates' : 'Improves score'}.` } : {}),
            latestUpdate: { text: `${target?.text ?? 'Requirement'} → ${effect === 'eliminates' ? 'Eliminates' : 'Improves score'}`, who: currentUser.displayName.split(' ')[0], when: 'Just now' },
          } : x),
        }))
        toast(`Set to ${effect === 'eliminates' ? 'Eliminates (stage 1 re-ran)' : 'Improves score'}`)
      },
      removeRequirement: (roleId, reqId) => {
        setState(s => ({
          ...s,
          roles: s.roles.map(x => x.id === roleId ? {
            ...x,
            requirements: (x.requirements ?? []).filter(q => q.id !== reqId),
          } : x),
        }))
        toast('Requirement removed')
      },
      setAutoSuggestCount: n => setState(s => ({ ...s, autoSuggestCount: n })),

      markNotInterested: (candidateId, roleIds, reason) => {
        const c = candidate(candidateId)
        if (!c || !roleIds.length) return null
        setState(s => ({
          ...s,
          matches: s.matches.map(m => m.candidateId === candidateId && roleIds.includes(m.roleId)
            ? { ...m, status: 'not-interested', notInterestedReason: reason }
            : m),
          rolesForCandidate: {
            ...s.rolesForCandidate,
            [candidateId]: (s.rolesForCandidate[candidateId] ?? []).map(rm =>
              roleIds.includes(rm.roleId) ? { ...rm, status: 'not-interested', notInterestedReason: reason } : rm
            ),
          },
        }))
        const roleNames = roleIds.map(id => role(id)?.company ?? id).join(', ')
        log({
          what: `Marked ${c.name} not interested in ${roleIds.length === 1 ? roleNames : `${roleIds.length} roles (${roleNames})`} · ${reason}`,
          record: c.name,
          recordHref: `/candidates/${candidateId}`,
          kind: 'Decisions',
        })
        toast(`Marked not interested (${reason})`, {
          undo: () => setState(s => ({
            ...s,
            matches: s.matches.map(m => m.candidateId === candidateId && roleIds.includes(m.roleId)
              ? { ...m, status: 'new', notInterestedReason: undefined }
              : m),
            rolesForCandidate: {
              ...s.rolesForCandidate,
              [candidateId]: (s.rolesForCandidate[candidateId] ?? []).map(rm =>
                roleIds.includes(rm.roleId) ? { ...rm, status: 'new', notInterestedReason: undefined } : rm
              ),
            },
          })),
        })

        // C10 / US-51: If the reason is a preference (Pay, Location, Role type, Company), propose a profile update!
        if (reason === 'Pay') {
          const nextPay = '$190k–$215k'
          return {
            candidateId,
            candidateName: c.name,
            field: 'Minimum pay expectation',
            from: c.pay ?? 'Not captured',
            to: nextPay,
            reason,
            apply: () => {
              setState(s => ({
                ...s,
                candidates: s.candidates.map(x => x.id === candidateId ? { ...x, pay: nextPay, fieldSources: { ...x.fieldSources, pay: 'EDITED' } } : x),
              }))
              log({ what: `Updated ${c.name} pay expectation after declining role(s) on Pay`, record: c.name, recordHref: `/candidates/${candidateId}`, kind: 'Candidates', before: c.pay ?? 'Not captured', after: nextPay })
              toast(`Updated ${c.name}’s pay expectation to ${nextPay}`)
            },
          }
        }
        if (reason === 'Location') {
          const nextReloc = 'No'
          return {
            candidateId,
            candidateName: c.name,
            field: 'Open to relocate',
            from: c.relocate ?? 'Not captured',
            to: `${nextReloc} (${c.metro ?? 'local'} only)`,
            reason,
            apply: () => {
              setState(s => ({
                ...s,
                candidates: s.candidates.map(x => x.id === candidateId ? { ...x, relocate: 'No', fieldSources: { ...x.fieldSources, relocate: 'EDITED' } } : x),
              }))
              log({ what: `Updated ${c.name} relocation preference to No`, record: c.name, recordHref: `/candidates/${candidateId}`, kind: 'Candidates', before: String(c.relocate ?? 'Not captured'), after: 'No' })
              toast(`Updated ${c.name}’s relocation preference`)
            },
          }
        }
        if (reason === 'Role type') {
          return {
            candidateId,
            candidateName: c.name,
            field: 'Target sub-category',
            from: `${c.category} · ${c.subcategory}`,
            to: `${c.category} · Core IC/Lead only`,
            reason,
            apply: () => {
              toast(`Updated ${c.name}’s role preference`)
            },
          }
        }
        if (reason === 'Company') {
          const nextPrefs = [...(c.companyPrefs ?? ['Series B+']), 'No early-stage seed']
          return {
            candidateId,
            candidateName: c.name,
            field: 'Company preferences',
            from: (c.companyPrefs ?? []).join(', ') || 'Not captured',
            to: nextPrefs.join(', '),
            reason,
            apply: () => {
              setState(s => ({
                ...s,
                candidates: s.candidates.map(x => x.id === candidateId ? { ...x, companyPrefs: nextPrefs } : x),
              }))
              toast(`Updated ${c.name}’s company stage preferences`)
            },
          }
        }
        return null
      },

      undoNotInterested: (candidateId, roleId) => {
        setState(s => ({
          ...s,
          matches: s.matches.map(m => m.candidateId === candidateId && m.roleId === roleId ? { ...m, status: 'new', notInterestedReason: undefined } : m),
          rolesForCandidate: {
            ...s.rolesForCandidate,
            [candidateId]: (s.rolesForCandidate[candidateId] ?? []).map(rm => rm.roleId === roleId ? { ...rm, status: 'new', notInterestedReason: undefined } : rm),
          },
        }))
        toast('Restored candidate to role')
      },

      updateAlignment: (matchId, side, value) => {
        const { m, c, r } = matchLabel(matchId)
        if (!m) return
        setState(s => ({
          ...s,
          matches: s.matches.map(x => {
            if (x.id !== matchId) return x
            const base = x.alignment ?? { candidateSide: 'not-asked', clientSide: 'not-sent', prospectSide: 'not-pitched', updatedBy: currentUser.displayName, at: 'Just now' }
            const next: Match['alignment'] = {
              ...base,
              ...(side === 'candidate' ? { candidateSide: value as CandidateSideState } : {}),
              ...(side === 'client' ? { clientSide: value as ClientSideState } : {}),
              ...(side === 'prospect' ? { prospectSide: value as ProspectSideState } : {}),
              updatedBy: currentUser.displayName,
              at: 'Just now',
            }
            return {
              ...x,
              alignment: next,
              ...(side === 'candidate' && value === 'not-interested' ? { status: 'not-interested', notInterestedReason: 'Other' as const } : {}),
            }
          }),
        }))
        log({
          what: `Alignment updated (${side}: ${value}) for ${c?.name}`,
          record: `${r?.title} — ${r?.company}`,
          recordHref: `/roles/${m.roleId}?tab=shortlist`,
          kind: 'Decisions',
        })
        toast(`Updated ${side} alignment: ${value.replace('-', ' ')}`)
      },

      toggleOutputLink: (outputId, active) => {
        setState(s => ({
          ...s,
          outputs: s.outputs.map(o => o.id === outputId ? { ...o, linkActive: active } : o),
        }))
        toast(active ? 'Web link enabled' : 'Web link switched off')
      },

      setDefaultStyle: patch => setState(s => ({ ...s, defaultStyle: { ...s.defaultStyle, ...patch } })),
      setDefaultDelivery: patch => setState(s => ({ ...s, defaultDelivery: { ...s.defaultDelivery, ...patch } })),

      recordEmailDraft: draft => {
        const id = `em-${idSeq++}`
        setState(s => {
          const isInProd = draft.method === 'in-product'
          const p1 = {
            ...s.probe1Stats,
            inProductCount: s.probe1Stats.inProductCount + (isInProd ? 1 : 0),
            claudeCount: s.probe1Stats.claudeCount + (!isInProd ? 1 : 0),
          }
          // Automatically advance alignment pills on shortlisted rows when an email or Gmail draft is created!
          const nextMatches = s.matches.map(m => {
            if (draft.roleId && m.roleId === draft.roleId && draft.candidateIds.includes(m.candidateId)) {
              const base = m.alignment ?? { candidateSide: 'not-asked', clientSide: 'not-sent', prospectSide: 'not-pitched', updatedBy: currentUser.displayName, at: 'Just now' }
              if (draft.kind === 'interest-check' || draft.kind === 'roles-for-you') {
                return { ...m, alignment: { ...base, candidateSide: base.candidateSide === 'not-asked' ? 'asked' : base.candidateSide, updatedBy: currentUser.displayName, at: 'Just now' } }
              }
              if (draft.kind === 'profile-share' || draft.kind === 'shortlist') {
                return { ...m, alignment: { ...base, clientSide: base.clientSide === 'not-sent' ? 'sent' : base.clientSide, updatedBy: currentUser.displayName, at: 'Just now' } }
              }
              if (draft.kind === 'pitch') {
                return { ...m, alignment: { ...base, prospectSide: base.prospectSide === 'not-pitched' ? 'pitched' : base.prospectSide, updatedBy: currentUser.displayName, at: 'Just now' } }
              }
            }
            return m
          })
          return {
            ...s,
            emailDrafts: [{ ...draft, id }, ...s.emailDrafts],
            probe1Stats: p1,
            matches: nextMatches,
          }
        })
        log({
          what: `${draft.gmailDraftId ? 'Created Gmail draft' : draft.method === 'copied-prompt' ? 'Copied prompt for Claude' : 'Drafted email'} (${draft.kind}) to ${draft.recipientName}`,
          record: draft.subject,
          recordHref: draft.roleId ? `/roles/${draft.roleId}?tab=shortlist` : '/roles',
          kind: 'Outputs',
        })
        return id
      },
    }
  }, [state, toasts, toast, dismissToast, log])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** v0.4 · §7.2 — deterministic synthesis for an AI score (no numeric score on screen; returns requirementsMet, greenFlags, redFlags, recommendation) */
function synthScore(c: Candidate | undefined, r: Role | undefined, i: number, rank: number, run: number): Partial<Match> {
  const score = Math.max(52, 82 - i * 3 - (c?.completeness && c.completeness < 60 ? 6 : 0))
  const band: Band = score >= 80 ? 'Strong' : score >= 70 ? 'Good' : 'Stretch'
  const recommendation: Recommendation = score >= 80 ? 'Strong' : score >= 68 ? 'Mild' : 'Not recommended'
  const chips: MatchChip[] = []
  if (c?.years != null) chips.push({ kind: 'evidence', label: `${c.years} yrs` })
  if (c?.metro) chips.push({ kind: 'evidence', label: c.metro })
  else chips.push({ kind: 'assumed', label: 'Location' })
  if (!c?.workAuth.status) chips.push({ kind: 'assumed', label: 'Work authorization' })
  const skill = r?.mustSkills[0]
  if (skill) chips.push(c?.skills.includes(skill) ? { kind: 'evidence', label: skill } : { kind: 'predicted', label: skill, detail: 'from adjacent skills' })
  if (c && r && c.category !== r.category) chips.push({ kind: 'gap', label: `${c.category}, not ${r.category}` })

  const raw: Match = {
    id: 'tmp', roleId: r?.id ?? '', candidateId: c?.id ?? '', rank, band, recommendation, score,
    reason: c ? `${c.headline.split('·')[0].trim()} with ${c.years ?? 'unknown'} years; evaluated against ${r?.requirements?.length ?? 4} role requirements.` : 'Evaluated against role requirements.',
    chips, status: 'new', scored: true, similarity: rank,
  }
  const v4 = mock.buildDefaultScoring(raw, c, r)
  return {
    scored: true, scoredInRun: run, rank, band, score,
    reason: raw.reason,
    chips, delta: 'new',
    ...v4,
  }
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

/* ==========================================================================
   Wireframe state registry — powers the bottom-left state switcher.
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
