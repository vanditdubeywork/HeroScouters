/* ==========================================================================
   Domain types — mirror PRD v0.4 §9 data requirements (superset of v0.2/v0.3)
   ========================================================================== */

export type Category = 'Engineering' | 'Product' | 'Marketing' | 'Design' | 'Data' | 'Sales' | 'Ops'
export const CATEGORIES: Category[] = ['Engineering', 'Product', 'Marketing', 'Design', 'Data', 'Sales', 'Ops']
export const SUBCATEGORIES: Record<Category, string[]> = {
  Engineering: ['Full-stack', 'Frontend', 'Backend', 'Mobile', 'DevOps'],
  Product: ['Product Manager', 'Technical PM', 'Growth PM'],
  Marketing: ['Growth marketing', 'Lifecycle', 'Content', 'Product marketing', 'Performance'],
  Design: ['Product design', 'Brand', 'UX research'],
  Data: ['Data science', 'Analytics', 'Data engineering'],
  Sales: ['Account executive', 'SDR', 'Sales ops'],
  Ops: ['BizOps', 'People ops', 'Customer success'],
}

/** N6 source badge kinds */
export type SourceKind = 'RESUME' | 'CALL' | 'JD' | 'RESEARCH' | 'EDITED' | 'ASSUMED' | 'PREDICTED'

export type WorkMode = 'Remote' | 'Hybrid' | 'Onsite'
export type AuthStatus = 'US citizen' | 'Green card' | 'Visa'
export type VisaType = 'OPT' | 'STEM OPT' | 'H-1B' | 'Other'

export interface WorkAuth {
  status: AuthStatus | null
  visaType?: VisaType | null
  expiryMonths?: number | null
  needsSponsorship?: boolean | null
  needsTransfer?: boolean | null
  notes?: string
}

export interface Company {
  name: string
  descriptor: string // e.g. "Series B US fintech, ~200 people"
  title: string
  start: string
  end: string
  show?: boolean // masked: Describe (false) / Show (true)
}

export interface PredictedSkill {
  name: string
  basis: string // "from Meta + Google Ads, 6 yrs"
  strength: 'High' | 'Medium'
}

export interface Candidate {
  id: string
  name: string
  initials: string
  headline: string
  category: Category
  subcategory: string
  years: number | null
  city: string | null
  metro: string | null
  workModes: WorkMode[] | null
  relocate: 'Yes' | 'No' | 'Specific' | null
  relocatePlaces?: string[]
  locationsOpen?: string[]
  companyPrefs?: string[]
  workAuth: WorkAuth
  pay: string | null
  availability: string | null
  searchStatus: 'Active' | 'Passive' | null
  skills: string[]
  predicted: PredictedSkill[]
  tools: string[]
  companies: Company[]
  achievements: string[]
  education?: { degree: string; field: string; school: string }
  completeness: number
  askList: string[]
  updated: string
  source: 'Outreach' | 'Referral' | 'Inbound'
  cameInForRole?: string
  resumeVersion: number
  lastContacted: string
  email?: string
  phone?: string
  linkedin?: string
  ourTake?: string
  /** v0.3 · T4 — Domain column (multi-value) */
  domains: string[] | null
  /** v0.3 · T8 — call ids on record (takes only draft when ≥1 call or note exists) */
  calls?: { id: string; label: string; when: string; by: string }[]
  /** v0.4 · C9 — source links (Drive, Dropbox, LinkedIn PDF, outreach sheet) */
  sourceLinks?: { label: string; url: string; addedAt: string }[]
  /** field → source badge */
  fieldSources: Record<string, SourceKind>
  example?: boolean
}

export type MatchStatusFlag = 'up-to-date' | 'out-of-date' | 'not-run'
export type RoleStatus = 'Open' | 'On hold' | 'Closed'

/* ---------- v0.4 · §7.1 Unified Role Requirements (replaces separate must/nice/client-asks) ---------- */
export type RequirementEffect = 'eliminates' | 'improves'
export type RequirementColumn =
  | 'Minimum years'
  | 'Work authorization'
  | 'Location'
  | 'Category'
  | 'Sub-category'
  | 'Domain'
  | 'Skills'
  | 'Pay'
  | 'Availability'

/** Only these 4 columns can eliminate in Stage 1 (§7.1 table) */
export const ELIMINATOR_COLUMNS: RequirementColumn[] = [
  'Minimum years',
  'Work authorization',
  'Location',
  'Category',
]

export interface RoleRequirement {
  id: string
  roleId: string
  text: string
  source: 'JD' | 'Call' | 'Email' | 'Chat'
  saidBy?: string // e.g. "Sean (VP Product)"
  when?: string
  effect: RequirementEffect
  column?: RequirementColumn
  addedBy: string
  /** Evidence per candidate for free-text / signal requirements */
  evidence?: Record<string, 'found' | 'not-found'>
}

export interface HiringContact {
  name: string
  title?: string
  email: string
}

export interface Role {
  id: string
  title: string
  company: string
  companyType: 'Client' | 'Prospect'
  companySource: 'Client JD' | 'Public posting URL' | 'Intake call' | 'No JD'
  category: Category
  subcategory: string
  seniority: string
  minYears: number
  location: string
  workMode: WorkMode
  relocationAccepted: boolean | null
  sponsorship: 'Yes' | 'No' | 'Unknown'
  transfer: 'Yes' | 'No' | 'Unknown'
  mustSkills: string[]
  niceSkills: string[]
  pay: string
  whatGood?: string
  research?: string
  interview?: string
  status: RoleStatus
  jdVersion: number
  matchStatus: MatchStatusFlag
  outOfDateReason?: string
  shortlisted: number
  updated: string
  passCount: number
  jdText?: string
  postingUrl?: string
  /** v0.3 · T2 */
  scoredCount: number
  aiScoresUsed: number
  /** v0.3 · T9 — "Scan done · 5 suggested · 22 not scored" · who · when */
  latestUpdate?: { text: string; who: string; when: string }
  /** v0.4 · C5 Auto-scan suggested count */
  suggestedCount?: number
  /** v0.4 · C2/C4 Hiring contact for 1-click Gmail drafts */
  hiringContact?: HiringContact
  /** v0.4 · C6/T7 Unified requirements list */
  requirements?: RoleRequirement[]
}

export type Band = 'Strong' | 'Good' | 'Stretch'
/** v0.4 · C6 Recommendation replaces Fit band + numeric score on screen */
export type Recommendation = 'Strong' | 'Mild' | 'Not recommended'

export type ChipKind = 'evidence' | 'predicted' | 'assumed' | 'gap'
export interface MatchChip {
  kind: ChipKind
  label: string
  detail?: string
}

/** v0.4 · C6 Requirement check item on scored rows */
export interface RequirementMetItem {
  reqId: string
  label: string
  result: 'met' | 'not-met' | 'assumed' | 'predicted'
  evidence?: string
}

/** v0.4 · C10 Not interested reasons */
export const NOT_INTERESTED_REASONS = ['Pay', 'Location', 'Company', 'Role type', 'Timing', 'Not looking', 'Other'] as const
export type NotInterestedReason = (typeof NOT_INTERESTED_REASONS)[number]

export type MatchRowStatus = 'new' | 'shortlisted' | 'rejected' | 'requalified' | 'not-interested'

/** v0.4 · C2 Alignment states (candidate side & client/prospect side, in either order) */
export type CandidateSideState = 'not-asked' | 'asked' | 'interested' | 'not-interested'
export type ClientSideState = 'not-sent' | 'sent' | 'interested' | 'passed'
export type ProspectSideState = 'not-pitched' | 'pitched' | 'interested' | 'passed'

export interface MatchAlignment {
  candidateSide: CandidateSideState
  clientSide: ClientSideState
  prospectSide: ProspectSideState
  updatedBy: string
  at: string
}

export interface Match {
  id: string
  roleId: string
  candidateId: string
  rank: number
  band: Band
  score: number
  reason: string
  chips: MatchChip[]
  status: MatchRowStatus
  rejectReason?: string
  /** v0.4 · C10 reason when status === 'not-interested' */
  notInterestedReason?: NotInterestedReason
  /** after-rerun delta tag (N9) */
  delta?: 'new' | 'moved' | 'requalified'
  /** v0.3 · T2 — false = passed stage 1 but not AI-scored yet */
  scored: boolean
  /** v0.3 · T2 — legacy skip flag (v0.4 cuts Skip for scoring; pruning = Reject) */
  skipped?: boolean
  /** v0.3 · T2 — which run scored it */
  scoredInRun?: number
  /** v0.3 · T2 — stage-1 similarity order (lower = more similar) */
  similarity: number
  /** v0.3 · T3 — resume this match was scored on */
  scoredOnResumeId?: string
  /** v0.3 · T7 — evidence chips for client-ask must-haves with no column */
  askEvidence?: { askId: string; label: string; found: boolean }[]
  /** v0.4 · C5 — true when scored automatically on role intake auto-scan */
  suggested?: boolean
  /** v0.4 · C6 — Recommendation: Strong · Mild · Not recommended (no numeric score on screen) */
  recommendation?: Recommendation
  /** v0.4 · C6 — Requirements met breakdown (e.g. 4/4 requirements) */
  requirementsMet?: RequirementMetItem[]
  /** v0.4 · C6 — Up to 3 green flags (strengths beyond requirements) */
  greenFlags?: string[]
  /** v0.4 · C6 — Up to 3 red flags (risks) */
  redFlags?: string[]
  /** v0.4 · C2 — Bilateral alignment status for shortlisted matches */
  alignment?: MatchAlignment
}

export interface Eliminated {
  candidateId: string
  failing: string[] // rule names, e.g. ['Minimum years (3 of 6)']
}

export interface RoleMatchForCandidate {
  roleId: string
  rank: number
  band: Band
  score: number
  reason: string
  chips: MatchChip[]
  status: 'new' | 'shortlisted' | 'not-a-fit' | 'not-interested'
  notInterestedReason?: NotInterestedReason
  recommendation?: Recommendation
  requirementsMet?: RequirementMetItem[]
  greenFlags?: string[]
  redFlags?: string[]
}

/** v0.3 · T6 — "Tailored" is now "Editable" (edit in app, refine with a prompt, PDF + DOCX) */
export type OutputType = 'Masked' | 'Editable' | 'As-is'
/** v0.4 · C12 — Two resume styles to test in Probe 2 */
export type OutputStyle = 'creative' | 'traditional'
/** v0.4 · C12 — Delivery format (PDF, read-only web link, or DOCX) */
export type OutputDelivery = 'pdf' | 'link' | 'docx'

export interface OutputRevision {
  n: number
  instruction: string // "Shorter, lead with payments" · "Generated" · "Hand edit"
  scope: string // "Whole resume" | section name
  createdBy: string
  at: string
}
export interface ResumeOutput {
  id: string
  candidateId: string
  type: OutputType
  roleId: string | null
  template: string
  createdBy: string
  created: string
  stale: boolean
  /** v0.3 · T3 — which resume + version it was built from */
  sourceResumeId?: string
  sourceVersion?: number
  /** v0.3 · T5 — prompt version used */
  promptVersion?: string
  /** v0.3 · T6 — refinement revisions (latest last) */
  revisions?: OutputRevision[]
  staleReason?: string
  /** v0.4 · C12 — creative vs traditional Word-style */
  style?: OutputStyle
  /** v0.4 · C12 — pdf / link / docx */
  delivery?: OutputDelivery
  /** v0.4 · C12 — read-only shareable web link & on/off switch */
  shareUrl?: string
  linkActive?: boolean
}

/* ==========================================================================
   v0.3 & v0.4 additions
   ========================================================================== */

/** T5 · three fixed roles */
export type AccessRole = 'Admin' | 'Recruiter' | 'Associate'
export interface TeamMember {
  id: string
  name: string
  initials: string
  email: string
  access: AccessRole
  /** T8 · My profile — used to sign takes */
  displayName: string // "Vandit D."
  title: string // "Talent Partner"
}
export type Permission =
  | 'addRecords' | 'editFacts' | 'score' | 'shortlist' | 'reject'
  | 'genMasked' | 'genIdentity' | 'copyMasked' | 'copyFull' | 'signTake'
  | 'exportCsv' | 'settings' | 'delete' | 'drafts'

/** T4 · Domain column (Decision #18 — ~10 values, maintained in Settings → Skill list) */
export const DOMAINS = ['B2B SaaS', 'Payments/Fintech', 'Healthtech', 'Marketplace', 'Consumer', 'DevTools', 'AI/ML', 'E-commerce', 'Edtech', 'Enterprise'] as const

/** T3 · one profile, one or more resumes, each with versions */
export interface ResumeVersion {
  n: number
  file: string
  uploadedBy: string
  uploadedAt: string
  changesApplied: number
}
export interface Resume {
  id: string
  candidateId: string
  label: string // "Product" · "Growth"
  targetCategory: Category
  isPrimary: boolean
  headline: string
  emphasis: string[] // skills this resume leads with
  versions: ResumeVersion[]
}

/** T7 · client asks (backward compatible with v0.3; unified into RoleRequirement in v0.4) */
export type ClientAskType = 'must-column' | 'must-signal' | 'nice' | 'context'
export const CLIENT_ASK_TYPES: { value: ClientAskType; label: string; effect: string }[] = [
  { value: 'must-column', label: 'Eliminates (column)', effect: 'Hard filter on a stored column. Re-runs stage 1 for free.' },
  { value: 'must-signal', label: 'Improves score (signal)', effect: 'Checked during AI scoring with an evidence line.' },
  { value: 'nice', label: 'Improves score (nice-to-have)', effect: 'A ranking signal during AI scoring.' },
  { value: 'context', label: 'Context', effect: 'Shown on the role and passed to the email and take prompts.' },
]
export interface ClientAsk {
  id: string
  roleId: string
  text: string
  type: ClientAskType
  column?: string // when must-column: "Location" · "Work authorization"…
  source: 'Call' | 'Email' | 'Chat' | 'JD'
  saidBy?: string // "Sean (VP Product)"
  when: string
  addedBy: string
  /** evidence per candidate for must-signal asks */
  evidence?: Record<string, 'found' | 'not-found'>
}

/** T8 · a named take */
export interface Take {
  id: string
  candidateId: string
  roleId?: string | null
  text: string
  status: 'draft' | 'signed'
  authorId: string // team member id
  draftedByAI?: boolean
  approvedAt?: string
  editedSinceSigning?: boolean
  sourceCallIds: string[]
}

/** v0.4 · C3 / C4 / §7.5 / §7.7 Email drafts & Probe 1 */
export type EmailDraftKind = 'interest-check' | 'profile-share' | 'shortlist' | 'pitch' | 'roles-for-you'
export interface EmailDraftRecord {
  id: string
  kind: EmailDraftKind
  roleId?: string
  candidateIds: string[]
  recipientName: string
  recipientEmail: string
  recipientRelation: 'Onboarded client' | 'New prospect' | 'Candidate'
  subject: string
  body: string
  method: 'in-product' | 'copied-prompt'
  rounds: number
  markedSentAt?: string
  gmailDraftId?: string
  delivery?: OutputDelivery
}

/** T5 · prompt registry */
export interface PromptVersion { v: number; text: string; savedBy: string; savedAt: string; note?: string }
export interface PromptDef {
  id: string
  name: string
  usedIn: string // "S-09 Masked builder"
  group: 'Outputs' | 'Email drafts' | 'Refine presets' | 'Extraction' | 'Scoring'
  editable: boolean // false = view only in v1
  variables: string[]
  versions: PromptVersion[]
  activeVersion: number
}
/** Always appended to every output prompt, never editable */
export const LOCKED_RULES = [
  'Never invent facts. Use only what is in the profile and source resume.',
  'Never print assumed or predicted data.',
  'On masked outputs, never print contact details or the candidate’s name.',
]

export type LogKind = 'Roles' | 'Candidates' | 'Decisions' | 'Reruns' | 'Outputs' | 'Overrides'
export interface LogEntry {
  id: string
  who: string
  what: string
  record: string
  recordHref: string
  when: string
  kind: LogKind
  before?: string
  after?: string
}

export interface ProposedChange {
  id: string
  field: string
  from: string
  to: string
  source: SourceKind
}
