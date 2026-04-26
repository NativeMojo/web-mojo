# Taxonomy realignment — Phase 1 (area mismatches + dead code cleanup)

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | 2026-04-26 |
| Priority | medium |

## Description

Realign source / docs / examples for four artifacts that currently sit in the wrong area, and remove three pieces of confirmed dead or stale code. After this work, the area where a thing's source lives, the area its doc lives in, and the area its example lives in all agree.

The audit at [planning/notes/taxonomy-audit.md](../notes/taxonomy-audit.md) is the authoritative reference. Do not re-do that work — this request implements its **Priority 1** and **Priority 3** sections only. Priorities 2 and 4 are split off into separate follow-up requests (see "Follow-up" below).

> **Note:** A separate critical fix landed alongside the audit — every multi-page component used to render as a collapsible parent in the sidebar, but the framework's Sidebar treats parents-with-children as Bootstrap collapse toggles, making the parent's route unreachable from the sidebar. All such entries have been flattened to siblings; a build assertion now forbids `children` in `TOPIC_TAXONOMY` items. This request does not touch that — it's already in main.

## Context

The reorg in `planning/done/portal-multi-sidebar-reorg.md` made the area mismatches loud: an LLM scanning the registry sees `TabView` under `extensions/` even though its source is at `src/core/views/navigation/TabView.js` and it's exported from the main `web-mojo` entry — not the `web-mojo/map` or `web-mojo/timeline` extension entries. Same story for `FileUpload` (source: `src/core/services/FileUpload.js`, exported from main entry, but doc + example say `extensions/`). These are clear, provable mismatches that confuse both humans and LLMs.

The doc-and-source-but-no-example duplicates (`extensions/Map.md`, `extensions/Location_API.md`) aren't tracked by the example coverage test, so they tend to drift unless we trim them deliberately. Same for the dead `MapView` duplicate at `src/core/views/map/MapView.js` — it has no consumers (the canonical export is from `src/extensions/map/MapView.js` via `web-mojo/map`).

## Acceptance Criteria

### Priority 1 — Area mismatches

- [ ] `TabView` example moved from `examples/portal/examples/extensions/TabView/` to `examples/portal/examples/components/TabView/`. Routes change from `extensions/tab-view` and `extensions/tab-view/dynamic` to `components/tab-view` and `components/tab-view/dynamic`.
- [ ] `TabView` doc moved from `docs/web-mojo/extensions/TabView.md` to `docs/web-mojo/components/TabView.md`.
- [ ] `TablePage` doc moved from `docs/web-mojo/components/TablePage.md` to `docs/web-mojo/pages/TablePage.md`. Example folder is already correctly at `pages/TablePage/`; only the doc moves.
- [ ] `FileUpload` example moved from `examples/portal/examples/extensions/FileUpload/` to `examples/portal/examples/services/FileUpload/`. Route changes from `extensions/file-upload` to `services/file-upload`.
- [ ] `FileUpload` doc moved from `docs/web-mojo/extensions/FileUpload.md` to `docs/web-mojo/services/FileUpload.md`.
- [ ] `docs/web-mojo/extensions/metricsminichartwidget.md` renamed to `docs/web-mojo/extensions/MetricsMiniChartWidget.md` (case-only rename) — matches sibling docs (`MapView.md`, `LightBox.md`, etc.).
- [ ] All cross-references updated: `docs/web-mojo/README.md` (component list and directory tree at the bottom), `docs/agent/architecture.md`, `AGENT.md`, `docs/web-mojo/AGENT.md`, `examples-coverage.test.js` `REQUIRED_COMPONENTS`, `TOPIC_TAXONOMY` in `build-registry.js`. The `example.json` files have their `docs:` and `area:` fields updated to match.

### Priority 3 — Dead code & doc cleanup

- [ ] `src/core/views/map/MapView.js` deleted (canonical version is `src/extensions/map/MapView.js`, exported from `web-mojo/map`). Verify no `@core/views/map/...` imports remain.
- [ ] `docs/web-mojo/forms/FORMS_DOCUMENTATION_PLAN.md` moved to `planning/notes/forms-documentation-plan.md` (it's an internal planning doc that was published by mistake).
- [ ] `docs/web-mojo/extensions/Map.md` deleted (overlaps with `MapView.md` + `MapLibreView.md` and has no example pointing at it). Any unique content is folded into `MapView.md` first.
- [ ] `docs/web-mojo/extensions/Location_API.md` reviewed: either deleted (if redundant with `Location.md`) or merged. The chosen action is justified in the commit message.
- [ ] After all moves: `npm run examples:registry` runs clean; `npm run test:build` runs registry assertions clean; the regenerated `docs/web-mojo/examples.md` shows TabView under Components, TablePage under Pages, FileUpload under Services.

### Verification

- [ ] Manual smoke: portal still loads. Topic sidebar for Components shows TabView under a Navigation group; Forms is unchanged; Extensions no longer lists TabView or FileUpload. Deep-link to the *old* routes (e.g. `?page=extensions/tab-view`) gracefully 404s — see "Out of scope" below for redirect handling.
- [ ] Build assertion in `build-registry.js` ("references unknown route") fails fast if any cross-reference is missed.

## Investigation

### What exists

- **Audit reference**: [planning/notes/taxonomy-audit.md](../notes/taxonomy-audit.md) — full mapping table per area.
- `TabView` is exported from `src/index.js`: `export { default as TabView } from '@core/views/navigation/TabView.js';` — i.e. main entry, not an extension bundle.
- `FileUpload` is exported from `src/index.js`: `export { default as FileUpload } from '@core/services/FileUpload.js';` — same story.
- `TablePage` source is `src/core/pages/TablePage.js`; example folder is already `examples/portal/examples/pages/TablePage/` (correct); doc is at `docs/web-mojo/components/TablePage.md` (wrong).
- `examples-coverage.test.js` hardcodes which components live in which area (`REQUIRED_COMPONENTS` map at line 33). It must move TabView from `extensions` → `components`, FileUpload from `extensions` → `services`, leave TablePage where it is (already in `pages`).
- `cross-link-docs.js` regenerates `## Examples` sections in each doc from the registry's `docs:` field — it follows whatever path the manifest specifies, so updating the `example.json` `docs:` field is enough; no script change required.
- `examples.registry.json` is regenerated; routes change, the topic taxonomy entries get re-pointed.

### What changes

- 3 example folder renames, 4 doc file moves, 1 doc filename casing rename, 1 source file delete, 1 file move out of published docs, 1–2 doc deletes/merges in the maps area.
- ~6 cross-link updates across `docs/web-mojo/README.md`, `docs/agent/architecture.md`, `AGENT.md`, `docs/web-mojo/AGENT.md`, `test/build/examples-coverage.test.js`, `examples/portal/scripts/build-registry.js` (TOPIC_TAXONOMY routes).
- Each `example.json` for the moved examples updates its `area:`, `route:`, and `docs:` fields.

### Constraints

- **No framework changes.** No edits to `src/core/` other than deleting the dead `views/map/` duplicate. No public API changes — `TabView`, `FileUpload`, `TablePage` exports stay where they are in `src/index.js`.
- **Routes change.** This is the first time we're changing example routes since the multi-sidebar reorg. The earlier reorg explicitly preserved routes; this one explicitly changes 4 routes (TabView, TabView dynamic, FileUpload, plus their doc cross-link surfaces). Bookmarks at the old routes will 404. Acceptable because this is the public examples portal (not a production app) and the wrong-area situation is worse than transient 404s.
- **Coverage test must stay aligned.** `examples-coverage.test.js` enforces docs/example symmetry — moving an entry without updating the test fails CI loudly, which is the desired guardrail.
- **Build determinism.** Same byte-identical-regen test still applies; rerunning the registry generator must produce the same output.

### Related files

**Examples to move:**
- `examples/portal/examples/extensions/TabView/` → `examples/portal/examples/components/TabView/` (folder + 2 page files + example.json)
- `examples/portal/examples/extensions/FileUpload/` → `examples/portal/examples/services/FileUpload/` (folder + page file + example.json)

**Docs to move:**
- `docs/web-mojo/extensions/TabView.md` → `docs/web-mojo/components/TabView.md`
- `docs/web-mojo/components/TablePage.md` → `docs/web-mojo/pages/TablePage.md`
- `docs/web-mojo/extensions/FileUpload.md` → `docs/web-mojo/services/FileUpload.md`
- `docs/web-mojo/extensions/metricsminichartwidget.md` → `docs/web-mojo/extensions/MetricsMiniChartWidget.md`

**Files to delete or merge:**
- `src/core/views/map/MapView.js` (delete; canonical is in `src/extensions/map/`)
- `docs/web-mojo/forms/FORMS_DOCUMENTATION_PLAN.md` (move to `planning/notes/forms-documentation-plan.md`)
- `docs/web-mojo/extensions/Map.md` (delete after folding any unique content)
- `docs/web-mojo/extensions/Location_API.md` (review — delete or merge into `Location.md`)

**Cross-references to update:**
- `docs/web-mojo/README.md` (lines around 66, 120, 127, 128, 223, 294, 305, 306, 311)
- `docs/agent/architecture.md` (lines around 61, 74, 77, 88)
- `AGENT.md` (lines around 61, 176)
- `docs/web-mojo/AGENT.md` (lines around 50, 55, 57, 84, 87)
- `examples/portal/scripts/build-registry.js` — `TOPIC_TAXONOMY` routes for TabView (Components → Navigation, currently in Extensions → UI), FileUpload (Services, currently in Extensions → Media). TablePage routes don't change (already in Architecture → Pages).
- `test/build/examples-coverage.test.js` `REQUIRED_COMPONENTS`: move `TabView` from `extensions` → `components`, move `FileUpload` from `extensions` → `services`.

**Per-example manifest fields to update:**
- `examples/portal/examples/components/TabView/example.json` — `area: "components"`, both routes, `docs:` path.
- `examples/portal/examples/services/FileUpload/example.json` — `area: "services"`, route, `docs:` path.

### Endpoints

None. Pure file/doc reorganization.

### Tests required

- Existing `npm run test:build` (registry generator + coverage tests) must pass with all moves applied.
- The new build-time taxonomy assertion (already added: "TOPIC_TAXONOMY references unknown route") catches stragglers automatically.
- Manual smoke after `npm run dev`: load portal → Components topic → confirm TabView appears under Navigation; Services topic (via Architecture sub-sidebar) shows FileUpload; Extensions topic no longer lists TabView or FileUpload.

### Out of scope

- **Priority 2 — model relocation.** Moving 16 admin-only models out of `src/core/models/` into `src/extensions/admin/<sub-area>/models/`. Big rename, touches public exports and ~50 admin files. Separate request: see `planning/requests/taxonomy-realign-phase2-models.md` (to be written after this lands).
- **Priority 4 — doc/example gaps.** `auth`, `docit`, `user-profile`, `mojo-auth` doc-less; `FormBuilder` example-less; several utilities undocumented. Separate request: `planning/requests/taxonomy-realign-phase4-doc-gaps.md` (to be written; lower priority).
- **Old route redirects.** Deep links to old routes (e.g. `?page=extensions/tab-view`) will 404 after this lands. We are explicitly NOT adding a redirect map — this is the public examples portal, not a production app, and we'd rather force the URL to be wrong-and-loud than wrong-and-silent. Anyone bookmarking example pages can fix their bookmarks.
- **`forms/FormBuilder.md`** — The doc exists but no example. Leave it as is; flag in the Phase 4 request.
- **No framework code changes.** No edits to `src/core/` exports, framework component logic, or test harnesses. Only the dead `views/map/MapView.js` duplicate is deleted.

## Follow-up

This request is Phase 1 of a four-phase realignment. The other phases will be filed as their own requests once Phase 1 lands:

- **Phase 2 — Models out of core.** Move 16 admin-coupled models out of `src/core/models/`. See `planning/notes/taxonomy-audit.md` "Models" section.
- **Phase 3 — already merged into this request** (dead code & doc cleanup).
- **Phase 4 — Doc/example gaps.** Write missing docs for `auth`, `docit`, `user-profile`, `mojo-auth` extensions; write the missing `FormBuilder` example.

Phase 2 is the largest of the three remaining; Phase 4 is the smallest and most opportunistic. Order: Phase 1 (this) → Phase 2 → Phase 4.
