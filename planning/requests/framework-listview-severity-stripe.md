# Framework: ListView `rowStripe:` — left-edge severity color per row

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | 2026-05-10 |
| Priority | medium |

## Description

Add a `rowStripe:` option to ListView (inherited by TableView) that renders a colored left-edge stripe on each row, derived from a per-row callback. Use case: severity-coded audit feeds (Events, Logs, Bouncer signals) where the level/decision is more scannable as a 4px colored edge than as an inline badge column.

This is a small, opt-in visual primitive — pure CSS-class application via a callback. No new column shape, no behavior change. Backed by Bootstrap tokens so it tracks the active theme.

## Context

Severity badges work, but they're inline with everything else in the row — they compete for attention with the title, the timestamp, the IP. The left-edge stripe pattern (familiar from Gmail labels, Linear priority bars, Sentry issue lists) reads at peripheral-vision speed: red bar = stop, amber bar = caution, no bar = routine.

Real use cases:

- **EventTablePage**: `level` → red for critical (5), amber for warning (4), info-blue for info (3), no stripe below.
- **LogTablePage**: same `level` mapping.
- **BouncerSignalTablePage**: `decision` → red for block, amber for monitor, no stripe for allow.
- **IncidentTablePage**: `priority` bucket → red ≥8, amber 5–7, no stripe below.

These four pages all want the same visual mechanism, and building per-page CSS for each is the wrong factoring.

## Acceptance Criteria

### A. ListView constructor option

Accept a new `rowStripe:` option:

```javascript
new ListView({
  // ...
  rowStripe: (model) => {
    const level = model.get('level');
    if (level >= 5) return 'danger';
    if (level >= 4) return 'warning';
    if (level >= 3) return 'info';
    return null;  // no stripe
  }
});
```

Behavior:

- The callback runs per-row at render time, receives the model, returns either:
  - A **token string** that maps to a Bootstrap variant: `'danger' | 'warning' | 'success' | 'info' | 'primary' | 'secondary'`. The framework resolves this to `var(--bs-${token})`.
  - A **CSS color value** (`'#ff0000'`, `'rgb(...)'`, `'var(--my-custom)'`). Used as-is. Prefer tokens; allow literals as an escape hatch.
  - `null` or `undefined` — no stripe rendered.
- The stripe is a 4px left-edge border on the row element (`<div>` for ListView items, `<tr>` for TableView rows).
- The stripe respects the active theme — token-based stripes use Bootstrap CSS variables that flip under `[data-bs-theme="dark"]` automatically.

### B. Rendering shape

Pick one of two implementation paths during build:

- **Option A (preferred):** CSS class application. The callback returns a token; the framework applies a class like `list-row-stripe-danger` to the row element. CSS rules under `core.css` define the stripe colors. Pros: theme-token-based, no inline styles. Cons: limited to predefined tokens unless we add more classes.
- **Option B:** Inline `style="border-left-color: ..."`. Allows arbitrary color values. Pros: maximum flexibility. Cons: violates `.claude/rules/views.md` "no inline styles" rule.

Option A is the right call. If a consumer needs an arbitrary color, they extend the CSS with their own modifier class and pass the class name through the callback (the callback returns the class name, framework applies it).

Compromise: callback returns `{ token: 'danger' }` (mapped to predefined class) OR `{ className: 'my-custom-stripe' }` (consumer-defined). Either form is theme-friendly when written correctly.

### C. CSS shape

Add to `core.css` (or a new `src/core/views/list/row-stripe.css` imported by ListView):

```css
.list-row-stripe { border-left: 4px solid transparent; }
.list-row-stripe-danger    { border-left-color: var(--bs-danger); }
.list-row-stripe-warning   { border-left-color: var(--bs-warning); }
.list-row-stripe-info      { border-left-color: var(--bs-info); }
.list-row-stripe-success   { border-left-color: var(--bs-success); }
.list-row-stripe-primary   { border-left-color: var(--bs-primary); }
.list-row-stripe-secondary { border-left-color: var(--bs-secondary); }

/* TableView rows are <tr>s; border-left on a <tr> doesn't render in all
   browsers. Apply the border to the first <td> instead, or to a
   ::before pseudo-element on the row. Build phase picks the cleanest
   mechanism — :first-child td border-left is the common solution. */
.table .list-row-stripe-danger > td:first-child    { border-left: 4px solid var(--bs-danger); }
.table .list-row-stripe-warning > td:first-child   { border-left: 4px solid var(--bs-warning); }
/* ... etc. */
```

Theme tokens — light and dark themes track automatically. No dark overrides needed for token-based stripes.

### D. Item template / row template integration

- ListView's `_renderChildren` (or wherever item-View elements get their class list) applies the stripe class to each item's outer element after construction.
- TableView's `TableRow.render()` applies the class to the `<tr>` element.
- The class is re-evaluated when the row's model changes (model re-render).

### E. Mobile considerations

- The 4px stripe is visible at every viewport. No `visibility:` config needed — it's not a column.
- The stripe should NOT increase the row's tap target; it's a passive decoration.

### F. Programmatic API

- `listView.refreshStripes()` — manual refresh, useful if the stripe callback depends on external state (uncommon).
- No event needed; the stripe is a render-time decoration, not an interaction surface.

### G. Tests

- Unit: 5+ cases in `test/unit/ListView.rowStripe.test.js`:
  - Renders class on item element when callback returns a token
  - Renders no class when callback returns null
  - Updates on model change (re-render)
  - Token-to-class mapping is correct for all six tokens
  - Custom className passthrough (the `{ className }` form, if option C compromise is picked)
- Unit: `test/unit/TableView.rowStripe.test.js` — same shape but verifies `<tr>` class application.

### H. Documentation

- New section in `docs/web-mojo/components/ListView.md` — "Row stripe (severity-coded)" with full API + example.
- Cross-reference in `docs/web-mojo/components/TableView.md`.
- CHANGELOG entry.

## Investigation

### What exists

- ListView's `_renderChildren` already iterates models and builds item Views. Hooking in a per-row class application is small.
- TableView's `TableRow` already accepts class options. The TableRow `render()` is the natural insertion point.
- Bootstrap CSS variables (`--bs-danger` etc.) are already in use across `core.css` and component styles.
- Existing `core.css` light + dark theme structure (mirrored in `chat.css`, `portal.css`, `admin.css`) is the pattern this follows.

### Constraints

- **No inline styles** (per `.claude/rules/views.md`). Class-based application only.
- **Theme tokens only** for the default token-mapped stripes. Consumer can extend with custom CSS modifier classes if they need a non-standard color.
- **TablePage forwards the option.** Add `rowStripe:` to the option-forwarding whitelist (mirrors `dayRangeFilter` and `groupBy` from the original sweep fix).
- **Light primitive.** Don't grow into "row gradient", "row badge", "row prefix" — those are separate features. This is one CSS class per row, no more.

### Related files

- `src/core/views/list/ListView.js` — class-application hook
- `src/core/views/table/TableRow.js` — class-application on `<tr>`
- `src/core/pages/TablePage.js` — option forwarding whitelist
- `src/core/css/core.css` (or new `src/core/views/list/row-stripe.css`)
- `test/unit/ListView.rowStripe.test.js` — new
- `test/unit/TableView.rowStripe.test.js` — new
- `test/unit/TablePage.option-forwarding.test.js` — extend to assert `rowStripe:` forwards
- `docs/web-mojo/components/ListView.md` — new section
- `CHANGELOG.md`

### Endpoints

None.

### Tests required

Per "Tests" above.

### Out of scope

- **Row-level background tints** (the full row colored, not just the edge). Different visual; out of scope.
- **Multiple stripes per row** (e.g. priority left + status right). Out of scope; one is enough.
- **Per-cell highlighting** based on value (e.g. red cell for late dates). Different feature; out of scope.
- **Animated stripe transitions** when the model changes. Out of scope.
- **Reserving a custom CSS-variable-per-row** (`--row-accent`) for consumer overrides. Possibly useful, but file separately if a real consumer asks for it.
- **Pre-built `severity` callback helpers** (e.g. `import { byLevel } from '@core/views/list/stripes.js'`). Author-callback only for the first version; helpers can be added once a third consumer asks.
