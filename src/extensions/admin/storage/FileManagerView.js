/**
 * FileManagerView - Detail view for a FileManager (storage backend) row.
 *
 * Read-only record display (mirrors ApiKeyView / PhoneConfigView): header
 * with identity + badges, a list-group of detail sections, and a three-dots
 * context menu for all mutations. Credentials are write-only — they are
 * never displayed and are edited through the dedicated credentials form.
 *
 * Context-menu actions:
 *   - Edit               → Modal form (FileManagerForms.edit)
 *   - Edit Credentials   → Modal form (FileManagerForms.credentials)
 *   - Edit Owners        → Modal form (FileManagerForms.owners)
 *   - Clone Backend      → POST {clone: 1}
 *   - Test Connection    → POST {test_connection: 1}
 *   - Check CORS         → POST {check_cors: 1}, audit report shown
 *   - Fix CORS           → POST {fix_cors: 1}, result report shown
 *   - Delete             → DELETE /api/fileman/manager/<id>
 */

import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import TableView from '@core/views/table/TableView.js';
import FileView from '@core/views/data/FileView.js';
import { FileManager, FileManagerForms, FileList } from '@core/models/Files.js';

class FileManagerView extends View {
    constructor(options = {}) {
        super({
            className: 'file-manager-view',
            ...options
        });

        this.model = options.model || new FileManager(options.data || {});
        this.collection = options.collection || null;

        this.template = `
            <div class="file-manager-view-container">

                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-hdd-stack"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.name|default('Unnamed Backend')}}</h3>
                            <div class="text-muted small">
                                <span class="badge bg-secondary">{{typeLabel}}</span>
                                {{#model.id}}
                                <span class="mx-2">·</span>
                                ID: {{model.id}}
                                {{/model.id}}
                            </div>
                            <div class="mt-1">
                                <span class="badge {{activeBadge}}">{{activeLabel}}</span>
                                {{#model.is_default|bool}}
                                <span class="badge bg-primary ms-1">Default</span>
                                {{/model.is_default|bool}}
                                {{#model.is_public|bool}}
                                <span class="badge bg-info ms-1">Public</span>
                                {{/model.is_public|bool}}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-start gap-4">
                        <div data-container="file-manager-context-menu"></div>
                    </div>
                </div>

                <!-- Detail sections -->
                <div class="list-group mb-1">
                    <div class="list-group-item">
                        <h6 class="text-muted text-uppercase small mb-2">Connection</h6>
                        <dl class="row mb-0 small">
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Backend URL</dt>
                            <dd class="col-7 col-sm-8 mb-2 font-monospace">{{model.backend_url|default('—')}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Type</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{typeLabel}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Use</dt>
                            <dd class="col-7 col-sm-8 mb-0">{{model.use|default('—')}}</dd>
                        </dl>
                        <p class="text-muted small mb-0 mt-1">
                            <i class="bi bi-shield-lock me-1"></i>
                            Credentials are write-only — use Edit Credentials to update them.
                        </p>
                    </div>

                    <div class="list-group-item">
                        <h6 class="text-muted text-uppercase small mb-2">Ownership &amp; Access</h6>
                        <dl class="row mb-0 small">
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Group</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{ownerGroup}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">User</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{ownerUser}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Public</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{model.is_public|yesno}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Allowed origins</dt>
                            <dd class="col-7 col-sm-8 mb-0">{{model.allowed_origins|default('—')}}</dd>
                        </dl>
                    </div>

                    <div class="list-group-item">
                        <h6 class="text-muted text-uppercase small mb-2">Status</h6>
                        <dl class="row mb-0 small">
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Default</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{model.is_default|yesno}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Active</dt>
                            <dd class="col-7 col-sm-8 mb-0">{{model.is_active|yesno}}</dd>
                        </dl>
                    </div>

                    <div class="list-group-item">
                        <h6 class="text-muted text-uppercase small mb-2">Metadata</h6>
                        <dl class="row mb-0 small">
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Created</dt>
                            <dd class="col-7 col-sm-8 mb-2">{{model.created|epoch|datetime}}</dd>
                            <dt class="col-5 col-sm-4 fw-normal text-muted">Modified</dt>
                            <dd class="col-7 col-sm-8 mb-0">{{model.modified|epoch|datetime}}</dd>
                        </dl>
                    </div>
                </div>

                <!-- Files stored in this backend -->
                <div class="mt-4">
                    <h6 class="text-muted text-uppercase small mb-2">Files in this backend</h6>
                    <div data-container="file-manager-files"></div>
                </div>

            </div>
        `;
    }

    // ── Template computed properties ─────────────────────────

    get typeLabel() {
        const t = this.model?.get?.('backend_type');
        return t ? String(t).toUpperCase() : 'Unknown';
    }

    get activeLabel() {
        return this.model?.get?.('is_active') ? 'Active' : 'Inactive';
    }

    get activeBadge() {
        return this.model?.get?.('is_active') ? 'bg-success' : 'bg-secondary';
    }

    get ownerGroup() {
        const g = this.model?.get?.('group');
        if (!g) return '—';
        if (typeof g === 'object') return g.name || `#${g.id}`;
        return `#${g}`;
    }

    get ownerUser() {
        const u = this.model?.get?.('user');
        if (!u) return '—';
        if (typeof u === 'object') return u.display_name || u.username || `#${u.id}`;
        return `#${u}`;
    }

    // ── Lifecycle ────────────────────────────────────────────

    async onInit() {
        const ctxMenu = new ContextMenu({
            containerId: 'file-manager-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
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
        });
        this.addChild(ctxMenu);

        // Files stored in this backend — a context-scoped TableView. The
        // collection is filtered by `file_manager` (the File → FileManager FK);
        // hideActivePillNames suppresses that scoping pill so it can't be
        // removed. The list auto-fetches on mount (ListView.onAfterMount).
        const id = this.model.get('id');
        if (id) {
            const filesCollection = new FileList({
                params: { file_manager: id, size: 10, sort: '-created' }
            });
            this.filesTable = new TableView({
                containerId: 'file-manager-files',
                collection: filesCollection,
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
            this.addChild(this.filesTable);
        }
    }

    // ── Helpers ──────────────────────────────────────────────

    _readError(resp, fallback = 'Operation failed') {
        if (!resp) return fallback;
        if (resp.success === false) return resp.error || fallback;
        const d = resp.data || resp;
        return d?.error || d?.message || fallback;
    }

    // ── Actions ──────────────────────────────────────────────

    async onActionEdit() {
        const resp = await this.getApp().showModelForm({
            title: `Edit — ${this.model.get('name') || 'Storage Backend'}`,
            model: this.model,
            formConfig: FileManagerForms.edit
        });
        if (resp) await this.render();
    }

    async onActionEditCredentials() {
        const resp = await this.getApp().showModelForm({
            title: 'Edit Credentials',
            model: this.model,
            formConfig: { fields: FileManagerForms.credentials.fields }
        });
        if (resp) {
            this.getApp()?.toast?.success?.('Credentials updated');
        }
    }

    async onActionEditOwners() {
        const resp = await this.getApp().showModelForm({
            title: 'Edit Owners',
            model: this.model,
            formConfig: { fields: FileManagerForms.owners.fields }
        });
        if (resp) await this.render();
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
