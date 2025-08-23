# View - Base UI Component

## Overview

View is the foundational component of the MOJO framework. Every visual element in your application extends from View, providing a consistent structure for UI components with automatic event handling, template rendering, lifecycle management, and parent-child relationships.

## Key Features

- **Event Delegation**: Automatic handling of click, change, and keyboard events
- **Template Rendering**: Mustache template integration with data binding
- **Lifecycle Hooks**: Complete component lifecycle with hooks for customization
- **Parent-Child Management**: Hierarchical component structure with automatic cleanup
- **Action System**: Convention-based event handling with `handleAction*` methods
- **DOM Management**: Automatic element creation, mounting, and cleanup
- **State Management**: Built-in data management with reactivity

## Basic Usage

### 1. Simple View

```javascript
import { View } from 'web-mojo';

class GreetingView extends View {
  constructor(options = {}) {
    super({
      template: '<h1>Hello, {{name}}!</h1>',
      className: 'greeting-component',
      ...options
    });
  }
}

// Usage
const greeting = new GreetingView();
document.body.appendChild(greeting.element);
await greeting.render();
```

### 2. Interactive View

```javascript
class CounterView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="counter">
          <h2>Count: {{count}}</h2>
          <button data-action="increment">+</button>
          <button data-action="decrement">-</button>
          <button data-action="reset">Reset</button>
        </div>
      `,
      ...options
    });

    this.count = 0;
  }

  async handleActionIncrement(event, element) {
    this.count++;
    await this.render();
  }

  async handleActionDecrement(event, element) {
    this.count--;
    await this.render();
  }

  async handleActionReset(event, element) {
    this.count = 0;
    await this.render();
  }
}
```

## API Reference

### Constructor Options

```javascript
const view = new View({
  // DOM Configuration
  tagName: 'div',                    // Element tag name
  className: 'my-component',         // CSS classes
  id: 'unique-id',                   // Element ID
  attributes: {                      // HTML attributes
    'data-role': 'widget',
    'aria-label': 'My Widget'
  },

  // Template Configuration
  template: '<div>{{content}}</div>', // Inline template
  templateUrl: '/templates/my.html',  // External template URL

  // Container Configuration
  container: '#app',                  // Parent container selector/element
  autoRender: true,                   // Auto-render on creation
  autoMount: true,                    // Auto-mount after render

  // Data Configuration
  data: { key: 'value' },            // Initial view data
  model: modelInstance,              // Associated model
  collection: collectionInstance,    // Associated collection

  // Styling
  style: 'display: block;',          // Inline styles

  // Child Views
  children: [],                      // Initial child views

  // Custom Properties
  customOption: 'value'              // Any custom options
});
```

### Core Methods

#### Lifecycle Methods

##### `async render()`
Renders the view with current data and updates the DOM.

```javascript
// Basic rendering
await view.render();

// With custom data
await view.render({ message: 'Hello!' });

// Force re-render
await view.render(null, { force: true });
```

##### `async mount(container)`
Mounts the rendered view into the DOM.

```javascript
// Mount to specific container
await view.mount('#app');

// Mount to element
const container = document.getElementById('app');
await view.mount(container);

// Auto-mount (uses configured container)
await view.mount();
```

##### `async unmount()`
Removes the view from the DOM while keeping it available for re-mounting.

```javascript
await view.unmount();
```

##### `async destroy()`
Completely destroys the view, cleaning up all resources.

```javascript
await view.destroy();
```

#### DOM Methods

##### `createElement()`
Creates the DOM element (called automatically).

```javascript
const element = view.createElement();
```

##### `setContainer(container)`
Sets the parent container for mounting.

```javascript
view.setContainer('#main-content');
view.setContainer(document.body);
```

#### Child Management

##### `addChild(child, options)`
Adds a child view with automatic lifecycle management.

```javascript
const childView = new ChildView();
view.addChild(childView, {
  container: '.child-container',  // Where to mount child
  autoRender: true,              // Auto-render child
  autoMount: true                // Auto-mount child
});
```

##### `removeChild(child)`
Removes and cleans up a child view.

```javascript
view.removeChild(childView);
```

##### `getChild(id)`
Gets a child view by ID.

```javascript
const child = view.getChild('child-id');
```

##### `getChildren()`
Gets all child views.

```javascript
const children = view.getChildren();
children.forEach(child => console.log(child.id));
```

### Lifecycle Hooks

Override these methods to customize behavior:

#### `onInit()`
Called during construction, before rendering.

```javascript
class MyView extends View {
  onInit() {
    super.onInit();
    console.log('View initializing...');
    this.setupInitialState();
  }
}
```

#### `async onBeforeRender()`
Called before each render operation.

```javascript
async onBeforeRender() {
  await super.onBeforeRender();
  this.validateData();
  this.prepareRenderData();
}
```

#### `async onAfterRender()`
Called after each render operation.

```javascript
async onAfterRender() {
  await super.onAfterRender();
  this.initializePlugins();
  this.bindCustomEvents();
}
```

#### `async onBeforeMount()`
Called before mounting to DOM.

```javascript
async onBeforeMount() {
  await super.onBeforeMount();
  this.prepareForMounting();
}
```

#### `async onAfterMount()`
Called after mounting to DOM.

```javascript
async onAfterMount() {
  await super.onAfterMount();
  this.focusFirstInput();
  this.startAnimations();
}
```

#### `async onBeforeDestroy()`
Called before destroying the view.

```javascript
async onBeforeDestroy() {
  await super.onBeforeDestroy();
  this.saveState();
  this.cleanupResources();
}
```

#### `async onAfterDestroy()`
Called after destroying the view.

```javascript
async onAfterDestroy() {
  await super.onAfterDestroy();
  console.log('View destroyed');
}
```

## Event System

### Action Events

Views automatically handle events through the action system:

#### Click Actions (`data-action`)

```html
<button data-action="save">Save</button>
<a data-action="delete" data-id="123">Delete</a>
<div data-action="toggle-panel">Toggle</div>
```

```javascript
class MyView extends View {
  // Method naming: handleAction + PascalCase(action-name)
  async handleActionSave(event, element) {
    // Handle save button click
    const form = this.element.querySelector('form');
    await this.submitForm(form);
  }

  async handleActionDelete(event, element) {
    const id = element.getAttribute('data-id');
    await this.deleteItem(id);
  }

  async handleActionTogglePanel(event, element) {
    this.togglePanel();
  }
}
```

#### Change Actions (`data-change-action`)

```html
<select data-change-action="filter-data">
<input data-change-action="search" data-filter="name">
<input type="checkbox" data-change-action="toggle-option">
```

```javascript
class MyView extends View {
  async handleActionFilterData(event, element) {
    const filterValue = element.value;
    await this.applyFilter(filterValue);
  }

  async handleActionSearch(event, element) {
    const searchTerm = element.value;
    await this.performSearch(searchTerm);
  }

  async handleActionToggleOption(event, element) {
    const isChecked = element.checked;
    this.toggleOption(isChecked);
  }
}
```

#### Fallback Handler

```javascript
class MyView extends View {
  // Handle any unhandled actions
  async onActionDefault(action, event, element) {
    console.log('Unhandled action:', action);

    // Implement fallback behavior
    if (action.startsWith('external-')) {
      this.handleExternalAction(action, event, element);
    }
  }
}
```

### Custom Events

Views extend EventEmitter for custom event handling:

```javascript
class MyView extends View {
  async handleActionSubmit(event, element) {
    // Emit custom event
    this.emit('form-submitted', {
      data: this.getFormData(),
      timestamp: Date.now()
    });
  }
}

// Listen for custom events
const view = new MyView();
view.on('form-submitted', (data) => {
  console.log('Form submitted:', data);
});
```

## Template System

### Mustache Templates

Views use Mustache templating with automatic data binding:

```javascript
class UserListView extends View {
  constructor(options = {}) {
    super({
      title: 'User Directory',
      users: [],
      template: `
        <div class="user-list">
          <h2>{{title}}</h2>
          {{#users}}
            <div class="user-card">
              <h3>{{name}}</h3>
              <p>{{email}}</p>
              <button data-action="edit-user" data-id="{{id}}">Edit</button>
            </div>
          {{/users}}
          {{^users}}
            <p class="empty-state">No users found</p>
          {{/users}}
        </div>
      `,
      ...options
    });
  }
}
```

### External Templates

```javascript
class MyView extends View {
  constructor(options = {}) {
    super({
      templateUrl: '/templates/my-view.html',
      ...options
    });
  }
}
```

### Dynamic Templates

```javascript
class DynamicView extends View {
  async getTemplate() {
    // Return different templates based on state
    if (this.model?.get('type') === 'admin') {
      return await this.loadTemplate('/templates/admin-view.html');
    } else {
      return '<div class="user-view">{{content}}</div>';
    }
  }
}
```

### Partials

```javascript
class MyView extends View {
  getPartials() {
    return {
      'user-card': '<div class="card">{{name}} - {{email}}</div>',
      'loading': '<div class="spinner">Loading...</div>'
    };
  }

  constructor(options = {}) {
    super({
      template: `
        <div>
          {{#loading}}
            {{> loading}}
          {{/loading}}
          {{#users}}
            {{> user-card}}
          {{/users}}
        </div>
      `,
      ...options
    });
  }
}
```

## Advanced Usage

### 1. Data-Driven View with Model

```javascript
class UserProfileView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="user-profile">
          <img src="{{model.avatar}}" alt="{{model.name}}" class="avatar">
          <h1>{{model.name}}</h1>
          <p>{{model.email}}</p>
          <div class="actions">
            <button data-action="edit-profile">Edit Profile</button>
            <button data-action="change-avatar">Change Avatar</button>
          </div>
        </div>
      `,
      model: options.user,
      ...options
    });
  }

  async handleActionEditProfile(event, element) {
    const formView = new ProfileFormView({ model: this.model });
    const result = await Dialog.showForm(formView, {
      title: 'Edit Profile',
      size: 'lg'
    });

    if (result) {
      await this.render(); // Re-render with updated data
    }
  }

  async handleActionChangeAvatar(event, element) {
    // Handle avatar change
  }
}
```

### 2. Collection-Driven View

```javascript
class TodoListView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="todo-list">
          <div class="header">
            <h2>Todo List ({{collection.count}})</h2>
            <button data-action="add-todo">Add Todo</button>
          </div>
          <div class="todos">
            {{collection.models}}
              <div class="todo-item {{#completed}}completed{{/completed}}">
                <input type="checkbox" data-change-action="toggle-todo"
                       data-id="{{id}}" {{#completed}}checked{{/completed}}>
                <span>{{title}}</span>
                <button data-action="delete-todo" data-id="{{id}}">Delete</button>
              </div>
            {{/collection.models}}
          </div>
        </div>
      `,
      collection: options.todos,
      ...options
    });
  }

  async handleActionAddTodo(event, element) {
    const title = await Dialog.prompt('Enter todo title:');
    if (title) {
      const todo = new Todo({ title, completed: false });
      await todo.save();
      this.collection.add(todo);
      await this.render();
    }
  }

  async handleActionToggleTodo(event, element) {
    const id = element.getAttribute('data-id');
    const todo = this.collection.get(id);
    todo.set('completed', element.checked);
    await todo.save();
    await this.render();
  }

  async handleActionDeleteTodo(event, element) {
    const id = element.getAttribute('data-id');
    const confirmed = await Dialog.confirm('Delete this todo?');
    if (confirmed) {
      const todo = this.collection.get(id);
      await todo.destroy();
      this.collection.remove(todo);
      await this.render();
    }
  }
}
```

### 3. Composite View with Children

```javascript
class DashboardView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="dashboard">
          <div class="header" data-view-container="header"></div>
          <div class="sidebar" data-view-container="sidebar"></div>
          <div class="main-content" data-view-container="content"></div>
        </div>
      `,
      ...options
    });
  }

  async onInit() {
    await super.onInit();

    // Create child views
    this.headerView = new HeaderView({
      container: '[data-view-container="header"]'
    });

    this.sidebarView = new SidebarView({
      container: '[data-view-container="sidebar"]'
    });

    this.contentView = new MainContentView({
      container: '[data-view-container="content"]'
    });

    // Add as children for lifecycle management
    this.addChild(this.headerView);
    this.addChild(this.sidebarView);
    this.addChild(this.contentView);
  }

  async showContent(contentView) {
    // Replace main content
    this.removeChild(this.contentView);
    this.contentView = contentView;
    this.addChild(this.contentView, {
      container: '[data-view-container="content"]'
    });
  }
}
```

### 4. Reactive View with State

```javascript
class CounterView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="counter">
          <h2>{{count}}</h2>
          <button data-action="increment" {{#loading}}disabled{{/loading}}>
            {{#loading}}Loading...{{/loading}}
            {{^loading}}+1{{/loading}}
          </button>
          <button data-action="decrement">-1</button>
          <button data-action="reset">Reset</button>
        </div>
      `,
      ...options
    });

    this.state = {
      count: 0,
      loading: false
    };
  }

  async setState(updates) {
    this.state = { ...this.state, ...updates };
    await this.render();
  }

  async handleActionIncrement(event, element) {
    await this.setState({ loading: true });

    // Simulate async operation
    setTimeout(async () => {
      await this.setState({
        count: this.state.count + 1,
        loading: false
      });
    }, 500);
  }

  async handleActionDecrement(event, element) {
    await this.setState({ count: this.state.count - 1 });
  }

  async handleActionReset(event, element) {
    await this.setState({ count: 0 });
  }
}
```

## Best Practices

### 1. Separation of Concerns

```javascript
// Good - Clear responsibility separation
class UserView extends View {
  async handleActionSave(event, element) {
    await this.model.save(this.getFormData());
  }
}

// Avoid - Mixing data logic with presentation
class BadUserView extends View {
  async handleActionSave(event, element) {
    const userData = this.getFormData();
    // Don't do API calls directly in views
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
}
```

### 2. Lifecycle Management

```javascript
class MyView extends View {
  async onAfterRender() {
    await super.onAfterMount();

    // Set up resources that need cleanup
    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);

    this.interval = setInterval(() => this.updateTime(), 1000);
  }

  async onBeforeDestroy() {
    // Clean up resources
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.interval) {
      clearInterval(this.interval);
    }

    await super.onBeforeDestroy();
  }
}
```

### 3. Error Handling

```javascript
class MyView extends View {
  async handleActionSave(event, element) {
    try {
      await this.model.save();
      this.showSuccess('Saved successfully!');
    } catch (error) {
      this.showError('Save failed: ' + error.message);
      console.error('Save error:', error);
    }
  }

  async onAfterRender() {
    try {
      await super.onAfterRender();
      this.initializeComponents();
    } catch (error) {
      this.showError('Failed to initialize view');
      console.error('Render error:', error);
    }
  }
}
```

### 4. Performance Optimization

```javascript
class OptimizedView extends View {
  constructor(options = {}) {
    super(options);

    // Debounce expensive operations
    this.debouncedSearch = this.debounce(this.performSearch.bind(this), 300);
  }

  async handleActionSearch(event, element) {
    // Use debounced version for search
    this.debouncedSearch(element.value);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Override render to prevent unnecessary re-renders
  async render(data, options = {}) {
    if (!this.shouldRender(data, options)) {
      return;
    }

    return super.render(data, options);
  }

  shouldRender(data, options) {
    // Implement custom logic to determine if render is needed
    return options.force || this.dataHasChanged(data);
  }
}
```

## Integration with Other Components

### With Models

```javascript
class UserView extends View {
  constructor(options = {}) {
    super({
      model: options.user,
      template: '...',
      ...options
    });

    // Listen for model changes
    if (this.model) {
      this.model.on('change', () => this.render());
    }
  }

  async getViewData() {
    return this.model?.toJSON() || {};
  }
}
```

### With Collections

```javascript
class ListView extends View {
  constructor(options = {}) {
    super({
      collection: options.collection,
      ...options
    });

    // Listen for collection changes
    if (this.collection) {
      this.collection.on('add remove reset', () => this.render());
    }
  }

  async getViewData() {
    return {
      items: this.collection?.toJSON() || []
    };
  }
}
```

### With Pages

```javascript
class PageContentView extends View {
  async handleActionNavigate(event, element) {
    const page = element.getAttribute('data-page');
    const app = this.getApp();
    await app.showPage(page);
  }
}
```

---

View is the cornerstone of the MOJO framework, providing a powerful foundation for building interactive, maintainable UI components with clean separation of concerns and automatic lifecycle management.
