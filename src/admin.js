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
    TablePage
};

/**
 * Register all admin pages to a WebApp instance
 * @param {WebApp} app - The WebApp instance to register pages to
 * @returns {void}
 */
export function registerAdminPages(app, addToMenu = true) {
    // Register all admin pages with consistent naming
    app.registerPage('admin/users', UserTablePage, {permissions: ["manage_users"]});
    app.registerPage('admin/groups', GroupTablePage, {permissions: ["manage_groups"]});
    app.registerPage('admin/members', MemberTablePage, {permissions: ["manage_members"]});
    app.registerPage('admin/s3buckets', S3BucketTablePage, {permissions: ["manage_s3buckets"]});
    app.registerPage('admin/filemanagers', FileManagerTablePage, {permissions: ["manage_filemanagers"]});
    app.registerPage('admin/files', FileTablePage, {permissions: ["manage_files"]});
    app.registerPage('admin/incidents', IncidentTablePage, {permissions: ["manage_incidents"]});
    app.registerPage('admin/logs', LogTablePage, {permissions: ["manage_logs"]});

    // Check if sidebar exists and has an admin menu config
    if (addToMenu &&app.sidebar && app.sidebar.getMenuConfig) {
        const adminMenuConfig = app.sidebar.getMenuConfig('admin');
        if (adminMenuConfig && adminMenuConfig.items) {
            // Add admin pages to sidebar menu
            const adminMenuItems = [
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
                {
                    text: 'Incidents',
                    route: '?page=admin/incidents',
                    icon: 'bi-exclamation-triangle',
                    permissions: ["manage_groups"]
                },
                {
                    text: 'Logs',
                    route: '?page=admin/logs',
                    icon: 'bi-journal-text',
                    permissions: ["view_logs"]
                }
            ];

            // Add items to existing admin menu
            adminMenuConfig.items.unshift(...adminMenuItems);
            console.log('Added 8 admin menu items to sidebar');
        }
    }

    console.log('Registered 8 admin pages to WebApp');
}
