# Gasetta — design brief (v2)

> A redesign brief for **claude.ai/design**. This replaces an earlier
> newspaper-style brief (now archived as `design-v1-newspaper.md`). The
> editorial model is the same; the visual model is different.

---

## 1. Product

**Gasetta** is a continuously-updated, AI-summarized view of activity in
[`neo-project`](https://github.com/orgs/neo-project/repositories), the
GitHub organization behind the [Neo blockchain](https://neo.org). Once every
few hours, a bot scans the org and an LLM turns the raw firehose — commits,
releases, issues, pull requests, discussions — into short summaries with the
**consensus** of each conversation, who's arguing for what, and a marker
whenever one of Neo's two founders (Erik Zhang, Da Hongfei) participated.

**The mission, in one line** — if you want to know what's going on with Neo's
development and community on GitHub without ever opening GitHub, you should
find all of it on Gasetta in 30 seconds of scanning.

**Audience** — the **broad Neo community**: investors, ecosystem builders,
observers, journalists, governance participants. People who care about Neo
but don't normally browse GitHub. Secondary: Neo developers checking
"what's going on across the org."

**Principles** (locked in for this redesign):

1. **Stream, not edition.** No "today's issue," no headline of the day, no
   daily/weekly publish event. Always-current view, "Updated 12 min ago" is
   the only freshness signal.
2. **Scan first, read second.** The reader should grasp the state of the
   org in 3 seconds of looking at the front page. Click into items only
   when they want depth.
3. **Issues are the lead.** On a GitHub org, *issues* are where decisions
   and arguments happen. Pull requests are context. Commits and releases
   are output. Default content priority: **Issues > Discussions > Pull
   requests > Releases > Commits**.
4. **AI consensus inline, not behind a click.** Every card on the feed
   carries its consensus chip + one-line summary visible *without
   clicking*. That's the actual product — pulling the synthesis up to the
   list level.
5. **Mark founders, don't filter to them.** Founder participation is
   highlighted with a marker on every card where it applies; a "founder
   activity" tab filters to those, but the default view shows everyone.
6. **Honest about the machine.** AI-generated content is labelled. Pending
   / error states are visible.

**Not** — a GitHub replacement, a chat app, an official Neo property. Not a
newspaper, not a daily edition.

---

## 2. The defining feature — the consensus chip + one-liner

Modelled on Reddit's AI **Conversation Summary** card, but compressed. On
the feed, *every* card carries:

- A **consensus chip** — one of: `Resolved` · `Decided: …` · `Leaning
  approve` · `Open` · `Split` · `Stalled`. Color-coded.
- A **sentiment meter** — `calm` / `mixed` / `contentious`. Tiny segmented bar.
- A **one-line AI summary** (under the title, 80–120 chars). Editorial
  voice, weighted language ("most reviewers think X; one concern about Y").
  Never a percentage unless we literally counted.
- A **founder marker** (highlighter-pen yellow) when a founder participated,
  with the quote pulled out *only* on the full thread page.
- An **AI label** somewhere on the card or in a hover state so the reader
  knows this is machine-summarized.

Click the card → the existing thread page (`/threads/:repo/:type/:number`)
opens, which shows the **full** consensus block (framing sentence,
weighted bullets, verbatim founder quotes, raw GitHub thread below).

So the front page is the *list* view of consensus; the thread page is the
*deep-read* view of one consensus.

---

## 3. Layout — Reddit-new style

**The shape**: a **3-column layout on desktop**.

- **Left rail** (~220px wide, sticky): filters and quick stats. Reddit
  doesn't have this; we add it because filtering by **type**, **repo**, and
  **N3/N4** is core to the product.
- **Center column** (~640–780px wide): the main feed of cards. This is the
  visual centerpiece. Vertical scroll.
- **Right rail** (~280px wide, sticky): about + live counts + top
  contributors. Reddit-style sidebar.

On narrower viewports (<1100px) the right rail collapses below the feed.
Below 720px the left rail collapses to a horizontal filter bar above the
feed.

**Color and chrome**: warm white page background (`#FAFAF8` or similar),
white cards with subtle 1px borders + soft shadow on hover. Neutral gray
text. One accent — Neo green (`#00B864`) — used for: links, accent chips,
the "live" pulse dot, the founder marker outline. No heavy editorial
typography — this is a modern tech product, not a publication.

---

## 4. The feed card (THE design challenge)

Every item is a card. Variants: **default**, **with founder marker**,
**contentious**, **resolved/closed**, **pending summary**, **release**,
**commit** (rare/optional).

**Default card layout** — top to bottom, 100–140px tall:

```
┌─────────────────────────────────────────────────────────────────┐
│  [issue] · neo-modules · #4218 · 2h ago     [Open] [Contentious]│
│                                                                  │
│  Should DBFTPlugin lower block time from 15s to 5s on mainnet? │
│                                                                  │
│  Commenters are largely divided. Most argue 5s would improve   │
│  wallet UX; several push back over validator hardware variance.│
│                                                                  │
│  ✦ AI summary    👤 Erik Zhang     💬 38   👥 12   N3 / N4    │
└─────────────────────────────────────────────────────────────────┘
```

**Detail**:
- **Top-left**: type pill (issue / PR / discussion / release), color-coded.
  Issues are a default tone; PRs are slightly purple-blue; discussions are
  green-tinted; releases are accent green.
- **Top-left, continued**: mono `repo · #number` and relative time.
- **Top-right**: state chip (Open / Merged / Closed / Draft) + sentiment
  (compact segmented bar with label).
- **Title row**: 16–17px, sans-serif semibold, near-black. The most
  prominent text on the card. Truncates at 2 lines with ellipsis.
- **Summary row**: 13–14px, gray, 2 lines max. This is the AI one-liner —
  the actual *product* surfaced on the card. When `summary_status='pending'`
  the row reads "Summary publishing soon." in lighter italic. Never blank.
- **Bottom strip**: small mono icons + counts. AI-summary tag, founder
  marker (when present), comment count, participant count, N3 or N4
  version chip (when classified), maybe diffstat for PRs.

**Importance score** drives ordering, not displayed numerically. (We
discussed scoring with the user — combines comments * recency_decay +
founder_involved + contentious + open + issue_bonus + chip bonus.)

**Card states**:
- **Hover**: card lifts slightly, border darkens. Cursor pointer.
- **With founder marker**: small highlighter-yellow accent on the left edge
  (4px wide) plus the founder name inline in the bottom strip.
- **Contentious**: subtle red-orange tint on the sentiment meter; the
  "Contentious" chip is the only place we use warm color.
- **Resolved / merged / closed**: state chip in muted tone; whole card
  slightly desaturated to signal "done."
- **Pending summary**: AI summary line reads "Summary publishing soon —
  thread had {N} new comments since last summary." Italic, light gray.

A **release card** is a tighter variant with the tag (`v3.7.4`) prominent,
a one-paragraph release summary, and no comment counts.

A **commit card** is rarely shown directly (commits are context); only
surfaced as part of "recently merged" rolled-up groups, if at all.

---

## 5. Left rail — filters & quick stats

Sticky on scroll. Lives in ~220px.

- **Wordmark** at top — small Source Serif 4 (or similar serif) "Gasetta"
  with a green pulse dot showing "live."
- **Filter — type**:
  - All (default)
  - Issues
  - Pull requests
  - Discussions
  - Releases
  - Founder-touched (filter)
- **Filter — version** (Neo-specific, but baked into the product):
  - All (default)
  - N3 — Mainnet
  - N4 — In development
- **Filter — repo**: dropdown or short list of the top 8 repos by activity,
  with a "More…" link to `/repos`.
- **Sort**: Hot (default; importance score) · New · Most discussed
- **Stats** (live, refreshes with the page):
  - Open issues: N
  - Open PRs: N
  - Founder comments this week: N
  - Releases this month: N
- **Mini legend** explaining the consensus chip vocabulary (collapsible
  "?" affordance, not always visible).

URL state lives in query params so filters are shareable: `/?type=issues&version=n4&repo=neo-modules`.

---

## 6. Right rail — about + people

Sticky on scroll. Lives in ~280px. Reddit-style "about this subreddit"
content.

- **About this view** card: 2 short paragraphs explaining "Gasetta is a
  live AI-summarized view of the neo-project GitHub org. Not affiliated
  with Neo or NGD." Then a small "Last refreshed Xm ago" + a small
  github-corner link to the project's own repo.
- **The N4 progress widget** (we have a `<N4SidebarWidget>` already built —
  reuse it but in the new visual style). Shows the % of activity that's
  N4-tagged this period, a split bar, and a "What is N4? →" link to
  `/versions`.
- **Top contributors this period** — small list of avatars + login, 6–8
  rows. Founders pinned at top with the marker. Click → filter feed to
  their activity.
- **Recently resolved** (short list, 4–5 items): the "Resolved" page in
  miniature. Title + outcome chip + time. Click → the thread.

---

## 7. Sitemap

```
/                           main feed (the page)
/?type=…&version=…&repo=…   filtered feeds via URL state
/threads/:repo/:type/:number  single thread (existing)
/repos                      repo grid (refreshed visual)
/repos/:name                single repo view (refreshed visual)
/founders                   founder activity feed (refreshed)
/versions                   "what is N4?" deep page (kept as-is, refreshed)
/archive                    "resolved threads" (already repurposed)
/about                      what this is
```

The thread page (`/threads/:repo/:type/:number`) was built in v1 and is
solid editorially — please *refresh its visual chrome* to match the new
direction (drop heavy serif headlines, more sans-friendly), but keep its
structure (full consensus block + raw thread).

---

## 8. Typography

- **Primary sans** — Inter (or system-ui). Used for: card titles, UI
  labels, summaries, metadata, almost everything.
- **Mono** — JetBrains Mono. Used for: repo names, PR/issue numbers,
  commit SHAs, version tags.
- **Optional serif** — only for the wordmark "Gasetta" (Source Serif 4
  feels right for the brand) and *maybe* the thread-page consensus block's
  framing sentence (the "Where it stands" one-liner). The serif body
  prose from v1 is gone otherwise.

Editorial voice survives in the **content** (AI summaries are written
editorially) — but visually we're a modern tech product, not a newspaper.

---

## 9. Color palette

- **Page bg**: warm light gray, `#F7F6F2` or similar (close to v1's paper
  but cooler).
- **Card bg**: white `#FFFFFF` with a 1px `#E5E5E0`-ish border. Soft
  shadow `0 1px 2px rgba(0,0,0,0.04)` on rest, slightly deeper on hover.
- **Text**: near-black `#1A1814` titles, `#3F3A33` body, `#6C665C`
  metadata.
- **Accent**: Neo green `#00B864`. Used for: links, the live pulse dot,
  founder-marker outline, "N4" tag.
- **Founder highlight**: keep the highlighter-yellow `#FFE89A` (it's
  distinctive and earned its place in v1).
- **Sentiment palette**: calm green-gray, mixed amber, contentious
  red-orange — same as v1.
- **State badges**: open green, merged purple, closed red, draft gray,
  changes-requested amber — same vocabulary as v1.

The chip taxonomy and signal icon system from v1 carry over verbatim. The
visual *shells* change but the meaning vocabulary doesn't.

---

## 10. Component inventory (priority for design canvas)

In rough order of importance:

1. **The feed card** — 5–6 variants (default, founder-touched,
   contentious, resolved, pending, release). This is what makes or breaks
   the redesign.
2. **The main feed page** — left rail + center column + right rail
   composed together. Show 8–12 cards.
3. **Filter rail** (left).
4. **About + Stats sidebar** (right).
5. **Single repo page** — repo header with momentum/sparkline, then a
   filtered feed of that repo's activity (same card design).
6. **Founders page** — list of founder activity cards (specialized
   variant: quote up top, link to parent thread).
7. **Single thread page** — refresh chrome, keep structure.
8. **/repos** — grid of repo cards (think Vercel project cards).
9. **/archive (Resolved)** — keep the structure we have but visually
   align with the rest.
10. **Empty / pending / error states** for each surface.

---

## 11. Visual references

- **Reddit (new)** — the card list pattern, filter chips, sidebar shape.
- **Linear** — chip/badge density, system-font-first typography, crisp UI.
- **Vercel / Codecov dashboard** — clean modern tech-product feel, card
  shadows, status conveyed through subtle color.
- **Lobsters** — the tag/chip system on items.
- **HackerNews comments view** — the sub-thread depth pattern (relevant
  for the thread page when we click into a card).

**Anti-references** — *not* this direction:

- Newspaper layouts (NYT, FT, The Verge feature pages)
- Big serif headlines
- "Today's edition" / dateline chrome
- Bloomberg Terminal (too dense / dashboard-y)

---

## 12. Tech constraints (so designs are buildable)

The frontend stack is locked: **Vite + React 18 + TypeScript + Tailwind +
React Router**. No shadcn/ui (the v1 designer was right to skip it; v2's
component primitives are still custom but Reddit-style, not editorial).

Data shape (already in DB, no schema changes needed):

- **Per-thread** (issues / PRs / discussions): `title`, `body`, `state`,
  `comments_count`, `summary` (text), `consensus_chip` (text),
  `consensus` (text), `sentiment` ('calm'|'mixed'|'contentious'),
  `key_points` (jsonb), `decisions` (jsonb),
  `founder_involved` (bool), `founder_quotes` (jsonb),
  `summary_status` ('pending'|'done'|'error'|'skipped'),
  `updated_at_gh`, `html_url`, `repos:name`, etc.
- **Per-PR additional**: `is_merged`, `additions`, `deletions`,
  `changed_files`, `base_ref`.
- **Per-discussion additional**: `is_answered`.
- **Per-repo**: `name`, `full_name`, `description`, `stargazers_count`,
  activity counts, `momentum` (computed: Surging/Active/Quiet/Dormant).
- **Per-release**: `tag_name`, `summary`, `published_at`.
- **Founder activity** (computed): list of `{login, name, where,
  where_title, quote, relative}`.
- **Resolved items**: `{kind, repo, id, title, outcome, when,
  founder_involved}`.

The frontend already has all the data plumbing (`apps/web/src/lib/dataLoader.ts`)
and the existing components (`Consensus*`, `FounderTag`, `Chip`, etc.).
The redesign's job is to **rebuild the front-page layout and the card
component**; everything downstream of those can be visually refreshed in
the same idiom.

---

## 13. Deliverables (priority order for the design canvas)

1. **The feed card design** in 5–6 states (default / founder-touched /
   contentious / resolved / pending-summary / release). This is the
   single most important deliverable.
2. **The main feed page** with left rail, 8–12 cards, right rail, all
   composed.
3. **Single thread page** visually refreshed to match the new aesthetic
   (kept structurally intact — see the v1 brief and the implementation in
   `apps/web/src/pages/ThreadPage.tsx` for what it needs to do).
4. **Single repo page** — repo header + filtered feed.
5. **Founders page** — feed with the founder-quote variant card.
6. **Empty / pending / error states** for the feed.

---

## 14. What's out of scope for this design

- Multi-chain support (we're single-org for Neo right now).
- Dark mode (add later — design with tokens so the swap is easy).
- Mobile-first (responsive yes, but desktop drives the design).
- Authentication / personalization.
- Per-thread change-history snapshots (a real feature for later).

---

## 15. What the v1 design got right (please keep)

- The consensus chip taxonomy and naming (Resolved / Decided / Leaning /
  Open / Split / Stalled).
- The sentiment vocabulary (calm / mixed / contentious).
- The state badge palette (open / merged / closed / draft / changes-requested).
- The founder highlighter (specifically the warm yellow, used sparingly).
- The signal icons for hot / momentum / contentious / shipped / in-flight
  — those communicate density without clutter.
- Editorial voice in the *content* (neutral, Reddit-weighted, verbatim
  quotes from founders).
- The thread page's structure: full consensus → key points → decisions →
  founder pull-quotes → raw thread.

What the v1 design got wrong (please change):

- The newspaper masthead (dropped already).
- The "today's edition" framing.
- Source Serif 4 for body prose (move to sans for cards; only the
  wordmark + maybe the thread page's framing sentence stays serif).
- Big two-column broadsheet front page (replace with 3-column app shell).
- Emoji kickers in section dividers.

---

## 16. Tone & copy guide

- **No editorial chrome**: no "Today's edition," no "Lead story," no
  "From the archive." Just direct labels: "Feed," "Filters," "About,"
  "Resolved threads."
- **Functional copy on the page**: "12 active issues", "8 PRs in
  review", "Last refreshed 12 min ago."
- **Editorial voice still applies inside summary text** because that's
  AI-generated and modeled on Reddit's conversation summaries. So the
  *card titles* are real GitHub titles (unchanged); the *card summaries*
  use the weighted-language editorial voice.
- **Tooltips** explain things: the AI-summary chip has a tooltip
  "Summarised from public GitHub comments — may contain errors, click to
  see source." The consensus chips have tooltips with the full status
  line.

---

## 17. Two specific design questions for the canvas

A. **Card width / density** — should the feed cards be one per row,
   filling the center column (Reddit-new style), or should some viewports
   show a 2-column grid for higher density? Make a call and show both
   variants if uncertain.

B. **How prominent is the founder marker?** A small `👤 Erik Zhang` chip
   in the bottom strip, or a left-edge accent stripe, or both? The marker
   is one of the few editorial flourishes we keep — please design it with
   intent.
