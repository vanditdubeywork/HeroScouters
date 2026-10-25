import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, X, ClipboardPaste, Sparkles, UserPlus, MessageSquareText, Link2, Table2, ExternalLink, Check } from 'lucide-react'
import { SplitPane, useTopBar } from '../shell/AppShell'
import { BezelCard, Button, EmptyState, ExampleMark, Field, Input, Segmented, Select, Tag, Textarea, cn } from '../components/ui'
import { AIStepper, Banner, CompletenessMeter, InfoNote, useStepper } from '../components/hs'
import { AskCard, ReadOnlyProfile, UpdateOrAnotherResumeDialog, orderedAsk } from './CandidateProfile'
import { useApp, useWireframeState } from '../store/AppStore'
import { outreachSheetCandidates } from '../data/mock'
import type { Candidate } from '../data/types'

/* ==========================================================================
   S-06 · New candidate — link-first & sheet-import split pane (§7.4, C9, US-50, F-03)
   Left "Source": Paste link (default) · Import from sheet · Upload file / Paste text.
   Right "Profile": stepper → draft profile with source badges + ask list.
   ========================================================================== */

const WF_STATES = [
  { id: 'empty', label: 'Empty (live · link-first)' },
  { id: 'extracting', label: 'Extracting' },
  { id: 'extracted', label: 'Extracted' },
  { id: 'sheet', label: 'Import from sheet (US-50)' },
  { id: 'duplicate', label: 'Duplicate found' },
  { id: 'failed', label: 'Failed to read' },
]
const STEPS = ['Opening resume link', 'Pulling out details', 'Checking for duplicates']

type Phase = 'idle' | 'extracting' | 'done' | 'failed'
type SourceMode = 'link' | 'sheet' | 'upload'
type SourceKindOpt = Candidate['source']

const EXAMPLE_DRIVE_URL = 'https://drive.google.com/file/d/19xPriyaResume_v3/view'
const EXAMPLE_LINKEDIN_URL = 'https://linkedin.com/in/rohan-d-example'

const SHEET_DEFAULTS: Record<string, { cameInFor: string; roleId?: string; notes: string }> = {
  'sheet-1': { cameInFor: 'Backend Engineer — Harbor Health', roleId: 'harbor-be', notes: 'Replied on LinkedIn · open to hybrid SF' },
  'sheet-2': { cameInFor: 'Senior PM — Northwind Pay', roleId: 'northwind-spm', notes: 'Strong B2B subscription & billing background' },
  'sheet-3': { cameInFor: 'Senior PM — Northwind Pay', roleId: 'northwind-spm', notes: 'Updated Drive resume link from outreach reply' },
}

/** Draft built from the example resume or link (fictional, §16 style) */
function draftNew(opts: { source: SourceKindOpt; role: string; notes: string; linkUrl?: string; linkedinUrl?: string }): Candidate {
  const links: NonNullable<Candidate['sourceLinks']> = []
  if (opts.linkUrl?.trim()) {
    const rawLink = {
      label: 'Google Drive resume',
      url: opts.linkUrl.trim(),
      kind: 'Drive',
      addedAt: 'Just now',
    }
    links.push(rawLink)
  }
  if (opts.linkedinUrl?.trim()) {
    const liLink = {
      label: 'LinkedIn profile',
      url: opts.linkedinUrl.trim(),
      kind: 'LinkedIn',
      addedAt: 'Just now',
    }
    links.push(liLink)
  }
  return {
    id: 'rohand', name: 'Rohan D.', initials: 'RD', example: true,
    headline: 'Senior Product Manager · payments platform & APIs',
    category: 'Product', subcategory: 'Product Manager', years: 7,
    domains: ['Payments/Fintech', 'B2B SaaS'],
    city: 'Seattle, WA', metro: 'Seattle', workModes: null, relocate: null, locationsOpen: [], companyPrefs: [],
    workAuth: { status: null }, pay: null, availability: null, searchStatus: null,
    skills: ['Payments', 'API products', 'Roadmapping', 'Pricing', 'B2B SaaS'],
    predicted: [{ name: 'SQL', basis: 'from Mode + Snowflake reporting work, 3 yrs', strength: 'Medium' }],
    tools: ['Jira', 'Mode', 'Figma'],
    companies: [
      { name: 'Remitly', descriptor: 'Public US fintech, 2,500+ people', title: 'Senior Product Manager, Payouts', start: '2021', end: 'Present' },
      { name: 'Avalara', descriptor: 'Tax-compliance SaaS, 4,000+ people', title: 'Product Manager, APIs', start: '2018', end: '2021' },
    ],
    achievements: ['Launched real-time payouts in 9 corridors; failed transfers down 27%', 'Rebuilt partner API onboarding from 6 weeks to 9 days'],
    education: { degree: 'BS', field: 'Computer Engineering', school: 'University of Washington' },
    completeness: 41,
    askList: ['Are you open to relocating? Where to?', 'Are you on a visa? Which one, and when does it expire?', 'Would you need sponsorship or a transfer?', 'Remote, hybrid or onsite?', 'What pay range are you looking for?', 'How soon could you start?'],
    updated: 'Just now', source: opts.source, cameInForRole: opts.role || undefined, resumeVersion: 1, lastContacted: 'Today',
    email: 'rohan.d@example.com', phone: '+1 206 555 0187', linkedin: opts.linkedinUrl?.trim() || 'linkedin.com/in/rohan-d-example',
    ourTake: opts.notes || undefined,
    sourceLinks: links.length ? links : undefined,
    fieldSources: { headline: 'RESUME', years: 'RESUME', city: 'RESUME', category: 'RESUME', domains: 'RESUME' },
  }
}

/** Duplicate case: a newer resume for Priya S. */
function draftDup(base: Candidate | undefined, linkUrl?: string): Candidate {
  const p = base ?? draftNew({ source: 'Outreach', role: '', notes: '' })
  const nextLinks = linkUrl?.trim()
    ? [{ label: 'Google Drive resume', url: linkUrl.trim(), kind: 'Drive', addedAt: 'Just now' }, ...(p.sourceLinks ?? [])]
    : p.sourceLinks
  return { ...p, id: 'priya-new', resumeVersion: 1, updated: 'Just now', relocate: null, completeness: 58, sourceLinks: nextLinks, example: true }
}

export function NewCandidate() {
  const app = useApp()
  const navigate = useNavigate()
  useTopBar([{ label: 'Candidates', to: '/candidates' }, { label: 'New candidate' }])
  const [wf] = useWireframeState('S-06', 'New candidate', WF_STATES, 'empty')

  const [mode, setMode] = useState<SourceMode>('link')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [sheetPaste, setSheetPaste] = useState('')
  const [sheetLoaded, setSheetLoaded] = useState(false)
  const [file, setFile] = useState<string | null>(null)
  const [paste, setPaste] = useState('')
  const [showPasteText, setShowPasteText] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [role, setRole] = useState('')
  const [source, setSource] = useState<SourceKindOpt>('Outreach')
  const [call, setCall] = useState('')
  const [notes, setNotes] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [dup, setDup] = useState(false)
  const [dupDismissed, setDupDismissed] = useState(false)
  const [dlg, setDlg] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const frozen = wf === 'extracting'
  const { step, done } = useStepper(STEPS.length, phase === 'extracting', frozen ? 1e9 : 850)
  useEffect(() => { if (done) { setPhase('done'); app.toast('Profile extracted from resume link') } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [done])

  // Apply wireframe presets when the reviewer picks a state
  useEffect(() => {
    setDupDismissed(false)
    if (wf === 'empty') {
      setMode('link'); setLinkUrl(''); setLinkedinUrl(''); setSheetLoaded(false); setFile(null); setPaste(''); setShowPasteText(false); setPhase('idle'); setDup(false)
    }
    if (wf === 'extracting') {
      setMode('link'); setLinkUrl(EXAMPLE_DRIVE_URL); setPhase('extracting'); setDup(false)
    }
    if (wf === 'extracted') {
      setMode('link'); setLinkUrl(EXAMPLE_DRIVE_URL); setLinkedinUrl(EXAMPLE_LINKEDIN_URL); setPhase('done'); setDup(false)
    }
    if (wf === 'sheet') {
      setMode('sheet'); setSheetLoaded(true); setPhase('idle'); setDup(false)
    }
    if (wf === 'duplicate') {
      setMode('upload'); setFile('Priya_S_resume_2026.pdf'); setShowPasteText(false); setPhase('done'); setDup(true)
    }
    if (wf === 'failed') {
      setMode('upload'); setFile('scan_0412.pdf'); setShowPasteText(false); setPhase('failed'); setDup(false)
    }
  }, [wf])

  const hasResume = mode === 'link'
    ? linkUrl.trim().length > 8
    : mode === 'upload'
      ? (!!file || paste.trim().length > 40)
      : sheetLoaded

  const priya = app.candidate('priya')
  const draft = dup ? draftDup(priya, linkUrl) : draftNew({ source, role, notes, linkUrl, linkedinUrl })
  const showDup = dup && !dupDismissed && phase === 'done'

  const pickFile = (name: string) => {
    setFile(name); setPhase('idle')
    setDup(/priya/i.test(name))
  }

  const create = () => {
    if (!hasResume) return
    if (mode === 'upload' && showPasteText) setDup(/priya/i.test(paste))
    else if (mode === 'link') setDup(false)
    setDupDismissed(false)
    setPhase('extracting')
  }

  const useExampleDriveLink = () => {
    setMode('link')
    setLinkUrl(EXAMPLE_DRIVE_URL)
    setLinkedinUrl(EXAMPLE_LINKEDIN_URL)
    setDup(false)
    setDupDismissed(false)
    setPhase('extracting')
  }

  const useExampleFile = () => {
    setMode('upload')
    setShowPasteText(false)
    pickFile('Rohan_D_resume.pdf')
  }

  const save = (thenRoles: boolean) => {
    const linkItem = {
      label: 'Google Drive resume',
      url: linkUrl.trim() || EXAMPLE_DRIVE_URL,
      kind: 'Drive',
      addedAt: 'Just now',
    }
    const sourceLinks = mode === 'link' || linkUrl.trim()
      ? [
          linkItem,
          ...(linkedinUrl.trim() ? [{ label: 'LinkedIn profile', url: linkedinUrl.trim(), kind: 'LinkedIn', addedAt: 'Just now' }] : []),
        ]
      : draft.sourceLinks

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
      what: mode === 'link' ? 'Created profile from resume link' : 'Created profile from resume',
      record: base.name,
      recordHref: `/candidates/${id}`,
      kind: 'Candidates',
    })
    app.toast(`Saved ${base.name}`)
    navigate(`/candidates/${id}${thenRoles ? '?tab=roles' : ''}`)
  }

  const importSheetRows = () => {
    outreachSheetCandidates.forEach((row, idx) => {
      if (row.status === 'Duplicate in pool') {
        const existing = app.candidate('priya')
        if (existing) {
          const linkObj = { label: 'Google Drive resume', url: row.link, kind: 'Drive', addedAt: 'Just now' }
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
      const linkObj = { label: 'Google Drive resume', url: row.link, kind: 'Drive', addedAt: 'Just now' }
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

  const roleOptions = [{ value: '', label: 'No specific role' }, ...app.roles.filter(r => r.status === 'Open').map(r => ({ value: r.id, label: `${r.title} — ${r.company}` }))]

  /* ---------- Left pane ---------- */
  const left = (
    <>
      <BezelCard
        icon={mode === 'link' ? <Link2 /> : mode === 'sheet' ? <Table2 /> : <FileText />}
        title={<span className="flex items-center gap-2">Resume source <span className="eyebrow text-[9px] text-gray-1000">Required</span></span>}
        action={
          <Segmented
            size="sm"
            aria-label="Resume input mode"
            value={mode}
            onChange={m => { setMode(m); if (m === 'sheet') setSheetLoaded(true) }}
            options={[
              { value: 'link', label: 'Paste link' },
              { value: 'sheet', label: 'Import from sheet' },
              { value: 'upload', label: 'Upload file / Paste text' },
            ]}
          />
        }
      >
        {phase === 'failed' && (
          <div className="mb-4">
            <Banner variant="error" actions={<Button variant="outline" icon={<ClipboardPaste />} onClick={() => { setMode('upload'); setShowPasteText(true); setPhase('idle') }}>Paste resume text</Button>}>
              We couldn't read this file. Paste the resume text instead.
            </Banner>
          </div>
        )}

        {mode === 'link' && (
          <div className="space-y-4">
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
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" icon={<Link2 />} onClick={useExampleDriveLink}>
                Use example Drive link
              </Button>
              <Button variant={phase === 'done' ? 'outline' : 'primary'} icon={<Sparkles />} disabled={!hasResume || phase === 'extracting'} onClick={create}>
                {phase === 'done' ? 'Create profile again' : 'Create profile'}
              </Button>
            </div>
          </div>
        )}

        {mode === 'sheet' && (
          <div className="space-y-4">
            <Field label="Outreach Google Sheet rows" hint="Paste rows copied from your outreach tracking sheet (Name, Headline, Drive/Dropbox/LinkedIn link, Role, Notes).">
              <Textarea
                aria-label="Outreach sheet rows"
                value={sheetPaste}
                onChange={e => { setSheetPaste(e.target.value); if (e.target.value.trim()) setSheetLoaded(true) }}
                placeholder="Paste rows from your outreach Google Sheet, or load the 3 sample rows below…"
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
                <Button variant="chroma" icon={<Sparkles />} onClick={importSheetRows}>
                  Create 3 profiles from links
                </Button>
              )}
            </div>

            {sheetLoaded && (
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/70 text-[10px] uppercase text-gray-1000">
                        <th className="px-2.5 py-2 font-mono">Name</th>
                        <th className="px-2.5 py-2 font-mono">Headline</th>
                        <th className="px-2.5 py-2 font-mono">Resume link (Drive/Dropbox/LinkedIn)</th>
                        <th className="px-2.5 py-2 font-mono">Came in for</th>
                        <th className="px-2.5 py-2 font-mono">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {outreachSheetCandidates.map(r => {
                        const meta = SHEET_DEFAULTS[r.id]
                        const isDup = r.status === 'Duplicate in pool'
                        return (
                          <tr key={r.id} className="align-top">
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
                            <td className="px-2.5 py-2 text-muted-foreground">{meta?.notes ?? '—'}</td>
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

        {mode === 'upload' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Upload a local PDF/DOCX or paste raw resume text</span>
              <Button variant="ghost" size="sm" onClick={() => setShowPasteText(v => !v)}>
                {showPasteText ? 'Upload file instead' : 'Paste text fallback'}
              </Button>
            </div>
            {!showPasteText ? (
              file ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
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
                  className={cn('flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                    dragOver ? 'border-gray-1100 bg-muted' : 'border-gray-700 bg-background hover:bg-muted/50')}>
                  <span className="flex size-10 items-center justify-center rounded-lg bg-muted"><Upload className="size-4 text-muted-foreground" /></span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Drop the resume here, or click to choose</p>
                    <p className="text-xs text-muted-foreground">PDF or DOCX · any length</p>
                  </div>
                  <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f.name) }} />
                </div>
              )
            ) : (
              <Textarea aria-label="Resume text" value={paste} onChange={e => setPaste(e.target.value)} placeholder="Paste the full resume text…" className="min-h-48 font-mono text-[12.5px]" />
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button variant="link" className="text-xs" onClick={useExampleFile}>Use example resume</Button>
              <Button variant={phase === 'done' ? 'outline' : 'primary'} icon={<Sparkles />} disabled={!hasResume || phase === 'extracting'} onClick={create}>
                {phase === 'done' ? 'Create profile again' : 'Create profile'}
              </Button>
            </div>
          </div>
        )}
      </BezelCard>

      <BezelCard icon={<MessageSquareText />} title="Optional" description="Helpful context. Skip any of it; the resume link is enough to start.">
        <div className="space-y-4">
          <Field label="Came in for role">
            <Select aria-label="Came in for role" className="w-full" value={role} onChange={setRole} options={roleOptions} />
          </Field>
          <Field label="Source">
            <Segmented aria-label="Source" value={source} onChange={setSource} options={['Outreach', 'Referral', 'Inbound']} />
          </Field>
          <Field label="Call link or transcript">
            <Input value={call} onChange={e => setCall(e.target.value)} placeholder="https://fathom.video/share/… or paste text" />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything worth remembering from the first reply" />
          </Field>
        </div>
      </BezelCard>
    </>
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
      {mode === 'sheet' && sheetLoaded ? (
        <BezelCard icon={<Table2 />} title="Batch import preview · 3 outreach sheet rows" description="Each row’s Drive/Dropbox/LinkedIn link is stored on the candidate’s Sources card.">
          <div className="space-y-3">
            <InfoNote>2 new profiles will be created and 1 existing candidate (Priya S.) will have her latest Drive resume link attached.</InfoNote>
            <ul className="divide-y divide-border rounded-xl border border-border bg-background">
              {outreachSheetCandidates.map(r => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm">
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
                Create 3 profiles from links
              </Button>
            </div>
          </div>
        </BezelCard>
      ) : phase === 'extracting' ? (
        <AIStepper steps={STEPS} current={frozen ? 1 : step} title="Building the profile" />
      ) : phase === 'done' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">Draft profile</span><span className="text-muted-foreground">· {draft.name}</span>{draft.example && <ExampleMark />}</div>
            <CompletenessMeter value={draft.completeness} onClick={() => document.getElementById('draft-ask')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
          </div>
          {draft.sourceLinks && draft.sourceLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs">
              <Link2 className="size-3.5 text-muted-foreground" />
              <span className="font-medium">Source links captured:</span>
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
        </>
      ) : (
        <EmptyState icon={<UserPlus />} title="No profile yet" body="Paste a Google Drive, Dropbox, or LinkedIn resume link, or import rows from an outreach sheet." />
      )}
    </div>
  )

  return (
    <>
      <SplitPane
        leftTitle={<span className="flex items-center gap-2">Source <ExampleMark /></span>}
        rightTitle="Profile"
        rightActions={phase === 'done' ? <span className="font-mono text-[10px] text-muted-foreground">Every field shows where it came from</span> : undefined}
        left={left}
        right={right}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{phase === 'done' ? 'Missing fields read “Not captured” and go on the ask list.' : 'Only a resume link or file is required.'}</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/candidates')}>Cancel</Button>
              {mode === 'sheet' && sheetLoaded ? (
                <Button variant="chroma" icon={<Sparkles />} onClick={importSheetRows}>Create 3 profiles from links</Button>
              ) : (
                <>
                  <Button variant="outline" disabled={phase !== 'done' || showDup} onClick={() => save(false)}>Save</Button>
                  <Button variant="chroma" icon={<Sparkles />} disabled={phase !== 'done' || showDup} onClick={() => save(true)}>Save and find roles</Button>
                </>
              )}
            </div>
          </div>
        }
      />
      <UpdateOrAnotherResumeDialog
        open={dlg}
        onClose={() => setDlg(false)}
        candidateId="priya"
        defaultFileName={file ?? 'Priya_S_resume_2026.pdf'}
        onDone={() => navigate('/candidates/priya?tab=resumes')}
      />
    </>
  )
}
