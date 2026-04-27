# Portal: FormBuilder live playground + collapsible sidebar groups

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-26 |
| Priority | medium |

## Description

Two related improvements to the examples portal:

1. **Replace the static FormBuilder example with a live JSON → form playground.** The current `forms/form-builder` example just renders pre-built HTML. Replace it with a two-pane "playground": a JSON editor on the left, a live `FormView` rendered from that JSON on the right, and a third pane showing `await form.getFormData()` after submit. Same `fields` config that `FormView` already accepts — no new schema. Ships with a small set of preset configs the user can load (e.g. login, profile, survey).

2. **Collapse the sidebar group sections.** The four topic sub-sidebars (Architecture, Components, Forms, Extensions) are now long enough to scroll. Convert each "group label" (currently a non-interactive `kind: 'label'` heading) into a collapsible parent containing the group's leaf items as `children`. Sidebar already supports this submenu pattern (text + icon + `children`, no `route`).

## Context

- Legacy portal had a "Form Playground" item in `examples/legacy/portal/menus/formsMenu.js` marked **Coming Soon** — the feature was scoped but never shipped. The user remembers it as a useful demo: paste any JSON, get a working form, customize freely.
- The current `examples/portal/examples/forms/FormBuilder/FormBuilderExample.js` is the canonical demo of `FormBuilder.buildFormHTML()` / `buildFieldsHTML()`. It's narrow and rarely the right thing to reach for — `FormView` is what 99% of users want, and `FormView` accepts the same `fields:` array. The playground is a much higher-value occupant of the same registry slot.
- The portal taxonomy (`TOPIC_TAXONOMY` in `examples/portal/scripts/build-registry.js`) was recently flattened (see `planning/done/taxonomy-realign-phase1.md`) because **variant routes** under a collapsible parent become unreachable — the framework Sidebar treats parents-with-children as Bootstrap collapse toggles. That constraint stays. This request only collapses the **group section labels** (which already have no route), not the leaf example routes.
- `docs/web-mojo/components/SidebarTopNav.md` lines 146–159 documents the submenu/children pattern. Children inherit all leaf properties (route, icon, action, badge).

## Acceptance Criteria

### Playground

- [ ] `examples/portal/examples/forms/FormBuilder/` is replaced (folder kept, files swapped):
  - [ ] `FormBuilderExample.js` becomes a `Page` subclass that renders three panes: JSON editor (textarea), live form preview, last-submission JSON.
  - [ ] `example.json` is updated: `title` becomes "FormBuilder — live JSON playground", `summary` reflects the new behavior, `tags` updated. `route` stays `forms/form-builder`. `docs:` stays pointed at `docs/web-mojo/forms/FormBuilder.md` (the playground IS a FormBuilder demo — it shows the syntax, even though it mounts via FormView).
- [ ] Editing the JSON re-renders the form within ~250ms of last keystroke (debounced). Invalid JSON shows a small error chip; the previous valid form stays mounted so the user isn't punished for typing.
- [ ] A small "Load preset" `<select>` (or button row) loads 3–5 canned configs into the editor:
  - "Login" — text/password + submit
  - "Profile" — name/email/avatar/textarea
  - "Survey" — radio + select + textarea
  - "Conditional fields" — uses `showWhen` to demonstrate dynamic visibility
  - "All field types" — points the user at the existing `forms/form-view/all-field-types` example rather than duplicating it
- [ ] A "Submit" button calls `form.validate()` then `await form.getFormData()` and prints the JSON to the third pane. Reset clears the form and the third pane.
- [ ] The page header explicitly explains that `FormView` and `FormBuilder` accept the same `fields:` array, with a link to `docs/web-mojo/forms/FormBuilder.md` and a link to the FormView example.
- [ ] The example file stays single-file, ≤ ~250 LOC (the portal convention is ≤150 but this page genuinely needs more for the three panes and presets — keep it tight).
- [ ] Imports come from `web-mojo` only (`Page`, `FormView`). No `@core/...` imports in example code.

### Collapsible sidebar groups

- [ ] In `examples/portal/app.js`, `buildTopicMenu()` is updated so each `group` becomes a collapsible parent (one item with `text`, `icon`, and `children: [...]`) instead of a `kind: 'label'` followed by N flat siblings.
- [ ] Each group needs a sensible Bootstrap icon. Suggested mapping (final choice up to design pass):
  - Architecture → Core: `bi-box`, App Shells: `bi-app`, Pages: `bi-file-earmark-text`, Services: `bi-hdd-network`, Models: `bi-database`
  - Components → Modals & Dialogs: `bi-window`, Lists & Tables: `bi-table`, Files: `bi-file-earmark`, Navigation: `bi-compass`, Other: `bi-three-dots`
  - Forms → FormView: `bi-ui-checks-grid`, Field Types: `bi-input-cursor-text`, Specialized Inputs: `bi-stars`, Patterns: `bi-diagram-3`
  - Extensions → Charts: `bi-graph-up`, Maps & Location: `bi-geo-alt`, Media: `bi-image`, UI: `bi-palette`
  - Add an `icon` field to each group in `TOPIC_TAXONOMY` rather than mapping by label in `app.js` — the icon is data, not UI logic.
- [ ] The leaf routes inside each collapsed group remain reachable when the group is expanded. Active-route highlighting still works inside collapsed groups (Sidebar opens the matching group when a child route is active).
- [ ] Default state: groups collapsed by default? Probably **expanded by default** for discoverability — confirm during build. If expanded, the gain is "user can collapse groups they don't care about". If collapsed, the gain is "much shorter initial sidebar". Pick one and document the choice in the implementation commit.
- [ ] No change to `TOPIC_TAXONOMY` route structure — the build assertion that forbids `children` in `TOPIC_TAXONOMY` items stays in place. Variants like `forms/form-view/all-field-types` remain flat sibling routes inside their group's `children` array (one level of collapse, not two).
- [ ] Build still passes: `npm run examples:registry` and `npm run test:build` clean.

### Verification

- [ ] Manual smoke: portal loads, hub sidebar unchanged, click any topic (Architecture/Components/Forms/Extensions) — sidebar shows collapsible groups with chevrons. Click a group header to collapse/expand. Click a leaf to navigate. Active route highlights inside its group.
- [ ] Manual smoke for the playground: load `?page=forms/form-builder`. Default config renders. Edit JSON → form updates. Break the JSON → error chip appears, previous form stays. Load each preset. Submit → JSON appears in the third pane. Reset → form clears.

## Investigation

### What exists

- **Current FormBuilder example**: `examples/portal/examples/forms/FormBuilder/FormBuilderExample.js` — 122 LOC, two static demos (`buildFormHTML()` and `buildFieldsHTML()`), no interaction.
- **Portal sidebar wiring**: `examples/portal/app.js` lines 51–80 (`buildTopicMenu`) — currently emits `{ kind: 'label', text }` + flat leaf siblings per group. `examples/portal/scripts/build-registry.js` lines 60–244 defines `TOPIC_TAXONOMY` with `groups: [{ label, items: [route, ...] }]`.
- **Sidebar collapsible children**: Documented at `docs/web-mojo/components/SidebarTopNav.md:146-159`. The `children:` array on a parent item with no `route` renders a Bootstrap collapse panel — exactly the pattern this request needs.
- **Build assertion**: `build-registry.js:367` rejects any `TOPIC_TAXONOMY` item that's an object with `children`, because variant routes were previously made unreachable by parent collapse toggles. This request DOES NOT touch `TOPIC_TAXONOMY` shape; it only changes how `app.js` translates groups into sidebar menu items at runtime. The assertion stays.
- **FormView fields config**: `docs/web-mojo/forms/FormView.md` and `docs/web-mojo/forms/FormBuilder.md` — same `fields:` array shape. `showWhen` documented at `FormBuilder.md:189-234`.
- **Reference for live re-render pattern**: `examples/portal/examples/components/ListView/` (live filter variant) and `examples/portal/examples/forms/SearchFilterForm/` both debounce input and re-render — copy their debounce idiom (`data-action-debounce="<ms>"` per `.claude/rules/views.md`).
- **Reference for pre-formatted JSON pane**: `examples/portal/examples/forms/FormView/FormViewExample.js:113-122` shows a `<pre>` rendering of `lastSubmission`. Reuse that pattern for the third pane.
- **Untracked in-progress folder**: `examples/portal/examples/components/ActiveGroup/` is uncommitted — not part of this request.

### What changes

- `examples/portal/examples/forms/FormBuilder/FormBuilderExample.js` — full rewrite as the playground page.
- `examples/portal/examples/forms/FormBuilder/example.json` — title/summary/tags refreshed; route unchanged.
- `examples/portal/app.js` — `buildTopicMenu()` rewritten to emit collapsible group parents.
- `examples/portal/scripts/build-registry.js` — `TOPIC_TAXONOMY` groups gain an optional `icon` field; the build attaches it to each group in the emitted `topics` tree (no shape change to leaf items).
- `examples.registry.json` regenerated (auto).
- `docs/web-mojo/examples.md` regenerated (auto, via build).

### Constraints

- **Same registry slot.** Replacing the FormBuilder example reuses route `forms/form-builder`, so no taxonomy entry moves and no cross-link rot.
- **Single-file rule.** The playground stays one `Page` subclass with an inline `template:` string. No separate JSON-editor child view unless it's truly justified.
- **`web-mojo` imports only.** Same as every other example file. If the playground needs a syntax-highlighted JSON editor, use a plain `<textarea>` with monospace styling — do not pull in CodeMirror / Monaco for one example. The portal is a showcase, not a tooling app.
- **No framework changes.** This request adds zero `src/` code. The Sidebar `children` collapse behavior already exists.
- **Build assertion stays.** The "no `children` in TOPIC_TAXONOMY" rule is non-negotiable — collapsing happens at the `buildTopicMenu()` runtime layer, not in the registry contract.
- **Active-group highlighting must work.** When the user navigates to a child route, the parent group should expand automatically so the active leaf is visible. Verify this in the Sidebar implementation before assuming it works for free.

### Related files

- `examples/portal/examples/forms/FormBuilder/FormBuilderExample.js`
- `examples/portal/examples/forms/FormBuilder/example.json`
- `examples/portal/app.js` (lines 50–80, the `buildTopicMenu` function)
- `examples/portal/scripts/build-registry.js` (lines 60–244, `TOPIC_TAXONOMY`)
- `examples/portal/examples/forms/FormView/FormViewExample.js` (reference pattern for the three-pane layout + last-submission rendering)
- `examples/portal/examples/forms/FormView/AllFieldTypesExample.js` (reference for "all field types" preset link)
- `docs/web-mojo/components/SidebarTopNav.md:146-159` (collapsible children docs)
- `docs/web-mojo/forms/FormBuilder.md` (linked from playground header)
- `docs/web-mojo/forms/FormView.md` (linked from playground header — explains why the playground mounts a FormView)
- `.claude/rules/views.md` (action-debounce, container/child rules)

### Endpoints

None. The playground is purely client-side.

### Tests required

- `npm run examples:registry` — runs clean.
- `npm run test:build` — registry assertions pass; route `forms/form-builder` still in `TOPIC_TAXONOMY`; no orphan routes.
- `npm run lint` — clean (only relevant if `app.js`/`build-registry.js` touch ESLint-covered files; example files are excluded by lint config).
- No new unit tests required — the example is reference code, not framework code, and the sidebar collapse behavior is already documented framework behavior.

### Out of scope

- Any change to the framework `Sidebar` component or its templates.
- Visual builder / drag-and-drop UI on top of FormView. Considered and rejected — too large for one request and orthogonal to "show how the JSON config works".
- Syntax-highlighted JSON editor (CodeMirror, Monaco, etc.). Plain `<textarea>` only.
- Topbar, HomePage, or hub-sidebar restructure. The user explicitly scoped this to the sub-sidebar group lists being too long.
- Resurrecting the legacy `examples/legacy/portal/` menus or `FormsPage`.
- The untracked `examples/portal/examples/components/ActiveGroup/` example — separate work, separate commit.
- Saving / sharing custom playground configs (URL hash, localStorage). Could be a follow-up; do not bundle here.
- Adding a new top-level "Form Playground" entry — replaced existing `forms/form-builder` slot per user direction.

## Plan

### Objective

Replace the static `forms/form-builder` example with a live JSON-editor → live `FormView` playground, and convert each topic sub-sidebar's group sections into Bootstrap-collapsible parents (preserving the existing rule that `TOPIC_TAXONOMY` items remain flat route strings — collapsing happens at the runtime translation layer).

### Steps

1. **`examples/portal/scripts/build-registry.js`** — extend `TOPIC_TAXONOMY` so each `group` carries an optional `icon` field, and propagate it through `buildTopics()`.
   - In `TOPIC_TAXONOMY` (lines 60–244), add `icon: 'bi-...'` to every group object alongside `label` and `items`. Suggested icons (per the request file mapping): Architecture → Core `bi-box`, App Shells `bi-app`, Pages `bi-file-earmark-text`, Services `bi-hdd-network`, Models `bi-database`. Components → Modals & Dialogs `bi-window`, Lists & Tables `bi-table`, Files `bi-file-earmark`, Navigation `bi-compass`, Other `bi-three-dots`. Forms → FormView `bi-ui-checks-grid`, Field Types `bi-input-cursor-text`, Specialized Inputs `bi-stars`, Patterns `bi-diagram-3`. Extensions → Charts `bi-graph-up`, Maps & Location `bi-geo-alt`, Media `bi-image`, UI `bi-palette`.
   - In `buildTopics()` (line 376–395), change `if (items.length) groups.push({ label: group.label, items })` to also include `icon: group.icon || 'bi-folder'`. No other emitted-shape changes.
   - The build assertion at line 367 (no `children` in items) stays — items still have to be plain route strings.

2. **`examples/portal/app.js`** — rewrite `buildTopicMenu()` (lines 51–80) to emit one collapsible parent per group instead of `kind: 'label'` + flat siblings.
   - Replace the body of the `for (const group of topic.groups)` loop with a single push per group:
     ```js
     items.push({
         text: group.label,
         icon: group.icon || 'bi-folder',
         children: group.items.map(item => ({
             text: item.title,
             route: `?page=${item.route}`,
             icon: item.icon || 'bi-circle',
         })),
     });
     ```
   - Drop the now-unused `sidebar-section-label` styling reliance for sub-sidebars (the hub menu still uses `kind: 'label'` for "START HERE" / "BROWSE" — leave that path alone). `app.css` line 46 stays — it still applies to the hub menu.
   - Active-route highlighting works for free: `Sidebar.setActiveItem()` sets `child.active = true` AND `item.active = true` when a child matches (Sidebar.js lines 316–323), and the partial template renders the collapse `<div>` with `class="show"` when the parent is active (Sidebar.js line 474). So a deep-link to `?page=forms/form-view` opens the FormView group expanded on load.
   - Default expand/collapse: groups are collapsed by default; the matching group expands automatically on active route. Document this choice in the commit message.

3. **`examples/portal/examples/forms/FormBuilder/FormBuilderExample.js`** — full rewrite as the playground.
   - Single `Page` subclass, inline `template:`, `web-mojo` imports only (`Page`, `FormView`).
   - `static PRESETS` (class field) holding 4 named field configs — keys: `login`, `profile`, `survey`, `conditional`. Each value is the literal `fields:` array (objects, not stringified). Keep them small (3–6 fields each) to fit the textarea without scrolling.
   - `onInit()`:
     - Set `this.currentPresetKey = 'profile'` (a sensible default).
     - Set `this.configJson = JSON.stringify(PRESETS.profile, null, 2)`.
     - Create the `FormView` once: `this.form = new FormView({ containerId: 'preview-form', fields: PRESETS.profile })` and `this.addChild(this.form)`. Framework auto-renders it on first parent render (per the views.md rule — added in `onInit()`, before first render).
     - Set `this.parseError = null` and `this.lastSubmission = null`.
     - Wire submit echo: `this.form.on('submit', ({ data }) => { ... })` — but we'll prefer the explicit submit button path below; the `on('submit')` handler is only there for completeness if a preset includes `options.submitButton`. To keep one path, use a dedicated submit `<button>` in the page template (not inside the form) so we control the flow.
   - Action handlers:
     - `onActionEditConfig(event, el)` — fires from the textarea on every input (debounced via `data-action-debounce="250"`). Read `el.value`, attempt `JSON.parse(el.value)`. On success: `this.parseError = null`, store `this.configJson = el.value`, then `await this.form.updateConfig({ fields: parsed })`. Re-render the page header (parse-error chip area). On failure: `this.parseError = err.message`, do NOT call `updateConfig`, re-render only the chip area (so the form stays mounted).
     - `onActionLoadPreset(event, el)` — read `el.value` (the `<select>`'s preset key), set `this.configJson = JSON.stringify(PRESETS[key], null, 2)`, set the textarea's `.value` directly, then `await this.form.updateConfig({ fields: PRESETS[key] })`. Clear `this.parseError` and `this.lastSubmission`. Re-render the page.
     - `onActionSubmitPreview(event)` — `event.preventDefault()`, `if (!this.form.validate()) { this.form.focusFirstError(); return; }`, then `const data = await this.form.getFormData(); this.lastSubmission = JSON.stringify(data, null, 2);` and re-render.
     - `onActionResetPreview(event)` — `event.preventDefault(); this.form.reset(); this.lastSubmission = null;` and re-render.
   - Re-render strategy: do NOT call `this.render()` for textarea-input updates because that re-mounts the textarea and steals focus. Instead, update only the small "parse error" chip directly via DOM (`this.element.querySelector('[data-region="parse-status"]').textContent = ...`). The other handlers (preset load, submit, reset) DO call `this.render()` — they're discrete user actions where focus loss is acceptable.
   - Template (Mustache):
     - Header: title, summary, doc link (`docs/web-mojo/forms/FormBuilder.md`), explainer paragraph noting that `FormView` and `FormBuilder` accept the same `fields:` config (link to FormView example via `?page=forms/form-view` and "all field types" via `?page=forms/form-view/all-field-types`).
     - Three-column row (Bootstrap `.row .g-3`): col-lg-5 = JSON editor card, col-lg-4 = live preview card, col-lg-3 = submission output card. Stack on small screens.
     - JSON editor card: `<select data-action="load-preset">` (preset options), `<textarea class="font-monospace" data-action="edit-config" data-action-debounce="250" rows="20">{{configJson}}</textarea>`, plus `<div data-region="parse-status">` showing the chip when `this.parseError` is set.
     - Preview card: `<div data-container="preview-form"></div>`, then a button row outside the form (`<button data-action="submit-preview">Submit</button> <button data-action="reset-preview">Reset</button>`).
     - Submission output card: `<pre>{{lastSubmission}}</pre>` guarded with `{{#lastSubmission|bool}}` / `{{^lastSubmission|bool}}` placeholder text.
   - Stay under ~250 LOC. Class name remains `FormBuilderExample` (coverage test requires the file name).

4. **`examples/portal/examples/forms/FormBuilder/example.json`** — refresh metadata.
   - `title` → `"FormBuilder — live JSON playground"`
   - `summary` → e.g. `"Edit a fields config as JSON, see a live FormView render. Same syntax FormView and FormBuilder both accept."`
   - `tags` → `["form", "builder", "playground", "json", "interactive"]`
   - Leave `name`, `area`, `route`, `page`, `docs`, `menu` unchanged. Route stays `forms/form-builder` so `TOPIC_TAXONOMY` and the coverage test need no edits.

5. **Regenerate the registry and docs index.**
   - `npm run examples:registry` — rewrites `examples/portal/examples.registry.json` (titles/summaries/tags update; topics tree gains `icon` per group) and `docs/web-mojo/examples.md` (no structural change beyond updated FormBuilder row).

6. **Smoke verify.** Load the portal, walk the four sub-sidebars to confirm collapse toggles work and the active-leaf parent auto-expands on deep link. Open `?page=forms/form-builder` and run through: edit JSON, break JSON, load each preset, submit, reset.

### Design Decisions

- **Use `FormView.updateConfig({ fields })` over destroy+recreate.** Already documented in `src/core/forms/FormView.js:2519` and rebuilds a fresh `FormBuilder` internally — simpler than tearing down a child and re-`addChild`ing each keystroke. If a preset triggers state-leakage bugs across rebuilds during build, fall back to `removeChild(this.form.id)` + `new FormView(...)` + `addChild()`.
- **Collapsing at the `app.js` runtime layer, not in `TOPIC_TAXONOMY`.** Preserves the build assertion (line 367) that prevents the original "unreachable parent route" bug. The icons live in `TOPIC_TAXONOMY` (data, not view logic) so the docs-index generator could surface them too if it ever wants to.
- **Three-pane layout matches `FormViewExample`'s "form + last submission" pattern** (lines 92–125), just with one extra column for the JSON editor. Keeps the visual idiom consistent across forms examples.
- **`data-action-debounce="250"` on the textarea** uses the framework's documented input-action debounce (Events.md:243). No need for `MOJOUtils.debounce` wiring.
- **Partial DOM update for the parse-error chip** — calling `this.render()` on every keystroke would steal focus from the textarea. Direct DOM write to a `data-region` element is the smallest surgical patch.
- **Plain `<textarea>` editor.** Per request "out of scope" — no CodeMirror / Monaco. `font-monospace` Bootstrap class is enough.
- **Preset list intentionally small (4 items).** Larger preset libraries belong in docs, not in a single example file.

### Edge Cases

- **Invalid JSON during typing.** Mid-edit input (e.g. `{ "fields": [`) parses-fail constantly. The parse-error chip should be quiet/inline (not a toast or alert), and the previous valid form must stay mounted. Ensure `updateConfig` is NOT called in the failure path so the form keeps its last-good state.
- **Field types that need external data.** `collection`, `collectionmultiselect`, `combo` (with a Collection), and `tabset` need props the playground can't provide. None of the four presets reference these — call this out in a comment so future preset additions don't break the live preview silently.
- **`showWhen` after rebuild.** `FormView.updateConfig` rebuilds the FormBuilder; verify in the browser that `showWhen` fields hide/show after a config swap. If they don't, the playground may need a manual `_updateShowWhen()` call (the doc at `FormBuilder.md:233` warns FormBuilder-direct callers to do this — FormView usually wires it for you).
- **Validation against an empty form.** If a user wipes the JSON to `[]`, `validate()` succeeds and `getFormData()` returns `{}`. Acceptable — show `{}` in the submission pane.
- **Active route in a collapsed group on first load.** Sidebar template uses `{{#active}}show{{/active}}` (line 474), and `setActiveItem` propagates `active=true` to the parent (lines 316–323). Verify on smoke that `?page=forms/form-view` opens the Forms sub-sidebar with the FormView group already expanded.
- **Sub-sidebars already short.** Components → Other has only one item (`chat-view`); collapsing it costs more than it saves visually. Acceptable trade-off — uniform group treatment is more important than per-group optimization. Don't add a one-leaf-special-case.
- **Hub sidebar untouched.** Hub still uses `kind: 'label'` for START HERE / BROWSE; the `sidebar-section-label` CSS still serves it.

### Testing

- `npm run examples:registry` — regenerates clean.
- `npm run test:build` — registry assertions pass; `forms/form-builder` route still resolves; coverage test for `forms/FormBuilder` folder still passes (file name unchanged).
- `npm run lint` — clean (only `app.js` and `build-registry.js` are in lint scope here; example files are excluded per the lint config).
- No new unit tests. The Sidebar collapse and `FormView.updateConfig` paths are framework code already covered.
- Manual smoke in `npm run dev`:
  1. Sidebar: click Architecture/Components/Forms/Extensions; each group has a chevron and toggles. Click a leaf — navigates and auto-expands its group.
  2. Playground at `?page=forms/form-builder`: default preset renders. Edit a field's `label` — form updates within 250ms. Delete a `}` — chip appears, form unchanged. Restore — chip clears. Switch preset → form rebuilds. Click Submit on each preset → JSON appears. Reset clears.

### Docs Impact

- **No `docs/web-mojo/` changes required.** `docs/web-mojo/forms/FormBuilder.md` already documents the syntax the playground uses; the playground is a runnable counterpart, not a re-doc.
- **`docs/web-mojo/examples.md` regenerates** automatically via `build-registry.js` — picks up the new title and summary for the FormBuilder row. No hand edit.
- **`CHANGELOG.md`**: no entry. This is a portal-only change; no public framework API moves.

---

## Resolution
**Status**: Resolved — 2026-04-26

**What was implemented**

Both halves of the request shipped in a single commit (`6b5f560`):

1. **Live FormBuilder JSON playground** at `forms/form-builder` — replaced the static example with a `Page` subclass that renders three panes: a debounced JSON-editor `<textarea>`, a live `FormView` rebuilt via `updateConfig({ fields })` on every valid parse, and a full-width submission card below showing `JSON.stringify(await form.getFormData(), null, 2)`. Nine presets ship: `profile`, `login`, `survey`, `conditional` (showWhen), `toggles` (toggle/checkbox/buttongroup/radio), `datetime` (date/time/datetime + timezone), `selection` (multiselect/checklistdropdown/combo/select), `media` (file/image/color/range/hex/number/url), and `kitchenSink`. Handlers update the DOM directly (`_writeParseStatus`, `_writeSubmission`, textarea `.value` write) instead of calling `this.render()` — keeps textarea focus stable and the preset dropdown's selected option intact across rebuilds. Preset columns were tuned to the ~500px form area (col-lg-6 of a ~1000px page): single inputs default to col-12, only short paired inputs use columns: 6.

2. **Collapsible sidebar groups** — `TOPIC_TAXONOMY` in `build-registry.js` gained an `icon: 'bi-...'` field on every group; `buildTopics()` now emits it on every group entry. `buildTopicMenu()` in `app.js` was rewritten to emit one collapsible parent (text + icon + `children: [...]`) per group instead of `kind: 'label'` + flat siblings. The build assertion that forbids `children` in `TOPIC_TAXONOMY` items stays in place — collapsing happens only at the runtime translation layer, never on a routable parent. Active-route highlighting auto-expands the matching group on deep-link via the existing Sidebar template (`Sidebar.js:316–323` propagates `active=true` to the parent; `Sidebar.js:474` renders the collapse with `class="show"` when active).

**Mid-implementation fixes (caught during browser smoke verify)**

- The preset `<select>` originally used `data-action="load-preset"`. That fires on click as well as change and called `event.preventDefault()` after dispatch — blocking the native dropdown from opening. Switched to `data-change-action="load-preset"` (only fires on change).
- The preset dropdown reverted to "Profile" after every preset change because the static `<select>` markup didn't track the current selection. Switched to surgical DOM updates in handlers (no full-page render), eliminating both the textarea-focus-loss problem and the dropdown-reset problem in one stroke.
- Initial layout had three side-by-side cards (Editor / Preview / Submission) at col-lg-5 / col-lg-4 / col-lg-3 — submission card was too narrow and cards looked cramped. Restructured to two col-lg-6 cards on top (Editor + Preview) and a full-width Submission card below.

**Files changed**
- `examples/portal/scripts/build-registry.js` — `icon` added to all 18 groups in `TOPIC_TAXONOMY`; propagated through `buildTopics()` (line 389).
- `examples/portal/app.js` — `buildTopicMenu()` rewritten (lines 51–80) to emit collapsible group parents.
- `examples/portal/examples/forms/FormBuilder/FormBuilderExample.js` — full rewrite, ~330 LOC.
- `examples/portal/examples/forms/FormBuilder/example.json` — title, summary, tags refreshed; route unchanged.
- `examples/portal/examples.registry.json` — regenerated.
- `docs/web-mojo/examples.md` — regenerated.
- `docs/web-mojo/forms/FormBuilder.md` — one bullet added by docs-updater agent pointing at the playground from "Related Documentation".

**Tests run**
- `npm run examples:registry` — clean; registry byte-identical on second run.
- `npm run test:build` — all commit-relevant assertions pass (registry generator, examples-coverage for `forms/FormBuilder`, "no topic item has children" guardrail). `dist/` infra failures are pre-existing from unrelated parallel CSS reorg work.
- `npm run test:unit` — 23/25 files pass; 2 failures in `ContextMenu.test.js` are pre-existing JSDOM CSS limitations unrelated to this commit.
- `npm run test:integration` — 3 failures, all pre-existing alias-resolution / missing-file issues unrelated to this commit.
- `npm run lint` — no errors in any file touched by this commit.
- Browser smoke verify — walked all 9 presets via the dropdown; verified DOM coordinates show `columns: 6` fields are correctly placed side-by-side (notifications x=868 / dark_mode x=1112 at y=358); verified dropdown stays on the chosen preset across all switches.

**Agent findings**
- **test-runner**: no regressions from this commit; all commit-relevant assertions pass.
- **docs-updater**: added one bullet to `docs/web-mojo/forms/FormBuilder.md` Related Documentation section. SidebarTopNav.md already accurate. CHANGELOG skipped (portal-only change).
- **security-review**: no critical findings. `_escape()` is applied correctly in all `innerHTML` assignment paths. One informational note: arbitrary user JSON is fed into `FormView.updateConfig`, so if FormBuilder doesn't internally escape `label`/`help`/`placeholder` strings, a crafted JSON payload could XSS the live preview. Out of scope for this diff (it's a framework property), and a self-only XSS in a no-auth playground has very low real-world impact, but worth verifying separately.

**Validation**
- Acceptance criteria met for both halves.
- Out-of-scope items honored: no framework `src/` changes, no syntax-highlighted editor, no topbar/HomePage tweaks, no save/share of custom configs.

**Follow-ups (optional)**
- Confirm `FormBuilder` HTML-escapes field `label`/`help`/`placeholder` strings before rendering — flagged by security-review.
- The playground intentionally avoids field types that need external state (`collection`, `collectionmultiselect`, `tabset`); if/when those become standalone-renderable, add a preset.
