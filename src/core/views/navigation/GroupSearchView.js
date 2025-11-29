/**
 * GroupSearchView - Hierarchical tree-view search component
 * Extends SimpleSearchView to support parent/child relationships
 * Displays items in a tree structure based on parent property
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
        this.treeData = []; // Processed hierarchical data
        this.flattenedItems = []; // Flattened tree for display
        
        // Visual customization
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
     * Flatten tree structure for rendering
     * Tracks ancestor "last child" flags for proper line rendering
     */
    flattenTree(nodes, result = [], ancestorLastFlags = []) {
        nodes.forEach((node, index) => {
            node._isLastChild = index === nodes.length - 1;
            node._ancestorLastFlags = [...ancestorLastFlags];
            
            // Check if this node is the last descendant in its branch
            // (all ancestors are last children AND this node is last child with no children)
            const allAncestorsLast = ancestorLastFlags.every(flag => flag);
            node._isLastDescendant = allAncestorsLast && node._isLastChild && 
                (!node.children || node.children.length === 0);
            
            result.push(node);
            
            if (node.children && node.children.length > 0) {
                const newFlags = [...ancestorLastFlags, node._isLastChild];
                this.flattenTree(node.children, result, newFlags);
            }
        });
        
        return result;
    }

    /**
     * Second pass: compute which vertical lines should continue for each item
     * 
     * Vertical line at segment s shows if there are more siblings coming at level s+1
     * We need to look ahead until we find an item at level s+1 or shallower
     */
    computeVerticalLines(flatList) {
        for (let i = 0; i < flatList.length; i++) {
            const item = flatList[i];
            item._continueVertical = [];
            
            for (let s = 0; s < item.level; s++) {
                // Look ahead to find next item at level s+1 or shallower
                let foundSibling = false;
                for (let j = i + 1; j < flatList.length; j++) {
                    const futureItem = flatList[j];
                    if (futureItem.level === s + 1) {
                        // Found a sibling at this level - vertical should continue
                        foundSibling = true;
                        break;
                    } else if (futureItem.level <= s) {
                        // Went back to ancestor level or shallower - no more siblings
                        break;
                    }
                    // Keep searching if futureItem.level > s+1 (still in deeper subtree)
                }
                item._continueVertical[s] = foundSibling;
            }
        }
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

        // Server-side filtering is handled in performSearch() (from parent class)
        const items = this.collection.toJSON();
        this.treeData = this.buildTreeHierarchy(items);
        this.flattenedItems = this.flattenTree(this.treeData);
        
        // Second pass: compute vertical line continuation
        this.computeVerticalLines(this.flattenedItems);
        
        // Set filteredItems to flattened tree for parent class compatibility
        this.filteredItems = this.flattenedItems;

        this.updateResultsView();
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

        // Build tree line segments
        // For an item at level N, we need N segments (one for each ancestor level)
        let lineSegments = '';
        if (this.showLines && item.level > 0) {
            for (let i = 0; i < item.level; i++) {
                const isLastSegment = (i === item.level - 1);
                
                if (isLastSegment) {
                    // This segment connects directly to this item
                    // Use _isLastChild to determine if this is └ or ├
                    const segClass = item._isLastChild ? 'tree-seg tree-seg-last' : 'tree-seg tree-seg-mid';
                    lineSegments += `<span class="${segClass}"></span>`;
                } else {
                    // Ancestor segment - vertical line continues if next item is deeper than this level
                    const continueVertical = item._continueVertical && item._continueVertical[i];
                    if (continueVertical) {
                        lineSegments += `<span class="tree-seg tree-seg-vert"></span>`;
                    } else {
                        lineSegments += `<span class="tree-seg"></span>`;
                    }
                }
            }
        }

        // Classes for the wrapper
        const hasChildren = item.hasChildren ? ' has-children' : '';
        const isLastChild = item._isLastChild ? ' is-last-child' : '';

        // Wrap in tree structure
        return `
            <div class="tree-item-wrapper${hasChildren}${isLastChild}" data-tree-level="${item.level}">
                <div class="tree-lines">
                    ${lineSegments}
                </div>
                <div class="tree-item-body flex-grow-1">
                    ${content}
                </div>
            </div>
        `;
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
