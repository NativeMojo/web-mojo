/**
 * FileView - Comprehensive file management interface
 *
 * Features:
 * - Clean header with file thumbnail/icon, name, size, and status
 * - Tabbed interface for Info (metadata) and Renditions
 * - Integrated with DataView, Table, and ContextMenu components
 */

import View from '../../core/View.js';
import TabView from '../../views/navigation/TabView.js';
import DataView from '../../views/data/DataView.js';
import Table from '../../views/table/Table.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import Collection from '../../core/Collection.js';
import { File, FileForms } from '../../models/Files.js';
import Dialog from '../../core/Dialog.js';
import LightboxGallery from '../../lightbox/LightboxGallery.js';
import PDFViewer from '../../lightbox/PDFViewer.js';

class FileView extends View {
    constructor(options = {}) {
        super({
            className: 'file-view',
            ...options
        });

        this.model = options.model || new File(options.data || {});
        this.isImage = this.model.get('category') === 'image';

        // Prepare renditions for the table by converting the renditions object to an array
        const renditionsData = this.model.get('renditions') || {};
        this.renditionsCollection = new Collection(Object.values(renditionsData));

        this.template = `
            <div class="file-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <!-- Left Side: Thumbnail & Info -->
                    <div class="d-flex align-items-center gap-3">
                        <div class="file-thumbnail" style="width: 80px; height: 80px;">
                            {{#isImage}}
                                <a href="{{model.url}}" target="_blank" title="View original file">
                                    <img src="{{model.renditions.thumbnail.url|default(model.url)}}" class="img-fluid rounded" style="width: 80px; height: 80px; object-fit: cover;">
                                </a>
                            {{/isImage}}
                            {{^isImage}}
                                <div class="avatar-placeholder rounded bg-light d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                                    <i class="bi bi-file-earmark-text text-secondary" style="font-size: 40px;"></i>
                                </div>
                            {{/isImage}}
                        </div>
                        <div>
                            <h3 class="mb-1" style="word-break: break-all;">{{model.filename|truncate(40)}}</h3>
                            <div class="text-muted small">
                                <span><i class="bi bi-hdd"></i> {{model.file_size|filesize}}</span>
                                <span class="mx-2">|</span>
                                <span>{{model.content_type}}</span>
                            </div>
                            <div class="text-muted small mt-1">
                                Uploaded: {{model.created|datetime}}
                            </div>
                        </div>
                    </div>

                    <!-- Right Side: Status & Actions -->
                    <div class="d-flex align-items-center gap-4">
                        <div class="text-end">
                            <div class="d-flex align-items-center gap-2 justify-content-end">
                                <span class="badge {{model.upload_status|badge}}">{{model.upload_status|capitalize}}</span>
                            </div>
                             <div class="text-muted small mt-1">
                                Public: {{{model.is_public|yesnoicon}}}
                            </div>
                        </div>
                        <div data-container="file-context-menu"></div>
                    </div>
                </div>

                <!-- Tab Container -->
                <div data-container="file-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Info Tab using DataView
        this.infoView = new DataView({
            model: this.model,
            className: "p-3",
            showEmptyValues: true,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'id', label: 'ID' },
                { name: 'filename', label: 'Filename' },
                { name: 'storage_filename', label: 'Storage Filename' },
                { name: 'content_type', label: 'Content Type' },
                { name: 'file_size', label: 'File Size', format: 'filesize' },
                { name: 'category', label: 'Category' },
                { name: 'upload_status', label: 'Status', format: 'badge' },
                { name: 'created', label: 'Created', format: 'datetime' },
                { name: 'modified', label: 'Modified', format: 'datetime' },
                { name: 'user.display_name', label: 'Uploaded By' },
                { name: 'file_manager.name', label: 'Storage Backend' },
                { name: 'storage_file_path', label: 'Storage Path' },
                { name: 'url', label: 'Public URL', format: 'url' },
                { name: 'is_public', label: 'Is Public', format: 'boolean' },
            ]
        });

        // Renditions Tab using Table
        this.renditionsView = new Table({
            title: 'Available Renditions',
            collection: this.renditionsCollection,
            columns: [
                { key: 'role', label: 'Role', formatter: 'badge' },
                { key: 'filename', label: 'Filename', formatter: 'truncate(40)' },
                { key: 'file_size', label: 'Size', formatter: 'filesize' },
                { key: 'content_type', label: 'Content Type' },
                {
                    key: 'actions',
                    label: 'Actions',
                    template: `
                        <a href="{{url}}" target="_blank" class="btn btn-sm btn-outline-primary" title="View">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="{{url}}" download="{{filename}}" class="btn btn-sm btn-outline-secondary" title="Download">
                            <i class="bi bi-download"></i>
                        </a>
                    `
                }
            ]
        });

        // Create TabView, only showing Renditions tab if they exist
        const tabs = { 'Info': this.infoView };
        tabs['Renditions'] = this.renditionsView;

        this.tabView = new TabView({
            tabs: tabs,
            activeTab: 'Info',
            containerId: 'file-tabs'
        });
        this.addChild(this.tabView);

        // Create ContextMenu
        const fileMenu = new ContextMenu({
            containerId: 'file-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'View', action: 'view-file', icon: 'bi-eye' },
                    { label: 'Download', action: 'download-file', icon: 'bi bi-download' },
                    { label: 'Edit Details', action: 'edit-file', icon: 'bi bi-pencil' },
                    { type: 'divider' },
                    this.model.get('is_public')
                        ? { label: 'Make Private', action: 'make-private', icon: 'bi bi-lock' }
                        : { label: 'Make Public', action: 'make-public', icon: 'bi bi-unlock' },
                    { type: 'divider' },
                    { label: 'Delete File', action: 'delete-file', icon: 'bi bi-trash', danger: true }
                ]
            }
        });
        this.addChild(fileMenu);
    }

    async onActionViewFile() {
        const contentType = this.model.get('content_type');
        const fileUrl = this.model.get('url');

        if (contentType.startsWith('image/')) {
            const renditions = this.model.get('renditions') || {};
            const images = [
                { src: fileUrl, alt: 'Original' },
                ...Object.values(renditions).map(r => ({ src: r.url, alt: r.role }))
            ];
            LightboxGallery.show(images, { fitToScreen: false });
        } else if (contentType === 'application/pdf') {
            PDFViewer.showDialog(fileUrl, { title: this.model.get('filename') });
        } else {
            window.open(fileUrl, '_blank');
        }
    }

    async onActionDownloadFile() {
        const url = this.model.get('url');
        if (url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = this.model.get('filename');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    async onActionEditFile() {
        const resp = await Dialog.showModelForm({
            title: `Edit File - ${this.model.get('filename')}`,
            model: this.model,
            formConfig: FileForms.edit,
        });
        if (resp) {
            this.render();
        }
    }

    async onActionMakePublic() {
        await this.model.save({ is_public: true });
        this.render();
    }

    async onActionMakePrivate() {
        await this.model.save({ is_public: false });
        this.render();
    }

    async onActionDeleteFile() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to delete the file "${this.model.get('filename')}"? This action cannot be undone.`,
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (confirmed) {
            const resp = await this.model.destroy();
            if (resp.success) {
                this.emit('file:deleted', { model: this.model });
            }
        }
    }
}

export default FileView;
