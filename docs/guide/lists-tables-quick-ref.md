# ListView & TableView Quick Reference

## At a Glance

### Key Difference from Legacy Components
**Old Way**: Entire list/table re-renders on any change  
**New Way**: Only changed items re-render (10-100x faster with large datasets)

### When to Use

| Component | Use When |
|-----------|----------|
| **ListView** | • Custom item layouts<br>• Card-based displays<br>• Non-tabular data<br>• Complex item interactions |
| **TableView** | • Tabular data display<br>• Need sorting/pagination<br>• Data grids<br>• Admin panels |

## ListView Quick Start

```javascript
// Minimal setup
const list = new ListView({
  collection: myCollection,
  itemTemplate: '<div>{{name}}</div>'
});

// Full featured
const list = new ListView({
  collection: myCollection,
  itemTemplate: '<div>{{name}} - {{email}}</div>',
  itemClass: CustomItem,        // Optional custom item view
  selectionMode: 'multiple',    // 'none', 'single', 'multiple'
  emptyMessage: 'No items',
  containerId: 'my-list'
});
```

### ListView Methods

```javascript
// Selection
list.selectItem(modelId)
list.deselectItem(modelId)
list.clearSelection()
list.getSelectedItems() // => [{view, model, data}, ...]

// Iteration
list.forEachItem((itemView, model, index) => { })
list.collection.forEach((model, index) => { })

// Updates
list.setItemTemplate(template, rerender)
list.refresh()

// The list auto-updates when collection changes
collection.add(model)    // Item appears
collection.remove(model) // Item disappears
model.set('field', val) // Item re-renders
```

### ListView Events

```javascript
list.on('item:click', ({ item, model, index, action }) => { })
list.on('item:select', ({ item, model, index }) => { })
list.on('item:deselect', ({ item, model, index }) => { })
list.on('selection:change', ({ selected }) => { })
list.on('list:empty', () => { })
list.on('list:loaded', ({ count }) => { })
```

## TableView Quick Start

```javascript
// Minimal setup
const table = new TableView({
  collection: myCollection,
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' }
  ]
});

// Full featured
const table = new TableView({
  collection: myCollection,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'price', label: 'Price', formatter: 'currency' },
    { key: 'active', label: 'Active', type: 'boolean' }
  ],
  actions: ['view', 'edit', 'delete'],
  searchable: true,
  paginated: true,
  selectable: true
});
```

### Column Formatters

```javascript
// String formatter
{ key: 'price', formatter: 'currency' }
{ key: 'date', formatter: 'date' }
{ key: 'text', formatter: 'truncate(50)|uppercase' }

// Function formatter
{ 
  key: 'status',
  formatter: (value, context) => {
    const { row, column, table, index } = context;
    return `<span class="badge">${value}</span>`;
  }
}

// Type-based formatting
{ key: 'active', type: 'boolean' }    // ✓ or ✗
{ key: 'created', type: 'date' }      // Formatted date
{ key: 'avatar', type: 'image' }      // <img> tag
{ key: 'status', type: 'badge' }      // Badge style

// Template
{
  key: 'user',
  template: (value, row) => `
    <div>${row.name} (${row.email})</div>
  `
}
```

### TableView Actions

```javascript
// Built-in actions
actions: ['view', 'edit', 'delete']

// Custom actions
actions: [
  'view',
  {
    action: 'download',
    label: 'Download',
    icon: 'bi bi-download',
    class: 'btn-outline-info'
  },
  'delete'
]

// Context menu
contextMenu: [
  { action: 'view', label: 'View', icon: 'bi bi-eye' },
  { separator: true },
  { action: 'delete', label: 'Delete', icon: 'bi bi-trash', danger: true }
]
```

### TableView Events

```javascript
// Row events
table.on('row:click', ({ model, column, event }) => { })
table.on('row:view', ({ model, event }) => { })
table.on('row:edit', ({ model, event }) => { })
table.on('row:delete', ({ model, event }) => { })

// Table events
table.on('table:search', ({ searchTerm }) => { })
table.on('table:sort', ({ field }) => { })
table.on('table:page', ({ page }) => { })
table.on('table:add', ({ event }) => { })
table.on('table:export', ({ data }) => { })
```

## Custom Item/Row Views

### Custom ListViewItem

```javascript
class ProductItem extends ListViewItem {
  constructor(options) {
    super(options);
    this.template = `
      <div class="product-item">
        <h4>{{model.name}}</h4>
        <button data-action="add-to-cart">Add to Cart</button>
      </div>
    `;
  }
  
  async onActionAddToCart(action, event, element) {
    await cartService.add(this.model);
  }
}

const list = new ListView({
  collection: products,
  itemClass: ProductItem
});
```

### Custom TableRow

```javascript
class UserRow extends TableRow {
  buildCellTemplate(column) {
    if (column.key === 'avatar') {
      return `<img src="{{model.avatar}}" width="32">`;
    }
    return super.buildCellTemplate(column);
  }
}

const table = new TableView({
  collection: users,
  itemClass: UserRow
});
```

## Common Patterns

### Search with Debounce

```javascript
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    collection.setParams({ search: e.target.value });
    collection.fetch();
  }, 300);
});
```

### Batch Operations

```javascript
const table = new TableView({
  selectable: true,
  batchActions: [
    { action: 'delete-selected', label: 'Delete', icon: 'bi bi-trash' }
  ]
});

table.on('delete-selected', async () => {
  const selected = table.getSelectedItems();
  for (const { model } of selected) {
    await model.destroy();
  }
  table.refresh();
});
```

### Live Updates

```javascript
// WebSocket updates
socket.on('item-updated', (data) => {
  const model = collection.get(data.id);
  if (model) {
    model.set(data); // Only that row re-renders
  }
});

socket.on('item-added', (data) => {
  collection.add(data); // Row appears automatically
});
```

### Infinite Scroll

```javascript
const list = new ListView({
  collection: items,
  itemTemplate: '<div>{{title}}</div>'
});

// Load more on scroll
listContainer.addEventListener('scroll', async () => {
  if (nearBottom() && !collection.loading) {
    collection.params.start += collection.params.size;
    const response = await collection.fetch();
    collection.add(response.data.data, { merge: false });
  }
});
```

## Performance Tips

### Do's ✅
- Use `itemClass` for complex item logic
- Let collection handle data updates
- Use formatters for consistent display
- Leverage built-in selection system
- Use `forEachItem` for bulk operations

### Don'ts ❌
- Don't manually manipulate DOM
- Don't re-render entire list/table
- Don't track selection manually
- Don't fetch data in render methods
- Don't create views in loops

## Migration Cheat Sheet

| Legacy Table | New TableView |
|--------------|---------------|
| `new Table({ Collection: UserCollection })` | `new TableView({ collection: new UserCollection() })` |
| `table.render()` | Automatic on data change |
| `on('item-clicked')` | `on('row:click')` |
| `on('item-dialog')` | `on('row:edit')` |
| `getSelectedItems()` | Same |
| `options.paginated` | `paginated` (flat) |
| Full re-render on change | Item-level re-render |

## Collection Integration

```javascript
// REST-enabled collection
const collection = new Collection(Model, {
  endpoint: '/api/items',
  params: { size: 25, start: 0 }
});

// The list/table syncs automatically
const view = new ListView({ collection });

// Collection changes update view
await collection.fetch();        // View updates
collection.add(model);           // Item appears
collection.remove(model);        // Item disappears  
model.set('field', value);      // Item re-renders
collection.sort('name');         // View re-orders
```

## Quick Decision Tree

```
Need a list/table?
│
├─ Tabular data? → TableView
│  ├─ Need sorting? → sortable: true
│  ├─ Need search? → searchable: true
│  ├─ Need pagination? → paginated: true
│  └─ Need selection? → selectable: true
│
└─ Custom layout? → ListView
   ├─ Cards/tiles? → Custom itemTemplate
   ├─ Complex items? → Custom itemClass
   └─ Selection? → selectionMode: 'single'|'multiple'
```

## Complete Examples

### Admin User Table
```javascript
new TableView({
  collection: new UserCollection(),
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', type: 'badge' },
    { key: 'active', label: 'Active', type: 'boolean' }
  ],
  actions: ['view', 'edit', 'delete'],
  searchable: true,
  paginated: true,
  showAdd: true
});
```

### Product Card List
```javascript
new ListView({
  collection: new ProductCollection(),
  itemTemplate: `
    <div class="card">
      <img src="{{image}}" class="card-img-top">
      <div class="card-body">
        <h5>{{name}}</h5>
        <p>{{price|currency}}</p>
        <button data-action="add-to-cart" class="btn btn-primary">
          Add to Cart
        </button>
      </div>
    </div>
  `,
  selectionMode: 'none'
});
```
