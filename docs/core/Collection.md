# Collection

The `Collection` class manages ordered sets of `Model` instances in MOJO. It provides REST API integration for fetching lists, pagination support, event-driven updates, and powerful query methods. Collections are the primary way to work with arrays of models, whether from remote APIs or preloaded data.

---

## Table of Contents

### Overview
- [What is a Collection?](#what-is-a-collection)
- [Key Features](#key-features)
- [When to Use Collections](#when-to-use-collections)

### Quick Start
- [Basic Collection Definition](#basic-collection-definition)
- [Creating Collection Instances](#creating-collection-instances)
- [First Fetch and Query](#first-fetch-and-query)

### Core Concepts
- [Models in Collections](#models-in-collections)
- [REST Operations](#rest-operations)
- [Pagination](#pagination)
- [Event System](#event-system)
- [Preloaded vs REST Data](#preloaded-vs-rest-data)

### API Reference
- [Constructor Options](#constructor-options)
- [Instance Properties](#instance-properties)
- [Fetching Methods](#fetching-methods)
- [Parameter Management](#parameter-management)
- [Model Management Methods](#model-management-methods)
- [Query Methods](#query-methods)
- [Event Methods](#event-methods)
- [Utility Methods](#utility-methods)
- [Static Methods](#static-methods)

### Data Management
- [Adding Models](#adding-models)
- [Removing Models](#removing-models)
- [Resetting Collections](#resetting-collections)
- [Sorting Collections](#sorting-collections)

### REST Operations
- [Fetching Collection Data](#fetching-collection-data)
- [Fetching Single Items](#fetching-single-items)
- [Downloading Collection Data](#downloading-collection-data)
- [Request Deduplication](#request-deduplication)
- [Request Cancellation](#request-cancellation)
- [Rate Limiting](#rate-limiting)

### Pagination
- [Setting Pagination Parameters](#setting-pagination-parameters)
- [Navigating Pages](#navigating-pages)
- [Pagination Metadata](#pagination-metadata)

### Parsing Responses
- [Default Response Parsing](#default-response-parsing)
- [Custom Response Parsing](#custom-response-parsing)
- [Handling Metadata](#handling-metadata)

### Querying Collections
- [Finding Models](#finding-models)
- [Filtering with where()](#filtering-with-where)
- [Getting Models by ID or Index](#getting-models-by-id-or-index)
- [Iterating Over Models](#iterating-over-models)

### Events
- [Understanding Collection Events](#understanding-collection-events)
- [Listening to Changes](#listening-to-changes)
- [Event Payload Structure](#event-payload-structure)
- [Fetch Lifecycle Events](#fetch-lifecycle-events)

### Advanced Features
- [Building Custom Collections](#building-custom-collections)
- [Custom Endpoints and URL Building](#custom-endpoints-and-url-building)
- [Debounced Parameter Updates](#debounced-parameter-updates)
- [Download with Date Ranges](#download-with-date-ranges)
- [Model-Collection Communication](#model-collection-communication)

### Integration
- [Using Collections with Views](#using-collections-with-views)
- [Using Collections with Forms](#using-collections-with-forms)
- [Using Collections with Tables](#using-collections-with-tables)

### Best Practices
- [Collection Design Guidelines](#collection-design-guidelines)
- [Performance Optimization](#performance-optimization)
- [Error Handling Best Practices](#error-handling-best-practices)
- [Testing Collections](#testing-collections)

### Troubleshooting
- [Common Issues](#common-issues)
- [Debugging Techniques](#debugging-techniques)

---

## What is a Collection?

A `Collection` is a JavaScript class that manages an ordered array of `Model` instances. It:

- **Manages model arrays** with add/remove/reset operations
- **Fetches data from APIs** with pagination support
- **Emits events** when the collection changes
- **Provides query methods** for finding and filtering models
- **Supports iteration** with for...of loops

Think of a Collection as a smart array that knows how to fetch, parse, and manage sets of models.

---

## Key Features

- **REST Integration**: Built-in fetch for paginated lists
- **Event System**: Automatic events for add, remove, update, reset
- **Pagination**: First-class support for `start`, `size`, and metadata
- **Query Methods**: `where()`, `findWhere()`, `get()`, `at()`
- **Sorting**: In-place sorting with custom comparators
- **Iteration**: Full support for for...of loops
- **Request Management**: Deduplication, cancellation, and rate limiting
- **Preloaded Mode**: Works with static data (no REST calls)
- **Flexible Parsing**: Override `parse()` for custom API formats
- **Download Support**: Export collection data as CSV/JSON

---

## When to Use Collections

Use collections when you need to:

- Fetch and display lists of items from an API
- Implement pagination for large datasets
- Query and filter model arrays
- Keep UI synchronized with data changes through events
- Manage shopping carts, task lists, or any ordered sets
- Work with preloaded data without REST calls

---

## Basic Collection Definition

Define a collection by extending the `Collection` class and specifying the model class and endpoint:

```javascript
import Collection from '@core/Collection.js';
import User from '@models/User.js';

class UserCollection extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: User,
      endpoint: '/api/users',
      size: 20,
      ...options
    });
  }
}

export default UserCollection;
```

---

## Creating Collection Instances

Create collection instances with or without initial data:

```javascript
// Empty collection
const users = new UserCollection();

// Collection with preloaded data
const users = new UserCollection({
  preloaded: true,
  data: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]
});

// Collection with custom pagination
const users = new UserCollection({
  size: 50,
  params: { role: 'admin' }
});
```

---

## First Fetch and Query

Fetch data and query the collection:

```javascript
const users = new UserCollection();

// Fetch first page
await users.fetch(); // GET /api/users?start=0&size=20

console.log('Total count:', users.meta.count);
console.log('Number of models:', users.length());

// Query collection
const admins = users.where(u => u.get('role') === 'admin');
const alice = users.findWhere(u => u.get('name') === 'Alice');

// Get by ID
const user = users.get(123);

// Iterate
for (const user of users) {
  console.log(user.get('name'));
}
```

---

## Models in Collections

Collections manage `Model` instances:

- **Automatic instantiation**: Plain objects are converted to models
- **ID-based deduplication**: Adding model with existing ID updates it
- **Model references**: Models know their parent collection
- **Shared events**: Changes to models can trigger collection updates

```javascript
const users = new UserCollection();

// Add plain objects - converted to User models
users.add([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);

// Get model
const alice = users.get(1);
console.log(alice instanceof User); // true

// Modify model
alice.set('name', 'Alicia');
console.log(users.get(1).get('name')); // 'Alicia'
```

---

## REST Operations

Collections provide REST methods for fetching data:

1. **fetch()** - GET request to retrieve collection data
2. **fetchOne(id)** - GET request to retrieve single model
3. **download()** - GET request to export collection data

All REST methods return promises that resolve with the API response.

---

## Pagination

Collections have built-in pagination support:

- **`start`** - Offset for pagination (e.g., 0, 20, 40)
- **`size`** - Number of items per page (e.g., 20)
- **`count`** - Total number of items (from server metadata)

```javascript
const users = new UserCollection({ size: 20 });

// Page 1
await users.setParams({ start: 0 });

// Page 2
await users.setParams({ start: 20 });

// Page 3
await users.setParams({ start: 40 });

// Check metadata
console.log('Total:', users.meta.count);
console.log('Current page size:', users.meta.size);
```

---

## Event System

Collections automatically emit events when modified:

- `'add'` - Models added to collection
- `'remove'` - Models removed from collection
- `'update'` - Collection modified (after add/remove)
- `'reset'` - Collection reset (all models replaced)
- `'fetch:start'` - Fetch started
- `'fetch:success'` - Fetch succeeded
- `'fetch:error'` - Fetch failed
- `'fetch:end'` - Fetch completed (success or error)

```javascript
users.on('add', ({ models, collection }) => {
  console.log('Added', models.length, 'users');
});

users.on('update', () => {
  console.log('Collection updated');
  view.render();
});
```

---

## Preloaded vs REST Data

Collections support two modes:

### REST Mode (default)
```javascript
const users = new UserCollection({ restEnabled: true });
await users.fetch(); // Makes API call
```

### Preloaded Mode
```javascript
const users = new UserCollection({
  preloaded: true,
  data: [{ id: 1, name: 'Alice' }]
});
await users.fetch(); // Skips API call, uses preloaded data
```

---

## Constructor Options

When creating a collection, you can pass options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ModelClass` | Class | `Model` | Model class for collection items |
| `endpoint` | String | `''` | REST API endpoint |
| `size` | Number | `10` | Items per page |
| `params` | Object | `{}` | Default query parameters |
| `data` | Array | `[]` | Initial data (converted to models) |
| `preloaded` | Boolean | `false` | Skip REST fetch if data exists |
| `restEnabled` | Boolean | `true` | Enable/disable REST operations |
| `parse` | Boolean | `true` | Parse response through `parse()` method |
| `reset` | Boolean | `true` | Reset collection on fetch |
| `rateLimiting` | Boolean | `false` | Enable rate limiting (100ms minimum) |

```javascript
const users = new UserCollection({
  ModelClass: User,
  endpoint: '/api/v2/users',
  size: 50,
  params: { active: true },
  preloaded: false,
  restEnabled: true
});
```

---

## Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `models` | Array | Array of model instances |
| `ModelClass` | Class | Model class constructor |
| `endpoint` | String | REST API endpoint |
| `params` | Object | Current query parameters |
| `meta` | Object | Metadata from last fetch (count, size, start) |
| `loading` | Boolean | True when fetch is in progress |
| `errors` | Object | Errors from last operation |
| `options` | Object | Configuration options |
| `restEnabled` | Boolean | Whether REST operations are enabled |

```javascript
console.log(users.models.length); // Number of models
console.log(users.params); // { start: 0, size: 20, ... }
console.log(users.meta.count); // Total count from server
console.log(users.loading); // false
```

---

## Fetching Methods

### fetch(additionalParams)

Fetch collection data from the server.

```javascript
// Basic fetch
await users.fetch(); // GET /api/users?start=0&size=20

// Fetch with additional params (merged, not persisted)
await users.fetch({ search: 'alice' });
// GET /api/users?start=0&size=20&search=alice

// Next fetch uses base params only
await users.fetch(); // GET /api/users?start=0&size=20

// Silent fetch (no events)
await users.fetch({ silent: true });

// No-reset fetch (append instead of replace)
await users.fetch({ reset: false });
```

**Parameters:**
- `additionalParams` (Object) - Temporary parameters for this fetch only

**Returns:** Promise resolving to REST response object

**Features:**
- **Request deduplication** - Identical requests return same promise
- **Auto-cancellation** - Previous request cancelled when params change
- **Rate limiting** - Optional minimum 100ms between requests
- **Preloaded skip** - Skips fetch if `preloaded: true` and data exists

---

### fetchOne(id, options)

Fetch a single model by ID.

```javascript
// Fetch single model
const user = await users.fetchOne(123);
// GET /api/users/123

if (user) {
  console.log('Fetched:', user.get('name'));
}

// Fetch and add to collection
await users.fetchOne(456, { addToCollection: true });

// Fetch and merge with existing
await users.fetchOne(123, {
  addToCollection: true,
  merge: true
});

// Silent fetch
await users.fetchOne(789, { silent: true });
```

**Parameters:**
- `id` (String | Number) - Model ID to fetch
- `options` (Object)
  - `addToCollection` (Boolean) - Add model to collection
  - `merge` (Boolean) - Merge with existing model if present
  - `silent` (Boolean) - Suppress events

**Returns:** Promise resolving to model instance or null

---

### download(format, options)

Download collection data in specified format.

```javascript
// Download as JSON
await users.download('json');

// Download as CSV
await users.download('csv');

// Download with custom filename
await users.download('csv', {
  filename: 'users-export.csv'
});

// Downloads use current filters but remove pagination
// If users.params = { start: 20, size: 20, role: 'admin' }
// Download URL: /api/users?role=admin&download_format=csv
```

**Parameters:**
- `format` (String) - Download format ('json', 'csv', etc.)
- `options` (Object) - Download options (e.g., filename)

**Returns:** Promise resolving to download result

**Behavior:**
- Removes `start` and `size` params (full export)
- Adds `download_format` param
- Includes date range suffix if `dr_start`/`dr_end` present
- Triggers browser download

---

## Parameter Management

### setParams(newParams, autoFetch, debounceMs)

Replace all parameters and optionally fetch.

```javascript
// Set params without fetching
users.setParams({ role: 'admin', start: 0 });

// Set params and fetch immediately
await users.setParams({ role: 'admin', start: 0 }, true);
// GET /api/users?role=admin&start=0&size=20

// Set params and fetch after debounce
await users.setParams({ search: 'alice' }, true, 300);
// Waits 300ms before fetching
```

**Parameters:**
- `newParams` (Object) - New parameters (replaces all existing)
- `autoFetch` (Boolean) - Automatically fetch after setting params
- `debounceMs` (Number) - Debounce delay in milliseconds

**Returns:** Promise (if autoFetch) or collection instance

---

### updateParams(patchParams, autoFetch, debounceMs)

Merge new parameters with existing and optionally fetch.

```javascript
// Merge params without fetching
users.updateParams({ role: 'admin' });
// Keeps existing params, adds role: 'admin'

// Merge params and fetch
await users.updateParams({ search: 'bob' }, true);

// Merge params and fetch with debounce
await users.updateParams({ search: 'alice' }, true, 300);
```

**Parameters:**
- `patchParams` (Object) - Parameters to merge with existing
- `autoFetch` (Boolean) - Automatically fetch after updating
- `debounceMs` (Number) - Debounce delay in milliseconds

**Returns:** Promise (if autoFetch) or collection instance

---

## Model Management Methods

### add(data, options)

Add model(s) to the collection.

```javascript
// Add plain objects
users.add([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);

// Add model instances
const newUser = new User({ id: 3, name: 'Charlie' });
users.add(newUser);

// Silent add (no events)
users.add({ id: 4, name: 'Dave' }, { silent: true });

// Add with merge (updates existing models with same ID)
users.add({ id: 1, name: 'Alicia' }, { merge: true });

// Add without merge (duplicates not added)
users.add({ id: 1, name: 'Alicia' }, { merge: false });
```

**Parameters:**
- `data` (Object | Array) - Model data or array of model data
- `options` (Object)
  - `silent` (Boolean) - Suppress events
  - `merge` (Boolean) - Update existing models (default: true)

**Returns:** Array of added models

**Emits:**
- `'add'` event with `{ models, collection }`
- `'update'` event

---

### remove(models, options)

Remove model(s) from the collection.

```javascript
// Remove by ID
users.remove(1);
users.remove([1, 2, 3]);

// Remove by model instance
const user = users.get(1);
users.remove(user);

// Remove multiple
users.remove([user1, user2, user3]);

// Silent remove
users.remove(1, { silent: true });
```

**Parameters:**
- `models` (Model | Array | String | Number) - Models or IDs to remove
- `options` (Object)
  - `silent` (Boolean) - Suppress events

**Returns:** Array of removed models

**Emits:**
- `'remove'` event with `{ models, collection }`
- `'update'` event

---

### reset(models, options)

Replace all models in the collection.

```javascript
// Reset to empty
users.reset();

// Reset with new data
users.reset([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);

// Silent reset
users.reset(newData, { silent: true });
```

**Parameters:**
- `models` (Array) - Optional new models to set
- `options` (Object)
  - `silent` (Boolean) - Suppress events

**Returns:** Collection instance

**Emits:**
- `'reset'` event with `{ collection, previousModels }`

---

### sort(comparator, options)

Sort collection in-place.

```javascript
// Sort by attribute name
users.sort('name'); // Ascending by name

// Sort with custom comparator
users.sort((a, b) => {
  const aName = a.get('name').toLowerCase();
  const bName = b.get('name').toLowerCase();
  if (aName < bName) return -1;
  if (aName > bName) return 1;
  return 0;
});

// Sort descending
users.sort((a, b) => b.get('created_at') - a.get('created_at'));

// Silent sort
users.sort('name', { silent: true });
```

**Parameters:**
- `comparator` (Function | String) - Comparison function or attribute name
- `options` (Object)
  - `silent` (Boolean) - Suppress events

**Returns:** Collection instance

**Emits:**
- `'sort'` event with `{ collection }`

---

## Query Methods

### get(id)

Get model by ID.

```javascript
const user = users.get(123);
if (user) {
  console.log('Found:', user.get('name'));
}
```

**Parameters:**
- `id` (String | Number) - Model ID

**Returns:** Model instance or undefined

---

### at(index)

Get model by index.

```javascript
const firstUser = users.at(0);
const lastUser = users.at(users.length() - 1);
```

**Parameters:**
- `index` (Number) - Model index (0-based)

**Returns:** Model instance or undefined

---

### where(criteria)

Find all models matching criteria.

```javascript
// With function
const admins = users.where(u => u.get('role') === 'admin');

// With object (exact match)
const active = users.where({ active: true });

// Multiple criteria
const adminUsers = users.where({
  role: 'admin',
  active: true
});
```

**Parameters:**
- `criteria` (Function | Object) - Filter function or key-value pairs

**Returns:** Array of matching models

---

### findWhere(criteria)

Find first model matching criteria.

```javascript
// With function
const alice = users.findWhere(u => u.get('name') === 'Alice');

// With object
const admin = users.findWhere({ role: 'admin' });
```

**Parameters:**
- `criteria` (Function | Object) - Filter function or key-value pairs

**Returns:** First matching model or undefined

---

### forEach(callback, thisArg)

Iterate over each model.

```javascript
users.forEach((user, index, collection) => {
  console.log(index, user.get('name'));
});

// With this context
const context = { prefix: 'User:' };
users.forEach(function(user) {
  console.log(this.prefix, user.get('name'));
}, context);
```

**Parameters:**
- `callback` (Function) - Function called for each model (model, index, collection)
- `thisArg` (Object) - Optional context for callback

**Returns:** Collection instance

---

### length()

Get number of models in collection.

```javascript
console.log('Total models:', users.length());

if (users.length() === 0) {
  console.log('No users');
}
```

**Returns:** Number of models

---

### isEmpty()

Check if collection is empty.

```javascript
if (users.isEmpty()) {
  console.log('No users in collection');
}
```

**Returns:** Boolean - true if collection has no models

---

### toJSON()

Convert collection to JSON array.

```javascript
const json = users.toJSON();
// [
//   { id: 1, name: 'Alice', ... },
//   { id: 2, name: 'Bob', ... }
// ]

// Send to server
await fetch('/api/export', {
  method: 'POST',
  body: JSON.stringify(users.toJSON())
});
```

**Returns:** Array of model JSON representations

---

## Event Methods

Collections use the EventEmitter mixin for event handling.

### on(event, callback)

Listen for events.

```javascript
// Listen for additions
users.on('add', ({ models, collection }) => {
  console.log('Added', models.length, 'models');
});

// Listen for updates
users.on('update', ({ collection }) => {
  updateUI();
});

// Listen for fetch lifecycle
users.on('fetch:start', () => showSpinner());
users.on('fetch:success', () => hideSpinner());
users.on('fetch:error', ({ error }) => showError(error));
```

**Parameters:**
- `event` (String) - Event name
- `callback` (Function) - Event handler

---

### off(event, callback)

Remove event listener.

```javascript
function handleAdd({ models }) {
  console.log('Added', models.length);
}

users.on('add', handleAdd);
users.off('add', handleAdd); // Remove specific listener

users.off('add'); // Remove all 'add' listeners
users.off(); // Remove all listeners
```

**Parameters:**
- `event` (String) - Optional event name
- `callback` (Function) - Optional specific callback

---

### once(event, callback)

Listen for event once only.

```javascript
users.once('add', ({ models }) => {
  console.log('First add only');
});

users.add({ name: 'Alice' }); // Logs
users.add({ name: 'Bob' }); // Does not log
```

**Parameters:**
- `event` (String) - Event name
- `callback` (Function) - Event handler

---

### emit(event, ...args)

Emit event to all listeners.

```javascript
// Usually called internally
// You can emit custom events
users.emit('custom-event', { data: 'value' });
```

**Parameters:**
- `event` (String) - Event name
- `...args` - Arguments to pass to listeners

---

## Utility Methods

### cancel()

Cancel any active fetch request.

```javascript
// Start a fetch
const promise = users.fetch();

// Cancel it
users.cancel();

// The promise will reject with AbortError
await promise.catch(() => console.log('Cancelled'));
```

**Returns:** Boolean - true if request was cancelled

---

### isFetching()

Check if collection has an active fetch request.

```javascript
const promise = users.fetch();
console.log(users.isFetching()); // true

await promise;
console.log(users.isFetching()); // false
```

**Returns:** Boolean - true if fetch is in progress

---

### buildUrl()

Build URL for collection endpoint.

```javascript
const users = new UserCollection({
  endpoint: '/api/users'
});

console.log(users.buildUrl()); // '/api/users'
```

**Returns:** String - Complete API URL

---

### getModelName()

Get model class name.

```javascript
console.log(users.getModelName()); // 'User'
```

**Returns:** String - Model class name

---

## Static Methods

### Collection.fromArray(ModelClass, data, options)

Create collection from array data.

```javascript
const users = Collection.fromArray(User, [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
], {
  endpoint: '/api/users'
});

console.log(users.length()); // 2
```

**Parameters:**
- `ModelClass` (Class) - Model class constructor
- `data` (Array) - Array of model data
- `options` (Object) - Collection options

**Returns:** New collection instance

---

## Adding Models

Add models to collections:

```javascript
const users = new UserCollection();

// Add single object
users.add({ id: 1, name: 'Alice' });

// Add multiple objects
users.add([
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
]);

// Add model instances
const user = new User({ id: 4, name: 'Dave' });
users.add(user);

// Add with merge (updates existing)
users.add({ id: 1, name: 'Alicia' }); // Updates Alice

// Add without merge (skips duplicates)
users.add({ id: 1, name: 'Test' }, { merge: false }); // Skipped

// Listen for additions
users.on('add', ({ models }) => {
  console.log('Added:', models.map(m => m.get('name')));
});
```

---

## Removing Models

Remove models from collections:

```javascript
const users = new UserCollection();
users.add([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
]);

// Remove by ID
users.remove(1);

// Remove by model
const bob = users.get(2);
users.remove(bob);

// Remove multiple
users.remove([1, 2]);

// Listen for removals
users.on('remove', ({ models }) => {
  console.log('Removed:', models.map(m => m.get('name')));
});
```

---

## Resetting Collections

Replace all models at once:

```javascript
const users = new UserCollection();
users.add([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);

console.log(users.length()); // 2

// Reset to empty
users.reset();
console.log(users.length()); // 0

// Reset with new data
users.reset([
  { id: 3, name: 'Charlie' },
  { id: 4, name: 'Dave' }
]);
console.log(users.length()); // 2

// Listen for resets
users.on('reset', ({ collection, previousModels }) => {
  console.log('Reset from', previousModels.length, 'to', collection.length());
});
```

---

## Sorting Collections

Sort collections in-place:

```javascript
const users = new UserCollection();
users.add([
  { id: 1, name: 'Charlie' },
  { id: 2, name: 'Alice' },
  { id: 3, name: 'Bob' }
]);

// Sort by name (ascending)
users.sort('name');
console.log(users.at(0).get('name')); // 'Alice'

// Sort with custom comparator
users.sort((a, b) => {
  return b.get('created_at') - a.get('created_at');
});

// Sort descending by name
users.sort((a, b) => {
  const aName = a.get('name').toLowerCase();
  const bName = b.get('name').toLowerCase();
  return bName.localeCompare(aName);
});
```

---

## Fetching Collection Data

Fetch data from the server:

```javascript
const users = new UserCollection({
  endpoint: '/api/users',
  size: 20
});

// Initial fetch
await users.fetch(); // GET /api/users?start=0&size=20

console.log('Loaded', users.length(), 'users');
console.log('Total:', users.meta.count);

// Fetch with filters
await users.setParams({ role: 'admin', start: 0 }, true);
// GET /api/users?role=admin&start=0&size=20

// Fetch next page
await users.setParams({ start: 20 }, true);
// GET /api/users?role=admin&start=20&size=20

// One-off fetch with extra params
await users.fetch({ search: 'alice' });
// GET /api/users?role=admin&start=20&size=20&search=alice

// Next fetch doesn't include search
await users.fetch();
// GET /api/users?role=admin&start=20&size=20
```

---

## Fetching Single Items

Fetch individual models:

```javascript
const users = new UserCollection({
  endpoint: '/api/users'
});

// Fetch single model (not added to collection)
const user = await users.fetchOne(123);
if (user) {
  console.log('Fetched:', user.get('name'));
}

// Fetch and add to collection
await users.fetchOne(456, { addToCollection: true });
console.log('Collection now has', users.length(), 'models');

// Fetch and merge with existing
await users.fetchOne(123, {
  addToCollection: true,
  merge: true
});
```

---

## Downloading Collection Data

Export collection data:

```javascript
const users = new UserCollection({
  endpoint: '/api/users',
  params: { role: 'admin', dr_start: '2024-01-01', dr_end: '2024-12-31' }
});

await users.fetch();

// Download as CSV
await users.download('csv');
// GET /api/users?role=admin&dr_start=2024-01-01&dr_end=2024-12-31&download_format=csv&filename=export-user-daterange-from-2024-01-01-to-2024-12-31.csv

// Download as JSON
await users.download('json');
// GET /api/users?role=admin&dr_start=2024-01-01&dr_end=2024-12-31&download_format=json&filename=export-user-daterange-from-2024-01-01-to-2024-12-31.json

// Note: start and size params are removed for downloads (full export)
```

---

## Request Deduplication

Collections automatically deduplicate identical in-flight requests:

```javascript
const users = new UserCollection({ endpoint: '/api/users' });

// Fire multiple fetch requests rapidly
const promise1 = users.fetch();
const promise2 = users.fetch(); // Returns same promise as promise1
const promise3 = users.fetch(); // Returns same promise as promise1

// Only one actual HTTP request is made
console.log(promise1 === promise2); // true

await promise1;
console.log('All three promises resolved with same response');
```

---

## Request Cancellation

Collections automatically cancel previous requests when parameters change:

```javascript
const users = new UserCollection({ endpoint: '/api/users' });

// Start first fetch
const promise1 = users.setParams({ role: 'admin' }, true);

// Start second fetch with different params
// First request is automatically cancelled
const promise2 = users.setParams({ role: 'user' }, true);

// Only the second request completes

// Manual cancellation
const promise3 = users.fetch();
users.cancel(); // Cancels promise3
```

---

## Rate Limiting

Enable rate limiting to prevent excessive requests:

```javascript
const users = new UserCollection({
  endpoint: '/api/users',
  rateLimiting: true // Enable rate limiting
});

await users.fetch(); // Executes immediately

// Try to fetch again immediately
await users.fetch(); // Skipped due to rate limiting

// Wait 100ms
await new Promise(resolve => setTimeout(resolve, 100));
await users.fetch(); // Executes
```

---

## Setting Pagination Parameters

Manage pagination with `setParams()` and `updateParams()`:

```javascript
const users = new UserCollection({ endpoint: '/api/users', size: 20 });

// Set params (replaces all)
await users.setParams({ start: 0, size: 20, role: 'admin' }, true);

// Update params (merges with existing)
await users.updateParams({ search: 'alice' }, true);
// Now params: { start: 0, size: 20, role: 'admin', search: 'alice' }

// Change page
await users.updateParams({ start: 20 }, true);
// Now params: { start: 20, size: 20, role: 'admin', search: 'alice' }
```

---

## Navigating Pages

Implement pagination UI:

```javascript
const users = new UserCollection({ endpoint: '/api/users', size: 20 });

await users.fetch();

// Calculate pages
const currentPage = Math.floor(users.params.start / users.params.size) + 1;
const totalPages = Math.ceil(users.meta.count / users.params.size);

console.log(`Page ${currentPage} of ${totalPages}`);

// Go to next page
async function nextPage() {
  const nextStart = users.params.start + users.params.size;
  if (nextStart < users.meta.count) {
    await users.updateParams({ start: nextStart }, true);
  }
}

// Go to previous page
async function prevPage() {
  const prevStart = users.params.start - users.params.size;
  if (prevStart >= 0) {
    await users.updateParams({ start: prevStart }, true);
  }
}

// Go to specific page (1-indexed)
async function goToPage(pageNum) {
  const start = (pageNum - 1) * users.params.size;
  await users.updateParams({ start }, true);
}
```

---

## Pagination Metadata

Access pagination metadata from `collection.meta`:

```javascript
await users.fetch();

console.log('Metadata:', users.meta);
// {
//   size: 20,        // Items per page
//   start: 0,        // Current offset
//   count: 157,      // Total items
//   status: true,    // Success status
//   graph: '...'     // Optional graph data
// }

// Use metadata for UI
const currentPage = Math.floor(users.meta.start / users.meta.size) + 1;
const totalPages = Math.ceil(users.meta.count / users.meta.size);
const hasNextPage = users.meta.start + users.meta.size < users.meta.count;
const hasPrevPage = users.meta.start > 0;
```

---

## Default Response Parsing

Collections parse server responses via the `parse()` method:

```javascript
// Standard paginated response
{
  "status": true,
  "data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "size": 20,
  "start": 0,
  "count": 157
}

// Parsed into:
// - collection.models: [ User{ id: 1 }, User{ id: 2 } ]
// - collection.meta: { size: 20, start: 0, count: 157, status: true }
```

---

## Custom Response Parsing

Override `parse()` for custom API formats:

```javascript
class UserCollection extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: User,
      endpoint: '/api/users',
      ...options
    });
  }
  
  parse(response) {
    // Custom format: { users: [...], pagination: { ... } }
    const items = response.data?.users || [];
    
    this.meta = {
      size: response.data?.pagination?.per_page || 10,
      start: response.data?.pagination?.offset || 0,
      count: response.data?.pagination?.total || 0,
      status: response.success
    };
    
    return items;
  }
}
```

---

## Handling Metadata

Store and access custom metadata:

```javascript
class OrderCollection extends Collection {
  parse(response) {
    const items = response.data?.orders || [];
    
    // Store custom metadata
    this.meta = {
      ...this.meta,
      totalRevenue: response.data?.meta?.total_revenue || 0,
      averageValue: response.data?.meta?.average_value || 0,
      currency: response.data?.meta?.currency || 'USD'
    };
    
    return items;
  }
}

const orders = new OrderCollection();
await orders.fetch();

console.log('Total revenue:', orders.meta.totalRevenue);
console.log('Average order:', orders.meta.averageValue, orders.meta.currency);
```

---

## Finding Models

Find models in the collection:

```javascript
const users = new UserCollection();
await users.fetch();

// Get by ID
const user = users.get(123);

// Get by index
const firstUser = users.at(0);
const lastUser = users.at(users.length() - 1);

// Find first match
const alice = users.findWhere(u => u.get('name') === 'Alice');
const admin = users.findWhere({ role: 'admin' });

// Check existence
if (users.get(123)) {
  console.log('User 123 exists');
}
```

---

## Filtering with where()

Filter collections with `where()`:

```javascript
const users = new UserCollection();
await users.fetch();

// Filter with function
const admins = users.where(u => u.get('role') === 'admin');
const active = users.where(u => u.get('active') === true);

// Filter with object
const activeAdmins = users.where({ role: 'admin', active: true });

// Complex filtering
const recentUsers = users.where(u => {
  const created = new Date(u.get('created_at'));
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return created > oneWeekAgo;
});

// Use results
console.log('Found', admins.length, 'admins');
for (const admin of admins) {
  console.log(admin.get('name'));
}
```

---

## Getting Models by ID or Index

Access models directly:

```javascript
const users = new UserCollection();
users.add([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
]);

// By ID
const alice = users.get(1);
console.log(alice.get('name')); // 'Alice'

// By index (0-based)
const first = users.at(0);
const second = users.at(1);
const last = users.at(users.length() - 1);

// Negative indices not supported
// Use: users.at(users.length() - 1) for last item
```

---

## Iterating Over Models

Collections support multiple iteration methods:

```javascript
const users = new UserCollection();
await users.fetch();

// for...of loop
for (const user of users) {
  console.log(user.get('name'));
}

// forEach
users.forEach((user, index) => {
  console.log(index, user.get('name'));
});

// Traditional for loop
for (let i = 0; i < users.length(); i++) {
  const user = users.at(i);
  console.log(user.get('name'));
}

// Map (requires array conversion)
const names = users.models.map(u => u.get('name'));

// Filter then iterate
const admins = users.where({ role: 'admin' });
for (const admin of admins) {
  console.log(admin.get('email'));
}
```

---

## Understanding Collection Events

Collections emit events when modified:

- **`'add'`** - Models added
  - Payload: `{ models, collection }`
- **`'remove'`** - Models removed
  - Payload: `{ models, collection }`
- **`'update'`** - Collection modified (after add/remove)
  - Payload: `{ collection }`
- **`'reset'`** - Collection reset
  - Payload: `{ collection, previousModels }`
- **`'sort'`** - Collection sorted
  - Payload: `{ collection }`
- **`'fetch:start'`** - Fetch started
- **`'fetch:success'`** - Fetch succeeded
- **`'fetch:error'`** - Fetch failed
  - Payload: `{ message, error }`
- **`'fetch:end'`** - Fetch completed

---

## Listening to Changes

Attach event listeners to respond to changes:

```javascript
const users = new UserCollection();

// Listen for updates
users.on('update', ({ collection }) => {
  console.log('Collection now has', collection.length(), 'models');
  updateUI();
});

// Listen for additions
users.on('add', ({ models }) => {
  console.log('Added', models.length, 'models');
  for (const model of models) {
    console.log('New user:', model.get('name'));
  }
});

// Listen for removals
users.on('remove', ({ models }) => {
  console.log('Removed', models.length, 'models');
});

// Listen for resets
users.on('reset', ({ collection, previousModels }) => {
  console.log('Reset from', previousModels.length, 'to', collection.length());
});

// Now trigger events
users.add({ id: 1, name: 'Alice' }); // Emits 'add' and 'update'
users.remove(1); // Emits 'remove' and 'update'
users.reset(); // Emits 'reset'
```

---

## Event Payload Structure

Events include structured payload data:

```javascript
// 'add' event
users.on('add', ({ models, collection }) => {
  // models: Array of added Model instances
  // collection: The Collection instance
  console.log('Added:', models.map(m => m.get('name')));
  console.log('Total:', collection.length());
});

// 'remove' event
users.on('remove', ({ models, collection }) => {
  // models: Array of removed Model instances
  // collection: The Collection instance
  console.log('Removed:', models.map(m => m.get('name')));
});

// 'reset' event
users.on('reset', ({ collection, previousModels }) => {
  // collection: The Collection instance (with new models)
  // previousModels: Array of previous Model instances
  console.log('Old count:', previousModels.length);
  console.log('New count:', collection.length());
});

// 'update' event
users.on('update', ({ collection }) => {
  // collection: The Collection instance
  console.log('Updated, now', collection.length(), 'models');
});
```

---

## Fetch Lifecycle Events

Track fetch progress with lifecycle events:

```javascript
users.on('fetch:start', () => {
  console.log('Fetch started');
  showSpinner();
});

users.on('fetch:success', () => {
  console.log('Fetch succeeded');
  console.log('Loaded', users.length(), 'models');
  hideSpinner();
});

users.on('fetch:error', ({ message, error }) => {
  console.error('Fetch failed:', message);
  console.error('Error details:', error);
  showError(message);
  hideSpinner();
});

users.on('fetch:end', () => {
  console.log('Fetch completed (success or error)');
  // Always called after fetch completes
});

// Now fetch
await users.fetch();
```

---

## Building Custom Collections

Create specialized collections for your domain:

```javascript
import Collection from '@core/Collection.js';
import Product from '@models/Product.js';

class ProductCollection extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: Product,
      endpoint: '/api/products',
      size: 50,
      ...options
    });
  }
  
  // Custom method: Filter by category
  getByCategory(category) {
    return this.where({ category });
  }
  
  // Custom method: Get featured products
  getFeatured() {
    return this.where(p => p.get('featured') === true);
  }
  
  // Custom method: Calculate total value
  getTotalValue() {
    let total = 0;
    this.forEach(product => {
      total += product.get('price') * product.get('quantity');
    });
    return total;
  }
  
  // Override parse for custom API format
  parse(response) {
    const items = response.data?.products || [];
    
    this.meta = {
      size: response.data?.pagination?.size || 50,
      start: response.data?.pagination?.start || 0,
      count: response.data?.pagination?.total || 0,
      categories: response.data?.meta?.categories || []
    };
    
    return items;
  }
}

export default ProductCollection;
```

---

## Custom Endpoints and URL Building

Customize REST endpoints and URL generation:

```javascript
class UserOrderCollection extends Collection {
  constructor(userId, options = {}) {
    super({
      ModelClass: Order,
      endpoint: `/api/users/${userId}/orders`,
      ...options
    });
    
    this.userId = userId;
  }
  
  // Override URL building
  buildUrl() {
    return `/api/users/${this.userId}/orders`;
  }
  
  // Custom method using different endpoint
  async fetchPending() {
    const url = `${this.buildUrl()}/pending`;
    const response = await this.rest.GET(url);
    
    if (response.success) {
      const data = this.parse(response);
      this.reset(data);
    }
    
    return response;
  }
}

const userOrders = new UserOrderCollection(123);
await userOrders.fetch(); // GET /api/users/123/orders
await userOrders.fetchPending(); // GET /api/users/123/orders/pending
```

---

## Debounced Parameter Updates

Debounce parameter changes for search-as-you-type:

```javascript
const users = new UserCollection({ endpoint: '/api/users' });

// Search input handler
searchInput.addEventListener('input', (e) => {
  // Updates params and fetches after 300ms of inactivity
  users.updateParams({ search: e.target.value }, true, 300);
});

// Rapid typing:
// "a" → Debounced
// "al" → Previous cancelled, new debounced
// "ali" → Previous cancelled, new debounced
// "alic" → Previous cancelled, new debounced
// "alice" → Previous cancelled, new debounced
// [300ms passes] → Fetch executes with search=alice
```

---

## Download with Date Ranges

Collections automatically format date range suffixes in downloads:

```javascript
const orders = new OrderCollection({
  params: {
    dr_field: 'created_at',
    dr_start: '2024-01-01',
    dr_end: '2024-12-31'
  }
});

await orders.download('csv');
// Filename: export-order-created_at-from-2024-01-01-to-2024-12-31.csv

// Without date range
const allOrders = new OrderCollection();
await allOrders.download('csv');
// Filename: export-order.csv
```

---

## Model-Collection Communication

Models can communicate with their parent collection:

```javascript
const users = new UserCollection();
await users.fetch();

// Get model from collection
const user = users.get(123);

// Model has reference to collection
console.log(user.collection === users); // May be true (implementation-dependent)

// Modify model
user.set('name', 'Updated Name');

// Changes reflect in collection
console.log(users.get(123).get('name')); // 'Updated Name'

// Save model (updates collection)
await user.save();
```

---

## Using Collections with Views

Integrate collections with views for reactive UI:

```javascript
import { View } from '@core/View.js';
import UserCollection from '@collections/UserCollection.js';

class UserListView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="user-list">
          {{#if loading}}
            <p>Loading...</p>
          {{else}}
            {{#each users}}
              <div class="user">{{name}} ({{email}})</div>
            {{/each}}
          {{/if}}
          
          <div class="pagination">
            <button data-action="prev-page">Previous</button>
            <span>Page {{currentPage}} of {{totalPages}}</span>
            <button data-action="next-page">Next</button>
          </div>
        </div>
      `,
      ...options
    });
    
    // Create collection
    this.users = new UserCollection({ size: 20 });
    
    // Listen for updates
    this.users.on('update', () => this.render());
    this.users.on('fetch:start', () => this.render());
    this.users.on('fetch:end', () => this.render());
  }
  
  async onAfterMount() {
    await this.users.fetch();
  }
  
  async onActionPrevPage() {
    const prevStart = this.users.params.start - this.users.params.size;
    if (prevStart >= 0) {
      await this.users.updateParams({ start: prevStart }, true);
    }
    return true;
  }
  
  async onActionNextPage() {
    const nextStart = this.users.params.start + this.users.params.size;
    if (nextStart < this.users.meta.count) {
      await this.users.updateParams({ start: nextStart }, true);
    }
    return true;
  }
  
  getTemplateData() {
    const currentPage = Math.floor(this.users.params.start / this.users.params.size) + 1;
    const totalPages = Math.ceil(this.users.meta.count / this.users.params.size);
    
    return {
      users: this.users.toJSON(),
      loading: this.users.loading,
      currentPage,
      totalPages
    };
  }
}
```

---

## Using Collections with Forms

Collections work with collection-type form fields:

```javascript
import FormView from '@core/views/form/FormView.js';
import GroupCollection from '@collections/GroupCollection.js';

const form = new FormView({
  fields: [
    {
      type: 'collection',
      name: 'group_id',
      label: 'Select Group',
      Collection: GroupCollection,
      labelField: 'name',
      valueField: 'id',
      maxItems: 10,
      placeholder: 'Search groups...',
      emptyFetch: false,
      debounceMs: 300
    }
  ],
  onSubmit: async (data) => {
    console.log('Selected group:', data.group_id);
  }
});

await form.render();
await form.mount('#form-container');
```

---

## Using Collections with Tables

Collections integrate with table views:

```javascript
import TableView from '@core/views/table/TableView.js';
import UserCollection from '@collections/UserCollection.js';

const table = new TableView({
  collection: new UserCollection(),
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', sortable: true }
  ],
  pageSize: 20
});

await table.render();
await table.mount('#table-container');

// Table automatically fetches and displays collection data
// Provides pagination, sorting, and filtering UI
```

---

## Collection Design Guidelines

Best practices for collection design:

1. **Single Model Type**: One collection per model type
2. **Consistent Endpoints**: Use RESTful conventions
3. **Pagination**: Always include `size` for paginated APIs
4. **Events**: Emit events for UI synchronization
5. **Parsing**: Override `parse()` for custom API formats
6. **Preloaded Mode**: Use for static data

```javascript
// Good: Clear, focused collection
class UserCollection extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: User,
      endpoint: '/api/users',
      size: 20,
      ...options
    });
  }
  
  parse(response) {
    // Custom parsing logic
    return response.data?.users || [];
  }
}

// Bad: Collection doing too much
class UserCollection extends Collection {
  render() { /* views should render */ }
  saveAll() { /* save individual models instead */ }
  exportToPDF() { /* use separate service */ }
}
```

---

## Performance Optimization

Optimize collection performance:

1. **Use Silent Operations**: Suppress events for bulk updates
2. **Debounce Fetches**: Reduce API calls with `debounceMs`
3. **Cancel Unused Requests**: Call `collection.cancel()` when navigating
4. **Preload When Possible**: Use `preloaded: true` for static data
5. **Optimize Queries**: Filter on server, not client

```javascript
// Bad: Fetching then filtering client-side
await users.fetch();
const admins = users.where({ role: 'admin' });

// Good: Filtering server-side
await users.setParams({ role: 'admin' }, true);

// Bad: Multiple events
users.add({ id: 1, name: 'Alice' });
users.add({ id: 2, name: 'Bob' });
users.add({ id: 3, name: 'Charlie' });
// Emits 3 'add' events and 3 'update' events

// Good: Bulk add with single event
users.add([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
]);
// Emits 1 'add' event and 1 'update' event
```

---

## Error Handling Best Practices

Handle errors consistently:

```javascript
// Always check response.success
const response = await users.fetch();
if (response.success) {
  console.log('Loaded', users.length(), 'users');
} else {
  console.error('Fetch failed:', users.errors);
  showError('Failed to load users');
}

// Listen for fetch errors
users.on('fetch:error', ({ message, error }) => {
  showError(message);
});

// Handle network errors
try {
  await users.fetch();
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request cancelled');
  } else {
    showError('Network error');
  }
}

// Validate before operations
if (users.restEnabled) {
  await users.fetch();
} else {
  console.warn('REST not enabled for this collection');
}
```

---

## Testing Collections

Test collections thoroughly:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import UserCollection from '@collections/UserCollection.js';

describe('UserCollection', () => {
  let users;
  
  beforeEach(() => {
    users = new UserCollection({ preloaded: true });
  });
  
  it('should create empty collection', () => {
    expect(users.length()).toBe(0);
  });
  
  it('should add models', () => {
    users.add({ id: 1, name: 'Alice' });
    expect(users.length()).toBe(1);
    expect(users.get(1).get('name')).toBe('Alice');
  });
  
  it('should remove models', () => {
    users.add([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);
    users.remove(1);
    expect(users.length()).toBe(1);
    expect(users.get(1)).toBeUndefined();
  });
  
  it('should emit add events', () => {
    const spy = vi.fn();
    users.on('add', spy);
    users.add({ id: 1, name: 'Alice' });
    expect(spy).toHaveBeenCalledWith({ models: expect.any(Array), collection: users });
  });
  
  it('should filter with where', () => {
    users.add([
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob', role: 'user' }
    ]);
    const admins = users.where({ role: 'admin' });
    expect(admins.length).toBe(1);
    expect(admins[0].get('name')).toBe('Alice');
  });
  
  it('should support iteration', () => {
    users.add([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);
    const names = [];
    for (const user of users) {
      names.push(user.get('name'));
    }
    expect(names).toEqual(['Alice', 'Bob']);
  });
});
```

---

## Common Issues

### Collection not fetching data

**Problem:** `fetch()` returns empty or fails

**Solutions:**
- Verify `endpoint` is set correctly
- Check `restEnabled` is true (default)
- Inspect network tab for actual request
- Check server response format matches expected structure
- Ensure not using `preloaded: true` with no data

```javascript
// Debug
console.log('Endpoint:', users.endpoint);
console.log('REST enabled:', users.restEnabled);
console.log('Params:', users.params);
console.log('URL:', users.buildUrl());

const response = await users.fetch();
console.log('Response:', response);
```

---

### Events not firing

**Problem:** Change listeners not triggered

**Solutions:**
- Use collection methods (`add`, `remove`, `reset`) instead of direct array manipulation
- Check listener is attached before changes
- Verify not using `{ silent: true }`
- Ensure event name is correct

```javascript
// Bad: No events
users.models.push(new User({ id: 1 })); // Direct manipulation

// Good: Events fire
users.add({ id: 1, name: 'Alice' }); // Uses add()

// Check listeners
console.log('Update listeners:', users._events?.update?.length);
```

---

### Models not instantiated correctly

**Problem:** Models in collection are plain objects

**Solutions:**
- Ensure `ModelClass` is set correctly
- Check models are added through `add()` method
- Verify `ModelClass` constructor accepts data

```javascript
// Debug
console.log('ModelClass:', users.ModelClass);
console.log('Model name:', users.getModelName());

const user = users.at(0);
console.log('Is Model instance:', user instanceof users.ModelClass);
```

---

### Pagination not working

**Problem:** Next/previous page shows same data

**Solutions:**
- Ensure server supports `start` and `size` parameters
- Check `users.meta` for correct count
- Verify `setParams()` or `updateParams()` is called with new `start`

```javascript
// Debug
console.log('Current params:', users.params);
console.log('Metadata:', users.meta);

// Ensure start is updating
await users.updateParams({ start: 20 }, true);
console.log('New params:', users.params);
```

---

## Debugging Techniques

Enable debug logging for collections:

```javascript
// Log all updates
users.on('update', ({ collection }) => {
  console.log('Updated, now', collection.length(), 'models');
});

// Log fetches
users.on('fetch:start', () => console.log('Fetch started'));
users.on('fetch:success', () => console.log('Fetch succeeded'));
users.on('fetch:error', ({ error }) => console.error('Fetch error:', error));

// Inspect internal state
console.log('Models:', users.models);
console.log('Params:', users.params);
console.log('Metadata:', users.meta);
console.log('Errors:', users.errors);
console.log('Loading:', users.loading);
console.log('Fetching:', users.isFetching());

// Monitor events
const originalEmit = users.emit.bind(users);
users.emit = (event, ...args) => {
  console.log('Event:', event, args);
  originalEmit(event, ...args);
};

// Track fetch lifecycle
let fetchCount = 0;
users.on('fetch:start', () => {
  fetchCount++;
  console.log('Fetch #', fetchCount, 'started');
});
```

---

## Summary

The `Collection` class provides a robust foundation for managing arrays of models in MOJO applications. Key takeaways:

- Collections manage ordered sets of Model instances
- Use `fetch()` for paginated REST API data
- Collections automatically emit events (add, remove, update, reset)
- Use `where()` and `findWhere()` for client-side querying
- Support for...of iteration natively
- Request management features (deduplication, cancellation, rate limiting) built-in
- Override `parse()` for custom API response formats
- Use `preloaded: true` for static data without REST calls
- Collections integrate seamlessly with Views, Forms, and Tables

For model management, see [Model.md](Model.md).  
For using collections in views, see [View.md](View.md).  
For form integration, see [Form.md](Form.md).
