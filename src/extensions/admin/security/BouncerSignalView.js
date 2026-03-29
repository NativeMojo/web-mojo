/**
 * BouncerSignalView - Signal assessment detail view
 *
 * Shows full signal payload including raw_signals, server_signals,
 * linked device and GeoIP information for a bouncer assessment.
 */

import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';

export default class BouncerSignalView extends View {
    constructor(options = {}) {
        super({
            className: 'bouncer-signal-view',
            ...options
        });

        this.template = `
            <div class="d-flex justify-content-between align-items-start mb-4">
                <div class="d-flex align-items-center gap-3">
                    <div class="avatar-placeholder rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 72px; height: 72px;">
                        <i class="bi bi-activity text-secondary" style="font-size: 36px;"></i>
                    </div>
                    <div>
                        <h3 class="mb-1">Signal Assessment</h3>
                        <div class="text-muted small">
                            <span>IP: <code>{{model.ip_address}}</code></span>
                            <span class="mx-2">|</span>
                            <span>Stage: {{model.stage}}</span>
                            <span class="mx-2">|</span>
                            <span>Page: {{model.page_type|default('—')}}</span>
                        </div>
                        <div class="mt-1">
                            <span class="badge {{decisionBadge}} me-1">{{model.decision|uppercase}}</span>
                            <span class="text-muted small">Risk Score: <strong>{{model.risk_score}}</strong></span>
                        </div>
                    </div>
                </div>
                <div data-container="signal-context-menu"></div>
            </div>
            <div data-container="signal-tabs"></div>
        `;
    }

    get decisionBadge() {
        const classes = { allow: 'bg-success', monitor: 'bg-warning', block: 'bg-danger' };
        return classes[this.model?.get('decision')] || 'bg-secondary';
    }

    async onInit() {
        await this.model.fetch({ params: { graph: 'detail' } });

        const overviewView = new View({
            model: this.model,
            template: `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card border-0 bg-light mb-3">
                            <div class="card-body">
                                <h6 class="fw-bold mb-3">Assessment</h6>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Decision</label><div><span class="badge {{decisionBadge}}">{{model.decision|uppercase}}</span></div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Risk Score</label><div>{{model.risk_score}}</div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Stage</label><div>{{model.stage}}</div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Page Type</label><div>{{model.page_type|default('—')}}</div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">IP Address</label><div><code>{{model.ip_address}}</code></div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">MUID</label><div><code>{{model.muid|default('—')}}</code></div></div>
                                <div class="mb-2"><label class="form-label text-muted small fw-bold">Created</label><div>{{model.created|datetime}}</div></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 bg-light mb-3">
                            <div class="card-body">
                                <h6 class="fw-bold mb-3">Triggered Signals</h6>
                                {{#model.triggered_signals.length}}
                                    <div class="d-flex flex-wrap gap-1">
                                        {{#model.triggered_signals}}
                                            <span class="badge bg-warning text-dark">{{.}}</span>
                                        {{/model.triggered_signals}}
                                    </div>
                                {{/model.triggered_signals.length}}
                                {{^model.triggered_signals.length}}
                                    <span class="text-muted">No signals triggered</span>
                                {{/model.triggered_signals.length}}
                            </div>
                        </div>
                    </div>
                </div>
            `
        });

        const rawSignalsView = new View({
            model: this.model,
            template: `
                <div class="card border-0 bg-light">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3">Raw Signals (Client)</h6>
                        <pre class="bg-white p-3 rounded border"><code>{{{model.raw_signals|json}}}</code></pre>
                    </div>
                </div>
            `
        });

        const serverSignalsView = new View({
            model: this.model,
            template: `
                <div class="card border-0 bg-light">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3">Server Signals</h6>
                        <pre class="bg-white p-3 rounded border"><code>{{{model.server_signals|json}}}</code></pre>
                    </div>
                </div>
            `
        });

        this.tabView = new TabView({
            tabs: {
                'Overview': overviewView,
                'Raw Signals': rawSignalsView,
                'Server Signals': serverSignalsView,
            },
            activeTab: 'Overview',
            containerId: 'signal-tabs'
        });
        this.addChild(this.tabView);

        const contextMenu = new ContextMenu({
            containerId: 'signal-context-menu',
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
