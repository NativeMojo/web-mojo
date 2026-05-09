# Close residual prototype-chain surface in `Mustache.Context.lookup`

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-05-08 |
| Severity | medium |

## Description

Commit `83b56da` hardened `MOJOUtils.getNestedValue` and `DataWrapper.getContextValue` against `__proto__` / `constructor` / `prototype` keys and `Object.prototype` builtins, but `Mustache.Context.lookup` ([src/core/utils/mustache.js:113-318](src/core/utils/mustache.js:113)) has its own lookup paths that bypass both hardened APIs:

1. **Non-prefix-branch direct-access fallback** ([src/core/utils/mustache.js:292-295](src/core/utils/mustache.js:292)). When `getContextValue` returns `undefined` for a single-segment name, Mustache falls through to `intermediateValue = context.view[name]; lookupHit = hasProperty(context.view, name);`. For `name = '__proto__'`, this reads the wrapper's `__proto__` directly. `hasProperty` uses `in`, so the read succeeds even on inherited keys.

2. **Multi-segment dot-walk fallback** ([src/core/utils/mustache.js:257-291](src/core/utils/mustache.js:257)). When intermediates have no `getContextValue`, the inline walker does direct property access at `intermediateValue[names[index++]]` (lines 280, 289) without any forbidden-key guard.

3. **Post-loop function-invocation** ([src/core/utils/mustache.js:309](src/core/utils/mustache.js:309)). After the lookup succeeds and `value` is a function, `value.call(this.view)` runs unconditionally:
   - For `value === Object.prototype.toString`: returns `"[object Object]"`, leaking that the rendered context is a `DataWrapper`.
   - For `value === DataWrapper` (a class constructor reached via `{{constructor}}`): throws `TypeError: Class constructor DataWrapper cannot be invoked without 'new'`, **crashing the entire render**.

4. **Dot-prefix single-segment fallback** ([src/core/utils/mustache.js:168-174](src/core/utils/mustache.js:168), added in commit `01d7657`). For `{{.toString}}` inside iteration, the lookup falls through to `value = this.view[actualName]; if (isFunction(value)) value = value.call(this.view);`. Same `Object.prototype.toString` leak as #3, just on a different code path.

Empirical evidence (verified against HEAD before this fix):

```bash
$ node --input-type=module -e "globalThis.window=globalThis; \
  import('./src/core/utils/mustache.js').then(({default:M})=>{ \
    console.log(JSON.stringify(M.render('|{{__proto__}}|{{toString}}|',{name:'A'}))); \
    try{console.log(M.render('|{{constructor}}|',{name:'A'}))} \
    catch(e){console.log('CRASH',e.message)} \
  });"
"|[object Object]|[object Object]|"
CRASH Class constructor DataWrapper cannot be invoked without 'new'
```

## Context

The dot-prefix branch in `Context.lookup` is partially protected because it delegates multi-segment paths to `MOJOUtils.getNestedValue` (commit `01d7657`) and that helper is now hardened (commit `83b56da`). But:
- Single-segment dot-prefix paths (`{{.toString}}` inside iteration) take the inline fallback at `mustache.js:168-174` and never reach `getNestedValue`.
- Non-prefix-branch single-segment lookups (`{{toString}}` at top level) take the inline fallback at `mustache.js:292-295` and never reach `getNestedValue`.

`Mustache.Context.lookup` is the last template-reachable surface for these adversarial keys.

## Acceptance Criteria

- `Mustache.render('|{{__proto__}}|', { name: 'A' })` returns `'||'`.
- `Mustache.render('|{{toString}}|', { name: 'A' })` returns `'||'`.
- `Mustache.render('|{{valueOf}}|', { name: 'A' })` returns `'||'`.
- `Mustache.render('|{{hasOwnProperty}}|', { name: 'A' })` returns `'||'`.
- `Mustache.render('|{{constructor}}|', { name: 'A' })` returns `'||'` and **does not throw**.
- `Mustache.render('|{{a.constructor.name}}|', { a: {} })` returns `'||'`.
- `{{.toString}}` / `{{.constructor}}` / `{{.hasOwnProperty}}` inside `{{#items}}…{{/items}}` against plain-object items resolve to empty.
- Custom view methods (`getStatus()` etc.) and user-overridden `toString` continue to auto-invoke as today.
- View methods that throw (`view.errorFunction`) continue to propagate the error to the caller — silent error-swallowing is **not** acceptable for legit method exceptions; only the specific class-constructor `TypeError` is swallowed.
- Existing 8 cases in `test/unit/Mustache-dot-prefix.test.js` pass unchanged. Existing 22 cases in `test/unit/MOJOUtils.getNestedValue.test.js` pass unchanged.

## Investigation

- **Likely root cause:** `Context.lookup` was written before the prototype-chain attack surface was considered. The non-prefix-branch fallback uses `in` semantics (via `hasProperty`) which traverses the prototype chain, and the post-loop unconditionally calls any function-valued result. The dot-prefix single-segment fallback added in commit `01d7657` followed the same pattern and inherited the same exposure.
- **Confidence:** high. Verified end-to-end via the empirical reproduction above and traced through each branch.
- **Code path:**
  - Entry: any `Mustache.render(template, context)` where `template` references a forbidden key.
  - Surface 1 (top-level non-prefix): `Mustache.render` → `Context.lookup('toString')` → `view.getContextValue('toString')` returns `undefined` (DataWrapper hardened) → falls to `context.view['toString']` (line 293) → returns `Object.prototype.toString` → post-loop `value.call(this.view)` returns `"[object Object]"`.
  - Surface 2 (top-level non-prefix, class constructor): same path with `{{constructor}}` reaches `context.view.constructor` (the DataWrapper class itself, since hardening blocks the wrapper's getContextValue but not Mustache's own fallback) → post-loop `value.call(this.view)` throws.
  - Surface 3 (dot-prefix single-segment): `{{.toString}}` in iteration → dot-prefix branch (line 129) → `actualName = 'toString'`, no dot → `'toString' in view` true → `value = view.toString` → `isFunction(value)` true → `value.call(this.view)` returns `"[object Object]"`.
- **Caller blast-radius audit:** Every Mustache template render in the framework. No production callers depend on `{{__proto__}}` / `{{toString}}` / `{{constructor}}` rendering meaningful content — these are template-author bugs at best, attacker payloads at worst.
- **Regression test:** new file additions to `test/unit/MOJOUtils.getNestedValue.test.js` (Mustache E2E section) and `test/unit/Mustache-dot-prefix.test.js` (dot-prefix prototype block).
- **Related files:**
  - [src/core/utils/mustache.js](src/core/utils/mustache.js) — fix site, three change locations.
  - [test/unit/MOJOUtils.getNestedValue.test.js](test/unit/MOJOUtils.getNestedValue.test.js) — three Mustache E2E tests were dropped from the previous fix; restore them.
  - [test/unit/Mustache-dot-prefix.test.js](test/unit/Mustache-dot-prefix.test.js) — add dot-prefix prototype block.
  - [planning/done/getnestedvalue-prototype-hardening.md](planning/done/getnestedvalue-prototype-hardening.md) — full design context for the prior commit.

## Plan

### Objective

Apply prototype-key blocklist + Object.prototype-builtin guard + targeted class-constructor `try`/`catch` to `Mustache.Context.lookup`, so the empirical reproduction above renders empty strings instead of leaking prototype data or crashing.

### Steps

1. **`src/core/utils/mustache.js`** — add a module-level `FORBIDDEN_KEYS` constant near the imports:

   ```js
   // Match MOJOUtils.js — keys that must never be reachable via dot-notation
   // template lookups. Duplicated rather than imported to keep mustache.js
   // self-contained.
   const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
   ```

2. **`Context.lookup` entry check** — right after the `name === '.'` special case ([src/core/utils/mustache.js:122-125](src/core/utils/mustache.js:122)), add:

   ```js
   // Block prototype-chain keys at every depth, on every branch.
   // Strips an optional leading dot (dot-prefix syntax) and pipes before
   // segmenting; pipes don't affect the path-segment check.
   if (name) {
     const pathOnly = (name.startsWith('.') ? name.slice(1) : name).split('|')[0];
     if (pathOnly.split('.').some(seg => FORBIDDEN_KEYS.has(seg))) {
       return undefined;
     }
   }
   ```

   This single check covers `{{constructor}}`, `{{__proto__}}`, `{{a.b.constructor}}`, `{{.constructor}}`, `{{.a.b.__proto__}}`, `{{constructor|upper}}`, etc. across BOTH the dot-prefix branch and the non-prefix branch — the check is at the top of `lookup`, before the branching logic.

3. **Dot-prefix single-segment fallback guard** — at [src/core/utils/mustache.js:168-174](src/core/utils/mustache.js:168), tighten the auto-invocation branch:

   ```js
   } else if (actualName in this.view) {
     value = this.view[actualName];
     if (isFunction(value)) {
       // Skip Object.prototype builtins (toString, valueOf, etc.).
       if (value === Object.prototype[actualName]) {
         value = undefined;
       } else {
         value = value.call(this.view);
       }
     }
   }
   ```

4. **Post-loop function-invocation guard** — replace [src/core/utils/mustache.js:309](src/core/utils/mustache.js:309):

   ```js
   if (isFunction(value)) {
     // Skip Object.prototype builtins (toString, valueOf, hasOwnProperty,
     // etc.) — auto-invoking them leaks "[object Object]"-style data.
     // Use the last path segment so {{toString}} and {{a.b.toString}} are
     // both caught.
     const lastSegment = name.split('|')[0].split('.').pop();
     if (value === Object.prototype[lastSegment]) {
       value = undefined;
     } else {
       try {
         value = value.call(this.view);
       } catch (e) {
         // Class constructors throw TypeError "Class constructor X cannot be
         // invoked without 'new'". Swallow only that specific case so legit
         // view methods that throw still propagate the error to the caller.
         if (e instanceof TypeError && /^Class constructor /.test(e.message)) {
           value = undefined;
         } else {
           throw e;
         }
       }
     }
   }
   ```

5. **`test/unit/MOJOUtils.getNestedValue.test.js`** — restore the three Mustache E2E tests that were dropped because they failed against pre-hardening Mustache:

   ```js
   describe('Mustache.render — prototype keys do not leak end-to-end', () => {
     const Mustache = loadModule('MojoMustache');
     it('renders empty for {{__proto__}} against a plain data object', () => {
       expect(Mustache.render('|{{__proto__}}|', { name: 'A' })).toBe('||');
     });
     it('renders empty for {{toString}} against a plain data object', () => {
       expect(Mustache.render('|{{toString}}|', { name: 'A' })).toBe('||');
     });
     it('does not crash on {{constructor}}', () => {
       expect(() => Mustache.render('|{{constructor}}|', { name: 'A' })).not.toThrow();
       expect(Mustache.render('|{{constructor}}|', { name: 'A' })).toBe('||');
     });
   });
   ```

6. **`test/unit/Mustache-dot-prefix.test.js`** — add a small dot-prefix prototype block confirming that single-segment `{{.toString}}` / `{{.constructor}}` / `{{.hasOwnProperty}}` inside iteration return empty.

### Design Decisions

- **Duplicate `FORBIDDEN_KEYS` rather than import from MOJOUtils.js.** Three strings, no future drift expected, keeps `mustache.js` self-contained. The cost of importing would be cross-file coupling for negligible deduplication.
- **Single entry-point block-list check.** Putting the FORBIDDEN_KEYS check at the very top of `Context.lookup` covers BOTH the dot-prefix branch (line 129) and the non-prefix branch (line 228) in one place. Branch-by-branch checks would be three sites and easy to miss in future refactors.
- **Last-segment Object.prototype reference equality.** `value === Object.prototype[lastSegment]` is a runtime comparison that automatically tracks `Object.prototype` changes and correctly distinguishes a user-overridden `toString` (different function reference) from the inherited builtin. Cleaner than maintaining a hardcoded list of method names.
- **Surgical class-constructor catch.** The brief asks for try/catch, but blanket error-swallowing would silently hide developer bugs (e.g. a view method that throws). A `TypeError` with message starting `Class constructor ` is the specific signature for `someClass.call(x)`; matching only that preserves error propagation for everything else.
- **Pipes stripped from segment-check input.** A template like `{{toString|upper}}` would have `name = 'toString|upper'`. Without stripping the pipe, the segment-check sees `'toString|upper'` as a single segment that doesn't match. Stripping the pipe first ensures the check fires correctly. The Object.prototype guard's `lastSegment` calculation does the same for consistency.
- **Out of scope:** broader refactor of `Context.lookup`. The parent-chain walk (line 241-303), `getContextValue` precedence, and cache logic must remain intact.

### Edge Cases

- **`{{name}}` where `name` is a real field**: not in FORBIDDEN_KEYS, passes through untouched. ✓
- **`{{model.name}}`**: not in FORBIDDEN_KEYS, normal multi-segment lookup. ✓
- **`{{getStatus}}` for a custom view method on a class prototype**: `getStatus` is not on `Object.prototype`, so `value !== Object.prototype['getStatus']` (which is `undefined`) → invoked normally. ✓
- **`{{toString}}` for a context with a user-overridden `toString`**: value is the user's function, not `Object.prototype.toString`. Reference comparison fails → invoked normally → returns the user's value. ✓
- **`{{a.b.toString}}` where `a.b` is a plain object**: lookup walks to `a.b`, then `toString` resolves to `Object.prototype.toString`. Last-segment guard catches. ✓
- **`{{constructor|upper}}` (forbidden key with pipe)**: pipe stripped before segment check, `'constructor'` rejected. ✓
- **`{{ getName }}` for an own function field**: own function, not on `Object.prototype` → auto-invoked. ✓
- **View method that throws** (`view.errorFunction = () => { throw new Error('x') }`): `isFunction(value)` true, `value !== Object.prototype['errorFunction']` (which is `undefined`) → invoked → throws Error → not a `TypeError` matching `Class constructor /` regex → re-thrown. ✓ (Existing `View-get.test.js:181` contract preserved.)
- **`Mustache.render('{{__proto__.polluted}}', payload)`**: segment-check sees `__proto__` in path → returns `undefined`. ✓ Defense against prototype-write attacks too (although this fix is read-only protection; writes were never possible through this code).

### Testing

- `node test/test-runner.js --suite unit` — must remain at 725+ pass with the new tests added (≈ 6-8 new assertions). Existing dot-prefix and getNestedValue tests unchanged.
- Spot-check the empirical reproduction from the issue header — should now print `||||` (no leaks) and not crash.

### Docs Impact

- **No `docs/web-mojo/` change required.** No public API change; documented behavior of `{{path.to.field}}` for any non-adversarial template is unchanged.
- **`CHANGELOG.md`** — append a short entry under the existing `MOJOUtils — security:` block (or a new `Mustache — security:` block) noting that the residual surface in `Context.lookup` is now closed, with explicit before/after for `{{__proto__}}` / `{{toString}}` / `{{constructor}}`.

## Resolution

### What was implemented

`Mustache.Context.lookup` now blocks prototype-chain keys at every depth on every branch, and the function-invocation sites (dot-prefix single-segment fallback and the post-loop) skip `Object.prototype` builtins. The post-loop's `try`/`catch` is surgical — only the class-constructor `TypeError` is swallowed; legitimate view-method exceptions still propagate.

### Files changed

- `src/core/utils/mustache.js` — three change sites (commit `d54853f`)
  - Module-level `FORBIDDEN_KEYS` constant.
  - Entry-point segment-block-list check at the top of `Context.lookup`.
  - Object.prototype-builtin guard at the dot-prefix single-segment fallback.
  - Object.prototype-builtin guard + class-constructor `try`/`catch` at the post-loop.
- `test/unit/MOJOUtils.getNestedValue.test.js` — 8 new Mustache E2E test cases (commit `d54853f`).
- `test/unit/Mustache-dot-prefix.test.js` — 3 new dot-prefix prototype block tests (commit `d54853f`).
- `CHANGELOG.md` — entry under `## Unreleased / Mustache — security:` (commit `d54853f`).

### Tests run and results

- `node test/test-runner.js --suite unit` → **736/736 pass** (was 725 + 11 new). All existing `Mustache-dot-prefix`, `MOJOUtils.getNestedValue`, `MOJOUtils`, `View-get`, and `View` tests continue to pass.
- Empirical reproduction from the issue header now renders cleanly:
  - `Mustache.render('|{{__proto__}}|{{toString}}|', { name: 'A' })` → `'|||'` (was `'|[object Object]|[object Object]|'`)
  - `Mustache.render('|{{constructor}}|', { name: 'A' })` → `'||'` (was `CRASH`)
- View-method error propagation verified intact: `Mustache.render('{{errorFn}}', { errorFn: () => { throw new Error('legit error'); } })` re-throws "legit error" as before.

### Agent findings

This task was executed in a single session without spawning the test-runner / docs-updater / security-review agents — the 11 new test cases serve as the regression bar, and the changes are tightly scoped to one source file plus two test files. The 736/736 unit-suite pass plus the empirical reproduction's clean output are the validation signals.

### Closes

This is the third and final commit in the prototype-chain hardening series:
- `01d7657` — Mustache: fix dot-prefixed multi-segment paths inside iteration (introduced `getNestedValue` as a template-reachable surface)
- `83b56da` — MOJOUtils: harden dot-path lookup against prototype-chain keys
- `d54853f` — Mustache: close residual prototype surface in Context.lookup ← this commit

After `d54853f`, no template-reachable path through the framework's data-lookup APIs leaks `Object.prototype` builtins or crashes on `{{constructor}}`. Custom view methods, user-overridden `toString`, multi-segment paths, pipes, and iteration all continue to work.
