# FormBuilder Guide

The FormBuilder is a powerful, Bootstrap 5-integrated component for dynamically generating forms in MOJO applications. It provides a declarative approach to form creation with automatic validation, model binding, and event handling.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Field Types](#field-types)
- [Input Groups](#input-groups)
- [Section Headers](#section-headers)
- [Model Integration](#model-integration)
- [Validation](#validation)
- [Event Handling](#event-handling)
- [Layout & Styling](#layout--styling)
- [Advanced Features](#advanced-features)
- [Complete Examples](#complete-examples)

## Basic Usage

### Creating a Form

```javascript
import { FormBuilder } from 'web-mojo';

const formConfig = {
  fields: [
    {
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      required: true
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email Address',
      required: true
    }
  ]
};

const formBuilder = new FormBuilder(formConfig);
await formBuilder.mount(document.getElementById('form-container'));
```

### Using with FormView

```javascript
import { FormView } from 'web-mojo';

class UserFormView extends FormView {
  constructor(options = {}) {
    super({
      formConfig: {
        fields: [
          {
            type: 'text',
            name: 'name',
            label: 'Full Name',
            required: true
          },
          {
            type: 'email',
            name: 'email',
            label: 'Email',
            required: true
          }
        ]
      },
      ...options
    });
  }
}
```

## Field Types

### Text Input Fields

```javascript
// Basic text field
{
  type: 'text',
  name: 'firstName',
  label: 'First Name',
  placeholder: 'Enter your first name',
  required: true
}

// Email field with validation
{
  type: 'email',
  name: 'email',
  label: 'Email Address',
  required: true
}

// Password field
{
  type: 'password',
  name: 'password',
  label: 'Password',
  minLength: 8,
  required: true
}

// Number field
{
  type: 'number',
  name: 'age',
  label: 'Age',
  min: 18,
  max: 100
}

// Phone number
{
  type: 'tel',
  name: 'phone',
  label: 'Phone Number',
  pattern: '[0-9]{3}-[0-9]{3}-[0-9]{4}'
}

// URL field
{
  type: 'url',
  name: 'website',
  label: 'Website'
}

// Search field
{
  type: 'search',
  name: 'query',
  label: 'Search',
  placeholder: 'Type to search...'
}
```

### Textarea Fields

```javascript
{
  type: 'textarea',
  name: 'description',
  label: 'Description',
  rows: 4,
  maxLength: 500,
  help: 'Maximum 500 characters'
}
```

### Select Fields

```javascript
// Simple select
{
  type: 'select',
  name: 'country',
  label: 'Country',
  options: [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia'
  ]
}

// Select with value/label pairs
{
  type: 'select',
  name: 'status',
  label: 'Status',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' }
  ]
}

// Multiple select
{
  type: 'select',
  name: 'interests',
  label: 'Interests',
  multiple: true,
  size: 4,
  options: [
    'Technology',
    'Sports',
    'Music',
    'Travel',
    'Reading'
  ]
}
```

### Checkbox and Radio Fields

```javascript
// Single checkbox
{
  type: 'checkbox',
  name: 'newsletter',
  label: 'Subscribe to newsletter',
  value: true
}

// Radio buttons
{
  type: 'radio',
  name: 'gender',
  label: 'Gender',
  options: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ]
}

// Switch (Bootstrap toggle)
{
  type: 'switch',
  name: 'notifications',
  label: 'Enable Notifications',
  value: false
}
```

### Date and Time Fields

```javascript
// Date picker
{
  type: 'date',
  name: 'birthdate',
  label: 'Birth Date'
}

// DateTime picker
{
  type: 'datetime-local',
  name: 'appointment',
  label: 'Appointment Time'
}

// Time picker
{
  type: 'time',
  name: 'meetingTime',
  label: 'Meeting Time'
}
```

### File Upload Fields

```javascript
// Basic file upload
{
  type: 'file',
  name: 'document',
  label: 'Upload Document',
  accept: '.pdf,.doc,.docx'
}

// Image upload with preview
{
  type: 'image',
  name: 'avatar',
  label: 'Profile Picture',
  accept: 'image/*'
}
```

### Other Field Types

```javascript
// Color picker
{
  type: 'color',
  name: 'favoriteColor',
  label: 'Favorite Color'
}

// Range slider
{
  type: 'range',
  name: 'volume',
  label: 'Volume',
  min: 0,
  max: 100,
  step: 1,
  value: 50
}

// Hidden field
{
  type: 'hidden',
  name: 'userId',
  value: '12345'
}

// Collection select (searchable dropdown)
{
  type: 'collection',
  name: 'parentGroup',
  label: 'Parent Group',
  Collection: GroupCollection,  // Collection class
  labelField: 'name',          // Field to display in dropdown
  valueField: 'id',            // Field to use as value
  maxItems: 10,                // Max items to show in dropdown
  placeholder: 'Search groups...',
  debounceMs: 300,             // Search debounce delay
  defaultParams: {             // Default collection parameters
    status: 'active',
    type: 'group'
  }
}

// Or with pre-instantiated collection
{
  type: 'collection',
  name: 'userId',
  label: 'User',
  collection: userCollection,   // Collection instance
  labelField: 'fullName',
  valueField: 'id',
  maxItems: 5
}
```

### Collection Field Features

The collection field type provides a searchable dropdown interface that:

- **Auto-fetches data**: Uses the collection's search parameters and fetch method
- **Debounced search**: Prevents excessive API calls during typing
- **Keyboard navigation**: Arrow keys, Enter, and Escape support  
- **Flexible display**: Customize which fields show as label and value
- **Parameter preservation**: Maintains default collection params during search
- **Form integration**: Seamlessly integrates with FormBuilder validation and data collection

## Input Groups

Input groups allow you to add text, icons, or buttons before or after form controls using Bootstrap 5's input-group component.

### Basic Input Groups

```javascript
// Prepend text
{
  type: 'number',
  name: 'price',
  label: 'Price',
  inputGroup: {
    prepend: '$'
  }
}

// Append text
{
  type: 'text',
  name: 'weight',
  label: 'Weight',
  inputGroup: {
    append: 'lbs'
  }
}

// Both prepend and append
{
  type: 'number',
  name: 'percentage',
  label: 'Completion',
  inputGroup: {
    prepend: 'Progress:',
    append: '%'
  }
}
```

### Input Groups with Icons

```javascript
// Icon prepend (Bootstrap Icons)
{
  type: 'text',
  name: 'website',
  label: 'Website',
  inputGroup: {
    prepend: '<i class="bi bi-globe"></i>'
  }
}

// Multiple icons
{
  type: 'text',
  name: 'username',
  label: 'Username',
  inputGroup: {
    prepend: '<i class="bi bi-person"></i>',
    append: '<i class="bi bi-check-circle text-success"></i>'
  }
}
```

### Input Groups with Select and Textarea

```javascript
// Select with input group
{
  type: 'select',
  name: 'currency',
  label: 'Amount',
  inputGroup: {
    append: 'Currency'
  },
  options: [
    { value: 'USD', label: '$' },
    { value: 'EUR', label: '€' },
    { value: 'GBP', label: '£' }
  ]
}

// Textarea with input group
{
  type: 'textarea',
  name: 'message',
  label: 'Message',
  rows: 3,
  inputGroup: {
    prepend: '<i class="bi bi-chat-dots"></i>'
  }
}
```

### Shorthand Syntax

```javascript
// String shorthand (automatically becomes prepend)
{
  type: 'text',
  name: 'amount',
  label: 'Amount',
  inputGroup: '$'  // Same as { prepend: '$' }
}
```

## Section Headers

Create visual section breaks and organize your forms with header fields.

### Basic Headers

```javascript
{
  type: 'header',
  text: 'Personal Information',
  level: 3  // Creates <h3>
}
```

### Styled Headers

```javascript
{
  type: 'header',
  text: 'Contact Details',
  level: 4,
  className: 'text-primary border-bottom pb-2 mb-3'
}

{
  type: 'header',
  text: 'Account Settings',
  level: 3,
  className: 'bg-light p-2 rounded',
  id: 'account-section'
}
```

### Complete Form with Sections

```javascript
const formConfig = {
  fields: [
    {
      type: 'header',
      text: 'Personal Information',
      level: 3
    },
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
      type: 'header',
      text: 'Contact Details',
      level: 3,
      className: 'mt-4'
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email Address',
      required: true
    },
    {
      type: 'tel',
      name: 'phone',
      label: 'Phone Number',
      inputGroup: {
        prepend: '<i class="bi bi-telephone"></i>'
      }
    }
  ]
};
```

## Model Integration

### Binding to Models

```javascript
import { User } from 'web-mojo/models';

const user = new User({ name: 'John Doe', email: 'john@example.com' });

const formBuilder = new FormBuilder({
  model: user,
  fields: [
    {
      type: 'text',
      name: 'name',
      label: 'Name'
    },
    {
      type: 'email',
      name: 'email', 
      label: 'Email'
    }
  ]
});

// Form will be pre-populated with user data
await formBuilder.mount(container);
```

### Syncing Form Data to Model

```javascript
// Get form data
const formData = formBuilder.getValues();

// Sync to model
formBuilder.syncToModel();

// Save model
await user.save();
```

## Validation

### HTML5 Validation

```javascript
{
  type: 'email',
  name: 'email',
  label: 'Email',
  required: true  // Built-in HTML5 validation
}

{
  type: 'text',
  name: 'username',
  label: 'Username',
  required: true,
  minLength: 3,
  maxLength: 20,
  pattern: '[a-zA-Z0-9_]+',
  help: 'Only letters, numbers, and underscores allowed'
}
```

### Custom Validation

```javascript
// Check form validity
const isValid = formBuilder.validate();

// Set custom errors
formBuilder.errors.email = 'This email is already taken';
await formBuilder.render(); // Re-render to show errors

// Clear errors
formBuilder.clearAllErrors();
```

## Event Handling

### Form Events

```javascript
const formBuilder = new FormBuilder(config);

// Listen for form submission
formBuilder.on('submit', async (data) => {
  console.log('Form submitted:', data);
  
  try {
    await saveUser(data);
    console.log('User saved successfully');
  } catch (error) {
    formBuilder.showError('email', 'Email already exists');
  }
});

// Listen for form changes
formBuilder.on('change', (data) => {
  console.log('Form data changed:', data);
});

// Listen for validation
formBuilder.on('validate', (isValid) => {
  console.log('Form is valid:', isValid);
});
```

### Using with FormView

```javascript
class UserFormView extends FormView {
  constructor(options = {}) {
    super({
      formConfig: {
        fields: [/* ... */]
      },
      ...options
    });
  }

  async onAfterMount() {
    await super.onAfterMount();
    
    // Listen for form events
    this.on('form:submit', this.handleFormSubmit.bind(this));
    this.on('form:change', this.handleFormChange.bind(this));
  }

  async handleFormSubmit(data) {
    try {
      this.setLoading(true);
      await this.model.save(data);
      this.emit('user-saved', this.model);
    } catch (error) {
      this.setFieldError('email', 'Email already exists');
    } finally {
      this.setLoading(false);
    }
  }
}
```

## Layout & Styling

### Column Layout

```javascript
const formConfig = {
  useRowLayout: true,
  rowClass: 'row g-3',
  defaultColSize: 6,
  fields: [
    {
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      col: 6  // Half width
    },
    {
      type: 'text', 
      name: 'lastName',
      label: 'Last Name',
      col: 6  // Half width
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      col: 12  // Full width
    }
  ]
};
```

### Responsive Columns

```javascript
{
  type: 'text',
  name: 'address',
  label: 'Address',
  col: {
    xs: 12,    // Full width on mobile
    md: 8      // 8/12 width on desktop
  }
}

// Or string format
{
  type: 'text',
  name: 'city',
  label: 'City', 
  col: 'col-12 col-md-6 col-lg-4'
}
```

### Custom Field Classes

```javascript
{
  type: 'text',
  name: 'specialField',
  label: 'Special Field',
  class: 'form-control-lg',  // Large input
  colClass: 'mb-4'           // Extra bottom margin
}
```

### Form-wide Configuration

```javascript
const formConfig = {
  formClass: 'my-custom-form',
  fieldWrapper: 'form-group mb-4',
  labelClass: 'form-label fw-bold',
  inputClass: 'form-control form-control-sm',
  errorClass: 'invalid-feedback d-block',
  submitButton: {
    text: 'Save Changes',
    class: 'btn btn-primary btn-lg'
  },
  fields: [/* ... */]
};
```

## Advanced Features

### Field Groups

```javascript
{
  type: 'group',
  label: 'Address Information',
  class: 'border p-3 rounded',
  fields: [
    {
      type: 'text',
      name: 'street',
      label: 'Street Address'
    },
    {
      type: 'text',
      name: 'city',
      label: 'City',
      col: 6
    },
    {
      type: 'text',
      name: 'zipCode',
      label: 'ZIP Code',
      col: 6
    }
  ]
}
```

### Custom HTML Fields

```javascript
{
  type: 'html',
  content: '<div class="alert alert-info">Please fill out all required fields.</div>'
}
```

### Dividers

```javascript
{
  type: 'divider',
  class: 'my-4'
}
```

### Dynamic Field Attributes

```javascript
{
  type: 'text',
  name: 'username',
  label: 'Username',
  attributes: {
    'data-validation': 'username',
    'autocomplete': 'username',
    'spellcheck': 'false'
  }
}
```

### Help Text

```javascript
{
  type: 'password',
  name: 'password',
  label: 'Password',
  help: 'Must be at least 8 characters with uppercase, lowercase, and numbers',
  helpText: 'Same as help property'  // Alternative
}
```

## Complete Examples

### User Registration Form

```javascript
const registrationForm = {
  formClass: 'registration-form',
  useRowLayout: true,
  fields: [
    {
      type: 'header',
      text: 'Create Your Account',
      level: 2,
      className: 'text-center mb-4'
    },
    
    {
      type: 'header',
      text: 'Personal Information',
      level: 4,
      className: 'text-primary border-bottom pb-1 mb-3'
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
      inputGroup: {
        prepend: '<i class="bi bi-envelope"></i>'
      }
    },
    
    {
      type: 'tel',
      name: 'phone',
      label: 'Phone Number',
      inputGroup: {
        prepend: '<i class="bi bi-telephone"></i>'
      }
    },
    
    {
      type: 'header',
      text: 'Account Security',
      level: 4,
      className: 'text-primary border-bottom pb-1 mb-3 mt-4'
    },
    
    {
      type: 'text',
      name: 'username',
      label: 'Username',
      required: true,
      minLength: 3,
      maxLength: 20,
      pattern: '[a-zA-Z0-9_]+',
      help: 'Only letters, numbers, and underscores',
      inputGroup: {
        prepend: '@'
      }
    },
    
    {
      type: 'password',
      name: 'password',
      label: 'Password',
      required: true,
      minLength: 8,
      help: 'At least 8 characters',
      col: 6
    },
    
    {
      type: 'password',
      name: 'confirmPassword',
      label: 'Confirm Password',
      required: true,
      col: 6
    },
    
    {
      type: 'header',
      text: 'Preferences',
      level: 4,
      className: 'text-primary border-bottom pb-1 mb-3 mt-4'
    },
    
    {
      type: 'select',
      name: 'country',
      label: 'Country',
      required: true,
      options: [
        { value: '', label: 'Select Country' },
        { value: 'US', label: 'United States' },
        { value: 'CA', label: 'Canada' },
        { value: 'UK', label: 'United Kingdom' }
      ]
    },
    
    {
      type: 'checkbox',
      name: 'newsletter',
      label: 'Subscribe to newsletter'
    },
    
    {
      type: 'checkbox',
      name: 'terms',
      label: 'I agree to the Terms of Service',
      required: true
    },
    
    {
      type: 'divider',
      class: 'my-4'
    }
  ],
  
  submitButton: {
    text: 'Create Account',
    class: 'btn btn-primary btn-lg w-100'
  }
};
```

### Product Form with Pricing

```javascript
const productForm = {
  fields: [
    {
      type: 'header',
      text: 'Product Information',
      level: 3
    },
    
    {
      type: 'text',
      name: 'name',
      label: 'Product Name',
      required: true
    },
    
    {
      type: 'textarea',
      name: 'description',
      label: 'Description',
      rows: 4,
      maxLength: 1000
    },
    
    {
      type: 'header',
      text: 'Pricing & Inventory',
      level: 3,
      className: 'mt-4'
    },
    
    {
      type: 'number',
      name: 'price',
      label: 'Price',
      required: true,
      min: 0,
      step: 0.01,
      inputGroup: {
        prepend: '$',
        append: 'USD'
      },
      col: 6
    },
    
    {
      type: 'number',
      name: 'comparePrice',
      label: 'Compare at Price',
      min: 0,
      step: 0.01,
      inputGroup: {
        prepend: '$'
      },
      col: 6,
      help: 'Optional - shows savings'
    },
    
    {
      type: 'number',
      name: 'inventory',
      label: 'Stock Quantity',
      required: true,
      min: 0,
      inputGroup: {
        append: 'units'
      }
    },
    
    {
      type: 'select',
      name: 'category',
      label: 'Category',
      required: true,
      options: [
        { value: '', label: 'Select Category' },
        { value: 'electronics', label: 'Electronics' },
        { value: 'clothing', label: 'Clothing' },
        { value: 'books', label: 'Books' },
        { value: 'home', label: 'Home & Garden' }
      ]
    },
    
    {
      type: 'switch',
      name: 'active',
      label: 'Product Active',
      value: true
    }
  ]
};
```

### Contact Form with Input Groups

```javascript
const contactForm = {
  fields: [
    {
      type: 'header',
      text: 'Get in Touch',
      level: 2,
      className: 'text-center mb-4'
    },
    
    {
      type: 'text',
      name: 'name',
      label: 'Full Name',
      required: true,
      inputGroup: {
        prepend: '<i class="bi bi-person"></i>'
      }
    },
    
    {
      type: 'email',
      name: 'email',
      label: 'Email Address',
      required: true,
      inputGroup: {
        prepend: '<i class="bi bi-envelope"></i>'
      }
    },
    
    {
      type: 'text',
      name: 'website',
      label: 'Website',
      inputGroup: {
        prepend: 'https://',
        append: '<i class="bi bi-globe text-muted"></i>'
      }
    },
    
    {
      type: 'select',
      name: 'subject',
      label: 'Subject',
      required: true,
      inputGroup: {
        prepend: '<i class="bi bi-chat-dots"></i>'
      },
      options: [
        { value: '', label: 'Select a topic' },
        { value: 'general', label: 'General Inquiry' },
        { value: 'support', label: 'Technical Support' },
        { value: 'sales', label: 'Sales Question' },
        { value: 'feedback', label: 'Feedback' }
      ]
    },
    
    {
      type: 'textarea',
      name: 'message',
      label: 'Message',
      required: true,
      rows: 5,
      maxLength: 2000,
      inputGroup: {
        prepend: '<i class="bi bi-chat-text"></i>'
      }
    },
    
    {
      type: 'range',
      name: 'priority',
      label: 'Priority Level',
      min: 1,
      max: 5,
      value: 3,
      help: '1 = Low, 5 = Urgent'
    }
  ],
  
  submitButton: {
    text: 'Send Message',
    class: 'btn btn-primary'
  }
};
```

## Best Practices

### 1. Form Organization
- Use headers to organize related fields into logical sections
- Keep forms focused and avoid overwhelming users
- Group related fields using consistent column layouts

### 2. Input Groups
- Use input groups to provide context and improve usability
- Keep prepend/append text short and meaningful
- Use icons consistently throughout your application

### 3. Validation
- Provide immediate feedback with HTML5 validation
- Use help text to guide users before they make mistakes
- Clear, specific error messages when validation fails

### 4. Accessibility
- Always provide labels for form fields
- Use proper field types for better mobile experience
- Ensure sufficient color contrast for error states

### 5. Performance
- Only create FormBuilder instances when needed
- Properly destroy forms when views are cleaned up
- Use model binding to reduce data synchronization code

This comprehensive guide covers all aspects of the FormBuilder component, from basic usage to advanced features like input groups and section headers. The component is designed to work seamlessly with Bootstrap 5 and the MOJO framework's patterns.