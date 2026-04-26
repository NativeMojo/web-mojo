# Fix broken Dialog/Modal alerts and refresh visual design

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-04-26 |
| Priority | high |

## Description

Three intertwined problems with the dialog/modal stack:

1. **Bug — typed alerts all render as `info`.** `Dialog.alert(message, title, options)` is documented as a three-argument call, but the implementation only accepts `(string)` or `(options)`. When called with three arguments, the second and third arguments are silently dropped, so `type: 'success' | 'warning' | 'error'` never reaches the dialog. Every typed alert renders with the default `info` icon and color. The Dialog example page (`/components/dialog`) demonstrates this clearly: all four typed alert buttons show the same blue info icon.

2. **`WebApp.showError/showSuccess/showInfo/showWarning` are broken in the same way.** They each call `Dialog.alert(message, 'Title', { class: 'text-...' })`. The third arg gets dropped, so the title-coloring class never lands on the modal and every variant looks identical.

3. **Design refresh.** Plain Bootstrap modals look generic next to the polished toast notifications. We want a small visual lift on the dialog chrome plus toast-style colored left borders on typed alerts, so the alert type is communicated visually as well as via the icon.

The framework will continue to support `Dialog` directly (deprecated but not removed). New code should reach for `Modal.alert/confirm/prompt`, and `app.showError/...` will route through the Modal aliases.

## Context

The `Dialog.alert` arg-handling bug has been around long enough that production callers have grown to depend on the visually identical behavior — but the docs (`docs/web-mojo/components/Dialog.md`) and examples (`examples/portal/examples/components/Dialog/DialogExample.js`) all use the three-arg signature, and `WebApp.js` itself uses it in four places. The right fix is to make the implementation match the documented signature.

Modal already exists as a thin static wrapper around Dialog (`src/core/views/feedback/Modal.js`) with `alert/confirm/prompt/form/modelForm/dialog/showError` aliases. It is the recommended surface for new code; this request makes that direction visible in the example portal and the internal `WebApp` helpers.

The toast styling pattern (`scripts/css/toast.css`) is the visual reference for typed feedback: white card, 4px solid colored left border, colored circle icon. Reusing the same color tokens keeps the system coherent.

## Recommendation (resolves your question 2)

Apply both visual changes, but to different scopes:

- **Chrome refresh (rounded corners, header gradient tint, offset X close ring) → applies to ALL dialogs.** Every `.modal-content` regardless of how it was opened (alert / confirm / prompt / showForm / showDialog / showModelView / Modal.show). This is purely a shell restyle, no per-type behavior.
- **Toast-style colored left border (4px) → applies ONLY to typed alerts.** That means `Dialog.alert(... { type })` and its `Modal.alert` alias. `confirm`, `prompt`, `showForm`, `showDialog`, and `Modal.show` get the chrome refresh but NOT a left border, because they aren't type-tagged surfaces.

`Dialog.alert` will set a `modal-alert modal-alert-{type}` class on the dialog root so CSS can target the four typed variants for the left border + icon-circle treatment.

## Acceptance Criteria

**Bug fix — `Dialog.alert`:**
- `Dialog.alert(message, title?, options?)` accepts the documented three-argument signature.
- The four buttons on `/components/dialog` (info / success / warning / error) each render with their own icon, color, and accent.
- The existing object-form `Dialog.alert({ message, title, type })` continues to work unchanged.
- The single-string form `Dialog.alert('hi')` continues to work unchanged.

**Bug fix — `WebApp` helpers:**
- `app.showError(msg)` renders the error-styled alert (red border, red icon).
- `app.showSuccess(msg)` renders the success-styled alert (green).
- `app.showInfo(msg)` renders the info-styled alert (blue / accent).
- `app.showWarning(msg)` renders the warning-styled alert (yellow).
- These four helpers route through `Modal.alert(msg, title, { type })` (move toward the Modal aliases — primary task).

**Modal aliases:**
- `Modal.alert/confirm/prompt` continue to forward to `Dialog` and benefit from the same fix.
- `Modal.showError(msg)` keeps its current behavior; it should now correctly render the error variant via the fixed `Dialog.alert` path.

**Visual:**
- All dialogs (alert/confirm/prompt/showForm/showDialog/showModelView/Modal.show) share a refreshed chrome:
  - Modal corners are slightly more rounded (matches the screenshot reference).
  - Header has a subtle gradient tint using the new accent variable.
  - Close (X) button is rendered as a small circular badge offset slightly above/right of the modal corner (matches the screenshot reference).
- Typed alerts only (`Dialog.alert` / `Modal.alert` with `type`) additionally get a 4px solid colored left border:
  - info → blue (accent variable, default `#0d6efd`)
  - success → green (`#198754`)
  - warning → yellow (`#ffc107`)
  - error/danger → red (`#dc3545`)
- Icon styling on typed alerts mirrors `toast.css` — colored circle background, white (or black on warning) icon.
- Color tokens reuse the same hex values currently used in `scripts/css/toast.css` so the system stays coherent.

**CSS variable for the accent:**
- A new variable, default name `--mojo-dialog-accent`, defined in `scripts/css/core.css`.
- Default value is `var(--bs-primary)` so the dialog accent automatically picks up each portal's Bootstrap primary.
- Consumer apps can override `--mojo-dialog-accent: <color>` at `:root` (or any scope) to set a fixed violet/custom hue without touching `--bs-primary`.
- The header gradient and the info-typed alert border both read this variable.

**Dark mode:**
- The new dialog CSS includes `prefers-color-scheme: dark` rules in the same shape as the existing toast dark-mode block (dark card background, lighter text, borders adjusted).

**Backward compatibility:**
- No public API rename. `Dialog`, `Modal`, and `app.show*` helpers keep their current names and call signatures.
- All existing call sites continue to work; the only behavior change is that `type` / `class` options now actually take effect.

## Investigation

### What exists

- `src/core/views/feedback/Dialog.js`
  - `static async alert(options = {})` (~line 1511): only handles `(string)` or `(options)`. Three-arg form drops args 2 and 3. **This is the root bug.**
  - `static async confirm(message, title, options)`: already correctly handles three args (no change needed).
  - `static async prompt(message, title, options)`: already correctly handles three args (no change needed).
  - `static async showDialog(options)`: handles a legacy `(message, title, options)` signature — pattern to mirror in `alert()`.
  - Sets icon and `titleClass` from `type` (info / success / warning / danger / error). The icon HTML is correct; what's missing is propagating a class to the modal root for the left-border treatment.
- `src/core/views/feedback/Modal.js`
  - Already provides `alert/confirm/prompt/form/modelForm/dialog/showError` static aliases that delegate to `Dialog`. No signature changes needed; they inherit the fix automatically.
- `src/core/WebApp.js` (~lines 525–592)
  - `showError`, `showSuccess`, `showInfo`, `showWarning` each call `Dialog.alert(message, 'Title', { size: 'md', class: 'text-...' })`. All four will be rewritten to call `Modal.alert(message, 'Title', { type: 'error' | 'success' | 'info' | 'warning', size: 'md' })` and import `Modal` instead of `Dialog`.
- `scripts/css/toast.css`
  - The visual reference. Mirrors the design we want: white card, 4px solid color left border (`#198754`/`#dc3545`/`#ffc107`/`#0d6efd`), colored circle icon, dark-mode block. Reuse the same hex values.
- `scripts/css/core.css` (~lines 1320–1389)
  - Already contains modal-context-menu and `modal-xxl` rules. New dialog chrome + typed-alert CSS should be added in the same file (or a sibling include if the team prefers a dedicated `dialog.css`).

### What changes

**Code (small, surgical):**
1. Rewrite `Dialog.alert` arg parsing to support `(message, title?, options?)` in addition to the existing `(string)` and `(options)` forms. Same pattern as `Dialog.showDialog`'s legacy-signature handling.
2. Have `Dialog.alert` add `modal-alert modal-alert-{type}` to the dialog root `class` option, so CSS can target typed alerts for the left border.
3. In `WebApp.js`, replace the four `Dialog.alert(...)` calls in `showError/showSuccess/showInfo/showWarning` with `Modal.alert(...)` calls passing `{ type }`. Import `Modal` lazily as `Dialog` is currently imported.

**CSS (add to `scripts/css/core.css` or a new `scripts/css/dialog.css` included from the same place toast.css is included):**
4. Define `--mojo-dialog-accent: var(--bs-primary)` at `:root`.
5. Refresh `.modal-content` chrome — slightly larger `border-radius`, soft box-shadow, header gradient tint using `--mojo-dialog-accent`.
6. Reposition `.modal-header .btn-close` as a small circular badge offset to the top-right corner.
7. Add `.modal.modal-alert.modal-alert-{info|success|warning|error|danger}` rules for the 4px left border and circular colored icon, mirroring `.toast-service-*` styling.
8. Add a `prefers-color-scheme: dark` block matching the toast dark-mode shape.

**Example page:**
9. Update `examples/portal/examples/components/Dialog/DialogExample.js` so the demo also exercises `Modal.alert/confirm/prompt`, demonstrating the move toward Modal aliases. The Dialog calls stay (they still work), but the page should make Modal the visible primary path.

**Docs:**
10. `docs/web-mojo/components/Dialog.md` — note the alert signature is now correctly three-arg (this matches what the doc already claims; no doc change needed if implementation matches docs).
11. `docs/web-mojo/components/Modal.md` — emphasize Modal is the recommended surface; cross-link the typed-alert variants.
12. `CHANGELOG.md` — entry under Bug Fixes (alert signature, WebApp helpers) and under UI/CSS (refreshed dialog chrome, `--mojo-dialog-accent`).

### Constraints

- KISS — no Dialog rewrite, no new dialog class. Fix the arg parsing, route helpers through Modal, add CSS.
- Bootstrap 5.3, Bootstrap Icons. No new dependencies.
- Do not break the deprecated-but-still-used `new Dialog({...})` constructor path.
- Do not introduce a new API surface; only fix and re-style existing ones.
- The accent variable lives in `:root`; consumers can override it without touching `--bs-primary`.

### Related files

- `src/core/views/feedback/Dialog.js` — fix `alert` arg parsing, tag dialog root with `modal-alert-{type}` class
- `src/core/views/feedback/Modal.js` — no code change; benefits transitively
- `src/core/WebApp.js` — re-route `showError/showSuccess/showInfo/showWarning` through `Modal.alert`
- `scripts/css/core.css` (or a new `scripts/css/dialog.css`) — chrome refresh, typed-alert left border, dark-mode block, `--mojo-dialog-accent` variable
- `scripts/css/toast.css` — reference only (color tokens to mirror)
- `examples/portal/examples/components/Dialog/DialogExample.js` — verify all four typed alerts now render distinctly; demonstrate Modal aliases
- `docs/web-mojo/components/Dialog.md` — verify documented signature now matches behavior
- `docs/web-mojo/components/Modal.md` — emphasize Modal as recommended surface
- `CHANGELOG.md` — bug-fix + UI entries

### Endpoints

None. No REST changes.

### Tests required

- Unit test for `Dialog.alert` arg parsing: `(string)`, `({...options})`, `(message, title)`, `(message, title, options)` — verify `type`, `title`, and other options propagate correctly in each form.
- Manual verification on the Dialog example page that all four typed alerts render with distinct icons, title colors, and left borders.
- Manual verification that `app.showError/showSuccess/showInfo/showWarning` each render the correct typed variant.
- Visual smoke test of confirm / prompt / showForm / showDialog / showModelView to confirm the chrome refresh applies but no left border appears (only typed alerts get the border).

### Out of scope

- Dialog deprecation removal — `Dialog` stays as the underlying implementation and remains directly usable.
- Renaming or restructuring the `Modal` API.
- Refactoring callers in `src/extensions/admin/...` that already use `Dialog.confirm` correctly.
- Toast-service changes (already styled correctly).
- Animation/transition tweaks beyond what Bootstrap already provides.
- Theming systems beyond the single `--mojo-dialog-accent` variable.
- Touching `Dialog.showBusy` / `Modal.loading` overlays (separate concern).

## Plan

### Objective

Make `Modal` the canonical JavaScript surface for modals/dialogs. The three canonical helpers (`Modal.alert`, `Modal.confirm`, `Modal.prompt`) own their implementation and the typed-alert behavior; `Dialog.alert/confirm/prompt` are rewritten as thin pass-throughs. Fix the broken three-arg signature for typed alerts at the same time. Re-route `WebApp.show{Error,Success,Info,Warning}` through `Modal.alert(...)` so they actually render typed variants (the user-flagged primary task). Refresh dialog chrome with toast-style colored left borders on typed alerts. New `--mojo-dialog-accent` CSS variable (defaults to `var(--bs-primary)`) drives the header gradient and info-typed accent.

### Steps

1. **`src/core/views/feedback/Modal.js`** — make `Modal` the canonical implementation for `alert/confirm/prompt`.
   - Replace the existing thin `Modal.alert(message, title, options)` alias with a real implementation:
     - Normalize the call signature: support `(string)`, `({...options})`, `(message, title?)`, `(message, title?, options?)`.
     - Pull `type` out of options (`'info' | 'success' | 'warning' | 'danger' | 'error'`, default `'info'`).
     - Compute the typed-alert root class: `const typeKey = type === 'danger' ? 'error' : type; const typeClass = 'modal-alert modal-alert-' + typeKey;`.
     - Build the icon + title HTML the same way `Dialog.alert` currently does (preserve the inline `text-{color}` icon — the new CSS layers on top).
     - Call `Dialog.showDialog({...})` directly (not `Dialog.alert`) with `className: [typeClass, options.className].filter(Boolean).join(' ')`, `body: '<p>' + message + '</p>'`, `size: options.size || 'sm'`, `centered: true`, the OK button, and `...rest`. The Dialog constructor (line 175) already concatenates `options.className` into the modal root, so the typed class lands on `<div class="modal fade modal-alert modal-alert-success">`.
   - Replace the existing `Modal.confirm(message, title, options)` alias with a real implementation that fully owns the call:
     - Normalize the same `(message, title?, options?)` signature.
     - Construct a `Dialog` directly (mirroring the current `Dialog.confirm` body, lines 1564–1603) so Modal owns the canonical confirm behavior.
   - Replace the existing `Modal.prompt(message, title, options)` alias the same way (mirror current `Dialog.prompt` body, lines 1608–1664).
   - Keep all other `Modal.*` static methods (`show`, `showModel`, `showModelById`, `form`, `modelForm`, `data`, `dialog`, `showError`, `loading`, `hideLoading`, `showBusy`, `hideBusy`) unchanged in shape; they already delegate correctly. `Modal.showError` continues to call `Modal.alert(message, 'Error', { type: 'error' })` (update the literal from `'danger'` → `'error'` for consistency, both still resolve to the same `modal-alert-error` class).

2. **`src/core/views/feedback/Dialog.js`** — convert `Dialog.alert/confirm/prompt` to thin pass-throughs.
   - Top of the file: keep the `import View from '@core/View.js'` and `import { File as FileModel }` lines. Add a lazy `import('./Modal.js')` inside each helper to avoid a circular static import at module-load time (Modal already imports Dialog statically; flipping to static import in Dialog would cycle).
   - Rewrite `static async alert(...args)` (~line 1511) as: `const Modal = (await import('./Modal.js')).default; return Modal.alert(...args);`
   - Rewrite `static async confirm(...args)` (~line 1564) as: `const Modal = (await import('./Modal.js')).default; return Modal.confirm(...args);`
   - Rewrite `static async prompt(...args)` (~line 1608) as: `const Modal = (await import('./Modal.js')).default; return Modal.prompt(...args);`
   - Leave `Dialog.showDialog`, `Dialog.showForm`, `Dialog.showModelForm`, `Dialog.showModelView`, `Dialog.showData`, `Dialog.showCode`, `Dialog.showHtmlPreview`, `Dialog.showBusy`, `Dialog.hideBusy`, the `new Dialog({...})` constructor path, and the `Dialog.showConfirm = Dialog.confirm; Dialog.showError = Dialog.alert;` aliases (lines 2103–2104) untouched. The aliases now transparently inherit the Modal-canonical behavior.

3. **`src/core/WebApp.js`** — re-route the four typed helpers (lines 525–592) through `Modal.alert(...)`.
   - In each helper, replace `await import('./views/feedback/Dialog.js')` with `await import('./views/feedback/Modal.js')`.
   - Replace `Dialog.alert(message, '<Title>', { size: 'md', class: 'text-...' })` with `Modal.alert(message, '<Title>', { size: 'md', type: '<type>' })` where `<type>` is `'error' | 'success' | 'info' | 'warning'` for the four helpers respectively.
   - Drop the now-dead `class: 'text-...'` option (the new typed-alert CSS handles the visual cue).
   - Keep the `try/catch` + native `alert()` fallback shape as-is.
   - `WebApp.confirm(...)` already delegates to `Dialog.confirm`, which now passes through to Modal — no change needed at this call site, but for consistency update it to `await Modal.confirm(message, title, options)` so all four helpers route through Modal directly.

4. **`src/core/css/core.css`** — append a new section after the existing modal-context-menu / `modal-xxl` block (~line 1389).
   - Add `:root { --mojo-dialog-accent: var(--bs-primary); }`.
   - Chrome refresh rules targeting all dialogs:
     - `.modal-content { border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.12); border: none; overflow: visible; }`
     - `.modal-header { position: relative; background: linear-gradient(180deg, color-mix(in srgb, var(--mojo-dialog-accent) 6%, transparent), transparent); border-bottom: 1px solid rgba(0,0,0,0.06); border-radius: 14px 14px 0 0; }`
     - `.modal-header .btn-close` repositioned as a small circular badge offset above/right of the corner: `position: absolute; top: -10px; right: -10px; background-color: #fff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 0.5rem; opacity: 1;` plus a `:hover` darkening rule. Keep the Bootstrap `.btn-close` SVG for the X glyph.
   - Typed-alert-only rules (`.modal.modal-alert.modal-alert-{type}`) — 4px solid colored left border on `.modal-content`, mirroring `toast.css` colors:
     - info → `var(--mojo-dialog-accent)` (default `#0d6efd`)
     - success → `#198754`
     - warning → `#ffc107`
     - error → `#dc3545`
   - Icon-circle treatment so the existing `<i class="bi bi-... text-{color}">` icon inside `.modal-title` gets the colored circular background (mirror `.toast-service-icon` from `toast.css`). Selector: `.modal.modal-alert .modal-title i`.
   - `@media (prefers-color-scheme: dark)` block matching the shape of `toast.css`'s dark-mode block — dark `.modal-content` background, lighter title/body text, header gradient adjusted to use a darker tint.
   - Keep `!important` use minimal — only where Bootstrap's specificity would otherwise win (close button positioning).

5. **`examples/portal/examples/components/Dialog/DialogExample.js`** — flip the canonical surface to Modal.
   - Replace the `import { Page, Dialog } from 'web-mojo';` with `import { Page, Modal } from 'web-mojo';` (or `Modal` from its module path if not exported from the package barrel — verify against `src/index.js`; if not exported, add it to the barrel as part of this PR).
   - Rewrite the four typed-alert action handlers and the confirm/prompt/busy/multi-button handlers to call `Modal.alert`, `Modal.confirm`, `Modal.prompt`, `Modal.showBusy/hideBusy`, `Modal.dialog` respectively. Behavior is identical; the call site demonstrates the canonical surface.
   - Update the page title from `'Dialog — canonical helpers'` to `'Modal — canonical helpers'` and the docs-link `data-doc` from `docs/web-mojo/components/Dialog.md` to `docs/web-mojo/components/Modal.md`. Keep the route `components/dialog` to preserve URLs.
   - Add one small "legacy Dialog.* still works" card at the bottom that calls `Dialog.alert(...)` exactly once with a brief note that Dialog is the deprecated alias and Modal is preferred. This makes the migration story visible in the example portal.
   - File path / class name stays `DialogExample.js` for now (renaming would touch the examples registry — out of scope).

6. **Tests** — add `test/unit/Modal.alert.test.js` (CommonJS, follows `test/unit/EventBus.test.js` shape since no `jest.fn()` is needed). Modal is now the canonical implementation, so the regression coverage targets `Modal.alert` directly. Cases:
   - `Modal.alert('hi')` → resolves; `type` defaults to `info`; root has `modal-alert-info` class.
   - `Modal.alert({ message: 'hi', type: 'success' })` → root has `modal-alert-success` class.
   - `Modal.alert('hi', 'Custom title', { type: 'warning' })` → root has `modal-alert-warning`, title text contains `Custom title`. **Regression test for the original Dialog.alert bug.**
   - `Modal.alert('hi', 'Title', { type: 'error' })` and `'danger'` both produce `modal-alert-error`.
   - `Modal.alert('hi', 'Title', { className: 'my-class' })` → root has both `my-class` and `modal-alert-info`.
   - `Dialog.alert('hi', 'Title', { type: 'success' })` → produces the same `modal-alert-success` root class (verifies the pass-through path works end-to-end).
   - Use `loadModule('Modal')` and `loadModule('Dialog')` from `test/utils/simple-module-loader.js` per `.claude/rules/testing.md` (add `Modal` to the loader's known list if missing). Each test must `await dialog.hide()` + `await dialog.destroy()` (or query the rendered element pre-hide).

7. **`docs/web-mojo/components/Modal.md`** — promote Modal to the canonical surface.
   - Restructure the top: "Modal is the canonical JavaScript surface for modals and dialogs in WEB-MOJO. Use `Modal.alert/confirm/prompt/show/showModel/form/modelForm` for all new code."
   - Add a "When to use Modal vs Dialog" subsection explicitly stating Dialog is the deprecated alias kept for backwards compatibility; new code should not import Dialog directly.
   - Document the typed-alert variants (`type: 'info' | 'success' | 'warning' | 'error' | 'danger'`) and the `modal-alert modal-alert-{type}` root class as a styling hook.
   - Cross-link the example at `examples/portal/examples/components/Dialog/DialogExample.js` (route `/components/dialog`) as the canonical Modal demo.

8. **`docs/web-mojo/components/Dialog.md`** — strengthen the deprecation banner already at the top.
   - Update the existing deprecation banner to add: "`Dialog.alert/confirm/prompt` now delegate to `Modal.alert/confirm/prompt` — the implementation lives in Modal. Use Modal directly for new code."
   - Add a one-line note under each of `alert/confirm/prompt` saying "(thin pass-through to Modal — see Modal.md)".
   - Leave the rest of the doc intact (`showDialog`, `showForm`, `showModelForm`, `showCode`, `showHtmlPreview`, `showBusy`, constructor options, context menu, etc.) — these are not deprecated; Dialog is still the underlying View class.

9. **`CHANGELOG.md`** — three entries under the next unreleased version:
   - **Bug fixes:** `Dialog.alert(msg, title, opts)` and `Modal.alert(msg, title, opts)` now honor `title` and `options` (previously the third arg was silently dropped, so `type: 'success' | 'warning' | 'error'` had no effect). `WebApp.show{Error,Success,Info,Warning}` now render their typed variants correctly and route through `Modal.alert`.
   - **API direction:** `Modal` is now the canonical JS surface for modals and dialogs. `Modal.alert/confirm/prompt` own their implementations; `Dialog.alert/confirm/prompt` are thin pass-throughs that delegate to Modal. Existing `Dialog.*` callers continue to work unchanged. `WebApp.confirm` also routes through `Modal.confirm`.
   - **UI / CSS:** Refreshed dialog chrome (rounded corners, gradient header, offset close-ring) and toast-style colored left border for typed alerts. New `--mojo-dialog-accent` CSS variable (defaults to `var(--bs-primary)`) for downstream override.

### Design Decisions

- **Modal owns the implementation; Dialog stays as the deprecated alias.** Resolves the user's "move toward Modal aliases" direction without renaming or breaking anything. One canonical source per helper, lives in `Modal.js`, mirrors the existing toast/web-app pattern of "thin alias → real impl."
- **Lazy `import('./Modal.js')` from inside `Dialog.alert/confirm/prompt`.** Modal already statically imports Dialog (`import Dialog from './Dialog.js'`). Flipping Dialog to static-import Modal would create a circular static import that breaks at module-load time. Lazy import inside the helper bodies sidesteps the cycle and matches the lazy-import pattern WebApp.js already uses.
- **CSS lives in `src/core/css/core.css`, not a new file.** The existing modal-context-menu and `modal-xxl` rules already live in `core.css`. Adding a sibling `dialog.css` would force `<link>` updates in three example HTML files plus `package.json` `build:css`. KISS — keep it in core.css under a new section header.
- **Type class on the modal root, not on the dialog or title.** Putting `modal-alert-{type}` on the root `<div class="modal fade">` lets a single CSS selector reach `.modal-content` (left border), `.modal-title i` (icon circle), and `.modal-header` if needed. Mirrors how `toast-service-{type}` works on the toast root.
- **Reuse of toast color tokens.** Hex values (`#198754`, `#dc3545`, `#ffc107`, `#0d6efd`) match `toast.css` exactly so the system stays coherent. Only the info border uses `var(--mojo-dialog-accent)` because info is the "primary" type and should follow brand color.
- **`color-mix()` for the gradient.** Modern, no JS, no preprocessor, no hardcoded alpha-blended hex values. Browsers without `color-mix` (very old) get a transparent header instead of a tinted one — acceptable. All targeted browsers (Chromium 111+, Safari 16.4+, Firefox 113+) support it.
- **No new public API.** No new options on `Modal`/`Dialog`. The bug fix is internal arg parsing; the CSS class is an internal styling hook documented as a downstream override hook only.
- **Keep the inline `titleClass` markup.** Removing it is a separate cleanup — not necessary for this fix and risks regressing apps that depend on the colored title text.
- **Example page route stays `components/dialog`.** Renaming the route would break bookmarks and require examples-registry edits. Page title and content shift to "Modal" but URL is preserved.

### Edge Cases

- **Circular static import** between Dialog and Modal — handled by lazy `import('./Modal.js')` inside Dialog's helper bodies (see Design Decisions).
- **`type: 'danger'` aliases `type: 'error'`** — both must produce the same `modal-alert-error` root class. Test covers this.
- **Caller passes their own `className`** — must concatenate with the typed class, not overwrite. `[typeClass, options.className].filter(Boolean).join(' ')` handles undefined/empty cases cleanly.
- **Caller passes `class` (legacy / docs)** — the Dialog constructor only reads `className`, so `class` is silently ignored today. Not introduced by this PR; the WebApp.js fix removes the only internal caller that passed `class`. Flag in CHANGELOG that `class` was never wired up; recommend `className`. No code change needed.
- **`Modal` not in the `web-mojo` package barrel** — verify `src/index.js` exports `Modal`. If missing, add it as part of step 5 so `import { Modal } from 'web-mojo'` works in the example.
- **`prefers-color-scheme: dark` on a light-theme Bootstrap app** — toast.css already uses this exact pattern, so visual coherence is preserved. If a downstream app uses `data-bs-theme="dark"` instead, that's a separate theming layer (out of scope); the card stays readable because `--bs-modal-bg` is already theme-aware via Bootstrap.
- **Offset close button + small viewports** — `top: -10px; right: -10px;` can clip on very small screens. Bootstrap modals already get `modal-fullscreen-sm-down` for `lg/xl/xxl`; typed-alert sizes default to `sm`, which still has enough margin on mobile.
- **Auto-sized dialogs** (`autoSize: true` or `size: 'auto'`) — `applyAutoSizing()` clears `maxWidth/maxHeight` then re-applies. Border-radius and box-shadow are unaffected; left border on typed alerts is on `.modal-content` (which auto-size doesn't replace), so no interaction issues.
- **Stacked dialogs** — multiple open Dialogs already get z-index management. The new chrome adds no positioning that interacts with stacking.
- **Modal with custom `header: false`** — `Modal.alert` always renders a header, so the offset close button always has an anchor. For `Modal.show` calls that pass `header: false`, the close button isn't rendered; the offset rule has no effect.
- **`Modal.showError`** currently passes `type: 'danger'` — update to `type: 'error'` for consistency. Both produce the same `modal-alert-error` class, so no visible behavior change.

### Testing

- `npm run test:unit` — primary regression coverage. The new `test/unit/Modal.alert.test.js` proves the three-arg signature works for every variant and that `Dialog.alert` correctly passes through to Modal.
- `npm run lint` — sanity check after Dialog.js, Modal.js, WebApp.js edits.
- Manual UI verification (start dev server, browse `/components/dialog`):
  - All four typed-alert buttons render with distinct icon, title color, AND new colored left border (info=blue, success=green, warning=yellow, error=red).
  - Confirm / Prompt / showDialog (multi-button) get the chrome refresh (rounded corners, gradient header, offset circular close button) but NO left border.
  - Open a `Modal.showModel(...)` from any other example page — chrome refresh applies, no border.
  - Trigger `app.showError('test')` from a console — renders red typed alert (proof of WebApp helper fix and Modal-canonical routing).

### Docs Impact

- `docs/web-mojo/components/Modal.md` — restructured to be the canonical entry point (significant edit).
- `docs/web-mojo/components/Dialog.md` — strengthen deprecation banner; add pass-through notes under `alert/confirm/prompt`.
- `CHANGELOG.md` — bug-fix + API-direction + UI entries (next unreleased version).
- No changes to `docs/web-mojo/services/ToastService.md` or any other doc.
