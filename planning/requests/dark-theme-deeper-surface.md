# Dark theme: deeper, consistent surface across the portal

**Type**: request
**Status**: planned
**Date**: 2026-04-27

## Description

Adopt the Security Dashboard's deep near-black surface as the default
look for the framework's dark theme — globally, not just on one page.
Today every dark-mode page uses Bootstrap's default surfaces
(`#212529` body, `#2b3035` tertiary). The Security Dashboard scope
overrides this to `#0a0d11` page / `#11161d` cards, which reads as
mission-control / NOC tooling. The result is striking on the
dashboard, but inconsistent with the rest of the portal — sidebar,
topbar, table pages, form pages, jobs/push/AWS dashboards all still
show the lighter Bootstrap defaults.

This request promotes the deep palette to a framework-level default
so every dark-mode page in any consuming app inherits the same
mission-control feel.

## Reference (current scoped contract — already in production for one page)

From `src/extensions/charts/css/charts.css`, the
`SecurityDashboardPage`-scoped overrides:

```css
[data-bs-theme="dark"] {
    --mojo-kpi-tile-bg:        #11161d;  /* card / tile surface */
    --mojo-kpi-tile-fg:        #e6ecf3;  /* primary text */
    --mojo-kpi-tile-label-fg:  #8a96a6;  /* muted label text */
    --mojo-kpi-tile-border:    #1f2630;  /* hairline border */
}
[data-bs-theme="dark"] .portal-layout:has(.security-dashboard-page) {
    --mojo-portal-bg: #0a0d11;
    background:       #0a0d11;
}
```

Mockup color contract (`planning/mockups/security_dashboard/mock.css`):

```
--sd-bg        #0a0d11   page
--sd-surface   #11161d   cards/tiles
--sd-border    #1f2630
--sd-text      #e6ecf3
--sd-text-mute #8a96a6
```

## Scope

Promote these surfaces to **the global default** under
`[data-bs-theme="dark"]`:

- `--bs-body-bg`        → `#0a0d11`  (was `#212529`)
- `--bs-tertiary-bg`    → `#11161d`  (was `#2b3035`) — used by cards
- `--bs-secondary-bg`   → `#161b22`  (intermediate surface for chips/inputs)
- `--bs-border-color`              → `#1f2630`
- `--bs-border-color-translucent`  → `rgba(255, 255, 255, 0.04)`
- `--bs-emphasis-color` → `#e6ecf3`
- `--bs-secondary-color`→ `#8a96a6`
- `--mojo-portal-bg`    → `#0a0d11` (already wires through to `.portal-layout`)
- `--mojo-topnav-bg`    → revisit — currently `--bs-primary` (`#121620`),
  may want `#0d1117` or similar so it sits between page and cards

Then **remove** the `SecurityDashboardPage`-scoped overrides since the
defaults now match.

## Surfaces that need a visual pass

Each of these should be auditioned against the new palette and adjusted
where contrast suffers or the existing component uses hardcoded colors:

- **Topbar** (`src/core/views/navigation/TopNav.js` + `portal.css`)
- **Sidebar** dark treatment (`portal.css` — `sidebar-dark` class set)
- **TableView** rows, header, hover, sort indicators
- **FormView** inputs, select, datepicker, multi-select, file upload
- **Modal** body and header
- **Toast** notifications
- **TabView** tab strip
- **Existing dashboards**: `AdminDashboardPage`, `JobDashboardPage`,
  `PushDashboardPage`, `CloudWatchDashboardPage`
- **Pre-built admin pages**: incident table, users, groups, files, etc.
- **Bootstrap-native components** the app uses: `.btn-outline-*`,
  `.dropdown-menu`, `.card`, `.alert`, `.badge`, `.progress`,
  `.list-group`

## Acceptance Criteria

- [ ] `[data-bs-theme="dark"]` at `:root` (or in the framework's
  bootstrapping CSS) defines the new surface variables listed above.
- [ ] Every existing dark-mode page renders against the deeper bg
  without contrast regressions (text legible, dividers visible, hover
  states distinguishable).
- [ ] Existing hardcoded dark colors in `portal.css`, `chat.css`,
  `forms.css`, etc. are audited and either left intact (if they
  intentionally diverge) or migrated to the new variables.
- [ ] The Security Dashboard's own scoped overrides are removed;
  the dashboard inherits the global defaults seamlessly.
- [ ] Light theme is unchanged.
- [ ] CHANGELOG entry noting that downstream apps using the framework's
  dark theme will see a visual shift on upgrade.
- [ ] Screenshots in `planning/mockups/dark-theme-rollout/`
  (or similar) showing 4–6 representative pages before/after for
  reviewer sanity-check.

## Constraints

- **No light-mode changes.** Light-mode users see no difference.
- **No new dependencies.** Pure CSS — adjust variables, audit hardcoded
  colors, no new build step.
- **Backward compatibility for downstream theme overrides.** Apps that
  set their own `--bs-body-bg` etc. should still win — the framework
  defaults must not use `!important`.
- **Don't widen the scope to a redesign of any individual component.**
  This is a palette swap, not a redesign. Component layouts, paddings,
  typography stay as they are unless they break against the new bg.
- **Sidebar `sidebar-light` treatment** stays intact — only the dark
  treatment migrates. Apps that mix `sidebar-light` with the dark page
  bg keep working.
- **Topbar contrast** must remain readable; if `--mojo-topnav-bg`
  needs adjustment, document it explicitly in the resolution.

## Notes

- The Security Dashboard already validates the palette in production
  for one page — the pattern works, it just needs to be promoted from
  scoped to default.
- A few existing dark-theme overrides in `portal.css`, `chat.css`,
  `timeline.css`, etc. were added in the recent dark-theme cleanup
  pass (commit `f518ecd` and friends) — those should be re-evaluated
  against the new defaults rather than blindly carried forward.
- If consumers want to opt OUT of the new look (keep the current
  Bootstrap defaults), they can still override in their app's CSS.
  Worth documenting that escape hatch in the CHANGELOG entry.

---

## Plan

### Objective
Promote the Security Dashboard's deep mission-control palette
(`#0a0d11` page / `#11161d` surfaces / `#1f2630` borders / `#e6ecf3`
text / `#8a96a6` muted) from a **single page-scoped override** to the
**framework-wide default for `[data-bs-theme="dark"]`**. After the
change, every dark-mode page in any consuming app inherits the same
look — without `!important`, so downstream overrides still win — and
the Security Dashboard's scoped block is deleted because the global
defaults now match. Light theme is untouched.

### Steps

1. **`src/core/css/core.css`** — add a single global
   `[data-bs-theme="dark"]` block that re-skins Bootstrap's surface
   tokens. Insert it **immediately after** the existing
   `:root[data-bs-theme="corporate"]` block (around line 174, before
   the second `:root { /* MOJO inherits */ }` block at line 176) so
   it lives next to the other named-theme blocks and runs **before**
   the MOJO `--mojo-*` aliases resolve `var(--bs-*)` values:

   ```css
   :root[data-bs-theme="dark"] {
       --bs-body-bg:                    #0a0d11;
       --bs-tertiary-bg:                #11161d;
       --bs-secondary-bg:               #161b22;
       --bs-border-color:               #1f2630;
       --bs-border-color-translucent:   rgba(255, 255, 255, 0.04);
       --bs-emphasis-color:             #e6ecf3;
       --bs-secondary-color:            #8a96a6;
   }
   ```
   No `!important`. Selector `:root[data-bs-theme="dark"]` (specificity
   0,1,1) matches the existing named-theme blocks and lets a downstream
   `html[data-bs-theme="dark"]` rule loaded after web-mojo's CSS still
   win on source order.

2. **`src/core/css/portal.css`** — tune the topbar/dark-sidebar
   surface so it sits **between** the page (`#0a0d11`) and cards
   (`#11161d`). Add a small block after the existing `:root` portal
   vars (after line 85):

   ```css
   :root[data-bs-theme="dark"] {
       /* Topbar + dark sidebar surface — one notch lighter than the
          page, one notch darker than cards, so portal chrome reads
          as a band. */
       --mojo-sidebar-dark-bg: #0d1117;
   }
   ```
   This affects `nav.topnav-dark` (line 182) and `.sidebar-dark`
   (line 490) which both read `var(--mojo-sidebar-dark-bg, var(--bs-dark))`.
   `--mojo-topnav-bg` keeps its `var(--bs-primary)` default — that's
   the brand-blue topbar, kept as is per the request's "if it needs
   adjustment, document it" caveat.

3. **`src/core/css/portal.css`** — re-tone
   `[data-bs-theme="dark"] .sidebar-light` (lines 504-510). Today it
   hardcodes `#2a2f36` which is 4 steps lighter than the new page bg.
   Swap the literal for `var(--bs-secondary-bg)` so the rail picks up
   the new `#161b22` automatically and stays a single tier above the
   page:

   ```css
   [data-bs-theme="dark"] .sidebar-light {
       --mojo-sidebar-light-dark-bg: var(--bs-secondary-bg);
       --mojo-sidebar-light-dark-color: var(--bs-body-color);
       background-color: var(--mojo-sidebar-light-dark-bg);
       color: var(--mojo-sidebar-light-dark-color);
       border-right-color: var(--bs-border-color-translucent);
   }
   ```
   The hover/active/muted child rules (lines 512-530) already use
   `var(--bs-*)` and need no change.

4. **`src/extensions/charts/css/charts.css`** — delete the now-redundant
   `SecurityDashboardPage`-scoped overrides (lines 2231-2249):
   - Remove the `[data-bs-theme="dark"] .portal-layout:has(.security-dashboard-page)` block.
   - Remove the `[data-bs-theme="dark"] .security-dashboard-page` block.
   - Remove the defensive `[data-bs-theme="dark"] .page-container:has(...), .portal-content:has(...)` block.
   - Keep the `.security-dashboard-page .security-dashboard { max-width: ... }` rule above (layout, not theme).
   - Trim the explanatory comment (lines 2212-2230) to a one-liner
     noting that the dashboard inherits the framework's dark palette.

5. **`src/extensions/charts/css/charts.css`** — collapse the
   now-redundant KPITile dark-theme variable block (lines 2127-2133).
   The `--mojo-kpi-tile-*` values match the new global tokens 1:1
   (`#11161d` ≡ `--bs-tertiary-bg`, `#e6ecf3` ≡ `--bs-emphasis-color`,
   `#8a96a6` ≡ `--bs-secondary-color`, `#1f2630` ≡ `--bs-border-color`).
   Delete the four `--mojo-kpi-tile-*` declarations and let
   `.mojo-kpi-tile`'s existing `var(--mojo-kpi-tile-bg, var(--bs-tertiary-bg, ...))`
   fallback chain resolve them. Keep the sibling
   `[data-bs-theme="dark"] .mojo-kpi-tile:hover` and
   `.mojo-kpi-tile-delta-{good,bad,neutral}` blocks (lines 2134-2148) —
   those tune component-specific shades, not surface tokens.

6. **`src/extensions/charts/css/charts.css`** — re-evaluate
   `[data-bs-theme="dark"] .security-dashboard .btn-outline-secondary`
   (lines 2347-2356). The hardcoded `#2a3441` border / `#1c232c` hover
   bg were tuned against `#0a0d11`, which is now the global bg, so
   they remain correct. **No change**, but verify visually during the
   screenshot pass.

7. **`CHANGELOG.md`** — add an entry under `## Unreleased` documenting
   the palette swap, the opt-out (set your own `--bs-body-bg` etc.
   under `[data-bs-theme="dark"]` — no `!important` in the framework
   block), the SecurityDashboard / KPITile cleanup, the new
   `--mojo-sidebar-dark-bg: #0d1117`, and the `sidebar-light` tweak.

8. **`planning/mockups/dark-theme-rollout/`** — capture before/after
   screenshots for **6 representative pages** in dark theme:
   SecurityDashboardPage (regression check — must look identical),
   AdminDashboardPage, JobDashboardPage, PushDashboardPage, a TablePage
   (e.g. Incidents), and a FormPage with sidebar + topbar visible.
   Filenames `before-<page>.png` / `after-<page>.png`.

9. **Move this file to `planning/done/`** with the `Resolution` block
   filled in (files changed, validation, screenshot list).

### Design Decisions

- **Global `:root[data-bs-theme="dark"]` block in `core.css`** — placed
  alongside the existing `:root[data-bs-theme="ocean|sunrise|forest|midnight|corporate"]`
  blocks rather than the broader `[data-bs-theme="dark"]` rules
  scattered later. This is where the framework defines all named-theme
  palettes, and it ensures the MOJO `--mojo-*` aliases (lines 176-253)
  read the new values.
- **No `!important` anywhere** — explicit acceptance criterion.
  Downstream apps that set `--bs-body-bg` in their own CSS keep winning.
- **`var(--bs-secondary-bg)` for `sidebar-light` dark surface** —
  replaces a hardcoded `#2a2f36` with a token, so future palette tweaks
  propagate automatically. Matches the framework's pattern of
  preferring tokens over literals.
- **`#0d1117` for `--mojo-sidebar-dark-bg`** — sits cleanly between
  page (`#0a0d11`) and cards (`#11161d`), giving the chrome a
  single-step lift. Picked from the request's own suggestion.
- **Don't redesign components** — palette swap only. No padding,
  typography, or layout changes.
- **Keep `--mojo-topnav-bg: var(--bs-primary, #121620)`** — the
  default topnav uses brand primary, not a surface token. Changing it
  would alter every consumer's untouched topbar. Documented in
  CHANGELOG; consumers who want a deep topbar switch to `topnav-dark`
  (which now picks up the new `#0d1117`).
- **KPITile dark-block deletion** — pure cleanup since the fallback
  chain produces identical computed values. Per KISS and the "audit
  hardcoded dark colors and migrate where appropriate" criterion,
  removal is the cleaner choice.

### Edge Cases

- **Modal background** — `.modal-content` (core.css:1642) uses
  `var(--bs-modal-bg, #14181f)` as the gradient endpoint. Bootstrap
  5.3 dark theme defines `--bs-modal-bg` from `--bs-body-bg`, so the
  gradient endpoint becomes the new `#0a0d11`. Verify in the
  screenshot pass — if the modal feels too flush with the page,
  consider tuning the gradient. Expected: minor darkening, no
  functional regression.
- **`topnav-light` against the new deep dark page** — the light
  topbar (`--bs-light` ≈ `#f1f3f4`) on top of `#0a0d11` is jarring.
  This is **the user's choice** when they pick `topnav-light`; not a
  framework regression. Out of scope.
- **`sidebar-clean`** (line 538) reads `var(--bs-body-bg)` — under
  dark mode it'll become `#0a0d11`, same as the page. Pre-existing
  limitation (was `#212529` against a `#212529` page before). Out of
  scope unless the screenshot pass shows a worse regression.
- **`group-dropdown`, `config-menu`** (portal.css 2094+) already use
  `var(--bs-body-bg)` / `var(--bs-secondary-bg)` / `var(--bs-tertiary-bg)`.
  Adapt automatically.
- **Bootstrap-native `.card`, `.alert`, `.dropdown-menu`,
  `.list-group`, `.badge`, `.progress`** — all read Bootstrap surface
  tokens, so adapt automatically. Verified via screenshot pass.
- **Forms (`.form-control`, `.form-select`, `.form-check`, etc.)** —
  Bootstrap's dark theme sources their backgrounds from `--bs-body-bg`
  / `--bs-tertiary-bg`. Forms get darker. Borders use
  `--bs-border-color` which is now `#1f2630` (was `#495057`) — subtler.
  Verify legibility in the screenshot pass.
- **Cascade interaction** — the new `:root[data-bs-theme="dark"]`
  block has selector-specificity 0,1,1. Bootstrap's own
  `[data-bs-theme="dark"]` rules have specificity 0,1,0. The new
  block wins for the listed tokens. Downstream
  `html[data-bs-theme="dark"]` (specificity 0,1,1) ties on
  specificity but wins on source order if loaded after web-mojo's CSS.
- **Hardcoded `#fff` / `#212529` references already audited** in
  commit `e8a23a2` (dark-theme cleanup). Remaining literals are
  intentional component-specific tints. No action.
- **Lite bundle** (`src/core/css/lite/lite.css`) is standalone and
  has no `[data-bs-theme]` rules today. The new block lives in
  `core.css`, so lite users still see Bootstrap's default dark
  palette — consistent with "lite = no opinionated styling". Out of
  scope unless we want lite to track the new palette.

### Testing

- **`npm run lint`** — sanity check (CSS isn't linted but JS imports
  are unchanged).
- **No new unit tests required** — pure CSS variable swap.
- **Manual visual verification** is the load-bearing test. Use
  `npm run dev` and the topbar theme toggle (Light → Dark). Verify:
  1. SecurityDashboardPage looks **identical** to the current
     production version (zero-diff regression).
  2. Other dashboards (Admin, Job, Push, CloudWatch) adopt the deeper
     palette without contrast loss.
  3. TablePage rows, sort indicators, hover states still
     distinguishable.
  4. FormPage inputs, selects, datepickers remain legible.
  5. Modals open with the gradient still reading as a panel above the
     page, not flush.
  6. Sidebar (`sidebar-light` and `sidebar-dark`) reads as a distinct
     band against the page.

### Docs Impact

- **`CHANGELOG.md`** — required (step 7).
- **`docs/web-mojo/`** — no doc updates. The public theme API
  (`app.setTheme()`, `data-bs-theme`) is unchanged. No doc currently
  lists hex values.
- **No new public API** → no `WebApp.md` / `PortalApp.md` edits.

### Out of Scope

- Component **redesigns** — paddings, typography, layouts stay as is.
- Tuning `--mojo-topnav-bg` away from `--bs-primary` — brand decision,
  not a palette swap.
- Auditing the lite bundle for the new palette.
- Adding light-mode equivalents (request: light theme unchanged).
- Migrating remaining hardcoded `#fff` / `#212529` literals scattered
  in component CSS unless they break against the new bg.
- Per-component visual polish beyond verifying contrast doesn't
  regress.

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Resolved — YYYY-MM-DD

**Files changed**:
- `src/...`

**Tests run**:
- `npm run ...`

**Docs updated**:
- `docs/web-mojo/...`
- `CHANGELOG.md`

**Validation**:
[How the final behavior was verified — list the pages screenshotted
before/after to confirm no contrast regressions]
