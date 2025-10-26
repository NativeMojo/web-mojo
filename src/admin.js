/**
 * MOJO Admin Extension - Entry (2.1.0)
 */

// Bundle admin CSS
import '@ext/admin/css/admin.css';

// Admin Pages
export { default as AdminDashboardPage } from '@ext/admin/AdminDashboardPage.js';
export { default as EmailDomainTablePage } from '@ext/admin/EmailDomainTablePage.js';
export { default as EmailMailboxTablePage } from '@ext/admin/EmailMailboxTablePage.js';
export { default as EmailTemplateTablePage } from '@ext/admin/EmailTemplateTablePage.js';
export { default as EventTablePage } from '@ext/admin/EventTablePage.js';
export { default as FileManagerTablePage } from '@ext/admin/FileManagerTablePage.js';
export { default as FileTablePage } from '@ext/admin/FileTablePage.js';
export { default as GeoLocatedIPTablePage } from '@ext/admin/GeoLocatedIPTablePage.js';
export { default as GroupTablePage } from '@ext/admin/GroupTablePage.js';
export { default as IncidentDashboardPage } from '@ext/admin/IncidentDashboardPage.js';
export { default as IncidentTablePage } from '@ext/admin/IncidentTablePage.js';
export { default as JobsAdminPage } from '@ext/admin/JobsAdminPage.js';
export { default as LogTablePage } from '@ext/admin/LogTablePage.js';
export { default as MemberTablePage } from '@ext/admin/MemberTablePage.js';
export { default as MetricsPermissionsTablePage } from '@ext/admin/MetricsPermissionsTablePage.js';
export { default as PushConfigTablePage } from '@ext/admin/PushConfigTablePage.js';
export { default as PushDashboardPage } from '@ext/admin/PushDashboardPage.js';
export { default as PushDeliveryTablePage } from '@ext/admin/PushDeliveryTablePage.js';
export { default as PushDeviceTablePage } from '@ext/admin/PushDeviceTablePage.js';
export { default as PushTemplateTablePage } from '@ext/admin/PushTemplateTablePage.js';
export { default as RuleSetTablePage } from '@ext/admin/RuleSetTablePage.js';
export { default as S3BucketTablePage } from '@ext/admin/S3BucketTablePage.js';
export { default as SentMessageTablePage } from '@ext/admin/SentMessageTablePage.js';
export { default as TaskManagementPage } from '@ext/admin/TaskManagementPage.js';
export { default as TicketTablePage } from '@ext/admin/TicketTablePage.js';
export { default as UserDeviceLocationTablePage } from '@ext/admin/UserDeviceLocationTablePage.js';
export { default as UserDeviceTablePage } from '@ext/admin/UserDeviceTablePage.js';
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



// Import all admin page classes for the register function
import AdminDashboardPageClass from '@ext/admin/AdminDashboardPage.js';
import EmailDomainTablePageClass from '@ext/admin/EmailDomainTablePage.js';
import EmailMailboxTablePageClass from '@ext/admin/EmailMailboxTablePage.js';
import EmailTemplateTablePageClass from '@ext/admin/EmailTemplateTablePage.js';
import EventTablePageClass from '@ext/admin/EventTablePage.js';
import FileManagerTablePageClass from '@ext/admin/FileManagerTablePage.js';
import FileTablePageClass from '@ext/admin/FileTablePage.js';
import GeoLocatedIPTablePageClass from '@ext/admin/GeoLocatedIPTablePage.js';
import GroupTablePageClass from '@ext/admin/GroupTablePage.js';
import IncidentDashboardPageClass from '@ext/admin/IncidentDashboardPage.js';
import IncidentTablePageClass from '@ext/admin/IncidentTablePage.js';
import JobsAdminPageClass from '@ext/admin/JobsAdminPage.js';
import LogTablePageClass from '@ext/admin/LogTablePage.js';
import MemberTablePageClass from '@ext/admin/MemberTablePage.js';
import MetricsPermissionsTablePageClass from '@ext/admin/MetricsPermissionsTablePage.js';
import PushConfigTablePageClass from '@ext/admin/PushConfigTablePage.js';
import PushDashboardPageClass from '@ext/admin/PushDashboardPage.js';
import PushDeliveryTablePageClass from '@ext/admin/PushDeliveryTablePage.js';
import PushDeviceTablePageClass from '@ext/admin/PushDeviceTablePage.js';
import PushTemplateTablePageClass from '@ext/admin/PushTemplateTablePage.js';
import RuleSetTablePageClass from '@ext/admin/RuleSetTablePage.js';
import S3BucketTablePageClass from '@ext/admin/S3BucketTablePage.js';
import SentMessageTablePageClass from '@ext/admin/SentMessageTablePage.js';
import TaskManagementPageClass from '@ext/admin/TaskManagementPage.js';
import TicketTablePageClass from '@ext/admin/TicketTablePage.js';
import UserDeviceLocationTablePageClass from '@ext/admin/UserDeviceLocationTablePage.js';
import UserDeviceTablePageClass from '@ext/admin/UserDeviceTablePage.js';
import UserTablePageClass from '@ext/admin/UserTablePage.js';
import PhoneNumberTablePageClass from '@ext/admin/PhoneNumberTablePage.js';
import SMSTablePageClass from '@ext/admin/SMSTablePage.js';

/**
 * Register all admin pages to a WebApp instance
 * @param {WebApp} app - The WebApp instance to register pages to
 * @returns {void}
 */
export function registerSystemPages(app, addToMenu = true) {
    // Register all admin pages with consistent naming
    app.registerPage('system/dashboard', AdminDashboardPageClass, {permissions: ["view_admin"]});
    app.registerPage('system/jobs', JobsAdminPageClass, {permissions: ["view_jobs", "manage_jobs"]});
    app.registerPage('system/users', UserTablePageClass, {permissions: ["manage_users"]});
    app.registerPage('system/groups', GroupTablePageClass, {permissions: ["manage_groups"]});
    app.registerPage('system/members', MemberTablePageClass, {permissions: ["manage_members"]});
    app.registerPage('system/s3buckets', S3BucketTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/filemanagers', FileManagerTablePageClass, {permissions: ["manage_files"]});
    app.registerPage('system/files', FileTablePageClass, {permissions: ["manage_files"]});
    app.registerPage('system/incidents', IncidentTablePageClass, {permissions: ["view_incidents"]});
    app.registerPage('system/events', EventTablePageClass, {permissions: ["view_incidents"]});
    app.registerPage('system/logs', LogTablePageClass, {permissions: ["view_logs"]});
    app.registerPage('system/user/devices', UserDeviceTablePageClass, {permissions: ["manage_users"]});
    app.registerPage('system/user/device-locations', UserDeviceLocationTablePageClass, {permissions: ["manage_users"]});
    app.registerPage('system/system/geoip', GeoLocatedIPTablePageClass, {permissions: ["manage_users"]});
    app.registerPage('system/email/mailboxes', EmailMailboxTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/email/domains', EmailDomainTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/email/sent', SentMessageTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/email/templates', EmailTemplateTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/incident-dashboard', IncidentDashboardPageClass, { permissions: ["view_incidents"] });
    app.registerPage('system/rulesets', RuleSetTablePageClass, { permissions: ["manage_incidents"] });
    app.registerPage('system/tickets', TicketTablePageClass, { permissions: ["manage_incidents"] });
    app.registerPage('system/metrics/permissions', MetricsPermissionsTablePageClass, { permissions: ["manage_metrics"] });
    app.registerPage('system/push/dashboard', PushDashboardPageClass, { permissions: ["manage_users"] });
    app.registerPage('system/push/configs', PushConfigTablePageClass, { permissions: ["manage_users"] });
    app.registerPage('system/push/templates', PushTemplateTablePageClass, { permissions: ["manage_users"] });
    app.registerPage('system/push/deliveries', PushDeliveryTablePageClass, { permissions: ["manage_users"] });
    app.registerPage('system/push/devices', PushDeviceTablePageClass, { permissions: ["manage_users"] });
    app.registerPage('system/phonehub/numbers', PhoneNumberTablePageClass, { permissions: ["manage_users"] });
    app.registerPage('system/phonehub/sms', SMSTablePageClass, { permissions: ["manage_users"] });

    // Check if sidebar exists and has an admin menu config
    if (addToMenu && app.sidebar && app.sidebar.getMenuConfig) {
        const adminMenuConfig = app.sidebar.getMenuConfig('system');
        if (adminMenuConfig && adminMenuConfig.items) {
            // Add admin pages to sidebar menu
            const adminMenuItems = [
                {
                    text: 'Dashboard',
                    route: '?page=system/dashboard',
                    icon: 'bi-speedometer2',
                    permissions: ["view_admin"]
                },
                {
                    text: 'Jobs Management',
                    route: '?page=system/jobs',
                    icon: 'bi-gear-wide-connected',
                    permissions: ["view_jobs", "manage_jobs"]
                },
                {
                    text: 'Users',
                    route: '?page=system/users',
                    icon: 'bi-people',
                    permissions: ["manage_users"]
                },
                {
                    text: 'Groups',
                    route: '?page=system/groups',
                    icon: 'bi-diagram-3',
                    permissions: ["manage_groups"]
                },
                {
                    text: 'Incidents & Tickets',
                    route: null,
                    icon: 'bi-shield-exclamation',
                    permissions: ["view_incidents"],
                    children: [
                        {
                            text: 'Dashboard',
                            route: '?page=system/incident-dashboard',
                            icon: 'bi-bar-chart-line',
                            permissions: ["view_incidents"]
                        },
                        {
                            text: 'Incidents',
                            route: '?page=system/incidents',
                            icon: 'bi-exclamation-triangle',
                            permissions: ["view_incidents"]
                        },
                        {
                            text: 'Tickets',
                            route: '?page=system/tickets',
                            icon: 'bi-ticket-detailed',
                            permissions: ["manage_incidents"]
                        },
                        {
                            text: 'Events',
                            route: '?page=system/events',
                            icon: 'bi-bell',
                            permissions: ["view_incidents"]
                        },
                        {
                            text: 'Rule Engine',
                            route: '?page=system/rulesets',
                            icon: 'bi-gear-wide-connected',
                            permissions: ["manage_incidents"]
                        },
                    ]
                },
                {
                    text: 'Security',
                    route: null,
                    icon: 'bi-shield',
                    permissions: ["manage_groups"],
                    children: [
                        {
                            text: 'Logs',
                            route: '?page=system/logs',
                            icon: 'bi-journal-text',
                            permissions: ["view_logs"]
                        },
                        {
                            text: 'User Devices',
                            route: '?page=system/user/devices',
                            icon: 'bi-phone',
                            permissions: ["manage_users"]
                        },
                        {
                            text: 'Device Locations',
                            route: '?page=system/user/device-locations',
                            icon: 'bi-geo-alt',
                            permissions: ["manage_users"]
                        },
                        {
                            text: 'GeoIP Cache',
                            route: '?page=system/system/geoip',
                            icon: 'bi-globe',
                            permissions: ["manage_users"]
                        },
                        {
                            text: 'Metrics Permissions',
                            route: '?page=system/metrics/permissions',
                            icon: 'bi-bar-chart-line',
                            permissions: ["manage_metrics"]
                        }
                    ]
                },
                {
                    text: 'Storage',
                    route: null,
                    icon: 'bi-folder',
                    permissions: ["manage_files", "manage_aws"],
                    children: [
                        {
                            text: 'S3 Buckets',
                            route: '?page=system/s3buckets',
                            icon: 'bi-bucket',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Storage Backends',
                            route: '?page=system/filemanagers',
                            icon: 'bi-hdd-stack',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Files',
                            route: '?page=system/files',
                            icon: 'bi-file-earmark',
                            permissions: ["manage_files"]
                        },
                    ]
                },
                {
                    text: 'Push Notifications',
                    route: null,
                    icon: 'bi-broadcast',
                    permissions: ["manage_users"],
                    children: [
                        { text: 'Dashboard', route: '?page=system/push/dashboard', icon: 'bi-bar-chart-line' },
                        { text: 'Configurations', route: '?page=system/push/configs', icon: 'bi-gear' },
                        { text: 'Templates', route: '?page=system/push/templates', icon: 'bi-file-earmark-text' },
                        { text: 'Deliveries', route: '?page=system/push/deliveries', icon: 'bi-send' },
                        { text: 'Devices', route: '?page=system/push/devices', icon: 'bi-phone' },
                    ]
                },
                {
                    text: 'Email Admin',
                    route: null,
                    icon: 'bi-envelope',
                    permissions: ["manage_aws"],
                    children: [
                        {
                            text: 'Domains',
                            route: '?page=system/email/domains',
                            icon: 'bi-globe',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Mailboxes',
                            route: '?page=system/email/mailboxes',
                            icon: 'bi-inbox',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Sent',
                            route: '?page=system/email/sent',
                            icon: 'bi-send-check',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Templates',
                            route: '?page=system/email/templates',
                            icon: 'bi-file-text',
                            permissions: ["manage_aws"]
                        }
                    ]
                },
                {
                    text: 'Phone Hub',
                    route: null,
                    icon: 'bi-telephone',
                    permissions: ["manage_users"],
                    children: [
                        {
                            text: 'Numbers',
                            route: '?page=system/phonehub/numbers',
                            icon: 'bi-collection',
                            permissions: ["manage_users"]
                        },
                        {
                            text: 'SMS',
                            route: '?page=system/phonehub/sms',
                            icon: 'bi-chat-dots',
                            permissions: ["manage_users"]
                        }
                    ]
                }
            ];

            // Add items to existing admin menu
            adminMenuConfig.items.unshift(...adminMenuItems);
        }
    }

}

export { registerSystemPages as registerAdminPages };
