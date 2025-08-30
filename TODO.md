

## TODO LIST

- [ ] GET FLOWHUB REPORTS
- [ ] We need a Wiki System
- [ ] We need Cloud Push Notifications support
- [ ] Invite User
- [ ] Invite Group Member
- [ ] Metrics Permissions
  - [ ] We need an API to manage metrics permissions
- [ ] User Change Password Flow
- [ ] Admin Change Password Flow
- [ ] User Reset Password Flow
- [ ] LOG pruning and other DB pruning
- [x] LOG ability to ignore api prefix logging
- [ ] Firebase Notification Support
- [x] Forms need to support default value field.default = true
- [x] Table Date Range filter should specify dr_field
- [x] Task, record a TaskLog to have a long running record of tasks, optional **logit** param off by default?
- [ ] Task: webhook support with proper retry
- [x] Fix Chart rendering flow
- [x] Series Chart needs a "refresh button"
- [x] Add Metrics
  - [x] User Activity, check if last_activity is today, else record "user_activity_day"
  - [x] Group Activity, add last_acitivity to group with toucn, record "group_activity"
- [x] Metrics api to fetch totals: when, slug, current total
- [x] Group Selection Flow
  - [x] Sidebar Group Selection
  - [x] Sidebar meny by activeGroup.kind
  - [x] edit admin menu needs to tell sidebar to exit menu instead of changing menu
    logic should check activeGroup and show appropriate menu
- [x] Wire up the proper Refresh Token
- [x] Handle TopNav showing "Login" vs Current User
- [x] Bug: Table is not showing loading
- [x] Table fetch should show error inside table?
- [x] Pre Page load should check page permissions
  - [x] Show not authorized when viewing page without permissions
  - [x] Support sys.PERMISSION vs any permission
- [x] Build Image/PDF Preview View
- [x] Add 404 Page Support
- [x] Better error handling via global EventBus
  - [ ] Collection/Model fetch errors should return EventBus events