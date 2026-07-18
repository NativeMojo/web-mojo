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
- Ian (2026-07-18): the Columns toolbar button is **icon-only**
  (`bi-layout-three-columns`, title tooltip); its text label renders only on
  really wide displays (`d-none d-xxl-inline`). Mockup updated to match.

## Resolution
- closed: 2026-07-18
- branch: main
- files changed: .claude/rules/core.md,CHANGELOG.md,CLAUDE.md,docs/web-mojo/components/ContextMenu.md,docs/web-mojo/components/ListView.md,docs/web-mojo/components/ModalView.md,docs/web-mojo/components/TableView.md,docs/web-mojo/core/View.md,docs/web-mojo/examples.md,examples/portal/examples.registry.json,examples/portal/examples/components/TableView/TableViewDayRangeFilterExample.js,examples/portal/examples/components/TableView/TableViewFeedbackStatesExample.js,examples/portal/examples/components/TableView/TableViewFilterPresetsExample.js,examples/portal/examples/components/TableView/TableViewPowerToolsExample.js,examples/portal/examples/components/TableView/TableViewRowExpandExample.js,examples/portal/examples/components/TableView/example.json,examples/portal/scripts/build-registry.js,memory.md,planning/.next_id,planning/confirmed/WM-032-framework-listview-filterpresets-bundle-a-filter-s.md,planning/confirmed/WM-033-listview-tableview-feedback-states-rich-empty-stat.md,planning/confirmed/WM-034-listview-tableview-autorefresh-interval-refetch-wi.md,planning/confirmed/WM-035-tableview-view-persistence-persiststate-column-cho.md,planning/confirmed/WM-036-tableview-rowexpand-expandable-inline-detail-rows.md,planning/confirmed/WM-037-tableview-stats-live-stat-strip-bound-to-collectio.md,planning/confirmed/WM-038-epic-listview-tableview-ux-power-pass-orchestrate-.md,planning/done/WM-031-contextmenu-escape-item-label-href-in-buildmenuite.md,planning/future/menu-link-href-scheme-sanitization.md,planning/future/modalview-escape-footer-buttons-and-title.md,planning/inbox/autorefresh-model-mode-row-feedback.md,planning/inbox/contextmenu-label-html-escaping.md,planning/inbox/listview-tableview-example-coverage-audit.md,planning/mockups/column-chooser/wm-035-column-chooser.html,planning/mockups/feedback-states/wm-033-feedback-states.html,planning/mockups/filter-presets/wm-032-filter-presets.html,planning/mockups/row-expand/wm-036-row-expand.html,planning/mockups/stat-strip/wm-037-stat-strip.html,planning/rejected/WM-030-collection-requiresactivegroup-option-for-tenant-s.md,planning/rejected/bs-subtle-tokens-leak-light-into-dark.md,planning/rejected/user-profile-listview-migration.md,src/core/View.js,src/core/forms/FormBuilder.js,src/core/forms/inputs/ComboInput.js,src/core/forms/inputs/TagInput.js,src/core/pages/TablePage.js,src/core/views/chat/ChatInputView.js,src/core/views/feedback/ContextMenu.js,src/core/views/feedback/ModalView.js,src/core/views/list/ListView.js,src/core/views/table/TableRow.js,src/core/views/table/TableView.js,src/templates.js,test/unit/ContextMenu.test.js,test/unit/ListView.autoRefresh.test.js,test/unit/ListView.feedbackStates.test.js,test/unit/ListView.filterPresets.test.js,test/unit/ListView.interactions.test.js,test/unit/ModalView.test.js,test/unit/TablePage.option-forwarding.test.js,test/unit/TableView.columnChooser.test.js,test/unit/TableView.persistState.test.js,test/unit/TableView.rowExpand.test.js,test/unit/View.renderCoalescing.test.js,test/unit/View.test.js,test/utils/simple-module-loader.js
- tests added: test/unit/TableView.persistState.test.js (10), test/unit/TableView.columnChooser.test.js (9)
