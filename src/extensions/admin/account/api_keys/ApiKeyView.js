/**
 * ApiKeyView - Group-scoped API key detail and management interface
 *
 * Shows key metadata, permissions, and provides actions to edit, toggle
 * active state, and delete. The raw token is only displayed at creation
 * time and is not shown here.
 */

import View from '@core/View.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { ApiKey, ApiKeyForms } from '@core/models/ApiKey.js';

class ApiKeyView extends View {
    constructor(options = {}) {
        super({
            className: 'api-key-view',
            ...options
        });

        this.model = options.model || new ApiKey(options.data || {});

        this.template = `
            <div class="api-key-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <!-- Left: Icon & Identity -->
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-key"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.name|default('Unnamed Key')}}</h3>
                            <div class="text-muted small">
                                ID: {{model.id}}
                                <span class="mx-2">|</span>
                                Group: {{model.group.name|default(model.group)}}
                            </div>
                            <div class="mt-1">
                                <span class="badge {{model.is_active|boolean('bg-success','bg-secondary')}}">
                                    {{model.is_active|boolean('Active','Inactive')}}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Meta & Actions -->
                    <div class="d-flex align-items-start gap-4">
                        <div class="text-end">
                            <div class="text-muted small">Created</div>
                            <div>{{model.created|datetime}}</div>
                        </div>
                        <div data-container="apikey-context-menu"></div>
                    </div>
                </div>

                <!-- Details -->
                <div class="list-group mb-3">
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Token Preview</h6>
                        <p class="mb-1 font-monospace small text-muted">
                            The raw token is only shown once at creation time.
                        </p>
                    </div>
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Permissions</h6>
                        {{#model.permissions}}
                            <pre class="mb-0 small">{{model.permissions|json}}</pre>
                        {{/model.permissions}}
                        {{^model.permissions}}
                            <span class="text-muted small">No permissions granted</span>
                        {{/model.permissions}}
                    </div>
                    {{#model.limits}}
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Rate Limit Overrides</h6>
                        <pre class="mb-0 small">{{model.limits|json}}</pre>
                    </div>
                    {{/model.limits}}
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Usage</h6>
                        <p class="mb-0 small text-muted">
                            Include in requests as:
                            <code>Authorization: apikey &lt;token&gt;</code>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        const isActive = this.model.get('is_active');

        const apiKeyMenu = new ContextMenu({
            containerId: 'apikey-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit', action: 'edit-key', icon: 'bi-pencil' },
                    isActive
                        ? { label: 'Deactivate', action: 'deactivate-key', icon: 'bi-x-circle' }
                        : { label: 'Activate', action: 'activate-key', icon: 'bi-check-circle' },
                    { type: 'divider' },
                    { label: 'Delete Key', action: 'delete-key', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(apiKeyMenu);
    }

    async onActionEditKey() {
        const app = this.getApp();
        const resp = await app.showModelForm({
            title: `Edit API Key — ${this.model.get('name')}`,
            model: this.model,
            formConfig: ApiKeyForms.edit,
        });
        if (resp) {
            this.render();
        }
    }

    async onActionDeactivateKey() {
        const app = this.getApp();
        const confirmed = await app.confirm({
            title: 'Deactivate API Key',
            message: `Deactivate "${this.model.get('name')}"? Requests using this key will be rejected.`,
            confirmLabel: 'Deactivate',
            confirmClass: 'btn-warning'
        });
        if (!confirmed) return;

        app.showLoading();
        const resp = await this.model.save({ is_active: false });
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('API key deactivated');
            this.render();
        } else {
            app.toast.error('Failed to deactivate key');
        }
    }

    async onActionActivateKey() {
        const app = this.getApp();
        app.showLoading();
        const resp = await this.model.save({ is_active: true });
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('API key activated');
            this.render();
        } else {
            app.toast.error('Failed to activate key');
        }
    }

    async onActionDeleteKey() {
        const app = this.getApp();
        const confirmed = await app.confirm({
            title: 'Delete API Key',
            message: `Permanently delete "${this.model.get('name')}"? This cannot be undone.`,
            confirmLabel: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return;

        app.showLoading();
        const resp = await this.model.delete();
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('API key deleted');
            this.emit('deleted', { model: this.model });
        } else {
            app.toast.error('Failed to delete key');
        }
    }
}

ApiKey.VIEW_CLASS = ApiKeyView;
export default ApiKeyView;
