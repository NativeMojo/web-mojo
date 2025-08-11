/**
 * TodoCollection
 * DataList implementation for managing multiple TODO items
 * Handles fetching, filtering, and managing collections of Todo models
 */

import { DataList, Rest } from '../../src/mojo.js';
import Todo from './Todo.js';

// API Configuration
const API_BASE = 'http://0.0.0.0:8881';
const API_ENDPOINT = '/api/example/todo';

/**
 * TodoCollection - manages multiple TODO items with REST API
 * @extends DataList
 */
class TodoCollection extends DataList {
    static Rest = Rest;  // Set Rest class for API calls
    
    constructor(models = [], options = {}) {
        super(Todo, {
            endpoint: `${API_BASE}${API_ENDPOINT}`,
            ...options
        });
        
        // Add initial models if provided
        if (models.length > 0) {
            this.add(models);
        }
    }
    
    /**
     * Override fetch to use correct API parameters
     * The TODO API expects: size/start parameters instead of page/per_page
     * @param {object} options - Fetch options
     * @returns {Promise} Promise that resolves with fetched data
     */
    async fetch(options = {}) {
        // Transform pagination parameters for the API
        const params = {
            size: options.per_page || 10,
            start: ((options.page || 1) - 1) * (options.per_page || 10)
        };
        
        // Add any filters - check both nested and direct properties
        if (options.filters) {
            Object.assign(params, options.filters);
        }
        
        // Also add any direct filter properties (like kind, priority, etc.)
        const knownParams = ['page', 'per_page', 'sort', 'order', 'search', 'filters', 'append'];
        Object.keys(options).forEach(key => {
            if (!knownParams.includes(key) && options[key] !== null && options[key] !== undefined && options[key] !== '') {
                params[key] = options[key];
            }
        });
        
        // Add search parameter if provided
        if (options.search) {
            params.search = options.search;
        }
        
        // Add sort parameter if provided
        if (options.sort) {
            params.sort = options.sort;
            params.order = options.order || 'asc';
        }
        
        try {
            const response = await Rest.GET(`${API_BASE}${API_ENDPOINT}`, params);
            
            // Handle the response format from the TODO API
            if (response) {
                // Check if response has data array
                let todoData = [];
                
                // Handle different response structures
                if (Array.isArray(response)) {
                    // Response is directly an array
                    todoData = response;
                } else if (response.data && Array.isArray(response.data)) {
                    // Response has data property that is an array
                    todoData = response.data;
                } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                    // Response has nested data.data property that is an array
                    todoData = response.data.data;
                } else if (response.items && Array.isArray(response.items)) {
                    // Response has items property that is an array
                    todoData = response.items;
                } else {
                    // Try to handle as single item
                    if (response.data && typeof response.data === 'object') {
                        todoData = [response.data];
                    } else if (typeof response === 'object' && response.id) {
                        todoData = [response];
                    }
                }
                
                // Clear existing models if not appending
                if (!options.append) {
                    this.reset();
                }
                
                // Add models from response
                const todos = todoData.map(item => new Todo(item));
                this.add(todos);
                
                // Store pagination info from the actual API response structure
                // API returns: response.data = { data: [...], count: total, size: pageSize, start: offset }
                if (response.data && typeof response.data === 'object') {
                    this.total = response.data.count || response.total || todos.length;
                    this.per_page = response.data.size || options.per_page || 10;
                    // Calculate page from start index
                    const start = response.data.start || 0;
                    this.page = Math.floor(start / this.per_page) + 1;
                } else {
                    this.total = response.total || response.totalCount || todos.length;
                    this.page = response.page || options.page || 1;
                    this.per_page = response.per_page || response.pageSize || options.per_page || 10;
                }
                
                // Store pagination metadata in meta property for Table component
                this.meta = {
                    total: this.total,
                    page: this.page,
                    per_page: this.per_page,
                    pages: Math.ceil(this.total / this.per_page)
                };
                
                return todos;
            } else {
                return [];
            }
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Get all TODOs of a specific kind
     * @param {string} kind - The kind of TODO (task, bug, feature, ticket)
     * @returns {Array} Array of Todo models
     */
    getByKind(kind) {
        return this.filter(todo => todo.get('kind') === kind);
    }
    
    /**
     * Get all TODOs with a specific priority
     * @param {string} priority - The priority level (low, medium, high)
     * @returns {Array} Array of Todo models
     */
    getByPriority(priority) {
        return this.filter(todo => todo.get('priority') === priority);
    }
    
    /**
     * Get all overdue TODOs
     * @returns {Array} Array of overdue Todo models
     */
    getOverdue() {
        return this.filter(todo => todo.isOverdue());
    }
    
    /**
     * Get all high priority TODOs
     * @returns {Array} Array of high priority Todo models
     */
    getHighPriority() {
        return this.filter(todo => todo.isHighPriority());
    }
    
    /**
     * Get TODOs for today
     * @returns {Array} Array of Todo models scheduled for today
     */
    getToday() {
        const today = new Date().toDateString();
        return this.filter(todo => {
            const todoDate = todo.get('date');
            if (!todoDate) return false;
            return new Date(todoDate).toDateString() === today;
        });
    }
    
    /**
     * Get TODOs for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Array of Todo models within the date range
     */
    getDateRange(startDate, endDate) {
        return this.filter(todo => {
            const todoDate = todo.get('date');
            if (!todoDate) return false;
            const date = new Date(todoDate);
            return date >= startDate && date <= endDate;
        });
    }
    
    /**
     * Search TODOs by description
     * @param {string} searchTerm - Search term
     * @returns {Array} Array of matching Todo models
     */
    search(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.filter(todo => {
            const description = todo.get('description');
            return description && description.toLowerCase().includes(term);
        });
    }
    
    /**
     * Sort collection by a specific field
     * @param {string} field - Field to sort by
     * @param {string} order - Sort order ('asc' or 'desc')
     * @returns {Array} Sorted array of Todo models
     */
    sortBy(field, order = 'asc') {
        const sorted = [...this.models].sort((a, b) => {
            const aVal = a.get(field);
            const bVal = b.get(field);
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }
    
    /**
     * Get statistics about the collection
     * @returns {object} Statistics object
     */
    getStats() {
        const stats = {
            total: this.models.length,
            byKind: {},
            byPriority: {},
            overdue: 0,
            today: 0,
            completed: 0
        };
        
        // Count by kind
        const kinds = ['task', 'bug', 'feature', 'ticket'];
        kinds.forEach(kind => {
            stats.byKind[kind] = this.getByKind(kind).length;
        });
        
        // Count by priority
        const priorities = ['low', 'medium', 'high'];
        priorities.forEach(priority => {
            stats.byPriority[priority] = this.getByPriority(priority).length;
        });
        
        // Count overdue and today
        stats.overdue = this.getOverdue().length;
        stats.today = this.getToday().length;
        
        return stats;
    }
    
    /**
     * Create multiple TODOs at once
     * @param {Array} todosData - Array of TODO data objects
     * @returns {Promise} Promise that resolves with created TODOs
     */
    async createBatch(todosData) {
        const promises = todosData.map(data => {
            const todo = new Todo(data);
            return todo.save();
        });
        
        try {
            const savedTodos = await Promise.all(promises);
            this.add(savedTodos);
            return savedTodos;
        } catch (error) {
            console.error('❌ [TodoCollection] Batch create error:', error);
            throw error;
        }
    }
    
    /**
     * Delete multiple TODOs at once
     * @param {Array} todoIds - Array of TODO IDs to delete
     * @returns {Promise} Promise that resolves when all are deleted
     */
    async deleteBatch(todoIds) {
        const promises = todoIds.map(id => {
            const todo = this.get(id);
            if (todo) {
                return todo.destroy();
            }
            return Promise.resolve();
        });
        
        try {
            await Promise.all(promises);
            // Remove from collection
            todoIds.forEach(id => {
                const todo = this.get(id);
                if (todo) {
                    this.remove(todo);
                }
            });
            return true;
        } catch (error) {
            console.error('❌ [TodoCollection] Batch delete error:', error);
            throw error;
        }
    }
    
    /**
     * Export collection as JSON
     * @returns {object} JSON representation of the collection
     */
    toJSON() {
        return {
            total: this.total || this.models.length,
            page: this.page || 1,
            per_page: this.per_page || 10,
            data: this.models.map(model => model.attributes),
            meta: this.meta || {
                total: this.total || this.models.length,
                page: this.page || 1,
                per_page: this.per_page || 10,
                pages: Math.ceil((this.total || this.models.length) / (this.per_page || 10))
            }
        };
    }
    
    /**
     * Import data from JSON
     * @param {object} json - JSON data to import
     */
    fromJSON(json) {
        this.reset();
        if (json.data && Array.isArray(json.data)) {
            const todos = json.data.map(item => new Todo(item));
            this.add(todos);
        }
        this.total = json.total || this.models.length;
        this.page = json.page || 1;
        this.per_page = json.per_page || 10;
        
        // Set meta property
        this.meta = json.meta || {
            total: this.total,
            page: this.page,
            per_page: this.per_page,
            pages: Math.ceil(this.total / this.per_page)
        };
    }
}

// Export the TodoCollection
export default TodoCollection;