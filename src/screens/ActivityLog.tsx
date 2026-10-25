import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, History, SearchX } from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import { Avatar, Button, EmptyState, ExampleMark, PageHeader, Select, cn } from '../components/ui'
import { FilterChip } from '../components/hs'
import { useApp, useWireframeState } from '../store/AppStore'
import type { LogEntry, LogKind } from '../data/types'

/* ==========================================================================
   S-12 · Activity log — trust and memory ("why was Marcus rejected?")
   ========================================================================== */

const KINDS: LogKind[] = ['Roles', 'Candidates', 'Decisions', 'Reruns', 'Outputs', 'Overrides']
const STATES = [
  { id: 'default', label: 'Default' },
  { id: 'empty', label: 'Empty' },
  { id: 'filtered', label: 'Filtered (Decisions)' },
]
const initialsOf = (who: string) => who === 'System' ? 'SY' : who.replace(/\(.*\)/, '').trim().split(/\s+/).map(s => s[0]).join('').replace('.', '').slice(0, 2).toUpperCase()

export function ActivityLog() {
  const app = useApp()
  const [wf, setWf] = useWireframeState('S-12', 'Activity', STATES)
  useTopBar([{ label: 'Activity' }])

  const [kinds, setKinds] = useState<LogKind[]>([])
  const [person, setPerson] = useState('all')
  const [open, setOpen] = useState<string[]>([])

  const activeKinds = wf === 'filtered' ? (kinds.length ? kinds : ['Decisions'] as LogKind[]) : kinds
  const all = wf === 'empty' ? [] : app.activity
  const rows = useMemo(() => all.filter(e => (!activeKinds.length || activeKinds.includes(e.kind)) && (person === 'all' || e.who === person)), [all, activeKinds, person])
  const people = Array.from(new Set(app.activity.map(e => e.who)))
  const filtered = activeKinds.length > 0 || person !== 'all'

  const toggleKind = (k: LogKind) => {
    const next = activeKinds.includes(k) ? activeKinds.filter(x => x !== k) : [...activeKinds, k]
    setKinds(next)
    if (wf === 'filtered') setWf('default')
  }
  const clear = () => { setKinds([]); setPerson('all'); if (wf === 'filtered') setWf('default') }

  return (
    <ScrollPage className="max-w-4xl">
      <PageHeader title={<span className="inline-flex items-center gap-2">Activity <ExampleMark /></span>}
        meta={<span className="tnum">{rows.length} of {all.length} entries</span>} />

      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map(k => (
          <FilterChip key={k} active={activeKinds.includes(k)} count={all.filter(e => e.kind === k).length} onClick={() => toggleKind(k)}>{k}</FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Select aria-label="Person" value={person} onChange={setPerson} options={[{ value: 'all', label: 'Everyone' }, ...people.map(p => ({ value: p, label: p }))]} />
        {filtered && <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          {all.length === 0
            ? <EmptyState icon={<History />} title="No activity yet" body="Nothing here yet. Changes and decisions will show up as the team works." />
            : <EmptyState icon={<SearchX />} title="No entries match these filters" body="Try another type or person." action={<Button onClick={clear}>Clear filters</Button>} />}
        </div>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" aria-label="Activity">
          {rows.map(e => (
            <Entry key={e.id} e={e} open={open.includes(e.id)} onToggle={() => setOpen(o => (o.includes(e.id) ? o.filter(x => x !== e.id) : [...o, e.id]))} />
          ))}
        </ol>
      )}
    </ScrollPage>
  )
}

function Entry({ e, open, onToggle }: { e: LogEntry; open: boolean; onToggle: () => void }) {
  const hasDiff = !!(e.before || e.after)
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <Avatar initials={initialsOf(e.who)} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-sm"><span className="font-medium">{e.who}</span> <span className="text-gray-1100">{lowerFirstVerb(e.what)}</span></p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <Link to={e.recordHref} className="text-foreground underline-offset-2 hover:underline">{e.record}</Link>
            <span aria-hidden>·</span>
            <span className="eyebrow text-[9px] text-gray-1000">{e.kind}</span>
          </div>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tnum">{e.when}</span>
        {hasDiff && (
          <Button variant="ghost" size="icon-sm" aria-expanded={open} aria-label={open ? 'Hide before and after' : 'Show before and after'} onClick={onToggle}
            icon={<ChevronDown className={cn('transition-transform', open && 'rotate-180')} />} />
        )}
      </div>
      {hasDiff && open && (
        <div className="mt-3 ml-11 grid gap-2 rounded-lg border border-border bg-background p-3 text-sm sm:grid-cols-2">
          <div><div className="eyebrow mb-1 text-[10px] text-gray-1000">Before</div><p className="text-muted-foreground line-through decoration-gray-800">{e.before ?? '—'}</p></div>
          <div><div className="eyebrow mb-1 text-[10px] text-gray-1000">After</div><p className="font-medium">{e.after ?? '—'}</p></div>
        </div>
      )}
    </li>
  )
}

/** "Shortlisted Sara M." reads as "shortlisted Sara M." after the person's name */
function lowerFirstVerb(s: string) {
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s
}
