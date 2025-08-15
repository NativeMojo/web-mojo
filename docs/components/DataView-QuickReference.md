# DataView Quick Reference

## Basic Usage

```js
import { DataView } from '../components/DataView.js';

// Simple object display
const dataView = new DataView({
  data: { name: 'John', email: 'john@example.com', active: true },
  columns: 2
});
await dataView.render('#container');

// With Model
const dataView = new DataView({
  model: userModel,
  fields: [
    { name: 'name', label: 'Full Name' },
    { name: 'email', type: 'email' }
  ]
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | Object | `{}` | Raw data object |
| `model` | Model | `null` | MOJO Model instance |
| `fields` | Array | `[]` | Field definitions (auto-generated if empty) |
| `columns` | Number | `2` | Number of columns (1-12) |
| `responsive` | Boolean | `true` | Enable responsive breakpoints |
| `showEmptyValues` | Boolean | `false` | Show fields with null/empty values |
| `emptyValueText` | String | `'—'` | Text for empty values |

## Field Definition

```js
const field = {
  name: 'fieldName',              // Required: data property name
  label: 'Display Label',         // Optional: defaults to formatted name
  type: 'text',                   // Display type
  format: 'date:MMM DD, YYYY',    // DataFormatter pipe
  colSize: 6,                     // Bootstrap column size (1-12)
  labelClass: 'custom-label',     // Custom label CSS
  valueClass: 'custom-value'      // Custom value CSS
};
```

## Display Types

| Type | Description | Example Output |
|------|-------------|----------------|
| `text` | Default text display | `John Doe` |
| `email` | Clickable mailto link | `john@example.com` |
| `url` | External link with icon | `https://example.com ↗` |
| `boolean` | Success/Secondary badge | `✓ Yes` / `No` |
| `number` | Locale-formatted number | `1,234.56` |
| `json` | Formatted JSON with syntax highlighting | `{"key": "value"}` |
| `object` | Auto-detected objects as JSON | `[1, 2, 3]` |

## Common Patterns

### User Profile
```js
new DataView({
  model: user,
  fields: [
    { name: 'name', label: 'Name', colSize: 6 },
    { name: 'email', type: 'email', colSize: 6 },
    { name: 'department', colSize: 4 },
    { name: 'role', colSize: 4 },
    { name: 'isActive', type: 'boolean', colSize: 4 }
  ]
});
```

### Product Details
```js
new DataView({
  data: product,
  fields: [
    { name: 'name', label: 'Product Name', colSize: 8 },
    { name: 'price', format: 'currency', colSize: 4 },
    { name: 'description', colSize: 12 },
    { name: 'inStock', type: 'boolean', colSize: 6 }
  ],
  columns: 3
});
```

### Settings Panel
```js
new DataView({
  data: settings,
  fields: [
    { name: 'theme', label: 'Theme', colSize: 6 },
    { name: 'notifications', type: 'boolean', colSize: 6 },
    { name: 'apiKey', label: 'API Key', colSize: 12 },
    { name: 'lastBackup', format: 'relative', colSize: 12 }
  ],
  showEmptyValues: true
});
```

### JSON Data Display
```js
const complexData = {
  user: 'John',
  permissions: ['read', 'write', 'admin'],
  config: { theme: 'dark', lang: 'en' }
};

new DataView({
  data: complexData,
  fields: [
    { name: 'user', label: 'Username', colSize: 12 },
    { name: 'permissions', type: 'json', colSize: 6 },
    { name: 'config', label: 'Configuration', colSize: 6 }
  ]
});
```

## Event Handling

```js
const dataView = new DataView({ data: userData });

// Field interactions
dataView.on('field:click', ({ field, fieldName, element, event }) => {
  console.log(`Clicked: ${fieldName}`);
});

// Data changes
dataView.on('data:updated', ({ data }) => {
  console.log('Data updated');
});

dataView.on('error', ({ error, message }) => {
  console.error('Error:', message);
});
```

## Dynamic Updates

```js
// Update data
await dataView.updateData(newUserData);

// Update fields configuration
await dataView.updateFields([
  { name: 'status', type: 'boolean' }
]);

// Update display options
await dataView.updateConfig({ columns: 3 });

// Refresh from model
await dataView.refresh(); // Calls model.fetch()
```

## Dialog Integration

```js
import { Dialog } from '../components/Dialog.js';

// Quick data display dialog
await Dialog.showData({
  title: 'User Details',
  data: userData,
  columns: 2
});

// Advanced dialog with custom fields
await Dialog.showData({
  title: 'Profile Information',
  model: userModel,
  fields: [
    { name: 'name', label: 'Full Name', colSize: 6 },
    { name: 'email', type: 'email', colSize: 6 },
    { name: 'joinDate', format: 'date:MMM DD, YYYY', colSize: 12 }
  ],
  size: 'lg',
  closeText: 'Done'
});

// Listen for events within dialog
dialog.on('dataview:field:click', ({ fieldName }) => {
  console.log(`Field clicked: ${fieldName}`);
});
```

## Formatting Examples

```js
const fields = [
  // Dates
  { name: 'createdAt', format: 'date:MMM DD, YYYY' },
  { name: 'updatedAt', format: 'relative' },
  
  // Numbers
  { name: 'price', format: 'currency' },
  { name: 'size', format: 'filesize' },
  
  // Strings
  { name: 'description', format: 'truncate:100' },
  { name: 'name', format: 'capitalize' },
  
  // JSON Objects
  { name: 'metadata', type: 'json' },        // Force JSON display
  { name: 'settings' },                      // Auto-detected if object
  { name: 'permissions', type: 'object' }    // Arrays as JSON
];
```

## API Methods

| Method | Description |
|--------|-------------|
| `updateData(data)` | Update data and re-render |
| `updateFields(fields)` | Update field configuration |
| `updateConfig(options)` | Update display options |
| `getCurrentData()` | Get current data object |
| `getField(name)` | Get field definition |
| `refresh()` | Refresh from model |

## Responsive Layout

```js
// Default: 1 column mobile, 2 columns desktop
new DataView({
  data: userData,
  columns: 2,
  responsive: true
});

// Custom column sizes per field
fields: [
  { name: 'name', colSize: 12 },        // Always full width
  { name: 'email', colSize: 8 },        // 8/12 on desktop, full on mobile
  { name: 'phone', colSize: 4 }         // 4/12 on desktop, full on mobile
]
```

## Best Practices

- Use meaningful labels: `'Member Since'` instead of `'createdAt'`
- Group related fields with consistent column sizes
- Use appropriate display types for data (email, url, boolean)
- Apply formatting for better readability (dates, numbers)
- Handle empty values appropriately
- Listen for errors and provide user feedback