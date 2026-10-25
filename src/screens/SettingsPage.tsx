import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles, Sliders, FileText, Users, Plus, Trash2, ArrowRight, ShieldCheck, Check, Info, Terminal, Lock, RotateCcw, Eye, UserCircle, Globe, Mail, Link2,
} from 'lucide-react'
import { useTopBar } from '../shell/AppShell'
import {
  Avatar, BezelCard, Button, Checkbox, ExampleMark, Field, Input, PageHeader, PillTabs, Segmented, Select, Switch, Tag, Textarea, cn,
} from '../components/ui'
import { Dialog, InfoNote } from '../components/hs'
import { signature } from '../components/v3'
import { useViewAsWhile } from '../components/outputs'
import { PERMISSIONS, SCORE_OPTIONS, SCORE_RUN_CAP, useApp, useWireframeState } from '../store/AppStore'
import {
  CATEGORIES, ELIMINATOR_COLUMNS, LOCKED_RULES, SUBCATEGORIES,
  type AccessRole, type Category, type OutputDelivery, type OutputStyle, type Permission, type PromptDef,
} from '../data/types'

/* ==========================================================================
   S-13 · Settings (admin + My profile) — PRD v0.3 §7.2, §7.4, §7.5, §7.8
   Tabs for Admins: Matching · Skill list · Prompts · Templates · Team & access (+ My profile)
   Non-admins see My profile + InfoNote.
   ========================================================================== */

type SettingsTab = 'matching' | 'skills' | 'prompts' | 'templates' | 'team' | 'profile'

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

const PROMPT_GROUPS: PromptDef['group'][] = ['Outputs', 'Email drafts', 'Refine presets', 'Extraction', 'Scoring']

const ACCESS_MATRIX_ROWS: { perm: Permission; label: string }[] = [
  { perm: 'addRecords', label: 'Add roles, candidates, resumes & call notes' },
  { perm: 'editFacts', label: 'Edit profile facts, must-haves & client asks' },
  { perm: 'score', label: 'Score candidates with AI & rerun matching' },
  { perm: 'shortlist', label: 'Shortlist candidates' },
  { perm: 'reject', label: 'Reject candidates' },
  { perm: 'genMasked', label: 'Generate masked resumes' },
  { perm: 'genIdentity', label: 'Generate editable or as-is resumes' },
  { perm: 'copyMasked', label: 'Copy masked candidate lists' },
  { perm: 'copyFull', label: 'Copy full lists with contact details' },
  { perm: 'signTake', label: 'Write & sign “Our take”' },
  { perm: 'exportCsv', label: 'Export CSV' },
  { perm: 'settings', label: 'Change workspace Settings & prompts' },
  { perm: 'delete', label: 'Delete records' },
]

interface MaskedTplConfig {
  id: 'A' | 'B' | 'C'
  name: string
  desc: string
  active: boolean
  sections: { ourTake: boolean; education: boolean; impactNumbers: boolean }
  lines: string[]
}

const INITIAL_MASKED_TPLS: MaskedTplConfig[] = [
  {
    id: 'A',
    name: 'A · Compact',
    desc: 'Header band, Why we recommend, explicit skills, and a clean experience timeline with company descriptors.',
    active: true,
    sections: { ourTake: true, education: true, impactNumbers: true },
    lines: ['Header + alias + pills', 'Why we recommend (3)', 'Explicit skills · Core/Tools', 'Descriptor timeline'],
  },
  {
    id: 'B',
    name: 'B · Achievement-led',
    desc: 'Opens with quantified impact highlights and metrics before the timeline. Best for growth and product profiles.',
    active: true,
    sections: { ourTake: true, education: true, impactNumbers: true },
    lines: ['Header + alias + pills', 'Impact metrics callout', 'Our take quote', 'Experience + education'],
  },
  {
    id: 'C',
    name: 'C · Role-fit',
    desc: 'Includes a "Fit for {role}" block mapping each must-have to candidate evidence. Requires a target role.',
    active: true,
    sections: { ourTake: true, education: false, impactNumbers: true },
    lines: ['Header + target role badge', 'Must-have → evidence table', 'Why we recommend', 'Condensed timeline'],
  },
]

const VALID_TABS: SettingsTab[] = ['matching', 'skills', 'prompts', 'templates', 'team', 'profile']

export function SettingsPage() {
  const app = useApp()
  const { toast, log } = app
  const [params, setParams] = useSearchParams()
  const urlTab = params.get('tab') as SettingsTab | null

  const [wfState, setWfState] = useWireframeState(
    'S-13',
    'Settings',
    [
      { id: 'matching', label: 'Matching' },
      { id: 'skills', label: 'Skill list + Domains' },
      { id: 'prompts', label: 'Prompts (N23)' },
      { id: 'templates', label: 'Templates' },
      { id: 'team', label: 'Team & access' },
      { id: 'profile', label: 'My profile (non-admin)' },
    ],
    urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'matching',
  )

  useViewAsWhile(wfState === 'profile' && app.can('settings') && urlTab !== 'profile', 'vandit')

  // Sync URL ?tab=... into wfState when navigated to via link or command palette
  useEffect(() => {
    if (urlTab && VALID_TABS.includes(urlTab) && urlTab !== wfState) {
      setWfState(urlTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab])

  const isAdmin = app.can('settings')
  const rawTab = (VALID_TABS.includes(wfState as SettingsTab) ? wfState : 'matching') as SettingsTab
  const tab: SettingsTab = isAdmin ? rawTab : 'profile'
  const setTab = (t: SettingsTab) => {
    setWfState(t)
    setParams(t === 'matching' ? {} : { tab: t }, { replace: true })
  }

  useTopBar(
    [{ label: 'Settings' }],
    <span className="eyebrow rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-gray-1000">{app.currentUser.access}</span>,
    [tab, app.currentUser.access],
  )

  // --- Tab: Skill list, Domains & Adjacency ---
  const [selectedCategory, setSelectedCategory] = useState<Category>('Marketing')
  const [skillsByCat, setSkillsByCat] = useState(INITIAL_SKILLS)
  const [newSkillSub, setNewSkillSub] = useState<string>(SUBCATEGORIES.Marketing[0])
  const [newSkillName, setNewSkillName] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [adjacencies, setAdjacencies] = useState<AdjacencyRule[]>(INITIAL_ADJACENCIES)
  const [addAdjOpen, setAddAdjOpen] = useState(false)
  const [adjFrom, setAdjFrom] = useState('')
  const [adjTo, setAdjTo] = useState('')
  const [adjStrength, setAdjStrength] = useState<'High' | 'Medium'>('High')

  useEffect(() => {
    setNewSkillSub(SUBCATEGORIES[selectedCategory][0])
  }, [selectedCategory])

  // --- Tab: Matching ---
  const [mustHaveFields, setMustHaveFields] = useState({
    minYears: true,
    locationMode: true,
    categorySub: true,
    workAuth: true,
    mustSkills: true,
  })

  // --- Tab: Prompts (N23) ---
  const [selectedPromptId, setSelectedPromptId] = useState<string>('masking')
  const selectedPrompt = app.prompts.find(p => p.id === selectedPromptId) ?? app.prompts[0]
  const activePromptVer = selectedPrompt.versions.find(v => v.v === selectedPrompt.activeVersion) ?? selectedPrompt.versions[selectedPrompt.versions.length - 1]
  const [draftText, setDraftText] = useState<string>(activePromptVer?.text ?? '')
  const [draftNote, setDraftNote] = useState<string>('')
  const [tryOpen, setTryOpen] = useState<boolean>(true)

  useEffect(() => {
    const v = selectedPrompt.versions.find(x => x.v === selectedPrompt.activeVersion) ?? selectedPrompt.versions[selectedPrompt.versions.length - 1]
    setDraftText(v?.text ?? '')
    setDraftNote('')
  }, [selectedPrompt.id, selectedPrompt.activeVersion, selectedPrompt.versions])

  // --- Tab: Templates ---
  const [defaultMaskedTpl, setDefaultMaskedTpl] = useState<'A' | 'B' | 'C'>('A')
  const [maskedTpls, setMaskedTpls] = useState<MaskedTplConfig[]>(INITIAL_MASKED_TPLS)
  const [editableStyle, setEditableStyle] = useState('Classic single-column')

  // --- Tab: Team & access ---
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteTitle, setInviteTitle] = useState('Talent Associate, HeroScouter')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteAccess, setInviteAccess] = useState<AccessRole>('Associate')

  // --- Tab: My profile ---
  const [profileDisplayName, setProfileDisplayName] = useState(app.currentUser.displayName)
  const [profileTitle, setProfileTitle] = useState(app.currentUser.title)
  useEffect(() => {
    setProfileDisplayName(app.currentUser.displayName)
    setProfileTitle(app.currentUser.title)
  }, [app.currentUser.id, app.currentUser.displayName, app.currentUser.title])

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

  const handleAddDomain = () => {
    const trimmed = newDomain.trim()
    if (!trimmed || app.domains.includes(trimmed)) return
    app.setDomains([...app.domains, trimmed])
    setNewDomain('')
    toast(`Added domain "${trimmed}"`)
  }

  const handleRemoveDomain = (d: string) => {
    app.setDomains(app.domains.filter(x => x !== d))
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
    toast(`Invited ${inviteName.trim()} (${inviteAccess})`)
    setInviteName('')
    setInviteEmail('')
    setInviteOpen(false)
  }

  const handleSaveProfile = () => {
    app.updateTeamMember(app.currentUser.id, {
      displayName: profileDisplayName.trim() || app.currentUser.displayName,
      title: profileTitle.trim() || app.currentUser.title,
    })
    log({
      what: `Updated profile signature (${profileDisplayName.trim()}, ${profileTitle.trim()})`,
      record: 'Settings · My profile',
      recordHref: '/settings?tab=profile',
      kind: 'Candidates',
    })
    toast('Profile signature saved')
  }

  const handleSave = () => {
    if (tab === 'profile') {
      handleSaveProfile()
      return
    }
    log({
      what: `Updated workspace settings (${tab})`,
      record: 'Settings',
      recordHref: `/settings?tab=${tab}`,
      kind: 'Roles',
    })
    toast('Settings saved')
  }

  const nextPromptVersion = Math.max(...selectedPrompt.versions.map(v => v.v), 0) + 1

  const renderTryPreview = (promptText: string) => {
    const lower = promptText.toLowerCase()
    const bullets = [
      'Owns merchant payouts end to end at a Series B US fintech (~200 people).',
      '7 years of payments and billing product work; shipped a usage-based billing API.',
      'Lifted ARPA 14% in two quarters through a company-wide pricing revamp.',
    ]
    if (/shorter|concise|1 line|brief/.test(lower)) {
      return bullets.slice(0, 2).map(b => b.split(';')[0])
    }
    if (/metric|number|impact|quantif/.test(lower)) {
      return [bullets[2], bullets[0], bullets[1]]
    }
    return bullets
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      {/* Sub-navigation Pill Tab Bar (h-12) */}
      <div className="z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
        {isAdmin ? (
          <PillTabs<SettingsTab>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'matching', label: 'Matching' },
              { value: 'skills', label: 'Skill list', count: app.domains.length },
              { value: 'prompts', label: 'Prompts', count: app.prompts.length },
              { value: 'templates', label: 'Templates', count: 3 },
              { value: 'team', label: 'Team & access', count: app.team.length },
              { value: 'profile', label: 'My profile' },
            ]}
          />
        ) : (
          <PillTabs<SettingsTab>
            value="profile"
            onChange={() => {}}
            tabs={[{ value: 'profile', label: 'My profile' }]}
          />
        )}
        <ExampleMark />
      </div>

      {/* Scrollable Form Canvas */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className={cn('mx-auto w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 pb-24', tab === 'prompts' ? 'max-w-5xl' : 'max-w-3xl')}>
          <PageHeader
            title={isAdmin ? 'Settings' : 'My profile'}
            meta={isAdmin ? 'Matching · skill list & domains · AI prompts · output templates · team & access' : `${app.currentUser.name} · ${app.currentUser.access}`}
          >
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Configure how HeroScouter scores in rounds, maps skills and domains, versions AI prompts, and governs team permissions.'
                : 'Manage how your name and title appear when you sign a take on candidate profiles and outputs.'}
            </p>
          </PageHeader>

          {!isAdmin && (
            <InfoNote>
              Only Admins can change workspace Settings (Matching, Skill list, Prompts, Templates, and Team & access). You can update your display name and title below.
            </InfoNote>
          )}

          {/* ==================== TAB: MATCHING (v0.4 §7.8, C5, C6) ==================== */}
          {tab === 'matching' && isAdmin && (
            <div className="space-y-6">
              <BezelCard
                icon={<Sparkles />}
                title="Auto-suggest count on role save (C5)"
                description="When a role is saved, Stage 1 runs for free and the top N candidates by similarity are scored automatically as Suggested."
              >
                <div className="space-y-3">
                  <Field
                    label="Auto-suggested candidates per new role"
                    hint="Appears in the Suggested group at the top of Matches immediately after Save and scan."
                  >
                    <div>
                      <Segmented
                        aria-label="Auto-suggest count on role save"
                        value={String(app.autoSuggestCount)}
                        onChange={v => {
                          const num = Number(v)
                          app.setAutoSuggestCount(num)
                          toast(num === 0 ? 'Auto-suggest turned off' : `Auto-suggest set to top ${num} candidates`)
                        }}
                        options={[
                          { value: '0', label: '0 (off)' },
                          { value: '3', label: '3' },
                          { value: '5', label: '5 (default)' },
                          { value: '10', label: '10' },
                        ]}
                      />
                    </div>
                  </Field>
                </div>
              </BezelCard>

              <BezelCard
                icon={<Sliders />}
                title="Default requirement effect by type (§7.1, C6)"
                description="Every role has one unified Requirements list. Only the 4 hard stored columns can eliminate in Stage 1; all other requirements improve the Stage 2 AI recommendation."
              >
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-gray-100/90">
                          <th className="eyebrow px-3 py-2 text-[10px] text-gray-1000">Requirement column / type</th>
                          <th className="eyebrow px-3 py-2 text-[10px] text-gray-1000">Default effect</th>
                          <th className="eyebrow px-3 py-2 text-[10px] text-gray-1000">Can switch to Eliminates?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          { col: 'Minimum years', effect: 'Eliminates (Stage 1)', canElim: true, note: 'Hard filter on years of experience' },
                          { col: 'Work authorization', effect: 'Eliminates (Stage 1)', canElim: true, note: 'Compares visa sponsorship & H-1B transfer needs' },
                          { col: 'Location', effect: 'Eliminates (Stage 1)', canElim: true, note: 'Checks metro, work mode & relocation openness' },
                          { col: 'Category', effect: 'Eliminates (Stage 1)', canElim: true, note: 'Matches primary function category' },
                          { col: 'Skills', effect: 'Improves score (Stage 2 AI)', canElim: false, note: 'Checked with explicit & predicted skill evidence' },
                          { col: 'Domain', effect: 'Improves score (Stage 2 AI)', canElim: false, note: 'Matches industry / domain tags (~10 values)' },
                          { col: 'Pay', effect: 'Improves score (Stage 2 AI)', canElim: false, note: 'Flags pay range gaps without eliminating' },
                          { col: 'Free-text signals', effect: 'Improves score (Stage 2 AI)', canElim: false, note: 'Call/JD asks without a column (e.g. "Led team of 5+")' },
                        ].map(r => (
                          <tr key={r.col}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-foreground">{r.col}</div>
                              <div className="text-[11px] text-muted-foreground">{r.note}</div>
                            </td>
                            <td className="px-3 py-2">
                              <span className={cn(
                                'inline-flex h-5 items-center rounded-md border px-2 font-mono text-[10px] font-medium uppercase',
                                r.canElim ? 'border-gray-1100 bg-primary text-primary-foreground' : 'border-border bg-secondary text-gray-1100',
                              )}>
                                {r.effect}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                              {ELIMINATOR_COLUMNS.includes(r.col as typeof ELIMINATOR_COLUMNS[number]) ? 'Yes (Eliminates ⇄ Improves)' : 'No · Stage 2 only'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <InfoNote>
                    Missing candidate values never eliminate — they pass Stage 1 as <strong>Assumed</strong> and join the Ask list. Recruiters can also click <strong>Include anyway</strong> on any eliminated candidate.
                  </InfoNote>
                </div>
              </BezelCard>

              <BezelCard
                icon={<Sliders />}
                title="Stage-1 must-have eliminators"
                description="Stage 1 removes obvious mismatches instantly (free) before AI scoring. Missing values always pass and show as Assumed (P3)."
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
                    description="Requires evidence or an approved adjacency prediction for skills flagged on the role."
                  />
                </div>
              </BezelCard>

              <BezelCard
                icon={<Sliders />}
                title="Stage-2 AI scoring & recommendation defaults"
                description="Control how many candidates are scored per round and how ranked recommendations appear."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field
                      label="Default number to score"
                      hint={`When ≤25 remain, scores all in 1 click. Above 25, pre-selects this count (cap: ${SCORE_RUN_CAP}/run).`}
                    >
                      <Select
                        aria-label="Default number to score"
                        size="lg"
                        value={String(app.defaultScoreCount)}
                        onChange={v => {
                          app.setDefaultScoreCount(Number(v))
                          toast(`Default number to score set to ${v}`)
                        }}
                        options={SCORE_OPTIONS.map(n => ({
                          value: String(n),
                          label: n === 10 ? `${n} candidates (recommended)` : `${n} candidates`,
                        }))}
                      />
                    </Field>
                    <Field label="Ordering tie-breaker" hint="Applied when two candidates have equal recommendation.">
                      <Input value="Explicit evidence before predicted skills" disabled />
                    </Field>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/50 p-3.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Recommendations replace numeric scores (v0.4 §7.2):</span> Scored candidates show{' '}
                    <span className="font-mono text-foreground">Strong</span>, <span className="font-mono text-foreground">Mild</span>, or{' '}
                    <span className="font-mono text-foreground">Not recommended</span> alongside requirements met (<span className="font-mono">4/4</span>), green flags, and red flags. Whole-number scores are never shown on screen.
                  </div>
                </div>
              </BezelCard>

              <BezelCard
                icon={<Info />}
                title="Out-of-date triggers (view only)"
                description="Reruns are never automatic so token spend stays predictable and lists never reshuffle under a reviewer."
              >
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Role requirements, minimum years, location/mode, or sponsorship change</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> A revised JD version is applied to an open role</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Candidate skills, work authorization, or location preferences change</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> A new resume version or call enrichment is applied to a candidate</li>
                </ul>
              </BezelCard>
            </div>
          )}

          {/* ==================== TAB: SKILL LIST & DOMAINS (T4) ==================== */}
          {tab === 'skills' && isAdmin && (
            <div className="space-y-6">
              <BezelCard
                icon={<Globe />}
                title="Domains"
                description="Shared domain tags extracted onto the Domain column on Candidates and Matches (~10 values)."
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {app.domains.map(d => (
                      <Tag key={d} onRemove={() => handleRemoveDomain(d)}>
                        {d}
                      </Tag>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-[1fr_auto]">
                    <Input
                      aria-label="New domain"
                      placeholder="Add a domain, e.g. Climate or Cybersecurity…"
                      value={newDomain}
                      onChange={e => setNewDomain(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain() } }}
                    />
                    <Button variant="outline" className="h-9" icon={<Plus />} onClick={handleAddDomain}>
                      Add domain
                    </Button>
                  </div>
                </div>
              </BezelCard>

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

          {/* ==================== TAB: PROMPTS (N23 — F-16 · Probe 1 §8.1) ==================== */}
          {tab === 'prompts' && isAdmin && (
            <div className="space-y-6">
              {/* Probe 1 · Email drafting test (§8.1) */}
              <BezelCard
                icon={<Mail />}
                title="Probe 1 · Email drafting test (§8.1 — 2-week checkpoint)"
                description="Comparing Option A (Draft in product) vs Option B (Copy assembled prompt for Claude) across 30 real outreach emails."
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">
                        Target: 30 real emails drafted ({app.probe1Stats.inProductCount + app.probe1Stats.claudeCount} / 30 completed)
                      </span>
                      <span className="font-mono text-[11px] text-success tnum">
                        {Math.min(100, Math.round(((app.probe1Stats.inProductCount + app.probe1Stats.claudeCount) / 30) * 100))}% of checkpoint target
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.round(((app.probe1Stats.inProductCount + app.probe1Stats.claudeCount) / 30) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Option A · Draft in product</span>
                        <span className="rounded-md border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[10px] font-medium text-success tnum">
                          78% sent in ≤2 rounds
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                        <div>
                          <div className="text-[11px] text-muted-foreground">Drafted</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">{app.probe1Stats.inProductCount}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">Avg refine rounds</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">{app.probe1Stats.inProductMedianRounds}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">Sent as-is / ≤2 rds</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">14 ({Math.round((14 / Math.max(1, app.probe1Stats.inProductCount)) * 100)}%)</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Option B · Copy prompt for Claude</span>
                        <span className="rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] text-gray-1100 tnum">
                          Assembled context
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div>
                          <div className="text-[11px] text-muted-foreground">Prompts copied</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">{app.probe1Stats.claudeCount}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">Avg rounds in Claude</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">{app.probe1Stats.claudeMedianRounds}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <InfoNote>
                    Decision rule: If ≥70% of in-product drafts go out in ≤2 rounds, keep in-product drafting. Otherwise default to Copy prompt for Claude.
                  </InfoNote>
                </div>
              </BezelCard>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              {/* Left: grouped prompt list */}
              <div className="space-y-3 rounded-2xl border border-border bg-gray-100 p-1">
                <div className="space-y-3 rounded-xl border border-border bg-card p-2.5">
                  {PROMPT_GROUPS.map(g => {
                    const items = app.prompts.filter(p => p.group === g)
                    if (!items.length) return null
                    return (
                      <div key={g} className="space-y-1">
                        <div className="eyebrow px-2 py-1 text-[10px] text-gray-1000">{g}</div>
                        <ul className="space-y-0.5">
                          {items.map(p => {
                            const on = p.id === selectedPrompt.id
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPromptId(p.id)}
                                  className={cn(
                                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                                    on ? 'bg-muted font-semibold text-foreground' : 'text-gray-1100 hover:bg-muted/60',
                                  )}
                                >
                                  <span className="truncate">{p.name}</span>
                                  <span className="flex shrink-0 items-center gap-1">
                                    {!p.editable && <span className="eyebrow rounded-xs border border-border px-1 py-0.5 text-[9px] text-muted-foreground">View only</span>}
                                    <span className="font-mono text-[10px] text-muted-foreground tnum">v{p.activeVersion}</span>
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right: prompt editor */}
              <div className="space-y-4">
                <BezelCard
                  icon={<Terminal />}
                  title={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span>{selectedPrompt.name}</span>
                      <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground tnum">
                        v{selectedPrompt.activeVersion} · active
                      </span>
                      {!selectedPrompt.editable && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          <Lock className="size-3" />View only
                        </span>
                      )}
                    </span>
                  }
                  description={`Used in ${selectedPrompt.usedIn} · Last saved by ${activePromptVer?.savedBy ?? 'Admin'} · ${activePromptVer?.savedAt ?? 'Recently'}`}
                >
                  <div className="space-y-4">
                    {!selectedPrompt.editable && (
                      <InfoNote>
                        View only in v1 — extraction and scoring prompts are tied to the structured database schema and updated by a developer.
                      </InfoNote>
                    )}

                    <Field label="Prompt instructions">
                      <Textarea
                        aria-label="Prompt instructions"
                        rows={5}
                        value={draftText}
                        disabled={!selectedPrompt.editable}
                        onChange={e => setDraftText(e.target.value)}
                      />
                    </Field>

                    {selectedPrompt.variables.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          Variables {selectedPrompt.editable ? '(click to insert)' : ''}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPrompt.variables.map(v => (
                            <button
                              key={v}
                              type="button"
                              disabled={!selectedPrompt.editable}
                              onClick={() => setDraftText(t => `${t}${t.endsWith(' ') || !t ? '' : ' '}${v}`)}
                              className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 font-mono text-[11px] text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-60"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Locked rules block */}
                    <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Lock className="size-3.5 text-muted-foreground" />
                        <span>Locked rules</span>
                        <span className="ml-auto font-normal text-muted-foreground">Always appended — prompt edits never remove these rules</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-gray-1100">
                        {LOCKED_RULES.map(rule => (
                          <li key={rule} className="flex items-start gap-2">
                            <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">•</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Try it collapsible preview */}
                    <div className="rounded-xl border border-border bg-background">
                      <button
                        type="button"
                        aria-expanded={tryOpen}
                        onClick={() => setTryOpen(o => !o)}
                        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-muted/50"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Eye className="size-3.5 text-muted-foreground" />
                          Try it on Priya S. · Senior Product Manager — Northwind Pay
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">{tryOpen ? 'Hide preview' : 'Show preview'}</span>
                      </button>
                      {tryOpen && (
                        <div className="grid grid-cols-1 gap-3 border-t border-border p-3.5 md:grid-cols-2">
                          <div className="space-y-1.5 rounded-lg border border-border bg-card p-3">
                            <div className="eyebrow text-[10px] text-gray-1000">Current (v{selectedPrompt.activeVersion})</div>
                            <ul className="space-y-1 text-xs text-gray-1100">
                              {renderTryPreview(activePromptVer?.text ?? '').map((line, i) => (
                                <li key={i} className="flex gap-1.5"><span className="text-muted-foreground">—</span><span>{line}</span></li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-1.5 rounded-lg border border-info/40 bg-info/[0.04] p-3">
                            <div className="eyebrow text-[10px] text-foreground">Draft {draftText.trim() !== (activePromptVer?.text ?? '').trim() ? '· modified' : '· matches current'}</div>
                            <ul className="space-y-1 text-xs text-foreground">
                              {renderTryPreview(draftText).map((line, i) => (
                                <li key={i} className="flex gap-1.5"><span className="text-muted-foreground">—</span><span>{line}</span></li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedPrompt.editable && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Input
                          aria-label="Version note"
                          placeholder="Optional note for this version (e.g. Shorter bullets)…"
                          value={draftNote}
                          onChange={e => setDraftNote(e.target.value)}
                          className="min-w-[220px] flex-1"
                        />
                        {draftText !== (activePromptVer?.text ?? '') && (
                          <Button variant="ghost" onClick={() => { setDraftText(activePromptVer?.text ?? ''); setDraftNote('') }}>
                            Discard draft
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          disabled={!draftText.trim() || draftText.trim() === (activePromptVer?.text ?? '').trim()}
                          onClick={() => {
                            app.savePromptVersion(selectedPrompt.id, draftText.trim(), draftNote.trim() || undefined)
                            setDraftNote('')
                          }}
                        >
                          Save as v{nextPromptVersion}
                        </Button>
                      </div>
                    )}
                  </div>
                </BezelCard>

                {/* Version history */}
                <BezelCard icon={<RotateCcw />} title={`Version history · ${selectedPrompt.versions.length}`}>
                  <ol className="divide-y divide-border">
                    {[...selectedPrompt.versions].reverse().map(v => {
                      const isActive = v.v === selectedPrompt.activeVersion
                      return (
                        <li key={v.v} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-foreground tnum">v{v.v}</span>
                              {v.note && <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium">{v.note}</span>}
                              <span className="text-xs text-muted-foreground">{v.savedBy} · {v.savedAt}</span>
                            </div>
                            <p className="line-clamp-2 text-xs text-gray-1100">{v.text}</p>
                          </div>
                          <div className="shrink-0">
                            {isActive ? (
                              <span className="eyebrow rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] text-foreground">Active</span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<RotateCcw />}
                                disabled={!selectedPrompt.editable}
                                onClick={() => app.restorePromptVersion(selectedPrompt.id, v.v)}
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </BezelCard>
              </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: TEMPLATES (T5 · C12 · Probe 2 §8.2) ==================== */}
          {tab === 'templates' && isAdmin && (
            <div className="space-y-6">
              <BezelCard
                icon={<Link2 />}
                title="Default style & delivery per audience (§7.6, C12)"
                description="Choose the default resume style (Creative visual cards vs Traditional Word-style) and delivery format (Web link vs PDF) for Prospects and Onboarded clients."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Prospects (masked pitch)</span>
                      <span className="font-mono text-[10px] text-muted-foreground">S-09 Masked builder</span>
                    </div>
                    <Field label="Default resume style">
                      <Segmented
                        size="sm"
                        aria-label="Prospect default style"
                        value={app.defaultStyle.prospect}
                        onChange={(v: OutputStyle) => {
                          app.setDefaultStyle({ prospect: v })
                          toast(`Prospect default style set to ${v === 'creative' ? 'Creative' : 'Traditional'}`)
                        }}
                        options={[
                          { value: 'creative', label: 'Creative (visual cards)' },
                          { value: 'traditional', label: 'Traditional (Word-style)' },
                        ]}
                      />
                    </Field>
                    <Field label="Default delivery">
                      <Segmented
                        size="sm"
                        aria-label="Prospect default delivery"
                        value={app.defaultDelivery.prospect}
                        onChange={(v: OutputDelivery) => {
                          app.setDefaultDelivery({ prospect: v })
                          toast(`Prospect default delivery set to ${v === 'link' ? 'Web link' : 'PDF'}`)
                        }}
                        options={[
                          { value: 'link', label: 'Web link (read-only)' },
                          { value: 'pdf', label: 'PDF' },
                        ]}
                      />
                    </Field>
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Onboarded clients (named)</span>
                      <span className="font-mono text-[10px] text-muted-foreground">S-10 Editable review</span>
                    </div>
                    <Field label="Default resume style">
                      <Segmented
                        size="sm"
                        aria-label="Client default style"
                        value={app.defaultStyle.client}
                        onChange={(v: OutputStyle) => {
                          app.setDefaultStyle({ client: v })
                          toast(`Client default style set to ${v === 'creative' ? 'Creative' : 'Traditional'}`)
                        }}
                        options={[
                          { value: 'traditional', label: 'Traditional (Word-style)' },
                          { value: 'creative', label: 'Creative (visual cards)' },
                        ]}
                      />
                    </Field>
                    <Field label="Default delivery">
                      <Segmented
                        size="sm"
                        aria-label="Client default delivery"
                        value={app.defaultDelivery.client}
                        onChange={(v: OutputDelivery) => {
                          app.setDefaultDelivery({ client: v })
                          toast(`Client default delivery set to ${v === 'link' ? 'Web link' : 'PDF'}`)
                        }}
                        options={[
                          { value: 'pdf', label: 'PDF' },
                          { value: 'link', label: 'Web link (read-only)' },
                        ]}
                      />
                    </Field>
                  </div>
                </div>
              </BezelCard>

              <BezelCard
                icon={<Sparkles />}
                title="Probe 2 · Resume format & delivery test (§8.2)"
                description="Checkpoint target: 40 sends per style per audience. Measuring positive reply rates for Creative vs Traditional and open/forward rates for Web link vs PDF."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Creative (visual cards)</span>
                        <span className="font-mono text-[10px] text-muted-foreground tnum">{app.probe2Stats.creativeSends} / 40 sends</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-[11px] text-muted-foreground">Interested replies</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">
                            {app.probe2Stats.creativeInterested} ({Math.round((app.probe2Stats.creativeInterested / Math.max(1, app.probe2Stats.creativeSends)) * 100)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">Prospect reply</div>
                          <div className="font-mono text-sm font-semibold text-success tnum">36%</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">Client reply</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">28%</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Traditional (Word-style)</span>
                        <span className="font-mono text-[10px] text-muted-foreground tnum">{app.probe2Stats.traditionalSends} / 40 sends</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-[11px] text-muted-foreground">Interested replies</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">
                            {app.probe2Stats.traditionalInterested} ({Math.round((app.probe2Stats.traditionalInterested / Math.max(1, app.probe2Stats.traditionalSends)) * 100)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">Prospect reply</div>
                          <div className="font-mono text-sm font-semibold text-foreground tnum">25%</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">Client reply</div>
                          <div className="font-mono text-sm font-semibold text-success tnum">41%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-xs">
                    <span className="text-foreground">
                      <strong>Delivery comparison:</strong> Web links opened on <span className="font-mono">82%</span> of prospect pitches (avg 1.8 views · revocable anytime in Resumes) vs <span className="font-mono">64%</span> for PDF attachments.
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground tnum">
                      {app.probe2Stats.creativeSends + app.probe2Stats.traditionalSends} / 80 total sends
                    </span>
                  </div>
                </div>
              </BezelCard>

              <BezelCard
                icon={<FileText />}
                title="Masked resume templates (prospect outreach)"
                description="Used for one-click masked PDFs (~400–500/month). Assumed facts and predicted skills are never printed."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {maskedTpls.map(t => {
                      const isDefault = defaultMaskedTpl === t.id
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            'flex flex-col justify-between rounded-xl border p-3.5 transition-all',
                            isDefault ? 'border-primary bg-secondary/60 shadow-xs' : 'border-border bg-background',
                            !t.active && 'opacity-60',
                          )}
                        >
                          <div className="space-y-3">
                            {/* Mini page thumbnail */}
                            <div className="rounded-lg border border-border bg-card p-2.5 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-border pb-1.5">
                                <span className="flex size-3.5 items-center justify-center rounded-[2px] bg-primary font-mono text-[8px] font-bold text-primary-foreground">H</span>
                                <span className="font-mono text-[9px] text-muted-foreground">LAYOUT {t.id}</span>
                              </div>
                              <div className="mt-2 space-y-1">
                                {t.lines.map(line => (
                                  <div key={line} className="truncate rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[9px] text-gray-1100">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <Field label={`Layout ${t.id} name`}>
                              <Input
                                aria-label={`Layout ${t.id} name`}
                                value={t.name}
                                onChange={e =>
                                  setMaskedTpls(prev => prev.map(x => (x.id === t.id ? { ...x, name: e.target.value } : x)))
                                }
                              />
                            </Field>

                            <p className="text-xs leading-relaxed text-muted-foreground">{t.desc}</p>

                            <div className="space-y-1.5 border-t border-border pt-2.5">
                              <div className="eyebrow text-[9px] text-gray-1000">Sections included</div>
                              <Checkbox
                                checked={t.sections.ourTake}
                                onChange={v =>
                                  setMaskedTpls(prev => prev.map(x => (x.id === t.id ? { ...x, sections: { ...x.sections, ourTake: v } } : x)))
                                }
                                label="Our take"
                              />
                              <Checkbox
                                checked={t.sections.impactNumbers}
                                onChange={v =>
                                  setMaskedTpls(prev => prev.map(x => (x.id === t.id ? { ...x, sections: { ...x.sections, impactNumbers: v } } : x)))
                                }
                                label="Impact numbers"
                              />
                              <Checkbox
                                checked={t.sections.education}
                                onChange={v =>
                                  setMaskedTpls(prev => prev.map(x => (x.id === t.id ? { ...x, sections: { ...x.sections, education: v } } : x)))
                                }
                                label="Education"
                              />
                            </div>
                          </div>

                          <div className="mt-3 space-y-2 border-t border-border pt-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Active in builder</span>
                              <Switch
                                aria-label={`Active layout ${t.id}`}
                                checked={t.active}
                                onChange={v =>
                                  setMaskedTpls(prev => prev.map(x => (x.id === t.id ? { ...x, active: v } : x)))
                                }
                              />
                            </div>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={isDefault}
                              onClick={() => setDefaultMaskedTpl(t.id)}
                              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5 text-left font-medium hover:bg-muted"
                            >
                              <span>{isDefault ? 'Default layout' : 'Set as default'}</span>
                              <span className={cn('size-3.5 rounded-full border', isDefault ? 'border-primary bg-primary' : 'border-gray-700')} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <InfoNote>New layouts need developer work. Admins can rename layouts, toggle optional sections, and pick the workspace default.</InfoNote>
                </div>
              </BezelCard>

              <BezelCard
                icon={<FileText />}
                title="Editable resume template (onboarded clients)"
                description="Keeps candidate identity and reorders or rewords existing bullets with source traceability."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Editable layout" hint="Used when exporting editable PDFs or DOCX files.">
                    <Select
                      size="lg"
                      value={editableStyle}
                      onChange={setEditableStyle}
                      options={['Classic single-column', 'Modern executive with summary band']}
                    />
                  </Field>
                  <Field label="Traceability guardrail" hint="Enforced on all editable resumes.">
                    <Input value="Every change must cite RESUME or CALL" disabled />
                  </Field>
                </div>
              </BezelCard>
            </div>
          )}

          {/* ==================== TAB: TEAM & ACCESS (T5) ==================== */}
          {tab === 'team' && isAdmin && (
            <div className="space-y-6">
              <BezelCard
                icon={<Users />}
                title="Workspace members"
                action={
                  <Button variant="outline" size="sm" icon={<Plus />} onClick={() => setInviteOpen(true)}>
                    Invite member
                  </Button>
                }
                description="Assign each team member one of the three fixed access roles: Admin, Recruiter, or Associate."
              >
                <div className="divide-y divide-border">
                  {app.team.map(m => (
                    <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar initials={m.initials} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {m.name} <span className="text-xs font-normal text-muted-foreground">· {m.title}</span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {m.email} · Signs as “{signature(m)}”
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label={`Access for ${m.name}`}
                          value={m.access}
                          onChange={v => {
                            app.updateTeamMember(m.id, { access: v as AccessRole })
                            toast(`${m.displayName} is now ${v}`)
                          }}
                          options={['Admin', 'Recruiter', 'Associate']}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BezelCard>

              <BezelCard
                icon={<ShieldCheck />}
                title="Access matrix (three fixed roles)"
                description="Gated actions stay visible with a lock and a tooltip explaining who can take the action (N24)."
              >
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-gray-100/90">
                        <th className="eyebrow px-3 py-2 text-[10px] text-gray-1000">Action</th>
                        <th className="eyebrow px-3 py-2 text-center text-[10px] text-gray-1000">Admin</th>
                        <th className="eyebrow px-3 py-2 text-center text-[10px] text-gray-1000">Recruiter</th>
                        <th className="eyebrow px-3 py-2 text-center text-[10px] text-gray-1000">Associate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ACCESS_MATRIX_ROWS.map(row => {
                        const roles = PERMISSIONS[row.perm]
                        return (
                          <tr key={row.perm}>
                            <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                            {(['Admin', 'Recruiter', 'Associate'] as AccessRole[]).map(r => (
                              <td key={r} className="px-3 py-2 text-center">
                                {roles.includes(r) ? (
                                  <span className="inline-flex items-center justify-center text-success" aria-label="Allowed">
                                    <Check className="size-4" />
                                  </span>
                                ) : (
                                  <span className="font-mono text-muted-foreground" aria-label="Not allowed">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </BezelCard>
            </div>
          )}

          {/* ==================== TAB: MY PROFILE (T8) ==================== */}
          {tab === 'profile' && (
            <div className="space-y-6">
              <BezelCard
                icon={<UserCircle />}
                title="My profile & take signature"
                description="Used when you approve and sign “Our take” on a candidate profile or resume builder (P13)."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Display name" hint="Shown on signed takes and activity log entries.">
                      <Input
                        aria-label="Display name"
                        value={profileDisplayName}
                        onChange={e => setProfileDisplayName(e.target.value)}
                      />
                    </Field>
                    <Field label="Title" hint="Printed after your name on signed takes.">
                      <Input
                        aria-label="Title"
                        value={profileTitle}
                        onChange={e => setProfileTitle(e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Work email">
                      <Input value={app.currentUser.email} disabled />
                    </Field>
                    <Field label="Workspace role">
                      <Input value={app.currentUser.access} disabled />
                    </Field>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
                    <div className="eyebrow text-[10px] text-gray-1000">Live signature preview</div>
                    <blockquote className="mt-1.5 border-l-2 border-foreground pl-3 text-sm italic text-foreground">
                      “The most commercially sharp payments PM I have spoken to this quarter.”
                      <footer className="mt-1 not-italic text-xs text-muted-foreground">
                        — {profileDisplayName || app.currentUser.displayName}, {profileTitle || app.currentUser.title}
                      </footer>
                    </blockquote>
                  </div>
                </div>
              </BezelCard>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            {tab === 'profile'
              ? 'Your signature updates everywhere your takes appear.'
              : 'Changes apply immediately across matching and resume builder views.'}
          </span>
          <Button variant="primary" onClick={handleSave}>
            {tab === 'profile' ? 'Save profile' : 'Save changes'}
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
          <Field label="Title (for signed takes)">
            <Input placeholder="e.g. Talent Partner, HeroScouter" value={inviteTitle} onChange={e => setInviteTitle(e.target.value)} />
          </Field>
          <Field label="Work email">
            <Input placeholder="aman@heroscouter.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          </Field>
          <Field label="Access role">
            <Select
              size="lg"
              value={inviteAccess}
              onChange={v => setInviteAccess(v as AccessRole)}
              options={['Associate', 'Recruiter', 'Admin']}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
