# Dialog - Modal Interactions

MOJO provides a powerful Dialog system for modal interactions, confirmations, forms, and alerts.

## Recommended Usage (For LLM Agents)

**IMPORTANT**: Always use the helper methods listed below. They are simpler, cleaner, and handle all the complexity for you.

### Best Practice: Use from View

If you're inside a View, use the WebApp helper methods:

```javascript
class MyView extends View {
  async onActionDelete() {
    // Confirm dialog
    const confirmed = await this.getApp().confirm('Delete this item?');
    if (confirmed) {
      // Delete the item
    }
  }
  
  async onActionEdit() {
    // Show form dialog
    const result = await this.getApp().showForm({
      title: 'Edit User',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true }
      ]
    });
    
    if (result) {
      // User clicked Submit, data is in result
      console.log(result.name, result.email);
    }
  }
  
  async onActionShowInfo() {
    // Info message
    await this.getApp().showInfo('Your changes have been saved.');
  }
}
```

### Alternative: Use Static Helpers

If you're not in a View context, use the Dialog static helpers:

```javascript
import { Dialog } from 'web-mojo';

// Confirm
const confirmed = await Dialog.confirm('Are you sure?');

// Prompt for input
const name = await Dialog.prompt('Enter your name:');

// Alert
await Dialog.alert('Operation completed successfully!', { type: 'success' });

// Show form
const data = await Dialog.showForm({
  title: 'User Details',
  fields: [
    { name: 'username', label: 'Username', type: 'text' }
  ]
});
```

## Common Dialog Methods

### 1. Confirmation Dialog

**From View:**
```javascript
const confirmed = await this.getApp().confirm('Delete this user?', {
  title: 'Confirm Delete',
  confirmText: 'Delete',
  cancelText: 'Cancel',
  confirmClass: 'btn-danger'
});

if (confirmed) {
  // User clicked Delete
}
```

**Static Helper:**
```javascript
const confirmed = await Dialog.confirm('Are you sure?', {
  title: 'Confirm Action',
  confirmText: 'Yes',
  cancelText: 'No',
  confirmClass: 'btn-primary'
});
```

### 2. Alert Dialog

**From View:**
```javascript
// Success alert
await this.getApp().showSuccess('Data saved successfully!');

// Error alert
await this.getApp().showError('Failed to save data.');

// Info alert
await this.getApp().showInfo('Processing your request...');

// Warning alert
await this.getApp().showWarning('This action cannot be undone.');
```

**Static Helper:**
```javascript
await Dialog.alert('Hello World!', {
  title: 'Welcome',
  type: 'success', // 'success', 'error', 'warning', 'info'
  okText: 'Got it'
});
```

### 3. Prompt Dialog

**From View:**
```javascript
// Not available on WebApp - use static helper
const name = await Dialog.prompt('Enter your name:', 'John Doe', {
  title: 'User Name',
  placeholder: 'Your name',
  inputType: 'text'
});

if (name) {
  console.log('User entered:', name);
}
```

### 4. Form Dialog

**From View:**
```javascript
const result = await this.getApp().showForm({
  title: 'Create User',
  size: 'lg',
  submitText: 'Create',
  cancelText: 'Cancel',
  fields: [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'Enter username'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { value: 'admin', label: 'Administrator' },
        { value: 'user', label: 'User' }
      ]
    }
  ]
});

if (result) {
  // User clicked Submit
  console.log(result.username, result.email, result.role);
}
```

**Static Helper:**
```javascript
const result = await Dialog.showForm({
  title: 'Edit Settings',
  fields: [
    { name: 'api_key', label: 'API Key', type: 'text' }
  ]
});
```

### 5. Model Form Dialog

**From View:**
```javascript
const user = new User({ id: 123 });
await user.fetch();

const result = await this.getApp().showModelForm({
  model: user,
  title: 'Edit User',
  fields: ['name', 'email', 'phone']
});

if (result) {
  // Model was updated and saved
}
```

**Static Helper:**
```javascript
const result = await Dialog.showModelForm({
  model: myModel,
  fields: ['field1', 'field2']
});
```

### 6. Custom Dialog

**From View:**
```javascript
const result = await this.getApp().showDialog({
  title: 'Choose Option',
  body: '<p>Select an action:</p>',
  buttons: [
    { text: 'Option 1', value: 'opt1', class: 'btn-primary' },
    { text: 'Option 2', value: 'opt2', class: 'btn-secondary' },
    { text: 'Cancel', value: null, class: 'btn-outline-secondary' }
  ]
});

if (result === 'opt1') {
  // User chose Option 1
}
```

**Static Helper:**
```javascript
const choice = await Dialog.showDialog({
  title: 'Select Action',
  body: 'What would you like to do?',
  buttons: [
    { text: 'Save', value: 'save', class: 'btn-success' },
    { text: 'Delete', value: 'delete', class: 'btn-danger' },
    { text: 'Cancel', value: null }
  ]
});
```

## WebApp Dialog Methods (Preferred in Views)

When you're in a View and have access to `this.getApp()`, use these methods:

| Method | Purpose | Returns |
|--------|---------|---------|
| `confirm(message, options)` | Yes/No confirmation | `Promise<boolean>` |
| `showSuccess(message, title)` | Success alert | `Promise<void>` |
| `showError(message, title)` | Error alert | `Promise<void>` |
| `showInfo(message, title)` | Info alert | `Promise<void>` |
| `showWarning(message, title)` | Warning alert | `Promise<void>` |
| `showForm(options)` | Form dialog | `Promise<object \| null>` |
| `showModelForm(options)` | Model editing dialog | `Promise<object \| null>` |
| `showDialog(options)` | Custom dialog | `Promise<any>` |
| `showLoading(message)` | Show busy indicator | `Promise<void>` |
| `hideLoading()` | Hide busy indicator | `Promise<void>` |

## Dialog Static Methods (Use When Not in View)

| Method | Purpose | Returns |
|--------|---------|---------|
| `Dialog.confirm(message, options)` | Yes/No confirmation | `Promise<boolean>` |
| `Dialog.alert(message, options)` | Alert message | `Promise<void>` |
| `Dialog.prompt(message, defaultValue, options)` | Text input | `Promise<string \| null>` |
| `Dialog.showForm(options)` | Form dialog | `Promise<object \| null>` |
| `Dialog.showModelForm(options)` | Model editing dialog | `Promise<object \| null>` |
| `Dialog.showDialog(options)` | Custom dialog | `Promise<any>` |
| `Dialog.showCode(options)` | Code display dialog | `Promise<void>` |
| `Dialog.showData(options)` | Data table dialog | `Promise<void>` |
| `Dialog.showBusy(message, options)` | Show busy overlay | `void` |
| `Dialog.hideBusy()` | Hide busy overlay | `void` |

## Common Options

### Dialog Size
```javascript
size: 'sm'  // Small
size: 'md'  // Medium (default)
size: 'lg'  // Large
size: 'xl'  // Extra large
```

### Buttons Configuration
```javascript
buttons: [
  {
    text: 'Save',
    value: 'save',        // Return value when clicked
    class: 'btn-primary', // Bootstrap button class
    action: 'save',       // Triggers onActionSave if in Dialog class
    dismiss: false        // Set true to auto-close dialog
  }
]
```

### Form Fields
```javascript
fields: [
  {
    name: 'username',
    label: 'Username',
    type: 'text',        // text, email, password, select, textarea, number, date, etc.
    required: true,
    placeholder: 'Enter username',
    value: 'default',
    options: []          // For select fields: [{ value: 'a', label: 'Option A' }]
  }
]
```

## Complete Examples

### Example 1: Delete Confirmation in View

```javascript
class UserListView extends View {
  async onActionDeleteUser(event, element) {
    const userId = element.dataset.id;
    
    const confirmed = await this.getApp().confirm(
      'Are you sure you want to delete this user? This cannot be undone.',
      {
        title: 'Delete User',
        confirmText: 'Delete',
        confirmClass: 'btn-danger'
      }
    );
    
    if (confirmed) {
      const user = new User({ id: userId });
      await user.destroy();
      await this.getApp().showSuccess('User deleted successfully.');
      await this.refresh();
    }
  }
}
```

### Example 2: Edit Form in View

```javascript
class ProductView extends View {
  async onActionEdit() {
    const product = this.model; // Assuming view has a model
    
    const result = await this.getApp().showModelForm({
      model: product,
      title: 'Edit Product',
      size: 'lg',
      fields: ['name', 'description', 'price', 'category']
    });
    
    if (result) {
      // Model was saved
      await this.getApp().showSuccess('Product updated!');
      this.render(); // Re-render view
    }
  }
}
```

### Example 3: Custom Multi-Choice Dialog

```javascript
class DashboardView extends View {
  async onActionExport() {
    const format = await this.getApp().showDialog({
      title: 'Export Data',
      body: '<p>Choose export format:</p>',
      size: 'sm',
      buttons: [
        { text: 'CSV', value: 'csv', class: 'btn-primary' },
        { text: 'JSON', value: 'json', class: 'btn-secondary' },
        { text: 'Excel', value: 'xlsx', class: 'btn-success' },
        { text: 'Cancel', value: null, class: 'btn-outline-secondary' }
      ]
    });
    
    if (format) {
      await this.exportData(format);
    }
  }
}
```

### Example 4: Loading Indicator

```javascript
class DataView extends View {
  async onActionRefresh() {
    await this.getApp().showLoading('Refreshing data...');
    
    try {
      await this.collection.fetch();
      await this.render();
      await this.getApp().showSuccess('Data refreshed!');
    } catch (error) {
      await this.getApp().showError('Failed to refresh data.');
    } finally {
      await this.getApp().hideLoading();
    }
  }
}
```

### Example 5: Complex Form with Validation

```javascript
class SettingsView extends View {
  async onActionEditSettings() {
    const result = await this.getApp().showForm({
      title: 'API Settings',
      size: 'lg',
      submitText: 'Save Settings',
      fields: [
        {
          name: 'api_url',
          label: 'API URL',
          type: 'url',
          required: true,
          placeholder: 'https://api.example.com'
        },
        {
          name: 'api_key',
          label: 'API Key',
          type: 'password',
          required: true
        },
        {
          name: 'timeout',
          label: 'Timeout (seconds)',
          type: 'number',
          value: 30,
          min: 1,
          max: 300
        },
        {
          name: 'env',
          label: 'Environment',
          type: 'select',
          options: [
            { value: 'dev', label: 'Development' },
            { value: 'staging', label: 'Staging' },
            { value: 'prod', label: 'Production' }
          ]
        }
      ]
    });
    
    if (result) {
      // Save settings
      await this.saveSettings(result);
      await this.getApp().showSuccess('Settings saved!');
    }
  }
}
```

## Quick Reference for LLM Agents

### When to Use Each Method

| Scenario | Use This |
|----------|----------|
| Confirm yes/no | `this.getApp().confirm()` or `Dialog.confirm()` |
| Show success message | `this.getApp().showSuccess()` |
| Show error message | `this.getApp().showError()` |
| Show info message | `this.getApp().showInfo()` |
| Show warning | `this.getApp().showWarning()` |
| Get text input | `Dialog.prompt()` |
| Show form | `this.getApp().showForm()` |
| Edit model | `this.getApp().showModelForm()` |
| Custom dialog | `this.getApp().showDialog()` |
| Show loading | `this.getApp().showLoading()` |
| Hide loading | `this.getApp().hideLoading()` |

### Common Patterns

**Pattern: Delete with confirmation**
```javascript
const confirmed = await this.getApp().confirm('Delete?', {
  confirmText: 'Delete',
  confirmClass: 'btn-danger'
});
if (confirmed) await item.destroy();
```

**Pattern: Edit with form**
```javascript
const data = await this.getApp().showForm({ title: 'Edit', fields: [...] });
if (data) await model.save(data);
```

**Pattern: Loading operation**
```javascript
await this.getApp().showLoading('Processing...');
try {
  await someAsyncOperation();
  await this.getApp().showSuccess('Done!');
} finally {
  await this.getApp().hideLoading();
}
```

**Pattern: Error handling**
```javascript
try {
  await riskyOperation();
} catch (error) {
  await this.getApp().showError(error.message);
}
```

## Advanced: Direct Dialog Class

**NOTE**: Only use this if helper methods don't meet your needs. This is more complex.

```javascript
import { Dialog } from 'web-mojo';

const dialog = new Dialog({
  title: 'Custom Dialog',
  body: '<p>Custom content</p>',
  size: 'lg',
  buttons: [
    { text: 'OK', class: 'btn-primary', dismiss: true }
  ]
});

await dialog.show();
```

## Form Field Types

| Type | Description | Example |
|------|-------------|---------|
| `text` | Text input | `{ name: 'name', type: 'text' }` |
| `email` | Email input | `{ name: 'email', type: 'email' }` |
| `password` | Password input | `{ name: 'password', type: 'password' }` |
| `number` | Number input | `{ name: 'age', type: 'number', min: 0 }` |
| `date` | Date picker | `{ name: 'birthdate', type: 'date' }` |
| `textarea` | Multi-line text | `{ name: 'notes', type: 'textarea', rows: 4 }` |
| `select` | Dropdown | `{ name: 'role', type: 'select', options: [...] }` |
| `checkbox` | Checkbox | `{ name: 'active', type: 'checkbox' }` |
| `radio` | Radio buttons | `{ name: 'plan', type: 'radio', options: [...] }` |

## Tips for LLM Agents

1. **Always use helper methods first** - They're simpler and handle edge cases
2. **In Views, use `this.getApp()`** - It's the cleanest approach
3. **Outside Views, use `Dialog.*` static methods** - Second best option
4. **Await all dialog methods** - They return Promises
5. **Check return values** - `null` means user cancelled
6. **Use appropriate alert types** - showSuccess, showError, showInfo, showWarning
7. **For forms, use showForm()** - Don't build forms manually
8. **For confirmations, use confirm()** - Don't use custom dialogs

## Common Mistakes to Avoid

❌ **Don't do this:**
```javascript
// Too complex, manual dialog
const dialog = new Dialog({
  title: 'Are you sure?',
  body: 'Delete this?',
  buttons: [...]
});
await dialog.show();
```

✅ **Do this instead:**
```javascript
const confirmed = await this.getApp().confirm('Delete this?');
```

❌ **Don't do this:**
```javascript
// Forgetting to await
this.getApp().showSuccess('Saved!'); // BUG: not awaited
```

✅ **Do this instead:**
```javascript
await this.getApp().showSuccess('Saved!');
```

## Summary for LLMs

**Priority 1**: Use `this.getApp().showX()` methods when in a View
**Priority 2**: Use `Dialog.showX()` static methods when not in a View
**Priority 3**: Only use `new Dialog()` constructor for truly custom needs

All methods are async and return Promises. Always await them.
