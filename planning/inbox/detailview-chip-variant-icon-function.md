---
id:
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

Observed live in a consuming portal (WMX admin portal): every DetailView whose
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
- Consuming-app context: WMX portal WMX-PORTAL-072. The portal is applying
  `when`-gated static-variant chips as a stopgap on the few boolean cases and
  filing this so the multi-valued status chips can be fixed at the framework
  layer instead of being worked around in ~11 files.

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Open

**Files changed**:
- `src/...`

**Tests run**:
- `npm run ...`

**Docs updated**:
- `docs/...`
- `CHANGELOG.md` (if applicable)

**Validation**:
[How the final behavior was verified]
