import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Check, CircleCheck, Copy, ExternalLink, Eye, EyeOff, FileCheck,
  FileSpreadsheet, FileText, FolderKanban, Layers, Link2, Plus, Search, Shield,
  ShieldCheck, Sparkles, Upload, Users, Wand2,
} from 'lucide-react'
import { Avatar, Button, Checkbox, CompanyTypeTag, Input, Segmented, Select, Tag, cn } from './ui'
import { AIStepper, Dialog, SourceBadge, useStepper, workAuthShort } from './hs'
import { RecommendationPill } from './v3'
import { latestVersion } from './outputs'
import { useApp } from '../store/AppStore'
import type { Candidate, OutputStyle, ResumeOutput } from '../data/types'

/* ==========================================================================
   BulkMaskForRoleDialog — SaaS Guided Flow:
   1. Select Target Role
   2. Select Candidates & Choose Source Resume per Candidate
   3. Bulk Mask & Generate Role Shareable Masked Links
   ========================================================================== */

export interface BulkMaskForRoleDialogProps {
  open: boolean
  onClose: () => void
  initialRoleId?: string | null
  initialCandidateIds?: string[]
  onCompleted?: (roleId: string, candidateIds: string[]) => void
}

const MASK_STEPS = [
  'Scanning selected resumes & redacting employer, school, and project identifiers',
  'Mapping verified evidence to role requirements & attaching signed takes',
  'Generating shareable role masked web links & PDF packet',
]

export function BulkMaskForRoleDialog({
  open,
  onClose,
  initialRoleId,
  initialCandidateIds,
  onCompleted,
}: BulkMaskForRoleDialogProps) {
  const app = useApp()
  const navigate = useNavigate()

  const openRoles = useMemo(
    () => app.roles.filter(r => r.status === 'Open' || r.id === initialRoleId),
    [app.roles, initialRoleId],
  )

  const [roleId, setRoleId] = useState<string>(initialRoleId || openRoles[0]?.id || 'northwind-spm')
  const [searchQ, setSearchQ] = useState('')
  const [poolFilter, setPoolFilter] = useState<'role-matches' | 'shortlisted' | 'all-pool'>('role-matches')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [resumeChoiceByCand, setResumeChoiceByCand] = useState<Record<string, string>>({})
  const [template, setTemplate] = useState<'A · Compact' | 'B · Achievement-led' | 'C · Role-fit'>('C · Role-fit')
  const [style, setStyle] = useState<OutputStyle>('creative')
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [addingResumeFor, setAddingResumeFor] = useState<string | null>(null)
  const [newResumeLabel, setNewResumeLabel] = useState('')

  const { step, done } = useStepper(MASK_STEPS.length, running, 520)

  const selectedRole = app.role(roleId) ?? openRoles[0]

  // Synchronize initial role and candidates when modal opens
  useEffect(() => {
    if (!open) {
      setRunning(false)
      setCompleted(false)
      setAddingResumeFor(null)
      return
    }
    const targetRole = initialRoleId || openRoles[0]?.id || 'northwind-spm'
    setRoleId(targetRole)
    if (initialCandidateIds && initialCandidateIds.length > 0) {
      setSelectedIds(initialCandidateIds)
      setPoolFilter('all-pool')
    } else {
      const roleMatches = app.matches
        .filter(m => m.roleId === targetRole && m.status !== 'rejected' && m.status !== 'not-interested')
        .sort((a, b) => (a.status === 'shortlisted' ? -1 : 1) || a.rank - b.rank)
      const defaults = roleMatches.filter(m => m.status === 'shortlisted' || m.scored).slice(0, 4).map(m => m.candidateId)
      setSelectedIds(defaults.length > 0 ? defaults : app.candidates.slice(0, 3).map(c => c.id))
      setPoolFilter('role-matches')
    }
  }, [open, initialRoleId, initialCandidateIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update default selected candidates when switching role if no explicit initialCandidateIds
  const handleRoleChange = (nextRoleId: string) => {
    setRoleId(nextRoleId)
    if (!initialCandidateIds?.length) {
      const roleMatches = app.matches
        .filter(m => m.roleId === nextRoleId && m.status !== 'rejected' && m.status !== 'not-interested')
        .sort((a, b) => (a.status === 'shortlisted' ? -1 : 1) || a.rank - b.rank)
      const defaults = roleMatches.filter(m => m.status === 'shortlisted' || m.scored).slice(0, 4).map(m => m.candidateId)
      if (defaults.length > 0) setSelectedIds(defaults)
    }
  }

  // Candidate list filtered by mode + query
  const candidateRows = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    const roleMatches = new Map(
      app.matches.filter(m => m.roleId === roleId).map(m => [m.candidateId, m]),
    )
    let list = app.candidates.filter(c => {
      if (poolFilter === 'shortlisted') {
        return roleMatches.get(c.id)?.status === 'shortlisted' || selectedIds.includes(c.id)
      }
      if (poolFilter === 'role-matches') {
        const m = roleMatches.get(c.id)
        return (m && m.status !== 'rejected' && m.status !== 'not-interested') || selectedIds.includes(c.id)
      }
      return true
    })
    if (q) {
      list = list.filter(c =>
        `${c.name} ${c.headline} ${c.category} ${c.subcategory} ${c.skills.join(' ')}`.toLowerCase().includes(q),
      )
    }
    return list.slice(0, 14).map(c => ({
      candidate: c,
      match: roleMatches.get(c.id),
    }))
  }, [app.candidates, app.matches, roleId, poolFilter, searchQ, selectedIds])

  const getChosenResume = (c: Candidate) => {
    const list = app.resumesFor(c.id)
    const m = app.matches.find(x => x.roleId === roleId && x.candidateId === c.id)
    const chosenId = resumeChoiceByCand[c.id] ?? m?.scoredOnResumeId ?? list.find(r => r.isPrimary)?.id ?? list[0]?.id
    return list.find(r => r.id === chosenId) ?? list[0]
  }

  // Finish stepper -> create outputs
  useEffect(() => {
    if (!done || completed) return
    const nowOutputs: ResumeOutput[] = selectedIds.map(cid => {
      const c = app.candidate(cid)
      const chosen = c ? getChosenResume(c) : undefined
      const ver = chosen ? latestVersion(chosen) : 1
      return {
        id: `mask-${roleId}-${cid}-${Date.now().toString(36)}`,
        candidateId: cid,
        type: 'Masked',
        roleId,
        template: template.split(' · ')[0] ? `Template ${template}` : template,
        createdBy: app.currentUser.displayName.split(' ')[0] + ' ' + (app.currentUser.displayName.split(' ')[1]?.[0] ?? '') + '.',
        created: 'Just now',
        stale: false,
        sourceResumeId: chosen?.id,
        sourceVersion: ver,
        promptVersion: 'Masking v4',
        style,
        delivery: 'link',
        shareUrl: `https://heroscouter.com/m/${roleId}/${cid}`,
        linkActive: true,
        revisions: [
          {
            n: 1,
            instruction: `Bulk masked for ${selectedRole?.title ?? 'role'} (${chosen?.label ?? 'Primary'} resume v${ver})`,
            scope: 'Whole resume',
            createdBy: app.currentUser.displayName,
            at: 'Just now',
          },
        ],
      }
    })
    app.addOutputs(nowOutputs)
    app.log({
      what: `Bulk masked ${selectedIds.length} resume${selectedIds.length === 1 ? '' : 's'} for ${selectedRole?.title} — ${selectedRole?.company}`,
      record: `${selectedRole?.title} — ${selectedRole?.company}`,
      recordHref: `/resumes/masked-view?role=${roleId}`,
      kind: 'Outputs',
    })
    app.toast(`Masked ${selectedIds.length} resume${selectedIds.length === 1 ? '' : 's'} & generated shareable role links`)
    setRunning(false)
    setCompleted(true)
    onCompleted?.(roleId, selectedIds)
  }, [done, completed]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCandidate = (cid: string) => {
    setSelectedIds(prev => (prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]))
  }

  const handleQuickAddResume = (c: Candidate) => {
    const label = newResumeLabel.trim() || 'Role-tailored'
    const newId = app.addResume({
      candidateId: c.id,
      label,
      targetCategory: selectedRole?.category ?? c.category,
      isPrimary: false,
      headline: `${c.headline} (${label})`,
      emphasis: selectedRole?.mustSkills.slice(0, 3) ?? c.skills.slice(0, 3),
      versions: [
        {
          n: 1,
          file: `${c.name.replace(/\s+/g, '_')}_${label}.pdf`,
          uploadedBy: app.currentUser.displayName,
          uploadedAt: 'Just now',
          changesApplied: 2,
        },
      ],
    })
    setResumeChoiceByCand(prev => ({ ...prev, [c.id]: newId }))
    setAddingResumeFor(null)
    setNewResumeLabel('')
    app.toast(`Added ${label} resume for ${c.name}`)
  }

  const copyPacketLinks = () => {
    const lines = selectedIds.map((cid, idx) => {
      const c = app.candidate(cid)
      const alias = c ? `${c.headline.split('·')[0].trim()} · ${c.years ?? 5} yrs · ${c.category}` : `Candidate #${idx + 1}`
      return `${idx + 1}. ${alias} — https://heroscouter.com/m/${roleId}/${cid}`
    })
    const packet = `Role Packet (${selectedRole?.title} — ${selectedRole?.company}): https://heroscouter.com/p/${roleId}\n\n${lines.join('\n')}`
    navigator.clipboard?.writeText(packet).catch(() => {})
    app.toast(`Copied role packet link + ${selectedIds.length} masked candidate links`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={780}
      title="Select resumes for role & bulk mask"
      description="Pick a target role, choose which resume version to use for each candidate, and generate identity-masked web links + PDFs in one batch."
      footer={
        completed ? (
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="outline" icon={<Copy />} onClick={copyPacketLinks}>
              Copy masked links ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              icon={<Wand2 />}
              onClick={() => {
                onClose()
                navigate(`/resumes/masked?role=${roleId}&candidates=${selectedIds.join(',')}`)
              }}
            >
              Open in Masked Studio
            </Button>
            <Button
              variant="primary"
              icon={<Eye />}
              onClick={() => {
                onClose()
                navigate(`/resumes/masked-view?role=${roleId}&candidates=${selectedIds.join(',')}`)
              }}
            >
              Open Role Masked Links View →
            </Button>
          </>
        ) : (
          <>
            <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-success" />
              <span>
                <span className="font-mono font-medium text-foreground tnum">{selectedIds.length}</span> candidate{selectedIds.length === 1 ? '' : 's'} selected · Employer names &amp; contact details automatically redacted
              </span>
            </div>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              icon={<Sparkles />}
              disabled={selectedIds.length === 0 || running}
              onClick={() => setRunning(true)}
            >
              Bulk mask {selectedIds.length} resume{selectedIds.length === 1 ? '' : 's'} &amp; create links
            </Button>
          </>
        )
      }
    >
      {running ? (
        <div className="rounded-2xl border border-border bg-gray-100 p-1">
          <div className="rounded-xl border border-border bg-card">
            <AIStepper
              steps={MASK_STEPS}
              current={step}
              title={`Masking ${selectedIds.length} resume${selectedIds.length === 1 ? '' : 's'} for ${selectedRole?.title ?? 'role'}…`}
            />
          </div>
        </div>
      ) : completed ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-success/40 bg-success/[0.06] p-1">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl border border-success/40 bg-success/15 text-success">
                  <CircleCheck className="size-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {selectedIds.length} masked resumes &amp; shareable links ready for {selectedRole?.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Role packet URL: <span className="font-mono text-foreground">https://heroscouter.com/p/{roleId}</span> · 0 identifiers leaked
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" icon={<Copy />} onClick={copyPacketLinks}>
                Copy packet link
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-gray-100 p-1">
            <div className="px-3 py-2 text-xs font-semibold text-foreground">
              Generated Masked Links for {selectedRole?.company} ({selectedIds.length})
            </div>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {selectedIds.map((cid, i) => {
                const c = app.candidate(cid)
                if (!c) return null
                const chosen = getChosenResume(c)
                const alias = `${c.headline.split('·')[0].trim()} · ${c.years ?? 5} yrs · ${c.category}`
                const url = `https://heroscouter.com/m/${roleId}/${c.id}`
                return (
                  <div key={cid} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground tnum">#{i + 1}</span>
                      <Avatar initials={c.initials} size={28} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">{alias}</span>
                          <span className="rounded-sm border border-dashed border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Hidden: {c.name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 text-foreground">
                            <FileText className="size-3 text-muted-foreground" />
                            {chosen?.label ?? 'Primary'} resume v{chosen ? latestVersion(chosen) : 1}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{url}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Copy />}
                        onClick={() => {
                          navigator.clipboard?.writeText(url).catch(() => {})
                          app.toast(`Copied masked link for Candidate #${i + 1}`)
                        }}
                      >
                        Copy link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye />}
                        onClick={() => {
                          onClose()
                          navigate(`/resumes/masked-view?role=${roleId}&candidate=${c.id}`)
                        }}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Step 1: Role Selector + Output Settings */}
          <section className="rounded-2xl border border-border bg-gray-100 p-1">
            <div className="flex items-center gap-2 px-3 py-2">
              <Briefcase className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">1. Target Role &amp; Masking Preset</span>
              {selectedRole && (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CompanyTypeTag type={selectedRole.companyType} />
                  <span className="font-mono text-[11px] tnum">{selectedRole.minYears}+ yrs · {selectedRole.location.split(',')[0]}</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-3.5 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-1">
                <label className="eyebrow block text-[10px] text-gray-1000">Target Role</label>
                <Select
                  aria-label="Target role for bulk masking"
                  className="w-full"
                  value={roleId}
                  onChange={handleRoleChange}
                  options={openRoles.map(r => ({
                    value: r.id,
                    label: `${r.title} — ${r.company} (${r.companyType})`,
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="eyebrow block text-[10px] text-gray-1000">Masked Template</label>
                <Select
                  aria-label="Masked template"
                  className="w-full"
                  value={template}
                  onChange={v => setTemplate(v as typeof template)}
                  options={['C · Role-fit', 'A · Compact', 'B · Achievement-led']}
                />
              </div>
              <div className="space-y-1.5">
                <label className="eyebrow block text-[10px] text-gray-1000">Link &amp; Document Style</label>
                <Segmented
                  size="sm"
                  aria-label="Link style"
                  value={style}
                  onChange={setStyle}
                  options={[
                    { value: 'creative', label: <span className="inline-flex items-center gap-1"><Sparkles className="size-3" />Creative SaaS</span> },
                    { value: 'traditional', label: <span className="inline-flex items-center gap-1"><FileText className="size-3" />Traditional</span> },
                  ]}
                />
              </div>
            </div>
          </section>

          {/* Step 2: Candidate & Resume Selector */}
          <section className="rounded-2xl border border-border bg-gray-100 p-1">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <Users className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  2. Select Candidates &amp; Pick Resume per Candidate
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Segmented
                  size="sm"
                  value={poolFilter}
                  onChange={setPoolFilter}
                  options={[
                    { value: 'role-matches', label: 'Role matches' },
                    { value: 'shortlisted', label: 'Shortlisted' },
                    { value: 'all-pool', label: 'All pool' },
                  ]}
                />
                <div className="w-44">
                  <Input
                    aria-label="Search candidates to mask"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search candidate, skill…"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-3.5 py-2 text-[11px] text-muted-foreground">
                <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-foreground">
                  <Checkbox
                    aria-label="Select all visible candidates"
                    checked={candidateRows.length > 0 && candidateRows.every(r => selectedIds.includes(r.candidate.id))}
                    onChange={on => {
                      const visIds = candidateRows.map(r => r.candidate.id)
                      setSelectedIds(prev => (on ? Array.from(new Set([...prev, ...visIds])) : prev.filter(id => !visIds.includes(id))))
                    }}
                  />
                  <span>Select all ({candidateRows.length} shown)</span>
                </label>
                <span className="eyebrow text-[10px] text-gray-1000">Source resume to mask for this role</span>
              </div>

              <div className="no-scrollbar max-h-[320px] divide-y divide-border overflow-y-auto">
                {candidateRows.map(({ candidate: c, match: m }) => {
                  const checked = selectedIds.includes(c.id)
                  const resumes = app.resumesFor(c.id)
                  const chosen = getChosenResume(c)
                  const rec = m?.recommendation ?? (m?.band === 'Strong' ? 'Strong' : m?.band === 'Good' ? 'Mild' : undefined)

                  return (
                    <div
                      key={c.id}
                      className={cn(
                        'flex flex-col gap-2.5 px-3.5 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between',
                        checked ? 'bg-secondary/45' : 'hover:bg-secondary/25',
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <Checkbox
                          aria-label={`Select ${c.name}`}
                          checked={checked}
                          onChange={() => toggleCandidate(c.id)}
                        />
                        <Avatar initials={c.initials} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium text-foreground">{c.name}</span>
                            {m?.status === 'shortlisted' && (
                              <span className="inline-flex h-4 items-center gap-0.5 rounded-xs border border-emerald-500/40 bg-emerald-500/12 px-1.5 text-[10px] font-medium text-emerald-400">
                                <Check className="size-2.5" />Shortlisted
                              </span>
                            )}
                            {rec && <RecommendationPill recommendation={rec} />}
                            {resumes.length > 1 && (
                              <span className="inline-flex h-4 items-center gap-1 rounded-xs border border-border bg-secondary px-1.5 font-mono text-[10px] text-foreground">
                                <Layers className="size-2.5 text-muted-foreground" />{resumes.length} resumes
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {c.headline} · {c.years ?? '—'} yrs · {workAuthShort(c.workAuth) ?? 'Work auth unknown'}
                          </div>
                        </div>
                      </div>

                      {/* Per-candidate Resume Selector */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        {addingResumeFor === c.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              aria-label="New resume label"
                              value={newResumeLabel}
                              onChange={e => setNewResumeLabel(e.target.value)}
                              placeholder="e.g. Fintech / Growth"
                              className="h-7 w-36 text-xs"
                            />
                            <Button variant="primary" size="sm" onClick={() => handleQuickAddResume(c)}>Save</Button>
                            <Button variant="ghost" size="sm" onClick={() => setAddingResumeFor(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1">
                              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                              <select
                                aria-label={`Select resume for ${c.name}`}
                                value={chosen?.id ?? ''}
                                onChange={e => {
                                  const val = e.target.value
                                  setResumeChoiceByCand(prev => ({ ...prev, [c.id]: val }))
                                  if (!checked) toggleCandidate(c.id)
                                }}
                                className="bg-transparent text-xs font-medium text-foreground outline-none"
                              >
                                {resumes.map(r => (
                                  <option key={r.id} value={r.id} className="bg-card text-foreground">
                                    {r.label} resume · v{latestVersion(r)}{r.isPrimary ? ' (Primary)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Upload />}
                              title={`Add another resume version for ${c.name}`}
                              onClick={() => {
                                setAddingResumeFor(c.id)
                                setNewResumeLabel(selectedRole?.subcategory || 'Role-tailored')
                              }}
                            >
                              + Resume
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </Dialog>
  )
}
