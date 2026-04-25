# TablePage

**Page component that manages a TableView with automatic URL parameter synchronization**

TablePage wraps [TableView](./TableView.md) inside a [Page](../core/View.md), automatically syncing pagination, sorting, searching, and filtering state with the browser URL. When users navigate to a TablePage, query parameters in the URL are applied to the collection; when users interact with the table, the URL is updated to reflect the current state. This makes table state bookmarkable, shareable, and browser-back-button friendly.

---

## Table of Contents

### Overview
- [What is a TablePage?](#what-is-a-tablepage)
- [Key Features](#key-features)
- [When to Use TablePage](#when-to-use-tablepage)

### Quick Start
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Complete Example](#complete-example)

### Configuration
- [Constructor Options](#constructor-options)
- [Page Options](#page-options)
- [TableView Options](#tableview-options)
- [URL Synchronization Options](#url-synchronization-options)

### URL Synchronization
- [How URL Sync Works](#how-url-sync-works)
- [Supported URL Parameters](#supported-url-parameters)
- [Restoring State from URL](#restoring-state-from-url)
- [Disabling URL Sync](#disabling-url-sync)

### Collection Setup
- [Passing a Collection Instance](#passing-a-collection-instance)
- [Passing a Collection Class](#passing-a-collection-class)
- [Default Query Parameters](#default-query-parameters)

### Event Handling
- [Row Events](#row-events)
- [Table Events](#table-events)
- [Filter Events](#filter-events)
- [Custom Handlers](#custom-handlers)

### API Reference
- [Methods](#methods)
- [Properties](#properties)
- [Lifecycle Hooks](#lifecycle-hooks)

### Advanced Usage
- [Custom Page Template](#custom-page-template)
- [Group-Based Filtering](#group-based-filtering)
- [Status Display](#status-display)
- [Programmatic Control](#programmatic-control)

### Integration
- [With App Router](#with-app-router)
- [With Active Groups](#with-active-groups)

### Best Practices
- [Best Practices](#best-practices)

### Troubleshooting
- [Common Issues](#common-issues)

### Related Documentation
- [Related Documentation](#related-documentation)

---

## What is a TablePage?

A **TablePage** is a Page that:

1. Creates and manages a [Collection](../core/Collection.md)
2. Creates a [TableView](./TableView.md) with full configuration
3. Syncs the table's state (pagination, sort, search, filters) with browser URL query parameters
4. Restores state from the URL when the page is entered
5. Updates the URL when the user interacts with the table

This means a URL like `/users?sort=-created&search=alice&role=admin&start=20&size=10` will load the users page sorted by created date descending, filtered by role "admin", searching for "alice", showing page 3 at 10 items per page.

---

## Key Features

- **URL Synchronization** — Table state is reflected in the URL, making it bookmarkable and shareable
- **Full TableView Passthrough** — All TableView options (columns, actions, forms, filters, etc.) are supported
- **Automatic Collection Setup** — Pass a Collection class or instance; TablePage handles initialization
- **Default Query Parameters** — Set baseline query params that are always applied
- **Page Lifecycle Integration** — Uses MOJO's Page lifecycle (`onEnter`, `onInit`, `onBeforeDestroy`)
- **Group Support** — Optional filtering by active group (for multi-tenant apps)
- **Status Display** — Optional last-updated time and total record count bar
- **Static Factory Method** — `TablePage.create(options)` for concise instantiation

---

## When to Use TablePage

Use TablePage when you need:

- A **full-page table** with its own route in your app
- **URL-synced state** so users can bookmark, share, or use browser back/forward
- A **quick setup** — pass your Collection, columns, and actions and get a complete page

If you need a table **embedded inside another view** (not as a top-level page), use [TableView](./TableView.md) directly instead.

---

## Installation

TablePage is part of the web-mojo core:

```javascript
import TablePage from '@core/pages/TablePage.js';
```

---

## Basic Usage

```javascript
import TablePage from '@core/pages/TablePage.js';
import UserCollection from '@collections/UserCollection.js';

const usersPage = new TablePage({
  pageName: 'users',
  title: 'Users',
  Collection: UserCollection,
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role' }
  ],
  actions: ['view', 'edit', 'delete']
});
```

Register it with your app's router, and navigating to `/users` will render a full-featured data table with automatic URL synchronization.

---

## Complete Example

```javascript
import TablePage from '@core/pages/TablePage.js';
import OrderCollection from '@collections/OrderCollection.js';

const ordersPage = new TablePage({
  // Page settings
  pageName: 'orders',
  title: 'Order Management',
  description: 'Manage customer orders',

  // Collection
  Collection: OrderCollection,
  defaultQuery: { status: 'active' },

  // Columns
  columns: [
    { key: 'id', label: 'Order #', sortable: true },
    { key: 'customer_name', label: 'Customer', sortable: true },
    { key: 'total|currency', label: 'Total', sortable: true, footer_total: true },
    { key: 'status', label: 'Status', filter: {
      type: 'select',
      options: ['active', 'pending', 'shipped', 'delivered', 'cancelled']
    }},
    { key: 'created|date', label: 'Created', sortable: true, visibility: 'lg' }
  ],

  // Row actions
  actions: ['view', 'edit', 'delete'],
  clickAction: 'view',

  // Forms
  addForm: [
    { name: 'customer_name', label: 'Customer', type: 'text', required: true },
    { name: 'total', label: 'Total', type: 'number', required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'pending'] }
  ],
  editForm: [
    { name: 'customer_name', label: 'Customer', type: 'text', required: true },
    { name: 'total', label: 'Total', type: 'number', required: true },
    { name: 'status', label: 'Status', type: 'select',
      options: ['active', 'pending', 'shipped', 'delivered', 'cancelled'] }
  ],

  // Features
  searchable: true,
  sortable: true,
  filterable: true,
  paginated: true,
  showAdd: true,
  showExport: true,

  // Selection and batch actions
  selectionMode: 'multiple',
  batchActions: [
    { action: 'ship', label: 'Mark as Shipped', icon: 'bi bi-truck' },
    { action: 'delete', label: 'Delete Selected', icon: 'bi bi-trash', variant: 'danger' }
  ],

  // Additional filters (beyond column filters)
  filters: [
    {
      name: 'date_range',
      label: 'Date Range',
      type: 'daterange',
      startName: 'dr_start',
      endName: 'dr_end',
      fieldName: 'dr_field'
    }
  ],

  // Table styling
  tableOptions: {
    striped: true,
    hover: true,
    size: 'sm'
  },

  // URL sync
  urlSyncEnabled: true
});
```

---

## Constructor Options

### Page Options

These options configure the page itself:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pageName` | `string` | `'table'` | Unique name for the page (used in routing). Also accepts `name` |
| `title` | `string` | Same as pageName | Page title |
| `description` | `string` | `''` | Page description |
| `template` | `string` | *(built-in)* | Override the page's outer template |
| `showStatus` | `boolean` | `false` | Show a status bar with last-updated time and record count |
| `urlSyncEnabled` | `boolean` | `true` | Enable URL parameter synchronization |

### Collection Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `Collection` | `Class` | `null` | Collection class to instantiate |
| `collection` | `Collection` | `null` | Pre-created Collection instance |
| `defaultQuery` | `object` | `{}` | Default query parameters always applied to the collection |

If both `Collection` and `collection` are provided, `collection` takes precedence.

### Group Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `groupField` | `string` | `'group'` | The parameter name used for group-based filtering |
| `requiresGroup` | `boolean` | `false` | Whether the page requires an active group to be set |

### TableView Options

All [TableView constructor options](./TableView.md#constructor-options) are passed through. The most common ones:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `Array<object>` | `[]` | Column definitions |
| `actions` | `Array<string>` | `null` | Row actions (`'view'`, `'edit'`, `'delete'`) |
| `contextMenu` | `Array<object>` | `null` | Row context menu items |
| `batchActions` | `Array<object>` | `null` | Batch action definitions |
| `batchBarLocation` | `string` | `'top'` | Batch bar position: `'top'` or `'bottom'` |
| `clickAction` | `string` | `'view'` | Row click behavior: `'view'` or `'edit'` |
| `addForm` | `Array<object>` | `null` | Form fields for Add dialog |
| `editForm` | `Array<object>` | `null` | Form fields for Edit dialog |
| `deleteTemplate` | `string` | `null` | Mustache template for delete confirmation |
| `itemView` | `Class` | `null` | Custom View class for row view dialog |
| `formDialogConfig` | `object` | `{}` | Extra options for form dialogs |
| `viewDialogOptions` | `object` | `{}` | Extra options for view dialog |
| `searchable` | `boolean` | `true` | Show search input |
| `sortable` | `boolean` | `true` | Enable column sorting |
| `filterable` | `boolean` | `true` | Enable filter dropdown |
| `paginated` | `boolean` | `true` | Show pagination |
| `selectionMode` | `string` | `'none'` | `'none'`, `'single'`, or `'multiple'` |
| `filters` | `Array<object>` | `[]` | Additional filter definitions |
| `hideActivePills` | `boolean` | `false` | Hide active filter pills |
| `hideActivePillNames` | `Array<string>` | `[]` | Filter keys to hide from pills |
| `searchPlacement` | `string` | `'toolbar'` | `'toolbar'` or `'dropdown'` |
| `tableOptions` | `object` | `{ striped: true, bordered: false, hover: true, responsive: false }` | Table HTML element styling |
| `emptyMessage` | `string` | `'No data available'` | Message when table is empty |
| `searchPlaceholder` | `string` | `'Search...'` | Search input placeholder |
| `showAdd` | `boolean` | `true` | Show Add button |
| `showExport` | `boolean` | `true` | Show Export button |

### Custom Handler Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onItemView` | `function` | `null` | Custom handler for row view. Receives `(model, event)` |
| `onItemEdit` | `function` | `null` | Custom handler for row edit. Receives `(model, event)` |
| `onItemDelete` | `function` | `null` | Custom handler for row delete. Receives `(model, event)` |
| `onAdd` | `function` | `null` | Custom handler for Add button. Receives `(event)` |
| `onExport` | `function` | `null` | Custom handler for export. Receives `(data, format)` |

### TableView Override

For full control, you can pass a `tableViewOptions` object that is spread last into the TableView config, overriding any other option:

```javascript
const page = new TablePage({
  pageName: 'users',
  Collection: UserCollection,
  columns: [...],
  tableViewOptions: {
    // These override anything else
    emptyMessage: 'Custom empty message',
    searchPlaceholder: 'Find users...'
  }
});
```

---

## URL Synchronization

### How URL Sync Works

TablePage listens for `params-changed` events from the TableView. When the user sorts, filters, searches, or paginates, the collection parameters are serialized into URL query parameters.

**Flow:**

1. User clicks sort on "Name" column
2. TableView sets `sort=name` on the collection and fetches
3. TableView emits `params-changed`
4. TablePage captures this and calls `syncUrl()`
5. The browser URL updates to `/users?sort=name`

When the page is entered (via router navigation or direct URL):

1. TablePage reads `this.query` (URL query parameters from the router)
2. Merges with `defaultQuery`
3. Applies all parameters to the collection
4. TableView fetches and renders with those parameters

### Supported URL Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `start` | Pagination offset | `?start=20` |
| `size` | Page size | `?size=25` |
| `sort` | Sort field (prefix `-` for descending) | `?sort=-created` |
| `search` | Search term | `?search=alice` |
| *any other* | Treated as filters | `?role=admin&status=active` |

Complex filter values (objects, arrays) are JSON-stringified in the URL.

### Restoring State from URL

When a user navigates to `/orders?sort=-total&status=shipped&start=10&size=25`:

```
start=10     →  collection.params.start = 10
size=25      →  collection.params.size = 25
sort=-total  →  collection.params.sort = '-total'
status=shipped → collection.params.status = 'shipped'
```

The table renders showing page 2 (offset 10, size 25), sorted by total descending, filtered to shipped orders.

### Disabling URL Sync

```javascript
const page = new TablePage({
  pageName: 'users',
  Collection: UserCollection,
  columns: [...],
  urlSyncEnabled: false
});
```

When disabled, table interactions still work normally, but the URL won't change and URL parameters won't be read on page entry.

---

## Passing a Collection Instance

```javascript
const userCollection = new UserCollection();
userCollection.setParams({ role: 'admin' });

const page = new TablePage({
  pageName: 'users',
  collection: userCollection, // Pre-created instance
  columns: [...]
});
```

---

## Passing a Collection Class

```javascript
const page = new TablePage({
  pageName: 'users',
  Collection: UserCollection, // Class — TablePage will create the instance
  columns: [...]
});
```

If neither `collection` nor `Collection` is provided, a generic `Collection` is created.

---

## Default Query Parameters

Set baseline parameters that are always applied when the page loads:

```javascript
const page = new TablePage({
  pageName: 'orders',
  Collection: OrderCollection,
  defaultQuery: {
    status: 'active',
    size: 25,
    sort: '-created'
  },
  columns: [...]
});
```

URL parameters merge with (and override) default query parameters. So if the URL is `/orders?status=shipped`, the collection will have `status=shipped` instead of `status=active`, but `size=25` and `sort=-created` will still apply (unless also overridden in the URL).

---

## Row Events

TablePage listens for row events and forwards them to custom handlers:

```javascript
const page = new TablePage({
  pageName: 'users',
  Collection: UserCollection,
  columns: [...],
  actions: ['view', 'edit', 'delete'],

  onItemView: async (model, event) => {
    // Navigate to detail page instead of showing a dialog
    app.router.navigate(`/users/${model.id}`);
  },

  onItemEdit: async (model, event) => {
    console.log('Editing:', model.get('name'));
  },

  onItemDelete: async (model, event) => {
    console.log('Deleted:', model.get('name'));
  }
});
```

If no custom handlers are provided, TableView handles these actions with its built-in dialog behavior (view dialog, edit form, delete confirmation).

---

## Table Events

TablePage listens to table-level events:

```javascript
const page = new TablePage({
  pageName: 'orders',
  Collection: OrderCollection,
  columns: [...],

  onAdd: async (event) => {
    // Custom add behavior
    app.router.navigate('/orders/new');
  },

  onExport: async (data, format) => {
    // Custom export behavior
    console.log(`Exporting ${data.length} items as ${format}`);
  }
});
```

---

## Filter Events

Filter edits are handled through a dialog flow managed by TablePage:

```javascript
// TablePage automatically handles this internally.
// When a user clicks a filter pill to edit:
// 1. A form dialog opens with the filter's current value
// 2. On submit, the filter is updated on the collection
// 3. The collection re-fetches
// 4. The URL is updated
```

This is handled automatically — you generally don't need to listen to filter events directly. If you need custom filter handling, you can access the TableView instance:

```javascript
page.tableView.on('filter:edit', ({ key }) => {
  console.log('Editing filter:', key);
});
```

---

## Custom Handlers

All custom handlers are passed through to the TableView. They override the default dialog-based behavior:

```javascript
const page = new TablePage({
  pageName: 'products',
  Collection: ProductCollection,
  columns: [...],
  actions: ['view', 'edit', 'delete'],

  // Override view action
  onItemView: async (model) => {
    app.router.navigate(`/products/${model.id}`);
  },

  // Override add action
  onAdd: async () => {
    app.router.navigate('/products/new');
  },

  // Override export
  onExport: async (data, format) => {
    await customExporter.export(data, format);
  }
});
```

---

## Methods

### refresh()

Re-fetch the table data:

```javascript
await page.refresh();
```

This calls `tableView.refresh()`, which fetches the collection.

---

### getSelectedItems()

Get all selected items from the table:

```javascript
const items = page.getSelectedItems();
// [{ view, model, data }, ...]
```

---

### clearSelection()

Deselect all selected items:

```javascript
page.clearSelection();
```

---

### syncUrl(force)

Manually sync the current collection state to the browser URL:

```javascript
page.syncUrl();
```

**Parameters:**
- `force` *(default: true)* — Update the URL even if the parameters haven't changed

This is called automatically when table state changes, but you can call it manually if you modify collection parameters directly.

---

### applyQueryToCollection()

Read URL query parameters and apply them to the collection:

```javascript
page.applyQueryToCollection();
```

This is called automatically on page entry, but you can call it manually if the URL changes externally.

**Behavior:**
- Parses `start`, `size`, `sort`, `search` from the URL
- Treats all other parameters as filters
- Attempts to JSON-parse values that look like JSON
- Deduplicates simple and `__in` filters (prefers `__in`)

---

### clearAllFilters()

Remove all filters from the collection, keeping only pagination and sort parameters:

```javascript
page.clearAllFilters();
```

This also syncs the URL and re-fetches the collection.

---

### handleFilterEdit(filterKey)

Open a dialog to edit a specific filter:

```javascript
await page.handleFilterEdit('status');
```

This is called automatically when users click filter pills. The dialog is built from the filter's configuration.

---

### updateStatusDisplay()

Update the status bar (if `showStatus` is enabled):

```javascript
page.updateStatusDisplay();
```

This updates the "Last updated" time and total record count.

---

### TablePage.create(options)

Static factory method:

```javascript
const page = TablePage.create({
  pageName: 'users',
  Collection: UserCollection,
  columns: [...]
});
```

Equivalent to `new TablePage(options)`.

---

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Page title |
| `description` | `string` | Page description |
| `Collection` | `Class` | The Collection class (if provided) |
| `collection` | `Collection` | The Collection instance |
| `tableView` | `TableView` | The managed TableView instance |
| `defaultQuery` | `object` | Default query parameters |
| `groupField` | `string` | The parameter name for group filtering |
| `tableViewConfig` | `object` | The resolved config object passed to TableView |
| `urlSyncEnabled` | `boolean` | Whether URL sync is enabled |
| `lastUpdated` | `string` | Last fetch timestamp (formatted string) |
| `isLoading` | `boolean` | Whether the collection is currently fetching |
| `query` | `object` | Current URL query parameters (from Page) |
| `showStatus` | `boolean` | Whether the status bar is shown (getter) |

---

## Lifecycle Hooks

TablePage uses the Page lifecycle. Key hooks:

### onInit()

Called during initialization. TablePage:
1. Creates the collection (if not already provided)
2. Applies URL query parameters to the collection
3. Creates the TableView with all configuration
4. Adds the TableView as a child view
5. Sets up event listeners

### onEnter()

Called each time the page is navigated to. TablePage:
1. Applies the active group filter (if `requiresGroup` is true)
2. Re-applies URL query parameters to the collection
3. Updates filter pills and sort icons on the TableView

### onGroupChange(group)

Called when the active group changes (in multi-tenant apps). TablePage:
1. Sets the group parameter on the collection
2. Re-applies query parameters
3. Re-fetches the collection

### onBeforeDestroy()

Called before the page is destroyed. Cleans up:
- Collection event listeners (`fetch:start`, `fetch:end`)
- TableView event listeners (`params-changed`, row events, table events, filter events)

---

## Custom Page Template

Override the default template for custom page layouts:

```javascript
const page = new TablePage({
  pageName: 'users',
  Collection: UserCollection,
  columns: [...],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>User Management</h2>
          <p class="text-muted">Manage all registered users</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary" data-action="export-report">
            <i class="bi bi-file-earmark-pdf me-1"></i>Generate Report
          </button>
        </div>
      </div>
      <div class="card">
        <div class="card-body p-0" data-container="table"></div>
      </div>
    </div>
  `
});
```

> **Important:** Your custom template must include a `data-container="table"` element. This is where the TableView will be mounted.

---

## Group-Based Filtering

For multi-tenant applications where data is scoped to groups:

```javascript
const page = new TablePage({
  pageName: 'projects',
  Collection: ProjectCollection,
  columns: [...],
  requiresGroup: true,   // Requires an active group
  groupField: 'group'    // Parameter name (default: 'group')
});
```

When `requiresGroup` is true:
- On page entry, if no group parameter is in the URL, the app's `activeGroup.id` is used
- When the active group changes, the collection is re-filtered and re-fetched

---

## Status Display

Show a status bar with last-updated time and total record count:

```javascript
const page = new TablePage({
  pageName: 'orders',
  Collection: OrderCollection,
  columns: [...],
  showStatus: true
});
```

The status bar appears below the table and shows:
- **Last updated:** timestamp of the most recent fetch
- **Total records:** count from the collection metadata

---

## Programmatic Control

Access the underlying TableView and Collection for programmatic control:

```javascript
// Access the TableView
page.tableView.setFilter('status', 'active');
page.tableView.clearSelection();

// Access the Collection
page.collection.setParams({ sort: '-created' });
await page.collection.fetch();

// Refresh the table
await page.refresh();

// Sync URL after manual changes
page.syncUrl();

// Get selected items
const selected = page.getSelectedItems();
```

---

## With App Router

Register the TablePage as a route in your app:

```javascript
import App from '@core/App.js';
import TablePage from '@core/pages/TablePage.js';
import UserCollection from '@collections/UserCollection.js';

const app = new App({
  routes: {
    '/users': new TablePage({
      pageName: 'users',
      title: 'Users',
      Collection: UserCollection,
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'role', label: 'Role', filter: { type: 'select', options: ['admin', 'user'] } }
      ],
      actions: ['view', 'edit', 'delete'],
      addForm: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'role', label: 'Role', type: 'select', options: ['admin', 'user'] }
      ]
    })
  }
});
```

Navigating to `/users?sort=name&search=alice` will open the users page sorted by name with "alice" in the search field.

---

## With Active Groups

```javascript
const page = new TablePage({
  pageName: 'tasks',
  Collection: TaskCollection,
  columns: [...],
  requiresGroup: true,
  groupField: 'project' // The collection param name for the group ID
});

// When the user switches groups in the app header,
// TablePage automatically re-filters:
// collection.params.project = newGroup.id
// collection.fetch()
```

---

## Best Practices

### 1. Always Set `pageName`

The `pageName` is used for routing and internal identification. Make it unique across your app:

```javascript
new TablePage({ pageName: 'user-management', ... })
```

### 2. Use `defaultQuery` for Baseline Filters

Instead of pre-configuring the collection, use `defaultQuery` so URL parameters can override:

```javascript
// Good — URL can override
new TablePage({
  Collection: OrderCollection,
  defaultQuery: { status: 'active', sort: '-created' },
  ...
});

// Less ideal — harder to override from URL
const collection = new OrderCollection();
collection.setParams({ status: 'active', sort: '-created' });
new TablePage({ collection, ... });
```

### 3. Provide Both `addForm` and `editForm`

If they differ, define both. If they're the same, you only need to provide one — TableView falls back from `editForm` to `addForm` and vice versa:

```javascript
// Same form for add and edit
new TablePage({
  addForm: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true }
  ],
  // editForm will use addForm automatically
  ...
});
```

### 4. Use `onItemView` for Navigation Patterns

If your app has dedicated detail pages, override the view action instead of showing dialogs:

```javascript
new TablePage({
  actions: ['view', 'edit'],
  onItemView: (model) => {
    app.router.navigate(`/users/${model.id}`);
  },
  ...
});
```

### 5. Use Responsive Column Visibility

Hide less important columns on small screens:

```javascript
columns: [
  { key: 'name', label: 'Name', sortable: true },           // Always visible
  { key: 'email', label: 'Email', visibility: 'md' },        // md and up
  { key: 'phone', label: 'Phone', visibility: 'lg' },        // lg and up
  { key: 'created|date', label: 'Created', visibility: 'xl' } // xl and up
]
```

### 6. Keep URL Parameters Clean

Use `hideActivePillNames` for internal filters that shouldn't clutter the UI:

```javascript
new TablePage({
  requiresGroup: true,
  hideActivePillNames: ['group'], // Don't show group filter as a pill
  ...
});
```

---

## Common Issues

### Table doesn't load data on page entry

- Ensure your `Collection` class has a valid `endpoint`.
- Check that the API server is running and accessible.
- Verify there are no authentication issues (check the browser Network tab).

### URL parameters not being applied

- Ensure `urlSyncEnabled` is not set to `false`.
- Check that your router passes query parameters to the page's `query` property.
- Verify that the parameter names match what the server expects.

### Filters from URL are not showing as pills

- Filter pills are updated after mount with a short delay (`setTimeout`). If the page renders very quickly, pills should appear within 100ms.
- Ensure the filter keys in the URL match the column `key` or additional filter `name` values.

### Page doesn't update when navigating back

- TablePage re-applies URL parameters in `onEnter()`, which is called each time the page is navigated to.
- If you're using a custom router, ensure it calls `onEnter()` on back/forward navigation.

### Group filter not applied

- Ensure `requiresGroup: true` is set.
- Check that `app.activeGroup` is populated before the page loads.
- Verify `groupField` matches the parameter name your API expects.

### URL gets very long with filters

- Complex filter values (objects, arrays) are JSON-stringified. This is expected.
- Consider using `hideActivePillNames` for internal parameters that don't need to be in the URL.
- If needed, disable URL sync for that page: `urlSyncEnabled: false`.

### Double-fetch on page load

- `fetchOnMount: true` on the TableView (set internally) triggers a fetch when mounted. If `applyQueryToCollection()` also triggers a fetch, you may see two requests. TablePage is designed to handle this correctly through the collection's request deduplication.

---

## Related Documentation

- **[TableView](./TableView.md)** — The table component managed by TablePage
- **[ListView](./ListView.md)** — Parent class that TableView extends
- **[View](../core/View.md)** — Base View class
- **[Collection](../core/Collection.md)** — Data source for the table
- **[Model](../core/Model.md)** — Individual row data
- **[Templates](../core/Templates.md)** — Mustache template syntax and formatters
- **[Events](../core/Events.md)** — Event system and delegation

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/components/TablePage/TablePageExample.js`](../../../examples/portal/examples/components/TablePage/TablePageExample.js) — Page wrapper for TableView with URL-synced sort, filter, search, and pagination.

<!-- examples:cross-link end -->
