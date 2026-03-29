# Admin UserView — Left-Nav Layout with SideNavView Component

**Type**: request
**Status**: open
**Date**: 2026-03-17

## Description
Replace the horizontal `TabView` in the admin `UserView` with a left-nav sidebar layout similar to `UserProfileView`. Instead of duplicating the pattern inline, create a new reusable core component (`SideNavView`) that provides the left-nav + content-panel pattern as a first-class framework primitive. Then refactor `UserView` to use it, keeping all existing tabs (Profile, Permissions, Groups, Events, Logs, Activity, Devices, Locations, Push Devices) as nav sections.

## Context
The `UserProfileView` in `src/extensions/user-profile/views/UserProfileView.js` already implements a polished left-nav pattern with:
- 200px sidebar with nav links, section labels, and icons
- Active state highlighting with accent border
- Content panel that swaps child views on nav click
- Responsive collapse on small screens

The admin `UserView` (`src/extensions/admin/account/users/UserView.js`) currently uses `TabView` with 9 tabs, which overflows on narrow screens. Converting to a left-nav would match the profile style and handle the large tab count much better.

Rather than hardcoding the left-nav layout again, this request proposes a new `SideNavView` core component (similar to `TabView`) that encapsulates:
- Left sidebar navigation with section labels, icons, and grouping
- Content panel that mounts/unmounts child views
- Active state management
- Responsive dropdown fallback (like TabView)

### Decision: New component vs. extending TabView
`TabView` is designed around horizontal tab navigation with Bootstrap tab semantics (nav-tabs, tab-pane, aria roles). Adding a vertical/sidebar mode would require significant conditional logic and break the clean tab abstraction. A dedicated `SideNavView` is the cleaner approach — it can share the same child-view management philosophy as `TabView` but with sidebar-specific markup, styling, and responsive behavior.

### Relevant files
- `src/extensions/user-profile/views/UserProfileView.js` — inline left-nav pattern to extract from
- `src/extensions/admin/account/users/UserView.js` — current TabView-based layout to convert
- `src/core/views/navigation/TabView.js` — sibling component for API reference
- `src/core/View.js` — base class

## Acceptance Criteria
- [ ] New `SideNavView` component at `src/core/views/navigation/SideNavView.js`
  - [ ] Accepts sections config: `{ label, icon, group?, view }` or `{ sectionLabel }` for group headers
  - [ ] Mounts/unmounts child views on section switch (same pattern as TabView)
  - [ ] Left sidebar with nav links, icons, optional group labels
  - [ ] Active state with accent border
  - [ ] Responsive: collapses to dropdown on narrow containers (like TabView)
  - [ ] Emits `section:changed` event
  - [ ] Permission-aware: skips sections the user lacks permission for
  - [ ] Clean Bootstrap 5 styling with scoped CSS
- [ ] Admin `UserView` refactored to use `SideNavView`
  - [ ] All 9 existing tabs preserved as sections
  - [ ] Header with avatar, name, status, and context menu preserved above the nav
  - [ ] Grouped sections (e.g., "Activity" group for Sessions/Devices/Events, "Settings" for Notifications/API Keys/Groups/Permissions)
  - [ ] Same data fetching and action handlers preserved
- [ ] `UserProfileView` can optionally be refactored to use `SideNavView` (follow-up, not required for this request)
- [ ] Framework docs added: `docs/web-mojo/components/SideNavView.md`
- [ ] Build passes (`npm run build:lib`)

## Constraints
- Follow existing `TabView` API conventions where possible (addChild pattern, containerId, permissions check)
- Bootstrap 5.3 + Bootstrap Icons
- Do not break any existing `UserView` functionality (context menu actions, data fetching, tab-specific views)
- Keep the `SideNavView` generic — no admin-specific or user-specific logic in the core component
- Scoped styles (inline `<style>` in template, prefixed class names like `snv-*`)

## Notes
- The `UserProfileView` sidebar is 200px wide — this is a good default but should be configurable
- Section switching should use the same mount/unmount pattern as TabView (not just show/hide)
- Consider whether `SideNavView` should support an optional header slot above the nav (UserView has the avatar header, UserProfileView has the accent bar + header)
- The responsive breakpoint can reuse TabView's approach (ResizeObserver + width calculation)
- Group labels in the nav (like "Activity", "Settings") are purely visual separators, not clickable

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Resolved — YYYY-MM-DD

**Files changed**:
- `src/...`

**Tests run**:
- `npm run ...`

**Docs updated**:
- `docs/...`
- `CHANGELOG.md` (if applicable)

**Validation**:
[How the final behavior was verified]
