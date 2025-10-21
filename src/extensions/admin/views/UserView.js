/**
 * UserView - Comprehensive user management interface
 *
 * Features:
 * - Two-row header with avatar, name, contact info, and activity
 * - Tabbed interface for Profile, Groups, Events, and Logs
 * - Integrated with DataView and Table components
 * - Clean Bootstrap 5 styling
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { User, UserDataView, UserForms, UserDeviceList, UserDeviceLocationList } from '@core/models/User.js';
import { LogList } from '@core/models/Log.js';
import { IncidentEventList } from '@core/models/Incident.js';
import { MemberList } from '@core/models/Member.js';
import { PushDeviceList } from '@core/models/Push.js';
import Dialog from '@core/views/feedback/Dialog.js';
import FormView from '@core/forms/FormView.js';


class UserView extends View {
    constructor(options = {}) {
        super({
            className: 'user-view',
            ...options
        });

        // User model instance
        this.model = options.model || new User(options.data || {});

        // Tab views
        this.tabView = null;
        this.profileView = null;
        this.groupsView = null;
        this.eventsView = null;
        this.logsView = null;

        // Set template
        this.template = `
            <div class="user-view-container">
                <!-- User Header -->
                <div data-container="user-header"></div>
                <!-- Tab Container -->
                <div data-container="user-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Create Profile tab using DataView
        this.header = new View({
            containerId: 'user-header',
            template: `
            <div class="d-flex justify-content-between align-items-start mb-4">
                <!-- Left Side: Primary Identity -->
                <div class="d-flex align-items-center gap-3">
                    {{{model.avatar|avatar('md','rounded-circle')}}}
                    <div>
                        <h3 class="mb-0">{{model.display_name|default('Unnamed User')}}</h3>
                        <a href="mailto:{{model.email}}" class="text-decoration-none text-body">{{model.email}}</a>
                        {{#model.phone_number}}
                            <div class="text-muted small mt-1">{{{model.phone_number|phone(false)}}}</div>
                        {{/model.phone_number}}
                    </div>
                </div>

                <!-- Right Side: Status & Actions -->
                <div class="d-flex align-items-start gap-4">
                    <div class="text-end">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-circle-fill fs-8 {{model.is_active|boolean('text-success','text-secondary')}}"></i>
                            <span>{{model.is_active|boolean('Active','Inactive')}}</span>
                        </div>
                        {{#model.last_activity}}
                            <div class="text-muted small mt-1">Last active {{model.last_activity|relative}}</div>
                        {{/model.last_activity}}
                    </div>
                    <div data-container="user-context-menu"></div>
                </div>
            </div>`
        });

        this.header.setModel(this.model);
        this.addChild(this.header);

        this.profileView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: true,
            fields: UserDataView.profile.fields
        });

        this.permsView = new FormView({
            fields: User.PERMISSION_FIELDS,
            model: this.model, // Set model during construction
            autosaveModelField: true // Enable auto-save with status indicators
        });

        // Create Groups table with MemberList collection
        const membersCollection = new MemberList({
            params: { user: this.model.get('id'), size: 5 }
        });
        this.groupsView = new TableView({
            collection: membersCollection,
            hideActivePillNames: ['user'],
            columns: [
                {
                    key: 'created',
                    label: 'Date Joined',
                    formatter: 'date',
                    sortable: true
                },
                {
                    key: 'group.name',
                    label: 'Group Name',
                    sortable: true
                },
                {
                    key: 'permissions|keys|badge',
                    label: 'Permissions'
                }

            ]
        });

        // Create Events table with IncidentEventList collection
        const eventsCollection = new IncidentEventList({
            params: {
                size: 5,
                model_name: "account.User",
                model_id: this.model.get('id')
            }
        });
        this.eventsView = new TableView({
            collection: eventsCollection,
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    sortable: true,
                    width: '40px'
                },
                {
                    key: 'created',
                    label: 'Date',
                    formatter: 'datetime',
                    sortable: true,
                    width: '150px'
                },
                {
                    key: 'category|badge',
                    label: 'Category'
                },
                {
                    key: 'title',
                    label: 'Title'
                }
            ]
        });

        const userDevices = new UserDeviceList({
            params: {
                size: 5,
                user: this.model.get('id')
            }
        });
        this.devicesView = new TableView({
            collection: userDevices,
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


        const userLocations = new UserDeviceLocationList({
            params: {
                size: 5,
                user: this.model.get('id')
            }
        });
        this.locationsView = new TableView({
            collection: userLocations,

            hideActivePillNames: ['user'],
            columns: [
                { key: 'user_device', label: 'Device', template: '{{model.user_device.device_info.user_agent.family}} on {{model.user_device.device_info.os.family}}', sortable: true },
                { key: 'geolocation.city', label: 'City', formatter: "default('—')" },
                { key: 'geolocation.region', label: 'Region', formatter: "default('—')" },
                { key: 'geolocation.country_name', label: 'Country', formatter: "default('—')" },
                { key: 'last_seen', label: 'Last Seen', formatter: "epoch|datetime" }
            ],
            size: 5
        });

        const pushDevices = new PushDeviceList({
            params: {
                size: 5,
                user: this.model.get('id')
            }
        });
        this.pushDevicesView = new TableView({
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

        // Create Logs table with LogList collection
        const logsCollection = new LogList({
            params: {
                size: 5,
                model_name: "account.User",
                model_id: this.model.get('id')
            }
        });
        this.logsView = new TableView({
            collection: logsCollection,
            permissions: 'view_logs',
            hideActivePillNames: ['model_name', 'model_id'],
            columns: [
                {
                    key: 'created',
                    label: 'Timestamp',
                    sortable: true,
                    formatter: "epoch|datetime",
                    filter: {
                        name: "created",
                        type: 'daterange',
                        startName: 'dr_start',
                        endName: 'dr_end',
                        fieldName: 'dr_field',
                        label: 'Date Range',
                        format: 'YYYY-MM-DD',
                        displayFormat: 'MMM DD, YYYY',
                        separator: ' to '
                    }
                },
                {
                    key: 'level',
                    label: 'Level',
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'info', label: 'Info' },
                            { value: 'warning', label: 'Warning' },
                            { value: 'error', label: 'Error' }
                        ]
                    }
                },
                {
                    key: 'kind',
                    label: 'Kind',
                    filter: {
                        type: 'text'
                    }
                },
                {
                    name: 'log',
                    label: 'Log',
                }
            ]
        });

        // Create Logs table with LogList collection
        const activityCollection = new LogList({
            params: {
                size: 5,
                uid: this.model.get('id')
            }
        });
        this.activityView = new TableView({
            collection: activityCollection,
            hideActivePillNames: ['uid'],
            permissions: 'view_logs',
            columns: [
                {
                    key: 'created',
                    label: 'Timestamp',
                    sortable: true,
                    formatter: "epoch|datetime",
                    filter: {
                        name: "created",
                        type: 'daterange',
                        startName: 'dr_start',
                        endName: 'dr_end',
                        fieldName: 'dr_field',
                        label: 'Date Range',
                        format: 'YYYY-MM-DD',
                        displayFormat: 'MMM DD, YYYY',
                        separator: ' to '
                    }
                },
                {
                    key: 'level',
                    label: 'Level',
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'info', label: 'Info' },
                            { value: 'warning', label: 'Warning' },
                            { value: 'error', label: 'Error' }
                        ]
                    }
                },
                {
                    key: 'kind',
                    label: 'Kind',
                    filter: {
                        type: 'text'
                    }
                },
                {
                    name: 'path',
                    label: 'Path',
                }
            ]
        });

        // Create TabView with all tabs and responsive behavior
        this.tabView = new TabView({
            tabs: {
                'Profile': this.profileView,
                'Permissions': this.permsView,
                'Groups': this.groupsView,
                'Events': this.eventsView,
                'Logs': this.logsView,
                'Activity': this.activityView,
                "Devices": this.devicesView,
                "Locations": this.locationsView,
                "Push Devices": this.pushDevicesView
            },
            activeTab: 'Profile',
            containerId: 'user-tabs',
            enableResponsive: true,
            dropdownStyle: "select",
            minWidth: 300, // Switch to dropdown below 600px
        });

        // Add TabView as child
        this.addChild(this.tabView);

        const userMenu = new ContextMenu({
            containerId: 'user-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model, // Pass the user model as context
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit User', action: 'edit-user', icon: 'bi-pencil' },
                    { label: 'Reset Password', action: 'reset-password', icon: 'bi-key' },
                    { type: 'divider' },
                    this.model.get('is_active')
                        ? { label: 'Deactivate User', action: 'deactivate-user', icon: 'bi-person-dash' }
                        : { label: 'Activate User', action: 'activate-user', icon: 'bi-person-check' },
                ]
            }
        });
        this.addChild(userMenu);
    }

    async onActionEditUser() {
        let frmConfig = UserForms.edit;
        const resp = await Dialog.showModelForm({
            title: `EDIT - #${this.model.id} ${this.options.modelName}`,
            model: this.model,
            formConfig: frmConfig,
        });
        if (resp) {
            this.render();
        }
    }
    async onActionResetPassword() { console.log("TODO: reset password") }

    async onActionDeactivateUser() {
        const res = await Dialog.confirm("Are you sure you want to disable this user?");
        if (res) {
            await this.model.save({ is_active: false });
            this.getApp().toast.success("Member disable");
        } else {
            this.getApp().toast.error("Member disable failed");
        }
    }

    async onActionActivateUser() {
        const res = await Dialog.confirm("Are you sure you want to enable this user?");
        if (res) {
            await this.model.save({ is_active: true });
            this.getApp().toast.success("Member enabled");
        } else {
            this.getApp().toast.error("Member enable failed");
        }
    }

    // Action handlers for table interactions
    async onActionViewGroup(action, event, element) {
        const groupId = element.getAttribute('data-id');
        console.log('View group:', groupId);
        // TODO: Implement group view dialog
    }

    async onActionRemoveFromGroup(action, event, element) {
        const groupId = element.getAttribute('data-id');
        console.log('Remove user from group:', groupId);
        // TODO: Implement remove from group functionality
    }

    async onActionViewEvent(action, event, element) {
        const eventId = element.getAttribute('data-id');
        console.log('View event:', eventId);
        // TODO: Implement event view dialog
    }

    async onActionViewLog(action, event, element) {
        const logId = element.getAttribute('data-id');
        console.log('View log:', logId);
        // TODO: Implement log view dialog
    }

    async showTab(tabName) {
        if (this.tabView) {
            await this.tabView.showTab(tabName);
        }
    }

    getActiveTab() {
        return this.tabView ? this.tabView.getActiveTab() : null;
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
