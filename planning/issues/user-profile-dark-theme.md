# UserProfileView and all sub-section views render light-only

| Field | Value |
|-------|-------|
| Type | bug |
| Status | open |
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
