import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Map as MapIcon, Sparkles } from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import { FLOWS } from '../shell/flows'
import { BezelCard, ExampleMark, PageHeader, Tag, cn } from '../components/ui'

/* ==========================================================================
   Screen index — the review map for founders (not part of the product).
   ========================================================================== */

const SCREENS: { id: string; name: string; to: string; priority: 'Must' | 'Should'; states: string[] }[] = [
  { id: 'S-01', name: 'App shell', to: '/roles', priority: 'Must', states: ['Expanded', 'Collapsed', 'Phone sheet', 'Needs attention shown / hidden'] },
  { id: 'S-02', name: 'Roles list (home)', to: '/roles', priority: 'Must', states: ['Default', 'Empty', 'Loading', 'Out-of-date rows', 'Filtered empty', 'Error'] },
  { id: 'S-03', name: 'New / edit role', to: '/roles/new', priority: 'Must', states: ['Empty source', 'Extracting', 'Extracted + live pass count', 'Failed', 'Edit mode → D-03'] },
  { id: 'S-04', name: 'Role page · Matches', to: '/roles/northwind-spm', priority: 'Must', states: ['Never run', 'Running', 'Top 5', 'Out of date', 'After rerun (N9)', 'No one passes', 'Eliminated view'] },
  { id: 'S-04', name: 'Role page · Shortlist', to: '/roles/lumen-fse?tab=shortlist', priority: 'Must', states: ['Prospect role (masked only)', 'Client role (tailored)', 'Details', 'History'] },
  { id: 'S-05', name: 'Candidates list (pool)', to: '/candidates', priority: 'Must', states: ['Default', 'Chip active', 'More filters', 'Bulk selection', 'Copy list menu', 'No results', 'Phone'] },
  { id: 'S-06', name: 'New candidate', to: '/candidates/new', priority: 'Must', states: ['Empty', 'Extracting', 'Extracted', 'Duplicate banner', 'Failed'] },
  { id: 'S-07', name: 'Candidate profile', to: '/candidates/priya', priority: 'Must', states: ['Low / high completeness', 'Assumed chips', 'Predicted skills', 'Matching roles', 'Resumes', 'History'] },
  { id: 'S-08', name: 'Candidate preview (panel)', to: '/roles/northwind-spm', priority: 'Must', states: ['From role (with band)', 'From list'] },
  { id: 'S-09', name: 'Masked resume builder', to: '/resumes/masked?candidates=priya&role=northwind-spm', priority: 'Must', states: ['Single clean', 'Identifiers found', 'Bulk tabs', 'No role', 'Thin profile'] },
  { id: 'S-10', name: 'Tailored resume review', to: '/resumes/tailored?role=northwind-spm&candidates=priya,jordant', priority: 'Should', states: ['Tailor with changes', 'Send as-is'] },
  { id: 'S-11', name: 'Resumes library', to: '/resumes', priority: 'Should', states: ['Default', 'Empty', 'Loading'] },
  { id: 'S-12', name: 'Activity log', to: '/activity', priority: 'Should', states: ['Default', 'Empty', 'Filtered'] },
  { id: 'S-13', name: 'Settings', to: '/settings', priority: 'Should', states: ['Skill list', 'Matching', 'Templates', 'Team'] },
  { id: 'S-14', name: 'Command palette (⌘K)', to: '/roles', priority: 'Should', states: ['Results', 'No matches'] },
]

const DIALOGS = [
  { id: 'D-01', name: 'Reject with a reason', where: 'S-04 match row ✕ / X' },
  { id: 'D-02', name: 'Rerun matching', where: 'S-04 out-of-date banner' },
  { id: 'D-03', name: 'Review proposed changes', where: 'S-07 ⋯ Add call · S-03 Paste revised JD' },
  { id: 'D-04', name: 'Include anyway', where: 'S-04 See eliminated' },
  { id: 'D-05', name: 'Leave without saving', where: 'S-03 Cancel with edits' },
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
]

export function WireframeIndex() {
  useTopBar([{ label: 'Screen index' }])
  return (
    <ScrollPage className="max-w-6xl">
      <PageHeader title="HeroScouter Talent Engine · Wireframes" meta="First release · 14 screens · 5 dialogs · 5 walkthroughs">
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
              <span className="font-medium">{s.name}</span>
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
              <li key={id} className="flex items-baseline gap-3 text-sm"><span className="w-8 font-mono text-xs text-gray-1000">{id}</span>{p}</li>
            ))}
          </ul>
        </BezelCard>
      </div>

      <BezelCard icon={<Sparkles />} title="Visual language legend">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex h-[22px] items-center rounded-md border border-primary bg-primary px-2 text-[11px] text-primary-foreground btn-type">Strong</span>
          <span className="inline-flex h-[22px] items-center rounded-md border border-gray-1100 px-2 text-[11px] btn-type">Good</span>
          <span className="inline-flex h-[22px] items-center rounded-md border border-dashed border-gray-800 px-2 text-[11px] text-gray-1100 btn-type">Stretch</span>
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
