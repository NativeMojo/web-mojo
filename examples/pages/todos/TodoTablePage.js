/**
 * TodoTablePage - Comprehensive REST table example using TablePage component
 * Demonstrates all TablePage features with Todo REST model
 */

import { TablePage } from '../../../src/mojo.js';
import Todo from '../../models/Todo.js';
import TodoCollection from '../../models/TodoCollection.js';
import Dialog from '../../../src/components/Dialog.js';

class TodoTablePage extends TablePage {
    constructor(options = {}) {
        // Initialize collection before super() so it can be passed to parent
        const collection = new TodoCollection();

        // Define columns before super() - formatters will be added after
        const columns = [
            {
                key: 'id',
                label: 'ID',
                width: '60px',
                sortable: true,
                class: 'text-muted'
            },
            {
                key: 'kind',
                label: 'Type',
                width: '100px',
                sortable: true,
                formatter: 'formatKind',  // String reference
                filter: {
                    type: 'select',
                    options: [
                        { value: '', label: 'All Types' },
                        { value: 'task', label: 'Task' },
                        { value: 'bug', label: 'Bug' },
                        { value: 'feature', label: 'Feature' },
                        { value: 'ticket', label: 'Ticket' }
                    ]
                }
            },
            {
                key: 'description',
                label: 'Description',
                sortable: true,
                formatter: 'formatDescription',  // String reference
                class: 'todo-description'
            },
            {
                key: 'note.description',
                label: 'Notes',
                width: '150px',
                formatter: 'formatNote'  // String reference
            }
        ];

    // Extract filters from columns for the Table component
    const filters = {};
    columns.forEach(column => {
        if (column.filter) {
            filters[column.key] = {
                ...column.filter,
                label: column.label
            };
        }
    });

    // Now call super with all options including columns
    super({
        ...options,
        page_name: 'todotable',
        Collection: TodoCollection,
        collection: collection,
        columns: columns,
        filters: filters,  // Pass extracted filters
            title: 'Todo Management',
            route: '/todos',
            pageIcon: 'bi bi-check2-square',
            displayName: 'Todos',
            pageDescription: 'Manage tasks, bugs, features, and tickets',

            // Model configuration
            modelName: 'Todo',
            modelNamePlural: 'Todos',

            // Table configuration - pass directly to TablePage
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,
            striped: true,
            hover: true,
            bordered: false,
            responsive: true,

            // TablePage specific options
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Additional table options
            tableOptions: {
                pageSizes: [10, 25, 50, 100],
                defaultPageSize: 25,  // Changed to 25 to match fetch options
                itemsPerPage: 25,     // Explicitly set items per page
                emptyMessage: 'No todos found. Click "Add Todo" to create your first task.',
                emptyIcon: 'bi-inbox'
            }
        });

        // Store custom action configuration for our own use
        this.customActions = [
            {
                id: 'mark-complete',
                label: 'Mark Complete',
                icon: 'bi-check-circle',
                class: 'btn-success',
                bulk: true,
                handler: 'markComplete'
            },
            {
                id: 'set-priority',
                label: 'Set Priority',
                icon: 'bi-flag',
                class: 'btn-warning',
                bulk: true,
                handler: 'setPriority'
            }
        ];

        // Store export configuration
        this.exportFormats = ['csv', 'json', 'excel'];
        this.exportFilename = 'todos-export';

        // Store reference to collection (already passed to parent)
        this.collection = collection;

        // Now bind the formatter functions after super() has been called
        this.columns = columns.map(column => {
            if (column.formatter && typeof column.formatter === 'string') {
                // Replace string reference with bound method
                return {
                    ...column,
                    formatter: this[column.formatter].bind(this)
                };
            }
            return column;
        });

        // Update the tableConfig columns to use bound formatters
        if (this.tableConfig) {
            this.tableConfig.columns = this.columns;
        }
    }

    /**
     * Initialize the page
     */
    async onInit() {
        await super.onInit();

        // Set up event listeners
        this.on('table:add', () => this.handleAdd());
        this.on('table:edit', (data) => this.handleEdit(data.item));
        this.on('table:delete', (data) => this.handleDelete(data.items));
        this.on('table:refresh', () => this.handleRefresh());
        this.on('table:export', (data) => this.handleExport(data.format));
        this.on('table:bulk-action', (data) => this.handleBulkAction(data.action, data.items));
    }

    /**
     * After render hook - ensure table is rendered
     */
    async onAfterRender() {
        // Call parent's onAfterRender which creates the table
        await super.onAfterRender();

        // Ensure the table renders after creation
        if (this.table) {
            await this.table.render();
        }
    }

    /**
     * After mount hook
     */
    async onAfterMount() {
        await super.onAfterMount();
        await this.loadData();
    }

    /**
     * Load todos from API
     */
    async loadData(params = {}) {
        try {
            this.setLoadingState(true);

            // Build fetch options with correct parameter names for TodoCollection
            const fetchOptions = {
                page: params.page || this.currentState?.page || 1,
                per_page: params.perPage || this.currentState?.perPage || 25,
                sort: params.sort || this.currentState?.sort,
                order: params.dir || this.currentState?.dir || 'asc',
                search: params.search || this.currentState?.search
            };

            // Add filters directly to fetchOptions (not nested)
            const filters = params.filters || this.currentState?.filters || {};
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    // Map 'kind' filter to the correct API parameter
                    if (key === 'kind') {
                        fetchOptions.kind = value;
                    } else {
                        fetchOptions[key] = value;
                    }
                }
            });

            // Fetch from API
            await this.collection.fetch(fetchOptions);

            // Update table display
            if (this.table) {
                // Update table's active filters to match current state
                if (params.filters) {
                    this.table.activeFilters = { ...params.filters };
                }
                // Update table pagination state
                if (params.page) {
                    this.table.currentPage = params.page;
                }
                if (params.perPage) {
                    this.table.itemsPerPage = params.perPage;
                }
                // The table and TodoTablePage share the same collection instance
                // Just re-render the table to reflect the new data
                this.table.render();
            }

            // Update status
            this.lastUpdated = new Date().toLocaleTimeString();
            this.updateStatusDisplay();

        } catch (error) {
            console.error('Failed to load todos:', error);
            this.showError('Failed to load todos: ' + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Format checkbox column
     */
    formatCheckbox(value, item) {
        return `
            <div class="form-check">
                <input class="form-check-input"
                       type="checkbox"
                       data-row-id="${item.id}"
                       value="${item.id}">
            </div>
        `;
    }

    /**
     * Format kind/type column
     */
    formatKind(value, item) {
        const todo = new Todo(item);
        return todo.getStatusBadge();
    }

    /**
     * Format description column
     */
    formatDescription(value, item) {
        const todo = new Todo(item);
        const isOverdue = todo.isOverdue();
        const description = todo.getShortDescription(150);

        return `
            <div class="${isOverdue ? 'text-danger' : ''}">
                ${description}
                ${isOverdue ? '<i class="bi bi-exclamation-triangle ms-1" title="Overdue"></i>' : ''}
            </div>
        `;
    }

    /**
     * Format priority column
     */
    formatPriority(value, item) {
        const todo = new Todo(item);
        return todo.getPriorityBadge();
    }

    /**
     * Format date column
     */
    formatDate(value, item) {
        const todo = new Todo(item);
        const date = todo.getFormattedDate();
        const isOverdue = todo.isOverdue();

        return `<span class="${isOverdue ? 'text-danger fw-bold' : ''}">${date}</span>`;
    }

    /**
     * Format note column
     */
    formatNote(value, item) {
        const todo = new Todo(item);
        const notePreview = todo.getNotePreview();

        if (notePreview === '-') return notePreview;

        return `
            <span class="text-truncate d-inline-block" style="max-width: 150px;" title="${notePreview}">
                <i class="bi bi-sticky me-1"></i>${notePreview}
            </span>
        `;
    }

    /**
     * Format actions column
     */
    formatActions(value, item) {
        return `
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary"
                        data-action="edit-row"
                        data-id="${item.id}"
                        title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger"
                        data-action="delete-row"
                        data-id="${item.id}"
                        title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    }

    /**
     * Handle add new todo
     */
    async handleAdd() {
        const dialog = new Dialog({
            title: 'Add New Todo',
            size: 'lg',
            body: this.getTodoForm(),
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    dismiss: true
                },
                {
                    text: 'Save',
                    class: 'btn-primary',
                    action: 'save'
                }
            ]
        });

        dialog.on('action:save', async () => {
            const formData = this.getFormData(dialog.element);

            try {
                const todo = new Todo(formData);
                await todo.save();

                // Add to collection and refresh table
                this.collection.add(todo);
                await this.loadData();

                dialog.hide();
                this.showSuccess('Todo created successfully');
            } catch (error) {
                this.showError('Failed to create todo: ' + error.message);
            }
        });

        await this.showDialog(dialog);
    }

    /**
     * Handle edit todo
     */
    async handleEdit(item) {
        const todo = this.collection.get(item.id) || new Todo(item);

        const dialog = new Dialog({
            title: 'Edit Todo',
            size: 'lg',
            body: this.getTodoForm(todo.toJSON()),
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    dismiss: true
                },
                {
                    text: 'Update',
                    class: 'btn-primary',
                    action: 'update'
                }
            ]
        });

        dialog.on('action:update', async () => {
            const formData = this.getFormData(dialog.element);

            try {
                todo.set(formData);
                await todo.save();

                await this.loadData();
                dialog.hide();
                this.showSuccess('Todo updated successfully');
            } catch (error) {
                this.showError('Failed to update todo: ' + error.message);
            }
        });

        await this.showDialog(dialog);
    }

    /**
     * Handle delete todo(s)
     */
    async handleDelete(items) {
        const count = items.length;
        const message = count === 1
            ? 'Are you sure you want to delete this todo?'
            : `Are you sure you want to delete ${count} todos?`;

        const confirmed = await Dialog.confirm({
            title: 'Confirm Delete',
            message: message,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                // Delete each item
                for (const item of items) {
                    const todo = this.collection.get(item.id) || new Todo(item);
                    await todo.destroy();
                }

                await this.loadData();
                this.showSuccess(`${count} todo(s) deleted successfully`);
            } catch (error) {
                this.showError('Failed to delete todos: ' + error.message);
            }
        }
    }

    /**
     * Handle bulk actions
     */
    async handleBulkAction(action, items) {
        switch (action) {
            case 'mark-complete':
                await this.markComplete(items);
                break;
            case 'set-priority':
                await this.setPriority(items);
                break;
            case 'delete':
                await this.handleDelete(items);
                break;
        }
    }

    /**
     * Mark todos as complete
     */
    async markComplete(items) {
        try {
            for (const item of items) {
                const todo = this.collection.get(item.id) || new Todo(item);
                todo.set('status', 'completed');
                await todo.save();
            }

            await this.loadData();
            this.showSuccess(`${items.length} todo(s) marked as complete`);
        } catch (error) {
            this.showError('Failed to update todos: ' + error.message);
        }
    }

    /**
     * Set priority for multiple todos
     */
    async setPriority(items) {
        const priority = await Dialog.prompt({
            title: 'Set Priority',
            message: `Set priority for ${items.length} todo(s):`,
            inputType: 'select',
            inputOptions: [
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' }
            ]
        });

        if (priority) {
            try {
                for (const item of items) {
                    const todo = this.collection.get(item.id) || new Todo(item);
                    todo.set('priority', priority);
                    await todo.save();
                }

                await this.loadData();
                this.showSuccess(`Priority updated for ${items.length} todo(s)`);
            } catch (error) {
                this.showError('Failed to update priority: ' + error.message);
            }
        }
    }

    /**
     * Get todo form HTML
     */
    getTodoForm(data = {}) {
        return `
            <form class="todo-form">
                <div class="mb-3">
                    <label class="form-label">Description <span class="text-danger">*</span></label>
                    <textarea class="form-control" name="description" rows="3" required>${data.description || ''}</textarea>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Type <span class="text-danger">*</span></label>
                        <select class="form-select" name="kind" required>
                            <option value="">Select type...</option>
                            <option value="task" ${data.kind === 'task' ? 'selected' : ''}>Task</option>
                            <option value="bug" ${data.kind === 'bug' ? 'selected' : ''}>Bug</option>
                            <option value="feature" ${data.kind === 'feature' ? 'selected' : ''}>Feature</option>
                            <option value="ticket" ${data.kind === 'ticket' ? 'selected' : ''}>Ticket</option>
                        </select>
                    </div>

                    <div class="col-md-6 mb-3">
                        <label class="form-label">Priority</label>
                        <select class="form-select" name="priority">
                            <option value="medium" ${data.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${data.priority === 'high' ? 'selected' : ''}>High</option>
                            <option value="low" ${data.priority === 'low' ? 'selected' : ''}>Low</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Due Date</label>
                        <input type="date" class="form-control" name="date" value="${data.date ? data.date.split('T')[0] : ''}">
                    </div>

                    <div class="col-md-6 mb-3">
                        <label class="form-label">Status</label>
                        <select class="form-select" name="status">
                            <option value="pending" ${data.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="in-progress" ${data.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${data.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">Notes</label>
                    <input type="text" class="form-control" name="note.name" value="${data.note?.name || ''}" placeholder="Add a note...">
                </div>
            </form>
        `;
    }

    /**
     * Get form data from dialog
     */
    getFormData(container) {
        const form = container.querySelector('form');
        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            // Handle nested properties (e.g., note.name)
            if (key.includes('.')) {
                const parts = key.split('.');
                let obj = data;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!obj[parts[i]]) obj[parts[i]] = {};
                    obj = obj[parts[i]];
                }
                obj[parts[parts.length - 1]] = value;
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    /**
     * Handle action clicks from table rows
     */
    async onActionEditRow(event, element) {
        const id = element.dataset.id;
        const item = this.collection.get(id);
        if (item) {
            await this.handleEdit(item.toJSON());
        }
    }

    async onActionDeleteRow(event, element) {
        const id = element.dataset.id;
        const item = this.collection.get(id);
        if (item) {
            await this.handleDelete([item.toJSON()]);
        }
    }

    /**
     * Handle refresh
     */
    async handleRefresh() {
        // Use parent's refresh implementation which handles loading states properly
        await super.handleRefresh();
    }

    /**
     * Handle export
     */
    async handleExport(format) {
        try {
            const data = this.collection.toJSON();
            const filename = `todos-${new Date().toISOString().split('T')[0]}`;

            switch (format) {
                case 'csv':
                    this.exportCSV(data, filename);
                    break;
                case 'json':
                    this.exportJSON(data, filename);
                    break;
                case 'excel':
                    this.exportExcel(data, filename);
                    break;
            }

            this.showSuccess(`Exported ${data.length} todos as ${format.toUpperCase()}`);
        } catch (error) {
            this.showError('Export failed: ' + error.message);
        }
    }

    /**
     * Export as CSV
     */
    exportCSV(data, filename) {
        const headers = ['ID', 'Type', 'Description', 'Priority', 'Date', 'Status'];
        const rows = data.map(item => [
            item.id,
            item.kind,
            item.description,
            item.priority,
            item.date,
            item.status || 'pending'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
        ].join('\n');

        this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
    }

    /**
     * Export as JSON
     */
    exportJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
    }

    /**
     * Export as Excel (simplified - creates CSV that Excel can open)
     */
    exportExcel(data, filename) {
        // For a real Excel export, you'd use a library like SheetJS
        this.exportCSV(data, filename);
    }

    /**
     * Download file helper
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export default TodoTablePage;
