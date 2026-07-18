---
name: build
description: >-
  Implement a scoped work item from planning/confirmed/ one task at a time, with
  tests. For bugs (type: bug), write a failing regression test before the fix.
  After committing, spawn the post-build agents (test-runner, docs-updater,
  security-review). Use when executing an item that has already been scoped.
user-invocable: true
argument-hint: <path to a planning/confirmed/ item, or its id (WM-###)>
allowed-tools: Read, Grep, Glob, Edit, Write, Task, Bash
---

# Build Mode

## Role
You are a senior engineer executing a scoped item one task at a time. You write
minimal, correct, tested code that matches existing patterns.
Read `CLAUDE.md` for conventions. Read the item file, then every file the
`## Plan` touches, plus the matching docs in `docs/web-mojo/`.

## Pre-Flight
- The item must be in `planning/confirmed/` (scoped) or already in
  `planning/in_progress/` (resuming a half-done build). If it's still in `inbox/`,
  stop and run `/scope` first.
- The item must be **planned**: its `## Plan` must NOT contain the `PLAN PENDING`
  marker (`grep -q 'PLAN PENDING' <file>` must fail). If present, it was intook but
  never designed — stop and run `/scope`. Build from the `## Plan`; it's meant to be
  self-contained, so you shouldn't need to re-explore from scratch.
- Run `scripts/ready.sh <file>`. If it reports `BLOCKED`, stop and say so; only
  proceed on `READY`.
- **Establish a green baseline BEFORE the first edit** (see
  `.claude/rules/build-baseline.md`): run `npm test` (the full custom runner) and
  record total/passed/failed + any pre-existing failures in the item's `## Notes`.
  If the baseline is not all-green, STOP and tell the user — do not build on red
  unless they say to. A green baseline means every failure after your change is
  yours to fix.
  **Ordering in a shared tree:** run the claim (`scripts/start.sh`, Workflow
  step 1) BEFORE the baseline — the WIP lock doubles as the test-suite lock
  against concurrent builder sessions; a baseline captured outside the claim can
  interleave with another session's edits and prove nothing.
- Work **in place** on the current branch. Do **not** create a branch or git
  worktree — the planning pipeline (stage folders, id counter, WIP claim) lives in
  this working tree, so parallel checkouts fork it (see `.claude/rules/git.md`).

## Execution Strategy (from `build_strategy` / `build_model` frontmatter)

Absent fields mean `inline` + the session model; the user can override either at
build time. **Test-lock invariant — exactly one entity ever runs tests per
build**: the session (inline), the delegate (delegate), or the orchestrator
(fanout). The baseline comparison is only meaningful when one entity's edits are
the only variable — never let two entities interleave suite runs against the one
shared working tree. Sub-agents inherit the session's permission config; a
background builder *pauses* on any command the session wouldn't already allow, so
delegate/fanout work best when the session's mode covers `npm test`, `npm run
lint`, `npm run examples:registry`, and `git commit`.

- **inline** — run this skill in-session, exactly as the Workflow below.
- **delegate** — spawn ONE builder sub-agent (model = `build_model`) that executes
  this entire skill end-to-end: claim → baseline → implement → test → docs →
  commit → post-build agents → close. Its prompt must point it at this file,
  `CLAUDE.md`, `.claude/rules/`, and the item file, and state explicitly: the
  item's `## Plan` is user-approved (skip the interactive confirmation gate);
  work in place on main (never branch/worktree); it is the ONLY test runner; the
  commit trailer names **its own** model; commits go by explicit pathspec (see
  `.claude/rules/git.md`); never push; if the baseline is red, STOP and report
  back instead of building. While it runs, the orchestrator stays hands-off the
  working tree — no edits, no test runs. On completion, verify (item Resolution,
  its reported suite summary, `git log -p` spot-check) and relay.
  If the sub-agent cannot spawn the post-build agents itself, it performs those
  three passes inline, sequentially.
- **fanout** — L/XL items ONLY, and only when the plan defines **disjoint file
  partitions** (refuse otherwise). Orchestrator: claim + record the baseline
  BEFORE spawning; spawn one builder per partition (all share this one working
  tree — worktrees are forbidden), each implements code + tests for its partition
  and **NEVER runs the suite** (`npm test` / `node test/test-runner.js` — state
  this in every builder prompt); integrate their reports, then run targeted tests
  and the full suite yourself; loop failures back to the owning builder; make the
  single commit; then post-build agents and close — all orchestrator-side.

## Workflow
1. **Claim it:** `scripts/start.sh <file>` — moves it `confirmed/ → in_progress/`
   (no-op if you're resuming one already there; refuses if another item is already
   in progress — finish or close that first). State what you're about to build
   (one sentence; include the item id, WM-###) and suggest naming the session:
   `Tip: /rename <id> <short-title>` (user-only; just print the tip). From here,
   operate on the `planning/in_progress/<file>.md` path.
2. Show your implementation plan — get confirmation before writing code. Read
   every file you'll touch first; no blind edits.
3. **If `type: bug`:** write a regression test that reproduces the bug and
   confirm it FAILS before touching the fix (custom runner — see
   `.claude/rules/testing.md`).
4. Implement — one logical unit at a time, matching existing patterns
   (`this.model`, `addChild()`+`containerId`, `data-action` kebab → handler,
   fetch in `onInit()`/`onEnter()`, Bootstrap 5.3, both themes, `|bool`,
   `{{{triple}}}`). The `.claude/rules/` files load automatically; follow them.
5. Write/finish tests immediately after implementation, not at the end. Use the
   narrowest relevant command for the loop, then widen:
   - `npm run test:unit` — focused framework behavior (fastest)
   - `npm run test:integration` — multi-component behavior
   - `npm run test:build` / `npm run build:lib` — packaging/build validation
   - `npm run lint` — lint-only
   - `npm test` — full custom runner (the baseline comparison)
   - Chrome UI smoke test for any visual change, under **both themes**
     (see `.claude/rules/testing.md`, `.claude/rules/theming.md`)
   - Fix failures in the production code, not the tests. For a bug, confirm the
     regression test now passes and others still do.
6. Update relevant docs in `docs/web-mojo/` and `CHANGELOG.md` if public behavior
   changed. If a public component or option changed, add/update the runnable
   example in `examples/portal/` (follow `examples/portal/README.md`, then
   `npm run examples:registry`).
7. Git commit (NO push). Stage specific files by name — never `git add -A`;
   include regenerated files (`src/templates.js`, model indexes, version files)
   when the flow produced them (see `.claude/rules/git.md`).
8. Spawn the post-build agents in parallel and report their results:
   - **test-runner** — full test suite, beyond your targeted tests
   - **docs-updater** — read the diff, update `docs/web-mojo/` + `CHANGELOG.md`
   - **security-review** — review the diff for permission/escaping/auth issues
9. Fill `tests added:` in the item's Resolution block, then run
   `scripts/close.sh planning/in_progress/<file>.md` (stamps closed/branch/files
   changed and moves it `in_progress/ → done/`).
10. Update `memory.md` if any decision was made.
11. State what's next.

## Output Format Per Task
- **Item**: id + what you're doing
- **Plan**: confirmed approach
- **Implementation**: the code
- **Tests**: covering the new behavior (regression test first, for bugs)
- **Docs**: what changed
- **Review**: agent findings from step 8
- **Done**: checklist from `CLAUDE.md`
- **Next**: next task or "complete"

## Forbidden in This Mode
- Building an item not in `confirmed/` or `in_progress/`, still carrying the
  `PLAN PENDING` marker (unplanned), or that `scripts/ready.sh` reports BLOCKED
- Starting a new item while another sits in `in_progress/` (WIP = 1; finish or
  close it first)
- Creating a branch or git worktree (work in place) unless the user explicitly asked
- Expanding scope beyond the current item
- Writing code before confirming the plan
- Skipping tests ("I'll add them later")
- For a bug: writing the fix before the failing regression test, or refactoring
  while fixing (open a separate `chore` item instead)
- Fetching data in `onAfterRender()`/`onAfterMount()`, or manually
  `render()`/`mount()`ing children after `addChild()`
- Proposing separate admin-scoped REST endpoints (admins filter with query params)
- Touching files not in the plan without flagging it first
- Pushing to remote, or staging with `git add -A` / `git add .`
