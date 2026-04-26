/**
 * UserView - Comprehensive user management interface
 *
 * Features:
 * - Header with avatar, name, contact info, status, and context menu
 * - Left-nav sidebar for section switching (Profile, Permissions, Groups, etc.)
 * - Integrated with DataView, TableView, FormView, and SideNavView
 * - Clean Bootstrap 5 styling
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import TableRow from '@core/views/table/TableRow.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import rest from '@core/Rest.js';
import { User, UserDataView, UserForms, UserDeviceList, UserDeviceLocationList } from '@core/models/User.js';
import { LoginEventList } from '@ext/admin/models/LoginEvent.js';
import { LogList } from '@core/models/Log.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import { MemberList } from '@core/models/Member.js';
import { PushDeviceList } from '@ext/admin/models/Push.js';
import Dialog from '@core/views/feedback/Dialog.js';
import FormView from '@core/forms/FormView.js';
import LoginLocationMapView from '../devices/LoginLocationMapView.js';
import AdminProfileSection from './sections/AdminProfileSection.js';
import AdminPersonalSection from './sections/AdminPersonalSection.js';
import AdminSecuritySection from './sections/AdminSecuritySection.js';
import AdminConnectedSection from './sections/AdminConnectedSection.js';
import AdminNotificationsSection from './sections/AdminNotificationsSection.js';
import AdminApiKeysSection from './sections/AdminApiKeysSection.js';
import AdminMetadataSection from '../../shared/AdminMetadataSection.js';
// DeviceView and GeoIPView are opened automatically via VIEW_CLASS on row click


// ── Custom TableRow classes for rich multiline rows ──

class DeviceRow extends TableRow {
    get deviceIcon() {
        const dev = this.model?.get('device_info')?.device || {};
        const os = this.model?.get('device_info')?.os || {};
        const isMobile = ['iPhone', 'Android'].some(m =>
            (dev.family || '').includes(m) || (os.family || '').includes(m)
        );
        return isMobile ? 'bi-phone' : 'bi-laptop';
    }
    get deviceName() {
        const dev = this.model?.get('device_info')?.device || {};
        return `${dev.brand || ''} ${dev.family || ''}`.trim() || 'Unknown Device';
    }
    get deviceModel() {
        return this.model?.get('device_info')?.device?.model || '';
    }
    get browserName() {
        const ua = this.model?.get('device_info')?.user_agent || {};
        return ua.family ? `${ua.family} ${ua.major || ''}`.trim() : '';
    }
    get osName() {
        const os = this.model?.get('device_info')?.os || {};
        return os.family ? `${os.family} ${os.major || ''}`.trim() : '';
    }
    get deviceMeta() {
        return [this.browserName, this.osName].filter(Boolean).join(' · ') || '—';
    }
}

class LocationRow extends TableRow {
    get deviceIcon() {
        const dev = this.model?.get('user_device')?.device_info?.device || {};
        const os = this.model?.get('user_device')?.device_info?.os || {};
        const isMobile = ['iPhone', 'Android'].some(m =>
            (dev.family || '').includes(m) || (os.family || '').includes(m)
        );
        return isMobile ? 'bi-phone' : 'bi-laptop';
    }
    get browserName() {
        const ua = this.model?.get('user_device')?.device_info?.user_agent || {};
        return ua.family ? `${ua.family} ${ua.major || ''}`.trim() : 'Unknown';
    }
    get deviceName() {
        const dev = this.model?.get('user_device')?.device_info?.device || {};
        return `${dev.brand || ''} ${dev.family || ''}`.trim() || 'Unknown';
    }
    get locationText() {
        const geo = this.model?.get('geolocation') || {};
        return [geo.city, geo.region].filter(Boolean).join(', ') || geo.country_name || '—';
    }
    get countryName() {
        return this.model?.get('geolocation')?.country_name || '';
    }
    get threatFlags() {
        const geo = this.model?.get('geolocation') || {};
        const flags = [];
        if (geo.is_vpn) flags.push('<span class="badge bg-warning text-dark" style="font-size:0.6rem;">VPN</span>');
        if (geo.is_tor) flags.push('<span class="badge bg-danger" style="font-size:0.6rem;">Tor</span>');
        if (geo.is_proxy) flags.push('<span class="badge bg-warning text-dark" style="font-size:0.6rem;">Proxy</span>');
        return flags.join(' ');
    }
    get hasThreatFlags() {
        const geo = this.model?.get('geolocation') || {};
        return !!(geo.is_vpn || geo.is_tor || geo.is_proxy);
    }
}

class UserView extends View {
    constructor(options = {}) {
        super({
            className: 'user-view',
            ...options
        });

        // User model instance
        this.model = options.model || new User(options.data || {});

        // Section views
        this.sideNavView = null;

        // Set template
        this.template = `
            <div class="user-view-container">
                <!-- User Header + Context Menu -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div data-container="user-header" style="flex: 1;"></div>
                    <div data-container="user-context-menu" class="ms-3 flex-shrink-0"></div>
                </div>
                <!-- Side Nav Container -->
                <div data-container="user-sidenav" style="min-height: 400px;"></div>
            </div>
        `;
    }

    async onInit() {
        // ── Header ──────────────────────────────────
        this.header = new View({
            containerId: 'user-header',
            template: `
            <div class="d-flex justify-content-between align-items-start">
                <!-- Left Side: Primary Identity -->
                <div class="d-flex align-items-center gap-3">
                    {{{model.avatar|avatar('md','rounded-circle')}}}
                    <div>
                        <h3 class="mb-0">{{model.display_name|default('Unnamed User')}}</h3>
                        <a href="mailto:{{model.email}}" class="text-decoration-none text-body">{{model.email}}</a>{{{model.email|clipboard('icon-only')}}}
                        {{#model.phone_number}}
                            <div class="text-muted small mt-1">{{{model.phone_number|phone(false)}}}</div>
                        {{/model.phone_number}}
                    </div>
                </div>

                <!-- Right Side: Status -->
                <div class="text-end">
                    <div class="d-flex align-items-center justify-content-end gap-3">
                        <span class="d-inline-flex align-items-center gap-1" title="{{model.is_online|boolean('Online','Offline')}}">
                            <i class="bi bi-circle-fill {{model.is_online|boolean('text-success','text-secondary')}}" style="font-size: 0.5rem;"></i>
                            <span class="small">{{model.is_online|boolean('Online','Offline')}}</span>
                        </span>
                        <span class="d-inline-flex align-items-center gap-1" style="cursor: pointer;"
                              data-action="toggle-active"
                              title="{{model.is_active|boolean('Click to deactivate','Click to activate')}}">
                            <i class="bi {{model.is_active|boolean('bi-toggle-on text-success','bi-toggle-off text-secondary')}}" style="font-size: 1.1rem;"></i>
                            <span class="small">{{model.is_active|boolean('Active','Inactive')}}</span>
                        </span>
                    </div>
                    {{#model.last_activity}}
                        <div class="text-muted small mt-1">Last active {{model.last_activity|relative}}</div>
                    {{/model.last_activity}}
                </div>
            </div>`
        });

        this.header.setModel(this.model);
        this.addChild(this.header);

        // ── Section views ───────────────────────────

        const profileView = new AdminProfileSection({ model: this.model });
        const personalView = new AdminPersonalSection({ model: this.model });
        const securityView = new AdminSecuritySection({ model: this.model });
        const connectedView = new AdminConnectedSection({ model: this.model });
        const notificationsView = new AdminNotificationsSection({ model: this.model });
        const apiKeysView = new AdminApiKeysSection({ model: this.model });
        const metadataView = new AdminMetadataSection({ model: this.model });

        const permsView = new FormView({
            fields: User.CATEGORY_PERMISSION_FIELDS,
            model: this.model,
            autosaveModelField: true
        });

        const advPermsView = new FormView({
            fields: User.GRANULAR_PERMISSION_FIELDS,
            model: this.model,
            autosaveModelField: true
        });

        // Groups
        const membersCollection = new MemberList({
            params: { user: this.model.get('id'), size: 5 }
        });
        const groupsView = new TableView({
            collection: membersCollection,
            hideActivePillNames: ['user'],
            columns: [
                { key: 'created', label: 'Date Joined', formatter: 'date', sortable: true },
                { key: 'group.name', label: 'Group Name', sortable: true },
                { key: 'permissions|keys|badge', label: 'Permissions' }
            ]
        });

        // Events
        const eventsCollection = new IncidentEventList({
            params: { size: 5, model_name: "account.User", model_id: this.model.get('id') }
        });
        const eventsTable = new TableView({
            containerId: 'events-table',
            collection: eventsCollection,
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                { key: 'id', label: 'ID', sortable: true, width: '40px' },
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '150px' },
                { key: 'category|badge', label: 'Category' },
                { key: 'title', label: 'Event' }
            ]
        });
        const eventsView = new View({
            template: `
                <div class="mb-2">
                    <h6 class="fw-semibold mb-1">Security &amp; Account Events</h6>
                    <p class="text-muted small mb-3">Incidents and account actions associated with this user.</p>
                </div>
                <div data-container="events-table"></div>`
        });
        eventsView.addChild(eventsTable);

        // Devices — multiline rows with detail dialog
        const devicesView = new TableView({
            collection: new UserDeviceList({ params: { size: 10, user: this.model.get('id') } }),
            hideActivePillNames: ['user'],
            clickAction: 'view',
            itemClass: DeviceRow,
            columns: [
                {
                    key: 'device_info',
                    label: 'Device',
                    template: `
                        <div style="font-size:0.85rem; font-weight:500;">
                            <i class="bi {{deviceIcon}} text-muted me-1" style="font-size:1.1rem; vertical-align:middle;"></i>{{deviceName}}
                            {{#deviceModel}} <span class="text-muted fw-normal">({{deviceModel}})</span>{{/deviceModel}}
                        </div>
                        <div style="font-size:0.73rem; color:#6c757d; margin-top:0.15rem;">
                            {{deviceMeta}}
                            {{#model.last_ip}} <span class="text-muted mx-1">&middot;</span> {{model.last_ip}}{{/model.last_ip}}
                        </div>`
                },
                { key: 'first_seen', label: 'First Seen', formatter: 'epoch|relative', width: '120px' },
                { key: 'last_seen', label: 'Last Seen', formatter: 'epoch|relative', width: '120px' }
            ]
        });

        // Locations — TabView with login map + login events table
        const loginMapView = new LoginLocationMapView({
            userId: this.model.get('id'),
            height: 300,
            mapStyle: 'dark'
        });

        const loginEventsTable = new TableView({
            collection: new LoginEventList({ params: { user: this.model.get('id'), size: 10 } }),
            hideActivePillNames: ['user'],
            columns: [
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '160px' },
                { key: 'ip_address', label: 'IP Address' },
                { key: 'city', label: 'City', formatter: "default('—')" },
                { key: 'region', label: 'Region', formatter: "default('—')" },
                { key: 'country_code', label: 'Country', sortable: true },
                { key: 'source', label: 'Source', sortable: true }
            ]
        });
        loginEventsTable.onTabActivated = async () => {
            await loginEventsTable.collection?.fetch();
        };

        const locationsView = new TabView({
            tabs: {
                'Map': loginMapView,
                'Logins': loginEventsTable
            },
            activeTab: 'Map'
        });

        // Push Devices
        const pushDevices = new PushDeviceList({
            params: { size: 5, user: this.model.get('id') }
        });
        const pushDevicesView = new TableView({
            collection: pushDevices,
            hideActivePillNames: ['user'],
            columns: [
                { key: 'duid|truncate_middle(16)', label: 'Device ID', sortable: true },
                { key: 'device_info.user_agent.family', label: 'Browser', formatter: "default('—')" },
                { key: 'device_info.os.family', label: 'OS', formatter: "default('—')" },
                { key: 'first_seen', label: 'First Seen', formatter: "epoch|datetime" },
                { key: 'last_seen', label: 'Last Seen', formatter: "epoch|datetime" }
            ],
            size: 5
        });

        // Logs (model-scoped)
        const logsCollection = new LogList({
            params: { size: 5, model_name: "account.User", model_id: this.model.get('id') }
        });
        const logsTable = new TableView({
            containerId: 'logs-table',
            collection: logsCollection,
            permissions: 'view_logs',
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                {
                    key: 'created', label: 'Timestamp', sortable: true, formatter: "epoch|datetime",
                    filter: { name: "created", type: 'daterange', startName: 'dr_start', endName: 'dr_end', fieldName: 'dr_field', label: 'Date Range', format: 'YYYY-MM-DD', displayFormat: 'MMM DD, YYYY', separator: ' to ' }
                },
                {
                    key: 'level', label: 'Level', sortable: true,
                    filter: { type: 'select', options: [{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'error', label: 'Error' }] }
                },
                { key: 'kind', label: 'Event Type', filter: { type: 'text' } },
                { name: 'log', label: 'Details' }
            ]
        });
        const logsView = new View({
            template: `
                <div class="mb-2">
                    <h6 class="fw-semibold mb-1">Object Logs</h6>
                    <p class="text-muted small mb-3">System log entries about changes to this user's record.</p>
                </div>
                <div data-container="logs-table"></div>`
        });
        logsView.addChild(logsTable);

        // Activity (user-scoped logs)
        const activityCollection = new LogList({
            params: { size: 5, uid: this.model.get('id') }
        });
        const activityTable = new TableView({
            containerId: 'activity-table',
            collection: activityCollection,
            hideActivePillNames: ['uid'],
            permissions: 'view_logs',
            columns: [
                {
                    key: 'created', label: 'Timestamp', sortable: true, formatter: "epoch|datetime",
                    filter: { name: "created", type: 'daterange', startName: 'dr_start', endName: 'dr_end', fieldName: 'dr_field', label: 'Date Range', format: 'YYYY-MM-DD', displayFormat: 'MMM DD, YYYY', separator: ' to ' }
                },
                {
                    key: 'level', label: 'Level', sortable: true,
                    filter: { type: 'select', options: [{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'error', label: 'Error' }] }
                },
                { key: 'kind', label: 'Event Type', filter: { type: 'text' } },
                { name: 'path', label: 'Request Path' }
            ]
        });
        const activityView = new View({
            template: `
                <div class="mb-2">
                    <h6 class="fw-semibold mb-1">Activity Log</h6>
                    <p class="text-muted small mb-3">API and request activity performed by this user.</p>
                </div>
                <div data-container="activity-table"></div>`
        });
        activityView.addChild(activityTable);

        // ── SideNavView ─────────────────────────────
        this.sideNavView = new SideNavView({
            containerId: 'user-sidenav',
            activeSection: 'profile',
            navWidth: 200,
            contentPadding: '1.25rem 2rem',
            enableResponsive: true,
            minWidth: 500,
            sections: [
                { key: 'profile', label: 'Profile', icon: 'bi-person', view: profileView },
                { key: 'personal', label: 'Personal', icon: 'bi-person-vcard', view: personalView },
                { key: 'security', label: 'Security', icon: 'bi-shield-lock', view: securityView },
                { key: 'connected', label: 'OAuth Accounts', icon: 'bi-plug', view: connectedView },
                { type: 'divider', label: 'Access' },
                { key: 'permissions', label: 'Permissions', icon: 'bi-shield-check', view: permsView },
                { key: 'adv_permissions', label: 'Adv Permissions', icon: 'bi-shield-plus', view: advPermsView },
                { key: 'groups', label: 'Groups', icon: 'bi-people', view: groupsView },
                { key: 'api_keys', label: 'API Keys', icon: 'bi-key', view: apiKeysView },
                { type: 'divider', label: 'Activity' },
                { key: 'events', label: 'Events', icon: 'bi-calendar-event', view: eventsView },
                { key: 'activity', label: 'Activity Log', icon: 'bi-clock-history', view: activityView, permissions: 'view_logs' },
                { key: 'logs', label: 'Object Logs', icon: 'bi-journal-text', view: logsView, permissions: 'view_logs' },
                { type: 'divider', label: 'Devices' },
                { key: 'devices', label: 'Devices', icon: 'bi-laptop', view: devicesView },
                { key: 'locations', label: 'Locations', icon: 'bi-geo-alt', view: locationsView },
                { key: 'push_devices', label: 'Push Devices', icon: 'bi-phone', view: pushDevicesView },
                { type: 'divider', label: 'Settings' },
                { key: 'notifications', label: 'Notifications', icon: 'bi-bell', view: notificationsView },
                { key: 'metadata', label: 'Metadata', icon: 'bi-braces', view: metadataView }
            ]
        });
        this.addChild(this.sideNavView);

        // ── Context Menu ────────────────────────────
        const userMenu = new ContextMenu({
            containerId: 'user-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit User', action: 'edit-user', icon: 'bi-pencil' },
                    ...(this.model.get('avatar')
                        ? [{ label: 'Clear Avatar', action: 'clear-avatar', icon: 'bi-person-x' }]
                        : []),
                    { type: 'divider' },
                    { label: 'Send Password Reset', action: 'send-password-reset', icon: 'bi-envelope' },
                    { label: 'Send Magic Login Link', action: 'send-magic-link', icon: 'bi-link-45deg' },
                    { label: 'Revoke All Sessions', action: 'revoke-all-sessions', icon: 'bi-box-arrow-right' },
                    { type: 'divider' },
                    ...(this.model.get('is_email_verified')
                        ? []
                        : [
                            { label: 'Send Email Verification', action: 'send-email-verification', icon: 'bi-envelope-check' },
                            { label: 'Force Verify Email', action: 'force-verify-email', icon: 'bi-patch-check' },
                        ]),
                    ...(this.model.get('phone_number') && !this.model.get('is_phone_verified')
                        ? [{ label: 'Force Verify Phone', action: 'force-verify-phone', icon: 'bi-patch-check' }]
                        : []),
                    { type: 'divider' },
                    this.model.get('is_active')
                        ? { label: 'Deactivate User', action: 'deactivate-user', icon: 'bi-person-dash' }
                        : { label: 'Activate User', action: 'activate-user', icon: 'bi-person-check' },
                ]
            }
        });
        this.addChild(userMenu);
    }

    // ── Context menu actions ────────────────────────

    async onActionEditUser() {
        await Dialog.showModelForm({
            title: `EDIT - #${this.model.id} ${this.options.modelName}`,
            model: this.model,
            formConfig: UserForms.edit,
        });
    }

    async onActionClearAvatar() {
        const confirmed = await Dialog.confirm(
            'Remove this user\'s avatar? They will see the default placeholder.',
            'Clear Avatar'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ avatar: null });
        if (resp.status === 200) {
            this.getApp().toast.success('Avatar cleared');
        } else {
            this.getApp().toast.error('Failed to clear avatar');
        }
        return true;
    }

    async onActionSendPasswordReset() {
        const email = this.model.get('email');
        const confirmed = await Dialog.confirm(
            `Send a password reset email to <strong>${email}</strong>?`,
            'Send Password Reset'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/auth/password/reset', { email });
        if (resp.success) {
            this.getApp().toast.success('Password reset email sent');
        } else {
            this.getApp().toast.error(resp.message || 'Failed to send password reset');
        }
        return true;
    }

    async onActionSendMagicLink() {
        const email = this.model.get('email');
        const confirmed = await Dialog.confirm(
            `Send a magic login link to <strong>${email}</strong>?`,
            'Send Magic Login Link'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/auth/magic-link', { email });
        if (resp.success) {
            this.getApp().toast.success('Magic login link sent');
        } else {
            this.getApp().toast.error(resp.message || 'Failed to send magic link');
        }
        return true;
    }

    async onActionRevokeAllSessions() {
        const confirmed = await Dialog.confirm(
            'Revoke all sessions? The user will be signed out of all devices immediately.',
            'Revoke All Sessions'
        );
        if (!confirmed) return true;

        const resp = await rest.POST(`/api/user/${this.model.id}/sessions/revoke`);
        if (resp.success) {
            this.getApp().toast.success('All sessions revoked');
        } else {
            this.getApp().toast.error(resp.message || 'Failed to revoke sessions');
        }
        return true;
    }

    async onActionSendEmailVerification() {
        const email = this.model.get('email');
        const confirmed = await Dialog.confirm(
            `Send a verification email to <strong>${email}</strong>?`,
            'Send Email Verification'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/auth/email/verify', { email });
        if (resp.success) {
            this.getApp().toast.success('Verification email sent');
        } else {
            this.getApp().toast.error(resp.message || 'Failed to send verification email');
        }
        return true;
    }

    async onActionForceVerifyEmail() {
        const confirmed = await Dialog.confirm(
            `Mark <strong>${this.model.get('email')}</strong> as verified?`,
            'Force Verify Email'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ is_email_verified: true });
        if (resp.status === 200) {
            this.getApp().toast.success('Email marked as verified');
        } else {
            this.getApp().toast.error('Failed to verify email');
        }
        return true;
    }

    async onActionForceVerifyPhone() {
        const confirmed = await Dialog.confirm(
            `Mark <strong>${this.model.get('phone_number')}</strong> as verified?`,
            'Force Verify Phone'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ is_phone_verified: true });
        if (resp.status === 200) {
            this.getApp().toast.success('Phone marked as verified');
        } else {
            this.getApp().toast.error('Failed to verify phone');
        }
        return true;
    }

    async onActionToggleActive() {
        if (this.model.get('is_active')) {
            return this.onActionDeactivateUser();
        } else {
            return this.onActionActivateUser();
        }
    }

    async onActionDeactivateUser() {
        const confirmed = await Dialog.confirm("Are you sure you want to deactivate this user?");
        if (!confirmed) return true;

        const resp = await this.model.save({ is_active: false });
        if (resp.status === 200) {
            this.getApp().toast.success("User deactivated");
        } else {
            this.getApp().toast.error("Failed to deactivate user");
        }
        return true;
    }

    async onActionActivateUser() {
        const confirmed = await Dialog.confirm("Are you sure you want to activate this user?");
        if (!confirmed) return true;

        const resp = await this.model.save({ is_active: true });
        if (resp.status === 200) {
            this.getApp().toast.success("User activated");
        } else {
            this.getApp().toast.error("Failed to activate user");
        }
        return true;
    }

    async showSection(sectionName) {
        if (this.sideNavView) {
            await this.sideNavView.showSection(sectionName);
        }
    }

    getActiveSection() {
        return this.sideNavView ? this.sideNavView.getActiveSection() : null;
    }

    // Legacy API compatibility
    async showTab(tabName) {
        return this.showSection(tabName);
    }

    getActiveTab() {
        return this.getActiveSection();
    }

    _onModelChange() {
      // do nothing, we do not want model changes to render this entire view
    }

    // Static factory method
    static create(options = {}) {
        return new UserView(options);
    }
}

User.VIEW_CLASS = UserView;

export default UserView;
