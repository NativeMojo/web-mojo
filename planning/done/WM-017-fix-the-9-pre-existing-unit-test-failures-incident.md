---
id: WM-017
type: bug
title: Fix the 9 pre-existing unit test failures (IncidentView stub gap, FileManager inline config, MetricsPermissions Add regression)
priority: P2
effort: S
owner: core
opened: 2026-06-11
depends_on: []
related: []
links: []
---

# Fix the 9 pre-existing unit test failures

## What & Why
`npm run test:unit` has 9 long-standing failures (baseline-verified on main
before WM-016). Three independent causes:

1. **IncidentView suite (7 tests, "ListView is not a constructor")** —
   `src/extensions/admin/incidents/IncidentView.js:24` imports `ListView`
   and constructs it (lines 1441, 1485, 1642), but
   `test/unit/IncidentView.test.js` only stubs `global.TableView`. Test
   wiring drift from the TableView→ListView migration.
2. **FileManagerTablePage convention check (1 test)** —
   `src/extensions/admin/storage/FileManagerTablePage.js:76` still has
   `itemViewClass: FileManagerView` inline; the model-statics convention
   test (`admin-model-statics.test.js`) requires it on the model.
3. **MetricsPermissionsTablePage Add button (1 test)** — `showAdd: true`
   was re-introduced at
   `src/extensions/admin/monitoring/MetricsPermissionsTablePage.js:37`
   with no `formCreate`/`Model.ADD_FORM` wired — a real regression of
   shipped Bug #3 (clicking Add throws). Regression test demands
   `showAdd: false`.

## Acceptance Criteria
- [ ] `npm run test:unit` fully green (no failures).
- [ ] Production fixes, not weakened tests (test-wiring fix only for #1,
      where production code is correct).
- [ ] No new lint errors.

## Repro — bugs only
1. Run `npm run test:unit` on main.
- Expected: all pass.
- Actual: 9 failures (7 IncidentView, FileManagerTablePage inline-config,
  MetricsPermissionsTablePage showAdd).

## Notes
Plan: (1) add a `ListViewStub` to IncidentView.test.js mirroring its
existing `TableViewStub`; (2) move `itemViewClass` to the FileManager
model's `VIEW_CLASS` static (pattern used by sibling pages); (3) restore
`showAdd: false` on MetricsPermissionsTablePage (wiring a real ADD_FORM is
a separate feature decision). The failing tests are themselves the
regression tests — they fail before and must pass after.

## Resolution
- closed: 2026-06-11
- branch: main
- files changed: docs/web-mojo/admin/Admin-Dashboard-Page.md,docs/web-mojo/admin/Admin-Model-Page.md,planning/inbox/tableview-row-context-menu-and-permission-gating.md,src/core/views/feedback/ModalView.js
- tests added: none new — the 9 failing tests were themselves the
  regression tests (IncidentView suite ×7, admin-model-statics
  FileManagerTablePage check, admin-tablepages-bugfixes showAdd check);
  all pass after the fixes. Full suite 1347/1347 green.
