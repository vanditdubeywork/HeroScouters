# HeroScouter Talent Engine — PRD

**v0.2 · updated after the founder review · internal (for us)**

Legend: 🔶 **Assumption** (plausible, unvalidated) · 🔵 **Open question** · ◆ Checkpoint

| | |
|---|---|
| **Author** | Vandit Dubey (product) |
| **Reviewers** | Purvesh Naik (founder) · Developer |
| **Source of truth** | Founder review call (`Final Product Discussion.txt`); full extraction in `heroscouter-discovery.md` → "Founder review" |
| **Next stage** | Wireframes, built from `heroscouter-product-design-doc.md` |

---

## 0. What changed after the founder review

| Area | v0.1 said | v0.2 (agreed with founders) |
|---|---|---|
| How candidates enter | Inbound intake call, then profile | **The funnel starts with a role, through outbound outreach.** Pre-vetted lists of 50–60 per role → outreach → 10–15 min call → resume. List quality is the lever (built outside this tool). |
| Inputs | Fathom transcript + resume | **Resume and JD are mandatory.** Candidate call, client call and hiring-team research are optional. Fathom or Granola. |
| Records | Draft once, confirm | **Resumes and JDs keep changing.** Every field stays editable, with versions and an update log. |
| Candidate data | Generic fields | **US-specific fields**, including visa type, expiry, sponsorship and transfer. **Missing data is assumed favorable.** Completeness score and "ask on next call" list. |
| Matching | AI picks the top 5 | **Two stages.** Instant elimination on must-haves, then AI + similarity ranking. **Missing-but-predictable skills** are tagged. Reruns happen only when something changes. |
| Fastest use case | Role lands → shortlist | Also: **"Give me all our marketing candidates, now"**: instant filtering and copying. |
| Outputs | Tailored resume (Should), masked (Could) | **The masked resume is the burning need:** one click, on the fly, attractive, PDF, about 400–500 a month. Tailored resume is prompt-based, with a send-as-is option. |
| Tracking | Stages, consent, close-the-loop, going-cold list in the MVP | **Deferred.** The journey is too variable to predict yet, and the close-the-loop reminder is "discussed later". |
| Client side | Shortlist sent by a person | **Stays manual, over email.** Preview link with approve/reject and a copy message comes **later**. |
| Call prep | R2 feature | **P2/P3.** A Claude project with a base prompt for now. |
| Experiments | Two no-code POCs | **Claude + Google Sheet workflow first:** masked-resume templates (3–4 variants) and matching quality. What we learn feeds the build. |
| Where the system stops | After outcomes | **After masked resumes.** Meetings and client follow-ups stay manual. |

---

## 1. Executive summary

We're building an **internal talent engine** for HeroScouter's team. It keeps one source of truth for every candidate and every role, built from the resume and JD and enriched by calls and research. From that, it tells a recruiter **which candidates best fit a role, and why**. It first removes obvious mismatches instantly, then ranks the rest with AI that recognises adjacent skills. In **one click**, it turns any candidate into a **masked resume** good enough to win a prospect's attention, or a tailored resume a hiring manager can review straight away. Everything after that (pitching, meetings, client follow-ups) stays human for now.

**Success:** the best candidates for every role with a reason, same day; masked resumes at the volume outreach needs (about 400–500 a month); and, over time, more placements per recruiter without more headcount.

---

## 2. Problem

**Who:** HeroScouter's team — the founder-recruiter today, plus interns and associates who handle outreach and client communication. 🔶

**What:**
- **Everything is manual.** We have the data (resumes, JDs, call recordings) but can't use it. It's scattered across email and calls, and most of it sits in Purvesh's head.
- **Matching is slow and depends on memory.** When a role lands, or a client asks for "all our marketing candidates", nobody can answer quickly unless Purvesh does.
- **Masked resumes are made by hand.** Prospect outreach needs about 400–500 a month, so this blocks the most important growth motion: turning prospects into clients.

**Why it hurts:**
- **Recruiters:** slow shortlists, missed fits, and adjacent-skill candidates wrongly dropped.
- **Business:** prospects aren't converted at the pace outreach allows, and the business doesn't scale beyond one person.
- **Candidates:** they don't feel enough value or personal attention, so retention suffers.

**Evidence:** two founder discussions.
- The founder review confirmed the core problems: manual, scattered, slow, not scalable.
- Prospect → client was named as the most burning problem.
- No metrics exist yet. 🔵

---

## 3. Users

**Uses the tool (internal):**

| User | Context | Main jobs |
|---|---|---|
| **Founder-recruiter** (Purvesh) | Between outreach and calls, often right after a candidate call | Review matches, decide shortlists, pitch candidates to roles and prospects |
| **Recruiter / ops** (Vandit) | Desk work, running the Claude workflow, owning data quality | Add and update candidates and roles, run matching, keep profiles complete |
| **Client-comms associate** (an intern) 🔶 | Urgent client asks | Pull filtered lists fast ("all marketing candidates"), generate masked resumes |
| **Outreach interns** 🔶 | Outreach campaigns | Add candidates who reply, attach resumes |

**Receives outputs only (never logs in):**
- **Candidates:** feel personal attention and see relevant roles. The public roles page stays.
- **Hiring managers:**
  - **Prospects** receive masked resumes. Their JD is often public, and sometimes there isn't one.
  - **Clients** receive tailored or as-is resumes.

---

## 4. Strategic context

- **Goal:** more placements per recruiter, without more headcount.
- **The burning problem now:** prospect → client. Masked resumes are the hook, so how fast and how well we make them matters most.
- **Why now:**
  - Outreach is scaling with an intern team.
  - The 400–500 masked resumes a month baseline can't be done by hand.
  - Resumes, JDs and call recordings already exist.
- **Not this product:** list building for candidates and clients (separate project, e.g., Google Programmable Search), outreach sequences (ops), and SEO.

---

## 5. Solution overview

**Principle:** the tool remembers, filters and drafts. **People decide and do the talking.**

### Modules (v1)
1. **Candidate pool.** Resume in (mandatory) → draft profile. Optionally enrich it from a call transcript. Every field is editable, with versions and a log. A completeness score shows what to ask on the next call.
2. **Role pool.** JD in (mandatory: pasted, uploaded or from a public posting) → draft role. Optionally add a client intake call and hiring-team/founder research. Roles come from clients or from prospects' public postings.
3. **Matching.**
   - **Stage 1 eliminates instantly on must-haves.** Missing data never eliminates anyone.
   - **Stage 2 ranks the rest.** The top 5 each get a fit band, a reason, evidence and any predictable skills.
   - Works in both directions, plus instant filtering of the pool.
4. **Review.** Preview a candidate without leaving the list, then shortlist or reject with a reason.
5. **Change and reruns.** When a JD or a key profile field changes, matches are flagged out of date. Recruiters rerun on purpose and see what changed, including candidates who now qualify.
6. **Outputs.**
   - **Masked resume:** one click, on the fly, PDF, with or without a role. Can be made in bulk for a shortlist.
   - **Tailored resume:** tailor or send as-is. Every change is traceable.
   - **Copy email text** to paste into a manual email.
7. **Update log.** Every change and decision is recorded, for analytics and audit.

### Updated journeys
- **Candidate:**
  1. Role-specific outreach (ops)
  2. Replies or asks for a call
  3. 10–15 minute call (prep via the Claude project)
  4. Resume shared → **profile created**
  5. Missing questions asked on the call → **profile enriched**
  6. **Matched to the original role and 2–3 more**
  7. Pitched to clients for those roles (by a person)
  8. Interviews (manual)
- **Prospect (burning):**
  1. We have a strong candidate.
  2. We find a company hiring for that profile (separate list-building project).
  3. **Masked resume in one click.**
  4. Pitch email (by a person, using copied text).
  5. Prospect replies.
  6. Terms agreed → becomes a client.
- **Client:**
  1. JD (+ optional intake call and research) → **role**
  2. **Matches → shortlist**
  3. **Tailored or as-is resumes** → email (by a person)
  4. Everything after that is manual.

### Story map (v1)

| Release | Candidate pool | Role pool | Matching | Review | Outputs | Change |
|---|---|---|---|---|---|---|
| **First release** | Resume → profile · call enrichment · edit + versions · completeness + "ask on call" · instant filters + copy list | JD → role · public JD → prospect role · optional call + research · edit + versions | Elimination → ranking · top 5 with band + reason + evidence · predictable skills · assumed fields · candidate → roles | Preview drawer · shortlist / reject with reason · see eliminated | One-click masked PDF (with or without role) · bulk masked for a shortlist · tailored or as-is · copy email text | Out-of-date flags · rerun / force rerun · what changed · update log |
| **Next** | Duplicate merge · bulk import from sheet | Hiring-team research helper | Learn from approve/reject · tune hard vs soft filters | Notes per match | Template variants (from Claude experiments) · shareable preview link | Scheduled reruns within a budget |
| **Later** | Candidate-facing insights | — | — | — | Client preview page with approve/reject, HeroScouter confidence, click tracking, copy message | Stage tracking · close-the-loop · going-cold list · call-prep widget |

---

## 6. Success metrics

- **North star:** placements per recruiter per month.
  - 🔵 The baseline is recorded once v1 is in use.
- **Main output metric:** the best candidates for a role, with a reason.
  - Roles with a reviewed top-5 shortlist on the day the role is added: **≥80%** 🔶
  - Suggested matches accepted by the recruiter: **≥50%** 🔶
  - "All our [category] candidates" answered in **under a minute**
- **Masked resumes:**
  - **One click**, ready in **under a minute**
  - Handles **400–500 a month** without manual formatting
- **Data health:** median profile completeness **≥70%** 🔶, with every hard-filter field captured or explicitly "assumed".
- **Prospect conversion:** reply rate to masked-resume pitches.
  - Tracked in the outreach sheet for now 🔶; in-product tracking comes with the preview link (Later).
- **Guardrails:**
  - Resumes never contain invented content.
  - Nobody is eliminated because data is missing.
  - Masked resumes never reveal identity (checked in preview).
  - Recruiters spend under 5 minutes of edits per profile.
  - Rerun spend stays within an agreed budget. 🔵

---

## 7. Requirements

### 7.1 Epics

| Epic | Hypothesis | Valid if |
|---|---|---|
| **E1 Candidate pool** | If profiles build themselves from resumes and calls, and stay easy to update, the pool becomes searchable without data entry. | Profiles ready the same day; under 5 minutes of edits; no side sheets |
| **E2 Role pool** | If any JD (client or public) becomes a structured role that can change over time, matching always works on current requirements. | Every open role in the tool; JD changes captured as versions |
| **E3 Matching** | If we eliminate obvious misses instantly and rank the rest with reasons and adjacent skills, recruiters trust the shortlist and find fits they'd miss. | ≥50% acceptance; at least one accepted "predictable skill" candidate per month 🔶 |
| **E4 Change and reruns** | If changes flag out-of-date matches and reruns show what changed, nobody stays wrongly rejected, and token spend stays controlled. | Re-qualified candidates surfaced after JD edits; reruns only when triggered |
| **E5 Outputs** | If masked and tailored resumes take one click, outreach volume isn't limited by formatting. | 400–500 masked a month; tailored resumes ready to send with light edits |

### 7.2 User stories (first release)
Format: As a / I want / so that, then the key acceptance criteria. Each story has a single trigger.

**E1 — Candidate pool**
- **US-01 · Create a candidate from a resume.** As a recruiter, I want to upload a resume and get a draft profile, so I don't retype it.
  - Resume is required (PDF/DOCX/pasted text).
  - The draft fills every field it can. Each field shows its source (Resume / Call / Edited / Assumed).
  - Fields that weren't found show "Not captured".
- **US-02 · Enrich from a call.** As a recruiter, I want to add a call transcript or link to a profile, so the answers from the call update it.
  - Optional.
  - Shows a list of proposed changes (new and changed fields) to accept or reject.
  - Accepted changes are logged.
- **US-03 · Update anything, anytime.** As a recruiter, I want to edit any field or upload a newer resume, so the profile stays current.
  - A new resume creates a version.
  - Key-field edits (skills, preferences, work authorization) mark the candidate's matches as out of date.
- **US-04 · See what's missing.** As a recruiter, I want a completeness score and an "ask on next call" list, so I know what to ask.
  - The score is weighted toward hard-filter fields.
  - The list holds plain questions (e.g., "Open to relocating? Where?").
- **US-05 · Answer an urgent list request.** As a client-comms associate, I want to filter the pool by category, sub-category, location, work mode and work authorization, and copy the result, so I can answer a client in minutes.
  - Filters apply instantly.
  - "Copy list" copies name, headline, years, location and work-authorization summary.
  - Masked or unmasked mode.
- **US-06 · Avoid duplicates** *(Could)*. Warn when the email or LinkedIn URL already exists, and offer to add the new resume as a new version.

**E2 — Role pool**
- **US-07 · Create a role from a JD.** As a recruiter, I want to paste or upload a JD, or paste a public posting URL, and get a draft role, so every role is structured the same way.
  - JD required.
  - Company marked Client or Prospect.
  - Category and sub-category suggested.
  - Must-haves extracted and editable.
- **US-08 · Add optional context.** As a recruiter, I want to attach a client intake call and hiring-team/founder research, so matching and pitching use what the client actually wants.
  - Both optional.
  - Call answers are proposed as changes to accept.
- **US-09 · Update a role anytime.** As a recruiter, I want to edit the role or paste a revised JD, so matches follow the real requirements.
  - Creates a JD version.
  - Must-have or skill changes mark the role's matches as out of date.

**E3 — Matching and review**
- **US-10 · Find the best candidates for a role.** As a recruiter, I want to run matching on a role, so I see the best candidates with reasons.
  - Stage 1 removes candidates who fail must-haves.
  - Stage 2 ranks the rest.
  - The top 5 show by default, each with rank, fit band, reason, evidence, any predictable skills, any assumed fields and gaps.
  - "Show more" reveals the next 5.
- **US-11 · See who was eliminated.** As a recruiter, I want to see how many were eliminated and why, and include someone anyway, so the filter never hides a good person.
  - Counts per must-have.
  - "Include anyway" moves the person into ranking, and the override is logged.
- **US-12 · Trust adjacent skills.** As a recruiter, I want missing-but-predictable skills labeled with their basis, so strong candidates aren't dropped over wording.
  - Label example: "LinkedIn Ads — predicted from Meta + Google Ads, 6 yrs".
  - Explicit matches always rank above predicted ones at equal fit.
- **US-13 · Assume favorably, visibly.** As a recruiter, I want missing data treated as a pass and marked "Assumed", so partial profiles aren't punished but I know what to verify.
  - The assumed field appears as a chip, with an "add to ask list" action.
- **US-14 · Preview without leaving.** As a recruiter, I want to open a candidate in a side panel from the match list, so I can decide quickly.
  - The panel shows the key facts, why they fit, gaps and assumptions, and has Shortlist / Reject buttons.
  - Moving to the next and previous candidate works with the keyboard.
- **US-15 · Shortlist or reject with a reason.** As a recruiter, I want to shortlist or reject a match, so the role's list reflects my judgment.
  - Reject needs a reason from a short list (skills, seniority, location, work authorization, pay, other).
  - Rejected candidates leave the list but stay viewable.
- **US-16 · Find roles for a candidate.** As a recruiter, I want to see which open roles fit a candidate, so I can pitch them 2–3 more roles after the call.
  - Same two stages and the same row anatomy.
  - Includes prospect roles from public JDs.

**E4 — Change and reruns**
- **US-17 · Know when matches are out of date.** As a recruiter, I want a clear flag when the role or candidate changed after the last match, so I don't act on stale results.
  - The flag shows what changed (e.g., "Must-have added: SQL").
  - No automatic rerun.
- **US-18 · Rerun and see what changed.** As a recruiter, I want to rerun matching and see the difference, so previously rejected people who now qualify get a second look.
  - Before running, shows how many candidates will be re-ranked.
  - After running, shows New / Moved / Re-qualified / Dropped.
  - Logged.
  - "Force rerun" is available even without changes.

**E5 — Outputs**
- **US-19 · Masked resume in one click.** As a recruiter, I want to generate a masked resume from a profile, with or without a target role, so I can pitch a prospect immediately.
  - Hides identity (see masking rules in the design doc).
  - With a role, it emphasises what's relevant to that role.
  - Preview before download, then download as PDF.
  - Ready in under a minute.
- **US-20 · Masked resumes for a whole shortlist.** As a recruiter, I want to generate masked resumes for every shortlisted candidate at once, so a pitch with 3–5 people takes one action.
- **US-21 · Tailor or send as-is.** As a recruiter, I want to choose between tailoring a resume to a role or sending it as-is, so strong resumes aren't over-edited.
  - Tailoring shows a side-by-side comparison.
  - Every change is traceable to the resume or a call.
  - Approve → PDF/DOC.
- **US-22 · Copy email text** *(Should)*. As a recruiter, I want ready-to-paste email text for a pitch or shortlist, so a manual email takes one paste.
  - Short, personal tone.
  - No candidate IDs; descriptive one-liners instead.

**E6 — Log**
- **US-23 · See history.** As anyone on the team, I want a log of changes and decisions for each role and candidate, so we know why something happened.

### 7.3 Data requirements
- **Candidate fields** (grouped as the profile shows them):
  - **Basics:** name, email, phone, LinkedIn, current city/state
  - **Experience:** total years, companies (name, title, dates, company type and stage), projects
  - **Function:** category and sub-category
  - **Skills:** explicit (from resume or call), predicted (with basis), tools
  - **Preferences:**
    - Work mode
    - Locations open to
    - Relocation (yes/no/where)
    - Company type (stage, size, industry)
    - Pay expectation
    - Notice / availability
    - Search status (active/passive)
  - **Work authorization:**
    - Status (citizen / green card / visa)
    - Visa type (OPT, STEM OPT, H-1B, other)
    - Expiry
    - Needs sponsorship (Y/N)
    - Needs transfer (Y/N)
    - Flexibility notes
  - **Meta:** source per field, completeness, resume versions, transcripts, notes, last updated
- **Role fields:**
  - **Company:** name, Client or Prospect, source (client JD / public posting URL / intake call)
  - **The role:** title, category, sub-category, seniority, minimum years
  - **Skills:** must-have, nice-to-have
  - **Where:** location, work mode, relocation allowed
  - **Work authorization:** sponsorship offered, transfer supported
  - **Pay:** range
  - **Context:** interview process, "what good looks like", hiring-team/founder research
  - **Meta:** JD versions, status (Open / On hold / Closed)
- **Match:** role, candidate, run version, stage-1 result, rank, band, score, reason, evidence, predicted skills, assumed fields, gaps, status (New / Shortlisted / Rejected + reason / Re-qualified), override flag.
- **Output:** type (masked / tailored / as-is), template, target role (optional), version, created by and when.
- **Event log:** who, when, which record, what changed (before/after), and the run version for matching.
- **Skill list:** per function (categories → sub-categories → skills), plus which skills predict which ("adjacency"). 🔵 Who builds and maintains it.

### 7.4 Matching rules
1. **Stage 1 — Elimination (no AI, instant):** minimum years, location / relocation / work mode, category, sub-category, and work authorization vs sponsorship offered.
   - Every rule is a pass when the candidate's value is missing, and that value is marked "Assumed".
2. **Stage 2 — Ranking:**
   - Similarity search narrows the pool, then AI judges fit against the role.
   - The output is a rank, band and score, plus reason, evidence, predicted skills and gaps.
3. **Ordering:** at equal fit, explicit matches rank above predicted ones. Recency of contact never affects the rank.
4. **Reruns:** only on a trigger (JD must-have/skill change, candidate key-field change) or when forced. The rerun count is visible before running.
   - When one candidate's key fields change, only stage 1 runs (no AI) against open roles.
   - Roles where the candidate newly passes are flagged.
   - Ranking them takes one click ("Rank them").

### 7.5 Constraints and edge cases
- **Partial profiles are the norm.** Design every screen for missing data.
- **Prospect roles may have no client JD.** A public posting URL or a short description is enough. Masked resumes also work with no role at all.
- **Big-company bias.** Brand names shouldn't drive the reason; reasons cite must-haves and skills.
- **Re-qualification.** If a rejected candidate qualifies after a rerun, the rejection stays, but the candidate is flagged "Re-qualified" for a second look.
- **Masking leaks.** Employer names, school names, project names and unique numbers can identify someone. The preview has to make what's hidden obvious.
- **Cost.** AI runs (extraction, ranking, tailoring) cost tokens, so heavy actions are deliberate, never automatic loops.

---

## 8. Out of scope (for now)

| Not now | Why | When |
|---|---|---|
| Candidate list building, outreach sequences | Ops and a separate project; list quality is handled outside the tool | Separate track |
| Client preview link (approve/reject, confidence, click tracking, copy message) | Founders: client communication speed comes later; start with PDF | Later |
| Stage tracking, outcomes, close-the-loop, going-cold list | The journey is too variable to predict yet | Later |
| Call-prep side widget | Manageable with a Claude project | P2/P3 |
| Gmail integration, automated emails | Personal touch; needs engineering help | Later |
| Candidate or client logins | Internal-first | Not planned |
| SEO, daily company digest, free tools | Separate tracks | Separate |

---

## 9. Dependencies and risks

**Dependencies:**
- LLM access (extraction, ranking, tailoring, masking)
- A similarity-search store (vector database)
- PDF rendering from a template
- Call transcripts (Fathom MCP or Granola)
- A skill list per function
- The developer, plus engineering help for harder integrations

| Risk | Mitigation |
|---|---|
| **"A dashboard nobody uses"** | Resume-first capture; urgent filters that answer real asks in under a minute; outputs in one click; no screens that only report |
| Matching misses adjacent-skill candidates | Predicted-skill tagging with a visible basis; "include anyway"; approve/reject reasons feed tuning |
| Assumed data embarrasses us with a client | "Assumed" chips everywhere; the ask list; the masked/tailored preview highlights assumed facts before download |
| Masked resume reveals identity | Masking rules, preview with hidden items listed, per-company show/describe toggle |
| Token cost from reruns | No automatic reruns; impact shown before running; budget 🔵 |
| AI invents resume content | Traceable changes; review before download |
| Scope creep from new ideas | This PRD's out-of-scope list; ideas go to Next/Later unless they beat the masked-resume problem |

---

## 10. Open questions

| # | Question | Owner |
|---|---|---|
| 1 | Fathom MCP or Granola for call transcripts? | Developer + Purvesh |
| 2 | Who builds and maintains the skill list and adjacency map, starting with which functions (engineering, product, marketing)? | Purvesh + Vandit |
| 3 | Which must-haves are hard filters, and which are only ranking signals? | Purvesh |
| 4 | Show fit as bands (Strong/Good/Stretch), a %, or both? | Vandit (wireframe test) |
| 5 | Masked resume: which template(s) win in the Claude experiments, and what branding? | Vandit + Purvesh |
| 6 | Who gets accounts (interns, client-comms associate), and can they edit or only view and generate? | Purvesh |
| 7 | Rerun budget, and should scheduled reruns exist later? | Purvesh + Developer |
| 8 | Does the Google Sheet stay as a temporary source during the transition, or is the tool the only source from day one? | Vandit |
| 9 | Average placement fee and today's time-to-shortlist, for baselines | Purvesh |

---

## Self-assessment
- **Strongest:**
  - **Matching rules (7.4) and data requirements (7.3)** come straight from Purvesh's description of how he works.
  - **Outputs** reflect the burning prospect → client problem.
- **Weakest:** **metrics.** There are no baselines, and prospect reply rates live outside the tool until the preview link exists.
- **Top assumptions to validate:**
  1. AI ranking plus predicted skills beats memory. Test with the Claude workflow on real roles.
  2. Resume + optional call gives enough data to filter. Track completeness.
  3. One masked template can win replies. Test 3–4 variants first.
  4. Interns will use the filters for urgent asks.
- **Next step:** wireframe the first release from the product design doc, walk the founders through it as users, then hand off to engineering.
