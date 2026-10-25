import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, X, MapPin, Clock, Star, ShieldCheck, DollarSign, Calendar, Layers, MessageSquareText, Sparkles, FileText, Link2 } from 'lucide-react'
import { Avatar, Button, CompanyTypeTag, Tag } from '../components/ui'
import { BandChip, ChipRow, MatchChipView, OverviewGrid, PanelNav, SidePanel, SourceBadge, WorkAuthChip, type OverviewRow } from '../components/hs'
import { RecommendationBlock, RecommendationPill, TakeMarker, signature } from '../components/v3'
import { useApp } from '../store/AppStore'
import type { Band, Match, Recommendation } from '../data/types'

/* ==========================================================================
   S-08 · Candidate preview (N3 side panel)
   Opens from a match row (with RecommendationPill + Requirements met + flags)
   or from CandidatesList (with matching roles summary, source links & quick actions).
   J/K, S, X, Esc.
   ========================================================================== */

export interface CandidatePreviewProps {
  open: boolean
  onClose: () => void
  candidateId: string | null
  /** ordered candidate IDs for ‹ › navigation */
  list: string[]
  onNavigate: (candidateId: string) => void
  /** when opened from a role's match list */
  match?: Match
  onShortlist?: () => void
  onReject?: () => void
}

export function CandidatePreview({ open, onClose, candidateId, list, onNavigate, match, onShortlist, onReject }: CandidatePreviewProps) {
  const { candidate, role, rolesForCandidate, matches, addToAskList, resumesFor, takeFor, member } = useApp()
  const navigate = useNavigate()
  const c = candidateId ? candidate(candidateId) : undefined
  const idx = candidateId ? list.indexOf(candidateId) : -1
  const prev = idx > 0 ? () => onNavigate(list[idx - 1]) : undefined
  const next = idx >= 0 && idx < list.length - 1 ? () => onNavigate(list[idx + 1]) : undefined

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || document.querySelector('[role="dialog"][aria-modal="true"]:not([aria-label])')) return
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); next?.() }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); prev?.() }
      if (e.key === 's' && onShortlist && match?.status !== 'shortlisted') { e.preventDefault(); onShortlist() }
      if (e.key === 'x' && onReject) { e.preventDefault(); onReject() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, next, prev, onShortlist, onReject, match?.status])

  if (!c) return null
  const resumes = resumesFor(c.id)
  const take = takeFor(c.id, match?.roleId ?? null)
  const takeAuthor = take ? member(take.authorId) : undefined
  const gaps = match ? match.chips.filter(ch => ch.kind === 'gap' || ch.kind === 'assumed') : []
  const why = match ? match.chips.filter(ch => ch.kind === 'evidence' || ch.kind === 'predicted') : []
  const isShortlisted = match?.status === 'shortlisted'
  const candRoleMatches: Array<{ roleId: string; reason: string; band: Band; recommendation?: Recommendation }> = !match
    ? ((rolesForCandidate[c.id]?.length ?? 0) > 0
        ? rolesForCandidate[c.id].filter(m => m.status !== 'not-interested')
        : matches.filter(m => m.candidateId === c.id && m.status !== 'rejected' && m.status !== 'not-interested'))
    : []

  const overviewRows: OverviewRow[] = [
    {
      icon: <MapPin />,
      field: 'Location',
      value: (
        <span>
          {c.metro ?? <span className="text-[#b45309]">Not captured</span>}
          {c.workModes ? <span className="text-muted-foreground"> · {c.workModes.join('/').toLowerCase()}</span> : <SourceBadge kind="ASSUMED" className="ml-1.5" />}
        </span>
      ),
    },
    {
      icon: <Clock />,
      field: 'Category',
      value: (
        <span className="inline-flex h-5 items-center rounded-md border border-emerald-500/35 bg-emerald-500/12 px-2 text-[11px] font-medium text-emerald-400">
          {c.category} · {c.subcategory}
        </span>
      ),
    },
    ...(c.domains?.length ? [{
      icon: <Layers />,
      field: 'Domain',
      value: <span>{c.domains.join(', ')}</span>,
    }] : []),
    {
      icon: <Star />,
      field: 'Experience',
      value: c.years !== null ? <span className="tnum">{c.years} yrs</span> : <span className="text-[#b45309]">Not captured</span>,
    },
    {
      icon: <ShieldCheck />,
      field: 'Work Auth',
      value: <WorkAuthChip w={c.workAuth} />,
    },
    {
      icon: <DollarSign />,
      field: 'Salary',
      value: c.pay ?? <span className="text-[#b45309]">Not captured</span>,
    },
    {
      icon: <Calendar />,
      field: 'Availability',
      value: `${c.availability ?? 'Not captured'} · ${c.searchStatus ?? 'Status unknown'}`,
    },
    {
      icon: <MessageSquareText />,
      field: 'Our take',
      value: <TakeMarker candidateId={c.id} />,
    },
  ]

  return (
    <SidePanel open={open} onClose={onClose} label={`Preview ${c.name}`}
      header={
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <PanelNav onPrev={prev} onNext={next} index={Math.max(0, idx)} total={list.length} />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" iconRight={<ExternalLink />} onClick={() => navigate(`/candidates/${c.id}`)}>Open profile</Button>
              <Button variant="ghost" size="icon-sm" aria-label="Close (Esc)" onClick={onClose} icon={<X />} />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Avatar initials={c.initials} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">{c.name}</h2>
                {resumes.length > 1 && <Tag tone="outline">{resumes.length} resumes</Tag>}
                {match && (match.recommendation
                  ? <RecommendationPill recommendation={match.recommendation} suggested={match.suggested} />
                  : <BandChip band={match.band} score={match.score} />)}
                {match && <span className="font-mono text-[11px] text-gray-1000">#{match.rank}</span>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{c.headline}</p>
            </div>
          </div>
        </div>
      }
      footer={(onShortlist || onReject) ? (
        <div className="flex items-center justify-between gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">J/K move · S shortlist · X reject · Esc close</span>
          <div className="ml-auto flex gap-2">
            {onReject && <Button variant="destructive" onClick={onReject} kbd="X">Reject</Button>}
            {onShortlist && (isShortlisted
              ? <Button variant="outline" disabled>Shortlisted ✓</Button>
              : <Button variant="primary" onClick={onShortlist} kbd="S">Shortlist</Button>)}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">J/K move between candidates · Esc close</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<Sparkles />} onClick={() => { onClose(); navigate(`/candidates/${c.id}?tab=roles`) }}>Find roles</Button>
            <Button variant="outline" size="sm" icon={<FileText />} onClick={() => { onClose(); navigate(`/resumes/masked?candidates=${c.id}`) }}>Masked resume</Button>
            <Button variant="primary" size="sm" iconRight={<ExternalLink />} onClick={() => { onClose(); navigate(`/candidates/${c.id}`) }}>Full profile</Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4 p-4">
        {match && (
          <section className="rounded-2xl border border-border bg-gray-100 p-3">
            <h3 className="mb-2 px-1 text-sm font-semibold text-foreground">Why they fit</h3>
            <div className="space-y-2.5 rounded-xl border border-border bg-card p-3.5 text-xs">
              <p className="leading-relaxed text-foreground">“{match.reason}”</p>
              {(match.requirementsMet?.length || match.greenFlags?.length || match.redFlags?.length) ? (
                <RecommendationBlock
                  requirementsMet={match.requirementsMet}
                  greenFlags={match.greenFlags}
                  redFlags={match.redFlags}
                  onAskAssumed={(label: string) => addToAskList(c.id, `Confirm ${label.toLowerCase()}?`)}
                />
              ) : (
                <ChipRow chips={why} max={8} />
              )}
            </div>
          </section>
        )}
        {!match && candRoleMatches.length > 0 && (
          <section className="rounded-2xl border border-border bg-gray-100 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-foreground">Matching open roles ({candRoleMatches.length})</h3>
              <button type="button" onClick={() => { onClose(); navigate(`/candidates/${c.id}?tab=roles`) }} className="text-xs text-muted-foreground hover:text-foreground">
                See all →
              </button>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {candRoleMatches.slice(0, 3).map(m => {
                const r = role(m.roleId)
                if (!r) return null
                return (
                  <button
                    key={m.roleId}
                    type="button"
                    onClick={() => { onClose(); navigate(`/roles/${r.id}?tab=matches`) }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <span className="truncate">{r.title}</span>
                        <span className="text-muted-foreground">· {r.company}</span>
                        <CompanyTypeTag type={r.companyType} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{m.reason}</p>
                    </div>
                    {m.recommendation ? <RecommendationPill recommendation={m.recommendation} /> : <BandChip band={m.band} />}
                  </button>
                )
              })}
            </div>
          </section>
        )}
        {take?.status === 'signed' && (
          <section className="rounded-2xl border border-border bg-gray-100 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-foreground">Our take</h3>
              <TakeMarker candidateId={c.id} />
            </div>
            <blockquote className="rounded-xl border border-border bg-card p-3.5 text-xs leading-relaxed text-foreground">
              “{take.text}”
              <footer className="mt-1.5 text-[11px] text-muted-foreground">{signature(takeAuthor)}</footer>
            </blockquote>
          </section>
        )}
        {match && gaps.length > 0 && (
          <section className="rounded-2xl border border-border bg-gray-100 p-3">
            <h3 className="mb-2 px-1 text-sm font-semibold text-foreground">Gaps & assumptions</h3>
            <ul className="space-y-1.5 rounded-xl border border-border bg-card p-3">
              {gaps.map((g, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <MatchChipView chip={g} />
                  {g.kind === 'assumed' && <Button variant="ghost" size="sm" onClick={() => addToAskList(c.id, `Confirm: ${g.label.toLowerCase()}?`)}>Add to ask list</Button>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <OverviewGrid
          title="Overview"
          rows={overviewRows}
        />

        {c.sourceLinks && c.sourceLinks.length > 0 && (
          <section className="space-y-2">
            <h3 className="eyebrow text-[10px] text-gray-1000">Source Links</h3>
            <div className="flex flex-wrap gap-1.5">
              {c.sourceLinks.map(lk => (
                <a
                  key={lk.url}
                  href={lk.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-secondary px-2 text-xs text-foreground hover:bg-muted"
                >
                  <Link2 className="size-3 text-muted-foreground" />
                  <span>{lk.label}</span>
                  <ExternalLink className="size-2.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </section>
        )}

        {c.companies.length > 0 && (
          <section className="space-y-2">
            <h3 className="eyebrow text-[10px] text-gray-1000">Experience</h3>
            <ol className="space-y-2.5">
              {c.companies.slice(0, 3).map(co => (
                <li key={co.name + co.start} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gray-800" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{co.title} · <span className="font-normal">{co.name}</span></div>
                    <div className="text-xs text-muted-foreground">{co.descriptor} · <span className="tnum">{co.start}–{co.end}</span></div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(c.skills.length > 0 || c.predicted.length > 0) && (
          <section className="space-y-2">
            <h3 className="eyebrow text-[10px] text-gray-1000">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {c.skills.map(s => <Tag key={s}>{s}</Tag>)}
              {c.predicted.map(p => <MatchChipView key={p.name} chip={{ kind: 'predicted', label: p.name, detail: p.basis }} />)}
            </div>
          </section>
        )}

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">Last contacted {c.lastContacted} · not used for ranking</p>
      </div>
    </SidePanel>
  )
}
