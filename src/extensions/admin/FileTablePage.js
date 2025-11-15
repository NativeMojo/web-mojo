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
                    key: 'group.name',
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
            },
            ...options,
        });

        // Enable file drop support
        this.enableFileDrop({
            acceptedTypes: ['*/*'],
            maxFileSize: 100 * 1024 * 1024, // 100MB
            multiple: false,
            validateOnDrop: true
        });
    }

    /**
     * Override the default add action to handle file uploads
     * Opens native file picker and uses same upload flow as drag-drop
     */
    async onActionAdd(event, element) {
        event.preventDefault();

        // Create hidden file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '*/*';
        fileInput.multiple = false;
        fileInput.style.display = 'none';

        // Handle file selection
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            
            if (!file) {
                return;
            }

            console.log(`File Selected: ${file.name} (${file.type}) (${file.size} bytes)`);

            // Validate file size (same as FileDropMixin config)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (file.size > maxSize) {
                this.showError(`File size (${this._formatFileSize(file.size)}) exceeds maximum (${this._formatFileSize(maxSize)})`);
                return;
            }

            // Use the same upload flow as drag-drop
            try {
                const fileModel = new File();
                let extra = {};
                if (this.options.requiresGroup && this.getApp().activeGroup) {
                    extra.group = this.getApp().activeGroup.id;
                }

                const upload = fileModel.upload({
                    file: file,
                    name: file.name,
                    description: `File uploaded on ${new Date().toLocaleDateString()}`,
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
                    },
                    ...extra
                });

                await upload;
            } catch (error) {
                console.error('Error starting file upload:', error);
                this.showError('Failed to start file upload: ' + error.message);
            } finally {
                // Clean up file input
                fileInput.remove();
            }
        });

        // Trigger file picker
        document.body.appendChild(fileInput);
        fileInput.click();
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     * @private
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async onFileDrop(files, event, validation) {
        const file = files[0];
        console.log(`File Dropped: ${file.name} (${file.type}) (${file.size} bytes)`);

        try {
            // Create new File model instance
            const fileModel = new File();
            let extra = {};
            if (this.options.requiresGroup && this.getApp().activeGroup) {
                extra.group = this.getApp().activeGroup.id;
            }

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
                },
                ...extra
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
