# Phase 2 Integration Guide - Group Selector Implementation

Complete guide for implementing and integrating the advanced Group Selector functionality in MOJO's sidebar system.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Implementation Steps](#implementation-steps)
- [API Requirements](#api-requirements)
- [Configuration Options](#configuration-options)
- [Event System](#event-system)
- [Advanced Features](#advanced-features)
- [Multi-Tenant Implementation](#multi-tenant-implementation)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Mobile Considerations](#mobile-considerations)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Migration from Phase 1](#migration-from-phase-1)

## Overview

Phase 2 introduces advanced group/organization selection capabilities to the sidebar, enabling:

- **Search-ahead functionality** with real-time results
- **Multi-tenant application support** with group context switching
- **Hierarchical group display** showing organizational structure
- **Permission-based group filtering** based on user access
- **Group management operations** (create, manage, navigate)
- **Mobile-responsive interface** with touch-friendly interactions
- **Accessibility compliance** with keyboard navigation and ARIA support

### Key Components

- **GroupSelector**: Standalone search-ahead component
- **Enhanced Group Model**: Advanced group data management
- **Integration Layer**: Seamless sidebar integration
- **Event System**: Comprehensive event handling for group operations

## Quick Start

### Basic Integration

```javascript
import Sidebar from './components/Sidebar.js';

// Create sidebar with group selector enabled
const sidebar = new Sidebar({
    container: '#sidebar-container',
    user: currentUser
});

// Enable group selector
await sidebar.enableGroupSelector({
    endpoint: '/api/groups',
    placeholder: 'Search groups...',
    searchMinLength: 2
});

// Listen for group selection
sidebar.on('group-selected', (data) => {
    const { group } = data;
    console.log('Selected group:', group.name);
    
    // Update application context
    app.setActiveGroup(group);
});
```

### Standalone Usage

```javascript
import GroupSelector from './components/GroupSelector.js';

// Create standalone group selector
const groupSelector = new GroupSelector({
    container: '#group-selector',
    endpoint: '/api/organizations',
    placeholder: 'Select organization...',
    minSearchLength: 1,
    enableQuickActions: true,
    userPermissions: ['create_group', 'manage_groups']
});

// Add to page
this.addChild(groupSelector);
```

## Implementation Steps

### Step 1: Backend API Setup

Create the required API endpoints for group operations:

```javascript
// GET /api/groups - Search and list groups
{
    "success": true,
    "data": {
        "data": [
            {
                "id": "group_001",
                "name": "Engineering Team",
                "description": "Software development team",
                "type": "team",
                "status": "active",
                "memberCount": 25,
                "parent_id": "org_001",
                "parent_path": "TechCorp/Engineering",
                "permissions": ["read", "write"],
                "created_at": "2023-01-15T10:00:00Z",
                "updated_at": "2024-01-15T10:00:00Z"
            }
        ],
        "count": 1,
        "start": 0,
        "size": 20
    }
}
```

Required query parameters:
- `q`: Search query string
- `type`: Filter by group type (optional)
- `status`: Filter by status (default: 'active')
- `parent_id`: Filter by parent group (optional)
- `member_id`: Filter groups where user is member (optional)
- `start`: Pagination offset
- `size`: Results per page

### Step 2: Configure Sidebar for Groups

```javascript
import AdminSidebarConfig from './configs/AdminSidebarConfig.js';

// Create custom configuration with group support
class MyAppConfig extends AdminSidebarConfig {
    getGroupConfig() {
        return {
            enabled: true,
            endpoint: '/api/groups/accessible',
            placeholder: 'Switch organization...',
            searchMinLength: 1,
            searchDebounce: 200,
            allowGroupCreation: true,
            showAllGroups: false
        };
    }
    
    getNavigationConfig() {
        const currentGroup = this.getCurrentGroup();
        const groupPrefix = currentGroup ? `/groups/${currentGroup.id}` : '';
        
        return {
            items: [
                this.createNavItem({
                    text: 'Dashboard',
                    route: `${groupPrefix}/dashboard`,
                    icon: 'bi bi-speedometer2'
                }),
                
                // Group-specific navigation
                this.createNavItem({
                    text: 'Team Members',
                    route: `${groupPrefix}/members`,
                    icon: 'bi bi-people',
                    visible: !!currentGroup
                }),
                
                // Global navigation (always visible)
                this.createNavItem({
                    text: 'All Groups',
                    route: '/admin/groups',
                    icon: 'bi bi-diagram-3',
                    permissions: ['admin']
                })
            ]
        };
    }
}

// Register configuration
sidebar.getSidebarManager().registerConfiguration('myapp', MyAppConfig);
```

### Step 3: Handle Group Events

```javascript
class MyApplication {
    async setupGroupHandling() {
        // Listen for group selection
        this.sidebar.on('group-selected', async (data) => {
            const { group, previousGroup } = data;
            
            // Update application state
            await this.setActiveGroup(group);
            
            // Update navigation context
            await this.updateNavigationContext(group);
            
            // Refresh data for new group
            await this.refreshGroupData(group);
            
            // Update URL to reflect group context
            await this.navigate(`/groups/${group.id}/dashboard`);
        });
        
        // Handle group clearing
        this.sidebar.on('group-cleared', async (data) => {
            await this.clearActiveGroup();
            await this.navigate('/dashboard');
        });
        
        // Handle group creation requests
        this.sidebar.on('create-group-requested', async (data) => {
            const { searchQuery } = data;
            await this.showCreateGroupDialog(searchQuery);
        });
        
        // Handle group management requests
        this.sidebar.on('manage-groups-requested', async (data) => {
            await this.navigate('/admin/groups');
        });
    }
    
    async setActiveGroup(group) {
        this.activeGroup = group;
        
        // Store in session/localStorage
        sessionStorage.setItem('activeGroup', JSON.stringify(group));
        
        // Update global state
        this.setState({ activeGroup: group });
        
        // Emit app-level event
        this.emit('active-group-changed', { group });
    }
}
```

## API Requirements

### Group Data Model

```javascript
{
    "id": "string",                    // Required: Unique identifier
    "name": "string",                  // Required: Display name
    "slug": "string",                  // Optional: URL-friendly identifier
    "description": "string",           // Optional: Group description
    "type": "string",                  // Required: organization|team|department|project|custom
    "status": "string",                // Required: active|inactive|archived|pending
    "parent_id": "string|null",        // Optional: Parent group ID
    "parent_path": "string|null",      // Optional: Hierarchy path (e.g., "Org/Dept")
    "memberCount": "number",           // Optional: Number of members
    "permissions": "array",            // Optional: User permissions in this group
    "metadata": "object",              // Optional: Additional data
    "settings": "object",              // Optional: Group-specific settings
    "created_at": "string",            // Optional: ISO date string
    "updated_at": "string"             // Optional: ISO date string
}
```

### Search API Endpoint

**Endpoint**: `GET /api/groups`

**Query Parameters**:
```javascript
{
    q: "search query",                 // Search term
    type: "team",                      // Filter by type
    status: "active",                  // Filter by status
    parent_id: "parent_123",           // Filter by parent
    member_id: "user_456",             // Groups where user is member
    include_hierarchy: true,           // Include parent path info
    include_member_count: true,        // Include member counts
    start: 0,                          // Pagination offset
    size: 20                          // Results per page
}
```

**Response Format**:
```javascript
{
    "success": true,
    "data": {
        "data": [...],                 // Array of group objects
        "count": 42,                   // Total matching records
        "start": 0,                    // Current offset
        "size": 20                     // Page size
    },
    "meta": {
        "took": 45,                    // Search time in ms
        "cached": false                // Whether result was cached
    }
}
```

### Group Operations API

**Create Group**: `POST /api/groups`
```javascript
{
    "name": "New Team",
    "description": "A new team",
    "type": "team",
    "parent_id": "org_001"
}
```

**Update Group**: `PATCH /api/groups/:id`
```javascript
{
    "name": "Updated Team Name",
    "description": "Updated description"
}
```

**Add Member**: `POST /api/groups/:id/members`
```javascript
{
    "user_id": "user_123",
    "role": "member",
    "permissions": ["read", "write"]
}
```

## Configuration Options

### Sidebar Configuration

```javascript
await sidebar.enableGroupSelector({
    // API Configuration
    endpoint: '/api/groups',           // Groups API endpoint
    
    // Search Configuration
    placeholder: 'Search groups...',   // Input placeholder text
    minSearchLength: 2,               // Minimum characters to search
    searchDebounce: 300,              // Search delay in milliseconds
    maxResults: 20,                   // Maximum search results
    
    // UI Configuration
    enableQuickActions: true,         // Show create/manage buttons
    enableHierarchy: true,            // Show group hierarchy
    showMemberCount: true,            // Display member counts
    autoFocus: false,                 // Auto-focus input on open
    
    // Behavior Configuration
    allowGroupCreation: true,         // Allow new group creation
    showAllGroups: false,             // Show all vs accessible only
    
    // Initial State
    selectedGroup: null,              // Pre-selected group
    disabled: false                   // Disable the selector
});
```

### GroupSelector Standalone Configuration

```javascript
const groupSelector = new GroupSelector({
    // Container
    container: '#group-selector',
    
    // API Configuration
    endpoint: '/api/organizations',
    
    // Search Configuration
    minSearchLength: 1,
    searchDebounce: 250,
    maxResults: 15,
    
    // Features
    enableQuickActions: true,
    enableHierarchy: true,
    showMemberCount: true,
    
    // User Context
    userPermissions: ['read', 'create_group'],
    selectedGroup: { id: '123', name: 'Default Org' },
    
    // Styling
    disabled: false
});
```

## Event System

### Group Selection Events

```javascript
// Group selected
sidebar.on('group-selected', (data) => {
    const { group, previousGroup, sidebar } = data;
    // Handle group selection
});

// Group cleared
sidebar.on('group-cleared', (data) => {
    const { previousGroup, sidebar } = data;
    // Handle group clearing
});

// Group management requests
sidebar.on('create-group-requested', (data) => {
    const { searchQuery, sidebar } = data;
    // Show create group form
});

sidebar.on('manage-groups-requested', (data) => {
    const { selectedGroup, sidebar } = data;
    // Navigate to group management
});
```

### GroupSelector Specific Events

```javascript
// Standalone GroupSelector events
groupSelector.on('group-selected', (data) => {
    const { group, previousGroup, selector } = data;
});

groupSelector.on('group-cleared', (data) => {
    const { previousGroup, selector } = data;
});

// Search events
groupSelector.on('search-started', (data) => {
    const { query, selector } = data;
});

groupSelector.on('search-completed', (data) => {
    const { query, results, selector } = data;
});

groupSelector.on('search-error', (data) => {
    const { query, error, selector } = data;
});
```

## Advanced Features

### Custom Search Filtering

```javascript
class CustomGroupSelector extends GroupSelector {
    async performSearch(query) {
        // Add custom filtering logic
        const baseParams = {
            q: query,
            status: 'active'
        };
        
        // Add user-specific filtering
        if (this.currentUser?.department) {
            baseParams.department = this.currentUser.department;
        }
        
        // Add custom sorting
        baseParams.sort = 'last_activity';
        baseParams.order = 'desc';
        
        return await super.performSearch(query);
    }
    
    processGroupsForDisplay() {
        const groups = super.processGroupsForDisplay();
        
        // Add custom display logic
        return groups.map(group => ({
            ...group,
            customBadge: this.getCustomBadge(group),
            priorityScore: this.calculatePriority(group)
        })).sort((a, b) => b.priorityScore - a.priorityScore);
    }
}
```

### Integration with State Management

```javascript
class StateIntegratedSidebar {
    constructor(store) {
        this.store = store;
        this.sidebar = new Sidebar({...});
        
        // Connect to state management
        this.setupStateIntegration();
    }
    
    setupStateIntegration() {
        // Listen for state changes
        this.store.subscribe('activeGroup', (group) => {
            if (this.sidebar.groupSelector) {
                this.sidebar.groupSelector.setSelectedGroup(group);
            }
        });
        
        // Update state when group changes
        this.sidebar.on('group-selected', (data) => {
            this.store.dispatch('setActiveGroup', data.group);
        });
        
        this.sidebar.on('group-cleared', () => {
            this.store.dispatch('clearActiveGroup');
        });
    }
}
```

## Multi-Tenant Implementation

### Tenant-Aware Configuration

```javascript
class MultiTenantSidebarConfig extends SidebarConfig {
    constructor(tenant, options = {}) {
        super(`tenant-${tenant.id}`, options);
        this.tenant = tenant;
    }
    
    getBrandConfig() {
        return {
            text: this.tenant.name,
            subtext: `${this.tenant.plan} Plan`,
            icon: this.tenant.icon || 'bi bi-building',
            clickable: true,
            route: `/tenants/${this.tenant.id}/dashboard`
        };
    }
    
    getGroupConfig() {
        return {
            enabled: true,
            endpoint: `/api/tenants/${this.tenant.id}/groups`,
            placeholder: `Search ${this.tenant.name} groups...`,
            searchMinLength: 1,
            allowGroupCreation: this.tenant.permissions.includes('create_group'),
            showAllGroups: this.tenant.plan === 'enterprise'
        };
    }
    
    getNavigationConfig() {
        const currentGroup = this.getCurrentGroup();
        const tenantPrefix = `/tenants/${this.tenant.id}`;
        const groupPrefix = currentGroup ? `${tenantPrefix}/groups/${currentGroup.id}` : tenantPrefix;
        
        return {
            items: [
                // Tenant dashboard
                this.createNavItem({
                    text: 'Dashboard',
                    route: `${tenantPrefix}/dashboard`,
                    icon: 'bi bi-speedometer2'
                }),
                
                // Group-specific sections
                ...this.buildGroupSpecificNav(groupPrefix, currentGroup),
                
                // Tenant-wide sections
                ...this.buildTenantNav(tenantPrefix),
                
                // Global admin (if applicable)
                ...this.buildGlobalNav()
            ]
        };
    }
    
    buildGroupSpecificNav(prefix, group) {
        if (!group) return [];
        
        return [
            this.createNavDivider(`${group.name} Management`),
            this.createNavItem({
                text: 'Group Overview',
                route: `${prefix}/overview`,
                icon: 'bi bi-diagram-3'
            }),
            this.createNavItem({
                text: 'Members',
                route: `${prefix}/members`,
                icon: 'bi bi-people'
            }),
            this.createNavItem({
                text: 'Projects',
                route: `${prefix}/projects`,
                icon: 'bi bi-folder'
            })
        ];
    }
}
```

### Tenant Context Switching

```javascript
class MultiTenantApp {
    async initializeSidebar() {
        this.sidebar = new Sidebar({
            container: '#sidebar',
            enableConfigSwitcher: true
        });
        
        // Register configurations for each tenant
        for (const tenant of this.availableTenants) {
            this.sidebar.getSidebarManager().registerConfiguration(
                `tenant-${tenant.id}`,
                () => new MultiTenantSidebarConfig(tenant),
                {
                    description: tenant.name,
                    priority: tenant.isPrimary ? 10 : 5
                }
            );
        }
        
        // Handle tenant switching
        this.sidebar.on('configuration-changed', async (data) => {
            if (data.current.name.startsWith('tenant-')) {
                const tenantId = data.current.name.replace('tenant-', '');
                await this.switchToTenant(tenantId);
            }
        });
        
        // Handle group selection within tenant
        this.sidebar.on('group-selected', async (data) => {
            await this.setActiveTenantGroup(data.group);
        });
    }
    
    async switchToTenant(tenantId) {
        const tenant = this.availableTenants.find(t => t.id === tenantId);
        if (!tenant) return;
        
        // Update application state
        this.activeTenant = tenant;
        
        // Update API base URLs
        this.updateAPIEndpoints(tenant);
        
        // Refresh data for new tenant
        await this.refreshTenantData();
        
        // Update URL
        await this.navigate(`/tenants/${tenant.id}/dashboard`);
    }
}
```

## Error Handling

### API Error Handling

```javascript
class RobustGroupSelector extends GroupSelector {
    async performSearch(query) {
        const maxRetries = 3;
        let attempts = 0;
        
        while (attempts < maxRetries) {
            try {
                return await super.performSearch(query);
            } catch (error) {
                attempts++;
                
                if (error.name === 'AbortError') {
                    // Request was cancelled, don't retry
                    throw error;
                }
                
                if (attempts >= maxRetries) {
                    // Max retries reached
                    this.handleSearchError({
                        ...error,
                        message: `Search failed after ${maxRetries} attempts: ${error.message}`
                    });
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => 
                    setTimeout(resolve, Math.pow(2, attempts) * 1000)
                );
            }
        }
    }
    
    handleSearchError(error) {
        console.error('Group search error:', error);
        
        // Show user-friendly error message
        let userMessage = 'Unable to search groups';
        
        if (error.status === 403) {
            userMessage = 'You don\'t have permission to search groups';
        } else if (error.status >= 500) {
            userMessage = 'Server error - please try again later';
        } else if (error.name === 'NetworkError') {
            userMessage = 'Network connection problem';
        }
        
        this.error = userMessage;
        this.loading = false;
        this.render();
        
        // Emit error event for application handling
        this.emit('search-error', {
            error,
            userMessage,
            selector: this
        });
    }
}
```

### Network Resilience

```javascript
class NetworkResilientGroupCollection extends GroupCollection {
    constructor(options = {}) {
        super(options);
        
        // Add offline support
        this.offlineStorage = new Map();
        this.isOnline = navigator.onLine;
        
        // Listen for network changes
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    async fetch(additionalParams = {}) {
        if (!this.isOnline) {
            // Return cached data when offline
            return this.getCachedData(additionalParams);
        }
        
        try {
            const result = await super.fetch(additionalParams);
            
            // Cache successful results
            this.cacheData(additionalParams, result);
            
            return result;
        } catch (error) {
            if (this.isNetworkError(error)) {
                // Fall back to cached data on network error
                const cachedResult = this.getCachedData(additionalParams);
                if (cachedResult) {
                    console.warn('Using cached data due to network error:', error);
                    return cachedResult;
                }
            }
            throw error;
        }
    }
    
    handleOnline() {
        this.isOnline = true;
        console.log('Network connection restored');
        
        // Refresh data when coming back online
        if (this.currentRequest) {
            this.fetch();
        }
    }
    
    handleOffline() {
        this.isOnline = false;
        console.warn('Network connection lost');
    }
    
    cacheData(params, data) {
        const key = JSON.stringify(params);
        this.offlineStorage.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    getCachedData(params) {
        const key = JSON.stringify(params);
        const cached = this.offlineStorage.get(key);
        
        if (!cached) return null;
        
        // Check if cache is still fresh (5 minutes)
        const maxAge = 5 * 60 * 1000;
        if (Date.now() - cached.timestamp > maxAge) {
            this.offlineStorage.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    isNetworkError(error) {
        return error.name === 'NetworkError' || 
               error.message.includes('network') ||
               error.code === 'NETWORK_ERROR';
    }
}
```

## Performance Optimization

### Search Optimization

```javascript
class OptimizedGroupSelector extends GroupSelector {
    constructor(options = {}) {
        super(options);
        
        // Search result caching
        this.searchCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Request deduplication
        this.pendingSearches = new Map();
    }
    
    async performSearch(query) {
        // Check cache first
        const cachedResult = this.getCachedSearch(query);
        if (cachedResult) {
            this.updateSearchResults(cachedResult);
            return;
        }
        
        // Deduplicate identical requests
        const searchKey = `${query}:${JSON.stringify(this.searchFilters)}`;
        if (this.pendingSearches.has(searchKey)) {
            return this.pendingSearches.get(searchKey);
        }
        
        // Perform search with caching
        const searchPromise = this.executeSearch(query).then(results => {
            this.cacheSearch(query, results);
            this.pendingSearches.delete(searchKey);
            return results;
        }).catch(error => {
            this.pendingSearches.delete(searchKey);
            throw error;
        });
        
        this.pendingSearches.set(searchKey, searchPromise);
        return searchPromise;
    }
    
    getCachedSearch(query) {
        const cached = this.searchCache.get(query);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.searchCache.delete(query);
            return null;
        }
        
        return cached.results;
    }
    
    cacheSearch(query, results) {
        this.searchCache.set(query, {
            results,
            timestamp: Date.now()
        });
        
        // Limit cache size
        if (this.searchCache.size > 50) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
    }
}
```

### Lazy Loading

```javascript
class LazyGroupSelector extends GroupSelector {
    constructor(options = {}) {
        super({
            ...options,
            initialLoad: false  // Don't load data immediately
        });
        
        this.intersectionObserver = null;
    }
    
    async onAfterMount() {
        await super.onAfterMount();
        
        // Setup intersection observer for lazy loading
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => this.handleIntersection(entries),
                { threshold: 0.1 }
            );
            
            this.intersectionObserver.observe(this.element);
        } else {
            // Fallback for browsers without IntersectionObserver
            await this.initializeData();
        }
    }
    
    async handleIntersection(entries) {
        const entry = entries[0];
        if (entry.isIntersecting && !this.dataInitialized) {
            await this.initializeData();
            this.intersectionObserver.unobserve(this.element);
        }
    }
    
    async initializeData() {
        this.dataInitialized = true;
        
        // Load initial data
        if (this.config.preloadData) {
            await this.performSearch('');
        }
    }
}
```

## Mobile Considerations

### Touch-Friendly Interface

```javascript
class MobileOptimizedGroupSelector extends GroupSelector {
    constructor(options = {}) {
        super({
            ...options,
            mobileOptimized: true
        });
        
        this.touchHandlers = {};
    }
    
    async onAfterMount() {
        await super.onAfterMount();
        
        if (this.isMobileDevice()) {
            this.setupMobileInteractions();
        }
    }
    
    setupMobileInteractions() {
        const dropdown = this.element.querySelector('.group-dropdown');
        if (!dropdown) return;
        
        // Enhanced touch scrolling
        dropdown.style.webkitOverflowScrolling = 'touch';
        
        // Prevent zoom on input focus
        const input = this.element.querySelector('.group-search-input');
        if (input) {
            input.style.fontSize = '16px'; // Prevents iOS zoom
        }
        
        // Add pull-to-refresh functionality
        this.setupPullToRefresh(dropdown);
        
        // Improve touch targets
        this.improveTouchTargets();
    }
    
    setupPullToRefresh(container) {
        let startY = 0;
        let isAtTop = false;
        
        container.addEventListener('touchstart', (e) => {
            startY = e.touches[0].pageY;
            isAtTop = container.scrollTop === 0;
        });
        
        container.addEventListener('touchmove', (e) => {
            if (!isAtTop) return;
            
            const currentY = e.touches[0].pageY;
            const pullDistance = currentY - startY;
            
            if (pullDistance > 50) {
                this.showPullToRefreshIndicator();
            }
        });
        
        container.addEventListener('touchend', async (e) => {
            if (this.isPullToRefreshActive) {
                await this.refresh();
                this.hidePullToRefreshIndicator();
            }
        });
    }
    
    improveTouchTargets() {
        const items = this.element.querySelectorAll('.group-item');
        items.forEach(item => {
            item.style.minHeight = '48px'; // iOS minimum touch target
            item.style.padding = '12px 16px';
        });
    }
    
    isMobileDevice() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}
```

### Responsive Design

```css
/* Mobile-specific styles */
@media (max-width: 768px) {
    .group-dropdown {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        max-height: none;
        border-radius: 0;
        z-index: 9999;
    }
    
    .group-dropdown .dropdown-header {
        position: sticky;
        top: 0;
        z-index: 1;
        padding: 1rem;
        background: linear-gradient(to bottom, #2b2b2b 0%, #2b2b2b 90%, transparent 100%);
    }
    
    .group-item {
        padding: 1rem;
        border-bottom: 1px solid #495057;
    }
    
    .group-content {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
    }
    
    .group-meta {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
}
```

## Testing

### Unit Tests

```javascript
// GroupSelector.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GroupSelector from '../GroupSelector.js';

describe('GroupSelector', () => {
    let groupSelector;
    let mockContainer;
    
    beforeEach(() => {
        mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer);
        
        groupSelector = new GroupSelector({
            container: mockContainer,
            endpoint: '/api/test-groups',
            minSearchLength: 1
        });
    });
    
    afterEach(() => {
        if (groupSelector) {
            groupSelector.destroy();
        }
        document.body.removeChild(mockContainer);
    });
    
    it('should initialize with default configuration', () => {
        expect(groupSelector.config.endpoint).toBe('/api/test-groups');
        expect(groupSelector.config.minSearchLength).toBe(1);
        expect(groupSelector.selectedGroup).toBeNull();
    });
    
    it('should perform search with debouncing', async () => {
        const mockSearch = vi.spyOn(groupSelector, 'performSearch');
        
        // Simulate typing
        const mockInput = { value: 'test query' };
        await groupSelector.handleActionSearch({}, mockInput);
        
        // Search should be debounced
        expect(mockSearch).not.toHaveBeenCalled();
        
        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 350));
        expect(mockSearch).toHaveBeenCalledWith('test query');
    });
    
    it('should handle group selection', async () => {
        const mockGroup = {
            id: 'test_group',
            name: 'Test Group',
            type: 'team'
        };
        
        const selectionSpy = vi.fn();
        groupSelector.on('group-selected', selectionSpy);
        
        await groupSelector.selectGroup(mockGroup);
        
        expect(groupSelector.selectedGroup).toEqual(mockGroup);
        expect(selectionSpy).toHaveBeenCalledWith({
            group: mockGroup,
            previousGroup: null,
            selector: groupSelector
        });
    });
    
    it('should handle keyboard navigation', async () => {
        groupSelector.searchResults = [
            { id: '1', name: 'Group 1' },
            { id: '2', name: 'Group 2' }
        ];
        
        // Arrow down
        await groupSelector.handleActionHandleKeyboard(
            { key: 'ArrowDown', preventDefault: vi.fn() }, 
            {}
        );
        expect(groupSelector.focusedIndex).toBe(0);
        
        // Arrow down again
        await groupSelector.handleActionHandleKeyboard(
            { key: 'ArrowDown', preventDefault: vi.fn() }, 
            {}
        );
        expect(groupSelector.focusedIndex).toBe(1);
        
        // Enter to select
        const selectSpy = vi.spyOn(groupSelector, 'selectGroup');
        await groupSelector.handleActionHandleKeyboard(
            { key: 'Enter', preventDefault: vi.fn() }, 
            {}
        );
        expect(selectSpy).toHaveBeenCalledWith(groupSelector.searchResults[1]);
    });
});
```

### Integration Tests

```javascript
// SidebarIntegration.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Sidebar from '../Sidebar.js';
import { GroupCollection } from '../../models/Group.js';

describe('Sidebar Group Integration', () => {
    let sidebar;
    let mockContainer;
    
    beforeEach(() => {
        mockContainer = document.createElement('div');
        document.body.appendChild(mockContainer);
        
        sidebar = new Sidebar({
            container: mockContainer
        });
    });
    
    it('should enable group selector when configured', async () => {
        await sidebar.enableGroupSelector({
            endpoint: '/api/test-groups'
        });
        
        expect(sidebar.groupSelector).toBeDefined();
        expect(sidebar.groupSelector.config.endpoint).toBe('/api/test-groups');
    });
    
    it('should handle group selection events', async () => {
        await sidebar.enableGroupSelector();
        
        const mockGroup = { id: 'test', name: 'Test Group' };
        const eventSpy = vi.fn();
        sidebar.on('group-selected', eventSpy);
        
        // Simulate group selection
        await sidebar.groupSelector.selectGroup(mockGroup);
        
        expect(eventSpy).toHaveBeenCalledWith({
            group: mockGroup,
            previousGroup: null,
            sidebar
        });
    });
    
    it('should update navigation when group changes', async () => {
        const config = sidebar.sidebarManager.getCurrentConfiguration();
        const mockGroup = { id: 'test', name: 'Test Group' };
        
        await sidebar.onGroupSelected({ group: mockGroup });
        
        // Verify group was set in configuration
        expect(config.config.getCurrentGroup()).toEqual(mockGroup);
    });
});
```

### E2E Tests

```javascript
// e2e/groupSelector.spec.js
import { test, expect } from '@playwright/test';

test.describe('Group Selector', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/phase2-demo');
        await page.waitForSelector('.group-selector');
    });
    
    test('should search and select groups', async ({ page }) => {
        // Open group selector
        await page.click('.group-selector input');
        
        // Type search query
        await page.fill('.group-selector input', 'Engineering');
        
        // Wait for search results
        await page.waitForSelector('.group-item');
        
        // Verify results
        const results = await page.locator('.group-item').count();
        expect(results).toBeGreaterThan(0);
        
        // Select first result
        await page.click('.group-item:first-child');
        
        // Verify selection
        const selectedText = await page.textContent('.selected-group-name');
        expect(selectedText).toContain('Engineering');
    });
    
    test('should handle mobile interactions', async ({ page, isMobile }) => {
        if (!isMobile) return;
        
        // Touch interactions
        await page.tap('.group-selector input');
        await page.fill('.group-selector input', 'Team');
        
        // Verify mobile dropdown
        const dropdown = page.locator('.group-dropdown');
        await expect(dropdown).toHaveClass(/show/);
        
        // Test swipe to close
        await page.touchscreen.tap(100, 100); // Outside dropdown
        await expect(dropdown).not.toHaveClass(/show/);
    });
});
```

## Troubleshooting

### Common Issues

#### 1. Group Selector Not Appearing

**Symptoms**: Group selector container is empty or not visible

**Solutions**:
```javascript
// Check if group selector is properly enabled
const config = sidebar.sidebarManager.getCurrentConfiguration();
console.log('Groups enabled:', config.config.groups.enabled);

// Verify container exists
const container = document.querySelector('[data-container="group-selector"]');
console.log('Container found:', !!container);

// Check for JavaScript errors
console.log('Group selector instance:', sidebar.groupSelector);
```

#### 2. Search Not Working

**Symptoms**: No results returned or search doesn't trigger

**Solutions**:
```javascript
// Check API endpoint
console.log('Endpoint:', sidebar.groupSelector.config.endpoint);

// Verify minimum search length
console.log('Min length:', sidebar.groupSelector.config.minSearchLength);
console.log('Query length:', sidebar.groupSelector.searchQuery.length);

// Check network requests
// Open browser dev tools -> Network tab -> search for API calls

// Verify API response format
fetch('/api/groups?q=test')
  .then(r => r.json())
  .then(data => console.log('API Response:', data));
```

#### 3. Permissions Issues

**Symptoms**: User can't see certain groups or features

**Solutions**:
```javascript
// Check user permissions
console.log('User permissions:', sidebar.getUserPermissions());

// Verify group permissions in API response
console.log('Group permissions:', group.permissions);

// Test permission checking
const hasPermission = sidebar.groupSelector.hasPermission('create_group');
console.log('Can create groups:', hasPermission);
```

#### 4. Navigation Context Issues

**Symptoms**: Navigation doesn't update when group changes

**Solutions**:
```javascript
// Verify event listeners are attached
sidebar.off('group-selected'); // Remove existing
sidebar.on('group-selected', (data) => {
    console.log('Group selected event:', data);
    // Your handling code
});

// Check configuration updates
const config = sidebar.sidebarManager.getCurrentConfiguration();
console.log('Current group:', config.config.getCurrentGroup());

// Force navigation update
await sidebar.sidebarManager.currentConfig.updateConfig({
    groups: { currentGroup: selectedGroup }
});
```

### Performance Issues

#### 1. Slow Search Response

**Solutions**:
```javascript
// Increase debounce time
await sidebar.groupSelector.updateConfig({
    searchDebounce: 500 // Increase from 300ms
});

// Reduce result count
await sidebar.groupSelector.updateConfig({
    maxResults: 10 // Reduce from 20
});

// Implement caching
class CachedGroupSelector extends GroupSelector {
    constructor(options) {
        super(options);
        this.searchCache = new Map();
    }
    
    async performSearch(query) {
        if (this.searchCache.has(query)) {
            this.updateSearchResults(this.searchCache.get(query));
            return;
        }
        
        const results = await super.performSearch(query);
        this.searchCache.set(query, this.searchResults);
        return results;
    }
}
```

#### 2. Memory Leaks

**Solutions**:
```javascript
// Ensure proper cleanup
class MyApp {
    async cleanup() {
        // Clear search cache
        if (this.sidebar.groupSelector) {
            this.sidebar.groupSelector.searchCache?.clear();
        }
        
        // Cancel pending requests
        this.sidebar.groupSelector?.groupCollection?.cancel();
        
        // Remove event listeners
        this.sidebar.off('group-selected');
        this.sidebar.off('group-cleared');
    }
}
```

### Debug Mode

```javascript
// Enable debug logging
class DebugGroupSelector extends GroupSelector {
    constructor(options) {
        super({
            ...options,
            debug: true
        });
    }
    
    async performSearch(query) {
        if (this.config.debug) {
            console.group(`GroupSelector Search: "${query}"`);
            console.log('Config:', this.config);
            console.log('Filters:', this.searchFilters);
            console.time('Search Duration');
        }
        
        try {
            const result = await super.performSearch(query);
            
            if (this.config.debug) {
                console.log('Results:', this.searchResults.length);
                console.timeEnd('Search Duration');
            }
            
            return result;
        } finally {
            if (this.config.debug) {
                console.groupEnd();
            }
        }
    }
}
```

## Migration from Phase 1

### Breaking Changes

1. **Data Structure Changes**:
```javascript
// OLD (Phase 1)
this.data = {
    navItems: [...],
    brandText: 'App Name'
};

// NEW (Phase 2)
const config = new CustomSidebarConfig();
config.getBrandConfig() // Returns brand configuration
config.getNavigationConfig() // Returns navigation items
```

2. **Event Name Changes**:
```javascript
// OLD
sidebar.on('navigation-changed', handler);

// NEW
sidebar.on('group-selected', handler);
sidebar.on('configuration-changed', handler);
```

3. **API Response Format**:
```javascript
// OLD - Simple array
{
    "success": true,
    "data": [...]
}

// NEW - Paginated format
{
    "success": true,
    "data": {
        "data": [...],
        "count": 42,
        "start": 0,
        "size": 20
    }
}
```

### Migration Steps

#### Step 1: Update Sidebar Creation

```javascript
// OLD
const sidebar = new Sidebar({
    data: {
        brandText: 'My App',
        navItems: [...]
    }
});

// NEW
class MyAppConfig extends SidebarConfig {
    getBrandConfig() {
        return { text: 'My App' };
    }
    
    getNavigationConfig() {
        return { items: [...] };
    }
}

const sidebar = new Sidebar({
    container: '#sidebar'
});

sidebar.getSidebarManager().registerConfiguration('myapp', MyAppConfig);
```

#### Step 2: Update Event Handlers

```javascript
// OLD
sidebar.on('item-selected', (item) => {
    // Handle navigation
});

// NEW
sidebar.on('group-selected', (data) => {
    const { group } = data;
    // Handle group selection
});

sidebar.getSidebarManager().on('config-changed', (data) => {
    // Handle configuration changes
});
```

#### Step 3: Update API Endpoints

```javascript
// Update your backend to return paginated responses
app.get('/api/groups', (req, res) => {
    const { q, start = 0, size = 20 } = req.query;
    
    // Your search logic
    const results = searchGroups(q);
    const paginatedResults = results.slice(start, start + size);
    
    res.json({
        success: true,
        data: {
            data: paginatedResults,
            count: results.length,
            start: parseInt(start),
            size: parseInt(size)
        }
    });
});
```

#### Step 4: Enable Phase 2 Features

```javascript
// After migration, enable new features
await sidebar.enableGroupSelector({
    endpoint: '/api/groups',
    placeholder: 'Search groups...',
    enableQuickActions: true
});

// Handle new events
sidebar.on('create-group-requested', async (data) => {
    const { searchQuery } = data;
    await showCreateGroupForm(searchQuery);
});
```

### Gradual Migration Approach

```javascript
class HybridSidebarConfig extends SidebarConfig {
    constructor(legacyData, options = {}) {
        super('hybrid', options);
        this.legacyData = legacyData;
        this.migratedToPhase2 = false;
    }
    
    getBrandConfig() {
        if (this.legacyData.brandText) {
            return {
                text: this.legacyData.brandText,
                subtext: this.legacyData.brandSubtext,
                icon: this.legacyData.brandIcon
            };
        }
        return super.getBrandConfig();
    }
    
    getNavigationConfig() {
        if (this.legacyData.navItems) {
            return {
                items: this.convertLegacyNavItems(this.legacyData.navItems)
            };
        }
        return super.getNavigationConfig();
    }
    
    convertLegacyNavItems(legacyItems) {
        return legacyItems.map(item => this.createNavItem({
            text: item.text,
            route: item.route,
            icon: item.icon,
            children: item.children?.map(child => ({
                text: child.text,
                route: child.route,
                icon: child.icon
            }))
        }));
    }
    
    async enablePhase2() {
        this.migratedToPhase2 = true;
        this.updateConfig({
            groups: {
                enabled: true,
                endpoint: '/api/groups'
            }
        });
    }
}
```

This completes the comprehensive Phase 2 Integration Guide. The guide now includes all promised sections with practical examples, troubleshooting steps, and migration paths for existing applications.