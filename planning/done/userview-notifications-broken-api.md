# UserView Notifications Section — Wrong API Endpoint

**Type**: bug
**Status**: open
**Date**: 2026-03-28

## Description
The "Notifications" section in the admin UserView uses non-existent endpoints:

- `GET /api/user/{id}/notification/preferences`
- `POST /api/user/{id}/notification/preferences`

Per our architecture, use the standard CRUD API with a filter:

- `GET /api/account/notification/preferences?user={id}`
- `POST /api/account/notification/preferences` with `user` param or scoped appropriately

## Fix
- Change GET to `/api/account/notification/preferences?user={id}`
- Change POST to include user context in the request
- Verify the preference toggle save works correctly for another user

## Affected Area
- **Files / classes**: `src/extensions/admin/account/users/sections/AdminNotificationsSection.js`, `src/extensions/admin/account/users/UserView.js`
- **Layer**: Extension (admin)

## Acceptance Criteria
- [ ] GET uses `/api/account/notification/preferences?user={id}`
- [ ] POST correctly updates preferences for the target user
- [ ] Toggle grid loads and saves correctly
