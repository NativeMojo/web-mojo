# DocIt Extension

**Drop-in markdown documentation portal — books, pages, edit-in-place, search.**

`web-mojo/docit` provides a self-contained `WebApp` subclass (`DocItApp`) that turns the framework into a documentation site. Books and pages live in the backend (`/api/docit/book`, `/api/docit/page`); the extension provides the routing, sidebar, page viewer, editor, and home screen.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [`DocItApp`](#docitapp)
- [Pages](#pages)
- [`DocNavSidebar`](#docnavsidebar)
- [Models](#models)
- [REST Endpoints](#rest-endpoints)
- [Permissions](#permissions)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

`DocItApp` extends `WebApp` and pre-registers four pages, a topbar, a sidebar, and a small lifecycle that loads books on boot. It supports two modes:

- **Multi-book mode** (default): the sidebar lists every book and lets users switch between them.
- **Single-book mode** (`bookSlug` set): the app is locked to one book; the sidebar shows only that book's page tree.

Editing is permission-gated (default permission: `manage_docit`).

## Quick Start

```js
import { DocItApp } from 'web-mojo/docit';

const app = new DocItApp({
    title: 'Acme Docs',
    container: '#app',
    basePath: '/docs',          // mount point in the parent app's URL space
    bookSlug: null,             // null = multi-book mode
    theme: 'light',             // 'light' | 'dark'
    permissions: {
        edit: ['manage_docit'], // who can hit the edit page
    },
});

await app.start();
// app.events.on('docit:ready', () => console.log('ready'));
```

That's the whole thing. `app.start()` resolves once the topbar, sidebar, books, and pages are loaded. The portal wires up:

- `?page=home` → `DocHomePage`
- `?page=docit/book/<slug>` → `DocPage` viewer
- `?page=docit/edit/<id>` → `DocEditPage` editor (permission-gated)

## `DocItApp`

```js
new DocItApp({
    title,                  // string. Display name. Defaults to 'DocIt Portal'.
    version,                // string. Defaults to '1.0.0'.
    debug,                  // boolean. Forwarded to WebApp.
    container,              // selector or DOM element. Defaults to '#app'.
    basePath,               // string. URL prefix for routes. Defaults to ''.
    bookSlug,               // string|null. If set, locks the app to a single book.
    showBookNav,            // boolean. Show book switcher in sidebar. Defaults to !bookSlug.
    theme,                  // 'light' | 'dark' | string. Adds a class on the root.
    permissions: {
        edit,               // string[] | string. Default: ['manage_docit'].
    },
    sidebar: {
        showSearch,         // boolean. Default: true.
        defaultCollapsed,   // boolean. Default: false.
    },
})
```

Inherited from `WebApp`: `name`, `defaultRoute`, `api`, `events`. See [`core/WebApp.md`](../core/WebApp.md) for the underlying lifecycle.

### Public state

| Property | Type | Purpose |
|---|---|---|
| `app.books` | `DocitBookList` | Loaded books. Refreshed on boot. |
| `app.docPages` | `DocitPageList` | Pages for the active book. |
| `app.currentBook` | `DocitBook \| null` | The active book (single-book mode pins this). |
| `app.sidebar` | `DocNavSidebar` | Mounted sidebar instance. |
| `app.toast` | `ToastService` | Built-in toaster for status messages. |
| `app.activeUser` | `User \| null` | Set after `checkAuthStatus()`. |
| `app.isDocItReady` | `boolean` | `true` once `start()` resolved. |

### Events

`app.events.emit('docit:ready', { app })` fires after a successful `start()`.

## Pages

Three `Page` subclasses are registered automatically. Override them via `app.registerPage(name, Class)` after `await app.start()` if you want to swap one out — but most callers won't need to.

| Class | Route | Purpose |
|---|---|---|
| `DocHomePage` | `home` | Landing page — book grid (multi-book) or book overview (single-book). |
| `DocPage` | `docit/book/:slug/:pageSlug?` | Page viewer. Renders the markdown, side toc, page-level actions (`view-history`, `edit-page`, `edit-page-info`, `edit-book`, `delete-page`). |
| `DocEditPage` | `docit/edit/:id` | Markdown editor. Permission-gated by `permissions.edit`. |

All three are exported from `web-mojo/docit` for callers who want to embed them in a different app shell.

## `DocNavSidebar`

The sidebar that ships with `DocItApp`. Renders a search box (when `sidebar.showSearch` is on), a book switcher (when `showBookNav` is on), and the page tree for the active book.

```js
import { DocNavSidebar } from 'web-mojo/docit';
new DocNavSidebar({ books, docPages });
```

It's a `View` subclass — mount with `addChild` + `containerId` like any other.

## Models

`web-mojo/docit` ships its own models. They're separate from `web-mojo/admin-models` because DocIt is a self-contained portal, not part of the admin extension.

```js
import { DocitBook, DocitBookList, DocitPage, DocitPageList } from 'web-mojo/docit';
```

| Model | Endpoint | Helper |
|---|---|---|
| `DocitBook` | `/api/docit/book` | `book.buildUrl(idOrSlug)` |
| `DocitBookList` | `/api/docit/book` | parses `meta.total`, `meta.graph` |
| `DocitPage` | `/api/docit/page` | `page.buildUrl(idOrSlug)` |
| `DocitPageList` | `/api/docit/page` | parses `meta.total`, `meta.graph`, `meta.book` |

`buildUrl` accepts either a numeric id or a string slug — it picks the right endpoint shape (`/api/docit/book/{id}` vs `/api/docit/book/slug/{slug}`).

## REST Endpoints

| Method + path | Purpose |
|---|---|
| `GET /api/docit/book` | List books. `meta.graph` shape pre-loads page trees. |
| `GET /api/docit/book/{id}` or `/api/docit/book/slug/{slug}` | Fetch one book. |
| `POST /api/docit/book`, `PUT /api/docit/book/{id}`, `DELETE /api/docit/book/{id}` | CRUD. |
| `GET /api/docit/page` | List pages (filterable by `?book=…`). |
| `GET /api/docit/page/{id}` or `/api/docit/page/slug/{slug}` | Fetch one page. |
| `POST /api/docit/page`, `PUT /api/docit/page/{id}`, `DELETE /api/docit/page/{id}` | CRUD. |

Standard CRUD; admins filter with query params. No separate admin-scoped endpoints.

## Permissions

DocIt uses a single permission gate by default:

- `manage_docit` — required to access `DocEditPage` and to see the edit-related actions on `DocPage`.

Override with the `permissions.edit` constructor option:

```js
new DocItApp({
    permissions: { edit: ['manage_docit', 'view_admin'] }, // any of these
});
```

Read access is unrestricted — anyone who can reach the URL can read the docs.

## Common Pitfalls

- **`basePath` matters in nested apps.** If you mount `DocItApp` under `/help`, set `basePath: '/help'` so the router and link-builders agree.
- **Single-book mode hides the book switcher** but doesn't disable the multi-book endpoints — a savvy user can still hit `/api/docit/book` directly. Use backend permissions, not `bookSlug`, as the security boundary.
- **`isDocItReady`** is `false` until `start()` resolves. Don't mount a custom child before `events.emit('docit:ready')` fires.
- **Editing requires a logged-in user.** `DocItApp` uses a `TokenManager` internally; if you're hosting it inside a `PortalApp`, share the same token storage rather than letting them race.

## Related Docs

- [`core/WebApp.md`](../core/WebApp.md) — the base class.
- [`services/TokenManager.md`](../services/TokenManager.md) — `DocItApp` instantiates one for its auth gate.
- [`services/ToastService.md`](../services/ToastService.md) — the built-in toaster.
- [`models/BuiltinModels.md`](../models/BuiltinModels.md) — `User` is loaded for permission checks.
