/**
 * GroupSearchView - Hierarchical tree-view search component
 * Extends SimpleSearchView to support parent/child relationships
 * Displays items in a collapsible tree structure based on parent property
 */

import SimpleSearchView from './SimpleSearchView.js';

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
        this.expandedNodes = new Set(); // Track which nodes are expanded
        this.treeData = []; // Processed hierarchical data
        this.flattenedItems = []; // Flattened tree for display
        
        // Auto-expand options
        this.autoExpandRoot = options.autoExpandRoot !== undefined ? options.autoExpandRoot : true;
        this.autoExpandAll = options.autoExpandAll || false;
        
        // Visual customization
        this.indentSize = options.indentSize || 20; // pixels per level
        this.showLines = options.showLines !== undefined ? options.showLines : true;
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
            // Add the item itself
            if (!itemsById.has(item.id)) {
                itemsById.set(item.id, {
                    ...item,
                    children: [],
                    level: 0,
                    hasChildren: false,
                    isExpanded: false
                });
            }
            
            // If this item has a parent object, add the parent too
            const parentObj = item[this.parentField];
            if (parentObj && parentObj.id && !itemsById.has(parentObj.id)) {
                itemsById.set(parentObj.id, {
                    ...parentObj,
                    children: [],
                    level: 0,
                    hasChildren: false,
                    isExpanded: false
                });
            }
        });

        const rootItems = [];

        // Build parent-child relationships
        itemsById.forEach((treeItem, itemId) => {
            // Find the original item to get parent reference
            const originalItem = items.find(i => i.id === itemId) || treeItem;
            const parentId = originalItem[this.parentField]?.id;

            if (parentId && itemsById.has(parentId)) {
                // Has a parent - add to parent's children
                const parent = itemsById.get(parentId);
                parent.children.push(treeItem);
                parent.hasChildren = true;
                
                // Auto-expand if configured
                if (this.autoExpandAll || (this.autoExpandRoot && parent.level === 0)) {
                    this.expandedNodes.add(parent.id);
                    parent.isExpanded = true;
                }
            } else {
                // No parent or parent not in list - this is a root item
                rootItems.push(treeItem);
                
                // Auto-expand root items
                if (this.autoExpandRoot) {
                    this.expandedNodes.add(treeItem.id);
                    treeItem.isExpanded = true;
                }
            }
        });

        // Calculate levels recursively
        const calculateLevels = (nodes, level = 0) => {
            nodes.forEach(node => {
                node.level = level;
                node.isExpanded = this.expandedNodes.has(node.id);
                if (node.children.length > 0) {
                    // Sort children by name
                    node.children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    calculateLevels(node.children, level + 1);
                }
            });
        };

        // Sort root items by name
        rootItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        calculateLevels(rootItems);

        return rootItems;
    }

    /**
     * Flatten tree structure for rendering
     */
    flattenTree(nodes, result = []) {
        nodes.forEach((node, index) => {
            // Mark if this is the last child
            node._isLastChild = index === nodes.length - 1;
            result.push(node);
            
            // Only add children if node is expanded
            if (node.isExpanded && node.children.length > 0) {
                this.flattenTree(node.children, result);
            }
        });
        
        return result;
    }

    /**
     * Update filtered items with tree structure
     */
    updateFilteredItems() {
        if (!this.collection) {
            this.filteredItems = [];
            this.treeData = [];
            this.flattenedItems = [];
            return;
        }

        const items = this.collection.toJSON();

        // Apply search filter first
        let filteredItems = items;
        if (this.searchValue && this.searchValue.trim()) {
            const searchTerm = this.searchValue.toLowerCase().trim();
            filteredItems = items.filter(item => {
                return this.searchFields.some(field => {
                    const value = this.getNestedValue(item, field);
                    return value && value.toString().toLowerCase().includes(searchTerm);
                });
            });
        }

        // Build tree from filtered items
        this.treeData = this.buildTreeHierarchy(filteredItems);
        
        // Flatten for display
        this.flattenedItems = this.flattenTree(this.treeData);
        
        // Set filteredItems to flattened tree for compatibility with parent class
        this.filteredItems = this.flattenedItems;

        this.updateResultsView();
    }

    /**
     * Toggle node expansion
     */
    toggleNode(itemId) {
        if (this.expandedNodes.has(itemId)) {
            this.expandedNodes.delete(itemId);
        } else {
            this.expandedNodes.add(itemId);
        }
        
        // Rebuild tree with new expansion state
        this.updateFilteredItems();
    }

    /**
     * Handle expand/collapse button clicks
     */
    async handleActionToggleNode(event, element) {
        event.preventDefault();
        event.stopPropagation();
        
        const itemId = parseInt(element.getAttribute('data-item-id'));
        if (!isNaN(itemId)) {
            this.toggleNode(itemId);
        }
    }

    /**
     * Get tree-specific item template
     */
    getDefaultItemTemplate() {
        return `
            <div class="tree-item-content">
                <div class="tree-item-name">{{name}}</div>
                {{#showKind}}
                <div class="tree-item-kind">{{kind}}</div>
                {{/showKind}}
            </div>
        `;
    }

    /**
     * Process item template with tree structure
     */
    processItemTemplate(item) {
        const indent = item.level * this.indentSize;
        const hasChildren = item.hasChildren;
        const isExpanded = item.isExpanded;
        
        // Build expand/collapse icon
        let expandIcon = '';
        if (hasChildren) {
            const iconClass = isExpanded ? 'bi-chevron-down' : 'bi-chevron-right';
            expandIcon = `
                <button class="tree-expand-btn" 
                        type="button"
                        data-action="toggle-node" 
                        data-item-id="${item.id}"
                        aria-label="${isExpanded ? 'Collapse' : 'Expand'}">
                    <i class="bi ${iconClass}"></i>
                </button>
            `;
        } else {
            expandIcon = '<span class="tree-expand-spacer"></span>';
        }

        // Process the base template
        let content = this.itemTemplate;
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

        // Build tree lines with proper connectors
        let treeConnector = '';
        if (this.showLines && item.level > 0) {
            // Determine if this is the last child in its parent
            const isLastChild = item._isLastChild || false;
            const connectorClass = isLastChild ? 'tree-connector-last' : 'tree-connector';
            treeConnector = `<span class="${connectorClass}"></span>`;
        }

        // Wrap in tree structure
        return `
            <div class="tree-item-wrapper" data-tree-level="${item.level}">
                <div class="tree-indent" style="width: ${indent}px;">
                    ${treeConnector}
                </div>
                <div class="tree-item-expand">
                    ${expandIcon}
                </div>
                <div class="tree-item-body flex-grow-1">
                    ${content}
                </div>
            </div>
        `;
    }

    /**
     * Expand all nodes
     */
    expandAll() {
        const expandRecursive = (nodes) => {
            nodes.forEach(node => {
                if (node.hasChildren) {
                    this.expandedNodes.add(node.id);
                    expandRecursive(node.children);
                }
            });
        };
        
        expandRecursive(this.treeData);
        this.updateFilteredItems();
    }

    /**
     * Collapse all nodes
     */
    collapseAll() {
        this.expandedNodes.clear();
        this.updateFilteredItems();
    }

    /**
     * Expand to specific node (and all parents)
     */
    expandToNode(nodeId) {
        // Find node in tree and expand all parents
        const findAndExpandParents = (nodes, targetId, parents = []) => {
            for (const node of nodes) {
                if (node.id === targetId) {
                    // Found it - expand all parents
                    parents.forEach(parent => {
                        this.expandedNodes.add(parent.id);
                    });
                    this.expandedNodes.add(node.id);
                    return true;
                }
                
                if (node.children.length > 0) {
                    if (findAndExpandParents(node.children, targetId, [...parents, node])) {
                        return true;
                    }
                }
            }
            return false;
        };

        if (findAndExpandParents(this.treeData, nodeId)) {
            this.updateFilteredItems();
        }
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
        const findNode = (nodes, targetId) => {
            for (const node of nodes) {
                if (node.id === targetId) {
                    return node.children;
                }
                if (node.children.length > 0) {
                    const found = findNode(node.children, targetId);
                    if (found) return found;
                }
            }
            return null;
        };

        return findNode(this.treeData, nodeId) || [];
    }


}

export default GroupSearchView;
