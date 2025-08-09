/**
 * Todo Model
 * RestModel implementation for TODO items
 * Connects to the MOJO example API at /api/example/todo
 */

import { RestModel } from '../../src/mojo.js';

// API Configuration
const API_BASE = 'http://0.0.0.0:8881';
const API_ENDPOINT = '/api/example/todo';

/**
 * Todo Model - represents a single TODO item from the REST API
 * @extends RestModel
 */
class Todo extends RestModel {
    static endpoint = API_ENDPOINT;
    static baseURL = API_BASE;
    
    constructor(data = {}) {
        super(data, {
            endpoint: API_ENDPOINT,
            idAttribute: 'id'
        });
    }
    
    /**
     * Get status badge HTML based on the kind of TODO
     * @returns {string} HTML string for the status badge
     */
    getStatusBadge() {
        const classes = {
            'ticket': 'badge bg-info text-white',
            'task': 'badge bg-success text-white',
            'bug': 'badge bg-danger text-white',
            'feature': 'badge bg-primary text-white'
        };
        const kind = this.get('kind');
        return `<span class="${classes[kind] || 'badge bg-secondary text-white'}">${kind || 'unknown'}</span>`;
    }
    
    /**
     * Get truncated description for table display
     * @param {number} maxLength - Maximum length before truncation
     * @returns {string} Truncated description
     */
    getShortDescription(maxLength = 100) {
        const description = this.get('description');
        if (!description) return '';
        return description.length > maxLength 
            ? description.substring(0, maxLength) + '...' 
            : description;
    }
    
    /**
     * Get note preview
     * @returns {string} Note preview or dash if no note
     */
    getNotePreview() {
        const note = this.get('note');
        if (!note || !note.name) return '-';
        return note.name.length > 50 
            ? note.name.substring(0, 50) + '...' 
            : note.name;
    }
    
    /**
     * Get priority badge HTML
     * @returns {string} HTML string for the priority badge
     */
    getPriorityBadge() {
        const priority = this.get('priority');
        if (!priority) return '';
        
        const classes = {
            'high': 'badge bg-danger',
            'medium': 'badge bg-warning text-dark',
            'low': 'badge bg-secondary'
        };
        
        return `<span class="${classes[priority] || 'badge bg-secondary'}">${priority}</span>`;
    }
    
    /**
     * Get formatted date string
     * @returns {string} Formatted date or 'No date'
     */
    getFormattedDate() {
        const date = this.get('date');
        if (!date) return 'No date';
        return new Date(date).toLocaleDateString();
    }
    
    /**
     * Check if TODO is overdue
     * @returns {boolean} True if the TODO is overdue
     */
    isOverdue() {
        const date = this.get('date');
        if (!date) return false;
        return new Date(date) < new Date();
    }
    
    /**
     * Check if TODO is high priority
     * @returns {boolean} True if priority is high
     */
    isHighPriority() {
        return this.get('priority') === 'high';
    }
    
    /**
     * Get a summary object suitable for list display
     * @returns {object} Summary object
     */
    getSummary() {
        return {
            id: this.get('id'),
            kind: this.get('kind'),
            description: this.getShortDescription(),
            priority: this.get('priority'),
            date: this.getFormattedDate(),
            isOverdue: this.isOverdue(),
            isHighPriority: this.isHighPriority()
        };
    }
    
    /**
     * Validate the TODO model
     * @returns {object|null} Validation errors or null if valid
     */
    validate() {
        const errors = {};
        
        if (!this.get('description')) {
            errors.description = 'Description is required';
        }
        
        if (!this.get('kind')) {
            errors.kind = 'Kind is required';
        }
        
        const validKinds = ['task', 'bug', 'feature', 'ticket'];
        if (this.get('kind') && !validKinds.includes(this.get('kind'))) {
            errors.kind = 'Invalid kind. Must be one of: ' + validKinds.join(', ');
        }
        
        const validPriorities = ['low', 'medium', 'high'];
        if (this.get('priority') && !validPriorities.includes(this.get('priority'))) {
            errors.priority = 'Invalid priority. Must be one of: ' + validPriorities.join(', ');
        }
        
        return Object.keys(errors).length > 0 ? errors : null;
    }
    
    /**
     * Custom save method with validation
     * @param {object} options - Save options
     * @returns {Promise} Promise that resolves with saved model
     */
    async save(options = {}) {
        // Validate before saving
        const errors = this.validate();
        if (errors && !options.skipValidation) {
            throw new Error('Validation failed: ' + JSON.stringify(errors));
        }
        
        // Set default values if not present
        if (!this.get('date')) {
            this.set('date', new Date().toISOString());
        }
        if (!this.get('priority')) {
            this.set('priority', 'medium');
        }
        
        // Call parent save method
        return super.save(options);
    }
    
    /**
     * Clone the TODO with a new description
     * @param {string} newDescription - Description for the cloned TODO
     * @returns {Todo} New Todo instance
     */
    clone(newDescription = null) {
        const data = { ...this.attributes };
        delete data.id; // Remove ID so it gets a new one
        if (newDescription) {
            data.description = newDescription;
        } else {
            data.description = `Copy of ${data.description}`;
        }
        return new Todo(data);
    }
}

// Export the Todo model
export default Todo;