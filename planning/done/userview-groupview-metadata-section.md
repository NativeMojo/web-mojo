# UserView + GroupView — Add Metadata + API Keys Sections

**Type**: bug
**Status**: open
**Date**: 2026-03-28

## Description
Both User and Group models support `metadata` (arbitrary key-value data), but the admin UserView and GroupView do not expose it. Admins should be able to view and edit metadata on these models.

Groups also have API keys (`/api/group/apikey`), and GroupView should have a section to view and manage them.

## Fix
- Add a "Metadata" section to both UserView and GroupView admin screens
- Add an "API Keys" section to GroupView using `/api/group/apikey?group={id}`

## Affected Area
- **Files / classes**: `src/extensions/admin/account/users/UserView.js`, `src/extensions/admin/account/groups/GroupView.js`
- **Layer**: Extension (admin)

## Acceptance Criteria
- [ ] UserView has a Metadata section in the side nav
- [ ] GroupView has a Metadata section in the side nav
- [ ] Admin can view all metadata key-value pairs
- [ ] Admin can edit/add/remove metadata entries
- [ ] Changes save via standard model CRUD
- [ ] GroupView has an API Keys section using `/api/group/apikey?group={id}`
- [ ] Admin can view, create, and revoke group API keys
