# Sidebar Menu Selection Improvements

## Goal

Fix three related issues with how the Sidebar selects which menu to display:

1. **Empty admin/system sidebar on first login** — users without permissions see the admin menu header with no items because menu selection ignores permissions.
2. **Wrong sidebar on pages without a menu match** — homeless pages (e.g. a homepage not in any menu) fall back to the first non-group menu by registration order, which is often `admin` or `system` instead of the user-facing menu.
3. **No way to declare a default menu or override per-page** — `page.sidebarMenu` exists but only fires for homeless pages and is undiscoverable. There is no `defaultMenu` config option.

All three issues share a root cause: **menu selection is route-driven and order-dependent, with no concept of a default or visibility-aware fallback**.

---

## What Exists Today

### Menu selection flow (`Sidebar.js`)

**On construction** (`addMenu`, line 530):
- The first menu registered becomes active. No preference is expressed.

**On `onInit` (line 76-88)**:
- Calls `autoSwitchToMenuForRoute(currentPath)`. If no route is in the URL yet (first login, default route), this returns false and the first-registered menu stays active.

**On route change** (`onRouteChanged`, line 1063-1109):
1. `autoSwitchToMenuForRoute(route)` — iterates all menus in registration order, picks the first whose items contain the route.
2. `page.sidebarMenu` — only checked if step 1 fails (homeless page). Switches to the named menu.
3. First non-group menu fallback — iterates menus, picks the first without `groupKind`.

**Permission filtering** (`processNavItems`, line 807-810):
- Filters items at render time only. A menu with zero visible items is still selectable.

### Files in scope

| File | Role |
|---|---|
| `src/core/views/navigation/Sidebar.js` | All menu selection logic |
| `docs/web-mojo/components/SidebarTopNav.md` | Sidebar documentation |

### Files out of scope

- `PortalApp.js` — calls `sidebar.setActivePage()` defensively but the method doesn't exist on Sidebar; no changes needed there.
- `TopNav.js` — unrelated to this issue.
- `WebApp.js` — emits `page:showing` which Sidebar already listens to; no changes needed.

---

## What Changes

### 1. New `defaultMenu` option on Sidebar

**Constructor** — accept `options.defaultMenu` (string, menu name).

**`addMenu()`** — when setting the initial active menu (line 530), prefer `this.defaultMenu` over "first registered":

```
if (!this.activeMenuName) {
    if (this.defaultMenu && name === this.defaultMenu) {
        this._setActiveMenu(name);
    } else if (!this.defaultMenu) {
        this._setActiveMenu(name);  // current behavior when no default is set
    }
}
```

Also add a post-`initializeMenus` check: if `this.defaultMenu` is set and is a registered menu, ensure it is the active menu after all menus are loaded.

### 2. New resolution order for `onRouteChanged`

Change from:

```
1. autoSwitchToMenuForRoute (route match)
2. page.sidebarMenu (homeless only)
3. first non-group menu
```

To:

```
1. page.sidebarMenu — if the page declares a preferred menu, use it (priority override)
2. autoSwitchToMenuForRoute — route-based match across all menus
3. defaultMenu — configured default, if set
4. first non-group menu with at least one visible item for the current user
5. first non-group menu (current fallback, kept as last resort)
```

Moving `page.sidebarMenu` to step 1 means a page can always pin its sidebar regardless of whether its route appears in a different menu. This is the key behavioral change.

### 3. Visibility-aware fallback helper

Add a private method `_menuHasVisibleItems(menuConfig)` that runs the same permission/group checks as `processNavItems` but short-circuits on the first visible item (returns boolean). Used in step 4 of the new resolution order.

```js
_menuHasVisibleItems(menuConfig) {
    const app = this.getApp();
    const activeUser = app?.activeUser;
    const activeGroup = app?.activeGroup;

    for (const item of menuConfig.items || []) {
        if (item.divider || item.spacer) continue;
        if (item.permissions && (!activeUser || !activeUser.hasPermission(item.permissions))) continue;
        if (item.requiresGroupKind) {
            const kind = activeGroup?._.kind || activeGroup?.kind;
            if (!kind || !this._groupKindMatches(item.requiresGroupKind, kind)) continue;
        }
        return true; // at least one item is visible
    }
    return false;
}
```

### 4. Update `onInit` fallback

After `autoSwitchToMenuForRoute` fails in `onInit`, apply the same fallback chain: `defaultMenu` → first non-group menu with visible items → first non-group menu.

### 5. Update documentation

Update `docs/web-mojo/components/SidebarTopNav.md`:
- Document `defaultMenu` option in the Sidebar constructor options table.
- Update the "Homeless Pages" section to reflect the new resolution order.
- Add a note that `page.sidebarMenu` now takes priority over route-based matching.
- Add a "Menu Selection Order" reference section listing the full chain.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| `page.sidebarMenu` moves to top priority | A page explicitly declaring its sidebar is a stronger signal than a route happening to appear in a menu's item list. This also makes it useful for pages that ARE in a menu but want a different sidebar. |
| `defaultMenu` is a string, not a boolean | Naming the menu explicitly avoids ambiguity when there are multiple non-group menus. |
| Visibility check short-circuits | We only need to know if at least one item is visible, not process the whole list. This keeps fallback fast. |
| Group menus are still skipped in fallback | Group menus require an active group. Falling back to a group menu when no group is set would show the group header with no context. Current behavior (skip group menus in fallback) is correct. |
| Backward compatible | Apps that don't set `defaultMenu` and don't use `page.sidebarMenu` get the same behavior as today (first non-group menu fallback). Only the visibility-aware check is a net-new behavior in that path. |

---

## Edge Cases

| Scenario | Expected behavior |
|---|---|
| `defaultMenu` names a menu that doesn't exist | Warn in console, fall through to first non-group menu. |
| `page.sidebarMenu` names a menu that doesn't exist | Warn in console, fall through to route match → defaultMenu → fallback. |
| All non-group menus have zero visible items | Fall through to the very last resort (first non-group menu, even if empty). The user sees an empty sidebar — this is the same as today but now it's the absolute last option instead of the first. |
| User logs in, gains permissions, navigates | `portal:user-changed` already triggers a re-render. The visibility check runs on each navigation so the correct menu will be selected as permissions change. |
| `page.sidebarMenu` set on a page that IS in a menu | The declared menu wins. The page's route will still highlight the correct item if it exists in that menu. |
| No menus registered at all | No change — sidebar doesn't render. |

---

## Tests / Validation

- Manual: register menus `[admin, default]` where admin items require `admin` permission. Log in as a non-admin user. Verify `default` menu shows, not an empty `admin`.
- Manual: navigate to a homepage not in any menu. Verify the `defaultMenu` shows (if configured) or the first non-group menu with visible items.
- Manual: set `sidebarMenu = 'admin'` on a page that also has its route in the `default` menu. Verify the admin sidebar shows.
- Manual: set `defaultMenu` to a name that doesn't exist. Verify console warning and fallback to first non-group menu.

---

## Docs / Release Impact

- **`docs/web-mojo/components/SidebarTopNav.md`** — update Sidebar options table, homeless pages section, add resolution order reference.
- **`CHANGELOG.md`** — new `defaultMenu` option, `page.sidebarMenu` priority change, visibility-aware fallback.
- **`memory.md`** — note the resolution order change as a key decision.

---

## Open Questions

None — all three issues and the fix are well-defined.

---

## Ready-to-Build Gate

**Ready**
