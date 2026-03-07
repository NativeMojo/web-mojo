# Sidebar & TopNav

The `Sidebar` and `TopNav` are MOJO's built-in portal navigation components. They are configured in `PortalApp` and automatically handle route changes, active states, permission filtering, group switching, and responsive behavior.

- **Sidebar** — collapsible left-hand navigation with multi-menu support, hierarchical items, and group-based switching
- **TopNav** — Bootstrap navbar with brand, nav links, dropdowns, user menu, and sidebar-toggle integration

Both components are instantiated by `PortalApp` — you rarely construct them directly. You configure them through the `PortalApp` options and interact with them via `app.sidebar` and `app.topnav`.

---

## Quick Start

```js
import PortalApp from 'web-mojo/PortalApp';
import DashboardPage from './pages/DashboardPage.js';
import SettingsPage  from './pages/SettingsPage.js';

const app = new PortalApp({
  sidebar: {
    menus: [{
      name: 'default',
      header: '<div class="p-3 fw-bold">My App</div>',
      items: [
        { text: 'Dashboard', route: '?page=dashboard', icon: 'bi-speedometer2' },
        { text: 'Settings',  route: '?page=settings',  icon: 'bi-gear' },
      ]
    }]
  },

  topbar: {
    brand: 'My App',
    brandIcon: 'bi bi-play-circle',
    brandRoute: '?page=dashboard',
    theme: 'dark',
    showSidebarToggle: true,
    rightItems: [
      {
        id: 'user',
        label: 'John Doe',
        icon: 'bi-person-circle',
        items: [
          { label: 'Profile', icon: 'bi-person',         action: 'profile' },
          { label: 'Logout',  icon: 'bi-box-arrow-right', action: 'logout' }
        ]
      }
    ]
  }
});

app.registerPage('dashboard', DashboardPage);
app.registerPage('settings',  SettingsPage);
await app.start();
```

---

## Sidebar

### Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `menus` | `Array` | `[]` | Array of menu config objects (see below) |
| `menu` | `Object` | — | Shorthand for a single menu (name defaults to `"default"`) |
| `theme` | `string` | `'sidebar-light'` | CSS class added to the `<nav>` element |
| `showToggle` | `boolean` | `true` | Show the collapse toggle button |
| `autoCollapseMobile` | `boolean` | `true` | Auto-collapse on small screens |
| `groupSelectorMode` | `'inline'\|'dialog'` | `'inline'` | How the group selector is displayed |
| `groupHeader` | `string` | built-in | Mustache template for the group header row |

### Menu Configuration

Each entry in the `menus` array accepts:

| Property | Type | Description |
|---|---|---|
| `name` | `string` | **Required.** Unique menu identifier |
| `items` | `Array` | Menu item definitions (see item types below) |
| `header` | `string` | Raw HTML rendered above the item list |
| `footer` | `string` | Raw HTML rendered below the item list |
| `className` | `string` | CSS classes applied to the `<nav>` when this menu is active |
| `groupKind` | `string\|string[]` | If set, this menu only activates for groups of that kind (use `'any'` for all groups) |
| `data` | `Object` | Extra data available to the header/footer template |

```js
sidebar: {
  menus: [
    {
      name: 'default',
      className: 'sidebar sidebar-light',
      header: '<div class="px-3 py-2 fs-6 fw-semibold">Navigation</div>',
      footer: '<div class="px-3 py-2 text-muted small">v2.0.0</div>',
      items: [ /* ... */ ]
    }
  ]
}
```

---

### Menu Item Types

#### Route item — navigate to a page

```js
{
  text:  'Dashboard',
  route: '?page=dashboard',
  icon:  'bi-speedometer2',
}
```

| Property | Type | Description |
|---|---|---|
| `text` | `string` | Label displayed next to the icon |
| `route` | `string` | URL or query string passed to the router |
| `icon` | `string` | Bootstrap Icon class (`bi-*`) |
| `badge` | `Object` | `{ text, class }` — optional badge shown at the right |
| `tooltip` | `string` | Tooltip shown in collapsed state |
| `disabled` | `boolean` | Grays out and disables the item |
| `permissions` | `string\|string[]` | Only show when the active user has these permissions |

#### Action item — triggers a handler

```js
{
  text:    'Open Report',
  action:  'open-report',
  icon:    'bi-file-earmark-bar-graph',
  handler: async (action, event, el) => {
    app.showDialog({ body: new ReportView() });
  }
}
```

The `handler` function runs when the item is clicked. If no `handler` is provided the action is dispatched to `onActionDefault` on the sidebar (which re-emits it as `portal:action` on the app event bus).

#### Submenu item — collapsible children

```js
{
  text: 'Reports',
  icon: 'bi-graph-up',
  children: [
    { text: 'Sales',  route: '?page=sales-report',  icon: 'bi-bar-chart' },
    { text: 'People', route: '?page=people-report', icon: 'bi-people' },
  ]
}
```

Children support the same properties as top-level items (including nested `action`, `badge`, `permissions`). Submenu nesting beyond **two levels** is not recommended.

#### Divider

```js
{ divider: true }
```

Renders a horizontal `<hr>` rule between items.

#### Spacer

```js
{ spacer: true }
```

Inserts a blank gap (useful for pushing items to the bottom).

#### Label

```js
{ label: 'Settings', type: 'label' }
```

Renders a non-interactive category heading.

---

### Multiple Menus

Register multiple menus and switch between them programmatically. This is the recommended pattern for apps that have distinct modes (e.g. a default view and an admin view, or per-group menus).

```js
sidebar: {
  menus: [
    {
      name: 'default',
      className: 'sidebar sidebar-light',
      items: [
        { text: 'Home', route: '?page=home', icon: 'bi-house' },
      ]
    },
    {
      name: 'admin',
      className: 'sidebar sidebar-dark',
      header: "<div class='text-center py-2'><i class='bi bi-shield-lock'></i> Admin</div>",
      items: [
        { text: 'Users',  route: '?page=admin-users',  icon: 'bi-people' },
        { text: 'System', route: '?page=admin-system', icon: 'bi-cpu' },
        { divider: true },
        { text: 'Exit Admin', action: 'exit-admin', icon: 'bi-door-open' }
      ]
    }
  ]
}
```

Switch menus at runtime:

```js
// Switch to the admin menu
await app.sidebar.setActiveMenu('admin');

// Switch back
await app.sidebar.setActiveMenu('default');
```

The sidebar auto-switches menus on route changes: if the new route is found in a different menu, that menu becomes active. See [Homeless Pages](#homeless-pages) for handling routes that aren't in any menu.

---

### Group-Based Menus

Set `groupKind` on a menu to make it activate automatically when the user selects a group of that kind.

```js
{
  name: 'org-menu',
  groupKind: 'organization',   // also accepts an array: ['org', 'company']
  header: // see groupHeader option — auto-set if groupKind is provided
  items: [
    { text: 'Overview',  route: '?page=org-overview', icon: 'bi-building' },
    { text: 'Members',   route: '?page=org-members',  icon: 'bi-people' },
    { divider: true },
    { text: 'Leave Org', action: 'leave-group',       icon: 'bi-box-arrow-left' }
  ]
},
{
  name: 'any-group-menu',
  groupKind: 'any',   // shows for any group type not matched above
  items: [/* ... */]
}
```

`groupKind: 'any'` is a catch-all — it activates for any group that doesn't match a more specific `groupKind`. The Sidebar evaluates menus in registration order.

---

### Sidebar Methods

#### Menu Management

```js
// Add a menu (also available at construction time via options.menus)
app.sidebar.addMenu('my-menu', {
  items: [{ text: 'Item', route: '?page=item', icon: 'bi-circle' }]
});

// Switch the active menu
await app.sidebar.setActiveMenu('admin');

// Check existence
if (app.sidebar.hasMenu('admin')) { /* ... */ }

// Get menu config (returns object, live reference — mutations take effect on next render)
const config = app.sidebar.getMenuConfig('default');

// Get the currently active menu config
const current = app.sidebar.getCurrentMenuConfig();

// Update a menu (merges updates and re-renders if active)
app.sidebar.updateMenu('default', {
  header: '<div class="p-3 fw-bold">Updated Header</div>',
  items:  [ /* new items */ ]
});

// Remove a menu (falls back to first remaining menu)
app.sidebar.removeMenu('old-menu');

// Remove all menus
app.sidebar.clearMenus();

// Get an array of all registered menu names
const names = app.sidebar.getMenuNames(); // ['default', 'admin', ...]
```

#### Item Data

```js
// Update the `data` bag available to header/footer templates of a menu
app.sidebar.setMenuData('default', { version: '2.1.0', username: 'Alice' });

// Read it back
const data = app.sidebar.getMenuData('default');
```

#### State & Collapse

```js
app.sidebar.collapse();          // Collapse to icon-only strip
app.sidebar.expand();            // Expand to full width
app.sidebar.toggleSidebar();     // Toggle between collapsed / expanded

// Set state explicitly: 'normal' | 'collapsed' | 'hidden'
app.sidebar.setSidebarState('collapsed');

// Read state
const state      = app.sidebar.getSidebarState();   // 'normal' | 'collapsed' | 'hidden'
const collapsed  = app.sidebar.isCollapsedState();  // boolean

// Enable / disable the collapse toggle button
app.sidebar.setToggleEnabled(false);

// Animate the toggle button to draw attention
app.sidebar.pulseToggle();
```

#### Visibility

```js
app.sidebar.show();   // Remove hide-sidebar class
app.sidebar.hide();   // Add hide-sidebar class (no space taken)
```

#### Active Item

```js
// Programmatically set active item by route
app.sidebar.setActiveItemByRoute('?page=dashboard');

// Refresh active item for the current route
await app.sidebar.updateActiveItem();
```

#### Group Search

```js
app.sidebar.showGroupSearch();  // Show inline group search / open dialog
app.sidebar.hideGroupSearch();  // Hide it
```

#### Theming

```js
app.sidebar.setSidebarTheme('sidebar-dark');
```

---

### Sidebar Events

Listen with `app.sidebar.on(event, handler)`:

| Event | Payload | Description |
|---|---|---|
| `menu-changed` | `{ menuName, config, sidebar }` | Fired after `setActiveMenu()` completes |
| `menu-auto-switched` | `{ menuName, route, config, sidebar }` | Fired when the sidebar auto-switches menus on a route change |

```js
app.sidebar.on('menu-changed', ({ menuName }) => {
  console.log('Now showing menu:', menuName);
});
```

---

### Sidebar Themes

The `className` on a menu config controls the full class string on the `<nav>` element when that menu is active. Built-in options:

| Class | Appearance |
|---|---|
| `sidebar sidebar-light` | White background, dark text (default) |
| `sidebar sidebar-dark` | Dark background, light text |

```js
// Programmatic switch (applies to current menu)
app.sidebar.setSidebarTheme('sidebar-dark');
```

Custom themes are easy — just add your own CSS:

```css
.sidebar-brand {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.sidebar-brand .nav-link { color: rgba(255,255,255,0.85); }
.sidebar-brand .nav-link.active,
.sidebar-brand .nav-link:hover { color: #fff; background: rgba(255,255,255,0.12); }
```

---

## TopNav

### Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `brand` | `string` | `'MOJO App'` | Brand text |
| `brandIcon` | `string` | `'bi bi-play-circle'` | Bootstrap Icon class for brand |
| `brandRoute` | `string` | `'/'` | Route navigated to when brand is clicked |
| `theme` | `string` | `'light'` | Named theme: `'light'`, `'dark'`, `'clean'`, `'gradient'` |
| `shadow` | `string` | — | Optional shadow class suffix (e.g. `'sm'` → `topnav-shadow-sm`) |
| `displayMode` | `string` | `'both'` | What to show left of the nav — see [Display Modes](#display-modes) |
| `showSidebarToggle` | `boolean` | `false` | Show sidebar collapse toggle in the navbar |
| `sidebarToggleAction` | `string` | `'toggle-sidebar'` | Action name for the toggle button |
| `navItems` | `Array` | `[]` | Left-side nav links |
| `rightItems` | `Array` | `[]` | Right-side items (buttons, dropdowns, user menu) |
| `showPageIcon` | `boolean` | `true` | Show page icon next to page name in `page`/`both` mode |
| `showPageDescription` | `boolean` | `false` | Show page description below page name |
| `groupIcon` | `string` | `'bi-building'` | Icon shown before group name in group display modes |

### Display Modes

The `displayMode` option controls what appears to the left of the navbar links:

| Mode | Left content |
|---|---|
| `'brand'` | Logo + app name (link to `brandRoute`) |
| `'page'` | Current page icon + name |
| `'both'` | Current page icon + name (same as `'page'` for now) |
| `'menu'` | Nav links only, no brand/page block |
| `'group'` | Active group name (clickable → opens group selector) |
| `'group_page_titles'` | Group name + current page name side by side |

```js
topbar: {
  displayMode: 'group_page_titles',
  groupIcon: 'bi-building'
}
```

---

### TopNav Themes

| Theme | Classes applied |
|---|---|
| `'light'` | `navbar navbar-expand-lg navbar-light topnav-light` |
| `'dark'` | `navbar navbar-expand-lg navbar-dark topnav-dark` |
| `'clean'` | `navbar navbar-expand-lg navbar-light topnav-clean` |
| `'gradient'` | `navbar navbar-expand-lg navbar-dark topnav-gradient` |

```js
topbar: { theme: 'dark' }
```

Custom Bootstrap theme:

```js
topbar: { theme: 'dark' }  // then in CSS:
```
```css
.topnav-dark { background: #1a1a2e; }
```

---

### Right Items

Right items appear at the far right of the navbar. Each item's rendered type is determined automatically by its properties.

#### Button

```js
{
  id: 'notifications',
  icon: 'bi-bell',
  action: 'show-notifications',
  buttonClass: 'btn btn-link text-white position-relative',
  tooltip: 'Notifications',
  badge: '5'        // rendered as a small badge on the icon
}
```

A right item becomes a **button** when `buttonClass` is provided.

#### Dropdown menu

```js
{
  id: 'tools',
  label: 'Tools',
  icon: 'bi-tools',
  items: [
    { label: 'Import', action: 'import-data', icon: 'bi-upload' },
    { divider: true },
    { label: 'Export', action: 'export-data', icon: 'bi-download' }
  ]
}
```

A right item becomes a **dropdown** when it has `items`.

Dropdown `items` support four distinct entry types:

| Shape | Renders as |
|---|---|
| `{ label, action?, icon? }` | Clickable `dropdown-item` |
| `{ divider: true }` | `<hr class="dropdown-divider">` |
| `{ header: 'Section name' }` | Bootstrap `dropdown-header` (non-clickable heading) |
| `{ text: 'Any <strong>HTML</strong>' }` | `dropdown-item-text` — non-clickable, HTML rendered |

Full example with all types:

```js
{
  id: 'tools',
  icon: 'bi-tools',
  label: 'Tools',
  permissions: ['admin_compliance', 'verify_tool_access'],
  items: [
    { text: 'Run as <strong>Admin</strong>' },          // raw HTML note
    { header: 'IP Tools' },                              // section heading
    { label: 'IP Lookup',         icon: 'bi-globe',        action: 'tool-ip-lookup' },
    { label: 'Reverse IP (PTR)',  icon: 'bi-arrow-repeat', action: 'tool-reverse-ip-lookup' },
    { label: 'Domain IP Lookup',  icon: 'bi-hdd-network',  action: 'tool-domain-ip-lookup' },
    { divider: true },
    { header: 'Domain Tools' },
    { label: 'SSL Domain Lookup', icon: 'bi-shield-lock',  action: 'tool-ssl-domain-lookup' },
    { label: 'Domain Lookup',     icon: 'bi-globe2',       action: 'tool-domain-lookup' },
  ]
}
```

> **`{ text }` renders raw HTML.** Never put user-supplied content there — it is inserted with `{{{triple braces}}}` and is not escaped.

#### Link

```js
{
  id: 'docs',
  label: 'Docs',
  icon: 'bi-book',
  href: 'https://nativemojo.com/web-mojo/',
  external: true
}
```

A right item becomes an `<a>` link when it has `href` but no `buttonClass`.

#### User menu (special dropdown)

The user menu is a dropdown with `id: 'user'`. TopNav automatically updates its `label` when `setUser()` is called.

```js
rightItems: [
  {
    id: 'user',
    label: 'Account',           // overwritten by setUser()
    icon: 'bi-person-circle',
    items: [
      { label: 'Profile',  icon: 'bi-person',          action: 'profile'  },
      { label: 'Settings', icon: 'bi-gear',             route: '?page=settings' },
      { divider: true },
      { label: 'Logout',   icon: 'bi-box-arrow-right',  action: 'logout'   }
    ]
  }
]
```

```js
// When the user logs in
app.topnav.setUser(userModel);   // updates the label + triggers re-render

// When the user logs out — swaps back to the loginMenu (if configured)
app.topnav.setUser(null);
```

#### Group Selector button

Add a live group-selector widget directly in the navbar:

```js
rightItems: [
  {
    id: 'group-selector',
    type: 'group-selector',
    // All GroupSelectorButton options are passed through:
    defaultText: 'Select Group',
    buttonClass: 'btn btn-outline-light btn-sm'
  }
]
```

---

### Permission-Based Items

Any item (nav, right, dropdown child) can declare `permissions`. The item is hidden if the active user does not satisfy the requirement.

```js
{
  label: 'Admin Panel',
  icon: 'bi-shield-lock',
  action: 'open-admin',
  permissions: 'view_admin'          // single permission string
},
{
  label: 'Management',
  icon: 'bi-briefcase',
  permissions: ['manage_users', 'manage_groups'],   // user must have ALL
  items: [ /* ... */ ]
}
```

Sidebar items support the same `permissions` property.

---

### Nav Items (left side)

`navItems` populate the `<ul>` on the left of the collapse. Each item needs `text` and `route`:

```js
navItems: [
  { text: 'Home',    route: '?page=home',    icon: 'bi-house'   },
  { text: 'Reports', route: '?page=reports', icon: 'bi-graph-up' },
]
```

Active state is automatically set based on the current route.

---

### TopNav Methods

```js
// Swap brand text (and optionally icon)
app.topnav.setBrand('New Brand Name', 'bi-star');

// Sync user menu label
app.topnav.setUser(userModel);   // model.get('display_name') is used as label

// Find a nav item or right item by id
const item = app.topnav.findMenuItem('user');

// Replace a menu item (triggers re-render)
app.topnav.replaceMenuItem('user', {
  id: 'user',
  label: 'Alice',
  icon: 'bi-person-circle',
  items: [ /* ... */ ]
});
```

---

### Action Handling

Actions emitted by both Sidebar and TopNav propagate to the app event bus so you can handle them from one place:

```js
app.events.on('portal:action', ({ action, event, el }) => {
  switch (action) {
    case 'profile':
      app.navigate('?page=profile');
      break;
    case 'logout':
      app.logout();
      break;
    case 'show-notifications':
      app.showDialog({ body: new NotificationsView() });
      break;
  }
});
```

For sidebar items with inline `handler` functions the handler is called directly and `portal:action` is **not** emitted:

```js
items: [
  {
    text: 'Refresh',
    action: 'refresh',
    icon: 'bi-arrow-clockwise',
    handler: async (action, event, el) => {
      await app.sidebar.updateActiveItem();
    }
  }
]
```

---

## Homeless Pages

A **homeless page** is a page whose route is not listed in any sidebar menu. Before the bug fix, navigating to a homeless page would leave the sidebar showing whatever menu happened to be registered last — producing confusing navigation state.

### How It Works Now

When a route change fires, the Sidebar resolves the active menu in this order:

1. **Route match** — if any registered menu contains the new route, switch to it.
2. **`sidebarMenu` property on the Page** — if the page declares `sidebarMenu`, switch to that menu.
3. **First non-group menu fallback** — switch to the first non-group menu so the sidebar always shows something sensible.

### Declaring a Menu on a Page

Add `sidebarMenu = 'menuName'` to your `Page` class:

```js
import { Page } from 'web-mojo';

export default class SettingsPage extends Page {
  // This page is not in any sidebar menu, but we want
  // the 'default' sidebar to remain visible.
  sidebarMenu = 'default';

  get title() { return 'Settings'; }
  get icon()  { return 'bi-gear'; }

  template = `
    <div class="p-4">
      <h1>Settings</h1>
      <!-- ... -->
    </div>
  `;
}
```

Now when the user navigates to `?page=settings`, the `default` menu stays active and no spurious menu-switch occurs.

### Pinning to a Specific Menu with a Route Prefix

For a whole group of homeless pages (e.g. all admin detail pages) you can keep them out of the sidebar but always show the `admin` menu:

```js
// Base class for all admin detail pages
class AdminDetailPage extends Page {
  sidebarMenu = 'admin';
}

class UserDetailPage extends AdminDetailPage {
  // route: ?page=user-detail&id=123
  // Not in any sidebar menu, but admin sidebar stays visible
}

class GroupDetailPage extends AdminDetailPage {
  // route: ?page=group-detail&id=456
}
```

### When No `sidebarMenu` Is Declared

If a homeless page doesn't declare `sidebarMenu`, the sidebar falls back to the **first non-group menu** registered. In most apps that's the `default` menu, which is usually the right behaviour.

If you have a specific fallback preference, register your menus in the desired fallback order:

```js
sidebar: {
  menus: [
    { name: 'default', /* ... */ },   // ← fallback will land here
    { name: 'admin',   /* ... */ },
    { name: 'org-menu', groupKind: 'organization', /* ... */ }
  ]
}
```

---

## Complete Example

```js
import PortalApp from 'web-mojo/PortalApp';
import { Page } from 'web-mojo';

// ── Pages ──────────────────────────────────────────────────
class DashboardPage extends Page {
  get title() { return 'Dashboard'; }
  get icon()  { return 'bi-speedometer2'; }
  template = `<div class="p-4"><h1>Dashboard</h1></div>`;
}

class UsersPage extends Page {
  get title() { return 'Users'; }
  get icon()  { return 'bi-people'; }
  template = `<div class="p-4"><h1>Users</h1></div>`;
}

// Homeless page — not in any menu, but wants the 'admin' sidebar
class UserDetailPage extends Page {
  sidebarMenu = 'admin';
  get title() { return 'User Detail'; }
  get icon()  { return 'bi-person'; }
  template = `<div class="p-4"><h1>User {{id}}</h1></div>`;
  async onBeforeRender() {
    await super.onBeforeRender();
    this.id = this.params?.id || '—';
  }
}

// Another homeless page — falls back to first non-group menu
class ChangelogPage extends Page {
  get title() { return 'Changelog'; }
  template = `<div class="p-4"><h1>Changelog</h1></div>`;
}

// ── App ───────────────────────────────────────────────────
const app = new PortalApp({
  api: { baseURL: 'https://api.example.com' },

  sidebar: {
    menus: [
      {
        name: 'default',
        className: 'sidebar sidebar-light',
        header: '<div class="px-3 py-3 fw-bold fs-6">Main</div>',
        items: [
          { text: 'Dashboard', route: '?page=dashboard', icon: 'bi-speedometer2' },
          { divider: true },
          { text: 'Profile',   action: 'profile',        icon: 'bi-person-circle' }
        ]
      },
      {
        name: 'admin',
        className: 'sidebar sidebar-dark',
        header: '<div class="px-3 py-3 fw-bold">Admin</div>',
        items: [
          { text: 'Users',     route: '?page=users',  icon: 'bi-people' },
          { text: 'System',    route: '?page=system', icon: 'bi-cpu'    },
          { divider: true },
          { text: 'Exit Admin', action: 'exit-admin', icon: 'bi-door-open' }
        ]
      },
      {
        name: 'org-menu',
        groupKind: 'organization',
        items: [
          { text: 'Overview', route: '?page=org-overview', icon: 'bi-building' },
          { text: 'Members',  route: '?page=org-members',  icon: 'bi-people'   },
          { divider: true },
          { text: 'Leave',    action: 'leave-group', icon: 'bi-box-arrow-left' }
        ]
      }
    ]
  },

  topbar: {
    brand: 'Acme Portal',
    brandIcon: 'bi bi-lightning-charge',
    brandRoute: '?page=dashboard',
    theme: 'dark',
    showSidebarToggle: true,
    displayMode: 'group_page_titles',

    rightItems: [
      {
        id: 'notifications',
        icon: 'bi-bell',
        action: 'show-notifications',
        buttonClass: 'btn btn-link text-white',
        tooltip: 'Notifications'
      },
      {
        id: 'user',
        label: 'Account',
        icon: 'bi-person-circle',
        items: [
          { label: 'Profile',  icon: 'bi-person',          action: 'profile' },
          { label: 'Settings', icon: 'bi-gear',             action: 'settings' },
          { divider: true },
          { label: 'Logout',   icon: 'bi-box-arrow-right',  action: 'logout' }
        ]
      }
    ]
  }
});

// Register pages
app.registerPage('dashboard',   DashboardPage);
app.registerPage('users',       UsersPage);
app.registerPage('user-detail', UserDetailPage);
app.registerPage('changelog',   ChangelogPage);

// Handle portal actions (fallback for items without inline handlers)
app.events.on('portal:action', ({ action }) => {
  switch (action) {
    case 'profile':
      app.navigate('?page=profile');
      break;
    case 'settings':
      app.navigate('?page=settings');
      break;
    case 'logout':
      app.logout();
      break;
    case 'show-notifications':
      app.showInfo('No new notifications');
      break;
    case 'exit-admin':
      app.sidebar.setActiveMenu('default');
      app.navigate('?page=dashboard');
      break;
    case 'leave-group':
      app.clearActiveGroup();
      app.sidebar.setActiveMenu('default');
      break;
  }
});

// When the user authenticates, push the user model to TopNav
app.events.on('auth:success', ({ user }) => {
  app.topnav.setUser(user);
});

await app.start();
```

---

## Dynamic Menu Updates

```js
// Add a menu item at runtime
const config = app.sidebar.getMenuConfig('default');
config.items.push({
  text:   'New Feature',
  route:  '?page=new-feature',
  icon:   'bi-plus-circle',
  badge:  { text: 'NEW', class: 'badge bg-success rounded-pill ms-auto' }
});
app.sidebar.updateMenu('default', config);

// Switch menu based on user role
app.events.on('portal:user-changed', ({ user }) => {
  app.topnav.setUser(user);

  if (user.hasPermission('admin')) {
    app.sidebar.setActiveMenu('admin');
  } else {
    app.sidebar.setActiveMenu('default');
  }
});
```

---

## Responsive Behavior

Both components handle responsive layout automatically.

```js
// Force collapse the sidebar (e.g. on a data-heavy page)
app.sidebar.collapse();

// Restore to normal
app.sidebar.expand();

// Toggle (useful for a custom toggle button elsewhere in the UI)
app.sidebar.toggleSidebar();

// React to collapse state
const state = app.sidebar.getSidebarState(); // 'normal' | 'collapsed' | 'hidden'
```

The sidebar collapses to icon-only on mobile (`autoCollapseMobile: true` by default). Collapsed-state tooltips are automatically initialized and destroyed as the sidebar transitions.

---

## Common Pitfalls

### ⚠️ Don't put `data-action` on `<form>` elements in header/footer HTML

The header/footer are raw HTML strings. If you include interactive elements, use Bootstrap components or route links rather than `data-action` attributes on forms.

### ⚠️ Avoid more than 2 levels of submenu nesting

The template partial for `nav-item` supports one level of `children`. Deeper nesting is not rendered.

### ⚠️ `groupKind` menus won't auto-switch unless `app.activeGroup` is set

If no group is active, group menus are skipped during `autoSwitchToMenuForRoute`. Always call `app.setActiveGroup(group)` before expecting a group menu to appear.

### ⚠️ `setActiveMenu` is async — await it when order matters

```js
// ✅ CORRECT
await app.sidebar.setActiveMenu('admin');
app.navigate('?page=admin-users');

// ❌ WRONG — menu may not have finished rendering
app.sidebar.setActiveMenu('admin');
app.navigate('?page=admin-users');
```

### ⚠️ Homeless pages default to the first non-group menu

If navigating to a page that isn't in any sidebar menu and you don't declare `sidebarMenu` on the page, the sidebar falls back to the **first registered non-group menu**. Register your menus in preference order to control this behaviour.

---

## Related Documentation

- **[PortalApp](../core/PortalApp.md)** — how Sidebar and TopNav are instantiated and wired
- **[Page](../pages/Page.md)** — `sidebarMenu`, `title`, `icon`, and routing lifecycle
- **[Events](../core/Events.md)** — `portal:action`, `group:changed`, `page:show` events
- **[Built-in Models](../models/BuiltinModels.md)** — User and Group models used by these components