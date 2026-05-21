/**
 * FileManagerView - Detail view for a FileManager (storage backend).
 *
 * Standard record-viewer layout (DetailView): a flat header card with an
 * active toggle + context menu, followed by a SideNavView rail of sections:
 *
 *   - Overview — the backend's configuration (DataView)
 *   - Files    — the files stored in this backend, a context-scoped TableView
 *
 * Credentials are write-only — never displayed; edited via the context menu.
 *
 * Context-menu actions:
 *   - Edit / Edit Credentials / Edit Owners → Modal forms
 *   - Clone Backend     → POST {clone: 1}
 *   - Test Connection   → POST {test_connection: 1}
 *   - Check CORS        → POST {check_cors: 1}, audit report
 *   - Fix CORS          → POST {fix_cors: 1}, result report
 *   - Delete            → DELETE /api/fileman/manager/<id>
 */

import DetailView from '@core/views/data/DetailView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import FileView from '@core/views/data/FileView.js';
import Modal from '@core/views/feedback/Modal.js';
import { FileManager, FileManagerForms, FileList } from '@core/models/Files.js';

class FileManagerView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new FileManager(options.data || {});
        const managerId = model.get('id');

        // ── Overview section — backend configuration ─────────
        const overviewSection = new DataView({
            model,
            className: 'p-3',
            columns: 2,
            showEmptyValues: true,
            emptyValueText: '—',
            fields: [
                { name: 'backend_url', label: 'Backend URL', cols: 12 },
                { name: 'backend_type', label: 'Type', formatter: 'uppercase', cols: 6 },
                { name: 'use', label: 'Use', cols: 6 },
                { name: 'group.name', label: 'Owner Group', cols: 6 },
                { name: 'user.display_name', label: 'Owner User', cols: 6 },
                { name: 'allowed_origins', label: 'Allowed Origins', cols: 12 },
                { name: 'created', label: 'Created', formatter: 'epoch|datetime', cols: 6 },
                { name: 'modified', label: 'Modified', formatter: 'epoch|datetime', cols: 6 }
            ]
        });

        // ── Files section — context-scoped to this backend ───
        // FileList filtered by the File → FileManager FK (`file_manager`);
        // hideActivePillNames suppresses that pill so the scope can't be
        // cleared. Pre-fetched below so the rail badge populates.
        const filesCollection = new FileList({
            params: { file_manager: managerId, size: 10, sort: '-created' }
        });
        const filesSection = new TableView({
            collection: filesCollection,
            className: 'p-3',
            hideActivePillNames: ['file_manager'],
            searchable: true,
            searchPlaceholder: 'Search filename or type',
            sortable: true,
            filterable: false,
            paginated: true,
            selectable: false,
            showRefresh: true,
            showAdd: false,
            showExport: false,
            clickAction: 'view',
            itemView: FileView,
            viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
            emptyMessage: 'No files are stored in this backend yet.',
            columns: [
                { key: 'filename', label: 'Filename' },
                { key: 'content_type', label: 'Type', formatter: "default('—')", visibility: 'lg' },
                { key: 'file_size', label: 'Size', formatter: 'filesize', align: 'right' },
                { key: 'upload_status', label: 'Status', formatter: 'badge', visibility: 'xl' },
                { key: 'created', label: 'Uploaded', formatter: 'epoch|datetime' }
            ],
            tableOptions: { striped: true, bordered: false, hover: true, responsive: false }
        });

        super({
            ...options,
            model,
            header: {
                icon: 'bi-hdd-stack',
                iconToneFn: (m) => m.get('is_active') ? 'primary' : null,
                titleField: 'name',
                subtitlePath: 'backend_url',
                chips: [
                    { icon: 'bi-hdd', text: (m) => String(m.get('backend_type') || 'unknown').toUpperCase(),
                      variant: 'secondary' },
                    { icon: 'bi-star-fill', text: 'Default', variant: 'primary',
                      when: (m) => m.get('is_default') },
                    { icon: 'bi-globe2', text: 'Public', variant: 'info',
                      when: (m) => m.get('is_public') }
                ],
                activeField: 'is_active',
                contextMenu: {
                    items: [
                        { label: 'Edit', action: 'edit', icon: 'bi-pencil' },
                        { label: 'Edit Credentials', action: 'edit-credentials', icon: 'bi-shield' },
                        { label: 'Edit Owners', action: 'edit-owners', icon: 'bi-person' },
                        { type: 'divider' },
                        { label: 'Clone Backend', action: 'clone', icon: 'bi-copy' },
                        { type: 'divider' },
                        { label: 'Test Connection', action: 'test-connection', icon: 'bi-plug' },
                        { label: 'Check CORS', action: 'check-cors', icon: 'bi-question-circle' },
                        { label: 'Fix CORS', action: 'fix-cors', icon: 'bi-wrench' },
                        { type: 'divider' },
                        { label: 'Delete', action: 'delete-backend', icon: 'bi-trash', danger: true }
                    ]
                }
            },
            sections: [
                { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection },
                { key: 'Files', label: 'Files', icon: 'bi-files', view: filesSection }
            ],
            activeSection: 'Overview'
        });

        this.collection = options.collection || null;
        this.filesCollection = filesCollection;

        // Fire-and-forget so the Files rail badge populates before the user
        // opens the section. The section's TableView sees lastFetchTime set
        // and skips its own onAfterMount fetch.
        if (managerId) filesCollection.fetch().catch(() => {});
    }

    async onAfterBuild() {
        // Keep the Files rail badge in sync with the backend's file count.
        this.filesCollection.on('fetch:success', () => {
            const n = this.filesCollection.meta?.count;
            this.setBadge('Files', n > 0 ? n : null);
        }, this);
    }

    // ── Helpers ──────────────────────────────────────────────

    _readError(resp, fallback = 'Operation failed') {
        if (!resp) return fallback;
        if (resp.success === false) return resp.error || fallback;
        const d = resp.data || resp;
        return d?.error || d?.message || fallback;
    }

    // ── Context-menu actions ─────────────────────────────────

    // Edit handlers don't re-render the view: showModelForm saves the model,
    // and model:change re-renders the DetailView header (via _onModelChange)
    // and the Overview DataView automatically. Calling this.render() on a
    // DetailView would tear the header out.

    async onActionEdit() {
        await this.getApp().showModelForm({
            title: `Edit — ${this.model.get('name') || 'Storage Backend'}`,
            model: this.model,
            formConfig: FileManagerForms.edit
        });
    }

    async onActionEditCredentials() {
        const resp = await this.getApp().showModelForm({
            title: 'Edit Credentials',
            model: this.model,
            formConfig: { fields: FileManagerForms.credentials.fields }
        });
        if (resp) this.getApp()?.toast?.success?.('Credentials updated');
    }

    async onActionEditOwners() {
        await this.getApp().showModelForm({
            title: 'Edit Owners',
            model: this.model,
            formConfig: { fields: FileManagerForms.owners.fields }
        });
    }

    async onActionClone() {
        const confirmed = await Modal.confirm(
            'Create a clone of this storage backend with the same credentials?',
            'Clone Storage Backend',
            { confirmText: 'Clone' }
        );
        if (!confirmed) return;

        const app = this.getApp();
        app?.showLoading?.();
        let resp;
        try {
            resp = await this.model.save({ clone: 1 });
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success && resp?.data?.status) {
            app?.toast?.success?.('Storage backend cloned');
            await this.collection?.fetch?.();
        } else {
            app?.showError?.(this._readError(resp, 'Clone failed'));
        }
    }

    async onActionTestConnection() {
        const app = this.getApp();
        app?.showLoading?.('Testing connection…');
        let resp;
        try {
            resp = await this.model.save({ test_connection: 1 });
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success && resp?.data?.status) {
            app?.toast?.success?.('Connection test successful');
        } else {
            app?.toast?.error?.(this._readError(resp, 'Connection test failed'));
        }
    }

    async onActionCheckCors() {
        const app = this.getApp();
        app?.showLoading?.('Checking CORS…');
        let resp;
        try {
            resp = await this.model.save({ check_cors: 1 });
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success && resp?.data?.status) {
            await Modal.data({
                title: `CORS Audit — ${this.model.get('name') || 'Storage Backend'}`,
                data: resp.data,
                size: 'lg'
            });
        } else {
            app?.toast?.error?.(this._readError(resp, 'CORS check failed'));
        }
    }

    async onActionFixCors() {
        const app = this.getApp();
        app?.showLoading?.('Fixing CORS…');
        let resp;
        try {
            resp = await this.model.save({ fix_cors: 1 });
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success && resp?.data?.status) {
            await Modal.data({
                title: `Fix CORS — ${this.model.get('name') || 'Storage Backend'}`,
                data: resp.data,
                size: 'lg'
            });
        } else {
            app?.toast?.error?.(this._readError(resp, 'Fix CORS failed'));
        }
    }

    async onActionDeleteBackend() {
        const name = this.model.get('name') || 'this storage backend';
        const confirmed = await Modal.confirm(
            `Permanently delete "${name}"? Files served through it will no longer be reachable.`,
            'Delete Storage Backend',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (!confirmed) return;

        const app = this.getApp();
        app?.showLoading?.();
        let resp;
        try {
            resp = await this.model.destroy();
        } finally {
            app?.hideLoading?.();
        }

        if (resp && resp.success !== false) {
            app?.toast?.success?.('Storage backend deleted');
            this.emit('file-manager:deleted', { model: this.model });
        } else {
            app?.showError?.(this._readError(resp, 'Delete failed'));
        }
    }
}

FileManagerView.MODEL_CLASS = FileManager;
FileManager.VIEW_CLASS = FileManagerView;

export default FileManagerView;
