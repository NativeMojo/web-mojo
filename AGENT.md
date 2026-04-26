# WEB-MOJO — Canonical Agent Contract

WEB-MOJO is the source repository for a browser-side JavaScript framework/library. The codebase is organized as core runtime classes in `src/core/`, optional extensions in `src/extensions/`, documentation in `docs/web-mojo/`, and a custom test harness in `test/`.

This file is the single source of truth for agent workflow in this repo.

---

## Mandatory Thread Start

1. Read `AGENT.md`.
2. Read `docs/agent/architecture.md`.
3. Read `memory.md`.
4. Choose a mode:
   - Planning → `prompts/planning.md`
   - Building → `prompts/building.md`
   - Bug fixing → use building mode plus the bug-fixing rules in this file
5. Read `docs/web-mojo/README.md`, then the exact docs for the component, class, or pattern you are touching.
6. Read the target file and at least one nearby similar file before editing.
7. Check whether the task changes public API, exported behavior, or docs.

---

## Source of Truth

| File | Use |
|---|---|
| `AGENT.md` | Master workflow contract for all agents |
| `docs/agent/architecture.md` | Repo layout, source map, extension map |
| `memory.md` | Active decisions, gotchas, current work |
| `docs/web-mojo/README.md` | Local docs index for framework concepts |
| `docs/web-mojo/**/*.md` | Authoritative framework docs |
| `prompts/planning.md` | Planning-mode workflow |
| `prompts/building.md` | Implementation-mode workflow |
| `DEV_GUIDE.md` | Contributor/build/import guidance |
| `test/README.md` | Test suite overview |
| `CHANGELOG.md` | Release-facing behavior changes |
| `docs/pending_update/` | Draft docs only — not authoritative |

---

## Modes

### Planning Mode
Use when the user wants architecture, scoping, sequencing, or design before code. Produce an execution-ready plan before implementation.

### Building Mode
Use when the user wants code changes. Make focused edits, follow existing patterns, and keep diffs small.

### Bug-Fixing Mode
Use when the task is a defect or regression. Work regression-first:
- identify the failing behavior
- add or update a regression test when practical
- implement the minimal fix
- verify the bug is fixed without broad collateral changes

---

## Non-Negotiable Rules

- Read the relevant docs before using any framework component. Do not guess `View`, `Page`, `Dialog`, `TableView`, `TabView`, `FormPage`, `Rest`, or template behavior.
- Internal framework code uses `@core` and `@ext` imports. Do not import `web-mojo` from inside framework source.
- The primary data object for a view is `this.model`, not `this.runner`, `this.device`, or other custom names. In templates, use `{{model.field}}`.
- Do not fetch data in `onAfterRender()` or `onAfterMount()`. Fetch in `onInit()`, `onEnter()` for cached pages, or action handlers.
- Do not manually call `render()` or `mount()` on children after `addChild()`. Set `containerId` and let the framework manage the child lifecycle.
- `data-action` belongs on clickable or interactive elements, not `<form>`.
- `data-action="kebab-case"` maps to `onActionKebabCase(event, element)`.
- `data-container="name"` maps to child views created with `containerId: 'name'`.
- Pages are cached. Per-visit logic belongs in `onEnter()`, not the constructor or `onInit()`.
- Use Bootstrap 5.3 classes and Bootstrap Icons.
- For user-visible async waits, use `showLoading()` / `hideLoading()` around the async work.
- Do not rely on `docs/pending_update/` for implementation decisions.

---

## Template Rules That Prevent Bugs

- The view instance is the Mustache context. Use `this.someProperty` in JS and `{{someProperty}}` in templates.
- For model data, prefer `{{model.field}}` and compute extra display fields on the view instance.
- Use `{{#flag|bool}}` for boolean checks. Plain `{{#flag}}` can iterate arrays/objects.
- Use `{{{triple braces}}}` for trusted HTML or data URIs that must not be escaped.
- Quote string formatter arguments: `{{date|date:'YYYY-MM-DD'}}`.
- In iterations, use `{{.}}` or `{{.property}}` as appropriate.
- Do not use Mustache formatters inside chart config objects or SVG callbacks; use plain JavaScript callbacks there.

---

## Core Conventions by Layer

### Models and Collections
- Models extend `Model`; collections extend `Collection`.
- Model constructors usually call `super(data, { endpoint, idAttribute })`.
- Access model data with `this.model.get('field')` and mutate with `set()`.
- Collection classes typically declare `ModelClass` and `endpoint`.
- If a new model file is added under `src/core/models/`, run the model export generator flow used by the repo.

### Views and Pages
- Views extend `View`; routed screens extend `Page`.
- Keep file names PascalCase and match the class name.
- Compose UI with child views and containers instead of hand-managed DOM trees.
- Read the surrounding file before changing lifecycle or render behavior.
- For pages, use `onEnter()` / `onExit()` for visit lifecycle and group/route-sensitive refreshes.

### Services and API Usage
- Prefer existing `Model`, `Collection`, and `app.rest` patterns over ad hoc request code.
- Preserve response-shape handling already used in the target area.
- Do not hardcode secrets, tokens, or environment-specific credentials.

### Tests
- This repo uses a custom test runner: `node test/test-runner.js`.
- Test suites live primarily in `test/unit`, `test/integration`, and `test/build`.
- Do not assume standard Jest CLI flow even though many tests use Jest-style globals.
- For bug fixes, add a regression test when practical and make sure it would fail before the fix.

### Documentation
- Framework docs live in `docs/web-mojo/`.
- Update docs when public API, exported behavior, or documented conventions change.
- Update `CHANGELOG.md` when the change is release-facing.
- Add important new gotchas or non-obvious decisions to `memory.md`.

---

## Workflow Rules

### Before Editing
- Read the target file.
- Read one similar implementation file nearby.
- Read the exact framework docs for the component/pattern involved.
- Check `memory.md` for active gotchas and recent decisions.
- Confirm whether the change touches public API, docs, or changelog.
- Confirm whether the task is a plan, feature, or bug fix.

### While Editing
- Keep changes minimal and localized.
- Match the style and patterns already used in the target area.
- Avoid one-off abstractions unless the surrounding code already uses them.
- Preserve existing import style, naming, and file organization.

### Before Delivery
- Re-read the changed files for consistency.
- Verify tests or validation steps appropriate to the change.
- Update docs/changelog if the change affects public behavior.
- Update `memory.md` if you introduced or discovered a non-obvious rule.
- Report what changed, why it changed, and how to verify it.

---

## Build and Validation Reference

Use only the commands relevant to the task:

- `npm run dev` — local development server
- `npm run build` — main build
- `npm run build:lib` — library build
- `npm run build:loader` — loader bundle
- `npm run build:mojo-auth` — auth bundle
- `npm run build:lite` — lite bundle
- `npm run lint` — ESLint
- `npm test` — full custom test runner
- `npm run test:unit` — unit suite
- `npm run test:integration` — integration suite
- `npm run test:build` — build suite

---

## Documentation Quick Lookup

Start with `docs/web-mojo/README.md`, then read the exact topic docs you need:

- App shell work → `core/WebApp.md`, `core/PortalApp.md`
- View work → `core/View.md`, `core/ViewChildViews.md`, `core/AdvancedViews.md`
- Templates → `core/Templates.md`, `core/DataFormatter.md`
- Data layer → `core/Model.md`, `core/Collection.md`
- Routed screens → `pages/Page.md`, `pages/FormPage.md`, `pages/TablePage.md`
- HTTP / realtime → `services/Rest.md`, `services/WebSocketClient.md`, `services/FileUpload.md`, `services/TokenManager.md`
- Dialogs / tables / lists → `components/Dialog.md`, `components/TableView.md`, `components/ListView.md`, `components/TabView.md`
- Extensions → `extensions/*.md` (`Auth.md`, `UserProfile.md`, `DocIt.md`, `Admin.md`, `Charts.md`, …)
- Forms → `forms/README.md`
- Filter syntax / console levels → `utils/DjangoLookups.md`, `utils/ConsoleSilencer.md`

---

## Delivery Checklist

A task is not complete until all applicable items are true:

- The change follows existing repo patterns.
- Imports use the correct internal alias style.
- Lifecycle hooks are used correctly.
- Template rules are respected.
- Validation or tests appropriate to the task have been considered.
- Docs and `CHANGELOG.md` are updated if public behavior changed.
- `memory.md` is updated if a new gotcha or decision was introduced.
- The final handoff explains what changed, why, and how to verify it.
