# MOJO Framework - Developer Documentation

## Overview

MOJO is a lightweight, component-based JavaScript framework designed for building modern web applications with clean architecture and powerful data management. It provides a structured approach to building UIs with automatic event handling, data binding, and component lifecycle management.

## Core Philosophy

- **Component-Based**: Everything is a component with clear responsibilities
- **Event-Driven**: Clean event system with automatic delegation and bubbling
- **Data-Centric**: Models and Collections provide structured data management
- **Convention over Configuration**: Sensible defaults with flexibility when needed
- **No Build Step Required**: Works directly in browsers with ES6 modules

## Architecture Overview

```
WebApp (application container)
├── Router (handles navigation)
├── Pages (route-level components)
│   ├── Views (reusable UI components)
│   │   ├── Table (data display)
│   │   ├── Dialog (modal interactions)
│   │   ├── Forms (data input)
│   │   └── Custom Views
│   └── TablePage (specialized page with Table)
└── Data Layer
    ├── Models (individual records)
    └── Collections (arrays of models)
```

## Core Components

### [WebApp](./WebApp.md) - Application Container
- Main application class that orchestrates everything
- Handles routing, page management, and global state
- Provides error handling and notifications
- Manages component registration and lifecycle

### [View](./View.md) - Base UI Component
- Foundation for all UI components
- Automatic event handling with delegation
- Template rendering with Mustache
- Lifecycle hooks (onInit, onRender, onMount, etc.)
- Parent-child relationship management

### [Page](./Page.md) - Route-Level Components
- Extends View with routing capabilities
- URL parameter handling
- Navigation management
- Page-specific metadata and lifecycle

### [Table](./Table.md) - Data Display Component
- Advanced data table with sorting, filtering, pagination
- REST API integration via Collections
- Customizable columns and actions
- Built-in search and filtering

### [TablePage](./TablePage.md) - Complete Table Solution
- Combines Table with Page for full-page data management
- URL synchronization for filters and pagination
- Toolbar actions (add, export, refresh)
- Loading states and error handling

### [Model](./Model.md) - Data Records
- Represents individual data records
- REST API integration (CRUD operations)
- Data validation and transformation
- Event emission on changes

### [Collection](./Collection.md) - Data Arrays
- Manages arrays of Models
- REST API integration with pagination
- Filtering, sorting, and searching
- Event emission on collection changes

### [Dialog](./Dialog.md) - Modal Interactions
- Modal dialogs for user interactions
- Form dialogs for data input/editing
- Confirmation dialogs for destructive actions
- Custom content support with full View lifecycle

## Event System

MOJO uses a sophisticated event delegation system that prevents duplicate events and enables clean parent-child communication.

### Two Types of Actions

#### `data-action` - For Click Events
```html
<button data-action="save">Save</button>
<a data-action="delete" data-id="123">Delete</a>
```

#### `data-change-action` - For Form Changes
```html
<select data-change-action="apply-filter">
<input data-change-action="search" data-filter="name">
```

### Event Flow
1. **Child components handle events first** (DOM event bubbling)
2. **If child handles event** → `event.stopPropagation()` → parent doesn't see it
3. **If child doesn't handle** → event bubbles to parent for fallback handling

### Action Handler Methods
Views automatically call methods based on action names:

```javascript
class MyView extends View {
  // Handles data-action="save" and data-change-action="save"
  async handleActionSave(event, element) {
    // Your save logic
  }
  
  // Alternative naming (legacy)
  async onActionSave(event, element) {
    // Also works
  }
  
  // Fallback for unhandled actions
  async onActionDefault(action, event, element) {
    // Handle any action not caught above
  }
}
```

## Quick Start

### 1. Basic View
```javascript
import View from './core/View.js';

class MyView extends View {
  constructor(options = {}) {
    super({
      template: '<button data-action="click-me">Click Me!</button>',
      ...options
    });
  }
  
  async handleActionClickMe(event, element) {
    alert('Button clicked!');
  }
}
```

### 2. Simple Page
```javascript
import Page from './core/Page.js';

class HomePage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'Home',
      route: '/',
      template: '<h1>Welcome to {{title}}</h1>',
      ...options
    });
  }
  
  async getViewData() {
    return { title: 'My App' };
  }
}
```

### 3. Data-Driven Table
```javascript
import TablePage from './components/TablePage.js';
import UserCollection from './collections/UserCollection.js';

class UsersPage extends TablePage {
  constructor(options = {}) {
    super({
      pageName: 'Users',
      route: '/users',
      Collection: UserCollection,
      columns: [
        { key: 'name', title: 'Name', sortable: true },
        { key: 'email', title: 'Email', sortable: true },
        { key: 'created_at', title: 'Created', sortable: true }
      ],
      ...options
    });
  }
}
```

## File Structure

```
src/
├── app/
│   └── WebApp.js        # Application container
├── core/
│   ├── View.js          # Base component
│   ├── Page.js          # Route-level component
│   ├── Model.js         # Data record
│   ├── Collection.js    # Data array
│   └── Router.js        # Navigation
├── components/
│   ├── Table.js         # Data table
│   ├── TablePage.js     # Table + Page
│   ├── Dialog.js        # Modal dialogs
│   └── ...              # Other components
├── models/
│   ├── User.js          # User model
│   └── ...              # Other models
└── collections/
    ├── UserCollection.js # User collection
    └── ...               # Other collections
```

## Key Benefits

- ✅ **No Duplicate Events** - Sophisticated event delegation prevents double-firing
- ✅ **Clean Data Flow** - Models/Collections provide structured data management
- ✅ **Automatic REST** - Built-in API integration with minimal configuration
- ✅ **Component Reuse** - Views can be composed and nested easily
- ✅ **URL Synchronization** - Pages automatically sync state with URLs
- ✅ **Progressive Enhancement** - Works with existing HTML, no compilation required

## Next Steps

- [WebApp](./WebApp.md) - Set up your application
- [View Component](./View.md) - Learn the base component system
- [Event System](./Events.md) - Deep dive into event handling
- [Table Component](./Table.md) - Build data tables
- [Dialog Component](./Dialog.md) - Create modal interactions
- [Models & Collections](./Models-Collections.md) - Manage data
- [Examples](./examples/) - See complete examples

---

For more detailed information about each component, see the individual documentation files.