import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Pencil, MoreHorizontal, Upload, Phone, PenLine, Trash2, Copy, FileText, Download, RefreshCw, HelpCircle, ListPlus,
  Check, X, User, Briefcase, Layers, Sparkles, SlidersHorizontal, ShieldCheck, StickyNote, MessageSquareText, Link2, Lightbulb, AlertTriangle, UserX,
} from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import {
  Avatar, BezelCard, Button, Checkbox, CompanyTypeTag, EmptyState, ExampleMark, Field, Input, Menu, PillTabs, Segmented, Select, Switch, Tag, Textarea, cn,
} from '../components/ui'
import {
  AIStepper, Banner, CompletenessMeter, Dialog, FilterChip, InfoNote, MatchChipView, MatchRow, NotCaptured, SourceBadge, WorkAuthChip, useStepper,
} from '../components/hs'
import { ConfirmDialog, ProposedChangesDialog, RejectDialog } from './Dialogs'
import { useApp, useWireframeState } from '../store/AppStore'
import { callChangesPriya } from '../data/mock'
import type { Candidate, ProposedChange, Role, RoleMatchForCandidate, SourceKind, WorkAuth, WorkMode, VisaType } from '../data/types'

/* ==========================================================================
   S-07 · Candidate profile — Profile · Matching roles · Resumes · History
   F-04 call enrichment (D-03) and F-06 pitch to more roles start here.
   ========================================================================== */

type Tab = 'profile' | 'roles' | 'resumes' | 'history'
const TABS: Tab[] = ['profile', 'roles', 'resumes', 'history']

const WF_STATES = [
  { id: 'live', label: 'Live (interactive)' },
  { id: 'low', label: 'Low completeness (new profile)' },
  { id: 'high', label: 'High completeness (88%+)' },
  { id: 'enriched', label: 'After call enrichment' },
  { id: 'noroles', label: 'No matching roles' },
  { id: 'outofdate', label: 'Out-of-date matches' },
]

/* ---------- Ask list helpers (§5.3: must-have questions first) ---------- */
const MUST_HAVE_HINTS = ['relocat', 'visa', 'sponsorship', 'transfer', 'remote', 'hybrid', 'onsite', 'located', 'years']
export function orderedAsk(questions: string[]) {
  const uniq = Array.from(new Set(questions))
  const isMust = (q: string) => MUST_HAVE_HINTS.some(h => q.toLowerCase().includes(h))
  return [...uniq.filter(isMust), ...uniq.filter(q => !isMust(q))]
}

/* ---------- Prospect descriptors for the candidate message (F-06) ---------- */
const PROSPECT_DESCRIPTOR: Record<string, string> = {
  'lumen-fse': 'a Series A AI analytics startup (remote)',
  'quill-pmm': 'a developer-tools company in Seattle (hybrid)',
  'cobalt-ds': 'an early-stage data startup in Boston (hybrid)',
  'tally-pm': 'a Series A fintech in Austin (hybrid)',
}

/* Roles that newly pass must-haves after Priya's call (F-04 step 4). Local to the wireframe. */
const MORE_ROLES: Role[] = [
  {
    id: 'tally-pm', title: 'Product Manager, Payments', company: 'Tally', companyType: 'Prospect', companySource: 'Public posting URL',
    category: 'Product', subcategory: 'Product Manager', seniority: 'Senior', minYears: 5, location: 'Austin, TX', workMode: 'Hybrid', relocationAccepted: true,
    sponsorship: 'Unknown', transfer: 'Yes', mustSkills: ['Payments'], niceSkills: ['SQL'], pay: '$170k–$195k', status: 'Open', jdVersion: 1,
    matchStatus: 'up-to-date', shortlisted: 0, updated: 'Just now', passCount: 31,
  },
  {
    id: 'meridian-spm', title: 'Senior PM, Billing', company: 'Meridian Health', companyType: 'Client', companySource: 'Client JD',
    category: 'Product', subcategory: 'Product Manager', seniority: 'Senior', minYears: 6, location: 'New York, NY', workMode: 'Hybrid', relocationAccepted: true,
    sponsorship: 'No', transfer: 'Yes', mustSkills: ['Billing', 'SQL'], niceSkills: ['B2B SaaS'], pay: '$175k–$190k', status: 'Open', jdVersion: 1,
    matchStatus: 'up-to-date', shortlisted: 1, updated: 'Just now', passCount: 22,
  },
]
const MORE_ROWS: RoleMatchForCandidate[] = [
  { roleId: 'tally-pm', rank: 0, band: 'Good', score: 79, status: 'new', reason: 'Payments PM role in Austin; passes now that she is open to relocating there.', chips: [{ kind: 'evidence', label: 'Payments' }, { kind: 'evidence', label: 'Open to Austin' }, { kind: 'evidence', label: 'H-1B · transfer supported' }, { kind: 'evidence', label: 'SQL' }] },
  { roleId: 'meridian-spm', rank: 0, band: 'Good', score: 76, status: 'new', reason: 'Billing PM role in NYC; Stripe billing work is direct evidence.', chips: [{ kind: 'evidence', label: 'Billing' }, { kind: 'evidence', label: 'Open to NYC' }, { kind: 'evidence', label: 'SQL' }, { kind: 'gap', label: 'Pay +5% over range' }] },
]

/* ==========================================================================
   Read-only section views — also used by S-06's draft profile
   ========================================================================== */

/** One label → value line with its source badge; missing values read "Not captured" (P3). */
export function ProfileRow({ label, source, missing, assumed, children }: {
  label: string; source?: SourceKind; missing?: boolean; assumed?: boolean; children?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        {missing ? <NotCaptured assumed={assumed} /> : <>{children}{source && <SourceBadge kind={source} />}</>}
      </dd>
    </div>
  )
}

function AssumedChip({ label, onAsk }: { label: string; onAsk?: () => void }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-warning bg-warning/[0.06] px-1.5 text-xs text-[#b45309]">
      <HelpCircle className="size-3" />{label} · Assumed
      {onAsk && (
        <button type="button" onClick={onAsk} className="ml-0.5 inline-flex items-center gap-0.5 border-l border-dashed border-warning/60 pl-1 text-[11px] font-medium hover:underline">
          <ListPlus className="size-3" />Add to ask list
        </button>
      )}
    </span>
  )
}

const src = (c: Candidate, k: string, fallback: SourceKind = 'RESUME') => c.fieldSources[k] ?? fallback

export function BasicsView({ c }: { c: Candidate }) {
  return (
    <dl className="divide-y divide-border">
      <ProfileRow label="Full name" source="RESUME">{c.name}</ProfileRow>
      <ProfileRow label="Headline" source={src(c, 'headline')}>{c.headline}</ProfileRow>
      <ProfileRow label="Current city" source={src(c, 'city')} missing={!c.city}>{c.city}</ProfileRow>
      <ProfileRow label="Email" source="RESUME" missing={!c.email}>{c.email}</ProfileRow>
      <ProfileRow label="Phone" source="RESUME" missing={!c.phone}><span className="tnum">{c.phone}</span></ProfileRow>
      <ProfileRow label="LinkedIn" source="RESUME" missing={!c.linkedin}>{c.linkedin}</ProfileRow>
    </dl>
  )
}

export function FunctionView({ c }: { c: Candidate }) {
  return (
    <dl className="divide-y divide-border">
      <ProfileRow label="Category" source={src(c, 'category')}>{c.category}</ProfileRow>
      <ProfileRow label="Sub-category" source={src(c, 'category')}>{c.subcategory}</ProfileRow>
    </dl>
  )
}

export function ExperienceView({ c }: { c: Candidate }) {
  return (
    <div className="space-y-4">
      <dl><ProfileRow label="Total years" source={src(c, 'years')} missing={c.years === null} assumed><span className="tnum">{c.years} yrs</span></ProfileRow></dl>
      <div className="space-y-2">
        <div className="eyebrow text-[10px] text-gray-1000">Companies</div>
        {c.companies.length === 0 ? <NotCaptured /> : (
          <ol className="space-y-3">
            {c.companies.map(co => (
              <li key={co.name + co.start} className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gray-800" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{co.title}</span><span className="text-muted-foreground">·</span><span>{co.name}</span><SourceBadge kind="RESUME" /></div>
                  <div className="text-xs text-muted-foreground">{co.descriptor} · <span className="tnum">{co.start}–{co.end}</span></div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      {c.achievements.length > 0 && (
        <div className="space-y-2">
          <div className="eyebrow text-[10px] text-gray-1000">Projects and results</div>
          <ul className="list-disc space-y-1 pl-5 text-sm marker:text-gray-800">{c.achievements.map(a => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      {c.education && <dl><ProfileRow label="Education" source="RESUME">{c.education.degree}, {c.education.field} · {c.education.school}</ProfileRow></dl>}
    </div>
  )
}

export function SkillsView({ c, onConfirm, onDismiss }: { c: Candidate; onConfirm?: (name: string) => void; onDismiss?: (name: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="eyebrow text-[10px] text-gray-1000">Explicit</div>
        {c.skills.length ? <div className="flex flex-wrap gap-1.5">{c.skills.map(s => <Tag key={s}>{s}</Tag>)}</div> : <NotCaptured />}
      </div>
      <div className="space-y-2">
        <div className="eyebrow text-[10px] text-gray-1000">Predicted</div>
        {c.predicted.length === 0 ? <p className="text-sm text-muted-foreground">No predicted skills.</p> : (
          <ul className="space-y-2">
            {c.predicted.map(p => (
              <li key={p.name} className="flex flex-wrap items-center gap-2">
                <MatchChipView chip={{ kind: 'predicted', label: p.name, detail: p.basis }} />
                <span className="text-xs text-muted-foreground">{p.basis} · {p.strength.toLowerCase()}</span>
                {(onConfirm || onDismiss) && (
                  <span className="ml-auto flex gap-1">
                    {onConfirm && <Button size="sm" variant="outline" icon={<Check />} onClick={() => onConfirm(p.name)}>Confirm</Button>}
                    {onDismiss && <Button size="sm" variant="ghost" icon={<X />} onClick={() => onDismiss(p.name)}>Dismiss</Button>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2">
        <div className="eyebrow text-[10px] text-gray-1000">Tools</div>
        {c.tools.length ? <div className="flex flex-wrap gap-1.5">{c.tools.map(s => <Tag key={s} tone="outline">{s}</Tag>)}</div> : <NotCaptured />}
      </div>
    </div>
  )
}

export function PreferencesView({ c, onAsk }: { c: Candidate; onAsk?: (q: string) => void }) {
  const relocate = c.relocate === 'Specific' ? `Specific places — ${(c.relocatePlaces ?? []).join(', ')}` : c.relocate
  return (
    <dl className="divide-y divide-border">
      <ProfileRow label="Work mode" source={src(c, 'workModes', 'CALL')} missing={!c.workModes} assumed>{c.workModes?.join(', ')}</ProfileRow>
      <ProfileRow label="Locations open to" source="CALL" missing={!c.locationsOpen?.length}>{c.locationsOpen?.join(', ')}</ProfileRow>
      <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-4">
        <dt className="text-sm text-muted-foreground">Open to relocate</dt>
        <dd className="flex flex-wrap items-center gap-2 text-sm">
          {relocate
            ? <>{relocate}<SourceBadge kind={c.fieldSources.relocate === 'ASSUMED' ? 'CALL' : src(c, 'relocate', 'CALL')} /></>
            : <AssumedChip label="Not captured" onAsk={onAsk ? () => onAsk('Are you open to relocating? Where to?') : undefined} />}
        </dd>
      </div>
      <ProfileRow label="Company type" source="CALL" missing={!c.companyPrefs?.length}>{c.companyPrefs?.join(', ')}</ProfileRow>
      <ProfileRow label="Pay expectation" source={src(c, 'pay', 'CALL')} missing={!c.pay}><span className="tnum">{c.pay}</span></ProfileRow>
      <ProfileRow label="Availability" source={src(c, 'availability', 'CALL')} missing={!c.availability}>{c.availability}</ProfileRow>
      <ProfileRow label="Search status" source={src(c, 'searchStatus', 'CALL')} missing={!c.searchStatus}>{c.searchStatus}</ProfileRow>
    </dl>
  )
}

export function WorkAuthView({ c, onAsk }: { c: Candidate; onAsk?: (q: string) => void }) {
  const w = c.workAuth
  const yesNo = (v: boolean | null | undefined) => (v === true ? 'Yes' : v === false ? 'No' : null)
  if (!w.status) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <AssumedChip label="Work authorization" onAsk={onAsk ? () => onAsk('Are you on a visa? Which one, and when does it expire?') : undefined} />
        <span className="text-xs text-muted-foreground">Missing, treated as a pass.</span>
      </div>
    )
  }
  return (
    <dl className="divide-y divide-border">
      <ProfileRow label="Status" source={src(c, 'workAuth', 'CALL')}>{w.status}</ProfileRow>
      {w.status === 'Visa' && <ProfileRow label="Visa type" source={src(c, 'workAuth', 'CALL')} missing={!w.visaType} assumed>{w.visaType}</ProfileRow>}
      {w.status === 'Visa' && (
        <ProfileRow label="Visa expiry" source="CALL" missing={w.expiryMonths == null}>
          <span className={cn('inline-flex items-center gap-1.5', (w.expiryMonths ?? 99) < 6 && 'font-medium text-[#b45309]')}>
            {(w.expiryMonths ?? 99) < 6 && <AlertTriangle className="size-3.5" />}Expires in <span className="tnum">{w.expiryMonths}</span> months
          </span>
        </ProfileRow>
      )}
      <ProfileRow label="Needs sponsorship" source="CALL" missing={yesNo(w.needsSponsorship) === null} assumed>{yesNo(w.needsSponsorship)}</ProfileRow>
      <ProfileRow label="Needs transfer" source="CALL" missing={yesNo(w.needsTransfer) === null} assumed>{yesNo(w.needsTransfer)}</ProfileRow>
      {w.notes ? <ProfileRow label="Flexibility notes" source="CALL">{w.notes}</ProfileRow> : null}
    </dl>
  )
}

/** Draft profile used by S-06 (no edit actions) */
export function ReadOnlyProfile({ c }: { c: Candidate }) {
  return (
    <div className="space-y-6">
      <BezelCard icon={<User />} title="Basics"><BasicsView c={c} /></BezelCard>
      <BezelCard icon={<Layers />} title="Function"><FunctionView c={c} /></BezelCard>
      <BezelCard icon={<Briefcase />} title="Experience"><ExperienceView c={c} /></BezelCard>
      <BezelCard icon={<Sparkles />} title="Skills"><SkillsView c={c} /></BezelCard>
      <BezelCard icon={<SlidersHorizontal />} title="Preferences"><PreferencesView c={c} /></BezelCard>
      <BezelCard icon={<ShieldCheck />} title="Work authorization"><WorkAuthView c={c} /></BezelCard>
    </div>
  )
}

/** Ask on next call card (right rail) */
export function AskCard({ questions, onCopy, prominent, highlight, id, footer }: {
  questions: string[]; onCopy: () => void; prominent?: boolean; highlight?: boolean; id?: string; footer?: React.ReactNode
}) {
  return (
    <BezelCard id={id} icon={<MessageSquareText />} title="Ask on next call"
      className={cn('transition-shadow duration-500', prominent && 'border-warning/60', highlight && 'ring-[3px] ring-ring/40')}
      action={questions.length > 0 && <Button variant="outline" icon={<Copy />} onClick={onCopy}>Copy questions</Button>}>
      {questions.length === 0
        ? <p className="text-sm text-muted-foreground">Nothing left to ask. Every must-have is captured.</p>
        : (
          <ol className="space-y-2">
            {questions.map((q, i) => (
              <li key={q} className="flex gap-2.5 text-sm">
                <span className="mt-0.5 font-mono text-[11px] text-gray-1000 tnum">{i + 1}</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        )}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
        <span>Open with “What are you working on today?”, then fill the gaps.</span>
      </div>
      {footer}
    </BezelCard>
  )
}

/* ==========================================================================
   Screen
   ========================================================================== */
export function CandidateProfile() {
  const { id = '' } = useParams()
  const app = useApp()
  const stored = app.candidate(id)
  if (!stored) return <NotFound />
  return <ProfileScreen key={id} stored={stored} />
}

function NotFound() {
  const navigate = useNavigate()
  useTopBar([{ label: 'Candidates', to: '/candidates' }, { label: 'Not found' }])
  return (
    <ScrollPage>
      <EmptyState icon={<UserX />} title="We couldn't find this candidate" body="They may have been deleted. Search the pool instead."
        action={<Button variant="outline" onClick={() => navigate('/candidates')}>Back to candidates</Button>} />
    </ScrollPage>
  )
}

/** Wireframe overlays (non-destructive views of the stored record) */
function overlay(c: Candidate, wf: string, enrichedPatch: Partial<Candidate>): Candidate {
  if (wf === 'low') {
    return {
      ...c, completeness: 34, workModes: null, relocate: null, pay: null, availability: null, searchStatus: null, locationsOpen: [],
      workAuth: { status: null }, updated: 'Just now', resumeVersion: 1,
      askList: ['Are you open to relocating? Where to?', 'Are you on a visa? Which one, and when does it expire?', 'Would you need sponsorship or a transfer?', 'Remote, hybrid or onsite?', 'What pay range are you looking for?', 'How soon could you start?'],
    }
  }
  if (wf === 'high' || wf === 'enriched') return { ...c, ...enrichedPatch, completeness: wf === 'high' ? 91 : 88 }
  return c
}

function enrichmentPatch(c: Candidate, accepted: ProposedChange[]): Partial<Candidate> {
  const has = (cid: string) => accepted.some(a => a.id === cid)
  const patch: Partial<Candidate> = { fieldSources: { ...c.fieldSources } }
  let ask = [...c.askList]
  if (has('c1')) { patch.relocate = 'Specific'; patch.relocatePlaces = ['Austin', 'NYC']; patch.fieldSources!.relocate = 'CALL'; ask = ask.filter(q => !q.includes('relocat')) }
  if (has('c2')) { patch.workModes = ['Hybrid', 'Onsite', 'Remote']; patch.fieldSources!.workModes = 'CALL'; ask = ask.filter(q => !q.includes('Remote, hybrid')) }
  if (has('c3')) { patch.availability = '3 weeks notice'; patch.fieldSources!.availability = 'CALL'; ask = ask.filter(q => !q.includes('How soon')) }
  if (has('c4')) { patch.pay = '$180k–$200k'; patch.fieldSources!.pay = 'CALL'; ask = ask.filter(q => !q.includes('pay range')) }
  if (has('c5')) patch.companyPrefs = Array.from(new Set([...(c.companyPrefs ?? []), 'Infra']))
  if (has('c6')) { patch.skills = Array.from(new Set([...c.skills, 'SQL'])); patch.predicted = c.predicted.filter(p => p.name !== 'SQL') }
  patch.askList = ask
  patch.completeness = Math.min(100, Math.round(c.completeness + (88 - 62) * (accepted.length / 6)))
  patch.updated = 'Just now'
  return patch
}

function ProfileScreen({ stored }: { stored: Candidate }) {
  const app = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab') as Tab | null
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'profile'
  const setTab = (t: Tab) => setParams(p => { const n = new URLSearchParams(p); if (t === 'profile') n.delete('tab'); else n.set('tab', t); return n }, { replace: true })

  const [wf] = useWireframeState('S-07', 'Candidate', WF_STATES, 'live')
  const fullPatch = useMemo(() => enrichmentPatch(stored, callChangesPriya), [stored])
  const c = overlay(stored, wf, fullPatch)

  // Live interaction state
  const [liveEnriched, setLiveEnriched] = useState(false)
  const [ranked, setRanked] = useState(false)
  const [extraStatus, setExtraStatus] = useState<Record<string, RoleMatchForCandidate['status']>>({})
  const [keyChanged, setKeyChanged] = useState(false)
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [askFlash, setAskFlash] = useState(false)
  const [dlg, setDlg] = useState<null | 'addCall' | 'callChanges' | 'resumeChanges' | 'delete' | 'message'>(null)
  const [notFit, setNotFit] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [finding, setFinding] = useState(false)
  const [calls, setCalls] = useState<string[]>([])

  // Reset local review flags when the reviewer jumps between states
  const prevWf = useRef(wf)
  useEffect(() => {
    if (prevWf.current === wf) return
    prevWf.current = wf
    setSelected([]); setEditing({})
    if (wf === 'noroles' || wf === 'outofdate') setTab('roles')
    if (wf === 'enriched') { setRanked(false); setTab('profile') }
    if (wf === 'low' || wf === 'high') setTab('profile')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wf])

  const enriched = wf === 'enriched' || liveEnriched
  const showMayFit = enriched && !ranked
  const outOfDate = wf === 'outofdate' || keyChanged
  const askQuestions = orderedAsk([...c.askList, ...(app.askAdds[c.id] ?? [])])
  const outputsFor = app.outputs.filter(o => o.candidateId === c.id)

  const pill = (
    <span className="inline-flex h-6 items-center gap-2 rounded-md border border-border px-2">
      <span className="text-xs text-muted-foreground">Profile</span>
      <CompletenessMeter compact value={c.completeness} />
    </span>
  )
  useTopBar([{ label: 'Candidates', to: '/candidates' }, { label: c.name }], pill, [c.completeness])

  /* ---------- Find roles stepper ---------- */
  const findSteps = ['Checking must-haves across 14 open roles', `Ranking roles for ${c.name}`]
  const { step: findStep, done: findDone } = useStepper(findSteps.length, finding, 650)
  useEffect(() => { if (findDone) setFinding(false) }, [findDone])

  const findRoles = () => { setTab('roles'); setFinding(true) }
  const flashAsk = () => {
    setTab('profile')
    window.setTimeout(() => {
      document.getElementById('ask-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setAskFlash(true)
      window.setTimeout(() => setAskFlash(false), 1600)
    }, 50)
  }
  const copyQuestions = () => {
    navigator.clipboard?.writeText(askQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')).catch(() => {})
    app.toast(`Copied ${askQuestions.length} question${askQuestions.length === 1 ? '' : 's'}`)
  }
  const addAsk = (q: string) => {
    if (askQuestions.includes(q)) { app.toast('Already on the ask list'); return }
    app.addToAskList(c.id, q)
  }

  /* ---------- Call enrichment (F-04) ---------- */
  const applyCall = (accepted: ProposedChange[]) => {
    const patch = enrichmentPatch(stored, accepted)
    app.updateCandidate(stored.id, patch)
    app.log({ what: `Applied ${accepted.length} changes from call (Fathom)`, record: stored.name, recordHref: `/candidates/${stored.id}`, kind: 'Candidates', before: `Profile ${stored.completeness}%`, after: `Profile ${patch.completeness}%` })
    app.toast(`Applied ${accepted.length} change${accepted.length === 1 ? '' : 's'}`)
    setCalls(x => ['Call · Fathom · Just now', ...x])
    if (accepted.some(a => a.id === 'c1' || a.id === 'c2')) { setLiveEnriched(true); setRanked(false) }
    setTab('profile')
  }
  const rankThem = () => {
    setRanked(true)
    app.log({ what: `Ranked ${c.name} for 2 more roles`, record: c.name, recordHref: `/candidates/${c.id}`, kind: 'Reruns' })
    app.toast(`Ranked ${c.name} for 2 more roles`)
    setTab('roles')
    setFinding(true)
  }

  const resumeChanges: ProposedChange[] = [
    { id: 'r1', field: 'Resume', from: `v${c.resumeVersion}`, to: `v${c.resumeVersion + 1}`, source: 'RESUME' },
    { id: 'r2', field: 'Current title', from: c.companies[0]?.title ?? 'Not captured', to: `${c.companies[0]?.title ?? c.headline.split(' · ')[0]} (promoted to Lead)`, source: 'RESUME' },
    { id: 'r3', field: 'Skills', from: '—', to: '+ Treasury', source: 'RESUME' },
  ]
  const applyResume = (accepted: ProposedChange[]) => {
    app.updateCandidate(stored.id, { resumeVersion: stored.resumeVersion + 1, updated: 'Just now', skills: accepted.some(a => a.id === 'r3') ? [...stored.skills, 'Treasury'] : stored.skills })
    app.log({ what: `Uploaded resume v${stored.resumeVersion + 1} · applied ${accepted.length} changes`, record: stored.name, recordHref: `/candidates/${stored.id}`, kind: 'Candidates' })
    app.toast(`Applied ${accepted.length} change${accepted.length === 1 ? '' : 's'}`)
  }

  /* ---------- Section edits ---------- */
  const saveSection = (section: string, patch: Partial<Candidate>, key: boolean) => {
    app.updateCandidate(stored.id, { ...patch, updated: 'Just now' })
    app.log({ what: `Edited ${section.toLowerCase()}`, record: stored.name, recordHref: `/candidates/${stored.id}`, kind: 'Candidates' })
    app.toast(`Saved ${section.toLowerCase()}`)
    if (key) setKeyChanged(true)
    setEditing(e => ({ ...e, [section]: false }))
  }
  const editBtn = (section: string) => (
    editing[section] ? null : <Button variant="ghost" size="icon-sm" aria-label={`Edit ${section.toLowerCase()}`} title="Edit" icon={<Pencil />} onClick={() => setEditing(e => ({ ...e, [section]: true }))} />
  )

  /* ---------- Matching roles rows ---------- */
  const baseRows = wf === 'noroles' ? [] : (app.rolesForCandidate[c.id] ?? [])
  const extraRows = ranked && wf !== 'noroles' ? MORE_ROWS.map(r => ({ ...r, status: extraStatus[r.roleId] ?? r.status })) : []
  const rows = [...baseRows, ...extraRows].sort((a, b) => b.score - a.score)
  const roleOf = (rid: string) => app.role(rid) ?? MORE_ROLES.find(r => r.id === rid)
  const setRoleStatus = (rid: string, status: RoleMatchForCandidate['status']) => {
    if (MORE_ROLES.some(r => r.id === rid)) setExtraStatus(s => ({ ...s, [rid]: status }))
    else app.setCandidateRoleStatus(c.id, rid, status)
  }
  const addToShortlist = (rid: string, quiet?: boolean) => {
    const r = roleOf(rid)
    setRoleStatus(rid, 'shortlisted')
    app.log({ what: `Shortlisted ${c.name}`, record: `${r?.title} — ${r?.company}`, recordHref: `/roles/${rid}`, kind: 'Decisions' })
    if (!quiet) app.toast(`Shortlisted ${c.name} for ${r?.title}`, { undo: () => setRoleStatus(rid, 'new') })
  }

  const deleteCount = outputsFor.length
  const notFitRole = notFit ? roleOf(notFit) : undefined

  return (
    <ScrollPage className="max-w-[1440px]">
      {/* ---------- Header ---------- */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar initials={c.initials} size={48} />
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg title-type">{c.name}</h1>
              {c.example && <ExampleMark />}
            </div>
            <p className="text-sm text-muted-foreground">{c.headline}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{c.city ?? <span className="text-[#b45309]">Location not captured</span>}{c.workModes && ` · ${c.workModes.join('/').toLowerCase()}`}</span>
              <WorkAuthChip w={c.workAuth} />
              <CompletenessMeter value={c.completeness} onClick={flashAsk} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="chroma" icon={<Sparkles />} onClick={findRoles}>Find roles</Button>
          <Button variant="outline" icon={<FileText />} onClick={() => navigate(`/resumes/masked?candidates=${c.id}${c.cameInForRole ? `&role=${c.cameInForRole}` : ''}`)}>Masked resume</Button>
          <Menu width={220}
            trigger={({ toggle }) => <Button variant="outline" size="icon" aria-label="More actions" icon={<MoreHorizontal />} onClick={toggle} />}
            items={[
              { label: 'Upload new resume', icon: <Upload />, onSelect: () => setDlg('resumeChanges') },
              { label: 'Add call', icon: <Phone />, onSelect: () => setDlg('addCall') },
              { label: 'Edit all', icon: <PenLine />, onSelect: () => { setTab('profile'); setEditing({ Preferences: true, 'Work authorization': true, Notes: true }) } },
              { separator: true, label: '' },
              { label: 'Delete candidate', icon: <Trash2 />, destructive: true, onSelect: () => setDlg('delete') },
            ]}
          />
        </div>
      </header>

      <div className="border-b border-border pb-2">
        <PillTabs value={tab} onChange={setTab} tabs={[
          { value: 'profile', label: 'Profile' },
          { value: 'roles', label: 'Matching roles', count: rows.filter(r => r.status !== 'not-a-fit').length },
          { value: 'resumes', label: 'Resumes', count: outputsFor.length + c.resumeVersion },
          { value: 'history', label: 'History' },
        ]} />
      </div>

      {/* ---------- Profile tab ---------- */}
      {tab === 'profile' && (
        <div className="space-y-6">
          {wf === 'low' && (
            <Banner variant="warning">New profile · <span className="font-mono tnum">{c.completeness}%</span> complete. Ask these {askQuestions.length} questions on the next call to fill the must-haves.</Banner>
          )}
          {keyChanged && (
            <Banner variant="warning" actions={<Button variant="outline" onClick={() => setTab('roles')}>See matching roles</Button>}>
              Key fields changed. Matching roles are out of date.
            </Banner>
          )}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              {wf === 'low' && <AskCard id="ask-card" questions={askQuestions} onCopy={copyQuestions} prominent highlight={askFlash} />}
              <BezelCard icon={<User />} title="Basics" action={editBtn('Basics')}>
                {editing.Basics ? <BasicsEdit c={c} onCancel={() => setEditing(e => ({ ...e, Basics: false }))} onSave={p => saveSection('Basics', p, false)} /> : (
                  <>
                  <BasicsView c={c} />
                  <dl className="mt-2 border-t border-border pt-2">
                    <ProfileRow label="Source" source="EDITED">
                      {c.source}{c.cameInForRole && <> · came in for <Link className="underline underline-offset-2 hover:text-foreground" to={`/roles/${c.cameInForRole}`}>{app.role(c.cameInForRole)?.title} — {app.role(c.cameInForRole)?.company}</Link></>}
                    </ProfileRow>
                  </dl>
                  </>
                )}
              </BezelCard>
              <BezelCard icon={<Layers />} title="Function"><FunctionView c={c} /></BezelCard>
              <BezelCard icon={<Briefcase />} title="Experience"><ExperienceView c={c} /></BezelCard>
              <BezelCard icon={<Sparkles />} title="Skills">
                <SkillsView c={c}
                  onConfirm={name => { app.updateCandidate(stored.id, { skills: [...stored.skills, name], predicted: stored.predicted.filter(p => p.name !== name) }); app.toast(`Confirmed ${name}`) }}
                  onDismiss={name => { app.updateCandidate(stored.id, { predicted: stored.predicted.filter(p => p.name !== name) }); app.toast(`Dismissed ${name}`, { undo: () => app.updateCandidate(stored.id, { predicted: stored.predicted }) }) }}
                />
              </BezelCard>
              <BezelCard id="prefs-card" icon={<SlidersHorizontal />} title="Preferences" action={editBtn('Preferences')}>
                {editing.Preferences
                  ? <PreferencesEdit c={c} onCancel={() => setEditing(e => ({ ...e, Preferences: false }))} onSave={(p, key) => saveSection('Preferences', p, key)} />
                  : <PreferencesView c={c} onAsk={addAsk} />}
              </BezelCard>
              <BezelCard icon={<ShieldCheck />} title="Work authorization" action={editBtn('Work authorization')}>
                {editing['Work authorization']
                  ? <WorkAuthEdit c={c} onCancel={() => setEditing(e => ({ ...e, 'Work authorization': false }))} onSave={(p, key) => saveSection('Work authorization', p, key)} />
                  : <WorkAuthView c={c} onAsk={addAsk} />}
              </BezelCard>
              <BezelCard icon={<StickyNote />} title="Notes" action={editBtn('Notes')}>
                {editing.Notes
                  ? <NotesEdit c={c} onCancel={() => setEditing(e => ({ ...e, Notes: false }))} onSave={p => saveSection('Notes', p, false)} />
                  : (
                    <dl className="divide-y divide-border">
                      <ProfileRow label="Our take" source="EDITED" missing={!c.ourTake}><span className="italic">“{c.ourTake}”</span></ProfileRow>
                      <ProfileRow label="Recruiter notes" missing>{null}</ProfileRow>
                    </dl>
                  )}
                {!editing.Notes && <div className="mt-3"><InfoNote>“Our take” appears on masked resumes, signed by the recruiter.</InfoNote></div>}
              </BezelCard>
            </div>

            {/* Right rail */}
            <aside className="min-w-0 space-y-6">
              {wf !== 'low' && <AskCard id="ask-card" questions={askQuestions} onCopy={copyQuestions} highlight={askFlash} />}
              {showMayFit && (
                <BezelCard icon={<Sparkles />} title="May fit more roles" className="border-gray-1100">
                  <p className="text-sm">This profile now passes must-haves for <span className="font-mono tnum">2</span> more roles.</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {MORE_ROLES.map(r => <li key={r.id} className="flex items-center gap-2"><span className="truncate">{r.title} · {r.companyType === 'Prospect' ? PROSPECT_DESCRIPTOR[r.id] : r.company}</span><CompanyTypeTag type={r.companyType} /></li>)}
                  </ul>
                  <Button variant="primary" className="mt-4 w-full" onClick={rankThem}>Rank them</Button>
                  <p className="mt-2 text-xs text-muted-foreground">Ranks only {c.name} for these 2 roles.</p>
                </BezelCard>
              )}
              <BezelCard icon={<FileText />} title="Sources" action={<Button variant="ghost" size="sm" icon={<Phone />} onClick={() => setDlg('addCall')}>Add call</Button>}>
                <ul className="space-y-2.5 text-sm">
                  {Array.from({ length: c.resumeVersion }).map((_, i) => {
                    const v = c.resumeVersion - i
                    return (
                      <li key={v} className="flex items-center gap-2">
                        <FileText className="size-3.5 text-muted-foreground" />
                        <span className="flex-1">Resume v{v}{i === 0 && <span className="eyebrow ml-2 text-[9px] text-gray-1000">current</span>}</span>
                        <span className="text-xs text-muted-foreground">{i === 0 ? c.updated : 'Sep 12'}</span>
                      </li>
                    )
                  })}
                  {calls.map(x => <li key={x} className="flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" /><span className="flex-1">{x.split(' · Just now')[0]}</span><span className="text-xs text-muted-foreground">Just now</span></li>)}
                  {(c.id === 'priya' || enriched) && calls.length === 0 && (
                    <li className="flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" /><span className="flex-1">Intro call · Granola</span><span className="text-xs text-muted-foreground">{enriched ? 'Just now' : '3 days ago'}</span></li>
                  )}
                </ul>
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Last edited by Vandit D. · {c.updated}</p>
              </BezelCard>
            </aside>
          </div>
        </div>
      )}

      {/* ---------- Matching roles tab ---------- */}
      {tab === 'roles' && (
        <div className="space-y-4">
          {outOfDate && (
            <Banner variant="warning" actions={<Button variant="outline" icon={<RefreshCw />} onClick={() => { setKeyChanged(false); setFinding(true); app.toast('Rechecked 14 open roles') }}>Recheck roles</Button>}>
              Matches are out of date. Preferences or work authorization changed since roles were last checked.
            </Banner>
          )}
          {finding ? (
            <div className="rounded-xl border border-border bg-card"><AIStepper steps={findSteps} current={findStep} title="Finding roles" /></div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState icon={<Briefcase />} title="No open roles fit yet" body="No open roles fit yet. We'll flag new roles that fit when they're added." />
            </div>
          ) : (
            <>
              {selected.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-1100 bg-card px-3 py-2">
                  <span className="font-mono text-xs tnum">{selected.length} selected</span>
                  <Button variant="primary" className="ml-auto" onClick={() => {
                    selected.forEach(rid => addToShortlist(rid, true))
                    app.toast(`Added ${c.name} to ${selected.length} shortlist${selected.length === 1 ? '' : 's'}`)
                    setSelected([])
                  }}>Add to shortlists</Button>
                  <Button variant="outline" icon={<Copy />} onClick={() => setDlg('message')}>Copy message for candidate</Button>
                  <Button variant="ghost" onClick={() => setSelected([])}>Clear</Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono tnum">{rows.length}</span> open roles where {c.name} passes the must-haves · client and prospect roles · select 2–3 to pitch
                </div>
              )}
              <ul className="space-y-2">
                {rows.map((r, i) => {
                  const role = roleOf(r.roleId)
                  if (!role) return null
                  const sel = selected.includes(r.roleId)
                  return (
                    <li key={r.roleId} className="flex items-start gap-3">
                      <div className="pt-5">
                        {r.status !== 'not-a-fit'
                          ? <Checkbox aria-label={`Select ${role.title}`} checked={sel} onChange={v => setSelected(s => v ? [...s, r.roleId] : s.filter(x => x !== r.roleId))} />
                          : <span className="block size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <MatchRow
                          rank={i + 1} title={`${role.title} · ${role.company}`}
                          subtitle={`${role.companyType === 'Prospect' && PROSPECT_DESCRIPTOR[role.id] ? `${PROSPECT_DESCRIPTOR[role.id].replace(/^an? /, '').replace(/^./, s => s.toUpperCase())} · ` : ''}${role.location} · ${role.workMode.toLowerCase()} · ${role.pay}`}
                          tag={<CompanyTypeTag type={role.companyType} />}
                          role={role}
                          band={r.band} score={r.score} reason={r.reason} chips={r.chips}
                          status={r.status} dimmed={outOfDate}
                          shortlistLabel="Add to shortlist" rejectLabel="Not a fit"
                          onShortlist={() => addToShortlist(r.roleId)}
                          onReject={() => setNotFit(r.roleId)}
                          onUndo={() => setRoleStatus(r.roleId, 'new')}
                          onAddToAsk={ch => addAsk(`Confirm: ${ch.label.toLowerCase()}?`)}
                          onClick={app.role(r.roleId) ? () => navigate(`/roles/${r.roleId}`) : undefined}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ---------- Resumes tab ---------- */}
      {tab === 'resumes' && (
        <div className="space-y-6">
          <BezelCard icon={<FileText />} title="Original resumes" action={<Button variant="ghost" size="sm" icon={<Upload />} onClick={() => setDlg('resumeChanges')}>Upload new resume</Button>}>
            <ul className="divide-y divide-border">
              {Array.from({ length: c.resumeVersion }).map((_, i) => {
                const v = c.resumeVersion - i
                return (
                  <li key={v} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="font-mono text-xs">v{v}</span>
                    <span className="flex-1 text-sm">{c.name.replace(/\W+/g, '_')}resume_v{v}.pdf</span>
                    <span className="text-xs text-muted-foreground">{i === 0 ? `Riya (intern) · ${c.updated}` : 'Riya (intern) · Sep 12'}</span>
                    <Button variant="ghost" size="sm" icon={<Download />} onClick={() => app.toast('Resume downloaded')}>Download</Button>
                  </li>
                )
              })}
            </ul>
          </BezelCard>
          <section className="space-y-2">
            <h2 className="eyebrow text-[10px] text-gray-1000">Generated</h2>
            {outputsFor.length === 0 ? (
              <div className="rounded-xl border border-border bg-card">
                <EmptyState icon={<FileText />} title="No resumes generated yet" body="Masked and tailored resumes for this candidate will show here."
                  action={<Button variant="outline" onClick={() => navigate(`/resumes/masked?candidates=${c.id}`)}>Masked resume</Button>} />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="hidden h-9 grid-cols-[100px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_max-content] items-center gap-4 border-b border-border bg-secondary/70 px-4 md:grid">
                  {['Type', 'Role', 'Template', 'Created', ''].map(h => <div key={h} className="eyebrow text-[10px] text-gray-1000">{h}</div>)}
                </div>
                {outputsFor.map(o => {
                  const r = o.roleId ? app.role(o.roleId) : undefined
                  const stale = o.stale || (enriched && o.type !== 'As-is')
                  return (
                    <div key={o.id} className="grid grid-cols-1 items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-0 md:grid-cols-[100px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_max-content] md:gap-4">
                      <div><Tag tone={o.type === 'Masked' ? 'outline' : 'neutral'}>{o.type}</Tag></div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate">{r ? `${r.title} — ${r.company}` : 'No role'}</span>
                        {stale
                          ? <span className="inline-flex h-5 items-center gap-1 rounded-md border border-dashed border-warning px-1.5 text-[11px] text-[#b45309]"><AlertTriangle className="size-3" />Stale · Profile changed since</span>
                          : <span className="inline-flex h-5 items-center gap-1 rounded-md border border-border px-1.5 text-[11px] text-gray-1100"><Check className="size-3" />Ready</span>}
                      </div>
                      <div className="text-muted-foreground">{o.template}</div>
                      <div className="text-muted-foreground">{o.createdBy} · {o.created}</div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" icon={<Download />} onClick={() => app.toast(`${o.type} resume downloaded`)}>Download</Button>
                        <Button variant={stale ? 'outline' : 'ghost'} size="sm" icon={<RefreshCw />}
                          onClick={() => navigate(o.type === 'Tailored' ? `/resumes/tailored?candidate=${c.id}&role=${o.roleId ?? ''}` : `/resumes/masked?candidates=${c.id}${o.roleId ? `&role=${o.roleId}` : ''}`)}>Regenerate</Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ---------- History tab ---------- */}
      {tab === 'history' && <HistoryList c={c} />}

      {/* ---------- Dialogs ---------- */}
      <AddCallDialog open={dlg === 'addCall'} onClose={() => setDlg(null)} onRead={() => setDlg('callChanges')} name={c.name} />
      <ProposedChangesDialog open={dlg === 'callChanges'} onClose={() => setDlg(null)} changes={callChangesPriya} onApply={applyCall}
        subtitle="From the call (Fathom). Accepted changes are logged. Confirmed values are never overwritten without your approval." />
      <ProposedChangesDialog open={dlg === 'resumeChanges'} onClose={() => setDlg(null)} changes={resumeChanges} onApply={applyResume}
        subtitle={`New resume read as v${c.resumeVersion + 1}. Earlier versions stay in Sources.`} />
      <ConfirmDialog open={dlg === 'delete'} onClose={() => setDlg(null)} destructive
        title={`Delete ${c.name} and ${deleteCount} generated resume${deleteCount === 1 ? '' : 's'}?`} body="This can't be undone."
        confirmLabel="Delete candidate" cancelLabel="Keep candidate"
        onConfirm={() => {
          app.log({ what: `Deleted ${c.name} and ${deleteCount} generated resumes`, record: c.name, recordHref: '/candidates', kind: 'Candidates' })
          app.toast(`Deleted ${c.name}`)
          navigate('/candidates')
        }} />
      <RejectDialog open={!!notFit} onClose={() => setNotFit(null)} candidateName={c.name} roleTitle={notFitRole?.title ?? ''}
        title={`Not a fit: ${notFitRole?.title ?? ''} · ${notFitRole?.company ?? ''}`}
        onConfirm={reason => {
          if (!notFit) return
          const rid = notFit
          setRoleStatus(rid, 'not-a-fit')
          setSelected(s => s.filter(x => x !== rid))
          app.log({ what: `Marked not a fit · ${reason}`, record: `${notFitRole?.title} — ${notFitRole?.company}`, recordHref: `/roles/${rid}`, kind: 'Decisions' })
          app.toast(`Marked not a fit for ${notFitRole?.title}`, { undo: () => setRoleStatus(rid, 'new') })
        }} />
      <CandidateMessageDialog open={dlg === 'message'} onClose={() => setDlg(null)} c={c} roles={selected.map(roleOf).filter((r): r is Role => !!r)} />
    </ScrollPage>
  )
}

/* ==========================================================================
   Inline section editors
   ========================================================================== */
function EditFooter({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
      <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      <Button variant="outline" onClick={onSave}>Save</Button>
    </div>
  )
}

function BasicsEdit({ c, onCancel, onSave }: { c: Candidate; onCancel: () => void; onSave: (p: Partial<Candidate>) => void }) {
  const [headline, setHeadline] = useState(c.headline)
  const [city, setCity] = useState(c.city ?? '')
  const [email, setEmail] = useState(c.email ?? '')
  const [phone, setPhone] = useState(c.phone ?? '')
  return (
    <div className="space-y-4">
      <Field label="Headline"><Input value={headline} onChange={e => setHeadline(e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current city"><Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Austin, TX" /></Field>
        <Field label="Email"><Input value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Phone"><Input value={phone} onChange={e => setPhone(e.target.value)} /></Field>
      </div>
      <EditFooter onCancel={onCancel} onSave={() => onSave({ headline, city: city || null, email, phone, fieldSources: { ...c.fieldSources, headline: 'EDITED', city: 'EDITED' } })} />
    </div>
  )
}

function PreferencesEdit({ c, onCancel, onSave }: { c: Candidate; onCancel: () => void; onSave: (p: Partial<Candidate>, keyChanged: boolean) => void }) {
  const [modes, setModes] = useState<WorkMode[]>(c.workModes ?? [])
  const [relocate, setRelocate] = useState<'Not captured' | 'Yes' | 'No' | 'Specific'>(c.relocate ?? 'Not captured')
  const [places, setPlaces] = useState((c.relocatePlaces ?? []).join(', '))
  const [pay, setPay] = useState(c.pay ?? '')
  const [availability, setAvailability] = useState(c.availability ?? '')
  const [search, setSearch] = useState<'Not captured' | 'Active' | 'Passive'>(c.searchStatus ?? 'Not captured')
  const toggle = (m: WorkMode) => setModes(x => x.includes(m) ? x.filter(y => y !== m) : [...x, m])
  const save = () => {
    const newModes = modes.length ? modes : null
    const newReloc = relocate === 'Not captured' ? null : relocate
    const key = JSON.stringify(newModes) !== JSON.stringify(c.workModes) || newReloc !== c.relocate
    onSave({
      workModes: newModes, relocate: newReloc, relocatePlaces: relocate === 'Specific' ? places.split(',').map(s => s.trim()).filter(Boolean) : [],
      pay: pay || null, availability: availability || null, searchStatus: search === 'Not captured' ? null : search,
      fieldSources: { ...c.fieldSources, workModes: 'EDITED', relocate: 'EDITED', pay: 'EDITED', availability: 'EDITED', searchStatus: 'EDITED' },
    }, key)
  }
  return (
    <div className="space-y-4">
      <Field label="Work mode">
        <div className="flex flex-wrap gap-1.5">{(['Remote', 'Hybrid', 'Onsite'] as WorkMode[]).map(m => <FilterChip key={m} active={modes.includes(m)} onClick={() => toggle(m)}>{m}</FilterChip>)}</div>
      </Field>
      <Field label="Open to relocate">
        <Segmented aria-label="Open to relocate" value={relocate} onChange={setRelocate} options={['Not captured', 'Yes', 'No', 'Specific']} />
      </Field>
      {relocate === 'Specific' && <Field label="Where to"><Input value={places} onChange={e => setPlaces(e.target.value)} placeholder="e.g. Austin, NYC" /></Field>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pay expectation"><Input value={pay} onChange={e => setPay(e.target.value)} placeholder="$150k–$170k" suffix="USD / yr" /></Field>
        <Field label="Availability"><Input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="e.g. 3 weeks notice" /></Field>
      </div>
      <Field label="Search status"><Segmented aria-label="Search status" value={search} onChange={setSearch} options={['Not captured', 'Active', 'Passive']} /></Field>
      <InfoNote>Changing work mode or relocation marks matching roles out of date.</InfoNote>
      <EditFooter onCancel={onCancel} onSave={save} />
    </div>
  )
}

function WorkAuthEdit({ c, onCancel, onSave }: { c: Candidate; onCancel: () => void; onSave: (p: Partial<Candidate>, keyChanged: boolean) => void }) {
  const w = c.workAuth
  const [status, setStatus] = useState<'Not captured' | 'US citizen' | 'Green card' | 'Visa'>(w.status ?? 'Not captured')
  const [visa, setVisa] = useState<VisaType>(w.visaType ?? 'H-1B')
  const [expiry, setExpiry] = useState(w.expiryMonths != null ? String(w.expiryMonths) : '')
  const [spons, setSpons] = useState(!!w.needsSponsorship)
  const [transfer, setTransfer] = useState(!!w.needsTransfer)
  const [notes, setNotes] = useState(w.notes ?? '')
  const save = () => {
    const next: WorkAuth = status === 'Not captured' ? { status: null } : {
      status, visaType: status === 'Visa' ? visa : null, expiryMonths: status === 'Visa' && expiry ? Number(expiry) : null,
      needsSponsorship: status === 'Visa' ? spons : false, needsTransfer: status === 'Visa' ? transfer : false, notes,
    }
    const key = next.status !== w.status || next.visaType !== (w.visaType ?? null) || !!next.needsSponsorship !== !!w.needsSponsorship || !!next.needsTransfer !== !!w.needsTransfer
    onSave({ workAuth: next, fieldSources: { ...c.fieldSources, workAuth: 'EDITED' } }, key)
  }
  return (
    <div className="space-y-4">
      <Field label="Status"><Segmented aria-label="Work authorization status" value={status} onChange={setStatus} options={['Not captured', 'US citizen', 'Green card', 'Visa']} /></Field>
      {status === 'Visa' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visa type"><Select aria-label="Visa type" className="w-full" value={visa} onChange={v => setVisa(v as VisaType)} options={['OPT', 'STEM OPT', 'H-1B', 'Other']} /></Field>
            <Field label="Expires in"><Input type="number" min={0} value={expiry} onChange={e => setExpiry(e.target.value)} suffix="months" /></Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <Switch checked={spons} onChange={setSpons} label="Needs sponsorship" />
            <Switch checked={transfer} onChange={setTransfer} label="Needs transfer" />
          </div>
        </>
      )}
      <Field label="Flexibility notes"><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Can manage on own for 6 months" /></Field>
      <InfoNote>Changing status, visa type, sponsorship or transfer marks matching roles out of date.</InfoNote>
      <EditFooter onCancel={onCancel} onSave={save} />
    </div>
  )
}

function NotesEdit({ c, onCancel, onSave }: { c: Candidate; onCancel: () => void; onSave: (p: Partial<Candidate>) => void }) {
  const [take, setTake] = useState(c.ourTake ?? '')
  return (
    <div className="space-y-4">
      <Field label="Our take" hint="One or two sentences for masked resumes.">
        <Textarea value={take} onChange={e => setTake(e.target.value)} maxChars={280} />
      </Field>
      <EditFooter onCancel={onCancel} onSave={() => onSave({ ourTake: take })} />
    </div>
  )
}

/* ==========================================================================
   Dialogs local to S-07
   ========================================================================== */
function AddCallDialog({ open, onClose, onRead, name }: { open: boolean; onClose: () => void; onRead: () => void; name: string }) {
  const [mode, setMode] = useState<'link' | 'transcript'>('link')
  const [link, setLink] = useState('')
  const [text, setText] = useState('')
  useEffect(() => { if (open) { setLink(''); setText(''); setMode('link') } }, [open])
  const ready = mode === 'link' ? link.trim().length > 0 : text.trim().length > 0
  return (
    <Dialog open={open} onClose={onClose} width={520} title={`Add call for ${name}`}
      description="Paste the Fathom or Granola link, or the transcript. We'll propose changes; nothing is overwritten without your approval."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ready} onClick={() => { onClose(); onRead() }} data-autofocus={ready || undefined}>Read call</Button>
      </>}>
      <div className="space-y-4">
        <Segmented aria-label="Call source" value={mode} onChange={setMode} options={[{ value: 'link', label: 'Link' }, { value: 'transcript', label: 'Transcript' }]} />
        {mode === 'link'
          ? <Field label="Call link"><Input data-autofocus value={link} onChange={e => setLink(e.target.value)} placeholder="https://fathom.video/share/…" /></Field>
          : <Field label="Transcript"><Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste the transcript…" className="min-h-32" /></Field>}
        <Button variant="link" className="text-xs" icon={<Link2 />} onClick={() => { setMode('link'); setLink('https://fathom.video/share/priya-intro-call-example') }}>Use example call</Button>
      </div>
    </Dialog>
  )
}

function CandidateMessageDialog({ open, onClose, c, roles }: { open: boolean; onClose: () => void; c: Candidate; roles: Role[] }) {
  const { toast } = useApp()
  const first = c.name.split(' ')[0]
  const line = (r: Role) => r.companyType === 'Prospect'
    ? `• ${r.title} at ${PROSPECT_DESCRIPTOR[r.id] ?? `a ${r.category.toLowerCase()} team in ${r.location}`}`
    : `• ${r.title} at ${r.company} (${r.location.split(',')[0]}, ${r.workMode.toLowerCase()})`
  const build = () => `Hi ${first},\n\nGreat speaking today. Based on what you told me, I think you'd also be a strong fit for ${roles.length === 1 ? 'this role' : `these ${roles.length} roles`}:\n\n${roles.map(line).join('\n')}\n\nWant me to put you forward? Happy to share more on any of them before you decide.\n\nVandit\nHeroScouter`
  const [text, setText] = useState(build)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setText(build()) }, [open, roles.map(r => r.id).join(',')])
  return (
    <Dialog open={open} onClose={onClose} width={600} title="Copy message for candidate"
      description="Edit before copying. You send it yourself, so it stays personal. Prospect companies are described, not named."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" icon={<Copy />} data-autofocus onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); toast(`Copied message for ${first}`); onClose() }}>Copy</Button>
      </>}>
      <Textarea value={text} onChange={e => setText(e.target.value)} className="min-h-[240px] font-mono text-[12.5px] leading-relaxed" />
    </Dialog>
  )
}

function HistoryList({ c }: { c: Candidate }) {
  const { activity } = useApp()
  const items = activity.filter(a => a.recordHref === `/candidates/${c.id}` || a.what.includes(c.name) || a.record === c.name)
  if (!items.length) {
    return <div className="rounded-xl border border-border bg-card"><EmptyState icon={<FileText />} title="No history yet" body="Edits, calls and decisions about this candidate will show here." /></div>
  }
  return (
    <ol className="overflow-hidden rounded-xl border border-border bg-card">
      {items.map(a => (
        <li key={a.id} className="flex flex-wrap items-start gap-3 border-b border-border px-4 py-3 last:border-0">
          <Avatar initials={a.who === 'System' ? 'HS' : a.who.split(' ').map(s => s[0]).join('').slice(0, 2)} />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-sm"><span className="font-medium">{a.who}</span> · {a.what}</div>
            <div className="text-xs text-muted-foreground">{a.record}</div>
            {a.before && <div className="text-xs"><span className="text-muted-foreground line-through">{a.before}</span> <span className="text-gray-800">→</span> {a.after}</div>}
          </div>
          <span className="eyebrow text-[10px] text-gray-1000">{a.kind}</span>
          <span className="text-xs text-muted-foreground">{a.when}</span>
        </li>
      ))}
    </ol>
  )
}
