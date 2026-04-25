# Examples Rewrite — Clean, LLM-First Portal

**Type**: request
**Status**: open
**Date**: 2026-04-25
**Priority**: high

## Description

Replace the current `examples/` tree with a single canonical Portal example built for two audiences in equal measure:

1. **Humans** — a runnable, browser-testable showcase of every documented `web-mojo` component, hosted by `PortalWebApp`.
2. **LLMs** — a flat, predictable folder layout where the canonical "copy this to use Component X" file is trivial to locate and mimic. Powers the `find-example` skill bundled by [`bootstrap-web-mojo-claude.sh`](https://gist.githubusercontent.com/iamojo/1096cba9bbb345a92dc0182c2ec2dc14/raw/606444ef630a4f028ffeea800d393294003a8ce5/bootstrap-web-mojo-claude.sh).

The current portal pages average 500–1000 LOC, blend many concerns per file, sit under handwritten `templates/*.mst` paths, and are intermixed with stale standalone HTML demos. They are not suitable as canonical references — neither for humans nor for LLMs.

The dominant pattern an LLM gets asked to reproduce today (a `Page` + `Model` + `View` for some new entity) currently has `src/extensions/admin/*` as its de-facto reference, and those files are admin-grade — large, opinionated, full of cross-cutting concerns. We want a **simpler, narrower, one-component-per-file** reference set that mirrors the structure of `docs/web-mojo/`.

## Context

Why now:
- `src/extensions/admin/*` (e.g. `IncidentView`, `ShortLinkView`, `JobsTablePage`) are being mistaken for canonical examples. They are production admin views, not pedagogical examples.
- The bootstrap gist installs a `find-example` skill that locates examples by component name. That skill needs a known, stable location to look in.
- A new `web-mojo` consumer project bootstraps via that gist; the experience of "ask the LLM to add a TableView page" should land it on the right pattern in one hop.

Trust order applies: `docs/web-mojo/` (authoritative) → existing code patterns → CHANGELOG. Examples must match what the docs say, not invent new patterns.

## Decisions Made

Already locked in via clarification:

| Decision | Choice |
|---|---|
| Migration | Move current `examples/portal/` → `examples/legacy/portal/`, current `examples/auth/` → `examples/legacy/auth/`, all other `examples/*` (HTML files, file-components, file-drop, lite, location, mojo-auth, etc.) → `examples/legacy/`. New `examples/portal/` and `examples/auth/` are built from scratch. |
| Folder taxonomy | Mirror `docs/web-mojo/` — `core/`, `pages/`, `services/`, `components/`, `extensions/`, `forms/`, `models/`. |
| Example shape | Canonical = Demo (one file). Each example is a runnable `Page` whose code is also the copy-paste reference. Inline template strings — no `.mst` files. |
| Coverage | Every component documented in `docs/web-mojo/README.md`. |
| Backend | Real NativeMojo backend at `localhost:9009` (matches existing portal). |
| Imports in examples | `import { … } from 'web-mojo'` (only). The host portal's own shell may use `/src/...` for repo-local dev, but per-component example files must be copy-paste-ready for a downstream consumer. |
| Registry | Manifest-driven. Every example folder ships an `example.json`; a build step generates a single `examples/portal/examples.registry.json` consumed by both (a) the portal at boot for auto-registration, and (b) the `find-example` skill / `examples.md` registry. |

## Recommended Per-Example Shape

For each component:

```
examples/portal/examples/<area>/<ComponentName>/
  <ComponentName>Example.js   # The Page — IS the canonical reference. Inline template string. ~30–120 LOC.
  example.json                # Manifest: name, area, route, summary, tags, docs link.
```

Notes:
- One file. The page's JSDoc header doubles as the README — describes what the example shows and the minimal copy-paste recipe.
- `template:` is an inline string property on the constructor options. No `templates/*.mst` files.
- The example imports only from `web-mojo`. If a feature requires an extension, import comes from `web-mojo/<Extension>` per existing publish surface.
- Action handlers are kept to the minimum that the example needs to demonstrate the component — no mock-permission systems, no unrelated UI scaffolding.

Why one file: LLMs trying to mimic a pattern need a single self-contained artifact. Splitting canonical/demo creates a "which one do I copy?" problem. Splitting template/JS adds a path it has to discover. The canonical = demo collapse keeps the artifact under the LLM's nose.

## Recommended Physical Layout

```
examples/
├── portal/                              # New runnable PortalWebApp shell
│   ├── index.html
│   ├── app.js                           # PortalWebApp config + auto-load registry
│   ├── app.css
│   ├── examples.registry.json           # Generated from per-folder example.json
│   ├── scripts/
│   │   └── build-registry.js            # Walk examples/, write registry + sidebar menu
│   ├── shell/                           # The portal-specific UI (sidebar, home, 404, no-perms)
│   │   ├── HomePage.js
│   │   └── menus.js
│   └── examples/                        # All canonical examples — mirrors docs/web-mojo/
│       ├── core/
│       │   ├── View/
│       │   │   ├── ViewExample.js
│       │   │   └── example.json
│       │   ├── Templates/
│       │   ├── DataFormatter/
│       │   ├── Model/
│       │   ├── Collection/
│       │   ├── Events/
│       │   └── ...
│       ├── pages/
│       │   └── Page/
│       ├── services/
│       │   ├── Rest/
│       │   ├── ToastService/
│       │   └── WebSocketClient/
│       ├── components/
│       │   ├── Dialog/
│       │   ├── ListView/
│       │   ├── TableView/
│       │   ├── TablePage/
│       │   ├── DataView/
│       │   ├── FileView/
│       │   └── ImageFields/
│       ├── extensions/
│       │   ├── Charts/
│       │   ├── LightBox/
│       │   ├── MapView/
│       │   ├── MapLibreView/
│       │   ├── TimelineView/
│       │   ├── FileUpload/
│       │   ├── TabView/
│       │   └── Location/
│       ├── forms/
│       │   ├── FormView/
│       │   ├── TextInputs/
│       │   ├── SelectionFields/
│       │   ├── DateTimeFields/
│       │   ├── FileMediaFields/
│       │   ├── Validation/
│       │   ├── Layout/
│       │   ├── TagInput/
│       │   ├── DatePicker/
│       │   ├── DateRangePicker/
│       │   ├── MultiSelect/
│       │   ├── ComboInput/
│       │   ├── CollectionSelect/
│       │   └── ImageField/
│       └── models/
│           └── BuiltinModels/
├── auth/                                # New clean auth example (login flow only)
│   └── ...
└── legacy/                              # Frozen — old portal/, auth/, all *.html demos
    ├── portal/
    ├── auth/
    ├── docit/
    ├── file-components/
    ├── file-drop/
    ├── lite/
    ├── location/
    ├── mojo-auth/
    ├── circular-progress/
    ├── loader/
    ├── table-batch-location/
    └── *.html (image-editor, image-upload, lightbox, lightbox-gallery, simple-charts, activegroup-demo, user-view-example, index)
```

Why inside `examples/portal/examples/` (not a separate `examples/canonical/`):
- The portal IS the proof that the example runs. There's no second runner to maintain.
- One copy of every example file means there's no canonical-vs-demo drift.
- The `find-example` skill walks a single tree.

## Manifest Format

```json
// example.json
{
  "name": "TableView",
  "area": "components",
  "route": "components/table-view",
  "title": "TableView — basic data table",
  "summary": "Sortable, filterable, paginated table bound to a Collection.",
  "docs": "docs/web-mojo/components/TableView.md",
  "tags": ["table", "list", "collection", "pagination", "filters"],
  "page": "TableViewExample.js",
  "menu": { "section": "Components", "icon": "bi-table", "order": 30 }
}
```

Generated `examples.registry.json` is the one file `app.js` imports. The build step also emits a sidebar-menu structure grouped by area, so the portal sidebar mirrors `docs/web-mojo/` automatically — no hand-maintained menu.

## Acceptance Criteria

### Foundation (must land first)
- [ ] `examples/legacy/` exists; current `examples/portal/`, `examples/auth/`, every other `examples/*` directory and standalone `*.html` are moved there with git history preserved.
- [ ] New `examples/portal/` runs from `npm run dev` and loads `PortalWebApp` against `localhost:9009`.
- [ ] `examples/portal/scripts/build-registry.js` walks `examples/portal/examples/**/example.json`, emits `examples.registry.json` and the sidebar menu structure. Wired into `npm run dev` (auto-rebuild) and a `npm run examples:registry` script.
- [ ] Registry schema (`example.json`) is documented in `examples/portal/README.md` with one fully worked example.
- [ ] `examples/portal/app.js` imports the registry and registers every page in a loop. Adding a new example never requires touching `app.js`.
- [ ] Sidebar groups examples by area, in the order defined by `docs/web-mojo/README.md`.

### Coverage audit (must precede Wave 2)
- [ ] `planning/notes/examples-rewrite-coverage.md` exists and maps every legacy page/HTML demo to either (a) a target new-portal example folder, or (b) an explicit "drop — reason" line.
- [ ] Every documented component in `docs/web-mojo/README.md` appears in the audit, with a target example file path.
- [ ] Every legacy pattern not covered by a documented component is flagged as keep / drop / file-doc-issue. No silent drops.

### Per-Component Examples (parallelizable)
- [ ] **Every** component documented in `docs/web-mojo/README.md` has a folder under the matching area with `<Component>Example.js` + `example.json`.
- [ ] Every legacy pattern marked "keep" in the audit has a corresponding new example file (either as the canonical `<Component>Example.js` or a sibling `<Component><Variant>Example.js` in the same folder).
- [ ] Each example file:
  - Imports only from `web-mojo` (or `web-mojo/<Extension>` for extensions).
  - Is a single `Page` subclass with an inline `template:` string.
  - Demonstrates the component's primary documented usage — no auxiliary mock systems, no unrelated demos sharing the file.
  - Has a JSDoc header that names the component, links to its docs page, and states the minimum copy-paste pattern.
  - Loads in the portal and renders without console errors against the live backend.
  - Stays under ~150 LOC unless the component genuinely requires more (FormView with many fields is the only expected outlier).
- [ ] No example uses `data-action` on `<form>` (project rule from `.claude/rules/views.md`).
- [ ] No example fetches data in `onAfterRender()` / `onAfterMount()`.
- [ ] No example calls `child.render()` / `child.mount()` after `addChild()`.
- [ ] Templates use the documented Mustache rules (`|bool`, `{{{ }}}`, quoted formatter args, `{{.property}}` in iterations).

### Auth example
- [ ] New `examples/auth/` is a minimal login flow against the same backend, no carryover from legacy.

### LLM-facing
- [ ] `examples/portal/examples.registry.json` is reachable from `find-example` (the skill from the bootstrap gist).
- [ ] A short `docs/web-mojo/examples.md` (or update to existing index) lists every example by area with a one-line summary and a link to its source file. Generated from the registry — not maintained by hand.
- [ ] Every doc page in `docs/web-mojo/` that has a corresponding example links to it (`See: examples/portal/examples/<area>/<Component>/<Component>Example.js`). One link per doc; not a full code dump.

### Cleanup
- [ ] `CHANGELOG.md` entry describing the rewrite, the legacy archive location, and how to find the new examples.
- [ ] No references to `examples/portal/templates/*.mst` remain in the new portal. Legacy retains its own templates.
- [ ] `package.json` scripts updated if any old script pointed at moved files.

## Investigation

### What exists today
- `examples/portal/` — single PortalWebApp app. ~13k LOC across `pages/` and `pages/forms/`. Pages range 60–1400 LOC, blend mock systems with the actual demo, use external `templates/*.mst` files for some pages, inline templates for others. `app.js` is 583 LOC of hand-maintained sidebar + 30+ `registerPage` calls.
- `examples/auth/` — older standalone auth demo with `passkeys.html`, `privacy.html`, `tos.html`, `test.html`. Currently linked from the portal as `loginUrl: '/examples/auth/'`.
- 12+ standalone HTML demos at the top of `examples/` (image editor, lightbox, simple charts, etc.) — most predate the current portal and are stale.
- `src/extensions/admin/*` is being treated as the de-facto example set. It is not.

### What changes
- All `examples/portal/pages/**` and `examples/portal/templates/**` move to `examples/legacy/portal/`.
- All `examples/auth/**` move to `examples/legacy/auth/`.
- All other top-level `examples/*` (folders + HTML files) move to `examples/legacy/`.
- New `examples/portal/` shell (`index.html`, `app.js`, `app.css`, `shell/`, `scripts/`) is hand-built and small.
- New `examples/portal/examples/<area>/<Component>/` folders are added per the per-component list above.
- New `examples/auth/` is built fresh — not a port of the old one.
- Doc cross-links updated where docs reference an example.

### Constraints
- Must follow `.claude/rules/core.md`, `.claude/rules/views.md`, `.claude/rules/api.md` exactly. Examples are the public face of "what good looks like" in this repo — they have to be the cleanest code we ship.
- REST: standard CRUD endpoints only (no admin-scoped endpoints — see `.claude/rules/api.md`).
- Templates: inline strings, Mustache rules from `docs/web-mojo/core/Templates.md`.
- Examples import from `web-mojo` package surface only; if a needed symbol isn't exported, that's an export bug to fix in `src/index.js`, not a reason to switch to `/src/...`.
- The portal's own shell may use `/src/...` for dev ergonomics but the per-component example files MUST NOT.

### Related files
- `examples/portal/app.js`, `examples/portal/index.html`
- `examples/portal/pages/**` (legacy reference for what the new examples must replace)
- `docs/web-mojo/README.md` — the source of truth for what gets an example
- `docs/agent/architecture.md` — repo layout
- `src/index.js` — what's exported under `web-mojo`
- `.claude/rules/*.md` — non-negotiable conventions
- `bootstrap-web-mojo-claude.sh` (gist) — what the LLM-facing contract looks like in a downstream project

### Endpoints
- No new endpoints. Examples consume existing CRUD endpoints on `localhost:9009` (Users, Files, Todos via existing `models/Todo.js` pattern, etc.).

### Tests required
- A smoke test that walks `examples/portal/examples/**/example.json`, validates schema, and asserts each referenced page file exists and exports a default class extending `Page`.
- A smoke test that the registry generator produces the same registry on rebuild (idempotent).
- No per-example unit tests — these are showcases, not framework tests.

### Sibling examples within a component folder

When the audit surfaces multiple distinct patterns for one component (e.g. `TableView` basic + batch-actions + custom-row), the folder holds:

```
examples/portal/examples/components/TableView/
  TableViewExample.js              # Canonical / simplest
  TableViewBatchActionsExample.js  # Variant
  TableViewCustomRowExample.js     # Variant
  example.json                     # Lists all three pages with separate routes
```

`example.json` becomes an array of pages (or `pages: [...]` field) so the registry generator emits one route per file. Routes follow `<area>/<component>` for the canonical and `<area>/<component>/<variant>` for siblings.

### Out of scope
- Rewriting any of the standalone HTML demos. They go to `legacy/` as-is.
- Building a backend / auth flow. Examples assume the standard NativeMojo backend.
- Changing `src/extensions/admin/*`. Admin views remain as they are; they're just not examples anymore.
- Adding new framework features. If a component is documented but missing or broken, file a separate request.
- Documentation rewrites. Doc updates here are limited to (a) cross-linking to the new example file and (b) the generated `examples.md` index.
- The `find-example` skill itself or anything inside the bootstrap gist. This request produces the contract that skill consumes.

## Parallelization Plan

The work splits cleanly along area boundaries after the foundation lands. `/build` should fan out one agent per area on the second wave; areas are independent.

**Wave 0 — Coverage audit (sequential, single agent).** Must complete before Wave 2 scope is finalized. The legacy portal covers a lot of ground we should not silently drop.
1. Walk every page under `examples/legacy/portal/pages/**` (post-move) and catalog: which component(s) it demonstrates, which non-trivial patterns it shows (mock permission systems, FormView field combinations, dialog interactions, chart variants, file-drop flows, tabview patterns, image-editor flows, table batch actions, etc.), and which `templates/*.mst` and `models/*.js` it depends on.
2. Walk every standalone `examples/legacy/*.html` (image-editor, image-upload, lightbox, lightbox-gallery, simple-charts, activegroup-demo, user-view-example, table-batch-location, file-drop, file-components, location, circular-progress, loader, docit, mojo-auth) and catalog the same.
3. Cross-check that catalog against `docs/web-mojo/README.md`:
   - Every component listed in the docs gets a row.
   - Every distinct pattern present in legacy that *isn't* covered by a doc-listed component gets flagged. These are candidates for either (a) a second example file in the same component folder (`TableViewBatchActionsExample.js` etc.), (b) a "patterns" sub-area in the new portal, or (c) a doc gap we file as a separate issue.
   - Anything legacy does that the docs don't claim to support — flag explicitly. We choose per-item: keep, drop, or upgrade docs.
4. Output a checklist file at `planning/notes/examples-rewrite-coverage.md` mapping legacy file → new example folder (or "drop, reason"). This file is the input to Wave 2 — agents work from it, not from the docs index alone.
5. Update Wave 2 area assignments below if the audit surfaces sub-component examples that change the per-area workload meaningfully.

The audit is read-only — no file moves, no rewrites — but it must run after Wave 1 step 1 (the move to `legacy/`) so the paths in the catalog are stable.

**Wave 1 — Foundation (sequential, single agent).** Land before anything in Wave 2 starts.
1. Move legacy: `examples/portal/` → `examples/legacy/portal/`, `examples/auth/` → `examples/legacy/auth/`, all other `examples/*` → `examples/legacy/`.
2. New `examples/portal/` shell: `index.html`, `app.js`, `app.css`, `shell/HomePage.js`, `shell/menus.js`, README.
3. Registry generator + build script + registry schema doc.
4. Auto-registration loop in `app.js`.
5. One worked example end-to-end (`core/View/`) to lock the per-example shape and prove the pipeline.

**Wave 2 — Per-area examples (parallel, one agent per area).** Each agent owns one folder under `examples/portal/examples/<area>/`. All agents follow the locked-in shape from Wave 1 step 5.
- Agent A: `core/` — View, Templates, DataFormatter, Model, Collection, Events, AdvancedViews, ViewChildViews, WebApp, PortalApp, PortalWebApp.
- Agent B: `pages/` + `services/` — Page, Rest, ToastService, WebSocketClient.
- Agent C: `components/` — Dialog, ListView, TableView, TablePage, DataView, FileView, ImageFields, SidebarTopNav.
- Agent D: `forms/` — FormView, TextInputs, SelectionFields, DateTimeFields, FileMediaFields, TextareaFields, StructuralFields, OtherInputs, Validation, Layout, TagInput, DatePicker, DateRangePicker, MultiSelect, ComboInput, CollectionSelect, ImageField.
- Agent E: `extensions/` — Charts, LightBox, MapView, MapLibreView, TimelineView, FileUpload, TabView, Location.
- Agent F: `models/` + new `examples/auth/` — BuiltinModels showcase + minimal auth demo.

Agents in Wave 2 must each: open their target docs page, write `<Component>Example.js` + `example.json`, run the page in the portal, take a screenshot or note any backend-dependent caveat, and verify the registry rebuilds.

**Wave 3 — Cross-cutting cleanup (sequential, single agent).**
1. Generate `docs/web-mojo/examples.md` from the registry.
2. Add per-doc cross-links from `docs/web-mojo/<area>/<Component>.md` to the example file.
3. CHANGELOG entry.
4. Remove dead references in `package.json` / scripts.
5. Run smoke tests.

## Notes

- KISS reminder: an example that's longer than its component's doc is a red flag. Smaller is the goal.
- If a documented component cannot be exampled in <150 LOC against the package surface, it's a signal that the package's exported API has gaps — file a separate issue, do not paper over with `/src/...` imports.
- The legacy portal at `examples/legacy/portal/` is allowed to bit-rot; we don't maintain it. The new portal is the only canonical demo going forward.

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: planned

---

## Plan

### Objective

Replace `examples/` with a single canonical Portal example whose taxonomy mirrors `docs/web-mojo/`. Every documented component has a folder containing a single `<Component>Example.js` (canonical reference and runnable demo collapsed into one file with an inline template) plus an `example.json` manifest. The portal sidebar and route registration are generated from those manifests, so adding a new example never edits `app.js`. Coverage is driven by the audit file `planning/notes/examples-rewrite-audit.md` — every component listed in `docs/web-mojo/README.md`, plus four sibling variants the audit flagged as "keep" (DialogContextMenu, TabViewDynamic, ValidationAdvanced, AllFieldTypes).

### Inputs already produced

- `planning/notes/examples-rewrite-audit.md` — coverage table mapping every legacy file to a new example folder (or "drop"), plus a doc-gap summary.
- `planning/requests/document-undocumented-public-exports.md` — separate request for the 11 public-API exports that have no doc file. These are out of scope for this rewrite.
- Three doc agents landed during planning to fill gaps that DO appear in the legacy portal:
  - ✅ `docs/web-mojo/components/ContextMenu.md` (432 lines). Notes: ContextMenu emits `parent.events.dispatch(action, ...)` — the docstring's `'action'` event is a dead code path. ContextMenu does NOT interpret a `permissions` key on items (Dialog does); the legacy DialogsPage's mock-permission system conflates the two — drop it.
  - ✅ `docs/web-mojo/forms/MultiStepWizard.md` (487 lines). Real pattern is one `FormView` per step swapped via `removeChild` + `addChild`; never reuse a single FormView across steps.
  - ✅ `docs/web-mojo/forms/SearchFilterForms.md` (497 lines). **Important correction surfaced by the doc agent**: the legacy `SearchFilterExample.js` calls APIs that don't exist — `FormView.setData()` (real API: `setFormData`), `Collection.setFilters()` / `Collection.query()` (real API: `setParams` / `updateParams(partial, autoFetch, debounceMs)` / `where`). Wave 2 agents writing form/collection examples MUST verify methods against `src/core/forms/FormView.js` and `src/core/Collection.js` before mining patterns from the legacy portal.

### Steps

#### Wave 1 — Foundation (sequential, single agent)

1. **Move legacy.** Use `git mv` to preserve history.
   - `git mv examples/portal examples/legacy/portal`
   - `git mv examples/auth examples/legacy/auth`
   - `git mv examples/{circular-progress,docit,file-components,file-drop,lite,location,loader,mojo-auth,table-batch-location} examples/legacy/`
   - `git mv examples/*.html examples/legacy/` (activegroup-demo, image-editor, image-upload, index, lightbox, lightbox-gallery, simple-charts, user-view-example)
   - Leave `examples/.DS_Store` alone; new structure won't reference it.
2. **New portal shell.** Hand-build a small set of files:
   - `examples/portal/index.html` — Bootstrap 5.3 + bootstrap-icons CDN, `<div id="app"></div>`, single module script that loads `app.js`. ~40 LOC, pattern matches the current portal's `index.html` minus extras.
   - `examples/portal/app.css` — empty file with one `.example-page { padding: 1rem; }` rule. The portal does not need bespoke styling beyond what `web-mojo` ships.
   - `examples/portal/app.js` — `PortalWebApp` config pointing at `localhost:9009`, basic topbar, generated sidebar, and a `for` loop registering pages from the registry. ~80–120 LOC. Imports allowed: `web-mojo`, the generated `examples.registry.json`, and `./shell/HomePage.js`. NOT `/src/...`.
   - `examples/portal/shell/HomePage.js` — landing page with a one-paragraph "what this portal is" intro and a search box backed by `SimpleSearchView` that filters the sidebar. ~60 LOC.
   - `examples/portal/README.md` — one page covering: how to run, the `example.json` schema, how to add a new example, the canonical = demo single-file rule.
3. **Registry generator.** `examples/portal/scripts/build-registry.js`:
   - Walks `examples/portal/examples/**/example.json`.
   - Validates schema (required: `name`, `area`, `route`, `title`, `summary`, `page`. Optional: `tags`, `docs`, `menu`, `pages` (array variant for sibling examples)).
   - Asserts each `page` file exists.
   - Writes `examples/portal/examples.registry.json` with two keys: `pages` (flat array for `app.js` to loop over) and `menu` (sidebar tree grouped by area in the order from `docs/web-mojo/README.md`).
   - Idempotent: re-running with no input changes produces a byte-identical file (sort keys, stable order). This is what the smoke test in Wave 3 verifies.
   - Writes a sibling `docs/web-mojo/examples.md` from the same data (Wave 3 also touches this).
4. **package.json wiring.**
   - New script `"examples:registry": "node examples/portal/scripts/build-registry.js"`.
   - Update `"dev"` to run the registry generator once before `vite` starts (e.g. via `concurrently` or a `predev` script). Watch mode regenerates on `example.json` change.
   - Verify `vite.config.js` already has the `web-mojo` and `web-mojo/<extension>` aliases needed; add aliases for any extension package paths the new examples will import that aren't currently mapped (timeline, maplibre, location, file-upload mixin export — confirm during step 5).
5. **Worked example — locks the shape.** Build `examples/portal/examples/core/View/ViewExample.js` end-to-end:
   - JSDoc header: name, link to `docs/web-mojo/core/View.md`, one-paragraph "what this shows", `ROUTE: core/view`.
   - Single `Page` subclass, inline `template:` string, ~60–100 LOC.
   - Demonstrates: data passing (`this.someProp` → `{{someProp}}`), one `data-action`, one `addChild` with `containerId`. No mocks, no permission systems.
   - Companion `example.json`: `{ "name": "View", "area": "core", "route": "core/view", "title": "View — base component", "summary": "Lifecycle, templates, data-action, child views.", "docs": "docs/web-mojo/core/View.md", "tags": ["view","lifecycle","template"], "page": "ViewExample.js", "menu": { "section": "Core", "icon": "bi-box", "order": 10 } }`.
   - Run through the registry generator. Run `npm run dev`. Visit `http://localhost:3000/examples/portal/?page=core/view`. Confirm renders against the live backend. Screenshot. This is the reference shape every Wave 2 agent mimics.

#### Wave 2 — Per-area examples (6 agents in parallel)

Each agent owns one folder under `examples/portal/examples/<area>/`. All agents:
- Read the locked `ViewExample.js` first to internalize the shape.
- Read the row(s) in `planning/notes/examples-rewrite-audit.md` for their assigned components.
- Read each component's doc page in `docs/web-mojo/<area>/<Component>.md` before writing.
- Read the legacy file flagged in the audit's "New target" column for working code to mine.
- Write `<Component>Example.js` + `example.json` per folder. Sibling variants get their own `<Component><Variant>Example.js` and an entry in `example.json`'s `pages: [...]` array.
- Run the page in the browser against `localhost:9009`. No console errors.
- Re-run the registry generator after each new file; confirm the route appears in the sidebar.

| Agent | Area | Components (canonical files) | Sibling variants |
|---|---|---|---|
| **A** | `core/` | View, ViewChildViews, AdvancedViews, Templates, DataFormatter, Model, Collection, Events, WebApp, PortalApp, PortalWebApp | — |
| **B** | `pages/` + `services/` | Page, FormPage, Rest, ToastService, WebSocketClient | — |
| **C** | `components/` | Dialog, Modal, ListView, TableView, TablePage, DataView, FileView, ImageFields, SidebarTopNav, ContextMenu (uses new doc) | DialogContextMenuExample.js (sibling of Dialog), TableViewBatchActionsExample.js (sibling of TableView, taken from legacy `TodosPage.js`) |
| **D** | `forms/` | FormView, TextInputs, SelectionFields, DateTimeFields, FileMediaFields, TextareaFields, StructuralFields, OtherFields, Validation, FormLayout, MultiStepWizard, SearchFilterForm | ValidationAdvancedExample.js (sibling of Validation), AllFieldTypesExample.js (sibling of FormView, optional comprehensive ref) |
| **E** | `extensions/` | Charts (incl. MetricsChart for the dashboard mini-chart pattern), LightBox (incl. ImageWorkflow), MapView, MapLibreView, TimelineView, FileUpload (incl. FileDrop using `applyFileDropMixin`), TabView, Location | TabViewDynamicExample.js (sibling of TabView) |
| **F** | `forms/inputs/` + `models/` + new `examples/auth/` | TagInput, DatePicker, DateRangePicker, MultiSelect, ComboInput, CollectionSelect, ImageField, BuiltinModels showcase, plus a fresh minimal `examples/auth/` (single login page using FormView + REST against the same backend) | — |

Coverage check at end of Wave 2:
- Run `node examples/portal/scripts/build-registry.js`. Output JSON listed against the audit's "New target" column — every entry present, no missing rows, no orphaned routes.

Anti-pattern enforcement (each agent must self-check before marking done):
- No `data-action` on `<form>`.
- No fetch in `onAfterRender()` / `onAfterMount()`.
- No manual `child.render()` / `child.mount()` after `addChild()`.
- All Mustache booleans use `|bool`. All HTML uses `{{{ }}}`. Formatter args are quoted. Iterations use `{{.property}}`.
- Imports come only from `web-mojo` or `web-mojo/<extension>`.
- File length ≤150 LOC unless the component genuinely needs more (FormView fields the only expected outlier).
- No mock permission systems, no `window.getApp()` fallback, no debug-mode UI.

#### Wave 3 — Cross-cutting cleanup (sequential, single agent)

1. **Generate `docs/web-mojo/examples.md`** from the registry (the build-registry script already emits this; just confirm and commit).
2. **Per-doc cross-links.** For each `examples.registry.json` entry whose `docs` field points at a `docs/web-mojo/<area>/<Component>.md`, append (idempotently) a `## Example` section near the bottom of that doc with a single line:
   `See: [examples/portal/examples/<area>/<Component>/<Component>Example.js](../../examples/portal/examples/<area>/<Component>/<Component>Example.js)`
   If the doc already has an `## Example` section, replace its body with the line above. One link per doc; do not embed code dumps.
3. **CHANGELOG entry.** Append to `CHANGELOG.md` under a new version header:
   - Examples directory rewritten — old portal moved to `examples/legacy/portal/`, old auth + standalone HTML demos moved to `examples/legacy/`.
   - New `examples/portal/` is the single canonical demo, mirrors `docs/web-mojo/`.
   - Manifest-driven via `examples/portal/examples.registry.json`; `find-example` skill points there.
   - Link to `docs/web-mojo/examples.md` for the full index.
4. **Dead-script cleanup.** `package.json` — remove or fix any script that referenced moved paths (`serve-examples.js` may still work; confirm). `serve-examples.js` itself: leave alone unless it has a hard-coded path to a moved file.
5. **Smoke tests.** Two new test files under `test/build/`:
   - `test/build/examples-registry.test.js` — runs the generator, parses the output, asserts (a) every `example.json` validates against schema, (b) every referenced page file exists and exports a default class extending `Page`, (c) every route is unique, (d) the second run produces a byte-identical registry.
   - `test/build/examples-coverage.test.js` — asserts every `<area>/<Component>` listed in `docs/web-mojo/README.md` has a matching folder under `examples/portal/examples/`. Failures are named explicitly.
   Both use the project's custom test runner (`node test/test-runner.js`) — see `.claude/rules/testing.md`.

### Files / paths touched (concrete list)

**Moved (Wave 1 step 1):** entire current `examples/portal/`, `examples/auth/`, all other `examples/*` folders and standalone HTML files → under `examples/legacy/`.

**Created (Wave 1):**
- `examples/portal/index.html`
- `examples/portal/app.js`
- `examples/portal/app.css`
- `examples/portal/README.md`
- `examples/portal/shell/HomePage.js`
- `examples/portal/scripts/build-registry.js`
- `examples/portal/examples/core/View/ViewExample.js`
- `examples/portal/examples/core/View/example.json`
- `examples/portal/examples.registry.json` (generated)

**Created (Wave 2):** ~33 `<Component>Example.js` files plus their `example.json` siblings, organized per the table above. `examples/auth/index.html` + `examples/auth/login.js` (or similar minimal pair) for the new auth example.

**Modified:**
- `vite.config.js` — confirm/extend `web-mojo/<extension>` aliases.
- `package.json` — add `examples:registry` script, update `dev` to run the generator first.
- `CHANGELOG.md` — Wave 3 entry.
- `docs/web-mojo/<area>/<Component>.md` (each that has a corresponding example) — append a single "See:" link.
- `docs/web-mojo/README.md` — three new rows added during planning by doc agents (ContextMenu ✅, MultiStepWizard, SearchFilterForms).

**Out of this PR's scope:** see `## Out of scope` in the request body.

### Design Decisions

- **Single-file canonical = demo.** Eliminates the "which file do I copy?" ambiguity for both LLMs and humans, and removes a whole class of canonical-vs-demo drift. The cost is that each example is also a runnable Page (slightly more boilerplate than a stripped reference), but a Page subclass is what consumers write anyway, so the boilerplate IS the example.
- **Inline template strings, no `.mst` files.** Confirmed by the user; matches what the framework supports natively (`template:` accepts a string). External `.mst` files added a path the LLM had to discover and a build step the consumer had to wire up. Inline keeps the artifact whole.
- **Manifest + generator over hand-maintained `app.js`.** The current portal's `app.js` is 583 LOC of `registerPage` calls plus a hand-maintained sidebar. Manifest-driven means adding an example is one folder, no coordination with the shell. The same registry feeds the LLM's `find-example` skill.
- **Folder taxonomy mirrors `docs/web-mojo/`.** When an LLM reads the docs and needs an example, the path translation is mechanical: `docs/web-mojo/components/TableView.md` → `examples/portal/examples/components/TableView/`. No second taxonomy to learn.
- **Imports from `web-mojo` only in example files.** Forces the package's exported surface to be enough. If something can't be exampled without `/src/...`, that's an export bug, not a workaround target. The portal shell (`app.js`, `HomePage.js`) is allowed to use `/src/...` for repo-internal dev ergonomics — but only the shell, never the canonical examples.
- **`git mv` for the legacy archive.** Preserves blame/history so the legacy code is still readable as code, not a flat snapshot. Free; no reason not to.
- **Real backend over mock REST.** User chose `localhost:9009`. Mock REST would have been more portable but examples lose fidelity (auth, file uploads, real Collection paging). The README documents the backend dependency clearly.
- **Doc gaps split into two requests.** The three docs the legacy portal actively demonstrates (ContextMenu, MultiStepWizard, SearchFilterForms) are filled in parallel during this work — examples will reference them. The eleven other undocumented public exports (Router, ProgressView, TokenManager, …) become a separate request (`document-undocumented-public-exports.md`) so this rewrite doesn't sprawl.

### Edge Cases

- **Backend down.** The portal hits `localhost:9009`. Wave 1 step 5's worked example must include a graceful empty state when the backend returns 0 records or fails — pattern is shown in `pages/HomePage.js`'s try/catch, but the new examples must not swallow errors (a console.error on failure is fine; mock data is not). Document the backend dependency in the portal README.
- **Sibling variants and route collisions.** Sibling files like `DialogContextMenuExample.js` route to `components/dialog/context-menu`. The registry generator must enforce uniqueness across the flat `pages` array; route collisions fail the build with a named error.
- **`example.json` schema drift.** Required vs. optional fields will evolve. The generator emits a clear error per malformed manifest, naming the file and missing field. Smoke test catches accidental schema violations on PR.
- **Missing pages in registry.** If a new component is added to `docs/web-mojo/README.md` but no example folder exists, the coverage smoke test fails by name — the offending row is listed in the failure output. This is the fence that keeps the docs and examples in sync.
- **Pages cached by `PortalWebApp`.** Per-visit logic must be in `onEnter()`, not the constructor or `onInit()`. Wave 2 agents must not assume `onInit` runs every visit. The locked `ViewExample.js` from Wave 1 step 5 must demonstrate this correctly.
- **Forms section nested menu.** The legacy portal had a separate `formsMenu` switched in by user action. The new portal generates a single sidebar from area groups; `forms/` and `forms/inputs/` are nested groups in the same sidebar, no menu-swap. Simpler and matches the docs taxonomy.
- **Auth example circular dependency.** The new portal sets `auth: { loginUrl: '/examples/auth/' }` (or similar). The new `examples/auth/` must run as a standalone HTML page that doesn't itself require auth — login form posts to `localhost:9009`, redirects back to `/examples/portal/` on success.
- **`registerAdminPages` from the legacy portal.** The legacy `app.js` calls `registerAdminPages(app, true)` and `registerAssistant(app)` — these wire in a large surface from `src/admin.js`. The new portal does NOT do this — admin views are not examples. Anyone who wants the admin surface uses `web-mojo/admin` directly. The README documents the difference.
- **Standalone HTML demos in legacy/.** Vite still serves `examples/legacy/*.html` if anyone navigates there. They'll be broken if their imports referenced moved files; that's acceptable — they're frozen. The legacy README states this.
- **Registry path used by `find-example`.** The bootstrap gist's `find-example` skill walks the tree; we publish the registry at a fixed path: `examples/portal/examples.registry.json`. Document this contract in the portal README so the gist authors can rely on it.

### Testing

- **During Wave 1 step 5:** load `http://localhost:3000/examples/portal/?page=core/view` and verify (a) the page renders, (b) no console errors, (c) the sidebar shows the new entry under "Core". Screenshot the result and attach to the build log.
- **During Wave 2:** each agent runs `npm run examples:registry && npm run dev`, opens its routes, verifies no console errors, and confirms the registry rebuild is byte-identical on a second run.
- **During Wave 3:**
  - `node test/test-runner.js test/build/examples-registry.test.js` — schema + idempotency + page-class checks.
  - `node test/test-runner.js test/build/examples-coverage.test.js` — coverage matches `docs/web-mojo/README.md`.
  - `npm test` — full suite must remain green.
  - Manual smoke: load the portal, click every sidebar entry, confirm zero console errors against the live backend.

### Docs Impact

- **Three new docs landed via background agents during planning** (all ✅): `docs/web-mojo/components/ContextMenu.md`, `docs/web-mojo/forms/MultiStepWizard.md`, `docs/web-mojo/forms/SearchFilterForms.md`. Each agent appended a row to `docs/web-mojo/README.md` and the relevant section index (forms/README.md). Available for Wave 2 to reference.
- **Per-doc cross-links** added in Wave 3 — one `## Example` section per doc page that has a corresponding example file.
- **Generated index** — `docs/web-mojo/examples.md` is emitted by the registry generator.
- **CHANGELOG entry** in Wave 3 explicitly documents: legacy archive location, new portal location, manifest contract, the `find-example` registry path.
- **Out of this request's scope:** the eleven other undocumented public exports (Router, ProgressView, TokenManager, SimpleSearchView, SideNavView, ConsoleSilencer, DjangoLookups, DataWrapper, MustacheFormatter, EventDelegate-as-its-own-page, applyFileDropMixin-as-its-own-page, UserProfileView/PasskeySetupView). These are tracked in `planning/requests/document-undocumented-public-exports.md`.

---

**Hand-off:** Start new session, run `/build planning/requests/examples-rewrite.md`
