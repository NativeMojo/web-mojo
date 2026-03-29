/**
 * IncidentView - Detailed view for an Incident record
 *
 * SideNavView layout for security investigation workflow:
 * Overview (with GeoIP summary), Events, History, Forensics (Stack Trace, Metadata)
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import StackTraceView from '@core/views/data/StackTraceView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Incident, IncidentForms, IncidentEventList } from '@core/models/Incident.js';
import { GeoLocatedIP } from '@core/models/System.js';
import Dialog from '@core/views/feedback/Dialog.js';
import GeoIPView from '../account/devices/GeoIPView.js';
import IncidentHistoryAdapter from './adapters/IncidentHistoryAdapter.js';
import ChatView from '@core/views/chat/ChatView.js';


// ── GeoIP Summary Card ──────────────────────────────────

class GeoIPSummaryCard extends View {
    constructor(options = {}) {
        super({
            className: 'geoip-summary-card',
            ...options
        });

        this.sourceIP = options.sourceIP;
        this.geoData = null;
        this.threatBadgeClass = 'bg-secondary';
        this.threatLevel = 'Unknown';

        this.template = `
            {{#geoData}}
            <div class="card shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="d-flex align-items-center gap-3">
                            <div class="text-primary">
                                <i class="bi bi-globe-americas fs-3"></i>
                            </div>
                            <div>
                                <div class="mb-1">
                                    <a role="button" class="fw-semibold font-monospace text-decoration-none" data-action="view-geoip">{{sourceIP}}</a>
                                </div>
                                <div class="text-muted small">
                                    {{geoData.city|default('Unknown')}}, {{geoData.country_name|default('Unknown')}}
                                </div>
                                <div class="text-muted small">
                                    ISP: {{geoData.isp|default('Unknown')}}
                                </div>
                            </div>
                        </div>
                        <div class="text-end">
                            <span class="badge {{threatBadgeClass}}">{{threatLevel}}</span>
                            {{#geoData.risk_score}}
                            <div class="text-muted small mt-1">Risk: {{geoData.risk_score}}</div>
                            {{/geoData.risk_score}}
                            <div class="d-flex gap-1 mt-1 justify-content-end">
                                {{#geoData.is_tor|bool}}<span class="badge bg-danger-subtle text-danger" title="TOR">TOR</span>{{/geoData.is_tor|bool}}
                                {{#geoData.is_vpn|bool}}<span class="badge bg-warning-subtle text-warning" title="VPN">VPN</span>{{/geoData.is_vpn|bool}}
                                {{#geoData.is_proxy|bool}}<span class="badge bg-info-subtle text-info" title="Proxy">Proxy</span>{{/geoData.is_proxy|bool}}
                                {{#geoData.is_datacenter|bool}}<span class="badge bg-secondary-subtle text-secondary" title="Datacenter">DC</span>{{/geoData.is_datacenter|bool}}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {{/geoData}}
            {{^geoData}}
            <div class="card shadow-sm">
                <div class="card-body text-muted text-center py-3">
                    <i class="bi bi-globe me-2"></i>No GeoIP data available for {{sourceIP}}
                </div>
            </div>
            {{/geoData}}
        `;
    }

    async onInit() {
        if (!this.sourceIP) return;
        try {
            const model = await GeoLocatedIP.lookup(this.sourceIP);
            if (model) {
                this.geoData = model.attributes;
                this.threatLevel = (this.geoData.threat_level || 'unknown').toUpperCase();
                this.threatBadgeClass = this._getThreatBadgeClass(this.geoData.threat_level);
            }
        } catch (e) {
            // GeoIP lookup failed silently — card will show "no data" state
        }
    }

    _getThreatBadgeClass(level) {
        const l = (level || '').toLowerCase();
        if (l === 'high' || l === 'critical') return 'bg-danger';
        if (l === 'medium') return 'bg-warning';
        if (l === 'low') return 'bg-success';
        return 'bg-secondary';
    }

    async onActionViewGeoip() {
        await GeoIPView.show(this.sourceIP);
    }
}


// ── Overview Section ─────────────────────────────────────

class IncidentOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'incident-overview-section p-3',
            template: `
                <div data-container="overview-data" class="mb-3"></div>
                <div data-container="geoip-summary"></div>
            `,
            ...options
        });
    }

    async onInit() {
        // Core incident fields
        this.dataView = new DataView({
            containerId: 'overview-data',
            model: this.model,
            columns: 2,
            fields: [
                { name: 'id', label: 'Incident ID' },
                { name: 'status', label: 'Status', format: 'badge' },
                { name: 'priority', label: 'Priority' },
                { name: 'category', label: 'Category' },
                { name: 'model_name', label: 'Related Model' },
                { name: 'model_id', label: 'Related Model ID' },
                { name: 'details', label: 'Details', columns: 12, format: 'pre' },
            ]
        });
        this.addChild(this.dataView);

        // GeoIP summary — look for source_ip in incident metadata or first event
        const sourceIP = await this._resolveSourceIP();
        if (sourceIP) {
            this.geoipCard = new GeoIPSummaryCard({
                containerId: 'geoip-summary',
                sourceIP
            });
            this.addChild(this.geoipCard);
        }
    }

    async _resolveSourceIP() {
        // Check incident metadata first
        const metadata = this.model.get('metadata') || {};
        if (metadata.source_ip) return metadata.source_ip;
        if (metadata.ip) return metadata.ip;
        if (metadata.ip_address) return metadata.ip_address;

        // Fall back to first event's source_ip
        try {
            const events = new IncidentEventList({
                params: { incident: this.model.get('id'), size: 1, sort: '-created' }
            });
            await events.fetch();
            const firstEvent = events.first();
            if (firstEvent) {
                return firstEvent.get('source_ip') || firstEvent.get('ip_address') || null;
            }
        } catch (e) {
            // Events fetch failed — no IP available
        }
        return null;
    }
}


// ── IncidentView ─────────────────────────────────────────

class IncidentView extends View {
    constructor(options = {}) {
        super({
            className: 'incident-view',
            ...options
        });

        this.model = options.model || new Incident(options.data || {});
        this.incidentIcon = this.getIconForIncident(this.model.get('status'));

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
                            <div>Status: <span class="badge bg-primary">{{model.status|capitalize}}</span></div>
                            <div class="text-muted small mt-1">Priority: {{model.priority}}</div>
                        </div>
                        <div data-container="incident-context-menu"></div>
                    </div>
                </div>

                <!-- SideNav -->
                <div data-container="incident-sidenav"></div>
            </div>
        `;
    }

    getIconForIncident(status) {
        const s = (status || '').toLowerCase();
        if (s === 'resolved' || s === 'closed') return { icon: 'bi-check-circle-fill', color: 'text-success' };
        if (s === 'open' || s === 'investigating') return { icon: 'bi-exclamation-triangle-fill', color: 'text-danger' };
        if (s === 'paused' || s === 'ignored') return { icon: 'bi-pause-circle-fill', color: 'text-warning' };
        return { icon: 'bi-shield-exclamation', color: 'text-secondary' };
    }

    async onInit() {
        // Overview section — incident details + GeoIP summary
        const overviewSection = new IncidentOverviewSection({ model: this.model });

        // Events section
        const eventsCollection = new IncidentEventList({
            params: { incident: this.model.get('id') }
        });
        const eventsSection = new TableView({
            collection: eventsCollection,
            hideActivePillNames: ['incident'],
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true },
                { key: 'created', label: 'Date', formatter: 'datetime', sortable: true, width: '180px' },
                { key: 'source_ip', label: 'Source IP', sortable: true, width: '130px' },
                { key: 'category', label: 'Category', formatter: 'badge', sortable: true },
                { key: 'title', label: 'Title', sortable: true },
                { key: 'level', label: 'Level', sortable: true, width: '80px' },
            ],
            showAdd: false,
            actions: ['view'],
            paginated: true,
            size: 10
        });

        // History section
        const adapter = new IncidentHistoryAdapter(this.model.get('id'));
        const historySection = new ChatView({ adapter });

        // Build sections array
        const sections = [
            { key: 'Overview',  label: 'Overview',  icon: 'bi-shield-exclamation', view: overviewSection },
            { key: 'Events',    label: 'Events',    icon: 'bi-list-ul',            view: eventsSection },
            { key: 'History',   label: 'History',    icon: 'bi-chat-left-text',     view: historySection },
        ];

        // Conditional forensics sections
        const metadata = this.model.get('metadata') || {};
        const hasStackTrace = !!metadata.stack_trace;
        const hasMetadata = Object.keys(metadata).length > 0;

        if (hasStackTrace || hasMetadata) {
            sections.push({ type: 'divider', label: 'Forensics' });
        }

        if (hasStackTrace) {
            const stackTraceSection = new StackTraceView({
                stackTrace: metadata.stack_trace
            });
            sections.push({ key: 'Stack Trace', label: 'Stack Trace', icon: 'bi-code-square', view: stackTraceSection });
        }

        if (hasMetadata) {
            const metadataSection = new View({
                model: this.model,
                template: `<pre class="bg-light p-3 border rounded"><code>{{{model.metadata|json}}}</code></pre>`
            });
            sections.push({ key: 'Metadata', label: 'Metadata', icon: 'bi-braces', view: metadataSection });
        }

        // SideNavView
        this.sideNav = new SideNavView({
            containerId: 'incident-sidenav',
            sections,
            activeSection: 'Overview'
        });
        this.addChild(this.sideNav);

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
        await this.model.save({ status: 'resolved' });
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
