# MOJO Framework v2.0.0 - Phase 2 Quick Reference

🔥 **Fast reference for MOJO's data layer components**

## 🚀 Quick Setup

```javascript
import MOJO, { RestModel, DataList } from './src/mojo.js';

// Create MOJO app with API configuration
const app = MOJO.create({
  container: '#app',
  api: {
    baseURL: 'https://api.example.com',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  },
  auth: {
    token: 'your-jwt-token',
    type: 'Bearer'
  }
});
```

## 📦 RestModel - API Models

### Basic Model Definition
```javascript
class User extends RestModel {
  static endpoint = '/api/users';
  
  static validations = {
    name: [
      { required: true, message: 'Name is required' },
      { minLength: 2, message: 'Name must be at least 2 characters' }
    ],
    email: [
      { required: true, message: 'Email is required' },
      { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
    ]
  };

  // Custom methods
  getFullName() {
    return `${this.get('first_name')} ${this.get('last_name')}`;
  }

  async activate() {
    this.set('status', 'active');
    return this.save();
  }
}
```

### CRUD Operations
```javascript
// Create new user
const user = new User({ name: 'John', email: 'john@example.com' });
await user.save();                    // POST /api/users

// Fetch existing user
const existingUser = await User.find(123);  // GET /api/users/123
// OR
await user.fetch();                   // GET /api/users/{id}

// Update user
user.set('name', 'John Updated');
await user.save();                    // PUT /api/users/123 (only changed fields)

// Delete user
await user.destroy();                 // DELETE /api/users/123
```

### Data Management
```javascript
// Get/Set attributes
const name = user.get('name');
user.set('name', 'New Name');
user.set({ name: 'John', age: 30 });

// Validation
const isValid = user.validate();
if (!isValid) {
  console.log(user.errors);          // { name: 'Name is required', ... }
}

// Change tracking
console.log(user.isDirty());         // true if unsaved changes
console.log(user.getChangedAttributes()); // { name: 'New Name' }
user.reset();                        // Reset to last saved state

// JSON export
const userData = user.toJSON();      // { id: 123, name: 'John', ... }
```

## 📋 DataList - Collections

### Basic Collection Definition
```javascript
class Users extends DataList {
  constructor(options = {}) {
    super(User, {
      endpoint: '/api/users',
      ...options
    });
  }

  // Custom collection methods
  getActiveUsers() {
    return this.where(user => user.get('status') === 'active');
  }

  async fetchPaginated(page = 1, limit = 10) {
    return this.fetch({
      params: { page, limit, sort: 'created_at', order: 'desc' }
    });
  }
}
```

### Collection Operations
```javascript
const users = new Users();

// Fetch from API
await users.fetch();                 // GET /api/users
await users.fetch({ params: { page: 1, limit: 10 } });

// Add/Remove models
users.add(new User({ name: 'John' }));
users.add([user1, user2, user3]);   // Add multiple
users.remove(user);                  // Remove by instance
users.remove(123);                   // Remove by ID
users.reset([newUser1, newUser2]);   // Replace all

// Query collection
const user = users.get(123);         // Find by ID
const firstUser = users.at(0);       // Get by index
console.log(users.length());         // Collection size
console.log(users.isEmpty());        // Check if empty

// Filter & search
const activeUsers = users.where({ status: 'active' });
const johns = users.where(user => user.get('name').includes('John'));
const firstActive = users.findWhere({ status: 'active' });

// Sorting
users.sort('name');                  // Sort by attribute
users.sort((a, b) => a.get('age') - b.get('age')); // Custom sort

// Events
users.on('add', (data) => console.log('Added:', data.models));
users.on('remove', (data) => console.log('Removed:', data.models));
users.on('update', () => console.log('Collection changed'));

// Iteration
for (const user of users) {
  console.log(user.get('name'));
}

// Export
const usersArray = users.toJSON();  // Array of user objects
```

## 🌐 Rest Client - HTTP Interface

### Configuration
```javascript
const rest = window.MOJO.rest;

// Configure client
rest.configure({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Authentication
rest.setAuthToken('your-jwt-token');      // Bearer token
rest.setAuthToken('token', 'Token');      // Custom type
rest.clearAuth();                         // Remove auth
```

### HTTP Methods
```javascript
// GET request
const response = await rest.GET('/users', { page: 1, limit: 10 });

// POST request  
const response = await rest.POST('/users', {
  name: 'John',
  email: 'john@example.com'
});

// PUT/PATCH requests
const response = await rest.PUT('/users/123', { name: 'Updated Name' });
const response = await rest.PATCH('/users/123', { status: 'active' });

// DELETE request
const response = await rest.DELETE('/users/123');

// File upload
const response = await rest.upload('/upload', fileInput.files[0], {
  description: 'Profile photo'
});
```

### Interceptors
```javascript
// Request interceptor (auth, logging, etc.)
rest.addInterceptor('request', (request) => {
  request.headers['X-Request-ID'] = generateId();
  console.log('Request:', request);
  return request;
});

// Response interceptor (error handling, logging)
rest.addInterceptor('response', (response, request) => {
  console.log('Response:', response);
  if (response.status === 401) {
    // Handle unauthorized
    window.location = '/login';
  }
  return response;
});
```

### Response Format
```javascript
// All responses follow this format:
{
  success: true,           // Boolean success indicator
  status: 200,            // HTTP status code
  statusText: 'OK',       // HTTP status text
  data: {...},            // Response data
  errors: {...},          // Error details (if any)
  message: 'Success',     // Human-readable message
  headers: {...}          // Response headers
}
```

## 🔧 MOJO Framework Integration

### Component Registration
```javascript
// Register models and collections
app.registerModel('User', User);
app.registerModel('Post', Post);
app.registerCollection('Users', Users);
app.registerCollection('Posts', Posts);

// Create instances through framework
const user = app.createModel('User', { name: 'John' });
const users = app.createCollection('Users', User);

// Access REST client
const rest = app.rest;
```

### Page Integration
```javascript
class UsersPage extends Page {
  constructor() {
    super({
      page_name: 'users',
      route: '/users',
      template: `
        <div class="users-page">
          <h1>Users ({{users.length}})</h1>
          {{#users.models}}
            <div class="user">{{name}} - {{email}}</div>
          {{/users.models}}
        </div>
      `
    });

    this.usersCollection = new Users();
  }

  async on_init() {
    // Set up event listeners
    this.usersCollection.on('add', () => this.updateDisplay());
    this.usersCollection.on('remove', () => this.updateDisplay());
    
    // Load initial data
    await this.loadUsers();
  }

  async loadUsers() {
    try {
      await this.usersCollection.fetch();
      this.updateDisplay();
    } catch (error) {
      this.showError('Failed to load users: ' + error.message);
    }
  }

  updateDisplay() {
    this.updateData({
      'users.length': this.usersCollection.length(),
      'users.models': this.usersCollection.toJSON()
    }, true);
  }

  async on_action_createUser() {
    const user = new User({
      name: 'New User',
      email: 'new@example.com'
    });

    if (user.validate()) {
      await user.save();
      this.usersCollection.add(user);
      this.showSuccess('User created!');
    } else {
      this.showError('Validation failed');
    }
  }
}
```

## 🔍 Common Patterns

### Model with Relationships
```javascript
class Post extends RestModel {
  static endpoint = '/api/posts';

  async getAuthor() {
    if (!this._author && this.get('user_id')) {
      this._author = await User.find(this.get('user_id'));
    }
    return this._author;
  }

  async getComments() {
    if (!this._comments) {
      this._comments = new Comments();
      await this._comments.fetch({ 
        params: { post_id: this.id } 
      });
    }
    return this._comments;
  }
}
```

### Collection with Caching
```javascript
class CachedUsers extends DataList {
  constructor(options = {}) {
    super(User, options);
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async fetch(options = {}) {
    const cacheKey = JSON.stringify(options.params || {});
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      this.reset(cached.data, { silent: true });
      return this;
    }

    const result = await super.fetch(options);
    
    this.cache.set(cacheKey, {
      data: this.toJSON(),
      timestamp: Date.now()
    });
    
    return result;
  }
}
```

### Error Handling Pattern
```javascript
class RobustUser extends RestModel {
  static endpoint = '/api/users';

  async save(options = {}) {
    try {
      return await super.save(options);
    } catch (error) {
      // Custom error handling
      if (error.message.includes('network')) {
        this.showWarning('Network issue - changes saved locally');
        this.saveToLocalStorage();
      } else if (this.errors.email) {
        this.showError('Please check your email address');
      }
      throw error;
    }
  }

  saveToLocalStorage() {
    localStorage.setItem(`user_${this.id}`, JSON.stringify(this.toJSON()));
  }
}
```

## ⚠️ Troubleshooting

### Common Issues & Solutions

**Models not saving:**
```javascript
// Check validation first
if (!model.validate()) {
  console.log('Validation errors:', model.errors);
  return;
}

// Check REST client configuration
console.log('REST config:', window.MOJO.rest.config);
```

**Collections not updating:**
```javascript
// Ensure events are set up
collection.on('add', () => console.log('Model added'));
collection.on('update', () => console.log('Collection updated'));

// Check if models are being added correctly
console.log('Collection length:', collection.length());
console.log('Models:', collection.models);
```

**API requests failing:**
```javascript
// Add request interceptor for debugging
rest.addInterceptor('request', (request) => {
  console.log('Making request:', request);
  return request;
});

// Add response interceptor for error tracking
rest.addInterceptor('response', (response) => {
  if (!response.success) {
    console.error('API Error:', response);
  }
  return response;
});
```

**Authentication not working:**
```javascript
// Check if token is set
console.log('Auth header:', rest.config.headers.Authorization);

// Re-set token if needed
rest.setAuthToken(localStorage.getItem('auth_token'));
```

## 📊 Framework Statistics

```javascript
// Get comprehensive framework stats
const stats = app.getStats();
console.log('MOJO Stats:', stats);

// Specific Phase 2 stats
console.log('Models registered:', stats.registeredModels);
console.log('Collections registered:', stats.registeredCollections);
console.log('REST client status:', stats.restClient);
```

---

## 🎯 Quick Tips

- **Always validate** before saving models
- **Use events** to keep UI in sync with data changes
- **Implement error handling** for network operations
- **Cache collections** for better performance
- **Use interceptors** for cross-cutting concerns (auth, logging)
- **Leverage change tracking** to minimize API calls
- **Test with mock data** during development

---

**MOJO Framework v2.0.0 - Phase 2 Data Layer**  
Complete API integration and data management solution 🚀