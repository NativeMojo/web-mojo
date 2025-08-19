# Table Component

The Table component is a powerful, feature-rich data table built for the MOJO framework. It provides comprehensive table functionality including pagination, sorting, filtering, searching, batch operations, and context menus with automatic event handling and lifecycle management.

## Features

- **Data Management**: Works with Collections and Models for automatic data binding
- **Pagination**: Built-in pagination with configurable page sizes
- **Sorting**: Click-to-sort columns with visual indicators
- **Filtering**: Advanced filtering with dropdown UI and active filter pills
- **Searching**: Global search across all visible columns
- **Selection**: Single and multiple row selection with batch operations
- **Actions**: Row-level and batch actions with context menus
- **Export**: CSV export functionality
- **Responsive**: Mobile-friendly responsive design
- **Customizable**: Flexible column definitions with custom formatters
- **Permissions**: Built-in permission checking for actions

## Basic Usage

### Simple Table

```javascript
import { Table } from 'web-mojo';
import { UserCollection } from 'web-mojo/models';

class UsersTable extends Table {
  constructor(options = {}) {
    super({
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'created_at', label: 'Created', formatter: 'date' }
      ],
      collection: new UserCollection(),
      ...options
    });
  }
}

// Usage in a page or view
const usersTable = new UsersTable({
  container: '#users-table'
});
this.addChild(usersTable);
```

### Table with Actions

```javascript
class UsersTable extends Table {
  constructor(options = {}) {
    super({
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'status', label: 'Status', formatter: 'badge' }
      ],
      collection: new UserCollection(),
      actions: [
        { key: 'edit', label: 'Edit', icon: 'edit' },
        { key: 'delete', label: 'Delete', icon: 'trash', class: 'text-danger' }
      ],
      batchActions: [
        { key: 'activate', label: 'Activate Selected' },
        { key: 'deactivate', label: 'Deactivate Selected' }
      ],
      ...options
    });
  }

  // Handle row-level edit action
  async handleActionEdit(event, element) {
    const itemId = element.getAttribute('data-id');
    const user = this.collection.get(itemId);
    
    const formView = new UserFormView({ model: user });
    const result = await Dialog.showForm(formView, {
      title: 'Edit User'
    });

    if (result) {
      await user.save(result);
      await this.refresh();
    }
  }

  // Handle batch activate action
  async handleActionActivate(event, element) {
    const selectedItems = this.getSelectedItems();
    
    for (const item of selectedItems) {
      await item.save({ status: 'active' });
    }
    
    this.clearSelection();
    await this.refresh();
    this.showSuccess(`${selectedItems.length} users activated`);
  }
}
```

## Configuration Options

### Constructor Options

```javascript
const table = new Table({
  // Data
  collection: myCollection,        // Collection instance for data
  model: MyModel,                 // Model class for new items
  
  // Display
  columns: [...],                 // Column definitions (required)
  title: 'My Data',              // Table title
  emptyMessage: 'No data found', // Message when no data
  
  // Features
  searchable: true,              // Enable global search
  sortable: true,                // Enable column sorting
  filterable: true,              // Enable filtering
  selectable: true,              // Enable row selection
  exportable: true,              // Enable CSV export
  
  // Pagination
  paginated: true,               // Enable pagination
  pageSize: 20,                  // Items per page
  pageSizeOptions: [10, 20, 50], // Available page sizes
  
  // Actions
  actions: [...],                // Row-level actions
  batchActions: [...],           // Batch actions for selected items
  toolbarActions: [...],         // Toolbar actions (add, refresh, etc.)
  
  // Permissions
  permissions: {
    create: 'user.create',
    edit: 'user.edit',
    delete: 'user.delete'
  },
  
  // Styling
  tableClass: 'table-striped',   // Additional CSS classes
  responsive: true,              // Responsive table wrapper
  striped: true,                 // Striped rows
  hover: true                    // Hover effects
});
```

### Column Definitions

```javascript
columns: [
  {
    key: 'name',                    // Data property key
    label: 'Full Name',             // Column header
    sortable: true,                 // Enable sorting
    searchable: true,               // Include in search
    formatter: 'text',              // Value formatter
    width: '200px',                 // Column width
    align: 'left',                  // Text alignment
    class: 'font-weight-bold',      // CSS classes
    render: (value, item) => {      // Custom render function
      return `<strong>${value}</strong>`;
    }
  },
  {
    key: 'email',
    label: 'Email',
    formatter: 'email',             // Email formatter (creates mailto link)
    searchable: true
  },
  {
    key: 'created_at',
    label: 'Created',
    formatter: 'datetime',          // Date/time formatter
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    formatter: 'badge',             // Badge formatter
    filterOptions: [                // Filter dropdown options
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]
  }
]
```

## Built-in Formatters

The Table component includes several built-in formatters:

- **text**: Plain text (default)
- **email**: Creates mailto link
- **url**: Creates clickable link
- **date**: Formats date (YYYY-MM-DD)
- **datetime**: Formats date and time
- **time**: Formats time only
- **currency**: Formats as currency ($1,234.56)
- **number**: Formats numbers with commas
- **percent**: Formats as percentage
- **boolean**: Shows Yes/No or checkmark
- **badge**: Creates Bootstrap badge
- **truncate**: Truncates long text with ellipsis

### Custom Formatters

```javascript
// Register custom formatter
Table.registerFormatter('status-icon', (value, item, column) => {
  const icon = value === 'active' ? 'check-circle' : 'x-circle';
  const color = value === 'active' ? 'success' : 'danger';
  return `<i class="fas fa-${icon} text-${color}"></i>`;
});

// Use in column definition
columns: [
  {
    key: 'status',
    label: 'Status',
    formatter: 'status-icon'
  }
]
```

## Event Handling

The Table component uses MOJO's automatic event delegation system:

### Action Handlers

```javascript
class MyTable extends Table {
  // Row action: data-action="edit" -> handleActionEdit()
  async handleActionEdit(event, element) {
    const itemId = element.getAttribute('data-id');
    const item = this.collection.get(itemId);
    // Handle edit logic
  }

  // Batch action: data-action="delete-selected" -> handleActionDeleteSelected()
  async handleActionDeleteSelected(event, element) {
    const selectedItems = this.getSelectedItems();
    const confirmed = await Dialog.confirm(
      `Delete ${selectedItems.length} items?`
    );
    
    if (confirmed) {
      for (const item of selectedItems) {
        await item.destroy();
      }
      this.clearSelection();
      await this.refresh();
    }
  }

  // Toolbar action: data-action="add" -> handleActionAdd()
  async handleActionAdd(event, element) {
    const formView = new ItemFormView();
    const result = await Dialog.showForm(formView, {
      title: 'Add New Item'
    });

    if (result) {
      const item = new this.model(result);
      await item.save();
      this.collection.add(item);
      await this.refresh();
    }
  }
}
```

### Lifecycle Events

```javascript
class MyTable extends Table {
  async onInit() {
    await super.onInit();
    // Custom initialization
  }

  async onBeforeRender() {
    await super.onBeforeRender();
    // Pre-render setup
  }

  async onAfterRender() {
    await super.onAfterRender();
    // Post-render setup
  }

  // Item event handlers
  async onItemClicked(item, event, element) {
    // Handle item click
    console.log('Item clicked:', item);
  }

  async onItemEdit(item, result) {
    // Handle after item edit
    console.log('Item edited:', item, result);
  }

  async onItemAdd(item) {
    // Handle after item add
    console.log('Item added:', item);
  }

  async onItemDelete(item) {
    // Handle after item delete
    console.log('Item deleted:', item);
  }
}
```

## Advanced Features

### Filtering

```javascript
// Configure filterable columns
columns: [
  {
    key: 'status',
    label: 'Status',
    filterable: true,
    filterOptions: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'pending', label: 'Pending' }
    ]
  }
]

// Programmatic filtering
table.setFilter('status', 'active');
table.setFilter('category', ['tech', 'business']); // Multiple values

// Get active filters
const filters = table.activeFilters; // { status: 'active', category: ['tech', 'business'] }

// Clear filters
table.handleClearAllFilters();
```

### Selection Management

```javascript
// Enable selection
const table = new Table({
  selectable: true,
  // ... other options
});

// Get selected items
const selectedItems = table.getSelectedItems();

// Clear selection
table.clearSelection();

// Check if all items are selected
const allSelected = table.isAllSelected();

// Handle selection events
table.on('selection-changed', (selectedItems) => {
  console.log('Selection changed:', selectedItems);
});
```

### Context Menus

```javascript
// Enable context menus with custom actions
const table = new Table({
  contextMenu: true,
  contextMenuActions: [
    { key: 'view', label: 'View Details', icon: 'eye' },
    { key: 'edit', label: 'Edit', icon: 'edit' },
    { key: 'duplicate', label: 'Duplicate', icon: 'copy' },
    { key: 'delete', label: 'Delete', icon: 'trash', class: 'text-danger' }
  ],
  // ... other options
});

// Handle context menu actions
class MyTable extends Table {
  async handleActionContextMenuView(event, element) {
    const itemId = element.getAttribute('data-id');
    const item = this.collection.get(itemId);
    // Show item details
  }

  async handleActionContextMenuDuplicate(event, element) {
    const itemId = element.getAttribute('data-id');
    const item = this.collection.get(itemId);
    const duplicate = item.clone();
    await duplicate.save();
    this.collection.add(duplicate);
    await this.refresh();
  }
}
```

### CSV Export

```javascript
// Enable export
const table = new Table({
  exportable: true,
  exportFilename: 'my-data.csv',
  // ... other options
});

// Programmatic export
table.handleExport();

// Custom export data processing
class MyTable extends Table {
  exportToCSV(filename = null) {
    const data = this.getVisibleItems().map(item => ({
      'Full Name': item.get('name'),
      'Email': item.get('email'),
      'Status': item.get('status').toUpperCase(),
      'Created': new Date(item.get('created_at')).toLocaleDateString()
    }));

    return super.exportToCSV(filename, data);
  }
}
```

## API Reference

### Properties

- `collection` - The data collection
- `model` - Model class for new items
- `columns` - Column definitions array
- `selectedItems` - Array of selected item IDs
- `activeFilters` - Object of active filters
- `sortBy` - Current sort column
- `sortDirection` - Current sort direction ('asc' or 'desc')
- `start` - Current pagination offset
- `size` - Current page size

### Methods

#### Data Management
- `async loadDataIfNeeded()` - Load data if not already loaded
- `async refresh()` - Reload data and re-render table
- `getVisibleItems()` - Get currently visible items after filtering
- `processData()` - Apply sorting and filtering to data

#### Pagination
- `setStart(start)` - Set pagination offset
- `setSize(size)` - Set page size
- `async handlePageChange(page)` - Navigate to specific page
- `async handlePageSizeChange(size)` - Change page size

#### Sorting
- `setSort(column, direction)` - Set sort column and direction
- `async handleSort(column)` - Handle column sort click

#### Filtering
- `setFilter(column, value)` - Set filter for column
- `async handleRemoveFilter(column)` - Remove specific filter
- `async handleClearAllFilters()` - Clear all filters

#### Selection
- `getSelectedItems()` - Get array of selected model instances
- `clearSelection()` - Clear all selections
- `handleSelectAll()` - Toggle select all
- `handleSelectItem(itemId, checked)` - Select/deselect specific item
- `isAllSelected()` - Check if all items are selected

#### UI
- `async render()` - Re-render entire table
- `updateLoadingState()` - Show/hide loading indicators
- `updateSelectionDisplay()` - Update selection UI elements
- `showError(message)` - Display error message
- `showSuccess(message)` - Display success message

### Events

The Table component emits events that can be listened to:

```javascript
table.on('data-loaded', (data) => {
  console.log('Data loaded:', data);
});

table.on('selection-changed', (selectedItems) => {
  console.log('Selection changed:', selectedItems);
});

table.on('sort-changed', ({ column, direction }) => {
  console.log('Sort changed:', column, direction);
});

table.on('filter-changed', (filters) => {
  console.log('Filters changed:', filters);
});

table.on('page-changed', ({ start, size }) => {
  console.log('Page changed:', start, size);
});
```

## Complete Example

Here's a complete example showing all major features:

```javascript
import { Table } from 'web-mojo';
import { UserCollection, User } from 'web-mojo/models';
import { UserFormView } from '../views/UserFormView.js';

class UsersTable extends Table {
  constructor(options = {}) {
    super({
      title: 'User Management',
      collection: new UserCollection(),
      model: User,
      
      columns: [
        { 
          key: 'avatar', 
          label: '', 
          width: '50px',
          render: (value, item) => `<img src="${value}" class="avatar-sm rounded-circle" alt="Avatar">`
        },
        { key: 'name', label: 'Name', sortable: true, searchable: true },
        { key: 'email', label: 'Email', formatter: 'email', sortable: true, searchable: true },
        { 
          key: 'role', 
          label: 'Role', 
          sortable: true,
          filterable: true,
          filterOptions: [
            { value: 'admin', label: 'Admin' },
            { value: 'user', label: 'User' },
            { value: 'moderator', label: 'Moderator' }
          ]
        },
        { 
          key: 'status', 
          label: 'Status', 
          formatter: 'badge',
          filterable: true,
          filterOptions: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]
        },
        { key: 'last_login', label: 'Last Login', formatter: 'datetime', sortable: true },
        { key: 'created_at', label: 'Created', formatter: 'date', sortable: true }
      ],
      
      actions: [
        { key: 'edit', label: 'Edit', icon: 'edit' },
        { key: 'reset-password', label: 'Reset Password', icon: 'key' },
        { key: 'delete', label: 'Delete', icon: 'trash', class: 'text-danger' }
      ],
      
      batchActions: [
        { key: 'activate', label: 'Activate Selected' },
        { key: 'deactivate', label: 'Deactivate Selected' },
        { key: 'delete-selected', label: 'Delete Selected', class: 'text-danger' }
      ],
      
      toolbarActions: [
        { key: 'add', label: 'Add User', icon: 'plus', class: 'btn-primary' }
      ],
      
      searchable: true,
      sortable: true,
      filterable: true,
      selectable: true,
      exportable: true,
      paginated: true,
      pageSize: 20,
      
      permissions: {
        create: 'users.create',
        edit: 'users.edit',
        delete: 'users.delete'
      },
      
      ...options
    });
  }

  // Action handlers
  async handleActionAdd(event, element) {
    const formView = new UserFormView();
    const result = await Dialog.showForm(formView, {
      title: 'Add New User'
    });

    if (result) {
      const user = new User(result);
      await user.save();
      this.collection.add(user);
      await this.refresh();
      this.showSuccess('User added successfully');
    }
  }

  async handleActionEdit(event, element) {
    const userId = element.getAttribute('data-id');
    const user = this.collection.get(userId);
    
    const formView = new UserFormView({ model: user });
    const result = await Dialog.showForm(formView, {
      title: 'Edit User'
    });

    if (result) {
      await user.save(result);
      await this.refresh();
      this.showSuccess('User updated successfully');
    }
  }

  async handleActionResetPassword(event, element) {
    const userId = element.getAttribute('data-id');
    const user = this.collection.get(userId);
    
    const confirmed = await Dialog.confirm(
      `Reset password for ${user.get('name')}?`,
      'A new password will be sent to their email address.'
    );

    if (confirmed) {
      try {
        await user.resetPassword();
        this.showSuccess('Password reset email sent');
      } catch (error) {
        this.showError('Failed to reset password: ' + error.message);
      }
    }
  }

  async handleActionDelete(event, element) {
    const userId = element.getAttribute('data-id');
    const user = this.collection.get(userId);
    
    const confirmed = await Dialog.confirm(
      `Delete ${user.get('name')}?`,
      'This action cannot be undone.'
    );

    if (confirmed) {
      await user.destroy();
      this.collection.remove(user);
      await this.refresh();
      this.showSuccess('User deleted successfully');
    }
  }

  // Batch actions
  async handleActionActivate(event, element) {
    const selectedUsers = this.getSelectedItems();
    
    for (const user of selectedUsers) {
      await user.save({ status: 'active' });
    }
    
    this.clearSelection();
    await this.refresh();
    this.showSuccess(`${selectedUsers.length} users activated`);
  }

  async handleActionDeleteSelected(event, element) {
    const selectedUsers = this.getSelectedItems();
    
    const confirmed = await Dialog.confirm(
      `Delete ${selectedUsers.length} selected users?`,
      'This action cannot be undone.'
    );

    if (confirmed) {
      for (const user of selectedUsers) {
        await user.destroy();
        this.collection.remove(user);
      }
      
      this.clearSelection();
      await this.refresh();
      this.showSuccess(`${selectedUsers.length} users deleted`);
    }
  }

  // Lifecycle events
  async onItemClicked(item, event, element) {
    // Navigate to user detail page
    const app = this.getApp();
    app.navigate(`/users/${item.get('id')}`);
  }
}

// Usage
const usersTable = new UsersTable({
  container: '#users-table-container'
});

// Add to parent view
this.addChild(usersTable);
```

This Table component provides a complete data table solution with all the features needed for modern web applications, following MOJO framework patterns and conventions.