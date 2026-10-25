# HeroScouter Talent Engine — PRD v0.4

**Merges Purvesh's feedback (C1–C14) with Vandit's tasks (T1–T10) · supersedes v0.3 · internal (for us)**

Legend: ✅ Settled by Purvesh · ➜ Recommended (needs Purvesh's OK) · 🔶 Assumption · 🔵 Open question · ◆ Checkpoint

| | |
|---|---|
| **Author** | Vandit Dubey (product) |
| **Reviewers** | Purvesh Naik (founder) · Arjun (developer) |
| **Sources** | Product review call with Purvesh (68 min; call refs in each section) · Purvesh's feedback list C1–C14 · Vandit's task list T1–T10 · the wireframe app (`src/`) |
| **Earlier docs** | [PRD v0.3](heroscouter-prd-v0.3.md) (task-by-task detail) · [PRD v0.2](heroscouter-prd-v0.2.md) · [Product design doc](heroscouter-product-design-doc.md) |
| **◆ Gate** | Every in-scope item has a settled flow, screens, data and rules **before the developer hand-off**. Design owns the journey; engineering owns the how (B4). |

---

## 0. What changed from v0.3

| Area | v0.3 said | v0.4 says | Source |
|---|---|---|---|
| **Framing** | Nine feedback tasks | **Two core use cases** (onboarded client, prospect), with every screen checked against "who looks, what do they decide?" | C1, B1 |
| **Role intake** | Stage 1 runs on save | **Auto-scan on save**: stage 1, plus 5 suggestions scored automatically (Admin can set 0). The team approves or rejects on the same screen. | C5 |
| **Requirements** | Must-haves, nice-to-haves and client asks as three lists | **One Requirements list** per role, each marked *Eliminates* or *Improves score*, with a source (JD, call, email) | C6, T7 |
| **Pipeline states** | Fit bands, plus a "Skip for scoring" state | **Eliminated → Not scored → Scored → Shortlisted / Rejected / Not interested.** The not-eliminated list is shown as *not scored*, never as "good". Pruning is just reject-with-reason. | C6 |
| **Scoring output** | Band (Strong / Good / Stretch), score, reason, chips | **Requirements met (4/4) · green flags · red flags · recommendation** (Strong / Mild / Not recommended). No numeric score on screen. | C6 |
| **Keys** | Remap to Gmail (X select, E reject) | **Keep the keys Purvesh praised** (S shortlist, X reject). Add selection with Shift+J/K and Shift-click. | E, T1 |
| **Filters** | OR inside a column, AND across columns | Same rule, plus ✅ **adding the same column again = OR** (Sheets) | C8 |
| **Sending** | Copy email text | **Alignment per candidate** (candidate side, client side, either order) · email drafts for either party · **bulk handoff to Gmail and Sheets** | C2, C4 |
| **Email drafting** | Drafted in the product | **Test two options**: draft in the product vs copy the prompt into your own Claude. Decide at a checkpoint. | C3 |
| **Delivery** | PDF | **PDF or web link** from the same page. **Test two styles**: creative vs traditional Word-style. | C12 |
| **Candidates** | Resume upload first | **Resumes mostly arrive by link** (Drive, sheet). Mark **"not interested" per role**. Third-party role suggestions stay outside the tool. | C9, C10 |
| **Cut on purpose** | — | A cut list (§11) | B3 |

**Source map** (so nothing is worked on twice)

| Purvesh | Vandit | Where in v0.4 |
|---|---|---|
| C1 Two core use cases | — | §2, §5 |
| C2 Alignment, either order | — | §7.5 |
| C3 Email drafting test | — | §7.7, §8 |
| C4 Bulk + one-click handoff | T1 | §7.3, §7.5 |
| C5 Auto-scan | T2 | §7.1 |
| C6 Filtering and scoring pipeline | T2 | §7.2 |
| C7 Bulk reject with filters | T4, T1 | §7.3 |
| C8 Sheets-style filters | T4 | §7.3 |
| C9 Candidate module stays simple | T3 | §7.4 |
| C10 Not interested per role | — | §7.4 |
| C11 Output types | T6 | §7.6 |
| C12 Delivery and format test | — | §7.6, §8 |
| C13 Regenerate + named take | T8 | §7.6 |
| C14 Prompt-based iteration | T6 | §7.6 |
| — | T3 Several resumes | §7.4 |
| — | T5 Settings: prompts, templates, access | §7.8 |
| — | T7 Client asks | §7.1 (now part of Requirements) |
| — | T9 Roles cleanup | §7.9, §11 |
| D Out of scope | T10 List building | §10 |

---

## 1. Principles

**Purvesh's rules (apply to every screen) ✅**
- **B1 · Who looks, and what do they decide?** Every screen answers both, or it gets cut. §3 lists the answer for every screen. (call 2:24–2:37)
- **B2 · As simple as possible.** Whatever is on screen must help a decision. (54:10)
- **B3 · Think before building, and cut on purpose.** Deciding upfront is painful but pays off. A tool that's hard to change ends up costing its team hours a day. (40:53–44:11)
- **B4 · Design for speed and the journey.** Engineering owns the how; design gives its opinion. (46:42)
- **B5 · Don't design for every use case now.** About 20 more will be built on the fly later. (20:51)

**Our rules (kept from v0.2–v0.3)**
- **The tool remembers, filters and drafts. People decide and do the talking.**
- **Free before paid.** Hard filters and manual pruning come before anything that costs tokens. A paid step shows its count before it runs.
- **Missing data never eliminates anyone.** It shows as *Assumed* or *Not captured*.
- **Columns, not code.** Filters and eliminators only use stored columns. ✅ "It won't be done by prompt alone."
- **One selection pattern** for every list: checkboxes, ranges, a selection bar, one undo per batch.
- **Facts live in the profile; wording lives in the output.**
- **A named vouch is a human act.** Only the person named on a take can approve it.

---

## 2. Problem and the two core use cases

**Who:** HeroScouter's internal team only ✅ ("this entire ecosystem is for us right now", 2:59). Candidates are what we sell to clients (59:47).

**The problem:**
- **The team does every step by hand.** Matching, shortlisting, writing resumes and emailing all happen one at a time across tabs.
- **AI on everything is expensive.** Purvesh's own example: 385 of the pool fail the role's hard requirements before anyone needs to look.
- **Sending is slow and untracked.** Nobody can see which side of a placement has agreed.

**The two situations the tool must serve ✅ (8:32–9:15)**

| Step | (a) Onboarded client: "send me resumes" | (b) Prospect: a company found online is hiring |
|---|---|---|
| **Role comes from** | Client JD, intake call, email ask | Public posting, or a short description |
| **Matching** | Same pipeline (§7.2) | Same pipeline |
| **Output** | **As-is or editable**, identity shown | **Masked only** (locked) ✅ |
| **Take** | In the email (as-is) or a note block (editable) | On the masked resume |
| **Consent** | Needed, **in either order** (C2): ask the candidate first, or show the client first | Not before pitching (identity is hidden). Ask once the prospect is interested. |
| **At the sending step** | Two possible drafts (candidate interest check, client profile share) plus alignment status | One pitch email per prospect, with masked PDFs or links |
| **Bulk** | Several candidates → one client | Several candidates → one prospect, and several prospects at once |
| **Done when** | Both sides say yes → intro (manual from here) | The prospect replies with interest → becomes a client → flow (a) |

**Where they diverge:** only at **output** and **sending**. Intake, scanning, filtering, scoring and shortlisting are the same screens.

---

## 3. Users, and what each screen is for (B1)

| User | Uses the tool for |
|---|---|
| **Founder-recruiter** (Purvesh) | Deciding shortlists, vouching for candidates, owning Settings |
| **Recruiter / ops** (Vandit) | Role intake, pruning and scoring, data quality, prompts |
| **Associates / interns** 🔶 | Adding candidates, urgent lists, masked resumes, drafting outreach |
| **Developer** (Arjun) | Builds from this PRD |

**Every screen: who looks, and what they decide**

| Screen | Who looks | The decision | Primary action | Cut or changed |
|---|---|---|---|---|
| **S-02 Roles** | Founder, recruiter (daily) | Which role needs me now, and what's the next step? | The next-step button on the row | Must-haves column cut · "Latest update" added |
| **S-03 Role intake** | Whoever gets the JD | Are these the right requirements, and which ones eliminate? | **Save and scan** | Three requirement lists → one |
| **S-04 Matches** | Recruiter | Who stays, who gets scored, who gets shortlisted? | **Score** / **Shortlist** | Band select, Top 5 switch, Hide decided and the hint text cut |
| **S-04 Shortlist** | Founder, recruiter | Who goes to whom, in what order, and which side do I ask first? | **Prepare and send** | Alignment pills added |
| **S-04 Details** | Recruiter | Is the role still right? | Edit role | History tab and version card cut |
| **S-05 Candidates** | Associate, recruiter | Who in our pool fits this ask? | Copy list / Generate masked / Add to role | AI Scout, split view and the 11-group console cut |
| **S-06 Add candidate** | Intern, recruiter | New person, or an update to someone we have? | **Save and find roles** | Link-first input |
| **S-07 Candidate** | Recruiter after a call | What's missing, which roles to pitch, which roles they declined | **Find roles** / Not interested | "Not interested" added |
| **S-08 Preview** | Recruiter | Shortlist or reject this one | S / X | — |
| **S-09 Masked builder** | Recruiter, associate | Is it safe and convincing enough to send? | **Download / Send** | — |
| **S-10 Editable / as-is** | Recruiter | Send as-is, or edit first? | **Approve** | — |
| **S-11 Resumes** | Anyone | Re-send or regenerate something already made | Download | Kept, low traffic. Revisit after real use. |
| **S-12 Activity** | Founder (rarely) | Why did this happen? | — | Kept as the audit trail |
| **S-13 Settings** | Admin (rarely) | How should the AI behave, and who can do what? | Save | Prompts tab added |

---

## 4. Scope

**In scope now ✅**
- Role intake → matching against the existing pool → filtering and scoring → shortlisting → masked or as-is resumes → email.
- Candidate → existing-client matching ("Find roles"). (18:30)
- Use cases C1 (a) and (b).
- Everything in §7.

**Out of scope or deferred:** §10.

---

## 5. The core journey

```
ROLE IN ─ JD, call, file, pasted text or a short description (+ optional context)
   │
   ▼  Save and scan  (automatic, free)
ELIMINATED (e.g. 385) ── hidden, counted by rule, "Include anyway" possible
   │
NOT SCORED (e.g. 27) ── labelled "not scored", neutral, no ranking colour
   │   + 5 suggestions scored automatically (Admin setting, default 5)
   ▼  Prune by hand (free): filters → bulk reject with a reason
   ▼  Score (paid): "Score 22 with AI"
SCORED ── requirements met 4/4 · green flags · red flags · Strong / Mild / Not recommended
   ▼  Shortlist (one by one with S/X, or in bulk)
SHORTLIST ── order · source resume per candidate
   │
   ├─ (a) CLIENT ── ask the candidate ⇄ show the client (either order) → both say yes → intro
   │        output: as-is or editable · take in the email
   │
   └─ (b) PROSPECT ── masked resumes (PDF or link) → pitch email → interested → becomes a client
            output: masked only · signed take on the page
   ▼
HANDOFF ── Gmail drafts in bulk · rows for the outreach sheet · ZIP
```

---

## 6. Success metrics

**Primary metric:** time from **role saved** to **shortlist ready to send**. Target: **under 10 minutes for a 5-person shortlist** 🔶 (no baseline yet 🔵).

**Secondary**
- **Median AI scores per role ≤ 25** 🔶. In the build today, every not-eliminated candidate gets scored.
- **Auto-suggestions accepted** (shortlisted from the 5 suggested): **≥ 40%** 🔶. This tells us whether auto-scan is worth its tokens.
- **≥ 50% of decisions made in bulk** on roles with 5+ shortlisted 🔶.
- **Clicks from shortlist to Gmail draft: 1** for a single send, **1 per batch** for bulk.
- **Client roles with both sides aligned:** tracked from the start, no target yet 🔵.
- **The two tests (§8):** rework rounds per email and interest rate per resume style.

**Guardrails**
- **0** candidates eliminated because data is missing.
- **0** identity-revealing outputs sent to a prospect.
- **0** takes printed without the signer's approval.
- **0** refinements that add a fact not in the profile.
- Every bulk action can be undone as one batch.

---

## 7. Requirements by module

Stories use the format *As a / I want to / so that*, with one Gherkin scenario each. IDs US-24…US-45 come from v0.3 (marked *rev* where they changed). US-46 onward are new.

### 7.1 Role intake and auto-scan
**Covers:** C5, C6 (hard requirements), T7 (client asks) · **Owner:** Product (logic) + Design · **Priority:** Must

**Decisions**
- **One Requirements list per role** ➜ replaces must-haves, nice-to-haves and client asks. Each requirement has:
  - **Text** (in our words)
  - **Source:** JD · client call · email/chat (who said it)
  - **Effect:** **Eliminates** (hard filter) or **Improves score**
  - **Column** it maps to, if any
- **The AI reads the JD and proposes requirements; a person confirms them** ✅. Elimination itself is plain logic on stored columns, never the prompt alone ✅ (22:00–26:22).
- **Only requirements that map to a column can eliminate.** "Has led a team of 5+" can only improve the score.
- **Default effect by type** ➜ (Purvesh to confirm):

| Eliminates by default | Improves score by default |
|---|---|
| Minimum years · work authorization vs sponsorship and transfer offered · location, relocation, work mode · category (function) | Skills (wording varies, and predicted skills exist) · sub-category · domain · pay · availability · company stage · every free-text requirement |

- **Auto-scan runs on save** ✅ (21:58):
  - Stage 1 runs instantly and for free.
  - The **top 5 by similarity are scored automatically** as suggestions ➜. Admin sets the number (0 turns it off).
  - Everyone else waits as *not scored*.
- **Approve and reject happen on the same screen** (the Matches tab), because AI can be wrong ✅.
- **Telling the team:**
  - The person who saved the role gets a toast.
  - The Roles nav shows a badge.
  - The role's row reads "Scan done · 5 suggested · 22 not scored".
- **New candidates are auto-scanned against open roles too** (stage 1 only; "May fit N roles" exists). A JD revision re-runs stage 1 for free. Re-scoring stays manual.

**Flow F-20 · Role in → suggestions**
1. Paste or upload the JD, or paste a Fathom transcript or a short description.
2. **Extract**: the AI proposes requirements, each with an effect.
3. Confirm, toggling *Eliminates* where needed.
4. **Save and scan**.
5. The Matches tab opens with the funnel, the 5 suggestions and the not-scored list.

**Screens**
- **S-03:** the right pane becomes the Requirements list, one row each: text · source badge · column chip · *Eliminates / Improves score* switch · remove.
- **S-04 header ⋯ → Add requirement** (dialog D-08) is for things said on a call ✅. The team adds these; there's no free entry by anyone else (26:43–27:25).
- Adding or changing an *Eliminates* requirement re-runs stage 1 for free. Scores that may now be out of date are flagged, and the team chooses when to re-score.

**Stories**
- **US-46 · Confirm what eliminates.** As a recruiter, I want to see each requirement the AI extracted and choose whether it eliminates, so that only rules I trust remove candidates.
  *Given* the AI proposed "6+ years" and "Payments" · *When* I save with "6+ years" set to Eliminates and "Payments" set to Improves score · *Then* stage 1 removes only candidates with fewer than 6 years, and Payments is checked during scoring.
- **US-47 · Suggestions the moment a role lands.** As a founder-recruiter, I want existing candidates scanned and a few suggested as soon as a role is saved, so that I can approve or reject them right away.
  *Given* Cobalt Labs' Data Scientist role is saved · *When* the scan finishes · *Then* the Matches tab shows 5 scored suggestions and the not-scored count, and I get a toast with a link.
- **US-41 rev · Add what the client said.** As a founder-recruiter just off a call, I want to add a requirement to the role in under a minute, so that matching uses what the client actually wants.
  *Given* the Northwind role is open · *When* I add "Has led a team of 5+" with source "Call · Sean" · *Then* it appears in Requirements as *Improves score*, and scored rows show whether it's met.
- **US-42 · Requirements from a transcript.** As a recruiter, I want a call transcript turned into proposed requirements that I accept one by one, so that nothing the client said is lost or added without my OK.
  *Given* I paste a Fathom link · *When* the AI proposes 4 requirements · *Then* only the ones I accept are added, each with source "Call".

---

### 7.2 Elimination → pruning → scoring
**Covers:** C6 (main logic), T2 · **Owner:** Product (logic) + Design (states) · **Priority:** Must

**One vocabulary for states, used everywhere ✅ ("non-eliminated", not "good")**

| State | Label on screen | Meaning | How it looks |
|---|---|---|---|
| **Eliminated** | "Eliminated · fails Work authorization" | Failed a requirement that eliminates | Collapsed group, counted by rule, *Include anyway* |
| **Not scored** | "Not scored" | Passed the hard filters. **Nothing has been judged yet.** | Neutral row: facts only, no rank number, no colour |
| **Scored** | "Strong" / "Mild" / "Not recommended" · "4/4 requirements" | AI judged fit | Recommendation pill, met list, flags |
| **Shortlisted** | "Shortlisted" | The team chose them | Green edge (exists) |
| **Rejected** | "Rejected · Location" | The team removed them, while pruning or after scoring | Collapsed dashed row, with undo |
| **Not interested** | "Not interested · Pay" | The candidate declined this role (§7.4) | Collapsed, never suggested again for this role |

Re-qualified (after a rerun) stays as a flag on top of a state.

**Funnel line** (always at the top of Matches): `412 in pool → 385 eliminated → 27 not scored → 5 suggested → 3 shortlisted`

**Pruning:** the team removes obvious misfits by hand ✅. Pruning **is** rejecting with a reason, one by one (X) or in bulk from a filter (§7.3). v0.3's separate "Skip" state is cut (B2).

**Scoring on demand ✅** (flow F-21 · Prune and score)
- **Where:** the header of the *Not scored* group carries the screen's primary button: **"Score 22 with AI"**.
- **How many:**
  - 25 or fewer remaining: it scores them all.
  - More than 25: a select offers 10 · 25 · 50 · All. Those get scored first, in similarity order, which is labelled "Sorted by similarity to the JD. Not a score."
- **Score more:** "Score 10 more" keeps earlier scores and never redoes them.
- **Rerun:** a rerun re-scores only candidates already scored. The count shows first.
- **Shortlisting without a score is allowed** ➜. The row says "Not scored" instead of a recommendation.

**Scoring output ✅ (what a scored row shows)**
- **Requirements met: 4/4.** Expands to one line per requirement: Met (evidence) · Not met · Assumed (missing data) · Predicted (adjacent skill, with its basis).
- **Green flags** (up to 3): strengths beyond the requirements, e.g. "Owned payouts at a Series B fintech".
- **Red flags** (up to 3): risks, e.g. "Pay expectation above range", "Visa expires in 8 months", "3 jobs in 2 years".
- **Recommendation:** **Strong** · **Mild** · **Not recommended** ➜ (Purvesh said "strong or mild"; a third level covers poor fits that still passed the hard filters 🔵).
- **One-line reason.** No numeric score on screen. The "show score" setting is cut.
- Reasons cite requirements and evidence, never brand names alone (big-company bias).

**Stories**
- **US-48 · Not scored means not judged.** As a recruiter, I want candidates who passed the hard filters shown as "not scored", so that nobody mistakes "not eliminated" for "good".
  *Given* 27 candidates pass the hard filters · *When* I open Matches · *Then* they show under "Not scored (27)" with facts only, with no rank, colour or recommendation.
- **US-29 rev · Prune before paying.** As a recruiter, I want to reject obvious misfits before scoring, so that tokens go only to people I'd consider.
  *Given* I rejected 5 of the 27 · *When* I click "Score 22 with AI" · *Then* only those 22 are scored.
- **US-27 rev · Choose how many to score.** As a recruiter, I want to choose how many get scored when the list is long, so that a quick ask costs little and a wide search gets depth.
  *Given* 96 are not scored · *When* I choose 10 and score · *Then* the 10 most similar are scored, and the log records 10 AI scores.
- **US-28 · Score more later.** *Given* 10 are scored · *When* I click "Score 10 more" · *Then* the next 10 are scored and the first 10 keep their results.
- **US-49 · Read a scored candidate in seconds.** As a recruiter, I want each scored row to show requirements met, green and red flags, and a recommendation, so that I can decide without opening the profile.
  *Given* a scored candidate · *When* I look at the row · *Then* I see "4/4 requirements", up to 3 green and 3 red flags, and Strong, Mild or Not recommended, with no numeric score.

---

### 7.3 Lists: filters, columns, bulk actions
**Covers:** C7, C8, C4 (bulk), T1, T4 · **Owner:** Design (Product for columns) · **Priority:** Must

**Filters: the Google Sheets model ✅ (36:31–37:42)**
- **Different columns combine with AND.**
- **OR comes from selecting several values in one column** (B2B, Payments, Growth) **or from adding the same column again.** Repeated chips of one column group together with "or".
- **Filters only use stored database columns** ✅ ("This will be solved. Don't worry about this.", 27:25–28:27). No filters are generated on the fly.
- **Missing values:** every values list includes "Not captured" with its count, checked by default.
- **One bar above the table**, the same on Candidates and Matches:

```
[Category ▾]  [Visa: Citizen or Green card ×] and [Experience ≥ 5 ×]  [+ Filter]     42 match · Clear all   [Columns]
```

- **"+ Filter"** opens a column list, then the right picker: a values checklist with counts · a number condition (≥ ≤ between) · *Any of / All of* for skills and domain.
- **Column header menu:** sort · filter this column · hide column.
- **Columns** ✅: show all, hide what you don't need, drag to reorder, reset. Saved per person 🔶.
- **Filterable at launch** (unchanged from v0.3 §7.4): category · sub-category · **Domain** (new stored column, values kept in Settings) · years · location (metro) · work mode · relocation · work authorization · sponsorship and transfer · pay · availability · search status · skills · completeness · source · resume label. On Matches only: state · recommendation · requirements met · has assumed fields.

**Bulk actions: one pattern everywhere**
- **Select** with a checkbox, **Shift+click** for a range, **Shift+J/K** to extend from the focused row, or the header's "Select all 12 shown", plus "Select all 42 that match".
- **The selection bar** replaces the toolbar: *6 selected · Shortlist (S) · Reject (X) · Clear (Esc)*.
- **Keys stay as tested** ✅ ("really brilliant", 46:33): J/K move · Space preview · **S shortlist · X reject** · U undo. While rows are selected, S and X act on the selection and the bar shows the count.
  - Note: the team's notes said "E to reject", but the tested build uses X. E keeps opening the eliminated list. 🔵 Confirm.
- **Assumed must-haves confirm (D-06):** shortlisting a selection that includes assumed hard requirements asks first, defaulting to "Shortlist the 4 verified".
- **Bulk reject from a filter ✅ (C7):** filter (e.g. "Needs sponsorship = Yes" on a role with no sponsorship) → select all matching → **Reject** with one reason, pre-picked from the filter's column (→ "Work authorization"). One undo restores everyone.

**Which actions get bulk support (C4)**

| Action | Where | Bulk |
|---|---|---|
| Shortlist, reject | Matches, Candidate → roles | ✓ |
| Mark not interested | Candidate → roles | ✓ |
| Generate masked resumes | Shortlist, Candidates, Roles (pitch prep) | ✓ |
| Draft emails | Shortlist, Roles (pitch prep) | ✓ one draft per recipient |
| Create Gmail drafts | Same places | ✓ (§7.5) |
| Download | Shortlist, Resumes | ✓ ZIP |
| Copy list or sheet rows | Candidates, Shortlist | ✓ |
| Export CSV | Candidates (Admin) | ✓ |

**Stories**
- **US-33 rev · Filter like a spreadsheet.** As a client-comms associate, I want to combine filters the way Sheets does, so that I get the exact list without building a query.
  *Given* "Domain: B2B" · *When* I add Domain again with "Payments" · *Then* the chips group as "Domain: B2B or Payments", and the count updates instantly.
- **US-34 · Show only the columns I need.** *Given* the Columns menu is open · *When* I hide Pay and move Work auth second · *Then* the table changes, and it's still that way next time.
- **US-35 · Missing data stays visible.** *Given* 12 candidates have no work authorization captured · *When* I filter "Visa: Citizen" · *Then* "Not captured · 12" is checked by default, and those 12 stay in the list marked Assumed.
- **US-24 · Shortlist several at once.** As a founder-recruiter, I want to select several rows and shortlist them in one action, so that a 5-person shortlist is one decision.
  *Given* 6 scored rows are selected · *When* I press S · *Then* all 6 join the shortlist in order, with one Undo for all.
- **US-25 rev · Reject everyone a filter catches.** As a recruiter, I want to reject every candidate who fails a client's stated condition in one step, so that a long list shrinks to the realistic ones.
  *Given* the filter "Needs sponsorship = Yes" shows 14 people · *When* I select all and reject · *Then* all 14 are rejected with "Work authorization" logged for each, and one Undo restores them.

---

### 7.4 Candidates
**Covers:** C9, C10, T3 · **Owner:** Product + Design · **Priority:** Must

**Keep the module simple ✅ (30:32–31:49)**
- **Resumes mostly arrive by link, not manual upload.** ➜ v1 accepts:
  - A pasted link (Google Drive, Dropbox, a LinkedIn PDF)
  - A file
  - **Bulk import from the outreach sheet** (rows with resume links)
  - 🔵 Which other sources does the team actually use? A synced Drive folder can come later.
- **Inputs stay as built:** resume, Fathom notes, call transcript or video → **Save and find roles**.
- **Third-party AI role suggestions stay outside the tool** ➜ (B2, B5). Our own "Find roles" is the in-tool option. There's no side-by-side view in v1.

**Several resumes per candidate (T3, unchanged from v0.3 §7.3)**
- One profile holds the facts about the person. Each resume has its own versions.
- On upload, the tool asks (D-07): **"An update of an existing resume, or another resume?"**
- Scoring uses the resume whose target function matches the role. Every output records its source resume.
- Candidates with only one resume see no extra UI.

**Not interested in a role ✅ (C10, 34:22)** (flow F-24, dialog D-10)
- **Where it's marked:**
  - The candidate's Matching roles list (bulk too)
  - The Shortlist row's candidate pill (§7.5)
  - Automatically, when the candidate side of the alignment is set to "Not interested"
- **Reason** (one tap): Pay · Location · Company · Role type · Timing · Not looking · Other.
- **Effect on that role:** the candidate leaves the role's lists into a collapsed "Not interested" group and is **never suggested for it again**, even after reruns, until someone undoes it.
- **Effect on future matching:**
  - If the reason is a preference (pay, location, work mode, company stage), the tool proposes a profile update ("Update Priya's minimum pay to $190k?"), which is accepted like any proposed change.
  - Other roles are affected only through that accepted change.

**Stories**
- **US-50 · Add a candidate from a link.** As an intern, I want to paste a resume link, or import rows from the outreach sheet, so that candidates come in without downloading and re-uploading files.
  *Given* a Drive link to a resume · *When* I paste it and save · *Then* a draft profile is created from it, and stage 1 checks it against open roles.
- **US-30 · Add another resume.** *Given* Priya has "Product resume v3" · *When* I upload a file as "Another resume", labelled Growth · *Then* both stay current, and only the facts I accept change the profile.
- **US-32 · See which resume a match used:** as in v0.3. The match row shows "Scored on …" only when a candidate has two or more resumes.
- **US-51 · Record that a candidate declined a role.** As a recruiter, I want to mark a candidate not interested in a role, with a reason, so that we never pitch them that role again and their preferences improve.
  *Given* Priya is matched to 10 roles · *When* I mark 4 as not interested with reason "Pay" · *Then* she disappears from those 4 roles' lists, and the tool proposes updating her minimum pay.

---

### 7.5 Shortlist → alignment → sending
**Covers:** C1, C2, C4 (handoff) · **Owner:** Product (flow) + Design · **Priority:** Must (Gmail handoff: 🔵 needs engineering's call)

**Alignment: who has said yes ✅ (9:15–11:28)** (flow F-22 · Align and send)
- Each shortlisted candidate on a **client role** shows two pills, which can be set in either order:
  - **Candidate:** Not asked → Asked → Interested / Not interested
  - **Client:** Not sent → Sent → Interested / Passed
- **"Both aligned"** shows when both are Interested. From there it's manual (intro, interviews).
- **Pills move by one click** ("Mark interested"). Creating or copying an email sets *Asked* or *Sent* automatically 🔶.
- **Prospect roles** show **Prospect:** Not pitched → Pitched → Interested / Passed. The candidate pill stays *Not asked* until the prospect is interested.
- This is **not** stage tracking (still deferred). It's two pills and nothing more (B2).

**Email either side first ✅**

| Draft | Sent to | When |
|---|---|---|
| Interest check | Candidate | Candidate-first, or after the client says yes ("convince") |
| Profile share ("Would you want to talk to them?") | Client | Client-first: profile summary or LinkedIn |
| Shortlist | Client | Several candidates, with as-is or editable resumes |
| Pitch | Prospect | Masked resumes, as PDF or link |
| Roles for you | Candidate | From the candidate profile (exists) |

- **Client-first is allowed** ✅. Until the candidate has said yes, the row shows "Candidate not asked yet". Nothing blocks the send.
- **Identity never goes to a prospect.** Pitch drafts only ever attach masked outputs.

**One-click handoff to other apps ✅ (C4: 12:54, 53:05)**
- Today each email is copied and pasted into Gmail compose by hand (7:38).
- **Gmail:** "Create Gmail draft" for one, or **"Create 8 Gmail drafts"** for a selection, one per recipient. Bulk creation first shows a review list (D-09). Each draft has the To, subject, body and attachments filled in, and lands in the sender's own Drafts folder to review and send.
  - Fallback when there's no Gmail connection: "Open in Gmail" with the body and a resume link.
  - 🔵 The connection method is engineering's call (B4).
  - A person still presses Send.
- **Sheets:** "Copy rows for the outreach sheet" (tab-separated: company, role, candidate alias, link, date sent).
- **Clipboard and ZIP:** copy list (masked by default), download all.
- **Recipient emails** need a contact on the role ➜: Role adds an optional **Hiring contact** (name, email). Prospect contacts come from the outreach sheet.

**Bulk prospect pitches (C4) · Should** (flow F-23)
- On Roles, select several prospect roles that have shortlists → **Prepare pitches**.
- This generates the masked resumes and one pitch draft per prospect, shown as one review list.
- Then **Create N Gmail drafts**.

**Stories**
- **US-52 · See who has said yes.** As a founder-recruiter, I want each shortlisted candidate on a client role to show whether the candidate and the client have agreed, so that I know which side to chase.
  *Given* Marcus is shortlisted for Brightdesk · *When* the client says yes before Marcus has been asked · *Then* the row shows "Client: Interested · Candidate: Not asked", and the next action offers "Email Marcus".
- **US-53 · Email whichever side comes first.** As a recruiter, I want to draft an email to the candidate or the client from the same row, so that the order of consent never slows a placement.
  *Given* a shortlisted candidate · *When* I choose "Ask the client first" · *Then* a profile-share draft opens, and sending it sets Client to Sent.
- **US-54 · Bulk handoff to Gmail.** As a recruiter, I want to turn 8 prepared emails into 8 Gmail drafts in one click, so that I stop copying and switching tabs.
  *Given* 8 drafts with recipients · *When* I click "Create 8 Gmail drafts" · *Then* all 8 appear in my Gmail Drafts with their attachments, and their statuses update.
- **US-26 · Act on part of the shortlist.** *Given* 8 are shortlisted and 3 are selected · *When* I click "Copy email text" · *Then* the email includes only those 3, in shortlist order.
- **US-55 · Pitch several prospects at once** *(Should)*. As a founder, I want to prepare pitches for several prospect roles in one pass, so that bulk outreach takes minutes.
  *Given* 5 prospect roles each have a shortlist · *When* I click "Prepare pitches" · *Then* I get 5 pitch drafts with masked resumes attached, ready to create as Gmail drafts.

---

### 7.6 Outputs: types, formats, delivery, refinement, take
**Covers:** C11, C12, C13, C14, T6, T8 · **Owner:** Product + Design · **Priority:** Must (format test: §8)

**Three output types ✅ (20:51): when each is used, and who edits**

| Type | Used for | Who can make it | Edited when |
|---|---|---|---|
| **Masked** | **Prospects, always** ✅ | Admin, Recruiter, Associate | In the builder, before download or send |
| **As-is** | Clients, when the candidate's own resume is strong | Admin, Recruiter | Never (it's the original file) |
| **Editable** | Clients, when the resume needs tailoring or clean-up | Admin, Recruiter | In the builder, before send. Changes after sending create a new revision; the sent one stays as it was. |

Clients never get masked resumes ✅.

**Delivery ✅ (49:43): keep it simple**
- One render, two ways out: **PDF** or **web page link**.
  - A link is read-only, needs no login and can be switched off. It has no tracking and no approve/reject (both still Later).
  - ➜ Defaults: PDF for clients. Link for bulk prospect pitches, because it makes Gmail drafts one click with no attachments.
- Editable outputs also export as **DOCX** ➜.

**Two styles to test ✅ (50:19):** **creative** (easy to consume) vs **traditional Word-style** (easy to read and grasp). Both are templates in Settings. The test is in §8.

**Regenerate and refine ✅ (C13, C14)**
- **Regenerate** a section or the whole output, every time.
- **Refine with a prompt:** the output is JSON underneath ✅, so an instruction ("Shorter, lead with payments") rewrites only the affected sections. Changes are shown before and after, and you keep or undo each section.
- **Fix in profile** for wrong facts. A prompt never changes facts.
- **Every refinement is a revision** that can be restored.
- **The identity and fact checks rerun automatically.** A refinement that adds a fact not in the profile is blocked.

**Named take ✅ ("200%", 50:53–51:17)** (unchanged from v0.3 §7.8)
- Drafted by AI only when a call or recruiter note exists.
- The named person approves it ("Approve and sign"). It's signed with their name and title, and a draft never prints.
- **Where it prints:** on masked resumes and as a note block on editable ones. For as-is resumes it goes in the email.

**Stories**
- **US-56 · PDF or link.** As a recruiter, I want to send a masked resume as a PDF or as a web link, so that bulk pitches don't need attachments.
  *Given* a masked resume is ready · *When* I choose "Link" · *Then* the email draft includes a read-only link I can switch off later.
- **US-31 · Choose the resume behind an output.** *Given* a candidate with two resumes · *When* I change "Source resume" in the builder · *Then* the preview rebuilds from it, and the output records which one it used.
- **US-38 · Refine with an instruction.** *Given* a masked preview · *When* I type "Shorter, lead with payments" · *Then* only the changed sections are highlighted, I keep or undo each, and a new revision is saved.
- **US-39 · Regenerate one section.** *Given* I edited "Why we recommend" · *When* I regenerate "Our take" · *Then* my edits elsewhere stay.
- **US-40 · Fix a fact at its source.** *Given* the preview shows the wrong end year · *When* I click "Fix in profile" and save · *Then* the profile updates, and this output shows "Stale · Regenerate".
- **US-43 · Draft and sign a take.** *Given* Priya has a call on record · *When* I edit the draft and click "Approve and sign" · *Then* it's saved with my name, title and the time, and appears in the preview.
- **US-44 · Unsigned takes never print.** *Given* a take is still a draft · *When* someone downloads the PDF · *Then* the take is left out, and the preview shows "Draft not printed".

---

### 7.7 Email drafting
**Covers:** C3 · **Owner:** Product · **Priority:** Must (both options), plus the decision test in §8

**Both options are available from every draft button ✅ (11:30–12:54):**
- **(a) Draft here:** the tool drafts with the email prompt (Settings). The team refines it with an instruction (the same box as outputs), then copies it or creates a Gmail draft.
- **(b) Copy prompt for Claude:** copies the fully assembled prompt (instructions + all context below + the required format) to paste into the team member's own Claude plan. Pasting the final text back is optional; marking it sent updates the pills.

The **shared part** is the context assembly, so both options cost little to build once that exists.

**What a draft needs before it's usable 🔶**

| Context | Why |
|---|---|
| Recipient name, role and relationship (new prospect · onboarded client · candidate) | Tone, and how much to explain |
| The ask (interest check · call · interview · "want them?") | One clear call to action |
| Role: title, why this role, the client's own words (requirements from calls) | Relevance |
| Candidate highlights: top 3 facts, with the green flags from scoring | Substance (masked for prospects) |
| Signed take | The named vouch |
| Why this company (posting, research notes) | The hook for prospects |
| Last touch with this person (previous email, if any) 🔵 | Follow-ups that don't repeat themselves |
| Sender name, title, signature and tone | It sounds like us |
| Constraints: length, no candidate names to prospects, no IDs | Guardrails |

**Stories**
- **US-57 · Draft in the tool.** As a recruiter, I want a draft written with all the context already filled in, and to refine it with one instruction, so that the email is ready in one or two rounds.
  *Given* a shortlisted candidate on a client role · *When* I click "Draft interest check" · *Then* a draft opens that uses the role, highlights, take and my signature, and the refine box is ready.
- **US-58 · Copy the prompt to my own Claude.** As a team member with my own Claude plan, I want to copy the complete prompt with context, so that I can iterate in Claude without retyping anything.
  *Given* the same draft button · *When* I choose "Copy prompt for Claude" · *Then* the clipboard holds the instructions and all the context, and the tool logs which option I used.

---

### 7.8 Settings: prompts, templates, access
**Covers:** T5 (unchanged from v0.3 §7.5, plus the new items below) · **Priority:** Must

- **Tabs:** Matching · Skill list (with the **Domain** values) · **Prompts** · Templates · Team & access. Only Admins change them. Everyone sees **My profile** (name, title, signature).
- **Prompts:**
  - Masking · why we recommend · our take · editable tailoring · **email drafts** (the five types in §7.5) · refinement presets.
  - Extraction and scoring prompts are **view only** in v1 🔶.
  - Every prompt has versions and restore. **Locked rules** are always appended: never invent facts, never print assumed or predicted data, no identity on masked outputs.
- **New in v0.4:**
  - Auto-suggest count (default 5, 0 = off)
  - Default effect per requirement type (§7.1)
  - The **creative** and **traditional** resume templates
  - Default delivery (PDF or link) per output type
- **Access (three fixed roles):**

| | Admin | Recruiter | Associate |
|---|---|---|---|
| Add candidates and roles | ✓ | ✓ | ✓ |
| Edit requirements and candidate facts | ✓ | ✓ | — |
| Score, rerun | ✓ | ✓ | — |
| Shortlist | ✓ | ✓ | ✓ 🔵 |
| Reject | ✓ | ✓ | — |
| Masked outputs | ✓ | ✓ | ✓ |
| Editable and as-is outputs | ✓ | ✓ | — |
| Drafts and Gmail handoff | ✓ | ✓ | ✓ (prospect pitches) |
| Sign their own take | ✓ | ✓ | ✓ (after a call they took) |
| Settings, delete, CSV export | ✓ | — | — |

  Actions someone can't take stay visible but disabled, with a "who can" tooltip.

**Stories:** US-36 (change a prompt safely) and US-37 (who can do what), as in v0.3.

---

### 7.9 Screen cleanup
**Covers:** T9, B1, B3 · **Priority:** Must

**Roles list:**
- Column order: **Category · Company · Job title** 🔵 (reading "product" as the company).
- Then: **Latest update** ("Scan done · 5 suggested", "JD v3: requirements changed · Purvesh") · **Next step** (*Review 5* · *Score 22* · *Rerun* · *Send 3*) · Shortlist count.
- **Cut:** the Must-haves column, and the separate Updated time.

**Role page:**
- Three tabs: **Matches · Shortlist · Details**.
- History merges into Details as "Recent activity". The version-history card is cut; compare versions from the JD chip.
- The keyboard hint text moves to a "?" sheet.

**Also keep the light/dark toggle ✅** (55:02).

**Story**
- **US-45 · The Roles list says where to act.** *Given* Cobalt Labs' role was just scanned · *When* I open Roles · *Then* its row reads "Scan done · 5 suggested" with the next step *Review 5*, sorted above roles that need nothing.

---

## 8. The two tests (PoL probes)

Both probes are disposable. **The losing option gets removed** (B3: cut on purpose).

### Probe 1 · Email drafting: in the product vs your own Claude (C3)

| | |
|---|---|
| **Hypothesis** | Drafting inside the product gets an email to "ready to send" in fewer rounds than copying the prompt into Claude, because the context and refinement stay in one place. |
| **Risk removed** | Building and paying for in-product drafting that the team bypasses for their own Claude, or the opposite |
| **Type** | Task-focused test on real emails |
| **Who** | Everyone who sends from the tool. Each picks freely per email, and the tool logs the option. |
| **Measures** | Rework rounds before send (in-product: refinements counted; Claude: one-tap "1 · 2–3 · 4+" when marking sent) · time from click to sent · team vote at the end · reply rate, from the outreach sheet |
| **Pass for (a)** | Median ≤ 2 rounds and the team prefers it. Then keep (a) and remove "Copy prompt". |
| **Pass for (b)** | (b) needs fewer rounds, or the team prefers it. Then remove in-product drafting and keep only the context assembly. |
| **Too close to call** | Keep both only if both are used for at least a third of emails. Otherwise keep the more used one. |
| **◆ Checkpoint** | After **30 emails per option** 🔶 |
| **Disposal** | Remove the losing option's button and its prompt version. Keep the learning note in docs. |
| **Owner** | Vandit |

### Probe 2 · Resume style: creative vs traditional Word-style (C12)

| | |
|---|---|
| **Hypothesis** | One style gets more interest from clients and prospects than the other. 🔶 Our bet: traditional for clients, creative for prospects. |
| **Risk removed** | Polishing and maintaining a layout that recipients find harder to read |
| **Type** | Live A/B on real sends. It can start before the build, using the Claude + Google Sheet workflow Vandit already runs. |
| **Who** | Prospects (masked) and onboarded clients (editable), styles alternating per send |
| **Measures** | Interest rate per style (prospect replied interested · client marked Interested) · 3–5 hiring managers asked which was easier to read · time to produce |
| **Pass** | One style's interest rate is clearly higher (a gap of at least 5 points 🔶) within each audience. That style becomes the default for that audience. |
| **Too close to call** | Keep traditional (cheaper to maintain) and drop creative. |
| **◆ Checkpoint** | After **40 sends per style, per audience** 🔶 (fast at about 400–500 masked a month) |
| **Disposal** | Remove the losing template from Settings. Old outputs stay as sent. |
| **Owner** | Vandit + Purvesh |

---

## 9. Data changes (for the developer)

| Object | Change | Covers |
|---|---|---|
| **Role** | `requirements[] { id, text, source, effect: eliminates/improves, column?, addedBy }` replaces must/nice/client-asks · `hiringContact { name, email }` · `scoredCount`, `aiScoresUsed` | C5, C6, T7, C2 |
| **Match** | `state` (eliminated / not-scored / scored / shortlisted / rejected / not-interested) · `eliminatedBy[]` · `requirementsMet[{ reqId, result, evidence }]` · `greenFlags[]` · `redFlags[]` · `recommendation` · `reason` · `scoredOnResumeId` · `notInterestedReason` | C6, C10, T3 |
| **Alignment** (per shortlisted match) | `candidateSide`, `clientSide` (or `prospectSide`), `updatedBy`, `at` | C2 |
| **Candidate** | `sourceLinks[]` · `domains[]` (stored, editable) · `resumes[]` (T3) | C9, T4, T3 |
| **Output** | `type` (masked / as-is / editable) · `style` (creative / traditional) · `delivery` (pdf / link / docx) · `linkActive` · `revisions[]` · `promptVersion` · `sourceResumeId` | C11, C12, C14, T6 |
| **Take** | `text`, `authorId`, `approvedAt`, `sourceCallIds[]` | C13, T8 |
| **EmailDraft** | `kind` (5 types) · `recipient` · `method` (in-product / copied-prompt) · `rounds` · `markedSentAt` · `gmailDraftId?` | C3, C4 |
| **Prompt** | `versions[]` · locked rules · `usedIn` | T5 |
| **User** | `role` (Admin / Recruiter / Associate) · `displayName`, `title` | T5, T8 |

---

## 10. Out of scope or deferred

| Item | What was said | When |
|---|---|---|
| **List building / finding market roles for a candidate** (the Sean example) | ✅ "A completely different module altogether." Build strictly later, after the hand-off. (14:00–18:29, 57:56) | Possibly the next module after the hand-off |
| **Clustering similar profiles** | ✅ Part of list building (15:00–16:35). Expect about 50–60% accuracy from AI pattern matching. | With list building |
| **Location normalization and radius search** | ✅ A big problem for later: SF / San Francisco / San-Francisco, Palo Alto counted as SF, Arlington vs Washington. Needs coordinates and a 25/50-mile radius, and is worth spending tokens on. "Don't think about this too much" now. (39:10–46:33) | Later. v1 filters use the stored metro value as it is. |
| **Engineering challenges** | ✅ Not design's concern; opinions welcome (46:42) | Developer |
| **The other ~20 use cases** | ✅ Built on the fly later (20:51) | Later |
| **Growth plan** | ✅ A separate discussion (58:38–59:43) | Separate |
| **Video resumes, posting candidates on social media** | ✅ "Not a work discussion" (1:02:08 onward) | — |
| **Stage tracking, close-the-loop, going-cold list** | Beyond the two alignment pills | Later (v0.2) |
| **Link tracking, client approve/reject on the link** | Links stay plain in v1 | Later |
| **Third-party AI role suggestions in the tool** | Keep it simple (B2, B5) | Not planned |
| **AI Scout** (prompt → filters + chat) | Clashes with "filters on existing columns" | Parked |

---

## 11. Cut on purpose (B3)

Things that exist in the build, or were proposed in v0.3, and are cut, each with the decision it failed to support:

| Cut | Why |
|---|---|
| AI Scout on Candidates | A second way to filter, not on stored columns (C8, B2) |
| Split view vs full table on Candidates | One table plus the preview panel is enough |
| The 11-group filter console | Replaced by one filter bar (C8) |
| Fit bands (Strong / Good / Stretch) + numeric score + the "show score" setting | Replaced by requirements met, flags and recommendation (C6) |
| v0.3's "Skip for scoring" state | Pruning is rejecting (B2) |
| Top 5 / All ranked switch, band select, Hide decided | Replaced by states, the filter bar and the score control |
| v0.3's proposed X/E key remap | Purvesh liked the tested keys (E) |
| Roles list Must-haves column and the separate Updated column | No decision uses them on the list (B1) |
| Role page History tab and Version history card | Duplicated elsewhere |
| Three requirement lists (must, nice, client asks) | One Requirements list with an effect switch |

---

## 12. Build order and priority

**By dependency**
1. **Data model** (§9)
2. **Intake and auto-scan** with the Requirements list (§7.1)
3. **Pipeline states and scoring output** (§7.2)
4. **Shared list components:** filter bar, columns, selection and keys (§7.3)
5. **Shortlist alignment and drafts, both options** (§7.5, §7.7)
6. **Outputs:** delivery, refine, take, both styles (§7.6)
7. **Gmail and Sheets handoff** (§7.5)
8. **Candidates:** links and import, several resumes, not interested (§7.4)
9. **Settings** (§7.8) and **screen cleanup** (§7.9)

| MoSCoW | Items |
|---|---|
| **Must** | Auto-scan + Requirements list · states + scoring output · score on demand · Sheets filters + columns · bulk shortlist / reject · alignment pills + drafts for either side · both drafting options · masked / as-is / editable · PDF + link · refine + regenerate · signed take · not interested per role · link and sheet intake · several resumes · access roles + prompt registry · Roles cleanup |
| **Should** | Gmail drafts in bulk (depends on the connection) · bulk prospect pitches · the prompt "try it" preview · DOCX export |
| **Could** | Synced Drive folder · admin-editable refine presets |
| **Won't (now)** | §10 |

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Auto-suggestions are read as "the answer" (automation bias) | Labelled "Suggested", always with requirements met and red flags, decided on the same screen ✅ |
| "Not scored" rows read as good because they come first | Neutral styling, no rank, and the explicit label (C6) |
| A bulk reject removes people whose data is missing | "Not captured" included by default, a count of assumed rows in the confirm, one undo |
| Small score counts hide a strong candidate ranked low by similarity | "Score 10 more" in one click, and the order is labelled "not a score" |
| Alignment pills drift from reality | Set automatically on draft and send; one click to update; only two pills (B2) |
| Gmail handoff needs a connection the team may not want | Fallback: "Open in Gmail" with a link. The how is engineering's call (B4). |
| The tests never reach their checkpoints | Counts are small against monthly volume; Vandit owns both |
| Scope grows past the hand-off | §10 and §11. New ideas go to the "~20 use cases later" list (B5). |

---

## 14. Decisions needed from Purvesh before the hand-off

Grouped so the quick ones go fast.

**Quick yes/no**

| # | Decision | ➜ Recommendation |
|---|---|---|
| 1 | Keep the tested keys (S shortlist, X reject) and add Shift+J/K for selection? | Yes |
| 2 | Auto-score the top 5 on intake (Admin can set 0)? | Yes |
| 3 | Recommendation levels: Strong / Mild / **Not recommended**? | Yes, three levels, no numeric score |
| 4 | Score everything remaining when 25 or fewer; otherwise choose 10 / 25 / 50 / All? | Yes |
| 5 | Can unscored candidates be shortlisted? | Yes, marked "Not scored" |
| 6 | Two alignment pills (candidate, client), not stage tracking? | Yes |
| 7 | Defaults: PDF for clients, link for bulk prospect pitches? | Yes |
| 8 | Third-party AI role suggestions stay outside the tool? | Yes |
| 9 | Park AI Scout? | Yes |
| 10 | "Not interested" hides the candidate from that role for good (until undone) and proposes a profile update? | Yes |
| 11 | Editable outputs export as DOCX too? | Yes |
| 12 | Roles list: does "product" mean the company? | Yes |

**Needs a short discussion**

| # | Decision | ➜ Recommendation |
|---|---|---|
| 13 | Which requirement types eliminate by default (§7.1 table)? | Years, work authorization / sponsorship / transfer, location / relocation / work mode, category. Everything else improves the score. |
| 14 | Associates: can they shortlist? Reject? Send pitches? | Shortlist yes, reject no, prospect pitches yes |
| 15 | Who signs takes: the author, or Purvesh on key pitches? | The author signs; Purvesh signs his own |
| 16 | Which sources do resumes come from today? | Link + outreach sheet import in v1; list the others |
| 17 | Gmail drafts through a Gmail connection, or compose links only? | Gmail drafts if engineering agrees; compose links as the fallback |
| 18 | Domain values | About 10 to start (B2B SaaS, Payments/Fintech, Healthtech, Marketplace, Consumer, DevTools, AI/ML, E-commerce, Edtech, Enterprise) |
| 19 | Test checkpoints: 30 emails per option, 40 sends per style per audience? | Yes |
| 20 | Token cost per AI score, and caps | The developer gives the number; until then, cap one run at 50 and auto-suggest at 5 |

---

## Self-assessment

- **Strongest:**
  - **§7.2:** the pipeline, states and scoring output are almost word for word what Purvesh described.
  - **§7.3:** one list pattern that keeps the keys he praised.
- **Weakest:**
  - **§7.5 Gmail handoff:** depends on an engineering choice nobody has made yet.
  - **Metrics:** still no baselines.
- **Top assumptions to validate:**
  1. Five automatic suggestions are worth their tokens.
  2. Two alignment pills are enough tracking for now.
  3. The context checklist in §7.7 makes drafts usable within two rounds.
  4. A similarity pre-sort is a fair way to pick who gets scored first in long lists.
- **Next step:**
  1. Purvesh answers §14 (12 quick, 8 short).
  2. Start Probe 2 in the Claude + Sheet workflow right away (it needs no build).
  3. Update the wireframes for S-02, S-03, S-04, S-05, S-07, S-09 and S-13.
  4. Hand off.

---

## Appendix A · New flows, dialogs and components

- **Flows:**
  - F-20 Role in → suggestions
  - F-21 Prune and score
  - F-22 Align and send (client, either order)
  - F-23 Pitch prospects in bulk
  - F-24 Mark not interested
  - F-12…F-19 from v0.3 still apply where their sections are unchanged
- **Dialogs:**
  - D-06 Confirm assumed requirements
  - D-07 Update or another resume
  - D-08 Add requirement
  - D-09 Create Gmail drafts (review list)
  - D-10 Not interested (reason)
- **Components:**
  - N16 Selection bar
  - N17 Filter bar and pickers
  - N18 Columns menu
  - N19 Score control
  - N20 Refine box
  - N21 Signed take
  - N22 Requirement row (with effect switch)
  - N23 Prompt editor
  - N24 Disabled-with-reason control
  - **N25 Recommendation block** (met list, flags, pill)
  - **N26 Alignment pills**
  - **N27 Draft panel** (draft here / copy prompt)
  - **N28 Delivery select** (PDF / link / DOCX)

## Appendix B · Where each change lands in the wireframe app

| Change | File |
|---|---|
| States, funnel, score control, recommendation block, selection | `src/screens/RolePage.tsx` · `src/components/hs.tsx` (MatchRow, FunnelLine) |
| Requirements list, Save and scan | `src/screens/RoleEditor.tsx` |
| Filter bar, columns; AI Scout and split view removed | `src/screens/CandidatesList.tsx` |
| Not interested, link intake, several resumes | `src/screens/CandidateProfile.tsx` · `src/screens/NewCandidate.tsx` · `src/data/types.ts` |
| Alignment pills, draft panel, Gmail handoff | `src/screens/RolePage.tsx` (Shortlist tab) · `src/screens/Dialogs.tsx` (copy email) |
| Delivery, styles, refine, take | `src/screens/MaskedBuilder.tsx` · `src/screens/TailoredReview.tsx` |
| Prompts, templates, access, new defaults | `src/screens/SettingsPage.tsx` |
| Roles list columns | `src/screens/RolesList.tsx` |
