import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Briefcase, Users, FileText, Plus, Sparkles, ArrowRight, Keyboard, X, Terminal, MessageSquarePlus } from 'lucide-react'
import { Avatar, CompanyTypeTag, Kbd, cn } from '../components/ui'
import { useApp } from '../store/AppStore'

/* ==========================================================================
   S-14 · Command palette (⌘K) — recall-based search across people, roles, actions
   ========================================================================== */

interface PaletteItem {
  id: string
  group: 'Candidates' | 'Roles' | 'Actions'
  title: string
  subtitle?: string
  meta?: React.ReactNode
  icon?: React.ReactNode
  onSelect: () => void
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: 'Search people, roles and actions' },
  { keys: ['J', 'K'], label: 'Move through match or candidate rows' },
  { keys: ['␣'], label: 'Open candidate preview side panel' },
  { keys: ['X'], label: 'Select or unselect the focused row' },
  { keys: ['S'], label: 'Shortlist focused or selected rows' },
  { keys: ['E'], label: 'Reject focused or selected rows (reason dialog)' },
  { keys: ['U'], label: 'Undo last shortlist or reject decision' },
]

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { candidates, roles, toast } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      const t = window.setTimeout(() => inputRef.current?.focus(), 10)
      return () => window.clearTimeout(t)
    }
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()

    const candidateItems: PaletteItem[] = candidates
      .filter(c => {
        if (!q) return c.example && ['priya', 'marcus', 'ana', 'dev', 'sara'].includes(c.id)
        const hay = [
          c.name,
          c.headline,
          c.category,
          c.subcategory,
          c.city ?? '',
          c.metro ?? '',
          c.workAuth.status ?? '',
          c.workAuth.visaType ?? '',
          ...(c.domains ?? []),
          ...c.skills,
          ...c.predicted.map(p => p.name),
          ...c.companies.map(co => `${co.name} ${co.descriptor} ${co.title}`),
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 6)
      .map(c => ({
        id: `cand-${c.id}`,
        group: 'Candidates',
        title: c.name,
        subtitle: `${c.headline}${c.companies[0] ? ` · ${c.companies[0].name}` : ''}`,
        meta: <span className="font-mono text-[10px] text-muted-foreground">{c.metro ?? c.category}</span>,
        icon: <Avatar initials={c.initials} size={24} />,
        onSelect: () => {
          navigate(`/candidates/${c.id}`)
          onClose()
        },
      }))

    const roleItems: PaletteItem[] = roles
      .filter(r => {
        if (!q) return ['northwind-spm', 'lumen-fse', 'brightdesk-gmm'].includes(r.id)
        const hay = `${r.title} ${r.company} ${r.category} ${r.subcategory} ${r.location} ${r.mustSkills.join(' ')}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 5)
      .map(r => ({
        id: `role-${r.id}`,
        group: 'Roles',
        title: `${r.title} — ${r.company}`,
        subtitle: `${r.location} · ${r.minYears}+ yrs · ${r.mustSkills.join(', ')}`,
        meta: <CompanyTypeTag type={r.companyType} />,
        icon: <Briefcase className="size-4 text-muted-foreground" />,
        onSelect: () => {
          navigate(`/roles/${r.id}`)
          onClose()
        },
      }))

    const allActions: PaletteItem[] = [
      {
        id: 'act-new-role',
        group: 'Actions',
        title: 'New role',
        subtitle: 'Paste a client JD or prospect posting URL',
        icon: <Plus className="size-4 text-muted-foreground" />,
        onSelect: () => { navigate('/roles/new'); onClose() },
      },
      {
        id: 'act-new-candidate',
        group: 'Actions',
        title: 'New candidate',
        subtitle: 'Build a profile from a resume in one step',
        icon: <Users className="size-4 text-muted-foreground" />,
        onSelect: () => { navigate('/candidates/new'); onClose() },
      },
      {
        id: 'act-add-client-ask-nw',
        group: 'Actions',
        title: 'Add client ask to Northwind Pay',
        subtitle: 'Record a requirement or context note from a client call or email',
        icon: <MessageSquarePlus className="size-4 text-muted-foreground" />,
        onSelect: () => { navigate('/roles/northwind-spm?tab=details'); onClose() },
      },
      {
        id: 'act-edit-prompts',
        group: 'Actions',
        title: 'Edit prompts',
        subtitle: 'Open Settings → Prompts to version or restore AI prompts',
        icon: <Terminal className="size-4 text-muted-foreground" />,
        onSelect: () => { navigate('/settings?tab=prompts'); onClose() },
      },
      {
        id: 'act-find-roles-priya',
        group: 'Actions',
        title: 'Find roles for Priya S.',
        subtitle: 'Open Priya S. → Matching roles tab',
        icon: <Sparkles className="size-4 text-muted-foreground" />,
        onSelect: () => { navigate('/candidates/priya?tab=roles'); onClose() },
      },
      {
        id: 'act-masked-priya',
        group: 'Actions',
        title: 'Masked resume for Priya S.',
        subtitle: 'Open one-click masked PDF builder with prompt refinement',
        icon: <FileText className="size-4 text-muted-foreground" />,
        onSelect: () => { navigate('/resumes/masked?candidates=priya&role=northwind-spm'); onClose() },
      },
      {
        id: 'act-editable-priya',
        group: 'Actions',
        title: 'Editable resume for Priya S.',
        subtitle: 'Open editable client resume review (PDF + DOCX)',
        icon: <FileText className="size-4 text-muted-foreground" />,
        onSelect: () => { navigate('/resumes/editable?role=northwind-spm&candidates=priya,jordant'); onClose() },
      },
      {
        id: 'act-marketing-list',
        group: 'Actions',
        title: 'Copy all Marketing candidates (masked)',
        subtitle: 'Urgent list — copies 38 candidates to clipboard',
        icon: <Users className="size-4 text-muted-foreground" />,
        onSelect: () => {
          navigate('/candidates')
          toast('Copied 38 Marketing candidates (masked)')
          onClose()
        },
      },
    ]

    const actionItems = allActions.filter(a => !q || `${a.title} ${a.subtitle ?? ''}`.toLowerCase().includes(q))

    return [...candidateItems, ...roleItems, ...actionItems]
  }, [query, candidates, roles, navigate, onClose, toast])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => (items.length ? (i + 1) % items.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => (items.length ? (i - 1 + items.length) % items.length : 0))
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault()
        items[activeIndex].onSelect()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, items, activeIndex, onClose])

  if (!open) return null

  const groups: ('Candidates' | 'Roles' | 'Actions')[] = ['Candidates', 'Roles', 'Actions']

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="anim-fade absolute inset-0 bg-black/25" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="anim-pop relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        {/* Search header */}
        <div className="flex h-12 items-center gap-2.5 border-b border-border bg-card px-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search candidates (name, company, skill), roles, or actions…"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
          <Kbd>Esc</Kbd>
        </div>

        {/* Results body */}
        <div role="listbox" className="no-scrollbar max-h-[62vh] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No matches for ‘{query}’</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a candidate name, former employer (e.g. Stripe), skill, or role title.</p>
            </div>
          ) : (
            groups.map(groupName => {
              const groupItems = items.filter(it => it.group === groupName)
              if (groupItems.length === 0) return null
              return (
                <div key={groupName} className="mb-2 last:mb-0">
                  <div className="eyebrow px-2.5 py-1.5 text-[10px] text-gray-1000">{groupName}</div>
                  <div className="space-y-0.5">
                    {groupItems.map(it => {
                      const idx = items.indexOf(it)
                      const active = idx === activeIndex
                      return (
                        <button
                          key={it.id}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={it.onSelect}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                            active ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/60',
                          )}
                        >
                          <span className="shrink-0">{it.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{it.title}</div>
                            {it.subtitle && <div className="truncate text-xs text-muted-foreground">{it.subtitle}</div>}
                          </div>
                          {it.meta}
                          <ArrowRight className={cn('size-3.5 shrink-0 text-muted-foreground transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}

          {/* Keyboard shortcuts section when query is empty */}
          {!query && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="eyebrow flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-gray-1000">
                <Keyboard className="size-3" /> Shortcuts
              </div>
              <div className="grid grid-cols-1 gap-1 px-2.5 pb-1.5 sm:grid-cols-2">
                {SHORTCUTS.map(s => (
                  <div key={s.label} className="flex items-center justify-between gap-2 py-1 text-xs text-muted-foreground">
                    <span className="truncate">{s.label}</span>
                    <span className="flex shrink-0 items-center gap-0.5">
                      {s.keys.map(k => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border bg-secondary/60 px-3.5 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ to navigate · ↵ to open · Esc to close</span>
          <span className="font-mono text-[10px]">S-14</span>
        </div>
      </div>
    </div>
  )
}
