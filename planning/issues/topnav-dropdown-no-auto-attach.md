# TopNav user-menu dropdown doesn't auto-attach to Bootstrap

**Type**: bug
**Status**: open
**Date**: 2026-04-25

## Description

`TopNav` renders the user-menu dropdown with the standard Bootstrap markup:

```html
<div class="nav-item dropdown">
    <a class="nav-link dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
        <i class="bi-person-circle me-1"></i>
        Demo User
    </a>
    <ul class="dropdown-menu dropdown-menu-end">…</ul>
</div>
```

Clicking the toggle doesn't open the menu via Bootstrap's data-API. `bootstrap.Dropdown.getInstance(toggle)` returns null. Manually creating an instance and calling `.show()` works, so the markup is correct — Bootstrap simply isn't attaching to it on click delegation.

Suspected cause: the topbar renders dynamically after Bootstrap's data-API has scanned the document; while Bootstrap's delegated click handler should still fire, something on the page is intercepting the click first or the toggle's parent is missing the ancestor selector Bootstrap relies on.

## Reproduction

Load the new portal at `?page=home`. Click the "Demo User" dropdown in the top-right corner. Nothing happens (in the new examples portal, the click navigates to `/examples/auth/` instead — that's because the URL was the old login href before setActiveUser swapped it; even after the swap, the toggle click silently fails to open the menu).

## Expected Behavior

Clicking a `[data-bs-toggle="dropdown"]` element under the topbar opens its sibling `.dropdown-menu`, exactly like other Bootstrap dropdowns elsewhere in the app.

## Workaround

Manually attach a Bootstrap instance after render. Either:
- In TopNav's `onAfterRender`, find every `[data-bs-toggle="dropdown"]` inside `this.element` and call `bootstrap.Dropdown.getOrCreateInstance(el)`.
- OR delegate clicks: `nav.addEventListener('click', e => { const t = e.target.closest('[data-bs-toggle="dropdown"]'); if (t) bootstrap.Dropdown.getOrCreateInstance(t).toggle(); })`.

The framework should pick one and apply it once.

## Affected Area
- `src/core/views/navigation/TopNav.js` — render path that emits the dropdown markup
- All consumers of `topbar.userMenu`

## Surfaced By

Wave 2.5 wiring the new portal topbar with a proper `userMenu`. Verified the menu HTML + items render correctly; only the click-to-open was broken.

---
## Resolution
**Status**: Worked around — 2026-04-25 (framework fix still pending)
**Files changed**: `examples/portal/app.js` (workaround only)
**Workaround**: Added a delegated `document` click listener that lazy-creates a Bootstrap.Dropdown instance for any `[data-bs-toggle="dropdown"]` toggle that doesn't have one yet, then toggles it. Verified the userMenu now opens on click in the new portal. The framework-level fix (auto-attaching from inside `TopNav.onAfterRender`) is still pending — kept this issue open in `planning/issues/` until the upstream fix lands; downstream apps that don't reuse the portal's app.js workaround will hit the same bug.
