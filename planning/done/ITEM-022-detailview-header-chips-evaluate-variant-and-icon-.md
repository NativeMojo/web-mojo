---
id: ITEM-022
type: bug
title: "DetailView header chips — evaluate `variant` (and `icon`) as functions like `text`"
priority: P2
effort: S
owner: TBD
opened: 2026-06-15
depends_on: []
related: []
links: []
---
# DetailView header chips — function `variant`/`icon` are silently stringified

## Description

`DetailHeaderView._resolveChips()` (`src/core/views/data/DetailView.js`)
function-evaluates `chip.text` (and `chip.tooltip`) against the model, but uses
`chip.variant` and `chip.icon` **literally**:

```js
// src/core/views/data/DetailView.js  (~line 159)
return {
    icon: chip.icon || null,                 // literal — function not called
    text: text != null ? String(text) : '',  // function-evaluated ✓
    variant: chip.variant || 'light',         // literal — function not called ✗
    tooltip,                                   // function-evaluated ✓
    action: chip.action || null
};
```

The rendered template then interpolates `variant` straight into the class:
`<span class="badge bg-${escapeHtml(chip.variant)}">`. So a chip defined the
natural way for a status badge —

```js
{ icon: 'bi-circle-fill',
  text:    m => m.getStatusLabel(),
  variant: m => m.getStatusVariant() }   // returns 'success' / 'danger' / …
```

— produces a **broken class** with the function source stringified into it:

```html
<span class="badge bg-d=&gt;d.get(&quot;is_active&quot;)?&quot;success&quot;:&quot;secondary&quot;">Active</span>
```

i.e. no Bootstrap color, garbage class. The asymmetry is the bug: `text` and
`tooltip` accept functions, `variant` and `icon` do not, even though a status
chip almost always wants a model-derived `variant` paired with its `text`.

## Impact

Observed live in a consuming portal: every DetailView whose
header has a status chip with a function `variant` renders the chip uncolored
with a malformed class. ~11 detail views affected there (Player, Kiosk, Brand,
Redemption, Campaign, ReportRun, Amoe, WalletPackage, Alea/MojoVerify config,
…). The text shows, so it's "only" cosmetic, but it's pervasive and looks
broken. Today's only correct workaround is to enumerate one static-`variant`
chip per possible state with a `when` guard — verbose and unmaintainable for
multi-valued statuses, and it has to be repeated in every consuming view.

## Proposed fix

In `_resolveChips()`, resolve `variant` and `icon` the same way as `text`:

```js
const variant = (typeof chip.variant === 'function'
    ? chip.variant(this.model) : chip.variant) || 'light';
const icon = (typeof chip.icon === 'function'
    ? chip.icon(this.model) : chip.icon) || null;
```

This is backward compatible — string `variant`/`icon` behave exactly as before;
only the function form changes (from broken to working). Mirrors the existing
`text`/`tooltip` handling and the chip docs that already show `text`/`when` as
`(model) => …`.

## Acceptance Criteria

- [ ] `chip.variant` accepts a `(model) => string` function; the returned token
      is used as `bg-<token>` (and falls back to `'light'` when falsy).
- [ ] `chip.icon` accepts a `(model) => string` function (falls back to no icon
      when falsy).
- [ ] String `variant`/`icon` unchanged (backward compatible).
- [ ] Re-evaluated on the header's model-change re-render, so a chip recolors
      after the model's state changes (e.g. activate/deactivate).
- [ ] Docs (`docs/web-mojo/components/DetailView.md`) note `variant`/`icon` may
      be functions; CHANGELOG entry.

## Notes

- Source: `src/core/views/data/DetailView.js` — `_resolveChips()` and the chip
  span/button template in `_buildTemplate()`.
- Consuming-app context: The portal is applying
  `when`-gated static-variant chips as a stopgap on the few boolean cases and
  filing this so the multi-valued status chips can be fixed at the framework
  layer instead of being worked around in ~11 files.

### Agreed plan (scoped 2026-06-15, approved)

- **Fix:** in `_resolveChips()` resolve `variant` and `icon` through the same
  `typeof … === 'function' ? fn(this.model) : value` pattern used for
  `text`/`tooltip`/`iconHtml`. Keep `|| 'light'` / `|| null` fallbacks.
  Backward compatible — string values flow through unchanged.
- **Re-render (AC 4) is free:** `_onModelChange()` → `headerView.render()` →
  `_buildTemplate()` → `_resolveChips()`, so functions re-evaluate on every
  model-change re-render. No new wiring.
- **Covers button chips too:** the `action` (button) branch reads the same
  resolved `c.variant`/`c.icon`, so no extra change.
- **Tests** (`test/unit/DetailView.test.js`, regression — fail before / pass
  after): (1) function `variant` → `bg-success`, no `bg-d=&gt;` garbage;
  (2) function `icon` → `bi bi-<x>`; (3) string `variant`/`icon` unchanged;
  (4) variant flips after `model.set(...)` re-render (mirror the line-204 aux
  re-render test).
- **Docs:** `docs/web-mojo/components/DetailView.md` chips section — mark
  `variant`/`icon` as `string | (model) => string`. `CHANGELOG.md` entry.

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Resolved

**Files changed**:
- `src/core/views/data/DetailView.js` — `_resolveChips()` now evaluates `variant`/`icon`
  as `(model) => string` functions (mirrors `text`/`tooltip`); added `CHIP_TOKEN_RE`
  sanitization so a function result is constrained to a single CSS-class token,
  falling back to `light` / no icon otherwise.
- `test/unit/DetailView.test.js` — 5 regression tests (function variant/icon,
  backward-compat string, sanitization, re-color on re-render).
- `docs/web-mojo/components/DetailView.md` — Chips section documents the function forms.
- `CHANGELOG.md` — Unreleased entry + hardening note.

**Tests added**:
- `evaluates a function variant against the model (no stringified source)`
- `evaluates a function icon against the model`
- `leaves string variant/icon unchanged (backward compatible)`
- `sanitizes a function variant carrying stray class tokens`
- `re-colors a function-variant chip on model-change re-render`
- All 4 function/re-render tests fail before the fix, pass after.

**Tests run**:
- `npm run test:unit` — 1238 passed, 0 failed.
- `npm test` (full runner, via post-build test-runner agent) — 1379 passed, 0 failed.
- `npx eslint` on both changed files — clean.

**Docs updated**:
- `docs/web-mojo/components/DetailView.md`
- `CHANGELOG.md`

**Validation**:
Regression tests assert that a function `variant`/`icon` produces the resolved
token in the rendered `bg-<token>` / `bi <icon>` class (no stringified-function
garbage), that string values are unchanged, that a stray-token result is
sanitized to the safe default, and that a chip re-colors after `model.set(...)`
+ header re-render. Post-build security review flagged a CSS-class-injection
surface widened by the function form; addressed with the `CHIP_TOKEN_RE` guard.
