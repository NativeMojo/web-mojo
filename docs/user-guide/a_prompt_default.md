# MOJO Framework - AI Development Context

You are working on the **MOJO Framework**, a lightweight, modern ES6 JavaScript UI framework built on Bootstrap 5. This document provides complete context for AI-assisted development.

## 🎯 Project Overview

MOJO is a component-based JavaScript framework that follows MVC architecture patterns with:
- Clean folder structures and modern ES6+ code
- Bootstrap 5 native integration
- RESTful API integration capabilities
- Advanced navigation system with SEO-friendly routing
- Component-based development with reusable UI components

**Current Version**: 2.0.0
**Status**: Phase 1 & 2 Complete, Phase 3 in development
**Router Default**: Param mode for static serving compatibility

## 📋 Architecture & Design Principles

### Core Principles
- **Simplicity**: Clean, intuitive API with minimal boilerplate
- **Modularity**: Component-based architecture with clear separation
- **Modern**: ES6+ features, async/await, modules, template literals
- **Bootstrap 5 Native**: Full integration, no custom CSS framework
- **Convention over Configuration**: Sensible defaults with customization
- **Utility over Decoration**: Clean, functional interfaces
- **Information Density**: Compact layouts for business applications

### MVC Structure
```
src/
├── core/                    # Core framework classes
│   ├── View.js             # Base view component with lifecycle
│   ├── Page.js             # Page component with routing
│   ├── Router.js           # Client-side router with history API
│   └── ...
├── components/             # Reusable UI components
│   ├── TopNav.js          # Bootstrap navbar component
│   ├── Sidebar.js         # Collapsible sidebar navigation
│   ├── MainContent.js     # Content wrapper for layouts
│   ├── Table.js           # Advanced data table
│   └── FormBuilder.js     # Dynamic form generation
└── utils/                 # Utilities and helpers
```

## 🛣️ Navigation System (Critical)

MOJO uses a **dual-approach navigation system** - this is fundamental to understand:

### 1. Primary: href-based Navigation (SEO-Friendly)
```html
<!-- Standard HTML links with automatic router interception -->
<a href="/">Home</a>
<a href="/users/123">User Profile</a>
<a href="/dashboard?tab=analytics">Dashboard</a>
```
**Benefits**: Copy-link support, SEO crawlable, browser features work, accessibility

### 2. Enhanced: data-page Navigation (With Parameters)
```html
<!-- Page name routing with JSON parameters -->
<button data-page="settings">Settings</button>
<button data-page="user" data-params='{"id": 123, "tab": "profile"}'>User Profile</button>
```
**Benefits**: Semantic routing, rich parameter passing, flexible navigation

### 3. External Links
```html
<!-- Bypass router interception -->
<a href="https://external.com" data-external>External Site</a>
<a href="../parent" data-external>Parent Directory</a>
```

### Router Integration
- Router automatically made globally accessible: `window.MOJO.router`
- **Default param mode**: Uses `?page=pagename` URLs for static serving without server config
- View class automatically handles all navigation - no manual event handlers needed
- Active states updated via router guards: `router.addGuard('afterEach', callback)`
- Page names auto-registered for data-page routing
- Page parameter automatically filtered from route queries

**NEVER use legacy patterns**: `<a href="#" data-action="navigate" data-route="/path">`

## 🏗️ Component Structure

### View (Base Class)
```javascript
class MyView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',           // HTML element type
      className: 'my-view',     // CSS classes
      template: '...',          // Mustache template
      data: { key: 'value' },   // Template data
      ...options
    });
  }

  // Lifecycle methods (all async)
  async onInit() {}           // After construction
  async onBeforeRender() {}   // Before template render
  async onAfterRender() {}    // After template render
  async onBeforeMount() {}    // Before DOM insertion
  async onAfterMount() {}     // After DOM insertion
  async onBeforeDestroy() {}  // Before cleanup

  // Action handlers (data-action="actionName")
  async onActionActionName(event, element) {}
}
```

### Page (Extends View)
```javascript
class MyPage extends Page {
  constructor() {
    super({
      page_name: 'MyPage',     // Used for data-page="mypage"
      route: '/my-page/:id?',  // URL route pattern
      title: 'Page Title',     // Document title
      template: '...'          // Page template
    });
  }

  // Handle route parameters (URL + data-page params)
  on_params(params = {}, query = {}) {
    // params: route params + data-page JSON params
    // query: URL query string parameters
  }
}
```

### Component Development
```javascript
// Components auto-handle navigation
class MyComponent extends View {
  async getTemplate() {
    return `
      <nav class="component-nav">
        <!-- href navigation (primary) -->
        <a href="/dashboard">Dashboard</a>

        <!-- data-page navigation (enhanced) -->
        <button data-page="settings" data-params='{"tab": "account"}'>Settings</button>

        <!-- External links -->
        <a href="https://docs.com" data-external>Documentation</a>
      </nav>
    `;
  }
}
```

## 📊 Current Implementation Status

### ✅ Phase 1: Core Architecture (Complete)
- View hierarchy system with parent-child relationships
- Page components with routing capabilities
- Component lifecycle management (init → render → mount → destroy)
- Event system (EventBus + DOM actions)
- Modern href-based navigation system with data-page enhancement
- Template rendering with Mustache.js (always use src/utils/mustache.js)
- Development tools and debugging

### ✅ Phase 2: Data Layer (Complete)
- RestModel for API integration with validation
- DataList for collection management
- Search, filtering, and sorting capabilities
- Real-time data updates and event-driven UI

### ✅ Navigation Components (Complete)
- TopNav: Responsive Bootstrap navbar
- Sidebar: Collapsible navigation with mobile support
- MainContent: Layout wrapper with sidebar integration

### 🚧 Phase 3: Advanced Components (In Development)
- Enhanced Table component with advanced features
- FormBuilder with dynamic validation
- Chart integration
- Authentication system

## 🎨 UI/UX Guidelines

### Bootstrap 5 Integration
- Use `btn btn-sm` for compact buttons
- Use `table-sm table-hover table-bordered` for tables
- Use `form-control form-control-sm` for inputs
- Prefer `mb-2` for spacing (compact layouts)
- Use Bootstrap icons: `bi bi-icon-name`

### Design Patterns
```html
<!-- Compact, information-dense layouts -->
<div class="card mb-2">
  <div class="card-body p-2">
    <!-- Content with minimal padding -->
  </div>
</div>

<!-- Standard navigation -->
<nav class="navbar navbar-expand-lg navbar-dark bg-primary">
  <!-- TopNav component handles this -->
</nav>

<!-- Data tables -->
<table class="table table-sm table-hover table-bordered">
  <!-- Compact, functional tables -->
</table>
```

### Avoid
- Custom CSS frameworks over Bootstrap
- Excessive animations or decorations
- Large paddings or excessive whitespace
- Hash-based navigation (`href="#"`)
- Manual navigation event handlers

## 🔧 Development Workflow

### File Organization
```
web-mojo/
├── docs/                   # All documentation (organized)
├── src/                    # Framework source
├── examples/              # Interactive examples
├── test/                  # Testing suite
├── diagnostics/           # Development scripts
└── dist/                  # Built files
```

### Development Commands
```bash
npm run dev                # Vite development server (primary)
npm run build             # Production build
npm test                  # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
```

IMPORTANT: our development environment is always running on localhost:3000.

### Code Style
- **ES6+ modern JavaScript**: Use async/await, modules, destructuring
- **Template literals**: For multi-line templates
- **Arrow functions**: For callbacks and short functions
- **Async/await**: For all asynchronous operations
- **Proper error handling**: Try/catch blocks for async operations

### Router Modes
- **Param mode (default)**: `?page=pagename` - Works without server config, SEO-friendly
- **History mode**: `/path/name` - Clean URLs, requires server configuration
- **Hash mode**: `#/path/name` - Legacy compatibility, works everywhere

### Example Patterns
```javascript
// Modern ES6+ component
class ModernComponent extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="modern-component">
          <h2>{{title}}</h2>
          <nav class="component-nav">
            {{#navItems}}
            <a href="{{route}}" class="nav-link">{{text}}</a>
            {{/navItems}}
          </nav>
        </div>
      `,
      data: {
        title: 'Component Title',
        navItems: [
          { route: '/dashboard', text: 'Dashboard' },
          { route: '/settings', text: 'Settings' }
        ]
      },
      ...options
    });
  }

  async onAfterMount() {
    // Setup component after DOM insertion
    try {
      await this.initializeFeatures();
    } catch (error) {
      console.error('Component initialization failed:', error);
      this.showError('Failed to initialize component');
    }
  }

  async initializeFeatures() {
    // Component-specific initialization
  }
}
```

## 🧪 Testing Approach

- **Unit tests**: Individual component testing
- **Integration tests**: Component interaction testing
- **Test utilities**: Helper functions in `test/utils/`
- **Test files**: `ComponentName.test.js` pattern
- **Coverage**: Aim for comprehensive test coverage

## 📚 Documentation Structure

```
docs/
├── user-guide/           # End-user documentation
├── components/          # Component API documentation
├── development/         # Developer setup and contribution
├── testing/            # Testing guides and references
├── phase-history/      # Complete development timeline
└── examples/           # Example documentation
```

## 🚀 Key Development Guidelines

### Router Configuration
1. **Param mode is default**: Perfect for static serving and GitHub Pages
2. **No server configuration needed**: Works with any static file server
3. **SEO-friendly**: Search engines crawl query parameters
4. **Professional URLs**: `?page=dashboard&view=analytics` looks clean

### Navigation Development
1. **Always use href as primary navigation method**
2. **Use data-page for enhanced navigation with parameters**
3. **Make router globally accessible**: `window.MOJO.router = router`
4. **Use router guards for active state management**
5. **Never create manual navigation event handlers**

### Component Development
1. **Extend View or Page classes**
2. **Use proper lifecycle methods**
3. **Follow MVC separation of concerns**
4. **Use Bootstrap 5 classes extensively**
5. **Keep components focused and reusable**

### Code Quality
1. **Use modern ES6+ syntax consistently**
2. **Follow async/await patterns**
3. **Implement proper error handling**
4. **Write comprehensive tests**
5. **Document all new components**

### Build Integration
- **Vite for development** (primary build tool)
- **ES6 modules throughout**
- **Bootstrap 5 integration**
- **Mustache.js templating**

## 🎯 Current Focus Areas

1. **Navigation System**: Ensure all examples use modern href + data-page patterns
2. **Component Library**: Expand reusable component collection
3. **Documentation**: Keep all docs updated and comprehensive
4. **Testing**: Maintain high test coverage
5. **Examples**: Clean, educational example applications

## 🔍 When Adding New Features

1. **Check existing patterns** in similar components
2. **Follow the navigation system** (href + data-page)
3. **Use Bootstrap 5 classes** extensively
4. **Write tests** for new functionality
5. **Update documentation** in appropriate docs section
6. **Add examples** demonstrating usage
7. Make sure examples breakout the logic into separate files, html, css, and js.  And make sure when building the examples to use the framework as much as possible to build the UI components.  And do not create duplicate examples that just clutter up the project, when possible update an existing example instead of creating a new one.
8. **Follow the established architecture**

## 💡 Implementation Notes

- The framework prioritizes **developer experience** and **maintainability**
- **Bootstrap 5 is the UI foundation** - don't fight it, embrace it
- **Param mode routing is optimized for static serving** - deploy anywhere without server config
- **The navigation system is modern and SEO-friendly** - this is a key differentiator
- **Page parameters are automatically filtered** - clean separation of routing and business logic
- **Components should be self-contained** and reusable
- **Documentation is comprehensive** - keep it updated
- **Examples demonstrate real usage** - not toy implementations

---

**Remember**: MOJO is designed for building professional business applications with clean, functional interfaces. Prioritize utility over decoration, information density over whitespace, and modern web standards over legacy patterns.

IMPORTANT: Keep the root directory clean and organized, use the sub folders.


IMPORTANT:
- Keep examples simple and focused
- Check existing examples before creating new ones
- Always use framework components (TopNav, Sidebar, MainContent) for layouts
- Avoid duplicating existing functionality
- When in doubt, enhance existing examples rather than creating new ones
