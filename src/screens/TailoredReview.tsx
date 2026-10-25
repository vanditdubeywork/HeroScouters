import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, CircleCheck, Download, FileText, RotateCcw, Undo2 } from 'lucide-react'
import { useTopBar } from '../shell/AppShell'
import { Button, ExampleMark, Segmented, cn } from '../components/ui'
import { Banner, DocFrame, InfoNote, SourceBadge } from '../components/hs'
import { GatedButton } from '../components/v3'
import {
  DiffSection, EditableText, FixInProfile, PageTake, RefineBox, RefineStatus, RevisionsPopover, SourceResumeSelect,
  amendRevision, emphasise, factHaystack, initialRevisions, latestVersion, pushRevision, readStale,
  resumeLabel, runRefine, skillsFor, storedRevisions, useSourceResume, useViewAsWhile, writeStale,
  type LocalRevision, type OutputSection, type RefineResult, type SectionContent,
} from '../components/outputs'
import { useApp, useWireframeState } from '../store/AppStore'
import type { Candidate, Resume } from '../data/types'

/* ==========================================================================
   S-10 · Editable resume review (client roles) — Product Design Doc §8, §9.4 + PRD v0.3 §7.3, §7.5, §7.6, §7.8
   Every change cites a source (RESUME / CALL). Refine with a prompt + inline edit.
   ========================================================================== */

type Kind = 'summary' | 'reorder' | 'reword' | 'skill'
interface Change { id: string; kind: Kind; label: string; source: 'RESUME' | 'CALL'; bulletId?: string; toIndex?: number; text?: string; skill?: string }
interface Bullet { id: string; text: string }
interface Job { title: string; company: string; dates: string; bullets: Bullet[] }
interface Doc { name: string; headline: string; contact: string; summary: string; editableSummary?: string; jobs: Job[]; skills: string[]; education?: string; strong: boolean; changes: Change[] }

const DOCS: Record<string, Doc> = {
  priya: {
    name: 'Priya S.', headline: 'Senior Product Manager', contact: 'San Francisco, CA · priya.s@example.com · linkedin.com/in/priya-s-example',
    summary: 'Product manager with 7 years across B2B SaaS and fintech. Customer-obsessed, data-informed and comfortable with ambiguity.',
    editableSummary: 'Payments product manager with 7 years owning payouts, billing and pricing at fintech and B2B SaaS companies.',
    jobs: [
      { title: 'Senior Product Manager, Payments', company: 'Ledgerly', dates: '2022–Present', bullets: [
        { id: 'b1', text: 'Grew self-serve checkout conversion from 61% to 72%' },
        { id: 'b2', text: 'Shipped usage-based billing API adopted by 40% of new accounts in 6 months' },
        { id: 'b3', text: 'Cut payout support tickets by 38% after launching instant payouts to 12k merchants' },
      ] },
      { title: 'Product Manager, Billing', company: 'Stripe', dates: '2019–2022', bullets: [
        { id: 'b4', text: 'Worked on the Atlas pricing revamp with finance and sales; ARPA up 14% in two quarters' },
        { id: 'b5', text: 'Owned the invoicing roadmap for SMB and enterprise billing' },
      ] },
      { title: 'Associate PM', company: 'Freshworks', dates: '2017–2019', bullets: [
        { id: 'b6', text: 'Ran partner onboarding for the payments integrations team' },
      ] },
    ],
    skills: ['Payments', 'Roadmapping', 'B2B SaaS', 'Pricing', 'API products', 'Stakeholder management'],
    education: 'MBA, Technology management · Kellogg School of Management',
    strong: false,
    changes: [
      { id: 'c1', kind: 'summary', label: 'Summary rewritten toward payouts and billing', source: 'RESUME' },
      { id: 'c2', kind: 'reorder', label: 'Instant payouts moved to the top', source: 'RESUME', bulletId: 'b3', toIndex: 0 },
      { id: 'c3', kind: 'reorder', label: 'Billing API moved up', source: 'RESUME', bulletId: 'b2', toIndex: 1 },
      { id: 'c4', kind: 'reorder', label: 'Invoicing roadmap moved up', source: 'RESUME', bulletId: 'b5', toIndex: 0 },
      { id: 'c5', kind: 'reword', label: 'Leads with payouts', source: 'RESUME', bulletId: 'b3', text: 'Launched instant payouts to 12k merchants; cut payout support tickets by 38%' },
      { id: 'c6', kind: 'reword', label: 'Leads with the result', source: 'RESUME', bulletId: 'b4', text: 'Lifted ARPA 14% in two quarters through the Atlas pricing revamp, with finance and sales' },
      { id: 'c7', kind: 'skill', label: 'SQL confirmed on the call', source: 'CALL', skill: 'SQL' },
    ],
  },
  jordant: {
    name: 'Jordan T.', headline: 'Senior Product Manager · payments infrastructure', contact: 'Oakland, CA · jordan.t@example.com',
    summary: 'Senior product manager with 9 years in payments infrastructure: payouts, ledgers and payment APIs. Writes SQL daily.',
    jobs: [
      { title: 'Senior Product Manager, Payments Platform', company: 'Corridor', dates: '2020–Present', bullets: [
        { id: 'j1', text: 'Shipped payout APIs used by 2,300 platforms' },
        { id: 'j2', text: 'Rebuilt the double-entry ledger with engineering; reconciliation time down 60%' },
        { id: 'j3', text: 'Wrote the SQL behind the weekly payouts health review' },
      ] },
      { title: 'Product Manager', company: 'Brightline Bank', dates: '2016–2020', bullets: [{ id: 'j4', text: 'Launched same-day ACH for business accounts' }] },
    ],
    skills: ['Payments', 'Ledgers', 'Payout APIs', 'SQL', 'Roadmapping'],
    education: 'BS, Industrial engineering · UC Berkeley',
    strong: true,
    changes: [
      { id: 'k1', kind: 'reorder', label: 'Ledger rebuild moved up', source: 'RESUME', bulletId: 'j2', toIndex: 1 },
      { id: 'k2', kind: 'skill', label: 'Treasury mentioned on the call', source: 'CALL', skill: 'Treasury' },
    ],
  },
}

/** Fallback for candidates without a hand-written example: original only, no changes */
function docFor(c: Candidate, resume?: Resume): Doc {
  const base = DOCS[c.id] ?? {
    name: c.name, headline: c.headline, contact: [c.city, c.email].filter(Boolean).join(' · '),
    summary: `${c.headline.split(' · ')[0]}${c.years != null ? ` with ${c.years} years` : ''}.`,
    jobs: c.companies.map((co, i) => ({ title: co.title, company: co.name, dates: `${co.start}–${co.end}`, bullets: i === 0 ? c.achievements.map((a, j) => ({ id: `a${j}`, text: a })) : [] })),
    skills: c.skills, education: c.education ? `${c.education.degree}, ${c.education.field} · ${c.education.school}` : undefined,
    strong: true, changes: [],
  }
  if (!resume || resume.isPrimary) return base
  return {
    ...base,
    headline: resume.headline,
    editableSummary: `${resume.headline.split(' · ')[0]} with ${c.years ?? 7} years leading ${resume.emphasis.join(', ').toLowerCase()}.`,
    skills: skillsFor(c, resume),
  }
}

function summarize(changes: Change[]) {
  const n = (k: Kind) => changes.filter(c => c.kind === k).length
  const pl = (x: number, w: string) => `${x} ${w}${x === 1 ? '' : 's'}`
  const parts = [
    n('summary') ? 'summary rewritten' : '',
    n('reorder') ? `${pl(n('reorder'), 'bullet')} reordered` : '',
    n('reword') ? `${pl(n('reword'), 'bullet')} reworded` : '',
    n('skill') ? `${pl(n('skill'), 'skill')} surfaced from the call` : '',
  ].filter(Boolean)
  return `${pl(changes.length, 'change')}: ${parts.join(', ')}`
}

interface CandEditState {
  sourceResumeId: string
  summaryOverride?: string
  bulletOverrides: Record<string, string>
  jobOrderOverrides: Record<string, string[]>
  skillsOverride?: string[]
  revs: LocalRevision[]
  curRev: number
  downloadedRev: number | null
  refineResult: RefineResult | null
  refineInstruction: string
  refineUsage: number
}

const STATES = [
  { id: 'editable', label: 'Editable + refine' },
  { id: 'as-is', label: 'Send as-is' },
  { id: 'reverted', label: 'All changes reverted' },
  { id: 'associate', label: 'Associate (gated)' },
]

export function TailoredReview() {
  const app = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const roleId = params.get('role') ?? 'northwind-spm'
  const r = app.role(roleId)
  const ids = (params.get('candidates') ?? 'priya,jordant').split(',').filter(id => app.candidate(id))
  const cands = (ids.length ? ids : ['priya', 'jordant']).map(id => app.candidate(id)).filter((c): c is Candidate => !!c)
  const [wf] = useWireframeState('S-10', 'Editable resume', STATES)
  useViewAsWhile(wf === 'associate', 'aman')
  useTopBar([{ label: 'Roles', to: '/roles' }, { label: r ? `${r.title} — ${r.company}` : 'Role', to: r ? `/roles/${r.id}?tab=shortlist` : '/roles' }, { label: 'Editable resume' }])

  const [idx, setIdx] = useState(0)
  const [mode, setMode] = useState<Record<string, 'editable' | 'as-is'>>(() => Object.fromEntries(cands.map(c => [c.id, docFor(c).strong && c.id !== cands[0].id ? 'as-is' : 'editable'])))
  const [reverted, setReverted] = useState<Record<string, string[]>>({})
  const [approved, setApproved] = useState<string[]>([])
  const [refining, setRefining] = useState(false)

  const buildInitialEditState = (cand: Candidate): CandEditState => {
    const list = app.resumesFor(cand.id)
    const match = app.matches.find(m => m.candidateId === cand.id && m.roleId === roleId)
    const defRes = list.find(x => x.id === match?.scoredOnResumeId) ?? list.find(x => x.isPrimary) ?? list[0]
    const d = docFor(cand, defRes)
    const snap: SectionContent = {
      summary: [d.editableSummary ?? d.summary],
      ...Object.fromEntries(d.jobs.map(j => [`job:${j.company}`, j.bullets.map(b => b.text)])),
      skills: d.skills,
    }
    return {
      sourceResumeId: defRes?.id ?? `res-${cand.id}`,
      bulletOverrides: {},
      jobOrderOverrides: {},
      revs: initialRevisions(snap, app.currentUser.displayName),
      curRev: 1,
      downloadedRev: null,
      refineResult: null,
      refineInstruction: '',
      refineUsage: 0,
    }
  }

  const [editStates, setEditStates] = useState<Record<string, CandEditState>>(() =>
    Object.fromEntries(cands.map(cand => [cand.id, buildInitialEditState(cand)])),
  )
  const patchEdit = (candId: string, patch: Partial<CandEditState>) =>
    setEditStates(s => ({ ...s, [candId]: { ...s[candId], ...patch } }))

  const c = cands[Math.min(idx, cands.length - 1)]
  const curEdit = editStates[c.id] ?? buildInitialEditState(c)
  const { list: sourceResumes, fromMatch } = useSourceResume(c.id, roleId)
  const activeSourceResume = sourceResumes.find(x => x.id === curEdit.sourceResumeId) ?? sourceResumes[0]

  const doc = docFor(c, activeSourceResume)
  const m = mode[c.id] ?? 'editable'
  const rev = reverted[c.id] ?? []
  const activeChanges = doc.changes.filter(x => !rev.includes(x.id))
  const take = app.takeFor(c.id, r?.id ?? null)
  const takeAuthor = take ? app.member(take.authorId) : undefined

  const [staleReason, setStaleReason] = useState<string | null>(() => readStale(`editable:${c.id}`))
  useEffect(() => { setStaleReason(readStale(`editable:${c.id}`)) }, [c.id])

  // Wireframe state switcher drives the current candidate
  const prev = useRef(wf)
  useEffect(() => {
    if (prev.current === wf) return
    prev.current = wf
    if (wf === 'as-is') setMode(s => ({ ...s, [c.id]: 'as-is' }))
    if (wf === 'editable' || wf === 'associate') { setMode(s => ({ ...s, [c.id]: 'editable' })); setReverted(s => ({ ...s, [c.id]: [] })) }
    if (wf === 'reverted') { setMode(s => ({ ...s, [c.id]: 'editable' })); setReverted(s => ({ ...s, [c.id]: doc.changes.map(x => x.id) })) }
  }, [wf, c.id, doc.changes])

  const toggle = (id: string) => setReverted(s => ({ ...s, [c.id]: rev.includes(id) ? rev.filter(x => x !== id) : [...rev, id] }))

  const switchSourceResume = (resId: string) => {
    const nextRes = sourceResumes.find(x => x.id === resId)
    const nextDoc = docFor(c, nextRes)
    const snap: SectionContent = {
      summary: [nextDoc.editableSummary ?? nextDoc.summary],
      ...Object.fromEntries(nextDoc.jobs.map(j => [`job:${j.company}`, emphasise(j.bullets.map(b => b.text), nextRes)])),
      skills: nextDoc.skills,
    }
    const nextRevs = pushRevision(curEdit.revs, `Switched to ${resumeLabel(nextRes)}`, 'Whole resume', app.currentUser.displayName, snap)
    patchEdit(c.id, {
      sourceResumeId: resId,
      summaryOverride: nextDoc.editableSummary ?? nextDoc.summary,
      skillsOverride: nextDoc.skills,
      revs: nextRevs,
      curRev: nextRevs.length,
      refineResult: null,
    })
    app.toast(`Using ${resumeLabel(nextRes)}`)
  }

  const effectiveSummary = curEdit.summaryOverride ?? (( !rev.includes('c1') && doc.editableSummary) ? doc.editableSummary : doc.summary)
  const effectiveSkills = curEdit.skillsOverride ?? doc.skills

  const effectiveBulletsForJob = (job: Job): { id: string; text: string }[] => {
    const list = job.bullets.map(b => {
      const reword = doc.changes.find(x => x.kind === 'reword' && x.bulletId === b.id)
      const baseText = (!rev.includes(reword?.id ?? '') && reword?.text) ? reword.text : b.text
      return { id: b.id, text: curEdit.bulletOverrides[b.id] ?? baseText }
    })
    doc.changes.filter(x => x.kind === 'reorder' && !rev.includes(x.id)).forEach(x => {
      const i = list.findIndex(b => b.id === x.bulletId)
      if (i < 0 || x.toIndex === undefined) return
      const [item] = list.splice(i, 1)
      list.splice(x.toIndex, 0, item)
    })
    const customOrder = curEdit.jobOrderOverrides[job.company]
    if (customOrder?.length) {
      return [...list].sort((a, b) => {
        const ia = customOrder.indexOf(a.text)
        const ib = customOrder.indexOf(b.text)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
    }
    return list
  }

  const sectionsForRefine = (): OutputSection[] => [
    { key: 'summary', label: 'Summary', lines: [effectiveSummary], kind: 'text' },
    ...doc.jobs.map(j => ({
      key: `job:${j.company}`,
      label: `Experience · ${j.company}`,
      lines: effectiveBulletsForJob(j).map(b => b.text),
      kind: 'list' as const,
    })),
    { key: 'skills', label: 'Skills', lines: effectiveSkills, kind: 'list' },
  ]

  const currentSnapshot = (): SectionContent =>
    Object.fromEntries(sectionsForRefine().map(s => [s.key, s.lines]))

  const applySectionLines = (secKey: string, lines: string[], state: CandEditState): Partial<CandEditState> => {
    if (secKey === 'summary') return { summaryOverride: lines[0] ?? effectiveSummary }
    if (secKey === 'skills') return { skillsOverride: lines }
    if (secKey.startsWith('job:')) {
      const company = secKey.slice(4)
      const job = doc.jobs.find(j => j.company === company)
      if (!job) return {}
      const ordered = effectiveBulletsForJob(job)
      const nextBulletOverrides = { ...state.bulletOverrides }
      ordered.forEach((b, idx) => {
        if (lines[idx] !== undefined) nextBulletOverrides[b.id] = lines[idx]
      })
      return {
        bulletOverrides: nextBulletOverrides,
        jobOrderOverrides: { ...state.jobOrderOverrides, [company]: lines },
      }
    }
    return {}
  }

  const handleRefine = (instruction: string, scope: string) => {
    setRefining(true)
    window.setTimeout(() => {
      setRefining(false)
      const secs = sectionsForRefine()
      const result = runRefine(secs, instruction, scope, factHaystack(c, activeSourceResume))
      let nextPatch: Partial<CandEditState> = {}
      const snap = { ...currentSnapshot() }
      result.changes.forEach(ch => {
        snap[ch.key] = ch.after
        nextPatch = { ...nextPatch, ...applySectionLines(ch.key, ch.after, { ...curEdit, ...nextPatch }) }
      })
      let nextRevs = curEdit.revs
      let nextRevNum = curEdit.curRev
      if (result.changes.length > 0) {
        const scopeLabel = scope === 'all' ? 'Whole resume' : (secs.find(s => s.key === scope)?.label ?? scope)
        nextRevs = pushRevision(curEdit.revs, instruction, scopeLabel, app.currentUser.displayName, snap)
        nextRevNum = nextRevs.length
      }
      patchEdit(c.id, {
        ...nextPatch,
        revs: nextRevs,
        curRev: nextRevNum,
        refineResult: result,
        refineInstruction: instruction,
        refineUsage: curEdit.refineUsage + 1,
      })
    }, 260)
  }

  const keepSection = (secKey: string) => {
    if (!curEdit.refineResult) return
    const remChanges = curEdit.refineResult.changes.filter(ch => ch.key !== secKey)
    const remBlocked = curEdit.refineResult.blocked
    patchEdit(c.id, {
      refineResult: remChanges.length || remBlocked.length ? { changes: remChanges, blocked: remBlocked } : null,
    })
  }

  const undoSection = (secKey: string) => {
    const ch = curEdit.refineResult?.changes.find(x => x.key === secKey)
    if (!ch) return
    const revertedPatch = applySectionLines(secKey, ch.before, curEdit)
    const snap = { ...currentSnapshot(), [secKey]: ch.before }
    const remChanges = curEdit.refineResult!.changes.filter(x => x.key !== secKey)
    const remBlocked = curEdit.refineResult!.blocked
    patchEdit(c.id, {
      ...revertedPatch,
      revs: amendRevision(curEdit.revs, curEdit.curRev, snap),
      refineResult: remChanges.length || remBlocked.length ? { changes: remChanges, blocked: remBlocked } : null,
    })
  }

  const dismissBlock = (secKey: string) => {
    if (!curEdit.refineResult) return
    const remChanges = curEdit.refineResult.changes
    const remBlocked = curEdit.refineResult.blocked.filter(b => b.key !== secKey)
    patchEdit(c.id, {
      refineResult: remChanges.length || remBlocked.length ? { changes: remChanges, blocked: remBlocked } : null,
    })
  }

  const restoreRevision = (n: number) => {
    const targetRev = curEdit.revs.find(r => r.n === n)
    if (!targetRev) return
    let nextPatch: Partial<CandEditState> = {}
    Object.entries(targetRev.snapshot).forEach(([k, lines]) => {
      nextPatch = { ...nextPatch, ...applySectionLines(k, lines, { ...curEdit, ...nextPatch }) }
    })
    patchEdit(c.id, { ...nextPatch, curRev: n, refineResult: null })
    app.toast(`Restored v${n}`)
  }

  const handleFixInProfile = (label: string) => {
    const reason = `Profile opened to fix “${label.slice(0, 36)}”`
    writeStale(`editable:${c.id}`, reason)
    setStaleReason(reason)
    app.toast('Marked output stale · opening profile')
    navigate(`/candidates/${c.id}`)
  }

  const tailorPrompt = app.prompts.find(p => p.id === 'tailor')
  const promptVersionLabel = tailorPrompt ? `Editable v${tailorPrompt.activeVersion}` : 'Editable v3'

  const approve = () => {
    const asIs = m === 'as-is'
    app.addOutputs([{
      candidateId: c.id,
      type: asIs ? 'As-is' : 'Editable',
      roleId: r?.id ?? null,
      template: asIs ? 'Original' : 'Editable · Classic',
      stale: false,
      sourceResumeId: activeSourceResume?.id,
      sourceVersion: latestVersion(activeSourceResume),
      promptVersion: asIs ? 'Original' : promptVersionLabel,
      revisions: asIs ? undefined : storedRevisions(curEdit.revs, curEdit.curRev),
    }])
    patchEdit(c.id, { downloadedRev: curEdit.curRev })
    app.log({
      what: asIs ? `Approved ${c.name}'s resume to send as-is` : `Approved editable resume for ${c.name} · ${activeChanges.length} change${activeChanges.length === 1 ? '' : 's'}`,
      record: r ? `${r.title} — ${r.company}` : c.name, recordHref: r ? `/roles/${r.id}` : `/candidates/${c.id}`, kind: 'Outputs',
    })
    app.toast(asIs ? 'Resume downloaded' : 'Editable resume downloaded')
    setApproved(a => (a.includes(c.id) ? a : [...a, c.id]))
    if (idx < cands.length - 1) setIdx(idx + 1)
  }

  const hint = doc.strong && (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#15803d]"><CircleCheck className="size-3.5 text-success" />This resume already matches the role well. Sending as-is is fine.</span>
  )

  return (
    <div className="flex h-full flex-col">
      {/* Top row */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-4 pt-3 pb-1 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-lg title-type">{c.name}</h1>
          <ExampleMark />
        </div>
        <Segmented aria-label="Resume mode" value={m} onChange={v => setMode(s => ({ ...s, [c.id]: v }))}
          options={[{ value: 'editable', label: 'Editable' }, { value: 'as-is', label: 'Send as-is' }]} />
        <SourceResumeSelect list={sourceResumes} value={curEdit.sourceResumeId} onChange={switchSourceResume} fromMatch={fromMatch} compact />
        {hint}
        {cands.length > 1 && (
          <ol aria-label="Candidates" className="ml-auto flex items-center gap-1">
            {cands.map((x, i) => (
              <li key={x.id}>
                <button onClick={() => setIdx(i)} aria-current={i === idx ? 'step' : undefined}
                  className={cn('inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium', i === idx ? 'border-border bg-muted text-foreground' : 'border-transparent text-gray-1100 hover:bg-muted')}>
                  {approved.includes(x.id) ? <Check className="size-3.5 text-success" /> : <span className="font-mono text-[10px] tnum">{i + 1}</span>}
                  {x.name}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {staleReason && (
        <div className="px-4 pt-1 sm:px-6">
          <Banner variant="warning" actions={<Button size="sm" onClick={() => { writeStale(`editable:${c.id}`, null); setStaleReason(null); app.toast('Editable resume refreshed') }}>Regenerate</Button>}>
            Stale · {staleReason}. Regenerate to pull the latest profile facts.
          </Banner>
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-2">
        {m === 'editable' ? (
          <div className="flex h-full flex-col overflow-y-auto rounded-md border border-border lg:grid lg:grid-cols-2 lg:divide-x lg:divide-border lg:overflow-hidden">
            <section className="flex min-h-[560px] flex-col lg:min-h-0">
              <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-muted/50 px-4 text-xs font-medium text-muted-foreground">
                <FileText className="size-3.5" />Original <span className="font-mono text-[10px] text-gray-1000">· {resumeLabel(activeSourceResume)}</span>
              </div>
              <div className="min-h-0 flex-1">
                <DocFrame>
                  <ResumeDoc doc={doc} view="original" reverted={rev} />
                </DocFrame>
              </div>
            </section>
            <section className="flex min-h-[560px] flex-col border-t border-border lg:min-h-0 lg:border-t-0">
              <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-muted/50 px-4 text-xs">
                <span className="font-medium text-muted-foreground">Editable</span>
                <span className="truncate text-foreground" aria-live="polite">
                  {doc.changes.length === 0 ? 'No changes suggested. Nothing on record would make it stronger.' : activeChanges.length === 0 ? 'All changes reverted. This matches the original.' : summarize(activeChanges)}
                </span>
                {rev.length > 0 && <Button variant="ghost" size="sm" className="ml-auto" icon={<Undo2 />} onClick={() => setReverted(s => ({ ...s, [c.id]: [] }))}>Restore all</Button>}
              </div>
              {curEdit.refineResult && (
                <div className="border-b border-border px-4 py-2">
                  <RefineStatus
                    result={curEdit.refineResult}
                    instruction={curEdit.refineInstruction}
                    onDismiss={() => patchEdit(c.id, { refineResult: null })}
                  />
                </div>
              )}
              <div className="min-h-0 flex-1">
                <DocFrame
                  toolbar={
                    <div className="flex flex-1 items-center justify-between pr-2">
                      <span className="text-xs text-muted-foreground">Click any line to edit · every AI change cites RESUME or CALL</span>
                      <RevisionsPopover
                        revisions={curEdit.revs}
                        current={curEdit.curRev}
                        downloaded={curEdit.downloadedRev}
                        onRestore={restoreRevision}
                      />
                    </div>
                  }
                >
                  <ResumeDoc
                    doc={doc}
                    view="editable"
                    reverted={rev}
                    onToggle={toggle}
                    take={take}
                    takeAuthor={takeAuthor}
                    summaryOverride={curEdit.summaryOverride}
                    bulletOverrides={curEdit.bulletOverrides}
                    jobOrderOverrides={curEdit.jobOrderOverrides}
                    skillsOverride={curEdit.skillsOverride}
                    refineResult={curEdit.refineResult}
                    onEditSummary={v => {
                      const snap = { ...currentSnapshot(), summary: [v] }
                      patchEdit(c.id, { summaryOverride: v, revs: amendRevision(curEdit.revs, curEdit.curRev, snap) })
                    }}
                    onEditBullet={(bulletId, v) => {
                      const nextOverrides = { ...curEdit.bulletOverrides, [bulletId]: v }
                      patchEdit(c.id, { bulletOverrides: nextOverrides })
                    }}
                    onKeepSection={keepSection}
                    onUndoSection={undoSection}
                    onDismissBlock={dismissBlock}
                    onFixInProfile={handleFixInProfile}
                  />
                </DocFrame>
              </div>
              <RefineBox
                sections={sectionsForRefine().map(s => ({ key: s.key, label: s.label }))}
                busy={refining}
                usage={curEdit.refineUsage}
                onRefine={handleRefine}
                disabled={!app.can('genIdentity') ? 'Recruiters and Admins can refine editable resumes.' : undefined}
              />
            </section>
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden rounded-md border border-border">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2"><FileText className="size-3.5" />Original resume · sent as-is · {resumeLabel(activeSourceResume)}</span>
              <InfoNote>As-is keeps the original file untouched. The signed take goes into the copied email instead.</InfoNote>
            </div>
            <div className="min-h-0 flex-1"><DocFrame><ResumeDoc doc={doc} view="original" reverted={doc.changes.map(x => x.id)} /></DocFrame></div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        {cands.length > 1 && (
          <>
            <span className="eyebrow text-gray-1000">Candidate <span className="tnum">{idx + 1}</span> of <span className="tnum">{cands.length}</span></span>
            <Button variant="ghost" size="icon-sm" aria-label="Previous candidate" disabled={idx === 0} onClick={() => setIdx(idx - 1)} icon={<ChevronLeft />} />
            {idx < cands.length - 1
              ? <Button variant="ghost" iconRight={<ChevronRight />} onClick={() => setIdx(idx + 1)}>Next candidate</Button>
              : <Button variant="ghost" onClick={() => navigate(r ? `/roles/${r.id}?tab=shortlist` : '/resumes')}>Back to shortlist</Button>}
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <GatedButton perm="genIdentity" icon={<Download />} onClick={() => app.toast('DOCX downloaded')}>Download DOCX</GatedButton>
          <GatedButton perm="genIdentity" variant="primary" icon={<Download />} onClick={approve}>Approve and download PDF</GatedButton>
        </div>
      </div>
    </div>
  )
}

/* ---------- Resume page (identity kept; original formatting conventions) ---------- */
function ResumeDoc({
  doc, view, reverted, onToggle, take, takeAuthor,
  summaryOverride, bulletOverrides = {}, jobOrderOverrides = {}, skillsOverride,
  refineResult, onEditSummary, onEditBullet, onKeepSection, onUndoSection, onDismissBlock, onFixInProfile,
}: {
  doc: Doc; view: 'original' | 'editable'; reverted: string[]; onToggle?: (id: string) => void
  take?: ReturnType<ReturnType<typeof useApp>['takeFor']>; takeAuthor?: ReturnType<ReturnType<typeof useApp>['member']>
  summaryOverride?: string
  bulletOverrides?: Record<string, string>
  jobOrderOverrides?: Record<string, string[]>
  skillsOverride?: string[]
  refineResult?: RefineResult | null
  onEditSummary?: (v: string) => void
  onEditBullet?: (bulletId: string, v: string) => void
  onKeepSection?: (key: string) => void
  onUndoSection?: (key: string) => void
  onDismissBlock?: (key: string) => void
  onFixInProfile?: (label: string) => void
}) {
  const editable = view === 'editable'
  const on = (ch?: Change) => !!ch && editable && !reverted.includes(ch.id)
  const changed = (ch?: Change) => !!ch && !reverted.includes(ch.id)
  const summaryCh = doc.changes.find(x => x.kind === 'summary')
  const skillChs = doc.changes.filter(x => x.kind === 'skill')

  const orderFor = (job: Job) => {
    const list = [...job.bullets]
    if (!editable) return list
    doc.changes.filter(x => x.kind === 'reorder' && on(x)).forEach(x => {
      const i = list.findIndex(b => b.id === x.bulletId)
      if (i < 0 || x.toIndex === undefined) return
      const [b] = list.splice(i, 1)
      list.splice(x.toIndex, 0, b)
    })
    const customOrder = jobOrderOverrides[job.company]
    if (customOrder?.length) {
      return [...list].sort((a, b) => {
        const textA = bulletOverrides[a.id] ?? a.text
        const textB = bulletOverrides[b.id] ?? b.text
        const ia = customOrder.indexOf(textA)
        const ib = customOrder.indexOf(textB)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
    }
    return list
  }

  const summaryText = editable
    ? (summaryOverride ?? (on(summaryCh) && doc.editableSummary ? doc.editableSummary : doc.summary))
    : doc.summary
  const skillsList = editable ? (skillsOverride ?? doc.skills) : doc.skills

  const changeFor = (key: string) => editable ? refineResult?.changes.find(c => c.key === key) : undefined
  const blockFor = (key: string) => editable ? refineResult?.blocked.find(b => b.key === key) : undefined

  return (
    <article className="space-y-4 px-8 py-7 text-[#111]" aria-label={`${editable ? 'Editable' : 'Original'} resume`}>
      <header className="border-b border-gray-500 pb-3">
        <h1 className="text-[16px] font-semibold tracking-tight">{doc.name}</h1>
        <p className="text-[10px] text-gray-1100">{doc.headline}</p>
        <p className="mt-0.5 font-mono text-[8px] text-gray-1000">{doc.contact}</p>
      </header>

      {editable && <PageTake take={take} author={takeAuthor} variant="note" />}

      <DiffSection
        label="Summary"
        change={changeFor('summary')}
        block={blockFor('summary')}
        onKeep={onKeepSection ? () => onKeepSection('summary') : undefined}
        onUndo={onUndoSection ? () => onUndoSection('summary') : undefined}
        onDismissBlock={onDismissBlock ? () => onDismissBlock('summary') : undefined}
      >
        <section>
          <h3 className="mb-1 font-mono text-[8px] font-medium tracking-[0.14em] text-gray-1000 uppercase">Summary</h3>
          <Block ch={summaryCh} active={on(summaryCh)} wasChanged={!editable && changed(summaryCh)} reverted={editable && !!summaryCh && reverted.includes(summaryCh.id)} onToggle={onToggle}>
            <p className="group/fact text-[9.5px] leading-snug">
              {editable && onEditSummary ? (
                <EditableText value={summaryText} onChange={onEditSummary} label="Summary" />
              ) : summaryText}
              {editable && onFixInProfile && <FixInProfile label="Summary" onClick={() => onFixInProfile('Summary')} />}
            </p>
          </Block>
        </section>
      </DiffSection>

      <section>
        <h3 className="mb-1 font-mono text-[8px] font-medium tracking-[0.14em] text-gray-1000 uppercase">Experience</h3>
        <div className="space-y-2.5">
          {doc.jobs.map(job => {
            const jobKey = `job:${job.company}`
            return (
              <DiffSection
                key={job.company}
                label={`Experience · ${job.company}`}
                change={changeFor(jobKey)}
                block={blockFor(jobKey)}
                onKeep={onKeepSection ? () => onKeepSection(jobKey) : undefined}
                onUndo={onUndoSection ? () => onUndoSection(jobKey) : undefined}
                onDismissBlock={onDismissBlock ? () => onDismissBlock(jobKey) : undefined}
              >
                <div>
                  <div className="group/fact flex items-baseline justify-between gap-2 text-[9.5px]">
                    <span>
                      <span className="font-semibold">{job.title}</span> · {job.company}
                      {editable && onFixInProfile && <FixInProfile label={job.company} onClick={() => onFixInProfile(job.company)} />}
                    </span>
                    <span className="font-mono text-[8px] text-gray-1000 tnum">{job.dates}</span>
                  </div>
                  <ul className="mt-1 space-y-1">
                    {orderFor(job).map(b => {
                      const reword = doc.changes.find(x => x.kind === 'reword' && x.bulletId === b.id)
                      const reorder = doc.changes.find(x => x.kind === 'reorder' && x.bulletId === b.id)
                      const chs = [reword, reorder].filter((x): x is Change => !!x)
                      const shownText = editable
                        ? (bulletOverrides[b.id] ?? (on(reword) && reword?.text ? reword.text : b.text))
                        : b.text
                      const renderBullet = (
                        <p className="group/fact flex gap-1.5 text-[9px] leading-snug">
                          <span className="text-gray-800">•</span>
                          <span className="flex-1">
                            {editable && onEditBullet ? (
                              <EditableText value={shownText} onChange={v => onEditBullet(b.id, v)} label={`bullet ${b.id}`} />
                            ) : shownText}
                            {editable && onFixInProfile && <FixInProfile label={shownText} onClick={() => onFixInProfile(shownText)} />}
                          </span>
                        </p>
                      )
                      return (
                        <li key={b.id}>
                          {chs.length ? chs.map((ch, i) => (
                            <Block key={ch.id} ch={ch} active={on(ch)} wasChanged={!editable && changed(ch)} reverted={editable && reverted.includes(ch.id)} onToggle={onToggle} compact={i > 0}>
                              {i === 0 && renderBullet}
                            </Block>
                          )) : <div className="px-1.5">{renderBullet}</div>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </DiffSection>
            )
          })}
        </div>
      </section>

      <DiffSection
        label="Skills"
        change={changeFor('skills')}
        block={blockFor('skills')}
        onKeep={onKeepSection ? () => onKeepSection('skills') : undefined}
        onUndo={onUndoSection ? () => onUndoSection('skills') : undefined}
        onDismissBlock={onDismissBlock ? () => onDismissBlock('skills') : undefined}
      >
        <section className="group/fact">
          <h3 className="mb-1 font-mono text-[8px] font-medium tracking-[0.14em] text-gray-1000 uppercase">Skills</h3>
          <p className="text-[9px]">
            {skillsList.join(' · ')}
            {editable && onFixInProfile && <FixInProfile label="Skills" onClick={() => onFixInProfile('Skills')} />}
          </p>
          {editable && skillChs.map(ch => (
            <Block key={ch.id} ch={ch} active={on(ch)} reverted={reverted.includes(ch.id)} onToggle={onToggle}>
              {on(ch) && <p className="text-[9px]">+ {ch.skill}</p>}
            </Block>
          ))}
        </section>
      </DiffSection>

      {doc.education && (
        <section className="group/fact">
          <h3 className="mb-1 font-mono text-[8px] font-medium tracking-[0.14em] text-gray-1000 uppercase">Education</h3>
          <p className="text-[9px]">
            {doc.education}
            {editable && onFixInProfile && <FixInProfile label="Education" onClick={() => onFixInProfile('Education')} />}
          </p>
        </section>
      )}
    </article>
  )
}

/** A changed block: highlight + source badge + Revert (editable), faint marker (original) */
function Block({ ch, active, wasChanged, reverted, onToggle, children, compact }: {
  ch?: Change; active: boolean; wasChanged?: boolean; reverted?: boolean; onToggle?: (id: string) => void; children: React.ReactNode; compact?: boolean
}) {
  if (!ch) return <div className="px-1.5">{children}</div>
  if (active) {
    return (
      <div className={cn('rounded-md border border-info/30 bg-info/[0.06] px-1.5 py-1', compact && 'mt-1')}>
        {children}
        <div className="mt-1 flex items-center gap-1.5 font-sans">
          <SourceBadge kind={ch.source} />
          <span className="text-[8.5px] text-gray-1100">{ch.label}</span>
          {onToggle && (
            <button onClick={() => onToggle(ch.id)} className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium text-gray-1100 hover:bg-muted hover:text-foreground" aria-label={`Revert: ${ch.label}`}>
              <RotateCcw className="size-2.5" />Revert
            </button>
          )}
        </div>
      </div>
    )
  }
  if (reverted && onToggle) {
    return (
      <div className={cn('rounded-md border border-dashed border-gray-500 px-1.5 py-1', compact && 'mt-1')}>
        {children}
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[8.5px] text-gray-1000">Reverted · {ch.label}</span>
          <button onClick={() => onToggle(ch.id)} className="ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-medium text-gray-1100 hover:bg-muted">Restore</button>
        </div>
      </div>
    )
  }
  return <div className={cn('px-1.5', wasChanged && 'border-l-2 border-gray-500')}>{children}</div>
}
