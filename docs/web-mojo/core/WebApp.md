# WebApp

**WebApp** is the central application container for the WEB-MOJO framework. It wires together routing, page management, REST communication, global state, notifications, and the browser event system into a single cohesive application object.

Every MOJO application starts by creating (or extending) a `WebApp` instance.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Constructor Options](#constructor-options)
- [Lifecycle](#lifecycle)
- [Page Management](#page-management)
- [Navigation](#navigation)
- [Notifications & Dialogs](#notifications--dialogs)
- [State Management](#state-management)
- [REST Integration](#rest-integration)
- [Global Event Bus](#global-event-bus)
- [Component & Model Registries](#component--model-registries)
- [Focus Tracking](#focus-tracking)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`WebApp` is the single entry point for a MOJO application. It:

- Manages a **Router** that maps URLs to named pages
- Creates and caches **Page** instances on demand
- Provides a global **EventBus** (`app.events`) for cross-component communication
- Holds a shared **Rest** client (`app.rest`) pre-configured with your API base URL
- Exposes helpers for **dialogs, loading indicators, and toast-style notifications**
- Tracks **browser focus/blur** state and emits corresponding events
- Stores **global application state** with change notifications

For portal-style applications with a sidebar, topbar, and authentication, see [PortalApp](./PortalApp.md) which extends `WebApp`.

---

## Quick Start

```web-mojo/docs/core/WebApp.md#L1-1
import WebApp from 'web-mojo';
import HomePage from './pages/HomePage.js';
import UsersPage from './pages/UsersPage.js';

const app = new WebApp({
  name: 'My App',
  container: '#app',
  defaultRoute: 'home',
  api: {
    baseURL: 'https://api.example.com'
  }
});

app.registerPage('home', HomePage);
app.registerPage('users', UsersPage, { route: '/users' });

await app.start();
```

---

## Constructor Options

Pass a configuration object to the `WebApp` constructor:

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `'MOJO App'` | Human-readable application name |
| `version` | `string` | `'1.0.0'` | Application version string |
| `debug` | `boolean` | `false` | Enable debug mode (shows more errors to users) |
| `container` | `string\|Element` | `'#app'` | CSS selector or DOM element for the app root |
| `pageContainer` | `string` | `'#page-container'` | CSS selector for the page rendering area |
| `defaultRoute` | `string` | `'home'` | Page name to show when no route is matched |
| `basePath` | `string` | `''` | URL base path prefix (e.g. `'/myapp'`) |
| `api` | `object` | `{}` | REST client configuration (see [REST Integration](#rest-integration)) |
| `routerMode` | `string` | `'param'` | Router mode: `'param'`, `'hash'`, or `'history'` |
| `layout` | `string` | `'portal'` | Layout type: `'portal'`, `'single'`, `'custom'`, or `'none'` |
| `sidebar` | `object` | `{}` | Sidebar configuration (forwarded to `layoutConfig`) |
| `topbar` | `object` | `{}` | Topbar configuration (forwarded to `layoutConfig`) |
| `session` | `object` | `{}` | Session/auth configuration |
| `navigation` | `object` | `{}` | Navigation configuration |

### Router Mode Options

| Mode | URL style | Description |
|---|---|---|
| `'param'` | `/?page=users` | Query-param routing, works anywhere |
| `'hash'` | `/#/users` | Hash-based routing, no server config needed |
| `'history'` | `/users` | HTML5 history API, requires server config |

### API Configuration

```web-mojo/docs/core/WebApp.md#L1-1
const app = new WebApp({
  api: {
    baseURL: 'https://api.example.com',
    timeout: 30000,
    headers: {
      'X-App-Version': '2.0'
    }
  }
});
```

---

## Lifecycle

### 1. Construction

When you call `new WebApp(config)`, the constructor:
- Initialises the Router
- Creates the global EventBus at `this.events`
- Configures the REST client at `this.rest`
- Sets up browser focus/blur tracking
- Exposes the app globally as `window.MOJO.app`

### 2. `start()`

Call `await app.start()` after registering all pages. It:
1. Calls `setupPageContainer()` to create the page rendering area in the DOM
2. Validates that `defaultRoute` is registered
3. Starts the Router (which immediately resolves the current URL and shows the matching page)
4. Emits `'app:ready'` on the event bus

```web-mojo/docs/core/WebApp.md#L1-1
// ❌ WRONG — pages registered after start() may not show correctly
await app.start();
app.registerPage('home', HomePage);

// ✅ CORRECT — register all pages before start()
app.registerPage('home', HomePage);
app.registerPage('users', UsersPage);
await app.start();
```

### 3. `destroy()`

Clean up the entire application: stops the router, destroys all cached pages, cleans up event listeners, and removes global references.

```web-mojo/docs/core/WebApp.md#L1-1
await app.destroy();
```

---

## Page Management

Pages are the top-level views rendered inside the page container. They extend [Page](../pages/Page.md), which extends [View](./View.md).

### Registering Pages

```web-mojo/docs/core/WebApp.md#L1-1
// Basic — route defaults to /<pageName>
app.registerPage('home', HomePage);

// Custom route
app.registerPage('users', UsersPage, { route: '/users' });

// Route with parameters
app.registerPage('user-detail', UserDetailPage, { route: '/users/:id' });

// With permission check
app.registerPage('admin', AdminPage, {
  route: '/admin',
  permissions: ['view_admin']
});
```

`registerPage(pageName, PageClass, options)` returns `this` for chaining:

```web-mojo/docs/core/WebApp.md#L1-1
app
  .registerPage('home', HomePage)
  .registerPage('users', UsersPage)
  .registerPage('settings', SettingsPage);
```

### Options for `registerPage`

| Option | Type | Description |
|---|---|---|
| `route` | `string` | URL route pattern. Defaults to `'/<pageName>'` |
| `permissions` | `string\|string[]` | Required permissions — checked via `page.canEnter()` |
| `requiresGroup` | `boolean` | Page requires an active group (PortalApp) |
| `containerId` | `string` | DOM container for the page (defaults to `pageContainer`) |

### Showing Pages Programmatically

```web-mojo/docs/core/WebApp.md#L1-1
// Show by name
await app.showPage('users');

// Show with query parameters (reflected in URL)
await app.showPage('users', { filter: 'active', page: 2 });

// Show with params (rich data, not URL-serialized)
await app.showPage('user-detail', {}, { userId: 123, user: userModel });

// Show a page instance directly
const page = new MyPage({ app });
await app.showPage(page);
```

### Page Caching

Pages are created once and cached. The same instance is reused on subsequent visits. Use `onEnter()` and `onExit()` lifecycle hooks in your Page class to handle re-entry instead of the constructor.

```web-mojo/docs/core/WebApp.md#L1-1
class UsersPage extends Page {
  async onEnter() {
    // Called every time the page becomes active
    await this.users.fetch();
  }

  async onExit() {
    // Called when leaving the page
    this.clearFilters();
  }
}
```

### Special Pages

Register these page names to provide custom 404 and access-denied views:

```web-mojo/docs/core/WebApp.md#L1-1
app.registerPage('404', NotFoundPage);
app.registerPage('denied', AccessDeniedPage);
```

If not registered, these pages fail silently.

---

## Navigation

### `navigate(route, query, options)`

Navigate using a URL path. The router will match the path and show the appropriate page.

```web-mojo/docs/core/WebApp.md#L1-1
// Navigate to a path
await app.navigate('/users');

// With query parameters (added to URL)
await app.navigate('/users', { filter: 'active' });

// Replace current history entry instead of pushing
await app.navigate('/users', {}, { replace: true });
```

### `navigateToDefault(options)`

Navigate to the `defaultRoute`:

```web-mojo/docs/core/WebApp.md#L1-1
await app.navigateToDefault();
```

### `back()` / `forward()`

Browser-history navigation:

```web-mojo/docs/core/WebApp.md#L1-1
app.back();
app.forward();
```

### `buildPagePath(page, params, query)`

Build a full URL path for a page:

```web-mojo/docs/core/WebApp.md#L1-1
const path = app.buildPagePath(userDetailPage, { id: 42 }, { tab: 'settings' });
// → '/users/42?tab=settings'
```

---

## Notifications & Dialogs

`WebApp` provides convenience methods for showing modal alerts and confirms. `showError / showSuccess / showInfo / showWarning` route through [Modal.alert](../components/Modal.md#modalalertmessage-title-options) and `confirm` routes through [Modal.confirm](../components/Modal.md#modalconfirmmessage-title-options). Each method falls back to `app.events.emit('notification', ...)` if Modal fails to load.

### Alert Dialogs

```web-mojo/docs/core/WebApp.md#L1-1
await app.showError('Something went wrong!');
await app.showSuccess('Record saved successfully.');
await app.showInfo('Your session will expire in 5 minutes.');
await app.showWarning('This action cannot be undone.');
```

### Loading Indicator

```web-mojo/docs/core/WebApp.md#L1-1
// Show spinner
await app.showLoading();
await app.showLoading({ message: 'Saving changes...' });

// Or pass a string directly
await app.showLoading('Uploading file...');

// Hide spinner
await app.hideLoading();
```

Always pair `showLoading` with `hideLoading` in a try/finally:

```web-mojo/docs/core/WebApp.md#L1-1
await app.showLoading('Processing...');
try {
  await doHeavyWork();
} finally {
  await app.hideLoading();
}
```

### Generic Notification

Emits on the event bus without opening a dialog — useful for toast listeners:

```web-mojo/docs/core/WebApp.md#L1-1
app.showNotification('File uploaded', 'success');
```

### Confirm Dialog

Returns `true` if the user clicks OK, `false` otherwise:

```web-mojo/docs/core/WebApp.md#L1-1
const confirmed = await app.confirm('Delete this record?', 'Confirm Delete');
if (confirmed) {
  await record.destroy();
}
```

### Form Dialogs

Open a dynamic form in a modal dialog:

```web-mojo/docs/core/WebApp.md#L1-1
// Show a model's edit form
const result = await app.showModelForm({
  model: userModel,
  fields: UserForms.edit.fields,
  title: 'Edit User'
});

if (result.submitted) {
  console.log('Form data:', result.data);
}
```

```web-mojo/docs/core/WebApp.md#L1-1
// Show a model's data in a read-only dialog
await app.showModelView(userModel, { title: 'User Details' });
```

```web-mojo/docs/core/WebApp.md#L1-1
// Show any custom view in a dialog
await app.showDialog({
  title: 'Custom Dialog',
  body: myCustomView,
  size: 'lg'
});
```

---

## State Management

`WebApp` provides a simple key-value store with change notifications.

### `getState(key)` / `setState(updates)`

```web-mojo/docs/core/WebApp.md#L1-1
// Set state
app.setState({ theme: 'dark', sidebarOpen: true });

// Get a specific key
const theme = app.getState('theme'); // 'dark'

// Get entire state object
const state = app.getState();
```

### Listening to State Changes

```web-mojo/docs/core/WebApp.md#L1-1
app.events.on('state:changed', ({ oldState, newState, updates }) => {
  console.log('State updated:', updates);
  if (updates.theme) {
    document.body.setAttribute('data-theme', updates.theme);
  }
});
```

---

## REST Integration

`WebApp` exposes a shared `Rest` instance at `app.rest`. Configure it via the `api` option in the constructor, or call `app.rest.configure()` directly.

```web-mojo/docs/core/WebApp.md#L1-1
const app = new WebApp({
  api: {
    baseURL: 'https://api.example.com',
    timeout: 15000,
    headers: { 'X-Client-Version': '3.0' }
  }
});
```

The `rest` instance is the same singleton used by all [Model](./Model.md) and [Collection](./Collection.md) instances. Configuring it once here means all models automatically use the correct base URL and auth headers.

```web-mojo/docs/core/WebApp.md#L1-1
// Set auth token (applied to all subsequent requests)
app.rest.setAuthToken('my-jwt-token');

// Make a raw API call
const response = await app.rest.GET('/api/dashboard/stats');
if (response.success && response.data.status) {
  this.stats = response.data.data;
}
```

See [Rest](../services/Rest.md) for the full REST client API.

---

## Global Event Bus

`app.events` is an `EventBus` instance — a **global** publish/subscribe channel for application-wide events. Unlike `EventEmitter` (which is per-instance), the EventBus allows any component to communicate with any other without direct references.

### Built-in Events

| Event | When emitted | Payload |
|---|---|---|
| `'app:ready'` | Application fully started | `{ app }` |
| `'page:showing'` | Before a page begins to show | `{ page, pageName, params, query, fromRouter }` |
| `'page:show'` | After a page is successfully shown | `{ page, pageName, params, query, fromRouter }` |
| `'page:hide'` | When a page is exited/unmounted | `{ page }` |
| `'page:404'` | A route could not be resolved | `{ pageName, params, query, fromRouter }` |
| `'page:denied'` | `canEnter()` returned false | `{ page, pageName, params, query, fromRouter }` |
| `'state:changed'` | `setState()` was called | `{ oldState, newState, updates }` |
| `'notification'` | `showNotification()` was called | `{ message, type }` |
| `'loading:show'` | `showLoading()` was called | `{ message }` |
| `'loading:hide'` | `hideLoading()` was called | `{}` |
| `'browser:focus'` | Browser tab gained focus | (none) |
| `'browser:blur'` | Browser tab lost focus | (none) |
| `'route:changed'` | Router resolved a new route | `{ pageName, params, query }` |

### Subscribing to Events

```web-mojo/docs/core/WebApp.md#L1-1
// In any page or view that has access to app
app.events.on('page:show', ({ pageName }) => {
  analytics.trackPageView(pageName);
});

app.events.on('browser:focus', () => {
  // Refresh data when user returns to the tab
  this.refresh();
});

// One-time listener
app.events.once('app:ready', ({ app }) => {
  console.log(`${app.name} is ready!`);
});
```

### Emitting Custom Events

```web-mojo/docs/core/WebApp.md#L1-1
// Any component can publish to the global bus
app.events.emit('user:logged-in', { user: activeUser });
app.events.emit('cart:updated', { itemCount: 3 });

// Other components can subscribe
app.events.on('cart:updated', ({ itemCount }) => {
  cartBadge.textContent = itemCount;
});
```

---

## Component & Model Registries

`WebApp` provides lightweight registries so that components and models can look each other up by name without importing directly.

### Component Registry

```web-mojo/docs/core/WebApp.md#L1-1
// Register
app.registerComponent('UserCard', UserCardView);
app.registerComponent('DataGrid', DataGridView);

// Retrieve
const UserCard = app.getComponent('UserCard');
const card = new UserCard({ model: user });
```

### Model Registry

```web-mojo/docs/core/WebApp.md#L1-1
// Register
app.registerModel('User', User);
app.registerModel('Order', Order);

// Retrieve
const UserClass = app.getModel('User');
const user = new UserClass({ id: 42 });
await user.fetch();
```

---

## Focus Tracking

`WebApp` automatically tracks whether the browser tab is focused or blurred and emits events on `app.events`. This is useful for pausing/resuming real-time data polling.

```web-mojo/docs/core/WebApp.md#L1-1
// Check current focus state
if (app.isFocused) {
  startPolling();
}

// React to focus changes
app.events.on('browser:focus', () => {
  // User returned to the tab — refresh stale data
  this.collection.fetch();
});

app.events.on('browser:blur', () => {
  // User left the tab — pause expensive operations
  stopPolling();
});
```

---

## API Reference

### Constructor

```web-mojo/docs/core/WebApp.md#L1-1
const app = new WebApp(config);
// or
const app = WebApp.create(config); // static factory
```

### Page Methods

| Method | Returns | Description |
|---|---|---|
| `registerPage(name, Class, opts)` | `this` | Register a page class with optional route and options |
| `getPage(name)` | `Page\|undefined` | Get cached page instance by name |
| `getOrCreatePage(name)` | `Page\|null` | Get or create+cache a page instance |
| `getPagePermissions(name)` | `any\|null` | Get the permissions config for a registered page |
| `getCurrentPage()` | `Page\|null` | Get the currently active page instance |
| `getPageContainer()` | `Element\|null` | Get the DOM element that pages render into |
| `showPage(page, query, params, opts)` | `Promise` | Show a page by name or instance |

### Navigation Methods

| Method | Returns | Description |
|---|---|---|
| `navigate(route, query, opts)` | `Promise` | Navigate to a URL route |
| `navigateToDefault(opts)` | `Promise` | Navigate to `defaultRoute` |
| `back()` | `void` | Go back in browser history |
| `forward()` | `void` | Go forward in browser history |
| `buildPagePath(page, params, query)` | `string` | Build a full URL path for a page |

### Notification Methods

| Method | Returns | Description |
|---|---|---|
| `showError(message)` | `Promise` | Show error dialog |
| `showSuccess(message)` | `Promise` | Show success dialog |
| `showInfo(message)` | `Promise` | Show info dialog |
| `showWarning(message)` | `Promise` | Show warning dialog |
| `showNotification(message, type)` | `void` | Emit notification event (no dialog) |
| `showLoading(opts)` | `Promise` | Show loading/busy indicator |
| `hideLoading()` | `Promise` | Hide loading/busy indicator |
| `confirm(message, title, opts)` | `Promise<boolean>` | Show confirm dialog, resolves to `true`/`false` |
| `showAlert(opts)` | `Promise` | Show generic alert dialog |
| `showDialog(opts)` | `Promise` | Show custom dialog |
| `showForm(opts)` | `Promise` | Show form dialog |
| `showModelForm(opts)` | `Promise` | Show model form dialog |
| `showModelView(model, opts)` | `Promise` | Show model data in a dialog |

### State Methods

| Method | Returns | Description |
|---|---|---|
| `getState(key)` | `any` | Get state value by key, or entire state object |
| `setState(updates)` | `void` | Merge updates into state and emit `'state:changed'` |

### Registry Methods

| Method | Returns | Description |
|---|---|---|
| `registerComponent(name, Class)` | `void` | Register a component class by name |
| `getComponent(name)` | `Class\|undefined` | Get a component class by name |
| `registerModel(name, Class)` | `void` | Register a model class by name |
| `getModel(name)` | `Class\|undefined` | Get a model class by name |

### Utility Methods

| Method | Returns | Description |
|---|---|---|
| `escapeHtml(str)` | `string` | Escape HTML special characters |
| `start()` | `Promise` | Start the application |
| `destroy()` | `Promise` | Destroy the application and clean up |
| `setupErrorHandling()` | `void` | Set up global `window.onerror` / unhandled rejection handling |

### Static Methods

| Method | Returns | Description |
|---|---|---|
| `WebApp.create(config)` | `WebApp` | Factory method — same as `new WebApp(config)` |
| `WebApp.registerPlugin(name, plugin)` | `void` | Register a global framework plugin/extension |

---

## Common Patterns

### Full Application Setup

```web-mojo/docs/core/WebApp.md#L1-1
import WebApp from 'web-mojo';
import HomePage from './pages/HomePage.js';
import UsersPage from './pages/UsersPage.js';
import UserDetailPage from './pages/UserDetailPage.js';
import NotFoundPage from './pages/NotFoundPage.js';

const app = WebApp.create({
  name: 'Acme Admin',
  version: '1.0.0',
  container: '#app',
  defaultRoute: 'home',
  routerMode: 'history',
  api: {
    baseURL: 'https://api.acme.com',
    timeout: 20000
  }
});

app
  .registerPage('home', HomePage)
  .registerPage('users', UsersPage, { route: '/users' })
  .registerPage('user-detail', UserDetailPage, { route: '/users/:id' })
  .registerPage('404', NotFoundPage);

app.events.on('app:ready', () => {
  console.log('App is ready!');
});

await app.start();
```

### Accessing the App from Any View

Views can access the app instance via `this.getApp()`:

```web-mojo/docs/core/WebApp.md#L1-1
class MyView extends View {
  async onActionGoHome(event, element) {
    const app = this.getApp();
    await app.navigate('/home');
  }

  async onActionSave(event, element) {
    const app = this.getApp();
    try {
      await this.model.save();
      await app.showSuccess('Saved!');
    } catch (err) {
      await app.showError('Failed to save: ' + err.message);
    }
  }
}
```

### Cross-Component Communication via EventBus

```web-mojo/docs/core/WebApp.md#L1-1
// Component A — publishes an event
class CartView extends View {
  async onActionAddItem(event, element) {
    const item = this.getItem(element.dataset.id);
    this.cart.add(item);
    this.getApp().events.emit('cart:item-added', { item, count: this.cart.size });
  }
}

// Component B — subscribes to the event
class NavbarView extends View {
  async onInit() {
    await super.onInit();
    this.getApp().events.on('cart:item-added', ({ count }) => {
      this.cartCount = count;
      this.render();
    });
  }
}
```

### Protecting Pages with Permissions

```web-mojo/docs/core/WebApp.md#L1-1
// Register with a required permission
app.registerPage('admin', AdminPage, {
  route: '/admin',
  permissions: ['view_admin']
});

// In your Page class, override canEnter()
class AdminPage extends Page {
  canEnter() {
    const user = this.getApp().activeUser;
    if (!user || !user.hasPermission('view_admin')) {
      return false; // → triggers 'denied' page
    }
    return true;
  }
}
```

### Refreshing Data on Tab Refocus

```web-mojo/docs/core/WebApp.md#L1-1
class DashboardPage extends Page {
  async onInit() {
    await super.onInit();
    this.getApp().events.on('browser:focus', async () => {
      if (this.isActive) {
        await this.loadData();
      }
    });
  }
}
```

---

## Common Pitfalls

### ⚠️ Not registering the default route

```web-mojo/docs/core/WebApp.md#L1-1
// ❌ WRONG — 'home' is the default but never registered
const app = new WebApp({ defaultRoute: 'home' });
app.registerPage('dashboard', DashboardPage);
await app.start(); // Warning: default route 'home' not registered

// ✅ CORRECT
app.registerPage('home', HomePage); // Must match defaultRoute
app.registerPage('dashboard', DashboardPage);
```

### ⚠️ Calling start() before registering pages

```web-mojo/docs/core/WebApp.md#L1-1
// ❌ WRONG
await app.start(); // Router fires immediately, no pages exist yet
app.registerPage('home', HomePage);

// ✅ CORRECT
app.registerPage('home', HomePage);
await app.start();
```

### ⚠️ Not awaiting showLoading / hideLoading

```web-mojo/docs/core/WebApp.md#L1-1
// ❌ WRONG — hideLoading may run before showLoading finishes
app.showLoading('Saving...');
await save();
app.hideLoading();

// ✅ CORRECT — always await both
await app.showLoading('Saving...');
try {
  await save();
} finally {
  await app.hideLoading();
}
```

### ⚠️ Using showPage() for URL-based navigation

```web-mojo/docs/core/WebApp.md#L1-1
// ❌ WRONG — bypasses the router and does not update the URL
await app.showPage('users', { filter: 'active' });

// ✅ CORRECT — use navigate() so the URL updates and history works
await app.navigate('/users', { filter: 'active' });
```

> **Note:** `showPage()` is correct when you want to show a page by its registered name **without** navigating — e.g. from within a page action. Use `navigate()` when the URL should change.

### ⚠️ Emitting on `app.events` vs instance events

```web-mojo/docs/core/WebApp.md#L1-1
// app.events is GLOBAL — all components in the app will hear it
app.events.emit('refresh');

// model.emit / view.emit is LOCAL — only that instance's listeners
this.model.emit('change');
```

---

## Related Documentation

- **[PortalApp](./PortalApp.md)** — Extends WebApp with sidebar, topbar, auth, and group management
- **[Page](../pages/Page.md)** — The Page base class with routing lifecycle hooks
- **[View](./View.md)** — The View base class all pages extend
- **[Rest](../services/Rest.md)** — The REST HTTP client (`app.rest`)
- **[Dialog](../components/Dialog.md)** — The Dialog component used by notification methods
- **[Router](./Router.md)** — The underlying Router instance (`app.router`)
- **[Events](./Events.md)** — EventBus and EventEmitter patterns
- **[Model](./Model.md)** — Data models that use the shared REST client

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/core/WebApp/WebAppExample.js`](../../../examples/portal/examples/core/WebApp/WebAppExample.js) — Minimal app shell: routing, page registry, REST client, global event bus.

<!-- examples:cross-link end -->
