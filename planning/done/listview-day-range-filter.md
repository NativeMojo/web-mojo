---
status: resolved
type: request
scope: src/core/views/list · src/core/views/table
created: 2026-05-09
resolved: 2026-05-10
related: src/extensions/admin/incidents/RuleSetView.js (existing manual wiring this helper simplifies)
---

# ListView · `dayRangeFilter` toolbar helper

Add an opt-in `dayRangeFilter` option to `ListView` (inherited by `TableView`) that mounts a `SegmentControl` day-range picker into the toolbar **and** auto-applies the selected range as a `${field}__gte` filter on the collection — exactly as the existing `filterable: true` / `filters: [...]` machinery does for declared filters. Caller does nothing for the common case; a `range:change` event is still emitted for side effects (eyebrow labels, etc.).

## Description

`ListView` already auto-applies declared filters: when a user picks a value in the filter dropdown, ListView writes to `collection.params` and calls `collection.fetch()` automatically (`ListView.js:1870` `applyFilters`). The `daterange` filter type (`ListView.js:1794`) even formalizes Django-style range params with `dr_start` / `dr_end`. `__gte` lookups are the existing convention via `DjangoLookups.js`.

`dayRangeFilter` should fit the same pattern. Today, every list that wants a `1d / 7d / 30d / 90d` range picker has to:

1. `import SegmentControl from '@core/views/navigation/SegmentControl.js'`
2. Build a SegmentControl with the four-option array
3. Wire `range.on('change', ...)` to convert the value to an epoch and write `collection.params[`${field}__gte`] = epoch`
4. Call `collection.fetch()`
5. Pass the SegmentControl to `TableView` as `toolbarRight: this.range`
6. Track `this.rangeValue` separately on the host view to keep state across re-renders

`src/extensions/admin/incidents/RuleSetView.js:585–640` is the canonical example — ~15 lines of boilerplate that every comparable feed (audit timelines, incident feeds, login lists, conversation history) will repeat verbatim.

The helper collapses 1–5 into one option:

```js
new ListView({
    collection,
    dayRangeFilter: true       // boolean form — defaults: field 'created', value '7d', four buckets
});
// → On mount: collection.params.created__gte = nowEpoch - 7*86400, collection.fetch().
// → On segment click: same with the new range, refetch.
```

Object form for overrides:

```js
new ListView({
    collection,
    dayRangeFilter: {
        field: 'occurred',                                    // default 'created' — becomes the `${field}__gte` param key
        value: '30d',                                         // initial selection (default '7d')
        options: [{ value: '1d', label: '1d' }, ...],         // override the four-option default
        ariaLabel: 'Time range'                               // optional
    }
});
```

Side-effect listener (e.g. updating an eyebrow label — RuleSetView's only remaining work):

```js
listView.on('range:change', ({ field, value, previous, params }) => {
    this.eyebrow = `Last ${value}`;
    this.render();
});
```

## Context

`SegmentControl` (`src/core/views/navigation/SegmentControl.js`) and the `toolbarRight` slot already exist. Manual wiring works, but the four-option `1d/7d/30d/90d` shape is common enough to warrant a declarative shortcut, and centralizing it makes the convention discoverable in a single grep. RuleSetView is the only current consumer; the upcoming chronological-feed work in UserView / IncidentView / GroupView will be the next adopters.

The framework's existing convention — declared filters auto-write to `collection.params` and refetch — is preserved. `dayRangeFilter` is the same shape of contract: a declared filter that the toolbar surfaces and the collection responds to.

## Acceptance Criteria

### Constructor / defaults

- [ ] `ListView` accepts `dayRangeFilter: true` and renders a `SegmentControl` in the toolbar with options `[1d, 7d, 30d, 90d]` and initial value `'7d'`.
- [ ] `ListView` accepts `dayRangeFilter: { field?, value?, options?, ariaLabel? }`:
  - `field` defaults to `'created'`. Used as the param key prefix: `${field}__gte`.
  - `value` defaults to `'7d'`. Must match one of `options[].value`.
  - `options` defaults to `[{ value: '1d', label: '1d' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }]`.
  - `ariaLabel` defaults to `'Time range'`.
- [ ] When `dayRangeFilter` is enabled, ListView seeds `collection.params[`${field}__gte`] = nowEpoch - days*86400` **before the initial fetch** so the first request honors the default range. Bucket-to-day mapping: `1d→1`, `7d→7`, `30d→30`, `90d→90`. For non-default options, `value` is parsed via the regex `/^(\d+)d$/` to extract days; values that don't match the regex still fire `range:change` but do NOT seed/write a `__gte` param (caller-defined values like `'all'` or `'ytd'` are escape hatches the caller handles via the event).

### Param translation + refetch

- [ ] On segment change, ListView writes `collection.params[`${field}__gte`] = nowEpoch - days*86400`, sets `collection.params.start = 0`, and calls `collection.fetch()` if `collection.restEnabled` — mirroring the existing `applyFilters()` flow at `ListView.js:1870`.
- [ ] The previous `${field}__gte` value is overwritten on each change (no stacking).
- [ ] `params-changed` is emitted alongside `range:change` (consistency with `list:search`, `list:sort`, filter pills).

### Event

- [ ] `range:change` event fires on the ListView with payload `{ field, value, previous, params: { [`${field}__gte`]: epoch } }` whenever the user picks a different segment, or when `setRange()` is called without `silent: true`.
- [ ] `range:change` does NOT fire on the initial mount-time seed (no "previous" exists; matches the existing pattern where filters seeded from `defaultQuery` don't fire `params-changed`).

### Toolbar layout

- [ ] When both `dayRangeFilter` and `toolbarRight` are passed, both mount **side-by-side** in the toolbar's right-aligned group: the day-range SegmentControl renders to the **left** of the user-supplied `toolbarRight` view (closer to the search/filter cluster). They live in adjacent containers, not a wrapper.
- [ ] `_isToolbarEnabled()` returns true when `dayRangeFilter` is set (the toolbar shell must render even if no other toolbar feature is on).

### API surface

- [ ] `ListView` exposes `getRange()` returning the current value, and `setRange(value, { silent })` that proxies to the underlying SegmentControl, applies the param translation + refetch (unless `silent: true`), and returns `false` when called with an unknown value.
- [ ] The SegmentControl child instance is reachable as `this.dayRangeControl` for callers who need direct access.

### Inheritance + back-compat

- [ ] `TableView` inherits the option unchanged — no TableView-specific code paths.
- [ ] Plain `new ListView({ collection, itemTemplate })` (no `dayRangeFilter`) renders exactly as before — no new DOM, no new children, no behavior change.

### Migration

- [ ] The existing manual wiring in `src/extensions/admin/incidents/RuleSetView.js:585–640` is rewritten to use `dayRangeFilter: { value: '30d' }` (preserving its existing default). The `_applyRange` translation function is deleted; only the eyebrow-update listener on `range:change` remains. Net behavior is unchanged: same range options, same default, same `created__gte` param.

### Tests

- [ ] Unit test in `test/unit/ListView.test.js` covers:
  - Boolean form mounts a SegmentControl child with the four default options and `value === '7d'`.
  - Object form respects `field`, `value`, `options`, `ariaLabel` overrides.
  - On mount, `collection.params.created__gte` is seeded to `nowEpoch - 7*86400` (allow ±5s tolerance).
  - On segment change, `collection.params[`${field}__gte`]` updates, `collection.params.start === 0`, and `collection.fetch()` is called (use mocked collection).
  - `range:change` event fires with `{ field, value, previous, params }` matching the new state.
  - `range:change` is NOT emitted on the initial mount-time seed.
  - `getRange()` / `setRange()` proxy correctly. `setRange('not-an-option')` returns false and does not change state.
  - Combined `dayRangeFilter: true` + `toolbarRight: someView` mounts both children in order (day-range first).
  - `_isToolbarEnabled()` returns true when only `dayRangeFilter` is set.
  - Custom `value: 'all'` (no `\d+d` match) wires the SegmentControl but does NOT write `${field}__gte` — caller-defined escape hatch.

### Docs

- [ ] `docs/web-mojo/components/ListView.md` documents the new option in the toolbar table, with a usage example showing both the zero-config case (`dayRangeFilter: true`) and the side-effect listener pattern.
- [ ] `docs/web-mojo/components/TableView.md` does NOT need a separate section — the table-toolbar note at the top already says "all toolbar features come from ListView."
- [ ] `CHANGELOG.md` entry under the upcoming version.

## Investigation

### What exists

- **`SegmentControl`** (`src/core/views/navigation/SegmentControl.js:28–113`) — `change` event ships `{ value, previous }`. `setValue(value, { silent })` returns `true` when the value matches a known option. Dependency-free, renders a Bootstrap `btn-group`.
- **`ListView` filter auto-apply** (`ListView.js:1870` `applyFilters`) — sets `collection.params.start = 0` and calls `collection.fetch()`. The model dayRangeFilter follows.
- **`ListView` `toolbarRight` slot** (`ListView.js:116`, `:215–226`, `:344`, `:366`) — wires a single optional View via `containerId: 'toolbar-right'`. Mounted in `onAfterRender` if not already mounted; flag-tracks re-renders.
- **Django lookup convention** (`src/core/utils/DjangoLookups.js`) — `__gte` is the codebase-standard lookup for "greater than or equal," used by the existing `daterange` filter type and by RuleSetView's manual wiring.
- **`TableView`** (`src/core/views/table/TableView.js:106`) — declares `toolbarRight` symmetrically with ListView; no behavior of its own.
- **Existing consumer** (`src/extensions/admin/incidents/RuleSetView.js:585–640`) — builds the SegmentControl in `onInit`, hooks `change` to `_applyRange(value)` (which converts the value to days → epoch → `collection.params.created__gte` → `collection.fetch()`), passes the control via `toolbarRight: this.range`, and stores `this.rangeValue` for the eyebrow label.

### What changes

**`src/core/views/list/ListView.js`** — primary change.

- Add `dayRangeFilter` parsing in the constructor. Normalize boolean → object form. Store the resolved config on `this.dayRangeFilter` (object: `{ field, value, options, ariaLabel }`).
- Build the SegmentControl in `onInit()` (same lifecycle as `_initCollection`), assign to `this.dayRangeControl`. Hook its `change` event to:
  1. Compute days from the new value (regex `/^(\d+)d$/`).
  2. If days parsed, write `this.collection.params[`${field}__gte`] = nowEpoch - days*86400` and `this.collection.params.start = 0`.
  3. Emit ListView-level `range:change` with `{ field, value, previous, params }`.
  4. Emit `params-changed`.
  5. Call `this.collection.fetch()` if `restEnabled`.
- Seed the initial `${field}__gte` in `onInit()` after `_initCollection` but before any fetch — write directly to `collection.params` so the first fetch honors the default range. No event emitted on this seed.
- Add a new toolbar container `data-container="toolbar-day-range"`, rendered to the **left** of `data-container="toolbar-right"` inside the existing right-aligned flex group at `ListView.js:369–377`.
- Mount the SegmentControl into that container in `onAfterRender()` using the same flag-tracked, child-aware pattern that `toolbarRight` uses (`_dayRangeMounted`).
- Update `_isToolbarEnabled()` to return true when `this.dayRangeFilter` is truthy.
- Add `getRange()` / `setRange(value, { silent })` instance methods. They proxy to `this.dayRangeControl` and re-run the param-translation + fetch flow (skipping fetch when `silent: true`). Return `false` when uninitialized or when value is unknown.

**`src/core/views/table/TableView.js`** — no change. TableView's constructor passes `options` straight to `super()`, so inheriting `dayRangeFilter` is automatic.

**`src/extensions/admin/incidents/RuleSetView.js`** — rewrite the manual wiring (lines ~585–640) to use `dayRangeFilter: { value: '30d' }` plus a single `range:change` listener that updates the eyebrow. `_applyRange` is deleted. Net deletion of ~15 lines.

**`docs/web-mojo/components/ListView.md`** — add a `dayRangeFilter` row to the toolbar options table near `toolbarRight`. Add a small "Day-range filter" subsection under "Common patterns" showing the zero-config case and the side-effect-listener case.

**`CHANGELOG.md`** — entry under unreleased.

### Constraints

- **Reuse the existing filter-apply convention.** Do NOT invent a separate refetch path. Use the same `collection.params.start = 0` + `collection.fetch()` pattern that `applyFilters` already follows.
- **`__gte` is the only supported lookup.** No `__lte`, no `__lt`, no symmetric range. If a future helper needs both bounds (`from / to`), it's a separate request — possibly a new `dayRangeFilter` shape with `lookup: 'between'` or a separate `daterangeFilter` helper. Out of scope here.
- **Caller-defined values are escape hatches.** A value like `'all'` (no `\d+d` match) wires the SegmentControl, fires `range:change`, but does NOT write a `__gte` param — the framework just leaves `collection.params[`${field}__gte`]` unchanged. Caller can listen to the event and handle it manually (e.g. delete the param to remove the filter).
- **Framework imports only.** `import SegmentControl from '@core/views/navigation/SegmentControl.js'` is consistent with existing ListView imports.
- **No public API change to `SegmentControl`.** The helper composes the existing primitive.
- **Side-by-side rendering must not break ListView's existing `toolbarRight`-only callers.** Add a new container; do not move or restructure the existing `toolbar-right` container. Order in the right-aligned group: search → filter dropdown → day-range → toolbarRight.
- **Existing keyboard / a11y of SegmentControl** preserved — the helper just sets `ariaLabel`.
- **Theming** — SegmentControl already renders correctly under both `data-bs-theme="light"` and `data-bs-theme="dark"`. No new CSS.

### Related files

- `src/core/views/list/ListView.js` (constructor, `_isToolbarEnabled`, `buildToolbarTemplate`, `onInit`, `onAfterRender`, new `getRange` / `setRange`)
- `src/core/views/table/TableView.js` (no edit, but verify inheritance)
- `src/core/views/navigation/SegmentControl.js` (no edit, just consumed)
- `src/core/utils/DjangoLookups.js` (no edit, just confirms the `__gte` convention)
- `src/extensions/admin/incidents/RuleSetView.js` (rewrite to use the helper)
- `docs/web-mojo/components/ListView.md` (option table + example)
- `docs/web-mojo/components/SegmentControl.md` (consider adding a "see also" pointer to the new option — optional)
- `test/unit/ListView.test.js` (new test cases)
- `CHANGELOG.md`

### Out of scope

- Symmetric `__gte` + `__lte` filters (full from/to ranges). Separate request if/when needed.
- Picker shapes other than day buckets (`week`, `month`, `year`, custom calendar). Separate request — would likely be a sibling option or a different component entirely.
- Persistence of the selected range across page reloads or browser sessions.
- Multi-field range filters (e.g. ranges over both `created` and `updated`). Single field per helper.
- Auto-pill in the active-filter pill bar. Day-range is its own toolbar slot — adding it to the pill bar would create a UI duplicate (segment + pill showing the same value). If needed, separate request.
- Adding `dayRangeFilter` to any plain `View` outside the ListView/TableView family. Scoped to the toolbar machinery.
- A general `toolbarRight` array form (`toolbarRight: [view1, view2]`). Side-by-side composition is solved here for `dayRangeFilter` specifically; if a third toolbar slot becomes a pattern, it gets its own request.

## Notes

- The user's first attempt at this manually lives at `src/extensions/admin/incidents/RuleSetView.js:585–640`. Read it before implementing — and the post-migration version of that file is the truest test that the helper's API is right.
- Naming: `dayRangeFilter` (not `rangeFilter` or `dateRangeFilter`) makes the day-bucket assumption explicit. If a future helper supports week/month/year buckets, it should be a sibling option (`monthRangeFilter`, etc.) rather than overloading this one.
- The helper does NOT couple to `dataFormatter` or any date library — only `Date.now()` + `Math.floor`.
- Default value `'7d'` matches the user's preference. RuleSetView opts back to `'30d'` explicitly to preserve its existing UX.

## Plan

### Objective

Add an opt-in `dayRangeFilter` option to `ListView` that mounts a `SegmentControl` day-range picker into the toolbar and auto-applies `${field}__gte = nowEpoch - days*86400` to the collection — same pattern as the existing `filterable` machinery. `TableView` inherits unchanged. After landing, `RuleSetView`'s 15-line manual wiring collapses to a single option.

### Steps

1. **`src/core/views/list/ListView.js` constructor (~line 116, near `toolbarRight`)** — Parse `options.dayRangeFilter` into a normalized object `this.dayRangeFilter = { field, value, options, ariaLabel }` or `null`. Boolean `true` → defaults `{ field: 'created', value: '7d', options: [{value:'1d',label:'1d'},{value:'7d',label:'7d'},{value:'30d',label:'30d'},{value:'90d',label:'90d'}], ariaLabel: 'Time range' }`. Object form: shallow merge over the same defaults. Falsy → `null`.

2. **`src/core/views/list/ListView.js` add `import SegmentControl from '@core/views/navigation/SegmentControl.js'`** at the top with other `@core` imports.

3. **`src/core/views/list/ListView.js` `_isToolbarEnabled()` (~line 337)** — Add `|| !!this.dayRangeFilter` to the OR chain so the toolbar shell renders even when `dayRangeFilter` is the only feature.

4. **`src/core/views/list/ListView.js` `buildToolbarTemplate()` (~line 369–377)** — Insert `<div data-container="toolbar-day-range"></div>` immediately before the existing `${rightSlot}`. Order in the right-aligned group: search → filter dropdown → **day-range** → toolbarRight.

5. **`src/core/views/list/ListView.js` `onInit()` (~line 193)** — After `_initCollection(...)`:
   - If `this.dayRangeFilter`: call new private `_seedDayRangeParams()` (writes initial `${field}__gte` to `collection.params` if value matches `/^(\d+)d$/`; no event, no fetch — `onAfterMount` triggers the initial fetch).
   - If `this.dayRangeFilter`: build `this.dayRangeControl = new SegmentControl({ containerId: 'toolbar-day-range', options, value, ariaLabel })`, hook `this.dayRangeControl.on('change', this._onDayRangeChange.bind(this))`, then `this.addChild(this.dayRangeControl)`. Pre-first-render addChild → framework auto-renders the child into the new container per `views.md` rules.

6. **`src/core/views/list/ListView.js` new `_seedDayRangeParams()`** — Private. Reads `this.dayRangeFilter.field` and `this.dayRangeFilter.value`. Match against `/^(\d+)d$/`; if it matches, write `this.collection.params[`${field}__gte`] = Math.floor(Date.now() / 1000) - days * 86400`. No-op if no collection, no match, or no `dayRangeFilter`.

7. **`src/core/views/list/ListView.js` new `async _onDayRangeChange({ value, previous })`** — Mirrors `applyFilters`:
   - Compute `days` via the regex.
   - If days parsed: write `collection.params[`${field}__gte`] = nowEpoch - days*86400` and `collection.params.start = 0`. Build `params = { [`${field}__gte`]: epoch }`.
   - If days didn't parse (escape hatch like `'all'`): leave collection.params alone, `params = {}`.
   - Emit `range:change` with `{ field, value, previous, params }`.
   - Emit `params-changed`.
   - If `collection.restEnabled`, `await collection.fetch()` then `await this.render()`. Otherwise `await this.render()`.

8. **`src/core/views/list/ListView.js` new `getRange()` and `setRange(value, { silent } = {})`** — `getRange()` returns `this.dayRangeControl?.getValue() ?? null`. `setRange(value, { silent })`: if no control, return false; call `this.dayRangeControl.setValue(value, { silent: true })` (always silent to suppress double-emit); if false, return false; if `silent !== true`, run `this._onDayRangeChange({ value, previous })`; return true.

9. **`src/extensions/admin/incidents/RuleSetView.js` (~lines 585–640)** — Delete `this.range = new SegmentControl(...)`, `_applyRange(value)`, and `toolbarRight: this.range`. Replace with `dayRangeFilter: { value: '30d' }` on TableView options + one `tableView.on('range:change', ({ value }) => { this.rangeValue = value; this._updateEyebrow(); })` listener. Drop `this.rangeValue = options.range || '30d'` initialization.

10. **`test/unit/ListView.test.js`** — New `describe('ListView (dayRangeFilter)')` block. Cases per the request file's Tests section, plus: combined `dayRangeFilter: true` + `toolbarRight: someView` ordering, escape-hatch value (`'all'`) skipping the param write.

11. **`docs/web-mojo/components/ListView.md`** — Add `dayRangeFilter` row to toolbar options table near `toolbarRight`. Add "Day-range filter" subsection with zero-config + side-effect-listener snippets.

12. **`CHANGELOG.md`** — Unreleased entry: `### Added — ListView/TableView \`dayRangeFilter\` toolbar helper that mounts a SegmentControl day-range picker and auto-applies \`${field}__gte\` to the collection.`

### Design Decisions

- **Mount via `onInit` + `addChild`, not the legacy `onAfterRender` pattern that `toolbarRight` uses.** `views.md` rules: children added before first render are auto-mounted. New code follows the rule; refactoring `toolbarRight` is out of scope.
- **Reuse `applyFilters`'s structure for `_onDayRangeChange`** — same `start = 0`, same `await collection.fetch() → await this.render()` ordering, same `params-changed` emit. Locks the contract that a day-range click behaves identically to a filter pill change.
- **`__gte` is hardcoded** per the codebase's Django-lookup convention.
- **Side-by-side composition** via two adjacent containers (`toolbar-day-range` then `toolbar-right`).
- **Escape hatch via non-`\d+d` values** — values like `'all'` wire the segment but skip param writes. Caller handles via `range:change`.
- **`setRange(value, { silent })` always silences the underlying SegmentControl** to prevent double-emit. ListView-level emit is the public event.
- **Initial seed does NOT emit `range:change`** — matches `defaultQuery` filter seeding.

### Edge Cases

- No collection at constructor time: `_seedDayRangeParams` no-ops if `!this.collection`.
- Caller passes both `defaultQuery: { created__gte: <X> }` and `dayRangeFilter: true`: dayRangeFilter wins (seeded after `setCollection` applies defaultQuery).
- Caller swaps collection via `setCollection(newColl)`: new collection won't have the seed. v1 limitation — caller calls `listView.setRange(currentValue)` to reapply.
- `value` not in `options`: SegmentControl's existing fallback (`options[0].value`) applies.
- Re-render after fetch: SegmentControl re-renders into new container; `this.value` preserved.
- `dayRangeControl` accessed before `onInit`: returns `null` / `false` safely.

### Testing

- `npm run test:unit` (covers `test/unit/ListView.test.js`).
- Manual smoke: `npm run dev`, navigate to RuleSet → Incidents, confirm SegmentControl renders, range clicks refetch, eyebrow label updates. Verify both light and dark themes.

### Docs Impact

- `docs/web-mojo/components/ListView.md` — new option row + subsection.
- `docs/web-mojo/components/TableView.md` — no edit needed.
- `CHANGELOG.md` — unreleased entry.

## Resolution

**Status**: Resolved — 2026-05-10

### Commits

- `9b05436` — Core helper. Adds `dayRangeFilter` option to ListView, the `range:change` event, `getRange` / `setRange` API, `dayRangeControl` child, and the new `data-container="toolbar-day-range"` slot. Migrates `RuleSetView` to use the helper. Updates `ListView.md` + `CHANGELOG.md`. Extends `simple-module-loader` to load `SegmentControl`. New `describe('ListView (dayRangeFilter)')` block in `test/unit/ListView.test.js` covering 13 cases.
- `9c1b467` — Demo + framework fix surfaced by demo. Adds `TableViewDayRangeFilterExample` (route `components/table-view/day-range-filter`) to the example portal. Two small framework fixes: `_buildTitleBlockTemplate` now emits Mustache `{{title}}` / `{{eyebrow}}` vars (so setters survive any subsequent render); `_onDayRangeChange` no longer trails an extra `await this.render()` after fetch (fetch:end's render already covers it). Drive-by: registered orphaned `components/detail-view` route in TOPIC_TAXONOMY.

### Files changed

- `src/core/views/list/ListView.js` (helper + Mustache title/eyebrow + render flow)
- `src/extensions/admin/incidents/RuleSetView.js` (migrated from manual SegmentControl)
- `test/unit/ListView.test.js` (new dayRangeFilter describe block)
- `test/utils/simple-module-loader.js` (loads `SegmentControl`)
- `docs/web-mojo/components/ListView.md` (option row + Day-range filter subsection)
- `docs/web-mojo/components/TableView.md` (inherited option + event rows — docs-updater agent)
- `docs/web-mojo/components/SegmentControl.md` (cross-link tip — docs-updater agent)
- `examples/portal/examples/components/TableView/TableViewDayRangeFilterExample.js` (new demo)
- `examples/portal/examples/components/TableView/example.json` (registered new route)
- `examples/portal/scripts/build-registry.js` (taxonomy entries: day-range-filter + drive-by detail-view orphan)
- `examples/portal/examples.registry.json` (auto-generated)
- `docs/web-mojo/examples.md` (auto-generated)
- `CHANGELOG.md` (unreleased entry)

### Tests run

- `npm run test:unit` — **921 / 921 pass.** New `describe('ListView (dayRangeFilter)')` block covers 13 cases (boolean form, object form, mount-time seed, custom field, refetch + start=0 on change, range:change payload, no-emit-on-seed, getRange / setRange / silent: true, unknown-value rejection, side-by-side ordering, _isToolbarEnabled truthiness, escape-hatch for non-`\d+d` values).
- `npm run lint` — no new errors in changed files (16 errors in lint output are all pre-existing, none in `ListView.js` / `RuleSetView.js` / `SegmentControl.js`).

### Agent findings

- **test-runner**: 921/921 unit tests pass. Integration / build suite failures are all pre-existing infrastructure issues (missing `@core` alias resolver for raw Node, missing `dist/` artifacts, missing `src/mojo.js` entry, non-conforming test-file shapes). None caused by this change.
- **docs-updater**: Edited `TableView.md` (added inherited `dayRangeFilter` row + `range:change` event row to the inheritance tables) and `SegmentControl.md` (added a tip pointing readers using the manual pattern at the new helper). Decided against `README.md` and `AGENT.md` (right level of abstraction, no inheritance cheat-sheet).
- **security-review**: No security concerns. `field` is caller-controlled (same trust level as `endpoint` / `defaultQuery`); large-day overflow stays within JS safe-integer range and the worst case is a wider-than-intended result set; `range:change` payload contains only computed integers; no XSS in the new toolbar slot; no authorization bypass.

### Validation

Verified end-to-end in the live preview (`npm run dev`):
- Toolbar SegmentControl renders with `7d` active in primary blue under both light and dark themes.
- Initial mount writes `created__gte = nowEpoch - 7*86400` — verified via in-memory fake-server Collection in the demo (`paramAge: 604800` exactly).
- Each segment click updates the param, refetches, resets `start = 0`, and the eyebrow updates live ("2 events in the last 7 days" → "8 events in the last 30 days" → "23 events in the last 90 days" → "1 event in the last 1 day").
- `hideActivePillNames: ['created__gte']` correctly suppresses the duplicate filter pill.
- `getRange()` / `setRange()` / silent / unknown-value / escape-hatch paths verified via unit tests.

### Visible outside the framework

- New example: `components/table-view/day-range-filter` in the portal.
- ListView: new `dayRangeFilter` option, `range:change` event, `getRange` / `setRange` methods, `dayRangeControl` child instance.
- TableView: inherits all of the above unchanged.
- Subtle: `_buildTitleBlockTemplate` now uses Mustache vars — any code that previously relied on the construction-time bake will see the same initial render but `setTitle` / `setEyebrow` updates are now durable across re-renders.
