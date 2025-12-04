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
export { default as JobsAdminPage } from './jobs/JobsAdminPage.js';
export { default as TaskManagementPage } from './jobs/TaskManagementPage.js';

// Monitoring
export { default as LogTablePage } from './monitoring/LogTablePage.js';
export { default as MetricsPermissionsTablePage } from './monitoring/MetricsPermissionsTablePage.js';

// Storage
export { default as FileManagerTablePage } from './storage/FileManagerTablePage.js';
export { default as FileTablePage } from './storage/FileTablePage.js';
export { default as S3BucketTablePage } from './storage/S3BucketTablePage.js';
