# FormView Component

Complete guide to the FormView component - the primary way to create and manage forms in WEB-MOJO.

---

## Table of Contents

- [Overview](#overview)
- [Constructor Options](#constructor-options)
- [Data Priority](#data-priority)
- [Lifecycle Integration](#lifecycle-integration)
- [Form Methods](#form-methods)
- [Model Integration](#model-integration)
- [File Handling](#file-handling)
- [As Child View](#as-child-view)
- [Events](#events)
- [Validation](#validation)
- [Examples](#examples)
- [API Reference](#api-reference)

---

## Overview

**FormView** is a complete form component that extends the View class. It handles:

- ✅ HTML generation (via FormBuilder)
- ✅ Lifecycle management (render, mount, destroy)
- ✅ Data management (defaults, model, data)
- ✅ Validation (client-side, server-side, model)
- ✅ Event handling (submit, change, field events)
- ✅ File uploads (base64 or multipart)
- ✅ Model integration (auto-save, sync)
- ✅ Advanced input components (TagInput, DatePicker, etc.)

**When to use FormView:**
- Building any form in your application
- Editing model data with forms
- Creating/updating records
- User input collection

**When NOT to use FormView:**
- Static content display (use View or DataView)
- Read-only data presentation
- Custom interactive components without traditional form fields

---

## Constructor Options

### Basic Usage

```javascript
import FormView from '@core/forms/FormView.js';

const form = new FormView({
  // View options (inherited from View)
  containerId: 'form-container',    // Where to render in parent
  className: 'my-custom-form',      // Additional CSS classes
  
  // Form-specific options
  formConfig: {                     // Form configuration
    fields: [...],                  // Field definitions
    buttons: [...]                  // Optional custom buttons
  },
  
  // Or shorthand
  fields: [...],                    // Shorthand for formConfig.fields
  
  // Data sources
  model: myModel,                   // Model to bind to
  data: { name: 'value' },          // Initial data
  defaults: { name: 'default' },    // Default values
  errors: { name: 'Error msg' },    // Initial errors
  
  // File handling
  fileHandling: 'base64',           // 'base64' | 'multipart'
  
  // Advanced features
  autosaveModelField: false         // Auto-save on field change
});
```

### Option Details

#### `formConfig` (Object)

The main form configuration object:

```javascript
formConfig: {
  fields: [                         // Array of field definitions
    { type: 'text', name: 'username', label: 'Username' },
    // ... more fields
  ],
  buttons: [                        // Optional custom buttons (rarely needed)
    { type: 'submit', label: 'Save', class: 'btn-primary' },
    { type: 'reset', label: 'Reset', class: 'btn-secondary' }
  ]
}
```

**Note:** Most forms don't need custom buttons - FormView adds submit/reset automatically.

#### `fields` (Array) - Shorthand

Shorthand for `formConfig.fields`:

```javascript
// These are equivalent:
new FormView({ formConfig: { fields: [...] } });
new FormView({ fields: [...] });
```

#### `model` (Model)

Bind a Model instance to the form:

```javascript
import { User } from './models/User.js';

const user = new User({ id: 123 });
await user.fetch();

const form = new FormView({
  model: user,
  fields: [
    { type: 'text', name: 'username', label: 'Username' },
    { type: 'email', name: 'email', label: 'Email' }
  ]
});

// Form automatically populates from model.attributes
// On submit, form saves back to model
```

**What happens with a model:**
1. Form populates from `model.attributes`
2. Form validates using `model.validate()` (if defined)
3. On submit, form saves to model with `model.save()`
4. Form handles save success/error responses

#### `data` (Object)

Initial form data (highest priority):

```javascript
const form = new FormView({
  data: { username: 'john_doe', email: 'john@example.com' },
  fields: [...]
});
```

#### `defaults` (Object)

Default values (lowest priority):

```javascript
const form = new FormView({
  defaults: { country: 'US', language: 'en' },
  fields: [...]
});
```

#### `errors` (Object)

Initial validation errors:

```javascript
const form = new FormView({
  errors: {
    username: 'Username is already taken',
    email: 'Invalid email format'
  },
  fields: [...]
});
```

Useful when re-rendering after server validation fails.

#### `fileHandling` (String)

How to handle file uploads:

```javascript
// Base64 encoding (default) - for small files
fileHandling: 'base64'  // Files encoded as base64 strings in JSON

// Multipart form data - for large files
fileHandling: 'multipart'  // Traditional FormData POST
```

**See [FileHandling.md](./FileHandling.md) for details.**

#### `autosaveModelField` (Boolean)

Auto-save model on field changes:

```javascript
const form = new FormView({
  model: settingsModel,
  autosaveModelField: true,  // Saves after each field change
  fields: [
    { type: 'switch', name: 'notifications', label: 'Notifications' },
    { type: 'switch', name: 'dark_mode', label: 'Dark Mode' }
  ]
});

// Each switch toggle automatically saves to server
```

**See [AutoSave.md](./AutoSave.md) for details.**

#### `containerId` (String)

Where to render in parent view (inherited from View):

```javascript
const form = new FormView({
  containerId: 'user-form',  // Renders into <div id="user-form"></div>
  fields: [...]
});
```

**Important:** Parent template must have matching ID:

```javascript
// Parent view template
getTemplate() {
  return `
    <div class="page">
      <h1>Edit User</h1>
      <div id="user-form"></div>  <!-- Must match containerId -->
    </div>
  `;
}
```

---

## Data Priority

FormView merges data from three sources with this priority:

```
data > model > defaults
```

### Example

```javascript
const user = new User({
  username: 'model_name',
  email: 'model@example.com',
  country: 'US'
});

const form = new FormView({
  defaults: {
    username: 'default_name',
    email: 'default@example.com',
    country: 'US',
    language: 'en'
  },
  model: user,
  data: {
    username: 'override_name'
  },
  fields: [
    { type: 'text', name: 'username', label: 'Username' },
    { type: 'text', name: 'email', label: 'Email' },
    { type: 'text', name: 'country', label: 'Country' },
    { type: 'text', name: 'language', label: 'Language' }
  ]
});

// Resulting values:
// username: 'override_name'  <- from data (highest priority)
// email: 'model@example.com' <- from model (medium priority)
// country: 'US'              <- from model (has it, so defaults ignored)
// language: 'en'             <- from defaults (only source)
```

### When to Use Each

**Use `defaults`** for:
- Default values for new records
- Common presets
- Fallback values

```javascript
defaults: {
  country: 'US',
  currency: 'USD',
  language: 'en'
}
```

**Use `model`** for:
- Editing existing records
- Model-bound forms
- Auto-save functionality

```javascript
const user = new User({ id: 123 });
await user.fetch();
model: user
```

**Use `data`** for:
- Overriding model/defaults
- Pre-filling forms from URL params
- Temporary form data

```javascript
data: {
  email: query.email,  // Pre-fill from URL
  source: 'registration'
}
```

---

## Lifecycle Integration

FormView is a View, so it follows the View lifecycle:

### In Parent View

```javascript
class UserEditPage extends Page {
  async onInit() {
    await super.onInit();
    
    // Initialize form in onInit (not onBeforeRender)
    this.userForm = new FormView({
      containerId: 'user-form',
      model: this.model,
      fields: [...]
    });
    
    // Register as child
    this.addChild(this.userForm);
  }
  
  getTemplate() {
    return `
      <div class="page">
        <h1>Edit User</h1>
        <div id="user-form"></div>
      </div>
    `;
  }
}
```

### Lifecycle Flow

```
1. Parent onInit()
   └─> Create FormView
   └─> addChild(formView)

2. Parent render()
   └─> FormView render()
       └─> FormBuilder.buildFormHTML()

3. Parent mount()
   └─> FormView mount()
       └─> Initialize advanced inputs
       └─> Bind event handlers

4. FormView ready for interaction

5. Parent destroy()
   └─> FormView destroy()
       └─> Cleanup event listeners
       └─> Destroy advanced inputs
```

### Lifecycle Hooks

FormView provides these lifecycle hooks:

```javascript
class MyFormView extends FormView {
  async onAfterRender() {
    await super.onAfterRender();
    // Form HTML is ready
    // Advanced inputs not yet initialized
  }
  
  async onAfterMount() {
    await super.onAfterMount();
    // Form is in DOM
    // Advanced inputs initialized
    // Event listeners bound
    // Form ready for interaction
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    // Clean up custom resources
  }
}
```

---

## Form Methods

### getFormData()

Get current form data as object:

```javascript
const formData = await form.getFormData();
console.log(formData);
// { username: 'john', email: 'john@example.com', ... }
```

**Returns:** `Promise<Object>` - Form data with all field values

**File handling:**
- With `fileHandling: 'base64'` - Files as base64 strings
- With `fileHandling: 'multipart'` - Files as File objects

### setFormData(data)

Set form values programmatically:

```javascript
form.setFormData({
  username: 'jane_doe',
  email: 'jane@example.com',
  is_active: true
});
```

**Parameters:**
- `data` (Object) - Field name/value pairs

**Use cases:**
- Resetting to specific values
- Loading draft data
- Programmatic form updates

### validate()

Validate form without submitting:

```javascript
const isValid = form.validate();

if (!isValid) {
  console.log('Validation failed');
  form.focusFirstError();
} else {
  console.log('Form is valid');
}
```

**Returns:** `Boolean` - true if valid, false if errors

**Validation order:**
1. HTML5 validation (required, pattern, min/max, etc.)
2. Model validation (if model and model.validate() exist)
3. Custom field validation

### focusFirstError()

Focus the first field with a validation error:

```javascript
if (!form.validate()) {
  form.focusFirstError();
}
```

**Use cases:**
- After validation fails
- Improving UX by directing user to error
- Accessibility support

### reset()

Reset form to default values:

```javascript
form.reset();
```

**Behavior:**
- Clears all fields
- Restores defaults/model values
- Clears validation errors
- Triggers `reset` event

### clearAllErrors()

Clear all validation error messages:

```javascript
form.clearAllErrors();
```

**Use cases:**
- Before re-validation
- After fixing issues
- Programmatic error clearing

### handleSubmit()

Submit form with model save (if model exists):

```javascript
const result = await form.handleSubmit();

if (result.success) {
  console.log('Saved!', result.data);
} else {
  console.error('Error:', result.error);
}
```

**Returns:** `Promise<Object>`
```javascript
{
  success: true|false,
  data: { ... },        // Form data (if successful)
  error: 'message'      // Error message (if failed)
}
```

**Behavior:**
1. Validates form
2. If model exists, calls `model.save()`
3. Handles server response
4. Emits `submit` event
5. Returns result

**Note:** Usually you listen to the `submit` event instead of calling this directly.

### hasFiles(data)

Check if form data contains files:

```javascript
const formData = await form.getFormData();
const hasFiles = form.hasFiles(formData);

if (hasFiles) {
  console.log('Form contains file uploads');
}
```

**Parameters:**
- `data` (Object) - Form data to check

**Returns:** `Boolean` - true if contains files

---

## Model Integration

### Binding a Model

```javascript
import { User } from './models/User.js';

const user = new User({ id: 123 });
await user.fetch();

const form = new FormView({
  model: user,
  fields: [
    { type: 'text', name: 'first_name', label: 'First Name', required: true },
    { type: 'text', name: 'last_name', label: 'Last Name', required: true },
    { type: 'email', name: 'email', label: 'Email', required: true }
  ]
});
```

### Auto-Population

Form automatically populates from `model.attributes`:

```javascript
const user = new User({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com'
});

const form = new FormView({ model: user, fields: [...] });
// Form fields automatically show John, Doe, john@example.com
```

### Auto-Save on Submit

With a model, submit automatically saves:

```javascript
form.on('submit', (eventData) => {
  if (eventData.success) {
    // Model was saved to server successfully
    console.log('User saved:', form.model.toJSON());
  } else {
    // Save failed (validation or server error)
    console.error('Save error:', eventData.error);
  }
});
```

### Model Validation

If model has `validate()` method, it's called automatically:

```javascript
class User extends Model {
  validate(attributes) {
    const errors = {};
    
    if (!attributes.username) {
      errors.username = 'Username is required';
    }
    
    if (attributes.username && attributes.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!attributes.email || !attributes.email.includes('@')) {
      errors.email = 'Valid email is required';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
}

// FormView automatically calls user.validate() before saving
```

### Server-Side Validation

Handle server validation errors:

```javascript
form.on('submit', (eventData) => {
  if (!eventData.success) {
    // Server returned validation errors
    // FormView automatically displays them on fields
    console.error('Validation errors:', eventData.data?.errors);
  }
});
```

**Expected server response format:**
```javascript
{
  success: false,
  errors: {
    username: 'Username already taken',
    email: 'Email already exists'
  }
}
```

### Without Model - Manual Save

If no model, handle save yourself:

```javascript
const form = new FormView({
  fields: [...]  // No model
});

form.on('submit', async (eventData) => {
  const formData = eventData.data;
  
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Saved!', result);
      this.getApp().showSuccess('User created!');
    } else {
      const errors = await response.json();
      console.error('Save failed:', errors);
      this.getApp().showError('Save failed');
    }
  } catch (error) {
    console.error('Network error:', error);
    this.getApp().showError('Network error');
  }
});
```

---

## File Handling

FormView supports two file handling modes.

### Base64 Mode (Default)

Files are encoded as base64 strings in JSON:

```javascript
const form = new FormView({
  fileHandling: 'base64',  // Default
  fields: [
    { type: 'text', name: 'name', label: 'Name' },
    { type: 'image', name: 'avatar', label: 'Avatar' }
  ]
});

form.on('submit', (data) => {
  console.log(data.data);
  // {
  //   name: 'John',
  //   avatar: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
  // }
});
```

**When to use:**
- Small files (< 1MB)
- Avatars, icons, thumbnails
- Files stored in database
- JSON API endpoints

**Advantages:**
- Simple JSON submission
- No special server handling
- Easy to store in database

**Disadvantages:**
- 33% larger than binary
- Not suitable for large files
- Memory intensive for big files

### Multipart Mode

Files sent as traditional multipart/form-data:

```javascript
const form = new FormView({
  fileHandling: 'multipart',
  fields: [
    { type: 'text', name: 'title', label: 'Title' },
    { type: 'file', name: 'document', label: 'Document' }
  ]
});

// Submits as multipart/form-data POST
```

**When to use:**
- Large files (> 1MB)
- Documents, videos, archives
- Traditional file upload endpoints
- S3/cloud storage uploads

**Advantages:**
- Efficient for large files
- Standard server handling
- Streaming support

**Disadvantages:**
- Not JSON
- Requires multipart server handling
- More complex

**See [FileHandling.md](./FileHandling.md) for complete guide.**

---

## As Child View

FormView should always be used as a child view.

### ✅ Correct Pattern

```javascript
class UserPage extends Page {
  async onInit() {
    await super.onInit();
    
    // Create form with containerId
    this.userForm = new FormView({
      containerId: 'user-form',
      fields: [...]
    });
    
    // Register as child
    this.addChild(this.userForm);
  }
  
  getTemplate() {
    return `
      <div class="page">
        <div id="user-form"></div>
      </div>
    `;
  }
}
```

### ❌ Wrong Pattern

```javascript
// DON'T DO THIS
class UserPage extends Page {
  async onAfterRender() {  // ❌ Wrong lifecycle
    const form = new FormView({ fields: [...] });  // ❌ No containerId
    await form.render(this.element);  // ❌ Manual render
    // ❌ Not registered as child
  }
}
```

### Why Child Views?

1. **Automatic lifecycle** - Parent handles render/mount/destroy
2. **Memory management** - Parent cleans up children
3. **Event bubbling** - Events propagate to parent
4. **Proper timing** - Children render at correct time

---

## Events

FormView emits various events you can listen to.

### submit

Fired when form is submitted:

```javascript
form.on('submit', (eventData) => {
  const { data, success, error } = eventData;
  
  if (success) {
    console.log('Form submitted successfully:', data);
  } else {
    console.error('Form submission failed:', error);
  }
});
```

**Event data:**
```javascript
{
  data: { ... },        // Form data
  success: true|false,  // Whether save succeeded
  error: 'message'      // Error message (if failed)
}
```

### change

Fired when any field changes:

```javascript
form.on('change', async (eventData) => {
  const { field, value, data } = eventData;
  console.log(`Field ${field} changed to ${value}`);
  console.log('All form data:', data);
});
```

**Event data:**
```javascript
{
  field: 'field_name',  // Which field changed (if known)
  value: 'new_value',   // New value (if single field)
  data: { ... }         // All current form data
}
```

### field:change

Fired when specific field changes:

```javascript
form.on('field:change', (eventData) => {
  const { field, value } = eventData;
  console.log(`${field} = ${value}`);
});
```

### reset

Fired when form is reset:

```javascript
form.on('reset', () => {
  console.log('Form was reset');
});
```

### Component-Specific Events

Advanced inputs emit their own events:

```javascript
// TagInput events
form.on('tag:added', (data) => {
  console.log('Tag added:', data.tag);
});

form.on('tag:removed', (data) => {
  console.log('Tag removed:', data.tag);
});

// Image upload events
form.on('image:selected', (data) => {
  console.log('Image selected:', data.file.name);
});

form.on('image:cropped', (data) => {
  console.log('Image cropped:', data.cropData);
});

// Switch toggle events
form.on('switch:toggle', (data) => {
  console.log(`${data.field} toggled to ${data.value}`);
});
```

**See [FormEvents.md](./FormEvents.md) for complete event reference.**

---

## Validation

FormView supports multiple validation levels.

### HTML5 Validation

Built-in browser validation:

```javascript
fields: [
  { type: 'text', name: 'username', label: 'Username', required: true },
  { type: 'email', name: 'email', label: 'Email', required: true },
  { type: 'number', name: 'age', label: 'Age', min: 18, max: 120 },
  { type: 'text', name: 'phone', label: 'Phone', pattern: '[0-9]{3}-[0-9]{3}-[0-9]{4}' }
]
```

### Model Validation

Custom validation in Model:

```javascript
class User extends Model {
  validate(attributes) {
    const errors = {};
    
    if (!attributes.username) {
      errors.username = 'Username is required';
    } else if (attributes.username.length < 3) {
      errors.username = 'Must be at least 3 characters';
    }
    
    if (attributes.email && !/@/.test(attributes.email)) {
      errors.email = 'Invalid email format';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
}
```

### Server Validation

Server returns validation errors:

```javascript
// Server response
{
  success: false,
  errors: {
    username: 'Username already exists',
    email: 'Email is invalid'
  }
}

// FormView automatically displays these errors on fields
```

### Manual Validation

Validate programmatically:

```javascript
const isValid = form.validate();

if (!isValid) {
  form.focusFirstError();
  this.getApp().showError('Please fix validation errors');
}
```

**See [Validation.md](./Validation.md) for complete guide.**

---

## Examples

### Basic Contact Form

```javascript
const contactForm = new FormView({
  containerId: 'contact-form',
  fields: [
    { type: 'text', name: 'name', label: 'Your Name', required: true },
    { type: 'email', name: 'email', label: 'Email', required: true },
    { type: 'text', name: 'subject', label: 'Subject', required: true },
    { type: 'textarea', name: 'message', label: 'Message', rows: 5, required: true }
  ]
});

contactForm.on('submit', async (eventData) => {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData.data)
  });
  
  if (response.ok) {
    this.getApp().showSuccess('Message sent!');
    contactForm.reset();
  }
});
```

### User Profile with Image

```javascript
const user = this.getApp().activeUser;

const profileForm = new FormView({
  containerId: 'profile-form',
  model: user,
  fileHandling: 'base64',
  fields: [
    {
      type: 'group',
      columns: 3,
      title: 'Avatar',
      fields: [
        { type: 'image', name: 'avatar', size: 'lg' }
      ]
    },
    {
      type: 'group',
      columns: 9,
      title: 'Details',
      fields: [
        { type: 'text', name: 'first_name', label: 'First Name', required: true, columns: 6 },
        { type: 'text', name: 'last_name', label: 'Last Name', required: true, columns: 6 },
        { type: 'email', name: 'email', label: 'Email', required: true },
        { type: 'tel', name: 'phone', label: 'Phone' },
        { type: 'textarea', name: 'bio', label: 'Bio', rows: 4 }
      ]
    }
  ]
});

profileForm.on('submit', (eventData) => {
  if (eventData.success) {
    this.getApp().showSuccess('Profile updated!');
  }
});
```

### Settings with Auto-Save

```javascript
const settingsForm = new FormView({
  containerId: 'settings-form',
  model: settingsModel,
  autosaveModelField: true,
  formConfig: {
    fields: [
      { type: 'header', text: 'Notifications', level: 5 },
      { type: 'switch', name: 'email_notifications', label: 'Email Notifications' },
      { type: 'switch', name: 'push_notifications', label: 'Push Notifications' },
      { type: 'divider' },
      { type: 'header', text: 'Appearance', level: 5 },
      { type: 'switch', name: 'dark_mode', label: 'Dark Mode' },
      { type: 'select', name: 'language', label: 'Language', options: [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Spanish' },
        { value: 'fr', label: 'French' }
      ]}
    ]
  }
});

settingsForm.on('field:change', (data) => {
  this.getApp().showInfo(`${data.field} updated`);
});
```

---

## API Reference

### Constructor

```typescript
new FormView(options: FormViewOptions)
```

**FormViewOptions:**
```typescript
{
  // View options (inherited)
  containerId?: string,
  className?: string,
  
  // Form configuration
  formConfig?: {
    fields: FieldConfig[],
    buttons?: ButtonConfig[]
  },
  fields?: FieldConfig[],  // Shorthand for formConfig.fields
  
  // Data sources
  model?: Model,
  data?: Object,
  defaults?: Object,
  errors?: Object,
  
  // File handling
  fileHandling?: 'base64' | 'multipart',
  
  // Advanced
  autosaveModelField?: boolean
}
```

### Properties

- `model` - Bound model instance
- `data` - Current form data
- `defaults` - Default values
- `errors` - Current validation errors
- `fileHandling` - File handling mode
- `formBuilder` - Internal FormBuilder instance
- `loading` - Loading state flag

### Methods

- `getFormData()` - Get current form data
- `setFormData(data)` - Set form values
- `validate()` - Validate form
- `focusFirstError()` - Focus first error field
- `reset()` - Reset to defaults
- `clearAllErrors()` - Clear validation errors
- `handleSubmit()` - Submit with model save
- `hasFiles(data)` - Check if contains files

### Events

- `submit` - Form submitted
- `change` - Any field changed
- `field:change` - Specific field changed
- `reset` - Form reset
- `tag:added` - Tag added (TagInput)
- `tag:removed` - Tag removed (TagInput)
- `image:selected` - Image selected
- `image:cropped` - Image cropped
- `switch:toggle` - Switch toggled

---

## Related Documentation

- [FieldTypes](./FieldTypes.md) - Available field types
- [Validation](./Validation.md) - Validation system
- [FileHandling](./FileHandling.md) - File upload modes
- [FormEvents](./FormEvents.md) - Complete event reference
- [Groups-and-Layout](./Groups-and-Layout.md) - Form layout
- [BestPractices](./BestPractices.md) - Common patterns and pitfalls
- [View](../core/View.md) - Parent View class
- [Model](../core/Model.md) - Model integration
