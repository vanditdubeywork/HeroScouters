import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, X, ClipboardPaste, Sparkles, UserPlus, MessageSquareText } from 'lucide-react'
import { SplitPane, useTopBar } from '../shell/AppShell'
import { BezelCard, Button, EmptyState, ExampleMark, Field, Input, Segmented, Select, Textarea, cn } from '../components/ui'
import { AIStepper, Banner, CompletenessMeter, useStepper } from '../components/hs'
import { AskCard, ReadOnlyProfile, UpdateOrAnotherResumeDialog, orderedAsk } from './CandidateProfile'
import { useApp, useWireframeState } from '../store/AppStore'
import type { Candidate } from '../data/types'

/* ==========================================================================
   S-06 · New candidate — resume-first split pane (F-03)
   Left "Source": resume (only required input) + optional context.
   Right "Profile": stepper → draft profile with source badges + ask list.
   ========================================================================== */

const WF_STATES = [
  { id: 'empty', label: 'Empty (live)' },
  { id: 'extracting', label: 'Extracting' },
  { id: 'extracted', label: 'Extracted' },
  { id: 'duplicate', label: 'Duplicate found' },
  { id: 'failed', label: 'Failed to read' },
]
const STEPS = ['Reading resume', 'Pulling out details', 'Checking for duplicates']

type Phase = 'idle' | 'extracting' | 'done' | 'failed'
type SourceKindOpt = Candidate['source']

/** Draft built from the example resume (fictional, §16 style) */
function draftNew(opts: { source: SourceKindOpt; role: string; notes: string }): Candidate {
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
    email: 'rohan.d@example.com', phone: '+1 206 555 0187', linkedin: 'linkedin.com/in/rohan-d-example',
    ourTake: opts.notes || undefined,
    fieldSources: { headline: 'RESUME', years: 'RESUME', city: 'RESUME', category: 'RESUME', domains: 'RESUME' },
  }
}

/** Duplicate case: a newer resume for Priya S. */
function draftDup(base: Candidate | undefined): Candidate {
  const p = base ?? draftNew({ source: 'Outreach', role: '', notes: '' })
  return { ...p, id: 'priya-new', resumeVersion: 1, updated: 'Just now', relocate: null, completeness: 58, example: true }
}

export function NewCandidate() {
  const app = useApp()
  const navigate = useNavigate()
  useTopBar([{ label: 'Candidates', to: '/candidates' }, { label: 'New candidate' }])
  const [wf] = useWireframeState('S-06', 'New candidate', WF_STATES, 'empty')

  const [mode, setMode] = useState<'upload' | 'paste'>('upload')
  const [file, setFile] = useState<string | null>(null)
  const [paste, setPaste] = useState('')
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
  useEffect(() => { if (done) { setPhase('done'); app.toast('Profile ready') } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [done])

  // Apply wireframe presets when the reviewer picks a state
  useEffect(() => {
    setDupDismissed(false)
    if (wf === 'empty') { setFile(null); setPaste(''); setMode('upload'); setPhase('idle'); setDup(false) }
    if (wf === 'extracting') { setFile('Rohan_D_resume.pdf'); setMode('upload'); setPhase('extracting'); setDup(false) }
    if (wf === 'extracted') { setFile('Rohan_D_resume.pdf'); setMode('upload'); setPhase('done'); setDup(false) }
    if (wf === 'duplicate') { setFile('Priya_S_resume_2026.pdf'); setMode('upload'); setPhase('done'); setDup(true) }
    if (wf === 'failed') { setFile('scan_0412.pdf'); setMode('upload'); setPhase('failed'); setDup(false) }
  }, [wf])

  const hasResume = mode === 'upload' ? !!file : paste.trim().length > 40
  const priya = app.candidate('priya')
  const draft = dup ? draftDup(priya) : draftNew({ source, role, notes })
  const showDup = dup && !dupDismissed && phase === 'done'

  const pickFile = (name: string) => {
    setFile(name); setPhase('idle')
    setDup(/priya/i.test(name))
  }
  const create = () => {
    if (!hasResume) return
    if (mode === 'paste') setDup(/priya/i.test(paste))
    setDupDismissed(false)
    setPhase('extracting')
  }
  const useExample = () => { setMode('upload'); pickFile('Rohan_D_resume.pdf') }

  const save = (thenRoles: boolean) => {
    const base = { ...draft, source, cameInForRole: role || undefined, ourTake: notes || draft.ourTake }
    const id = app.candidate(base.id) ? `${base.id}${app.candidates.length}` : base.id
    app.addCandidate({ ...base, id })
    app.log({ what: 'Created profile from resume', record: base.name, recordHref: `/candidates/${id}`, kind: 'Candidates' })
    app.toast(`Saved ${base.name}`)
    navigate(`/candidates/${id}${thenRoles ? '?tab=roles' : ''}`)
  }

  const roleOptions = [{ value: '', label: 'No specific role' }, ...app.roles.filter(r => r.status === 'Open').map(r => ({ value: r.id, label: `${r.title} — ${r.company}` }))]

  /* ---------- Left pane ---------- */
  const left = (
    <>
      <BezelCard icon={<FileText />} title={<span className="flex items-center gap-2">Resume <span className="eyebrow text-[9px] text-gray-1000">Required</span></span>}
        action={<Segmented size="sm" aria-label="Resume input" value={mode} onChange={setMode} options={[{ value: 'upload', label: 'Upload' }, { value: 'paste', label: 'Paste resume text' }]} />}>
        {phase === 'failed' && (
          <div className="mb-4">
            <Banner variant="error" actions={<Button variant="outline" icon={<ClipboardPaste />} onClick={() => { setMode('paste'); setPhase('idle') }}>Paste resume text</Button>}>
              We couldn't read this file. Paste the resume text instead.
            </Banner>
          </div>
        )}
        {mode === 'upload' ? (
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
          <Button variant="link" className="text-xs" onClick={useExample}>Use example resume</Button>
          <Button variant={phase === 'done' ? 'outline' : 'primary'} icon={<Sparkles />} disabled={!hasResume || phase === 'extracting'} onClick={create}>
            {phase === 'done' ? 'Create profile again' : 'Create profile'}
          </Button>
        </div>
      </BezelCard>

      <BezelCard icon={<MessageSquareText />} title="Optional" description="Helpful context. Skip any of it; the resume is enough to start.">
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
      {phase === 'extracting' ? (
        <AIStepper steps={STEPS} current={frozen ? 1 : step} title="Building the profile" />
      ) : phase === 'done' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">Draft profile</span><span className="text-muted-foreground">· {draft.name}</span>{draft.example && <ExampleMark />}</div>
            <CompletenessMeter value={draft.completeness} onClick={() => document.getElementById('draft-ask')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
          </div>
          <AskCard id="draft-ask" questions={askQs} prominent={draft.completeness < 50}
            onCopy={() => { navigator.clipboard?.writeText(askQs.map((q, i) => `${i + 1}. ${q}`).join('\n')).catch(() => {}); app.toast(`Copied ${askQs.length} questions`) }} />
          <ReadOnlyProfile c={draft} />
        </>
      ) : (
        <EmptyState icon={<UserPlus />} title="No profile yet" body="Add a resume to build the profile." />
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
            <span className="text-xs text-muted-foreground">{phase === 'done' ? 'Missing fields read “Not captured” and go on the ask list.' : 'Only the resume is required.'}</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/candidates')}>Cancel</Button>
              <Button variant="outline" disabled={phase !== 'done' || showDup} onClick={() => save(false)}>Save</Button>
              <Button variant="chroma" icon={<Sparkles />} disabled={phase !== 'done' || showDup} onClick={() => save(true)}>Save and find roles</Button>
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
