# Auth Extension

**Drop-in authentication UI and a low-level auth client for `web-mojo` apps.**

`web-mojo/auth` is a deliberately small, framework-agnostic module. Two public exports:

- **`mountAuth(container, options)`** — render the full sign-in / forgot / reset UI into a DOM element. Wires every flow, handles success redirects, and stores tokens. Use this when you want a complete auth screen with no further code.
- **`createAuthClient(options)`** — the imperative API underneath `mountAuth`. Use this when you want to wire your own UI and just need the REST + storage primitives.

Both are framework-agnostic — they don't require `WebApp`, `View`, or any other `web-mojo` machinery. The runnable reference at [`examples/auth/`](../../examples/auth/) is a standalone HTML page.

## Table of Contents

- [Overview](#overview)
- [Quick Start — `mountAuth`](#quick-start--mountauth)
- [Quick Start — `createAuthClient`](#quick-start--createauthclient)
- [`mountAuth` Options](#mountauth-options)
- [`createAuthClient` API](#createauthclient-api)
- [REST Endpoints](#rest-endpoints)
- [Storage](#storage)
- [Redirect Safety](#redirect-safety)
- [Common Pitfalls](#common-pitfalls)
- [Deprecated APIs](#deprecated-apis)
- [Related Docs](#related-docs)

## Overview

The auth module solves two distinct problems with two distinct APIs:

| Need | Use |
|---|---|
| "I just want a login screen" | `mountAuth(container, { baseURL })` — done. |
| "I want to roll my own UI" | `createAuthClient({ baseURL })` — call `.login()`, `.forgot()`, etc. directly. |

Both share the same REST endpoints and the same `localStorage` schema, so an app can mix and match (e.g. use `mountAuth` for the login screen and `createAuthClient` for an in-app password change form).

## Quick Start — `mountAuth`

```js
import { mountAuth } from 'web-mojo/auth';

const handle = mountAuth(document.getElementById('auth-root'), {
    baseURL: 'https://api.example.com',
    onSuccessRedirect: '/dashboard',
    // ALWAYS set this in production. Without it, ?redirect=https://evil.com
    // happily sends users off-site after login (open-redirect bug).
    allowRedirectOrigins: [window.location.origin],
    branding: {
        title: 'Acme Portal',
        subtitle: 'Sign in to continue',
        logoUrl: '/static/logo.svg',
    },
    theme: 'light',
});

// Later, if you need to clean up:
handle.destroy();
```

That's the whole auth screen. The handler covers sign-in, forgot-password (code or magic-link), reset, and magic-link login from a `?login_token=` query param. On success, it stores the token in `localStorage` and navigates to `onSuccessRedirect` (or to a `?redirect=`/`?next=`/`?returnTo=` URL param if present, gated by `allowRedirectOrigins`).

## Quick Start — `createAuthClient`

```js
import { createAuthClient } from 'web-mojo/auth';

const auth = createAuthClient({ baseURL: 'https://api.example.com' });

// Sign in
try {
    const data = await auth.login('alice', 'hunter2');
    console.log('Signed in as', data.user);
} catch (err) {
    alert(auth.getErrorMessage(err));
}

// Make authenticated requests
fetch('/api/me', { headers: { Authorization: auth.getAuthHeader() } });

// Sign out
auth.logout();
```

`createAuthClient` is what `mountAuth` uses internally. It's the same module — just without the rendered DOM.

## `mountAuth` Options

```js
mountAuth(containerElement, {
    baseURL,                  // required: API base URL (e.g. 'https://api.example.com')
    onSuccessRedirect,        // string. Where to send the user after success. Defaults to URL param or '/'.
    allowRedirectOrigins,     // string[]. Allowlist of origins for redirects (open-redirect protection).
    branding: {
        title,                // string. Displayed at the top of the form.
        subtitle,             // string. One-line tagline below the title.
        logoUrl,              // string. URL for an optional logo image.
    },
    theme,                    // 'light' | 'dark' | custom class. Added as a class on the root.
    endpoints: {              // override REST paths if your backend uses different ones.
        login,                // default: '/login'
        forgot,               // default: '/auth/forgot'
        resetCode,            // default: '/auth/password/reset/code'
        resetToken,           // default: '/auth/password/reset/token'
    },
    providers,                // reserved for future SSO extensions (Google, etc.).
    texts,                    // partial overrides for UI labels/copy.
})
```

`mountAuth` returns `{ destroy() }` — call `destroy()` to tear the UI down (it removes event listeners and the container's children).

## `createAuthClient` API

```js
const auth = createAuthClient({
    baseURL,                  // required.
    fetchImpl,                // default: window.fetch. Override for testing.
    storage,                  // default: window.localStorage. Override for testing.
    endpoints,                // same shape as mountAuth's endpoints option.
});
```

| Method | Purpose |
|---|---|
| `await login(username, password)` | POST `/login`. Saves tokens on success. Resolves with parsed payload. |
| `await forgot({ email, method })` | POST `/auth/forgot`. `method` is `'code'` or `'link'`. |
| `await resetWithCode({ email, code, newPassword })` | POST `/auth/password/reset/code`. Used after the user enters the emailed code. Saves tokens on success. |
| `await resetWithToken({ token, newPassword })` | POST `/auth/password/reset/token`. Used for magic-link flows. Saves tokens on success. |
| `logout()` | Clears `access_token`, `refresh_token`, `user` from storage. |
| `isAuthenticated()` | `true` if `access_token` is present. |
| `getToken()` | The raw access token string, or `null`. |
| `getUser()` | Parsed `user` object from storage, or `null`. |
| `getAuthHeader()` | `'Bearer <token>'` or `null`. Drop into `fetch`'s `Authorization` header. |
| `getErrorMessage(err)` | Normalizes server error shapes into a single user-facing string. |
| `parseResponse(resp)` | Normalizes wrapper shapes (`{ data: { data: {...}}}`, `{ data: {...} }`, plain). |

Every method that hits the network throws on non-2xx responses. The thrown value is the server's parsed JSON body (or a synthetic `{ message }` if the body wasn't JSON). Wrap calls in try/catch and use `getErrorMessage` for display.

## REST Endpoints

All four are POST + JSON. Defaults can be overridden via `endpoints`.

| Endpoint | Body | Returns |
|---|---|---|
| `POST /login` | `{ username, password }` | `{ access_token, refresh_token?, user? }` |
| `POST /auth/forgot` | `{ email, method: 'code' \| 'link' }` | `{}` (200 on success) |
| `POST /auth/password/reset/code` | `{ email, code, new_password }` | `{ access_token, refresh_token?, user? }` |
| `POST /auth/password/reset/token` | `{ token, new_password }` | `{ access_token, refresh_token?, user? }` |

The client tolerates three response wrappers — `{ data: { data: {...} } }`, `{ data: {...} }`, and a flat object — and unwraps them through `parseResponse`.

## Storage

`createAuthClient` writes three keys to `localStorage` (override the storage object via the `storage` option for tests):

| Key | Contents |
|---|---|
| `access_token` | The bearer token. |
| `refresh_token` | Optional refresh token. |
| `user` | JSON-serialized user object. |

`logout()` clears all three. The keys are not currently overridable; if you need namespacing per-app, wrap the client.

## Redirect Safety

`mountAuth` accepts a redirect target from three sources, in priority order:

1. `options.onSuccessRedirect`
2. `?redirect=` URL param
3. `?next=` URL param
4. `?returnTo=` URL param

If `allowRedirectOrigins` is set, the resolved target is checked against the allowlist. If it doesn't match (or is malformed), the redirect falls back to `/`. If `allowRedirectOrigins` is omitted, any URL is allowed — **set the allowlist for any production deployment** to prevent open-redirect bugs.

## Common Pitfalls

- **`baseURL` is required** — both `mountAuth` and `createAuthClient` throw at construction if it's missing.
- **Magic-link tokens are picked up automatically** — `mountAuth` reads `?login_token=` on mount. If you're routing yourself, strip the param after handling.
- **`getErrorMessage` is for display, not branching** — server error shapes vary (`message`, `error`, `errors[].message`); use it for the user-facing string but use the raw error object for status-code branching.
- **`storage` and `fetchImpl` are injected for testability** — pass an in-memory shim in tests so you don't pollute `localStorage`.

## Deprecated APIs

`AuthApp` and `AuthManager` (from `src/extensions/auth/AuthApp.js` and `src/extensions/auth/AuthManager.js`) are **deprecated**. Their constructors throw with a message pointing here. Migrate to `mountAuth` / `createAuthClient`.

## Related Docs

- [`examples/auth/`](../../examples/auth/) — runnable standalone reference.
- [`services/Rest.md`](../services/Rest.md) — `Rest` doesn't use `web-mojo/auth` directly; for portal apps `PortalApp` wires its own [`TokenManager`](../services/TokenManager.md) for refresh.
- [`core/PortalApp.md`](../core/PortalApp.md) — for full portal apps the framework-managed auth flow lives there; `web-mojo/auth` is for non-portal or standalone screens.
