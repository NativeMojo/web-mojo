/**
 * EventView - Detailed view for an IncidentEvent record
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import StackTraceView from '@core/views/data/StackTraceView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Modal from '@core/views/feedback/Modal.js';
import { Incident, IncidentEvent } from '@ext/admin/models/Incident.js';
import { User, UserDevice, UserDeviceLocation } from '@core/models/User.js';
import { GeoLocatedIP } from '@core/models/System.js';
import { Member } from '@core/models/Member.js';
import { Ticket } from '@ext/admin/models/Tickets.js';
import { Job } from '@ext/admin/models/Job.js';
import { Log } from '@core/models/Log.js';
import { ApiKey } from '@core/models/ApiKey.js';
import IncidentView from './IncidentView.js';

/**
 * Map of model_name strings (as returned by the API) to Model classes.
 * Used to resolve the related model for "View Related Model" actions.
 */
const MODEL_REGISTRY = {
    user: User,
    userdevice: UserDevice,
    userdevicelocation: UserDeviceLocation,
    geolocatedip: GeoLocatedIP,
    member: Member,
    incident: Incident,
    incidentevent: IncidentEvent,
    ticket: Ticket,
    job: Job,
    log: Log,
    apikey: ApiKey,
};

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

        const tabs = { 'Overview': this.overviewView };
        
        const metadata = this.model.get('metadata') || {};
        
        // Add Stack Trace tab if present
        if (metadata.stack_trace) {
            this.stackTraceView = new StackTraceView({
                stackTrace: metadata.stack_trace
            });
            tabs['Stack Trace'] = this.stackTraceView;
        }
        
        // Add Metadata tab if there's metadata
        if (Object.keys(metadata).length > 0) {
            this.metadataView = new View({
                model: this.model,
                template: `<pre class="bg-light p-3 border rounded"><code>{{{model.metadata|json}}}</code></pre>`
            });
            tabs['Metadata'] = this.metadataView;
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
        const incidentId = this.model.get('incident') || this.model.get('incident_id');
        if (!incidentId) {
            this.getApp()?.toast?.warning('No incident linked to this event');
            return true;
        }
        const incident = new Incident({ id: incidentId });
        const view = new IncidentView({ model: incident });
        await Modal.dialog({
            title: 'Incident Details',
            body: view,
            size: 'xl',
            scrollable: true,
            header: false,
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
    }

    async onActionViewModel() {
        const modelName = this.model.get('model_name') || this.model.get('model_class');
        const objectId = this.model.get('model_id') || this.model.get('object_id');
        if (!modelName || !objectId) {
            this.getApp()?.toast?.warning('No related model linked to this event');
            return true;
        }

        const key = modelName.toLowerCase().replace(/[^a-z]/g, '');
        const ModelClass = MODEL_REGISTRY[key];

        if (!ModelClass) {
            this.getApp()?.toast?.warning(`Unknown model type: ${modelName}`);
            return true;
        }

        if (!ModelClass.VIEW_CLASS) {
            this.getApp()?.toast?.warning(`No detail view available for ${modelName}`);
            return true;
        }

        await Modal.showModelById(ModelClass, objectId);
    }

    async onActionDeleteEvent() {
        const confirmed = await Modal.confirm(
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
