# Built-in Models

WEB-MOJO ships with a collection of pre-built [Model](../core/Model.md) and [Collection](../core/Collection.md) classes covering the most common entities in a multi-tenant portal application: users, groups, members, jobs, files, emails, incidents, tickets, metrics, and more.

All built-in models are available from a single import:

```js
import { User, Group, Job, Email } from 'web-mojo/models';
import { UserList, GroupList, JobForms } from 'web-mojo/models';
```

---

## Table of Contents

- [Overview](#overview)
- [User & UserList](#user--userlist)
- [Group & GroupList](#group--grouplist)
- [Member & MemberList](#member--memberlist)
- [Job & JobList](#job--joblist)
- [JobRunner & JobRunnerList](#jobrunner--jobrunnerlist)
- [Email & EmailList](#email--emaillist)
- [Files & FilesList](#files--fileslist)
- [Incident & IncidentList](#incident--incidentlist)
- [Tickets](#tickets)
- [Log & LogList](#log--loglist)
- [Metrics](#metrics)
- [ApiKey & ApiKeyList](#apikey--apikeylist)
- [Push & PushList](#push--pushlist)
- [AssistantConversation & AssistantConversationList](#assistantconversation--assistantconversationlist)
- [Passkeys](#passkeys)
- [Phonehub](#phonehub)
- [AWS](#aws)
- [System](#system)
- [ShortLink & ShortLinkClick](#shortlink--shortlinkclick)
- [Model Conventions](#model-conventions)
- [Form Configurations](#form-configurations)
- [DataView Configurations](#dataview-configurations)
- [Related Documentation](#related-documentation)

---

## Overview

### Importing

Every built-in model, collection, form config, and DataView config is exported from the top-level models index:

```js
// Named imports — recommended
import { User, UserList, UserForms, UserDataView } from 'web-mojo/models';
import { Group, GroupList, GroupForms } from 'web-mojo/models';
import { Job, JobList } from 'web-mojo/models';

// You can also import the core classes from the same path
import { Model, Collection, Rest } from 'web-mojo/models';
```

### Common Pattern

Every built-in model follows the same pattern:

```js
// 1. Create a model and fetch by ID
const user = new User({ id: 42 });
const resp = await user.fetch();
if (resp.success) {
  console.log(user.get('display_name'));
}

// 2. Create a collection and fetch a list
const users = new UserList();
await users.fetch({ is_active: true });
users.forEach(user => console.log(user.get('email')));

// 3. Save a model
user.set('display_name', 'Alice Smith');
await user.save();

// 4. Delete a model
await user.destroy();
```

### Static Class Properties

Most built-in models expose static properties for use with dialogs and forms:

| Property | Type | Description |
|---|---|---|
| `Model.ADD_FORM` | `object` | Form config for creating a new record |
| `Model.EDIT_FORM` | `object` | Form config for editing an existing record |
| `Model.CREATE_FORM` | `object` | Alias for `ADD_FORM` (some models) |
| `Model.DATA_VIEW` | `object` | DataView config for displaying a record |
| `Model.PERMISSIONS` | `array` | Permission definitions (User only) |
| `Model.PERMISSION_FIELDS` | `array` | Form fields for editing permissions (User only) |

---

## User & UserList

Represents a user account in the system.

**Endpoint:** `/api/user`

```js
import { User, UserList } from 'web-mojo/models';

// Fetch a single user
const user = new User({ id: 1 });
await user.fetch();

// Common fields
user.get('id');
user.get('email');
user.get('display_name');
user.get('username');
user.get('phone_number');
user.get('is_active');
user.get('is_superuser');
user.get('last_login');
user.get('last_activity');
user.get('permissions');   // { manage_users: true, ... }
user.get('avatar');        // { url: '...' }
user.get('org');           // { id, name } — parent organization

// Fetch a list with filters
const users = new UserList();
await users.fetch({ is_active: true, page: 1, size: 20 });
```

### Permission Checking

`User` provides `hasPermission()` for checking named permissions:

```js
// Single permission
user.hasPermission('manage_users');     // true/false

// Multiple (any of)
user.hasPermission(['view_admin', 'manage_users']);

// System permission (prefixed with 'sys.')
user.hasPermission('sys.manage_users'); // checks system-level only, ignores member perms

// Superusers always return true
if (user.get('is_superuser')) {
  user.hasPermission('anything'); // always true
}

// Shorthand
user.hasPerm('view_logs'); // same as hasPermission()
```

### Available Permissions

```js
User.PERMISSIONS
// [
//   { name: 'manage_users',   label: 'Manage Users' },
//   { name: 'view_users',     label: 'View Users' },
//   { name: 'view_groups',    label: 'View Groups' },
//   { name: 'manage_groups',  label: 'Manage Groups' },
//   { name: 'view_metrics',   label: 'View System Metrics' },
//   { name: 'manage_metrics', label: 'Manage System Metrics' },
//   { name: 'view_logs',      label: 'View Logs' },
//   { name: 'view_incidents', label: 'View Incidents' },
//   { name: 'manage_incidents','label': 'Manage Incidents' },
//   { name: 'view_tickets',   label: 'View Tickets' },
//   { name: 'manage_tickets', label: 'Manage Tickets' },
//   { name: 'view_admin',     label: 'View Admin' },
//   { name: 'view_jobs',      label: 'View Jobs' },
//   { name: 'manage_jobs',    label: 'Manage Jobs' },
//   { name: 'view_global',    label: 'View Global' },
//   { name: 'manage_notifications', label: 'Manage Notifications' },
//   { name: 'manage_files',   label: 'Manage Files' },
//   { name: 'force_single_session', label: 'Force Single Session' },
//   { name: 'file_vault',     label: 'Access File Vault' },
//   { name: 'manage_aws',     label: 'Manage AWS' },
//   { name: 'manage_docit',   label: 'Manage DocIt' }
// ]
```

### User Forms & DataView

```js
import { UserForms, UserDataView } from 'web-mojo/models';

// Form configs
UserForms.create   // email, phone_number, display_name
UserForms.edit     // email, display_name, phone_number, org (collection field)
UserForms.permissions  // all permission toggle switches

// DataView configs
UserDataView.profile    // id, last_login, username, display_name, email, org, phone
UserDataView.activity   // last_login, last_activity
UserDataView.detailed   // comprehensive view with all fields and nested dataviews
UserDataView.permissions // display_name + permissions dataview
UserDataView.summary    // compact: name, email, status, last seen

// Static access
User.ADD_FORM    === UserForms.create
User.EDIT_FORM   === UserForms.edit
User.DATA_VIEW   === UserDataView.detailed
```

### UserDevice

```js
import { UserDevice, UserDeviceList } from 'web-mojo/models';

// Look up a device by DUID
const device = await UserDevice.getByDuid(duidString);

// Fetch a user's devices
const devices = new UserDeviceList();
await devices.fetch({ user_id: user.get('id') });
```

### UserDeviceLocation

```js
import { UserDeviceLocation, UserDeviceLocationList } from 'web-mojo/models';

const locations = new UserDeviceLocationList();
await locations.fetch({ device_id: device.get('id') });
```

---

## Group & GroupList

Represents an organization, team, tenant, or any hierarchical entity in the system.

**Endpoint:** `/api/group`

```js
import { Group, GroupList } from 'web-mojo/models';

const group = new Group({ id: 5 });
await group.fetch();

group.get('id');
group.get('name');
group.get('kind');       // 'org', 'team', 'department', etc.
group.get('is_active');
group.get('parent');     // { id, name } parent group
group.get('avatar');
group.get('metadata');   // { timezone, eod_hour, domain, portal, email_template }
```

### Group Kinds

```js
import { GroupKinds, GroupKindOptions } from 'web-mojo/models';

GroupKinds;
// {
//   org: 'Organization',
//   division: 'Division',
//   department: 'Department',
//   team: 'Team',
//   merchant: 'Merchant',
//   partner: 'Partner',
//   client: 'Client',
//   iso: 'ISO',
//   sales: 'Sales',
//   reseller: 'Reseller',
//   location: 'Location',
//   region: 'Region',
//   route: 'Route',
//   project: 'Project',
//   inventory: 'Inventory',
//   test: 'Testing',
//   misc: 'Miscellaneous',
//   qa: 'Quality Assurance'
// }

GroupKindOptions; // Array of { value, label } for select fields
```

### Group Forms

```js
import { GroupForms } from 'web-mojo/models';

GroupForms.create   // name, kind, parent (collection field)
GroupForms.edit     // name, kind, parent, metadata.domain, metadata.portal, is_active
GroupForms.detailed // Full profile with avatar, details, account settings sections

Group.ADD_FORM    === GroupForms.create
Group.CREATE_FORM === GroupForms.create  // Alias
Group.EDIT_FORM   === GroupForms.edit
```

### Fetching Groups with Filtering

```js
const groups = new GroupList();

// Fetch all active organizations
await groups.fetch({ kind: 'org', is_active: true });

// Search by name
await groups.fetch({ name: 'Marketing' });

// Paginate
await groups.fetch({ page: 2, size: 10 });
```

### Using Group in a Collection Field

Group is designed to work as a searchable dropdown in forms via `Collection` field type:

```js
{
  type: 'collection',
  name: 'parent',
  label: 'Parent Group',
  Collection: GroupList,
  labelField: 'name',
  valueField: 'id',
  maxItems: 10,
  placeholder: 'Search groups...',
  emptyFetch: false,
  debounceMs: 300
}
```

---

## Member & MemberList

Represents a user's membership in a group, including their role and permissions within that group.

**Endpoint:** `/api/member`

```js
import { Member, MemberList } from 'web-mojo/models';

const member = new Member();

// Fetch a member record for the current user + group
await member.fetchForGroup(groupId);

// Common fields
member.get('id');
member.get('user');        // { id, display_name, email }
member.get('group');       // { id, name }
member.get('role');        // 'admin', 'member', 'viewer', etc.
member.get('permissions'); // Group-specific permission overrides
member.get('is_active');
member.get('joined_at');
```

### Member Permission Checking

Member models also expose `hasPermission()`:

```js
// Check group-level permissions (on the member record)
user.member.hasPermission('manage_billing');
```

### MemberList

```js
const members = new MemberList();
await members.fetch({ group_id: group.get('id') });
```

---

## Job & JobList

Represents a background task or scheduled job.

**Endpoint:** `/api/job`

```js
import { Job, JobList } from 'web-mojo/models';

const job = new Job({ id: 101 });
await job.fetch();

job.get('id');
job.get('name');
job.get('status');       // 'pending', 'running', 'complete', 'failed', 'cancelled'
job.get('progress');     // 0–100
job.get('result');       // Job output data
job.get('error');        // Error message if failed
job.get('created_at');
job.get('started_at');
job.get('completed_at');
job.get('group');        // Associated group

// Fetch all jobs for a group
const jobs = new JobList();
await jobs.fetch({ group_id: groupId, status: 'running' });
```

### Polling a Job

```js
async pollUntilComplete(jobId) {
  while (true) {
    const job = new Job({ id: jobId });
    await job.fetch();

    if (['complete', 'failed', 'cancelled'].includes(job.get('status'))) {
      return job;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

---

## JobRunner & JobRunnerList

Represents a worker process that executes jobs. Used for monitoring the job queue infrastructure.

**Endpoint:** `/api/job/runner`

```js
import { JobRunner, JobRunnerList } from 'web-mojo/models';

const runners = new JobRunnerList();
await runners.fetch();

runners.forEach(runner => {
  console.log(runner.get('name'), runner.get('status'), runner.get('jobs_processed'));
});
```

---

## Email & EmailList

Represents an email message — either queued for sending or already sent.

**Endpoint:** `/api/email`

```js
import { Email, EmailList } from 'web-mojo/models';

const email = new Email({ id: 55 });
await email.fetch();

email.get('id');
email.get('to');          // Recipient address
email.get('from');        // Sender address
email.get('subject');
email.get('body');        // HTML body
email.get('status');      // 'queued', 'sent', 'failed', 'bounced'
email.get('sent_at');
email.get('created_at');

// Fetch sent emails
const emails = new EmailList();
await emails.fetch({ status: 'sent', group_id: groupId });
```

---

## Files & FilesList

Represents a stored file or uploaded media asset.

**Endpoint:** `/api/files`

```js
import { Files, FilesList } from 'web-mojo/models';

const file = new Files({ id: 22 });
await file.fetch();

file.get('id');
file.get('name');         // Original filename
file.get('url');          // Public access URL
file.get('mime_type');
file.get('size');         // File size in bytes
file.get('created_at');
file.get('group');        // Owning group
file.get('uploaded_by'); // User who uploaded

// Fetch files for a group
const files = new FilesList();
await files.fetch({ group_id: groupId });
```

---

## Incident & IncidentList

Represents a system incident, outage, or issue report.

**Endpoint:** `/api/incident`

```js
import { Incident, IncidentList } from 'web-mojo/models';

const incident = new Incident({ id: 7 });
await incident.fetch();

incident.get('id');
incident.get('title');
incident.get('description');
incident.get('status');      // 'open', 'investigating', 'resolved', 'closed'
incident.get('severity');    // 'low', 'medium', 'high', 'critical'
incident.get('created_at');
incident.get('resolved_at');
incident.get('group');

// Fetch open incidents
const incidents = new IncidentList();
await incidents.fetch({ status: 'open', group_id: groupId });
```

---

## Tickets

Represents a support or task ticket.

**Endpoint:** `/api/ticket`

```js
import { Tickets } from 'web-mojo/models';
// Also: TicketList (if exported)

const ticket = new Tickets({ id: 99 });
await ticket.fetch();

ticket.get('id');
ticket.get('title');
ticket.get('description');
ticket.get('status');      // 'open', 'in_progress', 'resolved', 'closed'
ticket.get('priority');    // 'low', 'normal', 'high', 'urgent'
ticket.get('assigned_to');
ticket.get('created_by');
ticket.get('created_at');
ticket.get('updated_at');
ticket.get('group');
```

---

## Log & LogList

Represents a system audit or activity log entry.

**Endpoint:** `/api/log`

```js
import { Log, LogList } from 'web-mojo/models';

const log = new Log({ id: 1001 });
await log.fetch();

log.get('id');
log.get('action');        // Action performed (e.g. 'user.login', 'group.create')
log.get('actor');         // { id, display_name } — who performed the action
log.get('target');        // The resource that was affected
log.get('details');       // Additional context/payload
log.get('ip_address');
log.get('created_at');
log.get('group');

// Fetch recent logs
const logs = new LogList();
await logs.fetch({
  group_id: groupId,
  action: 'user.login',
  page: 1,
  size: 50
});
```

---

## Metrics

Represents time-series metrics data for monitoring and analytics.

**Endpoint:** `/api/metrics`

```js
import { Metrics } from 'web-mojo/models';
// Also: MetricsList (if exported)

const metrics = new Metrics();
const resp = await metrics.rest.GET('/api/metrics/summary', {
  group_id: groupId,
  period: '7d'
});
```

---

## ApiKey & ApiKeyList

Represents an API key for programmatic access.

**Endpoint:** `/api/apikey`

```js
import { ApiKey, ApiKeyList } from 'web-mojo/models';

const key = new ApiKey({ id: 3 });
await key.fetch();

key.get('id');
key.get('name');        // Human-readable label
key.get('key');         // The actual API key (only returned on creation)
key.get('prefix');      // First few characters of the key for identification
key.get('is_active');
key.get('last_used');
key.get('expires_at');
key.get('created_at');
key.get('group');

// Fetch all keys for a group
const keys = new ApiKeyList();
await keys.fetch({ group_id: groupId });
```

---

## Push & PushList

Represents a push notification subscription or message.

**Endpoint:** `/api/push`

```js
import { Push, PushList } from 'web-mojo/models';

const subscription = new Push();

// Fetch subscriptions for a group
const subscriptions = new PushList();
await subscriptions.fetch({ group_id: groupId });
```

---

## Passkeys

Represents a WebAuthn passkey credential registered by a user.

**Endpoint:** `/api/passkeys`

```js
import { Passkeys } from 'web-mojo/models';

const passkeys = new Passkeys();
const resp = await passkeys.rest.GET('/api/passkeys', { user_id: user.get('id') });
```

---

## Phonehub

Represents phone/device hub integration records.

**Endpoint:** `/api/phonehub`

```js
import { Phonehub } from 'web-mojo/models';
```

---

## AWS

Represents AWS integration configuration and resources.

**Endpoint:** `/api/aws`

```js
import { AWS } from 'web-mojo/models';

const aws = new AWS();
// Fetch AWS configuration for a group
await aws.rest.GET('/api/aws/config', { group_id: groupId });
```

---

## System

Represents system-level configuration, status, or settings.

**Endpoint:** `/api/system`

```js
import { System } from 'web-mojo/models';

const system = new System();
const resp = await system.rest.GET('/api/system/status');
if (resp.success && resp.data.status) {
  this.systemStatus = resp.data.data;
}
```

---

## AssistantConversation & AssistantConversationList

Represents an LLM assistant conversation and its message history. Used by the Admin Assistant interface.

**Endpoint:** `/api/assistant/conversation`

```js
import { AssistantConversation, AssistantConversationList } from 'web-mojo/models';

// Fetch a conversation with full message history
const conversation = new AssistantConversation({ id: 42 });
await conversation.fetch();
const messages = conversation.get('messages'); // Array of message objects

// Fetch the list of the current user's conversations (max 50)
const list = new AssistantConversationList();
await list.fetch();
list.forEach(c => console.log(c.get('id'), c.get('created')));

// Delete a conversation
const conversation = new AssistantConversation({ id: 42 });
await conversation.destroy();
```

`AssistantConversationList` defaults to `size: 50`. Conversations are always scoped to the authenticated user — the API does not expose other users' conversations.

Conversations are created implicitly when the first WebSocket message is sent. There is no explicit `save()` flow for creating a new conversation.

---

## ShortLink & ShortLinkClick

Represent django-mojo shortlinks and their per-click history records.

**ShortLink endpoint:** `/api/shortlink/link`
**ShortLinkClick endpoint:** `/api/shortlink/history` (read-only)

```js
import {
    ShortLink, ShortLinkList,
    ShortLinkClick, ShortLinkClickList,
    ShortLinkForms,
    flattenShortLinkMetadata,
    buildShortLinkMetadata,
    extractShortLinkPayload,
} from 'web-mojo/models';

// Fetch a list of shortlinks
const links = new ShortLinkList();
await links.fetch({ page: 1, size: 25 });

links.forEach(link => {
    link.get('id');
    link.get('url');           // Destination URL
    link.get('source');        // 'admin' | 'email' | 'sms' | 'push' | 'fileman' | 'api' | 'other'
    link.get('is_active');
    link.get('is_protected');  // Prevents accidental deletion
    link.get('track_clicks');
    link.get('bot_passthrough');
    link.get('expire_days');
    link.get('expire_hours');
    link.get('metadata');      // { 'og:title', 'og:description', 'og:image', 'twitter:*', ... }
    link.get('created_at');
});

// Fetch global click history
const clicks = new ShortLinkClickList();
await clicks.fetch({ link_id: link.get('id') });
```

### ShortLinkForms

```js
ShortLinkForms.create  // Destination URL, source, expiry, track_clicks, bot_passthrough, is_protected, OG fields
ShortLinkForms.edit    // Same as create + is_active switch + Twitter card fields

ShortLink.EDIT_FORM === ShortLinkForms.edit
```

### OG / Twitter Metadata Helpers

OG and Twitter metadata is stored in the API as colon-keyed fields inside `metadata` (e.g., `"og:title"`). The three helpers bridge that shape and flat form fields.

| Helper | Purpose |
|--------|---------|
| `flattenShortLinkMetadata(metadata)` | Expand `metadata` object into flat `og_title`, `og_description`, … fields for seeding edit dialogs |
| `buildShortLinkMetadata(formData)` | Inverse — collapses flat `og_*` / `twitter_*` form fields back into a colon-keyed `metadata` object; empty values are dropped |
| `extractShortLinkPayload(formData)` | Strips OG/Twitter keys from `formData`, calls `buildShortLinkMetadata`, and returns a clean REST payload. When no OG/Twitter fields are set, `metadata` is omitted entirely so the backend auto-scrape runs |

```js
// Seed an edit dialog from an existing shortlink
const flat = flattenShortLinkMetadata(link.get('metadata'));
// flat.og_title, flat.og_description, flat.og_image, flat.twitter_card, ...

// Build payload before saving
const payload = extractShortLinkPayload({ url: 'https://...', og_title: 'Hello', ... });
// payload.metadata = { 'og:title': 'Hello' }
```

---

## Model Conventions

All built-in models follow these conventions:

### Constructor

```js
// Create without data (for fetching)
const user = new User({ id: 42 });

// Create with data (for display or saving)
const user = new User({ email: 'jane@example.com', display_name: 'Jane' });
```

### Standard Endpoints

| Method | REST call | Description |
|---|---|---|
| `fetch()` | `GET /api/<resource>/<id>` | Load a single record |
| `save()` | `POST /api/<resource>` | Create (no ID) or `PUT/PATCH` (with ID) |
| `destroy()` | `DELETE /api/<resource>/<id>` | Delete the record |

### Return Value

All model operations return a response object:

```js
const resp = await user.fetch();

resp.success      // boolean — HTTP 2xx?
resp.status       // HTTP status code
resp.data         // Parsed API JSON body
resp.data.status  // Server-level success flag
resp.data.data    // The actual model data
```

### Accessing Data

```js
// Use .get() for field access
user.get('email');
user.get('metadata.timezone');  // Supports dot notation for nested fields

// Or direct property access (model.fieldName, set by the framework)
user.email;           // Available after fetch()
user.display_name;
```

### Setting Data

```js
// Set a single field
user.set('display_name', 'Alice Smith');

// Set multiple fields
user.set({ display_name: 'Alice Smith', email: 'alice@example.com' });

// Check if model has unsaved changes
if (user.isDirty()) {
  await user.save();
}
```

---

## Form Configurations

Most built-in models ship with ready-to-use form configurations for the [Dialog.showModelForm()](../components/Dialog.md#showmodelform) and [Dialog.showForm()](../components/Dialog.md#showform) methods.

### Using a Form Config Directly

```js
import { User, UserForms } from 'web-mojo/models';
import Dialog from 'web-mojo/views/feedback/Dialog';

// Create a new user
const result = await Dialog.showForm({
  title:  'Create User',
  fields: UserForms.create.fields,
  size:   'md'
});

if (result && result.submitted) {
  const user = new User(result.data);
  await user.save();
}

// Edit an existing user
const result = await Dialog.showModelForm({
  title:  `Edit ${existingUser.get('display_name')}`,
  model:  existingUser,
  fields: User.EDIT_FORM.fields,
  size:   'lg'
});
```

### Using Model Static Properties

```js
// Shortcut via static class properties
await Dialog.showModelForm({
  model:  user,
  ...User.EDIT_FORM   // spreads: { title, fields }
});
```

---

## DataView Configurations

Models with `DATA_VIEW` configurations work with the DataView component to display record data in a structured, labelled format.

### Using a DataView Config

```js
import Dialog from 'web-mojo/views/feedback/Dialog';
import { User } from 'web-mojo/models';

// Show user details in a read-only dialog
await Dialog.showModelView(User, {
  header: 'User Details',
  body:   new DataView({ model: userModel, fields: User.DATA_VIEW.fields }),
  size:   'lg'
});

// Or use the convenient static method
await Dialog.showModelView(null, {
  header: 'User Profile',
  body:   new DataView({ model: user, fields: UserDataView.profile.fields }),
  size:   'md'
});
```

### Available DataView Configs (User)

| Config | Description |
|---|---|
| `UserDataView.profile` | Basic profile: ID, name, email, phone, org, last login |
| `UserDataView.activity` | Last login and last activity timestamps |
| `UserDataView.detailed` | All fields including permissions and metadata |
| `UserDataView.permissions` | Permissions-focused view |
| `UserDataView.summary` | Compact: name, email, status, last seen |

---

## Related Documentation

- **[Model](../core/Model.md)** — The base Model class all built-in models extend
- **[Collection](../core/Collection.md)** — The base Collection class all built-in lists extend
- **[Rest](../services/Rest.md)** — The HTTP client models use for API communication
- **[Dialog](../components/Dialog.md)** — Use `showForm()` and `showModelForm()` with built-in form configs
- **[DataView](../components/DataView.md)** — Display model data using built-in `DATA_VIEW` configurations
- **[PortalApp](../core/PortalApp.md)** — Uses User, Group, and Member models internally for auth and group management