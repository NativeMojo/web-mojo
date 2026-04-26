# DjangoLookups

**Django-style `field__lookup` filter syntax for `web-mojo` apps — parsing, validation, and human-readable formatting for filter pills.**

The framework's `TableView` and `TablePage` use Django ORM-style filter keys to express comparisons in URLs and Collection params: `status__in=new,open`, `created__gte=2025-01-01`, `name__icontains=john`. `DjangoLookups` is the small utility that splits those keys, formats them for filter-pill UI, and validates lookup operators.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Supported Lookups](#supported-lookups)
- [API](#api)
- [How TableView uses it](#how-tableview-uses-it)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

A filter key is `field__lookup` — the field name and the lookup operator joined by a double underscore. `parseFilterKey('status__in')` returns `{ field: 'status', lookup: 'in' }`. The lookup operators are a small, curated subset of Django's ORM lookups (KISS — only the ones a portal app actually needs).

`DjangoLookups` does **not** apply the filter; it only parses, formats, and validates the syntax. Applying happens server-side or in `Collection.where()`.

## Quick Start

```js
import { parseFilterKey, formatFilterDisplay, LOOKUPS } from 'web-mojo';

// Parse a key out of a query-string param:
const { field, lookup } = parseFilterKey('created__gte');
// → { field: 'created', lookup: 'gte' }

// Format a filter-pill label:
const text = formatFilterDisplay('status__in', 'new,open', 'Status');
// → "Status in 'new', 'open'"

// All operators in one place:
console.log(Object.keys(LOOKUPS));
// → ['exact', 'in', 'not', 'not_in', 'gt', 'gte', 'lt', 'lte', 'contains',
//    'icontains', 'startswith', 'istartswith', 'endswith', 'iendswith',
//    'isnull', 'range']
```

## Supported Lookups

`LOOKUPS` is the authoritative map. Each entry has a `display` (used by `formatFilterDisplay`) and a `description` (used by `getLookupDescription`).

### Comparison

| Lookup | Display | Description |
|---|---|---|
| `exact` | `is` | Exact match. |
| `in` | `in` | Match any of the values (comma-separated). |
| `not` | `is not` | Does not match. |
| `not_in` | `not in` | Does not match any of the values. |
| `gt` | `>` | Greater than. |
| `gte` | `>=` | Greater than or equal to. |
| `lt` | `<` | Less than. |
| `lte` | `<=` | Less than or equal to. |

### String

| Lookup | Display | Description |
|---|---|---|
| `contains` | `contains` | Substring (case-sensitive). |
| `icontains` | `contains` | Substring (case-insensitive). |
| `startswith` | `starts with` | Prefix (case-sensitive). |
| `istartswith` | `starts with` | Prefix (case-insensitive). |
| `endswith` | `ends with` | Suffix (case-sensitive). |
| `iendswith` | `ends with` | Suffix (case-insensitive). |

### Null and range

| Lookup | Display | Description |
|---|---|---|
| `isnull` | `is null` / `is not null` (toggles on the value) | Check if the field is null. Pass `'true'` for null, anything else for not-null. |
| `range` | `between` | Two values, comma-separated. |

Anything else (e.g. `status__foo`) is treated as a flat field name with no lookup, not as an unknown lookup. That's deliberate — if a backend grows a new operator, the client doesn't have to be patched to ignore it.

## API

```js
import {
    LOOKUPS,
    parseFilterKey,
    formatFilterDisplay,
    buildFilterKey,
    getLookupDescription,
    isValidLookup,
    getAvailableLookups,
} from 'web-mojo';
```

### `parseFilterKey(paramKey)`

Split a key into `{ field, lookup }`.

```js
parseFilterKey('status__in');                  // { field: 'status', lookup: 'in' }
parseFilterKey('user__profile__name__icontains');
//                                             // { field: 'user__profile__name', lookup: 'icontains' }
parseFilterKey('status');                      // { field: 'status', lookup: null }
parseFilterKey('status__foo');                 // { field: 'status__foo', lookup: null } — unknown lookups are not split
```

`null`, `undefined`, and non-string inputs return `{ field: <input>, lookup: null }`.

### `formatFilterDisplay(paramKey, value, label)`

Format a filter pill for UI. Returns a human-readable string.

```js
formatFilterDisplay('status__in', 'new,open', 'Status');
// → "Status in 'new', 'open'"

formatFilterDisplay('created__gte', '2025-01-01', 'Created');
// → "Created >= '2025-01-01'"

formatFilterDisplay('name__icontains', 'john', 'Name');
// → "Name contains 'john'"

// Date-range objects ({ start, end }) get special handling:
formatFilterDisplay('created__range', { start: '2025-01-01', end: '2025-02-01' }, 'Created');
// → "Created between '2025-01-01' and '2025-02-01'"

// Arrays are joined with commas:
formatFilterDisplay('status__in', ['new', 'open'], 'Status');
// → "Status in 'new', 'open'"

// isnull toggles the verb based on the value:
formatFilterDisplay('archived__isnull', 'true', 'Archived');   // → "Archived is null"
formatFilterDisplay('archived__isnull', 'false', 'Archived');  // → "Archived is not null"
```

### `buildFilterKey(field, lookup = null)`

Inverse of `parseFilterKey`.

```js
buildFilterKey('status', 'in');  // 'status__in'
buildFilterKey('status');        // 'status'
buildFilterKey();                // ''
```

### `getLookupDescription(lookup)`

Returns the long-form description for a lookup, or `'Exact match'` for unknown lookups.

```js
getLookupDescription('gte');         // 'Greater than or equal to'
getLookupDescription('icontains');   // 'Contains substring (case-insensitive)'
getLookupDescription('foo');         // 'Exact match'
```

### `isValidLookup(lookup)`

```js
isValidLookup('in');    // true
isValidLookup('foo');   // false
isValidLookup(null);    // false
```

### `getAvailableLookups()`

```js
getAvailableLookups();
// ['exact', 'in', 'not', 'not_in', 'gt', 'gte', 'lt', 'lte',
//  'contains', 'icontains', 'startswith', 'istartswith',
//  'endswith', 'iendswith', 'isnull', 'range']
```

## How TableView uses it

`TableView` (and `TablePage`) call `parseFilterKey` to read column filters from URL params and `formatFilterDisplay` to render the pill labels above the table. You don't usually need to call these directly when using `TableView` — they're documented here for callers who want the same display format in their own UI, or who want to drive a custom filter form against the same backend syntax.

## Common Pitfalls

- **Field names with `__` are valid.** Nested relationships (`user__profile__name`) split on the *last* recognized lookup, not the first `__`. `parseFilterKey('user__profile__name__icontains')` returns `field: 'user__profile__name'`, not `field: 'user'`.
- **Unknown lookups are NOT split.** `parseFilterKey('status__foo')` returns `{ field: 'status__foo', lookup: null }`. If you add a server-side lookup, add it to `LOOKUPS` here so the client recognizes it. Or accept that the field name will appear with the `__lookup` suffix in pill labels until you do.
- **`isnull` value is a string `'true'` or `'false'`.** Other truthy/falsy values won't trip the toggle correctly — `formatFilterDisplay` only checks for the literal `'true'` string (or boolean `true`).
- **Object values** (`{ start, end }`) are treated as date-range payloads. If you pass a different object shape, `formatFilterDisplay` falls back to `JSON.stringify` — usable as a debug aid, ugly in a pill.
- **`LOOKUPS` is a const, not frozen.** You *can* mutate it at runtime to add a custom operator, but every consumer that imported the original reference will see the mutation. Prefer adding new lookups in source.

## Related Docs

- [`components/TableView.md`](../components/TableView.md) — the primary consumer.
- [`pages/TablePage.md`](../pages/TablePage.md) — URL-syncs filters; `parseFilterKey` reads them on mount.
- [`forms/SearchFilterForms.md`](../forms/SearchFilterForms.md) — pattern for live filter forms; uses the same key syntax.
- [`core/Collection.md`](../core/Collection.md) — Collection params accept the same `field__lookup` keys.
