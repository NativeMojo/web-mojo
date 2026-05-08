# SegmentControl

**A small horizontal pill-button group bound to a single value.** Use for one-of-N filters (range pickers like 7d / 30d / 90d, view modes, status segments) where a TabView would be too heavy and a `<select>` would feel out of place.

> **When to use SegmentControl vs other controls:**
> Use `SegmentControl` for compact one-of-3-to-5 toggles where the value drives a Collection refetch or a section's local state. Use `TabView` to switch between full child views. Use a Form `select` input when the value belongs to a form submission.

---

## Quick Start

```js
import { SegmentControl } from 'web-mojo';

const range = new SegmentControl({
    options: [
        { value: '7d',  label: '7d' },
        { value: '30d', label: '30d' },
        { value: '90d', label: '90d' }
    ],
    value: '30d',
    size: 'sm',
    ariaLabel: 'Time range'
});

range.on('change', ({ value, previous }) => {
    incidentsCollection.setParams({ created__gte: rangeToEpoch(value) });
    incidentsCollection.fetch();
});

this.addChild(range, { containerId: 'range-picker' });
```

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `options` | `Array<{value, label, icon?}>` | `[]` | The selectable options. `value` must be unique per group. `icon` is an optional Bootstrap Icons class. |
| `value` | `*` | first option's value | The initially-selected value |
| `size` | `'sm'\|'md'` | `'sm'` | `'sm'` renders Bootstrap's `btn-group-sm`; `'md'` renders the default size. |
| `ariaLabel` | `string` | `'Segment control'` | The `aria-label` on the wrapping `btn-group` |

Plus standard View options (`containerId`, `className`, `id`, …).

---

## Instance Methods

### `getValue()`

Returns the currently-selected value.

### `setValue(value, { silent = false } = {})`

Programmatically select a value. Returns `true` if the value matched a known option, `false` otherwise. Pass `silent: true` to update without emitting `change`.

```js
range.setValue('7d');                  // emits change
range.setValue('7d', { silent: true }); // no event
```

---

## Events

### `change`

Fired when the user clicks a different option, or when `setValue` is called without `silent: true`.

```js
range.on('change', ({ value, previous }) => {
    // value:    string — the new value
    // previous: string — the value before this change
});
```

Clicking the already-active button does **not** emit.

---

## Styling

The component renders a Bootstrap `btn-group` with one `<button>` per option. Active buttons get `btn-primary`; inactive get `btn-outline-secondary`. Both classes are dark-theme aware via Bootstrap tokens — no extra CSS required.

If you need a different palette, override the styling with selectors scoped to your container:

```css
.my-host .segment-control .btn-primary {
    --bs-btn-bg: var(--bs-success);
    --bs-btn-border-color: var(--bs-success);
}
```

---

## Common Patterns

### Bound to a Collection's params

```js
class IncidentsSection extends View {
    async onInit() {
        this.collection = new IncidentList({ params: this._buildParams('30d') });
        this.tableView = new TableView({ containerId: 'table', collection: this.collection });
        this.addChild(this.tableView);

        this.range = new SegmentControl({
            containerId: 'range',
            options: [{ value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }],
            value: '30d'
        });
        this.range.on('change', ({ value }) => {
            this.collection.setParams(this._buildParams(value));
            this.collection.fetch();
        });
        this.addChild(this.range);
    }

    _buildParams(range) {
        const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
        return { created__gte: Math.floor(Date.now() / 1000) - days * 86400 };
    }
}
```

### Switching between local view modes

```js
const mode = new SegmentControl({
    options: [
        { value: 'list', label: 'List', icon: 'bi-list-ul' },
        { value: 'grid', label: 'Grid', icon: 'bi-grid-3x3' }
    ],
    value: 'list'
});
mode.on('change', ({ value }) => this.setLayout(value));
```

---

## Notes

- **Not a FormView input.** SegmentControl emits `change` and exposes `getValue()` / `setValue()` but does not participate in FormView validation. To collect a value as part of a form, use a `select` field.
- Values are coerced to strings for DOM attributes (`data-value`). Internally the original value type is preserved on `getValue()` if it matched an option.
