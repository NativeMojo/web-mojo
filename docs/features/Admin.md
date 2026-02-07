# Admin Extension (Built-in Admin Views & Pages)

MOJO ships with a set of **pre-built admin pages and views** under the `admin` extension. These are designed to be dropped into your app’s routing/navigation and used as-is, while still allowing you to subclass/extend when needed.

This guide documents what is currently available and how you should import it in production.

---

## Importing Admin Components (Production)

The admin extension is published as its own entrypoint:

- Entry export: `web-mojo/admin` (per `package.json` `"exports": { "./admin": ... }`)

In production app code, import admin pages/views from `web-mojo/admin`.

---

## Available Admin Pages & Views (Exported)

The following are exported from the admin entrypoint. Import them like:

```/dev/null/example.js#L1-26
import {
  // Pages
  AdminDashboardPage,
  UserTablePage,
  MemberTablePage,
  GroupTablePage,
  UserDeviceTablePage,
  UserDeviceLocationTablePage,
  GeoLocatedIPTablePage,

  IncidentDashboardPage,
  IncidentTablePage,
  EventTablePage,
  TicketTablePage,
  RuleSetTablePage,

  EmailDomainTablePage,
  EmailMailboxTablePage,
  EmailTemplateTablePage,
  SentMessageTablePage,

  PhoneNumberTablePage,
  SMSTablePage,

  PushDashboardPage,
  PushConfigTablePage,
  PushTemplateTablePage,
  PushDeliveryTablePage,
  PushDeviceTablePage,

  JobsAdminPage,
  TaskManagementPage,

  LogTablePage,
  MetricsPermissionsTablePage,

  FileManagerTablePage,
  FileTablePage,
  S3BucketTablePage,

  // Views
  DeviceView,
  GeoIPView,
  GroupView,
  MemberView,
  UserView,

  IncidentView,
  EventView,
  TicketView,
  RuleSetView,

  EmailTemplateView,
  EmailView,
  PhoneNumberView,
  PushDeliveryView,
  PushDeviceView,

  JobDetailsView,
  JobHealthView,
  JobStatsView,
  RunnerDetailsView,
  TaskDetailsView,

  LogView,
  MetricsPermissionsView,

  FileView
} from 'web-mojo/admin';
```

Notes:
- Prefer importing from `web-mojo/admin` rather than deep-importing internal `src/...` paths.
- This document intentionally lists **admin pages and admin views only** (not non-admin passthrough exports like `WebApp` or version constants).

---

## Convenience Helpers (Open Details in a Dialog)

Some admin views provide a static `show(...)` helper to make it easy to open that view in a `Dialog` without wiring the dialog yourself. These are intended as simple “one-liner” integrations.

### GeoIPView.show(ip)

Looks up geolocation data for an IP and opens the details view in a dialog.

```/dev/null/example.js#L1-12
import { GeoIPView } from 'web-mojo/admin';

await GeoIPView.show('8.8.8.8');
```

### DeviceView.show(duid)

Looks up a user device by DUID and opens the device details view in a dialog.

```/dev/null/example.js#L1-12
import { DeviceView } from 'web-mojo/admin';

await DeviceView.show('device-duid-here');
```

### JobDetailsView.show(job, options?)

Opens a job details view in a dialog. Useful when you already have a `Job` model instance.

```/dev/null/example.js#L1-18
import { JobDetailsView } from 'web-mojo/admin';

await JobDetailsView.show(job, {
  // Optional Dialog options override
  size: 'xl',
  scrollable: true
});
```

### RunnerDetailsView.show(runner, options?)

Opens runner details in a dialog (and may include action buttons depending on runner status).

```/dev/null/example.js#L1-14
import { RunnerDetailsView } from 'web-mojo/admin';

await RunnerDetailsView.show(runner);
```

### TaskDetailsView.show(task, options?)

Opens task details in a dialog (and may include action buttons depending on task status).

```/dev/null/example.js#L1-14
import { TaskDetailsView } from 'web-mojo/admin';

await TaskDetailsView.show(task);
```

---

## Pages (Routing-level)

### Account
- `AdminDashboardPage`
- `UserTablePage`
- `MemberTablePage`
- `GroupTablePage`
- `UserDeviceTablePage`
- `UserDeviceLocationTablePage`
- `GeoLocatedIPTablePage`

### Incidents
- `IncidentDashboardPage`
- `IncidentTablePage`
- `EventTablePage`
- `TicketTablePage`
- `RuleSetTablePage`

### Messaging (Email)
- `EmailDomainTablePage`
- `EmailMailboxTablePage`
- `EmailTemplateTablePage`
- `SentMessageTablePage`

### Messaging (SMS)
- `PhoneNumberTablePage`
- `SMSTablePage`

### Messaging (Push)
- `PushDashboardPage`
- `PushConfigTablePage`
- `PushTemplateTablePage`
- `PushDeliveryTablePage`
- `PushDeviceTablePage`

### Jobs
- `JobsAdminPage`
- `TaskManagementPage`

### Monitoring
- `LogTablePage`
- `MetricsPermissionsTablePage`

### Storage
- `FileManagerTablePage`
- `FileTablePage`
- `S3BucketTablePage`

---

## Views (Composable UI components)

### Account
- `DeviceView`
- `GeoIPView`
- `GroupView`
- `MemberView`
- `UserView`

### Incidents
- `IncidentView`
- `EventView`
- `TicketView`
- `RuleSetView`

### Messaging (Email)
- `EmailTemplateView`
- `EmailView`

### Messaging (SMS)
- `PhoneNumberView`

### Messaging (Push)
- `PushDeliveryView`
- `PushDeviceView`

### Jobs
- `JobDetailsView`
- `JobHealthView`
- `JobStatsView`
- `RunnerDetailsView`
- `TaskDetailsView`

### Monitoring
- `LogView`
- `MetricsPermissionsView`

### Storage
- `FileView`

---

## Typical Usage in an App (Routing)

The exact routing API depends on your app, but the general pattern is:

```/dev/null/example.js#L1-24
import { AdminDashboardPage, UserTablePage } from 'web-mojo/admin';

// Example pseudo-router registration
router.register('/admin', AdminDashboardPage);
router.register('/admin/users', UserTablePage);
```

---

## Best Practices

- Keep admin pages and views under `src/admin` in your application code if you’re building app-specific admin UIs.
- Use the built-in extension pages/views first; subclass only when you need custom behavior.
- Avoid deep imports to internal `src/extensions/admin/...` paths in production app code—prefer `import { ... } from 'web-mojo/admin'`.