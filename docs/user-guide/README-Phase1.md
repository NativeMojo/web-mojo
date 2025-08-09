# MOJO Framework v2.0.0 - Phase 1: Core Architecture & View System

🔥 A lightweight JavaScript framework for building data-driven web applications

## Phase 1 Overview

Phase 1 establishes the foundational architecture of MOJO with a robust View hierarchy system, Page components with routing capabilities, comprehensive lifecycle management, and a powerful event system.

### ✅ What's Implemented in Phase 1

- **View Base Class**: Hierarchical component system with parent-child relationships
- **Page System**: Specialized views with routing capabilities and URL parameter handling
- **Component Lifecycle**: Complete lifecycle management (init → render → mount → destroy)
- **Event System**: Custom EventBus and DOM action handling
- **Template Engine**: Mustache.js integration for dynamic content rendering
- **Development Tools**: Debug panel and developer utilities
- **Build System**: Webpack-based development and production builds

### 🚧 Coming in Future Phases

- **Phase 2**: Data Layer (RestModel, DataList, REST interface)
- **Phase 3**: UI Components (Table, FormBuilder, form controls)
- **Phase 4**: Advanced Features (Charts, Authentication, Router, Filters/Pipes)

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd web-mojo

# Install dependencies
npm install

# Start development server
npm run dev
```

### Basic Usage

```javascript
import MOJO, { View, Page } from './src/mojo.js';

// Create MOJO instance
const app = MOJO.create({
  container: '#app',
  debug: true
});

// Create a simple view
class MyView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="my-view">
          <h2>{{title}}</h2>
          <button data-action="sayHello">Say Hello</button>
        </div>
      `,
      data: { title: 'My View' },
      ...options
    });
  }

  async onActionSayHello() {
    this.showSuccess('Hello from MyView!');
  }
}

// Create and render view
const myView = new MyView();
myView.render('#container');
```

## Core Architecture

### View Class

The View class is the foundation of all visual components in MOJO. It provides:

- **Hierarchical Structure**: Parent-child relationships
- **Lifecycle Management**: Predictable component lifecycle
- **Template Rendering**: Mustache.js-based templating
- **Event Handling**: Custom events and DOM action dispatch
- **State Management**: Data and state management

```javascript
class MyComponent extends View {
  constructor(options = {}) {
    super({
      template: './templates/my-component.mustache', // External template
      // OR inline template:
      template: '<div>{{content}}</div>',
      
      data: { content: 'Hello World' },
      className: 'my-component',
      ...options
    });
  }

  // Lifecycle hooks
  onInit() {
    console.log('Component initialized');
  }

  async onAfterRender() {
    console.log('Component rendered');
  }

  // Action handlers
  async onActionClick() {
    this.updateData({ content: 'Clicked!' }, true);
  }
}
```

### Page Class

Pages extend Views with routing capabilities:

```javascript
class HomePage extends Page {
  constructor(options = {}) {
    super({
      page_name: 'home',
      route: '/',
      template: '<div>Welcome to {{page_name}}</div>',
      ...options
    });
  }

  // Design doc lifecycle methods
  on_init() {
    console.log('Page initializing');
  }

  on_params(params, query) {
    console.log('Route params:', params, query);
  }

  // Design doc action handlers
  async on_action_hello() {
    this.showSuccess('Hello from ' + this.page_name);
  }
}
```

### Event System

MOJO includes a powerful EventBus for global communication:

```javascript
// Get global event bus
const eventBus = window.MOJO.eventBus;

// Listen for events
eventBus.on('user:login', (userData) => {
  console.log('User logged in:', userData);
});

// Emit events
eventBus.emit('user:login', { id: 123, name: 'John' });

// One-time listeners
eventBus.once('app:ready', () => {
  console.log('App is ready!');
});
```

## Component Lifecycle

Every View and Page follows a predictable lifecycle:

1. **Initialize** (`onInit()`)
2. **Render** (`onBeforeRender()` → `render()` → `onAfterRender()`)
3. **Mount** (`onBeforeMount()` → `mount()` → `onAfterMount()`)
4. **Update** (data changes trigger re-render)
5. **Destroy** (`onBeforeDestroy()` → `destroy()` → `onAfterDestroy()`)

```javascript
class LifecycleExample extends View {
  onInit() {
    // Component initialized, set up initial state
  }

  async onBeforeRender() {
    // Called before each render, good for data preparation
  }

  async onAfterRender() {
    // Called after rendering, DOM is available
  }

  async onBeforeMount() {
    // Called before mounting to DOM
  }

  async onAfterMount() {
    // Called after mounting, component is live
  }

  async onBeforeDestroy() {
    // Cleanup before destruction
    clearInterval(this.timer);
  }
}
```

## Hierarchical Views

Views can contain child views, creating a component tree:

```javascript
class ParentView extends View {
  constructor() {
    super({
      template: '<div class="parent">{{children}}</div>'
    });

    // Add child views
    const child1 = new View({
      template: '<div class="child">Child 1</div>'
    });
    
    const child2 = new View({
      template: '<div class="child">Child 2</div>'
    });

    this.addChild(child1, 'child1');
    this.addChild(child2, 'child2');
  }

  someMethod() {
    // Access children
    const child = this.getChild('child1');
    
    // Get all children
    const allChildren = this.getChildren();
    
    // Remove child
    this.removeChild('child2');
  }
}
```

## Action Handling

MOJO provides automatic DOM action handling:

```html
<!-- In template -->
<button data-action="save">Save</button>
<form data-action="submit">
  <input type="text" name="email">
  <button type="submit">Submit</button>
</form>
```

```javascript
class ActionExample extends View {
  // Method naming convention: onAction + PascalCase action name
  async onActionSave() {
    console.log('Save button clicked');
  }

  async onActionSubmit(event, element) {
    event.preventDefault();
    const formData = new FormData(element);
    console.log('Form submitted:', formData.get('email'));
  }
}
```

## Navigation System

MOJO provides a comprehensive navigation system that supports modern, SEO-friendly routing with two complementary approaches:

### href Navigation (Primary Approach)

Use standard `href` attributes for clean, SEO-friendly navigation:

```html
<!-- Clean, semantic navigation -->
<a href="/">Home</a>
<a href="/about">About Us</a>
<a href="/users/123">User Profile</a>
<a href="/dashboard?tab=analytics">Dashboard</a>
```

**Benefits:**
- ✅ **Copy link support** - Right-click → copy link provides real URLs
- ✅ **SEO friendly** - Search engines crawl proper navigation structure
- ✅ **Browser features** - Ctrl+click, middle-click work as expected
- ✅ **Accessibility** - Screen readers understand semantic navigation
- ✅ **Progressive enhancement** - Works without JavaScript

### data-page Navigation (Enhanced)

Use `data-page` for page-name routing with rich parameter passing:

```html
<!-- Navigate by page name -->
<button data-page="settings">Open Settings</button>

<!-- Navigate with parameters -->
<button data-page="user" data-params='{"id": 123, "tab": "profile"}'>
  User Profile
</button>

<!-- Complex parameter objects -->
<div data-page="dashboard" 
     data-params='{"filters": {"status": "active"}, "view": "grid"}' 
     class="nav-card">
  Active Dashboard
</div>
```

**Benefits:**
- ✅ **Page name routing** - Navigate by semantic names, not URL structure
- ✅ **Parameter passing** - Rich data via JSON `data-params`
- ✅ **Dynamic routing** - Flexible navigation independent of URL patterns
- ✅ **Component integration** - Works seamlessly with any HTML element

### External Links

For external navigation, add `data-external` to prevent router interception:

```html
<!-- External sites -->
<a href="https://docs.example.com" data-external>Documentation</a>

<!-- Parent directories -->
<a href="../" data-external>Back to Examples</a>

<!-- Email and phone -->
<a href="mailto:support@example.com">Email Support</a>
<a href="tel:+1234567890">Call Support</a>
```

### Navigation Integration

The View class automatically handles navigation - no manual event handlers needed:

```javascript
class MyPage extends Page {
  constructor() {
    super({
      page_name: 'MyPage',
      route: '/my-page/:id?'
    });
  }

  // Handle both URL params and data-page params
  on_params(params = {}, query = {}) {
    console.log('URL params:', params);     // From route: /my-page/123
    console.log('Query params:', query);    // From ?tab=settings
    console.log('Page params:', params);    // From data-params JSON
    
    if (params.id) this.loadUser(params.id);
    if (params.tab) this.showTab(params.tab);
  }
}
```

### Router Setup

Make the router globally accessible for navigation:

```javascript
// In your app initialization
this.router = new Router({
  mode: 'history',
  base: '/my-app',
  container: '#app'
});

// Make globally accessible
window.MOJO = window.MOJO || {};
window.MOJO.router = this.router;

// Auto-update navigation states
this.router.addGuard('afterEach', (route) => {
  this.updateActiveNavigation(route.path);
});
```

## Development Tools

Phase 1 includes comprehensive development tools:

### Debug Panel

Enable debug mode to see the debug panel:

```javascript
const app = MOJO.create({
  debug: true
});
```

### Developer Console

```javascript
// Access dev tools in browser console
MOJODevTools.views()      // List all registered views
MOJODevTools.pages()      // List all registered pages
MOJODevTools.hierarchy()  // Show view hierarchy
MOJODevTools.stats()      // Framework statistics
```

### Event Bus Debugging

```javascript
// Enable event debugging
window.MOJO.eventBus.debug(true);

// Monitor specific events
window.MOJO.eventBus.on('*', (data, event) => {
  console.log(`Event: ${event}`, data);
});
```

## Configuration

MOJO can be configured via `app.json` or inline:

```json
{
  "container": "#app",
  "debug": true,
  "autoStart": true,
  "theme": {
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d"
  },
  "eventBus": {
    "maxListeners": 100
  }
}
```

## Build System

MOJO uses Webpack for building:

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Build and watch for changes
npm run build:watch

# Lint code
npm run lint

# Run tests
npm run test
```

## Project Structure

```
web-mojo/
├── src/
│   ├── core/           # Core framework classes
│   │   ├── View.js     # Base View class
│   │   └── Page.js     # Page class
│   ├── utils/          # Utilities
│   │   └── EventBus.js # Event system
│   ├── mojo.js         # Main framework
│   ├── app.js          # Example application
│   └── index.html      # Example HTML
├── examples/           # Example applications
├── app.json           # Configuration
├── package.json       # Dependencies
├── webpack.config.js  # Build configuration
└── README-Phase1.md   # This file
```

## Examples

Check out the included examples:

1. **Basic Example** (`src/app.js`): Demonstrates core features
2. **View Hierarchy**: Parent-child relationships
3. **Page Navigation**: Multi-page application
4. **Event System**: Global event communication
5. **Lifecycle Management**: Component lifecycle hooks

Run the examples:

```bash
npm run dev
# Open http://localhost:3000
```

## API Reference

### MOJO Class

```javascript
// Create instance
const mojo = MOJO.create(config);
const mojo = new MOJO(config);

// Registration
mojo.registerView('myView', MyViewClass);
mojo.registerPage('myPage', MyPageClass);

// Creation
const view = mojo.createView('myView', options);
const page = mojo.createPage('myPage', options);

// Control
mojo.start();
mojo.shutdown();
```

### View Class

```javascript
// Constructor
const view = new View(options);

// Lifecycle
await view.render(container);
await view.mount();
await view.unmount();
await view.destroy();

// Hierarchy
view.addChild(childView, 'key');
view.removeChild('key');
view.getChild('key');
view.getChildren();

// Data
view.updateData(newData, rerender);
view.updateState(newState, rerender);

// Events
view.on('event', callback);
view.emit('event', data);
view.off('event', callback);
```

### Page Class

```javascript
// Constructor
const page = new Page(options);

// Navigation
page.navigate('/path', params, options);
page.goBack();
page.goForward();

// Route matching
const match = page.matchRoute('/current/path');

// Design doc methods
page.on_init();
page.on_params(params, query);
page.on_action_hello();
```

### EventBus Class

```javascript
const eventBus = new EventBus();

// Listeners
eventBus.on('event', callback);
eventBus.once('event', callback);
eventBus.off('event', callback);

// Emit
eventBus.emit('event', data);
await eventBus.emitAsync('event', data);

// Utilities
eventBus.listenerCount('event');
eventBus.eventNames();
eventBus.removeAllListeners();
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## Roadmap

### Phase 2: Data Layer (Next)
- RestModel class for API interaction
- DataList for collections
- REST interface with interceptors
- Data binding and validation

### Phase 3: UI Components
- Table component with sorting/filtering
- FormBuilder with dynamic fields
- Basic form controls
- Component library

### Phase 4: Advanced Features
- Chart components (Chart.js integration)
- Authentication system
- Advanced routing
- Filters and pipes
- Portal layout components

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](./issues)
- 💬 [Discussions](./discussions)
- ✨ [Examples](./examples/)

---

**MOJO Framework v2.0.0 - Phase 1**  
Built with ❤️ and modern JavaScript