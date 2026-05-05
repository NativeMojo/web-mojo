# DatePicker Rebuild — static mockups

Self-contained visual prototype for the DatePicker rebuild request
([`planning/requests/date-picker-rebuild.md`](../../requests/date-picker-rebuild.md)).
Open `index.html` in any browser — no build step, no backend, no framework
beyond Bootstrap 5.3 (loaded from CDN). All data is fake and frozen to
the session's "today" of 2026-05-04.

## What this is for

Communicate the **picker engine, range UX, precision drill-down, and
theming** before we start writing framework code. Once a winning variant
is selected per surface (table at the bottom of this file), the build
follows the file-by-file plan in the request.

**No `src/` changes are made until the selections table is filled in.**

## Aesthetic direction

- **Refined, not maximal.** Small surfaces, generous whitespace, tabular
  numerals, distinctive type pairing: Fraunces (display) + Inter Tight (UI)
  + JetBrains Mono (numerals).
- **Bootstrap-tokened.** Every surface uses `var(--bs-*)`. Both light and
  dark themes work from day one — toggle in the topbar.
- **Easepick is the floor for range, not the ceiling.** Variant A of the
  Day-range surface is a faithful clone of the Easepick range picker
  the user called out as "best in class": continuous range fill across
  week rows, solid-primary anchor cells with inward chevrons, floating
  "N days" tooltip, today as a text-color shift only, blank leading
  cells (no out-of-month spillover).
- **Drill-down zoom IS the precision system.** The same `Calendar` view
  renders day-grid / month-grid / year-grid, with the header label
  zooming out one level. `precision: 'day' | 'month' | 'year'` is just
  "which view does selection commit at?"

## Surfaces & variants

Each surface presents 2–3 variants. Sidebar in `index.html` switches
between them; the variant viewport reloads on click. Theme toggle is
top-right.

| # | Surface | Variants |
|---|---|---|
| 1 | **Day · single value** | A) Stripe popover · B) Linear inline · C) Notion type-ahead |
| 2 | **Day · range** *(priority)* | A) Easepick clone · B) Stripe presets + two months · C) Linear condensed |
| 3 | **Month · single value** | A) Tile grid · B) Wheel columns |
| 4 | **Month · range** | A) Two-year frames · B) Presets |
| 5 | **Year · single value** | A) Decade grid · B) Scroll list |
| 6 | **Year · range** | A) Two decades · B) Single decade |
| 7 | **Time** (HH:MM) | A) Wheel columns · B) Stepper buttons · C) Type-ahead |
| 8 | **Time + timezone** | A) Stacked · B) Side-by-side |
| 9 | **Date + Time combined** | A) Calendar + strip · B) Tabs |

## Tradeoffs (read before picking)

### 1. Day · single

| | Pros | Cons |
|---|---|---|
| **A · Stripe popover** | Closest to existing behavior; smallest popover | Plain |
| **B · Linear inline** | Always visible; quick-action chips speed up "today / +1 week" | Takes form real estate |
| **C · Notion type-ahead** | Power users land in 1 keystroke; "next friday" works | Parser is non-trivial; failure modes can confuse |

### 2. Day · range *(the important one)*

| | Pros | Cons |
|---|---|---|
| **A · Easepick clone** | Matches the screenshot the user attached; chevrons are the signature detail; smallest footprint | No presets — every range is a custom pick |
| **B · Stripe presets** | Preset-first reduces clicks for common ranges (Last 30 days, This month); two-month view; explicit From/To inputs | Larger popover; can feel heavy for casual filter use |
| **C · Linear condensed** | Two text inputs above + relative chips + 1 month; very compact | Range fill less satisfying on a single month; chips are a separate model from presets |

**Recommendation:** ship A for the trigger-popover default, B as an opt-in via `presets: 'default' \| [...]`. C is appealing only when popover space is severely constrained.

> **Cross-page range selection (applies to all variants).** Clicking a start anchor holds it in state. The user can page ‹/› to any future or past month and commit the end cell there — the anchor is not lost on navigation. Hover preview tints every visible cell up to the cursor even when the anchor is off-screen, and the "N days" tooltip updates against the persisted anchor. Variant A's single-month footprint does not penalize multi-month ranges — it just means the user pages once or twice. Backwards selection (later cell first, then earlier) auto-swaps on commit. Escape clears the in-progress anchor.

### 3. Month · single

| | Pros | Cons |
|---|---|---|
| **A · Tile grid** | Same engine as day-grid; year header drills out; unified interaction model | None notable |
| **B · Wheel columns** | Touch-friendly; very compact | Two-step (month then year); poor on desktop |

**Recommendation:** A. The drill-down is the entire point of the rebuild — wheels break the pattern.

### 4. Month · range

| | Pros | Cons |
|---|---|---|
| **A · Two-year frames** | Easepick-pattern lifted to month precision; visually consistent with day-range; spans year boundaries cleanly | Wider footprint |
| **B · Presets** | Most month-range use cases are reports (YTD, Last 12 months) — presets ARE the answer | Custom range still needs a calendar; combine with A |

**Recommendation:** ship A as the engine, expose presets as in B via the same `presets` option used by Day-range. They're complementary, not competing.

### 5. Year · single

| | Pros | Cons |
|---|---|---|
| **A · Decade grid** | Matches month-tile-grid aesthetic; same drill pattern | Decade pagination needed for far-back years |
| **B · Scroll list** | Better for wide ranges (birth date — 80 years back) | Harder to scan; less aesthetic |

**Recommendation:** A by default; B available via `yearScrollMode: true` for date-of-birth use cases.

### 6. Year · range

| | Pros | Cons |
|---|---|---|
| **A · Two decades** | Consistent with day/month range patterns | Most year-ranges are short (1–5 years) so two decades is overkill |
| **B · Single decade** | Smaller footprint; from/to inputs handle the cross-decade case | Cross-decade selection requires nav clicks |

**Recommendation:** B by default; A when `yearRangeSpan > 10` configured.

### 7. Time (HH:MM)

| | Pros | Cons |
|---|---|---|
| **A · Wheel columns** | Touch-native | Wheel scroll on desktop is fiddly; needs typing fallback |
| **B · Stepper buttons** | Most desktop-native; click value to type | Slow to traverse far times without typing |
| **C · Type-ahead** | Fastest for keyboard users; "2:30 pm" parses to 14:30 | Less discoverable; no visual mental model |

**Recommendation:** B as default UI; allow direct numeric typing in the value (combines B + the keyboard half of C). A is a touch-mode fallback (`mobileMode: true`). C-only is too aggressive for casual users.

### 8. Time + timezone

| | Pros | Cons |
|---|---|---|
| **A · Stacked** | Reads top-to-bottom; safe default | Timezone takes equal real-estate even when user rarely changes it |
| **B · Side-by-side** | Faster scan when picking a non-local timezone; surfaces the list | Wider popover; timezone list may dominate |

**Recommendation:** A. Most use cases default to user's local TZ via `Intl.DateTimeFormat().resolvedOptions().timeZone`; the combobox is sufficient. B for scheduling-for-others workflows where TZ choice is the primary act.

### 9. Date + Time (+ Timezone) combined

`datetimepicker` with a `timezone: false | true | string[]` option. When `true`, the TZ slot is part of the picker — not a separate field. Both variants render TZ inside the popover; field type stays single (`datetimepicker`), not three.

| | Pros | Cons |
|---|---|---|
| **A · Calendar + strip** | Date / Time / TZ all visible at once; calendar on left, time strip on right with TZ combobox stacked below; no mode switch | Wider popover |
| **B · Tabs** | Compact; Date / Time / Timezone as three tabs in one popover | Mode switch hides the other two while editing one |

**Recommendation:** A. Tabs add a switch users have to learn; the strip pattern matches what scheduling apps converge on (Cal.com, Linear, Notion). When `timezone: false`, the TZ block in A hides and the strip collapses to time only — same component, same field type.

## Decisions still open

These need user confirmation before mockups lock and `/build` runs:

1. **Day-range default** — Variant A (Easepick clone, no presets) or Variant B (Stripe presets, two months) as the default look-and-feel? Easepick feel is what the user called out as best-in-class; Stripe pattern is more useful for filter/report flows. Could ship A as default and B as `presets: 'default'` opt-in.
2. **Calendar pop direction** — single-month default everywhere, or two-month for ranges? (Mockup variant A uses single, B uses two; need to pick.)
3. **Auto-apply vs Apply button** — Easepick auto-applies on second click. Stripe-style has explicit Apply. Ranges with presets often want auto-apply on preset, manual on custom. Confirm default.
4. **Time picker default** — Wheel (touch-friendly) vs Stepper (desktop-native) vs Type-ahead (keyboard-fastest). Recommendation B.
5. **Type-ahead natural language (Day single C)** — Phase 1 or Phase 5 (deferred)? Recommendation: defer — useful but adds parser complexity that's not blocking the rebuild.

## What is real vs stubbed

| Real | Stubbed |
|---|---|
| Layout, spacing, color, typography, density | All hover-preview interactions (rendered as static state) |
| Light + dark theme rendering | Click handlers (no-op) |
| Range fill + chevron anchors at all three precisions | Type-ahead parser |
| Tooltip positioning | Wheel scrolling (can scroll but doesn't commit) |
| Today marker (frozen to 2026-05-04) | Keyboard navigation |
| Drill-down zoom states (mockups show terminal precision; real engine animates between views) | Min/max constraints |

## User selections — fill before /build

When a variant is chosen for each surface, fill the table below.
**`/build` does not run until every row has a selection.**

| # | Surface | Selected variant | Notes |
|---|---|---|---|
| 1 | Day · single | A | **Recommend A (Stripe popover).** Smallest, closest to existing behavior. B (Linear inline) for forms where the date should always be visible. Defer C (Notion type-ahead) to Phase 5 — parser complexity, not blocking. |
| 2 | Day · range | A | **Recommend A (Easepick clone) as default**, with B (Stripe presets) opt-in via `presets: 'default' \| [...]`. A matches the user's reference screenshot; cross-page anchor persistence means single-month is not penalized for multi-month ranges. C only when popover space is severely constrained. |
| 3 | Month · single | A | **Recommend A (Tile grid).** Same drill-down engine as day-grid; year header zooms out. B (wheels) breaks the unified pattern and is two-step on desktop. |
| 4 | Month · range | A | **Recommend A as the engine, B's presets exposed via the same `presets` option.** They're complementary — most month-range flows want named periods (YTD, Last 12 months) but custom range still uses the calendar. |
| 5 | Year · single | A | **Recommend A (Decade grid) by default**, B (scroll list) available via `yearScrollMode: true` for date-of-birth use cases (~80 years back). |
| 6 | Year · range | B | **Recommend B (Single decade) by default** — most year-ranges are short (1–5 years). A (two decades) when `yearRangeSpan > 10` configured. |
| 7 | Time | B | **Recommend B (Stepper buttons) as default UI**, allowing direct numeric typing into the value (combines B + the keyboard half of C). A (wheels) as touch-mode fallback via `mobileMode: true`. C-only is too aggressive for casual users. |
| 8 | Time + timezone | A | **Recommend A (Stacked).** Most use cases default to local TZ via `Intl.DateTimeFormat().resolvedOptions().timeZone`; combobox is sufficient. B (side-by-side) for scheduling-for-others workflows where TZ choice is the primary act. |
| 9 | Date + Time (+ TZ) | A | **Recommend A (Calendar + strip), TZ stacked below time.** Date / Time / Timezone all visible at once. Single `datetimepicker` field type with `timezone: false \| true \| string[]` — when off, the TZ block hides and the strip collapses to time only. Tabs add a mode switch users have to learn. |

When this table is complete, update the request file's status to
`planned (mockups locked)` and proceed with `/build planning/requests/date-picker-rebuild.md`.

## Files

- `index.html` — variant index + 21 inert templates (one per variant)
- `mock.css` — ~700 lines of tokened styles, light + dark from day one
- `mock.js` — date math, calendar/month/year/wheel/year-scroll/time-list renderers, theme toggle, variant routing
- `README.md` — this file
