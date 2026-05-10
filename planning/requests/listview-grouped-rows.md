---
status: planned
type: request
scope: src/core/views/list · src/core/css
created: 2026-05-09
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
