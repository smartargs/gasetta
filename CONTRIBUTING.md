# Contributing to Gasetta

Thanks for considering a contribution. Gasetta is a small, focused
project — the goal is to keep it that way.

## Quick start

Local dev setup is in [README.md](./README.md#local-development). System
design and data model are in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Before you open a PR

- **Open an issue first** for non-trivial work (new features, behavioural
  changes, schema changes, anything that touches the LLM prompts). It's
  cheaper to align on direction before writing code.
- **Typos and tiny doc fixes** can skip the issue and go straight to a PR.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(ui): add momentum chip to repo cards
fix(ingest): handle 409 on empty repos
docs: clarify N4 classifier rules
chore(deps): bump @supabase/supabase-js
```

Subject in imperative mood, ≤ 72 chars, no trailing period. Add a body
only if the change isn't self-explanatory.

Never use `--no-verify` to skip hooks. If a hook fails, fix the
underlying issue and create a new commit.

## Code

### Backend (Edge Functions)

- Deno + TypeScript. Run `deno check` before committing:
  ```sh
  cd supabase/functions
  deno check _shared/*.ts ingest/*.ts summarize/*.ts
  ```
- Per-table upsert helpers live in `_shared/db.ts`. New tables get new
  helpers there — don't sprinkle raw queries across the function code.
- The GitHub client (`_shared/github.ts`) handles rate-limiting and
  retries. Don't fetch the GitHub API directly elsewhere.
- The OpenAI client (`_shared/openai.ts`) handles 429/5xx retries and
  cost computation. Same — go through the client.

### Frontend

- Vite + React + TypeScript. Run `tsc -b` before committing:
  ```sh
  cd apps/web
  npx tsc -b --noEmit
  ```
- Styles live in `src/index.css` using CSS variables (no Tailwind utility
  classes in components — use the design tokens or the existing class
  vocabulary).
- New components go in `src/components/`. Atoms live in `atoms.tsx`.
  Layout primitives (TopBar, LeftRail, RightRail, AppLayout) are
  top-level.
- Data shape lives in `src/data/v3types.ts`. New fields → add to the
  type, the loader (`src/lib/v3Loader.ts`), and the consumers.

## Tests

There are none yet. PRs that add the first test infrastructure are
welcome — start with the version classifier and the importance score
since those are pure functions.

## Schema changes

Migrations are append-only files in `supabase/migrations/`. Never edit a
shipped migration — write a new one.

```sh
# new migration
touch supabase/migrations/0005_add_something.sql
# apply locally
supabase db reset
```

Document the change in `ARCHITECTURE.md` if it affects the public data
model or the ingest/summarize contracts.

## Reporting bugs

File an issue at
[github.com/smartargs/gasetta/issues](https://github.com/smartargs/gasetta/issues)
with:

- What happened
- What you expected
- Steps to reproduce
- Any relevant logs (redact secrets — service-role keys, OpenAI keys,
  GitHub PATs)

Bugs in the AI output (a thread summarised wrongly, a missed founder
quote) are valuable too — those usually mean a prompt change.

## What we won't merge

- Adding write-side surfaces (commenting back to GitHub, voting, etc.)
  — Gasetta is read-only by design.
- Features that filter founders out, hide non-founder activity, or
  otherwise act as a gate. Founders are a *marker*, not a filter.
- Anything that ships secrets to the browser.

## Code of conduct

Be civil. Disagreements are fine; personal attacks aren't. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/) by default
even though we don't ship a separate `CODE_OF_CONDUCT.md` yet — open an
issue if something needs surfacing.
