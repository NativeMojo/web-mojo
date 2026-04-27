/**
 * AdminMetadataSection - View/edit metadata on any model with a metadata field
 *
 * Displays metadata as a key-value list with add/edit/remove capability.
 * Saves changes via standard model CRUD (model.save()).
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';

export default class AdminMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'admin-metadata-section',
            template: `
                <style>
                    .amd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                    .amd-header h6 { margin: 0; font-weight: 600; }
                    .amd-list { border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; }
                    .amd-item { display: flex; align-items: center; padding: 0.6rem 1rem; border-bottom: 1px solid #f0f0f0; gap: 0.75rem; }
                    .amd-item:last-child { border-bottom: none; }
                    .amd-key { font-family: ui-monospace, monospace; font-size: 0.82rem; font-weight: 600; color: #495057; min-width: 120px; flex-shrink: 0; }
                    .amd-value { flex: 1; font-size: 0.85rem; color: #212529; word-break: break-word; min-width: 0; }
                    .amd-actions { flex-shrink: 0; display: flex; gap: 0.25rem; }
                    .amd-actions .btn { font-size: 0.7rem; padding: 0.15rem 0.35rem; }
                    .amd-empty { padding: 2rem; text-align: center; color: #6c757d; font-size: 0.85rem; }
                    .amd-empty i { font-size: 1.5rem; display: block; margin-bottom: 0.5rem; }
                </style>

                <div class="amd-header">
                    <h6>Metadata</h6>
                    <button type="button" class="btn btn-primary btn-sm" data-action="add-entry">
                        <i class="bi bi-plus-lg me-1"></i>Add
                    </button>
                </div>

                <div id="amd-entries"></div>
            `,
            ...options
        });
    }

    onAfterRender() {
        this._renderEntries();
    }

    _getMetadata() {
        return this.model?.get('metadata') || {};
    }

    _renderEntries() {
        const container = this.element?.querySelector('#amd-entries');
        if (!container) return;

        const metadata = this._getMetadata();
        const keys = Object.keys(metadata).sort();

        if (!keys.length) {
            container.innerHTML = `
                <div class="amd-list">
                    <div class="amd-empty">
                        <i class="bi bi-braces"></i>
                        No metadata entries
                    </div>
                </div>`;
            return;
        }

        const rows = keys.map(key => {
            const val = metadata[key];
            const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `
                <div class="amd-item">
                    <div class="amd-key">${this._escapeHtml(key)}</div>
                    <div class="amd-value">${this._escapeHtml(display)}</div>
                    <div class="amd-actions">
                        <button type="button" class="btn btn-outline-secondary" data-action="edit-entry" data-key="${this._escapeHtml(key)}" title="Edit"><i class="bi bi-pencil"></i></button>
                        <button type="button" class="btn btn-outline-danger" data-action="remove-entry" data-key="${this._escapeHtml(key)}" title="Remove"><i class="bi bi-trash"></i></button>
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = `<div class="amd-list">${rows}</div>`;
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    async onActionAddEntry() {
        const data = await Modal.form({
            title: 'Add Metadata Entry',
            icon: 'bi-braces',
            size: 'sm',
            fields: [
                { name: 'key', type: 'text', label: 'Key', required: true, placeholder: 'e.g., timezone' },
                { name: 'value', type: 'text', label: 'Value', required: true, placeholder: 'e.g., America/New_York' }
            ]
        });
        if (!data) return true;

        const metadata = { ...this._getMetadata() };
        // Try to parse JSON values
        try {
            metadata[data.key] = JSON.parse(data.value);
        } catch {
            metadata[data.key] = data.value;
        }

        const resp = await this.model.save({ metadata });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Metadata entry added');
            this._renderEntries();
        } else {
            this.getApp()?.toast?.error('Failed to save metadata');
        }
        return true;
    }

    async onActionEditEntry(event, el) {
        const key = el.dataset.key;
        if (!key) return true;

        const metadata = this._getMetadata();
        const currentValue = metadata[key];
        const displayValue = typeof currentValue === 'object' ? JSON.stringify(currentValue) : String(currentValue);

        const data = await Modal.form({
            title: `Edit "${key}"`,
            icon: 'bi-braces',
            size: 'sm',
            fields: [
                { name: 'value', type: 'text', label: 'Value', required: true, value: displayValue }
            ]
        });
        if (!data) return true;

        const updated = { ...metadata };
        try {
            updated[key] = JSON.parse(data.value);
        } catch {
            updated[key] = data.value;
        }

        const resp = await this.model.save({ metadata: updated });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Metadata updated');
            this._renderEntries();
        } else {
            this.getApp()?.toast?.error('Failed to save metadata');
        }
        return true;
    }

    async onActionRemoveEntry(event, el) {
        const key = el.dataset.key;
        if (!key) return true;

        const confirmed = await Modal.confirm(
            `Remove metadata key "<strong>${this._escapeHtml(key)}</strong>"?`,
            'Remove Entry'
        );
        if (!confirmed) return true;

        const updated = { ...this._getMetadata() };
        delete updated[key];

        const resp = await this.model.save({ metadata: updated });
        if (resp.status === 200) {
            this.getApp()?.toast?.success('Metadata entry removed');
            this._renderEntries();
        } else {
            this.getApp()?.toast?.error('Failed to remove metadata entry');
        }
        return true;
    }
}
