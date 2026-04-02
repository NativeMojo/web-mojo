# WEB-MOJO — AI Developer Workflow

This guide explains how Claude Code is configured for this project.

## Quick Start

| Command | Purpose |
|---------|---------|
| `/bug <description>` | Investigate a bug, write issue file |
| `/request <description>` | Scope a feature, write request file |
| `/plan <path>` | Design implementation for an issue/request |
| `/build <path>` | Implement, test, commit, review |
| `/memory` | Show Claude Code project memory |

## Workflow Chain

```
/bug or /request  →  planning/issues/ or planning/requests/
        ↓
/plan <file>      →  adds ## Plan section, status → "planned"
        ↓
/build <file>     →  implements, tests, commits, spawns agents
        ↓
                      moves file to planning/done/
```

Each phase runs in a separate session for clean context.

## Planning Directory

```
planning/
├── issues/       — open bugs (from /bug)
├── requests/     — open feature requests (from /request)
├── done/         — resolved items (from /build)
├── future/       — deferred ideas
└── rejected/     — declined items
```

### File Template (Progressive Sections)

Files grow as they move through the workflow:

1. **Investigation** — added by `/bug` or `/request` (status: open)
2. **Plan** — added by `/plan` (status: planned)
3. **Resolution** — added by `/build` (status: done, moved to `planning/done/`)

## Rules (.claude/rules/)

| File | Scope | Covers |
|------|-------|--------|
| `core.md` | All files | Import style, forbidden actions, philosophy, trust order, delivery checklist |
| `views.md` | `src/core/views/`, `src/core/forms/`, `src/core/pages/`, `src/extensions/` | View/Page lifecycle, data binding, actions, containers, template rules, Bootstrap |
| `api.md` | `src/core/Rest.js`, `src/core/Model.js`, `src/core/Collection.js`, `src/core/models/` | Models, collections, REST conventions, response handling |
| `testing.md` | `test/` | Custom test runner, test commands, regression test rules, Chrome UI testing |
| `docs.md` | All files | Doc locations, when to update, quick lookup table |

Rules load automatically based on file globs — no need to invoke them.

## Skills (.claude/skills/)

| Skill | Purpose | Output |
|-------|---------|--------|
| `/bug` | Investigate and document bugs | `planning/issues/<slug>.md` |
| `/request` | Explore and document feature requests | `planning/requests/<slug>.md` |
| `/plan` | Design implementation approach | Appends `## Plan` to file |
| `/build` | Implement, test, commit, review | Appends `## Resolution`, moves to `planning/done/` |
| `/memory` | Show Claude Code memory state | Read-only display |

## Agents (.claude/agents/)

Spawned automatically by `/build` after committing:

| Agent | Purpose | Can Edit? |
|-------|---------|-----------|
| `test-runner` | Run full test suite, fix trivial errors | Yes (production code only) |
| `docs-updater` | Update docs from git diff | Yes (docs only) |
| `security-review` | Review diff for security concerns | No (read-only) |

## Key Framework Conventions

- **Data**: `this.model` is the primary data object. JS: `this.model.get('field')`. Templates: `{{model.field}}`.
- **Actions**: `data-action="kebab-case"` → `onActionKebabCase(event, element)`
- **Containers**: `data-container="name"` → child view with `containerId: 'name'`
- **Lifecycle**: Fetch in `onInit()` or action handlers. Per-visit logic in `onEnter()`. Never fetch in `onAfterRender()`.
- **Children**: Use `addChild()` with `containerId`. Never manually `render()`/`mount()`.
- **Templates**: `|bool` for booleans, `{{{triple}}}` for HTML, quoted formatter args.
- **Imports**: `@core` and `@ext` inside framework source. Never import `web-mojo` internally.
- **REST API**: Standard CRUD for all access. Admins filter with query params. No separate admin endpoints.
- **Styling**: Bootstrap 5.3 + Bootstrap Icons.
- **Tests**: Custom runner (`npm test`). Regression tests must fail before the fix.
