/**
 * FileManagerTablePage - File Manager backend management using TablePage component
 * Manages storage backends and their configurations
 */

import TablePage from '../pages/TablePage.js';
import { FileManager, FileManagerList, FileManagerForms } from '../models/Files.js';

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

            // TablePage toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Table options
            tableOptions: {
                pageSizes: [5, 10, 25, 50],
                defaultPageSize: 10,
                emptyMessage: 'No storage backends found. Click "Add Storage Backend" to configure your first backend.',
                emptyIcon: 'bi-hdd-stack',
                actions: ["edit", "view", "delete"],
                batchActions: [
                    { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
                    { label: "Export", icon: "bi bi-download", action: "batch_export" },
                    { label: "Activate", icon: "bi bi-check-circle", action: "batch_activate" },
                    { label: "Deactivate", icon: "bi bi-x-circle", action: "batch_deactivate" },
                    { label: "Test", icon: "bi bi-wifi", action: "batch_test" }

                ],
            }
        });
    }
}

export default FileManagerTablePage;
