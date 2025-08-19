# TablePage Component

The TablePage component is a specialized Page that provides complete table functionality with automatic URL parameter synchronization. It combines the power of the Table component with page-level routing, making it perfect for data management interfaces that need to maintain state across navigation.

## Features

- **URL Synchronization**: Automatically syncs pagination, sorting, and filtering with URL parameters
- **Built-in Table Management**: Manages a Table component as a child view with automatic lifecycle
- **Status Display**: Shows record counts, last updated time, and loading states
- **Page-level Actions**: Built-in support for add, refresh, and export operations
- **State Persistence**: Maintains table state across page navigation
- **Loading Management**: Built-in loading states and error handling
- **Responsive Design**: Mobile-friendly responsive table layout
- **Custom Templates**: Support for custom page templates

## Basic Usage

### Simple TablePage

```javascript
import { TablePage } from 'web-mojo';
import { UserCollection } from 'web-mojo/models';

class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'Users',
      route: '/users',
      title: 'User Management',
      Collection: UserCollection,
      columns: [
        { key: 'name', label: 'Name', sortable: true, searchable: true },
        { key: 'email', label: 'Email', sortable: true, searchable: true },
        { key: 'created_at', label: 'Created', formatter: 'date', sortable: true }
      ],
      ...options
    });
  }
}

// Register with WebApp
app.registerPage('users', UsersPage);
```

### TablePage with Actions

```javascript
import { TablePage, Dialog } from 'web-mojo';
import { UserCollection } from 'web-mojo/models';
import { UserFormView } from '../views/UserFormView.js';

class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'Users',
      route: '/users',
      title: 'User Management',
      Collection: UserCollection,
      
      columns: [
        { key: 'name', label: 'Name', sortable: true, searchable: true },
        { key: 'email', label: 'Email', sortable: true, searchable: true },
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
        { key: 'created_at', label: 'Created', formatter: 'date', sortable: true }
      ],
      
      actions: [
        { key: 'edit', label: 'Edit', icon: 'edit' },
        { key: 'delete', label: 'Delete', icon: 'trash', class: 'text-danger' }
      ],
      
      showAdd: true,
      showExport: true,
      urlSyncEnabled: true,
      
      ...options
    });
  }

  // Handle table actions by delegating to child table
  async handleActionEdit(event, element) {
    const itemId = element.getAttribute('data-id');
    const user = this.table.collection.get(itemId);
    
    const formView = new UserFormView({ model: user });
    const result = await Dialog.showForm(formView, {
      title: 'Edit User'
    });

    if (result) {
      await user.save(result);
      await this.refreshTable();
      this.showSuccess('User updated successfully');
    }
  }

  async handleActionAdd(event, element) {
    const formView = new UserFormView();
    const result = await Dialog.showForm(formView, {
      title: 'Add New User'
    });

    if (result) {
      const user = new this.table.model(result);
      await user.save();
      this.table.collection.add(user);
      await this.refreshTable();
      this.showSuccess('User added successfully');
    }
  }
}
```

## Configuration Options

### Constructor Options

```javascript
const tablePage = new TablePage({
  // Page configuration
  pageName: 'MyData',           // Page name for routing
  route: '/data',               // Route pattern
  title: 'Data Management',     // Page title
  description: 'Manage data',   // Page description
  
  // Table configuration
  Collection: MyCollection,     // Collection class for data
  collection: myCollectionInstance, // Or existing collection instance
  columns: [...],               // Column definitions (required)
  
  // Features
  searchable: true,             // Enable global search
  sortable: true,               // Enable column sorting
  filterable: true,             // Enable filtering
  selectable: true,             // Enable row selection
  paginated: true,              // Enable pagination
  
  // Actions
  actions: [...],               // Row-level actions
  contextMenu: [...],           // Context menu actions
  showAdd: true,                // Show add button
  showExport: true,             // Show export button
  
  // URL synchronization
  urlSyncEnabled: true,         // Sync table state with URL
  
  // Display options
  responsive: true,             // Responsive table wrapper
  striped: true,                // Striped rows
  hover: true,                  // Hover effects
  bordered: false,              // Table borders
  
  // Status display
  showStatus: true,             // Show status information
  showRecordCount: true,        // Show record count
  showLastUpdated: true,        // Show last updated time
  
  // Loading configuration
  showLoadingOverlay: true,     // Show loading overlay
  loadingText: 'Loading...',    // Loading text
  
  // Collection parameters
  collectionParams: {           // Default collection parameters
    size: 20,
    sort: 'created_at',
    dir: 'desc'
  }
});
```

### Column Configuration

Same as Table component - see [Table documentation](./Table.md#column-definitions) for complete column options.

```javascript
columns: [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    searchable: true,
    filterable: true,
    filterOptions: [...]
  },
  // ... more columns
]
```

## URL Synchronization

TablePage automatically synchronizes table state with URL parameters, making it easy to share filtered, sorted, or paginated table views.

### Automatic URL Updates

```javascript
// User navigates to: /users?start=20&size=10&sort=name&search=john&status=active
// TablePage automatically applies these parameters to the table:
// - Pagination: start at item 20, show 10 per page  
// - Sorting: sort by name column
// - Search: filter for "john"
// - Filters: status = "active"

class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      urlSyncEnabled: true,  // Enable URL synchronization (default)
      // ... other options
    });
  }
}
```

### URL Parameter Mapping

The following table state is automatically synchronized with URL parameters:

| Table State | URL Parameter | Example |
|------------|---------------|---------|
| Pagination offset | `start` | `?start=20` |
| Page size | `size` | `?size=50` |
| Sort column | `sort` | `?sort=name` |
| Sort direction | `dir` | `?dir=desc` |
| Search term | `search` | `?search=john` |
| Column filters | Column key | `?status=active&role=admin` |

### Programmatic URL Updates

```javascript
// The table automatically updates URL when state changes
await this.table.setSort('name', 'asc');       // URL: ?sort=name&dir=asc
await this.table.setFilter('status', 'active'); // URL: ?sort=name&dir=asc&status=active
await this.table.handlePageChange(2);          // URL: ?sort=name&dir=asc&status=active&start=20
```

## Event Handling

TablePage uses MOJO's automatic event delegation system and passes events to the child Table component.

### Action Handlers

```javascript
class MyTablePage extends TablePage {
  // Row actions - delegated to table
  async handleActionEdit(event, element) {
    const itemId = element.getAttribute('data-id');
    // Handle edit logic
  }

  async handleActionDelete(event, element) {
    const itemId = element.getAttribute('data-id');
    const confirmed = await Dialog.confirm('Delete this item?');
    if (confirmed) {
      // Handle delete logic
    }
  }

  // Page-level toolbar actions
  async handleActionAdd(event, element) {
    // Handle add new item
  }

  async handleActionExport(event, element) {
    // Handle export - or use built-in table export
    this.table.handleExport();
  }

  async handleActionRefresh(event, element) {
    await this.refreshTable();
  }
}
```

### Lifecycle Events

```javascript
class MyTablePage extends TablePage {
  async onEnter() {
    await super.onEnter();
    // Called when entering this page
    console.log('Entering table page');
  }

  onParams(params, query) {
    super.onParams(params, query);
    // Called when URL parameters change
    console.log('URL parameters changed:', params, query);
  }

  async onAfterMount() {
    await super.onAfterMount();
    // Called after page is mounted to DOM
    this.updateStatusDisplay();
  }
}
```

## API Reference

### Properties

- `table` - The child Table component instance
- `config` - Page configuration object
- `tableConfig` - Table-specific configuration
- `urlSyncEnabled` - Whether URL synchronization is enabled
- `lastUpdated` - Timestamp of last data update
- `isLoading` - Current loading state
- `loadError` - Last error message (if any)

### Methods

#### Data Management
- `async refreshTable()` - Refresh table data
- `getTableData()` - Get current table data as plain objects
- `setTableData(data)` - Set table data programmatically

#### Selection Management  
- `getSelectedItems()` - Get selected table items
- `clearSelection()` - Clear all selections

#### Filter Management
- `getFilters()` - Get current filters including search
- `setFilters(filters)` - Set filters programmatically
- `getSort()` - Get current sort configuration
- `setSort(field, direction)` - Set sort programmatically

#### Status Management
- `updateStatusDisplay()` - Update status display elements
- `syncUrlWithTable()` - Manually sync URL with table state

#### URL Management
- `applyUrlToCollection(query)` - Apply URL parameters to collection
- `onParams(params, query)` - Handle URL parameter changes

### Events

TablePage listens to events from the child Table component:

```javascript
// Automatic event listeners (set up internally)
this.table.on('params-changed', () => this.syncUrlWithTable());
this.table.on('data:loaded', () => {
  this.lastUpdated = new Date().toLocaleTimeString();
  this.updateStatusDisplay();
});
this.table.on('data:error', (error) => {
  this.loadError = error.message;
  this.updateStatusDisplay();
});
```

## Advanced Usage

### Custom Status Display

```javascript
class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      // ... other options
      statusConfig: {
        showStatus: true,
        showRecordCount: true,
        showLastUpdated: true,
        statusPosition: 'top'    // 'top', 'bottom', or 'both'
      },
      ...options
    });
  }

  updateStatusDisplay() {
    super.updateStatusDisplay();
    
    // Custom status updates
    const statusElement = this.element.querySelector('[data-status="custom"]');
    if (statusElement) {
      const selectedCount = this.getSelectedItems().length;
      statusElement.textContent = `${selectedCount} selected`;
    }
  }
}
```

### Custom Loading States

```javascript
class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      // ... other options
      loadingConfig: {
        showOverlay: true,
        loadingText: 'Loading users...',
        spinnerClass: 'custom-spinner'
      },
      ...options
    });
  }
}
```

### Collection Parameter Customization

```javascript
class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      // ... other options
      collectionParams: {
        size: 25,                    // Default page size
        sort: 'created_at',          // Default sort field
        dir: 'desc',                 // Default sort direction
        status: 'active',            // Default filter
        include: 'profile,roles'     // Include related data
      },
      ...options
    });
  }

  // Override URL parameter application for custom logic
  applyUrlToCollection(query) {
    // Custom parameter processing
    const params = {
      start: parseInt(query.start) || 0,
      size: parseInt(query.size) || this.tableConfig.collectionParams.size || 25
    };

    // Custom sort handling
    if (query.sort) {
      params.sort = query.sort;
      params.dir = query.dir || 'asc';
    }

    // Custom search handling
    if (query.search) {
      params.q = query.search; // Use 'q' instead of 'search'
    }

    // Apply to collection and refresh
    this.table.collection.params = { ...this.table.collection.params, ...params };
  }
}
```

### Integration with Authentication

```javascript
import { TablePage } from 'web-mojo';
import { requiresPermission } from 'web-mojo/auth';

class AdminUsersPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'AdminUsers', 
      route: '/admin/users',
      requiresAuth: true,
      requiredPermissions: ['users.view'],
      
      // ... table configuration
      actions: [
        { 
          key: 'edit', 
          label: 'Edit', 
          icon: 'edit',
          permission: 'users.edit'    // Permission check for action
        },
        { 
          key: 'delete', 
          label: 'Delete', 
          icon: 'trash',
          permission: 'users.delete',
          class: 'text-danger'
        }
      ],
      ...options
    });
  }

  @requiresPermission('users.edit')
  async handleActionEdit(event, element) {
    // Edit logic - automatically checks permission
  }

  @requiresPermission('users.delete') 
  async handleActionDelete(event, element) {
    // Delete logic - automatically checks permission
  }
}
```

## Complete Example

Here's a comprehensive example showing all major features:

```javascript
import { TablePage, Dialog } from 'web-mojo';
import { UserCollection, User } from 'web-mojo/models';
import { requiresPermission } from 'web-mojo/auth';
import { UserFormView } from '../views/UserFormView.js';

class UsersManagementPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'Users',
      route: '/users',
      title: 'User Management',
      description: 'Manage system users and their permissions',
      
      // Data configuration
      Collection: UserCollection,
      
      // Column definitions
      columns: [
        { 
          key: 'avatar', 
          label: '', 
          width: '50px',
          render: (value, item) => `<img src="${value}" class="avatar-sm rounded-circle">`
        },
        { key: 'name', label: 'Name', sortable: true, searchable: true },
        { key: 'email', label: 'Email', formatter: 'email', sortable: true, searchable: true },
        { 
          key: 'role', 
          label: 'Role', 
          sortable: true,
          filterable: true,
          filterOptions: [
            { value: 'admin', label: 'Administrator' },
            { value: 'moderator', label: 'Moderator' },
            { value: 'user', label: 'User' }
          ]
        },
        { 
          key: 'status', 
          label: 'Status', 
          formatter: 'badge',
          filterable: true,
          filterOptions: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'pending', label: 'Pending' }
          ]
        },
        { key: 'last_login', label: 'Last Login', formatter: 'datetime', sortable: true },
        { key: 'created_at', label: 'Created', formatter: 'date', sortable: true }
      ],
      
      // Actions configuration
      actions: [
        { key: 'view', label: 'View', icon: 'eye' },
        { key: 'edit', label: 'Edit', icon: 'edit', permission: 'users.edit' },
        { key: 'reset-password', label: 'Reset Password', icon: 'key', permission: 'users.edit' },
        { key: 'delete', label: 'Delete', icon: 'trash', class: 'text-danger', permission: 'users.delete' }
      ],
      
      // Context menu
      contextMenu: [
        { key: 'duplicate', label: 'Duplicate User', icon: 'copy' },
        { key: 'export-user', label: 'Export Data', icon: 'download' }
      ],
      
      // Features
      searchable: true,
      sortable: true,
      filterable: true,
      selectable: true,
      paginated: true,
      
      // Page actions
      showAdd: true,
      showExport: true,
      
      // URL synchronization
      urlSyncEnabled: true,
      
      // Default collection parameters
      collectionParams: {
        size: 25,
        sort: 'created_at',
        dir: 'desc',
        include: 'profile,roles'
      },
      
      // Status display
      statusConfig: {
        showStatus: true,
        showRecordCount: true,
        showLastUpdated: true,
        statusPosition: 'top'
      },
      
      // Loading configuration
      loadingConfig: {
        showOverlay: true,
        loadingText: 'Loading users...'
      },
      
      ...options
    });
  }

  // Page lifecycle
  async onEnter() {
    await super.onEnter();
    console.log('Entering users management page');
  }

  // Action handlers
  async handleActionAdd(event, element) {
    const formView = new UserFormView();
    const result = await Dialog.showForm(formView, {
      title: 'Add New User',
      size: 'lg'
    });

    if (result) {
      try {
        const user = new User(result);
        await user.save();
        this.table.collection.add(user);
        await this.refreshTable();
        this.showSuccess('User created successfully');
      } catch (error) {
        this.showError('Failed to create user: ' + error.message);
      }
    }
  }

  async handleActionView(event, element) {
    const userId = element.getAttribute('data-id');
    const app = this.getApp();
    app.navigate(`/users/${userId}`);
  }

  @requiresPermission('users.edit')
  async handleActionEdit(event, element) {
    const userId = element.getAttribute('data-id');
    const user = this.table.collection.get(userId);
    
    const formView = new UserFormView({ model: user });
    const result = await Dialog.showForm(formView, {
      title: 'Edit User',
      size: 'lg'
    });

    if (result) {
      try {
        await user.save(result);
        await this.refreshTable();
        this.showSuccess('User updated successfully');
      } catch (error) {
        this.showError('Failed to update user: ' + error.message);
      }
    }
  }

  @requiresPermission('users.edit')
  async handleActionResetPassword(event, element) {
    const userId = element.getAttribute('data-id');
    const user = this.table.collection.get(userId);
    
    const confirmed = await Dialog.confirm(
      `Reset password for ${user.get('name')}?`,
      'A temporary password will be sent to their email address.'
    );

    if (confirmed) {
      try {
        await user.resetPassword();
        this.showSuccess('Password reset email sent successfully');
      } catch (error) {
        this.showError('Failed to reset password: ' + error.message);
      }
    }
  }

  @requiresPermission('users.delete')
  async handleActionDelete(event, element) {
    const userId = element.getAttribute('data-id');
    const user = this.table.collection.get(userId);
    
    const confirmed = await Dialog.confirm(
      `Delete user ${user.get('name')}?`,
      'This action cannot be undone. All user data will be permanently removed.'
    );

    if (confirmed) {
      try {
        await user.destroy();
        this.table.collection.remove(user);
        await this.refreshTable();
        this.showSuccess('User deleted successfully');
      } catch (error) {
        this.showError('Failed to delete user: ' + error.message);
      }
    }
  }

  // Context menu actions
  async handleActionContextMenuDuplicate(event, element) {
    const userId = element.getAttribute('data-id');
    const originalUser = this.table.collection.get(userId);
    
    // Create copy with modified data
    const userData = { ...originalUser.attributes };
    delete userData.id;
    userData.name = `${userData.name} (Copy)`;
    userData.email = `copy-${userData.email}`;
    
    const formView = new UserFormView({ 
      model: new User(userData)
    });
    
    const result = await Dialog.showForm(formView, {
      title: 'Duplicate User'
    });

    if (result) {
      try {
        const newUser = new User(result);
        await newUser.save();
        this.table.collection.add(newUser);
        await this.refreshTable();
        this.showSuccess('User duplicated successfully');
      } catch (error) {
        this.showError('Failed to duplicate user: ' + error.message);
      }
    }
  }

  // Custom status display
  updateStatusDisplay() {
    super.updateStatusDisplay();
    
    // Show selection count
    const selectedCount = this.getSelectedItems().length;
    const selectionElement = this.element.querySelector('[data-status="selection"]');
    if (selectionElement) {
      selectionElement.textContent = selectedCount > 0 ? 
        `${selectedCount} selected` : '';
    }

    // Show filter summary
    const filters = this.getFilters();
    const filterCount = Object.keys(filters).filter(key => 
      filters[key] && key !== 'search'
    ).length;
    
    const filterElement = this.element.querySelector('[data-status="filters"]');
    if (filterElement) {
      filterElement.textContent = filterCount > 0 ? 
        `${filterCount} active filters` : 'No filters';
    }
  }

  // Custom URL parameter handling
  applyUrlToCollection(query) {
    super.applyUrlToCollection(query);
    
    // Custom logic for specific parameters
    if (query.role && query.role !== 'all') {
      this.table.collection.params.role = query.role;
    }
    
    if (query.created_after) {
      this.table.collection.params.created_after = query.created_after;
    }
  }
}

// Register with application
export default UsersManagementPage;
```

## Best Practices

### 1. URL Parameter Management
- Enable URL synchronization for shareable table states
- Use meaningful parameter names that match your API
- Consider SEO implications when designing URL structure

### 2. Performance Optimization
- Use pagination for large datasets
- Implement server-side filtering and sorting when possible
- Consider lazy loading for complex column formatters

### 3. User Experience
- Provide meaningful loading states and error messages
- Show status information to keep users informed
- Use appropriate page sizes for different screen sizes

### 4. Security
- Always validate permissions for actions
- Use the `@requiresPermission` decorator for sensitive operations
- Sanitize user input in custom formatters and filters

### 5. Maintenance
- Keep table configuration separate from business logic
- Use consistent naming conventions for actions and columns
- Document custom formatters and complex configurations

The TablePage component provides a complete solution for data management interfaces, combining the power of the Table component with page-level routing and state management. It's ideal for admin panels, data browsers, and any interface that needs to present tabular data with full CRUD capabilities.