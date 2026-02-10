# FormBuilder API Reference

FormBuilder is the HTML generation engine behind WEB-MOJO forms. It converts field configuration objects into Bootstrap 5 HTML markup.

> **Note:** Most developers use FormView, which wraps FormBuilder and adds lifecycle, events, and validation. You typically don't interact with FormBuilder directly.

---

## Overview

```javascript
import { FormBuilder } from '@core/forms/FormBuilder.js';

const builder = new FormBuilder({
  fields: [
    { type: 'text', name: 'username', label: 'Username' },
    { type: 'email', name: 'email', label: 'Email' }
  ],
  data: { username: 'john', email: 'john@example.com' }
});

const html = builder.buildFormHTML();
// Returns complete form HTML
```

---

## Constructor Options

### Basic Configuration

```javascript
new FormBuilder({
  fields: [],           // Field definitions (required)
  data: {},            // Data to populate fields
  errors: {},          // Validation errors to display
  options: {},         // Form-level options
  buttons: [],         // Custom buttons
  structureOnly: false // Skip data binding (template mode)
})
```

### Fields Array

Array of field configuration objects:

```javascript
fields: [
  {
    type: 'text',      // Field type (required)
    name: 'username',  // Field name (required)
    label: 'Username', // Field label
    value: 'default',  // Default value
    required: true,    // HTML5 required
    columns: 6,        // Bootstrap columns (1-12)
    // ... type-specific options
  }
]
```

### Options Object

```javascript
options: {
  formClass: 'needs-validation',    // Form CSS class
  formMethod: 'POST',                // Form method
  formAction: '',                    // Form action URL
  groupClass: 'row mb-3',            // Group wrapper class
  labelClass: 'form-label',          // Label class
  inputClass: 'form-control',        // Input class
  errorClass: 'invalid-feedback',    // Error message class
  helpClass: 'form-text',            // Help text class
  submitButton: false,               // Add submit button
  resetButton: false                 // Add reset button
}
```

---

## Methods

### buildFormHTML()

Generate complete form HTML:

```javascript
const html = builder.buildFormHTML();
// Returns: <form>...</form>
```

### buildFieldsHTML()

Generate only fields HTML (no form tag):

```javascript
const html = builder.buildFieldsHTML();
// Returns: HTML for all fields
```

### buildFieldHTML(field)

Generate HTML for a single field:

```javascript
const field = { type: 'text', name: 'username', label: 'Username' };
const html = builder.buildFieldHTML(field);
```

### buildGroupHTML(group)

Generate HTML for a field group:

```javascript
const group = {
  title: 'Personal Info',
  columns: 6,
  fields: [
    { type: 'text', name: 'first_name' },
    { type: 'text', name: 'last_name' }
  ]
};
const html = builder.buildGroupHTML(group);
```

---

## Field Types

FormBuilder supports all field types documented in [FieldTypes.md](./FieldTypes.md):

### Text Inputs
`text`, `email`, `password`, `tel`, `url`, `search`, `hex`, `number`

### Text Areas
`textarea`, `htmlpreview`, `json`

### Selection
`select`, `checkbox`, `radio`, `toggle`/`switch`

### Files
`file`, `image`

### Date/Time
`date`, `datetime-local`, `time`

### Other
`color`, `range`, `hidden`

### Structural
`header`, `html`, `divider`, `button`

### Advanced Components
`tag`, `datepicker`, `daterange`, `multiselect`, `combo`, `collection`, `collectionmultiselect`, `tabset`

---

## Field Common Properties

All field types support:

```javascript
{
  type: 'text',              // Field type (required)
  name: 'field_name',        // Field name (required)
  label: 'Field Label',      // Label text
  value: 'default',          // Default/initial value
  placeholder: 'Enter...',   // Placeholder text
  help: 'Help text',         // Help text below field
  required: false,           // HTML5 required
  disabled: false,           // Disable field
  readonly: false,           // Make read-only
  columns: 12,               // Bootstrap columns (1-12)
  colClass: 'col-md-6',      // Or custom column class
  class: '',                 // Custom CSS classes
  inputClass: '',            // Additional input classes
  labelClass: '',            // Additional label classes
  attributes: {}             // Custom HTML attributes
}
```

---

## Responsive Columns

### Simple Columns

```javascript
{
  columns: 6 // Half width (col-md-6)
}
```

### Responsive Object

```javascript
{
  columns: {
    xs: 12,  // Full width on extra small
    sm: 6,   // Half width on small
    md: 4,   // Third width on medium
    lg: 3    // Quarter width on large
  }
}
```

### Column Class

```javascript
{
  colClass: 'col-12 col-md-6 col-lg-4'
}
```

---

## Field Groups

Organize related fields:

```javascript
{
  type: 'group',
  title: 'Shipping Address',
  columns: 6,  // Group takes half width
  fields: [
    { type: 'text', name: 'street', label: 'Street' },
    { type: 'text', name: 'city', label: 'City', columns: 6 },
    { type: 'text', name: 'zip', label: 'ZIP', columns: 6 }
  ]
}
```

---

## Data Binding

### Setting Data

```javascript
const builder = new FormBuilder({
  fields: [
    { type: 'text', name: 'username' },
    { type: 'email', name: 'email' }
  ],
  data: {
    username: 'john_doe',
    email: 'john@example.com'
  }
});
```

### Nested Data

```javascript
const builder = new FormBuilder({
  fields: [
    { type: 'text', name: 'user.name' },
    { type: 'email', name: 'user.email' }
  ],
  data: {
    user: {
      name: 'John',
      email: 'john@example.com'
    }
  }
});
```

---

## Error Display

```javascript
const builder = new FormBuilder({
  fields: [
    { type: 'email', name: 'email', label: 'Email' }
  ],
  errors: {
    email: ['Invalid email address', 'Email already taken']
  }
});

// Errors shown below field with error styling
```

---

## Templates

FormBuilder uses Mustache templates internally. Each field type has a template:

```javascript
// Example template structure
templates: {
  input: `
    <div class="mojo-form-control">
      {{#label}}
      <label for="{{fieldId}}" class="{{labelClass}}">
        {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
      </label>
      {{/label}}
      <input type="{{type}}" id="{{fieldId}}" name="{{name}}"
             class="{{inputClass}}{{#error}} is-invalid{{/error}}"
             value="{{fieldValue}}" {{#required}}required{{/required}}>
      {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
      {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
    </div>
  `
}
```

---

## Auto-Generate Select Options

FormBuilder can generate numeric options:

```javascript
{
  type: 'select',
  name: 'birth_year',
  label: 'Birth Year',
  start: 1950,
  end: 2010,
  step: 1,
  format: 'padded',  // or 'ordinal', or function
  prefix: 'Year ',
  suffix: ''
}
// Generates: Year 1950, Year 1951, ..., Year 2010
```

### Format Options

- `'padded'` - Zero-pad numbers (01, 02, ...)
- `'ordinal'` - Add ordinal suffix (1st, 2nd, 3rd, ...)
- `function` - Custom formatter: `(value) => string`

---

## Structure-Only Mode

Generate form HTML without data binding (for templates):

```javascript
const builder = new FormBuilder({
  fields: [...],
  structureOnly: true // Skip data binding
});
```

---

## Custom Field Types

Register custom field types via FormPlugins:

```javascript
import { FormPlugins } from '@core/forms/FormPlugins.js';

FormPlugins.registerRenderer('custom-field', (builder, field) => {
  return `
    <div class="custom-field">
      <label>${field.label}</label>
      <input type="text" name="${field.name}" class="form-control">
    </div>
  `;
});

// Use in forms
{
  type: 'custom-field',
  name: 'my_field',
  label: 'My Custom Field'
}
```

---

## When to Use FormBuilder Directly

### Use FormBuilder When:
- Generating form HTML for server-side templates
- Creating static form previews
- Building form generators/builders
- Need pure HTML without JavaScript behavior

### Use FormView When:
- Building interactive forms (99% of cases)
- Need validation, events, or lifecycle
- Working with models
- Handling form submission

---

## Example: Complete Form

```javascript
const builder = new FormBuilder({
  fields: [
    {
      type: 'text',
      name: 'username',
      label: 'Username',
      required: true,
      columns: 6
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      required: true,
      columns: 6
    },
    {
      type: 'password',
      name: 'password',
      label: 'Password',
      required: true,
      showToggle: true,
      columns: 12
    },
    {
      type: 'select',
      name: 'country',
      label: 'Country',
      options: ['USA', 'Canada', 'Mexico'],
      columns: 6
    },
    {
      type: 'date',
      name: 'birth_date',
      label: 'Birth Date',
      columns: 6
    },
    {
      type: 'checkbox',
      name: 'agree_terms',
      label: 'I agree to the Terms of Service',
      required: true
    }
  ],
  options: {
    submitButton: 'Create Account',
    formClass: 'needs-validation'
  },
  data: {
    username: 'john_doe',
    email: 'john@example.com',
    country: 'USA'
  }
});

const html = builder.buildFormHTML();
document.getElementById('form-container').innerHTML = html;
```

---

## Related Documentation

- [FormView.md](./FormView.md) - FormView component (recommended)
- [FieldTypes.md](./FieldTypes.md) - All field types
- [BasicTypes.md](./BasicTypes.md) - Basic field types reference
- [Validation.md](./Validation.md) - Form validation
