# Framework: ListView `rowStripe:` — left-edge severity color per row

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
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

## Plan

### Objective

Add a `rowStripe:` constructor option to ListView (inherited by TableView, forwarded by TablePage) that renders a 4px theme-aware left-edge stripe on each row, driven by a per-row callback. The stripe re-evaluates automatically when the row's model changes, because each row already re-renders on `model:change` via the inherited View infrastructure. Pure class-based — no inline styles, no new column shape, no interaction surface.

### Steps

1. **[`src/core/views/list/ListView.js`](src/core/views/list/ListView.js)**
   - Add `static ROW_STRIPE_TOKENS = ['danger', 'warning', 'success', 'info', 'primary', 'secondary']` near `GROUP_HEADER_STYLES` (line 70).
   - In the constructor (alongside other options around line 156), accept:
     ```
     this.rowStripe = typeof options.rowStripe === 'function' ? options.rowStripe : null;
     ```
   - Add private helper `_stripeClassFor(model)`: invokes `this.rowStripe(model)` inside try/catch (warn + return `null` on throw); if the return value is in `ROW_STRIPE_TOKENS`, returns `list-row-stripe-${token}`; if it's any other non-empty string, passes through as-is; otherwise (null/undefined/empty) returns `null`.
   - Add private helper `_applyRowStripe(itemView)`: scans `itemView.element.classList` and removes any class matching `^list-row-stripe`, then if `_stripeClassFor(itemView.model)` returns a class, calls `itemView.addClass(cls)`.
   - Add public method `refreshStripes()`: no-op when `rowStripe` is not set; otherwise walks `this.itemViews` via `forEachItem` and calls `_applyRowStripe(itemView)`. Used by consumers whose stripe depends on external (non-model) state.
   - **No change to `_createItemView`** — the row's own render cycle handles the initial pass (see step 2).
   - **No change to `_clearItems` / `_onModelsRemoved` / `destroy`** — no extra listeners are bound, so no extra cleanup needed.

2. **[`src/core/views/list/ListViewItem.js`](src/core/views/list/ListViewItem.js)**
   - In the existing `onAfterRender` (line 168), after the clickable-handler block, append:
     ```
     if (this.listView?.rowStripe) {
       this.listView._applyRowStripe(this);
     }
     ```
   - This piggybacks on the existing render lifecycle: View binds `model:change → render()` in [`View.js:79-108`](src/core/View.js:79), so every row already re-renders when its model changes, which re-fires `onAfterRender` and re-applies the stripe. No new listeners, no manual cleanup.
   - TableRow's existing `super.onAfterRender()` ([TableRow.js:311](src/core/views/table/TableRow.js:311)) picks this up automatically — zero changes to TableRow.

3. **[`src/core/views/table/TableView.js`](src/core/views/table/TableView.js)**
   - No changes needed. `rowStripe` flows through `super(options)` from ListView's constructor, and the stripe is applied via the inherited TableRow → ListViewItem.onAfterRender path.

4. **[`src/core/css/list-view.css`](src/core/css/list-view.css)**
   - Append a "Row stripe (severity-coded)" section at the bottom with rules for `<div>`-shaped ListView items:
     ```css
     .list-view-item.list-row-stripe-danger    { border-left: 4px solid var(--bs-danger); }
     .list-view-item.list-row-stripe-warning   { border-left: 4px solid var(--bs-warning); }
     .list-view-item.list-row-stripe-info      { border-left: 4px solid var(--bs-info); }
     .list-view-item.list-row-stripe-success   { border-left: 4px solid var(--bs-success); }
     .list-view-item.list-row-stripe-primary   { border-left: 4px solid var(--bs-primary); }
     .list-view-item.list-row-stripe-secondary { border-left: 4px solid var(--bs-secondary); }
     ```
   - No dark overrides needed — Bootstrap variant tokens flip automatically under `[data-bs-theme="dark"]`.

5. **[`src/core/css/table.css`](src/core/css/table.css)**
   - Add a "Row stripe (severity-coded)" section near the row styles with the `<tr>` variant using `box-shadow: inset` on `td:first-child` (Bootstrap `.table` uses `border-collapse: separate`, so `border-left` on `<tr>` won't render reliably; `inset` shadow avoids the column-width shift that `border-left` on `<td>` would cause):
     ```css
     .table-view-component .table > tbody > tr.list-row-stripe-danger    > td:first-child { box-shadow: inset 4px 0 0 var(--bs-danger); }
     /* …warning / info / success / primary / secondary */
     ```
   - When `selectable: true` the checkbox `<td>` is `td:first-child` — that's the correct leftmost-edge placement.

6. **[`src/core/pages/TablePage.js`](src/core/pages/TablePage.js)**
   - Extend the `tableViewConfig` whitelist around line 85–89 with:
     ```
     rowStripe: options.rowStripe,
     ```

7. **[`test/unit/ListView.rowStripe.test.js`](test/unit/ListView.rowStripe.test.js)** (new)
   - Build a `ListView` with a `Collection` of fixture models carrying a `level` field; render it into a fixture DOM.
   - **Token mapping** — parameterized over all six tokens: callback returning `'danger'` produces `list-row-stripe-danger` on the row `<div>`; same for `warning / info / success / primary / secondary`.
   - **Null/undefined** — callback returning `null` produces no `list-row-stripe-*` class.
   - **Custom passthrough** — callback returning `'my-custom-stripe'` produces that exact class on the row.
   - **Auto re-eval on model change** — callback uses `model.get('level')`; mutate `model.set({ level: 5 })`; assert the row's class flipped from (say) `list-row-stripe-info` to `list-row-stripe-danger` without any explicit refresh call. Proves the View.setModel auto-render path is wired through.
   - **`refreshStripes()`** — external-state case: change a closure variable the callback reads, call `refreshStripes()`, assert all rows updated.
   - **Throwing callback** — callback that throws does not break the render; row gets no stripe class.

8. **[`test/unit/TableView.rowStripe.test.js`](test/unit/TableView.rowStripe.test.js)** (new)
   - Same five cases, verifying the class lands on the `<tr>` element. Covers the inheritance path (TableRow → ListViewItem.onAfterRender → ListView._applyRowStripe) without duplicating the token-mapping logic tests.

9. **[`test/unit/TablePage.option-forwarding.test.js`](test/unit/TablePage.option-forwarding.test.js)**
   - Add `it('forwards rowStripe')`: pass a callback through TablePage, assert `page.tableViewConfig.rowStripe` is the same function reference.
   - Extend the existing "omitting these options leaves them undefined" test with `expect(page.tableViewConfig.rowStripe).toBeUndefined()`.

10. **[`docs/web-mojo/components/ListView.md`](docs/web-mojo/components/ListView.md)**
    - New top-level section "Row stripe (severity-coded)" after the "Grouped rows" section (around line 405): API surface, the six-token list, custom-class passthrough behavior, automatic re-eval on model change, `refreshStripes()` for external-state cases, and a worked severity example using `level` thresholds.

11. **[`docs/web-mojo/components/TableView.md`](docs/web-mojo/components/TableView.md)**
    - Short paragraph cross-referencing the ListView.md section, noting TableView applies the class to `<tr>` (CSS path differs internally — `box-shadow: inset` on `td:first-child` — but consumer-facing API is identical).

12. **[`CHANGELOG.md`](CHANGELOG.md)**
    - Unreleased entry: "feat: `rowStripe:` option on ListView/TableView for severity-coded left-edge stripes; six Bootstrap-variant tokens (`danger / warning / success / info / primary / secondary`) or custom class passthrough; auto-reapplies on model change; forwarded by TablePage."

### Design Decisions

- **Single-string callback contract** (`'danger' | 'warning' | 'success' | 'info' | 'primary' | 'secondary' | <any other string> | null`). Token strings resolve to canonical classes; any other non-empty string is treated as a consumer-defined class name (passthrough). Avoids the `{ token, className }` object form mentioned in the request — same surface area, no escape hatch needed.
- **Stripe applied via `itemView.onAfterRender → listView._applyRowStripe`.** Piggybacks on the existing View `model:change → render` chain ([View.js:79-108](src/core/View.js:79)). No manual `model.on/off` plumbing on the parent; the row's own re-render naturally drives stripe re-evaluation. Cleanup is automatic because nothing is bound.
- **`box-shadow: inset 4px 0 0`** on `td:first-child` for `<tr>` rows. Cross-browser robust under `border-collapse: separate` (Bootstrap default); doesn't shift column widths; doesn't fight with `.table` cell borders. Same `--bs-*` token → same theme behavior.
- **Tokens flow through Bootstrap CSS variables only** for the standard six. The `--bs-danger` etc. values re-skin under `[data-bs-theme="dark"]` automatically; no dark override block needed.
- **No new file.** CSS lives next to existing list/table rules — the request's "new `row-stripe.css`" alternative would be a one-off in a codebase that groups CSS by component.
- **`refreshStripes()` retained** for external-state callbacks (stripe depends on a parent's filter, a per-page threshold, etc., that isn't reflected in the model itself).

### Edge Cases

- `rowStripe` not configured → zero-cost path; the `onAfterRender` guard is `if (this.listView?.rowStripe)`, so no class scan happens.
- Callback returns `null` / `undefined` / `''` → no class applied; any previously-applied stripe class is removed first (relevant when a model's level downgrades).
- Callback throws → `console.warn` + treat as null. One bad row mustn't break the table render.
- Show More / `_onModelsAdded` appended rows → each new itemView renders, fires `onAfterRender`, and the stripe applies automatically. No extra wiring.
- Grouped rows: `groupBy` header rows are built by `_createGroupHeaderView` (a `ListGroupHeaderView`, not a `ListViewItem`), so the `onAfterRender` hook doesn't run and headers correctly receive no stripe.
- TableView selection checkbox: when `selectable: true`, the checkbox `<td>` is index 0 → `td:first-child` correctly carries the stripe (intended leftmost-edge behavior).
- Model emits `change` after row removed → the itemView is destroyed at `_clearItems` / `_onModelsRemoved` time, View's existing `setModel(null)` / destroy chain unbinds the `model.change` listener, so late events are no-ops.

### Testing

- New + extended unit tests:
  ```
  node test/test-runner.js
  ```
  with the new `test/unit/ListView.rowStripe.test.js`, `test/unit/TableView.rowStripe.test.js`, and the extended `test/unit/TablePage.option-forwarding.test.js`.
- `npm run lint` after edits.
- Visual spot-check under `npm run dev` against light + dark themes is optional for this primitive (no consumer page is being wired in this request — that lands in a follow-on).

### Docs Impact

- `docs/web-mojo/components/ListView.md` — new "Row stripe (severity-coded)" section.
- `docs/web-mojo/components/TableView.md` — short cross-link paragraph.
- `CHANGELOG.md` — feat entry under unreleased.

## Resolution

Implemented exactly as planned. Auto re-eval on model change works through View's existing `model:change → render()` binding — no manual listener plumbing needed in ListView, no extra cleanup paths.

### What was built

- **`src/core/views/list/ListView.js`** — new `static ROW_STRIPE_TOKENS` constant; constructor accepts `rowStripe:` callback; new private helpers `_stripeClassFor(model)` (throw-safe token/className resolver) and `_applyRowStripe(itemView)` (idempotent class application — strips any prior `list-row-stripe*` class first); new public `refreshStripes()` method for external-state callbacks.
- **`src/core/views/list/ListViewItem.js`** — single hook appended to the existing `onAfterRender` that calls `this.listView._applyRowStripe(this)` when the parent has a `rowStripe` callback. TableRow inherits via its existing `super.onAfterRender()`. Zero changes needed in TableRow or TableView.
- **`src/core/pages/TablePage.js`** — `rowStripe` added to the `tableViewConfig` forwarding whitelist next to `dayRangeFilter` / `groupBy`.
- **CSS** — six `list-row-stripe-<token>` rules in `src/core/css/list-view.css` (border-left on `<div>` items) and six matching `<tr>` rules in `src/core/css/table.css` (`box-shadow: inset 4px 0 0` on `td:first-child`, avoiding both the `<tr>` border-left rendering issue under `border-collapse: separate` and the column-width shift that `<td>` border-left would cause).
- **Tests** — new `test/unit/ListView.rowStripe.test.js` (15 cases) and `test/unit/TableView.rowStripe.test.js` (5 cases). Extended `test/unit/TablePage.option-forwarding.test.js` with the `rowStripe` forwarding regression. Auto-re-eval test attaches the view to `document.body` so View's `isMounted()` gate doesn't short-circuit `_onModelChange → render()`.
- **Docs** — new "Row stripe (severity-coded left-edge color)" section in `docs/web-mojo/components/ListView.md`; cross-link from `docs/web-mojo/components/TableView.md`. CHANGELOG entry under Unreleased.

### Files changed

```
CHANGELOG.md
docs/web-mojo/components/ListView.md
docs/web-mojo/components/TableView.md
planning/requests/framework-listview-severity-stripe.md  → planning/done/
src/core/css/list-view.css
src/core/css/table.css
src/core/pages/TablePage.js
src/core/views/list/ListView.js
src/core/views/list/ListViewItem.js
test/unit/ListView.rowStripe.test.js                     (new)
test/unit/TableView.rowStripe.test.js                    (new)
test/unit/TablePage.option-forwarding.test.js
```

### Verification

- `npm run test:unit` — 1106/1106 passed.
- `npm test` — 1248/1248 passed (one cold-run flakiness on integration tests on first attempt; second attempt clean).
- `npm run lint` — no new lint issues introduced by these files (the codebase has pre-existing lint warnings/errors in unrelated files; none in files this request touched).

### Implementation note

A small discovery during planning, captured to memory: every View already auto-renders on `model:change` via `View.setModel()` ([src/core/View.js:79-108](src/core/View.js:79)). The original draft plan included ~30 lines of manual `model.on('change', handler)` plumbing with explicit `_unbindStripeListener` paths in `_clearItems` / `_onModelsRemoved`. That was unnecessary — piggybacking on the existing render lifecycle (via `onAfterRender` on the row) is cleaner, has zero cleanup paths, and behaves identically. Saved a memory entry so future ListView/TableView features don't re-derive this.
