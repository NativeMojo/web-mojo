/**
 * GroupSelector - Search-ahead group selection component for Phase 2
 * Provides advanced group/organization selection with real-time search capabilities
 * 
 * Features:
 * - Real-time search with debouncing
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Loading states and error handling
 * - Hierarchical group display
 * - Mobile-responsive dropdown
 * - Accessibility support
 * - Integration with MOJO's Collection and REST system
 */

import View from '../core/View.js';
import { GroupCollection } from '../models/Group.js';

class GroupSelector extends View {
    constructor(options = {}) {
        super({
            tagName: 'div',
            className: 'group-selector-wrapper',
            template: `
                <div class="group-selector {{#disabled}}disabled{{/disabled}}">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="bi bi-diagram-3"></i>
                        </span>
                        <input type="text" 
                               class="form-control group-search-input"
                               placeholder="{{placeholder}}"
                               value="{{displayValue}}"
                               data-change-action="search"
                               data-action="focus-input"
                               data-key-action="handle-keyboard"
                               {{#disabled}}disabled{{/disabled}}
                               autocomplete="off">
                        <button class="btn btn-outline-secondary dropdown-toggle" 
                                type="button"
                                data-action="toggle-dropdown"
                                {{#disabled}}disabled{{/disabled}}>
                            <i class="bi bi-chevron-down dropdown-arrow"></i>
                        </button>
                    </div>
                    
                    <div class="group-dropdown {{#dropdownOpen}}show{{/dropdownOpen}}" 
                         data-container="dropdown">
                        
                        <!-- Search Results Header -->
                        {{#showResultsHeader}}
                        <div class="dropdown-header">
                            {{#loading}}
                            <div class="d-flex align-items-center">
                                <div class="spinner-border spinner-border-sm me-2" role="status">
                                    <span class="visually-hidden">Searching...</span>
                                </div>
                                <span>Searching groups...</span>
                            </div>
                            {{/loading}}
                            {{^loading}}
                            {{#searchQuery}}
                            <div class="d-flex justify-content-between align-items-center">
                                <span>Results for "{{searchQuery}}"</span>
                                <small class="text-muted">{{resultCount}} found</small>
                            </div>
                            {{/searchQuery}}
                            {{/loading}}
                        </div>
                        {{/showResultsHeader}}

                        <!-- Group Results -->
                        <div class="group-results">
                            {{#groups}}
                            <div class="group-item {{#selected}}selected{{/selected}} {{#focused}}focused{{/focused}}"
                                 data-action="select-group"
                                 data-group-id="{{id}}"
                                 data-group-index="{{@index}}">
                                
                                <div class="group-content">
                                    <div class="group-main">
                                        <div class="group-name">
                                            {{#hierarchy}}
                                            <span class="group-hierarchy">{{hierarchy}} > </span>
                                            {{/hierarchy}}
                                            <span class="group-name-text">{{name}}</span>
                                            {{#type}}
                                            <span class="group-type badge bg-secondary ms-2">{{type}}</span>
                                            {{/type}}
                                        </div>
                                        {{#description}}
                                        <div class="group-description">{{description}}</div>
                                        {{/description}}
                                    </div>
                                    
                                    <div class="group-meta">
                                        {{#memberCount}}
                                        <div class="group-member-count">
                                            <i class="bi bi-people-fill me-1"></i>
                                            <small>{{memberCount}}</small>
                                        </div>
                                        {{/memberCount}}
                                        {{#status}}
                                        <div class="group-status">
                                            <span class="status-indicator status-{{status}}"></span>
                                        </div>
                                        {{/status}}
                                    </div>
                                </div>
                            </div>
                            {{/groups}}
                        </div>

                        <!-- Empty States -->
                        {{#showNoResults}}
                        <div class="dropdown-item-text text-center py-4">
                            {{#searchQuery}}
                            <div class="text-muted">
                                <i class="bi bi-search fs-3 d-block mb-2"></i>
                                <div>No groups found for "{{searchQuery}}"</div>
                                <small>Try a different search term</small>
                            </div>
                            {{/searchQuery}}
                            {{^searchQuery}}
                            <div class="text-muted">
                                <i class="bi bi-diagram-3 fs-3 d-block mb-2"></i>
                                <div>Start typing to search groups</div>
                                <small>{{minSearchLength}} characters minimum</small>
                            </div>
                            {{/searchQuery}}
                        </div>
                        {{/showNoResults}}

                        <!-- Error State -->
                        {{#error}}
                        <div class="dropdown-item-text text-center py-4">
                            <div class="text-danger">
                                <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                                <div>Error loading groups</div>
                                <small>{{error}}</small>
                                <div class="mt-2">
                                    <button class="btn btn-sm btn-outline-danger" data-action="retry-search">
                                        <i class="bi bi-arrow-clockwise me-1"></i>
                                        Retry
                                    </button>
                                </div>
                            </div>
                        </div>
                        {{/error}}

                        <!-- Quick Actions (if enabled) -->
                        {{#showQuickActions}}
                        <div class="dropdown-divider"></div>
                        <div class="dropdown-item-text">
                            <div class="d-flex gap-2">
                                {{#canCreateGroup}}
                                <button class="btn btn-sm btn-outline-primary flex-fill" 
                                        data-action="create-group">
                                    <i class="bi bi-plus-circle me-1"></i>
                                    Create Group
                                </button>
                                {{/canCreateGroup}}
                                {{#canManageGroups}}
                                <button class="btn btn-sm btn-outline-secondary flex-fill" 
                                        data-action="manage-groups">
                                    <i class="bi bi-gear me-1"></i>
                                    Manage
                                </button>
                                {{/canManageGroups}}
                            </div>
                        </div>
                        {{/showQuickActions}}
                    </div>
                </div>

                <!-- Selected Group Display (when collapsed) -->
                {{#selectedGroup}}
                {{^dropdownOpen}}
                <div class="selected-group-display mt-2">
                    <div class="selected-group-card">
                        <div class="d-flex align-items-center">
                            <div class="selected-group-icon me-2">
                                <i class="bi bi-check-circle-fill text-success"></i>
                            </div>
                            <div class="selected-group-info flex-grow-1">
                                <div class="selected-group-name fw-semibold">{{selectedGroup.name}}</div>
                                {{#selectedGroup.description}}
                                <div class="selected-group-desc small text-muted">{{selectedGroup.description}}</div>
                                {{/selectedGroup.description}}
                            </div>
                            <div class="selected-group-actions">
                                <button class="btn btn-sm btn-outline-secondary" 
                                        data-action="clear-selection"
                                        title="Clear selection">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {{/dropdownOpen}}
                {{/selectedGroup}}
            `,
            ...options
        });

        // Configuration
        this.config = {
            endpoint: options.endpoint || '/api/groups',
            placeholder: options.placeholder || 'Search groups...',
            minSearchLength: options.minSearchLength || 2,
            searchDebounce: options.searchDebounce || 300,
            maxResults: options.maxResults || 20,
            enableQuickActions: options.enableQuickActions || false,
            enableHierarchy: options.enableHierarchy !== false,
            showMemberCount: options.showMemberCount !== false,
            disabled: options.disabled || false,
            ...options.config
        };

        // State
        this.selectedGroup = options.selectedGroup || null;
        this.searchQuery = '';
        this.dropdownOpen = false;
        this.loading = false;
        this.error = null;
        this.focusedIndex = -1;
        
        // Collections and data
        this.groupCollection = null;
        this.searchResults = [];
        this.searchTimeout = null;

        // User permissions
        this.userPermissions = options.userPermissions || [];
        
        // Initialize collection
        this.initializeCollection();
    }

    /**
     * Initialize the group collection
     */
    initializeCollection() {
        this.groupCollection = new GroupCollection({
            endpoint: this.config.endpoint,
            size: this.config.maxResults
        });

        // Listen for collection events
        this.groupCollection.on('update', () => {
            this.updateSearchResults();
        });

        this.groupCollection.on('error', (error) => {
            this.handleSearchError(error);
        });
    }

    /**
     * Get view data for template rendering
     */
    async getViewData() {
        const hasResults = this.searchResults.length > 0;
        const hasQuery = this.searchQuery.length >= this.config.minSearchLength;
        
        return {
            placeholder: this.config.placeholder,
            disabled: this.config.disabled,
            displayValue: this.selectedGroup ? this.selectedGroup.name : this.searchQuery,
            dropdownOpen: this.dropdownOpen,
            loading: this.loading,
            error: this.error,
            searchQuery: hasQuery ? this.searchQuery : '',
            resultCount: this.searchResults.length,
            groups: this.processGroupsForDisplay(),
            selectedGroup: this.selectedGroup,
            showResultsHeader: hasQuery && (this.loading || hasResults),
            showNoResults: !this.loading && !this.error && (!hasResults || !hasQuery),
            showQuickActions: this.config.enableQuickActions && this.dropdownOpen,
            canCreateGroup: this.hasPermission('create_group'),
            canManageGroups: this.hasPermission('manage_groups'),
            minSearchLength: this.config.minSearchLength
        };
    }

    /**
     * Process groups for display with hierarchy and selection state
     */
    processGroupsForDisplay() {
        return this.searchResults.map((group, index) => {
            const processed = {
                ...group,
                selected: this.selectedGroup && this.selectedGroup.id === group.id,
                focused: this.focusedIndex === index,
                hierarchy: this.config.enableHierarchy ? this.buildHierarchyPath(group) : null
            };

            // Add search highlighting
            if (this.searchQuery) {
                processed.name = this.highlightSearchTerm(group.name, this.searchQuery);
                if (group.description) {
                    processed.description = this.highlightSearchTerm(group.description, this.searchQuery);
                }
            }

            return processed;
        });
    }

    /**
     * Build hierarchy path for group display
     */
    buildHierarchyPath(group) {
        if (!group.parent_path) return null;
        
        const pathParts = group.parent_path.split('/').filter(p => p);
        return pathParts.length > 0 ? pathParts.join(' > ') : null;
    }

    /**
     * Highlight search terms in text
     */
    highlightSearchTerm(text, term) {
        if (!text || !term) return text;
        
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Action handler: Search input change
     */
    async handleActionSearch(event, element) {
        const query = element.value.trim();
        this.searchQuery = query;
        
        // Clear existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Open dropdown if not already open
        if (!this.dropdownOpen) {
            this.dropdownOpen = true;
            await this.render();
        }

        // Debounced search
        this.searchTimeout = setTimeout(async () => {
            await this.performSearch(query);
        }, this.config.searchDebounce);
    }

    /**
     * Action handler: Focus input
     */
    async handleActionFocusInput(event, element) {
        // Open dropdown on focus if it has content or allow empty search
        if (!this.dropdownOpen && (this.searchResults.length > 0 || this.config.minSearchLength === 0)) {
            this.dropdownOpen = true;
            await this.render();
        }
    }

    /**
     * Action handler: Keyboard navigation
     */
    async handleActionHandleKeyboard(event, element) {
        const key = event.key;
        
        switch (key) {
            case 'ArrowDown':
                event.preventDefault();
                await this.focusNextItem();
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                await this.focusPreviousItem();
                break;
                
            case 'Enter':
                event.preventDefault();
                if (this.focusedIndex >= 0 && this.searchResults[this.focusedIndex]) {
                    await this.selectGroup(this.searchResults[this.focusedIndex]);
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                await this.closeDropdown();
                element.blur();
                break;
        }
    }

    /**
     * Action handler: Toggle dropdown
     */
    async handleActionToggleDropdown(event, element) {
        this.dropdownOpen = !this.dropdownOpen;
        
        if (this.dropdownOpen) {
            // If opening and no recent search, perform initial search
            if (this.searchResults.length === 0 && !this.searchQuery) {
                await this.performSearch('');
            }
            
            // Focus input
            const input = this.element.querySelector('.group-search-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
        
        await this.render();
    }

    /**
     * Action handler: Select group
     */
    async handleActionSelectGroup(event, element) {
        const groupId = element.getAttribute('data-group-id');
        const groupIndex = parseInt(element.getAttribute('data-group-index'));
        
        if (groupIndex >= 0 && this.searchResults[groupIndex]) {
            await this.selectGroup(this.searchResults[groupIndex]);
        }
    }

    /**
     * Action handler: Clear selection
     */
    async handleActionClearSelection(event, element) {
        await this.clearSelection();
    }

    /**
     * Action handler: Retry search
     */
    async handleActionRetrySearch(event, element) {
        this.error = null;
        await this.performSearch(this.searchQuery);
    }

    /**
     * Action handler: Create group
     */
    async handleActionCreateGroup(event, element) {
        this.emit('create-group-requested', { 
            selector: this,
            searchQuery: this.searchQuery 
        });
    }

    /**
     * Action handler: Manage groups
     */
    async handleActionManageGroups(event, element) {
        this.emit('manage-groups-requested', { 
            selector: this,
            selectedGroup: this.selectedGroup 
        });
    }

    /**
     * Perform search operation
     */
    async performSearch(query) {
        if (query.length > 0 && query.length < this.config.minSearchLength) {
            this.searchResults = [];
            await this.render();
            return;
        }

        this.loading = true;
        this.error = null;
        this.focusedIndex = -1;
        await this.render();

        try {
            await this.groupCollection.search(query, {
                status: 'active',
                include_hierarchy: this.config.enableHierarchy,
                include_member_count: this.config.showMemberCount
            });

            this.updateSearchResults();
            
        } catch (error) {
            this.handleSearchError(error);
        } finally {
            this.loading = false;
        }
    }

    /**
     * Update search results from collection
     */
    updateSearchResults() {
        this.searchResults = this.groupCollection.toJSON();
        this.render();
    }

    /**
     * Handle search errors
     */
    handleSearchError(error) {
        console.error('Group search error:', error);
        this.error = error.message || 'Failed to search groups';
        this.loading = false;
        this.render();
    }

    /**
     * Select a group
     */
    async selectGroup(group) {
        const previousGroup = this.selectedGroup;
        this.selectedGroup = { ...group };
        
        // Clear search and close dropdown
        this.searchQuery = '';
        this.dropdownOpen = false;
        this.focusedIndex = -1;
        
        await this.render();

        // Emit selection event
        this.emit('group-selected', {
            group: this.selectedGroup,
            previousGroup,
            selector: this
        });
    }

    /**
     * Clear current selection
     */
    async clearSelection() {
        const previousGroup = this.selectedGroup;
        this.selectedGroup = null;
        this.searchQuery = '';
        
        await this.render();

        // Emit clear event
        this.emit('group-cleared', {
            previousGroup,
            selector: this
        });
    }

    /**
     * Focus next item in dropdown
     */
    async focusNextItem() {
        if (this.searchResults.length === 0) return;
        
        this.focusedIndex = (this.focusedIndex + 1) % this.searchResults.length;
        await this.render();
    }

    /**
     * Focus previous item in dropdown
     */
    async focusPreviousItem() {
        if (this.searchResults.length === 0) return;
        
        this.focusedIndex = this.focusedIndex <= 0 
            ? this.searchResults.length - 1 
            : this.focusedIndex - 1;
        await this.render();
    }

    /**
     * Close dropdown
     */
    async closeDropdown() {
        this.dropdownOpen = false;
        this.focusedIndex = -1;
        await this.render();
    }

    /**
     * Check if user has permission
     */
    hasPermission(permission) {
        return this.userPermissions.includes(permission);
    }

    /**
     * Set selected group programmatically
     */
    async setSelectedGroup(group) {
        await this.selectGroup(group);
    }

    /**
     * Get current selected group
     */
    getSelectedGroup() {
        return this.selectedGroup;
    }

    /**
     * Enable/disable the selector
     */
    async setDisabled(disabled) {
        this.config.disabled = disabled;
        await this.render();
    }

    /**
     * Update configuration
     */
    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update collection endpoint if changed
        if (newConfig.endpoint && this.groupCollection) {
            this.groupCollection.endpoint = newConfig.endpoint;
        }
        
        await this.render();
    }

    /**
     * Refresh search results
     */
    async refresh() {
        if (this.searchQuery) {
            await this.performSearch(this.searchQuery);
        }
    }

    /**
     * Clear all data and reset state
     */
    async reset() {
        this.selectedGroup = null;
        this.searchQuery = '';
        this.searchResults = [];
        this.dropdownOpen = false;
        this.focusedIndex = -1;
        this.loading = false;
        this.error = null;
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        await this.render();
    }

    /**
     * Cleanup on destroy
     */
    async onBeforeDestroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        if (this.groupCollection) {
            this.groupCollection.cancel();
        }
        
        // Remove any global event listeners
        document.removeEventListener('click', this.handleOutsideClick);
        
        await super.onBeforeDestroy();
    }

    /**
     * Setup after mount
     */
    async onAfterMount() {
        await super.onAfterMount();
        
        // Handle clicks outside dropdown to close it
        this.handleOutsideClick = (event) => {
            if (!this.element.contains(event.target) && this.dropdownOpen) {
                this.closeDropdown();
            }
        };
        
        document.addEventListener('click', this.handleOutsideClick);
        
        // Auto-focus if specified
        if (this.config.autoFocus) {
            const input = this.element.querySelector('.group-search-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }
}

export default GroupSelector;