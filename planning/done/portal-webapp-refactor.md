# PortalWebApp — New Opinionated Portal Base Class

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-02 |
| Priority | high |

## Description

Create a new `PortalWebApp` class (`src/core/PortalWebApp.js`) that extends `PortalApp` and provides a complete, opinionated bootstrap lifecycle for production portal applications. The goal is to eliminate the 60+ lines of boilerplate that every production portal repeats: auth checking with redirect, WebSocket setup after auth, error recovery, and bootstrap orchestration.

`PortalApp` remains unchanged (backward compatible). `PortalWebApp` is the new recommended base class for portals that need auth, WebSocket, and a clean lifecycle.

## Motivation

Every production portal app (e.g., MojoVerify) writes the same bootstrap:
1. Create `PortalApp` with config
2. Write a custom `bootstrap()` function that:
   - Calls `app.checkAuthStatus()` and handles failure (redirect to login with message)
   - Registers pages and menus
   - Calls `app.start()`
   - Creates a `WebSocketClient` manually, figures out the URL, passes the token
3. Handles `auth:unauthorized` with custom redirect logic
4. Handles `auth:logout` with token clearing and redirect

Problems with this:
- **WS timing** — `app.ws` doesn't exist until after `start()`, but auth must succeed first. Easy to get wrong (the example portal just got it wrong).
- **Auth result ignored** — `PortalApp.start()` calls `checkAuthStatus()` but doesn't gate on the result. If auth fails, it still starts the router.
- **Constructor does async work** — `setupPortalComponents()` is async but called from the constructor, meaning awaited renders are fire-and-forget.
- **Event handlers race** — `auth:unauthorized` and `auth:logout` handlers are registered inside `start()` AFTER `checkAuthStatus()`, so if auth fails synchronously the handlers aren't ready.
- **No WebSocket support** — The framework has `WebSocketClient` but `PortalApp` doesn't use it. Consumers import it separately and manage the lifecycle.
- **No auth failure UX** — Every portal writes its own "redirecting to login" page. The framework should provide a configurable default.

## Acceptance Criteria

- **New file** `src/core/PortalWebApp.js` extends `PortalApp`.
- **Zero changes** to `PortalApp.js` or `WebApp.js` — fully backward compatible.
- **Config-driven WebSocket** — `ws: true` (default) or `ws: false` in config. Path is always `/ws/realtime/`. Framework derives the URL from `api.baseUrl`, creates `WebSocketClient` with token auth, connects after auth, disconnects on destroy.
- **Auth-gated start** — `start()` returns `{ success, user, error }`. If auth fails, the app does NOT start the router or render pages.
- **Configurable auth failure** — `auth: { loginUrl: '/login', onUnauthorized: 'redirect' }` in config. Framework handles redirect with a countdown page (configurable). Or pass a callback for custom behavior.
- **Lifecycle hooks** — Clean override points: `onAuthenticated(user)`, `onReady()`, `onWebSocketConnected()`, `onAuthFailed(error)`.
- **Clean destroy** — `destroy()` disconnects WS, clears tokens, stops auto-refresh, calls parent destroy.
- **Exported from `src/index.js`** and importable as `import { PortalWebApp } from 'web-mojo'`.
- **Example portal updated** to use `PortalWebApp` and demonstrate the simpler setup.
- **Documentation** added to `docs/web-mojo/core/PortalWebApp.md`.

## Use Cases

### Minimal portal (auth + WS)
```js
const app = new PortalWebApp({
  name: 'Acme Portal',
  container: '#app',
  api: { baseUrl: 'https://api.acme.com' },
  auth: { loginUrl: '/login' },
  ws: true,
  sidebar: { ... },
  topbar: { ... },
  defaultRoute: 'home'
});

app.registerPage('home', HomePage);
await app.start();
// Auth checked, WS connected, router started — or redirected to login
```

### Portal with custom bootstrap hooks
```js
class AcmeApp extends PortalWebApp {
  async onAuthenticated(user) {
    // Called after auth succeeds, before WS and router
    await this.loadUserPreferences();
    registerAdminPages(this);
    registerGroupPages(this);
  }

  async onReady() {
    // Called after everything is ready
    registerAssistant(this);
  }

  async onAuthFailed(error) {
    // Custom auth failure handling (overrides default redirect)
    this.showAuthError(error);
  }
}
```

### Portal without auth (dev/demo mode)
```js
const app = new PortalWebApp({
  auth: false,  // skip auth entirely
  ws: false,    // no WebSocket (default is true)
  ...
});
```

## Out of Scope

- Refactoring `PortalApp` or `WebApp` internals
- Changing how `TokenManager`, `Sidebar`, or `TopNav` work internally
- Adding new WebSocket features beyond connect/disconnect lifecycle
- Server-side changes

## Plan

### Objective

Create `src/core/PortalWebApp.js` that extends `PortalApp` and provides a correct, config-driven bootstrap lifecycle: auth-gated start, automatic WebSocket setup after auth, new events (`user:ready`, `ws:ready`, `ws:lost`), configurable auth failure handling, and clean destroy. Zero changes to `PortalApp.js` or `WebApp.js`.

### Steps

#### 1. `src/core/PortalWebApp.js` — new file (~180 lines)

Extends `PortalApp`. Overrides `start()` with a correct lifecycle:

```
register pages (before start, current pattern)
  → start()
    → checkAuthStatus()
    → if auth fails:
        → call onAuthFailed(error)
        → default: redirect to loginUrl with countdown
        → return { success: false, error }
    → if auth succeeds:
        → emit 'user:ready' with { user }
        → checkActiveGroup() (inherited)
        → if ws config provided: create WebSocketClient, connect, emit 'ws:ready'
        → register auth event handlers (auth:unauthorized, auth:logout)
        → setupRouter() (inherited)
        → emit 'app:ready'
        → return { success: true, user }
```

**Constructor:**
- Reads `config.auth` — default `{ loginUrl: '/login' }`. Supports `auth: false` to skip auth entirely.
- Reads `config.ws` — boolean. Default `true`. Set `ws: false` to skip WS.
- Stores config, does NOT do async work in constructor (inherits PortalApp constructor which calls `setupPageContainer()` — that's fine, it's sync DOM setup).

**`start()` override:**
- Replaces PortalApp's `start()` entirely (calls `super` selectively for shared bits like `setupRouter()`).
- Returns `{ success, user, error }` so callers can act on result.
- Registers `auth:unauthorized` and `auth:logout` handlers BEFORE calling `checkAuthStatus()` (fixes the race condition in PortalApp).
- If `auth: false`, skips auth entirely, goes straight to WS/router.

**WebSocket setup (`_setupWebSocket()`):**
- Only runs when `config.ws` is truthy and auth succeeded (or auth is disabled).
- Uses `WebSocketClient.deriveURL(config.api.baseUrl, '/ws/realtime/')` to compute URL.
- Creates `this.ws = new WebSocketClient({ url, getToken, tokenPrefix, app: this })`.
- Calls `this.ws.connect()`. On `connected` event → emits `ws:ready` on `this.events`.
- On `disconnected` → emits `ws:lost`. On `reconnecting` → emits `ws:reconnecting`.

**Auth failure handling (`_handleAuthFailure(error)`):**
- Calls `this.onAuthFailed(error)` — overridable hook.
- Default `onAuthFailed()`: if `config.auth.loginUrl` is set, shows a simple countdown page in the app container and redirects after 3 seconds. Uses `this.config.auth.redirectDelay` (default 3000ms) for countdown duration.
- The countdown page is plain DOM (no View class needed) — matches the pattern every portal currently hand-writes.

**`auth:unauthorized` / `auth:logout` handling:**
- Clears tokens and auth (same as current PortalApp).
- Emits `user:logout` event.
- If WS is connected, disconnects it.
- Redirects to `config.auth.loginUrl` if configured.

**`destroy()` override:**
- Disconnects and destroys `this.ws` if it exists.
- Calls `super.destroy()`.

**Lifecycle hooks (all no-ops by default, override in subclass):**
- `onAuthFailed(error)` — called when auth check fails. Return value ignored. Override to show custom error UI instead of default redirect.
- No `onAuthenticated()` or `onReady()` hooks — use events `user:ready` and `app:ready` instead (works for both subclass and external consumers).

**Events emitted:**
- `user:ready` `{ user }` — after successful auth, before WS/router
- `user:logout` — on unauthorized or explicit logout
- `ws:ready` — WebSocket connected and authenticated
- `ws:lost` `{ code, reason }` — WebSocket disconnected
- `ws:reconnecting` `{ attempt, delay }` — WebSocket reconnecting
- `app:ready` `{ app }` — everything started (inherited, emitted at end of start)

#### 2. `src/index.js` — add export

Add one line:
```js
export { default as PortalWebApp } from '@core/PortalWebApp.js';
```

#### 3. `examples/portal/app.js` — update to use `PortalWebApp`

- Change `import PortalApp` → `import PortalWebApp`.
- Change `new PortalApp(...)` → `new PortalWebApp(...)`.
- `ws` defaults to `true`, no change needed (or add `ws: true` explicitly for clarity).
- Add `auth: { loginUrl: '/examples/auth/' }` to the config.
- Remove the manual WebSocket setup from `app.start().then(...)`.
- Simplify `start()` call: `await app.start()` — no manual WS, no manual auth handling.
- Remove `WebSocketClient` import (no longer needed directly).

#### 4. `docs/web-mojo/core/PortalWebApp.md` — new documentation

Document:
- Class overview and when to use it vs PortalApp
- Config options: `auth`, `ws`, and all inherited options
- Lifecycle diagram
- Events reference
- Example: minimal portal, subclass with hooks, dev mode (auth: false)
- Migration guide from PortalApp

#### 5. `CHANGELOG.md` — add entry

Add entry for PortalWebApp under current version.

### Design Decisions

- **Extends PortalApp, not WebApp** — reuses all portal chrome (sidebar, topbar, page header, group management, toast, passkey prompt). Only overrides `start()` and `destroy()`.
- **Events over callbacks** — `user:ready` / `ws:ready` are EventBus events, not constructor callbacks. This lets any component (pages, views, extensions) subscribe without needing a reference to the app subclass. The only hook is `onAuthFailed()` because auth failure is a control-flow decision (redirect vs show error) that belongs to the app owner, not arbitrary subscribers.
- **WS is on by default** — `ws: true` is the default since most portals need realtime. Path is always `/ws/realtime/` (KISS). Set `ws: false` to disable.
- **Auth is opt-in but defaults to true** — `auth` defaults to `{ loginUrl: '/login' }`. Passing `auth: false` skips auth entirely (useful for dev/demo). The loginUrl default is a sensible convention most portals share.
- **`start()` returns a result object** — `{ success, user, error }` gives callers actionable info without needing try/catch. This is cleaner than the current fire-and-forget pattern.
- **Event handlers registered before auth check** — fixes the PortalApp race where `auth:unauthorized` handlers were registered AFTER `checkAuthStatus()`.
- **No changes to PortalApp** — backward compatible. Existing portals keep working unchanged.
- **Uses `WebSocketClient.deriveURL()`** — existing static helper that correctly converts HTTP base URL to WS URL. No manual protocol switching needed.
- **Page registration stays outside `start()`** — pages register before `start()` (current pattern). This works for all use cases including `auth: false` where no user exists. User-dependent setup (e.g., admin-only pages) can listen to `user:ready` and register pages dynamically.

### Edge Cases

- **Auth fails on first load** — `onAuthFailed()` fires, default shows countdown and redirects. Router never starts, no pages render.
- **Token expires mid-session** — `auth:unauthorized` event fires. PortalWebApp clears tokens, disconnects WS, emits `user:logout`, redirects to loginUrl.
- **WS connection fails** — WebSocketClient handles reconnect internally (exponential backoff). `ws:lost` and `ws:reconnecting` events emitted so UI can show status.
- **`auth: false` with `ws: true`** — WS connects without auth token. `getToken()` returns null, WebSocketClient logs a warning and skips auth message. Valid for dev/demo setups.
- **`start()` called twice** — PortalApp/WebApp already guards with `isStarted` flag.
- **No `api.baseUrl` configured with `ws: true`** — `WebSocketClient.deriveURL()` throws. Catch in `_setupWebSocket()` and log a clear error, skip WS.
- **Subclass overrides `onAuthFailed()` but still wants redirect** — document that the override replaces the default redirect. If they want both custom UI and redirect, they must implement redirect themselves.
- **Browser tab hidden during WS setup** — WebSocketClient already has visibility/focus handlers for reconnect nudging. No extra work needed.

### Testing

- `npm run lint` — verify no import/export issues.
- `npm run test:build` — verify the bundle builds with the new export.
- Manual: load example portal, verify auth flow, WS connection, page navigation.
- Manual: set invalid token, verify auth failure redirect.
- Manual: test `auth: false` mode by temporarily changing config.

### Docs Impact

- New file: `docs/web-mojo/core/PortalWebApp.md`
- Update: `docs/web-mojo/README.md` — add link in the core docs index
- Update: `CHANGELOG.md` — new feature entry
