import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Map as MapIcon, Sparkles } from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import { FLOWS } from '../shell/flows'
import { BezelCard, ExampleMark, PageHeader, Tag, cn } from '../components/ui'

/* ==========================================================================
   Screen index — the review map for founders (not part of the product).
   ========================================================================== */

const SCREENS: { id: string; name: string; to: string; priority: 'Must' | 'Should'; states: string[]; v3?: string }[] = [
  { id: 'S-01', name: 'App shell', to: '/roles', priority: 'Must', states: ['Expanded', 'Collapsed', 'Phone sheet', 'View as Admin / Recruiter / Associate'], v3: 'T5' },
  { id: 'S-02', name: 'Roles list (home)', to: '/roles', priority: 'Must', states: ['Latest update column', 'Next step: Score · Rerun · Review', 'Empty', 'Loading', 'Error'], v3: 'T9' },
  { id: 'S-03', name: 'New / edit role', to: '/roles/new', priority: 'Must', states: ['Empty source', 'Extracting', 'Requirement effect: Eliminates vs Improves score', 'Auto-suggest top 5 on save', 'Edit mode → D-03'], v3: 'v0.4 · N24 · C5 · C6' },
  { id: 'S-04', name: 'Role page · Matches', to: '/roles/brightdesk-gmm', priority: 'Must', states: ['Auto-suggested (5)', 'Strong / Mild / Not recommended', 'Create Gmail drafts → D-09', 'Selection bar', 'Out of date', 'Eliminated'], v3: 'v0.4 · N24 · N25 · C7' },
  { id: 'S-04', name: 'Role page · Shortlist + Details', to: '/roles/lumen-fse?tab=shortlist', priority: 'Must', states: ['Interest status + Not interested → D-10', 'Create Gmail drafts → D-09', 'Generate (4)', 'Requirements (Eliminates / Improves score)', 'Recent activity'], v3: 'v0.4 · N25 · N26' },
  { id: 'S-05', name: 'Candidates list (pool)', to: '/candidates', priority: 'Must', states: ['Availability filter & column', 'Filter bar (OR in · AND across)', 'Columns menu', 'Bulk selection', 'No results', 'Phone'], v3: 'v0.4 · N27' },
  { id: 'S-06', name: 'New candidate', to: '/candidates/new', priority: 'Must', states: ['Empty', 'Extracting', 'Extracted', 'Duplicate → D-07', 'Failed'], v3: 'T3' },
  { id: 'S-07', name: 'Candidate profile', to: '/candidates/priya?tab=resumes', priority: 'Must', states: ['Availability + pause switch', 'Role interest history', 'Create Gmail drafts → D-09', 'Signed take', 'Matching roles', 'Resumes'], v3: 'v0.4 · N25 · N26 · N27' },
  { id: 'S-08', name: 'Candidate preview (panel)', to: '/roles/northwind-spm', priority: 'Must', states: ['From role (recommendation + band)', 'From list'] },
  { id: 'S-09', name: 'Masked resume builder', to: '/resumes/masked?candidates=priya&role=northwind-spm', priority: 'Must', states: ['Creative vs Traditional style', 'PDF vs Web link + revoke', 'Refine diff', 'Source resume', 'Signed / draft take'], v3: 'v0.4 · N28 · C12' },
  { id: 'S-10', name: 'Editable resume review', to: '/resumes/editable?role=northwind-spm&candidates=priya,jordant', priority: 'Should', states: ['Traditional vs Creative style', 'PDF / DOCX / Web link + revoke', 'Editable + refine', 'Send as-is', 'Associate (gated)'], v3: 'v0.4 · N28 · C12' },
  { id: 'S-11', name: 'Resumes library', to: '/resumes', priority: 'Should', states: ['Style column (Creative / Traditional)', 'Delivery & 1-click link revoke', 'Source · Prompt · Revisions', 'Empty', 'Loading'], v3: 'v0.4 · N28 · C12' },
  { id: 'S-12', name: 'Activity log', to: '/activity', priority: 'Should', states: ['Batch events', 'Empty', 'Filtered'] },
  { id: 'S-13', name: 'Settings', to: '/settings?tab=prompts', priority: 'Should', states: ['Matching (Auto-suggest count + Effect table)', 'Prompts + Probe 1 (§8.1)', 'Templates + Defaults + Probe 2 (§8.2)', 'Skill list + Domains', 'Team & access'], v3: 'v0.4 · C5 · C6 · C12 · §8' },
  { id: 'S-14', name: 'Command palette (⌘K)', to: '/roles', priority: 'Should', states: ['Results', 'No matches'] },
]

const DIALOGS = [
  { id: 'D-01', name: 'Reject with a reason (single or batch)', where: 'S-04 row ✕ / E · selection bar' },
  { id: 'D-02', name: 'Rerun matching (re-scores only scored)', where: 'S-04 out-of-date banner' },
  { id: 'D-03', name: 'Review proposed changes', where: 'S-07 ⋯ Add call · S-03 Paste revised JD' },
  { id: 'D-04', name: 'Include anyway', where: 'S-04 See eliminated' },
  { id: 'D-05', name: 'Leave without saving', where: 'S-03 Cancel with edits' },
  { id: 'D-06', name: 'Confirm assumed must-haves', where: 'S-04 bulk Shortlist' },
  { id: 'D-07', name: 'Update or another resume', where: 'S-07 ⋯ Upload resume · S-06 duplicate' },
  { id: 'D-08', name: 'Add requirement (Eliminates vs Improves score)', where: 'S-04 ⋯ · S-03 Requirements card' },
  { id: 'D-09', name: 'Create Gmail drafts (5 kinds · Probe 1)', where: 'S-04 Shortlist / selection bar · S-07 header' },
  { id: 'D-10', name: 'Not interested reason (candidate vs role)', where: 'S-04 Shortlist interest pill · S-07 Matching roles' },
]

const PRINCIPLES = [
  ['P1', 'The tool remembers and drafts. People decide.'],
  ['P2', 'Evidence before score.'],
  ['P3', "Missing doesn't mean no."],
  ['P4', 'Change is normal.'],
  ['P5', "If we can't automate it, cut the steps."],
  ['P6', 'One primary action per screen.'],
  ['P7', 'Show what the tool did.'],
  ['P8', 'Quiet by default.'],
  ['P9', 'Free before paid.'],
  ['P10', 'One selection pattern.'],
  ['P11', 'Columns, not code.'],
  ['P12', 'Facts live in the profile, wording lives in the output.'],
  ['P13', 'A named vouch is a human act.'],
]

export function WireframeIndex() {
  useTopBar([{ label: 'Screen index' }])
  return (
    <ScrollPage className="max-w-6xl">
      <PageHeader title="HeroScouter Talent Engine · Wireframes" meta="V04 · PRD v0.4 · 14 screens · 10 dialogs · 17 walkthroughs">
        <p className="max-w-2xl pt-1 text-sm text-muted-foreground">
          Clickable mid-fidelity wireframes built on the Rightfit design system with example data from the design doc (§16).
          Use the <span className="font-medium text-foreground">Wireframe</span> pill at the bottom of any screen to switch states or start a walkthrough.
        </p>
      </PageHeader>

      <BezelCard icon={<MapIcon />} title="Founder walkthroughs" action={<ExampleMark />}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FLOWS.map(f => (
            <Link key={f.id} to={f.start} className="group flex flex-col gap-2 rounded-xl border border-border p-4 transition-shadow hover:shadow-custom-hover">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-gray-1000">{f.id}</span>
                <ArrowRight className="ml-auto size-4 text-gray-800 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
              <div className="text-sm font-semibold">{f.title}</div>
              <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">{f.steps.map(s => <li key={s}>{s}</li>)}</ol>
            </Link>
          ))}
        </div>
      </BezelCard>

      <BezelCard icon={<Layers />} title="Screens and states" wellClassName="p-0">
        <div className="divide-y divide-border">
          {SCREENS.map((s, i) => (
            <Link key={i} to={s.to} className="grid grid-cols-[64px_minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/60">
              <span className="font-mono text-xs text-gray-1000">{s.id}</span>
              <span className="flex flex-col gap-0.5"><span className="font-medium">{s.name}</span>{s.v3 && <span className="font-mono text-[10px] text-gray-1000">{s.v3}</span>}</span>
              <span className="flex flex-wrap gap-1.5">{s.states.map(st => <Tag key={st} tone="outline">{st}</Tag>)}</span>
              <span className={cn('eyebrow text-[10px]', s.priority === 'Must' ? 'text-foreground' : 'text-gray-1000')}>{s.priority}</span>
            </Link>
          ))}
        </div>
      </BezelCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <BezelCard icon={<Layers />} title="Dialogs">
          <ul className="space-y-2.5">
            {DIALOGS.map(d => (
              <li key={d.id} className="flex items-baseline gap-3 text-sm">
                <span className="w-10 font-mono text-xs text-gray-1000">{d.id}</span>
                <span className="font-medium">{d.name}</span>
                <span className="ml-auto text-right text-xs text-muted-foreground">{d.where}</span>
              </li>
            ))}
          </ul>
        </BezelCard>
        <BezelCard icon={<Sparkles />} title="Design principles">
          <ul className="space-y-2">
            {PRINCIPLES.map(([id, p]) => (
              <li key={id} className="flex items-baseline gap-3 text-sm"><span className="w-9 font-mono text-xs text-gray-1000">{id}</span>{p}</li>
            ))}
          </ul>
        </BezelCard>
      </div>

      <BezelCard icon={<Sparkles />} title="Visual language legend">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex h-[22px] items-center rounded-md border border-primary bg-primary px-2 text-[11px] text-primary-foreground btn-type">Strong</span>
          <span className="inline-flex h-[22px] items-center rounded-md border border-gray-1100 px-2 text-[11px] btn-type">Mild</span>
          <span className="inline-flex h-[22px] items-center rounded-md border border-dashed border-gray-800 px-2 text-[11px] text-gray-1100 btn-type">Not recommended</span>
          <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-iris/35 bg-iris/[0.08] px-2 text-[11px] text-iris btn-type">✦ Suggested</span>
          <span className="mx-2 h-4 w-px bg-border" />
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5">✓ Evidence</span>
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-info/40 bg-info/[0.06] px-1.5 text-[#0e7490]">◇ Predicted skill</span>
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-warning bg-warning/[0.06] px-1.5 text-[#b45309]">? Assumed</span>
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-destructive/40 px-1.5 text-destructive">! Gap</span>
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-iris/40 bg-iris/[0.07] px-1.5 text-iris">⟲ Re-qualified</span>
        </div>
      </BezelCard>
    </ScrollPage>
  )
}
