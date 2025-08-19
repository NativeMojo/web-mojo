# View - Core UI Component

The `View` class is the foundation of the MOJO framework, providing a powerful component-based architecture for building interactive web applications. Views handle rendering, data binding, event management, and child component coordination.

## Overview

Views are self-contained UI components that:
- Render HTML templates using Mustache templating
- Handle user interactions through declarative event binding
- Manage component lifecycle and cleanup
- Support hierarchical parent-child relationships
- Provide robust data formatting and binding capabilities

## Constructor Options

```js
import View from './src/core/View.js';

const view = new View({
  // Element configuration
  tagName: 'div',              // HTML tag for root element
  className: 'my-view',        // CSS class names
  id: 'unique-view-id',        // Element ID (auto-generated if not provided)
  style: 'color: red;',        // Inline CSS styles

  // Container configuration
  containerId: 'app-container', // ID of container to mount into
  container: document.getElementById('app'), // Direct container element reference

  // Template configuration
  template: '<h1>{{title}}</h1>',           // Inline template string
  templateUrl: '/templates/my-view.html',    // External template file
  template: (data, state) => `<h1>${data.title}</h1>`, // Template function

  // Data configuration
  data: { title: 'Hello World' },           // Template data
  model: new UserModel({ id: 123 }),        // Associated model

  // Hierarchy configuration
  parent: parentView,                        // Parent view reference
  children: { sidebar: sidebarView },       // Child views

  // Options
  debug: true,                               // Enable debug logging
  cacheTemplate: true,                       // Cache loaded templates
  renderCooldown: 100,                       // Minimum ms between renders
  app: appInstance                           // Application instance reference
});
```

## Template System

### Inline Templates

Use template strings directly in the constructor:

```js
class GreetingView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="greeting">
          <h2>Hello, {{name}}!</h2>
          <p>Welcome to {{app.title}}</p>
        </div>
      `,
      data: { name: 'World' },
      ...options
    });
  }
}
```

### External Template Files

Load templates from separate HTML files:

```js
class UserProfileView extends View {
  constructor(options = {}) {
    super({
      templateUrl: '/templates/user-profile.html',
      cacheTemplate: true, // Cache after first load
      ...options
    });
  }
}
```

External template files are loaded relative to the application's `basePath` and automatically cached when `cacheTemplate: true` is set.

### Dynamic Template Functions

Generate templates programmatically:

```js
class DynamicListView extends View {
  constructor(options = {}) {
    super({
      template: (data, state) => {
        const itemsHtml = data.items
          .map(item => `<li class="item">${item.name}</li>`)
          .join('');
        
        return `
          <div class="dynamic-list">
            <h3>${data.title}</h3>
            <ul>${itemsHtml}</ul>
            ${state.showFooter ? '<footer>Total: ' + data.items.length + '</footer>' : ''}
          </div>
        `;
      },
      ...options
    });
  }
}
```

### Template Partials

Reuse template fragments with partials:

```js
class ArticleView extends View {
  getPartials() {
    return {
      'author-info': `
        <div class="author">
          <img src="{{author.avatar}}" alt="{{author.name}}">
          <span>{{author.name}}</span>
        </div>
      `,
      'article-meta': `
        <div class="meta">
          <time>{{publishDate|date('MMMM D, YYYY')}}</time>
          <span>{{readTime}} min read</span>
        </div>
      `
    };
  }
}
```

Use partials in templates:

```html
<article>
  <header>
    <h1>{{title}}</h1>
    {{>article-meta}}
    {{>author-info}}
  </header>
  <div class="content">{{content}}</div>
</article>
```

## Data Binding and Context

### The get() Method

Views provide a powerful `get()` method that supports dot notation, method calls, and data formatting:

```js
class UserDashboardView extends View {
  constructor(options = {}) {
    super({
      data: {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          lastLogin: '2024-01-15T10:30:00Z'
        },
        stats: {
          posts: 42,
          followers: 1250
        }
      },
      ...options
    });
  }

  getStatus() {
    return this.data.user.lastLogin ? 'active' : 'inactive';
  }

  getDisplayName() {
    return this.data.user.name.toUpperCase();
  }
}
```

Template usage with various data access patterns:

```html
<div class="dashboard">
  <!-- Direct property access -->
  <h1>{{data.user.name}}</h1>
  
  <!-- Method calls -->
  <span class="status">Status: {{getStatus}}</span>
  <h2>{{getDisplayName}}</h2>
  
  <!-- Dot notation with formatting -->
  <p>Email: {{data.user.email|lowercase}}</p>
  <p>Last Login: {{data.user.lastLogin|date('MMMM D, YYYY')}}</p>
  <p>Posts: {{data.stats.posts|number}} | Followers: {{data.stats.followers|compact}}</p>
</div>
```

### Data Formatters and Pipes

MOJO includes a comprehensive data formatting system accessible via pipe syntax:

```html
<!-- Date formatting -->
<time>{{createdAt|date('YYYY-MM-DD')}}</time>
<span>{{updatedAt|relative}}</span>

<!-- Number formatting -->
<span>{{price|currency}}</span>
<span>{{progress|percent}}</span>
<span>{{fileSize|filesize}}</span>

<!-- Text formatting -->
<h3>{{title|capitalize}}</h3>
<p>{{description|truncate(100)}}</p>
<span>{{status|uppercase}}</span>

<!-- Chained formatting -->
<span>{{userName|lowercase|truncate(20)|capitalize}}</span>

<!-- Custom formatting with arguments -->
<img src="{{avatar|image(150, 150, 'crop')}}" alt="{{name|initials}}">
```

### Model Integration

Views seamlessly integrate with MOJO Models:

```js
import UserModel from '../models/UserModel.js';

class UserProfileView extends View {
  constructor(options = {}) {
    const userModel = new UserModel({ id: options.userId });
    
    super({
      model: userModel,
      templateUrl: '/templates/user-profile.html',
      ...options
    });
  }

  async onInit() {
    // Load user data when view initializes
    await this.model.fetch();
    this.render();
  }

  async handleActionSave(event, element) {
    const formData = new FormData(element.closest('form'));
    
    try {
      await this.model.save(Object.fromEntries(formData));
      this.showSuccess('Profile updated successfully!');
    } catch (error) {
      this.showError('Failed to save profile: ' + error.message);
    }
  }
}
```

Template accessing model data:

```html
<div class="user-profile">
  <img src="{{model.avatar|image(200, 200)}}" alt="{{model.name}}">
  <h1>{{model.name}}</h1>
  <p>{{model.email}}</p>
  <p>Member since {{model.createdAt|date('MMMM YYYY')}}</p>
  
  {{#model.isActive}}
  <span class="badge bg-success">Active</span>
  {{/model.isActive}}
  
  {{^model.isActive}}
  <span class="badge bg-danger">Inactive</span>
  {{/model.isActive}}
</div>
```

## Event System

MOJO Views use the EventDelegate system for declarative event binding through HTML data attributes.

### Click Actions

Use `data-action` for click events:

```html
<div class="todo-item">
  <span>{{text}}</span>
  <button data-action="toggle-complete" data-id="{{id}}">
    {{#completed}}✓{{/completed}}{{^completed}}○{{/completed}}
  </button>
  <button data-action="delete-todo" data-id="{{id}}" class="btn-danger">Delete</button>
</div>
```

Handle actions in your view:

```js
class TodoItemView extends View {
  async handleActionToggleComplete(event, element) {
    const todoId = element.getAttribute('data-id');
    const todo = this.data.todos.find(t => t.id === todoId);
    
    todo.completed = !todo.completed;
    await this.updateData({ todos: this.data.todos });
  }

  async handleActionDeleteTodo(event, element) {
    const todoId = element.getAttribute('data-id');
    
    if (confirm('Delete this todo?')) {
      this.data.todos = this.data.todos.filter(t => t.id !== todoId);
      await this.updateData({ todos: this.data.todos });
    }
  }
}
```

### Change Actions

Use `data-change-action` for input change events:

```html
<div class="filters">
  <input type="text" 
         data-change-action="filter-items" 
         data-filter="search"
         placeholder="Search items...">
  
  <select data-change-action="sort-items">
    <option value="name">Sort by Name</option>
    <option value="date">Sort by Date</option>
    <option value="priority">Sort by Priority</option>
  </select>
</div>
```

```js
class ItemListView extends View {
  async handleActionFilterItems(event, element) {
    const searchTerm = element.value.toLowerCase();
    const filteredItems = this.originalItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm)
    );
    
    await this.updateData({ items: filteredItems });
  }

  async handleActionSortItems(event, element) {
    const sortBy = element.value;
    const sortedItems = [...this.data.items].sort((a, b) => {
      return a[sortBy] > b[sortBy] ? 1 : -1;
    });
    
    await this.updateData({ items: sortedItems });
  }
}
```

### Form Submissions

Use `data-action` on forms:

```html
<form data-action="submit-contact" class="contact-form">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <button type="submit">Send Message</button>
</form>
```

```js
class ContactFormView extends View {
  async handleActionSubmitContact(event, form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        this.showSuccess('Message sent successfully!');
        form.reset();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      this.showError(error.message);
    }
  }
}
```

### Default Action Handler

Provide a fallback for unhandled actions:

```js
class MyView extends View {
  async onActionDefault(action, event, element) {
    console.log('Unhandled action:', action);
    
    // Return true to prevent default behavior
    // Return false to allow default behavior
    return false;
  }
}
```

### Navigation Events

Views automatically handle navigation through `data-page` attributes and anchor links:

```html
<!-- Page navigation -->
<a data-page="user-profile" data-user-id="123">View Profile</a>
<button data-page="dashboard">Go to Dashboard</button>

<!-- Standard link navigation (handled by router) -->
<a href="/users/123">User Profile</a>
<a href="/dashboard">Dashboard</a>

<!-- External links (not handled by framework) -->
<a href="https://example.com" data-external>External Link</a>
```

## Lifecycle Methods

Views provide comprehensive lifecycle hooks for managing component behavior:

### Initialization Hooks

```js
class MyView extends View {
  // Called once when view is first created
  async onInit() {
    console.log('View initialized');
    // Set up initial data, event listeners, etc.
  }

  // Called once after onInit, used internally
  async onInitView() {
    // Framework initialization
    // Don't override unless you know what you're doing
  }
}
```

### Rendering Hooks

```js
class MyView extends View {
  // Called before each render
  async onBeforeRender() {
    console.log('About to render');
    // Prepare data, validate state, etc.
  }

  // Called after each render
  async onAfterRender() {
    console.log('Render complete');
    // Initialize third-party widgets, set focus, etc.
  }
}
```

### Mounting Hooks

```js
class MyView extends View {
  // Called before mounting to DOM
  async onBeforeMount() {
    console.log('About to mount');
    // Final preparations before DOM insertion
  }

  // Called after mounting to DOM
  async onAfterMount() {
    console.log('Mounted to DOM');
    // Initialize DOM-dependent features
    this.initializeCharts();
    this.setupResizeObserver();
  }
}
```

### Destruction Hooks

```js
class MyView extends View {
  // Called before destroying view
  async onBeforeDestroy() {
    console.log('About to destroy');
    // Save state, show confirmation, etc.
  }

  // Called after destroying view
  async onAfterDestroy() {
    console.log('Destroyed');
    // Final cleanup, remove external references, etc.
  }
}
```

## Child View Management

Views support hierarchical parent-child relationships:

### Adding Child Views

```js
class DashboardView extends View {
  async onInit() {
    // Add child views
    const sidebar = new SidebarView({ parent: this });
    const content = new ContentView({ parent: this });
    const footer = new FooterView({ parent: this });
    
    this.addChild(sidebar, { containerId: 'sidebar' });
    this.addChild(content, { containerId: 'main-content' });
    this.addChild(footer, { containerId: 'footer' });
  }
}
```

### Child Container Templates

Define containers in your template for child views:

```html
<div class="dashboard">
  <header class="dashboard-header">
    <h1>{{title}}</h1>
  </header>
  
  <div class="dashboard-body">
    <div id="sidebar" data-container="sidebar"></div>
    <div id="main-content" data-container="main-content"></div>
  </div>
  
  <div id="footer" data-container="footer"></div>
</div>
```

### Managing Child Views

```js
class ParentView extends View {
  // Get reference to child view
  getSidebar() {
    return this.getChild('sidebar');
  }

  // Update child data
  async updateChildData(childId, newData) {
    const child = this.getChild(childId);
    if (child) {
      await child.updateData(newData);
    }
  }

  // Remove child view
  removeChildView(childId) {
    const child = this.getChild(childId);
    if (child) {
      this.removeChild(child);
    }
  }

  // Get all children
  getAllChildren() {
    return Object.values(this.children);
  }
}
```

## Advanced Features

### Conditional Rendering

Use Mustache sections for conditional content:

```html
<div class="user-status">
  {{#user.isOnline}}
    <span class="status online">Online</span>
    <span class="last-seen">Active now</span>
  {{/user.isOnline}}
  
  {{^user.isOnline}}
    <span class="status offline">Offline</span>
    <span class="last-seen">Last seen {{user.lastSeen|relative}}</span>
  {{/user.isOnline}}
  
  {{#user.notifications.length}}
    <span class="badge">{{user.notifications.length}}</span>
  {{/user.notifications.length}}
</div>
```

### List Rendering with Iteration

Render arrays and objects using special iteration syntax:

```html
<!-- Array iteration -->
<ul class="todo-list">
  {{#.todos|iter}}
    <li class="todo-item {{#completed}}completed{{/completed}}">
      <span>{{text}}</span>
      <button data-action="toggle" data-id="{{id}}">Toggle</button>
    </li>
  {{/.todos|iter}}
</ul>

<!-- Object iteration -->
<div class="user-meta">
  {{#.user.metadata|iter}}
    <div class="meta-item">
      <strong>{{key}}:</strong> {{value}}
    </div>
  {{/.user.metadata|iter}}
</div>
```

### Error Handling

Views provide built-in error handling and user feedback:

```js
class MyView extends View {
  async handleActionRiskyOperation(event, element) {
    try {
      const result = await this.performRiskyOperation();
      this.showSuccess('Operation completed successfully!');
    } catch (error) {
      this.showError('Operation failed: ' + error.message);
      console.error('Detailed error:', error);
    }
  }

  // Override default error handler
  handleActionError(action, error, event, element) {
    console.error(`Action ${action} failed:`, error);
    this.showError(`Failed to ${action.replace('-', ' ')}`);
  }

  async performOperation() {
    try {
      // Risky operation
    } catch (error) {
      // Show user-friendly message
      this.showWarning('Unable to complete operation. Please try again.');
      
      // Log technical details
      console.error('Technical error details:', error);
      
      // Show info message for guidance
      this.showInfo('Check your internet connection and try again.');
    }
  }
}
```

### State Management

Manage component state separate from template data:

```js
class CounterView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="counter">
          <button data-action="decrement">-</button>
          <span class="count">{{count}}</span>
          <button data-action="increment">+</button>
          <button data-action="reset">Reset</button>
        </div>
      `,
      data: { count: 0 },
      ...options
    });

    this.state = {
      history: [],
      maxCount: 100
    };
  }

  async handleActionIncrement(event, element) {
    const newCount = Math.min(this.data.count + 1, this.state.maxCount);
    this.state.history.push(this.data.count);
    await this.updateData({ count: newCount });
  }

  async handleActionDecrement(event, element) {
    const newCount = Math.max(this.data.count - 1, 0);
    this.state.history.push(this.data.count);
    await this.updateData({ count: newCount });
  }

  async handleActionReset(event, element) {
    this.state.history.push(this.data.count);
    await this.updateData({ count: 0 });
  }
}
```

## Best Practices

### 1. Separation of Concerns

Keep templates focused on presentation, business logic in methods:

```js
// Good
class UserView extends View {
  async getDisplayName() {
    return `${this.model.firstName} ${this.model.lastName}`.trim();
  }

  async getStatusBadge() {
    const status = this.model.isActive ? 'active' : 'inactive';
    const className = this.model.isActive ? 'badge-success' : 'badge-danger';
    return { status, className };
  }
}
```

```html
<div class="user-card">
  <h3>{{getDisplayName}}</h3>
  <span class="badge {{getStatusBadge.className}}">
    {{getStatusBadge.status}}
  </span>
</div>
```

### 2. Use Lifecycle Methods Appropriately

```js
class OptimizedView extends View {
  async onAfterMount() {
    // Initialize expensive operations only after DOM is ready
    this.initializeCharts();
    this.setupWebSocket();
  }

  async onBeforeDestroy() {
    // Clean up resources to prevent memory leaks
    this.disconnectWebSocket();
    this.destroyCharts();
  }
}
```

### 3. Efficient Rendering

```js
class EfficientView extends View {
  constructor(options = {}) {
    super({
      renderCooldown: 100, // Prevent excessive re-renders
      cacheTemplate: true, // Cache external templates
      ...options
    });
  }

  shouldRender(newData) {
    // Override to implement smart rendering
    return JSON.stringify(newData) !== JSON.stringify(this.data);
  }
}
```

### 4. Error Handling

Always handle potential errors gracefully:

```js
class RobustView extends View {
  async handleActionSaveData(event, element) {
    try {
      await this.saveData();
      this.showSuccess('Data saved successfully');
    } catch (error) {
      this.showError('Failed to save data: ' + error.message);
      console.error('Save error:', error);
    }
  }

  async onAfterRender() {
    try {
      this.initializeWidgets();
    } catch (error) {
      console.warn('Widget initialization failed:', error);
      // Continue gracefully without widgets
    }
  }
}
```

## Integration Examples

### With Collections

```js
import UserCollection from '../collections/UserCollection.js';

class UserListView extends View {
  constructor(options = {}) {
    super({
      templateUrl: '/templates/user-list.html',
      ...options
    });

    this.collection = new UserCollection();
  }

  async onInit() {
    await this.collection.fetch();
    await this.updateData({ 
      users: this.collection.toJSON(),
      total: this.collection.length 
    });
  }

  async handleActionRefreshUsers(event, element) {
    try {
      await this.collection.fetch();
      await this.updateData({ 
        users: this.collection.toJSON(),
        total: this.collection.length 
      });
      this.showSuccess('User list refreshed');
    } catch (error) {
      this.showError('Failed to refresh users');
    }
  }
}
```

### With Router Integration

```js
class RoutedView extends View {
  async handleActionNavigateToUser(event, element) {
    const userId = element.getAttribute('data-user-id');
    const router = this.findRouter();
    
    if (router) {
      await router.navigate(`/users/${userId}`);
    }
  }

  async handlePageNavigation(element) {
    // Custom page navigation logic
    const page = element.getAttribute('data-page');
    const params = this.getNavParams(element);
    
    await this.getApp().navigateToPage(page, params);
  }
}
```

This comprehensive guide covers the essential aspects of MOJO Views. For more advanced templating features and data formatting options, see the [Templates Guide](./Templates.md).