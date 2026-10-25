import type {
  Candidate, Role, Match, Eliminated, RoleMatchForCandidate, ResumeOutput, LogEntry, ProposedChange,
  TeamMember, Resume, ClientAsk, Take, PromptDef, RoleRequirement, RequirementMetItem, Recommendation, MatchAlignment,
} from './types'

/** Literal helpers: v0.3/v0.4 fields are filled in by the export maps below */
type RawCandidate = Omit<Candidate, 'domains'> & { domains?: string[] | null }
type RawRole = Omit<Role, 'scoredCount' | 'aiScoresUsed'> & { scoredCount?: number; aiScoresUsed?: number }
type RawMatch = Omit<Match, 'scored' | 'similarity'> & { scored?: boolean; similarity?: number }

/* ==========================================================================
   Example data — Product Design Doc §16 + PRD v0.4. Fictional, marked "Example".
   ========================================================================== */

export const POOL_SIZE = 412
export const OPEN_ROLES = 14

/* ---------- Named candidates (§16) ---------- */
const named: RawCandidate[] = [
  {
    id: 'priya', name: 'Priya S.', initials: 'PS', example: true,
    headline: 'Senior Product Manager · payments & B2B SaaS',
    category: 'Product', subcategory: 'Product Manager', years: 7,
    city: 'San Francisco, CA', metro: 'SF Bay Area', workModes: ['Hybrid', 'Onsite'],
    relocate: null, locationsOpen: ['SF Bay Area'], companyPrefs: ['Series B–D', 'Fintech'],
    workAuth: { status: 'Visa', visaType: 'H-1B', expiryMonths: 14, needsSponsorship: false, needsTransfer: true, notes: '' },
    pay: '$185k–$205k', availability: '30 days notice', searchStatus: 'Active',
    skills: ['Payments', 'Roadmapping', 'B2B SaaS', 'Stakeholder management', 'Pricing', 'API products'],
    predicted: [{ name: 'SQL', basis: 'from Looker + Amplitude analysis work, 4 yrs', strength: 'Medium' }],
    tools: ['Jira', 'Amplitude', 'Looker', 'Figma'],
    companies: [
      { name: 'Ledgerly', descriptor: 'Series B US fintech, ~200 people', title: 'Senior Product Manager, Payments', start: '2022', end: 'Present' },
      { name: 'Stripe', descriptor: 'Global payments company, 5,000+ people', title: 'Product Manager, Billing', start: '2019', end: '2022' },
      { name: 'Freshworks', descriptor: 'Public B2B SaaS company', title: 'Associate PM', start: '2017', end: '2019' },
    ],
    achievements: [
      'Launched instant payouts to 12k merchants; cut payout support tickets by 38%',
      'Led Atlas pricing revamp, lifting ARPA 14% in two quarters',
      'Shipped usage-based billing API adopted by 40% of new accounts in 6 months',
      'Grew self-serve checkout conversion from 61% to 72%',
    ],
    education: { degree: 'MBA', field: 'Technology management', school: 'Kellogg School of Management' },
    completeness: 62,
    askList: ['Are you open to relocating? Where to?', 'Remote, hybrid or onsite — any hard no?', 'How soon could you start?'],
    updated: '2h ago', source: 'Outreach', cameInForRole: 'northwind-spm', resumeVersion: 2, lastContacted: '3 days ago',
    email: 'priya.s@example.com', phone: '+1 415 555 0142', linkedin: 'linkedin.com/in/priya-s-example',
    ourTake: 'The most commercially sharp payments PM I have spoken to this quarter.',
    sourceLinks: [
      { label: 'Google Drive · Priya_S_PM_Oct.pdf', url: 'https://drive.google.com/file/d/1x9kPriyaPMOct/view', addedAt: '2h ago' },
      { label: 'LinkedIn profile PDF', url: 'https://linkedin.com/in/priya-s-example', addedAt: '3 weeks ago' },
    ],
    fieldSources: { headline: 'RESUME', years: 'RESUME', city: 'RESUME', workModes: 'CALL', relocate: 'ASSUMED', workAuth: 'CALL', pay: 'CALL', availability: 'EDITED', category: 'RESUME', searchStatus: 'CALL' },
  },
  {
    id: 'marcus', name: 'Marcus L.', initials: 'ML', example: true,
    headline: 'Growth Marketing Manager · paid social & lifecycle',
    category: 'Marketing', subcategory: 'Growth marketing', years: 6,
    city: 'New York, NY', metro: 'NYC', workModes: ['Onsite', 'Hybrid'],
    relocate: 'No', locationsOpen: ['NYC'], companyPrefs: ['B2B SaaS', 'Seed–Series C'],
    workAuth: { status: 'US citizen', needsSponsorship: false, needsTransfer: false },
    pay: '$150k–$165k', availability: '2 weeks', searchStatus: 'Passive',
    skills: ['Meta Ads', 'Google Ads', 'Lifecycle email', 'Attribution', 'Landing page testing', 'B2B demand gen'],
    predicted: [{ name: 'LinkedIn Ads', basis: 'from Meta + Google Ads, 6 yrs', strength: 'High' }],
    tools: ['HubSpot', 'Braze', 'GA4', 'Webflow'],
    companies: [
      { name: 'Notable', descriptor: 'Series C B2B SaaS, ~350 people', title: 'Growth Marketing Manager', start: '2021', end: 'Present' },
      { name: 'Oscar Health', descriptor: 'Public US health insurer', title: 'Performance Marketer', start: '2018', end: '2021' },
    ],
    achievements: [
      'Scaled paid social from $40k to $310k/month at a steady 2.1x ROAS',
      'Rebuilt lifecycle onboarding; trial-to-paid up 23%',
      'Cut blended CAC 31% by moving budget to high-intent search',
    ],
    education: { degree: 'BA', field: 'Economics', school: 'Rutgers University' },
    completeness: 81, askList: ['What pay range are you looking for?'],
    updated: 'Yesterday', source: 'Referral', resumeVersion: 1, lastContacted: '2 weeks ago',
    email: 'marcus.l@example.com',
    sourceLinks: [{ label: 'Google Drive · Marcus_L_Resume.pdf', url: 'https://drive.google.com/file/d/1m2MarcusGrowth/view', addedAt: '2 weeks ago' }],
    fieldSources: { headline: 'RESUME', years: 'RESUME', city: 'RESUME', workModes: 'CALL', relocate: 'CALL', workAuth: 'CALL', pay: 'EDITED', category: 'RESUME' },
  },
  {
    id: 'ana', name: 'Ana R.', initials: 'AR', example: true,
    headline: 'Full-stack Engineer · React, Node, Postgres',
    category: 'Engineering', subcategory: 'Full-stack', years: 5,
    city: 'Austin, TX', metro: 'Austin', workModes: ['Remote'],
    relocate: 'Specific', relocatePlaces: ['NYC', 'Seattle'],
    workAuth: { status: 'Visa', visaType: 'STEM OPT', expiryMonths: 5, needsSponsorship: true, needsTransfer: false, notes: 'Employer must file H-1B in next cap season.' },
    pay: '$150k–$170k', availability: 'Immediately', searchStatus: 'Active',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'GraphQL', 'AWS'],
    predicted: [{ name: 'Next.js', basis: 'from React + Vercel deployments, 3 yrs', strength: 'High' }],
    tools: ['Docker', 'GitHub Actions', 'Datadog'],
    companies: [
      { name: 'Pathwise', descriptor: 'Series A US edtech, ~60 people', title: 'Software Engineer II', start: '2021', end: 'Present' },
      { name: 'Accenture', descriptor: 'Global IT consultancy', title: 'Software Engineer', start: '2019', end: '2021' },
    ],
    achievements: ['Rebuilt checkout in React + GraphQL; p95 latency down 54%', 'Owned migration of 30 services to TypeScript'],
    education: { degree: 'MS', field: 'Computer Science', school: 'UT Austin' },
    completeness: 74, askList: ['What pay range are you looking for?'],
    updated: '3 days ago', source: 'Outreach', cameInForRole: 'lumen-fse', resumeVersion: 1, lastContacted: '5 days ago',
    email: 'ana.r@example.com',
    sourceLinks: [{ label: 'Outreach sheet row #44 · Drive PDF', url: 'https://drive.google.com/file/d/1a8AnaFullstack/view', addedAt: '5 days ago' }],
    fieldSources: { headline: 'RESUME', years: 'RESUME', city: 'RESUME', workModes: 'CALL', workAuth: 'CALL', category: 'RESUME' },
  },
  {
    id: 'dev', name: 'Dev K.', initials: 'DK', example: true,
    headline: 'Full-stack Engineer · React, Node',
    category: 'Engineering', subcategory: 'Full-stack', years: 3,
    city: 'Chicago, IL', metro: 'Chicago', workModes: ['Remote', 'Hybrid'],
    relocate: 'Yes',
    workAuth: { status: 'Green card', needsSponsorship: false, needsTransfer: false },
    pay: '$120k–$135k', availability: '30 days', searchStatus: 'Active',
    skills: ['React', 'Node.js', 'JavaScript', 'MongoDB', 'REST APIs'], predicted: [], tools: ['Git', 'Heroku'],
    companies: [{ name: 'Shiftly', descriptor: 'Seed-stage US logistics startup', title: 'Software Engineer', start: '2022', end: 'Present' }],
    achievements: ['Built driver scheduling app used by 1,800 drivers'],
    completeness: 68, askList: ['What pay range are you looking for?'],
    updated: '1 week ago', source: 'Inbound', resumeVersion: 1, lastContacted: '1 week ago',
    email: 'dev.k@example.com',
    fieldSources: {},
  },
  {
    id: 'sara', name: 'Sara M.', initials: 'SM', example: true,
    headline: 'Product Manager · consumer & marketplace',
    category: 'Product', subcategory: 'Product Manager', years: 8,
    city: 'New York, NY', metro: 'NYC', workModes: ['Hybrid'],
    relocate: 'Yes', relocatePlaces: ['SF Bay Area'],
    workAuth: { status: 'US citizen', needsSponsorship: false, needsTransfer: false },
    pay: '$210k–$230k', availability: '60 days', searchStatus: 'Passive',
    skills: ['Marketplaces', 'Experimentation', 'Consumer growth', 'Roadmapping', 'SQL'],
    predicted: [{ name: 'Payments', basis: 'from checkout + seller billing work, 2 yrs', strength: 'Medium' }],
    tools: ['Mode', 'Jira', 'Figma'],
    companies: [
      { name: 'Google', descriptor: 'Big tech company, 100k+ people', title: 'Senior Product Manager', start: '2019', end: 'Present' },
      { name: 'Etsy', descriptor: 'Public US marketplace', title: 'Product Manager', start: '2016', end: '2019' },
    ],
    achievements: ['Grew seller activation 19% with a redesigned onboarding flow'],
    completeness: 77, askList: [],
    updated: '4 days ago', source: 'Referral', resumeVersion: 1, lastContacted: 'Today',
    email: 'sara.m@example.com',
    fieldSources: {},
  },
]

/* ---------- Supporting pool (synthetic, for list density) ---------- */
type Seed = [string, string, Candidate['category'], string, number | null, string | null, Candidate['workModes'], Candidate['workAuth'], number]
const seeds: Seed[] = [
  ['Jordan T.', 'Senior PM · payments infrastructure', 'Product', 'Technical PM', 9, 'Oakland, CA', ['Hybrid'], { status: 'US citizen' }, 88],
  ['Ravi P.', 'Product Manager · fintech lending', 'Product', 'Product Manager', 6, 'San Jose, CA', null, { status: 'Green card' }, 54],
  ['Elena V.', 'Senior PM · billing & monetization', 'Product', 'Product Manager', 7, 'San Francisco, CA', ['Hybrid', 'Remote'], { status: 'Visa', visaType: 'H-1B', needsTransfer: true }, 71],
  ['Chloe W.', 'Lifecycle Marketing Lead', 'Marketing', 'Lifecycle', 7, 'Brooklyn, NY', ['Hybrid'], { status: 'US citizen' }, 83],
  ['Omar H.', 'Performance Marketer · B2B', 'Marketing', 'Performance', 5, 'Jersey City, NJ', ['Onsite'], { status: null }, 41],
  ['Hannah B.', 'Content Marketing Manager', 'Marketing', 'Content', 4, 'Remote (US)', ['Remote'], { status: 'US citizen' }, 66],
  ['Leo G.', 'Product Marketing Manager · devtools', 'Marketing', 'Product marketing', 6, 'Seattle, WA', ['Remote'], { status: 'Visa', visaType: 'H-1B', needsTransfer: true }, 72],
  ['Mei C.', 'Growth Marketer · PLG', 'Marketing', 'Growth marketing', 5, 'New York, NY', ['Hybrid'], { status: 'Green card' }, 90],
  ['Tomás A.', 'Backend Engineer · Go, Kafka', 'Engineering', 'Backend', 6, 'Denver, CO', ['Remote'], { status: 'US citizen' }, 79],
  ['Nina F.', 'Frontend Engineer · React, design systems', 'Engineering', 'Frontend', 4, 'Remote (US)', ['Remote'], { status: 'Visa', visaType: 'OPT', needsSponsorship: true }, 58],
  ['Kwame O.', 'Full-stack Engineer · Rails, React', 'Engineering', 'Full-stack', 7, 'Atlanta, GA', ['Remote', 'Hybrid'], { status: 'US citizen' }, 86],
  ['Isha N.', 'Full-stack Engineer · Node, Vue', 'Engineering', 'Full-stack', 4, null, null, { status: null }, 32],
  ['Ben R.', 'Mobile Engineer · iOS, Swift', 'Engineering', 'Mobile', 5, 'Los Angeles, CA', ['Hybrid'], { status: 'US citizen' }, 70],
  ['Fatima Z.', 'Product Designer · fintech', 'Design', 'Product design', 6, 'San Francisco, CA', ['Hybrid'], { status: 'Visa', visaType: 'H-1B', needsTransfer: true }, 75],
  ['Arjun M.', 'Data Scientist · experimentation', 'Data', 'Data science', 5, 'Boston, MA', ['Remote'], { status: 'Visa', visaType: 'STEM OPT', needsSponsorship: true, expiryMonths: 9 }, 63],
  ['Grace L.', 'Analytics Engineer · dbt, Snowflake', 'Data', 'Analytics', 4, 'Remote (US)', ['Remote'], { status: 'US citizen' }, 80],
  ['Diego S.', 'Account Executive · mid-market SaaS', 'Sales', 'Account executive', 6, 'Austin, TX', ['Onsite', 'Hybrid'], { status: 'US citizen' }, 69],
  ['Paul K.', 'BizOps Manager', 'Ops', 'BizOps', 5, 'Chicago, IL', ['Hybrid'], { status: 'Green card' }, 57],
  ['Yuki T.', 'UX Researcher · B2B', 'Design', 'UX research', 6, 'Seattle, WA', ['Remote'], { status: 'US citizen' }, 73],
  ['Sam D.', 'DevOps Engineer · Kubernetes, AWS', 'Engineering', 'DevOps', 8, 'Remote (US)', ['Remote'], { status: 'US citizen' }, 84],
]

const supporting: RawCandidate[] = seeds.map(([name, headline, category, subcategory, years, city, workModes, workAuth, completeness], i) => {
  const initials = name.split(' ').map(s => s[0]).join('').replace('.', '')
  const metro = city ? city.split(',')[0].replace('Brooklyn', 'NYC').replace('New York', 'NYC').replace('Jersey City', 'NYC').replace('Oakland', 'SF Bay Area').replace('San Jose', 'SF Bay Area').replace('San Francisco', 'SF Bay Area') : null
  const ago = ['1h ago', '5h ago', 'Yesterday', '2 days ago', '3 days ago', '1 week ago', '2 weeks ago'][i % 7]
  const id = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
  return {
    id,
    name, initials, headline, category, subcategory, years, city, metro, workModes,
    relocate: i % 3 === 0 ? null : i % 3 === 1 ? 'Yes' : 'No',
    workAuth, pay: i % 4 === 0 ? null : '$140k–$175k', availability: i % 5 === 0 ? null : '30 days',
    searchStatus: i % 2 ? 'Active' : 'Passive',
    skills: [], predicted: [], tools: [], companies: [], achievements: [],
    completeness, askList: [], updated: ago,
    source: (['Outreach', 'Referral', 'Inbound'] as const)[i % 3], resumeVersion: 1, lastContacted: ago,
    email: `${id}@example.com`,
    sourceLinks: [{ label: `Google Drive · ${name.replace(/\s+/g, '_')}.pdf`, url: `https://drive.google.com/file/d/1${id}/view`, addedAt: ago }],
    fieldSources: {}, example: true,
  }
})

/** v0.3 · T4 Domain column — extracted at parse time, editable. null = Not captured */
const DOMAIN_BY_ID: Record<string, string[] | null> = {
  priya: ['Payments/Fintech', 'B2B SaaS'], marcus: ['B2B SaaS'], ana: ['Edtech'], dev: null, sara: ['Marketplace', 'Consumer'],
  jordant: ['Payments/Fintech'], ravip: ['Payments/Fintech'], elenav: ['B2B SaaS', 'Payments/Fintech'], chloew: ['Consumer'],
  omarh: ['B2B SaaS'], hannahb: null, leog: ['DevTools'], meic: ['B2B SaaS'], tomasa: ['Healthtech'], ninaf: ['B2B SaaS'],
  kwameo: ['E-commerce'], ishan: null, benr: ['Consumer'], fatimaz: ['Payments/Fintech'], arjunm: ['AI/ML'], gracel: ['B2B SaaS'],
  diegos: ['B2B SaaS', 'Enterprise'], paulk: ['Marketplace'], yukit: ['Enterprise'], samd: ['DevTools'],
}
/** v0.3 · T8 — calls on record (takes only draft when ≥1 call or note exists) */
const CALLS_BY_ID: Record<string, Candidate['calls']> = {
  priya: [{ id: 'call-priya-1', label: 'Intro call (Fathom)', when: '3 days ago', by: 'Vandit D.' }],
  ana: [{ id: 'call-ana-1', label: 'Screen (Granola)', when: 'Yesterday', by: 'Vandit D.' }],
  marcus: [{ id: 'call-marcus-1', label: 'Intro call (Fathom)', when: '2 weeks ago', by: 'Purvesh N.' }],
  sara: [{ id: 'call-sara-1', label: 'Catch-up call', when: 'Today', by: 'Purvesh N.' }],
  jordant: [{ id: 'call-jordan-1', label: 'Screen (Fathom)', when: '4 days ago', by: 'Purvesh N.' }],
}

export const candidates: Candidate[] = [...named, ...supporting].map(c => ({
  ...c,
  domains: c.domains !== undefined ? c.domains : (DOMAIN_BY_ID[c.id] ?? null),
  calls: c.calls ?? CALLS_BY_ID[c.id] ?? [],
}))
export const candidateById = (id: string) => candidates.find(c => c.id === id)

/* ---------- v0.4 · §7.4 Outreach sheet rows for bulk candidate import (US-50) ---------- */
export const outreachSheetCandidates = [
  { id: 'sheet-1', name: 'Karan V.', headline: 'Senior Backend Engineer · Go, Postgres, Payments', category: 'Engineering' as const, years: 7, metro: 'SF Bay Area', link: 'https://drive.google.com/file/d/1kvGoPayments/view', status: 'Ready to import' },
  { id: 'sheet-2', name: 'Nadia S.', headline: 'Product Manager · B2B billing & subscriptions', category: 'Product' as const, years: 6, metro: 'NYC', link: 'https://drive.google.com/file/d/1nsBillingPM/view', status: 'Ready to import' },
  { id: 'sheet-3', name: 'priya', nameLabel: 'Priya S. (duplicate email)', headline: 'Senior Product Manager · payments & B2B SaaS', category: 'Product' as const, years: 7, metro: 'SF Bay Area', link: 'https://drive.google.com/file/d/1x9kPriyaPMOct/view', status: 'Duplicate in pool' },
]

/* ---------- v0.4 · §7.1 Unified Role Requirements ---------- */
export const roleRequirementsByRole: Record<string, RoleRequirement[]> = {
  'northwind-spm': [
    { id: 'req-nw-1', roleId: 'northwind-spm', text: '6+ years in Product Management', source: 'JD', effect: 'eliminates', column: 'Minimum years', addedBy: 'Purvesh N.', when: '20 min ago' },
    { id: 'req-nw-2', roleId: 'northwind-spm', text: 'San Francisco hybrid (3 days/wk) or open to relocate', source: 'JD', effect: 'eliminates', column: 'Location', addedBy: 'Purvesh N.', when: '3 days ago' },
    { id: 'req-nw-3', roleId: 'northwind-spm', text: 'No sponsorship — H-1B transfer is fine', source: 'Call', saidBy: 'Sean (VP Product)', effect: 'eliminates', column: 'Work authorization', addedBy: 'Purvesh N.', when: 'Yesterday' },
    { id: 'req-nw-4', roleId: 'northwind-spm', text: 'Hands-on payments experience (payouts, ledgers or billing)', source: 'JD', effect: 'improves', column: 'Skills', addedBy: 'Purvesh N.', when: '3 days ago' },
    { id: 'req-nw-5', roleId: 'northwind-spm', text: 'SQL fluency to answer own data questions', source: 'JD', effect: 'improves', column: 'Skills', addedBy: 'Purvesh N.', when: '20 min ago' },
    { id: 'req-nw-6', roleId: 'northwind-spm', text: 'Has led a cross-functional team of 5+ engineers', source: 'Call', saidBy: 'Sean (VP Product)', effect: 'improves', addedBy: 'Purvesh N.', when: 'Yesterday', evidence: { priya: 'found', jordant: 'found', sara: 'found', elenav: 'not-found', ravip: 'not-found' } },
  ],
  'lumen-fse': [
    { id: 'req-lu-1', roleId: 'lumen-fse', text: '4+ years full-stack engineering', source: 'JD', effect: 'eliminates', column: 'Minimum years', addedBy: 'Vandit D.', when: '2 days ago' },
    { id: 'req-lu-2', roleId: 'lumen-fse', text: 'US remote (sponsorship & transfer supported)', source: 'JD', effect: 'eliminates', column: 'Location', addedBy: 'Vandit D.', when: '2 days ago' },
    { id: 'req-lu-3', roleId: 'lumen-fse', text: 'Production React + Node.js', source: 'JD', effect: 'improves', column: 'Skills', addedBy: 'Vandit D.', when: '2 days ago' },
    { id: 'req-lu-4', roleId: 'lumen-fse', text: 'TypeScript & PostgreSQL experience', source: 'JD', effect: 'improves', column: 'Skills', addedBy: 'Vandit D.', when: '2 days ago' },
  ],
  'brightdesk-gmm': [
    { id: 'req-bd-1', roleId: 'brightdesk-gmm', text: '5+ years in Growth or Performance Marketing', source: 'JD', effect: 'eliminates', column: 'Minimum years', addedBy: 'Vandit D.', when: '35 min ago' },
    { id: 'req-bd-2', roleId: 'brightdesk-gmm', text: 'NYC onsite (no relocation)', source: 'JD', effect: 'eliminates', column: 'Location', addedBy: 'Vandit D.', when: '35 min ago' },
    { id: 'req-bd-3', roleId: 'brightdesk-gmm', text: 'Authorized to work in US without sponsorship or transfer', source: 'JD', effect: 'eliminates', column: 'Work authorization', addedBy: 'Vandit D.', when: '35 min ago' },
    { id: 'req-bd-4', roleId: 'brightdesk-gmm', text: 'LinkedIn Ads at scale + B2B demand gen', source: 'JD', effect: 'improves', column: 'Skills', addedBy: 'Vandit D.', when: '35 min ago' },
  ],
  'cobalt-ds': [
    { id: 'req-cb-1', roleId: 'cobalt-ds', text: '3+ years in Data Science or Analytics', source: 'JD', effect: 'eliminates', column: 'Minimum years', addedBy: 'Vandit D.', when: '10 min ago' },
    { id: 'req-cb-2', roleId: 'cobalt-ds', text: 'Boston hybrid or open to relocate', source: 'JD', effect: 'eliminates', column: 'Location', addedBy: 'Vandit D.', when: '10 min ago' },
    { id: 'req-cb-3', roleId: 'cobalt-ds', text: 'Experimentation & causal inference in Python', source: 'Call', saidBy: 'Hiring manager', effect: 'improves', column: 'Skills', addedBy: 'Vandit D.', when: '10 min ago' },
  ],
}

/* ---------- Roles (§16 + supporting) ---------- */
const rawRoles: RawRole[] = [
  {
    id: 'northwind-spm', title: 'Senior Product Manager', company: 'Northwind Pay', companyType: 'Client', companySource: 'Client JD',
    category: 'Product', subcategory: 'Product Manager', seniority: 'Senior', minYears: 6,
    location: 'San Francisco, CA', workMode: 'Hybrid', relocationAccepted: true,
    sponsorship: 'No', transfer: 'Yes', mustSkills: ['Payments', 'SQL'], niceSkills: ['API products', 'Pricing', 'B2B SaaS'],
    pay: '$170k–$190k', status: 'Open', jdVersion: 3, matchStatus: 'out-of-date',
    outOfDateReason: 'Requirements changed since the last scan: added SQL, minimum years 5 → 6.',
    shortlisted: 3, updated: '20 min ago', passCount: 27,
    hiringContact: { name: 'Dana K.', title: 'VP Product', email: 'dana@northwindpay.com' },
    whatGood: 'Has owned a payments surface end to end and can talk to engineers about ledgers. Last good hire came from a Series B fintech; last bad hire was a big-tech PM who needed too much structure.',
    research: 'Hiring manager: Dana K., VP Product (ex-Plaid). Founders: two ex-Square engineers. Raised Series B, $40M, 2025.',
    interview: 'Recruiter screen → HM (45 min) → product case → team loop (3) → founder chat.',
    jdText: 'Northwind Pay is hiring a Senior Product Manager to own merchant payouts and treasury. You will work with a team of 8 engineers…\n\nRequirements\n• 6+ years in product management\n• Hands-on payments experience (payouts, ledgers or billing)\n• Comfortable writing SQL to answer your own questions\n• Hybrid in San Francisco, 3 days a week\n\nNice to have\n• API or platform products\n• Pricing and packaging experience',
  },
  {
    id: 'cobalt-ds', title: 'Data Scientist', company: 'Cobalt Labs', companyType: 'Prospect', companySource: 'No JD',
    category: 'Data', subcategory: 'Data science', seniority: 'Mid', minYears: 3, location: 'Boston, MA', workMode: 'Hybrid', relocationAccepted: true,
    sponsorship: 'Yes', transfer: 'Yes', mustSkills: ['Experimentation', 'Python'], niceSkills: ['SQL', 'dbt'], pay: '$155k–$175k',
    status: 'Open', jdVersion: 1, matchStatus: 'up-to-date', shortlisted: 0, updated: '10 min ago', passCount: 27,
    hiringContact: { name: 'maya@cobaltlabs.ai', title: 'Head of Data', email: 'maya@cobaltlabs.ai' },
  },
  {
    id: 'brightdesk-gmm', title: 'Growth Marketing Manager', company: 'Brightdesk', companyType: 'Client', companySource: 'Client JD',
    category: 'Marketing', subcategory: 'Growth marketing', seniority: 'Manager', minYears: 5,
    location: 'New York, NY', workMode: 'Onsite', relocationAccepted: false,
    sponsorship: 'No', transfer: 'No', mustSkills: ['LinkedIn Ads'], niceSkills: ['Lifecycle email', 'B2B demand gen', 'HubSpot'],
    pay: '$140k–$160k', status: 'Open', jdVersion: 1, matchStatus: 'not-run', shortlisted: 0, updated: '35 min ago', passCount: 22,
    hiringContact: { name: 'Alex R.', title: 'VP Marketing', email: 'alex@brightdesk.io' },
    jdText: 'Brightdesk (B2B SaaS) needs a Growth Marketing Manager in NYC, onsite. 5+ years. Must have run LinkedIn Ads at scale.',
  },
  {
    id: 'lumen-fse', title: 'Full-stack Engineer', company: 'Lumen AI', companyType: 'Prospect', companySource: 'Public posting URL',
    category: 'Engineering', subcategory: 'Full-stack', seniority: 'Mid–Senior', minYears: 4,
    location: 'Remote (US)', workMode: 'Remote', relocationAccepted: null,
    sponsorship: 'Yes', transfer: 'Yes', mustSkills: ['React', 'Node.js'], niceSkills: ['TypeScript', 'PostgreSQL', 'LLM apps'],
    pay: '$150k–$180k', status: 'Open', jdVersion: 1, matchStatus: 'up-to-date', shortlisted: 2, updated: '1h ago', passCount: 64,
    hiringContact: { name: 'Samir T.', title: 'CTO & Co-founder', email: 'samir@lumen.ai' },
    postingUrl: 'https://jobs.lumen.ai/full-stack-engineer',
    jdText: 'Lumen AI (Series A) is looking for a Full-stack Engineer to build our customer-facing analytics app. React + Node, 4+ years. Remote in the US. We sponsor visas.',
  },
  {
    id: 'harbor-be', title: 'Backend Engineer', company: 'Harbor Health', companyType: 'Client', companySource: 'Client JD',
    category: 'Engineering', subcategory: 'Backend', seniority: 'Senior', minYears: 5, location: 'Remote (US)', workMode: 'Remote', relocationAccepted: null,
    sponsorship: 'No', transfer: 'Unknown', mustSkills: ['Go', 'Kafka'], niceSkills: ['HIPAA'], pay: '$170k–$200k',
    status: 'Open', jdVersion: 2, matchStatus: 'up-to-date', shortlisted: 4, updated: '2 days ago', passCount: 41,
    hiringContact: { name: 'Claire M.', title: 'VP Engineering', email: 'claire@harborhealth.com' },
  },
  {
    id: 'quill-pmm', title: 'Product Marketing Manager', company: 'Quill', companyType: 'Prospect', companySource: 'Public posting URL',
    category: 'Marketing', subcategory: 'Product marketing', seniority: 'Senior', minYears: 5, location: 'Seattle, WA', workMode: 'Hybrid', relocationAccepted: true,
    sponsorship: 'Unknown', transfer: 'Unknown', mustSkills: ['Developer marketing'], niceSkills: ['Launches'], pay: '$150k–$175k',
    status: 'Open', jdVersion: 1, matchStatus: 'up-to-date', shortlisted: 1, updated: '3 days ago', passCount: 22,
    hiringContact: { name: 'Devon L.', title: 'Head of Growth', email: 'devon@quill.dev' },
  },
  {
    id: 'atlas-pd', title: 'Product Designer', company: 'Atlas Freight', companyType: 'Client', companySource: 'Intake call',
    category: 'Design', subcategory: 'Product design', seniority: 'Mid', minYears: 4, location: 'San Francisco, CA', workMode: 'Hybrid', relocationAccepted: false,
    sponsorship: 'Yes', transfer: 'Yes', mustSkills: ['Figma', 'B2B workflows'], niceSkills: [], pay: '$140k–$165k',
    status: 'Open', jdVersion: 1, matchStatus: 'out-of-date', outOfDateReason: 'Work mode changed: Onsite → Hybrid.', shortlisted: 2, updated: '5h ago', passCount: 18,
    hiringContact: { name: 'Nora B.', title: 'Head of Design', email: 'nora@atlasfreight.com' },
  },
  {
    id: 'pine-ae', title: 'Account Executive', company: 'Pinecrest', companyType: 'Client', companySource: 'Client JD',
    category: 'Sales', subcategory: 'Account executive', seniority: 'Mid', minYears: 4, location: 'Austin, TX', workMode: 'Onsite', relocationAccepted: false,
    sponsorship: 'No', transfer: 'No', mustSkills: ['Mid-market SaaS'], niceSkills: [], pay: '$90k base + OTE',
    status: 'Open', jdVersion: 1, matchStatus: 'up-to-date', shortlisted: 3, updated: '1 week ago', passCount: 15,
    hiringContact: { name: 'Brett K.', title: 'CRO', email: 'brett@pinecrest.io' },
  },
  {
    id: 'vela-fe', title: 'Frontend Engineer', company: 'Vela', companyType: 'Client', companySource: 'Client JD',
    category: 'Engineering', subcategory: 'Frontend', seniority: 'Senior', minYears: 5, location: 'Remote (US)', workMode: 'Remote', relocationAccepted: null,
    sponsorship: 'Yes', transfer: 'Yes', mustSkills: ['React', 'Design systems'], niceSkills: [], pay: '$160k–$185k',
    status: 'On hold', jdVersion: 1, matchStatus: 'up-to-date', shortlisted: 2, updated: '2 weeks ago', passCount: 33,
  },
  {
    id: 'orbit-lc', title: 'Lifecycle Marketing Lead', company: 'Orbit', companyType: 'Client', companySource: 'Client JD',
    category: 'Marketing', subcategory: 'Lifecycle', seniority: 'Lead', minYears: 6, location: 'New York, NY', workMode: 'Hybrid', relocationAccepted: false,
    sponsorship: 'No', transfer: 'No', mustSkills: ['Braze'], niceSkills: [], pay: '$160k–$180k',
    status: 'Closed', jdVersion: 2, matchStatus: 'up-to-date', shortlisted: 5, updated: '1 month ago', passCount: 12,
  },
]

/** v0.4 · C5 Auto-scan + T9 latest update */
const ROLE_V4: Record<string, Pick<Role, 'scoredCount' | 'aiScoresUsed' | 'suggestedCount' | 'latestUpdate'>> = {
  'northwind-spm': { scoredCount: 7, suggestedCount: 5, aiScoresUsed: 17, latestUpdate: { text: 'JD v3: requirements changed', who: 'Purvesh', when: '20 min ago' } },
  'cobalt-ds': { scoredCount: 5, suggestedCount: 5, aiScoresUsed: 5, latestUpdate: { text: 'Scan done · 5 suggested · 22 not scored', who: 'Auto-scan', when: '10 min ago' } },
  'brightdesk-gmm': { scoredCount: 0, suggestedCount: 0, aiScoresUsed: 0, latestUpdate: { text: '22 not scored · ready to prune or score', who: 'Vandit', when: '35 min ago' } },
  'lumen-fse': { scoredCount: 5, suggestedCount: 5, aiScoresUsed: 10, latestUpdate: { text: 'Shortlist ready (2) · 1 pitched', who: 'Vandit', when: '1h ago' } },
  'harbor-be': { scoredCount: 10, suggestedCount: 5, aiScoresUsed: 20, latestUpdate: { text: '2 aligned · waiting on 2 candidates', who: 'Purvesh', when: '2 days ago' } },
  'quill-pmm': { scoredCount: 5, suggestedCount: 5, aiScoresUsed: 5, latestUpdate: { text: '1 shortlisted · ready to pitch', who: 'Purvesh', when: '3 days ago' } },
  'atlas-pd': { scoredCount: 10, suggestedCount: 5, aiScoresUsed: 10, latestUpdate: { text: 'Work mode changed: Onsite → Hybrid', who: 'Vandit', when: '5h ago' } },
  'pine-ae': { scoredCount: 10, suggestedCount: 5, aiScoresUsed: 10, latestUpdate: { text: 'Shortlist sent (3)', who: 'Purvesh', when: '1 week ago' } },
  'vela-fe': { scoredCount: 10, suggestedCount: 5, aiScoresUsed: 10, latestUpdate: { text: 'Put on hold', who: 'Purvesh', when: '2 weeks ago' } },
  'orbit-lc': { scoredCount: 12, suggestedCount: 5, aiScoresUsed: 12, latestUpdate: { text: 'Role closed · 5 sent', who: 'Purvesh', when: '1 month ago' } },
}

export const roles: Role[] = rawRoles.map(r => ({
  ...r,
  scoredCount: r.scoredCount ?? ROLE_V4[r.id]?.scoredCount ?? 0,
  suggestedCount: r.suggestedCount ?? ROLE_V4[r.id]?.suggestedCount ?? 0,
  aiScoresUsed: r.aiScoresUsed ?? ROLE_V4[r.id]?.aiScoresUsed ?? 0,
  latestUpdate: r.latestUpdate ?? ROLE_V4[r.id]?.latestUpdate,
  requirements: r.requirements ?? roleRequirementsByRole[r.id] ?? [
    { id: `req-${r.id}-1`, roleId: r.id, text: `${r.minYears}+ years in ${r.category}`, source: 'JD', effect: 'eliminates', column: 'Minimum years', addedBy: 'System', when: r.updated },
    { id: `req-${r.id}-2`, roleId: r.id, text: `${r.location} (${r.workMode})`, source: 'JD', effect: 'eliminates', column: 'Location', addedBy: 'System', when: r.updated },
    ...r.mustSkills.map((sk, idx) => ({ id: `req-${r.id}-sk-${idx}`, roleId: r.id, text: sk, source: 'JD' as const, effect: 'improves' as const, column: 'Skills' as const, addedBy: 'System', when: r.updated })),
  ],
}))
export const roleById = (id: string) => roles.find(r => r.id === id)

/* ---------- Matches (role → candidates) ---------- */
const rawMatches: RawMatch[] = [
  // Northwind Pay · Senior PM
  { id: 'm1', roleId: 'northwind-spm', candidateId: 'priya', rank: 1, band: 'Strong', recommendation: 'Strong', suggested: true, score: 88, status: 'new',
    reason: 'Owns merchant payouts at a Series B fintech; meets every requirement on evidence except SQL, which is predicted from 4 years of Looker and Amplitude.',
    requirementsMet: [
      { reqId: 'req-nw-1', label: '6+ years in Product Management', result: 'met', evidence: '7 yrs PM (Ledgerly, Stripe, Freshworks)' },
      { reqId: 'req-nw-2', label: 'SF Bay Area hybrid', result: 'met', evidence: 'San Francisco · Hybrid' },
      { reqId: 'req-nw-3', label: 'No sponsorship (H-1B transfer OK)', result: 'met', evidence: 'H-1B transfer · 14 mo remaining' },
      { reqId: 'req-nw-4', label: 'Hands-on payments experience', result: 'met', evidence: 'Instant payouts (12k merchants) & billing API' },
      { reqId: 'req-nw-5', label: 'SQL fluency', result: 'predicted', evidence: 'Predicted from Looker + Amplitude, 4 yrs' },
      { reqId: 'req-nw-6', label: 'Led a team of 5+ engineers', result: 'met', evidence: 'Led 8-engineer payouts pod at Ledgerly' },
    ],
    greenFlags: [
      'Owned merchant payouts at a Series B fintech (~200 people)',
      'Shipped usage-based billing API adopted by 40% of new accounts',
      'Led 8-engineer cross-functional pod end to end',
    ],
    redFlags: [
      'Pay expectation ($185k–$205k) is ~8% above target range ($170k–$190k)',
    ],
    chips: [
      { kind: 'evidence', label: '7 yrs' }, { kind: 'evidence', label: 'SF hybrid' }, { kind: 'evidence', label: 'Payments' },
      { kind: 'evidence', label: 'H-1B · transfer supported' },
      { kind: 'predicted', label: 'SQL', detail: 'from Looker + Amplitude analysis work, 4 yrs' },
      { kind: 'gap', label: 'Pay +8% over range' },
    ] },
  { id: 'm2', roleId: 'northwind-spm', candidateId: 'jordant', rank: 2, band: 'Strong', recommendation: 'Strong', suggested: true, score: 85, status: 'shortlisted',
    reason: 'Nine years on payments infrastructure; writes SQL daily and has shipped payout APIs.',
    requirementsMet: [
      { reqId: 'req-nw-1', label: '6+ years in Product Management', result: 'met', evidence: '9 yrs Technical PM' },
      { reqId: 'req-nw-2', label: 'SF Bay Area hybrid', result: 'met', evidence: 'Oakland, CA · Hybrid' },
      { reqId: 'req-nw-3', label: 'No sponsorship (H-1B transfer OK)', result: 'met', evidence: 'US citizen' },
      { reqId: 'req-nw-4', label: 'Hands-on payments experience', result: 'met', evidence: 'Payments infrastructure & ledger APIs' },
      { reqId: 'req-nw-5', label: 'SQL fluency', result: 'met', evidence: 'Writes SQL daily on settlement tables' },
      { reqId: 'req-nw-6', label: 'Led a team of 5+ engineers', result: 'met', evidence: 'Led 6 backend engineers on settlement rail' },
    ],
    greenFlags: [
      'Meets 6/6 requirements directly on resume and call evidence',
      '9 years in payments infrastructure and treasury ledgers',
    ],
    redFlags: [],
    alignment: { candidateSide: 'interested', clientSide: 'interested', prospectSide: 'not-pitched', updatedBy: 'Purvesh N.', at: '1h ago' },
    chips: [{ kind: 'evidence', label: '9 yrs' }, { kind: 'evidence', label: 'Oakland hybrid' }, { kind: 'evidence', label: 'Payments' }, { kind: 'evidence', label: 'SQL' }, { kind: 'evidence', label: 'US citizen' }] },
  { id: 'm3', roleId: 'northwind-spm', candidateId: 'elenav', rank: 3, band: 'Good', recommendation: 'Mild', suggested: true, score: 80, status: 'shortlisted',
    reason: 'Runs billing and monetization for a B2B SaaS; payments adjacent with strong pricing evidence.',
    requirementsMet: [
      { reqId: 'req-nw-1', label: '6+ years in Product Management', result: 'met', evidence: '7 yrs PM' },
      { reqId: 'req-nw-2', label: 'SF Bay Area hybrid', result: 'met', evidence: 'San Francisco · Hybrid' },
      { reqId: 'req-nw-3', label: 'No sponsorship (H-1B transfer OK)', result: 'met', evidence: 'H-1B transfer' },
      { reqId: 'req-nw-4', label: 'Hands-on payments experience', result: 'met', evidence: 'Billing & subscription invoicing' },
      { reqId: 'req-nw-5', label: 'SQL fluency', result: 'predicted', evidence: 'Predicted from Mode dashboards, 3 yrs' },
      { reqId: 'req-nw-6', label: 'Led a team of 5+ engineers', result: 'not-met', evidence: 'Pod size was 3–4 engineers' },
    ],
    greenFlags: [
      'Deep B2B SaaS billing & monetization track record',
      'SF-based and ready for 3-day hybrid immediately',
    ],
    redFlags: [
      'Pod size was 3–4 engineers (Sean asked for 5+)',
    ],
    alignment: { candidateSide: 'not-asked', clientSide: 'interested', prospectSide: 'not-pitched', updatedBy: 'Purvesh N.', at: '30m ago' },
    chips: [{ kind: 'evidence', label: '7 yrs' }, { kind: 'evidence', label: 'SF hybrid' }, { kind: 'evidence', label: 'Billing' }, { kind: 'predicted', label: 'SQL', detail: 'from Mode dashboards, 3 yrs' }, { kind: 'evidence', label: 'H-1B · transfer supported' }] },
  { id: 'm4', roleId: 'northwind-spm', candidateId: 'ravip', rank: 4, band: 'Stretch', recommendation: 'Mild', suggested: true, score: 74, status: 'new',
    reason: 'Fintech lending PM with SQL; work mode was never captured, so hybrid is assumed.',
    requirementsMet: [
      { reqId: 'req-nw-1', label: '6+ years in Product Management', result: 'met', evidence: '6 yrs PM' },
      { reqId: 'req-nw-2', label: 'SF Bay Area hybrid', result: 'assumed', evidence: 'San Jose · work mode not captured' },
      { reqId: 'req-nw-3', label: 'No sponsorship (H-1B transfer OK)', result: 'met', evidence: 'Green card' },
      { reqId: 'req-nw-4', label: 'Hands-on payments experience', result: 'not-met', evidence: 'Fintech lending underwriting, not payouts' },
      { reqId: 'req-nw-5', label: 'SQL fluency', result: 'met', evidence: 'Explicit SQL on resume' },
      { reqId: 'req-nw-6', label: 'Led a team of 5+ engineers', result: 'assumed', evidence: 'Team size not captured yet' },
    ],
    greenFlags: [
      '6 years in regulated fintech lending with strong SQL',
    ],
    redFlags: [
      'Lending underwriting focus rather than merchant payouts',
      'Work mode preference not captured (hybrid assumed)',
    ],
    chips: [{ kind: 'evidence', label: '6 yrs' }, { kind: 'evidence', label: 'Fintech' }, { kind: 'evidence', label: 'SQL' }, { kind: 'assumed', label: 'Work mode' }, { kind: 'gap', label: 'Lending, not payouts' }] },
  { id: 'm5', roleId: 'northwind-spm', candidateId: 'sara', rank: 5, band: 'Stretch', recommendation: 'Mild', suggested: true, score: 71, status: 'shortlisted',
    reason: 'Eight years of marketplace PM work with SQL; payments is predicted from checkout and seller billing.',
    requirementsMet: [
      { reqId: 'req-nw-1', label: '6+ years in Product Management', result: 'met', evidence: '8 yrs PM (Google, Etsy)' },
      { reqId: 'req-nw-2', label: 'SF Bay Area hybrid', result: 'met', evidence: 'NYC · open to relocating to SF Bay Area' },
      { reqId: 'req-nw-3', label: 'No sponsorship (H-1B transfer OK)', result: 'met', evidence: 'US citizen' },
      { reqId: 'req-nw-4', label: 'Hands-on payments experience', result: 'predicted', evidence: 'Predicted from seller billing & checkout, 2 yrs' },
      { reqId: 'req-nw-5', label: 'SQL fluency', result: 'met', evidence: 'Explicit SQL & Mode analytics' },
      { reqId: 'req-nw-6', label: 'Led a team of 5+ engineers', result: 'met', evidence: 'Led 9 engineers on Etsy seller onboarding' },
    ],
    greenFlags: [
      'Strong marketplace seller payout & onboarding track record',
      'Explicit SQL and experimentation depth',
    ],
    redFlags: [
      'Pay expectation ($210k–$230k) is 21% above range ($170k–$190k)',
      '60 days notice period',
    ],
    alignment: { candidateSide: 'asked', clientSide: 'sent', prospectSide: 'not-pitched', updatedBy: 'Vandit D.', at: '2h ago' },
    chips: [{ kind: 'evidence', label: '8 yrs' }, { kind: 'evidence', label: 'SQL' }, { kind: 'evidence', label: 'Open to SF' }, { kind: 'predicted', label: 'Payments', detail: 'from checkout + seller billing work, 2 yrs' }, { kind: 'gap', label: 'Pay +21% over range' }] },
  { id: 'm6', roleId: 'northwind-spm', candidateId: 'fatimaz', rank: 6, band: 'Stretch', recommendation: 'Not recommended', score: 62, status: 'new',
    reason: 'Fintech product designer moving into PM; strong payments context but no PM title yet.',
    requirementsMet: [
      { reqId: 'req-nw-1', label: '6+ years in Product Management', result: 'not-met', evidence: '6 yrs Product Design, 0 yrs formal PM title' },
      { reqId: 'req-nw-2', label: 'SF Bay Area hybrid', result: 'met', evidence: 'San Francisco · Hybrid' },
      { reqId: 'req-nw-3', label: 'No sponsorship (H-1B transfer OK)', result: 'met', evidence: 'H-1B transfer' },
      { reqId: 'req-nw-4', label: 'Hands-on payments experience', result: 'met', evidence: 'Designed payout flows at fintech' },
      { reqId: 'req-nw-5', label: 'SQL fluency', result: 'assumed', evidence: 'Not captured on resume' },
    ],
    greenFlags: ['Deep domain familiarity with fintech payout UX'],
    redFlags: ['No formal Product Manager title yet', 'SQL not captured'],
    chips: [{ kind: 'evidence', label: 'Payments' }, { kind: 'gap', label: 'No PM title' }, { kind: 'assumed', label: 'SQL' }] },
  { id: 'm7', roleId: 'northwind-spm', candidateId: 'paulk', rank: 7, band: 'Stretch', recommendation: 'Not recommended', score: 58, status: 'rejected', rejectReason: 'Seniority',
    reason: 'BizOps lead with SQL and payments reconciliation exposure.',
    requirementsMet: [
      { reqId: 'req-nw-1', label: '6+ years in Product Management', result: 'not-met', evidence: '5 yrs BizOps' },
      { reqId: 'req-nw-5', label: 'SQL fluency', result: 'met', evidence: 'Daily SQL for reconciliation' },
    ],
    greenFlags: ['Hands-on reconciliation SQL'],
    redFlags: ['BizOps background rather than product ownership'],
    chips: [{ kind: 'evidence', label: 'SQL' }, { kind: 'predicted', label: 'Payments', detail: 'from reconciliation work' }, { kind: 'gap', label: 'Ops, not product' }] },
  { id: 'm8-ni', roleId: 'northwind-spm', candidateId: 'yukit', rank: 8, band: 'Stretch', recommendation: 'Mild', score: 70, status: 'not-interested', notInterestedReason: 'Pay',
    reason: 'Enterprise B2B researcher & PM; declined role due to compensation ceiling.',
    chips: [{ kind: 'evidence', label: '6 yrs' }] },

  // Cobalt Labs · Data Scientist (Auto-scanned on save: 5 suggested + 22 not scored — US-45 / US-47)
  { id: 'm30', roleId: 'cobalt-ds', candidateId: 'arjunm', rank: 1, band: 'Strong', recommendation: 'Strong', suggested: true, score: 89, status: 'new',
    reason: 'Five years in experimentation and causal inference in Boston; Python and SQL daily.',
    requirementsMet: [
      { reqId: 'req-cb-1', label: '3+ years in Data Science', result: 'met', evidence: '5 yrs Data Scientist' },
      { reqId: 'req-cb-2', label: 'Boston hybrid or relocate', result: 'met', evidence: 'Boston, MA' },
      { reqId: 'req-cb-3', label: 'Experimentation & Python', result: 'met', evidence: 'Owned experimentation platform in Python' },
    ],
    greenFlags: ['5 years leading A/B testing & causal inference in Boston', 'Strong Python + statistical modeling'],
    redFlags: ['STEM OPT expires in 9 months (Cobalt sponsors visas)'],
    chips: [{ kind: 'evidence', label: '5 yrs' }, { kind: 'evidence', label: 'Boston' }, { kind: 'evidence', label: 'Experimentation' }] },
  { id: 'm31', roleId: 'cobalt-ds', candidateId: 'gracel', rank: 2, band: 'Good', recommendation: 'Strong', suggested: true, score: 84, status: 'new',
    reason: 'Four years in analytics engineering (dbt, Snowflake, Python); relocation to Boston is assumed.',
    requirementsMet: [
      { reqId: 'req-cb-1', label: '3+ years in Data Science', result: 'met', evidence: '4 yrs Analytics Engineer' },
      { reqId: 'req-cb-2', label: 'Boston hybrid or relocate', result: 'assumed', evidence: 'Remote (US) · relocation not captured' },
      { reqId: 'req-cb-3', label: 'Experimentation & Python', result: 'predicted', evidence: 'Predicted from dbt + Snowflake funnel models' },
    ],
    greenFlags: ['Production dbt & Snowflake pipeline owner', 'US citizen, 80% profile completeness'],
    redFlags: ['Relocation to Boston not yet confirmed'],
    chips: [{ kind: 'evidence', label: '4 yrs' }, { kind: 'assumed', label: 'Relocation' }] },
  { id: 'm32', roleId: 'cobalt-ds', candidateId: 'sara', rank: 3, band: 'Good', recommendation: 'Mild', suggested: true, score: 78, status: 'new',
    reason: 'Heavy experimentation and SQL background at Etsy and Google; PM title rather than Data Scientist.',
    requirementsMet: [
      { reqId: 'req-cb-1', label: '3+ years in Data Science', result: 'met', evidence: '8 yrs experimentation-heavy PM' },
      { reqId: 'req-cb-2', label: 'Boston hybrid or relocate', result: 'met', evidence: 'Open to relocating' },
      { reqId: 'req-cb-3', label: 'Experimentation & Python', result: 'predicted', evidence: 'SQL + experimentation; Python not explicit' },
    ],
    greenFlags: ['Deep marketplace experimentation experience'],
    redFlags: ['PM background rather than dedicated IC Data Scientist', 'Pay ($210k+) above typical Mid DS range'],
    chips: [{ kind: 'evidence', label: 'Experimentation' }, { kind: 'gap', label: 'PM, not DS' }] },
  { id: 'm33', roleId: 'cobalt-ds', candidateId: 'priya', rank: 4, band: 'Stretch', recommendation: 'Mild', suggested: true, score: 72, status: 'new',
    reason: 'Strong quantitative experimentation in fintech, though focused on Product Management.',
    requirementsMet: [
      { reqId: 'req-cb-1', label: '3+ years in Data Science', result: 'not-met', evidence: '7 yrs PM' },
      { reqId: 'req-cb-2', label: 'Boston hybrid or relocate', result: 'assumed', evidence: 'Relocation not captured' },
      { reqId: 'req-cb-3', label: 'Experimentation & Python', result: 'predicted', evidence: 'Looker + Amplitude pricing experiments' },
    ],
    greenFlags: ['Rigorous pricing & checkout experimentation'],
    redFlags: ['Product Manager track, not Python Data Scientist'],
    chips: [{ kind: 'predicted', label: 'SQL' }, { kind: 'assumed', label: 'Relocation' }] },
  { id: 'm34', roleId: 'cobalt-ds', candidateId: 'elenav', rank: 5, band: 'Stretch', recommendation: 'Not recommended', suggested: true, score: 63, status: 'new',
    reason: 'Monetization PM with dashboarding skills; lacks hands-on Python modeling.',
    requirementsMet: [
      { reqId: 'req-cb-1', label: '3+ years in Data Science', result: 'not-met', evidence: '7 yrs PM' },
      { reqId: 'req-cb-2', label: 'Boston hybrid or relocate', result: 'not-met', evidence: 'SF Bay Area only' },
      { reqId: 'req-cb-3', label: 'Experimentation & Python', result: 'not-met', evidence: 'No Python on resume' },
    ],
    greenFlags: ['Strong SaaS metrics fluency'],
    redFlags: ['No Python modeling experience', 'Not open to Boston'],
    chips: [{ kind: 'gap', label: 'No Python' }] },

  // Lumen AI · Full-stack (Prospect role)
  { id: 'm10', roleId: 'lumen-fse', candidateId: 'ana', rank: 1, band: 'Strong', recommendation: 'Strong', suggested: true, score: 90, status: 'shortlisted',
    reason: 'Five years shipping React + Node in production; rebuilt a checkout in React and GraphQL.',
    requirementsMet: [
      { reqId: 'req-lu-1', label: '4+ years full-stack engineering', result: 'met', evidence: '5 yrs Full-stack (Pathwise, Accenture)' },
      { reqId: 'req-lu-2', label: 'US remote (sponsorship supported)', result: 'met', evidence: 'Austin, TX · Remote · STEM OPT' },
      { reqId: 'req-lu-3', label: 'Production React + Node.js', result: 'met', evidence: '5 yrs React + Node.js + GraphQL' },
      { reqId: 'req-lu-4', label: 'TypeScript & PostgreSQL', result: 'met', evidence: 'Migrated 30 services to TypeScript + Postgres' },
    ],
    greenFlags: [
      'Cut checkout p95 latency by 54% in React + GraphQL',
      'Led 30-service TypeScript migration',
      'Available immediately',
    ],
    redFlags: [
      'STEM OPT expires in 5 months (needs H-1B filing in next cap season)',
    ],
    alignment: { candidateSide: 'not-asked', clientSide: 'not-sent', prospectSide: 'pitched', updatedBy: 'Vandit D.', at: 'Today, 09:20' },
    chips: [{ kind: 'evidence', label: '5 yrs' }, { kind: 'evidence', label: 'Remote' }, { kind: 'evidence', label: 'React' }, { kind: 'evidence', label: 'Node.js' }, { kind: 'evidence', label: 'TypeScript' }, { kind: 'gap', label: 'STEM OPT · 5 mo left' }] },
  { id: 'm11', roleId: 'lumen-fse', candidateId: 'kwameo', rank: 2, band: 'Strong', recommendation: 'Strong', suggested: true, score: 84, status: 'shortlisted',
    reason: 'Seven years full-stack; React front end over Rails, with two Node services owned end to end.',
    requirementsMet: [
      { reqId: 'req-lu-1', label: '4+ years full-stack engineering', result: 'met', evidence: '7 yrs Full-stack' },
      { reqId: 'req-lu-2', label: 'US remote', result: 'met', evidence: 'Atlanta · Remote · US citizen' },
      { reqId: 'req-lu-3', label: 'Production React + Node.js', result: 'met', evidence: 'React + 2 Node microservices' },
      { reqId: 'req-lu-4', label: 'TypeScript & PostgreSQL', result: 'met', evidence: 'PostgreSQL in production' },
    ],
    greenFlags: ['7 years full-stack ownership', 'US citizen, remote-ready'],
    redFlags: ['Primary backend is Rails alongside 2 Node services'],
    alignment: { candidateSide: 'not-asked', clientSide: 'not-sent', prospectSide: 'not-pitched', updatedBy: 'Vandit D.', at: 'Today, 09:15' },
    chips: [{ kind: 'evidence', label: '7 yrs' }, { kind: 'evidence', label: 'Remote' }, { kind: 'evidence', label: 'React' }, { kind: 'evidence', label: 'Node.js' }, { kind: 'evidence', label: 'US citizen' }] },
  { id: 'm12', roleId: 'lumen-fse', candidateId: 'ninaf', rank: 3, band: 'Good', recommendation: 'Mild', suggested: true, score: 76, status: 'new',
    reason: 'Strong React and design-system work; Node is predicted from Next.js API routes.',
    requirementsMet: [
      { reqId: 'req-lu-1', label: '4+ years full-stack engineering', result: 'met', evidence: '4 yrs Frontend/Full-stack' },
      { reqId: 'req-lu-2', label: 'US remote', result: 'met', evidence: 'Remote (US) · OPT' },
      { reqId: 'req-lu-3', label: 'Production React + Node.js', result: 'predicted', evidence: 'React explicit; Node predicted from Next.js API routes' },
    ],
    greenFlags: ['Strong React & design systems depth'],
    redFlags: ['Node.js is predicted from Next.js API routes, not standalone backend'],
    chips: [{ kind: 'evidence', label: '4 yrs' }, { kind: 'evidence', label: 'React' }, { kind: 'predicted', label: 'Node.js', detail: 'from Next.js API routes, 2 yrs' }, { kind: 'evidence', label: 'OPT · sponsorship offered' }] },
  { id: 'm13', roleId: 'lumen-fse', candidateId: 'ishan', rank: 4, band: 'Stretch', recommendation: 'Not recommended', suggested: true, score: 66, status: 'new',
    reason: 'Node and Vue experience; location and work authorization weren\u2019t captured.',
    requirementsMet: [
      { reqId: 'req-lu-1', label: '4+ years full-stack engineering', result: 'met', evidence: '4 yrs Full-stack' },
      { reqId: 'req-lu-2', label: 'US remote', result: 'assumed', evidence: 'Location & work auth not captured' },
      { reqId: 'req-lu-3', label: 'Production React + Node.js', result: 'predicted', evidence: 'Node explicit; React predicted from Vue' },
    ],
    greenFlags: ['4 years Node.js backend experience'],
    redFlags: ['Location and work authorization not captured (32% profile completeness)', 'Vue rather than React'],
    chips: [{ kind: 'evidence', label: '4 yrs' }, { kind: 'evidence', label: 'Node.js' }, { kind: 'predicted', label: 'React', detail: 'from Vue, 4 yrs' }, { kind: 'assumed', label: 'Location' }, { kind: 'assumed', label: 'Work authorization' }] },

  // Brightdesk · Growth (Not scored yet — passes hard filters, waiting for prune / Score with AI)
  { id: 'm20', roleId: 'brightdesk-gmm', candidateId: 'meic', rank: 1, band: 'Strong', recommendation: 'Strong', score: 87, status: 'new', scored: false,
    reason: 'Runs LinkedIn and Meta for a PLG B2B SaaS in NYC; five years of growth with clear CAC wins.',
    chips: [{ kind: 'evidence', label: '5 yrs' }, { kind: 'evidence', label: 'NYC' }, { kind: 'evidence', label: 'LinkedIn Ads' }, { kind: 'evidence', label: 'B2B SaaS' }] },
  { id: 'm21', roleId: 'brightdesk-gmm', candidateId: 'marcus', rank: 2, band: 'Good', recommendation: 'Strong', score: 83, status: 'new', scored: false,
    reason: 'Six years scaling paid social to $310k/month; LinkedIn Ads is predicted from Meta + Google Ads.',
    chips: [{ kind: 'evidence', label: '6 yrs' }, { kind: 'evidence', label: 'NYC onsite' }, { kind: 'predicted', label: 'LinkedIn Ads', detail: 'from Meta + Google Ads, 6 yrs' }, { kind: 'evidence', label: 'US citizen' }, { kind: 'evidence', label: 'B2B demand gen' }] },
  { id: 'm22', roleId: 'brightdesk-gmm', candidateId: 'chloew', rank: 3, band: 'Good', recommendation: 'Mild', score: 78, status: 'new', scored: false,
    reason: 'Lifecycle lead with paid experience; hybrid preference conflicts with onsite.',
    chips: [{ kind: 'evidence', label: '7 yrs' }, { kind: 'evidence', label: 'NYC' }, { kind: 'evidence', label: 'LinkedIn Ads' }, { kind: 'gap', label: 'Prefers hybrid' }] },
  { id: 'm23', roleId: 'brightdesk-gmm', candidateId: 'omarh', rank: 4, band: 'Stretch', recommendation: 'Mild', score: 69, status: 'new', scored: false,
    reason: 'B2B performance marketer in NYC metro; work authorization not captured.',
    chips: [{ kind: 'evidence', label: '5 yrs' }, { kind: 'evidence', label: 'Onsite' }, { kind: 'evidence', label: 'LinkedIn Ads' }, { kind: 'assumed', label: 'Work authorization' }] },
]

/**
 * v0.4 · C6 — Stage 1 passers that haven't been AI-scored yet ("Not scored").
 * Sorted by similarity ("Sorted by similarity to the JD. Not a score.").
 */
const UNSCORED: Record<string, string[]> = {
  'northwind-spm': ['marcus', 'gracel', 'leog', 'omarh', 'tomasa', 'diegos', 'chloew', 'hannahb', 'kwameo', 'benr', 'samd', 'ninaf'],
  'brightdesk-gmm': ['leog', 'hannahb', 'diegos', 'gracel', 'yukit', 'paulk'],
  'lumen-fse': ['tomasa', 'samd', 'benr', 'gracel'],
  'cobalt-ds': ['diegos', 'paulk', 'marcus', 'ravip', 'jordant', 'fatimaz', 'tomasa'],
  'quill-pmm': ['leog', 'marcus', 'meic'],
}
const SCORED_ROLES = new Set(['northwind-spm', 'lumen-fse', 'cobalt-ds'])
const unscoredMatches: RawMatch[] = Object.entries(UNSCORED).flatMap(([roleId, ids]) => {
  const base = rawMatches.filter(m => m.roleId === roleId).length
  return ids.map((candidateId, i) => ({
    id: `u-${roleId}-${candidateId}`, roleId, candidateId, rank: base + i + 1, band: 'Good' as const,
    recommendation: 'Mild' as const,
    score: 0, status: (roleId === 'quill-pmm' && candidateId === 'leog' ? 'shortlisted' : 'new') as Match['status'],
     scored: roleId === 'quill-pmm' && candidateId === 'leog',
    reason: roleId === 'quill-pmm' && candidateId === 'leog' ? '6 years in devtools Product Marketing in Seattle.' : '',
    chips: [], similarity: base + i + 1,
  }))
})

/** Default synthesized v0.4 scoring breakdown when missing on a scored match */
export function buildDefaultScoring(m: RawMatch, c?: Candidate, r?: Role): {
  recommendation: Recommendation
  requirementsMet: RequirementMetItem[]
  greenFlags: string[]
  redFlags: string[]
} {
  const rec: Recommendation = m.recommendation ?? (m.band === 'Strong' ? 'Strong' : m.band === 'Good' ? 'Mild' : 'Not recommended')
  if (m.requirementsMet && m.greenFlags && m.redFlags) {
    return { recommendation: rec, requirementsMet: m.requirementsMet, greenFlags: m.greenFlags, redFlags: m.redFlags }
  }
  const reqs = r?.requirements ?? []
  const met: RequirementMetItem[] = reqs.length
    ? reqs.map(rq => {
        if (rq.column === 'Minimum years') {
          const ok = (c?.years ?? r?.minYears ?? 5) >= (r?.minYears ?? 5)
          return { reqId: rq.id, label: rq.text, result: c?.years == null ? 'assumed' : ok ? 'met' : 'not-met', evidence: c?.years != null ? `${c.years} yrs on resume` : 'Years not captured' }
        }
        if (rq.column === 'Location') {
          return { reqId: rq.id, label: rq.text, result: c?.metro ? 'met' : 'assumed', evidence: c?.metro ? `${c.metro}${c.workModes?.[0] ? ` · ${c.workModes[0]}` : ''}` : 'Location not captured' }
        }
        if (rq.column === 'Work authorization') {
          return { reqId: rq.id, label: rq.text, result: c?.workAuth.status ? 'met' : 'assumed', evidence: c?.workAuth.status ?? 'Work authorization not captured' }
        }
        const hasSkill = c?.skills.some(s => rq.text.toLowerCase().includes(s.toLowerCase()))
        const hasPred = c?.predicted.some(p => rq.text.toLowerCase().includes(p.name.toLowerCase()))
        return {
          reqId: rq.id,
          label: rq.text,
          result: hasSkill ? 'met' : hasPred ? 'predicted' : 'met',
          evidence: hasSkill ? 'Confirmed on resume' : hasPred ? 'Predicted from adjacent tools' : 'Checked against profile',
        }
      })
    : [
        { reqId: 'r1', label: `${r?.minYears ?? 5}+ years experience`, result: 'met', evidence: `${c?.years ?? 6} yrs` },
        { reqId: 'r2', label: `${r?.location ?? 'Location'}`, result: c?.metro ? 'met' : 'assumed', evidence: c?.metro ?? 'Assumed' },
        { reqId: 'r3', label: 'Work authorization', result: c?.workAuth.status ? 'met' : 'assumed', evidence: c?.workAuth.status ?? 'Assumed' },
      ]
  const greens = m.greenFlags ?? [
    ...(c?.achievements?.slice(0, 2) ?? [`${c?.years ?? 6} years in ${c?.category ?? 'role'} (${c?.headline ?? ''})`]),
  ]
  const reds = m.redFlags ?? m.chips.filter(ch => ch.kind === 'gap' || ch.kind === 'assumed').map(ch => ch.kind === 'assumed' ? `${ch.label} not captured yet (assumed)` : ch.label)
  return { recommendation: rec, requirementsMet: met, greenFlags: greens.slice(0, 3), redFlags: reds.slice(0, 3) }
}

export const matches: Match[] = [...rawMatches, ...unscoredMatches].map(m => {
  const isScored = m.scored ?? SCORED_ROLES.has(m.roleId)
  const c = candidateById(m.candidateId)
  const r = roleById(m.roleId)
  const v4 = isScored ? buildDefaultScoring(m, c, r) : undefined
  const defaultAlign: MatchAlignment | undefined = m.status === 'shortlisted'
    ? (m.alignment ?? {
        candidateSide: 'not-asked',
        clientSide: 'not-sent',
        prospectSide: 'not-pitched',
        updatedBy: 'Vandit D.',
        at: 'Today',
      })
    : m.alignment
  return {
    ...m,
    scored: isScored,
    similarity: m.similarity ?? m.rank,
    scoredInRun: isScored ? 1 : undefined,
    scoredOnResumeId: m.candidateId === 'priya' && m.roleId === 'northwind-spm' ? 'res-priya-product' : undefined,
    askEvidence: m.roleId === 'northwind-spm' && isScored
      ? [{ askId: 'ask-nw-2', label: 'Led a team of 5+', found: ['m1', 'm2', 'm5'].includes(m.id) }]
      : undefined,
    ...(v4 ?? {}),
    alignment: defaultAlign,
  }
})

/** Extra matches revealed by Rerun for Northwind */
export const northwindAfterRerun: Partial<Record<string, Match['delta']>> = {
  m3: 'new', m4: 'moved', m7: 'requalified',
}

export const eliminatedByRole: Record<string, { pool: number; pass: number; rules: { rule: string; count: number }[]; rows: Eliminated[] }> = {
  'northwind-spm': {
    pool: POOL_SIZE, pass: 27,
    rules: [{ rule: 'Location', count: 195 }, { rule: 'Minimum years', count: 112 }, { rule: 'Category', count: 48 }, { rule: 'Work authorization', count: 30 }],
    rows: [
      { candidateId: 'leog', failing: ['Location (Seattle, not open to SF)'] },
      { candidateId: 'chloew', failing: ['Category (Marketing, not Product)'] },
      { candidateId: 'arjunm', failing: ['Work authorization (needs sponsorship)'] },
      { candidateId: 'dev', failing: ['Minimum years (3 of 6)', 'Category (Engineering)'] },
      { candidateId: 'marcus', failing: ['Location (NYC, not relocating)', 'Category (Marketing)'] },
    ],
  },
  'cobalt-ds': {
    pool: POOL_SIZE, pass: 27,
    rules: [{ rule: 'Category', count: 310 }, { rule: 'Location', count: 49 }, { rule: 'Minimum years', count: 26 }],
    rows: [
      { candidateId: 'dev', failing: ['Category (Engineering)'] },
      { candidateId: 'benr', failing: ['Location (Los Angeles)'] },
    ],
  },
  'lumen-fse': {
    pool: POOL_SIZE, pass: 64,
    rules: [{ rule: 'Category', count: 290 }, { rule: 'Minimum years', count: 51 }, { rule: 'Location', count: 7 }],
    rows: [
      { candidateId: 'dev', failing: ['Minimum years (3 of 4)'] },
      { candidateId: 'benr', failing: ['Sub-category (Mobile)'] },
      { candidateId: 'tomasa', failing: ['Sub-category (Backend)'] },
    ],
  },
  'brightdesk-gmm': {
    pool: POOL_SIZE, pass: 22,
    rules: [{ rule: 'Category', count: 340 }, { rule: 'Location', count: 37 }, { rule: 'Minimum years', count: 13 }],
    rows: [
      { candidateId: 'hannahb', failing: ['Minimum years (4 of 5)', 'Location (remote only)'] },
      { candidateId: 'leog', failing: ['Location (Seattle)'] },
    ],
  },
}

/* ---------- Candidate → roles ---------- */
export const rolesForCandidate: Record<string, RoleMatchForCandidate[]> = {
  priya: [
    {
      roleId: 'northwind-spm', rank: 1, band: 'Strong', recommendation: 'Strong', score: 88, status: 'shortlisted',
      reason: 'Owns merchant payouts at a Series B fintech; the role she came in for.',
      requirementsMet: [
        { reqId: 'req-nw-1', label: '6+ yrs PM', result: 'met', evidence: '7 yrs' },
        { reqId: 'req-nw-2', label: 'SF hybrid', result: 'met', evidence: 'SF Bay Area' },
        { reqId: 'req-nw-4', label: 'Payments', result: 'met', evidence: 'Instant payouts & billing' },
        { reqId: 'req-nw-5', label: 'SQL', result: 'predicted', evidence: 'From Looker + Amplitude' },
      ],
      greenFlags: ['Owned merchant payouts at a Series B fintech', 'Led 8-engineer pod'],
      redFlags: ['Pay expectation +8% over range'],
      chips: [{ kind: 'evidence', label: 'Payments' }, { kind: 'evidence', label: 'SF hybrid' }, { kind: 'predicted', label: 'SQL', detail: 'from Looker + Amplitude' }],
    },
    {
      roleId: 'quill-pmm', rank: 2, band: 'Stretch', recommendation: 'Mild', score: 61, status: 'new',
      reason: 'Strong API product launches; would be a move from PM into product marketing.',
      requirementsMet: [
        { reqId: 'r1', label: '5+ yrs experience', result: 'met', evidence: '7 yrs' },
        { reqId: 'r2', label: 'Seattle hybrid', result: 'assumed', evidence: 'Relocation not captured' },
      ],
      greenFlags: ['Shipped usage-based billing API adopted by 40% of accounts'],
      redFlags: ['PM title, not Product Marketing', 'Relocation to Seattle assumed'],
      chips: [{ kind: 'evidence', label: 'API products' }, { kind: 'gap', label: 'PM, not PMM' }, { kind: 'assumed', label: 'Relocation to Seattle' }],
    },
    {
      roleId: 'cobalt-ds', rank: 3, band: 'Stretch', recommendation: 'Not recommended', score: 52, status: 'new',
      reason: 'Heavy experimentation background, but no data-science title or Python.',
      requirementsMet: [
        { reqId: 'req-cb-1', label: '3+ yrs Data Science', result: 'not-met', evidence: 'PM track' },
        { reqId: 'req-cb-3', label: 'Python experimentation', result: 'not-met', evidence: 'No Python' },
      ],
      greenFlags: ['Strong pricing experimentation'],
      redFlags: ['No Python on resume'],
      chips: [{ kind: 'evidence', label: 'Experimentation' }, { kind: 'gap', label: 'No Python' }],
    },
  ],
  marcus: [
    {
      roleId: 'brightdesk-gmm', rank: 1, band: 'Good', recommendation: 'Strong', score: 83, status: 'new',
      reason: 'NYC onsite growth role; LinkedIn Ads predicted from six years of Meta + Google Ads.',
      greenFlags: ['Scaled paid social from $40k to $310k/mo at 2.1x ROAS', 'NYC onsite ready'],
      redFlags: ['LinkedIn Ads is predicted from Meta + Google Ads'],
      chips: [{ kind: 'evidence', label: 'NYC onsite' }, { kind: 'predicted', label: 'LinkedIn Ads', detail: 'from Meta + Google Ads, 6 yrs' }, { kind: 'evidence', label: 'B2B' }],
    },
    {
      roleId: 'orbit-lc', rank: 2, band: 'Good', recommendation: 'Mild', score: 74, status: 'new',
      reason: 'Lifecycle onboarding rebuild lifted trial-to-paid 23%.',
      greenFlags: ['Trial-to-paid +23% lifecycle rebuild'],
      redFlags: ['Role is currently Closed'],
      chips: [{ kind: 'evidence', label: 'Lifecycle email' }, { kind: 'predicted', label: 'Braze', detail: 'used Braze at Notable' }],
    },
  ],
  ana: [
    {
      roleId: 'lumen-fse', rank: 1, band: 'Strong', recommendation: 'Strong', score: 90, status: 'shortlisted',
      reason: 'React + Node in production for five years; remote; sponsorship offered.',
      greenFlags: ['5 years React + Node + Postgres', 'p95 checkout latency down 54%'],
      redFlags: ['STEM OPT expires in 5 months'],
      chips: [{ kind: 'evidence', label: 'React' }, { kind: 'evidence', label: 'Node.js' }, { kind: 'evidence', label: 'Sponsorship offered' }],
    },
    {
      roleId: 'vela-fe', rank: 2, band: 'Good', recommendation: 'Mild', score: 77, status: 'new',
      reason: 'Front-end heavy; design-system work is predicted from component library ownership.',
      greenFlags: ['Led 30-service TypeScript migration'],
      redFlags: ['Design systems predicted from component library'],
      chips: [{ kind: 'evidence', label: 'React' }, { kind: 'predicted', label: 'Design systems', detail: 'from shared component library' }],
    },
  ],
}

/* ---------- Resume outputs ---------- */
export const outputs: ResumeOutput[] = [
  { id: 'o1', candidateId: 'priya', type: 'Masked', roleId: 'northwind-spm', template: 'A · Compact', style: 'creative', delivery: 'link', shareUrl: 'https://heroscouter.com/p/spm-fintech-7y-priya', linkActive: true, createdBy: 'Purvesh N.', created: 'Today, 10:42', stale: true,
    staleReason: 'Product resume has a new version (v3)', sourceResumeId: 'res-priya-product', sourceVersion: 2, promptVersion: 'Masking v4',
    revisions: [
      { n: 1, instruction: 'Generated', scope: 'Whole resume', createdBy: 'Purvesh N.', at: 'Today, 10:38' },
      { n: 2, instruction: 'Shorter, lead with payments', scope: 'Whole resume', createdBy: 'Purvesh N.', at: 'Today, 10:41' },
    ] },
  { id: 'o2', candidateId: 'ana', type: 'Masked', roleId: 'lumen-fse', template: 'C · Role-fit', style: 'creative', delivery: 'link', shareUrl: 'https://heroscouter.com/p/fse-react-node-5y-ana', linkActive: true, createdBy: 'Vandit D.', created: 'Today, 09:15', stale: false, promptVersion: 'Masking v4' },
  { id: 'o3', candidateId: 'kwameo', type: 'Masked', roleId: 'lumen-fse', template: 'C · Role-fit', style: 'traditional', delivery: 'link', shareUrl: 'https://heroscouter.com/p/fse-rails-react-7y-kwame', linkActive: true, createdBy: 'Vandit D.', created: 'Today, 09:15', stale: false, promptVersion: 'Masking v4' },
  { id: 'o4', candidateId: 'jordant', type: 'Editable', roleId: 'northwind-spm', template: 'Traditional · Word-style', style: 'traditional', delivery: 'pdf', createdBy: 'Purvesh N.', created: 'Yesterday', stale: false, promptVersion: 'Editable v3' },
  { id: 'o5', candidateId: 'marcus', type: 'Masked', roleId: null, template: 'B · Achievement-led', style: 'creative', delivery: 'pdf', shareUrl: 'https://heroscouter.com/p/gmm-b2b-6y-marcus', linkActive: false, createdBy: 'Riya (intern)', created: 'Yesterday', stale: false, promptVersion: 'Masking v4' },
  { id: 'o6', candidateId: 'sara', type: 'As-is', roleId: 'northwind-spm', template: 'Original', style: 'traditional', delivery: 'pdf', createdBy: 'Purvesh N.', created: '2 days ago', stale: false },
  { id: 'o7', candidateId: 'meic', type: 'Masked', roleId: null, template: 'A · Compact', style: 'creative', delivery: 'link', shareUrl: 'https://heroscouter.com/p/growth-plg-5y-mei', linkActive: true, createdBy: 'Riya (intern)', created: '3 days ago', stale: false },
  { id: 'o8', candidateId: 'chloew', type: 'Masked', roleId: 'orbit-lc', template: 'Traditional · Word-style', style: 'traditional', delivery: 'pdf', createdBy: 'Vandit D.', created: 'Last week', stale: true },
]

/* ---------- Activity log ---------- */
export const activity: LogEntry[] = [
  { id: 'l0', who: 'System', what: 'Auto-scan finished · 385 eliminated · 5 suggested · 22 not scored', record: 'Data Scientist — Cobalt Labs', recordHref: '/roles/cobalt-ds', when: '10 min ago', kind: 'Reruns' },
  { id: 'l1', who: 'Purvesh N.', what: 'Applied revised JD (v3): added SQL (improves score); minimum years 5 → 6 (eliminates)', record: 'Senior PM — Northwind Pay', recordHref: '/roles/northwind-spm', when: '20 min ago', kind: 'Roles', before: 'Requirements: Payments · 5+ yrs', after: 'Requirements: Payments, SQL · 6+ yrs' },
  { id: 'l2', who: 'Purvesh N.', what: 'Marked Client: Interested for Elena V. (candidate not asked yet)', record: 'Senior PM — Northwind Pay', recordHref: '/roles/northwind-spm', when: '30 min ago', kind: 'Decisions' },
  { id: 'l3', who: 'Purvesh N.', what: 'Both aligned: Jordan T. (Candidate: Interested · Client: Interested)', record: 'Senior PM — Northwind Pay', recordHref: '/roles/northwind-spm', when: '1h ago', kind: 'Decisions' },
  { id: 'l4', who: 'Vandit D.', what: 'Created 2 Gmail pitch drafts with masked web links', record: 'Full-stack Engineer — Lumen AI', recordHref: '/roles/lumen-fse', when: 'Today, 09:20', kind: 'Outputs' },
  { id: 'l5', who: 'Vandit D.', what: 'Applied 6 changes from call (Fathom)', record: 'Ana R.', recordHref: '/candidates/ana', when: 'Yesterday', kind: 'Candidates', before: 'Work authorization: Assumed', after: 'STEM OPT · needs sponsorship' },
  { id: 'l6', who: 'Purvesh N.', what: 'Included Leo G. anyway · fails Location', record: 'Product Marketing Manager — Quill', recordHref: '/roles/quill-pmm', when: 'Yesterday', kind: 'Overrides' },
  { id: 'l8', who: 'Riya (intern)', what: 'Created profile from Google Drive link', record: 'Mei C.', recordHref: '/candidates/meic', when: '3 days ago', kind: 'Candidates' },
]

/* ---------- Proposed changes (D-03) ---------- */
export const callChangesPriya: ProposedChange[] = [
  { id: 'c1', field: 'Open to relocate', from: 'Not captured', to: 'Yes — Austin or NYC', source: 'CALL' },
  { id: 'c2', field: 'Work mode', from: 'Hybrid, Onsite', to: 'Hybrid, Onsite, Remote', source: 'CALL' },
  { id: 'c3', field: 'Availability', from: '30 days notice', to: '3 weeks notice', source: 'CALL' },
  { id: 'c4', field: 'Pay expectation', from: '$185k–$205k', to: '$180k–$200k', source: 'CALL' },
  { id: 'c5', field: 'Company type', from: 'Series B–D, Fintech', to: 'Series B–D, Fintech, Infra', source: 'CALL' },
  { id: 'c6', field: 'Skills', from: '—', to: '+ SQL (confirmed)', source: 'CALL' },
]
export const jdChangesNorthwind: ProposedChange[] = [
  { id: 'j1', field: 'Requirement (Improves score)', from: 'Payments', to: 'Payments, SQL', source: 'JD' },
  { id: 'j2', field: 'Minimum years (Eliminates)', from: '5', to: '6', source: 'JD' },
  { id: 'j3', field: 'Pay range', from: '$165k–$185k', to: '$170k–$190k', source: 'JD' },
]

/** v0.3 · T5 three fixed roles · T8 display name + title sign takes */
export const team: TeamMember[] = [
  { id: 'purvesh', name: 'Purvesh Naik', initials: 'PN', email: 'purvesh@heroscouter.com', access: 'Admin', displayName: 'Purvesh N.', title: 'Founder, HeroScouter' },
  { id: 'vandit', name: 'Vandit Dubey', initials: 'VD', email: 'vandit@heroscouter.com', access: 'Recruiter', displayName: 'Vandit D.', title: 'Talent Partner, HeroScouter' },
  { id: 'aman', name: 'Aman K. (associate)', initials: 'AK', email: 'aman@heroscouter.com', access: 'Associate', displayName: 'Aman K.', title: 'Talent Associate, HeroScouter' },
  { id: 'riya', name: 'Riya (intern)', initials: 'RI', email: 'riya@heroscouter.com', access: 'Associate', displayName: 'Riya S.', title: 'Talent Intern, HeroScouter' },
]

/* ---------- v0.3 · T3 Resumes (one profile, one or more resumes) ---------- */
export const resumes: Resume[] = [
  { id: 'res-priya-product', candidateId: 'priya', label: 'Product', targetCategory: 'Product', isPrimary: true,
    headline: 'Senior Product Manager · payments & B2B SaaS', emphasis: ['Payments', 'API products', 'Pricing'],
    versions: [
      { n: 1, file: 'Priya_S_Resume.pdf', uploadedBy: 'Vandit D.', uploadedAt: '3 weeks ago', changesApplied: 14 },
      { n: 2, file: 'Priya_S_Resume_2026.pdf', uploadedBy: 'Vandit D.', uploadedAt: '3 days ago', changesApplied: 3 },
      { n: 3, file: 'Priya_S_PM_Oct.pdf', uploadedBy: 'Purvesh N.', uploadedAt: '2h ago', changesApplied: 1 },
    ] },
  { id: 'res-priya-growth', candidateId: 'priya', label: 'Growth', targetCategory: 'Marketing', isPrimary: false,
    headline: 'Growth & monetization lead · pricing, checkout, self-serve', emphasis: ['Pricing', 'Self-serve checkout', 'Experimentation'],
    versions: [{ n: 1, file: 'Priya_S_Growth.pdf', uploadedBy: 'Vandit D.', uploadedAt: 'Yesterday', changesApplied: 2 }] },
]
/** Every candidate without an explicit resume gets one Primary resume (most candidates: no selectors anywhere) */
export function defaultResumeFor(c: Candidate): Resume {
  return {
    id: `res-${c.id}`, candidateId: c.id, label: c.category, targetCategory: c.category, isPrimary: true,
    headline: c.headline, emphasis: c.skills.slice(0, 3),
    versions: Array.from({ length: c.resumeVersion }, (_, i) => ({ n: i + 1, file: `${c.name.replace(/[^A-Za-z]/g, '_')}_Resume_v${i + 1}.pdf`, uploadedBy: 'Vandit D.', uploadedAt: i + 1 === c.resumeVersion ? c.updated : '1 month ago', changesApplied: 0 })),
  }
}

/* ---------- v0.3 · T7 Client asks (mapped to Requirements in v0.4) ---------- */
export const clientAsks: ClientAsk[] = [
  { id: 'ask-nw-1', roleId: 'northwind-spm', text: 'No sponsorship — transfer is fine', type: 'must-column', column: 'Work authorization', source: 'Call', saidBy: 'Sean (VP Product)', when: 'Yesterday', addedBy: 'Purvesh N.' },
  { id: 'ask-nw-2', roleId: 'northwind-spm', text: 'Has led a team of 5+', type: 'must-signal', source: 'Call', saidBy: 'Sean (VP Product)', when: 'Yesterday', addedBy: 'Purvesh N.' },
  { id: 'ask-nw-3', roleId: 'northwind-spm', text: 'Fintech background a plus', type: 'nice', source: 'Email', saidBy: 'Dana K.', when: '2 days ago', addedBy: 'Vandit D.' },
  { id: 'ask-nw-4', roleId: 'northwind-spm', text: 'Sean cares about speed; the team ships weekly', type: 'context', source: 'Call', saidBy: 'Sean (VP Product)', when: 'Yesterday', addedBy: 'Purvesh N.' },
]
/** Proposed from an intake transcript (US-42) */
export const proposedAsksFromTranscript: Omit<ClientAsk, 'id' | 'roleId' | 'addedBy'>[] = [
  { text: 'Must be in the Bay Area 3 days a week', type: 'must-column', column: 'Location', source: 'Call', saidBy: 'Sean', when: 'Just now' },
  { text: 'Has shipped a public API', type: 'must-signal', source: 'Call', saidBy: 'Sean', when: 'Just now' },
  { text: 'Ledger or reconciliation experience a plus', type: 'nice', source: 'Call', saidBy: 'Sean', when: 'Just now' },
  { text: 'Hiring manager wants a first call within a week', type: 'context', source: 'Call', saidBy: 'Sean', when: 'Just now' },
]

/* ---------- v0.3 · T8 Takes ---------- */
export const takes: Take[] = [
  { id: 'take-priya', candidateId: 'priya', roleId: null, status: 'signed', authorId: 'vandit', approvedAt: '3 days ago',
    text: 'The most commercially sharp payments PM I have spoken to this quarter. She talks ledgers with engineers and revenue with founders.', sourceCallIds: ['call-priya-1'] },
  { id: 'take-jordan', candidateId: 'jordant', roleId: null, status: 'signed', authorId: 'purvesh', approvedAt: '4 days ago',
    text: 'Nine years in payments rails and settlement APIs. Zero hand-holding needed — writes his own SQL and has led 6 backend engineers.', sourceCallIds: ['call-jordan-1'] },
  { id: 'take-ana', candidateId: 'ana', roleId: null, status: 'draft', authorId: 'vandit', draftedByAI: true,
    text: 'Ships fast and owns outcomes: rebuilt a checkout end to end and halved latency. Needs an H-1B filing next cap season.', sourceCallIds: ['call-ana-1'] },
  { id: 'take-marcus', candidateId: 'marcus', roleId: null, status: 'signed', authorId: 'purvesh', approvedAt: '2 weeks ago',
    text: 'Rare growth marketer who can explain every dollar of spend. I would put him in front of any B2B founder.', sourceCallIds: ['call-marcus-1'] },
]

/* ---------- v0.4 · T5 + C3 Prompt registry (with all 5 email draft kinds) ---------- */
const pv = (v: number, text: string, savedBy: string, savedAt: string, note?: string) => ({ v, text, savedBy, savedAt, note })
export const prompts: PromptDef[] = [
  { id: 'masking', name: 'Masking', usedIn: 'S-09 Masked builder', group: 'Outputs', editable: true, activeVersion: 4,
    variables: ['{candidate}', '{role}', '{template}', '{hidden_fields}'],
    versions: [
      pv(1, 'Rewrite the resume so the candidate cannot be identified…', 'Vandit D.', '2 months ago'),
      pv(2, 'Rewrite the resume so the candidate cannot be identified. Describe employers by stage, sector and size…', 'Vandit D.', '6 weeks ago'),
      pv(3, 'Describe employers by stage, sector and size. Keep metros, never cities…', 'Purvesh N.', '3 weeks ago', 'Metro only'),
      pv(4, 'You prepare a masked one-page profile for {role}. Describe each employer by stage, sector and size instead of its name unless {hidden_fields} says Show. Keep the metro, never the city. Lead with the impact numbers that matter for {role}.', 'Purvesh N.', '1 week ago', 'Lead with impact for the role'),
    ] },
  { id: 'why', name: '“Why we recommend”', usedIn: 'S-09 Masked builder', group: 'Outputs', editable: true, activeVersion: 2,
    variables: ['{candidate}', '{role}', '{requirements}'],
    versions: [
      pv(1, 'Write 3 bullets on why this candidate fits…', 'Vandit D.', '1 month ago'),
      pv(2, 'Write 3 short bullets mapping {candidate}’s evidence to the requirements of {role}. One fact per bullet. No adjectives without a number.', 'Vandit D.', '2 weeks ago'),
    ] },
  { id: 'take', name: '“Our take” draft', usedIn: 'S-07 Profile · S-09 Masked builder', group: 'Outputs', editable: true, activeVersion: 1,
    variables: ['{call_notes}', '{candidate}', '{role}', '{signer}'],
    versions: [pv(1, 'Draft a 1–2 sentence take in the voice of {signer}, using only {call_notes}. Max 280 characters. Say one specific thing you learned on the call.', 'Purvesh N.', '1 week ago')] },
  { id: 'tailor', name: 'Editable output', usedIn: 'S-10 Editable review', group: 'Outputs', editable: true, activeVersion: 3,
    variables: ['{candidate}', '{role}', '{source_resume}'],
    versions: [
      pv(1, 'Tailor the resume to the role…', 'Vandit D.', '2 months ago'),
      pv(2, 'Reorder and reword bullets toward {role}. Every change must trace to {source_resume} or a call.', 'Vandit D.', '1 month ago'),
      pv(3, 'Reorder and reword bullets toward {role}. Rewrite the summary in 2 lines. Every change must trace to {source_resume} or a call; mark the source.', 'Purvesh N.', '10 days ago'),
    ] },
  { id: 'email-interest-check', name: '1 · Candidate interest check', usedIn: 'S-04 Shortlist · Align & send', group: 'Email drafts', editable: true, activeVersion: 1,
    variables: ['{candidate}', '{role}', '{company}', '{why_role}', '{signer}'],
    versions: [pv(1, 'Hi {candidate} — {company} is hiring a {role} ({why_role}). Given your work on {highlights}, I think they’d move fast. Want me to share your profile with {recipient}?\n\n{signer}', 'Purvesh N.', '3 days ago', 'Candidate-first or after client says yes')] },
  { id: 'email-profile-share', name: '2 · Client profile share (“Want to talk?”)', usedIn: 'S-04 Shortlist · Align & send', group: 'Email drafts', editable: true, activeVersion: 1,
    variables: ['{recipient}', '{candidate}', '{role}', '{highlights}', '{take}', '{signer}'],
    versions: [pv(1, 'Hi {recipient} — before I check their interest, would you want to talk to {candidate} for the {role} role?\n\n{highlights}\n{take}\n\nSay the word and I’ll confirm interest and set up a call.\n\n{signer}', 'Purvesh N.', '3 days ago', 'Client-first before asking candidate')] },
  { id: 'email-client', name: '3 · Client shortlist', usedIn: 'S-04 Shortlist · Align & send', group: 'Email drafts', editable: true, activeVersion: 2,
    variables: ['{recipient}', '{role}', '{company}', '{candidates}', '{signer}'],
    versions: [
      pv(1, 'Hi — for the {role} at {company}, here is our shortlist in order: {candidates}. — {signer}', 'Purvesh N.', '2 weeks ago'),
      pv(2, 'Hi {recipient} — for the {role} at {company}, here is our shortlist in order, mapped against what you told us on the call:\n\n{candidates}\n\nWho would you like to meet first?\n\n{signer}', 'Purvesh N.', '2 days ago', 'Includes signed takes & green flags'),
    ] },
  { id: 'email-prospect', name: '4 · Prospect pitch (masked)', usedIn: 'S-04 Shortlist · S-02 Bulk pitch', group: 'Email drafts', editable: true, activeVersion: 2,
    variables: ['{recipient}', '{role}', '{company}', '{candidates}', '{links}', '{signer}'],
    versions: [
      pv(1, 'Hi — saw {company} is hiring a {role}. Here are {candidates} we think fit, masked. Reply and I’ll make an intro. — {signer}', 'Purvesh N.', '2 weeks ago'),
      pv(2, 'Hi {recipient} — saw {company} is hiring a {role}. We already spoke with {candidates} who fit your exact stack — masked profiles with our signed takes are below:\n\n{links}\n\nReply with who looks strongest and I’ll check their interest and share full details.\n\n{signer}', 'Purvesh N.', '2 days ago', 'Web links by default for 1-click Gmail drafts'),
    ] },
  { id: 'email-candidate', name: '5 · Candidate “roles for you”', usedIn: 'S-07 Candidate → Matching roles', group: 'Email drafts', editable: true, activeVersion: 1,
    variables: ['{candidate}', '{roles}', '{signer}'],
    versions: [pv(1, 'Hi {candidate} — a few roles that fit what you told me on our call:\n\n{roles}\n\nWhich of these should I put your name forward for?\n\n{signer}', 'Vandit D.', '3 weeks ago')] },
  { id: 'refine-presets', name: 'Refinement presets', usedIn: 'Refine box (S-09, S-10, Drafts)', group: 'Refine presets', editable: true, activeVersion: 1,
    variables: [],
    versions: [pv(1, 'Shorter\nLead with impact\nMore numbers\nLess salesy\nFocus on B2B', 'Vandit D.', '1 week ago')] },
  { id: 'extract-resume', name: 'Resume extraction', usedIn: 'S-06 New candidate', group: 'Extraction', editable: false, activeVersion: 6,
    variables: ['{resume_text}'], versions: [pv(6, 'Extract the profile fields from {resume_text}. Mark anything not stated as null. Never guess work authorization.', 'Arjun (dev)', '1 month ago')] },
  { id: 'extract-jd', name: 'JD & Requirements extraction', usedIn: 'S-03 Role editor', group: 'Extraction', editable: false, activeVersion: 4,
    variables: ['{jd_text}'], versions: [pv(4, 'Extract a single Requirements list from {jd_text}. Map minimum years, work authorization, location and category to Eliminates; map skills, domain, pay and free-text signals to Improves score.', 'Arjun (dev)', 'Yesterday')] },
  { id: 'extract-call', name: 'Call extraction', usedIn: 'S-07 Profile · S-04 Requirements', group: 'Extraction', editable: false, activeVersion: 2,
    variables: ['{transcript}'], versions: [pv(2, 'From {transcript}, propose changes to profile fields or role requirements. Quote the line each comes from.', 'Arjun (dev)', '3 weeks ago')] },
  { id: 'score', name: 'Stage-2 scoring', usedIn: 'S-04 Matches', group: 'Scoring', editable: false, activeVersion: 6,
    variables: ['{role}', '{candidate}', '{resume}', '{requirements}'],
    versions: [pv(6, 'Evaluate {candidate} against each item in {requirements}. Return requirements met (met / not-met / assumed / predicted with evidence), up to 3 green flags, up to 3 red flags, a one-line reason, and a recommendation (Strong / Mild / Not recommended). Never output a numeric score.', 'Arjun (dev)', 'Yesterday')] },
]

export const REJECT_REASONS = ['Skills', 'Seniority', 'Location', 'Work authorization', 'Pay', 'Not interested', 'Other'] as const
