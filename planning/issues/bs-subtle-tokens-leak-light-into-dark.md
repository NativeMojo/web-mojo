# Bootstrap subtle / border-subtle / text-emphasis tokens leak light values into dark theme

| Field | Value |
|-------|-------|
| Type | bug |
| Status | open |
| Date | 2026-04-27 |
| Severity | medium |

## Description

`src/core/css/core.css` defines 18 Bootstrap "subtle" / "border-subtle"
/ "text-emphasis" CSS custom properties at the **unscoped** base
`:root { ... }` block (lines ~14-50). Those values are tuned for
**light mode**, but because the block is unscoped (not under
`:root[data-bs-theme="light"]`), the light values cascade into dark
theme too — overriding Bootstrap's own dark-theme defaults for the
same tokens.

**Empirical confirmation** (run on the example portal at the time of
filing — `app.setTheme()` swap + `getComputedStyle` read on
`<html>`):

| Token | Under light theme | Under dark theme |
|---|---|---|
| `--bs-warning-bg-subtle` | `#fef7e0` | `#fef7e0` *(should be ~`#332701`)* |
| `--bs-warning-text-emphasis` | `#b06000` | `#b06000` *(should be ~`#ffda6a`)* |
| `--bs-success-bg-subtle` | `#e6f4ea` | `#e6f4ea` *(should be ~`#051b11`)* |
| `--bs-danger-bg-subtle` | `#fce8e6` | `#fce8e6` *(should be ~`#2c0b0e`)* |

All 18 tokens (6 `*-bg-subtle` + 6 `*-border-subtle` + 6
`*-text-emphasis`) return **identical** values under both themes.
Bootstrap's own dark-theme palette never gets a chance to apply.

## Concrete impact (already observed in production)

1. **Cream/yellow disconnected banner in the Admin AI Assistant
   panel** under `[data-bs-theme="dark"]`. The banner
   (`.assistant-input-status` in `src/extensions/admin/css/admin.css`)
   uses `var(--bs-warning-bg-subtle)` /
   `var(--bs-warning-border-subtle)` /
   `var(--bs-warning-text-emphasis)` — which all leak the light
   cream/amber values into dark. Banner reads as a light alert
   floating against the deep `#0a0d11` page bg.

2. **Status pills in the user-profile extension**
   (`UserProfileView` + section views) had to use hand-tuned
   `rgba()` literals as a workaround in commit `9c93f90`. The
   "Unverified" / "Active" / "Inactive" / "Verified" / "Not
   required" pills would all have rendered the same warm cream
   if they'd reached for `var(--bs-warning-bg-subtle)` etc.

3. **Any consumer-app `.alert-warning` / `.alert-success` /
   `.alert-info` / `.alert-danger` / `.alert-primary`** block under
   dark mode. Bootstrap re-skins these via the subtle/border/text
   tokens at `[data-bs-theme="dark"]` scope, but the framework's
   unscoped overrides clobber that. Every Bootstrap-native subtle-
   tinted component reads as light-tinted in dark mode — a
   long-standing visual regression no one's tracked down.

## Affected tokens

Full list from `core.css:14-50`:

```css
:root {
    /* === Subtle Backgrounds === */
    --bs-primary-bg-subtle: #e8f0fe;
    --bs-secondary-bg-subtle: #f1f3f4;
    --bs-success-bg-subtle: #e6f4ea;
    --bs-info-bg-subtle: #e8f0fe;
    --bs-warning-bg-subtle: #fef7e0;
    --bs-danger-bg-subtle: #fce8e6;

    /* === Subtle Borders === */
    --bs-primary-border-subtle: #aecbfa;
    --bs-secondary-border-subtle: #dadce0;
    --bs-success-border-subtle: #81c995;
    --bs-info-border-subtle: #aecbfa;
    --bs-warning-border-subtle: #fad2cf;
    --bs-danger-border-subtle: #f28b82;

    /* === Text Emphasis === */
    --bs-primary-text-emphasis: #174ea6;
    --bs-secondary-text-emphasis: #3c4043;
    --bs-success-text-emphasis: #0d652d;
    --bs-info-text-emphasis: #174ea6;
    --bs-warning-text-emphasis: #b06000;
    --bs-danger-text-emphasis: #a50e0e;

    --bs-btn-hover-bg: #e8f0fe;
}
```

**Not affected** (already correctly scoped):
- The brand-color block (`--bs-primary`, `--bs-secondary`,
  `--bs-success`, `--bs-info`, `--bs-warning`, `--bs-danger`,
  `--bs-light`, `--bs-dark` at lines 14-23) — these are intentional
  brand customizations that should resolve identically under both
  themes.
- Named-theme palette blocks at lines 52-174
  (`:root[data-bs-theme="ocean|sunrise|forest|midnight|corporate"]`)
  — already attribute-scoped correctly.
- The new `:root[data-bs-theme="dark"]` block at line ~175 (added
  in commit `3bbded3`) — correctly scoped.

## Context

- **User flow:** any view that uses Bootstrap subtle-tinted
  components (alerts, badges, callouts) under
  `[data-bs-theme="dark"]`. Most loudly: the Admin assistant's
  disconnected banner.
- **Component(s) directly affected** (consume the leaked tokens):
  - `src/core/css/portal.css` — 12 sites
  - `src/extensions/admin/css/admin.css` — 9 sites
  - `src/core/css/core.css` — 6 sites (mostly self-references in
    button/alert helper rules)
  - `src/extensions/charts/css/charts.css` — 4 sites
  - `src/core/css/table.css` — 3 sites
  - `src/core/css/chat.css` — 2 sites
  - **Total: 36 consumer sites in framework CSS.**
  - Bootstrap's own `.alert-*` / `.badge` / `.list-group-item-*`
    classes also consume them downstream.
- **Stylesheet:** root cause is `src/core/css/core.css` lines 14-50.

## Acceptance Criteria

- Bootstrap's dark-theme `--bs-{primary,secondary,success,info,warning,danger}-bg-subtle`
  (and matching `*-border-subtle` / `*-text-emphasis`) resolve to
  their dark-theme values under `[data-bs-theme="dark"]`. Verifiable
  via `getComputedStyle(document.documentElement).getPropertyValue('--bs-warning-bg-subtle')`
  returning a dark amber (`#332701` or similar) instead of `#fef7e0`.
- The Admin assistant disconnected banner (`.assistant-input-status`)
  reads as a dark-amber alert in dark mode, not cream/yellow.
- Light theme is **byte-identical** to today — every consumer of
  these tokens under `data-bs-theme="light"` sees the same hex value
  it sees today.
- The 36 framework consumer sites continue to work without edits.
- The `user-profile` extension's hand-tuned `rgba()` status pills
  optionally migrate back to the Bootstrap subtle tokens in a
  separate follow-up commit (out of scope for this fix; the literals
  continue to work either way).
- No `!important` introduced.

## Investigation

- **Likely root cause:** the unscoped `:root { ... }` block in
  `core.css` lines 14-50 mixes (a) framework brand defaults
  (`--bs-primary` etc., which intentionally apply under both
  themes) with (b) light-tuned subtle/border-subtle/text-emphasis
  tokens (which should *only* apply under light theme). Because the
  whole block is unscoped, group (b) leaks into dark mode and
  Bootstrap's own dark-theme tokens never win on specificity ordering.
- **Confidence:** **high** — confirmed via empirical measurement.
  All 18 tokens return identical computed values under both themes
  in the live preview. The fix is purely cosmetic CSS structure.
- **Code path:**
  - `src/core/css/core.css:14-50` — root cause.
  - `src/core/css/core.css:52-174` — named-theme palette blocks
    (correctly scoped — reference pattern).
  - `src/core/css/core.css:~175` — `:root[data-bs-theme="dark"]`
    framework palette block from commit `3bbded3` (correctly
    scoped — reference pattern).
- **Regression test:** **not feasible** as a unit test (CSS
  cascade behavior). Validation is the empirical computed-style
  check — same probe used to confirm the bug:
  ```js
  app.setTheme('dark');
  getComputedStyle(document.documentElement).getPropertyValue('--bs-warning-bg-subtle')
  // Should return Bootstrap's dark value, not '#fef7e0'.
  ```
- **Related files:**
  - `.claude/rules/theming.md` — the new project-level convention
    new code follows.
  - `src/core/css/core.css` — only file that needs editing for the
    fix.
  - `src/extensions/admin/css/admin.css:1068-1079` — the
    `.assistant-input-status` rule, primary visual symptom.
  - `src/extensions/user-profile/css/user-profile.css` —
    documents the workaround status pills used (hand-tuned
    `rgba()` literals); good migration target after the fix.
  - `planning/done/user-profile-dark-theme.md` — the resolution
    that flagged this leak.

## Suggested fix direction (for the design pass to confirm)

Three options the design pass should weigh against the 36
consumer sites:

- **Option A — scope the existing block** to
  `:root[data-bs-theme="light"]`. Smallest change. The block
  already defines the framework's *light* palette (it sets
  `--bs-primary: #1a73e8` etc., which are the framework's light
  brand defaults). Re-scoping makes intent explicit. Bootstrap's
  own `[data-bs-theme="dark"]` defaults then win under dark mode.
  **Caveat:** would also re-scope the `--bs-primary` brand colors,
  which currently apply under both themes. Either split the block
  in two (brand defaults stay unscoped, subtle tokens move to a
  light-scoped block) or accept that brand colors get a
  dark-scoped companion.

- **Option B — delete the framework subtle/border-subtle/text-emphasis
  declarations** and let Bootstrap own them. Cleaner because
  Bootstrap's own values are already brand-tuned. **Breaking
  change** — would alter the light-mode appearance of any consumer
  who relied on the framework's specific hex values (e.g.
  `--bs-warning-bg-subtle: #fef7e0` vs Bootstrap's default
  `#fff3cd`). 36 framework sites would shift slightly.

- **Option C — add a `:root[data-bs-theme="dark"]` companion block**
  that explicitly redefines all 18 tokens with dark-tuned values.
  Most verbose but doesn't change light-mode behavior at all. Adds
  the framework's own dark subtle palette rather than deferring to
  Bootstrap. Open question: do we want a dark palette tuned to the
  new mission-control surface (`#0a0d11` page bg / `#11161d`
  cards), or just match Bootstrap's defaults?

The design pass should pick A vs B vs C based on:
- Whether anyone actually relies on the framework's specific
  light hex values (the 36-site grep above confirms internal
  consumers; downstream apps unknown).
- Whether Bootstrap's dark-theme subtle defaults read well on
  the new mission-control palette.
- Maintenance cost of carrying a hand-tuned dark subtle palette
  vs deferring to Bootstrap's.

## Out of scope

- **Migrating the user-profile status pills back to
  `var(--bs-*-bg-subtle)`** — the hand-tuned `rgba()` literals
  added in commit `9c93f90` continue to work after the fix.
  Separate cleanup commit if desired.
- **Touching named-theme palette blocks** (`ocean`, `sunrise`,
  `forest`, `midnight`, `corporate`) — already correctly scoped.
- **Re-tuning Bootstrap's own dark-mode subtle values** — the
  framework should defer to Bootstrap's defaults rather than
  re-tuning them, unless option C is chosen.
- **Changing the framework brand colors** (`--bs-primary` etc.)
  — out of scope; the leak is specifically about
  subtle/border-subtle/text-emphasis tokens.
