/**
 * FileManagerTablePage - File Manager (storage backend) management.
 *
 * Lists storage backends; clicking a row opens FileManagerView, which owns
 * the detail display and all per-record actions (edit, credentials, owners,
 * clone, test connection, check / fix CORS, delete) via its context menu.
 */

import TablePage from '@core/pages/TablePage.js';
import { FileManagerList } from '@core/models/Files.js';
import FileManagerView from './FileManagerView.js';

// FileManager.ADD_FORM / EDIT_FORM are registered on the model (Files.js).
// FileManager.VIEW_CLASS is registered on the model (FileManagerView.js).
class FileManagerTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_file_managers',
            pageName: 'Manage Storage Backends',
            router: "admin/file-managers",
            Collection: FileManagerList,

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
                    sortable: true,
                    visibility: 'xl'
                },
                {
                    key: 'is_default',
                    label: 'Default',
                    formatter: "boolean|badge"
                },
                {
                    key: 'is_active',
                    label: 'Active',
                    formatter: "boolean|badge"
                },
                {
                    key: 'is_public',
                    label: 'Public',
                    formatter: "boolean|badge",
                    visibility: 'xl'
                },
                {
                    key: 'backend_type',
                    label: 'Type',
                    formatter: "default('Unknown')"
                },
                {
                    key: 'created',
                    label: 'Created',
                    formatter: "epoch|datetime",
                    visibility: 'xl'
                }
            ],

            searchPlaceholder: 'Search backend name or URL',

            // Row click → detail view (owns the per-record context menu)
            clickAction: 'view',
            itemViewClass: FileManagerView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

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
