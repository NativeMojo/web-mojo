# FormBuilder Component

A powerful, flexible form builder component for the MOJO framework that generates Bootstrap 5 forms with validation, dynamic layouts, and rich field types.

## Overview

The FormBuilder component provides:
- 20+ built-in field types
- Bootstrap 5 native integration
- Flexible column layouts (1-12 column grid)
- Built-in validation
- Event-driven architecture
- Dynamic field visibility
- File upload support
- Clean, semantic HTML output

## Basic Usage

```javascript
import FormBuilder from '/src/components/FormBuilder.js';

// Create a simple form
const form = new FormBuilder({
  fields: [
    {
      type: 'text',
      name: 'username',
      label: 'Username',
      required: true
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email Address',
      required: true
    },
    {
      type: 'submit',
      text: 'Sign Up'
    }
  ]
});

// Render to a container
await form.render(document.getElementById('form-container'));

// Handle form submission
form.on('submit', (data) => {
  console.log('Form submitted:', data);
});
```

## Model Integration

FormBuilder seamlessly integrates with MOJO Model instances to automatically populate forms and sync data back to models.

### Basic Model Usage

```javascript
import FormBuilder from '/src/components/FormBuilder.js';
import Model from '/src/core/Model.js';

// Create or fetch a model
const userModel = new Model({
  id: 123,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});

// Pass model to FormBuilder
const form = new FormBuilder({
  model: userModel,  // Form will auto-populate from model
  fields: [
    {
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      required: true
    },
    {
      type: 'text',
      name: 'lastName',
      label: 'Last Name',
      required: true
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      required: true
    },
    {
      type: 'submit',
      text: 'Update'
    }
  ]
});

// Render form - will show model data
await form.render(document.getElementById('form-container'));

// On submit, data is automatically synced to model
form.on('submit', async ({ data, model }) => {
  // Model is automatically updated with form data
  await model.save();  // Save to API
  console.log('Model saved:', model.toJSON());
});
```

### Auto-Population from Model

When a model is provided, FormBuilder automatically:
- Populates all matching field values from the model
- Supports nested properties using dot notation
- Updates form when model changes (if model supports events)
- Syncs form data back to model on submission

```javascript
// Model with nested data
const model = new Model({
  name: 'John Doe',
  address: {
    street: '123 Main St',
    city: 'New York',
    zip: '10001'
  }
});

// Form fields can use dot notation
const form = new FormBuilder({
  model: model,
  fields: [
    { type: 'text', name: 'name', label: 'Name' },
    { type: 'text', name: 'address.street', label: 'Street' },
    { type: 'text', name: 'address.city', label: 'City' },
    { type: 'text', name: 'address.zip', label: 'ZIP' }
  ]
});
```

### Model Event Binding

If your model supports events (has `on` method), FormBuilder automatically listens for changes:

```javascript
const model = new Model({ name: 'Initial' });

const form = new FormBuilder({
  model: model,
  fields: [
    { type: 'text', name: 'name', label: 'Name' }
  ]
});

// Form updates when model changes
model.set('name', 'Updated Name');  // Form automatically reflects this change
```

### Reset with Model Data

When a model is attached, the reset functionality restores model values instead of clearing:

```javascript
// User makes changes in form...
// Then clicks reset
form.reset();  // Form reverts to original model values, not empty
```

### Complete Model Example

```javascript
import FormBuilder from '/src/components/FormBuilder.js';
import Model from '/src/core/Model.js';

// Define a User model
class UserModel extends Model {
  static endpoint = '/api/users';
  
  static validations = {
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    firstName: { required: true, minLength: 2 },
    lastName: { required: true, minLength: 2 }
  };
}

// Fetch existing user
const user = await UserModel.find(123);

// Create form bound to model
const userForm = new FormBuilder({
  model: user,
  fields: [
    {
      type: 'hidden',
      name: 'id'
    },
    {
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      required: true,
      col: 6
    },
    {
      type: 'text',
      name: 'lastName',
      label: 'Last Name',
      required: true,
      col: 6
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email Address',
      required: true,
      col: 12
    },
    {
      type: 'tel',
      name: 'phone',
      label: 'Phone',
      col: 6
    },
    {
      type: 'date',
      name: 'birthDate',
      label: 'Birth Date',
      col: 6
    },
    {
      type: 'submit',
      text: 'Save Changes',
      class: 'btn-primary'
    }
  ]
});

// Render form
await userForm.render(container);

// Handle submission
userForm.on('submit', async ({ data, model }) => {
  try {
    // Model is already updated with form data
    await model.save();  // Save to API
    
    alert('User updated successfully!');
  } catch (error) {
    userForm.showError('email', error.message);
  }
});
```

## Field Types

### Text Input Fields

#### text
Standard text input field.
```javascript
{
  type: 'text',
  name: 'firstName',
  label: 'First Name',
  placeholder: 'Enter your first name',
  required: true,
  maxLength: 50
}
```

#### email
Email input with built-in validation.
```javascript
{
  type: 'email',
  name: 'email',
  label: 'Email Address',
  placeholder: 'user@example.com',
  required: true
}
```

#### password
Password input with optional visibility toggle.
```javascript
{
  type: 'password',
  name: 'password',
  label: 'Password',
  required: true,
  minLength: 8,
  showToggle: true
}
```

#### number
Numeric input field.
```javascript
{
  type: 'number',
  name: 'age',
  label: 'Age',
  min: 18,
  max: 120,
  step: 1
}
```

#### tel
Telephone number input.
```javascript
{
  type: 'tel',
  name: 'phone',
  label: 'Phone Number',
  placeholder: '(555) 123-4567',
  pattern: '[0-9]{3}-[0-9]{3}-[0-9]{4}'
}
```

#### url
URL input field.
```javascript
{
  type: 'url',
  name: 'website',
  label: 'Website',
  placeholder: 'https://example.com'
}
```

#### search
Search input with search icon.
```javascript
{
  type: 'search',
  name: 'search',
  label: 'Search',
  placeholder: 'Search...'
}
```

### Textarea Field

```javascript
{
  type: 'textarea',
  name: 'description',
  label: 'Description',
  rows: 5,
  maxLength: 500,
  showCounter: true,
  placeholder: 'Enter description...'
}
```

### Select Dropdown

```javascript
{
  type: 'select',
  name: 'country',
  label: 'Country',
  required: true,
  placeholder: 'Select a country',
  options: [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' }
  ],
  multiple: false,
  searchable: true
}
```

### Checkbox Fields

#### Single Checkbox
```javascript
{
  type: 'checkbox',
  name: 'terms',
  label: 'I agree to the terms and conditions',
  required: true
}
```

#### Checkbox Group
```javascript
{
  type: 'checkbox',
  name: 'interests',
  label: 'Interests',
  inline: true,
  options: [
    { value: 'sports', label: 'Sports' },
    { value: 'music', label: 'Music' },
    { value: 'reading', label: 'Reading' }
  ]
}
```

### Radio Buttons

```javascript
{
  type: 'radio',
  name: 'gender',
  label: 'Gender',
  required: true,
  inline: true,
  options: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ]
}
```

### Switch (Toggle)

```javascript
{
  type: 'switch',
  name: 'newsletter',
  label: 'Subscribe to newsletter',
  defaultValue: true
}
```

### Date/Time Fields

#### Date
```javascript
{
  type: 'date',
  name: 'birthdate',
  label: 'Date of Birth',
  max: '2006-01-01',
  required: true
}
```

#### DateTime
```javascript
{
  type: 'datetime-local',
  name: 'appointment',
  label: 'Appointment Date & Time',
  min: '2024-01-01T00:00'
}
```

#### Time
```javascript
{
  type: 'time',
  name: 'meetingTime',
  label: 'Meeting Time',
  min: '09:00',
  max: '17:00'
}
```

### File Upload

```javascript
{
  type: 'file',
  name: 'document',
  label: 'Upload Document',
  accept: '.pdf,.doc,.docx',
  maxSize: 5242880, // 5MB in bytes
  help: 'PDF or Word documents only, max 5MB'
}
```

### Image Upload

```javascript
{
  type: 'image',
  name: 'avatar',
  label: 'Profile Picture',
  accept: 'image/*',
  preview: true,
  maxSize: 2097152 // 2MB
}
```

### Color Picker

```javascript
{
  type: 'color',
  name: 'themeColor',
  label: 'Theme Color',
  defaultValue: '#007bff'
}
```

### Range Slider

```javascript
{
  type: 'range',
  name: 'volume',
  label: 'Volume',
  min: 0,
  max: 100,
  step: 5,
  showValue: true,
  showLabels: true
}
```

### Hidden Field

```javascript
{
  type: 'hidden',
  name: 'userId',
  value: '12345'
}
```

### Special Fields

#### HTML Content
```javascript
{
  type: 'html',
  content: '<div class="alert alert-info">This is an informational message</div>'
}
```

#### Divider
```javascript
{
  type: 'divider',
  label: 'Personal Information'
}
```

#### Field Group
```javascript
{
  type: 'group',
  label: 'Address',
  fields: [
    { type: 'text', name: 'street', label: 'Street' },
    { type: 'text', name: 'city', label: 'City' },
    { type: 'text', name: 'zip', label: 'ZIP Code' }
  ]
}
```

### Buttons

#### Submit Button
```javascript
{
  type: 'submit',
  text: 'Submit Form',
  class: 'btn-primary',
  icon: 'bi bi-check-circle'
}
```

#### Regular Button
```javascript
{
  type: 'button',
  text: 'Cancel',
  class: 'btn-secondary',
  action: 'cancel',
  icon: 'bi bi-x-circle'
}
```

## Bootstrap Column Layouts

FormBuilder supports Bootstrap's 12-column grid system for flexible form layouts.

### Basic Column Configuration

Each field can specify its column width using the `col` property:

```javascript
const form = new FormBuilder({
  useRowLayout: true,  // Enable row/column layout (default: true)
  rowClass: 'row g-2', // Bootstrap row class with gutter
  defaultColSize: 12,  // Default column size if not specified
  fields: [
    {
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      col: 6  // Takes up 6 columns (half width)
    },
    {
      type: 'text',
      name: 'lastName',
      label: 'Last Name',
      col: 6  // Takes up 6 columns (half width)
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      col: 12  // Full width (default)
    }
  ]
});
```

### Column Size Options

You can specify column sizes in multiple ways:

#### 1. Number Format
```javascript
{
  col: 6  // Renders as "col-6"
}
```

#### 2. String Format
```javascript
{
  col: 'col-md-6'  // Custom column class
}
// or
{
  col: '6'  // Renders as "col-6"
}
```

#### 3. Object Format (Responsive)
```javascript
{
  col: {
    xs: 12,  // Full width on extra small screens
    sm: 6,   // Half width on small screens
    md: 4,   // 1/3 width on medium screens
    lg: 3    // 1/4 width on large screens
  }
}
```

#### 4. Multiple Column Classes
```javascript
{
  col: 'col-12 col-md-6 col-lg-4'  // Responsive column sizes
}
```

### Alternative Property Names

For flexibility, you can use any of these property names:
- `col`
- `colSize`
- `columns`
- `cols`
- `width`

### Force New Row

To force a field to start on a new row:

```javascript
{
  type: 'text',
  name: 'address',
  label: 'Address',
  newRow: true,  // Starts a new row
  col: 12
}
// or
{
  type: 'text',
  name: 'address',
  label: 'Address',
  row: 'new',  // Alternative syntax
  col: 12
}
```

### Additional Column Classes

Add custom classes to the column wrapper:

```javascript
{
  type: 'text',
  name: 'field',
  label: 'Field',
  col: 6,
  colClass: 'd-flex align-items-end'  // Additional column classes
}
```

### Layout Examples

#### Two-Column Layout
```javascript
fields: [
  { type: 'text', name: 'firstName', label: 'First Name', col: 6 },
  { type: 'text', name: 'lastName', label: 'Last Name', col: 6 },
  { type: 'email', name: 'email', label: 'Email', width: 6 },  // 'width' also works
  { type: 'tel', name: 'phone', label: 'Phone', width: 6 }
]
```

#### Three-Column Layout
```javascript
fields: [
  { type: 'text', name: 'city', label: 'City', col: 4 },
  { type: 'text', name: 'state', label: 'State', col: 4 },
  { type: 'text', name: 'zip', label: 'ZIP', col: 4 }
]
```

#### Mixed Layout
```javascript
fields: [
  { type: 'text', name: 'name', label: 'Full Name', col: 12 },
  { type: 'email', name: 'email', label: 'Email', col: 8 },
  { type: 'text', name: 'age', label: 'Age', col: 4 },
  { type: 'textarea', name: 'bio', label: 'Bio', col: 12, rows: 3 }
]
```

#### Responsive Layout
```javascript
fields: [
  {
    type: 'text',
    name: 'field1',
    label: 'Field 1',
    col: { xs: 12, sm: 6, md: 4, lg: 3 }
  },
  {
    type: 'text',
    name: 'field2',
    label: 'Field 2',
    col: { xs: 12, sm: 6, md: 4, lg: 3 }
  }
]
```

### Disable Row Layout

To use simple vertical layout without columns:

```javascript
const form = new FormBuilder({
  useRowLayout: false,  // Disable row/column layout
  fields: [
    // Fields will stack vertically without column wrappers
  ]
});
```

## Field Configuration Options

### Common Field Properties

All field types support these common properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Field type (required) |
| `name` | string | Field name attribute |
| `label` | string | Field label text |
| `placeholder` | string | Placeholder text |
| `value` | any | Default value |
| `required` | boolean | Field is required |
| `disabled` | boolean | Field is disabled |
| `readonly` | boolean | Field is read-only |
| `class` | string | Additional CSS classes for input |
| `help` | string | Help text shown below field |
| `helpText` | string | Alternative to `help` |
| `attributes` | object | Additional HTML attributes |
| `col` | number/string/object | Column size (1-12 or responsive), also accepts `width`, `colSize`, `columns`, `cols` |
| `colClass` | string | Additional column wrapper classes |
| `newRow` | boolean | Force field to start new row |
| `row` | string | Set to 'new' to start new row |
| `condition` | object | Conditional visibility rules |
| `validators` | array | Custom validation rules |

## Constructor Options

```javascript
const form = new FormBuilder({
  // Field configuration
  fields: [],                    // Array of field configurations
  
  // Model integration
  model: null,                   // Model instance to bind to form
  
  // Form options
  formClass: 'mojo-form',       // CSS class for form element
  fieldWrapper: 'form-group mb-3', // Wrapper class for each field
  labelClass: 'form-label',     // CSS class for labels
  inputClass: 'form-control',   // CSS class for inputs
  errorClass: 'invalid-feedback', // CSS class for error messages
  
  // Layout options
  useRowLayout: true,           // Enable Bootstrap row/column layout
  rowClass: 'row g-2',         // CSS class for row wrapper
  defaultColSize: 12,          // Default column size (1-12)
  
  // Buttons
  submitButton: true,           // Show submit button
  resetButton: false,          // Show reset button
  
  // Validation
  autoValidate: true,          // Enable automatic validation
  validateOnSubmit: true,      // Validate on form submission
  validateOnBlur: true,        // Validate on field blur
  
  // Other
  idPrefix: '',               // Prefix for field IDs
  id: ''                      // Form ID (also used as idPrefix)
});
```

## Methods

### Core Methods

#### render(container)
Render the form to a DOM element.
```javascript
await form.render(document.getElementById('form-container'));
```

#### mount(container)
Mount form to container (alias for render).
```javascript
await form.mount(container);
```

#### destroy()
Clean up form and remove event listeners.
```javascript
form.destroy();
```

### Data Methods

#### getValues()
Get all form field values.
```javascript
const values = form.getValues();
console.log(values); // { firstName: 'John', email: 'john@example.com', ... }
```

#### setValues(data)
Set form field values.
```javascript
form.setValues({
  firstName: 'Jane',
  email: 'jane@example.com'
});
```

#### populateFromModel()
Populate form from attached model (called automatically).
```javascript
form.populateFromModel();
```

#### syncToModel(data)
Sync form data back to model.
```javascript
form.syncToModel(formData);
```

#### reset()
Reset form to initial state.
```javascript
form.reset();
```

#### collectFormData()
Collect form data as FormData object.
```javascript
const formData = form.collectFormData();
// Use for file uploads or API submissions
```

### Validation Methods

#### validate()
Validate all form fields.
```javascript
const isValid = await form.validate();
if (isValid) {
  // Form is valid
}
```

#### validateField(field)
Validate a specific field.
```javascript
const isValid = form.validateField(fieldElement);
```

#### clearAllErrors()
Clear all validation errors.
```javascript
form.clearAllErrors();
```

#### clearFieldError(fieldName)
Clear error for specific field.
```javascript
form.clearFieldError('email');
```

#### showError(fieldName, message)
Show error message for field.
```javascript
form.showError('email', 'Email is already registered');
```

### Utility Methods

#### getFormElement()
Get the form DOM element.
```javascript
const formEl = form.getFormElement();
```

#### focusFirstError()
Focus the first field with an error.
```javascript
form.focusFirstError();
```

#### updateLoadingState()
Update form loading state.
```javascript
form.loading = true;
form.updateLoadingState();
```

## Events

FormBuilder uses an event-driven architecture. Listen to events using the `on` method:

### Event Handling

```javascript
// Add event listener
form.on('submit', (data) => {
  console.log('Form submitted:', data);
});

// Remove event listener
form.off('submit', handler);

// Trigger event manually
form.trigger('submit', data);
```

### Available Events

| Event | Description | Data |
|-------|-------------|------|
| `submit` | Form submitted successfully | `{ data, form, model, event }` |
| `reset` | Form reset | None |
| `change` | Field value changed | `{ field, value }` |
| `validate` | Form validated | `{ valid, errors }` |
| `error` | Form submission error | Error object |
| `file-change` | File input changed | `{ field, files }` |
| `action` | Custom action triggered | `{ action, element }` |

## Conditional Fields

Show/hide fields based on other field values:

```javascript
{
  type: 'select',
  name: 'hasCompany',
  label: 'Do you have a company?',
  options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ]
},
{
  type: 'text',
  name: 'companyName',
  label: 'Company Name',
  condition: {
    field: 'hasCompany',
    value: 'yes'
  }
}
```

### Advanced Conditions

```javascript
{
  type: 'text',
  name: 'conditionalField',
  label: 'Conditional Field',
  condition: {
    field: 'triggerField',
    operator: 'in',        // 'equals', 'not', 'in', 'contains', 'greater', 'less'
    value: ['option1', 'option2']
  }
}
```

## Custom Validation

Add custom validators to fields:

```javascript
{
  type: 'text',
  name: 'username',
  label: 'Username',
  validators: [
    {
      type: 'pattern',
      pattern: '^[a-zA-Z0-9_]+$',
      message: 'Username can only contain letters, numbers, and underscores'
    },
    {
      type: 'minLength',
      value: 3,
      message: 'Username must be at least 3 characters'
    },
    {
      type: 'custom',
      validate: async (value) => {
        // Check username availability
        const available = await checkUsernameAvailability(value);
        return available ? null : 'Username is already taken';
      }
    }
  ]
}
```

## Complete Examples

### Contact Form

```javascript
const contactForm = new FormBuilder({
  fields: [
    {
      type: 'text',
      name: 'name',
      label: 'Full Name',
      required: true,
      col: 12
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      required: true,
      col: 6
    },
    {
      type: 'tel',
      name: 'phone',
      label: 'Phone',
      col: 6
    },
    {
      type: 'select',
      name: 'subject',
      label: 'Subject',
      required: true,
      col: 12,
      options: [
        { value: 'general', label: 'General Inquiry' },
        { value: 'support', label: 'Technical Support' },
        { value: 'sales', label: 'Sales' }
      ]
    },
    {
      type: 'textarea',
      name: 'message',
      label: 'Message',
      required: true,
      rows: 5,
      col: 12
    },
    {
      type: 'submit',
      text: 'Send Message',
      class: 'btn-primary'
    }
  ]
});

contactForm.on('submit', async (data) => {
  try {
    await sendContactForm(data);
    alert('Message sent successfully!');
    contactForm.reset();
  } catch (error) {
    contactForm.showError('email', 'Failed to send message');
  }
});
```

### User Registration Form

```javascript
const registrationForm = new FormBuilder({
  fields: [
    {
      type: 'divider',
      label: 'Personal Information'
    },
    {
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      required: true,
      col: 6
    },
    {
      type: 'text',
      name: 'lastName',
      label: 'Last Name',
      required: true,
      col: 6
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email Address',
      required: true,
      col: 12
    },
    {
      type: 'divider',
      label: 'Account Security'
    },
    {
      type: 'password',
      name: 'password',
      label: 'Password',
      required: true,
      minLength: 8,
      showToggle: true,
      col: 6,
      help: 'At least 8 characters'
    },
    {
      type: 'password',
      name: 'confirmPassword',
      label: 'Confirm Password',
      required: true,
      col: 6
    },
    {
      type: 'divider',
      label: 'Additional Information'
    },
    {
      type: 'date',
      name: 'birthdate',
      label: 'Date of Birth',
      max: new Date().toISOString().split('T')[0],
      col: 6
    },
    {
      type: 'select',
      name: 'country',
      label: 'Country',
      col: 6,
      searchable: true,
      options: [
        { value: 'us', label: 'United States' },
        { value: 'uk', label: 'United Kingdom' },
        { value: 'ca', label: 'Canada' }
      ]
    },
    {
      type: 'checkbox',
      name: 'interests',
      label: 'Interests',
      inline: true,
      col: 12,
      options: [
        { value: 'tech', label: 'Technology' },
        { value: 'sports', label: 'Sports' },
        { value: 'music', label: 'Music' },
        { value: 'travel', label: 'Travel' }
      ]
    },
    {
      type: 'switch',
      name: 'newsletter',
      label: 'Subscribe to newsletter',
      col: 12
    },
    {
      type: 'checkbox',
      name: 'terms',
      label: 'I agree to the Terms of Service and Privacy Policy',
      required: true,
      col: 12
    },
    {
      type: 'submit',
      text: 'Create Account',
      class: 'btn-success btn-lg'
    }
  ]
});

// Custom validation
registrationForm.on('submit', async (data) => {
  // Check password match
  if (data.password !== data.confirmPassword) {
    registrationForm.showError('confirmPassword', 'Passwords do not match');
    return;
  }
  
  // Submit registration
  try {
    await registerUser(data);
    window.location.href = '/welcome';
  } catch (error) {
    registrationForm.showError('email', error.message);
  }
});
```

### Dynamic Form with Conditional Fields

```javascript
const dynamicForm = new FormBuilder({
  fields: [
    {
      type: 'radio',
      name: 'userType',
      label: 'User Type',
      required: true,
      options: [
        { value: 'individual', label: 'Individual' },
        { value: 'business', label: 'Business' }
      ]
    },
    {
      type: 'text',
      name: 'fullName',
      label: 'Full Name',
      required: true,
      condition: {
        field: 'userType',
        value: 'individual'
      }
    },
    {
      type: 'text',
      name: 'companyName',
      label: 'Company Name',
      required: true,
      condition: {
        field: 'userType',
        value: 'business'
      }
    },
    {
      type: 'text',
      name: 'taxId',
      label: 'Tax ID',
      required: true,
      condition: {
        field: 'userType',
        value: 'business'
      }
    },
    {
      type: 'submit',
      text: 'Continue'
    }
  ]
});
```

## Integration with MOJO Views

### Using FormBuilder in a View

```javascript
import View from '/src/core/View.js';
import FormBuilder from '/src/components/FormBuilder.js';
import Model from '/src/core/Model.js';

class FormView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'form-view',
      ...options
    });
    
    this.formConfig = options.formConfig || {};
    this.model = options.model || null;
  }
  
  async onAfterMount() {
    // Create and render form with optional model
    this.form = new FormBuilder({
      ...this.formConfig,
      model: this.model
    });
    await this.form.render(this.el);
    
    // Handle form events
    this.form.on('submit', ({ data, model }) => {
      this.handleFormSubmit(data, model);
    });
  }
  
  async handleFormSubmit(data, model) {
    // Process form data
    console.log('Form submitted:', data);
    
    // If model is attached, it's already updated
    if (model) {
      await model.save();
    }
  }
  
  onBeforeDestroy() {
    // Clean up form
    if (this.form) {
      this.form.destroy();
    }
  }
}
```

## Best Practices

1. **Use Column Layouts**: Take advantage of Bootstrap's grid system for responsive forms
2. **Group Related Fields**: Use dividers and consistent column sizes
3. **Provide Help Text**: Add `help` property to complex fields
4. **Validate Early**: Use `validateOnBlur` for immediate feedback
5. **Handle Errors Gracefully**: Show specific error messages
6. **Use Conditional Fields**: Hide irrelevant fields for better UX
7. **Optimize for Mobile**: Test responsive column layouts
8. **Keep Forms Focused**: Break long forms into steps or sections
9. **Leverage Model Integration**: Use models for automatic data binding and API sync
10. **Let Models Handle Validation**: Define validation rules in your Model class

## Browser Support

FormBuilder uses modern JavaScript features and Bootstrap 5:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Performance Tips

1. **Lazy Load Options**: Load select options asynchronously for large datasets
2. **Debounce Validation**: For async validators, debounce API calls
3. **Use Virtual Scrolling**: For select fields with many options
4. **Optimize File Uploads**: Validate file size/type before upload
5. **Cache Form State**: Save draft data to localStorage

## Troubleshooting

### Common Issues

**Form not rendering**: Ensure container element exists before calling `render()`

**Validation not working**: Check that `autoValidate` is enabled and validators are properly configured

**Column layout issues**: Verify total column sizes per row don't exceed 12

**Events not firing**: Make sure event listeners are added before form submission

**Conditional fields not hiding**: Check that condition field names match exactly

## See Also

- [View Component](./View.md)
- [Bootstrap 5 Forms](https://getbootstrap.com/docs/5.0/forms/overview/)
- [MOJO Examples](/examples/forms/)