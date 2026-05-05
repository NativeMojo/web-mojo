# DatePicker Rebuild — Multi-Precision, Native, Mockup-Driven

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
| Date | 2026-05-04 |
| Priority | high |
| Resolved | 2026-05-04 |

## Description

Replace the Easepick-backed `DatePicker` and `DateRangePicker` with a single in-house picker engine that supports multiple precisions and ranges, plus a new `TimePicker` (with optional timezone). All variants share one calendar/grid component, one styling pass, and one set of theming rules.

User-visible field types after the rebuild:

- **Single value**
  - `datepicker` with `precision: 'day'` (default) — year-month-day
  - `datepicker` with `precision: 'month'` — year-month
  - `datepicker` with `precision: 'year'` — year
  - `timepicker` — HH:MM
  - `timepicker` with `timezone: true` — HH:MM + IANA timezone
  - `datetimepicker` — date + time (composition of the above)
- **Range**
  - `daterange` with `precision: 'day' | 'month' | 'year'` — start/end at the chosen precision
  - `datetimerange` — date+time range (stretch goal, behind same engine)

Existing `datepicker` and `daterange` field-type names continue to work unchanged with `precision` defaulting to `'day'`.

## Context

The current pickers ([src/core/forms/inputs/DatePicker.js](src/core/forms/inputs/DatePicker.js) and [src/core/forms/inputs/DateRangePicker.js](src/core/forms/inputs/DateRangePicker.js)) are limited to day-precision and depend on Easepick loaded at runtime from a public CDN with a native HTML5 fallback. Downstream consumers (the external project portal LLM that surfaced this request) need year-only and year-month selectors for filters and report periods, and time + timezone selection for scheduling. Easepick has no year-only or month-only modes, so extending it would force a hybrid stack (Easepick for day, custom for everything else) with two styling/behavior surfaces.

Rolling our own gives us:

- One picker engine, one set of Bootstrap-tokened styles, uniform behavior across day/month/year/time.
- No third-party CDN call at runtime; works offline; smaller, tree-shakable code path.
- Direct `data-bs-theme` light/dark theming per `.claude/rules/theming.md` (no `--easepick-*` namespace mirror).
- Full control over keyboard nav, ARIA grid semantics, locale (`Intl.DateTimeFormat`), and DST/week-start edge cases.

## Mockup-Driven Design

Before any production code lands, we build clickable HTML mockups in `planning/mockups/datepicker/` so the user can pick the cleanest design across:

- Day-precision calendar (single + range)
- Month-precision grid (single + range)
- Year-precision grid (single + range, with decade pagination)
- Time spinner (HH:MM, 12h vs 24h variants)
- Time + timezone (autocomplete vs grouped select)
- Combined date+time popover layout
- Inline vs popover modes
- Light + dark theming

Mockup folder convention follows `planning/mockups/security_dashboard/` (`index.html`, `mock.css`, `mock.js`, `README.md`). Multiple variants per surface live as sibling files (e.g. `month-grid-a.html`, `month-grid-b.html`) so the user can compare side by side. The chosen variants are then locked in as the production design before implementation begins.

## Acceptance Criteria

### Phase 0 — Mockups
- [ ] `planning/mockups/datepicker/README.md` documents each variant and its tradeoffs.
- [ ] Mockups render correctly under both `[data-bs-theme="light"]` and `[data-bs-theme="dark"]` from day one (per `.claude/rules/theming.md`).
- [ ] User reviews and selects one variant per surface; selections are recorded in the mockup README.
- [ ] No production code changes during this phase.

### Phase 1 — Core Engine
- [ ] New internal `Calendar` view at `src/core/forms/inputs/calendar/` (or similar) that renders day-grid, month-grid, and year-grid based on a `precision` option.
- [ ] Calendar handles: navigation (prev/next, header click to zoom out a level), min/max constraints, disabled dates, single + range selection, keyboard nav (arrow keys, PageUp/PageDown, Home/End, Enter, Escape), ARIA grid roles, locale-aware month/day names via `Intl.DateTimeFormat`.
- [ ] No external CDN dependencies; no Easepick imports anywhere in `src/`.

### Phase 2 — DatePicker & DateRangePicker Rewrite
- [ ] `DatePicker` rewritten on top of `Calendar`. Public options preserved where they overlap (`name`, `value`, `format`, `displayFormat`, `min`, `max`, `placeholder`, `disabled`, `readonly`, `required`, `inline`, `disabledDates`, `firstDay`, `lang`).
- [ ] New options: `precision: 'year' | 'month' | 'day'` (default `'day'`).
- [ ] `DateRangePicker` rewritten on top of `Calendar` with the same `precision` option. Public options (`startName`, `endName`, `startDate`, `endDate`, `outputFormat`, `separator`) preserved.
- [ ] Storage formats: `'YYYY'` for year, `'YYYY-MM'` for year-month, `'YYYY-MM-DD'` for day. Existing `format` option still respected for day precision.
- [ ] Existing `datepicker` and `daterange` field-type registrations in `src/core/forms/inputs/index.js` keep working with no caller changes.
- [ ] Easepick CDN loader removed; native HTML5 fallback branch removed.

### Phase 3 — TimePicker (+ Timezone)
- [ ] New `TimePicker` component with HH:MM spinner. Options: `format: '12h' | '24h'`, `step` (minutes), `min`, `max`.
- [ ] `timezone: true` option adds an IANA timezone selector populated from `Intl.supportedValuesOf('timeZone')` with autocomplete; `timezones: [...]` option lets the developer supply a fixed list.
- [ ] Output formats: time-only stores `'HH:MM'`; with timezone stores either `'HH:MM TZ'` string or `{ time, timezone }` object based on `outputFormat`.
- [ ] Registered in `INPUT_TYPES` as `timepicker`.

### Phase 4 — Composition & Docs
- [ ] `datetimepicker` field type composes DatePicker + TimePicker in a single popover.
- [ ] `docs/web-mojo/forms/inputs/DatePicker.md` updated with `precision` and all new options.
- [ ] `docs/web-mojo/forms/inputs/DateRangePicker.md` updated with `precision`.
- [ ] New `docs/web-mojo/forms/inputs/TimePicker.md`.
- [ ] `docs/web-mojo/forms/inputs/README.md` and `docs/web-mojo/forms/FieldTypes.md` updated.
- [ ] Examples portal: new/updated runnable examples under `examples/portal/examples/forms/inputs/` for each precision and for TimePicker.
- [ ] `CHANGELOG.md` entry covering the rebuild and the (non-breaking) new options.

## Investigation

- **What exists:**
  - [src/core/forms/inputs/DatePicker.js](src/core/forms/inputs/DatePicker.js) — 546 lines, Easepick loader + native fallback.
  - [src/core/forms/inputs/DateRangePicker.js](src/core/forms/inputs/DateRangePicker.js) — 868 lines, same pattern with start/end.
  - [src/core/forms/inputs/index.js](src/core/forms/inputs/index.js) — `INPUT_TYPES` registry maps `datepicker` and `daterange`.
  - [src/core/forms/FormBuilder.js](src/core/forms/FormBuilder.js) — `renderDatePickerField` (line 2256), `renderDateRangePickerField` (line ~2341).
  - [docs/web-mojo/forms/inputs/DatePicker.md](docs/web-mojo/forms/inputs/DatePicker.md), [docs/web-mojo/forms/inputs/DateRangePicker.md](docs/web-mojo/forms/inputs/DateRangePicker.md), [docs/web-mojo/forms/inputs/README.md](docs/web-mojo/forms/inputs/README.md), [docs/web-mojo/forms/FieldTypes.md](docs/web-mojo/forms/FieldTypes.md), [docs/web-mojo/forms/BasicTypes.md](docs/web-mojo/forms/BasicTypes.md).
  - Existing examples: `examples/portal/examples/forms/inputs/DatePicker/`, `examples/portal/examples/forms/inputs/DateRangePicker/`.

- **What changes:**
  - Both picker JS files rewritten on top of a new internal `Calendar` view.
  - New `TimePicker.js`. Possibly a new `DateTimePicker.js` composition.
  - `inputs/index.js` `INPUT_TYPES` gains `timepicker` and `datetimepicker`; existing entries unchanged.
  - `FormBuilder.js` `renderDatePickerField` / `renderDateRangePickerField` lose Easepick-specific helper text; gain `precision` plumbing. New render path for `timepicker`.
  - Docs and examples per Phase 4.

- **Constraints:**
  - Public API for `datepicker` / `daterange` must stay backwards compatible — `precision` defaults to `'day'` and existing options behave identically.
  - Components extend `View`; use `addChild()` with `containerId`; `data-action="kebab-case"` for handlers; Bootstrap 5.3 + Bootstrap Icons.
  - Theming: Bootstrap tokens (`var(--bs-tertiary-bg)` etc.) over hex literals; every surface tested under both `data-bs-theme` values; inline `<style>` blocks include both light defaults and dark overrides per `.claude/rules/theming.md`.
  - REST/data layer untouched — this is purely a forms/inputs change.
  - No new runtime CDN dependencies. All code ships from `src/`.
  - Locale handling via `Intl.DateTimeFormat` and `Intl.supportedValuesOf` (modern browsers per existing browser-support matrix in `inputs/README.md`).

- **Related files:**
  - `src/core/forms/inputs/DatePicker.js`
  - `src/core/forms/inputs/DateRangePicker.js`
  - `src/core/forms/inputs/index.js`
  - `src/core/forms/FormBuilder.js`
  - `src/core/forms/FormView.js`
  - `docs/web-mojo/forms/inputs/*.md`
  - `docs/web-mojo/forms/FieldTypes.md`, `docs/web-mojo/forms/BasicTypes.md`
  - `examples/portal/examples/forms/inputs/DatePicker/`, `DateRangePicker/`
  - `planning/mockups/datepicker/` (new — see Phase 0)

- **Endpoints:** None. This is a client-side input rewrite; no API contracts change.

- **Tests required:**
  - Unit tests for the `Calendar` view: navigation, precision switching, min/max constraints, disabled dates, range selection, keyboard nav.
  - Unit tests for `DatePicker` / `DateRangePicker` covering each precision, format round-trips, and the existing public option set (regression coverage).
  - Unit tests for `TimePicker`: 12h/24h, step, timezone selection, output format variants.
  - Build test: confirms Easepick imports/CDN references are gone.
  - Per `.claude/rules/testing.md`: regression tests for any prior bug behaviors we're preserving; tests live in `test/unit/` using `loadModule()`.

- **Out of scope:**
  - Recurrence rules / RRULE editing.
  - Calendar event display (this is an input, not a calendar widget).
  - Server-side timezone conversion or storage policy — components emit IANA strings; backend handling is unchanged.
  - Locale-pack additions beyond what `Intl` already provides in modern browsers.
  - Migration of existing downstream consumers' field configs — they keep working as-is; new precisions are opt-in.
  - Date math utilities beyond what the picker itself needs (we don't ship a general-purpose date library).

## Notes

- Phase 0 (mockups) gates everything else — no `src/` changes until the user signs off on a variant.
- Phases 1–4 can each ship as separate PRs; Phase 1 + 2 together are the minimum viable rebuild (preserves all current functionality, adds year/month precisions, removes Easepick). Phase 3 + 4 (time + timezone + composition + docs) follow.
- Mockup folder mirrors the `planning/mockups/security_dashboard/` shape: `index.html` as the variant index, supporting `mock.css` / `mock.js`, and a `README.md` that captures decisions.

---

## Plan

### Status Flow

This plan separates planning work (including mockups) from build work:

| Stage | Skill | Status field | Output |
|---|---|---|---|
| Initial scoping | `/request` | `open` | This file's Description, Context, Acceptance Criteria, Investigation. |
| Implementation plan | `/design` | `planned (mockups pending)` | This `## Plan` section. |
| **Phase 0 — Mockups** | **still `/design`** (continued) | `planned (mockups pending)` → `planned (mockups locked)` | Files in `planning/mockups/datepicker/` plus a "User selections" table in its README. **No `src/` changes.** |
| Phases 1–4 | `/build` | `in progress` → `resolved` | Code, tests, docs. |

`/build` does not run until `planning/mockups/datepicker/README.md` records a winning variant per surface.

### Objective

Replace `DatePicker` and `DateRangePicker` (Easepick + native fallback) with a single in-house picker engine that delivers:

1. **Day / month / year precision**, single value or range, all rendered by one shared `Calendar` view that drills between zoom levels (year → month → day).
2. **Best-in-class range UX** — hover preview, day-count tooltip, two-month side-by-side, optional preset sidebar.
3. **Time picker** with optional IANA timezone.
4. **No runtime CDN dependency.** Bootstrap 5.3 tokened theming, dark from day one.
5. **Mockup-driven gate** — Phase 0 ships variants in `planning/mockups/datepicker/` for the user to choose between **before any `src/` changes**.

### UX Direction

Three observations anchor the engine:

1. **Google Calendar's drill-down is our precision system.** Clicking the day-grid header zooms out to a month-grid; clicking the month-grid header zooms out to a year-grid. `precision: 'day'` lets the user drill all the way; `precision: 'month'` stops at the month-grid; `precision: 'year'` stops at the year-grid. **One engine, three precisions, same code path.**
2. **Easepick's range model is the floor, not the ceiling.** Hover preview between anchor and cursor, day-count tooltip, two-month side-by-side, click-click selection (no drag). We match it, then add what Easepick can't: range at month and year precision (same hover-preview pattern), and a Stripe-style preset sidebar (`Today`, `Last 7 days`, `Last 30 days`, `This month`, `Last month`, `This quarter`, `This year`, `Custom`).
3. **Type-ahead is a power-user accelerator.** Input field stays editable; the picker parses what the user types. Stretch goal — explored in Phase 0 mockups but not required for Phase 1.

Time picker takes Apple's column-wheel pattern adapted to desktop: hours/minutes in two scrollable columns with a centered selection rail, plus a numeric input above for typing. AM/PM toggle for 12h, hidden in 24h. Timezone is a searchable combobox grouped by region with current offset shown — defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone`.

### Steps

#### Phase 0 — Mockups (still planning, not build)

1. **`planning/mockups/datepicker/index.html`** — variant index page. Sidebar lists each surface; clicking a row loads the variant in a viewport on the right. Top-right toggle for light/dark theme. Bootstrap 5.3 loaded so mockups look like the real thing.
2. **`planning/mockups/datepicker/mock.css`** — shared styles tokened with `var(--bs-*)` per `.claude/rules/theming.md`. Both light defaults and `[data-bs-theme="dark"]` overrides.
3. **`planning/mockups/datepicker/mock.js`** — fake calendar rendering for hover/selection/drill interactions. No real date math beyond what's needed to demonstrate the design.
4. **Variants per surface** — each as its own HTML fragment loaded into the variant viewport:

   | Surface | Variants |
   |---|---|
   | Day, single value | A) Stripe-popover · B) Linear-inline with quick-actions footer · C) Notion-style with type-ahead input |
   | **Day, range** (priority) | A) Easepick clone — two months, hover preview, count tooltip · B) Stripe — preset sidebar + two months · C) Linear-condensed — single month with from/to inputs and relative chips |
   | Month, single | A) 4×3 month tiles in year frame · B) Two-column scroll wheel |
   | Month, range | A) Two side-by-side year frames (Easepick-pattern at month level) · B) Stripe-preset for month presets (`This month`, `Last month`, `YTD`, etc.) |
   | Year, single | A) 4×3 year tiles, decade pagination · B) Vertical scroll list with sticky decade markers |
   | Year, range | A) Two side-by-side decade grids · B) Single decade with from/to inputs |
   | Time (HH:MM) | A) Apple wheel columns · B) Numeric stepper buttons · C) Type-ahead text + dropdown list |
   | Time + timezone | A) Stacked (time above tz combobox) · B) Side-by-side row |
   | Date + time combined | A) Calendar above time strip in one popover · B) Tabs (Date \| Time \| TZ) |

5. **`planning/mockups/datepicker/README.md`** — describes each variant, the tradeoffs, and a **User selections** table that records which variant wins per surface. When that table is filled in, status moves to `planned (mockups locked)` and `/build` is unblocked.

#### Phase 1 — Core engine (build)

6. **`src/core/forms/inputs/calendar/Calendar.js`** *(new)* — internal View. Owns:
   - `precision: 'year' | 'month' | 'day'` (where to land)
   - `view: 'year' | 'month' | 'day'` (current zoom; drill-down state)
   - `range: boolean`, `selected: { start, end }`, `hover: Date`
   - `min`, `max`, `disabledDates`
   - `firstDay`, `locale` (drives `Intl.DateTimeFormat` for month/day names)
   - `months: 1 | 2` (single-pane vs side-by-side)
   - Renders day-grid, month-grid, year-grid each as a `role="grid"` ARIA region with full keyboard nav (arrows, PageUp/PageDown for prev/next page, Home/End for row edges, Enter to select, Escape to dismiss).
   - Emits: `select`, `range:select`, `view:change`, `navigate`.
   - Pure View, no DOM coupling to the wrapping picker.

7. **`src/core/forms/inputs/calendar/CalendarPopover.js`** *(new)* — popover wrapper. Handles positioning relative to a trigger input, click-outside-to-dismiss, focus trap, scroll-locking, and mounting into `document.body` via portal so popovers escape clipping containers (modals, overflow:hidden tables — see `planning/done/modal-content-overflow-clips-form-dropdowns.md`). Inline mode skips the portal.

8. **`src/core/forms/inputs/calendar/PresetSidebar.js`** *(new, range only)* — left-rail preset list. Default presets driven by precision. Custom presets via `presets: [{ label, range: () => ({start, end}) }]` option.

9. **`src/core/forms/inputs/calendar/calendar.css`** *(new)* — all styling. Tokened. Light + dark. No `--easepick-*` namespace.

10. **`src/core/utils/dateFns.js`** *(new, narrow)* — only the date math the picker needs: `addMonths`, `addYears`, `startOfMonth`, `endOfMonth`, `startOfYear`, `endOfYear`, `isSameDay/Month/Year`, `formatYMD`, `parseYMD`, `daysInMonth`, `weekdaysOf(locale, firstDay)`. Check `src/core/utils/` first; only add what's missing. **Not** a general-purpose date library.

#### Phase 2 — DatePicker / DateRangePicker rewrite (build)

11. **`src/core/forms/inputs/DatePicker.js`** — gut the file. New implementation: trigger input + `CalendarPopover` wrapping `Calendar`. New option `precision`. Public option set preserved (`name`, `value`, `format`, `displayFormat`, `min`, `max`, `placeholder`, `disabled`, `readonly`, `required`, `inline`, `disabledDates`, `firstDay`, `lang`, `autoApply`). Output format keyed off `precision`: `YYYY` / `YYYY-MM` / `YYYY-MM-DD` (or whatever `format` overrides).

12. **`src/core/forms/inputs/DateRangePicker.js`** — gut the file. Same `Calendar` engine with `range: true`, `months: 2`, optional `PresetSidebar`. New options: `precision`, `presets` (array or `'default'`). Public options preserved (`startName`, `endName`, `startDate`, `endDate`, `outputFormat`, `separator`). Easepick CDN loader and `RangePlugin` setup deleted.

13. **`src/core/forms/inputs/index.js`** — `INPUT_TYPES` unchanged for `datepicker`/`daterange`. Add `timepicker`, `datetimepicker`. Add `monthpicker`/`yearpicker`/`monthrange`/`yearrange` aliases that pre-set `precision`.

14. **`src/core/forms/FormView.js`** lines 609–676 — only logic change is `data-field-config` may now include `precision`/`presets`/`timezone`. Placeholder selector and instantiation pattern unchanged.

15. **`src/core/forms/FormBuilder.js`** lines 2256, 2341 — drop "this will be enhanced with Easepick" helper text. Pass `precision`/`presets` through `data-field-config`.

#### Phase 3 — TimePicker + timezone (build)

16. **`src/core/forms/inputs/TimePicker.js`** *(new)* — wheel-column picker. Options: `format: '12h'|'24h'`, `step` (minutes), `min`, `max`, `timezone: false|true|string[]`, `outputFormat: 'string'|'object'`. Numeric input above the wheel for type-ahead. Shares `CalendarPopover` for popover mechanics. Storage as `'HH:MM'`, `'HH:MM TZ'`, or `{ time, timezone }` per `outputFormat`.

17. **`src/core/forms/inputs/TimezoneSelect.js`** *(new, internal)* — searchable combobox built on the existing `ComboBox` pattern. Populated from `Intl.supportedValuesOf('timeZone')`, grouped by region, current offset shown. Default = `Intl.DateTimeFormat().resolvedOptions().timeZone`.

18. **`src/core/forms/inputs/DateTimePicker.js`** *(new)* — composition of `DatePicker` + `TimePicker` per the variant chosen in Phase 0. Field type `datetimepicker`.

#### Phase 4 — Docs & examples (build)

19. **`docs/web-mojo/forms/inputs/DatePicker.md`** — add `precision`, drill-down behavior, Easepick removal note.
20. **`docs/web-mojo/forms/inputs/DateRangePicker.md`** — add `precision`, `presets`, hover-preview behavior.
21. **`docs/web-mojo/forms/inputs/TimePicker.md`** *(new)*.
22. **`docs/web-mojo/forms/inputs/DateTimePicker.md`** *(new)*.
23. **`docs/web-mojo/forms/inputs/README.md`** — refresh tables; add new types.
24. **`docs/web-mojo/forms/FieldTypes.md`** — refresh.
25. **`examples/portal/examples/forms/inputs/`** — add/update examples for each precision and for `timepicker`/`datetimepicker`.
26. **`CHANGELOG.md`** — entry covering rebuild, new precisions, new types, dropped Easepick dep (non-breaking for existing callers).

### Design Decisions

- **One `Calendar` view, three precisions.** Drill-down zoom IS the precision system. `precision: 'month'` means "selecting a month-tile fires `select` instead of zooming into the day-grid". Cleanest mapping across libraries — Easepick's plugin model can't express this.
- **Drop Easepick fully.** Confirmed in the prior turn. No hybrid.
- **Portal popover.** Mounts to `document.body` so popovers in modals / overflow-clipped tables actually appear. `planning/done/modal-content-overflow-clips-form-dropdowns.md` shows this has bitten us before.
- **Preset sidebar is a first-class range feature.** Stripe-style. Defaults provided per precision; consumer can override.
- **Tokened theming.** No `--easepick-*` namespace. All surfaces use `var(--bs-tertiary-bg)` etc. Inline `<style>` blocks include both light and dark per `.claude/rules/theming.md`.
- **Backwards-compatible field-type names.** `datepicker` and `daterange` keep working with no caller changes; `precision` defaults to `'day'`.
- **Internal alias style preserved.** `import View from '@core/View.js'`.
- **`addChild()` with `containerId`.** `Calendar` and `PresetSidebar` are children; framework manages lifecycle. No manual `render()`/`mount()`.
- **Action handlers in `kebab-case`.** Drill clicks become `data-action="zoom-out"` → `onActionZoomOut()`.
- **Locale via `Intl`.** No locale packs to ship.

### Edge Cases

- **DST boundaries.** Date math uses local-date components (year/month/day ints), never UTC offset. `formatYMD(date)` returns `${y}-${m}-${d}` from the local date object so a "spring forward" day doesn't disappear.
- **Min/max with precision.** When `precision: 'month'`, `min: '2024-03'` should disable Jan/Feb 2024 in that year's month-grid. When `precision: 'year'`, `min: '2024'` disables prior year tiles.
- **Range with same start/end.** Selecting one day at day-precision (or one month at month-precision) is a valid 1-unit range. Output: `start === end`.
- **In-progress range survives page navigation.** Once a start anchor is clicked, it is held in state. Paging ‹/› (or PgUp/PgDn) to a different month/decade keeps the anchor; the user can commit the end cell on a different page. Hover preview tints every visible cell up to the cursor even when the anchor is off-screen. Tooltip ("N days / months / years") updates against the persisted anchor regardless of which page is visible. Two-month layout pages both panes together but uses the same off-page-anchor model.
- **Backwards range selection.** Clicking a later cell first, paging backwards, then clicking an earlier cell auto-swaps start/end on commit (Easepick parity).
- **Escape during in-progress range.** Clears the anchor and returns to the visible page; does not commit.
- **Range partially out of bounds.** If `min` falls inside an in-progress range, snap the anchor to `min` rather than rejecting silently.
- **Disabled dates inside a range.** Easepick currently allows ranges that span disabled dates; we match that and add an option `excludeDisabledFromRange: true` for strict callers. Default off for parity.
- **Decade pagination at year-precision.** Min/max constrain prev/next decade arrows; reaching the edge disables (not hides) the arrow.
- **Timezone unavailable.** `Intl.supportedValuesOf` is supported in modern browsers per `inputs/README.md`'s declared matrix; fall back to a curated ~50-zone list if it throws.
- **Inside a Bootstrap modal.** `data-bs-theme` cascade still applies. Portal popover into `body` keeps z-index above the modal.
- **Form serialization.** `getFormValue()` returns the precision-formatted string; `FormView.handleFieldChange` already routes by field name. Range emits `{start, end, combined}` matching current shape.
- **Existing callers using `format: 'MM/DD/YYYY'`.** Still respected for day precision. For month/year precision, `format` is ignored if it includes day tokens (one-time `console.warn` flags the misconfig).
- **Cleanup.** `onBeforeDestroy()` removes portal-mounted popover from `document.body`; `Calendar` and `PresetSidebar` clean up via standard `addChild` lifecycle.
- **Lifecycle.** No fetches in `onAfterRender`; nothing async in mount path now that Easepick is gone — engine is fully synchronous.

### Testing

- **Phase 0 (mockups):** visual review under both themes. No automated tests — mockups are static.
- **Phase 1:** `test/unit/Calendar.test.js` — drill navigation, keyboard nav (arrow/PgUp/PgDn/Home/End/Enter/Escape), `min`/`max` constraints disable correct cells at each precision, range hover-preview state, `select` payload at each precision.
- **Phase 2:** `test/unit/DatePicker.test.js` and `test/unit/DateRangePicker.test.js` — every existing public option works at `precision: 'day'` (regression coverage); new precisions emit correct output formats; preset sidebar invokes presets correctly; backwards-compatibility test.
- **Phase 3:** `test/unit/TimePicker.test.js` — 12h/24h, step, output formats, timezone selection.
- **Phase 4:** `test/build/no-easepick.test.js` — greps the built bundle; confirms `easepick` and `cdn.jsdelivr.net/npm/@easepick` are absent.
- **Narrowest commands:**
  - `node test/test-runner.js` (narrow with file moves per `.claude/rules/testing.md` — runner has no `--grep`).
  - `npm run test:unit`, `npm run test:build`, `npm run lint`.
- **Manual smoke:** `npm run dev`, exercise each precision under both themes per `.claude/rules/theming.md` "Test before declaring done".

### Docs Impact

- `docs/web-mojo/forms/inputs/DatePicker.md` — `precision`, drill-down explainer, Easepick removal note.
- `docs/web-mojo/forms/inputs/DateRangePicker.md` — `precision`, `presets`, hover-preview, two-month layout.
- `docs/web-mojo/forms/inputs/TimePicker.md` — new file.
- `docs/web-mojo/forms/inputs/DateTimePicker.md` — new file.
- `docs/web-mojo/forms/inputs/README.md` — new components in comparison tables.
- `docs/web-mojo/forms/FieldTypes.md` — add `timepicker`, `datetimepicker`, precision aliases.
- `docs/web-mojo/forms/BasicTypes.md` — note framework-grade equivalent of HTML5 `month`.
- `CHANGELOG.md` — non-breaking entry: new precisions, new components, removed Easepick CDN dependency.

### Out of Scope

- Recurrence / RRULE editing.
- Calendar event display (this is an input).
- Server-side timezone conversion or storage policy.
- Type-ahead natural-language input ("next friday") — explored in Phase 0 mockups, not required for Phase 1. Captured as Phase 5/follow-up if a winning variant uses it.
- Locale packs beyond `Intl`.
- Migration of existing downstream consumer field configs (they keep working).
- General-purpose date library — `src/core/utils/dateFns.js` is narrow to picker needs only.


---

## Resolution

**Status:** Resolved — 2026-05-04 (Phase 1 + Phase 2 shipped as MVP; Phase 3 + 4 deferred to follow-up)

**Commits:**
- `3dfac51` — DatePicker rebuild: in-house Calendar engine, day/month/year precision, range cross-page
- `c5baba8` — DatePicker: replace innerHTML in calendar header with textContent (security follow-up)

**What was implemented (Phase 1 + 2):**

1. **Calendar engine** — internal `Calendar` view that renders day-grid / month-grid / year-grid based on `precision`. Same engine drives all three precisions. Drill-down zoom: header click moves up one level (day → month → year). Cross-page anchor persistence in range mode. Backwards selection auto-swaps. Min/max constraints, disabled dates, keyboard nav (PageUp/PageDown/Escape).
2. **CalendarPopover** — portal-based popover wrapper that mounts to `document.body` so popovers escape clipping containers (modals, overflow:hidden tables). Click-outside-to-dismiss, scroll-aware repositioning.
3. **PresetSidebar** — Stripe-style preset list with sensible defaults per precision (Day: Today / Last 7 days / Last 30 days / etc; Month: This month / YTD / Last 12 months; Year: This year / Last 5 years).
4. **DatePicker rewrite** on `Calendar`. New `precision` option. Backwards compatible — existing `datepicker` configs keep working with `precision` defaulting to `day`.
5. **DateRangePicker rewrite** on `Calendar`. Two-month side-by-side default at day precision. New `presets` and `precision` options. Cross-page anchor persistence.
6. **Field-type aliases** — `monthpicker`, `yearpicker`, `monthrange`, `yearrange` resolve to the same classes with `precision` pre-set.
7. **`dateFns` utility** — narrow date math (parse / format / compare / span counts) at all three precisions. Local-date components only (no UTC offset, DST-safe).
8. **calendar.css** — Bootstrap-tokened styling. Light + dark from day one per `.claude/rules/theming.md`.
9. **FormView + FormBuilder** — pass `precision`, `presets`, `months`, `inline` through `data-field-config`. Easepick-specific helper text removed.
10. **Easepick CDN dependency removed.** No more `cdn.jsdelivr.net/npm/@easepick` runtime fetch.

**Files changed:**
- New: `src/core/forms/inputs/calendar/{Calendar,CalendarPopover,PresetSidebar}.js`, `src/core/forms/inputs/calendar/calendar.css`, `src/core/utils/dateFns.js`
- Rewrite: `src/core/forms/inputs/{DatePicker,DateRangePicker}.js`
- Modified: `src/core/forms/inputs/index.js` (aliases), `src/core/forms/FormBuilder.js` (placeholder render), `src/index.js` (CSS bundle import)
- Tests: `test/unit/{dateFns,Calendar,DatePicker,DateRangePicker}.test.js`, `test/build/no-easepick.test.js`, `test/test-runner.js` (added `not.toBeNull/Defined/Undefined` matchers per `.claude/rules/testing.md`), `test/utils/simple-module-loader.js` (registered new modules)
- Docs: `docs/web-mojo/forms/inputs/{DatePicker,DateRangePicker,README}.md`, `docs/web-mojo/forms/{README,FieldTypes,BasicTypes}.md`, `CHANGELOG.md`
- Examples: `examples/portal/examples/forms/inputs/DatePicker/DatePickerExample.js`
- Mockups: `planning/mockups/datepicker/{index.html,mock.css,mock.js,README.md}`

**Tests run:**
- `node test/test-runner.js` — 614/621 unit tests pass; the 7 failing tests are all pre-existing on main (Modal.alert eyebrow tests for an unimplemented feature, MetricsChart slugs format change). All Calendar / DatePicker / DateRangePicker / dateFns tests pass.
- `npm run build` — clean
- `npm run build:lib` — clean
- `npm run lint` — no new errors (16 pre-existing in WebApp.js)
- `test/build/no-easepick.test.js` — confirms src/, docs/, dist/ all clean of Easepick references

**Validation:**
- Live verification at `http://localhost:3000/examples/portal/?page=forms/inputs/date-picker` — popover opens correctly anchored to trigger, day click commits with displayFormat-rendered text in trigger and YYYY-MM-DD in hidden input.
- Live verification at `?page=forms/inputs/date-range-picker` — two-month layout, range fill across week rows, chevron anchors, cross-page anchor persistence (clicked Apr 15 → paged to May/June → clicked Jun 12 → range "Apr 15, 2026 to Jun 12, 2026" committed correctly).
- Both light and dark themes render cleanly.
- Mockups under `planning/mockups/datepicker/` cover all 9 surfaces with selected variants recorded.

**Agent findings:**
- **test-runner:** 614/621 pass. No new failures. All target suites (Calendar, DatePicker, DateRangePicker, dateFns) green.
- **docs-updater:** Confirmed no remaining Easepick mentions in `docs/`. Added a pointer note from `BasicTypes.md` (HTML5 `<input type="month">`) to the framework-grade `monthpicker` component.
- **security-review:** One info-level finding — `innerHTML` sink in calendar header label. Addressed in commit `c5baba8` by switching to `createElement` + `textContent`. Otherwise clean: no XSS risk (other surfaces use `textContent` or escape via `_attr()` for HTML attributes), no prototype pollution, no DoS, CDN dependency removal verified.

**Out of scope (deferred to follow-up):**
- Phase 3 — TimePicker, TimezoneSelect, DateTimePicker (with TZ slot per locked mockup)
- Phase 4 docs/examples for the time/datetime components
- Type-ahead natural-language input ("next friday")
- Locale packs beyond what `Intl` already provides

