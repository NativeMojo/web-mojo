# Router

**Hash + query-string router that powers `?page=…` navigation in `web-mojo` apps.**

`WebApp` instantiates a `Router` automatically and exposes it as `app.router`. Most apps never construct one directly. Reach for `Router` when you need to:

- Navigate programmatically (`app.router.navigate('users')`).
- React to route changes (subscribe to `route:changed` on `app.events`).
- Read the current page name + params outside of a `Page` lifecycle hook.
- Build a custom app shell (not `WebApp`) that uses the same routing semantics.

## Table of Contents

- [Overview](#overview)
- [URL Format](#url-format)
- [Quick Start](#quick-start)
- [API](#api)
- [Events](#events)
- [Route Patterns](#route-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

`Router` is intentionally thin. It maps URL patterns to **page names** (strings registered via `app.registerPage(name, PageClass)`) and emits events when the URL changes. It does NOT mount views, fetch data, or own page lifecycle — that's `WebApp`'s job.

The router watches `popstate` (browser back/forward) and reads the current URL on `start()`. On a route match it emits `route:changed` via the `EventBus` it was constructed with; on no match it emits `route:notfound`. `WebApp` listens to both and renders the right page.

## URL Format

`web-mojo` apps use a `?page=` query-string convention:

```
https://app.example.com/?page=users
https://app.example.com/?page=users/profile/42
https://app.example.com/?page=settings&tab=security
```

The router parses `?page=<name>` as the **page name**. Other query params (`tab`, `id`, `_item`, `group`, …) flow through to the page as `queryParams`. This keeps deep links portable across hash-based, history-based, or fragment-based deployments — the page name is always in `?page=`.

## Quick Start

You usually let `WebApp` create the router. The two patterns you'll actually use:

```js
// In a Page action handler — navigate to another page:
this.getApp().router.navigate('users/profile/42');

// Subscribe to route changes globally:
app.events.on('route:changed', ({ pageName, params, query }) => {
    console.log('navigated to', pageName, params, query);
});
```

Construct directly only when building a custom app shell:

```js
import { Router, EventBus } from 'web-mojo';

const events = new EventBus();
const router = new Router({ defaultRoute: 'home', eventEmitter: events });

router.addRoute('/home', 'home');
router.addRoute('/users/:id', 'user-detail');

events.on('route:changed', (e) => mountPage(e.pageName, e.params, e.query));
events.on('route:notfound', () => mountPage('404'));

router.start();
```

## API

### Constructor

```js
new Router({
    defaultRoute,    // string. Page name when no other route matches. Default 'home'.
    eventEmitter,    // EventBus or anything with .emit(name, payload). Required for events.
})
```

### Lifecycle

| Method | Purpose |
|---|---|
| `start()` | Attach the `popstate` listener and process the current URL once. |
| `stop()` | Remove the listener. Idempotent. |

### Navigation

| Method | Purpose |
|---|---|
| `await navigate(path, { replace = false, state = null, trigger = true })` | Process a route change. `path` is `'pageName'`, `'pageName/with/segments'`, or `'?page=pageName&q=…'`. `trigger: false` updates state without firing `route:changed`. |
| `back()` | `window.history.back()`. |
| `forward()` | `window.history.forward()`. |

### Inspection

| Method | Returns |
|---|---|
| `getCurrentRoute()` | The currently matched route object `{ pattern, pageName, paramNames, params }`, or `null` if no match. |
| `getCurrentPath()` | The current public URL — `?page=<name>&…`. |

### Route registration

| Method | Purpose |
|---|---|
| `addRoute(pattern, pageName)` | Map a pattern to a page name. `WebApp.registerPage` calls this for you. |
| `matchRoute(path)` | Test whether `path` matches any registered pattern. Returns the matched route or `null`. |
| `doRoutesMatch(routeA, routeB)` | True if two URLs resolve to the same `pageName`. Used by `Sidebar` for active-link detection. |

## Events

`Router` emits via the `eventEmitter` it was constructed with. In a `WebApp`, that's `app.events`.

| Event | Payload | When |
|---|---|---|
| `route:changed` | `{ path, pageName, params, query, route }` | A route matched. `params` are URL segments (`:id`); `query` is the query string. |
| `route:notfound` | `{ path }` | No registered pattern matched. `WebApp` mounts the 404 page. |

## Route Patterns

Patterns use `:name` for params and `*` for catch-alls:

| Pattern | Matches | `params` |
|---|---|---|
| `/home` | `?page=home` | `{}` |
| `/users/:id` | `?page=users/42` | `{ id: '42' }` |
| `/files/:id/:tab` | `?page=files/9/preview` | `{ id: '9', tab: 'preview' }` |
| `/admin/*` | `?page=admin/foo/bar/baz` | `{ '0': 'foo/bar/baz' }` |

`WebApp.registerPage(name, PageClass)` registers the simple form `/<name>` automatically. For path params, register the pattern explicitly:

```js
app.router.addRoute('/users/:id', 'user-detail');
app.registerPage('user-detail', UserDetailPage);
```

## Common Pitfalls

- **Don't construct your own router inside a `WebApp`.** `WebApp` already creates one. Construct a fresh `Router` only when you're not using `WebApp`.
- **`navigate('home')` vs `navigate('?page=home')`.** Both work — the router accepts either a bare page name or a `?page=`-prefixed string. Use the bare name in code; the URL prefix is for parsing existing URLs.
- **`route:changed` fires before the page mounts.** Subscribers should NOT assume `app.currentPage` reflects the new page until `WebApp` finishes its render. To act after mount, listen to `page:rendered` or use `Page.onEnter()`.
- **`popstate` doesn't fire on `pushState` calls.** The router does NOT emit on its own `navigate()` either — it dispatches `route:changed` directly. So a single `navigate()` call results in one `route:changed`, not two.
- **`getCurrentPath()` rebuilds the URL from current state.** If you've mutated `window.location` directly without going through `navigate`, the path may not reflect the URL bar.

## Related Docs

- [`core/WebApp.md`](./WebApp.md) — owns the router lifecycle and listens to its events.
- [`pages/Page.md`](../pages/Page.md) — `onEnter(params, query)` receives the route's params and query.
- [`core/Events.md`](./Events.md) — `EventBus`, the carrier for `route:changed` / `route:notfound`.
- [`components/SidebarTopNav.md`](../components/SidebarTopNav.md) — `Sidebar.autoSwitchToMenuForRoute` uses `doRoutesMatch` for active-link detection.
