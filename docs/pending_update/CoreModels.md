# MOJO Core Models Reference

Complete reference for all MOJO core models, their collections, and form configurations.

## Table of Contents

- [Overview](#overview)
- [User & Authentication](#user--authentication)
- [Groups & Membership](#groups--membership)
- [Files & Storage](#files--storage)
- [Jobs & Background Tasks](#jobs--background-tasks)
- [Incidents & Tickets](#incidents--tickets)
- [Email & Communication](#email--communication)
- [Push Notifications](#push-notifications)
- [Logs & Monitoring](#logs--monitoring)
- [Metrics](#metrics)
- [System](#system)
- [AWS Integration](#aws-integration)

---

## Overview

All MOJO models follow a consistent pattern:

```js
// Import models
import { User, UserList, UserForms } from '@core/models/User.js';

// Create model instance
const user = new User({ id: 123 });
await user.fetch();

// Create collection
const users = new UserList({ params: { is_active: true } });
await users.fetch();

// Use form configurations
Dialog.showModelForm({
    title: 'Edit User',
    model: user,
    formConfig: UserForms.edit
});
```

### Common Model Patterns

All models extend the base `Model` class and provide:
- CRUD operations: `fetch()`, `save()`, `destroy()`
- Attribute access: `get(key)`, `set(key, value)`
- Event system: Model changes emit events
- REST integration: Automatic API endpoint handling

All collections extend the base `Collection` class and provide:
- Fetching with params: `fetch({ param: value })`
- Pagination: `fetchNext()`, `fetchPrevious()`
- Filtering: `where(predicate)`
- Model management: `add()`, `remove()`, `reset()`

---

## User & Authentication

### User Model

Represents a user account in the system.

```js
import { User, UserList, UserForms, UserDataView } from '@core/models/User.js';
```

#### Properties
- `id` - User ID
- `email` - Email address
- `username` - Unique username
- `display_name` - Display name
- `phone_number` - Phone number
- `avatar` - Avatar object with renditions
- `is_active` - Active status
- `last_login` - Last login timestamp
- `last_activity` - Last activity timestamp
- `permissions` - Permission object
- `metadata` - Additional metadata
- `org` - Organization (Group) reference

#### Methods

```js
// Check permissions
user.hasPermission('manage_users');          // Single permission
user.hasPermission(['view_logs', 'view_metrics']); // Any of these
user.hasPerm('manage_users');                // Alias

// System permissions (prefix with "sys.")
user.hasPermission('sys.manage_users');      // System-level permission
```

#### Available Permissions

```js
User.PERMISSIONS = [
    { name: "manage_users", label: "Manage Users" },
    { name: "view_groups", label: "View Groups" },
    { name: "manage_groups", label: "Manage Groups" },
    { name: "view_metrics", label: "View System Metrics" },
    { name: "manage_metrics", label: "Manage System Metrics" },
    { name: "view_logs", label: "View Logs" },
    { name: "view_incidents", label: "View Incidents" },
    { name: "manage_incidents", label: "Manage Incidents" },
    { name: "view_tickets", label: "View Tickets" },
    { name: "manage_tickets", label: "Manage Tickets" },
    { name: "view_admin", label: "View Admin" },
    { name: "view_jobs", label: "View Jobs" },
    { name: "manage_jobs", label: "Manage Jobs" },
    { name: "view_global", label: "View Global" },
    { name: "manage_notifications", label: "Manage Notifications" },
    { name: "manage_files", label: "Manage Files" },
    { name: "force_single_session", label: "Force Single Session" },
    { name: "file_vault", label: "Access File Vault" },
    { name: "manage_aws", label: "Manage AWS" },
    { name: "manage_docit", label: "Manage DocIt" }
];
```

#### Forms

```js
// Create new user
UserForms.create.fields;
// - email (required)
// - phone_number
// - display_name

// Edit user
UserForms.edit.fields;
// - email
// - display_name
// - phone_number
// - org (collection select)

// Edit permissions
UserForms.permissions.fields;
// All permission switches from User.PERMISSIONS
```

#### DataView Configurations

```js
// Profile view
UserDataView.profile.fields;
// id, username, last_login, email, display_name, last_activity, org.name, phone_number

// Activity view
UserDataView.activity.fields;
// last_login, last_activity (both relative time)

// Detailed view
UserDataView.detailed.fields;
// All user fields with nested dataviews for permissions, metadata, avatar

// Permissions view
UserDataView.permissions.fields;
// display_name and permissions as nested dataview

// Summary view
UserDataView.summary.fields;
// Compact view: display_name, email, is_active, last_activity
```

#### Static References

```js
User.DATA_VIEW = UserDataView.detailed;
User.EDIT_FORM = UserForms.edit;
User.ADD_FORM = UserForms.create;
User.PERMISSION_FIELDS = [...]; // Auto-generated permission switches
```

### UserDevice Model

Tracks user devices for security and analytics.

```js
import { UserDevice, UserDeviceList } from '@core/models/User.js';
```

#### Properties
- `duid` - Device unique identifier
- `user` - User reference
- `device_info` - Device information object
  - `user_agent.family` - Browser name
  - `os.family` - Operating system
- `first_seen` - First seen epoch timestamp
- `last_seen` - Last seen epoch timestamp

#### Static Methods

```js
// Lookup device by DUID
const device = await UserDevice.getByDuid('device_uuid_here');
```

### UserDeviceLocation Model

Tracks geographical locations of user devices.

```js
import { UserDeviceLocation, UserDeviceLocationList } from '@core/models/User.js';
```

#### Properties
- `user` - User reference
- `user_device` - UserDevice reference
- `geolocation` - Location object
  - `city` - City name
  - `region` - Region/state
  - `country_name` - Country
  - `latitude` - Latitude
  - `longitude` - Longitude
- `last_seen` - Last seen epoch timestamp

---

## Groups & Membership

### Group Model

Represents organizations, teams, departments, or any hierarchical grouping.

```js
import { Group, GroupList, GroupForms } from '@core/models/Group.js';
```

#### Properties
- `id` - Group ID
- `name` - Group name
- `kind` - Group type/category
- `parent` - Parent group reference
- `is_active` - Active status
- `metadata` - Additional settings
  - `domain` - Default domain
  - `portal` - Portal URL
  - `timezone` - Timezone
  - `language` - Language preference

#### Group Kinds

```js
Group.GroupKinds = {
    'org': 'Organization',
    'division': 'Division',
    'department': 'Department',
    'team': 'Team',
    'merchant': 'Merchant',
    'partner': 'Partner',
    'client': 'Client',
    'iso': 'ISO',
    'sales': 'Sales',
    'reseller': 'Reseller',
    'location': 'Location',
    'region': 'Region',
    'route': 'Route',
    'project': 'Project',
    'inventory': 'Inventory',
    'test': 'Testing',
    'misc': 'Miscellaneous',
    'qa': 'Quality Assurance'
};

// Available as select options
Group.GroupKindOptions; // Array of {value, label}
```

#### Forms

```js
// Create group
GroupForms.create.fields;
// - name (required)
// - kind (select, required)
// - parent (collection select)

// Edit group
GroupForms.edit.fields;
// - name (required)
// - kind (select, required)
// - parent (collection select)
// - metadata.domain
// - metadata.portal
// - is_active (switch)

// Detailed form with avatar and grouped fields
GroupForms.detailed.fields;
// Includes avatar upload, profile details, account settings
```

#### Static References

```js
Group.EDIT_FORM = GroupForms.edit;
Group.CREATE_FORM = GroupForms.create;
```

### Member Model

Represents a user's membership in a group with permissions.

```js
import { Member, MemberList, MemberForms } from '@core/models/Member.js';
```

#### Properties
- `id` - Membership ID
- `user` - User object/reference
- `group` - Group object/reference
- `permissions` - Permission object for this membership
- `metadata.role` - Custom role name
- `is_active` - Active status
- `created` - Creation timestamp

#### Methods

```js
// Check group-specific permissions
member.hasPermission('manage_content');
member.hasPermission(['view_reports', 'edit_reports']);

// Fetch members for a specific group
await member.fetchForGroup(groupId);
```

#### Forms

```js
// Edit membership
MemberForms.edit.fields;
// - user.display_name
// - metadata.role
// - is_active (switch)
```

#### Static References

```js
Member.EDIT_FORM = MemberForms.edit;
Member.ADD_FORM = MemberForms.create;
```

---

## Files & Storage

### FileManager Model

Manages storage backends (S3, GCS, Azure, etc.) for the file system.

```js
import { FileManager, FileManagerList, FileManagerForms } from '@core/models/Files.js';
```

#### Properties
- `id` - Manager ID
- `name` - Display name
- `backend_url` - Storage URL (e.g., `s3://bucket/folder`)
- `aws_region` - AWS region
- `aws_key` - AWS access key
- `aws_secret` - AWS secret key
- `allowed_origins` - CORS allowed origins
- `is_default` - Default storage flag
- `is_active` - Active status

#### Forms

```js
// Create storage backend
FileManagerForms.create.fields;
// - name
// - backend_url (required)
// - aws_region (select)
// - aws_key
// - aws_secret
// - is_default (switch)
// - is_active (switch)

// Edit storage backend
FileManagerForms.edit.fields;
// - name
// - backend_url (required)
// - allowed_origins
// - is_default (switch)
// - is_active (switch)

// Set ownership
FileManagerForms.owners.fields;
// - group (collection select)
// - user (collection select)

// Credentials configuration
FileManagerForms.credentials.fields;
// - aws_region (select)
// - aws_key
// - aws_secret
```

### File Model

Represents an uploaded file with metadata and renditions.

```js
import { File, FileList, FileForms } from '@core/models/Files.js';
```

#### Properties
- `id` - File ID
- `name` - Filename
- `category` - File category (image, document, video, etc.)
- `size` - File size in bytes
- `mime_type` - MIME type
- `url` - Primary file URL
- `renditions` - Available renditions object
- `metadata` - Additional metadata
- `group` - Owner group
- `user` - Owner user

#### Methods

```js
// Check if file is an image
file.isImage(); // Returns true if category === 'image'

// Upload file with progress tracking
const upload = file.upload({
    file: fileObject,              // File object from input
    name: 'custom-name.jpg',       // Optional custom name
    group: 'group-id',             // Optional group
    description: 'Description',    // Optional description
    onProgress: ({ progress, loaded, total, percentage }) => {
        console.log(`Upload progress: ${percentage}%`);
    },
    onComplete: (response) => {
        console.log('Upload complete:', response);
    },
    onError: (error) => {
        console.error('Upload failed:', error);
    },
    showToast: true                // Show progress toast (default: true)
});

// Upload returns FileUpload instance with promise interface
await upload;

// Cancel upload
upload.cancel();
```

#### Forms

```js
// Create file backend
FileForms.create.fields;
// - backend_url (required)
// - settings (JSON textarea)

// Edit file
FileForms.edit.fields;
// - name
// - backend_url
// - settings (JSON textarea)
```

---

## Jobs & Background Tasks

### Job Model

Manages asynchronous background jobs in the job engine.

```js
import { Job, JobList, JobForms } from '@core/models/Job.js';
```

#### Properties
- `id` - Job ID
- `func` - Function module path
- `channel` - Queue channel
- `status` - Job status (pending, running, completed, failed, canceled, expired)
- `payload` - Job data
- `metadata` - Additional metadata
- `priority` - Job priority
- `max_retries` - Maximum retry attempts
- `retry_count` - Current retry count
- `duration_ms` - Execution duration
- `runner_id` - Worker that executed job
- `queue_position` - Position in queue
- `expires_at` - Expiration timestamp
- `run_at` - Scheduled run time
- `cancel_requested` - Cancel request flag
- `is_retriable` - Can be retried flag
- `recent_events` - Recent job events

#### Methods

```js
// Job control actions
await job.cancel();                    // Cancel running job
await job.retry(delay);                // Retry failed job (optional delay in seconds)
await job.getDetailedStatus();         // Get detailed status
const result = await job.cloneJob(newPayload); // Clone with new payload

// Status checks
job.isActive();                        // Is pending or running
job.isTerminal();                      // Is completed, failed, canceled, or expired
job.canRetry();                        // Can be retried
job.canCancel();                       // Can be canceled

// UI helpers
job.getStatusBadgeClass();             // Bootstrap badge class
job.getStatusIcon();                   // Bootstrap icon class
job.getEvents();                       // Get recent events
job.getFormattedDuration();            // Human-readable duration
job.getQueuePosition();                // Queue position if pending
job.hasExpired();                      // Check if expired
job.getRunnerId();                     // Get runner ID
job.getPayload();                      // Get payload data
job.getMetadata();                     // Get metadata
```

#### Collection Methods

```js
// Filtered fetches
await jobList.fetchByStatus('pending');
await jobList.fetchByChannel('default');
await jobList.fetchPending();
await jobList.fetchRunning();
await jobList.fetchCompleted();
await jobList.fetchFailed();
await jobList.fetchScheduled();
```

#### Static Methods

```js
// Publish new job
const response = await Job.publish({
    func: 'myapp.jobs.send_email',
    channel: 'default',
    payload: { email: 'user@example.com', subject: 'Hello' },
    delay: 60,                         // Delay 60 seconds
    run_at: '2025-10-05T10:00:00Z',   // Or schedule for specific time
    max_retries: 3,
    expires_in: 900,                   // Expire in 15 minutes
    broadcast: false                   // Send to all workers
});

// System stats
const stats = await Job.getStats();

// System health
const health = await Job.getHealth();
const channelHealth = await Job.getHealth('default');

// Control operations
await Job.test();                      // Run test job
await Job.tests();                     // Run test jobs
await Job.clearStuck('default');       // Clear stuck jobs
await Job.clearChannel('default');     // Clear entire channel
await Job.cleanConsumers();            // Cleanup consumers
await Job.purgeJobs(30);               // Purge jobs older than 30 days
```

#### Forms

```js
// Publish new job
JobForms.publish.fields;
// - func (required)
// - channel
// - payload (JSON textarea, required)
// - delay
// - run_at
// - max_retries
// - expires_in
// - broadcast (switch)

// Retry job
JobForms.retry.fields;
// - delay

// Clone job
JobForms.clone.fields;
// - channel
// - payload (JSON textarea)
// - delay
```

### JobRunner Model

Manages job engine workers/runners that execute jobs.

```js
import { JobRunner, JobRunnerList, JobRunnerForms } from '@core/models/JobRunner.js';
```

#### Properties
- `runner_id` - Unique runner identifier (used as id)
- `alive` - Runner is active
- `channels` - Array of channels handled
- `jobs_processed` - Total jobs processed
- `jobs_failed` - Total jobs failed
- `last_heartbeat` - Last heartbeat timestamp
- `started` - Runner start timestamp
- `ping_status` - Last ping status

**Note:** The model uses `runner_id` as the ID attribute.

#### Methods

```js
// Runner control
await runner.ping(timeout);            // Ping runner (default 2s timeout)
await runner.shutdown(graceful);       // Shutdown runner (default graceful=true)

// Status checks
runner.isActive();                     // Is alive
runner.isHealthy();                    // Active and recent heartbeat
runner.canControl();                   // Can be controlled

// Information
runner.getChannels();                  // Get handled channels
runner.getStatusBadgeClass();          // Bootstrap badge class
runner.getStatusIcon();                // Bootstrap icon class
runner.getFormattedHeartbeatAge();     // "2m ago"
runner.getFormattedUptime();           // "3h" or "2d"
runner.getUtilization();               // Utilization percentage
runner.getWorkerInfo();                // Worker stats object
runner.getDisplayName();               // Short display name
```

#### Collection Methods

```js
// Filtered queries
runnerList.getActive();                // Only active runners
runnerList.getByChannel('default');    // Runners for channel
runnerList.getHealthy();               // Healthy runners

// System stats
runnerList.getTotalProcessed();        // Total jobs processed
runnerList.getTotalFailed();           // Total jobs failed
runnerList.getSystemHealth();          // System health percentage
runnerList.getAllChannels();           // All unique channels
```

#### Static Methods

```js
// Control individual runner
await JobRunner.ping(runnerId, timeout);
await JobRunner.shutdown(runnerId, graceful);

// Broadcast commands to all runners
await JobRunner.broadcast('status', {}, timeout);
await JobRunner.broadcastStatus();
await JobRunner.broadcastShutdown();
await JobRunner.broadcastPause();
await JobRunner.broadcastResume();
await JobRunner.broadcastReload();
```

#### Forms

```js
// Broadcast command
JobRunnerForms.broadcast.fields;
// - command (select: status, pause, resume, reload, shutdown)
// - timeout (number, default 2.0)
```

### JobLog Model

Job execution logs.

```js
import { JobLog, JobLogList } from '@core/models/Job.js';
```

### JobEvent Model

Job lifecycle events.

```js
import { JobEvent, JobEventList } from '@core/models/Job.js';
```

### JobsEngineStats Model

System-wide job engine statistics.

```js
import { JobsEngineStats } from '@core/models/Job.js';

const stats = new JobsEngineStats();
await stats.fetch(); // No ID required (requiresId: false)
```

---

## Incidents & Tickets

### Incident Model

Represents system incidents tracked for monitoring and resolution.

```js
import { Incident, IncidentList, IncidentForms } from '@core/models/Incident.js';
```

#### Properties
- `id` - Incident ID
- `title` - Incident title
- `details` - Detailed description
- `category` - Incident category
- `state` - Current state (new, opened, paused, ignore, resolved)
- `priority` - Priority level
- `model_name` - Related model name
- `model_id` - Related model ID
- `created` - Creation timestamp
- `updated` - Last update timestamp

#### Forms

```js
// Create incident
IncidentForms.create.fields;
// - title (required)
// - details (required)
// - priority (default: 5)
// - state (default: 'open')
// - category (default: 'manual')

// Edit incident
IncidentForms.edit.fields;
// - category
// - state (select: new, opened, paused, ignore, resolved)
// - priority
// - details
// - model_name
// - model_id
```

### IncidentEvent Model

Events related to incidents.

```js
import { IncidentEvent, IncidentEventList, IncidentEventForms } from '@core/models/Incident.js';
```

#### Properties
- `id` - Event ID
- `incident` - Incident reference
- `category` - Event category
- `title` - Event title
- `description` - Event description
- `details` - Detailed information
- `component` - Component name
- `component_id` - Component ID
- `model_name` - Related model name
- `model_id` - Related model ID

#### Forms

```js
// Edit incident event
IncidentEventForms.edit.fields;
// - category (select with dynamic options)
// - incident
// - description
// - details
// - component
// - component_id
```

### IncidentHistory Model

Historical records of incident changes.

```js
import { IncidentHistory, IncidentHistoryList } from '@core/models/Incident.js';
```

### IncidentStats Model

Incident statistics and metrics.

```js
import { IncidentStats } from '@core/models/Incident.js';

const stats = new IncidentStats();
await stats.fetch(); // No ID required
```

### RuleSet & Rule Models

Event processing rules for incident creation.

```js
import { RuleSet, RuleSetList, Rule, RuleList } from '@core/models/Incident.js';
import { IncidentRuleSet, IncidentRuleSetList, IncidentRule, IncidentRuleList } from '@core/models/Incident.js';
```

**Note:** Both `RuleSet` and `IncidentRuleSet` refer to the same models (aliases).

### Ticket Model

Support tickets and issue tracking.

```js
import { Ticket, TicketList, TicketForms, TicketCategories } from '@core/models/Tickets.js';
```

#### Properties
- `id` - Ticket ID
- `title` - Ticket title
- `description` - Description
- `category` - Ticket category
- `status` - Current status (new, open, paused, resolved, qa, ignored)
- `priority` - Priority level
- `assignee` - Assigned user
- `incident` - Related incident
- `created` - Creation timestamp
- `updated` - Last update timestamp

#### Ticket Categories

```js
TicketCategories = {
    'ticket': 'Ticket',
    'bug': 'Bug',
    'feature': 'Feature Request',
    'incident': 'Incident',
    'security': 'Security Incident',
    'fulfillment': 'Fulfillment',
    'new_user': 'New User',
    'new_group': 'New Group',
    'qa': 'Quality Assurance'
};
```

#### Forms

```js
// Create ticket
TicketForms.create.fields;
// - title (required)
// - description
// - category (select, default: 'ticket')
// - priority (default: 5)
// - status (select, default: 'new')
// - assignee (collection select from UserList)
// - incident (collection select from IncidentList)

// Edit ticket
TicketForms.edit.fields;
// - title (required)
// - description
// - category (select)
// - priority
// - status (select)
// - assignee (collection select)
// - incident (collection select)
```

### TicketNote Model

Notes and comments on tickets.

```js
import { TicketNote, TicketNoteList } from '@core/models/Tickets.js';
```

---

## Email & Communication

### EmailDomain Model

Email domain management for sending emails.

```js
import { EmailDomain, EmailDomainList, EmailDomainForms } from '@core/models/Email.js';
```

#### Methods

```js
// Domain operations
await domain.onboard();                // Onboard domain
await domain.audit();                  // Audit domain configuration
await domain.reconcile();              // Reconcile domain settings

// Static methods
await EmailDomain.onboardById(domainId);
await EmailDomain.auditById(domainId);
await EmailDomain.reconcileById(domainId);
```

#### Forms

```js
EmailDomainForms.create;               // Create email domain
EmailDomainForms.edit;                 // Edit email domain
```

### Mailbox Model

Email mailboxes for sending/receiving mail.

```js
import { Mailbox, MailboxList, MailboxForms } from '@core/models/Email.js';
```

#### Forms

```js
MailboxForms.create;                   // Create mailbox
MailboxForms.edit;                     // Edit mailbox
```

### SentMessage Model

Tracks sent email messages.

```js
import { SentMessage, SentMessageList, SentMessageForms } from '@core/models/Email.js';
```

#### Forms

```js
SentMessageForms.create;               // Create sent message record
SentMessageForms.edit;                 // Edit sent message
```

### EmailTemplate Model

Email templates for consistent messaging.

```js
import { EmailTemplate, EmailTemplateList, EmailTemplateForms } from '@core/models/Email.js';
```

#### Forms

```js
EmailTemplateForms.create;             // Create email template
EmailTemplateForms.edit;               // Edit email template
```

---

## Push Notifications

### PushDevice Model

Registered devices for push notifications.

```js
import { PushDevice, PushDeviceList } from '@core/models/Push.js';
```

#### Properties
- `id` - Device ID
- `duid` - Device unique identifier
- `user` - User reference
- `device_info` - Device information
- `first_seen` - First seen epoch
- `last_seen` - Last seen epoch
- `is_active` - Active status

### PushConfig Model

Push notification service configurations.

```js
import { PushConfig, PushConfigList, PushConfigForms } from '@core/models/Push.js';
```

#### Properties
- `id` - Config ID
- `name` - Configuration name
- `group` - Associated group
- `fcm_enabled` - Firebase Cloud Messaging enabled
- `fcm_sender_id` - FCM sender ID
- `apns_enabled` - Apple Push Notification Service enabled
- `default_sound` - Default notification sound
- `default_badge_count` - Default badge count
- `test_mode` - Test mode flag
- `is_active` - Active status

#### Forms

```js
// Create/Edit push configuration
PushConfigForms.edit.fields;
PushConfigForms.create.fields; // Same as edit
// - name (required)
// - group (collection select)
// - fcm_enabled (switch)
// - fcm_sender_id
// - apns_enabled (switch)
// - default_sound
// - default_badge_count (number)
// - test_mode (switch)
// - is_active (switch)
```

### PushTemplate Model

Templates for push notification messages.

```js
import { PushTemplate, PushTemplateList, PushTemplateForms } from '@core/models/Push.js';
```

#### Properties
- `id` - Template ID
- `name` - Template name
- `category` - Template category
- `group` - Associated group
- `title_template` - Title template string
- `body_template` - Body template string
- `action_url` - Action URL
- `priority` - Priority (high, normal)
- `variables` - Template variables (JSON)
- `is_active` - Active status

#### Forms

```js
// Create/Edit push template
PushTemplateForms.edit.fields;
PushTemplateForms.create.fields; // Same as edit
// - name (required)
// - category (required)
// - group (collection select)
// - title_template (required)
// - body_template (textarea, required)
// - action_url
// - priority (select: high, normal)
// - variables (JSON)
// - is_active (switch)
```

### PushDelivery Model

Push notification delivery tracking.

```js
import { PushDelivery, PushDeliveryList } from '@core/models/Push.js';
```

---

## Logs & Monitoring

### Log Model

System and application logs.

```js
import { Log, LogList } from '@core/models/Log.js';
```

#### Properties
- `id` - Log ID
- `created` - Timestamp (epoch)
- `level` - Log level (info, warning, error)
- `kind` - Log kind/category
- `log` - Log message
- `path` - Request path (for activity logs)
- `model_name` - Related model name
- `model_id` - Related model ID
- `uid` - User ID (for activity logs)

#### Common Query Patterns

```js
// Model-related logs
const logs = new LogList({
    params: {
        model_name: 'account.User',
        model_id: userId
    }
});

// User activity logs
const activityLogs = new LogList({
    params: {
        uid: userId
    }
});

// Logs by level
const errorLogs = new LogList({
    params: {
        level: 'error'
    }
});

// Date range logs
const recentLogs = new LogList({
    params: {
        dr_field: 'created',
        dr_start: '2025-01-01',
        dr_end: '2025-01-31'
    }
});
```

---

## Metrics

### MetricsPermission Model

Permission configuration for metrics access.

```js
import { MetricsPermission, MetricsPermissionList, MetricsForms } from '@core/models/Metrics.js';
```

#### Properties
- `account` - Account identifier (used as ID)
- `view_permissions` - Array of view permissions
- `write_permissions` - Array of write permissions

**Note:** Uses `account` as the ID attribute.

#### Forms

```js
// Edit metrics permissions
MetricsForms.edit.fields;
// - account
// - view_permissions (tags, can include 'public')
// - write_permissions (tags)
```

---

## System

### GeoLocatedIP Model

IP address geolocation lookup.

```js
import { GeoLocatedIP, GeoLocatedIPList } from '@core/models/System.js';
```

#### Properties
- `ip` - IP address
- `city` - City name
- `region` - Region/state
- `country` - Country code
- `country_name` - Country name
- `latitude` - Latitude
- `longitude` - Longitude
- `timezone` - Timezone
- `isp` - ISP name

#### Static Methods

```js
// Lookup IP address
const geoData = await GeoLocatedIP.lookup('8.8.8.8');
if (geoData) {
    console.log(geoData.get('city'));
    console.log(geoData.get('country_name'));
}
```

---

## AWS Integration

### S3Bucket Model

AWS S3 bucket management.

```js
import { S3Bucket, S3BucketList, S3BucketForms } from '@core/models/AWS.js';
```

#### Properties
- `id` - Bucket ID
- `bucket_name` - S3 bucket name
- `is_public` - Public access flag
- `is_active` - Active status

#### Forms

```js
// Create S3 bucket
S3BucketForms.create.fields;
// - bucket_name (required)
// - is_public (switch)

// Edit S3 bucket
S3BucketForms.edit.fields;
// - bucket_name (required)
// - is_public (switch)
```

---

## Import Patterns

### Individual Model Imports

```js
// Import specific models
import { User, UserList } from '@core/models/User.js';
import { Job, JobList, JobForms } from '@core/models/Job.js';
import { Group, GroupList } from '@core/models/Group.js';
```

### Centralized Imports

```js
// Import from index (auto-generated exports)
import { User, UserList, Job, JobList, Group, GroupList } from '@core/models/index.js';

// Also exports base classes
import { Model, Collection, Rest } from '@core/models/index.js';
```

### Base Classes

```js
// Import base classes for custom models
import Model from '@core/Model.js';
import Collection from '@core/Collection.js';

class MyModel extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/mymodel'
        });
    }
}

class MyModelList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: MyModel,
            endpoint: '/api/mymodel',
            ...options
        });
    }
}
```

---

## Common Patterns

### Model CRUD Operations

```js
// Create
const user = new User({ email: 'user@example.com' });
await user.save();

// Read
const user = new User({ id: 123 });
await user.fetch();

// Update
user.set('display_name', 'New Name');
await user.save();

// Delete
await user.destroy();
```

### Collection Operations

```js
// Fetch collection
const users = new UserList({ params: { is_active: true } });
await users.fetch();

// Access models
users.models.forEach(user => {
    console.log(user.get('email'));
});

// Filter
const activeUsers = users.where(user => user.get('is_active'));

// Find
const user = users.findById(123);
```

### Form Integration

```js
// Show model form dialog
const result = await Dialog.showModelForm({
    title: 'Edit User',
    model: user,
    formConfig: UserForms.edit
});

if (result) {
    console.log('User saved successfully');
}
```

### DataView Integration

```js
// Create data view
const dataView = new DataView({
    model: user,
    fields: UserDataView.profile.fields
});

this.addChild(dataView);
```

### TableView Integration

```js
// Create table with collection
const tableView = new TableView({
    collection: users,
    columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'email', label: 'Email', formatter: 'email' },
        { key: 'display_name', label: 'Name' },
        { key: 'is_active', label: 'Status', formatter: 'badge' }
    ]
});

this.addChild(tableView);
```

---

## Summary

All MOJO core models follow consistent patterns:
- **Model**: Represents a single entity with CRUD operations
- **Collection**: Manages lists of models with filtering and pagination
- **Forms**: Pre-configured form definitions for create/edit operations
- **DataView**: Display configurations for showing model data
- **Static References**: Convenient shortcuts like `Model.EDIT_FORM`

Each model is designed to work seamlessly with MOJO's view components (DataView, TableView, FormView) and provides type-safe access to backend APIs through the REST client.
