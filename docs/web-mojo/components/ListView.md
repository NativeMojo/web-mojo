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

---

## When to Use ListView

Use ListView when you need to:

- **Display a list of items** from a Collection
- **Render custom cards, rows, or tiles** for each model
- **Support item selection** (single or multi-select)
- **React to collection changes** (items added, removed, refreshed)
- **Build a base for more complex list-based components** (TableView extends ListView)

For tabular data with sorting, filtering, pagination, and actions, use [TableView](./TableView.md) instead.

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

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/components/ListView/ListViewExample.js`](../../../examples/portal/examples/components/ListView/ListViewExample.js) — Visual list bound to a Collection — per-row Views with selection support.

<!-- examples:cross-link end -->
