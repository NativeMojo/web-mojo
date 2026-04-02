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

  IPSetTablePage,

  CloudWatchDashboardPage,
  CloudWatchChart,

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

  FileView,

  IPSetView,

  AssistantView,

  CloudWatchResourceView
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

### Security
- `IPSetTablePage` — Manage kernel-level IP blocking sets (country blocks, AbuseIPDB feeds, datacenter ranges, custom CIDR lists). Route: `system/security/ipsets`.

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

### AWS
- `CloudWatchDashboardPage`

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

### Security
- `IPSetView` — Detail view for a single IP Set, shown in a dialog when a row is clicked from `IPSetTablePage`.

### Assistant
- `AssistantView` — Main admin assistant interface. Shown inside a fullscreen modal. See [Admin Assistant](#admin-assistant) below.

### AWS
- `CloudWatchChart` — MetricsChart subclass for CloudWatch endpoints
- `CloudWatchResourceView` — Detail view for a single resource (all metrics in a grid)

---

## CloudWatch Dashboard

The `CloudWatchDashboardPage` renders a 2-column grid of `CloudWatchChart` instances, each showing all resources for a given account + category:

```/dev/null/example.js#L1-8
import { CloudWatchDashboardPage } from 'web-mojo/admin';

router.register('/admin/cloudwatch', CloudWatchDashboardPage);
```

### CloudWatchChart

Extends `MetricsChart` for CloudWatch endpoints. Each chart auto-fetches from `/api/aws/cloudwatch/fetch` with the configured `account` (ec2/rds/redis) and `category` (cpu/memory/conns/etc). Inherits all MetricsChart features: granularity selector, date range picker, refresh, loading states.

```/dev/null/example.js#L1-12
import { CloudWatchChart } from 'web-mojo/admin';

const chart = new CloudWatchChart({
    containerId: 'my-container',
    account: 'ec2',
    category: 'cpu',
    title: 'EC2 CPU',
    height: 250,
    yAxis: { label: '%', beginAtZero: true, max: 100 },
    defaultDateRange: '24h'
});
this.addChild(chart);
```

For a single resource, pass `slug`:

```/dev/null/example.js#L1-6
const chart = new CloudWatchChart({
    containerId: 'cpu-chart',
    account: 'rds',
    category: 'cpu',
    slug: 'prod-postgres',
    title: 'RDS CPU — prod-postgres'
});
```

### CloudWatchResourceView

Detail view showing all metric categories for one resource. Open via the static `show()` helper:

```/dev/null/example.js#L1-5
import { CloudWatchResourceView } from 'web-mojo/admin';

await CloudWatchResourceView.show('ec2', 'web-server-1', resourceData);
```

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

## Admin Assistant

The Admin Assistant is an LLM-powered chat interface that lets admins query data in natural language. It is delivered as a fullscreen modal triggered from a topbar icon button.

### Enabling the Assistant

Call `registerAssistant(app)` after your app starts. This adds a `bi-robot` icon to the topbar that opens the assistant modal. The button is only shown to users with the `view_admin` permission.

```js
import { registerAssistant } from 'web-mojo/admin';

// After app.start() or once the topbar is mounted
await registerAssistant(app);
```

`registerAssistant` is an async function — it dynamically imports `AssistantView` and `Modal` so they are not included in your initial bundle unless the function is called.

### AssistantView

`AssistantView` can also be instantiated directly and shown in any modal:

```js
import { AssistantView } from 'web-mojo/admin';
import { Modal } from 'web-mojo';

const view = new AssistantView({ app });
Modal.show(view, { size: 'fullscreen', title: 'Admin Assistant', noBodyPadding: true });
```

**Constructor options:**

| Option | Type | Description |
|--------|------|-------------|
| `app` | `WebApp` | The running app instance (required). Used to access `app.ws` and `app.rest`. |

### Layout

Two-panel layout inside the modal:

- **Left sidebar** — Conversation list fetched from `GET /api/assistant/conversation`. Grouped by date (Today / Yesterday / Earlier). Supports selecting, creating, and deleting conversations.
- **Right chat area** — `ChatView` with `AssistantMessageView` for rich message content. Connection status indicator at the top.

### WebSocket Events

Messages are sent via `app.ws` and responses arrive as typed WebSocket events:

| Event | Triggered when |
|-------|----------------|
| `message:assistant_thinking` | Backend starts processing — shows thinking indicator, disables input |
| `message:assistant_tool_call` | Backend calls a tool — updates thinking text to "Calling {tool}..." |
| `message:assistant_response` | Final response — hides thinking, adds assistant message, re-enables input |
| `message:assistant_error` | Backend error — hides thinking, shows error as system message, re-enables input |

All events are filtered by `conversation_id` to ignore events from other active sessions.

When WebSocket is unavailable, the assistant falls back to a REST POST to `POST /api/assistant`.

### Structured Response Blocks

Assistant responses can include `blocks` rendered inline inside the message:

| Block type | Rendered as |
|------------|-------------|
| `table` | `TableView` (non-paginated, non-sortable) |
| `chart` (line/bar/area) | `SeriesChart` |
| `chart` (pie) | `PieChart` |
| `stat` | Bootstrap stat cards in a flex row |

### REST Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/assistant/conversation` | List user's conversations (max 50) |
| `GET` | `/api/assistant/conversation/{id}` | Load full message history |
| `DELETE` | `/api/assistant/conversation/{id}` | Delete a conversation |
| `POST` | `/api/assistant` | REST fallback when WebSocket is unavailable |

### Permissions

The topbar button and the assistant modal both require the `view_admin` permission.

---

## Best Practices

- Keep admin pages and views under `src/admin` in your application code if you’re building app-specific admin UIs.
- Use the built-in extension pages/views first; subclass only when you need custom behavior.
- Avoid deep imports to internal `src/extensions/admin/...` paths in production app code—prefer `import { ... } from 'web-mojo/admin'`.