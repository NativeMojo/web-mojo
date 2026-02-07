# Model

The `Model` class is the foundation for managing individual data resources in MOJO. It provides REST API integration, event-driven change tracking, validation, dirty tracking, and request management. Every model represents a single entity with attributes that can be fetched, saved, and destroyed via RESTful endpoints.

---

## Table of Contents

### Overview
- [What is a Model?](#what-is-a-model)
- [Key Features](#key-features)
- [When to Use Models](#when-to-use-models)

### Quick Start
- [Basic Model Definition](#basic-model-definition)
- [Creating Model Instances](#creating-model-instances)
- [First CRUD Operations](#first-crud-operations)

### Core Concepts
- [Attributes and Data](#attributes-and-data)
- [REST Operations](#rest-operations)
- [Event System](#event-system)
- [Validation](#validation)
- [Dirty Tracking](#dirty-tracking)

### API Reference
- [Constructor Options](#constructor-options)
- [Instance Properties](#instance-properties)
- [Attribute Methods](#attribute-methods)
- [REST Methods](#rest-methods)
- [Validation Methods](#validation-methods)
- [Dirty Tracking Methods](#dirty-tracking-methods)
- [Event Methods](#event-methods)
- [Static Methods](#static-methods)
- [Utility Methods](#utility-methods)

### Data Management
- [Reading Attributes](#reading-attributes)
- [Writing Attributes](#writing-attributes)
- [Nested Attributes with Dot Notation](#nested-attributes-with-dot-notation)
- [Using Pipe Formatters](#using-pipe-formatters)

### REST Operations
- [Fetching Data (GET)](#fetching-data-get)
- [Saving Data (POST/PUT)](#saving-data-postput)
- [Deleting Data (DELETE)](#deleting-data-delete)
- [Request Deduplication](#request-deduplication)
- [Request Cancellation](#request-cancellation)
- [Debounced Fetching](#debounced-fetching)
- [Rate Limiting](#rate-limiting)

### Events
- [Understanding Model Events](#understanding-model-events)
- [Listening to Changes](#listening-to-changes)
- [Field-Specific Events](#field-specific-events)
- [Silent Operations](#silent-operations)
- [Removing Event Listeners](#removing-event-listeners)

### Validation
- [Built-in Validation System](#built-in-validation-system)
- [Defining Validation Rules](#defining-validation-rules)
- [Field-Level Validation](#field-level-validation)
- [Custom Validators](#custom-validators)
- [Validation Errors](#validation-errors)

### Advanced Features
- [Building Custom Models](#building-custom-models)
- [Custom Endpoints and URL Building](#custom-endpoints-and-url-building)
- [Static Model Methods](#static-model-methods)
- [Request Lifecycle](#request-lifecycle)
- [Error Handling](#error-handling)
- [Loading States](#loading-states)

### Integration
- [Using Models with Views](#using-models-with-views)
- [Using Models with Collections](#using-models-with-collections)
- [Using Models with Forms](#using-models-with-forms)

### Best Practices
- [Model Design Guidelines](#model-design-guidelines)
- [Performance Optimization](#performance-optimization)
- [Error Handling Best Practices](#error-handling-best-practices)
- [Testing Models](#testing-models)

### Troubleshooting
- [Common Issues](#common-issues)
- [Debugging Techniques](#debugging-techniques)

---

## What is a Model?

A `Model` is a JavaScript class that represents a single entity or resource in your application (e.g., a User, Product, Order). It:

- **Encapsulates data** as attributes
- **Provides CRUD operations** through REST endpoints
- **Emits events** when data changes
- **Validates** data before saving
- **Tracks changes** to detect unsaved modifications

Think of a Model as a smart wrapper around your data that knows how to talk to your backend API.

---

## Key Features

- **REST Integration**: Built-in fetch, save, and destroy methods
- **Event System**: Automatic change events for data binding
- **Validation**: Synchronous and asynchronous validation support
- **Dirty Tracking**: Detect unsaved changes with `isDirty()`
- **Dot Notation**: Access nested attributes with `user.get('metadata.profile.name')`
- **Pipe Formatters**: Format values on read with `user.get('created_at|date')`
- **Request Management**: Automatic deduplication, cancellation, and rate limiting
- **Error Handling**: Structured error responses with `model.errors`
- **Loading States**: Track fetch/save state with `model.loading`

---

## When to Use Models

Use models when you need to:

- Represent a single entity from your backend API
- Perform CRUD operations on individual resources
- Track changes to data for save/cancel workflows
- Validate user input before submission
- Keep UI synchronized with data changes through events
- Manage loading states and errors for API operations

---

## Basic Model Definition

Define a model by extending the `Model` class and specifying an API endpoint:

```javascript
import Model from '@core/Model.js';

class User extends Model {
  constructor(data = {}) {
    super(data, {
      endpoint: '/api/users',
      idAttribute: 'id',
      timestamps: true
    });
  }

  // Optional: Add custom validation
  validate() {
    const errors = {};
    if (!this.get('name')) {
      errors.name = 'Name is required';
    }
    if (!this.get('email') || !this.get('email').includes('@')) {
      errors.email = 'Valid email is required';
    }
    return Object.keys(errors).length ? errors : null;
  }
}

export default User;
```

---

## Creating Model Instances

Create new model instances with initial data:

```javascript
// Empty model
const user = new User();

// Model with initial data
const user = new User({
  name: 'Alice Johnson',
  email: 'alice@example.com',
  role: 'admin'
});

// Model with ID (for fetching existing resource)
const user = new User({ id: 123 });
await user.fetch();
```

---

## First CRUD Operations

Perform basic CRUD operations:

```javascript
// CREATE - Save new model
const newUser = new User({
  name: 'Bob Smith',
  email: 'bob@example.com'
});
await newUser.save(); // POST /api/users
console.log('Created user ID:', newUser.get('id'));

// READ - Fetch existing model
const user = new User({ id: 123 });
await user.fetch(); // GET /api/users/123
console.log('User name:', user.get('name'));

// UPDATE - Modify and save
user.set('name', 'Bobby Smith');
await user.save(); // PUT /api/users/123

// DELETE - Destroy model
await user.destroy(); // DELETE /api/users/123
```

---

## Attributes and Data

Models store data in the `attributes` object. You can access attributes using:

- `model.get(key)` - Read attribute values
- `model.set(key, value)` - Write attribute values
- `model.getData()` - Get all attributes as plain object
- `model.toJSON()` - Convert to JSON (includes ID)

The `attributes` object is also aliased as `model._` for convenience.

---

## REST Operations

Models provide three main REST methods:

1. **fetch()** - GET request to retrieve data from server
2. **save()** - POST (new) or PUT (existing) to save data to server
3. **destroy()** - DELETE request to remove resource from server

All REST methods return promises that resolve with the API response.

---

## Event System

Models automatically emit events when data changes:

- `'change'` - Emitted when any attribute changes
- `'change:fieldName'` - Emitted when specific field changes

Listen to events to keep your UI synchronized:

```javascript
user.on('change', (model) => {
  console.log('User changed:', model.toJSON());
  view.render();
});

user.on('change:name', (newName, model) => {
  console.log('Name changed to:', newName);
});

// Trigger events
user.set('name', 'New Name'); // Emits 'change' and 'change:name'
```

---

## Validation

Models support synchronous validation via the `validate()` method:

```javascript
class Product extends Model {
  validate() {
    const errors = {};
    if (!this.get('name')) errors.name = 'Name is required';
    if (this.get('price') < 0) errors.price = 'Price must be >= 0';
    return Object.keys(errors).length ? errors : null;
  }
}

const product = new Product({ name: '', price: -5 });
product.validate();
console.log(product.errors); // { name: '...', price: '...' }
```

---

## Dirty Tracking

Models track changes to detect unsaved modifications:

```javascript
const user = new User({ id: 1, name: 'Alice' });
await user.fetch(); // Loads data from server

console.log(user.isDirty()); // false

user.set('name', 'Alicia');
console.log(user.isDirty()); // true
console.log(user.getChangedAttributes()); // { name: { from: 'Alice', to: 'Alicia' } }

user.reset(); // Revert to original
console.log(user.isDirty()); // false
```

---

## Constructor Options

When creating a model, you can pass options to the constructor:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | String | `''` | REST API endpoint for this model |
| `idAttribute` | String | `'id'` | Name of the ID attribute |
| `timestamps` | Boolean | `true` | Whether server manages timestamps |

```javascript
const user = new User(data, {
  endpoint: '/api/v2/users',
  idAttribute: 'user_id',
  timestamps: true
});
```

---

## Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | String/Number | Model's unique identifier |
| `attributes` | Object | Plain object containing model data |
| `_` | Object | Alias for `attributes` |
| `originalAttributes` | Object | Snapshot of data after last fetch/save |
| `errors` | Object | Validation and server errors |
| `loading` | Boolean | True when fetch/save is in progress |
| `endpoint` | String | REST API endpoint |
| `options` | Object | Configuration options |

```javascript
console.log(user.id); // 123
console.log(user.attributes); // { id: 123, name: 'Alice', ... }
console.log(user.errors); // { email: 'Invalid email' }
console.log(user.loading); // false
```

---

## Attribute Methods

### get(key)

Get attribute value with support for dot notation and pipe formatters.

```javascript
// Simple access
user.get('name'); // 'Alice Johnson'

// Dot notation for nested attributes
user.get('metadata.profile.title'); // 'Software Engineer'

// Pipe formatters
user.get('created_at|date'); // 'Jan 15, 2024'
user.get('name|uppercase'); // 'ALICE JOHNSON'
```

**Parameters:**
- `key` (String) - Attribute key with optional pipes

**Returns:** Attribute value, possibly formatted

---

### set(key, value, options)

Set attribute value(s) and emit change events.

```javascript
// Set single attribute
user.set('name', 'Alicia Johnson');

// Set multiple attributes
user.set({
  name: 'Bob Smith',
  email: 'bob@example.com',
  active: true
});

// Set nested attribute
user.set('metadata.profile.title', 'Senior Engineer');

// Silent set (no events)
user.set('name', 'Charlie', { silent: true });
```

**Parameters:**
- `key` (String | Object) - Attribute key or object of key-value pairs
- `value` (Any) - Attribute value (if key is string)
- `options` (Object) - Options: `{ silent: true }` to suppress events

**Emits:**
- `'change'` event when data changes
- `'change:fieldName'` event for specific field

---

### getData()

Get all attributes as a plain object.

```javascript
const data = user.getData();
// { name: 'Alice', email: 'alice@example.com', ... }
```

**Returns:** Plain object containing all attributes

---

### getId()

Get the model's ID.

```javascript
const userId = user.getId(); // 123
```

**Returns:** Model's ID value

---

### toJSON()

Convert model to JSON representation (includes ID).

```javascript
const json = user.toJSON();
// { id: 123, name: 'Alice', email: 'alice@example.com', ... }
```

**Returns:** Object with ID and all attributes

---

## REST Methods

### fetch(options)

Fetch model data from the server via GET request.

```javascript
// Basic fetch
const user = new User({ id: 123 });
await user.fetch(); // GET /api/users/123

// Fetch with query params
await user.fetch({
  params: { include: 'profile,settings' }
}); // GET /api/users/123?include=profile,settings

// Fetch with graph (special query param)
await user.fetch({
  graph: 'profile.avatar,settings'
}); // GET /api/users/123?graph=profile.avatar,settings

// Debounced fetch (waits before executing)
await user.fetch({ debounceMs: 300 });

// Custom URL
await user.fetch({ url: '/api/v2/users/123' });
```

**Parameters:**
- `options` (Object)
  - `params` (Object) - Query parameters
  - `graph` (String) - Graph query param for nested data
  - `debounceMs` (Number) - Debounce delay in milliseconds
  - `url` (String) - Custom URL to fetch from
  - `id` (String/Number) - Override ID for fetch

**Returns:** Promise resolving to REST response object

**Features:**
- **Request deduplication** - Identical requests return the same promise
- **Auto-cancellation** - Previous request cancelled when new one starts
- **Rate limiting** - Minimum 100ms between requests
- **Loading state** - Sets `model.loading = true` during fetch

---

### save(data, options)

Save model to server via POST (new) or PUT (existing).

```javascript
// Save new model (POST)
const newUser = new User({
  name: 'Alice',
  email: 'alice@example.com'
});
const response = await newUser.save(); // POST /api/users
if (response.success) {
  console.log('Created user ID:', newUser.get('id'));
}

// Update existing model (PUT)
const user = new User({ id: 123 });
await user.fetch();
user.set('name', 'Alicia');
await user.save(); // PUT /api/users/123

// Save with explicit data
await user.save({
  name: 'Bob',
  email: 'bob@example.com'
}); // Merges data into model before save

// Save with query params
await user.save(null, {
  params: { validate: true }
}); // PUT /api/users/123?validate=true
```

**Parameters:**
- `data` (Object) - Optional data to merge before saving
- `options` (Object)
  - `params` (Object) - Query parameters

**Returns:** Promise resolving to REST response object

**Behavior:**
- Uses POST for new models (no ID)
- Uses PUT for existing models (has ID)
- Updates `model.originalAttributes` on success
- Sets `model.errors` on failure
- Sets `model.loading = true` during save

---

### destroy(options)

Delete model from server via DELETE request.

```javascript
// Delete model
const user = new User({ id: 123 });
const response = await user.destroy(); // DELETE /api/users/123

if (response.success) {
  console.log('User deleted');
  // Model attributes and ID are cleared
}

// Delete with query params
await user.destroy({
  params: { soft_delete: true }
}); // DELETE /api/users/123?soft_delete=true
```

**Parameters:**
- `options` (Object)
  - `params` (Object) - Query parameters

**Returns:** Promise resolving to REST response object

**Behavior:**
- Requires model to have an ID
- Clears `model.attributes` and `model.id` on success
- Sets `model.errors` on failure
- Sets `model.loading = true` during delete

---

### cancel()

Cancel any active fetch request.

```javascript
// Start a fetch
const promise = user.fetch();

// Cancel it immediately
user.cancel();

// The promise will reject with AbortError
await promise.catch((err) => {
  console.log('Fetch cancelled');
});
```

**Returns:** Boolean - true if request was cancelled, false if no active request

---

### isFetching()

Check if model has an active fetch request.

```javascript
const promise = user.fetch();
console.log(user.isFetching()); // true

await promise;
console.log(user.isFetching()); // false
```

**Returns:** Boolean - true if fetch is in progress

---

### buildUrl(id)

Build URL for API requests.

```javascript
const user = new User({}, { endpoint: '/api/users' });

console.log(user.buildUrl()); // '/api/users'
console.log(user.buildUrl(123)); // '/api/users/123'
```

**Parameters:**
- `id` (String/Number) - Optional ID to append to URL

**Returns:** String - Complete API URL

---

## Validation Methods

### validate()

Validate all model attributes. Override in subclasses for custom validation.

```javascript
class User extends Model {
  validate() {
    const errors = {};
    
    if (!this.get('name') || !this.get('name').trim()) {
      errors.name = 'Name is required';
    }
    
    if (!this.get('email') || !this.get('email').includes('@')) {
      errors.email = 'Valid email is required';
    }
    
    if (this.get('age') && this.get('age') < 18) {
      errors.age = 'Must be 18 or older';
    }
    
    return Object.keys(errors).length ? errors : null;
  }
}

const user = new User({ name: '', email: 'invalid' });
const isValid = user.validate();
console.log(isValid); // false
console.log(user.errors); // { name: '...', email: '...' }
```

**Returns:** Boolean - true if valid, false if errors exist

**Sets:** `model.errors` object with validation errors

---

### validateField(field, rules)

Validate a single field with specified rules.

```javascript
class User extends Model {
  constructor(data = {}) {
    super(data, { endpoint: '/api/users' });
  }
  
  static validations = {
    name: { required: true, minLength: 2 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { required: true, minLength: 18 }
  };
}

const user = new User({ name: 'A' });
user.validateField('name', User.validations.name);
console.log(user.errors.name); // 'name must be at least 2 characters'
```

**Parameters:**
- `field` (String) - Field name to validate
- `rules` (Object | Array) - Validation rules

**Rule Types:**
- `{ required: true, message: 'Custom message' }`
- `{ minLength: 5, message: '...' }`
- `{ maxLength: 50, message: '...' }`
- `{ pattern: /regex/, message: '...' }`
- `function(value, model) { return true or error message }`

---

## Dirty Tracking Methods

### isDirty()

Check if model has unsaved changes.

```javascript
const user = new User({ id: 1, name: 'Alice' });
await user.fetch();

console.log(user.isDirty()); // false

user.set('name', 'Alicia');
console.log(user.isDirty()); // true

await user.save();
console.log(user.isDirty()); // false
```

**Returns:** Boolean - true if model has been modified

---

### getChangedAttributes()

Get attributes that have changed since last save.

```javascript
const user = new User({ id: 1, name: 'Alice', email: 'alice@example.com' });
await user.fetch();

user.set('name', 'Alicia');
user.set('email', 'alicia@example.com');

console.log(user.getChangedAttributes());
// {
//   name: 'Alicia',
//   email: 'alicia@example.com'
// }
```

**Returns:** Object containing only changed attributes

---

### reset()

Reset model to original state (last fetched/saved).

```javascript
const user = new User({ id: 1, name: 'Alice' });
await user.fetch();

user.set('name', 'Alicia');
console.log(user.get('name')); // 'Alicia'

user.reset();
console.log(user.get('name')); // 'Alice' (reverted)
console.log(user.isDirty()); // false
```

**Behavior:**
- Reverts `attributes` to `originalAttributes`
- Clears `errors`
- Does not emit events

---

## Event Methods

Models use the EventEmitter mixin for event handling.

### on(event, callback)

Listen for events.

```javascript
// Listen for any change
user.on('change', (model) => {
  console.log('Model changed:', model.toJSON());
});

// Listen for specific field change
user.on('change:name', (newValue, model) => {
  console.log('Name changed to:', newValue);
});

// Multiple listeners
user.on('change', updateView);
user.on('change', saveToLocalStorage);
```

**Parameters:**
- `event` (String) - Event name
- `callback` (Function) - Event handler

---

### off(event, callback)

Remove event listener.

```javascript
function handleChange(model) {
  console.log('Changed');
}

user.on('change', handleChange);
user.off('change', handleChange); // Remove specific listener

user.off('change'); // Remove all 'change' listeners
user.off(); // Remove all listeners
```

**Parameters:**
- `event` (String) - Optional event name
- `callback` (Function) - Optional specific callback

---

### once(event, callback)

Listen for event once only.

```javascript
user.once('change', (model) => {
  console.log('First change only');
});

user.set('name', 'Alice'); // Logs "First change only"
user.set('name', 'Bob'); // Does not log
```

**Parameters:**
- `event` (String) - Event name
- `callback` (Function) - Event handler

---

### emit(event, ...args)

Emit event to all listeners.

```javascript
// Usually you don't call this directly
// (set() automatically emits events)

user.emit('custom-event', { data: 'value' });
```

**Parameters:**
- `event` (String) - Event name
- `...args` - Arguments to pass to listeners

---

## Static Methods

### Model.find(id, options)

Create and fetch a model by ID.

```javascript
// Convenient one-liner for creating + fetching
const user = await User.find(123);
console.log(user.get('name'));

// Equivalent to:
const user = new User({ id: 123 });
await user.fetch();
```

**Parameters:**
- `id` (String/Number) - Model ID to fetch
- `options` (Object) - Fetch options

**Returns:** Promise resolving to model instance

---

### Model.create(data, options)

Create a new model instance.

```javascript
const user = User.create({
  name: 'Alice',
  email: 'alice@example.com'
});

// Equivalent to:
const user = new User({
  name: 'Alice',
  email: 'alice@example.com'
});
```

**Parameters:**
- `data` (Object) - Initial model data
- `options` (Object) - Constructor options

**Returns:** New model instance

---

## Utility Methods

### getContextValue(key)

Get context value for templates. Alias for `get(key)`.

```javascript
// Used internally by template system
const value = user.getContextValue('name|uppercase');
```

---

## Reading Attributes

Use `get(key)` to read attribute values:

```javascript
const user = new User({
  id: 123,
  name: 'Alice Johnson',
  email: 'alice@example.com',
  role: 'admin',
  metadata: {
    profile: {
      title: 'Software Engineer',
      avatar: '/images/alice.jpg'
    }
  }
});

// Simple access
user.get('name'); // 'Alice Johnson'
user.get('email'); // 'alice@example.com'

// Nested access with dot notation
user.get('metadata.profile.title'); // 'Software Engineer'
user.get('metadata.profile.avatar'); // '/images/alice.jpg'

// Instance fields (like id, endpoint, etc.)
user.get('id'); // 123
```

---

## Writing Attributes

Use `set(key, value)` to write attributes:

```javascript
const user = new User();

// Set single attribute
user.set('name', 'Alice Johnson');

// Set multiple attributes
user.set({
  name: 'Bob Smith',
  email: 'bob@example.com',
  role: 'user'
});

// Set nested attribute
user.set('metadata.profile.title', 'Senior Engineer');

// Silent set (no events)
user.set('active', true, { silent: true });
```

---

## Nested Attributes with Dot Notation

Access and modify deeply nested attributes using dot notation:

```javascript
const user = new User({
  metadata: {
    profile: {
      personal: {
        firstName: 'Alice',
        lastName: 'Johnson'
      }
    }
  }
});

// Read nested
user.get('metadata.profile.personal.firstName'); // 'Alice'

// Write nested
user.set('metadata.profile.personal.firstName', 'Alicia');

// Automatically creates missing intermediate objects
user.set('metadata.settings.theme.dark', true);
// Creates: metadata.settings = { theme: { dark: true } }
```

---

## Using Pipe Formatters

Format attribute values on read using pipe syntax:

```javascript
const user = new User({
  name: 'alice johnson',
  created_at: '2024-01-15T10:30:00Z',
  balance: 1234.56
});

// Text formatters
user.get('name|uppercase'); // 'ALICE JOHNSON'
user.get('name|capitalize'); // 'Alice Johnson'

// Date formatters
user.get('created_at|date'); // 'Jan 15, 2024'
user.get('created_at|time'); // '10:30 AM'
user.get('created_at|datetime'); // 'Jan 15, 2024 10:30 AM'

// Number formatters
user.get('balance|number'); // '1,234.56'
user.get('balance|currency'); // '$1,234.56'

// Chain multiple pipes
user.get('name|uppercase|truncate:10'); // 'ALICE JOHN...'
```

See [Templates.md](Templates.md) for complete formatter reference.

---

## Fetching Data (GET)

Fetch model data from the server:

```javascript
// Basic fetch
const user = new User({ id: 123 });
await user.fetch(); // GET /api/users/123

console.log(user.get('name'));
console.log(user.get('email'));

// Check loading state
user.fetch();
console.log(user.loading); // true

// Handle errors
const response = await user.fetch();
if (!response.success) {
  console.error('Fetch failed:', user.errors);
}
```

---

## Saving Data (POST/PUT)

Save model data to the server:

```javascript
// Create new model (POST)
const newUser = new User({
  name: 'Alice Johnson',
  email: 'alice@example.com'
});

const response = await newUser.save(); // POST /api/users

if (response.success) {
  console.log('Created user ID:', newUser.get('id'));
} else {
  console.error('Save failed:', newUser.errors);
}

// Update existing model (PUT)
const user = new User({ id: 123 });
await user.fetch();

user.set('name', 'Alicia Johnson');
await user.save(); // PUT /api/users/123

// Check if save is needed
if (user.isDirty()) {
  await user.save();
}
```

---

## Deleting Data (DELETE)

Delete model from the server:

```javascript
const user = new User({ id: 123 });
const response = await user.destroy(); // DELETE /api/users/123

if (response.success) {
  console.log('User deleted');
  console.log(user.get('id')); // null (cleared)
} else {
  console.error('Delete failed:', user.errors);
}
```

---

## Request Deduplication

Models automatically deduplicate identical in-flight requests:

```javascript
const user = new User({ id: 123 });

// Fire multiple fetch requests rapidly
const promise1 = user.fetch();
const promise2 = user.fetch(); // Returns same promise as promise1
const promise3 = user.fetch(); // Returns same promise as promise1

// Only one actual HTTP request is made
console.log(promise1 === promise2); // true
console.log(promise2 === promise3); // true

await promise1;
console.log('All three promises resolved with same response');
```

---

## Request Cancellation

Models automatically cancel previous requests when parameters change:

```javascript
const user = new User({ id: 123 });

// Start first fetch
const promise1 = user.fetch({ params: { include: 'profile' } });

// Start second fetch with different params
// First request is automatically cancelled
const promise2 = user.fetch({ params: { include: 'settings' } });

// Only the second request completes
await promise2;

// Manual cancellation
const promise3 = user.fetch();
user.cancel(); // Cancels promise3
```

---

## Debounced Fetching

Delay fetch execution for rapid changes:

```javascript
const user = new User({ id: 123 });

// Rapid-fire fetch requests with debounce
user.fetch({ debounceMs: 300 });
user.fetch({ debounceMs: 300 }); // Cancels previous
user.fetch({ debounceMs: 300 }); // Cancels previous

// Only the last fetch executes after 300ms of inactivity

// Useful for search-as-you-type
input.addEventListener('input', (e) => {
  user.set('query', e.target.value);
  user.fetch({ debounceMs: 300 });
});
```

---

## Rate Limiting

Models enforce minimum 100ms between requests:

```javascript
const user = new User({ id: 123 });

await user.fetch(); // Executes immediately

// Try to fetch again immediately
await user.fetch(); // Skipped due to rate limiting

// Wait 100ms
await new Promise(resolve => setTimeout(resolve, 100));
await user.fetch(); // Executes
```

---

## Understanding Model Events

Models emit events when data changes:

- **`'change'`** - Any attribute changed
- **`'change:fieldName'`** - Specific field changed

Events enable reactive UI updates:

```javascript
const user = new User({ name: 'Alice' });

// Listen for changes
user.on('change', (model) => {
  console.log('Model changed:', model.toJSON());
  updateUI();
});

user.on('change:name', (newName, model) => {
  console.log('Name changed to:', newName);
  updateNameDisplay(newName);
});

// Events fire automatically
user.set('name', 'Alicia'); // Triggers both events
```

---

## Listening to Changes

Attach event listeners to respond to data changes:

```javascript
const user = new User({ id: 123 });

// Listen for any change
user.on('change', (model) => {
  // Re-render view
  view.render();
});

// Listen for specific field
user.on('change:email', (email, model) => {
  // Validate email
  if (!email.includes('@')) {
    showError('Invalid email');
  }
});

// Fetch data - triggers change event
await user.fetch();
```

---

## Field-Specific Events

Listen to changes on individual fields:

```javascript
const user = new User();

user.on('change:name', (newName) => {
  console.log('Name:', newName);
});

user.on('change:email', (newEmail) => {
  console.log('Email:', newEmail);
});

user.on('change:role', (newRole) => {
  console.log('Role:', newRole);
  if (newRole === 'admin') {
    showAdminPanel();
  }
});

// Set attributes - triggers specific events
user.set({ name: 'Alice', email: 'alice@example.com', role: 'admin' });
// Logs:
// Name: Alice
// Email: alice@example.com
// Role: admin
```

---

## Silent Operations

Suppress events with the `silent` option:

```javascript
const user = new User();

// Normal set - fires events
user.set('name', 'Alice'); // Emits 'change' and 'change:name'

// Silent set - no events
user.set('email', 'alice@example.com', { silent: true }); // No events

// Useful for bulk updates without triggering re-renders
user.set({ name: 'Bob', email: 'bob@example.com', role: 'user' }, { silent: true });
```

---

## Removing Event Listeners

Remove event listeners when no longer needed:

```javascript
function handleChange(model) {
  console.log('Changed');
}

function handleNameChange(name) {
  console.log('Name:', name);
}

// Add listeners
user.on('change', handleChange);
user.on('change:name', handleNameChange);

// Remove specific listener
user.off('change', handleChange);

// Remove all listeners for event
user.off('change:name');

// Remove all listeners
user.off();
```

---

## Built-in Validation System

Models support synchronous validation via `validate()` and `validateField()`:

```javascript
class User extends Model {
  validate() {
    const errors = {};
    
    if (!this.get('name')) {
      errors.name = 'Name is required';
    }
    
    if (!this.get('email') || !this.get('email').includes('@')) {
      errors.email = 'Valid email is required';
    }
    
    if (this.get('password') && this.get('password').length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    return Object.keys(errors).length ? errors : null;
  }
}

const user = new User({ name: '', email: 'invalid' });
const isValid = user.validate();

if (!isValid) {
  console.log('Validation errors:', user.errors);
  // { name: 'Name is required', email: 'Valid email is required' }
}
```

---

## Defining Validation Rules

Use static `validations` property for declarative rules:

```javascript
class User extends Model {
  static validations = {
    name: [
      { required: true, message: 'Name is required' },
      { minLength: 2, message: 'Name must be at least 2 characters' }
    ],
    email: [
      { required: true, message: 'Email is required' },
      { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
    ],
    age: [
      { required: true, message: 'Age is required' },
      (value, model) => {
        if (value < 18) return 'Must be 18 or older';
        if (value > 120) return 'Invalid age';
        return true;
      }
    ]
  };
}

// Validate all fields
const user = new User({ name: 'A', email: 'invalid', age: 15 });
user.validate();
console.log(user.errors);
```

---

## Field-Level Validation

Validate individual fields:

```javascript
class Product extends Model {
  validateField(field, rules) {
    if (field === 'price') {
      const price = this.get('price');
      if (price < 0) {
        this.errors.price = 'Price must be non-negative';
      } else if (price > 1000000) {
        this.errors.price = 'Price is too high';
      }
    }
  }
}

const product = new Product({ price: -5 });
product.validateField('price');
console.log(product.errors.price); // 'Price must be non-negative'
```

---

## Custom Validators

Implement custom validation logic:

```javascript
class User extends Model {
  validate() {
    const errors = {};
    
    // Custom validation: username must be unique
    if (this.get('username')) {
      const exists = this.checkUsernameExists(this.get('username'));
      if (exists) {
        errors.username = 'Username already taken';
      }
    }
    
    // Cross-field validation
    if (this.get('password') !== this.get('password_confirmation')) {
      errors.password_confirmation = 'Passwords do not match';
    }
    
    // Conditional validation
    if (this.get('country') === 'US' && !this.get('state')) {
      errors.state = 'State is required for US addresses';
    }
    
    return Object.keys(errors).length ? errors : null;
  }
  
  checkUsernameExists(username) {
    // Check against existing users
    return false; // Implement your logic
  }
}
```

---

## Validation Errors

Access validation errors via `model.errors`:

```javascript
const user = new User({ name: '', email: 'invalid' });
user.validate();

// Check for errors
if (Object.keys(user.errors).length > 0) {
  console.log('Validation failed');
  
  // Display errors in UI
  for (const [field, message] of Object.entries(user.errors)) {
    showFieldError(field, message);
  }
}

// Clear errors
user.errors = {};

// Server errors are also stored here
await user.save();
if (!response.success) {
  console.log('Server errors:', user.errors);
}
```

---

## Building Custom Models

Create specialized models for your domain:

```javascript
import Model from '@core/Model.js';

class Product extends Model {
  constructor(data = {}) {
    super(data, {
      endpoint: '/api/products',
      idAttribute: 'product_id'
    });
  }
  
  // Custom getter
  getDisplayPrice() {
    const price = this.get('price');
    const currency = this.get('currency') || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price);
  }
  
  // Custom method
  applyDiscount(percent) {
    const price = this.get('price');
    const discounted = price * (1 - percent / 100);
    this.set('price', discounted);
  }
  
  // Validation
  validate() {
    const errors = {};
    if (!this.get('name')) errors.name = 'Name is required';
    if (this.get('price') < 0) errors.price = 'Price must be positive';
    if (!this.get('sku')) errors.sku = 'SKU is required';
    return Object.keys(errors).length ? errors : null;
  }
}

export default Product;
```

---

## Custom Endpoints and URL Building

Customize REST endpoints and URL generation:

```javascript
class Order extends Model {
  constructor(data = {}) {
    super(data, { endpoint: '/api/orders' });
  }
  
  // Override URL building
  buildUrl(id = null) {
    const userId = this.get('user_id');
    let url = `/api/users/${userId}/orders`;
    if (id) url += `/${id}`;
    return url;
  }
  
  // Custom REST method
  async cancel() {
    const url = `${this.buildUrl(this.id)}/cancel`;
    const response = await this.rest.POST(url);
    if (response.success) {
      this.set('status', 'cancelled');
    }
    return response;
  }
}

const order = new Order({ id: 456, user_id: 123 });
await order.cancel(); // POST /api/users/123/orders/456/cancel
```

---

## Static Model Methods

Use static methods for convenience:

```javascript
// Fetch model by ID
const user = await User.find(123);
console.log(user.get('name'));

// Create instance
const newUser = User.create({
  name: 'Alice',
  email: 'alice@example.com'
});
await newUser.save();

// Custom static methods
class User extends Model {
  static async findByEmail(email) {
    const response = await rest.GET('/api/users/search', { email });
    if (response.success && response.data) {
      return new User(response.data);
    }
    return null;
  }
}

const user = await User.findByEmail('alice@example.com');
```

---

## Request Lifecycle

Understanding the request lifecycle:

1. **Before Request**
   - `model.loading = false`
   - `model.errors = {}`

2. **During Request**
   - `model.loading = true`
   - Request deduplication active
   - Auto-cancellation if params change

3. **After Success**
   - `model.loading = false`
   - `model.set(responseData)` (updates attributes)
   - `model.originalAttributes` updated
   - `model.errors = {}`
   - Events emitted

4. **After Failure**
   - `model.loading = false`
   - `model.errors` populated
   - Attributes unchanged

```javascript
const user = new User({ id: 123 });

console.log(user.loading); // false

const promise = user.fetch();
console.log(user.loading); // true

await promise;
console.log(user.loading); // false
console.log(user.errors); // {} if success, { ... } if error
```

---

## Error Handling

Handle errors from REST operations:

```javascript
const user = new User({ id: 123 });

// Fetch errors
const fetchResponse = await user.fetch();
if (!fetchResponse.success) {
  console.error('Fetch failed:', user.errors);
  // { fetch: 'Network error' }
}

// Save errors
const saveResponse = await user.save();
if (!saveResponse.success) {
  console.error('Save failed:', user.errors);
  // { name: 'Name is required', email: 'Invalid email' }
  
  // Display field errors
  for (const [field, message] of Object.entries(user.errors)) {
    showError(field, message);
  }
}

// Destroy errors
const destroyResponse = await user.destroy();
if (!destroyResponse.success) {
  console.error('Delete failed:', user.errors);
}

// Try-catch for exceptions
try {
  await user.save();
} catch (error) {
  console.error('Unexpected error:', error);
}
```

---

## Loading States

Track loading state for UI feedback:

```javascript
const user = new User({ id: 123 });

// Show loading spinner
if (user.loading) {
  showSpinner();
}

// Start fetch
user.fetch();
if (user.loading) {
  showSpinner();
}

// Wait for completion
await user.fetch();
if (!user.loading) {
  hideSpinner();
}

// In a view
class UserView extends View {
  async onAfterRender() {
    this.user.on('change', () => this.render());
    await this.user.fetch();
  }
  
  getTemplateData() {
    return {
      user: this.user.toJSON(),
      loading: this.user.loading,
      errors: this.user.errors
    };
  }
}
```

---

## Using Models with Views

Integrate models with views for reactive UI:

```javascript
import { View } from '@core/View.js';
import User from '@models/User.js';

class UserProfileView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="profile">
          <h2>{{user.name}}</h2>
          <p>{{user.email}}</p>
          <button data-action="save">Save Changes</button>
        </div>
      `,
      ...options
    });
    
    // Create model
    this.user = new User({ id: options.userId });
    
    // Listen for changes
    this.user.on('change', () => this.render());
  }
  
  async onAfterMount() {
    await this.user.fetch();
  }
  
  async onActionSave() {
    if (this.user.isDirty()) {
      const response = await this.user.save();
      if (response.success) {
        this.showMessage('Saved successfully');
      } else {
        this.showErrors(this.user.errors);
      }
    }
    return true;
  }
  
  getTemplateData() {
    return {
      user: this.user.toJSON(),
      loading: this.user.loading
    };
  }
}
```

---

## Using Models with Collections

Models work seamlessly with collections:

```javascript
import Collection from '@core/Collection.js';
import User from '@models/User.js';

class UserCollection extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: User,
      endpoint: '/api/users',
      ...options
    });
  }
}

const users = new UserCollection();
await users.fetch();

// Get model from collection
const user = users.get(123);

// Modify model
user.set('name', 'Updated Name');

// Save model
await user.save();

// Changes reflect in collection
console.log(users.get(123).get('name')); // 'Updated Name'
```

See [Collection.md](Collection.md) for more details.

---

## Using Models with Forms

Models integrate with form fields:

```javascript
import FormView from '@core/views/form/FormView.js';
import User from '@models/User.js';

const user = new User({ id: 123 });
await user.fetch();

const form = new FormView({
  model: user,
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'role', label: 'Role', type: 'select', options: ['user', 'admin'] }
  ],
  onSubmit: async (data) => {
    const response = await user.save();
    if (response.success) {
      console.log('User saved');
    } else {
      form.showErrors(user.errors);
    }
  }
});

await form.render();
await form.mount('#form-container');
```

---

## Model Design Guidelines

Best practices for model design:

1. **Single Responsibility**: One model per entity type
2. **Consistent Endpoints**: Use RESTful conventions
3. **Validation**: Put validation logic in models, not views
4. **Events**: Emit events for data changes to enable reactive UIs
5. **Immutability**: Use `set()` instead of direct attribute mutation
6. **Error Handling**: Always check `response.success` and `model.errors`

```javascript
// Good: Clear, focused model
class User extends Model {
  constructor(data = {}) {
    super(data, { endpoint: '/api/users' });
  }
  
  validate() {
    // Validation logic here
  }
  
  isAdmin() {
    return this.get('role') === 'admin';
  }
}

// Bad: Model doing too much
class User extends Model {
  render() { /* views should render */ }
  saveToLocalStorage() { /* use separate persistence layer */ }
  sendEmail() { /* use separate service */ }
}
```

---

## Performance Optimization

Optimize model performance:

1. **Use Silent Operations**: Suppress events for bulk updates
2. **Debounce Fetches**: Reduce API calls with `debounceMs`
3. **Cancel Unused Requests**: Call `model.cancel()` when navigating away
4. **Minimize Change Events**: Batch `set()` calls

```javascript
// Bad: Multiple events
user.set('name', 'Alice');
user.set('email', 'alice@example.com');
user.set('role', 'admin');
// Emits 3 'change' events

// Good: Single event
user.set({
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin'
});
// Emits 1 'change' event

// Better: Silent bulk update, then single render
user.set(bulkData, { silent: true });
view.render(); // Manual render
```

---

## Error Handling Best Practices

Handle errors consistently:

```javascript
// Always check response.success
const response = await user.save();
if (response.success) {
  showMessage('Saved successfully');
} else {
  showErrors(user.errors);
}

// Validate before saving
if (user.isDirty()) {
  const isValid = user.validate();
  if (isValid) {
    await user.save();
  } else {
    showValidationErrors(user.errors);
  }
}

// Handle network errors
try {
  await user.fetch();
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request cancelled');
  } else {
    showError('Network error');
  }
}

// Display field-specific errors
for (const [field, message] of Object.entries(user.errors)) {
  const fieldElement = document.querySelector(`[name="${field}"]`);
  showFieldError(fieldElement, message);
}
```

---

## Testing Models

Test models thoroughly:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import User from '@models/User.js';

describe('User Model', () => {
  let user;
  
  beforeEach(() => {
    user = new User();
  });
  
  it('should create empty user', () => {
    expect(user.get('name')).toBeUndefined();
  });
  
  it('should set and get attributes', () => {
    user.set('name', 'Alice');
    expect(user.get('name')).toBe('Alice');
  });
  
  it('should emit change events', () => {
    const spy = vi.fn();
    user.on('change', spy);
    user.set('name', 'Alice');
    expect(spy).toHaveBeenCalledWith(user);
  });
  
  it('should validate required fields', () => {
    user.set({ name: '', email: 'invalid' });
    const isValid = user.validate();
    expect(isValid).toBe(false);
    expect(user.errors.name).toBeTruthy();
    expect(user.errors.email).toBeTruthy();
  });
  
  it('should track dirty state', () => {
    user.set('name', 'Alice');
    expect(user.isDirty()).toBe(false); // No original
    
    user.originalAttributes = { name: 'Alice' };
    user.set('name', 'Bob');
    expect(user.isDirty()).toBe(true);
  });
  
  it('should reset to original', () => {
    user.originalAttributes = { name: 'Alice' };
    user.set('name', 'Bob');
    user.reset();
    expect(user.get('name')).toBe('Alice');
  });
});
```

---

## Common Issues

### Model not fetching data

**Problem:** `fetch()` returns empty or fails

**Solutions:**
- Verify `endpoint` is set correctly
- Check model has an `id` before fetching
- Inspect network tab for actual request
- Check server response format matches expected structure

```javascript
// Debug
console.log('Endpoint:', user.endpoint);
console.log('ID:', user.getId());
console.log('URL:', user.buildUrl(user.getId()));

const response = await user.fetch();
console.log('Response:', response);
```

---

### Events not firing

**Problem:** Change listeners not triggered

**Solutions:**
- Use `set()` instead of direct attribute mutation
- Check listener is attached before changes
- Verify not using `{ silent: true }`
- Ensure event name is correct (`'change:fieldName'`)

```javascript
// Bad: No events
user.attributes.name = 'Alice'; // Direct mutation

// Good: Events fire
user.set('name', 'Alice'); // Uses set()

// Check listeners
console.log('Change listeners:', user._events?.change?.length);
```

---

### Validation errors not showing

**Problem:** `model.errors` is empty after validation

**Solutions:**
- Call `validate()` explicitly before checking errors
- Ensure `validate()` returns errors object or null
- Check validation logic is correct

```javascript
// Call validate first
user.set({ name: '', email: 'invalid' });
const isValid = user.validate(); // Must call this
console.log('Errors:', user.errors); // Now populated

// Ensure validate() implementation is correct
validate() {
  const errors = {};
  if (!this.get('name')) errors.name = 'Required';
  return Object.keys(errors).length ? errors : null; // Return null or errors
}
```

---

### Duplicate requests

**Problem:** Multiple identical requests sent

**Solutions:**
- Use built-in deduplication (automatic)
- Check if calling `fetch()` multiple times unnecessarily
- Use `isFetching()` to check before fetching

```javascript
// Deduplication works automatically
const promise1 = user.fetch();
const promise2 = user.fetch(); // Returns same promise
console.log(promise1 === promise2); // true

// Manual check
if (!user.isFetching()) {
  await user.fetch();
}
```

---

### Model changes not persisting

**Problem:** Changes lost after save

**Solutions:**
- Check `response.success` after save
- Inspect `model.errors` for validation issues
- Verify server accepts and returns updated data
- Ensure not calling `reset()` or `fetch()` after save

```javascript
const response = await user.save();
if (!response.success) {
  console.error('Save failed:', user.errors);
  // Fix validation errors or server issues
}
```

---

## Debugging Techniques

Enable debug logging for models:

```javascript
// Log all changes
user.on('change', (model) => {
  console.log('Changed:', model.getChangedAttributes());
});

// Log fetches
const originalFetch = user.fetch.bind(user);
user.fetch = async (...args) => {
  console.log('Fetching:', user.buildUrl(user.getId()));
  const result = await originalFetch(...args);
  console.log('Fetched:', result);
  return result;
};

// Inspect internal state
console.log('Attributes:', user.attributes);
console.log('Original:', user.originalAttributes);
console.log('Errors:', user.errors);
console.log('Loading:', user.loading);
console.log('Dirty:', user.isDirty());
console.log('Changed:', user.getChangedAttributes());

// Monitor events
const originalEmit = user.emit.bind(user);
user.emit = (event, ...args) => {
  console.log('Event:', event, args);
  originalEmit(event, ...args);
};
```

---

## Summary

The `Model` class provides a robust foundation for managing individual data resources in MOJO applications. Key takeaways:

- Models represent single entities with attributes and REST operations
- Use `get()` and `set()` for attribute access to leverage events and validation
- Models automatically emit `'change'` and `'change:fieldName'` events
- Implement `validate()` for synchronous validation before saves
- Use `isDirty()` and `getChangedAttributes()` for change tracking
- REST methods (`fetch`, `save`, `destroy`) handle all API communication
- Request management features (deduplication, cancellation, rate limiting) are built-in
- Models integrate seamlessly with Views, Collections, and Forms

For collection management, see [Collection.md](Collection.md).  
For using models in views, see [View.md](View.md).  
For form integration, see [Form.md](Form.md).
