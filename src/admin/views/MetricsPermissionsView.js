import View from '../../core/View.js';
import DataView from '../../views/data/DataView.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { MetricsPermission, MetricsForms } from '../../models/Metrics.js';
import Dialog from '../../core/Dialog.js';

class MetricsPermissionsView extends View {
    constructor(options = {}) {
        super({
            className: 'metrics-permissions-view',
            ...options
        });

        this.model = options.model || new MetricsPermission(options.data || {});

        this.template = `
            <div class="container p-3">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h3 class="mb-1">Permissions for {{model.account}}</h3>
                    </div>
                    <div data-container="context-menu"></div>
                </div>
                <div data-container="data-view"></div>
            </div>
        `;
    }

    async onInit() {
        this.dataView = new DataView({
            containerId: 'data-view',
            model: this.model,
            fields: [
                { name: 'view_permissions', label: 'View Permissions', format: 'list|badge' },
                { name: 'write_permissions', label: 'Write Permissions', format: 'list|badge' },
            ]
        });
        this.addChild(this.dataView);

        const contextMenu = new ContextMenu({
            containerId: 'context-menu',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit', action: 'edit', icon: 'bi-pencil' },
                    { label: 'Delete', action: 'delete', icon: 'bi-trash', danger: true },
                ]
            }
        });
        this.addChild(contextMenu);
    }

    async onActionEdit() {
        const resp = await Dialog.showModelForm({
            title: `Edit Permissions for ${this.model.get('account')}`,
            model: this.model,
            formConfig: MetricsForms.edit
        });
        if (resp) {
            this.model.set(resp.data.data);
            this.render();
        }
    }

    async onActionDelete() {
        const confirmed = await Dialog.confirm(`Are you sure you want to delete all permissions for ${this.model.get('account')}?`);
        if (confirmed) {
            await this.model.destroy();
            this.emit('deleted', this.model);
        }
    }
}

MetricsPermission.VIEW_CLASS = MetricsPermissionsView;

export default MetricsPermissionsView;
