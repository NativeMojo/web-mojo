# TokenManager

**JWT lifecycle for `web-mojo` apps — storage, refresh, validity checks, and the pre-request auth gate that shields `Rest` from sending requests with expired tokens.**

`PortalApp` and `DocItApp` both instantiate a `TokenManager` automatically. Most app code never touches it directly. Reach for `TokenManager` when you need to:

- Inspect the current user from the token payload before any model has loaded.
- Force a refresh before a long-running flow.
- Run an authenticated `fetch` outside of `Rest`.
- Build a custom app shell (not `PortalApp` or `DocItApp`) that needs the same token plumbing.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Storage](#storage)
- [API](#api)
- [The Auth Gate (single-flight refresh)](#the-auth-gate-single-flight-refresh)
- [Auto-refresh](#auto-refresh)
- [Cross-Origin Auth Handoff](#cross-origin-auth-handoff)
- [Events](#events)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

`TokenManager` does five things:

1. **Stores** the access + refresh tokens in `localStorage` (or `sessionStorage` for non-persistent sessions).
2. **Decodes** JWT payloads client-side so you can read `uid`, `email`, `name`, `exp` without a network round-trip.
3. **Validates** — `isValid()` knows the difference between "no token", "expired token", and "valid token".
4. **Refreshes** — single-flight, idempotent. Concurrent callers share one in-flight POST.
5. **Auto-refreshes** every minute (`startAutoRefresh`) so a long-lived tab doesn't suddenly fail with a 401 mid-action.

It does NOT:

- Sign in (use [`web-mojo/auth`](../extensions/Auth.md#createauthclient-api) for that, or `app.rest.POST('/login', …)`).
- Decide where the user goes after login (that's `PortalApp` / `app.events`).
- Verify token signatures (it's a client; it trusts the server's signing).

## Quick Start

```js
import { TokenManager } from 'web-mojo';

const tm = new TokenManager();

// After a successful login, store the response tokens:
tm.setTokens(resp.access_token, resp.refresh_token);

// Anywhere — read them:
console.log(tm.isValid());          // true if access token is present + not expired
console.log(tm.getUserInfo());      // { uid, email, name, exp, iat }
console.log(tm.getAuthHeader());    // 'Bearer <token>'

// Use the auth header in a raw fetch:
fetch('/api/me', { headers: { Authorization: tm.getAuthHeader() } });

// Force a refresh before a long-running operation:
await tm.refreshToken(app);

// Sign out:
tm.clearTokens();
```

In a `PortalApp` or `DocItApp`, the framework calls `setTokens` for you on login and `clearTokens` on logout. You only need to construct your own `TokenManager` if you're building a custom app shell.

## Storage

| Key (default) | Contents |
|---|---|
| `access_token` | JWT — used for `Authorization: Bearer …` headers. |
| `refresh_token` | JWT — exchanged for a new `access_token` when the access token nears expiry. |
| `user` | JSON-serialized user object (set by `web-mojo/auth`). |

Pass `persistent: false` to `setTokens(token, refreshToken, persistent)` to store in `sessionStorage` instead — useful for "remember me = off" flows.

## API

### Constructor

```js
new TokenManager()
```

No options. The instance reads tokens from storage on every accessor call (no caching), so a different tab clearing tokens doesn't leave this instance with stale data.

### Storage methods

| Method | Behavior |
|---|---|
| `setTokens(token, refreshToken = null, persistent = true)` | Save both tokens. `persistent=false` writes to `sessionStorage`. |
| `getToken()` | Raw access token string, or `null`. |
| `getRefreshToken()` | Raw refresh token string, or `null`. |
| `clearTokens()` | Remove both tokens (and `user`) from both storages. |
| `getTokenInstance()` | A `Token` wrapper around the access token (with `decode()`, `isValid()`, etc). |

### Inspection methods

These all read the current access token; they're convenience wrappers over `getTokenInstance()`.

| Method | Returns |
|---|---|
| `getUserId()` | The `uid` / `sub` / `user_id` claim, or `null`. |
| `isValid()` | `true` if a non-expired access token is present. |
| `isExpiringSoon(thresholdMinutes = 5)` | `true` if the token expires within the threshold. |
| `getAuthHeader()` | `'Bearer <token>'`, or `null`. Drop into a raw `fetch`. |
| `getUserInfo()` | `{ uid, email, name, exp, iat }`, or `null`. |
| `checkTokenStatus()` | `{ action: 'ok' \| 'refresh' \| 'logout', reason }`. |

### Refresh methods

| Method | Behavior |
|---|---|
| `await refreshToken(app)` | Refresh the access token using the stored refresh token. **Single-flight** — concurrent callers share one in-flight POST. Resolves `true` on success, `false` on failure. Never throws. |
| `await checkAndRefreshTokens(app)` | Reads `checkTokenStatus()` and dispatches: `refresh` → calls `refreshToken`; `logout` → emits `auth:unauthorized`; `ok` → no-op. |
| `startAutoRefresh(app)` | Calls `checkAndRefreshTokens(app)` on a 60-second interval. Idempotent — calling twice doesn't double the timer. |
| `stopAutoRefresh()` | Clears the interval. |
| `await ensureValidToken(app)` | The pre-request auth gate. Throws `AuthRequiredError` if the token is expired and refresh fails. See [The Auth Gate](#the-auth-gate-single-flight-refresh). |
| `await handleAuthCodeFromURL(app)` | Read `?auth_code=` from the URL, scrub it, exchange it. See [Cross-Origin Auth Handoff](#cross-origin-auth-handoff). |
| `await exchangeAuthCode(app, code)` | Exchange a one-time handoff code for tokens. Single-flight. |

`app` is the running `WebApp` / `PortalApp` instance — `TokenManager` reads `app.rest` to make the refresh POST and `app.events` to emit lifecycle events.

## The Auth Gate (single-flight refresh)

`Rest` calls `TokenManager.ensureValidToken(app)` before every authenticated request. If the access token:

- **is valid** — returns immediately.
- **is expiring soon** — refreshes in the background; the request continues with the current (still-valid) token.
- **is expired** — awaits a refresh. If refresh succeeds, the request continues with the new token. If refresh fails, the gate throws `AuthRequiredError`, which `Rest` catches and short-circuits to a 401 response without ever calling `fetch`.

`AuthRequiredError` is exported from the same module so callers can `instanceof`-check it:

```js
import { AuthRequiredError } from '@core/services/TokenManager.js';
```

The single-flight guard means a hundred concurrent requests during a refresh share **one** POST to `/refresh_token`, not a hundred.

## Auto-refresh

`PortalApp` and `DocItApp` call `startAutoRefresh(app)` on login and `stopAutoRefresh()` on logout. The default 60-second cadence is hardcoded — override by subclassing if you need a different interval (rare; the in-line refresh inside `ensureValidToken` covers most race conditions).

## Cross-Origin Auth Handoff

When the auth server lives on a different origin from the consuming app, `localStorage` cannot be shared and a redirect alone leaves the destination unauthenticated. The django-mojo backend mints a one-time `auth_code` and appends it to the redirect URL as `?auth_code=<32-hex>`. The consuming app must POST that code to `/api/auth/exchange` on bootstrap to receive its tokens.

`PortalApp.checkAuthStatus()` does this automatically — it calls `tokenManager.handleAuthCodeFromURL(app)` before deciding whether the user is unauthenticated, so a portal that lands on a protected page with `?auth_code=…` boots straight into the authenticated state with no `/login` bounce.

```js
// At app construction — already wired by PortalApp / PortalWebApp.
await app.tokenManager.handleAuthCodeFromURL(app);
// On success, tokens are stored, app.rest auth header is set, and
// 'auth:login' is emitted with the user dict. On failure, no tokens are
// stored and 'auth:exchange:failed' is emitted with the error.
```

Security: the URL is scrubbed via `history.replaceState` *before* the network call, so analytics scripts that read `location.search` on page-load see the cleaned URL. Concurrent callers share one in-flight POST via the same single-flight pattern as `refreshToken()`.

For a custom (non-Portal) app shell, call `handleAuthCodeFromURL(app)` once at boot, before any route guard. Codes are single-use and 60-second TTL on the server.

## Events

`TokenManager` emits via `app.events`:

| Event | When |
|---|---|
| `auth:login` | A successful `exchangeAuthCode` stored fresh tokens. Payload is the user dict from the response. |
| `auth:unauthorized` | Token is expired and refresh failed (or no refresh token). The host app should redirect to login. |
| `auth:token:refresh:failed` | A refresh attempt failed (network, 5xx, malformed response). The host can choose to retry or wait for the next gate. |
| `auth:token:refreshed` | A refresh succeeded. New token is already in storage. |
| `auth:exchange:failed` | An `exchangeAuthCode` call failed (invalid code, 401/403, network). Payload is `{ error }`. The URL has already been scrubbed; no tokens were stored. |

`PortalApp` listens to `auth:unauthorized` and triggers its login redirect. Custom apps need to wire this themselves.

## Common Pitfalls

- **`refreshToken(app)` requires `app`** — it needs `app.rest` to make the POST and `app.events` to emit. Calling it without an app object is a TypeError.
- **`getUserInfo()` reads the JWT payload**, not the full user record. For the full record (avatar, permissions, settings) use `app.activeUser` or fetch a `User` model.
- **Don't `setItem('access_token', …)` directly** — `TokenManager` writes to either `localStorage` or `sessionStorage` based on the `persistent` flag and reads both. Bypassing it can leave you with two tokens in two storages.
- **Storage keys are not prefixable today.** If you run two `web-mojo` apps on the same origin, they share a token. If you need separation, use a service worker or move one app to a sub-path with `sessionStorage` instead.
- **`startAutoRefresh` after `clearTokens`** — won't error, but the interval will keep firing `checkTokenStatus()` against an empty token and quickly settle into `action: 'logout'` → `auth:unauthorized` loop. Always call `stopAutoRefresh()` in your logout flow.

## Related Docs

- [`services/Rest.md`](./Rest.md) — calls `ensureValidToken` per request. The single-flight guard lives there.
- [`extensions/Auth.md`](../extensions/Auth.md) — the sign-in flow that hands tokens to `setTokens`.
- [`core/PortalApp.md`](../core/PortalApp.md) — wires the full lifecycle (`startAutoRefresh`, `auth:unauthorized` redirect).
- [`core/Events.md`](../core/Events.md) — `auth:*` events flow through `app.events`.
