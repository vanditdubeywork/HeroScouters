import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

/* ==========================================================================
   Rightfit primitives (design system §4–§7). Use ONLY these in screens.
   ========================================================================== */

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

/* ---------- Button ---------- */
// h-8 rounded-2xl px-3 text-xs font-[510] tracking-[-0.011em]  (SaaS button)
type BtnVariant = 'primary' | 'outline' | 'ghost' | 'chroma' | 'destructive' | 'link'
type BtnSize = 'md' | 'sm' | 'icon' | 'icon-sm'
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  kbd?: string
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', icon, iconRight, kbd, className, children, ...rest }, ref,
) {
  const base = 'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl text-xs btn-type transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50 disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]'
  const sizes: Record<BtnSize, string> = {
    md: cn('h-8', icon && !children ? 'w-8' : icon ? 'pl-2.5 pr-3' : 'px-3'),
    sm: 'h-7 px-2.5 text-[11px] [&_svg]:size-3.5',
    icon: 'size-8 rounded-lg',
    'icon-sm': 'size-7 rounded-lg [&_svg]:size-3.5',
  }
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/85',
    outline: 'border border-border bg-background text-foreground shadow-xs hover:bg-accent',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    chroma: 'chroma-text-animate-parent border border-gray-600 bg-card text-foreground shadow-[var(--shadow-custom)] hover:border-gray-700 hover:shadow-[var(--shadow-custom-hover)]',
    destructive: 'border border-border bg-background text-destructive shadow-xs hover:bg-destructive/5 hover:border-destructive/30',
    link: 'h-auto px-0 text-foreground underline-offset-4 hover:underline rounded-md',
  }
  return (
    <button ref={ref} className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {icon}
      {children && (variant === 'chroma'
        ? <span className="chroma-text-out inline-flex items-center gap-1.5">{children}</span>
        : children)}
      {iconRight}
      {kbd && <Kbd className="ml-1">{kbd}</Kbd>}
    </button>
  )
})

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm border border-gray-700/60 bg-background px-1 font-mono text-[10px] text-muted-foreground', className)}>
      {children}
    </kbd>
  )
}

/* ---------- Inputs ---------- */
export const inputCls = 'h-9 w-full min-w-0 rounded-lg border border-input bg-gray-100/50 px-2.5 py-1 text-base md:text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { suffix?: string }>(
  function Input({ className, suffix, ...rest }, ref) {
    if (suffix) {
      return (
        <div className="relative">
          <input ref={ref} className={cn(inputCls, 'pr-16', className)} {...rest} />
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">{suffix}</span>
        </div>
      )
    }
    return <input ref={ref} className={cn(inputCls, className)} {...rest} />
  },
)

export function Textarea({ className, maxChars, value, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { maxChars?: number }) {
  const len = typeof value === 'string' ? value.length : 0
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        className={cn('flex min-h-16 w-full rounded-lg border border-input bg-gray-100/50 px-2.5 py-2 text-base md:text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [field-sizing:content]', className)}
        {...rest}
      />
      {maxChars && (
        <div className="flex items-center justify-end text-xs">
          <span className={cn('font-medium tnum', len > maxChars ? 'text-destructive' : 'text-muted-foreground')}>{len}/{maxChars} characters</span>
          <div className="ml-2 h-1 w-16 overflow-hidden bg-muted">
            <div className={cn('h-full transition-all duration-200', len > maxChars ? 'bg-destructive' : 'bg-gray-1100')} style={{ width: `${Math.min(100, (len / maxChars) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Compact select trigger (h-8 rounded-lg px-2.5) using native select for a11y */
export function Select({ value, onChange, options, className, size = 'md', 'aria-label': ariaLabel }: {
  value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; className?: string; size?: 'md' | 'lg'; 'aria-label'?: string
}) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn('w-full appearance-none rounded-lg border border-input bg-gray-100 pr-8 pl-2.5 text-sm shadow-xs transition-colors outline-none hover:bg-secondary focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50', size === 'lg' ? 'h-9' : 'h-8')}
      >
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

/** Circle checkbox size-4 rounded-xl + invisible hit-area expansion */
export function Checkbox({ checked, indeterminate, onChange, label, description, 'aria-label': ariaLabel, className }: {
  checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; description?: React.ReactNode; 'aria-label'?: string; className?: string
}) {
  const box = (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate && !checked ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={e => { e.stopPropagation(); onChange(!checked) }}
      className={cn('relative mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xl border shadow-xs outline-none transition-shadow after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-[3px] focus-visible:ring-ring/40',
        checked || indeterminate ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-700 bg-background')}
    >
      {checked ? <Check className="size-3" strokeWidth={3} /> : indeterminate ? <span className="h-0.5 w-2 rounded-full bg-primary-foreground" /> : null}
    </button>
  )
  if (!label) return <span className={className}>{box}</span>
  return (
    <label className={cn('flex cursor-pointer items-start space-x-3', className)} onClick={() => onChange(!checked)}>
      {box}
      <div className="grid gap-1.5 leading-none">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && <p className="text-sm leading-snug text-gray-1100">{description}</p>}
      </div>
    </label>
  )
}

export function Switch({ checked, onChange, label, 'aria-label': ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; 'aria-label'?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
      <button
        type="button" role="switch" aria-checked={checked} aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className={cn('relative h-[18px] w-8 rounded-full border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40', checked ? 'border-primary bg-primary' : 'border-gray-700 bg-gray-500')}
      >
        <span className={cn('absolute top-[1px] left-0 size-3.5 rounded-full shadow-sm transition-transform', checked ? 'translate-x-[15px] bg-primary-foreground' : 'translate-x-[1px] bg-white')} />
      </button>
      {label && <span className="btn-type text-foreground">{label}</span>}
    </label>
  )
}

/** Segmented control (pill-strip pattern) */
export function Segmented<T extends string>({ value, onChange, options, size = 'md', 'aria-label': ariaLabel }: {
  value: T; onChange: (v: T) => void; options: (T | { value: T; label: React.ReactNode; disabled?: boolean; title?: string })[]; size?: 'md' | 'sm'; 'aria-label'?: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-secondary p-0.5">
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        const disabled = typeof o === 'string' ? false : o.disabled
        const title = typeof o === 'string' ? undefined : o.title
        const active = v === value
        return (
          <button
            key={v} type="button" role="radio" aria-checked={active} disabled={disabled} title={title}
            onClick={() => !disabled && onChange(v)}
            className={cn('relative inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45',
              size === 'sm' ? 'h-6' : 'h-7',
              active ? 'border border-border bg-card text-foreground shadow-xs' : 'border border-transparent text-gray-900 hover:text-gray-1100')}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

/** Pill tab strip (h-12 sub-nav pattern) */
export function PillTabs<T extends string>({ value, onChange, tabs, className }: {
  value: T; onChange: (v: T) => void; tabs: { value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }[]; className?: string
}) {
  return (
    <div role="tablist" className={cn('no-scrollbar flex min-w-0 items-center gap-0.5 overflow-auto', className)}>
      {tabs.map(t => {
        const active = t.value === value
        return (
          <button
            key={t.value} role="tab" aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn('relative rounded-lg px-3 py-1.5 text-xs font-[510] tracking-[-0.011em] whitespace-nowrap transition-[color] duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              active ? 'text-gray-1200' : 'text-gray-900 hover:text-gray-1100')}
          >
            {active && <span className="absolute inset-0 rounded-lg border border-border bg-muted" />}
            <span className="relative flex items-center gap-1.5 [&>svg]:size-3.5 [&>svg]:shrink-0">
              {t.icon}
              {t.label}
              {t.count !== undefined && <span className="font-mono text-[10px] text-muted-foreground tnum">{t.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Double-bezel section card ---------- */
export function BezelCard({ icon, title, action, description, children, className, wellClassName, id }: {
  icon?: React.ReactNode; title: React.ReactNode; action?: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; className?: string; wellClassName?: string; id?: string
}) {
  return (
    <section id={id} className={cn('rounded-2xl border border-border bg-gray-100', className)}>
      <div className="flex items-center gap-2 px-4 py-2.5 [&>svg]:size-4 [&>svg]:text-muted-foreground">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <div className="ml-auto flex items-center gap-1.5">{action}</div>}
      </div>
      <div className={cn('mx-1 mb-1 rounded-xl border border-border bg-card p-4', wellClassName)}>
        {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
    </section>
  )
}

export function Field({ label, hint, right, children, className }: { label: React.ReactNode; hint?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm leading-none font-medium">{label}</label>
        {right && <div className="text-sm text-gray-900">{right}</div>}
      </div>
      {hint && <p className="text-sm text-gray-1100">{hint}</p>}
      {children}
    </div>
  )
}

/* ---------- Avatar (squircle, never round) ---------- */
export function Avatar({ initials, size = 24, className }: { initials: string; size?: 24 | 28 | 32 | 36 | 40 | 48; className?: string }) {
  const s = { 24: 'size-6 text-[10px] rounded-md', 28: 'size-7 text-[10.5px] rounded-md', 32: 'size-8 text-[11px] rounded-md', 36: 'size-9 text-xs rounded-md', 40: 'size-10 text-xs rounded-lg', 48: 'size-12 text-sm rounded-lg' }[size]
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center border border-border bg-gradient-to-b from-gray-200 to-gray-400 font-semibold text-gray-1100 select-none', s, className)}>
      {initials}
    </span>
  )
}

/* ---------- Tag / plain pill ---------- */
export function Tag({ children, className, onRemove, tone = 'neutral' }: { children: React.ReactNode; className?: string; onRemove?: () => void; tone?: 'neutral' | 'dark' | 'outline' }) {
  const tones = {
    neutral: 'border-border bg-muted text-foreground',
    dark: 'border-primary bg-primary text-primary-foreground',
    outline: 'border-border bg-background text-gray-1100',
  }
  return (
    <span className={cn('inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium whitespace-nowrap', tones[tone], className)}>
      {children}
      {onRemove && <button type="button" aria-label="Remove" onClick={onRemove} className="text-muted-foreground hover:text-foreground">×</button>}
    </span>
  )
}

/** Client / Prospect company tag */
export function CompanyTypeTag({ type }: { type: 'Client' | 'Prospect' }) {
  return (
    <span className={cn('inline-flex h-[18px] items-center rounded-sm border px-1.5 font-mono text-[10px] tracking-wider uppercase',
      type === 'Client' ? 'border-primary/80 text-foreground' : 'border-dashed border-gray-800 text-gray-1100')}>
      {type}
    </span>
  )
}

/* ---------- Empty state (64px icon box + title + one line) ---------- */
export function EmptyState({ icon, title, body, action, className }: { icon: React.ReactNode; title: string; body: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 px-6 py-16 text-center', className)}>
      <div className="flex size-16 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-5">{icon}</div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />
}

/** Page header (title 18px/590 + mono meta line) */
export function PageHeader({ title, meta, actions, children }: { title: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-lg title-type text-foreground">{title}</h1>
        {meta && <div className="eyebrow text-muted-foreground">{meta}</div>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

/* ---------- Dropdown menu ---------- */
export interface MenuItem { label: React.ReactNode; onSelect?: () => void; icon?: React.ReactNode; destructive?: boolean; danger?: boolean; hint?: string; separator?: boolean; disabled?: boolean }
export function Menu({ trigger, items, align = 'end', width = 220 }: { trigger: React.ReactNode | ((p: { open: boolean; toggle: () => void }) => React.ReactNode); items: MenuItem[]; align?: 'start' | 'end'; width?: number }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const updatePos = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const left = align === 'end'
      ? Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width))
      : Math.max(8, Math.min(window.innerWidth - width - 8, r.left))
    const estH = Math.min(320, items.length * 34 + 16)
    if (r.bottom + estH > window.innerHeight - 12 && r.top > estH) {
      setPos({ bottom: window.innerHeight - r.top + 6, left })
    } else {
      setPos({ top: r.bottom + 6, left })
    }
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (!open) updatePos()
    setOpen(o => !o)
  }

  return (
    <div ref={ref} className="relative inline-flex">
      {typeof trigger === 'function' ? trigger({ open, toggle }) : <span className="inline-flex" onClick={toggle}>{trigger}</span>}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ width, top: pos.top, bottom: pos.bottom, left: pos.left }}
          onClick={e => e.stopPropagation()}
          className="anim-pop fixed z-[90] rounded-xl border border-border bg-popover p-1 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.2)]"
        >
          {items.map((it, i) => it.separator
            ? <div key={i} className="my-1 h-px bg-border" />
            : (
              <button
                key={i} role="menuitem" disabled={it.disabled}
                onClick={() => { setOpen(false); it.onSelect?.() }}
                className={cn('flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-40 [&_svg]:size-4 [&_svg]:text-muted-foreground', (it.destructive || it.danger) && 'text-destructive [&_svg]:text-destructive')}
              >
                {it.icon}
                <span className="flex-1 truncate">{it.label}</span>
                {it.hint && <span className="font-mono text-[10px] text-muted-foreground">{it.hint}</span>}
              </button>
            ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

/** Popover (generic — portaled to document.body so parent overflow-hidden / scroll containers never clip it) */
export function Popover({ trigger, children, align = 'start', width = 320 }: { trigger: (p: { open: boolean; toggle: () => void }) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: 'start' | 'end'; width?: number }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const updatePos = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const left = align === 'end'
      ? Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width))
      : Math.max(8, Math.min(window.innerWidth - width - 8, r.left))
    const estH = 340
    if (r.bottom + estH > window.innerHeight - 12 && r.top > estH) {
      setPos({ bottom: window.innerHeight - r.top + 6, left })
    } else {
      setPos({ top: r.bottom + 6, left })
    }
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (!open) updatePos()
    setOpen(o => !o)
  }

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ open, toggle })}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{ width, top: pos.top, bottom: pos.bottom, left: pos.left }}
          onClick={e => e.stopPropagation()}
          className="anim-pop fixed z-[90] rounded-2xl border border-border bg-background p-1 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.2)]"
        >
          <div className="rounded-xl border border-border bg-card">
            {children(() => setOpen(false))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/** Mono "Example" watermark for frames using §16 data */
export function ExampleMark() {
  return <span className="eyebrow rounded-sm border border-dashed border-gray-800 px-1.5 py-0.5 text-[9px] text-gray-1000">Example</span>
}

/** Stat label/value pair used in key-facts grids */
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="eyebrow text-[10px] text-gray-1000">{label}</div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}
