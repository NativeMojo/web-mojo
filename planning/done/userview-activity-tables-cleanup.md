# UserView Activity Tables — UX Cleanup

**Type**: bug
**Status**: open
**Date**: 2026-03-28

## Description
The three activity-related sections in the admin UserView (Events, Activity Log, Object Logs) need cleanup:

1. **No section headers**: Each section should have a brief header explaining what it shows:
   - **Events**: Security and account events associated with this user
   - **Activity Log**: API/request activity performed by this user (user-scoped by `uid`)
   - **Object Logs**: System log entries about changes to this user record (model-scoped by `model_name`/`model_id`)

2. **Column labels are generic**: "Category", "Title", "Kind", "Path", "Log" don't give enough context

## Affected Area
- **Files / classes**: `src/extensions/admin/account/users/UserView.js` (lines 202-325 — eventsView, activityView, logsView)
- **Layer**: Extension (admin)

## Acceptance Criteria
- [ ] Each activity section has a visible header/description explaining what data it shows
- [ ] Column labels are clear and meaningful
- [ ] Tables are visually clean and scannable
