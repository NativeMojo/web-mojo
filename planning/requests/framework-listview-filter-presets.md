# Framework: ListView `filterPresets:` — bundle a filter set behind a toolbar chip

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | 2026-05-10 |
| Priority | medium |

## Description

Add a `filterPresets:` option to ListView (inherited by TableView and TablePage) that renders a row of clickable toolbar chips, each applying a bundled set of filter parameters to the collection in a single click.

The problem this solves: heavy-filter tables — IncidentTablePage (11+ filters), EventTablePage (13+ filters), LogTablePage (~10), UserTablePage (~7) — give the user no entry points. An admin opening "Events" stares at a wall of filter dropdowns and has to assemble the right combination from scratch every time, even though the same 3-5 queries get run over and over ("errors last 24h", "auth failures", "API errors").

Presets let the page author name those common queries as chips. Click "Errors last 24h" → status, level, daterange all bundle-set in one operation. The URL serializes cleanly. Other filter pills are cleared so the preset is mutually exclusive (or additive — both modes are useful; design decision below).

## Context

Filter presets are not a novel UX pattern — Gmail tabs, Linear views, GitHub issue filters, Sentry saved searches all use the same shape. Every admin tool of any complexity converges on them. WEB-MOJO's TableView has the underlying primitives (`setFilter`, `getActiveFilters`, `applyFilters`) but no first-class UI for bundling them.

Use cases driving this request:

- **IncidentTablePage**: "Open & High priority", "Resolved this week", "Stale > 24h", "Mine".
- **EventTablePage**: "Errors last 24h", "Auth failures", "API errors".
- **LogTablePage**: "Errors", "Auth failures".
- **UserTablePage**: "Inactive 30d+", "No 2FA", "Admins".
- **TicketTablePage**: "Mine", "Unassigned + High priority".

These all share the shape: one toolbar chip, one click, one filter bundle applied. Building the same UI ad-hoc per page is the wrong abstraction; this belongs in the framework.

## Acceptance Criteria

### A. ListView constructor option

Accept a new `filterPresets:` option on `ListView` (inherited by TableView):

```javascript
filterPresets: [
  {
    key: 'errors-24h',                          // stable identifier (URL + state)
    label: 'Errors last 24h',                   // display copy
    icon: 'bi-exclamation-triangle',            // optional Bootstrap icon class
    params: {                                   // filter bundle to apply
      level__gte: 4,
      created__gte: '1d'                        // dayRangeFilter-compatible value, OR a real date
    },
    description: 'High and critical errors...'  // optional tooltip
  },
  // ...
]
```

Behavior:

- Each preset renders as a toolbar chip (Bootstrap `btn-sm btn-outline-secondary` or a tonal pill — pick the existing styling closest to filter pills).
- Click → `setFilter(key, value)` for each entry in `params`, plus `start = 0`, plus refetch.
- The active preset is highlighted (e.g. `btn-primary` while active).
- **Mutual-exclusion mode is the default** — clicking a new preset clears any previously-active preset's filters. Clicking the active preset again clears it (toggle off).
- **Additive mode is an opt-in** — `filterPresets: [...], filterPresetMode: 'additive'` (or the existing pattern allows the author to set this per-preset with `additive: true`). Additive mode adds the preset's params without clearing siblings; user can stack "Errors" + "Auth failures" (though that'd be weird in practice; honor what the author configures).

### B. Active preset state

- After applying a preset, the chip's active-state class is `btn-primary` (or equivalent tonal-on variant).
- A preset is "active" when **every** key/value in its `params` matches the current `collection.params`. Partial matches are not active. This is strict by design — fuzzy matching would lie about state.
- When the user manually edits a filter (via filter pill / Add Filter dropdown), the active-preset state clears automatically because the params no longer match.
- When the user clicks the active preset chip, it toggles off — params in `presetParams` are removed from `collection.params`, the chip returns to inactive state.

### C. URL sync

- The active preset's `key` serializes to a URL param: `?preset=errors-24h`. This is in addition to the underlying filter params (which also serialize per existing TablePage URL sync) — both round-trip cleanly.
- On page load, if `?preset=X` is in the URL AND the matching preset's params are present in `collection.params`, mark the preset active without re-applying (it's already applied).
- If `?preset=X` is in the URL but the params don't match (URL was edited by hand, or the preset definition changed), strip the `?preset=X` param and leave the params alone — don't override user-supplied values.

### D. Token substitution (optional, separate sub-acceptance)

Some presets want dynamic values — "Mine" needs the current user's ID, "Today" needs today's date.

**Recommended behavior:** support a `params` value of `'@me'` that resolves to `this.getApp().activeUser?.id` at apply time. Other tokens (`@today`, `@now`) can be added later if needed.

Alternative: let the author pass a function — `params: () => ({ owner: app.activeUser.id })`. More flexible but harder to URL-serialize. Pick one; build phase decides.

### E. Mobile rendering

- Preset chips must be touch-friendly: ≥40×40 tap target.
- Horizontal scroll on phones if the chip row overflows — common pattern in mobile filter UIs. Use `overflow-x: auto` with `white-space: nowrap`. No wrapping to a second row.
- The day-range segment, search input, filter pills, and preset chips all need to coexist in the toolbar — verify the toolbar layout doesn't break on phones. May need a vertical stack at `sm` and below.

### F. Theme compliance

- All chip backgrounds / borders / hover / active states use Bootstrap tokens (`var(--bs-secondary-bg)`, `var(--bs-primary)` etc.). Light + dark themes auto-track.
- If a `<style>` block is needed, follow the dark-theme rule (`.claude/rules/theming.md`) — pair light defaults with `[data-bs-theme="dark"]` overrides in the same block.

### G. Programmatic API

- `listView.applyPreset(key)` — apply a preset by key.
- `listView.clearPreset()` — clear the active preset (also called by mutual-exclusion mode on any other preset click).
- `listView.getActivePreset()` — returns the active preset's full config object or null.
- Emits `preset:change` event with `{ key, params }` (or `null` for clear) for downstream listeners.

### H. Tests

- Unit: 8+ cases in `test/unit/ListView.filterPresets.test.js`:
  - Renders chip per preset
  - Click applies all params from preset
  - Active state when params match
  - Click active preset clears it
  - Click new preset clears the previous one (mutual-exclusion default)
  - Additive mode preserves siblings
  - URL sync round-trip (`?preset=` in + out)
  - Mismatched URL preset strips itself

### I. Documentation

- New section in `docs/web-mojo/components/ListView.md` — "Filter presets" with full API + example.
- Cross-reference in `docs/web-mojo/components/TableView.md` and `docs/web-mojo/pages/TablePage.md`.
- CHANGELOG entry.

## Investigation

### What exists

- `ListView.setFilter(key, value)` — already implemented; sets a filter param on the collection.
- `ListView.getActiveFilters()` — already implemented; returns the current filter param dictionary.
- `ListView.applyFilters()` — already implemented; refetches with current params.
- Filter pill rendering — already implemented; renders active filter values with × buttons.
- `data-action="apply-filter"` / `data-action="clear-filter"` patterns — already wired in the toolbar.

So the primitives exist; this request adds the UI affordance and bundling on top.

### Constraints

- **Inherited by TableView and TablePage.** Implementation lives on ListView; TableView consumes via inheritance; TablePage forwards the option (see the `dayRangeFilter` forwarding fix from the original sweep — TablePage's option whitelist must include `filterPresets:`).
- **No backend changes.** Pure frontend.
- **Mutual-exclusion is the default.** Additive mode is opt-in. Most consumer use cases want mutual exclusion ("show me errors" vs "show me auth failures" — not both).
- **`@me` token is small surface.** Don't expand to a full templating language. If a preset needs more dynamic logic, the author can use the function form (option E).
- **Theme tokens only.** No hex literals.

### Related files

- `src/core/views/list/ListView.js` — main implementation
- `src/core/views/table/TableView.js` — inherits; may need template hooks
- `src/core/pages/TablePage.js` — add `filterPresets:` to the option-forwarding whitelist (lines 50–107)
- `src/core/css/core.css` or a new `src/core/views/list/filter-presets.css` — chip styling
- `test/unit/ListView.filterPresets.test.js` — new
- `test/unit/TablePage.option-forwarding.test.js` — extend to assert `filterPresets:` forwards
- `docs/web-mojo/components/ListView.md` — new section
- `CHANGELOG.md`

### Endpoints

None.

### Tests required

Per "Tests" above.

### Out of scope

- **Saved searches / user-defined presets.** Presets are author-defined per page. Letting end users save their own queries is a different (much larger) feature.
- **Filter-preset analytics** (which presets are clicked most). Useful eventually for tuning preset choice; out of scope here.
- **Mobile toolbar reflow** as a framework concern beyond making the chips horizontal-scrollable. If the toolbar needs a full mobile redesign, file separately.
- **A Skill-style "smart" preset** that learns from user behavior. Author-defined only.
- **Token substitution beyond `@me`.** Land `@me`; defer others until a real need.

### Open questions for the build phase

- **Function-form `params` vs. token strings.** Both have tradeoffs. Strings serialize to URLs cleanly; functions are more flexible. Build phase picks one. If both are supported, document the precedence (string wins for URL serialization).
- **Chip vs. tab visual treatment.** Filter pills are subtle (`btn-sm`); presets are a step more visible (top-of-toolbar, primary entry points). They should look different from filter pills so the user doesn't conflate them. Build phase picks the right tier — probably tonal pills slightly larger than filter pills.
- **Where in the toolbar do presets render** — to the left of search, between search and filter, or in a row above? Build phase eyeballs. Recommended: row above the standard filter toolbar, so the preset bar reads as a "common queries" header.
