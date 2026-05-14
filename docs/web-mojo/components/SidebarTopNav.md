# Sidebar & TopNav

The `Sidebar` and `TopNav` are MOJO's built-in portal navigation components. They are configured through `PortalApp` and automatically handle route changes, active states, permission filtering, group switching, and responsive behaviour.

- **Sidebar** — collapsible left-hand navigation with multi-menu support, hierarchical items, parent/child submenus, group-based switching, and per-item permission guards
- **TopNav** — Bootstrap navbar with brand, nav links, dropdowns, user menu, group selector, and sidebar-toggle integration

Both components are instantiated by `PortalApp`. You configure them through `PortalApp` options and interact with them via `app.sidebar` and `app.topnav`.

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
          { label: 'Profile', icon: 'bi-person',          action: 'profile' },
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
| `menu` | `Object` | — | Shorthand for a single menu (`name` defaults to `"default"`) |
| `defaultMenu` | `string` | — | Name of the menu to show when no route match or page override applies. Falls back to the first non-group menu if not set. |
| `theme` | `string` | `'sidebar-light'` | CSS class added to the `<nav>` element |
| `showToggle` | `boolean` | `true` | Show the collapse/expand toggle button in the sidebar header |
| `autoCollapseMobile` | `boolean` | `true` | Add `sidebar-mobile` class on screens ≤ 768 px |
| `groupSelectorMode` | `'inline'\|'dialog'` | `'inline'` | How the group search/selector is shown: `'inline'` replaces the sidebar content; `'dialog'` opens a modal with a searchable tree |
| `groupHeader` | `string` | built-in | Mustache template for the group header row rendered above items when a group is active. The default template shows the group name and a chevron to open the group search, and a parent-group bar when the active group has a `parent`. |

---

### Menu Configuration

Each entry in the `menus` array accepts:

| Property | Type | Description |
|---|---|---|
| `name` | `string` | **Required.** Unique menu identifier |
| `items` | `Array` | Menu item definitions (see item types below) |
| `header` | `string` | Raw HTML rendered above the item list. Interpolated as a Mustache template with `{ group, user, version }` in scope. |
| `footer` | `string` | Raw HTML rendered below the item list. Same Mustache context as `header`. |
| `className` | `string` | Full CSS class string applied to the `<nav>` element while this menu is active (e.g. `'sidebar sidebar-dark'`) |
| `groupKind` | `string\|string[]` | If set, this menu is only activated for groups of that kind. Use `'any'` to match all group kinds not claimed by a more specific menu. |
| `data` | `Object` | Extra key/value pairs merged into the Mustache context for the menu's `header` and `footer` templates |

```js
sidebar: {
  menus: [
    {
      name: 'default',
      className: 'sidebar sidebar-light',
      header: '<div class="px-3 py-2 fs-6 fw-semibold">{{data.appName}}</div>',
      footer: '<div class="px-3 py-2 text-muted small">v{{version}}</div>',
      data: { appName: 'My App' },
      items: [ /* ... */ ]
    }
  ]
}
```

#### Header / Footer Mustache Context

The `header` and `footer` strings are processed as Mustache templates. Available variables:

| Variable | Value |
|---|---|
| `{{version}}` | `app.version` |
| `{{group.*}}` | Active group fields (`group.name`, `group.kind`, etc.) |
| `{{user.*}}` | Active user fields |
| `{{data.*}}` | Anything you pass in `menu.data` |

#### Auto-generated Group Settings link

When a menu has `groupKind` set and the active user holds `manage_groups` or `manage_group` permission, the sidebar automatically injects a **Group Settings** item (`data-action="group-settings"`) into the items list — before the first `spacer` item if one exists, otherwise appended at the end. Clicking it opens a `GroupView` modal for the active group. No additional configuration is required.

---

### Menu Item Types

All item types support the following common fields unless noted otherwise:

| Property | Type | Description |
|---|---|---|
| `permissions` | `string\|string[]` | Hide this item unless the active user holds all listed permissions |
| `requiresGroupKind` | `string\|string[]` | Hide this item unless the active group's `kind` matches |

#### Route item — navigate to a page

```js
{
  text:  'Dashboard',
  route: '?page=dashboard',   // full query string or /path
  icon:  'bi-speedometer2',
}
```

Alternatively use `page` as a shorthand — it is converted to `?page=<value>` automatically:

```js
{ text: 'Dashboard', page: 'dashboard', icon: 'bi-speedometer2' }
```

| Property | Type | Description |
|---|---|---|
| `text` | `string` | Label displayed next to the icon |
| `route` | `string` | URL or query string passed to the router |
| `page` | `string` | Page name shorthand — equivalent to `route: '?page=<value>'` |
| `icon` | `string` | Bootstrap Icon class (`bi-*`) |
| `iconHtml` | `string` | Raw HTML rendered in place of `icon` (triple-brace, unescaped). Use for custom SVGs or non-Bootstrap markup. Takes precedence over `icon` when both are set. |
| `badge` | `Object` | `{ text, class }` — badge shown at the right of the item |
| `tooltip` | `string` | Tooltip shown in collapsed state (also auto-derived from `text` when collapsed) |
| `disabled` | `boolean` | Grays out and disables the item |

When the sidebar is in the **collapsed** state (icon-only strip), Bootstrap tooltips are automatically initialised on all nav links using the item's `text`. Tooltips are destroyed when the sidebar expands.

#### Action item — triggers a handler

```js
{
  text:    'Open Report',
  action:  'open-report',
  icon:    'bi-file-earmark-bar-graph',
  handler: async (action, event, el, app) => {
    app.showDialog({ body: new ReportView() });
  }
}
```

If no `handler` is supplied, the action is dispatched to `portal:action` on the app event bus (see [Action Handling](#action-handling)).

#### Submenu item — collapsible parent with children

A parent item has a `children` array. The parent renders as a collapsible toggle; children render as an indented sub-list below it.

```js
{
  text: 'Reports',
  icon: 'bi-graph-up',
  children: [
    { text: 'Sales',    route: '?page=sales-report',    icon: 'bi-bar-chart' },
    { text: 'People',   route: '?page=people-report',   icon: 'bi-people'    },
    { text: 'Export',   action: 'export-all',           icon: 'bi-download'  },
  ]
}
```

- Children support `route`, `page`, `action`, `icon`, `iconHtml`, `badge`, `permissions`, and `requiresGroupKind` — the same properties as top-level items.
- When any child is active, the parent is also marked active and the collapse is held open.
- Nesting beyond **two levels** is not supported.

#### Divider

```js
{ divider: true }
```

Renders a horizontal `<hr>` rule between items.

#### Spacer

```js
{ spacer: true }
```

Inserts a flex gap (useful for pushing items to the bottom of the sidebar).

#### Label (section heading)

```js
{ text: 'Configuration', kind: 'label' }
```

Renders a non-interactive section heading. Use `text` for the label content and `kind: 'label'` to flag the item type.

> **Note:** The `kind` property (not `type`) is what the sidebar reads. The rendered partial uses `{{text}}`.

---

### Multiple Menus

Register multiple menus and switch between them programmatically or automatically via route matching.

```js
sidebar: {
  defaultMenu: 'main',
  menus: [
    {
      name: 'main',
      className: 'sidebar sidebar-light',
      items: [
        { text: 'Home',     route: '?page=home',     icon: 'bi-house'   },
        { text: 'Projects', route: '?page=projects', icon: 'bi-kanban'  },
      ]
    },
    {
      name: 'admin',
      className: 'sidebar sidebar-dark',
      header: "<div class='text-center py-2'><i class='bi bi-shield-lock'></i> Admin</div>",
      items: [
        { text: 'Users',      route: '?page=admin-users',   icon: 'bi-people'    },
        { text: 'System',     route: '?page=admin-system',  icon: 'bi-cpu'       },
        { divider: true },
        { text: 'Exit Admin', action: 'exit-admin',          icon: 'bi-door-open' }
      ]
    }
  ]
}
```

Switch menus at runtime:

```js
await app.sidebar.setActiveMenu('admin');
await app.sidebar.setActiveMenu('main');
```

The sidebar auto-switches on route changes: if the incoming route is found in a different menu, that menu becomes active. Pages that aren't in any menu use the fallback chain — see [Homeless Pages](#homeless-pages).

---

### Group-Based Menus

Set `groupKind` on a menu to make it activate automatically when the user selects a group of that kind.

```js
{
  name: 'org-menu',
  groupKind: 'organization',    // also accepts an array: ['org', 'company']
  // header is auto-set to the built-in group header template when groupKind is present
  items: [
    { text: 'Overview', route: '?page=org-overview', icon: 'bi-building'       },
    { text: 'Members',  route: '?page=org-members',  icon: 'bi-people'         },
    { spacer: true },
    { text: 'Leave Org', action: 'leave-group',      icon: 'bi-box-arrow-left' }
  ]
},
{
  name: 'any-group-menu',
  groupKind: 'any',   // catch-all — activates for any group not matched above
  items: [ /* ... */ ]
}
```

`groupKind: 'any'` is a catch-all evaluated after all specific-kind menus. The sidebar evaluates menus in registration order.

#### Built-in group header

When `groupKind` is set and no custom `header` is provided, the sidebar renders its built-in group header. It includes:

- A **parent group bar** (when the active group has a `parent`) — click it to navigate up to the parent group after a confirmation prompt.
- A **selected-group row** showing the group name and kind — click it to open the group search/selector.

You can override the entire header with `groupHeader` at the `Sidebar` constructor level, or per-menu with the `header` property.

---

### Group Selector Mode

The group selector is triggered when clicking the group header. The display mode is controlled by `groupSelectorMode`:

| Value | Behaviour |
|---|---|
| `'inline'` (default) | Replaces the sidebar content with an inline search list. An **Exit** button returns to the menu. |
| `'dialog'` | Opens a modal with a searchable, tree-structured group list. Useful when the sidebar should remain visible during selection. |

```js
sidebar: {
  groupSelectorMode: 'dialog',
  menus: [ /* ... */ ]
}
```

---

### Sidebar Methods

#### Menu Management

```js
// Add a menu (also available at construction time via options.menus)
app.sidebar.addMenu('my-menu', {
  items: [{ text: 'Item', route: '?page=item', icon: 'bi-circle' }]
});

// Switch the active menu (async — await when order matters)
await app.sidebar.setActiveMenu('admin');

// Check existence
if (app.sidebar.hasMenu('admin')) { /* ... */ }

// Get a menu's config object (live reference — mutations take effect on next render)
const config = app.sidebar.getMenuConfig('default');

// Get the currently active menu's config
const current = app.sidebar.getCurrentMenuConfig();

// Merge updates into a menu and re-render if it is currently active
app.sidebar.updateMenu('default', {
  header: '<div class="p-3 fw-bold">Updated Header</div>',
  items:  [ /* new item list */ ]
});

// Remove a menu (falls back to the first remaining menu)
app.sidebar.removeMenu('old-menu');

// Remove all menus
app.sidebar.clearMenus();

// Get an array of all registered menu names
const names = app.sidebar.getMenuNames(); // ['default', 'admin', ...]

// Add a single item to an existing menu's item list and re-render
app.sidebar.addSimpleMenuItem('default', 'New Page', '?page=new', 'bi-plus-circle');

// Replace a menu entirely and switch to it (convenience wrapper)
app.sidebar.setSimpleMenu('quick', '<div>Quick</div>', [
  { text: 'A', route: '?page=a', icon: 'bi-circle' }
]);
```

#### Menu Data (header/footer template variables)

```js
// Merge extra data into the active menu's Mustache context for header/footer templates
app.sidebar.setMenuData({ version: '2.1.0', username: 'Alice' });

// Read it back
const data = app.sidebar.getMenuData();
```

> **Important:** `setMenuData` and `getMenuData` operate on the **currently active menu** only. To update a specific menu's data, use `app.sidebar.updateMenu(name, { data: { ... } })`.

#### State & Collapse

```js
app.sidebar.collapse();          // Collapse to icon-only strip (adds 'collapse-sidebar' class to portal)
app.sidebar.expand();            // Restore full width
app.sidebar.toggleSidebar();     // Toggle between collapsed / expanded

// Set state explicitly
app.sidebar.setSidebarState('normal');    // full width
app.sidebar.setSidebarState('collapsed'); // icon-only strip with tooltips
app.sidebar.setSidebarState('hidden');    // completely hidden (no space taken)

// Read state
const state     = app.sidebar.getSidebarState();  // 'normal' | 'collapsed' | 'hidden'
const collapsed = app.sidebar.isCollapsedState(); // boolean

// Enable / disable the collapse toggle button
app.sidebar.setToggleEnabled(false);

// Animate the toggle button to draw attention
app.sidebar.pulseToggle();
```

#### Visibility

```js
app.sidebar.show();   // setSidebarState('normal')
app.sidebar.hide();   // setSidebarState('hidden')
```

#### Active Item

```js
// Programmatically set active item by route
app.sidebar.setActiveItemByRoute('?page=dashboard');

// Refresh active item for the current route (also re-renders)
await app.sidebar.updateActiveItem(route);
```

#### Group Search / Selector

```js
app.sidebar.showGroupSearch();  // Show inline search or open dialog (per groupSelectorMode)
app.sidebar.hideGroupSearch();  // Dismiss inline search or close dialog
```

#### Custom View

Replace the entire sidebar content with any view:

```js
const myView = new MyCustomSidebarView();
app.sidebar.setCustomView(myView);  // renders myView inside the sidebar
app.sidebar.clearCustomView();       // restores the normal menu
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

The `className` on a menu config controls the full class string on the `<nav>` element when that menu is active.

| Class | Appearance |
|---|---|
| `sidebar sidebar-light` | White/light-surface background, dark text (default) |
| `sidebar sidebar-dark` | Dark background, light text |

`sidebar-light` and `sidebar-dark` are theme-agnostic — they work independently of `data-bs-theme`. Under `data-bs-theme="dark"`, `sidebar-light` renders against a slightly lighter surface than the page background to preserve visual hierarchy.

Custom themes — add your own CSS:

```css
.sidebar-brand { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
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
| `theme` | `string` | `'light'` | Named theme: `'light'`, `'dark'`, `'clean'`, `'gradient'`, or `'auto'` |
| `shadow` | `string` | — | Optional shadow suffix: `'sm'`, `'light'`, `'dark'`, or `'auto'` |
| `displayMode` | `string` | `'both'` | What to show in the left section (see Display Modes) |
| `showSidebarToggle` | `boolean` | `false` | Show a sidebar collapse toggle button in the navbar |
| `sidebarToggleAction` | `string` | `'toggle-sidebar'` | `data-action` value for the toggle button |
| `navItems` | `Array` | `[]` | Left-side nav links |
| `rightItems` | `Array` | `[]` | Right-side items (buttons, dropdowns, user menu, group selector) |
| `showPageIcon` | `boolean` | `true` | Show the page icon next to the page name in `page`/`both` mode |
| `showPageDescription` | `boolean` | `false` | Show the page `description` below the page name |
| `groupIcon` | `string` | `'bi-building'` | Icon shown before the group name in `group` display modes |

---

### Display Modes

Controls what appears in the left section of the navbar:

| Mode | Left content |
|---|---|
| `'brand'` | Logo + app name (links to `brandRoute`) |
| `'page'` | Current page icon + name |
| `'both'` | Current page icon + name (same as `'page'`) |
| `'menu'` | Left-side nav links only — no brand or page block |
| `'group'` | Active group name (click → opens group selector) |
| `'group_page_titles'` | Active group name **+** current page name side by side |

```js
topbar: {
  displayMode: 'group_page_titles',
  groupIcon:   'bi-people',
  // ...
}
```

---

### TopNav Themes

| Theme | CSS classes applied |
|---|---|
| `'light'` | `navbar navbar-expand-lg navbar-light topnav-light` |
| `'dark'` | `navbar navbar-expand-lg navbar-dark topnav-dark` |
| `'clean'` | `navbar navbar-expand-lg navbar-light topnav-clean` |
| `'gradient'` | `navbar navbar-expand-lg navbar-dark topnav-gradient` |

#### Auto Theme

Pass `theme: 'auto'` (and optionally `shadow: 'auto'`) to follow `<html data-bs-theme>` live. A `MutationObserver` swaps the theme class tokens whenever the global theme changes — no re-render needed.

```js
topbar: { theme: 'auto', shadow: 'auto' }
```

---

### Right Items

#### Button

A right item is rendered as a `<button>` when `buttonClass` is supplied.

```js
{
  id:          'notifications',
  icon:        'bi-bell',
  action:      'show-notifications',
  buttonClass: 'btn btn-link text-white position-relative',
  tooltip:     'Notifications',
  badge:       '5'
}
```

| Property | Description |
|---|---|
| `id` | Unique identifier — used to find/replace this item via `findMenuItem`/`replaceMenuItem` |
| `icon` | Bootstrap Icon class |
| `iconHtml` | Raw HTML icon (triple-brace rendered — use for custom images or non-Bootstrap icons) |
| `action` | `data-action` value dispatched on click |
| `buttonClass` | CSS classes for the `<button>` element |
| `tooltip` | Bootstrap tooltip text |
| `badge` | Badge text (displayed inside the button) |
| `handler` | Inline function `(action, event, el) => {}` — bypasses `portal:action` |
| `permissions` | `string\|string[]` — hide unless the active user holds these permissions |

#### Dropdown Menu

A right item is rendered as a dropdown when it has an `items` array.

```js
{
  id:    'tools',
  label: 'Tools',
  icon:  'bi-tools',
  items: [
    { label: 'Import', action: 'import-data', icon: 'bi-upload'   },
    { divider: true },
    { header: 'Exports' },
    { label: 'Export', action: 'export-data', icon: 'bi-download' },
    { text:  'Last export: <strong>today</strong>' }
  ]
}
```

Dropdown `items` support four entry shapes:

| Shape | Renders as |
|---|---|
| `{ label, action?, route?, icon? }` | Clickable `dropdown-item`. Use `action` to emit; use `route` to navigate. |
| `{ divider: true }` | `<hr class="dropdown-divider">` |
| `{ header: 'Section name' }` | Bootstrap `dropdown-header` |
| `{ text: 'Any <strong>HTML</strong>' }` | `dropdown-item-text` — non-clickable, HTML rendered unescaped |

Each item can also have:
- `permissions` — hide unless the active user holds these permissions
- `handler` — inline function `(action, event, el) => {}` — bypasses `portal:action`

#### Link

A right item is rendered as a plain `<a>` link when it has `href` but no `buttonClass`.

```js
{
  id:       'docs',
  label:    'Docs',
  icon:     'bi-book',
  href:     'https://docs.example.com/',
  external: true
}
```

#### User Menu (special dropdown)

The item with `id: 'user'` is the conventional user menu. Call `app.topnav.setUser(userModel)` to populate it with the logged-in user's name and avatar; call `setUser(null)` to revert to the login menu.

```js
rightItems: [
  {
    id:    'user',
    label: 'Account',
    icon:  'bi-person-circle',
    items: [
      { label: 'Profile',  icon: 'bi-person',          action: 'profile'        },
      { label: 'Settings', icon: 'bi-gear',             route:  '?page=settings' },
      { divider: true },
      { label: 'Logout',   icon: 'bi-box-arrow-right',  action: 'logout'         }
    ]
  }
]
```

```js
app.topnav.setUser(userModel);  // sets label + avatar from model, triggers re-render
app.topnav.setUser(null);       // swaps back to loginMenu
```

When a `userModel` is set, `display_name` is used as the label. If the model has an `avatar` (with `url` or `renditions.square_sm.url`), it is shown as a small circular image replacing the icon.

#### Group Selector Button

Inserts a `GroupSelectorButton` component into the navbar. Clicking it opens a searchable group picker.

```js
rightItems: [
  {
    id:          'group-selector',
    type:        'group-selector',
    defaultText: 'Select Group',
    buttonClass: 'btn btn-outline-light btn-sm'
  }
]
```

All options pass through directly to `GroupSelectorButton`:

| Property | Description |
|---|---|
| `defaultText` | Button label when no group is selected |
| `buttonClass` | CSS classes for the trigger button |
| `buttonIcon` | Bootstrap Icon class for the trigger button |
| `Collection` | Group collection class (defaults to `GroupList`) |
| `collection` | Pre-instantiated collection instance |
| `currentGroup` | Initially selected group |
| `itemTemplate` | Mustache template for each group row in the picker |
| `searchFields` | Fields to search on (default: `['name']`) |
| `headerText` | Text shown above the search input |
| `searchPlaceholder` | Placeholder for the search field |
| `autoSetActiveGroup` | If `true` (default), calls `app.setActiveGroup()` on selection |
| `onGroupSelected` | Callback `(group) => {}` invoked on selection |

---

### Permission-Based Items

Any right item or nav item accepts a `permissions` field. Items are hidden unless the active user holds all listed permissions.

```js
rightItems: [
  { label: 'Admin Panel', icon: 'bi-shield-lock',  action: 'open-admin',    permissions: 'view_admin'                         },
  { label: 'Management',  icon: 'bi-briefcase',    permissions: ['manage_users', 'manage_groups'], items: [ /* ... */ ] }
]
```

---

### Nav Items (left side)

`navItems` renders as `<li class="nav-item">` links inside the navbar collapse area (left of the rightItems). Use for top-level horizontal navigation links.

```js
navItems: [
  { text: 'Home',    route: '?page=home',    icon: 'bi-house'    },
  { text: 'Reports', route: '?page=reports', icon: 'bi-graph-up' },
]
```

The currently active item is highlighted automatically based on route matching.

---

### TopNav Methods

```js
// Update brand name and optionally icon
app.topnav.setBrand('New Brand Name', 'bi-star');

// Set the logged-in user (populates the 'user' dropdown item)
app.topnav.setUser(userModel);
app.topnav.setUser(null);          // revert to login menu

// Find an item by id (searches navItems then rightItems)
const item = app.topnav.findMenuItem('user');

// Replace an item by id (works for navItems and rightItems)
app.topnav.replaceMenuItem('user', {
  id: 'user', label: 'Alice', icon: 'bi-person-circle', items: [ /* ... */ ]
});
```

---

### Action Handling

Actions from nav items, sidebar items, and right items are dispatched through a common pipeline:

1. **Inline `handler`** on the item — called directly; `portal:action` is **not** emitted.
2. **`onAction<CamelCase>`** method on the component — e.g. `onActionLogout` on `TopNav`.
3. **`portal:action` event** on the app event bus — the catch-all for anything not handled above.

```js
// Listen for all unhandled actions
app.events.on('portal:action', ({ action, event, el }) => {
  switch (action) {
    case 'profile':             app.navigate('?page=profile');              break;
    case 'logout':              app.logout();                               break;
    case 'show-notifications':  app.showDialog({ body: new NotifView() }); break;
    case 'exit-admin':          app.sidebar.setActiveMenu('main');          break;
  }
});
```

Inline handlers bypass the event bus entirely — use them for self-contained, local interactions:

```js
{
  text:    'Refresh',
  action:  'refresh',
  icon:    'bi-arrow-clockwise',
  handler: async (action, event, el, app) => {
    await app.sidebar.updateActiveItem(app.router.getCurrentPath());
  }
}
```

---

## Menu Selection Order

When a route change fires, the sidebar resolves the active menu using this priority chain:

1. **`page.sidebarMenu`** — the page class declares `sidebarMenu = 'menu-name'`. Highest priority, always wins.
2. **Route match** — the incoming route is found in a registered menu's items (including children). The sidebar switches to that menu.
3. **`defaultMenu`** — if configured and the route is not found anywhere.
4. **First non-group menu with visible items** — skips menus where every item is hidden by permissions or `requiresGroupKind`.
5. **First non-group menu** — last resort.

---

## Homeless Pages

A **homeless page** is a page whose route does not appear in any sidebar menu's items.

### Declaring a Menu on a Page

```js
export default class SettingsPage extends Page {
  sidebarMenu = 'default';    // pin to this menu regardless of route

  get title() { return 'Settings'; }
  get icon()  { return 'bi-gear'; }
  template = `<div class="p-4"><h1>Settings</h1></div>`;
}
```

### Pinning a Family of Pages via Inheritance

```js
// Base class declares the menu
class AdminDetailPage extends Page {
  sidebarMenu = 'admin';
}

// All subclasses inherit the menu pin — no extra config needed
class UserDetailPage   extends AdminDetailPage { /* route: ?page=user-detail&id=123  */ }
class GroupDetailPage  extends AdminDetailPage { /* route: ?page=group-detail&id=456 */ }
class AuditDetailPage  extends AdminDetailPage { /* route: ?page=audit-detail&id=789 */ }
```

### When No `sidebarMenu` Is Declared

The sidebar falls through:
1. `defaultMenu` (if configured).
2. First non-group menu with at least one visible item.
3. First non-group menu (absolute last resort).

```js
sidebar: {
  defaultMenu: 'main',
  menus: [
    { name: 'main',     /* ... */ },
    { name: 'admin',    /* ... */ },
    { name: 'org-menu', groupKind: 'organization', /* ... */ }
  ]
}
```

---

## Complete Example

```js
import PortalApp    from 'web-mojo/PortalApp';
import Page         from 'web-mojo/Page';

// ── Pages ────────────────────────────────────────────────────────────────────

class DashboardPage extends Page {
  get title()  { return 'Dashboard'; }
  get icon()   { return 'bi-speedometer2'; }
  template = `<div class="p-4"><h1>Dashboard</h1></div>`;
}

class UsersPage extends Page {
  get title()  { return 'Users'; }
  get icon()   { return 'bi-people'; }
  template = `<div class="p-4"><h1>Users</h1></div>`;
}

// Homeless page — pinned to 'main' menu via sidebarMenu
class UserDetailPage extends Page {
  sidebarMenu = 'main';
  get title()  { return 'User Detail'; }
  get icon()   { return 'bi-person'; }
  template = `<div class="p-4"><h2>{{model.display_name}}</h2></div>`;
  async onBeforeRender() {
    this.model = await User.fetch(this.options.params?.id);
  }
}

// Another homeless page — pinned to 'admin' menu
class ChangelogPage extends Page {
  sidebarMenu = 'admin';
  get title()  { return 'Changelog'; }
  template = `<div class="p-4"><h1>Changelog</h1></div>`;
}

// ── App ──────────────────────────────────────────────────────────────────────

const app = new PortalApp({
  api: { baseURL: '/api' },

  sidebar: {
    defaultMenu: 'main',
    groupSelectorMode: 'dialog',

    menus: [
      // ── Main menu ─────────────────────────────────────────────────────────
      {
        name:      'main',
        className: 'sidebar sidebar-light',
        header:    '<div class="px-3 py-2 fw-semibold fs-6">{{data.appName}}</div>',
        footer:    '<div class="px-3 py-2 text-muted small">v{{version}}</div>',
        data:      { appName: 'My App' },
        items: [
          { text: 'Dashboard', route: '?page=dashboard', icon: 'bi-speedometer2' },
          { divider: true },
          { text: 'Admin Area', action: 'enter-admin', icon: 'bi-shield-lock',
            permissions: 'view_admin' },
        ]
      },

      // ── Admin menu ────────────────────────────────────────────────────────
      {
        name:      'admin',
        className: 'sidebar sidebar-dark',
        header:    '<div class="text-center py-3"><i class="bi bi-shield-lock fs-4"></i><div class="fw-bold mt-1">Admin</div></div>',
        items: [
          { text: 'Users',   route: '?page=users',     icon: 'bi-people'    },
          { text: 'System',  route: '?page=system',    icon: 'bi-cpu'       },
          { divider: true },
          // Submenu parent with collapsible children
          { text: 'Reports', icon: 'bi-graph-up',
            children: [
              { text: 'Traffic',  route: '?page=report-traffic',  icon: 'bi-bar-chart'  },
              { text: 'Security', route: '?page=report-security', icon: 'bi-shield'     },
            ]
          },
          { divider: true },
          { text: 'Changelog', route: '?page=changelog', icon: 'bi-clock-history' },
          { spacer: true },
          { text: 'Exit Admin', action: 'exit-admin', icon: 'bi-door-open' }
        ]
      },

      // ── Group-kind menu ───────────────────────────────────────────────────
      {
        name:      'org-menu',
        groupKind: 'organization',
        // header auto-set to built-in group header (name, kind, parent bar)
        items: [
          { text: 'Overview', route: '?page=org-overview', icon: 'bi-building'       },
          { text: 'Members',  route: '?page=org-members',  icon: 'bi-people'         },
          { spacer: true },
          // requiresGroupKind: only shown when a sub-org is active
          { text: 'Sub-orgs', route: '?page=org-children', icon: 'bi-diagram-3',
            requiresGroupKind: 'sub-organization' },
          { text: 'Leave',    action: 'leave-org',          icon: 'bi-box-arrow-left' }
        ]
      }
    ]
  },

  topbar: {
    brand:             'My App',
    brandIcon:         'bi bi-play-circle',
    brandRoute:        '?page=dashboard',
    theme:             'auto',
    shadow:            'auto',
    showSidebarToggle: true,
    displayMode:       'page',

    rightItems: [
      // Notification button
      {
        id:          'notifications',
        icon:        'bi-bell',
        action:      'show-notifications',
        buttonClass: 'btn btn-link text-white position-relative',
        tooltip:     'Notifications',
        badge:       '3'
      },

      // Tools dropdown with permission guard
      {
        id:          'tools',
        label:       'Tools',
        icon:        'bi-tools',
        permissions: 'view_admin',
        items: [
          { label: 'Import', action: 'import-data', icon: 'bi-upload'   },
          { label: 'Export', action: 'export-data', icon: 'bi-download' }
        ]
      },

      // User dropdown (populated by app.topnav.setUser after login)
      {
        id:    'user',
        label: 'Account',
        icon:  'bi-person-circle',
        items: [
          { label: 'Profile',  icon: 'bi-person',          action: 'profile'        },
          { label: 'Settings', icon: 'bi-gear',             route:  '?page=settings' },
          { divider: true },
          { label: 'Logout',   icon: 'bi-box-arrow-right',  action: 'logout'         }
        ]
      }
    ]
  }
});

// ── Register pages ────────────────────────────────────────────────────────────
app.registerPage('dashboard',  DashboardPage);
app.registerPage('users',      UsersPage);
app.registerPage('user-detail', UserDetailPage);
app.registerPage('changelog',  ChangelogPage);

// ── Action handler ────────────────────────────────────────────────────────────
app.events.on('portal:action', async ({ action }) => {
  switch (action) {
    case 'profile':             app.navigate('?page=profile');                      break;
    case 'logout':              app.logout();                                        break;
    case 'show-notifications':  app.showDialog({ body: new NotifView() });          break;
    case 'enter-admin':         await app.sidebar.setActiveMenu('admin');           break;
    case 'exit-admin':          await app.sidebar.setActiveMenu('main');            break;
    case 'leave-org':           app.setActiveGroup(null);                           break;
  }
});

await app.start();
```

---

## Dynamic Menu Updates

Mutate a menu config and call `updateMenu` to re-render:

```js
const config = app.sidebar.getMenuConfig('default');
config.items.push({
  text:  'New Feature',
  route: '?page=new-feature',
  icon:  'bi-plus-circle',
  badge: { text: 'NEW', class: 'badge bg-success rounded-pill ms-auto' }
});
app.sidebar.updateMenu('default', config);
```

Or use the convenience method to append a single item:

```js
app.sidebar.addSimpleMenuItem('default', 'New Feature', '?page=new-feature', 'bi-plus-circle');
```

---

## Responsive Behaviour

On screens ≤ 768 px the sidebar adds `sidebar-mobile` to the portal container. All collapse/state methods work at any viewport size:

```js
app.sidebar.collapse();           // icon-only strip
app.sidebar.expand();             // full width
app.sidebar.toggleSidebar();

const state = app.sidebar.getSidebarState(); // 'normal' | 'collapsed' | 'hidden'
```

In **collapsed** state, Bootstrap tooltips are automatically initialised on all nav links. They show the item's `text` on hover and are destroyed when the sidebar expands.

---

## Common Pitfalls

- ⚠️ **Don't put `data-action` on `<form>` elements** in `header`/`footer` HTML — the framework's event delegation will intercept the form submit.
- ⚠️ **No more than 2 levels of nesting** — parent items have children; those children cannot themselves have children.
- ⚠️ **`groupKind` menus won't auto-switch** unless `app.activeGroup` is set. Call `app.setActiveGroup(group)` before switching.
- ⚠️ **`setActiveMenu` is async** — always `await` it when order matters (e.g. immediately navigating after switching).
- ⚠️ **`setMenuData` / `getMenuData` apply to the active menu only** — use `updateMenu(name, { data: {...} })` to target a specific menu by name.
- ⚠️ **Label items use `kind: 'label'`**, not `type: 'label'`. The displayed text comes from the `text` property, not `label`.
- ⚠️ **Homeless pages use the fallback chain** — declare `sidebarMenu` on the page class or configure `defaultMenu` so they land on the right menu.

---

## Related Documentation

- **[PortalApp](../core/PortalApp.md)**
- **[Page](../pages/Page.md)**
- **[Events](../core/Events.md)**
- **[Built-in Models](../models/BuiltinModels.md)**
