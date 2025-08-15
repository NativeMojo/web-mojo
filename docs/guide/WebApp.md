# WebApp - Application Container

## Overview

WebApp is the main application class that serves as the container and orchestrator for your entire MOJO application. It handles routing, page management, global state, notifications, and provides the foundation for all other components to work together.

## Key Responsibilities

- **Application Lifecycle**: Initialize and manage the entire application
- **Routing & Navigation**: Handle page routing and navigation between views
- **Page Management**: Register, create, and manage page instances
- **Global State**: Maintain application-wide state and configuration
- **Error Handling**: Provide centralized error handling and user notifications
- **Component Registry**: Register and manage reusable components
- **Loading States**: Show/hide loading indicators for async operations

## Basic Usage

### 1. Create and Start Application

```javascript
import WebApp from './app/WebApp.js';
import HomePage from './pages/HomePage.js';
import UsersPage from './pages/UsersPage.js';

// Create application instance
const app = WebApp.create({
  container: '#app',
  title: 'My MOJO App',
  basePath: '/app'
});

// Register pages
app.registerPage('home', HomePage);
app.registerPage('users', UsersPage);

// Start the application
await app.start();
```

### 2. Application Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>My MOJO App</title>
</head>
<body>
    <div id="app">
        <!-- WebApp will render content here -->
    </div>
    
    <script type="module">
        import WebApp from './src/app/WebApp.js';
        // ... application setup
    </script>
</body>
</html>
```

## API Reference

### Constructor Options

```javascript
const app = new WebApp({
  container: '#app',           // Container selector or element
  title: 'My App',            // Application title
  basePath: '/',              // Base path for routing
  layout: 'default',          // Layout template name
  errorContainer: '#errors',  // Error display container
  loadingContainer: '#loading' // Loading indicator container
});
```

### Core Methods

#### Application Lifecycle

##### `async start()`
Initializes and starts the application.

```javascript
await app.start();
```

##### `async destroy()`
Cleans up and destroys the application.

```javascript
await app.destroy();
```

#### Page Management

##### `registerPage(name, PageClass, options)`
Registers a page class with the application.

```javascript
app.registerPage('users', UsersPage, {
  route: '/users/:id?',
  title: 'User Management',
  requiresAuth: true
});
```

##### `getPage(name)`
Retrieves a registered page class.

```javascript
const PageClass = app.getPage('users');
```

##### `getOrCreatePage(name, params, query)`
Gets an existing page instance or creates a new one.

```javascript
const page = await app.getOrCreatePage('users', { id: '123' }, { tab: 'profile' });
```

##### `async showPage(name, params, query, options)`
Navigates to and displays a page.

```javascript
// Basic navigation
await app.showPage('users');

// With parameters
await app.showPage('user-detail', { id: '123' });

// With query parameters
await app.showPage('users', {}, { search: 'john', page: '2' });

// With options
await app.showPage('dashboard', {}, {}, { 
  replace: true,    // Replace history instead of push
  force: true       // Force re-render even if same page
});
```

#### Navigation

##### `async navigate(url, options)`
Navigate to a URL programmatically.

```javascript
// Navigate to URL
await app.navigate('/users/123');

// With options
await app.navigate('/dashboard', { 
  replace: true,
  trigger: false  // Don't trigger route handler
});
```

##### `back()`
Navigate back in browser history.

```javascript
app.back();
```

##### `forward()`
Navigate forward in browser history.

```javascript
app.forward();
```

##### `getCurrentPage()`
Get the currently active page instance.

```javascript
const currentPage = app.getCurrentPage();
if (currentPage) {
  console.log('Current page:', currentPage.pageName);
}
```

#### Notifications & UI Feedback

##### `showError(message, options)`
Display error notification to user.

```javascript
app.showError('Failed to save user data');

// With options
app.showError('Validation failed', {
  duration: 5000,
  dismissible: true,
  details: 'Please check required fields'
});
```

##### `showSuccess(message, options)`
Display success notification.

```javascript
app.showSuccess('User saved successfully!');
```

##### `showInfo(message, options)`
Display informational notification.

```javascript
app.showInfo('New features available in settings');
```

##### `showWarning(message, options)`
Display warning notification.

```javascript
app.showWarning('Your session will expire in 5 minutes');
```

##### `showLoading(message)`
Show loading indicator.

```javascript
app.showLoading('Saving user data...');
```

##### `hideLoading()`
Hide loading indicator.

```javascript
app.hideLoading();
```

#### State Management

##### `getState(key)`
Get application state value.

```javascript
const user = app.getState('currentUser');
const theme = app.getState('theme') || 'light';
```

##### `setState(key, value)` or `setState(object)`
Set application state.

```javascript
// Single value
app.setState('currentUser', { id: 123, name: 'John' });

// Multiple values
app.setState({
  theme: 'dark',
  language: 'en',
  notifications: true
});
```

#### Component Registry

##### `registerComponent(name, ComponentClass)`
Register a reusable component.

```javascript
import CustomTable from './components/CustomTable.js';

app.registerComponent('custom-table', CustomTable);
```

##### `getComponent(name)`
Get a registered component class.

```javascript
const TableClass = app.getComponent('custom-table');
const table = new TableClass({ data: myData });
```

#### Model Registry

##### `registerModel(name, ModelClass)`
Register a model class globally.

```javascript
import User from './models/User.js';

app.registerModel('User', User);
```

##### `getModel(name)`
Get a registered model class.

```javascript
const User = app.getModel('User');
const user = new User({ name: 'John Doe' });
```

## Advanced Usage

### 1. Custom Layout

```javascript
const app = new WebApp({
  container: '#app',
  layout: `
    <div class="app-layout">
      <nav class="app-nav">
        <a data-page="home">Home</a>
        <a data-page="users">Users</a>
      </nav>
      <main class="app-content">
        <!-- Pages render here -->
      </main>
      <footer class="app-footer">
        © 2024 My App
      </footer>
    </div>
  `
});
```

### 2. Authentication Integration

```javascript
class SecureWebApp extends WebApp {
  async start() {
    // Check authentication before starting
    const token = localStorage.getItem('auth-token');
    if (!token) {
      await this.showPage('login');
      return;
    }
    
    // Set current user in state
    const user = await this.validateToken(token);
    this.setState('currentUser', user);
    
    await super.start();
  }
  
  async showPage(name, params, query, options) {
    const PageClass = this.getPage(name);
    
    // Check if page requires authentication
    if (PageClass.requiresAuth && !this.getState('currentUser')) {
      await super.showPage('login');
      return;
    }
    
    await super.showPage(name, params, query, options);
  }
}
```

### 3. Error Boundary

```javascript
const app = new WebApp({
  container: '#app',
  onError: (error, context) => {
    // Custom error handling
    console.error('App error:', error, context);
    
    // Log to external service
    analytics.track('app_error', {
      message: error.message,
      stack: error.stack,
      context: context
    });
    
    // Show user-friendly message
    app.showError('Something went wrong. Please try again.');
  }
});
```

### 4. Progressive Loading

```javascript
class MyWebApp extends WebApp {
  async getOrCreatePage(name, params, query) {
    this.showLoading(`Loading ${name}...`);
    
    try {
      const page = await super.getOrCreatePage(name, params, query);
      return page;
    } finally {
      this.hideLoading();
    }
  }
}
```

## Events

WebApp emits events during its lifecycle:

```javascript
// Listen for page changes
app.on('page:changed', ({ from, to, params }) => {
  console.log(`Navigated from ${from} to ${to}`);
  analytics.track('page_view', { page: to, params });
});

// Listen for errors
app.on('error', ({ error, context }) => {
  errorReporting.log(error, context);
});

// Listen for state changes
app.on('state:changed', ({ key, value, previous }) => {
  if (key === 'currentUser') {
    updateUserInterface(value);
  }
});
```

## Best Practices

### 1. Single Instance
Create only one WebApp instance per application:

```javascript
// Good
const app = WebApp.create({ container: '#app' });
export default app;

// Bad - multiple instances
const app1 = new WebApp({ container: '#app1' });
const app2 = new WebApp({ container: '#app2' });
```

### 2. Centralized Registration
Register all pages and components at startup:

```javascript
// pages/index.js
export { default as HomePage } from './HomePage.js';
export { default as UsersPage } from './UsersPage.js';
export { default as SettingsPage } from './SettingsPage.js';

// app.js
import * as Pages from './pages/index.js';

const app = WebApp.create();

Object.entries(Pages).forEach(([name, PageClass]) => {
  const pageName = name.replace('Page', '').toLowerCase();
  app.registerPage(pageName, PageClass);
});
```

### 3. Error Handling
Always handle async operations with proper error handling:

```javascript
try {
  app.showLoading('Saving...');
  await app.showPage('dashboard');
  app.showSuccess('Welcome to dashboard!');
} catch (error) {
  app.showError('Failed to load dashboard');
  console.error('Dashboard error:', error);
} finally {
  app.hideLoading();
}
```

### 4. State Management
Use the state system for global application data:

```javascript
// Set user preferences
app.setState({
  theme: 'dark',
  language: 'en',
  timezone: 'UTC'
});

// Access in pages
class MyPage extends Page {
  async getViewData() {
    const theme = this.getApp().getState('theme');
    return { theme, ...otherData };
  }
}
```

## Integration with Other Components

### With Pages
```javascript
class MyPage extends Page {
  async onEnter() {
    const app = this.getApp();
    app.showLoading('Loading page...');
  }
  
  async onExit() {
    const app = this.getApp();
    app.hideLoading();
  }
}
```

### With Views
```javascript
class MyView extends View {
  async handleActionSave(event, element) {
    const app = this.getApp();
    
    try {
      app.showLoading('Saving...');
      await this.model.save();
      app.showSuccess('Saved successfully!');
    } catch (error) {
      app.showError('Save failed: ' + error.message);
    } finally {
      app.hideLoading();
    }
  }
}
```

---

WebApp serves as the foundation for your entire MOJO application, providing the structure and services needed to build robust, user-friendly web applications.