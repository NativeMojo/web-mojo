# Mustache dot-prefix lookup fails for multi-segment paths inside iteration

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-05-07 |
| Severity | medium |

## Description

Inside an iteration `{{#items}} ... {{/items}}`, a leading dot is supposed to mean "look up on the current iteration item only, do not walk the parent context chain." Single-segment dot paths (`{{.rank}}`) resolve correctly, and bare multi-segment paths (`{{group.name}}`) resolve correctly, but **dot-prefixed multi-segment paths like `{{.group.name}}` render empty** when the iteration item is a plain object.

Reported template (from a ListView/TableView-style block):

```mustache
{{#merchants}}
  <tr data-id="{{.group.id}}" data-name="{{.group.name}}">
    <td>{{.rank}}</td>
    <td>{{.group.name}}</td>          {{!-- empty --}}
    <td>{{.total_transactions}}</td>
  </tr>
{{/merchants}}
```

`{{.rank}}` and `{{.total_transactions}}` render. `{{.group.name}}` and `{{.group.id}}` come back as empty strings. Removing the leading dot (`{{group.name}}`) makes them render — that path takes the non-prefix lookup branch which already walks dot-segments.

## Context

The bug surfaces inside any `View`-driven render (`renderTemplate()` calls `Mustache.render(template, this, partials)` at [src/core/View.js:518](src/core/View.js:518)). Because the View instance defines `getContextValue`, `Mustache.render`'s auto-wrap of the top-level context is skipped, so the iteration items pushed by `{{#merchants}}` stay as the original plain objects (no `getContextValue`, no `DataWrapper`). The dot-prefix branch in `Context.lookup` is the only path that runs against those plain items, and it does not split the name on `.`.

Reproduction (Node, ESM):

```js
const view = {
  merchants: [
    { rank: 1, group: { id: 'g1', name: 'Acme' } },
    { rank: 2, group: { id: 'g2', name: 'Globex' } }
  ],
  getContextValue(path) {
    return path.split('.').reduce((v, p) => (v == null ? v : v[p]), this);
  }
};
Mustache.render('{{#merchants}}[{{.group.name}}]{{/merchants}}', view);
// → "[][]"        ← bug
Mustache.render('{{#merchants}}[{{group.name}}]{{/merchants}}', view);
// → "[Acme][Globex]"
```

When `Mustache.render` is called on a plain object that lacks both `getContextValue` and `toJSON`, the auto-wrap at [src/core/utils/mustache.js:638](src/core/utils/mustache.js:638) wraps each merchant in a `DataWrapper` whose own `getContextValue` happens to walk dot-paths via `MOJOUtils.getNestedValue`. That accidentally hides the bug in some test setups but is irrelevant to the View flow above.

## Acceptance Criteria

- `{{.group.name}}` resolves to the current item's `group.name` inside `{{#items}} ... {{/items}}`, both for plain-object items and for `DataWrapper`-style items.
- `{{.user.profile.name}}` (≥3 segments) resolves correctly.
- The dot prefix continues to mean "do not walk the parent context chain" — when the path is missing on the current item, it must NOT fall through to the parent (this was the original purpose of the dot-prefix branch and should be preserved).
- `|iter`, pipe formatters (`{{.foo|upper}}`), and `{{.}}` itself continue to work unchanged.
- The two new regression tests in `test/unit/Mustache-dot-prefix.test.js` pass.

## Investigation

- **Likely root cause:** The dot-prefix branch in `Context.lookup` ([src/core/utils/mustache.js:129-218](src/core/utils/mustache.js:129)) strips the leading dot to `actualName` and then performs a single property access (`actualName in this.view` → `this.view[actualName]`). For `actualName = 'group.name'` against `{rank, group: {…}}`, `'group.name' in view` is `false` and `view['group.name']` is `undefined`, so the lookup returns `undefined`. The non-prefix branch a few lines below ([src/core/utils/mustache.js:249-283](src/core/utils/mustache.js:249)) does split on `.` and walk the path; the dot-prefix branch needs the same nested-walk behavior, scoped to the current view only (no parent chain walk).
- **Confidence:** high. Confirmed by reading the source and by a passing/failing regression test pair.
- **Code path:**
  - Entry: [src/core/View.js:518](src/core/View.js:518) → `Mustache.render(template, this, partials)`.
  - Auto-wrap skip: [src/core/utils/mustache.js:638](src/core/utils/mustache.js:638) (View has `getContextValue`, so wrap is bypassed and iteration items remain plain).
  - Iteration push: [src/core/utils/mustache.js:532-540](src/core/utils/mustache.js:532) pushes the raw merchant onto a child context.
  - Faulty lookup: [src/core/utils/mustache.js:129-218](src/core/utils/mustache.js:129) — only single-key access; never splits `actualName` on `.`.
- **Regression test:** [test/unit/Mustache-dot-prefix.test.js](test/unit/Mustache-dot-prefix.test.js) — four cases. Two pass today (single-segment `.rank`, bare `group.name`), two fail today (`.group.name`, `.user.profile.name`) and must pass after the fix. Verified via `node test/test-runner.js --suite unit`.
- **Related files:**
  - [src/core/utils/mustache.js](src/core/utils/mustache.js) — fix site
  - [src/core/utils/MOJOUtils.js:513-545](src/core/utils/MOJOUtils.js:513) — `wrapData` / `DataWrapper` (not the bug, but explains why some setups don't reproduce it)
  - [src/core/View.js:518](src/core/View.js:518), [src/core/View.js:579-594](src/core/View.js:579) — the caller that triggers the auto-wrap skip
  - [docs/web-mojo/core/Templates.md](docs/web-mojo/core/Templates.md) — "Context Dot (.)" / "Use {{.}} in Iterations" / "Nested properties" sections; the docs already advertise `{{.profile.bio}}` style usage

## Plan

### Objective

Make `{{.foo.bar}}` (dot-prefixed multi-segment paths) inside `{{#items}}…{{/items}}` resolve to `currentItem.foo.bar` for plain-object iteration items, matching how `{{foo.bar}}` already works in the non-prefix branch. The dot prefix must continue to mean "do not walk the parent context chain."

### Steps

1. **`src/core/utils/mustache.js`** — In `Context.lookup`'s dot-prefix branch, replace the single-key direct-access fallback ([src/core/utils/mustache.js:168-174](src/core/utils/mustache.js:168)) with a guarded multi-segment walk that uses the existing `MOJOUtils.getNestedValue` helper. After change:

   ```js
   // Direct property access if get didn't work — supports nested dot paths
   if (value === undefined) {
     if (actualName.indexOf('.') > 0) {
       // Walk nested path against current view ONLY (do not climb parent chain)
       value = MOJOUtils.getNestedValue(this.view, actualName);
     } else if (actualName in this.view) {
       value = this.view[actualName];
       if (isFunction(value)) {
         value = value.call(this.view);
       }
     }
   }
   ```

   `MOJOUtils.getNestedValue` already exists at [src/core/utils/MOJOUtils.js:67](src/core/utils/MOJOUtils.js:67), is already used by `DataWrapper.getContextValue` ([src/core/utils/MOJOUtils.js:619](src/core/utils/MOJOUtils.js:619)), handles function-valued leaves, and delegates to nested `getContextValue` when an intermediate node provides one. `MOJOUtils` is already imported at the top of `mustache.js` (line 7).

   The walk is scoped strictly to `this.view` — the parent-chain walk only happens in the non-prefix branch below (lines 220+), so the leading-dot semantic is preserved.

2. **`test/unit/Mustache-dot-prefix.test.js`** — already in place from the bug investigation. Confirms two failures today (`.group.name`, `.user.profile.name`) and two existing pass cases (single-segment `.rank`, bare `group.name`). After the fix, all four must pass.

### Design Decisions

- **Reuse `MOJOUtils.getNestedValue` instead of inlining a new walker.** The non-prefix branch ([src/core/utils/mustache.js:249-283](src/core/utils/mustache.js:249)) inlines its own walker because it has to interleave with the parent-chain walk. The dot-prefix branch has no parent-chain concern, so a single helper call is cleaner and stays consistent with how `DataWrapper` resolves the same shape of path. Matches `.claude/rules/core.md` ("Check `src/core/utils/` before writing new utility functions").
- **Keep the single-segment path untouched.** `actualName.indexOf('.') > 0` gates the new branch, so `{{.rank}}`, `{{.title|upper}}`, and `{{.items|iter}}` continue to take the original `actualName in this.view` codepath, with identical behavior. Zero risk of regression for the single-segment cases.
- **Pipe and `|iter` handling already happen above the fallback** ([src/core/utils/mustache.js:136-147](src/core/utils/mustache.js:136)) — they strip from `actualName` first, so the base name is what we look up. Both continue to work for nested paths: `{{.group.name|upper}}` strips `|upper`, walks `group.name`, then applies the pipe at line 179.
- **`getContextValue` first, fallback second** is preserved. When `this.view` is a `DataWrapper` or `View`, `getContextValue('group.name')` already walks the path and the fallback is a no-op. When `this.view` is a plain iteration item (the bug case), `getContextValue` is absent, the fallback runs and now walks correctly.
- **No refactor of the non-prefix branch.** Minimal, surgical, localized change.

### Edge Cases

- **Path missing partway** (`{{.group.x.y}}` where `group.x` is `undefined`): `getNestedValue` returns `undefined` cleanly. Mustache then renders empty for `name`/`&` tokens and treats sections as falsy — same as today's missing-path behavior.
- **`null` along the path**: `getNestedValue`'s `if (current == null)` short-circuits to `undefined`.
- **Function on a leaf** (`{{.user.getDisplayName}}`): `getNestedValue` calls the leaf function via `current[key].call(current)` ([src/core/utils/MOJOUtils.js:128](src/core/utils/MOJOUtils.js:128)) — invoked with the immediate parent as `this`. Matches what `getContextValue` on a `DataWrapper` already does and is the correct binding for nested methods.
- **`|iter` on a nested object** (`{{#.config.flags|iter}}`): `|iter` strip happens first, then the multi-segment walk on `config.flags`, then the array/object iteration logic at [src/core/utils/mustache.js:191-212](src/core/utils/mustache.js:191). Works without further change.
- **Three-segment paths** (`{{.user.profile.name}}`): covered by the regression test.
- **Iteration item that itself has `getContextValue`**: the `getContextValue` branch at [src/core/utils/mustache.js:154-166](src/core/utils/mustache.js:154) catches it; fallback is not reached.
- **Out of scope:** `Model` instances exposed as iteration items (`Model.get(key)` ≠ `Model.getContextValue(path)`); not how the framework is used today.

### Testing

- `node test/test-runner.js --suite unit` — narrowest command; includes the four-case regression suite. After fix: all four pass; no other unit test should change behavior.
- Spot-check the Node reproduction from the issue (`{{#merchants}}[{{.group.name}}]{{/merchants}}` against a view-like object) — should print `[Acme][Globex]`.

### Docs Impact

- **`docs/web-mojo/core/Templates.md`** — already advertises `{{.profile.bio}}` style nested access inside iteration ("Context Dot (.)" section, around line 704). No doc change needed; the fix makes documented behavior actually work.
- **`CHANGELOG.md`** — add a short bugfix entry: dot-prefixed multi-segment paths (`{{.foo.bar}}`) now resolve correctly inside iteration sections.

## Resolution

### What was implemented

The dot-prefix branch in `Context.lookup` ([src/core/utils/mustache.js](src/core/utils/mustache.js)) now walks nested dot-paths via `MOJOUtils.getNestedValue` when `actualName` contains a `.`, scoped strictly to the current view (no parent-chain climb). The single-segment path is unchanged. `{{.foo.bar}}`, `{{.user.profile.name}}`, and chained pipes / `|iter` on nested paths all resolve correctly. `Templates.md` was sharpened to document that dot-prefix paths support arbitrary nesting depth.

### Files changed

- `src/core/utils/mustache.js` — the fix (commit `01d7657`)
- `test/unit/Mustache-dot-prefix.test.js` — 4 happy-path regression tests + 4 adversarial cases (`__proto__`, `constructor.name`, `group.constructor.prototype`, `group.__proto__.x`) (commits `01d7657` + `9983fbe`)
- `CHANGELOG.md` — Unreleased entry under "Mustache — fix:" (commit `01d7657`)
- `docs/web-mojo/core/Templates.md` — explicit note and three-segment example in the Context Dot section (commit `4494072`)

### Tests run and results

- `node test/test-runner.js --suite unit` → **703/703 pass** (was 695 before regression suite added). All 8 Mustache dot-prefix cases green.
- Spot-check of the original Node reproduction (`{{#merchants}}[{{.rank}}|{{.group.name}}|{{.group.id}}]{{/merchants}}` against a view-like object) → renders `[1|Acme|g1][2|Globex|g2]` ✓.

### Agent findings

- **test-runner:** zero regressions. Unit suite 699→703 (added adversarial tests). Integration and build suites have pre-existing failures unrelated to this change (alias resolution, missing `dist/`, missing entry point) — not caused by this fix.
- **docs-updater:** sharpened the Context Dot section in `docs/web-mojo/core/Templates.md` to make explicit that dot-prefix paths support arbitrary depth, with a three-segment example. No other doc indexes needed changes.
- **security-review:** flagged a defense-in-depth concern in `MOJOUtils.getNestedValue` — the helper relies on incidental `hasOwnProperty` behavior to block `__proto__` / `constructor` traversal at depth 0 and on the function-invocation branch to neutralize deeper paths. Empirically no exploit leaks data through the new code path (verified by 4 adversarial regression tests added in commit `9983fbe`), and this fix does not introduce new exposure (`getNestedValue` was already reachable from templates via the non-prefix branch through `DataWrapper.getContextValue`). A separate task was spawned to track the broader hardening of `getNestedValue` itself (explicit prototype-key blocklist, safer `hasOwnProperty.call` binding, audit of inherited-method invocation).

### Follow-ups

- Background task: harden `MOJOUtils.getNestedValue` against prototype-chain keys at every depth (defense in depth — current behavior is empirically safe but the guard is incidental).
