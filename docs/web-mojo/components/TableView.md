# TableView

**Advanced data table component with sorting, filtering, pagination, and row actions**

TableView extends [ListView](./ListView.md) to render collections as full-featured data tables. Each row is a separate `TableRow` view backed by its own model, providing efficient per-row re-rendering. It includes a toolbar with search, filters, export, and add buttons; column sorting; server-side pagination; row and batch actions; responsive column visibility; inline editing; fullscreen mode; and footer totals.

> **Note on the toolbar / filter / pagination machinery.** As of the ListView toolbar refactor, the toolbar shell, search input, filter dropdown + active-pill bar, numbered pagination, page-size selector, refresh button, custom toolbar buttons, title/eyebrow, and `toolbarRight` slot all live on `ListView`. TableView inherits them and adds the table-specific bits (columns, sortable column-header dropdowns, footer totals, batch actions, fullscreen, Add/Export). All of TableView's options behave identically to before — `searchable: true`, `filterable: true`, `paginated: true`, and numbered pagination remain the defaults.

---

## Table of Contents

### Overview
- [What is a TableView?](#what-is-a-tableview)
- [Key Features](#key-features)
- [When to Use TableView](#when-to-use-tableview)

### Quick Start
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Complete Example](#complete-example)

### Configuration
- [Constructor Options](#constructor-options)
- [Column Configuration](#column-configuration)
- [Column Visibility (Responsive)](#column-visibility-responsive)
- [Cell Alignment](#cell-alignment)
- [Column Formatters](#column-formatters)
- [Column Filters](#column-filters)
- [Footer Totals](#footer-totals)

### Row Actions
- [Built-in Actions](#built-in-actions)
- [Context Menus](#context-menus)
- [Click Action](#click-action)
- [Custom Action Handlers](#custom-action-handlers)
- [Expandable rows](#expandable-rows)

### Toolbar
- [Search](#search)
- [Add Button](#add-button)
- [Export Button](#export-button)
- [Refresh & Fullscreen](#refresh--fullscreen)
- [Custom Toolbar Buttons](#custom-toolbar-buttons)

### Filtering
- [Column Filters](#column-filters)
- [Additional Filters](#additional-filters)
- [Filter Types](#filter-types)
- [Active Filter Pills](#active-filter-pills)
- [Programmatic Filtering](#programmatic-filtering)

### Sorting
- [Sortable Columns](#sortable-columns)
- [Default Sort](#default-sort)

### Pagination
- [Server-Side Pagination](#server-side-pagination)
- [Page Size](#page-size)
- [Disabling Pagination](#disabling-pagination)

### Batch Actions
- [Configuring Batch Actions](#configuring-batch-actions)
- [Batch Bar Location](#batch-bar-location)
- [Handling Batch Events](#handling-batch-events)

### Forms (Add / Edit / Delete)
- [Add Form](#add-form)
- [Edit Form](#edit-form)
- [Delete Confirmation](#delete-confirmation)
- [Item View Dialog](#item-view-dialog)
- [Form Dialog Config](#form-dialog-config)

### Table Display Options
- [Table Styling](#table-styling)

### API Reference
- [Methods](#methods)
- [Properties](#properties)
- [Events](#events)

### Advanced Usage
- [Custom TableRow Subclass](#custom-tablerow-subclass)
- [Fullscreen Mode](#fullscreen-mode)

### Integration
- [Using with TablePage](#using-with-tablepage)
- [Using as a Child View](#using-as-a-child-view)

### Best Practices
- [Performance Tips](#performance-tips)

### Troubleshooting
- [Common Issues](#common-issues)

### Related Documentation
- [Related Documentation](#related-documentation)

---

## What is a TableView?

A **TableView** is a ListView that renders its collection as an HTML `<table>` with:

1. A **toolbar** with search, filter, add, export, refresh, and fullscreen buttons
2. A **header row** with sortable columns and sort direction dropdowns
3. **Data rows** where each row is a `TableRow` View backed by a model
4. An optional **footer row** with column totals
5. **Pagination** controls with page size selector
6. Optional **batch actions** panel for multi-select operations

Because it extends ListView, it inherits efficient per-row rendering — only changed rows re-render when their model updates.

---

## Key Features

- **Column-Based Rendering** — Define columns with keys, labels, formatters, sort, filter, and responsive visibility
- **Sorting** — Per-column sort with ascending, descending, and clear options
- **Filtering** — Column-based and additional filters with dialog-based editing and active filter pills
- **Search** — Toolbar search input with debounced server-side search
- **Pagination** — Server-side pagination with page size selector and wrapping navigation
- **Row Actions** — Built-in view, edit, delete actions or custom action definitions
- **Context Menus** — Right-click context menus on rows
- **Batch Actions** — Multi-select with batch action toolbar
- **Export** — CSV and JSON export, local or remote
- **Add / Edit / Delete** — Automatic form dialogs from form field configuration
- **Footer Totals** — Automatic column sum calculations
- **Responsive Columns** — Show/hide columns at Bootstrap breakpoints
- **Fullscreen Mode** — Toggle the table to fullscreen view
- **Custom Toolbar Buttons** — Add your own buttons to the toolbar
- **Table Styling** — Striped, bordered, hover, size, and background options

---

## When to Use TableView

Use TableView when you need to:

- **Display tabular data** from a Collection with column headers
- **Sort, filter, search, and paginate** data
- **Provide row-level actions** like view, edit, and delete
- **Support multi-select** with batch operations
- **Export data** to CSV or JSON

For a simple list of cards or tiles without table features, use [ListView](./ListView.md) instead.
For a full page with URL parameter synchronization, use [TablePage](./TablePage.md) which wraps TableView.

---

## Installation

TableView is part of the web-mojo core:

```javascript
import TableView from '@core/views/table/TableView.js';
```

---

## Basic Usage

```javascript
import TableView from '@core/views/table/TableView.js';
import UserCollection from '@collections/UserCollection.js';

const table = new TableView({
  collection: new UserCollection(),
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' }
  ]
});

await table.render();
await table.mount('#table-container');
```

The TableView will fetch the collection on mount and render a full table with toolbar, headers, rows, and pagination.

---

## Complete Example

```javascript
import TableView from '@core/views/table/TableView.js';
import UserCollection from '@collections/UserCollection.js';

const table = new TableView({
  collection: new UserCollection(),

  // Columns
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true, visibility: 'md' },
    { key: 'role', label: 'Role', filter: { type: 'select', options: ['admin', 'user', 'editor'] } },
    { key: 'created|date', label: 'Created', sortable: true, visibility: 'lg' },
    { key: 'balance|currency', label: 'Balance', footer_total: true }
  ],

  // Row actions
  actions: ['view', 'edit', 'delete'],
  clickAction: 'view',

  // Forms
  addForm: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'role', label: 'Role', type: 'select', options: ['admin', 'user', 'editor'] }
  ],
  editForm: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'role', label: 'Role', type: 'select', options: ['admin', 'user', 'editor'] }
  ],

  // Features
  searchable: true,
  sortable: true,
  filterable: true,
  paginated: true,

  // Toolbar
  showAdd: true,
  showExport: true,

  // Selection and batch
  selectionMode: 'multiple',
  batchActions: [
    { action: 'delete', label: 'Delete Selected', icon: 'bi bi-trash', variant: 'danger' },
    { action: 'export', label: 'Export Selected', icon: 'bi bi-download' }
  ],

  // Table styling
  tableOptions: {
    striped: true,
    hover: true,
    bordered: false,
    size: 'sm'
  }
});

// Listen for events
table.on('row:view', ({ model }) => console.log('Viewing:', model.get('name')));
table.on('batch:action', ({ action, items }) => console.log(action, items.length, 'items'));

await table.render();
await table.mount('#users-table');
```

---

## Constructor Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collection` | `Collection` / `Class` / `Array` | `null` | Data source (inherited from ListView) |
| `columns` | `Array<object>` | `[]` | Column definitions (see [Column Configuration](#column-configuration)) |
| `actions` | `Array<string>` | `null` | Row actions: `'view'`, `'edit'`, `'delete'`, or custom strings |
| `contextMenu` | `Array<object>` | `null` | Per-row dropdown menu items (see [Context Menus](#context-menus)); `rowContextMenu` is an accepted alias |
| `clickAction` | `string` | `'view'` | What happens when a row is clicked: `'view'` or `'edit'` |

### Feature Toggles

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `searchable` | `boolean` | `true` | Show the search input |
| `sortable` | `boolean` | `true` | Enable column sorting |
| `filterable` | `boolean` | `true` | Enable the filter dropdown |
| `paginated` | `boolean` | `true` | Show pagination controls |
| `showAdd` | `boolean` | `true` | Show the Add button |
| `showExport` | `boolean` | `true` | Show the Export button |
| `columnChooser` | `boolean` | `false` | Show the icon-only "Columns" show/hide dropdown ([details](#column-chooser-columnchooser)) |
| `persistState` | `boolean` | `false` | Persist sort/size/day-range/filters (+ hidden columns) to `localStorage` ([details](#view-persistence-persiststate)) |
| `persistKey` | `string` | *route+endpoint* | Explicit storage identity for `persistState` |

### Toolbar & Display

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `addButtonLabel` | `string` | `'Add'` | Label text for the add button |
| `addButtonIcon` | `string` | `'bi bi-plus-circle'` | Icon class for the add button |
| `searchPlacement` | `string` | `'toolbar'` | Where to place search: `'toolbar'` or `'dropdown'` |
| `searchPlaceholder` | `string` | `'Search...'` | Placeholder text for the search input |
| `emptyMessage` | `string` | `'No data available'` | Message shown when no data |
| `toolbarButtons` | `Array<object>` | `[]` | Custom toolbar button definitions |

### Selection & Batch

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selectionMode` | `string` | `'none'` | `'none'`, `'single'`, or `'multiple'` |
| `selectable` | `boolean` | `false` | Shorthand: sets `selectionMode` to `'multiple'` if true |
| `batchActions` | `Array<object>` | `null` | Batch action definitions |
| `batchBarLocation` | `string` | `'bottom'` | `'top'` or `'bottom'` |

### Expandable Rows

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rowExpand` | `function` | `null` | `(model) => string \| View`. Enables a chevron toggle column that expands an inline detail row beneath the data row. See [Expandable rows](#expandable-rows). |
| `rowExpandMultiple` | `boolean` | `false` | Allow several rows expanded at once. Default is single-open (opening one collapses the others). |

### Forms & Dialogs

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `addForm` | `Array<object>` | `null` | Form field config for the Add dialog |
| `editForm` | `Array<object>` | `null` | Form field config for the Edit dialog |
| `deleteTemplate` | `string` | `null` | Mustache template for delete confirmation message |
| `itemView` | `Class` | `null` | Custom View class for the row-view dialog |
| `fetchOnView` | `boolean` | `true` | Fetch the latest model data from the server before opening the view dialog. Set to `false` to use the model as-is from the table row. Skipped when `onItemView` is provided. |
| `formDialogConfig` | `object` | `{}` | Extra options passed to form dialogs (e.g., `size`, `centered`) |
| `viewDialogOptions` | `object` | `{}` | Extra options passed to the view dialog |

### Custom Handlers

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onItemView` | `function` | `null` | Custom handler for row view action. Receives `(model, event)` |
| `onItemEdit` | `function` | `null` | Custom handler for row edit action. Receives `(model, event)` |
| `onItemDelete` | `function` | `null` | Custom handler for row delete action. Receives `(model, event)` |
| `onAdd` | `function` | `null` | Custom handler for the Add button. Receives `(event)` |
| `onExport` | `function` | `null` | Custom handler for export. Receives `(data, format)` |
| `onRowClick` | `function` | `null` | Custom handler for row clicks. Receives `(model, event)` |

### Export

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `exportOptions` | `Array<object>` | Auto-generated | Export format options. Each: `{ format, label, icon }` |
| `exportSource` | `string` | `'remote'` | `'remote'` (download from server) or `'local'` (export current data) |

### Filters

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filters` | `Array<object>` | `[]` | Additional filter definitions beyond column filters |
| `hideActivePills` | `boolean` | `false` | Hide the active filter pills bar |
| `hideActivePillNames` | `Array<string>` | `[]` | Specific filter keys to hide from the pills |

### Table Styling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tableOptions.striped` | `boolean` | `true` | Striped rows |
| `tableOptions.bordered` | `boolean` | `false` | Bordered table |
| `tableOptions.hover` | `boolean` | `true` | Hover highlight on rows |
| `tableOptions.responsive` | `boolean` | `false` | Bootstrap responsive wrapper |
| `tableOptions.size` | `string` | `null` | `'sm'` or `'lg'` for Bootstrap table sizes |
| `tableOptions.background` | `string` | `null` | Bootstrap table background variant (e.g., `'dark'`, `'light'`) |
| `tableOptions.fontSize` | `string` | `null` | Font size: `'sm'`, `'xs'`, or any CSS value |

### Inherited from ListView

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fetchOnMount` | `boolean` | `false` | Fetch collection when mounted |
| `defaultQuery` | `object` | `undefined` | Default query params for the collection |
| `collectionParams` | `object` | `undefined` | Parameters merged into the collection |
| `itemClass` | `Class` | `TableRow` | Custom row class (must extend TableRow or ListViewItem) |
| `dayRangeFilter` | `boolean \| object` | `false` | Mounts a `1d / 7d / 30d / 90d` SegmentControl in the toolbar and writes `${field}__gte` to `collection.params` on every change (auto-refetches). `true` → defaults `{ field: 'created', value: '7d' }`. Object form merges over those defaults. Emits `range:change` `{ field, value, previous, params }`. See [Day-range filter](./ListView.md#day-range-filter). |
| `autoRefresh` | `number \| object` | `0` (off) | Silent interval refresh in seconds (5s minimum). Pauses while the tab is hidden/blurred or a selection is active; on TableView it **also** pauses during an inline cell edit or an open row context menu. Object form `{ every, mode, indicator, flash }` selects the mode: `'collection'` (default — full refetch, discovers new rows) or `'models'` (one batched `id__in` request merged into the visible rows in place, with a flash on the rows that changed). See [Auto-refresh](./ListView.md#auto-refresh). |

---

## Column Configuration

Each column is an object with the following properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | *(required)* | Model field name. Supports pipe formatters: `'amount\|currency'` |
| `label` | `string` | Auto from key | Column header label |
| `sortable` | `boolean` | `false` | Whether this column is sortable |
| `visibility` | `string` / `object` | `null` | Responsive visibility (see below) |
| `filter` | `object` | `null` | Filter configuration for this column |
| `footer_total` | `boolean` | `false` | Show sum total in the footer |
| `formatter` | `string` | `null` | DataFormatter name (alternative to pipe in `key`) |
| `align` | `string` | `null` | Cell alignment: `'left'`, `'center'`, or `'right'`. Applied to header, body, and footer cells in lockstep. Defaults to left. |

### Examples

```javascript
columns: [
  // Simple column
  { key: 'name', label: 'Name' },

  // Sortable column
  { key: 'email', label: 'Email', sortable: true },

  // Column with pipe formatter
  { key: 'amount|currency', label: 'Amount' },

  // Column with explicit formatter
  { key: 'created', label: 'Created', formatter: 'date' },

  // Responsive column (hidden on small screens)
  { key: 'phone', label: 'Phone', visibility: 'md' },

  // Column with filter
  { key: 'status', label: 'Status', filter: {
    type: 'select',
    options: ['active', 'inactive', 'pending']
  }},

  // Column with footer total
  { key: 'revenue|currency', label: 'Revenue', footer_total: true },

  // Right-aligned numeric column (header, body, and footer all align right)
  { key: 'quantity', label: 'Qty', align: 'right', footer_total: true }
]
```

---

## Column Visibility (Responsive)

Control when columns appear based on screen size using Bootstrap breakpoints.

### String Format (show at breakpoint and up)

```javascript
{ key: 'email', label: 'Email', visibility: 'md' }
// Hidden on xs and sm, visible on md and up
```

### Object Format (fine-grained control)

```javascript
// Hide at lg and up (show only on small screens)
{ key: 'summary', label: 'Summary', visibility: { hide: 'lg' } }

// Show from md up, hide at xl+ (visible only on md and lg)
{ key: 'details', label: 'Details', visibility: { show: 'md', hide: 'xl' } }
```

Valid breakpoints: `'sm'`, `'md'`, `'lg'`, `'xl'`, `'xxl'`

---

## Cell Alignment

Set `align` on a column to control horizontal alignment. The class is applied to the **header `<th>`**, every **body `<td>`**, and the **footer total cell** in lockstep, so the column reads as a single visual unit:

```javascript
columns: [
  { key: 'name', label: 'Name' },                          // default (left)
  { key: 'status', label: 'Status', align: 'center' },     // centered
  { key: 'total|currency', label: 'Total',
    align: 'right', footer_total: true },                  // right-aligned, sums in footer
]
```

| Value | Result |
|-------|--------|
| `'left'` (or `'start'`) | `text-start` — also the default when `align` is omitted |
| `'center'` | `text-center` |
| `'right'` (or `'end'`) | `text-end` |

**Header sort dropdown follows the alignment.** When `align: 'right'` or `'center'` is set, the inner flex container of the header switches to `justify-content-end` / `justify-content-center` so the label and sort dropdown sit on the correct side rather than always hugging the left.

**Footer cells default to left.** Footer cells without an explicit `align` render left-aligned (matching the body default). Set `align: 'right'` on numeric `footer_total` columns if you want totals right-justified in the column.

---

## Column Formatters

Formatters transform the raw model value for display. You can specify them in two ways:

### Pipe Syntax (in the key)

```javascript
{ key: 'price|currency', label: 'Price' }
{ key: 'created|date', label: 'Created' }
{ key: 'ratio|percent', label: 'Ratio' }
```

### Explicit Formatter Property

```javascript
{ key: 'price', label: 'Price', formatter: 'currency' }
```

Both use the MOJO DataFormatter. See [Templates](../core/Templates.md) for available formatters.

---

## Column Filters

Add a `filter` property to a column to make it filterable. The filter appears in the "Add Filter" dropdown in the toolbar.

```javascript
columns: [
  {
    key: 'status',
    label: 'Status',
    filter: {
      type: 'select',
      label: 'Filter by Status',
      options: ['active', 'inactive', 'pending']
    }
  },
  {
    key: 'created',
    label: 'Created',
    filter: {
      type: 'daterange',
      label: 'Date Range',
      startName: 'dr_start',
      endName: 'dr_end',
      fieldName: 'dr_field'
    }
  },
  {
    key: 'name',
    label: 'Name',
    filter: {
      type: 'text',
      label: 'Filter by Name'
    }
  }
]
```

---

## Footer Totals

Add `footer_total: true` to any numeric column to show a sum in the table footer:

```javascript
columns: [
  { key: 'product', label: 'Product' },
  { key: 'quantity', label: 'Qty', footer_total: true, align: 'right' },
  { key: 'amount|currency', label: 'Amount', footer_total: true, align: 'right' }
]
```

Totals are automatically recalculated when the collection changes (add, remove, reset).

**Alignment.** Footer cells follow the column's [`align`](#cell-alignment) — they default to **left** and you typically want `align: 'right'` on numeric columns so the total lines up under the body values.

---

## Grouped rows

The same `groupBy` / `groupHeaderTemplate` / `groupHeaderLabel` / `groupHeaderStyle` options [documented on ListView](./ListView.md#grouped-rows) work on TableView. The difference is the default header markup: TableView emits a full-width `<tr class="list-group-header-row list-group-header-row--<style>"><th colspan="N" class="list-group-header-cell">{{key}}</th></tr>` so the header sits in the table grid and spans all columns (data cols + selection col + actions col). The `groupHeaderStyle` modifier lands on the `<tr>` outer; CSS in `list-view.css` cascades the style through to the inner `<th>` cell.

```js
const table = new TableView({
  collection: incidentCollection,
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'severity', label: 'Severity' }
  ],
  actions: ['view'],
  groupBy: 'status',
  groupHeaderLabel: (k) => k.toUpperCase()
});
```

If you pass a custom `groupHeaderTemplate` for TableView, write it as cell-only inner content (`<th colspan="N">…</th>`) — the framework provides the `<tr>` outer element automatically. This parallels how `TableRow` consumes inner `<td>` markup while the framework provides the row.

All four built-in grouping helpers (`groupByDay`, `groupByField`, `groupByRecency`, `groupByBoolean`) work identically on TableView — each returns `{ groupBy, groupHeaderLabel }` that spreads directly into the constructor:

```js
import { groupByDay, groupByRecency, groupByField, groupByBoolean } from '@core/views/list/grouping.js';

// Chronological audit log — Today / Yesterday / May 5 …
new TableView({
  collection: auditLogCollection,
  columns: [{ key: 'action' }, { key: 'actor' }, { key: 'created', formatter: 'relative' }],
  ...groupByDay('created')
});

// Recency buckets — Today / Yesterday / This week …
new TableView({
  collection: notificationCollection,
  columns: [{ key: 'title' }, { key: 'created', formatter: 'relative' }],
  ...groupByRecency('created')
});
```

See [ListView — Built-in helpers](./ListView.md#built-in-helpers) for signatures, options, and edge-case details.

---

## Expandable rows

Set `rowExpand: (model) => string | View` to turn on inline detail rows. A
narrow chevron toggle cell becomes the table's **first column**; clicking it
expands a full-width detail row beneath the data row that renders your
author-supplied content for that row's model. It kills the "open a modal to
read one more field" flow for quick-look cases.

```js
const table = new TableView({
  collection: incidentCollection,
  columns: [
    { key: 'priority', label: 'Priority' },
    { key: 'title', label: 'Title' }
  ],
  actions: ['view'],
  rowExpand: (model) => `
    <dl class="detail-grid">
      <dt>Description</dt><dd>${model.get('description')}</dd>
      <dt>Rule</dt><dd><code>${model.get('rule')}</code></dd>
    </dl>
  `
});
```

**String vs View content.** The callback may return:

- **A string** — templated straight into the detail cell (wrap dynamic values
  in your own escaping if they're untrusted).
- **A `View` instance** — mounted via `addChild()` with an explicit
  `render()` (the [Dynamic Children](../core/ViewChildViews.md#dynamic-children)
  pattern, since the detail row is added after the table has already rendered).
  The View is destroyed when its row collapses or the table rebuilds.

```js
// A View payload — receives the row's model.
rowExpand: (model) => new IncidentQuickLookView({ model })
```

**Single vs multiple open.** By default only one row is open at a time —
expanding another collapses the first. Pass `rowExpandMultiple: true` to allow
several open simultaneously.

**State & lifecycle.**

- Expanded state is keyed by model id and survives a **pure re-render** (e.g. a
  selection change), so open rows stay open.
- A **page change** (or any refetch that replaces the rows) collapses
  everything — the detail rows belong to the previous page's models.
- Emits `row:expand:toggle` `{ model, expanded }` on each toggle.

**Layout.** The detail row's `<td>` spans every column — chevron + selection
(when selectable) + data columns + actions. The panel surface uses
`var(--bs-tertiary-bg)` with a primary left accent and renders correctly in
both light and dark themes. When `rowExpand` is **not** set, no chevron column
is emitted and the table markup is byte-identical to before — the feature is
fully opt-in.

---

## Feedback states — rich empty, skeletons, result count

TableView inherits three body-render upgrades from ListView. `emptyState` and
`showResultCount` are opt-in (off by default); `loadingStyle` defaults to the
skeleton shimmer (pass `'spinner'` to opt back). A table that sets none renders
exactly as before apart from the loading visual. See
[ListView → Feedback states](./ListView.md#feedback-states--rich-empty-skeletons-result-count)
for the full contract; the TableView specifics:

| Option | Effect on a table |
|--------|-------------------|
| `emptyState` | Replaces the bare `bi-inbox` + `emptyMessage` block with an icon-chip panel. Auto-branches to a **Clear filters** panel when `getActiveFilters()` is non-empty (search counts). `emptyMessage` stays the fallback when omitted. |
| `loadingStyle` (skeleton by default) | During fetch, renders a `<table>` whose header and cell widths **echo your `columns`** (leading expand/selection cells and a trailing actions cell are mirrored). Row count = `collection.params.size`, capped at 8. This is the **default** loading visual — pass `loadingStyle: 'spinner'` (or the `'default'` alias) to restore the classic spinner. |
| `showResultCount: true` | Renders a *"Showing N of M · filtered"* summary in the filter-pills row (the toolbar is always on for TableView). Reads `collection.meta.count`. |

```javascript
new TableView({
  collection: events,
  columns,
  loadingStyle: 'skeleton',
  showResultCount: true,
  emptyState: {
    icon: 'inbox',
    title: 'No events yet',
    message: 'Events from your integrations will show up here.',
    action: { label: 'Add integration', action: 'add', icon: 'bi-plus-lg' }
  }
});
```

All three use Bootstrap surface tokens (`var(--bs-secondary-bg)` shimmer base,
etc.) and render correctly in light and dark from day one; the skeleton shimmer
is disabled under `prefers-reduced-motion`.

**Forwarding through TablePage.** Pass any of `emptyState`, `loadingStyle`, or
`showResultCount` straight to `TablePage` — it forwards them to the inner
TableView via its option whitelist.

---

## View persistence (`persistState`)

`persistState: true` remembers **how each user likes this table** — sort, page
size, day-range selection, and active filter params — in `localStorage`, and
restores it on the next visit. TablePage's URL sync covers *sharing* a view;
this covers *returning* to one. Strictly opt-in: **no storage is read or
written at all** unless the flag is set.

```javascript
new TableView({
  collection: events,
  columns,
  persistState: true,
  persistKey: 'admin-events'   // optional — see key scheme below
});
```

**What is saved.** A versioned blob `{ v: 1, sort?, size?, dayRange?, filters?,
hidden? }`:

- `sort` / `size` — the active sort string and page size.
- `dayRange` — the day-range **selection** (e.g. `'30d'`), re-seeded to a fresh
  epoch on restore (never the stale `created__gte` value).
- `filters` — the raw `collection.params` set minus `start`/`size`/`sort` and
  the day-range field, so `field__in` collapsed keys and `dr_*` daterange
  triplets round-trip **verbatim** (preset active-state matching depends on it).
  The page `start` (scroll position) is intentionally not persisted.
- `hidden` — hidden column keys, written by the [column chooser](#column-chooser-columnchooser).

**Key scheme.** The storage key is `mojo:tableview:<id>` where `<id>` is the
explicit `persistKey`, or — when omitted — a stable identity of
`<window.location.pathname>::<collection.endpoint>`. Give sibling tables on the
same route distinct `persistKey`s.

**Restore precedence: URL > saved > configured defaults.** On construction the
params already on the collection (for a TablePage, the URL query it applied)
are treated as "the query"; saved state fills only the slots the query didn't
set, so a shared link always wins. Configured defaults (`defaultQuery`,
`collectionParams`) lose to saved state. One deliberate nuance: **page `size`
is treated as a per-user viewing preference** — a saved size is restored even
over a URL-provided size (TablePage always round-trips size through the URL, so
it can't otherwise be distinguished from the paging default). `sort`, filters,
and the day-range strictly honor URL > saved.

**Reset.** Call `clearPersistedState()` to forget this table's saved view (and,
with the chooser on, un-hide every column). The chooser's *Reset to defaults*
entry does the same.

**Schema safety.** The blob is versioned; a corrupt or wrong-version entry is
discarded silently and the table falls back to its configured defaults.

---

## Column chooser (`columnChooser`)

`columnChooser: true` adds an **icon-only "Columns" toolbar dropdown**
(`bi-layout-three-columns`; its text label only shows at `d-xxl`) whose
checkboxes show/hide columns. The wide EventTablePage is the driving case.

```javascript
new TableView({
  collection: events,
  columns: [
    { key: 'id', label: 'ID', hideable: false },       // locked — always shown
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'level', label: 'Level' },
    { key: 'message', label: 'Message' },
    { key: 'ip', label: 'IP Address' }
  ],
  actions: ['view'],
  columnChooser: true,
  persistState: true            // hidden set persists too (see below)
});
```

**Visibility is view-state, never config.** Hiding a column adds its key to an
internal set — the caller's `columns` array is **never mutated**. The header,
body rows, footer totals, the WM-033 skeleton, and colspan math (grouped-row
and expandable-row detail cells) all honor the current visibility.

**Locked columns.** A column with `hideable: false` (e.g. an id or actions
column) renders as a disabled, lock-marked row in the chooser and can never be
hidden.

**Persistence.** When `persistState` is also on, the hidden set is saved under
the same storage entry (as `hidden`) and restored on the next visit; a *"Saved
for this table"* footer appears in the dropdown. With `persistState` off the
chooser is fully functional but purely in-memory (no storage access).

**Reset.** The *Reset to defaults* entry re-shows every column and clears the
saved view. Emits `columns:change { hidden }` on each toggle and `columns:reset`
on reset.

When `columnChooser` is **not** set, no dropdown, styles, or markup are emitted
— the table is byte-identical to before.

**Forwarding through TablePage.** Pass `persistState`, `persistKey`, and
`columnChooser` straight to `TablePage`; it forwards them to the inner
TableView via its option whitelist.

---

## Built-in Actions

The `actions` option defines which action buttons appear in each row:

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],
  actions: ['view', 'edit', 'delete']
});
```

- **`'view'`** — Opens the item in a dialog (uses `itemView` class or falls back to DataView)
- **`'edit'`** — Opens a form dialog using `editForm` fields
- **`'delete'`** — Shows a confirmation dialog, then calls `model.destroy()`

You can also use custom action strings. They will be emitted as events.

---

## Context Menus

Add a per-row dropdown (kebab) menu. `rowContextMenu` is an accepted alias
for `contextMenu` (explicit `contextMenu` wins if both are passed); TablePage
forwards both.

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],
  contextMenu: [
    { action: 'view', label: 'View Details', icon: 'bi bi-eye' },
    { action: 'edit', label: 'Edit', icon: 'bi bi-pencil' },
    { divider: true },
    { action: 'delete', label: 'Delete', icon: 'bi bi-trash', danger: true }
  ]
});
```

### Context Menu Item Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | — | Item label text |
| `icon` | `string` | `''` | Bootstrap icon class |
| `action` | `string \| function` | — | Framework action string (`data-action` dispatch, e.g. `'edit'` → row events), **or** a callback invoked with `(model, app)` |
| `permissions` | `string \| string[]` | `null` | Permission gate via `checkPermissions()` — any-of for arrays, **fail-closed** (hidden when no active user or the user lacks them) |
| `visible` | `function` | `null` | Per-row predicate `visible(model)` — return falsy to hide the item for that row. A throwing predicate hides the item (with a console warning) rather than breaking the row |
| `divider` / `separator` | `boolean` | `false` | Renders a divider line |
| `danger` | `boolean` | `false` | Renders the item in the danger (red) style; `action: 'delete'` is styled danger automatically |
| `disabled` | `boolean` | `false` | Renders the item disabled |

```javascript
rowContextMenu: [
  {
    label: 'Approve Closure',
    icon: 'bi bi-person-check',
    permissions: ['manage_privacy', 'admin', 'sys.manage_groups'],
    visible: (model) => model.get('status') === 'pending',
    action: async (model, app) => {
      await model.save({ status: 'approved' });
      app.toast.success('Closure approved');
    }
  }
]
```

If every actionable item is filtered out for a row (by `permissions` /
`visible`), the kebab toggle is not rendered for that row at all.

---

## Click Action

Control what happens when a user clicks anywhere on a row (outside of action buttons):

```javascript
// Opens view dialog on click (default)
{ clickAction: 'view' }

// Opens edit dialog on click
{ clickAction: 'edit' }
```

Or use a custom handler:

```javascript
{
  onRowClick: (model, event) => {
    router.navigate(`/users/${model.id}`);
  }
}
```

---

## Custom Action Handlers

Override the default behavior for view, edit, and delete:

```javascript
import Modal from '@core/views/feedback/Modal.js';

const table = new TableView({
  collection: userCollection,
  columns: [...],
  actions: ['view', 'edit', 'delete'],

  onItemView: async (model, event) => {
    // Navigate to detail page instead of showing dialog
    app.router.navigate(`/users/${model.id}`);
  },

  onItemEdit: async (model, event) => {
    // Custom edit logic
    const result = await CustomEditor.open(model);
    if (result) await model.save(result);
  },

  onItemDelete: async (model, event) => {
    // Custom delete with extra logic
    if (model.get('role') === 'admin') {
      Modal.showError('Cannot delete admin users');
      return;
    }
    await model.destroy();
  }
});
```

---

## Search

When `searchable` is `true` (the default), a search input appears in the toolbar. Typing sets the `search` parameter on the collection and triggers a fetch.

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],
  searchable: true,
  searchPlaceholder: 'Search users...',
  searchPlacement: 'toolbar' // or 'dropdown'
});
```

Search is debounced — it triggers on input change. Clearing the search field (or clicking the X) removes the `search` parameter and re-fetches.

---

## Add Button

When `showAdd` is `true` (the default), an Add button appears in the toolbar.

### With Form Configuration

If `addForm` is provided, clicking Add opens a form dialog:

```javascript
const table = new TableView({
  collection: userCollection,
  columns: [...],
  showAdd: true,
  addButtonLabel: 'New User',
  addButtonIcon: 'bi bi-person-plus',
  addForm: [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'role', label: 'Role', type: 'select', options: ['user', 'admin'] }
  ]
});
```

On submit, TableView creates a new model instance, calls `model.save(result)`, adds it to the collection, and refreshes.

### With Custom Handler

```javascript
const table = new TableView({
  collection: userCollection,
  columns: [...],
  showAdd: true,
  onAdd: async (event) => {
    // Your custom add logic
    router.navigate('/users/new');
  }
});
```

### Model-Based Form Resolution

If no `addForm` is provided, TableView checks the Model class for static properties:

1. `ModelClass.ADD_FORM`
2. `ModelClass.EDIT_FORM`

---

## Export Button

When `showExport` is `true`, an Export button (or dropdown) appears in the toolbar.

### Default Export Options

By default, two export formats are provided:

- **CSV** — `format: 'csv'`
- **JSON** — `format: 'json'`

### Custom Export Options

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],
  showExport: true,
  exportOptions: [
    { format: 'csv', label: 'Download CSV', icon: 'bi bi-file-earmark-spreadsheet' },
    { format: 'json', label: 'Download JSON', icon: 'bi bi-file-earmark-code' },
    { format: 'xlsx', label: 'Download Excel', icon: 'bi bi-file-earmark-excel' }
  ],
  exportSource: 'remote' // 'remote' downloads from server, 'local' exports current data
});
```

When `exportSource` is `'remote'`, the collection's `download(format)` method is called. When `'local'`, the `onExport` handler is invoked with the current data.

---

## Refresh & Fullscreen

The toolbar always includes a **Refresh** button that calls `this.refresh()` (re-fetches the collection).

If the browser supports the Fullscreen API, a **Fullscreen** toggle button is also shown. This expands the table wrapper to fill the entire screen.

---

## Custom Toolbar Buttons

Add your own buttons to the toolbar:

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],
  toolbarButtons: [
    {
      label: 'Import',
      icon: 'bi bi-upload',
      variant: 'outline-primary',
      title: 'Import Data',
      handler: async function(event, element) {
        // `this` is the TableView instance
        const file = await pickFile();
        await importData(file);
        this.refresh();
      }
    },
    {
      label: 'Print',
      icon: 'bi bi-printer',
      action: 'print', // Uses data-action, requires onActionPrint method
      variant: 'outline-secondary'
    }
  ]
});
```

### Toolbar Button Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | `'Button'` | Button label text |
| `icon` | `string` | `''` | Bootstrap icon class |
| `variant` | `string` | `'outline-secondary'` | Bootstrap button variant |
| `title` | `string` | Same as label | Button tooltip |
| `handler` | `function` | `null` | Click handler (called with `this` as TableView) |
| `action` | `string` | `''` | If no handler, sets `data-action` for event delegation |
| `className` | `string` | `''` | Additional CSS classes |
| `permissions` | `string \| string[]` | `null` | Permission gate via `checkPermissions()` — delegates to `app.activeUser.hasPermission()` (any-of for arrays) and is **fail-closed**: the button is hidden when there is no active user or the user lacks the permission |

---

## Additional Filters

Beyond column-based filters, you can define standalone filters:

```javascript
const table = new TableView({
  collection: orderCollection,
  columns: [...],
  filters: [
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      options: ['low', 'medium', 'high', 'critical']
    },
    {
      name: 'assigned_to',
      label: 'Assigned To',
      type: 'text'
    },
    {
      name: 'due_date',
      label: 'Due Date',
      type: 'daterange',
      startName: 'dr_start',
      endName: 'dr_end',
      fieldName: 'dr_field'
    }
  ]
});
```

---

## Filter Types

| Type | Description |
|------|-------------|
| `'text'` | Free text input |
| `'select'` | Dropdown select with predefined options |
| `'multiselect'` | Multi-value dropdown — emits `field__in=a,b,c` (or plain `field=a` for a single value) |
| `'date'` | Date picker |
| `'daterange'` | Date range picker (start and end) |
| `'number'` | Numeric input |
| `'boolean'` *(also `'switch'`, `'toggle'`)* | Two-option select rendered as `True` / `False`. Caller can override the labels with `trueLabel` / `falseLabel` (e.g. `{ trueLabel: 'Active', falseLabel: 'Disabled' }`). Honors `defaultValue` when opening the Add Filter dialog fresh — `{ defaultValue: true }` pre-selects True. The wire format is the string `'true'` / `'false'` so it round-trips cleanly through `?is_active=true` URL params. |

---

## Active Filter Pills

When filters are active, pills appear below the toolbar showing each active filter with its value. Users can click a pill to edit the filter or click the × to remove it. A "Clear All" button appears when multiple filters are active.

Control pill visibility:

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],

  // Hide all pills
  hideActivePills: true,

  // Or hide specific filter pills
  hideActivePillNames: ['internal_filter', 'group']
});
```

---

## Programmatic Filtering

### Set a Filter

```javascript
// Set a simple filter
table.setFilter('status', 'active');

// Set an array filter (uses __in lookup for multiple values)
table.setFilter('role', ['admin', 'editor']);

// Set a daterange filter
table.setFilter('created', { start: '2024-01-01', end: '2024-12-31' });

// Clear a filter
table.setFilter('status', null);
```

### Get Active Filters

```javascript
const filters = table.getActiveFilters();
// { status: 'active', role__in: 'admin,editor', search: 'john' }
```

### Get All Available Filters

```javascript
const allFilters = table.getAllAvailableFilters();
// [{ key: 'status', label: 'Status', type: 'select', config: {...} }, ...]
```

### Apply Filters (fetch with current params)

```javascript
await table.applyFilters();
```

---

## Sortable Columns

Mark columns as sortable and they'll get sort direction dropdowns in the header:

```javascript
columns: [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'created', label: 'Created', sortable: true },
  { key: 'email', label: 'Email' } // Not sortable
]
```

Clicking a sort dropdown option sets the `sort` parameter on the collection (e.g., `sort=name` or `sort=-name` for descending) and triggers a fetch.

---

## Default Sort

Set an initial sort via collection params:

```javascript
const table = new TableView({
  collection: new UserCollection(),
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'created', label: 'Created', sortable: true }
  ],
  collectionParams: {
    sort: '-created' // Descending by created date
  }
});
```

The sort icon and dropdown state will reflect the current sort.

---

## Server-Side Pagination

TableView uses `start` and `size` parameters for offset-based pagination. The collection's `meta.count` provides the total record count.

```javascript
const table = new TableView({
  collection: new UserCollection(), // endpoint returns { data: [...], count: 100, start: 0, size: 10 }
  columns: [...],
  paginated: true
});
```

Pagination controls include:
- **Previous / Next** buttons (wrap around)
- **Page numbers** with ellipsis for large sets
- **Page size selector** (5, 10, 25, 50, 100)
- **Status text**: "Showing 1 to 10 of 247 entries"

---

## Page Size

The page size selector defaults to options of 5, 10, 25, 50, and 100. The current page size is set from `collection.params.size`.

Changing the page size resets to the first page and re-fetches.

---

## Disabling Pagination

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],
  paginated: false
});
```

---

## Configuring Batch Actions

Batch actions require `selectionMode: 'multiple'` (or `selectable: true`) and a `batchActions` array:

```javascript
const table = new TableView({
  collection: userCollection,
  columns: [...],
  selectionMode: 'multiple',
  batchActions: [
    { action: 'delete', label: 'Delete Selected', icon: 'bi bi-trash', variant: 'danger' },
    { action: 'archive', label: 'Archive Selected', icon: 'bi bi-archive' },
    { action: 'export', label: 'Export Selected', icon: 'bi bi-download' }
  ]
});

table.on('batch:action', async ({ action, items, event }) => {
  console.log(`${action} on ${items.length} items`);

  if (action === 'delete') {
    for (const { model } of items) {
      await model.destroy();
    }
    table.clearSelection();
    await table.refresh();
  }
});
```

When items are selected, a batch actions panel appears showing the count and action buttons. A "Select All" checkbox appears in the header row.

---

## Batch Bar Location

```javascript
// Show batch actions above the table
{ batchBarLocation: 'top' }

// Show batch actions below the table (default)
{ batchBarLocation: 'bottom' }
```

---

## Handling Batch Events

```javascript
table.on('batch:action', ({ action, items, event }) => {
  // action: the string from batchActions[].action
  // items: array of { view, model, data }
  // event: the DOM event
});
```

If your table lives inside a **TablePage subclass**, use [`TablePage.batchAction()`](./TablePage.md#batchaction-options) instead of writing the loop by hand — it handles loading state, toast feedback, per-item execution, `clearSelection()`, and `refresh()` for you.

---

## Add Form

The `addForm` option defines form fields for the Add dialog:

```javascript
const table = new TableView({
  collection: userCollection,
  columns: [...],
  showAdd: true,
  addForm: [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'role', label: 'Role', type: 'select', options: ['user', 'admin'] },
    { name: 'bio', label: 'Bio', type: 'textarea' }
  ]
});
```

You can also provide it as an object with a `title` and `fields`:

```javascript
addForm: {
  title: 'Create New User',
  fields: [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true }
  ]
}
```

---

## Edit Form

The `editForm` option defines form fields for the Edit dialog:

```javascript
editForm: [
  { name: 'name', label: 'Full Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'role', label: 'Role', type: 'select', options: ['user', 'admin'] }
]
```

If `editForm` is not provided, TableView falls back to `addForm`. The model instance is automatically bound, so form fields are pre-populated with the current values.

---

## Delete Confirmation

By default, delete shows a confirmation dialog with the model name and ID. You can customize the message with a Mustache template:

```javascript
const table = new TableView({
  collection: userCollection,
  columns: [...],
  actions: ['delete'],
  deleteTemplate: 'Are you sure you want to delete <strong>{{name}}</strong> ({{email}})?'
});
```

The template is rendered with the model as context.

---

## Item View Dialog

Provide a custom View class for the row view dialog:

```javascript
import UserDetailView from './UserDetailView.js';

const table = new TableView({
  collection: userCollection,
  columns: [...],
  actions: ['view'],
  itemView: UserDetailView,
  viewDialogOptions: {
    size: 'lg',
    centered: false
  }
});
```

If no `itemView` is set, TableView checks `ModelClass.VIEW_CLASS`, and falls back to a generic DataView dialog.

### Sizing the dialog from the View class

A detail View usually knows how big its own modal should be — a dense
multi-section inspector wants `'xl'` or `'fullscreen'`, a compact card is
fine at the default `'lg'`. Declare that **once** on the View class with a
static `DIALOG_OPTIONS`, instead of repeating `viewDialogOptions` in every
page that opens it:

```javascript
class UserView extends DetailView { /* … */ }

// Spread onto Modal.dialog() every time this View is opened as a
// row-view dialog (by TableView, ListView, or TablePage deep-links).
UserView.DIALOG_OPTIONS = { size: 'fullscreen' };
```

`DIALOG_OPTIONS` accepts any `Modal.dialog()` option (`size`, `centered`,
`scrollable`, `noBodyPadding`, …). Supported sizes: `'sm'`, `'lg'`,
`'xl'`, `'xxl'`, `'fullscreen'` (and the `fullscreen-*-down` variants).

**Precedence** (later wins): built-in defaults (`size: 'lg'`) →
`ModelClass.FORM_DIALOG_CONFIG` → `ViewClass.DIALOG_OPTIONS` →
page/instance `viewDialogOptions`. So a page can still override the
View's preferred size when it genuinely needs to.

By default, `fetchOnView: true` causes TableView to call `model.fetch()` before opening the dialog, so the detail view always has the latest server data. Set `fetchOnView: false` to skip the fetch and use the model data already in the table row:

```javascript
const table = new TableView({
  collection: userCollection,
  columns: [...],
  actions: ['view'],
  itemView: UserDetailView,
  fetchOnView: false  // use row data as-is
});
```

The fetch is skipped when a custom `onItemView` handler is provided — the handler owns the entire flow.

---

## Form Dialog Config

Extra options passed to all form dialogs (add and edit):

```javascript
formDialogConfig: {
  size: 'lg',
  centered: true
}
```

These are also merged with `ModelClass.FORM_DIALOG_CONFIG` if defined.

---

## Table Styling

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],
  tableOptions: {
    striped: true,       // Striped rows (default: true)
    bordered: true,      // Bordered table (default: false)
    hover: true,         // Row hover highlight (default: true)
    responsive: true,    // Bootstrap responsive wrapper (default: false)
    size: 'sm',          // 'sm' or 'lg' (default: null)
    background: 'dark',  // Bootstrap table background variant (default: null)
    fontSize: 'sm'       // 'sm', 'xs', or CSS value (default: null)
  }
});
```

---

## Methods

### refresh()

Re-fetch the collection (if REST-enabled) or rebuild items.

```javascript
await table.refresh();
```

---

### setFilter(key, value)

Set a filter value on the collection.

```javascript
table.setFilter('status', 'active');
table.setFilter('role', ['admin', 'editor']); // Uses __in lookup
table.setFilter('status', null); // Clear filter
```

---

### getActiveFilters()

Get all currently active filters (excluding pagination/sort params).

```javascript
const filters = table.getActiveFilters();
```

---

### getAllAvailableFilters()

Get all filter definitions (from columns and additional filters).

```javascript
const filters = table.getAllAvailableFilters();
```

---

### getSelectedItems()

Get all selected items (inherited from ListView).

```javascript
const items = table.getSelectedItems();
// [{ view, model, data }, ...]
```

---

### clearSelection()

Deselect all items and update the batch actions panel.

```javascript
table.clearSelection();
```

---

### selectItem(modelId) / deselectItem(modelId)

Programmatically select or deselect a row.

```javascript
table.selectItem(42);
table.deselectItem(42);
```

---

### forEachItem(callback, thisArg)

Iterate over all row views (inherited from ListView).

```javascript
table.forEachItem((rowView, model, index) => {
  console.log(model.get('name'));
});
```

---

### updateFilterPills()

Manually refresh the active filter pills display.

```javascript
table.updateFilterPills();
```

---

### updateSortIcons()

Manually refresh the sort icons to match current sort state.

```javascript
table.updateSortIcons();
```

---

### enterFullscreen() / exitFullscreen()

Toggle fullscreen mode programmatically.

```javascript
await table.enterFullscreen();
await table.exitFullscreen();
```

---

### destroy()

Clean up fullscreen listeners and call parent destroy.

```javascript
await table.destroy();
```

---

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `collection` | `Collection` | The bound collection |
| `columns` | `Array` | Column definitions |
| `actions` | `Array` | Row action definitions |
| `filters` | `object` | Column-based filter configurations |
| `additionalFilters` | `Array` | Extra filter definitions |
| `itemViews` | `Map` | Map of model.id → TableRow instances |
| `selectedItems` | `Set` | Set of selected model IDs |
| `loading` | `boolean` | Whether collection is fetching |
| `isEmpty` | `boolean` | Whether collection is empty |
| `isFullscreen` | `boolean` | Whether fullscreen mode is active |
| `hasFooterTotals` | `boolean` | Whether any column has footer totals |
| `searchPlaceholder` | `string` | Current search placeholder text |
| `toolbarButtons` | `Array` | Custom toolbar button definitions |

---

## Events

TableView emits the following events (in addition to ListView events):

### Row Events

| Event | Payload | Description |
|-------|---------|-------------|
| `row:click` | `{ model, event }` | A row is clicked |
| `row:view` | `{ model, event }` | View action triggered on a row |
| `row:edit` | `{ model, event }` | Edit action triggered on a row |
| `row:delete` | `{ model, event }` | Delete action triggered on a row |

### Table Events

| Event | Payload | Description |
|-------|---------|-------------|
| `table:add` | `{ event }` | Add button clicked |
| `table:export` | `{ format, source, event }` | Export triggered |
| `table:search` | `{ searchTerm }` | Search applied |
| `table:sort` | `{ field, event }` | Sort changed |
| `table:page` | `{ page, event }` | Page changed |
| `table:pagesize` | `{ size, event }` | Page size changed |
| `params-changed` | — | Any collection parameter changed (sort, page, filter, search) |

### Batch Events

| Event | Payload | Description |
|-------|---------|-------------|
| `batch:action` | `{ action, items, event }` | A batch action button clicked |

### Cell Events

| Event | Payload | Description |
|-------|---------|-------------|
| `cell:edit` | `{ model, field, value }` | Inline cell editing started |
| `cell:save` | `{ model, field, value }` | Inline cell edit saved |
| `cell:cancel` | `{ model, field }` | Inline cell edit cancelled |

### Filter Events

| Event | Payload | Description |
|-------|---------|-------------|
| `filter:edit` | `{ key }` | A filter is being edited |

### Inherited from ListView

| Event | Payload | Description |
|-------|---------|-------------|
| `selection:change` | `{ selected, item, model }` | Selection state changed |
| `list:empty` | — | Collection became empty |
| `list:loaded` | `{ count }` | Collection loaded items |
| `range:change` | `{ field, value, previous, params }` | Day-range picker value changed (only when `dayRangeFilter` is set) |

---

## Row Stripe (severity-coded)

TableView inherits ListView's `rowStripe:` primitive — a per-row callback that paints a 4px theme-aware left-edge stripe based on a Bootstrap variant token. See [ListView.md → Row stripe](./ListView.md#row-stripe-severity-coded-left-edge-color) for the full API.

```javascript
new TableView({
  collection,
  columns: [...],
  rowStripe: (model) => {
    const level = model.get('level');
    if (level >= 5) return 'danger';
    if (level >= 4) return 'warning';
    return null;
  }
});
```

The consumer-facing API is identical to ListView. The CSS path differs internally: TableView paints the stripe via `box-shadow: inset 4px 0 0 var(--bs-<token>)` on `td:first-child` (because `border-left` on a `<tr>` doesn't render reliably under Bootstrap's `border-collapse: separate`). When `selectable: true`, the checkbox `<td>` is the first child — the stripe lands on it (intended leftmost-edge placement).

Forwarded by TablePage — pass `rowStripe:` at the page level.

---

## Custom TableRow Subclass

For custom row rendering, extend `TableRow`:

```javascript
import TableRow from '@core/views/table/TableRow.js';

class UserRow extends TableRow {
  constructor(options = {}) {
    super(options);
    // TableRow auto-generates the template from columns,
    // but you can override it if needed
  }

  // Add custom behavior
  async onActionCustom(event, element) {
    console.log('Custom action on:', this.model.get('name'));
  }
}

const table = new TableView({
  collection: userCollection,
  columns: [...],
  itemClass: UserRow
});
```

`TableRow` extends `ListViewItem` and automatically builds its row template from the column definitions, including action buttons and selection checkboxes.

---

## Fullscreen Mode

TableView supports browser fullscreen mode if the Fullscreen API is available:

```javascript
// Programmatic
await table.enterFullscreen();
await table.exitFullscreen();

// The toolbar button handles this automatically
// User can also press Escape to exit
```

Fullscreen listeners are automatically cleaned up on destroy.

---

## Using with TablePage

[TablePage](./TablePage.md) wraps TableView in a Page with automatic URL parameter synchronization:

```javascript
import TablePage from '@core/pages/TablePage.js';

const usersPage = new TablePage({
  pageName: 'users',
  title: 'User Management',
  Collection: UserCollection,
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' }
  ],
  actions: ['view', 'edit', 'delete']
});
```

TablePage handles:
- Syncing sort, pagination, search, and filters to the URL
- Restoring state from URL on page entry
- Collection creation and lifecycle

---

## Using as a Child View

Use TableView inside any View or Page:

```javascript
import View from '@core/View.js';
import TableView from '@core/views/table/TableView.js';

class DashboardView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="dashboard">
          <h3>Recent Orders</h3>
          <div data-container="orders-table"></div>
        </div>
      `,
      ...options
    });
  }

  async onInit() {
    await super.onInit();

    this.ordersTable = new TableView({
      collection: new OrderCollection(),
      containerId: 'orders-table',
      columns: [
        { key: 'id', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'total|currency', label: 'Total' },
        { key: 'status', label: 'Status' }
      ],
      actions: ['view'],
      showAdd: false,
      showExport: false
    });

    this.addChild(this.ordersTable);
  }
}
```

---

## Performance Tips

1. **Use responsive visibility** — Hide non-essential columns on small screens to reduce DOM nodes.

2. **Per-row rendering** — TableView inherits ListView's efficient per-row updates. Only changed rows re-render.

3. **Server-side pagination** — Let the server handle large datasets. TableView sends `start`, `size`, `sort`, and filter parameters.

4. **Avoid unnecessary refreshes** — Use `setFilter()` to batch filter changes before calling `collection.fetch()`.

5. **Use `fontSize: 'sm'` or `'xs'`** — For dense data tables with many rows visible.

---

## Common Issues

### Table doesn't render any rows

- Ensure the collection has data. Check that `fetchOnMount` is true or the collection is pre-fetched.
- Verify `columns` are defined with valid `key` properties matching your model fields.
- Check the browser console for errors.

### Sorting doesn't work

- Ensure `sortable: true` is set on the column.
- For REST collections, the server must support the `sort` parameter (e.g., `sort=name` or `sort=-name`).

### Filters don't apply

- Ensure `filterable: true` (the default).
- Check that column `filter` objects have a valid `type`.
- For REST collections, verify the server recognizes the filter parameter names.

### Pagination shows wrong counts

- The collection's response must include `count` in its metadata. TableView reads `collection.meta.count`.
- Ensure the server returns the total record count, not just the page count.

### Actions column doesn't appear

- Ensure `actions` is set to an array of action strings (e.g., `['view', 'edit', 'delete']`).

### Batch actions panel doesn't show

- Ensure `selectionMode` is `'multiple'` and `batchActions` is a non-empty array.

---

## Related Documentation

- **[ListView](./ListView.md)** — Parent class that TableView extends
- **[TablePage](./TablePage.md)** — Page wrapper with URL synchronization
- **[View](../core/View.md)** — Base View class
- **[Collection](../core/Collection.md)** — Data source for the table
- **[Model](../core/Model.md)** — Individual row data
- **[Templates](../core/Templates.md)** — Mustache syntax and formatters
- **[Events](../core/Events.md)** — Event system and delegation

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste references in the examples portal:

- [`examples/portal/examples/components/TableView/TableViewExample.js`](../../../examples/portal/examples/components/TableView/TableViewExample.js) — Sortable, filterable, paginated table over ~25 seeded user rows.
- [`examples/portal/examples/components/TableView/TableViewBatchActionsExample.js`](../../../examples/portal/examples/components/TableView/TableViewBatchActionsExample.js) — Multi-select rows + bulk actions wired to the in-memory Collection.
- [`examples/portal/examples/components/TableView/TableViewCustomRowExample.js`](../../../examples/portal/examples/components/TableView/TableViewCustomRowExample.js) — Custom itemClass (TableRow subclass) with avatar, badges, and expand-on-click.
- [`examples/portal/examples/components/TableView/TableViewServerExample.js`](../../../examples/portal/examples/components/TableView/TableViewServerExample.js) — Bound to UserList against the live backend, with fetch:error handling.

<!-- examples:cross-link end -->
