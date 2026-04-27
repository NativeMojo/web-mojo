/**
 * MOJO Admin Extension - Entry (2.1.0)
 */

// Bundle admin CSS
import '@ext/admin/css/admin.css';

// Admin Pages
export { default as AdminDashboardPage } from '@ext/admin/account/AdminDashboardPage.js';
export { default as UserTablePage } from '@ext/admin/account/users/UserTablePage.js';
export { default as MemberTablePage } from '@ext/admin/account/users/MemberTablePage.js';
export { default as GroupTablePage } from '@ext/admin/account/groups/GroupTablePage.js';
export { default as UserDeviceTablePage } from '@ext/admin/account/devices/UserDeviceTablePage.js';
export { default as UserDeviceLocationTablePage } from '@ext/admin/account/devices/UserDeviceLocationTablePage.js';
export { default as GeoLocatedIPTablePage } from '@ext/admin/account/devices/GeoLocatedIPTablePage.js';
export { default as ApiKeyTablePage } from '@ext/admin/account/api_keys/ApiKeyTablePage.js';

export { default as CloudWatchDashboardPage } from '@ext/admin/aws/CloudWatchDashboardPage.js';
export { default as CloudWatchChart } from '@ext/admin/aws/CloudWatchChart.js';

export { default as IncidentDashboardPage } from '@ext/admin/incidents/dashboard/SecurityDashboardPage.js';
export { default as IncidentTablePage } from '@ext/admin/incidents/IncidentTablePage.js';
export { default as EventTablePage } from '@ext/admin/incidents/EventTablePage.js';
export { default as TicketTablePage } from '@ext/admin/incidents/TicketTablePage.js';
export { default as RuleSetTablePage } from '@ext/admin/incidents/RuleSetTablePage.js';

export { default as EmailDomainTablePage } from '@ext/admin/messaging/email/EmailDomainTablePage.js';
export { default as EmailMailboxTablePage } from '@ext/admin/messaging/email/EmailMailboxTablePage.js';
export { default as EmailTemplateTablePage } from '@ext/admin/messaging/email/EmailTemplateTablePage.js';
export { default as SentMessageTablePage } from '@ext/admin/messaging/email/SentMessageTablePage.js';
export { default as PublicMessageTablePage } from '@ext/admin/messaging/PublicMessageTablePage.js';
export { default as PhoneNumberTablePage } from '@ext/admin/messaging/sms/PhoneNumberTablePage.js';
export { default as SMSTablePage } from '@ext/admin/messaging/sms/SMSTablePage.js';
export { default as PushDashboardPage } from '@ext/admin/messaging/push/PushDashboardPage.js';
export { default as PushConfigTablePage } from '@ext/admin/messaging/push/PushConfigTablePage.js';
export { default as PushTemplateTablePage } from '@ext/admin/messaging/push/PushTemplateTablePage.js';
export { default as PushDeliveryTablePage } from '@ext/admin/messaging/push/PushDeliveryTablePage.js';
export { default as PushDeviceTablePage } from '@ext/admin/messaging/push/PushDeviceTablePage.js';

export { default as JobDashboardPage } from '@ext/admin/jobs/JobDashboardPage.js';
export { default as JobRunnersPage } from '@ext/admin/jobs/JobRunnersPage.js';
export { default as JobsTablePage } from '@ext/admin/jobs/JobsTablePage.js';
export { default as RunnerDetailsView } from '@ext/admin/jobs/RunnerDetailsView.js';
export { default as ScheduledTaskTablePage } from '@ext/admin/jobs/ScheduledTaskTablePage.js';

// Security Pages
export { default as BlockedIPsTablePage } from '@ext/admin/security/BlockedIPsTablePage.js';
export { default as FirewallLogTablePage } from '@ext/admin/security/FirewallLogTablePage.js';
export { default as BouncerSignalTablePage } from '@ext/admin/security/BouncerSignalTablePage.js';
export { default as BouncerDeviceTablePage } from '@ext/admin/security/BouncerDeviceTablePage.js';
export { default as BotSignatureTablePage } from '@ext/admin/security/BotSignatureTablePage.js';
export { default as IPSetTablePage } from '@ext/admin/security/IPSetTablePage.js';

// Security Views
export { default as BouncerSignalView } from '@ext/admin/security/BouncerSignalView.js';
export { default as BouncerDeviceView } from '@ext/admin/security/BouncerDeviceView.js';
export { default as HandlerBuilderView } from '@ext/admin/security/HandlerBuilderView.js';
export { default as IPSetView } from '@ext/admin/security/IPSetView.js';

export { default as LogTablePage } from '@ext/admin/monitoring/LogTablePage.js';
export { default as MetricsPermissionsTablePage } from '@ext/admin/monitoring/MetricsPermissionsTablePage.js';

export { default as SettingTablePage } from '@ext/admin/settings/SettingTablePage.js';

export { default as FileManagerTablePage } from '@ext/admin/storage/FileManagerTablePage.js';
export { default as FileTablePage } from '@ext/admin/storage/FileTablePage.js';
export { default as S3BucketTablePage } from '@ext/admin/storage/S3BucketTablePage.js';

export { default as ShortLinkTablePage } from '@ext/admin/shortlinks/ShortLinkTablePage.js';
export { default as ShortLinkClickTablePage } from '@ext/admin/shortlinks/ShortLinkClickTablePage.js';
export { default as ShortLinkView } from '@ext/admin/shortlinks/ShortLinkView.js';

// Admin Views
export { default as DeviceView } from '@ext/admin/account/devices/DeviceView.js';
export { default as GeoIPView } from '@ext/admin/account/devices/GeoIPView.js';
export { default as UserDeviceLocationView } from '@ext/admin/account/devices/UserDeviceLocationView.js';
export { default as GroupView } from '@ext/admin/account/groups/GroupView.js';
export { default as ApiKeyView } from '@ext/admin/account/api_keys/ApiKeyView.js';
export { default as CloudWatchResourceView } from '@ext/admin/aws/CloudWatchResourceView.js';
export { default as MemberView } from '@ext/admin/account/users/MemberView.js';
export { default as UserView } from '@ext/admin/account/users/UserView.js';

export { default as IncidentView } from '@ext/admin/incidents/IncidentView.js';
export { default as EventView } from '@ext/admin/incidents/EventView.js';
export { default as TicketView } from '@ext/admin/incidents/TicketView.js';
export { default as RuleSetView } from '@ext/admin/incidents/RuleSetView.js';

export { default as EmailTemplateView } from '@ext/admin/messaging/email/EmailTemplateView.js';
export { default as EmailView } from '@ext/admin/messaging/email/EmailView.js';
export { default as PublicMessageView } from '@ext/admin/messaging/PublicMessageView.js';
export { default as PhoneNumberView } from '@ext/admin/messaging/sms/PhoneNumberView.js';
export { default as PushDeliveryView } from '@ext/admin/messaging/push/PushDeliveryView.js';
export { default as PushDeviceView } from '@ext/admin/messaging/push/PushDeviceView.js';

export { default as JobDetailsView } from '@ext/admin/jobs/JobDetailsView.js';
export { default as JobHealthView } from '@ext/admin/jobs/JobHealthView.js';
export { default as JobStatsView } from '@ext/admin/jobs/JobStatsView.js';
export { default as ScheduledTaskView } from '@ext/admin/jobs/ScheduledTaskView.js';

export { default as LogView } from '@ext/admin/monitoring/LogView.js';
export { default as MetricsPermissionsView } from '@ext/admin/monitoring/MetricsPermissionsView.js';

export { default as SettingView } from '@ext/admin/settings/SettingView.js';

export { default as FileView } from '@core/views/data/FileView.js';

// Assistant
export { default as AssistantView } from '@ext/admin/assistant/AssistantView.js';
export { default as AssistantSkillTablePage } from '@ext/admin/assistant/AssistantSkillTablePage.js';
export { default as AssistantSkillView } from '@ext/admin/assistant/AssistantSkillView.js';
export { default as AssistantConversationTablePage } from '@ext/admin/assistant/AssistantConversationTablePage.js';
export { default as AssistantConversationView } from '@ext/admin/assistant/AssistantConversationView.js';
export { default as AssistantMemoryPage } from '@ext/admin/assistant/AssistantMemoryPage.js';

// Admin Components
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
import AdminDashboardPageClass from '@ext/admin/account/AdminDashboardPage.js';
import UserTablePageClass from '@ext/admin/account/users/UserTablePage.js';
import MemberTablePageClass from '@ext/admin/account/users/MemberTablePage.js';
import GroupTablePageClass from '@ext/admin/account/groups/GroupTablePage.js';
import UserDeviceTablePageClass from '@ext/admin/account/devices/UserDeviceTablePage.js';
import UserDeviceLocationTablePageClass from '@ext/admin/account/devices/UserDeviceLocationTablePage.js';
import GeoLocatedIPTablePageClass from '@ext/admin/account/devices/GeoLocatedIPTablePage.js';
import ApiKeyTablePageClass from '@ext/admin/account/api_keys/ApiKeyTablePage.js';
import CloudWatchDashboardPageClass from '@ext/admin/aws/CloudWatchDashboardPage.js';

import IncidentDashboardPageClass from '@ext/admin/incidents/dashboard/SecurityDashboardPage.js';
import IncidentTablePageClass from '@ext/admin/incidents/IncidentTablePage.js';
import EventTablePageClass from '@ext/admin/incidents/EventTablePage.js';
import TicketTablePageClass from '@ext/admin/incidents/TicketTablePage.js';
import RuleSetTablePageClass from '@ext/admin/incidents/RuleSetTablePage.js';

import EmailDomainTablePageClass from '@ext/admin/messaging/email/EmailDomainTablePage.js';
import EmailMailboxTablePageClass from '@ext/admin/messaging/email/EmailMailboxTablePage.js';
import EmailTemplateTablePageClass from '@ext/admin/messaging/email/EmailTemplateTablePage.js';
import SentMessageTablePageClass from '@ext/admin/messaging/email/SentMessageTablePage.js';
import PublicMessageTablePageClass from '@ext/admin/messaging/PublicMessageTablePage.js';
import PhoneNumberTablePageClass from '@ext/admin/messaging/sms/PhoneNumberTablePage.js';
import SMSTablePageClass from '@ext/admin/messaging/sms/SMSTablePage.js';
import PushDashboardPageClass from '@ext/admin/messaging/push/PushDashboardPage.js';
import PushConfigTablePageClass from '@ext/admin/messaging/push/PushConfigTablePage.js';
import PushTemplateTablePageClass from '@ext/admin/messaging/push/PushTemplateTablePage.js';
import PushDeliveryTablePageClass from '@ext/admin/messaging/push/PushDeliveryTablePage.js';
import PushDeviceTablePageClass from '@ext/admin/messaging/push/PushDeviceTablePage.js';

import JobDashboardPageClass from '@ext/admin/jobs/JobDashboardPage.js';
import JobRunnersPageClass from '@ext/admin/jobs/JobRunnersPage.js';
import JobsTablePageClass from '@ext/admin/jobs/JobsTablePage.js';
import ScheduledTaskTablePageClass from '@ext/admin/jobs/ScheduledTaskTablePage.js';

import BlockedIPsTablePageClass from '@ext/admin/security/BlockedIPsTablePage.js';
import FirewallLogTablePageClass from '@ext/admin/security/FirewallLogTablePage.js';
import BouncerSignalTablePageClass from '@ext/admin/security/BouncerSignalTablePage.js';
import BouncerDeviceTablePageClass from '@ext/admin/security/BouncerDeviceTablePage.js';
import BotSignatureTablePageClass from '@ext/admin/security/BotSignatureTablePage.js';
import IPSetTablePageClass from '@ext/admin/security/IPSetTablePage.js';

import LogTablePageClass from '@ext/admin/monitoring/LogTablePage.js';
import MetricsPermissionsTablePageClass from '@ext/admin/monitoring/MetricsPermissionsTablePage.js';

import SettingTablePageClass from '@ext/admin/settings/SettingTablePage.js';

import FileManagerTablePageClass from '@ext/admin/storage/FileManagerTablePage.js';
import FileTablePageClass from '@ext/admin/storage/FileTablePage.js';
import S3BucketTablePageClass from '@ext/admin/storage/S3BucketTablePage.js';

import ShortLinkTablePageClass from '@ext/admin/shortlinks/ShortLinkTablePage.js';
import ShortLinkClickTablePageClass from '@ext/admin/shortlinks/ShortLinkClickTablePage.js';

import AssistantSkillTablePageClass from '@ext/admin/assistant/AssistantSkillTablePage.js';
import AssistantConversationTablePageClass from '@ext/admin/assistant/AssistantConversationTablePage.js';
import AssistantMemoryPageClass from '@ext/admin/assistant/AssistantMemoryPage.js';

/**
 * Register all admin pages to a WebApp instance
 * @param {WebApp} app - The WebApp instance to register pages to
 * @returns {void}
 */
export function registerSystemPages(app, addToMenu = true) {
    // Register all admin pages with consistent naming
    // Permissions align with django-mojo backend: category perms (security, users, groups, etc.)
    // and fine-grained perms (view_security, manage_users, etc.)
    app.registerPage('system/dashboard', AdminDashboardPageClass, {permissions: ["security"]});
    app.registerPage('system/jobs/dashboard', JobDashboardPageClass, {permissions: ["view_jobs", "manage_jobs"]});
    app.registerPage('system/jobs/runners', JobRunnersPageClass, {permissions: ["view_jobs"]});
    app.registerPage('system/jobs/list', JobsTablePageClass, {permissions: ["view_jobs"]});
    app.registerPage('system/jobs/scheduled-tasks', ScheduledTaskTablePageClass, {permissions: ["view_scheduled_tasks", "manage_scheduled_tasks"]});
    app.registerPage('system/users', UserTablePageClass, {permissions: ["view_users", "manage_users"]});
    app.registerPage('system/groups', GroupTablePageClass, {permissions: ["view_groups", "manage_groups"]});
    app.registerPage('system/members', MemberTablePageClass, {permissions: ["view_members", "manage_groups"]});
    app.registerPage('system/s3buckets', S3BucketTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/filemanagers', FileManagerTablePageClass, {permissions: ["view_fileman", "manage_files"]});
    app.registerPage('system/files', FileTablePageClass, {permissions: ["manage_files"]});
    app.registerPage('system/shortlinks/links', ShortLinkTablePageClass, {permissions: ["manage_shortlinks"]});
    app.registerPage('system/shortlinks/clicks', ShortLinkClickTablePageClass, {permissions: ["manage_shortlinks"]});
    app.registerPage('system/incidents', IncidentTablePageClass, {permissions: ["view_security"]});
    app.registerPage('system/events', EventTablePageClass, {permissions: ["view_security"]});
    app.registerPage('system/logs', LogTablePageClass, {permissions: ["view_logs"]});
    app.registerPage('system/user/devices', UserDeviceTablePageClass, {permissions: ["manage_users"]});
    app.registerPage('system/user/device-locations', UserDeviceLocationTablePageClass, {permissions: ["manage_users"]});
    app.registerPage('system/system/geoip', GeoLocatedIPTablePageClass, {permissions: ["view_security", "manage_users"]});
    app.registerPage('system/email/mailboxes', EmailMailboxTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/email/domains', EmailDomainTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/email/sent', SentMessageTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/email/templates', EmailTemplateTablePageClass, {permissions: ["manage_aws"]});
    app.registerPage('system/messaging/public-messages', PublicMessageTablePageClass, {permissions: ["view_support", "support", "security"]});
    app.registerPage('system/incident-dashboard', IncidentDashboardPageClass, { permissions: ["view_security"] });
    app.registerPage('system/rulesets', RuleSetTablePageClass, { permissions: ["manage_security"] });
    app.registerPage('system/tickets', TicketTablePageClass, { permissions: ["manage_security"] });
    app.registerPage('system/metrics/permissions', MetricsPermissionsTablePageClass, { permissions: ["manage_metrics"] });
    app.registerPage('system/push/dashboard', PushDashboardPageClass, { permissions: ["manage_notifications"] });
    app.registerPage('system/push/configs', PushConfigTablePageClass, { permissions: ["manage_push_config"] });
    app.registerPage('system/push/templates', PushTemplateTablePageClass, { permissions: ["manage_notifications"] });
    app.registerPage('system/push/deliveries', PushDeliveryTablePageClass, { permissions: ["view_notifications", "manage_notifications"] });
    app.registerPage('system/push/devices', PushDeviceTablePageClass, { permissions: ["view_devices", "manage_devices"] });
    app.registerPage('system/phonehub/numbers', PhoneNumberTablePageClass, { permissions: ["view_phone_numbers", "manage_phone_numbers"] });
    app.registerPage('system/phonehub/sms', SMSTablePageClass, { permissions: ["view_sms", "manage_sms"] });
    app.registerPage('system/api-keys', ApiKeyTablePageClass, { permissions: ["manage_groups", "manage_group"] });
    app.registerPage('system/settings', SettingTablePageClass, { permissions: ["manage_settings"] });
    app.registerPage('system/cloudwatch', CloudWatchDashboardPageClass, { permissions: ["manage_aws"] });

    // Security pages
    app.registerPage('system/security/blocked-ips', BlockedIPsTablePageClass, { permissions: ["view_security"] });
    app.registerPage('system/security/firewall-log', FirewallLogTablePageClass, { permissions: ["view_security"] });
    app.registerPage('system/security/bouncer-signals', BouncerSignalTablePageClass, { permissions: ["view_security"] });
    app.registerPage('system/security/bouncer-devices', BouncerDeviceTablePageClass, { permissions: ["view_security"] });
    app.registerPage('system/security/bot-signatures', BotSignatureTablePageClass, { permissions: ["manage_security"] });
    app.registerPage('system/security/ipsets', IPSetTablePageClass, { permissions: ["view_security"] });

    // Assistant management pages
    app.registerPage('system/assistant/skills', AssistantSkillTablePageClass, { permissions: ["view_admin", "assistant"] });
    app.registerPage('system/assistant/conversations', AssistantConversationTablePageClass, { permissions: ["view_admin", "assistant"] });
    app.registerPage('system/assistant/memory', AssistantMemoryPageClass, { permissions: ["view_admin", "assistant"] });

    // Check if sidebar exists and has an admin menu config
    if (addToMenu && app.sidebar && app.sidebar.getMenuConfig) {
        const adminMenuConfig = app.sidebar.getMenuConfig('system');
        if (adminMenuConfig && adminMenuConfig.items) {
            // Add admin pages to sidebar menu
            const adminMenuItems = [
                // ── Top-level (daily-use pages) ──
                {
                    text: 'Dashboard',
                    route: '?page=system/dashboard',
                    icon: 'bi-speedometer2',
                    permissions: ["security"]
                },
                {
                    text: 'Users',
                    route: '?page=system/users',
                    icon: 'bi-people',
                    permissions: ["view_users", "manage_users"]
                },
                {
                    text: 'Groups',
                    route: '?page=system/groups',
                    icon: 'bi-diagram-3',
                    permissions: ["view_groups", "manage_groups"]
                },
                {
                    text: 'Job Engine',
                    route: null,
                    icon: 'bi-gear-wide-connected',
                    permissions: ["view_jobs", "manage_jobs"],
                    children: [
                        { text: 'Dashboard', route: '?page=system/jobs/dashboard', icon: 'bi-bar-chart-line', permissions: ["jobs", "view_jobs", "manage_jobs"] },
                        { text: 'Runners', route: '?page=system/jobs/runners', icon: 'bi-cpu', permissions: ["jobs", "view_jobs", "manage_jobs"] },
                        { text: 'Jobs', route: '?page=system/jobs/list', icon: 'bi-list-task', permissions: ["jobs", "view_jobs", "manage_jobs"] },
                        { text: 'Scheduled Tasks', route: '?page=system/jobs/scheduled-tasks', icon: 'bi-clock-history', permissions: ["jobs", "view_jobs", "manage_jobs"] },
                    ]
                },

                // ── Security (unified threat pipeline) ──
                {
                    text: 'Security',
                    route: null,
                    icon: 'bi-shield-lock',
                    permissions: ["view_security"],
                    children: [
                        { text: 'Dashboard', route: '?page=system/incident-dashboard', icon: 'bi-bar-chart-line', permissions: ["view_security"] },
                        { text: 'Incidents', route: '?page=system/incidents', icon: 'bi-exclamation-triangle', permissions: ["view_security"] },
                        { text: 'Tickets', route: '?page=system/tickets', icon: 'bi-ticket-detailed', permissions: ["manage_security"] },
                        { text: 'Events', route: '?page=system/events', icon: 'bi-bell', permissions: ["view_security"] },
                        { text: 'Rule Engine', route: '?page=system/rulesets', icon: 'bi-funnel', permissions: ["manage_security"] },
                        { text: 'Blocked IPs', route: '?page=system/security/blocked-ips', icon: 'bi-slash-circle', permissions: ["view_security"] },
                        { text: 'IP Sets', route: '?page=system/security/ipsets', icon: 'bi-shield-shaded', permissions: ["view_security"] },
                        { text: 'Firewall Log', route: '?page=system/security/firewall-log', icon: 'bi-journal-code', permissions: ["view_security"] },
                        { text: 'GeoIP', route: '?page=system/system/geoip', icon: 'bi-globe', permissions: ["view_security"] },
                        { text: 'Bouncer Signals', route: '?page=system/security/bouncer-signals', icon: 'bi-activity', permissions: ["view_security"] },
                        { text: 'Bouncer Devices', route: '?page=system/security/bouncer-devices', icon: 'bi-fingerprint', permissions: ["view_security"] },
                        { text: 'Bot Signatures', route: '?page=system/security/bot-signatures', icon: 'bi-robot', permissions: ["manage_security"] },
                    ]
                },

                // ── Messaging ──
                {
                    text: 'Messaging',
                    route: null,
                    icon: 'bi-envelope',
                    permissions: ["manage_aws", "view_support", "support"],
                    children: [
                        { text: 'Domains', route: '?page=system/email/domains', icon: 'bi-globe', permissions: ["manage_aws"] },
                        { text: 'Mailboxes', route: '?page=system/email/mailboxes', icon: 'bi-inbox', permissions: ["manage_aws"] },
                        { text: 'Sent', route: '?page=system/email/sent', icon: 'bi-send-check', permissions: ["manage_aws"] },
                        { text: 'Templates', route: '?page=system/email/templates', icon: 'bi-file-text', permissions: ["manage_aws"] },
                        { text: 'Contact Messages', route: '?page=system/messaging/public-messages', icon: 'bi-chat-square-text', permissions: ["view_support", "support"] },
                    ]
                },

                // ── Push Notifications ──
                {
                    text: 'Push Notifications',
                    route: null,
                    icon: 'bi-broadcast',
                    permissions: ["manage_notifications", "manage_push_config"],
                    children: [
                        { text: 'Dashboard', route: '?page=system/push/dashboard', icon: 'bi-bar-chart-line', permissions: ["manage_notifications"] },
                        { text: 'Configurations', route: '?page=system/push/configs', icon: 'bi-gear', permissions: ["manage_push_config"] },
                        { text: 'Templates', route: '?page=system/push/templates', icon: 'bi-file-earmark-text', permissions: ["manage_notifications"] },
                        { text: 'Deliveries', route: '?page=system/push/deliveries', icon: 'bi-send', permissions: ["view_notifications", "manage_notifications"] },
                        { text: 'Devices', route: '?page=system/push/devices', icon: 'bi-phone', permissions: ["view_devices", "manage_devices"] },
                    ]
                },

                // ── Shortlinks ──
                {
                    text: 'Shortlinks',
                    route: null,
                    icon: 'bi-link-45deg',
                    permissions: ["manage_shortlinks"],
                    children: [
                        { text: 'Links', route: '?page=system/shortlinks/links', icon: 'bi-link', permissions: ["manage_shortlinks"] },
                        { text: 'Click History', route: '?page=system/shortlinks/clicks', icon: 'bi-cursor', permissions: ["manage_shortlinks"] },
                    ]
                },

                // ── Phone Hub ──
                {
                    text: 'Phone Hub',
                    route: null,
                    icon: 'bi-telephone',
                    permissions: ["view_phone_numbers", "manage_phone_numbers"],
                    children: [
                        { text: 'Numbers', route: '?page=system/phonehub/numbers', icon: 'bi-collection', permissions: ["view_phone_numbers", "manage_phone_numbers"] },
                        { text: 'SMS', route: '?page=system/phonehub/sms', icon: 'bi-chat-dots', permissions: ["view_sms", "manage_sms"] },
                    ]
                },

                // ── Storage ──
                {
                    text: 'Storage',
                    route: null,
                    icon: 'bi-folder',
                    permissions: ["manage_files", "manage_aws"],
                    children: [
                        { text: 'S3 Buckets', route: '?page=system/s3buckets', icon: 'bi-bucket', permissions: ["manage_aws"] },
                        { text: 'Storage Backends', route: '?page=system/filemanagers', icon: 'bi-hdd-stack', permissions: ["view_fileman", "manage_files"] },
                        { text: 'Files', route: '?page=system/files', icon: 'bi-file-earmark', permissions: ["manage_files"] },
                    ]
                },

                // ── AI Assistant ──
                {
                    text: 'AI Assistant',
                    route: null,
                    icon: 'bi-robot',
                    permissions: ["view_admin", "assistant"],
                    children: [
                        { text: 'Skills', route: '?page=system/assistant/skills', icon: 'bi-lightning', permissions: ["view_admin", "assistant"] },
                        { text: 'Memory', route: '?page=system/assistant/memory', icon: 'bi-lightbulb', permissions: ["view_admin", "assistant"] },
                        { text: 'Conversations', route: '?page=system/assistant/conversations', icon: 'bi-chat-left-text', permissions: ["view_admin", "assistant"] },
                    ]
                },

                // ── System (infrastructure & ops) ──
                {
                    text: 'System',
                    route: null,
                    icon: 'bi-wrench-adjustable',
                    permissions: ["view_logs", "manage_settings", "manage_groups"],
                    children: [
                        { text: 'Logs', route: '?page=system/logs', icon: 'bi-journal-text', permissions: ["view_logs"] },
                        { text: 'API Keys', route: '?page=system/api-keys', icon: 'bi-key', permissions: ["manage_groups", "manage_group"] },
                        { text: 'User Devices', route: '?page=system/user/devices', icon: 'bi-phone', permissions: ["manage_users"] },
                        { text: 'Device Locations', route: '?page=system/user/device-locations', icon: 'bi-geo-alt', permissions: ["manage_users"] },
                        { text: 'Metrics Permissions', route: '?page=system/metrics/permissions', icon: 'bi-bar-chart-line', permissions: ["manage_metrics"] },
                        { text: 'Settings', route: '?page=system/settings', icon: 'bi-gear', permissions: ["manage_settings"] },
                        { text: 'CloudWatch', route: '?page=system/cloudwatch', icon: 'bi-cloud', permissions: ["manage_aws"] },
                    ]
                },
            ];

            // Add items to existing admin menu
            adminMenuConfig.items.unshift(...adminMenuItems);
        }
    }

}

export { registerSystemPages as registerAdminPages };

/**
 * Register the Admin Assistant topbar button
 * Auto-selects display mode based on viewport width:
 *   >= 1000px → right sidebar panel (reflow layout)
 *   <  1000px → fullscreen modal
 * Requires `view_admin` permission.
 *
 * @param {WebApp} app - The WebApp/PortalApp instance
 */
export function registerAssistant(app) {

    // ── Sidebar panel helpers ────────────────────────────────

    function closeSidebarPanel() {
        if (!app._assistantPanel) return;
        const layout = document.querySelector('.portal-layout');
        if (layout) layout.classList.remove('assistant-panel-open');
        app._assistantPanel.destroy();
        app._assistantPanel = null;
        const panelEl = document.getElementById('assistant-panel');
        if (panelEl) panelEl.remove();
    }

    async function openSidebarPanel() {
        // If already open, just focus
        if (app._assistantPanel && app._assistantPanel.isMounted()) {
            app._assistantPanel.focusInput();
            return;
        }

        const { default: AssistantPanelView } = await import('@ext/admin/assistant/AssistantPanelView.js');

        // Create mount point inside .portal-layout
        const layout = document.querySelector('.portal-layout');
        if (!layout) return openFullscreenModal(); // fallback

        let panelEl = document.getElementById('assistant-panel');
        if (!panelEl) {
            panelEl = document.createElement('div');
            panelEl.id = 'assistant-panel';
            layout.appendChild(panelEl);
        }

        const view = new AssistantPanelView({ app });
        view.on('panel:close', () => closeSidebarPanel());
        view.on('panel:fullscreen', () => openFullscreenModal());
        view.on('panel:popout', (data) => openPopupWindow(data?.conversationId));
        await view.render(true, panelEl);
        app._assistantPanel = view;

        // Restore saved width before triggering open transition
        const savedWidth = localStorage.getItem('mojo:assistant_panel_width');
        if (savedWidth) {
            const w = parseInt(savedWidth, 10);
            if (w >= 300 && w <= 700) panelEl.style.width = '0px'; // start from 0 for transition
        }

        // Trigger reflow transition
        requestAnimationFrame(() => {
            layout.classList.add('assistant-panel-open');
            if (savedWidth) {
                const w = parseInt(savedWidth, 10);
                if (w >= 300 && w <= 700) panelEl.style.width = w + 'px';
            }
        });
    }

    async function openPopupWindow(conversationId) {
        // Close sidebar first
        closeSidebarPanel();

        const popup = window.open('', 'mojo-assistant',
            'width=480,height=700,toolbar=no,menubar=no,status=no,location=no,resizable=yes');

        if (!popup) {
            // Popup blocked — fall back to sidebar or fullscreen
            if (app.toast) app.toast.warning('Popup blocked — opening sidebar instead');
            if (window.innerWidth >= 1000) {
                await openSidebarPanel();
            } else {
                await openFullscreenModal();
            }
            return;
        }

        // Write minimal document into the popup
        const styles = document.querySelectorAll('link[rel="stylesheet"], style');
        let styleHTML = '';
        styles.forEach(s => {
            if (s.tagName === 'LINK') {
                styleHTML += `<link rel="stylesheet" href="${s.href}">`;
            } else {
                styleHTML += s.outerHTML;
            }
        });

        popup.document.write(`<!DOCTYPE html>
<html><head><title>AI Assistant</title>${styleHTML}
<style>
    body { margin: 0; height: 100vh; overflow: hidden; }
    #assistant-popup-root { height: 100vh; }
    .assistant-panel-view { height: 100%; }
    .assistant-panel-resize-handle { display: none; }
</style>
</head><body class="assistant-popup">
<div id="assistant-popup-root"></div>
</body></html>`);
        popup.document.close();

        const { default: AssistantPanelView } = await import('@ext/admin/assistant/AssistantPanelView.js');

        const view = new AssistantPanelView({
            app,
            conversationId: conversationId || app._assistantConversationId || null
        });

        // Pop-out from popup doesn't make sense — close panel just closes popup
        view.on('panel:close', () => popup.close());
        view.on('panel:popout', () => {}); // no-op in popup

        const root = popup.document.getElementById('assistant-popup-root');
        await view.render(true, root);

        app._assistantPopup = popup;
        app._assistantPopupView = view;

        // Cleanup when popup is closed externally
        popup.addEventListener('beforeunload', () => {
            if (app._assistantPopupView) {
                app._assistantPopupView.destroy();
                app._assistantPopupView = null;
            }
            app._assistantPopup = null;
        });
    }

    async function openFullscreenModal() {
        // Close sidebar if open, preserving conversation ID
        closeSidebarPanel();

        const { default: AssistantViewClass } = await import('@ext/admin/assistant/AssistantView.js');
        const { default: Modal } = await import('@core/views/feedback/Modal.js');
        const view = new AssistantViewClass({ app });
        Modal.show(view, {
            size: 'fullscreen',
            noBodyPadding: true,
            title: ' ',
            buttons: []
        });
    }

    // ── Resize listener (debounced) ──────────────────────────

    let resizeTimeout = null;
    function onResize() {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // If sidebar is open but viewport is now too narrow, switch to fullscreen
            if (app._assistantPanel && window.innerWidth < 1000) {
                openFullscreenModal();
            }
        }, 250);
    }
    window.addEventListener('resize', onResize);

    // ── Topbar button ────────────────────────────────────────

    const assistantItem = {
        id: 'assistant',
        icon: 'bi-robot',
        action: 'open-assistant',
        isButton: true,
        buttonClass: 'btn btn-link nav-link',
        tooltip: 'Admin Assistant',
        permissions: ['view_admin'],
        handler: async () => {
            // Toggle sidebar if already open
            if (app._assistantPanel && app._assistantPanel.isMounted()) {
                closeSidebarPanel();
                return;
            }

            if (window.innerWidth >= 1000) {
                await openSidebarPanel();
            } else {
                await openFullscreenModal();
            }
        }
    };

    // If topbar is already created, add to its config directly
    if (app.topbar && app.topbar.config) {
        app.topbar.config.rightItems.unshift(assistantItem);
        if (app.topbar.isMounted()) {
            app.topbar.render();
        }
    } else if (app.topbarConfig) {
        // Before app.start() — add to the topbar config that PortalApp reads
        if (!app.topbarConfig.rightItems) app.topbarConfig.rightItems = [];
        app.topbarConfig.rightItems.unshift(assistantItem);
    }
}
