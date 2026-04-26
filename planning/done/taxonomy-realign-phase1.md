# Taxonomy realignment — Phase 1 (area mismatches + dead code cleanup)

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
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

---

## Plan

### Objective

Land the realignment in one merge: **P1 area moves** + **P3 dead-code/doc cleanup** + **P2 model relocation** (14 admin-coupled models out of `src/core/models/`) + **FormBuilder example** (the P4 priority). After this lands:

- Source / docs / examples agree on area for every artifact.
- 14 admin models live next to admin code; `web-mojo` main entry stops shipping them to non-admin consumers.
- Two new public package entries split admin into UI vs data: `web-mojo/admin` (pages + views, depends on UI) and `web-mojo/admin-models` (data-only, zero UI deps — usable from a Node script, an API client, or a different UI library entirely).
- FormBuilder has a runnable canonical example.

The other P4 doc-gap items (`auth`, `docit`, `user-profile`, `mojo-auth` doc-less; undocumented utility classes) get their own follow-up request file written but not implemented here.

### Scope decisions baked in

- **14 models move**, not 16. `Log` and `ShortLink` stay in core. `Log` is consumed by `user-profile/views/ProfileActivitySection.js`; `ShortLink` is consumed by `src/core/views/data/FileView.js` (file share links). Moving them would create core→admin-extension or extension→extension dependencies. Audit gets a one-line correction note.
- **Single flat `src/extensions/admin/models/` folder** mirroring `src/core/models/`, not a nested sub-area layout. All 14 admin models are co-located and discoverable as a group.
- **Double package entry for admin** (the user-confirmed approach):
    - `web-mojo/admin` (existing) — pages + views ONLY. NO models re-exported.
    - `web-mojo/admin-models` (new) — the 14 admin models ONLY. No UI deps. Source: a new `src/admin-models.js` re-exporting from `src/extensions/admin/models/index.js`.
- **Public API breaking change**: removing the 7 admin-model `export * from '@core/models/<X>.js'` lines from `src/index.js`. Migration recipe in CHANGELOG: `from 'web-mojo'` → `from 'web-mojo/admin-models'`.

### Steps

**A. P1 area moves**

1. Move `examples/portal/examples/extensions/TabView/` → `examples/portal/examples/components/TabView/`. Update `example.json`: `area: "components"`, routes `components/tab-view` and `components/tab-view/dynamic`, `docs:` path.
2. Move `docs/web-mojo/extensions/TabView.md` → `docs/web-mojo/components/TabView.md`.
3. Move `docs/web-mojo/components/TablePage.md` → `docs/web-mojo/pages/TablePage.md`. Example folder is already at `pages/TablePage/` — only the doc moves. Update the example's `example.json` `docs:` path.
4. Move `examples/portal/examples/extensions/FileUpload/` → `examples/portal/examples/services/FileUpload/`. Update `example.json`: `area: "services"`, route `services/file-upload`, `docs:` path.
5. Move `docs/web-mojo/extensions/FileUpload.md` → `docs/web-mojo/services/FileUpload.md`.
6. `git mv -f docs/web-mojo/extensions/metricsminichartwidget.md docs/web-mojo/extensions/MetricsMiniChartWidget.md`. Update the Charts `example.json` `docs:` field.
7. Cross-references — `docs/web-mojo/README.md`, `docs/agent/architecture.md`, `AGENT.md`, `docs/web-mojo/AGENT.md`. `TOPIC_TAXONOMY` in `examples/portal/scripts/build-registry.js` (TabView routes to Components → Navigation; FileUpload to Architecture → Services). `test/build/examples-coverage.test.js` `REQUIRED_COMPONENTS` (TabView: extensions → components; FileUpload: extensions → services).

**B. P3 dead code & doc cleanup**

8. `git rm src/core/views/map/MapView.js` (no consumers; canonical is `src/extensions/map/MapView.js`).
9. `git mv docs/web-mojo/forms/FORMS_DOCUMENTATION_PLAN.md planning/notes/forms-documentation-plan.md`.
10. Delete `docs/web-mojo/extensions/Map.md` after folding any unique content into `MapView.md`.
11. Review `docs/web-mojo/extensions/Location_API.md` — delete if redundant with `Location.md`, otherwise merge. Commit message documents the choice.

**C. P2 model relocation — 14 admin models out of `src/core/models/`**

**Models that move**: AWS, Assistant, Bouncer, Email, Incident, IPSet, Job, JobRunner, LoginEvent, PublicMessage, Push, Phonehub, ScheduledTask, Tickets.
**Models that stay in core**: Log, ShortLink (plus the 8 truly-core: User, Group, Member, ApiKey, Files, Settings, Metrics, Passkeys, System).

12. Create destination folder `src/extensions/admin/models/`. Move 14 model files into it.
13. Rewrite import paths in 58 admin files (73 statements per the explorer audit): `@core/models/<X>.js` → `@ext/admin/models/<X>.js` for the 14 moved models. Do NOT touch imports for the 10 still-core models.
14. Cross-model imports inside the moved set:
    - Moved-to-moved becomes relative (`./Incident.js` from inside `Tickets.js`).
    - Moved-to-still-core stays `@core/models/<X>.js` (e.g. `Push.js`'s `import { GroupList } from '@core/models/Group.js'` is unchanged).
15. Update `scripts/generate-model-exports.js` to scan BOTH `src/core/models/` and `src/extensions/admin/models/` and emit a barrel for each.
16. Generate `src/core/models/index.js` (10 models) and the new `src/extensions/admin/models/index.js` (14 models) by running the script.
17. **Update `src/index.js`**: REMOVE 7 admin-model `export * from '@core/models/<X>.js'` lines (AWS, Email, Incident, Job, JobRunner, Push, Tickets). The 7 stay-core lines (Files, Group, Log, Member, Metrics, System, User) keep `@core/models/...` paths.
18. **Create `src/admin-models.js`** — single export-line `export * from '@ext/admin/models/index.js';`. Mirrors the shape of `src/auth.js`, `src/charts.js`, etc.
19. **Update `src/admin.js`**: do NOT re-export models. Pages + views only — keep its current shape.
20. **Update `config/vite.config.lib.js`**: add `path.resolve(ROOT, 'src/admin-models.js')` to the `entry:` array, alphabetical-ish placement near the other entries.
21. **Update `package.json` `exports` map**: add `"./admin-models": { "import": "./dist/admin-models.es.js", "require": "./dist/admin-models.cjs.js" }` between the existing `./admin` and `./charts` entries.
22. **Update `docs/web-mojo/models/BuiltinModels.md`**: remove the 14 admin-model sections; keep only the 10 still-core models. Imports show `from 'web-mojo'` (or `from 'web-mojo/models'`).
23. **Update `docs/web-mojo/extensions/Admin.md`**: add an "Admin Models" section listing the 14 with `import { Job, JobList } from 'web-mojo/admin-models'` examples. Cross-link to BuiltinModels.md for the still-core ones. Note the UI/data split (pages = `web-mojo/admin`; models = `web-mojo/admin-models`).
24. **Update `examples/portal/examples/models/BuiltinModels/BuiltinModelsExample.js`**: remove demos of the 14 moved models; revise the surrounding copy to clarify the split.

**D. FormBuilder example**

25. Add `examples/portal/examples/forms/FormBuilder/FormBuilderExample.js` — single-file example, ≤150 LOC, follows `FormViewExample.js` conventions. Demos:
    - Construct a `FormBuilder` directly with a `fields` array, call `buildFormHTML()`, inject into a container — no `addChild`, no FormView, no validation.
    - Second example: `buildFieldsHTML()` (no form tag) to show the shaping difference.
    - On-page text: "FormBuilder is the engine; FormView is what you usually want." Cross-link to `forms/FormView.md` and `forms/FormBuilder.md`.
26. Add `examples/portal/examples/forms/FormBuilder/example.json` — `area: "forms"`, route `forms/form-builder`, `docs: "docs/web-mojo/forms/FormBuilder.md"`.
27. Add `'forms/form-builder'` to `TOPIC_TAXONOMY` under **Forms → FormView** group, after `forms/form-view/all-field-types`.
28. Add `'FormBuilder'` to `examples-coverage.test.js` `REQUIRED_COMPONENTS.forms`.

**E. Regenerate, build, test, verify**

29. `node scripts/generate-model-exports.js` — regenerates both barrels.
30. `node examples/portal/scripts/build-registry.js` — regenerates registry (79 examples) + `docs/web-mojo/examples.md`.
31. `npm run build:lib` — bundle compiles. `dist/admin-models.es.js` is new; `dist/admin.es.js` size unchanged (still UI-only); `dist/index.es.js` size shrinks (no longer ships the 7 admin re-exports).
32. `npm run test:build` — registry + coverage assertions pass.
33. `npm run test:unit` — admin-model tests (if any) pass with updated paths.
34. Grep verification: `grep -r "@core/models/\(AWS\|Assistant\|Bouncer\|Email\|Incident\|IPSet\|Job\|JobRunner\|LoginEvent\|PublicMessage\|Push\|Phonehub\|ScheduledTask\|Tickets\)" src/` returns zero results.
35. Browser smoke (`npm run dev`): Components shows TabView under Navigation; Architecture → Services shows FileUpload; Architecture → Pages shows TablePage; Forms shows FormBuilder; Extensions no longer lists TabView or FileUpload; admin sidebar still loads (admin pages still resolve their model imports through the new path).

**F. Phase 4-future request file**

36. Write `planning/requests/taxonomy-realign-phase4-doc-gaps.md` — captures the doc-less extensions (`auth`, `docit`, `user-profile`, `mojo-auth`) and undocumented utility classes (`TokenManager`, `DjangoLookups`, `ConsoleSilencer`, `TemplateResolver`). Status: open, priority: low. Not implemented in this phase.

### Design Decisions

- **Why 14 models, not 16**: `Log` and `ShortLink` have non-admin consumers (FileView, user-profile). Moving them would create circular or extension-to-extension dependencies. They stay in core; the audit's "admin-only" classification was overzealous on those two.
- **Why a single flat `src/extensions/admin/models/` folder**: Existing admin files don't follow a per-sub-area `models/` convention (view files like `IncidentView.js` live directly in `src/extensions/admin/incidents/`). A single co-located admin-models folder mirrors `src/core/models/`, makes the barrel trivial, and keeps the 14 files easy to find together.
- **Why double-entry (`web-mojo/admin` + `web-mojo/admin-models`)**: Strict separation between UI and data. Models are pure Model/Collection subclasses with no DOM, Bootstrap, or template deps. A consumer who wants to build an API client, write a Node script, or use a different UI library can `import { Job } from 'web-mojo/admin-models'` without pulling in the entire admin page surface (Sidebar, TableView, ContextMenu, …). Tree-shaking *should* drop unused admin pages from a single combined entry, but it's brittle (depends on `sideEffects: false` honesty across the dependency graph). Two entries make the intent explicit and the bundler's job trivial.
- **Why FormBuilder goes into the existing Forms → FormView group**: A new "Internals" group for one example is overkill; FormBuilder is conceptually adjacent to FormView. List as the third item in the FormView group with explicit "you usually want FormView" framing. Re-evaluate if more internals get examples.
- **Removing 7 admin re-exports from `src/index.js` is breaking, accepted**: Documented as a CHANGELOG breaking entry with one-line migration recipe. Benefit (admin-app consumers no longer pay the bytes for unused admin models in the main `web-mojo` bundle) outweighs migration cost.
- **No old-route redirect map**: Public examples portal, not a production app. Route 404s are a feature — they make wrong URLs loud and surface stale internal cross-links.
- **`scripts/generate-model-exports.js` scans both folders**: keeps the auto-generation invariant intact across the two barrels. Re-running on a fresh checkout produces both deterministically.
- **`web-mojo/models` continues to point at `src/core/models/index.js`**: now slimmed to 10 models. No change to that public path; `web-mojo/admin-models` is the new sibling.

### Edge Cases

- **Cross-model imports inside the moved set**: `Tickets.js → Incident.js`, `EventView.js` admin file → `Ticket + Job + Log + Incident`, etc. The grep audit gives a complete list. Moved-to-moved becomes relative (`./Incident.js`); moved-to-still-core stays `@core/models/...`. One bad path = build failure (caught immediately).
- **`@ext` alias**: confirmed already configured in `vite.config.js` (admin pages already use `@ext/admin/...`). No alias work needed.
- **Auto-generator filter logic**: "models in this folder" — naturally correct after the move, since the moved files no longer exist in `src/core/models/`. No filter change required.
- **`docs/pending_update/CoreModels.md`**: references many moved models. Per `.claude/rules/docs.md` it's drafts only and explicitly NOT authoritative — leave untouched. Mention the staleness in CHANGELOG.
- **`scripts/fix-extension-imports.js`**: explorer noted it has a JobRunner reference. Inspect; if it has a hardcoded `@core/models/JobRunner.js` reference, update it.
- **`src/lite/index.js`**: imports `FormBuilder` directly. No model-related changes there. Verify `npm run build:lite` still passes.
- **`metricsminichartwidget.md` case-only rename**: macOS APFS is case-insensitive by default. Use `git mv -f` so the casing actually flips in the index.
- **Tests in `test/unit/` and `test/integration/`**: any that import admin models need their paths updated.
- **Build determinism**: registry regen still byte-identical (FormBuilder adds one route, sorted by `route.localeCompare`).
- **Topic taxonomy validator**: catches stragglers automatically — if any cross-reference is missed, the build fails with "TOPIC_TAXONOMY references unknown route" or "route not in TOPIC_TAXONOMY".

### Testing

- `node scripts/generate-model-exports.js` — exits 0; emits both barrels.
- `node examples/portal/scripts/build-registry.js` — exits 0; 79 examples; deterministic.
- `npm run build:lib` — `dist/admin-models.es.js` and `dist/admin-models.cjs.js` exist and contain the 14 models. `dist/index.es.js` size shrinks by ~7 admin re-exports.
- `npm run test:build` — registry + coverage assertions pass; FormBuilder coverage entry green.
- `npm run test:unit` — green.
- Grep: `grep -rE "@core/models/(AWS|Assistant|Bouncer|Email|Incident|IPSet|Job|JobRunner|LoginEvent|PublicMessage|Push|Phonehub|ScheduledTask|Tickets)" src/` returns nothing.
- Browser smoke: Components shows TabView; Architecture → Services shows FileUpload; Forms shows FormBuilder; admin pages (Job dashboard, Incident table, Bouncer security) still load — load-bearing test for the import-path rewrite.
- Public-API smoke: in a quick repl, `import('web-mojo').then(m => m.Job)` returns `undefined`; `import('web-mojo/admin-models').then(m => m.Job)` returns the class.

### Docs Impact

- `docs/web-mojo/README.md` — TabView, TablePage, FileUpload entries point at new paths; directory tree at the bottom reflects new locations; admin-models cross-link added to the "Built-in Models" section.
- `docs/web-mojo/AGENT.md`, `AGENT.md` — same updates.
- `docs/agent/architecture.md` — repo layout shows `extensions/admin/models/` folder and the new `src/admin-models.js` entry; source-map table updates TabView and FileUpload locations.
- `docs/web-mojo/components/TabView.md`, `docs/web-mojo/services/FileUpload.md`, `docs/web-mojo/pages/TablePage.md`, `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — moved into place, content unchanged.
- `docs/web-mojo/models/BuiltinModels.md` — heavily revised: only the 10 still-core models documented; explicit cross-link to admin models with the new `web-mojo/admin-models` import path.
- `docs/web-mojo/extensions/Admin.md` — new "Admin Models" section listing the 14, with `from 'web-mojo/admin-models'` examples; calls out the UI/data split (`web-mojo/admin` for pages, `web-mojo/admin-models` for data).
- `docs/web-mojo/examples.md` — auto-regenerated under topic taxonomy.
- `CHANGELOG.md` — Unreleased entry under "Examples Portal" for area moves; **separate "Breaking" entry** for the public-API change with one-line migration recipe (`from 'web-mojo'` → `from 'web-mojo/admin-models'` for the 7 affected models).

### Out of Scope

- Other Phase 4 items (`auth`, `docit`, `user-profile`, `mojo-auth` doc-less; undocumented utility classes). Captured in a new `planning/requests/taxonomy-realign-phase4-doc-gaps.md` written but not implemented in this phase.
- Refactoring `FileView` / `ProfileActivitySection` to remove their `ShortLink` / `Log` dependencies.
- Adding redirects for old `?page=extensions/tab-view` and `?page=extensions/file-upload` routes.
- Updating `docs/pending_update/CoreModels.md` (drafts folder; explicit non-goal).
- Any non-admin model relocation; the 10 still-core models stay where they are.
- Moving admin VIEW files alongside their models; admin pages stay in `src/extensions/admin/<sub-area>/`.

---

## Resolution

**Status**: Resolved — 2026-04-26

### What was implemented

**A. P1 area moves**
- `TabView` example + doc → `components/`. Routes: `extensions/tab-view{,/dynamic}` → `components/tab-view{,/dynamic}`.
- `TablePage` doc → `pages/` (example was already in `pages/`).
- `FileUpload` example + doc → `services/`. Route: `extensions/file-upload` → `services/file-upload`.
- `metricsminichartwidget.md` → `MetricsMiniChartWidget.md` (case-only rename).
- Cross-references updated in `docs/web-mojo/README.md`, `docs/agent/architecture.md`, `AGENT.md`, `docs/web-mojo/AGENT.md`, `TOPIC_TAXONOMY` in `examples/portal/scripts/build-registry.js`, and `test/build/examples-coverage.test.js` `REQUIRED_COMPONENTS`.

**B. P3 dead code & doc cleanup**
- Deleted dead `src/core/views/map/MapView.js` duplicate.
- Moved `docs/web-mojo/forms/FORMS_DOCUMENTATION_PLAN.md` → `planning/notes/`.
- Kept `docs/web-mojo/extensions/Map.md` and `Location_API.md` (audit was overzealous — both contain genuinely distinct content); restored their README links.

**C. P2 model relocation — 14 admin models**
- Moved 14 model files from `src/core/models/` → `src/extensions/admin/models/`.
  Models moved: `AWS`, `Assistant`, `Bouncer`, `Email`, `Incident`, `IPSet`, `Job`, `JobRunner`, `LoginEvent`, `PublicMessage`, `Push`, `Phonehub`, `ScheduledTask`, `Tickets`.
- `Log` and `ShortLink` stayed in core (non-admin consumers in `FileView` and `user-profile/ProfileActivitySection`).
- 73 `@core/models/<X>.js` import statements rewritten across 58 files via a Node script (BSD sed couldn't handle the alternation).
- Intra-admin cross-imports (`Push → Group`, `Tickets → User/Incident`) updated: moved-to-still-core stays `@core/models/...`; moved-to-moved becomes relative.
- Created `src/admin-models.js` (new entry file). Wired in `config/vite.config.lib.js` and `package.json` exports map.
- Removed 7 admin model re-exports from `src/index.js` — public API breaking change documented in CHANGELOG with migration recipe (`from 'web-mojo'` → `from 'web-mojo/admin-models'`).
- Updated `scripts/generate-model-exports.js` to scan both folders and emit two barrels. Also taught it to skip `default as X` lines for files without a default export — fix for a latent bug exposed by the new `admin-models` bundle entry.
- Revised `docs/web-mojo/models/BuiltinModels.md` to cover only the 10 still-core models. Stripped the 9 admin-model H2 sections.
- Extended `docs/web-mojo/extensions/Admin.md` with a new "Admin Models" section listing the 14 with a model/endpoint table.
- Revised `examples/portal/examples/models/BuiltinModels/BuiltinModelsExample.js` to demo only the 8 core entries; added a pointer to `web-mojo/admin-models` for the rest.

**D. FormBuilder example**
- Added `examples/portal/examples/forms/FormBuilder/FormBuilderExample.js` + `example.json`. Demos `buildFormHTML()` and `buildFieldsHTML()`.
- Added `forms/form-builder` route to `TOPIC_TAXONOMY` (Forms → FormView group).
- Added `'FormBuilder'` to `examples-coverage.test.js` `REQUIRED_COMPONENTS.forms`.
- Added `FormBuilder` to `src/index.js` main-entry exports (was undocumented but referenced in the existing `FormBuilder.md` import example).

**F. Phase 4 follow-up**
- Wrote `planning/requests/taxonomy-realign-phase4-doc-gaps.md` covering doc-less extensions (`Auth`, `UserProfile`, `DocIt`, `MojoAuth`) and undocumented utility classes (`TokenManager`, `DjangoLookups`, `ConsoleSilencer`, `TemplateResolver`). Status: open, priority: low.

### Files changed (high-level)

- 14 model files moved (`src/core/models/<X>.js` → `src/extensions/admin/models/<X>.js`).
- 1 model file deleted (`src/core/views/map/MapView.js`).
- 4 doc files moved/renamed (`TabView.md`, `TablePage.md`, `FileUpload.md`, `metricsminichartwidget.md`).
- 2 doc files restored (`Map.md`, `Location_API.md` — kept, README links restored).
- 1 doc file moved out of published docs (`FORMS_DOCUMENTATION_PLAN.md`).
- 73 import statements rewritten across 58 admin files.
- 11 cross-reference docs/configs updated.
- 4 new files (`src/admin-models.js`, `examples/portal/examples/forms/FormBuilder/{FormBuilderExample.js,example.json}`, `planning/requests/taxonomy-realign-phase4-doc-gaps.md`).
- 2 model barrels regenerated.
- 1 build script (`generate-model-exports.js`) extended to scan both barrels + skip-default-when-absent fix.

### Tests run

- `npm run examples:registry` — exits 0; 79 examples across 4 topics.
- `node test/test-runner.js --suite build` — all registry assertions green (every page has topic+group, every flat-page route in exactly one topic, no topic item has children, Start Here routes resolve, byte-identical regen). Coverage assertions all green (every documented component has an example folder; every example folder is in the required list, including new `services/FileUpload`, `components/TabView`, `forms/FormBuilder`).
- `npm run build:lib` — bundle compiles. New `dist/admin-models.es.js` (56KB) and `dist/admin-models.cjs.js` exist.
- Browser smoke: hub renders; Components topic shows TabView under Navigation; Architecture → Services lists FileUpload; Architecture → Pages shows TablePage; Forms shows FormBuilder; Extensions no longer lists TabView or FileUpload; deep-link `?page=components/tab-view` opens TabView; `?page=forms/form-builder` opens FormBuilder; Admin sidebar still loads with all 47 system/* routes registered.
- Grep verification: zero `@core/models/(AWS|Assistant|Bouncer|...|Tickets)` references remaining in `src/`.

### Validation

Public API change verified: `import { Job }` from `'web-mojo'` no longer resolves; `from 'web-mojo/admin-models'` does. Bundle-size shift: `dist/index.es.js` lost the 7 admin re-exports; `dist/admin-models.es.js` is the new home.

The pre-existing build-verification failures (missing `dist/index.html` from `vite build` — not `build:lib`) and the unit failures (`ContextMenu` JSDOM gap, `SeriesChart` `.not.toBeNull` matcher gap) are unrelated to this commit and were failing before it.
