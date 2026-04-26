# Built-in Models

WEB-MOJO ships with two sets of pre-built [Model](../core/Model.md) and [Collection](../core/Collection.md) classes:

1. **Core models** — documented on this page. Identity primitives, files, settings, logs, short links — the building blocks every portal app needs.
2. **Admin models** — `Job`, `Incident`, `Email`, `Push`, `Phonehub`, `AWS`, etc. — coupled to the admin extension and shipped separately at [`web-mojo/admin-models`](../extensions/Admin.md#admin-models). They have no UI dependencies, so an API client or Node script can consume them without pulling in the admin pages from `web-mojo/admin`.

Core models are available from the main entry or the dedicated barrel:

```js
import { User, Group, Member, ApiKey, Files } from 'web-mojo';
import { User, Settings, ShortLink } from 'web-mojo/models';
```

For admin models, see the Admin extension docs:

```js
import { Job, Incident, Email, Push } from 'web-mojo/admin-models';
```

---

## Table of Contents

- [Overview](#overview)
- [User & UserList](#user--userlist)
- [Group & GroupList](#group--grouplist)
- [Member & MemberList](#member--memberlist)
- [ApiKey & ApiKeyList](#apikey--apikeylist)
- [Files & FilesList](#files--fileslist)
- [Settings](#settings)
- [Metrics](#metrics)
- [Passkeys](#passkeys)
- [System](#system)
- [Log & LogList](#log--loglist)
- [ShortLink & ShortLinkClick](#shortlink--shortlinkclick)
- [Admin models](#admin-models)
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

// You can also import the core classes from the same path
import { Model, Collection, Rest } from 'web-mojo/models';

// Admin-coupled models (Job, Incident, Email, Push, etc.) ship separately:
import { Job, JobList } from 'web-mojo/admin-models';
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

## Passkeys

Represents a WebAuthn passkey credential registered by a user.

**Endpoint:** `/api/passkeys`

```js
import { Passkeys } from 'web-mojo/models';

const passkeys = new Passkeys();
const resp = await passkeys.rest.GET('/api/passkeys', { user_id: user.get('id') });
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

## Admin models

Fourteen Model/Collection sets are coupled to the admin extension and ship from a separate, **UI-free** entry: [`web-mojo/admin-models`](../extensions/Admin.md#admin-models).

```js
import { Job, JobList, JobForms } from 'web-mojo/admin-models';
import { Incident, IncidentList, RuleSet } from 'web-mojo/admin-models';
import { Email, Mailbox, EmailDomain, SentMessage, EmailTemplate } from 'web-mojo/admin-models';
import { Push, PushDevice, PushTemplate, PushDelivery } from 'web-mojo/admin-models';
```

| Model | Purpose | Endpoint |
|---|---|---|
| `AWS` (S3Bucket) | S3 buckets | `/api/aws/...` |
| `Assistant` | Assistant conversations + skills | `/api/assistant/...` |
| `Bouncer` | Fraud-detection device/signal/signature | `/api/account/bouncer/...` |
| `Email` | Email domain / mailbox / template / sent message | `/api/aws/email/...` |
| `Incident` | Incident / event / rule set | `/api/incident/...` |
| `IPSet` | IP allow/block sets | `/api/incident/ipset` |
| `Job` | Background job + log + event + stats | `/api/jobs/job` |
| `JobRunner` | Job runner control + ping/shutdown | `/api/jobs/runners` |
| `LoginEvent` | Geolocated login history | `/api/account/logins` |
| `PublicMessage` | Contact form / public-facing messages | `/api/messaging/public` |
| `Push` | Push device / template / config / delivery | `/api/account/devices/push/...` |
| `Phonehub` | Phone numbers + SMS | `/api/phonehub/...` |
| `ScheduledTask` | Cron-style task definitions | `/api/jobs/scheduled_task` |
| `Tickets` | Ticket + ticket notes (cross-references Incident, User) | `/api/incident/ticket` |

The model classes are pure data — no DOM, no Bootstrap, no template deps. You can import them in a Node script, an API client, or any UI library without pulling in the admin pages from `web-mojo/admin`.

For the matching admin **pages** (sidebar, dashboards, table pages, detail views), see [`web-mojo/admin`](../extensions/Admin.md).

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

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/models/BuiltinModels/BuiltinModelsExample.js`](../../../examples/portal/examples/models/BuiltinModels/BuiltinModelsExample.js) — Catalog of built-in Model/Collection classes (User, Group, Job, …) plus a UserList demo.

<!-- examples:cross-link end -->
