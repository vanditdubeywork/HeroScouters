import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Briefcase, Building2, Calendar, Check, CircleCheck, Clock, Copy, Download,
  ExternalLink, Eye, EyeOff, FileCheck, FileText, Globe, GraduationCap, Handshake,
  Layers, Link2, Lock, Mail, MapPin, MessageSquare, Plus, RefreshCw, Shield,
  ShieldCheck, Sparkles, Table2, UserCheck, Wand2,
} from 'lucide-react'
import { ScrollPage, useTopBar } from '../shell/AppShell'
import {
  Avatar, BezelCard, Button, CompanyTypeTag, EmptyState, ExampleMark, PageHeader,
  PillTabs, Segmented, Select, Switch, Tag, cn,
} from '../components/ui'
import { DataTable, FilterChip, WorkAuthChip, workAuthShort, type Column } from '../components/hs'
import { RecommendationPill, signature } from '../components/v3'
import { latestVersion } from '../components/outputs'
import { BulkMaskForRoleDialog } from '../components/BulkMaskModal'
import { CopyEmailDialog } from './Dialogs'
import { useApp, useWireframeState } from '../store/AppStore'
import type { Candidate, Match, OutputStyle, ResumeOutput, Role } from '../data/types'

/* ==========================================================================
   MaskedRoleView — S-15 · Role Masked Links & Client Portal View
   Shows how the masked links we send for a particular role look to the client
   or prospect, plus bulk resume selection & link management.
   ========================================================================== */

const WF_STATES = [
  { id: 'client-portal', label: 'Client Link Preview (Creative SaaS)' },
  { id: 'traditional', label: 'Client Link Preview (Traditional Word)' },
  { id: 'xray', label: 'Recruiter X-Ray (Show redacted spans)' },
  { id: 'links-table', label: 'Manage Role Masked Links (Table)' },
]

function maskedAliasFor(c: Candidate, chosenHeadline?: string) {
  const baseTitle = (chosenHeadline ?? c.headline).split('·')[0].trim()
  const yrs = c.years !== null ? `${c.years} yrs` : 'Senior'
  const dom = c.domains?.[0] ?? c.subcategory
  return `${baseTitle} · ${yrs} · ${dom}`
}

function redactAchievement(text: string, xray: boolean): React.ReactNode {
  // Redact project codenames like "Atlas" or company names like "Stripe" / "Ledgerly"
  const parts = text.split(/(Atlas|Stripe|Ledgerly|Checkout)/g)
  return parts.map((part, i) => {
    if (['Atlas', 'Stripe', 'Ledgerly', 'Checkout'].includes(part)) {
      const replacement = part === 'Atlas' ? '[ flagship payouts platform ]' : '[ tier-1 fintech employer ]'
      return xray ? (
        <span key={i} className="hidden-span mx-0.5 rounded-xs px-1 font-mono text-[11px] text-foreground" title={`Redacted identifier: ${part}`}>
          {replacement} <span className="text-[10px] text-warning">(was: {part})</span>
        </span>
      ) : (
        <span key={i} className="rounded-xs border border-border bg-secondary px-1 font-medium text-foreground">
          {replacement}
        </span>
      )
    }
    return part
  })
}

export function MaskedRoleView() {
  const [params, setParams] = useSearchParams()
  const app = useApp()
  const roleIdParam = params.get('role') || 'northwind-spm'
  const role = app.role(roleIdParam) ?? app.roles[0]

  useTopBar([
    { label: 'Resumes', to: '/resumes' },
    { label: 'Masked Role Links' },
    ...(role ? [{ label: `${role.title} — ${role.company}` }] : []),
  ])

  const handleRoleChange = (nextRoleId: string) => {
    const next = new URLSearchParams(params)
    next.set('role', nextRoleId)
    next.delete('candidate')
    setParams(next, { replace: true })
  }

  return (
    <ScrollPage>
      <RoleMaskedLinksSection
        roleId={role?.id ?? 'northwind-spm'}
        onRoleChange={handleRoleChange}
      />
    </ScrollPage>
  )
}

export function RoleMaskedLinksSection({
  roleId,
  onRoleChange,
  embedded = false,
}: {
  roleId: string
  onRoleChange?: (roleId: string) => void
  embedded?: boolean
}) {
  const app = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [wf, setWf] = useWireframeState('S-15', 'Masked Role Links', WF_STATES)

  const role = app.role(roleId) ?? app.roles[0]
  const [viewMode, setViewMode] = useState<'portal' | 'table'>('portal')
  const [style, setStyle] = useState<OutputStyle>('creative')
  const [xray, setXray] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [introRequestedFor, setIntroRequestedFor] = useState<Record<string, boolean>>({})
  const [sourceResumeByCand, setSourceResumeByCand] = useState<Record<string, string>>({})

  // Sync wireframe state toolbar
  React.useEffect(() => {
    if (wf === 'client-portal') { setViewMode('portal'); setStyle('creative'); setXray(false) }
    else if (wf === 'traditional') { setViewMode('portal'); setStyle('traditional'); setXray(false) }
    else if (wf === 'xray') { setViewMode('portal'); setXray(true) }
    else if (wf === 'links-table') { setViewMode('table') }
  }, [wf])

  // Candidates included in this role's masked packet:
  // Either have a Masked output for this role, or are shortlisted/top-scored for this role
  const packetCandidates = useMemo(() => {
    const roleMatches = app.matches
      .filter(m => m.roleId === role.id && m.status !== 'rejected' && m.status !== 'not-interested')
      .sort((a, b) => (a.status === 'shortlisted' ? -1 : 1) || a.rank - b.rank)

    const maskedOutputsForRole = app.outputs.filter(o => o.type === 'Masked' && o.roleId === role.id)
    const candIdsFromOutputs = maskedOutputsForRole.map(o => o.candidateId)
    const candIdsFromShortlist = roleMatches.filter(m => m.status === 'shortlisted' || m.scored).slice(0, 5).map(m => m.candidateId)

    const mergedIds = Array.from(new Set([...candIdsFromOutputs, ...candIdsFromShortlist]))
    const finalIds = mergedIds.length > 0 ? mergedIds : app.candidates.slice(0, 3).map(c => c.id)

    return finalIds
      .map((cid, index) => {
        const candidate = app.candidate(cid)
        if (!candidate) return null
        const match = roleMatches.find(m => m.candidateId === cid)
        const output = maskedOutputsForRole.find(o => o.candidateId === cid)
          ?? app.outputs.find(o => o.type === 'Masked' && o.candidateId === cid)
        return {
          index: index + 1,
          candidate,
          match,
          output,
        }
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
  }, [app.matches, app.outputs, app.candidates, role.id])

  const initialCandParam = params.get('candidate')
  const [activeCandId, setActiveCandId] = useState<string>(
    initialCandParam || packetCandidates[0]?.candidate.id || 'priya',
  )

  React.useEffect(() => {
    if (!packetCandidates.some(p => p.candidate.id === activeCandId) && packetCandidates[0]) {
      setActiveCandId(packetCandidates[0].candidate.id)
    }
  }, [packetCandidates, activeCandId])

  const activeItem = packetCandidates.find(p => p.candidate.id === activeCandId) ?? packetCandidates[0]
  const activeCand = activeItem?.candidate
  const activeMatch = activeItem?.match

  const getChosenResume = (c: Candidate, m?: Match, o?: ResumeOutput) => {
    const list = app.resumesFor(c.id)
    const chosenId = sourceResumeByCand[c.id] ?? o?.sourceResumeId ?? m?.scoredOnResumeId ?? list.find(r => r.isPrimary)?.id ?? list[0]?.id
    return list.find(r => r.id === chosenId) ?? list[0]
  }

  const activeResume = activeCand ? getChosenResume(activeCand, activeMatch, activeItem?.output) : undefined
  const activeTake = activeCand ? app.takeFor(activeCand.id, role.id) : undefined
  const activeTakeAuthor = activeTake ? app.member(activeTake.authorId) : undefined
  const roleReqs = app.requirementsFor(role.id)

  const packetShareUrl = `https://heroscouter.com/p/${role.id}`
  const activeCandShareUrl = activeCand ? `https://heroscouter.com/m/${role.id}/${activeCand.id}` : packetShareUrl

  const copyPacketUrl = () => {
    navigator.clipboard?.writeText(packetShareUrl).catch(() => {})
    app.toast(`Copied role packet link (${packetCandidates.length} masked profiles)`)
  }

  const copyCandidateUrl = (c: Candidate, idx: number) => {
    const url = `https://heroscouter.com/m/${role.id}/${c.id}`
    navigator.clipboard?.writeText(url).catch(() => {})
    app.toast(`Copied masked link for Candidate #0${idx}`)
  }

  const handleRequestIntro = (c: Candidate, m?: Match) => {
    setIntroRequestedFor(prev => ({ ...prev, [c.id]: true }))
    if (m) {
      app.updateAlignment(m.id, role.companyType === 'Client' ? 'client' : 'prospect', 'interested')
    }
    app.toast(`Client requested intro for Candidate (${c.name}) · Alignment updated to Interested ✓`)
  }

  // Table columns for Manage Role Masked Links mode
  const tableColumns: Column<NonNullable<typeof packetCandidates[number]> & { id: string }>[] = [
    {
      key: 'alias',
      header: 'Masked Candidate & Real Identity',
      icon: <Shield className="size-3" />,
      sortable: true,
      sortValue: r => r.index,
      render: r => {
        const res = getChosenResume(r.candidate, r.match, r.output)
        const alias = maskedAliasFor(r.candidate, res?.headline)
        return (
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md border border-border bg-secondary px-1.5 font-mono text-[11px] font-medium text-foreground tnum">
              #0{r.index}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold text-foreground">{alias}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-xs border border-dashed border-border bg-secondary/70 px-1.5 py-0.2 text-[10px] text-gray-1100">
                  <EyeOff className="size-2.5" />Hidden name: {r.candidate.name}
                </span>
                <span>·</span>
                <span>{r.candidate.metro ?? 'Remote'}</span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'resume',
      header: 'Source Resume',
      icon: <FileText className="size-3" />,
      render: r => {
        const resumes = app.resumesFor(r.candidate.id)
        const chosen = getChosenResume(r.candidate, r.match, r.output)
        return (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-xs font-medium text-foreground">
              <FileText className="size-3.5 text-muted-foreground" />
              {resumes.length > 1 ? (
                <select
                  aria-label={`Source resume for ${r.candidate.name}`}
                  value={chosen?.id ?? ''}
                  onChange={e => {
                    setSourceResumeByCand(prev => ({ ...prev, [r.candidate.id]: e.target.value }))
                    app.toast(`Switched ${r.candidate.name} to ${resumes.find(x => x.id === e.target.value)?.label} resume`)
                  }}
                  className="bg-transparent text-xs font-medium text-foreground outline-none"
                >
                  {resumes.map(rs => (
                    <option key={rs.id} value={rs.id} className="bg-card text-foreground">
                      {rs.label} resume v{latestVersion(rs)}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{chosen?.label ?? 'Primary'} resume v{chosen ? latestVersion(chosen) : 1}</span>
              )}
            </span>
          </div>
        )
      },
    },
    {
      key: 'fit',
      header: 'Role Fit & Redaction',
      icon: <ShieldCheck className="size-3" />,
      render: r => {
        const rec = r.match?.recommendation ?? (r.match?.band === 'Strong' ? 'Strong' : 'Mild')
        const metCount = r.match?.requirementsMet?.filter(x => x.result === 'met' || x.result === 'predicted').length ?? roleReqs.length
        const totalReq = r.match?.requirementsMet?.length || roleReqs.length || 5
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <RecommendationPill recommendation={rec} />
            <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-border bg-background px-1.5 font-mono text-[11px] text-foreground tnum">
              <Check className="size-3 text-success" />{metCount}/{totalReq} reqs
            </span>
            <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-success/35 bg-success/[0.07] px-1.5 text-[10px] font-medium text-foreground">
              <ShieldCheck className="size-3 text-success" />0 IDs leaked
            </span>
          </div>
        )
      },
    },
    {
      key: 'link',
      header: 'Shareable Masked Link',
      icon: <Link2 className="size-3" />,
      render: r => {
        const url = `heroscouter.com/m/${role.id}/${r.candidate.id}`
        const active = r.output?.linkActive ?? true
        return (
          <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
            <span className={cn(
              'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px]',
              active ? 'border-border bg-secondary/70 text-foreground' : 'border-border bg-muted text-muted-foreground line-through',
            )}>
              <Globe className="size-3 text-success" />
              {url}
            </span>
            {r.output && (
              <Switch
                aria-label={`Toggle link for ${r.candidate.name}`}
                checked={active}
                onChange={next => app.toggleOutputLink(r.output!.id, next)}
              />
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span>Masked Role Links &amp; Client Portal</span>
              <ExampleMark />
            </span>
          }
          meta={
            <span className="tnum">
              {packetCandidates.length} masked profiles for {role.title} · {role.company} ({role.companyType})
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" icon={<Wand2 />} onClick={() => navigate(`/resumes/masked?role=${role.id}&candidates=${packetCandidates.map(p => p.candidate.id).join(',')}`)}>
                Open Masked Studio
              </Button>
              <Button variant="primary" icon={<Sparkles />} onClick={() => setBulkModalOpen(true)}>
                Select resumes &amp; bulk mask
              </Button>
            </div>
          }
        />
      )}

      {/* Role Packet Command Bar (Double-Bezel Section) */}
      <section className="rounded-2xl border border-border bg-gray-100 p-1">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              {embedded ? 'Shareable Masked Links Packet for this Role' : '1. Role Packet & Shareable Client Links'}
            </h2>
            <CompanyTypeTag type={role.companyType} />
            <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-success/40 bg-success/[0.08] px-1.5 text-[11px] font-medium text-foreground">
              <ShieldCheck className="size-3 text-success" />Identity-masked · Read-only
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PillTabs
              value={viewMode}
              onChange={setViewMode}
              tabs={[
                { value: 'portal', label: 'Client Link Preview', icon: <Eye />, count: packetCandidates.length },
                { value: 'table', label: 'Manage Masked Links', icon: <Table2 />, count: packetCandidates.length },
              ]}
            />
          </div>
        </div>

        <div className="mx-1 mb-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            {!embedded && onRoleChange && (
              <div className="flex items-center gap-2">
                <span className="eyebrow text-[10px] text-gray-1000">Role</span>
                <Select
                  aria-label="Select role for masked view"
                  value={role.id}
                  onChange={onRoleChange}
                  options={app.roles.map(r => ({
                    value: r.id,
                    label: `${r.title} — ${r.company} (${r.companyType})`,
                  }))}
                />
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-1.5">
              <Globe className="size-3.5 text-success" />
              <span className="eyebrow text-[9px] text-gray-1000">Packet Link</span>
              <span className="font-mono text-xs font-medium text-foreground">{packetShareUrl}</span>
              <button
                type="button"
                onClick={copyPacketUrl}
                className="ml-1 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Copy className="size-3" />Copy
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Segmented
              size="sm"
              aria-label="Client link visual style"
              value={style}
              onChange={setStyle}
              options={[
                { value: 'creative', label: <span className="inline-flex items-center gap-1"><Sparkles className="size-3" />Creative SaaS</span> },
                { value: 'traditional', label: <span className="inline-flex items-center gap-1"><FileText className="size-3" />Traditional Word</span> },
              ]}
            />
            <Switch
              aria-label="Recruiter X-Ray: reveal masked identifiers"
              checked={xray}
              onChange={setXray}
              label={<span className="inline-flex items-center gap-1 text-xs"><Eye className="size-3.5 text-warning" />Recruiter X-Ray</span>}
            />
            <Button variant="outline" size="sm" icon={<Mail />} onClick={() => setEmailOpen(true)}>
              Draft email with links
            </Button>
          </div>
        </div>
      </section>

      {viewMode === 'table' ? (
        <DataTable
          caption={`Masked links for ${role.title}`}
          columns={tableColumns}
          rows={packetCandidates.map(p => ({ ...p, id: p.candidate.id }))}
          onRowClick={r => {
            setActiveCandId(r.candidate.id)
            setViewMode('portal')
          }}
          rowActions={r => (
            <>
              <Button
                variant="primary"
                size="sm"
                icon={<Eye />}
                onClick={() => {
                  setActiveCandId(r.candidate.id)
                  setViewMode('portal')
                }}
              >
                Preview link
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Copy />}
                onClick={() => copyCandidateUrl(r.candidate, r.index)}
              >
                Copy link
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Wand2 />}
                onClick={() => navigate(`/resumes/masked?role=${role.id}&candidates=${r.candidate.id}`)}
              >
                Studio
              </Button>
            </>
          )}
        />
      ) : (
        /* ==================== Split Master-Detail: Left Packet List + Right Live Client Link Portal ==================== */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Rail (4 cols): Masked Candidates in this Role Packet */}
          <div className="space-y-4 lg:col-span-4">
            <section className="rounded-2xl border border-border bg-gray-100 p-1">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-foreground">
                    Role Packet ({packetCandidates.length} Masked Links)
                  </h3>
                </div>
                <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setBulkModalOpen(true)}>
                  + Bulk mask
                </Button>
              </div>

              <div className="mx-0.5 mb-0.5 space-y-1.5 rounded-xl border border-border bg-card p-2">
                {packetCandidates.map(({ index, candidate: c, match: m, output: o }) => {
                  const isSelected = c.id === activeCand?.id
                  const resumes = app.resumesFor(c.id)
                  const chosen = getChosenResume(c, m, o)
                  const alias = maskedAliasFor(c, chosen?.headline)
                  const rec = m?.recommendation ?? (m?.band === 'Strong' ? 'Strong' : 'Mild')
                  const metCount = m?.requirementsMet?.filter(x => x.result === 'met' || x.result === 'predicted').length ?? roleReqs.length
                  const totalReq = m?.requirementsMet?.length || roleReqs.length || 5

                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveCandId(c.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveCandId(c.id) } }}
                      className={cn(
                        'group relative flex flex-col gap-2.5 rounded-xl border p-3 text-left transition-all outline-none',
                        isSelected
                          ? 'border-gray-1100 bg-secondary/80 shadow-custom'
                          : 'border-border bg-background hover:border-gray-700 hover:bg-secondary/35',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex h-5 items-center rounded-xs border border-border bg-card px-1.5 font-mono text-[10px] font-semibold text-foreground tnum">
                              Candidate #0{index}
                            </span>
                            <RecommendationPill recommendation={rec} />
                          </div>
                          <div className="mt-1.5 text-xs font-semibold leading-snug text-foreground">
                            {alias}
                          </div>
                        </div>
                      </div>

                      {/* Internal Recruiter Reference + Source Resume Selector */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border/70 pt-2 text-[11px]" onClick={e => e.stopPropagation()}>
                        <span className="inline-flex items-center gap-1 text-muted-foreground" title="Real identity is hidden from the client link">
                          <EyeOff className="size-3 text-muted-foreground" />
                          <span>Internal: <strong className="font-medium text-foreground">{c.name}</strong></span>
                        </span>

                        <div className="flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5">
                          <FileText className="size-3 text-muted-foreground" />
                          {resumes.length > 1 ? (
                            <select
                              aria-label={`Select source resume for ${c.name}`}
                              value={chosen?.id ?? ''}
                              onChange={e => {
                                setSourceResumeByCand(prev => ({ ...prev, [c.id]: e.target.value }))
                                setActiveCandId(c.id)
                                app.toast(`Updated masked link to use ${resumes.find(r => r.id === e.target.value)?.label} resume`)
                              }}
                              className="bg-transparent text-[11px] font-medium text-foreground outline-none"
                            >
                              {resumes.map(r => (
                                <option key={r.id} value={r.id} className="bg-card text-foreground">
                                  {r.label} v{latestVersion(r)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[11px] font-medium text-foreground">
                              {chosen?.label ?? 'Primary'} v{chosen ? latestVersion(chosen) : 1}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Link + Copy Row */}
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5" onClick={e => e.stopPropagation()}>
                        <span className="truncate font-mono text-[10px] text-muted-foreground">
                          heroscouter.com/m/{role.id}/{c.id}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="font-mono text-[10px] text-success tnum">{metCount}/{totalReq} reqs</span>
                          <button
                            type="button"
                            onClick={() => copyCandidateUrl(c, index)}
                            className="inline-flex h-5 items-center gap-1 rounded-xs border border-border bg-secondary px-1.5 text-[10px] font-medium text-foreground hover:bg-muted"
                          >
                            <Copy className="size-2.5" />Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={() => setBulkModalOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-gray-700 hover:bg-secondary/40 hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  Select resumes &amp; bulk mask more candidates
                </button>
              </div>
            </section>
          </div>

          {/* Right Viewport (8 cols): What the Client / Prospect Sees When Opening the Masked Link */}
          <div className="lg:col-span-8">
            {activeCand ? (
              <section className="rounded-2xl border border-border bg-gray-100 p-1">
                {/* Browser / Client Portal Chrome Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-gray-600" />
                    <span className="size-2.5 rounded-full bg-gray-600" />
                    <span className="size-2.5 rounded-full bg-gray-600" />
                    <div className="ml-2 flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-foreground">
                      <Lock className="size-3 text-success" />
                      <span>{activeCandShareUrl}</span>
                    </div>
                    <span className="hidden items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                      <Eye className="size-3" />External {role.companyType} View
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Copy />}
                      onClick={() => copyCandidateUrl(activeCand, activeItem.index)}
                    >
                      Copy candidate link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Wand2 />}
                      onClick={() => navigate(`/resumes/masked?role=${role.id}&candidates=${activeCand.id}`)}
                    >
                      Edit in Studio
                    </Button>
                  </div>
                </div>

                {/* Inner Portal Canvas */}
                <div className="mx-1 mb-1 overflow-hidden rounded-xl border border-border bg-card">
                  {/* Portal Top Navigation Bar (What the Client Sees) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/50 px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                        H
                      </span>
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <span>HeroScouter Curated Shortlist</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{role.company}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Role: <strong className="font-medium text-foreground">{role.title}</strong> · Identity-masked candidate packet
                        </div>
                      </div>
                    </div>

                    {/* Client Packet Switcher */}
                    <div className="flex flex-wrap items-center gap-1">
                      {packetCandidates.map(p => (
                        <button
                          key={p.candidate.id}
                          type="button"
                          onClick={() => setActiveCandId(p.candidate.id)}
                          className={cn(
                            'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] font-medium transition-colors tnum',
                            p.candidate.id === activeCand.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground',
                          )}
                        >
                          Candidate #0{p.index}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Portal Body */}
                  <div className={cn('p-6', style === 'traditional' ? 'font-serif' : 'space-y-6')}>
                    {style === 'traditional' ? (
                      /* ==================== Traditional Word-Style Masked View (C12 Probe) ==================== */
                      <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-border bg-background p-6 font-sans shadow-xs">
                        <div className="border-b-2 border-foreground pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="eyebrow text-[10px] text-gray-1000">
                                CONFIDENTIAL CANDIDATE PROFILE · CANDIDATE #0{activeItem.index}
                              </div>
                              <h2 className="mt-1 text-xl font-bold text-foreground">
                                {maskedAliasFor(activeCand, activeResume?.headline)}
                              </h2>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {activeCand.metro ?? 'Remote'} ({activeCand.workModes?.join('/') ?? 'Hybrid'}) · {workAuthShort(activeCand.workAuth) ?? 'Authorized'} · Availability: {activeCand.availability ?? '2 weeks'}
                              </p>
                            </div>
                            <Button
                              variant={introRequestedFor[activeCand.id] ? 'outline' : 'primary'}
                              size="sm"
                              icon={<Handshake />}
                              onClick={() => handleRequestIntro(activeCand, activeMatch)}
                            >
                              {introRequestedFor[activeCand.id] ? 'Intro requested ✓' : 'Request intro'}
                            </Button>
                          </div>
                        </div>

                        {activeTake?.status === 'signed' && (
                          <div className="rounded-lg border border-border bg-secondary/40 p-3.5 text-xs leading-relaxed">
                            <div className="eyebrow mb-1 text-[9px] text-gray-1000">RECRUITER NOTE</div>
                            <p className="italic">“{activeTake.text}”</p>
                            <p className="mt-1 font-medium text-muted-foreground">{signature(activeTakeAuthor)}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <h3 className="eyebrow border-b border-border pb-1 text-[10px] text-foreground">
                            EXPERIENCE (EMPLOYER IDENTIFIERS REDACTED)
                          </h3>
                          {activeCand.companies.map((co, idx) => (
                            <div key={idx} className="space-y-1 py-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span>
                                  {co.title} —{' '}
                                  {xray ? (
                                    <span className="hidden-span rounded-xs px-1 font-mono">
                                      [{co.descriptor}] (was: {co.name})
                                    </span>
                                  ) : (
                                    <span className="rounded-xs border border-border bg-secondary px-1.5 py-0.5">
                                      [{co.descriptor}]
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono text-[11px] font-normal text-muted-foreground">{co.start} – {co.end}</span>
                              </div>
                              {idx === 0 && (
                                <ul className="list-disc space-y-1 pl-5 text-xs text-gray-1100">
                                  {(activeResume?.emphasis?.length ? activeCand.achievements : activeCand.achievements).map((ach, j) => (
                                    <li key={j}>{redactAchievement(ach, xray)}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="eyebrow border-b border-border pb-1 text-[10px] text-foreground">VERIFIED SKILLS</h3>
                          <p className="text-xs text-foreground">{activeCand.skills.join(' · ')}</p>
                        </div>
                      </div>
                    ) : (
                      /* ==================== Creative SaaS Masked Link View (Rightfit Double-Bezel) ==================== */
                      <>
                        {/* Hero Alias & Client Decision Bar */}
                        <section className="rounded-2xl border border-border bg-gray-100 p-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="eyebrow text-[10px] text-gray-1000">
                                CANDIDATE #0{activeItem.index} · VERIFIED MASKED PROFILE
                              </span>
                              {xray && (
                                <span className="hidden-span rounded-xs px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                                  Real name: {activeCand.name} (hidden from client)
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              Source: {activeResume?.label ?? 'Primary'} resume v{activeResume ? latestVersion(activeResume) : 1}
                            </span>
                          </div>

                          <div className="mx-1 mb-1 rounded-xl border border-border bg-card p-5">
                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                              <div className="space-y-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Avatar initials={`C${activeItem.index}`} size={40} />
                                  <div>
                                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                      {maskedAliasFor(activeCand, activeResume?.headline)}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                      Identity-protected profile prepared for {role.company} · Contact details released upon intro request
                                    </p>
                                  </div>
                                </div>

                                {/* Key Fact Pills with Icons */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-2.5 text-xs font-medium text-foreground">
                                    <MapPin className="size-3.5 text-muted-foreground" />
                                    {activeCand.metro ?? 'Remote'} · {activeCand.workModes?.join('/') ?? 'Hybrid'}
                                  </span>
                                  <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-2.5 text-xs font-medium text-foreground">
                                    <ShieldCheck className="size-3.5 text-muted-foreground" />
                                    {workAuthShort(activeCand.workAuth) ?? 'Work auth verified'}
                                  </span>
                                  <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-secondary/70 px-2.5 text-xs font-medium text-foreground">
                                    <Clock className="size-3.5 text-muted-foreground" />
                                    Available: {activeCand.availability ?? '2 weeks notice'}
                                  </span>
                                  <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-success/40 bg-success/[0.08] px-2.5 font-mono text-xs font-medium text-foreground tnum">
                                    <CircleCheck className="size-3.5 text-success" />
                                    {activeMatch?.requirementsMet?.filter(x => x.result === 'met' || x.result === 'predicted').length ?? roleReqs.length}/{activeMatch?.requirementsMet?.length || roleReqs.length || 5} role requirements met
                                  </span>
                                </div>
                              </div>

                              {/* Client Interactive CTA Buttons */}
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button
                                  variant={introRequestedFor[activeCand.id] ? 'outline' : 'primary'}
                                  icon={<Handshake />}
                                  onClick={() => handleRequestIntro(activeCand, activeMatch)}
                                >
                                  {introRequestedFor[activeCand.id] ? 'Intro requested ✓' : 'Request intro'}
                                </Button>
                                <Button
                                  variant="outline"
                                  icon={<Download />}
                                  onClick={() => app.toast(`Downloaded masked PDF for Candidate #0${activeItem.index}`)}
                                >
                                  Masked PDF
                                </Button>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* 2-Column Grid: Why We Recommend + Signed Recruiter Take */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <section className="rounded-2xl border border-border bg-gray-100 p-1">
                            <div className="flex items-center gap-2 px-3.5 py-2">
                              <Sparkles className="size-3.5 text-muted-foreground" />
                              <h3 className="text-xs font-semibold text-foreground">Why we recommend for {role.title}</h3>
                            </div>
                            <div className="mx-0.5 mb-0.5 space-y-2 rounded-xl border border-border bg-card p-4 text-xs">
                              <p className="font-medium leading-relaxed text-foreground">
                                “{activeMatch?.reason ?? `Strong ${activeCand.years ?? 6}+ year track record across ${activeCand.subcategory} and ${activeCand.skills.slice(0, 3).join(', ')}.`}”
                              </p>
                              <ul className="space-y-1.5 pt-1 text-gray-1100">
                                {(activeMatch?.greenFlags?.length
                                  ? activeMatch.greenFlags
                                  : activeCand.achievements.slice(0, 2)
                                ).map((flag, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                                    <span>{redactAchievement(flag, xray)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </section>

                          <section className="rounded-2xl border border-border bg-gray-100 p-1">
                            <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                              <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <MessageSquare className="size-3.5 text-muted-foreground" />
                                Our take (Human vouch)
                              </span>
                              <span className="eyebrow text-[9px] text-success">SIGNED</span>
                            </div>
                            <div className="mx-0.5 mb-0.5 flex h-[calc(100%-2.25rem)] flex-col justify-between rounded-xl border border-border bg-card p-4 text-xs">
                              <blockquote className="leading-relaxed text-foreground">
                                “{activeTake?.status === 'signed' ? activeTake.text : activeCand.ourTake}”
                              </blockquote>
                              <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                                <Avatar initials={activeTakeAuthor?.initials ?? 'VD'} size={24} />
                                <span>{signature(activeTakeAuthor ?? app.currentUser)}</span>
                              </div>
                            </div>
                          </section>
                        </div>

                        {/* Role Requirements Match Breakdown */}
                        <section className="rounded-2xl border border-border bg-gray-100 p-1">
                          <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                            <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                              <FileCheck className="size-3.5 text-muted-foreground" />
                              Role Requirements Verification ({role.title})
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              Verified against resume &amp; intake call
                            </span>
                          </div>
                          <div className="mx-0.5 mb-0.5 grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-3.5 sm:grid-cols-2">
                            {(activeMatch?.requirementsMet?.length
                              ? activeMatch.requirementsMet
                              : roleReqs.slice(0, 6).map(r => ({
                                  reqId: r.id,
                                  label: r.text,
                                  result: 'met' as const,
                                  evidence: 'Verified on record',
                                }))
                            ).map(req => (
                              <div
                                key={req.reqId}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <CircleCheck className="size-3.5 shrink-0 text-success" />
                                  <span className="truncate font-medium text-foreground">{req.label}</span>
                                </div>
                                <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
                                  {req.result === 'predicted' ? '◇ Adjacent' : '✓ Verified'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Redacted Experience Timeline */}
                        <section className="rounded-2xl border border-border bg-gray-100 p-1">
                          <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                            <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                              <Building2 className="size-3.5 text-muted-foreground" />
                              Redacted Experience &amp; Impact Timeline
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Employer names replaced with verified descriptors
                            </span>
                          </div>
                          <div className="mx-0.5 mb-0.5 divide-y divide-border rounded-xl border border-border bg-card p-4">
                            {activeCand.companies.map((co, i) => (
                              <div key={i} className="py-3 first:pt-0 last:pb-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">{co.title}</span>
                                    <span className="text-muted-foreground">·</span>
                                    {xray ? (
                                      <span className="hidden-span inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs text-foreground">
                                        <EyeOff className="size-3 text-warning" />
                                        [{co.descriptor}] <span className="text-warning">(Hidden: {co.name})</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                                        <Shield className="size-3 text-muted-foreground" />
                                        {co.descriptor}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-xs text-muted-foreground tnum">{co.start} – {co.end}</span>
                                </div>

                                {i === 0 && (
                                  <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-gray-1100">
                                    {activeCand.achievements.map((ach, j) => (
                                      <li key={j} className="flex items-start gap-2">
                                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gray-800" />
                                        <span>{redactAchievement(ach, xray)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>

                        {/* Verified Skills & Education Footer */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <section className="rounded-2xl border border-border bg-gray-100 p-1">
                            <div className="px-3.5 py-2 text-xs font-semibold text-foreground">Explicit Verified Skills</div>
                            <div className="mx-0.5 mb-0.5 flex flex-wrap gap-1.5 rounded-xl border border-border bg-card p-3.5">
                              {(activeResume?.emphasis?.length
                                ? Array.from(new Set([...activeResume.emphasis, ...activeCand.skills]))
                                : activeCand.skills
                              ).map(s => (
                                <Tag key={s}>{s}</Tag>
                              ))}
                            </div>
                          </section>

                          <section className="rounded-2xl border border-border bg-gray-100 p-1">
                            <div className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-foreground">
                              <GraduationCap className="size-3.5 text-muted-foreground" />
                              Education (Institution Masked)
                            </div>
                            <div className="mx-0.5 mb-0.5 rounded-xl border border-border bg-card p-3.5 text-xs">
                              {activeCand.education ? (
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-foreground">{activeCand.education.degree} · {activeCand.education.field}</span>
                                  {xray ? (
                                    <span className="hidden-span rounded-xs px-1.5 py-0.5 font-mono text-[11px]">
                                      Hidden: {activeCand.education.school}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Accredited University (Hidden)</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Degree verified on record</span>
                              )}
                            </div>
                          </section>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            ) : (
              <EmptyState
                icon={<Shield />}
                title="No masked candidates for this role yet"
                body="Select candidates and their resumes to generate shareable masked links for this role."
                action={
                  <Button variant="primary" icon={<Sparkles />} onClick={() => setBulkModalOpen(true)}>
                    Select resumes &amp; bulk mask
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}

      <BulkMaskForRoleDialog
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        initialRoleId={role.id}
        onCompleted={(_rid, cids) => {
          if (cids[0]) setActiveCandId(cids[0])
        }}
      />

      <CopyEmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        candidateIds={packetCandidates.map(p => p.candidate.id)}
        roleId={role.id}
        initialKind={role.companyType === 'Client' ? 'shortlist' : 'pitch'}
      />
    </div>
  )
}
