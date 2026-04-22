/**
 * Admin Components - Administrative dashboard and management pages
 * Export all admin components for the MOJO framework
 */

// Account
export { default as AdminDashboardPage } from './account/AdminDashboardPage.js';
export { default as UserTablePage } from './account/users/UserTablePage.js';
export { default as MemberTablePage } from './account/users/MemberTablePage.js';
export { default as GroupTablePage } from './account/groups/GroupTablePage.js';
export { default as UserDeviceTablePage } from './account/devices/UserDeviceTablePage.js';
export { default as UserDeviceLocationTablePage } from './account/devices/UserDeviceLocationTablePage.js';
export { default as GeoLocatedIPTablePage } from './account/devices/GeoLocatedIPTablePage.js';
export { default as ApiKeyTablePage } from './account/api_keys/ApiKeyTablePage.js';
export { default as ApiKeyView } from './account/api_keys/ApiKeyView.js';

// Incidents
export { default as IncidentDashboardPage } from './incidents/IncidentDashboardPage.js';
export { default as IncidentTablePage } from './incidents/IncidentTablePage.js';
export { default as EventTablePage } from './incidents/EventTablePage.js';
export { default as TicketTablePage } from './incidents/TicketTablePage.js';
export { default as RuleSetTablePage } from './incidents/RuleSetTablePage.js';

// Messaging - Email
export { default as EmailDomainTablePage } from './messaging/email/EmailDomainTablePage.js';
export { default as EmailMailboxTablePage } from './messaging/email/EmailMailboxTablePage.js';
export { default as EmailTemplateTablePage } from './messaging/email/EmailTemplateTablePage.js';
export { default as SentMessageTablePage } from './messaging/email/SentMessageTablePage.js';

// Messaging - Public (visitor contact/support submissions)
export { default as PublicMessageTablePage } from './messaging/PublicMessageTablePage.js';
export { default as PublicMessageView } from './messaging/PublicMessageView.js';

// Messaging - SMS
export { default as PhoneNumberTablePage } from './messaging/sms/PhoneNumberTablePage.js';
export { default as SMSTablePage } from './messaging/sms/SMSTablePage.js';

// Messaging - Push
export { default as PushDashboardPage } from './messaging/push/PushDashboardPage.js';
export { default as PushConfigTablePage } from './messaging/push/PushConfigTablePage.js';
export { default as PushTemplateTablePage } from './messaging/push/PushTemplateTablePage.js';
export { default as PushDeliveryTablePage } from './messaging/push/PushDeliveryTablePage.js';
export { default as PushDeviceTablePage } from './messaging/push/PushDeviceTablePage.js';

// Jobs
export { default as JobDashboardPage } from './jobs/JobDashboardPage.js';
export { default as JobRunnersPage } from './jobs/JobRunnersPage.js';
export { default as JobsTablePage } from './jobs/JobsTablePage.js';
export { default as RunnerDetailsView } from './jobs/RunnerDetailsView.js';

// Security
export { default as BlockedIPsTablePage } from './security/BlockedIPsTablePage.js';
export { default as FirewallLogTablePage } from './security/FirewallLogTablePage.js';
export { default as BouncerSignalTablePage } from './security/BouncerSignalTablePage.js';
export { default as BouncerDeviceTablePage } from './security/BouncerDeviceTablePage.js';
export { default as BotSignatureTablePage } from './security/BotSignatureTablePage.js';
export { default as BouncerSignalView } from './security/BouncerSignalView.js';
export { default as BouncerDeviceView } from './security/BouncerDeviceView.js';
export { default as IPSetTablePage } from './security/IPSetTablePage.js';
export { default as IPSetView } from './security/IPSetView.js';

// Monitoring
export { default as LogTablePage } from './monitoring/LogTablePage.js';
export { default as MetricsPermissionsTablePage } from './monitoring/MetricsPermissionsTablePage.js';

// Storage
export { default as FileManagerTablePage } from './storage/FileManagerTablePage.js';
export { default as FileTablePage } from './storage/FileTablePage.js';
export { default as S3BucketTablePage } from './storage/S3BucketTablePage.js';
