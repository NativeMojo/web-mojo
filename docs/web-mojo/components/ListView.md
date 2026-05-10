# ListView

**Visual list component for rendering and managing collections of items**

ListView manages a collection of ListViewItem views, each backed by its own model. When a model changes, only its corresponding item re-renders — making it efficient for large lists. It supports single and multiple selection, custom item templates, custom item classes, and automatic fetching.

---

## Table of Contents

### Overview
- [What is a ListView?](#what-is-a-listview)
- [Key Features](#key-features)
- [When to Use ListView](#when-to-use-listview)

### Quick Start
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [With Custom Template](#with-custom-template)
- [With Selection](#with-selection)

### Configuration
- [Constructor Options](#constructor-options)
- [Collection Sources](#collection-sources)
- [Item Templates](#item-templates)
- [Custom Item Classes](#custom-item-classes)
- [Selection Modes](#selection-modes)

### API Reference
- [Methods](#methods)
- [Properties](#properties)
- [Events](#events)

### Advanced Usage
- [Grouped rows](#grouped-rows)
- [Dynamic Templates](#dynamic-templates)
- [Custom ListViewItem Subclass](#custom-listviewitem-subclass)
- [Preloaded Data](#preloaded-data)
- [Collection Parameters](#collection-parameters)
- [Fetching Behavior](#fetching-behavior)

### Integration
- [Using with TableView](#using-with-tableview)
- [Using with Pages](#using-with-pages)

### Best Practices
- [Performance Tips](#performance-tips)
- [Memory Management](#memory-management)
- [Common Patterns](#common-patterns)

### Troubleshooting
- [Common Issues](#common-issues)

### Related Documentation
- [Related Documentation](#related-documentation)

---

## What is a ListView?

A **ListView** is a View that renders a collection of models as a list of child views. Each model in the collection gets its own `ListViewItem` view instance, which means:

1. Each item renders independently
2. When a model changes, only that item re-renders
3. Items can be selected, deselected, and iterated
4. The list automatically responds to collection add/remove/reset events

ListView extends [View](../core/View.md) and works directly with [Collection](../core/Collection.md).

---

## Key Features

- **Per-Item Rendering** — Each item is its own View with its own model
- **Automatic Collection Binding** — Responds to add, remove, reset, and fetch events
- **Selection Support** — None, single, or multiple selection modes
- **Custom Templates** — Pass an `itemTemplate` string for each item to render
- **Custom Item Classes** — Use your own `ListViewItem` subclass for full control
- **Loading & Empty States** — Built-in loading spinner and empty message
- **Fetch on Mount** — Automatically fetches collection data when mounted
- **Dynamic Template Updates** — Change item templates at runtime
- **Grouped rows** — Opt-in `groupBy` inserts synthetic header rows between groups; `groupByDay` helper for chronological feeds

---

## When to Use ListView

Use ListView when you need to:

- **Display a list of items** from a Collection
- **Render custom cards, rows, or tiles** for each model
- **Support item selection** (single or multi-select)
- **React to collection changes** (items added, removed, refreshed)
- **Build a base for more complex list-based components** (TableView extends ListView)

For tabular data where rows are columns of fields with sortable headers and footer totals, use [TableView](./TableView.md) instead. ListView and TableView now share the same toolbar machinery — search input, filter dropdown + active pills, refresh, custom toolbar buttons, title/eyebrow, sort dropdown, and pagination footer all live on ListView. TableView extends ListView and adds the `<table>` markup, sortable column headers, footer totals, batch actions, fullscreen, and Add/Export buttons on top.

---

## Toolbar, Search, Filters

ListView's toolbar is opt-in via flags on the constructor:

```js
const list = new ListView({
  collection: new ArticleCollection(),
  itemTemplate: '<div class="card">{{model.title}} — {{model.author}}</div>',

  title: 'Articles',
  eyebrow: 'Browse',

  searchable: true,
  searchPlaceholder: 'Search title, author…',

  filterable: true,
  filters: [
    { name: 'topic', label: 'Topic', type: 'select', options: ['ops', 'patterns', 'general'] },
    { name: 'created', label: 'Created', type: 'daterange',
      startName: 'dr_start', endName: 'dr_end', fieldName: 'dr_field' }
  ],

  sortOptions: [
    { key: 'created', label: 'Newest', dir: 'desc' },
    { key: 'title', label: 'Title (A–Z)', dir: 'asc' }
  ]
});
```

The search input updates `collection.params.search`, filter pills update `collection.params[<filter>]`, and the sort dropdown updates `collection.params.sort` — then the collection refetches (or the list re-renders for non-REST collections). Same semantics as TableView.

`data-action="kebab-case"` on toolbar buttons routes through the standard `onActionKebabCase` handler convention, so wiring `toolbarButtons: [{ action: 'import', label: 'Import' }]` and defining `onActionImport(event, element)` on a ListView subclass works exactly like TableView.

### Day-range filter

`dayRangeFilter: true` mounts a `1d / 7d / 30d / 90d` SegmentControl in the toolbar and **auto-applies** the selected range as a Django `__gte` filter on the collection — same flow as the regular filter pills (writes to `collection.params`, resets `start = 0`, refetches).

```js
new ListView({
  collection,                 // a REST-backed Collection
  itemTemplate: '<div>{{model.title}}</div>',
  dayRangeFilter: true        // → collection.params.created__gte = nowEpoch - 7*86400; fetch.
});
```

Object form for overrides:

```js
new TableView({
  collection,
  dayRangeFilter: {
    field: 'occurred',                                    // default 'created' — becomes the `${field}__gte` param key
    value: '30d',                                         // default '7d'
    options: [{ value: '1d', label: '1d' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' }],
    ariaLabel: 'Time range'                               // default 'Time range'
  }
});
```

Listen for `range:change` if you need a side effect (e.g. updating a count label). The framework already mutates `collection.params` and refetches — your handler is for **extra** work, not the param translation:

```js
listView.on('range:change', ({ field, value, previous, params }) => {
  // field   - the configured field (e.g. 'created')
  // value   - the new range ('1d' / '7d' / '30d' / '90d' / your custom value)
  // previous- the value before this change
  // params  - the delta written to collection.params, e.g. { created__gte: 1715212800 }
  this.eyebrow = `Last ${value}`;
  this.render();
});
```

**API surface.**

- `listView.getRange()` → current value (`'7d'`) or `null` when the helper is disabled.
- `listView.setRange(value, { silent })` — programmatically select a value. Returns `true` on success, `false` if the value isn't a known option. `silent: true` suppresses the `range:change` event and the refetch.
- `listView.dayRangeControl` — direct handle to the underlying `SegmentControl` for callers that need it.

**Custom values are escape hatches.** Values that don't match `/^\d+d$/` (e.g. `'all'`, `'ytd'`) wire the segment but the framework does not write a `__gte` param. The `range:change` event still fires (with `params: {}`), so a caller can listen and clear / customize the filter manually.

**Combined with `toolbarRight`.** Both can coexist. The day-range SegmentControl mounts to the left of the user-supplied `toolbarRight` view in the right-aligned toolbar group.

**Initial seed.** When `dayRangeFilter` is set, ListView seeds `collection.params[`${field}__gte`]` **before** the first fetch (no `range:change` event — matches the `defaultQuery` seeding pattern). This means the initial request honors the default range without any extra wiring.

---

## Pagination & Show More

Two modes — pick the right one for the list shape.

### `paginationMode: 'more'` (default for ListView)

Renders a single "Show more" button below the list. Clicking it calls `collection.fetchMore()` which advances `start` by one page and **appends** the new rows in place. The button auto-hides when `collection.length() >= collection.meta.count`.

```js
const list = new ListView({
  collection: new FeedCollection(),
  itemTemplate: '<div class="post">{{model.body}}</div>',
  paginated: true,
  paginationMode: 'more',
  pageSize: 20
});
```

This is the conventional UX for visual cards / chronological feeds / activity lists — page numbers would break the skim flow and re-shuffle order on insert.

### `paginationMode: 'pages'` (default for TableView)

Renders the same numbered pagination + page-size selector that TableView uses. Use this when users need to jump to specific pages — typically reference data or hunt-by-page lists.

```js
const list = new ListView({
  collection: new ItemCollection(),
  itemTemplate: '<div>{{model.title}}</div>',
  paginated: true,
  paginationMode: 'pages',
  pageSize: 25
});
```

### Selection across pages

`persistSelection` defaults to `true` in `'more'` mode and `false` in `'pages'` mode. In `'more'` mode the rows aren't torn down on append — selection naturally persists. In `'pages'` mode the rows ARE torn down per page; opt in with `persistSelection: true` to keep selected IDs alive across page navigation (the View re-applies the `selected` class to any item whose model.id is still in `selectedItems`).

### What if `meta.count` isn't set?

ListView only renders the Show More button when `collection.meta.count > collection.length()`. Preloaded array Collections don't set `meta.count` — set it explicitly on the collection if you want the button to appear, or use a REST-backed Collection that returns `count` from the server.

---

## Grouped rows

Opt-in grouping inserts a synthetic header row before the first item of each new group key. Use it for chronological feeds (Today / Yesterday / May 5), categorical lists (Active / Resolved), alphabetical dividers (A / B / C), or any list where consumers benefit from a visible bucket break.

```js
const list = new ListView({
  collection: loginEvents,
  itemTemplate: '<div class="card">{{model.location}} — {{model.created|relative}}</div>',
  groupBy: (m) => m.get('day_bucket'),                  // resolver — see "Three-layer label pipeline" below
  groupHeaderTemplate: '<div class="list-group-header">{{key}}</div>'
});
```

The shorthand for "raw model field as the key" is a string:

```js
groupBy: 'status',                              // equivalent to (m) => m.get('status')
groupHeaderLabel: (k) => k.toUpperCase()        // 'active' → 'ACTIVE'
```

### Three-layer label pipeline

```
model → groupBy(model) → rawKey → groupHeaderLabel(rawKey) → displayKey → {{key}} in groupHeaderTemplate → DOM
```

| Layer | Required? | Purpose |
|---|---|---|
| `groupBy` | yes | Resolver. Returns the raw bucket key for a model. Header emitted when the key changes. Falsy return = no header for that item ("ungrouped tail" — joins the prior group's section). |
| `groupHeaderLabel` | optional | Formatter `(rawKey) => displayKey`. Runs once per header before the template renders. Use for raw-to-display transforms ('warning' → 'WARNING', '2026-05-08' → 'Yesterday'). |
| `groupHeaderTemplate` | optional | Mustache template. Receives `{{key}}` (the formatted display key) and `{{model.*}}` (the trigger model — first model of the group). Default: `'{{key}}'` inside an automatic `<div class="list-group-header">` wrapper. |

**Falsy keys** — any falsy resolver return (`null`, `undefined`, `''`, `0`, `false`) is treated as "ungrouped tail". If you genuinely want `0` or `''` to be a group, return a string (`'zero'`, `'__empty__'`, …) and format it in `groupHeaderLabel`.

**`data-action` inside a custom `groupHeaderTemplate`** — bubbles to the parent ListView's `onAction*` handler. The default header template is non-interactive (`pointer-events: none`), but if you supply a custom template with `<button data-action="…">` / `<a data-action="…">`, treat those as first-class ListView actions and define matching `onAction*` methods. They are NOT no-ops.

### Built-in helpers

For the dominant chronological-feed case, ship `groupByDay` instead of writing the day-bucketing logic by hand:

```js
import { groupByDay } from '@core/views/list/grouping.js';

new ListView({
  collection: loginEvents,
  itemTemplate: '<div class="card">{{model.location}}</div>',
  ...groupByDay('created')
});
```

`groupByDay` produces:
- A stable `YYYY-MM-DD` bucket key (deterministic equality regardless of input format — epoch / ISO / `Date` all bucket identically).
- A label formatter that renders `'Today'` / `'Yesterday'` / `'May 5'` (current year) / `'May 5, 2025'` (prior years).

Accepts either a field-name string (`groupByDay('created')`) or an accessor function (`groupByDay((m) => m.get('updated') || m.get('created'))`).

Additional helpers (`groupByField`, `groupByMonth`, `groupByYear`, `groupByLetter`) are tracked in `planning/requests/listview-grouping-helpers.md` and ship when a real consumer asks. Until then, write the resolver inline.

### Visual styles

Pick one of four built-in visual treatments via `groupHeaderStyle`:

| Style | Look | When |
|---|---|---|
| `'banner'` *(default)* | Neutral full-width tinted band, label centered | Most chronological / categorical feeds — strong section break, no brand-color imposition |
| `'mark'` | Small accent square + bold label + directional fading hairline | Restrained / typographic; lists where chrome should be quiet |
| `'band'` | Same neutral band as `'banner'` but label left-aligned | When the section break should flow with the items' left edge |
| `'rule'` | Editorial fieldset-legend — label centered between symmetric hairlines | Long sections / infrequent breaks; magazine feel |

```js
new ListView({
  collection: events,
  itemTemplate: '...',
  ...groupByDay('created'),
  groupHeaderStyle: 'mark'   // override the default
});
```

Each style applies a CSS modifier class (`.list-group-header--<style>` on the list shape, `.list-group-header-row--<style>` on the table shape) — overridable in your own stylesheet if you want to retune one for your app. The `'mark'` style additionally exposes `--list-group-header-accent` (defaults to `--bs-primary`) so consumers can retint the accent square per-instance:

```html
<div class="list-group-header list-group-header--mark"
     style="--list-group-header-accent: var(--bs-success)">
```

If `groupHeaderStyle` receives an unknown value, it silently falls back to `'banner'`.

### Pagination math

**Pagination counts items only** — page-size 5 still means 5 items per page, regardless of how many group headers fall into the page. Headers are decorative; the user thinks "5 logins per page," not "5 rows."

### Filter / search interaction

Headers re-segment automatically when filters or search narrow the collection — `_onCollectionReset` rebuilds against the new model order, and the resolver runs again. No special wiring needed if `groupBy` is a pure function of the model (which the API contract requires).

### Sort order

Grouping is applied **after** sort — the framework does not enforce a sort order to match grouping. If `groupBy` returns "Today / Yesterday / May 5" but the sort is ascending date, the timeline reads bottom-up. That's the consumer's call.

### Click routing

Headers do **not** participate in `clickAction: 'view'` / `onItemClick` / `item:click` / `row:click`. They extend `View` directly (not `ListViewItem`) so the row-click handler is never wired on them — clicking a header is a no-op by construction.

### Constructor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `groupBy` | `Function \| string` | `null` | Resolver `(model) => key`, or a model field name (shorthand). When set, ListView interleaves header rows. |
| `groupHeaderTemplate` | `string` | `'{{key}}'` | Mustache template for the header. Receives `{{key}}` and `{{model.*}}`. |
| `groupHeaderLabel` | `Function` | `null` | Optional `(rawKey) => displayKey` formatter applied before the template renders. |
| `groupHeaderClass` | `Class` | `ListGroupHeaderView` | Custom View subclass for headers (escape hatch — full control over outer element + behavior). |
| `groupHeaderStyle` | `'banner' \| 'mark' \| 'band' \| 'rule'` | `'banner'` | Visual treatment for the divider. See [Visual styles](#visual-styles) above. Applies a CSS modifier class on the header view's outer element. |

### Naming caveat

`Sidebar` and `SidebarTopNav` already use a `groupHeader` option for a different concept — a single static Mustache header rendered once at the top of the sidebar. ListView's grouping API is separate; the names parallel but the two systems do not interact.

### Out of scope

- Sticky headers that pin to the viewport while scrolling.
- Multi-level / nested grouping.
- Group-level batch actions ("Delete all in this group").
- Server-side grouping primitives (the collection delivers a flat ordered list; grouping is purely render-side).
- Collapsible group headers — consumers can build on top of `groupHeaderTemplate` if they want.

---

## Installation

ListView is part of the web-mojo core:

```javascript
import ListView from '@core/views/list/ListView.js';
```

---

## Basic Usage

```javascript
import ListView from '@core/views/list/ListView.js';
import UserCollection from '@collections/UserCollection.js';

const listView = new ListView({
  collection: new UserCollection(),
  itemTemplate: '<div class="user-item">{{name}} - {{email}}</div>'
});

await listView.render();
await listView.mount('#user-list');
```

The ListView will automatically fetch the collection data when mounted and render each model using the `itemTemplate`.

---

## With Custom Template

```javascript
const productList = new ListView({
  collection: productCollection,
  itemTemplate: `
    <div class="product-card p-3 border rounded mb-2" data-action="select">
      <h4>{{name}}</h4>
      <p class="price text-success">{{price|currency}}</p>
      <p class="text-muted">{{description|truncate(100)}}</p>
    </div>
  `,
  selectionMode: 'multiple'
});
```

Template variables like `{{name}}`, `{{price}}`, and `{{description}}` come from each item's model. You can use MOJO's built-in formatters with the pipe syntax (e.g., `{{price|currency}}`).

---

## With Selection

```javascript
const selectableList = new ListView({
  collection: userCollection,
  itemTemplate: `
    <div class="user-card" data-action="select">
      <strong>{{name}}</strong>
      <span class="text-muted">{{email}}</span>
    </div>
  `,
  selectionMode: 'single'
});

// Listen for selection changes
selectableList.on('selection:change', ({ selected, model }) => {
  console.log('Selected IDs:', selected);
  console.log('Last changed model:', model);
});
```

The `data-action="select"` attribute on the template makes that element clickable for selection. The `selectionMode` controls whether none, one, or many items can be selected at a time.

---

## Constructor Options

### Core

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collection` | `Collection` or `Class` or `Array` | `null` | The data source. Can be a Collection instance, a Collection class (will be instantiated), or a raw array of data |
| `Collection` | `Class` | `null` | Alternative to `collection` — a Collection class to instantiate |
| `itemTemplate` | `string` | `null` | Mustache template string for rendering each item |
| `itemClass` | `Class` | `ListViewItem` | The View class used to create each item |
| `selectionMode` | `string` | `'none'` | Selection behavior: `'none'`, `'single'`, or `'multiple'` |
| `emptyMessage` | `string` | `'No items to display'` | Message shown when the collection is empty |
| `fetchOnMount` | `boolean` | `false` | Whether to fetch collection data when the view is mounted |
| `defaultQuery` | `object` | `undefined` | Default query parameters to apply to the collection |
| `collectionParams` | `object` | `undefined` | Parameters to merge into the collection's params |
| `className` | `string` | `'list-view'` | CSS class for the root element |
| `template` | `string` | *(built-in)* | Override the outer list template (loading/empty/items container) |

### Toolbar — search, filters, sort

ListView ships an opt-in toolbar that mirrors what `TableView` has. Every flag below defaults to off, so a `new ListView({ collection, itemTemplate })` with no toolbar options renders exactly as it did before.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `searchable` | `boolean` | `false` | Render a search input that drives `collection.params.search`. |
| `searchPlaceholder` | `string` | `'Search...'` | Placeholder text for the search input. |
| `searchPlacement` | `string` | `'toolbar'` | `'toolbar'` or `'dropdown'`. |
| `filterable` | `boolean` | `false` | Render the "Add Filter" dropdown + active-pill bar. Requires `filters: [...]` (or column filters when subclassed). |
| `filters` | `Array<object>` | `[]` | Filter definitions: `{ name, label, type, options? }`. Same shape as TableView's `filters` (a.k.a. additional filters). |
| `hideActivePills` | `boolean` | `false` | Hide the active-filter pills bar. |
| `hideActivePillNames` | `Array<string>` | `[]` | Pill names to suppress (e.g. tenant scope, always-on filters). |
| `sortOptions` | `Array<object>` | `[]` | List-style "Sort by" dropdown options: `{ key, label, dir }`. Sets `collection.params.sort`. |
| `title` | `string` | `null` | Toolbar heading (renders as `<h5>` on the left). |
| `eyebrow` | `string` | `null` | Small uppercase line above the title. |
| `showRefresh` | `boolean` | `true` | Render the refresh button. Has no effect unless the toolbar shell is rendered. |
| `toolbarButtons` | `Array<object>` | `[]` | Custom buttons: `{ label, icon, action?, handler?, variant?, title?, className?, permissions? }`. |
| `toolbarRight` | `View` | `null` | Optional View mounted into a right-aligned slot (range pickers, view-mode toggles, etc.). |
| `dayRangeFilter` | `boolean \| object` | `false` | When truthy, mounts a `SegmentControl` day-range picker in the toolbar and writes `${field}__gte` to `collection.params` on every change (refetches automatically). Boolean `true` → defaults `{ field: 'created', value: '7d', options: [1d, 7d, 30d, 90d], ariaLabel: 'Time range' }`. Object form merges over those defaults. Coexists with `toolbarRight`: day-range mounts to the left, `toolbarRight` to the right. See [Day-range filter](#day-range-filter). |

### Pagination

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `paginated` | `boolean` | `false` | Render the pagination footer. |
| `paginationMode` | `string` | `'more'` when `paginated` is true | `'pages'` (numbered + page-size selector), `'more'` (load-more button), or `'none'` (disabled). Default for ListView is `'more'` — the convention for visual lists. TableView overrides this default to `'pages'`. |
| `pageSize` | `number` | `undefined` | Convenience that seeds `collection.params.size` if not already set. |
| `persistSelection` | `boolean` | `paginationMode === 'more'` | Whether `selectedItems` survives a page rebuild. Defaults to `true` in `'more'` mode (rows aren't torn down anyway), `false` otherwise (preserves TableView's historical "selection clears on page change" behavior unless caller opts in). |

### Click-anywhere-on-the-row + Model lifecycle

ListView ships the same model lifecycle that TableView does — view dialogs, edit forms, delete confirms, an Add button, and an Export download — all parameterized by the same options. ListView defaults `clickAction: 'none'` (no surprise behavior on plain lists) while TableView defaults `clickAction: 'view'` (existing behavior). Both share the implementation.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clickAction` | `'view' \| 'edit' \| 'select' \| 'none' \| function` | `'none'` | What clicking the item's outer element does. `'view'` opens the view dialog (`itemView` / `Model.VIEW_CLASS`). `'edit'` opens the edit form (`editForm` / `Model.EDIT_FORM`). `'select'` toggles selection. A function is called with `(model, event)`. `'none'` does nothing — but the `row:click` event still fires so external listeners can react. |
| `onItemClick` | `function` | `null` | Shorthand callback. Fired when the row's outer element is clicked anywhere not handled by an inner `data-action`. Implies `clickable: true`. Same payload as TableView's `onRowClick`. |
| `clickable` | `boolean` | true when `onItemClick` is set or `clickAction !== 'none'` | Adds the `.clickable` class to each item (`cursor: pointer` + hover treatment). |
| `itemView` | `Class` | `null` | View class to instantiate inside the view dialog. Falls back to `Model.VIEW_CLASS`, then to a generic `Modal.data` dialog. |
| `addForm` | `Array` or `object` | `null` | Form-field config (or `{ title, fields }`) used by the Add button + dialog. Falls back to `Model.ADD_FORM`. |
| `editForm` | `Array` or `object` | `null` | Form-field config used by the Edit dialog (and by row-click when `clickAction: 'edit'`). Falls back to `Model.EDIT_FORM`, then to `addForm`. |
| `deleteTemplate` | `string` | `null` | Mustache template for the delete confirmation message. Falls back to `Model.DELETE_TEMPLATE`. |
| `formDialogConfig` | `object` | `{}` | Extra options merged into every form dialog (e.g. `{ size: 'lg', centered: true }`). Merged after `Model.FORM_DIALOG_CONFIG`. |
| `viewDialogOptions` | `object` | `{}` | Extra options merged into the view dialog. |
| `fetchOnView` | `boolean` | `true` | Re-fetch the model from the server before opening the view dialog. Set `false` to skip and use the model already in the row. |
| `onItemView`, `onItemEdit`, `onItemDelete`, `onAdd` | `function` | `null` | Per-action callback overrides — `(model, event)` for the row actions, `(event)` for Add. When set, the default Modal flow is bypassed. |
| `onRowClick` | `function` | `null` | Full row-click override — beats `clickAction` and `onItemClick`. |
| `showAdd` | `boolean` | `false` | Render the green Add button in the toolbar. (TableView defaults this to `true`.) |
| `showExport` | `boolean` | `false` | Render the Export button. CSV/JSON by default. (TableView defaults this to `true`.) |
| `exportOptions` | `Array<object>` | auto | Override the export menu: `[{ format, label, icon }, ...]`. |
| `exportSource` | `'remote' \| 'local'` | `'remote'` | `'remote'` calls `collection.download(format)`. `'local'` invokes `options.onExport(data, format)` with the in-memory data. |

**Inner `data-action` clicks always win.** Clicking a button/link inside the card with its own `data-action="<name>"` does NOT also fire `onItemClick` or the `clickAction` flow — the inner action handler runs and the row-click is suppressed.

**Form-control clicks are also suppressed.** Clicks on `<input>`, `<textarea>`, `<select>` inside the row don't trigger row-click — typing in a search input inside a card shouldn't open the card detail.

#### Item-template action buttons

Drop `data-action="view"`, `data-action="edit"`, or `data-action="delete"` buttons into the item template and they fire the same dialog flow without any extra wiring:

```js
const list = new ListView({
  collection: postCollection,
  itemView: PostDetailView,
  editForm: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'body',  label: 'Body',  type: 'textarea' }
  ],
  deleteTemplate: 'Delete <strong>{{title}}</strong>?',
  itemTemplate: `
    <div class="card p-3">
      <h5>{{model.title}}</h5>
      <p>{{model.body}}</p>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-primary"   data-action="view">View</button>
        <button class="btn btn-sm btn-secondary" data-action="edit">Edit</button>
        <button class="btn btn-sm btn-danger"    data-action="delete">Delete</button>
      </div>
    </div>
  `
});
```

#### Click-the-card to view

Setting `clickAction: 'view'` plus an `itemView` or `Model.VIEW_CLASS` lets users click anywhere on the card to open the detail dialog — the same affordance TableView gives clickable rows.

```js
const list = new ListView({
  collection: postCollection,
  clickAction: 'view',
  itemView: PostDetailView,        // or PostModel.VIEW_CLASS
  itemTemplate: `<div class="card p-3"><h5>{{model.title}}</h5></div>`
});
```

The same payload is also emitted as a `row:click` event for parity with TableView, so external listeners can react via `list.on('row:click', ...)` instead of (or in addition to) the callback.

**Inner `data-action` clicks always win.** Clicking a button or link inside the card with its own `data-action="<name>"` does NOT also fire `onItemClick` — the inner action handler runs and the row-click is suppressed. So you can safely put a `<button data-action="favorite">` inside a clickable card without double-firing.

**Form-control clicks are also suppressed.** Clicks on `<input>`, `<textarea>`, and `<select>` inside the row don't trigger `onItemClick` either (typing in a search input inside a card shouldn't open the card detail).

```js
const list = new ListView({
  collection: postCollection,
  itemTemplate: `
    <div class="card p-3">
      <h5>{{model.title}}</h5>
      <p>{{model.body}}</p>
      <button data-action="favorite" class="btn btn-sm btn-outline-warning">Favorite</button>
    </div>
  `,
  onItemClick: (model, event) => {
    // Open detail page; the favorite button still works because inner
    // data-action wins.
    app.router.navigate(\`/posts/\${model.id}\`);
  }
});
```

The same payload is also emitted as a `row:click` event for parity with TableView, so external listeners can react via `list.on('row:click', ...)` instead of (or in addition to) the callback.

**Note:** If neither `fetchOnMount` is `true` nor the collection has been previously fetched (`lastFetchTime` is null), the collection will be fetched automatically on mount.

```javascript
const listView = new ListView({
  collection: new UserCollection(),
  itemTemplate: '<div class="user">{{name}}</div>',
  selectionMode: 'single',
  emptyMessage: 'No users found',
  fetchOnMount: true,
  collectionParams: {
    role: 'admin',
    active: true
  }
});
```

---

## Collection Sources

ListView accepts collections in three forms:

### Collection Instance

```javascript
const users = new UserCollection();
const listView = new ListView({
  collection: users,
  itemTemplate: '<div>{{name}}</div>'
});
```

### Collection Class

Pass a class and ListView will instantiate it:

```javascript
const listView = new ListView({
  collection: UserCollection,
  itemTemplate: '<div>{{name}}</div>'
});
```

### Raw Array

Pass an array and ListView will wrap it in a generic Collection:

```javascript
const listView = new ListView({
  collection: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' }
  ],
  itemTemplate: '<div>{{name}}</div>'
});
```

---

## Item Templates

The `itemTemplate` is a Mustache template string passed to each `ListViewItem` as its `template`. Model data is available directly as template variables.

### Simple Template

```javascript
const listView = new ListView({
  collection: userCollection,
  itemTemplate: '<div class="item">{{name}}</div>'
});
```

### Template with Formatters

```javascript
const listView = new ListView({
  collection: orderCollection,
  itemTemplate: `
    <div class="order-item">
      <span class="order-id">#{{id}}</span>
      <span class="total">{{total|currency}}</span>
      <span class="date">{{created|date}}</span>
      <span class="status badge">{{status}}</span>
    </div>
  `
});
```

### Template with Selection Action

Add `data-action="select"` to make an element trigger selection:

```javascript
const listView = new ListView({
  collection: userCollection,
  itemTemplate: `
    <div class="user-card" data-action="select">
      <img src="{{avatar}}" alt="{{name}}" class="avatar" />
      <div class="user-info">
        <strong>{{name}}</strong>
        <small>{{email}}</small>
      </div>
    </div>
  `,
  selectionMode: 'single'
});
```

### Default Template

If no `itemTemplate` is provided, ListViewItem uses a built-in fallback that renders common fields like `id`, `name`, `title`, `label`, and `description`.

---

## Custom Item Classes

For full control over item rendering and behavior, create a custom class extending `ListViewItem`:

```javascript
import ListViewItem from '@core/views/list/ListViewItem.js';

class UserCard extends ListViewItem {
  constructor(options = {}) {
    super({
      className: 'user-card',
      ...options
    });

    this.template = `
      <div class="card" data-action="select">
        <div class="card-body">
          <h5>{{name}}</h5>
          <p>{{email}}</p>
          <span class="badge bg-{{roleBadgeColor}}">{{role}}</span>
        </div>
      </div>
    `;
  }

  // Custom computed property available in the template
  get roleBadgeColor() {
    const role = this.model?.get('role');
    return role === 'admin' ? 'danger' : 'primary';
  }
}

// Use it in the ListView
const listView = new ListView({
  collection: userCollection,
  itemClass: UserCard,
  selectionMode: 'single'
});
```

When using a custom `itemClass`, you can still pass `itemTemplate` — it will be provided to the item class constructor as `template`, which can be used or ignored depending on your implementation.

---

## Selection Modes

### None (Default)

No selection is allowed. Clicking `data-action="select"` elements has no effect.

```javascript
const listView = new ListView({
  collection: myCollection,
  selectionMode: 'none'
});
```

### Single

Only one item can be selected at a time. Selecting a new item automatically deselects the previous one.

```javascript
const listView = new ListView({
  collection: myCollection,
  selectionMode: 'single'
});

listView.on('selection:change', ({ selected, model }) => {
  // selected is an array with at most 1 ID
  console.log('Selected:', selected[0]);
});
```

### Multiple

Any number of items can be selected. Clicking toggles selection on/off.

```javascript
const listView = new ListView({
  collection: myCollection,
  selectionMode: 'multiple'
});

listView.on('selection:change', ({ selected }) => {
  console.log('Selected IDs:', selected); // Array of model IDs
});
```

---

## Methods

### setCollection(collection)

Replace the current collection. Cleans up old listeners, then either shows the loading state or builds items immediately depending on whether the collection needs an initial fetch.

If the collection is REST-enabled and has never been fetched (`lastFetchTime` is null) and is not marked as `preloaded`, `setCollection()` sets `this.loading = true` instead of calling `_buildItems()`. This prevents the empty-state message from flashing before the first fetch completes. Items are rendered once the fetch fires `fetch:end`.

```javascript
const newCollection = new UserCollection();
listView.setCollection(newCollection);
```

**Returns:** `this` (for chaining)

---

### getSelectedItems()

Get all currently selected items.

```javascript
const selected = listView.getSelectedItems();
// Returns: [{ view, model, data }, ...]
```

Each entry contains:
- `view` — The ListViewItem instance
- `model` — The Model instance
- `data` — The model's JSON data

---

### selectItem(modelId)

Programmatically select an item by its model ID.

```javascript
listView.selectItem(42);
```

**Returns:** `this` (for chaining)

---

### deselectItem(modelId)

Programmatically deselect an item by its model ID.

```javascript
listView.deselectItem(42);
```

**Returns:** `this` (for chaining)

---

### clearSelection()

Deselect all items and emit a `selection:change` event.

```javascript
listView.clearSelection();
```

---

### forEachItem(callback, thisArg)

Iterate over each item view in the list.

```javascript
listView.forEachItem((itemView, model, index) => {
  console.log(`Item ${index}: ${model.get('name')}`);
});
```

**Parameters:**
- `callback(itemView, model, index)` — Function called for each item
- `thisArg` *(optional)* — Value to use as `this` in the callback

**Returns:** `this` (for chaining)

---

### setItemTemplate(template, rerender)

Update the item template at runtime.

```javascript
// Change to compact layout
listView.setItemTemplate('<div class="compact">{{name}}</div>', true);
```

**Parameters:**
- `template` — New Mustache template string
- `rerender` *(default: false)* — If `true`, re-renders all existing items with the new template

**Returns:** `this` (for chaining)

---

### refresh()

Re-fetch the collection (if REST-enabled) or rebuild items from existing data.

```javascript
await listView.refresh();
```

---

### destroy()

Clean up all collection listeners, item views, and DOM elements.

```javascript
await listView.destroy();
```

---

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `collection` | `Collection` | The bound collection instance |
| `itemViews` | `Map` | Map of `model.id` → `ListViewItem` instances |
| `selectedItems` | `Set` | Set of selected model IDs |
| `itemTemplate` | `string` | Current item template string |
| `itemClass` | `Class` | The class used to create item views |
| `selectionMode` | `string` | Current selection mode (`'none'`, `'single'`, `'multiple'`) |
| `emptyMessage` | `string` | Message displayed when collection is empty |
| `loading` | `boolean` | Whether the collection is currently fetching |
| `isEmpty` | `boolean` | Whether the collection is empty |

---

## Events

ListView emits the following events:

| Event | Payload | Description |
|-------|---------|-------------|
| `item:click` | `{ item, model, index, action, data }` | Any item is clicked |
| `item:select` | `{ item, model, index, data }` | An item is selected |
| `item:deselect` | `{ item, model, index, data }` | An item is deselected |
| `selection:change` | `{ selected, item, model }` | Selection state changes. `selected` is an array of model IDs |
| `list:empty` | — | Collection becomes empty |
| `list:loaded` | `{ count }` | Collection is populated with items |

### Listening to Events

```javascript
const listView = new ListView({
  collection: userCollection,
  itemTemplate: '<div data-action="select">{{name}}</div>',
  selectionMode: 'single'
});

listView.on('selection:change', ({ selected, model }) => {
  if (selected.length > 0) {
    console.log('Selected user:', model.get('name'));
  } else {
    console.log('Nothing selected');
  }
});

listView.on('list:empty', () => {
  console.log('No items in the list');
});

listView.on('list:loaded', ({ count }) => {
  console.log(`Loaded ${count} items`);
});
```

---

## Dynamic Templates

You can change the item template after the ListView is created:

```javascript
const listView = new ListView({
  collection: productCollection,
  itemTemplate: `
    <div class="product-card">
      <h4>{{name}}</h4>
      <p>{{price|currency}}</p>
    </div>
  `
});

// Later, switch to a compact layout
listView.setItemTemplate(`
  <div class="product-row">
    <span>{{name}}</span> — <span>{{price|currency}}</span>
  </div>
`, true); // true = re-render existing items
```

---

## Custom ListViewItem Subclass

ListViewItem is a full View, so your subclass has access to all View features: lifecycle hooks, event delegation, child views, and more.

```javascript
import ListViewItem from '@core/views/list/ListViewItem.js';

class TaskItem extends ListViewItem {
  constructor(options = {}) {
    super({
      className: 'task-item',
      ...options
    });

    this.template = `
      <div class="d-flex align-items-center gap-2 p-2 border-bottom">
        <input type="checkbox" data-action="toggle-complete"
               {{#model.completed}}checked{{/model.completed}} />
        <span class="{{#model.completed}}text-decoration-line-through text-muted{{/model.completed}}">
          {{model.title}}
        </span>
        <button class="btn btn-sm btn-outline-danger ms-auto" data-action="remove">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
  }

  async onActionToggleComplete(event, element) {
    const completed = !this.model.get('completed');
    await this.model.save({ completed });
  }

  async onActionRemove(event, element) {
    await this.model.destroy();
  }
}

// Use in ListView
const taskList = new ListView({
  collection: taskCollection,
  itemClass: TaskItem,
  emptyMessage: 'No tasks yet. Add one above!'
});
```

---

## Preloaded Data

For local/static data, pass an array directly:

```javascript
const colorList = new ListView({
  collection: [
    { id: 1, name: 'Red', hex: '#FF0000' },
    { id: 2, name: 'Green', hex: '#00FF00' },
    { id: 3, name: 'Blue', hex: '#0000FF' }
  ],
  itemTemplate: `
    <div class="color-swatch" style="background: {{hex}};">
      {{name}}
    </div>
  `
});
```

---

## Collection Parameters

### Default Query

Apply default query parameters to the collection:

```javascript
const listView = new ListView({
  collection: new UserCollection(),
  defaultQuery: { role: 'admin', active: true },
  itemTemplate: '<div>{{name}} ({{role}})</div>'
});
```

### Collection Params

Alternatively, use `collectionParams` to merge parameters:

```javascript
const listView = new ListView({
  collection: new UserCollection(),
  collectionParams: { department: 'engineering' },
  itemTemplate: '<div>{{name}}</div>'
});
```

`collectionParams` takes precedence over `defaultQuery` when both are provided.

---

## Fetching Behavior

By default, ListView fetches the collection when mounted **if the collection has never been fetched** (`lastFetchTime` is null). You can also force a fetch on every mount:

```javascript
const listView = new ListView({
  collection: userCollection,
  fetchOnMount: true, // Always fetch when mounted
  itemTemplate: '<div>{{name}}</div>'
});
```

During fetching, the ListView shows a loading spinner. When the fetch completes, items are rendered automatically.

### Initial Loading State

When `setCollection()` is called with a REST-backed collection that has never been fetched and is not preloaded, the ListView sets `loading = true` immediately. This means the loading spinner is shown from the first render rather than a brief flash of the empty-state message before the fetch begins. The items are rendered once the collection fires its `fetch:end` event.

For preloaded collections (raw arrays or collections with `options.preloaded = true`), items are built immediately without a loading state.

---

## Using with TableView

[TableView](./TableView.md) extends ListView, adding columns, sorting, filtering, pagination, row actions, and more. If your list needs tabular features, use TableView instead:

```javascript
import TableView from '@core/views/table/TableView.js';

const table = new TableView({
  collection: userCollection,
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' }
  ],
  actions: ['view', 'edit', 'delete']
});
```

---

## Using with Pages

ListView can be used as a child view within any Page:

```javascript
import Page from '@core/Page.js';
import ListView from '@core/views/list/ListView.js';

class NotificationsPage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'notifications',
      template: `
        <div class="container py-4">
          <h2>Notifications</h2>
          <div data-container="list"></div>
        </div>
      `,
      ...options
    });
  }

  async onInit() {
    await super.onInit();

    this.listView = new ListView({
      collection: new NotificationCollection(),
      containerId: 'list',
      itemTemplate: `
        <div class="notification p-3 border-bottom">
          <strong>{{title}}</strong>
          <p class="mb-0 text-muted">{{message}}</p>
          <small>{{created|timeAgo}}</small>
        </div>
      `
    });

    this.addChild(this.listView);
  }
}
```

---

## Performance Tips

1. **Use `itemTemplate` for simple items** — Avoids creating custom subclasses when a template string is sufficient.

2. **Leverage per-item re-rendering** — Only the changed model's item re-renders, so updating one model in a 1000-item list is fast.

3. **Avoid full re-renders** — Use `setItemTemplate(template, true)` instead of rebuilding the entire ListView when you need to change templates.

4. **Use `silent` model updates** — If you're batch-updating models and want to render once at the end:
   ```javascript
   collection.forEach(model => {
     model.set({ processed: true }, { silent: true });
   });
   listView.render(); // Single re-render
   ```

---

## Memory Management

ListView automatically cleans up when destroyed:

- Removes all collection event listeners
- Destroys all item views
- Clears the `itemViews` Map and `selectedItems` Set

Always call `destroy()` when you're done with a ListView, or let a parent view manage its lifecycle:

```javascript
// Manual cleanup
await listView.destroy();

// Or let a parent page manage it
this.addChild(listView); // Parent's destroy will cascade
```

---

## Common Patterns

### Filtered List

```javascript
const listView = new ListView({
  collection: new TaskCollection(),
  collectionParams: { status: 'pending' },
  itemTemplate: '<div>{{title}} — {{status}}</div>'
});

// Change filter later
listView.collection.setParams({ status: 'completed' });
await listView.collection.fetch();
```

### Master-Detail

```javascript
const listView = new ListView({
  collection: userCollection,
  itemTemplate: '<div data-action="select">{{name}}</div>',
  selectionMode: 'single'
});

const detailView = new DataView({ data: {} });

listView.on('selection:change', ({ model }) => {
  if (model) {
    detailView.setData(model.toJSON());
  }
});
```

### Programmatic Selection

```javascript
// Select an item by ID
listView.selectItem(42);

// Get selected items
const selected = listView.getSelectedItems();
console.log(selected.map(s => s.model.get('name')));

// Clear all selections
listView.clearSelection();
```

---

## Common Issues

### Items don't render

- Make sure the collection has data. If it's a REST collection, ensure `fetchOnMount` is true or the collection has already been fetched.
- Verify `itemTemplate` uses valid Mustache syntax.
- Check the browser console for template errors.

### Selection doesn't work

- Ensure `selectionMode` is set to `'single'` or `'multiple'`.
- Your item template needs an element with `data-action="select"` for click-to-select to work.

### Items don't update when model changes

- Model changes trigger re-renders automatically via the View's model binding. If you're modifying data directly (not through `model.set()`), the change won't be detected.

### Empty message not showing

- The empty message only appears when `loading` is `false` and `isEmpty` is `true`. If the collection is still fetching, you'll see the loading spinner instead.

---

## Related Documentation

- **[View](../core/View.md)** — Base View class that ListView extends
- **[Collection](../core/Collection.md)** — Collection class used as the data source
- **[TableView](./TableView.md)** — Advanced table component that extends ListView
- **[TablePage](./TablePage.md)** — Page wrapper for TableView with URL sync
- **[Templates](../core/Templates.md)** — Mustache template syntax and formatters
- **[Events](../core/Events.md)** — Event system and delegation

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste references in the examples portal:

- [`examples/portal/examples/components/ListView/ListViewExample.js`](../../../examples/portal/examples/components/ListView/ListViewExample.js) — Visual list bound to a Collection — per-row Views with click-to-select.
- [`examples/portal/examples/components/ListView/ListViewCustomItemExample.js`](../../../examples/portal/examples/components/ListView/ListViewCustomItemExample.js) — ListViewItem subclass with avatar, badges, and computed display fields.
- [`examples/portal/examples/components/ListView/ListViewLiveFilterExample.js`](../../../examples/portal/examples/components/ListView/ListViewLiveFilterExample.js) — Search input above the list, debounced via MOJOUtils.debounce + collection.where().

<!-- examples:cross-link end -->
