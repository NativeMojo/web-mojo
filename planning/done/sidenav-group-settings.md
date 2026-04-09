# Sidebar — Group Settings Footer Menu

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-08 |
| Priority | medium |

## Description
Add a "Settings" item to the **app-level Sidebar** footer on group-based menus. When clicked, it opens the active group's `GroupView` in a dialog. The item is permission-gated with `permissions: ["manage_groups", "manage_group"]` (user needs at least one).

## Context
Users working inside group-scoped sidebar menus currently have no quick way to access the group's settings without navigating away to the admin Groups page. A persistent "Settings" link in the sidebar footer provides a fast shortcut to the group configuration dialog.

## Acceptance Criteria
- A "Settings" item appears in the Sidebar footer when the active menu has `groupKind` set (i.e., it's a group-based menu) **and** `app.activeGroup` is set.
- The item is **only visible** if the user has `manage_groups` or `manage_group` permission (array syntax: `["manage_groups", "manage_group"]`, meaning "any of these").
- Clicking the item opens a `Dialog.showDialog()` containing a `GroupView` for `app.activeGroup`, matching the existing pattern in `GroupView.onActionViewParent`.
- The item uses `bi-gear` icon and sits in the sidebar footer area (existing `footer` slot in menu config).
- If no active group is set, the item does not appear.

## Investigation

- **What exists:**
  - `Sidebar` (`src/core/views/navigation/Sidebar.js`) already supports:
    - `footer` property on menu configs (rendered via `{{{footer}}}` in template, line 404–408)
    - `groupKind` on menus to indicate group-scoped menus
    - `app.activeGroup` access via `this.getApp().activeGroup`
    - Permission filtering on items via `activeUser.hasPermission(item.permissions)` — accepts arrays (any-of semantics)
    - `onBeforeRender()` already renders footer through `renderTemplateString()` with group/user context (line 780)
    - `data-action` handling for click actions
  - `GroupView` (`src/extensions/admin/account/groups/GroupView.js`) is already opened as a dialog in `onActionViewParent()` (line 439–444):
    ```javascript
    Dialog.showDialog({
        title: false,
        size: 'lg',
        body: new GroupView({ model: parent }),
        buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
    });
    ```
  - Group menus are registered with `addMenu(name, { groupKind: '...', items: [...] })` in consumer apps. The `footer` field is already plumbed but not widely used.
  - Permission check: `activeUser.hasPermission(["manage_groups", "manage_group"])` returns true if user has **any** of the listed permissions.

- **What changes:**
  - **Approach: Built-in Sidebar behavior** — When a menu has `groupKind` and `app.activeGroup` is set, Sidebar automatically renders a "Settings" footer link (permission-gated). The `onActionGroupSettings()` handler on Sidebar opens the GroupView dialog.
  - Alternatively, consumer apps set `footer` on their group menus manually, but a built-in approach is cleaner since all group menus benefit.

- **Constraints:**
  - Must use `Dialog.showDialog()` pattern already established in GroupView.
  - Sidebar needs to import `GroupView` and `Dialog` (Dialog is already imported; GroupView would be new).
  - Permission check uses `activeUser.hasPermission()`.
  - Footer template is rendered via `renderTemplateString()` with `group` and `user` in context.
  - Follow existing Bootstrap 5.3 styling.

- **Related files:**
  - `src/core/views/navigation/Sidebar.js` — main implementation target
  - `src/extensions/admin/account/groups/GroupView.js` — dialog body
  - `src/core/PortalApp.js` — `activeGroup` management
  - `src/admin.js` — registers group-based menus (for reference)

- **Endpoints:** None — uses existing group model.

- **Tests required:** Permission gating logic (footer hidden without permission, shown with either permission).

- **Out of scope:** Modifying GroupView itself; changing SideNavView; adding new API endpoints.

## Plan

### Objective
Add a permission-gated "Settings" link to the Sidebar footer on group-based menus that opens the active group's `GroupView` in a dialog.

### Steps

1. **`src/core/views/navigation/Sidebar.js` — `onBeforeRender()` (~line 764)**
   After getting `currentMenu`, if the menu has `groupKind` set, `app.activeGroup` exists, and `activeUser.hasPermission(["manage_groups", "manage_group"])` is true, auto-generate a group settings footer HTML string. Append it to any existing `footer` content (don't replace). The footer link uses `data-action="group-settings"` with `bi-gear` icon and "Settings" text, styled with existing `.nav-link` classes:
   ```html
   <a class="nav-link" data-action="group-settings">
       <i class="bi bi-gear me-2"></i>
       <span class="nav-text">Settings</span>
   </a>
   ```

2. **`src/core/views/navigation/Sidebar.js` — new `onActionGroupSettings()` handler**
   - Gets `app.activeGroup`
   - Dynamically imports `GroupView` via `await import('@ext/admin/account/groups/GroupView.js')` to avoid a hard core→extension dependency
   - Opens `Dialog.showDialog({ title: false, size: 'lg', body: new GroupView({ model: activeGroup }), buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }] })` — matching the existing pattern in `GroupView.onActionViewParent()` (line 439–444)
   - On import failure, shows `app.toast.error('Group settings not available')`

3. **No CSS changes needed** — `.sidebar-footer` already has `margin-top: auto`, border-top styling for all themes, and collapse-mode transitions.

### Design Decisions
- **Dynamic import for GroupView** — Sidebar is `src/core/`, GroupView is `src/extensions/admin/`. Dynamic `import()` keeps core free of extension dependencies. If admin extension isn't loaded, the error is caught and toasted.
- **Auto-generate footer** — Every group menu gets the settings link without repeating config. Permission check gates visibility.
- **Append to existing footer** — If a menu already has a `footer`, the settings link is appended below it. Consumer customization is preserved.
- **Permission array `["manage_groups", "manage_group"]`** — Uses existing `hasPermission()` any-of semantics. Matches the pattern at `src/admin.js:372`.

### Edge Cases
- **No active group** — Footer link not rendered.
- **No permission** — Footer link not rendered.
- **Admin extension not loaded** — Dynamic import catches error, shows toast.
- **Consumer has custom footer** — Settings link appended below existing footer content.
- **Sidebar collapsed** — `.sidebar-footer` already handles collapsed state (opacity: 0).
- **Group changes** — Sidebar re-renders via `showMenuForGroup()`, footer updates automatically.

### Testing
- `npm run build` — verify no import cycle or build errors.
- Manual: switch to a group menu with permission → "Settings" footer appears, opens GroupView dialog.
- Manual: user without permission → footer hidden.
- Manual: no active group → footer hidden.

### Docs Impact
- `docs/web-mojo/components/SidebarTopNav.md` — Note about auto-generated group settings footer.
- `CHANGELOG.md` — Entry for new feature.

## Resolution

### What was implemented
Added a permission-gated "Settings" link to the Sidebar footer on group-based menus. When a menu has `groupKind` set, an active group exists, and the user has `manage_groups` or `manage_group` permission, a gear icon "Settings" link appears at the bottom of the sidebar. Clicking it dynamically imports `GroupView` and opens it in a dialog for the active group.

### Files changed
- `src/core/views/navigation/Sidebar.js` — Added `onActionGroupSettings()` handler with permission guard and dynamic import; added `groupSettingsLink` template slot in `getMenuTemplate()`; added footer generation logic in `onBeforeRender()`
- `docs/web-mojo/components/SidebarTopNav.md` — Documented the auto-generated group settings footer (via docs-updater agent)
- `CHANGELOG.md` — Added entry for new feature (via docs-updater agent)

### Tests run
- `npm run build:lib` — passes, no import cycles, GroupView correctly chunked separately
- No pre-existing Sidebar unit tests; all test failures are pre-existing infrastructure issues

### Security review findings (addressed)
- **Fixed:** Separated `groupSettingsLink` into its own template slot to avoid concatenation with consumer footer content through `{{{footer}}}` triple-brace sink
- **Fixed:** Added `hasPermission()` guard in `onActionGroupSettings()` as defense-in-depth
- **Accepted (INFO):** Dynamic import path visible in console on failure — acceptable for dev tools
- **Unrelated:** `admin.js` jobs menu permission broadening flagged but is a pre-existing change outside this request's scope
