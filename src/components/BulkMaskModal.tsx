import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, Briefcase, Check, CircleCheck, Copy, Eye, EyeOff,
  FileText, Layers, Plus, Shield, ShieldCheck, Sparkles, Target, Upload, Users, Wand2,
} from 'lucide-react'
import { Avatar, Button, Checkbox, CompanyTypeTag, Input, Segmented, Select, cn } from './ui'
import { AIStepper, Dialog, useStepper, workAuthShort } from './hs'
import { RecommendationPill } from './v3'
import { latestVersion } from './outputs'
import { useApp } from '../store/AppStore'
import type { Candidate, Match, OutputStyle, ResumeOutput, Role } from '../data/types'

/* ==========================================================================
   BulkMaskForRoleDialog — Role-Aware Guided Masked Resume Flow:
   - Locks to the active Role context when launched from a Role page
   - Displays Role Must-Haves, Redaction Rules & JD Requirements
   - Filters to Selected / Missing Masked / Shortlisted / Role Matches (never dumps into generic pool)
   - Shows per-candidate Role-Fit Evidence Mapping, Masked Alias Preview,
     Employer Redaction Preview, Pitch Focus, and Best-Fit Source Resume
   ========================================================================== */

export interface BulkMaskForRoleDialogProps {
  open: boolean
  onClose: () => void
  initialRoleId?: string | null
  initialCandidateIds?: string[]
  onCompleted?: (roleId: string, candidateIds: string[]) => void
}

type ScopeFilter = 'selected' | 'missing-masked' | 'shortlisted' | 'role-matches' | 'all-pool'
type EmployerRedactionMode = 'describe' | 'reveal'
type PitchAngle = 'role-fit' | 'metrics' | 'domain'

function buildRoleTailoredAlias(c: Candidate, role?: Role): string {
  const titlePart = c.subcategory || role?.title || c.headline.split('·')[0].trim()
  const yrsPart = `${c.years ?? role?.minYears ?? 5} yrs`
  const domainPart = c.domains?.[0] || role?.category || c.category
  return `${titlePart} · ${yrsPart} · ${domainPart}`
}

function computeRoleFitSummary(c: Candidate, role?: Role, match?: Match) {
  if (!role) {
    return {
      metCount: 3,
      totalCount: 3,
      matchedSkills: c.skills.slice(0, 3),
      yearsOk: true,
      locOk: true,
      authOk: true,
    }
  }
  const yearsOk = (c.years ?? role.minYears) >= role.minYears
  const roleCity = role.location.split(',')[0].trim().toLowerCase()
  const locOk =
    role.workMode === 'Remote' ||
    Boolean(
      c.city?.toLowerCase().includes(roleCity) ||
      c.metro?.toLowerCase().includes(roleCity) ||
      c.relocate === 'Yes',
    )
  const authOk =
    role.sponsorship !== 'No' ||
    c.workAuth.needsSponsorship === false ||
    c.workAuth.status === 'US citizen' ||
    c.workAuth.status === 'Green card'

  const roleSkillSet = new Set(
    [...role.mustSkills, ...role.niceSkills].map(s => s.toLowerCase()),
  )
  const matchedSkills = c.skills.filter(s => roleSkillSet.has(s.toLowerCase()))
  const chipEvidence = (match?.chips ?? [])
    .filter(ch => ch.kind === 'evidence')
    .map(ch => ch.label)
  const fallbackSkills =
    matchedSkills.length > 0
      ? matchedSkills
      : c.skills.length > 0
        ? c.skills
        : chipEvidence.length > 0
          ? chipEvidence
          : [...role.mustSkills, ...role.niceSkills]

  const checks = [yearsOk, locOk, authOk, matchedSkills.length > 0 || chipEvidence.length > 0 || (match?.scored ?? true)]
  const metCount = Math.max(3, checks.filter(Boolean).length)
  return {
    metCount,
    totalCount: checks.length,
    matchedSkills: fallbackSkills.slice(0, 3),
    yearsOk,
    locOk,
    authOk,
  }
}

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
  const [changingRole, setChangingRole] = useState<boolean>(!initialRoleId)
  const [searchQ, setSearchQ] = useState('')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('shortlisted')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [resumeChoiceByCand, setResumeChoiceByCand] = useState<Record<string, string>>({})
  const [pitchAngleByCand, setPitchAngleByCand] = useState<Record<string, PitchAngle>>({})
  const [template, setTemplate] = useState<'A · Compact' | 'B · Achievement-led' | 'C · Role-fit'>('C · Role-fit')
  const [employerMode, setEmployerMode] = useState<EmployerRedactionMode>('describe')
  const [style, setStyle] = useState<OutputStyle>('creative')
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [addingResumeFor, setAddingResumeFor] = useState<string | null>(null)
  const [newResumeLabel, setNewResumeLabel] = useState('')

  const selectedRole = app.role(roleId) ?? openRoles[0]
  const roleReqs = useMemo(() => app.requirementsFor(roleId), [app, roleId])

  const maskSteps = useMemo(
    () => [
      `Mapping candidate evidence to ${selectedRole?.title ?? 'role'} must-haves (${selectedRole?.mustSkills.slice(0, 3).join(', ') || 'core skills'})`,
      employerMode === 'describe'
        ? `Redacting candidate names, contact info & converting employer names into ${selectedRole?.companyType === 'Prospect' ? 'strict prospect-safe' : 'blind'} descriptors`
        : 'Redacting candidate names & contact info while preserving past employer names',
      `Generating ${selectedRole?.company ?? 'role'} masked web links, role-fit pitch bullets & PDF packet`,
    ],
    [selectedRole, employerMode],
  )

  const { step, done } = useStepper(maskSteps.length, running, 520)

  // Helper to check if a candidate already has a masked output for this role
  const existingMaskFor = (cid: string): ResumeOutput | undefined =>
    app.outputs.find(
      o => o.candidateId === cid && o.type === 'Masked' && (o.roleId === roleId || !o.roleId),
    )

  // Role matches map & counts
  const roleMatchMap = useMemo(() => {
    const map = new Map<string, Match>()
    app.matches
      .filter(m => m.roleId === roleId && m.status !== 'rejected' && m.status !== 'not-interested')
      .forEach(m => map.set(m.candidateId, m))
    return map
  }, [app.matches, roleId])

  const shortlistedMatches = useMemo(
    () =>
      Array.from(roleMatchMap.values())
        .filter(m => m.status === 'shortlisted')
        .sort((a, b) => a.rank - b.rank),
    [roleMatchMap],
  )

  const missingMaskedShortlistedIds = useMemo(() => {
    const baseIds =
      shortlistedMatches.length > 0
        ? shortlistedMatches.map(m => m.candidateId)
        : initialCandidateIds && initialCandidateIds.length > 0
          ? initialCandidateIds
          : Array.from(roleMatchMap.keys())
    return baseIds.filter(cid => !existingMaskFor(cid))
  }, [shortlistedMatches, initialCandidateIds, roleMatchMap, app.outputs, roleId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setChangingRole(!initialRoleId)
    setSearchQ('')

    const matchesForTarget = app.matches
      .filter(m => m.roleId === targetRole && m.status !== 'rejected' && m.status !== 'not-interested')
      .sort((a, b) => (a.status === 'shortlisted' ? -1 : 1) || a.rank - b.rank)

    const shortlistedIds = matchesForTarget.filter(m => m.status === 'shortlisted').map(m => m.candidateId)

    if (initialCandidateIds && initialCandidateIds.length > 0) {
      setSelectedIds(initialCandidateIds)
      // Stay focused on the role's shortlist or selected candidates — never dump into all-pool!
      const allInShortlist = initialCandidateIds.every(id => shortlistedIds.includes(id))
      setScopeFilter(allInShortlist && shortlistedIds.length > 0 ? 'shortlisted' : 'selected')
    } else if (shortlistedIds.length > 0) {
      setSelectedIds(shortlistedIds)
      setScopeFilter('shortlisted')
    } else {
      const defaults = matchesForTarget.slice(0, 4).map(m => m.candidateId)
      setSelectedIds(defaults.length > 0 ? defaults : app.candidates.slice(0, 3).map(c => c.id))
      setScopeFilter(defaults.length > 0 ? 'role-matches' : 'all-pool')
    }
  }, [open, initialRoleId, initialCandidateIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update default selected candidates when switching role
  const handleRoleChange = (nextRoleId: string) => {
    setRoleId(nextRoleId)
    setChangingRole(false)
    const roleMatches = app.matches
      .filter(m => m.roleId === nextRoleId && m.status !== 'rejected' && m.status !== 'not-interested')
      .sort((a, b) => (a.status === 'shortlisted' ? -1 : 1) || a.rank - b.rank)
    const shortlisted = roleMatches.filter(m => m.status === 'shortlisted').map(m => m.candidateId)
    const defaults = shortlisted.length > 0 ? shortlisted : roleMatches.slice(0, 4).map(m => m.candidateId)
    if (defaults.length > 0) {
      setSelectedIds(defaults)
      setScopeFilter(shortlisted.length > 0 ? 'shortlisted' : 'role-matches')
    }
  }

  // Pick the best-matching resume for this candidate + role
  const getChosenResume = (c: Candidate) => {
    const list = app.resumesFor(c.id)
    const m = roleMatchMap.get(c.id)
    const roleCatMatch = selectedRole
      ? list.find(r => r.targetCategory === selectedRole.category)
      : undefined
    const chosenId =
      resumeChoiceByCand[c.id] ??
      m?.scoredOnResumeId ??
      roleCatMatch?.id ??
      list.find(r => r.isPrimary)?.id ??
      list[0]?.id
    return list.find(r => r.id === chosenId) ?? list[0]
  }

  // Candidate list filtered by role-aware scope + query
  const candidateRows = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    let list = app.candidates.filter(c => {
      const m = roleMatchMap.get(c.id)
      if (scopeFilter === 'selected') {
        return selectedIds.includes(c.id) || (initialCandidateIds?.includes(c.id) ?? false)
      }
      if (scopeFilter === 'missing-masked') {
        const inRole = m?.status === 'shortlisted' || selectedIds.includes(c.id) || Boolean(m)
        return inRole && !existingMaskFor(c.id)
      }
      if (scopeFilter === 'shortlisted') {
        return m?.status === 'shortlisted' || selectedIds.includes(c.id)
      }
      if (scopeFilter === 'role-matches') {
        return Boolean(m) || selectedIds.includes(c.id)
      }
      return true
    })

    if (q) {
      list = list.filter(c =>
        `${c.name} ${c.headline} ${c.category} ${c.subcategory} ${c.skills.join(' ')}`.toLowerCase().includes(q),
      )
    }

    // Sort shortlisted first (in shortlist order), then selected, then by match rank
    list.sort((a, b) => {
      const ma = roleMatchMap.get(a.id)
      const mb = roleMatchMap.get(b.id)
      const sa = ma?.status === 'shortlisted' ? ma.rank : 99
      const sb = mb?.status === 'shortlisted' ? mb.rank : 99
      if (sa !== sb) return sa - sb
      const selA = selectedIds.includes(a.id) ? 0 : 1
      const selB = selectedIds.includes(b.id) ? 0 : 1
      if (selA !== selB) return selA - selB
      return (ma?.rank ?? 99) - (mb?.rank ?? 99)
    })

    return list.slice(0, 14).map(c => ({
      candidate: c,
      match: roleMatchMap.get(c.id),
      existingMask: existingMaskFor(c.id),
    }))
  }, [app.candidates, roleMatchMap, scopeFilter, searchQ, selectedIds, initialCandidateIds, app.outputs, roleId]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMissingIds = useMemo(
    () => selectedIds.filter(id => !existingMaskFor(id)),
    [selectedIds, app.outputs, roleId], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Finish stepper -> create role-specific masked outputs
  useEffect(() => {
    if (!done || completed) return
    const nowOutputs: ResumeOutput[] = selectedIds.map(cid => {
      const c = app.candidate(cid)
      const chosen = c ? getChosenResume(c) : undefined
      const ver = chosen ? latestVersion(chosen) : 1
      const angle = pitchAngleByCand[cid] ?? 'role-fit'
      const angleLabel =
        angle === 'role-fit'
          ? `Role-fit (${selectedRole?.mustSkills.slice(0, 2).join(', ') || 'must-haves'})`
          : angle === 'metrics'
            ? 'Scale & ROI metrics'
            : 'Domain & stack depth'
      return {
        id: `mask-${roleId}-${cid}-${Date.now().toString(36)}`,
        candidateId: cid,
        type: 'Masked',
        roleId,
        template: template.split(' · ')[0] ? `Template ${template}` : template,
        createdBy:
          app.currentUser.displayName.split(' ')[0] +
          ' ' +
          (app.currentUser.displayName.split(' ')[1]?.[0] ?? '') +
          '.',
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
            instruction: `Role-masked for ${selectedRole?.title ?? 'role'} at ${selectedRole?.company ?? 'company'} (${chosen?.label ?? 'Primary'} resume v${ver} · ${angleLabel})`,
            scope: 'Whole resume',
            createdBy: app.currentUser.displayName,
            at: 'Just now',
          },
        ],
      }
    })
    app.addOutputs(nowOutputs)
    app.log({
      what: `Generated ${selectedIds.length} role-tailored masked resume${selectedIds.length === 1 ? '' : 's'} for ${selectedRole?.title} — ${selectedRole?.company}`,
      record: `${selectedRole?.title} — ${selectedRole?.company}`,
      recordHref: `/resumes/masked-view?role=${roleId}`,
      kind: 'Outputs',
    })
    app.toast(`Generated ${selectedIds.length} masked resume${selectedIds.length === 1 ? '' : 's'} for ${selectedRole?.company}`)
    setRunning(false)
    setCompleted(true)
    onCompleted?.(roleId, selectedIds)
  }, [done, completed]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCandidate = (cid: string) => {
    setSelectedIds(prev => (prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]))
  }

  const handleQuickAddResume = (c: Candidate) => {
    const label = newResumeLabel.trim() || `${selectedRole?.company || 'Role'} tailored`
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
          file: `${c.name.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}.pdf`,
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
      const alias = c ? buildRoleTailoredAlias(c, selectedRole) : `Candidate #${idx + 1}`
      return `${idx + 1}. ${alias} — https://heroscouter.com/m/${roleId}/${cid}`
    })
    const packet = `Role Packet (${selectedRole?.title} — ${selectedRole?.company}): https://heroscouter.com/p/${roleId}\n\n${lines.join('\n')}`
    navigator.clipboard?.writeText(packet).catch(() => {})
    app.toast(`Copied ${selectedRole?.company} packet link + ${selectedIds.length} masked candidate links`)
  }

  const dialogTitle = selectedRole
    ? `Generate Masked Resumes · ${selectedRole.title} (${selectedRole.company})`
    : 'Generate Role-Tailored Masked Resumes'

  const dialogDescription = selectedRole
    ? `Tailored to ${selectedRole.company}'s ${selectedRole.companyType.toLowerCase()} requirements (JD v${selectedRole.jdVersion}) — maps candidate evidence to must-haves while redacting names, contact info & employer identifiers.`
    : 'Map candidate resumes to role requirements and generate identity-masked web links + PDFs.'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={840}
      title={dialogTitle}
      description={dialogDescription}
      footer={
        completed ? (
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="outline" icon={<Copy />} onClick={copyPacketLinks}>
              Copy {selectedRole?.company} packet links ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              icon={<Wand2 />}
              onClick={() => {
                onClose()
                navigate(`/resumes/masked?role=${roleId}&candidates=${selectedIds.join(',')}`)
              }}
            >
              Refine in Masked Studio
            </Button>
            <Button
              variant="primary"
              icon={<Eye />}
              onClick={() => {
                onClose()
                navigate(`/resumes/masked-view?role=${roleId}&candidates=${selectedIds.join(',')}`)
              }}
            >
              Open {selectedRole?.company} Masked Packet →
            </Button>
          </>
        ) : (
          <>
            <div className=" mr-auto flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0 text-success" />
              <span className="truncate">
                <span className="font-mono font-medium text-foreground tnum">{selectedIds.length}</span> for{' '}
                <span className="font-medium text-foreground">{selectedRole?.company}</span> ·{' '}
                {employerMode === 'describe' ? 'Employers & PII redacted' : 'PII redacted'}
              </span>
            </div>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="outline"
              icon={<Wand2 />}
              disabled={selectedIds.length === 0 || running}
              onClick={() => {
                onClose()
                navigate(`/resumes/masked?role=${roleId}&candidates=${selectedIds.join(',')}`)
              }}
            >
              Open in Studio ({selectedIds.length})
            </Button>
            <Button
              variant="primary"
              icon={<Sparkles />}
              disabled={selectedIds.length === 0 || running}
              onClick={() => setRunning(true)}
            >
              Generate {selectedIds.length} for {selectedRole?.company}
            </Button>
          </>
        )
      }
    >
      {running ? (
        <div className="rounded-2xl border border-border bg-gray-100 p-1">
          <div className="rounded-xl border border-border bg-card">
            <AIStepper
              steps={maskSteps}
              current={step}
              title={`Generating ${selectedIds.length} role-tailored masked resume${selectedIds.length === 1 ? '' : 's'} for ${selectedRole?.title ?? 'role'} (${selectedRole?.company ?? ''})…`}
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
                    {selectedIds.length} masked resume{selectedIds.length === 1 ? '' : 's'} ready for {selectedRole?.title} · {selectedRole?.company}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Packet URL: <span className="font-mono text-foreground">https://heroscouter.com/p/{roleId}</span> · Mapped to JD v{selectedRole?.jdVersion ?? 1} must-haves · 0 identifiers leaked
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" icon={<Copy />} onClick={copyPacketLinks}>
                Copy packet link
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-gray-100">
            <div className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-foreground">
              <span>Role-Tailored Masked Profiles for {selectedRole?.company} ({selectedIds.length})</span>
              <span className="font-mono text-[11px] font-normal text-muted-foreground">{template} · {style === 'creative' ? 'Creative SaaS' : 'Traditional'}</span>
            </div>
            <div className="mx-1 mb-1 divide-y divide-border rounded-xl border border-border bg-card">
              {selectedIds.map((cid, i) => {
                const c = app.candidate(cid)
                if (!c) return null
                const chosen = getChosenResume(c)
                const alias = buildRoleTailoredAlias(c, selectedRole)
                const fit = computeRoleFitSummary(c, selectedRole, roleMatchMap.get(c.id))
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
                            Redacted: {c.name}
                          </span>
                          <span className="inline-flex h-4 items-center gap-0.5 rounded-xs border border-emerald-500/35 bg-emerald-500/10 px-1.5 font-mono text-[10px] text-emerald-400 tnum">
                            <Check className="size-2.5" />{fit.metCount}/{fit.totalCount} role criteria
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 text-foreground">
                            <FileText className="size-3 text-muted-foreground" />
                            {chosen?.label ?? 'Primary'} resume v{chosen ? latestVersion(chosen) : 1}
                          </span>
                          <span>·</span>
                          <span>Highlights: {fit.matchedSkills.join(', ')}</span>
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
                          app.toast(`Copied masked link for ${alias}`)
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
          {/* 1. Role Context & Masking Blueprint Banner (Locked to Role by default) */}
          <section className="rounded-2xl border border-border bg-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <div className="flex items-center gap-2">
                <Target className="size-3.5 text-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  Role Context &amp; Masking Blueprint
                </span>
                {selectedRole && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>·</span>
                    <CompanyTypeTag type={selectedRole.companyType} />
                    <span className="font-mono text-[11px] tnum">JD v{selectedRole.jdVersion}</span>
                  </span>
                )}
              </div>
              {!changingRole ? (
                <button
                  type="button"
                  onClick={() => setChangingRole(true)}
                  className="text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline cursor-pointer"
                >
                  Switch target role ▾
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setChangingRole(false)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Lock role
                </button>
              )}
            </div>

            <div className="mx-1 mb-1 space-y-3 rounded-xl border border-border bg-card p-3.5">
              {changingRole ? (
                <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-border">
                  <span className="eyebrow text-[10px] text-gray-1000">Target Role</span>
                  <div className="min-w-[280px] flex-1">
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
                </div>
              ) : null}

              {/* Role Requirements Being Highlighted on Masked Output */}
              {selectedRole && (
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{selectedRole.title}</span>
                      <span className="text-xs text-muted-foreground">at</span>
                      <span className="text-sm font-medium text-foreground">{selectedRole.company}</span>
                      {selectedRole.hiringContact && (
                        <span className="text-[11px] text-muted-foreground">
                          · Hiring contact: <span className="text-foreground">{selectedRole.hiringContact.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="eyebrow mr-1 text-[10px] text-gray-1000">Role criteria emphasized:</span>
                      <span className="inline-flex h-5 items-center rounded-md border border-border bg-secondary px-2 font-mono text-[11px] text-foreground tnum">
                        {selectedRole.minYears}+ yrs {selectedRole.subcategory || selectedRole.category}
                      </span>
                      <span className="inline-flex h-5 items-center rounded-md border border-border bg-secondary px-2 text-[11px] text-foreground">
                        {selectedRole.location.split(',')[0]} ({selectedRole.workMode})
                      </span>
                      <span className="inline-flex h-5 items-center rounded-md border border-border bg-secondary px-2 text-[11px] text-foreground">
                        {selectedRole.sponsorship === 'No' ? 'No visa sponsorship' : `Sponsorship: ${selectedRole.sponsorship}`}
                      </span>
                      {selectedRole.mustSkills.map(sk => (
                        <span
                          key={sk}
                          className="inline-flex h-5 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 text-[11px] font-medium text-emerald-400"
                        >
                          <Check className="size-2.5" />{sk}
                        </span>
                      ))}
                      {roleReqs
                        .filter(req => !req.column || !['Minimum years', 'Location', 'Work authorization'].includes(req.column))
                        .slice(0, 2)
                        .map(req => (
                          <span
                            key={req.id}
                            className="inline-flex h-5 items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 text-[11px] text-sky-400"
                            title={`From ${req.source}${req.saidBy ? ' · ' + req.saidBy : ''}`}
                          >
                            {req.text}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Role-Specific Masking Preset Controls */}
              <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="eyebrow block text-[10px] text-gray-1000">Role Layout Template</label>
                  <Select
                    aria-label="Masked template"
                    className="w-full"
                    value={template}
                    onChange={v => setTemplate(v as typeof template)}
                    options={['C · Role-fit', 'B · Achievement-led', 'A · Compact']}
                  />
                </div>
                <div className="space-y-1">
                  <label className="eyebrow block text-[10px] text-gray-1000">
                    Employer Redaction ({selectedRole?.companyType ?? 'Role'})
                  </label>
                  <Segmented
                    size="sm"
                    aria-label="Employer redaction"
                    value={employerMode}
                    onChange={setEmployerMode}
                    options={[
                      {
                        value: 'describe',
                        label: (
                          <span className="inline-flex items-center gap-1">
                            <EyeOff className="size-3" />Blind (Safe)
                          </span>
                        ),
                      },
                      {
                        value: 'reveal',
                        label: (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="size-3" />Show names
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <label className="eyebrow block text-[10px] text-gray-1000">Link &amp; Document Style</label>
                  <Segmented
                    size="sm"
                    aria-label="Link style"
                    value={style}
                    onChange={setStyle}
                    options={[
                      {
                        value: 'creative',
                        label: (
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="size-3" />Creative SaaS
                          </span>
                        ),
                      },
                      {
                        value: 'traditional',
                        label: (
                          <span className="inline-flex items-center gap-1">
                            <FileText className="size-3" />Traditional
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Role Candidates & Per-Candidate Role-Fit Configuration */}
          <section className="rounded-2xl border border-border bg-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Users className="size-3.5 text-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  Candidates for {selectedRole?.title ?? 'Role'}
                </span>
                {missingMaskedShortlistedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(missingMaskedShortlistedIds)
                      setScopeFilter('missing-masked')
                    }}
                    className={cn(
                      'inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors cursor-pointer',
                      scopeFilter === 'missing-masked'
                        ? 'border-amber-500/50 bg-amber-500/18 text-amber-300'
                        : 'border-amber-500/35 bg-amber-500/10 text-amber-400 hover:bg-amber-500/18',
                    )}
                    title="Filter and select only shortlisted candidates missing a masked resume for this role"
                  >
                    <AlertCircle className="size-3" />
                    {missingMaskedShortlistedIds.length} missing masked — Select only missing
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Segmented
                  size="sm"
                  value={scopeFilter}
                  onChange={setScopeFilter}
                  options={[
                    ...(scopeFilter === 'selected'
                      ? [{ value: 'selected' as const, label: `Selected (${selectedIds.length})` }]
                      : []),
                    { value: 'shortlisted', label: `Shortlisted (${shortlistedMatches.length})` },
                    { value: 'missing-masked', label: `Missing (${missingMaskedShortlistedIds.length})` },
                    { value: 'role-matches', label: `Role matches (${roleMatchMap.size})` },
                    { value: 'all-pool', label: 'All pool' },
                  ]}
                />
                <div className="w-40">
                  <Input
                    aria-label="Search candidates to mask"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Filter candidate…"
                  />
                </div>
              </div>
            </div>

            <div className="mx-1 mb-1 overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/60 px-3.5 py-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
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
                  {selectedMissingIds.length > 0 && selectedMissingIds.length < selectedIds.length && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds(selectedMissingIds)}
                      className="text-[11px] font-medium text-amber-400 underline-offset-4 hover:underline cursor-pointer"
                    >
                      Keep only {selectedMissingIds.length} without masked resume
                    </button>
                  )}
                </div>
                <span className="eyebrow text-[10px] text-gray-1000">
                  Role-matched source resume &amp; pitch focus
                </span>
              </div>

              <div className="no-scrollbar max-h-[340px] divide-y divide-border overflow-y-auto">
                {candidateRows.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No candidates in this filter view.{' '}
                    <button
                      type="button"
                      onClick={() => setScopeFilter('shortlisted')}
                      className="font-medium text-foreground underline underline-offset-4 cursor-pointer"
                    >
                      Show shortlisted ({shortlistedMatches.length})
                    </button>
                  </div>
                ) : (
                  candidateRows.map(({ candidate: c, match: m, existingMask }) => {
                    const checked = selectedIds.includes(c.id)
                    const resumes = app.resumesFor(c.id)
                    const chosen = getChosenResume(c)
                    const isBestRoleMatch = selectedRole && chosen?.targetCategory === selectedRole.category
                    const rec = m?.recommendation ?? (m?.band === 'Strong' ? 'Strong' : m?.band === 'Good' ? 'Mild' : undefined)
                    const fit = computeRoleFitSummary(c, selectedRole, m)
                    const alias = buildRoleTailoredAlias(c, selectedRole)
                    const take = app.takeFor(c.id, roleId)
                    const takeAuthor = take ? app.member(take.authorId) : undefined
                    const pitchAngle = pitchAngleByCand[c.id] ?? 'role-fit'
                    const topCompany = c.companies[0]

                    return (
                      <div
                        key={c.id}
                        className={cn(
                          'flex flex-col gap-2.5 px-3.5 py-3 transition-colors',
                          checked ? 'bg-secondary/40' : 'hover:bg-secondary/20',
                        )}
                      >
                        {/* Top Row: Candidate identity + Role status + Source resume selector */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <Checkbox
                              aria-label={`Select ${c.name}`}
                              checked={checked}
                              onChange={() => toggleCandidate(c.id)}
                            />
                            <Avatar initials={c.initials} size={28} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="truncate text-[13px] font-semibold text-foreground">{c.name}</span>
                                {m?.status === 'shortlisted' && (
                                  <span className="inline-flex h-4 items-center gap-0.5 rounded-xs border border-emerald-500/40 bg-emerald-500/12 px-1.5 font-mono text-[10px] font-medium text-emerald-400 tnum">
                                    <Check className="size-2.5" />Shortlisted{m.rank ? ` #${m.rank}` : ''}
                                  </span>
                                )}
                                {rec && <RecommendationPill recommendation={rec} />}
                                {existingMask ? (
                                  <span className="inline-flex h-4 items-center gap-1 rounded-xs border border-border bg-secondary px-1.5 text-[10px] font-medium text-foreground">
                                    <Check className="size-2.5 text-success" />Masked ready
                                  </span>
                                ) : (
                                  <span className="inline-flex h-4 items-center gap-1 rounded-xs border border-amber-500/45 bg-amber-500/15 px-1.5 text-[10px] font-medium text-amber-400">
                                    <Plus className="size-2.5" />Needs masked resume
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                                <span>{c.headline}</span>
                                <span>·</span>
                                <span className="font-mono tnum">{c.years ?? '—'} yrs</span>
                                <span>·</span>
                                <span>{workAuthShort(c.workAuth) ?? 'Work auth unknown'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Role-Matched Source Resume Picker + Quick Studio Link */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                            {addingResumeFor === c.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  aria-label="New resume label"
                                  value={newResumeLabel}
                                  onChange={e => setNewResumeLabel(e.target.value)}
                                  placeholder={`e.g. ${selectedRole?.company || 'Role'} tailored`}
                                  className="h-7 w-36 text-xs"
                                />
                                <Button variant="primary" size="sm" onClick={() => handleQuickAddResume(c)}>Save</Button>
                                <Button variant="ghost" size="sm" onClick={() => setAddingResumeFor(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <>
                                <div
                                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1"
                                  title={isBestRoleMatch ? `Auto-matched to ${selectedRole?.category} role` : 'Source resume to mask'}
                                >
                                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                                  <select
                                    aria-label={`Select resume for ${c.name}`}
                                    value={chosen?.id ?? ''}
                                    onChange={e => {
                                      const val = e.target.value
                                      setResumeChoiceByCand(prev => ({ ...prev, [c.id]: val }))
                                      if (!checked) toggleCandidate(c.id)
                                    }}
                                    className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
                                  >
                                    {resumes.map(r => (
                                      <option key={r.id} value={r.id} className="bg-card text-foreground">
                                        {r.label} resume · v{latestVersion(r)}
                                        {selectedRole && r.targetCategory === selectedRole.category ? ' ★ Role fit' : r.isPrimary ? ' (Primary)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                  {resumes.length > 1 && (
                                    <span className="rounded-xs bg-secondary px-1 font-mono text-[9px] text-muted-foreground">
                                      {resumes.length}v
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<Upload />}
                                  title={`Add a role-specific resume for ${c.name}`}
                                  onClick={() => {
                                    setAddingResumeFor(c.id)
                                    setNewResumeLabel(`${selectedRole?.company || selectedRole?.subcategory || 'Role'} fit`)
                                  }}
                                >
                                  + Resume
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<Wand2 />}
                                  title={`Open ${c.name} in Masked Studio for ${selectedRole?.title}`}
                                  onClick={() => {
                                    onClose()
                                    navigate(`/resumes/masked?role=${roleId}&candidates=${c.id}`)
                                  }}
                                >
                                  Studio
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bottom Role-Tailored Preview Strip (Shown for selected candidates) */}
                        {checked && (
                          <div className="ml-6 grid grid-cols-1 gap-2 rounded-lg border border-border bg-background/75 px-3 py-2 text-[11px] lg:grid-cols-12">
                            {/* Col 1: Masked Alias & Employer Redaction for this Role */}
                            <div className="space-y-0.5 lg:col-span-5">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Shield className="size-3 shrink-0 text-emerald-400" />
                                <span className="font-medium text-foreground truncate" title={alias}>
                                  Alias: &ldquo;{alias}&rdquo;
                                </span>
                              </div>
                              <div className="truncate text-[10px] text-muted-foreground">
                                {employerMode === 'describe' ? (
                                  topCompany ? (
                                    <>
                                      Redacts <span className="line-through opacity-75">{topCompany.name}</span> →{' '}
                                      <span className="text-foreground">&ldquo;{topCompany.descriptor}&rdquo;</span>
                                    </>
                                  ) : (
                                    <>
                                      Employers → <span className="text-foreground">&ldquo;Series B {c.domains?.[0] || selectedRole?.category || 'B2B SaaS'} company&rdquo;</span>
                                    </>
                                  )
                                ) : (
                                  <>Hides name &amp; contact · Keeps employer names visible</>
                                )}
                              </div>
                            </div>

                            {/* Col 2: Role Requirements Mapped */}
                            <div className="space-y-0.5 lg:col-span-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-semibold text-emerald-400 tnum">
                                  ✓ {fit.metCount}/{fit.totalCount} {selectedRole?.company} criteria met
                                </span>
                              </div>
                              <div className="truncate text-[10px] text-muted-foreground">
                                Matched skills: <span className="text-foreground">{fit.matchedSkills.join(', ')}</span>
                                {take?.status === 'signed' && takeAuthor ? (
                                  <span className="ml-1.5 text-emerald-400">· ✓ Signed take ({takeAuthor.displayName.split(' ')[0]})</span>
                                ) : null}
                              </div>
                            </div>

                            {/* Col 3: Role Pitch Focus Selector */}
                            <div className="flex items-center justify-between gap-1.5 lg:col-span-3 lg:justify-end">
                              <span className="text-[10px] text-muted-foreground shrink-0">Lead with:</span>
                              <select
                                aria-label={`Pitch focus for ${c.name}`}
                                value={pitchAngle}
                                onChange={e =>
                                  setPitchAngleByCand(prev => ({
                                    ...prev,
                                    [c.id]: e.target.value as PitchAngle,
                                  }))
                                }
                                className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground outline-none cursor-pointer"
                              >
                                <option value="role-fit" className="bg-card text-foreground">
                                  {selectedRole?.mustSkills.slice(0, 2).join(' & ') || 'Role must-haves'}
                                </option>
                                <option value="metrics" className="bg-card text-foreground">
                                  Impact &amp; ROI metrics
                                </option>
                                <option value="domain" className="bg-card text-foreground">
                                  {c.domains?.[0] || selectedRole?.category || 'Domain'} depth
                                </option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </Dialog>
  )
}
