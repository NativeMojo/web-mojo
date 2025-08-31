# TablePage Component

The TablePage component is a specialized Page that provides complete table functionality with automatic URL parameter synchronization. It leverages the new TableView component (which extends ListView) for efficient row-based rendering where each row is a separate view that only re-renders when its model changes.

## Overview

TablePage combines:
- **TableView Component**: Advanced data table extending ListView for efficient rendering
- **URL Synchronization**: Automatic syncing of pagination, sorting, and filtering with URL parameters
- **Page Lifecycle**: Full page routing and lifecycle management
- **Model Operations**: Built-in support for view, edit, delete with fallback patterns

## Features

- **Efficient Rendering**: Each row is a separate TableRow view (extends ListViewItem)
- **URL State Management**: Maintains table state across navigation
- **Responsive Columns**: Column visibility control at different breakpoints
- **Smart Form Handling**: Automatic form configuration from Models
- **Filter System**: Advanced filtering with pills and dropdown UI
- **Batch Operations**: Multi-select with batch action panel
- **Live Search**: Real-time search with URL synchronization

## Basic Usage

### Simple TablePage

```javascript
import TablePage from 'web-mojo/pages/TablePage.js';
import UserCollection from './collections/UserCollection.js';

class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'users',
      route: '/users',
      title: 'User Management',
      Collection: UserCollection,
      
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email', visibility: 'md' }, // Hidden on mobile
        { key: 'role', label: 'Role', type: 'badge' },
        { key: 'created_at', label: 'Created', formatter: 'date', visibility: 'lg' }
      ],
      
      actions: ['view', 'edit', 'delete'],
      ...options
    });
  }
}

// Register with WebApp
app.registerPage('users', UsersPage);
```

### TablePage with Model-Based Forms

```javascript
class ProductsPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'products',
      title: 'Product Catalog',
      Collection: ProductCollection,
      
      columns: [
        { key: 'image', label: '', width: '60px', 
          formatter: (value) => `<img src="${value}" class="img-thumbnail" style="width: 50px;">` },
        { key: 'name', label: 'Product', sortable: true },
        { key: 'price', label: 'Price', formatter: 'currency', sortable: true },
        { key: 'stock', label: 'Stock', visibility: 'md' },
        { key: 'status', label: 'Status', formatter: 'badge',
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
      
      // Form configurations (can also be defined on Model class)
      addForm: {
        title: 'Add Product',
        fields: [
          { name: 'name', label: 'Product Name', required: true },
          { name: 'price', label: 'Price', type: 'currency', required: true },
          { name: 'stock', label: 'Initial Stock', type: 'number', value: 0 },
          { name: 'status', label: 'Status', type: 'select',
            options: ['active', 'draft'] }
        ]
      },
      
      editForm: {
        title: 'Edit Product',
        fields: [
          { name: 'name', label: 'Product Name', required: true },
          { name: 'price', label: 'Price', type: 'currency', required: true },
          { name: 'stock', label: 'Stock Level', type: 'number' },
          { name: 'status', label: 'Status', type: 'select',
            options: ['active', 'draft', 'archived'] }
        ]
      },
      
      actions: ['view', 'edit', 'delete'],
      showAdd: true,
      showExport: true,
      
      ...options
    });
  }
}
```

## Configuration Options

### Constructor Options

```javascript
const tablePage = new TablePage({
  // Page configuration
  pageName: 'users',              // Page name for routing
  route: '/users',                // Route pattern
  title: 'User Management',       // Page title
  description: 'Manage users',    // Page description
  
  // Data source
  Collection: UserCollection,     // Collection class
  collection: userCollection,     // Or existing instance
  defaultQuery: {                 // Default URL query params
    status: 'active'
  },
  
  // Table configuration (passed to TableView)
  columns: [...],                 // Column definitions
  actions: ['view', 'edit', 'delete'], // Row actions
  contextMenu: [...],             // Context menu items
  batchActions: [...],            // Batch operations
  
  // Form configurations
  addForm: {...},                 // Add form config or fields array
  editForm: {...},                // Edit form config or fields array
  formFields: [...],              // Legacy: shared form fields
  
  // Model operations
  itemView: CustomItemView,       // Custom view class for viewing items
  deleteTemplate: 'Delete {{name}}?', // Delete confirmation template
  formDialogConfig: {             // Dialog options for forms
    size: 'lg',
    centered: true
  },
  
  // Features
  searchable: true,               // Enable search
  sortable: true,                 // Enable sorting
  filterable: true,               // Enable filters
  paginated: true,                // Enable pagination
  selectionMode: 'multiple',      // 'none', 'single', 'multiple'
  
  // Filter configuration
  filters: [...],                 // Additional filters beyond columns
  hideActivePills: false,         // Hide filter pills display
  hideActivePillNames: ['status'], // Hide specific filter pills
  searchPlacement: 'toolbar',     // 'toolbar' or 'dropdown'
  
  // Display options
  tableOptions: {                 // HTML table styling
    striped: true,
    bordered: false,
    hover: true,
    responsive: false
  },
  
  // Toolbar options
  showAdd: true,                  // Show Add button
  showExport: true,               // Show Export button
  
  // URL synchronization
  urlSyncEnabled: true,           // Sync with URL params
  
  // Custom handlers
  onItemView: async (model) => {},
  onItemEdit: async (model) => {},
  onItemDelete: async (model) => {},
  onAdd: async () => {},
  onExport: async (data) => {}
});
```

### Column Configuration

```javascript
columns: [
  {
    key: 'name',                    // Model property key
    label: 'Full Name',             // Column header
    sortable: true,                 // Enable sorting
    
    // Responsive visibility
    visibility: 'md',               // 'sm', 'md', 'lg', 'xl', 'xxl'
                                   // Column hidden below this breakpoint
    
    // Formatting
    formatter: 'currency',          // Built-in formatter string
    formatter: (value, context) => { // Or function formatter
      return `<strong>${value}</strong>`;
    },
    
    // Filtering
    filter: {                       // Enable column filter
      type: 'select',              // Filter type
      label: 'Status Filter',      // Filter label
      options: [                   // Filter options
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    
    // Styling
    class: 'text-nowrap',          // CSS classes
    width: '200px',                // Fixed width
    
    // Cell action
    action: 'row-click'            // Action on cell click
  }
]
```

## Model-Based Configuration

The TablePage intelligently reads configuration from your Model classes:

```javascript
// In your Model class
class UserModel extends Model {
  static MODEL_NAME = 'User';
  
  // Form configuration for adding
  static ADD_FORM = {
    title: 'Add User',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'role', label: 'Role', type: 'select',
        options: ['admin', 'user'] }
    ]
  };
  
  // Form configuration for editing
  static EDIT_FORM = {
    title: 'Edit User',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'role', label: 'Role', type: 'select',
        options: ['admin', 'moderator', 'user'] },
      { name: 'status', label: 'Status', type: 'select',
        options: ['active', 'suspended', 'deleted'] }
    ]
  };
  
  // Custom view class for viewing
  static VIEW_CLASS = UserDetailView;
  
  // Delete confirmation template
  static DELETE_TEMPLATE = 'Are you sure you want to delete user "{{name}}"? This will also remove all their data.';
  
  // Dialog configuration
  static FORM_DIALOG_CONFIG = {
    size: 'lg',
    centered: false
  };
}

// Simple TablePage using Model configuration
class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'users',
      Collection: UserCollection, // UserCollection uses UserModel
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', formatter: 'badge' }
      ],
      actions: ['view', 'edit', 'delete'],
      ...options
    });
  }
  // All form configurations are automatically read from UserModel!
}
```

## URL Synchronization

### Automatic URL Parameter Mapping

```javascript
// URL: /users?start=20&size=10&sort=-created_at&search=john&status=active

// Automatically maps to:
// - Pagination: start at item 20, show 10 per page
// - Sorting: sort by created_at descending (- prefix)
// - Search: filter for "john"
// - Filter: status = "active"
```

### URL Parameter Reference

| Parameter | Description | Example |
|-----------|-------------|---------|
| `start` | Pagination offset | `?start=20` |
| `size` | Page size | `?size=50` |
| `sort` | Sort field (- for desc) | `?sort=-name` |
| `search` | Search term | `?search=john` |
| Custom | Column/filter values | `?status=active&role=admin` |

### Programmatic URL Updates

```javascript
// The table automatically updates URL when state changes
this.tableView.setFilter('status', 'active');  // Adds ?status=active
this.tableView.onActionSort(event, element);    // Updates ?sort=field
this.tableView.onActionPage(event, element);    // Updates ?start=offset
```

## Event Handling

### TablePage Events

```javascript
class MyTablePage extends TablePage {
  setupEventListeners() {
    super.setupEventListeners();
    
    // TableView events
    this.tableView.on('row:view', async ({ model }) => {
      console.log('Viewing:', model);
    });
    
    this.tableView.on('row:edit', async ({ model }) => {
      console.log('Editing:', model);
    });
    
    this.tableView.on('row:delete', async ({ model }) => {
      console.log('Deleting:', model);
    });
    
    this.tableView.on('table:add', async () => {
      console.log('Adding new item');
    });
    
    this.tableView.on('table:export', async ({ data }) => {
      console.log('Exporting:', data);
    });
    
    // Filter events
    this.tableView.on('table:search', ({ searchTerm }) => {
      console.log('Search:', searchTerm);
    });
    
    this.tableView.on('table:sort', ({ field }) => {
      console.log('Sort by:', field);
    });
    
    this.tableView.on('params-changed', () => {
      console.log('Table params changed');
    });
  }
}
```

### Custom Action Handlers

```javascript
class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      // ... configuration
      
      // Custom handlers override default behavior
      onItemView: async (model) => {
        // Custom view logic
        const app = this.getApp();
        app.navigate(`/users/${model.id}/profile`);
      },
      
      onItemEdit: async (model) => {
        // Custom edit logic
        const result = await this.showCustomEditDialog(model);
        if (result) {
          await model.save(result);
          await this.refresh();
        }
      },
      
      onItemDelete: async (model) => {
        // Custom delete logic with additional checks
        if (model.get('role') === 'admin') {
          await Dialog.alert('Cannot delete admin users');
          return;
        }
        
        const confirmed = await Dialog.confirm(
          `Delete ${model.get('name')}?`
        );
        if (confirmed) {
          await model.destroy();
          this.collection.remove(model);
        }
      },
      
      ...options
    });
  }
}
```

## Advanced Features

### Responsive Column Visibility

```javascript
columns: [
  { key: 'id', label: 'ID', visibility: 'xl' },        // Only on XL screens
  { key: 'name', label: 'Name' },                      // Always visible
  { key: 'email', label: 'Email', visibility: 'sm' },  // Hidden on XS only
  { key: 'phone', label: 'Phone', visibility: 'md' },  // Hidden on XS/SM
  { key: 'address', label: 'Address', visibility: 'lg' }, // Hidden on XS/SM/MD
  { key: 'notes', label: 'Notes', visibility: 'xl' }   // Only on XL+
]
```

### Batch Operations

```javascript
class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      selectionMode: 'multiple',
      
      batchActions: [
        {
          action: 'activate',
          label: 'Activate',
          icon: 'bi bi-check-circle'
        },
        {
          action: 'deactivate', 
          label: 'Deactivate',
          icon: 'bi bi-x-circle'
        },
        {
          action: 'delete',
          label: 'Delete Selected',
          icon: 'bi bi-trash',
          class: 'text-danger'
        }
      ],
      
      ...options
    });
  }
  
  setupEventListeners() {
    super.setupEventListeners();
    
    this.tableView.on('batch:action', async ({ action, items }) => {
      switch(action) {
        case 'activate':
          for (const item of items) {
            await item.model.save({ status: 'active' });
          }
          await this.refresh();
          break;
          
        case 'delete':
          const confirmed = await Dialog.confirm(
            `Delete ${items.length} items?`
          );
          if (confirmed) {
            for (const item of items) {
              await item.model.destroy();
            }
            await this.refresh();
          }
          break;
      }
    });
  }
}
```

### Advanced Filtering

```javascript
class ProductsPage extends TablePage {
  constructor(options = {}) {
    super({
      // Column-based filters
      columns: [
        {
          key: 'category',
          label: 'Category',
          filter: {
            type: 'select',
            label: 'Product Category',
            options: [
              { value: 'electronics', label: 'Electronics' },
              { value: 'clothing', label: 'Clothing' },
              { value: 'books', label: 'Books' }
            ]
          }
        },
        {
          key: 'price',
          label: 'Price',
          formatter: 'currency',
          filter: {
            type: 'range',
            min: 0,
            max: 1000,
            step: 10
          }
        }
      ],
      
      // Additional filters not tied to columns
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
          label: 'On Sale',
          type: 'boolean'
        }
      ],
      
      // Control filter pill display
      hideActivePillNames: ['category'], // Don't show pill for category filter
      
      ...options
    });
  }
}
```

### Custom Row Actions

```javascript
class OrdersPage extends TablePage {
  constructor(options = {}) {
    super({
      // Custom action objects
      actions: [
        {
          action: 'view',
          label: 'View',
          icon: 'bi bi-eye',
          class: 'btn-outline-primary'
        },
        {
          action: 'invoice',
          label: 'Invoice',
          icon: 'bi bi-file-pdf',
          class: 'btn-outline-info'
        },
        {
          action: 'ship',
          label: 'Ship',
          icon: 'bi bi-truck',
          class: 'btn-outline-success'
        },
        {
          action: 'cancel',
          label: 'Cancel',
          icon: 'bi bi-x-circle',
          class: 'btn-outline-danger'
        }
      ],
      
      ...options
    });
  }
  
  setupEventListeners() {
    super.setupEventListeners();
    
    // Custom action handlers
    this.tableView.element.addEventListener('click', async (e) => {
      if (e.target.closest('[data-action="invoice"]')) {
        const row = e.target.closest('tr');
        const modelId = row.getAttribute('data-id');
        const order = this.collection.get(modelId);
        await this.generateInvoice(order);
      }
      
      if (e.target.closest('[data-action="ship"]')) {
        const row = e.target.closest('tr');
        const modelId = row.getAttribute('data-id');
        const order = this.collection.get(modelId);
        await this.shipOrder(order);
      }
    });
  }
}
```

## Complete Example

```javascript
import TablePage from 'web-mojo/pages/TablePage.js';
import { UserCollection, UserModel } from '../models/UserModel.js';
import UserDetailView from '../views/UserDetailView.js';

// Configure Model with form definitions
UserModel.ADD_FORM = {
  title: 'Add New User',
  fields: [
    { name: 'name', label: 'Full Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'role', label: 'Role', type: 'select',
      options: ['admin', 'moderator', 'user'] },
    { name: 'send_welcome', label: 'Send Welcome Email', type: 'checkbox' }
  ]
};

UserModel.VIEW_CLASS = UserDetailView;
UserModel.DELETE_TEMPLATE = 'Delete user "{{name}}" ({{email}})? This cannot be undone.';

// Create the TablePage
class UsersManagementPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'users',
      route: '/admin/users',
      title: 'User Management',
      description: 'Manage system users and permissions',
      
      Collection: UserCollection,
      
      columns: [
        { 
          key: 'avatar',
          label: '',
          width: '50px',
          formatter: (value) => `<img src="${value}" class="rounded-circle" style="width: 40px;">`
        },
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email', visibility: 'sm' },
        { key: 'phone', label: 'Phone', visibility: 'md' },
        { 
          key: 'role',
          label: 'Role',
          formatter: 'badge',
          filter: {
            type: 'select',
            options: [
              { value: 'admin', label: 'Administrator' },
              { value: 'moderator', label: 'Moderator' },
              { value: 'user', label: 'User' }
            ]
          }
        },
        {
          key: 'status',
          label: 'Status',
          formatter: (value) => {
            const colors = {
              active: 'success',
              inactive: 'secondary',
              suspended: 'warning'
            };
            return `<span class="badge bg-${colors[value]}">${value}</span>`;
          },
          filter: {
            type: 'select',
            options: ['active', 'inactive', 'suspended']
          }
        },
        { key: 'last_login', label: 'Last Login', formatter: 'datetime', visibility: 'lg' },
        { key: 'created_at', label: 'Joined', formatter: 'date', visibility: 'xl', sortable: true }
      ],
      
      actions: ['view', 'edit', 'delete'],
      
      batchActions: [
        { action: 'activate', label: 'Activate', icon: 'bi bi-check-circle' },
        { action: 'suspend', label: 'Suspend', icon: 'bi bi-pause-circle' },
        { action: 'delete', label: 'Delete', icon: 'bi bi-trash', class: 'text-danger' }
      ],
      
      selectionMode: 'multiple',
      searchable: true,
      sortable: true,
      filterable: true,
      paginated: true,
      
      showAdd: true,
      showExport: true,
      
      defaultQuery: {
        size: 25,
        sort: '-created_at'
      },
      
      onItemView: async (model) => {
        // Custom view behavior - navigate to detail page
        const app = this.getApp();
        app.navigate(`/admin/users/${model.id}`);
      },
      
      onExport: async (data) => {
        // Custom export logic
        const csv = this.convertToCSV(data);
        this.downloadFile(csv, 'users.csv');
      },
      
      ...options
    });
  }
  
  setupEventListeners() {
    super.setupEventListeners();
    
    // Handle batch actions
    this.tableView.on('batch:action', async ({ action, items }) => {
      switch(action) {
        case 'activate':
          await this.activateUsers(items);
          break;
        case 'suspend':
          await this.suspendUsers(items);
          break;
        case 'delete':
          await this.deleteUsers(items);
          break;
      }
    });
  }
  
  async activateUsers(items) {
    for (const item of items) {
      await item.model.save({ status: 'active' });
    }
    await this.refresh();
    this.showSuccess(`${items.length} users activated`);
  }
  
  async suspendUsers(items) {
    const confirmed = await Dialog.confirm(
      `Suspend ${items.length} users?`,
      'They will not be able to log in.'
    );
    
    if (confirmed) {
      for (const item of items) {
        await item.model.save({ status: 'suspended' });
      }
      await this.refresh();
      this.showSuccess(`${items.length} users suspended`);
    }
  }
  
  async deleteUsers(items) {
    const confirmed = await Dialog.confirm(
      `Permanently delete ${items.length} users?`,
      'This action cannot be undone.'
    );
    
    if (confirmed) {
      for (const item of items) {
        await item.model.destroy();
      }
      await this.refresh();
      this.showSuccess(`${items.length} users deleted`);
    }
  }
  
  convertToCSV(data) {
    // CSV conversion logic
    const headers = ['Name', 'Email', 'Role', 'Status', 'Joined'];
    const rows = data.map(user => [
      user.name,
      user.email,
      user.role,
      user.status,
      new Date(user.created_at).toLocaleDateString()
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
  
  downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export default UsersManagementPage;
```

## Migration from Legacy TablePage

If migrating from the old Table component:

1. **Property Mapping**: The new TablePage automatically maps legacy properties:
   - `formFields` → `addForm` / `editForm`
   - `formCreate` → `addForm`
   - `formEdit` → `editForm`
   - `selectable` → `selectionMode`

2. **Event Changes**: Events now emit from `tableView`:
   - Listen to `this.tableView.on()` instead of `this.table.on()`
   - Row events: `row:view`, `row:edit`, `row:delete`
   - Table events: `table:add`, `table:export`

3. **Column Visibility**: Use Bootstrap breakpoints for responsive columns
   - Old: `visible: ['desktop']`
   - New: `visibility: 'md'`

4. **Form Handling**: Forms can now be defined on Model classes
   - Define `ADD_FORM`, `EDIT_FORM` on your Model
   - Or pass `addForm`, `editForm` to TablePage

The new TablePage with TableView provides better performance through ListView's efficient rendering system while maintaining all the powerful features of the original Table component.