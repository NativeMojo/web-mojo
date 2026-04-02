# Core Rules

These rules apply to all work in this repository. Non-negotiable.

## Project Context

WEB-MOJO is the source repository for a browser-side JavaScript framework/library. The codebase is organized as core runtime classes in `src/core/`, optional extensions in `src/extensions/`, documentation in `docs/web-mojo/`, and a custom test harness in `test/`.

## Before Editing

- Read the target file and at least one nearby similar file before editing.
- Read the relevant framework docs from `docs/web-mojo/README.md` for the component/pattern you are touching. Do not guess `View`, `Page`, `Dialog`, `TableView`, `TabView`, `FormPage`, `Rest`, or template behavior.
- Check whether the task changes public API, exported behavior, or docs.
- Do not rely on `docs/pending_update/` for implementation decisions.

## Input Handling

- Internal framework code uses `@core` and `@ext` imports. Do not import `web-mojo` from inside framework source.
- The primary data object for a view is `this.model`, not `this.runner`, `this.device`, or other custom names. In templates, use `{{model.field}}`.

## Forbidden Actions

- Never make blind edits — read target files first.
- Do not fetch data in `onAfterRender()` or `onAfterMount()`. Fetch in `onInit()`, `onEnter()` for cached pages, or action handlers.
- Do not manually call `render()` or `mount()` on children after `addChild()`. Set `containerId` and let the framework manage the child lifecycle.
- Do not add tests, docs, or examples unless the request requires them or public behavior changed.
- Do not refactor unrelated files while fulfilling a request.

## Philosophy

- KISS — keep changes minimal, surgical, and localized.
- Match the style and patterns already used in the target area.
- Avoid one-off abstractions unless the surrounding code already uses them.
- Preserve existing import style, naming, and file organization.
- Check `src/core/utils/` before writing new utility functions.
- Confirm assumptions with the user when uncertain.

## Trust Order

When docs and code conflict:
1. `docs/web-mojo/` (authoritative framework docs)
2. Existing code patterns in the target area
3. `CHANGELOG.md` for behavioral intent

## Delivery Checklist

Before closing any task:
- The change follows existing repo patterns.
- Imports use the correct internal alias style (`@core`, `@ext`).
- Lifecycle hooks are used correctly.
- Template rules are respected.
- Validation or tests appropriate to the task have been run.
- Docs and `CHANGELOG.md` are updated if public behavior changed.
- The final handoff explains what changed, why, and how to verify it.
