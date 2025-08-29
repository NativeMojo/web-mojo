/**
 * FileTablePage - File management using TablePage component
 * Manages uploaded files and their metadata
 */

import TablePage from '../components/TablePage.js';
import { File, FileList, FileForms } from '../models/Files.js';
import applyFileDropMixin from '../components/FileDropMixin.js';
import FileView from './views/FileView.js';

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
            itemViewClass: FileView,
            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    sortable: true,
                    class: 'text-muted'
                },
                {
                    key: 'filename',
                    label: 'Filename',
                },
                {
                    key: 'content_type',
                    label: 'Type',
                    formatter: "default('Unknown')"
                },
                {
                    key: 'file_size',
                    label: 'Size',
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
                    formatter: "badge"
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

        this.enableFileDrop({
            acceptedTypes: ['*/*'],
            maxFileSize: 100 * 1024 * 1024, // 100MB
            multiple: false,
            validateOnDrop: true
        });
    }

    async onItemView(item, mode, event, target) {
        const dialog = await super.onItemView(item, mode, event, target);
        if (dialog && dialog.bodyView) {
            dialog.bodyView.on('file:deleted', () => {
                dialog.hide();
                this.refreshTable();
            });
        }
        return dialog;
    }

    async onFileDrop(files, event, validation) {
        const file = files[0];
        console.log(`File Dropped: ${file.name} (${file.type}) (${file.size} bytes)`);

        try {
            // Create new File model instance
            const fileModel = new File();

            // Start upload with progress tracking
            const upload = fileModel.upload({
                file: file,
                name: file.name,
                description: `File uploaded via drag & drop on ${new Date().toLocaleDateString()}`,
                showToast: true, // Show progress toast
                onProgress: (progressInfo) => {
                    // Progress is automatically shown in toast
                    console.log(`Upload progress: ${progressInfo.percentage}%`);
                },
                onComplete: (result) => {
                    console.log('Upload completed:', result);
                    // Refresh the table to show the new file
                    this.refreshTable();
                },
                onError: (error) => {
                    console.error('Upload failed:', error);
                }
            });

            // The upload starts automatically, but we can still handle the promise
            upload.then(result => {
                console.log('File upload successful!', result);
            }).catch(error => {
                console.error('File upload failed:', error.message);
            });

        } catch (error) {
            console.error('Error starting file upload:', error);
            this.showError('Failed to start file upload: ' + error.message);
        }
    }
}

applyFileDropMixin(FileTablePage);

export default FileTablePage;
