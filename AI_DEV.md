# AI Development Workflow — web-mojo

This project uses Claude Code with structured skills, rules, agents, and helper
scripts for AI-assisted development. `CLAUDE.md` is the auto-loaded source of
truth; this is the human-facing command reference. Architecture + portability
map: [`WORKFLOW.md`](WORKFLOW.md).

There is **one kind of work item**. Bugs, features, and chores differ only by a
`type` field — not by folder, template, counter, or mode. The folder an item
lives in *is* its stage, and items advance only via the helper scripts.

## Quick Start

Skills are invoked with `/<name>` in Claude Code.

### See the Board
```
scripts/board.sh                 # active pipeline: inbox / confirmed / in_progress / done
scripts/board.sh confirmed       # filter to one stage
scripts/board.sh future          # a parking folder
```
One cheap line per item (id, stage, type, priority, state, title) —
only the output costs tokens, not the files it scans.

### Request New Work (chat front door)
```
/request <what you want / what's broken>   # writes planning/inbox/<slug>.md
```
`/request` (PR-style — a request for a feature, bug, or chore) determines the
`type` itself, captures a structured, **un-ID'd** item into `planning/inbox/`,
explores and clarifies (for a bug, best-effort confirms the root cause), but does
**not** implement, allocate an id, or move folders — `/scope` runs intake next.
Drop a file from `planning/_template.md` by hand for the same effect.

### Scope an Item
```
/scope <path to an inbox item, or a description of new work>
```
Owns triage + intake. A pre-intake skim may push back immediately (duplicate /
not-now → `future/` or `rejected/` with user sign-off — no ID consumed).
Surviving items get `scripts/intake.sh`, which allocates the next `WM-###`
(prefix from `planning/.config`) from `planning/.next_id`, stamps the YAML
frontmatter, moves the file `inbox/ → confirmed/`, and bumps the counter —
atomically. Then **tiered scoping**: a read-only sonnet drafter sub-agent
verifies the request's claims against the current tree and returns a verdict
(`proceed` | `proceed-reduced` | `already-covered` | `not-now` |
`needs-clarification`) plus, for proceed verdicts, a full draft plan with
`file:line` evidence; the session (run scoping at the review tier — fable)
verifies the load-bearing claims first-hand, stamps
`build_strategy`/`build_model`, gates with the user (UI-heavy items also gate on
mockups in `planning/mockups/`), writes the **self-contained `## Plan`**, deletes
the `PLAN PENDING` marker, and commits by explicit pathspec. No code is written.
P0/P1-security or L/XL items skip the drafter (the session scopes directly).
Named `/scope` (not `/plan`) to avoid Claude Code's built-in plan mode.

### Build It
```
/build <path to a confirmed item, or its item id (WM-###)>
```
Pre-flight refuses an `UNPLANNED` item (one still carrying the `PLAN PENDING`
marker — run `/scope` first) and `scripts/ready.sh` gates on `depends_on`. It works
**in place** (no branch/worktree — see below). It first **claims** the item with
`scripts/start.sh` (`confirmed/ → in_progress/`, WIP = 1, resume-safe), captures a
green `npm test` baseline, then implements (a failing regression test first, for
bugs), runs tests, updates docs + the examples portal, commits (no push), spawns
three agents in parallel — full test suite, docs, security review — and runs
`scripts/close.sh`, which stamps the Resolution block (closed/branch/files
changed) and moves the file `in_progress/ → done/`.

Routing: `/scope` may stamp optional `build_strategy` (`inline` | `delegate` |
`fanout`) and `build_model` (`sonnet` | `opus` | `fable`) frontmatter. `delegate`
hands the whole build to one sub-agent on the chosen model; `fanout` (L/XL with
disjoint file partitions only) parallelizes implementation while the orchestrator
alone runs tests. Invariant: exactly one entity ever runs tests per build — the
session (inline), the delegate, or the fanout orchestrator.

### Show Memory
```
/memory
```
Displays Claude Code's local project memory for this repo (read-only).

## Workflow Chain

Each step is ideally its own Claude session. The file carries context between sessions.

```
new work
  |
  v
/request <description>
  |  determines type (bug|feature|chore); explore/clarify;
  |  writes an un-ID'd item to planning/inbox/ (id blank)
  |  (or drop a file from planning/_template.md by hand)
  v
/scope <item>
  |  scripts/intake.sh: WM-### + frontmatter + inbox/ -> confirmed/ + counter bump
  |  writes a self-contained ## Plan and deletes the PLAN PENDING marker
  v
/build <item>
  |  scripts/start.sh: claim confirmed/ -> in_progress/ (WIP=1, resume-safe)
  |  scripts/ready.sh pre-flight (READY/BLOCKED); refuses UNPLANNED
  |  green npm test baseline; implements; writes/runs tests; commits; then
  |  spawns 3 agents in parallel:
  |    - test-runner: runs full test suite, fixes trivial errors, reports complex ones
  |    - docs-updater: reads git diff, updates docs/web-mojo/ + CHANGELOG.md
  |    - security-review: checks diff for permission gaps, escaping, auth issues
  |  scripts/close.sh: stamp Resolution + in_progress/ -> done/
  v
Done.
```

**Why separate sessions?** Each phase benefits from a fresh context window.
Scoping context is captured in the file, so the build session starts clean.

## Helper Scripts (`scripts/`)

Deterministic, portable (macOS BSD + GNU/Linux) helpers so the must-be-exact
work isn't model-followed prose. (The other files in `scripts/` are Node build
tooling, unrelated to the workflow.)

| Script | Purpose |
|---|---|
| `intake.sh` | Allocate ID, stamp frontmatter, move `inbox/ → confirmed/`, bump counter (atomic). Refuses to consume a number if the item already has an id; reconciles against the tree so a stale counter can't dup. |
| `start.sh` | Claim a planned item: move `confirmed/ → in_progress/`. Idempotent resume; enforces WIP = 1; refuses an `UNPLANNED` item. Called automatically by `/build`. |
| `board.sh` | Pipeline at a glance. `board.sh [inbox\|confirmed\|in_progress\|done\|future\|rejected]`. Confirmed items show `UNPLANNED` / `ready` / `BLOCKED`; in_progress shows `wip`. |
| `ready.sh` | Dependency gate — `READY` (exit 0) / `BLOCKED` (exit 1) for an item's `depends_on`. |
| `close.sh` | Route an item to a terminal/parking folder: `close.sh <file> [done\|future\|rejected]`. `done` (default, from `in_progress/`) stamps Resolution (closed/branch/files changed) and moves to `done/`; `future`/`rejected` are plain moves (no stamp). |

## Planning Directory

```
planning/
  .config      Workflow config (PREFIX=WM — the item-ID prefix)
  .next_id     Next item number to assign (single bare integer)
  _template.md The one item template (YAML frontmatter + Plan scaffold)
  inbox/       New, unscoped items (no id yet)
  confirmed/   Scoped + planned items (have id + plan, from /scope)
  in_progress/ Actively being built (claimed by /build via start.sh; WIP = 1)
  done/        Closed items (from /build via close.sh; never reformatted)
  future/      Parked ideas — not ready to scope (just a folder)
  rejected/    Declined items, kept for rationale (just a folder)
  mockups/     HTML/UI sketches per component (approval gate for UI-heavy items)
  notes/       Audits / longer-form planning notes (reference, not work items)
```

`future/` and `rejected/` are plain parking folders — no id is assigned. Park or
decline an item with `scripts/close.sh <file> future` / `... rejected` (a plain
move, no Resolution stamp); move it back to `inbox/` by hand to revive it (intake
assigns its id then). See `planning/README.md` for the item format and reference
notation.

### Item Lifecycle

1. **Intake & Plan** (`/scope` → `scripts/intake.sh`): allocates the ID, stamps
   frontmatter, moves to `confirmed/`, then writes a self-contained `## Plan` and
   deletes the `PLAN PENDING` marker. Until that marker is gone the item is
   `UNPLANNED` and `/build` refuses it.
2. **Build** (`/build` → `scripts/start.sh`): claims the item `confirmed/ →
   in_progress/` (WIP = 1, resume-safe), then implements.
3. **Resolution** (`/build` → `scripts/close.sh`): fills `## Resolution`, moves
   `in_progress/ → done/`.

IDs are assigned only by `scripts/intake.sh`, never by hand, never reused. The
folder is the stage — there is no `stage` field.

## Rules (Automatic)

Rules in `.claude/rules/` are loaded automatically. You do not invoke them —
Claude follows them whenever they apply. Layer rules are path-scoped via
`globs:` frontmatter, so they load only when Claude edits matching files.

| Rule | Scope | What It Covers |
|---|---|---|
| `core.md` | Always | philosophy, `@core`/`@ext` imports, `this.model`, forbidden actions, delivery checklist |
| `git.md` | Always | No branches/worktrees without permission (planning state lives in this tree); commit-on-finish by explicit pathspec; never push |
| `build-baseline.md` | Always | Green `npm test` baseline before the first edit of any build |
| `docs.md` | Always | Doc locations, when to update, `CHANGELOG.md` |
| `views.md` | `src/core/{views,forms,pages}/`, `src/extensions/` | View/Page lifecycle, data binding, actions/containers, templates |
| `api.md` | Rest/Model/Collection + `src/core/models/` | Models, Collections, REST conventions, response nesting |
| `testing.md` | `test/` | Custom runner, commands, mocks/matchers, regression rules, Chrome UI |
| `theming.md` | views/extensions/css | Light/dark theme conventions (Bootstrap tokens over hex) |

## Agents (Automatic Post-Build)

Agents in `.claude/agents/` run in isolated context windows. The `/build` skill
spawns them automatically after committing.

| Agent | Model | Purpose | Can edit? |
|---|---|---|---|
| `test-runner` | sonnet | Runs full test suite. Fixes trivial errors (syntax, imports). Reports complex failures without fixing them. | Yes (production code only) |
| `docs-updater` | sonnet | Reads git diff. Updates `docs/web-mojo/` + `CHANGELOG.md`; flags missing `examples/portal/` coverage. | Yes (docs only) |
| `security-review` | opus | Reviews git diff for permission gaps, data exposure, escaping/injection risks, auth issues, secret leakage. | No (read-only) |

## Item File Format

Items use the YAML frontmatter in `planning/_template.md`, with sections added progressively:

1. **Intake** (`/request`): frontmatter (`id` blank, `type`, `title`, `priority`,
   `opened`, `depends_on`, `related`, `links`), `## What & Why`,
   `## Acceptance Criteria`, `## Repro` (bugs), `## Investigation`.
2. **Plan** (`/scope`): the id + full frontmatter (`effort`, `owner`,
   `build_strategy`, `build_model`), and the self-contained `## Plan`
   (Goal · Context · Changes · Design decisions · Edge cases · Tests · Docs ·
   Open questions) — the `PLAN PENDING` marker is deleted.
3. **Resolution** (`/build` → `close.sh`): `## Resolution` with closed date,
   branch, files changed, tests added.

This progressive format means every resolved file in `planning/done/` tells the
full story from intake to fix.

## Git

Never create a branch or worktree, and never push, without explicit permission.
Work in place on `main`. Commit when a request is finished — by explicit
pathspec, never `git add -A` (see `.claude/rules/git.md`).

## Key framework conventions

- **Data**: `this.model` is the primary data object. JS: `this.model.get('field')`. Templates: `{{model.field}}`.
- **Actions**: `data-action="kebab-case"` → `onActionKebabCase(event, element)`.
- **Containers**: `data-container="name"` → child view with `containerId: 'name'`.
- **Lifecycle**: Fetch in `onInit()` or action handlers. Per-visit logic in `onEnter()`. Never fetch in `onAfterRender()`.
- **Children**: Use `addChild()` with `containerId`. Never manually `render()`/`mount()`.
- **Templates**: `|bool` for booleans, `{{{triple}}}` for HTML, quoted formatter args.
- **Imports**: `@core` and `@ext` inside framework source. Never import `web-mojo` internally.
- **REST API**: Standard CRUD for all access. Admins filter with query params. No separate admin endpoints.
- **Styling**: Bootstrap 5.3 + Bootstrap Icons; light and dark themes from day one.
- **Tests**: Custom runner (`npm test` / `node test/test-runner.js`). Regression tests must fail before the fix.
