# DataView Component Guide

The **DataView** component provides a clean, responsive way to display key/value data in a grid layout. It extends MOJO's View class and supports both raw data objects and Model instances with built-in formatting capabilities.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Configuration Options](#configuration-options)
- [Field Definitions](#field-definitions)
- [Data Sources](#data-sources)
- [Formatting & Display Types](#formatting--display-types)
- [Event Handling](#event-handling)
- [Model Integration](#model-integration)
- [Advanced Examples](#advanced-examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

## Overview

DataView automatically creates a responsive grid layout to display object properties as labeled key/value pairs. It's perfect for:

- User profile displays
- Product details pages
- Configuration panels
- Data inspection interfaces
- Dashboard summary sections

### Key Features

- **Responsive Design**: Automatically adapts to screen size
- **Multiple Data Sources**: Works with plain objects, Models, or any data structure
- **Auto Field Generation**: Creates fields automatically from data if none specified
- **Built-in Formatting**: Integrates with MOJO's DataFormatter for value display
- **Type-Aware Display**: Special rendering for emails, URLs, booleans, dates, etc.
- **Event System**: Built on View's event system for interactions
- **Customizable Layout**: Configurable columns, responsive breakpoints, styling

## Basic Usage

### Simple Object Display

```js
import { DataView } from '../components/DataView.js';

// Basic user data
const userData = {
  name: 'John Doe',
  email: 'john@example.com', 
  phone: '555-1234',
  department: 'Engineering',
  isActive: true,
  joinDate: '2024-01-15'
};

// Create and render DataView
const dataView = new DataView({
  data: userData,
  columns: 2  // 2-column layout
});

await dataView.render(document.getElementById('user-details'));
```

### With Container Element

```js
const container = document.querySelector('.profile-section');
const dataView = new DataView({
  data: userData
});

await dataView.render(container);
```

### Quick Factory Method

```js
// Static factory method for convenience
const dataView = DataView.create({
  data: userData,
  columns: 3,
  responsive: true
});
```

## Configuration Options

### Constructor Options

```js
const dataView = new DataView({
  // Data source
  data: {},              // Raw data object
  model: null,           // MOJO Model instance (alternative to data)
  fields: [],            // Field definitions (auto-generated if empty)
  
  // Layout options
  columns: 2,            // Number of columns (1-12)
  responsive: true,      // Enable responsive breakpoints
  
  // Display options
  showEmptyValues: false, // Show fields with null/empty values
  emptyValueText: '—',   // Text to display for empty values
  
  // View options (inherited from View)
  className: 'data-view',
  tagName: 'div',
  container: null
});
```

### Layout Configuration

```js
const dataView = new DataView({
  data: userData,
  
  // Responsive columns: 1 on mobile, 2 on tablet, 3 on desktop
  columns: 3,
  responsive: true,
  
  // Custom CSS classes
  className: 'user-profile-view',
  
  // Show empty fields with custom text
  showEmptyValues: true,
  emptyValueText: 'Not specified'
});
```

## Field Definitions

### Auto-Generated Fields

If no fields are specified, DataView automatically creates them from your data:

```js
const data = {
  firstName: 'John',
  lastName: 'Doe',
  emailAddress: 'john@example.com'
};

// Auto-generates fields:
// - firstName → "First Name"
// - lastName → "Last Name" 
// - emailAddress → "Email Address"
const dataView = new DataView({ data });
```

### Custom Field Definitions

```js
const dataView = new DataView({
  data: userData,
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      colSize: 6  // Bootstrap column size (1-12)
    },
    {
      name: 'email', 
      label: 'Email Address',
      type: 'email',  // Special display type
      colSize: 6
    },
    {
      name: 'department',
      label: 'Department',
      colSize: 4
    },
    {
      name: 'isActive',
      label: 'Status',
      type: 'boolean',
      colSize: 4
    },
    {
      name: 'joinDate',
      label: 'Member Since', 
      format: 'date:MMM DD, YYYY',  // DataFormatter pipe
      colSize: 4
    }
  ]
});
```

### Field Properties

```js
const field = {
  name: 'fieldName',        // Required: property name in data
  label: 'Display Label',   // Optional: defaults to formatted name
  type: 'text',            // Display type (text, email, url, boolean, number)
  format: 'date:YYYY',     // DataFormatter pipe string
  colSize: 6,              // Bootstrap column size (1-12)
  labelClass: 'custom-label', // Custom CSS class for label
  valueClass: 'custom-value'  // Custom CSS class for value
};
```

## Data Sources

### Raw Objects

```js
const productData = {
  id: 'P123',
  name: 'Widget Pro',
  price: 29.99,
  inStock: true,
  category: 'Electronics'
};

const dataView = new DataView({
  data: productData
});
```

### MOJO Models

```js
// Using a MOJO Model
const user = new User({ id: 123 });
await user.fetch();

const dataView = new DataView({
  model: user,  // Use model instead of data
  fields: [
    { name: 'name', label: 'Name' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'createdAt', label: 'Created', format: 'relative' }
  ]
});

// Model changes automatically update the view
user.on('change', () => {
  console.log('DataView will auto-refresh');
});
```

### Dynamic Data Updates

```js
const dataView = new DataView({ data: initialData });

// Update data and re-render
await dataView.updateData(newData);

// Update specific fields
await dataView.updateFields([
  { name: 'status', label: 'Current Status', type: 'boolean' }
]);
```

## Formatting & Display Types

### Built-in Display Types

```js
const fields = [
  // Email with mailto link
  { name: 'email', type: 'email' },
  
  // URL with external link icon
  { name: 'website', type: 'url' },
  
  // Boolean as success/secondary badges
  { name: 'isActive', type: 'boolean' },
  
  // Number with locale formatting
  { name: 'salary', type: 'number' },
  
  // Default text display
  { name: 'notes', type: 'text' }
];
```

### DataFormatter Integration

```js
const fields = [
  // Date formatting
  { name: 'createdAt', format: 'date:MMM DD, YYYY' },
  { name: 'updatedAt', format: 'relative' },
  
  // Number formatting  
  { name: 'price', format: 'currency' },
  { name: 'fileSize', format: 'filesize' },
  
  // String formatting
  { name: 'description', format: 'truncate:100' },
  { name: 'title', format: 'capitalize' },
  
  // JSON objects
  { name: 'metadata', type: 'json' },        // Force JSON display
  { name: 'settings' }                       // Auto-detected as JSON if object
];
```

### JSON Object Display

DataView automatically detects object and array values and displays them as formatted JSON:

```js
const complexData = {
  user: 'John Doe',
  permissions: ['read', 'write', 'admin'],
  settings: {
    theme: 'dark',
    notifications: {
      email: true,
      push: false,
      frequency: 'daily'
    }
  },
  metadata: {
    created: '2024-01-15',
    lastModified: '2024-01-20',
    version: 2.1
  }
};

const dataView = new DataView({
  data: complexData,
  fields: [
    { name: 'user', label: 'User Name' },
    { name: 'permissions', label: 'Permissions', type: 'json' },
    { name: 'settings', label: 'User Settings' }, // Auto-detected as JSON
    { name: 'metadata', label: 'Metadata', type: 'object' }
  ]
});
```

**JSON Display Features:**
- **Syntax Highlighting**: Keys, strings, numbers, booleans color-coded
- **Collapsible**: Large objects (>10 lines or >500 chars) show collapsed by default
- **Copy to Clipboard**: One-click JSON copying with visual feedback
- **Preview**: Large objects show truncated preview when collapsed
- **Responsive**: Scrollable containers for long JSON content

### Custom Display Logic

```js
// Override formatDisplayValue for custom rendering
class CustomDataView extends DataView {
  formatDisplayValue(value, field) {
    if (field.name === 'priority') {
      const colors = { high: 'danger', medium: 'warning', low: 'success' };
      return `<span class="badge bg-${colors[value] || 'secondary'}">${value}</span>`;
    }
    
    return super.formatDisplayValue(value, field);
  }
}
```

## Event Handling

### Field Click Events

```js
const dataView = new DataView({ data: userData });

// Listen for field clicks
dataView.on('field:click', ({ field, fieldName, element, event }) => {
  console.log(`Clicked on field: ${fieldName}`);
  
  // Custom actions based on field
  if (field.type === 'email') {
    // Already handled by default email type
  } else if (fieldName === 'department') {
    showDepartmentDetails(field.value);
  }
});
```

### Data Change Events

```js
dataView.on('data:updated', ({ data }) => {
  console.log('Data was updated:', data);
  trackAnalytics('dataview.updated');
});

dataView.on('fields:updated', ({ fields }) => {
  console.log('Fields configuration changed');
});

dataView.on('error', ({ error, message }) => {
  console.error('DataView error:', message, error);
  showNotification('Error updating view', 'error');
});
```

## Model Integration

### Automatic Model Sync

```js
class UserProfileView extends DataView {
  constructor(options) {
    super({
      model: options.user,
      fields: [
        { name: 'name', label: 'Name', colSize: 6 },
        { name: 'email', label: 'Email', type: 'email', colSize: 6 },
        { name: 'department', label: 'Department', colSize: 6 },
        { name: 'role', label: 'Role', colSize: 6 },
        { name: 'lastLogin', label: 'Last Login', format: 'relative', colSize: 12 }
      ],
      ...options
    });
  }
}

// Usage
const user = new User({ id: 123 });
const profileView = new UserProfileView({ user });
await profileView.render(container);

// Model changes auto-update the view
user.set('department', 'Marketing');  // View updates automatically
```

### Manual Refresh from Model

```js
const dataView = new DataView({ model: user });

// Refresh data from server
await dataView.refresh();  // Calls user.fetch() and updates view
```

## Advanced Examples

### Multi-Section Layout

```js
class ProductDetailsView extends DataView {
  constructor(product) {
    super({
      model: product,
      fields: [
        // Basic Info Section
        { name: 'name', label: 'Product Name', colSize: 8 },
        { name: 'sku', label: 'SKU', colSize: 4 },
        { name: 'description', label: 'Description', colSize: 12 },
        
        // Pricing Section  
        { name: 'price', label: 'Price', format: 'currency', colSize: 4 },
        { name: 'discount', label: 'Discount', format: 'percent', colSize: 4 },
        { name: 'finalPrice', label: 'Final Price', format: 'currency', colSize: 4 },
        
        // Status Section
        { name: 'inStock', label: 'In Stock', type: 'boolean', colSize: 6 },
        { name: 'category', label: 'Category', colSize: 6 }
      ],
      columns: 3,
      className: 'product-details'
    });
  }
}
```

### Conditional Field Display

```js
class UserDataView extends DataView {
  buildItemHTML(field) {
    // Hide sensitive fields for non-admin users
    if (field.name === 'ssn' && !this.currentUser?.isAdmin) {
      return '';
    }
    
    // Show different fields based on user type
    if (field.name === 'employeeId' && this.model.get('type') !== 'employee') {
      return '';
    }
    
    return super.buildItemHTML(field);
  }
}
```

### Dynamic Field Configuration

```js
class ConfigurableDataView extends DataView {
  async onInit() {
    super.onInit();
    
    // Load field configuration from API
    const config = await this.loadFieldConfig();
    this.fields = config.fields;
    
    if (this.rendered) {
      await this.render();
    }
  }
  
  async loadFieldConfig() {
    const response = await fetch('/api/dataview-config');
    return response.json();
  }
}
```

### API Response Display

Perfect for displaying API responses and debugging data:

```js
class APIResponseView extends DataView {
  constructor(apiResponse) {
    super({
      data: apiResponse,
      fields: [
        { name: 'status', label: 'Status Code', colSize: 3 },
        { name: 'timestamp', label: 'Timestamp', format: 'datetime', colSize: 9 },
        { name: 'data', label: 'Response Data', type: 'json', colSize: 12 },
        { name: 'headers', label: 'Headers', type: 'json', colSize: 6 },
        { name: 'metadata', label: 'Metadata', colSize: 6 }
      ],
      columns: 2,
      showEmptyValues: true
    });
  }
}

// Usage
const response = {
  status: 200,
  timestamp: '2024-01-15T10:30:00Z',
  data: {
    users: [
      { id: 1, name: 'John', active: true },
      { id: 2, name: 'Jane', active: false }
    ],
    pagination: { page: 1, total: 50 }
  },
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-cache'
  }
};

const apiView = new APIResponseView(response);
```

### Dialog Integration

DataView integrates seamlessly with MOJO's Dialog component for quick data display modals:

```js
import { Dialog } from '../components/Dialog.js';

// Quick data display dialog
const userData = {
  name: 'John Doe',
  email: 'john@example.com', 
  department: 'Engineering',
  isActive: true,
  joinDate: '2024-01-15'
};

await Dialog.showData({
  title: 'User Details',
  data: userData,
  columns: 2
});

// Advanced dialog with custom configuration
await Dialog.showData({
  title: 'Profile Information',
  model: userModel,
  fields: [
    { name: 'name', label: 'Full Name', colSize: 6 },
    { name: 'email', type: 'email', colSize: 6 },
    { name: 'department', label: 'Department', colSize: 4 },
    { name: 'role', label: 'Role', colSize: 4 },
    { name: 'joinDate', label: 'Member Since', format: 'date:MMM DD, YYYY', colSize: 4 }
  ],
  size: 'lg',
  responsive: true,
  closeText: 'Done'
});

// Listen for DataView events within dialog
const dialogPromise = Dialog.showData({
  title: 'Interactive Data',
  data: complexData
});

// Events are forwarded with 'dataview:' prefix
dialog.on('dataview:field:click', ({ field, fieldName }) => {
  console.log(`Field clicked in dialog: ${fieldName}`);
});

await dialogPromise;
```

## API Reference

### Constructor
- `new DataView(options)` - Create new DataView instance

### Methods

#### Data Management
- `updateData(data)` - Update data and re-render
- `updateFields(fields)` - Update field configuration  
- `updateConfig(options)` - Update display options
- `getCurrentData()` - Get current data object
- `refresh()` - Refresh from model (if available)

#### Field Management
- `getField(name)` - Get field definition by name
- `generateFieldsFromData()` - Auto-generate fields from data
- `formatLabel(name)` - Format field name to display label
- `inferFieldType(value)` - Infer display type from value

#### Display & Formatting
- `getFieldValue(field)` - Get formatted field value
- `formatDisplayValue(value, field)` - Format value for display
- `buildItemHTML(field)` - Build HTML for single field
- `getColumnClasses(field)` - Get Bootstrap column classes

#### Inherited from View
- `render(container)` - Render the view
- `mount()` - Mount to DOM
- `destroy()` - Clean up and remove
- `on(event, handler)` - Add event listener
- `off(event, handler)` - Remove event listener
- `emit(event, data)` - Emit event

### Static Methods
- `DataView.create(options)` - Factory method

### Events
- `field:click` - User clicked on a field
- `data:updated` - Data was updated
- `fields:updated` - Field configuration changed
- `config:updated` - Display configuration changed
- `data:refreshed` - Data refreshed from model
- `error` - Error occurred

## Best Practices

### 1. Field Organization

```js
// Group related fields and use consistent column sizes
const fields = [
  // Personal Info (full width)
  { name: 'name', label: 'Full Name', colSize: 12 },
  
  // Contact Info (half width)
  { name: 'email', label: 'Email', type: 'email', colSize: 6 },
  { name: 'phone', label: 'Phone', colSize: 6 },
  
  // Metadata (third width)  
  { name: 'status', label: 'Status', type: 'boolean', colSize: 4 },
  { name: 'department', label: 'Department', colSize: 4 },
  { name: 'role', label: 'Role', colSize: 4 }
];
```

### 2. Responsive Design

```js
// Use responsive columns for different screen sizes
const dataView = new DataView({
  data: userData,
  columns: 3,        // 3 columns on desktop
  responsive: true,  // Drops to 1 column on mobile
  
  fields: [
    // Important fields get larger column sizes
    { name: 'name', colSize: 12 },      // Always full width
    { name: 'email', colSize: 8 },      // Larger
    { name: 'phone', colSize: 4 }       // Smaller
  ]
});
```

### 3. Performance with Large Datasets

```js
// For large objects, specify only needed fields
const dataView = new DataView({
  data: largeObject,
  fields: essentialFields,  // Don't auto-generate all fields
  showEmptyValues: false    // Skip empty fields
});
```

### 4. User Experience

```js
// Provide meaningful labels and formatting
const fields = [
  {
    name: 'createdAt',
    label: 'Account Created',           // Clear label
    format: 'date:MMM DD, YYYY',       // Readable format
    colSize: 6
  },
  {
    name: 'lastLoginAt', 
    label: 'Last Seen',                // User-friendly label
    format: 'relative',                // "2 hours ago"
    colSize: 6
  }
];
```

### 5. Error Handling

```js
const dataView = new DataView({ model: user });

dataView.on('error', ({ error, message }) => {
  // Show user-friendly error message
  this.showError('Unable to load profile data. Please try again.');
  
  // Log technical details
  console.error('DataView error:', error);
  
  // Track for monitoring
  analytics.track('dataview.error', { message, component: 'UserProfile' });
});
```

### 6. Accessibility

```js
// Use semantic labels and ARIA attributes when needed
const dataView = new DataView({
  data: userData,
  className: 'user-profile',
  fields: [
    {
      name: 'email',
      label: 'Email Address',  // Screen reader friendly
      type: 'email'
    }
  ]
});

// Add ARIA labels for complex data
dataView.on('after:render', () => {
  const element = dataView.element;
  element.setAttribute('role', 'region');
  element.setAttribute('aria-label', 'User profile information');
});
```

---

The DataView component provides a powerful, flexible way to display structured data in your MOJO applications while maintaining consistency with the framework's patterns and conventions.