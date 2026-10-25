import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, SlidersHorizontal, Copy, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Search, FileText, Users, X, Check,
  EyeOff, Eye, Smartphone, MapPin, Clock, Star, ShieldCheck, DollarSign, Calendar, Sparkles, ExternalLink, Briefcase, Info,
  RotateCcw, ArrowRight, ArrowUp, ArrowDown, ArrowUpRight, Layers, Filter, CheckCircle2, Loader2, Terminal,
  Code2, CreditCard, TrendingUp, PhoneCall, HelpCircle, Compass, Bot, Wand2, PanelRightOpen, Shield,
} from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import { Avatar, Button, Checkbox, EmptyState, ExampleMark, Input, Kbd, Menu, Segmented, Select, Switch, Tag, cn } from '../components/ui'
import { CompletenessMeter, DataTable, Dialog, FilterChip, MatchChipView, NotCaptured, OverviewGrid, workAuthShort, type Column } from '../components/hs'
import {
  ColumnsMenu, FilterBar, FilterPicker, GatedButton, SelectionBar, TakeMarker, applyFilters, useColumnPrefs,
  type ColumnOption, type FilterField, type FilterState, type FilterValue,
} from '../components/v3'
import { BulkMaskForRoleDialog } from '../components/BulkMaskModal'
import { CandidatePreview } from './CandidatePreview'
import { useApp, useWireframeState, whoCanText } from '../store/AppStore'
import { POOL_SIZE, candidates as SEED_CANDIDATES } from '../data/mock'
import { CATEGORIES, SUBCATEGORIES, type Candidate, type Category, type WorkMode } from '../data/types'

/* ==========================================================================
   S-05 · Candidates — Full AI Scout + Manual Filter Console + Sheets FilterBar
   Combines:
   - V02 3-Stage AI Scout (?screen=ai: Home + 4 Starter Blocks → Animated Stepper → 3/4 Table + 1/4 AI Copilot Chat)
   - V02 11-Dimension Structured Filter Console & Master–Detail Split View (CandidateSplitView)
   - V02 Slide-Over CandidatePreview Sidebar (opens on row click / Preview button / Space)
   - V03/V04 Sheets-style FilterBar (OR inside column + repeated-column OR, AND across columns),
     ColumnsMenu (N18), Column-header Sort/Filter/Hide menu, SelectionBar (N16), Resumes & Take columns.
   ========================================================================== */

const WF_STATES = [
  { id: 'live', label: '✦ AI Scout · Stage 1 (Home)' },
  { id: 'ai-processing', label: '✦ AI Scout · Stage 2 (Processing)' },
  { id: 'ai-results', label: '✦ AI Scout · Stage 3 (3/4 Table + 1/4 Chat)' },
  { id: 'manual', label: 'Screen 2 · Manual Filters & Pool' },
  { id: 'split', label: 'Manual · Split Detail View' },
  { id: 'preview-open', label: 'Slide-over Sidebar Open (S-08)' },
  { id: 'several', label: 'Sheets Filters (Visa + Experience + Domain)' },
  { id: 'marketing', label: 'Manual · Marketing active' },
  { id: 'more', label: 'Manual · Popover open' },
  { id: 'bulk', label: 'Manual · Bulk selection' },
  { id: 'columns', label: 'Columns menu open' },
  { id: 'noresults', label: 'Manual · No results' },
  { id: 'empty', label: 'Empty pool' },
  { id: 'loading', label: 'Loading' },
  { id: 'phone', label: 'Phone' },
]

const MASKED_BATCH_CAP = 25

/** Pool-scale counts per category (sums to 412) so the live count reads at real scale. */
const POOL_BY_CATEGORY: Record<Category, number> = {
  Engineering: 120,
  Product: 64,
  Marketing: 38,
  Design: 41,
  Data: 47,
  Sales: 52,
  Ops: 50,
}

const POPULAR_SKILLS = [
  'Payments',
  'SQL',
  'B2B SaaS',
  'React',
  'Node.js',
  'TypeScript',
  'Meta Ads',
  'Google Ads',
  'LinkedIn Ads',
  'Python',
  'dbt',
  'Figma',
]

/* ---------- Columns (N18) — Consolidated to 5 High-Signal SaaS Columns by Default ---------- */
const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'name', label: 'Candidate & Resume', locked: true },
  { key: 'cat', label: 'Function & Seniority' },
  { key: 'loc', label: 'Location & Work Auth' },
  { key: 'skills', label: 'Skills & ◇ AI Graph' },
  { key: 'comp', label: 'Profile & Take' },
  { key: 'years', label: 'Exp · Pay (separate)' },
  { key: 'auth', label: 'Work Auth (separate)' },
  { key: 'domain', label: 'Domain' },
  { key: 'resumes', label: 'Resumes' },
  { key: 'take', label: 'Our take (separate)' },
  { key: 'availability', label: 'Availability' },
  { key: 'source', label: 'Source' },
]
const DEFAULT_COLUMNS = ['name', 'cat', 'loc', 'skills']

const COLUMN_FILTER: Record<string, string | undefined> = {
  cat: 'category',
  years: 'years',
  loc: 'metro',
  auth: 'auth',
  skills: 'skills',
  comp: 'completeness',
  domain: 'domain',
  resumes: 'resumeLabel',
  availability: 'availability',
  source: 'source',
}

type AuthOpt = 'US citizen' | 'Green card' | 'OPT' | 'STEM OPT' | 'H-1B'
export interface More {
  metro: string
  relocate: 'Any' | 'Yes' | 'No' | 'Specific'
  modes: WorkMode[]
  auth: AuthOpt[]
  sponsorship: 'Any' | 'Yes' | 'No'
  yearsMin: string
  yearsMax: string
  search: 'Any' | 'Active' | 'Passive'
  completeness: 'Any' | 'lt50' | '50to79' | 'gte80'
  skills: string[]
  includePredicted: boolean
  payMax: 'Any' | '160' | '185' | '205' | '225'
  availability: 'Any' | 'Immediate' | '2weeks' | '1month'
  companyStage: 'Any' | 'Seed-SeriesB' | 'Growth' | 'Enterprise'
}

const MORE_DEFAULT: More = {
  metro: 'Any',
  relocate: 'Any',
  modes: [],
  auth: [],
  sponsorship: 'Any',
  yearsMin: '',
  yearsMax: '',
  search: 'Any',
  completeness: 'Any',
  skills: [],
  includePredicted: true,
  payMax: 'Any',
  availability: 'Any',
  companyStage: 'Any',
}

function parsePayFloorK(pay: string | null): number | null {
  if (!pay) return null
  const m = pay.match(/\$?(\d+(?:\.\d+)?)\s*k/i)
  return m ? Number(m[1]) : null
}

function authValue(c: Candidate): string | null {
  const w = c.workAuth
  if (!w.status) return null
  return w.status === 'Visa' ? (w.visaType ?? 'Visa') : w.status
}

function yesNo(c: Candidate, k: 'needsSponsorship' | 'needsTransfer'): string | null {
  const w = c.workAuth
  if (w.status === 'US citizen' || w.status === 'Green card') return 'No'
  const v = w[k]
  return v === true ? 'Yes' : v === false ? 'No' : null
}

function blankFilter<T>(f: FilterField<T>, rows: T[]): FilterValue {
  if (f.kind === 'number') {
    const nums = rows.map(r => f.num?.(r)).filter((n): n is number => n != null)
    return { kind: 'number', op: 'gte', a: nums.length ? Math.round(Math.min(...nums)) : 0, includeMissing: true }
  }
  if (f.kind === 'multi') return { kind: 'multi', values: [], mode: 'any', includeMissing: true }
  return { kind: 'values', values: [], includeMissing: true }
}
const isEmptyFilter = (v: FilterValue) => v.kind !== 'number' && v.values.length === 0 && v.includeMissing

function matchesAvailability(avail: string | null, filter: More['availability']): boolean {
  if (filter === 'Any' || !avail) return true
  const s = avail.toLowerCase()
  if (filter === 'Immediate') return s.includes('immediate')
  if (filter === '2weeks') return s.includes('immediate') || s.includes('2 week')
  if (filter === '1month') return s.includes('immediate') || s.includes('2 week') || s.includes('month') || s.includes('30 day')
  return true
}

function matchesStage(c: Candidate, stage: More['companyStage']): boolean {
  if (stage === 'Any') return true
  const blob = `${(c.companyPrefs ?? []).join(' ')} ${c.companies.map(x => x.descriptor).join(' ')}`.toLowerCase()
  if (!blob.trim()) return true
  if (stage === 'Seed-SeriesB') return blob.includes('seed') || blob.includes('series a') || blob.includes('series b') || blob.includes('50–300')
  if (stage === 'Growth') return blob.includes('series b') || blob.includes('series c') || blob.includes('series d') || blob.includes('growth')
  if (stage === 'Enterprise') return blob.includes('public') || blob.includes('global') || blob.includes('enterprise') || blob.includes('series d')
  return true
}

/** Each active filter dimension → predicate. Missing values pass (P3: never hide anyone). */
function moreChecks(m: More): { label: string; test: (c: Candidate) => boolean }[] {
  const out: { label: string; test: (c: Candidate) => boolean }[] = []
  if (m.metro !== 'Any') out.push({ label: `Location (${m.metro})`, test: c => !c.metro || c.metro === m.metro })
  if (m.relocate !== 'Any') out.push({ label: `Open to relocate (${m.relocate})`, test: c => c.relocate === null || c.relocate === m.relocate })
  if (m.modes.length) out.push({ label: `Work mode (${m.modes.join(', ')})`, test: c => !c.workModes || c.workModes.some(x => m.modes.includes(x)) })
  if (m.auth.length) out.push({
    label: `Work authorization (${m.auth.join(', ')})`,
    test: c => !c.workAuth.status || m.auth.some(a => (a === 'US citizen' || a === 'Green card') ? c.workAuth.status === a : c.workAuth.visaType === a),
  })
  if (m.sponsorship !== 'Any') out.push({ label: `Needs sponsorship (${m.sponsorship})`, test: c => c.workAuth.needsSponsorship == null || c.workAuth.needsSponsorship === (m.sponsorship === 'Yes') })
  if (m.yearsMin || m.yearsMax) out.push({
    label: `Years (${m.yearsMin || 0}–${m.yearsMax || 'any'})`,
    test: c => c.years === null || ((!m.yearsMin || c.years >= Number(m.yearsMin)) && (!m.yearsMax || c.years <= Number(m.yearsMax))),
  })
  if (m.search !== 'Any') out.push({ label: `Search status (${m.search})`, test: c => !c.searchStatus || c.searchStatus === m.search })
  if (m.completeness !== 'Any') out.push({
    label: `Completeness (${m.completeness === 'gte80' ? '80%+' : m.completeness === '50to79' ? '50–79%' : '<50%'})`,
    test: c => m.completeness === 'lt50' ? c.completeness < 50 : m.completeness === '50to79' ? c.completeness >= 50 && c.completeness < 80 : c.completeness >= 80,
  })
  if (m.skills.length) out.push({
    label: `Skills (${m.skills.join(' + ')}${m.includePredicted ? ' incl. ◇ predicted' : ''})`,
    test: c => {
      const explicit = [
        ...c.skills,
        c.subcategory,
        c.headline,
        ...(c.companyPrefs ?? []),
        ...(c.domains ?? []),
      ].map(s => s.toLowerCase())
      const pred = m.includePredicted ? c.predicted.map(p => p.name.toLowerCase()) : []
      const all = [...explicit, ...pred]
      return m.skills.every(sk => all.some(a => a.includes(sk.toLowerCase())))
    },
  })
  if (m.payMax !== 'Any') out.push({
    label: `Target pay (≤ $${m.payMax}k)`,
    test: c => {
      const floor = parsePayFloorK(c.pay)
      return floor === null || floor <= Number(m.payMax)
    },
  })
  if (m.availability !== 'Any') out.push({
    label: `Availability (${m.availability === '2weeks' ? '≤ 2 wks' : m.availability === '1month' ? '≤ 1 mo' : 'Immediate'})`,
    test: c => matchesAvailability(c.availability, m.availability),
  })
  if (m.companyStage !== 'Any') out.push({
    label: `Stage (${m.companyStage})`,
    test: c => matchesStage(c, m.companyStage),
  })
  return out
}

/* ---------- 4 Individual Starter Blocks (Zero Cognitive Bias, Monochrome + Icons) ---------- */
interface StarterBlock {
  id: string
  title: string
  meta: string
  subtitle: string
  prompt: string
  icon: 'code' | 'card' | 'trend' | 'phone'
  cats: Category[]
  subs: string[]
  more: Partial<More>
}

const STARTER_BLOCKS: StarterBlock[] = [
  {
    id: 'hire-dev',
    title: 'Hire a software developer',
    meta: '120 in pool',
    subtitle: '5+ yrs · React, Node.js & TypeScript · Remote or Hybrid',
    prompt: 'Find senior full-stack software developers with 5+ years of experience in React, Node.js, and TypeScript who are open to remote or hybrid work.',
    icon: 'code',
    cats: ['Engineering'],
    subs: [],
    more: {
      yearsMin: '5',
      modes: ['Remote', 'Hybrid'],
      includePredicted: true,
    },
  },
  {
    id: 'fintech-pm',
    title: 'Find a fintech product manager',
    meta: '64 in pool',
    subtitle: '5+ yrs · B2B SaaS & Payments · Hybrid or Remote',
    prompt: 'Find Senior Product Managers with 5+ years in B2B SaaS or payments, open to hybrid or remote work, and include adjacent SQL skills.',
    icon: 'card',
    cats: ['Product'],
    subs: [],
    more: {
      yearsMin: '5',
      modes: ['Hybrid', 'Remote'],
      includePredicted: true,
    },
  },
  {
    id: 'growth-mktg',
    title: 'Shortlist growth marketers',
    meta: '38 in pool',
    subtitle: '5+ yrs · Paid acquisition & lifecycle · B2B SaaS',
    prompt: 'Scout B2B SaaS growth and demand generation marketers with 5+ years in Meta Ads, Google Ads, or LinkedIn Ads.',
    icon: 'trend',
    cats: ['Marketing'],
    subs: [],
    more: {
      yearsMin: '5',
      includePredicted: true,
    },
  },
  {
    id: 'call-audit',
    title: 'Audit incomplete profiles',
    meta: '9 profiles',
    subtitle: 'Profiles under 80% completeness · Missing relocation or pay',
    prompt: 'Show candidates under 80% profile completeness who are missing relocation or target pay so we can verify on a quick intake call.',
    icon: 'phone',
    cats: [],
    subs: [],
    more: {
      completeness: '50to79',
      includePredicted: true,
    },
  },
]

function StarterBlockIcon({ kind }: { kind: StarterBlock['icon'] }) {
  if (kind === 'code') return <Code2 className="size-3.5 text-gray-1100" />
  if (kind === 'card') return <CreditCard className="size-3.5 text-gray-1100" />
  if (kind === 'trend') return <TrendingUp className="size-3.5 text-gray-1100" />
  return <PhoneCall className="size-3.5 text-gray-1100" />
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string
  appliedLabels?: string[]
  suggestions?: { label: string; prompt: string; icon: 'shield' | 'clock' | 'dollar' | 'sparkle' }[]
}

/* ---------- Copy list formats (F-07) ---------- */
function maskedLine(c: Candidate) {
  const title = c.headline.split(' · ')[0]
  const industry = c.domains?.[0] ?? c.companyPrefs?.[0] ?? c.companies[0]?.descriptor.split(',')[0].replace(/^(Series [A-D]|Public|Seed-stage|Global)\s+/i, '') ?? null
  const mode = c.workModes ? (c.workModes.includes('Hybrid') ? 'hybrid' : c.workModes[0].toLowerCase()) : null
  const loc = c.metro ? `${c.metro}${mode ? ` (${mode})` : ''}` : 'Location not captured'
  const skills = c.skills.length ? `${c.skills.slice(0, 2).join(' + ')}${c.skills[2] ? `, ${c.skills[2].toLowerCase()}` : ''}` : c.subcategory
  return [title, c.years !== null ? `${c.years} yrs` : 'Years not captured', industry, loc, workAuthShort(c.workAuth) ?? 'Work auth not captured', skills].filter(Boolean).join(' · ')
}
function fullLine(c: Candidate) {
  return `${c.name} — ${maskedLine(c)}${c.email ? ` · ${c.email}` : ''}`
}

/** Parse a natural-language prompt or follow-up into structured filters */
function parsePromptToFilters(
  text: string,
  prevCats: Category[],
  prevSubs: string[],
  prevMore: More,
  isFollowUp: boolean,
): {
  cats: Category[]
  subs: string[]
  more: More
  labels: string[]
  replyText: string
} {
  const low = text.toLowerCase()
  const cats: Category[] = isFollowUp ? [...prevCats] : []
  const subs: string[] = isFollowUp ? [...prevSubs] : []
  const more: More = isFollowUp ? { ...prevMore } : { ...MORE_DEFAULT, includePredicted: prevMore.includePredicted }

  const addCat = (c: Category) => { if (!cats.includes(c)) cats.push(c) }
  if (low.includes('developer') || low.includes('engineer') || low.includes('full-stack') || low.includes('fullstack') || low.includes('backend') || low.includes('frontend') || low.includes('react')) {
    if (!isFollowUp) cats.length = 0
    addCat('Engineering')
  }
  if (low.includes('product manager') || low.includes(' pm') || low.startsWith('pm ') || low.includes('fintech')) {
    if (!isFollowUp && !cats.length) addCat('Product')
    else if (low.includes('product')) addCat('Product')
  }
  if (low.includes('market') || low.includes('growth') || low.includes('demand')) {
    addCat('Marketing')
  }
  if (low.includes('data') || low.includes('analytics') || low.includes('dbt')) addCat('Data')
  if (low.includes('design') || low.includes('figma')) addCat('Design')
  if (low.includes('sales') || low.includes('account executive')) addCat('Sales')
  if (low.includes('ops') || low.includes('operations')) addCat('Ops')

  if (low.includes('nyc') || low.includes('new york')) more.metro = 'NYC'
  else if (low.includes('sf') || low.includes('san francisco') || low.includes('bay area')) more.metro = 'SF Bay Area'
  else if (low.includes('austin')) more.metro = 'Austin'
  else if (low.includes('seattle')) more.metro = 'Seattle'
  else if (low.includes('any location') || low.includes('clear location')) more.metro = 'Any'

  const modes: WorkMode[] = isFollowUp ? [...more.modes] : []
  if (low.includes('remote') && !modes.includes('Remote')) modes.push('Remote')
  if (low.includes('hybrid') && !modes.includes('Hybrid')) modes.push('Hybrid')
  if ((low.includes('onsite') || low.includes('on-site')) && !modes.includes('Onsite')) modes.push('Onsite')
  more.modes = modes

  const yrsMatch = low.match(/(\d+)\+?\s*(?:yrs|years|yr)/)
  if (yrsMatch) more.yearsMin = yrsMatch[1]

  const payMatch = low.match(/\$(\d{3})k/)
  if (payMatch) {
    const n = Number(payMatch[1])
    if (n <= 165) more.payMax = '160'
    else if (n <= 190) more.payMax = '185'
    else if (n <= 210) more.payMax = '205'
    else more.payMax = '225'
  }

  const matchedSkills = POPULAR_SKILLS.filter(s => low.includes(s.toLowerCase()))
  if (matchedSkills.length && isFollowUp) {
    const nextSkills = [...more.skills]
    matchedSkills.forEach(s => { if (!nextSkills.includes(s)) nextSkills.push(s) })
    more.skills = nextSkills
  }

  const auths: AuthOpt[] = isFollowUp ? [...more.auth] : []
  if ((low.includes('citizen') || low.includes('us citizen')) && !auths.includes('US citizen')) auths.push('US citizen')
  if ((low.includes('green card') || low.includes('gc')) && !auths.includes('Green card')) auths.push('Green card')
  if ((low.includes('h-1b') || low.includes('h1b')) && !auths.includes('H-1B')) auths.push('H-1B')
  if (low.includes('stem opt') && !auths.includes('STEM OPT')) auths.push('STEM OPT')
  more.auth = auths

  if (low.includes('no sponsor')) more.sponsorship = 'No'
  if (low.includes('active')) more.search = 'Active'
  if (low.includes('immediate')) more.availability = 'Immediate'
  if (low.includes('under 80') || low.includes('incomplete') || low.includes('missing')) more.completeness = '50to79'
  else if (low.includes('80%')) more.completeness = 'gte80'

  const labels: string[] = []
  if (cats.length) labels.push(`Function: ${cats.join(', ')}`)
  if (subs.length) labels.push(`Specialty: ${subs.join(', ')}`)
  if (more.yearsMin) labels.push(`Must-have: ${more.yearsMin}+ yrs`)
  if (more.metro !== 'Any') labels.push(`Location: ${more.metro}`)
  if (more.modes.length) labels.push(`Mode: ${more.modes.join('/')}`)
  if (more.skills.length) labels.push(`Skills: ${more.skills.join(', ')}`)
  if (more.auth.length) labels.push(`Auth: ${more.auth.join(', ')}`)
  if (more.sponsorship !== 'Any') labels.push(`Sponsorship: ${more.sponsorship}`)
  if (more.payMax !== 'Any') labels.push(`Pay cap: ≤ $${more.payMax}k`)
  if (more.completeness !== 'Any') labels.push(`Completeness: ${more.completeness === '50to79' ? '50–79%' : more.completeness === 'gte80' ? '80%+' : '<50%'}`)

  const replyText = labels.length
    ? `Translated your prompt into ${labels.length} must-have filters and ranked matching candidates by evidence. Missing fields pass as Assumed (P3) so you can verify them on the next call.`
    : `Scanned all 412 profiles across resumes, intake notes, and adjacent skills.`

  return { cats, subs, more, labels, replyText }
}

export function CandidatesList() {
  const app = useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [wf] = useWireframeState('S-05', 'Candidates', WF_STATES, 'live')

  // Screen mode: 'ai' (Screen 1: 3-stage AI flow) | 'manual' (Screen 2: Structured Filter Console + Sheets FilterBar + Table)
  const initialScreen = searchParams.get('screen') === 'manual' ? 'manual' : 'ai'
  const [screenMode, setScreenMode] = useState<'ai' | 'manual'>(initialScreen)

  // AI Flow Stage: 'home' (Stage 1) -> 'processing' (Stage 2) -> 'results' (Stage 3: 3/4 table + 1/4 chat)
  const initialStage =
    searchParams.get('stage') === 'processing'
      ? 'processing'
      : searchParams.get('stage') === 'results' || searchParams.get('run') === '1'
        ? 'results'
        : 'home'
  const [aiStage, setAiStage] = useState<'home' | 'processing' | 'results'>(initialStage)

  // Stage 1 composer state
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedStarterId, setSelectedStarterId] = useState<string | null>(null)
  const [showHintBanner, setShowHintBanner] = useState(true)
  const [aiAttachedRole, setAiAttachedRole] = useState<string>('none')
  const [flashBox, setFlashBox] = useState(false)
  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  // Stage 2 animation progress state
  const [procStep, setProcStep] = useState<number>(0)
  const [procPercent, setProcPercent] = useState<number>(18)
  const [extractedPreviewLabels, setExtractedPreviewLabels] = useState<string[]>([])

  // Stage 3 (1/4 AI Chatbot) state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatThinking, setChatThinking] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Shared structured filter state (V02 11-dimension console)
  const [cats, setCats] = useState<Category[]>([])
  const [subs, setSubs] = useState<string[]>([])
  const [more, setMore] = useState<More>(MORE_DEFAULT)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [allMatching, setAllMatching] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [consoleExpanded, setConsoleExpanded] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [bulkMaskCandIds, setBulkMaskCandIds] = useState<string[] | null>(null)
  const [layout, setLayout] = useState<'table' | 'split'>('table')
  const [activeId, setActiveId] = useState<string>('priya')

  // V03/V04 Sheets-style FilterBar state (works alongside or inside Manual & AI results)
  const [sheetsFilters, setSheetsFilters] = useState<FilterState>({})
  const [colFilter, setColFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const { visible, setVisible, reset } = useColumnPrefs('candidates-v4-saas-4col', DEFAULT_COLUMNS)
  const barRef = useRef<HTMLDivElement>(null)

  /* ---------- V03/V04 Sheets Filter Fields (§7.3, C8: repeated column = OR) ---------- */
  const fields = useMemo<FilterField<Candidate>[]>(() => [
    { key: 'category', label: 'Category', kind: 'values', pinned: true, options: CATEGORIES, get: c => c.category },
    { key: 'subcategory', label: 'Sub-category', kind: 'values', get: c => c.subcategory },
    { key: 'domain', label: 'Domain', kind: 'multi', options: app.domains, get: c => c.domains },
    { key: 'years', label: 'Experience', kind: 'number', unit: 'yrs', num: c => c.years },
    { key: 'metro', label: 'Location (metro)', kind: 'values', get: c => c.metro },
    { key: 'workMode', label: 'Work mode', kind: 'values', options: ['Remote', 'Hybrid', 'Onsite'], get: c => c.workModes },
    { key: 'relocate', label: 'Open to relocate', kind: 'values', options: ['Yes', 'No', 'Specific'], get: c => c.relocate },
    { key: 'auth', label: 'Visa', kind: 'values', options: ['US citizen', 'Green card', 'H-1B', 'OPT', 'STEM OPT', 'Other'], get: authValue },
    { key: 'sponsorship', label: 'Needs sponsorship', kind: 'values', options: ['Yes', 'No'], get: c => yesNo(c, 'needsSponsorship') },
    { key: 'transfer', label: 'Needs transfer', kind: 'values', options: ['Yes', 'No'], get: c => yesNo(c, 'needsTransfer') },
    { key: 'pay', label: 'Pay expectation', kind: 'number', unit: '$k', num: c => parsePayFloorK(c.pay) },
    { key: 'availability', label: 'Availability', kind: 'values', get: c => c.availability },
    { key: 'search', label: 'Search status', kind: 'values', options: ['Active', 'Passive'], get: c => c.searchStatus },
    { key: 'skills', label: 'Skills', kind: 'multi', get: c => more.includePredicted ? [...c.skills, ...c.predicted.map(p => p.name)] : c.skills },
    { key: 'completeness', label: 'Profile completeness', kind: 'number', unit: '%', num: c => c.completeness },
    { key: 'source', label: 'Source', kind: 'values', options: ['Outreach', 'Referral', 'Inbound'], get: c => c.source },
    { key: 'updated', label: 'Last updated', kind: 'values', get: c => c.updated },
    { key: 'resumeLabel', label: 'Resume label', kind: 'values', get: c => app.resumesFor(c.id).map(r => r.label) },
  ], [app, more.includePredicted])

  const switchScreen = (next: 'ai' | 'manual') => {
    setScreenMode(next)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('screen', next)
    setSearchParams(nextParams, { replace: true })
  }

  useEffect(() => {
    const param = searchParams.get('screen')
    if (param === 'ai' || param === 'manual') {
      setScreenMode(param)
    }
    const st = searchParams.get('stage')
    if (st === 'processing' || st === 'results' || st === 'home') {
      setAiStage(st)
    } else if (searchParams.get('run') === '1') {
      setAiStage('results')
    }
  }, [searchParams])

  useTopBar(
    [{ label: 'Candidates' }],
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 font-mono text-[11px] text-gray-1100">
      {screenMode === 'ai' ? (
        <>
          <Sparkles className="size-3 text-gray-1000" />
          <span>AI Scout · {aiStage === 'home' ? 'Prompt' : aiStage === 'processing' ? 'Processing' : 'Split Workspace'}</span>
        </>
      ) : (
        <>
          <SlidersHorizontal className="size-3 text-gray-1000" />
          <span>Manual Filters · 412</span>
        </>
      )}
    </span>,
    [screenMode, aiStage],
  )

  /** Stage 1: Clicking a starter block populates the prompt into the textbox above */
  const handleSelectStarterBlock = (block: StarterBlock) => {
    setAiPrompt(block.prompt)
    setSelectedStarterId(block.id)
    setFlashBox(true)
    setTimeout(() => setFlashBox(false), 600)
    setTimeout(() => {
      promptInputRef.current?.focus()
    }, 20)
  }

  /** Commit parsed filters and seed the 1/4 AI Chatbot thread */
  const applyParsedPromptImmediately = (promptText: string) => {
    const starter = STARTER_BLOCKS.find(b => b.prompt.trim().toLowerCase() === promptText.trim().toLowerCase())
    let nextCats: Category[] = []
    let nextSubs: string[] = []
    let nextMore: More = { ...MORE_DEFAULT }
    let labels: string[] = []
    let replyText = ''

    if (starter) {
      nextCats = starter.cats
      nextSubs = starter.subs
      nextMore = { ...MORE_DEFAULT, ...starter.more }
      const parsed = parsePromptToFilters(promptText, [], [], MORE_DEFAULT, false)
      labels = parsed.labels
      replyText = parsed.replyText
    } else {
      const parsed = parsePromptToFilters(promptText, [], [], MORE_DEFAULT, false)
      nextCats = parsed.cats
      nextSubs = parsed.subs
      nextMore = parsed.more
      labels = parsed.labels
      replyText = parsed.replyText
    }

    setCats(nextCats)
    setSubs(nextSubs)
    setMore(nextMore)
    setQuery('')
    setExtractedPreviewLabels(labels)
    setChatMessages([
      { id: 'u-1', role: 'user', text: promptText, timestamp: 'Just now' },
      {
        id: 'a-1',
        role: 'assistant',
        text: replyText,
        timestamp: 'Just now',
        appliedLabels: labels,
        suggestions: [
          { label: 'US Citizen / Green Card only', prompt: 'Filter to US Citizen or Green Card holders only with no sponsorship.', icon: 'shield' },
          { label: 'Narrow to 7+ years tenure', prompt: 'Narrow minimum experience to 7+ years.', icon: 'clock' },
          { label: 'Cap target pay ≤ $185k', prompt: 'Cap target compensation at $185k maximum.', icon: 'dollar' },
          { label: 'Active searchers only', prompt: 'Show only candidates with Active search status.', icon: 'sparkle' },
        ],
      },
    ])
  }

  /** Stage 1 -> Stage 2 -> Stage 3 animated flow */
  const startAiProcessing = (customPrompt?: string) => {
    const text = (customPrompt ?? aiPrompt).trim() || STARTER_BLOCKS[0].prompt
    setAiPrompt(text)
    applyParsedPromptImmediately(text)
    setProcStep(0)
    setProcPercent(24)
    setAiStage('processing')
  }

  // Handle Stage 2 animation timer unless locked by wireframe state 'ai-processing'
  useEffect(() => {
    if (aiStage !== 'processing') return
    const t1 = setTimeout(() => { setProcStep(1); setProcPercent(66) }, 550)
    const t2 = setTimeout(() => { setProcStep(2); setProcPercent(96) }, 1150)
    const isLockedProcessing = wf === 'ai-processing' || searchParams.get('stage') === 'processing'
    const t3 = !isLockedProcessing
      ? setTimeout(() => {
          setAiStage('results')
        }, 1750)
      : undefined
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (t3) clearTimeout(t3)
    }
  }, [aiStage, wf, searchParams])

  // Stage 3: Send a follow-up message in the 1/4 AI Chatbot
  const handleSendChatMessage = (customText?: string) => {
    const text = (customText ?? chatInput).trim()
    if (!text) return
    setChatInput('')
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text, timestamp: 'Just now' }
    setChatMessages(prev => [...prev, userMsg])
    setChatThinking(true)

    setTimeout(() => {
      const parsed = parsePromptToFilters(text, cats, subs, more, true)
      setCats(parsed.cats)
      setSubs(parsed.subs)
      setMore(parsed.more)
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: parsed.replyText,
        timestamp: 'Just now',
        appliedLabels: parsed.labels,
        suggestions: [
          { label: 'Reset location & pay filters', prompt: 'Clear location and pay filters', icon: 'sparkle' },
          { label: '80%+ profile completeness', prompt: 'Show only profiles with 80%+ completeness', icon: 'shield' },
        ],
      }
      setChatMessages(prev => [...prev, aiMsg])
      setChatThinking(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 40)
    }, 450)
  }

  // Wireframe presets
  useEffect(() => {
    setMoreOpen(false); setCopyOpen(false); setSelected([]); setAllMatching(false); setQuery(''); setSheetsFilters({}); setPreview(null)
    if (wf === 'live') {
      const urlScreen = searchParams.get('screen')
      const urlStage = searchParams.get('stage')
      setScreenMode(urlScreen === 'manual' ? 'manual' : 'ai')
      if (urlStage === 'processing') {
        applyParsedPromptImmediately(STARTER_BLOCKS[0].prompt)
        setAiPrompt(STARTER_BLOCKS[0].prompt)
        setAiStage('processing')
      } else if (urlStage === 'results' || searchParams.get('run') === '1') {
        applyParsedPromptImmediately(STARTER_BLOCKS[0].prompt)
        setAiPrompt(STARTER_BLOCKS[0].prompt)
        setAiStage('results')
      } else {
        setCats([]); setSubs([]); setMore(MORE_DEFAULT)
        setAiStage('home')
      }
    }
    if (wf === 'ai-processing') {
      setScreenMode('ai')
      setAiPrompt(STARTER_BLOCKS[0].prompt)
      applyParsedPromptImmediately(STARTER_BLOCKS[0].prompt)
      setAiStage('processing')
    }
    if (wf === 'ai-results') {
      setScreenMode('ai')
      setAiPrompt(STARTER_BLOCKS[0].prompt)
      applyParsedPromptImmediately(STARTER_BLOCKS[0].prompt)
      setAiStage('results')
    }
    if (wf === 'manual' || wf === 'empty' || wf === 'loading') {
      setScreenMode('manual')
      setLayout('table')
      setCats([]); setSubs([]); setMore(MORE_DEFAULT)
    }
    if (wf === 'split') {
      setScreenMode('manual')
      setLayout('split')
      setCats([]); setSubs([]); setMore(MORE_DEFAULT)
    }
    if (wf === 'preview-open') {
      setScreenMode('manual')
      setLayout('table')
      setPreview('priya')
    }
    if (wf === 'several') {
      setScreenMode('manual')
      setSheetsFilters({
        auth: { kind: 'values', values: ['US citizen', 'Green card'], includeMissing: true },
        years: { kind: 'number', op: 'gte', a: 5, includeMissing: true },
        domain: { kind: 'multi', values: ['B2B SaaS', 'Payments/Fintech'], mode: 'any', includeMissing: true },
      })
    }
    if (wf === 'columns') {
      setScreenMode('manual')
      setTimeout(() => {
        const buttons = Array.from(barRef.current?.querySelectorAll('button') ?? [])
        buttons.find(b => b.textContent?.trim() === 'Columns')?.click()
      }, 60)
    }
    if (wf === 'marketing' || wf === 'copymenu' || wf === 'phone') {
      setScreenMode('manual')
      setCats(['Marketing']); setSubs([]); setMore(MORE_DEFAULT)
    }
    if (wf === 'copymenu') setCopyOpen(true)
    if (wf === 'more') {
      setScreenMode('manual')
      setCats(['Marketing']); setSubs([]); setMore({ ...MORE_DEFAULT, metro: 'NYC' }); setMoreOpen(true)
      setTimeout(() => {
        const buttons = Array.from(barRef.current?.querySelectorAll('button') ?? [])
        buttons.find(b => b.textContent?.includes('Category'))?.click()
      }, 80)
    }
    if (wf === 'bulk') {
      setScreenMode('manual')
      setCats(['Marketing']); setSubs([]); setMore(MORE_DEFAULT)
      setSelected(app.candidates.filter(c => c.category === 'Marketing').slice(0, 5).map(c => c.id))
    }
    if (wf === 'noresults') {
      setScreenMode('manual')
      setCats(['Data']); setSubs([]); setMore({ ...MORE_DEFAULT, metro: 'NYC' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wf])

  useEffect(() => {
    if (screenMode === 'manual' && (searchParams.get('openFilter') === 'category' || wf === 'more')) {
      const t = setTimeout(() => {
        const buttons = Array.from(barRef.current?.querySelectorAll('button') ?? [])
        const btn = buttons.find(b => b.textContent?.includes('Category'))
        if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click()
      }, 60)
      return () => clearTimeout(t)
    }
  }, [screenMode, searchParams, wf])

  const pool = wf === 'empty' ? [] : app.candidates
  const poolSize = POOL_SIZE + Math.max(0, app.candidates.length - SEED_CANDIDATES.length)
  const checks = moreChecks(more)
  const inCats = (c: Candidate) => !cats.length || cats.includes(c.category)
  const inSubs = (c: Candidate) => !subs.length || subs.includes(c.subcategory)
  const inQuery = (c: Candidate) =>
    !query ||
    `${c.name} ${c.headline} ${c.skills.join(' ')} ${(c.domains ?? []).join(' ')} ${c.companies.map(x => x.name).join(' ')} ${c.predicted.map(p => p.name).join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase())

  const base = pool.filter(inCats)
  const consoleFiltered = base.filter(c => inSubs(c) && inQuery(c) && checks.every(k => k.test(c)))
  const sheetsFiltered = useMemo(() => applyFilters(consoleFiltered, fields, sheetsFilters), [consoleFiltered, fields, sheetsFilters])

  const sortValues: Record<string, (c: Candidate) => string | number> = {
    name: c => c.name,
    cat: c => `${c.category} ${c.subcategory}`,
    years: c => c.years ?? -1,
    loc: c => c.metro ?? '~',
    auth: c => workAuthShort(c.workAuth) ?? '~',
    skills: c => c.skills.length,
    comp: c => c.completeness,
    domain: c => c.domains?.join(', ') ?? '~',
    resumes: c => app.resumesFor(c.id).length,
    take: c => app.takeFor(c.id)?.status ?? '~',
    availability: c => c.availability ?? '~',
    source: c => c.source,
  }

  const rows = useMemo(() => {
    if (!sort) return sheetsFiltered
    const v = sortValues[sort.key]
    return v ? [...sheetsFiltered].sort((a, b) => (v(a) > v(b) ? 1 : v(a) < v(b) ? -1 : 0) * sort.dir) : sheetsFiltered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetsFiltered, sort])

  // Live count at pool scale (sample rows shown; count reflects the 412 pool)
  const baseScale = cats.length ? cats.reduce((n, k) => n + POOL_BY_CATEGORY[k], 0) : poolSize
  const count = rows.length === 0 ? 0 : rows.length === base.length && Object.keys(sheetsFilters).length === 0 ? baseScale : Math.max(rows.length, Math.round(baseScale * rows.length / Math.max(1, base.length)))
  const eliminatedCount = Math.max(0, poolSize - count)
  const assumedPassCount = rows.filter(r => r.relocate === null || r.pay === null || !r.workModes).length

  const fewest = useMemo(() => {
    const dims = [...checks, ...(subs.length ? [{ label: `Sub-category (${subs.join(', ')})`, test: inSubs }] : [])]
    if (!dims.length) return cats.length ? `Category (${cats.join(', ')})` : 'Search'
    return dims.map(d => ({ d, n: base.filter(d.test).length })).sort((a, b) => a.n - b.n)[0].d.label
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(more), subs.join(), cats.join(), pool.length])

  const activeMore = checks.length
  const sheetsFilterCount = Object.keys(sheetsFilters).length
  const totalActiveFilters = cats.length + subs.length + activeMore + sheetsFilterCount + (query ? 1 : 0)
  const anyFilter = totalActiveFilters > 0

  const clearAll = () => {
    setCats([])
    setSubs([])
    setMore(MORE_DEFAULT)
    setSheetsFilters({})
    setQuery('')
  }

  const resetToAiHome = () => {
    clearAll()
    setAiPrompt('')
    setSelectedStarterId(null)
    setChatMessages([])
    setAiStage('home')
  }

  const toggleCat = (k: Category) => {
    setCats(x => x.includes(k) ? x.filter(y => y !== k) : [...x, k])
    setSubs(s => s.filter(sub => !SUBCATEGORIES[k].includes(sub)))
  }

  const toggleSkill = (sk: string) => {
    setMore(m => ({
      ...m,
      skills: m.skills.includes(sk) ? m.skills.filter(x => x !== sk) : [...m.skills, sk],
    }))
  }

  const targetIds = allMatching ? rows.map(c => c.id) : selected
  const clearSel = () => { setSelected([]); setAllMatching(false) }

  const copyList = (fmt: 'Masked' | 'Full') => {
    const list = targetIds.length ? rows.filter(r => targetIds.includes(r.id)) : rows
    const text = list.map(fmt === 'Masked' ? maskedLine : fullLine).join('\n')
    navigator.clipboard?.writeText(text).catch(() => {})
    const n = targetIds.length || count
    app.toast(`Copied ${n} candidate${n === 1 ? '' : 's'}${fmt === 'Full' ? ' (full)' : ''}`)
    app.log({ what: `Copied list · ${n} candidates · ${fmt.toLowerCase()}`, record: cats.length ? `${cats.join(', ')} candidates` : 'Pool', recordHref: '/candidates', kind: 'Outputs' })
    setCopyOpen(false)
  }

  const metros = useMemo(
    () => Array.from(new Set(app.candidates.map(c => c.metro).filter((m): m is string => !!m))).sort(),
    [app.candidates],
  )

  /* ---------- Column Filter Dialog (Sheets-style header menu) ---------- */
  const openColumnFilter = (fieldKey: string) => {
    const f = fields.find(x => x.key === fieldKey)
    if (!f) return
    if (!sheetsFilters[fieldKey]) setSheetsFilters(s => ({ ...s, [fieldKey]: blankFilter(f, pool) }))
    setColFilter(fieldKey)
  }
  const closeColumnFilter = () => {
    if (colFilter && sheetsFilters[colFilter] && isEmptyFilter(sheetsFilters[colFilter])) {
      setSheetsFilters(s => { const n = { ...s }; delete n[colFilter]; return n })
    }
    setColFilter(null)
  }
  const colField = colFilter ? fields.find(f => f.key === colFilter) : undefined

  const columnMenu = (col: Column<Candidate>, s: { asc: () => void; desc: () => void }) => {
    const fk = COLUMN_FILTER[col.key]
    const locked = COLUMN_OPTIONS.find(o => o.key === col.key)?.locked
    return [
      { label: 'Sort A → Z', icon: <ArrowUp />, onSelect: () => { setSort({ key: col.key, dir: 1 }); s.asc() } },
      { label: 'Sort Z → A', icon: <ArrowDown />, onSelect: () => { setSort({ key: col.key, dir: -1 }); s.desc() } },
      { separator: true, label: '' },
      { label: 'Filter this column', icon: <Filter />, disabled: !fk, onSelect: () => fk && openColumnFilter(fk) },
      { label: 'Hide column', icon: <EyeOff />, disabled: !!locked, onSelect: () => setVisible(visible.filter(k => k !== col.key)) },
    ]
  }

  /* ---------- Structured Table Columns (5 Consolidated SaaS Columns by Default) ---------- */
  const allColumnsMap: Record<string, Column<Candidate>> = {
    name: {
      key: 'name', header: 'Candidate & Resume', sortable: true, sortValue: c => c.name,
      render: c => {
        const rs = app.resumesFor(c.id)
        return (
          <div className="flex min-w-0 items-center gap-2.5" data-cid={c.id}>
            <Avatar initials={c.initials} size={28} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); navigate(`/candidates/${c.id}`) }}
                  className="max-w-[140px] truncate text-left text-[13px] font-[590] tracking-[-0.014em] text-foreground hover:underline"
                >
                  {c.name}
                </button>
                {c.searchStatus === 'Active' && (
                  <span className="inline-flex h-4 items-center rounded-xs border border-border bg-secondary px-1 font-mono text-[9px] text-gray-1100">
                    Active
                  </span>
                )}
                {rs.length > 1 && (
                  <button
                    type="button"
                    title="Select resume version for role masking"
                    onClick={e => { e.stopPropagation(); setBulkMaskCandIds([c.id]) }}
                    className="inline-flex h-4 items-center gap-0.5 rounded-xs border border-border bg-card px-1 font-mono text-[9.5px] text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <FileText className="size-2.5 text-muted-foreground" />
                    <span>{rs.length} resumes</span>
                  </button>
                )}
              </div>
              <div className="max-w-[190px] truncate text-[11px] text-muted-foreground">
                {c.companies[0] ? `${c.companies[0].title} · ${c.companies[0].name}` : c.headline}
              </div>
            </div>
          </div>
        )
      },
    },
    cat: {
      key: 'cat', header: 'Function & Seniority', sortable: true, sortValue: c => c.category,
      render: c => (
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-5 items-center rounded-sm border border-border bg-secondary px-1.5 text-[11px] font-medium text-foreground">
              {c.category}
            </span>
            <span className="max-w-[90px] truncate text-xs text-gray-1100">{c.subcategory}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground tnum">
            <span>{c.years !== null ? `${c.years} yrs` : '? yrs'}</span>
            <span>·</span>
            <span>{c.pay ?? '? Pay assumed'}</span>
          </div>
        </div>
      ),
    },
    years: {
      key: 'years', header: 'Exp · Pay', sortable: true, sortValue: c => c.years ?? -1,
      render: c => (
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          {c.years !== null
            ? <span className="font-mono text-xs font-medium text-foreground tnum">{c.years} yrs <span className="text-[10px] text-gray-1000">({c.years >= 7 ? 'Sr' : c.years >= 5 ? 'Mid-Sr' : 'Mid'})</span></span>
            : <NotCaptured />}
          {c.pay
            ? <span className="font-mono text-[10.5px] text-muted-foreground tnum">{c.pay}</span>
            : <span className="text-[10px] text-[#b45309]">? Pay assumed</span>}
        </div>
      ),
    },
    loc: {
      key: 'loc', header: 'Location & Work Auth',
      render: c => {
        const s = workAuthShort(c.workAuth)
        return (
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <div className="flex items-center gap-1">
              {c.metro ? <span className="max-w-[90px] truncate text-xs font-medium text-foreground">{c.metro}</span> : <NotCaptured />}
              {c.workModes
                ? <span className="inline-flex h-[18px] items-center rounded-xs border border-border bg-secondary/70 px-1 font-mono text-[10px] text-gray-1100">{c.workModes.join('/').toLowerCase()}</span>
                : <span className="inline-flex h-[18px] items-center rounded-xs border border-dashed border-warning/60 bg-warning/5 px-1 text-[10px] text-[#b45309]">? Mode</span>}
            </div>
            <span className="font-mono text-[10.5px] text-muted-foreground">
              {s ?? 'Auth not captured'}
            </span>
          </div>
        )
      },
    },
    auth: {
      key: 'auth', header: 'Work Auth',
      render: c => {
        const s = workAuthShort(c.workAuth)
        if (!s) return <NotCaptured />
        return (
          <span
            title={s}
            className="inline-flex h-5 max-w-[106px] items-center truncate rounded-sm border border-border bg-gray-100 px-1.5 text-[11px] font-medium text-gray-1100 whitespace-nowrap"
          >
            {s}
          </span>
        )
      },
    },
    skills: {
      key: 'skills', header: 'Skills & ◇ AI Graph',
      render: c => (
        <div className="flex max-w-[175px] flex-wrap items-center gap-1">
          {c.skills.slice(0, 2).map(sk => (
            <span
              key={sk}
              className="inline-flex h-5 items-center rounded-xs border border-border bg-secondary px-1.5 text-[10.5px] text-gray-1100 whitespace-nowrap"
            >
              {sk}
            </span>
          ))}
          {c.predicted.slice(0, 1).map(p => (
            <span
              key={p.name}
              title={`Predicted skill: ${p.basis}`}
              className="inline-flex h-5 items-center gap-0.5 rounded-xs border border-dashed border-border bg-secondary/50 px-1.5 text-[10.5px] text-gray-1000 whitespace-nowrap"
            >
              <span>◇</span>
              <span>{p.name}</span>
            </span>
          ))}
        </div>
      ),
    },
    comp: {
      key: 'comp', header: 'Profile & Take', sortable: true, sortValue: c => c.completeness,
      render: c => (
        <div className="flex flex-col gap-1 whitespace-nowrap">
          <CompletenessMeter compact value={c.completeness} />
          <div className="flex items-center gap-1.5">
            <TakeMarker candidateId={c.id} />
          </div>
        </div>
      ),
    },
    domain: {
      key: 'domain', header: 'Domain', sortValue: sortValues.domain,
      render: c => c.domains?.length ? <span className="text-xs whitespace-nowrap">{c.domains.join(', ')}</span> : <NotCaptured />,
    },
    resumes: {
      key: 'resumes', header: 'Resumes', sortValue: sortValues.resumes,
      render: c => {
        const rs = app.resumesFor(c.id)
        return (
          <span className="text-xs whitespace-nowrap">
            {rs.map(r => r.label).join(', ')}
            {rs.length > 1 && <Tag tone="outline" className="ml-1.5">{rs.length}</Tag>}
          </span>
        )
      },
    },
    take: {
      key: 'take', header: 'Our take', sortValue: sortValues.take,
      render: c => <TakeMarker candidateId={c.id} />,
    },
    availability: {
      key: 'availability', header: 'Availability', sortValue: sortValues.availability,
      render: c => c.availability ? <span className="text-xs whitespace-nowrap">{c.availability}</span> : <NotCaptured />,
    },
    source: {
      key: 'source', header: 'Source', sortValue: sortValues.source,
      render: c => <span className="text-xs whitespace-nowrap">{c.source}</span>,
    },
  }

  const visibleKeys = ['name', ...visible.filter(k => k !== 'name' && allColumnsMap[k])]
  const columns = visibleKeys.map(k => allColumnsMap[k])

  /* Compact 4-column layout for the 3/4 Split Workspace so all columns + sticky row actions fit with zero horizontal scroll */
  const splitWorkspaceColumns: Column<Candidate>[] = [
    {
      ...allColumnsMap.name,
      header: 'Candidate',
      render: c => {
        const rs = app.resumesFor(c.id)
        return (
          <div className="flex min-w-0 items-center gap-2" data-cid={c.id}>
            <Avatar initials={c.initials} size={28} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); navigate(`/candidates/${c.id}`) }}
                  className="max-w-[95px] truncate text-left text-[13px] font-[590] tracking-[-0.014em] text-foreground hover:underline"
                >
                  {c.name}
                </button>
                {rs.length > 1 && (
                  <button
                    type="button"
                    title="Select resume version for role masking"
                    onClick={e => { e.stopPropagation(); setBulkMaskCandIds([c.id]) }}
                    className="inline-flex h-4 items-center gap-0.5 rounded-xs border border-border bg-card px-1 font-mono text-[9px] text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <span>{rs.length}v</span>
                  </button>
                )}
              </div>
              <div className="max-w-[116px] truncate text-[11px] text-muted-foreground">
                {c.companies[0] ? `${c.companies[0].title} · ${c.companies[0].name}` : c.headline}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      ...allColumnsMap.cat,
      header: 'Function & Exp',
      render: c => (
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-5 items-center rounded-sm border border-border bg-secondary px-1.5 text-[11px] font-medium text-foreground">
              {c.category}
            </span>
            <span className="max-w-[56px] truncate text-[11px] text-gray-1100">{c.subcategory}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground tnum">
            <span>{c.years !== null ? `${c.years}y` : '?y'}</span>
            <span>·</span>
            <span>{c.pay ?? '? Pay'}</span>
          </div>
        </div>
      ),
    },
    {
      ...allColumnsMap.loc,
      header: 'Location & Auth',
      render: c => {
        const s = workAuthShort(c.workAuth)
        return (
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <div className="flex items-center gap-1">
              {c.metro ? <span className="max-w-[68px] truncate text-xs font-medium text-foreground">{c.metro}</span> : <NotCaptured />}
              {c.workModes && (
                <span className="inline-flex h-[18px] items-center rounded-xs border border-border bg-secondary/70 px-1 font-mono text-[9.5px] text-gray-1100">
                  {c.workModes[0].toLowerCase()}
                </span>
              )}
            </div>
            <span className="max-w-[98px] truncate font-mono text-[10px] text-muted-foreground">
              {s ?? 'Auth assumed'}
            </span>
          </div>
        )
      },
    },
    {
      ...allColumnsMap.skills,
      header: 'Skills & ◇ AI',
      render: c => (
        <div className="flex max-w-[130px] flex-wrap items-center gap-1">
          {c.skills.slice(0, 1).map(sk => (
            <span
              key={sk}
              className="inline-flex h-5 max-w-[80px] items-center truncate rounded-xs border border-border bg-secondary px-1.5 text-[10px] text-gray-1100 whitespace-nowrap"
            >
              {sk}
            </span>
          ))}
          {c.predicted.slice(0, 1).map(p => (
            <span
              key={p.name}
              title={`Predicted skill: ${p.basis}`}
              className="inline-flex h-5 max-w-[80px] items-center gap-0.5 truncate rounded-xs border border-dashed border-border bg-secondary/50 px-1 text-[10px] text-gray-1000 whitespace-nowrap"
            >
              <span>◇</span>
              <span className="truncate">{p.name}</span>
            </span>
          ))}
        </div>
      ),
    },
  ]

  // Space on a focused row → quick look sidebar (S-08)
  const onTableKey = (e: React.KeyboardEvent) => {
    if (e.key !== ' ') return
    const row = (e.target as HTMLElement).closest('tr[data-row-id]')
    const id = row?.getAttribute('data-row-id') ?? (e.target as HTMLElement).querySelector<HTMLElement>('[data-cid]')?.dataset.cid
    if (id) { e.preventDefault(); setPreview(id) }
  }

  const isLoading = wf === 'loading'
  const emptyPool = pool.length === 0

  /* ---------- Popover menus ---------- */
  const copyMenu = (
    <ControlledPop open={copyOpen} onOpenChange={setCopyOpen} align="end" width={280}
      trigger={<Button variant="outline" size="sm" icon={<Copy />} iconRight={<ChevronDown className="!size-3.5 text-muted-foreground" />} aria-haspopup="menu" aria-expanded={copyOpen} onClick={() => setCopyOpen(o => !o)}>Copy list</Button>}>
      <div role="menu" className="p-1">
        <button role="menuitem" onClick={() => copyList('Masked')} className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted">
          <EyeOff className="mt-0.5 size-4 text-muted-foreground" />
          <span className="flex-1"><span className="flex items-center gap-2 text-sm font-medium">Masked <span className="eyebrow text-[9px] text-gray-1000">Default</span></span><span className="block text-xs text-muted-foreground">No names, no contact details. Safe to send to prospects.</span></span>
          <Check className="mt-0.5 size-4" />
        </button>
        <button
          role="menuitem"
          disabled={!app.can('copyFull')}
          onClick={() => app.can('copyFull') && copyList('Full')}
          className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted disabled:opacity-45"
        >
          <Eye className="mt-0.5 size-4 text-muted-foreground" />
          <span className="flex-1">
            <span className="block text-sm font-medium">Full {!app.can('copyFull') && <span className="font-mono text-[10px] text-muted-foreground">({whoCanText('copyFull')})</span>}</span>
            <span className="block text-xs text-muted-foreground">Names and emails. For internal use.</span>
          </span>
        </button>
        <div className="mx-2.5 mt-1 border-t border-border pt-2 pb-1 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
          {(rows[0] ? maskedLine(rows.find(r => r.id === 'marcus') ?? rows[0]) : 'Growth Marketing Manager · 6 yrs · B2B SaaS · NYC (hybrid) · US citizen')}
        </div>
      </div>
    </ControlledPop>
  )

  const moreFiltersPopover = (
    <ControlledPop open={moreOpen} onOpenChange={setMoreOpen} width={420}
      trigger={<Button variant="outline" size="sm" icon={<SlidersHorizontal />} aria-expanded={moreOpen} onClick={() => setMoreOpen(o => !o)}>
        Popover view{activeMore > 0 && <span className="ml-0.5 rounded-sm bg-primary px-1 font-mono text-[10px] text-primary-foreground tnum">{activeMore}</span>}
      </Button>}>
      <MoreFiltersPanel value={more} onChange={setMore} metros={metros}
        count={count} onClear={() => setMore(MORE_DEFAULT)} onDone={() => setMoreOpen(false)} />
    </ControlledPop>
  )

  const activeCandidate = rows.find(r => r.id === activeId) ?? rows[0] ?? null

  /* ---------- V03/V04 Sheets-Style FilterBar + Columns Menu ---------- */
  const sheetsFilterBar = (
    <div ref={barRef}>
      <FilterBar
        fields={fields}
        rows={consoleFiltered}
        state={sheetsFilters}
        onChange={s => setSheetsFilters(s)}
        count={count}
        right={
          <>
            {rows.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(rows.map(c => c.id))}
              >
                Select all ({rows.length})
              </Button>
            )}
            <Switch
              checked={more.includePredicted}
              onChange={v => setMore(m => ({ ...m, includePredicted: v }))}
              label="Include ◇ predicted"
            />
            <ColumnsMenu
              options={COLUMN_OPTIONS}
              visible={visibleKeys}
              onChange={k => setVisible(['name', ...k.filter(x => x !== 'name')])}
              onReset={reset}
            />
          </>
        }
      />
    </div>
  )

  /* ---------- Shared Candidate Table View ---------- */
  const renderCandidateTableSection = (compactForSplitWorkspace = false) => (
    <div className={cn('flex flex-1 flex-col', compactForSplitWorkspace ? 'space-y-3' : 'space-y-4')}>
      {(selected.length > 0 || allMatching) && (
        <SelectionBar
          count={selected.length}
          shown={rows.length}
          matching={rows.length}
          allMatchingSelected={allMatching}
          onSelectAllShown={() => setSelected(rows.map(c => c.id))}
          onSelectAllMatching={() => { setSelected(rows.map(c => c.id)); setAllMatching(true) }}
          onClear={clearSel}
          note={targetIds.length > MASKED_BATCH_CAP ? `Masked resumes run ${MASKED_BATCH_CAP} per batch.` : undefined}
        >
          <Button
            variant="primary"
            icon={<Shield />}
            onClick={() => setBulkMaskCandIds(targetIds.slice(0, MASKED_BATCH_CAP))}
          >
            Select resumes & bulk mask ({targetIds.length})
          </Button>
          <GatedButton
            perm="genMasked"
            variant="outline"
            icon={<Wand2 />}
            onClick={() => navigate(`/resumes/masked?candidates=${targetIds.slice(0, MASKED_BATCH_CAP).join(',')}`)}
          >
            Open Masked Studio
          </GatedButton>
          <Menu
            width={260}
            trigger={({ toggle }) => (
              <Button variant="outline" icon={<Briefcase />} iconRight={<ChevronDown />} onClick={toggle}>
                Add to role shortlist
              </Button>
            )}
            items={app.roles.filter(r => r.status === 'Open').map(r => ({
              label: `${r.title} · ${r.company}`,
              hint: r.companyType,
              onSelect: () => {
                targetIds.slice(0, 25).forEach(cid => app.setCandidateRoleStatus(cid, r.id, 'shortlisted'))
                app.toast(`Added ${Math.min(targetIds.length, 25)} candidate${targetIds.length === 1 ? '' : 's'} to ${r.title} shortlist`)
                clearSel()
              },
            }))}
          />
          <Menu
            width={250}
            trigger={({ toggle }) => <Button variant="outline" icon={<Copy />} iconRight={<ChevronDown />} onClick={toggle}>Copy list</Button>}
            items={[
              { label: 'Masked · no names', hint: 'Default', onSelect: () => copyList('Masked') },
              app.can('copyFull')
                ? { label: 'Full · names and email', onSelect: () => copyList('Full') }
                : { label: `Full · ${whoCanText('copyFull')}`, disabled: true },
            ]}
          />
          <GatedButton
            perm="exportCsv"
            variant="outline"
            icon={<Download />}
            onClick={() => app.toast(`Exported ${targetIds.length} candidates to CSV`)}
          >
            Export CSV
          </GatedButton>
        </SelectionBar>
      )}

      {layout === 'split' && !isLoading && rows.length > 0 ? (
        <CandidateSplitView
          rows={rows}
          totalPoolCount={count}
          active={activeCandidate}
          onSelectActive={c => setActiveId(c.id)}
          selected={selected}
          onSelectedChange={ids => { setSelected(ids); setAllMatching(false) }}
          onOpenProfile={id => navigate(`/candidates/${id}`)}
          onOpenSlideOver={id => setPreview(id)}
          onFindRoles={id => navigate(`/candidates/${id}?tab=roles`)}
          onMask={id => setBulkMaskCandIds([id])}
        />
      ) : (
        <div className="flex flex-1 flex-col" onKeyDown={onTableKey}>
          <DataTable
            caption="Candidates pool"
            dense={compactForSplitWorkspace}
            columns={compactForSplitWorkspace ? splitWorkspaceColumns : columns}
            rows={rows}
            loading={isLoading}
            selectable
            quietCheckbox
            selected={selected}
            onSelectedChange={ids => { setSelected(ids); setAllMatching(false) }}
            columnMenu={columnMenu}
            onRowClick={c => setPreview(c.id)}
            defaultPageSize={10}
            totalPoolCount={count}
            maxHeight={
              compactForSplitWorkspace
                ? 'h-[calc(100vh-285px)] max-h-[calc(100vh-285px)]'
                : consoleExpanded
                  ? 'h-[calc(100vh-520px)] max-h-[calc(100vh-520px)] min-h-[260px]'
                  : 'h-[calc(100vh-352px)] max-h-[calc(100vh-352px)]'
            }
            rowActions={c => compactForSplitWorkspace ? (
              <>
                <Button variant="outline" size="sm" icon={<Shield />} title="Select resume & mask for a role" onClick={() => setBulkMaskCandIds([c.id])}>Mask</Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Preview ${c.name}`} title="Open preview sidebar (Space)" icon={<PanelRightOpen />} onClick={() => setPreview(c.id)} />
                <Button variant="ghost" size="icon-sm" aria-label={`Find matching roles for ${c.name}`} title="Find matching roles" icon={<Briefcase />} onClick={() => navigate(`/candidates/${c.id}?tab=roles`)} />
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" icon={<Shield />} title="Select resume & mask for a role" onClick={() => setBulkMaskCandIds([c.id])}>Mask for role</Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Preview ${c.name}`} title="Open preview sidebar (Space)" icon={<PanelRightOpen />} onClick={() => setPreview(c.id)} />
                <Button variant="ghost" size="sm" title="Find matching roles" onClick={() => navigate(`/candidates/${c.id}?tab=roles`)}>Roles</Button>
              </>
            )}
            empty={
              <EmptyState icon={<Search />} title="No candidates match these filters"
                body={<>No candidates match these filters. Fewest matches come from: <span className="text-foreground">{fewest}</span>.</>}
                action={<Button variant="outline" onClick={clearAll}>Clear filters</Button>} />
            }
          />
        </div>
      )}
    </div>
  )

  return (
    <ScrollPage className="max-w-[1440px]">
      {/* Page Header Bar (Rightfit spacing: space-y-6 rhythm) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="title-type text-[18px] text-foreground">Candidates</h1>
          <ExampleMark />
          <span className="font-mono text-xs text-muted-foreground tnum">· {emptyPool ? 0 : poolSize} in pool</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rightfit Pill Tab Switcher (gap-0.5, px-3 py-1.5 rounded-lg text-xs font-medium) */}
          <div
            role="tablist"
            aria-label="Candidate Scouting Mode"
            className="inline-flex h-8 items-center gap-0.5 rounded-2xl border border-border bg-gray-100 p-0.5"
          >
            <button
              role="tab"
              aria-selected={screenMode === 'ai'}
              onClick={() => switchScreen('ai')}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-2xl px-3 text-xs btn-type transition-all cursor-pointer',
                screenMode === 'ai'
                  ? 'border border-border bg-card text-foreground shadow-2xs'
                  : 'border border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Sparkles className="size-3.5" />
              <span>AI Scout</span>
            </button>
            <button
              role="tab"
              aria-selected={screenMode === 'manual'}
              onClick={() => switchScreen('manual')}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-2xl px-3 text-xs btn-type transition-all cursor-pointer',
                screenMode === 'manual'
                  ? 'border border-border bg-card text-foreground shadow-2xs'
                  : 'border border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Manual Filters & Pool</span>
              {totalActiveFilters > 0 && (
                <span className="ml-0.5 rounded-xs bg-secondary px-1 font-mono text-[10px] text-foreground tnum">
                  {totalActiveFilters}
                </span>
              )}
            </button>
          </div>
          <Button variant="outline" icon={<Shield />} onClick={() => setBulkMaskCandIds(selected.length > 0 ? selected : rows.slice(0, 4).map(r => r.id))}>
            Select resumes & bulk mask
          </Button>
          <Button variant="primary" icon={<Plus />} onClick={() => navigate('/candidates/new')}>New candidate</Button>
        </div>
      </div>

      {wf === 'phone' ? (
        <PhoneFrame rows={rows} count={count} onOpen={id => navigate(`/candidates/${id}`)} onCopy={() => copyList('Masked')} cats={cats} onToggleCat={toggleCat} />
      ) : emptyPool && !isLoading ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState icon={<Users />} title="No candidates yet" body="No candidates yet. Add a resume to build your pool."
            action={<Button variant="primary" icon={<Plus />} onClick={() => navigate('/candidates/new')}>New candidate</Button>} />
        </div>
      ) : screenMode === 'ai' ? (
        /* ======================================================================
           SCREEN 1: 3-STAGE AI SCOUT FLOW
           Stage 1 ('home')       -> Centered Double-Bezel Prompt + 4 Starter Blocks
           Stage 2 ('processing') -> N15 Animated AI Progress Stepper
           Stage 3 ('results')    -> 3/4 Table & Data + 1/4 SaaS AI Chatbot Split Screen
           ====================================================================== */
        aiStage === 'home' ? (
          /* -------------------- STAGE 1: MINIMAL CENTERED AI HOME -------------------- */
          <div className="anim-fade mx-auto flex min-h-[calc(100vh-11.5rem)] w-full max-w-[700px] flex-col justify-center space-y-6 py-4">
            {/* Centered Monochrome Emblem & Calm Heading (Zero Cognitive Bias) */}
            <header className="flex flex-col items-center space-y-3 text-center">
              <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border bg-gray-100 p-1 shadow-custom">
                <div className="flex size-full items-center justify-center rounded-xl border border-border bg-card">
                  <Layers className="size-5 text-foreground" />
                </div>
                <span className="anim-glow absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="title-type text-xl text-foreground">
                  Who are we scouting for today?
                </h2>
                <p className="text-xs text-muted-foreground">
                  Describe must-haves or pick a base prompt below. AI drafts the criteria; you decide every shortlist.
                </p>
              </div>
            </header>

            {/* Double-Bezel AI Prompt Composer (Exact Rightfit Spacing: rounded-2xl outer -> px-4 py-2.5 header -> mx-1 mb-1 rounded-xl p-4 inner well) */}
            <section
              className={cn(
                'rounded-2xl border bg-gray-100 shadow-custom transition-all duration-300',
                flashBox ? 'border-foreground ring-2 ring-foreground/20' : 'border-border',
              )}
            >
              {/* Bezel Header Bar: px-4 (16px H) | py-2.5 (10px V) | gap-2 (8px) */}
              {showHintBanner && (
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-gray-1100">
                    <Terminal className="size-3.5 text-muted-foreground" />
                    <span>412 candidates indexed · resumes, call notes & ◇ skill graph</span>
                    {selectedStarterId && aiPrompt && (
                      <span className="anim-pop inline-flex items-center gap-1 rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                        <Check className="size-2.5" />
                        <span>Prompt loaded</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => switchScreen('manual')}
                      className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline cursor-pointer"
                    >
                      <span>Manual filters</span>
                      <ArrowRight className="size-3" />
                    </button>
                    <button
                      type="button"
                      aria-label="Dismiss hint"
                      onClick={() => setShowHintBanner(false)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Inner Well: mx-1 mb-1 (4px inset) | rounded-xl (16px radius) | p-4 (16px padding) */}
              <div className={cn('mx-1 mb-1 rounded-xl border border-border bg-card p-4 transition-colors focus-within:border-gray-900', !showHintBanner && 'mt-1')}>
                <div className="relative">
                  <textarea
                    ref={promptInputRef}
                    aria-label="Ask AI Scout to find candidates"
                    rows={3}
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        startAiProcessing()
                      }
                    }}
                    placeholder="Ask HeroScouter to find candidates, match an open role, or build a shortlist…"
                    className="w-full resize-none bg-transparent pr-7 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {aiPrompt && (
                    <button
                      type="button"
                      aria-label="Clear prompt"
                      onClick={() => { setAiPrompt(''); setSelectedStarterId(null); promptInputRef.current?.focus() }}
                      className="absolute top-0 right-0 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Composer Bottom Control Row (mt-3 pt-3 border-t) */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Role Context Selector (h-8 rounded-2xl px-2.5 gap-1.5) */}
                    <div className="inline-flex h-8 items-center gap-1.5 rounded-2xl border border-border bg-secondary px-2.5 text-xs btn-type text-foreground">
                      <Briefcase className="size-3.5 text-gray-1000" />
                      <select
                        aria-label="Scout role context"
                        value={aiAttachedRole}
                        onChange={e => setAiAttachedRole(e.target.value)}
                        className="bg-transparent text-xs btn-type text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="none" className="bg-[#191919]">Pool search (412)</option>
                        <option value="northwind-spm" className="bg-[#191919]">Role · Northwind Senior PM</option>
                        <option value="lumen-fse" className="bg-[#191919]">Role · Lumen Founding Eng</option>
                        <option value="brightdesk-gmm" className="bg-[#191919]">Role · BrightDesk Growth</option>
                        <option value="cobalt-ds" className="bg-[#191919]">Role · Cobalt Data Scientist</option>
                      </select>
                    </div>

                    {/* Predicted Skills Toggle Pill */}
                    <button
                      type="button"
                      title="Include AI-predicted adjacent skills (e.g. Payments → SQL)"
                      onClick={() => setMore(m => ({ ...m, includePredicted: !m.includePredicted }))}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-2xl border px-2.5 text-xs btn-type transition-colors cursor-pointer',
                        more.includePredicted
                          ? 'border-border bg-secondary text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Wand2 className="size-3.5 text-gray-1000" />
                      <span>◇ Predicted: {more.includePredicted ? 'On' : 'Off'}</span>
                    </button>

                    {/* P3 Assumed Guardrail Badge */}
                    <span
                      title="P3 Principle: Missing fields never hide a candidate; they pass as Assumed."
                      className="hidden h-8 items-center gap-1.5 rounded-2xl border border-dashed border-border bg-background/60 px-2.5 text-xs text-muted-foreground sm:inline-flex"
                    >
                      <HelpCircle className="size-3.5" />
                      <span>? Assumed pass</span>
                    </span>
                  </div>

                  {/* Primary Submit Action (P6: One primary action per screen) */}
                  <div className="flex items-center gap-2">
                    <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                      <Kbd>↵</Kbd>
                    </span>
                    <button
                      type="button"
                      aria-label="Run AI Scout"
                      onClick={() => startAiProcessing()}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-2xl border px-3 text-xs btn-type transition-all cursor-pointer',
                        aiPrompt.trim()
                          ? 'border-foreground bg-foreground text-background shadow-xs hover:opacity-90'
                          : 'border-border bg-secondary text-foreground hover:bg-muted',
                      )}
                    >
                      <span>Scout</span>
                      <ArrowUp className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 4 Individual Starter Blocks (2x2 Grid, gap-3 = 12px, Double-Bezel Geometry, Zero Bias) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Compass className="size-3.5 text-gray-1000" />
                  <span>Get started with a base prompt</span>
                </span>
                <span className="eyebrow text-[10px] text-gray-1000">
                  CLICK ANY BLOCK TO DRAFT ABOVE ↑
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {STARTER_BLOCKS.map((block, idx) => {
                  const isSelected = selectedStarterId === block.id && aiPrompt === block.prompt
                  return (
                    <button
                      key={block.id}
                      type="button"
                      style={{ animationDelay: `${idx * 45}ms` }}
                      onClick={() => handleSelectStarterBlock(block)}
                      className={cn(
                        'anim-slide-up group rounded-2xl border bg-gray-100 text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer',
                        isSelected
                          ? 'border-gray-900 shadow-custom'
                          : 'border-border hover:border-gray-800',
                      )}
                    >
                      {/* Starter Block Bezel Header: px-3.5 py-2 gap-2 */}
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                            <StarterBlockIcon kind={block.icon} />
                          </span>
                          <span className="truncate text-xs font-semibold text-foreground">
                            {block.title}
                          </span>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
                          {isSelected ? (
                            <>
                              <Check className="size-3" />
                              <span>Drafted</span>
                            </>
                          ) : (
                            <>
                              <span>{block.meta}</span>
                              <ArrowUpRight className="size-3" />
                            </>
                          )}
                        </span>
                      </div>

                      {/* Starter Block Inner Well: mx-1 mb-1 rounded-xl p-3 */}
                      <div className={cn(
                        'mx-1 mb-1 space-y-1.5 rounded-xl border p-3 transition-colors',
                        isSelected
                          ? 'border-gray-800 bg-secondary/70'
                          : 'border-border bg-card group-hover:bg-secondary/35',
                      )}>
                        <p className="text-xs font-medium text-gray-1100">
                          {block.subtitle}
                        </p>
                        <p className="line-clamp-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
                          “{block.prompt}”
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : aiStage === 'processing' ? (
          /* -------------------- STAGE 2: N15 ANIMATED AI PROGRESS STEPPER -------------------- */
          <div className="anim-fade mx-auto flex min-h-[calc(100vh-11.5rem)] w-full max-w-[620px] flex-col justify-center py-8">
            <section className="rounded-2xl border border-border bg-gray-100 shadow-custom">
              {/* Bezel Header */}
              <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Loader2 className="size-3.5 animate-spin text-gray-1000" />
                  <span>AI Scout · Evaluating candidate pool</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setAiStage('results')}>
                  Skip animation →
                </Button>
              </div>

              {/* Inner Well (mx-1 mb-1 rounded-xl p-4 space-y-4) */}
              <div className="mx-1 mb-1 space-y-4 overflow-hidden rounded-xl border border-border bg-card p-4">
                <div className="rainbow-line -mx-4 -mt-4 h-0.5" />

                {/* Quoted Prompt */}
                <div className="rounded-lg border border-border bg-background/70 p-3 font-mono text-xs leading-relaxed text-gray-1100">
                  “{aiPrompt}”
                </div>

                {/* Progress Bar & Live Counter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground tnum">
                    <span>Scanning 412 resumes & call notes…</span>
                    <span className="text-foreground">{procPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
                      style={{ width: `${procPercent}%` }}
                    />
                  </div>
                </div>

                {/* N15 3-Step AI Progress Stepper */}
                <ol className="space-y-2 text-xs">
                  {[
                    { icon: <Filter className="size-3.5" />, label: 'Extracting must-have criteria & role constraints' },
                    { icon: <Sparkles className="size-3.5" />, label: 'Checking explicit resume skills + ◇ adjacent skill graph' },
                    { icon: <ShieldCheck className="size-3.5" />, label: 'Preserving uncaptured fields as Assumed & ranking evidence' },
                  ].map((st, idx) => {
                    const done = procStep > idx
                    const active = procStep === idx
                    return (
                      <li
                        key={st.label}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all',
                          done
                            ? 'border-border bg-secondary/40 text-foreground'
                            : active
                              ? 'border-gray-800 bg-secondary/80 font-medium text-foreground'
                              : 'border-transparent text-muted-foreground',
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="size-4 shrink-0 text-foreground" />
                        ) : active ? (
                          <Loader2 className="size-4 shrink-0 animate-spin text-foreground" />
                        ) : (
                          <span className="text-muted-foreground">{st.icon}</span>
                        )}
                        <span className="flex-1">{st.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {done ? 'Done' : active ? 'Running' : 'Queued'}
                        </span>
                      </li>
                    )
                  })}
                </ol>

                {/* Extracted Filter Pills */}
                {extractedPreviewLabels.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <span className="eyebrow block text-[10px] text-gray-1000">PARSED MUST-HAVES</span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedPreviewLabels.map(lbl => (
                        <span
                          key={lbl}
                          className="anim-pop inline-flex h-6 items-center gap-1 rounded-full border border-border bg-secondary px-2.5 font-mono text-[11px] text-foreground"
                        >
                          <Check className="size-3" />
                          <span>{lbl}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          /* -------------------- STAGE 3: 3/4 TABLE & DATA + 1/4 SAAS AI CHATBOT SPLIT SCREEN -------------------- */
          <section className="anim-fade rounded-2xl border border-border bg-gray-100 p-1 shadow-custom">
            <div className="grid min-h-[calc(100vh-10.5rem)] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[3fr_1fr] lg:divide-x lg:divide-y-0">
              {/* ==================== LEFT 3/4 PANE (75%): CANDIDATE TABLE & STRUCTURED DATA ==================== */}
              <div className="flex min-w-0 flex-col">
                {/* Rightfit Split-Pane Sub-Header: single crisp h-12 row */}
                <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-gray-100/90 px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <Users className="size-4 shrink-0 text-gray-1000" />
                    <span className="font-mono text-xs font-semibold whitespace-nowrap text-foreground tnum">
                      {count} match
                    </span>
                    <span className="hidden rounded-sm border border-border bg-card px-2 py-0.5 font-mono text-[10.5px] whitespace-nowrap text-muted-foreground 2xl:inline-block tnum">
                      {poolSize} pool · {eliminatedCount} filtered out
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<SlidersHorizontal />}
                      onClick={() => switchScreen('manual')}
                    >
                      Filters{totalActiveFilters > 0 ? ` (${totalActiveFilters})` : ''}
                    </Button>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="relative hidden w-36 xl:block">
                      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        aria-label="Search matched candidates"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search match…"
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                    <Segmented
                      size="sm"
                      aria-label="View layout"
                      value={layout}
                      onChange={v => setLayout(v as 'table' | 'split')}
                      options={[
                        { value: 'table', label: 'Table' },
                        { value: 'split', label: 'Split' },
                      ]}
                    />
                    {copyMenu}
                  </div>
                </div>

                {/* Left 3/4 Content Body: p-4 (16px) | space-y-4 (16px) */}
                <div className="flex-1 space-y-4 p-4">
                  {/* Active Must-Haves Bar */}
                  {anyFilter && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background/50 px-3 py-2">
                      <span className="eyebrow mr-1 text-[10px] text-gray-1000">Must-haves:</span>
                      {cats.map(k => (
                        <FilterChip key={k} active onClick={() => toggleCat(k)}>Function: {k} ×</FilterChip>
                      ))}
                      {subs.map(s => (
                        <FilterChip key={s} active onClick={() => setSubs(x => x.filter(y => y !== s))}>Track: {s} ×</FilterChip>
                      ))}
                      {more.metro !== 'Any' && (
                        <FilterChip active onClick={() => setMore(m => ({ ...m, metro: 'Any' }))}>Metro: {more.metro} ×</FilterChip>
                      )}
                      {more.modes.map(md => (
                        <FilterChip key={md} active onClick={() => setMore(m => ({ ...m, modes: m.modes.filter(x => x !== md) }))}>Mode: {md} ×</FilterChip>
                      ))}
                      {more.yearsMin && (
                        <FilterChip active onClick={() => setMore(m => ({ ...m, yearsMin: '' }))}>Tenure: {more.yearsMin}+ yrs ×</FilterChip>
                      )}
                      {more.payMax !== 'Any' && (
                        <FilterChip active onClick={() => setMore(m => ({ ...m, payMax: 'Any' }))}>Pay: ≤ ${more.payMax}k ×</FilterChip>
                      )}
                      {more.skills.map(sk => (
                        <FilterChip key={sk} active onClick={() => toggleSkill(sk)}>Skill: {sk} ×</FilterChip>
                      ))}
                      {more.auth.map(a => (
                        <FilterChip key={a} active onClick={() => setMore(m => ({ ...m, auth: m.auth.filter(x => x !== a) }))}>Auth: {a} ×</FilterChip>
                      ))}
                      {more.sponsorship !== 'Any' && (
                        <FilterChip active onClick={() => setMore(m => ({ ...m, sponsorship: 'Any' }))}>Sponsorship: {more.sponsorship} ×</FilterChip>
                      )}
                      {more.search !== 'Any' && (
                        <FilterChip active onClick={() => setMore(m => ({ ...m, search: 'Any' }))}>Status: {more.search} ×</FilterChip>
                      )}
                      {more.completeness !== 'Any' && (
                        <FilterChip active onClick={() => setMore(m => ({ ...m, completeness: 'Any' }))}>Completeness: {more.completeness} ×</FilterChip>
                      )}
                      <Button variant="link" className="ml-auto h-6 px-1.5 text-xs" onClick={clearAll}>
                        Clear all
                      </Button>
                    </div>
                  )}

                  {/* Candidate DB Table */}
                  {renderCandidateTableSection(true)}
                </div>
              </div>

              {/* ==================== RIGHT 1/4 PANE (25%): SAAS AI CHATBOT COPILOT ==================== */}
              <aside className="flex min-w-[300px] flex-col bg-background/40">
                {/* Rightfit Split-Pane Sub-Header: h-12 (48px) | px-4 (16px) */}
                <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-gray-100/90 px-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md border border-border bg-card">
                      <Bot className="size-3.5 text-foreground" />
                    </span>
                    <div className="leading-none">
                      <span className="block text-xs font-semibold text-foreground">AI Scout Copilot</span>
                      <span className="font-mono text-[10px] text-muted-foreground">Evidence & filter engine</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={resetToAiHome}>
                    New
                  </Button>
                </div>

                {/* Scrollable SaaS Conversation Thread: p-4 space-y-4 */}
                <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="anim-slide-up space-y-1.5">
                      {msg.role === 'user' ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-end gap-1.5 px-1">
                            <span className="font-mono text-[10px] text-muted-foreground">{msg.timestamp}</span>
                            <span className="text-[11px] font-medium text-gray-1100">You</span>
                            <Avatar initials={app.currentUser.initials} size={24} />
                          </div>
                          <div className="ml-6 rounded-2xl rounded-tr-xs border border-border bg-secondary px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
                            {msg.text}
                          </div>
                        </div>
                      ) : (
                        /* Double-Bezel SaaS AI Copilot Card */
                        <div className="rounded-2xl border border-border bg-gray-100">
                          {/* Copilot Card Header */}
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                              <Sparkles className="size-3 text-gray-1000" />
                              <span>HeroScouter AI</span>
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground tnum">
                              {count} of {poolSize} match
                            </span>
                          </div>

                          {/* Copilot Card Inner Well (mx-1 mb-1 rounded-xl p-3 space-y-3) */}
                          <div className="mx-1 mb-1 space-y-3 rounded-xl border border-border bg-card p-3 text-xs">
                            {/* P7 Funnel Mini-Table (Show what the tool did) */}
                            <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-background/60 text-center">
                              <div className="px-2 py-1.5">
                                <span className="eyebrow block text-[9px] text-muted-foreground">POOL</span>
                                <span className="font-mono text-xs font-semibold text-foreground tnum">{poolSize}</span>
                              </div>
                              <div className="px-2 py-1.5">
                                <span className="eyebrow block text-[9px] text-muted-foreground">PASS</span>
                                <span className="font-mono text-xs font-semibold text-foreground tnum">{count}</span>
                              </div>
                              <div className="px-2 py-1.5">
                                <span className="eyebrow block text-[9px] text-muted-foreground">ASSUMED</span>
                                <span className="font-mono text-xs font-semibold text-foreground tnum">{assumedPassCount}</span>
                              </div>
                            </div>

                            <p className="leading-relaxed text-gray-1100">{msg.text}</p>

                            {/* Applied Criteria Badges */}
                            {msg.appliedLabels && msg.appliedLabels.length > 0 && (
                              <div className="flex flex-wrap gap-1 border-t border-border pt-2.5">
                                {msg.appliedLabels.map(lbl => (
                                  <span
                                    key={lbl}
                                    className="inline-flex h-5 items-center gap-1 rounded-xs border border-border bg-secondary px-1.5 font-mono text-[10px] text-foreground"
                                  >
                                    <Check className="size-2.5 text-gray-1000" />
                                    <span>{lbl}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* 1-Click SaaS Refinement Actions */}
                            {msg.suggestions && msg.suggestions.length > 0 && (
                              <div className="space-y-1.5 border-t border-border pt-2.5">
                                <span className="eyebrow block text-[9.5px] text-gray-1000">SUGGESTED REFINEMENTS</span>
                                <div className="flex flex-col gap-1">
                                  {msg.suggestions.map(s => (
                                    <button
                                      key={s.label}
                                      type="button"
                                      onClick={() => handleSendChatMessage(s.prompt)}
                                      className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-secondary cursor-pointer"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        {s.icon === 'shield' && <ShieldCheck className="size-3.5 shrink-0 text-gray-1000" />}
                                        {s.icon === 'clock' && <Clock className="size-3.5 shrink-0 text-gray-1000" />}
                                        {s.icon === 'dollar' && <DollarSign className="size-3.5 shrink-0 text-gray-1000" />}
                                        {s.icon === 'sparkle' && <Sparkles className="size-3.5 shrink-0 text-gray-1000" />}
                                        <span className="truncate">{s.label}</span>
                                      </span>
                                      <ArrowRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {chatThinking && (
                    <div className="anim-fade flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin text-foreground" />
                      <span>Re-evaluating 412 profiles & updating table…</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Sticky Bottom SaaS Chat Composer (Rightfit Sticky Footer Spacing: p-3 border-t) */}
                <div className="shrink-0 border-t border-border bg-gray-100/90 p-3">
                  <div className="rounded-2xl border border-border bg-background p-1">
                    <div className="rounded-xl border border-border bg-card p-2.5 focus-within:border-gray-900">
                      <textarea
                        aria-label="Follow-up prompt to refine candidates"
                        rows={2}
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendChatMessage()
                          }
                        }}
                        placeholder="Ask follow-up (e.g. “7+ years”, “US citizen”, “≤ $185k”)…"
                        className="w-full resize-none bg-transparent text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Open Manual Filter Console"
                            onClick={() => switchScreen('manual')}
                            className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-secondary px-2 text-[10.5px] text-gray-1100 hover:text-foreground cursor-pointer"
                          >
                            <SlidersHorizontal className="size-3" />
                            <span>Filters</span>
                          </button>
                          <button
                            type="button"
                            title="Select resume versions & bulk mask top matches for a role"
                            onClick={() => setBulkMaskCandIds(rows.slice(0, 3).map(r => r.id))}
                            className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-secondary px-2 text-[10.5px] text-gray-1100 hover:text-foreground cursor-pointer"
                          >
                            <Shield className="size-3" />
                            <span>Mask top 3</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Kbd>↵</Kbd>
                          <button
                            type="button"
                            aria-label="Send follow-up message"
                            onClick={() => handleSendChatMessage()}
                            className={cn(
                              'flex size-7 items-center justify-center rounded-full border transition-all cursor-pointer',
                              chatInput.trim()
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )
      ) : (
        /* ======================================================================
           SCREEN 2: MANUAL FILTERS & POOL
           Includes BOTH:
           1. Sheets-style FilterBar (N17: repeated column = OR, AND across columns) + Columns Menu (N18)
           2. 11-Dimension Structured Filter Console (expandable/collapsible)
           3. Table View (with row click opening S-08 Slide-Over Sidebar) & Split Detail View (CandidateSplitView)
           ====================================================================== */
        <div className="flex flex-1 flex-col gap-4">
          {/* Unified Double-Bezel Command & Filter Console (Sheets FilterBar + Quick Presets + Expandable 11-Dimension Grid) */}
          <section className="relative z-20 shrink-0 rounded-2xl border border-border bg-gray-100 p-1">
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {/* Row 1: Single-Line Unified Command Bar (Search · Quick Presets · 11-Dim Drawer Toggle · View Switcher · Export) */}
              <div className="flex h-12 flex-wrap items-center justify-between gap-2 rounded-t-xl bg-gray-100/90 px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative w-56">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      aria-label="Search the pool"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search name, company, skill…"
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  {/* Quick Saved Filter Presets */}
                  <div className="hidden items-center gap-1 lg:flex">
                    <span className="eyebrow mr-0.5 text-[9.5px] text-gray-1000">Presets:</span>
                    <button
                      type="button"
                      onClick={() => { setCats(['Product']); setSubs([]); setMore({ ...MORE_DEFAULT, metro: 'NYC', yearsMin: '5', skills: ['Payments'] }) }}
                      className="rounded-md border border-border bg-secondary/70 px-2 py-0.5 text-[11px] whitespace-nowrap text-gray-1100 hover:bg-secondary hover:text-foreground cursor-pointer"
                    >
                      NYC Fintech PMs
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCats(['Marketing']); setSubs(['Growth']); setMore({ ...MORE_DEFAULT, yearsMin: '5', includePredicted: true }) }}
                      className="rounded-md border border-border bg-secondary/70 px-2 py-0.5 text-[11px] whitespace-nowrap text-gray-1100 hover:bg-secondary hover:text-foreground cursor-pointer"
                    >
                      Growth 5y+
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCats(['Engineering']); setSubs(['Full-stack']); setMore({ ...MORE_DEFAULT, skills: ['React', 'TypeScript'] }) }}
                      className="rounded-md border border-border bg-secondary/70 px-2 py-0.5 text-[11px] whitespace-nowrap text-gray-1100 hover:bg-secondary hover:text-foreground cursor-pointer"
                    >
                      React/TS
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCats([]); setSubs([]); setMore({ ...MORE_DEFAULT, auth: ['US citizen', 'Green card'], sponsorship: 'No' }) }}
                      className="rounded-md border border-border bg-secondary/70 px-2 py-0.5 text-[11px] whitespace-nowrap text-gray-1100 hover:bg-secondary hover:text-foreground cursor-pointer"
                    >
                      No Sponsor
                    </button>
                  </div>
                </div>

                {/* Right Controls: 11-Dim Drawer Toggle + View Switcher + Copy/Export */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant={consoleExpanded ? 'primary' : 'outline'}
                    size="sm"
                    icon={<SlidersHorizontal />}
                    iconRight={consoleExpanded ? <ChevronUp /> : <ChevronDown />}
                    onClick={() => setConsoleExpanded(x => !x)}
                  >
                    11-Dim Grid{totalActiveFilters > 0 ? ` (${totalActiveFilters})` : ''}
                  </Button>
                  <Segmented
                    size="sm"
                    aria-label="View layout"
                    value={layout}
                    onChange={v => setLayout(v as 'table' | 'split')}
                    options={[
                      { value: 'table', label: 'Table' },
                      { value: 'split', label: 'Split' },
                    ]}
                  />
                  {copyMenu}
                  <Button variant="ghost" size="sm" icon={<Download />} onClick={() => app.toast(`Exported ${count} candidates to CSV`)}>CSV</Button>
                </div>
              </div>

              {/* Row 2: Sheets-Style Column FilterBar + Columns Menu + Single Authoritative Match Count */}
              <div className="bg-card px-2 py-1">
                {sheetsFilterBar}
              </div>

              {consoleExpanded && (
                <>
                  {/* ROW 1: Function Category · Specialty Track · Experience / Seniority */}
                  <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-[1.35fr_1.15fr_0.95fr] lg:divide-x lg:divide-y-0">
                    {/* Col 1: Category */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">1. FUNCTION / CATEGORY</span>
                        {cats.length > 0 && (
                          <button onClick={() => { setCats([]); setSubs([]) }} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                            All ({poolSize})
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Category">
                        {CATEGORIES.map(k => (
                          <FilterChip
                            key={k}
                            active={cats.includes(k)}
                            onClick={() => toggleCat(k)}
                            icon={<Briefcase className="size-3.5 text-muted-foreground" />}
                            count={cats.includes(k) ? undefined : POOL_BY_CATEGORY[k]}
                          >
                            {k}
                          </FilterChip>
                        ))}
                      </div>
                    </div>

                    {/* Col 2: Specialty / Sub-category */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">2. SPECIALTY / SUB-CATEGORY</span>
                        {subs.length > 0 && (
                          <button onClick={() => setSubs([])} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sub-category">
                        {(cats.length > 0
                          ? cats.flatMap(k => SUBCATEGORIES[k])
                          : ['B2B SaaS', 'Payments', 'Growth', 'Demand gen', 'Full-stack', 'Backend', 'Analytics', 'Product design']
                        ).map(s => (
                          <FilterChip
                            key={s}
                            active={subs.includes(s)}
                            onClick={() => setSubs(x => x.includes(s) ? x.filter(y => y !== s) : [...x, s])}
                          >
                            {s}
                          </FilterChip>
                        ))}
                      </div>
                    </div>

                    {/* Col 3: Tenure / Seniority */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">3. EXPERIENCE & TENURE</span>
                        {(more.yearsMin || more.yearsMax) && (
                          <button onClick={() => setMore(m => ({ ...m, yearsMin: '', yearsMax: '' }))} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                            Any
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { label: 'Any', min: '' },
                          { label: '3+ yrs', min: '3' },
                          { label: '5+ yrs', min: '5' },
                          { label: '7+ yrs', min: '7' },
                          { label: '8+ yrs', min: '8' },
                        ].map(Preset => (
                          <FilterChip
                            key={Preset.label}
                            active={more.yearsMin === Preset.min && !more.yearsMax}
                            onClick={() => setMore(m => ({ ...m, yearsMin: Preset.min, yearsMax: '' }))}
                          >
                            {Preset.label}
                          </FilterChip>
                        ))}
                        <div className="ml-auto flex items-center gap-1">
                          <Input
                            aria-label="Min years"
                            type="number"
                            min={0}
                            value={more.yearsMin}
                            onChange={e => setMore(m => ({ ...m, yearsMin: e.target.value }))}
                            placeholder="Min"
                            className="h-7 w-14 px-2 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <Input
                            aria-label="Max years"
                            type="number"
                            min={0}
                            value={more.yearsMax}
                            onChange={e => setMore(m => ({ ...m, yearsMax: e.target.value }))}
                            placeholder="Max"
                            className="h-7 w-14 px-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ROW 2: Location / Metro · Work Mode & Relocation · Work Authorization · Sponsorship */}
                  <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-[1.15fr_1.05fr_1.15fr_0.85fr] lg:divide-x lg:divide-y-0">
                    {/* Col 1: Metro / Location */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">4. LOCATION / METRO</span>
                        {more.metro !== 'Any' && (
                          <button onClick={() => setMore(m => ({ ...m, metro: 'Any' }))} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                            Any
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {['Any', 'NYC', 'SF Bay Area', 'Austin', 'Seattle', 'Remote'].map(loc => (
                          <FilterChip
                            key={loc}
                            active={more.metro === loc}
                            onClick={() => setMore(m => ({ ...m, metro: loc }))}
                          >
                            {loc}
                          </FilterChip>
                        ))}
                      </div>
                    </div>

                    {/* Col 2: Work Mode & Relocation */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">5. WORK MODE & RELOCATION</span>
                        {(more.modes.length > 0 || more.relocate !== 'Any') && (
                          <button onClick={() => setMore(m => ({ ...m, modes: [], relocate: 'Any' }))} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['Remote', 'Hybrid', 'Onsite'] as WorkMode[]).map(md => (
                          <FilterChip
                            key={md}
                            active={more.modes.includes(md)}
                            onClick={() => setMore(m => ({
                              ...m,
                              modes: m.modes.includes(md) ? m.modes.filter(x => x !== md) : [...m.modes, md],
                            }))}
                          >
                            {md}
                          </FilterChip>
                        ))}
                        <span className="mx-0.5 text-border">|</span>
                        <FilterChip
                          active={more.relocate === 'Yes'}
                          onClick={() => setMore(m => ({ ...m, relocate: m.relocate === 'Yes' ? 'Any' : 'Yes' }))}
                        >
                          Open to reloc
                        </FilterChip>
                      </div>
                    </div>

                    {/* Col 3: Work Authorization */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">6. WORK AUTHORIZATION</span>
                        {more.auth.length > 0 && (
                          <button onClick={() => setMore(m => ({ ...m, auth: [] }))} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                            All
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['US citizen', 'Green card', 'H-1B', 'STEM OPT', 'OPT'] as AuthOpt[]).map(a => (
                          <FilterChip
                            key={a}
                            active={more.auth.includes(a)}
                            onClick={() => setMore(m => ({
                              ...m,
                              auth: m.auth.includes(a) ? m.auth.filter(x => x !== a) : [...m.auth, a],
                            }))}
                          >
                            {a}
                          </FilterChip>
                        ))}
                      </div>
                    </div>

                    {/* Col 4: Sponsorship */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">7. SPONSORSHIP</span>
                      </div>
                      <Segmented
                        size="sm"
                        aria-label="Needs sponsorship"
                        value={more.sponsorship}
                        onChange={v => setMore(m => ({ ...m, sponsorship: v as More['sponsorship'] }))}
                        options={[
                          { value: 'Any', label: 'Any' },
                          { value: 'No', label: 'No sponsor' },
                          { value: 'Yes', label: 'Needs sponsor' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* ROW 3: Skills + ◇ AI Predicted · Target Pay Cap · Timing & Search Status · Profile Completeness */}
                  <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-[1.5fr_0.9fr_0.95fr_0.85fr] lg:divide-x lg:divide-y-0">
                    {/* Col 1: Explicit + AI-Predicted Skills */}
                    <div className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="eyebrow text-[10px] text-gray-1000">8. SKILLS & ◇ AI ADJACENCY GRAPH</span>
                        <button
                          type="button"
                          onClick={() => setMore(m => ({ ...m, includePredicted: !m.includePredicted }))}
                          className={cn(
                            'inline-flex h-5 items-center gap-1 rounded-xs border px-1.5 font-mono text-[10px] transition-colors cursor-pointer',
                            more.includePredicted
                              ? 'border-border bg-secondary text-foreground'
                              : 'border-border bg-background text-muted-foreground',
                          )}
                        >
                          <span>◇ Predicted skills: {more.includePredicted ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {POPULAR_SKILLS.map(sk => (
                          <FilterChip
                            key={sk}
                            active={more.skills.includes(sk)}
                            onClick={() => toggleSkill(sk)}
                          >
                            {sk}
                          </FilterChip>
                        ))}
                      </div>
                    </div>

                    {/* Col 2: Target Compensation Cap */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">9. TARGET PAY CAP</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {([
                          { v: 'Any', l: 'Any' },
                          { v: '160', l: '≤ $160k' },
                          { v: '185', l: '≤ $185k' },
                          { v: '205', l: '≤ $205k' },
                          { v: '225', l: '≤ $225k' },
                        ] as const).map(p => (
                          <FilterChip
                            key={p.v}
                            active={more.payMax === p.v}
                            onClick={() => setMore(m => ({ ...m, payMax: p.v }))}
                          >
                            {p.l}
                          </FilterChip>
                        ))}
                      </div>
                    </div>

                    {/* Col 3: Availability & Search Status */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">10. AVAILABILITY & INTENT</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['Active', 'Passive'] as const).map(st => (
                          <FilterChip
                            key={st}
                            active={more.search === st}
                            onClick={() => setMore(m => ({ ...m, search: m.search === st ? 'Any' : st }))}
                          >
                            {st}
                          </FilterChip>
                        ))}
                        <FilterChip
                          active={more.availability === 'Immediate'}
                          onClick={() => setMore(m => ({ ...m, availability: m.availability === 'Immediate' ? 'Any' : 'Immediate' }))}
                        >
                          Immediate
                        </FilterChip>
                        <FilterChip
                          active={more.availability === '2weeks'}
                          onClick={() => setMore(m => ({ ...m, availability: m.availability === '2weeks' ? 'Any' : '2weeks' }))}
                        >
                          ≤ 2 wks
                        </FilterChip>
                      </div>
                    </div>

                    {/* Col 4: Profile Completeness */}
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-[10px] text-gray-1000">11. COMPLETENESS</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {([
                          { v: 'Any', l: 'Any' },
                          { v: 'gte80', l: '80%+' },
                          { v: '50to79', l: '50–79%' },
                          { v: 'lt50', l: '<50%' },
                        ] as const).map(cp => (
                          <FilterChip
                            key={cp.v}
                            active={more.completeness === cp.v}
                            onClick={() => setMore(m => ({ ...m, completeness: cp.v }))}
                          >
                            {cp.l}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Bottom Status & Active Filter Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-xl bg-secondary/40 px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span aria-live="polite" className="font-mono font-semibold text-foreground tnum">
                    {count} candidate{count === 1 ? '' : 's'} match
                  </span>
                  <span className="text-muted-foreground">·</span>
                  {anyFilter ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cats.map(c => (
                        <span key={c} className="inline-flex h-5 items-center gap-1 rounded-xs border border-border bg-card px-1.5 text-[11px] text-foreground">
                          {c}
                          <button onClick={() => toggleCat(c)} className="text-muted-foreground hover:text-foreground">×</button>
                        </span>
                      ))}
                      {subs.map(s => (
                        <span key={s} className="inline-flex h-5 items-center gap-1 rounded-xs border border-border bg-card px-1.5 text-[11px] text-foreground">
                          {s}
                          <button onClick={() => setSubs(x => x.filter(y => y !== s))} className="text-muted-foreground hover:text-foreground">×</button>
                        </span>
                      ))}
                      {checks.map(ch => (
                        <span key={ch.label} className="inline-flex h-5 items-center rounded-xs border border-border bg-card px-1.5 text-[11px] text-gray-1100">
                          {ch.label}
                        </span>
                      ))}
                      <Button variant="link" className="h-5 px-1 text-xs" onClick={clearAll}>Clear all</Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Showing full talent pool · missing fields never hide candidates (P3)</span>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (chatMessages.length === 0) {
                      setChatMessages([
                        {
                          id: 'a-init',
                          role: 'assistant',
                          timestamp: 'Just now',
                          text: `Loaded ${count} candidates from your manual filter selection. Ask any follow-up here to refine the table on the left.`,
                        },
                      ])
                    }
                    setAiStage('results')
                    switchScreen('ai')
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline cursor-pointer"
                >
                  <Sparkles className="size-3.5" />
                  <span>Open in 3/4 Table + 1/4 AI Chat →</span>
                </button>
              </div>
            </div>
          </section>

          {/* Candidate DB Table (Full Table or Split View) */}
          {renderCandidateTableSection()}
        </div>
      )}

      {/* "Filter this column" — same filter state as the Sheets FilterBar */}
      <Dialog open={!!colField} onClose={closeColumnFilter} width={340} title={colField ? `Filter: ${colField.label}` : ''}
        description="Same filter as the bar above. OR inside a column, AND across columns."
        footer={<Button variant="primary" onClick={closeColumnFilter}>Done</Button>}>
        {colField && sheetsFilters[colField.key] && (
          <FilterPicker field={colField} rows={applyFilters(consoleFiltered, fields, sheetsFilters, colField.key)} value={sheetsFilters[colField.key]}
            onChange={v => setSheetsFilters(s => ({ ...s, [colField.key]: v }))}
            onRemove={() => { setSheetsFilters(s => { const n = { ...s }; delete n[colField.key]; return n }); setColFilter(null) }} />
        )}
      </Dialog>

      <CandidatePreview open={!!preview} onClose={() => setPreview(null)} candidateId={preview} list={rows.map(r => r.id)} onNavigate={setPreview} />
      <BulkMaskForRoleDialog
        open={bulkMaskCandIds !== null}
        onClose={() => setBulkMaskCandIds(null)}
        initialCandidateIds={bulkMaskCandIds ?? undefined}
        initialRoleId={aiAttachedRole !== 'none' ? aiAttachedRole : undefined}
      />
    </ScrollPage>
  )
}

/* ==========================================================================
   Local helpers
   ========================================================================== */

/** Controlled popover so wireframe states can show it open (portaled to document.body to prevent clipping). */
function ControlledPop({ open, onOpenChange, trigger, children, align = 'start', width = 320 }: {
  open: boolean; onOpenChange: (v: boolean) => void; trigger: React.ReactNode; children: React.ReactNode; align?: 'start' | 'end'; width?: number
}) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const updatePos = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const left = align === 'end'
      ? Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width))
      : Math.max(8, Math.min(window.innerWidth - width - 8, r.left))
    setPos({ top: r.bottom + 6, left })
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !panelRef.current?.contains(t)) onOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, onOpenChange]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{ width, top: pos.top, bottom: pos.bottom, left: pos.left }}
          onClick={e => e.stopPropagation()}
          className="anim-pop fixed z-[90] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background p-1 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.2)]"
        >
          <div className="rounded-xl border border-border bg-card">
            {children}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <h3 className="px-3 pt-2 pb-1.5 text-xs font-semibold">{title}</h3>
      <div className="mx-1 mb-1 rounded-lg border border-border bg-card p-2.5">{children}</div>
    </section>
  )
}

function MoreFiltersPanel({ value, onChange, metros, count, onClear, onDone }: {
  value: More; onChange: (m: More) => void; metros: string[]; count: number; onClear: () => void; onDone: () => void
}) {
  const set = <K extends keyof More>(k: K, v: More[K]) => onChange({ ...value, [k]: v })
  const toggle = <T extends string>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v]
  return (
    <div>
      <div className="no-scrollbar max-h-[60vh] space-y-1.5 overflow-y-auto p-1">
        <FilterGroup title="Location / metro">
          <Select aria-label="Location or metro" className="w-full" value={value.metro} onChange={v => set('metro', v)} options={['Any', ...metros]} />
        </FilterGroup>
        <FilterGroup title="Open to relocate">
          <Segmented size="sm" aria-label="Open to relocate" value={value.relocate} onChange={v => set('relocate', v)} options={['Any', 'Yes', 'No', 'Specific']} />
        </FilterGroup>
        <FilterGroup title="Work mode">
          <div className="flex flex-wrap gap-1.5">{(['Remote', 'Hybrid', 'Onsite'] as WorkMode[]).map(m => <FilterChip key={m} active={value.modes.includes(m)} onClick={() => set('modes', toggle(value.modes, m))}>{m}</FilterChip>)}</div>
        </FilterGroup>
        <FilterGroup title="Work authorization">
          <div className="flex flex-wrap gap-1.5">{(['US citizen', 'Green card', 'OPT', 'STEM OPT', 'H-1B'] as AuthOpt[]).map(a => <FilterChip key={a} active={value.auth.includes(a)} onClick={() => set('auth', toggle(value.auth, a))}>{a}</FilterChip>)}</div>
        </FilterGroup>
        <FilterGroup title="Needs sponsorship">
          <Segmented size="sm" aria-label="Needs sponsorship" value={value.sponsorship} onChange={v => set('sponsorship', v)} options={['Any', 'Yes', 'No']} />
        </FilterGroup>
        <FilterGroup title="Skills (explicit + ◇ AI predicted)">
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SKILLS.map(s => (
              <FilterChip key={s} active={value.skills.includes(s)} onClick={() => set('skills', toggle(value.skills, s))}>{s}</FilterChip>
            ))}
          </div>
        </FilterGroup>
        <FilterGroup title="Years of experience">
          <div className="flex items-center gap-2">
            <Input aria-label="Minimum years" type="number" min={0} value={value.yearsMin} onChange={e => set('yearsMin', e.target.value)} placeholder="Min" className="h-8" />
            <span className="text-muted-foreground">–</span>
            <Input aria-label="Maximum years" type="number" min={0} value={value.yearsMax} onChange={e => set('yearsMax', e.target.value)} placeholder="Max" className="h-8" />
          </div>
        </FilterGroup>
        <FilterGroup title="Search status">
          <Segmented size="sm" aria-label="Search status" value={value.search} onChange={v => set('search', v)} options={['Any', 'Active', 'Passive']} />
        </FilterGroup>
        <FilterGroup title="Completeness">
          <Segmented size="sm" aria-label="Completeness" value={value.completeness} onChange={v => set('completeness', v)}
            options={[{ value: 'Any', label: 'Any' }, { value: 'lt50', label: 'Under 50%' }, { value: '50to79', label: '50–79%' }, { value: 'gte80', label: '80%+' }]} />
        </FilterGroup>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-2 pt-2 pb-1">
        <Button variant="ghost" onClick={onClear}>Clear all</Button>
        <Button variant="outline" onClick={onDone}>Show <span className="font-mono tnum">{count}</span> candidates</Button>
      </div>
    </div>
  )
}

/** Phone intent: two-line cards, filters in a sheet, Copy list stays visible. */
function PhoneFrame({ rows, count, onOpen, onCopy, cats, onToggleCat }: {
  rows: Candidate[]; count: number; onOpen: (id: string) => void; onCopy: () => void; cats: Category[]; onToggleCat: (k: Category) => void
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="eyebrow flex items-center gap-1.5 text-[10px] text-gray-1000"><Smartphone className="size-3.5" />Phone · 390px</span>
      <div className="w-full max-w-[390px] overflow-hidden rounded-[28px] border border-border bg-background shadow-custom">
        <div className="space-y-3 border-b border-border p-3">
          <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
            {CATEGORIES.map(k => <FilterChip key={k} active={cats.includes(k)} onClick={() => onToggleCat(k)}>{k}</FilterChip>)}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<SlidersHorizontal />}>Filters</Button>
            <span className="font-mono text-xs tnum">{count} candidates</span>
            <Button variant="outline" size="sm" className="ml-auto" icon={<Copy />} onClick={onCopy}>Copy list</Button>
          </div>
        </div>
        <ul>
          {rows.slice(0, 8).map(c => (
            <li key={c.id}>
              <button onClick={() => onOpen(c.id)} className="flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left last:border-0 hover:bg-muted/60">
                <Avatar initials={c.initials} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate text-sm font-medium">{c.name}</span><span className="ml-auto"><CompletenessMeter compact value={c.completeness} /></span></div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.headline.split(' · ')[0]} · {c.years ?? '—'} yrs · {c.metro ?? <span className="text-[#b45309]">Not captured</span>} · {workAuthShort(c.workAuth) ?? <span className="text-[#b45309]">Not captured</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ---------- Master–Detail Split Grid Table + Structured Details Pane ---------- */
function CandidateSplitView({
  rows, totalPoolCount, active, onSelectActive, selected, onSelectedChange, onOpenProfile, onOpenSlideOver, onFindRoles, onMask,
}: {
  rows: Candidate[]
  totalPoolCount?: number
  active: Candidate | null
  onSelectActive: (c: Candidate) => void
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  onOpenProfile: (id: string) => void
  onOpenSlideOver: (id: string) => void
  onFindRoles: (id: string) => void
  onMask: (id: string) => void
}) {
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState<number>(1)
  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const clampedPage = Math.min(Math.max(1, page), totalPages)
  useEffect(() => {
    setPage(1)
  }, [rows.length, pageSize])

  const startIdx = (clampedPage - 1) * pageSize
  const endIdx = Math.min(totalRows, startIdx + pageSize)
  const visibleRows = rows.slice(startIdx, endIdx)
  const allSel = rows.length > 0 && selected.length === rows.length

  return (
    <section className="rounded-2xl border border-border bg-gray-100 p-1">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-[1.06fr_1fr] lg:divide-x lg:divide-y-0">
          {/* ==================== LEFT PANE: Locked-Height Scrollable Table ==================== */}
          <div className="flex min-w-0 flex-col">
            <div tabIndex={0} role="region" aria-label="Candidates split list" className="h-[calc(100vh-352px)] max-h-[calc(100vh-352px)] overflow-y-auto outline-none">
              <table className="w-full table-fixed border-separate border-spacing-0 text-left text-xs">
                <thead className="sticky top-0 z-20 bg-gray-100">
                  <tr className="h-10 divide-x divide-border bg-gray-100/95 text-gray-1000 [&>th]:border-b [&>th]:border-border">
                    <th className="w-9 px-2.5 py-2 align-middle">
                      <Checkbox
                        aria-label="Select all candidates"
                        checked={allSel}
                        onChange={v => onSelectedChange(v ? rows.map(r => r.id) : [])}
                      />
                    </th>
                    <th className="px-3.5 py-2 font-medium">
                      <span className="inline-flex items-center gap-2 text-xs text-gray-1100">
                        <Briefcase className="size-3.5 text-gray-900" />
                        <span>Candidate</span>
                      </span>
                    </th>
                    <th className="w-[104px] px-3 py-2 font-medium text-gray-1100">Category</th>
                    <th className="w-[88px] px-3 py-2 font-medium text-gray-1100">Updated</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:not(:last-child)>td]:border-b [&>tr:not(:last-child)>td]:border-border">
                  {visibleRows.map(c => {
                const isActive = active?.id === c.id
                const isSel = selected.includes(c.id)
                const authShort = workAuthShort(c.workAuth)
                const loc = c.city ?? c.metro ?? 'Location not captured'
                const mode = c.workModes ? c.workModes.join('/') : null
                const companyName = c.companies[0]?.name ?? c.subcategory
                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectActive(c)}
                    onDoubleClick={() => onOpenProfile(c.id)}
                    className={cn(
                      'divide-x divide-border cursor-pointer transition-colors',
                      isActive ? 'bg-secondary/80' : 'hover:bg-secondary/40',
                    )}
                  >
                    <td className="w-9 px-2.5 py-3 align-middle" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${c.name}`}
                        checked={isSel}
                        onChange={v => onSelectedChange(v ? [...selected, c.id] : selected.filter(x => x !== c.id))}
                      />
                    </td>
                    <td className="min-w-0 px-3.5 py-3 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar initials={c.initials} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold text-foreground">{c.name}</span>
                            {c.years !== null && (
                              <span className="shrink-0 font-mono text-[10.5px] text-gray-1000 tnum">· {c.years}y</span>
                            )}
                            {authShort && (
                              <span className="ml-auto hidden truncate rounded-xs border border-border bg-secondary/70 px-1.5 py-0.5 text-[10px] text-gray-1000 xl:inline-block">
                                {authShort}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                            {companyName} · {loc}{mode ? `, ${mode}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="w-[104px] px-3 py-3 align-middle whitespace-nowrap">
                      <span className="inline-flex h-5 items-center rounded-sm border border-border bg-secondary px-2 text-[11px] font-medium text-foreground">
                        {c.category}
                      </span>
                    </td>
                    <td className="w-[88px] px-3 py-3 align-middle whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1 font-mono text-[11px] text-muted-foreground tnum">
                        <span>{c.updated.replace(' days ago', 'd ago').replace(' weeks ago', 'w ago').replace(' week ago', '1w ago').replace('Yesterday', '1d ago')}</span>
                        <ChevronRight className={cn('size-3.5 shrink-0 transition-transform', isActive ? 'translate-x-0.5 text-foreground' : 'text-gray-800')} />
                      </div>
                    </td>
                  </tr>
                )
              })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==================== RIGHT PANE: Structured Candidate Details (Overview Grid + About + History) ==================== */}
          {active && (
            <div className="flex max-h-[460px] min-w-0 flex-col overflow-y-auto bg-background/40">
            {/* Top Bar: Details Header */}
            <div className="flex h-10 items-center justify-between border-b border-border bg-gray-100/90 px-4">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-1100">
                <Briefcase className="size-3.5 text-gray-900" />
                <span>Details</span>
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" icon={<PanelRightOpen />} onClick={() => onOpenSlideOver(active.id)}>
                  Slide-over
                </Button>
                <Button variant="ghost" size="sm" iconRight={<ExternalLink />} onClick={() => onOpenProfile(active.id)}>
                  Full profile
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {/* Candidate Identity & Action Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={active.initials} size={36} />
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-foreground">{active.name}</h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {active.companies[0] ? `${active.companies[0].title} · ${active.companies[0].name}` : active.headline}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground">
                    <Info className="size-3.5 text-gray-1000" />
                    <span>Profile ({active.completeness}%)</span>
                  </span>
                  <Button variant="outline" size="sm" icon={<Sparkles />} onClick={() => onFindRoles(active.id)}>
                    Roles
                  </Button>
                  <Button variant="outline" size="sm" icon={<FileText />} onClick={() => onMask(active.id)}>
                    Masked
                  </Button>
                </div>
              </div>

              {/* Card 1: Overview (FIELD | VALUE Grid Table with Row & Column Lines) */}
              <OverviewGrid
                title="Overview"
                rows={[
                  {
                    icon: <MapPin />,
                    field: 'Location',
                    value: (
                      <span>
                        {active.city ?? active.metro ?? <span className="text-[#b45309]">Not captured</span>}
                        {active.workModes ? <span className="text-muted-foreground"> / {active.workModes.join(', ')}</span> : null}
                      </span>
                    ),
                  },
                  {
                    icon: <Clock />,
                    field: 'Category',
                    value: (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-5 items-center rounded-sm border border-border bg-secondary px-2 text-[11px] font-medium text-foreground">
                          {active.category}
                        </span>
                        <span className="text-gray-1100">{active.subcategory}</span>
                      </div>
                    ),
                  },
                  {
                    icon: <Star />,
                    field: 'Experience',
                    value: active.years !== null ? `${active.years} years (${active.years >= 7 ? 'Senior' : active.years >= 4 ? 'Mid-Senior' : 'Mid-level'})` : <NotCaptured />,
                  },
                  {
                    icon: <ShieldCheck />,
                    field: 'Work Auth',
                    value: workAuthShort(active.workAuth) ? (
                      <span className="inline-flex h-5 items-center rounded-md border border-border bg-secondary px-2 text-[11px] font-medium text-gray-1100">
                        {workAuthShort(active.workAuth)}
                        {active.workAuth.expiryMonths ? ` · ${active.workAuth.expiryMonths} mo left` : ''}
                      </span>
                    ) : (
                      <NotCaptured />
                    ),
                  },
                  {
                    icon: <DollarSign />,
                    field: 'Target Pay',
                    value: active.pay ?? <NotCaptured />,
                  },
                  {
                    icon: <Calendar />,
                    field: 'Updated',
                    value: `${active.updated} · ${active.availability ?? 'Notice not captured'}`,
                  },
                ]}
              />

              {/* Card 2: About the Candidate */}
              <section className="rounded-2xl border border-border bg-gray-100">
                <h3 className="px-4 py-2.5 text-sm font-semibold text-foreground">About the candidate</h3>
                <div className="mx-1 mb-1 space-y-3 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-gray-1100">
                  <p>
                    {active.ourTake
                      ? active.ourTake
                      : `${active.name} is a ${active.headline.split(' · ')[0]} with ${active.years ?? 'several'} years of experience in ${active.subcategory.toLowerCase()}.`}
                    {active.achievements[0] ? ` Key highlight: ${active.achievements[0]}.` : ''}
                    {active.achievements[1] ? ` Additionally: ${active.achievements[1]}.` : ''}
                  </p>
                  {(active.skills.length > 0 || active.predicted.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                      {active.skills.map(s => (
                        <span key={s} className="inline-flex h-5 items-center rounded-sm border border-border bg-secondary px-2 text-[11px] text-foreground">
                          {s}
                        </span>
                      ))}
                      {active.predicted.map(p => (
                        <MatchChipView key={p.name} chip={{ kind: 'predicted', label: p.name, detail: p.basis }} />
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Card 3: Experience & Work History Table (Row & Column Divided) */}
              {active.companies.length > 0 && (
                <section className="rounded-2xl border border-border bg-gray-100">
                  <h3 className="px-4 py-2.5 text-sm font-semibold text-foreground">Work history</h3>
                  <div className="mx-1 mb-1 overflow-hidden rounded-xl border border-border bg-card">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="h-8 divide-x divide-border border-b border-border bg-secondary/50">
                          <th className="eyebrow px-3.5 py-1.5 text-[10px] font-medium text-gray-1000">Role & Company</th>
                          <th className="eyebrow px-3.5 py-1.5 text-[10px] font-medium text-gray-1000">Profile</th>
                          <th className="eyebrow w-[105px] px-3.5 py-1.5 text-[10px] font-medium text-gray-1000">Tenure</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {active.companies.map(co => (
                          <tr key={co.name + co.start} className="divide-x divide-border">
                            <td className="px-3.5 py-2.5 font-medium text-foreground">
                              {co.title} <span className="font-normal text-muted-foreground">· {co.name}</span>
                            </td>
                            <td className="px-3.5 py-2.5 text-gray-1100">{co.descriptor}</td>
                            <td className="w-[105px] px-3.5 py-2.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground tnum">
                              {co.start}–{co.end}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Bottom SaaS Page-Size ("Show in one go") & Pagination Footer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-gray-100/90 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">
              Showing <span className="font-mono font-semibold text-foreground tnum">{startIdx + 1}–{endIdx}</span> of{' '}
              <span className="font-mono font-semibold text-foreground tnum">{totalRows}</span>
              {totalPoolCount !== undefined && totalPoolCount > totalRows && (
                <span>
                  {' '}
                  (from <span className="font-mono text-foreground tnum">{totalPoolCount}</span> in pool)
                </span>
              )}
            </span>
            <span className="text-border">|</span>
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Show in one go:</span>
              <div role="group" aria-label="Results per page" className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                {[5, 10, 25, 50, 100].map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => { setPageSize(sz); setPage(1) }}
                    className={cn(
                      'h-6 rounded-md px-2 font-mono text-[11px] transition-colors tnum cursor-pointer',
                      pageSize === sz
                        ? 'border border-border bg-card font-semibold text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground tnum">
              Page <span className="text-foreground">{clampedPage}</span> of <span className="text-foreground">{totalPages}</span>
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={clampedPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
                <span>Prev</span>
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    'inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-2 font-mono text-xs transition-colors tnum cursor-pointer',
                    p === clampedPage
                      ? 'border-foreground bg-foreground font-semibold text-background'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={clampedPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
