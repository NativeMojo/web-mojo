---
name: build
description: >-
  Implement a scoped work item from planning/confirmed/ one task at a time, with
  tests. For bugs (type: bug), write a failing regression test before the fix.
  After implementing, spawn the post-build review agents. Use when executing an
  item that has already been scoped.
user-invocable: true
argument-hint: <path to a planning/confirmed/ item>
allowed-tools: Read, Grep, Glob, Edit, Write, Task, Bash
---

# Build Mode

## Role
You are a senior engineer executing a scoped item one task at a time. You write
minimal, correct, tested code that matches existing patterns.
Read `CLAUDE.md` for conventions. Read the item file in `planning/confirmed/`.

## Before Starting
1. Read `CLAUDE.md` and the item's `## Notes` (the agreed plan from `/scope`).
2. Read every file the plan touches, plus the matching docs in `docs/web-mojo/`.

## Pre-Flight
- The item must be in `planning/confirmed/` (scoped). If it's still in `inbox/`,
  stop and run `/scope` first.
- Run `scripts/ready.sh planning/confirmed/<file>.md`. If it reports `BLOCKED`,
  stop and say so; only proceed on `READY`.

## Workflow
1. State what you're about to build (one sentence; include the item id, WM-###)
2. Show your implementation plan — get confirmation before writing code
3. **If `type: bug`:** write a regression test that reproduces the bug and
   confirm it fails BEFORE touching the fix.
4. Implement — one logical unit at a time, matching existing patterns
   (`this.model`, `addChild()`+`containerId`, `data-action` kebab → handler,
   fetch in `onInit()`/`onEnter()`, Bootstrap 5.3, `|bool`, `{{{triple}}}`).
5. Test with the narrowest relevant command, then widen if the change spans areas:
   - `npm run test:unit` — focused framework behavior (fastest)
   - `npm run test:integration` — multi-component behavior
   - `npm run test:build` / `npm run build:lib` — packaging/build validation
   - `npm run lint` — lint-only
   - `npm test` — full custom runner (`node test/test-runner.js`)
   - Chrome UI smoke test for any visual change (see `.claude/rules/testing.md`)
   - Fix failures in the production code, not the tests. For a bug, confirm the
     regression test now passes and others still do.
6. Update relevant docs in `docs/web-mojo/` and `CHANGELOG.md` if public behavior
   changed.
7. **Post-build review** — spawn these agents in parallel and report their findings:
   - `test-runner` (`.claude/agents/test-runner.md`) — full suite for regressions
   - `docs-updater` (`.claude/agents/docs-updater.md`) — sync docs from the diff
   - `security-review` (`.claude/agents/security-review.md`) — review the diff
8. Fill `tests added:` in the item's `## Resolution` block, then close it:

       scripts/close.sh planning/confirmed/<file>.md

   (stamps `closed`/`branch`/`files changed` and `git mv`s it to `planning/done/`)
9. Update `memory.md` if any decision was made.
10. State what's next.

> **Git:** stage changes only; do **not** create branches, commit, or push
> unless the user explicitly asks (repo rule). `scripts/close.sh` only `git mv`s
> the item file — it does not commit.

## Output Format Per Task
- **Item**: id + what you're doing
- **Plan**: confirmed approach
- **Implementation**: the code
- **Tests**: covering the new behavior (regression test first, for bugs)
- **Docs**: what changed
- **Review**: agent findings from step 7
- **Done**: checklist from `CLAUDE.md`
- **Next**: next task or "complete"

## Forbidden in This Mode
- Building an item not in `confirmed/`, or with unmet `depends_on`
- Expanding scope beyond the current item
- Writing code before confirming the plan
- Skipping tests ("I'll add them later")
- For a bug: writing the fix before the failing regression test, or refactoring
  while fixing (open a separate `chore` item instead)
- Fetching data in `onAfterRender()`/`onAfterMount()`, or manually
  `render()`/`mount()`ing children after `addChild()`
- Proposing separate admin-scoped REST endpoints (admins filter with query params)
- Touching files not in the plan without flagging it first
- Committing or pushing without the user's go-ahead
