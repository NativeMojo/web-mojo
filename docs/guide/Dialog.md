# Dialog - Modal Interactions

## Overview

Dialog is a powerful modal component built on Bootstrap 5 that provides rich interactive dialogs for user interactions. It extends the View component, giving it full lifecycle management and event handling capabilities.

## Key Features

- **Bootstrap 5 Integration**: Full Bootstrap modal functionality with all sizes and options
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

### `Dialog.showCode(code, language, options)`
Show a code display dialog with syntax highlighting.

```javascript
const jsCode = `
function hello() {
  console.log('Hello, World!');
}
`;

await Dialog.showCode(jsCode, 'javascript', {
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
  buttons: [
    { text: 'Action 1', action: 'custom-action-1' },
    { text: 'Action 2', action: 'custom-action-2' }
  ]
});

// Handle custom actions
dialog.on('action:custom-action-1', (event) => {
  console.log('Custom action 1 triggered');
  // Don't auto-hide, do custom processing
  event.preventDefault();
  
  // Hide manually when done
  setTimeout(() => dialog.hide(), 1000);
});

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
    const result = await Dialog.showForm(formView, {
      title: 'Edit User',
      size: 'lg'
    });
    
    if (result) {
      await this.refresh(); // Refresh parent view
    }
  }
}
```

### With Tables
```javascript
import { Table, Dialog } from 'web-mojo';

class UsersTable extends Table {
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
      await Dialog.confirm('Form has errors. Please fix them before saving.');
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