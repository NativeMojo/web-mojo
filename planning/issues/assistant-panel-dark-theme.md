# Admin AI Assistant panel does not honor dark theme

| Field | Value |
|-------|-------|
| Type | bug |
| Status | planned |
| Date | 2026-04-27 |
| Severity | medium |

## Description

The Admin extension's AI Assistant chat panel (`AssistantPanelView`,
right-sidebar drawer) renders against hardcoded **light** surfaces
under `[data-bs-theme="dark"]`. In a screenshot from the user, the
panel shows:

1. **Header strip** ("New conversation" + hamburger / + / fullscreen
   / external-link / close icons) — light gray (`#f7f7f8`) on the
   otherwise-dark portal.
2. **Empty-state hero panel** ("Hi there / How can I help you today?"
   with the sparkle icon and the "Recent activity summary" /
   "Active user count" suggestion chips) — solid white (`#fff`)
   surface. Text uses `var(--bs-body-color)` which under the new
   framework dark theme resolves to `#e6ecf3` — light gray on white,
   nearly unreadable.
3. **Suggestion chips** themselves — hardcoded white (`#fff`) bg with
   `var(--bs-border-color)` border and `var(--bs-body-color)` text.
   Same legibility problem.
4. **"Disconnected — reconnecting..." banner** above the composer —
   appears cream/yellow instead of the Bootstrap dark-theme amber
   tone. (See "Related but separate" note below — likely a different
   root cause.)
5. **Composer footer** ("Message the assistant…" textbox + send
   button) — looks correct in the screenshot. The textbox bg is
   actually hardcoded `#fff` (`.assistant-input-box`) but it's framed
   inside the white `.assistant-panel-chat` container so the
   miscoloring is masked. Once the chat area itself adopts a dark
   surface the input box will show as a glaring white island unless
   it's also re-toned.

The mid-panel gap between the white hero and the composer is the
only visible patch of the deep `#0a0d11` portal page bg, confirming
the framework theme is wired through but the panel's own CSS
hardcodes light surfaces in many places.

## Context

- **User flow:** Open the Admin extension's AI Assistant side-drawer
  from the topbar (the panel toggled by `app._assistantPanelOpen` /
  the assistant icon — wired via `registerAssistant()` in the
  consuming app). Switch theme to **Dark** via the topbar usermenu.
- **Component(s):**
  - `src/extensions/admin/assistant/AssistantPanelView.js` —
    template at lines 35-108 emits `.assistant-panel-header`,
    `.assistant-panel-chat`, `.assistant-welcome`,
    `.assistant-suggestion`, `.assistant-input-box`, etc.
  - `src/extensions/admin/assistant/AssistantView.js` — the same
    template fragments rebadged for the modal-fullscreen view (uses
    `.assistant-sidebar`, `.assistant-main`).
- **Stylesheet:** `src/extensions/admin/css/admin.css` — every
  hardcoded surface listed below sits in this file with **no
  `[data-bs-theme="dark"]` overrides anywhere in the file**.

## Acceptance Criteria

- The assistant's empty-state hero, header strip, suggestion chips,
  composer input box, conversation history rail, and the
  `assistant-main` modal-fullscreen surface all render against dark
  surfaces under `[data-bs-theme="dark"]`.
- Suggestion chips remain readable (text, border, hover) — apply the
  pattern the SecurityDashboard already uses for
  `[data-bs-theme="dark"] .security-dashboard .btn-outline-secondary`
  in `charts.css:2289-2298` (post-cleanup line numbers may differ —
  see commit `3bbded3`).
- Conversation-item hover/active states (currently
  `rgba(0, 0, 0, 0.06)` / `rgba(0, 0, 0, 0.1)`) need a dark-mode
  counterpart so the row separation remains visible against a dark
  rail.
- Light theme is **unchanged** — current rules stay correct under
  `[data-bs-theme="light"]`.
- No `!important` introduced.

## Investigation

- **Likely root cause:** every assistant-panel surface in
  `src/extensions/admin/css/admin.css` uses literal hex values
  (`#fff`, `#f7f7f8`) or `rgba(0, 0, 0, ...)` shadows/hovers
  *unscoped*, with no `[data-bs-theme="dark"]` overrides. The view
  was written for light mode and the dark-theme cleanup pass
  (commit `e8a23a2`) covered `chat.css`, `portal.css`, `timeline.css`
  but did **not** touch `admin.css`.

- **Confidence:** **high** — confirmed by grep + read of the
  stylesheet. Zero `data-bs-theme` selectors exist in `admin.css`
  (`grep -c data-bs-theme src/extensions/admin/css/admin.css` → 0).

- **Code path / hardcoded surfaces in
  `src/extensions/admin/css/admin.css`:**

  Panel-form (visible in the user's screenshot):
  - `:2088` — `.assistant-panel-header { background: #f7f7f8; }`
    → header strip
  - `:2127` — `.assistant-panel-history { background: #f7f7f8; }`
    → conversation history pane
  - `:2142` — `.assistant-panel-chat { background: #fff; }`
    → main panel surface (the white "hero" the user saw)
  - `:2189` — `.conversation-search-input { background: #fff; }`

  Welcome / suggestion (the "Hi there" hero):
  - `:853` — `.assistant-suggestion { background: #fff; }`
  - `:862` — `.assistant-suggestion:hover { background: #f7f7f8; }`

  Modal-fullscreen variant (same view source, different harness):
  - `:683` — `.assistant-sidebar { background: #f7f7f8; }`
  - `:799` — `.assistant-main { background: #fff; }`

  Composer:
  - `:987` — `.assistant-input-box { background: #fff; }`

  Hover/active rgba blacks (invisible against a dark rail):
  - `:732` — `.conversation-item:hover { background-color: rgba(0, 0, 0, 0.06); }`
  - `:736` — `.conversation-item.active { background-color: rgba(0, 0, 0, 0.1); }`
  - `:2110` — `.assistant-panel-header-btn:hover { background: rgba(0, 0, 0, 0.08); }`

  Note: `.assistant-input-box` (line 988) also adds
  `box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);` — fine on light, near-
  invisible on dark. Worth re-toning too.

- **Regression test:** **not feasible** as a unit test — the bug is
  a CSS-only theming issue, no JS behavior to assert. The right
  validation is the dev-portal screenshot pass: open the assistant
  panel, set `data-bs-theme="dark"` via the topbar usermenu, and
  inspect `.assistant-panel-chat`,
  `.assistant-panel-header`, and `.assistant-suggestion` computed
  `background-color` to confirm they resolve to dark tokens (e.g.
  `var(--bs-tertiary-bg)` → `rgb(17, 22, 29)`).

- **Related files:**
  - `src/extensions/admin/css/admin.css` — all the fixes go here.
  - `src/extensions/admin/assistant/AssistantPanelView.js` (markup
    reference, no JS change expected).
  - `src/extensions/admin/assistant/AssistantView.js` (modal-form
    markup reference).
  - `src/core/css/chat.css` — `[data-bs-theme="dark"]` overrides for
    `.chat-container`, `.chat-input-view`, etc. (lines 389-475) are
    a good *pattern* reference for what the assistant view needs.
  - `src/core/css/core.css:14-50` — the framework's base `:root` block
    sets `--bs-primary` / `--bs-warning-bg-subtle` etc. unscoped (see
    "Related but separate" below).

## Related but separate

The cream/yellow disconnected banner is **not** caused by the
assistant view. The banner uses `.assistant-input-status` (admin.css
lines 1068-1079) which references `var(--bs-warning-bg-subtle)`,
`var(--bs-warning-border-subtle)`, `var(--bs-warning-text-emphasis)`.
Those are *Bootstrap* tokens that should re-skin under dark theme.

However, `src/core/css/core.css:30` defines
`--bs-warning-bg-subtle: #fef7e0;` in the **unscoped** `:root` block
(alongside the other framework brand colors). This unscoped value
overrides Bootstrap's own dark-theme `--bs-warning-bg-subtle`
(`#332701`) at the same selector specificity but later in source
order, so the cream value leaks into dark theme.

This affects every `.alert-warning`, every component using
`var(--bs-warning-bg-subtle)`, and the assistant disconnected
banner. The same pattern applies to
`--bs-{primary,success,info,danger}-bg-subtle`,
`--bs-*-border-subtle`, and `--bs-*-text-emphasis` defined unscoped
in core.css lines 26-47.

**Suggested follow-up:** open a separate bug for "framework `:root`
block leaks light-theme subtle/text tokens into dark theme — should
be scoped to `:root[data-bs-theme="light"]` (or just deleted to let
Bootstrap own them)." Out of scope for this issue, but the
disconnected banner won't read correctly until it's fixed.

---

## Plan

### Objective
Make the Admin extension's AI Assistant panel honor
`[data-bs-theme="dark"]`. After the change, the panel's hero, header
strip, suggestion chips, composer input, conversation history rail,
and the modal-fullscreen variant's `.assistant-sidebar` /
`.assistant-main` surfaces all read as part of the framework's deep
dark portal — same hierarchy as elsewhere (page = `--bs-body-bg`,
lifted surfaces = `--bs-tertiary-bg`, hover = `--bs-secondary-bg`).
Light theme is untouched. No `!important`. Single-file CSS change.

### Steps

1. **`src/extensions/admin/css/admin.css`** — append one new section
   **at the end of the file** (after the existing
   `@media (max-width: 767.98px)` block at line 2206). One section
   header, then a flat list of `[data-bs-theme="dark"]`-scoped rules
   grouped by surface. Pattern mirrors `chat.css:381-475` (the
   dark-theme block at the bottom of that file).

   The new block re-tones every hardcoded surface listed in the bug
   investigation:

   ```css
   /* ============================================================
      Admin assistant — dark theme overrides

      The assistant view's base styles (above) hardcode light hex
      values (#fff, #f7f7f8) and dark-on-light hover tints
      (rgba(0,0,0,...)). When data-bs-theme="dark" is active,
      re-skin the same surfaces using framework tokens so the panel
      matches the rest of the dark portal. Pattern mirrors
      chat.css.
      ============================================================ */

   /* ── Modal-fullscreen variant ──────────────────────────── */
   [data-bs-theme="dark"] .assistant-sidebar { background: var(--bs-tertiary-bg); }
   [data-bs-theme="dark"] .assistant-main    { background: var(--bs-body-bg); }

   /* ── Conversation rail items (used in sidebar + history) ─ */
   [data-bs-theme="dark"] .conversation-item:hover  { background-color: rgba(255, 255, 255, 0.06); }
   [data-bs-theme="dark"] .conversation-item.active { background-color: rgba(255, 255, 255, 0.10); }

   /* ── Welcome / suggestion chips ────────────────────────── */
   [data-bs-theme="dark"] .assistant-suggestion        { background: var(--bs-tertiary-bg); }
   [data-bs-theme="dark"] .assistant-suggestion:hover  { background: var(--bs-secondary-bg); }

   /* ── Composer input box ────────────────────────────────── */
   [data-bs-theme="dark"] .assistant-input-box {
       background: var(--bs-tertiary-bg);
       box-shadow: none;
   }

   /* ── Thinking indicator pill ───────────────────────────── */
   [data-bs-theme="dark"] .chat-thinking-content { background: var(--bs-tertiary-bg); }

   /* ── Right-sidebar panel form ──────────────────────────── */
   [data-bs-theme="dark"] .assistant-panel-header  { background: var(--bs-tertiary-bg); }
   [data-bs-theme="dark"] .assistant-panel-history { background: var(--bs-tertiary-bg); }
   [data-bs-theme="dark"] .assistant-panel-chat    { background: var(--bs-body-bg); }
   [data-bs-theme="dark"] .assistant-panel-header-btn:hover {
       background: rgba(255, 255, 255, 0.08);
   }

   /* ── Conversation search input (history pane) ──────────── */
   [data-bs-theme="dark"] .conversation-search-input { background: var(--bs-body-bg); }
   ```

   No edits above this block — the existing light-mode rules stay
   intact.

2. **`CHANGELOG.md`** — add a one-paragraph entry under
   `## Unreleased` noting the fix:

   ```
   ### CSS — Admin assistant panel: dark theme coverage

   - The Admin extension's AI Assistant panel
     (`AssistantPanelView` + the modal-fullscreen
     `AssistantView`) now honors `[data-bs-theme="dark"]`.
     Previously the panel header, empty-state hero, suggestion
     chips, composer input, history rail, conversation search,
     and thinking indicator all rendered against hardcoded `#fff`
     / `#f7f7f8` surfaces — loud against the framework's dark
     portal page (and especially loud against the new `#0a0d11`
     mission-control palette). Each surface now picks up
     `--bs-body-bg` / `--bs-tertiary-bg` / `--bs-secondary-bg`
     under the dark theme. Light theme is unchanged; no
     `!important`.
   ```

3. **No JS touched.** No template changes. No new selectors
   invented — every selector in the new block already exists earlier
   in `admin.css` and is rendered by `AssistantPanelView.js` /
   `AssistantView.js` today.

### Design Decisions

- **Single trailing block, not inline edits per rule.** Mirrors the
  convention `chat.css` already uses (base hardcoded values at top,
  all `[data-bs-theme="dark"]` overrides clustered at the bottom).
  Easier to audit and easier to delete if light-mode-only ever
  becomes a target.
- **Surface hierarchy:** page (`--bs-body-bg` = `#0a0d11`) → lifted
  surface (`--bs-tertiary-bg` = `#11161d`) → hover
  (`--bs-secondary-bg` = `#161b22`). Same hierarchy as
  SecurityDashboard post-cleanup, and the hierarchy Bootstrap 5.3's
  own `.card`, `.dropdown-menu`, `.list-group` follow under dark
  theme.
- **`.assistant-panel-header` and `.assistant-panel-history` get
  `--bs-tertiary-bg`, not `--bs-body-bg`.** The header reads as a
  band one notch above the chat area (`--bs-body-bg`), matching the
  screenshot's intent of a chrome header above content. The history
  pane is a sibling band when toggled — same tone for visual
  consistency.
- **`.conversation-search-input` gets `--bs-body-bg`, not
  `--bs-tertiary-bg`.** Mirrors Bootstrap's `.form-control` dark
  behavior — input bg recesses below the surrounding panel surface
  (the history pane is `--bs-tertiary-bg`, the input is
  `--bs-body-bg` — visible inset).
- **Drop the composer's `box-shadow` under dark.** The
  `0 1px 6px rgba(0, 0, 0, 0.06)` lift is invisible against
  `#0a0d11`, so it adds nothing; `box-shadow: none` is cleaner than
  tuning a new shadow value the panel doesn't actually need (the
  border + bg-tone shift already separates the input from the
  surrounding chat area).
- **rgba black hovers → rgba white hovers** at the same opacity.
  Matches `portal.css` convention (e.g.
  `.sidebar-light .sidebar-nav .nav-link:hover` under dark uses
  `rgba(255, 255, 255, 0.06)` at line 518).
- **No new variables.** The framework already exposes
  `--bs-tertiary-bg` / `--bs-secondary-bg` / `--bs-body-bg` for
  exactly this purpose. KISS.
- **No `!important`** anywhere.

### Edge Cases

- **`.assistant-input-box :focus-within`** keeps
  `border-color: var(--bs-primary)` and a primary-tinted shadow —
  both work fine on dark since `--bs-primary` is brand blue and the
  rgba shadow is inherently contrasty. No change needed.
- **`.assistant-welcome-title`** uses `var(--bs-body-color)` —
  falls through to Bootstrap's dark default (`#dee2e6`). Readable
  against `#0a0d11`. No change needed.
- **`.assistant-welcome-icon`** uses `var(--bs-primary)` with
  `opacity: 0.8` — brand blue on `#0a0d11` reads cleanly.
- **User-message bubbles** use `var(--bs-primary)` bg with white
  text — already theme-aware.
- **Assistant-message avatars** use `var(--bs-primary) !important`
  — pre-existing `!important`, unrelated to this fix.
- **`.conversation-avatar-initials`** uses `var(--bs-secondary-bg)`
  for bg and `var(--bs-secondary-color)` for text — both adapt
  automatically.
- **`.assistant-input-status` (the disconnected banner)** is
  **explicitly out of scope** — see "Out of scope" below.
- **`.modal-fullscreen:has(.assistant-view) .modal-header`** rules
  are positioning-only (`background: transparent`), so the
  modal-fullscreen variant inherits the new `.assistant-main` dark
  bg seamlessly. No change.
- **`.assistant-panel-resize-handle:hover`** uses
  `rgba(var(--bs-primary-rgb), 0.15)` — primary-tinted,
  theme-aware. No change.
- **Cascade interaction:** the new `[data-bs-theme="dark"]` rules
  sit at the *end* of `admin.css`, so they win on source order over
  the earlier hardcoded values at the same selector specificity.
  Pattern matches the chat.css/portal.css/timeline.css convention.
  Downstream apps that load their own CSS *after* `admin.css` and
  target the same selectors with the same specificity still win — no
  `!important` blocks them.

### Testing

- **`npm run lint`** — sanity check; baseline expected to stay at
  the pre-existing 71 problems.
- **No new unit tests required** — pure CSS theming change.
- **Browser preview verification** is the load-bearing test:
  1. `app.setTheme('dark')` via the topbar usermenu.
  2. Open the assistant panel.
  3. `preview_inspect` each surface and confirm computed
     `background-color`:
     - `.assistant-panel-header` → `rgb(17, 22, 29)`
       (`--bs-tertiary-bg`)
     - `.assistant-panel-chat` → `rgb(10, 13, 17)` (`--bs-body-bg`)
     - `.assistant-suggestion` → `rgb(17, 22, 29)`
     - `.assistant-input-box` → `rgb(17, 22, 29)`
     - `.assistant-main` (modal-fullscreen) → `rgb(10, 13, 17)`
     - `.assistant-sidebar` (modal-fullscreen) → `rgb(17, 22, 29)`
  4. Re-screenshot the panel: hero text light gray on `#0a0d11`,
     suggestion chips one tier above as `#11161d` cards with
     `#1f2630` borders, header reads as a band, composer lifts one
     tier above the chat area.
  5. Switch back to `app.setTheme('light')` and confirm the panel
     renders identically to before.

### Docs Impact

- **`CHANGELOG.md`** — required (step 2).
- **`docs/web-mojo/`** — no doc updates. The Admin extension doc
  doesn't enumerate per-surface theming behavior; the
  AssistantPanel/AssistantView docs (if any) don't list the panel's
  CSS hooks.

### Out of Scope

- **The cream/yellow "Disconnected — reconnecting…" banner** —
  driven by `core.css:30` (`--bs-warning-bg-subtle: #fef7e0`) being
  defined in the framework's unscoped base `:root` block, leaking
  the light-mode token into dark theme. Fix requires touching the
  framework's named-theme palette block in `core.css`. Separate
  issue.
- **Removing the existing hardcoded base values** (e.g. swapping
  `background: #fff` for `background: var(--bs-body-bg)` in the
  base rules and skipping the dark block entirely). Not done
  because (a) the base values are tuned to be slightly off-pure-
  white (`#f7f7f8` for the header band), and `--bs-tertiary-bg`
  in light mode is `#f8f9fa` — close but not identical. Preserving
  the literals is a zero-risk light-mode preservation. (b) The
  chat.css convention is base-light + dark-overrides.
- **Per-component contrast tuning** inside assistant message
  content (`.assistant-stat-card`, `.assistant-block`,
  `.assistant-collapsible-block`) — these render inside
  `.message-text` which the chat.css dark overrides already cover.
  Only re-tone if the screenshot pass shows a regression.
- **Light theme polish.** Strictly no light-mode changes.
