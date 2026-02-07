# View (Core)

**Base UI component with automatic event handling, template rendering, and lifecycle management**

The View class is the foundation of all UI components in MOJO. Every visual element extends from View, providing consistent structure with automatic event handling, template rendering, lifecycle management, and hierarchical composition.

---

## Table of Contents

### Overview
- [What is a View?](#what-is-a-view)
- [Key Features](#key-features)
- [When to Use Views](#when-to-use-views)

### Quick Start
- [Installation](#installation)
- [Simple View](#simple-view)
- [Interactive View](#interactive-view)
- [View with Model](#view-with-model)

### Core Concepts
- [View as Template Context](#view-as-template-context)
- [Model Integration](#model-integration)
- [Event-Driven Architecture](#event-driven-architecture)
- [Automatic Lifecycle Management](#automatic-lifecycle-management)

### API Reference
- [Constructor Options](#constructor-options)
- [Instance Properties](#instance-properties)
- [Lifecycle Methods](#lifecycle-methods)
- [DOM Methods](#dom-methods)
- [Child Management Methods](#child-management-methods)
- [Model Methods](#model-methods)
- [Template Methods](#template-methods)
- [Event Methods](#event-methods)
- [Utility Methods](#utility-methods)

### Lifecycle Hooks
- [Lifecycle Overview](#lifecycle-overview)
- [onInit() - Initialization](#oninit---initialization)
- [onBeforeRender() - Pre-Render](#onbeforerender---pre-render)
- [onAfterRender() - Post-Render](#onafterrender---post-render)
- [onBeforeMount() - Pre-Mount](#onbeforemount---pre-mount)
- [onAfterMount() - Post-Mount](#onaftermount---post-mount)
- [onBeforeDestroy() - Pre-Destroy](#onbeforedestroy---pre-destroy)
- [onAfterDestroy() - Post-Destroy](#onafterdestroy---post-destroy)
- [Lifecycle Flow](#lifecycle-flow)

### Working with Models
- [Binding Models](#binding-models)
- [Automatic Re-rendering](#automatic-re-rendering)
- [Accessing Model Data](#accessing-model-data)
- [Model Change Events](#model-change-events)

### Working with Collections
- [Binding Collections](#binding-collections)
- [Iterating Collections](#iterating-collections)
- [Collection Events](#collection-events)

### Best Practices
- [Template Design](#template-design)
- [Lifecycle Hook Usage](#lifecycle-hook-usage)
- [Performance Tips](#performance-tips)
- [Memory Management](#memory-management)

### Troubleshooting
- [Common Issues](#common-issues)
- [Debugging Techniques](#debugging-techniques)

### Related Documentation
- [ViewChildViews.md](#related-documentation)
- [Templates.md](#related-documentation)
- [Events.md](#related-documentation)
- [AdvancedViews.md](#related-documentation)

---

## What is a View?

A **View** is a self-contained UI component that manages:
- **Template rendering** with Mustache
- **DOM lifecycle** (creation, mounting, destruction)
- **Event handling** via EventDelegate
- **Data binding** with Models/Collections
- **Child view composition** for complex UIs

Every View:
1. Has a template (inline HTML string or function)
2. Renders to a DOM element
3. Can have child views
4. Listens for user interactions
5. Re-renders when data changes

---

## Key Features

- **Template Context** - View instance (`this`) is the Mustache context
- **Model Binding** - Automatic re-rendering on model changes
- **Event Delegation** - Convention-based handlers with `data-action`
- **Lifecycle Hooks** - Customize behavior at each stage
- **Child Composition** - Build complex UIs from smaller views
- **Automatic Cleanup** - Memory management handled automatically
- **DOM Management** - Element creation and mounting handled for you

---

## When to Use Views

Use Views for:
- **UI Components** - Buttons, cards, modals, forms
- **Pages** - Full page layouts
- **Widgets** - Dashboard widgets, charts, stats
- **Composite UIs** - Headers, sidebars, content areas
- **Dynamic Content** - Lists, tables, filtered data

---

## Installation

View is part of the web-mojo core:

```javascript
import { View } from 'web-mojo/core';
```

---

## Simple View

Create a basic view with inline template:

```javascript
import { View } from 'web-mojo/core';

class GreetingView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="greeting">
          <h1>Hello, {{name}}!</h1>
          <p>Welcome to MOJO</p>
        </div>
      `,
      className: 'greeting-component',
      ...options
    });
    
    this.name = 'World';
  }
}

// Usage
const greeting = new GreetingView();
await greeting.render();
await greeting.mount(document.getElementById('app'));
```

---

## Interactive View

Add user interaction with event handlers:

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

  async onActionIncrement() {
    this.count++;
    await this.render();
    return true;
  }

  async onActionDecrement() {
    this.count--;
    await this.render();
    return true;
  }

  async onActionReset() {
    this.count = 0;
    await this.render();
    return true;
  }
}

// Usage
const counter = new CounterView();
await counter.render();
await counter.mount(document.getElementById('app'));
```

**How it works:**
- `data-action="increment"` maps to `onActionIncrement()` method
- Handlers update view properties and re-render
- Return `true` to consume the event (preventDefault + stopPropagation)

See [Events.md](./Events.md) for complete event handling documentation.

---

## View with Model

Bind a view to a Model for automatic updates:

```javascript
import { View } from 'web-mojo/core';
import User from '@models/User.js';

class UserProfileView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="user-profile">
          <h2>{{model.name}}</h2>
          <p>{{model.email}}</p>
          <p>Member since: {{model.created_at|date}}</p>
        </div>
      `,
      ...options
    });
  }
}

// Usage
const user = new User({ id: 123 });
await user.fetch();

const profile = new UserProfileView({ model: user });
await profile.render();
await profile.mount(document.getElementById('profile'));

// View automatically re-renders when model changes
user.set('name', 'Updated Name');  // View updates automatically!
```

---

## View as Template Context

**The view instance (`this`) is the Mustache template context.**

Any property or method on the view is accessible in templates:

```javascript
class DashboardView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="dashboard">
          <h1>{{title}}</h1>
          <p>User: {{username}}</p>
          <p>Status: {{getStatus}}</p>
          <p>Items: {{items.length}}</p>
        </div>
      `,
      ...options
    });
    
    // View properties accessible in template
    this.title = 'My Dashboard';
    this.username = 'john_doe';
    this.items = ['Item 1', 'Item 2', 'Item 3'];
  }
  
  // View methods callable from template
  getStatus() {
    return this.items.length > 0 ? 'Active' : 'Empty';
  }
}
```

**Template lookups:**
- `{{title}}` → `this.title`
- `{{getStatus}}` → `this.getStatus()`
- `{{model.name}}` → `this.model.get('name')`
- `{{collection.length}}` → `this.collection.length()`

See [Templates.md](./Templates.md) for complete template documentation.

---

## Model Integration

Views automatically re-render when bound models change:

```javascript
class ProductView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="product">
          <h3>{{model.name}}</h3>
          <p>{{model.price|currency}}</p>
          <p>{{model.description}}</p>
        </div>
      `,
      ...options
    });
  }
}

// Create view with model
const product = new Product({ id: 456 });
const view = new ProductView({ model: product });
await view.render();
await view.mount(document.body);

// Fetch data - view automatically updates
await product.fetch();  // View re-renders!

// Change data - view automatically updates
product.set('price', 2999);  // View re-renders!
```

**Automatic behaviors:**
- Model bound via constructor `{ model: myModel }`
- View listens to model `'change'` events
- View re-renders when model changes
- Child views inherit parent's model

---

## Event-Driven Architecture

Views use convention-based event handling:

```javascript
class FormView extends View {
  constructor(options = {}) {
    super({
      template: `
        <form data-action="submit-form">
          <input type="text" name="username" />
          <button type="submit">Submit</button>
        </form>
      `,
      ...options
    });
  }
  
  // Convention: data-action="submit-form" → onActionSubmitForm()
  async onActionSubmitForm(event, form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    await this.saveData(data);
    return true;  // Consume event
  }
  
  async saveData(data) {
    // Your logic here
  }
}
```

**Convention mapping:**
- `data-action="save"` → `onActionSave()`
- `data-action="delete-item"` → `onActionDeleteItem()`
- `data-action="user-login"` → `onActionUserLogin()`

See [Events.md](./Events.md) for complete event system documentation.

---

## Automatic Lifecycle Management

Views have a complete lifecycle with hooks:

```javascript
class MyView extends View {
  // 1. Called once before first render (lazy loaded)
  async onInit() {
    console.log('Initializing...');
    // Add child views here
    // Load initial data
  }
  
  // 2. Before rendering HTML
  async onBeforeRender() {
    console.log('About to render');
  }
  
  // 3. After rendering HTML
  async onAfterRender() {
    console.log('Rendered');
    // DOM is ready, can query elements
  }
  
  // 4. Before mounting to DOM
  async onBeforeMount() {
    console.log('About to mount');
  }
  
  // 5. After mounting to DOM
  async onAfterMount() {
    console.log('Mounted and visible');
    // View is visible in page
  }
  
  // 6. Before destroying
  async onBeforeDestroy() {
    console.log('About to destroy');
    // Clean up resources
  }
  
  // 7. After destroying
  async onAfterDestroy() {
    console.log('Destroyed');
  }
}
```

---

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `template` | String \| Function | `""` | Mustache template (required) |
| `className` | String | `"mojo-view"` | CSS class for root element |
| `tagName` | String | `"div"` | HTML tag for root element |
| `id` | String | Auto-generated | Element ID |
| `containerId` | String | `null` | Parent container ID for mounting |
| `model` | Model | `null` | Bound model instance |
| `collection` | Collection | `null` | Bound collection instance |
| `data` | Object | `{}` | Additional template data |
| `cacheTemplate` | Boolean | `true` | Cache compiled template |
| `enableTooltips` | Boolean | `false` | Auto-initialize Bootstrap tooltips |
| `app` | Object | `null` | Reference to app instance |

**Example:**
```javascript
const view = new MyView({
  template: `<div>{{title}}</div>`,
  className: 'my-custom-view',
  tagName: 'section',
  model: myModel,
  cacheTemplate: true
});
```

---

## Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| `element` | HTMLElement | View's root DOM element |
| `el` | HTMLElement | Alias for `element` |
| `template` | String \| Function | Template content |
| `model` | Model | Bound model (if any) |
| `collection` | Collection | Bound collection (if any) |
| `children` | Object | Child views by ID |
| `parent` | View | Parent view (if any) |
| `data` | Object | Additional template data |
| `mounted` | Boolean | Whether view is mounted to DOM |
| `initialized` | Boolean | Whether `onInit()` has been called |
| `events` | EventDelegate | Event delegation instance |

**Example:**
```javascript
console.log(view.element);  // <div class="mojo-view">
console.log(view.mounted);  // false (before mount)
console.log(view.children); // { 'child-1': ChildView, ... }
```

---

## Lifecycle Methods

### render(allowMount, container)

Renders the view's template and updates the DOM.

**Parameters:**
- `allowMount` (Boolean, default: `true`) - Auto-mount if not mounted
- `container` (HTMLElement, optional) - Container to mount into

**Returns:** `Promise<View>` - The view instance

**Example:**
```javascript
// Render only
await view.render(false);

// Render and auto-mount to specified container
await view.render(true, document.getElementById('app'));

// Render and auto-mount to containerId
view.containerId = 'app';
await view.render();
```

**What happens during render:**
1. Calls `onInit()` if not initialized
2. Unbinds events
3. Calls `onBeforeRender()`
4. Renders template with Mustache
5. Updates `element.innerHTML`
6. Mounts if `allowMount` is true and not already mounted
7. Renders all child views automatically
8. Calls `onAfterRender()`
9. Binds events

---

### mount(container)

Mounts the view's element to the DOM.

**Parameters:**
- `container` (HTMLElement, optional) - Container element

**Returns:** `Promise<View>` - The view instance

**Example:**
```javascript
// Mount to specific element
await view.mount(document.getElementById('app'));

// Mount to containerId
view.containerId = 'app';
await view.mount();

// Mount replaces container's children
```

**How mounting works:**
1. Calls `onBeforeMount()`
2. Finds container via `containerId` or parameter
3. Replaces container's children with view's element
4. Calls `onAfterMount()`
5. Sets `mounted = true`

---

### unmount()

Unmounts the view from the DOM.

**Returns:** `Promise<View>` - The view instance

**Example:**
```javascript
await view.unmount();
console.log(view.mounted);  // false
```

**What happens:**
1. Calls `onBeforeUnmount()`
2. Unmounts all child views
3. Removes element from DOM
4. Unbinds events
5. Calls `onAfterUnmount()`
6. Sets `mounted = false`

---

### destroy()

Destroys the view and cleans up resources.

**Returns:** `Promise<void>`

**Example:**
```javascript
await view.destroy();
// View is now destroyed, don't reuse it
```

**What happens:**
1. Unbinds all events
2. Destroys all child views recursively
3. Calls `onBeforeDestroy()`
4. Removes element from DOM
5. Calls `onAfterDestroy()`
6. Clears all references

**Important:** After destroying, create a new instance if needed.

---

## DOM Methods

### addClass(className)

Adds CSS class to view element.

```javascript
view.addClass('active');
view.addClass('highlighted');
```

---

### removeClass(className)

Removes CSS class from view element.

```javascript
view.removeClass('active');
```

---

### toggleClass(className, force)

Toggles CSS class on view element.

```javascript
view.toggleClass('active');  // Toggle
view.toggleClass('active', true);  // Force add
view.toggleClass('active', false);  // Force remove
```

---

### setClass(className)

Replaces all CSS classes.

```javascript
view.setClass('new-class another-class');
```

---

### getChildElementById(id)

Gets child element by ID (after render).

```javascript
async onAfterRender() {
  const header = this.getChildElementById('header-section');
  // Use header element
}
```

---

### getChildElement(id)

Gets child element by ID or data-container attribute (after render).

```javascript
async onAfterRender() {
  const content = this.getChildElement('content');
  // Finds <div id="content"> or <div data-container="content">
}
```

---

## Child Management Methods

### addChild(childView)

Adds a child view for lifecycle management.

**Parameters:**
- `childView` (View) - Child view instance

**Returns:** `View` - The child view

**Example:**
```javascript
async onInit() {
  const child = new ChildView({ 
    model: this.model,
    containerId: 'child-container'
  });
  this.addChild(child);
}

template = `
  <div>
    <div id="child-container"></div>
  </div>
`;
```

**Important:**
- Prefer adding children in `onInit()` for lazy loading
- Set `containerId` in child's constructor options
- Children render automatically when parent renders
- Children destroy automatically when parent destroys

See [ViewChildViews.md](./ViewChildViews.md) for complete documentation.

---

### removeChild(idOrView)

Removes and destroys a child view.

**Parameters:**
- `idOrView` (String | View) - Child ID or instance

**Example:**
```javascript
this.removeChild(this.childView);
this.removeChild('child-123');
```

---

### getChild(id)

Gets a child view by ID.

**Parameters:**
- `id` (String) - Child view ID

**Returns:** `View | undefined`

**Example:**
```javascript
const child = this.getChild('my-child-id');
if (child) {
  await child.render();
}
```

---

## Model Methods

### setModel(model)

Binds a model to the view.

**Parameters:**
- `model` (Model) - Model instance

**Returns:** `View` - The view instance

**Example:**
```javascript
const user = new User({ id: 123 });
await user.fetch();

view.setModel(user);
// View automatically re-renders when model changes
```

**What happens:**
- Unbinds previous model's change listener
- Binds to new model's `'change'` event
- Propagates model to all child views
- Triggers initial render

---

## Template Methods

### renderTemplate()

Renders the template with current context.

**Returns:** `Promise<String>` - Rendered HTML

**Example:**
```javascript
const html = await this.renderTemplate();
console.log(html);
```

---

### getTemplate()

Gets the template content (resolves if function or URL).

**Returns:** `Promise<String>` - Template content

**Example:**
```javascript
const template = await this.getTemplate();
```

---

### getPartials()

Returns partials for template rendering. Override to provide partials.

**Returns:** `Object` - Partials object

**Example:**
```javascript
getPartials() {
  return {
    'user-card': `<div>{{name}}</div>`,
    'loading': `<div class="spinner">Loading...</div>`
  };
}
```

Usage in template:
```html
{{> user-card}}
{{> loading}}
```

See [Templates.md](./Templates.md) for partials documentation.

---

## Event Methods

Views use the EventEmitter mixin:

### on(event, callback)

Listen for events.

```javascript
view.on('custom-event', (data) => {
  console.log('Event fired:', data);
});
```

---

### off(event, callback)

Remove event listener.

```javascript
view.off('custom-event', callback);
view.off('custom-event');  // Remove all
view.off();  // Remove all listeners
```

---

### emit(event, ...args)

Emit custom event.

```javascript
view.emit('data-loaded', { count: 10 });
```

---

## Utility Methods

### isMounted()

Checks if view is mounted to DOM.

```javascript
if (view.isMounted()) {
  console.log('View is visible');
}
```

---

### contains(selector)

Checks if view contains an element matching selector.

```javascript
if (view.contains('.user-info')) {
  console.log('Has user info');
}
```

---

### canRender()

Checks if view can render (not already rendering, passes throttle check).

```javascript
if (view.canRender()) {
  await view.render();
}
```

---

## Lifecycle Overview

Views follow this lifecycle:

```
Constructor → onInit → onBeforeRender → Render → onAfterRender 
→ onBeforeMount → Mount → onAfterMount → [User Interaction] 
→ onBeforeDestroy → Destroy → onAfterDestroy
```

**Key points:**
- `onInit()` called once, lazily (before first render)
- `onBeforeRender()` / `onAfterRender()` called every render
- `onBeforeMount()` / `onAfterMount()` called once when mounted
- `onBeforeDestroy()` / `onAfterDestroy()` called once when destroyed

---

## onInit() - Initialization

Called once before first render. Use for:
- Adding child views
- Loading initial data
- Setting up subscriptions

```javascript
async onInit() {
  await super.onInit();
  
  // Add child views (recommended location)
  const header = new HeaderView({ containerId: 'header' });
  this.addChild(header);
  
  // Load initial data
  if (this.model && !this.model.get('id')) {
    await this.model.fetch();
  }
  
  // Set up subscriptions
  this.on('data-changed', () => this.render());
}
```

---

## onBeforeRender() - Pre-Render

Called before each render. Use for:
- Preparing template data
- Updating computed properties
- Validating state

```javascript
async onBeforeRender() {
  await super.onBeforeRender();
  
  // Prepare computed data
  this.itemCount = this.collection.length();
  this.hasItems = this.itemCount > 0;
  
  // Update timestamp
  this.lastUpdate = new Date().toISOString();
}
```

---

## onAfterRender() - Post-Render

Called after each render. Use for:
- DOM queries (elements now exist)
- Initializing third-party plugins
- Manual DOM manipulation

```javascript
async onAfterRender() {
  await super.onAfterRender();
  
  // Query DOM elements
  const chart = this.getChildElementById('chart-container');
  if (chart) {
    this.initializeChart(chart);
  }
  
  // Initialize plugins
  if (this.enableTooltips) {
    this.initializeTooltips();
  }
}
```

---

## onBeforeMount() - Pre-Mount

Called before mounting to DOM. Use for:
- Final preparations before visibility
- Preloading resources

```javascript
async onBeforeMount() {
  await super.onBeforeMount();
  
  console.log('About to become visible');
}
```

---

## onAfterMount() - Post-Mount

Called after mounting to DOM. Use for:
- Starting animations
- Focus management
- Analytics tracking

```javascript
async onAfterMount() {
  await super.onAfterMount();
  
  // View is now visible
  console.log('View is visible in page');
  
  // Focus first input
  const firstInput = this.element.querySelector('input');
  if (firstInput) {
    firstInput.focus();
  }
  
  // Track page view
  analytics.track('view-mounted', { viewType: this.constructor.name });
}
```

---

## onBeforeDestroy() - Pre-Destroy

Called before destroying view. Use for:
- Canceling pending requests
- Removing global listeners
- Saving state

```javascript
async onBeforeDestroy() {
  await super.onBeforeDestroy();
  
  // Cancel pending requests
  if (this.model) {
    this.model.cancel();
  }
  
  // Remove global listeners
  window.removeEventListener('resize', this.handleResize);
  
  // Save state
  localStorage.setItem('viewState', JSON.stringify(this.data));
}
```

---

## onAfterDestroy() - Post-Destroy

Called after destroying view. Use for:
- Final cleanup
- Logging

```javascript
async onAfterDestroy() {
  await super.onAfterDestroy();
  
  console.log('View destroyed');
}
```

---

## Lifecycle Flow

Complete lifecycle flow with events:

```javascript
class ExampleView extends View {
  constructor(options = {}) {
    super(options);
    console.log('1. Constructor');
  }
  
  async onInit() {
    console.log('2. onInit - called once before first render');
  }
  
  async onBeforeRender() {
    console.log('3. onBeforeRender - before each render');
  }
  
  // Internal: renderTemplate() happens here
  
  async onAfterRender() {
    console.log('4. onAfterRender - after each render');
  }
  
  async onBeforeMount() {
    console.log('5. onBeforeMount - before first mount');
  }
  
  // Internal: mount() happens here
  
  async onAfterMount() {
    console.log('6. onAfterMount - after first mount');
  }
  
  // User interactions, data changes, etc.
  
  async onBeforeDestroy() {
    console.log('7. onBeforeDestroy - before destroy');
  }
  
  // Internal: destroy() cleanup happens here
  
  async onAfterDestroy() {
    console.log('8. onAfterDestroy - after destroy');
  }
}
```

---

## Binding Models

Bind a model to automatically update view on data changes:

```javascript
import User from '@models/User.js';

class UserView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div>
          <h2>{{model.name}}</h2>
          <p>{{model.email}}</p>
        </div>
      `,
      ...options
    });
  }
}

// Create view with model
const user = new User({ id: 123 });
const view = new UserView({ model: user });
await view.render();
await view.mount(document.body);

// Load data - view updates
await user.fetch();

// Change data - view updates
user.set('name', 'New Name');
```

---

## Automatic Re-rendering

Views automatically re-render when their model changes:

```javascript
const view = new ProductView({ model: product });
await view.render();
await view.mount(document.body);

// These trigger automatic re-renders:
product.set('name', 'Updated Name');
product.set({ price: 2999, stock: 10 });
await product.fetch();
await product.save();
```

**To prevent re-rendering:**
```javascript
// Use silent option
product.set('name', 'Updated', { silent: true });

// Or temporarily unbind
view.model.off('change', view._onModelChange, view);
// ... make changes ...
view.model.on('change', view._onModelChange, view);
```

---

## Accessing Model Data

Access model data in templates with `model.` prefix:

```javascript
template = `
  <div>
    <h2>{{model.name}}</h2>
    <p>{{model.email}}</p>
    <p>{{model.created_at|date}}</p>
    
    <!-- Nested data -->
    <p>{{model.address.city}}</p>
    
    <!-- With formatters -->
    <p>{{model.price|currency}}</p>
  </div>
`;
```

---

## Model Change Events

Listen to specific model changes:

```javascript
async onInit() {
  await super.onInit();
  
  if (this.model) {
    // Listen to specific field changes
    this.model.on('change:status', (newStatus) => {
      console.log('Status changed to:', newStatus);
      this.handleStatusChange(newStatus);
    });
    
    // Listen to any change
    this.model.on('change', () => {
      console.log('Model changed');
    });
  }
}

handleStatusChange(status) {
  if (status === 'completed') {
    this.addClass('completed');
  }
}
```

---

## Binding Collections

Bind collections to iterate in templates:

```javascript
import UserCollection from '@collections/UserCollection.js';

class UserListView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="user-list">
          <h2>Users ({{collection.length}})</h2>
          {{#collection.models}}
            <div class="user">
              <span>{{.name}}</span>
              <span>{{.email}}</span>
            </div>
          {{/collection.models}}
        </div>
      `,
      ...options
    });
  }
}

// Usage
const users = new UserCollection();
const view = new UserListView({ collection: users });
await view.render();
await view.mount(document.body);

// Fetch data
await users.fetch();  // View auto-updates!
```

---

## Iterating Collections

Collections provide `models` array for iteration:

```javascript
template = `
  {{#collection.models}}
    <div class="item">
      <h3>{{.name}}</h3>
      <p>{{.description}}</p>
      <p>{{.price|currency}}</p>
    </div>
  {{/collection.models}}
  
  {{^collection.models}}
    <p>No items found</p>
  {{/collection.models}}
`;
```

**Inside iteration:**
- `{{.property}}` - Access model property
- `{{.}}` - Current model (if needed)

---

## Collection Events

Listen to collection changes:

```javascript
async onInit() {
  await super.onInit();
  
  if (this.collection) {
    this.collection.on('add', ({ models }) => {
      console.log('Added', models.length, 'items');
    });
    
    this.collection.on('remove', ({ models }) => {
      console.log('Removed', models.length, 'items');
    });
    
    this.collection.on('update', () => {
      console.log('Collection updated');
      // Auto re-render happens automatically
    });
  }
}
```

---

## Template Design

**Best practices:**

1. **Keep templates simple** - Logic in view, not template
2. **Use model data directly** - `{{model.name}}` not `{{getName}}`
3. **Use formatters for display** - `{{model.price|currency}}`
4. **Inline templates preferred** - Keep with view definition

```javascript
// ✅ Good
class UserView extends View {
  template = `
    <div>
      <h2>{{model.name}}</h2>
      <p>{{model.email}}</p>
      <p>{{model.created_at|date}}</p>
    </div>
  `;
}

// ❌ Avoid complex logic in templates
template = `
  {{#if user.age > 18 && user.verified}}...{{/if}}
`;

// ✅ Better: Use view method
template = `
  {{#canAccessContent}}...{{/canAccessContent}}
`;

canAccessContent() {
  return this.model.get('age') > 18 && this.model.get('verified');
}
```

---

## Lifecycle Hook Usage

**Best practices:**

- **onInit** - Add children, load data (once)
- **onBeforeRender** - Update computed properties (every render)
- **onAfterRender** - Query DOM, initialize plugins (every render)
- **onAfterMount** - Focus, animations (once when visible)
- **onBeforeDestroy** - Cancel requests, cleanup (once)

```javascript
// ✅ Good pattern
async onInit() {
  // One-time setup
  this.addChild(new HeaderView({ containerId: 'header' }));
}

async onAfterRender() {
  // Every render - DOM exists now
  const chart = this.getChildElementById('chart');
  if (chart) this.updateChart();
}

// ❌ Avoid
async onInit() {
  const element = this.getChildElementById('test');  // Won't work! Not rendered yet
}
```

---

## Performance Tips

1. **Use `onInit()` for lazy loading**
   ```javascript
   async onInit() {
     // Children only created when view renders
     this.addChild(new ExpensiveView({ containerId: 'container' }));
   }
   ```

2. **Cache computed values**
   ```javascript
   async onBeforeRender() {
     // Compute once per render
     this.userCount = this.collection.length();
     this.hasUsers = this.userCount > 0;
   }
   ```

3. **Use silent updates for bulk changes**
   ```javascript
   model.set({ field1: 'a', field2: 'b', field3: 'c' }, { silent: true });
   view.render();  // Single render instead of 3
   ```

4. **Debounce rapid renders**
   ```javascript
   constructor(options = {}) {
     super({
       renderCooldown: 100,  // Min 100ms between renders
       ...options
     });
   }
   ```

---

## Memory Management

Views automatically clean up resources:

```javascript
// ✅ Automatic cleanup
await view.destroy();
// - Unbinds all events
// - Destroys child views
// - Removes from DOM
// - Clears model listeners

// ✅ Manual cleanup in onBeforeDestroy if needed
async onBeforeDestroy() {
  // Cancel pending operations
  if (this.pendingRequest) {
    this.pendingRequest.abort();
  }
  
  // Remove global listeners
  window.removeEventListener('resize', this.handleResize);
  
  // Clear timers
  if (this.timer) {
    clearInterval(this.timer);
  }
}
```

---

## Common Issues

### View doesn't render

**Check:**
- Template is defined (not null/undefined)
- View is mounted to DOM
- No errors in console

```javascript
console.log('Template:', view.template);
console.log('Mounted:', view.isMounted());
console.log('Element:', view.element);
```

---

### Template variables don't show

**Check:**
- Property exists on view instance
- Model is bound if using `{{model.prop}}`
- Property name matches exactly (case-sensitive)

```javascript
console.log('View data:', view);
console.log('Model:', view.model);
console.log('Property:', view.propertyName);
```

---

### Events don't fire

**Check:**
- `data-action` attribute present
- Handler method name matches convention
- View is rendered and mounted
- No errors in handler

```javascript
console.log('Has data-action:', button.dataset.action);
console.log('Handler exists:', typeof view.onActionSave);
```

---

### Memory leaks

**Check:**
- Views are destroyed when done
- Event listeners removed
- Timers cleared
- Global listeners removed in `onBeforeDestroy`

```javascript
async onBeforeDestroy() {
  // Clean up everything
  this.model?.off('change', this._onModelChange);
  window.removeEventListener('resize', this.handleResize);
  clearInterval(this.timer);
}
```

---

## Debugging Techniques

Enable debug logging:

```javascript
class DebugView extends View {
  constructor(options = {}) {
    super({ debug: true, ...options });
  }
  
  async onInit() {
    console.log('onInit called');
    await super.onInit();
  }
  
  async onAfterRender() {
    console.log('Rendered, element:', this.element);
    console.log('Mounted:', this.isMounted());
    await super.onAfterRender();
  }
}

// Inspect view state
console.log('View:', view);
console.log('Children:', view.children);
console.log('Model:', view.model?.toJSON());
console.log('Template:', view.template);
```

---

## Related Documentation

- **[ViewChildViews.md](./ViewChildViews.md)** - Child view patterns and composition
- **[Templates.md](./Templates.md)** - Mustache syntax, formatters, and best practices
- **[Events.md](./Events.md)** - EventDelegate and convention-based event handling
- **[AdvancedViews.md](./AdvancedViews.md)** - Custom renders, complex patterns, optimization
- **[Model.md](./Model.md)** - Model data management
- **[Collection.md](./Collection.md)** - Collection data management

---

## Summary

The View class provides a robust foundation for building UI components in MOJO:

- **Template Context** - View instance is the Mustache context
- **Lifecycle Hooks** - Customize behavior at each stage
- **Model Binding** - Automatic updates on data changes
- **Event Delegation** - Convention-based handlers
- **Child Composition** - Build complex UIs from smaller views
- **Automatic Cleanup** - Memory management handled for you

**Key Patterns:**
1. Define inline templates in constructor
2. Add child views in `onInit()`
3. Use model data directly in templates with `{{model.property}}`
4. Implement `onAction{Name}()` for event handling
5. Override lifecycle hooks for custom behavior
6. Let parent manage child lifecycle

For child view patterns, see [ViewChildViews.md](./ViewChildViews.md).  
For template syntax and formatters, see [Templates.md](./Templates.md).  
For event handling details, see [Events.md](./Events.md).  
For advanced patterns, see [AdvancedViews.md](./AdvancedViews.md).
