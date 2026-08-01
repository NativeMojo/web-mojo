# WEB-MOJO

This file is loaded automatically by Claude Code. Keep it under 150 lines.

## Start Every Thread Here
1. Read this file in full.
2. Read `memory.md`.
3. Pick your mode and invoke its skill — its instructions load automatically:
   - Filing new work (bug/feature/chore) → `/maestro-task`  (creates a board item at `stage=inbox`)
   - Triaging / planning an item → `/maestro-scope`
   - Implementing a planned item  → `/maestro-build`
   - Small single-session change, too small to track → `/maestro-vibe`
     (no workspec/stage flips; files one born-done history item at close-out)
   - Batch-running several filed items with one approval gate → `/maestro-auto`
   - (`/memory` shows project memory state.)
4. Read the item from the board — `get_board_item(<id>)` via the maestro MCP.
   The board is resolved from `.claude/maestro.json`.
5. Read `docs/web-mojo/README.md`, then the exact topic docs for what you touch.

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
- **Work lives on the maestro board, not in this repo.** The board item is the
  work record: state (stage, priority, owner) in its column values, the spec in
  its markdown description, progress on its activity trail. There is no
  `planning/` pipeline and no `WM-###` ids — items are referenced by board id.
- Board resolution comes from `.claude/maestro.json` — workspace `17`
  (NativeMojo), board `11` (**Inbox**), project `14` (web-mojo). Both boards are
  **shared with django-mojo** (project `12`); always set `project: 14` on items
  filed from this repo so they stay attributable.
- **There are TWO boards** (since 2026-07-31) — `.claude/maestro.json` names
  only the filing default, not the whole queue:
  - **Inbox `11`** — everything that is not security: bugs, features, chores.
  - **Security `37`** — all security work: exploitable weaknesses (XSS, injection,
    authz bypass, credential exposure), defense-in-depth hardening, and features
    whose *purpose* is a security control. Ambiguous → file here.
  Routing and the full protocol live in the workspace `nativemojo-board-conventions`
  rule doc (fetched via `get_workspace_context`) — read it before filing or building.
- **Enumerate BOTH boards whenever you list work** — picking something to scope or
  build, reporting what's open, checking WIP. `get_board(11)` alone hides every
  in-flight security item. Several web-mojo items already live on `37`.
- Stage is a column value, advanced only via `update_board_item`:
  `inbox → scoped/accepted → planned → building → review → done`, plus `parked`.
  **The "Accepted" stage has a different underlying value on each board** — `scoped`
  on Inbox, `accepted` on Security. Always match stage options **by value** from
  `get_board(<the board you are on>)`; never carry a value across. A cross-board
  `move_board_item` of an item at `scoped` silently lands it at `inbox`.
- **WIP = 1 per project is summed across both boards**, not per board.
- The `## Plan` section in the item description is the "designed" signal.
  `/maestro-build` refuses an item whose description has no `## Plan` — only
  `/maestro-scope` writes it.
- Never `/maestro-build` an item owned by someone else without asking, and never
  claim one silently — the owner column is the WIP claim.
- Scratch copies live in `planning/.cache/<id>.md` (gitignored); build-start
  snapshots in `planning/built/<id>.md`. These are maestro working files —
  the board remains the source of truth.
- `planning/mockups/{component}/` is **deliberately retained** — it survived the
  board migration. UI-heavy items still get a mockup approved (both themes)
  before the build starts; put it in a per-component subdir there, never a new
  root dir. Everything else under `planning/` is gone; don't recreate it.

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
- Git: never create a branch or worktree, and never push, without the user's
  explicit permission. Work in place on the current branch; commit finished work
  by explicit pathspec — never `git add -A` (`.claude/rules/git.md`).

## Layer Conventions → `.claude/rules/`
Rule files load automatically (layer rules are path-scoped via `globs:`):
- `core.md` — philosophy, imports, forbidden actions, delivery checklist
- `git.md` — no branches/worktrees/push; commit-on-finish by explicit pathspec
- `build-baseline.md` — green `npm test` baseline before the first edit
- `views.md` — View/Page lifecycle, data binding, actions/containers, templates
- `api.md` — Models, Collections, REST conventions, response handling
- `testing.md` — custom test runner, commands, regression rules, Chrome UI
- `theming.md` — light/dark theme conventions (Bootstrap tokens over hex)
- `docs.md` — where docs live, when to update, quick lookup

## Working with AI — What Works Here
- Safe to generate wholesale: new board-item workspecs (template in
  `.claude/skills/maestro-task/SKILL.md`); new isolated View/extension files
  following a sibling.
- Write incrementally (read surrounding code first): anything touching `View` /
  `Page` lifecycle, `Rest` response nesting (`resp.data.data`), Mustache template
  rendering, or CSS theme tokens in `src/core/css/`.
- Tests: `npm run test:unit` is the fast loop. The runner is custom
  (`node test/test-runner.js`) — not Jest CLI; there's no `--grep` for one file.
- Don't bulk-read `node_modules/`. On the board, fetch the one item you need with
  `get_board_item(<id>)` rather than pulling every description from `get_board`.

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
- [ ] Work committed by explicit pathspec (no push — `.claude/rules/git.md`)
- [ ] Board item landed at `review` (PR opened) or `done` (committed to main),
      with a closing comment on its activity trail

## Trust Order
When docs and code conflict:
1. `docs/web-mojo/` (authoritative framework docs)
2. Existing code patterns in the target area
3. `CHANGELOG.md` for behavioral intent
