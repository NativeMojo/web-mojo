/**
 * TodosPage - Simple Todo List using TablePage component
 * Demonstrates clean usage of TablePage framework features
 */

import TablePage from '../../../src/components/TablePage.js';
import { TodoList } from '../models/Todo.js';

class TodosPage extends TablePage {
    // Static page properties for routing
    static pageName = 'todos';
    static route = 'todos';
    static displayName = 'Todo List';
    static pageIcon = 'bi-check2-square';

    constructor(options = {}) {
        super({
            ...options,
            name: 'todos',
            title: 'Todo List',
            Collection: TodoList,

            // Column definitions
            columns: [
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
                    formatter: 'badge',  // Simple string formatter
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
                    formatter: "truncate(100)|capitalize",  // Pipe syntax
                    class: 'todo-description'
                },
                {
                    key: 'note.description',
                    label: 'Notes',
                    width: '150px',
                    formatter: "truncate(50)|default('-')"  // Clean pipe syntax
                }
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // TablePage toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Table options
            tableOptions: {
                pageSizes: [5, 10, 25, 50],
                defaultPageSize: 10,
                emptyMessage: 'No todos found. Click "Add Todo" to create your first task.',
                emptyIcon: 'bi-inbox'
            }
        });
    }

    /**
     * Initialize after constructor
     */
    onInit() {
        super.onInit();

        // Set bulk actions
        this.setBulkActions([
            {
                id: 'complete',
                label: 'Mark Complete',
                icon: 'bi-check-circle',
                handler: async () => await this.markComplete()
            },
            {
                id: 'delete',
                label: 'Delete Selected',
                icon: 'bi-trash',
                handler: async () => await this.deleteSelected()
            }
        ]);
    }

    /**
     * Handle toggle todo checkbox
     */
    async onActionToggleTodo(event, element) {
        const todoId = parseInt(element.dataset.todoId);
        const todo = this.collection.get(todoId);

        if (todo) {
            this.collection.update(todoId, {
                completed: element.checked
            });
            await this.refreshTable();
        }
    }

    /**
     * Handle edit todo button
     */
    async onActionEditTodo(event, element) {
        const todoId = parseInt(element.dataset.todoId);
        const todo = this.collection.get(todoId);

        if (todo) {
            const newText = prompt('Edit todo:', todo.text);
            if (newText && newText.trim()) {
                this.collection.update(todoId, {
                    text: newText.trim()
                });
                await this.refreshTable();
                this.showSuccess('Todo updated');
            }
        }
    }

    /**
     * Handle delete todo button
     */
    async onActionDeleteTodo(event, element) {
        const todoId = parseInt(element.dataset.todoId);

        if (confirm('Delete this todo?')) {
            this.collection.remove(todoId);
            await this.refreshTable();
            this.showSuccess('Todo deleted');
        }
    }

    /**
     * Override handleAdd to create new todos
     */
    async handleAdd() {
        const text = prompt('New todo:');
        if (!text || !text.trim()) return;

        const priority = prompt('Priority (high/medium/low):', 'medium') || 'medium';

        this.collection.add({
            text: text.trim(),
            priority: priority.toLowerCase(),
            completed: false,
            created_at: new Date().toISOString()
        });

        await this.refreshTable();
        this.showSuccess('Todo added');
    }

    /**
     * Mark selected todos as complete
     */
    async markComplete() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No items selected');
            return;
        }

        selected.forEach(item => {
            this.collection.update(item.id, { completed: true });
        });

        await this.refreshTable();
        this.clearSelection();
        this.showSuccess(`${selected.length} todo(s) marked complete`);
    }

    /**
     * Delete selected todos
     */
    async deleteSelected() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No items selected');
            return;
        }

        if (confirm(`Delete ${selected.length} todo(s)?`)) {
            selected.forEach(item => {
                this.collection.remove(item.id);
            });

            await this.refreshTable();
            this.clearSelection();
            this.showSuccess(`${selected.length} todo(s) deleted`);
        }
    }
}

export default TodosPage;
