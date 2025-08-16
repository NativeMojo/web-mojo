/**
 * Group Model - Enhanced for Phase 2 Organization/Group Management
 * Provides comprehensive group/organization data management with search and hierarchy support
 */

import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

/**
 * Group Model - Represents an organization, team, or group entity
 *
 * Features:
 * - Hierarchical group support (parent/child relationships)
 * - Member management
 * - Search and filtering capabilities
 * - Role-based permissions within groups
 * - Metadata and settings management
 */
class Group extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/groups'
        });

        // Initialize computed properties
        this.setupComputedProperties();
    }
}

/**
 * GroupCollection - Enhanced collection for managing groups with advanced search and filtering
 */
class GroupList extends Collection {
    constructor(options = {}) {
        super(Group, {
            endpoint: '/api/groups',
            size: 20,
            ...options
        });

        // Enhanced search parameters
        this.searchFilters = {
            query: '',
            type: '',
            status: 'active',
            parent_id: null,
            member_id: null,
            sort: 'name',
            order: 'asc'
        };
    }

    /**
     * Search groups with advanced filtering
     */
    async search(query, filters = {}) {
        const searchParams = {
            q: query,
            ...this.searchFilters,
            ...filters,
            start: 0 // Reset to first page for new search
        };

        return await this.updateParams(searchParams, true, 300); // 300ms debounce
    }

    /**
     * Filter groups by search criteria
     */
    filterBySearch(searchTerm) {
        if (!searchTerm) return this.models;

        const term = searchTerm.toLowerCase();
        return this.models.filter(group => {
            const searchData = group.toSearchIndex();
            return searchData.searchText.includes(term);
        });
    }

}

/**
 * Form configurations for group management
 */
const GroupForms = {
    create: {
        title: 'Create Group',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Group Name',
                required: true,
                placeholder: 'Enter group name'
            },
            {
                name: 'description',
                type: 'textarea',
                label: 'Description',
                rows: 3,
                placeholder: 'Describe the purpose of this group'
            },
            {
                name: 'type',
                type: 'select',
                label: 'Group Type',
                required: true,
                options: [
                    { value: 'organization', label: 'Organization' },
                    { value: 'team', label: 'Team' },
                    { value: 'department', label: 'Department' },
                    { value: 'project', label: 'Project' },
                    { value: 'custom', label: 'Custom' }
                ]
            },
            {
                name: 'parent_id',
                type: 'select',
                label: 'Parent Group',
                options: [], // Will be populated dynamically
                nullable: true
            },
            {
                name: 'email',
                type: 'email',
                label: 'Group Email',
                placeholder: 'group@company.com'
            }
        ]
    },

    edit: {
        title: 'Edit Group',
        fields: [
            { name: 'name', type: 'text', label: 'Group Name', required: true },
            { name: 'description', type: 'textarea', label: 'Description', rows: 3 },
            { name: 'slug', type: 'text', label: 'URL Slug', readonly: true },
            {
                name: 'status',
                type: 'select',
                label: 'Status',
                options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'archived', label: 'Archived' }
                ]
            },
            { name: 'email', type: 'email', label: 'Group Email' }
        ]
    },

    search: {
        title: 'Search Groups',
        fields: [
            { name: 'q', type: 'text', label: 'Search', placeholder: 'Search groups...' },
            {
                name: 'type',
                type: 'select',
                label: 'Type',
                options: [
                    { value: '', label: 'All Types' },
                    { value: 'organization', label: 'Organizations' },
                    { value: 'team', label: 'Teams' },
                    { value: 'department', label: 'Departments' },
                    { value: 'project', label: 'Projects' }
                ]
            },
            {
                name: 'status',
                type: 'select',
                label: 'Status',
                options: [
                    { value: 'active', label: 'Active Only' },
                    { value: 'all', label: 'All Statuses' },
                    { value: 'inactive', label: 'Inactive Only' },
                    { value: 'archived', label: 'Archived Only' }
                ]
            }
        ]
    }
};

export { Group, GroupList, GroupForms };
