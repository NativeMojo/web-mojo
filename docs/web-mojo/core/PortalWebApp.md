# PortalWebApp

**PortalWebApp** extends [PortalApp](./PortalApp.md) with an opinionated, auth-gated startup lifecycle, automatic WebSocket setup, and clean lifecycle events.

Use `PortalWebApp` when you want the full portal shell and need authentication enforced before any page is shown, real-time WebSocket connectivity after login, and built-in redirect behaviour on session failure — all without writing boilerplate lifecycle code. For lower-level control over the auth flow, use `PortalApp` directly and handle `auth:unauthorized` yourself.

---

## Table of Contents

- [Overview](#overview)
- [When to Use PortalWebApp vs PortalApp](#when-to-use-portalwebapp-vs-portalapp)
- [Quick Start](#quick-start)
- [Constructor Options](#constructor-options)
- [Startup Lifecycle](#startup-lifecycle)
- [Events](#events)
- [Overridable Hook: onAuthFailed](#overridable-hook-onauthfailed)
- [WebSocket Access](#websocket-access)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Migration Guide from PortalApp](#migration-guide-from-portalapp)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`PortalWebApp` builds on top of `PortalApp` and adds:

- **Auth-gated router** — The router only starts after `checkAuthStatus()` succeeds. Unauthenticated users never reach a page.
- **Automatic WebSocket** — After successful auth, a `WebSocketClient` connects to `/ws/realtime/` and bridges its events to the app EventBus.
- **Countdown redirect** — On auth failure, a "Redirecting in N seconds…" UI is displayed before sending the user to `loginUrl`.
- **Overridable auth failure hook** — `onAuthFailed(error)` lets subclasses handle the failure without touching `start()`.
- **Clean lifecycle events** — `user:ready`, `user:logout`, `ws:ready`, `ws:lost`, `ws:reconnecting`, `app:ready`.
- **Race-free auth handlers** — Auth event listeners are registered before the auth check, so no events are missed.

---

## When to Use PortalWebApp vs PortalApp

| Scenario | Use |
|---|---|
| Full portal with auth required before any page | **PortalWebApp** |
| Auto WebSocket after login, no boilerplate | **PortalWebApp** |
| Custom auth flow or conditional auth | **PortalApp** (handle `auth:unauthorized` manually) |
| No auth required (public portal) | **PortalApp** with auth disabled, or **WebApp** |
| Fine-grained control over start() ordering | **PortalApp** subclass |

---

## Quick Start

```js
import PortalWebApp from 'web-mojo/PortalWebApp';
import HomePage from './pages/HomePage.js';

const app = new PortalWebApp({
  name: 'Acme Portal',
  container: '#app',
  defaultRoute: 'home',
  api: { baseUrl: 'https://api.acme.com' },
  auth: { loginUrl: '/login' },
  ws: true,
  sidebar: {
    menu: [
      { label: 'Home',  icon: 'bi-house',  route: 'home' },
      { label: 'Users', icon: 'bi-people', route: 'users' }
    ]
  },
  topbar: { brandText: 'Acme Portal' }
});

app.registerPage('home', HomePage);

const result = await app.start();
// { success: true, user } — or { success: false, error } with redirect in progress
```

After `start()` resolves successfully, the portal has:

1. Verified authentication and loaded the active user
2. Loaded the active group (if any)
3. Connected the WebSocket
4. Rendered the sidebar and top bar
5. Started the router and shown the default page

---

## Constructor Options

`PortalWebApp` accepts all [PortalApp options](./PortalApp.md#constructor-options) plus:

### Auth Configuration (`auth`)

Controls how authentication failure is handled.

```js
new PortalWebApp({
  // Default: enabled, redirect to /login
  auth: { loginUrl: '/login', redirectDelay: 3000 },

  // Custom login URL
  auth: { loginUrl: '/auth/login', redirectDelay: 5000 },

  // Disable auth entirely (useful in development)
  auth: false,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `loginUrl` | `string` | `'/login'` | URL to redirect to on auth failure or logout |
| `redirectDelay` | `number` | `3000` | Milliseconds to wait before redirecting (shows countdown) |

When `auth: false`, `checkAuthStatus()` is skipped entirely and the router starts immediately.

### WebSocket Configuration (`ws`)

Controls automatic WebSocket connection after auth.

```js
new PortalWebApp({
  ws: true,   // Default: connect to /ws/realtime/ after auth
  ws: false,  // Disable automatic WebSocket
});
```

The WebSocket URL is derived from `config.api.baseUrl` using `WebSocketClient.deriveURL(baseUrl, '/ws/realtime/')`. The path is always `/ws/realtime/` and cannot be customised via config.

---

## Startup Lifecycle

```
app.start()
  │
  ├─ 1. Register auth event handlers (auth:unauthorized, auth:logout)
  │       ↳ Done BEFORE auth check to prevent race conditions
  │
  ├─ 2. checkAuthStatus()          [if auth enabled]
  │       ├── success → emit 'user:ready'
  │       └── failure → onAuthFailed(error) → countdown redirect
  │                     returns { success: false, error }
  │
  ├─ 3. checkActiveGroup()         [if activeUser is set]
  │
  ├─ 4. _setupWebSocket()          [if ws enabled]
  │       └── emit 'ws:ready' on connect
  │
  ├─ 5. setupRouter()
  │
  ├─ 6. Mark isStarted = true
  │
  ├─ 7. emit 'app:ready'
  │
  └─ 8. showPasskeySetup()         [if user has no passkey]
        returns { success: true, user }
```

WebSocket failure at step 4 is **non-fatal** — a warning is logged and the app continues without real-time connectivity.

---

## Events

`PortalWebApp` emits these events in addition to all [PortalApp events](./PortalApp.md#portal-events):

| Event | When emitted | Payload |
|---|---|---|
| `'user:ready'` | Auth succeeded, user loaded, before WS/router | `{ user }` |
| `'user:logout'` | Session ended (unauthorized or explicit logout) | (none) |
| `'ws:ready'` | WebSocket connected successfully | (none) |
| `'ws:lost'` | WebSocket disconnected | `{ code, reason, ... }` |
| `'ws:reconnecting'` | WebSocket attempting to reconnect | `{ attempt, ... }` |
| `'app:ready'` | Full startup complete (router running) | `{ app }` |

```js
app.events.on('user:ready', ({ user }) => {
  console.log('Logged in as:', user.get('email'));
});

app.events.on('ws:ready', () => {
  console.log('Real-time connection established');
});

app.events.on('ws:lost', () => {
  app.toast.warning('Real-time connection lost');
});

app.events.on('app:ready', () => {
  // Safe to interact with router, pages, and WebSocket
});
```

---

## Overridable Hook: onAuthFailed

Override `onAuthFailed(error)` in a subclass to intercept auth failure before the default countdown redirect runs.

```js
/**
 * Called when authentication fails during start().
 * Return true to suppress the default countdown redirect.
 *
 * @param {string} error - Error description
 * @returns {boolean|Promise<boolean>} true if handled (skips default redirect)
 */
async onAuthFailed(error) {
  return false; // Default: show countdown and redirect
}
```

The default implementation returns `false`, which triggers the built-in countdown UI followed by a redirect to `loginUrl`.

Return `true` to take full control:

```js
class AcmeApp extends PortalWebApp {
  async onAuthFailed(error) {
    // Custom handling — redirect immediately without countdown
    window.location.href = `/auth/login?next=${encodeURIComponent(location.pathname)}`;
    return true; // Suppress default countdown
  }
}
```

---

## WebSocket Access

After `start()` resolves, the WebSocket client is available at `app.ws`:

```js
const result = await app.start();

// Send a message via WebSocket
app.ws.send({ type: 'subscribe', channel: 'notifications' });

// Listen to WebSocket messages in a page
class DashboardPage extends Page {
  onInit() {
    this.getApp().ws.on('message', (data) => {
      if (data.type === 'notification') {
        this.handleNotification(data);
      }
    });
  }
}
```

If `ws: false` was configured, `app.ws` is `null`.

See [WebSocketClient](../services/WebSocketClient.md) for the full WebSocket API.

---

## API Reference

### Constructor

```js
new PortalWebApp(config)
```

Accepts all [PortalApp options](./PortalApp.md#constructor-options) plus `auth` and `ws` described above.

### start()

```js
const result = await app.start();
// Returns: { success: boolean, user?: User, error?: string }
```

Runs the full auth-gated lifecycle. Returns an object indicating outcome. If `success` is `false`, the user will be redirected to `loginUrl` after `redirectDelay` ms (unless `onAuthFailed` returned `true`).

### onAuthFailed(error)

```js
async onAuthFailed(error) { return false; }
```

Overridable hook called when `checkAuthStatus()` fails. Return `true` to suppress the default countdown redirect.

### destroy()

```js
await app.destroy();
```

Destroys the WebSocket connection and then calls `super.destroy()` (handles sidebar, topbar, router, pages).

### Properties

| Property | Type | Description |
|---|---|---|
| `app.ws` | `WebSocketClient\|null` | Active WebSocket client, or `null` if disabled or not yet started |
| `app.isStarted` | `boolean` | True after `start()` completes successfully |

---

## Examples

### Minimal Portal

```js
import PortalWebApp from 'web-mojo/PortalWebApp';
import HomePage from './pages/HomePage.js';

const app = new PortalWebApp({
  name: 'My Portal',
  container: '#app',
  defaultRoute: 'home',
  api: { baseUrl: 'https://api.example.com' },
  auth: { loginUrl: '/login' },
  ws: true,
  sidebar: {
    menu: [{ label: 'Home', icon: 'bi-house', route: 'home' }]
  },
  topbar: { brandText: 'My Portal' }
});

app.registerPage('home', HomePage);
await app.start();
```

### Subclass with Custom Hooks

```js
import PortalWebApp from 'web-mojo/PortalWebApp';

class AcmeApp extends PortalWebApp {
  async onAuthFailed(error) {
    // Redirect immediately with a return URL instead of showing countdown
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/auth/login?next=${next}`;
    return true; // Suppress default countdown
  }
}

const app = new AcmeApp({
  name: 'Acme Portal',
  container: '#app',
  api: { baseUrl: 'https://api.acme.com' },
  auth: { loginUrl: '/auth/login' },
  ws: true,
  sidebar: { menu: [...] },
  topbar: { brandText: 'Acme' }
});

app.events.on('user:ready', ({ user }) => {
  console.log('Welcome,', user.get('display_name'));
});

app.events.on('ws:ready', () => {
  app.ws.send({ type: 'subscribe', channel: 'user-notifications' });
});

app.registerPage('home', HomePage);
await app.start();
```

### Dev Mode (Auth Disabled)

```js
const app = new PortalWebApp({
  name: 'My Portal',
  container: '#app',
  api: { baseUrl: 'http://localhost:8000' },
  auth: false,   // Skip auth check in development
  ws: false,     // No WebSocket needed locally
  sidebar: { menu: [...] },
  topbar: { brandText: 'Dev Portal' }
});

app.registerPage('home', HomePage);
await app.start();
```

---

## Migration Guide from PortalApp

If you are using `PortalApp` with manual `auth:unauthorized` handlers, migration to `PortalWebApp` is straightforward.

**Before (PortalApp):**

```js
import PortalApp from 'web-mojo/PortalApp';

const app = new PortalApp({ name: 'My Portal', api: { ... }, ... });

// Manual auth failure handling
app.events.on('auth:unauthorized', () => {
  window.location.href = '/login';
});
app.events.on('auth:logout', () => {
  window.location.href = '/login';
});

// Manual WebSocket setup after start
await app.start();
const ws = new WebSocketClient({ url: '...', getToken: () => app.tokenManager.getToken() });
ws.on('connected', () => app.events.emit('ws:ready'));
await ws.connect();
app.ws = ws;
```

**After (PortalWebApp):**

```js
import PortalWebApp from 'web-mojo/PortalWebApp';

const app = new PortalWebApp({
  name: 'My Portal',
  api: { baseUrl: '...' },
  auth: { loginUrl: '/login' },  // Handles auth:unauthorized and auth:logout
  ws: true,                       // WebSocket set up automatically
  ...
});

const result = await app.start();
// auth handlers and WS are managed by PortalWebApp
```

Key changes:

- Replace `import PortalApp` with `import PortalWebApp`
- Remove manual `auth:unauthorized` / `auth:logout` handlers — add `auth: { loginUrl }` config instead
- Remove manual WebSocket setup — add `ws: true` config instead
- `start()` now returns `{ success, user }` instead of `undefined`
- If you need custom auth failure behaviour, override `onAuthFailed()` instead of listening to `auth:unauthorized`

---

## Common Pitfalls

### ⚠️ Accessing app.ws before start() completes

```js
// ❌ WRONG — ws is null until start() finishes
const app = new PortalWebApp(config);
app.ws.send({ type: 'ping' }); // TypeError: Cannot read properties of null

// ✅ CORRECT
const result = await app.start();
if (result.success && app.ws) {
  app.ws.send({ type: 'ping' });
}
```

### ⚠️ Not checking result.success

```js
// ❌ WRONG — proceeds even if auth failed
await app.start();
app.ws.send({ type: 'subscribe', channel: 'updates' }); // ws may be null

// ✅ CORRECT
const result = await app.start();
if (!result.success) return; // Auth failed, redirect is in progress
```

### ⚠️ Configuring ws: true without api.baseUrl

The WebSocket URL is derived from `api.baseUrl`. If it is missing, WebSocket setup is skipped with a console warning.

```js
// ❌ WRONG — no baseUrl, WS silently skipped
new PortalWebApp({ api: {}, ws: true });

// ✅ CORRECT
new PortalWebApp({ api: { baseUrl: 'https://api.example.com' }, ws: true });
```

### ⚠️ Overriding start() without calling super

If you override `start()`, call `super.start()` — do not replicate the auth-gated sequence manually.

```js
// ✅ CORRECT — run super first, then add your logic
class AcmeApp extends PortalWebApp {
  async start() {
    const result = await super.start();
    if (result.success) {
      await this.loadUserPreferences();
    }
    return result;
  }
}
```

---

## Related Documentation

- **[PortalApp](./PortalApp.md)** — The base class `PortalWebApp` extends
- **[WebApp](./WebApp.md)** — The root application class
- **[WebSocketClient](../services/WebSocketClient.md)** — The WebSocket client used by `app.ws`
- **[Page](../pages/Page.md)** — Page base class with `onEnter()`, `onGroupChange()`
- **[Events](./Events.md)** — EventBus patterns

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/core/PortalWebApp/PortalWebAppExample.js`](../../../examples/portal/examples/core/PortalWebApp/PortalWebAppExample.js) — Opinionated portal: auth-gated router, automatic WebSocket, lifecycle events.

<!-- examples:cross-link end -->
