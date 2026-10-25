# HeroScouter — Product Discovery Notes

Running record of every stage, used as the source for the final PRD and HTML.
Source: Oct 17, 2026 meeting (Purvesh Naik × Vandit Dubey).
Legend: 🔶 Assumption (plausible, unvalidated) · 🔵 Open question (needs an answer)

---

## Stage 1 — Frame the problem

### Decisions locked
- **v1 is internal-first.** The HeroScouter team is the only user of the tool. Candidates and clients never log in; they receive outputs (tailored resume, masked profile, shortlist email, prep notes) through personal channels.
- **Anchor HMW (option 3):** How might we make every candidate in our pool a live asset — matched, warm and pitchable to new clients — as we aim to grow placements without growing headcount?
- **Volume doesn't drive the framing.** Data is "managed randomly" today; the build approach (sheet + AI vs custom app) is the developer's call.

### Problem Framing Canvas (skill: problem-framing-canvas)

**Look Inward — symptoms**
- When a new role arrives, Purvesh can't see which existing candidates fit; the pool lives in his head.
- When a new candidate arrives, there's no quick way to see which open roles — ours or in the market — fit them.
- Candidates go cold: someone not placed in month 1 is hard to re-engage in month 4.
- Resume tailoring, masking and interview prep are done by hand each time. 🔶

**Why it isn't solved**
- New: the agency is early; pool is small. 🔶
- Lack of resources: one developer, a generalist product lead.
- Hard: many variables per candidate (experience, active/passive, stack, location, comp).

**How we're part of it**
- Two products in two heads: a client-facing wireframe vs. internal tooling. Resolved → internal-first.
- Solution-first: the conversation jumped to agents, query builders, referral and community before agreeing on the core outcome.
- It's a data problem before it's a software problem: candidate knowledge isn't captured consistently.
- Assumed scale: worry about per-candidate queries assumed high volume.

**Look Outward — who experiences it**

| Who | When | Consequence |
|---|---|---|
| Purvesh (founder-recruiter) | New role arrives; candidate intake ends | Re-sourcing from scratch; forgotten fits = missed placement fees |
| Future recruiters | Same triggers, without Purvesh's memory | Business can't scale past one head |
| Candidates (indirect) | Weeks after intake, especially after a failed interview | Silence → feel like a "random service" → go cold or take another agency's offer |
| Clients and prospects (indirect) | Waiting for a shortlist, or never pitched | Slower shortlists; prospects never see their ideal candidate |

- **Triggers:** role in · candidate in · interview scheduled / result back · candidate idle N days.
- **Who else has it:** every small agency; real-estate brokers (same match + bypass risk). They cope with recruiting CRMs (Recruit CRM, Loxo, Manatal, Bullhorn), sheets + memory, LinkedIn Recruiter projects, Boolean/X-ray search (RecruitEm).
- **Who doesn't:** bigger agencies (structured data + sourcers), very niche agencies (small, memorable pools), self-serve marketplaces (Wellfound) — a model we've rejected.
- **Left out so far:** future recruiters; not-placed candidates; interviewers being researched; the developer (needs data needs early — analytics, audit logs); referrers.
- **Who benefits from the status quo:** competing agencies that reach cold candidates first; the team, which avoids data-entry discipline (adoption risk).
- **Who benefits when solved:** Purvesh, new recruiters, candidates, clients, and outbound (every candidate becomes a way into new client accounts).

**Reframe**
> HeroScouter's recruiters can't see which candidates fit a role, or which roles fit a candidate, at the moment either one arrives. That's because what we know about each candidate is captured randomly: across Purvesh's memory, Fathom calls, resumes and email, never in one consistent place. The result is slower shortlists, missed placements, candidates going cold between opportunities, and a business that can't grow past its founder. It's been overlooked because our conversations jumped to features before agreeing on what we know about each candidate and how we capture it.

**HMW:** How might we make every candidate in our pool a live asset — matched, warm and pitchable to new clients — as we aim to grow placements without growing headcount?

---

### Problem Statement (skill: problem-statement)

**I am:** Purvesh, founder-recruiter at HeroScouter
- Place tech talent into US companies on commission
- Not from a tech background; unfamiliar US companies and stacks need research
- My candidate pool lives in my memory, Fathom calls, resumes and email
- I personally do sourcing, client pitching, candidate care and interview prep

**Trying to:** put the right candidate in front of the right role the moment either appears, and keep every candidate ready to be placed or pitched.

**But:**
- When a role arrives, I have to remember who fits
- When a candidate arrives, I can't quickly see which roles — ours or in the market — suit them
- Candidates I didn't place go cold before the next fit appears
- Every resume, masked profile and interview prep is hand-made

**Because:** what we learn about each candidate is captured randomly and never in a form that can be searched, matched or reused.

**Which makes me feel:** unsure whether a good fit is sitting unnoticed in my own pool, stretched thin, and dependent on my memory. 🔶 (inferred from the call)

**Context & constraints**
- Tiny team: founder, product lead, one developer
- Human touch is non-negotiable: candidates and clients get emails and messages, not portals
- US clients; recruiter isn't technical, so company and stack context must be supplied
- Prospects see masked profiles until terms are signed; onboarded clients get full, tailored resumes
- Bypass risk (client and candidate going direct) exists but is a later problem
- Existing tools: Fathom (call recording), Google Meet, email, LinkedIn; clients use Calendly

**Final problem statement**
> HeroScouter's recruiters need a way to see — the moment a role or candidate arrives — which candidates and roles fit, and to keep every candidate warm and pitchable, because candidate knowledge is scattered across memory, calls, resumes and email, which today means slow shortlists, forgotten candidates and a business capped at what the founder can remember.

---

### Jobs to Be Done (skill: jobs-to-be-done)

#### Primary — the recruiter-operator

**Functional jobs**
1. Shortlist the best-fit candidates from our pool soon after a new role arrives
2. Find the right roles — ours and open in the market — for a new candidate right after intake
3. Turn a strong candidate into a pitch to new prospect companies
4. Produce a masked profile for prospects and a tailored resume for onboarded clients
5. Prepare a candidate for a specific first-round interviewer
6. Stay in touch with not-yet-placed candidates so they're warm when a fit appears

**Social jobs**
- Be seen by clients as the agency that delivers vetted fits fast
- Be seen by candidates as a person genuinely helping, not a "random service"
- Be credible on US companies and tech despite a non-tech background

**Emotional jobs**
- Feel confident no good candidate in the pool is being missed
- Avoid the scramble of re-warming a cold candidate when a client is waiting
- Feel the business isn't capped by one person's memory

**Pains (ranked by intensity)**
1. **Missed fits** — matching depends on memory; data is scattered (Challenge, Common mistake)
2. **Cold candidates** — no rhythm for staying in touch after a non-placement (Common mistake)
3. **Hand-made outputs** — resume tailoring, masking and interviewer research every time (Costliness)
4. **Unfamiliar US context** — company credibility and stack scarcity need research (Challenge)
5. **Tools store, they don't prompt** — ATS/CRMs hold data but don't say "approach these 3 now" (Unresolved)

**Gains**
- **Expectation:** "System should automatically tell me … these are the three, four, five candidates you should approach right now."
- **Savings:** shortlist time drops from hours or days to minutes 🔶 (no baseline captured)
- **Adoption factors:** near-zero data entry — profiles built from Fathom transcripts and resumes; works through channels we already use, not another dashboard
- **Life improvement:** time goes to clients and closing; new recruiters are productive from day one

**Adoption insight:** the biggest risk is data entry. Capture has to be a by-product of work we already do (calls, resumes), or the tool joins the "zero adoption" pile.

#### Secondary — receive outputs only

| | Candidate | Hiring manager (client or prospect) |
|---|---|---|
| Functional | Get in front of roles that fit without hunting; walk into the first round prepared | Get a small, vetted shortlist fast; book interviews with no friction |
| Social / emotional | Feel someone is in their corner | Look good to their team for a fast, quality hire |
| Fires us when | Silence, irrelevant roles | Volume over quality, slow responses |

---

### Proto-personas (skill: proto-persona)

#### Primary — "Founder-Recruiter Purvesh"
- **Bio:** Founder of HeroScouter; recruits tech talent for US companies; works on trust and relationships; non-tech background, learning US companies and stacks on the job. Lives in calls, email, LinkedIn and Fathom.
- **Quotes (from the Oct 17 call):**
  - "Whenever a new role comes in, I don't know [which of] the existing pool of candidates … are a good fit for that role."
  - "They need to feel that a person is helping them out."
  - "It should not happen that we found a candidate in month one … [and] in month four … he is very cold."
- **Pains:** missed fits, cold candidates, hand-made resumes and prep, unfamiliar US context.
- **Trying to accomplish:** faster shortlists, more placements per candidate, outbound pitches built on real candidates.
- **Goals:** grow placements without growing headcount; build a candidate community and referral engine; personally get sharper on US companies and tech.
- **Decision authority:** yes — founder and budget owner.
- **Influencers:** fellow recruiters and their tools (RecruitEm), communities like GrowthX, client feedback.
- **Beliefs:** dashboards get zero adoption; trust and a personal touch win placements; the system should sharpen his judgment, not replace it.
- **Variant — next recruiter hire:** same jobs, no memory of the pool; the system must carry the context. 🔶

#### Secondary — "Candidate Casey"
- Tech professional in our pool, actively or passively looking. 🔵 Based in India or the US?
- Wants relevant roles, a real person to talk to, and prep before interviews.
- Risk moment: after a failed first round, when silence sets in.

#### Secondary — "Hiring-Manager Harper"
- At an onboarded client (gets full, tailored resumes) or a prospect (sees masked profiles until terms are signed).
- Wants 3–5 vetted fits, a clear reason each fits, and Calendly-simple scheduling.
- After interest: terms and commission agreed, a briefing call recorded on Fathom, then real resumes shared.

---

### Open questions — resolved or assumed
- ✅ **Public open-roles list stays**, with no login. It's a page, not a portal, and it's fed from our role records.
- 🔶 Candidates may be India-remote or US-based. Location and work authorization are profile fields, not a design constraint.
- 🔶 Users in the next 6 months: Purvesh, Vandit, and 1–2 recruiters.
- 🔵 Placement fee and current time-to-shortlist (needed for prioritization).

---

## Stage 2 — Journeys

### Customer journey maps (skill: customer-journey-map)

**Objectives**
- Find the moments where candidates go cold or prospects drop off
- Decide, step by step, what lives in the **Tool**, what runs as **Automation**, and what stays **Manual**
- Show where the operator (Purvesh) works behind each external step

**Legend:**
- **Tool:** the internal system holds the data and drafts the output; a recruiter reviews it.
- **Auto:** a trigger or schedule runs with nobody involved.
- **Manual:** a human does it on purpose, often starting from a Tool draft.

#### Journey 1 — Candidate Casey

| Stage | Casey does | Casey feels | HeroScouter does | Where it lives | KPI |
|---|---|---|---|---|---|
| 1. Discover | Gets our LinkedIn outreach, a referral, or finds a role on the public jobs page | "Another agency that'll ghost me?" | Outreach; public jobs page | Manual outreach · Tool publishes jobs page from role records | New candidates per week; % from referrals |
| 2. Intake | Shares resume, has intro call | Hopeful, testing whether we "get" them | Fathom-recorded intake call; profile built from transcript + resume | Auto: transcript + resume → draft profile · Tool: recruiter reviews | Profile ready within 24h of call |
| 3. Matched | Hears about 2–3 roles that fit; agrees to be submitted | Valued if relevant, annoyed if spammy | Match to our roles (P0); tailored resume; masked profile for prospects; X-ray query for market roles (P1) | Tool: matching, resumes, query builder · Manual: personal message proposing roles | Intake → first match time; % matches candidate accepts |
| 4. Interview | Gets prep notes, does first round | Nervous → confident if prepped | Prep brief from JD + client briefing + interviewer research + past debriefs | Tool: prep brief draft · Auto: reminder before interview · Manual: prep call or message | First-round pass rate |
| 5. Outcome | Gets offer or rejection | Elated, or deflated — silence is what loses them | Close the loop within 48h; log reasons | Manual: call · Tool: outcome + reasons feed future matching and prep | Loop closed ≤48h; % outcomes with reasons |
| 6. Stay warm | Hears from us; re-matched to new roles; refers peers | Remembered vs. forgotten | Warm-touch rhythm; re-match on new roles; referral ask | Auto: idle reminders, "new role matches you" alerts · Manual: personal note · Tool: referral tracking (later) | % pool touched in last 30 days; re-engagement rate; referrals per month |

**Moments of truth:** stage 5 (silence after a rejection) and stage 6 (month-4 re-engagement).

#### Journey 2 — Hiring-Manager Harper

**Path A — Prospect (outbound)**

| Stage | Harper does | Harper feels | HeroScouter does | Where it lives | KPI |
|---|---|---|---|---|---|
| A1. Pitched | Gets an email: "N vetted people ready to work for you" with masked profiles | Busy, skeptical of agency spam | Prospect list from a candidate's X-ray query (companies hiring for that profile); masked profiles | Tool: prospect list, masked profiles, email draft · Manual: personalize + send | Reply rate; interest rate |
| A2. Interest + terms | Replies; agrees commission and payment terms | Cautious about cost | Negotiate terms | Manual · Tool: client status prospect → onboarded | Prospect → client conversion |
| A3. Briefing | Briefing call: expectations, past good and bad hires | Hopeful, wants to be understood | Fathom-recorded; role record from transcript; candidate resume improved | Auto: transcript → draft role record · Tool: review + re-run match | Call → role live time |

**Path B — Onboarded client (new role)**

| Stage | Harper does | Harper feels | HeroScouter does | Where it lives | KPI |
|---|---|---|---|---|---|
| B1. Role in | Sends a JD | Wants speed | Role logged → 3–5 candidates suggested (P0) | Auto: match runs on role creation · Tool: recruiter reviews | Time-to-shortlist |
| B2. Shortlist | Gets 3–5 tailored, unmasked resumes with a "why this fit" line | Relieved if quality is high | Send shortlist | Tool: tailored resume + fit rationale · Manual: send | Shortlist → interview rate |
| B3. Interview + hire | Emails candidate (CC us) with Calendly; interviews; makes offer | Focused on the decision | Track stages; collect debriefs | Manual: CC'd email · Tool: pipeline status, debrief log | Interview → offer rate; placements per month |
| B4. Repeat | Sends the next role; refers peers | Trusts us, or doesn't | Ask for next role or referral | Manual · Tool: client history | Repeat roles per client |

**Moments of truth:** A1 (the first pitch email has to beat agency spam) and B2 (shortlist quality decides whether the client comes back).

#### Operator view — Tool vs. Automation vs. Manual

| Tool (holds data, drafts outputs) | Automation (triggers and schedules) | Manual (humans, on purpose) |
|---|---|---|
| Candidate profiles (from resume + Fathom) | Fathom transcript → draft profile or role record | Intake and briefing calls |
| Role records (from JD + briefing) | New role → run match → notify recruiter | Every candidate and client message (sent from drafts) |
| Two-way matching with fit reasons (P0) | New candidate → run match → notify recruiter | Terms and commission |
| Resume generator: masked + tailored | Interview scheduled → prep brief + reminder | Final shortlist judgment |
| X-ray query builder + prospect list (P1) | Candidate idle N days → warm-touch reminder | Close-the-loop calls after outcomes |
| Interview prep brief | Weekly "going cold" list | Community hosting (later) |
| Outcomes, debriefs, pipeline status | | |
| Public open-roles page (from role records) | | |
| Referral tracking (later) | | |

**Principle:** the tool does the remembering and the drafting; humans do the talking.

### Journey insights
1. **Fathom is the backbone.** Intake and briefing calls already happen; turning their transcripts into profiles and role records makes data capture a by-product, which addresses the adoption risk.
2. **One matching engine, three triggers:** role in → candidates, candidate in → roles, candidate → market roles → prospects.
3. **Outcomes close the loop.** Logged debriefs and rejection reasons improve future matches and prep — Purvesh's example of using Sam's interview to prepare Max.
4. **North-star metric:** placements per recruiter per month (matches the HMW: more placements without more headcount). Leading indicators: time-to-shortlist, % of pool touched in 30 days.

### User story map (skill: user-story-mapping)

- **Segment:** small recruiting agency placing tech talent with US companies
- **Persona:** Founder-Recruiter Purvesh, and the next recruiter hire, who has none of his memory
- **Narrative:** Place the right candidate in the right role, and keep every candidate warm and pitchable, without relying on memory.

#### Backbone — activities → steps

| 1. Capture what we know | 2. Find the fit | 3. Get candidates in front of clients | 4. Help candidates win | 5. Keep the pool warm |
|---|---|---|---|---|
| Record intake call · Upload resume · Review draft profile · Log a new role from JD or briefing call | Get matches when a role lands · Get matches when a candidate lands · Search the market for roles that fit a candidate | Prepare resumes · Send shortlist to onboarded client · Pitch prospects with masked profiles · Record submissions | Prepare candidate for interviewer · Track interview stages · Capture debrief and outcome | Spot who's going cold · Reach out personally · Re-match to new roles · Grow the pool through referrals and community |

#### Tasks by release

**MVP — "Never miss a fit"** (P0)
- *Capture:*
  - Fathom transcript + resume → draft profile with stack, years, comp, location and work authorization, active/passive, notice period
  - Recruiter reviews and edits the profile
  - Duplicate check on email and LinkedIn
  - JD or briefing transcript → draft role record
- *Find the fit:*
  - New role → top 3–5 candidates, with a one-line reason each fits
  - New candidate → fitting open roles, with reasons
  - Recruiter is notified, and can accept or dismiss each match (with a reason)
- *Get in front of clients:*
  - Tailored resume per role (onboarded clients)
  - Masked profile (prospects)
  - Log each submission, with the candidate's consent to be put forward for that client
- *Help candidates win:* log interview stage, outcome and reason
- *Keep warm:*
  - "Last contacted" on every profile
  - Weekly going-cold list
- *Under everything:* an event log of profile, match, submission, outcome and contact events. It covers analytics and audit from day one; Purvesh asked for this.

**Release 2 — "Every candidate opens doors"** (P1)
- *Capture:*
  - Candidate owner (who holds the relationship)
  - Client records (prospect → onboarded), terms
- *Find the fit:*
  - Candidate → X-ray search query for market roles
  - Re-match the whole pool when a new role lands
- *Get in front of clients:*
  - Prospect list built from query results
  - Pitch email draft with masked profiles and fit reasons
  - Public jobs page fed from role records
- *Help candidates win:*
  - Prep brief from the JD, client briefing, interviewer's public profile and past debriefs
  - Reminder before the interview
  - Debrief capture
- *Keep warm:*
  - "New role matches you" message drafts
  - Close-the-loop reminder within 48h of an outcome

**Later — "Network effects"** (P2)
- *Find the fit:* learn which matches convert, and tune ranking
- *Get in front of clients:* bypass protection (proxy email such as name@heroscouter.com)
- *Help candidates win:* interviewer playbooks built from past debriefs (Sam → Max)
- *Keep warm:*
  - Referral tracking and rewards
  - Candidate community
  - Placements-per-recruiter dashboard

#### Release goals 🔶 (targets to confirm)

| Release | Goal | How we'll know |
|---|---|---|
| MVP | No fit is missed when a role lands | Shortlist sent the same day the role arrives; 100% of new candidates profiled within 24h of intake; going-cold list reviewed weekly |
| R2 | Candidates generate new clients; candidates arrive prepared | Prospect pitches sent per week from candidate queries; first-round pass rate improves |
| Later | The pool grows itself | Referrals per month; placements per recruiter per month |

#### Gaps found while mapping
- **Consent to submit.** Recording that a candidate agreed to be put forward to a specific client avoids double submissions and disputes. It's industry practice and was missing from the call. Moved into MVP.
- **Duplicates.** The same person may arrive via referral, LinkedIn and the jobs page. Added a duplicate check to MVP.
- **Preferences drive matching, not just the resume.** Comp, notice period and work authorization have to come out of the intake call.
- **Ownership.** Once there's a second recruiter, someone has to own each candidate relationship (R2).
- **The fit reason does double duty.** The same one-liner explains a match to the recruiter and goes into the pitch email.

**Decision:** interview prep waits for Release 2 (confirmed).

---

## Stage 3 — Opportunities and priorities

### Opportunity Solution Tree (skill: opportunity-solution-tree)

**Desired outcome:** more placements per recruiter per month, without adding headcount.
- 🔶 Baseline captured from the MVP event log in its first 30 days.

**Why four opportunities, not three:** a placement only happens when every step works. There has to be a role, a candidate who fits, a candidate who's still available, and a candidate who passes the interview. Each opportunity is one of those steps.

```
                    More placements per recruiter
                               │
   ┌───────────────┬───────────┴───────────┬───────────────────┐
 O1 Good fits     O2 Candidates go     O3 Each candidate     O4 Candidates lose
 sit unnoticed    cold between roles   opens only one door   at the first round
 (match)          (availability)       (demand / roles)      (conversion)
```

| Opportunity | Solution | F | I | MF | Total | Release |
|---|---|---|---|---|---|---|
| **O1 Good fits sit unnoticed** | S1 Fathom + resume → profile; AI match when a role lands, with fit reasons | 3 | 5 | 5 | 13 | MVP |
| | S2 Concierge: recruiter runs a Claude matching prompt over one consolidated sheet | 5 | 3 | 4 | 12 | **POC 1** |
| | S3 Buy an off-the-shelf recruiting CRM with AI matching | 5 | 3 | 2 | 10 | Rejected — another dashboard, no Fathom capture or masking flow |
| **O2 Candidates go cold** | S1 "Last contacted" + weekly going-cold list | 5 | 4 | 5 | 14 | MVP |
| | S2 Automated monthly "roles for you" email | 4 | 2 | 2 | 8 | Rejected — breaks the personal-touch principle |
| | S3 Candidate community with job updates | 3 | 3 | 4 | 10 | Later |
| **O3 Each candidate opens only one door** | S1 X-ray query → prospect list → masked pitch drafts | 3 | 5 | 4 | 12 | R2 |
| | S2 By hand: X-ray search for the top 5 candidates, pitch masked profiles | 5 | 4 | 4 | 13 | **POC 2** |
| | S3 Public jobs page + SEO for inbound | 4 | 2 | 3 | 9 | Parked (SEO track, 3+ months to results) |
| **O4 Candidates lose at the first round** | S1 Prep brief generator | 3 | 4 | 5 | 12 | R2 |
| | S2 Manual prep call from a checklist template | 5 | 3 | 5 | 13 | Do now — no build |
| | S3 Interviewer playbooks from past debriefs | 2 | 4 | 4 | 10 | Later |

Scoring: F = feasibility (5 = days), I = impact on placements, MF = fit with what recruiters, candidates and clients want.

**What the tree says about our cut**
1. **The cut holds.** MVP = O1-S1 + O2-S1; R2 = O3-S1 + O4-S1; nothing in Later beats them.
2. **Manual versions score higher than builds** in three of four branches. They're cheaper and they test the idea first, so we run them now while the developer builds the MVP.
3. **The real risk to the plan:** if HeroScouter has few open roles, MVP matching has little to match against, and O3 (more doors) drives placements more than O1. POC 2 answers this without needing anyone to count roles.

### Selected POCs

**POC 1 — Concierge matching (tests O1, de-risks the MVP)**
- **Hypothesis:** If we turn intake transcripts and resumes into structured profiles and run an AI match when a role lands, Purvesh will rate most of the top 5 as worth approaching, including fits he hadn't thought of — because the pool holds more than memory recalls.
- **Experiment:**
  1. Take recent intake calls' Fathom transcripts and resumes
  2. Have Claude extract profiles into one sheet
  3. For each open role, run a matching prompt
  4. Purvesh rates each of the top 5 as approach or skip
- **Duration:** 2 weeks.
- **Success:** 🔶 3 or more of the top 5 rated "approach" on most roles, and at least one fit he wouldn't have recalled.
- **Also learns:** which profile fields are missing from calls, and how long extraction takes. This feeds the PRD data model.

**POC 2 — Candidate-led outbound (tests O3, decides whether R2 moves up)**
- **Hypothesis:** If we pitch masked profiles of strong candidates to companies already hiring for that profile, some will reply and open a client conversation — because a ready, vetted person beats a cold agency pitch.
- **Experiment:**
  1. Pick the 5 strongest candidates
  2. Run an X-ray search by hand for each, RecruitEm-style
  3. Shortlist about 10 hiring companies per candidate
  4. Send personalized emails with masked profiles
- **Duration:** 2 weeks.
- **Success:** 🔶 reply rate of 5–10% or better, and at least one new client conversation.
- **Decision rule:** if it clearly beats the bar, list building moves into the MVP.

**Do now, no build:** a prep-call checklist template for first rounds (O4-S2).

**Decision:** both POCs approved to run alongside the MVP build.

---

### /prioritize

#### Framework choice (skill: prioritization-advisor)

| Question | Answer from context |
|---|---|
| Product stage | Pre-PMF: a new internal tool |
| Team | Small: founder, product generalist, one developer |
| Decision need | Order the build and force hard cuts for one developer |
| Data | Minimal — data is "managed randomly" today |

- **Chosen:** ICE (Impact × Confidence × Ease, each 1–10) to rank, plus MoSCoW labels to force the MVP cut.
- **Why not RICE:** "Reach" is the same for every item (a handful of internal users), and there's no usage data.
- **Alternative:** a Value/Effort 2×2, if Purvesh wants something visual.
- **Rule:** Confidence is updated when the POCs finish. POC 1 moves the matching scores; POC 2 moves the list-building scores.
- **Pitfall to avoid:** treating scores as gospel. Build order still follows dependencies — profiles before matching.

#### ICE ranking

| # | Item | I | C | E | ICE | MoSCoW / release |
|---|---|---|---|---|---|---|
| 1 | Submission log with candidate consent | 7 | 8 | 9 | 504 | MVP · Must |
| 2 | Interview stage + outcome + reason | 7 | 8 | 9 | 504 | MVP · Must |
| 3 | Role record from JD or briefing transcript | 8 | 8 | 7 | 448 | MVP · Must |
| 4 | Last contacted + weekly going-cold list | 7 | 7 | 9 | 441 | MVP · Should |
| 5 | Event log (analytics + audit) | 6 | 9 | 8 | 432 | MVP · Must |
| 6 | Candidate profile from Fathom + resume (with preferences) | 9 | 7 | 6 | 378 | MVP · Must |
| 7 | **Close-the-loop reminder after an outcome** | 6 | 7 | 9 | 378 | **Moved R2 → MVP · Should** |
| 8 | Accept or dismiss a match, with reason | 6 | 7 | 8 | 336 | MVP · Should |
| 9 | Debrief capture | 6 | 7 | 8 | 336 | R2 (rides on outcome log) |
| 10 | Client records + terms + **source channel** | 5 | 8 | 8 | 320 | R2; source field in MVP |
| 11 | Role → top 3–5 candidates with fit reasons | 10 | 6 | 5 | 300 | MVP · Must (C rises if POC 1 passes) |
| 12 | Candidate → fitting open roles | 7 | 6 | 7 | 294 | MVP · Should (reuses the engine) |
| 13 | Tailored resume per role | 7 | 7 | 6 | 294 | MVP · Should (manual fallback exists) |
| 14 | Masked profile for prospects | 6 | 7 | 7 | 294 | **MVP · Could** (POC 2 does it by hand) |
| 15 | "New role matches you" message drafts | 6 | 6 | 8 | 288 | R2 |
| 16 | Candidate owner | 4 | 8 | 9 | 288 | R2 (matters with the 2nd recruiter) |
| 17 | X-ray query per candidate | 8 | 5 | 7 | 280 | R2 (C rises if POC 2 passes) |
| 18 | Duplicate check | 4 | 8 | 8 | 256 | **MVP · Could** (manual at small scale) |
| 19 | Interview reminder | 4 | 7 | 9 | 252 | R2 |
| 20 | Prospect list + masked pitch drafts | 8 | 5 | 6 | 240 | R2 (C rises if POC 2 passes) |
| 21 | Prep brief generator | 7 | 6 | 5 | 210 | R2 |
| 22 | Public jobs page fed from role records | 4 | 6 | 7 | 168 | R2 (a page exists today) |

**Changes from the story map**
- **Pulled into MVP:** close-the-loop reminder. It's trivial once outcomes are logged, and it protects candidate moment of truth #1.
- **Added to MVP:** a "source" field on each client and role, so channel performance can be measured later.
- **Demoted to Could:** duplicate check and masked profile.
- **Merged:** "re-match the whole pool on each new role" duplicated MVP item 11; folded into "New role matches you" drafts.

**MVP scope**
- **Must:** profile capture, role capture, role → candidates matching, submission + consent log, outcome log, event log
- **Should:** candidate → roles, accept/dismiss, tailored resume, going-cold list, close-the-loop reminder
- **Could:** masked profile, duplicate check
- **Won't this release:** everything in R2 and Later

#### Client-acquisition channels (skill: acquisition-channel-advisor)

The skill's unit-economics checks (CAC, LTV, payback) need channel data we don't have yet, and it warns against judging brand-new channels. So this is a strategic-fit read with decisions to revisit once data exists. For an agency, read CAC as recruiter hours per client won, and LTV as placement fee × repeat roles.

| Channel | Cost | Client quality | Scales? | Decision |
|---|---|---|---|---|
| Founder network and warm intros | Low | High | No — limited by Purvesh's network | **Continue**, no tooling |
| Candidate-led outbound (X-ray → masked pitch) | Medium (recruiter time) | Likely high — hiring now, for a profile we have | Yes — each candidate opens many companies | **Test → scale if POC 2 passes** |
| Referrals from placed candidates and clients | Low | High | Grows with placements | **Later** — needs placements first |
| SEO/AEO + jobs page + free recruiter tools | Time now, tools later | Unknown | Yes, slowly (authority score 2; 3+ months) | **Invest to learn, capped:** 0→1 foundations only, no paid tools yet |

- **Guardrail:** no single channel should bring in more than half of new clients, which is the founder network today. 🔶
- **Product implication:** record the source channel on every client and role from day one, so CAC by channel can be computed once there's enough data.

**Decision:** MVP scope locked (as above).

---

## Stage 4 — Roadmap and probes (/plan-roadmap)

### POC sanity check (skill: pol-probe-advisor)

**POC 1 → Feasibility Check** ("Can AI capture and match well enough?")
- **Problem found:** it tests three things at once (extraction, match quality, finding forgotten fits), and two weeks is long for this probe type. Split it in two:
  - **1a — Extraction sweep (1–2 days).** Run 10 recent intake transcripts and resumes through an extraction prompt. Pass: the profile fields (stack, years, comp, location/work auth, active/passive, notice) are present in 8 or more of 10. Fail: key fields are routinely missing, so intake calls need a short checklist.
  - **1b — Blind match test (3–4 days).** For each open role, show Purvesh 7 names: the AI's top 5 plus 2 random pool candidates, unlabeled. He marks approach or skip. Pass: AI picks are approved clearly more often than random picks, and at least one approved pick is someone he wouldn't have recalled. Fail: random picks score as well as AI picks, meaning matching adds no signal.
- **Disposal:** keep the prompts as spec input for the developer; delete the copies of candidate data after the test.

**POC 2 → real-contact market test, done by hand** (closest flavor: "Will this survive real user contact?")
- **Problem found:** 50 emails can't tell a 5% reply rate from a 10% one. Use absolute thresholds instead.
- **Pass:** 3 or more replies and at least 1 client call from about 50 pitches, with one follow-up at day 4–5.
- **Fail:** 0–1 replies.
- **Learn:** which candidate profiles and subject lines get replies.
- **Keep:** 2 weeks — replies take time. Send from a personal, warmed-up mailbox.

### Epic hypotheses (skill: epic-hypothesis)

| Epic | If we… (for recruiters) | Then… | Tiny test now | Valid if, within 4 weeks of launch |
|---|---|---|---|---|
| **E1 Capture** | turn Fathom transcripts and resumes into draft profiles and role records | every new candidate and role is searchable within 24h, with near-zero typing | POC 1a | ≥90% of new candidates profiled within 24h; under 5 min of edits per profile; Purvesh stops keeping a side sheet |
| **E2 Matching** | suggest the top 3–5 candidates with fit reasons when a role lands (and roles when a candidate lands) | shortlists go out the same day and include fits we'd have missed | POC 1b | Same-day shortlist on ≥80% of new roles; ≥50% of suggestions accepted; ≥1 candidate reaching interview came from a suggestion |
| **E3 Submissions + outcomes** | log every submission with consent and every outcome with a reason, plus a close-the-loop reminder | no candidate waits more than 48h for news, and there are no submission disputes | Keep this log in a sheet during the POCs | 100% of submissions have consent; ≥90% of outcomes closed within 48h |
| **E4 Keep warm** | show "last contacted" and a weekly going-cold list | more of the pool gets touched and cold candidates come back | Vandit builds the list by hand for 2 weeks | 🔶 ≥70% of the pool touched in the last 30 days |
| **E5 Resume outputs** | generate a tailored resume per role (masked later) | a shortlist takes minutes, not an hour per candidate | Generate 5 with a prompt during POC 1 | 4 of 5 are send-ready with light edits |
| **E6 Candidate-led outbound** (R2) | turn each strong candidate into an X-ray query, a prospect list and a pitch draft | each candidate opens new client conversations | POC 2 | ≥3 replies and ≥1 client call per ~50 pitches |
| **E7 Interview prep** (R2) | give each candidate a prep brief tuned to the interviewer | first-round pass rate rises | Prep-call checklist starting now | Candidates call the prep useful; pass rate trends up 🔶 (small sample) |
| **E8 Team-ready ops** (R2) | add candidate owners, client records, and a jobs page fed from role records | a second recruiter is productive in week one | Onboard the next hire on the tool | New recruiter makes a submission in week 1 |

### Matching epic breakdown (skill: epic-breakdown-advisor)

- **INVEST check:** passes, with one flag — it depends on E1 (profiles), which ships first. Estimability is uncertain, and POC 1 acts as the spike (pattern 9).
- **Cynefin:** complex domain (match quality is unknown), so lead with a learning story rather than listing every story up front.
- **Patterns applied:** workflow steps (thin end-to-end slices) + simple/complex.

| # | Story | Size 🔶 | Why in this order |
|---|---|---|---|
| S1 | **On-demand match:** recruiter opens a role, clicks "Find matches", sees the top 5 with one-line reasons | 3–4 days | Learning story: proves value end to end |
| S2 | **Must-have filters:** exclude candidates who fail work authorization, location, comp ceiling, or aren't looking | 2 days | Cuts obvious misses |
| S3 | **Accept or dismiss with reason:** accepted goes to a submission draft | 2 days | Feeds outcomes and future tuning |
| S4 | **Reverse direction:** candidate → fitting open roles (same engine) | 2 days | Cheap once S1 exists |
| S5 | **Auto-match on new role + notify recruiter** | 1–2 days | Only valuable once E1 auto-creates roles from briefing calls |
| S6 | **Auto-match on new candidate + notify** | 1 day | Defer if new candidates are few |

**What the split reveals:** S5 and S6 (notifications) add little while recruiters create records by hand, since they're already looking at the screen. They earn their place once Fathom auto-creates records. Every story is 1–4 days.

### Roadmap (skill: roadmap-planning) — Now / Next / Later with gates

**Dependencies:** E1 → E2 → E5 · E1 → E3 → E4 · E3 → E7 (debriefs need the outcome log) · E2 + POC 2 → E6 · E1 → E8 (jobs page)

**Sizes** 🔶 (developer to validate): E1 M · E2 M · E3 S · E4 S · E5 S · E6 M · E7 M · E8 S–M

| Phase | What happens | Who |
|---|---|---|
| **NOW — weeks 0–2** | POC 1a + 1b, POC 2, prep checklist in use | Purvesh + Vandit (no dev) |
| | E1 Capture + event log (needed whatever the POCs show) | Developer |
| **◆ Gate A (week 2)** | POC 1: confirm or rework the matching approach and profile fields. POC 2: if it passes, E6 moves into NOW | Purvesh + Vandit |
| **NOW — after Gate A** | E2 Matching (S1–S4) → E3 Submissions + outcomes → E4 Keep warm → E5 Tailored resume → **MVP live** | Developer |
| **◆ Gate B (MVP + 4 weeks)** | Check epic validation measures; record the north-star baseline (placements per recruiter per month) | All |
| **NEXT** | E6 Candidate-led outbound (or earlier, via Gate A) · E7 Interview prep · E8 Team-ready ops · S5/S6 notifications · masked profile · duplicate check | Developer |
| **LATER** | Referrals · community · interviewer playbooks · placements dashboard · bypass protection · ranking that learns from outcomes | — |

**Not on this roadmap, and why**
- **SEO/AEO and free recruiter tools:** a separate growth track with a time cap.
- **Daily US-company digest:** a scheduled prompt, not product; it can be set up any time.
- **Candidate or client portals:** rejected — v1 is internal-first.
- **Automated candidate emails:** rejected — breaks the personal-touch principle.

### Parking lot — separate tracks, outside this PRD
- Daily 15-min US-company / hiring-landscape digest for the team (scheduled prompt; "not a part of the product")
- SEO / AEO foundations (sitemap, pages, CMS) → content writer or intern → tools later
- Free recruiter tools as growth funnels (e.g. X-ray search builder, like RecruitEm)
- Bypass protection (proxy email such as name@heroscouter.com, notetaker on calls)

---

## Founder review — final discussion (source of truth)

Founders are broadly aligned. **Where this section conflicts with earlier stages, this section wins.** Source: the founder review call (`Final Product Discussion.txt`).

### 1. Problem, as agreed
- Everything is manual. We have the data but can't use it. There are no systems, and everything sits with Purvesh.
- Knowledge is scattered across email. The process is slow, it doesn't scale, and candidate retention suffers.
- The first discussion over-optimized for future problems. Remove the noise and automate only what matters now.

### 2. What the tool must produce
- **Main output:** the best candidates for a role, each with a dedicated reason.
- Tailored resumes that hiring managers can review straight away.
- **Candidate side:** what matters is how much value candidates feel HeroScouter gives them.
  - Many relevant open roles
  - Useful insights
  - Steady one-on-one contact with an agency working to place them

### 3. How candidates really enter (corrects our earlier assumption)
- **The funnel starts with a role, through outbound outreach:**
  1. A role opens.
  2. Purvesh builds a list of 50–60 right people for that role, using AI tools that analyze LinkedIn.
  3. An outreach email pitches that specific role.
  4. The candidate replies with questions, or asks for a call.
  5. A 10–15 minute call with a set of questions.
  6. Purvesh asks for the resume and sends it to the client.
  7. He checks the resume against 2–3 other open roles and pitches those too.
  8. Interviews start.
- **Candidates are already vetted. List quality is the lever.** If the top 10–20 of a 100-person list respond, one gets selected. Purvesh and a helper keep improving search quality.
- **Outreach sequences** must leave each candidate feeling "you have my personal attention; I'm your recruiting agent". → **Ops, not the tool.**
- **Call depth depends on the candidate:** an outstanding candidate is worth a 15–20 minute call, and a less likely one gets less time.

### 4. Inputs
- **Mandatory:** resume (candidate) and JD (role).
- **Optional:**
  - Candidate intake call
  - Client intake call (captures what the client wants and how they feel)
  - Extra research on the hiring team or founders
- **Resumes and JDs change over time.** Any field must be easy to update at any time.
- **Call source:** Fathom (an MCP is available) or Granola. The technical choice comes later.

### 5. Candidate profile — data we need (US context)
- **Experience:** years of experience, companies worked at, projects, and skills mapped to a common list
- **Location preferences:** where they want to work, and openness to relocate
- **Work mode:** remote, hybrid or onsite
- **Company preferences:** startup or not, and what kind of company
- **Work authorization:**
  - US citizen or on a visa
  - Visa type (OPT, STEM OPT, H-1B, others)
  - Visa expiry
  - Needs sponsorship (yes/no)
  - Needs a visa transfer (yes/no)
  - How strict the visa situation is, and whether they can manage it on their own
- **Partial data is normal.** Missing information is **assumed favorable**, so it never eliminates anyone.
- **Collecting the data:**
  - Long forms drive good candidates away, so there is no big candidate form.
  - We keep an internal profile page that we edit ourselves.
  - We ask only the missing questions on the onboarding call.
  - The call transcript updates the profile.
  - A **profile completeness score** shows how far along each profile is, so we can help raise it.
- **Onboarding calls** start with "what are you doing today?", not a walk through the resume.

### 6. Matching logic
- **Stage 1 — elimination (no AI, instant):**
  - Minimum years
  - Location and relocation
  - Role category (e.g., engineering)
  - Sub-category (e.g., full-stack)
- **Stage 2 — judgment:** AI plus similarity search (vector database) on the candidates who remain.
- **Adjacent skills:**
  - Don't drop people over a skill they don't literally list. Meta and Google Ads experience predicts LinkedIn Ads.
  - Build a skill list per function.
  - Tag skills that are **"missing but predictable"** and give each a predictability score.
  - Explicit matches rank first. This case comes up in almost every role.
- **Ranking and review:**
  - Top 5 per role, with a percentage or rank.
  - Recruiters approve or reject by hand.
  - A good candidate preview makes that manual review quick.
- **Both directions:** role → candidates, and candidate → roles.
- **Most basic use case:** a client-comms intern needs "a list of all our marketing candidates" right now.
- **Reruns:**
  - Run again when a JD or a candidate's skills change, since previously rejected candidates may now qualify.
  - Keep update logs.
  - Reruns only happen on a trigger event or when forced, and are otherwise off, because they cost tokens.

### 7. Outputs
- **Tailored resume:**
  - Prompt-driven. The template is still to be decided.
  - For current clients, usually enrich the resume. A strong resume goes as-is.
- **Masked resume — the burning problem: turning prospects into clients.**
  - It must be interesting, not a static template.
  - It's generated on the fly from database fields into a template, in one click, as a PDF download. This works like the role pages on heroscouter.com.
  - Volume: a baseline of **400–500 masked resumes a month**.
  - Masked profiles are often sent **without a client JD**. When we pitch from public postings that have been open for a while, the JD is public.
  - Several templates (3–4) will be tested to see which works.
- **Later: a preview link instead of a PDF.**
  - Clients approve or reject candidates on the page.
  - Shows a "HeroScouter confidence" rating and candidate attributes.
  - Tracks clicks and feedback, with a unique link per client.
  - A copy button produces a message like "Hey HeroScouter, we're interested in these profiles…".
  - No robotic candidate IDs.

### 8. Deprioritized or out
- **Call-prep side widget** (questions to ask, points to pitch the role): P2/P3. For now, use a Claude project with a base prompt that takes the resume and JD.
- **Client communication speed and channel:** later, "maybe in a month or so". The client side stays unstructured and manual, over email.
- **Stage tracking and outcomes:** the end-to-end journey is too variable to predict right now. The close-the-loop reminder is "discussed later".
- **List building with Google Programmable Search:** a separate project, kept out of this one.
- **After masking, the system stops.** Meetings and client follow-ups stay manual for now.

### 9. Working agreements and next steps
- **The Claude + Google Sheet workflow moves up the priority list,** so experiments aren't blocked by the build:
  - Masking and tailoring
  - Testing 3–4 template variants
  - Matching quality

  What we learn feeds the product.
- **Next:** wireframes, so the founders can react by using the product. Then hand-off to engineering.
- **Engineering help** is available for harder pieces, such as Gmail integration.
- **An intern team** running an outreach campaign will support Vandit's routines. A client-comms intern is a likely user.
- **Operations:** keep a sheet of Fathom recordings, with a link for each.
- **Presentation feedback:** good. Don't over-invest in visual polish.
