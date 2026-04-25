# PortalApp

**PortalApp** extends [WebApp](./WebApp.md) with a full portal-style application shell: sidebar navigation, top bar, authentication, active group management, and built-in user profile/password dialogs.

Use `PortalApp` when building multi-page applications that require login, a persistent navigation sidebar, and optional multi-tenant group support. For simpler applications without authentication or persistent navigation, use [WebApp](./WebApp.md) directly.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Constructor Options](#constructor-options)
- [Authentication](#authentication)
- [Group Management](#group-management)
- [Portal Layout](#portal-layout)
- [Navigation & Sidebar](#navigation--sidebar)
- [User Management](#user-management)
- [Built-in Dialogs](#built-in-dialogs)
- [Portal Events](#portal-events)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`PortalApp` builds on top of `WebApp` and adds:

- **Authentication** — Token validation, automatic token refresh, and unauthorized session handling via `TokenManager`
- **Active Group** — Multi-tenant group selection persisted in `localStorage` and the URL
- **Portal Layout** — Sidebar, top bar, and optional page header rendered automatically
- **Toast Notifications** — A `ToastService` instance at `app.toast` for lightweight in-page notifications
- **Built-in Profile & Password Dialogs** — `showProfile()` and `changePassword()` ready to use
- **Portal Action Bus** — A `'portal:action'` event channel for sidebar/topbar interactions

---

## Quick Start

```js
import PortalApp from 'web-mojo/PortalApp';
import HomePage from './pages/HomePage.js';
import UsersPage from './pages/UsersPage.js';

const app = new PortalApp({
  name: 'Acme Portal',
  container: '#app',
  defaultRoute: 'home',
  api: {
    baseURL: 'https://api.acme.com'
  },
  sidebar: {
    menu: [
      { label: 'Home',  icon: 'bi-house',   route: 'home' },
      { label: 'Users', icon: 'bi-people',  route: 'users' }
    ]
  },
  topbar: {
    brandText: 'Acme Portal',
    brandIcon: 'bi-lightning'
  }
});

app
  .registerPage('home',  HomePage)
  .registerPage('users', UsersPage, { route: '/users' });

await app.start();
```

After `start()`, the portal automatically:

1. Validates and refreshes the auth token
2. Loads the active user
3. Loads the stored active group
4. Renders the sidebar and top bar
5. Starts the router and shows the default page

---

## Constructor Options

`PortalApp` accepts all [WebApp options](./WebApp.md#constructor-options) plus the following:

### Sidebar Configuration (`sidebar`)

```js
new PortalApp({
  sidebar: {
    // Navigation menu items
    menu: [
      { label: 'Dashboard', icon: 'bi-speedometer2', route: 'home' },
      { label: 'Users',     icon: 'bi-people',       route: 'users' },
      {
        label: 'Reports',
        icon: 'bi-bar-chart',
        children: [
          { label: 'Sales',    route: 'reports-sales' },
          { label: 'Activity', route: 'reports-activity' }
        ]
      }
    ],

    // Collapse state
    defaultCollapsed: false,   // Start collapsed?

    // Group selector mode shown in sidebar
    groupSelectorMode: 'inline', // 'inline' | 'dropdown'

    // Optional header above the menu
    groupHeader: true
  }
});
```

### Top Bar Configuration (`topbar`)

```js
new PortalApp({
  topbar: {
    brandText: 'Acme Portal',
    brandRoute: 'home',          // Click logo → navigate here
    brandIcon: 'bi-lightning',   // Bootstrap Icons class

    // Right-side navigation items
    rightItems: [
      { label: 'Help', icon: 'bi-question-circle', route: 'help' }
    ],

    displayMode: 'both',         // 'icon' | 'text' | 'both'
    showSidebarToggle: true      // Show hamburger toggle button
  }
});
```

### Page Header Configuration (`pageHeader`)

```js
new PortalApp({
  showPageHeader: true,          // Enable the page header bar
  pageHeader: {
    style: 'default',            // Visual style
    showIcon: true,              // Show page icon
    showDescription: true,       // Show page description
    showBreadcrumbs: true        // Show breadcrumb trail
  }
});
```

---

## Authentication

`PortalApp` handles authentication automatically via `TokenManager`. The flow runs inside `start()` before the router is started.

### Auth Flow

```
start()
  ↓
checkAuthStatus()
  ↓
TokenManager.checkTokenStatus()
  ↓
  ├── 'ok'      → Load user from API → setActiveUser()
  ├── 'refresh' → TokenManager.checkAndRefreshTokens() → Load user
  └── 'logout'  → emit 'auth:unauthorized' → stop
```

If authentication fails at any point, `app.events.emit('auth:unauthorized')` is fired and the user is **not** directed to the router.

### Handling Auth Events

```js
// Listen for auth events before start()
app.events.on('auth:unauthorized', () => {
  // Redirect to your login page
  window.location.href = '/login';
});

app.events.on('auth:logout', () => {
  window.location.href = '/login';
});
```

### Setting Auth Tokens

After a successful login on your login page:

```js
// Store the token (TokenManager reads from localStorage)
app.tokenManager.setToken(token, refreshToken, expiresIn);

// Set the token on the REST client
app.rest.setAuthToken(token);

// Load the user and start the portal
const user = new User({ id: tokenPayload.userId });
await user.fetch();
app.setActiveUser(user);
```

### Automatic Token Refresh

`PortalApp` calls `tokenManager.startAutoRefresh(app)` after a successful login, which silently refreshes the token before it expires.

On every `browser:focus` event, `checkAndRefreshTokens()` is called again to ensure tokens haven't expired while the tab was in the background.

---

## Group Management

`PortalApp` provides built-in multi-tenant group support. A **group** represents an organization, team, or tenant — any entity a user can be a member of.

### Active Group

The active group is stored in `localStorage` and also persisted in the URL as `?group=<id>`. The URL parameter always takes priority over `localStorage`.

```js
// Get the current active group (a Group model instance, or null)
const group = app.getActiveGroup();

// Set the active group
await app.setActiveGroup(groupModel);

// Clear the active group
await app.clearActiveGroup();
```

### Group Change Event

```js
app.events.on('group:changed', ({ group, previousGroup }) => {
  console.log('Switched to group:', group.get('name'));
});
```

### Group Loaded Event

```js
app.events.on('group:loaded', ({ group }) => {
  // Fired on startup when a stored group is successfully loaded
  console.log('Active group restored:', group.get('name'));
});
```

### Group Loading at Startup

Inside `start()`, after auth is confirmed, `checkActiveGroup()` runs:

1. Checks URL for `?group=<id>`
2. Falls back to `localStorage`
3. Fetches the `Group` model from the API
4. Loads the user's `Member` record for that group
5. Emits `'group:loaded'`

If the stored group fails to load, it is cleared gracefully.

### Reacting to Group Changes in Pages

```js
class MyPage extends Page {
  async onGroupChange(group) {
    // Called automatically by PortalApp.setActiveGroup()
    await this.collection.fetch({ group: group.get('id') });
    await this.render();
  }
}
```

### Checking if Group Selection is Needed

```js
if (app.needsGroupSelection()) {
  await app.showPage('group-select');
}
```

### Persistent Storage Helpers

These methods are used internally but can be called directly:

```js
app.saveActiveGroupId(groupId);  // Save to localStorage
const id = app.loadActiveGroupId(); // Read from localStorage
app.clearActiveGroupId();         // Remove from localStorage
```

The storage key is namespaced per app name via `getActiveGroupStorageKey()`.

---

## Portal Layout

`PortalApp` overrides `setupPageContainer()` to create the full portal HTML structure inside the app container.

The resulting DOM structure:

```
#app
└── .portal-container
    ├── .portal-sidebar          (sidebar component)
    ├── .portal-main
    │   ├── .portal-topbar       (top bar component)
    │   ├── .portal-page-header  (optional page header)
    │   └── #page-container      (pages render here)
```

Whether the sidebar and topbar are rendered is controlled by whether `sidebarConfig` and `topbarConfig` are provided.

### Responsive Behaviour

`PortalApp` uses a `ResizeObserver` to detect mobile breakpoints and automatically:

- Adds `mobile` CSS class to the portal container when the viewport is narrow
- Hides the sidebar on mobile (accessible via toggle)
- Preserves desktop sidebar open/closed state in `localStorage`

```js
// Check current layout
if (app.isMobile()) {
  // Handle mobile-specific logic
}

if (app.hasMobileLayout()) {
  // Mobile layout is currently active in the DOM
}
```

### Toggling the Sidebar

```js
// Toggle sidebar open/closed
app.toggleSidebar();

// Sidebar state is saved to localStorage automatically
```

The sidebar toggle button in the top bar emits a `'portal:action'` event with action `'toggle-sidebar'`, which `PortalApp` handles automatically.

---

## Navigation & Sidebar

### Portal Profile

The portal sets a profile object for display in the sidebar/topbar:

```js
app.setPortalProfile({
  displayName: 'Jane Smith',
  email: 'jane@acme.com',
  avatar: '/media/avatars/jane.jpg'
});
```

This is typically called after `setActiveUser()`.

### Updating Navigation

After switching groups or changing user state, update the sidebar/topbar:

```js
app.updateNavigation({ pageName: 'home' });
```

The sidebar highlights the active menu item based on `pageName`.

---

## User Management

### Active User

```js
// Set the active user (a User model instance)
app.setActiveUser(userModel);

// Get the active user
const user = app.getActiveUser(); // User model or null
```

### Checking Permissions in Pages

```js
class AdminPage extends Page {
  canEnter() {
    const user = this.getApp().activeUser;
    return user && user.hasPermission('view_admin');
  }
}
```

---

## Built-in Dialogs

`PortalApp` includes two ready-to-use dialogs triggered from the topbar or sidebar.

### User Profile Dialog

Opens a comprehensive user profile form allowing the user to edit their name, email, avatar, timezone, and language preferences:

```js
await app.showProfile();
```

The profile form uses `showModelForm()` with a complex multi-section layout including avatar upload, personal details, and account settings. On submit, the model is saved to the API.

### Change Password Dialog

Opens a three-field password form (current password, new password, confirm password):

```js
await app.changePassword();
```

Submits to the API and shows success/error feedback inline.

### Portal Action Handler

Both dialogs are triggered via the portal action bus:

```js
// Sidebar/topbar emit:
app.events.emit('portal:action', { action: 'profile' });
app.events.emit('portal:action', { action: 'change-password' });
app.events.emit('portal:action', { action: 'toggle-sidebar' });
app.events.emit('portal:action', { action: 'logout' });
```

`PortalApp` listens for `'portal:action'` and dispatches to:
- `'profile'` → `showProfile()`
- `'change-password'` → `changePassword()`
- `'toggle-sidebar'` → `toggleSidebar()`
- Other actions → re-emitted for custom handling

You can also emit custom portal actions from anywhere:

```js
// In any view
this.getApp().events.emit('portal:action', { action: 'my-custom-action', data: {...} });

// Handle in your app subclass
class MyPortalApp extends PortalApp {
  onPortalAction({ action, data }) {
    super.onPortalAction({ action, data });
    if (action === 'my-custom-action') {
      // Handle custom action
    }
  }
}
```

---

## Portal Events

In addition to all [WebApp events](./WebApp.md#global-event-bus), `PortalApp` emits:

| Event | When emitted | Payload |
|---|---|---|
| `'auth:unauthorized'` | Token invalid/expired, login required | `{ app }` |
| `'auth:logout'` | User logged out | (none) |
| `'group:loaded'` | Active group loaded at startup | `{ group }` |
| `'group:changed'` | Active group changed via `setActiveGroup()` | `{ group, previousGroup, app }` |
| `'portal:action'` | Sidebar/topbar action triggered | `{ action, ...data }` |

---

## API Reference

### Authentication Methods

| Method | Returns | Description |
|---|---|---|
| `start()` | `Promise` | Start with auth check → group load → router → layout |
| `checkAuthStatus()` | `Promise<boolean>` | Validate token, load user, start auto-refresh |
| `checkActiveGroup()` | `Promise` | Load active group from URL or localStorage |

### User Methods

| Method | Returns | Description |
|---|---|---|
| `setActiveUser(user)` | `void` | Set the active User model instance |
| `getActiveUser()` | `User\|null` | Get the active User model instance |
| `showProfile()` | `Promise` | Open the user profile edit dialog |
| `changePassword()` | `Promise` | Open the change password dialog |
| `setPortalProfile(profile)` | `void` | Set display info for sidebar/topbar |

### Group Methods

| Method | Returns | Description |
|---|---|---|
| `getActiveGroup()` | `Group\|null` | Get the active group |
| `setActiveGroup(group)` | `Promise<this>` | Set active group, save to storage, emit event |
| `clearActiveGroup()` | `Promise` | Clear active group from memory and storage |
| `needsGroupSelection()` | `boolean` | Returns true if no active group is set |
| `saveActiveGroupId(id)` | `void` | Persist group ID to localStorage |
| `loadActiveGroupId()` | `string\|null` | Read group ID from localStorage |
| `clearActiveGroupId()` | `void` | Remove group ID from localStorage |
| `getActiveGroupStorageKey()` | `string` | Returns the namespaced localStorage key |

### Layout Methods

| Method | Returns | Description |
|---|---|---|
| `setupPageContainer()` | `void` | Build portal DOM structure |
| `setupPortalComponents()` | `Promise` | Setup sidebar, topbar, page header |
| `setupSidebar()` | `Promise` | Instantiate and mount the sidebar |
| `setupTopbar()` | `Promise` | Instantiate and mount the topbar |
| `setupPageHeader()` | `Promise` | Instantiate and mount the page header |
| `getPortalContainer()` | `Element` | Get the portal root element |
| `toggleSidebar()` | `void` | Toggle sidebar open/collapsed |
| `handleResponsive()` | `void` | Recalculate mobile/desktop layout |
| `isMobile()` | `boolean` | Is viewport in mobile breakpoint? |
| `hasMobileLayout()` | `boolean` | Is mobile layout active in the DOM? |

### Navigation Methods (inherited from WebApp)

| Method | Returns | Description |
|---|---|---|
| `updateNavigation(info)` | `void` | Update sidebar active state |
| `showPage(page, query, params, opts)` | `Promise` | Override that also updates nav |

### Sidebar State Methods

| Method | Returns | Description |
|---|---|---|
| `saveSidebarState(collapsed)` | `void` | Persist sidebar state to localStorage |
| `loadSidebarState()` | `boolean\|null` | Read sidebar state from localStorage |
| `getSidebarStorageKey()` | `string` | Returns namespaced sidebar state key |
| `applySidebarState(collapsed)` | `void` | Apply collapsed/expanded state to DOM |
| `clearSidebarState()` | `void` | Remove sidebar state from localStorage |

### Portal Action

| Method | Returns | Description |
|---|---|---|
| `onPortalAction({ action, ...data })` | `void` | Handle a portal action event |

### Cleanup

| Method | Returns | Description |
|---|---|---|
| `destroy()` | `Promise` | Destroy portal: sidebar, topbar, pages, router |

### Static Methods

| Method | Returns | Description |
|---|---|---|
| `PortalApp.create(config)` | `PortalApp` | Factory method |

---

## Common Patterns

### Extending PortalApp

The most common usage is to create a subclass to add custom startup logic:

```js
import PortalApp from 'web-mojo/PortalApp';

class AcmeApp extends PortalApp {
  async start() {
    await super.start();

    // Additional startup after auth + group + layout are ready
    if (this.activeUser) {
      await this.loadUserPreferences();
    }
  }

  async loadUserPreferences() {
    const prefs = await this.rest.GET('/api/user/preferences');
    if (prefs.success) {
      this.setState({ preferences: prefs.data.data });
    }
  }
}

const app = new AcmeApp({ ... });
await app.start();
```

### Requiring a Group Before Showing Pages

```js
class AcmeApp extends PortalApp {
  async start() {
    await super.start();

    if (this.activeUser && this.needsGroupSelection()) {
      await this.showPage('select-group');
    }
  }
}
```

### Reacting to Group Changes in a Page

```js
class SalesPage extends Page {
  async onEnter() {
    await super.onEnter();
    const group = this.getApp().getActiveGroup();
    this.groupId = group ? group.get('id') : null;
    await this.loadData();
  }

  async onGroupChange(group) {
    // PortalApp calls this when setActiveGroup() is called
    this.groupId = group ? group.get('id') : null;
    await this.loadData();
    await this.render();
  }

  async loadData() {
    if (!this.groupId) return;
    await this.collection.fetch({ group: this.groupId });
  }
}
```

### Custom Portal Actions

```js
// Emit from any view
class NavbarView extends View {
  async onActionOpenSettings(event, element) {
    this.getApp().events.emit('portal:action', { action: 'open-settings' });
  }
}

// Handle in your app subclass
class AcmeApp extends PortalApp {
  onPortalAction({ action, ...data }) {
    if (action === 'open-settings') {
      this.showPage('settings');
      return;
    }
    // Pass everything else to the parent handler
    super.onPortalAction({ action, ...data });
  }
}
```

### Toast Notifications

`PortalApp` includes a `ToastService` at `app.toast`:

```js
// In any page or view
const app = this.getApp();

app.toast.success('Record saved!');
app.toast.error('Failed to connect');
app.toast.info('Refresh available');
app.toast.warning('Session expiring soon');

// With options
app.toast.success('Upload complete', {
  delay: 8000,
  title: 'File Upload'
});
```

---

## Common Pitfalls

### ⚠️ Accessing activeUser before start() completes

```js
// ❌ WRONG — user is not loaded until after start()
const app = new PortalApp(config);
console.log(app.activeUser); // null

// ✅ CORRECT — access after start() resolves
await app.start();
console.log(app.activeUser); // User model instance (or null if not authenticated)
```

### ⚠️ Not handling auth:unauthorized

If you don't listen for `'auth:unauthorized'`, the user will see a blank screen when their session expires.

```js
// ✅ Register before calling start()
app.events.on('auth:unauthorized', () => {
  window.location.href = '/login?reason=session_expired';
});

await app.start();
```

### ⚠️ Forgetting to update navigation after dynamic page changes

```js
// ❌ WRONG — sidebar may not highlight the new active page
await app.showPage('reports');

// ✅ CORRECT — navigate() via the router keeps the sidebar in sync
await app.navigate('/reports');
```

### ⚠️ Calling setActiveGroup() without awaiting

```js
// ❌ WRONG — member data may not be loaded before the page uses it
app.setActiveGroup(group);

// ✅ CORRECT
await app.setActiveGroup(group);
```

### ⚠️ Not awaiting showProfile() / changePassword()

These methods open modal dialogs and return a Promise that resolves when the dialog closes. If you need to act on the result, always await them.

```js
// ✅
const result = await app.showProfile();
if (result && result.submitted) {
  app.toast.success('Profile updated!');
}
```

---

## Related Documentation

- **[WebApp](./WebApp.md)** — The base class `PortalApp` extends
- **[Page](../pages/Page.md)** — The Page base class with `onEnter()`, `onExit()`, `onGroupChange()`
- **[Rest](../services/Rest.md)** — The REST HTTP client (`app.rest`)
- **[ToastService](../services/ToastService.md)** — Toast notifications (`app.toast`)
- **[Dialog](../components/Dialog.md)** — The dialog component used by built-in dialogs
- **[Events](./Events.md)** — EventBus and EventEmitter patterns
- **[Model](./Model.md)** — The User and Group models used internally

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/core/PortalApp/PortalAppExample.js`](../../../examples/portal/examples/core/PortalApp/PortalAppExample.js) — WebApp plus sidebar, topbar, auth, multi-tenant group, and toast notifications.

<!-- examples:cross-link end -->
