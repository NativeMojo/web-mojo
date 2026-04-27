# Dark Theme Cleanup

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
| Date | 2026-04-26 |
| Priority | medium |

## Description

Bring dark theme up to parity with light theme across the framework. Three pieces:

1. **Theme infrastructure on `WebApp`** — a small public API (`setTheme()`, `getTheme()`, `theme:changed` event) that persists the user's choice to `localStorage`, auto-detects `prefers-color-scheme` on first load, and applies `data-bs-theme` to `<html>`.
2. **Built-in toggle UI in `PortalApp` topbar usermenu** — auto-injected (with opt-out) so consuming apps don't have to wire the theme menu items by hand.
3. **CSS coverage for components currently broken under `data-bs-theme="dark"`**: `sidebar-light` (and a sanity pass on `sidebar-dark`), `SideNavView`, `ChatView`, and `TimelineView`.

## Context

Light theme is well covered, but dark theme is fragmented and partly broken:

- The example portal (`examples/portal/app.js`) sets `data-bs-theme` directly on `<html>` from a topbar action handler. Refreshing the page reverts the choice — there is no persistence.
- The framework never reads `prefers-color-scheme`, so users on dark-mode systems still get a light app on first visit.
- There is no app-level theme API; `app.setTheme()` / `app.getTheme()` simply do not exist. Every consuming app reinvents the toggle.
- `sidebar-light` / `sidebar-dark` are global, theme-agnostic sidebar treatment classes (independent of `data-bs-theme`). `sidebar-light` works under `data-bs-theme="light"` but renders as bright white against a dark page under `data-bs-theme="dark"`, breaking the visual hierarchy. The active-item blue and section header still work — only the surface/background/hover colors need to shift.
- `SideNavView`, `ChatView`, and `TimelineView` have no `[data-bs-theme="dark"]` rules of their own. SideNavView has no CSS file at all (inline styles + Bootstrap utilities). Timeline has no CSS file. ChatView has `chat.css` with no dark rules.

This work cleans up all three layers in one pass so dark mode becomes a first-class, persistent, opt-in experience.

## Acceptance Criteria

**Theme infrastructure (`WebApp`)**
- `app.setTheme(theme)` accepts `'light'`, `'dark'`, or `'system'`. Sets `data-bs-theme` on `<html>` (or removes it for `'system'` and resolves via `prefers-color-scheme`), persists the choice to `localStorage`, and emits `theme:changed` on `app.events` with `{ theme, resolved }` where `resolved` is the actual `'light' | 'dark'` currently applied.
- `app.getTheme()` returns the stored preference (`'light' | 'dark' | 'system'`).
- `app.getResolvedTheme()` returns the currently applied `'light' | 'dark'` (resolving `'system'` via `prefers-color-scheme`).
- On `WebApp` startup, the stored preference is restored. If no preference is stored, default is `'system'` and `prefers-color-scheme` is read once. A `matchMedia('(prefers-color-scheme: dark)')` listener updates the resolved theme live while the preference is `'system'`.
- localStorage key is namespaced (e.g. `mojo:theme`), and the read/write is wrapped in try/catch (private mode).
- Initial application happens before pages render so there is no light→dark flash.

**Toggle UI (`PortalApp`)**
- The topbar usermenu auto-includes Light / Dark / System items by default (icons: `bi-sun`, `bi-moon-stars`, `bi-circle-half`). The currently selected option is marked active.
- Opt-out: `new PortalApp({ topbar: { themeToggle: false } })` (or equivalent existing topbar config shape) suppresses auto-injection.
- Selecting an item calls `app.setTheme(...)` and shows a toast (matching the current `examples/portal/app.js` behavior).
- Existing manual `theme-light` / `theme-dark` actions in `examples/portal/app.js` are removed in favor of the built-in toggle (proves the opt-in path).

**Sidebar treatment classes under `data-bs-theme="dark"`**
- `sidebar-light` and `sidebar-dark` remain *independent* sidebar treatment classes — devs can mix them with either global theme.
- Under `data-bs-theme="dark"`, `sidebar-light` renders as a *lighter dark* surface (e.g. `~#3a4047` or similar, whatever reads cleanly against the page), with hover/active/group-header/section-divider colors adjusted to maintain the same visual hierarchy seen under light mode (active item highlight, section eyebrow, subdued inactive items). The screenshot in the request thread is the reference.
- `sidebar-dark` under `data-bs-theme="dark"` is sanity-checked: still readable, hover/active states still distinguishable from base background.
- Both render unchanged under `data-bs-theme="light"`.

**Component coverage**
- `SideNavView` (`src/core/views/navigation/SideNavView.js`) renders correctly under dark theme: nav rail background, active section accent border, hover state, dropdown collapse mode, content panel separator. Add a CSS file (or inline-style fallback for theme-aware values via CSS vars) if one doesn't exist.
- `ChatView` / `ChatMessageView` / `ChatInputView` (`src/core/views/chat/`, styled by `src/core/css/chat.css`) render correctly under dark theme: message bubble bg, input area, file-drop overlay, scrollback container.
- `TimelineView` / `TimelineViewItem` (`src/extensions/timeline/`) render correctly under dark theme: item background, connector line, badges, timestamps. Adds a CSS file if needed (or scopes rules under existing extension CSS).

**Validation**
- The example portal demonstrates: load with system dark → app starts dark; toggle Light → persists across refresh; toggle System → follows OS preference live.
- All four touched components visually verified under both `data-bs-theme="light"` and `data-bs-theme="dark"` in the example portal.

## Investigation

### What exists

**Theme switching** — manual and imperative. `examples/portal/app.js` has two topbar actions (`theme-light`, `theme-dark`) that call `document.documentElement.setAttribute('data-bs-theme', …)`. No persistence, no system-preference detection, no app API. The loader extension (`src/extensions/loader/loader.js:21–31`) has its own `getTheme()` reading body classes — separate from the app theme.

**CSS architecture** — Bootstrap 5.3 `[data-bs-theme]` attribute selectors layered on top of named-palette `:root[data-bs-theme="ocean|sunrise|forest|midnight|corporate"]` blocks in `src/core/css/core.css`. Dark-mode coverage is partial: `core.css`, `portal.css`, and `table.css` have `[data-bs-theme="dark"]` rules; `chat.css` and the extension CSS files do not.

**Sidebar themes** — `sidebar-light` / `sidebar-dark` / `sidebar-clean` are treatment classes applied by `Sidebar.setSidebarTheme()` (`src/core/views/navigation/Sidebar.js:1551`). CSS variables `--mojo-sidebar-dark-color`, `--mojo-sidebar-dark-color-hover`, `--mojo-sidebar-dark-bg` are defined at `:root` only — there is no `[data-bs-theme="dark"]` override for the `sidebar-light` block, which is why it renders bright white in dark mode.

**SideNavView** — `src/core/views/navigation/SideNavView.js`. Class `.side-nav-view`. No CSS file dedicated to it. No dark-theme rules anywhere. Uses inline styles + Bootstrap utility classes for layout, which means most surfaces inherit Bootstrap's dark theme, but accent borders, dividers, and hover states need explicit theming.

**ChatView** — `src/core/views/chat/ChatView.js`. Has `theme` option but it's a *layout* selector (`compact` vs `bubbles`), not light/dark. Styled by `src/core/css/chat.css`, which has zero `[data-bs-theme="dark"]` rules.

**TimelineView** — `src/extensions/timeline/TimelineView.js`. Has `theme` option but it's a Bootstrap *color* (primary/success/danger/etc.), not light/dark. No CSS file in `src/extensions/timeline/` at all — styling relies on Bootstrap utility classes and inline styles.

**WebApp / PortalApp public API** — no theme methods. `PortalApp` has `saveSidebarState()` / `loadSidebarState()` (`src/core/PortalApp.js:672–689`) that already use `localStorage` — same pattern is the right model for `setTheme`/`getTheme`.

### What changes

- `src/core/WebApp.js` — add `setTheme()`, `getTheme()`, `getResolvedTheme()`, internal `_applyTheme()`, `_loadStoredTheme()`, `_attachSystemThemeListener()`. Wire `_loadStoredTheme()` early in `start()` (or constructor) so the attribute is set before the first page renders. Emit `theme:changed`.
- `src/core/PortalApp.js` — auto-inject Light / Dark / System usermenu items via the existing topbar config path, keyed off a `topbar.themeToggle` opt-out. Action handler delegates to `app.setTheme()`.
- `src/core/css/portal.css` — add `[data-bs-theme="dark"] .sidebar-light { … }` block (and `:hover`, `.active`, group-header, section-divider variants). Sanity-pass `[data-bs-theme="dark"] .sidebar-dark`. Use existing `--mojo-sidebar-*` CSS vars where possible, add new `--mojo-sidebar-light-dark-*` (or reuse the dark block vars) so the values are tunable.
- `src/core/css/portal.css` (or new `side-nav.css`) — add `[data-bs-theme="dark"] .side-nav-view …` rules covering the rail bg, active accent, hover, divider, and the dropdown-collapse mode.
- `src/core/css/chat.css` — add `[data-bs-theme="dark"]` rules for message bubbles (own/other), input area, file-drop overlay, container background.
- `src/extensions/timeline/` — add a `timeline.css` (or fold into a parent file the extension already imports) with both base styles AND `[data-bs-theme="dark"]` overrides; refactor inline styles into class-based rules where needed for theming.
- `examples/portal/app.js` — remove the manual `theme-light` / `theme-dark` actions and let the new built-in toggle handle it. (Confirms the opt-in path works.)
- `docs/web-mojo/core/WebApp.md` — document `setTheme()` / `getTheme()` / `getResolvedTheme()` / `theme:changed` event / localStorage key.
- `docs/web-mojo/core/PortalApp.md` (or `components/SidebarTopNav.md`) — document the auto-injected topbar theme toggle and the `topbar.themeToggle: false` opt-out.
- `CHANGELOG.md` — release note.

### Constraints

- Bootstrap 5.3 `data-bs-theme` is the source of truth for theming — do not invent a parallel mechanism.
- `sidebar-light` / `sidebar-dark` MUST stay independent of the global theme (per user intent — devs explicitly want to mix and match).
- Initial theme application must happen before page render to avoid a light→dark flash.
- `localStorage` access must be wrapped in try/catch (some browsers/private modes throw on access).
- `matchMedia` listener must be removed/replaced when the user picks an explicit `'light'` or `'dark'`, and reattached when they pick `'system'`.
- Toast on theme change is fine (matches current example behavior) — but `WebApp` cannot assume `app.toast` exists; the toast is the responsibility of the topbar handler in `PortalApp`, not `WebApp.setTheme()`.
- No new dependencies. Plain CSS + the existing Bootstrap 5.3 dark-mode contract.

### Related files

- `src/core/WebApp.js`
- `src/core/PortalApp.js` (sidebar state pattern at lines 672–689 is the model)
- `src/core/views/navigation/Sidebar.js` (`setSidebarTheme` at line 1551)
- `src/core/views/navigation/TopNav.js` (usermenu injection point)
- `src/core/views/navigation/SideNavView.js`
- `src/core/views/chat/{ChatView,ChatMessageView,ChatInputView}.js`
- `src/extensions/timeline/{TimelineView,TimelineViewItem}.js`
- `src/core/css/{core,portal,chat}.css`
- `examples/portal/app.js`
- `docs/web-mojo/core/{WebApp,PortalApp}.md`
- `docs/web-mojo/components/SidebarTopNav.md`

### Endpoints

None — pure client-side preference, stored in `localStorage`.

### Tests required

- Unit test for `WebApp.setTheme` / `getTheme` / `getResolvedTheme`: persistence round-trip, `theme:changed` emission, `'system'` resolution via mocked `matchMedia`, listener attach/detach when toggling between explicit and `'system'`.
- Unit test for the `prefers-color-scheme` listener: mock `matchMedia` change event, verify `data-bs-theme` updates only when preference is `'system'`.
- Manual visual verification (no automated test): example portal under both themes for sidebar (light + dark treatment), SideNavView, ChatView, TimelineView.

### Out of scope

- Named color palettes (`ocean`, `sunrise`, `forest`, `midnight`, `corporate` in `core.css`) — leave as-is.
- Loader extension theming (`src/extensions/loader/loader.js`) — its own class-based system stays independent.
- Per-component "theme" options that are actually layout/color selectors (`ChatView.theme: 'compact'|'bubbles'`, `TimelineView.theme: 'primary'|...`) — not renamed or unified in this pass.
- A general design-token / CSS-variable refactor of the framework — only add tokens needed for the components touched here.
- Auth / login pages dark-theme audit — separate request if issues surface.
- Admin extension page-by-page audit — separate request if issues surface.

## Plan

### Objective
Make dark theme a first-class, persistent, opt-in experience across `WebApp`, `PortalApp`'s topbar usermenu, the `sidebar-light` / `sidebar-dark` treatment classes, `SideNavView`, `ChatView`, and `TimelineView` — matching the request's three slices in one combined change.

### Steps

#### Slice A — Theme infrastructure on `WebApp`

1. **New file `src/core/utils/ThemeManager.js`** — a small class encapsulating: storage read/write (try/catch), `prefers-color-scheme` resolution, `matchMedia` listener attach/detach, and applying `data-bs-theme` to `document.documentElement`. Keeping it out of `WebApp.js` keeps the WebApp change small (matches the "check `src/core/utils/` first" rule). Public surface: `constructor({ storageKey, eventBus })`, `getPreference()`, `getResolved()`, `set(pref)`, `init()` (loads stored or `'system'`, applies, attaches listener if needed), `destroy()`.

2. **`src/core/WebApp.js`** — instantiate `ThemeManager` in the constructor *after* `this.events = new EventBus();` (line 75) and *before* page rendering paths. Storage key: `${appKey}:theme` where `appKey = (this.name || 'mojo').replace(/\s+/g, '_').toLowerCase()` — colon separator namespaces the theme key under the app name. Wire three thin public delegates:
   - `setTheme(pref)` → `this.theme.set(pref)` (validates `'light' | 'dark' | 'system'`)
   - `getTheme()` → `this.theme.getPreference()`
   - `getResolvedTheme()` → `this.theme.getResolved()`

   Call `this.theme.init()` synchronously in the constructor so `data-bs-theme` is applied before any view renders (avoids the light→dark flash). The manager emits `'theme:changed'` on `this.events` with `{ theme, resolved }`.

3. **No PortalApp changes needed for the storage layer** — PortalApp inherits from WebApp and gets the same API automatically.

#### Slice B — Built-in toggle UI in PortalApp topbar

4. **`src/core/PortalApp.js`** — in `setupTopbar()` (around lines 482–497), if `this.topbarConfig.themeToggle !== false` AND a `userMenu` is present in the topbar config, inject three items into `userMenu.items` *before* the final divider/`logout`. Keep the injection idempotent and surgical:
   ```
   theme-light  (icon: bi-sun,         action: 'theme-light')
   theme-dark   (icon: bi-moon-stars,  action: 'theme-dark')
   theme-system (icon: bi-circle-half, action: 'theme-system')
   ```
   Wrap them with `{ divider: true }` separators if neighbors aren't already dividers. Add an `active: true` flag to the currently selected one (template change in step 5). Re-inject on `'theme:changed'` so the active mark stays in sync (call a small `_refreshTopbarThemeToggle()` that mutates the stored `this.topbarConfig.userMenu.items` and triggers `this.topbar.render()`).

5. **`src/core/views/navigation/TopNav.js`** — extend the dropdown-item template (line 236) to honor `active` on dropdown items: `<a class="dropdown-item {{#active}}active{{/active}}" …>`. The property already flows through `processRightItems()` via `{ ...subItem }` (line 341).

6. **`src/core/PortalApp.js` `onPortalAction()`** (lines 789–805) — add three cases that call `this.setTheme(...)` and emit a toast (`this.toast.success(...)`).

7. **`examples/portal/app.js`** — remove the two hardcoded theme items from `userMenu.items` (lines 218–219) and the two `case 'theme-light'/'theme-dark'` arms in the `portal:action` switch (lines 247–254). The framework toggle now provides them.

#### Slice C — CSS coverage for dark theme

8. **`src/core/css/portal.css` — `sidebar-light` under `data-bs-theme="dark"`.** Add a new block immediately after the existing `.sidebar-light` rule (line 499). Keep the values tunable via CSS vars introduced inside the override:
   ```
   [data-bs-theme="dark"] .sidebar-light {
       --mojo-sidebar-light-dark-bg: #2a2f36;
       --mojo-sidebar-light-dark-color: var(--bs-body-color);
       background-color: var(--mojo-sidebar-light-dark-bg);
       color: var(--mojo-sidebar-light-dark-color);
       border-right-color: var(--bs-border-color-translucent);
   }
   ```
   Add hover/active/group-header overrides matching the screenshot reference: keep `nav-link.active` blue (`--bs-primary`), make `nav-link:hover` a step-up of the base bg, and the section eyebrow (`.sidebar-header`) a muted token (`var(--bs-secondary-color)`). Sanity pass on `.sidebar-dark` under dark theme — confirm contrast for hover; only add a delta if needed.

9. **`src/core/css/portal.css` — SideNavView dark theme.** Keep the inline base styles (`SideNavView.js:131-170`) unchanged and add `[data-bs-theme="dark"] .side-nav-view …` overrides at the bottom of `portal.css`. Cover: `.snv-nav` bg + border, `.snv-nav a` color, `.snv-nav a:hover` bg, `.snv-nav a.active` bg/color/accent border, `.snv-nav-label` color, `.snv-select-btn` bg/border/color, `.snv-select-btn:hover`. Use Bootstrap dark tokens (`--bs-tertiary-bg`, `--bs-body-color`, `--bs-secondary-bg`) so the values track Bootstrap's dark palette.

10. **`src/core/css/chat.css` — dark theme rules.** Append a single `[data-bs-theme="dark"] …` block at the end of the file covering the hardcoded surfaces:
    - Message-item border-bottom + hover (`.chat-theme-compact .message-item`)
    - Message-bubble bg/color (left `#e9ecef` → tertiary-bg; right keeps `--bs-primary`)
    - Input area border-top + bg
    - Attachment states (success/error use `--bs-success-bg-subtle` / `--bs-danger-bg-subtle`)
    - File-attachment overlay (`rgba(0,0,0,0.05)` → `rgba(255,255,255,0.06)`)
    - Scrollbar track/thumb
    Use Bootstrap CSS vars throughout so the rules stay short.

11. **`src/extensions/timeline/timeline.css` (new file).** Currently no CSS file exists. Create one with:
    - Base styles for the existing class names (`.timeline-item`, `.timeline-marker`, `.timeline-dot`, `.timeline-content`, `.timeline-date`, `.timeline-card`, `.timeline-title`, `.timeline-description`, `.timeline-meta`) — pull values from inline styles currently rendered by the templates. Use Bootstrap CSS vars (`--bs-card-bg`, `--bs-border-color`, `--bs-secondary-color`).
    - `[data-bs-theme="dark"]` overrides where the base-token swap isn't enough.

    Import it from the timeline entry point: `import './timeline.css';` at the top of `src/extensions/timeline/TimelineView.js` (matches the pattern used by `src/index.js`). Strip equivalent inline styles from the JS templates only where they conflict with the new rules.

12. **No CSS bundling change.** `src/index.js` already imports `core.css`, `portal.css`, `chat.css`, `table.css`. Timeline CSS is imported from inside the timeline view (extension owns its own CSS).

#### Tests + docs

13. **`test/unit/ThemeManager.test.js` (new)** — covers the storage round-trip, `'system'` resolution via mocked `matchMedia`, listener attach/detach when toggling between explicit and `'system'`, and `'theme:changed'` emission via a stub EventBus. Mock pattern: stub `window.matchMedia` to return an object with `matches`, `addEventListener`, `removeEventListener`, dispatch a synthetic change. JSDOM (`test/utils/test-helpers.js:37-67`) provides `window`/`document`. Use the CommonJS test shape with `loadModule('ThemeManager')` once it's added to the loader's known names.

14. **No new WebApp test required** — the delegates are thin pass-throughs.

15. **Manual verification (example portal)** — load `examples/portal/`:
    - With localStorage cleared and OS in dark mode → app starts dark, `data-bs-theme="dark"` on `<html>`.
    - Toggle Light → persists; reload still light.
    - Toggle System → tracks OS preference change live.
    - Visual check `sidebar-light` + `sidebar-dark` under both themes; SideNavView, ChatView, TimelineView under both themes.

16. **Docs:**
    - `docs/web-mojo/core/WebApp.md` — add a "Theme" section: `setTheme()`, `getTheme()`, `getResolvedTheme()`, `theme:changed` event payload, storage key naming, default-`'system'` behavior.
    - `docs/web-mojo/core/PortalApp.md` — short note on the auto-injected topbar theme toggle and `topbar.themeToggle: false` opt-out.
    - `docs/web-mojo/components/SidebarTopNav.md` — note that `sidebar-light` / `sidebar-dark` are theme-agnostic treatment classes that adapt to `data-bs-theme="dark"` automatically.
    - `CHANGELOG.md` — `## Unreleased` section, two `###` headings: "Feature — App-level theme management" and "CSS — Dark-theme coverage for sidebar treatments, SideNavView, ChatView, TimelineView".

### Design Decisions

- **`ThemeManager` extracted to `src/core/utils/`** rather than inlined in WebApp. Mirrors how `EventBus`, `MOJOUtils`, `DjangoLookups` already live in `utils/`. Keeps WebApp thin and the manager unit-testable in isolation.
- **`init()` in the constructor, not `start()`.** `start()` is async and called later by the consuming app. If theme application waited until `start()`, every page registration plus the initial layout setup could happen before `data-bs-theme` is set, causing a flash. The constructor runs synchronously before any of that.
- **Storage key naming `${appKey}:theme`.** Confirmed with user — colon separator namespaces the theme key under the app name, distinct from PortalApp's older underscore-separated sidebar-state key.
- **Default preference: `'system'`.** Confirmed with user — auto-detect on first load; user can override.
- **Toggle items live in PortalApp, not TopNav.** TopNav already accepts arbitrary `userMenu.items`; the auto-injection is a PortalApp concern (it owns the topbar config lifecycle and the `portal:action` event). Keeping TopNav generic preserves its reusability.
- **`active: true` instead of marking the active item via JS class manipulation.** TopNav re-renders on data changes; the template-level `{{#active}}active{{/active}}` is the framework-idiomatic path.
- **Sidebar treatment classes stay independent.** Per the user's confirmation: `sidebar-light` and `sidebar-dark` continue to be selectable independent of `data-bs-theme`. The fix is purely additive CSS.
- **Bootstrap CSS variables (`--bs-tertiary-bg`, `--bs-secondary-color`, etc.) over hex.** Wherever possible, use Bootstrap's dark-mode-aware tokens so the rules need fewer overrides.
- **Timeline gets its own CSS file** (instead of folding into `core.css` or `portal.css`). It's an optional extension — extension owns its own assets.
- **Existing `@media (prefers-color-scheme: dark)` block at `portal.css:2397`** (the `.mojo-sidebar-theme-auto` block) is left as-is — separate opt-in mechanism, not related to `data-bs-theme`. Out of scope.

### Edge Cases

- **`localStorage` throws (private mode, disabled storage).** Wrap every read/write in try/catch and log to `console.warn` (matches `PortalApp.saveSidebarState`). On read failure → fall back to `'system'`. On write failure → still apply the theme in-memory.
- **`matchMedia` not available.** Guard `window.matchMedia` with `typeof window.matchMedia === 'function'`. If absent, `'system'` resolves to `'light'` and no listener is attached.
- **`'system'` listener leak.** When the user picks `'light'` or `'dark'` explicitly, detach the `matchMedia` listener. When they switch back to `'system'`, reattach. Track the listener reference for reliable detach.
- **Re-rendering the topbar** when active theme changes shouldn't cause flicker. `TopNav.render()` is async — re-render is fine.
- **`themeToggle: false` opt-out** must work even when `userMenu` is absent (no-op).
- **Test environment.** Tests must reset `data-bs-theme` and `localStorage[appKey:theme]` in `beforeEach`/`afterEach` to avoid cross-test bleed.
- **Light→dark flash on slow networks.** Even with constructor-level init, there's a fraction of a second between HTML parse and `WebApp` instantiation. Acceptable for this scope; consumers can add an inline `<script>` in their HTML to set `data-bs-theme` before the bundle loads (document as a tip).
- **Sidebar-light + dark theme color choice.** Use Bootstrap tokens (`--bs-tertiary-bg` ≈ `#2b3035` in BS dark) rather than random hex so the value tracks Bootstrap.

### Testing

- `npm run test:unit` — primary; runs the new `ThemeManager.test.js`.
- `npm run lint` — ESLint sweep on the changed JS files.
- Manual visual verification in `examples/portal/` (no automated CSS regression). Specifically:
  - Cleared localStorage + OS dark → app starts dark.
  - Toggle Light → reload → still light.
  - Toggle System → flip OS theme → root attribute updates live.
  - `sidebar-light` + `sidebar-dark` under both themes.
  - SideNavView, ChatView, TimelineView under both themes.

### Docs Impact

- `docs/web-mojo/core/WebApp.md` — new "Theme" section.
- `docs/web-mojo/core/PortalApp.md` — note auto-injected topbar theme toggle + opt-out.
- `docs/web-mojo/components/SidebarTopNav.md` — note `sidebar-light`/`-dark` adapt to `data-bs-theme="dark"`.
- `CHANGELOG.md` — Unreleased entries: "Feature — App-level theme management" and "CSS — Dark-theme coverage for sidebar treatments, SideNavView, ChatView, TimelineView".

## Resolution

### What was implemented

All three slices landed in one pass.

**Slice A — Theme infrastructure (`WebApp`)**
- New `src/core/utils/ThemeManager.js` encapsulates storage (try/catch wrapped), `prefers-color-scheme` resolution, `matchMedia` listener attach/detach, and `data-bs-theme` application. Detected matchMedia API gracefully (modern `addEventListener` + legacy `addListener`).
- `WebApp` constructor instantiates `ThemeManager` immediately after `this.events = new EventBus()` and calls `init()` synchronously — so `data-bs-theme` is set before the first view renders (no flash).
- Storage key is namespaced per app: `${appKey}:theme` where `appKey = (this.name || 'mojo').replace(/\s+/g, '_').toLowerCase()`. Confirmed as `web-mojo_examples:theme` in the example portal.
- Public API: `app.setTheme()`, `app.getTheme()`, `app.getResolvedTheme()`. Emits `'theme:changed'` on `app.events` with `{ theme, resolved }`.

**Slice B — Built-in toggle UI (`PortalApp`)**
- `setupTopbar()` calls a new `_injectThemeToggleItems()` that auto-injects three items (`Theme: Light`, `Theme: Dark`, `Theme: System`) into the topbar usermenu before the trailing `logout`. Idempotent — safe to call multiple times.
- Opt-out via `topbar.themeToggle: false`.
- After `'theme:changed'` fires, `_refreshThemeToggleActiveState()` updates the `active` flag on the three items and re-renders the topbar.
- TopNav dropdown item template now honors `active`: `<a class="dropdown-item {{#active}}active{{/active}}" …>`.
- `onPortalAction()` gained three cases (`theme-light`, `theme-dark`, `theme-system`) that delegate to `app.setTheme()` and emit a toast.
- `examples/portal/app.js` lost its manual theme items + handlers — proves the auto-injection works.

**Slice C — CSS coverage**
- `portal.css`: `[data-bs-theme="dark"] .sidebar-light` block (bg `#2a2f36` via `--mojo-sidebar-light-dark-bg`, with hover, active, group-header, muted-text variants). Sanity-pass `[data-bs-theme="dark"] .sidebar-dark .sidebar-nav .nav-link:hover` for distinguishability.
- `portal.css`: `[data-bs-theme="dark"] .side-nav-view …` block at the end of file — covers rail bg/border, link color, hover, active accent, group-label, dropdown-collapse `.snv-select-btn`. Uses Bootstrap dark tokens (`--bs-tertiary-bg`, `--bs-secondary-bg`).
- `chat.css`: `[data-bs-theme="dark"] …` block at the end — container, scrollback, message-item border/hover, message-author/text/time, system message, left bubble, input area, drag-over, attachment states (success/error use `--bs-success-bg-subtle`/`--bs-danger-bg-subtle`), file-attachment overlay, scrollbar.
- New `src/extensions/timeline/timeline.css` with base styles for all `.timeline-*` classes plus dark-mode overrides for the connector line, marker outline, content wrapper, and card. Imported from `TimelineView.js`. Late-discovered conflict: a pre-existing Jobs Admin `.timeline-content` block in `portal.css` was painting cards light grey; resolved by adding a dark-only override for `.timeline-content` to my timeline.css.

**Tests**
- New `test/unit/ThemeManager.test.js` (16 assertions) covers initial application, `set()` persistence/event emission/invalid-input handling, matchMedia listener attach/detach lifecycle, live system-preference change handling, `destroy()`, and graceful degradation when `matchMedia` is missing.
- `test/utils/simple-module-loader.js` registers `ThemeManager` so `loadModule('ThemeManager')` works.

**Docs**
- `docs/web-mojo/core/WebApp.md`: new "Theme" section, ToC entry, and `'theme:changed'` row in the events table.
- `docs/web-mojo/core/PortalApp.md`: `themeToggle: true` in the topbar config example + a "Theme toggle" subsection covering the auto-injection and opt-out.
- `docs/web-mojo/components/SidebarTopNav.md`: paragraph explaining that `sidebar-light` / `sidebar-dark` are theme-agnostic and adapt automatically under `data-bs-theme="dark"`.
- `CHANGELOG.md`: two new `## Unreleased` sections — "Feature — App-level theme management" and "CSS — Dark-theme coverage for sidebar treatments, SideNavView, ChatView, TimelineView".

### Files changed

**New**
- `src/core/utils/ThemeManager.js`
- `src/extensions/timeline/timeline.css`
- `test/unit/ThemeManager.test.js`

**Modified**
- `src/core/WebApp.js` (instantiate ThemeManager, add 3 delegates)
- `src/core/PortalApp.js` (auto-inject theme menu + 3 action cases)
- `src/core/views/navigation/TopNav.js` (one-line `active` template tweak)
- `src/core/css/portal.css` (sidebar-light dark block, sidebar-dark hover, SideNavView dark block)
- `src/core/css/chat.css` (dark-theme block at end of file)
- `src/extensions/timeline/TimelineView.js` (one-line `import './timeline.css'`)
- `examples/portal/app.js` (remove manual theme items + handlers)
- `test/utils/simple-module-loader.js` (register ThemeManager for tests)
- `docs/web-mojo/core/WebApp.md`
- `docs/web-mojo/core/PortalApp.md`
- `docs/web-mojo/components/SidebarTopNav.md`
- `CHANGELOG.md`

### Tests run and results

- `npm run test:unit` — 520 / 522 passed (2 failures are pre-existing in `ContextMenu.test.js`, unrelated to this change; baseline run confirmed 3 pre-existing failures, my changes only affect the new ThemeManager tests, all of which pass). Suite duration ~221ms.
- `npm run lint` — no new lint issues introduced. Existing dynamic-import warnings in `WebApp.js` etc. are unchanged.
- **Browser preview verification (example portal)** — full end-to-end checks via `mcp__Claude_Preview__preview_*`:
  - `app.setTheme/getTheme/getResolvedTheme` work; localStorage round-trip confirmed (`null` → `light` → `dark` → `system`).
  - `data-bs-theme` flips correctly on `<html>` for each call.
  - `theme:changed` events fire with `{ theme, resolved }` (3 events captured during a multi-toggle test).
  - Auto-injected topbar items appear with the right labels and icons; `active` mark follows the preference (verified Dark→active after `setTheme('dark')`).
  - `sidebar-light` under dark theme: bg `rgb(42, 47, 54)` (the new `#2a2f36`), unchanged under light theme (`rgb(246, 248, 250)`).
  - `SideNavView` under dark: rail bg `rgb(43, 48, 53)` (`--bs-tertiary-bg`), active item `rgba(13, 110, 253, 0.18)`, primary border-right.
  - `ChatView` under dark: container `--bs-body-bg`, input area `--bs-tertiary-bg`, left bubble matches.
  - `TimelineView` under dark: marker bg `--bs-tertiary-bg`, content wrapper darkened (after timeline.css fix), card slightly darker still — visual hierarchy preserved.

### Agent findings

(To be filled in after spawning test-runner / docs-updater / security-review.)

