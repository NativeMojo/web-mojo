# UserProfileView and all sub-section views render light-only

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-04-27 |
| Severity | medium |

## Description

The `UserProfileView` modal (the dialog opened by `app.showProfile()`,
also used as a copy-paste reference in the example portal) renders
against hardcoded light surfaces under `[data-bs-theme="dark"]`. The
issue is **not** scoped to the `SideNavView` rail on the left — the
entire `user-profile` extension was authored before the framework had
a real dark palette, and every section view inside it has its own
inline-`<style>` block of light-only color literals.

Symptoms (visible in the dark-mode profile dialog):

1. **SideNavView rail** (Profile / Personal / Security / Connected /
   Sessions / Devices / Security Events / Notifications / API Keys /
   Groups / Permissions, plus the `ACTIVITY` / `SETTINGS` group
   labels) renders as a white panel with muted-gray text — barely
   readable. The framework's existing `[data-bs-theme="dark"] .side-nav-view .snv-nav`
   block in `portal.css:3247` is correct in isolation; the rail
   inside the profile modal still appears light because of a higher-
   specificity inline `<style>` block (or a sibling override
   somewhere) that needs to be tracked down separately. **TODO:
   confirm root cause during the design pass.**

2. **Section content views** all use hardcoded light colors:
   - `ProfileOverviewSection` — section headings, form labels,
     dividers, "CONTACT" / "ACCOUNT" eyebrows.
   - `ProfilePersonalSection`, `ProfileSecuritySection`,
     `ProfileConnectedSection`, `ProfileSessionsSection`,
     `ProfileDevicesSection`, `ProfileSecurityEventsSection`,
     `ProfileNotificationsSection`, `ProfileApiKeysSection`,
     `ProfileGroupsSection`, `ProfilePermissionsSection`,
     `ProfileActivitySection` — same pattern.
   - `PasskeySetupView` — separate post-login dialog, same issue.

3. **Status pills** ("Unverified", "Inactive", "Not required",
   "User") are tinted for light mode and don't have dark-mode
   subtle/text-emphasis pairs.

4. **"Deactivate Account"** danger link reads correctly only because
   it uses `--bs-danger` directly.

## Context

- **Component(s):** `src/extensions/user-profile/views/*.js` — 14
  view files, 12 of which emit inline `<style>` blocks. Zero files
  in the extension contain any `[data-bs-theme]` selectors.
- **Surveyed scope (initial pass):**
  - `grep -rln "data-bs-theme" src/extensions/user-profile/` → 0
    files.
  - `grep -rn "background:\s*#\|color:\s*#\|background-color:\s*#"
    src/extensions/user-profile/views/*.js | wc -l` → ~99 hardcoded
    hex declarations across the 14 files.
- **Reproduction:** open the example portal at
  `http://localhost:3000/examples/portal/`, switch theme to Dark via
  the topbar usermenu's **Theme settings** entry, then call
  `app.showProfile()` from a session with an `activeUser` set. The
  dialog opens; its left rail is white, its body content is mostly
  white-on-dark or light-gray-on-light.
- **Reference frame:** matching the `chat.css` /
  `admin.css` (assistant panel) pattern — base light values stay,
  and an `[data-bs-theme="dark"]` override block is added at the
  bottom of each component's CSS. See `.claude/rules/theming.md` for
  the convention.

## Acceptance Criteria

- Every `user-profile` view (the 14 files in
  `src/extensions/user-profile/views/`) renders against dark
  surfaces under `[data-bs-theme="dark"]`. Specifically:
  - Section headings (`CONTACT`, `ACCOUNT`, `ACTIVITY`,
    `SETTINGS` etc.) — readable muted text.
  - Form labels, dividers, hairlines — visible against the panel.
  - Status pills (`Unverified`, `Inactive`, `Not required`,
    `User`, role/MFA badges) — pick up Bootstrap dark subtle/text
    pairs or get explicit dark-mode tints that read.
  - Phone "+", email pencil, "Deactivate Account" icon — visible.
  - The SideNavView rail picks up the framework's existing dark
    treatment (will likely Just Work once the per-section views
    stop forcing a light surface around it).
- Light theme is **byte-identical** to the current behavior — same
  hex values resolve under `data-bs-theme="light"`.
- No `!important`.
- The `PasskeySetupView` (post-login dialog) gets the same
  treatment — it shares the user-profile aesthetic.
- A short pass confirming the dialog still looks correct in modal
  contexts (the modal cascade is already verified to work — see
  `.claude/rules/theming.md`).

## Investigation

- **Likely root cause:** the user-profile extension predates the
  framework's dark-theme cleanup pass (commits `e8a23a2`,
  `3bbded3`). It was never audited against the new tokens. Each
  section view emits its own inline `<style>` block via
  `getTemplate()` with light hex literals.
- **Confidence:** **high** for the root cause; **medium** for the
  exact remediation (the inline-`<style>` pattern means the fix
  spans 12 files, not 1; a build-time decision is whether to keep
  the per-file inline blocks or extract to a single
  `extensions/user-profile/css/user-profile.css` while we're in
  there). The `/design` pass should pick that path.
- **Code path:**
  - `src/extensions/user-profile/views/UserProfileView.js` —
    embeds a `SideNavView` whose `sections` are the per-section
    views.
  - `src/extensions/user-profile/views/Profile{Overview,Personal,Security,Connected,Sessions,Devices,SecurityEvents,Notifications,ApiKeys,Groups,Permissions,Activity}Section.js`
    — 12 sections, each with its own inline `<style>` block.
  - `src/extensions/user-profile/views/PasskeySetupView.js` — same
    pattern.
- **Regression test:** **not feasible** as a unit test (CSS-only
  theming). Validation is the screenshot pass — capture the dialog
  in both themes before/after.
- **Related files:**
  - `.claude/rules/theming.md` — the new project-level convention
    new code should follow.
  - `src/core/css/core.css:175` — the
    `:root[data-bs-theme="dark"]` framework palette block. Tokens
    listed there are the right vocabulary for the fix.
  - `src/core/css/chat.css:381+`, `src/core/css/portal.css:3247+`,
    `src/extensions/admin/css/admin.css:2228+` — three reference
    audits to mirror.
  - `src/core/views/navigation/SideNavView.js:125+` — the inline
    `<style>` pattern to follow when adding the dark override
    block.

## Out of scope (follow-up issues, not this fix)

- The cream/yellow "subtle" leak from `core.css:30` (unscoped
  `--bs-warning-bg-subtle: #fef7e0` and the other
  `--bs-*-bg-subtle` / `--bs-*-border-subtle` /
  `--bs-*-text-emphasis` declarations in the framework's base
  `:root`). Worth its own issue.
- Refactoring per-section inline `<style>` blocks into a
  consolidated `extensions/user-profile/css/user-profile.css` file.
  The `/design` pass for THIS bug can call it in or out — but if
  it's in, it should be the same commit as the dark-theme fix to
  avoid two churn passes through the same files.

---

## Plan

### Objective
Make every view in the `user-profile` extension (`UserProfileView`,
12 `Profile*Section` views, `PasskeySetupView`) render correctly
under both `[data-bs-theme="light"]` and `[data-bs-theme="dark"]`.
Light theme stays byte-identical. No `!important`. Conform to the
new `.claude/rules/theming.md` convention. Side benefit: consolidate
the 12 inline `<style>` blocks (~99 hex declarations + ~21 inline
`style="…"` attributes) into one extension stylesheet that mirrors
the chat / portal / admin / timeline pattern.

### Steps

1. **`src/extensions/user-profile/css/user-profile.css` (NEW)** —
   single new stylesheet that owns all surface colors for the
   extension. Two-section structure mirrors `chat.css`:
   - **Section A — base (light) rules.** Lifts every inline
     `<style>` block currently in `views/*.js` into a single source
     of truth. Selector names stay verbatim (`up-*`, `po-*`, `pp-*`,
     `ps-*`, `pc-*`, `pse-*`, `pa-*`, `pn-*`, `pak-*`, `pg-*`,
     `ppm-*`, `pks-*`, `pss-*`, `pkc-*`, `rc-*`, `pk-*`). **Hex
     values preserved verbatim** — light mode is byte-identical.
   - **Section B — `[data-bs-theme="dark"]` overrides.** One
     trailing block, organized by view family:
     - **Chrome (`.up-*`):** `.up-nav` →
       `var(--bs-tertiary-bg)` + `--bs-border-color-translucent`
       border. `.up-nav a` → `var(--bs-body-color)`. `.up-nav
       a:hover` → `var(--bs-secondary-bg)`. `.up-nav a.active` →
       `rgba(13, 110, 253, 0.18)` bg + `var(--bs-primary)` text +
       primary right-border. `.up-nav-label`, `.up-header-sub`,
       `.up-dot`, `.up-close` → `var(--bs-secondary-color)`.
       `.up-header` border-bottom →
       `--bs-border-color-translucent`. `.up-avatar-initials` and
       `.up-header-badge-staff` → primary-tinted rgba pair.
       `.up-header-badge-su` → warning-tinted rgba pair (see Edge
       Cases). `.up-close:hover` → `var(--bs-tertiary-bg)` bg +
       `var(--bs-emphasis-color)` text.
     - **Section labels** (12 selector variants):
       `[data-bs-theme="dark"] .up-content :is(.po-section-label,
       .pp-section-label, .ps-section-label, …) { color:
       var(--bs-secondary-color); }` — single rule via `:is()`.
     - **Field rows / labels / values / actions / dividers /
       not-set / chevrons / muted descriptors** — same `:is()`
       aggregation. Each surface family gets one rule listing all
       variants.
     - **Status pills** (`*-badge-warn`, `*-badge-ok`,
       `*-badge-muted`). Hand-tuned `rgba()` literals (see Edge
       Cases for why we don't use `var(--bs-*-bg-subtle)`).
     - **Sub-component cards** (`.ps-item`, `.pk-row`, `.rc-code`,
       etc.). Border → `--bs-border-color-translucent`, hover bg →
       `--bs-secondary-bg`, code-block bg → `--bs-tertiary-bg`.
     - **Per-section icon tints** (formerly inline `style=""` —
       see step 4).
     - **Hero gradient circles** (PasskeySetupView, security
       passkey enrollment): light gradient kept; dark uses
       primary-tinted / success-tinted rgba gradients.

2. **`src/extensions/user-profile/index.js`** — add
   `import './css/user-profile.css';` at the top. Mirrors
   `src/extensions/auth/index.js:10` and
   `src/extensions/timeline/TimelineView.js:39`. Vite handles
   bundling; no build-config change.

3. **`src/extensions/user-profile/views/*.js` × 14 files** — for
   each file:
   - Remove the inline `<style>` block from inside `getTemplate()`
     (the CSS-as-a-string at the top of each template). That CSS
     now lives in `user-profile.css`.
   - Keep the rest of the template verbatim. All class names
     referenced in markup stay the same.
   - `ProfileSecuritySection.js` has 4 `<style>` blocks (top-level
     + 3 sub-views: passkey naming, TOTP setup, recovery codes);
     strip all four.
   - `ProfileSecurityEventsSection.js` and `ProfileActivitySection.js`
     have no inline `<style>` block — quick verify during build.

4. **Inline `style="…"` attribute refactor (~21 sites across 6
   files).** Element-level inline styles aren't overridable from
   external CSS without `!important`. Each colour/bg/border inline
   style becomes a class:
   - `ProfileSecuritySection.js:52,67` — purple icon backgrounds →
     `.ps-icon-purple` (light + dark variants in the new CSS).
   - `ProfileSecuritySection.js:79` — danger icon → `.ps-icon-danger`
     using `var(--bs-danger)` + `rgba(var(--bs-danger-rgb), 0.18)`
     bg (auto-tracks theme).
   - `ProfileSecuritySection.js:197`, `PasskeySetupView.js:54` —
     primary-tinted gradient hero circle → shared
     `.up-hero-circle-primary`.
   - `PasskeySetupView.js:88` — success gradient hero →
     `.up-hero-circle-success`.
   - `ProfileSecuritySection.js:200, 278, 283, 284`,
     `PasskeySetupView.js:57, 92` — paragraph helper text, code
     block bg, "or enter manually" muted text → small named
     classes (`.up-help-text`, `.up-secret-code`, etc.).
   - `ProfileSecuritySection.js:281` — QR `<img>` border →
     `.pss-qr-image`.
   - Border-radius / width / height / font-size / padding-only
     inline styles — left in place (no theming concern).
   - Spot-check `ProfileOverviewSection`, `ProfileGroupsSection`,
     `ProfileDevicesSection`, `ProfileSessionsSection` for any
     remaining colour/bg/border inline styles; same treatment.

5. **`CHANGELOG.md`** — entry under `## Unreleased` documenting:
   - The dark-mode coverage for `UserProfileView` + 12 sections +
     `PasskeySetupView`.
   - The new `src/extensions/user-profile/css/user-profile.css`
     and the auto-import from `index.js`.
   - The inline `style="…"` refactor to classes.
   - Light theme byte-identical.
   - The known-deferred `--bs-*-bg-subtle` leak (separate issue)
     and the workaround (hand-tuned `rgba()` for status pills).

6. **No JS behavior changes.** No `data-action` handlers touched.
   No `onInit()` / `onEnter()` / model bindings touched.

7. **No public API changes.** Section selector names stay; apps
   that override the extension's CSS continue to work.

### Design Decisions

- **Extract to single CSS file vs leave inline `<style>` blocks** —
  extract. Three reasons:
  1. **Convention match.** Every other styled extension
     (`chat`, `admin`, `auth`, `timeline`, `lightbox`, `docit`)
     ships a CSS file. `user-profile` is the outlier.
  2. The new theming rule (`.claude/rules/theming.md`) cites
     `chat.css` as the reference pattern.
  3. Inline `<style>` blocks emit on every render and obstruct
     readability of the section views.
- **Selector naming stays.** `po-*` / `pp-*` / `ps-*` family
  names are kept verbatim. Collapsing to a shared `.up-*`
  namespace would be unrelated template churn — out of scope.
- **`:is()` aggregation for the dark cluster.** Since 12 selectors
  exist for the same conceptual surface (e.g. section labels),
  one rule per concept via `:is()` instead of 12 rules. Cleaner
  audit.
- **Inline `style="…"` → classes**, not CSS-variable references in
  inline styles. The class form is canonical per the new rule.
- **Status pills use hand-tuned `rgba()` literals**, not Bootstrap
  subtle tokens. `--bs-warning-bg-subtle` (and friends) are
  defined unscoped in `core.css:30` and leak the light-mode value
  into dark theme. Reaching for those tokens would render
  warm-cream pills against the deep dark page — the bug we're
  fixing. Separate issue tracks the leak.
- **Active-link tints (`.up-nav a.active`) use
  `rgba(13, 110, 253, 0.18)`** rather than solid `var(--bs-primary)`.
  Matches the chat.css / SideNavView precedent — solid primary
  visually competes with active modal content.

### Edge Cases

- **Inline `style="…"` attributes that don't paint** (border-radius,
  width, height, font-size, padding) stay inline. Only colour / bg
  / border inline styles get classes.
- **Hero gradient circles** (`ProfileSecuritySection.js:197`,
  `PasskeySetupView.js:54, 88`) — light: existing `linear-gradient`.
  Dark suggested: `linear-gradient(135deg, rgba(13, 110, 253, 0.22)
  0%, rgba(13, 110, 253, 0.06) 100%)` for primary; analogous green
  for success. Eyeball during the visual pass; bump alpha if flat.
- **Recovery-codes warning + new-code panels**
  (`ProfileSecuritySection.js:388-394`) — same `--bs-warning-*`
  leak. Hand-tuned dark variants:
  `rgba(255, 193, 7, 0.16)` bg + `rgba(255, 193, 7, 0.32)` border
  + `#ffda6a` text. Same pattern for the new-code success block.
- **Code blocks** (`background: #f8f9fa`) → `var(--bs-tertiary-bg)`
  on dark.
- **Modal cascade.** `data-bs-theme` on `<html>` reaches the modal
  (already verified by the deeper-surface fix). No special
  handling.
- **`.up-close:hover`** — light: `#f0f0f0` bg + `#212529` text →
  dark: `var(--bs-tertiary-bg)` + `var(--bs-emphasis-color)`.
- **Sub-component sub-views inside `ProfileSecuritySection.js`**
  (passkey naming dialog, TOTP enrollment, recovery codes) each
  render their own `<style>` block — all four migrate.
  Build-pass grep should confirm zero `<style>` blocks remain in
  `views/*.js` after the migration.
- **`ProfileSecurityEventsSection.js`** and
  **`ProfileActivitySection.js`** had no inline `<style>` block in
  the survey. Confirm during build that they don't paint anything
  custom needing dark coverage.

### Testing

- **`npm run lint`** — baseline 71 problems expected.
- **No new unit tests** — pure CSS/template restructuring.
- **Browser preview verification:**
  1. `npm run dev`, open `/examples/portal/`.
  2. Switch to **Dark** via topbar `Theme settings`.
  3. The example portal disables auth — set a fake user in dev
     console: `app.setActiveUser(new User({ first_name: 'Test',
     last_name: 'User', email: 't@example.com' }))` then
     `app.showProfile()`.
  4. Click each of the 12 sections; verify the rail bg is
     `rgb(17, 22, 29)`, section labels readable, field-row
     dividers visible, status pills legible against the dark
     page, hover/active states visible.
  5. Trigger Security sub-views (passkey enroll, TOTP, recovery
     codes) — hero circles, code blocks, warning banners all
     match the dark surface.
  6. `app.showPasskeySetup()` — gradient circle, body text,
     input.
  7. Switch to **Light** and repeat. Visual diff vs HEAD should
     be **byte-identical**.
  8. `preview_inspect` spot checks (rail bg, a status pill, an
     icon tint) in both themes.

### Docs Impact

- **`CHANGELOG.md`** — required (step 5).
- **`docs/web-mojo/extensions/UserProfile.md`** — surveyed; no
  hex values, no CSS hook claims that go stale. No update.
- **No new public API** → no other docs.

### Out of Scope

- Refactoring per-section selector names to a shared `.up-*`
  namespace.
- Fixing the `core.css:30` `--bs-*-bg-subtle` leak — recommended
  follow-up `/bug` after this lands.
- Light-theme polish (light-mode rules carry over verbatim).
- Replacing `UserProfileView`'s internal `.up-nav` with the
  framework `SideNavView` — behavioral refactor, separate.
- New public CSS hooks for downstream theming.

### Open Questions (resolved)

- ~~Why doesn't the framework `[data-bs-theme="dark"] .side-nav-view
  .snv-nav` rule apply inside the user-profile modal?~~
  **Resolved during deep exploration:** `UserProfileView` has its
  own internal `.up-nav` rail (lines 46-51 of
  `UserProfileView.js`), not a `SideNavView` instance. The
  framework selector doesn't match because the rail isn't a
  `.side-nav-view`. The fix is contained inside the user-profile
  extension — no framework `SideNavView` change needed. Updates
  this issue's "TODO: confirm root cause during the design pass."

---

## Resolution
**Status**: Resolved — 2026-04-27

**Commit**: `9c93f90` — *UserProfile: dark theme coverage +
consolidated stylesheet*

**Files changed**:
- **NEW** `src/extensions/user-profile/css/user-profile.css` (~456
  lines) — consolidates the 12 inline `<style>` blocks previously
  emitted from `views/*.js` into a single source of truth, with a
  trailing `[data-bs-theme="dark"]` override cluster following the
  chat.css / portal.css / admin.css convention.
- `src/extensions/user-profile/index.js` — added
  `import './css/user-profile.css';` (mirrors auth and timeline).
- `src/extensions/user-profile/views/UserProfileView.js` — stripped
  inline `<style>` block.
- `src/extensions/user-profile/views/ProfileOverviewSection.js` —
  stripped inline `<style>` block; converted the danger-zone
  separator to `.po-danger-zone`.
- `src/extensions/user-profile/views/ProfilePersonalSection.js` —
  stripped inline `<style>` block.
- `src/extensions/user-profile/views/ProfilePermissionsSection.js`
  — stripped inline `<style>` block.
- `src/extensions/user-profile/views/ProfileSecuritySection.js` —
  stripped 4 inline `<style>` blocks (top-level + passkey list +
  recovery-codes current + recovery-codes regenerate); converted
  the purple/danger icon `style="…"` attributes to
  `.ps-icon-purple` / `.ps-icon-danger` classes; converted the
  passkey-naming hero circle, the TOTP setup paragraph + QR + secret
  + hint, and the gradient-styled inline elements to shared
  utility classes.
- `src/extensions/user-profile/views/ProfileConnectedSection.js`,
  `ProfileSessionsSection.js`, `ProfileDevicesSection.js`,
  `ProfileNotificationsSection.js`, `ProfileApiKeysSection.js`,
  `ProfileGroupsSection.js` — stripped inline `<style>` blocks.
- `ProfileSessionsSection.js` and `ProfileDevicesSection.js` — the
  `row()` helper that renders the modal-detail "label: value" rows
  is now class-driven (`.up-detail-row` / `.up-detail-label` /
  `.up-detail-value`) instead of inline `style="…"` attributes.
- `src/extensions/user-profile/views/PasskeySetupView.js` —
  stripped inline `<style>` block; converted the primary +
  success gradient hero circles to `.up-hero-circle-primary` /
  `.up-hero-circle-success`; converted helper paragraphs to
  `.up-help-text` / `.up-help-text-bottom`.
- `CHANGELOG.md` — entry under `## Unreleased`.

**New shared utility classes added during this consolidation:**
`.up-hero-circle-primary`, `.up-hero-circle-success`,
`.up-help-text`, `.up-help-text-bottom`, `.up-secret-code`,
`.up-qr-image`, `.up-qr-hint`, `.up-detail-row`,
`.up-detail-label`, `.up-detail-value`, `.ps-icon-purple`,
`.ps-icon-danger`, `.po-danger-zone`. All have light + dark
variants and follow the framework's surface-token vocabulary.

**Tests run**:
- `npm run lint` — 71 problems (16 errors, 55 warnings) —
  **identical** to the pre-change baseline. CSS isn't linted; my
  changes didn't touch JS imports or syntax.
- `npm run test:unit` — 552/559 passed. The test suite grew with
  the user's separate User/Member registry work; the 7 failures
  are: 1 pre-existing slug test + 6 Modal-eyebrow tests
  introduced in commits `8a4c88c` / `9ae43c2` (NOT caused by this
  CSS commit — the user-profile extension has no relationship to
  Modal eyebrow logic). The test-runner agent confirmed this.
- `npm run test:integration` and `npm run test:build` — baseline
  unchanged; pre-existing infrastructure errors only.
- **Browser preview verification (load-bearing test):**
  - Opened `app.showProfile()` under `data-bs-theme="dark"` and
    inspected 12 surfaces. Every measurement matched the planned
    tokens:
    - `.up-nav` bg → `rgb(17, 22, 29)` (`--bs-tertiary-bg`) ✓
    - `.up-nav a:not(.active)` color → `rgb(173, 181, 189)`
      (Bootstrap dark `--bs-body-color`) ✓
    - `.up-nav a.active` bg → `rgba(13, 110, 253, 0.18)` ✓
    - `.up-header` bottom border →
      `rgba(255, 255, 255, 0.04)`
      (`--bs-border-color-translucent`) ✓
    - `.po-field-row` bottom border → same ✓
    - `.po-field-label` color → `rgb(138, 150, 166)`
      (`--bs-secondary-color`) ✓
    - `.po-field-value` color → `rgb(230, 236, 243)`
      (`--bs-emphasis-color`) ✓
    - `.po-badge-warn` → `rgba(255, 193, 7, 0.16)` bg + `#ffda6a`
      text (hand-tuned warning) ✓
    - `.po-badge-muted` → `rgba(255, 255, 255, 0.06)` ✓
    - `.po-not-set` color → `rgb(138, 150, 166)` ✓
  - Switched to `data-bs-theme="light"` (fresh modal mount) and
    re-measured — every value returned to its pre-change hex
    baseline byte-identically:
    - `.up-nav` bg → `rgb(248, 249, 252)` (`#f8f9fc`) ✓
    - `.up-nav a` color → `rgb(73, 80, 87)` (`#495057`) ✓
    - `.up-nav a.active` bg → `rgb(231, 241, 255)` (`#e7f1ff`) ✓
    - `.po-field-label` → `rgb(108, 117, 125)` (`#6c757d`) ✓
    - `.po-field-value` → `rgb(33, 37, 41)` (`#212529`) ✓
    - `.po-badge-warn` → `rgb(255, 243, 205)` (`#fff3cd`) ✓
    - All status pills and muted text colors match pre-change.
  - Visual screenshots in both themes confirm the dialog reads
    correctly with no contrast regressions.

**Follow-up agents** (post-commit, all clean):
- **test-runner** — no new regressions attributable to this
  commit. The 6 new Modal-eyebrow failures predate it (introduced
  by commits `8a4c88c` / `9ae43c2`, unrelated to user-profile).
  Lint baseline unchanged.
- **docs-updater** — confirmed no doc updates needed.
  `docs/web-mojo/extensions/UserProfile.md` carries no hex values
  or CSS hook claims; no other doc references the user-profile
  CSS class names. The plan's "no doc impact" call was correct.
- **security-review** — no findings. Pure cosmetic CSS. No
  `url()` / `expression()` / `attr()` / `javascript:` / `data:` /
  `base64` patterns. No `!important`. No security indicators
  dropped (every status pill and badge class accounted for in
  templates is defined in the new CSS file with dark companions).
  The `import './css/user-profile.css'` is a standard Vite
  static import — no side-channel. The dynamic
  `style="background: {{avatarColor}};"` on `.pg-avatar` is not
  a vector — `avatarColor` is computed by hashing the group name
  to an index in a hard-coded `AVATAR_COLORS` array of 8 hex
  literals; never user-supplied text.

**Docs updated**:
- `CHANGELOG.md` ✓
- `docs/web-mojo/` — no changes (confirmed by docs-updater).

**Validation**:
The browser-preview measurement pass (CSS custom properties +
computed-style inspection across 12 surfaces in both themes)
confirms every acceptance criterion:
- Every `user-profile` view renders against dark surfaces under
  `[data-bs-theme="dark"]`. Section headings, form labels,
  dividers, status pills, perm pills, code blocks, hero circles,
  modal-detail rows, the chrome rail, and the close button all
  pick up the framework's deep mission-control palette.
- Light theme is **byte-identical** to before (verified across
  9 representative surfaces).
- No `!important` introduced (security-review confirmed).
- The `PasskeySetupView` post-login dialog received the same
  treatment.
- The mystery from the bug's "TODO: confirm root cause":
  resolved during exploration — `UserProfileView` doesn't use
  `SideNavView`. It has its own internal `.up-nav` rail, so the
  framework's existing `[data-bs-theme="dark"] .side-nav-view`
  rules don't reach it. Fix is contained inside the user-profile
  extension.

**Acceptance criteria**:
- [x] Every `user-profile` view renders against dark surfaces.
- [x] Section headings, form labels, dividers readable.
- [x] Status pills (`Unverified`, `Inactive`, `Not required`,
      `User`, role/MFA badges) pick up dark-mode tints that read.
- [x] Phone "+", email pencil, "Deactivate Account" icon visible.
- [x] The SideNavView-style rail picks up framework dark
      treatment (the rail is actually `.up-nav`, not
      `.side-nav-view`; new dark rules added directly).
- [x] Light theme byte-identical (verified).
- [x] No `!important`.
- [x] `PasskeySetupView` (post-login dialog) gets the same
      treatment.
- [x] Modal cascade verified — `data-bs-theme` on `<html>`
      reaches modal content.

**Known follow-up (out of scope, separate issue warranted)**:
- The framework's `core.css` unscoped base `:root` block defines
  `--bs-warning-bg-subtle: #fef7e0` and similar `--bs-*-bg-subtle`
  / `--bs-*-border-subtle` / `--bs-*-text-emphasis` declarations
  that leak light-mode values into dark theme. Status pills in
  this fix use hand-tuned `rgba()` literals instead of those
  subtle tokens. Once the leak is fixed, those literals are
  candidates for a follow-up cleanup. Worth a focused `/bug`
  filing.
