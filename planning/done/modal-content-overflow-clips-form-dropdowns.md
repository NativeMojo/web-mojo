# Modal `overflow: hidden` clips form dropdowns inside the body

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-04-26 |
| Severity | high |

## Description
The new modal chrome added in commit `ff27795` ("Modal canonical surface, typed-alert chrome refresh, alert sig fix") sets `overflow: hidden` on `.modal-content`. That rule clips any absolutely-positioned descendant — including the Bootstrap `dropdown-menu` used by every custom form dropdown (`MultiSelectDropdown`, `CollectionMultiSelect`, `ComboBox`) and any plain Bootstrap dropdown placed inside a modal body.

The user's screenshot shows an "Edit Status Filter" dialog whose `MultiSelectDropdown` opens, but the popover is visually cut off at the modal's bottom edge — the user can see "new" and "open" but "paused" (and any further options) is clipped, with no scrollbar to recover the hidden items because the popover itself isn't scrollable.

## Context
The new modal redesign uses an absolutely-positioned `::before` pseudo-element on `.modal-content` (the colored "hero band" carrying the eyebrow text and the close X). To keep that band contained within the modal's 14px rounded corners, the redesign added `overflow: hidden` to `.modal-content`. The same containment also clips every descendant popover that escapes `.modal-content`'s box, which is exactly how dropdown menus are designed to work.

Affected places:
- Any `Modal.dialog`/`Modal.show`/`Modal.form`/`Modal.modelForm` whose body contains a `MultiSelectDropdown`, `CollectionMultiSelect`, `ComboBox`, or any vanilla Bootstrap `.dropdown` / `.dropdown-menu` (incl. context menus, autocomplete lists, date pickers).
- Any future reuse of these inputs inside a dialog.

The clipping is observable through pure CSS analysis — confirmed by reading `src/core/css/core.css:1417-1433` and the dropdown components in `src/core/forms/inputs/`.

## Reproduction
1. Build any modal with `Modal.dialog({ body: <view> })` where the view contains a `MultiSelectDropdown` (e.g. the "Edit Status Filter" dialog from the screenshot).
2. Open the modal.
3. Click the dropdown toggle to open the multi-select popover near the bottom of the modal body.
4. Observe: the popover's lower portion is hidden behind the modal's lower edge.

## Expected Behavior
The full dropdown popover is visible, overflowing outside the modal's rounded surface if necessary (Bootstrap's default behavior — the popover floats above the modal in the viewport).

## Actual Behavior
The popover is clipped at the `.modal-content` boundary because `.modal-content { overflow: hidden }` cuts off any descendant positioned outside the box. Items rendered below that boundary are not reachable; the popover does not scroll because there is no overflow on the popover itself, only on the ancestor.

## Affected Area
- **Files / classes**:
  - [src/core/css/core.css:1417-1433](src/core/css/core.css:1417) — the `.modal-content { overflow: hidden }` rule.
  - [src/core/css/core.css:1440-1463](src/core/css/core.css:1440) — the `.modal-content::before` hero band that the `overflow: hidden` was added to contain.
  - [src/core/views/feedback/ModalView.js](src/core/views/feedback/ModalView.js) — owns the modal markup; no JS change needed but worth understanding the structure (`modal > modal-dialog > modal-content > {modal-header, modal-body, modal-footer}`).
  - [src/core/forms/inputs/MultiSelectDropdown.js:152-161](src/core/forms/inputs/MultiSelectDropdown.js:152) — uses Bootstrap `.dropdown-menu` (absolutely positioned).
  - [src/core/forms/inputs/ComboBox.js:75](src/core/forms/inputs/ComboBox.js:75) — same.
  - [src/core/forms/inputs/CollectionMultiSelect.js](src/core/forms/inputs/CollectionMultiSelect.js) — same.
- **Layer**: View / CSS (framework chrome).
- **Related docs**: `docs/web-mojo/components/Modal.md`, `docs/web-mojo/components/ModalView.md`.

## Acceptance Criteria
- [ ] Custom form dropdowns (`MultiSelectDropdown`, `CollectionMultiSelect`, `ComboBox`) and plain Bootstrap dropdowns render fully when used inside a modal body, without clipping at the modal boundary.
- [ ] The new modal "hero band" (`::before` eyebrow + close X) still stays inside the 14px rounded corners — visual chrome is preserved.
- [ ] The fix works for stacked modals and for the `auto-size` / `scrollable` / `maxHeight` modes.
- [ ] Manual verification using a modal with a `MultiSelectDropdown` near the bottom edge confirms the dropdown extends beyond the modal when needed.

## Investigation
- **Likely root cause:** `.modal-content { overflow: hidden }` in `src/core/css/core.css:1425` — added in commit `ff27795` to contain the rounded-corner hero band (`::before`). Side effect: every absolutely-positioned descendant popover (Bootstrap `.dropdown-menu` etc.) is clipped.
- **Confidence:** high. The CSS rule is unambiguous; the affected components all use Bootstrap's standard absolutely-positioned `.dropdown-menu`; the screenshot matches exactly the visual signature of `overflow: hidden` clipping.
- **Code path:**
  - `src/core/css/core.css:1425` — the offending rule.
  - `src/core/css/core.css:1440-1463` — the `::before` hero band whose containment motivated the rule.
  - `src/core/views/feedback/ModalView.js:253-286` — confirms standard `modal-content` markup; no `overflow` set in JS.
  - `src/core/forms/inputs/MultiSelectDropdown.js:152-161` — Bootstrap `.dropdown` + `.dropdown-menu` (absolute positioning).
- **Regression test:** Not feasible in the current Node-based test harness — the bug is a pure CSS clipping interaction that requires a real browser layout engine to observe. The unit harness has no DOM with computed styles or layout. A manual visual check (Chrome MCP) is the practical verification path; a screenshot diff is overkill for the framework's current testing stack.
- **Related files:**
  - `src/core/css/core.css` (modal redesign block, ~lines 1417-1612)
  - `src/core/views/feedback/ModalView.js`
  - `src/core/forms/inputs/MultiSelectDropdown.js`
  - `src/core/forms/inputs/ComboBox.js`
  - `src/core/forms/inputs/CollectionMultiSelect.js`
  - Possible fix directions to weigh during `/design`:
    1. Remove `overflow: hidden` from `.modal-content` and reshape the hero band so it doesn't need ancestor clipping — e.g. give `::before` its own `border-radius: 14px 14px 0 0` and rely on the modal-content's own border-radius (already present on `.modal-content`); the band already has those corner radii at line 1459, so dropping `overflow: hidden` may "just work" visually.
    2. Replace `.modal-content::before` with a real first-child element inside the header that doesn't need ancestor clipping.
    3. Configure Bootstrap dropdowns inside modals to use Popper with `boundary: 'viewport'` and `appendTo: body`, but that has to be applied to every custom dropdown component and breaks scoping — less attractive than fixing the modal CSS once.

## Plan

### Objective
Stop `.modal-content { overflow: hidden }` from clipping descendant popovers (`MultiSelectDropdown`, `ComboBox`, `CollectionMultiSelect`, plain Bootstrap `.dropdown-menu`, context menus inside dialogs) while preserving the rounded "hero band" chrome introduced in commit `ff27795`.

### Steps

1. **`src/core/css/core.css:1425` — remove `overflow: hidden` from `.modal-content`.**
   - This is the single clipping rule causing the bug.
   - The hero band (`.modal-content::before` at lines 1440–1463) already declares its own `border-radius: 14px 14px 0 0` (line 1459) and is positioned `top: 0; left: 0; right: 0;` — the band's own rounded top corners exactly match the parent card's `border-radius: 14px` (line 1419), so ancestor clipping is no longer needed for the visual result.
   - Bottom corners of the card are unaffected: `.modal-content` has `border-radius: 14px` (full), and no child element (header, body, footer) sets a solid background that would bleed past those corners — the gradient lives on `.modal-content` itself; header/footer/body backgrounds are transparent or unset.

2. **`src/core/css/core.css:1414-1416` — update the comment block.**
   - Replace the current "Overflow:hidden so the colored band's top corners get clipped to the card's border-radius" with a one-line note that the band carries its own matching `border-radius` instead, so ancestor `overflow: hidden` is intentionally absent (allowing descendant popovers to escape the card).

3. **`CHANGELOG.md` — add a Fixed entry.**
   - Record this as a fix for a regression introduced in `ff27795`. Suggested wording: "Modal: dropdowns and popovers (`MultiSelectDropdown`, `ComboBox`, `CollectionMultiSelect`, Bootstrap `.dropdown-menu`) inside modals are no longer clipped at the card edge. Hero-band rounding now relies on the band's own `border-radius` instead of `overflow: hidden` on `.modal-content`."

### Out of Scope
- No changes to `ModalView.js` or `Modal.js` — markup is already correct.
- No changes to dropdown components (`MultiSelectDropdown`, `ComboBox`, `CollectionMultiSelect`). Pushing Popper boundary/appendTo into each input was considered and rejected as more invasive and harder to maintain.
- No changes to the `auto-size` / `scrollable` / `maxHeight` paths in `ModalView.js`. Those use `.modal-dialog-scrollable` (overflow on `.modal-body`, not `.modal-content`) and the unrelated `.overflow-hidden` utility on `.modal-dialog` at `src/core/views/feedback/ModalView.js:273`.
- No changes to dark-mode overrides (lines 1619-1655) — they only override box-shadow and background.

### Design Decisions
- **Single-line CSS fix over component-level Popper config.** The bug's root cause is one CSS rule shared by every modal. Fixing once at the source is KISS-aligned. Layering Popper boundary tweaks into each form input would multiply surface area and miss future dropdown components.
- **Trust the band's own `border-radius`.** The redesign already gave `.modal-content::before` matching top corners — the ancestor `overflow: hidden` was belt-and-suspenders. Dropping it removes the bug with no visual change.
- **No defensive `.modal-clip` opt-in class.** No current caller relies on `.modal-content` clipping children with their own backgrounds; introducing one would be premature abstraction.

### Edge Cases
- **Stacked modals:** unchanged — z-index/backdrop logic in `ModalView.bindBootstrapEvents` doesn't depend on `overflow`.
- **`modal-fullscreen` / `modal-fullscreen-sm-down`:** Bootstrap zeroes the border-radius on these, so removing `overflow: hidden` has no visual impact.
- **Auto-size mode:** `ModalView.js:557-606` measures and constrains `.modal-content`'s `width` / `maxHeight`; when content exceeds height, it adds `.modal-dialog-scrollable` so overflow lands on `.modal-body`. No reliance on `.modal-content` overflow.
- **`maxHeight` option (no autoSize):** `ModalView.js:486-489` sets `style.maxHeight` on `.modal-body` directly — also fine.
- **Unusual children with their own backgrounds:** if a caller sets a solid background on `.modal-body` or `.modal-footer`, it could now visually "square off" at the card's bottom corners. No current caller does this; if it surfaces later, that caller can opt into its own `border-radius` on the bottom region. Not blocking.
- **Bootstrap's default behavior:** Vanilla Bootstrap modals have no `overflow: hidden` on `.modal-content` — restoring this baseline aligns with documented Bootstrap behavior, including dropdown/popover usage.

### Testing
- **Lint:** `npm run lint` — no JS changes expected; CSS file isn't linted by ESLint.
- **Unit/integration:** no impact, no test changes required. The bug is a layout-only interaction the Node harness can't observe.
- **Manual visual verification (required before close):**
  1. Start the dev server (`npm run dev` or equivalent for this repo's portal-mojo example app).
  2. Open a page that already mounts a modal containing a `MultiSelectDropdown` near the bottom — the "Edit Status Filter" dialog from the bug screenshot, or any `Modal.form` / `Modal.dialog` containing one of the affected inputs. The form playground page added in `planning/done/portal-form-playground-and-collapsible-menus.md` is a possible host.
  3. Open the dropdown and confirm: (a) the full option list is visible and extends past the modal's bottom rounded corner if needed, (b) the hero band's rounded top corners still look clean, (c) the close X is still positioned correctly inside the band.
  4. Repeat with `Modal.alert` (typed: success / warning / error) and `Modal.confirm` to confirm typed-alert chrome still renders correctly.
  5. Smoke-test stacked dialogs (open one modal, then another from inside it).

### Docs Impact
- **`docs/web-mojo/components/Modal.md` / `ModalView.md`:** no change needed — neither describes the internal CSS containment, and no public API/options change.
- **`CHANGELOG.md`:** add the Fixed entry described in step 3. This is release-facing because it changes user-visible chrome behavior (dropdowns now escape the modal where they previously clipped).

---

## Resolution
**Status**: Resolved — 2026-04-26
**Root cause**: `.modal-content { overflow: hidden }` in `src/core/css/core.css` (added in commit `ff27795` for the hero-band redesign) clipped every absolutely-positioned descendant — including the Bootstrap `.dropdown-menu` used by `MultiSelectDropdown`, `ComboBox`, `CollectionMultiSelect`, and any context menu inside a modal body. The hero band's `::before` already carried its own matching `border-radius: 14px 14px 0 0`, so the ancestor clip was unnecessary for the rounded chrome.
**Files changed**:
- `src/core/css/core.css` — removed `overflow: hidden` from `.modal-content`; updated the explanatory comment to note that the band carries its own `border-radius` and that overflow is intentionally visible so popovers can escape the card.
- `CHANGELOG.md` — added a `Fixed` entry under Unreleased.
**Tests added/updated**: None — the bug is a layout-only interaction that the Node-based test harness can't observe. Verified manually via the dev preview.
**Validation**: Built a `MultiSelectDropdown` inside a `ModalView`, opened the dropdown; menu extends 186px past the modal-content's bottom edge with all six options visible. `getComputedStyle(.modal-content).overflow === 'visible'`. Modal chrome (rounded top corners, hero band, close X) renders unchanged. Matches the legacy Dialog.js screenshot.
