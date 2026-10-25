# HeroScouter Talent Engine — PRD v0.3

**Implementation round 1 · after the wireframe demo · internal (for us)**

Legend: ✅ Settled on the demo call · ➜ Recommended (needs Purvesh's OK) · 🔶 Assumption · 🔵 Open question · ◆ Checkpoint

| | |
|---|---|
| **Author** | Vandit Dubey (product) |
| **Reviewers** | Purvesh Naik (founder) · Arjun (developer) |
| **Builds on** | The wireframe app (`src/`, screens S-02…S-13) · [PRD v0.2](heroscouter-prd-v0.2.md) · [Product design doc](heroscouter-product-design-doc.md) |
| **Input** | Demo feedback, tasks 1–10 (call timestamps in each section) |
| **◆ Gate** | Every in-scope task has a settled flow, screens, data and rules **before the developer hand-off**. ✅ Product and design settle flow, screens, journey and data first. Engineering decisions come after. |

---

## 0. How to read this

- **§1** reviews what's built against PRD v0.2. **§2–6** cover the why and what. **§7** specs each task as decision → when it's used → flow → screens → rules → data → stories. **§10** lists the decisions Purvesh needs to make, each with a recommendation.
- IDs continue from v0.2 and the design doc: stories **US-24+**, flows **F-12+**, dialogs **D-06+**, components **N16+**.
- Task numbers (T1–T10) match the feedback list.

---

## 1. Where we are: the build vs PRD v0.2

### 1.1 Scorecard

| | What | Verdict |
|---|---|---|
| ✅ **Built as planned** | Roles list, role editor (paste / upload / URL / no-JD), role page (Matches · Shortlist · Details · History), candidate profile with source badges and an ask list, preview panel, masked builder, tailored / as-is review, resumes library, activity log, settings, ⌘K palette | Every v0.2 story (US-01…US-23) has a screen. |
| ⭐ **Built beyond the plan** | Identity check before download (flags with *Describe it / Keep*) · keyboard triage with undo everywhere · reject reasons on number keys · eliminated view with near misses and *Include anyway* · rerun cost dialog and rerun summary (New / Moved / Re-qualified / Dropped) · stale-output flags after profile changes · *May fit more roles → Rank them* (stage 1 only) · prospect roles locked to masked output · hard-filter toggles and skill adjacency rules in Settings | This is what makes the build more foolproof than v0.2. **Keep all of it.** |
| ⚠️ **Not in v0.2** | **AI Scout** on Candidates (prompt → filters → 3/4 table + 1/4 chat) | Clashes with ✅ "filters on existing columns, Sheets model" (T4). ➜ Park it for the first release (§8). |
| ❌ **Gaps the demo exposed** | No multi-select on Matches (T1) · fixed "Top 5 / Show next 5", and AI scores everyone who passes stage 1 (T2) · only one linear resume history (T3) · 11 filter groups stacked on Candidates, no filters on Matches, no column show/hide (T4) · Settings holds template defaults only: no prompts, two access levels (T5) · "Regenerate bullets" only, no instruction-based refinement (T6) · the client call is just a link field, with no structured requirements (T7) · "Our take" is signed with a hard-coded name and has no approval (T8) · Must-haves column on the Roles list, no "latest update" (T9) | Covered in §7. |

### 1.2 Inconsistencies to fix now (small, but they cause mistakes)

1. **"Approve" vs "Shortlist".** Match rows say *Approve*. The tab, toast, log and the S key say *Shortlist*, and even the feedback says "approved one by one". ➜ Use one verb everywhere: **Shortlist**.
2. **The reject key.** The team believes E rejects. The build uses X = reject and E = show eliminated, so pressing E today silently opens the eliminated list. ➜ Adopt Gmail's map (§7.1).
3. **Two filter logics.** On Candidates, chips inside a group combine with OR, but Skills combines with AND, and nothing on screen says so. ➜ One rule for all (§7.4).
4. **"Top N" lives in two places**: Settings ("Default top N shown") and the Matches switch ("Top 5 / All ranked"). ➜ Both are replaced by the scoring control (§7.2).
5. **The take signature is hard-coded** to "— Vandit" on every masked resume. ➜ §7.8.

---

## 2. Problem (what the demo showed)

**Who:** the founder-recruiter, the recruiter/ops owner and the associates who will use the tool every day.

**What:**
- **Volume work happens one item at a time.** Shortlisting, rejecting or generating for 5–15 candidates takes 5–15 separate actions. ✅ "Bulk operations matter across the product." (Purvesh)
- **The team can't control volume or cost.** AI scores every candidate who passes the must-haves. A client asking for "three strong profiles" and a wide search cost the same and show the same list. ✅ Purvesh's pipeline is: hard filters → manual pruning → AI scoring on a click, and scoring costs tokens per candidate.
- **The data model is too simple for real candidates.** One person can have two resumes for two kinds of roles.
- **Narrowing a list is either heavy or impossible.** Candidates has 11 stacked filter groups. Matches, where bulk-rejecting by visa or domain is needed, has none.
- **Generated outputs can't be steered.** The first draft won't always be right, and the only options are to hand-edit or regenerate everything.
- **Nobody owns the AI's instructions.** The prompts for masking, takes and emails have no home and no owner.
- **Requirements a client says out loud get lost.** "Sean wants someone who has led a team" has nowhere structured to go.
- **The take reads as if the machine wrote it.** ✅ A named person vouching makes Purvesh "200%" more likely to buy into a candidate.
- **Some screens still show data nobody decides on.**

**Evidence:** the founder demo call (timestamps per task) and the wireframe walkthrough. There's no usage data yet. 🔵

---

## 3. Users touched by this round

| User | Where these changes hit them |
|---|---|
| **Founder-recruiter** (Purvesh) | Bulk decisions, the scoring control, signed takes, owning Settings |
| **Recruiter / ops** (Vandit) | Filters and pruning, resume variants, prompt edits, client asks |
| **Associates / interns** 🔶 | Filters, copied lists and masked resumes, with clear limits on what they can change (T5) |
| **Developer** (Arjun) | Data-model changes: resumes, client asks, takes, prompt versions, permissions |

**Receives outputs only:** prospects get masked resumes with a signed take; clients get editable or as-is resumes, with the take in the email.

---

## 4. Why now

- **◆ Developer hand-off.** Data-model changes (resume variants, client asks, take authorship, prompt versions, permissions) are cheap before the build and expensive after it.
- **The masked resume is still the burning problem.** T6 and T8 decide whether a masked resume wins a reply.
- **Token cost grows with the pool.** T2 sets how the core matching action spends money.

---

## 5. Solution overview

### 5.1 Principles added this round (on top of P1–P8 in the design doc)

- **P9 · Free before paid.** Everything that costs nothing (stage 1, column filters, manual pruning) happens before anything that costs tokens (AI scoring, generation). Paid steps always show their count before they run.
- **P10 · One selection pattern.** Every list with bulk actions uses the same checkbox column, Shift-click ranges, sticky selection bar, one undo per batch, and the same keys.
- **P11 · Columns, not code.** Filters only use stored columns. A requirement that can't be a column becomes a ranking signal or context, never a hidden filter.
- **P12 · Facts live in the profile, wording lives in the output.** Facts get fixed in the record. Wording gets steered with a prompt. Neither leaks into the other.
- **P13 · A named vouch is a human act.** A take with someone's name on it is written or approved by that person.

### 5.2 The updated core flow (role → send)

```
Role saved
 → Stage 1 (instant, free)    412 → 96 pass the must-haves, pre-sorted by similarity
 → Prune (free)               filter bar · bulk skip or reject with a reason            [T4, T1]
 → Score with AI (paid)       choose how many: 5 · 10 · 25 · 50 · All                  [T2]
 → Review                     preview · shortlist or reject, one at a time or in bulk  [T1]
 → Shortlist                  set the order · pick the source resume per candidate      [T3]
 → Outputs                    masked · as-is · editable · refine with a prompt · signed take  [T6, T8]
 → Copy email text            sent by a person, as today
```

Client asks (T7) feed stage 1 when they map to a column, and scoring when they don't. Settings (T5) owns the prompts behind every AI step and who may run each step.

### 5.3 Change map

● main change · ○ small change

| Task | S-02 Roles | S-03 Role editor | S-04 Role page | S-05 Candidates | S-06/07 Candidate | S-09/10 Builders | S-11 Resumes | S-13 Settings |
|---|---|---|---|---|---|---|---|---|
| **T1** Bulk shortlist | | | ● | ○ | ○ | | | |
| **T2** How many to score | ○ | | ● | | | | | ○ |
| **T3** Several resumes | | | ○ | | ● | ○ | ○ | |
| **T4** Filters + columns | | | ● | ● | | | | ○ |
| **T5** Prompts, templates, access | ○ | ○ | ○ | ○ | ○ | ○ | | ● |
| **T6** Refine with a prompt | | | ○ | | ○ | ● | ○ | ○ |
| **T7** Client asks | | ● | ○ | | | | | |
| **T8** Signed take | | | | | ○ | ● | | ○ |
| **T9** Roles cleanup | ● | | ○ | | | | | |

---

## 6. Success metrics

**Primary metric for this round:** time from "role saved" to "shortlist ready to send". Target: **under 10 minutes for a 5-person shortlist.** 🔶 There's no baseline yet. 🔵

**Secondary:**
- **Median AI scores per role ≤ 25** 🔶. Today the build scores everyone who passes stage 1.
- **≥ 50% of decisions made in bulk** on roles with 5+ shortlisted 🔶. This shows bulk is used, not just built.
- **≥ 80% of masked resumes downloaded after ≤ 2 refinements** 🔶.
- **≥ 70% of masked resumes sent with a signed take** 🔶.
- "All [category] candidates with [visa]" answered **in under a minute** (kept from v0.2).

**Guardrails:**
- **0** takes printed without the signer's approval.
- **0** refinements that add a fact not in the profile.
- **0** candidates filtered out because data is missing ("Not captured" is shown and included by default).
- Prompt edits never remove the locked rules.
- Every bulk action can be undone as one batch.

---

## 7. Requirements per task

### 7.1 T1 · Bulk shortlisting on Matches
**Owner:** Design (Product for rules) · **Call ref** 19:00 · **Priority:** Must

**Today:** each match is previewed and decided one by one. The bulk pattern already exists on Candidates (*Generate masked resumes · Copy list*) and on Profile → Matching roles (*Add to shortlists*), but not on the screen where it matters most.

**Decision ➜**
- Add multi-select to Matches using the same pattern (P10).
- Bulk **Shortlist**, and bulk **Reject** with one reason for the batch.
- Generating outputs stays on the Shortlist tab.

**When the team decides in bulk**

| Situation | Typical selection | Risk to design for |
|---|---|---|
| Prospect pitch (3–5 masked resumes) | Top Strong-band rows, after reading the reasons | Rubber-stamping by rank |
| Client asks for "everyone strong" | Filter band = Strong → select all | Includes assumed must-haves |
| After pruning with filters | e.g. "Citizen or Green card" and "B2B" → select all | The filter hides context |
| Bulk reject | "Needs sponsorship = Yes" on a no-sponsor role → select all → reject | Rejecting people whose data is missing |
| Re-qualified after a rerun | Re-qualified filter → review → select | — |

**Flow F-12 · Decide in bulk**
1. Select rows by checkbox, X on the focused row, Shift-click for a range, or the header's "Select all 12 shown".
2. If more rows match than are shown, a link offers "Select all 42 that match these filters" (the Gmail pattern).
3. The selection bar replaces the toolbar and stays in view: *6 selected · Shortlist (S) · Reject (E) · Clear (Esc)*.
4. **Shortlist.** If any selected row has an *Assumed* must-have, or the run is out of date, D-06 asks to confirm. Otherwise it happens immediately.
5. A toast confirms: *Shortlisted 6 · Undo · Open shortlist*. One undo restores all 6.
6. **Reject** opens D-01 in batch mode: "Reject 6 for Senior Product Manager?" with one reason. If the selection came from a filter, the matching reason is pre-picked (a visa filter → "Work authorization").

**Keyboard (Gmail-aligned 🔶: the team's muscle memory is Gmail)**

| Key | Today | v0.3 |
|---|---|---|
| J / K | Move | Move |
| Space | Preview | Preview |
| **X** | Reject | **Select or unselect the focused row** |
| S | Shortlist the focused row | Shortlist the focused row, **or every selected row** |
| **E** | Show eliminated | **Reject the focused row, or every selected row** (reason dialog) |
| U | Undo | Undo (the whole batch) |
| Esc | Close | Clear the selection |
| Shift + click | — | Select a range |
| ? | — | Shortcut sheet (the hint text moves off the toolbar) |

Rule: while anything is selected, S and E act on the selection, and the bar shows the count, so it's always clear what a key will affect. The eliminated view opens from its link on the funnel line.

**Screens and states (S-04 Matches)**
- **Checkbox column:** hidden until you hover or select a row (keeps P8 quiet).
- **States:** nothing selected · some selected · all shown selected · all matching selected · mixed (rows already shortlisted are skipped and counted: "2 already shortlisted").
- **Rejected rows** can't be selected.
- **D-06 · Confirm assumed must-haves:** "2 of 6 have assumed must-haves (work authorization ×2)."
  - Buttons: **Shortlist the 4 verified** (default) · Shortlist all 6 · Cancel.
  - Link: Add 2 questions to the ask list.
- **Copy:** "Shortlist" is the only verb on rows, buttons, toasts and the log.

**Downstream, when many land at once**
- **Order:** candidates added in bulk join in rank order and can then be dragged (exists).
- **Masked resumes are never generated automatically** (cost, and each needs a look). The Shortlist tab shows "4 without a masked resume · Generate (4)".
- **Bulk on the Shortlist tab too:** generate, copy email or download for the selected rows.
- **Generating more than 10 at once** shows the count and rough time first. 🔵 Per-batch cap.
- **Email text** follows the shortlist order. Above 6 candidates, a hint asks: "Long lists get fewer replies. Send your top 5?" 🔶
- **Prospect roles** still allow masked output only.
- **Log:** one batch event, plus one entry per candidate so each candidate's history still reads correctly.

**Stories**

**US-24 · Shortlist several matches at once**
- **As a** founder-recruiter preparing a pitch, **I want to** select several matches and shortlist them in one action, **so that** a 5-person shortlist takes one decision instead of five.
- *Scenario: verified selection.* **Given** 6 scored matches are selected · **and** none has an assumed must-have · **When** I press S · **Then** all 6 move to the Shortlist tab in rank order, with one toast that can undo all 6.
- *Scenario: assumed must-haves.* **Given** 2 of the 6 selected have an Assumed must-have · **When** I press S · **Then** D-06 opens, defaulting to "Shortlist the 4 verified".

**US-25 · Reject several matches with one reason**
- **As a** recruiter pruning a long list, **I want to** reject a selection with one reason, **so that** clear misfits leave the list in one step and the reason is still recorded for each person.
- *Scenario:* **Given** 14 rows are selected through the filter "Needs sponsorship = Yes" · **When** I press E and confirm · **Then** all 14 are rejected with "Work authorization" logged per candidate, and one Undo restores them all.

**US-26 · Act on part of the shortlist**
- **As a** recruiter, **I want to** select some shortlisted candidates and generate, download or copy email text just for them, **so that** I can send a subset without changing the shortlist.
- *Scenario:* **Given** 8 are shortlisted and 3 are selected · **When** I click "Copy email text" · **Then** the email includes only those 3, in shortlist order.

---

### 7.2 T2 · Control how many candidates get scored
**Owner:** Product (with Design) · **Call ref** 19:00 · **Priority:** Must

**Today:** "Find matches" runs stage 1 and then AI-ranks everyone who passes (for example "Ranking 96 candidates…"), then shows the top 5. There's no pruning step, and cost grows with the pool.

**Decision ➜**
- **The count applies after stage 1 and manual pruning, and before AI scoring.** ✅ This matches Purvesh's pipeline.
- It's the **number of candidates the AI scores**, not a display limit.
- **Why not before the hard filters:** stage 1 is free and only removes people who fail must-haves. Capping before it would drop qualified people at random and save nothing.

**Pipeline on the role page** (replaces "Find matches = rank everyone")

| Step | Cost | What the team sees |
|---|---|---|
| **1 · Stage 1** runs when the role is saved | Free, instant | "96 of 412 pass the must-haves". The list is pre-sorted by similarity 🔶 (cheap enough to run on every passer). |
| **2 · Prune** | Free | Filter bar (T4) · bulk *Skip for scoring* or reject (T1) |
| **3 · Score** | Paid, per candidate | "Score **[10 ▾]** with AI". Options: 5 · 10 · 25 · 50 · All (N). The button says "10 AI scores" before you click. |
| **4 · Score more** | Paid | "Score 10 more" scores the next 10 unscored. Earlier scores are kept, never redone. |

**Small vs large pools**

| Count | Situations |
|---|---|
| **5** | Prospect pitch · a client wants "a few strong profiles" · a niche senior role |
| **10** (default 🔶) | Normal client role: the top 5 to send, plus a buffer for rejects |
| **25–50** | Wide search · volume hiring · building a bench for a repeat role type · the first 10 were mostly rejected |
| **All** | The pass list is already small. When 15 or fewer pass, the control suggests "All 12". |

**Flow F-13 · Score in rounds**
Role saved → stage 1 → (prune) → pick a count → **Score** → review → (**Score 10 more** if needed).

**Screens and states (S-04 Matches)**
- **Not scored yet:** a list of the people who passed, showing facts only (no band, no reason). Primary button: **Score with AI**, with the count select.
- **Scoring:** progress banner "Scoring 10 candidates…". The team can keep working.
- **Scored:** ranked rows (band, reason, evidence) on top, and a collapsed "Not scored (76)" group below with *Score 10 more*.
- **Out of date:** a rerun re-scores only the candidates already scored (the count shows first), with the option "also score new passers".
- **Unscored candidates can be shortlisted** (the team may know them). The row shows "Not scored" instead of a band. 🔶
- **Roles list status** becomes Not scored · Scored · Out of date.
- **Settings → Matching:** "Default number to score" (Admin) replaces "Default top N shown".

**Data:** Match adds `scoredInRun`, `skipped`. Role adds `scoredCount` and `aiScoresUsed` (for a future budget). The event log records the count for every run.

**Stories**

**US-27 · Choose how many to score**
- **As a** recruiter, **I want to** choose how many candidates the AI scores for a role, **so that** a quick client ask costs little and a wide search gets depth.
- *Scenario:* **Given** 96 candidates pass stage 1 · **and** the count is set to 10 · **When** I click "Score with AI" · **Then** exactly the 10 top-similarity, unskipped candidates are scored and ranked, and the log records 10 AI scores.

**US-28 · Score more later**
- **As a** recruiter whose first picks didn't work out, **I want to** score the next batch without redoing the first, **so that** I go deeper without paying twice.
- *Scenario:* **Given** 10 are scored and 86 are not · **When** I click "Score 10 more" · **Then** the next 10 are scored and the first 10 keep their scores.

**US-29 · Prune before paying**
- **As a** recruiter, **I want to** filter and skip candidates before scoring, **so that** AI spend goes only to people I'd actually consider.
- *Scenario:* **Given** I've skipped 20 of 96 passers · **When** I score 10 · **Then** skipped candidates are never scored and stay viewable under "Skipped".

---

### 7.3 T3 · Candidates with more than one resume
**Owner:** Product (data and logic) + Design (screens) · **Call ref** 33:44 · **Priority:** Must (data model)

**Today:** one `resumeVersion` number per candidate. Uploading creates v2, v3… of the same document. Outputs always use the current one.

**Decision ➜** There are two different things, so they get two names:
- **Update:** a newer version of the same resume. It replaces the current version and history is kept (built today).
- **Another resume:** a parallel resume for a different kind of role, e.g. "Product" and "Growth". Both stay current.

A candidate has **one profile** (facts about the person) and **one or more resumes**, each with its own versions.

| Profile (one per person) | Resume (one or more per person) |
|---|---|
| Work authorization, location, preferences, pay, years, contact, completeness, take | File, label, target function (category), headline, achievements and emphasis, version history |
| Skills = the union of explicit skills across all resumes | Which skills it emphasises |

Facts from any new resume still arrive as proposed changes (existing pattern). Conflicts are flagged, e.g. "Resume says 6 yrs, profile says 7".

**Which resume is used, and who decides**

| Use | Default | Override |
|---|---|---|
| **Stage 1** | The profile only (resumes don't matter here) | — |
| **AI scoring** | The resume whose target function matches the role's category; otherwise the Primary one | On the match row: "Scored on Growth resume · Use Product resume" (re-scores just that candidate) |
| **Masked or editable output** | The resume used for that role's match; otherwise Primary | "Source resume" select at the top of the builder |
| **Send as-is** | Same as above | Same select |
| **Masked with no role** | Primary | Select |

Anyone on the team can override at the point of use. Changing which resume is Primary is a profile edit.

**Flow F-14 · Add a resume to an existing candidate**
1. Upload from the profile (⋯ → Upload resume), or from the duplicate warning on S-06.
2. **D-07** asks: "Is this an update of *Product resume (v3)*, or another resume?"
3. **Update:** proposed changes (exists) → new version.
4. **Another resume:** enter a label and target function → proposed changes for the facts → a new resume card appears.

**Screen states**
- **One resume (most candidates):** no selectors anywhere. Everything looks like today.
- **Two or more:**
  - The profile header shows a "2 resumes" chip.
  - The Resumes tab shows one card per resume: label, target function, Primary badge, current version, who uploaded it and when, and a versions list.
  - The builders show a "Source resume" select.
  - Match rows show "Scored on …".
  - The outputs list shows each output's source.
- **Version history:** every version of every resume is kept, and any two can be compared (proposed-changes view).

**Data**
- `Resume { id, candidateId, label, targetCategory, isPrimary, versions[{ n, file, parsedJson, uploadedBy, uploadedAt, changesApplied }] }`
- Output adds `sourceResumeId` and `sourceVersion`.
- Match adds `scoredOnResumeId`.
- **Stale rule:** an output goes stale when its own source resume gets a new version, or when a profile fact it printed changes. It doesn't go stale when a different resume changes.

**Stories**

**US-30 · Add another resume**
- **As a** recruiter, **I want to** add a second resume for a different kind of role without overwriting the first, **so that** a candidate can be pitched well for both.
- *Scenario:* **Given** Priya has "Product resume v3" · **When** I upload a file and choose "Another resume", labelled "Growth" · **Then** both resumes show as current, and only the facts I accept change the profile.

**US-31 · Choose the resume behind an output**
- **As a** recruiter, **I want to** pick which resume a masked or editable resume is built from, **so that** the prospect sees the version written for their kind of role.
- *Scenario:* **Given** a candidate with two resumes · **When** I change "Source resume" in the builder · **Then** the preview rebuilds from that resume, and the output records which one it used.

**US-32 · See which resume a match used**
- **As a** recruiter, **I want to** see and change which resume a match was scored on, **so that** a poor fit caused by the wrong resume can be fixed with one re-score.
- *Scenario:* **Given** a match scored on "Growth" for a Product role · **When** I click "Use Product resume" · **Then** that one candidate is re-scored and the row shows the new band.

---

### 7.4 T4 · Filters (AND / OR) and columns
**Owner:** Design (Product for which columns) · **Call ref** 36:21–39:02 · **Priority:** Must

**Today:** Candidates has 11 numbered filter groups in three stacked rows (the cognitively heavy V1), plus AI Scout. Matches has only a band select and *Hide decided*. Columns can't be shown or hidden.

**Decision ➜** Use the Google Sheets model. ✅ Filters work on existing database columns, and columns can be shown or hidden.
- **Rule: OR inside a column, AND across columns.** For example: "Visa: Citizen **or** Green card" **and** "Experience ≥ 5" **and** "Domain: B2B **or** Payments".
- **The bar spells this out:** chips read with "or" inside them and are joined by a small "and".
- **Exception for multi-value columns (Skills, Domain):** the picker has an *Any of / All of* switch, and the chip text changes to match ("React **and** Node").
- **No OR across columns in v1** 🔶. It's rarely needed, and two passes work around it. 🔵 Confirm.
- **Missing values:** every values list includes **"Not captured"** with its count, checked by default (P3). Unchecking it is a deliberate act.

**Layout (replaces the stacked V1 console)**
One row above the table. It's the same component on Candidates and on Matches:

```
[Category ▾]  [Visa: Citizen or Green card ×] and [Experience ≥ 5 ×]  [+ Filter]     42 match · Clear all   [Columns]
```

- **"+ Filter"** opens a searchable list of filterable columns, then the right picker for that column:
  - **Values:** a checklist with counts, search and select-all (category, visa, work mode, domain, status…).
  - **Number:** ≥, ≤ or between (years, pay, completeness).
  - **Any of / All of:** for skills and domain.
- **Column header menu** (Sheets-style): Sort A→Z / Z→A · Filter this column · Hide column. There are two ways in, but only one filter state.
- **Category is pinned first** in the bar on Candidates, since it's the fastest urgent ask (F-07).
- **Columns menu:** checkboxes, drag to reorder, "Reset to default". Saved per person, per screen 🔶. Six columns are visible by default.
- **The 11-group console goes.** Its quick presets (e.g. "No sponsorship needed") come back later as saved filters (§8).

**Flow F-15 · Filter, then act**
Add filters → the count updates instantly → select all matching → shortlist, reject, copy or generate (T1).

**Filterable at launch (Product)**

| Column | Candidates | Matches | Picker | Note |
|---|---|---|---|---|
| Category, sub-category | ✓ | ✓ | Values | |
| **Domain** (B2B SaaS, Payments/Fintech, …) | ✓ | ✓ | Values · Any/All | **New stored column**, extracted when the resume is parsed and editable. The value list lives in Settings → Skill list. 🔵 Values |
| Years of experience | ✓ | ✓ | Number | |
| Location (metro), work mode, open to relocate | ✓ | ✓ | Values | |
| Work authorization (status + visa type) | ✓ | ✓ | Values | |
| Needs sponsorship, needs transfer | ✓ | ✓ | Values | |
| Pay expectation | ✓ | ✓ | Number | |
| Availability, search status | ✓ | ✓ | Values | |
| Skills (explicit, with an "include predicted" switch) | ✓ | ✓ | Any/All | |
| Profile completeness, source, last updated | ✓ | — | Number / Values | |
| Resume label | ✓ | ✓ | Values | From T3 |
| Fit band, decision status, scored or not, has assumed must-haves | — | ✓ | Values | Matches only |

**Stories**

**US-33 · Narrow a list the way a spreadsheet does**
- **As a** client-comms associate answering an urgent ask, **I want to** filter by several columns with "or" inside a column and "and" across columns, **so that** I get the exact list without building a query.
- *Scenario:* **Given** the filters "Visa: Citizen or Green card" and "Domain: B2B SaaS" · **When** I add "Experience ≥ 5" · **Then** the list and the count update instantly, and the bar reads "… and Experience ≥ 5".

**US-34 · Show only the columns I need**
- **As a** recruiter, **I want to** show, hide and reorder columns, **so that** the table shows what this task needs and nothing else.
- *Scenario:* **Given** the Columns menu is open · **When** I hide "Pay" and move "Work auth" second · **Then** the table changes, and it looks the same the next time I open this screen.

**US-35 · Missing data stays visible in filters**
- **As a** recruiter, **I want to** see how many candidates have no value for a filtered column, **so that** I never drop someone just because we didn't ask yet.
- *Scenario:* **Given** 12 matches have no work authorization captured · **When** I filter "Visa: Citizen" · **Then** "Not captured · 12" is checked by default, and those 12 stay in the list marked Assumed.

---

### 7.5 T5 · Settings: prompts, templates and access
**Owner:** Product + Design · **Call ref** 48:57, 51:28 · **Priority:** Must (access, prompt storage) · Should (prompt preview)

**Today:** Settings has Skill list · Matching · Templates (pick the default masked layout A/B/C and the tailored layout) · Team (Admin / Member, with a static summary). There are no prompts anywhere.

**Decision ➜**
- Settings gets five tabs: **Matching · Skill list · Prompts** (new) · **Templates · Team & access**.
- Only Admins change Settings. Everyone else sees only **My profile** (display name, title and signature for takes).

**What's editable, and by whom**

| Item | Used in | Who edits | Note |
|---|---|---|---|
| Masking prompt | S-09 | Admin | Locked rules are always appended |
| "Why we recommend" prompt | S-09 | Admin | |
| "Our take" draft prompt | S-07, S-09 | Admin | See T8 |
| Tailoring (editable output) prompt | S-10 | Admin | The traceability rule is locked |
| Email drafts: prospect pitch · client shortlist · candidate "roles for you" | Copy email (F-11) | Admin | Placeholders: {role} {company} {candidates} {signer} |
| Refinement presets ("Shorter", "Lead with impact"…) | T6 | Admin | Shown as quick chips in the refine box |
| Extraction prompts (resume, JD, call) | S-03, S-06, S-07 | View only in v1 🔶 | Changes affect all data |
| Stage-2 scoring prompt | S-04 | View only in v1 🔶 | Changing it breaks comparisons between runs |
| Masked layouts A / B / C | S-09 | Admin: default, on/off, rename, section toggles (take, education, impact numbers) | New layouts need developer work |
| Editable-output layout | S-10 | Admin | |

**Prompt editor** (one per prompt; flow F-16)
- Where it's used, its current version, and who changed it last.
- The prompt text, with a list of variables to insert.
- **Locked block** (read-only, always appended): never invent facts · never print assumed or predicted data · on masked outputs, never print contact details or the candidate's name.
- **Try it** (Should): pick an example candidate and role, and see the current and draft outputs side by side.
- **Save** creates a new version. History lets you restore any version. Existing outputs keep the version they were made with (shown in the Resumes library).

**Access (three fixed roles in v1)**

| Action | Admin | Recruiter | Associate |
|---|---|---|---|
| Add candidates and roles · upload resumes | ✓ | ✓ | ✓ |
| Edit candidate facts, role must-haves, client asks | ✓ | ✓ | — |
| Score with AI · rerun · score more | ✓ | ✓ | — |
| Shortlist | ✓ | ✓ | ✓ 🔵 |
| Reject (single or bulk) | ✓ | ✓ | — |
| Generate masked resumes | ✓ | ✓ | ✓ |
| Generate editable or as-is outputs (these show identity) | ✓ | ✓ | — |
| Copy list: masked / full | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| Write and sign their own take | ✓ | ✓ | ✓ (after a call they took) 🔶 |
| Export CSV | ✓ | — | — |
| Prompts, templates, team, skill list | ✓ | — | — |
| Delete records | ✓ | — | — |

Actions someone can't take stay visible but disabled, with a tooltip such as "Recruiters and Admins can reject". That way associates learn the workflow and know whom to ask. 🔶

**Stories**

**US-36 · Change a prompt without breaking outputs**
- **As an** admin, **I want to** edit a prompt, try it on an example and save it as a new version, **so that** I can improve outputs and roll back if a change makes them worse.
- *Scenario:* **Given** the masking prompt is at v4 · **When** I save an edit · **Then** v5 becomes active, v4 can be restored, outputs already made still show v4, and the locked rules are unchanged.

**US-37 · Control who can do what**
- **As an** admin, **I want to** give each team member the Admin, Recruiter or Associate role, **so that** interns can generate masked resumes without being able to reject candidates or change prompts.
- *Scenario:* **Given** Aman is an Associate · **When** he selects rows on Matches · **Then** "Shortlist" is enabled, and "Reject" is disabled with the tooltip "Recruiters and Admins can reject".

---

### 7.6 T6 · Refine a generated resume with a prompt
**Owner:** Product (with Design) · **Call ref** 52:01–53:01 · **Priority:** Must

**Today:** the masked builder can "Regenerate bullets" (the whole section) and hand-edit bullets. The Resumes library can regenerate. Nothing takes an instruction.

**Decision ➜**
- **Three output modes ✅:**
  - **Masked:** identity hidden.
  - **As-is:** the original file, untouched.
  - **Editable:** today's "Tailored". It can be edited in the app and refined with a prompt, then exported as PDF or DOCX. 🔵
- Refinement works on Masked and Editable outputs.
- **Regenerate is always available.** ✅

**Ways to change an output, in order of preference**
1. **Edit a field directly** (click a bullet and type). This exists for bullets; extend it to every text block.
2. **Refine with a prompt.** One box under the preview ("Tell the AI what to change"), plus preset chips. It applies to the whole resume or just the selected section.
3. **Regenerate** one section, or the whole resume, from the profile.
4. **A fact is wrong?** Use **Fix in profile**, which opens that field on S-07. The output then goes stale and offers to regenerate. A prompt never changes facts (P12).

**What the team typically asks for** 🔶 (check against the Claude + Google Sheet experiment logs)

| Kind | Example | Handled by |
|---|---|---|
| Emphasis | "Lead with payments", "focus on B2B" | Refine |
| Length and tone | "Shorter", "more numbers", "less salesy" | Refine (presets) |
| Masking | "Describe Google as a big tech company", "show the school" | Existing toggles; refine for the wording |
| A section | "Rewrite the take", "drop education" | Refine scoped to that section · template toggles |
| Facts | "He left Stripe in 2022" | Fix in profile |
| Targeting | "Write it for a fintech prospect" | Target select (exists) + regenerate |

**Flow F-17 · Refine**
1. In the builder preview, type an instruction or pick a chip, then click **Refine**.
2. Changed sections are highlighted with before and after.
3. Keep or undo each section.
4. The identity check and fact check rerun automatically.
5. Download.

Each refinement creates an output revision (v1 → v2 "Shorter, lead with payments"), and any revision can be restored. The downloaded revision is the one that gets logged.

**Where it happens:** inside the builders (S-09 masked, S-10 editable). You can get there from a Shortlist tab row (*Refine*), the candidate's Resumes tab, or the Resumes library, which opens the output's latest revision.

**Rule:** if a refinement adds an employer name, number or skill that isn't in the profile, that change is blocked ("This adds facts not in the profile") and the section stays as it was. Every refinement counts toward AI usage.

**Data:** Output = a JSON document + `revisions[{ n, instruction, scope, createdBy, at }]`, plus `promptVersion`, `templateId`, `sourceResumeId` and `sourceVersion`.

**Stories**

**US-38 · Refine with an instruction**
- **As a** recruiter, **I want to** tell the AI what to change on a generated resume, **so that** I fix the draft in seconds instead of rewriting it by hand.
- *Scenario:* **Given** a masked resume preview · **When** I type "Shorter, lead with payments" and click Refine · **Then** only the changed sections are highlighted, I can keep or undo each one, and the result is saved as a new revision.

**US-39 · Regenerate one section**
- **As a** recruiter, **I want to** regenerate only the section I don't like, **so that** the parts I've already approved stay the same.
- *Scenario:* **Given** I've edited "Why we recommend" · **When** I regenerate the "Our take" section · **Then** "Why we recommend" keeps my edits.

**US-40 · Fix a fact at its source**
- **As a** recruiter, **I want to** correct a wrong fact from the output and have it fixed in the profile, **so that** the next resume and every match use the right fact.
- *Scenario:* **Given** the preview shows the wrong end year · **When** I click "Fix in profile" and save · **Then** the profile field updates, and this output shows "Stale · Regenerate".

---

### 7.7 T7 · Requirements from a client conversation ("client asks")
**Owner:** Product · **Call ref** 26:43–27:25 · **Priority:** Must

**Today:** the role editor has "Optional context": an intake call link or notes, research, and "what good looks like". Nothing structured comes out of a call.

**Decision ➜**
- ✅ The system isn't for random entry, so the **team** adds these.
- A role gets a **Client asks** list: short, structured items the client said outside the JD.
- Each ask has its text (in our words), a type, a source (call, email or chat, plus who said it and when), and who added it.

| Type | Effect on matching | Example |
|---|---|---|
| **Must-have that maps to a column** | Becomes a stage-1 rule. The role goes out of date and the rerun flow starts. | "Must be in NYC", "No sponsorship" |
| **Must-have with no column** | Can't be a filter (P11). Scored as a high-weight criterion, and every scored row shows a chip: evidence found / not found. | "Has led a team of 5+" |
| **Nice-to-have** | A ranking signal | "Fintech background a plus" |
| **Context** | Not used for matching. Shown on the role and available to the pitch and take prompts. | "Sean cares about speed; the team works remote-first" |

When the text matches a column ("NYC" → Location), the type picker suggests that column. 🔶

**How client asks differ from what exists**

| Input | What it is | What it becomes |
|---|---|---|
| **JD** | The formal document, versioned | Role fields (JD vN) |
| **Intake call link or transcript** (Fathom / Granola) | The raw source | AI proposes client asks, and the team accepts each one (the proposed-changes pattern already used for revised JDs) |
| **Client asks** | The structured result. Also typed by hand when there's no recording. | Rules, signals or context (table above) |
| **What good looks like** | A narrative about past hires | Context (unchanged) |

**Screens**
- **S-03 role editor:** a "Client asks" card in the right pane, under Must-haves.
- **S-04 role page:** header ⋯ → **Add client ask** opens **D-08**, a quick dialog that doesn't need the full edit. A Client asks card also goes on the Details tab.
- **Match rows:** requirement chips for must-haves with no column.

**Rule:** adding or changing a must-have or nice-to-have marks the role out of date. Context doesn't.

**Flow F-18 · Add a client ask** · ⋯ → Add client ask → text → type (suggested) → source → Save → (if it's a rule) the out-of-date banner appears.

**Stories**

**US-41 · Add a requirement from a client call**
- **As a** founder-recruiter just off a call with Sean, **I want to** add what he asked for to the role in under a minute, **so that** matching and the pitch use what the client actually wants.
- *Scenario:* **Given** the Northwind role is open · **When** I add "Has led a team of 5+" as a must-have with no column · **Then** it appears under Client asks with source "Call · Sean", and scored rows show an evidence chip for it.

**US-42 · Turn a transcript into client asks**
- **As a** recruiter, **I want to** paste an intake-call transcript and accept the requirements it proposes, **so that** nothing the client said is lost and nothing is added without my OK.
- *Scenario:* **Given** I paste a Fathom link on the role · **When** the AI proposes 4 asks · **Then** only the ones I accept are added, each with source "Call".

---

### 7.8 T8 · A named take ("our take")
**Owner:** Product + Design · **Call ref** 50:53–51:17 · **Priority:** Must

**Today:** one take per candidate, typed by hand, printed on masked resumes in quotes and signed "— Vandit" (hard-coded). There's no approval step.

**Decision ➜**
- **Who signs:** the person who wrote or approved the take, signing as themselves. Nobody signs on someone else's behalf. 🔵 Purvesh may want founder-signed takes on key pitches; if so, he writes or approves those himself.
- **Where it prints:**
  - **Masked:** yes. This is the prospect hook.
  - **Editable:** yes, as a short note block.
  - **As-is:** no, because the file stays untouched. The take goes into the copied email instead. 🔶
- **Format:** a quote of 1–2 sentences, at most 280 characters, then "— Vandit D., Talent Partner, HeroScouter" (name and title come from My profile).
- **How it's generated:**
  - The AI drafts it from the candidate's call notes, profile and target role, using the take prompt (T5).
  - It only drafts when at least one call or recruiter note exists.
  - With no call, it shows "Add your take after a call" (P13: a vouch without a conversation is just an AI summary).
- **Approval:**
  - A draft never prints.
  - **Approve and sign** stores the signer and the time.
  - Any edit after approval needs re-approval.
  - The builder can hold a role-specific version; otherwise the general take is used.

**States** (builder section "Our take"): Empty (no call) · Draft (AI-written, unsigned, not printed) · Signed by you · Signed by someone else (read-only; *Write your own* replaces it for this output) · Edited since signing.

**Flow F-19 · Sign a take** · Draft (AI or typed) → edit → **Approve and sign** → it prints on the next masked or editable output and goes into the email for as-is outputs.

**Data:** `Take { candidateId, roleId?, text, authorId, approvedAt, sourceCallIds[] }`. Team members get `displayName` and `title`.

**Stories**

**US-43 · Draft and sign a take**
- **As a** recruiter who has spoken with the candidate, **I want to** get an AI draft of my take from the call and sign it, **so that** a prospect reads a real person vouching, in my words.
- *Scenario:* **Given** Priya has a call on record · **When** I edit the draft and click "Approve and sign" · **Then** the take is saved with my name, my title and the time, and it shows in the masked preview.

**US-44 · Unsigned takes never print**
- **As a** founder, **I want** only approved takes to appear on anything we send, **so that** no one's name is attached to words they didn't approve.
- *Scenario:* **Given** a take is still a draft · **When** someone downloads the masked PDF · **Then** the take block is left out, and the preview shows "Draft not printed".

---

### 7.9 T9 · Remove what nobody decides on (Roles)
**Owner:** Design (Product to confirm) · **Call ref** 2:00–2:37, 54:43 · **Priority:** Must

✅ **Purvesh's test:** who looks at this screen, and what do they decide on it?

**Roles list (S-02)**
- **Who looks:** the founder-recruiter and the recruiter, several times a day. Associates look when a client asks for something.
- **Decision:** "Which role needs me now, and what's the next step on it?"

| Column | ➜ | Why |
|---|---|---|
| Category | Keep, **1st** | Scanning by function |
| Company + Client/Prospect tag | Keep, **2nd** 🔵 (reading "product" in the note as the company) | |
| Job title | Keep, **3rd** | |
| Must-haves | **Remove** | Detail for the role page. No decision on the list uses it. |
| **Latest update** (new) | **Add** | "JD v3: must-haves changed · Purvesh · 2h" · "12 new passers" · "Shortlist ready (5)". It answers "what changed since I last looked?" |
| Next step (merges the Matches status and the row button) | Keep | Not scored → *Score* · Out of date → *Rerun* · Scored → *Review (5 new)* |
| Shortlist count | Keep | |
| Updated time | Fold into Latest update | Avoids two time columns |

🔵 Confirm whether the "update section" meant this column or a separate feed. ➜ A column, with no new section.

**Role page (S-04)**

| Section | Decision it supports | ➜ |
|---|---|---|
| Header: title, company, status, JD version, Edit role | Change status; which version am I on? | Keep |
| Matches: funnel line | "Why only 96?" → see eliminated | Keep |
| Matches: keyboard hint text | None | Move to the "?" sheet |
| Matches: Top 5 / All ranked · band select · Hide decided | — | Replaced by the scoring control (T2) and the filter bar (T4) |
| Shortlist tab | What goes to the client, and in what order | Keep |
| Details: must-haves, client asks, context, pay | "Is the role right?" | Keep (client asks are new) |
| Details: full JD text | Reference only | Collapse |
| Details: Version history card | Duplicates the version chip in the header | Remove (compare from the chip) |
| History tab | Rarely leads to a decision | Merge into Details as "Recent activity (5) · See all in Activity" |

**Result:** three tabs: **Matches · Shortlist · Details.**

**Story**

**US-45 · See which role needs me now**
- **As a** founder-recruiter opening the tool, **I want** the Roles list to show each role's latest update and next step, **so that** I know where to act without opening every role.
- *Scenario:* **Given** Northwind's JD changed to v3 today · **When** I open Roles · **Then** its row reads "JD v3: must-haves changed · Purvesh" with the next step *Rerun*, and it's sorted above roles that need nothing.

---

## 8. Out of scope and parked

| Item | Why | When |
|---|---|---|
| **T10 · Find candidates similar to a profile / list building** | ✅ A separate module, after the current scope is handed over. AI pattern-matching on similar profiles is expected to be about 50–60% accurate and depends heavily on the prompt. | Later, as a separate project. The resume target functions (T3) and the Domain column (T4) are the data it will need. |
| **AI Scout** (prompt → filters + chat) on Candidates | Not in v0.2. It clashes with "filters on existing columns", adds token cost, and is a second way to filter. | ➜ Park. If it comes back, it may only fill the same filter bar with visible chips. |
| OR across columns | Rarely needed, and it complicates the bar | Revisit if it's asked for twice |
| Saved filters and views | Nice to have, not blocking | Next |
| Custom roles and per-person permissions | Three fixed roles cover the team | Later |
| Editing the extraction and scoring prompts | Changes there affect everything | Later, together with run-to-run comparison |
| New masked layouts from Settings | Needs PDF template work | Request to the developer |
| Client preview link, tracking, Gmail sending | Unchanged from v0.2 | Later |

---

## 9. Dependencies, risks and build order

**Dependencies**
- Vector similarity over every stage-1 passer (the cheap pre-sort) 🔶
- Outputs stored as JSON with revisions
- The fact check from tailoring, reused for refinements
- A prompt registry with versions and locked rules
- Sign-in with three roles
- Domain extraction when a resume is parsed
- Per-person settings storage (column choices)

| Risk | Mitigation |
|---|---|
| Bulk shortlisting turns into rubber-stamping by rank (automation bias) | The assumed-must-haves confirm (D-06), reasons visible on every row, and tracking client rejections by band |
| A bulk reject removes people whose data is missing | "Not captured" is included by default, the confirm shows how many are assumed, and the whole batch can be undone |
| A small scoring count hides a great candidate whom similarity ranked low | "Score 10 more" is one click, the funnel shows the unscored count, and the pre-sort basis is explained |
| A prompt edit makes outputs worse | Versions and restore, locked rules, the try-it preview, and outputs recording their prompt version |
| A refinement invents facts | The fact check blocks the change |
| Signed takes feel generic | Drafted only from calls and notes, approved by the signer, and reply rates compared (take vs no take) in the outreach sheet |
| Two resumes give conflicting facts | Facts only change through proposed changes, and conflicts are flagged |
| Permissions slow associates down | Disabled actions stay visible with a "who can" tooltip, and access is reviewed after the first real use |
| Nine tasks before the hand-off | The priority and build order below |

**Build order (by dependency)**
1. **Data model:** resumes and versions (T3) · client asks (T7) · takes (T8) · prompt registry (T5) · roles and permissions (T5) · Domain column (T4) · output revisions (T6)
2. **Matching pipeline:** stage 1 on save → prune → score N → score more (T2)
3. **Shared list components:** selection bar and keys (T1) · filter bar and columns (T4)
4. **Outputs:** refine box · source-resume select · signed take (T6, T3, T8)
5. **Screen cleanup:** Roles list and role page (T9)
6. **Settings screens:** prompts, templates, team (T5)

| MoSCoW | Items |
|---|---|
| **Must** | T1 bulk decisions · T2 scoring count · T3 data model + source select · T4 filter bar on Matches and Candidates · T5 roles + prompt registry with locked rules · T6 refine + regenerate · T7 client asks · T8 signed take · T9 Roles cleanup |
| **Should** | Prompt "Try it" preview · section-level diff on refine · Shortlist subset for email |
| **Could** | Selecting across pages beyond "all matching" · admins editing the refine presets |
| **Won't (now)** | Everything in §8 |

---

## 10. Decisions needed from Purvesh before the hand-off

| # | Decision | ➜ Recommendation |
|---|---|---|
| 1 | Keys: X selects, S shortlists, E rejects (like Gmail) | Yes |
| 2 | Default number to score | 10, with options 5 / 10 / 25 / 50 / All |
| 3 | Can unscored candidates be shortlisted? | Yes, marked "Not scored" |
| 4 | Pick the resume used for scoring automatically, by role category? | Yes, overridable per match |
| 5 | The Domain value list, and who maintains it | Start with about 10 (B2B SaaS, Payments/Fintech, Healthtech, Marketplace, Consumer, DevTools, AI/ML, E-commerce, Edtech, Enterprise). Vandit maintains it in Settings → Skill list. |
| 6 | Do we need OR across columns? | Not in v1 |
| 7 | Park AI Scout? | Yes |
| 8 | Can associates shortlist? Can they reject? | Shortlist: yes. Reject: no. |
| 9 | Who signs takes: the author, or Purvesh on key pitches? | The author signs, and Purvesh signs his own |
| 10 | Take for as-is resumes goes in the email only? | Yes |
| 11 | Does "Editable" mean editing in the app with DOCX export? | Yes: PDF and DOCX |
| 12 | Roles list: does "product" mean the company? Is the "update section" a column? | Yes / Yes |
| 13 | Token cost per AI score, and a per-run cap | The developer gives the number; until then, cap one run at 50 |
| 14 | Batch cap for bulk masked generation | 25 per batch 🔶 |

---

## Self-assessment

- **Strongest:**
  - **T2** follows Purvesh's own pipeline and fixes cost at the source.
  - **T1 + T4** reuse mental models the team already has (Gmail keys, Sheets filters) and one pattern across every list.
- **Weakest:**
  - **T5 access:** nobody has said yet what associates may do.
  - **Metrics:** still no baselines.
- **Top assumptions to validate:**
  1. A cheap similarity pre-sort is good enough to decide who gets scored first.
  2. The team's keyboard habit is Gmail's.
  3. Takes drafted from calls and signed by a person lift replies.
  4. Instruction-based refinement covers most edits without hand-editing.
- **Next step:**
  1. Walk Purvesh through §10 (14 decisions).
  2. Update the wireframes for S-02, S-04, S-05, S-07, S-09 and S-13.
  3. Hand off to the developer.

---

## Appendix A · New flows, dialogs and components

- **Flows:**
  - F-12 Decide in bulk (T1)
  - F-13 Score in rounds (T2)
  - F-14 Add a resume (T3)
  - F-15 Filter, then act (T4)
  - F-16 Edit a prompt (T5)
  - F-17 Refine (T6)
  - F-18 Add a client ask (T7)
  - F-19 Sign a take (T8)
- **Dialogs:**
  - D-06 Confirm assumed must-haves
  - D-07 Update or another resume
  - D-08 Add client ask
  - D-01 Reject gains a batch mode
- **Components:**
  - N16 Selection bar
  - N17 Filter bar with values / number / any-all pickers
  - N18 Columns menu
  - N19 Score control
  - N20 Refine box with section diff
  - N21 Signed take block
  - N22 Client ask item
  - N23 Prompt editor
  - N24 Disabled-with-reason control

## Appendix B · Where each change lands in the wireframe app

| Change | File |
|---|---|
| "Shortlist" verb, row checkbox | `src/components/hs.tsx` (MatchRow) |
| Matches keys, selection bar, scoring control, tabs | `src/screens/RolePage.tsx` |
| Filter bar replacing the 11 groups · AI Scout parked | `src/screens/CandidatesList.tsx` |
| Roles list columns | `src/screens/RolesList.tsx` |
| Resume variants | `src/data/types.ts` (`resumeVersion` → `resumes[]`) · `CandidateProfile.tsx` · `NewCandidate.tsx` |
| Source resume, refine box, signed take | `src/screens/MaskedBuilder.tsx` · `TailoredReview.tsx` |
| Prompts, templates, access | `src/screens/SettingsPage.tsx` |
| Client asks | `src/screens/RoleEditor.tsx` · `RolePage.tsx` (Details) |
