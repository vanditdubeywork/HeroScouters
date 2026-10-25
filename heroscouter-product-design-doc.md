# HeroScouter Talent Engine — Product Design Doc

**The guideline for the wireframing stage · first release · built on PRD v0.2 and the Rightfit design system**

| | |
|---|---|
| **Owner** | Vandit Dubey |
| **Inputs** | `heroscouter-prd.md` (v0.2) · founder review extraction in `heroscouter-discovery.md` · `RIGHTFIT_DESIGN_SYSTEM.md` · `RIGHTFIT_SPACING_GUIDE.md` |
| **Skills applied** | design-handoff (screen specs, states, edge cases, accessibility) · design-system (component mapping, new components) · ux-copy (labels, empty/error copy) · customer-journey-map and user-story-mapping (journeys and flows, carried over from discovery) |
| **Not in this stage** | HTML or code. This doc describes what to wireframe and why. |

---

## 0. How to use this doc

- **Each screen has an ID** (`S-04`), each dialog has one (`D-02`), each flow has one (`F-05`), and each button gets an ID within its screen (`S-04.B3`). Point feedback at an ID.
- **Every element has a "why".** If a wireframer can't find the why for an element, it shouldn't be on the screen.
- **Fidelity:**
  - Grey-scale, low-to-mid fidelity, on the Rightfit shell and components (§4).
  - Use the real copy from this doc and the example data in §16. No lorem ipsum.
- **Priority labels** (from PRD v0.2):
  - **Must** and **Should** are in the first release.
  - **Could** is nice to have.
  - **Later** isn't wireframed, except the one optional concept frame in §13.
- **States are part of the job.** Each screen lists its empty, loading, partial-data, error and out-of-date states. Wireframe them, not just the happy path.

---

## 1. Design principles

Each principle comes from something the founders said. Each one changes what goes on the screen.

| # | Principle | Comes from | What it means in the UI |
|---|---|---|---|
| P1 | **The tool remembers and drafts. People decide.** | "Tool drafts, people send"; manual approve/reject | AI never shortlists, rejects or sends anything by itself. Every AI output has a human confirm step. |
| P2 | **Evidence before score.** | "Best candidate with a dedicated reason" | The reason and evidence come first in every match row. The score is small and secondary. |
| P3 | **Missing doesn't mean no.** | "Half information… assume it is favorable" | Missing data never hides anyone. It shows as an **Assumed** chip and goes onto the ask list. |
| P4 | **Change is normal.** | "Resume and JD are documents that evolve" | Every record is editable and versioned. "Out of date" is an explicit state. Nothing changes silently. |
| P5 | **If we can't automate it, cut the steps.** | Vandit: "If I cannot automate, can I reduce the number of steps?" | Copy buttons, bulk actions and one-click outputs. Sensible defaults, so the common path is one or two clicks. |
| P6 | **One primary action per screen.** | Rightfit: monochrome with one accent action | One black primary or chroma button per view. Everything else is outline or ghost. |
| P7 | **Show what the tool did.** | Update logs; reruns; trust | Elimination counts, what-changed summaries, override trail, activity log. |
| P8 | **Quiet by default.** | Rightfit: 95% monochrome; "nobody uses dashboards" | No charts or metrics pages. Color only carries meaning: status, assumption, out of date, error. |

---

## 2. Users and their moments

| User | Moment | Time pressure | What they need first | Design consequence |
|---|---|---|---|---|
| **Founder-recruiter** (Purvesh) | Right after a candidate call | High (next call soon) | "Which of our other roles fit this person?" | **Find roles** is the primary action on a candidate profile. Results show reasons at a glance. |
| **Founder-recruiter** | A role lands, or a prospect's public JD is found | Medium | The top 5 with reasons, same day | The role page opens on **Matches**. Primary action: **Find matches** / **Rerun matching**. |
| **Founder-recruiter** | Pitching a prospect | Medium | A great-looking masked resume, now | **Masked resume** opens already rendered, and **Download PDF** is the next click. |
| **Client-comms associate** (intern) | A client asks "all your marketing candidates?" | Very high | A filtered list, copied, in under a minute | One-tap category chips, live count, **Copy list** with a masked or full mode. No jargon. |
| **Recruiter / ops** (Vandit) | Data hygiene | Low | What's missing, and what's out of date | A **Needs attention** card, completeness meter, ask list, rerun prompts. |
| **Outreach intern** | A candidate replied and sent a resume | Medium | Add them fast | **New candidate** needs only the resume. Everything else is optional. |

**Devices:**
- **Desktop or laptop is primary** (designed at 1440, works at 1280).
- **Tablet** is usable.
- **Phone** is for lookups only: Candidates list, Copy list, profile summary, and downloading an existing resume.

---

## 3. Information architecture

### 3.1 Objects
| Object | What it is | Key relationships |
|---|---|---|
| **Candidate** | One person in the pool, with a profile built from a resume plus optional call and notes | Has resume versions, outputs and matches |
| **Role** | One opening, from a client JD or a prospect's public posting | Belongs to a company, and has JD versions and matches |
| **Company** | Lightweight label: name, **Client** or **Prospect**, source | Has roles. There's no company page in the first release, to avoid turning this into a CRM. |
| **Match** | A role × candidate pairing from a matching run | Has a band, reason, evidence, chips, and a status (New / Shortlisted / Rejected / Re-qualified) |
| **Resume output** | A generated masked, tailored or as-is resume | Belongs to a candidate, and optionally to a role |
| **Log entry** | Who changed or decided what, and when | Attached to any object |

### 3.2 Navigation (sidebar)
```
HeroScouter ▾                      (workspace header, h-12)
WORK
  ◫ Roles            ← home
  ◎ Candidates
OUTPUTS
  ▤ Resumes
SYSTEM
  ⟲ Activity
  ⚙ Settings         (admin only)
────────────────
[ Needs attention card ]           (hidden when nothing needs attention)
[VD] Vandit Dubey            🔔
```
- **Why only five places:** fewer choices make faster decisions (Hick's law). Every daily job starts from either a role or a candidate.
- **Why Roles is home:** the main output is "the best candidates for a role". There's deliberately **no dashboard**, because the founders warned that dashboards get zero adoption. Hygiene lives in the **Needs attention** card and in list filters.

### 3.3 Screen map
| ID | Screen | Route | Priority |
|---|---|---|---|
| S-01 | App shell (sidebar, top bar, search, Needs attention) | — | Must |
| S-02 | Roles list (home) | `/roles` | Must |
| S-03 | New / edit role | `/roles/new`, `/roles/:id/edit` | Must |
| S-04 | Role page: Matches · Shortlist · Details · History | `/roles/:id` | Must |
| S-05 | Candidates list (pool) | `/candidates` | Must |
| S-06 | New candidate | `/candidates/new` | Must |
| S-07 | Candidate profile: Profile · Matching roles · Resumes · History | `/candidates/:id` | Must |
| S-08 | Candidate preview (side panel) | overlay | Must |
| S-09 | Masked resume builder (single or bulk) | `/resumes/new?type=masked` | Must |
| S-10 | Tailored resume review (tailor or as-is) | `/resumes/new?type=tailored` | Should |
| S-11 | Resumes library | `/resumes` | Should |
| S-12 | Activity log | `/activity` | Should |
| S-13 | Settings: Skill list · Matching · Templates · Team | `/settings` | Should |
| S-14 | Command palette (⌘K) | overlay | Should |
| D-01…D-05 | Dialogs: reject reason, rerun, proposed changes, include anyway, unsaved changes | overlay | Must |

---

## 4. Design system mapping (Rightfit)

### 4.1 Shell and layout
- **App shell:**
  - Locked viewport.
  - **256px sidebar** (collapses to 48px icons).
  - **48px top bar**.
  - Workspace scrolls inside.
- **Content widths:**
  - **Lists** (S-02, S-05, S-11, S-12) use the full workspace width with 16px side padding.
  - **Forms** (S-03 left pane, S-13) are capped at 768px wide.
  - **Editor + preview** screens (S-03, S-06, S-09, S-10) use the **50/50 split-pane** (`lg:grid-cols-2 lg:divide-x`), with 48px pane sub-headers on the muted background.
- **Rhythm** (spacing guide):
  - 24px between sections and cards.
  - 16px inside card wells.
  - 8px from label to input.
  - 16px between fields.
- **Breakpoints:**
  - The sidebar appears at 768px or wider.
  - The split-pane activates at 1024px or wider; below that, panes stack, with the preview behind a "Preview" tab.
  - The profile's right rail appears at 1280px or wider.

### 4.2 Tokens
- **Neutrals:**
  - background (app)
  - card (wells and rows)
  - muted (hover, active tab, chips)
  - border (all 1px lines)
  - foreground / muted-foreground (text)
- **Type:**
  - Inter 590 for page titles (18px app pages).
  - 600 for section headers (14px).
  - 510 for buttons (12px).
  - 400 for body (14px).
  - **Geist Mono, 11px, uppercase, tracked**, for table headers, eyebrow labels, counts and scores (tabular numbers).
- **Radius:**
  - Inputs and menu items: 12px.
  - Inner wells: 16px.
  - Card shells and **all buttons**: 20px.
  - Avatars: 8px squircle, never round.
- **Semantic color, for meaning only.** Always pair it with an icon and a label, never color alone.

| Meaning | Token | Used for |
|---|---|---|
| Passes / shortlisted / done | `success` | Shortlisted status, "No identifiers found" |
| Assumed / out of date / needs attention | `warning` | Assumed chips (dashed), out-of-date banner, completeness below 50% |
| Rejected / eliminated / error / gap | `destructive` | Gap chips (outline), reject button text, errors |
| Predicted skill / AI suggestion | `info` | Predicted-skill chips, AI-extracted field badge |
| Re-qualified after a rerun | `iris` | Re-qualified chip on match rows |

### 4.3 Existing Rightfit components, and where they're used
| Rightfit component | Used for | Screens |
|---|---|---|
| Sidebar group label + menu button (32px, active = border + muted) | Main navigation | S-01 |
| Sidebar promo card ("Claim your handle" pattern) | **Needs attention** card | S-01 |
| Top bar status pill ("25% Complete" pattern) | Context pills: "JD v3", "Out of date", "Profile 62%" | S-04, S-07 |
| Pill tab bar (48px sub-nav) | Role tabs, profile tabs, Settings tabs | S-04, S-07, S-13 |
| Double-bezel section card | Every form group and profile section | S-03, S-06, S-07, S-13 |
| Split-pane editor + live preview | Source ↔ extracted details; controls ↔ document preview | S-03, S-06, S-09, S-10 |
| Input (36px), textarea with counter | All fields; "Our take" note with a character counter | S-03, S-06, S-07, S-09 |
| Command tag combobox | Skills, categories, locations, companies | S-03, S-05, S-07, S-13 |
| Compact select (32px) | Role status, template, band filter | S-02, S-04, S-09 |
| Circle checkbox (16px + hit area) | Row multi-select, masking toggles, must-have flags | S-03, S-05, S-09 |
| Button: primary / outline / ghost icon / **chroma** | Chroma = the one signature action per screen (**Find matches**, **Find roles**, **Save and find matches**) | All |
| Avatar squircle (24/32px initials) | People in rows and headers | S-04, S-05, S-07, S-08 |
| Upload well | Resume drop zone, JD file | S-03, S-06 |
| Empty state (64px icon box + title + one line) | Every empty list | All lists |
| Skeleton pills | Loading chips and rows | S-04, S-05 |
| Mini progress bar (character counter) | Base of the **completeness meter** | S-05, S-07 |
| Mono uppercase table header (job board table) | Headers on every list | S-02, S-05, S-11, S-12 |

### 4.4 New components (extending the system)
All of these use Rightfit tokens, radii and the 4px spacing scale.

**N1 · Data table.** For lists of roles, candidates, resumes and log entries.
- Header: 36px, mono uppercase.
- Rows: 52px, 14px vertical padding.
- Hover: muted.
- Selection: a circle checkbox in the first column.
- Row actions are ghost icons, shown on hover and on keyboard focus.
- Sticky header; sortable columns (▲▼ in the header).
- States: loading (6 skeleton rows), empty (empty state in the table body), error (inline banner above the table).

**N2 · Match row.** The core unit of the product.
```
[#1] [AR] Priya S. · Senior PM, 7 yrs · B2B SaaS          [Strong ▪ 86]   [Preview] [Shortlist] [✕]
     "Led payments roadmap at a Series B fintech; meets all 4 must-haves."
     ✓ 7 yrs  ✓ SF hybrid  ✓ Fintech  ◇ SQL (predicted)  ? Relocation (assumed)  ! Pay +8%
```
- **Line 1:** rank, initials avatar, name, a one-line headline, and the fit band chip with the score (mono, small).
- **Line 2:** the one-line reason (plain language, cites facts).
- **Line 3:** chips: ✓ evidence (neutral), ◇ predicted (info), ? assumed (warning, dashed), ! gap (destructive outline). At most 6, then "+2".
- **Statuses:**
  - **New**
  - **Shortlisted:** green left marker; the Shortlist button becomes "Shortlisted ✓".
  - **Rejected:** collapses to one muted line with the reason and Undo.
  - **Re-qualified:** iris chip "Re-qualified after rerun".
  - **Out of date:** the whole list is dimmed under a banner.
- **Why three lines:** the recruiter recognises a fit without opening anything (recognition over recall), and the reason comes before the score (P2).

**N3 · Side panel (preview).**
- Right side, 480px wide, full height, on a dimmed backdrop.
- Header: name, band, ‹ › to move through the list, "Open profile ↗".
- Sticky footer: **Reject** (outline, red text) · **Shortlist** (primary).
- Esc closes, and focus is trapped while open.
- **Why:** decide without losing your place in the list.

**N4 · Inline banner.** Full width above content, 16px radius, with an icon, one line, and up to two buttons.
- **Variants:** Out of date (warning), Working (info, with progress), Error (destructive), Duplicate found (warning).
- **Why:** state changes need to be noticed, but not by interrupting with modals.

**N5 · Fit band chip.**
- **Strong** (filled), **Good** (outline), **Stretch** (dashed), followed by an optional mono score (0–100, no decimals).
- Tooltip: "Strong: meets all must-haves on evidence."
- **Why bands:** they avoid false precision and anchoring on numbers (see §11). The score stays available for ordering and for anyone curious.

**N6 · Source badge.** A tiny mono label after any field value: `RESUME` · `CALL` · `JD` · `RESEARCH` · `EDITED` · `ASSUMED` · `PREDICTED`.
- Assumed: warning, dashed border.
- Predicted: info.
- **Why:** with AI-filled data, people need to see where each fact came from before they trust it.

**N7 · Completeness meter.**
- A pill ("Profile 62%") with a 64px bar (the counter pattern).
- Color: below 50% warning; 50–79% neutral; 80% or more success.
- Clicking it opens the **Ask on next call** list.
- **Why:** progress toward a visible goal makes people want to finish it (goal-gradient effect).

**N8 · Proposed changes list.**
- Rows: field · old value → new value · source badge · Accept / Reject.
- Header actions: **Apply N changes** · Discard.
- Used for: call enrichment, a revised JD, a new resume version.
- **Why:** documents change (P4), but AI must never silently overwrite a value someone checked (P1).

**N9 · Rerun summary.**
- After a rerun, a strip of 4 counters: **New in top 5 · Moved · Re-qualified · Dropped out**. Each counter filters the list.
- **Why:** shows what changed, and counters the habit of only seeing what you looked at last time (confirmation bias).

**N10 · Document preview frame.**
- A Letter-size page on a muted canvas, with zoom (Fit / 100%) and a page indicator.
- Overlay toggle: **Show what's hidden**, which highlights masked spans.
- An identity check line sits above the page.
- **Why:** you check for leaks on the page itself, not in a settings list.

**N11 · Toast.**
- Bottom-right, 5 seconds, one line plus an optional **Undo**.
- Used for shortlist, reject, saved, copied, and downloads ready.

**N12 · Filter bar.**
- Quick chips for categories, which tap on and off.
- A **More filters** popover holding the double-bezel filter groups.
- A live result count (mono), and **Copy list** on the right.

**N13 · Command palette (⌘K).**
- Searches candidates (name, headline, skills), roles and companies, and runs actions ("New role", "Find roles for Priya").
- **Why:** Purvesh remembers people by name or company ("the PM from the payments startup"). Recall-based search is faster than browsing.

**N14 · Version chip.**
- "JD v3 ▾" or "Resume v2 ▾". The menu lists versions with who and when, and "Compare with current".

**N15 · AI progress stepper.**
- Three named steps with checkmarks: e.g., *Reading resume → Pulling out details → Checking for duplicates*. Shown inside the pane that will receive the result.
- The page stays usable; if the user leaves, a toast says "Profile ready".
- **Why:** naming the steps makes the wait feel shorter, and shows what the AI is doing.

---

## 5. Data on screen

### 5.1 Candidate profile — sections and fields
`H` = hard-filter field (used in stage-1 elimination). Missing H fields → **Assumed** pass.

| Section | Field | Type / control | Source(s) | H |
|---|---|---|---|---|
| **Basics** | Full name · email · phone · LinkedIn URL | Inputs | Resume, Edited | |
| | Current city, state | Combobox (US metros first) | Resume, Call | |
| | Headline (one line) | Input, AI-drafted | Resume (AI) | |
| **Function** | Category (Engineering, Product, Marketing, Design, Data, Sales, Ops…) | Select | AI from resume | H |
| | Sub-category (e.g., Full-stack, Growth marketing) | Select filtered by category | AI from resume | H |
| **Experience** | Total years | Number (computed, editable) | Resume | H |
| | Companies: name · title · start–end · company type/stage | Repeating rows | Resume | |
| | Projects | Repeating rows (title, one line, link) | Resume, Call | |
| **Skills** | Explicit skills | Tag combobox | Resume, Call, Edited | (must-haves) |
| | Predicted skills | Chips with basis; Confirm / Dismiss | AI from skill list | |
| | Tools | Tag combobox | Resume | |
| **Preferences** | Work mode: Remote / Hybrid / Onsite (multi) | Segmented multi | Call, Edited | H |
| | Locations open to | Tag combobox | Call | H |
| | Open to relocate: Yes / No / Specific places | Radio + combobox | Call | H |
| | Company type: startup stage, size, industry | Tag combobox | Call | |
| | Pay expectation (range, USD) | Inputs with suffix | Call | |
| | Availability / notice | Select + days | Call | |
| | Search status: Active / Passive | Segmented | Call | |
| **Work authorization** | Status: US citizen · Green card · Visa | Radio | Call, Resume | H |
| | Visa type: OPT · STEM OPT · H-1B · Other | Select (shown if Visa) | Call | H |
| | Visa expiry | Date (shows "expires in N months") | Call | |
| | Needs sponsorship · Needs transfer | Yes/No toggles | Call | H |
| | Flexibility notes ("can manage on own") | Textarea | Call | |
| **Notes** | Recruiter notes · "Our take" (for masked resumes) | Textarea with counter | Edited | |
| **Meta** | Source (outreach for role X / referral / inbound) · came in for role | Select + role link | Edited | |
| | Resume versions · call transcripts | Version list | — | |

### 5.2 Role — sections and fields
| Section | Field | Control | Source(s) |
|---|---|---|---|
| **Company** | Company name · Client / Prospect · source (Client JD / Public posting URL) | Combobox, segmented, URL input | Edited |
| **Basics** | Title · category · sub-category · seniority | Input, selects | JD (AI) |
| **Must-haves** (eliminate) | Minimum years | Number | JD |
| | Location + work mode · relocation accepted | Combobox, segmented, toggle | JD, Call |
| | Sponsorship offered · transfer supported | Toggles (default: unknown) | JD, Call |
| | Must-have skills | Tag combobox with a **Must** toggle per tag | JD, Call |
| **Nice-to-haves** | Skills | Tag combobox | JD |
| **Pay** | Range | Inputs | JD, Call |
| **Context** | What good looks like · past good/bad hires | Textarea | Client call |
| | Hiring team / founder research | Textarea + links | Research |
| | Interview process | Textarea | JD, Call |
| **Meta** | Status: Open / On hold / Closed · JD versions | Select, version chip | — |

**Live pass count** (S-03): as must-haves are edited, the pane footer shows "~96 of 412 candidates pass these must-haves". **Why:** shows what a filter will do before it's committed. Stage 1 is instant, so this is cheap.

### 5.3 Completeness score
- **Weights 🔶:** hard-filter fields 60%, preferences 25%, everything else 15%. Assumed values count as missing.
- **Ask on next call:** one plain question per missing field, ordered hard-filter first.
  - "Are you open to relocating? Where to?"
  - "Are you on a visa? Which one, and when does it expire?"
  - "Would you need sponsorship or a transfer?"
  - "Remote, hybrid or onsite?"
  - "What pay range are you looking for?"
  - "How soon could you start?"
  - **Copy questions** puts them on the clipboard for the call.

---

## 6. Matching — what the recruiter sees

### 6.1 The funnel line (top of the Matches tab)
```
Pool 412  →  96 pass must-haves  →  Top 5 ranked          See 316 eliminated
```
**Why:** it shows elimination happened and invites a check. That reduces blind trust in the top 5 (automation bias) and builds trust in the tool.

### 6.2 Fit bands
| Band | Rule (shown in tooltip) |
|---|---|
| **Strong** | Meets every must-have on evidence. High skill overlap. No assumed hard-filter fields. |
| **Good** | Meets must-haves, but with at most one predicted skill or one minor gap (e.g., pay slightly above range). |
| **Stretch** | Passes only because a hard-filter value is assumed, or relies on several predicted skills. |

- **Ordering:** by rank. At equal fit, explicit evidence ranks above predicted skills.
- **Contact recency never affects rank.** "Last contacted" only appears in the preview.

### 6.3 Chips (always icon + text)
| Chip | Meaning | Example |
|---|---|---|
| ✓ Evidence | A must-have or key skill met on record | "✓ 7 yrs", "✓ SF hybrid" |
| ◇ Predicted | A skill not listed but predicted from adjacent skills, with its basis on hover | "◇ LinkedIn Ads · from Meta + Google Ads" |
| ? Assumed | A hard-filter field is missing, so it was treated as a pass | "? Relocation" → **Add to ask list** |
| ! Gap | A soft mismatch worth knowing | "! Pay +8% over range" |

### 6.4 Eliminated view
- Grouped by rule, with counts. A candidate can appear under several rules, so the counts add up to more than the total.
  - "Location: 180"
  - "Minimum years: 92"
  - "Work authorization: 40"
  - "Sub-category: 64"
- Each row shows the failing rule(s) and an **Include anyway** button (opens D-04, and the override is logged).
- **Near misses first:** candidates failing only one rule are listed at the top. **Why:** that's where good people are hidden.

### 6.5 Change and reruns
- **Triggers (the role or candidate shows "Out of date"):**
  - A role's must-haves or skills change.
  - A new JD version is applied.
  - A candidate's skills, preferences or work authorization change.
  - A new resume version is applied.
- **No automatic reruns** (token cost). The banner explains what changed. **Rerun matching** opens D-02, which shows how many candidates will be re-ranked.
- **After the rerun:** the N9 summary appears.
  - Shortlist and reject decisions **persist**.
  - A rejected candidate who now ranks in the top 5 gets **Re-qualified** and appears with their old reject reason.
- **Force rerun** (in the ⋯ menu) is available even when nothing changed.

---

## 7. Flows

Each flow lists: goal · who · trigger · steps (screen → action → what happens) · decision points · edge cases · bias and UX notes · done when.

### F-01 · Add a client role and get matches
- **Goal:** the best candidates for a new client role, with reasons, on the same day.
- **Who:** founder-recruiter.
- **Trigger:** a client sends a JD, with or without an intake call.
- **Steps:**
  1. **S-02** → **New role**.
  2. **S-03:** Company "Northwind Pay" → **Client**. Paste the JD. Optionally attach the client intake call link and add research notes on the hiring team.
  3. **Extract role details** → stepper → the right pane fills in.
     - Category and sub-category are suggested (info badge).
     - Must-haves are pre-flagged.
  4. The recruiter confirms the must-haves (a **Must** toggle on each skill). The live pass count updates: "~96 of 412 pass".
  5. **Save and find matches** (chroma) → **S-04 · Matches**.
     - A working banner shows "Ranking 96 candidates…".
     - The top 5 appear.
  6. Continue with **F-05**.
- **Decision points and edge cases:**
  - **Scanned PDF, no text** → error banner, with **Paste JD text** in its place.
  - **The extraction missed a must-have** → add it in the tag combobox and flag it as Must.
  - **Pass count is 0:**
    - The hint names the strictest rule: "0 pass. Location removes the most (180)."
    - A link opens that rule.
- **Bias and UX:**
  - Must-haves are set **before** the run, so the recruiter commits to criteria up front.
  - The live count shows what each filter will do.
  - AI suggestions carry an info badge until confirmed.
- **Done when:** the role is saved with must-haves, and the top 5 are on screen.

### F-02 · Add a prospect role from a public posting, or with no JD
- **Goal:** pitch a prospect with masked resumes, fast. This is the burning problem.
- **Trigger:**
  - We found a startup with a role that's been open for a while, or
  - we have a strong candidate and a target company with no JD.
- **Steps:**
  1. **New role** → Company → **Prospect**.
  2. Enter the JD one of three ways:
     - **Public posting URL** (fetching the text is 🔵 a technical detail)
     - Paste the text
     - **No JD — describe the role** (title, category, three lines)
  3. **Extract** → **Save and find matches**.
  4. Shortlist 2–3 candidates (**F-05**).
  5. **S-04 · Shortlist** → **Generate masked resumes** → **S-09** in bulk mode → **Download all**.
  6. **Copy email text** → send by hand.
- **Guardrail:** on Prospect roles, **masked is the only output** offered in the Shortlist tab ("Prepare resumes for client" is hidden). **Why:** a safe default prevents sending identities to a prospect by mistake.
- **Starting from a candidate instead:** use **F-09** with no role.
- **Done when:** masked PDFs are downloaded and the email text is copied.

### F-03 · Add a candidate from a resume
- **Who:** recruiter or outreach intern.
- **Trigger:** a candidate replied to outreach and shared a resume.
- **Steps:**
  1. **New candidate** (top bar or **S-05**).
  2. **S-06:** drop the resume. This is the only required input.
     - Optional: **Came in for role** (select), call link, notes.
  3. **Create profile** → stepper: *Reading resume → Pulling out details → Checking for duplicates*.
  4. The right pane shows the draft profile:
     - Every field has a source badge.
     - Missing fields read "Not captured".
     - Completeness meter and ask list are visible.
  5. **Save**, or **Save and find roles** (chroma) → **S-07 · Matching roles**.
- **Edge cases:**
  - **Duplicate found** → banner: "Priya S. may already be in the pool (same email)."
    - **Add as new resume version** → D-03.
    - **Create anyway**.
  - **Unreadable file** → **Paste resume text**.
  - **Resume with no dates** → years marked "Assumed" with a question on the ask list.
- **Done when:** the profile is saved, and its completeness and ask list are visible.

### F-04 · Enrich a profile after the call
- **Trigger:** the 10–15 minute intake or onboarding call has ended.
- **Before the call:**
  - **S-07** → ask list → **Copy questions**.
  - Founder guidance: open with "What are you working on today?", then fill the gaps.
- **Steps:**
  1. **S-07** → **Add call** → paste the Fathom or Granola link, or the transcript.
  2. The AI proposes changes → **D-03** lists them. For example:
     - Relocation: *Not captured* → *Yes — Austin or NYC*
     - Work authorization: *Assumed* → *H-1B, transfer needed*
  3. **Apply 6 changes** → completeness rises (62% → 88%) with a brief bar animation.
  4. **If key fields changed:** stage 1 rechecks the open roles instantly (no AI). For example: "This profile now passes must-haves for 2 more roles."
     - **Rank them** ranks only this candidate for those roles.
- **Bias and UX:**
  - Confirmed values are never overwritten without approval (P1).
  - The completeness meter rewards finishing the profile.
  - The ask list means nobody has to remember what's missing.
- **Done when:** the changes are applied and logged.

### F-05 · Review matches → shortlist or reject
- **Steps:**
  1. **S-04 · Matches:** scan rows (reason first, then chips).
  2. **Preview** (Space) → **S-08** side panel.
  3. **Shortlist** (S), or **Reject** (X) → **D-01** reason.
  4. Move to the next candidate (J/K). A toast offers **Undo**.
  5. Not enough? **Show next 5**.
  6. Worried the filters hid someone? **See eliminated** → near misses first → **Include anyway** (D-04).
- **Bias and UX:**
  - Evidence before score (automation bias).
  - Five at a time (choice overload).
  - Undo, plus a viewable rejected list (loss aversion makes people hesitate on irreversible actions).
  - The reject reason adds light, useful friction and trains the matching later.
- **Done when:** 2–5 are shortlisted, and every rejection has a reason.

### F-06 · Pitch a candidate to more roles
- **Trigger:** after the call, "you'd also fit these 2–3 roles".
- **Steps:**
  1. **S-07** → **Find roles** (chroma) → **Matching roles** tab. Client and prospect roles show the same row anatomy.
  2. Select 2–3 roles.
     - **Add to shortlists** puts the candidate on each role's shortlist.
     - **Copy message for candidate** copies a short, personal note listing the roles. Prospect companies are shown by descriptor ("a Series B fintech in SF").
  3. Paste it into email or LinkedIn yourself.
- **Why copy instead of send:** the founders want candidates to feel a person is working for them, and automated sends would break that. Copying keeps the human touch at one step (P5).
- **Done when:** the candidate is on the roles' shortlists and the message is copied.

### F-07 · Urgent list: "all our marketing candidates"
- **Who:** client-comms associate (or anyone).
- **Target:** under a minute.
- **Steps:**
  1. **S-05** → tap the **Marketing** chip.
  2. Optionally narrow by sub-category (Growth), location (NYC) or work authorization. The live count updates: "38 candidates".
  3. **Copy list ▾** → **Masked** (default) or **Full** → toast "Copied 38 candidates".
  4. Paste into email or Slack.
  5. Optionally select 5 → **Generate masked resumes**.
- **Masked copy format:**
  - One line per person: `Growth Marketing Manager · 6 yrs · B2B SaaS · NYC (hybrid) · US citizen · Meta + Google Ads, lifecycle`.
  - No names, no IDs.
- **Bias and UX:**
  - One-tap chips (recognition, not typing).
  - The live count gives instant feedback.
  - Masked is the default, so the safe option is the easy one.

### F-08 · A JD or profile changes → rerun
- **A. The client revises the JD:**
  1. **S-04** → **Edit role** → **Paste revised JD**.
  2. **D-03** shows the proposed changes. For example:
     - Must-have added: SQL
     - Minimum years: 5 → 6
  3. **Apply** → the role is now on **JD v3**.
  4. The Matches tab shows the **Out of date** banner: "Must-haves changed since the last run: added SQL, minimum years 5 → 6. 96 candidates will be re-ranked." → **Rerun matching** → **D-02**.
  5. **N9** summary: New 2 · Moved 3 · **Re-qualified 1** · Dropped 2.
  6. Look at the re-qualified candidates first.
- **B. A candidate's key fields change:** handled in **F-04** step 4. Only this candidate is checked against open roles (cheap), and only roles where they newly pass are flagged with "1 new candidate may fit". Full-role reruns stay manual.
- **Edge cases:**
  - **Edits happen while someone is reviewing** → the banner appears, and the list never refreshes underneath them.
  - **Must-haves are relaxed** → more candidates pass, so the rerun count is larger. That's shown in D-02 before confirming.
- **Why manual reruns:** they cost tokens, and an unexpected reshuffle of a list someone is reviewing breaks trust.

### F-09 · Masked resume: one, many, or with no role
- **One:**
  1. **S-07** → **Masked resume**.
  2. **S-09** opens **already rendered**:
     - Template A
     - Target role: the role they came in for, or none
     - Identity check ✓
  3. **Download PDF**.
- **Changes before downloading (optional):**
  - Pick a target role.
  - Edit "Why we recommend".
  - Switch a company between Describe and Show.
  - Choose another template.
- **Many:** **S-04 · Shortlist** → **Generate masked resumes** → S-09 in bulk mode (a tab per candidate, each with its own identity check) → **Download all**.
- **No role:** Target: **No specific role** → a general "Why we recommend" based on their strengths.
- **Guardrails:**
  - Assumed facts are never printed.
  - Predicted skills are never printed as skills.
  - If the identity check finds anything, **Download PDF** turns into **Review 2 possible identifiers** first. "Download anyway" is available but needs an explicit second click.

### F-10 · Tailored resume, or send as-is (client roles)
- **Steps:**
  1. **S-04 · Shortlist** (Client role) → **Prepare resumes for client**.
  2. **S-10** goes one candidate at a time, with a choice of **Tailor to role** or **Send as-is**.
     - A hint shows when the original already fits strongly: "This resume already matches the role well. Sending as-is is fine."
  3. **Tailor** → a side-by-side comparison. Each change has a source badge and a revert option.
  4. **Approve and download**.
- **Guardrail:** a change can only exist if it's traceable to the resume or a call. There's no free-form invention.

### F-11 · Copy email text
- **From:** S-04 Shortlist or S-09.
- **Steps:**
  1. **Copy email text** opens a small editable preview, with two variants: **Prospect pitch** and **Client shortlist**.
  2. **Copy** → toast.
- **Content:**
  - Descriptive one-liners, one per candidate.
  - No IDs.
  - A clear reply line: "Reply and we'll set up intros this week."

---

## 8. Screen specs

Button types: **Chroma** (the signature action, at most one per screen) · **Primary** (black) · **Outline** · **Ghost** (icon or text) · **Destructive** (outline, red text).

### S-01 · App shell
- **Purpose:** navigation, global capture and search, plus a quiet place for things that need attention.
- **Layout:**
  - Sidebar (256px), as in §3.2.
  - Top bar (48px): breadcrumb and context pill on the left; **Search ⌘K** and **New ▾** on the right.
- **Needs attention card** (sidebar footer, promo-card pattern):
  - Content: "2 roles have out-of-date matches · 9 profiles are missing must-have info".
  - **Hidden when there's nothing to show (P8).**

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | Sidebar items (Roles, Candidates, Resumes, Activity, Settings) | Menu button | Navigate | Five places keeps choices small |
| B2 | **Review** (Needs attention card) | Outline, full width | Opens S-02 filtered to "Needs attention" | Data hygiene without a dashboard |
| B3 | **Search ⌘K** | Outline, with key hint | Opens S-14 | People are remembered by name or company |
| B4 | **New ▾** → New role / New candidate | Outline with menu | S-03 / S-06 | Capture is the most frequent action, so it's reachable from anywhere |
| B5 | Avatar menu | Ghost | Profile, sign out | Standard |

- **Responsive:**
  - Below 768px, the sidebar becomes a sheet behind a menu button.
  - **New ▾** collapses to a "+" icon.

### S-02 · Roles list (home)
- **Purpose:** see every role, spot what needs action, and open one.
- **Layout:**
  - Header: "Roles" (title), with "14 open" in mono under it.
  - **New role** on the right.
  - Status tabs: Open · On hold · Closed · All.
  - Filter bar: **Client / Prospect** chips, category select, search in list.
  - Then the table.
- **Table columns:**
  - Role: title, then company · Client/Prospect tag on the second line
  - Category · sub-category
  - Must-haves summary ("6+ yrs · SF hybrid · no sponsorship")
  - Shortlist ("3 shortlisted")
  - Matches status: **Up to date** / **Out of date** (warning) / **Not run** (muted)
  - Updated (relative)
  - Row actions
- **Default sort:** needs action first (out of date, not run), then most recently updated. **Why:** the next thing to do sits at the top (salience).

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | **New role** | Primary | → S-03 | The one primary action on this page |
| B2 | Row click | — | → S-04 (Matches tab) | Work starts with matches |
| B3 | **Rerun** (only on out-of-date rows) | Ghost text | → D-02 | Fix from the list without opening the role |
| B4 | **Find matches** (only on not-run rows) | Ghost text | Runs matching → S-04 | Same |
| B5 | ⋯ → Edit role · Put on hold · Close role · Duplicate role | Ghost icon menu | Respective | "Duplicate" helps with similar roles across clients |
| B6 | Status tabs / chips / category / search | Tabs, chips | Filter | Fast narrowing |

- **States:**
  - **Empty:** "No roles yet. Add a JD to start matching your candidate pool." → **New role**.
  - **Loading:** 6 skeleton rows.
  - **Filtered empty:** "No prospect roles in Marketing." → **Clear filters**.
  - **Error:** banner "Couldn't load roles. Check your connection and try again." → **Try again**.

### S-03 · New / edit role (split pane)
- **Purpose:** turn any JD into a structured role, with must-haves the recruiter has deliberately chosen.
- **Left pane — "Source":** 48px sub-header, then double-bezel cards.
  1. **Company**
     - Company combobox (create inline).
     - **Client / Prospect** segmented control.
  2. **Job description** (required)
     - Tabs: Paste text · Upload file · Public posting URL · No JD (describe the role).
  3. **Optional context**
     - Client intake call (Fathom/Granola link or paste)
     - Research on the hiring team or founders (textarea + links)
- **Right pane — "Role details":** empty state until extraction ("Paste a JD and extract to see role details here."), then grouped fields from §5.2, each with a source badge. The **Must-haves** card sits first, under the title.
- **Sticky footer:** the live pass count "~96 of 412 candidates pass these must-haves", then **Save role** and **Save and find matches**.

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | **Extract role details** | Primary (left pane) | Runs AI extraction (N15 stepper) | An explicit trigger means control and cost awareness. Disabled until a JD exists. |
| B2 | **Re-extract** | Ghost | Re-runs on edited JD text | The JD keeps changing |
| B3 | **Save role** | Outline | Saves → S-04 Details | For roles not ready to match |
| B4 | **Save and find matches** | **Chroma** | Saves, runs matching → S-04 Matches | The common path in one click (P5) |
| B5 | **Must** toggle on each skill tag | Chip toggle | Moves a skill between must-have and nice-to-have | Elimination depends on this one judgment, so it's made explicit |
| B6 | **Cancel** | Ghost | Leaves (D-05 if there are unsaved edits) | Safety |
| B7 | (Edit mode) **Paste revised JD** | Outline | → D-03 proposed changes | Documents evolve (P4) |

- **States:**
  - **Extracting:** stepper in the right pane.
  - **Partial:** fields not found show "Not captured" in warning, and the Save buttons stay enabled.
  - **Failed:** "We couldn't read this file. Paste the JD text instead."
  - **Edit mode:** an inline note above the must-haves: "Changing must-haves marks this role's matches out of date."
- **Bias and UX:**
  - The AI-suggested category stays visibly "suggested" until confirmed (automation bias).
  - The live pass count shows what each filter will do before committing.
- **Responsive:** below 1024px the panes stack (Source, then Role details), and the footer stays sticky.

### S-04 · Role page
- **Header:**
  - Title, then company and the **Client/Prospect** tag.
  - Status select (Open / On hold / Closed).
  - Version chip "JD v3 ▾".
  - **Edit role** (outline).
  - The context pill in the top bar reads "Out of date" when the matches are stale.
- **Tabs:** **Matches** (default) · **Shortlist (3)** · **Details** · **History**.

**Matches tab:**
1. Out-of-date banner (N4), when it applies.
2. Funnel line (§6.1).
3. Toolbar: View **Top 5 / All ranked** · band filter · **Hide decided** toggle.
4. Match rows (N2).
5. **Show next 5**.
6. Eliminated view (§6.4), from **See eliminated**.

**Shortlist tab:**
- The ordered list of shortlisted candidates. Drag to reorder: the order carries into the email and downloads.
- Each candidate shows their output status: Masked ✓ / Tailored — / As-is —.
- **Bulk actions:**
  - **Generate masked resumes** (always)
  - **Prepare resumes for client** (Client roles only)
  - **Copy email text**
  - **Download all**

**Details tab:** read view of every role field, the JD text, context (calls, research), and version history with **Compare**.

**History tab:** the log for this role (edits, runs, decisions, overrides, outputs).

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | **Find matches** (never run) | **Chroma** | Runs matching | The main output of the product |
| B2 | **Rerun matching** (out of date) | Primary, in the banner | → D-02 | Deliberate and visible (cost, trust) |
| B3 | ⋯ → **Force rerun** | Menu item | → D-02 | Rerun even without changes |
| B4 | **Preview** (row) / Space | Outline | → S-08 | Decide without leaving the list |
| B5 | **Shortlist** (row) / S | Outline → "Shortlisted ✓" | Status → Shortlisted; toast with Undo | Fast, reversible |
| B6 | **✕ Reject** (row) / X | Ghost icon | → D-01 | Reason required; reversible |
| B7 | **Show next 5** | Ghost | Loads 5 more | Avoids an overwhelming list |
| B8 | **See eliminated** | Text link | Opens the eliminated view | Counters blind trust in the filters |
| B9 | **Include anyway** | Ghost | → D-04 | No filter is final (P3) |
| B10 | **Add to ask list** (on an Assumed chip) | Chip action | Adds the question to the candidate's ask list | Turns uncertainty into a next step |
| B11 | **Generate masked resumes** | Primary (Shortlist tab, prospect roles) | → S-09 bulk | A 3–5 person pitch in one action |
| B12 | **Prepare resumes for client** | Primary (Shortlist tab, client roles) | → S-10 | The client path |
| B13 | **Copy email text** | Outline | → F-11 preview | Manual email with one paste |
| B14 | **Download all** | Outline | Downloads the latest outputs as one ZIP | Fewer steps |
| B15 | **Edit role** | Outline | → S-03 in edit mode | Documents evolve |
| B16 | Status select / version chip | Select / chip | Change status; view or compare versions | Lifecycle and history |

- **States:**
  - **Never run:** empty state "Matching hasn't run for this role yet. Find the best candidates in your pool." → **Find matches** (chroma).
  - **Running:** banner "Ranking 96 candidates…" with skeleton rows. The rest of the app stays usable.
  - **No one passes:** "No candidates pass all must-haves. 23 fail only on location." → **See them** · **Edit must-haves**.
  - **Fewer than 5 pass:** show them all, with "Only 3 candidates pass the must-haves."
  - **Out of date:** banner, and rows dimmed to 60%. Actions still work, but any decision made shows "decided on an out-of-date run" in History.
  - **Error:** "Matching didn't finish. Nothing was changed." → **Try again**.
- **Keyboard:** J/K move · Space preview · S shortlist · X reject · U undo · E see eliminated.
- **Bias notes:**
  - Bands, not big numbers.
  - The reason line is first.
  - Contact recency is hidden from rows.
  - Re-qualified candidates are badged and filterable.
  - Brand names never appear in the reason unless they relate to a must-have (halo effect).

### S-05 · Candidates list (pool)
- **Purpose:** find anyone fast, and answer urgent asks.
- **Header:**
  - "Candidates" (title), with "412 in pool" in mono under it.
  - **New candidate** (primary).
- **Filter bar (N12):**
  - **Category chips:** Engineering · Product · Marketing · Design · Data · Sales · Ops. Tapping one reveals its sub-category chips.
  - **More filters** popover:
    - Location / metro
    - Open to relocate
    - Work mode
    - Work authorization (citizen / green card / visa type)
    - Needs sponsorship
    - Years range
    - Search status
    - Completeness
  - Live count, then **Copy list ▾** and **Export CSV** *(Could)* on the right.
- **Table columns:**
  - Name + headline
  - Category · sub-category
  - Years
  - Location · work mode
  - Work authorization (short form, e.g., "H-1B · transfer")
  - Completeness (meter)
  - Updated
  - Row actions
- **Multi-select** turns the bar into a bulk bar: "5 selected" · **Generate masked resumes** · **Copy list** · **Clear**.

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | **New candidate** | Primary | → S-06 | Capture |
| B2 | Category chips | Toggle chips | Filter instantly | Urgent asks start with a function |
| B3 | **More filters** | Outline | Opens the filter popover | Advanced filters out of the way |
| B4 | **Copy list ▾** (Masked · Full) | Outline split | Copies the visible rows in the chosen format | The 1-minute urgent ask (F-07); masked is the safe default |
| B5 | Row click / Space | — | → S-07 / S-08 | Full view or a quick look |
| B6 | Row: **Find roles** | Ghost | → S-07 Matching roles | Pitch more roles |
| B7 | Row: **Masked resume** | Ghost | → S-09 | One click to an output |
| B8 | Bulk: **Generate masked resumes** | Primary (bulk bar) | → S-09 bulk | Fewer steps |

- **States:**
  - **Empty pool:** "No candidates yet. Add a resume to build your pool." → **New candidate**.
  - **No results:** "No candidates match these filters. Fewest matches come from: Location (NYC)." → **Clear filters**.
  - **Loading:** skeleton rows.
- **Responsive:**
  - On phone, rows become two-line cards, filters open in a sheet, and **Copy list** stays visible. Phone is for urgent asks on the go.

### S-06 · New candidate (resume-first)
- **Left pane — "Source":**
  1. **Resume** (required): upload well (PDF/DOCX), or **Paste resume text**.
  2. **Optional:**
     - Came in for role (select)
     - Source (Outreach / Referral / Inbound)
     - Call link or transcript
     - Notes
- **Right pane — "Profile":**
  - Before extraction: empty state "Add a resume to build the profile."
  - After extraction: the draft profile in §5.1 sections, with source badges, "Not captured" fields, the completeness meter and the ask list.
- **Duplicate banner** above the right pane, when one is found.
- **Footer:** **Save** · **Save and find roles**.

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | Upload well / **Paste resume text** | Upload / ghost | Adds the resume | The only required input. The founders warned that long forms drive good candidates away. |
| B2 | **Create profile** | Primary (left) | Runs extraction (stepper) | Explicit trigger |
| B3 | **Add as new resume version** (duplicate banner) | Outline | → D-03 on the existing profile | One person, one record |
| B4 | **Create anyway** | Ghost | Creates a separate profile | For two different people with similar details |
| B5 | **Save** | Outline | → S-07 | — |
| B6 | **Save and find roles** | **Chroma** | → S-07 Matching roles | The common next step after a call |

- **States:** extracting, partial, failed ("We couldn't read this file. Paste the resume text instead."), very long resume (fine, no limit), image-only PDF (treated as failed).

### S-07 · Candidate profile
- **Header:**
  - Initials avatar, name, headline, location, a work-authorization chip, and the **completeness meter**.
  - Actions: **Find roles** (chroma), **Masked resume** (outline), ⋯ (Upload new resume · Add call · Edit all · Delete candidate).
- **Tabs:** **Profile** · **Matching roles** · **Resumes** · **History**.

**Profile tab** (two columns at 1280px or wider):
- **Main column:** double-bezel sections from §5.1, in view mode, each with a pencil **Edit** to edit inline. Key fields show source badges.
- **Skills section:**
  - **Explicit** skills (neutral chips).
  - **Predicted** skills (info chips, with the basis on hover). Each has **Confirm**, which makes it explicit, or **Dismiss**.
- **Work authorization:** shows visa expiry as "expires in 4 months", with a warning when it's under 6 months 🔶.
- **Right rail:**
  1. **Ask on next call** card: the questions, plus **Copy questions**.
  2. **May fit more roles** card, when key fields changed (F-04 step 4): **Rank them**.
  3. **Sources** card: resume versions, call transcripts, last edited by.

**Matching roles tab:**
- Same row anatomy as N2, but each row is a role, including **prospect** roles (tagged).
- Row actions: **Add to shortlist** · **Not a fit** (with reason).
- Bulk: **Add to shortlists** · **Copy message for candidate**.

**Resumes tab:** original resume versions, plus generated outputs (type, role, template, who, when). Actions: Download · Regenerate (marked "Profile changed since" when stale).

**History tab:** the log.

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | **Find roles** | **Chroma** | Runs candidate → roles → Matching roles tab | The moment right after a call |
| B2 | **Masked resume** | Outline | → S-09, already rendered | One click to the hook for prospects |
| B3 | **Edit** (per section) | Ghost icon | Inline edit; Save / Cancel | Documents evolve; small edits stay small |
| B4 | **Upload new resume** | Menu | New version → D-03 | Versions, not overwrites |
| B5 | **Add call** | Menu / Sources card | Paste link or transcript → D-03 | Enrichment (F-04) |
| B6 | **Copy questions** | Outline (Ask card) | Copies the ask list | Prepares the call without retyping |
| B7 | Predicted skill **Confirm / Dismiss** | Chip actions | Make it explicit / remove it | Builds a better profile from the call |
| B8 | **Rank them** | Primary (May fit card) | Ranks this candidate for the newly passing roles | Cheap, targeted rerun |
| B9 | **Add to shortlists** / **Copy message for candidate** | Primary / outline (bulk) | F-06 | Pitch 2–3 more roles personally |
| B10 | **Delete candidate** | Destructive (menu) | Confirmation dialog: "Delete Priya S. and 3 generated resumes? This can't be undone." → **Delete candidate** / **Keep candidate** | Safety; the consequences are named |

- **States:**
  - **New profile:** completeness is low, and the ask list is prominent.
  - **Out-of-date matches:** a banner on the Matching roles tab.
  - **No matching roles:** "No open roles fit yet. We'll flag new roles that fit when they're added."
- **Bias notes:**
  - The completeness meter (goal gradient).
  - The ask list (recognition over recall).
  - Assumed chips stay visible until confirmed.

### S-08 · Candidate preview (side panel)
- **Opens from:** a match row, a list row, or Space.
- **Header:** name, headline, band chip (when opened from a role), ‹ › to step through the list, **Open profile ↗**.
- **Body:**
  1. **Why they fit:** the reason and evidence chips.
  2. **Gaps and assumptions:** with **Add to ask list**.
  3. **Key facts grid:** years · location and mode · work authorization · pay · availability · search status.
  4. **Experience:** the top 3 roles, with company descriptors and real names.
  5. **Skills:** explicit and predicted.
  6. **Last contacted** (small, at the bottom; not used for ranking).
- **Footer:** **Reject** (destructive) · **Shortlist** (primary).
- **Keyboard:** J/K or ‹ ›, S, X, Esc. Focus stays inside the panel and returns to the row on close.
- **Why:** quick, confident decisions without page changes. The first thing shown is evidence.

### S-09 · Masked resume builder (single and bulk)
- **Left pane — "Settings":**
  1. **Target:** a role, **No specific role**, or a **public posting URL**.
  2. **Template:** A Compact · B Achievement-led · C Role-fit. The default is set in Settings.
  3. **What's hidden:**
     - Name → descriptive alias (on by default)
     - Contact details (always hidden)
     - Employers: Describe / Show, per company
     - Schools: Hide / Show
     - Location: metro only
  4. **Why we recommend:** three AI-drafted bullets, editable.
  5. **Our take** (optional, 280 characters): the recruiter's own line.
- **Right pane — "Preview":**
  - N10 frame, with **Show what's hidden**.
  - Identity check line above it:
    - "✓ No identifiers found", or
    - "2 possible identifiers: 'Stripe' in achievement 2, project 'Atlas'" → **Describe it** / **Keep**.
  - A note when facts are left out: "Not shown: relocation (assumed), SQL (predicted)."
- **Bulk mode:** a tab strip of candidates above the preview, each with ✓ or ⚠.
- **Footer:**
  - **Copy email text** · **Download PDF**
  - In bulk mode: **Download all**

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | **Download PDF** | Primary | Downloads; saved to Resumes | The one click after opening (with defaults already applied) |
| B2 | **Download all** (bulk) | Primary | Downloads every PDF as a ZIP | A pitch with several people in one action |
| B3 | **Review N possible identifiers** (replaces B1 when needed) | Primary | Scrolls to each flagged item | Prevents leaks before they happen |
| B4 | **Download anyway** | Ghost (shown after B3) | Downloads with the warning acknowledged; logged | The person stays in control |
| B5 | **Show what's hidden** | Toggle | Highlights masked spans | Check for leaks on the page itself |
| B6 | Template select | Select | Re-renders | Template experiments (3–4 variants) |
| B7 | **Copy email text** | Outline | → F-11 preview | Manual email with one paste |
| B8 | **Regenerate bullets** | Ghost | Re-drafts "Why we recommend" | When the target role changes |

- **States:**
  - **Rendering:** the page skeleton shows within 1 second, and the full render takes under 1 minute.
  - **Failed:** "The PDF didn't generate. Your settings are kept." → **Try again**.
  - **Thin profile:** "Only 2 achievements found. The page will be shorter." The page stays clean, with no empty blocks.

### S-10 · Tailored resume review (client roles)
- **Top:** segmented **Tailor to role** / **Send as-is**, plus the hint when the original is already strong.
- **Tailor view:**
  - Original on the left, tailored version on the right (split pane).
  - Change highlights, each with a source badge (RESUME / CALL).
  - A changes summary: "7 changes: summary rewritten, 3 bullets reordered, 2 bullets reworded, 1 skill surfaced from the call".
  - **Revert** on each change.
- **Footer:**
  - **Approve and download PDF** (primary) · **Download DOCX** (outline)
  - In multi-candidate mode: **Next candidate**

| ID | Element | Type | Action | Why |
|---|---|---|---|---|
| B1 | Tailor / As-is | Segmented | Switches mode | Strong resumes aren't over-edited (founders) |
| B2 | **Revert** (per change) | Ghost | Restores the original text | The person decides |
| B3 | **Approve and download PDF** | Primary | Downloads; saved to Resumes | Explicit approval, so there's no blind trust |
| B4 | **Download DOCX** | Outline | Editable copy | Clients sometimes ask for Word |

- **Guardrail:** there is no free-text "improve" button. Every change must cite a source.

### S-11 · Resumes library
- **Purpose:** find what was generated and sent, and reuse it. At 400–500 a month, this matters.
- **Table columns:**
  - Candidate
  - Type (Masked / Tailored / As-is)
  - Role, or "No role"
  - Template
  - Created by
  - Created
  - **Stale** chip, if the profile changed since
- **Row actions:** Download · Copy email text · Regenerate.
- **Filters:** type, role, created by.
- **Empty state:** "No resumes generated yet. Open a candidate and choose Masked resume."

### S-12 · Activity log
- **Purpose:** trust and memory, e.g., "why was Marcus rejected for this role?".
- **Each entry:** who · what · which record · when, with a link. Expand to see before/after values.
- **Filters:** Roles · Candidates · Decisions · Reruns · Outputs · Overrides; person.
- **Empty state:** "Nothing here yet. Changes and decisions will show up as the team works."

### S-13 · Settings (admin)
- **Tabs:**
  1. **Skill list:** category → sub-category → skills, with an **adjacency editor** ("Meta Ads + Google Ads predict LinkedIn Ads", with a strength of High/Medium).
     - **Why:** this is what lets the tool keep adjacent-skill candidates in the running.
  2. **Matching:**
     - Which fields are hard filters
     - Default top N (5)
     - Show score next to band (on/off)
     - Out-of-date triggers (view only)
  3. **Templates:**
     - Masked templates A/B/C, and the default
     - Tailored template
     - A preview of each
  4. **Team:** members, with Admin or Member access (🔵 PRD Q6).
- **Buttons:** Save changes (sticky footer, as on the Rightfit job-preferences page) · Add skill · Add adjacency · Invite member.

### S-14 · Command palette (⌘K)
- **Layout:**
  - Search input.
  - Grouped results: **Candidates** · **Roles** · **Actions** ("New role", "Find roles for Priya S.", "Masked resume for Priya S.").
- **Behavior:** arrow keys move, Enter opens, Esc closes.
- **Why:** search by memory is the fastest path for the founder-recruiter.

### Dialogs
| ID | Title (copy) | Body | Buttons | Why |
|---|---|---|---|---|
| D-01 | **Reject Priya S. for Senior PM?** | Reason (radio, keys 1–7): Skills · Seniority · Location · Work authorization · Pay · Not interested · Other (text). "You can undo this from the role's rejected list." | **Reject** (destructive) · **Cancel** | Light friction, a useful reason, and reassurance that it's reversible |
| D-02 | **Rerun matching for Senior PM — Northwind Pay?** | "96 candidates will be re-ranked. Shortlisted and rejected decisions stay." | **Rerun matching** (primary) · **Not now** | Cost and impact are visible before acting |
| D-03 | **Review 6 proposed changes** | N8 list. Each change can be accepted or rejected. | **Apply 6 changes** (primary, count updates live) · **Discard** | AI never overwrites without approval |
| D-04 | **Include Marcus L. anyway?** | "Fails: Location (NYC onsite). They'll be ranked with everyone else." Optional note. | **Include in ranking** · **Cancel** | Overrides are allowed, explained and logged |
| D-05 | **Leave without saving?** | "Your changes to this role will be lost." | **Leave** · **Keep editing** | Safety, with action-named buttons |

---

## 9. Masked resume — template spec

**Job:** win a prospect's attention and a reply. The founders asked for "interesting, not a static template". It's generated from profile data in one click.

### 9.1 Page structure (Letter size; one page is the target, two at most)
1. **Header band:**
   - HeroScouter mark.
   - **Descriptive alias** as the title, e.g., "Senior Product Manager · 7 yrs · B2B SaaS & fintech".
   - Pills: **availability** · **work authorization** ("US citizen" / "H-1B · transfer needed") · **metro + work mode**.
2. **Why we recommend:** three bullets, written for the target role when there is one.
3. **Our take** (optional): one line from the recruiter, in quotes, with their first name. This is the human touch and the trust signal.
4. **Impact highlights:** 3–4 achievements with numbers.
5. **Skills:** explicit skills only, grouped Core / Tools.
6. **Experience:** a timeline of titles and durations, with **company descriptors** ("Series B US fintech, ~200 people") in place of names, unless set to Show.
7. **Education:** degree and field. The school is hidden by default.
8. **Footer:** "Interested? Reply to {recruiter} at {email}", plus "Profile: {alias}". No IDs.

### 9.2 Masking rules
| Item | Default | Why |
|---|---|---|
| Name, email, phone, LinkedIn, photo | Hidden | Identity |
| Current and past employers | **Describe** (toggle per company to Show) | Recognisable employers plus titles identify people. Some brands help, so the recruiter decides. |
| School | Hidden (toggle) | Small schools identify people |
| Exact location | Metro only | Identity |
| Project and product names in achievements | Flagged by the identity check | Unique names identify people |
| Assumed facts | Never printed | Avoids misleading a client |
| Predicted skills | Never printed as skills | Only what's evidenced is promised |

### 9.3 Template variants (for the experiments)
- **A · Compact one-pager:** header, why, skills, short timeline.
- **B · Achievement-led:** opens with big impact numbers.
- **C · Role-fit:** a "Fit for {role}" block mapping must-haves to evidence. Only available with a target role.

Whichever variant wins the Claude + Sheet experiments becomes the default in Settings.

### 9.4 Tailored resume (not masked)
- Keeps the person's identity.
- Re-orders and rewords **existing** content toward the role.
- Every change has a source.
- Original formatting conventions are kept.

---

## 10. Cross-cutting behavior

- **AI work in progress:**
  - Use the N15 stepper inside the pane that will receive the result.
  - Never block navigation. A toast says when it finishes ("Profile ready · Open").
  - Name the steps. Never show a bare spinner for anything over 2 seconds.
- **Speed expectations:**
  - Filters and stage-1 elimination feel instant (under 1 second).
  - Ranking and extraction can take seconds and show progress.
  - A masked PDF is ready in under a minute.
- **Undo and reversibility:**
  - Shortlist and reject have Undo in the toast (5 seconds) and can be reversed from the list at any time.
  - Deletes need a named confirmation.
- **Errors:** always say what happened, whether anything was lost, and what to do next.
  - "Matching didn't finish. Nothing was changed. Try again."
  - "We couldn't read this file. Paste the text instead."
- **Empty states:** what this is · why it's empty · how to start (the copy is in each screen spec).
- **Keyboard shortcuts:**
  - Global: ⌘K search · N new (menu)
  - Lists: J/K move · Space preview · S shortlist · X reject · U undo
  - Dialogs: Enter confirm, Esc cancel
  - Shown in the ⌘K palette under "Shortcuts".
- **Accessibility:**
  - Focus order: top bar → tabs → toolbar → list. Every interactive element has a visible focus ring (Rightfit `ring` style).
  - Tabs use `role="tablist"`. The side panel and dialogs use `role="dialog"` with focus trap and return.
  - Tables use real table semantics, with sortable headers announced.
  - Live regions announce "Ranking finished: 5 candidates" and "Copied 38 candidates".
  - Color is never the only signal: every chip has an icon and text.
  - Hit areas are at least 32px (checkboxes use Rightfit's invisible hit-area expansion).
- **Responsive:**
  - Desktop first.
  - Split-panes stack below 1024px.
  - The sidebar becomes a sheet below 768px.
  - On phone: Candidates list + filters + Copy list, profile summary, and downloading existing resumes.
- **Permissions:** Members can't open Settings or delete. Everything else is shared (🔵 confirm in PRD Q6).

---

## 11. Cognitive biases, and how the design counters them

| Bias / effect | Where it would show up | Design response | Screens |
|---|---|---|---|
| **Automation bias** (over-trusting AI) | Accepting the top 5 without thinking | Reason and evidence first · eliminated count visible · human confirm on every AI output · **Include anyway** | S-04, S-08, D-03 |
| **Anchoring / false precision** | An "86.4%" score drives the decision | Bands first; whole-number score small and secondary; sort by rank | N2, N5 |
| **Confirmation bias** | After the first review, new information is ignored | Rerun summary highlights **New** and **Re-qualified**; "decided on an out-of-date run" note | S-04, N9 |
| **Status quo / sunk cost** | A rejected candidate stays rejected even after the JD changes | **Re-qualified** badge with the old reason shown | S-04 |
| **Treating absence as a no** | Missing data treated as failing | Missing = **Assumed** pass, visibly; ask list | §6, S-07 |
| **Halo effect** | Big-brand employers outweigh fit | Reasons cite must-haves; masked resumes use descriptors; brand names in rows stay secondary | N2, S-09 |
| **Recency / availability bias** | Recently contacted candidates feel like better fits | Ranking ignores recency; "last contacted" only appears in the preview | §6.2, S-08 |
| **Choice overload (Hick's law)** | Long ranked lists cause paralysis | Top 5 default; batches of 5; three bands; five nav items | S-01, S-04 |
| **Recognition over recall** | Remembering what's missing or who fits | Ask list, chips in rows, preview panel, ⌘K by name | S-07, S-08, S-14 |
| **Goal gradient / unfinished-task pull** | Profiles left half-done | Completeness meter that visibly moves; "62% → 88%" after a call | N7, F-04 |
| **Form fatigue** (the founders' warning) | Long forms drive good candidates away | Resume-first; no candidate-facing form; only missing questions, asked on the call | S-06, S-07 |
| **Default effect** | People keep defaults | Safe defaults: masked hides by default, Prospect roles only offer masked output, reruns are manual, Copy list defaults to Masked | S-04, S-05, S-09 |
| **Loss aversion** | Hesitating to reject | Rejection is reversible (Undo, rejected list), with a reason for light friction | D-01 |
| **Serial position effect** | Order inside a pitch email | Recruiter-controlled order (drag) carries into the email and downloads | S-04 Shortlist |
| **Peak-end rule** (for prospects) | How the PDF is remembered | Opens with "Why we recommend", ends with a clear reply line | §9 |
| **Authority / trust cue** (for prospects) | "Is this agency credible?" | "Our take" from a named recruiter, plus HeroScouter branding | §9 |
| **Ignoring cost** | Tokens spent on reruns | Rerun count shown before confirming; no automatic reruns | D-02 |

---

## 12. UX copy guide

**Glossary** (use these words everywhere):
- **Role**: never "job" or "requisition".
- **Candidate**.
- **Pool**: all candidates.
- **Match**.
- **Must-haves**: never "hard filters" in the UI.
- **Shortlist** (verb and noun).
- **Reject**.
- **Rerun matching**.
- **Out of date**.
- **Assumed**: "missing, treated as a pass".
- **Predicted skill**.
- **Masked resume**.
- **Tailored resume**.
- **Send as-is**.
- **Ask list**: the UI label is "Ask on next call".

**Never in the UI:** vector, embedding, similarity score, AI score, candidate ID, pipeline stage, submit (use the specific verb), confidence % (Later).

**Buttons** are verb-first and say exactly what happens:
- **Roles and candidates:** New role · New candidate · Extract role details · Create profile · Save and find matches · Save and find roles · Find roles · Edit role
- **Matching:** Find matches · Rerun matching · Show next 5 · See eliminated · Include in ranking · Shortlist · Reject · Undo · Add to ask list · Copy questions
- **Outputs:** Masked resume · Download PDF · Download all · Copy email text · Copy list · Prepare resumes for client · Approve and download PDF
- **Changes:** Apply 6 changes · Discard · Rank them

**Status names:**
- **Roles:** Open · On hold · Closed
- **Matches:** Up to date · Out of date · Not run
- **Match rows:** New · Shortlisted · Rejected · Re-qualified
- **Outputs:** Ready · Stale

**Tone:**
- Plain, short and calm.
- Errors say what happened and what to do, with no apologies.
- Toasts are past tense: "Shortlisted Priya S." · "Copied 38 candidates" · "Masked resume downloaded".

**Localization:** English only for now. Leave 30% room for longer strings in buttons and chips anyway.

---

## 13. Later — don't wireframe now

These are captured so the first release leaves room for them.
- **Client preview page** (the founders liked it, for later):
  - A page per client with masked profiles and attributes, and a "HeroScouter confidence" rating.
  - **Approve / Pass** per candidate.
  - A **Copy message** button ("Hey HeroScouter, we're interested in these profiles…").
  - A unique link per client, with click and feedback tracking.
  - No robotic IDs.
  - *Optional:* one concept frame to show direction, clearly labelled **Later**.
- **Call-prep side widget:** questions to ask, plus points for pitching the role (P2/P3; a Claude project for now).
- **Stage tracking, outcomes, close-the-loop reminder, going-cold list.**
- **Candidate-facing insights** and engagement features.
- **Scheduled reruns within a budget**, and duplicate merge.

---

## 14. Open design questions
1. **Score display:** bands only, or bands with a small score? Test both in wireframes with Purvesh (PRD Q4).
2. **Needs attention:** is the sidebar card enough, or does the Roles page also need a strip? Start with the card plus "Needs action first" sorting.
3. **Shortlist:** keep it as a tab inside the role, or add a cross-role "Pitches" view? Start with the tab.
4. **Company page:** confirm there isn't one in the first release (company stays a label).
5. **Resumes library:** first release or Next? It's Should, and useful at 400–500 a month.
6. **Phone scope:** confirm lookups only.
7. **Edit model:** inline edit per section, or one "Edit all" form? Start with per-section edits.
8. **Public posting URL:** fetch the text automatically, or ask for it pasted? This is a technical constraint for engineering.

---

## 15. Wireframe checklist (deliverables for the next stage)
**Frames:**
- [ ] S-01 shell: expanded, collapsed, phone sheet · Needs attention card shown and hidden
- [ ] S-02: default · empty · loading · out-of-date rows
- [ ] S-03: empty source · extracting · extracted (with live pass count) · failed · edit mode with revised JD → D-03
- [ ] S-04 Matches: never run · running · top 5 · out of date (banner + dim) · after rerun (N9) · no one passes · eliminated view
- [ ] S-04 Shortlist: prospect role (masked only) and client role · Details · History
- [ ] S-05: default · category chip active · More filters open · bulk selection · Copy list menu · no results · phone
- [ ] S-06: empty · extracting · extracted · duplicate banner · failed
- [ ] S-07: Profile (low and high completeness, assumed chips, predicted skills) · Matching roles · Resumes · History
- [ ] S-08 preview: from role (with band) and from list
- [ ] S-09: single (clean) · identifiers found · bulk tabs · no role · thin profile
- [ ] S-10: tailor with changes · send as-is
- [ ] S-11 · S-12 · S-13 (four tabs) · S-14
- [ ] D-01 to D-05

**Clickable walkthroughs** for the founder review (stitch these flows):
- [ ] **F-01** client role → matches → **F-05** review
- [ ] **F-07** urgent list in under a minute
- [ ] **F-02** + **F-09** prospect role → masked resumes → copy email
- [ ] **F-04** call enrichment → **F-06** pitch more roles
- [ ] **F-08** revised JD → rerun → re-qualified

---

## 16. Example data for wireframes
*Fictional, marked "Example" on frames.*

**Roles:**
- **Senior Product Manager · Northwind Pay** (Client)
  - Fintech · San Francisco, hybrid
  - Must-haves: 6+ yrs, payments
  - No sponsorship
  - JD v3: SQL added
- **Full-stack Engineer · Lumen AI** (Prospect, from a public posting)
  - Remote US · 4+ yrs · React + Node
  - Sponsorship available
- **Growth Marketing Manager · Brightdesk** (Client)
  - B2B SaaS · NYC onsite · 5+ yrs
  - Must-have: LinkedIn Ads

**Candidates:**
- **Priya S.**
  - Senior PM, 7 yrs, B2B SaaS + payments, SF
  - H-1B, transfer needed
  - Relocation: not captured (shows as Assumed)
- **Marcus L.**
  - Growth marketer, 6 yrs Meta + Google Ads, NYC
  - US citizen
  - **The predicted-skill case:** LinkedIn Ads predicted from Meta + Google Ads
- **Ana R.**
  - Full-stack, 5 yrs React/Node, Austin
  - STEM OPT, expires in 5 months, needs sponsorship
- **Dev K.**
  - Full-stack, 3 yrs: fails minimum years, so appears as a near miss in the eliminated view
- **Sara M.**
  - PM, 8 yrs, ex-big tech, NYC
  - The halo-effect test: strong brand, missing payments experience

**Pool size:** 412 candidates, 14 open roles. Volume context: about 400–500 masked resumes a month.
