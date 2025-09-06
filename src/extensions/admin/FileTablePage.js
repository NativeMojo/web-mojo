/**
 * FileTablePage - File management using TablePage component
 * Clean implementation with file drop support
 */

import TablePage from '@core/pages/TablePage.js';
import { File, FileList, FileForms } from '@core/models/Files.js';
import FileView from './views/FileView.js';
import applyFileDropMixin from '@core/mixins/FileDropMixin.js';

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
                    label: 'Filename'
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

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Empty state
            emptyMessage: 'No files found. Click "Add File" to upload your first file.',

            // Batch actions
            batchBarLocation: 'top',
            batchActions: [
                { label: "Download", icon: "bi bi-download", action: "batch-download" },
                { label: "Delete", icon: "bi bi-trash", action: "batch-delete" },
                { label: "Move to Group", icon: "bi bi-folder", action: "batch-move" }
            ],

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });

        // Enable file drop support
        this.enableFileDrop({
            acceptedTypes: ['*/*'],
            maxFileSize: 100 * 1024 * 1024, // 100MB
            multiple: false,
            validateOnDrop: true
        });
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
                showToast: true,
                onProgress: (progressInfo) => {
                    console.log(`Upload progress: ${progressInfo.percentage}%`);
                },
                onComplete: (result) => {
                    console.log('Upload completed:', result);
                    this.refresh();
                },
                onError: (error) => {
                    console.error('Upload failed:', error);
                    this.showError('Upload failed: ' + error.message);
                }
            });

            await upload;
        } catch (error) {
            console.error('Error starting file upload:', error);
            this.showError('Failed to start file upload: ' + error.message);
        }
    }
}

// Apply file drop mixin
applyFileDropMixin(FileTablePage);

export default FileTablePage;