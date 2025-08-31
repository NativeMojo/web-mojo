/**
 * EventView - Detailed view for an IncidentEvent record
 */

import View from '../../core/View.js';
import TabView from '../../views/navigation/TabView.js';
import DataView from '../../views/data/DataView.js';
import ContextMenu from '../../views/feedback/ContextMenu.js';
import { IncidentEvent } from '../../models/Incident.js';
import Dialog from '../../core/Dialog.js';

class EventView extends View {
    constructor(options = {}) {
        super({
            className: 'event-view',
            ...options
        });

        this.model = options.model || new IncidentEvent(options.data || {});
        this.eventIcon = this.getIconForEvent(this.model.get('level'));

        this.template = `
            <div class="event-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 {{eventIcon.color}}">
                            <i class="bi {{eventIcon.icon}}"></i>
                        </div>
                        <div>
                            <h3 class="mb-1">{{model.title|default('System Event')}}</h3>
                            <div class="text-muted small">
                                Category: {{model.category|capitalize}}
                            </div>
                            <div class="text-muted small mt-1">
                                {{model.created|datetime}} from {{model.source_ip|default('Unknown IP')}}
                            </div>
                        </div>
                    </div>
                    <div data-container="event-context-menu"></div>
                </div>

                <!-- Body -->
                <div data-container="event-tabs"></div>
            </div>
        `;
    }

    getIconForEvent(level) {
        if (level >= 40) return { icon: 'bi-exclamation-octagon-fill', color: 'text-danger' }; // Error
        if (level >= 30) return { icon: 'bi-exclamation-triangle-fill', color: 'text-warning' }; // Warning
        if (level >= 20) return { icon: 'bi-info-circle-fill', color: 'text-info' }; // Info
        return { icon: 'bi-bell-fill', color: 'text-secondary' }; // Debug/Default
    }

    async onInit() {
        // Overview Tab
        this.overviewView = new DataView({
            model: this.model,
            className: "p-3",
            columns: 2,
            fields: [
                { name: 'id', label: 'Event ID' },
                { name: 'level', label: 'Level' },
                { name: 'hostname', label: 'Hostname' },
                { name: 'incident', label: 'Incident ID' },
                { name: 'model_name', label: 'Related Model' },
                { name: 'model_id', label: 'Related Model ID' },
                { name: 'details', label: 'Details', columns: 12 },
            ]
        });

        // Metadata Tab
        this.metadataView = new View({
            model: this.model,
            template: `<pre class="bg-light p-3 border rounded"><code>{{{model.metadata|json}}}</code></pre>`
        });

        const tabs = { 'Overview': this.overviewView };
        if (this.model.get('metadata') && Object.keys(this.model.get('metadata')).length > 0) {
            tabs['Metadata'] = this.metadataView;
        }

        if (this.model.get('metadata.stack_trace')) {
            this.stackTraceView = new View({
                model: this.model,
                template: `<pre class="bg-dark text-white p-3 border rounded">{{{model.metadata.stack_trace}}}</pre>`
            });
            tabs['Stack Trace'] = this.stackTraceView;
        }

        this.tabView = new TabView({
            containerId: 'event-tabs',
            tabs: tabs,
            activeTab: 'Overview'
        });
        this.addChild(this.tabView);

        // ContextMenu
        const menuItems = [
            { label: 'View Incident', action: 'view-incident', icon: 'bi-shield-exclamation', disabled: !this.model.get('incident') },
            { label: 'View Related Model', action: 'view-model', icon: 'bi-box-arrow-up-right', disabled: !this.model.get('model_id') },
            { type: 'divider' },
            { label: 'Delete Event', action: 'delete-event', icon: 'bi-trash', danger: true }
        ];

        const eventMenu = new ContextMenu({
            containerId: 'event-context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: menuItems
            }
        });
        this.addChild(eventMenu);
    }

    async onActionViewIncident() {
        console.log("TODO: View incident", this.model.get('incident'));
    }

    async onActionViewModel() {
        console.log("TODO: View model", this.model.get('model_name'), this.model.get('model_id'));
    }

    async onActionDeleteEvent() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to delete this event? This action cannot be undone.`,
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (confirmed) {
            const resp = await this.model.destroy();
            if (resp.success) {
                this.emit('event:deleted', { model: this.model });
            }
        }
    }
}

IncidentEvent.VIEW_CLASS = EventView;

export default EventView;
