/**
 * SettingView - Secure setting detail and management interface
 *
 * Shows setting metadata (key, value, group scope, secret status)
 * and provides actions to edit and delete. Secret values display
 * the masked display_value from the API.
 */

import View from '@core/View.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Setting, SettingForms } from '@core/models/Settings.js';

class SettingView extends View {
    constructor(options = {}) {
        super({
            className: 'setting-view',
            ...options
        });

        this.model = options.model || new Setting(options.data || {});

        this.template = `
            <div class="setting-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <!-- Left: Icon & Identity -->
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 text-primary">
                            <i class="bi bi-gear"></i>
                        </div>
                        <div>
                            <h3 class="mb-1 font-monospace">{{model.key|default('Unnamed Setting')}}</h3>
                            <div class="text-muted small">
                                ID: {{model.id}}
                                <span class="mx-2">|</span>
                                Scope: {{model.group.name|default('Global')}}
                            </div>
                            <div class="mt-1">
                                <span class="badge {{model.is_secret|boolean('bg-warning text-dark','bg-secondary')}}">
                                    {{model.is_secret|boolean('Secret','Plain')}}
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
                        <div data-container="setting-context-menu"></div>
                    </div>
                </div>

                <!-- Details -->
                <div class="list-group mb-3">
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Key</h6>
                        <p class="mb-0 font-monospace">{{model.key}}</p>
                    </div>
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Value</h6>
                        {{#model.is_secret|bool}}
                            <p class="mb-0 text-muted font-monospace">{{model.display_value|default('******')}}</p>
                            <small class="text-muted">This is a secret value. Enter a new value to replace it.</small>
                        {{/model.is_secret|bool}}
                        {{^model.is_secret|bool}}
                            <p class="mb-0 font-monospace">{{model.value|default(model.display_value)|default('—')}}</p>
                        {{/model.is_secret|bool}}
                    </div>
                    {{#model.group}}
                    <div class="list-group-item">
                        <h6 class="mb-1 text-muted">Group</h6>
                        <p class="mb-0">{{model.group.name|default(model.group)}}</p>
                    </div>
                    {{/model.group}}
                </div>
            </div>
        `;
    }

    async onInit() {
        const settingMenu = new ContextMenu({
            containerId: 'setting-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit', action: 'edit-setting', icon: 'bi-pencil' },
                    { type: 'divider' },
                    { label: 'Delete Setting', action: 'delete-setting', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(settingMenu);
    }

    async onActionEditSetting() {
        const app = this.getApp();
        const resp = await app.showModelForm({
            title: `Edit Setting — ${this.model.get('key')}`,
            model: this.model,
            formConfig: SettingForms.edit,
        });
        if (resp) {
            this.render();
        }
    }

    async onActionDeleteSetting() {
        const app = this.getApp();
        const confirmed = await app.confirm({
            title: 'Delete Setting',
            message: `Permanently delete "${this.model.get('key')}"? This cannot be undone.`,
            confirmLabel: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return;

        app.showLoading();
        const resp = await this.model.delete();
        app.hideLoading();
        if (resp && resp.success !== false) {
            app.toast.success('Setting deleted');
            this.emit('deleted', { model: this.model });
        } else {
            app.toast.error('Failed to delete setting');
        }
    }
}

Setting.VIEW_CLASS = SettingView;
export default SettingView;
