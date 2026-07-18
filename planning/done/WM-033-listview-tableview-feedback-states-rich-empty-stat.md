---
id: WM-033
type: feature
title: "ListView/TableView feedback states — rich empty states, loading skeletons, result-count summary"
priority: P2
effort: M
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-038, WM-032]
links: []
---

# ListView/TableView feedback states — rich empty states, loading skeletons, result-count summary

## What & Why
Three small, opt-in feedback-state upgrades that share the ListView body render
path and should be built/tested together:

1. **Rich empty states** — `emptyState: {icon, title, message, action}`.
   Today every table dead-ends at a bare grey `emptyMessage` string
   (`TableView.js:39,376`; `ListView.js:102,355,395`). Two distinct cases
   deserve different treatment:
   - *Truly empty* (no data at all): icon + title + message + optional CTA
     (e.g. "Add your first API key" wired to the existing Add flow).
   - *No matches for current filters* (detectable via `getActiveFilters()`
     returning a non-empty set): "No results match your filters" + a
     **Clear filters** button (reuses `onActionClearAllFilters`).
   This is also the safety net for filter presets (WM-032) — a preset click
   that returns zero rows currently strands the user.
2. **Loading skeletons** — `loadingStyle: 'skeleton'`. Replace spinner-then-pop
   with shimmer rows matching the known `columns` layout (TableView) or card
   silhouettes (ListView). Spinner remains the default.
3. **Result-count summary** — `showResultCount: true`. A "Showing 25 of 1,204"
   line near the filter pills, "· filtered" suffix when filters are active.
   All data already available via `collection.meta` (`count`, `start`, `size`).

## Acceptance Criteria
- [ ] `emptyState:` option on ListView (inherited by TableView): `{icon, title,
      message, action: {label, action}}`; distinguishes truly-empty vs
      filtered-empty (filtered-empty auto-offers Clear filters).
- [ ] Existing `emptyMessage` untouched and remains the fallback when
      `emptyState` is absent — zero behavior change for current pages.
- [ ] `loadingStyle: 'skeleton'` renders shimmer placeholder rows/cards during
      fetch; default (option absent) keeps the current spinner exactly.
- [ ] `showResultCount: true` renders the count line from `collection.meta`;
      absent → nothing rendered.
- [ ] All three forwarded through the TablePage option whitelist
      (`TablePage.js:~85` block) + assertions in
      `test/unit/TablePage.option-forwarding.test.js`.
- [ ] Skeleton + empty-state styling uses Bootstrap tokens only
      (`var(--bs-secondary-bg)` shimmer etc.); correct in light and dark from
      day one per `.claude/rules/theming.md`.
- [ ] Unit tests in `test/unit/` cover: truly-empty vs filtered-empty branch,
      emptyMessage fallback, skeleton renders during `fetch:start` and clears
      on `fetch:end`, count line math, all options omitted → current markup.
- [ ] Docs: `ListView.md` + `TableView.md` sections; `CHANGELOG.md`.

## Notes
Pre-scoped in the WM-EPIC session (2026-07-18):
- Strictly opt-in — every option defaults off; no-option pages get
  byte-identical rendering.
- Empty-state branch detection: `getActiveFilters()` non-empty (after
  stripping `search`? — no: search counts as a filter for this purpose) →
  filtered-empty variant.
- Skeleton row count: `collection.params.size` capped at ~8.
- Hook points: the `emptyMessage` blocks at `ListView.js:355,395` and
  `TableView.js:376`; loading via the existing `fetch:start`/`fetch:end`
  listeners.
- Epic wave 1 (parallel with auto-refresh, row-expand, WM-032 presets) —
  body render path is disjoint from their surfaces except the constructor
  option block (append-only).
- Mockup gate: light+dark mockups of empty states + skeleton approved before
  code (epic phase 0).

## Resolution
- closed: 2026-07-18
- branch: main
- files changed: .claude/rules/core.md,CHANGELOG.md,CLAUDE.md,docs/web-mojo/components/ContextMenu.md,docs/web-mojo/components/ListView.md,docs/web-mojo/components/ModalView.md,docs/web-mojo/components/TableView.md,docs/web-mojo/core/View.md,docs/web-mojo/examples.md,examples/portal/examples.registry.json,examples/portal/examples/components/TableView/TableViewDayRangeFilterExample.js,examples/portal/examples/components/TableView/TableViewFeedbackStatesExample.js,examples/portal/examples/components/TableView/TableViewFilterPresetsExample.js,examples/portal/examples/components/TableView/TableViewPowerToolsExample.js,examples/portal/examples/components/TableView/TableViewRowExpandExample.js,examples/portal/examples/components/TableView/example.json,examples/portal/scripts/build-registry.js,memory.md,planning/.next_id,planning/confirmed/WM-032-framework-listview-filterpresets-bundle-a-filter-s.md,planning/confirmed/WM-033-listview-tableview-feedback-states-rich-empty-stat.md,planning/confirmed/WM-034-listview-tableview-autorefresh-interval-refetch-wi.md,planning/confirmed/WM-035-tableview-view-persistence-persiststate-column-cho.md,planning/confirmed/WM-036-tableview-rowexpand-expandable-inline-detail-rows.md,planning/confirmed/WM-037-tableview-stats-live-stat-strip-bound-to-collectio.md,planning/confirmed/WM-038-epic-listview-tableview-ux-power-pass-orchestrate-.md,planning/done/WM-031-contextmenu-escape-item-label-href-in-buildmenuite.md,planning/future/menu-link-href-scheme-sanitization.md,planning/future/modalview-escape-footer-buttons-and-title.md,planning/inbox/autorefresh-model-mode-row-feedback.md,planning/inbox/contextmenu-label-html-escaping.md,planning/inbox/listview-tableview-example-coverage-audit.md,planning/mockups/column-chooser/wm-035-column-chooser.html,planning/mockups/feedback-states/wm-033-feedback-states.html,planning/mockups/filter-presets/wm-032-filter-presets.html,planning/mockups/row-expand/wm-036-row-expand.html,planning/mockups/stat-strip/wm-037-stat-strip.html,planning/rejected/WM-030-collection-requiresactivegroup-option-for-tenant-s.md,planning/rejected/bs-subtle-tokens-leak-light-into-dark.md,planning/rejected/user-profile-listview-migration.md,src/core/View.js,src/core/forms/FormBuilder.js,src/core/forms/inputs/ComboInput.js,src/core/forms/inputs/TagInput.js,src/core/pages/TablePage.js,src/core/views/chat/ChatInputView.js,src/core/views/feedback/ContextMenu.js,src/core/views/feedback/ModalView.js,src/core/views/list/ListView.js,src/core/views/table/TableRow.js,src/core/views/table/TableView.js,src/templates.js,test/unit/ContextMenu.test.js,test/unit/ListView.autoRefresh.test.js,test/unit/ListView.feedbackStates.test.js,test/unit/ListView.filterPresets.test.js,test/unit/ListView.interactions.test.js,test/unit/ModalView.test.js,test/unit/TablePage.option-forwarding.test.js,test/unit/TableView.columnChooser.test.js,test/unit/TableView.persistState.test.js,test/unit/TableView.rowExpand.test.js,test/unit/View.renderCoalescing.test.js,test/unit/View.test.js,test/utils/simple-module-loader.js
- tests added: test/unit/ListView.feedbackStates.test.js (17+ cases; skeleton-default flip covered)
