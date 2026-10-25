import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, CircleCheck, Copy, Download, EyeOff, LayoutTemplate, Link2, Lock, MessageSquareQuote, RefreshCw, Sparkles, Target,
} from 'lucide-react'
import { ScrollPage, SplitPane, useTopBar } from '../shell/AppShell'
import { BezelCard, Button, Checkbox, EmptyState, ExampleMark, Field, Input, Segmented, Select, Skeleton, Switch, Textarea, cn } from '../components/ui'
import { Banner, DocFrame, InfoNote } from '../components/hs'
import { DeliverySelect, SignedTakeBlock, StyleSelect } from '../components/v3'
import {
  DiffSection, EditableText, FixInProfile, PageTake, RefineBox, RefineStatus, RevisionsPopover, SourceResumeSelect,
  amendRevision, emphasise, factHaystack, firstName, initialRevisions, latestVersion, pushRevision, readStale,
  resumeLabel, runRefine, skillsFor, storedRevisions, useSourceResume, writeStale,
  type LocalRevision, type OutputSection, type RefineResult, type SectionContent,
} from '../components/outputs'
import { useApp, useWireframeState } from '../store/AppStore'
import { CopyEmailDialog } from './Dialogs'
import type { Candidate, OutputDelivery, OutputStyle, Resume, Role } from '../data/types'

/* ==========================================================================
   S-09 · Masked resume builder (single and bulk) — Product Design Doc §8, §9 + PRD v0.3 §7.3, §7.6, §7.8
   Opens already rendered with defaults (P5). Assumed facts are never printed;
   predicted skills are never printed as skills.
   ========================================================================== */

type TemplateId = 'A' | 'B' | 'C'
const TEMPLATE_LABEL: Record<TemplateId, string> = { A: 'A · Compact', B: 'B · Achievement-led', C: 'C · Role-fit' }

/** Identity-check findings (mocked output of the check) */
interface Flag { id: string; term: string; label: string; replacement: string; company?: string }
const FLAGS: Record<string, Flag[]> = {
  priya: [
    { id: 'stripe', term: 'Stripe', label: "'Stripe' in experience", replacement: 'the company', company: 'Stripe' },
    { id: 'atlas', term: 'Atlas', label: "project 'Atlas' in achievement 2", replacement: 'a company-wide' },
  ],
}
/** One-line experience notes taken from the resume */
const EXP_NOTES: Record<string, Record<string, string>> = {
  priya: { Stripe: 'Owned the invoicing roadmap at Stripe for SMB and enterprise billing' },
}
const ALIAS_DOMAIN: Record<string, string> = {
  priya: 'B2B SaaS & fintech', ana: 'React, Node & Postgres', marcus: 'paid social & lifecycle', sara: 'consumer & marketplace',
}
const HAND_BULLETS: Record<string, string[]> = {
  'priya|northwind-spm': [
    'Owns merchant payouts end to end at a Series B fintech, the surface this role covers.',
    '7 years of payments and billing product work, including a usage-based billing API.',
    'Commercially sharp: led a pricing revamp that lifted ARPA 14% in two quarters.',
  ],
  'ana|lumen-fse': [
    'Five years shipping React + Node in production, the same stack this team runs.',
    'Rebuilt a checkout in React and GraphQL and cut p95 latency by 54%.',
    'Remote today and ready to start immediately.',
  ],
  'marcus|brightdesk-gmm': [
    'Six years running paid acquisition for B2B SaaS, scaling paid social to $310k/month.',
    'Cut blended CAC 31% by moving budget to high-intent search.',
    'Based in NYC and works onsite, as this role needs.',
  ],
}

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s)

function draftBullets(c: Candidate, r: Role | undefined, variant: number, resume?: Resume): string[] {
  const hand = r ? HAND_BULLETS[`${c.id}|${r.id}`] : undefined
  if (hand && variant % 2 === 0 && (!resume || resume.isPrimary)) return emphasise(hand, resume)
  const yrs = c.years != null ? `${c.years} years` : 'Several years'
  const sub = (resume && !resume.isPrimary ? resume.headline.split(' · ')[0] : c.subcategory).toLowerCase()
  const orderedSkills = skillsFor(c, resume)
  const top = orderedSkills.slice(0, 2).join(' and ')
  const evidenced = r ? r.mustSkills.filter(s => c.skills.includes(s)) : []
  const orderedAch = emphasise(c.achievements, resume)
  const a = orderedAch[variant % 2 === 0 ? 0 : 1] ?? orderedAch[0]
  const out = [
    r
      ? `${yrs} of ${sub} work${evidenced.length ? `, with ${evidenced.join(' and ')} on record` : ''}, a close match for ${r.title}.`
      : `${yrs} as a ${sub}${top ? `, strongest in ${top}` : ''}.`,
    a ? `Proven impact: ${lowerFirst(a)}.` : '',
    c.availability && c.metro ? `Available in ${c.availability.replace(' notice', '')} · ${c.metro}${c.workModes ? `, ${c.workModes[0].toLowerCase()}` : ''}.` : '',
  ].filter(Boolean)
  const base = variant % 2 === 0 ? out : [...out].reverse()
  return emphasise(base, resume)
}

function aliasOf(c: Candidate, resume?: Resume) {
  const h = resume?.headline ?? c.headline
  const parts = h.split(' · ')
  const domain = resume && !resume.isPrimary ? parts[1] : (ALIAS_DOMAIN[c.id] ?? parts[1])
  return [parts[0], c.years != null ? `${c.years} yrs` : null, domain].filter(Boolean).join(' · ')
}
function workAuthPill(c: Candidate): string | null {
  const w = c.workAuth
  if (!w.status) return null // assumed → never printed
  if (w.status !== 'Visa') return w.status
  return [w.visaType ?? 'Visa', w.needsTransfer ? 'transfer needed' : null, w.needsSponsorship ? 'needs sponsorship' : null].filter(Boolean).join(' · ')
}
function notShown(c: Candidate): string[] {
  const out: string[] = []
  if (c.relocate === null || c.fieldSources.relocate === 'ASSUMED') out.push('relocation (assumed)')
  if (!c.workAuth.status) out.push('work authorization (assumed)')
  if (!c.workModes) out.push('work mode (assumed)')
  if (!c.metro) out.push('location (assumed)')
  if (!c.availability || c.fieldSources.availability === 'ASSUMED') out.push('availability (assumed)')
  c.predicted.forEach(p => out.push(`${p.name} (predicted)`))
  return out
}
function bigNumber(a: string): string | null {
  const m = a.match(/\$?\d[\d,.]*(?:k|%|x)?/g)
  if (!m) return null
  return [...m].reverse().find(x => x.includes('%')) ?? m.find(x => x.includes('$')) ?? m[0]
}

interface Per {
  show: Record<string, boolean>
  bullets: string[]
  impact: string[]
  skills: string[]
  expNotes: Record<string, string>
  draft: number
  res: Record<string, 'describe' | 'keep'>
  sourceResumeId: string
  revs: LocalRevision[]
  curRev: number
  downloadedRev: number | null
  refineResult: RefineResult | null
  refineInstruction: string
  refineUsage: number
}

function defaultImpact(c: Candidate, resume?: Resume): string[] {
  return emphasise(c.achievements.filter(a => /\d/.test(a)).slice(0, 4), resume)
}
function makeSnapshot(bullets: string[], impact: string[], skills: string[]): SectionContent {
  return { why: [...bullets], impact: [...impact], skills: [...skills] }
}

/* ---------- Screen ---------- */
const STATES = [
  { id: 'live', label: 'Live (from link)' },
  { id: 'traditional', label: 'Style · Traditional (Word)' },
  { id: 'refine-diff', label: 'Refine · section diff' },
  { id: 'refine-blocked', label: 'Refine · fact blocked' },
  { id: 'revisions', label: 'Revisions popover' },
  { id: 'source-growth', label: 'Source · Growth resume' },
  { id: 'take-draft', label: 'Take · unsigned draft' },
  { id: 'clean', label: 'Single · clean' },
  { id: 'identifiers', label: 'Identifiers found' },
  { id: 'bulk', label: 'Bulk tabs' },
  { id: 'no-role', label: 'No role' },
  { id: 'thin', label: 'Thin profile' },
  { id: 'rendering', label: 'Rendering' },
  { id: 'failed', label: 'Failed' },
]

export function MaskedBuilder() {
  const app = useApp()
  const [params] = useSearchParams()
  const [wf, setWf] = useWireframeState('S-09', 'Masked resume', STATES)
  useTopBar([{ label: 'Resumes', to: '/resumes' }, { label: 'Masked resume' }])

  const urlIds = (params.get('candidates') ?? '').split(',').map(s => s.trim()).filter(id => app.candidate(id))
  const urlRole = params.get('role')
  // Rendering / Failed keep the live settings (so "Your settings are kept" is true)
  const scenario = wf === 'rendering' || wf === 'failed' ? 'live' : wf
  let ids: string[]
  let role: string
  switch (scenario) {
    case 'clean': ids = ['marcus']; role = 'brightdesk-gmm'; break
    case 'traditional':
    case 'identifiers':
    case 'refine-diff':
    case 'refine-blocked':
    case 'revisions':
    case 'source-growth':
      ids = ['priya']; role = 'northwind-spm'; break
    case 'take-draft':
      ids = ['ana']; role = 'lumen-fse'; break
    case 'bulk': ids = urlIds.length > 1 ? urlIds : ['priya', 'ana', 'marcus']; role = urlIds.length > 1 && urlRole ? urlRole : 'none'; break
    case 'no-role': ids = ['marcus']; role = 'none'; break
    case 'thin': ids = ['ana']; role = 'lumen-fse'; break
    default:
      if (urlIds.length) { ids = urlIds; role = urlRole ?? app.candidate(urlIds[0])?.cameInForRole ?? 'none' }
      else { ids = ['priya']; role = urlRole ?? 'northwind-spm' }
  }
  if (role !== 'none' && role !== 'url' && !app.role(role)) role = 'none'
  const key = `${scenario}|${ids.join(',')}|${role}`

  if (!ids.length) {
    return <ScrollPage><EmptyState icon={<EyeOff />} title="No candidate selected" body="Open a candidate and choose Masked resume." /></ScrollPage>
  }
  return <Builder key={key} ids={ids} initialRole={role} wf={wf} setWf={setWf} />
}

function Builder({ ids, initialRole, wf, setWf }: { ids: string[]; initialRole: string; wf: string; setWf: (v: string) => void }) {
  const app = useApp()
  const navigate = useNavigate()
  const cands = ids.map(id => app.candidate(id)).filter((c): c is Candidate => !!c)
  const bulk = cands.length > 1
  const [target, setTarget] = useState(initialRole)
  const [draftedFor, setDraftedFor] = useState(initialRole)
  const [postingUrl, setPostingUrl] = useState('')
  const [template, setTemplate] = useState<TemplateId>('A')
  const [style, setStyle] = useState<OutputStyle>(() => wf === 'traditional' ? 'traditional' : app.defaultStyle.prospect)
  const [aliasOn, setAliasOn] = useState(true)
  const [showSchools, setShowSchools] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [active, setActive] = useState(cands[0].id)
  const [reviewing, setReviewing] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(0)
  const [focusFlag, setFocusFlag] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [refining, setRefining] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [linkActive, setLinkActive] = useState(true)
  const idRef = useRef<HTMLDivElement>(null)

  const r = target !== 'none' && target !== 'url' ? app.role(target) : undefined
  const [delivery, setDelivery] = useState<OutputDelivery>(() =>
    r?.companyType === 'Prospect' ? 'link' : app.defaultDelivery.prospect,
  )

  const buildInitialPer = (c: Candidate): Per => {
    const list = app.resumesFor(c.id)
    const match = r ? app.matches.find(m => m.candidateId === c.id && m.roleId === r.id) : undefined
    const defaultRes = (wf === 'source-growth' && c.id === 'priya' ? list.find(x => x.id === 'res-priya-growth') : undefined)
      ?? list.find(x => x.id === match?.scoredOnResumeId)
      ?? list.find(x => x.isPrimary)
      ?? list[0]
    const bullets = draftBullets(c, r, 0, defaultRes)
    const impact = defaultImpact(c, defaultRes)
    const skills = skillsFor(c, defaultRes)
    const snap1 = makeSnapshot(bullets, impact, skills)
    let revs = initialRevisions(snap1, app.currentUser.displayName)
    let curRev = 1
    let refineResult: RefineResult | null = null
    let refineInstruction = ''
    let refineUsage = 0
    let curBullets = bullets
    let curImpact = impact
    let curSkills = skills

    if ((wf === 'refine-diff' || wf === 'revisions') && c.id === cands[0].id) {
      const secs: OutputSection[] = [
        { key: 'why', label: 'Why we recommend', lines: bullets, kind: 'list' },
        { key: 'impact', label: 'Impact highlights', lines: impact, kind: 'list' },
        { key: 'skills', label: 'Skills', lines: skills, kind: 'list' },
      ]
      const instr = 'Shorter, lead with payments'
      const res = runRefine(secs, instr, 'all', factHaystack(c, defaultRes))
      const byWhy = res.changes.find(ch => ch.key === 'why')?.after ?? bullets
      const byImpact = res.changes.find(ch => ch.key === 'impact')?.after ?? impact
      const bySkills = res.changes.find(ch => ch.key === 'skills')?.after ?? skills
      const snap2 = makeSnapshot(byWhy, byImpact, bySkills)
      revs = pushRevision(revs, instr, 'Whole resume', app.currentUser.displayName, snap2)
      curRev = 2
      curBullets = byWhy
      curImpact = byImpact
      curSkills = bySkills
      refineUsage = 1
      if (wf === 'refine-diff') {
        refineResult = res
        refineInstruction = instr
      }
    } else if (wf === 'refine-blocked' && c.id === cands[0].id) {
      const secs: OutputSection[] = [
        { key: 'why', label: 'Why we recommend', lines: bullets, kind: 'list' },
        { key: 'impact', label: 'Impact highlights', lines: impact, kind: 'list' },
        { key: 'skills', label: 'Skills', lines: skills, kind: 'list' },
      ]
      const instr = 'Mention Google and add Kubernetes'
      refineResult = runRefine(secs, instr, 'all', factHaystack(c, defaultRes))
      refineInstruction = instr
      refineUsage = 1
    }

    return {
      show: {},
      bullets: curBullets,
      impact: curImpact,
      skills: curSkills,
      expNotes: { ...(EXP_NOTES[c.id] ?? {}) },
      draft: 0,
      res: {},
      sourceResumeId: defaultRes?.id ?? `res-${c.id}`,
      revs,
      curRev,
      downloadedRev: null,
      refineResult,
      refineInstruction,
      refineUsage,
    }
  }

  const [per, setPer] = useState<Record<string, Per>>(() => Object.fromEntries(cands.map(c => [c.id, buildInitialPer(c)])))
  const patch = (id: string, p: Partial<Per>) => setPer(s => ({ ...s, [id]: { ...s[id], ...p } }))

  // C is only available with a target role
  useEffect(() => { if (!r && template === 'C') setTemplate('A') }, [r, template])
  // Short re-render when layout inputs change
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setBusy(true)
    const t = window.setTimeout(() => setBusy(false), 350)
    return () => window.clearTimeout(t)
  }, [template, target, active])

  const unresolved = (c: Candidate) => (FLAGS[c.id] ?? []).filter(f => !per[c.id]?.res[f.id] && !(f.company && per[c.id]?.show[f.company]))
  const cur = cands.find(c => c.id === active) ?? cands[0]
  const curPer = per[cur.id]
  const curFlags = unresolved(cur)
  const totalFlags = cands.reduce((n, c) => n + unresolved(c).length, 0)
  const rendering = wf === 'rendering' || busy
  const failed = wf === 'failed'

  const { list: sourceResumes, fromMatch } = useSourceResume(cur.id, r?.id)
  const activeSourceResume = sourceResumes.find(x => x.id === curPer.sourceResumeId) ?? sourceResumes[0]
  const [staleReason, setStaleReason] = useState<string | null>(() => readStale(`masked:${cur.id}`))
  useEffect(() => { setStaleReason(readStale(`masked:${cur.id}`)) }, [cur.id])

  const switchSourceResume = (resumeId: string) => {
    const nextRes = sourceResumes.find(x => x.id === resumeId)
    const nextBullets = draftBullets(cur, r, curPer.draft, nextRes)
    const nextImpact = defaultImpact(cur, nextRes)
    const nextSkills = skillsFor(cur, nextRes)
    const snap = makeSnapshot(nextBullets, nextImpact, nextSkills)
    const nextRevs = pushRevision(curPer.revs, `Switched to ${resumeLabel(nextRes)}`, 'Whole resume', app.currentUser.displayName, snap)
    patch(cur.id, {
      sourceResumeId: resumeId,
      bullets: nextBullets,
      impact: nextImpact,
      skills: nextSkills,
      revs: nextRevs,
      curRev: nextRevs.length,
      refineResult: null,
    })
    app.toast(`Using ${resumeLabel(nextRes)}`)
  }

  const sectionsFor = (c: Candidate, p: Per): OutputSection[] => [
    { key: 'why', label: 'Why we recommend', lines: p.bullets, kind: 'list' },
    { key: 'impact', label: 'Impact highlights', lines: p.impact, kind: 'list' },
    { key: 'skills', label: 'Skills', lines: p.skills, kind: 'list' },
  ]

  const handleRefine = (instruction: string, scope: string) => {
    setRefining(true)
    window.setTimeout(() => {
      setRefining(false)
      const secs = sectionsFor(cur, curPer)
      const result = runRefine(secs, instruction, scope, factHaystack(cur, activeSourceResume))
      const nextBullets = result.changes.find(ch => ch.key === 'why')?.after ?? curPer.bullets
      const nextImpact = result.changes.find(ch => ch.key === 'impact')?.after ?? curPer.impact
      const nextSkills = result.changes.find(ch => ch.key === 'skills')?.after ?? curPer.skills
      let nextRevs = curPer.revs
      let nextRevNum = curPer.curRev
      if (result.changes.length > 0) {
        const scopeLabel = scope === 'all' ? 'Whole resume' : (secs.find(s => s.key === scope)?.label ?? scope)
        const snap = makeSnapshot(nextBullets, nextImpact, nextSkills)
        nextRevs = pushRevision(curPer.revs, instruction, scopeLabel, app.currentUser.displayName, snap)
        nextRevNum = nextRevs.length
      }
      patch(cur.id, {
        bullets: nextBullets,
        impact: nextImpact,
        skills: nextSkills,
        revs: nextRevs,
        curRev: nextRevNum,
        refineResult: result,
        refineInstruction: instruction,
        refineUsage: curPer.refineUsage + 1,
      })
    }, 280)
  }

  const keepSection = (secKey: string) => {
    if (!curPer.refineResult) return
    const remChanges = curPer.refineResult.changes.filter(ch => ch.key !== secKey)
    const remBlocked = curPer.refineResult.blocked
    patch(cur.id, {
      refineResult: remChanges.length || remBlocked.length ? { changes: remChanges, blocked: remBlocked } : null,
    })
  }

  const undoSection = (secKey: string) => {
    const ch = curPer.refineResult?.changes.find(x => x.key === secKey)
    if (!ch) return
    const nextBullets = secKey === 'why' ? ch.before : curPer.bullets
    const nextImpact = secKey === 'impact' ? ch.before : curPer.impact
    const nextSkills = secKey === 'skills' ? ch.before : curPer.skills
    const snap = makeSnapshot(nextBullets, nextImpact, nextSkills)
    const remChanges = curPer.refineResult!.changes.filter(x => x.key !== secKey)
    const remBlocked = curPer.refineResult!.blocked
    patch(cur.id, {
      bullets: nextBullets,
      impact: nextImpact,
      skills: nextSkills,
      revs: amendRevision(curPer.revs, curPer.curRev, snap),
      refineResult: remChanges.length || remBlocked.length ? { changes: remChanges, blocked: remBlocked } : null,
    })
  }

  const dismissBlock = (secKey: string) => {
    if (!curPer.refineResult) return
    const remChanges = curPer.refineResult.changes
    const remBlocked = curPer.refineResult.blocked.filter(b => b.key !== secKey)
    patch(cur.id, {
      refineResult: remChanges.length || remBlocked.length ? { changes: remChanges, blocked: remBlocked } : null,
    })
  }

  const regenerateSection = (secKey: 'why' | 'impact' | 'skills') => {
    const nextDraft = curPer.draft + 1
    const nextBullets = secKey === 'why' ? draftBullets(cur, r, nextDraft, activeSourceResume) : curPer.bullets
    const nextImpact = secKey === 'impact' ? [...curPer.impact].reverse() : curPer.impact
    const nextSkills = secKey === 'skills' ? skillsFor(cur, activeSourceResume) : curPer.skills
    const snap = makeSnapshot(nextBullets, nextImpact, nextSkills)
    const label = secKey === 'why' ? 'Why we recommend' : secKey === 'impact' ? 'Impact highlights' : 'Skills'
    const nextRevs = pushRevision(curPer.revs, `Regenerated ${label}`, label, app.currentUser.displayName, snap)
    patch(cur.id, {
      draft: nextDraft,
      bullets: nextBullets,
      impact: nextImpact,
      skills: nextSkills,
      revs: nextRevs,
      curRev: nextRevs.length,
    })
    app.toast(`${label} regenerated`)
  }

  const regenerateAll = () => {
    const nextDraft = curPer.draft + 1
    const nextBullets = draftBullets(cur, r, nextDraft, activeSourceResume)
    const nextImpact = defaultImpact(cur, activeSourceResume)
    const nextSkills = skillsFor(cur, activeSourceResume)
    const snap = makeSnapshot(nextBullets, nextImpact, nextSkills)
    const nextRevs = pushRevision(curPer.revs, 'Regenerated whole resume', 'Whole resume', app.currentUser.displayName, snap)
    writeStale(`masked:${cur.id}`, null)
    setStaleReason(null)
    patch(cur.id, {
      draft: nextDraft,
      bullets: nextBullets,
      impact: nextImpact,
      skills: nextSkills,
      revs: nextRevs,
      curRev: nextRevs.length,
      refineResult: null,
    })
    setDraftedFor(target)
    app.toast('Masked resume regenerated')
  }

  const restoreRevision = (candId: string, n: number) => {
    const p = per[candId]
    const targetRev = p.revs.find(x => x.n === n)
    if (!targetRev) return
    patch(candId, {
      bullets: targetRev.snapshot.why ?? p.bullets,
      impact: targetRev.snapshot.impact ?? p.impact,
      skills: targetRev.snapshot.skills ?? p.skills,
      curRev: n,
      refineResult: null,
    })
    app.toast(`Restored v${n}`)
  }

  const handleFixInProfile = (label: string) => {
    const reason = `Profile opened to fix “${label.slice(0, 36)}”`
    writeStale(`masked:${cur.id}`, reason)
    setStaleReason(reason)
    app.toast('Marked output stale · opening profile')
    navigate(`/candidates/${cur.id}`)
  }

  const reviewNext = () => {
    let c = cur
    let flags = curFlags
    if (!flags.length) {
      const next = cands.find(x => unresolved(x).length)
      if (!next) return
      c = next; flags = unresolved(next); setActive(next.id)
    }
    const f = flags[reviewIdx % flags.length]
    const elId = `flag-${c.id}-${f.id}`
    setReviewing(true)
    setReviewIdx(i => i + 1)
    setFocusFlag(elId)
    idRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.setTimeout(() => document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 450)
  }

  const maskingPrompt = app.prompts.find(p => p.id === 'masking')
  const promptVersionLabel = maskingPrompt ? `Masking v${maskingPrompt.activeVersion}` : 'Masking v4'

  const download = (list: Candidate[], anyway: boolean, viaDelivery: OutputDelivery = delivery) => {
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      app.addOutputs(list.map(c => {
        const p = per[c.id]
        const resList = app.resumesFor(c.id)
        const srcRes = resList.find(x => x.id === p.sourceResumeId) ?? resList[0]
        return {
          candidateId: c.id,
          type: 'Masked' as const,
          roleId: r?.id ?? null,
          template: style === 'traditional' ? `Traditional · ${TEMPLATE_LABEL[template]}` : TEMPLATE_LABEL[template],
          style,
          delivery: viaDelivery,
          shareUrl: `https://heroscouter.com/p/${c.id}-masked`,
          linkActive,
          stale: false,
          sourceResumeId: srcRes?.id,
          sourceVersion: latestVersion(srcRes),
          promptVersion: promptVersionLabel,
          revisions: storedRevisions(p.revs, p.curRev),
        }
      }))
      list.forEach(c => {
        const p = per[c.id]
        patch(c.id, { downloadedRev: p.curRev })
        const n = unresolved(c).length
        app.log({
          what: `${viaDelivery === 'link' ? 'Copied masked web link' : 'Generated masked resume'} for ${c.name} (${style} · template ${template})${anyway && n ? ` · with ${n} possible identifier${n === 1 ? '' : 's'}` : ''}`,
          record: r ? `${r.title} — ${r.company}` : c.name, recordHref: r ? `/roles/${r.id}` : `/candidates/${c.id}`, kind: 'Outputs',
        })
      })
      if (viaDelivery === 'link') {
        app.toast(list.length > 1 ? `Copied ${list.length} shareable web links · Read-only, revocable anytime in Resumes` : 'Copied shareable web link · Read-only, revocable anytime in Resumes')
      } else {
        app.toast(list.length > 1 ? `Downloaded ${list.length} masked resumes` : 'Masked resume downloaded')
      }
      setReviewing(false)
    }, 450)
  }

  const roleOptions = [
    ...app.roles.filter(x => x.status !== 'Closed').map(x => ({ value: x.id, label: `${x.title} — ${x.company}` })),
    { value: 'none', label: 'No specific role' },
    { value: 'url', label: 'Public posting URL' },
  ]

  /* ---------- Left: Settings ---------- */
  const left = (
    <>
      {bulk && <div className="eyebrow text-gray-1000">Sections 3–6 apply to <span className="text-foreground">{cur.name}</span></div>}
      <SourceResumeSelect list={sourceResumes} value={curPer.sourceResumeId} onChange={switchSourceResume} fromMatch={fromMatch} />

      <BezelCard icon={<Target />} title="1 · Target">
        <div className="space-y-4">
          <Field label="Write it for">
            <Select aria-label="Target" size="lg" className="w-full" value={target} onChange={setTarget} options={roleOptions} />
          </Field>
          {target === 'url' && (
            <Field label="Posting URL" hint="We'll read the posting and write the bullets for it.">
              <Input placeholder="https://jobs.example.com/…" value={postingUrl} onChange={e => setPostingUrl(e.target.value)} />
            </Field>
          )}
          {target === 'none' && <InfoNote>No specific role: “Why we recommend” is based on their strengths.</InfoNote>}
        </div>
      </BezelCard>

      <BezelCard icon={<LayoutTemplate />} title="2 · Style & template">
        <div className="space-y-4">
          <StyleSelect style={style} onChangeStyle={setStyle} />
          <div role="radiogroup" aria-label="Template" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(['A', 'B', 'C'] as TemplateId[]).map(t => {
              const disabled = t === 'C' && !r
              const on = template === t
              return (
                <button key={t} role="radio" aria-checked={on} disabled={disabled} onClick={() => setTemplate(t)}
                  className={cn('rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
                    on ? 'border-gray-1100 bg-background shadow-xs' : 'border-border hover:bg-muted')}>
                  <div className="text-sm font-medium">{TEMPLATE_LABEL[t]}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t === 'A' ? 'Header, why, skills, short timeline.' : t === 'B' ? 'Opens with big impact numbers.' : disabled ? 'Needs a target role.' : 'Maps must-haves to evidence.'}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">Default style and layout are set in Settings → Templates.</p>
        </div>
      </BezelCard>

      <BezelCard icon={<EyeOff />} title="3 · What's hidden">
        <div className="space-y-4">
          <Checkbox checked={aliasOn} onChange={setAliasOn} label="Name → descriptive alias" description={aliasOf(cur, activeSourceResume)} />
          <div aria-disabled="true" className="pointer-events-none opacity-60">
            <Checkbox checked onChange={() => {}} label={<span className="inline-flex items-center gap-1.5">Contact details <Lock className="size-3" /></span>} description="Email, phone, LinkedIn and photo are always hidden." />
          </div>
          {cur.companies.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Employers</div>
              <ul className="divide-y divide-border rounded-lg border border-border bg-background">
                {cur.companies.map(co => (
                  <li key={co.name} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{co.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{co.descriptor}</div>
                    </div>
                    <Segmented size="sm" aria-label={`${co.name} on the page`} value={curPer.show[co.name] ? 'show' : 'describe'}
                      onChange={v => patch(cur.id, { show: { ...curPer.show, [co.name]: v === 'show' } })}
                      options={[{ value: 'describe', label: 'Describe' }, { value: 'show', label: 'Show' }]} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cur.education && (
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-sm font-medium">Schools</div><div className="text-xs text-muted-foreground">{cur.education.school}</div></div>
              <Segmented size="sm" aria-label="Schools" value={showSchools ? 'show' : 'hide'} onChange={v => setShowSchools(v === 'show')}
                options={[{ value: 'hide', label: 'Hide' }, { value: 'show', label: 'Show' }]} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div><div className="text-sm font-medium">Location</div><div className="text-xs text-muted-foreground">{cur.city ?? 'Not captured'}</div></div>
            <span className="inline-flex h-6 items-center rounded-md border border-border bg-muted px-2 text-xs font-medium">Metro only</span>
          </div>
        </div>
      </BezelCard>

      <BezelCard icon={<Sparkles />} title="4 · Why we recommend"
        action={<Button variant="ghost" size="sm" icon={<RefreshCw />} onClick={() => {
          regenerateSection('why')
          setDraftedFor(target)
        }}>Regenerate bullets</Button>}>
        <div className="space-y-2">
          {curPer.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 font-mono text-[10px] text-gray-1000 tnum">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <Textarea aria-label={`Bullet ${i + 1}`} className="min-h-9 py-1.5" value={b}
                  onChange={e => {
                    const nextBullets = curPer.bullets.map((x, j) => (j === i ? e.target.value : x))
                    const snap = makeSnapshot(nextBullets, curPer.impact, curPer.skills)
                    patch(cur.id, { bullets: nextBullets, revs: amendRevision(curPer.revs, curPer.curRev, snap) })
                  }} />
              </div>
            </div>
          ))}
          {curPer.bullets.length === 0 && <p className="text-sm text-muted-foreground">Not enough on record to draft bullets. Add achievements to the profile.</p>}
        </div>
        {draftedFor !== target && <div className="mt-3"><InfoNote>Target changed. Regenerate bullets to write them for {r ? r.title : 'their strengths'}.</InfoNote></div>}
        <p className="mt-3 text-xs text-muted-foreground">AI-drafted from the profile. Edit freely; only facts on record are used.</p>
      </BezelCard>

      <BezelCard icon={<MessageSquareQuote />} title="5 · Our take">
        <SignedTakeBlock candidateId={cur.id} roleId={r?.id ?? null} compact />
      </BezelCard>

      <BezelCard icon={<Link2 />} title="6 · Delivery (N28)">
        <DeliverySelect
          delivery={delivery}
          onChangeDelivery={setDelivery}
          shareUrl={`https://heroscouter.com/p/${cur.id}-masked`}
          linkActive={linkActive}
          onToggleLinkActive={active => {
            setLinkActive(active)
            app.toast(active ? 'Shareable web link enabled' : 'Web link turned off')
          }}
          onCopyLink={() => app.toast('Copied shareable web link · Read-only, revocable anytime in Resumes')}
        />
      </BezelCard>
    </>
  )

  /* ---------- Right: Preview ---------- */
  const thin = cur.achievements.length <= 2
  const omitted = notShown(cur)
  const kept = (FLAGS[cur.id] ?? []).filter(f => curPer.res[f.id] === 'keep')
  const curTake = app.takeFor(cur.id, r?.id ?? null)

  const right = (
    <div className="flex h-full min-h-[640px] flex-col">
      {bulk && (
        <div role="tablist" aria-label="Candidates" className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {cands.map(c => {
            const n = unresolved(c).length
            const on = c.id === cur.id
            return (
              <button key={c.id} role="tab" aria-selected={on} onClick={() => { setActive(c.id); setReviewIdx(0) }}
                className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                  on ? 'border-border bg-muted text-foreground' : 'border-transparent text-gray-1100 hover:bg-muted')}>
                {n ? <AlertTriangle className="size-3.5 text-warning" /> : <CircleCheck className="size-3.5 text-success" />}
                {c.name}
                <span className="sr-only">{n ? `${n} possible identifiers` : 'No identifiers found'}</span>
              </button>
            )
          })}
        </div>
      )}
      <div ref={idRef} className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        {failed && (
          <Banner variant="error" actions={<Button size="sm" icon={<RefreshCw />} onClick={() => setWf('live')}>Try again</Button>}>
            The PDF didn't generate. Your settings are kept.
          </Banner>
        )}
        {staleReason && (
          <Banner variant="warning" actions={<Button size="sm" icon={<RefreshCw />} onClick={regenerateAll}>Regenerate</Button>}>
            Stale · {staleReason}. Regenerate to pull the latest profile facts.
          </Banner>
        )}
        {curFlags.length === 0 ? (
          <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-[#15803d]">
            <CircleCheck className="size-4 text-success" />No identifiers found
            {kept.length > 0 && <span className="text-xs text-muted-foreground">· kept on purpose: {kept.map(f => f.term).join(', ')}</span>}
          </div>
        ) : (
          <div role="status" className="rounded-xl border border-warning/40 bg-warning/[0.07] px-3.5 py-2.5">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>{curFlags.length} possible identifier{curFlags.length === 1 ? '' : 's'}: {curFlags.map(f => f.label).join(', ')}</span>
            </div>
            <ul className="mt-2 space-y-1.5 pl-6">
              {curFlags.map(f => (
                <li key={f.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 text-gray-1100">{f.label}</span>
                  <Button size="sm" onClick={() => patch(cur.id, { res: { ...curPer.res, [f.id]: 'describe' } })}>Describe it</Button>
                  <Button size="sm" variant="ghost" onClick={() => patch(cur.id, { res: { ...curPer.res, [f.id]: 'keep' } })}>Keep</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <RefineStatus
          result={curPer.refineResult}
          instruction={curPer.refineInstruction}
          onDismiss={() => patch(cur.id, { refineResult: null })}
        />
        {omitted.length > 0 && <InfoNote>Not shown: {omitted.join(', ')}.</InfoNote>}
        {thin && <InfoNote>Only {cur.achievements.length} achievement{cur.achievements.length === 1 ? '' : 's'} found. The page will be shorter.</InfoNote>}
      </div>
      <div className="min-h-0 flex-1">
        <DocFrame
          toolbar={
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2">
              <div className="flex items-center gap-3">
                <Switch checked={showHidden} onChange={setShowHidden} label="Show what's hidden" />
                <Segmented
                  size="sm"
                  aria-label="Preview style"
                  value={style}
                  onChange={setStyle}
                  options={[
                    { value: 'creative', label: 'Creative' },
                    { value: 'traditional', label: 'Traditional' },
                  ]}
                />
              </div>
              <RevisionsPopover
                key={`${cur.id}-${wf === 'revisions' ? 'open' : 'closed'}`}
                revisions={curPer.revs}
                current={curPer.curRev}
                downloaded={curPer.downloadedRev}
                defaultOpen={wf === 'revisions'}
                onRestore={n => restoreRevision(cur.id, n)}
              />
            </div>
          }
        >
          {rendering ? <PageSkeleton /> : (
            <MaskedPage
              c={cur}
              r={r}
              resume={activeSourceResume}
              template={template}
              style={style}
              per={curPer}
              take={curTake}
              takeAuthor={curTake ? app.member(curTake.authorId) : undefined}
              currentUser={app.currentUser}
              aliasOn={aliasOn}
              showSchools={showSchools}
              showHidden={showHidden}
              reviewing={reviewing}
              focusFlag={focusFlag}
              postingUrl={target === 'url' ? postingUrl : ''}
              onEditBullet={(i, v) => {
                const nextBullets = curPer.bullets.map((x, j) => (j === i ? v : x))
                const snap = makeSnapshot(nextBullets, curPer.impact, curPer.skills)
                patch(cur.id, { bullets: nextBullets, revs: amendRevision(curPer.revs, curPer.curRev, snap) })
              }}
              onEditImpact={(i, v) => {
                const nextImpact = curPer.impact.map((x, j) => (j === i ? v : x))
                const snap = makeSnapshot(curPer.bullets, nextImpact, curPer.skills)
                patch(cur.id, { impact: nextImpact, revs: amendRevision(curPer.revs, curPer.curRev, snap) })
              }}
              onEditExpNote={(coName, v) => {
                patch(cur.id, { expNotes: { ...curPer.expNotes, [coName]: v } })
              }}
              onKeepSection={keepSection}
              onUndoSection={undoSection}
              onDismissBlock={dismissBlock}
              onRegenerateSection={regenerateSection}
              onFixInProfile={handleFixInProfile}
            />
          )}
        </DocFrame>
      </div>
      <RefineBox
        sections={sectionsFor(cur, curPer).map(s => ({ key: s.key, label: s.label }))}
        busy={refining}
        usage={curPer.refineUsage}
        onRefine={handleRefine}
        onRegenerateAll={regenerateAll}
      />
    </div>
  )

  /* ---------- Footer ---------- */
  const flagsHere = bulk ? totalFlags : curFlags.length
  const footer = (
    <div className="flex flex-wrap items-center gap-2">
      <Button icon={<Copy />} onClick={() => setEmailOpen(true)}>Copy email text</Button>
      <span className="eyebrow ml-1 hidden text-gray-1000 sm:inline">
        {style === 'traditional' ? 'Traditional' : 'Creative'} · {TEMPLATE_LABEL[template]} · {resumeLabel(activeSourceResume)} · {promptVersionLabel} · {r ? `${r.title} — ${r.company}` : target === 'url' ? 'Public posting' : 'No specific role'}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {flagsHere > 0 && reviewing && (
          <Button variant="ghost" icon={<Download />} disabled={rendering} onClick={() => download(bulk ? cands : [cur], true, delivery)}>{bulk ? 'Download all anyway' : 'Download anyway'}</Button>
        )}
        {flagsHere > 0 ? (
          <Button variant="primary" icon={<AlertTriangle />} onClick={reviewNext}>Review {flagsHere} possible identifier{flagsHere === 1 ? '' : 's'}</Button>
        ) : delivery === 'link' ? (
          <>
            <Button variant="outline" icon={<Download />} disabled={rendering} onClick={() => download(bulk ? cands : [cur], false, 'pdf')}>
              {bulk ? `Download all (${cands.length})` : 'Download PDF'}
            </Button>
            <Button variant="primary" icon={<Link2 />} disabled={rendering || !linkActive} onClick={() => download(bulk ? cands : [cur], false, 'link')}>
              {bulk ? `Copy ${cands.length} web links` : 'Copy web link'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" icon={<Link2 />} disabled={rendering || !linkActive} onClick={() => download(bulk ? cands : [cur], false, 'link')}>
              {bulk ? `Copy ${cands.length} web links` : 'Copy web link'}
            </Button>
            <Button variant="primary" icon={<Download />} disabled={rendering} onClick={() => download(bulk ? cands : [cur], false, 'pdf')}>
              {bulk ? `Download all (${cands.length})` : 'Download PDF'}
            </Button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      <SplitPane leftTitle="Settings" rightTitle={bulk ? `Preview · ${cands.length} candidates` : 'Preview'}
        leftActions={<ExampleMark />} rightActions={<span className="font-mono text-[11px] text-muted-foreground">{rendering ? 'Rendering…' : failed ? 'Not generated' : `Ready · v${curPer.curRev}`}</span>}
        left={left} right={right} footer={footer} />
      <CopyEmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        candidateIds={cands.map(c => c.id)}
        roleId={r?.id ?? null}
        initialVariant={r?.companyType === 'Client' ? 'client' : 'prospect'}
        initialKind={r?.companyType === 'Client' ? 'profile-share' : 'pitch'}
      />
    </>
  )
}

/* ---------- Page skeleton (Rendering) ---------- */
function PageSkeleton() {
  return (
    <div className="space-y-5 p-8" aria-label="Rendering the page" role="status">
      <Skeleton className="h-16 w-full rounded-md" />
      <div className="space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-2.5 w-full" /><Skeleton className="h-2.5 w-11/12" /><Skeleton className="h-2.5 w-4/5" /></div>
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</div>
      <div className="space-y-2"><Skeleton className="h-3 w-1/4" /><Skeleton className="h-2.5 w-full" /><Skeleton className="h-2.5 w-3/4" /></div>
      <p className="text-center text-[11px] text-muted-foreground">Rendering the page. A masked PDF is ready in under a minute.</p>
    </div>
  )
}

/* ---------- Masked page (§9.1 + v0.3 T3, T6, T8 + v0.4 §7.6 Creative vs Traditional Word-style) ---------- */
function Masked({ on, what, children }: { on: boolean; what: string; children: React.ReactNode }) {
  return <span className={on ? 'hidden-span px-0.5' : undefined} title={on ? `Hidden: ${what}` : undefined}>{children}</span>
}
function H({ traditional, children }: { traditional?: boolean; children: React.ReactNode }) {
  if (traditional) {
    return (
      <h3 className="mb-1.5 border-b border-[#111]/40 pb-0.5 font-serif text-[9px] font-bold tracking-[0.14em] text-[#111] uppercase">
        {children}
      </h3>
    )
  }
  return <h3 className="mb-1.5 font-mono text-[8px] font-medium tracking-[0.14em] text-gray-1000 uppercase">{children}</h3>
}

function MaskedPage({
  c, r, resume, template, style = 'creative', per, take, takeAuthor, currentUser, aliasOn, showSchools, showHidden, reviewing, focusFlag, postingUrl,
  onEditBullet, onEditImpact, onEditExpNote, onKeepSection, onUndoSection, onDismissBlock, onRegenerateSection, onFixInProfile,
}: {
  c: Candidate; r: Role | undefined; resume: Resume | undefined; template: TemplateId; style?: OutputStyle; per: Per
  take: ReturnType<ReturnType<typeof useApp>['takeFor']>; takeAuthor: ReturnType<ReturnType<typeof useApp>['member']>
  currentUser: ReturnType<typeof useApp>['currentUser']
  aliasOn: boolean; showSchools: boolean; showHidden: boolean; reviewing: boolean; focusFlag: string | null; postingUrl: string
  onEditBullet: (i: number, v: string) => void
  onEditImpact: (i: number, v: string) => void
  onEditExpNote: (coName: string, v: string) => void
  onKeepSection: (key: string) => void
  onUndoSection: (key: string) => void
  onDismissBlock: (key: string) => void
  onRegenerateSection: (key: 'why' | 'impact' | 'skills') => void
  onFixInProfile: (label: string) => void
}) {
  const isTraditional = style === 'traditional'
  const flags = FLAGS[c.id] ?? []
  const alias = aliasOf(c, resume)
  const auth = workAuthPill(c)
  const availability = c.fieldSources.availability === 'ASSUMED' ? null : c.availability
  const loc = c.metro ? `${c.metro}${c.workModes ? ` · ${c.workModes.join(' / ').toLowerCase()}` : ''}` : null
  const impact = per.impact
  const bullets = per.bullets.filter(b => b.trim())
  const skillsList = per.skills

  /** Render text, applying identity-check resolutions */
  const withFlags = (text: string): React.ReactNode => {
    const relevant = flags.filter(f => text.includes(f.term) && !(f.company && per.show[f.company]))
    if (!relevant.length) return text
    const parts: React.ReactNode[] = []
    let rest = text
    let k = 0
    while (rest.length) {
      const hit = relevant.map(f => ({ f, i: rest.indexOf(f.term) })).filter(x => x.i >= 0).sort((a, b) => a.i - b.i)[0]
      if (!hit) { parts.push(rest); break }
      parts.push(rest.slice(0, hit.i))
      const res = per.res[hit.f.id]
      const id = `flag-${c.id}-${hit.f.id}`
      if (res === 'describe') parts.push(<Masked key={k++} on={showHidden} what={hit.f.term}>{hit.f.replacement}</Masked>)
      else if (res === 'keep') parts.push(<span key={k++}>{hit.f.term}</span>)
      else parts.push(
        <mark key={k++} id={id} title="Possible identifier"
          className={cn('rounded-sm bg-warning/25 px-0.5 text-inherit outline-1 outline-warning outline-dashed', (reviewing || focusFlag === id) && 'ring-2 ring-warning/60', focusFlag === id && 'animate-pulse')}>
          {hit.f.term}
        </mark>,
      )
      rest = rest.slice(hit.i + hit.f.term.length)
    }
    return parts
  }

  const changeFor = (key: string) => per.refineResult?.changes.find(ch => ch.key === key)
  const blockFor = (key: string) => per.refineResult?.blocked.find(bl => bl.key === key)

  const pills = [availability ? `Available: ${availability}` : null, auth, loc].filter((p): p is string => !!p)
  const header = isTraditional ? (
    <header className="border-b-2 border-[#111] pb-3 text-[#111]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[7.5px] tracking-[0.14em] text-gray-1000 uppercase">
          Confidential candidate summary{r ? ` · Prepared for ${r.title} (${r.company})` : ''}
        </span>
        <span className="font-mono text-[7.5px] text-gray-1000">HeroScouter</span>
      </div>
      <h1 className="mt-1.5 font-serif text-[16px] leading-tight font-bold tracking-tight text-[#111]">
        {aliasOn ? <Masked on={showHidden} what={`Name: ${c.name}`}>{alias}</Masked> : c.name}
      </h1>
      {showHidden && <div className="mt-1 text-[8px]"><span className="hidden-span px-1">Name, email, phone, LinkedIn and photo hidden</span></div>}
      {pills.length > 0 && (
        <p className="mt-1 font-mono text-[8.5px] text-gray-1100">
          {pills.map((p, idx) => (
            <React.Fragment key={p}>
              {idx > 0 && <span className="mx-1.5">·</span>}
              {p === loc ? <Masked on={showHidden} what={`Exact location: ${c.city}`}>{p}</Masked> : p}
            </React.Fragment>
          ))}
        </p>
      )}
    </header>
  ) : (
    <header className="rounded-md bg-[#111] px-5 py-4 text-white">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold tracking-wide">
          <span className="flex size-3.5 items-center justify-center rounded-[3px] bg-white text-[8px] font-bold text-black">H</span>HeroScouter
        </span>
        <span className="font-mono text-[7.5px] tracking-[0.14em] text-white/50 uppercase">Candidate profile{r ? ` · for ${r.title}` : ''}</span>
      </div>
      <h1 className="mt-3 text-[15px] leading-tight font-semibold tracking-tight">
        {aliasOn ? <Masked on={showHidden} what={`Name: ${c.name}`}>{alias}</Masked> : c.name}
      </h1>
      {showHidden && <div className="mt-1 text-[8px]"><span className="hidden-span px-1 text-white/80">Name, email, phone, LinkedIn and photo hidden</span></div>}
      {pills.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {pills.map(p => (
            <span key={p} className="inline-flex h-4 items-center rounded-sm border border-white/20 px-1.5 text-[8px] text-white/90">
              {p === loc ? <Masked on={showHidden} what={`Exact location: ${c.city}`}>{p}</Masked> : p}
            </span>
          ))}
        </div>
      )}
    </header>
  )

  const why = bullets.length > 0 && (
    <DiffSection
      label="Why we recommend"
      change={changeFor('why')}
      block={blockFor('why')}
      onKeep={() => onKeepSection('why')}
      onUndo={() => onUndoSection('why')}
      onDismissBlock={() => onDismissBlock('why')}
      onRegenerate={() => onRegenerateSection('why')}
    >
      <section>
        <H traditional={isTraditional}>Why we recommend</H>
        <ul className="space-y-1 text-[9.5px] leading-snug">
          {bullets.map((b, i) => (
            <li key={i} className="group/fact flex gap-1.5">
              <span className="text-gray-800">{isTraditional ? '•' : '—'}</span>
              <span className="flex-1">
                <EditableText
                  value={b}
                  display={withFlags(b)}
                  label={`recommendation bullet ${i + 1}`}
                  onChange={v => onEditBullet(i, v)}
                />
                <FixInProfile label={b} onClick={() => onFixInProfile(b)} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </DiffSection>
  )

  const takeBlock = <PageTake take={take} author={takeAuthor} variant={isTraditional ? 'note' : 'quote'} />

  const impactList = impact.length > 0 && (
    <DiffSection
      label="Impact highlights"
      change={changeFor('impact')}
      block={blockFor('impact')}
      onKeep={() => onKeepSection('impact')}
      onUndo={() => onUndoSection('impact')}
      onDismissBlock={() => onDismissBlock('impact')}
      onRegenerate={() => onRegenerateSection('impact')}
    >
      <section>
        <H traditional={isTraditional}>Impact highlights</H>
        <ul className="space-y-1 text-[9.5px] leading-snug">
          {impact.map((a, i) => (
            <li key={i} className="group/fact flex gap-1.5">
              <span className="text-gray-800">{isTraditional ? '•' : '▪'}</span>
              <span className="flex-1">
                <EditableText
                  value={a}
                  display={withFlags(a)}
                  label={`impact highlight ${i + 1}`}
                  onChange={v => onEditImpact(i, v)}
                />
                <FixInProfile label={a} onClick={() => onFixInProfile(a)} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </DiffSection>
  )

  const bigNums = impact.length > 0 && (
    <DiffSection
      label="Impact highlights"
      change={changeFor('impact')}
      block={blockFor('impact')}
      onKeep={() => onKeepSection('impact')}
      onUndo={() => onUndoSection('impact')}
      onDismissBlock={() => onDismissBlock('impact')}
      onRegenerate={() => onRegenerateSection('impact')}
    >
      <section className={cn('grid gap-2', impact.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
        {impact.map((a, i) => (
          <div key={i} className="group/fact rounded-md border border-gray-500 p-2.5">
            <div className="font-mono text-[18px] leading-none font-medium tracking-tight">{bigNumber(a) ?? '—'}</div>
            <div className="mt-1 text-[8.5px] leading-snug text-gray-1100">
              <EditableText
                value={a}
                display={withFlags(a)}
                label={`impact highlight ${i + 1}`}
                onChange={v => onEditImpact(i, v)}
              />
              <FixInProfile label={a} onClick={() => onFixInProfile(a)} />
            </div>
          </div>
        ))}
      </section>
    </DiffSection>
  )

  const skills = (skillsList.length > 0 || c.tools.length > 0) && (
    <DiffSection
      label="Skills"
      change={changeFor('skills')}
      block={blockFor('skills')}
      onKeep={() => onKeepSection('skills')}
      onUndo={() => onUndoSection('skills')}
      onDismissBlock={() => onDismissBlock('skills')}
      onRegenerate={() => onRegenerateSection('skills')}
    >
      <section className="group/fact">
        <H traditional={isTraditional}>Skills</H>
        <div className="space-y-1 text-[9px]">
          {skillsList.length > 0 && (
            <div className="flex gap-2">
              <span className="w-9 shrink-0 font-semibold text-gray-1000">Core:</span>
              <span>
                {skillsList.join(' · ')}
                <FixInProfile label="Skills" onClick={() => onFixInProfile('Skills')} />
              </span>
            </div>
          )}
          {c.tools.length > 0 && <div className="flex gap-2"><span className="w-9 shrink-0 font-semibold text-gray-1000">Tools:</span><span>{c.tools.join(' · ')}</span></div>}
        </div>
      </section>
    </DiffSection>
  )

  const exp = c.companies.length > 0 && (
    <section>
      <H traditional={isTraditional}>Experience</H>
      <ol className={cn('space-y-2 text-[9px]', !isTraditional && 'border-l border-gray-500 pl-3')}>
        {c.companies.map(co => {
          const shown = !!per.show[co.name]
          const note = per.expNotes[co.name] ?? EXP_NOTES[c.id]?.[co.name]
          return (
            <li key={co.name} className="group/fact relative">
              {!isTraditional && <span className="absolute top-1 -left-[15px] size-1.5 rounded-full bg-gray-1100" />}
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {co.title}
                  {isTraditional && (
                    <span className="font-normal text-gray-1100">
                      {' · '}
                      {shown ? co.name : <Masked on={showHidden} what={`Employer: ${co.name}`}>{co.descriptor}</Masked>}
                    </span>
                  )}
                  <FixInProfile label={co.name} onClick={() => onFixInProfile(co.name)} />
                </span>
                <span className="shrink-0 font-mono text-[8px] text-gray-1000 tnum">{co.start}–{co.end}</span>
              </div>
              {!isTraditional && (
                <div className="text-gray-1100">{shown ? co.name : <Masked on={showHidden} what={`Employer: ${co.name}`}>{co.descriptor}</Masked>}</div>
              )}
              {note && (
                <div className="text-[8.5px] text-gray-1100">
                  {isTraditional && '• '}
                  <EditableText
                    value={note}
                    display={withFlags(note)}
                    label={`${co.name} experience note`}
                    onChange={v => onEditExpNote(co.name, v)}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )

  const edu = c.education && (
    <section className="group/fact">
      <H traditional={isTraditional}>Education</H>
      <p className="text-[9px]">
        {c.education.degree}, {c.education.field}
        {showSchools ? ` · ${c.education.school}` : showHidden ? <> · <span className="hidden-span px-0.5" title={`Hidden: ${c.education.school}`}>school hidden</span></> : null}
        <FixInProfile label={c.education.school} onClick={() => onFixInProfile('Education')} />
      </p>
    </section>
  )

  let fit: React.ReactNode = null
  if (r && template === 'C') {
    const rows: { need: string; evidence: string }[] = []
    if (c.years != null && c.years >= r.minYears) rows.push({ need: `${r.minYears}+ years`, evidence: `${c.years} years as ${c.subcategory.toLowerCase()}` })
    r.mustSkills.forEach(s => {
      if (!c.skills.includes(s)) return // predicted or missing → never printed
      const a = c.achievements.find(x => x.toLowerCase().includes(s.toLowerCase().replace('.js', '')))
      const t = c.companies.find(co => co.title.toLowerCase().includes(s.toLowerCase()))
      rows.push({ need: s, evidence: a ?? (t ? `${t.title} · ${t.start}–${t.end}` : 'Core skill on record') })
    })
    if (c.workModes && loc && c.workModes.includes(r.workMode)) rows.push({ need: r.workMode === 'Remote' ? 'Remote (US)' : `${r.workMode} · ${r.location.split(',')[0]}`, evidence: loc })
    if (auth) rows.push({ need: 'Work authorization', evidence: auth })
    fit = (
      <section className={cn(isTraditional ? 'border-y border-[#111]/40 py-1.5' : 'rounded-md border border-gray-500')}>
        <div className={cn('font-mono text-[8px] font-medium tracking-[0.14em] uppercase', isTraditional ? 'mb-1 font-serif text-[9px] font-bold text-[#111]' : 'border-b border-gray-500 bg-gray-100 px-3 py-1.5')}>Fit for {r.title}</div>
        <table className="w-full text-[9px]">
          <tbody>
            {rows.map((x, i) => (
              <tr key={i} className="border-b border-gray-300 last:border-0">
                <td className="w-1/3 px-2 py-1 align-top text-gray-1100">✓ {x.need}</td>
                <td className="px-2 py-1">{withFlags(x.evidence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )
  }

  const body: React.ReactNode[] =
    template === 'B' ? [isTraditional ? impactList : bigNums, why, takeBlock, exp, skills, edu]
      : template === 'C' ? [fit, why, takeBlock, impactList, skills, exp, edu]
        : [why, takeBlock, impactList, skills, exp, edu]

  return (
    <article className="flex h-full min-h-full flex-col gap-3.5 px-7 py-6 text-[#111]" aria-label="Masked resume preview">
      {header}
      {postingUrl && <p className="font-mono text-[7.5px] text-gray-1000">Written for the posting at {postingUrl}</p>}
      {body.filter(Boolean).map((b, i) => <React.Fragment key={i}>{b}</React.Fragment>)}
      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-gray-500 pt-2.5 text-[8.5px]">
        <span>Interested? Reply to {firstName(currentUser)} at <span className="font-medium">{currentUser.email}</span></span>
        <span className="text-right text-gray-1000">Profile: {alias}</span>
      </footer>
    </article>
  )
}
