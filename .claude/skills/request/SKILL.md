---
name: request
description: >-
  File a request for new work from chat — a feature, bug, or chore. Determines the
  type itself, explores/clarifies (for a bug: best-effort confirms the root
  cause), and writes a structured, un-ID'd item to planning/inbox/. Does not
  implement or allocate an id; /scope picks it up next.
user-invocable: true
argument-hint: <description of the feature, bug, or chore to file>
allowed-tools: Read, Grep, Glob, Write, Task
---

# Request — File New Work

## Role
Turn a natural-language ask into one structured **inbox** item — a request for new
work, whether a feature, a bug, or a chore. You decide the type, then capture it.
Do **not** implement, allocate an id, or move folders — `/scope` runs intake next.

## Arguments
$ARGUMENTS — what to file. If empty, ask the user what they want to request.

## 1. Determine the type
Classify from the description; only ask if it's genuinely ambiguous:
- **bug** — something is broken / behaves wrong (errors, regressions, wrong output)
- **feature** — a new capability or enhancement
- **chore** — refactor, cleanup, deps, tooling; no user-facing behavior change

State the chosen type (one line) before continuing.

## 2. Explore (read-only, via the Explore subagent)
Keep wide recon out of your main context; work from Explore's summary.
- **bug**: trace the path; narrow to a root cause or 2–3 candidates; best-effort
  confirm by analysis and state confidence (confirmed | high | medium | speculative).
  Don't write/run a test — `/build` writes the failing regression test first.
- **feature/chore**: what exists to reuse, what would change (file-level),
  constraints (security, permissions, compat).

Point Explore at this project's real docs/helpers so the item doesn't reinvent
existing features:
- `docs/web-mojo/README.md` (docs index) + the exact topic docs for the component
  involved (`View`, `Page`, `Model`, `Collection`, `Rest`, `Dialog`, `TableView`, …)
- `docs/agent/architecture.md` (repo layout / source map)
- `src/core/utils/` (existing helpers — check before proposing new ones)
- `.claude/rules/` (layer conventions: views, api, testing, theming)

## 3. Clarify
Resolve real ambiguity with the user before writing — the API/UI contract,
permissions, edge cases, and what's out of scope (features); the repro and
expected-vs-actual (bugs). Don't write a vague item; a good inbox item is
unambiguous enough to scope against.

## 4. Write planning/inbox/<slug>.md from planning/_template.md
- frontmatter: `id:` **blank** (a bare `id:` line — strip the template's comment,
  or intake refuses it), `type: <chosen>`, `title`, `priority`,
  `opened: <today>`, deps/related/links as known (leave `effort`/`owner` `TBD`)
- `## What & Why`, `## Acceptance Criteria`
- `## Repro` — bugs only (steps, Expected, Actual)
- `## Investigation` — bug: root cause / confidence / code path (`file:line`) /
  regression-test feasibility; feature/chore: what exists / what changes /
  constraints / related files

slug = title, lowercased, hyphenated.

## 5. Hand off
Print the path + chosen type and
`To scope it: /scope planning/inbox/<slug>.md (same session is fine — the item file carries everything; start fresh if this one is already long).`

## Forbidden
- Implementation code (a bug fix included)
- Allocating an id / editing `planning/.next_id` / running `scripts/intake.sh`
  (leave `id:` blank — `/scope` owns intake)
- Moving the file out of `planning/inbox/`
- Writing a vague item instead of resolving ambiguity with the user
- For a bug you can't confirm: say so and set confidence to `speculative` — don't
  force it
- Proposing separate admin-scoped REST endpoints (admins filter with query params)
