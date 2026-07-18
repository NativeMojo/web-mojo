---
id: WM-034
type: feature
title: "ListView/TableView `autoRefresh:` — interval refetch with smart pause"
priority: P2
effort: S
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-038]
links: []
---

# ListView/TableView `autoRefresh:` — interval refetch with smart pause

## What & Why
Monitoring-flavored admin pages (IncidentTablePage, LogTablePage,
EventTablePage) go stale until a manual reload. Add an opt-in
`autoRefresh: <seconds>` option to ListView (inherited by TableView) that
refetches the collection on an interval, with smart pauses so it never fights
the user.

## Acceptance Criteria
- [ ] `autoRefresh: <seconds>` (number) enables interval refetch via
      `collection.fetch()`; minimum enforced (≥5s) to prevent hammering.
- [ ] Pauses while the tab is blurred/hidden (WebApp already tracks
      focus/blur — `WebApp.js:794-795`; reuse that signal or
      `document.visibilityState`), resumes + immediate refetch on focus.
- [ ] Pauses while the user has an active selection (batch-action mode) or an
      open row context menu / inline cell editor — a refresh mid-selection
      resetting checkboxes is worse than staleness.
- [ ] Timer starts on mount / `onEnter`, fully torn down on unmount/`onExit`
      (no leaked intervals across cached page visits).
- [ ] Refetch preserves current `collection.params` (filters, sort, paging) —
      it is a silent re-fetch, not a reset; no scroll jump.
- [ ] Option absent → zero change (no timer created).
- [ ] Forwarded through TablePage whitelist + forwarding test assertion.
- [ ] Unit tests: timer created/cleared on lifecycle, pause on blur, pause on
      selection, min-interval clamp, params preserved, omitted → no timer.
- [ ] Docs: `ListView.md`/`TableView.md` + `CHANGELOG.md`. Optional small
      "auto-refresh" indicator (subtle spinner/dot) documented if included.

## Notes
Pre-scoped in the WM-EPIC session (2026-07-18):
- Opt-in, default off. Number-of-seconds API (`autoRefresh: 30`); object form
  (`{interval, indicator}`) only if the indicator is included — build phase
  decides, keep minimal.
- Use the collection's own dedup/cancel machinery (`Collection.fetch()`
  already dedups identical in-flight requests) — no extra guard needed.
- Epic wave 1 — lifecycle-only surface, disjoint from toolbar/body work.
- No mockup needed (no meaningful UI beyond optional indicator dot).

## Resolution
- closed: 2026-07-18
- branch: main
- files changed: .claude/rules/core.md,CHANGELOG.md,CLAUDE.md,docs/web-mojo/components/ContextMenu.md,docs/web-mojo/components/ListView.md,docs/web-mojo/components/ModalView.md,docs/web-mojo/components/TableView.md,docs/web-mojo/core/View.md,docs/web-mojo/examples.md,examples/portal/examples.registry.json,examples/portal/examples/components/TableView/TableViewDayRangeFilterExample.js,examples/portal/examples/components/TableView/TableViewFeedbackStatesExample.js,examples/portal/examples/components/TableView/TableViewFilterPresetsExample.js,examples/portal/examples/components/TableView/TableViewPowerToolsExample.js,examples/portal/examples/components/TableView/TableViewRowExpandExample.js,examples/portal/examples/components/TableView/example.json,examples/portal/scripts/build-registry.js,memory.md,planning/.next_id,planning/confirmed/WM-032-framework-listview-filterpresets-bundle-a-filter-s.md,planning/confirmed/WM-033-listview-tableview-feedback-states-rich-empty-stat.md,planning/confirmed/WM-034-listview-tableview-autorefresh-interval-refetch-wi.md,planning/confirmed/WM-035-tableview-view-persistence-persiststate-column-cho.md,planning/confirmed/WM-036-tableview-rowexpand-expandable-inline-detail-rows.md,planning/confirmed/WM-037-tableview-stats-live-stat-strip-bound-to-collectio.md,planning/confirmed/WM-038-epic-listview-tableview-ux-power-pass-orchestrate-.md,planning/done/WM-031-contextmenu-escape-item-label-href-in-buildmenuite.md,planning/future/menu-link-href-scheme-sanitization.md,planning/future/modalview-escape-footer-buttons-and-title.md,planning/inbox/autorefresh-model-mode-row-feedback.md,planning/inbox/contextmenu-label-html-escaping.md,planning/inbox/listview-tableview-example-coverage-audit.md,planning/mockups/column-chooser/wm-035-column-chooser.html,planning/mockups/feedback-states/wm-033-feedback-states.html,planning/mockups/filter-presets/wm-032-filter-presets.html,planning/mockups/row-expand/wm-036-row-expand.html,planning/mockups/stat-strip/wm-037-stat-strip.html,planning/rejected/WM-030-collection-requiresactivegroup-option-for-tenant-s.md,planning/rejected/bs-subtle-tokens-leak-light-into-dark.md,planning/rejected/user-profile-listview-migration.md,src/core/View.js,src/core/forms/FormBuilder.js,src/core/forms/inputs/ComboInput.js,src/core/forms/inputs/TagInput.js,src/core/pages/TablePage.js,src/core/views/chat/ChatInputView.js,src/core/views/feedback/ContextMenu.js,src/core/views/feedback/ModalView.js,src/core/views/list/ListView.js,src/core/views/table/TableRow.js,src/core/views/table/TableView.js,src/templates.js,test/unit/ContextMenu.test.js,test/unit/ListView.autoRefresh.test.js,test/unit/ListView.feedbackStates.test.js,test/unit/ListView.filterPresets.test.js,test/unit/ListView.interactions.test.js,test/unit/ModalView.test.js,test/unit/TablePage.option-forwarding.test.js,test/unit/TableView.columnChooser.test.js,test/unit/TableView.persistState.test.js,test/unit/TableView.rowExpand.test.js,test/unit/View.renderCoalescing.test.js,test/unit/View.test.js,test/utils/simple-module-loader.js
- tests added: test/unit/ListView.autoRefresh.test.js (18 cases incl. indicator)
