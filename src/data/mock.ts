import type {
  Candidate, Role, Match, Eliminated, RoleMatchForCandidate, ResumeOutput, LogEntry, ProposedChange,
} from './types'

/* ==========================================================================
   Example data — Product Design Doc §16. Fictional, marked "Example".
   ========================================================================== */

export const POOL_SIZE = 412
export const OPEN_ROLES = 14

/* ---------- Named candidates (§16) ---------- */
const named: Candidate[] = [
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

const supporting: Candidate[] = seeds.map(([name, headline, category, subcategory, years, city, workModes, workAuth, completeness], i) => {
  const initials = name.split(' ').map(s => s[0]).join('').replace('.', '')
  const metro = city ? city.split(',')[0].replace('Brooklyn', 'NYC').replace('New York', 'NYC').replace('Jersey City', 'NYC').replace('Oakland', 'SF Bay Area').replace('San Jose', 'SF Bay Area').replace('San Francisco', 'SF Bay Area') : null
  const ago = ['1h ago', '5h ago', 'Yesterday', '2 days ago', '3 days ago', '1 week ago', '2 weeks ago'][i % 7]
  return {
    id: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, ''),
    name, initials, headline, category, subcategory, years, city, metro, workModes,
    relocate: i % 3 === 0 ? null : i % 3 === 1 ? 'Yes' : 'No',
    workAuth, pay: i % 4 === 0 ? null : '$140k–$175k', availability: i % 5 === 0 ? null : '30 days',
    searchStatus: i % 2 ? 'Active' : 'Passive',
    skills: [], predicted: [], tools: [], companies: [], achievements: [],
    completeness, askList: [], updated: ago,
    source: (['Outreach', 'Referral', 'Inbound'] as const)[i % 3], resumeVersion: 1, lastContacted: ago,
    fieldSources: {}, example: true,
  }
})

export const candidates: Candidate[] = [...named, ...supporting]
export const candidateById = (id: string) => candidates.find(c => c.id === id)

/* ---------- Roles (§16 + supporting) ---------- */
export const roles: Role[] = [
  {
    id: 'northwind-spm', title: 'Senior Product Manager', company: 'Northwind Pay', companyType: 'Client', companySource: 'Client JD',
    category: 'Product', subcategory: 'Product Manager', seniority: 'Senior', minYears: 6,
    location: 'San Francisco, CA', workMode: 'Hybrid', relocationAccepted: true,
    sponsorship: 'No', transfer: 'Yes', mustSkills: ['Payments', 'SQL'], niceSkills: ['API products', 'Pricing', 'B2B SaaS'],
    pay: '$170k–$190k', status: 'Open', jdVersion: 3, matchStatus: 'out-of-date',
    outOfDateReason: 'Must-haves changed since the last run: added SQL, minimum years 5 → 6.',
    shortlisted: 3, updated: '20 min ago', passCount: 96,
    whatGood: 'Has owned a payments surface end to end and can talk to engineers about ledgers. Last good hire came from a Series B fintech; last bad hire was a big-tech PM who needed too much structure.',
    research: 'Hiring manager: Dana K., VP Product (ex-Plaid). Founders: two ex-Square engineers. Raised Series B, $40M, 2025.',
    interview: 'Recruiter screen → HM (45 min) → product case → team loop (3) → founder chat.',
    jdText: 'Northwind Pay is hiring a Senior Product Manager to own merchant payouts and treasury. You will work with a team of 8 engineers…\n\nRequirements\n• 6+ years in product management\n• Hands-on payments experience (payouts, ledgers or billing)\n• Comfortable writing SQL to answer your own questions\n• Hybrid in San Francisco, 3 days a week\n\nNice to have\n• API or platform products\n• Pricing and packaging experience',
  },
  {
    id: 'lumen-fse', title: 'Full-stack Engineer', company: 'Lumen AI', companyType: 'Prospect', companySource: 'Public posting URL',
    category: 'Engineering', subcategory: 'Full-stack', seniority: 'Mid–Senior', minYears: 4,
    location: 'Remote (US)', workMode: 'Remote', relocationAccepted: null,
    sponsorship: 'Yes', transfer: 'Yes', mustSkills: ['React', 'Node.js'], niceSkills: ['TypeScript', 'PostgreSQL', 'LLM apps'],
    pay: '$150k–$180k', status: 'Open', jdVersion: 1, matchStatus: 'up-to-date', shortlisted: 2, updated: '1h ago', passCount: 64,
    postingUrl: 'https://jobs.lumen.ai/full-stack-engineer',
    jdText: 'Lumen AI (Series A) is looking for a Full-stack Engineer to build our customer-facing analytics app. React + Node, 4+ years. Remote in the US. We sponsor visas.',
  },
  {
    id: 'brightdesk-gmm', title: 'Growth Marketing Manager', company: 'Brightdesk', companyType: 'Client', companySource: 'Client JD',
    category: 'Marketing', subcategory: 'Growth marketing', seniority: 'Manager', minYears: 5,
    location: 'New York, NY', workMode: 'Onsite', relocationAccepted: false,
    sponsorship: 'No', transfer: 'No', mustSkills: ['LinkedIn Ads'], niceSkills: ['Lifecycle email', 'B2B demand gen', 'HubSpot'],
    pay: '$140k–$160k', status: 'Open', jdVersion: 1, matchStatus: 'not-run', shortlisted: 0, updated: '35 min ago', passCount: 38,
    jdText: 'Brightdesk (B2B SaaS) needs a Growth Marketing Manager in NYC, onsite. 5+ years. Must have run LinkedIn Ads at scale.',
  },
  {
    id: 'harbor-be', title: 'Backend Engineer', company: 'Harbor Health', companyType: 'Client', companySource: 'Client JD',
    category: 'Engineering', subcategory: 'Backend', seniority: 'Senior', minYears: 5, location: 'Remote (US)', workMode: 'Remote', relocationAccepted: null,
    sponsorship: 'No', transfer: 'Unknown', mustSkills: ['Go', 'Kafka'], niceSkills: ['HIPAA'], pay: '$170k–$200k',
    status: 'Open', jdVersion: 2, matchStatus: 'up-to-date', shortlisted: 4, updated: '2 days ago', passCount: 41,
  },
  {
    id: 'quill-pmm', title: 'Product Marketing Manager', company: 'Quill', companyType: 'Prospect', companySource: 'Public posting URL',
    category: 'Marketing', subcategory: 'Product marketing', seniority: 'Senior', minYears: 5, location: 'Seattle, WA', workMode: 'Hybrid', relocationAccepted: true,
    sponsorship: 'Unknown', transfer: 'Unknown', mustSkills: ['Developer marketing'], niceSkills: ['Launches'], pay: '$150k–$175k',
    status: 'Open', jdVersion: 1, matchStatus: 'up-to-date', shortlisted: 1, updated: '3 days ago', passCount: 22,
  },
  {
    id: 'atlas-pd', title: 'Product Designer', company: 'Atlas Freight', companyType: 'Client', companySource: 'Intake call',
    category: 'Design', subcategory: 'Product design', seniority: 'Mid', minYears: 4, location: 'San Francisco, CA', workMode: 'Hybrid', relocationAccepted: false,
    sponsorship: 'Yes', transfer: 'Yes', mustSkills: ['Figma', 'B2B workflows'], niceSkills: [], pay: '$140k–$165k',
    status: 'Open', jdVersion: 1, matchStatus: 'out-of-date', outOfDateReason: 'Work mode changed: Onsite → Hybrid.', shortlisted: 2, updated: '5h ago', passCount: 18,
  },
  {
    id: 'cobalt-ds', title: 'Data Scientist', company: 'Cobalt Labs', companyType: 'Prospect', companySource: 'No JD',
    category: 'Data', subcategory: 'Data science', seniority: 'Mid', minYears: 3, location: 'Boston, MA', workMode: 'Hybrid', relocationAccepted: true,
    sponsorship: 'Yes', transfer: 'Yes', mustSkills: ['Experimentation', 'Python'], niceSkills: [], pay: '—',
    status: 'Open', jdVersion: 1, matchStatus: 'not-run', shortlisted: 0, updated: '6h ago', passCount: 27,
  },
  {
    id: 'pine-ae', title: 'Account Executive', company: 'Pinecrest', companyType: 'Client', companySource: 'Client JD',
    category: 'Sales', subcategory: 'Account executive', seniority: 'Mid', minYears: 4, location: 'Austin, TX', workMode: 'Onsite', relocationAccepted: false,
    sponsorship: 'No', transfer: 'No', mustSkills: ['Mid-market SaaS'], niceSkills: [], pay: '$90k base + OTE',
    status: 'Open', jdVersion: 1, matchStatus: 'up-to-date', shortlisted: 3, updated: '1 week ago', passCount: 15,
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
export const roleById = (id: string) => roles.find(r => r.id === id)

/* ---------- Matches (role → candidates) ---------- */
export const matches: Match[] = [
  // Northwind Pay · Senior PM
  { id: 'm1', roleId: 'northwind-spm', candidateId: 'priya', rank: 1, band: 'Strong', score: 88, status: 'new',
    reason: 'Owns merchant payouts at a Series B fintech; meets every must-have on evidence except SQL, which is predicted.',
    chips: [
      { kind: 'evidence', label: '7 yrs' }, { kind: 'evidence', label: 'SF hybrid' }, { kind: 'evidence', label: 'Payments' },
      { kind: 'evidence', label: 'H-1B · transfer supported' },
      { kind: 'predicted', label: 'SQL', detail: 'from Looker + Amplitude analysis work, 4 yrs' },
      { kind: 'gap', label: 'Pay +8% over range' },
    ] },
  { id: 'm2', roleId: 'northwind-spm', candidateId: 'jordant', rank: 2, band: 'Strong', score: 85, status: 'shortlisted',
    reason: 'Nine years on payments infrastructure; writes SQL daily and has shipped payout APIs.',
    chips: [{ kind: 'evidence', label: '9 yrs' }, { kind: 'evidence', label: 'Oakland hybrid' }, { kind: 'evidence', label: 'Payments' }, { kind: 'evidence', label: 'SQL' }, { kind: 'evidence', label: 'US citizen' }] },
  { id: 'm3', roleId: 'northwind-spm', candidateId: 'elenav', rank: 3, band: 'Good', score: 80, status: 'shortlisted',
    reason: 'Runs billing and monetization for a B2B SaaS; payments adjacent with strong pricing evidence.',
    chips: [{ kind: 'evidence', label: '7 yrs' }, { kind: 'evidence', label: 'SF hybrid' }, { kind: 'evidence', label: 'Billing' }, { kind: 'predicted', label: 'SQL', detail: 'from Mode dashboards, 3 yrs' }, { kind: 'evidence', label: 'H-1B · transfer supported' }] },
  { id: 'm4', roleId: 'northwind-spm', candidateId: 'ravip', rank: 4, band: 'Stretch', score: 74, status: 'new',
    reason: 'Fintech lending PM with SQL; work mode was never captured, so hybrid is assumed.',
    chips: [{ kind: 'evidence', label: '6 yrs' }, { kind: 'evidence', label: 'Fintech' }, { kind: 'evidence', label: 'SQL' }, { kind: 'assumed', label: 'Work mode' }, { kind: 'gap', label: 'Lending, not payouts' }] },
  { id: 'm5', roleId: 'northwind-spm', candidateId: 'sara', rank: 5, band: 'Stretch', score: 71, status: 'shortlisted',
    reason: 'Eight years of marketplace PM work with SQL; payments is predicted from checkout and seller billing.',
    chips: [{ kind: 'evidence', label: '8 yrs' }, { kind: 'evidence', label: 'SQL' }, { kind: 'evidence', label: 'Open to SF' }, { kind: 'predicted', label: 'Payments', detail: 'from checkout + seller billing work, 2 yrs' }, { kind: 'gap', label: 'Pay +21% over range' }] },
  { id: 'm6', roleId: 'northwind-spm', candidateId: 'fatimaz', rank: 6, band: 'Stretch', score: 62, status: 'new',
    reason: 'Fintech product designer moving into PM; strong payments context but no PM title yet.',
    chips: [{ kind: 'evidence', label: 'Payments' }, { kind: 'gap', label: 'No PM title' }, { kind: 'assumed', label: 'SQL' }] },
  { id: 'm7', roleId: 'northwind-spm', candidateId: 'paulk', rank: 7, band: 'Stretch', score: 58, status: 'rejected', rejectReason: 'Seniority',
    reason: 'BizOps lead with SQL and payments reconciliation exposure.',
    chips: [{ kind: 'evidence', label: 'SQL' }, { kind: 'predicted', label: 'Payments', detail: 'from reconciliation work' }, { kind: 'gap', label: 'Ops, not product' }] },

  // Lumen AI · Full-stack
  { id: 'm10', roleId: 'lumen-fse', candidateId: 'ana', rank: 1, band: 'Strong', score: 90, status: 'shortlisted',
    reason: 'Five years shipping React + Node in production; rebuilt a checkout in React and GraphQL.',
    chips: [{ kind: 'evidence', label: '5 yrs' }, { kind: 'evidence', label: 'Remote' }, { kind: 'evidence', label: 'React' }, { kind: 'evidence', label: 'Node.js' }, { kind: 'evidence', label: 'TypeScript' }, { kind: 'gap', label: 'STEM OPT · 5 mo left' }] },
  { id: 'm11', roleId: 'lumen-fse', candidateId: 'kwameo', rank: 2, band: 'Strong', score: 84, status: 'shortlisted',
    reason: 'Seven years full-stack; React front end over Rails, with two Node services owned end to end.',
    chips: [{ kind: 'evidence', label: '7 yrs' }, { kind: 'evidence', label: 'Remote' }, { kind: 'evidence', label: 'React' }, { kind: 'evidence', label: 'Node.js' }, { kind: 'evidence', label: 'US citizen' }] },
  { id: 'm12', roleId: 'lumen-fse', candidateId: 'ninaf', rank: 3, band: 'Good', score: 76, status: 'new',
    reason: 'Strong React and design-system work; Node is predicted from Next.js API routes.',
    chips: [{ kind: 'evidence', label: '4 yrs' }, { kind: 'evidence', label: 'React' }, { kind: 'predicted', label: 'Node.js', detail: 'from Next.js API routes, 2 yrs' }, { kind: 'evidence', label: 'OPT · sponsorship offered' }] },
  { id: 'm13', roleId: 'lumen-fse', candidateId: 'ishan', rank: 4, band: 'Stretch', score: 66, status: 'new',
    reason: 'Node and Vue experience; location and work authorization weren\u2019t captured.',
    chips: [{ kind: 'evidence', label: '4 yrs' }, { kind: 'evidence', label: 'Node.js' }, { kind: 'predicted', label: 'React', detail: 'from Vue, 4 yrs' }, { kind: 'assumed', label: 'Location' }, { kind: 'assumed', label: 'Work authorization' }] },

  // Brightdesk · Growth (pre-computed for when "Find matches" runs)
  { id: 'm20', roleId: 'brightdesk-gmm', candidateId: 'meic', rank: 1, band: 'Strong', score: 87, status: 'new',
    reason: 'Runs LinkedIn and Meta for a PLG B2B SaaS in NYC; five years of growth with clear CAC wins.',
    chips: [{ kind: 'evidence', label: '5 yrs' }, { kind: 'evidence', label: 'NYC' }, { kind: 'evidence', label: 'LinkedIn Ads' }, { kind: 'evidence', label: 'B2B SaaS' }] },
  { id: 'm21', roleId: 'brightdesk-gmm', candidateId: 'marcus', rank: 2, band: 'Good', score: 83, status: 'new',
    reason: 'Six years scaling paid social to $310k/month; LinkedIn Ads is predicted from Meta + Google Ads.',
    chips: [{ kind: 'evidence', label: '6 yrs' }, { kind: 'evidence', label: 'NYC onsite' }, { kind: 'predicted', label: 'LinkedIn Ads', detail: 'from Meta + Google Ads, 6 yrs' }, { kind: 'evidence', label: 'US citizen' }, { kind: 'evidence', label: 'B2B demand gen' }] },
  { id: 'm22', roleId: 'brightdesk-gmm', candidateId: 'chloew', rank: 3, band: 'Good', score: 78, status: 'new',
    reason: 'Lifecycle lead with paid experience; hybrid preference conflicts with onsite.',
    chips: [{ kind: 'evidence', label: '7 yrs' }, { kind: 'evidence', label: 'NYC' }, { kind: 'evidence', label: 'LinkedIn Ads' }, { kind: 'gap', label: 'Prefers hybrid' }] },
  { id: 'm23', roleId: 'brightdesk-gmm', candidateId: 'omarh', rank: 4, band: 'Stretch', score: 69, status: 'new',
    reason: 'B2B performance marketer in NYC metro; work authorization not captured.',
    chips: [{ kind: 'evidence', label: '5 yrs' }, { kind: 'evidence', label: 'Onsite' }, { kind: 'evidence', label: 'LinkedIn Ads' }, { kind: 'assumed', label: 'Work authorization' }] },
]

/** Extra matches revealed by "Show next 5" for Northwind (ranks 8+) */
export const northwindAfterRerun: Partial<Record<string, Match['delta']>> = {
  m3: 'new', m4: 'moved', m7: 'requalified',
}

export const eliminatedByRole: Record<string, { pool: number; pass: number; rules: { rule: string; count: number }[]; rows: Eliminated[] }> = {
  'northwind-spm': {
    pool: POOL_SIZE, pass: 96,
    rules: [{ rule: 'Location', count: 180 }, { rule: 'Minimum years', count: 92 }, { rule: 'Sub-category', count: 64 }, { rule: 'Work authorization', count: 40 }],
    rows: [
      { candidateId: 'leog', failing: ['Location (Seattle, not open to SF)'] },
      { candidateId: 'chloew', failing: ['Sub-category (Lifecycle marketing)'] },
      { candidateId: 'arjunm', failing: ['Work authorization (needs sponsorship)'] },
      { candidateId: 'dev', failing: ['Minimum years (3 of 6)', 'Sub-category (Full-stack)'] },
      { candidateId: 'marcus', failing: ['Location (NYC, not relocating)', 'Sub-category (Growth marketing)'] },
    ],
  },
  'lumen-fse': {
    pool: POOL_SIZE, pass: 64,
    rules: [{ rule: 'Sub-category', count: 290 }, { rule: 'Minimum years', count: 51 }, { rule: 'Location', count: 7 }],
    rows: [
      { candidateId: 'dev', failing: ['Minimum years (3 of 4)'] },
      { candidateId: 'benr', failing: ['Sub-category (Mobile)'] },
      { candidateId: 'tomasa', failing: ['Sub-category (Backend)'] },
    ],
  },
  'brightdesk-gmm': {
    pool: POOL_SIZE, pass: 38,
    rules: [{ rule: 'Category', count: 330 }, { rule: 'Location', count: 31 }, { rule: 'Minimum years', count: 13 }],
    rows: [
      { candidateId: 'hannahb', failing: ['Minimum years (4 of 5)', 'Location (remote only)'] },
      { candidateId: 'leog', failing: ['Location (Seattle)'] },
    ],
  },
}

/* ---------- Candidate → roles ---------- */
export const rolesForCandidate: Record<string, RoleMatchForCandidate[]> = {
  priya: [
    { roleId: 'northwind-spm', rank: 1, band: 'Strong', score: 88, status: 'shortlisted', reason: 'Owns merchant payouts at a Series B fintech; the role she came in for.', chips: [{ kind: 'evidence', label: 'Payments' }, { kind: 'evidence', label: 'SF hybrid' }, { kind: 'predicted', label: 'SQL', detail: 'from Looker + Amplitude' }] },
    { roleId: 'quill-pmm', rank: 2, band: 'Stretch', score: 61, status: 'new', reason: 'Strong API product launches; would be a move from PM into product marketing.', chips: [{ kind: 'evidence', label: 'API products' }, { kind: 'gap', label: 'PM, not PMM' }, { kind: 'assumed', label: 'Relocation to Seattle' }] },
    { roleId: 'cobalt-ds', rank: 3, band: 'Stretch', score: 52, status: 'new', reason: 'Heavy experimentation background, but no data-science title.', chips: [{ kind: 'evidence', label: 'Experimentation' }, { kind: 'gap', label: 'No Python' }] },
  ],
  marcus: [
    { roleId: 'brightdesk-gmm', rank: 1, band: 'Good', score: 83, status: 'new', reason: 'NYC onsite growth role; LinkedIn Ads predicted from six years of Meta + Google Ads.', chips: [{ kind: 'evidence', label: 'NYC onsite' }, { kind: 'predicted', label: 'LinkedIn Ads', detail: 'from Meta + Google Ads, 6 yrs' }, { kind: 'evidence', label: 'B2B' }] },
    { roleId: 'orbit-lc', rank: 2, band: 'Good', score: 74, status: 'new', reason: 'Lifecycle onboarding rebuild lifted trial-to-paid 23%.', chips: [{ kind: 'evidence', label: 'Lifecycle email' }, { kind: 'predicted', label: 'Braze', detail: 'used Braze at Notable' }] },
  ],
  ana: [
    { roleId: 'lumen-fse', rank: 1, band: 'Strong', score: 90, status: 'shortlisted', reason: 'React + Node in production for five years; remote; sponsorship offered.', chips: [{ kind: 'evidence', label: 'React' }, { kind: 'evidence', label: 'Node.js' }, { kind: 'evidence', label: 'Sponsorship offered' }] },
    { roleId: 'vela-fe', rank: 2, band: 'Good', score: 77, status: 'new', reason: 'Front-end heavy; design-system work is predicted from component library ownership.', chips: [{ kind: 'evidence', label: 'React' }, { kind: 'predicted', label: 'Design systems', detail: 'from shared component library' }] },
  ],
}

/* ---------- Resume outputs ---------- */
export const outputs: ResumeOutput[] = [
  { id: 'o1', candidateId: 'priya', type: 'Masked', roleId: 'northwind-spm', template: 'A · Compact', createdBy: 'Purvesh N.', created: 'Today, 10:42', stale: true },
  { id: 'o2', candidateId: 'ana', type: 'Masked', roleId: 'lumen-fse', template: 'C · Role-fit', createdBy: 'Vandit D.', created: 'Today, 09:15', stale: false },
  { id: 'o3', candidateId: 'kwameo', type: 'Masked', roleId: 'lumen-fse', template: 'C · Role-fit', createdBy: 'Vandit D.', created: 'Today, 09:15', stale: false },
  { id: 'o4', candidateId: 'jordant', type: 'Tailored', roleId: 'northwind-spm', template: 'Tailored · Classic', createdBy: 'Purvesh N.', created: 'Yesterday', stale: false },
  { id: 'o5', candidateId: 'marcus', type: 'Masked', roleId: null, template: 'B · Achievement-led', createdBy: 'Riya (intern)', created: 'Yesterday', stale: false },
  { id: 'o6', candidateId: 'sara', type: 'As-is', roleId: 'northwind-spm', template: 'Original', createdBy: 'Purvesh N.', created: '2 days ago', stale: false },
  { id: 'o7', candidateId: 'meic', type: 'Masked', roleId: null, template: 'A · Compact', createdBy: 'Riya (intern)', created: '3 days ago', stale: false },
  { id: 'o8', candidateId: 'chloew', type: 'Masked', roleId: 'orbit-lc', template: 'A · Compact', createdBy: 'Vandit D.', created: 'Last week', stale: true },
]

/* ---------- Activity log ---------- */
export const activity: LogEntry[] = [
  { id: 'l1', who: 'Purvesh N.', what: 'Applied revised JD (v3): added must-have SQL; minimum years 5 → 6', record: 'Senior PM — Northwind Pay', recordHref: '/roles/northwind-spm', when: '20 min ago', kind: 'Roles', before: 'Must-haves: Payments · 5+ yrs', after: 'Must-haves: Payments, SQL · 6+ yrs' },
  { id: 'l2', who: 'Purvesh N.', what: 'Shortlisted Sara M.', record: 'Senior PM — Northwind Pay', recordHref: '/roles/northwind-spm', when: '1h ago', kind: 'Decisions' },
  { id: 'l3', who: 'Purvesh N.', what: 'Rejected Paul K. · Seniority', record: 'Senior PM — Northwind Pay', recordHref: '/roles/northwind-spm', when: '1h ago', kind: 'Decisions' },
  { id: 'l4', who: 'Vandit D.', what: 'Generated 2 masked resumes (template C)', record: 'Full-stack Engineer — Lumen AI', recordHref: '/roles/lumen-fse', when: 'Today, 09:15', kind: 'Outputs' },
  { id: 'l5', who: 'Vandit D.', what: 'Applied 6 changes from call (Fathom)', record: 'Ana R.', recordHref: '/candidates/ana', when: 'Yesterday', kind: 'Candidates', before: 'Work authorization: Assumed', after: 'STEM OPT · needs sponsorship' },
  { id: 'l6', who: 'Purvesh N.', what: 'Included Leo G. anyway · fails Location', record: 'Product Marketing Manager — Quill', recordHref: '/roles/quill-pmm', when: 'Yesterday', kind: 'Overrides' },
  { id: 'l7', who: 'System', what: 'Matching run 4 · 64 ranked · top 5 shown', record: 'Full-stack Engineer — Lumen AI', recordHref: '/roles/lumen-fse', when: 'Yesterday', kind: 'Reruns' },
  { id: 'l8', who: 'Riya (intern)', what: 'Created profile from resume', record: 'Mei C.', recordHref: '/candidates/meic', when: '3 days ago', kind: 'Candidates' },
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
  { id: 'j1', field: 'Must-have skills', from: 'Payments', to: 'Payments, SQL', source: 'JD' },
  { id: 'j2', field: 'Minimum years', from: '5', to: '6', source: 'JD' },
  { id: 'j3', field: 'Pay range', from: '$165k–$185k', to: '$170k–$190k', source: 'JD' },
]

export const team = [
  { name: 'Purvesh Naik', initials: 'PN', email: 'purvesh@heroscouter.com', access: 'Admin' },
  { name: 'Vandit Dubey', initials: 'VD', email: 'vandit@heroscouter.com', access: 'Admin' },
  { name: 'Riya (intern)', initials: 'RI', email: 'riya@heroscouter.com', access: 'Member' },
]

export const REJECT_REASONS = ['Skills', 'Seniority', 'Location', 'Work authorization', 'Pay', 'Not interested', 'Other'] as const
