/* ==========================================================================
   Domain types — mirror PRD v0.2 §7.3 data requirements
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
  /** field → source badge */
  fieldSources: Record<string, SourceKind>
  example?: boolean
}

export type MatchStatusFlag = 'up-to-date' | 'out-of-date' | 'not-run'
export type RoleStatus = 'Open' | 'On hold' | 'Closed'

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
}

export type Band = 'Strong' | 'Good' | 'Stretch'
export type ChipKind = 'evidence' | 'predicted' | 'assumed' | 'gap'
export interface MatchChip {
  kind: ChipKind
  label: string
  detail?: string
}
export type MatchRowStatus = 'new' | 'shortlisted' | 'rejected' | 'requalified'

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
  /** after-rerun delta tag (N9) */
  delta?: 'new' | 'moved' | 'requalified'
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
  status: 'new' | 'shortlisted' | 'not-a-fit'
}

export type OutputType = 'Masked' | 'Tailored' | 'As-is'
export interface ResumeOutput {
  id: string
  candidateId: string
  type: OutputType
  roleId: string | null
  template: string
  createdBy: string
  created: string
  stale: boolean
}

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
