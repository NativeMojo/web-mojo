---
id: WM-035
type: feature
title: "TableView view persistence (`persistState:`) + column chooser (`columnChooser:`)"
priority: P2
effort: M
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-038, WM-032]
links: []
---

# TableView view persistence (`persistState:`) + column chooser (`columnChooser:`)

## What & Why
Two features sharing one storage mechanism, built together:

1. **View persistence** — `persistState: true`. The table remembers how each
   user likes it: sort, page size, day-range choice, active filters — stored
   in `localStorage` per table identity, restored on visit. TablePage URL sync
   covers *sharing* a view; this covers *returning* to one.
2. **Column chooser** — `columnChooser: true`. A "Columns" toolbar dropdown
   with checkboxes to show/hide columns; choices persist via the same
   mechanism. EventTablePage's very wide table is the driving case.

## Acceptance Criteria
- [ ] `persistState: true` on TableView/ListView saves sort, `size`, day-range
      value, and filter params to `localStorage` keyed by a stable table
      identity (explicit `persistKey:` option, falling back to page route +
      endpoint).
- [ ] Restore precedence is **URL > saved state > configured defaults** —
      an explicit URL (shared link) always wins; saved state fills in only
      when the URL carries no params.
- [ ] `columnChooser: true` renders a toolbar "Columns" dropdown; column
      configs may mark `hideable: false` (always shown, e.g. the id/actions
      columns); hidden columns persist iff `persistState` is on.
- [ ] Hiding a column never mutates the caller's `columns` config array —
      visibility is view-state, not config.
- [ ] Clear path back to defaults (a "Reset" entry in the chooser dropdown /
      a `clearPersistedState()` method).
- [ ] Both options absent → zero change; no localStorage reads or writes at
      all.
- [ ] Forwarded through TablePage whitelist + forwarding test assertions.
- [ ] Chooser styling: Bootstrap dropdown with token colors, light+dark.
- [ ] Unit tests: save/restore round-trip, URL-wins precedence, persistKey
      fallback identity, hideable:false enforced, no-option → no storage
      access, reset clears.
- [ ] Docs: `TableView.md` + `TablePage.md` sections; `CHANGELOG.md`.

## Notes
Pre-scoped in the WM-EPIC session (2026-07-18):
- Strictly opt-in; the storage layer must be lazily touched only when
  `persistState` is set (privacy + zero side effects otherwise).
- localStorage schema versioned (`{v: 1, ...}`) so future shape changes can
  invalidate cleanly; corrupt/stale entries are discarded silently.
- Interaction with WM-032 presets: preset-applied filter params persist like
  any other params; active-preset highlight is derived (param matching), so
  restore just works.
- **Epic wave 2 (sequential):** persistence lands first, chooser builds on it.
  Both touch the toolbar — do not parallelize with each other or run this
  wave concurrently with wave-1 toolbar work (WM-032).
- Mockup gate: chooser dropdown mockup (light+dark) in epic phase 0.

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:
