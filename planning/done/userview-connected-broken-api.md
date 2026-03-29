# UserView Connected Section — Wrong API Endpoint + Unclear Label

**Type**: bug
**Status**: open
**Date**: 2026-03-28

## Description
The "Connected" section in the admin UserView uses a non-existent endpoint (`/api/user/{id}/oauth_connection`). Per our architecture, there are no special admin endpoints — the standard CRUD API handles access via permissions. The correct call is:

- `GET /api/account/oauth_connection?user={id}` — filter by user ID, permissions grant admin access
- `DELETE /api/account/oauth_connection/{id}` — standard delete, permissions handle authorization

The section label "Connected" is also vague — should clearly say what it shows.

## Fix
- Change `AdminConnectedSection.js` to use `/api/account/oauth_connection?user={id}` instead of `/api/user/{id}/oauth_connection`
- Change DELETE to use `/api/account/oauth_connection/{id}`
- Rename section label from "Connected" to something clearer (e.g., "OAuth Accounts" or "Linked Providers")

## Affected Area
- **Files / classes**: `src/extensions/admin/account/users/sections/AdminConnectedSection.js`, `src/extensions/admin/account/users/UserView.js`
- **Layer**: Extension (admin)

## Acceptance Criteria
- [ ] GET uses `/api/account/oauth_connection?user={id}`
- [ ] DELETE uses `/api/account/oauth_connection/{id}`
- [ ] Section label is clear
- [ ] List and unlink both work for admin viewing another user
