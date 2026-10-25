import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, CircleCheck, Copy, Download, EyeOff, LayoutTemplate, Lock, MessageSquareQuote, RefreshCw, Sparkles, Target,
} from 'lucide-react'
import { ScrollPage, SplitPane, useTopBar } from '../shell/AppShell'
import { BezelCard, Button, Checkbox, EmptyState, ExampleMark, Field, Input, Segmented, Select, Skeleton, Switch, Textarea, cn } from '../components/ui'
import { Banner, DocFrame, InfoNote } from '../components/hs'
import { useApp, useWireframeState } from '../store/AppStore'
import { CopyEmailDialog } from './Dialogs'
import type { Candidate, Role } from '../data/types'

/* ==========================================================================
   S-09 · Masked resume builder (single and bulk) — Product Design Doc §8, §9
   Opens already rendered with defaults (P5). Assumed facts are never printed;
   predicted skills are never printed as skills.
   ========================================================================== */

type TemplateId = 'A' | 'B' | 'C'
const TEMPLATE_LABEL: Record<TemplateId, string> = { A: 'A · Compact', B: 'B · Achievement-led', C: 'C · Role-fit' }
const RECRUITER = { first: 'Vandit', email: 'vandit@heroscouter.com' }

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

function draftBullets(c: Candidate, r: Role | undefined, variant: number): string[] {
  const hand = r ? HAND_BULLETS[`${c.id}|${r.id}`] : undefined
  if (hand && variant % 2 === 0) return hand
  const yrs = c.years != null ? `${c.years} years` : 'Several years'
  const sub = c.subcategory.toLowerCase()
  const top = c.skills.slice(0, 2).join(' and ')
  const evidenced = r ? r.mustSkills.filter(s => c.skills.includes(s)) : []
  const a = c.achievements[variant % 2 === 0 ? 0 : 1] ?? c.achievements[0]
  const out = [
    r
      ? `${yrs} of ${sub} work${evidenced.length ? `, with ${evidenced.join(' and ')} on record` : ''}, a close match for ${r.title}.`
      : `${yrs} as a ${sub}${top ? `, strongest in ${top}` : ''}.`,
    a ? `Proven impact: ${lowerFirst(a)}.` : '',
    c.availability && c.metro ? `Available in ${c.availability.replace(' notice', '')} · ${c.metro}${c.workModes ? `, ${c.workModes[0].toLowerCase()}` : ''}.` : '',
  ].filter(Boolean)
  return variant % 2 === 0 ? out : [...out].reverse()
}

function aliasOf(c: Candidate) {
  return [c.headline.split(' · ')[0], c.years != null ? `${c.years} yrs` : null, ALIAS_DOMAIN[c.id] ?? c.headline.split(' · ')[1]].filter(Boolean).join(' · ')
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

interface Per { show: Record<string, boolean>; bullets: string[]; draft: number; take: string; res: Record<string, 'describe' | 'keep'> }

/* ---------- Screen ---------- */
const STATES = [
  { id: 'live', label: 'Live (from link)' },
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
    case 'identifiers': ids = ['priya']; role = 'northwind-spm'; break
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
  const cands = ids.map(id => app.candidate(id)).filter((c): c is Candidate => !!c)
  const bulk = cands.length > 1
  const [target, setTarget] = useState(initialRole)
  const [draftedFor, setDraftedFor] = useState(initialRole)
  const [postingUrl, setPostingUrl] = useState('')
  const [template, setTemplate] = useState<TemplateId>('A')
  const [aliasOn, setAliasOn] = useState(true)
  const [showSchools, setShowSchools] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [active, setActive] = useState(cands[0].id)
  const [reviewing, setReviewing] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(0)
  const [focusFlag, setFocusFlag] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const idRef = useRef<HTMLDivElement>(null)

  const r = target !== 'none' && target !== 'url' ? app.role(target) : undefined
  const [per, setPer] = useState<Record<string, Per>>(() => Object.fromEntries(cands.map(c => [c.id, {
    show: {}, bullets: draftBullets(c, r, 0), draft: 0, take: c.ourTake ?? '', res: {},
  }])))
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

  const download = (list: Candidate[], anyway: boolean) => {
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      app.addOutputs(list.map(c => ({ candidateId: c.id, type: 'Masked' as const, roleId: r?.id ?? null, template: TEMPLATE_LABEL[template], stale: false })))
      list.forEach(c => {
        const n = unresolved(c).length
        app.log({
          what: `Generated masked resume for ${c.name} (template ${template})${anyway && n ? ` · downloaded anyway with ${n} possible identifier${n === 1 ? '' : 's'}` : ''}`,
          record: r ? `${r.title} — ${r.company}` : c.name, recordHref: r ? `/roles/${r.id}` : `/candidates/${c.id}`, kind: 'Outputs',
        })
      })
      app.toast(list.length > 1 ? `Downloaded ${list.length} masked resumes` : 'Masked resume downloaded')
      setReviewing(false)
    }, 700)
  }

  const roleOptions = [
    ...app.roles.filter(x => x.status !== 'Closed').map(x => ({ value: x.id, label: `${x.title} — ${x.company}` })),
    { value: 'none', label: 'No specific role' },
    { value: 'url', label: 'Public posting URL' },
  ]

  /* ---------- Left: Settings ---------- */
  const left = (
    <>
      {bulk && <div className="eyebrow text-gray-1000">Sections 3–5 apply to <span className="text-foreground">{cur.name}</span></div>}
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

      <BezelCard icon={<LayoutTemplate />} title="2 · Template">
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
        <p className="mt-3 text-xs text-muted-foreground">The default is set in Settings.</p>
      </BezelCard>

      <BezelCard icon={<EyeOff />} title="3 · What's hidden">
        <div className="space-y-4">
          <Checkbox checked={aliasOn} onChange={setAliasOn} label="Name → descriptive alias" description={aliasOf(cur)} />
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
          const d = curPer.draft + 1
          patch(cur.id, { bullets: draftBullets(cur, r, d), draft: d }); setDraftedFor(target)
          app.toast('Bullets regenerated')
        }}>Regenerate bullets</Button>}>
        <div className="space-y-2">
          {curPer.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 font-mono text-[10px] text-gray-1000 tnum">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <Textarea aria-label={`Bullet ${i + 1}`} className="min-h-9 py-1.5" value={b}
                  onChange={e => patch(cur.id, { bullets: curPer.bullets.map((x, j) => (j === i ? e.target.value : x)) })} />
              </div>
            </div>
          ))}
          {curPer.bullets.length === 0 && <p className="text-sm text-muted-foreground">Not enough on record to draft bullets. Add achievements to the profile.</p>}
        </div>
        {draftedFor !== target && <div className="mt-3"><InfoNote>Target changed. Regenerate bullets to write them for {r ? r.title : 'their strengths'}.</InfoNote></div>}
        <p className="mt-3 text-xs text-muted-foreground">AI-drafted from the profile. Edit freely; only facts on record are used.</p>
      </BezelCard>

      <BezelCard icon={<MessageSquareQuote />} title="5 · Our take" action={<span className="text-xs text-muted-foreground">Optional</span>}>
        <Textarea maxChars={280} placeholder="One line in your own words, e.g. what stood out on the call." value={curPer.take}
          onChange={e => patch(cur.id, { take: e.target.value })} aria-label="Our take" />
        <p className="mt-2 text-xs text-muted-foreground">Printed in quotes and signed “— {RECRUITER.first}”.</p>
      </BezelCard>
    </>
  )

  /* ---------- Right: Preview ---------- */
  const thin = cur.achievements.length <= 2
  const omitted = notShown(cur)
  const kept = (FLAGS[cur.id] ?? []).filter(f => curPer.res[f.id] === 'keep')
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
        {omitted.length > 0 && <InfoNote>Not shown: {omitted.join(', ')}.</InfoNote>}
        {thin && <InfoNote>Only {cur.achievements.length} achievement{cur.achievements.length === 1 ? '' : 's'} found. The page will be shorter.</InfoNote>}
      </div>
      <div className="min-h-0 flex-1">
        <DocFrame toolbar={<Switch checked={showHidden} onChange={setShowHidden} label="Show what's hidden" />}>
          {rendering ? <PageSkeleton /> : (
            <MaskedPage c={cur} r={r} template={template} per={curPer} aliasOn={aliasOn} showSchools={showSchools}
              showHidden={showHidden} reviewing={reviewing} focusFlag={focusFlag} postingUrl={target === 'url' ? postingUrl : ''} />
          )}
        </DocFrame>
      </div>
    </div>
  )

  /* ---------- Footer ---------- */
  const flagsHere = bulk ? totalFlags : curFlags.length
  const footer = (
    <div className="flex flex-wrap items-center gap-2">
      <Button icon={<Copy />} onClick={() => setEmailOpen(true)}>Copy email text</Button>
      <span className="eyebrow ml-1 hidden text-gray-1000 sm:inline">{TEMPLATE_LABEL[template]} · {r ? `${r.title} — ${r.company}` : target === 'url' ? 'Public posting' : 'No specific role'}</span>
      <div className="ml-auto flex items-center gap-2">
        {flagsHere > 0 && reviewing && (
          <Button variant="ghost" icon={<Download />} disabled={rendering} onClick={() => download(bulk ? cands : [cur], true)}>{bulk ? 'Download all anyway' : 'Download anyway'}</Button>
        )}
        {flagsHere > 0 ? (
          <Button variant="primary" icon={<AlertTriangle />} onClick={reviewNext}>Review {flagsHere} possible identifier{flagsHere === 1 ? '' : 's'}</Button>
        ) : (
          <Button variant="primary" icon={<Download />} disabled={rendering} onClick={() => download(bulk ? cands : [cur], false)}>
            {bulk ? `Download all (${cands.length})` : 'Download PDF'}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <SplitPane leftTitle="Settings" rightTitle={bulk ? `Preview · ${cands.length} candidates` : 'Preview'}
        leftActions={<ExampleMark />} rightActions={<span className="font-mono text-[11px] text-muted-foreground">{rendering ? 'Rendering…' : failed ? 'Not generated' : 'Ready'}</span>}
        left={left} right={right} footer={footer} />
      <CopyEmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} candidateIds={cands.map(c => c.id)} roleId={r?.id ?? null} initialVariant="prospect" />
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

/* ---------- Masked page (§9.1) ---------- */
function Masked({ on, what, children }: { on: boolean; what: string; children: React.ReactNode }) {
  return <span className={on ? 'hidden-span px-0.5' : undefined} title={on ? `Hidden: ${what}` : undefined}>{children}</span>
}
function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 font-mono text-[8px] font-medium tracking-[0.14em] text-gray-1000 uppercase">{children}</h3>
}

function MaskedPage({ c, r, template, per, aliasOn, showSchools, showHidden, reviewing, focusFlag, postingUrl }: {
  c: Candidate; r: Role | undefined; template: TemplateId; per: Per; aliasOn: boolean; showSchools: boolean
  showHidden: boolean; reviewing: boolean; focusFlag: string | null; postingUrl: string
}) {
  const flags = FLAGS[c.id] ?? []
  const alias = aliasOf(c)
  const auth = workAuthPill(c)
  const availability = c.fieldSources.availability === 'ASSUMED' ? null : c.availability
  const loc = c.metro ? `${c.metro}${c.workModes ? ` · ${c.workModes.join(' / ').toLowerCase()}` : ''}` : null
  const impact = c.achievements.filter(a => /\d/.test(a)).slice(0, 4)
  const bullets = per.bullets.filter(b => b.trim())

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

  const pills = [availability ? `Available: ${availability}` : null, auth, loc].filter((p): p is string => !!p)
  const header = (
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
    <section>
      <H>Why we recommend</H>
      <ul className="space-y-1 text-[9.5px] leading-snug">
        {bullets.map((b, i) => <li key={i} className="flex gap-1.5"><span className="text-gray-800">—</span><span>{withFlags(b)}</span></li>)}
      </ul>
    </section>
  )
  const take = per.take.trim() && (
    <section className="border-l-2 border-gray-1100 pl-3">
      <p className="text-[10px] leading-snug italic">“{per.take.trim().slice(0, 280)}”</p>
      <p className="mt-0.5 text-[8px] text-gray-1000">— {RECRUITER.first}, HeroScouter</p>
    </section>
  )
  const impactList = impact.length > 0 && (
    <section>
      <H>Impact highlights</H>
      <ul className="space-y-1 text-[9.5px] leading-snug">
        {impact.map((a, i) => <li key={i} className="flex gap-1.5"><span className="text-gray-800">▪</span><span>{withFlags(a)}</span></li>)}
      </ul>
    </section>
  )
  const bigNums = impact.length > 0 && (
    <section className={cn('grid gap-2', impact.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
      {impact.map((a, i) => (
        <div key={i} className="rounded-md border border-gray-500 p-2.5">
          <div className="font-mono text-[18px] leading-none font-medium tracking-tight">{bigNumber(a) ?? '—'}</div>
          <div className="mt-1 text-[8.5px] leading-snug text-gray-1100">{withFlags(a)}</div>
        </div>
      ))}
    </section>
  )
  const skills = (c.skills.length > 0 || c.tools.length > 0) && (
    <section>
      <H>Skills</H>
      <div className="space-y-1 text-[9px]">
        {c.skills.length > 0 && <div className="flex gap-2"><span className="w-9 shrink-0 text-gray-1000">Core</span><span>{c.skills.join(' · ')}</span></div>}
        {c.tools.length > 0 && <div className="flex gap-2"><span className="w-9 shrink-0 text-gray-1000">Tools</span><span>{c.tools.join(' · ')}</span></div>}
      </div>
    </section>
  )
  const exp = c.companies.length > 0 && (
    <section>
      <H>Experience</H>
      <ol className="space-y-1.5 border-l border-gray-500 pl-3 text-[9px]">
        {c.companies.map(co => {
          const shown = !!per.show[co.name]
          const note = EXP_NOTES[c.id]?.[co.name]
          return (
            <li key={co.name} className="relative">
              <span className="absolute top-1 -left-[15px] size-1.5 rounded-full bg-gray-1100" />
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{co.title}</span>
                <span className="shrink-0 font-mono text-[8px] text-gray-1000 tnum">{co.start}–{co.end}</span>
              </div>
              <div className="text-gray-1100">{shown ? co.name : <Masked on={showHidden} what={`Employer: ${co.name}`}>{co.descriptor}</Masked>}</div>
              {note && <div className="text-[8.5px] text-gray-1100">{withFlags(note)}</div>}
            </li>
          )
        })}
      </ol>
    </section>
  )
  const edu = c.education && (
    <section>
      <H>Education</H>
      <p className="text-[9px]">
        {c.education.degree}, {c.education.field}
        {showSchools ? ` · ${c.education.school}` : showHidden ? <> · <span className="hidden-span px-0.5" title={`Hidden: ${c.education.school}`}>school hidden</span></> : null}
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
      <section className="rounded-md border border-gray-500">
        <div className="border-b border-gray-500 bg-gray-100 px-3 py-1.5 font-mono text-[8px] font-medium tracking-[0.14em] uppercase">Fit for {r.title}</div>
        <table className="w-full text-[9px]">
          <tbody>
            {rows.map((x, i) => (
              <tr key={i} className="border-b border-gray-300 last:border-0">
                <td className="w-1/3 px-3 py-1 align-top text-gray-1100">✓ {x.need}</td>
                <td className="px-3 py-1">{withFlags(x.evidence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )
  }

  const body: React.ReactNode[] =
    template === 'B' ? [bigNums, why, take, exp, skills, edu]
      : template === 'C' ? [fit, why, take, impactList, skills, exp, edu]
        : [why, take, impactList, skills, exp, edu]

  return (
    <article className="flex h-full min-h-full flex-col gap-4 px-7 py-6 text-[#111]" aria-label="Masked resume preview">
      {header}
      {postingUrl && <p className="font-mono text-[7.5px] text-gray-1000">Written for the posting at {postingUrl}</p>}
      {body.filter(Boolean).map((b, i) => <React.Fragment key={i}>{b}</React.Fragment>)}
      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-gray-500 pt-2.5 text-[8.5px]">
        <span>Interested? Reply to {RECRUITER.first} at <span className="font-medium">{RECRUITER.email}</span></span>
        <span className="text-right text-gray-1000">Profile: {alias}</span>
      </footer>
    </article>
  )
}
