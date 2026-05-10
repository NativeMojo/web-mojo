---
status: done
type: request
scope: src/core/views/list · src/core/css
created: 2026-05-09
resolved: 2026-05-09
related: detailview-audit-round-2.md (R2 — UserView Logins timeline day-grouping); listview-grouping-helpers.md (deferred follow-on helpers)
---

# ListView · grouped rows (synthetic group headers between items)

Add an opt-in grouping primitive to `ListView` so consumers can render header rows between consecutive items where a derived group key changes — "Today / Yesterday / May 5" separators on chronological feeds, "Active / Resolved" separators on incident lists, "A / B / C" letter dividers on alphabetical lists, etc.

This is the framework primitive deferred out of [`detailview-audit-round-2.md`](detailview-audit-round-2.md) R2. Once it lands, UserView's Logins ListView gets day grouping for free, and the same primitive applies to the Audit feeds, GroupView's audit timeline, IncidentView's events list, and any other chronological surface.

## Why the existing tools don't fit

- **`ListView` itself** renders one `itemTemplate` per model with nothing in between (`ListView._buildItems` at `src/core/views/list/ListView.js:813` walks `collection.forEach` and creates one `ListViewItem` per model). There is no API for inserting a synthetic header row between items.
- **`Timeline`** (`src/core/views/data/Timeline.js`) takes a flat `items` array and has no group-row concept either. Even if extended, switching to it costs the search/filter/pagination/`clickAction:'view'` features that made `ListView` the right base for these chronological feeds in round-1.
- **Hand-rolled** alternatives (custom view that stitches HTML directly from a collection) re-implement pagination, search, filter, and click-routing — every one a drift hazard.

The right shape is a small, opt-in addition to `ListView` that every chronological / categorical feed can use.

## Proposed API

Two new options on `ListView`:

```js
new ListView({
    collection: loginEventsCollection,
    itemTemplate: '...',

    // Group key resolver — runs once per item, in render order.
    // Header inserted before the first item of each new key.
    // Falsy return value = no group header for that item (treated as
    // "ungrouped tail" — the prior group's section continues).
    groupBy: (model) => formatDayBucket(model.get('created')),

    // Header template — rendered into the row slot between items.
    // Receives the resolver's return value as `{{key}}` and the
    // model that triggered the group as `{{model.*}}`. Defaults
    // to a single-line eyebrow row using `{{key}}` as the label.
    groupHeaderTemplate: `<div class="list-group-header">{{key}}</div>`
});
```

Equivalent shorthand for the simple case:

```js
groupBy: 'level',                     // model.get('level') as the key
groupHeaderLabel: (key) => key.toUpperCase()  // optional formatter
```

Both forms get the default `groupHeaderTemplate` for free.

## Design Decisions to Resolve

These are the non-obvious choices that need a call before build:

1. **Pagination interaction.** When `paginated: true` + `pageSize: 5`, does a page hold 5 items + however many headers, or 5 visual rows total (items + headers)? Recommend **items only** — headers are decorative, the user thinks "5 logins per page," not "5 rows." Document the rule.

2. **Search / filter interaction.** When the toolbar filter narrows the collection, headers re-segment automatically (resolver runs against the filtered set). No special handling needed if `groupBy` is a pure function of the model — which the API contract should require.

3. **Empty groups.** A group with zero items after filtering doesn't render a header. Falls out naturally from the "header before first item of group" rule.

4. **Click routing.** Headers must NOT participate in `clickAction: 'view'` / `onItemClick`. Treat them as non-interactive DOM. The `data-action` on the header row (if any) is the consumer's responsibility — `groupHeaderTemplate` is trusted HTML.

5. **Sort interaction.** Grouping is applied **after** sort. If the resolver returns "Today / Yesterday / May 5" but the sort is ascending date, the timeline reads bottom-up — fine, that's the consumer's call. The framework doesn't try to enforce a sort order to match grouping.

6. **Sticky vs inline.** Inline only for v1 (header scrolls with the rows). Sticky headers that pin to the top of the viewport while scrolling within their group are a polish layer — file separately if asked.

7. **TableView inheritance.** `TableView` extends `ListView`. Does grouping flow through to TableView's `<tr>` rows for free? Yes — but the default `groupHeaderTemplate` needs a `<tr><td colspan="N">…</td></tr>` shape so it sits in the table grid. Provide both the visual-list default (`<div>`) and a TableView-aware override.

8. **Dynamic group-key changes.** When a model's group key changes mid-session (e.g. an event ages from "Today" into "Yesterday"), the next render re-segments. No special handling beyond the existing `model:change` re-render path.

## Acceptance Criteria

- A consumer can opt in via `groupBy` + `groupHeaderTemplate` (or shorthand) and get header rows between groups, with no behavior change for any existing ListView consumer that doesn't pass these options.
- Headers render in the items container alongside `ListViewItem` instances; pagination counts items only.
- Filtering / searching re-segments groups automatically.
- Headers don't fire `item:click`, `row:click`, or `clickAction: 'view'`.
- Default header template: `<div class="list-group-header">{{key}}</div>` with both light + dark theming defined in `core.css` (uppercase eyebrow look, matches the existing `.detail-section-eyebrow` typographic register but at row-density).
- TableView gets a TableView-shaped default (`<tr class="list-group-header-row"><th colspan="N">{{key}}</th></tr>`).
- Documentation updated: `docs/web-mojo/components/ListView.md` (new "Grouped rows" section), `docs/web-mojo/components/TableView.md` (note about default).
- Regression tests in `test/unit/` cover: simple grouping, mixed sort order, empty groups, pagination math, filter re-segmentation, click-routing exclusion.

## Investigation

- **What exists:** `ListView._buildItems` (line 813) and `_createItemView` (line 835) build one `ListViewItem` per model. `_renderChildren` (line 797) appends each item's `element` into the container. Pagination math lives in `_paginationState` / `_buildPaginationToolbar`. No grouping primitive anywhere.
- **What changes:**
  - `ListView` constructor — accept `groupBy`, `groupHeaderTemplate`, `groupHeaderLabel`.
  - `ListView._buildItems` — store a parallel `this.groupHeaders` array of `{ afterItemId: null, key, beforeIndex }` markers, OR insert lightweight `ListGroupHeaderView` instances into the same items container alongside items.
  - `ListView._renderChildren` — interleave header DOM nodes between item elements based on the markers.
  - `ListView._paginationState` — exclude headers from page-size math; document the rule.
  - `ListView._dispatchRowClick` — filter out events originating from header rows.
  - New `ListGroupHeaderView` (one-liner View subclass with a Mustache template) OR raw `<div>` interleaved into the container directly. Prefer the View subclass for symmetry with `ListViewItem` and to let consumers pass a custom `groupHeaderClass` for more complex headers.
  - CSS: add `.list-group-header` (and `.list-group-header-row` for TableView) to `core.css`, with light + dark blocks.
- **Constraints:**
  - Internal framework code uses `@core` imports.
  - The view instance is the Mustache context — `groupHeaderTemplate` reads `{{key}}` and `{{model.*}}` for the trigger model.
  - No fetching in `onAfterRender` / `onAfterMount`.
  - `data-action="kebab-case"` if headers ever need actions; framework escapes auto.
  - Must work under both `[data-bs-theme="light"]` and `[data-bs-theme="dark"]` from day one (`.claude/rules/theming.md`).
- **Related files:**
  - `src/core/views/list/ListView.js`
  - `src/core/views/list/ListViewItem.js`
  - `src/core/views/table/TableView.js`
  - `src/core/views/table/TableRow.js`
  - `src/core/css/core.css` (add `.list-group-header` / `.list-group-header-row` blocks near the existing list / table styles)
  - `docs/web-mojo/components/ListView.md`
  - `docs/web-mojo/components/TableView.md`
- **Endpoints:** none — purely client-side.
- **Tests required:** new unit tests in `test/unit/ListView.test.js` (or a new `ListView.grouping.test.js` if cleaner) covering the acceptance-criteria bullets. Use the custom test runner per `.claude/rules/testing.md`.
- **Out of scope:**
  - Sticky group headers that pin to the viewport while scrolling — file as a separate enhancement if desired.
  - Multi-level grouping (`groupBy` returning a path of keys for nested headers).
  - Group-level batch actions ("Delete all in this group").
  - Server-side grouping primitives (current proposal is purely render-side; the collection delivers a flat ordered list).
  - Collapsible group headers — consumers can implement on top of `groupHeaderTemplate` if they want, but the framework default is non-collapsible.

## First Consumer

Once this lands, [`detailview-audit-round-2.md`](detailview-audit-round-2.md) R2 reopens with a one-liner `groupBy` addition to UserView's Logins ListView (`src/extensions/admin/account/users/UserView.js:1189`) — the CSS-only timeline rail from R2 stays as-is, day headers slot in via the new primitive. The audit feeds in the same view (`UserView.js:797`, `824`, `851`) similarly become candidates for "Today / Yesterday / earlier" grouping if visually warranted.

The hand-rolled `_groupByDate` in `src/extensions/admin/assistant/AssistantConversationListView.js:166` is the second-consumer migration candidate — once `groupByDay` ships, that ~80 lines of imperative DOM stitching collapses to a one-line spread on a real `ListView`. File separately when ready.

## Plan

### Objective

Add an opt-in grouping primitive to `ListView` (inherited by `TableView`) that inserts synthetic header rows between consecutive items whenever a derived group key changes. Existing consumers see no behavior change. Ship one built-in helper (`groupByDay`) for the dominant chronological-feed case; everything else stays consumer-defined via `groupBy` / `groupHeaderTemplate` / `groupHeaderLabel`. After this lands, UserView's Logins ListView (and any other chronological/categorical feed) gets day grouping with a one-line `...groupByDay('created')` addition.

### Steps

1. **New file: `src/core/views/list/ListGroupHeaderView.js`** — small `View` subclass (NOT extending `ListViewItem`, so it does not inherit `_wireClickableHandler` / `onActionDefault` and structurally cannot fire `item:click` / `row:click`). Properties: `key` (resolved + label-formatted display key), `model` (trigger model — the first model of the group, exposed for `{{model.*}}` in the template), `colspan` (set by TableView). Default `tagName: 'div'`, `className: 'list-group-header'`. Renders through the standard `View` Mustache flow so `{{key}}` and `{{model.field}}` resolve. No event bindings.

2. **`src/core/views/list/ListView.js` — constructor (after the toolbar/pagination block, ~line 162):**
   - Accept `options.groupBy` (function `(model) => key` OR a string treated as `model.get(string)`).
   - Accept `options.groupHeaderTemplate` (Mustache string; default from `_defaultGroupHeaderTemplate()`).
   - Accept `options.groupHeaderLabel` (optional `(rawKey) => displayKey` formatter applied before the template runs).
   - Accept `options.groupHeaderClass` (escape hatch, mirrors `itemClass`; defaults to `ListGroupHeaderView`).
   - Initialize `this.groupHeaderViews = new Map()` (key: synthetic `gh-<index>-<key>` id → headerView) and `this._renderOrder = []` (ordered array of `{ type: 'item' | 'header', view }`).

3. **`ListView._buildItems` (line 813) — extend without breaking the non-grouped path:**
   - After the existing `collection.forEach((model, index) => _createItemView(model, index))` loop, call a new `_buildGroupHeaders()` that walks `collection.models` in render order, runs the resolver, and:
     - When the resolved key !== previous key (and the resolver returns a truthy value), creates a header via `_createGroupHeaderView(model, key, index)` and pushes `{ type: 'header', view }` then `{ type: 'item', view: itemViews.get(model.id) }` into `_renderOrder`.
     - Falsy resolver return = "ungrouped tail"; do NOT emit a header (continues prior group's section visually). Item still pushed.
   - Plain ListView (no `groupBy`) skips the grouping pass entirely; `_renderChildren` falls through to its current `forEachItem` walk.

4. **`ListView._createGroupHeaderView(model, key, index)` — new helper:**
   - `displayKey = this.groupHeaderLabel ? this.groupHeaderLabel(key) : key`.
   - `new this.groupHeaderClass({ template: this.groupHeaderTemplate || this._defaultGroupHeaderTemplate(), model, key: displayKey, index })`.
   - Store under a synthetic id in `this.groupHeaderViews`. Returns the view.

5. **`ListView._defaultGroupHeaderTemplate()` — virtual hook returning `'{{key}}'`** (TableView overrides to inject `<th colspan="...">`).

6. **`ListView._renderChildren` (line 797) — generalize to iterate `_renderOrder`:**
   - When `_renderOrder.length > 0`, append each entry's `view.element` into the items container in interleaved order. Render each view (item or header) via `await Promise.resolve(view.render(false))` (same shape as the current code).
   - Otherwise (no grouping configured, fresh build), keep the existing `forEachItem` path verbatim. Net effect: zero change for non-grouped consumers.

7. **`ListView._clearItems` (line 948) — also tear down headers:**
   - Iterate `groupHeaderViews` and `removeChild(headerView.id)` for each, then `groupHeaderViews.clear()` and `_renderOrder.length = 0`.

8. **`ListView._onModelsAdded` (line 958) — rebuild grouping after Show More appends:**
   - After the existing `_createItemView` loop, when `groupBy` is set, call `_rebuildGroupHeaders()` that clears `groupHeaderViews` + `_renderOrder` and re-runs the grouping pass against the now-larger `collection.models`. Required for `paginationMode: 'more'` so the appended page's first item gets (or doesn't get) a header against the prior tail correctly.

9. **`ListView._dispatchRowClick` — verify, no edit needed:**
   - Headers are not registered in `itemViews` and `_wireItemViewListeners` is never called for them, so they cannot emit `item:click` with `action: 'row-click'` or `row:click`. The "headers don't fire row-click" acceptance criterion is structural.

10. **`src/core/views/table/TableView.js` — override grouping defaults:**
    - Override `_defaultGroupHeaderTemplate()` to return `<th colspan="{{colspan}}" class="list-group-header-cell">{{key}}</th>`.
    - Override `_createGroupHeaderView(model, key, index)` to pass `tagName: 'tr'`, `className: 'list-group-header-row'`, and `colspan = Math.max(1, this.columns.length + (this.isSelectable() ? 1 : 0) + ((this.actions || this.contextMenu) ? 1 : 0))` to the helper. Adjust `_createGroupHeaderView` (step 4) to accept and forward those constructor options.

11. **`src/core/css/list-view.css` — append at the bottom of the file (token-based, dark theme automatic):**
    - `.list-group-header` block: flex row, `0.5rem 0.25rem 0.25rem` padding, `0.7rem` font-size, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.06em`, `color: var(--bs-secondary-color)`, `border-top: 1px solid var(--bs-border-color-translucent)`.
    - `:first-child` reset (no top border / padding-top).
    - Parallel `.list-group-header-row` / `.list-group-header-cell` block for TableView's `<tr>` / `<th>` pair using the same eyebrow typography.
    - No `[data-bs-theme="dark"]` overrides needed — every property uses Bootstrap tokens.

12. **New file: `src/core/views/list/grouping.js`** — built-in helpers module. v1 exports `groupByDay(fieldOrAccessor)`:
    - Accepts a string field name (resolves via `model.get(field)`) or an accessor function `(model) => raw`.
    - Returns `{ groupBy, groupHeaderLabel }` ready to spread into the ListView constructor.
    - `groupBy` resolves the raw value, runs it through `dataFormatter.normalizeEpoch()` (matches the existing AssistantConversationListView convention), and produces a stable local-midnight ISO date string (`'2026-05-09'`) as the bucket key. Stable keys mean equality is deterministic regardless of input format (epoch / ISO / Date).
    - `groupHeaderLabel` formats the ISO bucket key into `'Today'` / `'Yesterday'` / `'May 5'` (current year) / `'May 5, 2025'` (prior years).
    - Documented as v1 of a growing helpers set; further helpers tracked in `listview-grouping-helpers.md`.

13. **`docs/web-mojo/components/ListView.md` — new "Grouped rows" section** between "Pagination & Show More" and "Installation". Document:
    - Three-layer label pipeline (`groupBy` → `groupHeaderLabel` → `groupHeaderTemplate`).
    - Constructor-options table additions: `groupBy`, `groupHeaderTemplate`, `groupHeaderLabel`, `groupHeaderClass`.
    - "Built-in helpers" subsection covering `groupByDay` with a copy-paste example.
    - Pagination math: counts items only — page-size 5 still means 5 items per page, regardless of header count.
    - Resolver runs against the filtered set automatically; falsy return = no header emitted.
    - Naming caveat: `Sidebar` / `SidebarTopNav` already use a `groupHeader` option for a different concept (single static header at the top of the sidebar); ListView's grouping API is separate.
    - Not collapsible, not sticky (out of scope; pointer to the deferred follow-on if/when filed).

14. **`docs/web-mojo/components/TableView.md` — short note** that the same grouping options work and the default header template emits a full-width `<th colspan="N">` row.

15. **`CHANGELOG.md` — one-line entry** under the next unreleased section: "Add `groupBy` / `groupHeaderTemplate` to ListView (inherited by TableView) for synthetic group-header rows, plus a `groupByDay` built-in helper."

16. **Tests in `test/unit/ListView.test.js` — append a `describe('ListView (grouped)')` block** covering:
    - Renders header rows between groups when `groupBy` is a function.
    - Renders header rows when `groupBy` is a string field name.
    - `groupHeaderLabel` formatter applied to `{{key}}`.
    - Empty groups (filter eliminates all items of one key) emit zero headers.
    - Header view is NOT wired to `item:click` / `row:click` / `clickAction: 'view'`.
    - `paginationMode: 'pages'` + `pageSize: 5` keeps the page-size selector at 5 (server-side count is items-only; no math change).
    - `_onCollectionReset` after a filter narrows the collection re-segments groups (call `collection.reset(filteredArray)` and assert new header count).
    - TableView default produces `<tr class="list-group-header-row"><th colspan="N">…</th></tr>` (small block at the bottom of the same file; TableView is not currently broadly unit-tested).
    - **`groupByDay` helper:** Today bucket, Yesterday bucket, current-year date, prior-year date, accepts string-field and accessor-function input, accepts epoch / ISO / `Date` raw values.

### Design Decisions

- **One file added (`ListGroupHeaderView.js`), one helpers file added (`grouping.js`), three files edited (`ListView.js`, `TableView.js`, `list-view.css`).** Mirrors the `ListViewItem` ↔ `TableRow` symmetry — request file specifically called out the View-subclass option as preferred.
- **Header view does NOT extend `ListViewItem`.** Extends `View` only, deliberately. `ListViewItem.onAfterRender` wires `_wireClickableHandler` and `onActionDefault` re-emits `item:click` for any nested `data-action`. Inheriting either would let header clicks accidentally route through the row-click flow. By extending `View`, the "headers don't participate in click routing" criterion is structural, not a check at dispatch time.
- **`_renderOrder` is the single ordering source of truth when grouping is on.** Avoids interleaving a parallel marker array against a separately-iterated `itemViews` Map. Plain ListView keeps the lighter `forEachItem` path.
- **TableView grouping uses subclass-provided default template + outer element.** Consumer who passes `groupHeaderTemplate` for TableView writes `<th colspan="N">…</th>` (cell-only inner content for the framework-provided `<tr>`), parallel to how `TableRow` consumes inner `<td>` markup. Symmetric to the existing inheritance.
- **Pagination counts items only.** No code change: `paginationMode: 'pages'` reads `collection.meta.count` and `collection.params.size` (server-side, header-unaware); `paginationMode: 'more'` reads `collection.length()` and `collection.meta.count`. Document the rule; don't introduce client-side math.
- **`groupBy` contract: pure function of the model.** Documented. Filter/search re-segmentation is automatic because `_onCollectionReset` → `_buildItems` rebuilds against the new model order. No filter/search machinery changes.
- **Sort vs grouping order: framework does not enforce alignment.** If sort runs ascending date but the resolver returns "Today / Yesterday / May 5" labels, the timeline reads in the sorted order — consumer's call. Documented.
- **`groupByDay` produces a stable ISO-date bucket key, not a display label.** Equality is deterministic; the display layer is decoupled. Same pattern future date-bucket helpers (`groupByMonth`, `groupByYear`) will follow.
- **One helper for v1 — `groupByDay`.** It retires real existing duplication (the AssistantConversationListView code) and serves the immediate first consumer (UserView Logins). Other helpers (`groupByField`, `groupByMonth`, `groupByLetter`, etc.) tracked in `listview-grouping-helpers.md` and only land when a real consumer asks. Per `.claude/rules/core.md` KISS rule.
- **Sticky / collapsible / multi-level / batch-actions / server-side grouping all out of scope.** No code paths.

### Edge Cases

- **Falsy resolver return on a model.** Treat as "ungrouped tail" — push the item without emitting a header; previous group continues visually. Documented in JSDoc on `groupBy`.
- **First item in the collection.** Always emits a header (resolver runs, prior key is `undefined`, current key !== `undefined` → emit). Avoids "first group has no header, others do".
- **Empty collection.** `_buildItems` early-returns at line 816 (`isEmpty`) before the grouping pass. `_renderOrder` stays empty, no DOM work. `list:empty` fires as before.
- **Collection reset with `groupBy` unchanged.** `_clearItems` tears down both items and headers (step 7), `_buildItems` rebuilds — clean, no leaked DOM.
- **Show More appends a new page whose first model has the same group key as the prior tail.** No header at the seam — `_rebuildGroupHeaders` (step 8) walks the full combined list and only emits when key changes.
- **Show More appends a page that introduces a new group mid-flight.** `_rebuildGroupHeaders` re-segments — header inserted before the first item of the new group.
- **`collection.fetch()` mid-render.** `_onFetchStart` triggers the loading template (no items container exists) → no grouping work runs. `_onFetchEnd` triggers `_onCollectionReset` rebuild. No new race.
- **Selection persistence + headers.** `_applyPersistedSelections` walks `itemViews` only, never headers. Unchanged.
- **TableView with zero columns (degenerate).** `colspan` clamps to `Math.max(1, …)`.
- **Models without an `id`.** Header view's synthetic id is `gh-<index>-<key>` (not model-id-based), so `id == null` doesn't break header tracking.
- **Mustache render error in `groupHeaderTemplate`.** Same failure mode as a broken `itemTemplate` — view renders empty content. No special handling.
- **`groupByDay` on a model with no date field set.** Helper returns `null` (falsy), so no header is emitted for that item. Consumer gets the "ungrouped tail" behavior.
- **`groupByDay` across DST or year boundaries.** Bucket key is local-midnight ISO date — DST shifts midnight by one hour but the date string is unaffected. Year boundaries naturally produce a new key. Test covers prior-year display formatting.

### Testing

```bash
npm run test:unit
```

Single-file shortcut: temporarily move other `test/unit/*.test.js` aside (per `.claude/rules/testing.md`) to run only `ListView.test.js`. The custom test runner has no `--grep`.

Manual smoke test in the example portal: drop a temporary `...groupByDay('created')` (or `groupBy: (m) => m.get('status')`) on the ListView in `examples/portal/examples/components/ListView/ListViewExample.js`, run `npm run dev`, and verify (a) headers appear between groups, (b) toggling theme to dark shows the same `--bs-secondary-color` muted eyebrow, (c) no console errors. Repeat for the TableView example page to confirm the `<tr>`/`<th colspan>` shape renders correctly.

### Docs Impact

- `docs/web-mojo/components/ListView.md` — new "Grouped rows" section (constructor options + label pipeline + `groupByDay` helper + naming caveat re Sidebar's `groupHeader`).
- `docs/web-mojo/components/TableView.md` — short cross-reference section.
- `CHANGELOG.md` — one-line entry.
- No update to `docs/web-mojo/README.md` (ListView already indexed).

### Out of scope

- Sticky headers that pin to the viewport while scrolling.
- Multi-level grouping (`groupBy` returning a path of keys).
- Group-level batch actions ("Delete all in this group").
- Server-side grouping primitives.
- Collapsible group headers — consumers can build on top of `groupHeaderTemplate`.
- Updating UserView's Logins ListView to use the new primitive — that's the first consumer, addressed by reopening [`detailview-audit-round-2.md`](detailview-audit-round-2.md) R2 once this lands.
- Migrating `AssistantConversationListView._groupByDate` to `groupByDay` — second-consumer migration, file separately.
- Additional helpers (`groupByField`, `groupByMonth`, `groupByYear`, `groupByLetter`, `groupByRange`, `groupByBoolean`) — tracked in `listview-grouping-helpers.md`.

## Resolution

**Implemented:** opt-in `groupBy` primitive on `ListView` (inherited by `TableView`) with three-layer label pipeline (`groupBy` → `groupHeaderLabel` → `groupHeaderTemplate`), TableView-aware `<tr><th colspan="N">` defaults, and a `groupByDay` built-in helper for chronological feeds. Plus a dedicated portal example and a deferred follow-on request file for additional helpers.

### Files changed

**New:**
- `src/core/views/list/ListGroupHeaderView.js` — extends `View` directly (not `ListViewItem`) so headers structurally cannot fire `item:click` / `row:click`.
- `src/core/views/list/grouping.js` — exports `groupByDay(fieldOrAccessor)` returning `{ groupBy, groupHeaderLabel }`. Default export is the helper bag for test-loader compatibility.
- `examples/portal/examples/components/ListView/ListViewGroupedExample.js` — runnable demo of both shapes.
- `planning/requests/listview-grouping-helpers.md` — deferred follow-on for `groupByField` / `groupByMonth` / `groupByYear` / `groupByLetter` / `groupByRange` / `groupByBoolean`.

**Modified:**
- `src/core/views/list/ListView.js` — `groupBy` / `groupHeaderTemplate` / `groupHeaderLabel` / `groupHeaderClass` constructor opts; `_buildGroupHeaders`, `_rebuildGroupHeaders`, `_createGroupHeaderView`, `_groupHeaderViewOptions`, `_defaultGroupHeaderTemplate`. Hooks into `_buildItems`, `_renderChildren` (interleave), `_clearItems` (teardown), `_onModelsAdded` (Show More rebuild).
- `src/core/views/table/TableView.js` — overrides `_defaultGroupHeaderTemplate` to emit `<th colspan="{{colspan}}">` and `_groupHeaderViewOptions` to set `tagName: 'tr'` + `colspan = data + selection + actions cols (clamped >=1)`.
- `src/core/css/list-view.css` — `.list-group-header` (visual list) + `.list-group-header-row` / `.list-group-header-cell` (table). Token-based, dark theme automatic. `pointer-events: none` on the default header.
- `src/index.js` — exports `ListGroupHeaderView` and `groupByDay`.
- `docs/web-mojo/components/ListView.md` — new "Grouped rows" section + TOC + Key Features bullet.
- `docs/web-mojo/components/TableView.md` — cross-reference section + TableView shape note.
- `CHANGELOG.md` — Unreleased entry.
- `examples/portal/examples/components/ListView/example.json` + `examples/portal/scripts/build-registry.js` + `docs/web-mojo/examples.md` + `examples/portal/examples.registry.json` — registered the new grouped example.
- `test/unit/ListView.test.js` — three new describe blocks: `ListView (grouped)` (8 tests), `groupByDay helper` (8 tests), `TableView (grouped)` (1 test).
- `test/utils/simple-module-loader.js` — registered `ListGroupHeaderView` and `grouping` modules.

### Tests run

- **`npm run test:unit`** — 900/900 passing, including the new grouping tests.
- **`npm run lint`** — clean for all touched files (16 pre-existing errors elsewhere).
- **Manual portal smoke** — both shapes verified in light theme via screenshot, dark theme via `getComputedStyle` on the eyebrow color (resolved to `rgb(138, 150, 166)` against dark page bg). Day labels confirmed: `Today / Yesterday / May 4 / Apr 25` produced by `groupByDay` against seeded offsets (`now`, `-4hr`, `-1d`, `-1d 7hr`, `-5d`, `-14d`).
- **`test-runner` agent (full suite)** — unit 900/900; pre-existing failures in integration / build suites unrelated to these changes (module resolution + missing `dist/` build).

### Agent findings

- **`docs-updater`** — Confirmed accuracy of the new "Grouped rows" section against source. Added two minor touch-ups: a TOC entry under "Advanced Usage" and a "Grouped rows" bullet to the Key Features list. Naming caveat re `Sidebar.groupHeader` confirmed clear. No other docs needed changes.
- **`security-review`** — No vulnerabilities. Two low-severity surprising-behavior findings now documented:
  1. Falsy keys (`0`, `''`) are treated as "ungrouped tail" by the `if (rawKey && …)` guard. JSDoc note added on the `groupBy` constructor option + a paragraph in ListView.md.
  2. `data-action` inside a custom `groupHeaderTemplate` bubbles to the parent ListView's `onAction*` handler (the default template is non-interactive via `pointer-events: none`, but custom templates with buttons / links are not no-ops). JSDoc note added + a paragraph in ListView.md so consumers know to define matching handlers.

### Follow-ups

- **First-consumer migration** — reopen [`detailview-audit-round-2.md`](detailview-audit-round-2.md) R2 to wire `...groupByDay('created')` into UserView's Logins ListView.
- **Second-consumer migration** — file a separate request to migrate `src/extensions/admin/assistant/AssistantConversationListView.js`'s hand-rolled `_groupByDate` (~80 lines of imperative DOM stitching) to a one-line `groupByDay` spread on a real ListView.
- **Additional helpers** — `groupByField` / `groupByMonth` / `groupByYear` / `groupByLetter` (anchored) and `groupByRange` / `groupByBoolean` (speculative) tracked in [`listview-grouping-helpers.md`](listview-grouping-helpers.md). Promote one at a time as real consumers ask, per the file's promotion checklist.
