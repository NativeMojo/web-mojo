# WEB-MOJO

This file is loaded automatically by Claude Code. Keep it under 150 lines.

## Start Every Thread Here
1. Read this file in full.
2. Read `memory.md`.
3. Run `scripts/board.sh` — the current pipeline at a glance (inbox/confirmed/done).
4. Pick your mode and invoke its skill — its instructions load automatically:
   - Filing new work (bug/feature/chore) → `/request`  (writes an un-ID'd item to `planning/inbox/`)
   - Triaging / planning an item → `/scope`
   - Implementing a scoped item  → `/build`
   - (`/memory` shows project memory state.)
5. Read the item:
   - New, unscoped → `planning/inbox/`
   - Scoped, active → `planning/confirmed/`
6. Read `docs/web-mojo/README.md`, then the exact topic docs for what you touch.

## Project Map
WEB-MOJO is the source repo for a browser-side JavaScript framework/library
published to npm as `web-mojo`. Core runtime classes live in `src/core/`
(`View`, `Page`, `Model`, `Collection`, `Rest`, …); optional features in
`src/extensions/`. UI is Mustache templates + Bootstrap 5.3 (light **and** dark
themes). A custom test harness lives in `test/` (`node test/test-runner.js`).
Authoritative framework docs are in `docs/web-mojo/`; repo layout in
`docs/agent/architecture.md`.

## Non-Negotiable Rules
Workflow scaffolding (imposed by this workflow):
- IDs come **only** from `/scope` via `scripts/intake.sh` (`planning/.next_id`).
  Every item gets `WM-###` — the prefix comes from `planning/.config`
  (`PREFIX=WM`; scripts default to `ITEM` when the file is absent). Never
  hand-assign, edit the counter by hand, or reuse an ID.
- The folder is the stage. Advance an item only by moving its file
  `inbox/` → `confirmed/` (via `scripts/intake.sh`) → `done/` (via
  `scripts/close.sh`). There is no `stage` field.
- One item = one file. `type` (`feature | bug | chore`) distinguishes them.
- Never `/build` an item whose `depends_on` aren't all in `planning/done/`
  (`scripts/ready.sh` checks this).

Project rules (verified in the codebase — see `.claude/rules/` for detail):
- The primary data object for a view is `this.model` — never `this.runner`,
  `this.device`, or other ad-hoc names. Templates read `{{model.field}}`.
- Internal framework code uses `@core` / `@ext` imports. Never import `web-mojo`
  from inside framework source.
- Fetch data in `onInit()`, `onEnter()` (cached pages), or action handlers —
  never in `onAfterRender()` / `onAfterMount()`.
- Use `addChild()` with `containerId`; never manually `render()`/`mount()` a
  child after adding it.
- REST is standard CRUD for all access; admins filter with query params. Never
  add separate admin-scoped endpoints.
- New components must render correctly in both light and dark themes from day one
  (`.claude/rules/theming.md`).
- Git: never create a branch, commit, or push without the user's explicit
  permission. Work on the current branch.

## Layer Conventions → `.claude/rules/`
Layer-specific conventions are path-scoped rule files that load automatically:
- `core.md` — philosophy, imports, forbidden actions, delivery checklist
- `views.md` — View/Page lifecycle, data binding, actions/containers, templates
- `api.md` — Models, Collections, REST conventions, response handling
- `testing.md` — custom test runner, commands, regression rules, Chrome UI
- `theming.md` — light/dark theme conventions (Bootstrap tokens over hex)
- `docs.md` — where docs live, when to update, quick lookup

## Working with AI — What Works Here
- Safe to generate wholesale: new `planning/inbox/` items from
  `planning/_template.md`; new isolated View/extension files following a sibling.
- Write incrementally (read surrounding code first): anything touching `View` /
  `Page` lifecycle, `Rest` response nesting (`resp.data.data`), Mustache template
  rendering, or CSS theme tokens in `src/core/css/`.
- Tests: `npm run test:unit` is the fast loop. The runner is custom
  (`node test/test-runner.js`) — not Jest CLI; there's no `--grep` for one file.
- Don't `ls` or bulk-read `planning/done/` (120+ resolved items) or `node_modules/`.

## Pre-Edit Checklist
Before modifying any file:
- [ ] Read the file in full, not just the target function
- [ ] Read one nearby similar file, and the matching `docs/web-mojo/` topic
- [ ] Confirmed no other file imports the thing being changed
- [ ] Know what layer this belongs to (which `.claude/rules/` applies)
- [ ] Know what test covers it (or why none does)

## Done Criteria
A task is closed only when:
- [ ] All changed code follows the conventions in this file and `.claude/rules/`
- [ ] Tests pass and cover the new behavior (regression test, if a bug)
- [ ] No new lint/type errors introduced (`npm run lint`)
- [ ] Docs / `CHANGELOG.md` updated if public behavior changed
- [ ] Runnable example in `examples/portal/` added/updated if a public
      component or option changed (`examples/portal/README.md`, then
      `npm run examples:registry`)
- [ ] `memory.md` updated if a decision was made
- [ ] Item closed with `scripts/close.sh` (file now in `planning/done/`)

## Trust Order
When docs and code conflict:
1. `docs/web-mojo/` (authoritative framework docs)
2. Existing code patterns in the target area
3. `CHANGELOG.md` for behavioral intent
