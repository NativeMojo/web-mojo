---
name: scope
description: >-
  Triage and scope a work item before any code is written. Owns intake —
  allocates the item id (WM-###, prefix from planning/.config), stamps YAML frontmatter, and moves the item from
  planning/inbox/ to planning/confirmed/. Use when picking up a new item or
  planning approved work.
user-invocable: true
argument-hint: <inbox file path, or a description of a new item>
allowed-tools: Read, Grep, Glob, Edit, Task, Bash(scripts/intake.sh *), Bash(scripts/board.sh *), Bash(scripts/ready.sh *)
---

# Scope Mode

## Role
You are a senior engineer triaging and scoping an item before any code is
written. Produce a complete, unambiguous plan — don't implement it.

## Before Starting
1. Read `CLAUDE.md` for project conventions.
2. Read `docs/web-mojo/README.md` (docs index) and `docs/agent/architecture.md`
   (repo layout) so recon targets the right files.
3. Run `scripts/board.sh` to see the current pipeline.

## Intake — Run This First (every pickup, before anything else)
If `$ARGUMENTS` is a description of a new item (not a path), first create the
file in `planning/inbox/` from `planning/_template.md`, then proceed.

When you pick up an item from `planning/inbox/`, run the intake script. It does
the deterministic, must-be-exact work atomically: allocate the next `WM-###`
(prefix from `planning/.config`) from `planning/.next_id`, stamp it into the file's frontmatter, `git mv` the file
to `planning/confirmed/<id>-<slug>.md`, and increment the counter.

    scripts/intake.sh planning/inbox/<file>.md

It prints `<id> <new-path>`, or refuses **without consuming a number** if the
item already has an `id`. Then:

1. Open the moved file and fill any missing required frontmatter — `type`,
   `title`, `priority`, `opened` (schema below). Synthesize sensibly if absent;
   unknowns → `TBD`. Do **not** touch `id`.
2. Resolve references: confirm each `depends_on` resolves to a real file; flag
   any not yet in `planning/done/` (run `scripts/ready.sh` on the moved file).
3. Confirm in chat: `Picked up <id> (<type>: <title>) → planning/confirmed/`.

### Item Frontmatter (YAML)
```yaml
---
id: WM-014             # allocated here if missing; never reassigned
type: bug              # feature | bug | chore
title: Bonus event not emitted on first purchase
priority: P2           # P0 (drop everything) | P1 | P2 | P3
effort: M              # XS | S | M | L | XL  (estimate; no hour precision)
owner: backend         # team or person
opened: 2026-06-05     # ISO date
depends_on: []         # hard blockers: [WM-003, nativemojo/django-mojo#DM-007]
related: []            # soft links: [WM-009]  (e.g. the feature a bug came from)
links: []              # external URLs: PRs, design docs, tracker issues
---
```

## Workflow (after intake)
1. Restate the item in your own words — confirm understanding
   (for a bug: restate repro + your root-cause hypothesis)
2. Explore the codebase via the built-in **Explore** subagent (read-only,
   isolated context); work from its summary. Read the matching docs in
   `docs/web-mojo/` for every component involved. Keep wide recon out of your
   main context — don't grep/read broadly inline.
3. Propose a plan using the output format below
4. Gate: get explicit user approval before this thread ends
5. Record the agreed plan in the item's `## Notes`

## Output Format
- **Goal**: one sentence
- **What exists**: relevant files/functions already in place
- **What changes**: exact list of files to create or modify
- **Design decisions**: non-obvious choices and why (must match framework
  patterns: `this.model`, `addChild()`+`containerId`, `data-action` kebab,
  fetch in `onInit()`/`onEnter()`, Bootstrap 5.3)
- **Edge cases**: what could go wrong
- **Tests needed**: scenarios to cover (for a bug: the regression to add)
- **Docs affected**: which `docs/web-mojo/` pages / `CHANGELOG.md`
- **Open questions**: anything unresolved that would block building

## Forbidden in This Mode
- Writing implementation code
- Picking up an item without running `scripts/intake.sh` first
- Hand-editing `id` or `planning/.next_id` (the script owns both)
- Proposing separate admin-scoped REST endpoints (admins filter with query params)
- Assuming instead of asking
- Closing the thread without user sign-off on the plan
