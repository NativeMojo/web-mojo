# WEB-MOJO Forms Documentation

Complete guide to building forms in the WEB-MOJO framework.

---

## Table of Contents

- [What is the Form System?](#what-is-the-form-system)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Documentation Guide](#documentation-guide)
- [Examples](#examples)

---

## What is the Form System?

WEB-MOJO's form system provides a powerful, flexible way to build forms with minimal code. It follows a **two-tier architecture**:

```
┌─────────────────────────────────────┐
│         FormView                    │  ← Lifecycle, Events, Validation
│  ┌───────────────────────────────┐  │
│  │      FormBuilder              │  │  ← HTML Generation
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Key Components

1. **FormBuilder** - Pure HTML generation from field definitions (no events, no lifecycle)
2. **FormView** - Complete form component with lifecycle, events, validation, and data management
3. **Advanced Inputs** - Rich components like TagInput, DatePicker, CollectionSelect

### Design Philosophy

- **Separation of Concerns** - HTML generation separated from behavior
- **Model-First** - Forms work seamlessly with Model/Collection
- **Declarative** - Define fields in configuration, not imperative DOM manipulation
- **Bootstrap 5** - Native integration with Bootstrap grid and components
- **KISS Principle** - Simple things should be simple, complex things possible

---

## Quick Start

### 1. Simplest Form

```javascript
import FormView from '@core/forms/FormView.js';

const form = new FormView({
  containerId: 'my-form-container',
  formConfig: {
    fields: [
      { type: 'text', name: 'name', label: 'Name', required: true },
      { type: 'email', name: 'email', label: 'Email', required: true },
      { type: 'textarea', name: 'message', label: 'Message', rows: 4 }
    ]
  }
});

// Listen for submit
form.on('submit', (data) => {
  console.log('Form submitted:', data);
});

// Add as child to parent view
this.addChild(form);
```

### 2. Form with Model Binding

```javascript
import FormView from '@core/forms/FormView.js';
import { User } from './models/User.js';

const user = new User({ id: 123 });
await user.fetch();

const form = new FormView({
  containerId: 'edit-user-form',
  model: user,
  formConfig: {
    fields: [
      { type: 'text', name: 'first_name', label: 'First Name', required: true },
      { type: 'text', name: 'last_name', label: 'Last Name', required: true },
      { type: 'email', name: 'email', label: 'Email', required: true },
      { type: 'switch', name: 'is_active', label: 'Active' }
    ]
  }
});

// Auto-saves to model on submit
form.on('submit', async (data) => {
  if (data.success) {
    console.log('User saved!', user.toJSON());
  }
});

this.addChild(form);
```

### 3. Form in Dialog

```javascript
import { Dialog } from 'web-mojo';

const formData = await Dialog.showForm({
  title: 'Create User',
  fields: [
    { type: 'text', name: 'username', label: 'Username', required: true },
    { type: 'email', name: 'email', label: 'Email', required: true },
    { type: 'password', name: 'password', label: 'Password', required: true }
  ]
});

if (formData) {
  console.log('User created:', formData);
} else {
  console.log('Cancelled');
}
```

---

## Core Concepts

### Data Flow

Forms merge data from three sources in this priority order:

```javascript
data > model > defaults
```

```javascript
const form = new FormView({
  defaults: { name: 'Default Name' },   // Lowest priority
  model: userModel,                      // Medium priority (userModel.attributes)
  data: { name: 'Override Name' },      // Highest priority
  formConfig: { fields: [...] }
});

// Result: form shows "Override Name"
```

### Field Configuration

Every field has common properties:

```javascript
{
  type: 'text',              // Field type (required)
  name: 'fieldName',         // Field name (required)
  label: 'Field Label',      // Label text
  value: 'default',          // Default value
  placeholder: 'Enter...',   // Placeholder
  required: true,            // Validation flag
  disabled: false,           // Disabled state
  readonly: false,           // Read-only
  help: 'Help text',         // Help text below field
  columns: 6,                // Grid columns (1-12)
  class: 'custom-class'      // Custom CSS class
}
```

### Responsive Grid

Forms use Bootstrap's 12-column grid:

```javascript
fields: [
  { type: 'text', name: 'first_name', label: 'First Name', columns: 6 },
  { type: 'text', name: 'last_name', label: 'Last Name', columns: 6 },
  { type: 'email', name: 'email', label: 'Email', columns: 12 }
]
```

Responsive columns:

```javascript
{
  type: 'text',
  name: 'name',
  label: 'Name',
  columns: { xs: 12, sm: 6, md: 4, lg: 3 }  // Responsive breakpoints
}
```

### Form Groups

Organize fields into visual groups:

```javascript
{
  type: 'group',
  columns: 6,
  title: 'Contact Info',
  fields: [
    { type: 'email', name: 'email', label: 'Email' },
    { type: 'tel', name: 'phone', label: 'Phone' }
  ]
}
```

### File Handling Modes

Forms support two file handling modes:

```javascript
// Base64 encoding (default) - for small files like avatars
const form = new FormView({
  fileHandling: 'base64',  // Files encoded as base64 strings in JSON
  formConfig: { fields: [...] }
});

// Multipart form data - for large files like documents
const form = new FormView({
  fileHandling: 'multipart',  // Traditional multipart/form-data POST
  formConfig: { fields: [...] }
});
```

---

## Documentation Guide

### Core Documentation

Start here if you're new to WEB-MOJO forms:

1. **[FormView](./FormView.md)** - Complete FormView guide
   - Constructor options
   - Lifecycle methods
   - Form methods (validate, getFormData, etc.)
   - Model integration
   - Event handling

2. **[FieldTypes](./FieldTypes.md)** - Basic field types reference
   - All basic field types (text, email, select, checkbox, etc.)
   - Configuration options for each
   - Examples and common patterns

3. **[BestPractices](./BestPractices.md)** - Patterns & common pitfalls
   - Recommended patterns
   - What NOT to do
   - Performance tips
   - Security considerations

### Intermediate Topics

Once you understand the basics:

4. **[Validation](./Validation.md)** - Form validation system
   - Client-side validation
   - Server-side validation
   - Model validation
   - Custom validators

5. **[FileHandling](./FileHandling.md)** - File uploads
   - Base64 vs multipart modes
   - Image cropping
   - Drag & drop
   - Server integration

6. **[FormEvents](./FormEvents.md)** - Event system
   - Form-level events
   - Field-level events
   - Component events
   - Event patterns

7. **[Groups-and-Layout](./Groups-and-Layout.md)** - Form organization
   - Field groups
   - Responsive layouts
   - Multi-column forms
   - Form sections

### Advanced Input Components

Rich, interactive input components:

8. **[inputs/](./inputs/README.md)** - Advanced inputs overview
   - [TagInput](./inputs/TagInput.md) - Tag/chip input
   - [DatePicker](./inputs/DatePicker.md) - Enhanced date picker
   - [DateRangePicker](./inputs/DateRangePicker.md) - Date range selection
   - [CollectionSelect](./inputs/CollectionSelect.md) - Dropdown from collection
   - [CollectionMultiSelect](./inputs/CollectionMultiSelect.md) - Multi-select from collection
   - [ComboInput](./inputs/ComboInput.md) - Autocomplete/combo
   - [MultiSelectDropdown](./inputs/MultiSelectDropdown.md) - Multi-select with checkboxes
   - [ImageField](./inputs/ImageField.md) - Image upload with cropping

### Advanced Features

Power user features:

9. **[AutoSave](./AutoSave.md)** - Auto-save functionality
   - Field-level auto-save
   - Debouncing and batching
   - Save indicators

10. **[FormBuilder](./FormBuilder.md)** - HTML generation (advanced)
    - Internal implementation
    - Custom templates
    - Standalone usage (rare)

11. **[FormPlugins](./FormPlugins.md)** - Plugin system
    - Creating custom field types
    - Extension points
    - Plugin registration

### Decision Tree

**Which guide should I read?**

- 🆕 **New to forms?** → Start with [FormView](./FormView.md)
- 🔍 **Looking for a specific field?** → Check [FieldTypes](./FieldTypes.md)
- 🚨 **Form not working?** → Read [BestPractices](./BestPractices.md)
- ✅ **Need validation?** → See [Validation](./Validation.md)
- 📁 **Uploading files?** → See [FileHandling](./FileHandling.md)
- 🏷️ **Need tags/dates/collections?** → Browse [inputs/](./inputs/README.md)
- 📊 **Complex layout?** → See [Groups-and-Layout](./Groups-and-Layout.md)
- 🔌 **Custom field type?** → See [FormPlugins](./FormPlugins.md)

---

## Examples

### Profile Edit Form

```javascript
class ProfilePage extends Page {
  async onInit() {
    const user = this.getApp().activeUser;
    
    this.profileForm = new FormView({
      containerId: 'profile-form',
      model: user,
      fileHandling: 'base64',
      formConfig: {
        fields: [
          {
            type: 'group',
            columns: { xs: 12, md: 3 },
            title: 'Avatar',
            fields: [
              {
                type: 'image',
                name: 'avatar',
                size: 'lg',
                placeholder: 'Upload avatar'
              }
            ]
          },
          {
            type: 'group',
            columns: { xs: 12, md: 9 },
            title: 'Details',
            fields: [
              { type: 'text', name: 'first_name', label: 'First Name', required: true, columns: 6 },
              { type: 'text', name: 'last_name', label: 'Last Name', required: true, columns: 6 },
              { type: 'email', name: 'email', label: 'Email', required: true, columns: 8 },
              { type: 'tel', name: 'phone', label: 'Phone', columns: 4 },
              { type: 'textarea', name: 'bio', label: 'Bio', rows: 4 }
            ]
          }
        ]
      }
    });
    
    this.profileForm.on('submit', (data) => {
      if (data.success) {
        this.getApp().showSuccess('Profile updated!');
      }
    });
    
    this.addChild(this.profileForm);
  }
}
```

### Product Creation Form

```javascript
const productForm = new FormView({
  containerId: 'product-form',
  fileHandling: 'multipart',
  formConfig: {
    fields: [
      { type: 'header', text: 'Product Information', level: 4 },
      { type: 'text', name: 'name', label: 'Product Name', required: true },
      { type: 'number', name: 'price', label: 'Price', min: 0, step: 0.01, required: true, columns: 4 },
      { type: 'number', name: 'stock', label: 'Stock', min: 0, columns: 4 },
      { type: 'select', name: 'category', label: 'Category', columns: 4, options: [
        { value: 'electronics', label: 'Electronics' },
        { value: 'clothing', label: 'Clothing' },
        { value: 'books', label: 'Books' }
      ]},
      { type: 'textarea', name: 'description', label: 'Description', rows: 4 },
      { type: 'divider' },
      { type: 'header', text: 'Images', level: 4 },
      { type: 'image', name: 'featured_image', label: 'Featured Image', required: true, columns: 6 },
      { type: 'file', name: 'gallery', label: 'Gallery Images', multiple: true, columns: 6 }
    ]
  }
});

productForm.on('submit', async (data) => {
  console.log('Product data:', data);
});
```

### Settings Form with Auto-Save

```javascript
const settingsForm = new FormView({
  containerId: 'settings-form',
  model: settingsModel,
  autosaveModelField: true,  // Auto-save on field change
  formConfig: {
    fields: [
      { type: 'switch', name: 'notifications_enabled', label: 'Email Notifications' },
      { type: 'switch', name: 'dark_mode', label: 'Dark Mode' },
      { type: 'select', name: 'language', label: 'Language', options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' }
      ]},
      { type: 'range', name: 'volume', label: 'Volume', min: 0, max: 100, value: 50 }
    ]
  }
});

// Shows save status on each change
settingsForm.on('field:change', (data) => {
  console.log(`${data.field} changed to ${data.value}`);
});
```

---

## Common Patterns

### Form as Child View

Always use forms as child views with `containerId`:

```javascript
class MyPage extends Page {
  async onInit() {
    await super.onInit();
    
    this.myForm = new FormView({
      containerId: 'form-container',  // Must match ID in template
      formConfig: { fields: [...] }
    });
    
    this.addChild(this.myForm);  // Register as child
  }
  
  async getTemplate() {
    return `
      <div class="my-page">
        <h1>My Form</h1>
        <div id="form-container"></div>  <!-- Container for form -->
      </div>
    `;
  }
}
```

### Handling Form Submission

```javascript
form.on('submit', async (eventData) => {
  const { data, success, error } = eventData;
  
  if (success) {
    // Form validated and model saved (if using model)
    console.log('Success!', data);
    this.getApp().showSuccess('Saved successfully!');
  } else {
    // Validation or save failed
    console.error('Error:', error);
    this.getApp().showError(error || 'Failed to save');
  }
});
```

### Getting Form Data

```javascript
// Get current form data
const formData = await form.getFormData();
console.log(formData);

// Check if form has files
const hasFiles = form.hasFiles(formData);

// Validate without submitting
const isValid = form.validate();
if (!isValid) {
  form.focusFirstError();
}
```

---

## Next Steps

1. **Start with [FormView](./FormView.md)** to understand the core component
2. **Browse [FieldTypes](./FieldTypes.md)** for available field types
3. **Read [BestPractices](./BestPractices.md)** to avoid common mistakes
4. **Explore [inputs/](./inputs/README.md)** for advanced components

---

## Additional Resources

- [View Documentation](../core/View.md) - Understanding Views
- [Model Documentation](../core/Model.md) - Working with Models
- [Templates Documentation](../core/Templates.md) - Template system
- [Dialog Documentation](../features/Dialog.md) - Dialog.showForm()

---

## Getting Help

- Check [BestPractices](./BestPractices.md) for common pitfalls
- Search field types in [FieldTypes](./FieldTypes.md)
- Look for your input component in [inputs/](./inputs/README.md)
- Review examples in this document
- Check the [examples/portal](../../examples/portal/) for working code
