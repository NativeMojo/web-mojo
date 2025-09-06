# Dialog - Modal Interactions

## Overview

Dialog is a powerful modal component built on Bootstrap 5 that provides rich interactive dialogs for user interactions. It extends the View component, giving it full lifecycle management and event handling capabilities.

## Key Features

- **Bootstrap 5 Integration**: Full Bootstrap modal functionality with all sizes and options
- **Context Menus**: Header dropdown menus with permission-based filtering and custom styling
- **View Integration**: Accept View instances as content with proper lifecycle management
- **Static Helper Methods**: Pre-built dialogs for common scenarios (confirm, prompt, forms)
- **Async Content**: Support for asynchronous content loading
- **Event System**: Rich event handling with MOJO's action system
- **Flexible Configuration**: Extensive customization options

## Basic Usage

### 1. Simple Dialog

```javascript
import { Dialog } from 'web-mojo';

// Create a basic dialog
const dialog = new Dialog({
  title: 'Welcome',
  body: '<p>Welcome to our application!</p>',
  buttons: [
    { text: 'OK', action: 'ok', class: 'btn btn-primary' }
  ]
});

// Show the dialog
document.body.appendChild(dialog.element);
await dialog.mount();
dialog.show();
```

### 2. Dialog with View Content

```javascript
import { UserFormView } from '../views/UserFormView.js';

const formView = new UserFormView({ model: user });

const dialog = new Dialog({
  title: 'Edit User',
  body: formView,  // View instance as content
  size: 'lg',
  buttons: [
    { text: 'Cancel', action: 'cancel', class: 'btn btn-secondary' },
    { text: 'Save', action: 'save', class: 'btn btn-primary' }
  ]
});

// Handle dialog actions
dialog.on('action:save', async () => {
  const data = formView.getFormData();
  await user.save(data);
  dialog.hide();
});

dialog.show();
```

## API Reference

### Constructor Options

```javascript
const dialog = new Dialog({
  // Content
  title: 'Dialog Title',           // Modal title
  body: 'Content or View',         // String, HTML, or View instance
  footer: 'Footer content',        // String, HTML, or View instance
  buttons: [],                     // Array of button configurations

  // Context Menu
  contextMenu: {                   // Header context menu configuration
    icon: 'bi-three-dots-vertical', // Trigger button icon
    buttonClass: 'btn btn-link',     // Trigger button styling
    items: [                         // Menu items array
      {
        id: 'save',
        icon: 'bi-save',
        action: 'save-document',
        label: 'Save Document',
        permissions: 'edit_content'  // Optional permission check
      },
      { type: 'divider' },          // Visual separator
      {
        id: 'help',
        icon: 'bi-question-circle',
        href: '/help',               // External link
        label: 'Help',
        target: '_blank'
      }
    ]
  },

  // Layout
  size: 'lg',                      // 'sm', 'lg', 'xl', 'fullscreen', etc.
  centered: true,                  // Vertically center the modal
  scrollable: true,                // Make body scrollable for long content

  // Behavior
  backdrop: true,                  // true, false, or 'static'
  keyboard: true,                  // Close on Escape key
  focus: true,                     // Focus modal when shown
  autoShow: false,                 // Show immediately after creation

  // Styling
  fade: true,                      // Fade animation
  className: 'custom-modal',       // Additional CSS classes
  bodyClass: 'custom-body',        // Body container classes
  footerClass: 'custom-footer',    // Footer container classes

  // Events
  onShow: () => {},                // Called when showing
  onShown: () => {},               // Called after shown
  onHide: () => {},                // Called when hiding
  onHidden: () => {},              // Called after hidden

  // Header customization
  header: true,                    // Show header
  headerContent: '<custom>',       // Custom header HTML
  closeButton: true                // Show close button
});
```

### Instance Methods

#### `show()`
Display the dialog.

```javascript
dialog.show();
```

#### `hide()`
Hide the dialog.

```javascript
dialog.hide();
```

#### `toggle()`
Toggle dialog visibility.

```javascript
dialog.toggle();
```

#### `update(options)`
Update dialog configuration.

```javascript
dialog.update({
  title: 'New Title',
  body: 'Updated content'
});
```

### Button Configuration

```javascript
buttons: [
  {
    text: 'Save',              // Button text
    action: 'save',            // Action name (triggers action:save event)
    class: 'btn btn-primary',  // CSS classes
    value: 'save-data',        // Value returned by static methods
    dismiss: true,             // Auto-dismiss dialog
    disabled: false,           // Button state
    attributes: {              // Additional HTML attributes
      'data-id': '123'
    }
  }
]
```

## Context Menus

Context menus provide a dropdown menu in the dialog header, replacing the standard close button with a more flexible action menu.

### Basic Context Menu

```javascript
const dialog = new Dialog({
  title: 'Document Editor',
  body: documentContent,
  contextMenu: {
    items: [
      {
        id: 'save',
        icon: 'bi-save',
        action: 'save-document',
        label: 'Save Document'
      },
      {
        id: 'print',
        icon: 'bi-printer',
        action: 'print-document',
        label: 'Print'
      },
      {
        type: 'divider'
      },
      {
        id: 'close',
        icon: 'bi-x-lg',
        action: 'close-dialog',
        label: 'Close'
      }
    ]
  }
});

// Handle context menu actions
dialog.onActionSaveDocument = async () => {
  await saveDocument();
  showSuccessMessage('Document saved!');
};

dialog.onActionPrintDocument = async () => {
  window.print();
};

dialog.onActionCloseDialog = async () => {
  dialog.hide();
};
```

### Advanced Context Menu with Permissions

```javascript
const dialog = new Dialog({
  title: 'Admin Panel',
  body: adminContent,
  contextMenu: {
    icon: 'bi-gear-fill',                    // Custom trigger icon
    buttonClass: 'btn btn-outline-light',   // Custom styling
    items: [
      {
        id: 'admin-settings',
        icon: 'bi-wrench',
        action: 'open-admin-settings',
        label: 'Admin Settings',
        permissions: 'view_admin'            // Requires permission
      },
      {
        id: 'manage-users',
        icon: 'bi-people',
        action: 'manage-users',
        label: 'Manage Users',
        permissions: 'manage_users'
      },
      {
        type: 'divider'
      },
      {
        id: 'help',
        icon: 'bi-question-circle',
        href: 'https://docs.example.com/admin',
        label: 'Admin Documentation',
        target: '_blank'                     // External link
      },
      {
        id: 'feedback',
        icon: 'bi-chat-square-text',
        action: 'send-feedback',
        label: 'Send Feedback',
        'data-section': 'admin'              // Custom data attributes
      }
    ]
  }
});

// Permission-based actions
dialog.onActionOpenAdminSettings = async () => {
  showAdminSettings();
};

dialog.onActionManageUsers = async (event, element) => {
  const section = element.getAttribute('data-section');
  openUserManagement(section);
};
```

### Context Menu Item Types

#### Action Items
Trigger dialog action handlers via the event system:

```javascript
{
  id: 'unique-id',
  icon: 'bi-icon-name',
  action: 'kebab-case-action',    // Calls onActionKebabCaseAction()
  label: 'Display Text',
  permissions: 'permission_name'  // Optional permission check
}
```

#### External Links
Navigate to external URLs:

```javascript
{
  id: 'help-link',
  icon: 'bi-question-circle',
  href: 'https://help.example.com',
  label: 'Help Documentation',
  target: '_blank'                // Optional: open in new tab
}
```

#### Visual Dividers
Separate menu sections:

```javascript
{
  type: 'divider'
}
```

### Permission System Integration

Context menus automatically filter items based on user permissions:

```javascript
// Set up permission system (example)
window.getApp = () => ({
  activeUser: {
    hasPermission: (permission) => {
      // Your permission checking logic
      return userPermissions.includes(permission);
    }
  }
});

// Context menu items are automatically filtered
const dialog = new Dialog({
  contextMenu: {
    items: [
      {
        action: 'admin-action',
        label: 'Admin Only',
        permissions: 'admin_access'    // Only shown if user has permission
      },
      {
        action: 'user-action',
        label: 'All Users'            // Always shown
      }
    ]
  }
});
```

### Context Menu Styling

The context menu button automatically adapts to the modal's theme:

```javascript
// Default styling - inherits header colors
const dialog = new Dialog({
  contextMenu: {
    items: [...]  // Uses default mojo-modal-context-menu-btn styling
  }
});

// Custom styling
const dialog = new Dialog({
  className: 'modal-info',  // Modal theme affects button color
  contextMenu: {
    icon: 'bi-gear-fill',                    // Custom trigger icon
    buttonClass: 'btn btn-outline-light',   // Override button styling
    items: [...]
  }
});
```

### Common Context Menu Patterns

#### Document/Content Actions
```javascript
const dialog = new Dialog({
  title: 'Document Editor',
  body: documentEditor,
  contextMenu: {
    items: [
      {
        id: 'save',
        icon: 'bi-save',
        action: 'save-document',
        label: 'Save',
        permissions: 'edit_content'
      },
      {
        id: 'save-as',
        icon: 'bi-save2',
        action: 'save-as-document',
        label: 'Save As...',
        permissions: 'edit_content'
      },
      {
        type: 'divider'
      },
      {
        id: 'export-pdf',
        icon: 'bi-file-pdf',
        action: 'export-pdf',
        label: 'Export as PDF'
      },
      {
        id: 'share',
        icon: 'bi-share',
        action: 'share-document',
        label: 'Share Document'
      },
      {
        type: 'divider'
      },
      {
        id: 'close',
        icon: 'bi-x-lg',
        action: 'close-dialog',
        label: 'Close'
      }
    ]
  }
});
```

#### Administrative Actions
```javascript
const dialog = new Dialog({
  title: 'User Management',
  body: userManagementView,
  contextMenu: {
    items: [
      {
        id: 'add-user',
        icon: 'bi-person-plus',
        action: 'add-user',
        label: 'Add User',
        permissions: 'create_users'
      },
      {
        id: 'bulk-import',
        icon: 'bi-upload',
        action: 'bulk-import-users',
        label: 'Bulk Import',
        permissions: 'import_users'
      },
      {
        type: 'divider'
      },
      {
        id: 'export-users',
        icon: 'bi-download',
        action: 'export-users',
        label: 'Export Users'
      },
      {
        id: 'audit-log',
        icon: 'bi-clock-history',
        action: 'view-audit-log',
        label: 'View Audit Log',
        permissions: 'view_audit'
      }
    ]
  }
});
```

#### Settings and Configuration
```javascript
const dialog = new Dialog({
  title: 'Application Settings',
  body: settingsView,
  contextMenu: {
    icon: 'bi-gear',
    items: [
      {
        id: 'reset-defaults',
        icon: 'bi-arrow-clockwise',
        action: 'reset-to-defaults',
        label: 'Reset to Defaults'
      },
      {
        id: 'export-config',
        icon: 'bi-box-arrow-up',
        action: 'export-configuration',
        label: 'Export Configuration',
        permissions: 'export_settings'
      },
      {
        id: 'import-config',
        icon: 'bi-box-arrow-in-down',
        action: 'import-configuration',
        label: 'Import Configuration',
        permissions: 'import_settings'
      },
      {
        type: 'divider'
      },
      {
        id: 'help',
        icon: 'bi-question-circle',
        href: '/help/settings',
        label: 'Settings Help',
        target: '_blank'
      }
    ]
  }
});
```

### Context Menu Best Practices

#### 1. Logical Grouping
Use dividers to group related actions:

```javascript
contextMenu: {
  items: [
    // Primary actions
    { action: 'save', label: 'Save' },
    { action: 'save-as', label: 'Save As...' },

    { type: 'divider' },

    // Secondary actions
    { action: 'export', label: 'Export' },
    { action: 'share', label: 'Share' },

    { type: 'divider' },

    // Navigation/exit
    { action: 'close', label: 'Close' }
  ]
}
```

#### 2. Permission-Based Filtering
Structure permissions hierarchically:

```javascript
contextMenu: {
  items: [
    // Always visible
    { action: 'view-details', label: 'View Details' },

    // Edit permissions
    {
      action: 'edit',
      label: 'Edit',
      permissions: 'edit_content'
    },
    {
      action: 'delete',
      label: 'Delete',
      permissions: 'delete_content'  // Requires higher permission
    },

    // Admin only
    {
      action: 'admin-settings',
      label: 'Admin Settings',
      permissions: 'admin_access'
    }
  ]
}
```

#### 3. Consistent Icon Usage
Use consistent icons for similar actions across your app:

```javascript
// Define icon constants
const ICONS = {
  SAVE: 'bi-save',
  EDIT: 'bi-pencil',
  DELETE: 'bi-trash',
  SETTINGS: 'bi-gear',
  HELP: 'bi-question-circle',
  CLOSE: 'bi-x-lg'
};

contextMenu: {
  items: [
    { action: 'save', icon: ICONS.SAVE, label: 'Save' },
    { action: 'edit', icon: ICONS.EDIT, label: 'Edit' },
    { action: 'delete', icon: ICONS.DELETE, label: 'Delete' }
  ]
}
```

#### 4. Action Handler Naming
Use consistent naming patterns for action handlers:

```javascript
// Context menu actions
contextMenu: {
  items: [
    { action: 'save-document', label: 'Save' },
    { action: 'export-pdf', label: 'Export PDF' },
    { action: 'share-link', label: 'Share Link' }
  ]
}

// Corresponding handlers
dialog.onActionSaveDocument = async () => { /* ... */ };
dialog.onActionExportPdf = async () => { /* ... */ };
dialog.onActionShareLink = async () => { /* ... */ };
```

#### 5. Graceful Degradation
Handle missing permissions gracefully:

```javascript
contextMenu: {
  items: [
    // Always include basic actions
    { action: 'view', label: 'View Details' },
    { action: 'refresh', label: 'Refresh' },

    // Optional actions based on permissions
    { action: 'edit', label: 'Edit', permissions: 'edit' },
    { action: 'admin', label: 'Admin', permissions: 'admin' },

    // Always include close option
    { type: 'divider' },
    { action: 'close', label: 'Close' }
  ]
}

// If no items pass permission checks, regular close button is shown
```

## Static Helper Methods

### `Dialog.confirm(message, options)`
Show a confirmation dialog.

```javascript
const result = await Dialog.confirm('Are you sure you want to delete this item?');
if (result) {
  // User clicked Yes/OK
  await deleteItem();
}

// With custom options
const confirmed = await Dialog.confirm(
  'This action cannot be undone. Continue?',
  {
    title: 'Confirm Deletion',
    confirmText: 'Delete',
    cancelText: 'Keep',
    confirmClass: 'btn btn-danger',
    size: 'sm'
  }
);
```

### `Dialog.prompt(message, defaultValue, options)`
Show a prompt dialog for user input.

```javascript
const name = await Dialog.prompt('Enter your name:', 'John Doe');
if (name) {
  console.log('User entered:', name);
}

// With validation
const email = await Dialog.prompt(
  'Enter your email:',
  '',
  {
    title: 'Email Required',
    placeholder: 'user@example.com',
    validator: (value) => {
      if (!value.includes('@')) {
        return 'Please enter a valid email address';
      }
      return null; // Valid
    }
  }
);
```

### `Dialog.showForm(formView, options)`
Show a form dialog with a View instance.

```javascript
const formView = new UserFormView({ model: user });
const result = await Dialog.showForm(formView, {
  title: 'Edit User',
  size: 'lg',
  submitText: 'Save User',
  cancelText: 'Cancel'
});

if (result) {
  // User submitted the form
  const formData = result;
  console.log('Form data:', formData);
}
```

### `Dialog.showDialog(options)`
Show a custom dialog with button handling.

```javascript
const result = await Dialog.showDialog({
  title: 'Choose Action',
  body: 'What would you like to do?',
  buttons: [
    { text: 'Edit', value: 'edit', class: 'btn btn-primary' },
    { text: 'Delete', value: 'delete', class: 'btn btn-danger' },
    { text: 'Cancel', value: null, class: 'btn btn-secondary' }
  ]
});

switch (result) {
  case 'edit':
    // Handle edit
    break;
  case 'delete':
    // Handle delete
    break;
  default:
    // User cancelled
    break;
}
```

### `Dialog.showCode(options)`
Show a code display dialog with syntax highlighting.

```javascript
const jsCode = `
function hello() {
  console.log('Hello, World!');
}
`;

await Dialog.showCode({
  code: jsCode,
  language: 'javascript',
  title: 'Example Code',
  size: 'lg'
});
```

## Advanced Usage

### 1. Async Content Loading

```javascript
import { Dialog } from 'web-mojo';

const dialog = new Dialog({
  title: 'Loading...',
  body: async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return View or HTML
    return new DataTableView({
      collection: await loadUserData()
    });
  },
  size: 'xl'
});

dialog.show();
```

### 2. Custom Event Handling

```javascript
const dialog = new Dialog({
  title: 'Custom Actions',
  body: '<p>Choose an action:</p>',
  contextMenu: {
    items: [
      {
        id: 'action1',
        icon: 'bi-1-circle',
        action: 'custom-action-1',
        label: 'Custom Action 1'
      },
      {
        id: 'action2',
        icon: 'bi-2-circle',
        action: 'custom-action-2',
        label: 'Custom Action 2'
      }
    ]
  },
  buttons: [
    { text: 'Close', action: 'close', class: 'btn btn-secondary' }
  ]
});

// Handle context menu actions
dialog.onActionCustomAction1 = async (event, element) => {
  console.log('Custom action 1 triggered from context menu');
  // Perform custom processing
  await performCustomAction1();
};

dialog.onActionCustomAction2 = async (event, element) => {
  console.log('Custom action 2 triggered from context menu');
  await performCustomAction2();
};

dialog.show();
```

### 3. Dialog with Validation

```javascript
const dialog = new Dialog({
  title: 'Enter Details',
  body: `
    <form id="details-form">
      <div class="mb-3">
        <label class="form-label">Name</label>
        <input type="text" class="form-control" name="name" required>
      </div>
      <div class="mb-3">
        <label class="form-label">Email</label>
        <input type="email" class="form-control" name="email" required>
      </div>
    </form>
  `,
  buttons: [
    { text: 'Cancel', action: 'cancel' },
    { text: 'Submit', action: 'submit', class: 'btn btn-primary' }
  ]
});

dialog.on('action:submit', (event) => {
  const form = dialog.element.querySelector('#details-form');
  if (!form.checkValidity()) {
    event.preventDefault(); // Don't close dialog
    form.reportValidity(); // Show validation messages
    return;
  }

  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  console.log('Form submitted:', data);
  // Dialog will close automatically
});

dialog.show();
```

### 4. Multi-Step Dialog

```javascript
class WizardDialog extends Dialog {
  constructor(options = {}) {
    super({
      title: 'Setup Wizard',
      size: 'lg',
      buttons: [
        { text: 'Previous', action: 'prev', class: 'btn btn-secondary' },
        { text: 'Next', action: 'next', class: 'btn btn-primary' },
        { text: 'Finish', action: 'finish', class: 'btn btn-success' }
      ],
      ...options
    });

    this.currentStep = 0;
    this.steps = options.steps || [];
  }

  async buildBody() {
    const step = this.steps[this.currentStep];
    return `
      <div class="modal-body">
        <div class="progress mb-3">
          <div class="progress-bar" style="width: ${(this.currentStep + 1) / this.steps.length * 100}%"></div>
        </div>
        <h5>Step ${this.currentStep + 1}: ${step.title}</h5>
        ${step.content}
      </div>
    `;
  }

  async handleActionNext() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      await this.render();
    }
  }

  async handleActionPrev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      await this.render();
    }
  }
}

// Usage
const wizard = new WizardDialog({
  steps: [
    { title: 'Welcome', content: '<p>Welcome to the wizard!</p>' },
    { title: 'Settings', content: '<p>Configure your settings...</p>' },
    { title: 'Complete', content: '<p>Setup complete!</p>' }
  ]
});

wizard.show();
```

## Events

### Dialog Events
```javascript
dialog.on('show', () => {
  console.log('Dialog is about to show');
});

dialog.on('shown', () => {
  console.log('Dialog is now visible');
});

dialog.on('hide', () => {
  console.log('Dialog is about to hide');
});

dialog.on('hidden', () => {
  console.log('Dialog is now hidden');
});

dialog.on('hidePrevented', () => {
  console.log('Dialog hide was prevented');
});
```

### Action Events
Action events are automatically generated from button actions:

```javascript
// Button with action: 'save'
dialog.on('action:save', (event, element) => {
  // Handle save action
  event.preventDefault(); // Prevent auto-close if needed
});

// Button with action: 'delete'
dialog.on('action:delete', async (event, element) => {
  // Handle delete action
  await performDelete();
  // Dialog closes automatically
});
```

## Best Practices

### 1. Memory Management
Always clean up dialogs when done:

```javascript
// For temporary dialogs
const dialog = new Dialog({ /* options */ });
dialog.show();

dialog.on('hidden', () => {
  dialog.destroy(); // Clean up resources
});
```

### 2. Accessibility
Ensure proper ARIA attributes:

```javascript
const dialog = new Dialog({
  title: 'Important Message',
  attributes: {
    'aria-describedby': 'dialog-description',
    'role': 'alertdialog' // For important messages
  },
  body: '<p id="dialog-description">This is important information.</p>'
});
```

### 3. Error Handling
Handle errors gracefully:

```javascript
dialog.on('action:save', async (event, element) => {
  try {
    event.preventDefault(); // Don't auto-close

    const button = element;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    await saveData();

    dialog.hide();
    showSuccessMessage('Data saved successfully!');

  } catch (error) {
    showErrorMessage('Failed to save: ' + error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Save';
  }
});
```

### 4. Responsive Design
Use appropriate sizes for different screen sizes:

```javascript
const dialog = new Dialog({
  title: 'Responsive Dialog',
  body: content,
  size: window.innerWidth < 768 ? 'fullscreen-md-down' : 'lg'
});
```

## Integration with Other Components

### With Views
```javascript
import { View, Dialog } from 'web-mojo';
import { User } from 'web-mojo/models';

class EditUserView extends View {
  async handleActionEdit(event, element) {
    const userId = element.getAttribute('data-id');
    const user = await User.find(userId);

    const formView = new UserFormView({ model: user });
    const dialog = new Dialog({
      title: 'Edit User',
      body: formView,
      size: 'lg',
      contextMenu: {
        items: [
          {
            id: 'reset-form',
            icon: 'bi-arrow-clockwise',
            action: 'reset-form',
            label: 'Reset Form'
          },
          {
            id: 'save-draft',
            icon: 'bi-save2',
            action: 'save-draft',
            label: 'Save Draft',
            permissions: 'save_drafts'
          },
          {
            type: 'divider'
          },
          {
            id: 'user-history',
            icon: 'bi-clock-history',
            action: 'view-user-history',
            label: 'View History',
            'data-user-id': userId
          }
        ]
      },
      buttons: [
        { text: 'Cancel', class: 'btn btn-secondary', dismiss: true },
        { text: 'Save User', class: 'btn btn-primary', action: 'save-user' }
      ]
    });

    // Context menu handlers
    dialog.onActionResetForm = async () => {
      formView.reset();
    };

    dialog.onActionSaveDraft = async () => {
      const draftData = formView.getFormData();
      await user.saveDraft(draftData);
      this.showSuccess('Draft saved');
    };

    dialog.onActionViewUserHistory = async (event, element) => {
      const userId = element.getAttribute('data-user-id');
      await this.showUserHistory(userId);
    };

    // Button handlers
    dialog.onActionSaveUser = async () => {
      const formData = formView.getFormData();
      await user.save(formData);
      dialog.hide();
      await this.refresh();
    };

    dialog.show();
  }
}
```

### With Tables
```javascript
import { Table, Dialog } from 'web-mojo';

class UsersTable extends TableView {
  async handleActionDelete(event, element) {
    const itemId = element.getAttribute('data-id');
    const item = this.collection.get(itemId);

    const confirmed = await Dialog.confirm(
      `Are you sure you want to delete "${item.get('name')}"?`,
      {
        title: 'Confirm Deletion',
        confirmText: 'Delete',
        confirmClass: 'btn btn-danger'
      }
    );

    if (confirmed) {
      await this.handleDeleteItem(item);
    }
  }
}
```

### With Forms
```javascript
import { View, Dialog } from 'web-mojo';

class UserFormView extends View {
  async handleActionSave(event, element) {
    if (!this.validate()) {
      const dialog = new Dialog({
        title: 'Form Validation',
        body: '<p>Please fix the form errors before saving.</p>',
        contextMenu: {
          items: [
            {
              id: 'highlight-errors',
              icon: 'bi-exclamation-triangle',
              action: 'highlight-errors',
              label: 'Highlight Errors'
            },
            {
              id: 'reset-form',
              icon: 'bi-arrow-clockwise',
              action: 'reset-form',
              label: 'Reset Form'
            }
          ]
        },
        buttons: [
          { text: 'OK', class: 'btn btn-primary', dismiss: true }
        ]
      });

      dialog.onActionHighlightErrors = async () => {
        this.highlightValidationErrors();
        dialog.hide();
      };

      dialog.onActionResetForm = async () => {
        this.reset();
        dialog.hide();
      };

      dialog.show();
      return;
    }

    const confirmed = await Dialog.confirm(
      'Save changes to this user?',
      { title: 'Confirm Save' }
    );

    if (confirmed) {
      await this.model.save(this.getFormData());
    }
  }
}
```

---

The Dialog component provides a powerful and flexible foundation for all modal interactions in your MOJO application, from simple confirmations to complex multi-step wizards.
