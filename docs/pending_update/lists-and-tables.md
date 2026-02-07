# Lists and Tables

MOJO provides powerful components for displaying collections of data with the new `ListView` and `TableView` components. These components leverage MOJO's view management system for efficient rendering and updates.

## Overview

The new list and table components are built on a view-based architecture where each item/row is its own View instance. This provides:

- **Efficient Updates**: Only the changed items re-render, not the entire list
- **Event-Driven**: Each item can emit and handle its own events
- **Memory Efficient**: Views are managed and cleaned up automatically
- **Flexible**: Easy to customize item rendering and behavior

## ListView

The `ListView` component displays a collection of models as a list of views. Each item in the list is a separate `ListViewItem` view that manages its own rendering and lifecycle.

### Basic Usage

```javascript
import ListView from './components/ListView.js';
import Collection from './core/Collection.js';

// Create a collection
const userCollection = new Collection(User, {
  endpoint: '/api/users'
});

// Create a list view
const listView = new ListView({
  collection: userCollection,
  itemTemplate: `
    <div class="user-item">
      <h4>{{name}}</h4>
      <p>{{email}}</p>
    </div>
  `,
  selectionMode: 'single'
});

// Add to page
listView.render(true, document.getElementById('user-list'));
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collection` | Collection/Array | null | The data collection to display |
| `itemTemplate` | String | null | Mustache template for each item |
| `itemClass` | Class | ListViewItem | Custom item view class |
| `selectionMode` | String | 'none' | Selection mode: 'none', 'single', 'multiple' |
| `emptyMessage` | String | 'No items to display' | Message when list is empty |
| `containerId` | String | null | Container ID for rendering |

### Working with Collections

ListView can accept data in multiple formats:

```javascript
// 1. Collection instance
const collection = new Collection(Model, { endpoint: '/api/items' });
const list1 = new ListView({ collection });

// 2. Collection class (will create instance)
const list2 = new ListView({ collection: UserCollection });

// 3. Array of data (will create basic Collection)
const list3 = new ListView({
  collection: [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]
});
```

### Item Templates

Templates are Mustache-based and have access to the model data:

```javascript
const listView = new ListView({
  collection: productCollection,
  itemTemplate: `
    <div class="product-card" data-action="select">
      <img src="{{image}}" alt="{{name}}">
      <h3>{{name}}</h3>
      <p class="price">{{price|currency}}</p>
      <p>{{description|truncate(100)}}</p>
      <button data-action="add-to-cart">Add to Cart</button>
    </div>
  `
});
```

### Selection Handling

ListView supports three selection modes:

```javascript
const listView = new ListView({
  collection: items,
  selectionMode: 'multiple' // or 'single' or 'none'
});

// Listen for selection changes
listView.on('selection:change', ({ selected }) => {
  console.log('Selected items:', selected);
});

// Get selected items programmatically
const selected = listView.getSelectedItems();
// Returns: [{ view, model, data }, ...]

// Select/deselect items
listView.selectItem(modelId);
listView.deselectItem(modelId);
listView.clearSelection();
```

### Events

ListView emits various events during its lifecycle:

```javascript
// Item events
listView.on('item:click', ({ item, model, index, action }) => {
  console.log('Item clicked:', model);
});

listView.on('item:select', ({ item, model, index }) => {
  console.log('Item selected:', model);
});

listView.on('item:deselect', ({ item, model, index }) => {
  console.log('Item deselected:', model);
});

// List events
listView.on('list:empty', () => {
  console.log('List is now empty');
});

listView.on('list:loaded', ({ count }) => {
  console.log(`List loaded with ${count} items`);
});
```

### Custom Item Views

You can create custom item views by extending `ListViewItem`:

```javascript
import ListViewItem from './components/ListViewItem.js';

class ProductItem extends ListViewItem {
  constructor(options) {
    super(options);

    this.template = `
      <div class="product">
        <h3>{{model.name}}</h3>
        <span class="price">{{model.price|currency}}</span>
      </div>
    `;
  }

  async onActionAddToCart(action, event, element) {
    const product = this.model;
    await cartService.addItem(product);
    this.showSuccess('Added to cart!');
  }
}

// Use custom item class
const productList = new ListView({
  collection: products,
  itemClass: ProductItem
});
```

### Iteration Methods

ListView provides convenient methods for iterating over items:

```javascript
// Using forEach on the collection
listView.collection.forEach((model, index) => {
  console.log(`Model ${index}:`, model);
});

// Using forEachItem on the ListView
listView.forEachItem((itemView, model, index) => {
  console.log(`Item ${index}:`, itemView, model);
  itemView.addClass('processed');
});

// Method chaining
listView
  .forEachItem(item => item.addClass('highlight'))
  .clearSelection();
```

### Dynamic Updates

```javascript
// Update item template
listView.setItemTemplate(`
  <div class="compact-item">{{name}}</div>
`, true); // true = re-render existing items

// Refresh data
await listView.refresh();

// The list automatically updates when the collection changes
collection.add(newModel);    // Item appears in list
collection.remove(modelId);  // Item removed from list
model.set('name', 'New Name'); // Only that item re-renders
```

## TableView

The `TableView` component extends `ListView` to provide a full-featured data table with sorting, filtering, pagination, and actions.

### Basic Usage

```javascript
import TableView from './components/TableView.js';

const tableView = new TableView({
  collection: userCollection,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'created', label: 'Created', formatter: 'date' },
    { key: 'active', label: 'Status', type: 'boolean' }
  ],
  actions: ['view', 'edit', 'delete'],
  paginated: true,
  searchable: true
});

tableView.render(true, document.getElementById('user-table'));
```

### Column Configuration

Columns support various formatting options:

```javascript
const columns = [
  // Simple column
  { key: 'name', label: 'Name' },

  // With sorting
  { key: 'email', label: 'Email', sortable: true },

  // With formatter (string)
  { key: 'price', label: 'Price', formatter: 'currency' },

  // With formatter (pipe expression)
  { key: 'description', label: 'Description', formatter: 'truncate(50)|capitalize' },

  // With formatter (function)
  {
    key: 'status',
    label: 'Status',
    formatter: (value, context) => {
      const { row, column, table } = context;
      const color = value === 'active' ? 'success' : 'danger';
      return `<span class="badge bg-${color}">${value}</span>`;
    }
  },

  // With type-based formatting
  { key: 'active', label: 'Active', type: 'boolean' },
  { key: 'created', label: 'Created', type: 'date' },
  { key: 'avatar', label: 'Avatar', type: 'image' },

  // With custom template
  {
    key: 'user',
    label: 'User',
    template: (value, row) => `
      <div class="user-cell">
        <img src="${row.avatar}" class="avatar">
        <span>${row.name}</span>
      </div>
    `
  },

  // With CSS classes
  { key: 'amount', label: 'Amount', className: 'text-end', formatter: 'currency' }
];
```

### Actions Configuration

Tables support row-level actions:

```javascript
// Built-in actions
const table1 = new TableView({
  collection: items,
  actions: ['view', 'edit', 'delete']
});

// Custom actions
const table2 = new TableView({
  collection: items,
  actions: [
    'view',
    'edit',
    {
      action: 'duplicate',
      label: 'Duplicate',
      icon: 'bi bi-copy',
      class: 'btn-outline-info'
    },
    'delete'
  ]
});

// Context menu instead of action buttons
const table3 = new TableView({
  collection: items,
  contextMenu: [
    { action: 'view', label: 'View Details', icon: 'bi bi-eye' },
    { action: 'edit', label: 'Edit', icon: 'bi bi-pencil' },
    { separator: true },
    { action: 'duplicate', label: 'Duplicate', icon: 'bi bi-copy' },
    { separator: true },
    { action: 'delete', label: 'Delete', icon: 'bi bi-trash', danger: true }
  ]
});
```

### Table Options

```javascript
const tableView = new TableView({
  collection: items,
  columns: columns,

  // Display options
  tableOptions: {
    striped: true,      // Zebra striping
    bordered: false,    // Table borders
    hover: true,        // Hover effect on rows
    responsive: false,  // Responsive wrapper
    size: 'sm'         // Table size: null, 'sm', 'lg'
  },

  // Features
  searchable: true,           // Show search box
  sortable: true,            // Enable column sorting
  filterable: true,          // Show filter dropdown
  paginated: true,           // Enable pagination
  selectable: true,          // Enable row selection

  // Search configuration
  searchPlacement: 'toolbar', // 'toolbar' or 'dropdown'
  searchPlaceholder: 'Search users...',

  // Batch actions (requires selectable: true)
  batchActions: [
    { action: 'delete-selected', label: 'Delete', icon: 'bi bi-trash' },
    { action: 'export-selected', label: 'Export', icon: 'bi bi-download' }
  ],

  // Additional buttons
  showAdd: true,
  showExport: true,

  // Empty state
  emptyMessage: 'No users found'
});
```

### Event Handling

TableView emits events for all interactions:

```javascript
// Row events
tableView.on('row:click', ({ model, column, event }) => {
  console.log('Row clicked:', model, 'Column:', column);
});

tableView.on('row:view', async ({ model }) => {
  await showDetailsDialog(model);
});

tableView.on('row:edit', async ({ model }) => {
  await showEditDialog(model);
});

tableView.on('row:delete', async ({ model }) => {
  if (confirm('Delete this item?')) {
    await model.destroy();
    tableView.refresh();
  }
});

// Table events
tableView.on('table:search', ({ searchTerm }) => {
  console.log('Searching for:', searchTerm);
});

tableView.on('table:sort', ({ field }) => {
  console.log('Sorting by:', field);
});

tableView.on('table:page', ({ page }) => {
  console.log('Page changed to:', page);
});

tableView.on('table:export', ({ data }) => {
  exportToCSV(data);
});
```

### Pagination

TableView handles pagination automatically:

```javascript
// Server-side pagination (REST collections)
const collection = new Collection(Model, {
  endpoint: '/api/users',
  params: {
    size: 25,    // Items per page
    start: 0     // Starting index
  }
});

const table = new TableView({
  collection: collection,
  paginated: true
});

// Client-side pagination (local data)
const localTable = new TableView({
  collection: localData,
  paginated: true
});
```

### Custom Row Views

Create custom table rows by extending `TableRow`:

```javascript
import TableRow from './components/TableRow.js';

class UserRow extends TableRow {
  buildCellTemplate(column) {
    if (column.key === 'avatar') {
      return `
        <img src="{{model.avatar}}"
             class="rounded-circle"
             width="32" height="32"
             alt="{{model.name}}">
      `;
    }
    return super.buildCellTemplate(column);
  }

  async onActionPromote(action, event, element) {
    await this.model.save({ role: 'admin' });
    this.showSuccess('User promoted!');
  }
}

const userTable = new TableView({
  collection: users,
  itemClass: UserRow,
  columns: columns
});
```

## Performance Benefits

The view-based architecture provides significant performance improvements:

### Traditional Table Rendering
```javascript
// Old approach - entire table re-renders
model.set('name', 'New Name');
table.render(); // Re-renders ALL rows
```

### View-Based Rendering
```javascript
// New approach - only affected row re-renders
model.set('name', 'New Name');
// Only the row for this model re-renders automatically
```

### Benchmark Example
```javascript
// With 1000 rows, updating 10 models:
// Traditional: ~500ms (re-renders all 1000 rows)
// View-based: ~50ms (re-renders only 10 rows)
```

## Migration from Legacy Table

If you're using the legacy `Table` component, you can migrate gradually:

### Step 1: Run Side-by-Side
```javascript
// Keep existing Table for now
import TableView from './components/Table.js';
const legacyTable = new TableView({ ... });

// Add new TableView for new features
import TableView from './components/TableView.js';
const newTable = new TableView({ ... });
```

### Step 2: Migrate Configuration
```javascript
// Legacy Table configuration
const oldConfig = {
  Collection: UserCollection,
  columns: columns,
  actions: ['view', 'edit', 'delete'],
  options: {
    paginated: true,
    searchable: true,
    selectable: true
  }
};

// New TableView configuration
const newConfig = {
  collection: new UserCollection(),  // Note: lowercase, instance
  columns: columns,                  // Same format
  actions: ['view', 'edit', 'delete'], // Same format
  paginated: true,                   // Flattened options
  searchable: true,
  selectable: true
};
```

### Step 3: Update Event Handlers
```javascript
// Legacy events
table.on('item-clicked', ({ item }) => { ... });

// New events
tableView.on('row:click', ({ model }) => { ... });
```

## Advanced Examples

### Product Catalog with Custom Formatting

```javascript
const productTable = new TableView({
  collection: productCollection,
  columns: [
    {
      key: 'image',
      label: 'Product',
      template: (value, row) => `
        <div class="d-flex align-items-center">
          <img src="${value}" class="me-2" style="width: 40px;">
          <div>
            <div class="fw-bold">${row.name}</div>
            <small class="text-muted">${row.sku}</small>
          </div>
        </div>
      `
    },
    { key: 'price', label: 'Price', formatter: 'currency', className: 'text-end' },
    { key: 'stock', label: 'Stock', type: 'badge' },
    { key: 'category', label: 'Category', sortable: true }
  ],
  actions: [
    { action: 'quick-view', icon: 'bi bi-eye', class: 'btn-outline-info' },
    'edit',
    { action: 'duplicate', icon: 'bi bi-copy', class: 'btn-outline-secondary' }
  ],
  searchPlaceholder: 'Search products...'
});
```

### User Management with Batch Actions

```javascript
const userTable = new TableView({
  collection: userCollection,
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', type: 'badge' },
    { key: 'lastLogin', label: 'Last Login', formatter: 'datetime' },
    {
      key: 'active',
      label: 'Status',
      formatter: (value) => value
        ? '<span class="badge bg-success">Active</span>'
        : '<span class="badge bg-danger">Inactive</span>'
    }
  ],
  selectable: true,
  batchActions: [
    { action: 'activate', label: 'Activate', icon: 'bi bi-check-circle' },
    { action: 'deactivate', label: 'Deactivate', icon: 'bi bi-x-circle' },
    { action: 'delete', label: 'Delete', icon: 'bi bi-trash', danger: true }
  ]
});

// Handle batch actions
userTable.on('activate', async () => {
  const selected = userTable.getSelectedItems();
  for (const { model } of selected) {
    await model.save({ active: true });
  }
  userTable.refresh();
});
```

### Dynamic List with Live Updates

```javascript
const activityList = new ListView({
  collection: activityCollection,
  itemTemplate: `
    <div class="activity-item">
      <div class="d-flex justify-content-between">
        <div>
          <i class="{{icon}} me-2"></i>
          <strong>{{user.name}}</strong> {{action}}
        </div>
        <small class="text-muted">{{timestamp|timeAgo}}</small>
      </div>
      {{#details}}
        <div class="mt-1 text-muted">{{details}}</div>
      {{/details}}
    </div>
  `
});

// Update list with WebSocket data
socket.on('activity', (data) => {
  activityCollection.add(data, { at: 0 }); // Add to beginning
  // Only the new item renders, existing items untouched
});
```

## Best Practices

1. **Use Collection Features**: Leverage Collection's built-in REST support for data fetching
2. **Custom Item Views**: Create custom item/row views for complex rendering logic
3. **Event Delegation**: Use the event system instead of manual DOM manipulation
4. **Lazy Loading**: Collections support pagination for large datasets
5. **Template Reuse**: Define templates once and reuse across views
6. **Formatter Functions**: Use formatters for consistent data display
7. **Selection Management**: Use built-in selection instead of custom tracking

## Summary

The new ListView and TableView components provide a powerful, efficient way to display collections of data. By treating each item/row as its own View, they enable:

- Granular updates without full re-renders
- Better performance with large datasets
- Cleaner separation of concerns
- Easier customization and extension
- Automatic memory management

Whether you need a simple list or a full-featured data table, these components provide the flexibility and performance to handle your needs.
