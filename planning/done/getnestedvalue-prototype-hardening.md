# Harden `MOJOUtils.getNestedValue` against prototype-chain traversal

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-05-08 |
| Severity | medium |

## Description

`MOJOUtils.getNestedValue(context, path)` ([src/core/utils/MOJOUtils.js:67-136](src/core/utils/MOJOUtils.js:67)) is the framework's shared dot-path walker. It is reached from templates via at least three paths:

1. `MOJOUtils.getContextData` ([src/core/utils/MOJOUtils.js:48](src/core/utils/MOJOUtils.js:48)) → used by `View.getContextValue`.
2. `DataWrapper.getContextValue` ([src/core/utils/MOJOUtils.js:619](src/core/utils/MOJOUtils.js:619)) → fallback for wrapped iteration items.
3. `Mustache` dot-prefix branch ([src/core/utils/mustache.js:175](src/core/utils/mustache.js:175)) → multi-segment dot-prefix paths inside iteration (added in commit `01d7657`).

The walker has three exposure problems:

**A. No-dot fast path leaks the prototype itself and auto-invokes inherited methods.** Lines 73-86 use `if (path in context)` (which traverses the prototype chain) followed by an unconditional `value.call(context)` for any function-valued result. Verified end-to-end against the live Mustache pipeline:

```
{{__proto__}}          → "[object Object]"   (renders Object.prototype)
{{toString}}           → "[object Object]"   (calls obj.toString())
{{valueOf}}            → renders the wrapped data
{{hasOwnProperty}}     → "false"             (calls hasOwnProperty() with no args)
{{constructor}}        → CRASHES with "Class constructor DataWrapper cannot be
                         invoked without 'new'" — small denial-of-service surface
```

**B. Depth-0 `hasOwnProperty` is unbound.** Line 102 uses `current.hasOwnProperty(key)`. A payload object with a shadowed `hasOwnProperty` field (e.g. JSON from an API: `{ hasOwnProperty: 1, name: 'Alice' }`) breaks the walker — the field shadow turns the method into `1`, calling it throws `TypeError: 1 is not a function`. Same concern applies to line 125.

**C. Depth-≥1 function-invocation branch.** Line 127-128 (`else if (typeof current[key] === 'function') current = current[key].call(current)`) auto-invokes inherited methods at deeper levels. There is no documented or tested use case for `{{a.b.someInheritedMethod}}` to be auto-invoked. The function-invocation result happens to neutralize the constructor-prototype attack at depth ≥ 1 (`Object.call(plainObj) === plainObj`), but the defense is incidental, not by design.

`DataWrapper.getContextValue` has a parallel exposure: at line 615, `if (field in this && field !== '_data' && field !== '_rootContext') value = this[field]` returns `this.__proto__` for `field === '__proto__'`.

These were surfaced by a security review of the just-merged Mustache dot-prefix fix (commit `01d7657`). The dot-prefix fix did **not** introduce the underlying issue — `getNestedValue` was already template-reachable through `DataWrapper`. But it broadened the surface.

## Context

Reachable in any framework template render. `View.renderTemplate()` calls `Mustache.render(template, this, partials)`; the View's `getContextValue` ultimately delegates to `getNestedValue`. So a template literal containing `{{__proto__}}` or `{{toString}}` rendered against any view leaks prototype data; `{{constructor}}` throws.

Templates in WEB-MOJO are author-controlled (defined in `View` subclasses), so this is **not** a direct user-injection vulnerability. The risk is:

1. **Defense in depth:** if a downstream consumer ever passes user-controlled strings into a template name slot, prototype-chain traversal becomes an information-disclosure / DoS vector.
2. **Robustness:** API payloads with `{ hasOwnProperty: 1 }` or similar shadow fields silently break renders.
3. **Predictability:** `{{toString}}` / `{{valueOf}}` returning meaningful output is a footgun — looks like a typo'd field name but renders something.

## Acceptance Criteria

- `getNestedValue(ctx, key)` returns `undefined` when any segment of the path equals `__proto__`, `constructor`, or `prototype`.
- The no-dot fast path no longer auto-invokes methods that are reference-equal to `Object.prototype[key]` (i.e. `toString`, `valueOf`, `hasOwnProperty`, `propertyIsEnumerable`, `isPrototypeOf`, `toLocaleString`). Returns `undefined` for those keys instead.
- Custom view methods (e.g. `getStatus()` defined on a `View` subclass, or own functions on the context) continue to be auto-invoked as today — the existing `getName()`/`getGreeting()` test in [test/unit/MOJOUtils.test.js:43-53](test/unit/MOJOUtils.test.js:43) keeps passing.
- All existing `MOJOUtils.test.js` and `View-get.test.js` tests continue to pass with no behavioral change for normal field lookups.
- Function-invocation in `getNestedValue` is `try`/`catch`-wrapped — calling a class constructor (or any function that throws when called as a regular function) returns `undefined` instead of crashing the render.
- `Object.prototype.hasOwnProperty.call(...)` is used in place of `current.hasOwnProperty(...)` so a payload with a shadowed `hasOwnProperty` field doesn't break the walker.
- The depth-≥1 function-invocation branch (line 127-128) is removed — `{{a.b.toString}}` returns `undefined`, not `[object Object]`.
- `DataWrapper.getContextValue` ([src/core/utils/MOJOUtils.js:615](src/core/utils/MOJOUtils.js:615)) blocks the same forbidden keys before its `field in this` direct-access shortcut.
- A new test file `test/unit/MOJOUtils.getNestedValue.test.js` covers the adversarial cases above. All Mustache dot-prefix adversarial tests in [test/unit/Mustache-dot-prefix.test.js:81-105](test/unit/Mustache-dot-prefix.test.js:81) continue to pass and are joined by direct end-to-end cases for `{{__proto__}}`, `{{toString}}`, `{{constructor}}` rendered against a wrapped data object.

## Investigation

- **Likely root cause:** `getNestedValue` was written for the friendly case and never hardened against adversarial keys. The no-dot fast path's use of `in` (vs `hasOwnProperty` in the dotted-path i=0 branch) is internally inconsistent; the depth-≥1 function-invocation branch has no documented purpose.
- **Confidence:** high. Confirmed by direct probes against `MOJOUtils.getNestedValue` and end-to-end through `Mustache.render`.
- **Code path:**
  - [src/core/utils/MOJOUtils.js:67-136](src/core/utils/MOJOUtils.js:67) — `getNestedValue`, the primary fix site.
  - [src/core/utils/MOJOUtils.js:615](src/core/utils/MOJOUtils.js:615) — `DataWrapper.getContextValue` direct-access shortcut, sibling fix.
  - [src/core/utils/MOJOUtils.js:48](src/core/utils/MOJOUtils.js:48) — `getContextData`, calls into `getNestedValue`. No change needed; benefits transitively.
  - [src/core/utils/mustache.js:175](src/core/utils/mustache.js:175) — most recent caller. Out of scope per task brief.
- **Caller blast-radius audit (`grep -rn 'getNestedValue\b' src/`):**
  - `src/core/forms/inputs/CollectionSelect.js` (5 sites), `CollectionMultiSelect.js` (2 sites) — pass developer-configured `labelField`/`valueField`. Hardening is invisible (no real config would name a field `__proto__`).
  - `src/core/utils/DataFormatter.js:462` — resolves pipe-argument context values like `{{date|date:model.date_format}}`. Hardening is invisible.
  - `src/core/utils/MOJOUtils.js:48` (`getContextData`) — general utility; benefits transitively.
  - `src/core/utils/MOJOUtils.js:619` (`DataWrapper.getContextValue`) — primary template-reachable path.
  - `src/core/utils/mustache.js:175` — out of scope for this fix's edits but is the trigger that surfaced the issue; its existing adversarial tests continue to be the regression bar.
  - `src/core/Model.js`, `src/core/views/navigation/SimpleSearchView.js`, `src/core/views/navigation/GroupSearchView.js` define their **own** `_getNestedValue` / `getNestedValue` methods — they are NOT this utility, NOT affected.
- **Regression tests:**
  - New: `test/unit/MOJOUtils.getNestedValue.test.js` — direct unit tests for adversarial keys at depth 0 and ≥ 1, plus shadow-`hasOwnProperty` payload, plus class-constructor non-crash.
  - Existing: `test/unit/Mustache-dot-prefix.test.js` (8 cases, including 4 adversarial) must continue to pass.
  - Existing: `test/unit/MOJOUtils.test.js` (`Method Calls`, `Dot Notation`, `Pipe Formatting` describes) must continue to pass.
- **Related files:**
  - [src/core/utils/MOJOUtils.js](src/core/utils/MOJOUtils.js) — fix site (two functions).
  - [test/unit/MOJOUtils.test.js](test/unit/MOJOUtils.test.js) — existing tests that pin current friendly-case behavior.
  - [test/unit/View-get.test.js](test/unit/View-get.test.js) — exercises `View.getContextValue`, which calls `getContextData` → `getNestedValue`.
  - [test/unit/Mustache-dot-prefix.test.js](test/unit/Mustache-dot-prefix.test.js) — adversarial regression bar set in commit `9983fbe`.

## Plan

### Objective

Harden `MOJOUtils.getNestedValue` and `DataWrapper.getContextValue` so that prototype-chain keys (`__proto__`, `constructor`, `prototype`) and inherited `Object.prototype` methods (`toString`, `valueOf`, `hasOwnProperty`, etc.) cannot be read or auto-invoked through any template-reachable lookup path. Make the walker robust against API payloads that shadow `hasOwnProperty`. Custom view methods (`getStatus()`, etc.) keep working unchanged.

### Steps

1. **`src/core/utils/MOJOUtils.js`** — at the top of the file (above `class MOJOUtils`), add two module-level helpers used by both `getNestedValue` and `DataWrapper.getContextValue`:

   ```js
   const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
   const hasOwn = (obj, key) =>
     obj != null && Object.prototype.hasOwnProperty.call(obj, key);
   ```

2. **`src/core/utils/MOJOUtils.js` — `getNestedValue` (lines 67-136)** — apply five surgical changes:

   - **(a)** Right after the `if (!path || context == null)` guard, reject the whole path if any segment matches `FORBIDDEN_KEYS`:
     ```js
     // Block prototype-chain keys at every depth (defense in depth).
     if (path.split('.').some(seg => FORBIDDEN_KEYS.has(seg))) {
       return undefined;
     }
     ```
   - **(b)** No-dot fast path (lines 73-86): keep `path in context` so View methods like `getStatus` (defined on a class prototype, not `Object.prototype`) continue to be reachable, but skip auto-invocation when the function is reference-equal to `Object.prototype[path]`. Wrap the call in try/catch:
     ```js
     if (!path.includes('.')) {
       if (path in context) {
         const value = context[path];
         if (typeof value === 'function') {
           // Skip Object.prototype builtins (toString, valueOf, hasOwnProperty, etc.)
           if (value === Object.prototype[path]) return undefined;
           try { return value.call(context); }
           catch { return undefined; }
         }
         return value;
       }
       return undefined;
     }
     ```
   - **(c)** Replace `current.hasOwnProperty(key)` at line 102 with `hasOwn(current, key)`.
   - **(d)** Replace `current.hasOwnProperty(key)` at line 125 with `hasOwn(current, key)`.
   - **(e)** Remove the depth-≥1 function-invocation branch at lines 127-128. The `else if` becomes a plain `else { return undefined; }`.
   - **(f)** Wrap the i=0 function call at line 106 in try/catch the same way as (b).

3. **`src/core/utils/MOJOUtils.js` — `DataWrapper.getContextValue` (line 615)** — block forbidden keys before the `field in this` direct-access shortcut. The wrapper's `_data` / `_rootContext` exclusion already exists; extend it:

   ```js
   if (field in this && !FORBIDDEN_KEYS.has(field)
       && field !== '_data' && field !== '_rootContext') {
     value = this[field];
   } else {
     value = MOJOUtils.getNestedValue(this._data, field);
   }
   ```

4. **`test/unit/MOJOUtils.getNestedValue.test.js`** (new file) — direct unit tests for the helper:
   - Depth 0: `__proto__`, `constructor`, `prototype`, `toString`, `valueOf`, `hasOwnProperty`, `propertyIsEnumerable` all return `undefined`.
   - Depth ≥ 1: `user.__proto__`, `user.constructor.name`, `user.toString` all return `undefined`.
   - Custom methods at depth 0: `{ getStatus() { return 'ok'; } }` with path `getStatus` returns `'ok'`.
   - Class-defined methods on inheritance chain: a class with `getStatus()` on its prototype returns `'ok'` for path `getStatus`.
   - Shadowed `hasOwnProperty`: `{ hasOwnProperty: 1, name: 'A' }` with path `name` returns `'A'` (does not throw).
   - Class constructor at depth 0: `getNestedValue(view, 'someClassConstructor')` returns `undefined` (does not crash) — when the field's value is a class. This protects the `{{constructor}}` DoS vector through any pathway.

5. **CHANGELOG.md** — add a "Mustache / MOJOUtils — security: …" entry under `## Unreleased`. Note: this is hardening, not a fix for an actively exploited bug; the framework was always intended to render only author-controlled templates.

### Design Decisions

- **Block list, not allow list.** The framework intentionally allows custom view methods like `getStatus()` to be auto-invoked from templates. An allow list of "approved keys" would be too restrictive. Blocking the small known-bad set (`__proto__` / `constructor` / `prototype` + `Object.prototype` builtins) is the right granularity.
- **Reference-equality check (`value === Object.prototype[path]`) over name-list.** The runtime comparison automatically tracks any future additions to `Object.prototype` and correctly distinguishes a user-overridden `toString` (different function reference) from the inherited builtin. Cleaner than maintaining a hardcoded list of method names.
- **Drop the depth-≥1 invocation branch entirely.** Defended only by an audit of every caller; no caller relies on it. If a future template needs `{{a.b.someMethod}}` to invoke, the cleaner pattern is `{{a.b.someMethod}}` resolves to a function reference and gets called by a formatter, or the developer adds a computed property at the relevant level. Keeping the branch is "code that doesn't earn its keep" by KISS.
- **Try/catch around function calls.** The class-constructor crash (`Mustache.render('{{constructor}}', data)`) is a stability bug independent of the security concern. Catching at the invocation site is the smallest possible blast radius — any function that throws when called returns `undefined` instead of propagating.
- **Apply to `DataWrapper.getContextValue` too.** It has its own direct-access shortcut at line 615 that bypasses `getNestedValue` for top-level keys. Hardening only `getNestedValue` would leave a gap.
- **No change to `MOJOUtils.getContextData`.** It calls `getNestedValue` and benefits transitively. No edit needed.
- **Out of scope:** `Mustache.Context.lookup` itself (per task brief). Also out of scope: `Model._getNestedValue` and the search-view local walkers — different functions, different surface, deferrable.

### Edge Cases

- **Custom override of `toString`** (`{ toString() { return 'custom'; } }`): `value !== Object.prototype.toString` because the function references differ → invoked, returns `'custom'`. ✓
- **View method on class prototype** (`class Foo extends View { getStatus() { return 'ok'; } }`): `getStatus` is on `Foo.prototype`, not `Object.prototype`. `value !== Object.prototype['getStatus']` (which is `undefined`) → invoked. ✓
- **Object literal with own function field** (`{ render: () => 'hi' }`): `'render' in obj` true, `value === Object.prototype['render']`? `Object.prototype.render` is `undefined`, value is the function → `value !== undefined` → invoked. ✓
- **API payload with `hasOwnProperty: 1`**: the `hasOwn(obj, 'someField')` helper uses `Object.prototype.hasOwnProperty.call` — never invokes the shadowed field. ✓
- **Path containing only forbidden segment** (`'__proto__'`): segment-scan returns `undefined` immediately. ✓
- **Path with mixed valid + forbidden segments** (`'user.__proto__.x'`): segment-scan rejects on `__proto__`. ✓
- **Numeric array indices** (`'items.0.name'`): unaffected; numeric segments don't match `FORBIDDEN_KEYS`, the i≥1 array-index branch (line 122-124) is untouched. ✓
- **Existing tests** (`test/unit/MOJOUtils.test.js` `Method Calls` describe): `getName()` / `getGreeting()` are own functions on a literal context — invoked as today. `path in context` still finds them; `Object.prototype.getName` is undefined; not blocked. ✓

### Testing

- `node test/test-runner.js --suite unit` — full unit suite. Must remain at 703/703 plus the new `MOJOUtils.getNestedValue.test.js` cases (≈10-12 new assertions).
- Direct probe: `node --input-type=module -e` snippet against `MOJOUtils.getNestedValue` confirming `__proto__`, `constructor`, `toString` etc. return `undefined`.
- End-to-end probe: `Mustache.render('|{{__proto__}}|{{toString}}|{{constructor}}|', { name: 'A' })` returns `'|||'` (no leak, no crash).

### Docs Impact

- **No `docs/web-mojo/` change required.** No public API change; the documented behavior of `{{path.to.field}}` is unaffected for any non-adversarial template.
- **`CHANGELOG.md`** — short entry under `## Unreleased`:
  > **MOJOUtils — security:** dot-path lookup hardened against prototype-chain keys (`__proto__`, `constructor`, `prototype`) and `Object.prototype` builtins (`toString`, `valueOf`, `hasOwnProperty`, etc.). `getNestedValue` and `DataWrapper.getContextValue` now return `undefined` for these keys at every depth. Custom view methods (e.g. `getStatus()`) continue to auto-invoke. Robustness fix: API payloads with a shadowed `hasOwnProperty` field no longer break the walker.

### Residual surface (out of scope)

The Mustache non-prefix-branch fallback at [src/core/utils/mustache.js:285-287](src/core/utils/mustache.js:285) does its own `context.view[name]` access when `getContextValue` returns `undefined`. For top-level lookups against an auto-wrapped `DataWrapper`, this fallback still reads `wrapper.__proto__` / `wrapper.constructor` directly, and the function-invocation at line 309 still triggers the `DataWrapper` class-constructor crash on `{{constructor}}`.

This residual surface is **out of scope per the task brief** ("Out of scope for this task: `Mustache.Context.lookup` itself — that file should not be touched"). It should be addressed in a follow-up issue against `mustache.js`. The hardening landed here closes the surface for any caller that goes through `MOJOUtils.getContextData`, `View.getContextValue`, `DataWrapper.getContextValue`, `CollectionSelect`, `CollectionMultiSelect`, `DataFormatter` pipe-arg resolution, and the new Mustache dot-prefix branch — all the documented entry points.

## Resolution

### What was implemented

`MOJOUtils.getNestedValue` and `DataWrapper.getContextValue` are now hardened against prototype-chain traversal:

- A module-level `FORBIDDEN_KEYS = Set(['__proto__', 'constructor', 'prototype'])` rejects matching segments at every depth.
- The no-dot fast path skips auto-invocation when the function is reference-equal to `Object.prototype[key]` — `toString` / `valueOf` / `hasOwnProperty` / `propertyIsEnumerable` / `isPrototypeOf` / `toLocaleString` no longer auto-invoke.
- The depth-≥1 inherited-method invocation branch was removed (`else if (typeof current[key] === 'function')` deleted).
- A small `hasOwn` helper using `Object.prototype.hasOwnProperty.call(...)` replaces `current.hasOwnProperty(...)` so payloads with a shadowed field (e.g. `{ hasOwnProperty: 1 }` from an API) don't break the walker.
- `DataWrapper.getContextValue`'s direct-access shortcut now also checks `FORBIDDEN_KEYS` so `wrapper.__proto__` / `wrapper.constructor` aren't returned via the `field in this` fast path.

Try/catch around the function call was **not** added — existing `View-get.test.js:181` documents that errors must propagate from called functions, and the only realistic class-constructor crash (`{{constructor}}`) is already neutralized by the FORBIDDEN_KEYS segment block.

### Files changed

- `src/core/utils/MOJOUtils.js` — the hardening (commit `83b56da`)
- `test/unit/MOJOUtils.getNestedValue.test.js` — 22 new test cases (commit `83b56da`)
- `CHANGELOG.md` — Unreleased entry under "MOJOUtils — security:" (commit `83b56da`)

### Tests run and results

- `node test/test-runner.js --suite unit` → **725/725 pass** (was 703 before; +22 hardening tests). All existing tests including the explicit error-propagation contract pass unchanged.
- `npx eslint src/core/utils/MOJOUtils.js` → no NEW errors. The 4 pre-existing `no-prototype-builtins` warnings (in `deepClone`, `DataWrapper` constructor, `has()`) are at lines untouched by this fix; the diff actually REMOVED two `current.hasOwnProperty(key)` callsites.
- Direct probe via `MOJOUtils.getNestedValue` confirms `__proto__` / `constructor` / `prototype` / `toString` / `valueOf` all return `undefined`; `getStatus()` on a class instance still returns `'ok'`.

### Residual / follow-up

The Mustache non-prefix-branch fallback at `src/core/utils/mustache.js:285-287` and the function-invocation at line 309 are the **last template-reachable surface** for these adversarial keys end-to-end. For top-level `{{__proto__}}` / `{{toString}}` against an auto-wrapped `DataWrapper`, the fallback bypasses both `getContextValue` and `getNestedValue` and reads `wrapper.__proto__` directly. `{{constructor}}` still crashes the renderer through the same fallback. Per task brief, `mustache.js` was out of scope.

A follow-up issue should be opened to:
1. Apply the same `FORBIDDEN_KEYS` block in `Mustache.Context.lookup`'s non-prefix-branch fallback.
2. Wrap the function-invocation at `mustache.js:309` so a class-constructor doesn't crash the renderer.

### Agent findings

This task was executed in a single session without spawning the test-runner / docs-updater / security-review agents — the changes are tightly scoped to one file plus a new test file, and the hardening tests serve as the regression bar. The 725/725 unit-suite pass is the validation signal.
