/**
 * GroupSearchView - Hierarchical tree-view search component
 * Extends SimpleSearchView to support parent/child relationships
 * Displays items in a nested tree structure based on parent property
 */

import SimpleSearchView from './SimpleSearchView.js';
import View from '../../View.js';

/**
 * TreeResultsView - Custom results view for nested tree rendering
 */
class TreeResultsView extends View {
    constructor(options = {}) {
        super({
            className: 'search-results-view flex-grow-1 overflow-auto d-flex flex-column',
            template: `
                <div id="results-container" class="flex-grow-1 overflow-auto">
                {{#data.loading}}
                    <div class="text-center p-4">
                        <div class="spinner-border spinner-border-sm text-muted" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <div class="mt-2 small text-muted">{{data.loadingText}}</div>
                    </div>
                {{/data.loading}}

                {{^data.loading}}
                    <div class="tree-root">
                        {{{data.treeHtml}}}
                    </div>

                    {{#data.showNoResults}}
                        <div class="text-center p-4">
                            <i class="bi bi-search text-muted mb-2" style="font-size: 1.5rem;"></i>
                            <div class="text-muted small">{{data.noResultsText}}</div>
                            <button type="button" class="btn btn-link btn-sm mt-2 p-0" data-action="clear-search">
                                Clear search
                            </button>
                        </div>
                    {{/data.showNoResults}}

                    {{#data.showEmpty}}
                        <div class="text-center p-4">
                            <i class="bi bi-folder2-open text-muted mb-2" style="font-size: 1.5rem;"></i>
                            <div class="text-muted small">{{data.emptyText}}</div>
                        </div>
                    {{/data.showEmpty}}
                {{/data.loading}}
                </div>

                {{#data.showResultsCount}}
                <div class="border-top bg-light p-2 text-center">
                    <small class="text-muted">
                        {{data.filteredCount}} of {{data.totalCount}}
                    </small>
                </div>
                {{/data.showResultsCount}}
            `,
            ...options
        });
    }
}

class GroupSearchView extends SimpleSearchView {
    constructor(options = {}) {
        super({
            ...options,
            className: `group-search-view ${options.className || ''}`.trim()
        });

        // Tree-specific configuration
        this.showKind = options.showKind !== undefined ? options.showKind : true;
        this.parentField = options.parentField || 'parent';
        this.kindField = options.kindField || 'kind';
        this.treeData = []; // Processed hierarchical data
        
        // Visual customization
        this.showLines = options.showLines !== undefined ? options.showLines : true;
        
        // Replace the results view with our tree version
        if (this.resultsView) {
            this.removeChild(this.resultsView);
        }
        this.resultsView = new TreeResultsView({
            parentView: this
        });
        this.addChild(this.resultsView);
    }

    /**
     * Build tree hierarchy from flat list
     */
    buildTreeHierarchy(items) {
        if (!items || items.length === 0) {
            return [];
        }

        // Create a map of items by ID for quick lookup
        const itemsById = new Map();
        
        // First pass: add all items and extract parent objects
        items.forEach(item => {
            if (!itemsById.has(item.id)) {
                itemsById.set(item.id, {
                    ...item,
                    children: [],
                    level: 0,
                    hasChildren: false
                });
            }
            
            // If this item has a parent object, add the parent too
            const parentObj = item[this.parentField];
            if (parentObj && parentObj.id && !itemsById.has(parentObj.id)) {
                itemsById.set(parentObj.id, {
                    ...parentObj,
                    children: [],
                    level: 0,
                    hasChildren: false
                });
            }
        });

        const rootItems = [];

        // Build parent-child relationships
        itemsById.forEach((treeItem, itemId) => {
            const originalItem = items.find(i => i.id === itemId) || treeItem;
            const parentId = originalItem[this.parentField]?.id;

            if (parentId && itemsById.has(parentId)) {
                const parent = itemsById.get(parentId);
                parent.children.push(treeItem);
                parent.hasChildren = true;
            } else {
                rootItems.push(treeItem);
            }
        });

        // Calculate levels recursively
        const calculateLevels = (nodes, level = 0) => {
            nodes.forEach(node => {
                node.level = level;
                if (node.children.length > 0) {
                    node.children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    calculateLevels(node.children, level + 1);
                }
            });
        };

        rootItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        calculateLevels(rootItems);

        return rootItems;
    }

    /**
     * Update filtered items with tree structure
     */
    updateFilteredItems() {
        if (!this.collection) {
            this.filteredItems = [];
            this.treeData = [];
            return;
        }

        // Server-side filtering is handled in performSearch() (from parent class)
        const items = this.collection.toJSON();
        this.treeData = this.buildTreeHierarchy(items);
        
        // For compatibility with parent class counting
        this.filteredItems = items;

        this.updateResultsView();
    }

    /**
     * Override updateResultsView to render nested tree structure
     */
    updateResultsView() {
        if (!this.resultsView) return;

        const hasItems = this.collection && this.collection.length() > 0;
        const hasSearchValue = this.searchValue && this.searchValue.length > 0;

        // Build nested HTML from tree data
        const treeHtml = this.renderTreeNodes(this.treeData);
        
        console.log('GroupSearchView updateResultsView:', {
            hasItems,
            treeDataLength: this.treeData?.length,
            treeHtmlLength: treeHtml?.length,
            collectionLength: this.collection?.length()
        });

        this.resultsView.data = {
            loading: this.loading,
            treeHtml: treeHtml,
            showEmpty: !this.loading && !hasItems,
            showNoResults: !this.loading && hasItems && this.treeData.length === 0 && hasSearchValue,
            showResultsCount: !this.loading && hasItems,
            filteredCount: this.filteredItems.length,
            totalCount: this.collection?.restEnabled
                ? (this.collection?.meta?.count || 0)
                : (this.collection?.length() || 0),

            // UI text
            loadingText: this.loadingText,
            noResultsText: this.noResultsText,
            emptyText: this.emptyText,
        };

        this.resultsView.render();
    }

    /**
     * Render tree nodes recursively as nested HTML
     */
    renderTreeNodes(nodes) {
        if (!nodes || nodes.length === 0) return '';

        let html = '';
        nodes.forEach((node, index) => {
            const isLast = index === nodes.length - 1;
            const hasChildren = node.children && node.children.length > 0;
            
            // Render the item content
            const itemContent = this.renderItemContent(node);
            
            // Build nested structure
            html += `
                <div class="tree-node${isLast ? ' tree-node-last' : ''}">
                    <div class="tree-node-item" data-action="select-item" data-item-id="${node.id}">
                        <span class="tree-node-dot"></span>
                        <div class="tree-node-content">
                            ${itemContent}
                        </div>
                        <i class="bi bi-chevron-right tree-node-chevron"></i>
                    </div>
                    ${hasChildren ? `
                        <div class="tree-node-children${this.showLines ? ' tree-lines' : ''}">
                            ${this.renderTreeNodes(node.children)}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        return html;
    }

    /**
     * Render item content from template
     */
    renderItemContent(item) {
        let content = this.itemTemplate;
        
        // Replace template variables
        content = content.replace(/\{\{(\w+)\}\}/g, (match, prop) => {
            if (prop === 'showKind') {
                return this.showKind ? 'true' : '';
            }
            return this.getNestedValue(item, prop) || '';
        });

        // Handle conditional sections for kind
        if (this.showKind) {
            content = content.replace(/\{\{#showKind\}\}(.*?)\{\{\/showKind\}\}/gs, '$1');
        } else {
            content = content.replace(/\{\{#showKind\}\}.*?\{\{\/showKind\}\}/gs, '');
        }

        return content;
    }

    /**
     * Get tree-specific item template
     */
    getDefaultItemTemplate() {
        return `
            <div class="tree-item-name">{{name}}</div>
            {{#showKind}}
            <div class="tree-item-kind">{{kind}}</div>
            {{/showKind}}
        `;
    }



    /**
     * Handle item selection - override to use data-item-id
     */
    async handleActionSelectItem(event, element) {
        const itemId = parseInt(element.getAttribute('data-item-id'));
        if (isNaN(itemId)) return;

        // Find item in tree
        const item = this.findItemById(itemId);
        if (item) {
            this.emit('itemSelected', item);
        }
    }

    /**
     * Find item by ID in tree
     */
    findItemById(id, nodes = this.treeData) {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children && node.children.length > 0) {
                const found = this.findItemById(id, node.children);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Get all root items
     */
    getRootItems() {
        return this.treeData;
    }

    /**
     * Get children of a specific node
     */
    getNodeChildren(nodeId) {
        const node = this.findItemById(nodeId);
        return node ? node.children : [];
    }
}

export default GroupSearchView;
