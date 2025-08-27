/**
 * MOJO Admin Extension - Admin Entry Point
 * Comprehensive admin panel exports for all available table pages and admin functionality
 * Package: web-mojo/admin
 */

// Import admin table pages for both export and internal use
import UserTablePage from './admin/UserTablePage.js';
import GroupTablePage from './admin/GroupTablePage.js';
import MemberTablePage from './admin/MemberTablePage.js';
import S3BucketTablePage from './admin/S3BucketTablePage.js';
import FileManagerTablePage from './admin/FileManagerTablePage.js';
import FileTablePage from './admin/FileTablePage.js';
import IncidentTablePage from './admin/IncidentTablePage.js';
import LogTablePage from './admin/LogTablePage.js';
import AdminDashboardPage from './admin/AdminDashboardPage.js';
import TaskManagementPage from './admin/TaskManagementPage.js';
import EmailDomainTablePage from './admin/EmailDomainTablePage.js';
import EmailMailboxTablePage from './admin/EmailMailboxTablePage.js';
import SentMessageTablePage from './admin/SentMessageTablePage.js';
import EmailTemplateTablePage from './admin/EmailTemplateTablePage.js';
import TablePage from './components/TablePage.js';

// Re-export all admin pages
export {
    UserTablePage,
    GroupTablePage,
    MemberTablePage,
    S3BucketTablePage,
    FileManagerTablePage,
    FileTablePage,
    IncidentTablePage,
    LogTablePage,
    AdminDashboardPage,
    TaskManagementPage,
    EmailDomainTablePage,
    EmailMailboxTablePage,
    SentMessageTablePage,
    EmailTemplateTablePage,
    TablePage
};

/**
 * Register all admin pages to a WebApp instance
 * @param {WebApp} app - The WebApp instance to register pages to
 * @returns {void}
 */
export function registerAdminPages(app, addToMenu = true) {
    // Register all admin pages with consistent naming
    app.registerPage('admin/dashboard', AdminDashboardPage, {permissions: ["view_admin"]});
    app.registerPage('admin/tasks', TaskManagementPage, {permissions: ["view_admin"]});
    app.registerPage('admin/users', UserTablePage, {permissions: ["manage_users"]});
    app.registerPage('admin/groups', GroupTablePage, {permissions: ["manage_groups"]});
    app.registerPage('admin/members', MemberTablePage, {permissions: ["manage_members"]});
    app.registerPage('admin/s3buckets', S3BucketTablePage, {permissions: ["manage_aws"]});
    app.registerPage('admin/filemanagers', FileManagerTablePage, {permissions: ["manage_files"]});
    app.registerPage('admin/files', FileTablePage, {permissions: ["manage_files"]});
    app.registerPage('admin/incidents', IncidentTablePage, {permissions: ["view_incidents"]});
    app.registerPage('admin/logs', LogTablePage, {permissions: ["view_logs"]});
    app.registerPage('admin/email/mailboxes', EmailMailboxTablePage, {permissions: ["manage_aws"]});
    app.registerPage('admin/email/domains', EmailDomainTablePage, {permissions: ["manage_aws"]});
    app.registerPage('admin/email/sent', SentMessageTablePage, {permissions: ["manage_aws"]});
    app.registerPage('admin/email/templates', EmailTemplateTablePage, {permissions: ["manage_aws"]});

    // Check if sidebar exists and has an admin menu config
    if (addToMenu &&app.sidebar && app.sidebar.getMenuConfig) {
        const adminMenuConfig = app.sidebar.getMenuConfig('admin');
        if (adminMenuConfig && adminMenuConfig.items) {
            // Add admin pages to sidebar menu
            const adminMenuItems = [
                {
                    text: 'Dashboard',
                    route: '?page=admin/dashboard',
                    icon: 'bi-speedometer2',
                    permissions: ["view_admin"]
                },
                {
                    text: 'Task Management',
                    route: '?page=admin/tasks',
                    icon: 'bi-cpu',
                    permissions: ["view_admin"]
                },
                {
                    text: 'Users',
                    route: '?page=admin/users',
                    icon: 'bi-people',
                    permissions: ["manage_users"]
                },
                {
                    text: 'Groups',
                    route: '?page=admin/groups',
                    icon: 'bi-diagram-3',
                    permissions: ["manage_groups"]
                },
                {
                    text: 'Members',
                    route: '?page=admin/members',
                    icon: 'bi-person-badge',
                    permissions: ["manage_groups"]
                },
                {
                    text: 'Storage',
                    route: null,
                    icon: 'bi-folder',
                    permissions: ["manage_files", "manage_aws"],
                    children: [
                        {
                            text: 'S3 Buckets',
                            route: '?page=admin/s3buckets',
                            icon: 'bi-bucket',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Storage Backends',
                            route: '?page=admin/filemanagers',
                            icon: 'bi-hdd-stack',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Files',
                            route: '?page=admin/files',
                            icon: 'bi-file-earmark',
                            permissions: ["manage_files"]
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
                            text: 'Incidents',
                            route: '?page=admin/incidents',
                            icon: 'bi-exclamation-triangle',
                            permissions: ["manage_groups"]
                        },
                        {
                            text: 'Events',
                            route: '?page=admin/events',
                            icon: 'bi-exclamation-triangle',
                            permissions: ["manage_groups"]
                        },
                        {
                            text: 'Logs',
                            route: '?page=admin/logs',
                            icon: 'bi-journal-text',
                            permissions: ["view_logs"]
                        },
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
                            route: '?page=admin/email/domains',
                            icon: 'bi-globe',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Mailboxes',
                            route: '?page=admin/email/mailboxes',
                            icon: 'bi-inbox',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Sent',
                            route: '?page=admin/email/sent',
                            icon: 'bi-send-check',
                            permissions: ["manage_aws"]
                        },
                        {
                            text: 'Templates',
                            route: '?page=admin/email/templates',
                            icon: 'bi-file-text',
                            permissions: ["manage_aws"]
                        }
                    ]
                }
            ];

            // Add items to existing admin menu
            adminMenuConfig.items.unshift(...adminMenuItems);
            console.log('Added 11 admin menu items to sidebar');
        }
    }

    console.log('Registered 14 admin pages to WebApp');
}
