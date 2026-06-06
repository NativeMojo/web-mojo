# WEB-MOJO — AI Developer Workflow

This guide explains how Claude Code is configured for this project. `CLAUDE.md`
is the auto-loaded source of truth; this is the human-facing tour.

## One work item, two skills

There is **one kind of work item** (a Markdown file with YAML frontmatter).
Bugs, features, and chores differ only by `type`. The **folder is the stage**:

```
/request  →  planning/inbox/  →  planning/confirmed/  →  planning/done/
 (capture)     (unscoped)         (scoped, has id)         (closed)
```

The skills that drive it:

| Command | Purpose |
|---------|---------|
| `/request <description>` | Chat front door. Files a feature/bug/chore: determines `type` itself, explores read-only (bug: best-effort confirms root cause), and writes an **un-ID'd** item to `planning/inbox/`. Does not allocate an id. |
| `/scope <file-or-description>` | Triage + plan. Owns intake: allocates the `ITEM-###` id, stamps frontmatter, moves `inbox/ → confirmed/`. Gets your sign-off on a plan. |
| `/build <confirmed-file>` | Implement a scoped item. Bugs get a failing regression test first. Runs tests, spawns review agents, closes `confirmed/ → done/`. |
| `/memory` | Show Claude Code project memory (read-only). |

Each phase runs in a separate session for clean context.

## Pipeline scripts (`scripts/`)

The deterministic, must-be-exact steps are scripts, not model-followed prose —
portable across macOS/BSD and GNU/Linux:

| Script | Does |
|--------|------|
| `scripts/board.sh [stage]` | Pipeline at a glance (id, type, priority, title, ready/blocked). |
| `scripts/intake.sh <inbox-file>` | Allocate next `ITEM-###`, stamp it, `git mv` to `confirmed/`, bump `.next_id`. (Called by `/scope`.) |
| `scripts/ready.sh <confirmed-file>` | `READY` / `BLOCKED` — are all `depends_on` in `done/`? (Called by `/build` pre-flight.) |
| `scripts/close.sh <confirmed-file>` | Stamp the Resolution block, `git mv` to `done/`. (Called by `/build`.) |

IDs come **only** from `intake.sh` via `planning/.next_id` — never hand-assigned
or reused. The folder is the stage; never hand-move files between stages.

## Planning directory

```
planning/
├── .next_id        — single bare integer: next ITEM id to assign
├── _template.md    — the one item template
├── inbox/          — new, unscoped items (no id)
├── confirmed/      — scoped, active items (have id + plan in ## Notes)
├── done/           — closed items (resolved history; never reformatted)
├── future/         — parked ideas
├── rejected/       — declined items, kept for rationale
├── mockups/        — HTML/UI reference sketches (not work items)
└── notes/          — audits and longer-form planning notes
```

See `planning/README.md` for the item format and reference notation.

## Rules (`.claude/rules/`)

Layer conventions load automatically; `CLAUDE.md` holds the always-on rules.

| File | Covers |
|------|--------|
| `core.md` | Import style, forbidden actions, philosophy, delivery checklist |
| `views.md` | View/Page lifecycle, data binding, actions, containers, templates, Bootstrap |
| `api.md` | Models, collections, REST conventions, response handling |
| `testing.md` | Custom test runner, commands, regression rules, Chrome UI testing |
| `theming.md` | Light/dark theme conventions (Bootstrap tokens over hex) |
| `docs.md` | Doc locations, when to update, quick lookup |

## Agents (`.claude/agents/`)

Spawned in parallel by `/build` after implementation:

| Agent | Purpose | Can edit? |
|-------|---------|-----------|
| `test-runner` | Run full test suite, fix trivial errors | Yes (production code only) |
| `docs-updater` | Update docs from the diff | Yes (docs only) |
| `security-review` | Review the diff for security concerns | No (read-only) |

## Git

Never create a branch, commit, or push without explicit permission. Work on the
current branch. `scripts/close.sh` only `git mv`s the item file — it does not commit.

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
