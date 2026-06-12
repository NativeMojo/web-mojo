---
id: ITEM-020
type: bug
title: TableView gating never runs — checkPermissions() is a no-op and rowContextMenu (the API consumers use) is unimplemented
priority: P2
effort: M
owner: framework
opened: 2026-06-11
depends_on: []
related: []
links: []
---

# TableView gating never runs — checkPermissions() is a no-op and rowContextMenu (the API consumers use) is unimplemented

Filed from **wmx_portal** (WMX-PORTAL-065, 2026-06-11), found during a security
review there. Two related gaps; together they mean every permission gate a
TablePage consumer writes is silently ignored.

## What & Why

### Part A — `checkPermissions()` is `return true`

TableView's toolbar-button renderer honors a `permissions` key on
`toolbarButtons` entries via `this.checkPermissions(permissions)` — but the
only implementation in the framework is the base-class stub:

    checkPermissions(_permissions) {
      return true;
    }

(verified in dist 2.5.21; e.g. `dist/chunks/ListView-*.js`). Nothing wires it
to `app.activeUser.hasPermission`, and it isn't accepted as an option, so
consumers' `permissions: ['manage_games', 'admin', 'sys.manage_groups']`
arrays render the buttons for everyone. In wmx_portal this exposes
manage-level toolbar actions (catalog sync, "New SAR from Case", "New from
Preset", "Run Report") to view-only operators on 5 pages — backend rejects,
but the affordance is wrong, and the consumer code *looks* gated.

**Expected:** the stub delegates to the active user, e.g.
`return !permissions || !!this.getApp()?.activeUser?.hasPermission?.(permissions)`
(fail-closed when no user), or TableView accepts a checkPermissions option.

### Part B — `rowContextMenu` doesn't exist, but consumers depend on it

wmx_portal has **14 pages** passing `rowContextMenu: [...]` to TablePage /
TableView with a consistent item shape:

    rowContextMenu: [
        {
            label: 'Approve Closure',
            icon: 'bi-person-x',
            permissions: ['manage_privacy', 'admin', 'sys.manage_groups'],
            visible: (m) => m.canApprove(),
            action: async (model, app) => this._approve(model, app)
        }
    ]

No version of web-mojo reads `rowContextMenu` (zero hits in dist; TablePage's
real key is `contextMenu`), so none of those row menus has ever rendered.
The documented `contextMenu` row-menu mechanism is also too weak for these
consumers: items are static `{label, icon, action: '<string>'}` rendered with
`data-action`/`data-id` — no per-row `visible(model)` predicate, no
`permissions` filtering, no callback receiving the model.

The blocked use cases are workflow actions that have NO other UI path:
closure approve/reverse, escheatment confirm/reject, regulatory report
submit/sign-off/withdraw, wallet-rule and package lifecycle, bonus forfeit,
session force-close, promo-redemption reversal, payment-provider
edit/test/rotate. (Inventory with file:line lives in
`wmx_portal/planning/confirmed/WMX-PORTAL-065-*.md`.)

**Requested:** native row-context-menu support matching the de-facto consumer
API — per item: `label`, `icon`, `permissions` (filtered via
`activeUser.hasPermission`, fail-closed), `visible(model)` evaluated per row,
`action` as either a framework string action or a callback invoked with
`(model, app)`; `danger`/`divider` supported as today. Whether it lands under
the `rowContextMenu` name (so existing consumer config just starts working)
or as an enriched `contextMenu` with a documented migration is the
implementer's call — wmx_portal will follow either.

## Acceptance Criteria

- [ ] `toolbarButtons` `permissions` arrays actually filter (fail-closed
      without an active user); covered by a unit test.
- [ ] Row context menus render from consumer config with per-row
      `visible(model)`, per-item `permissions` filtering, and
      model-receiving action callbacks; covered by unit tests.
- [ ] Docs: TableView/TablePage document the row-menu item shape and the
      permission semantics; `permissions` keys that are NOT honored are no
      longer silently accepted anywhere in TableView.
- [ ] CHANGELOG entry; version bump so wmx_portal can pin the fix.

## Repro — bugs only

1. Build any TablePage with `tableViewOptions.toolbarButtons` carrying
   `permissions: ['some_perm']` and a user lacking that perm.
- Expected: button hidden.
- Actual: button renders (checkPermissions stub returns true).
2. Pass `rowContextMenu: [{label: 'X', action: ...}]` to a TablePage.
- Expected (consumer intent): per-row kebab menu.
- Actual: option ignored; no menu renders.

## Notes
**Agreed plan (scoped 2026-06-11, user-approved):**

Verified in source (not just dist): the stub is `ListView.js:2439`
(`checkPermissions(_permissions) { return true; }`), sole call site is the
toolbar-button render loop `ListView.js:566`. TableRow builds row menus from
static `{action, label, icon, disabled, divider, danger}` items
(`TableRow.js:255-305`, `data-action`/`data-id` anchors); nothing reads
`rowContextMenu`. Patterns to copy: ModalView.filterContextMenuItems
(`ModalView.js:359`) — fail-closed `permissions` filter against
`getApp()?.activeUser`; ListView custom toolbar buttons — callback dispatch
via `data-action="custom-toolbar-button"` + `data-button-index`;
`Page.js:83` / `Sidebar.js:697` — canonical activeUser gate.

Changes:
1. `src/core/View.js` — real `checkPermissions(permissions)`: true when no
   permissions; else fail-closed
   `!!(this.getApp?.()?.activeUser?.hasPermission?.(permissions))`.
   Promoted to View so ListView toolbar AND TableRow share it.
2. `src/core/views/list/ListView.js` — delete the stub (inherit View's).
3. `src/core/views/table/TableView.js` — `this.contextMenu =
   options.contextMenu || options.rowContextMenu || null` (alias accepted;
   explicit contextMenu wins).
4. `src/core/pages/TablePage.js` — forward `rowContextMenu` too.
5. `src/core/views/table/TableRow.js` — menu builder: skip items failing
   `this.checkPermissions(item.permissions)`; skip
   `typeof item.visible === 'function' && !item.visible(this.model)`
   (try/catch → hidden + console.warn); function `action` renders
   `data-action="row-context-menu-item" data-menu-index="${originalIndex}"`
   + new `onActionRowContextMenuItem` calling
   `item.action(this.model, this.getApp())`; string actions and
   danger/divider/disabled unchanged (but also filtered); all-items-filtered
   → don't render the kebab toggle.

Decisions: original-array index for callback dispatch (filtering can't shift
indexes — mirrors data-button-index); visible() evaluated at template-build
(rows re-render on model change so it stays fresh); ModalView/DetailView
menus untouched; in-repo consumers (Group/UserTablePage) use static items
with no permissions keys, so nothing breaks internally.

Behavior change to CHANGELOG: fail-closed gating — toolbar buttons/menu items
with `permissions` are now hidden when there is no activeUser (previously
always shown). This is the point of the fix.

Tests (regressions first, must fail pre-fix): toolbar gating
(permitted / unpermitted / no-user / ungated); TableRow permissions filter,
per-row visible(model), callback action receives (model, app),
rowContextMenu alias through TableView + TablePage forwarding, static items
and divider/danger still render, empty-after-filter hides toggle. Harness:
loadModule + getApp() stub with activeUser (TableRow.test.js /
TablePage.batchAction.test.js patterns).

Docs: components/TableView.md (item shape, alias, fail-closed semantics),
pages/TablePage.md, core/View.md (checkPermissions), CHANGELOG.md.
Version: 2.5.22 already pending unreleased — wmx_portal pins it on publish.

## Resolution
- closed: 2026-06-11
- branch: main
- files changed: CHANGELOG.md,docs/web-mojo/README.md,docs/web-mojo/admin/Admin-Dashboard-Page.md,docs/web-mojo/admin/Admin-Model-Page.md,docs/web-mojo/core/Model.md,docs/web-mojo/core/View.md,docs/web-mojo/forms/AutoSave.md,docs/web-mojo/forms/FormView.md,docs/web-mojo/forms/README.md,memory.md,package.json,planning/.next_id,planning/done/ITEM-016-inline-formview-autosave-rerenders-parent-view-and.md,planning/done/ITEM-017-fix-the-9-pre-existing-unit-test-failures-incident.md,planning/done/ITEM-018-write-docs-web-mojo-forms-autosave-md-dangling-lin.md,planning/inbox/tableview-row-context-menu-and-permission-gating.md,src/core/Model.js,src/core/View.js,src/core/forms/FormView.js,src/core/models/index.js,src/core/views/data/DataView.js,src/core/views/feedback/ModalView.js,src/extensions/admin/models/index.js,src/extensions/admin/monitoring/MetricsPermissionsTablePage.js,src/extensions/admin/storage/FileManagerTablePage.js,src/templates.js,src/version.js,test/unit/FormView.autosaveSkipRender.test.js,test/unit/IncidentView.test.js,test/utils/simple-module-loader.js
- tests added: test/unit/TableView.permissionGating.test.js — View.checkPermissions fail-closed semantics (no-perms pass-through, holder allowed, lacker denied, no app / no activeUser denied); ListView toolbar gating (gated button hidden for lacking user + no-user, shown for holder, ungated unaffected); TableRow context menu (permissions filter, per-row visible(model) incl. receives-model and throwing-predicate cases, callback action dispatched with (model, app) via original index, static/divider/danger unchanged, escaping of label/icon/action, empty-after-filter renders no toggle); rowContextMenu alias (TableView, explicit-contextMenu-wins, TablePage forwarding). 13 of 16 failed before the fix; the escaping test also caught TableRow.escapeHtml not being attribute-safe.
