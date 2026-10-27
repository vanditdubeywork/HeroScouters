import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Upload, FileText, X, ClipboardPaste, Sparkles, UserPlus, MessageSquareText, Link2, Table2, ExternalLink, Check,
  Layers, Video, Plus, FolderUp, Download,
} from 'lucide-react'
import { SplitPane, useTopBar } from '../shell/AppShell'
import { BezelCard, Button, ExampleMark, Field, Input, Segmented, Select, Tag, Textarea, cn } from '../components/ui'
import { AIStepper, Banner, CompletenessMeter, InfoNote, useRandomDemoStepper } from '../components/hs'
import { AskCard, ReadOnlyProfile, UpdateOrAnotherResumeDialog, orderedAsk } from './CandidateProfile'
import { useApp, useWireframeState } from '../store/AppStore'
import { outreachSheetCandidates } from '../data/mock'
import type { Candidate, Category } from '../data/types'

/* ==========================================================================
   S-06 · New candidate — Single Candidate (with AI Create + Optional Fathom Link)
          & Bulk Upload (Multiple Resumes or Sheet Import)
   ========================================================================== */

const WF_STATES = [
  { id: 'empty', label: 'Single candidate (live)' },
  { id: 'bulk-resumes', label: 'Bulk · Multiple resumes' },
  { id: 'sheet', label: 'Bulk · Import from sheet (US-50)' },
  { id: 'extracting', label: 'Extracting' },
  { id: 'extracted', label: 'Extracted' },
  { id: 'duplicate', label: 'Duplicate found' },
  { id: 'failed', label: 'Failed to read' },
]

const SINGLE_STEPS = [
  'Reading candidate resume & experience history',
  'Syncing optional Fathom call recording & transcript',
  'Extracting explicit skills + ◇ adjacent skill graph',
  'Checking pool for duplicates & building profile',
]

const BULK_RESUME_STEPS = [
  'Reading uploaded resume files in batch',
  'Extracting skills, tenure & work authorization',
  'Cross-checking 412 pool profiles for duplicates',
  'Building structured candidate profiles',
]

const BULK_SHEET_STEPS = [
  'Connecting to outreach sheet & parsing rows',
  'Fetching Google Drive, Dropbox & LinkedIn resume links',
  'Checking pool for existing emails & duplicates',
  'Creating candidate profiles from sheet',
]

type Phase = 'idle' | 'extracting' | 'done' | 'failed'
type PageMode = 'single' | 'bulk'
type SingleSourceMode = 'ai-box' | 'link' | 'upload'
type BulkSourceMode = 'resumes' | 'sheet'
type SourceKindOpt = Candidate['source']

const EXAMPLE_DRIVE_URL = 'https://drive.google.com/file/d/19xPriyaResume_v3/view'
const EXAMPLE_LINKEDIN_URL = 'https://linkedin.com/in/rohan-d-example'
const EXAMPLE_FATHOM_URL = 'https://fathom.video/share/rohan-d-intake-call-2026'

interface BulkResumeItem {
  id: string
  fileName: string
  pages: number
  sizeKb: number
  name: string
  headline: string
  category: Category
  years: number
  metro: string
  skills: string[]
  status: 'Ready to create' | 'Duplicate in pool'
}

const SAMPLE_BULK_RESUMES: BulkResumeItem[] = [
  {
    id: 'br-1',
    fileName: 'Rohan_D_Senior_PM_Resume.pdf',
    pages: 2,
    sizeKb: 184,
    name: 'Rohan D.',
    headline: 'Senior Product Manager · payments platform & APIs',
    category: 'Product',
    years: 7,
    metro: 'Seattle',
    skills: ['Payments', 'API products', 'Roadmapping', 'B2B SaaS'],
    status: 'Ready to create',
  },
  {
    id: 'br-2',
    fileName: 'Karan_V_Backend_Eng_Resume.pdf',
    pages: 2,
    sizeKb: 210,
    name: 'Karan V.',
    headline: 'Senior Backend Engineer · Go, PostgreSQL & distributed systems',
    category: 'Engineering',
    years: 6,
    metro: 'SF',
    skills: ['Go', 'PostgreSQL', 'Distributed systems', 'Payments'],
    status: 'Ready to create',
  },
  {
    id: 'br-3',
    fileName: 'Nadia_S_Product_Billing_Resume.docx',
    pages: 3,
    sizeKb: 142,
    name: 'Nadia S.',
    headline: 'Product Manager · B2B subscription & billing workflows',
    category: 'Product',
    years: 5,
    metro: 'NYC',
    skills: ['Billing', 'Subscriptions', 'B2B SaaS', 'SQL'],
    status: 'Ready to create',
  },
  {
    id: 'br-4',
    fileName: 'Priya_S_Resume_2026_v3.pdf',
    pages: 2,
    sizeKb: 196,
    name: 'Priya S.',
    headline: 'Senior Product Manager · B2B SaaS & fintech',
    category: 'Product',
    years: 7,
    metro: 'SF',
    skills: ['Payments', 'B2B SaaS', 'Roadmapping'],
    status: 'Duplicate in pool',
  },
]

const SHEET_DEFAULTS: Record<string, { cameInFor: string; roleId?: string; notes: string }> = {
  'sheet-1': { cameInFor: 'Backend Engineer — Harbor Health', roleId: 'harbor-be', notes: 'Replied on LinkedIn · open to hybrid SF' },
  'sheet-2': { cameInFor: 'Senior PM — Northwind Pay', roleId: 'northwind-spm', notes: 'Strong B2B subscription & billing background' },
  'sheet-3': { cameInFor: 'Senior PM — Northwind Pay', roleId: 'northwind-spm', notes: 'Updated Drive resume link from outreach reply' },
}

/** Draft built from the example resume or link (fictional, §16 style) */
function draftNew(opts: { source: SourceKindOpt; role: string; notes: string; linkUrl?: string; linkedinUrl?: string; fathomUrl?: string }): Candidate {
  const links: NonNullable<Candidate['sourceLinks']> = []
  if (opts.linkUrl?.trim()) {
    links.push({
      label: 'Google Drive resume',
      url: opts.linkUrl.trim(),
      addedAt: 'Just now',
    })
  }
  if (opts.linkedinUrl?.trim()) {
    links.push({
      label: 'LinkedIn profile',
      url: opts.linkedinUrl.trim(),
      addedAt: 'Just now',
    })
  }
  if (opts.fathomUrl?.trim()) {
    links.push({
      label: 'Fathom call recording',
      url: opts.fathomUrl.trim(),
      addedAt: 'Just now',
    })
  }
  return {
    id: 'rohand', name: 'Rohan D.', initials: 'RD', example: true,
    headline: 'Senior Product Manager · payments platform & APIs',
    category: 'Product', subcategory: 'Product Manager', years: 7,
    domains: ['Payments/Fintech', 'B2B SaaS'],
    city: 'Seattle, WA', metro: 'Seattle',
    workModes: opts.fathomUrl?.trim() ? ['Hybrid', 'Remote'] : null,
    relocate: opts.fathomUrl?.trim() ? 'Yes' : null,
    locationsOpen: opts.fathomUrl?.trim() ? ['Seattle', 'SF'] : [],
    companyPrefs: [],
    workAuth: { status: opts.fathomUrl?.trim() ? 'US citizen' : null },
    pay: opts.fathomUrl?.trim() ? '$185k–$205k + $25k var' : null,
    fixedPayMin: opts.fathomUrl?.trim() ? 185 : null,
    fixedPayMax: opts.fathomUrl?.trim() ? 205 : null,
    variablePay: opts.fathomUrl?.trim() ? 25 : null,
    lastRun: 'Just now',
    availability: opts.fathomUrl?.trim() ? '2 weeks' : null,
    searchStatus: 'Active',
    skills: ['Payments', 'API products', 'Roadmapping', 'Pricing', 'B2B SaaS'],
    predicted: [{ name: 'SQL', basis: 'from Mode + Snowflake reporting work, 3 yrs', strength: 'Medium' }],
    tools: ['Jira', 'Mode', 'Figma'],
    companies: [
      { name: 'Remitly', descriptor: 'Public US fintech, 2,500+ people', title: 'Senior Product Manager, Payouts', start: '2021', end: 'Present' },
      { name: 'Avalara', descriptor: 'Tax-compliance SaaS, 4,000+ people', title: 'Product Manager, APIs', start: '2018', end: '2021' },
    ],
    achievements: ['Launched real-time payouts in 9 corridors; failed transfers down 27%', 'Rebuilt partner API onboarding from 6 weeks to 9 days'],
    education: { degree: 'BS', field: 'Computer Engineering', school: 'University of Washington' },
    completeness: opts.fathomUrl?.trim() ? 82 : 41,
    askList: opts.fathomUrl?.trim()
      ? ['Which companies are you currently interviewing with?']
      : ['Are you open to relocating? Where to?', 'Are you on a visa? Which one, and when does it expire?', 'Would you need sponsorship or a transfer?', 'Remote, hybrid or onsite?', 'What pay range are you looking for?', 'How soon could you start?'],
    updated: 'Just now', source: opts.source, cameInForRole: opts.role || undefined, resumeVersion: 1, lastContacted: 'Today',
    email: 'rohan.d@example.com', phone: '+1 206 555 0187', linkedin: opts.linkedinUrl?.trim() || 'linkedin.com/in/rohan-d-example',
    ourTake: opts.notes || undefined,
    sourceLinks: links.length ? links : undefined,
    calls: opts.fathomUrl?.trim()
      ? [{ id: 'call-rohan-1', label: 'Fathom intake call', when: 'Just now', by: 'Vandit D.' }]
      : undefined,
    fieldSources: {
      headline: 'RESUME',
      years: 'RESUME',
      city: 'RESUME',
      category: 'RESUME',
      domains: 'RESUME',
      ...(opts.fathomUrl?.trim() ? { pay: 'CALL', availability: 'CALL', relocate: 'CALL', workModes: 'CALL' } : {}),
    },
  }
}

/** Duplicate case: a newer resume for Priya S. */
function draftDup(base: Candidate | undefined, linkUrl?: string): Candidate {
  const p = base ?? draftNew({ source: 'Outreach', role: '', notes: '' })
  const nextLinks = linkUrl?.trim()
    ? [{ label: 'Google Drive resume', url: linkUrl.trim(), addedAt: 'Just now' }, ...(p.sourceLinks ?? [])]
    : p.sourceLinks
  return { ...p, id: 'priya-new', resumeVersion: 1, updated: 'Just now', relocate: null, completeness: 58, sourceLinks: nextLinks, example: true }
}

export function NewCandidate() {
  const app = useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialPageMode: PageMode = searchParams.get('mode') === 'bulk' ? 'bulk' : 'single'
  const [pageMode, setPageMode] = useState<PageMode>(initialPageMode)
  const [singleMode, setSingleMode] = useState<SingleSourceMode>('ai-box')
  const [bulkMode, setBulkMode] = useState<BulkSourceMode>(
    searchParams.get('bulkType') === 'sheet' ? 'sheet' : 'resumes'
  )

  useTopBar(
    [
      { label: 'Candidates', to: '/candidates' },
      { label: pageMode === 'bulk' ? 'Upload candidates in bulk' : 'Add new candidate' },
    ],
    undefined,
    [pageMode],
  )
  const [wf] = useWireframeState('S-06', 'New candidate', WF_STATES, 'empty')

  // Single candidate state
  const [aiSingleText, setAiSingleText] = useState('')
  const [createActionReady, setCreateActionReady] = useState(true)
  const [fathomUrl, setFathomUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [file, setFile] = useState<string | null>(null)
  const [paste, setPaste] = useState('')
  const [showPasteText, setShowPasteText] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [role, setRole] = useState('')
  const [source, setSource] = useState<SourceKindOpt>('Outreach')
  const [notes, setNotes] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [dup, setDup] = useState(false)
  const [dupDismissed, setDupDismissed] = useState(false)
  const [dlg, setDlg] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Bulk upload state (Multiple resumes + Sheet)
  const [bulkResumes, setBulkResumes] = useState<BulkResumeItem[]>(SAMPLE_BULK_RESUMES)
  const [bulkPhase, setBulkPhase] = useState<'idle' | 'extracting' | 'done'>('idle')
  const [sheetPhase, setSheetPhase] = useState<'idle' | 'extracting'>('idle')
  const [sheetUrl, setSheetUrl] = useState('')
  const [sheetFile, setSheetFile] = useState<string | null>(null)
  const [sheetPaste, setSheetPaste] = useState('')
  const [sheetLoaded, setSheetLoaded] = useState(true)
  const multiResumeInputRef = useRef<HTMLInputElement>(null)
  const sheetFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const m = searchParams.get('mode')
    if (m === 'bulk' || m === 'single') setPageMode(m)
    const bt = searchParams.get('bulkType')
    if (bt === 'sheet' || bt === 'resumes') setBulkMode(bt)
  }, [searchParams])

  const switchPageMode = (next: PageMode) => {
    setPageMode(next)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('mode', next)
    setSearchParams(nextParams, { replace: true })
  }

  const frozen = wf === 'extracting'
  const { step, done } = useRandomDemoStepper(SINGLE_STEPS.length, phase === 'extracting' && !frozen, 3200, 5600)
  useEffect(() => {
    if (done) {
      setPhase('done')
      app.toast(fathomUrl.trim() ? 'Profile extracted from resume + Fathom call link' : 'Profile extracted from resume')
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [done])

  const { step: bulkStep, done: bulkDone } = useRandomDemoStepper(BULK_RESUME_STEPS.length, bulkPhase === 'extracting', 3200, 5600)
  useEffect(() => {
    if (bulkDone) {
      setBulkPhase('done')
      app.toast(`Extracted ${bulkResumes.length} candidate profiles from resumes`)
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [bulkDone])

  const { step: sheetStep, done: sheetDone } = useRandomDemoStepper(BULK_SHEET_STEPS.length, sheetPhase === 'extracting', 3200, 5600)
  useEffect(() => {
    if (sheetDone) {
      setSheetPhase('idle')
      finalizeSheetImport()
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [sheetDone])

  // Apply wireframe presets when the reviewer picks a state
  useEffect(() => {
    setDupDismissed(false)
    if (wf === 'empty') {
      setPageMode(searchParams.get('mode') === 'bulk' ? 'bulk' : 'single')
      setSingleMode('ai-box'); setLinkUrl(''); setLinkedinUrl(''); setFile(null); setPaste(''); setShowPasteText(false); setPhase('idle'); setDup(false)
    }
    if (wf === 'bulk-resumes') {
      setPageMode('bulk'); setBulkMode('resumes'); setBulkResumes(SAMPLE_BULK_RESUMES); setBulkPhase('done')
    }
    if (wf === 'sheet') {
      setPageMode('bulk'); setBulkMode('sheet'); setSheetLoaded(true); setPhase('idle'); setDup(false)
    }
    if (wf === 'extracting') {
      setPageMode('single'); setSingleMode('link'); setLinkUrl(EXAMPLE_DRIVE_URL); setPhase('extracting'); setDup(false)
    }
    if (wf === 'extracted') {
      setPageMode('single'); setSingleMode('ai-box'); setLinkUrl(EXAMPLE_DRIVE_URL); setLinkedinUrl(EXAMPLE_LINKEDIN_URL); setFathomUrl(EXAMPLE_FATHOM_URL); setPhase('done'); setDup(false)
    }
    if (wf === 'duplicate') {
      setPageMode('single'); setSingleMode('upload'); setFile('Priya_S_resume_2026.pdf'); setShowPasteText(false); setPhase('done'); setDup(true)
    }
    if (wf === 'failed') {
      setPageMode('single'); setSingleMode('upload'); setFile('scan_0412.pdf'); setShowPasteText(false); setPhase('failed'); setDup(false)
    }
  }, [wf, searchParams])

  const hasSingleSource =
    singleMode === 'ai-box'
      ? (aiSingleText.trim().length > 10 || !!file || linkUrl.trim().length > 8)
      : singleMode === 'link'
        ? linkUrl.trim().length > 8
        : (!!file || paste.trim().length > 40)

  const priya = app.candidate('priya')
  const draft = dup ? draftDup(priya, linkUrl) : draftNew({ source, role, notes, linkUrl, linkedinUrl, fathomUrl })
  const showDup = dup && !dupDismissed && phase === 'done'

  const pickFile = (name: string) => {
    setFile(name); setPhase('idle')
    setDup(/priya/i.test(name))
  }

  const createSingle = () => {
    if (!hasSingleSource) {
      setAiSingleText('Rohan D. · Senior Product Manager (7 yrs, Remitly & Avalara) · Seattle, WA · Payments platform, API products, Roadmapping, B2B SaaS')
      setLinkUrl(EXAMPLE_DRIVE_URL)
    }
    if (singleMode === 'upload' && showPasteText) setDup(/priya/i.test(paste))
    else if (singleMode === 'ai-box') setDup(/priya/i.test(aiSingleText))
    else setDup(false)
    setDupDismissed(false)
    setPhase('extracting')
  }

  const useExampleDriveLink = () => {
    setLinkUrl(EXAMPLE_DRIVE_URL)
    setLinkedinUrl(EXAMPLE_LINKEDIN_URL)
    setAiSingleText('Rohan D. · Senior Product Manager (7 yrs, Remitly & Avalara) · Seattle, WA · Payments platform, API products, Roadmapping, B2B SaaS')
    setDup(false)
    setDupDismissed(false)
    setPhase('extracting')
  }

  const useExampleFile = () => {
    setSingleMode('upload')
    setShowPasteText(false)
    pickFile('Rohan_D_resume.pdf')
  }

  const saveSingle = (thenRoles: boolean) => {
    const linkItem = {
      label: 'Google Drive resume',
      url: linkUrl.trim() || EXAMPLE_DRIVE_URL,
      addedAt: 'Just now',
    }
    const sourceLinks = [
      linkItem,
      ...(linkedinUrl.trim() ? [{ label: 'LinkedIn profile', url: linkedinUrl.trim(), addedAt: 'Just now' }] : []),
      ...(fathomUrl.trim() ? [{ label: 'Fathom call recording', url: fathomUrl.trim(), addedAt: 'Just now' }] : []),
    ]

    const base: Candidate = {
      ...draft,
      source,
      cameInForRole: role || undefined,
      ourTake: notes || draft.ourTake,
      sourceLinks,
    }
    const id = app.candidate(base.id) ? `${base.id}${app.candidates.length}` : base.id
    app.addCandidate({ ...base, id })
    app.log({
      what: fathomUrl.trim() ? 'Created profile from resume + Fathom call link' : 'Created profile from resume',
      record: base.name,
      recordHref: `/candidates/${id}`,
      kind: 'Candidates',
    })
    app.toast(`Saved ${base.name}`)
    navigate(`/candidates/${id}${thenRoles ? '?tab=roles' : ''}`)
  }

  const handleAddBulkFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const added: BulkResumeItem[] = Array.from(files).map((f, i) => {
      const baseName = f.name.replace(/\.(pdf|docx?)$/i, '').replace(/[_-]+/g, ' ')
      const isPriya = /priya/i.test(f.name)
      return {
        id: `br-upload-${Date.now()}-${i}`,
        fileName: f.name,
        pages: 2,
        sizeKb: Math.max(95, Math.round(f.size / 1024) || 160),
        name: isPriya ? 'Priya S.' : baseName.split(' ').slice(0, 2).join(' ') || `Candidate ${bulkResumes.length + i + 1}`,
        headline: 'Product & Engineering · extracted from resume',
        category: 'Product',
        years: 6,
        metro: 'SF',
        skills: ['B2B SaaS', 'Product strategy', 'SQL'],
        status: isPriya ? 'Duplicate in pool' : 'Ready to create',
      }
    })
    setBulkResumes(prev => [...prev, ...added])
    setBulkPhase('idle')
  }

  const commitBulkResumes = () => {
    let createdCount = 0
    bulkResumes.forEach((item, idx) => {
      if (item.status === 'Duplicate in pool') {
        const existing = app.candidate('priya')
        if (existing) {
          app.updateCandidate('priya', { updated: 'Just now', resumeVersion: (existing.resumeVersion ?? 1) + 1 })
        }
        return
      }
      const initials = item.name.split(' ').map(s => s[0]).join('').replace('.', '').slice(0, 2).toUpperCase()
      const candId = item.name.toLowerCase().replace(/[^a-z]/g, '') || `bulk-${idx}`
      if (app.candidate(candId)) return
      createdCount++
      app.addCandidate({
        id: candId,
        name: item.name,
        initials,
        example: true,
        headline: item.headline,
        category: item.category,
        subcategory: item.category === 'Engineering' ? 'Backend' : 'Product Manager',
        years: item.years,
        domains: ['Payments/Fintech', 'B2B SaaS'],
        city: item.metro === 'NYC' ? 'New York, NY' : item.metro === 'Seattle' ? 'Seattle, WA' : 'San Francisco, CA',
        metro: item.metro,
        workModes: ['Hybrid', 'Remote'],
        relocate: null,
        locationsOpen: [item.metro],
        companyPrefs: [],
        workAuth: { status: null },
        pay: null,
        availability: null,
        searchStatus: 'Active',
        skills: item.skills,
        predicted: [],
        tools: [],
        companies: [],
        achievements: [],
        completeness: 52,
        askList: ['Are you on a visa? Which one, and when does it expire?', 'What pay range are you looking for?'],
        updated: 'Just now',
        source,
        cameInForRole: role || undefined,
        resumeVersion: 1,
        lastContacted: 'Today',
        email: `${candId}@example.com`,
        ourTake: notes || undefined,
        fieldSources: { headline: 'RESUME', years: 'RESUME', city: 'RESUME', category: 'RESUME' },
      })
    })
    app.log({
      what: `Bulk uploaded ${bulkResumes.length} resumes (${createdCount} new profiles, 1 updated)`,
      record: bulkResumes.map(r => r.name).join(', '),
      recordHref: '/candidates',
      kind: 'Candidates',
    })
    app.toast(`Created ${createdCount} candidates from bulk resume upload`)
    navigate('/candidates')
  }

  const finalizeSheetImport = () => {
    outreachSheetCandidates.forEach((row, idx) => {
      if (row.status === 'Duplicate in pool') {
        const existing = app.candidate('priya')
        if (existing) {
          const linkObj = { label: 'Google Drive resume', url: row.link, addedAt: 'Just now' }
          app.updateCandidate('priya', {
            updated: 'Just now',
            sourceLinks: [linkObj, ...(existing.sourceLinks ?? []).filter(l => l.url !== row.link)],
          })
        }
        return
      }
      const meta = SHEET_DEFAULTS[row.id]
      const initials = row.name.split(' ').map(s => s[0]).join('').replace('.', '').slice(0, 2).toUpperCase()
      const candId = row.name.toLowerCase().replace(/[^a-z]/g, '') || `sheet-${idx}`
      if (app.candidate(candId)) return
      const linkObj = { label: 'Google Drive resume', url: row.link, addedAt: 'Just now' }
      app.addCandidate({
        id: candId,
        name: row.name,
        initials,
        example: true,
        headline: row.headline,
        category: row.category,
        subcategory: row.category === 'Engineering' ? 'Backend' : 'Product Manager',
        years: row.years,
        domains: ['Payments/Fintech', 'B2B SaaS'],
        city: row.metro === 'NYC' ? 'New York, NY' : 'San Francisco, CA',
        metro: row.metro,
        workModes: ['Hybrid'],
        relocate: null,
        locationsOpen: [row.metro],
        companyPrefs: [],
        workAuth: { status: null },
        pay: null,
        availability: null,
        searchStatus: 'Active',
        skills: row.category === 'Engineering' ? ['Go', 'PostgreSQL', 'Payments'] : ['Payments', 'Billing', 'B2B SaaS'],
        predicted: [],
        tools: [],
        companies: [],
        achievements: [],
        completeness: 46,
        askList: ['Are you on a visa? Which one, and when does it expire?', 'What pay range are you looking for?'],
        updated: 'Just now',
        source: 'Outreach',
        cameInForRole: role || meta?.roleId,
        resumeVersion: 1,
        lastContacted: 'Today',
        email: `${candId}@example.com`,
        ourTake: meta?.notes,
        sourceLinks: [linkObj],
        fieldSources: { headline: 'RESUME', years: 'RESUME', city: 'RESUME', category: 'RESUME' },
      })
    })
    app.log({
      what: 'Imported 3 candidates from outreach sheet links',
      record: 'Karan V., Nadia S., Priya S.',
      recordHref: '/candidates',
      kind: 'Candidates',
    })
    app.toast('Imported 3 candidates from outreach sheet links')
    navigate('/candidates')
  }

  const importSheetRows = () => {
    setSheetPhase('extracting')
  }

  const roleOptions = [{ value: '', label: 'No specific role' }, ...app.roles.filter(r => r.status === 'Open').map(r => ({ value: r.id, label: `${r.title} — ${r.company}` }))]

  /* ---------- Top SaaS Mode Bar (matches RoleEditor topModeBar geometry) ---------- */
  const topModeBar = (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-background px-6 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-foreground">
          {pageMode === 'bulk' ? 'Upload candidates in bulk' : 'Add new candidate'}
        </span>
        <ExampleMark />
      </div>

      {/* Centered Double-Bezel Pill Switcher */}
      <div role="tablist" aria-label="Candidate intake mode" className="inline-flex items-center gap-1 rounded-2xl border border-border bg-gray-100 p-1 shadow-custom">
        <button
          role="tab"
          type="button"
          aria-selected={pageMode === 'single'}
          onClick={() => switchPageMode('single')}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-xl px-3.5 text-xs btn-type transition-all cursor-pointer',
            pageMode === 'single'
              ? 'border border-border bg-card text-foreground shadow-2xs'
              : 'border border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <UserPlus className="size-3.5" />
          <span>Add new candidate</span>
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={pageMode === 'bulk'}
          onClick={() => switchPageMode('bulk')}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-xl px-3.5 text-xs btn-type transition-all cursor-pointer',
            pageMode === 'bulk'
              ? 'border border-border bg-card text-foreground shadow-2xs'
              : 'border border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Layers className="size-3.5" />
          <span>Upload candidates in bulk</span>
          <span className="rounded-xs border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
            Sheet / Resumes
          </span>
        </button>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/candidates')}>
          Back to pool
        </Button>
      </div>
    </div>
  )

  /* ---------- Left pane ---------- */
  const left = pageMode === 'bulk' ? (
    <div className="anim-fade space-y-6">
      <BezelCard
        icon={bulkMode === 'resumes' ? <FolderUp /> : <Table2 />}
        title={
          <span className="flex items-center gap-2">
            Bulk candidate upload
            <span className="eyebrow text-[9px] text-gray-1000">Sheet or Multiple Resumes</span>
          </span>
        }
        action={
          <Segmented
            size="sm"
            aria-label="Bulk upload source"
            value={bulkMode}
            onChange={m => setBulkMode(m)}
            options={[
              { value: 'resumes', label: 'Multiple resumes' },
              { value: 'sheet', label: 'Add a sheet' },
            ]}
          />
        }
      >
        {bulkMode === 'resumes' ? (
          <div className="anim-fade space-y-4">
            {/* Multi-resume dropzone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => multiResumeInputRef.current?.click()}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  multiResumeInputRef.current?.click()
                }
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                handleAddBulkFiles(e.dataTransfer.files)
              }}
              className={cn(
                'group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed px-6 py-7 text-center transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                dragOver ? 'border-gray-1100 bg-muted scale-[0.995]' : 'border-gray-700 bg-background hover:border-gray-800 hover:bg-muted/40',
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-gray-100 p-1 shadow-custom transition-transform duration-200 group-hover:-translate-y-0.5">
                <span className="flex size-full items-center justify-center rounded-lg border border-border bg-card">
                  <Upload className="size-4 text-foreground" />
                </span>
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Drop multiple resumes here, or click to browse</p>
                <p className="text-xs text-muted-foreground">Upload up to 25 PDF or DOCX resumes at once · AI extracts every profile automatically</p>
              </div>
              <input
                ref={multiResumeInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={e => handleAddBulkFiles(e.target.files)}
              />
            </div>

            {/* Queued resume files list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-[10px] text-gray-1000">
                  QUEUED RESUME FILES ({bulkResumes.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBulkResumes(SAMPLE_BULK_RESUMES)
                      setBulkPhase('idle')
                    }}
                  >
                    Load 4 sample resumes
                  </Button>
                  {bulkResumes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBulkResumes([])
                        setBulkPhase('idle')
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {bulkResumes.length > 0 ? (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                  {bulkResumes.map((item, idx) => (
                    <li
                      key={item.id}
                      style={{ animationDelay: `${idx * 45}ms` }}
                      className="anim-slide-up flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs transition-colors hover:bg-secondary/30"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                          <FileText className="size-4 text-muted-foreground" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-foreground">{item.fileName}</span>
                            <Tag tone={item.status === 'Duplicate in pool' ? 'outline' : 'neutral'}>
                              {item.status}
                            </Tag>
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {item.name} · {item.headline} · {item.pages}p ({item.sizeKb} KB)
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${item.fileName}`}
                        icon={<X />}
                        onClick={() => setBulkResumes(prev => prev.filter(x => x.id !== item.id))}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                  No resumes selected yet. Drop PDF/DOCX files above or click “Load 4 sample resumes”.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                icon={<Plus />}
                onClick={() => multiResumeInputRef.current?.click()}
              >
                Add more files
              </Button>
              <Button
                variant="primary"
                icon={<Sparkles />}
                disabled={bulkResumes.length === 0 || bulkPhase === 'extracting'}
                onClick={() => setBulkPhase('extracting')}
              >
                {bulkPhase === 'done'
                  ? `Re-extract ${bulkResumes.length} resumes`
                  : `Extract ${bulkResumes.length} resumes with AI`}
              </Button>
            </div>
          </div>
        ) : (
          /* Bulk Mode 2: Add a sheet in a set format (like Smartlead — Google Sheet link, CSV/XLSX upload, or paste rows) */
          <div className="anim-fade space-y-4">
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="eyebrow">Smartlead-style set sheet format</span>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Upload or link a sheet using our standardized column header format (auto-mapped like Smartlead).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download />}
                  onClick={() => {
                    const cols = ['Full Name', 'Email', 'Headline', 'Category', 'Years', 'Location', 'Work Auth / Visa', 'Fixed Pay Min ($k)', 'Fixed Pay Max ($k)', 'Variable Pay ($k)', 'Resume Link (Drive/Dropbox)', 'LinkedIn URL', 'Fathom Call Link']
                    const sample = ['Karan V.', 'karan.v@example.com', 'Senior Backend Engineer · Go & Postgres', 'Engineering', '6', 'San Francisco, CA', 'H-1B (Transfer)', '175', '195', '25', 'https://drive.google.com/file/d/18aKaranResume/view', 'https://linkedin.com/in/karan-v', 'https://fathom.video/share/karan-intake']
                    const csv = `${cols.map(c => `"${c}"`).join(',')}\n${sample.map(v => `"${v}"`).join(',')}\n`
                    try {
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'heroscouter-candidates-smartlead-template.csv'
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch {
                      /* ignore in headless */
                    }
                    app.toast('Downloaded heroscouter-candidates-smartlead-template.csv')
                  }}
                >
                  Download CSV template
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Full Name', req: true },
                  { label: 'Email', req: true },
                  { label: 'Resume Link (Drive / Dropbox)', req: true },
                  { label: 'LinkedIn URL', req: false },
                  { label: 'Category', req: true },
                  { label: 'Years', req: false },
                  { label: 'Location', req: false },
                  { label: 'Work Auth / Visa', req: false },
                  { label: 'Fixed Pay ($k)', req: false },
                  { label: 'Variable Pay ($k)', req: false },
                  { label: 'Fathom Call Link', req: false },
                ].map(col => (
                  <span
                    key={col.label}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]',
                      col.req
                        ? 'border-foreground/25 bg-background font-medium text-foreground'
                        : 'border-border bg-background/60 text-muted-foreground',
                    )}
                  >
                    <span>{col.label}</span>
                    {col.req && <span className="font-mono text-[9px] text-emerald-400">req</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Google Sheet URL or upload CSV / XLSX" hint="Connect a live outreach sheet or upload a spreadsheet of candidates.">
                <Input
                  aria-label="Google Sheet link"
                  value={sheetUrl}
                  onChange={e => { setSheetUrl(e.target.value); if (e.target.value.trim()) setSheetLoaded(true) }}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  icon={<Upload />}
                  onClick={() => sheetFileInputRef.current?.click()}
                >
                  {sheetFile ? sheetFile : 'Upload CSV / XLSX'}
                </Button>
                <input
                  ref={sheetFileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setSheetFile(f.name)
                      setSheetLoaded(true)
                      app.toast(`Loaded sheet ${f.name}`)
                    }
                  }}
                />
              </div>
            </div>

            <Field label="Or paste outreach sheet rows" hint="Paste rows copied from your sheet (Name, Headline, Drive/Dropbox/LinkedIn link, Role, Notes).">
              <Textarea
                aria-label="Outreach sheet rows"
                value={sheetPaste}
                onChange={e => { setSheetPaste(e.target.value); if (e.target.value.trim()) setSheetLoaded(true) }}
                placeholder="Paste rows from your Google Sheet or CSV, or load the 3 sample rows below…"
                className="min-h-20 font-mono text-xs"
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Table2 />}
                onClick={() => {
                  setSheetLoaded(true)
                  setSheetPaste(
                    outreachSheetCandidates
                      .map(r => `${r.nameLabel ?? r.name}\t${r.headline}\t${r.link}\t${SHEET_DEFAULTS[r.id]?.cameInFor ?? ''}\t${SHEET_DEFAULTS[r.id]?.notes ?? ''}`)
                      .join('\n')
                  )
                }}
              >
                Load 3 outreach sheet rows
              </Button>
              {sheetLoaded && (
                <Button variant="chroma" icon={<Sparkles />} disabled={sheetPhase === 'extracting'} onClick={importSheetRows}>
                  Create 3 profiles from sheet
                </Button>
              )}
            </div>

            {sheetLoaded && (
              <div className="anim-slide-up overflow-hidden rounded-xl border border-border bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/70 text-[10px] uppercase text-gray-1000">
                        <th className="px-2.5 py-2 font-mono">Name</th>
                        <th className="px-2.5 py-2 font-mono">Headline</th>
                        <th className="px-2.5 py-2 font-mono">Resume link</th>
                        <th className="px-2.5 py-2 font-mono">Came in for</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {outreachSheetCandidates.map((r, idx) => {
                        const meta = SHEET_DEFAULTS[r.id]
                        const isDup = r.status === 'Duplicate in pool'
                        return (
                          <tr key={r.id} style={{ animationDelay: `${idx * 45}ms` }} className="anim-slide-up align-top">
                            <td className="px-2.5 py-2 font-medium whitespace-nowrap">
                              <div>{r.nameLabel ?? r.name}</div>
                              <Tag tone={isDup ? 'outline' : 'neutral'} className="mt-1">{r.status}</Tag>
                            </td>
                            <td className="px-2.5 py-2 text-muted-foreground">{r.headline}</td>
                            <td className="px-2.5 py-2">
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground underline decoration-border underline-offset-2">
                                <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                                {r.link.replace('https://', '')}
                              </span>
                            </td>
                            <td className="px-2.5 py-2 whitespace-nowrap text-muted-foreground">{meta?.cameInFor ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </BezelCard>

      <BezelCard icon={<MessageSquareText />} title="Batch defaults (optional)" description="Applied to all candidates in this bulk upload.">
        <div className="space-y-4">
          <Field label="Came in for role">
            <Select aria-label="Came in for role" className="w-full" value={role} onChange={setRole} options={roleOptions} />
          </Field>
          <Field label="Source">
            <Segmented aria-label="Source" value={source} onChange={setSource} options={['Outreach', 'Referral', 'Inbound']} />
          </Field>
        </div>
      </BezelCard>
    </div>
  ) : (
    /* ==================== SINGLE CANDIDATE LEFT PANE ==================== */
    <div className="anim-fade space-y-6">
      <BezelCard
        icon={singleMode === 'ai-box' ? <Sparkles /> : singleMode === 'link' ? <Link2 /> : <FileText />}
        title={<span className="flex items-center gap-2">Single candidate source <span className="eyebrow text-[9px] text-gray-1000">Required</span></span>}
        action={
          <Segmented
            size="sm"
            aria-label="Single candidate input mode"
            value={singleMode}
            onChange={m => setSingleMode(m)}
            options={[
              { value: 'ai-box', label: 'AI quick create' },
              { value: 'link', label: 'Paste link' },
              { value: 'upload', label: 'Upload PDF' },
            ]}
          />
        }
      >
        {phase === 'failed' && (
          <div className="mb-4">
            <Banner variant="error" actions={<Button variant="outline" icon={<ClipboardPaste />} onClick={() => { setSingleMode('upload'); setShowPasteText(true); setPhase('idle') }}>Paste resume text</Button>}>
              We couldn't read this file. Paste the resume text instead.
            </Banner>
          </div>
        )}

        {singleMode === 'ai-box' && (
          <div className="anim-fade space-y-3">
            {/* Double-bezel AI Text Box with right-hand Create candidate action + conditional Optional Fathom Link */}
            <div className="rounded-2xl border border-border bg-gray-100 p-1 shadow-custom transition-all">
              <div className="rounded-xl border border-border bg-card p-3.5 transition-colors focus-within:border-gray-900">
                <textarea
                  aria-label="Candidate resume text, LinkedIn, or notes"
                  rows={4}
                  value={aiSingleText}
                  onChange={e => {
                    setAiSingleText(e.target.value)
                    if (e.target.value.trim().length > 0) setCreateActionReady(true)
                  }}
                  placeholder="Paste a candidate's resume text, Drive/LinkedIn link, or recruiter notes here…"
                  className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                />

                {/* Once Create candidate is available/active, show the Double-Bezel Optional Fathom Call Link right inside the box */}
                {createActionReady && (
                  <div className="anim-slide-up mt-3 rounded-xl border border-border bg-gray-100 p-1">
                    <div className="rounded-lg border border-border bg-card p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor="single-fathom-url" className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Video className="size-3.5 text-gray-1000" />
                          <span>Upload / paste Fathom call link</span>
                          <span className="rounded-xs border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                            Optional
                          </span>
                          {fathomUrl.trim() && (
                            <span className="anim-pop inline-flex items-center gap-1 rounded-xs border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9.5px] text-foreground">
                              <Check className="size-2.5 text-success" />
                              <span>Ready to sync</span>
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setFathomUrl(EXAMPLE_FATHOM_URL)}
                          className="font-mono text-[10.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline cursor-pointer"
                        >
                          Use sample Fathom link
                        </button>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Input
                          id="single-fathom-url"
                          aria-label="Fathom call link (optional)"
                          value={fathomUrl}
                          onChange={e => setFathomUrl(e.target.value)}
                          placeholder="https://fathom.video/share/… (syncs call notes, comp & work auth automatically)"
                          className="h-8 text-xs"
                        />
                        {fathomUrl && (
                          <Button variant="ghost" size="icon-sm" aria-label="Clear Fathom link" icon={<X />} onClick={() => setFathomUrl('')} />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom action bar inside the text box: left attachments, right-hand Create candidate action */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Upload />}
                      onClick={() => fileInput.current?.click()}
                    >
                      {file ? file : 'Attach resume PDF'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAiSingleText('Rohan D. · Senior Product Manager (7 yrs, Remitly & Avalara) · Seattle, WA · Payments platform, API products, Roadmapping, B2B SaaS')
                        setLinkUrl(EXAMPLE_DRIVE_URL)
                        setCreateActionReady(true)
                      }}
                    >
                      Load example candidate
                    </Button>
                  </div>

                  {/* Right-hand side inside the text box: Create candidate action */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Sparkles />}
                      disabled={phase === 'extracting'}
                      onClick={() => {
                        setCreateActionReady(true)
                        createSingle()
                      }}
                    >
                      {phase === 'done' ? 'Re-run Create candidate' : 'Create candidate'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {singleMode === 'link' && (
          <div className="anim-fade space-y-4">
            <Field label="Resume link (Google Drive, Dropbox, or LinkedIn PDF)" hint="Most resumes arrive as shared links in outreach replies or sheets.">
              <Input
                aria-label="Resume link"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder={EXAMPLE_DRIVE_URL}
              />
            </Field>
            <Field label="LinkedIn profile link (optional)" hint="Paste together with the resume link to keep both on the candidate’s Sources card.">
              <Input
                aria-label="LinkedIn profile link"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/priya-s-example"
              />
            </Field>
            <Field label="Fathom call link (optional)" hint="Syncs call transcript insights (comp, availability, work auth) directly onto the profile.">
              <Input
                aria-label="Fathom call link"
                value={fathomUrl}
                onChange={e => setFathomUrl(e.target.value)}
                placeholder={EXAMPLE_FATHOM_URL}
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" icon={<Link2 />} onClick={useExampleDriveLink}>
                Use example Drive link
              </Button>
              <Button variant={phase === 'done' ? 'outline' : 'primary'} icon={<Sparkles />} disabled={!hasSingleSource || phase === 'extracting'} onClick={createSingle}>
                {phase === 'done' ? 'Create candidate again' : 'Create candidate'}
              </Button>
            </div>
          </div>
        )}

        {singleMode === 'upload' && (
          <div className="anim-fade space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Upload a local PDF/DOCX or paste raw resume text</span>
              <Button variant="ghost" size="sm" onClick={() => setShowPasteText(v => !v)}>
                {showPasteText ? 'Upload file instead' : 'Paste text fallback'}
              </Button>
            </div>
            {!showPasteText ? (
              file ? (
                <div className="anim-pop flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted"><FileText className="size-4 text-muted-foreground" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{file}</div>
                    <div className="text-xs text-muted-foreground">{phase === 'failed' ? 'Image-only PDF · no text found' : 'PDF · 2 pages'}</div>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Remove file" icon={<X />} onClick={() => { setFile(null); setPhase('idle'); setDup(false) }} />
                </div>
              ) : (
                <div
                  role="button" tabIndex={0}
                  onClick={() => fileInput.current?.click()}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click() } }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f.name) }}
                  className={cn('flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                    dragOver ? 'border-gray-1100 bg-muted' : 'border-gray-700 bg-background hover:bg-muted/50')}>
                  <span className="flex size-10 items-center justify-center rounded-lg bg-muted"><Upload className="size-4 text-muted-foreground" /></span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Drop the resume here, or click to choose</p>
                    <p className="text-xs text-muted-foreground">PDF or DOCX · any length</p>
                  </div>
                </div>
              )
            ) : (
              <Textarea aria-label="Resume text" value={paste} onChange={e => setPaste(e.target.value)} placeholder="Paste the full resume text…" className="min-h-40 font-mono text-[12.5px]" />
            )}
            <Field label="Fathom call link (optional)">
              <Input
                aria-label="Fathom call link"
                value={fathomUrl}
                onChange={e => setFathomUrl(e.target.value)}
                placeholder={EXAMPLE_FATHOM_URL}
              />
            </Field>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button variant="link" className="text-xs" onClick={useExampleFile}>Use example resume</Button>
              <Button variant={phase === 'done' ? 'outline' : 'primary'} icon={<Sparkles />} disabled={!hasSingleSource || phase === 'extracting'} onClick={createSingle}>
                {phase === 'done' ? 'Create candidate again' : 'Create candidate'}
              </Button>
            </div>
          </div>
        )}
        <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f.name) }} />
      </BezelCard>

      <BezelCard icon={<MessageSquareText />} title="Optional context" description="Helpful context. Skip any of it; the resume or AI box is enough to start.">
        <div className="space-y-4">
          <Field label="Came in for role">
            <Select aria-label="Came in for role" className="w-full" value={role} onChange={setRole} options={roleOptions} />
          </Field>
          <Field label="Source">
            <Segmented aria-label="Source" value={source} onChange={setSource} options={['Outreach', 'Referral', 'Inbound']} />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything worth remembering from the first reply" />
          </Field>
        </div>
      </BezelCard>
    </div>
  )

  /* ---------- Right pane ---------- */
  const askQs = orderedAsk(draft.askList)
  const right = (
    <div className="space-y-6 p-2 sm:p-4">
      {showDup && (
        <Banner variant="warning" actions={<>
          <Button variant="outline" onClick={() => setDlg(true)}>Add as new resume</Button>
          <Button variant="ghost" onClick={() => { setDupDismissed(true); setDup(false) }}>Create anyway</Button>
        </>}>
          Priya S. may already be in the pool (same email).
        </Banner>
      )}
      {pageMode === 'bulk' ? (
        bulkMode === 'resumes' ? (
          bulkPhase === 'extracting' ? (
            <AIStepper
              steps={BULK_RESUME_STEPS}
              current={bulkStep}
              title={`Extracting ${bulkResumes.length} candidate profiles with AI`}
              onSkip={() => {
                setBulkPhase('done')
                app.toast(`Extracted ${bulkResumes.length} candidate profiles from resumes`)
              }}
            />
          ) : (
            <div className="anim-fade">
              <BezelCard
                icon={<FolderUp />}
                title={`Batch resume preview · ${bulkResumes.length} files`}
                description="AI extracts structured skills, work history, and flags any existing duplicates in the pool."
              >
                <div className="space-y-3">
                  <InfoNote>
                    {bulkResumes.filter(x => x.status === 'Ready to create').length} new candidate profiles will be created and{' '}
                    {bulkResumes.filter(x => x.status === 'Duplicate in pool').length} existing profile (Priya S.) will have her new resume version attached.
                  </InfoNote>
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                    {bulkResumes.map((r, idx) => (
                      <li
                        key={r.id}
                        style={{ animationDelay: `${idx * 55}ms` }}
                        className="anim-slide-up flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 text-sm transition-colors hover:bg-secondary/25"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-medium">
                            <span>{r.name}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">({r.fileName})</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.headline} · {r.years} yrs · {r.metro}
                          </div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {r.skills.map(sk => (
                              <span key={sk} className="inline-flex h-5 items-center rounded-xs border border-border bg-secondary px-1.5 text-[10px] text-gray-1100">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="size-3.5 text-success" />
                          {r.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end gap-2 pt-1">
                    {bulkPhase !== 'done' && (
                      <Button variant="outline" icon={<Sparkles />} onClick={() => setBulkPhase('extracting')}>
                        Run AI extraction preview
                      </Button>
                    )}
                    <Button variant="chroma" icon={<Sparkles />} disabled={bulkResumes.length === 0} onClick={commitBulkResumes}>
                      Save {bulkResumes.length} candidates to pool
                    </Button>
                  </div>
                </div>
              </BezelCard>
            </div>
          )
        ) : sheetPhase === 'extracting' ? (
          <AIStepper
            steps={BULK_SHEET_STEPS}
            current={sheetStep}
            title="Importing candidates from outreach sheet"
            onSkip={() => {
              setSheetPhase('idle')
              finalizeSheetImport()
            }}
          />
        ) : (
          <div className="anim-fade">
            <BezelCard icon={<Table2 />} title="Batch sheet preview · 3 outreach sheet rows" description="Each row’s Drive/Dropbox/LinkedIn link is stored on the candidate’s Sources card.">
              <div className="space-y-3">
                <InfoNote>2 new profiles will be created and 1 existing candidate (Priya S.) will have her latest Drive resume link attached.</InfoNote>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                  {outreachSheetCandidates.map((r, idx) => (
                    <li
                      key={r.id}
                      style={{ animationDelay: `${idx * 55}ms` }}
                      className="anim-slide-up flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm transition-colors hover:bg-secondary/25"
                    >
                      <div>
                        <div className="font-medium">{r.nameLabel ?? r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.headline} · {r.years} yrs · {r.metro}</div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="size-3.5 text-success" />
                        {r.status}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end pt-1">
                  <Button variant="chroma" icon={<Sparkles />} onClick={importSheetRows}>
                    Create 3 profiles from sheet
                  </Button>
                </div>
              </div>
            </BezelCard>
          </div>
        )
      ) : phase === 'extracting' ? (
        <AIStepper
          steps={SINGLE_STEPS}
          current={frozen ? 1 : step}
          title="Building the candidate profile with AI"
          onSkip={() => {
            setPhase('done')
            app.toast(fathomUrl.trim() ? 'Profile extracted from resume + Fathom call link' : 'Profile extracted from resume')
          }}
        />
      ) : phase === 'done' ? (
        <div className="anim-fade space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">Draft profile</span><span className="text-muted-foreground">· {draft.name}</span>{draft.example && <ExampleMark />}</div>
            <CompletenessMeter value={draft.completeness} onClick={() => document.getElementById('draft-ask')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
          </div>
          {draft.sourceLinks && draft.sourceLinks.length > 0 && (
            <div className="anim-slide-up flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs">
              <Link2 className="size-3.5 text-muted-foreground" />
              <span className="font-medium">Sources captured:</span>
              {draft.sourceLinks.map(l => (
                <span key={l.url} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px]">
                  {l.label} · {l.url.replace(/^https?:\/\//, '').slice(0, 28)}…
                </span>
              ))}
            </div>
          )}
          <AskCard id="draft-ask" questions={askQs} prominent={draft.completeness < 50}
            onCopy={() => { navigator.clipboard?.writeText(askQs.map((q, i) => `${i + 1}. ${q}`).join('\n')).catch(() => {}); app.toast(`Copied ${askQs.length} questions`) }} />
          <ReadOnlyProfile c={draft} />
        </div>
      ) : (
        <div className="anim-fade flex min-h-[380px] flex-col items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-gray-100 p-1 shadow-custom">
            <div className="space-y-4 rounded-xl border border-border bg-card p-5 text-center">
              <div className="relative mx-auto flex size-11 items-center justify-center rounded-2xl border border-border bg-gray-100 p-1">
                <div className="flex size-full items-center justify-center rounded-xl border border-border bg-card">
                  <UserPlus className="size-4 text-foreground" />
                </div>
                <span className="anim-glow absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Extracted profile will appear here</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Paste candidate details + optional Fathom call link on the left and click Create candidate, or switch to Bulk upload for sheets &amp; multiple resumes.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
                <Button variant="primary" icon={<Sparkles />} onClick={useExampleDriveLink}>
                  Try single candidate with AI
                </Button>
                <Button
                  variant="outline"
                  icon={<Layers />}
                  onClick={() => {
                    switchPageMode('bulk')
                    setBulkMode('resumes')
                  }}
                >
                  Upload candidates in bulk
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {topModeBar}
      <div className="min-h-0 flex-1 overflow-hidden">
        <SplitPane
          leftTitle={<span className="flex items-center gap-2">{pageMode === 'bulk' ? 'Bulk upload source' : 'Source'} <ExampleMark /></span>}
          rightTitle={pageMode === 'bulk' ? 'Batch preview' : 'Profile'}
          rightActions={phase === 'done' && pageMode === 'single' ? <span className="font-mono text-[10px] text-muted-foreground">Every field shows where it came from</span> : undefined}
          left={left}
          right={right}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {pageMode === 'bulk'
                  ? bulkMode === 'resumes'
                    ? `${bulkResumes.length} resume files ready for batch profile creation.`
                    : 'Sheet rows are matched by email/link to avoid duplicate profiles.'
                  : phase === 'done'
                    ? 'Missing fields read “Not captured” and go on the ask list.'
                    : 'Paste candidate details or a resume link; optional Fathom call link enriches comp & work auth.'}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => navigate('/candidates')}>Cancel</Button>
                {pageMode === 'bulk' ? (
                  bulkMode === 'resumes' ? (
                    <Button variant="chroma" icon={<Sparkles />} disabled={bulkResumes.length === 0 || bulkPhase === 'extracting'} onClick={commitBulkResumes}>
                      Save {bulkResumes.length} candidates to pool
                    </Button>
                  ) : (
                    <Button variant="chroma" icon={<Sparkles />} disabled={sheetPhase === 'extracting'} onClick={importSheetRows}>
                      Create 3 profiles from sheet
                    </Button>
                  )
                ) : (
                  <>
                    <Button variant="outline" disabled={phase !== 'done' || showDup} onClick={() => saveSingle(false)}>Save</Button>
                    <Button variant="chroma" icon={<Sparkles />} disabled={phase !== 'done' || showDup} onClick={() => saveSingle(true)}>Save and find roles</Button>
                  </>
                )}
              </div>
            </div>
          }
        />
      </div>
      <UpdateOrAnotherResumeDialog
        open={dlg}
        onClose={() => setDlg(false)}
        candidateId="priya"
        defaultFileName={file ?? 'Priya_S_resume_2026.pdf'}
        onDone={() => navigate('/candidates/priya?tab=resumes')}
      />
    </div>
  )
}
