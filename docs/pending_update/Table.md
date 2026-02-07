# TableView Component

The TableView component is an advanced data table that extends ListView for efficient, row-based rendering. Each row is a separate TableRow view (extending ListViewItem) that only re-renders when its model changes, providing excellent performance even with large datasets.

## Overview

TableView leverages ListView's view management system where:
- **Each row is a separate view**: Individual TableRow instances manage their own rendering
- **Smart re-rendering**: Only affected rows update when data changes
- **Efficient DOM management**: ListView handles view lifecycle and DOM operations
- **Responsive columns**: Built-in Bootstrap breakpoint-based visibility
- **Advanced filtering**: Dropdown UI with active filter pills

## Features

- **Performance**: Row-level view management for efficient rendering
- **Responsive Design**: Column visibility control at different breakpoints
- **Smart Forms**: Automatic form configuration from Model classes
- **Advanced Filtering**: Filter dropdown with pills and inline editing
- **Batch Operations**: Multi-select with batch action panel
- **Live Search**: Real-time search with debouncing
- **Sorting**: Column sorting with visual indicators
- **Pagination**: Built-in pagination controls
- **Context Menus**: Row-level context menus
- **Export**: CSV export functionality
- **Inline Editing**: Edit table cells directly with text, select, and switch inputs
- **Footer Totals**: Automatically calculate and display column totals

## Basic Usage

### Simple Table

```javascript
import TableView from 'web-mojo/views/table/TableView.js';
import UserCollection from './collections/UserCollection.js';

const table = new TableView({
  collection: new UserCollection(),
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', formatter: 'badge' },
    { key: 'created_at', label: 'Created', formatter: 'date' }
  ],
  actions: ['view', 'edit', 'delete']
});

// Add to parent view
this.addChild(table);
```

### Table with Responsive Columns

```javascript
const table = new TableView({
  collection: userCollection,
  columns: [
    { key: 'id', label: 'ID', visibility: 'xl' },        // Only on XL+ screens
    { key: 'name', label: 'Name' },                      // Always visible
    { key: 'email', label: 'Email', visibility: 'sm' },  // Hidden on XS only
    { key: 'phone', label: 'Phone', visibility: 'md' },  // Hidden on XS/SM
    { key: 'address', label: 'Address', visibility: 'lg' }, // Hidden on XS/SM/MD
    { key: 'notes', label: 'Notes', visibility: 'xl' }   // Only on XL+
  ],
  actions: ['view', 'edit', 'delete']
});
```

## Configuration Options

### Constructor Options

```javascript
const table = new TableView({
  // Data source
  collection: myCollection,        // Collection instance (required)
  
  // Column configuration
  columns: [...],                  // Column definitions (required)
  
  // Row actions
  actions: ['view', 'edit', 'delete'], // String shortcuts or action objects
  contextMenu: [...],              // Context menu items
  batchActions: [...],             // Batch operations for selected rows
  
  // Features
  searchable: true,                // Enable global search
  sortable: true,                  // Enable column sorting
  filterable: true,                // Enable filtering
  paginated: true,                 // Enable pagination
  selectionMode: 'multiple',       // 'none', 'single', 'multiple'
  
  // Form configurations
  addForm: {...},                  // Form config for adding items
  editForm: {...},                 // Form config for editing items
  itemView: CustomDetailView,      // Custom view class for viewing items
  deleteTemplate: 'Delete {{name}}?', // Delete confirmation template
  
  // Filter configuration
  filters: [...],                  // Additional filters beyond columns
  hideActivePills: false,          // Hide filter pills display
  hideActivePillNames: ['status'], // Hide specific filter pills
  searchPlacement: 'toolbar',      // 'toolbar' or 'dropdown'
  
  // Display options
  tableOptions: {                  // HTML table styling
    striped: true,
    bordered: false,
    hover: true,
    responsive: false,
    size: null                    // null, 'sm', 'lg'
  },
  
  // Messages
  emptyMessage: 'No data available',
  searchPlaceholder: 'Search...',
  
  // Toolbar buttons
  showAdd: true,                   // Show Add button
  showExport: true,                // Show Export button
  
  // Event handlers
  onItemView: async (model) => {},
  onItemEdit: async (model) => {},
  onItemDelete: async (model) => {},
  onAdd: async () => {},
  onExport: async (data) => {}
});
```

### Column Definitions

```javascript
columns: [
  {
    key: 'name',                    // Model property key
    label: 'Full Name',             // Column header
    
    // Responsive visibility
    visibility: 'md',               // Bootstrap breakpoint: 'sm', 'md', 'lg', 'xl', 'xxl'
                                   // Column hidden below this breakpoint
    
    // Sorting
    sortable: true,                 // Enable column sorting
    
    // Formatting
    formatter: 'currency',          // Built-in formatter name
    formatter: (value, context) => { // Or custom formatter function
      // context = { value, row, column, table, index }
      return `<strong>${value}</strong>`;
    },
    
    // Filtering
    filter: {                       // Enable column filter
      type: 'select',              // 'text', 'select', 'date', 'daterange', 'number', 'boolean'
      label: 'Status Filter',      
      options: [                   
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    
    // Styling
    class: 'text-nowrap',          // CSS classes for cells
    width: '200px',                // Fixed column width
    
    // Interaction
    action: 'row-click',           // Action triggered on cell click
    
    // Inline editing
    editable: true,                // Enable inline editing for this column
    editableOptions: {             // Editor configuration
      type: 'text',               // 'text', 'select', 'switch', 'textarea'
      placeholder: 'Enter name...',
      // For select type:
      options: ['option1', 'option2'], // or [{ value: 'val', label: 'Label' }]
      // For textarea type:
      rows: 3,
      // Auto-save settings:
      autoSave: true              // Auto-save on change (default: true for selects/switches)
    },
    
    // Footer totals
    footer_total: true,           // Include this column in footer totals calculation
    
    // Custom template (alternative to formatter)
    template: (value, model) => {
      return `<a href="/users/${model.id}">${value}</a>`;
    }
  }
]
```

## Built-in Formatters

TableView includes these formatters via DataFormatter:

- `text` - Plain text (default)
- `email` - Creates mailto link
- `url` - Creates clickable link  
- `date` - Formats as date
- `datetime` - Formats as date and time
- `time` - Time only
- `currency` - Currency formatting
- `number` - Number with thousands separator
- `percent` - Percentage formatting
- `boolean` - Yes/No display
- `badge` - Bootstrap badge
- `truncate(n)` - Truncates to n characters

### Using Formatters

```javascript
columns: [
  // String formatter
  { key: 'price', label: 'Price', formatter: 'currency' },
  
  // Pipe multiple formatters
  { key: 'description', label: 'Description', formatter: 'truncate(100)|escape' },
  
  // Function formatter for complex logic
  { 
    key: 'status',
    label: 'Status',
    formatter: (value, context) => {
      const colors = {
        active: 'success',
        pending: 'warning',
        inactive: 'danger'
      };
      return `<span class="badge bg-${colors[value]}">${value}</span>`;
    }
  }
]
```

## Row Actions

### Simple Actions

```javascript
// Use string shortcuts
actions: ['view', 'edit', 'delete']

// Generates standard buttons with icons:
// - View: eye icon, primary style
// - Edit: pencil icon, secondary style  
// - Delete: trash icon, danger style
```

### Custom Actions

```javascript
actions: [
  {
    action: 'approve',
    label: 'Approve',
    icon: 'bi bi-check-circle',
    class: 'btn-success'
  },
  {
    action: 'reject',
    label: 'Reject', 
    icon: 'bi bi-x-circle',
    class: 'btn-danger'
  }
]
```

### Context Menus

```javascript
contextMenu: [
  {
    action: 'view',
    label: 'View Details',
    icon: 'bi bi-eye'
  },
  {
    separator: true  // Divider line
  },
  {
    action: 'duplicate',
    label: 'Duplicate',
    icon: 'bi bi-copy'
  },
  {
    action: 'archive',
    label: 'Archive',
    icon: 'bi bi-archive'
  },
  {
    separator: true
  },
  {
    action: 'delete',
    label: 'Delete',
    icon: 'bi bi-trash',
    danger: true  // Red text
  }
]
```

## Model-Based Configuration

TableView automatically reads configuration from Model classes:

```javascript
class ProductModel extends Model {
  static MODEL_NAME = 'Product';
  
  // Form for adding new products
  static ADD_FORM = {
    title: 'Add Product',
    fields: [
      { name: 'name', label: 'Product Name', required: true },
      { name: 'price', label: 'Price', type: 'currency', required: true },
      { name: 'category', label: 'Category', type: 'select',
        options: ['Electronics', 'Clothing', 'Books'] }
    ]
  };
  
  // Form for editing products
  static EDIT_FORM = {
    title: 'Edit Product',
    fields: [
      { name: 'name', label: 'Product Name', required: true },
      { name: 'price', label: 'Price', type: 'currency', required: true },
      { name: 'category', label: 'Category', type: 'select',
        options: ['Electronics', 'Clothing', 'Books'] },
      { name: 'status', label: 'Status', type: 'select',
        options: ['active', 'draft', 'archived'] }
    ]
  };
  
  // Custom view for product details
  static VIEW_CLASS = ProductDetailView;
  
  // Delete confirmation template
  static DELETE_TEMPLATE = 'Delete product "{{name}}" (SKU: {{sku}})? This cannot be undone.';
}

// TableView automatically uses Model configuration
const table = new TableView({
  collection: productCollection, // Uses ProductModel
  columns: [...],
  actions: ['view', 'edit', 'delete']
  // No need to specify forms - they're read from ProductModel!
});
```

## Filtering System

### Column Filters

```javascript
columns: [
  {
    key: 'category',
    label: 'Category',
    filter: {
      type: 'select',
      label: 'Product Category',
      options: [
        { value: 'electronics', label: 'Electronics' },
        { value: 'clothing', label: 'Clothing' }
      ]
    }
  },
  {
    key: 'price',
    label: 'Price',
    filter: {
      type: 'range',
      min: 0,
      max: 1000,
      step: 10
    }
  }
]
```

### Additional Filters

```javascript
const table = new TableView({
  columns: [...],
  
  // Filters not tied to columns
  filters: [
    {
      key: 'date_range',
      label: 'Date Range',
      type: 'daterange',
      startName: 'start_date',
      endName: 'end_date'
    },
    {
      key: 'has_discount',
      label: 'On Sale Only',
      type: 'boolean'
    },
    {
      key: 'min_rating',
      label: 'Minimum Rating',
      type: 'select',
      options: [1, 2, 3, 4, 5]
    }
  ]
});
```

### Filter Pills Display

Active filters are shown as pills below the toolbar:

```javascript
// Control pill display
hideActivePills: false,              // Hide all pills
hideActivePillNames: ['category'],   // Hide specific pills

// Pills show filter name and value with edit/remove buttons
// Example: "Category: Electronics [edit] [x]"
```

## Batch Operations

### Configuration

```javascript
const table = new TableView({
  selectionMode: 'multiple',  // Enable multi-select
  
  batchActions: [
    {
      action: 'activate',
      label: 'Activate',
      icon: 'bi bi-check-circle'
    },
    {
      action: 'archive',
      label: 'Archive',
      icon: 'bi bi-archive'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: 'bi bi-trash',
      class: 'text-danger'
    }
  ]
});
```

### Handling Batch Actions

```javascript
table.on('batch:action', async ({ action, items, event }) => {
  switch(action) {
    case 'activate':
      for (const item of items) {
        await item.model.save({ status: 'active' });
      }
      await table.refresh();
      break;
      
    case 'delete':
      const confirmed = await Dialog.confirm(
        `Delete ${items.length} items?`
      );
      if (confirmed) {
        for (const item of items) {
          await item.model.destroy();
        }
        await table.refresh();
      }
      break;
  }
});
```

## Inline Editing

TableView supports inline editing of table cells with different input types. When enabled, users can click on editable cells to edit values directly in the table.

### Basic Inline Editing

```javascript
const table = new TableView({
  collection: userCollection,
  columns: [
    {
      key: 'name',
      label: 'Name',
      editable: true  // Simple text editing
    },
    {
      key: 'email',
      label: 'Email', 
      editable: true,
      editableOptions: {
        type: 'text',
        placeholder: 'Enter email address...'
      }
    }
  ]
});
```

### Editor Types

#### Text Input
```javascript
{
  key: 'description',
  label: 'Description',
  editable: true,
  editableOptions: {
    type: 'text',           // Default type
    placeholder: 'Enter description...',
    inputType: 'email'      // HTML input type: 'text', 'email', 'number', etc.
  }
}
```

#### Select Dropdown
```javascript
{
  key: 'status',
  label: 'Status',
  editable: true,
  editableOptions: {
    type: 'select',
    options: [
      'new', 'opened', 'paused', 'declined'  // String array
    ]
    // Or object array:
    // options: [
    //   { value: 'new', label: 'New Request' },
    //   { value: 'opened', label: 'In Progress' }
    // ]
  }
}
```

#### Switch/Checkbox
```javascript
{
  key: 'is_active',
  label: 'Active',
  editable: true,
  editableOptions: {
    type: 'switch'    // or 'checkbox'
  }
}
```

#### Textarea
```javascript
{
  key: 'notes',
  label: 'Notes',
  editable: true,
  editableOptions: {
    type: 'textarea',
    rows: 3,
    placeholder: 'Enter additional notes...'
  }
}
```

### Auto-Save Behavior

Inline editing automatically saves changes to the model and backend:

- **Text inputs**: Save on Enter key or clicking the green checkmark
- **Select/Switch**: Save immediately on change (default behavior)
- **Model Update**: Calls `model.save({ fieldName: newValue })` directly
- **Error Handling**: Failed saves show error styling and keep editor open

```javascript
// Handle editing events
table.on('cell:edit', ({ row, model, column, originalValue }) => {
  console.log('Started editing:', column);
});

table.on('cell:save', ({ row, model, column, oldValue, newValue }) => {
  console.log('Cell saved:', column, oldValue, '->', newValue);
});

table.on('cell:cancel', ({ row, model, column }) => {
  console.log('Edit cancelled:', column);
});

table.on('cell:save:error', ({ row, model, column, error }) => {
  console.log('Save failed:', column, error);
});
```

### Inline Editing with Formatters

Formatters work seamlessly with inline editing. The display value uses the formatter while editing uses the raw value:

```javascript
{
  key: 'price|currency',     // Key with pipe formatter
  label: 'Price',
  editable: true,           // Edit raw numeric value
  editableOptions: {
    type: 'text',
    inputType: 'number'
  }
  // Display shows "$123.45", editing shows "123.45"
}
```

## Footer Totals

TableView can automatically calculate and display totals for numeric columns in a footer row.

### Basic Footer Totals

```javascript
const table = new TableView({
  collection: salesCollection,
  columns: [
    {
      key: 'customer',
      label: 'Customer'
    },
    {
      key: 'sales_amount|currency',
      label: 'Sales Amount',
      footer_total: true        // Include in footer totals
    },
    {
      key: 'tips|currency',
      label: 'Tips', 
      footer_total: true        // Include in footer totals
    }
  ]
});
```

This produces a footer row like:
| **Totals** | **$1,234.56** | **$89.00** |

### How Footer Totals Work

1. **Column Detection**: TableView automatically detects columns with `footer_total: true`
2. **Calculation**: Sums all numeric values from the collection for each total column
3. **Formatter Inheritance**: Totals use the same formatter as the column
4. **Smart Parsing**: Handles combined keys like `"sales_amount|currency"`
5. **Auto-Update**: Totals recalculate when data changes

### Formatter Support

Footer totals automatically inherit formatters from their columns:

```javascript
{
  key: 'revenue|currency',      // Pipe formatter
  label: 'Revenue',
  footer_total: true           // Total will be formatted as currency
},
{
  key: 'quantity',
  label: 'Quantity',
  formatter: 'number',         // Explicit formatter property
  footer_total: true          // Total will use number formatting
}
```

### Advanced Footer Configuration

```javascript
const table = new TableView({
  columns: [
    { key: 'product', label: 'Product' },
    { 
      key: 'price',
      label: 'Unit Price',
      formatter: 'currency'
    },
    {
      key: 'quantity', 
      label: 'Quantity',
      footer_total: true
    },
    {
      key: 'total|currency',
      label: 'Total',
      footer_total: true,
      formatter: (value, context) => {
        // Custom formatter also works with totals
        return `$${value.toFixed(2)}`;
      }
    }
  ]
});
```

### Footer Styling

Footer totals include professional styling:
- Light background with blue top border
- Bold "Totals" label in first column
- Right-aligned totals in primary color
- Responsive column support
- Dark theme compatibility

## Event Handling

### Table Events

```javascript
// Row events
table.on('row:click', ({ model, column, event }) => {
  console.log('Row clicked:', model);
});

table.on('row:view', ({ model, event }) => {
  console.log('View action:', model);
});

table.on('row:edit', ({ model, event }) => {
  console.log('Edit action:', model);
});

table.on('row:delete', ({ model, event }) => {
  console.log('Delete action:', model);
});

// Table events
table.on('table:add', ({ event }) => {
  console.log('Add button clicked');
});

table.on('table:export', ({ data, event }) => {
  console.log('Export data:', data);
});

// Search/filter events
table.on('table:search', ({ searchTerm, event }) => {
  console.log('Search:', searchTerm);
});

table.on('table:sort', ({ field, event }) => {
  console.log('Sort by:', field);
});

table.on('table:page', ({ page, event }) => {
  console.log('Page changed:', page);
});

// Parameter change event (useful for URL sync)
table.on('params-changed', () => {
  console.log('Table parameters changed');
});
```

### Custom Action Handlers

```javascript
// Override default handlers
const table = new TableView({
  onItemView: async (model, event) => {
    // Custom view logic
    const app = this.getApp();
    app.navigate(`/items/${model.id}`);
  },
  
  onItemEdit: async (model, event) => {
    // Custom edit logic
    const result = await showCustomEditDialog(model);
    if (result) {
      await model.save(result);
      await table.refresh();
    }
  },
  
  onItemDelete: async (model, event) => {
    // Custom delete logic with additional checks
    if (!canDelete(model)) {
      await Dialog.alert('Cannot delete this item');
      return;
    }
    
    const confirmed = await Dialog.confirm(`Delete ${model.get('name')}?`);
    if (confirmed) {
      await model.destroy();
      table.collection.remove(model);
    }
  }
});
```

## API Reference

### Properties

- `collection` - The data collection
- `columns` - Column definitions array
- `tableView` - Reference to self (for TableRow compatibility)
- `itemViews` - Map of model.id to TableRow views
- `selectedItems` - Set of selected item IDs

### Methods

#### Data Management
- `refresh()` - Reload and re-render data
- `getSelectedItems()` - Get array of selected items
- `clearSelection()` - Clear all selections
- `forEachItem(callback)` - Iterate over all rows

#### Filtering
- `setFilter(key, value)` - Set a filter value
- `getActiveFilters()` - Get all active filters
- `getAllAvailableFilters()` - Get filter configurations
- `updateFilterPills()` - Update filter pills display

#### Sorting
- `getSortBy()` - Get current sort field
- `getSortDirection()` - Get sort direction ('asc' or 'desc')
- `updateSortIcons()` - Update sort UI indicators

#### Actions
- `onActionSort(event, element)` - Handle sort action
- `onActionPage(event, element)` - Handle pagination
- `onActionApplySearch(event, element)` - Handle search
- `onActionAddFilter(event, element)` - Show filter dialog
- `onActionRemoveFilter(event, element)` - Remove a filter
- `onActionClearAllFilters(event, element)` - Clear all filters

## Complete Example

```javascript
import TableView from 'web-mojo/views/table/TableView.js';
import { ProductCollection, ProductModel } from '../models/ProductModel.js';
import ProductDetailView from '../views/ProductDetailView.js';

// Configure Model with forms
ProductModel.ADD_FORM = {
  title: 'Add Product',
  fields: [
    { name: 'name', label: 'Product Name', required: true },
    { name: 'sku', label: 'SKU', required: true },
    { name: 'price', label: 'Price', type: 'currency', required: true },
    { name: 'category', label: 'Category', type: 'select',
      options: ['Electronics', 'Clothing', 'Books', 'Home'] },
    { name: 'stock', label: 'Initial Stock', type: 'number', value: 0 }
  ]
};

ProductModel.VIEW_CLASS = ProductDetailView;

// Create table instance
class ProductTableView extends TableView {
  constructor(options = {}) {
    super({
      collection: new ProductCollection(),
      
      columns: [
        {
          key: 'image',
          label: '',
          width: '60px',
          formatter: (value) => `<img src="${value}" class="img-thumbnail" style="width: 50px;">`
        },
        {
          key: 'name',
          label: 'Product',
          sortable: true,
          action: 'row-click'
        },
        {
          key: 'sku',
          label: 'SKU',
          visibility: 'md'
        },
        {
          key: 'price',
          label: 'Price',
          formatter: 'currency',
          sortable: true
        },
        {
          key: 'stock',
          label: 'Stock',
          visibility: 'sm',
          formatter: (value) => {
            const color = value > 10 ? 'success' : value > 0 ? 'warning' : 'danger';
            return `<span class="badge bg-${color}">${value}</span>`;
          }
        },
        {
          key: 'category',
          label: 'Category',
          formatter: 'badge',
          filter: {
            type: 'select',
            options: ['Electronics', 'Clothing', 'Books', 'Home']
          }
        },
        {
          key: 'status',
          label: 'Status',
          visibility: 'lg',
          formatter: (value) => {
            const icons = {
              active: 'check-circle text-success',
              draft: 'pencil text-warning',
              archived: 'archive text-secondary'
            };
            return `<i class="bi bi-${icons[value]}"></i> ${value}`;
          },
          filter: {
            type: 'select',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'archived', label: 'Archived' }
            ]
          }
        }
      ],
      
      actions: ['view', 'edit', 'delete'],
      
      contextMenu: [
        { action: 'duplicate', label: 'Duplicate', icon: 'bi bi-copy' },
        { action: 'archive', label: 'Archive', icon: 'bi bi-archive' },
        { separator: true },
        { action: 'delete', label: 'Delete', icon: 'bi bi-trash', danger: true }
      ],
      
      batchActions: [
        { action: 'activate', label: 'Activate', icon: 'bi bi-check-circle' },
        { action: 'archive', label: 'Archive', icon: 'bi bi-archive' },
        { action: 'delete', label: 'Delete', icon: 'bi bi-trash', class: 'text-danger' }
      ],
      
      filters: [
        {
          key: 'price_range',
          label: 'Price Range',
          type: 'range',
          min: 0,
          max: 1000
        },
        {
          key: 'in_stock',
          label: 'In Stock Only',
          type: 'boolean'
        }
      ],
      
      selectionMode: 'multiple',
      searchable: true,
      sortable: true,
      filterable: true,
      paginated: true,
      
      showAdd: true,
      showExport: true,
      
      tableOptions: {
        striped: true,
        hover: true
      },
      
      ...options
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Handle batch actions
    this.on('batch:action', async ({ action, items }) => {
      switch(action) {
        case 'activate':
          await this.activateProducts(items);
          break;
        case 'archive':
          await this.archiveProducts(items);
          break;
        case 'delete':
          await this.deleteProducts(items);
          break;
      }
    });
    
    // Handle row click
    this.on('row:click', ({ model, column }) => {
      if (column === 'name') {
        // Navigate to product detail
        const app = this.getApp();
        app.navigate(`/products/${model.id}`);
      }
    });
  }
  
  async activateProducts(items) {
    for (const item of items) {
      await item.model.save({ status: 'active' });
    }
    await this.refresh();
    this.showSuccess(`${items.length} products activated`);
  }
  
  async archiveProducts(items) {
    const confirmed = await Dialog.confirm(
      `Archive ${items.length} products?`
    );
    
    if (confirmed) {
      for (const item of items) {
        await item.model.save({ status: 'archived' });
      }
      await this.refresh();
      this.showSuccess(`${items.length} products archived`);
    }
  }
  
  async deleteProducts(items) {
    const confirmed = await Dialog.confirm(
      `Delete ${items.length} products?`,
      'This action cannot be undone.'
    );
    
    if (confirmed) {
      for (const item of items) {
        await item.model.destroy();
      }
      await this.refresh();
      this.showSuccess(`${items.length} products deleted`);
    }
  }
}

// Usage
const productTable = new ProductTableView();
this.addChild(productTable);
```

## Best Practices

### 1. Use Model Configuration
Define forms and templates on your Model classes for reusability:
```javascript
Model.ADD_FORM = {...}
Model.EDIT_FORM = {...}
Model.VIEW_CLASS = CustomView
Model.DELETE_TEMPLATE = "..."
```

### 2. Responsive Column Design
Plan column visibility for different screen sizes:
- Always visible: Critical information (name, primary action)
- `sm`+: Important secondary info
- `md`+: Useful context
- `lg`+: Nice to have details
- `xl`+: Additional metadata

### 3. Efficient Formatters
Use built-in formatters when possible, function formatters for complex logic:
```javascript
// Good - built-in formatter
{ formatter: 'currency' }

// Good - function for complex logic
{ formatter: (value, context) => customFormat(value) }

// Avoid - inline complex HTML
{ formatter: (value) => /* complex HTML string */ }
```

### 4. Event Delegation
TableView uses automatic event delegation - use data-action attributes:
```javascript
// Actions are automatically routed to onAction* methods
// data-action="edit" → onActionEdit(event, element)
```

### 5. Performance Tips
- TableView only re-renders changed rows
- Use pagination for large datasets
- Consider virtual scrolling for very large lists
- Keep formatters lightweight

The TableView component provides a powerful, efficient data table solution that leverages ListView's view management for optimal performance while maintaining a rich feature set perfect for modern web applications.