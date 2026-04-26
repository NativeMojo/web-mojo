/**
 * BouncerDeviceView - Device reputation detail view
 *
 * Shows device details with risk tier, linked MUIDs,
 * and tabs for related signals and incidents.
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { BouncerSignalList } from '@ext/admin/models/Bouncer.js';
import { IncidentList } from '@ext/admin/models/Incident.js';

export default class BouncerDeviceView extends View {
    constructor(options = {}) {
        super({
            className: 'bouncer-device-view',
            ...options
        });

        this.template = `
            <div class="d-flex justify-content-between align-items-start mb-4">
                <div class="d-flex align-items-center gap-3">
                    <div class="avatar-placeholder rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 72px; height: 72px;">
                        <i class="bi bi-fingerprint text-secondary" style="font-size: 36px;"></i>
                    </div>
                    <div>
                        <h3 class="mb-1">Device</h3>
                        <div class="text-muted small">
                            <span>MUID: <code>{{model.muid}}</code></span>
                            {{#model.duid}}
                                <span class="mx-2">|</span>
                                <span>DUID: <code>{{model.duid|truncate_middle(16)}}</code></span>
                            {{/model.duid}}
                        </div>
                        <div class="mt-1">
                            <span class="badge {{riskBadge}} me-1">{{model.risk_tier|uppercase|default('UNKNOWN')}}</span>
                            <span class="text-muted small">
                                {{model.event_count}} events &middot; {{model.block_count}} blocks
                            </span>
                        </div>
                    </div>
                </div>
                <div data-container="device-context-menu"></div>
            </div>
            <div data-container="device-tabs"></div>
        `;
    }

    get riskBadge() {
        const classes = {
            blocked: 'bg-danger', high: 'bg-danger',
            medium: 'bg-warning', low: 'bg-success', unknown: 'bg-secondary'
        };
        return classes[this.model?.get('risk_tier')] || 'bg-secondary';
    }

    async onInit() {
        await this.model.fetch({ params: { graph: 'detail' } });

        // Overview tab
        const overviewView = new View({
            model: this.model,
            template: `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card border-0 bg-light mb-3">
                            <div class="card-body">
                                <h6 class="fw-bold mb-3">Device Info</h6>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">MUID</label><div><code>{{model.muid}}</code></div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">DUID</label><div><code>{{model.duid|default('—')}}</code></div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Fingerprint ID</label><div><code>{{model.fingerprint_id|default('—')}}</code></div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Risk Tier</label><div><span class="badge {{riskBadge}}">{{model.risk_tier|uppercase|default('UNKNOWN')}}</span></div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Last Seen IP</label><div><code>{{model.last_seen_ip|default('—')}}</code></div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Last Seen</label><div>{{model.last_seen|datetime|default('—')}}</div></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 bg-light mb-3">
                            <div class="card-body">
                                <h6 class="fw-bold mb-3">Activity</h6>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Event Count</label><div>{{model.event_count}}</div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Block Count</label><div>{{model.block_count}}</div></div>
                                <h6 class="fw-bold mb-2 mt-3">Linked MUIDs</h6>
                                {{#model.linked_muids.length}}
                                    <div class="d-flex flex-wrap gap-1">
                                        {{#model.linked_muids}}
                                            <code class="badge bg-light text-dark border">{{.}}</code>
                                        {{/model.linked_muids}}
                                    </div>
                                {{/model.linked_muids.length}}
                                {{^model.linked_muids.length}}
                                    <span class="text-muted">No linked devices</span>
                                {{/model.linked_muids.length}}
                            </div>
                        </div>
                    </div>
                </div>
            `
        });

        // Signals tab
        const signalsTable = new TableView({
            Collection: BouncerSignalList,
            collectionParams: {
                size: 10,
                sort: '-created',
                muid: this.model.get('muid')
            },
            columns: [
                { key: 'created', label: 'Time', formatter: 'relative' },
                { key: 'ip_address', label: 'IP', template: '<code>{{model.ip_address}}</code>' },
                {
                    key: 'decision', label: 'Decision',
                    formatter: (v) => {
                        const cls = { allow: 'bg-success', monitor: 'bg-warning', block: 'bg-danger' };
                        return `<span class="badge ${cls[v] || 'bg-secondary'}">${(v || '—').toUpperCase()}</span>`;
                    }
                },
                { key: 'risk_score', label: 'Risk' },
                { key: 'page_type', label: 'Page' }
            ],
            searchable: true,
            paginated: true,
            tableOptions: { hover: true, size: 'sm' }
        });

        // Incidents tab
        const incidentsTable = new TableView({
            Collection: IncidentList,
            collectionParams: {
                size: 10,
                sort: '-created',
                category__startswith: 'security:bouncer',
                search: this.model.get('muid')
            },
            columns: [
                { key: 'created', label: 'Created', formatter: 'epoch|datetime' },
                { key: 'status', label: 'Status' },
                { key: 'category', label: 'Category' },
                { key: 'title', label: 'Title', formatter: 'truncate(60)' }
            ],
            searchable: true,
            paginated: true,
            tableOptions: { hover: true, size: 'sm' }
        });

        this.tabView = new TabView({
            tabs: {
                'Overview': overviewView,
                'Signals': signalsTable,
                'Incidents': incidentsTable,
            },
            activeTab: 'Overview',
            containerId: 'device-tabs'
        });
        this.addChild(this.tabView);

        const contextMenu = new ContextMenu({
            containerId: 'device-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Refresh', action: 'refresh', icon: 'bi-arrow-clockwise' },
                ]
            }
        });
        this.addChild(contextMenu);
    }

    async onActionRefresh() {
        await this.model.fetch({ params: { graph: 'detail' } });
    }
}
