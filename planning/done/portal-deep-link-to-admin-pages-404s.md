# Portal example deep-links to admin pages render 404

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-04-26 |
| Severity | high |

## Description
Loading the portal example with an admin deep link such as
`http://localhost:3000/examples/portal/?page=system%2Fdashboard` renders the
framework's "Page Not Found" screen. Any `?page=system/*` URL in the new
portal example fails on first load (refresh, bookmark, external link, or
sidebar deep-link). Clicking the same admin item from inside the portal
*after* it has booted works — the breakage is specific to the initial route
resolution.

## Context
The new portal shell at `examples/portal/app.js` registers admin pages **after**
`app.start()` resolves, inside a `setTimeout(..., 0)`. The router resolves the
current URL synchronously inside `app.start()` (via
`Router.handleCurrentLocation()`), so when it looks up `system/dashboard` no
route is registered yet — `route:notfound` fires and `WebApp._show404()`
renders the 404 page. One tick later `mountAdminExtension()` calls
`registerAdminPages()`, but the page has already been resolved.

The legacy portal at `examples/legacy/portal/app.js:464` calls
`registerAdminPages(app, true)` *before* `app.start()`, which is why the same
URL works there.

The deferral was added so the sidebar exists before
`registerAdminPages` injects menu items, and so the demo user (with the
wildcard `hasPermission`) is set before any admin page renders — see the
comment block at `examples/portal/app.js:266-275` and the `setTimeout`
rationale at `examples/portal/app.js:319-324`. Both concerns need to be
satisfied alongside the fix.

## Acceptance Criteria
- Loading `examples/portal/?page=system/dashboard` (and any other registered
  `system/*` route) directly renders the admin page on first load instead of
  the 404 page.
- The admin sidebar items still appear under the System menu.
- The demo-user permission override still suppresses permission-denied
  fallthrough on admin pages where `permissions` are declared.
- Non-admin example routes (`home`, all `examples.registry.json` topics) keep
  working unchanged.

## Investigation
- **Likely root cause:** Admin pages are registered after `app.start()`. The
  router's first route resolution runs synchronously inside `app.start()`
  (`Router.start()` → `handleCurrentLocation()` → `handleRouteChange()` →
  `matchRoute()` → no match → `route:notfound` → `_show404`). When
  `mountAdminExtension()` runs in the deferred `setTimeout`, the 404 page
  has already replaced the page container.
- **Confidence:** high.
- **Code path:**
  - `examples/portal/app.js:303` — `await app.start()`
  - `examples/portal/app.js:321-324` — `setTimeout(() => { app.setActiveUser(demoUser); mountAdminExtension(); }, 0)`
  - `src/core/PortalWebApp.js:112` — `await this.setupRouter()` inside `start()`
  - `src/core/WebApp.js:180` — `this.router.start()` (fires before deferred admin registration)
  - `src/core/Router.js:11-17` — `start()` calls `handleCurrentLocation()` synchronously
  - `src/core/Router.js:75-95` — `handleCurrentLocation()` → emits `route:notfound` when no match
  - `src/core/WebApp.js:173-177` — `route:notfound` handler calls `_show404`
  - `src/admin.js:194-248` — `registerSystemPages` (a.k.a. `registerAdminPages`) registers `system/dashboard` and the rest of the admin routes
  - Comparison: `examples/legacy/portal/app.js:462-469` — legacy registers admin pages *before* `app.start()` and works correctly.
- **Regression test:** not added in this investigation. The bug is fundamentally
  a browser-bootstrap timing issue in the example shell, so the natural
  regression test is an integration/Chrome MCP test that loads
  `?page=system/dashboard` and asserts the dashboard renders. A pure unit test
  on `WebApp` or `Router` would not exercise the example wiring that
  regresses. If a focused unit test is wanted, one option is to assert that
  pages registered after `router.start()` are still routable when the URL is
  resolved (i.e. add a re-resolution path), but the choice depends on the fix
  approach.
- **Related files:**
  - `examples/portal/app.js`
  - `src/core/PortalWebApp.js`
  - `src/core/WebApp.js`
  - `src/core/Router.js`
  - `src/admin.js`
  - `examples/legacy/portal/app.js` (working reference)

## Fix Direction (for /design)
Two reasonable approaches; pick during design:

1. **Move admin registration earlier in `examples/portal/app.js`.** Register
   admin pages and call `setActiveUser(demoUser)` *before* `await app.start()`,
   matching the legacy portal. The sidebar config already declares the empty
   `system` menu, so `registerAdminPages` will find a sidebar config to
   inject into. Verify that `registerAssistant` still works pre-start (it
   already has a `topbarConfig` branch for that case). This is the smallest
   change and keeps fix scope inside the example.

2. **Make late-registered routes resolvable in the framework.** Have
   `WebApp.registerPage` (or a new `app.refreshRoute()` call) re-attempt the
   current route when the page being registered matches the URL the router
   most recently 404'd on. This is broader and impacts every consumer; only
   take this on if late registration is a pattern we want to support
   generally.
