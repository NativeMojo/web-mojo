/**
 * MOJO Admin Extension - Entry (2.1.0)
 */

// Bundle admin CSS
import '@ext/admin/css/admin.css';

// Admin Pages
export { default as AdminDashboardPage } from '@ext/admin/AdminDashboardPage.js';
export { default as EmailDomainTablePage } from '@ext/admin/EmailDomainTablePage.js';
export { default as IncidentDashboardPage } from '@ext/admin/IncidentDashboardPage.js';
export { default as JobsAdminPage } from '@ext/admin/JobsAdminPage.js';
export { default as PushDashboardPage } from '@ext/admin/PushDashboardPage.js';
export { default as TaskManagementPage } from '@ext/admin/TaskManagementPage.js';
export { default as UserTablePage } from '@ext/admin/UserTablePage.js';

// Admin Views
export { default as DeviceView } from '@ext/admin/views/DeviceView.js';
export { default as EmailTemplateView } from '@ext/admin/views/EmailTemplateView.js';
export { default as EmailView } from '@ext/admin/views/EmailView.js';
export { default as EventView } from '@ext/admin/views/EventView.js';
export { default as FileView } from '@ext/admin/views/FileView.js';
export { default as GeoIPView } from '@ext/admin/views/GeoIPView.js';
export { default as GroupView } from '@ext/admin/views/GroupView.js';
export { default as IncidentView } from '@ext/admin/views/IncidentView.js';
export { default as JobDetailsView } from '@ext/admin/views/JobDetailsView.js';
export { default as JobHealthView } from '@ext/admin/views/JobHealthView.js';
export { default as JobStatsView } from '@ext/admin/views/JobStatsView.js';
export { default as LogView } from '@ext/admin/views/LogView.js';
export { default as MemberView } from '@ext/admin/views/MemberView.js';
export { default as MetricsPermissionsView } from '@ext/admin/views/MetricsPermissionsView.js';
export { default as PushDeliveryView } from '@ext/admin/views/PushDeliveryView.js';
export { default as PushDeviceView } from '@ext/admin/views/PushDeviceView.js';
export { default as RuleSetView } from '@ext/admin/views/RuleSetView.js';
export { default as TicketView } from '@ext/admin/views/TicketView.js';
export { default as UserView } from '@ext/admin/views/UserView.js';

// Admin Components
export { default as RunnerDetailsView } from '@ext/admin/RunnerDetailsView.js';
export { default as TaskDetailsView } from '@ext/admin/TaskDetailsView.js';

// Convenience
export { default as WebApp } from '@core/WebApp.js';

// Version info passthrough
export {
  VERSION_INFO,
  VERSION,
  VERSION_MAJOR,
  VERSION_MINOR,
  VERSION_REVISION,
  BUILD_TIME
} from './version.js';