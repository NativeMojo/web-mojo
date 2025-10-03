/**
 * GroupSelectorButton - Button that shows current group and opens search dialog
 * Displays active group name in topnav, opens Dialog with SimpleSearchView for selection
 */

import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import SimpleSearchView from '@core/views/navigation/SimpleSearchView.js';
import { GroupList } from '@core/models/Group.js';

class GroupSelectorButton extends View {
    constructor(options = {}) {
        super({
            tagName: 'div',
            className: 'nav-item',
            ...options
        });

        const app = this.getApp();

        // Auto-detect Collection from app or use GroupList by default
        this.Collection = options.Collection || app?.GroupCollection || GroupList;
        
        // Use existing collection or create new one
        this.collection = options.collection || new this.Collection();
        
        // Auto-detect current group from app
        this.currentGroup = options.currentGroup !== undefined 
            ? options.currentGroup 
            : app?.activeGroup;
        
        // UI configuration with defaults
        this.buttonClass = options.buttonClass || 'btn btn-link nav-link';
        this.buttonIcon = options.buttonIcon || 'bi-building';
        this.defaultText = options.defaultText || 'Select Group';
        
        // SimpleSearchView configuration
        this.itemTemplate = options.itemTemplate;
        this.searchFields = options.searchFields || ['name'];
        this.headerText = options.headerText || 'Select Group';
        this.searchPlaceholder = options.searchPlaceholder || 'Search groups...';
        
        // Auto group selection handler
        this.autoSetActiveGroup = options.autoSetActiveGroup !== false;
        this.onGroupSelected = options.onGroupSelected;
        
        // Dialog reference
        this.dialog = null;

        // Listen for app-level group changes
        if (app?.events) {
            app.events.on('group:changed', (data) => {
                if (data.group !== this.currentGroup) {
                    this.setCurrentGroup(data.group);
                }
            });
        }
    }

    async getTemplate() {
        return `
            <button class="{{buttonClass}}" 
                    data-action="show-selector"
                    type="button"
                    style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <i class="{{buttonIcon}} me-1"></i>
                <span class="group-name">{{displayName}}</span>
            </button>
        `;
    }

    async onBeforeRender() {
        await super.onBeforeRender();
        
        console.log('GroupSelectorButton onBeforeRender - currentGroup:', this.currentGroup?.get?.('name') || this.currentGroup?.name || 'none');
        
        this.buttonClass = this.buttonClass;
        this.buttonIcon = this.buttonIcon;
        this.displayName = this.currentGroup?.get?.('name') || 
                          this.currentGroup?.name || 
                          this.defaultText;
    }

    /**
     * Show the group selector dialog
     */
    async onActionShowSelector(event) {
        // Create SimpleSearchView instance
        const searchView = new SimpleSearchView({
            Collection: this.Collection,
            collection: this.collection,
            itemTemplate: this.itemTemplate || this.getDefaultItemTemplate(),
            searchFields: this.searchFields,
            headerText: this.headerText,
            searchPlaceholder: this.searchPlaceholder,
            headerIcon: this.buttonIcon,
            showExitButton: false
        });

        // Create dialog directly (not using showDialog helper to avoid promise issues)
        this.dialog = new Dialog({
            title: this.headerText,
            body: searchView,
            size: 'md',
            scrollable: true,
            noBodyPadding: true,
            buttons: [],
            closeButton: true
        });

        // Listen for item selection (note: event is 'item:selected' not 'item-selected')
        searchView.on('item:selected', (data) => {
            this.handleGroupSelection(data.model || data.item);
            if (this.dialog) {
                this.dialog.hide();
            }
        });

        // Clean up dialog reference when closed
        this.dialog.on('hidden', () => {
            this.dialog.destroy();
            this.dialog = null;
        });

        // Render and show the dialog
        await this.dialog.render(true, document.body);
        this.dialog.show();
        
        return true; // Indicate action was handled
    }

    /**
     * Handle group selection
     */
    handleGroupSelection(group) {
        this.currentGroup = group;
        
        // Update button text
        this.displayName = group?.get?.('name') || group?.name || this.defaultText;
        this.render();

        const app = this.getApp();

        // Automatically set active group on app if enabled
        if (this.autoSetActiveGroup && app?.setActiveGroup) {
            app.setActiveGroup(group);
        }

        // Call custom handler if provided
        if (this.onGroupSelected) {
            this.onGroupSelected({ group });
        }

        // Emit event for parent/app to handle
        this.emit('group-selected', { group });
        
        // Also emit to app events if available
        if (app?.events) {
            app.events.emit('group:selected', { group });
            app.events.emit('group:changed', { group });
        }
    }

    /**
     * Default item template for groups (matches Sidebar pattern)
     * Note: data-action and data-item-index are added by ResultsView wrapper
     */
    getDefaultItemTemplate() {
        return `
            <div class="d-flex align-items-center p-3 border-bottom">
                <div class="flex-grow-1">
                    <div class="fw-semibold text-dark">{{name}}</div>
                    <small class="text-muted">#{{id}}  {{kind}}</small>
                </div>
            </div>
        `;
    }

    /**
     * Set the current group programmatically
     */
    setCurrentGroup(group) {
        this.currentGroup = group;
        this.displayName = group?.get?.('name') || group?.name || this.defaultText;
        if (this.mounted) {
            this.render();
        }
    }

    /**
     * Get the current group
     */
    getCurrentGroup() {
        return this.currentGroup;
    }
}

export default GroupSelectorButton;
