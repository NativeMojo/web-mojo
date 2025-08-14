# MOJO Framework API Documentation

## Overview

This directory contains the complete API reference documentation for the MOJO Framework. The documentation is organized by category to help you quickly find what you need.

## 📚 API Reference

### Core Classes

- **[View](./View.md)** - Base component class with lifecycle methods
- **[Page](./Page.md)** - Extended View class for routable pages
- **[Router](./Router.md)** - Client-side routing system
- **[Model](./Model.md)** - Data model with REST integration
- **[Collection](./Collection.md)** - Collection of models with filtering and sorting
- **[Rest](./Rest.md)** - RESTful API client

### Components

- **[Table](./Table.md)** - Advanced data table component
- **[TablePage](./TablePage.md)** - Full-page table with CRUD operations
- **[Dialog](./Dialog.md)** - Modal dialog component
- **[TopNav](./TopNav.md)** - Top navigation bar component
- **[Sidebar](./Sidebar.md)** - Collapsible sidebar navigation
- **[MainContent](./MainContent.md)** - Main content wrapper
- **[FormBuilder](./FormBuilder.md)** - Dynamic form generation
- **[FormView](./FormView.md)** - Form component with validation

### Services

- **[AuthService](../services/authentication.md#authservice)** - Authentication service with login, passkey, and token management
  - Login/Logout
  - Passkey Authentication
  - Password Reset
  - Email Verification
  - Token Refresh

### Utilities

- **[EventBus](./EventBus.md)** - Global event system
- **[JWTUtils](../services/authentication.md#jwtutils)** - JWT token utilities
  - Token Decoding
  - Expiry Checking
  - Role/Permission Validation
  - Storage Management
- **[DataFormatter](./DataFormatter.md)** - Data formatting utilities
- **[MustacheFormatter](./MustacheFormatter.md)** - Template formatting helpers
- **[MOJOUtils](./MOJOUtils.md)** - Framework utility functions

### Pages

- **[NotFoundPage](./NotFoundPage.md)** - 404 error page
- **[ErrorPage](./ErrorPage.md)** - General error page

## 🚀 Quick Start

### Basic Usage

```javascript
import { MOJO } from 'web-mojo';

// Initialize MOJO
const app = new MOJO({
  container: '#app',
  api: {
    baseUrl: 'https://api.example.com',
    timeout: 30000
  }
});

// Access services
const { authService, jwtUtils, router, eventBus } = app;
```

### Creating a View

```javascript
import { View } from 'web-mojo';

class MyView extends View {
  constructor(options) {
    super(options);
  }
  
  async onInit() {
    // Initialize view
  }
  
  getTemplate() {
    return `
      <div class="my-view">
        <h1>{{title}}</h1>
        <button data-action="doSomething">Click Me</button>
      </div>
    `;
  }
  
  async onActionDoSomething(event, element) {
    // Handle button click
  }
}
```

### Creating a Page

```javascript
import { Page } from 'web-mojo';

class DashboardPage extends Page {
  constructor(options) {
    super({
      ...options,
      name: 'dashboard',
      route: '/dashboard'
    });
  }
  
  async onParams(params, query) {
    // Handle route parameters
    console.log('Page params:', params);
    console.log('Query params:', query);
  }
  
  getTemplate() {
    return `
      <div class="dashboard-page">
        <h1>Dashboard</h1>
      </div>
    `;
  }
}
```

### Using Authentication

```javascript
import { AuthService, JWTUtils } from 'web-mojo';

// Login
const result = await app.authService.login(email, password);
if (result.success) {
  app.jwtUtils.storeTokens(result.data.token, result.data.refreshToken, true);
}

// Check authentication
const token = app.jwtUtils.getToken();
if (token && !app.jwtUtils.isExpired(token)) {
  const userInfo = app.jwtUtils.getUserInfo(token);
  console.log('Logged in as:', userInfo.email);
}

// Logout
await app.authService.logout(token);
app.jwtUtils.clearTokens();
```

### Working with Models

```javascript
import { Model } from 'web-mojo';

class UserModel extends Model {
  constructor(data) {
    super(data);
    this.urlRoot = '/api/users';
  }
  
  defaults() {
    return {
      name: '',
      email: '',
      role: 'user'
    };
  }
}

// Create and save
const user = new UserModel({ name: 'John Doe', email: 'john@example.com' });
await user.save();

// Fetch by ID
const existingUser = new UserModel({ id: 123 });
await existingUser.fetch();

// Update
existingUser.set('name', 'Jane Doe');
await existingUser.save();

// Delete
await existingUser.destroy();
```

### Using Collections

```javascript
import { Collection } from 'web-mojo';

class UserCollection extends Collection {
  constructor(models = []) {
    super(models);
    this.url = '/api/users';
    this.model = UserModel;
  }
}

// Fetch all users
const users = new UserCollection();
await users.fetch();

// Filter users
const admins = users.filter(user => user.get('role') === 'admin');

// Add a new user
users.add(new UserModel({ name: 'New User' }));

// Listen to changes
users.on('add', (model) => {
  console.log('User added:', model.toJSON());
});
```

## 📖 Documentation Structure

Each API documentation file follows this structure:

1. **Overview** - Brief description of the class/component
2. **Constructor** - Parameters and initialization
3. **Properties** - Available properties and their types
4. **Methods** - All public methods with parameters and return types
5. **Events** - Events emitted by the class
6. **Examples** - Practical usage examples
7. **Best Practices** - Recommendations for optimal usage

## 🔧 TypeScript Support

While MOJO is written in JavaScript, we provide JSDoc annotations for better IDE support:

```javascript
/**
 * @param {Object} options - Configuration options
 * @param {string} options.id - Component ID
 * @param {string} options.template - HTML template
 * @returns {View} View instance
 */
```

## 📦 Importing Components

### ES6 Modules
```javascript
import { View, Page, Router } from 'web-mojo';
```

### CommonJS
```javascript
const { View, Page, Router } = require('web-mojo');
```

### UMD (Browser)
```html
<script src="path/to/web-mojo.umd.js"></script>
<script>
  const { View, Page, Router } = window.MOJO;
</script>
```

## 🔗 Related Documentation

- [User Guide](../user-guide/README-Phase1.md)
- [Component Documentation](../components/)
- [Examples](../examples/)
- [Authentication Services](../services/authentication.md)
- [Testing Guide](../testing/)

## 🤝 Contributing

To contribute to the API documentation:

1. Follow the existing documentation structure
2. Include clear examples for all methods
3. Document all parameters and return types
4. Add JSDoc annotations for better IDE support
5. Test all code examples

## 📝 License

MOJO Framework is MIT licensed. See [LICENSE](../../LICENSE) for details.