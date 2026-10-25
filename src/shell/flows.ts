/** Founder-review walkthroughs (Product Design Doc §15) */
export const FLOWS = [
  {
    id: 'F-01', title: 'Client role → matches → review', start: '/roles/new',
    steps: ['Company "Northwind Pay" · Client · paste JD', 'Extract role details → confirm must-haves', 'Save and find matches', 'Preview (Space) · Shortlist (S) · Reject (X)', 'See eliminated → Include anyway'],
  },
  {
    id: 'F-07', title: 'Urgent list in under a minute', start: '/candidates',
    steps: ['Tap the Marketing chip', 'Narrow by sub-category or location', 'Copy list ▾ → Masked', 'Paste into email or Slack'],
  },
  {
    id: 'F-02', title: 'Prospect role → masked resumes → email', start: '/roles/lumen-fse?tab=shortlist',
    steps: ['Lumen AI (Prospect) · Shortlist tab', 'Generate masked resumes (bulk)', 'Check identity per candidate', 'Download all', 'Copy email text'],
  },
  {
    id: 'F-04', title: 'Call enrichment → pitch more roles', start: '/candidates/priya',
    steps: ['Priya S. · Ask on next call → Copy questions', '⋯ → Add call → paste Fathom link', 'Apply 6 changes (62% → 88%)', 'Find roles → select 2–3', 'Copy message for candidate'],
  },
  {
    id: 'F-08', title: 'Revised JD → rerun → re-qualified', start: '/roles/northwind-spm',
    steps: ['Northwind Pay shows Out of date (JD v3)', 'Rerun matching → confirm 96 re-ranked', 'Read the rerun summary', 'Look at Re-qualified first'],
  },
]
