# UserView API Keys Section — Wrong API Endpoint + Missing Create

**Type**: bug
**Status**: open
**Date**: 2026-03-28

## Description
The "API Keys" section in the admin UserView has two problems:

1. **Wrong endpoint**: Uses `/api/user/{id}/api_keys` which doesn't exist. Per our architecture, use the standard CRUD API with a filter:
   - `GET /api/account/api_keys?user={id}` — list keys filtered by user
   - `DELETE /api/account/api_keys/{id}` — revoke a key

2. **Missing create capability**: Admin should be able to generate an API key on behalf of a user. The backend provides:
   - `POST /api/auth/manage/generate_api_key` — accepts `uid`, `allowed_ips`, `expire_days`

## Fix
- Change list endpoint to `/api/account/api_keys?user={id}`
- Change delete endpoint to `/api/account/api_keys/{id}`
- Add a "Generate Key" button that calls `POST /api/auth/manage/generate_api_key` with `uid` set to the viewed user
- Show generated token once with copy-to-clipboard (matching `ProfileApiKeysSection.js` pattern)

## Affected Area
- **Files / classes**: `src/extensions/admin/account/users/sections/AdminApiKeysSection.js`, `src/extensions/admin/account/users/UserView.js`
- **Layer**: Extension (admin)

## Acceptance Criteria
- [ ] GET uses `/api/account/api_keys?user={id}`
- [ ] DELETE uses `/api/account/api_keys/{id}`
- [ ] Admin can generate a key for the user via `POST /api/auth/manage/generate_api_key`
- [ ] Generated token displayed once with copy-to-clipboard
- [ ] Revoke works
