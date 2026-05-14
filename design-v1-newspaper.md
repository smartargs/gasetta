# Gasetta — Design

Single design doc for handoff. Self-contained — read this without any companion file.

---

## 1. Product

**Gasetta** is a daily, browseable newspaper for the [Neo blockchain](https://neo.org) open-source ecosystem (the [`neo-project`](https://github.com/orgs/neo-project/repositories) GitHub org). Once a day, a bot scans the org and an LLM turns the raw firehose — commits, releases, issues, pull requests, GitHub Discussions — into readable summaries with the **consensus of each conversation**, its tone, and a marker whenever one of Neo's two founders (Erik Zhang, Da Hongfei) took part.

**The mission, in one line** — if you want to know what's going on with Neo's development and community on GitHub — what's shipping, what's being worked on, what people are arguing about, where the founders weighed in — you should find all of it on Gasetta, without ever opening GitHub yourself.

**Name** — *GAS* (Neo's utility token) + *gazzetta* (Italian for gazette). The product literally is a newspaper for Neo: each repo is a section, each daily run is an edition, the org-level digest is the front page.

**Audience** — Neo developers, node operators, ecosystem builders, observers/investors, and Neo team members checking "what's the community saying." Mostly desktop, meaningful mobile minority. Skimmers first, deep-readers second.

**Principles**:
1. **Editorial, trustworthy, calm.** Like the web edition of a good newspaper crossed with a clean dev dashboard. Not crypto-neon, not skeuomorphic parchment.
2. **Editorial for the read, dashboard for the scan.** Newspaper rhythm (serif, prose, headlines) carries the *synthesis* — the consensus block, the digest body, lead stories. Dev-dashboard density (mono counts, state badges, signal icons, sparklines, momentum dots) carries the *data* — repo activity, heat, in-flight work, founder presence. Both coexist in every article card: editorial prose on top, a tight technical metadata strip below. Editorial leads; technical informs. When in doubt, lean editorial — the synthesis is the differentiator. If you go full dev-dashboard you've built another monitoring tool.
3. **Consensus first, source second.** Read what people decided in 8 seconds, drill into the GitHub thread when you care. Every summary links to its source.
4. **Honest about the machine.** Every AI-generated block is labelled. Pending / error states are visible, not faked.
5. **Marker, not filter.** Founder activity is *highlighted*; we never hide or de-prioritise anyone else's. The dedicated Founder Watch view is a filter over the same data, never a gate on it.

**Not** — a GitHub replacement, a chat app, an official Neo property. Footer disclaims affiliation.

---

## 2. The defining feature — the *Reddit-style consensus block*

The single most important pattern in Gasetta. Modelled directly on Reddit's AI **Conversation Summary** — the small labelled card that sits above long threads and tells you in a short paragraph (and 2-4 weighted bullets) *what the thread is about and where it landed*, using deliberately vague language about who said what. Get this right and the whole product works.

### 2.1 Content shape

> **Where it stands.** Commenters are largely **{aligned / divided / unresolved}** on **{topic}**.
>
> - **Most** argue **{position A}**, pointing to **{reason}**.
> - **Several** push back on **{position B}** over **{concern}**.
> - **A few** suggest **{position C}** as a middle ground.
> - **{Founder name}** weighed in: *"{verbatim quote}"* — **{stance}**.
> - The thread is currently **{open / leaning X / split / decided: Y / stalled}**.

Rules:
- **Weighting words** — *most / several / a few / one commenter / both founders*. Reddit-style vagueness on purpose: stays honest about an LLM read, avoids spurious precision. Never "60% of commenters" unless we literally counted.
- **Neutral voice.** Never "users are right to worry" — only "users worry that…". Describe positions; never endorse them.
- **Verbatim quotes only**, attributed by GitHub login, linked to the exact comment. Especially for founders, who get their quote pulled out *always*.
- **Status line** at the end mirrors the consensus chip (see §7).
- **Length budget** — micro: 1 sentence. Compact: ≤80 words. Full: ≤220 words. Short source → short summary; never pad.
- **AI label is mandatory** on every instance — a small "AI summary" tag with an info tooltip: *"Summarised from public GitHub comments. May contain errors — check the source."*

### 2.2 Visual treatment

- A soft-bordered card, distinct from the surrounding chrome — slightly inset background, hairline border, generous internal padding. Lives **above** the raw thread, never replacing it.
- **Top-left**: small ✦ icon + "AI summary" label + info tooltip + the **consensus chip**.
- **Body**: framing sentence + bullets. The *weighting words* and *named camps* are the only bolded spans — they're the scannable spine.
- **Quotes**: indented pull-quote style, italic, ending with `— @login` linked to the comment on GitHub.
- **Bottom-right**: `Show full thread (N comments) ↓` anchor that scrolls to the raw thread.
- **Founder participation**, when present, gets the **founder marker** (§7) inline next to the founder's name in the bullet/quote.

### 2.3 Three sizes (same content shape, compressed)

Same component, three configurations:

1. **Micro** — on article cards in the front-page Hot Threads, Founder Watch feed, repo-page lists.
   *One sentence:* "Mostly aligned that **X**; one concern about **Y**." + consensus chip + sentiment chip + founder marker if any.
2. **Compact** — on the front-page lead story, on repo-page thread rows that are expanded.
   Framing sentence + 2-3 bullets + chips + founder marker. No quotes.
3. **Full** — on the thread detail page (`/threads/:type/:id`). The centerpiece of that page.
   Framing sentence + 3-5 bullets + 1-3 verbatim quotes (founder quotes always included if any) + status line + chips + AI label.

This three-tier system is the spine of the whole product — every page is some arrangement of consensus blocks plus context.

---

## 3. The newspaper metaphor → IA mapping

| Newspaper | Gasetta |
|---|---|
| The paper | the site |
| Today's edition | the latest daily run |
| Front page | the org-level digest (`/`) |
| Sections (Politics, Tech, Markets…) | repositories, loosely grouped |
| A section's page | a repo's page |
| An article | one issue / PR / discussion + its consensus block |
| Op-ed pull-quote | a founder quote |
| Back issues | edition archive |
| Masthead | the about page |

Express the metaphor *lightly* in copy ("Today's edition", "In other sections", "From the archive"). Don't force fake VOL./ISSUE chrome. The metaphor lives in *structure and rhythm*, not in skeuomorphic decoration.

---

## 4. Brand & visual language

**Mood** — editorial, trustworthy, crisp, a touch broadsheet — but software-fast. FT / Bloomberg / The Verge restraint crossed with a clean dev-tool precision. Confident type hierarchy. Generous whitespace. No decoration except hairline rules.

**Dual chrome** — every meaningful surface in Gasetta has *two* visual languages stitched together. The **editorial chrome** (serif headlines, body prose, the consensus paragraph, pull-quotes) carries the synthesis and is what makes Gasetta read like a newspaper. The **technical chrome** (mono repo names, state badges, diffstats, signal icons, momentum dots, sparklines, activity strips) carries the data and lets a dev scan a card in half a second. They sit *together* in the same article card — prose on top, a tight metadata footer below — never in separate "modes." When in doubt, lean editorial; the synthesis is the differentiator. Reference points: *The Verge*'s post pages, *Bloomberg Terminal*–style data rails framing editorial copy, GitHub's repo-page header where prose, tags, and numbers sit together without fighting.

**Type**:
- **Headline & body prose serif** — a transitional / old-style serif (Source Serif, Charter, Tiempos family). The "newspaper" signal lives here. Used for headlines, the digest prose, and the consensus-block body.
- **UI / metadata / labels sans** — a clean neutral grotesque (Inter-class). Used for nav, chips, labels, captions, metadata.
- **Mono** — for repo names, SHAs, code, counts, diffstats.
- **Scale contrast** — strong: the front-page headline is *big*; body prose is comfortable for paragraph reading; metadata is small.

**Color**:
- **Light mode is primary**; **dark mode is first-class** (warm-ish dark, not pure black).
- Mostly ink-on-paper neutrals. Hairline rules are the chrome.
- **One accent** — a Neo-adjacent green, used *sparingly*: links, the live "Updated Xh ago" dot, primary actions.
- **Semantic palette** for the chip families (consensus / sentiment / state) — defined in §7. Never color-only; every chip has a text label.
- **Founder marker** — a distinct *highlighter-pen* treatment: a soft warm highlight behind the name (light yellow in light mode, muted gold/amber in dark). The one element allowed slight expressiveness — design it well; it's the visual signature of the product.

**Texture** — flat. Hairline rules (newspaper column rules) divide blocks. Optional very subtle paper grain on the front page only, off by default.

**Iconography** — minimal line icons (Lucide-class). Section kickers may pair a small emoji (📦 🔥 🛠 🐛 👤 📰) with a text label; never emoji in body prose.

**Wordmark / logo** — "Gasetta" set in the serif, possibly with the "GAS" subtly distinguished. Favicon: a small folded-paper / "G" glyph in the serif. Design owns the final mark.

---

## 5. Sitemap

```
/                      Front page — today's edition (org digest)
/archive               Back issues — list of past editions
/editions/:date        A specific past edition's front page
/repos                 All sections — repo index
/repos/:name           One section — repo page
/threads/:type/:id     One article — issue | pr | discussion detail
/founders              Founder watch — filtered feed over the same data
/releases              Shipped — cross-org release list (v1+)
/search                (v1+) cross-summary search
/about                 Masthead — what this is, freshness, disclaimer
/admin                 (gated, later) ops dashboard
```

**Global chrome**:

- **Header (sticky, slim)** — wordmark → home; nav (Front page · Sections · Founder watch · Archive · About); **freshness indicator** ("Updated 6h ago" with a live green dot, turns amber when stale); theme toggle; (later) search input; (later) Subscribe.
- **Footer** — disclaimer ("Independent. Not affiliated with Neo / NGD."); "Source: github.com/neo-project"; RSS link; this project's own repo; last-built timestamp; © line. Quiet.

**Cross-linking rule** — every summarised thing links to (a) its GitHub source, (b) its repo page, and (c) any founder-watch context. Repo pages link to the relevant edition. Front-page items deep-link to the thread page.

---

## 6. Pages

For each page: purpose, blocks in priority order, layout intent, states.

### 6.1 `/` — Front page (the hero of the product)

Purpose — in one screen, "what happened in Neo today." Renders the latest `org_digest` plus curated deep-links.

Blocks, in priority order:

1. **Masthead band** — wordmark, edition date ("Tuesday, 12 May 2026"), freshness indicator, the digest **headline** set big in the serif (the literal newspaper headline). Optional one-line standfirst.
2. **Lead story** — the top item from `top_items`. Title (linked), the **compact consensus block** (framing sentence + 2-3 bullets), consensus chip, sentiment chip, founder marker if any, repo tag, source link. The largest article block on the page.
3. **📦 Shipped** — releases this edition. Per release: repo, tag/name, one-paragraph "what's in it" summary, date, link. Hide section if empty.
4. **🔥 Hot threads** — 3-8 most active/contentious items: compact article cards (title + **micro consensus block** + chips + founder marker + repo tag + participant count + link). Each card prefixed with the **Hot** signal icon (§7.3) and its tooltip-reason ("18 comments today · 7 commenters · contentious"); cards where sentiment is contentious also show the **Contentious** bolt.
5. **🛠 Notable pull requests** — PRs worth knowing about (merged-and-meaningful or actively-debated): title, summary, state badge (open/merged/draft/changes-requested), diffstat, repo tag, link.
6. **🐛 Issue trends** — short prose paragraph from the digest: themes in newly opened / closed issues this edition.
7. **👤 Founder watch** (right rail or full-width band) — entries from `founder_activity[]`: founder name + where they appeared + their pulled quote + link. Distinct founder-marker styling. If empty this edition, show a quiet "No founder activity in this edition."
8. **In other sections** — compact list of remaining repos that had activity, one-line blurb each, linking to repo pages.
9. **From the archive** — link to `/archive` + the previous 2-3 editions' headlines.

**Layout intent**: desktop = a real multi-column newspaper grid (wide lead column + a narrower rail for Founder watch / In other sections), hairline rules between blocks, section kickers in sans/mono small-caps. Mobile = single column, same order, rules become section dividers. The headline + lead story must be readable above the fold on a laptop.

**States**:
- *Loading* — masthead + lead + a couple of cards as skeletons.
- *Empty* (pre-first-run) — a tasteful "First edition coming soon — Gasetta publishes daily" splash with the wordmark.
- *Stale* (last run failed or >36h old) — a subtle non-alarming banner: "Last updated 2 days ago — next edition pending." Content still shown.
- *Error* (data fetch failed) — friendly full-page message + retry; never a stack trace.

### 6.2 `/archive` and `/editions/:date` — Back issues

- `/archive` — reverse-chronological list of editions, grouped by month. Each row: date, the headline, stat pills (releases, hot threads, founder-touched count), link. Optional tiny activity bar per edition.
- `/editions/:date` — the front-page layout from 6.1 for that historical run, clearly marked: "Edition of 5 May 2026 — [back to today]". Read-only, same layout.

### 6.3 `/repos` — All sections (repo index)

Purpose — browse by repo.

- **Layout** — responsive grid (or toggleable list) of repo cards. Optional grouping into named sections (Consensus & protocol, Node & modules, Smart-contract tooling, SDKs, Docs & site, Other) — grouping rules live in config; the design just needs to support an optional group header. Sort: most active first. Text filter.
- **Repo card** — repo name (mono), one-line description, stars, "last activity 3h ago". The scan signals (§7.3) — visible at a glance, in this order: the **Momentum dot** (Surging / Active / Quiet / Dormant — the *primary* signal that answers "is this repo being worked on right now?"), a small **activity sparkline** across recent editions, the **activity strip** for the latest edition (labelled mono counts: commits, PRs ±, issues ±, discussions), a "🔥 N hot threads" pill if any, an "⇄ N PRs in flight" pill if there are open PRs with recent activity, a "📦 Shipped" badge if a release dropped this edition, the **Founder active** marker if a founder participated in this repo recently.
- **States** — card-skeleton grid; empty "No repositories tracked yet"; archived/fork repos simply aren't here (by design).

### 6.4 `/repos/:name` — Section page

Purpose — everything that happened in this repo, summarised, most-recent first. A mini front page for one section.

- **Header** — repo name (mono, large), description, links (GitHub, stars), default branch, "last activity". A signal row across the top of the header carries the same scan signals as the repo card (§7.3): **Momentum dot** with tooltip, **activity sparkline**, **activity strip** for the latest edition, "⇄ N PRs in flight", "📦 Shipped vX" if a release dropped this edition, and the **Founder active** marker if applicable.
- **Period control** — "this edition" by default, with a way to widen to last 7/30 days or pick a past edition.
- **Body**, stacked or tabbed:
  - **Releases** — cards: tag/name, date, "what's in it" summary, link.
  - **Code changes** — short prose paragraph summarising commit activity (themes, notable commits), plus a collapsible raw commit list (SHA mono, message, author, date, link).
  - **Pull requests** — list of PR article cards: title, state badge, diffstat, **micro / compact consensus block** if discussed, founder marker, links. Filter: open / merged / all.
  - **Issues** — list of issue article cards: title, state, labels, consensus block, founder marker, participant count, links. Filter by state / label.
  - **Discussions** — list of discussion article cards: title, category, upvotes, answered?, consensus block, founder marker, links.
- **States** — section-level skeletons; per-section empty ("No discussions this edition"); error → retry.

### 6.5 `/threads/:type/:id` — Article (deep read)

Purpose — the deep-read view of one conversation. `type` ∈ `issue | pr | discussion`. The **full consensus block** is the centerpiece of this page.

- **Headline area** — thread title (serif), kicker = `<repo> · <type> #<number>`, state badge, labels / category, author + date, links (GitHub, repo page, founder-watch if applicable).
- **Our take** (article body, in this order):
  - **Full consensus block** (§2.3) — framing sentence + 3-5 weighted bullets + 1-3 verbatim quotes (founders always included if present) + status line + consensus chip + sentiment meter + AI label & tooltip. *The most prominent thing on the page.*
  - **Key points / Decisions** — bulleted; "Decisions" only when non-empty, styled as a resolved / checkmark list.
  - For PRs: **diffstat**, **review decision**, **risk notes** if present.
- **Founder pull-quotes** — for each founder quote, a separate pull-quote block (serif, italic, marker-pen accent, attribution linked) — bigger and more prominent than the inline quotes in the consensus block.
- **Participants** — avatars / handles of everyone who took part; founders / core visibly tagged. Counts.
- **The thread** — the raw comments, oldest → newest, **collapsed by default** behind `Show full thread (N comments) ↓`. Per comment: avatar, handle (founder / core tag if so), timestamp, rendered markdown body, upvotes (discussions), "marked as answer" badge (discussions), link to the comment on GitHub. Founder / core comments subtly highlighted with a faint left rule + the marker chip.
- **Related** — other threads in the same repo / on the same topic, when available.

**States**:
- *Loading* — skeleton of headline + consensus block.
- *Pending* (`summary_status='pending'`) — show raw thread + a quiet "Summary pending — published daily" note in place of the consensus block.
- *Error* (`summary_status='error'`) — same, with a smaller "Couldn't summarise this one — see the source" note.
- *404* if id unknown.

### 6.6 `/founders` — Founder watch

Purpose — a *filter view* over the same data: every thread/PR/release/comment a founder took part in, newest first. Reinforce in header copy: *"We track all activity. This page just filters to threads a Neo founder joined."*

- **Layout** — feed of compact article cards (same component as Hot threads), each showing the founder's name + their pulled quote inline + thread context + links.
- **Filters** — by founder (Erik Zhang / Da Hongfei / any), by repo, by type, by date range.
- **Header** — small explainer + a count ("Erik Zhang has appeared in 7 threads this month").
- **States** — feed skeleton; empty "No founder activity in the selected range — try widening it."; if `contributors` is unconfigured (no founders defined yet), a friendly "Founder tracking isn't configured yet" placeholder.

### 6.7 `/releases` — Shipped (v1+)

Chronological cross-org list of releases: repo, tag/name, prerelease badge, date, "what's in it" summary, link. Filter by repo.

### 6.8 `/about` — Masthead

What Gasetta is, in plain language. How often it updates. How summaries are made (transparency: *"Summaries are AI-generated from public GitHub data and may contain errors — always check the source."*). The disclaimer. Links (Neo, the neo-project org, this project's repo, RSS / email). Credits. The name's meaning.

### 6.9 `/admin` — Ops (gated, later, low design priority)

Behind Supabase Auth. Trigger a run; view recent `runs` (status / timings / counts / errors); edit `contributors` (add / remove founder & core logins + aliases); cost dashboard from `llm_calls` (per-day / per-model spend, token counts). Plain, dashboard-y — doesn't need the newspaper styling.

---

## 7. Component inventory

Each component: default + hover / focus / active / disabled + loading / empty / error where applicable.

### 7.1 The centerpiece

- **Consensus block** — *the workhorse* (§2). Three variants:
  - **Micro** — 1 sentence + chips + founder marker.
  - **Compact** — framing sentence + 2-3 bullets + chips + founder marker.
  - **Full** — framing sentence + 3-5 bullets + 1-3 verbatim quotes + status line + chips + AI label.

  Every variant has: an "AI summary" label + info tooltip; a consensus chip; an optional sentiment chip; optional founder marker(s); optional "Show full thread ↓" anchor.

### 7.2 The chips and meters

- **Consensus chip** — labelled pill, fixed taxonomy (designer picks palette within the rules):
  - `Resolved` — green
  - `Decided: {X}` — blue
  - `Leaning {X}` — teal
  - `Open / unresolved` — slate
  - `Split` — amber
  - `Stalled` — gray

  Tooltip = the consensus block's status line. Never color-only — always labelled.

- **Sentiment chip / meter** — three steps: `Calm`, `Mixed`, `Contentious`. A small segmented bar or thermometer. *Never alarmist* for "contentious" — informative only.

- **State badge** — `open` / `closed` / `merged` / `draft` / `changes-requested` / `answered`. Distinct from consensus chips; palette inspired by GitHub but in our token set.

- **Repo tag** — mono chip with the repo name; links to the repo page.

- **Diffstat** — `+1,234 / −567` / N files, green/red, mono.

### 7.3 Signal icons

A small, fixed family of *semantic* icons — never decoration. Each one represents a signal a reader can act on at a glance; if it doesn't, it isn't in the set. This is the technical-chrome half of the dual chrome (§4): the data dimension of every card.

| Signal | Glyph | Where it shows | When it fires | Detail |
|---|---|---|---|---|
| **Hot** | 🔥 flame | thread cards, hot-threads list, repo cards | comments-in-last-24h above threshold *or* many participants *or* contentious sentiment *or* founder participated | Tooltip lists the reason ("18 comments today · 7 commenters · contentious"). The flame is the one icon allowed warm red-orange. |
| **Momentum** | ● dot + trend arrow | repo cards, repo-page header | rolling 7-day activity vs. that repo's 30-day baseline | Four states with text labels: **Surging** (green ●↑), **Active** (green ●), **Quiet** (slate ●), **Dormant** (gray ●). Tooltip: "12 commits, 3 PRs, 2 discussions this week — above baseline." The single most important glance signal on `/repos`. |
| **Activity sparkline** | tiny inline chart | repo cards, repo-page header | always, when ≥3 editions of data exist | 14-edition sparkline of total events per edition; pure trend, no axes. |
| **Founder active** | 👤 with highlighter-pen accent | repo cards, thread cards, repo-page header | a founder participated in this scope during the current edition / window | Reuses the founder-marker styling from §7.4; links to that founder's activity. |
| **Shipped** | 📦 box | repo cards, front-page Shipped section, repo-page header | one or more releases published in this edition | "📦 Shipped v3.7.4 — 2d ago" with link. |
| **In flight** | ⇄ branch glyph | repo cards, repo-page header | ≥1 open PR with activity in the current window | Count + label: "⇄ 4 PRs in flight" — links to the open-PR filter. |
| **Contentious** | ⚡ bolt | thread cards | sentiment = `contentious` | Informative, never alarmist. Pairs with the sentiment meter rather than replacing it. |

Visual rules:
- One icon family, one stroke weight — no mixing icon sets (Lucide-class).
- Always paired with a count, label, or tooltip — **never icon-only**. Both for clarity and a11y.
- Only **flame** (warm red-orange) and **founder-highlight** (highlighter-pen yellow/gold) are allowed warm color; the rest live in neutral + the Neo-green accent.
- The glyph is `aria-hidden`; the meaning lives in the adjacent label or tooltip.
- Tabular alignment when several signals appear together on a card (mono numerals, consistent spacing) — these are the "Bloomberg rail" of the dual chrome.

### 7.4 The founder marker

- **Inline marker** — a small chip used on cards and inline in consensus-block bullets: a 👤 icon (or small avatar) + founder name with the **highlighter-pen** accent behind it. Says "this founder joined the conversation."
- **Pull-quote block** — used on thread pages and Founder Watch: a larger block with the quote in the serif, italic, marker-pen accent on the leading rule, attribution (`— Erik Zhang, in this thread ↗`) linked to the exact comment.

This is the one element of the product allowed slight visual expressiveness. The highlight is *warm* (light yellow / muted gold) — distinct from any other accent in the palette.

### 7.5 Article cards

- **Article card** — wraps a consensus block + thread metadata. Three variants:
  - **Lead** (front page) — large, with **compact** consensus block.
  - **Compact** (hot threads, founder watch, feeds, repo lists) — with **micro** consensus block.
  - **Row** (dense lists in repo pages) — title + chips + meta, consensus block can be revealed on expand.

  Slots: type/number kicker (`#1234 · pull request`), title (link), state badge, consensus block, repo tag, meta (participants, upvotes, date), source link.

### 7.6 Repo & thread bits

- **Activity strip** — a row of labelled counts for a repo in an edition (commits, PRs ±, issues ±, discussions); optional tiny sparkline across editions.
- **Participant list** — stacked / overflowing avatars + handles, founders / core tagged.
- **Comment item** — avatar, handle (+ founder/core tag), timestamp, rendered-markdown body, upvotes, "answer" badge, source link; founder/core variant subtly highlighted (faint left rule + the marker chip).

### 7.7 Chrome

- **Header / masthead** — sticky, slim. Wordmark, nav, freshness indicator (live green dot + "Updated Xh ago", amber when stale), theme toggle, (later) search, (later) subscribe.
- **Footer** — disclaimer, source link, RSS, last-built time, ©.
- **Headline** — three scales: huge (front page), large (repo / past editions), medium (thread page).
- **Section kicker + hairline rule** — "📦 SHIPPED" / "🔥 HOT THREADS" in small-caps sans (or mono) + a hairline rule.
- **Freshness indicator** — live dot + "Updated Xh ago"; amber when stale; tooltip with absolute timestamp.
- **Edition switcher / date picker** — used on repo pages and archive.
- **Filter bar** — chips / dropdowns for state, label, type, repo, founder, date range.
- **Theme toggle** — light / dark / system.

### 7.8 System states & meta

- **Skeletons** — for the front page, the card grid, and the thread page.
- **Empty / error / stale placeholders** — a small friendly family; always offer the next click.
- **AI-label tag + tooltip** — appears on every consensus block and digest paragraph. Tooltip: *"Summarised from public GitHub comments. May contain errors — check the source."*
- **Disclaimer note** — "AI-generated from public GitHub data — check the source." Used on thread pages and About.
- (later) **Subscribe dialog** — email + RSS.
- (later) **Search input + results list.**
- (admin) plain table, run-trigger button, contributor editor, cost mini-charts.

---

## 8. Responsive

- **Desktop (≥1024px)** — the front page is a true multi-column newspaper grid (lead column + rail). Repo / thread pages: content column max ~720-780px for prose readability, with an optional right rail for metadata. Hairline column rules visible.
- **Tablet (~640-1024px)** — collapse to one main column + rail moves below; nav may partially collapse.
- **Mobile (<640px)** — single column everywhere; section kickers become full-width dividers; nav → hamburger or a slim scrollable bar; chips wrap; comment thread stays collapsed by default; avatars overflow into "+N".
- Touch targets ≥44px. No horizontal scroll. Sticky header stays slim on mobile.

---

## 9. Accessibility

- **WCAG AA contrast** in both themes — especially for chips. Never rely on color alone: every chip has a text label, sentiment meter has a label too.
- **Full keyboard nav** — visible focus rings, logical tab order, skip-to-content link.
- **Semantic landmarks** — `header / nav / main / article / aside / footer`; proper heading hierarchy (one `h1` per page = the headline).
- **`prefers-reduced-motion`** respected — skeleton shimmer and transitions tone down.
- **`prefers-color-scheme`** honored by default; manual override persists.
- **Alt text** on images / avatars; emoji kickers are `aria-hidden` with a real text label alongside.
- **Sanitise** rendered LLM / GitHub markdown (consensus paragraphs, comment bodies — third-party content).
- **Performance** — front page near-instant; skeletons within 100ms; no layout shift when content lands.

---

## 10. Content & tone

- **Voice** — plain, neutral, newspaper-desk. Confident, never hype-y, never editorialising beyond what the summary says. Crypto-jargon only where the source uses it.
- **Headlines** — informative over clever. ("Neo N3 consensus: validators debate block-time change", not "BIG NEWS for Neo!!".)
- **Always attribute and link** — every claim traces to a GitHub URL. Founder quotes are verbatim and linked to the exact comment.
- **Be honest about the machine** — the recurring AI label and disclaimer; "Summary pending" rather than faking it; show raw threads when no summary exists.
- **Dates** — absolute and human ("12 May 2026"); relative ("Updated 6h ago") with absolute on hover.
- **Empty states are copywriting** — friendly, on-brand, always offer the next click.
- **Weighting language** in consensus blocks — Reddit-style vagueness, on purpose: *most / several / a few / one commenter*. Never invent precision the source doesn't support.
- **Emoji** — only section kickers (📦 🔥 🛠 🐛 👤 📰), sparingly, with a text label; never in body prose.

---

## 11. Data the design must accommodate

(For reference. Maps to a Supabase schema; design only needs to know each field exists.)

- `org_digests` — `headline`, `body_md`, `period_label`, `top_items[] {type, id, title, url, why}`, `releases[]`, `founder_activity[] {login, where, url, quote}`, `created_at`, parent `runs`.
- `repo_digests` — `headline`, `body_md`, `activity_counts {commits, releases, prs_opened, prs_merged, issues_opened, issues_closed, discussions_new, hot_threads}`.
- `repos` — `name`, `full_name`, `description`, `html_url`, `stargazers_count`, `default_branch`, `pushed_at`, `last_activity_at`.
- `issues` / `pull_requests` / `discussions` — `number`, `title`, `state` (+ PR `merged`, `draft`, `review_decision`, `additions / deletions / changed_files`, `base / head_ref`; discussion `category`, `upvotes`, `is_answered`), `author_login / name`, `labels`, `comments_count`, `created_at / updated_at / closed_at`, `html_url`, `founder_involved`.
  LLM fields: `summary`, `consensus` (the full paragraph), `sentiment`, `key_points[]`, `decisions[]` (PRs also `risk_notes`), `founder_quotes[] {who, quote, url}`, `summary_status` (`pending | done | error | skipped`), `summarized_at`, `model`.
- Comments / reviews — `author_login / name`, `body`, `created_at`, `html_url`, `upvotes` (discussion), `is_answer` (discussion), `is_founder` / role; PR `pr_reviews.state`.
- `commits` — `sha`, `message`, `author_login / name`, `authored_at`, `additions / deletions`, `html_url`.
- `releases` — `tag_name`, `name`, `body`, `is_prerelease`, `published_at`, `html_url`, `summary`.
- `runs` — `started_at / finished_at`, `status`, `window_start / window_end`, counts — drives the "Updated Xh ago" / stale states and the archive list.
- `contributors` — `github_login`, `display_name`, `role` (`founder / core / community`), `is_founder`. **May be empty initially** — design the "tracking not configured yet" state for Founder Watch.
- `llm_calls` (admin only) — `purpose`, `model`, `tokens_in / out`, `cost_usd`, `created_at`.

---

## 12. Tech constraints

The frontend is a **static SPA**: Vite + React + TypeScript + Tailwind + shadcn/ui, React Router, TanStack Query. Data comes from Supabase PostgREST (read-only, anon key, RLS). Therefore:

- Design within reach of Tailwind + shadcn primitives (extend tokens / theme as needed).
- Assume client-side routing.
- Assume content pops in after a skeleton — design skeletons for every block.
- No server rendering, no per-request SEO. (If SEO matters later we migrate to Astro; not a v1 concern.)
- Markdown (digests, comments, the consensus paragraph) rendered client-side and sanitised.

---

## 13. Deliverables

1. **Visual language** — type scale; color tokens (light + dark); spacing & radius; the hairline-rule treatment; iconography; the wordmark + favicon.
2. **The component set in §7**, with states (default / hover / focus / active / disabled / loading / empty / error). In priority order:
   1. **Consensus block** in all three sizes (the centerpiece — get this right first; the rest follows).
   2. **Article card** variants (lead / compact / row) — including the *editorial-on-top / technical-strip-below* layout from §4's dual chrome.
   3. **Consensus chip** taxonomy + **sentiment** meter.
   4. **The signal icon set** (Hot · Momentum · Activity sparkline · Founder active · Shipped · In flight · Contentious) — one cohesive line-icon family with the rules in §7.3. The Momentum dot is the headline scan signal — design it carefully.
   5. **Founder marker** + **founder pull-quote** with the highlighter-pen accent.
   6. Everything else.
3. **High-fi layouts** for `/`, `/repos`, `/repos/:name`, `/threads/:type/:id`, `/founders`, `/archive`, `/about` — each at desktop + mobile, in light + dark.
4. **First-edition / stale / error states** for `/`, and **pending / error** states for the thread page.
5. **Interaction notes** — nav behaviour, comment-thread expand, edition switching, filter bar, theme toggle persistence, the AI-label tooltip, the "Show full thread ↓" scroll target.

**Constraints recap** — editorial-but-fast; **editorial chrome for the read + technical chrome for the scan, in the same card**; light-first with first-class dark; one Neo-green accent; serif for headlines/prose + clean sans for UI + mono for code/repos; flat with hairline rules; accessibility AA; **icons are semantic indicators, never decorative — only the flame and the founder highlight may use warm color**; the founder marker is the one element allowed slight expressiveness; nothing skeuomorphic.

**The Reddit-style consensus block is the defining UI moment of Gasetta — design it like a feature, not a decoration.**
