/**
 * EventView - Detailed view for an IncidentEvent record.
 *
 * Mustache-templated; uses DataFormatter pipes for every date/badge field.
 * The Overview tab is a `DataView`; conditional Stack Trace + Metadata tabs
 * appear when the event metadata supports them. No hand-rolled lists.
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import StackTraceView from '@core/views/data/StackTraceView.js';
import KnownFieldsCard from '@core/views/data/KnownFieldsCard.js';
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

/** Map a numeric log level to a Bootstrap-icon + tone class for the header */
function _iconForLevel(level) {
    const n = Number(level) || 0;
    if (n >= 40) return { icon: 'bi-exclamation-octagon-fill', color: 'text-danger' };
    if (n >= 30) return { icon: 'bi-exclamation-triangle-fill', color: 'text-warning' };
    if (n >= 20) return { icon: 'bi-info-circle-fill',         color: 'text-info' };
    return         { icon: 'bi-bell-fill',                     color: 'text-secondary' };
}

class EventView extends View {
    constructor(options = {}) {
        super({
            className: 'event-view',
            template: `
                <div class="event-view-container">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div class="d-flex align-items-center gap-3">
                            <div class="fs-1 {{eventIcon.color}}">
                                <i class="bi {{eventIcon.icon}}"></i>
                            </div>
                            <div>
                                <h3 class="mb-1">{{model.title|default('System Event')}}</h3>
                                <div class="text-secondary small">
                                    Category: {{model.category|capitalize|default('—')}}
                                </div>
                                <div class="text-secondary small mt-1">
                                    {{{model.created|epoch|datetime}}} from {{model.source_ip|default('Unknown IP')}}
                                </div>
                            </div>
                        </div>
                        <div data-container="event-context-menu"></div>
                    </div>
                    <div data-container="event-tabs"></div>
                </div>
            `,
            ...options
        });

        this.model = options.model || new IncidentEvent(options.data || {});
        this.eventIcon = _iconForLevel(this.model.get('level'));
    }

    async onInit() {
        // Overview Tab — DataView with framework formatters; no inline style.
        this.overviewView = new DataView({
            model: this.model,
            columns: 2,
            fields: [
                { name: 'id', label: 'Event ID' },
                { name: 'level', label: 'Level' },
                { name: 'hostname', label: 'Hostname' },
                { name: 'incident', label: 'Incident ID' },
                { name: 'model_name', label: 'Related Model' },
                { name: 'model_id', label: 'Related Model ID' },
                { name: 'created', label: 'Created', formatter: 'epoch|datetime' },
                { name: 'details', label: 'Details', columns: 12 }
            ]
        });

        const tabs = { 'Overview': this.overviewView };
        const metadata = this.model.get('metadata') || {};

        if (metadata.stack_trace) {
            this.stackTraceView = new StackTraceView({
                stackTrace: metadata.stack_trace
            });
            tabs['Stack Trace'] = this.stackTraceView;
        }

        if (Object.keys(metadata).length > 0) {
            // Metadata uses KnownFieldsCard so the tab matches the
            // IncidentView Metadata pattern and dark theme works without
            // hardcoded surface colors.
            this.metadataView = new KnownFieldsCard({
                model: this.model,
                data: (m) => m.get('metadata') || {},
                knownKeys: [
                    { key: 'source_ip',     label: 'Source IP' },
                    { key: 'hostname',      label: 'Hostname' },
                    { key: 'user_agent',    label: 'User agent' },
                    { key: 'http_url',      label: 'URL' },
                    { key: 'http_method',   label: 'HTTP method' },
                    { key: 'http_status',   label: 'HTTP status' },
                    { key: 'request_path',  label: 'Request path' },
                    { key: 'error_class',   label: 'Error class' },
                    { key: 'error_message', label: 'Error message' }
                ],
                rawLabel: 'Raw metadata'
            });
            tabs['Metadata'] = this.metadataView;
        }

        this.tabView = new TabView({
            containerId: 'event-tabs',
            tabs: tabs,
            activeTab: 'Overview'
        });
        this.addChild(this.tabView);

        const menuItems = [
            { label: 'View Incident', action: 'view-incident', icon: 'bi-shield-exclamation', disabled: !this.model.get('incident') },
            { label: 'View Related Model', action: 'view-model', icon: 'bi-box-arrow-up-right', disabled: !this.model.get('model_id') },
            { type: 'divider' },
            { label: 'Delete Event', action: 'delete-event', icon: 'bi-trash', danger: true }
        ];

        const eventMenu = new ContextMenu({
            containerId: 'event-context-menu',
            className: 'context-menu-view header-menu-absolute',
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
        await Modal.detail(view);
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
            'Are you sure you want to delete this event? This action cannot be undone.',
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
IncidentEvent.MODEL_REF = 'incident.Event';

export default EventView;
