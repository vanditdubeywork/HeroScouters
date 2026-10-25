import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Briefcase, Users, FileText, History, Settings, Bell, Search, Plus, PanelLeft, ChevronDown, ChevronRight,
  Layers, Map as MapIcon, X, Eye, EyeOff, Sun, Moon,
} from 'lucide-react'
import { Avatar, Button, Kbd, Menu, cn } from '../components/ui'
import { Toaster } from '../components/hs'
import { useApp, useWireframe } from '../store/AppStore'
import { CommandPalette } from '../screens/CommandPalette'
import { FLOWS } from './flows'

/* ==========================================================================
   S-01 · App shell — locked viewport, 256px sidebar, 48px top bar
   ========================================================================== */

export interface Crumb { label: string; to?: string }
interface ChromeApi {
  crumbs: Crumb[]; pill: React.ReactNode
  set: (c: Crumb[], pill?: React.ReactNode) => void
  openPalette: () => void
}
const ChromeCtx = createContext<ChromeApi | null>(null)

/** Screens call this to set breadcrumb + context pill in the top bar */
export function useTopBar(crumbs: Crumb[], pill?: React.ReactNode, deps: unknown[] = []) {
  const c = useContext(ChromeCtx)
  const key = crumbs.map(x => x.label).join('/')
  useEffect(() => { c?.set(crumbs, pill) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key, ...deps])
}
export function usePalette() { return useContext(ChromeCtx)!.openPalette }

const NAV = [
  { group: 'Work', items: [{ to: '/roles', label: 'Roles', icon: Briefcase, key: 'G R' }, { to: '/candidates', label: 'Candidates', icon: Users, key: 'G C' }] },
  { group: 'Outputs', items: [{ to: '/resumes', label: 'Resumes', icon: FileText, key: 'G O' }] },
  { group: 'System', items: [{ to: '/activity', label: 'Activity', icon: History, key: 'G A' }, { to: '/settings', label: 'Settings', icon: Settings, key: '' }] },
]

export function AppShell() {
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const [pill, setPill] = useState<React.ReactNode>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const loc = useLocation()

  useEffect(() => { setMobileOpen(false) }, [loc.pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const api = useMemo<ChromeApi>(() => ({
    crumbs, pill,
    set: (c, p) => { setCrumbs(c); setPill(p ?? null) },
    openPalette: () => setPaletteOpen(true),
  }), [crumbs, pill])

  return (
    <ChromeCtx.Provider value={api}>
      <div className="fixed inset-0 flex h-screen w-full overflow-hidden bg-background text-foreground">
        {/* Desktop sidebar */}
        <aside className={cn('hidden shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 ease-linear md:flex', collapsed ? 'w-12' : 'w-64')}>
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        </aside>
        {/* Mobile sheet */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="anim-fade absolute inset-0 bg-black/25" onClick={() => setMobileOpen(false)} />
            <aside className="anim-panel absolute inset-y-0 left-0 flex w-72 border-r border-border bg-sidebar"><Sidebar collapsed={false} mobile onToggle={() => setMobileOpen(false)} /></aside>
          </div>
        )}

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar crumbs={crumbs} pill={pill} onMenu={() => setMobileOpen(true)} onSearch={() => setPaletteOpen(true)} />
          <main className="relative min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <Toaster />
        <WireframeToolbar />
      </div>
    </ChromeCtx.Provider>
  )
}

function Sidebar({ collapsed, onToggle, mobile }: { collapsed: boolean; onToggle: () => void; mobile?: boolean }) {
  const { needsAttention, roles, candidates } = useApp()
  const outOfDate = roles.filter(r => r.matchStatus === 'out-of-date').length
  const missing = 9
  const navigate = useNavigate()

  return (
    <div className="flex size-full min-w-0 flex-col">
      <div className={cn('flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3', collapsed && 'justify-center px-0')}>
        {!collapsed && (
          <Menu align="start"
            trigger={({ toggle }) => (
              <button onClick={toggle} className="group flex h-8 items-center gap-1.5 rounded-2xl border border-transparent px-2 text-xs btn-type transition-all hover:border-border hover:bg-accent">
                <span className="flex size-4 items-center justify-center rounded-[3px] bg-primary text-[9px] font-bold text-primary-foreground">H</span>
                <span>HeroScouter</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            )}
            items={[{ label: 'HeroScouter', hint: 'current' }, { separator: true, label: '' }, { label: 'Workspace settings', onSelect: () => navigate('/settings') }]}
          />
        )}
        <Button variant="ghost" size="icon-sm" aria-label={mobile ? 'Close menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggle} icon={mobile ? <X /> : <PanelLeft />} />
      </div>

      <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        {NAV.map((g, gi) => (
          <div key={g.group} className={cn('flex flex-col', collapsed ? 'px-1.5 pt-3' : gi === 0 ? 'p-3' : 'p-3 pt-0')}>
            {!collapsed && <div className="flex h-6 items-center px-3 text-xs font-medium tracking-wider text-gray-1000 uppercase">{g.group}</div>}
            <ul className="flex flex-col gap-0.5">
              {g.items.map(it => (
                <li key={it.to}>
                  <NavLink to={it.to} title={collapsed ? it.label : undefined}
                    className={({ isActive }) => cn('flex items-center gap-2.5 overflow-hidden rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 select-none [&_svg]:size-4 [&_svg]:shrink-0',
                      mobile ? 'h-11 text-[15px]' : 'h-8', collapsed && 'justify-center px-0',
                      isActive ? 'border-border bg-muted text-gray-1200' : 'border-transparent text-gray-1100 hover:bg-muted hover:text-gray-1200')}>
                    <it.icon />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                    {!collapsed && it.to === '/roles' && <span className="ml-auto font-mono text-[10px] text-gray-900 tnum">{roles.filter(r => r.status === 'Open').length}</span>}
                    {!collapsed && it.to === '/candidates' && <span className="ml-auto font-mono text-[10px] text-gray-900 tnum">412</span>}
                  </NavLink>
                  {!collapsed && it.to === '/candidates' && (
                    <div className="mt-0.5 ml-5 flex flex-col gap-0.5 border-l border-border pl-2">
                      <Link
                        to="/candidates?screen=ai"
                        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-gray-1100 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <span className="text-gray-900">✦</span>
                        <span className="truncate">AI Scout</span>
                      </Link>
                      <Link
                        to="/candidates?screen=manual"
                        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-gray-1100 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <span className="text-gray-900">⊞</span>
                        <span className="truncate">Manual Filters & Pool</span>
                      </Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('flex flex-col gap-2 p-2', collapsed && 'items-center')}>
        {/* Needs attention card — promo-card pattern; hidden when nothing to show (P8) */}
        {needsAttention && !collapsed && (
          <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/60 to-card p-3.5 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold"><span className="size-1.5 rounded-full bg-warning" />Needs attention</h3>
            <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-muted-foreground">
              <li><span className="font-mono text-foreground tnum">{outOfDate}</span> roles have out-of-date matches</li>
              <li><span className="font-mono text-foreground tnum">{missing}</span> profiles are missing must-have info</li>
            </ul>
            <Button variant="outline" className="mt-3 w-full" onClick={() => navigate('/roles?filter=attention')}>Review</Button>
          </div>
        )}
        {needsAttention && collapsed && <span title="Needs attention" className="size-2 rounded-full bg-warning" />}
        <div className={cn('flex items-center justify-between gap-2 px-1 pt-1', collapsed && 'flex-col px-0')}>
          <Menu align="start"
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex min-w-0 items-center gap-2 rounded-lg p-1 text-sm transition-colors hover:bg-muted">
                <Avatar initials="VD" />
                {!collapsed && <span className="truncate font-medium">Vandit Dubey</span>}
              </button>
            )}
            items={[{ label: 'Profile' }, { label: 'Keyboard shortcuts', hint: '⌘K' }, { separator: true, label: '' }, { label: 'Sign out' }]}
          />
          <button aria-label="Notifications" className="relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground">
            <Bell className="size-4" />
            <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500 ring-2 ring-sidebar" />
          </button>
        </div>
      </div>
      <span className="sr-only">{candidates.length} candidates loaded</span>
    </div>
  )
}

function TopBar({ crumbs, pill, onMenu, onSearch }: { crumbs: Crumb[]; pill: React.ReactNode; onMenu: () => void; onSearch: () => void }) {
  const navigate = useNavigate()
  const [light, setLight] = useState(() => document.documentElement.classList.contains('light'))
  const toggleTheme = () => {
    const next = !light
    setLight(next)
    document.documentElement.classList.toggle('light', next)
  }
  return (
    <div className="z-20 flex h-12 w-full shrink-0 items-center justify-between border-b border-border bg-background">
      <div className="flex h-8 w-full items-center justify-between gap-2 px-4 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="-ml-1.5 md:hidden" aria-label="Open menu" onClick={onMenu} icon={<PanelLeft />} />
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-gray-800" />}
                {c.to && i < crumbs.length - 1
                  ? <Link to={c.to} className="truncate text-muted-foreground hover:text-foreground">{c.label}</Link>
                  : <span className={cn('truncate', i === crumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground')}>{c.label}</span>}
              </React.Fragment>
            ))}
          </nav>
          {pill && <div className="ml-1 hidden shrink-0 sm:block">{pill}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onSearch} className="hidden h-8 w-56 items-center gap-2 rounded-2xl border border-border bg-background px-3 text-xs text-muted-foreground shadow-xs transition-colors hover:bg-accent sm:flex">
            <Search className="size-3.5" /><span className="flex-1 text-left">Search people, roles…</span><Kbd>⌘K</Kbd>
          </button>
          <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search" onClick={onSearch} icon={<Search />} />
          <Button variant="ghost" size="icon" aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'} title={light ? 'Switch to dark mode' : 'Switch to light mode'} onClick={toggleTheme} icon={light ? <Moon /> : <Sun />} />
          <Menu
            trigger={({ toggle }) => <Button onClick={toggle} icon={<Plus />} iconRight={<ChevronDown className="!size-3.5 text-muted-foreground" />}><span className="hidden sm:inline">New</span></Button>}
            items={[
              { label: 'New role', icon: <Briefcase />, hint: 'N R', onSelect: () => navigate('/roles/new') },
              { label: 'New candidate', icon: <Users />, hint: 'N C', onSelect: () => navigate('/candidates/new') },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   Wireframe toolbar — screen ID, state switcher, walkthrough guide.
   Not part of the product; sits bottom-left for the founder review.
   ========================================================================== */
function WireframeToolbar() {
  const wf = useWireframe()
  const app = useApp()
  const [open, setOpen] = useState<'states' | 'flows' | null>(null)
  const [hidden, setHidden] = useState(false)
  const navigate = useNavigate()
  const cur = wf.current
  const value = cur ? (wf.values[cur.screenId] ?? cur.states[0]?.id) : null

  if (hidden) {
    return (
      <button onClick={() => setHidden(false)} title="Show wireframe controls"
        className="fixed bottom-4 left-4 z-[55] flex size-8 items-center justify-center rounded-full border border-white/10 bg-[#111] text-white shadow-xl md:left-[calc(16rem+16px)]">
        <Eye className="size-4" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[55] -translate-x-1/2">
      {open && (
        <div className="anim-pop absolute bottom-full left-1/2 mb-2 w-[380px] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#111] p-1.5 text-white shadow-2xl">
          {open === 'states' && cur && (
            <div>
              <div className="px-2.5 pt-1.5 pb-2 font-mono text-[10px] tracking-[0.12em] text-white/50 uppercase">{cur.screenId} · {cur.title} · states</div>
              <div className="grid grid-cols-2 gap-1">
                {cur.states.map(s => (
                  <button key={s.id} onClick={() => wf.setValue(cur.screenId, s.id)}
                    className={cn('rounded-lg px-2.5 py-2 text-left text-xs transition-colors', value === s.id ? 'bg-white text-black' : 'text-white/80 hover:bg-white/10')}>
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-white/10 px-2.5 pt-2 pb-1 text-[11px] text-white/60">
                <label className="flex items-center gap-2"><input type="checkbox" checked={app.needsAttention} onChange={e => app.setNeedsAttention(e.target.checked)} />Needs attention card</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={app.showScore} onChange={e => app.setShowScore(e.target.checked)} />Score next to band</label>
              </div>
            </div>
          )}
          {open === 'flows' && (
            <div className="no-scrollbar max-h-[60vh] overflow-y-auto">
              <div className="px-2.5 pt-1.5 pb-2 font-mono text-[10px] tracking-[0.12em] text-white/50 uppercase">Founder walkthroughs</div>
              {FLOWS.map(f => (
                <div key={f.id} className="rounded-xl px-2.5 py-2 hover:bg-white/5">
                  <button onClick={() => { navigate(f.start); setOpen(null) }} className="flex w-full items-center gap-2 text-left">
                    <span className="font-mono text-[10px] text-white/50">{f.id}</span>
                    <span className="flex-1 text-xs font-medium">{f.title}</span>
                    <span className="text-[11px] text-white/60">Start →</span>
                  </button>
                  <ol className="mt-1.5 ml-[46px] list-decimal space-y-0.5 text-[11px] text-white/55">
                    {f.steps.map(s => <li key={s}>{s}</li>)}
                  </ol>
                </div>
              ))}
              <Link to="/wireframes" onClick={() => setOpen(null)} className="mt-1 block rounded-lg px-2.5 py-2 text-xs text-white/70 hover:bg-white/10">Open screen index (all screens & states) →</Link>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#111] p-1 text-white shadow-2xl">
        <span className="px-2.5 font-mono text-[10px] tracking-[0.12em] text-white/50 uppercase">Wireframe</span>
        {cur && (
          <button onClick={() => setOpen(o => o === 'states' ? null : 'states')}
            className={cn('flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition-colors', open === 'states' ? 'bg-white text-black' : 'hover:bg-white/10')}>
            <Layers className="size-3.5" />
            <span className="font-mono text-[11px]">{cur.screenId}</span>
            <span className="max-w-[160px] truncate opacity-80">{cur.states.find(s => s.id === value)?.label}</span>
          </button>
        )}
        <button onClick={() => setOpen(o => o === 'flows' ? null : 'flows')}
          className={cn('flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition-colors', open === 'flows' ? 'bg-white text-black' : 'hover:bg-white/10')}>
          <MapIcon className="size-3.5" />Flows
        </button>
        <button onClick={() => { setHidden(true); setOpen(null) }} aria-label="Hide wireframe controls" className="flex size-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
          <EyeOff className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Standard scrolling page body for list screens (full width, 24px rhythm) */
export function ScrollPage({ children, className, footer }: { children: React.ReactNode; className?: string; footer?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className={cn('mx-auto w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 pb-24', className)}>{children}</div>
      </div>
      {footer}
    </div>
  )
}

/** 50/50 split-pane editor (Rightfit /profile layout) */
export function SplitPane({ left, right, leftTitle, rightTitle, leftActions, rightActions, footer, rightClassName }: {
  left: React.ReactNode; right: React.ReactNode; leftTitle: React.ReactNode; rightTitle: React.ReactNode
  leftActions?: React.ReactNode; rightActions?: React.ReactNode; footer?: React.ReactNode; rightClassName?: string
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-2">
        <div className="flex h-full flex-col overflow-y-auto rounded-md border border-border lg:grid lg:grid-cols-2 lg:divide-x lg:divide-border lg:overflow-hidden">
          <section className="flex min-h-0 flex-col lg:overflow-hidden">
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/50 px-4">
              <div className="min-w-0 truncate text-xs font-medium text-muted-foreground">{leftTitle}</div>
              {leftActions && <div className="ml-auto flex items-center gap-2">{leftActions}</div>}
            </div>
            <div className="no-scrollbar flex-1 lg:overflow-y-auto"><div className="space-y-6 p-2 sm:p-4">{left}</div></div>
          </section>
          <section className="flex min-h-0 flex-col border-t border-border lg:overflow-hidden lg:border-t-0">
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/50 px-4">
              <div className="min-w-0 truncate text-xs font-medium text-muted-foreground">{rightTitle}</div>
              {rightActions && <div className="ml-auto flex items-center gap-2">{rightActions}</div>}
            </div>
            <div className={cn('no-scrollbar flex-1 lg:overflow-y-auto', rightClassName)}>{right}</div>
          </section>
        </div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">{footer}</div>
      )}
    </div>
  )
}
