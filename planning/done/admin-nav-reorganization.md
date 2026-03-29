# Admin Left Nav Reorganization

**Type**: request
**Status**: resolved
**Date**: 2026-03-28

## Description
Restructure the admin portal left nav menu: unify security pages, promote daily-use pages to top-level, kill the 1-child AWS group, and dissolve the old "Security" junk drawer.

## What Was Done
- Menu restructured: Dashboard, Users, Groups, Jobs as top-level items
- Security group unified — absorbed Incidents & Tickets into one coherent group with new firewall/bouncer pages
- Email group renamed from "Email Admin"
- System group created — absorbs Logs, API Keys, User Devices, Device Locations, Metrics Permissions, Settings, CloudWatch
- AWS group killed — CloudWatch moved to System
- Dead code deleted: TaskManagementPage.js, TaskDetailsView.js, RunnerDetailsView.js
- All new security pages registered: BlockedIPs, FirewallLog, BouncerSignals, BouncerDevices, BotSignatures
- All new security views created: BouncerDeviceView, BouncerSignalView, HandlerBuilderView
- Bouncer models created: BouncerDevice, BouncerSignal, BouncerSignature

---

## Resolution
**Status**: Resolved — 2026-03-29

**Files changed**:
- `src/admin.js` — full menu restructure, new page registrations, permission name updates
- `src/extensions/admin/index.js` — export new components
- `src/core/models/Bouncer.js` — new models
- `src/extensions/admin/security/BlockedIPsTablePage.js` — new
- `src/extensions/admin/security/FirewallLogTablePage.js` — new
- `src/extensions/admin/security/BouncerSignalTablePage.js` — new
- `src/extensions/admin/security/BouncerDeviceTablePage.js` — new
- `src/extensions/admin/security/BotSignatureTablePage.js` — new
- `src/extensions/admin/security/BouncerDeviceView.js` — new
- `src/extensions/admin/security/BouncerSignalView.js` — new
- `src/extensions/admin/security/HandlerBuilderView.js` — new

**Validation**:
- All existing pages still accessible at their routes
- Menu structure verified in Chrome
