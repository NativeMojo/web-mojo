# REST Framework Guide

The MOJO Framework provides a powerful REST client system built around three core classes: `Model`, `Collection`, and `Rest`. This guide covers how to use these components for API communication with both asynchronous and synchronous patterns.

## Table of Contents

1. [Overview](#overview)
2. [Model Class](#model-class)
3. [Collection Class](#collection-class)
4. [Rest Class](#rest-class)
5. [Event System Integration](#event-system-integration)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

## Overview

The REST framework follows a layered architecture:

- **Rest**: Low-level HTTP client with interceptors and error handling
- **Model**: Represents individual resources with CRUD operations
- **Collection**: Manages arrays of models with pagination support

All classes support both async/await patterns and event-driven programming.

## Model Class

### Basic Model Definition

```javascript
import { Model } from 'web-mojo';

class User extends Model {
  static endpoint = '/api/users';

  static validations = {
    name: { required: true, minLength: 2 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
  };
}
```

### Async Operations

#### Creating and Saving Models

```javascript
// Create new user
const user = new User({
  name: 'John Doe',
  email: 'john@example.com'
});

// Save to API (POST /api/users) - returns REST response
const response = await user.save({
  name: 'John Doe',
  email: 'john@example.com'
});

// Handle different response types
if (response.success) {
  console.log('User created successfully:', user.toJSON());
} else if (response.status === 422) {
  // Handle validation errors
  console.log('Validation errors:', response.errors);
} else if (response.status === 403) {
  // Handle permission errors
  console.log('Permission denied:', response.message);
} else {
  // Handle other errors
  console.log('Save failed:', response.error || response.message);
}
```

#### Fetching Existing Models

```javascript
// Fetch user by ID (GET /api/users/123) - returns REST response
const user = new User({ id: 123 });
const response = await user.fetch();

if (response.success) {
  console.log('User data:', user.toJSON());
} else {
  console.log('Fetch failed:', response.error);
}

// Or use static method (still returns model for convenience)
const user = await User.find(123);
```

#### Updating Models

```javascript
// Update user data
user.set('name', 'Jane Doe');
user.set({ email: 'jane@example.com', age: 30 });

// Save changes (PUT /api/users/123) - returns REST response
const response = await user.save(user.getChangedAttributes());

if (response.success) {
  console.log('User updated successfully');
} else {
  console.log('Update failed:', response.error);
}

// Check if model has unsaved changes
if (user.isDirty()) {
  console.log('Unsaved changes:', user.getChangedAttributes());
}
```

#### Deleting Models

```javascript
// Delete user (DELETE /api/users/123) - returns REST response
const response = await user.destroy();

if (response.success) {
  console.log('User deleted successfully');
  // Model data is automatically cleared on successful delete
} else if (response.status === 409) {
  console.log('Cannot delete: user has dependencies');
} else {
  console.log('Delete failed:', response.error);
}
```

### Event-Driven (Non-Async) Patterns

```javascript
const user = new User();

// Listen for changes
user.on('change', (model) => {
  console.log('User changed:', model.toJSON());
  updateUI();
});

// Listen for specific field changes
user.on('change:name', (newName, model) => {
  console.log('Name changed to:', newName);
});

// Trigger events by changing data
user.set('name', 'Updated Name'); // Emits 'change' and 'change:name'
```

### Non-Async Fetch Completion Patterns

When you're not in an async method, you can handle `model.fetch()` completion using these approaches:

#### 1. Promise .then() Pattern
```javascript
function loadUser(userId) {
  const user = new User({ id: userId });

  user.fetch()
    .then(() => {
      console.log('User loaded:', user.toJSON());
      updateUI(user);
    })
    .catch((error) => {
      console.error('Load failed:', user.errors);
      showError('Failed to load user');
    });

  return user; // Return immediately, data loads asynchronously
}
```

#### 2. Event-Based Completion
```javascript
function loadUserWithEvents(userId) {
  const user = new User({ id: userId });

  // Set up completion handlers before calling fetch
  user.once('change', () => {
    console.log('User data loaded');
    updateUI(user);
  });

  // Handle loading state
  const originalLoading = user.loading;
  const checkLoadingComplete = () => {
    if (originalLoading && !user.loading) {
      if (Object.keys(user.errors).length === 0) {
        console.log('Fetch completed successfully');
      } else {
        console.error('Fetch failed:', user.errors);
        showError('Failed to load user');
      }
    }
  };

  // Monitor loading state changes
  const loadingInterval = setInterval(() => {
    checkLoadingComplete();
    if (!user.loading) {
      clearInterval(loadingInterval);
    }
  }, 50);

  // Start the fetch
  user.fetch();

  return user;
}
```

#### 3. Callback Pattern
```javascript
function loadUserWithCallback(userId, onComplete, onError) {
  const user = new User({ id: userId });

  user.fetch()
    .then(() => {
      if (onComplete) onComplete(user);
    })
    .catch((error) => {
      if (onError) onError(user.errors, user);
    });

  return user;
}

// Usage
loadUserWithCallback(123,
  (user) => {
    console.log('Success:', user.get('name'));
    updateUI(user);
  },
  (errors) => {
    console.error('Error:', errors);
    showError('Load failed');
  }
);
```

#### 4. Fire-and-Forget with Event Listeners
```javascript
function setupUserAndLoad(userId) {
  const user = new User({ id: userId });

  // Set up permanent event listeners
  user.on('change', () => {
    updateUserDisplay(user);
  });

  // Just trigger the fetch - events will handle completion
  user.fetch(); // No await, no .then() needed

  return user;
}
```

#### 5. Using Custom Completion Events
```javascript
// Extend Model to emit custom events
class User extends Model {
  static endpoint = '/api/users';

  async fetch(options = {}) {
    try {
      const result = await super.fetch(options);
      this.emit('fetch:success', this);
      return result;
    } catch (error) {
      this.emit('fetch:error', error, this);
      throw error;
    }
  }
}

// Usage without async
function loadUser(userId) {
  const user = new User({ id: userId });

  user.on('fetch:success', (user) => {
    console.log('Fetch completed:', user.toJSON());
    updateUI(user);
  });

  user.on('fetch:error', (error, user) => {
    console.error('Fetch failed:', error);
    showError('Failed to load user');
  });

  user.fetch(); // No await needed
  return user;
}
```

### Data Access with Formatting

```javascript
const user = new User({
  name: 'john doe',
  profile: {
    address: {
      city: 'New York'
    }
  },
  created_at: '2024-01-15T10:30:00Z'
});

// Simple access
console.log(user.get('name')); // 'john doe'

// Dot notation for nested data
console.log(user.get('profile.address.city')); // 'New York'

// Formatting with pipes
console.log(user.get('name|uppercase')); // 'JOHN DOE'
console.log(user.get('created_at|date:short')); // Formatted date
```

## Collection Class

### Basic Collection Definition

```javascript
import { Collection } from 'web-mojo';
import { User } from 'web-mojo/models';

class UserCollection extends Collection {
  constructor(options = {}) {
    super(User, {
      endpoint: '/api/users',
      size: 20, // Default page size
      ...options
    });
  }
}
```

### Async Operations

#### Fetching Collections

```javascript
const users = new UserCollection();

// Fetch first page (GET /api/users?start=0&size=20) - returns REST response
const response = await users.fetch();

if (response.success) {
  console.log('Users loaded:', users.length());
  console.log('Total count:', users.meta.count);
} else {
  console.log('Fetch failed:', response.error);
}

// Fetch with custom parameters
const searchResponse = await users.fetch({ search: 'john', status: 'active' });

if (searchResponse.success) {
  console.log('Search results:', users.toJSON());
} else if (searchResponse.status === 404) {
  console.log('No users found matching criteria');
} else {
  console.log('Search failed:', searchResponse.error);
}
```

#### Pagination

```javascript
// Update pagination parameters and fetch - returns REST response when autoFetch=true
const paginationResponse = await users.updateParams({
  start: 20,
  size: 10
}, true); // auto-fetch

if (paginationResponse.success) {
  console.log('Next page loaded:', users.length());
} else {
  console.log('Pagination failed:', paginationResponse.error);
}

// Debounced fetching for search - returns REST response
const searchResponse = await users.updateParams({
  search: searchTerm
}, true, 300); // 300ms debounce

if (searchResponse.success) {
  console.log('Search completed:', users.length(), 'results');
} else {
  console.log('Search failed:', searchResponse.error);
}

// Update params without fetching - returns collection instance
const updatedCollection = await users.updateParams({
  status: 'active'
}, false); // no auto-fetch
console.log('Params updated, collection ready for manual fetch');
```

#### Adding and Removing Models

```javascript
// Add models to collection
const newUser = new User({ name: 'Alice', email: 'alice@example.com' });
users.add(newUser);

// Add multiple models
users.add([
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Carol', email: 'carol@example.com' }
]);

// Remove models
users.remove(newUser);
users.remove('123'); // Remove by ID
```

### Event-Driven Collection Management

```javascript
const users = new UserCollection();

// Listen for collection changes
users.on('add', ({ models, collection }) => {
  console.log('Added', models.length, 'users');
  renderUserList();
});

users.on('remove', ({ models, collection }) => {
  console.log('Removed', models.length, 'users');
  renderUserList();
});

users.on('reset', ({ collection, previousModels }) => {
  console.log('Collection reset');
  renderUserList();
});

// Initial fetch
await users.fetch();
```

### Collection Utilities

```javascript
// Find models
const activeUsers = users.where({ status: 'active' });
const admin = users.findWhere({ role: 'admin' });

// Get models
const firstUser = users.at(0);
const userById = users.get('123');

// Sort collection
users.sort('name'); // Sort by name attribute
users.sort((a, b) => a.get('created_at') - b.get('created_at')); // Custom sort

// Iteration
for (const user of users) {
  console.log(user.get('name'));
}

// Convert to JSON
const userData = users.toJSON();
```

### Preloaded Collections (No REST)

```javascript
// Collection with preloaded data (won't make API calls)
const localUsers = new UserCollection({ preloaded: true });

// Add data manually
localUsers.add([
  { id: 1, name: 'Local User 1' },
  { id: 2, name: 'Local User 2' }
]);

// fetch() will be skipped since preloaded: true and data exists
await localUsers.fetch(); // No API call made
```

## Rest Class

### Configuration

```javascript
import { Rest } from 'web-mojo';

// Configure base settings
rest.configure({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'X-API-Key': 'your-api-key'
  }
});

// Set authentication
rest.setAuthToken('jwt-token', 'Bearer');
```

### Basic HTTP Operations

#### Async Requests

```javascript
// GET request
const response = await rest.GET('/users', {
  page: 1,
  limit: 10
});

if (response.success) {
  console.log('Users:', response.data);
} else {
  console.error('Error:', response.message);
}

// POST request
const newUser = await rest.POST('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT/PATCH requests
await rest.PUT('/users/123', userData);
await rest.PATCH('/users/123', { status: 'active' });

// DELETE request
await rest.DELETE('/users/123');
```

#### File Upload

```javascript
// Upload single file
const fileInput = document.getElementById('fileInput');
const response = await rest.upload('/upload', fileInput.files[0], {
  userId: 123,
  category: 'profile'
});

// Upload multiple files
await rest.upload('/upload-batch', fileInput.files, {
  folder: 'documents'
});
```

### Request and Response Interceptors

#### Request Interceptors

```javascript
// Add authentication token
rest.addInterceptor('request', async (request) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

// Add request logging
rest.addInterceptor('request', async (request) => {
  console.log('Making request:', request.method, request.url);
  return request;
});
```

#### Response Interceptors

```javascript
// Handle auth errors globally
rest.addInterceptor('response', async (response, request) => {
  if (response.status === 401) {
    // Redirect to login or refresh token
    window.location.href = '/login';
  }
  return response;
});

// Transform API responses
rest.addInterceptor('response', async (response, request) => {
  if (response.success && response.data) {
    // Normalize date fields
    if (response.data.created_at) {
      response.data.created_at = new Date(response.data.created_at);
    }
  }
  return response;
});
```

## Event System Integration

### Model Events

```javascript
const user = new User();

// Standard events
user.on('change', () => console.log('Model changed'));
user.on('change:name', (newName) => console.log('Name:', newName));

// Custom events
user.emit('custom-event', { data: 'example' });
```

### Collection Events

```javascript
const users = new UserCollection();

users.on('add', ({ models }) => {
  console.log(`Added ${models.length} users`);
});

users.on('remove', ({ models }) => {
  console.log(`Removed ${models.length} users`);
});

users.on('update', () => {
  console.log('Collection updated');
});
```

## Error Handling

### Model Error Handling

```javascript
const user = new User();

// Save with response-based error handling
const response = await user.save(invalidData);

if (response.success) {
  console.log('User saved successfully');
} else {
  console.log('Save failed:', response.error || response.message);
  
  // Handle specific error types
  if (response.status === 422) {
    console.log('Validation errors:', response.errors);
    
    // Display field-specific errors
    for (const [field, message] of Object.entries(response.errors || {})) {
      showFieldError(field, message);
    }
  } else if (response.status === 403) {
    console.log('Permission denied');
  } else if (response.status >= 500) {
    console.log('Server error occurred');
  }
  
  // Model.errors is also populated for convenience
  if (Object.keys(user.errors).length > 0) {
    console.log('Model errors:', user.errors);
  }
}

// Validation before saving (still works the same)
if (user.validate()) {
  const response = await user.save();
  // Handle response...
} else {
  console.log('Client-side validation failed:', user.errors);
}
```

### Collection Error Handling

```javascript
const users = new UserCollection();

// Collection fetch with response handling
const response = await users.fetch();

if (response.success) {
  console.log(`Loaded ${users.length} users`);
} else {
  console.error('Fetch failed:', response.error || response.message);
  
  if (response.status === 404) {
    console.log('No users found');
  } else if (response.status === 403) {
    console.log('Access denied to user list');
  }
  
  // Collection.errors is also populated for convenience
  if (users.errors.fetch) {
    console.error('Collection fetch error:', users.errors.fetch);
  }
}

// Pagination with response handling
const nextPageResponse = await users.updateParams({ start: 20 }, true);

if (nextPageResponse.success) {
  console.log('Next page loaded successfully');
} else if (nextPageResponse.status === 404) {
  console.log('No more pages available');
} else {
  console.log('Pagination failed:', nextPageResponse.error);
}

// Cancel requests (still works the same)
users.cancel(); // Cancel active fetch request
```

### Rest Error Handling

```javascript
try {
  const response = await rest.GET('/api/users');

  if (!response.success) {
    console.error('API Error:', response.message);
    console.error('Details:', response.errors);
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  } else {
    console.error('Network error:', error.message);
  }
}
```

## Best Practices

### 1. Model Design

```javascript
class User extends Model {
  static endpoint = '/api/users';

  // Define validation rules
  static validations = {
    email: [
      { required: true, message: 'Email is required' },
      { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
    ],
    name: { required: true, minLength: 2 }
  };

  // Custom methods
  get displayName() {
    return this.get('first_name') + ' ' + this.get('last_name');
  }

  async activate() {
    return this.save({ status: 'active' });
  }
}
```

### 2. Collection Patterns

```javascript
// Extend for custom behavior
class UserCollection extends Collection {
  constructor(options = {}) {
    super(User, {
      endpoint: '/api/users',
      size: 25,
      ...options
    });
  }

  // Custom methods
  async fetchActive() {
    return this.fetch({ status: 'active' });
  }

  getAdmins() {
    return this.where({ role: 'admin' });
  }
}
```

### 3. Error Handling Strategy

```javascript
// Global error handler
rest.addInterceptor('response', async (response) => {
  if (!response.success) {
    // Log errors
    console.error('API Error:', response.message);

    // Show user-friendly notifications
    if (response.status >= 500) {
      showNotification('Server error. Please try again later.', 'error');
    } else if (response.status === 404) {
      showNotification('Resource not found.', 'warning');
    }
  }
  return response;
});
```

### 4. Async/Await vs Events

```javascript
// Use async/await for:
// - One-time operations
// - Error handling
// - Sequential operations
async function updateUser(id, data) {
  const user = await User.find(id); // Still returns model for convenience
  const response = await user.save(data); // Returns REST response
  
  if (response.success) {
    return user; // Model updated automatically on success
  } else {
    console.error('Update failed:', response.error);
    throw new Error(response.error || 'Failed to update user');
  }
}

// Use events for:
// - UI updates
// - Reactive programming
// - Multiple listeners
const user = new User();
user.on('change', () => updateUI());
user.on('change:status', (status) => {
  if (status === 'active') {
    enableUserFeatures();
  }
});
```

### 5. Performance Optimization

```javascript
// Batch operations
const users = new UserCollection();
users.add(multipleUsers, { silent: true }); // Prevent events during batch
users.emit('update'); // Single event after batch

// Debounced fetching
await users.updateParams({ search: query }, true, 300);

// Cancel unnecessary requests
if (users.isFetching()) {
  users.cancel();
}
await users.fetch(newParams);
```

## Consistent Response Pattern

### Overview

All CRUD operations in MOJO's REST framework now return consistent REST response objects instead of mixed return types. This provides better error handling, access to response metadata, and a predictable API.

### Response Structure

All REST operations return a response object with this structure:

```javascript
{
  success: boolean,       // True if operation succeeded
  data: object,          // Response data (varies by endpoint)
  error: string,         // Error message (if success = false)
  errors: object,        // Detailed errors (e.g., validation errors)
  status: number,        // HTTP status code
  message: string,       // Server message
  // ... additional response metadata
}
```

### Model Operations

```javascript
const user = new User();

// All operations return REST responses
const fetchResponse = await user.fetch();
const saveResponse = await user.save(data);
const destroyResponse = await user.destroy();

// Consistent error checking across all operations
if (fetchResponse.success) {
  // Model is automatically updated on successful fetch
  console.log('User data:', user.toJSON());
} else {
  console.log('Fetch failed:', fetchResponse.error);
}
```

### Collection Operations

```javascript
const users = new UserCollection();

// Collections also return REST responses
const fetchResponse = await users.fetch();
const paginationResponse = await users.updateParams({ page: 2 }, true);

// Same error handling pattern
if (fetchResponse.success) {
  // Collection is automatically populated on successful fetch
  console.log('Loaded users:', users.length());
} else {
  console.log('Collection fetch failed:', fetchResponse.error);
}
```

### Benefits

1. **Consistent API**: All operations work the same way
2. **Better Error Handling**: Access to status codes, detailed errors, server messages
3. **Response Metadata**: Headers, timing, server information
4. **Predictable**: No more mixed return types or undefined on errors

### Migration Notes

**Before (inconsistent returns):**
```javascript
const result = await model.save(data); // Could return model or undefined
if (result) {
  // Success
} else {
  // Check model.errors
}
```

**After (consistent responses):**
```javascript
const response = await model.save(data); // Always returns response object
if (response.success) {
  // Model automatically updated, use model.toJSON()
} else {
  // Full error information in response.error, response.errors, etc.
}
```

This guide covers the essential patterns for using MOJO's REST framework. The combination of async operations, event-driven programming, and consistent response handling provides flexibility for both simple CRUD operations and complex reactive applications.
