---
id:
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
[Constraints, prior decisions, open questions — filled during /scope]

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:
