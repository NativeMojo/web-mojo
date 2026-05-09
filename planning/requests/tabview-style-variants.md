# TabView Style Variants

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-05-09 |
| Priority | medium |

## Description

Add a `variant` option to `TabView` that swaps the visual treatment of the tab bar (and matching dropdown-mode button) between a small set of named modern styles. Today every TabView ships the same Bootstrap `nav nav-tabs` look — a hairline border with an underlined active link — and the only escape hatch is overriding `tabsClass` with raw Bootstrap classes per call site. The goal is a single `variant: '<name>'` switch so a single app can mix `minimal` tabs in a settings page with `segmented-solid` tabs in a toolbar without consumers hand-rolling markup.

Five variants, grouped into two families. Names map directly to the screenshot:

**Text-style (separated, no group container):**
- **`minimal`** *(new default)* — text-only, active link in primary, no underline, no border. Hover lifts to primary at low opacity. Matches row 1 of the screenshot.
- **`underline`** — flat row, active link painted in primary with a 2px underline. The current default behavior; kept as an opt-in for back-compat.
- **`pills`** — outlined pill (or soft-tinted pill) wraps the active tab only; inactive tabs are plain text. Matches the rounded single-button highlight in rows 3–4 of the screenshot.

**Button-group-style (connected container, all tabs share borders/bg):**
- **`segmented`** — connected `btn-group`-style container with a subtle border. Active tab fills with `tertiary-bg` / neutral; inactive sit on body bg. Matches rows 5 right and 7 right (bordered group + soft group).
- **`segmented-solid`** — same shape as `segmented`, but the group is primary-tinted and the active tab is `bg-primary` / `text-white` for high contrast. Matches row 6 right.

The two `segmented*` variants are the button-group styles. If a third distinct flavor is needed (e.g., a fully-outlined neutral group separate from a soft-tinted group), call it out in `/design` and we can split `segmented` into two.

**Default behavior changes** from `nav-tabs` (underline-style) to **`minimal`**. This is intentional and visually breaking for existing call sites — see Constraints / CHANGELOG note.

## Context

- `TabView` lives at `src/core/views/navigation/TabView.js` and is the canonical tabbed-interface component. Docs are at `docs/web-mojo/components/TabView.md`.
- It already exposes `tabsClass` (default `'nav nav-tabs mb-3'`) and `dropdownStyle` (`'select' | 'button'`). Today every consumer either accepts the default or hand-overrides `tabsClass: 'nav nav-pills mb-3'` etc. — there is no central palette and no styling beyond what Bootstrap provides.
- `src/core/css/core.css` already overrides Bootstrap nav-tabs / nav-pills tokens (lines ~502–522) and ships a custom `.tab-view-select-style` block (lines ~533–586) that styles the dropdown-mode trigger like a `form-select`. Any new variant CSS belongs in the same file and **must follow `.claude/rules/theming.md`** — tokens (`--bs-body-bg`, `--bs-tertiary-bg`, `--bs-border-color`, `--bs-primary`, etc.), with `[data-bs-theme="dark"]` overrides clustered at the bottom of the variant block (mirroring the existing chat.css / portal.css convention).
- `SegmentControl` (`src/core/views/navigation/SegmentControl.js`, docs `docs/web-mojo/components/SegmentControl.md`) already implements a `btn-group` toggle for one-of-N values. Its job is different (compact value-picker that does **not** swap views) and it must stay separate — but `segmented` / `segmented-solid` TabView variants should *visually* feel related so the design language reads as one family. No code reuse required; CSS sympathy is enough.
- 16 in-repo call sites use `new TabView` / `extends TabView` (admin extensions, `SectionedFormView`, examples portal). All of them rely on the default styling today, so flipping the default from `underline` to `minimal` will visibly restyle every one of them. This is intentional per user feedback ("default should probably be minimal"), but every call site needs an eyeball pass under both themes before this lands.
- Out of scope: any change to `TableView`, `SegmentControl`, dropdown-mode behavior beyond cosmetic alignment with the chosen variant, or theming primitives in `core.css` unrelated to tabs.

## Acceptance Criteria

- [ ] `TabView` accepts a new `variant` option. Valid values: `'minimal'` (default), `'underline'`, `'pills'`, `'segmented'`, `'segmented-solid'`. Unknown values fall back to `'minimal'` with a `console.warn`.
- [ ] Default flips from today's `nav nav-tabs` (underline) to `'minimal'`. Existing call sites get the new default unless they pass `variant: 'underline'` (or override `tabsClass` directly).
- [ ] All 16 in-repo TabView call sites are visually reviewed under both themes; any that look broken under `minimal` are either fixed in CSS or pinned to `variant: 'underline'` in the same PR.
- [ ] Each variant renders correctly in **both `data-bs-theme="light"` and `data-bs-theme="dark"`**, with active/hover/focus states all reading. Verified by flipping themes in the example portal.
- [ ] Each variant works in dropdown (responsive collapse) mode without regressions — the dropdown trigger should visually match the variant family where it makes sense (e.g., `segmented-solid` triggers a primary-tinted button), but the underlying responsive behavior is unchanged.
- [ ] `tabsClass` continues to work as an escape hatch. If both `variant` and `tabsClass` are passed, `tabsClass` wins (so existing per-call overrides are not broken).
- [ ] Variant tokens cleanly live in `src/core/css/core.css` under a new section header, using Bootstrap tokens and grouping all `[data-bs-theme="dark"]` overrides at the bottom of the section per `.claude/rules/theming.md`.
- [ ] `docs/web-mojo/components/TabView.md` documents the new option, lists the variants with one screenshot/diagram per variant or a single composite image, and notes the `tabsClass` precedence rule.
- [ ] One new entry in `examples/portal/examples/components/TabView/` (or an extension to the existing `TabViewExample.js`) demonstrates flipping between variants live, so the variants are reviewable in the running example portal.
- [ ] `CHANGELOG.md` gets a release-facing entry under the next unreleased section.

## Investigation

- **What exists:**
  - `src/core/views/navigation/TabView.js` — `tabsClass` default `'nav nav-tabs mb-3'`, no concept of named variants. Tab-mode markup is built in `buildTabsNavigation()`; dropdown-mode markup is built in `buildDropdownNavigation()`. Active-state class toggling lives in `updateTabNavigation()`.
  - `src/core/css/core.css` (~lines 502–586) — existing nav-tabs / nav-pills token overrides plus `.tab-view-select-style` custom block.
  - `src/core/views/navigation/SegmentControl.js` — separate component, `btn-group` based, do not merge.

- **What changes:**
  - `TabView` constructor: accept `variant`, validate, store on instance.
  - `buildTabsNavigation()`: emit a per-variant CSS class on the `<ul>` (e.g., `tab-view-variant-segmented`) so all variant styling lives in CSS, not duplicated markup logic.
  - `buildDropdownNavigation()`: optionally adapt the trigger button style to the variant (especially for `segmented-solid`), without restructuring the dropdown.
  - `tabsClass` precedence: if user provides `tabsClass`, skip variant class injection.
  - New CSS section in `src/core/css/core.css`: `.tab-view-variant-*` blocks for each named variant, plus a clustered `[data-bs-theme="dark"]` override block at the bottom of the section.
  - `docs/web-mojo/components/TabView.md`: new "Variants" subsection under "Styling", updated constructor options table, default note.
  - `examples/portal/examples/components/TabView/TabViewExample.js` (or a sibling): live variant switcher.
  - `CHANGELOG.md`: one entry.

- **Constraints:**
  - Bootstrap 5.3 + Bootstrap Icons only — no new dependencies.
  - Theming: every variant must obey `.claude/rules/theming.md` (Bootstrap tokens > hex literals; `[data-bs-theme="dark"]` overrides clustered, not scattered). Variant CSS that needs literal colors must include matching dark overrides.
  - **Visual back-compat is intentionally relaxed:** flipping the default from underline to `minimal` is a deliberate UX refresh, called out in `CHANGELOG.md` as a visible behavior change with the one-line migration "pass `variant: 'underline'` to keep the previous look".
  - `tabsClass` precedence must be preserved — extension code in `src/extensions/admin/...` already passes custom `tabsClass` in places, and those overrides keep winning.
  - No layout regressions in the responsive dropdown collapse path.

- **Related files:**
  - `src/core/views/navigation/TabView.js`
  - `src/core/css/core.css` (lines ~502–586)
  - `docs/web-mojo/components/TabView.md`
  - `docs/web-mojo/components/SegmentControl.md` (referenced for design family alignment, no code change)
  - `examples/portal/examples/components/TabView/TabViewExample.js`
  - `examples/portal/examples/components/TabView/TabViewDynamicExample.js`
  - `CHANGELOG.md`
  - `.claude/rules/theming.md` (governing rule — read in `/design`)

- **Endpoints:** N/A — pure UI/component work.

- **Tests required:**
  - Add a unit test in `test/unit/` (mirror `TableRow.test.js` ESM pattern or the loadModule pattern) covering: (a) default `variant` is `'underline'` and produces today's classes; (b) each named variant emits the expected `tab-view-variant-*` class; (c) unknown variant warns and falls back; (d) `tabsClass` overrides variant.
  - Manual: visual eyeball under both themes in the example portal — see `.claude/rules/theming.md` "Test before declaring done".

- **Out of scope:**
  - Any change to `TableView` — the screenshot styles do not apply there. (If the user actually wants tab-style filter rows on TableView, that is a separate request.)
  - Refactoring `SegmentControl`. The `segmented` family should *feel* like a sibling, but the two components keep their separate jobs.
  - Adding new dropdown-style options (`select` / `button` are unchanged).
  - Animation / transition changes — fade transitions stay as they are.
  - Per-tab styling overrides (icons, badges, disabled state) — out of scope; address separately if requested.
  - Any new tokens in `core.css` outside the new variants section.

## Open clarifications (resolved in `/design`)

1. **Divider variants** — *Skipped for v1.* No `dividers: true` sub-flag. Revisit if a real call site needs separator-style tabs.
2. **Third button-group variant** — *Skipped for v1.* Ship `segmented` (soft, neutral active) and `segmented-solid` (primary). Add a `segmented-outlined` later only if a call site needs it.

## Plan

### Objective

Add a `variant: 'minimal' | 'underline' | 'pills' | 'segmented' | 'segmented-solid'` option to `TabView` that controls the visual style of the tab bar (and matching dropdown-mode trigger). Default flips from today's `nav nav-tabs` (underline) to `'minimal'`. The new styles are defined entirely in CSS via `.tab-view-variant-*` hook classes, so the JS change is minimal: a small lookup table that resolves `variant` → `tabsClass` when the caller didn't provide their own. `tabsClass` (when explicitly passed) wins, preserving the SectionedFormView `d-none` override and any extension overrides.

### Steps

1. **`src/core/views/navigation/TabView.js`** — constructor: accept `variant`. Validate against the five-name set; unknown value falls back to `'minimal'` with a `console.warn`. Store `this.variant`.
2. **`src/core/views/navigation/TabView.js`** — add a static `VARIANT_CLASSES` map (or private `_resolveTabsClass()` helper):
   - `underline` → `'nav nav-tabs mb-3'` (preserves today's exact classes — bit-for-bit back-compat for `variant: 'underline'`)
   - `minimal` → `'nav tab-view-variant-minimal mb-3'`
   - `pills` → `'nav tab-view-variant-pills mb-3'`
   - `segmented` → `'nav tab-view-variant-segmented mb-3'`
   - `segmented-solid` → `'nav tab-view-variant-segmented-solid mb-3'`
   In the constructor, if `options.tabsClass` was passed explicitly, use it as-is. Otherwise resolve from `variant`. This keeps existing extension code (`SectionedFormView`'s `d-none` mode at `src/core/forms/SectionedFormView.js:89`) untouched.
3. **`src/core/views/navigation/TabView.js`** — `buildTabsNavigation()`: no markup change beyond the existing `tabsClass` going onto `<ul>` at line 154. The `tab-view-variant-*` class lands on the same `<ul>` and CSS does the rest.
4. **`src/core/views/navigation/TabView.js`** — `buildDropdownNavigation()` and `buildMobileDropdownNavigation()`: add `tab-view-variant-${this.variant}` to the wrapping `<div class="dropdown mb-3">` so CSS can scope the trigger button per variant (mainly so `segmented-solid` gets a primary-tinted trigger). No structural change.
5. **`src/core/css/core.css`** — append a new section under the existing TabView block (after line ~586). One `.tab-view-variant-*` block per variant using Bootstrap tokens (`--bs-body-color`, `--bs-secondary-color`, `--bs-primary`, `--bs-tertiary-bg`, `--bs-border-color`, `--bs-primary-bg-subtle`, etc.). Reset the default `nav-link` Bootstrap padding/border baseline at the top of the section so each variant starts neutral. Include hover, focus-visible, and `:disabled`/`.disabled` states. Cluster all `[data-bs-theme="dark"]` refinements at the bottom of the section per `.claude/rules/theming.md`. Also style the dropdown-mode trigger for `segmented-solid` so the responsive collapse stays in family.
6. **`docs/web-mojo/components/TabView.md`** — update the constructor options table (add `variant`, mark `tabsClass` as escape-hatch with precedence note). Add a "Variants" subsection under "Styling" with one short code block per variant and a one-line ASCII sketch. Note the default change with the migration line "pass `variant: 'underline'` to keep the previous look". Cross-link to `SegmentControl.md` for the value-picker case.
7. **`examples/portal/examples/components/TabView/TabViewVariantsExample.js`** *(new file)* — Page with a `SegmentControl` at the top picking the variant, and a single `TabView` below that re-renders when the segment changes. New route: `components/tab-view/variants`. Wire it through whatever index the portal uses to pick up the existing two TabView examples.
8. **`test/unit/TabView.test.js`** *(new file)* — five small assertions, mirroring the ESM pattern in `test/unit/TableRow.test.js`:
   - default `variant` is `'minimal'` and the rendered `<ul>` carries `tab-view-variant-minimal`;
   - `variant: 'underline'` renders `nav-tabs` (back-compat check);
   - each named variant emits its expected `tab-view-variant-*` class;
   - unknown variant warns (spy on `console.warn`) and falls back to `'minimal'`;
   - explicit `tabsClass` wins over `variant` (no variant class injected).
9. **`CHANGELOG.md`** — add an entry under `## Unreleased` titled `### TabView — `variant` option, default flipped to `minimal`` covering the new option, the five values, the default change, the `tabsClass` precedence rule, and the one-line migration: `pass variant: 'underline'` to keep the previous look.
10. **In-repo call site sweep** — eyeball each of the 16 `new TabView` / `extends TabView` sites under both themes in the running example portal. Any that look broken under `minimal` get pinned to `variant: 'underline'` in the same PR. `SectionedFormView`'s `d-none` override is unaffected (it passes `tabsClass`, which still wins).

### Design Decisions

- **Variant lives in CSS, not JS.** The only JS change is "pick a `tabsClass` string from a lookup table." All visual differences live under `.tab-view-variant-{name}` rules. This keeps `buildTabsNavigation()` / `buildDropdownNavigation()` shape-stable and matches how the existing `.tab-view-select-style` block is structured (`core.css:533-586`).
- **Single `<ul class="nav">` shape for all variants.** Even `segmented*` variants stay inside `<ul class="nav">` rather than a Bootstrap `<div class="btn-group">`. CSS alone defines the segmented look (border around the `<ul>`, removed inter-button gaps, connected buttons). Keeps `data-action="show-tab"` dispatch and ARIA roles intact across variants.
- **`underline` preserves current classes bit-for-bit.** Its tabsClass resolves to the literal `'nav nav-tabs mb-3'` string, inheriting every existing core.css `nav-tabs` rule (lines 502–522) — no risk of subtle drift.
- **`tabsClass` precedence preserved.** If `tabsClass` is in `options`, the variant lookup is skipped. `SectionedFormView`'s `d-none` mode and any future extension override keep working. Documented in the option table.
- **No new dropdown options.** `dropdownStyle: 'select' | 'button'` stays unchanged. Variant only adds a CSS hook class on the dropdown wrapper.
- **No `dividers` sub-flag and no `segmented-outlined` in v1** — explicit per resolved clarifications above.
- **No SegmentControl reuse.** Different jobs (view-swapping vs value-picking), separate components. CSS can share token references without sharing class names.
- **Bootstrap tokens only.** Per `.claude/rules/theming.md`. Any `rgba()` literals get matching dark overrides at the bottom of the new section.

### Edge Cases

- **Active-tab class toggling** — `updateTabNavigation()` (line 366) only adds/removes `.active` on the `nav-link` button. Variant CSS scopes everything via `.tab-view-variant-* .nav-link.active`, so that path stays intact.
- **`reRenderNavigation()` on responsive mode flip** — `outerHTML` swap at line 865, both directions paint the right hook class.
- **Empty `tabs` object** — `buildTabsNavigation()` returns `''` early; nothing breaks.
- **`SectionedFormView` `d-none` mode** — passes `tabsClass: '... d-none'`. Variant lookup is skipped; the `d-none` hide path keeps working.
- **Keyboard / ARIA** — variants don't change `role="tab"`, `aria-selected`, or `data-action` wiring. WAI-ARIA tab pattern stays compliant.
- **Fade transitions** — variants only restyle the navigation, not the `.tab-pane` content. Untouched.
- **Dark theme contrast** — a 4% `rgba(0,0,0,0.04)` hover on `minimal` would be invisible in dark mode; its dark override must be `rgba(255,255,255,0.04)`. Same audit for `pills` outline tint and `segmented` border tint.
- **Focus-visible ring on segmented** — Bootstrap's default `nav-link:focus-visible` is a fat `box-shadow` ring; for connected `segmented*` we keep it but `z-index: 1` the active button so the ring isn't clipped by the group border.

### Testing

- `npm run test:unit` — narrow first to the new `test/unit/TabView.test.js`.
- `npm run lint` — confirms ESLint clean.
- `npm run dev` + example portal:
  - Visit `components/tab-view` (should now render in `minimal`).
  - Visit `components/tab-view/dynamic` (also `minimal`, no breakage adding/removing tabs).
  - Visit the new `components/tab-view/variants`; flip through all five variants under both `data-bs-theme="light"` and `data-bs-theme="dark"`. Verify hover, focus, and active states read in both themes.
  - Eyeball the 16 in-tree call sites; pin any that look bad to `variant: 'underline'`.
- Manual responsive check: narrow each variant to dropdown mode, confirm the trigger looks right (especially `segmented-solid` → primary-tinted trigger).

### Docs Impact

- `docs/web-mojo/components/TabView.md` — update.
- `CHANGELOG.md` — new entry under `## Unreleased`.
- `docs/web-mojo/components/SegmentControl.md` — no content change, but TabView's new `Variants` section should cross-link to it.
- `docs/web-mojo/AGENT.md` — no change (per-component option documented in TabView.md).
- `docs/agent/architecture.md` — no change (additive option on existing component).
