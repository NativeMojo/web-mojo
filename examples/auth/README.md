# Auth Example

Standalone login page for the web-mojo examples set. Built with `FormView` +
`Rest`, posts to the backend's `/login` endpoint (the canonical endpoint
defined in `src/extensions/auth/index.js`), and redirects to
`/examples/portal/` on success.

This page is **not** registered in the examples portal registry — it lives
outside `examples/portal/` deliberately. The portal will eventually point its
`loginUrl` at this page.

## Run

```bash
npm run dev
```

Then visit `http://localhost:3000/examples/auth/`. The dev server proxies
`web-mojo` package imports through Vite aliases (see `vite.config.js`).

The example expects the NativeMojo backend at `localhost:9009`. Without it,
the form renders fine but every login attempt errors out.

## Files

- `index.html` — Bootstrap-5.3 + Bootstrap Icons shell, mounts `#app`.
- `login.js` — `LoginPage` class (extends `Page`); FormView + Rest; one
  `data-action="login"` button on a non-form button (NOT on `<form>`).

## Endpoint

`POST <baseURL>/login` with `{ username, password }`. The same shape used by
`createAuthClient()` in `src/extensions/auth/index.js`. On success the response
payload is normalized to find `access_token` (and optionally `refresh_token`,
`user`), which are stored in `localStorage` under the same keys the auth
extension uses.
