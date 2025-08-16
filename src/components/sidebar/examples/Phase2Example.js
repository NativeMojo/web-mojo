/**
 * Phase 2 Example - Complete Group Selector Implementation
 * Demonstrates full group selector functionality with real-world usage patterns
 * 
 * Features Demonstrated:
 * - Group selector integration with sidebar
 * - Real-time group search with debouncing
 * - Group context switching for multi-tenant applications
 * - Group management operations (create, manage)
 * - User permission handling
 * - Application state synchronization
 * - Mobile-responsive group selection
 * - Error handling and loading states
 */

import Page from '../../core/Page.js';
import Sidebar from '../Sidebar.js';
import GroupSelector from '../GroupSelector.js';
import { Group, GroupCollection } from '../../models/Group.js';
import AdminSidebarConfig from '../sidebar/configs/AdminSidebarConfig.js';

/**
 * Custom Multi-Tenant Sidebar Configuration
 * Extends AdminSidebarConfig with group-aware navigation
 */
class MultiTenantSidebarConfig extends AdminSidebarConfig {
    constructor(options = {}) {
        super({
            enableGroupSelector: true,
            ...options
        });
    }

    getBrandConfig() {
        return {
            text: 'TenantPro',
            subtext: 'Multi-Tenant Management',
            icon: 'bi bi-buildings',
            clickable: true,
            route: '/dashboard'
        };
    }

    getNavigationConfig() {
        const currentGroup = this.getCurrentGroup();
        const groupPrefix = currentGroup ? `/groups/${currentGroup.id}` : '';

        return {
            items: [
                // Context-aware navigation based on selected group
                this.createNavItem({
                    text: 'Dashboard',
                    route: `${groupPrefix}/dashboard`,
                    icon: 'bi bi-speedometer2'
                }),

                this.createNavDivider('Group Management'),

                this.createNavItem({
                    text: 'Group Overview',
                    route: `${groupPrefix}/overview`,
                    icon: 'bi bi-diagram-3',
                    visible: !!currentGroup
                }),

                this.createNavItem({
                    text: 'Members',
                    icon: 'bi bi-people',
                    visible: !!currentGroup,
                    children: [
                        {
                            text: 'All Members',
                            route: `${groupPrefix}/members`,
                            icon: 'bi bi-people-fill'
                        },
                        {
                            text: 'Add Member',
                            route: `${groupPrefix}/members/add`,
                            icon: 'bi bi-person-plus',
                            permissions: ['manage_members']
                        },
                        {
                            text: 'Roles & Permissions',
                            route: `${groupPrefix}/members/roles`,
                            icon: 'bi bi-shield-check',
                            permissions: ['manage_roles']
                        }
                    ]
                }),

                this.createNavItem({
                    text: 'Projects',
                    icon: 'bi bi-folder',
                    visible: !!currentGroup,
                    children: [
                        {
                            text: 'Active Projects',
                            route: `${groupPrefix}/projects`,
                            icon: 'bi bi-folder-check'
                        },
                        {
                            text: 'Create Project',
                            route: `${groupPrefix}/projects/new`,
                            icon: 'bi bi-folder-plus',
                            permissions: ['create_project']
                        },
                        {
                            text: 'Templates',
                            route: `${groupPrefix}/projects/templates`,
                            icon: 'bi bi-files'
                        }
                    ]
                }),

                this.createNavDivider('Analytics & Reports'),

                this.createNavItem({
                    text: 'Group Analytics',
                    route: `${groupPrefix}/analytics`,
                    icon: 'bi bi-graph-up',
                    visible: !!currentGroup,
                    badge: currentGroup ? { text: 'Live', class: 'badge bg-success' } : null
                }),

                this.createNavItem({
                    text: 'Reports',
                    icon: 'bi bi-file-text',
                    visible: !!currentGroup,
                    children: [
                        {
                            text: 'Activity Report',
                            route: `${groupPrefix}/reports/activity`,
                            icon: 'bi bi-activity'
                        },
                        {
                            text: 'Member Report',
                            route: `${groupPrefix}/reports/members`,
                            icon: 'bi bi-person-lines-fill'
                        },
                        {
                            text: 'Usage Report',
                            route: `${groupPrefix}/reports/usage`,
                            icon: 'bi bi-bar-chart'
                        }
                    ]
                }),

                this.createNavDivider('System'),

                this.createNavItem({
                    text: 'Global Admin',
                    icon: 'bi bi-shield-exclamation',
                    permissions: ['super_admin'],
                    children: [
                        {
                            text: 'All Groups',
                            route: '/admin/groups',
                            icon: 'bi bi-diagram-2'
                        },
                        {
                            text: 'System Settings',
                            route: '/admin/settings',
                            icon: 'bi bi-gear-wide'
                        },
                        {
                            text: 'Audit Logs',
                            route: '/admin/audit',
                            icon: 'bi bi-journal-check'
                        }
                    ]
                }),

                this.createNavItem({
                    text: 'Group Settings',
                    route: `${groupPrefix}/settings`,
                    icon: 'bi bi-gear',
                    visible: !!currentGroup,
                    permissions: ['manage_group']
                })
            ],
            defaultActiveRoute: currentGroup ? `${groupPrefix}/dashboard` : '/dashboard'
        };
    }

    getGroupConfig() {
        return {
            ...super.getGroupConfig(),
            enabled: true,
            endpoint: '/api/groups/accessible',
            placeholder: 'Search your groups...',
            searchMinLength: 1,
            searchDebounce: 200,
            allowGroupCreation: true,
            showAllGroups: false // Only show groups user has access to
        };
    }
}

/**
 * Phase 2 Demo Page with Complete Group Selector Implementation
 */
class Phase2DemoPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'Phase 2 Group Selector Demo',
            route: '/phase2-demo/:groupId?/:section?',
            template: `
                <div class="phase2-demo-layout">
                    <!-- Sidebar with Group Selector -->
                    <div class="demo-sidebar" data-container="sidebar"></div>
                    
                    <!-- Main Content Area -->
                    <div class="demo-main">
                        <div class="demo-header">
                            <div class="container-fluid">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <h1 class="h3 mb-0">Phase 2 Group Selector Demo</h1>
                                        <nav aria-label="breadcrumb">
                                            <ol class="breadcrumb mb-0">
                                                <li class="breadcrumb-item">Demo</li>
                                                {{#currentGroup}}
                                                <li class="breadcrumb-item">{{currentGroup.name}}</li>
                                                {{/currentGroup}}
                                                <li class="breadcrumb-item active">{{currentSection}}</li>
                                            </ol>
                                        </nav>
                                    </div>
                                    <div class="col-auto">
                                        <div class="btn-group">
                                            <button class="btn btn-outline-primary" data-action="simulate-user-change">
                                                <i class="bi bi-person-circle me-1"></i>
                                                Switch User
                                            </button>
                                            <button class="btn btn-outline-secondary" data-action="toggle-debug">
                                                <i class="bi bi-bug me-1"></i>
                                                Debug Panel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="demo-content">
                            <div class="container-fluid">
                                <!-- Current State Display -->
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h5 class="card-title mb-0">
                                                    <i class="bi bi-info-circle me-2"></i>
                                                    Current State
                                                </h5>
                                            </div>
                                            <div class="card-body">
                                                <dl class="row mb-0">
                                                    <dt class="col-sm-4">Selected Group:</dt>
                                                    <dd class="col-sm-8">
                                                        {{#currentGroup}}
                                                        <span class="badge bg-primary">{{currentGroup.name}}</span>
                                                        <small class="text-muted d-block">{{currentGroup.type}} • {{currentGroup.memberCount}} members</small>
                                                        {{/currentGroup}}
                                                        {{^currentGroup}}
                                                        <span class="text-muted">No group selected</span>
                                                        {{/currentGroup}}
                                                    </dd>
                                                    <dt class="col-sm-4">Current User:</dt>
                                                    <dd class="col-sm-8">
                                                        {{#currentUser}}
                                                        {{currentUser.name}}
                                                        <small class="text-muted d-block">{{currentUser.roles}}</small>
                                                        {{/currentUser}}
                                                        {{^currentUser}}
                                                        <span class="text-muted">Anonymous</span>
                                                        {{/currentUser}}
                                                    </dd>
                                                    <dt class="col-sm-4">Route:</dt>
                                                    <dd class="col-sm-8">
                                                        <code>{{currentRoute}}</code>
                                                    </dd>
                                                </dl>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h5 class="card-title mb-0">
                                                    <i class="bi bi-activity me-2"></i>
                                                    Recent Events
                                                </h5>
                                            </div>
                                            <div class="card-body">
                                                <div class="event-log" data-container="event-log" style="max-height: 200px; overflow-y: auto;">
                                                    {{#events}}
                                                    <div class="event-item d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <strong>{{type}}</strong>
                                                            <div class="small text-muted">{{message}}</div>
                                                        </div>
                                                        <small class="text-muted">{{timestamp}}</small>
                                                    </div>
                                                    {{/events}}
                                                    {{^events}}
                                                    <div class="text-muted text-center py-3">
                                                        No events yet
                                                    </div>
                                                    {{/events}}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Demo Controls -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <div class="card">
                                            <div class="card-header">
                                                <h5 class="card-title mb-0">
                                                    <i class="bi bi-sliders me-2"></i>
                                                    Demo Controls
                                                </h5>
                                            </div>
                                            <div class="card-body">
                                                <div class="row">
                                                    <div class="col-md-4">
                                                        <h6>User Simulation</h6>
                                                        <div class="d-grid gap-2">
                                                            <button class="btn btn-outline-primary btn-sm" data-action="set-admin-user">
                                                                Admin User
                                                            </button>
                                                            <button class="btn btn-outline-success btn-sm" data-action="set-manager-user">
                                                                Group Manager
                                                            </button>
                                                            <button class="btn btn-outline-info btn-sm" data-action="set-member-user">
                                                                Regular Member
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-4">
                                                        <h6>Group Operations</h6>
                                                        <div class="d-grid gap-2">
                                                            <button class="btn btn-outline-primary btn-sm" data-action="create-sample-groups">
                                                                Create Sample Groups
                                                            </button>
                                                            <button class="btn btn-outline-warning btn-sm" data-action="clear-group-selection">
                                                                Clear Selection
                                                            </button>
                                                            <button class="btn btn-outline-danger btn-sm" data-action="simulate-error">
                                                                Simulate Error
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-4">
                                                        <h6>Configuration</h6>
                                                        <div class="d-grid gap-2">
                                                            <button class="btn btn-outline-secondary btn-sm" data-action="toggle-quick-actions">
                                                                Toggle Quick Actions
                                                            </button>
                                                            <button class="btn btn-outline-secondary btn-sm" data-action="toggle-hierarchy">
                                                                Toggle Hierarchy
                                                            </button>
                                                            <button class="btn btn-outline-secondary btn-sm" data-action="change-endpoint">
                                                                Change Endpoint
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Debug Panel -->
                                {{#showDebug}}
                                <div class="row">
                                    <div class="col-12">
                                        <div class="card border-warning">
                                            <div class="card-header bg-warning text-dark">
                                                <h5 class="card-title mb-0">
                                                    <i class="bi bi-bug me-2"></i>
                                                    Debug Information
                                                </h5>
                                            </div>
                                            <div class="card-body">
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <h6>Sidebar Manager State</h6>
                                                        <pre class="bg-light p-3 small"><code>{{debugInfo.sidebarManager}}</code></pre>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <h6>Group Selector State</h6>
                                                        <pre class="bg-light p-3 small"><code>{{debugInfo.groupSelector}}</code></pre>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {{/showDebug}}
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        // State
        this.currentUser = null;
        this.currentGroup = null;
        this.events = [];
        this.showDebug = false;
        this.sampleGroups = [];
        
        // Configuration
        this.quickActionsEnabled = true;
        this.hierarchyEnabled = true;
    }

    /**
     * Initialize the demo page
     */
    async onInit() {
        await super.onInit();
        
        // Create advanced sidebar with group selector
        this.sidebar = new Sidebar({
            container: '[data-container="sidebar"]',
            enableConfigSwitcher: true,
            persistConfig: false, // Disable for demo
            autoSwitchByRole: true,
            user: this.currentUser
        });

        // Register the multi-tenant configuration
        this.sidebar.getSidebarManager().registerConfiguration(
            'multitenant', 
            MultiTenantSidebarConfig,
            {
                description: 'Multi-Tenant Management',
                roles: ['admin', 'manager'],
                priority: 10
            }
        );

        // Setup sidebar event handlers
        this.setupSidebarEvents();
        
        // Add sidebar as child
        this.addChild(this.sidebar);
        
        // Set initial user
        await this.setDemoUser('admin');
        
        // Create sample groups
        await this.createSampleGroups();
    }

    /**
     * Setup sidebar event listeners
     */
    setupSidebarEvents() {
        // Group selection events
        this.sidebar.on('group-selected', async (data) => {
            await this.onGroupSelected(data);
        });

        this.sidebar.on('group-cleared', async (data) => {
            await this.onGroupCleared(data);
        });

        // Group management events
        this.sidebar.on('create-group-requested', async (data) => {
            await this.onCreateGroupRequested(data);
        });

        this.sidebar.on('manage-groups-requested', async (data) => {
            await this.onManageGroupsRequested(data);
        });

        // Configuration change events
        this.sidebar.on('configuration-changed', async (data) => {
            this.logEvent('CONFIG_CHANGED', `Switched to ${data.configName}`);
        });
    }

    /**
     * Handle group selection
     */
    async onGroupSelected(data) {
        const { group, previousGroup } = data;
        this.currentGroup = group;
        
        this.logEvent('GROUP_SELECTED', `Selected: ${group.name} (${group.type})`);
        
        // Update route to reflect group context
        const newRoute = `/phase2-demo/${group.id}/overview`;
        await this.navigateToRoute(newRoute);
        
        // Re-render to show updated state
        await this.render();
    }

    /**
     * Handle group cleared
     */
    async onGroupCleared(data) {
        const { previousGroup } = data;
        this.currentGroup = null;
        
        this.logEvent('GROUP_CLEARED', `Cleared: ${previousGroup?.name || 'Unknown'}`);
        
        // Navigate back to general dashboard
        await this.navigateToRoute('/phase2-demo');
        
        await this.render();
    }

    /**
     * Handle create group request
     */
    async onCreateGroupRequested(data) {
        const { searchQuery } = data;
        
        this.logEvent('CREATE_GROUP_REQUEST', `Requested creation with query: "${searchQuery}"`);
        
        // Simulate group creation
        const newGroup = {
            id: `group_${Date.now()}`,
            name: searchQuery || `New Group ${Date.now()}`,
            description: 'Created from search',
            type: 'team',
            status: 'active',
            memberCount: 1
        };
        
        this.sampleGroups.push(newGroup);
        
        // Show success message
        await this.showSuccess(`Group "${newGroup.name}" created successfully!`);
        
        // Refresh group selector
        if (this.sidebar.groupSelector) {
            await this.sidebar.groupSelector.refresh();
        }
    }

    /**
     * Handle manage groups request
     */
    async onManageGroupsRequested(data) {
        const { selectedGroup } = data;
        
        this.logEvent('MANAGE_GROUPS_REQUEST', `Manage groups requested for: ${selectedGroup?.name || 'None'}`);
        
        // Navigate to group management (simulated)
        if (selectedGroup) {
            await this.navigateToRoute(`/phase2-demo/${selectedGroup.id}/settings`);
        } else {
            await this.navigateToRoute('/phase2-demo/admin/groups');
        }
    }

    /**
     * Get view data for template
     */
    async getViewData() {
        return {
            currentUser: this.currentUser,
            currentGroup: this.currentGroup,
            currentRoute: this.getCurrentRoute(),
            currentSection: this.params?.section || 'overview',
            events: this.events.slice(-5).reverse(),
            showDebug: this.showDebug,
            debugInfo: this.showDebug ? {
                sidebarManager: JSON.stringify(this.sidebar?.getSidebarManager()?.getInfo() || {}, null, 2),
                groupSelector: this.sidebar?.groupSelector ? 
                    JSON.stringify({
                        selectedGroup: this.sidebar.groupSelector.getSelectedGroup(),
                        searchQuery: this.sidebar.groupSelector.searchQuery || '',
                        loading: this.sidebar.groupSelector.loading,
                        error: this.sidebar.groupSelector.error
                    }, null, 2) : 'Not initialized'
            } : null
        };
    }

    /**
     * Demo Control Action Handlers
     */
    async handleActionSetAdminUser(event, element) {
        await this.setDemoUser('admin');
    }

    async handleActionSetManagerUser(event, element) {
        await this.setDemoUser('manager');
    }

    async handleActionSetMemberUser(event, element) {
        await this.setDemoUser('member');
    }

    async handleActionCreateSampleGroups(event, element) {
        await this.createSampleGroups();
        await this.showSuccess('Sample groups created!');
    }

    async handleActionClearGroupSelection(event, element) {
        if (this.sidebar.groupSelector) {
            await this.sidebar.groupSelector.clearSelection();
        }
    }

    async handleActionSimulateError(event, element) {
        if (this.sidebar.groupSelector) {
            this.sidebar.groupSelector.error = 'Simulated connection error';
            await this.sidebar.groupSelector.render();
            
            this.logEvent('ERROR_SIMULATED', 'Simulated group selector error');
        }
    }

    async handleActionToggleQuickActions(event, element) {
        this.quickActionsEnabled = !this.quickActionsEnabled;
        
        if (this.sidebar.groupSelector) {
            await this.sidebar.groupSelector.updateConfig({
                enableQuickActions: this.quickActionsEnabled
            });
        }
        
        this.logEvent('QUICK_ACTIONS_TOGGLED', `Quick actions: ${this.quickActionsEnabled}`);
    }

    async handleActionToggleHierarchy(event, element) {
        this.hierarchyEnabled = !this.hierarchyEnabled;
        
        if (this.sidebar.groupSelector) {
            await this.sidebar.groupSelector.updateConfig({
                enableHierarchy: this.hierarchyEnabled
            });
        }
        
        this.logEvent('HIERARCHY_TOGGLED', `Hierarchy display: ${this.hierarchyEnabled}`);
    }

    async handleActionChangeEndpoint(event, element) {
        const endpoints = [
            '/api/groups',
            '/api/groups/accessible',
            '/api/organizations',
            '/api/teams'
        ];
        
        const currentEndpoint = this.sidebar.groupSelector?.config?.endpoint || '/api/groups';
        const currentIndex = endpoints.indexOf(currentEndpoint);
        const newEndpoint = endpoints[(currentIndex + 1) % endpoints.length];
        
        if (this.sidebar.groupSelector) {
            await this.sidebar.groupSelector.updateConfig({
                endpoint: newEndpoint
            });
        }
        
        this.logEvent('ENDPOINT_CHANGED', `Changed to: ${newEndpoint}`);
    }

    async handleActionToggleDebug(event, element) {
        this.showDebug = !this.showDebug;
        await this.render();
    }

    async handleActionSimulateUserChange(event, element) {
        const users = ['admin', 'manager', 'member'];
        const currentType = this.currentUser?.type || 'admin';
        const currentIndex = users.indexOf(currentType);
        const newType = users[(currentIndex + 1) % users.length];
        
        await this.setDemoUser(newType);
    }

    /**
     * Set demo user with different roles and permissions
     */
    async setDemoUser(type) {
        const users = {
            admin: {
                id: 'admin_001',
                name: 'Admin User',
                type: 'admin',
                roles: ['admin', 'super_admin'],
                permissions: ['read', 'write', 'admin', 'manage_groups', 'create_group', 'manage_members', 'manage_roles']
            },
            manager: {
                id: 'manager_001', 
                name: 'Group Manager',
                type: 'manager',
                roles: ['manager', 'group_admin'],
                permissions: ['read', 'write', 'manage_members', 'create_project', 'manage_group']
            },
            member: {
                id: 'member_001',
                name: 'Regular Member',
                type: 'member',
                roles: ['member'],
                permissions: ['read']
            }
        };

        this.currentUser = users[type];
        
        // Update sidebar with new user
        await this.sidebar.setUser(this.currentUser);
        
        this.logEvent('USER_CHANGED', `Switched to: ${this.currentUser.name} (${type})`);
        
        await this.render();
    }

    /**
     * Create sample groups for testing
     */
    async createSampleGroups() {
        this.sampleGroups = [
            {
                id: 'org_001',
                name: 'TechCorp Industries',
                description: 'Main organization for all tech operations',
                type: 'organization',
                status: 'active',
                memberCount: 150,
                parent_path: null
            },
            {
                id: 'team_001',
                name: 'Engineering Team',
                description: 'Software development and engineering',
                type: 'team',
                status: 'active',
                memberCount: 25,
                parent_path: 'TechCorp Industries',
                parent_id: 'org_001'
            },
            {
                id: 'team_002',
                name: 'Marketing Department',
                description: 'Marketing and brand management',
                type: 'department',
                status: 'active',
                memberCount: 12,
                parent_path: 'TechCorp Industries',
                parent_id: 'org_001'
            },
            {
                id: 'project_001',
                name: 'Mobile App Project',
                description: 'New mobile application development',
                type: 'project',
                status: 'active',
                memberCount: 8,
                parent_path: 'TechCorp Industries/Engineering Team',
                parent_id: 'team_001'
            },
            {
                id: 'team_003',
                name: 'Sales Team',
                description: 'Sales and customer relations',
                type: 'team',
                status: 'active',
                memberCount: 18,
                parent_path: 'TechCorp Industries',
                parent_id: 'org_001'
            }
        ];
    }

    /**
     * Log an event for demonstration
     */
    logEvent(type, message) {
        this.events.push({
            type,
            message,
            timestamp: new Date().toLocaleTimeString()
        });

        // Keep only last 20 events
        if (this.events.length > 20) {
            this.events = this.events.slice(-20);
        }

        console.log(`[Phase2Demo] ${type}: ${message}`);
    }

    /**
     * Handle route parameters
     */
    async onParams(params) {
        await super.onParams(params);
        
        // Update sidebar active item
        await this.sidebar.updateActiveItem(this.getCurrentRoute());
        
        // If groupId in route, ensure it's selected
        if (params.groupId && (!this.currentGroup || this.currentGroup.id !== params.groupId)) {
            const group = this.sampleGroups.find(g => g.id === params.groupId);
            if (group && this.sidebar.groupSelector) {
                await this.sidebar.groupSelector.setSelectedGroup(group);
            }
        }
    }

    /**
     * Navigate to a route
     */
    async navigateToRoute(route) {
        const app = this.getApp();
        if (app && app.navigate) {
            await app.navigate(route);
        }
    }

    /**
     * Get current route
     */
    getCurrentRoute() {
        const params = this.params || {};
        const parts = ['/phase2-demo'];
        
        if (params.groupId) parts.push(params.groupId);
        if (params.section) parts.push(params.section);
        
        return parts.join('/');
    }
}

/**
 * Standalone Group Selector Demo Component
 * Shows GroupSelector working independently of Sidebar
 */
class StandaloneGroupSelectorDemo extends Page {
    constructor(options = {}) {
        super({
            pageName: 'Standalone Group Selector',
            route: '/group-selector-demo',
            template: `
                <div class="container mt-4">
                    <div class="row">
                        <div class="col-md-6">
                            <h2>Standalone Group Selector</h2>
                            <p class="text-muted">GroupSelector component working independently</p>
                            
                            <div class="card">
                                <div class="card-body">
                                    <div data-container="group-selector"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <h3>Selected Group Info</h3>
                            {{#selectedGroup}}
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">{{selectedGroup.name}}</h5>
                                    <p class="card-text">{{selectedGroup.description}}</p>
                                    <div class="small text-muted">
                                        <div>Type: {{selectedGroup.type}}</div>
                                        <div>Members: {{selectedGroup.memberCount}}</div>
                                        <div>Status: {{selectedGroup.status}}</div>
                                    </div>
                                </div>
                            </div>
                            {{/selectedGroup}}
                            {{^selectedGroup}}
                            <div class="alert alert-info">
                                No group selected. Use the selector to choose a group.
                            </div>
                            {{/selectedGroup}}
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        this.selectedGroup = null;
        this.groupSelector = null;
    }

    /**
     * Initialize standalone group selector
     */
    async onInit() {
        await super.onInit();
        
        // Create standalone group selector
        this.groupSelector = new GroupSelector({
            container: '[data-container="group-selector"]',
            endpoint: '/api/groups',
            placeholder: 'Search all groups...',
            minSearchLength: 1,
            searchDebounce: 250,
            maxResults: 15,
            enableQuickActions: true,
            enableHierarchy: true,
            showMemberCount: true,
            userPermissions: ['read', 'write', 'manage_groups', 'create_group']
        });

        // Setup event listeners
        this.groupSelector.on('group-selected', async (data) => {
            this.selectedGroup = data.group;
            await this.render();
            console.log('Standalone selector - Group selected:', data.group);
        });

        this.groupSelector.on('group-cleared', async (data) => {
            this.selectedGroup = null;
            await this.render();
            console.log('Standalone selector - Group cleared');
        });

        this.groupSelector.on('create-group-requested', async (data) => {
            console.log('Standalone selector - Create group requested:', data.searchQuery);
            await this.showInfo(`Create group requested for: "${data.searchQuery}"`);
        });

        this.groupSelector.on('manage-groups-requested', async (data) => {
            console.log('Standalone selector - Manage groups requested');
            await this.showInfo('Group management requested');
        });

        // Add as child
        this.addChild(this.groupSelector);
    }

    /**
     * Get view data
     */
    async getViewData() {
        return {
            selectedGroup: this.selectedGroup
        };
    }
}

/**
 * Mock API Handler for Demo
 * Simulates REST endpoints for group operations
 */
class MockGroupAPI {
    constructor() {
        this.groups = this.generateMockGroups();
    }

    /**
     * Generate mock groups for demo
     */
    generateMockGroups() {
        return [
            {
                id: 'org_techcorp',
                name: 'TechCorp Industries',
                description: 'Main technology corporation',
                type: 'organization',
                status: 'active',
                memberCount: 250,
                parent_id: null,
                parent_path: null
            },
            {
                id: 'dept_engineering',
                name: 'Engineering Department',
                description: 'Software development and engineering teams',
                type: 'department',
                status: 'active',
                memberCount: 85,
                parent_id: 'org_techcorp',
                parent_path: 'TechCorp Industries'
            },
            {
                id: 'team_frontend',
                name: 'Frontend Team',
                description: 'User interface and experience development',
                type: 'team',
                status: 'active',
                memberCount: 12,
                parent_id: 'dept_engineering',
                parent_path: 'TechCorp Industries/Engineering Department'
            },
            {
                id: 'team_backend',
                name: 'Backend Team',
                description: 'Server-side development and APIs',
                type: 'team',
                status: 'active',
                memberCount: 15,
                parent_id: 'dept_engineering',
                parent_path: 'TechCorp Industries/Engineering Department'
            },
            {
                id: 'team_devops',
                name: 'DevOps Team',
                description: 'Infrastructure and deployment automation',
                type: 'team',
                status: 'active',
                memberCount: 8,
                parent_id: 'dept_engineering',
                parent_path: 'TechCorp Industries/Engineering Department'
            },
            {
                id: 'dept_marketing',
                name: 'Marketing Department',
                description: 'Brand management and customer outreach',
                type: 'department',
                status: 'active',
                memberCount: 35,
                parent_id: 'org_techcorp',
                parent_path: 'TechCorp Industries'
            },
            {
                id: 'team_digital',
                name: 'Digital Marketing',
                description: 'Online marketing and social media',
                type: 'team',
                status: 'active',
                memberCount: 18,
                parent_id: 'dept_marketing',
                parent_path: 'TechCorp Industries/Marketing Department'
            },
            {
                id: 'team_content',
                name: 'Content Team',
                description: 'Content creation and copywriting',
                type: 'team',
                status: 'active',
                memberCount: 10,
                parent_id: 'dept_marketing',
                parent_path: 'TechCorp Industries/Marketing Department'
            },
            {
                id: 'proj_mobile',
                name: 'Mobile App Project',
                description: 'New mobile application development initiative',
                type: 'project',
                status: 'active',
                memberCount: 22,
                parent_id: 'dept_engineering',
                parent_path: 'TechCorp Industries/Engineering Department'
            },
            {
                id: 'proj_ai',
                name: 'AI Research Project',
                description: 'Machine learning and AI capabilities research',
                type: 'project',
                status: 'active',
                memberCount: 14,
                parent_id: 'dept_engineering',
                parent_path: 'TechCorp Industries/Engineering Department'
            },
            {
                id: 'org_subsidiary',
                name: 'DataSoft Solutions',
                description: 'Data analytics subsidiary company',
                type: 'organization',
                status: 'active',
                memberCount: 67,
                parent_id: null,
                parent_path: null
            },
            {
                id: 'team_analytics',
                name: 'Analytics Team',
                description: 'Data analysis and business intelligence',
                type: 'team',
                status: 'active',
                memberCount: 25,
                parent_id: 'org_subsidiary',
                parent_path: 'DataSoft Solutions'
            }
        ];
    }

    /**
     * Simulate group search API
     */
    async searchGroups(query, filters = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

        let results = [...this.groups];

        // Filter by query
        if (query && query.length >= 1) {
            const searchTerm = query.toLowerCase();
            results = results.filter(group => {
                const searchableText = [
                    group.name,
                    group.description,
                    group.type,
                    group.parent_path
                ].filter(Boolean).join(' ').toLowerCase();
                
                return searchableText.includes(searchTerm);
            });
        }

        // Filter by type
        if (filters.type) {
            results = results.filter(group => group.type === filters.type);
        }

        // Filter by status
        if (filters.status && filters.status !== 'all') {
            results = results.filter(group => group.status === filters.status);
        }

        // Sort by name
        results.sort((a, b) => a.name.localeCompare(b.name));

        // Limit results
        const limit = filters.limit || 20;
        results = results.slice(0, limit);

        return {
            success: true,
            data: {
                data: results,
                count: results.length,
                start: 0,
                size: limit
            }
        };
    }

    /**
     * Get group by ID
     */
    async getGroup(id) {
        const group = this.groups.find(g => g.id === id);
        if (!group) {
            return {
                success: false,
                error: 'Group not found'
            };
        }

        return {
            success: true,
            data: group
        };
    }

    /**
     * Create new group
     */
    async createGroup(data) {
        const newGroup = {
            id: `group_${Date.now()}`,
            name: data.name,
            description: data.description || '',
            type: data.type || 'team',
            status: 'active',
            memberCount: 1,
            parent_id: data.parent_id || null,
            parent_path: data.parent_path || null
        };

        this.groups.push(newGroup);

        return {
            success: true,
            data: newGroup
        };
    }
}

// Export classes for use
export default Phase2DemoPage;
export { 
    MultiTenantSidebarConfig, 
    StandaloneGroupSelectorDemo, 
    MockGroupAPI 
};