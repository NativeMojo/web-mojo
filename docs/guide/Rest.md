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
import Model from '../core/Model.js';

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

// Save to API (POST /api/users)
try {
  await user.save({
    name: 'John Doe',
    email: 'john@example.com'
  });
  console.log('User created:', user.toJSON());
} catch (error) {
  console.error('Save failed:', user.errors);
}
```

#### Fetching Existing Models

```javascript
// Fetch user by ID (GET /api/users/123)
const user = new User({ id: 123 });
await user.fetch();

// Or use static method
const user = await User.find(123);
```

#### Updating Models

```javascript
// Update user data
user.set('name', 'Jane Doe');
user.set({ email: 'jane@example.com', age: 30 });

// Save changes (PUT /api/users/123)
await user.save(user.getChangedAttributes());

// Check if model has unsaved changes
if (user.isDirty()) {
  console.log('Unsaved changes:', user.getChangedAttributes());
}
```

#### Deleting Models

```javascript
// Delete user (DELETE /api/users/123)
try {
  await user.destroy();
  console.log('User deleted');
} catch (error) {
  console.error('Delete failed:', user.errors);
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
import Collection from '../core/Collection.js';
import User from './User.js';

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

// Fetch first page (GET /api/users?start=0&size=20)
await users.fetch();

console.log('Users loaded:', users.length());
console.log('Total count:', users.meta.count);

// Fetch with custom parameters
await users.fetch({ search: 'john', status: 'active' });
```

#### Pagination

```javascript
// Update pagination parameters and fetch
await users.updateParams({ 
  start: 20, 
  size: 10 
}, true); // auto-fetch

// Debounced fetching for search
await users.updateParams({ 
  search: searchTerm 
}, true, 300); // 300ms debounce
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
import rest from '../core/Rest.js';

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

try {
  await user.save(invalidData);
} catch (error) {
  // Check validation errors
  if (Object.keys(user.errors).length > 0) {
    console.log('Validation errors:', user.errors);
    
    // Display field-specific errors
    for (const [field, message] of Object.entries(user.errors)) {
      showFieldError(field, message);
    }
  }
}

// Validation before saving
if (user.validate()) {
  await user.save();
} else {
  console.log('Validation failed:', user.errors);
}
```

### Collection Error Handling

```javascript
const users = new UserCollection();

try {
  await users.fetch();
} catch (error) {
  if (users.errors.fetch) {
    console.error('Fetch error:', users.errors.fetch);
  }
}

// Cancel requests
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
  try {
    const user = await User.find(id);
    await user.save(data);
    return user;
  } catch (error) {
    handleError(error);
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

This guide covers the essential patterns for using MOJO's REST framework. The combination of async operations and event-driven programming provides flexibility for both simple CRUD operations and complex reactive applications.