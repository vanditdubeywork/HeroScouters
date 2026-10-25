/** Founder-review walkthroughs (Product Design Doc §15 + PRD v0.3 Appendix A) */
export const FLOWS = [
  {
    id: 'F-13', title: 'v0.3 · Score in rounds (T2)', start: '/roles/brightdesk-gmm',
    steps: ['Brightdesk · 38 pass the must-haves (not scored)', 'Prune: filter, select, Skip for scoring', 'Score [10 ▾] with AI → 10 AI scores', 'Review ranked rows', 'Score 10 more — earlier scores kept'],
  },
  {
    id: 'F-12', title: 'v0.3 · Decide in bulk (T1)', start: '/roles/northwind-spm',
    steps: ['Hover a row → checkbox · or press X', 'Shift-click for a range · Select all shown', 'S → D-06 confirms assumed must-haves', 'Toast: Shortlisted 4 · Undo · Open shortlist', 'E on a filtered selection → one reason for all'],
  },
  {
    id: 'F-15', title: 'v0.3 · Filter, then act (T4)', start: '/candidates',
    steps: ['Category ▾ (pinned)', '+ Filter → Visa: Citizen or Green card', 'and Experience ≥ 5 — count updates', 'Not captured stays checked (P3)', 'Columns → hide / reorder · select all → act'],
  },
  {
    id: 'F-14', title: 'v0.3 · Add another resume (T3)', start: '/candidates/priya?tab=resumes',
    steps: ['Priya S. has Product + Growth resumes', '⋯ → Upload resume', 'D-07: Update of Product (v3) or Another resume?', 'Another → label + target function', 'Builders show a Source resume select'],
  },
  {
    id: 'F-17', title: 'v0.3 · Refine a masked resume (T6)', start: '/resumes/masked?candidates=priya&role=northwind-spm',
    steps: ['Type “Shorter, lead with payments” or pick a chip', 'Refine → changed sections highlighted', 'Keep or undo each section', 'Identity + fact check rerun', 'Fact wrong? Fix in profile'],
  },
  {
    id: 'F-19', title: 'v0.3 · Sign a take (T8)', start: '/resumes/masked?candidates=ana&role=lumen-fse',
    steps: ['Ana R. · AI draft from the call (not printed)', 'Edit the wording', 'Approve and sign → “— Vandit D., Talent Partner”', 'Prints on masked; email only for as-is'],
  },
  {
    id: 'F-18', title: 'v0.3 · Add a client ask (T7)', start: '/roles/northwind-spm?tab=details',
    steps: ['⋯ → Add client ask', '“Has led a team of 5+” → Must-have (no column)', 'Source: Call · Sean', 'Rule asks mark matches out of date', 'Scored rows show an evidence chip'],
  },
  {
    id: 'F-16', title: 'v0.3 · Edit a prompt (T5)', start: '/settings?tab=prompts',
    steps: ['Prompts → Masking (v4)', 'Edit text · insert a variable', 'Locked rules always appended', 'Try it on Priya S. → compare', 'Save v5 · Restore v4 from history'],
  },
  {
    id: 'F-01', title: 'Client role → matches → review', start: '/roles/new',
    steps: ['Company "Northwind Pay" · Client · paste JD', 'Extract role details → confirm must-haves', 'Save and find matches', 'Preview (Space) · Shortlist (S) · Reject (E)', 'See eliminated → Include anyway'],
  },
  {
    id: 'F-02', title: 'Prospect role → masked resumes → email', start: '/roles/lumen-fse?tab=shortlist',
    steps: ['Lumen AI (Prospect) · Shortlist tab', 'Select some → Generate masked resumes', 'Check identity per candidate', 'Download all', 'Copy email text (selected only, in order)'],
  },
  {
    id: 'F-04', title: 'Call enrichment → pitch more roles', start: '/candidates/priya',
    steps: ['Priya S. · Ask on next call → Copy questions', '⋯ → Add call → paste Fathom link', 'Apply 6 changes (62% → 88%)', 'Find roles → select 2–3', 'Copy message for candidate'],
  },
  {
    id: 'F-08', title: 'Revised JD → rerun → re-qualified', start: '/roles/northwind-spm',
    steps: ['Northwind Pay shows Out of date (JD v3)', 'Rerun re-scores only the 7 already scored', 'Read the rerun summary', 'Look at Re-qualified first'],
  },
]
