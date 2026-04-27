# SimpleSearchView

**Searchable, scrollable list bound to a `Collection`. Emits `item:selected` when the user picks a row.**

`SimpleSearchView` is a small `View` that combines a search input, debounced filtering, a result list, loading/empty states, and an optional header — backed by any `web-mojo` `Collection`. It's what `Sidebar`'s group switcher uses internally; it's also useful on its own for picker dialogs, command palettes, and any "search a collection, click a result" UX.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Constructor Options](#constructor-options)
- [Methods](#methods)
- [Events](#events)
- [Customizing the Item Template](#customizing-the-item-template)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

You give it a `Collection` (or a `Collection` class to instantiate). It fetches items, renders a search input, applies a 300ms debounce, filters by configured fields, and shows results. The user clicks one — the view emits `item:selected` with the chosen `Model`.

It's deliberately uniform: same look as the group selector inside `PortalApp`, same behavior, same template hooks. Pick it up when you don't want to wire `ListView` + a search input + debounce by hand.

## Quick Start

```js
import { SimpleSearchView } from 'web-mojo';
import { UserList } from 'web-mojo';

const search = new SimpleSearchView({
    Collection: UserList,           // class — internally instantiates `new UserList()`
    searchFields: ['display_name', 'email'],
    headerText: 'Pick a user',
    searchPlaceholder: 'Type to search…',
});

search.on('item:selected', ({ model }) => {
    console.log('selected', model.get('display_name'));
    dialog.hide();
});

dialog.show({ body: search, size: 'md' });
```

If you already have an instantiated collection (loaded, filtered, or with custom params), pass `collection` instead of `Collection`:

```js
const myUsers = new UserList();
await myUsers.fetch({ is_active: true });

new SimpleSearchView({ collection: myUsers, searchFields: ['display_name'] });
```

## Constructor Options

```js
new SimpleSearchView({
    Collection,            // Collection class. Used to construct `new Collection()` if `collection` not given.
    collection,            // Pre-built Collection instance. Wins over `Collection`.
    searchFields,          // string[]. Field names to match against. Default ['name'].
    collectionParams,      // object. Merged into collection.params (e.g. { size: 25, sort: 'name' }).
    autoLoad,              // boolean. Auto-fetch on init. Default true.

    // Header / chrome
    headerText,            // string. Top bar text. Pass empty to hide. Default 'Select Item'.
    headerIcon,            // string. Bootstrap-icons class. Default 'bi bi-list'.
    showExitButton,        // boolean. Show an X button that emits `exit`. Default false.

    // Search box
    searchPlaceholder,     // string. Default 'Search...'.
    debounceMs,            // number. Search-input debounce. Default 300.

    // States
    loadingText,           // string. Default 'Loading items...'.
    noResultsText,         // string. Shown when search returns nothing. Default 'No items match your search'.
    emptyText,             // string. Shown when the collection is empty. Default 'No items available'.
    emptySubtext,          // string. Optional second line under emptyText.
    emptyIcon,             // string. Default 'bi bi-inbox'.

    // Footer (optional)
    footerContent,         // string (HTML). Footer text. Default null (no footer).
    footerIcon,            // string. Default 'bi bi-info-circle'.

    // Item rendering
    itemTemplate,          // string (Mustache). Override the per-item HTML — see below.

    // Sizing
    maxHeight,             // number (px). If set, results pane caps at this height. Otherwise full container.
})
```

## Methods

| Method | Purpose |
|---|---|
| `setCollection(collection)` | Swap the backing collection at runtime. Clears search, refetches if `autoLoad`. |
| `clearSearch()` | Reset the search input and re-show all items. |
| `handleItemSelection(itemIndex)` | Programmatically pick a row by zero-based index — emits `item:selected`. Used internally by clicks. |

## Events

| Event | Payload | When |
|---|---|---|
| `item:selected` | `{ model, view: this }` | User picked a row. |
| `exit` | `{}` | User clicked the exit button (only fires when `showExitButton: true`). |

Subscribe with `view.on('item:selected', handler)`.

## Customizing the Item Template

The default item template prints `{{model.name}}`. To change it, pass `itemTemplate` — a Mustache string with the model exposed as `model`:

```js
new SimpleSearchView({
    Collection: UserList,
    searchFields: ['display_name', 'email'],
    itemTemplate: `
        <div class="p-2 border-bottom d-flex align-items-center gap-2">
            <i class="bi bi-person-circle"></i>
            <div class="flex-grow-1">
                <div class="fw-semibold">{{model.display_name}}</div>
                <div class="small text-muted">{{model.email}}</div>
            </div>
        </div>
    `,
});
```

Standard Mustache rules apply — pipe formatters, `{{#flag|bool}}`, `{{{tripleBraces}}}` for trusted HTML.

## Common Pitfalls

- **Pass `Collection` (capital C) for a class, `collection` for an instance.** They're different options. If you pass both, `collection` wins.
- **`searchFields` controls what matches.** A search for `"alice"` against `searchFields: ['name']` won't find a user whose name is empty but email is `alice@…` — add `'email'` to the fields list.
- **Debounce is on the input, not the network.** With `debounceMs: 300`, the filter runs 300ms after the user stops typing — but the collection fetch happens on `onInit` (or `setCollection`). Pre-fetching N rows and filtering client-side is the default pattern. Server-side filtering needs a `Collection` subclass that exposes the search term as a query param.
- **The view caps results at `collectionParams.size: 25` by default.** Increase if your "no results" copy says "no items" for a search that *should* match a row 100 deep.
- **Clicking exit emits an event, not closes a dialog.** Wire `view.on('exit', () => dialog.hide())` if you mount inside a dialog.
- **`itemTemplate` must NOT include the outer click target.** The component wraps each rendered template in a `data-action="select-item"` row; adding your own click handler inside the item template will fight the outer click.

## Related Docs

- [`core/View.md`](../core/View.md) — base class.
- [`core/Collection.md`](../core/Collection.md) — the data source.
- [`components/ListView.md`](./ListView.md) — when you want full control over rendering and don't need search/debounce/empty states.
- [`components/SidebarTopNav.md`](./SidebarTopNav.md) — group switcher uses `SimpleSearchView` internally.
