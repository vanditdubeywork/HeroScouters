import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as mock from '../data/mock'
import type { Match, Role, Candidate, ResumeOutput, LogEntry, RoleMatchForCandidate, LogKind } from '../data/types'

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
    setState(s => ({ ...s, activity: [{ id: `l${idSeq++}`, who: 'Vandit D.', when: 'Just now', ...e }, ...s.activity] }))
  }, [])

  const api = useMemo<AppApi>(() => {
    const role = (id: string) => state.roles.find(r => r.id === id)
    const candidate = (id: string) => state.candidates.find(c => c.id === id)
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
            id: `inc-${roleId}-${candidateId}`, roleId, candidateId, rank: 99, band: 'Stretch', score: 55, status: 'new',
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
        outputs: [...list.map(o => ({ ...o, id: `o${idSeq++}`, created: 'Just now', createdBy: 'Vandit D.' })), ...s.outputs],
      })),
      setShowScore: v => setState(s => ({ ...s, showScore: v })),
      setNeedsAttention: v => setState(s => ({ ...s, needsAttention: v })),
    }
  }, [state, toasts, toast, dismissToast, log])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
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
