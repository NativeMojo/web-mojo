# MOJO Table - Batch Actions Configuration

This document explains how to configure and use batch actions in MOJO Table components.

## Overview

Batch actions allow users to select multiple table rows and perform bulk operations on them. The feature is completely configurable - you can define custom actions or disable selections entirely.

## Configuration

### Enable Batch Actions

Pass a `batchActions` array to the table constructor:

```javascript
const table = new Table({
  Collection: UserCollection,
  columns: [
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'status', title: 'Status' }
  ],
  batchActions: [
    { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
    { label: "Export", icon: "bi bi-download", action: "batch_export" },
    { label: "Activate", icon: "bi bi-check-circle", action: "batch_activate" },
    { label: "Deactivate", icon: "bi bi-x-circle", action: "batch_deactivate" },
    { label: "Move", icon: "bi bi-arrow-right", action: "batch_move" }
  ]
});
```

### Disable Batch Actions

Set `batchActions` to `null` or omit it entirely:

```javascript
const table = new Table({
  Collection: UserCollection,
  columns: [
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' }
  ],
  batchActions: null  // No selection checkboxes will be shown
});
```

## Batch Action Object Structure

Each batch action must have:

- `label`: Display text for the action button
- `icon`: Bootstrap icon class (e.g., "bi bi-trash")
- `action`: Unique identifier used in data-action attribute

```javascript
{
  label: "Delete",           // Button text
  icon: "bi bi-trash",       // Bootstrap icon class  
  action: "batch_delete"     // Action identifier
}
```

## Handling Batch Actions in Views

Since MOJO views handle `data-action` attributes automatically, you can handle batch actions in your view's action methods:

```javascript
class UsersView extends View {
  constructor() {
    super({
      template: 'users-template'
    });
    
    this.table = new Table({
      Collection: UserCollection,
      batchActions: [
        { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
        { label: "Export", icon: "bi bi-download", action: "batch_export" }
      ]
    });
  }
  
  async onBatchDelete(event, element) {
    const selectedItems = this.table.getSelectedItems();
    
    if (selectedItems.length === 0) {
      this.showError('No items selected');
      return;
    }
    
    const confirmed = await this.confirmDialog(
      `Delete ${selectedItems.length} selected users?`
    );
    
    if (confirmed) {
      // Delete selected items
      for (const item of selectedItems) {
        await item.destroy();
      }
      
      // Refresh table and clear selection
      await this.table.refresh();
      this.table.clearSelection();
      
      this.showSuccess(`Deleted ${selectedItems.length} users`);
    }
  }
  
  async onBatchExport(event, element) {
    const selectedItems = this.table.getSelectedItems();
    
    if (selectedItems.length === 0) {
      this.showError('No items selected');
      return;
    }
    
    // Export selected items to CSV
    this.table.exportToCSV(selectedItems.map(item => item.attributes));
  }
}
```

## Behavior Changes

### When batchActions is configured:
- Selection checkboxes appear in first column
- "Select All" checkbox appears in table header
- Batch actions panel appears at bottom when items are selected
- Selection count is displayed in the panel

### When batchActions is null/empty:
- No selection checkboxes are shown
- No "Select All" checkbox in header
- No batch actions panel
- Table behaves as read-only for selections

## Common Batch Action Examples

```javascript
// Common batch actions for user management
const userBatchActions = [
  { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
  { label: "Activate", icon: "bi bi-check-circle", action: "batch_activate" },
  { label: "Deactivate", icon: "bi bi-x-circle", action: "batch_deactivate" },
  { label: "Export", icon: "bi bi-download", action: "batch_export" },
  { label: "Send Email", icon: "bi bi-envelope", action: "batch_email" }
];

// Common batch actions for content management
const contentBatchActions = [
  { label: "Publish", icon: "bi bi-eye", action: "batch_publish" },
  { label: "Unpublish", icon: "bi bi-eye-slash", action: "batch_unpublish" },
  { label: "Archive", icon: "bi bi-archive", action: "batch_archive" },
  { label: "Delete", icon: "bi bi-trash", action: "batch_delete" }
];

// Common batch actions for file management
const fileBatchActions = [
  { label: "Download", icon: "bi bi-download", action: "batch_download" },
  { label: "Move", icon: "bi bi-folder2-open", action: "batch_move" },
  { label: "Copy", icon: "bi bi-files", action: "batch_copy" },
  { label: "Delete", icon: "bi bi-trash", action: "batch_delete" }
];
```

## Getting Selected Items

Use the table's `getSelectedItems()` method to retrieve selected items:

```javascript
// Get selected items as model instances
const selectedItems = this.table.getSelectedItems();

// Get just the IDs
const selectedIds = Array.from(this.table.selectedItems);

// Clear selection programmatically  
this.table.clearSelection();
```

## Styling Notes

The batch actions panel appears at the bottom of the table and includes:
- Selection count display
- Horizontally arranged action buttons
- Bootstrap icons and responsive design
- Automatic show/hide based on selection state

The panel uses these CSS classes:
- `.batch-actions-panel` - Main container
- `.batch-select-panel` - Inner panel with rounded borders
- `.batch-select-count` - Selection count display
- `.batch-select-action` - Individual action buttons
- `.batch-action-icon` - Icon containers
- `.batch-action-title` - Action labels

## Events

The table emits a `selection-changed` event when items are selected/deselected:

```javascript
table.on('selection-changed', (selectedIds) => {
  console.log('Selected items:', selectedIds);
});
```
