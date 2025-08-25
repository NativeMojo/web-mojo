/**
 * TodosPage - Simple Todo List using TablePage component
 * Demonstrates clean usage of TablePage framework features
 */

import TablePage from '../../../src/components/TablePage.js';
import { TodoList, TodoForms } from '../models/Todo.js';

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
            modelName: 'Todo',
            Collection: TodoList,
            formCreate: TodoForms.create,
            formEdit: TodoForms.create,
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
                    key: 'name',
                    label: 'Name',
                },
                {
                    key: 'description',
                    label: 'Description',
                    sortable: true,
                    formatter: "truncate(100)|capitalize",  // Pipe syntax
                    class: 'todo-description'
                },
                // {
                //     key: 'note.description',
                //     label: 'Notes',
                //     width: '150px',
                //     formatter: "truncate(50)|default('-')"  // Clean pipe syntax
                // }
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

            contextMenu: [
              {
                icon: 'bi-eye',
                action: 'item-view',
                label: "View"
              },
              {
                icon: 'bi-pencil',
                action: 'item-edit',
                label: "Edit"
              },
              {
                icon: 'bi-trash',
                action: 'item-delete',
                label: "Delete"
              }
            ],

            // Table options
            tableOptions: {
                pageSizes: [5, 10, 25, 50],
                defaultPageSize: 10,
                emptyMessage: 'No todos found. Click "Add Todo" to create your first task.',
                emptyIcon: 'bi-inbox',
                batchActions: [
                  { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
                  { label: "Export", icon: "bi bi-download", action: "batch_export" },
                  { label: "Activate", icon: "bi bi-check-circle", action: "batch_activate" },
                  { label: "Deactivate", icon: "bi bi-x-circle", action: "batch_deactivate" },
                  { label: "Move", icon: "bi bi-arrow-right", action: "batch_move" }
                ],
            }
        });
    }

    /**
     * Initialize after constructor
     */
    onInit() {
        super.onInit();

        // Set bulk actions
        // this.setBulkActions([
        //     {
        //         id: 'complete',
        //         label: 'Mark Complete',
        //         icon: 'bi-check-circle',
        //         handler: async () => await this.markComplete()
        //     },
        //     {
        //         id: 'delete',
        //         label: 'Delete Selected',
        //         icon: 'bi-trash',
        //         handler: async () => await this.deleteSelected()
        //     }
        // ]);
    }

}

export default TodosPage;
