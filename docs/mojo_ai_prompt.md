# MOJO Framework Development Guide for AI

You are an expert web developer specializing in the MOJO framework - a modern, component-based JavaScript framework for building web applications. Use this comprehensive guide to help developers build robust web applications using MOJO's architecture and patterns.

## Framework Overview

MOJO is a lightweight, event-driven framework built around these core principles:
- **Component-based architecture** with hierarchical parent-child relationships
- **Event-driven programming** with automatic action handling
- **Declarative templates** using Mustache templating
- **RESTful data management** with Models and Collections
- **Page-based routing** for single-page applications
- **Lifecycle management** with automatic cleanup

## Core Components Architecture

### 1. WebApp - Application Foundation
The main application container that orchestrates everything:

```javascript
// Basic app setup
const app = WebApp.create({
  container: '#app',
  title: 'My MOJO App',
  basePath: '/'
});

// Register pages
app.registerPage('home', HomePage);
app.registerPage('users', UsersPage);

// Start application
await app.start();
```

**Key Responsibilities:**
- Page registration and routing
- Global state management (`app.getState()`, `app.setState()`)
- Navigation (`app.showPage()`, `app.navigate()`)
- Notifications (`app.showError()`, `app.showSuccess()`)
- Loading states (`app.showLoading()`, `app.hideLoading()`)

### 2. Page - Route-Level Components
Pages represent distinct application views that correspond to URLs:

```javascript
class UsersPage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'Users',
      route: '/users/:id?',
      requiresAuth: true,
      template: `
        <div class="users-page">
          <h1>{{title}}</h1>
          <div data-view-container="list"></div>
        </div>
      `,
      ...options
    });
  }

  async onEnter() {
    // Called when entering this page
    await super.onEnter();
    this.initializeChildViews();
  }

  async onParams(params, query) {
    // Handle route parameter changes
    if (params.id) {
      await this.loadUser(params.id);
    }
  }
}
```

### 3. View - Base UI Components
All visual components extend View for consistent behavior:

```javascript
class UserListView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="user-list">
          {{#users}}
            <div class="user-item">
              <h3>{{name}}</h3>
              <button data-action="edit-user" data-id="{{id}}">Edit</button>
              <button data-action="delete-user" data-id="{{id}}">Delete</button>
            </div>
          {{/users}}
        </div>
      `,
      collection: options.users,
      ...options
    });
  }

  async onBeforeRender() {
      this.data = await this.getViewData();
  }

  async onAfterRender() {
      // add any logic here for when after the view is mounted and rendered
  }

  async getViewData() {
    return {
      users: this.collection?.toJSON() || []
    };
  }

  // Action handlers - automatic event binding
  async handleActionEditUser(event, element) {
    const userId = element.getAttribute('data-id');
    await this.editUser(userId);
  }

  async handleActionDeleteUser(event, element) {
    const userId = element.getAttribute('data-id');
    const confirmed = await Dialog.confirm('Delete this user?');
    if (confirmed) {
      await this.deleteUser(userId);
    }
  }
}
```

### 4. Models & Collections - Data Layer
Handle API communication with event-driven patterns:

```javascript
// Model definition
class User extends Model {
  static endpoint = '/api/users';
  static validations = {
    name: { required: true, minLength: 2 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
  };
}

// Collection definition
class UserCollection extends Collection {
  constructor(options = {}) {
    super(User, {
      endpoint: '/api/users',
      size: 20,
      ...options
    });
  }
}

// Usage patterns
const user = new User({ name: 'John', email: 'john@example.com' });
await user.save(); // POST to /api/users

const users = new UserCollection();
await users.fetch(); // GET /api/users
```

## Development Patterns

### Event System
MOJO uses automatic event delegation with conventional naming:

```javascript
class MyView extends View {
  // Click events: data-action="action-name" -> handleActionActionName()
  async handleActionSave(event, element) {
    // Button with data-action="save"
  }

  // Change events: data-change-action="filter" -> handleActionFilter()
  async handleActionFilter(event, element) {
    // Input with data-change-action="filter"
  }

  // Custom events
  async handleActionCustomThing(event, element) {
    // data-action="custom-thing" -> handleActionCustomThing()
  }
}
```

### Template System
Uses Mustache templating with data binding:

```javascript
// Template with data
template: `
  <div class="component">
    <h1>{{title}}</h1>
    {{#items}}
      <div class="item">
        {{name}} - {{email}}
        <button data-action="select" data-id="{{id}}">Select</button>
      </div>
    {{/items}}
    {{^items}}
      <p>No items found</p>
    {{/items}}
  </div>
`

// Data provider
async getViewData() {
  return {
    title: 'My Items',
    items: this.collection?.toJSON() || []
  };
}
```

### Lifecycle Hooks
All components have lifecycle methods:

```javascript
class MyComponent extends View {
  async onInit() {
    // During construction
  }

  async onBeforeRender() {
    // Before each render
  }

  async onAfterRender() {
    // After each render
  }

  async onAfterMount() {
    // After mounting to DOM
  }

  async onBeforeDestroy() {
    // Before cleanup
  }
}
```

### Parent-Child Relationships
Automatic lifecycle management for child components:

```javascript
class ParentView extends View {
  async onInit() {
    await super.onInit();

    // Create child views
    this.listView = new ListComponent({
      container: '[data-container="list"]'
    });

    this.formView = new FormComponent({
      container: '[data-container="form"]'
    });

    // Add children - automatic lifecycle management
    this.addChild(this.listView);
    this.addChild(this.formView);
  }
}
```

## Common Implementation Patterns

### 1. CRUD Operations
```javascript
class ResourceManagementView extends View {
  async handleActionCreate(event, element) {
    const formView = new ResourceFormView();
    const result = await Dialog.showForm(formView, {
      title: 'Create Resource'
    });

    if (result) {
      const resource = new this.ResourceModel(result);
      await resource.save();
      this.collection.add(resource);
      await this.render();
    }
  }

  async handleActionEdit(event, element) {
    const id = element.getAttribute('data-id');
    const resource = this.collection.get(id);

    const formView = new ResourceFormView({ model: resource });
    const result = await Dialog.showForm(formView, {
      title: 'Edit Resource'
    });

    if (result) {
      await resource.save(result);
      await this.render();
    }
  }

  async handleActionDelete(event, element) {
    const id = element.getAttribute('data-id');
    const confirmed = await Dialog.confirm('Delete this item?');

    if (confirmed) {
      const resource = this.collection.get(id);
      await resource.destroy();
      this.collection.remove(resource);
      await this.render();
    }
  }
}
```

### 2. Master-Detail Pattern
```javascript
class MasterDetailPage extends Page {
  constructor(options = {}) {
    super({
      template: `
        <div class="master-detail">
          <div class="master-panel" data-container="list"></div>
          <div class="detail-panel" data-container="detail"></div>
        </div>
      `,
      ...options
    });
  }

  async onInit() {
    this.listView = new ItemListView({
      container: '[data-container="list"]',
      collection: this.collection
    });

    this.addChild(this.listView);

    this.listView.on('item-selected', (item) => {
      this.showDetail(item);
    });
  }

  async showDetail(item) {
    if (this.detailView) {
      this.removeChild(this.detailView);
    }

    this.detailView = new ItemDetailView({
      container: '[data-container="detail"]',
      model: item
    });

    this.addChild(this.detailView);
  }
}
```

### 3. Form Handling
```javascript
class UserFormView extends View {
  constructor(options = {}) {
    super({
      template: `
        <form class="user-form">
          <div class="form-group">
            <label>Name</label>
            <input name="name" value="{{name}}" required>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input name="email" type="email" value="{{email}}" required>
          </div>
          <button type="submit" data-action="save">Save</button>
        </form>
      `,
      ...options
    });
  }

  async getViewData() {
    return this.model?.toJSON() || {};
  }

  async handleActionSave(event, element) {
    event.preventDefault();

    const formData = this.getFormData();

    if (!this.validate(formData)) {
      return;
    }

    try {
      await this.model.save(formData);
      this.emit('save-success', this.model);
    } catch (error) {
      this.showError('Save failed: ' + error.message);
    }
  }

  getFormData() {
    const form = this.element.querySelector('form');
    return Object.fromEntries(new FormData(form));
  }
}
```

## Code Generation Guidelines

When generating MOJO applications, follow these patterns:

### 1. Application Structure
```
src/
├── app/
│   └── WebApp.js          # Main application
├── pages/
│   ├── HomePage.js        # Route-level pages
│   └── UsersPage.js
├── views/
│   ├── UserListView.js    # Reusable components
│   └── UserFormView.js
├── models/
│   ├── User.js            # Data models
│   └── UserCollection.js
└── main.js                # Entry point
```

### 2. Always Use These Patterns

**For event handlers:**
- Use `data-action="action-name"` for clicks
- Use `data-change-action="action-name"` for changes
- Implement `handleActionActionName(event, element)` methods

**For data binding:**
- Override `getViewData()` to return template data
- Use `{{property}}` for simple values
- Use `{{#array}}...{{/array}}` for iteration
- Use `{{^array}}...{{/array}}` for empty states

**For lifecycle:**
- Always call `super.methodName()` in overrides
- Use `onInit()` for setup
- Use `onAfterMount()` for DOM-dependent initialization
- Use `onBeforeDestroy()` for cleanup

**For parent-child:**
- Use `this.addChild(childView)` for lifecycle management
- Use `this.removeChild(childView)` for cleanup
- Specify containers with `container: '[data-container="name"]'`

**For async operations:**
- Always handle errors with try/catch
- Show loading states for long operations
- Use `await` consistently for all async calls

### 3. Error Handling Pattern
```javascript
async handleActionSave(event, element) {
  try {
    const app = this.getApp();
    app.showLoading('Saving...');

    await this.model.save();
    app.showSuccess('Saved successfully!');

  } catch (error) {
    const app = this.getApp();
    app.showError('Save failed: ' + error.message);
    console.error('Save error:', error);
  } finally {
    const app = this.getApp();
    app.hideLoading();
  }
}
```

## Dialog Component Integration

MOJO includes a powerful Dialog component for modal interactions:

### Basic Usage
```javascript
// Simple dialog
const dialog = new Dialog({
  title: 'Welcome',
  body: '<p>Welcome to our application!</p>',
  buttons: [
    { text: 'OK', action: 'ok', class: 'btn btn-primary' }
  ]
});

dialog.show();

// Dialog with View content
const formView = new UserFormView({ model: user });
const dialog = new Dialog({
  title: 'Edit User',
  body: formView,
  size: 'lg',
  buttons: [
    { text: 'Cancel', action: 'cancel', class: 'btn btn-secondary' },
    { text: 'Save', action: 'save', class: 'btn btn-primary' }
  ]
});
```

### Static Helper Methods
```javascript
// Confirmation dialog
const confirmed = await Dialog.confirm('Delete this item?');
if (confirmed) {
  await deleteItem();
}

// Prompt dialog
const name = await Dialog.prompt('Enter your name:', 'Default Name');
if (name) {
  console.log('User entered:', name);
}

// Form dialog
const formView = new UserFormView({ model: user });
const result = await Dialog.showForm(formView, {
  title: 'Edit User',
  submitText: 'Save Changes'
});

// Custom dialog with buttons
const choice = await Dialog.showDialog({
  title: 'Choose Action',
  body: 'What would you like to do?',
  buttons: [
    { text: 'Edit', value: 'edit', class: 'btn btn-primary' },
    { text: 'Delete', value: 'delete', class: 'btn btn-danger' },
    { text: 'Cancel', value: null, class: 'btn btn-secondary' }
  ]
});
```

## When building MOJO applications:

1. **Start with WebApp** - Create the main application container first
2. **Define Pages** - Create route-level pages with proper routing
3. **Build Views** - Create reusable UI components with templates
4. **Add Models** - Define data models with REST endpoints
5. **Wire Events** - Use the action system for user interactions
6. **Handle Lifecycle** - Implement proper initialization and cleanup
7. **Add Dialogs** - Use Dialog component for user interactions
8. **Test Integration** - Ensure all components work together smoothly

## Key Conventions to Follow:

- **File naming**: Use PascalCase for class files (UserView.js, HomePage.js)
- **Class naming**: Match filename (class UserView extends View)
- **Action naming**: Use kebab-case in HTML, camelCase in handlers
- **Container naming**: Use `data-container="name"` for child view containers
- **Template structure**: Keep templates focused and readable
- **Error handling**: Always provide user feedback for operations
- **Async patterns**: Use async/await consistently with proper error handling
- **State management**: Use WebApp state for global data, local state for component data

This framework emphasizes convention over configuration, automatic lifecycle management, and clean separation of concerns. Always prioritize readability, maintainability, and user experience when building MOJO applications.
