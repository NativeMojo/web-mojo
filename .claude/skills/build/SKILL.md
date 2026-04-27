---
name: build
description: Implement a planned issue or request — code, tests, commit, then spawn test/docs/security agents
user-invocable: true
argument-hint: <path to planned file>
---

You are a senior engineer implementing a planned request in the WEB-MOJO framework source repo.

## Before Starting

1. Read `.claude/rules/core.md` for non-negotiable rules.
2. Read `docs/web-mojo/README.md` for the docs index.
3. Read `docs/agent/architecture.md` for the repo layout.

## Workflow

1. **Read** — Read the planned file at $ARGUMENTS. It must have a `## Plan` section. If no plan exists, stop and tell the user to run `/plan` first.
2. **Read All Files** — Read every file listed in the plan's Steps section before making any changes.
3. **Confirm** — Present a brief summary and confirm with the user before building.
4. **Implement** — Follow the plan step by step. Match existing patterns, keep diffs minimal and surgical.
5. **Test** — Run the narrowest relevant validation:
   - `npm run test:unit` for focused framework behavior
   - `npm run test:integration` for multi-component behavior
   - `npm run build:lib` for package build validation
   - `npm run lint` for lint-only validation
   - `npm test` when the change spans multiple areas
   - Chrome UI smoke test for any visual changes (see `.claude/rules/testing.md`)
   - Fix failures in the production code, not the tests.
6. **Commit** — Stage specific files (never `git add -A`), commit with a descriptive message. Never push.
7. **Spawn Agents** — After committing, spawn these agents in parallel:
   - **test-runner** (`.claude/agents/test-runner.md`) — full test suite for regressions
   - **docs-updater** (`.claude/agents/docs-updater.md`) — update docs based on git diff
   - **security-review** (`.claude/agents/security-review.md`) — review diff for security concerns
8. **Resolve** — Append `## Resolution` section to the file with:
   - What was implemented
   - Files changed
   - Tests run and results
   - Agent findings (from step 7)
9. **Move** — Move the file to `planning/done/`.
10. **Report** — Summarize what changed, how it was validated, and any follow-ups.

## Non-Negotiable Rules

- Confirm before implementing.
- Read before editing — match the target file's local style and structure.
- Use the framework's Model + View + Container pattern:
  - Primary record data lives on `this.model`
  - JS logic reads data with `this.model.get('field')`
  - Templates read model data as `{{model.field}}`
  - Child views use `containerId` + `addChild()`
- Bootstrap 5.3 for styling; Bootstrap Icons for icons.
- `data-action="kebab-case"` → `onActionKebabCase(event, element)`
- `data-container="name"` → child view with `containerId: 'name'`
- REST API uses standard CRUD endpoints — admins filter with query params, no separate admin endpoints.
- Fetch data in `onInit()` or action handlers — never in `onAfterRender()` or `onAfterMount()`
- Never manually call `child.render()` or `child.mount()` after `addChild()`
- Boolean template checks require `|bool`; unescaped HTML requires `{{{triple braces}}}`
- String formatter args require quotes: `{{date|date:'YYYY-MM-DD'}}`
- Per-visit page logic belongs in `onEnter()`, not constructor or `onInit()`
- Commit but never push. Stage specific files only.
