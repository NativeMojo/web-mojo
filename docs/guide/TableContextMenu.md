# Table Context Menu Feature

The MOJO Table component now supports context menus as an alternative to action buttons. Context menus provide a cleaner interface when you have multiple actions available for each row.

## Basic Usage

Instead of using the traditional `actions` array, you can now pass a `contextMenu` array to the Table constructor:

```javascript
const table = new Table({
  Collection: UserCollection,
  collection: users,
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' }
  ],
  contextMenu: [
    {
      icon: 'bi-eye',
      action: 'item-view',
      label: "View"
    },
    {
      icon: 'bi-pencil',
      action: 'item-edit',
      label: "Edit"
    },
    {
      icon: 'bi-trash',
      action: 'item-delete',
      label: "Delete"
    }
  ]
});
```

## Context Menu Configuration

Each context menu item supports the following options:

### Required Properties
- `action` (string): The action identifier that will be triggered
- `label` (string): Display text for the menu item

### Optional Properties
- `icon` (string): Bootstrap icon class (e.g., 'bi-eye', 'bi-pencil')
- `permissions` (string): Permission required to show this menu item
- `handler` (function): Custom handler function for this action
- `danger` (boolean): Apply danger styling (red text) to the menu item
- `disabled` (boolean): Disable the menu item
- `separator` (boolean): Create a visual separator (ignores other properties)

## Permission-Based Menu Items

You can restrict menu items based on user permissions:

```javascript
contextMenu: [
  {
    icon: 'bi-eye',
    action: 'item-view',
    label: "View"
  },
  {
    icon: 'bi-pencil',
    action: 'item-edit',
    label: "Edit",
    permissions: "edit_users"
  },
  {
    icon: 'bi-wrench',
    action: 'reset-password',
    label: "Reset Password",
    permissions: "admin_users"
  },
  {
    icon: 'bi-trash',
    action: 'item-delete',
    label: "Delete",
    permissions: "delete_users"
  }
]
```

The table will check permissions using the `checkPermission()` method. By default, it looks for `app.user.hasPermission(permission)`. You can override this method in your table subclass:

```javascript
class UsersTable extends Table {
  checkPermission(permission) {
    const app = this.getApp();
    return app?.user?.permissions?.includes(permission) || false;
  }
}
```

## Custom Handlers

You can provide custom handler functions for specific actions:

```javascript
contextMenu: [
  {
    icon: 'bi-eye',
    action: 'item-view',
    label: "View"
  },
  {
    icon: 'bi-wrench',
    action: 'reset-password',
    label: "Reset Password",
    permissions: "admin_users",
    handler: async (model, event, element) => {
      const confirmed = await Dialog.confirm(
        `Reset password for ${model.get('name')}?`
      );
      
      if (confirmed) {
        try {
          await model.resetPassword();
          app.showSuccess('Password reset successfully');
        } catch (error) {
          app.showError('Failed to reset password: ' + error.message);
        }
      }
    }
  },
  {
    icon: 'bi-key',
    action: 'change-role',
    label: "Change Role",
    permissions: "manage_roles",
    handler: async (model, event, element) => {
      // Show role selection dialog
      const roleDialog = new RoleSelectionDialog({ user: model });
      const newRole = await Dialog.showForm(roleDialog);
      
      if (newRole) {
        await model.save({ role: newRole });
        await this.refresh();
      }
    }
  }
]
```

## Default Action Mapping

For standard actions, the context menu will automatically map to existing table methods:

- `item-view` → `onItemClicked(item, event)`
- `item-edit` → `onItemEdit(item, event)`
- `item-delete` → `onItemDelete(item, event)`

Any other action will emit a custom event that you can listen for:

```javascript
table.on('custom-action-name', (item, event, element) => {
  console.log('Custom action triggered:', item);
});
```

## Complete Example

Here's a complete example showing a users table with context menu:

```javascript
class UsersPage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'Users Management',
      template: `
        <div class="users-page">
          <h1>Users</h1>
          <div data-container="table"></div>
        </div>
      `,
      ...options
    });
  }

  async onInit() {
    await super.onInit();
    
    this.users = new UserCollection();
    
    this.table = new Table({
      Collection: UserCollection,
      collection: this.users,
      container: '[data-container="table"]',
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'role', label: 'Role' },
        { key: 'created_at', label: 'Created', formatter: 'date' }
      ],
      contextMenu: [
        {
          icon: 'bi-eye',
          action: 'item-view',
          label: "View Profile"
        },
        {
          icon: 'bi-pencil',
          action: 'item-edit',
          label: "Edit User",
          permissions: "edit_users"
        },
        {
          icon: 'bi-wrench',
          action: 'reset-password',
          label: "Reset Password",
          permissions: "admin_users",
          handler: this.handleResetPassword.bind(this)
        },
        {
          icon: 'bi-shield',
          action: 'change-role',
          label: "Change Role",
          permissions: "manage_roles",
          handler: this.handleChangeRole.bind(this)
        },
        {
          separator: true // Visual separator
        },
        {
          icon: 'bi-trash',
          action: 'item-delete',
          label: "Delete User",
          permissions: "delete_users",
          danger: true
        }
      ]
    });
    
    this.addChild(this.table);
  }
  
  async handleResetPassword(user, event, element) {
    const confirmed = await Dialog.confirm(
      `Reset password for ${user.get('name')}?`,
      'This will send a password reset email to the user.'
    );
    
    if (confirmed) {
      try {
        await user.resetPassword();
        this.getApp().showSuccess('Password reset email sent');
      } catch (error) {
        this.getApp().showError('Failed to reset password: ' + error.message);
      }
    }
  }
  
  async handleChangeRole(user, event, element) {
    const roles = ['user', 'admin', 'moderator'];
    const currentRole = user.get('role');
    
    const roleOptions = roles.map(role => ({
      value: role,
      label: role.charAt(0).toUpperCase() + role.slice(1),
      selected: role === currentRole
    }));
    
    const newRole = await Dialog.showSelect(
      'Select new role:',
      roleOptions
    );
    
    if (newRole && newRole !== currentRole) {
      try {
        await user.save({ role: newRole });
        await this.table.refresh();
        this.getApp().showSuccess('Role updated successfully');
      } catch (error) {
        this.getApp().showError('Failed to update role: ' + error.message);
      }
    }
  }
}
```

## Migration from Action Buttons

To migrate from action buttons to context menu, simply replace the `actions` property with `contextMenu`:

### Before (Action Buttons)
```javascript
const table = new Table({
  // ... other options
  actions: ['view', 'edit', 'delete']
});
```

### After (Context Menu)
```javascript
const table = new Table({
  // ... other options
  contextMenu: [
    { icon: 'bi-eye', action: 'item-view', label: 'View' },
    { icon: 'bi-pencil', action: 'item-edit', label: 'Edit' },
    { icon: 'bi-trash', action: 'item-delete', label: 'Delete' }
  ]
});
```

## Additional Features

### Menu Separators
You can add visual separators between menu items:

```javascript
contextMenu: [
  { icon: 'bi-eye', action: 'item-view', label: 'View' },
  { icon: 'bi-pencil', action: 'item-edit', label: 'Edit' },
  { separator: true }, // Visual separator
  { icon: 'bi-trash', action: 'item-delete', label: 'Delete', danger: true }
]
```

### Danger Styling
Use the `danger` property to highlight destructive actions:

```javascript
contextMenu: [
  { icon: 'bi-trash', action: 'item-delete', label: 'Delete', danger: true },
  { icon: 'bi-x-circle', action: 'deactivate', label: 'Deactivate', danger: true }
]
```

### Disabled Items
Disable menu items conditionally:

```javascript
contextMenu: [
  { icon: 'bi-eye', action: 'item-view', label: 'View' },
  { 
    icon: 'bi-pencil', 
    action: 'item-edit', 
    label: 'Edit',
    disabled: item => item.get('status') === 'archived'
  }
]
```

## Styling

The context menu uses Bootstrap 5's dropdown component. You can customize the appearance using CSS:

```css
/* Customize the three-dots button */
.table .dropdown-toggle {
  border: none !important;
  background: transparent !important;
  color: #6c757d !important;
}

.table .dropdown-toggle:hover {
  background-color: rgba(0,0,0,0.05) !important;
  color: #495057 !important;
}

/* Customize menu items */
.dropdown-item i {
  width: 1rem !important;
  text-align: center;
}

.dropdown-item.text-danger {
  color: var(--bs-danger) !important;
}

.dropdown-item.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Custom dropdown styling */
.table .dropdown-menu {
  border: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 0.25rem 0.75rem rgba(0,0,0,0.1);
  min-width: 150px;
}
```

## Browser Requirements

Context menus require Bootstrap 5's JavaScript for dropdown functionality. Make sure Bootstrap 5 is loaded and the `bootstrap` global is available.