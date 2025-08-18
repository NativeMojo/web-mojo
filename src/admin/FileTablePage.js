/**
 * FileTablePage - File management using TablePage component
 * Manages uploaded files and their metadata
 */

import TablePage from '../components/TablePage.js';
import { File, FileList, FileForms } from '../models/Files.js';

class FileTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_files',
            pageName: 'Manage Files',
            router: "admin/files",
            Collection: FileList,
            formCreate: FileForms.create,
            formEdit: FileForms.edit,
            
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
                    key: 'filename',
                    label: 'Filename',
                    sortable: true
                },
                {
                    key: 'content_type',
                    label: 'Type',
                    width: '120px',
                    formatter: "default('Unknown')"
                },
                {
                    key: 'file_size',
                    label: 'Size',
                    width: '100px',
                    formatter: "filesize"
                },
                {
                    key: 'group',
                    label: 'Group',
                    formatter: "default('No Group')"
                },
                {
                    key: 'upload_status',
                    label: 'Status',
                    width: '100px',
                    formatter: "default('Completed')|badge('Completed:success,Uploading:warning,Failed:danger,Pending:info')"
                },
                {
                    key: 'description',
                    label: 'Description',
                    formatter: "truncate(50)|default('No description')"
                },
                {
                    key: 'created',
                    label: 'Uploaded',
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
                emptyMessage: 'No files found. Click "Add File" to upload your first file.',
                emptyIcon: 'bi-file-earmark',
                actions: ["view", "download", "edit", "delete"],
                batchActions: [
                    { label: "Download", icon: "bi bi-download", action: "batch_download" },
                    { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
                    { label: "Move to Group", icon: "bi bi-folder", action: "batch_move" },
                    { label: "Export Metadata", icon: "bi bi-file-text", action: "batch_export" },
                    { label: "Archive", icon: "bi bi-archive", action: "batch_archive" },
                    { label: "Generate Links", icon: "bi bi-link", action: "batch_links" }
                ],
            }
        });
    }
}

export default FileTablePage;