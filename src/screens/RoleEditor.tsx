import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, ArrowUp, Building2, Check, CheckCircle2, FileAudio, FileText, Filter, Layers, Link2, ListChecks, Loader2, Paperclip, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, Sparkles, Upload, Users, X,
} from 'lucide-react'
import { SplitPane, useTopBar } from '../shell/AppShell'
import {
  BezelCard, Button, Checkbox, EmptyState, ExampleMark, Field, Input, Kbd, Segmented, Select, Textarea, cn,
} from '../components/ui'
import { AIStepper, Banner, InfoNote, NotCaptured, SourceBadge, useStepper } from '../components/hs'
import { RequirementRow } from '../components/v3'
import { AddRequirementDialog, LeaveDialog, ProposedChangesDialog } from './Dialogs'
import { useApp, useWireframeState } from '../store/AppStore'
import { POOL_SIZE, jdChangesNorthwind, roles as mockRoles } from '../data/mock'
import {
  CATEGORIES, SUBCATEGORIES, ROLE_VISA_TYPES, COMPANY_INDUSTRIES,
  type Category, type ProposedChange, type Role, type SourceKind, type WorkMode, type VisaSupportPolicy,
} from '../data/types'

/* ==========================================================================
   S-03 · New / edit role (split pane)
   Turn any JD into a structured role, with must-haves the recruiter has
   deliberately chosen. Live pass count shows what each must-have will do.
   ========================================================================== */

type JdTab = 'paste' | 'upload' | 'url' | 'none'
type YesNo = 'Yes' | 'No' | 'Unknown'
type Phase = 'empty' | 'extracting' | 'extracted'
interface SkillTag { name: string; must: boolean }
interface Draft {
  title: string
  industry: string
  industryRule: 'improves' | 'eliminates'
  category: Category | ''
  subcategory: string
  seniority: string
  categoryConfirmed: boolean
  minYears: number | null
  maxYears: number | null
  yearsFlexibility: 'Flexible' | 'Rigid'
  location: string
  workMode: WorkMode | ''
  relocation: boolean | null
  relocationSupported: YesNo
  sponsorship: YesNo
  transfer: YesNo
  acceptedVisas: string[]
  visaSupport: VisaSupportPolicy
  skills: SkillTag[]
  pay: string
  fixedPayMin: number | null
  fixedPayMax: number | null
  variablePay: number | null
  whatGood: string
  research: string
  interview: string
}
type DraftKey = keyof Draft
type Sources = Partial<Record<DraftKey, SourceKind>>

interface SourceState {
  company: string
  companyType: 'Client' | 'Prospect'
  contactName: string
  contactEmail: string
  tab: JdTab
  jdText: string
  fileName: string
  url: string
  noJdTitle: string
  noJdCategory: Category | ''
  noJdLines: string
  callLink: string
  research: string
}

const EMPTY_SOURCE: SourceState = {
  company: '', companyType: 'Client', contactName: '', contactEmail: '', tab: 'paste', jdText: '', fileName: '', url: '',
  noJdTitle: '', noJdCategory: '', noJdLines: '', callLink: '', research: '',
}

const EXAMPLE_JD = `Northwind Pay is hiring a Senior Product Manager to own merchant payouts and treasury. You'll work with a team of 8 engineers and report to Dana K., VP Product.

Requirements
• 6+ years in product management
• Hands-on payments experience (payouts, ledgers or billing)
• Comfortable writing SQL to answer your own questions
• Hybrid in San Francisco, CA, 3 days a week. Relocation support available.

Nice to have
• API or platform products
• Pricing and packaging experience
• B2B SaaS background

Pay: $170k–$190k base + equity
Interview process: Recruiter screen → HM (45 min) → product case → team loop (3) → founder chat`

const EXAMPLE_SOURCE: SourceState = {
  ...EMPTY_SOURCE, company: 'Northwind Pay', companyType: 'Client',
  contactName: 'Sean Ellis', contactEmail: 'sean@northwindpay.com',
  jdText: EXAMPLE_JD,
  callLink: 'https://fathom.video/share/northwind-pay-intake',
  research: 'Hiring manager: Dana K., VP Product (ex-Plaid). Founders: two ex-Square engineers. Raised Series B, $40M, 2025.',
}

const NORTHWIND_WHAT_GOOD = mockRoles.find(r => r.id === 'northwind-spm')?.whatGood ?? ''

const KNOWN_SKILLS: { name: string; re: RegExp }[] = [
  { name: 'Payments', re: /payments/i }, { name: 'SQL', re: /\bsql\b/i }, { name: 'API products', re: /\bapi\b/i },
  { name: 'Pricing', re: /pricing/i }, { name: 'B2B SaaS', re: /b2b saas/i }, { name: 'React', re: /\breact\b/i },
  { name: 'Node.js', re: /\bnode/i }, { name: 'TypeScript', re: /typescript/i }, { name: 'PostgreSQL', re: /postgres/i },
  { name: 'Go', re: /\bGo\b/ }, { name: 'Kafka', re: /kafka/i }, { name: 'Figma', re: /figma/i },
  { name: 'LinkedIn Ads', re: /linkedin ads/i }, { name: 'Python', re: /python/i }, { name: 'Experimentation', re: /experiment/i },
  { name: 'Braze', re: /braze/i }, { name: 'Lifecycle email', re: /lifecycle/i }, { name: 'HubSpot', re: /hubspot/i },
  { name: 'Design systems', re: /design system/i },
]
const KNOWN_CITIES = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA', 'Chicago, IL', 'Denver, CO', 'Los Angeles, CA']

function guessCategory(title: string): { category: Category | ''; subcategory: string } {
  const t = title.toLowerCase()
  if (t.includes('product manager')) return { category: 'Product', subcategory: 'Product Manager' }
  if (t.includes('product marketing')) return { category: 'Marketing', subcategory: 'Product marketing' }
  if (t.includes('growth market')) return { category: 'Marketing', subcategory: 'Growth marketing' }
  if (t.includes('lifecycle')) return { category: 'Marketing', subcategory: 'Lifecycle' }
  if (t.includes('market')) return { category: 'Marketing', subcategory: 'Performance' }
  if (t.includes('full-stack') || t.includes('full stack')) return { category: 'Engineering', subcategory: 'Full-stack' }
  if (t.includes('frontend') || t.includes('front-end')) return { category: 'Engineering', subcategory: 'Frontend' }
  if (t.includes('backend') || t.includes('back-end')) return { category: 'Engineering', subcategory: 'Backend' }
  if (t.includes('engineer')) return { category: 'Engineering', subcategory: 'Full-stack' }
  if (t.includes('design')) return { category: 'Design', subcategory: 'Product design' }
  if (t.includes('data')) return { category: 'Data', subcategory: 'Data science' }
  if (t.includes('account exec') || t.includes('sales')) return { category: 'Sales', subcategory: 'Account executive' }
  return { category: '', subcategory: '' }
}

/** Fake AI extraction — deterministic so the walkthrough is repeatable */
function extractDraft(src: SourceState): { draft: Draft; sources: Sources } {
  if (src.tab === 'url' && !src.jdText) {
    return {
      draft: {
        title: 'Full-stack Engineer', industry: 'AI / ML', industryRule: 'improves',
        category: 'Engineering', subcategory: 'Full-stack', seniority: 'Mid–Senior', categoryConfirmed: false,
        minYears: 4, maxYears: 8, yearsFlexibility: 'Flexible',
        location: 'Remote (US)', workMode: 'Remote', relocation: null, relocationSupported: 'Unknown',
        sponsorship: 'Yes', transfer: 'Unknown',
        acceptedVisas: ['H-1B', 'STEM OPT', 'F-1 / OPT', 'TN', 'O-1'], visaSupport: 'Transfer & sponsorship',
        skills: [{ name: 'React', must: true }, { name: 'Node.js', must: true }, { name: 'TypeScript', must: false }, { name: 'PostgreSQL', must: false }],
        pay: '$150k–$180k', fixedPayMin: 150, fixedPayMax: 180, variablePay: 15,
        whatGood: '', research: src.research, interview: '',
      },
      sources: { title: 'JD', industry: 'JD', category: 'JD', subcategory: 'JD', seniority: 'JD', minYears: 'JD', maxYears: 'JD', location: 'JD', workMode: 'JD', sponsorship: 'JD', skills: 'JD', pay: 'JD', research: src.research ? 'RESEARCH' : undefined },
    }
  }
  const text = src.tab === 'none' ? `${src.noJdTitle}\n${src.noJdLines}` : src.jdText
  const sources: Sources = {}
  const titleMatch = text.match(/hiring an? (.+?)(?: to | in |\.|,)/i)
  const title = src.tab === 'none' ? src.noJdTitle : (titleMatch?.[1] ?? text.split('\n')[0].slice(0, 60)).trim()
  if (title) sources.title = 'JD'
  const guessed = guessCategory(title)
  const category = src.tab === 'none' && src.noJdCategory ? src.noJdCategory : guessed.category
  const subcategory = category === guessed.category ? guessed.subcategory : (category ? SUBCATEGORIES[category][0] : '')
  if (category) { sources.category = 'JD'; sources.subcategory = 'JD' }
  const seniority = /senior|sr\.?\s/i.test(title) ? 'Senior' : /lead|head/i.test(title) ? 'Lead' : /manager/i.test(title) ? 'Manager' : 'Mid'
  sources.seniority = 'JD'
  const yrs = text.match(/(\d+)\+?\s*(?:years|yrs)/i)
  const minYears = yrs ? Number(yrs[1]) : null
  const maxYears = minYears !== null ? minYears + 4 : null
  if (minYears !== null) { sources.minYears = 'JD'; sources.maxYears = 'JD' }
  const workMode: WorkMode | '' = /remote/i.test(text) ? 'Remote' : /hybrid/i.test(text) ? 'Hybrid' : /onsite|on-site|in office/i.test(text) ? 'Onsite' : ''
  if (workMode) sources.workMode = 'JD'
  const city = KNOWN_CITIES.find(c => text.toLowerCase().includes(c.split(',')[0].toLowerCase()))
  const location = city ?? (workMode === 'Remote' ? 'Remote (US)' : '')
  if (location) sources.location = 'JD'
  const relocation = /relocation/i.test(text) ? true : null
  const relocationSupported: YesNo = /no relocation/i.test(text) ? 'No' : /relocation/i.test(text) ? 'Yes' : 'Unknown'
  if (relocation !== null) { sources.relocation = 'JD'; sources.relocationSupported = 'JD' }
  const sponsorship: YesNo = /(no|unable to|cannot|can't) sponsor/i.test(text) ? 'No' : /sponsor/i.test(text) ? 'Yes' : 'Unknown'
  if (sponsorship !== 'Unknown') sources.sponsorship = 'JD'
  const transfer: YesNo = /transfer/i.test(text) ? 'Yes' : sponsorship === 'Yes' ? 'Yes' : 'Unknown'
  const acceptedVisas = sponsorship === 'No' && transfer === 'Yes'
    ? ['H-1B', 'TN', 'O-1', 'E-3']
    : sponsorship === 'Yes'
      ? ['H-1B', 'STEM OPT', 'F-1 / OPT', 'TN', 'O-1', 'L-1', 'E-3']
      : ['H-1B', 'STEM OPT', 'TN', 'O-1']
  const visaSupport: VisaSupportPolicy = sponsorship === 'Yes'
    ? 'Transfer & sponsorship'
    : transfer === 'Yes'
      ? 'Transfer only'
      : sponsorship === 'No'
        ? 'None'
        : 'Unknown'
  const industry = /payments|fintech|payout|ledger|treasury/i.test(text)
    ? 'Payments / Fintech'
    : /health/i.test(text)
      ? 'Healthtech'
      : /gov|defense/i.test(text)
        ? 'Government / Defense'
        : 'B2B SaaS'
  const industryRule: 'improves' | 'eliminates' = industry === 'Government / Defense' ? 'eliminates' : 'improves'
  sources.industry = 'JD'
  const [mustPart, nicePart = ''] = text.split(/nice to have/i)
  const skills: SkillTag[] = []
  KNOWN_SKILLS.forEach(s => {
    if (s.re.test(mustPart)) skills.push({ name: s.name, must: true })
    else if (s.re.test(nicePart)) skills.push({ name: s.name, must: false })
  })
  if (skills.length) sources.skills = 'JD'
  const pay = text.match(/\$\d+k\s*[–-]\s*\$\d+k/i)?.[0] ?? ''
  const payNums = (pay.match(/\d+/g) ?? []).map(Number)
  const fixedPayMin = payNums[0] ?? (minYears ? 170 : null)
  const fixedPayMax = payNums[1] ?? (fixedPayMin ? fixedPayMin + 20 : null)
  const variablePay = fixedPayMin ? 25 : null
  if (pay) { sources.pay = 'JD'; sources.fixedPayMin = 'JD'; sources.fixedPayMax = 'JD'; sources.variablePay = 'JD' }
  const interviewLine = text.split('\n').find(l => l.includes('→')) ?? ''
  const interview = interviewLine.replace(/^interview process:\s*/i, '').trim()
  if (interview) sources.interview = 'JD'
  const whatGood = src.callLink && /northwind/i.test(`${src.company} ${text}`) ? NORTHWIND_WHAT_GOOD : ''
  if (src.callLink) sources.whatGood = 'CALL'
  if (src.research) sources.research = 'RESEARCH'
  return {
    draft: {
      title, industry, industryRule, category, subcategory, seniority, categoryConfirmed: false,
      minYears, maxYears, yearsFlexibility: 'Flexible',
      location, workMode, relocation, relocationSupported,
      sponsorship, transfer, acceptedVisas, visaSupport,
      skills, pay, fixedPayMin, fixedPayMax, variablePay,
      whatGood, research: src.research, interview,
    },
    sources,
  }
}

function draftFromRole(r: Role): { draft: Draft; sources: Sources } {
  const payNums = (r.pay.match(/\d+/g) ?? []).map(Number)
  const fixedMin = r.fixedPayMin ?? payNums[0] ?? 160
  const fixedMax = r.fixedPayMax ?? payNums[1] ?? fixedMin + 20
  const varPay = r.variablePay ?? 20
  const relocSup: YesNo = r.relocationSupported ?? (r.relocationAccepted === true ? 'Yes' : r.relocationAccepted === false ? 'No' : 'Unknown')
  return {
    draft: {
      title: r.title,
      industry: r.industry ?? 'Payments / Fintech',
      industryRule: r.industryRule ?? 'improves',
      category: r.category, subcategory: r.subcategory, seniority: r.seniority, categoryConfirmed: true,
      minYears: r.minYears,
      maxYears: r.maxYears ?? r.minYears + 4,
      yearsFlexibility: r.yearsFlexibility ?? 'Flexible',
      location: r.location, workMode: r.workMode,
      relocation: relocSup === 'Yes' ? true : relocSup === 'No' ? false : null,
      relocationSupported: relocSup,
      sponsorship: r.sponsorship, transfer: r.transfer,
      acceptedVisas: r.acceptedVisas ?? (r.transfer === 'Yes' || r.sponsorship === 'Yes' ? ['H-1B', 'TN', 'O-1', 'E-3'] : []),
      visaSupport: r.visaSupport ?? (r.sponsorship === 'Yes' ? 'Transfer & sponsorship' : r.transfer === 'Yes' ? 'Transfer only' : r.sponsorship === 'No' ? 'None' : 'Unknown'),
      skills: [...r.mustSkills.map(name => ({ name, must: true })), ...r.niceSkills.map(name => ({ name, must: false }))],
      pay: r.pay === '—' ? '' : r.pay,
      fixedPayMin: fixedMin,
      fixedPayMax: fixedMax,
      variablePay: varPay,
      whatGood: r.whatGood ?? '', research: r.research ?? '', interview: r.interview ?? '',
    },
    sources: {
      title: 'JD', industry: 'JD', category: 'EDITED', subcategory: 'EDITED', seniority: 'JD', minYears: 'JD', maxYears: 'JD', location: 'JD', workMode: 'JD',
      relocation: r.relocationAccepted === null ? undefined : 'CALL', relocationSupported: 'CALL',
      sponsorship: r.sponsorship === 'Unknown' ? undefined : 'CALL',
      transfer: r.transfer === 'Unknown' ? undefined : 'CALL', skills: 'JD', pay: 'JD', fixedPayMin: 'JD', fixedPayMax: 'JD', variablePay: 'CALL',
      whatGood: r.whatGood ? 'CALL' : undefined, research: r.research ? 'RESEARCH' : undefined, interview: r.interview ? 'JD' : undefined,
    },
  }
}

function sourceFromRole(r: Role): SourceState {
  return {
    ...EMPTY_SOURCE, company: r.company, companyType: r.companyType,
    contactName: r.hiringContact?.name ?? '', contactEmail: r.hiringContact?.email ?? '',
    tab: r.companySource === 'Public posting URL' ? 'url' : r.companySource === 'No JD' ? 'none' : 'paste',
    jdText: r.jdText ?? '', url: r.postingUrl ?? '', noJdTitle: r.title, noJdCategory: r.category,
    research: r.research ?? '', callLink: r.whatGood ? 'https://fathom.video/share/intake-call' : '',
  }
}

/* ---------- Live pass count (stage-1 elimination is instant, so this is cheap) ---------- */
function passFactor(d: Draft, elimCount = 0) {
  let f = 1
  if (d.subcategory) f *= 0.6
  else if (d.category) f *= 0.8
  if (d.minYears !== null) {
    const effectiveMin = d.yearsFlexibility === 'Flexible' ? Math.max(0, d.minYears - 1) : d.minYears
    f *= Math.max(0, 1 - Math.max(0, effectiveMin - 2) * 0.09)
  }
  if (d.location && d.workMode !== 'Remote') f *= d.relocationSupported === 'Yes' ? 0.62 : 0.4
  if (d.visaSupport === 'None') f *= 0.82
  else if (d.visaSupport === 'Transfer only') f *= 0.9
  if (d.industryRule === 'eliminates') f *= 0.68
  f *= Math.max(0, 1 - 0.14 * Math.max(d.skills.filter(s => s.must).length, elimCount))
  return f
}
const rawPass = (d: Draft, elimCount = 0) => Math.min(POOL_SIZE, Math.round(POOL_SIZE * passFactor(d, elimCount) * 1.75))

/* ---------- Small local pieces ---------- */
function Lbl({ children, src }: { children: React.ReactNode; src?: SourceKind }) {
  return <span className="flex items-center gap-2">{children}{src && <SourceBadge kind={src} />}</span>
}

function SuggestedBadge() {
  return <span title="Suggested from the JD. Confirm or change it." className="inline-flex h-4 items-center gap-1 rounded-xs border border-info/50 bg-info/5 px-1 font-mono text-[9px] tracking-[0.1em] text-[#0e7490] uppercase"><Sparkles className="size-2.5" />Suggested</span>
}

/** Runs a 4-step demo animation with a randomized total duration between 3.2s and 5.8s (3–6s) */
function useRandomDemoStepper(total: number, running: boolean, minTotalMs = 3200, maxTotalMs = 5800) {
  const [step, setStep] = useState(0)
  const delaysRef = useRef<number[]>([])

  useEffect(() => {
    if (!running) {
      setStep(0)
      delaysRef.current = []
      return
    }
    if (delaysRef.current.length !== total) {
      const targetTotal = minTotalMs + Math.random() * (maxTotalMs - minTotalMs)
      const weights = Array.from({ length: total }, () => 0.65 + Math.random() * 0.7)
      const weightSum = weights.reduce((a, b) => a + b, 0)
      delaysRef.current = weights.map(w => Math.round((w / weightSum) * targetTotal))
    }
    if (step >= total) return
    const ms = delaysRef.current[step] ?? 1000
    const t = window.setTimeout(() => setStep(s => s + 1), ms)
    return () => window.clearTimeout(t)
  }, [running, step, total, minTotalMs, maxTotalMs])

  return { step, done: running && step >= total }
}

const WF_NEW = [
  { id: 'live', label: '✦ Find with AI (default)' },
  { id: 'ai-extracting', label: '✦ AI Setup · Extracting' },
  { id: 'manual', label: 'Manual · Role setup' },
  { id: 'shortlist-running', label: '✦ Shortlist with AI · Running' },
  { id: 'shortlist-failed', label: '✦ Shortlist with AI · Failed' },
  { id: 'empty', label: 'Manual · Empty source' },
  { id: 'extracting', label: 'Extracting' },
  { id: 'extracted', label: 'Extracted + live pass count' },
  { id: 'failed', label: 'Failed (file)' },
  { id: 'partial', label: 'Partial (Not captured)' },
]
const WF_EDIT = [
  { id: 'live', label: '✦ Find with AI (default)' },
  { id: 'manual', label: 'Manual · Role setup' },
  { id: 'shortlist-running', label: '✦ Shortlist with AI · Running' },
  { id: 'shortlist-failed', label: '✦ Shortlist with AI · Failed' },
  { id: 'ai-req', label: 'Update requirements with AI → D-08' },
  { id: 'revised', label: 'Revised JD → D-03' },
]
const STEPS = ['Reading the job description', 'Finding requirements', 'Suggesting category', 'Checking the pool']
const SHORTLIST_STEPS = [
  'Running Stage 1 hard eliminators across 412 candidates',
  'Cross-checking Stage 2 signals against resumes & Fathom calls',
  'Evaluating ◇ adjacent skill graph & preserving Assumed fields',
  'Ranking top candidates & assembling evidence-backed shortlist',
]

const AI_DEFAULT_PROMPT = `Company: Northwind Pay (Client · Contact: Dana K., dana@northwindpay.com)
Fathom call: https://fathom.video/share/northwind-pay-intake

Senior Product Manager — Merchant Payouts & Treasury
• 6+ years in product management
• Hands-on payments experience (payouts, ledgers or billing)
• Comfortable writing SQL to answer your own questions
• Hybrid in San Francisco, CA (3 days/wk) · Relocation supported
• No visa sponsorship — H-1B transfer is fine (from intake call with Sean)
• Pay: $170k–$190k base + equity`

export function RoleEditor({ mode }: { mode: 'new' | 'edit' }) {
  const app = useApp()
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const role = mode === 'edit' && id ? app.role(id) : undefined
  const [wf, setWf] = useWireframeState('S-03', mode === 'new' ? 'New role' : 'Edit role', mode === 'new' ? WF_NEW : WF_EDIT)

  const initialModeParam = searchParams.get('mode')
  const initialStateParam = searchParams.get('state')
  const hasDialogParam = typeof window !== 'undefined' && window.location.hash.includes('dialog=ai-req')
  const [entryMode, setEntryMode] = useState<'ai' | 'manual'>(() =>
    initialModeParam === 'manual' || initialStateParam === 'shortlist-running' || initialStateParam === 'shortlist-failed' || hasDialogParam ? 'manual' : 'ai',
  )
  const [aiRawText, setAiRawText] = useState<string>(() => (role ? `${role.company} (${role.companyType})\n${role.jdText ?? EXAMPLE_JD}` : ''))
  const [aiFileName, setAiFileName] = useState<string>('')
  const [aiCallUrl, setAiCallUrl] = useState<string>(() => role ? 'https://fathom.video/share/northwind-pay-intake' : '')
  const [showCallInput, setShowCallInput] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiExtractFailed, setAiExtractFailed] = useState(false)
  const [fromAiSetup, setFromAiSetup] = useState(false)
  const [shortlistPhase, setShortlistPhase] = useState<'idle' | 'running' | 'failed'>(() =>
    initialStateParam === 'shortlist-running' ? 'running' : initialStateParam === 'shortlist-failed' ? 'failed' : 'idle',
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const switchEntryMode = (next: 'ai' | 'manual') => {
    setEntryMode(next)
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'manual') nextParams.set('mode', 'manual')
    else nextParams.delete('mode')
    setSearchParams(nextParams, { replace: true })
  }

  const [src, setSrc] = useState<SourceState>(() => (role ? sourceFromRole(role) : EMPTY_SOURCE))
  const initial = useMemo(() => (role ? draftFromRole(role) : null), [role?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<Draft | null>(initial?.draft ?? null)
  const [sources, setSources] = useState<Sources>(initial?.sources ?? {})
  const [baseline, setBaseline] = useState<Draft | null>(initial?.draft ?? null)
  const [phase, setPhase] = useState<Phase>(role ? 'extracted' : 'empty')
  const [failed, setFailed] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [revisedOpen, setRevisedOpen] = useState(false)
  const [askDialog, setAskDialog] = useState<'type' | 'transcript' | 'ai' | null>(() =>
    hasDialogParam ? 'ai' : null,
  )
  const [reqFilter, setReqFilter] = useState<'all' | 'eliminates' | 'improves' | 'red-flag'>('all')
  const askRoleId = role?.id ?? 'northwind-spm'
  const reqs = app.requirementsFor(askRoleId)
  const elimCount = reqs.filter(r => r.effect === 'eliminates').length
  const greenCount = reqs.filter(r => r.effect === 'improves').length
  const redCount = reqs.filter(r => r.effect === 'red-flag').length
  const filteredReqs = reqFilter === 'all' ? reqs : reqs.filter(r => r.effect === reqFilter)
  const locationRef = useRef<HTMLInputElement>(null)

  useTopBar(
    mode === 'new'
      ? [{ label: 'Roles', to: '/roles' }, { label: 'New role' }]
      : [{ label: 'Roles', to: '/roles' }, { label: role?.title ?? 'Role', to: `/roles/${id}` }, { label: 'Edit' }],
    role ? <span className="inline-flex h-6 items-center rounded-md border border-border px-2 font-mono text-[11px]">JD v{role.jdVersion}</span> : undefined,
    [role?.jdVersion],
  )

  /* Wireframe presets — each state is reachable from the bottom toolbar, then stays interactive */
  useEffect(() => {
    if (wf === 'shortlist-running' || wf === 'shortlist-failed') {
      const x = extractDraft(src.jdText ? src : EXAMPLE_SOURCE)
      if (!src.jdText) setSrc(EXAMPLE_SOURCE)
      if (!draft) { setDraft(x.draft); setSources(x.sources); setBaseline(x.draft); setPhase('extracted') }
      setEntryMode('manual')
      setShortlistPhase(wf === 'shortlist-running' ? 'running' : 'failed')
      return
    }
    if (wf === 'ai-extracting') {
      setEntryMode('ai')
      if (!aiRawText.trim()) setAiRawText(AI_DEFAULT_PROMPT)
      setAiExtractFailed(false)
      setAiProcessing(true)
      return
    }
    if (mode === 'edit') {
      if (wf === 'live') {
        if (searchParams.get('state') === 'shortlist-running') { setEntryMode('manual'); setShortlistPhase('running'); return }
        if (searchParams.get('state') === 'shortlist-failed') { setEntryMode('manual'); setShortlistPhase('failed'); return }
        if (searchParams.get('mode') === 'manual') setEntryMode('manual')
      }
      if (wf === 'manual') { setEntryMode('manual'); setShortlistPhase('idle') }
      if (wf === 'revised') { setEntryMode('manual'); setShortlistPhase('idle'); setRevisedOpen(true) }
      if (wf === 'ai-req') { setEntryMode('manual'); setShortlistPhase('idle'); setAskDialog('type') }
      return
    }
    if (wf === 'live') {
      if (searchParams.get('state') === 'shortlist-running') {
        const x = extractDraft(EXAMPLE_SOURCE)
        setSrc(EXAMPLE_SOURCE); setDraft(x.draft); setSources(x.sources); setBaseline(x.draft); setPhase('extracted')
        setEntryMode('manual'); setShortlistPhase('running'); return
      }
      if (searchParams.get('state') === 'shortlist-failed') {
        const x = extractDraft(EXAMPLE_SOURCE)
        setSrc(EXAMPLE_SOURCE); setDraft(x.draft); setSources(x.sources); setBaseline(x.draft); setPhase('extracted')
        setEntryMode('manual'); setShortlistPhase('failed'); return
      }
      if (searchParams.get('mode') === 'manual') setEntryMode('manual')
      return
    }
    setEntryMode('manual')
    setShortlistPhase('idle')
    setFailed(false); setDirty(false)
    if (wf === 'manual') {
      const x = extractDraft(EXAMPLE_SOURCE)
      setSrc(EXAMPLE_SOURCE); setDraft(x.draft); setSources(x.sources); setBaseline(x.draft); setPhase('extracted')
    }
    if (wf === 'empty') { setSrc(EMPTY_SOURCE); setDraft(null); setPhase('empty') }
    if (wf === 'extracting') { setSrc(EXAMPLE_SOURCE); setDraft(null); setPhase('extracting') }
    if (wf === 'extracted' || wf === 'partial') {
      const x = extractDraft(EXAMPLE_SOURCE)
      let d = x.draft; const s = { ...x.sources }
      if (wf === 'partial') { d = { ...d, location: '', workMode: '', pay: '', interview: '', relocation: null }; delete s.location; delete s.workMode; delete s.pay; delete s.interview; delete s.relocation }
      setSrc(EXAMPLE_SOURCE); setDraft(d); setSources(s); setBaseline(x.draft); setPhase('extracted')
    }
    if (wf === 'failed') { setSrc({ ...EXAMPLE_SOURCE, tab: 'upload', jdText: '', fileName: 'Northwind-JD-scan.pdf' }); setDraft(null); setPhase('empty'); setFailed(true) }
  }, [wf, mode])

  const aiStepper = useRandomDemoStepper(STEPS.length, aiProcessing && wf !== 'ai-extracting', 3200, 5600)
  useEffect(() => {
    if (!aiStepper.done || !aiProcessing || wf === 'ai-extracting') return
    setAiProcessing(false)
    const raw = aiRawText.trim() || AI_DEFAULT_PROMPT
    const companyMatch = raw.match(/Company:\s*([^\n(]+)/i)
    const callMatch = raw.match(/https?:\/\/[^\s)]+/i)
    const nextSrc: SourceState = {
      ...EXAMPLE_SOURCE,
      company: companyMatch ? companyMatch[1].trim() : (src.company || 'Northwind Pay'),
      jdText: raw,
      fileName: aiFileName,
      callLink: aiCallUrl || (callMatch ? callMatch[0] : EXAMPLE_SOURCE.callLink),
    }
    const x = extractDraft(nextSrc)
    setSrc(nextSrc)
    setDraft(x.draft)
    setSources(x.sources)
    setBaseline(x.draft)
    setPhase('extracted')
    setFromAiSetup(true)
    setDirty(true)
    switchEntryMode('manual')
    app.toast('AI extracted role details — verify below & start shortlisting')
  }, [aiStepper.done, aiProcessing, wf]) // eslint-disable-line react-hooks/exhaustive-deps

  const runAiRoleSetup = () => {
    if (!aiRawText.trim() && !aiFileName) {
      setAiRawText(AI_DEFAULT_PROMPT)
      setAiCallUrl('https://fathom.video/share/northwind-pay-intake')
    }
    setAiExtractFailed(false)
    setAiProcessing(true)
  }

  const isPinnedShortlistRunning = wf === 'shortlist-running' || searchParams.get('state') === 'shortlist-running'
  const shortlistStepper = useRandomDemoStepper(SHORTLIST_STEPS.length, shortlistPhase === 'running' && !isPinnedShortlistRunning, 3400, 5800)
  useEffect(() => {
    if (!shortlistStepper.done || shortlistPhase !== 'running' || isPinnedShortlistRunning) return
    setShortlistPhase('idle')
    save(true)
  }, [shortlistStepper.done, shortlistPhase, isPinnedShortlistRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  const startShortlistWithAi = () => {
    if (!draft) return
    setShortlistPhase('running')
  }

  const stepper = useStepper(STEPS.length, phase === 'extracting' && wf !== 'extracting', 750)
  useEffect(() => {
    if (!stepper.done) return
    const x = extractDraft(src)
    setDraft(x.draft); setSources(x.sources); setBaseline(x.draft); setPhase('extracted')
    app.toast('Role details extracted')
  }, [stepper.done]) // eslint-disable-line react-hooks/exhaustive-deps

  const editSrc = (patch: Partial<SourceState>) => { setSrc(s => ({ ...s, ...patch })); setDirty(true) }
  const set = <K extends DraftKey>(k: K, v: Draft[K], srcKey: DraftKey = k) => {
    setDraft(d => (d ? { ...d, [k]: v } : d))
    setSources(s => ({ ...s, [srcKey]: 'EDITED' }))
    setDirty(true)
  }

  const hasJd = src.tab === 'paste' ? src.jdText.trim().length > 20
    : src.tab === 'upload' ? !!src.fileName && !failed
      : src.tab === 'url' ? /\w+\.\w+/.test(src.url)
        : !!src.noJdTitle.trim() && !!src.noJdLines.trim()

  const extract = () => { setFailed(false); setPhase('extracting'); if (wf !== 'live') setWf('live') }
  const useExample = () => { setSrc(EXAMPLE_SOURCE); setFailed(false); setDirty(true) }

  /* Live pass count */
  const pass = useMemo(() => {
    if (!draft) return null
    if (mode === 'edit' && role && baseline) {
      const fb = passFactor(baseline, 3)
      return Math.max(0, Math.min(POOL_SIZE, fb > 0 ? Math.round(role.passCount * passFactor(draft, elimCount) / fb) : rawPass(draft, elimCount)))
    }
    return rawPass(draft, elimCount)
  }, [draft, baseline, mode, role, elimCount])

  /* ---------- Save ---------- */
  const companySource: Role['companySource'] = src.tab === 'url' ? 'Public posting URL' : src.tab === 'none' ? 'No JD' : src.companyType === 'Client' ? 'Client JD' : 'Public posting URL'
  const hiringContact = (src.contactName.trim() || src.contactEmail.trim())
    ? { name: src.contactName.trim() || src.contactEmail.trim(), email: src.contactEmail.trim() || `hiring@${(src.company || 'company').toLowerCase().replace(/[^a-z0-9]/g, '')}.com` }
    : undefined

  const fields = (d: Draft) => {
    const formattedPay = d.fixedPayMin != null && d.fixedPayMax != null
      ? `$${d.fixedPayMin}k–$${d.fixedPayMax}k${d.variablePay ? ` + $${d.variablePay}k var` : ''}`
      : (d.pay || '—')
    return {
      title: d.title || 'Untitled role',
      industry: d.industry || 'B2B SaaS',
      industryRule: d.industryRule,
      category: (d.category || 'Product') as Category,
      subcategory: d.subcategory,
      seniority: d.seniority,
      minYears: d.minYears ?? 0,
      maxYears: d.maxYears ?? null,
      yearsFlexibility: d.yearsFlexibility,
      location: d.location,
      workMode: (d.workMode || 'Hybrid') as WorkMode,
      relocationAccepted: d.relocationSupported === 'Yes' ? true : d.relocationSupported === 'No' ? false : null,
      relocationSupported: d.relocationSupported,
      sponsorship: (d.visaSupport === 'Transfer & sponsorship' || d.visaSupport === 'Sponsorship offered' ? 'Yes' : d.visaSupport === 'None' || d.visaSupport === 'Transfer only' ? 'No' : 'Unknown') as YesNo,
      transfer: (d.visaSupport === 'Transfer & sponsorship' || d.visaSupport === 'Transfer only' ? 'Yes' : d.visaSupport === 'None' ? 'No' : 'Unknown') as YesNo,
      acceptedVisas: d.acceptedVisas,
      visaSupport: d.visaSupport,
      mustSkills: d.skills.filter(s => s.must).map(s => s.name),
      niceSkills: d.skills.filter(s => !s.must).map(s => s.name),
      pay: formattedPay,
      fixedPayMin: d.fixedPayMin,
      fixedPayMax: d.fixedPayMax,
      variablePay: d.variablePay,
      whatGood: d.whatGood || undefined,
      research: d.research || undefined,
      interview: d.interview || undefined,
      hiringContact,
    }
  }

  const mustChanges = (r: Role, d: Draft): string[] => {
    const f = fields(d); const parts: string[] = []
    const added = f.mustSkills.filter(s => !r.mustSkills.includes(s))
    const removed = r.mustSkills.filter(s => !f.mustSkills.includes(s))
    if (added.length) parts.push(`added ${added.join(', ')}`)
    if (removed.length) parts.push(`removed ${removed.join(', ')}`)
    if (f.minYears !== r.minYears) parts.push(`minimum years ${r.minYears} → ${f.minYears}`)
    if (f.location !== r.location) parts.push(`location ${r.location} → ${f.location || 'none'}`)
    if (f.workMode !== r.workMode) parts.push(`work mode ${r.workMode} → ${f.workMode}`)
    if (f.relocationAccepted !== r.relocationAccepted) parts.push('relocation changed')
    if (f.sponsorship !== r.sponsorship) parts.push(`sponsorship ${r.sponsorship} → ${f.sponsorship}`)
    if (f.transfer !== r.transfer) parts.push(`transfer ${r.transfer} → ${f.transfer}`)
    return parts
  }

  const save = (scan: boolean) => {
    if (!draft) return
    if (mode === 'new') {
      const f = fields(draft)
      const slug = `${src.company || 'company'}-${f.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const newId = `${slug}-${Date.now().toString(36).slice(-4)}`
      const passN = pass ?? 27
      const newRole: Role = {
        id: newId, company: src.company || 'Untitled company', companyType: src.companyType, companySource,
        ...f, status: 'Open', jdVersion: 1,
        matchStatus: scan ? 'up-to-date' : 'not-run',
        shortlisted: 0, updated: 'Just now',
        passCount: passN,
        jdText: src.tab === 'none' ? src.noJdLines : src.jdText || undefined, postingUrl: src.url || undefined,
        scoredCount: scan ? app.autoSuggestCount : 0,
        suggestedCount: scan ? app.autoSuggestCount : 0,
        aiScoresUsed: scan ? app.autoSuggestCount : 0,
        requirements: reqs.map(q => ({ ...q, roleId: newId })),
        latestUpdate: scan
          ? { text: `Scan done · ${app.autoSuggestCount} suggested · ${Math.max(0, passN - app.autoSuggestCount)} not scored`, who: 'Auto-scan', when: 'Just now' }
          : { text: `${passN} pass Stage 1 · not scored`, who: app.currentUser.displayName.split(' ')[0], when: 'Just now' },
      }
      const label = `${newRole.title} — ${newRole.company}`
      app.addRole(newRole)
      app.log({ what: `Created role · ${reqs.length} requirements · ${f.minYears}+ yrs`, record: label, recordHref: `/roles/${newRole.id}`, kind: 'Roles' })
      if (scan) {
        app.log({ what: `Auto-scan · ${newRole.passCount} not eliminated · ${app.autoSuggestCount} suggested`, record: label, recordHref: `/roles/${newRole.id}`, kind: 'Reruns' })
        app.toast(`AI matched candidates: ${newRole.passCount} pass Stage 1 · ${app.autoSuggestCount} ready to shortlist`)
        navigate(`/roles/${newRole.id}?tab=matches&from=setup`)
      } else {
        app.toast('Role saved')
        navigate(`/roles/${newRole.id}?tab=details`)
      }
      return
    }
    if (!role) return
    const f = fields(draft)
    const changes = mustChanges(role, draft)
    const label = `${role.title} — ${role.company}`
    const patch: Partial<Role> = { ...f, company: src.company || role.company, companyType: src.companyType, updated: 'Just now', passCount: pass ?? role.passCount }
    if (changes.length && !scan) { patch.matchStatus = 'out-of-date'; patch.outOfDateReason = `Requirements changed since the last scan: ${changes.join(', ')}.` }
    app.updateRole(role.id, patch)
    app.log({ what: changes.length ? `Edited requirements: ${changes.join('; ')}` : 'Edited role details', record: label, recordHref: `/roles/${role.id}`, kind: 'Roles',
      before: `Requirements: ${role.mustSkills.join(', ')} · ${role.minYears}+ yrs`, after: `Requirements: ${f.mustSkills.join(', ')} · ${f.minYears}+ yrs` })
    if (scan) {
      app.rerun(role.id)
      app.toast(`AI matched candidates: ${pass ?? role.passCount} pass Stage 1 · ${app.autoSuggestCount} ready to shortlist`)
      navigate(`/roles/${role.id}?tab=matches&from=setup`)
    } else {
      app.toast(changes.length ? 'Role saved · matches marked out of date' : 'Role saved')
      navigate(`/roles/${role.id}?tab=details`)
    }
  }

  const applyRevised = (accepted: ProposedChange[]) => {
    if (!role) return
    const patch: Partial<Role> = {}
    const parts: string[] = []
    accepted.forEach(c => {
      if (c.field === 'Must-have skills') {
        const next = c.to.split(',').map(s => s.trim()).filter(Boolean)
        patch.mustSkills = next
        const prev = c.from.split(',').map(s => s.trim())
        const added = next.filter(s => !prev.includes(s))
        if (added.length) parts.push(`added ${added.join(', ')}`)
      }
      if (c.field === 'Minimum years') { patch.minYears = Number(c.to); parts.push(`minimum years ${c.from} → ${c.to}`) }
      if (c.field === 'Pay range') { patch.pay = c.to; parts.push(`pay ${c.from} → ${c.to}`) }
    })
    const v = role.jdVersion + 1
    const reason = `Requirements changed since the last scan: ${parts.join(', ')}.`
    app.updateRole(role.id, { ...patch, jdVersion: v, matchStatus: 'out-of-date', outOfDateReason: reason, updated: 'Just now' })
    app.log({
      what: `Applied revised JD (v${v}): ${parts.join('; ')}`, record: `${role.title} — ${role.company}`, recordHref: `/roles/${role.id}`, kind: 'Roles',
      before: accepted.map(c => `${c.field}: ${c.from}`).join(' · '), after: accepted.map(c => `${c.field}: ${c.to}`).join(' · '),
    })
    app.toast(`Applied ${accepted.length} change${accepted.length === 1 ? '' : 's'} · now JD v${v}`)
    setWf('live')
    navigate(`/roles/${role.id}?tab=matches`)
  }

  const cancel = () => (dirty ? setLeaveOpen(true) : navigate(role ? `/roles/${role.id}` : '/roles'))

  if (mode === 'edit' && !role) {
    return <div className="p-6"><EmptyState icon={<FileText />} title="Role not found" body="This role may have been removed." action={<Button onClick={() => navigate('/roles')}>Back to roles</Button>} /></div>
  }

  const companies = Array.from(new Set(app.roles.map(r => r.company)))
  const isNewCompany = !!src.company.trim() && !companies.some(c => c.toLowerCase() === src.company.trim().toLowerCase())

  /* ---------- Left pane: Source ---------- */
  const d = draft

  const left = (
    <>
      <BezelCard icon={<Building2 />} title="Company">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <Field label="Company name" hint={isNewCompany ? `“${src.company.trim()}” is new. It'll be created when you save.` : undefined}>
              <Input list="hs-companies" placeholder="Search or create a company" value={src.company} onChange={e => editSrc({ company: e.target.value })} />
              <datalist id="hs-companies">{companies.map(c => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Company type">
              <Segmented aria-label="Company type" value={src.companyType} onChange={v => editSrc({ companyType: v })} options={['Client', 'Prospect']} />
            </Field>
          </div>
          {d && (
            <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <Field label={<Lbl src={sources.industry}>Company industry</Lbl>} hint="Same industry is a Green flag by default, or a Requirement in strict cases (e.g. government contracts).">
                <Select
                  aria-label="Company industry"
                  className="w-full"
                  size="lg"
                  value={d.industry}
                  onChange={v => set('industry', v)}
                  options={COMPANY_INDUSTRIES.map(ind => ({ value: ind, label: ind }))}
                />
              </Field>
              <Field label="Same-industry rule">
                <Segmented
                  size="sm"
                  aria-label="Same-industry rule"
                  value={d.industryRule}
                  onChange={v => set('industryRule', v)}
                  options={[
                    { value: 'improves', label: 'Green flag (default)' },
                    { value: 'eliminates', label: 'Requirement (rules out)' },
                  ]}
                />
              </Field>
            </div>
          )}
          <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            <Field label="Contact name (optional)">
              <Input placeholder="e.g. Sean Ellis" value={src.contactName} onChange={e => editSrc({ contactName: e.target.value })} />
            </Field>
            <Field label="Contact email (optional)">
              <Input type="email" placeholder="e.g. sean@northwindpay.com" value={src.contactEmail} onChange={e => editSrc({ contactEmail: e.target.value })} />
            </Field>
          </div>
          {src.companyType === 'Prospect' && <InfoNote>Prospect roles only offer masked resumes, so identities never reach a prospect by mistake.</InfoNote>}
        </div>
      </BezelCard>

      <BezelCard icon={<FileText />} title={<span className="flex items-center gap-2">Job description <span className="eyebrow text-[9px] text-gray-1000">Required</span></span>}
        action={mode === 'edit'
          ? <Button variant="outline" size="sm" onClick={() => setRevisedOpen(true)}>Paste revised JD</Button>
          : <Button variant="link" className="text-xs" onClick={useExample}>Use example JD</Button>}>
        <div className="space-y-4">
          <Segmented aria-label="How to add the JD" size="sm" value={src.tab} onChange={v => { editSrc({ tab: v }); setFailed(false) }}
            options={[{ value: 'paste', label: 'Paste text' }, { value: 'upload', label: 'Upload file' }, { value: 'url', label: 'Public posting URL' }, { value: 'none', label: 'No JD — describe the role' }]} />
          {src.tab === 'paste' && (
            <Textarea aria-label="Job description text" placeholder="Paste the full job description here…" value={src.jdText}
              onChange={e => editSrc({ jdText: e.target.value })} className="min-h-[160px] text-[13px] leading-relaxed" />
          )}
          {src.tab === 'upload' && (
            <div className="space-y-3">
              {failed && (
                <Banner variant="error" actions={<Button size="sm" onClick={() => { editSrc({ tab: 'paste' }); setFailed(false) }}>Paste JD text</Button>}>
                  We couldn't read this file. Paste the JD text instead.
                </Banner>
              )}
              <button type="button" onClick={() => { editSrc({ fileName: 'Northwind-Pay-Senior-PM.pdf', jdText: EXAMPLE_JD, company: src.company || 'Northwind Pay' }); setFailed(false) }}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-gray-700 bg-background px-4 py-8 text-center transition-colors outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/40">
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">{src.fileName ? src.fileName : 'Drop a PDF or DOCX, or choose a file'}</span>
                <span className="text-xs text-muted-foreground">{src.fileName ? (failed ? 'No readable text found' : 'Ready to extract') : 'Up to 10 MB'}</span>
              </button>
            </div>
          )}
          {src.tab === 'url' && (
            <Field label="Posting URL" hint="We'll read the public posting text when you extract.">
              <div className="relative">
                <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="https://jobs.company.com/role" value={src.url} onChange={e => editSrc({ url: e.target.value })} />
              </div>
            </Field>
          )}
          {src.tab === 'none' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title"><Input placeholder="e.g. Growth Marketing Manager" value={src.noJdTitle} onChange={e => editSrc({ noJdTitle: e.target.value })} /></Field>
                <Field label="Category">
                  <Select aria-label="Category" className="w-full" size="lg" value={src.noJdCategory} onChange={v => editSrc({ noJdCategory: v as Category | '' })}
                    options={[{ value: '', label: 'Choose…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
                </Field>
              </div>
              <Field label="Describe the role" hint="Three lines is enough: what they'll own, must-haves, location.">
                <Textarea maxChars={400} placeholder="Owns paid acquisition for a B2B SaaS. 5+ years, LinkedIn Ads. Onsite in NYC." value={src.noJdLines} onChange={e => editSrc({ noJdLines: e.target.value })} />
              </Field>
            </div>
          )}
          <div className="border-t border-border pt-3.5">
            <Field
              label={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>Client intake call (Fathom / Granola)</span>
                  <span className="eyebrow rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">Optional · Continuously fed context</span>
                  {src.callLink && <SourceBadge kind="CALL" />}
                </span>
              }
            >
              <div className="relative">
                <FileAudio className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="https://fathom.video/share/… or Granola link / ongoing sync notes"
                  value={src.callLink}
                  onChange={e => editSrc({ callLink: e.target.value })}
                />
              </div>
            </Field>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3.5">
            <span className="text-xs text-muted-foreground">{hasJd ? 'Ready to extract from JD & call context.' : 'Add a JD to extract role details.'}</span>
            <Button
              variant="chroma"
              disabled={!hasJd || phase === 'extracting'}
              icon={<Sparkles />}
              onClick={extract}
            >
              {phase === 'extracted' ? 'Re-extract' : 'Extract role details'}
            </Button>
          </div>
        </div>
      </BezelCard>
    </>
  )

  /* ---------- Right pane: Role details ---------- */
  const right = phase === 'extracting' ? (
    <AIStepper title="Extracting role details" steps={STEPS} current={wf === 'extracting' ? 2 : stepper.step} />
  ) : !d ? (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-gray-100 p-1">
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-border bg-secondary">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Role details will appear here</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Paste a job description on the left to extract requirements automatically, or start with a quick-fill option below.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
            <Button
              variant="chroma"
              icon={<Sparkles />}
              onClick={() => {
                setSrc(EXAMPLE_SOURCE)
                setFailed(false)
                setDirty(true)
                setPhase('extracting')
                if (wf !== 'live') setWf('live')
              }}
            >
              Load example JD &amp; extract
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const x = extractDraft(EXAMPLE_SOURCE)
                setDraft({
                  ...x.draft,
                  title: src.noJdTitle || 'Senior Product Manager',
                  location: 'NYC',
                  workMode: 'Hybrid',
                })
                setSources({ title: 'EDITED', category: 'EDITED', location: 'EDITED', workMode: 'EDITED' })
                setBaseline(x.draft)
                setPhase('extracted')
              }}
            >
              Enter requirements manually
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="space-y-6 p-2 sm:p-4">
      {fromAiSetup && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-500/35 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-sky-500/10 px-3.5 py-2.5 text-xs">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>AI set up this role from your pasted context — verify details below, then start shortlisting candidates.</span>
          </span>
          <button
            type="button"
            onClick={() => switchEntryMode('ai')}
            className="font-mono text-[11px] text-violet-300 underline-offset-4 hover:underline"
          >
            ← Back to AI prompt
          </button>
        </div>
      )}

      <Field label={<Lbl src={sources.title}>Role title</Lbl>}>
        <Input value={d.title} onChange={e => set('title', e.target.value)} className="h-10 text-base font-semibold" />
        {!d.title && <NotCaptured />}
      </Field>

      {mode === 'edit' && <InfoNote>Changing requirements marks this role's matches out of date.</InfoNote>}

      {/* v0.4 · §7.1 / N22 Unified Requirements, Green flags & Red flags card */}
      <BezelCard
        icon={<ListChecks />}
        title={`Requirements, Green flags & Red flags (${reqs.length})`}
        description="Requirements rule a candidate out. Green flags raise the score. Red flags lower the score — but never rule a candidate out on their own, because strong requirements and green flags can outweigh a red flag."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="sm" icon={<Plus />} onClick={() => setAskDialog('type')}>
              Add manually
            </Button>
            <Button variant="chroma" size="sm" icon={<Sparkles />} onClick={() => setAskDialog('ai')}>
              Update with AI
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Category filter & summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/35 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `All (${reqs.length})` },
                  { id: 'eliminates', label: `Requirements · rules out (${elimCount})` },
                  { id: 'improves', label: `Green flags · raises score (${greenCount})` },
                  { id: 'red-flag', label: `Red flags · lowers score (${redCount})` },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReqFilter(tab.id)}
                  className={cn(
                    'inline-flex h-6 items-center rounded-lg border px-2.5 font-mono text-[10.5px] font-medium transition-colors cursor-pointer tnum',
                    reqFilter === tab.id
                      ? 'border-gray-1100 bg-card text-foreground shadow-2xs'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">Click Edit on any row to edit text directly</span>
          </div>

          {filteredReqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items in this category yet. Click Add manually or Update with AI above.</p>
          ) : (
            <div className="space-y-2">
              {filteredReqs.map(req => (
                <RequirementRow
                  key={req.id}
                  req={req}
                  onToggleEffect={eff => { app.toggleRequirementEffect(askRoleId, req.id, eff); setDirty(true) }}
                  onEdit={patch => { app.updateRequirement(askRoleId, req.id, patch); setDirty(true) }}
                  onRemove={() => { app.removeRequirement(askRoleId, req.id); setDirty(true) }}
                />
              ))}
            </div>
          )}

          {/* Stage 1 baseline fields sub-well so the live pass counter remains interactive */}
          <div className="space-y-4 rounded-xl border border-border bg-secondary/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="eyebrow text-[10px] text-gray-1000">Stage 1 baseline fields &amp; role criteria</span>
              <span className="font-mono text-[11px] text-muted-foreground tnum">
                ~{pass ?? 0} of {POOL_SIZE} pass Stage 1
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <Field label={<Lbl src={sources.category}>Category</Lbl>} right={!d.categoryConfirmed && d.category ? <SuggestedBadge /> : undefined}>
                <Select aria-label="Category" className="w-full" size="lg" value={d.category}
                  onChange={v => { setDraft(x => (x ? { ...x, category: v as Category, subcategory: v ? SUBCATEGORIES[v as Category][0] : '', categoryConfirmed: true } : x)); setSources(s => ({ ...s, category: 'EDITED', subcategory: 'EDITED' })); setDirty(true) }}
                  options={[{ value: '', label: 'Choose…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
                {!d.category && <NotCaptured />}
              </Field>
              <Field label={<Lbl src={sources.subcategory}>Sub-category</Lbl>} right={!d.categoryConfirmed && d.subcategory ? <SuggestedBadge /> : undefined}>
                <Select aria-label="Sub-category" className="w-full" size="lg" value={d.subcategory}
                  onChange={v => { setDraft(x => (x ? { ...x, subcategory: v, categoryConfirmed: true } : x)); setSources(s => ({ ...s, subcategory: 'EDITED' })); setDirty(true) }}
                  options={d.category ? SUBCATEGORIES[d.category] : [{ value: '', label: '—' }]} />
              </Field>
              <Field label={<Lbl src={sources.seniority}>Seniority</Lbl>}>
                <Select aria-label="Seniority" className="w-full" size="lg" value={d.seniority} onChange={v => set('seniority', v)}
                  options={['Junior', 'Mid', 'Mid–Senior', 'Senior', 'Lead', 'Manager']} />
              </Field>
              <Field label={<Lbl src={sources.industry}>Company industry</Lbl>}>
                <Select aria-label="Company industry" className="w-full" size="lg" value={d.industry} onChange={v => set('industry', v)}
                  options={COMPANY_INDUSTRIES.map(ind => ({ value: ind, label: ind }))} />
              </Field>
            </div>

            {/* Same-industry rule */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
              <div className="space-y-0.5">
                <span className="font-medium text-foreground">Same-industry rule ({d.industry})</span>
                <p className="text-[11px] text-muted-foreground">
                  Same industry is a Green flag by default (raises score), or a Requirement when mandatory (e.g. government contracts).
                </p>
              </div>
              <Segmented
                size="sm"
                aria-label="Same-industry rule"
                value={d.industryRule}
                onChange={v => set('industryRule', v)}
                options={[
                  { value: 'improves', label: 'Green flag (default)' },
                  { value: 'eliminates', label: 'Requirement (rules out)' },
                ]}
              />
            </div>

            {!d.categoryConfirmed && d.category && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-info/30 bg-info/5 px-3 py-2">
                <span className="text-xs text-foreground">Category and sub-category are suggested from the JD. Stage 1 uses Category as a Requirement.</span>
                <Button size="sm" onClick={() => { setDraft(x => (x ? { ...x, categoryConfirmed: true } : x)); setDirty(true) }}>Confirm</Button>
              </div>
            )}

            {/* Years of experience: Min, Max + Flexible / Rigid toggle */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">Years of experience</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] text-muted-foreground">Cushion:</span>
                  <Segmented
                    size="sm"
                    aria-label="Years of experience flexibility"
                    value={d.yearsFlexibility}
                    onChange={v => set('yearsFlexibility', v)}
                    options={[
                      { value: 'Flexible', label: 'Flexible (±1 yr)' },
                      { value: 'Rigid', label: 'Rigid (exact)' },
                    ]}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={<Lbl src={sources.minYears}>Min years</Lbl>}>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    suffix="yrs"
                    value={d.minYears ?? ''}
                    onChange={e => set('minYears', e.target.value === '' ? null : Number(e.target.value))}
                  />
                  {d.minYears === null && <NotCaptured />}
                </Field>
                <Field label={<Lbl src={sources.maxYears}>Max years</Lbl>}>
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    suffix="yrs"
                    value={d.maxYears ?? ''}
                    onChange={e => set('maxYears', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </Field>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground tnum">
                {d.yearsFlexibility === 'Flexible'
                  ? `Flexible adds 1 year of cushion at the top and bottom → passes ${Math.max(0, (d.minYears ?? 0) - 1)}–${(d.maxYears ?? (d.minYears ?? 0) + 4) + 1} yrs.`
                  : `Rigid enforces the exact range → passes ${d.minYears ?? 0}–${d.maxYears ?? (d.minYears ?? 0) + 4} yrs.`}
              </p>
            </div>

            {/* Location, Work mode & Relocation supported */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={<Lbl src={sources.location}>Location</Lbl>}>
                <Input ref={locationRef} list="hs-cities" placeholder="City or Remote (US)" value={d.location} onChange={e => set('location', e.target.value)} />
                <datalist id="hs-cities">{[...KNOWN_CITIES, 'Remote (US)'].map(c => <option key={c} value={c} />)}</datalist>
                {!d.location && <NotCaptured />}
              </Field>
              <Field label={<Lbl src={sources.workMode}>Work mode</Lbl>}>
                <div><Segmented aria-label="Work mode" size="sm" value={d.workMode} onChange={v => set('workMode', v)} options={['Remote', 'Hybrid', 'Onsite'] as (WorkMode | '')[]} /></div>
                {!d.workMode && <NotCaptured />}
              </Field>
              <Field label={<Lbl src={sources.relocationSupported}>Relocation supported</Lbl>}>
                <div>
                  <Segmented
                    aria-label="Relocation supported"
                    size="sm"
                    value={d.relocationSupported}
                    onChange={v => {
                      set('relocationSupported', v)
                      set('relocation', v === 'Yes' ? true : v === 'No' ? false : null)
                    }}
                    options={['Yes', 'No', 'Unknown'] as YesNo[]}
                  />
                </div>
              </Field>
            </div>

            {/* Visa checkbox list + Select all + Transfer/sponsorship support field */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-foreground">Visa types accepted</span>
                  <p className="text-[11px] text-muted-foreground">Select which visa types the company accepts, plus whether transfer or sponsorship is supported.</p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground cursor-pointer">
                  <Checkbox
                    aria-label="Select all visa types"
                    checked={d.acceptedVisas.length === ROLE_VISA_TYPES.length}
                    onChange={checked => set('acceptedVisas', checked ? [...ROLE_VISA_TYPES] : [])}
                  />
                  <span>Select all ({ROLE_VISA_TYPES.length})</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {ROLE_VISA_TYPES.map(visa => {
                  const checked = d.acceptedVisas.includes(visa)
                  return (
                    <label
                      key={visa}
                      className={cn(
                        'inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors cursor-pointer',
                        checked
                          ? 'border-gray-1100 bg-secondary text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Checkbox
                        aria-label={visa}
                        checked={checked}
                        onChange={on => {
                          const next = on
                            ? Array.from(new Set([...d.acceptedVisas, visa]))
                            : d.acceptedVisas.filter(v => v !== visa)
                          set('acceptedVisas', next)
                        }}
                      />
                      <span>{visa}</span>
                    </label>
                  )
                })}
              </div>

              <Field
                label={<Lbl src={sources.sponsorship}>Transfer or sponsorship support for selected visas</Lbl>}
                hint="Defines whether the company supports visa transfer, new sponsorship, or both for the selected visa types."
              >
                <Segmented
                  size="sm"
                  aria-label="Transfer or sponsorship support for selected visas"
                  value={d.visaSupport}
                  onChange={v => set('visaSupport', v)}
                  options={[
                    { value: 'Transfer & sponsorship', label: 'Transfer & sponsorship' },
                    { value: 'Transfer only', label: 'Transfer only' },
                    { value: 'Sponsorship offered', label: 'Sponsorship offered' },
                    { value: 'None', label: 'No support (US citizen / GC only)' },
                    { value: 'Unknown', label: 'Unknown' },
                  ]}
                />
              </Field>
            </div>
          </div>
        </div>
      </BezelCard>

      <BezelCard
        title="Pay range"
        description="Split into Fixed (min–max) and Variable. Stored as numbers (in $k) so they can be used directly as filters. US roles call variable OTE, but the label stays Variable."
      >
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={<Lbl src={sources.fixedPayMin}>Fixed min ($k)</Lbl>}>
              <Input
                type="number"
                min={0}
                max={1000}
                suffix="k"
                placeholder="170"
                value={d.fixedPayMin ?? ''}
                onChange={e => set('fixedPayMin', e.target.value === '' ? null : Number(e.target.value))}
              />
              {d.fixedPayMin === null && <NotCaptured />}
            </Field>
            <Field label={<Lbl src={sources.fixedPayMax}>Fixed max ($k)</Lbl>}>
              <Input
                type="number"
                min={0}
                max={1000}
                suffix="k"
                placeholder="190"
                value={d.fixedPayMax ?? ''}
                onChange={e => set('fixedPayMax', e.target.value === '' ? null : Number(e.target.value))}
              />
              {d.fixedPayMax === null && <NotCaptured />}
            </Field>
            <Field label={<Lbl src={sources.variablePay}>Variable ($k)</Lbl>} hint="US roles call variable OTE; label stays Variable">
              <Input
                type="number"
                min={0}
                max={1000}
                suffix="k"
                placeholder="25"
                value={d.variablePay ?? ''}
                onChange={e => set('variablePay', e.target.value === '' ? null : Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 font-mono text-xs tnum">
            <span className="text-muted-foreground">Formatted compensation summary:</span>
            <span className="font-semibold text-foreground">
              Fixed: {d.fixedPayMin != null && d.fixedPayMax != null ? `$${d.fixedPayMin}k–$${d.fixedPayMax}k` : 'Not captured'}
              {' · '}
              Variable: {d.variablePay != null ? `$${d.variablePay}k` : '$0k'}
              {d.fixedPayMax != null && d.variablePay != null && ` (Total target up to $${d.fixedPayMax + d.variablePay}k)`}
            </span>
          </div>
        </div>
      </BezelCard>

      <BezelCard title="What good looks like &amp; context">
        <div className="space-y-4">
          <Field label={<Lbl src={sources.whatGood}>What good looks like · past good and bad hires</Lbl>}>
            <Textarea placeholder="From the client call…" value={d.whatGood} onChange={e => set('whatGood', e.target.value)} />
            {!d.whatGood && <NotCaptured />}
          </Field>
          <Field
            label={
              <span className="inline-flex flex-wrap items-center gap-2">
                <Lbl src={sources.interview}>Interview process</Lbl>
                <span className="eyebrow rounded border border-border bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">Context only</span>
              </span>
            }
            hint="Kept for recruiter & candidate prep context only — never rules out or changes a score."
          >
            <Textarea placeholder="Recruiter screen → HM → …" value={d.interview} onChange={e => set('interview', e.target.value)} />
            {!d.interview && <NotCaptured />}
          </Field>
        </div>
      </BezelCard>
    </div>
  )

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div aria-live="polite" className="min-w-0 text-sm">
        {pass === null ? (
          <span className="text-muted-foreground">Extract role details to see how many candidates pass.</span>
        ) : pass === 0 ? (
          <span className="flex flex-wrap items-center gap-1.5 text-[#b45309]">
            <AlertTriangle className="size-4 text-warning" /><span className="font-mono tnum">0</span> pass. Location removes the most (180).
            <Button variant="link" className="text-xs text-[#b45309]" onClick={() => locationRef.current?.focus()}>Review location</Button>
          </span>
        ) : (
          <span className="text-muted-foreground">~<span className="font-mono font-medium text-foreground tnum">{pass}</span> of <span className="font-mono tnum">{POOL_SIZE}</span> candidates pass Stage 1 eliminators</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline tnum">
          Stage 1 + {app.autoSuggestCount} AI suggestions
        </span>
        <Button variant="ghost" onClick={cancel}>Cancel</Button>
        <Button variant="outline" disabled={!draft} onClick={() => save(false)}>Save role</Button>
        <Button variant="chroma" disabled={!draft} icon={<Sparkles />} onClick={startShortlistWithAi}>
          Shortlist candidates with AI
        </Button>
      </div>
    </div>
  )

  const activeShortlistStep = isPinnedShortlistRunning ? 2 : shortlistStepper.step

  const topModeBar = (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-background px-6 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-foreground">
          {mode === 'new' ? 'New role' : (role?.title ?? 'Role setup')}
        </span>
        {role && (
          <span className="font-mono text-xs text-muted-foreground">
            {role.company}
          </span>
        )}
        <ExampleMark />
      </div>

      {/* Top Pill Switcher: Find with AI (default) | Manual — geometrically centered */}
      <div role="tablist" aria-label="Role setup mode" className="inline-flex items-center gap-1 rounded-2xl border border-border bg-gray-100 p-1">
        <button
          type="button"
          role="tab"
          aria-selected={entryMode === 'ai'}
          onClick={() => switchEntryMode('ai')}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-xl px-3.5 text-xs btn-type transition-all cursor-pointer',
            entryMode === 'ai'
              ? 'border border-violet-500/40 bg-card text-foreground shadow-2xs'
              : 'border border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Sparkles className="size-3.5 text-violet-400" />
          <span>Find with AI</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={entryMode === 'manual'}
          onClick={() => {
            if (!draft) {
              const x = extractDraft(src.jdText ? src : EXAMPLE_SOURCE)
              if (!src.jdText) setSrc(EXAMPLE_SOURCE)
              setDraft(x.draft)
              setSources(x.sources)
              setBaseline(x.draft)
              setPhase('extracted')
            }
            switchEntryMode('manual')
          }}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-xl px-3.5 text-xs btn-type transition-all cursor-pointer',
            entryMode === 'manual'
              ? 'border border-border bg-card text-foreground shadow-2xs'
              : 'border border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          <span>Manual</span>
        </button>
      </div>

      <div className="flex items-center justify-end gap-2">
        {entryMode === 'ai' && draft && (
          <Button variant="outline" size="sm" onClick={() => switchEntryMode('manual')}>
            Review role setup →
          </Button>
        )}
        {role && (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/roles/${role.id}?tab=matches`)}>
            View matches
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {topModeBar}

      {entryMode === 'ai' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          {aiProcessing ? (
            <div className="mx-auto flex h-full max-w-[640px] flex-col items-center justify-center">
              <AIStepper
                title="Setting up role & preparing candidate shortlist"
                steps={STEPS}
                current={wf === 'ai-extracting' ? 2 : aiStepper.step}
              />
            </div>
          ) : (
            <div className="anim-fade mx-auto flex min-h-full w-full max-w-[1000px] flex-col justify-center space-y-6 py-4">
              {/* Calm Centered Emblem & Title (24px section rhythm) */}
              <header className="flex flex-col items-center space-y-3 text-center">
                <div className="relative flex size-12 items-center justify-center rounded-2xl border border-violet-500/35 bg-gradient-to-b from-violet-500/15 to-transparent p-1 shadow-custom">
                  <div className="flex size-full items-center justify-center rounded-xl border border-border bg-card">
                    <Sparkles className="size-5 text-violet-400" />
                  </div>
                  <span className="anim-glow absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-violet-400" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="title-type text-xl text-foreground">
                    Paste all role data — AI sets up the rest
                  </h2>
                  <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                    Copy-paste the job description, company details, Fathom call link, or client intake notes in one box — or upload a JD file. AI structures the role and prepares your candidate shortlist.
                  </p>
                </div>
              </header>

              {/* Wide SaaS Double-Bezel Composer (1000px max-w, 16px outer radius -> 4px inset -> 12px inner radius, 24px inner well padding) */}
              <section className="rounded-2xl border border-border bg-gray-100 shadow-custom transition-all duration-200">
                {/* Outer Bezel Header Bar: px-5 py-3 */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-1100">
                    <Sparkles className="size-3.5 text-violet-400" />
                    <span>AI Role Intake · Extracts company, requirements, Fathom call context &amp; Stage 1 eliminators</span>
                    {(aiRawText.trim() || aiFileName) && (
                      <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                        <Check className="size-2.5 text-emerald-400" />
                        <span>Context loaded</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!draft) {
                          const x = extractDraft(src.jdText ? src : EXAMPLE_SOURCE)
                          if (!src.jdText) setSrc(EXAMPLE_SOURCE)
                          setDraft(x.draft)
                          setSources(x.sources)
                          setBaseline(x.draft)
                          setPhase('extracted')
                        }
                        switchEntryMode('manual')
                      }}
                      className="inline-flex items-center gap-1 font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline cursor-pointer"
                    >
                      <span>Manual setup</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Inner Well: mx-1.5 mb-1.5 rounded-xl border border-border bg-card p-6 */}
                <div className="mx-1.5 mb-1.5 rounded-xl border border-border bg-card p-6 transition-colors focus-within:border-gray-800">
                  <div className="relative">
                    <textarea
                      aria-label="Paste role JD, company info, and Fathom call notes"
                      autoFocus
                      rows={8}
                      value={aiRawText}
                      onChange={e => setAiRawText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          runAiRoleSetup()
                        }
                      }}
                      placeholder="Paste everything here — job description, company name, hiring contact, Fathom call link, compensation, or raw intake notes…"
                      className="min-h-[200px] w-full resize-none bg-transparent pr-8 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    {aiRawText && (
                      <button
                        type="button"
                        aria-label="Clear text"
                        onClick={() => setAiRawText('')}
                        className="absolute top-0 right-0 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Attached file / Fathom call pills */}
                  {(aiFileName || aiCallUrl || showCallInput) && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3.5">
                      {aiFileName && (
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 text-xs text-foreground">
                          <FileText className="size-3.5 text-violet-400" />
                          <span>{aiFileName}</span>
                          <button type="button" onClick={() => setAiFileName('')} className="text-muted-foreground hover:text-foreground">
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      {aiCallUrl && !showCallInput && (
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 text-xs text-foreground">
                          <FileAudio className="size-3.5 text-emerald-400" />
                          <span className="max-w-[340px] truncate">{aiCallUrl}</span>
                          <span className="eyebrow text-[9px] text-muted-foreground">OPTIONAL · CALL</span>
                          <button type="button" onClick={() => setAiCallUrl('')} className="text-muted-foreground hover:text-foreground">
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      {showCallInput && (
                        <div className="flex flex-1 items-center gap-2">
                          <FileAudio className="size-3.5 shrink-0 text-emerald-400" />
                          <Input
                            placeholder="Paste Fathom or Granola call link (optional continuous context)…"
                            value={aiCallUrl}
                            onChange={e => setAiCallUrl(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Button size="sm" variant="outline" onClick={() => setShowCallInput(false)}>Attach</Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hidden file input for native file upload feel */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      setAiFileName(f ? f.name : 'Northwind-Pay-Senior-PM.pdf')
                      if (!aiRawText.trim()) setAiRawText(AI_DEFAULT_PROMPT)
                    }}
                  />

                  {/* Bottom Toolbar inside ChatGPT/Claude Composer */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAiFileName('Northwind-Pay-Senior-PM.pdf')
                          if (!aiRawText.trim()) setAiRawText(AI_DEFAULT_PROMPT)
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-2xl border border-border bg-secondary px-3 text-xs btn-type text-foreground transition-colors hover:bg-muted cursor-pointer"
                      >
                        <Upload className="size-3.5 text-muted-foreground" />
                        <span>Upload JD file</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCallInput(v => !v)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-2xl border border-border bg-secondary px-3 text-xs btn-type text-foreground transition-colors hover:bg-muted cursor-pointer"
                      >
                        <FileAudio className="size-3.5 text-emerald-400" />
                        <span>{aiCallUrl ? 'Edit Fathom link' : '+ Fathom call link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiRawText(AI_DEFAULT_PROMPT)
                          setAiFileName('Northwind-Pay-Senior-PM.pdf')
                          setAiCallUrl('https://fathom.video/share/northwind-pay-intake')
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-2xl border border-border/60 bg-background px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <span>Paste example role</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                        <Kbd>⌘↵</Kbd>
                      </span>
                      <Button
                        variant="chroma"
                        icon={<Sparkles />}
                        onClick={runAiRoleSetup}
                      >
                        Set up role with AI
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      ) : shortlistPhase === 'running' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="anim-fade mx-auto flex h-full max-w-[640px] flex-col items-center justify-center">
            <AIStepper
              title={`Shortlisting candidates with AI for ${d?.title || role?.title || 'Senior Product Manager'}`}
              steps={SHORTLIST_STEPS}
              current={activeShortlistStep}
            />
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  if (wf === 'shortlist-running') setWf('live')
                  setShortlistPhase('failed')
                }}
                className="font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline cursor-pointer"
              >
                Simulate failure
              </button>
              <span className="text-border">·</span>
              <button
                type="button"
                onClick={() => { setShortlistPhase('idle'); save(true) }}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline cursor-pointer"
              >
                <span>Skip</span>
                <ArrowRight className="size-3" />
              </button>
            </div>
          </div>
        </div>
      ) : shortlistPhase === 'failed' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="anim-fade mx-auto flex h-full max-w-[520px] flex-col items-center justify-center gap-5 px-6 py-16 text-center">
            <div className="h-0.5 w-40 overflow-hidden rounded-full bg-warning/40" />
            <div className="space-y-1.5">
              <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="size-4 text-warning" />
                <span>Couldn’t finish shortlisting candidates right now</span>
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your role setup and Stage 1 eliminators (~{pass ?? 27} of {POOL_SIZE} pass) are saved. Retry shortlisting with AI or return to role setup.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  if (wf === 'shortlist-failed') setWf('live')
                  setShortlistPhase('idle')
                }}
              >
                ← Back to role setup
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (wf === 'shortlist-failed') setWf('live')
                  setShortlistPhase('idle')
                  save(false)
                }}
              >
                Open Stage 1 matches
              </Button>
              <Button
                variant="chroma"
                icon={<RefreshCw />}
                onClick={() => {
                  if (wf === 'shortlist-failed') setWf('live')
                  setShortlistPhase('running')
                }}
              >
                Retry with AI
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <SplitPane
            leftTitle={<span className="flex items-center gap-2">Source <ExampleMark /></span>}
            rightTitle={<span className="flex items-center gap-2">Role details{phase === 'extracted' && d && <span className="font-mono text-[10px] text-gray-1000">{elimCount} req · {greenCount} green · {redCount} red</span>}</span>}
            left={left}
            right={right}
            footer={footer}
          />
        </div>
      )}

      <LeaveDialog open={leaveOpen} onClose={() => setLeaveOpen(false)} onLeave={() => { setLeaveOpen(false); navigate(role ? `/roles/${role.id}` : '/roles') }} />
      <ProposedChangesDialog open={revisedOpen} onClose={() => { setRevisedOpen(false); if (wf === 'revised') setWf('live') }}
        changes={jdChangesNorthwind} onApply={applyRevised}
        subtitle={`From the revised JD you pasted (will become JD v${(role?.jdVersion ?? 1) + 1}). Accepted changes are logged and mark matches out of date.`} />
      <AddRequirementDialog open={!!askDialog} onClose={() => setAskDialog(null)} roleId={askRoleId} initialMode={askDialog ?? 'type'} />
    </div>
  )
}
