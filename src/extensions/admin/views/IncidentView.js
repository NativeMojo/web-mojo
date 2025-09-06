/**
 * IncidentView - Detailed view for an Incident record
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Incident, IncidentForms } from '@core/models/Incident.js';
import Dialog from '@core/views/feedback/Dialog.js';
import IncidentHistoryAdapter from '../adapters/IncidentHistoryAdapter.js';
import ChatView from '@core/views/chat/ChatView.js';

class IncidentView extends View {
    constructor(options = {}) {
        super({
            className: 'incident-view',
            ...options
        });

        this.model = options.model || new Incident(options.data || {});
        this.incidentIcon = this.getIconForIncident(this.model.get('state'));

        this.template = `
            <div class="incident-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 {{incidentIcon.color}}">
                            <i class="bi {{incidentIcon.icon}}"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">Incident #{{model.id}}</h3>
                            <div class="text-muted small">
                                Category: {{model.category|capitalize}}
                            </div>
                            <div class="text-muted small mt-1">
                                Created: {{model.created|datetime}}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-4">
                         <div class="text-end">
                            <div>State: <span class="badge bg-primary">{{model.state|capitalize}}</span></div>
                            <div class="text-muted small mt-1">Priority: {{model.priority}}</div>
                        </div>
                        <div data-container="incident-context-menu"></div>
                    </div>
                </div>

                <!-- Tabs -->
                <div data-container="incident-tabs"></div>
            </div>
        `;
    }

    getIconForIncident(state) {
        const s = state?.toLowerCase();
        if (s === 'resolved' || s === 'closed') return { icon: 'bi-check-circle-fill', color: 'text-success' };
        if (s === 'new' || s === 'opened') return { icon: 'bi-exclamation-triangle-fill', color: 'text-danger' };
        if (s === 'paused' || s === 'ignore') return { icon: 'bi-pause-circle-fill', color: 'text-warning' };
        return { icon: 'bi-shield-exclamation', color: 'text-secondary' };
    }

    async onInit() {
        // Overview Tab
        this.overviewView = new DataView({
            model: this.model,
            className: "p-3",
            columns: 2,
            fields: [
                { name: 'id', label: 'Incident ID' },
                { name: 'state', label: 'State', format: 'badge' },
                { name: 'priority', label: 'Priority' },
                { name: 'category', label: 'Category' },
                { name: 'model_name', label: 'Related Model' },
                { name: 'model_id', label: 'Related Model ID' },
                { name: 'details', label: 'Details', columns: 12, format: 'pre' },
            ]
        });

        // History & Comments Tab
        const adapter = new IncidentHistoryAdapter(this.model.get('id'));
        this.historyView = new ChatView({ adapter });

        const tabs = { 
            'Overview': this.overviewView,
            'History & Comments': this.historyView
        };
        if (this.model.get('metadata') && Object.keys(this.model.get('metadata')).length > 0) {
            this.metadataView = new View({
                model: this.model,
                template: `<pre class="bg-light p-3 border rounded"><code>{{{model.metadata|json}}}</code></pre>`
            });
            tabs['Metadata'] = this.metadataView;
        }

        this.tabView = new TabView({
            containerId: 'incident-tabs',
            tabs: tabs,
            activeTab: 'Overview'
        });
        this.addChild(this.tabView);

        // ContextMenu
        const incidentMenu = new ContextMenu({
            containerId: 'incident-context-menu',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit Incident', action: 'edit-incident', icon: 'bi-pencil' },
                    { label: 'Resolve', action: 'resolve-incident', icon: 'bi-check-circle' },
                    { type: 'divider' },
                    { label: 'Delete Incident', action: 'delete-incident', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(incidentMenu);
    }

    async onActionEditIncident() {
        const resp = await Dialog.showModelForm({
            title: `Edit Incident #${this.model.id}`,
            model: this.model,
            formConfig: IncidentForms.edit,
        });
        if (resp) {
            this.render();
        }
    }
    
    async onActionResolveIncident() {
        await this.model.save({ state: 'resolved' });
        this.render();
        this.emit('incident:updated', { model: this.model });
    }

    async onActionDeleteIncident() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to delete this incident?`,
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (confirmed) {
            const resp = await this.model.destroy();
            if (resp.success) {
                this.emit('incident:deleted', { model: this.model });
            }
        }
    }
}

Incident.VIEW_CLASS = IncidentView;

export default IncidentView;
