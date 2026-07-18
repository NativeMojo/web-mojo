---
id: WM-036
type: feature
title: "TableView `rowExpand:` — expandable inline detail rows"
priority: P2
effort: M
owner: core
opened: 2026-07-18
depends_on: []
related: [WM-038]
links: []
---

# TableView `rowExpand:` — expandable inline detail rows

## What & Why
Add an opt-in `rowExpand:` option to TableView: a chevron cell toggles an
inline detail row under the data row, rendering author-supplied content for
that row's model. Kills the "open a modal to read one more field" flow for
quick-look cases; complements (does not replace) the `_item` deep-link modal
for full record detail.

## Acceptance Criteria
- [ ] `rowExpand: (model) => string | View` on TableView — string (template)
      or View instance rendered into a full-width detail row
      (`colspan` spanning selection + data + actions columns, mirroring the
      existing colspan handling at `TableView.js:~741`).
- [ ] Chevron toggle cell renders as the first column when `rowExpand` is set;
      `data-action="toggle-expand"` per row; chevron rotates when open.
- [ ] One-at-a-time by default; `rowExpandMultiple: true` allows several open.
- [ ] Expanded state survives a re-render of the same page of rows (e.g.
      pill removal refetch collapses is acceptable — but a pure re-render,
      e.g. selection change, must not collapse). Page change collapses all.
- [ ] View-returning form uses `addChild()` lifecycle correctly (child added
      post-render needs explicit `render()` per ViewChildViews.md — follow
      the documented Dynamic Children pattern).
- [ ] Option absent → zero change (no chevron column, no markup delta).
- [ ] Forwarded through TablePage whitelist + forwarding test assertion.
- [ ] Detail-row surface uses Bootstrap tokens (`var(--bs-tertiary-bg)` or
      similar), light+dark correct from day one.
- [ ] Unit tests: chevron renders per row, toggle expands/collapses, single
      vs multiple mode, colspan math with/without selection column, string vs
      View content, omitted → current markup.
- [ ] Docs: `TableView.md` section; `CHANGELOG.md`.

## Notes
Pre-scoped in the WM-EPIC session (2026-07-18):
- Implementation surface is mostly `TableRow.js` (+ small TableView plumbing) —
  deliberately disjoint from the toolbar work, which is why this runs in epic
  wave 1 in parallel with feedback-states, auto-refresh, and WM-032.
- Reuse the inline-edit precedent in TableRow (`editingCells` state tracking,
  `TableRow.js:34-35`) as the pattern for `expandedRows` state.
- Interaction with row `data-action`/context menus: the chevron cell must not
  trigger row-level click actions (stopPropagation like the `.btn-group`
  guard at `TableRow.js:440`).
- Mockup gate: expanded-row mockup (light+dark) in epic phase 0.

## Resolution
- closed: 2026-07-18
- branch: main
- files changed: .claude/rules/core.md,CHANGELOG.md,CLAUDE.md,docs/web-mojo/components/ContextMenu.md,docs/web-mojo/components/ListView.md,docs/web-mojo/components/ModalView.md,docs/web-mojo/components/TableView.md,docs/web-mojo/core/View.md,docs/web-mojo/examples.md,examples/portal/examples.registry.json,examples/portal/examples/components/TableView/TableViewDayRangeFilterExample.js,examples/portal/examples/components/TableView/TableViewFeedbackStatesExample.js,examples/portal/examples/components/TableView/TableViewFilterPresetsExample.js,examples/portal/examples/components/TableView/TableViewPowerToolsExample.js,examples/portal/examples/components/TableView/TableViewRowExpandExample.js,examples/portal/examples/components/TableView/example.json,examples/portal/scripts/build-registry.js,memory.md,planning/.next_id,planning/confirmed/WM-032-framework-listview-filterpresets-bundle-a-filter-s.md,planning/confirmed/WM-033-listview-tableview-feedback-states-rich-empty-stat.md,planning/confirmed/WM-034-listview-tableview-autorefresh-interval-refetch-wi.md,planning/confirmed/WM-035-tableview-view-persistence-persiststate-column-cho.md,planning/confirmed/WM-036-tableview-rowexpand-expandable-inline-detail-rows.md,planning/confirmed/WM-037-tableview-stats-live-stat-strip-bound-to-collectio.md,planning/confirmed/WM-038-epic-listview-tableview-ux-power-pass-orchestrate-.md,planning/done/WM-031-contextmenu-escape-item-label-href-in-buildmenuite.md,planning/future/menu-link-href-scheme-sanitization.md,planning/future/modalview-escape-footer-buttons-and-title.md,planning/inbox/autorefresh-model-mode-row-feedback.md,planning/inbox/contextmenu-label-html-escaping.md,planning/inbox/listview-tableview-example-coverage-audit.md,planning/mockups/column-chooser/wm-035-column-chooser.html,planning/mockups/feedback-states/wm-033-feedback-states.html,planning/mockups/filter-presets/wm-032-filter-presets.html,planning/mockups/row-expand/wm-036-row-expand.html,planning/mockups/stat-strip/wm-037-stat-strip.html,planning/rejected/WM-030-collection-requiresactivegroup-option-for-tenant-s.md,planning/rejected/bs-subtle-tokens-leak-light-into-dark.md,planning/rejected/user-profile-listview-migration.md,src/core/View.js,src/core/forms/FormBuilder.js,src/core/forms/inputs/ComboInput.js,src/core/forms/inputs/TagInput.js,src/core/pages/TablePage.js,src/core/views/chat/ChatInputView.js,src/core/views/feedback/ContextMenu.js,src/core/views/feedback/ModalView.js,src/core/views/list/ListView.js,src/core/views/table/TableRow.js,src/core/views/table/TableView.js,src/templates.js,test/unit/ContextMenu.test.js,test/unit/ListView.autoRefresh.test.js,test/unit/ListView.feedbackStates.test.js,test/unit/ListView.filterPresets.test.js,test/unit/ListView.interactions.test.js,test/unit/ModalView.test.js,test/unit/TablePage.option-forwarding.test.js,test/unit/TableView.columnChooser.test.js,test/unit/TableView.persistState.test.js,test/unit/TableView.rowExpand.test.js,test/unit/View.renderCoalescing.test.js,test/unit/View.test.js,test/utils/simple-module-loader.js
- tests added: test/unit/TableView.rowExpand.test.js (10 cases)
