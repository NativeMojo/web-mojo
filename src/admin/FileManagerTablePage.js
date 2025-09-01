/**
 * FileManagerTablePage - File Manager backend management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '../pages/TablePage.js';
import { FileManagerList, FileManagerForms } from '../models/Files.js';

class FileManagerTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_file_managers',
            pageName: 'Manage Storage Backends',
            router: "admin/file-managers",
            Collection: FileManagerList,
            
            formCreate: FileManagerForms.create,
            formEdit: FileManagerForms.edit,

            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    sortable: true,
                    class: 'text-muted'
                },
                {
                    key: 'name',
                    label: 'Name',
                    formatter: "default('Unnamed Backend')"
                },
                {
                    key: 'backend_url',
                    label: 'Backend URL',
                    sortable: true
                },
                {
                    key: 'is_default',
                    label: 'Default',
                    formatter: "boolean|badge('Default:primary,No:secondary')"
                },
                {
                    key: 'is_active',
                    label: 'Active',
                    formatter: "boolean|badge('Active:success,Inactive:danger')"
                },
                {
                    key: 'backend_type',
                    label: 'Type',
                    formatter: "default('Unknown')"
                },
                {
                    key: 'created',
                    label: 'Created',
                    formatter: "epoch|datetime"
                }
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Empty state
            emptyMessage: 'No storage backends found. Click "Add Storage Backend" to configure your first backend.',

            // Batch actions
            batchBarLocation: 'top',
            batchActions: [
                { label: "Delete", icon: "bi bi-trash", action: "batch-delete" },
                { label: "Export", icon: "bi bi-download", action: "batch-export" },
                { label: "Activate", icon: "bi bi-check-circle", action: "batch-activate" },
                { label: "Deactivate", icon: "bi bi-x-circle", action: "batch-deactivate" }
            ],

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}

export default FileManagerTablePage;