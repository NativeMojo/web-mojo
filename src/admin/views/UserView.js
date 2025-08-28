/**
 * UserView - Comprehensive user management interface
 *
 * Features:
 * - Two-row header with avatar, name, contact info, and activity
 * - Tabbed interface for Profile, Groups, Events, and Logs
 * - Integrated with DataView and Table components
 * - Clean Bootstrap 5 styling
 */

import View from '../../core/View.js';
import TabView from '../../components/TabView.js';
import DataView from '../../components/DataView.js';
import Table from '../../components/Table.js';
import ContextMenu from '../../components/ContextMenu.js';
import { User, UserDataView } from '../../models/User.js';
import { LogList } from '../../models/Log.js';
import { IncidentEventList } from '../../models/Incident.js';
import { MemberList } from '../../models/Member.js';

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
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <!-- Left Side: Primary Identity -->
                    <div class="d-flex align-items-center gap-3">
                        {{{model.avatar|avatar(80,'rounded-circle')}}}
                        <div>
                            <h3 class="mb-0">{{model.display_name|default('Unnamed User')}}</h3>
                            <a href="mailto:{{model.email}}" class="text-decoration-none text-body">{{model.email}}</a>
                            {{#model.phone_number}}
                                <div class="text-muted small mt-1">{{model.phone_number|phone(false)}}</div>
                            {{/model.phone_number}}
                        </div>
                    </div>

                    <!-- Right Side: Status & Actions -->
                    <div class="d-flex align-items-center gap-4">
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
                </div>

                <!-- Tab Container -->
                <div data-container="user-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Create Profile tab using DataView
        this.profileView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: true,
            fields: UserDataView.profile.fields
        });

        // Create Groups table with MemberList collection
        const membersCollection = new MemberList({
            params: { user: this.model.get('id') }
        });
        this.groupsView = new Table({
            title: 'User Groups',
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

            ],
            pageSize: 10
        });

        // Create Events table with IncidentEventList collection
        const eventsCollection = new IncidentEventList({
            filters: { user_id: this.model.get('id') }
        });
        this.eventsView = new Table({
            title: 'System Events',
            collection: eventsCollection,
            columns: [
                {
                    name: 'created_at',
                    label: 'Date',
                    formatter: 'datetime',
                    sortable: true,
                    width: '150px'
                },
                {
                    name: 'category',
                    label: 'Type',
                    formatter: 'badge',
                    width: '120px'
                },
                {
                    name: 'description',
                    label: 'Description'
                },
                {
                    name: 'actions',
                    label: 'Actions',
                    width: '100px',
                    template: `
                        <button class="btn btn-sm btn-outline-primary" data-action="view-event" data-id="{{id}}">
                            <i class="bi bi-eye"></i>
                        </button>
                    `
                }
            ],
            pageSize: 10
        });

        // Create Logs table with LogList collection
        const logsCollection = new LogList({
            filters: { user_id: this.model.get('id') }
        });
        this.logsView = new Table({
            title: 'Activity Logs',
            collection: logsCollection,
            columns: [
                {
                    name: 'timestamp',
                    label: 'Time',
                    formatter: 'datetime',
                    sortable: true,
                    width: '150px'
                },
                {
                    name: 'action',
                    label: 'Action',
                    formatter: 'capitalize',
                    width: '120px'
                },
                {
                    name: 'ip_address',
                    label: 'IP Address',
                    width: '120px'
                },
                {
                    name: 'details',
                    label: 'Details'
                },
                {
                    name: 'actions',
                    label: 'Actions',
                    width: '100px',
                    template: `
                        <button class="btn btn-sm btn-outline-primary" data-action="view-log" data-id="{{id}}">
                            <i class="bi bi-eye"></i>
                        </button>
                    `
                }
            ],
            pageSize: 10
        });

        // Create TabView with all tabs and responsive behavior
        this.tabView = new TabView({
            tabs: {
                'Profile': this.profileView,
                'Groups': this.groupsView,
                'Events': this.eventsView,
                'Logs': this.logsView
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
                    { type: 'divider' },
                    { label: 'Delete User', action: 'delete-user', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(userMenu);
    }

    async onActionEditUser() { console.log("TODO: edit user") }
    async onActionResetPassword() { console.log("TODO: reset password") }
    async onActionDeactivateUser() { console.log("TODO: deactivate user") }
    async onActionActivateUser() { console.log("TODO: activate user") }
    async onActionDeleteUser() { console.log("TODO: delete user") }



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

    // Public methods for external control
    async refreshData() {
        // Refresh profile data
        if (this.profileView) {
            await this.profileView.updateData(this.model.getData());
        }

        // Refresh table collections
        if (this.groupsView && this.groupsView.collection) {
            await this.groupsView.collection.refresh();
        }
        if (this.eventsView && this.eventsView.collection) {
            await this.eventsView.collection.refresh();
        }
        if (this.logsView && this.logsView.collection) {
            await this.logsView.collection.refresh();
        }
    }

    async showTab(tabName) {
        if (this.tabView) {
            await this.tabView.showTab(tabName);
        }
    }

    getActiveTab() {
        return this.tabView ? this.tabView.getActiveTab() : null;
    }

    // Static factory method
    static create(options = {}) {
        return new UserView(options);
    }
}

export default UserView;
