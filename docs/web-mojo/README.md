# WEB-MOJO Framework Documentation

**Welcome to the WEB-MOJO documentation!** This guide covers the complete framework for building modern web applications.

## 📖 Browse Documentation

- **[Interactive Portal](./index.html)** - Browse docs with search and syntax highlighting (open in browser)
- **Documentation by Category** - See sections below

---

## 🏗️ Application Layer

The top-level application containers that bootstrap and run a MOJO application:

- **[WebApp](./core/WebApp.md)** - Central application container: routing, pages, REST, state, events
- **[PortalApp](./core/PortalApp.md)** - Full portal shell extending WebApp: sidebar, topbar, auth, groups
- **[PortalWebApp](./core/PortalWebApp.md)** - Opinionated portal extending PortalApp: auth-gated lifecycle, auto WebSocket, countdown redirect

---

## 🔧 Core Concepts

Essential framework components every MOJO developer should understand:

- **[View](./core/View.md)** - Base view component, lifecycle, templates, navigation helpers, tooltips
- **[Child Views](./core/ViewChildViews.md)** - Composing views with child components
- **[Advanced Views](./core/AdvancedViews.md)** - Custom rendering, Canvas, WebGL patterns
- **[Templates](./core/Templates.md)** - Mustache templating with formatters and common pitfalls ⚠️
- **[DataFormatter](./core/DataFormatter.md)** - 80+ built-in formatters (dates, numbers, badges, etc.)
- **[Model](./core/Model.md)** - Data models with REST API integration
- **[Collection](./core/Collection.md)** - Collections of models with querying and pagination
- **[Events](./core/Events.md)** - EventBus and EventEmitter patterns

---

## 📄 Pages

Page-level components with routing lifecycle:

- **[Page](./pages/Page.md)** - Base page class: routing params, onEnter/onExit, URL sync, permissions

---

## 🛠️ Services

Framework services for HTTP, real-time, notifications, and file handling:

- **[Rest](./services/Rest.md)** - HTTP client: GET/POST/PUT/PATCH/DELETE, file upload/download, interceptors
- **[ToastService](./services/ToastService.md)** - Bootstrap 5 toast notifications with auto-dismiss and view support
- **[WebSocketClient](./services/WebSocketClient.md)** - WebSocket client with auto-reconnect, heartbeat, and auth

---

## 🧩 Components

UI Components for displaying and interacting with data:

- **[ContextMenu](./components/ContextMenu.md)** - Reusable Bootstrap dropdown menu component for row/header actions
- **[Dialog](./components/Dialog.md)** - Modal dialogs: alert, confirm, prompt, forms, code view, busy indicator
- **[Sidebar & TopNav](./components/SidebarTopNav.md)** - Portal navigation: sidebar menus, topbar, homeless pages, group switching
- **[SideNavView](./components/SideNavView.md)** - Section-based detail layout: left rail of sections, responsive collapse to dropdown
- **[ListView](./components/ListView.md)** - Visual list component for collections
- **[TableView](./components/TableView.md)** - Advanced data table with sorting, filtering, pagination
- **[TablePage](./components/TablePage.md)** - Page wrapper for TableView with URL sync
- **[DataView](./components/DataView.md)** - Structured data display component
- **[FileView](./components/FileView.md)** - Canonical viewer for File records (preview, details, renditions, metadata)
- **[ImageFields](./components/ImageFields.md)** - Image field components

---

## 📝 Forms

Build forms declaratively with field definitions, validation, and model binding:

- **[Forms Overview](./forms/README.md)** - Form system architecture and quick start
- **[FormView](./forms/FormView.md)** - Complete FormView component reference
- **[FieldTypes](./forms/FieldTypes.md)** - Master quick reference for all field types
- **[Validation](./forms/Validation.md)** - HTML5, FormView, and server-side validation
- **[FileHandling](./forms/FileHandling.md)** - File upload modes and patterns
- **[MultiStepWizard](./forms/MultiStepWizard.md)** - Multi-step wizard pattern (Page + FormView per step)
- **[SearchFilterForms](./forms/SearchFilterForms.md)** - Live search/filter form pattern driving a Collection, TableView, ListView, or array
- **[BestPractices](./forms/BestPractices.md)** - Patterns, pitfalls, and production checklist

---

## 📦 Built-in Models

Pre-built Model and Collection classes for common portal entities:

- **[Built-in Models](./models/BuiltinModels.md)** - User, Group, Member, Job, Email, Files, Incident, Tickets, Log, Metrics, ApiKey, and more

---

## 🔀 Mixins

Reusable behaviour mixed into framework classes:

- **[EventEmitter](./core/Events.md)** - Instance-level event system used by View, Model, Collection
- **[EventDelegate](./core/Events.md)** - Convention-based DOM event delegation via `data-action` attributes

---

## 🧰 Utilities

Helper classes and functions:

- **[MOJOUtils](./utils/MOJOUtils.md)** - Static helpers: deepClone, deepMerge, debounce, throttle, generateId, escapeHtml, password utilities, query string parsing
- **[DataFormatter](./core/DataFormatter.md)** - 80+ formatters for use in templates and programmatic code

---

## 🧩 Extensions

Optional extensions for charts, maps, admin, and more:

- **[Charts](./extensions/Charts.md)** - Chart.js integration (SeriesChart, PieChart)
- **[LightBox](./extensions/LightBox.md)** - Image lightbox viewer
- **[MapView](./extensions/MapView.md)** - Map view component
- **[MapLibreView](./extensions/MapLibreView.md)** - MapLibre GL integration
- **[TimelineView](./extensions/TimelineView.md)** - Timeline visualization
- **[FileUpload](./extensions/FileUpload.md)** - File upload utilities
- **[TabView](./extensions/TabView.md)** - Tab navigation component
- **[Location](./extensions/Location.md)** - Geolocation services and tracking
- **[Location API](./extensions/Location_API.md)** - Location API reference
- **[Map](./extensions/Map.md)** - Map integration and controls
- **[Admin](./extensions/Admin.md)** - Pre-built admin pages and views
- **[Metrics Mini Chart Widget](./extensions/metricsminichartwidget.md)** - Compact metrics chart widget

---

## 🚀 Getting Started

New to MOJO? Start here:

1. **Installation** - `npm install web-mojo`
2. **[View Basics](./core/View.md)** - Learn the View component system
3. **[Templates](./core/Templates.md)** - Build dynamic UIs with Mustache
4. **[Model](./core/Model.md)** - Connect to your REST API
5. **[WebApp](./core/WebApp.md)** - Wire it all together

### Simple Application (no auth)

```js
import WebApp from 'web-mojo';
import HomePage from './pages/HomePage.js';

const app = new WebApp({
  name: 'My App',
  container: '#app',
  defaultRoute: 'home',
  api: { baseURL: 'https://api.example.com' }
});

app.registerPage('home', HomePage);
await app.start();
```

### Portal Application (with auth + sidebar)

```js
import PortalApp from 'web-mojo/PortalApp';
import HomePage from './pages/HomePage.js';

const app = new PortalApp({
  name: 'Acme Portal',
  container: '#app',
  defaultRoute: 'home',
  api: { baseURL: 'https://api.acme.com' },
  sidebar: {
    menu: [
      { label: 'Home',  icon: 'bi-house',  route: 'home' },
      { label: 'Users', icon: 'bi-people', route: 'users' }
    ]
  },
  topbar: { brandText: 'Acme Portal' }
});

app.events.on('auth:unauthorized', () => { window.location.href = '/login'; });

app.registerPage('home', HomePage);
await app.start();
```

### Recommended Learning Path

1. **[View.md](./core/View.md)** — Understand the component lifecycle
2. **[Templates.md](./core/Templates.md)** — Learn Mustache + pipe formatters ⚠️ Read the pitfalls!
3. **[Model.md](./core/Model.md)** — Connect to your REST API
4. **[Events.md](./core/Events.md)** — Handle user interactions
5. **[Collection.md](./core/Collection.md)** — Work with lists of data
6. **[WebApp.md](./core/WebApp.md)** — Build the app shell
7. **[Page.md](./pages/Page.md)** — Create routed pages

---

## 📚 Documentation Status

- ✅ **Up-to-date** - All folders (updated 2025)
- 🔄 **Pending Updates** - See [pending_update/](./pending_update/) folder for docs awaiting review

---

## 🤖 For AI Agents

This documentation is structured for easy navigation and understanding.

### Quick Lookup by Task

| Task | Read These |
|---|---|
| Building a view | [View.md](./core/View.md), [Templates.md](./core/Templates.md) |
| Adding child components | [ViewChildViews.md](./core/ViewChildViews.md) |
| Working with data | [Model.md](./core/Model.md) or [Collection.md](./core/Collection.md) |
| Creating a page | [Page.md](./pages/Page.md), [WebApp.md](./core/WebApp.md) |
| Building a portal app | [PortalApp.md](./core/PortalApp.md) |
| Portal with auth-gated start + WebSocket | [PortalWebApp.md](./core/PortalWebApp.md) |
| HTTP requests | [Rest.md](./services/Rest.md) |
| Modal dialogs | [Dialog.md](./components/Dialog.md) |
| Toast notifications | [ToastService.md](./services/ToastService.md) |
| Real-time / WebSocket | [WebSocketClient.md](./services/WebSocketClient.md) |
| Data tables | [TableView.md](./components/TableView.md), [TablePage.md](./components/TablePage.md) |
| List components | [ListView.md](./components/ListView.md) |
| Built-in models (User, Group…) | [BuiltinModels.md](./models/BuiltinModels.md) |
| Utility helpers | [MOJOUtils.md](./utils/MOJOUtils.md) |
| Template formatters | [DataFormatter.md](./core/DataFormatter.md) |
| Event handling | [Events.md](./core/Events.md) |
| Complex rendering | [AdvancedViews.md](./core/AdvancedViews.md) |

### Key Patterns (Quick Reference)

- **View instance IS the Mustache context** — `this.property` is accessible as `{{property}}` in templates
- **`data-action="action-name"`** → method `onActionActionName(event, element)` — all user interactions
- **`{{value|formatter}}`** — pipe syntax for data formatting (70+ built-ins)
- **`addChild(view)`** with `containerId` — compose views without manual `render()`/`mount()` calls
- **`onInit()`** — one-time child view setup; **`onEnter()`** (Page only) — per-visit logic
- **`app.events`** — global EventBus for cross-component communication
- **`app.rest`** — shared HTTP client (configured once, used by all models automatically)

### Critical Gotchas (Read Templates.md for details)

- ⚠️ Boolean checks require `|bool` formatter — without it, arrays/objects iterate
- ⚠️ HTML output requires `{{{triple braces}}}` — double braces always escape
- ⚠️ String formatter args require quotes: `{{date|date:'YYYY-MM-DD'}}`
- ⚠️ Use `{{.property}}` in iterations (not `{{property}}`)
- ⚠️ Object iteration requires `|iter` formatter
- ⚠️ **NO** `data-action` on `<form>` elements — use on the submit `<button type="button">`
- ⚠️ **NO** data fetching in `onAfterRender()` or `onAfterMount()` — causes re-render loops
- ⚠️ **NO** manual `render()`/`mount()` after `addChild()` — the framework handles it
- ⚠️ Pages are **cached** — per-visit logic belongs in `onEnter()`, not the constructor or `onInit()`

### Philosophy

- **KISS** — Simple patterns over clever abstractions
- **Logic-less templates** — Business logic in views, display formatting in formatters
- **Model-first** — Use models directly (`{{model.property}}`), avoid custom data wrappers
- **Events over callbacks** — Use `data-action` delegation, not inline `addEventListener`

---

## 📂 Directory Structure

```
web-mojo/
├── README.md                    # This file — documentation index
├── index.html                   # Interactive documentation portal
│
├── core/                        # Framework fundamentals
│   ├── WebApp.md                # Application container and orchestrator
│   ├── PortalApp.md             # Portal shell (auth, sidebar, topbar, groups)
│   ├── PortalWebApp.md          # Opinionated portal: auth-gated lifecycle, auto WebSocket
│   ├── View.md                  # Base view component and full lifecycle
│   ├── ViewChildViews.md        # Composing views with children
│   ├── AdvancedViews.md         # Custom rendering, Canvas, WebGL
│   ├── Templates.md             # Mustache templating — READ PITFALLS SECTION
│   ├── DataFormatter.md         # 80+ built-in formatters reference
│   ├── Model.md                 # Data models with REST integration
│   ├── Collection.md            # Collections of models
│   └── Events.md                # EventBus and EventEmitter patterns
│
├── pages/                       # Page-level routing components
│   └── Page.md                  # Page base class (extends View with routing)
│
├── services/                    # Framework services
│   ├── Rest.md                  # HTTP client for API communication
│   ├── ToastService.md          # Bootstrap 5 toast notifications
│   └── WebSocketClient.md       # WebSocket client with auto-reconnect
│
├── components/                  # UI components
│   ├── Dialog.md                # Modal dialogs (alert, confirm, forms, code)
│   ├── ListView.md              # List component for collections
│   ├── TableView.md             # Advanced data table
│   ├── TablePage.md             # Page wrapper for TableView with URL sync
│   ├── DataView.md              # Structured data display
│   ├── FileView.md              # File display and management
│   └── ImageFields.md           # Image field components
│
├── extensions/                  # Optional framework extensions
│   ├── Charts.md                # Chart.js integration (SeriesChart, PieChart)
│   ├── LightBox.md              # Image lightbox viewer
│   ├── MapView.md               # Map view component
│   ├── MapLibreView.md          # MapLibre GL integration
│   ├── TimelineView.md          # Timeline visualization
│   ├── FileUpload.md            # File upload utilities
│   ├── TabView.md               # Tab navigation component
│   ├── Location.md              # Geolocation services
│   ├── Location_API.md          # Location API reference
│   ├── Map.md                   # Map integration and controls
│   ├── Admin.md                 # Pre-built admin pages and views
│   └── metricsminichartwidget.md # Compact metrics chart widget
│
├── models/                      # Built-in model reference
│   └── BuiltinModels.md         # User, Group, Member, Job, Email, Files, etc.
│
├── utils/                       # Utility classes
│   └── MOJOUtils.md             # Static helpers: clone, merge, debounce, password, etc.
│
├── mixins/                      # Reusable mixins (documented in core/Events.md)
│
└── pending_update/              # Documentation awaiting review
```

---

## 📝 Contributing

Documentation improvements welcome! Please ensure:
- ✅ Examples are tested and working
- ✅ Common pitfalls are documented with ⚠️ warnings
- ✅ Cross-references between related docs are updated
- ✅ KISS principles are followed in all examples
- ✅ Code examples use real-world patterns
- ✅ Before/after examples for anti-patterns

### Documentation Standards

- Use `⚠️` for critical warnings
- Use `✅` for best practices
- Use `❌` for anti-patterns
- Include a "Common Pitfalls" section in every major doc
- Link to related documentation at the end of each doc
- Show complete, working examples
- Every doc should have: Overview → Quick Start → Options/API → Common Patterns → Common Pitfalls → Related Docs

---

## 🔗 External Resources

- **[MOJO on NPM](https://www.npmjs.com/package/web-mojo)** — Package registry
- **[GitHub Repository](https://github.com/NativeMojo/web-mojo)** — Source code
- **[Examples](../examples/)** — Working example projects

---

## 📄 License

Apache 2.0 — See LICENSE file

---

**Last Updated:** 2025  
**Documentation Version:** 3.0.0