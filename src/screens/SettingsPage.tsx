import { useEffect, useState } from 'react'
import {
  Sparkles, Sliders, FileText, Users, Plus, Trash2, ArrowRight, ShieldCheck, Check, Info,
} from 'lucide-react'
import { useTopBar } from '../shell/AppShell'
import {
  Avatar, BezelCard, Button, Checkbox, ExampleMark, Field, Input, PageHeader, PillTabs, Select, Switch, Tag, cn,
} from '../components/ui'
import { Dialog, InfoNote } from '../components/hs'
import { useApp, useWireframeState } from '../store/AppStore'
import { CATEGORIES, SUBCATEGORIES, type Category } from '../data/types'
import { team as initialTeam } from '../data/mock'

/* ==========================================================================
   S-13 · Settings (admin) — Rightfit /job-preferences layout
   Tabs: Skill list · Matching · Templates · Team + sticky bottom Save bar
   ========================================================================== */

type SettingsTab = 'skills' | 'matching' | 'templates' | 'team'

interface AdjacencyRule {
  id: string
  category: Category
  sourceSkills: string[]
  predictedSkill: string
  strength: 'High' | 'Medium'
}

const INITIAL_SKILLS: Record<Category, Record<string, string[]>> = {
  Engineering: {
    'Full-stack': ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'GraphQL', 'Next.js', 'REST APIs'],
    Frontend: ['React', 'TypeScript', 'Design systems', 'CSS / Tailwind', 'Next.js', 'Accessibility'],
    Backend: ['Go', 'Kafka', 'PostgreSQL', 'Distributed systems', 'Python', 'gRPC'],
    Mobile: ['Swift', 'iOS', 'Kotlin', 'React Native'],
    DevOps: ['Kubernetes', 'AWS', 'Terraform', 'Docker', 'Datadog'],
  },
  Product: {
    'Product Manager': ['Payments', 'Roadmapping', 'B2B SaaS', 'Pricing', 'SQL', 'API products', 'Marketplaces'],
    'Technical PM': ['Payments', 'API products', 'SQL', 'Platform architecture', 'Developer experience'],
    'Growth PM': ['Experimentation', 'Activation', 'PLG', 'SQL', 'Pricing'],
  },
  Marketing: {
    'Growth marketing': ['LinkedIn Ads', 'Meta Ads', 'Google Ads', 'B2B demand gen', 'Attribution', 'Landing page testing'],
    Lifecycle: ['Lifecycle email', 'Braze', 'HubSpot', 'Customer segmentation', 'Onboarding flows'],
    Content: ['Technical writing', 'SEO content', 'Case studies', 'Editorial calendar'],
    'Product marketing': ['Developer marketing', 'Positioning', 'Launches', 'Competitive intel', 'Sales enablement'],
    Performance: ['LinkedIn Ads', 'Google Ads', 'Meta Ads', 'ROAS modeling', 'GA4'],
  },
  Design: {
    'Product design': ['Figma', 'B2B workflows', 'Design systems', 'Prototyping', 'User flows'],
    Brand: ['Visual identity', 'Marketing site design', 'Illustration'],
    'UX research': ['Usability testing', 'Customer interviews', 'Survey design'],
  },
  Data: {
    'Data science': ['Experimentation', 'Python', 'SQL', 'Causal inference', 'Forecasting'],
    Analytics: ['SQL', 'dbt', 'Snowflake', 'Looker', 'Amplitude'],
    'Data engineering': ['Spark', 'Airflow', 'Snowflake', 'Kafka', 'Python'],
  },
  Sales: {
    'Account executive': ['Mid-market SaaS', 'Enterprise discovery', 'MEDDIC', 'Multi-threading'],
    SDR: ['Outbound prospecting', 'Cold email', 'Sequence testing'],
    'Sales ops': ['Salesforce', 'Territory planning', 'Pipeline forecasting'],
  },
  Ops: {
    BizOps: ['SQL', 'Financial modeling', 'Cross-functional ops', 'Vendor management'],
    'People ops': ['Technical recruiting', 'Onboarding', 'Comp benchmarking'],
    'Customer success': ['Enterprise onboarding', 'QBRs', 'Net dollar retention'],
  },
}

const INITIAL_ADJACENCIES: AdjacencyRule[] = [
  { id: 'adj-1', category: 'Marketing', sourceSkills: ['Meta Ads', 'Google Ads'], predictedSkill: 'LinkedIn Ads', strength: 'High' },
  { id: 'adj-2', category: 'Product', sourceSkills: ['Looker', 'Amplitude'], predictedSkill: 'SQL', strength: 'Medium' },
  { id: 'adj-3', category: 'Product', sourceSkills: ['Checkout flows', 'Seller billing'], predictedSkill: 'Payments', strength: 'Medium' },
  { id: 'adj-4', category: 'Engineering', sourceSkills: ['React', 'Vercel deployments'], predictedSkill: 'Next.js', strength: 'High' },
  { id: 'adj-5', category: 'Engineering', sourceSkills: ['Next.js API routes'], predictedSkill: 'Node.js', strength: 'Medium' },
  { id: 'adj-6', category: 'Engineering', sourceSkills: ['Vue', 'TypeScript'], predictedSkill: 'React', strength: 'Medium' },
]

export function SettingsPage() {
  const { showScore, setShowScore, toast, log } = useApp()
  const [wfState, setWfState] = useWireframeState(
    'S-13',
    'Settings',
    [
      { id: 'skills', label: 'Skill list & adjacency' },
      { id: 'matching', label: 'Matching rules' },
      { id: 'templates', label: 'Resume templates' },
      { id: 'team', label: 'Team access' },
    ],
    'skills',
  )

  const tab = (['skills', 'matching', 'templates', 'team'].includes(wfState) ? wfState : 'skills') as SettingsTab
  const setTab = (t: SettingsTab) => setWfState(t)

  useTopBar([{ label: 'Settings' }], <span className="eyebrow rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-gray-1000">Admin</span>, [tab])

  // --- Tab 1: Skill list & Adjacency ---
  const [selectedCategory, setSelectedCategory] = useState<Category>('Marketing')
  const [skillsByCat, setSkillsByCat] = useState(INITIAL_SKILLS)
  const [newSkillSub, setNewSkillSub] = useState<string>(SUBCATEGORIES.Marketing[0])
  const [newSkillName, setNewSkillName] = useState('')
  const [adjacencies, setAdjacencies] = useState<AdjacencyRule[]>(INITIAL_ADJACENCIES)
  const [addAdjOpen, setAddAdjOpen] = useState(false)
  const [adjFrom, setAdjFrom] = useState('')
  const [adjTo, setAdjTo] = useState('')
  const [adjStrength, setAdjStrength] = useState<'High' | 'Medium'>('High')

  useEffect(() => {
    setNewSkillSub(SUBCATEGORIES[selectedCategory][0])
  }, [selectedCategory])

  // --- Tab 2: Matching ---
  const [mustHaveFields, setMustHaveFields] = useState({
    minYears: true,
    locationMode: true,
    categorySub: true,
    workAuth: true,
    mustSkills: true,
  })
  const [defaultTopN, setDefaultTopN] = useState('5')

  // --- Tab 3: Templates ---
  const [defaultMaskedTpl, setDefaultMaskedTpl] = useState<'A' | 'B' | 'C'>('A')
  const [tailoredStyle, setTailoredStyle] = useState('Classic single-column')

  // --- Tab 4: Team ---
  const [members, setMembers] = useState(initialTeam)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteAccess, setInviteAccess] = useState<'Admin' | 'Member'>('Member')

  const handleAddSkill = () => {
    const trimmed = newSkillName.trim()
    if (!trimmed) return
    setSkillsByCat(prev => {
      const currentList = prev[selectedCategory][newSkillSub] ?? []
      if (currentList.includes(trimmed)) return prev
      return {
        ...prev,
        [selectedCategory]: {
          ...prev[selectedCategory],
          [newSkillSub]: [...currentList, trimmed],
        },
      }
    })
    setNewSkillName('')
    toast(`Added skill "${trimmed}" to ${newSkillSub}`)
  }

  const handleRemoveSkill = (sub: string, skill: string) => {
    setSkillsByCat(prev => ({
      ...prev,
      [selectedCategory]: {
        ...prev[selectedCategory],
        [sub]: (prev[selectedCategory][sub] ?? []).filter(s => s !== skill),
      },
    }))
  }

  const handleAddAdjacency = () => {
    const sources = adjFrom.split(',').map(s => s.trim()).filter(Boolean)
    const target = adjTo.trim()
    if (!sources.length || !target) return
    setAdjacencies(prev => [
      { id: `adj-${Date.now()}`, category: selectedCategory, sourceSkills: sources, predictedSkill: target, strength: adjStrength },
      ...prev,
    ])
    setAdjFrom('')
    setAdjTo('')
    setAddAdjOpen(false)
    toast(`Added adjacency rule for ${target}`)
  }

  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return
    const initials = inviteName.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
    setMembers(prev => [...prev, { name: inviteName.trim(), initials, email: inviteEmail.trim(), access: inviteAccess }])
    setInviteName('')
    setInviteEmail('')
    setInviteOpen(false)
    toast(`Invited ${inviteName.trim()}`)
  }

  const handleSave = () => {
    log({
      what: `Updated workspace settings (${tab})`,
      record: 'Settings',
      recordHref: '/settings',
      kind: 'Roles',
    })
    toast('Settings saved')
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      {/* Sub-navigation Pill Tab Bar (h-12) */}
      <div className="z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
        <PillTabs<SettingsTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'skills', label: 'Skill list', count: adjacencies.length },
            { value: 'matching', label: 'Matching' },
            { value: 'templates', label: 'Templates', count: 3 },
            { value: 'team', label: 'Team', count: members.length },
          ]}
        />
        <ExampleMark />
      </div>

      {/* Scrollable Form Canvas (Rightfit /job-preferences max-w-3xl rhythm) */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 pb-24">
          <PageHeader
            title="Settings"
            meta="Skill taxonomy · matching rules · output templates · team access"
          >
            <p className="text-sm text-muted-foreground">
              Configure how HeroScouter maps adjacent skills, eliminates mismatches, and formats masked or tailored resumes.
            </p>
          </PageHeader>

          {/* ==================== TAB 1: SKILL LIST & ADJACENCY ==================== */}
          {tab === 'skills' && (
            <div className="space-y-6">
              <BezelCard
                icon={<Sparkles />}
                title="Skill list by function"
                description="Skills are organized by category and sub-category so candidates and roles map to a shared list."
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          'h-7 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                          selectedCategory === cat
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-gray-1100 hover:bg-muted',
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="divide-y divide-border rounded-xl border border-border bg-background">
                    {SUBCATEGORIES[selectedCategory].map(sub => {
                      const list = skillsByCat[selectedCategory]?.[sub] ?? []
                      return (
                        <div key={sub} className="space-y-2 p-3.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">{sub}</span>
                            <span className="font-mono text-[10px] text-muted-foreground tnum">{list.length} skills</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {list.map(skill => (
                              <Tag key={skill} onRemove={() => handleRemoveSkill(sub, skill)}>
                                {skill}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add skill inline row */}
                  <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-[180px_1fr_auto]">
                    <Select
                      aria-label="Sub-category"
                      size="lg"
                      value={newSkillSub}
                      onChange={setNewSkillSub}
                      options={SUBCATEGORIES[selectedCategory]}
                    />
                    <Input
                      placeholder={`Add a skill to ${newSkillSub}…`}
                      value={newSkillName}
                      onChange={e => setNewSkillName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill() } }}
                    />
                    <Button variant="outline" className="h-9" icon={<Plus />} onClick={handleAddSkill}>
                      Add skill
                    </Button>
                  </div>
                </div>
              </BezelCard>

              <BezelCard
                icon={<Sparkles />}
                title="Skill adjacency rules (missing-but-predictable)"
                action={
                  <Button variant="outline" size="sm" icon={<Plus />} onClick={() => setAddAdjOpen(true)}>
                    Add adjacency
                  </Button>
                }
                description="Prevent strong candidates from being dropped over wording. Explicit evidence always ranks above predicted skills at equal fit."
              >
                <div className="divide-y divide-border">
                  {adjacencies.map(rule => (
                    <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
                        <span className="eyebrow mr-1 rounded-xs border border-border bg-muted px-1.5 py-0.5 text-[9px] text-gray-1000">
                          {rule.category}
                        </span>
                        {rule.sourceSkills.map((s, idx) => (
                          <span key={s} className="inline-flex items-center gap-1.5">
                            {idx > 0 && <span className="text-xs text-muted-foreground">+</span>}
                            <Tag>{s}</Tag>
                          </span>
                        ))}
                        <span className="mx-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowRight className="size-3.5" /> predicts
                        </span>
                        <span className="inline-flex h-6 items-center gap-1 rounded-md border border-info/40 bg-info/[0.06] px-2 text-xs font-medium text-[#0e7490]">
                          ◇ {rule.predictedSkill}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label="Predictability strength"
                          value={rule.strength}
                          onChange={v =>
                            setAdjacencies(prev =>
                              prev.map(x => (x.id === rule.id ? { ...x, strength: v as 'High' | 'Medium' } : x)),
                            )
                          }
                          options={['High', 'Medium']}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove adjacency"
                          onClick={() => setAdjacencies(prev => prev.filter(x => x.id !== rule.id))}
                          icon={<Trash2 />}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BezelCard>
            </div>
          )}

          {/* ==================== TAB 2: MATCHING ==================== */}
          {tab === 'matching' && (
            <div className="space-y-6">
              <BezelCard
                icon={<Sliders />}
                title="Stage-1 must-have eliminators"
                description="Stage 1 removes obvious mismatches instantly before ranking. Missing values always pass and show as Assumed."
              >
                <div className="space-y-4">
                  <Checkbox
                    checked={mustHaveFields.minYears}
                    onChange={v => setMustHaveFields(s => ({ ...s, minYears: v }))}
                    label="Minimum years of experience"
                    description="Eliminates candidates below the role's minimum years. Missing years are assumed to pass."
                  />
                  <Checkbox
                    checked={mustHaveFields.locationMode}
                    onChange={v => setMustHaveFields(s => ({ ...s, locationMode: v }))}
                    label="Location, work mode and relocation"
                    description="Checks metro, remote/hybrid/onsite compatibility, and openness to relocate."
                  />
                  <Checkbox
                    checked={mustHaveFields.categorySub}
                    onChange={v => setMustHaveFields(s => ({ ...s, categorySub: v }))}
                    label="Function category and sub-category"
                    description="Matches role function (e.g., Product → Product Manager)."
                  />
                  <Checkbox
                    checked={mustHaveFields.workAuth}
                    onChange={v => setMustHaveFields(s => ({ ...s, workAuth: v }))}
                    label="Work authorization vs. sponsorship & transfer offered"
                    description="Compares candidate visa sponsorship or H-1B transfer needs against what the role supports."
                  />
                  <Checkbox
                    checked={mustHaveFields.mustSkills}
                    onChange={v => setMustHaveFields(s => ({ ...s, mustSkills: v }))}
                    label="Must-have skills (including predicted skills)"
                    description="Requires evidence or an approved adjacency prediction for skills flagged Must on the role."
                  />
                  <div className="pt-1">
                    <InfoNote>
                      Recruiters can always inspect the eliminated list on any role and click <strong>Include anyway</strong> to override a rule.
                    </InfoNote>
                  </div>
                </div>
              </BezelCard>

              <BezelCard
                icon={<Sliders />}
                title="Ranking display & defaults"
                description="Control how ranked matches appear on role and candidate pages."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Default top N shown" hint="How many matches appear before clicking Show next 5.">
                      <Select
                        size="lg"
                        value={defaultTopN}
                        onChange={setDefaultTopN}
                        options={[
                          { value: '5', label: 'Top 5 (recommended)' },
                          { value: '10', label: 'Top 10' },
                        ]}
                      />
                    </Field>
                    <Field label="Ordering tie-breaker" hint="Applied when two candidates have equal fit.">
                      <Input value="Explicit evidence before predicted skills" disabled />
                    </Field>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-3.5">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium text-foreground">Show whole-number score next to fit band</div>
                      <p className="text-xs text-muted-foreground">
                        Displays <span className="font-mono">Strong · 88</span> instead of <span className="font-mono">Strong</span> alone. Reason and evidence always come first (P2).
                      </p>
                    </div>
                    <Switch
                      aria-label="Show score next to band"
                      checked={showScore}
                      onChange={v => {
                        setShowScore(v)
                        toast(v ? 'Score shown next to band' : 'Showing fit bands only')
                      }}
                    />
                  </div>
                </div>
              </BezelCard>

              <BezelCard
                icon={<Info />}
                title="Out-of-date triggers (view only)"
                description="Reruns are never automatic so token spend stays predictable and lists never reshuffle under a reviewer."
              >
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Role must-haves, minimum years, location/mode, or sponsorship settings change</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> A revised JD version is applied to an open role</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Candidate skills, work authorization, or location preferences change</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> A new resume version or call enrichment is applied to a candidate</li>
                </ul>
              </BezelCard>
            </div>
          )}

          {/* ==================== TAB 3: TEMPLATES ==================== */}
          {tab === 'templates' && (
            <div className="space-y-6">
              <BezelCard
                icon={<FileText />}
                title="Masked resume templates (prospect outreach)"
                description="Used for one-click masked PDFs (~400–500/month). Assumed facts and predicted skills are never printed."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {([
                    {
                      id: 'A',
                      name: 'A · Compact one-pager',
                      desc: 'Header band, Why we recommend, explicit skills, and a clean experience timeline with company descriptors.',
                      lines: ['Header + alias + pills', 'Why we recommend (3)', 'Explicit skills · Core/Tools', 'Descriptor timeline'],
                    },
                    {
                      id: 'B',
                      name: 'B · Achievement-led',
                      desc: 'Opens with quantified impact highlights and metrics before the timeline. Best for growth and product profiles.',
                      lines: ['Header + alias + pills', 'Impact metrics callout', 'Our take quote', 'Experience + education'],
                    },
                    {
                      id: 'C',
                      name: 'C · Role-fit matrix',
                      desc: 'Includes a "Fit for {role}" block mapping each must-have to candidate evidence. Requires a target role.',
                      lines: ['Header + target role badge', 'Must-have → evidence table', 'Why we recommend', 'Condensed timeline'],
                    },
                  ] as const).map(t => {
                    const active = defaultMaskedTpl === t.id
                    return (
                      <div
                        key={t.id}
                        onClick={() => setDefaultMaskedTpl(t.id)}
                        className={cn(
                          'flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all',
                          active ? 'border-primary bg-secondary/60 shadow-xs' : 'border-border bg-background hover:bg-muted/40',
                        )}
                      >
                        <div className="space-y-3">
                          {/* Mini page thumbnail */}
                          <div className="rounded-lg border border-border bg-card p-2.5 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-border pb-1.5">
                              <span className="flex size-3.5 items-center justify-center rounded-[2px] bg-primary font-mono text-[8px] font-bold text-primary-foreground">H</span>
                              <span className="font-mono text-[9px] text-muted-foreground">MASKED PDF</span>
                            </div>
                            <div className="mt-2 space-y-1">
                              {t.lines.map(line => (
                                <div key={line} className="truncate rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[9px] text-gray-1100">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-foreground">{t.name}</span>
                              {active && <span className="eyebrow text-[9px] text-foreground">Default</span>}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{active ? 'Selected as default' : 'Click to set default'}</span>
                          <span className={cn('size-3.5 rounded-full border', active ? 'border-primary bg-primary' : 'border-gray-700')} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </BezelCard>

              <BezelCard
                icon={<FileText />}
                title="Tailored resume template (onboarded clients)"
                description="Keeps candidate identity and reorders or rewords existing bullets with source traceability."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Tailored layout" hint="Used when exporting tailored PDFs or DOCX files.">
                    <Select
                      size="lg"
                      value={tailoredStyle}
                      onChange={setTailoredStyle}
                      options={['Classic single-column', 'Modern executive with summary band']}
                    />
                  </Field>
                  <Field label="Traceability guardrail" hint="Enforced on all tailored resumes.">
                    <Input value="Every change must cite RESUME or CALL" disabled />
                  </Field>
                </div>
              </BezelCard>
            </div>
          )}

          {/* ==================== TAB 4: TEAM ==================== */}
          {tab === 'team' && (
            <div className="space-y-6">
              <BezelCard
                icon={<Users />}
                title="Workspace members"
                action={
                  <Button variant="outline" size="sm" icon={<Plus />} onClick={() => setInviteOpen(true)}>
                    Invite member
                  </Button>
                }
                description="Members can filter the pool, copy lists, and generate masked resumes. Only Admins can change Settings or delete records."
              >
                <div className="divide-y divide-border">
                  {members.map(m => (
                    <div key={m.email} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar initials={m.initials} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{m.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label={`Access for ${m.name}`}
                          value={m.access}
                          onChange={v =>
                            setMembers(prev => prev.map(x => (x.email === m.email ? { ...x, access: v } : x)))
                          }
                          options={['Admin', 'Member']}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BezelCard>

              <BezelCard
                icon={<ShieldCheck />}
                title="Role permissions summary"
              >
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-1.5">
                    <div className="font-semibold text-foreground">Admin (Purvesh, Vandit)</div>
                    <p className="text-muted-foreground">Full access: create/edit roles and candidates, approve changes, rerun matching, edit skill adjacencies, delete records.</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-1.5">
                    <div className="font-semibold text-foreground">Member (Client-comms & outreach associates)</div>
                    <p className="text-muted-foreground">Add candidates from resumes, filter the pool, copy masked lists, and generate masked resumes. Cannot delete or edit Settings.</p>
                  </div>
                </div>
              </BezelCard>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Save Bar (Rightfit /job-preferences pattern) */}
      <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Changes apply immediately across matching and resume builder views.</span>
          <Button variant="primary" onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>

      {/* Add adjacency dialog */}
      <Dialog
        open={addAdjOpen}
        onClose={() => setAddAdjOpen(false)}
        title="Add skill adjacency rule"
        description="Define which explicit skills predict an unstated skill during Stage-2 ranking."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddAdjOpen(false)}>Cancel</Button>
            <Button variant="primary" data-autofocus onClick={handleAddAdjacency}>Add adjacency</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Category">
            <Select
              size="lg"
              value={selectedCategory}
              onChange={v => setSelectedCategory(v as Category)}
              options={CATEGORIES}
            />
          </Field>
          <Field label="When candidate has (comma-separated)" hint="Example: Meta Ads, Google Ads">
            <Input
              placeholder="e.g. Meta Ads, Google Ads"
              value={adjFrom}
              onChange={e => setAdjFrom(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Predicts skill">
              <Input
                placeholder="e.g. LinkedIn Ads"
                value={adjTo}
                onChange={e => setAdjTo(e.target.value)}
              />
            </Field>
            <Field label="Predictability strength">
              <Select
                size="lg"
                value={adjStrength}
                onChange={v => setAdjStrength(v as 'High' | 'Medium')}
                options={['High', 'Medium']}
              />
            </Field>
          </div>
        </div>
      </Dialog>

      {/* Invite member dialog */}
      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite team member"
        description="They will receive an invite to HeroScouter Talent Engine."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="primary" data-autofocus onClick={handleInvite}>Send invite</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name">
            <Input placeholder="e.g. Aman Verma" value={inviteName} onChange={e => setInviteName(e.target.value)} />
          </Field>
          <Field label="Work email">
            <Input placeholder="aman@heroscouter.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          </Field>
          <Field label="Access level">
            <Select
              size="lg"
              value={inviteAccess}
              onChange={v => setInviteAccess(v as 'Admin' | 'Member')}
              options={['Member', 'Admin']}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
