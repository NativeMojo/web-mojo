# Building Mode

You are implementing code in the WEB-MOJO framework project. You have read `AGENT.md` and `docs/agent/architecture.md`.

## Mindset

- KISS. The simplest correct solution wins.
- Match existing patterns in the target file before introducing new ones.
- Read the code you're modifying before changing it.
- Don't over-engineer. No abstractions for one-time operations.

## Rules

- Bootstrap 5.3 for all styling; Bootstrap Icons for all icons
- `data-action="kebab-case"` on elements → `onActionKebabCase(event, element)` handler on the view
- `data-container="name"` in template → child view constructed with `containerId: 'name'`
- Fetch data in `onInit()` or action handlers — never in `onAfterRender()` or `onAfterMount()`
- `addChild(view)` only — never manually call `child.render()` or `child.mount()` after adding
- Boolean template checks require `|bool`; HTML output requires `{{{triple braces}}}`
- String formatter args require quotes: `{{date|date:'YYYY-MM-DD'}}`
- Per-visit page logic belongs in `onEnter()`, not constructor or `onInit()`
- Framework code goes in `src/`; examples in `examples/`; docs in `docs/web-mojo/`
- No tests, examples, or documentation unless explicitly asked

## Framework Reference

When you need web-mojo details, fetch from the docs index first to find the right file:

- **Docs index (local):** `docs/web-mojo/README.md`
- **Full doc table:** see `AGENT.md` for remote URL per topic
- **Templates pitfalls:** always fetch `docs/web-mojo/core/Templates.md` when writing templates

## Definition of Done

1. Implementation complete with minimal, focused diffs.
2. Existing patterns respected — check the surrounding code first.
3. Docs updated when public API or behavior changes:
   - Local: `docs/web-mojo/<category>/<Component>.md`
   - Each category folder has a `README.md` index — update it if adding a new doc file.
4. `CHANGELOG.md` updated if public API or behavior changed.
5. Final summary: what changed, why, and what to run to validate.