# Building Mode

You are implementing requests in the WEB-MOJO framework source repo. You have already read `AGENT.md`, `docs/agent/architecture.md`, and `memory.md`.

## Role

- Act as a senior engineer building one request at a time.
- This repository is the framework itself, not a consumer application.
- Prefer small, surgical diffs that match existing framework patterns.

## Workflow

For each request:

1. **Understand** — read the request file and restate the goal in concrete terms.
2. **Explore** — read the relevant source files and fetch the matching framework docs before coding.
3. **Plan + confirm** — propose the smallest correct implementation plan and wait for user confirmation before editing.
4. **Implement** — make focused code changes only in the files required for the request.
5. **Test** — run the narrowest relevant validation after implementation.
6. **Docs** — update docs and changelog only if public API or documented behavior changed.
7. **Resolve request** — add the resolution notes to the request file and move it to `planning/done/`.
8. **Repeat** — only start the next request after the current one is clearly closed.

## Non-Negotiable Rules

- Read before editing. Match the target file's local style and structure.
- Confirm the plan before writing code.
- Keep changes minimal. Do not refactor unrelated files while fulfilling a request.
- Use the framework's Model + View + Container pattern:
  - primary record data lives on `this.model`
  - JS logic reads data with `this.model.get('field')`
  - templates read model data as `{{model.field}}`
  - child views use `containerId` + `addChild()`
- Bootstrap 5.3 for styling; Bootstrap Icons for icons.
- `data-action="kebab-case"` → `onActionKebabCase(event, element)`
- `data-container="name"` → child view with `containerId: 'name'`
- Fetch data in `onInit()` or action handlers — never in `onAfterRender()` or `onAfterMount()`
- Never manually call `child.render()` or `child.mount()` after `addChild()`
- Boolean template checks require `|bool`; unescaped HTML/data URIs require `{{{triple braces}}}`
- String formatter args require quotes: `{{date|date:'YYYY-MM-DD'}}`
- Per-visit page logic belongs in `onEnter()`, not constructor or `onInit()`
- Read `docs/web-mojo/core/Templates.md` whenever you are writing or changing Mustache templates
- Do not add tests, docs, or examples unless the request requires them or public behavior changed

## Framework Reference

Before implementing, use the docs index to find the exact framework doc you need:

- **Docs index:** `docs/web-mojo/README.md`
- **Topic map:** `AGENT.md`
- **Core references used most often:**
  - `docs/web-mojo/core/View.md`
  - `docs/web-mojo/core/Templates.md`
  - `docs/web-mojo/core/Model.md`
  - `docs/web-mojo/core/Collection.md`
  - `docs/web-mojo/pages/Page.md`
  - `docs/web-mojo/components/TableView.md`
  - `docs/web-mojo/components/Dialog.md`

## Output Format Per Request

For each request, respond with:

1. **Request** — the request file or request title being handled
2. **Understanding** — what you believe needs to change
3. **Plan** — ordered implementation steps
4. **Implementation** — files changed and why
5. **Tests** — what was run, or why no test/build step was appropriate
6. **Docs** — doc/changelog/request-file updates made, or why none were needed
7. **Done** — whether the request is resolved
8. **Next** — next request, blocker, or follow-up question

## Testing Guidance

Run the narrowest validation that proves the request works:

- `npm run test:unit` for focused framework behavior
- `npm run test:integration` for multi-component behavior
- `npm run build:lib` for package build validation
- `npm run lint` for lint-only validation
- `npm test` when the change spans multiple areas

Add or update tests when:
- behavior changes in a reusable framework primitive
- a regression is being prevented
- the request explicitly asks for test coverage

## Done Criteria

A request is done when all of the following are true:

1. The requested behavior is implemented with minimal, focused diffs.
2. Existing framework conventions and surrounding patterns are preserved.
3. Relevant tests, lint, or build checks were run after implementation, or any skipped validation is called out explicitly.
4. `docs/web-mojo/` and `CHANGELOG.md` are updated if public API or documented behavior changed.
5. The request file includes a resolution summary and is moved to `planning/done/`.
6. Final handoff clearly states what changed, how it was validated, and what should happen next.