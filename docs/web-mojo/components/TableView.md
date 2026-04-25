# TableView

**Advanced data table component with sorting, filtering, pagination, and row actions**

TableView extends [ListView](./ListView.md) to render collections as full-featured data tables. Each row is a separate `TableRow` view backed by its own model, providing efficient per-row re-rendering. It includes a toolbar with search, filters, export, and add buttons; column sorting; server-side pagination; row and batch actions; responsive column visibility; inline editing; fullscreen mode; and footer totals.

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
- [Column Formatters](#column-formatters)
- [Column Filters](#column-filters)
- [Footer Totals](#footer-totals)

### Row Actions
- [Built-in Actions](#built-in-actions)
- [Context Menus](#context-menus)
- [Click Action](#click-action)
- [Custom Action Handlers](#custom-action-handlers)

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
| `contextMenu` | `Array<object>` | `null` | Context menu items for right-click on rows |
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

### Forms & Dialogs

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `addForm` | `Array<object>` | `null` | Form field config for the Add dialog |
| `editForm` | `Array<object>` | `null` | Form field config for the Edit dialog |
| `deleteTemplate` | `string` | `null` | Mustache template for delete confirmation message |
| `itemView` | `Class` | `null` | Custom View class for the row-view dialog |
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
  { key: 'revenue|currency', label: 'Revenue', footer_total: true }
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
  { key: 'quantity', label: 'Qty', footer_total: true },
  { key: 'amount|currency', label: 'Amount', footer_total: true }
]
```

Totals are automatically recalculated when the collection changes (add, remove, reset).

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

Add a right-click context menu to rows:

```javascript
const table = new TableView({
  collection: myCollection,
  columns: [...],
  contextMenu: [
    { action: 'view', label: 'View Details', icon: 'bi bi-eye' },
    { action: 'edit', label: 'Edit', icon: 'bi bi-pencil' },
    { divider: true },
    { action: 'delete', label: 'Delete', icon: 'bi bi-trash', variant: 'danger' }
  ]
});
```

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
      Dialog.showError('Cannot delete admin users');
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
| `permissions` | `any` | `null` | Permission check (if provided, `checkPermissions()` is called) |

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
| `'date'` | Date picker |
| `'daterange'` | Date range picker (start and end) |
| `'number'` | Numeric input |
| `'boolean'` | True/false toggle |

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

- [`examples/portal/examples/components/TableView/TableViewExample.js`](../../../examples/portal/examples/components/TableView/TableViewExample.js) — Sortable, filterable, paginated table bound to a Collection.
- [`examples/portal/examples/components/TableView/TableViewBatchActionsExample.js`](../../../examples/portal/examples/components/TableView/TableViewBatchActionsExample.js) — Multi-select rows + bulk action toolbar.

<!-- examples:cross-link end -->
