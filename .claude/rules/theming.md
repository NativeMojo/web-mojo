---
globs: ["src/core/views/**/*.js", "src/core/forms/**/*.js", "src/core/pages/**/*.js", "src/extensions/**/*.js", "src/core/css/**/*.css", "src/extensions/**/*.css"]
---

# Dark / Light Theme Rules

WEB-MOJO ships a real `data-bs-theme="dark"` palette (deep mission-control surfaces — `#0a0d11` page, `#11161d` cards, `#1f2630` borders, `#e6ecf3` text, `#8a96a6` muted). Every new component **MUST** render correctly under both themes from day one.

## Use Bootstrap tokens, not hex literals

Component CSS — whether in an external `.css` file or an inline `<style>` block emitted by `getTemplate()` — should reach for Bootstrap surface tokens that auto-adapt:

| Need | Use |
|---|---|
| Page / panel background | `var(--bs-body-bg)` |
| Card / lifted surface | `var(--bs-tertiary-bg)` |
| Chip / input surface | `var(--bs-secondary-bg)` |
| Border (solid) | `var(--bs-border-color)` |
| Border (subtle hairline) | `var(--bs-border-color-translucent)` |
| Primary body text | `var(--bs-body-color)` |
| Strong / emphasis text | `var(--bs-emphasis-color)` |
| Muted / label text | `var(--bs-secondary-color)` |
| Brand accent | `var(--bs-primary)` |

Don't bake `#fff`, `#f8f9fa`, `#212529`, `#6c757d`, or hand-rolled rgb literals into a component if the same value lives behind a Bootstrap token — the token tracks the theme automatically. **One short sentence rule: if it's a surface, use a token.**

## When you really do need a literal

Component-specific tints (e.g. a 4 % white inset for a glass effect, a brand-tinted shadow color, a delta badge bg) sometimes don't map cleanly to a Bootstrap token. That's fine — but you owe a matching `[data-bs-theme="dark"]` override:

```css
.my-card { background: rgba(0, 0, 0, 0.04); }   /* light: black at 4% */
[data-bs-theme="dark"] .my-card { background: rgba(255, 255, 255, 0.04); }
```

Hover/active states using `rgba(0, 0, 0, ...)` invariably need the matching `rgba(255, 255, 255, ...)` companion — those go invisible against the dark page bg.

## Inline `<style>` blocks emitted from `getTemplate()`

Components that emit a `<style>` block at render time (`SideNavView`, the user-profile section views, etc.) must include both light defaults **and** dark overrides in the same block. Pattern:

```js
return `
  <style>
    .my-rail { background: #f8f9fc; color: #495057; }
    .my-rail a:hover { background: #e9ecef; }

    [data-bs-theme="dark"] .my-rail { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
    [data-bs-theme="dark"] .my-rail a:hover { background: var(--bs-secondary-bg); }
  </style>
  <div class="my-rail">…</div>
`;
```

The dark block can use Bootstrap tokens directly (they re-skin under dark theme) or hardcoded mission-control values if the override is more refined than the defaults.

## External CSS files

Files in `src/core/css/` and `src/extensions/*/css/` follow the chat.css / portal.css convention:

1. Base rules at top with hardcoded light values.
2. All `[data-bs-theme="dark"]` overrides clustered at the bottom of the file under a clear section header.

Don't scatter dark overrides next to every light rule — group them so the dark-theme footprint is auditable in one place.

## Modals don't break the cascade

`data-bs-theme` is set on `<html>`, and Bootstrap modals are rendered inside `<body>` (still descendants of `<html>`), so dark-theme rules continue to apply to modal content. **There's no need to add modal-specific dark overrides** for components that already work in the page. If a component looks light inside a modal but dark on the page, the bug is the component's own CSS, not the modal.

## Test before declaring done

Every visual change must be eyeballed under both themes. The fastest path:

1. Run `npm run dev`.
2. Open the example portal.
3. Use the topbar **Theme settings** dropdown to flip between **Light** and **Dark**.
4. Inspect the changed component in both states. Verify text contrast, dividers, hover/active states, and any component-specific tints all read.
5. For preview-tool checks: `getComputedStyle(el).backgroundColor` on the affected element under both `data-bs-theme="light"` and `="dark"` should resolve to distinct values (or to the same value only when it's intentional).

## Audit signal

Grep-style smell tests for an in-progress component:

- **`grep -n "background:\s*#\|color:\s*#\|background-color:\s*#"`** in the file should return values you can defend (brand tints, badge fills) — NOT generic surface colors that should be tokens.
- **`grep -n "rgba(0, 0, 0,"`** without a matching `rgba(255, 255, 255,` companion is almost always a missed dark-theme case.
- **No `[data-bs-theme]` selectors at all** in a component that paints any surface or text is a yellow flag — file an issue rather than ship.

## References

- Framework dark palette: `src/core/css/core.css` (the `:root[data-bs-theme="dark"]` block).
- Existing dark-theme audits to mirror: `chat.css:381+`, `portal.css:3247+` (SideNavView), `admin.css:2228+` (assistant panel).
- TopNav `theme: 'auto'` for navbars that need to follow the theme live: `docs/web-mojo/components/SidebarTopNav.md` (Auto theme section).
