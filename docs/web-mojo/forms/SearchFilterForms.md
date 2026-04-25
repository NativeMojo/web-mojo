# Search & Filter Forms

**A reusable pattern for live, multi-criteria filtering of a result list.**

A search/filter form is a `FormView` whose only job is to drive a result list. As the user types, toggles a switch, or moves a slider, the result set updates in place — no submit button, no page reload. This page documents the standard wiring, the debouncing rules, and how to compose the same form around a `Collection`, a `TableView`, a `ListView`, or a plain client-side array.

---

## Table of Contents

- [Overview](#overview)
- [When to Use This Pattern](#when-to-use-this-pattern)
- [Quick Start](#quick-start)
- [Step-by-Step Wiring](#step-by-step-wiring)
- [Debouncing](#debouncing)
- [Composition](#composition)
  - [Around a Collection](#around-a-collection-server-side)
  - [Around a TableView](#around-a-tableview)
  - [Around a ListView](#around-a-listview)
  - [Around a Client-Side Array](#around-a-client-side-array)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

---

## Overview

The pattern has three moving parts:

1. **A `FormView`** with the search input and any filter fields (selects, ranges, switches, etc.).
2. **A change handler** on the form that reads the current values and applies them.
3. **A result list** — a `Collection`, `TableView`, `ListView`, or a plain array re-rendered into a container.

The form **never submits**. Submission is replaced by the `change` / `form:changed` event stream that `FormView` already emits. A debounce sits between the form and the result list so the backend (or render loop) is not hammered on every keystroke.

```
┌─────────────────────┐    change/form:changed    ┌────────────────┐
│      FormView       │ ──────────────────────▶   │  applyFilters  │
│  (search + filters) │      (debounced)          │   (your code)  │
└─────────────────────┘                           └────────┬───────┘
                                                           │
                                                           ▼
                                       ┌──────────────────────────────────┐
                                       │  Collection.setParams()          │
                                       │  TableView.setFilter()           │
                                       │  or this.results = arr.filter()  │
                                       └──────────────────────────────────┘
```

---

## When to Use This Pattern

| Situation | Use |
|-----------|-----|
| You already have a `TableView` and just need column filters and search | **TableView's built-in toolbar** — `searchable: true`, `filterable: true`, and per-column `filter: { ... }`. See [TableView.md](../components/TableView.md). |
| You need a sidebar of filters with sliders, switches, and grouped sections, driving any kind of list | **This pattern** — a sibling `FormView` + your own `applyFilters()`. |
| The dataset is small and lives entirely on the client | **This pattern**, filtering a plain array. |
| The dataset is large and lives on the server | **This pattern** with `Collection.setParams(..., autoFetch=true, debounceMs=300)`. |
| You only have one search box and no other filters | **TableView's built-in search** is enough — don't build a form. |
| You want a single fire-once "Apply" button | This is **not** a live filter — use `form.on('submit', ...)` and the standard form-submission flow. |

> ✅ Reach for this pattern when filters are **rich** (multiple types, grouped) and **live** (no Apply button). Otherwise, prefer a `TableView` or a plain submit form.

---

## Quick Start

A live filter over a client-side array, in under 100 lines of user code.

```javascript
import { Page, FormView, MOJOUtils } from 'web-mojo';

class ProductSearchPage extends Page {
  static pageName = 'products';

  constructor(options = {}) {
    super({ title: 'Products', ...options });
    this.products = [];        // populated in onEnter
    this.results = [];
  }

  async onEnter() {
    // Fetch once per visit (Pages are cached — do not fetch in constructor/onInit)
    this.products = await this.loadProducts();
    this.results  = this.products;
    this.renderResults();
  }

  async onInit() {
    await super.onInit();

    this.filterForm = new FormView({
      containerId: 'filter-form',
      formConfig: {
        fields: [
          { type: 'text',   name: 'search',   label: 'Search', placeholder: 'Search products...' },
          { type: 'select', name: 'category', label: 'Category', value: 'all', options: [
            { value: 'all',         text: 'All Categories' },
            { value: 'electronics', text: 'Electronics' },
            { value: 'clothing',    text: 'Clothing' }
          ]},
          { type: 'range',  name: 'min_price', label: 'Min Price', min: 0, max: 500, step: 10, value: 0 },
          { type: 'range',  name: 'max_price', label: 'Max Price', min: 0, max: 500, step: 10, value: 500 },
          { type: 'switch', name: 'in_stock',  label: 'In Stock Only' },
          { type: 'button', label: 'Clear Filters', action: 'clear-filters', buttonClass: 'btn-outline-secondary w-100' }
        ]
      }
    });
    this.addChild(this.filterForm);

    // Debounce: user code is responsible for it (FormView does not debounce its events)
    this.applyFiltersDebounced = MOJOUtils.debounce(() => this.applyFilters(), 200);

    // Single source of changes — covers text input, selects, switches, ranges
    this.filterForm.on('form:changed', () => this.applyFiltersDebounced());
  }

  async applyFilters() {
    const f = await this.filterForm.getFormData();
    this.results = this.products.filter((p) => {
      if (f.search && !p.name.toLowerCase().includes(f.search.toLowerCase())) return false;
      if (f.category && f.category !== 'all' && p.category !== f.category)    return false;
      if (p.price < f.min_price || p.price > f.max_price)                     return false;
      if (f.in_stock && p.stock <= 0)                                         return false;
      return true;
    });
    this.renderResults();
  }

  async onActionClearFilters(event) {
    event.preventDefault();
    this.filterForm.setFormData({
      search: '', category: 'all', min_price: 0, max_price: 500, in_stock: false
    });
    await this.applyFilters();
  }

  renderResults() {
    const host  = this.element?.querySelector('#results');
    const count = this.element?.querySelector('#count');
    if (!host || !count) return;
    count.textContent = `${this.results.length} result${this.results.length === 1 ? '' : 's'}`;
    host.innerHTML = this.results.length
      ? this.results.map((p) => `<div class="card mb-2"><div class="card-body">${p.name}</div></div>`).join('')
      : '<div class="text-muted">No results.</div>';
  }

  getTemplate() {
    return `
      <div class="row">
        <div class="col-md-3"><div id="filter-form"></div></div>
        <div class="col-md-9">
          <div class="d-flex justify-content-between mb-2">
            <h5>Products</h5><span id="count" class="badge bg-primary">0 results</span>
          </div>
          <div id="results"></div>
        </div>
      </div>
    `;
  }
}

export default ProductSearchPage;
```

The `FormView` emits `form:changed` on every field change. `MOJOUtils.debounce` collapses keystroke bursts into a single `applyFilters()` call. The Clear button is a `data-action` button handled by `onActionClearFilters`.

---

## Step-by-Step Wiring

### 1. Build the filter `FormView`

Use the field types you'd use for any other form. Keep the form as a **sibling** of the result list — do not nest the result inside the form.

```javascript
this.filterForm = new FormView({
  containerId: 'filter-form',
  formConfig: {
    fields: [
      { type: 'text',   name: 'search',   label: 'Search', placeholder: 'Search...' },
      { type: 'range',  name: 'min_price', label: 'Min', min: 0, max: 500, value: 0 },
      { type: 'range',  name: 'max_price', label: 'Max', min: 0, max: 500, value: 500 },
      { type: 'switch', name: 'in_stock',  label: 'In Stock Only' },
      { type: 'button', label: 'Clear', action: 'clear-filters', buttonClass: 'btn-outline-secondary' }
    ]
  }
});
this.addChild(this.filterForm);
```

> ⚠️ **No `data-action` on `<form>`** — `FormView` manages the form element. The `type: 'button'` field above wires `data-action` onto the button via its `action:` property.

### 2. Listen for changes

`FormView` emits two change events:

| Event | When | Payload |
|-------|------|---------|
| `change` | A single field changed | `{ field, value, form }` |
| `form:changed` | Any field changed, with the full snapshot | `data` (result of `getFormData()`) |

Use `form:changed` when you apply all values together (the common case). Use `change` if you need per-field reactions (e.g., changing `category` clears `subcategory`).

```javascript
this.filterForm.on('form:changed', () => this.applyFiltersDebounced());
```

### 3. Apply the filters

```javascript
async applyFilters() {
  const f = await this.filterForm.getFormData();
  // ... map form fields to filter params or array predicates, then re-render ...
}
```

### 4. Provide a reset path

```javascript
async onActionClearFilters(event) {
  event.preventDefault();
  this.filterForm.setFormData({ search: '', min_price: 0, max_price: 500 });
  await this.applyFilters();
}
```

> ✅ Prefer `setFormData(defaults)` over `form.reset()` — `reset()` clears to empty, but a filter form typically wants sliders back to full range, not 0.

---

## Debouncing

`FormView` does **not** debounce its `change` / `form:changed` events. Text inputs fire on every keystroke. **You are responsible for debouncing.**

### Client-side filtering

Debounce in user code with `MOJOUtils.debounce`:

```javascript
import { MOJOUtils } from 'web-mojo';

this.applyFiltersDebounced = MOJOUtils.debounce(() => this.applyFilters(), 200);
this.filterForm.on('form:changed', () => this.applyFiltersDebounced());
```

A 150–250 ms debounce feels instant to the user and collapses keystroke bursts.

### Server-side filtering (Collection)

`Collection.setParams()` and `Collection.updateParams()` accept a `debounceMs` argument that handles request cancellation **and** debouncing for you. Prefer this over an external debounce — it also cancels in-flight requests when a newer one supersedes:

```javascript
await this.products.updateParams({ search: f.search, category: f.category }, true, 300);
//                                                                            ^^^   ^^^
//                                                                       autoFetch  debounceMs
```

See [Collection.md](../core/Collection.md) for the full signature.

> ⚠️ Don't double-debounce. If you use `Collection.setParams(..., debounceMs: 300)`, do **not** also wrap `applyFilters` in `MOJOUtils.debounce`. Pick one place to throttle.

---

## Composition

The same form drives different result surfaces.

### Around a Collection (server-side)

```javascript
import { Collection, FormView, Page } from 'web-mojo';

async onInit() {
  await super.onInit();

  this.products = new Collection({ endpoint: '/api/products' });
  this.products.on('update', () => this.renderResults());

  this.filterForm = new FormView({ containerId: 'filter-form', formConfig: { fields: [...] } });
  this.addChild(this.filterForm);

  this.filterForm.on('form:changed', async () => {
    const f = await this.filterForm.getFormData();
    // setParams replaces; updateParams merges. debounceMs cancels in-flight requests.
    await this.products.updateParams({
      search:      f.search    || undefined,
      category:    f.category !== 'all' ? f.category : undefined,
      min_price:   f.min_price,
      max_price:   f.max_price,
      in_stock:    f.in_stock || undefined,
      start:       0   // reset pagination on filter change
    }, true, 300);
  });
}

async onEnter() {
  await this.products.fetch();
}
```

Collection methods used here (see [Collection.md](../core/Collection.md)):

- `setParams(newParams, autoFetch?, debounceMs?)` — replace params, optionally fetch.
- `updateParams(partial, autoFetch?, debounceMs?)` — merge into existing params.
- `on('update' | 'reset', cb)` — fires when contents change.
- `cancel()` — aborts the in-flight request (automatic on debounced re-fetch).

> ✅ Always reset `start: 0` when a filter changes — otherwise the user is stuck on page 5 of a freshly filtered set.

### Around a TableView

If you already have a `TableView`, prefer its built-in toolbar for filters that map to columns. Use a sibling `FormView` only when you need filters the toolbar can't express (rich grouped sliders, conditional fields):

```javascript
this.filterForm.on('form:changed', async () => {
  const f = await this.filterForm.getFormData();
  await this.table.collection.updateParams({
    search:   f.search || undefined,
    category: f.category !== 'all' ? f.category : undefined,
    start:    0
  }, true, 300);
});
```

See [TableView.md](../components/TableView.md) for built-in `searchable` / `filterable` / per-column `filter`.

### Around a ListView

`ListView` re-renders automatically when its `Collection` emits `update`, so the Collection wiring above works unchanged. See [ListView.md](../components/ListView.md).

### Around a client-side array

Shown in [Quick Start](#quick-start). Filter with `Array.prototype.filter`, then re-render. Use only for small datasets (~1000 items or fewer).

---

## Common Patterns

### Initial state from query string

Pages are cached — `onEnter()` runs per visit. Read query params there and seed the form before the first filter pass:

```javascript
async onEnter() {
  const params = new URLSearchParams(window.location.search);
  this.filterForm.setFormData({
    search:   params.get('q') || '',
    category: params.get('category') || 'all'
  });
  await this.applyFilters();
}
```

> ⚠️ Don't fetch in `onAfterRender()` or `onAfterMount()` — fetch in `onEnter()` (or `onInit()` for one-time setup). See [View.md](../core/View.md#lifecycle).

### Persist filter state to the URL

Sync the filter to the URL so refresh and back-button work:

```javascript
async applyFilters() {
  const f = await this.filterForm.getFormData();
  const qs = new URLSearchParams();
  if (f.search)             qs.set('q', f.search);
  if (f.category !== 'all') qs.set('category', f.category);
  history.replaceState(null, '', qs.toString() ? `?${qs}` : window.location.pathname);
  // ... apply ...
}
```

### Result count + empty state

Always show how many results are visible and a clear empty state — a blank pane reads as broken:

```html
<span id="count" class="badge bg-primary">{{results.length}} results</span>
```

### Loading state on server-side filters

Wrap slow fetches in `showLoading()` / `hideLoading()`:

```javascript
this.filterForm.on('form:changed', async () => {
  this.showLoading();
  try {
    await this.products.updateParams(await this.buildParams(), true, 300);
  } finally {
    this.hideLoading();
  }
});
```

---

## Common Pitfalls

### ⚠️ Pitfall 1: Forgetting to debounce a text search

```javascript
// ❌ Fires a fetch on every single keystroke
this.filterForm.on('form:changed', () => this.applyFilters());
```

```javascript
// ✅ Debounce in user code
this.applyFiltersDebounced = MOJOUtils.debounce(() => this.applyFilters(), 200);
this.filterForm.on('form:changed', () => this.applyFiltersDebounced());

// ✅ Or use Collection's built-in debounce
await this.products.updateParams(params, true, 300);
```

### ⚠️ Pitfall 2: Fetching in `onAfterRender()` / `onAfterMount()`

```javascript
// ❌ Causes re-render loops and double fetches
async onAfterRender() {
  await this.products.fetch();
}
```

```javascript
// ✅ Fetch in onEnter() (Pages are cached — onInit() runs once, onEnter() runs per visit)
async onEnter() {
  await this.products.fetch();
}
```

### ⚠️ Pitfall 3: Filter state lost on refresh

If the URL doesn't reflect the filter, refresh wipes it. Sync to the query string (see [Persist filter state to the URL](#persist-filter-state-to-the-url)) or restore from `localStorage` in `onEnter()`. Don't rely on the cached `Page` instance — pages get re-instantiated on cold loads.

### ⚠️ Pitfall 4: Not resetting pagination on filter change

```javascript
// ❌ User filters from page 5 — sees an empty page 5 of the new result set
await this.products.updateParams({ search: f.search }, true, 300);
```

```javascript
// ✅ Always reset start when filters change
await this.products.updateParams({ search: f.search, start: 0 }, true, 300);
```

### ⚠️ Pitfall 5: Adding `data-action` to the `<form>`

`FormView` manages the `<form>` element; putting `data-action` on it double-fires. Put `data-action` on a button (the `type: 'button'` field with `action:` does this for you).

### ⚠️ Pitfall 6: Manually calling `render()` / `mount()` on the form

`addChild(this.filterForm)` is enough — the framework handles child lifecycle. Don't call `child.render()` or `child.mount()` after `addChild()`.

### ⚠️ Pitfall 7: Confusing `setFormData()` with `setData()`

`FormView` exposes `setFormData(values)` — there is **no** `setData()` method. Older examples that call `setData()` silently do nothing.

```javascript
// ❌ Does not exist
this.filterForm.setData({ search: '' });

// ✅ Correct
this.filterForm.setFormData({ search: '' });
```

### ⚠️ Pitfall 8: Double-debouncing

```javascript
// ❌ Two layers of debounce — feels sluggish, and the inner one swallows the outer trigger timing
this.applyFiltersDebounced = MOJOUtils.debounce(async () => {
  await this.products.updateParams(params, true, 300);   // Collection ALSO debounces
}, 300);
```

```javascript
// ✅ Pick one debounce site
this.filterForm.on('form:changed', async () => {
  await this.products.updateParams(await this.buildParams(), true, 300);
});
```

---

## Related Docs

- **[FormView.md](./FormView.md)** — `FormView` constructor, lifecycle, `getFormData()`, `setFormData()`, event reference.
- **[BestPractices.md](./BestPractices.md)** — General forms patterns and pitfalls.
- **[Validation.md](./Validation.md)** — Required for forms that submit; less relevant for filter forms (which never submit).
- **[Collection.md](../core/Collection.md)** — `setParams()`, `updateParams(..., autoFetch, debounceMs)`, request cancellation, events.
- **[TableView.md](../components/TableView.md)** — Built-in toolbar search and per-column filters; reach for these first when the result is a table.
- **[ListView.md](../components/ListView.md)** — Auto-rendering of a `Collection`; works seamlessly with this pattern.
- **[MOJOUtils.md](../utils/MOJOUtils.md)** — `MOJOUtils.debounce(fn, delay)` and `MOJOUtils.throttle(fn, limit)`.
- **[View.md](../core/View.md)** — Lifecycle hooks (`onInit`, `onEnter`, `onExit`); fetching rules.
- **[Templates.md](../core/Templates.md)** — `|bool`, `{{{triple braces}}}`, quoted formatter args, `{{.property}}` in iterations.
