# MOJO Framework – Comprehensive Developer Guide & Leading Prompt

This document provides a detailed overview and reference for the MOJO Framework (`web-mojo`), suitable as a **leading prompt for LLMs** and as a practical developer guide. It covers core architecture, usage patterns, key components, API reference, idioms, and best practices for integrating MOJO into external projects.

---

## 1. Introduction to MOJO Framework

The **MOJO Framework** is a modern, lightweight, highly-composable JavaScript framework for building data-driven web applications.

### Key Features:
- MVC-inspired structure (Model, View, Page, Router, etc)
- Rich set of Consistent, Configurable UI Components
- Powerful EventBus for decoupled communication
- RESTful Model & Collection API integration
- Flexible templating with Mustache and pipes
- Works with Bootstrap 5+ UI ecosystem
- Designed for rapid prototyping AND robust production
- Single-page app (SPA) routing and page lifecycle hooks
- Developer tools, debug-friendly, extensible

---

## 2. Getting Started

### Installation (using NPM or your preferred method)
```bash
npm install web-mojo
```
Or include the relevant JS and CSS via `<script>` and `<link>` tags for browser use.

### Main Entry Points

- `import * as MOJO from 'web-mojo'`
- Or for specific classes: `import { WebApp, Page, Model, View, Table } from 'web-mojo'`

---

## 3. Framework Architecture & Concepts

### Core Constructs

- **WebApp**: The main app container/manager. Handles config, routing, layout, and global state.
- **Router**: Manages URL changes, resolves routes to pages, handles navigation, history, and URL queries.
- **Page**: Extends View; represents routed pages, has lifecycle (onEnter/onExit/onParams).
- **View**: Visual UI components or whole sections; can be class-based or configured ad hoc.
- **Model**: Structured data entity, RESTful CRUD (get/set, save, fetch, destroy).
- **Collection**: List of Models, with RESTful fetch, add, remove, reset, sort.
- **EventBus**: Decoupled global event system for communication.

### Core Workflow

1. **Create a WebApp** with routes, navigation, API config.
2. **Register pages & components** to the app.
3. **Define Models/Collections** for your data source.
4. Launch! Use routing and event system to interact.

---

## 4. Component & Utility Reference

### WebApp

```js
import { WebApp } from 'web-mojo';

const app = new WebApp({
  name: 'MyApp',
  debug: true,
  container: '#app',
  routerMode: 'param', // 'param'|'hash'|'history'
  api: { baseUrl: '/api' },
  navigation: { /* sidebar/topnav config */ }
});

app.registerPage('home', HomePage);
app.registerPage('users', UsersPage, { route: '/users' });
app.start();
```

### Router

- Mode: `param`, `hash`, or `history`
- Register routes: `app.router.addRoute('/users/:id', 'userDetail')`
- Programmatic navigation: `app.navigate('users', {id: 42})` or `app.router.navigate('/users/42')`

### View

- Create custom components by extending `View`.
- Mustache templating with support for `this.data`, `this.model`, and pipe formatters.
- Lifecycle: `onInit`, `onBeforeRender`, `onAfterRender`, `onBeforeMount`, `onAfterMount`, `onBeforeDestroy`, `onAfterDestroy`
- Add child views: `this.addChild(childView, 'key')`
- don't use onAfterMount, use onAfterRender when view is ready and in DOM

### Page

- Extends `View` and adds route-awareness and lifecycle (`onEnter`, `onExit`, `onParams`)
- Best used for single-page-app "screens" routed by the Router
- Example:
```js
class UsersPage extends Page {
  constructor(options) {
    super({ ...options, pageName: 'users', route: '/users' });
    // ...
  }
  async onEnter() {
    await this.model.fetch();
    await this.render();
  }
}
```

### Model & Collection

```js
import { Model, Collection } from 'web-mojo';

class User extends Model {
  static endpoint = '/api/users';
}
const user = new User({id: 1});
await user.fetch();
user.set('name', 'Jane');
await user.save();
await user.destroy();

class UserList extends Collection {
  constructor(options = {}) { super(User, options); }
}
const users = new UserList();
await users.fetch();
```

### Components – API and Idioms

#### TopNav

A flexible Bootstrap-based top navigation bar, customizable via config. Useful for branding and main navigation.

```js
import { TopNav } from 'web-mojo';

const topnav = new TopNav({
  className: 'navbar navbar-expand-lg navbar-dark bg-primary',
  data: {
    brandText: 'My App',
    brandRoute: '/',
    navItems: [
      { text: 'Home', route: '?page=home', icon: 'bi-house' },
      { text: 'Users', route: '?page=users', icon: 'bi-people' }
    ],
    rightItems: [
      {
        isDropdown: true,
        text: 'User',
        icon: 'bi-person',
        items: [
          { text: 'Profile', href: '?page=profile' },
          { divider: true },
          { text: 'Logout', action: 'logout' }
        ]
      }
    ]
  }
});
topnav.render(document.getElementById('nav-container'));
```

#### Sidebar

Collapsible side navigation, easily wired to routing and icons.

```js
import { Sidebar } from 'web-mojo';

const sidebar = new Sidebar({
  data: {
    brandText: 'MOJO Demo',
    navItems: [
      { text: 'Dashboard', route: '?page=dashboard', icon: 'bi-speedometer2' },
      { text: 'Settings', route: '?page=settings', icon: 'bi-gear' }
    ],
    footerContent: '<small>&copy; 2024</small>'
  }
});
sidebar.render(document.getElementById('sidebar'));
```

#### Table & TablePage

Powerful tabular data display with sorting, search, paging, REST or local, and event APIs.

```js
import { Table, TablePage } from 'web-mojo';

// Table: direct instantiation
const table = new Table({
  Collection: MyUserCollection,
  columns: [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'name', title: 'Name', filter: { type: 'text' } }
  ],
  searchable: true,
  filterable: true,
  paginated: true
});
table.on('item-clicked', ({item}) => showUserDetail(item));
table.render(document.getElementById('table'));

// TablePage: auto-URL sync
class UsersTablePage extends TablePage {
  constructor(opts = {}) {
    super({ ...opts, pageName: 'users', Collection: MyUserCollection, columns: [...] });
  }
}
```

#### Dialog

A full-featured modal system with alerts, confirms, custom views, forms, and syntax-highlighted code.

```js
import { Dialog } from 'web-mojo';

// Quick alert or confirm
Dialog.alert('Saved!');
const result = await Dialog.confirm('Are you sure?', 'Confirm');

// Custom dialog with a view as body
const dialog = new Dialog({
  title: 'User Info',
  body: myUserViewInstance,
  autoShow: true,
  buttons: [
    { text: 'Close', class: 'btn-secondary', dismiss: true },
    { text: 'Delete', class: 'btn-danger', action: 'delete-user' }
  ]
});
await dialog.render();
document.body.appendChild(dialog.element);
dialog.mount();
dialog.on('action:delete-user', () => {...});
dialog.show();
```

#### FormBuilder & FormView

Composable, validated, dynamic forms. Use as standalone or as views.

```js
import { FormBuilder, FormView } from 'web-mojo';

// With FormBuilder directly
const form = new FormBuilder({
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'password', type: 'password', label: 'Password', required: true }
  ],
  onSubmit(data) { console.log('Form submitted:', data); }
});
form.mount('#form');

// Best practice: Use FormView for structure and events
const formView = new FormView({
  formConfig: {
    fields: [...],
    onSubmit(data) { ... }
  }
});
formView.render('#form-container');
```

#### Model and Collection

The Model/Collection REST layer (CRUD, data binding, change events, etc.)

```js
import { Model, Collection } from 'web-mojo';

class User extends Model {
  static endpoint = '/api/users';
}
const user = new User({ id: 1 });
await user.fetch();
user.set('name', 'Jane');
await user.save();

class UserList extends Collection {
  constructor(opts) { super(User, opts); }
}
const users = new UserList();
await users.fetch();
users.on('add', () => { ... });
```

#### AuthService

Authentication + API integration, passkeys, and JWT utility.

```js
import { AuthService } from 'web-mojo';

const auth = new AuthService(app);
// Email+password
const { success, data } = await auth.login('me@example.com', 'pw1234');
if (success) { ... }
// Passkey (WebAuthn)
await auth.loginWithPasskey();
// Password reset/verification etc.
await auth.forgotPassword('email@demo.com');
```

#### DataFormatter

Universal pipe-style formatting for numbers, dates, strings, and custom business logic in templates or JS.

```js
import DataFormatter from 'web-mojo';
// In logic
DataFormatter.apply('currency', 123.45, '$', 2); // "$123.45"
DataFormatter.pipe('2024-03-15T12:00:00Z', "date('YYYY-MM-DD')"); // "2024-03-15"

// In Mustache templates
// {{ user.email|uppercase }}
// {{ model.registered_at|relative }}
```

#### JWTUtils

Convenience for querying and decoding JWTs with user/expiry info.

```js
import JWTUtils from 'web-mojo';

const token = localStorage.getItem('payomi_token');
const info = JWTUtils.getUserInfo(token);
if (JWTUtils.isExpired(token)) {
  // prompt for login again
}
const isAdmin = JWTUtils.hasRole(token, 'admin');
```

---

### View Templates: Inline vs. External (URL-based)

MOJO `View` classes/components use Mustache-based templates, which can be defined as either:

- **Inline templates:** Provide the HTML template as a string at class construction or via `template` property.
- **External (URL-based) templates:** Reference a `.mst`/`.html` template file by URL or relative/absolute path.

**MOJO automatically loads the template content if a URL is given, supporting both approaches interchangeably.**

#### Inline Template Example

```js
import { View } from 'web-mojo';

class GreetingView extends View {
  constructor(options = {}) {
    super({
      ...options,
      template: '<div>Hello, {{ name|capitalize }}!</div>',
      data: { name: 'world' }
    });
  }
}
const greet = new GreetingView();
greet.render('#inline-template-container');
```

#### External/URL-based Template Example

Suppose you have a file `src/components/example.mst`:
```mustache
<div>
   <h2>{{ title }}</h2>
   <p>{{ body }}</p>
</div>
```
Reference it in your View:

```js
import { View } from 'web-mojo';

class ExampleView extends View {
  constructor(options = {}) {
    super({
      ...options,
      template: '/src/components/example.mst', // Can be relative or absolute path/URL
      data: { title: 'Hi', body: 'External template loaded!' }
    });
  }
}
const ex = new ExampleView();
ex.render('#external-template-container');
```
**MOJO will fetch the template at runtime, cache it, and apply Mustache rendering.**

- The URL/path can be absolute, relative to the site, or a remote URL (if CORS permits).
- If using module bundlers or static asset servers, ensure the template file is accessible at the given path.
- For true dynamic composition, you may also pass a function as `template` that returns a string (sync or async).

#### Best Practices

- **Inline for small, simple, or reusable snippets/components.**
- **External/URL-based for complex, multi-line, or frequently-edited templates.**
- Use file extensions `.mst`, `.html`, or `.mustache` for discoverability and editor syntax highlighting.
- When using project base paths, MOJO will resolve them relative to `window.APP.basePath` if available – aiding in modular app structures.
- For full-featured pages or components, prefer keeping template and logic in separate files for code clarity.

---

---

## 5. Mustache Templating & Data Formatting

MOJO uses Mustache.js for templating, supporting powerful data pipes:

```mustache
<span>{{ user.name|uppercase }}</span>
<span>{{ user.created_at|date('YYYY-MM-DD') }}</span>
<span>{{ amount|currency('$',2) }}</span>
```
Supported built-in pipes: `date`, `number`, `currency`, `percent`, `filesize`, `ordinal`, `compact`, `truncate`, `capitalize`, `badge`, `status`, `boolean`, and more.

Custom formatters can be registered via `DataFormatter.register(name, fn)`.

---

## 6. Event System

- Global `EventBus`: `app.eventBus.emit('event', data)`, `app.eventBus.on('event', handler)`
- Namespaced events for modularity: `eventBus.namespace('user')`
- Used internally for routing events, notifications, etc.

---

## 7. Notifications, Loading, and Error Handling

- Built-in notification/toast system: `app.showSuccess('Saved!')`, `app.showError('Error!')`, etc.
- Loading overlays: `app.showLoading('Loading Users...')`, `app.hideLoading()`
- Robust global error handlers for API/JS errors

---

## 8. Extending & Integrating MOJO

- Extend any component or View via subclassing.
- Compose apps using modular directory structure (`/core`, `/components`, `/pages`, `/models`, `/utils`).
- Register custom models and collections: `app.registerModel('Widget', WidgetModel)`
- Mix and match with Bootstrap 5 classes and utility CSS.
- Use with module bundlers, or directly via `<script type="module">`.

---

## 9. Example Project Structure

```
/src
  /app
    WebApp.js
    Portal.js
  /components
    Table.js
    TablePage.js
    Dialog.js
    Sidebar.js
    …
  /core
    Model.js
    Collection.js
    Page.js
    Router.js
    View.js
  /pages
    HomePage.js
    UsersPage.js
    NotFoundPage.js
    ErrorPage.js
  /utils
    DataFormatter.js
    EventBus.js
    …
  index.js
```

---

## 10. Useful Idioms & Shortcuts

- Register a new page: `app.registerPage('profile', ProfilePage, { route: '/profile/:id' })`
- Get page instance: `const page = app.getCurrentPage();`
- Navigate: `app.navigate('users', { filter: 'active' })`
- Listen to global events: `app.eventBus.on('app:ready', handler)`

---

## 11. Framework Metadata

- Framework Name: **MOJO**
- Version: **2.0.0**
- Main Package: `web-mojo`
- Main Entry: `index.js`
- Core Exports: `WebApp`, `View`, `Page`, `Router`, `Model`, `Collection`, `Dialog`, `Table`, `Sidebar`, `TopNav`, `FormBuilder`, `FormView`, `EventBus`, `DataFormatter`, `MOJOUtils`, `AuthService`

---

## 12. Best Practices

- Keep business logic in Models/Collections, UI logic in Views/Pages
- Use the event system for async, decoupled communication
- Favor declarative field/config over imperative for forms and tables
- Start simple: only subclass when built-ins aren’t enough
- Leverage the built-in REST API integration—avoid $.ajax or fetch wrappers
- Deep link and sync state with urlParams in TablePage for shareable URLs
- Always handle errors (network, API, and UX)—use `app.showError` convenience methods

---

## 13. Example App Initialization

```js
import { WebApp, NotFoundPage, ErrorPage, HomePage, UsersPage } from 'web-mojo';

// Register pages
const app = new WebApp({
  name: 'DemoApp',
  container: '#app',
  debug: true,
  api: { baseUrl: '/api' },
  navigation: {
    // sidebar/topnav config
  }
});
app.registerPage('home', HomePage, { route: '/home' });
app.registerPage('users', UsersPage, { route: '/users' });
app.registerPage('404', NotFoundPage, { route: '/404' });
app.registerPage('error', ErrorPage, { route: '/error' });

app.start();
```

---

## 14. MOJO for Large-Scale and LLM-Powered Apps

- ***Every Page, View, Model, etc. is a class.*** All configuration is passed via options; all context is explicit (data–model–params).
- The page lifecycle (`onEnter`, `onExit`, `onParams`) is always honored; navigation, state, and rendering are deterministic.
- ***All framework functionality is strictly class or instance-based, never by string references or module side effects.***
- EventBus is the universal communication mechanism. Use it for cross-cutting LLM integrations and background agents.
- APIs, forms, tables: every interactive widget is decomposable for programmatic access by LLM agents.

---

## 15. Where to Learn More

- In-code JSDoc comments and usage examples
- Reference app: see `/src/index.js` and the `/pages` directory for starting points
- Each component/class exports minimally (never globalizes/monkey-patches)
- For questions or community: [Company/Community URL or Slack here]

---

## 16. Prompt Usage Guidelines (for LLMs)

- Treat all core classes and components as available by `import` or direct reference (`window.MOJO.*` where appropriate).
- When generating code, always instantiate components/pages/models with `new`.
- Programmatic interactions (navigation, loading, routing) are event- or method-based, not magical.
- For UI extension or testing, operate on the appropriate class instance (`app.getCurrentPage()`, etc).
- When reasoning about data, prefer using Models and Collections—they can always be subclassed or have hooks/events.

---

*This document is intended to be used as a **rich leading prompt** and onboarding guide for any LLM or developer working with MOJO, ensuring comprehensive context and predictable, correct reasoning about the framework and its idioms.*

---
