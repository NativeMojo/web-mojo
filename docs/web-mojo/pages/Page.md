# Page

**Page** extends [View](../core/View.md) with URL routing capabilities, making it the base class for all top-level application screens in WEB-MOJO. Every screen registered with [WebApp](../core/WebApp.md) or [PortalApp](../core/PortalApp.md) should extend `Page`.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Constructor Options](#constructor-options)
- [Static Class Properties](#static-class-properties)
- [Routing](#routing)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Page State Preservation](#page-state-preservation)
- [Navigation](#navigation)
- [Meta Tags](#meta-tags)
- [Notifications](#notifications)
- [Permissions](#permissions)
- [Group Changes (`onGroupChange`)](#group-changes-ongroupchange)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`Page` adds the following on top of `View`:

- **Route parameters** — `this.params` and `this.query` populated by the router on every navigation
- **Lifecycle hooks** — `onEnter()`, `onExit()`, and `onParams()` for page-specific transitions
- **State preservation** — Scroll position and form data are saved/restored automatically across navigations
- **URL sync** — `syncUrl()` and `updateBrowserUrl()` for keeping the address bar up to date
- **Metadata** — `setMeta()` to update `<title>` and meta tags
- **Permission guard** — `canEnter()` to block unauthorized access
- **Body class** — Automatically adds `page-<name>` to `<body>` while the page is active

Pages are **cached** by `WebApp` — the same instance is reused across visits. Put one-time setup in the constructor or `onInit()`, and per-visit logic in `onEnter()`.

---

## Quick Start

```js
import { Page } from 'web-mojo';

class UsersPage extends Page {
  static pageName = 'users';
  static route    = '/users';

  template = `
    <div class="container py-4">
      <h1>Users</h1>
      {{#users}}
        <div class="card mb-2">
          <div class="card-body">{{.display_name}}</div>
        </div>
      {{/users}}
    </div>
  `;

  async onEnter() {
    await super.onEnter();
    await this.loadUsers();
  }

  async loadUsers() {
    const resp = await this.getApp().rest.GET('/api/user');
    this.users = resp.data?.data || [];
    await this.render();
  }
}

// Register with the app
app.registerPage('users', UsersPage, { route: '/users' });
```

---

## Constructor Options

`Page` accepts all [View constructor options](../core/View.md#constructor-options) plus:

| Option | Type | Default | Description |
|---|---|---|---|
| `pageName` | `string` | `''` | Unique identifier for this page (also used as the route key) |
| `route` | `string` | `''` | URL route pattern (e.g. `'/users/:id'`) |
| `title` | `string` | `pageName` | Browser `<title>` set when the page is active |
| `icon` | `string` | `'bi bi-file-text'` | Bootstrap Icons class for this page |
| `displayName` | `string` | `pageName` | Human-readable name for navigation labels |
| `pageDescription` | `string` | `''` | Short description for page header/breadcrumbs |
| `requiresAuth` | `boolean` | `false` | Whether the page requires authentication |
| `requiresGroup` | `boolean` | `false` | Whether an active group is required (PortalApp only) |
| `permissions` | `string\|string[]` | — | Permission(s) required; checked by `canEnter()` |
| `description` | `string` | `''` | Used in `<meta name="description">` |

---

## Static Class Properties

The cleanest way to define page metadata is with static class properties, which `WebApp` reads when registering:

```js
class ReportsPage extends Page {
  static pageName        = 'reports';
  static route           = '/reports';
  static displayName     = 'Reports';
  static pageIcon        = 'bi bi-bar-chart';
  static pageDescription = 'Sales and activity reports';
}
```

These are equivalent to passing the same keys in the constructor options object.

---

## Routing

### Route Patterns

Routes are registered when you call `app.registerPage()`. The route pattern supports named parameters using `:paramName` syntax:

```js
app.registerPage('home',        HomePage);                              // → /home
app.registerPage('users',       UsersPage,       { route: '/users' });
app.registerPage('user-detail', UserDetailPage,  { route: '/users/:id' });
app.registerPage('settings',    SettingsPage,    { route: '/settings/:section?' }); // optional param
```

### `onParams(params, query)`

Called by `WebApp` every time the page is shown — even if the same page is shown again with different parameters. Override this to react to route changes.

```js
class UserDetailPage extends Page {
  async onParams(params, query) {
    await super.onParams(params, query);

    // params comes from the route pattern: /users/:id
    this.userId = params.id;

    // query comes from the URL search string: ?tab=settings
    this.activeTab = query.tab || 'profile';
  }
}
```

> **Note:** `onParams` is called *before* `onEnter()` on the first visit. On subsequent visits to the same page, only `onParams` is called (not `onEnter`). Put data loading that depends on params in `onParams`.

### `this.params` and `this.query`

After `onParams` is called, the current values are available as instance properties:

```js
// Access in templates
template = `
  <p>Viewing user: {{params.id}}</p>
  <p>Active tab: {{query.tab}}</p>
`;

// Access in methods
async loadUser() {
  const user = new User({ id: this.params.id });
  await user.fetch();
  this.user = user;
}
```

### Route Helpers

```js
// Get the route string for this page (without leading slash)
const route = this.getRoute(); // 'users' or 'users/detail'

// Sync the current page params back to the URL
this.syncUrl();

// Update the URL without triggering a navigation
this.updateBrowserUrl({ tab: 'settings' }, /* replace= */ true);
```

---

## Lifecycle Hooks

`Page` adds three page-specific lifecycle hooks on top of the [View lifecycle](../core/View.md#lifecycle-overview):

### Full Page Lifecycle Order

```
First visit:
  onParams(params, query)     ← route params set
  onEnter()                   ← page becoming active
    onInitView()              ← (if first render)
      onInit()                ← child views, one-time setup
    restore saved state
    emit 'activated'
  render()
    onBeforeRender()
    onAfterRender()
    onBeforeMount()
    onAfterMount()

Leaving the page:
  onExit()
    capture state
    emit 'deactivated'
  unmount()

Returning to same page with new route params:
  onParams(params, query)     ← only this is called again
```

---

### `onEnter()`

Called once per visit when the page becomes the active page. Use it for per-visit initialization — loading data, resetting UI state, etc.

```js
async onEnter() {
  await super.onEnter(); // Always call super first

  // This runs every time the user navigates to this page
  await this.loadData();
  document.title = `Users — ${this.getApp().name}`;
}
```

> ⚠️ **Do not** skip `await super.onEnter()` — it handles `onInitView()` (which calls `onInit()` on the first visit), state restoration, and the `'activated'` event.

### `onExit()`

Called when the user navigates away from this page. Use it to pause timers, cancel pending requests, or save UI state.

```js
async onExit() {
  // This runs before the page is unmounted
  clearInterval(this.refreshTimer);
  this.pendingRequest?.abort();

  await super.onExit(); // Always call super — it captures state and emits 'deactivated'
}
```

### `onParams(params, query)`

Called every time the page is shown (including the first time), with the current route parameters and query string. Override to react to URL changes within the same page.

```js
async onParams(params, query) {
  await super.onParams(params, query);
  this.selectedId = params.id;
  this.filter = query.filter || 'all';

  // If the page is already rendered, re-render with new params
  if (this.isMounted()) {
    await this.loadData();
    await this.render();
  }
}
```

---

## Page State Preservation

`Page` automatically saves and restores basic page state when navigating away and back:

- **Scroll position** — `element.scrollTop`
- **Form data** — all `<input>`, `<select>`, and `<textarea>` values by `name` attribute

This happens via `captureState()` in `onExit()` and `restoreState()` in `onEnter()`.

### Custom State

Override `captureCustomState()` and `restoreCustomState()` to save/restore additional state:

```js
class UsersPage extends Page {
  captureCustomState() {
    return {
      currentPage: this.currentPage,
      selectedItems: this.selectedItems,
      searchQuery: this.searchQuery
    };
  }

  restoreCustomState(state) {
    this.currentPage  = state.currentPage || 1;
    this.selectedItems = state.selectedItems || [];
    this.searchQuery  = state.searchQuery || '';
  }
}
```

---

## Navigation

### `navigate(route, params, options)`

Navigate to another page from within this page:

```js
class UsersPage extends Page {
  async onActionViewUser(event, element) {
    const id = element.dataset.id;
    this.navigate('/users/' + id);
  }
}
```

### `async makeActive()`

Show this page via the app's router:

```js
// Make this page the currently active page
await this.makeActive();
```

### `onActionNavigate(event, element)`

Built-in handler for `data-action="navigate"` on links with `data-page`:

```html
<!-- Uses the built-in navigate handler -->
<button data-action="navigate" data-page="home">Go Home</button>
```

### `syncUrl(force)`

Push the current page's route to the browser address bar without triggering a navigation:

```js
// Sync current params to URL (useful after programmatic state changes)
this.syncUrl();
```

### `updateBrowserUrl(query, replace, trigger)`

Update the URL with new query parameters:

```js
// Replace the current URL entry (no new history entry)
this.updateBrowserUrl({ filter: 'active', page: 2 }, true);

// Push a new history entry and trigger route change
this.updateBrowserUrl({ filter: 'active' }, false, true);
```

---

## Meta Tags

### `setMeta(meta)`

Update browser `<title>` and `<meta>` tags programmatically:

```js
this.setMeta({
  title: 'User Profile — Acme Portal',
  description: 'View and edit your user profile'
});

// Any key other than 'title' and 'description' becomes a <meta name="..."> tag
this.setMeta({
  title: 'Products',
  'og:title': 'Products — Acme',
  keywords: 'products, catalog, shop'
});
```

`setMeta` is also called automatically in `onBeforeRender()` using `pageOptions.title` and `pageOptions.description`.

---

## Notifications

`Page` overrides `showError()` and `showSuccess()` from `View` to also display an inline alert banner at the top of the page element, in addition to calling the app's dialog method.

```js
// Shows a dismissible alert at the top of the page content
// AND opens an error dialog via app.showError()
this.showError('Failed to load users');

// Shows a dismissible success alert at the top of the page
// AND opens a success dialog via app.showSuccess()
this.showSuccess('User saved successfully');
```

The inline alerts auto-dismiss after 5 seconds (error) or 3 seconds (success).

---

## Permissions

### `canEnter()`

Override `canEnter()` to implement custom permission logic. Return `false` to prevent the page from being shown — `WebApp` will redirect to the `'denied'` page instead.

```js
class AdminPage extends Page {
  canEnter() {
    const user = this.getApp().activeUser;

    // Not logged in
    if (!user) return false;

    // Check a specific permission
    if (!user.hasPermission('view_admin')) return false;

    return true;
  }
}
```

The default implementation checks `this.options.permissions` against `this.getApp().activeUser.hasPermission()` and also checks `this.options.requiresGroup` against `this.getApp().activeGroup`.

---

## Group Changes (`onGroupChange`)

### What it is

`onGroupChange(group)` is a lifecycle hook called by `PortalApp.setActiveGroup()` on the currently active page whenever the user switches to a different group. It is defined as an empty stub in `Page` — override it in your subclass whenever the page displays group-scoped data.

```js
// In Page.js — empty stub, safe to call super on
async onGroupChange(group) {}
```

```js
// In your page subclass — override to react to group switches
async onGroupChange(group) {
  await super.onGroupChange(group); // always call super
  // group  — the newly active Group model
  // this.getApp().activeGroup is already set to this group
}
```

You don't need to register anything. Simply override the method and it will be called automatically.

### When to implement it

Implement `onGroupChange` on any page that displays or operates on group-scoped data — i.e. any page where the content would become stale or incorrect if the user switches groups while it is visible.

| Page type | What to do in `onGroupChange` |
|---|---|
| Dashboard showing group metrics | Re-fetch the metrics for the new group |
| Table listing group members / resources | Re-fetch the collection filtered to the new group |
| Settings form for the group | Recreate / rebind the form with the new group's data |
| Chart showing group activity | Reload chart data for the new group |
| Page that doesn't use group data | No `onGroupChange` needed |

### Basic pattern

This is an MVC framework — data lives in **Models** and **Collections**. The page's job in `onGroupChange` is to tell those models to re-fetch for the new group, then re-render.

```js
import { Collection } from 'web-mojo';
import GroupSummary from '../models/GroupSummary.js';

export default class GroupDashboardPage extends Page {
  static pageName = 'group-dashboard';
  static route    = '?page=group-dashboard';

  async onInit() {
    await super.onInit();
    // Create model once — fetch it on each enter/group-change
    this.summary = new GroupSummary();
  }

  async onEnter() {
    await super.onEnter();
    await this.summary.fetch({ group_id: this.getApp().activeGroup?.id });
    await this.render();
  }

  async onGroupChange(group) {
    await super.onGroupChange(group);
    if (!group) return;
    // Tell the model to re-fetch for the new group, then re-render
    await this.summary.fetch({ group_id: group.id });
    await this.render();
  }
}
```

> **Note:** `onEnter` and `onGroupChange` share the same fetch logic here. There is no magic `loadData()` method — that is just an ordinary method name you would choose yourself if you wanted to extract the shared logic. The framework provides `onEnter`, `onGroupChange`, Models, and Collections; how you organise your own methods is up to you.

### Collection-based page

```js
import MemberCollection from '../models/MemberCollection.js';

export default class MembersPage extends Page {
  static pageName = 'members';
  static route    = '?page=members';

  async onInit() {
    await super.onInit();
    this.members = new MemberCollection();
  }

  async onEnter() {
    await super.onEnter();
    const group = this.getApp().activeGroup;
    if (!group) return;
    await this.members.fetch({ group_id: group.id });
    await this.render();
  }

  async onGroupChange(group) {
    await super.onGroupChange(group);
    if (!group) return;
    // Reset the collection and fetch for the new group
    this.members.reset();
    await this.members.fetch({ group_id: group.id });
    await this.render();
  }
}
```

### Invalidating a cached model

When you cache a model instance scoped to a group, swap it out in `onGroupChange` and re-fetch:

```js
async onGroupChange(group) {
  await super.onGroupChange(group);
  if (!group) return;

  // Replace the model with one scoped to the new group
  this.settings = new GroupSettings({ group_id: group.id });
  await this.settings.fetch();
  await this.render();
}
```

### Coordinating with child views

Child views that hold their own Models or Collections need to be told about the group change too. Call `setModel` / `setCollection` on them directly — they will re-render automatically:

```js
async onGroupChange(group) {
  await super.onGroupChange(group);
  if (!group) return;

  // Re-fetch the page's own model
  await this.summary.fetch({ group_id: group.id });
  await this.render();

  // Tell child views to update their own data
  if (this.activityView) {
    this.activityView.collection.reset();
    await this.activityView.collection.fetch({ group_id: group.id });
    await this.activityView.render();
  }
}
```

### Using the `group:changed` event bus alternative

If your page is **not** the currently active page but still needs to react to group changes (e.g. a persistent sidebar view or a background data store), listen on the app event bus instead:

```js
async onInit() {
  await super.onInit();

  this.getApp().events.on('group:changed', async ({ group }) => {
    if (!group) return;
    await this.myCollection.fetch({ group_id: group.id });
    await this.render();
  });
}
```

> Use `onGroupChange` (the hook) for the **active page**. Use `events.on('group:changed')` for views or services that live outside the page lifecycle. Remember to remove the listener in `onExit()` or `onBeforeDestroy()`.

### Common Pitfalls

#### ⚠️ Not guarding against a null group

Always check that a group was actually provided before touching group-scoped Models or Collections:

```js
async onGroupChange(group) {
  await super.onGroupChange(group);
  if (!group) return;   // nothing to do without an active group
  await this.members.fetch({ group_id: group.id });
  await this.render();
}
```

#### ⚠️ Skipping `await super.onGroupChange(group)`

Always call super so the stub in `Page` can evolve without breaking your subclass:

```js
// ❌ WRONG
async onGroupChange(group) {
  await this.members.fetch({ group_id: group.id });
}

// ✅ CORRECT
async onGroupChange(group) {
  await super.onGroupChange(group);
  await this.members.fetch({ group_id: group.id });
}
```

#### ⚠️ Rapid group switching — debounce if fetches are slow

`onGroupChange` is called fire-and-forget by `PortalApp`. If the user switches groups quickly and your fetch is slow, a previous fetch can resolve after a newer one. Guard with a simple flag:

```js
async onGroupChange(group) {
  await super.onGroupChange(group);
  if (!group || this._switching) return;
  this._switching = true;
  try {
    this.members.reset();
    await this.members.fetch({ group_id: group.id });
    await this.render();
  } finally {
    this._switching = false;
  }
}
```

#### ⚠️ Forgetting `onGroupChange` on group-scoped pages

If a page displays group-scoped data but has no `onGroupChange`, the user will see the previous group's data after switching — until they manually navigate away and back. This is the most common group-related bug in portal apps.

---

## API Reference

### Instance Properties

| Property | Type | Description |
|---|---|---|
| `pageName` | `string` | Unique page identifier |
| `route` | `string` | URL route pattern |
| `title` | `string` | Browser tab title for this page |
| `pageIcon` | `string` | Bootstrap Icons class |
| `displayName` | `string` | Human-readable name |
| `pageDescription` | `string` | Short description |
| `params` | `object` | Current route parameters (e.g. `{ id: '42' }`) |
| `query` | `object` | Current URL query parameters (e.g. `{ tab: 'settings' }`) |
| `isActive` | `boolean` | Whether this page is currently the active page |
| `pageOptions` | `object` | Merged page options (`title`, `description`, `requiresAuth`) |
| `savedState` | `object\|null` | State captured on last `onExit()` |

### Lifecycle Methods

| Method | Description |
|---|---|
| `async onParams(params, query)` | Called on every navigation to this page with current route data |
| `async onEnter()` | Called when this page becomes the active page |
| `async onExit()` | Called when navigating away from this page |
| `canEnter()` | Return `false` to block access — triggers the `'denied'` page |
| `async onGroupChange(group)` | Called by `PortalApp` when the active group changes — implement on any page with group-scoped data |

### Navigation Methods

| Method | Returns | Description |
|---|---|---|
| `navigate(route, params, opts)` | `void` | Navigate to a route via the app's router |
| `makeActive()` | `Promise` | Show this page via the app |
| `getRoute()` | `string` | Get the route string (without leading slash) |
| `syncUrl(force)` | `void` | Push current route to the browser address bar |
| `updateBrowserUrl(query, replace, trigger)` | `void` | Update URL query params |

### State Methods

| Method | Returns | Description |
|---|---|---|
| `captureState()` | `object\|null` | Capture current scroll, forms, and custom state |
| `restoreState(state)` | `void` | Restore previously captured state |
| `captureFormData()` | `object` | Capture all named form field values |
| `restoreFormData(data)` | `void` | Restore form field values from captured data |
| `captureCustomState()` | `object` | Override to capture custom state (default: `{}`) |
| `restoreCustomState(state)` | `void` | Override to restore custom state |

### Metadata Methods

| Method | Returns | Description |
|---|---|---|
| `getMetadata()` | `object` | Get `{ name, displayName, icon, description, route, isActive }` |
| `setMeta(meta)` | `void` | Update `<title>` and `<meta>` tags |

### Built-in Action Handlers

| Method | Triggered by | Description |
|---|---|---|
| `onActionNavigate(event, el)` | `data-action="navigate"` | Navigate to `el.dataset.page` |

### Static Methods

| Method | Returns | Description |
|---|---|---|
| `Page.define(definition)` | `class` | Create a page class from a plain object definition |

---

## Common Patterns

### Basic Page with Data Loading

```js
class ProductsPage extends Page {
  static pageName = 'products';
  static route    = '/products';

  template = `
    <div class="container py-4">
      <h1>Products</h1>
      {{#loading|bool}}
        <div class="spinner-border"></div>
      {{/loading|bool}}
      {{^loading|bool}}
        {{#products}}
          <div class="card mb-2">
            <div class="card-body">
              <h5>{{.name}}</h5>
              <p>{{.price|currency}}</p>
            </div>
          </div>
        {{/products}}
      {{/loading|bool}}
    </div>
  `;

  async onEnter() {
    await super.onEnter();
    this.loading = true;
    await this.render();

    const resp = await this.getApp().rest.GET('/api/products');
    this.products = resp.data?.data || [];
    this.loading = false;
    await this.render();
  }
}
```

### Page with Route Parameters

```js
class UserDetailPage extends Page {
  static pageName = 'user-detail';
  static route    = '/users/:id';

  template = `
    <div class="container py-4">
      {{#model}}
        <h1>{{model.display_name}}</h1>
        <p>{{model.email}}</p>
      {{/model}}
    </div>
  `;

  async onParams(params, query) {
    await super.onParams(params, query);

    // Load the user whenever the :id param changes
    const user = new User({ id: params.id });
    const resp = await user.fetch();
    if (resp.success) {
      this.setModel(user);
      await this.render();
    } else {
      this.showError('User not found');
    }
  }
}
```

### Page with Permission Guard

```js
class BillingPage extends Page {
  static pageName = 'billing';
  static route    = '/billing';

  canEnter() {
    const app  = this.getApp();
    const user = app.activeUser;
    const group = app.activeGroup;

    if (!user) return false;
    if (!group) return false;                          // Requires active group
    if (!user.hasPermission('manage_billing')) return false;

    return true;
  }

  async onEnter() {
    await super.onEnter();
    await this.loadBillingData();
  }
}
```

### Page with Polling

```js
class MonitoringPage extends Page {
  static pageName = 'monitoring';

  async onEnter() {
    await super.onEnter();
    await this.refresh();

    // Poll every 30 seconds while the page is active
    this.pollTimer = setInterval(() => {
      if (this.isActive) this.refresh();
    }, 30000);

    // Also refresh when the user returns to the tab
    this.getApp().events.on('browser:focus', this._onFocus = async () => {
      if (this.isActive) await this.refresh();
    });
  }

  async onExit() {
    clearInterval(this.pollTimer);
    this.getApp().events.off('browser:focus', this._onFocus);
    await super.onExit();
  }

  async refresh() {
    const resp = await this.getApp().rest.GET('/api/monitoring/status');
    this.status = resp.data?.data;
    await this.render();
  }
}
```

### Page Defined from Plain Object

```js
// Quick way to define a simple page without a class
const AboutPage = Page.define({
  pageName: 'about',
  route: '/about',
  template: `
    <div class="container py-4">
      <h1>About</h1>
      <p>Version {{version}}</p>
    </div>
  `,
  version: '2.0.0'
});

app.registerPage('about', AboutPage);
```

### Sharing State Between Page Visits via Custom State

```js
class SearchPage extends Page {
  static pageName = 'search';

  captureCustomState() {
    return {
      searchTerm:   this.searchTerm,
      currentPage:  this.currentPage,
      results:      this.results   // Restore results without re-fetching
    };
  }

  restoreCustomState(state) {
    this.searchTerm  = state.searchTerm || '';
    this.currentPage = state.currentPage || 1;
    this.results     = state.results || [];
  }
}
```

---

## Common Pitfalls

### ⚠️ Skipping super calls in lifecycle hooks

```js
// ❌ WRONG — skipping super breaks state, init, and events
async onEnter() {
  this.loading = true;
}

// ✅ CORRECT — always call super first
async onEnter() {
  await super.onEnter();
  this.loading = true;
}
```

### ⚠️ Loading data in onInit() instead of onEnter()

```js
// ❌ WRONG — onInit() runs only once; won't reload on re-entry
async onInit() {
  await super.onInit();
  await this.loadData(); // This never runs again
}

// ✅ CORRECT — onEnter() runs on every visit
async onEnter() {
  await super.onEnter();
  await this.loadData();
}
```

### ⚠️ Forgetting to remove event listeners in onExit()

```js
// ❌ WRONG — listener keeps firing even when page is not active
async onEnter() {
  await super.onEnter();
  this.getApp().events.on('browser:focus', this.refresh.bind(this));
}

// ✅ CORRECT — clean up in onExit()
async onEnter() {
  await super.onEnter();
  this._refreshHandler = this.refresh.bind(this);
  this.getApp().events.on('browser:focus', this._refreshHandler);
}

async onExit() {
  this.getApp().events.off('browser:focus', this._refreshHandler);
  await super.onExit();
}
```

### ⚠️ Using the constructor for per-visit work

```js
// ❌ WRONG — constructor runs once; page instances are cached
constructor(options) {
  super(options);
  this.loadData(); // Runs once on first creation only
}

// ✅ CORRECT
async onEnter() {
  await super.onEnter();
  await this.loadData(); // Runs every time the page is visited
}
```

### ⚠️ Relying on query params being available in onEnter()

```js
// ❌ WRONG — onParams() is called before onEnter(), but params are set
// before onEnter — this works, but the pattern is confusing:
async onEnter() {
  await super.onEnter();
  const tab = this.query.tab; // ✅ this actually works...
}

// ✅ CLEARER — handle params in onParams()
async onParams(params, query) {
  await super.onParams(params, query);
  this.activeTab = query.tab || 'overview';
}
```

---

## Related Documentation

- **[FormPage](./FormPage.md)** — Page subclass that auto-manages a `FormView` child — the fastest way to build a model edit page
- **[WebApp](../core/WebApp.md)** — Registers pages and drives the page lifecycle
- **[PortalApp](../core/PortalApp.md)** — Extends WebApp with `onGroupChange()` callback on pages
- **[View](../core/View.md)** — The base class Page extends
- **[Router](../core/Router.md)** — Resolves URLs to page names and parameters
- **[Events](../core/Events.md)** — EventBus patterns for cross-component communication
- **[Templates](../core/Templates.md)** — Mustache templating with formatters
- **[FormView](../forms/FormView.md)** — The form component managed by FormPage

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/pages/Page/PageExample.js`](../../../examples/portal/examples/pages/Page/PageExample.js) — Routed screen base: onEnter/onExit, URL params, permissions.

<!-- examples:cross-link end -->
