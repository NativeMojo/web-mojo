/**
 * IncidentView - Rich security operations view for an Incident record
 *
 * SideNavView layout for security investigation workflow:
 * Overview (summary + GeoIP + quick actions), Events, Rule Engine,
 * Tickets, History, Forensics (Stack Trace, Metadata)
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import StackTraceView from '@core/views/data/StackTraceView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import { Incident, IncidentForms, IncidentList, IncidentEventList, RuleSet, RuleSetForms, Rule, RuleList, BundleByOptions, MatchByOptions } from '@core/models/Incident.js';
import { GeoLocatedIP } from '@core/models/System.js';
import { Ticket, TicketList, TicketForms } from '@core/models/Tickets.js';
import Dialog from '@core/views/feedback/Dialog.js';
import GeoIPView from '../account/devices/GeoIPView.js';
import RuleSetView from './RuleSetView.js';
import IncidentHistoryAdapter from './adapters/IncidentHistoryAdapter.js';
import ChatView from '@core/views/chat/ChatView.js';


// ── Status & Priority Helpers ──────────────────────────────

const STATUS_CONFIG = {
    new:           { badge: 'bg-info',      icon: 'bi-bell-fill',                label: 'New',           help: 'Unhandled — needs triage by human or LLM agent' },
    open:          { badge: 'bg-primary',   icon: 'bi-folder2-open',             label: 'Open',          help: 'Claimed by an operator for investigation' },
    investigating: { badge: 'bg-warning text-dark', icon: 'bi-search',           label: 'Investigating', help: 'Actively being investigated (human or LLM)' },
    paused:        { badge: 'bg-secondary', icon: 'bi-pause-circle-fill',        label: 'Paused',        help: 'On hold — waiting for external input' },
    resolved:      { badge: 'bg-success',   icon: 'bi-check-circle-fill',        label: 'Resolved',      help: 'Root cause addressed, no further action needed' },
    closed:        { badge: 'bg-dark',      icon: 'bi-x-circle-fill',            label: 'Closed',        help: 'Closed — archived for record keeping' },
    ignored:       { badge: 'bg-secondary',  icon: 'bi-eye-slash-fill',          label: 'Ignored',       help: 'Noise — review periodically to tune rules' },
    pending:       { badge: 'bg-light text-dark border', icon: 'bi-hourglass-split', label: 'Pending', help: 'Below trigger threshold — accumulating events' },
};

function getStatusConfig(status) {
    return STATUS_CONFIG[(status || '').toLowerCase()] || STATUS_CONFIG.new;
}

function getPriorityConfig(priority) {
    const p = parseInt(priority) || 5;
    if (p >= 9)  return { color: 'text-white', bg: 'bg-danger',  label: 'Critical' };
    if (p >= 7)  return { color: 'text-white', bg: 'bg-danger',  label: 'High' };
    if (p >= 5)  return { color: 'text-dark',  bg: 'bg-warning', label: 'Medium' };
    if (p >= 3)  return { color: 'text-white', bg: 'bg-info',    label: 'Low' };
    return { color: 'text-white', bg: 'bg-secondary', label: 'Info' };
}

function getHeaderIcon(status) {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'closed') return { icon: 'bi-check-circle-fill', color: 'text-success' };
    if (s === 'open' || s === 'investigating') return { icon: 'bi-exclamation-triangle-fill', color: 'text-danger' };
    if (s === 'new') return { icon: 'bi-bell-fill', color: 'text-info' };
    if (s === 'paused' || s === 'ignored') return { icon: 'bi-pause-circle-fill', color: 'text-warning' };
    return { icon: 'bi-shield-exclamation', color: 'text-secondary' };
}


// ── GeoIP Summary Card (Enhanced) ──────────────────────────

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
        this.isBlocked = false;
        this.isWhitelisted = false;
        this.blockedReason = '';
        this.geoModel = null;

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
                                    {{#isBlocked|bool}}
                                        <span class="badge bg-danger ms-2" data-bs-toggle="tooltip" title="{{blockedReason}}"><i class="bi bi-slash-circle me-1"></i>Blocked</span>
                                    {{/isBlocked|bool}}
                                    {{#isWhitelisted|bool}}
                                        <span class="badge bg-success ms-2"><i class="bi bi-check-circle me-1"></i>Whitelisted</span>
                                    {{/isWhitelisted|bool}}
                                </div>
                                <div class="text-muted small">
                                    {{geoData.city|default('Unknown')}}, {{geoData.country_name|default('Unknown')}}
                                    {{#geoData.country_code}}
                                        <span class="text-muted">({{geoData.country_code}})</span>
                                    {{/geoData.country_code}}
                                </div>
                                <div class="text-muted small">
                                    {{geoData.isp|default('Unknown ISP')}}
                                    {{#geoData.asn}} · {{geoData.asn}}{{/geoData.asn}}
                                    {{#geoData.connection_type}} · {{geoData.connection_type}}{{/geoData.connection_type}}
                                </div>
                            </div>
                        </div>
                        <div class="text-end">
                            <span class="badge {{threatBadgeClass}}">{{threatLevel}}</span>
                            {{#geoData.risk_score}}
                            <div class="text-muted small mt-1">Risk Score: {{geoData.risk_score}}</div>
                            {{/geoData.risk_score}}
                            <div class="d-flex gap-1 mt-1 justify-content-end">
                                {{#geoData.is_tor|bool}}<span class="badge bg-danger-subtle text-danger" title="TOR Exit Node">TOR</span>{{/geoData.is_tor|bool}}
                                {{#geoData.is_vpn|bool}}<span class="badge bg-warning-subtle text-warning" title="VPN Detected">VPN</span>{{/geoData.is_vpn|bool}}
                                {{#geoData.is_proxy|bool}}<span class="badge bg-info-subtle text-info" title="Proxy">Proxy</span>{{/geoData.is_proxy|bool}}
                                {{#geoData.is_datacenter|bool}}<span class="badge bg-secondary-subtle text-secondary" title="Datacenter IP">DC</span>{{/geoData.is_datacenter|bool}}
                                {{#geoData.is_known_attacker|bool}}<span class="badge bg-danger" title="Known Attacker">Attacker</span>{{/geoData.is_known_attacker|bool}}
                                {{#geoData.is_known_abuser|bool}}<span class="badge bg-danger-subtle text-danger" title="Known Abuser">Abuser</span>{{/geoData.is_known_abuser|bool}}
                            </div>
                        </div>
                    </div>
                    <!-- Inline actions -->
                    <div class="mt-3 pt-2 border-top d-flex gap-2">
                        {{^isBlocked|bool}}
                            <button class="btn btn-outline-danger btn-sm" data-action="block-ip">
                                <i class="bi bi-slash-circle me-1"></i>Block IP
                            </button>
                        {{/isBlocked|bool}}
                        {{#isBlocked|bool}}
                            <button class="btn btn-outline-success btn-sm" data-action="unblock-ip">
                                <i class="bi bi-unlock me-1"></i>Unblock IP
                            </button>
                        {{/isBlocked|bool}}
                        {{^isWhitelisted|bool}}
                            <button class="btn btn-outline-primary btn-sm" data-action="whitelist-ip">
                                <i class="bi bi-check-circle me-1"></i>Whitelist
                            </button>
                        {{/isWhitelisted|bool}}
                        <button class="btn btn-outline-secondary btn-sm" data-action="view-geoip">
                            <i class="bi bi-box-arrow-up-right me-1"></i>Full GeoIP Record
                        </button>
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
            this.geoModel = await GeoLocatedIP.lookup(this.sourceIP);
            if (this.geoModel) {
                this.geoData = this.geoModel.attributes;
                this.threatLevel = (this.geoData.threat_level || 'unknown').toUpperCase();
                this.threatBadgeClass = this._getThreatBadgeClass(this.geoData.threat_level);
                this.isBlocked = !!this.geoData.is_blocked;
                this.isWhitelisted = !!this.geoData.is_whitelisted;
                this.blockedReason = this.geoData.blocked_reason || 'Blocked';
            }
        } catch (e) {
            // GeoIP lookup failed — card shows "no data" state
        }
    }

    _getThreatBadgeClass(level) {
        const l = (level || '').toLowerCase();
        if (l === 'high' || l === 'critical') return 'bg-danger';
        if (l === 'medium') return 'bg-warning text-dark';
        if (l === 'low') return 'bg-success';
        return 'bg-secondary';
    }

    async onActionViewGeoip() {
        await GeoIPView.show(this.sourceIP);
    }

    async onActionBlockIp() {
        const data = await Dialog.showForm({
            title: `Block IP — ${this.sourceIP}`,
            icon: 'bi-slash-circle',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', required: true, placeholder: 'e.g., Suspicious activity from incident' },
                {
                    name: 'ttl', type: 'select', label: 'Duration',
                    options: [
                        { value: 3600, label: '1 hour' },
                        { value: 21600, label: '6 hours' },
                        { value: 86400, label: '24 hours' },
                        { value: 604800, label: '7 days' },
                        { value: 2592000, label: '30 days' },
                        { value: 0, label: 'Permanent' }
                    ],
                    value: 86400
                }
            ]
        });
        if (!data) return true;

        if (!this.geoModel) return true;
        const resp = await this.geoModel.save({
            block: { reason: data.reason, ttl: parseInt(data.ttl) }
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`IP ${this.sourceIP} blocked`);
            await this.geoModel.fetch();
            this.geoData = this.geoModel.attributes;
            this.isBlocked = true;
            this.blockedReason = data.reason;
            await this.render();
        } else {
            this.getApp().toast.error('Failed to block IP');
        }
        return true;
    }

    async onActionUnblockIp() {
        const data = await Dialog.showForm({
            title: `Unblock IP — ${this.sourceIP}`,
            icon: 'bi-unlock',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', placeholder: 'e.g., False positive' }
            ]
        });
        if (!data) return true;

        if (!this.geoModel) return true;
        const resp = await this.geoModel.save({
            unblock: data.reason || 'Unblocked from incident view'
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`IP ${this.sourceIP} unblocked`);
            await this.geoModel.fetch();
            this.geoData = this.geoModel.attributes;
            this.isBlocked = false;
            await this.render();
        } else {
            this.getApp().toast.error('Failed to unblock IP');
        }
        return true;
    }

    async onActionWhitelistIp() {
        const data = await Dialog.showForm({
            title: `Whitelist IP — ${this.sourceIP}`,
            icon: 'bi-check-circle',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', required: true, placeholder: 'e.g., Known office IP' }
            ]
        });
        if (!data) return true;

        if (!this.geoModel) return true;
        const resp = await this.geoModel.save({
            whitelist: data.reason
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`IP ${this.sourceIP} whitelisted`);
            await this.geoModel.fetch();
            this.geoData = this.geoModel.attributes;
            this.isWhitelisted = true;
            this.isBlocked = false;
            await this.render();
        } else {
            this.getApp().toast.error('Failed to whitelist IP');
        }
        return true;
    }
}


// ── Quick Actions Bar ───────────────────────────────────────

class QuickActionsBar extends View {
    constructor(options = {}) {
        super({
            className: 'quick-actions-bar mb-3',
            ...options
        });

        this.incident = options.incident;
        const status = (this.incident.get('status') || '').toLowerCase();
        this.isActive = ['new', 'open', 'investigating'].includes(status);
        this.isResolved = ['resolved', 'closed'].includes(status);

        this.template = `
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2">
                    {{#isActive|bool}}
                        <button class="btn btn-success btn-sm" data-action="quick-resolve" data-bs-toggle="tooltip" title="Mark this incident as resolved">
                            <i class="bi bi-check-circle me-1"></i>Resolve
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" data-action="quick-pause" data-bs-toggle="tooltip" title="Put on hold">
                            <i class="bi bi-pause-circle"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" data-action="quick-ignore" data-bs-toggle="tooltip" title="Mark as noise">
                            <i class="bi bi-eye-slash"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" data-action="quick-escalate" data-bs-toggle="tooltip" title="Escalate priority">
                            <i class="bi bi-arrow-up-circle"></i>
                        </button>
                    {{/isActive|bool}}
                    {{#isResolved|bool}}
                        <button class="btn btn-outline-primary btn-sm" data-action="quick-reopen" data-bs-toggle="tooltip" title="Re-open for further investigation">
                            <i class="bi bi-arrow-counterclockwise me-1"></i>Re-open
                        </button>
                    {{/isResolved|bool}}
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-outline-primary btn-sm" data-action="quick-create-ticket" data-bs-toggle="tooltip" title="Create a review ticket">
                        <i class="bi bi-ticket-perforated me-1"></i>Ticket
                    </button>
                    <button class="btn btn-outline-dark btn-sm" data-action="quick-analyze-llm" data-bs-toggle="tooltip" title="LLM agent reviews events, merges related incidents, and proposes rules">
                        <i class="bi bi-robot me-1"></i>LLM Analyze
                    </button>
                </div>
            </div>
        `;
    }

    async onActionQuickResolve() {
        await this.incident.save({ status: 'resolved' });
        this.getApp()?.toast?.success('Incident resolved');
        this.emit('incident:updated');
    }

    async onActionQuickPause() {
        await this.incident.save({ status: 'paused' });
        this.getApp()?.toast?.success('Incident paused');
        this.emit('incident:updated');
    }

    async onActionQuickIgnore() {
        await this.incident.save({ status: 'ignored' });
        this.getApp()?.toast?.success('Incident ignored');
        this.emit('incident:updated');
    }

    async onActionQuickReopen() {
        await this.incident.save({ status: 'open' });
        this.getApp()?.toast?.success('Incident re-opened');
        this.emit('incident:updated');
    }

    async onActionQuickCreateTicket() {
        this.emit('create-ticket');
    }

    async onActionQuickEscalate() {
        const current = parseInt(this.incident.get('priority')) || 5;
        const newPriority = Math.min(current + 2, 10);
        await this.incident.save({ priority: newPriority });
        this.getApp()?.toast?.success(`Priority escalated to ${newPriority}`);
        this.emit('incident:updated');
    }

    async onActionQuickAnalyzeLlm() {
        this.emit('analyze-llm');
    }
}


// ── LLM Analysis Results ────────────────────────────────

class LLMAnalysisResultsView extends View {
    constructor(options = {}) {
        super({
            className: 'llm-analysis-results mb-3',
            ...options
        });

        this.analysis = options.analysis || {};
        this.incident = options.incident;
        this.summary = this.analysis.summary || '';
        this.hasProposedRule = !!(this.analysis.proposed_ruleset_id);
        this.proposedRulesetId = this.analysis.proposed_ruleset_id;
        this.mergedCount = (this.analysis.merged_incidents || []).length;
        this.mergedIds = (this.analysis.merged_incidents || []).join(', ');

        this.template = `
            <div class="card border-info shadow-sm">
                <div class="card-header bg-info bg-opacity-10 d-flex align-items-center justify-content-between">
                    <div>
                        <i class="bi bi-robot me-2 text-info"></i>
                        <strong>LLM Analysis</strong>
                        <span class="text-muted small ms-2">AI-generated triage</span>
                    </div>
                    <button class="btn btn-outline-info btn-sm" data-action="re-analyze" data-bs-toggle="tooltip" title="Run a fresh LLM analysis">
                        <i class="bi bi-arrow-clockwise me-1"></i>Re-analyze
                    </button>
                </div>
                <div class="card-body">
                    {{#summary}}
                    <div class="mb-3">
                        <h6 class="text-muted mb-2"><i class="bi bi-chat-left-text me-1"></i>Summary</h6>
                        <div class="bg-light rounded p-3 small" style="white-space: pre-wrap;">{{{summary}}}</div>
                    </div>
                    {{/summary}}
                    {{#mergedCount}}
                    <div class="mb-3">
                        <span class="badge bg-primary"><i class="bi bi-union me-1"></i>{{mergedCount}} incident(s) merged</span>
                        <span class="text-muted small ms-2">IDs: {{mergedIds}}</span>
                    </div>
                    {{/mergedCount}}
                    {{#hasProposedRule|bool}}
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-success"><i class="bi bi-gear me-1"></i>Proposed Rule</span>
                        <button class="btn btn-outline-primary btn-sm" data-action="view-proposed-rule">
                            <i class="bi bi-box-arrow-up-right me-1"></i>View Proposed RuleSet #{{proposedRulesetId}}
                        </button>
                        <span class="text-muted small">(created disabled — review before enabling)</span>
                    </div>
                    {{/hasProposedRule|bool}}
                </div>
            </div>
        `;
    }

    async onActionReAnalyze() {
        this.emit('analyze-llm');
    }

    async onActionViewProposedRule() {
        if (!this.proposedRulesetId) return;
        try {
            const ruleset = new RuleSet({ id: this.proposedRulesetId });
            await ruleset.fetch();
            const view = new RuleSetView({ model: ruleset });
            const dialog = new Dialog({
                header: false,
                size: 'xl',
                body: view,
                buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
            });
            await dialog.render(true, document.body);
            dialog.show();
        } catch (e) {
            this.getApp()?.toast?.error('Could not load proposed RuleSet');
        }
    }
}


// ── Overview Section ─────────────────────────────────────

class IncidentOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'incident-overview-section p-3',
            template: `
                <div data-container="quick-actions" class="mb-3"></div>
                <div data-container="llm-analysis-results"></div>
                <div data-container="overview-data" class="mb-3"></div>
                <div data-container="geoip-summary"></div>
            `,
            ...options
        });
    }

    async onInit() {
        // Quick actions bar
        this.quickActions = new QuickActionsBar({
            containerId: 'quick-actions',
            incident: this.model
        });
        this.quickActions.on('incident:updated', () => this.emit('incident:updated'));
        this.quickActions.on('create-ticket', () => this.emit('create-ticket'));
        this.quickActions.on('analyze-llm', () => this.emit('analyze-llm'));
        this.addChild(this.quickActions);

        // LLM Analysis results (if available)
        const metadata = this.model.get('metadata') || {};
        const llmAnalysis = metadata.llm_analysis;
        if (llmAnalysis) {
            this.llmResultsView = new LLMAnalysisResultsView({
                containerId: 'llm-analysis-results',
                analysis: llmAnalysis,
                incident: this.model
            });
            this.llmResultsView.on('analyze-llm', () => this.emit('analyze-llm'));
            this.addChild(this.llmResultsView);
        }

        // Core incident fields
        const statusCfg = getStatusConfig(this.model.get('status'));
        const priorityCfg = getPriorityConfig(this.model.get('priority'));
        this.statusHelp = statusCfg.help;
        this.priorityHelp = priorityCfg.label;

        // Show details separately only if different from title
        const title = this.model.get('title') || '';
        const details = this.model.get('details') || '';
        const showDetails = details && details !== title;

        const fields = [
            { name: 'status', label: 'Status', formatter: 'badge', cols: 3 },
            { name: 'priority', label: 'Priority', cols: 3 },
            { name: 'category', label: 'Category', formatter: 'badge', cols: 3 },
            { name: 'event_count', label: 'Events', cols: 3 },
            { name: 'scope', label: 'Scope', cols: 3 },
            { name: 'hostname', label: 'Hostname', cols: 3 },
            { name: 'created', label: 'Created', formatter: 'epoch|datetime', cols: 3 },
            { name: 'modified', label: 'Last Updated', formatter: 'epoch|datetime', cols: 3 },
            { name: 'title', label: 'Title', cols: 12 },
        ];
        if (showDetails) {
            fields.push({ name: 'details', label: 'Details', cols: 12 });
        }
        // Show model reference only if present
        if (this.model.get('model_name')) {
            fields.push({ name: 'model_name', label: 'Related Model', cols: 6 });
            fields.push({ name: 'model_id', label: 'Model ID', cols: 6 });
        }

        this.dataView = new DataView({
            containerId: 'overview-data',
            model: this.model,
            columns: 2,
            showEmptyValues: false,
            fields
        });
        this.addChild(this.dataView);

        // GeoIP summary
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
        const metadata = this.model.get('metadata') || {};
        if (metadata.source_ip) return metadata.source_ip;
        if (metadata.ip) return metadata.ip;
        if (metadata.ip_address) return metadata.ip_address;

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
            // No IP available
        }
        return null;
    }
}


// ── Rule Engine Section ──────────────────────────────────

class RuleEngineSection extends View {
    constructor(options = {}) {
        super({
            className: 'rule-engine-section p-3',
            ...options
        });

        this.incident = options.incident;
        const ruleSet = this.incident.get('rule_set');
        this.rulesetId = ruleSet && typeof ruleSet === 'object' ? ruleSet.id : ruleSet;
        this.rulesetModel = null;
        this.hasRuleset = false;

        this.template = `
            {{#hasRuleset|bool}}
                <div class="mb-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h6 class="mb-0"><i class="bi bi-gear-wide-connected me-2"></i>Linked RuleSet</h6>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary btn-sm" data-action="edit-linked-ruleset">
                                <i class="bi bi-pencil me-1"></i>Edit RuleSet
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" data-action="view-linked-ruleset">
                                <i class="bi bi-box-arrow-up-right me-1"></i>View Full Details
                            </button>
                            <button class="btn btn-outline-success btn-sm" data-action="create-rule-from-incident">
                                <i class="bi bi-plus-circle me-1"></i>Create New Rule
                            </button>
                        </div>
                    </div>
                    <div data-container="ruleset-data"></div>
                    <div class="mt-3">
                        <h6 class="mb-2"><i class="bi bi-funnel me-2"></i>Rule Conditions</h6>
                        <div data-container="ruleset-rules"></div>
                    </div>
                </div>
            {{/hasRuleset|bool}}
            {{^hasRuleset|bool}}
                <div class="text-center py-5">
                    <div class="text-muted mb-3">
                        <i class="bi bi-gear fs-1"></i>
                    </div>
                    <h6 class="text-muted">No RuleSet Linked</h6>
                    <p class="text-muted small mb-3">
                        This incident was not created by a rule engine match.<br>
                        You can create a new rule based on this incident's event pattern to catch similar events automatically.
                    </p>
                    <button class="btn btn-primary" data-action="create-rule-from-incident">
                        <i class="bi bi-plus-circle me-1"></i>Create Rule from Incident
                    </button>
                </div>
            {{/hasRuleset|bool}}
        `;
    }

    async onInit() {
        if (!this.rulesetId) return;

        try {
            this.rulesetModel = new RuleSet({ id: this.rulesetId });
            await this.rulesetModel.fetch();
            this.hasRuleset = true;
        } catch (e) {
            return;
        }

        // RuleSet summary
        const matchByValue = this.rulesetModel.get('match_by');
        const matchByOption = MatchByOptions.find(opt => opt.value === matchByValue);
        const bundleByValue = this.rulesetModel.get('bundle_by');
        const bundleByOption = BundleByOptions.find(opt => opt.value === bundleByValue);

        this.rulesetDataView = new DataView({
            containerId: 'ruleset-data',
            model: this.rulesetModel,
            className: 'border rounded p-3 bg-light',
            columns: 2,
            fields: [
                { name: 'name', label: 'Name', cols: 6 },
                { name: 'category', label: 'Scope', formatter: 'badge', cols: 3 },
                { name: 'is_active', label: 'Active', formatter: 'yesnoicon', cols: 3 },
                { name: 'priority', label: 'Priority', cols: 3 },
                { name: 'match_by', label: 'Match Logic', template: matchByOption ? matchByOption.label : String(matchByValue), cols: 3 },
                { name: 'bundle_by', label: 'Bundle By', template: bundleByOption ? bundleByOption.label : String(bundleByValue), cols: 3 },
                { name: 'bundle_minutes', label: 'Bundle Window', cols: 3 },
                { name: 'trigger_count', label: 'Trigger Count', cols: 3 },
                { name: 'trigger_window', label: 'Trigger Window (min)', cols: 3 },
                { name: 'retrigger_every', label: 'Re-trigger Every', cols: 3 },
                { name: 'handler', label: 'Handler', cols: 12 },
            ]
        });
        this.addChild(this.rulesetDataView);

        // Rules table
        const rulesCollection = new RuleList({
            params: { parent: this.rulesetId }
        });
        this.rulesTable = new TableView({
            containerId: 'ruleset-rules',
            collection: rulesCollection,
            hideActivePillNames: ['parent'],
            columns: [
                { key: 'name', label: 'Name' },
                { key: 'field_name', label: 'Field' },
                { key: 'comparator', label: 'Comparator', width: '110px' },
                { key: 'value', label: 'Value' },
                { key: 'value_type', label: 'Type', width: '80px' },
            ],
            showAdd: false,
            size: 10,
            paginated: false
        });
        this.addChild(this.rulesTable);
    }

    async onActionEditLinkedRuleset() {
        if (!this.rulesetModel) return;
        const resp = await Dialog.showModelForm({
            title: `Edit RuleSet — ${this.rulesetModel.get('name')}`,
            model: this.rulesetModel,
            formConfig: RuleSetForms.edit,
        });
        if (resp) {
            await this.render();
            this.getApp()?.toast?.success('RuleSet updated');
        }
    }

    async onActionViewLinkedRuleset() {
        if (!this.rulesetModel) return;
        const view = new RuleSetView({ model: this.rulesetModel });
        const dialog = new Dialog({
            header: false,
            size: 'xl',
            body: view,
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await dialog.render(true, document.body);
        dialog.show();
    }

    async onActionCreateRuleFromIncident() {
        // Pre-fill ruleset creation with incident context
        const incident = this.incident;
        const category = incident.get('category') || '';
        const scope = incident.get('scope') || '';
        const metadata = incident.get('metadata') || {};

        // Build a helpful default name
        const defaultName = `Rule: ${category || 'custom'} (from incident #${incident.get('id')})`;

        const resp = await Dialog.showForm({
            title: 'Create RuleSet from Incident',
            icon: 'bi-gear-wide-connected',
            size: 'lg',
            fields: [
                {
                    name: 'name', type: 'text', label: 'RuleSet Name',
                    required: true, value: defaultName, cols: 12
                },
                {
                    name: 'category', type: 'combo', label: 'Scope',
                    required: true, value: scope || category,
                    options: [
                        { value: 'global', label: 'Global' },
                        { value: 'account', label: 'Account' },
                        { value: 'incident', label: 'Incident' },
                        { value: 'ossec', label: 'OSSEC' },
                    ],
                    cols: 6
                },
                {
                    name: 'priority', type: 'number', label: 'Priority',
                    value: 10, required: true, cols: 6
                },
                {
                    name: 'bundle_by', type: 'select', label: 'Bundle By',
                    value: metadata.source_ip ? 4 : 0,
                    options: [
                        { value: 0, label: 'No Bundling' },
                        { value: 1, label: 'By Hostname' },
                        { value: 2, label: 'By Model Name' },
                        { value: 4, label: 'By Source IP' },
                    ],
                    cols: 6
                },
                {
                    name: 'bundle_minutes', type: 'number', label: 'Bundle Window (minutes)',
                    value: 30, cols: 6
                },
                {
                    name: 'handler', type: 'text', label: 'Handler',
                    placeholder: 'e.g., block://?ttl=3600, ticket://?priority=8',
                    cols: 12
                },
                {
                    name: 'is_active', type: 'switch', label: 'Enable Immediately',
                    value: false, cols: 6,
                    help: 'Leave disabled to review before activating'
                }
            ]
        });

        if (!resp) return;

        const ruleset = new RuleSet();
        const saveResp = await ruleset.save({
            ...resp,
            match_by: 0,
            bundle_by: parseInt(resp.bundle_by),
            bundle_minutes: parseInt(resp.bundle_minutes) || 30
        });

        if (saveResp.status === 200 || saveResp.success) {
            // Link the new ruleset to this incident
            await this.incident.save({ rule_set: ruleset.id });
            this.rulesetId = ruleset.id;
            this.rulesetModel = ruleset;
            this.hasRuleset = true;

            // Auto-create rule condition for OSSEC incidents with rule_id
            let autoRuleCreated = false;
            const ruleId = parseInt(metadata.rule_id, 10);
            if (scope === 'ossec' && Number.isFinite(ruleId)) {
                try {
                    const rule = new Rule();
                    await rule.save({
                        parent: ruleset.id,
                        name: `Match rule_id ${ruleId}`,
                        field_name: 'rule_id',
                        comparator: '==',
                        value: String(ruleId),
                        value_type: 'int',
                        index: 0
                    });
                    autoRuleCreated = true;
                } catch (e) {
                    this.getApp()?.toast?.warning('RuleSet created but auto-rule failed — add conditions manually');
                }
            }

            this.getApp()?.toast?.success(
                autoRuleCreated
                    ? `RuleSet created with rule_id=${ruleId} condition`
                    : 'RuleSet created — add rule conditions to activate'
            );

            // Open the full RuleSet view so user can add/review rule conditions
            const view = new RuleSetView({ model: ruleset });
            const dialog = new Dialog({
                header: false,
                size: 'xl',
                body: view,
                buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
            });
            await dialog.render(true, document.body);
            dialog.show();
        } else {
            this.getApp()?.toast?.error('Failed to create RuleSet');
        }
    }
}


// ── Tickets Section ──────────────────────────────────────

class IncidentTicketsSection extends View {
    constructor(options = {}) {
        super({
            className: 'incident-tickets-section p-3',
            template: `
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h6 class="mb-0"><i class="bi bi-ticket-perforated me-2"></i>Related Tickets</h6>
                    <button class="btn btn-primary btn-sm" data-action="create-ticket">
                        <i class="bi bi-plus-circle me-1"></i>Create Ticket
                    </button>
                </div>
                <div data-container="tickets-table"></div>
            `,
            ...options
        });

        this.incident = options.incident;
    }

    async onInit() {
        const ticketsCollection = new TicketList({
            params: { incident: this.incident.get('id'), sort: '-created' }
        });

        this.ticketsTable = new TableView({
            containerId: 'tickets-table',
            collection: ticketsCollection,
            hideActivePillNames: ['incident'],
            columns: [
                { key: 'id', label: 'ID', width: '60px', sortable: true },
                { key: 'created', label: 'Created', formatter: 'epoch|datetime', sortable: true, width: '160px' },
                { key: 'status', label: 'Status', formatter: 'badge', width: '100px' },
                { key: 'category', label: 'Category', formatter: 'badge', width: '120px' },
                { key: 'priority', label: 'Priority', width: '80px', sortable: true },
                { key: 'title', label: 'Title' },
            ],
            actions: ['view'],
            showAdd: false,
            paginated: true,
            size: 10,
            emptyMessage: 'No tickets linked to this incident.'
        });
        this.addChild(this.ticketsTable);
    }

    async onActionCreateTicket() {
        const incident = this.incident;
        const title = `Incident #${incident.get('id')}: ${incident.get('category') || incident.get('title') || 'Investigation'}`;

        const formConfig = {
            ...TicketForms.create,
            fields: TicketForms.create.fields.map(f => {
                if (f.name === 'title') return { ...f, value: title };
                if (f.name === 'category') return { ...f, value: 'incident' };
                if (f.name === 'priority') return { ...f, value: incident.get('priority') || 5 };
                if (f.name === 'incident') return { ...f, value: incident.get('id'), type: 'hidden' };
                return f;
            })
        };

        const data = await Dialog.showForm(formConfig);
        if (!data) return;

        const ticket = new Ticket();
        const resp = await ticket.save({
            ...data,
            incident: incident.get('id')
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('Ticket created');
            this.ticketsTable?.collection?.fetch();
        } else {
            this.getApp()?.toast?.error('Failed to create ticket');
        }
    }
}


// ── Related Incidents Section ────────────────────────────

class RelatedIncidentsSection extends View {
    constructor(options = {}) {
        super({
            className: 'related-incidents-section p-3',
            template: `
                <div class="mb-3">
                    <h6 class="mb-1"><i class="bi bi-diagram-2 me-2"></i>Related Incidents</h6>
                    <p class="text-muted small mb-0">Incidents sharing the same source IP or category</p>
                </div>
                <div data-container="related-table"></div>
            `,
            ...options
        });

        this.incident = options.incident;
        this.sourceIP = options.sourceIP;
    }

    async onInit() {
        // Build filter params — same category or same source IP, excluding this incident
        const params = {
            id__not: this.incident.get('id'),
            sort: '-created',
            size: 10
        };

        // Prefer source IP for network incidents, fall back to category
        if (this.sourceIP) {
            params.source_ip = this.sourceIP;
        } else {
            const category = this.incident.get('category');
            if (category) {
                params.category = category;
            }
        }

        const relatedCollection = new IncidentList({ params });

        this.relatedTable = new TableView({
            containerId: 'related-table',
            collection: relatedCollection,
            hideActivePillNames: ['id__not', 'source_ip', 'category'],
            columns: [
                { key: 'id', label: 'ID', width: '60px', sortable: true },
                { key: 'created', label: 'Created', formatter: 'epoch|datetime', sortable: true, width: '160px' },
                { key: 'status', label: 'Status', formatter: 'badge', width: '100px' },
                { key: 'category', label: 'Category', formatter: 'badge' },
                { key: 'priority', label: 'Priority', width: '80px', sortable: true },
                { key: 'title', label: 'Title', formatter: "truncate(60)|default('—')" },
            ],
            actions: ['view'],
            showAdd: false,
            paginated: true,
            size: 10,
            emptyMessage: 'No related incidents found.'
        });
        this.addChild(this.relatedTable);
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
        this.incidentIcon = getHeaderIcon(this.model.get('status'));
        this.statusCfg = getStatusConfig(this.model.get('status'));
        this.priorityCfg = getPriorityConfig(this.model.get('priority'));

        this.template = `
            <div class="incident-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="fs-1 {{incidentIcon.color}}">
                            <i class="bi {{incidentIcon.icon}}"></i>
                        </div>
                        <div>
                            <h4 class="mb-1">Incident #{{model.id}}</h4>
                            {{#model.title}}
                                <div class="text-muted mb-2">{{model.title|truncate(80)}}</div>
                            {{/model.title}}
                            <div class="d-flex align-items-center gap-2 flex-wrap">
                                <span class="badge {{statusCfg.badge}}" data-bs-toggle="tooltip" title="{{statusCfg.help}}">
                                    <i class="bi {{statusCfg.icon}} me-1"></i>{{statusCfg.label}}
                                </span>
                                <span class="badge {{priorityCfg.bg}} {{priorityCfg.color}}" data-bs-toggle="tooltip" title="Priority {{model.priority}} — {{priorityCfg.label}} severity">
                                    P{{model.priority}} · {{priorityCfg.label}}
                                </span>
                                {{#model.category}}
                                    <span class="badge bg-light text-dark border">{{model.category}}</span>
                                {{/model.category}}
                            </div>
                            <div class="text-muted small mt-1">
                                {{model.created|datetime}}
                                {{#model.scope}} · {{model.scope}}{{/model.scope}}
                                {{#model.hostname}} · {{model.hostname}}{{/model.hostname}}
                                {{#model.event_count}} · {{model.event_count}} events{{/model.event_count}}
                            </div>
                        </div>
                    </div>
                    <div data-container="incident-context-menu"></div>
                </div>

                <!-- SideNav -->
                <div data-container="incident-sidenav"></div>
            </div>
        `;
    }

    async onInit() {
        // Resolve source IP early for reuse
        this._sourceIP = await this._resolveSourceIP();
        this.getApp().showLoading();
        await this.model.fetch({params: {graph:"detailed"}});
        this.getApp().hideLoading();

        // ── Overview section ──
        const overviewSection = new IncidentOverviewSection({ model: this.model });
        overviewSection.on('incident:updated', () => this._handleIncidentUpdated());
        overviewSection.on('create-ticket', () => this._handleCreateTicket());
        overviewSection.on('analyze-llm', () => this._handleAnalyzeLlm());

        // ── Events section ──
        const eventsCollection = new IncidentEventList({
            params: { incident: this.model.get('id') }
        });
        const eventsSection = new TableView({
            collection: eventsCollection,
            hideActivePillNames: ['incident'],
            columns: [
                { key: 'id', label: 'ID', width: '50px', sortable: true },
                {
                    key: 'created', label: 'Date / Category', sortable: true, width: '160px',
                    template: `<div>{{{model.created|epoch|datetime}}}</div><div class="text-muted small">{{{model.category|badge}}}</div>`
                },
                {
                    key: 'source_ip', label: 'Source', sortable: true, width: '130px',
                    template: `<div>{{model.hostname}}</div><div class="text-muted small">{{model.source_ip}}</div>`,
                    filter: { type: 'text' }
                },
                { key: 'title', label: 'Title', sortable: true, formatter: "truncate(80)|default('—')" },
                {
                    key: 'level', label: 'Level', sortable: true, width: '60px',
                    filter: { type: 'text' }
                },
            ],
            showAdd: false,
            actions: ['view'],
            paginated: true,
            size: 10
        });

        // ── Rule Engine section ──
        const ruleEngineSection = new RuleEngineSection({ incident: this.model });

        // ── Tickets section ──
        const ticketsSection = new IncidentTicketsSection({ incident: this.model });

        // ── History section ──
        const adapter = new IncidentHistoryAdapter(this.model.get('id'));
        const historySection = new ChatView({ adapter });

        // ── Related Incidents section ──
        const relatedSection = new RelatedIncidentsSection({
            incident: this.model,
            sourceIP: this._sourceIP
        });

        // Build sections
        const sections = [
            { key: 'Overview',           label: 'Overview',           icon: 'bi-shield-exclamation', view: overviewSection },
            { key: 'Events',             label: 'Events',             icon: 'bi-list-ul',            view: eventsSection },
            { key: 'Rule Engine',        label: 'Rule Engine',        icon: 'bi-gear-wide-connected', view: ruleEngineSection },
            { key: 'Tickets',            label: 'Tickets',            icon: 'bi-ticket-perforated',  view: ticketsSection },
            { key: 'History',            label: 'History',            icon: 'bi-chat-left-text',     view: historySection },
            { type: 'divider', label: 'Investigation' },
            { key: 'Related Incidents',  label: 'Related',            icon: 'bi-diagram-2',          view: relatedSection },
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
            const metadataSection = this._buildMetadataSection(metadata);
            sections.push({ key: 'Metadata', label: 'Metadata', icon: 'bi-braces', view: metadataSection });
        }

        // SideNavView
        this.sideNav = new SideNavView({
            containerId: 'incident-sidenav',
            sections,
            activeSection: 'Overview',
            navWidth: 180,
            contentPadding: '1.25rem 2rem',
            enableResponsive: true,
            minWidth: 500
        });
        this.addChild(this.sideNav);

        // ContextMenu
        this._buildContextMenu();
    }

    _buildMetadataSection(metadata) {
        // Structured display of known metadata fields + raw JSON
        const knownFields = [];
        const knownKeys = ['source_ip', 'hostname', 'user_agent', 'http_url', 'http_method',
            'http_status', 'country_code', 'region', 'city', 'request_path', 'user',
            'component', 'component_id', 'error_class', 'error_message', 'rule_id',
            'risk_score', 'action', 'trigger'];

        for (const key of knownKeys) {
            if (metadata[key] !== undefined && metadata[key] !== null) {
                knownFields.push({ name: key, label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), cols: 6 });
            }
        }

        if (knownFields.length > 0) {
            // Use a wrapper view with structured fields + raw JSON
            return new View({
                model: this.model,
                metadata: metadata,
                hasStructuredFields: knownFields.length > 0,
                template: `
                    <div class="p-3">
                        {{#hasStructuredFields|bool}}
                        <h6 class="mb-3"><i class="bi bi-list-check me-2"></i>Key Fields</h6>
                        <div data-container="structured-metadata" class="mb-4"></div>
                        {{/hasStructuredFields|bool}}
                        <h6 class="mb-2"><i class="bi bi-braces me-2"></i>Raw Metadata</h6>
                        <pre class="bg-light p-3 border rounded small"><code>{{{model.metadata|json}}}</code></pre>
                    </div>
                `,
                onInit() {
                    if (knownFields.length > 0) {
                        // Build a simple model from metadata for DataView
                        const metaModel = { get: (key) => metadata[key], attributes: metadata };
                        this.structuredView = new DataView({
                            containerId: 'structured-metadata',
                            model: metaModel,
                            columns: 2,
                            showEmptyValues: false,
                            fields: knownFields
                        });
                        this.addChild(this.structuredView);
                    }
                }
            });
        }

        // Fallback: just raw JSON
        return new View({
            model: this.model,
            template: `<pre class="bg-light p-3 border rounded small"><code>{{{model.metadata|json}}}</code></pre>`
        });
    }

    _buildContextMenu() {
        const status = (this.model.get('status') || '').toLowerCase();
        const items = [];

        // Status transitions
        items.push({ label: 'Change Status', icon: 'bi-arrow-repeat', header: true });

        if (status !== 'open')
            items.push({ label: 'Open', action: 'set-status-open', icon: 'bi-folder2-open' });
        if (status !== 'investigating')
            items.push({ label: 'Investigate', action: 'set-status-investigating', icon: 'bi-search' });
        if (status !== 'paused')
            items.push({ label: 'Pause', action: 'set-status-paused', icon: 'bi-pause-circle' });
        if (status !== 'resolved')
            items.push({ label: 'Resolve', action: 'set-status-resolved', icon: 'bi-check-circle' });
        if (status !== 'ignored')
            items.push({ label: 'Ignore', action: 'set-status-ignored', icon: 'bi-eye-slash' });

        items.push({ type: 'divider' });

        // Edit & priority
        items.push({ label: 'Edit Incident', action: 'edit-incident', icon: 'bi-pencil' });
        items.push({ label: 'Change Priority', action: 'change-priority', icon: 'bi-arrow-up-circle' });

        items.push({ type: 'divider' });

        // IP actions
        if (this._sourceIP) {
            items.push({ label: `Block IP (${this._sourceIP})`, action: 'block-source-ip', icon: 'bi-slash-circle', class: 'text-danger' });
            items.push({ label: `View GeoIP (${this._sourceIP})`, action: 'view-source-geoip', icon: 'bi-globe' });
        }

        // Ticket & merge
        items.push({ label: 'Create Ticket', action: 'create-ticket', icon: 'bi-ticket-perforated' });
        items.push({ label: 'Merge Incidents', action: 'merge-incidents', icon: 'bi-union' });

        items.push({ type: 'divider' });

        // LLM Analysis
        items.push({ label: 'LLM Analyze', action: 'analyze-llm', icon: 'bi-robot' });

        items.push({ type: 'divider' });
        items.push({ label: 'Delete Incident', action: 'delete-incident', icon: 'bi-trash', danger: true });

        const incidentMenu = new ContextMenu({
            containerId: 'incident-context-menu',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items
            }
        });
        this.addChild(incidentMenu);
    }

    async onAfterRender() {
        await super.onAfterRender();
        if (window.bootstrap && window.bootstrap.Tooltip && this.element) {
            const tooltipTriggerList = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipTriggerList.forEach(el => {
                const existing = window.bootstrap.Tooltip.getInstance(el);
                if (existing && typeof existing.dispose === 'function') existing.dispose();
                new window.bootstrap.Tooltip(el);
            });
        }
    }

    // ── Source IP resolution ──

    async _resolveSourceIP() {
        const metadata = this.model.get('metadata') || {};
        if (metadata.source_ip) return metadata.source_ip;
        if (metadata.ip) return metadata.ip;
        if (metadata.ip_address) return metadata.ip_address;

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
            // No IP available
        }
        return null;
    }

    // ── Status actions ──

    async _setStatus(status) {
        await this.model.save({ status });
        this.getApp()?.toast?.success(`Status changed to ${status}`);
        this._handleIncidentUpdated();
    }

    async onActionSetStatusOpen() { await this._setStatus('open'); }
    async onActionSetStatusInvestigating() { await this._setStatus('investigating'); }
    async onActionSetStatusPaused() { await this._setStatus('paused'); }
    async onActionSetStatusResolved() { await this._setStatus('resolved'); }
    async onActionSetStatusIgnored() { await this._setStatus('ignored'); }

    // ── Priority ──

    async onActionChangePriority() {
        const data = await Dialog.showForm({
            title: 'Change Priority',
            icon: 'bi-arrow-up-circle',
            size: 'sm',
            fields: [
                {
                    name: 'priority', type: 'select', label: 'Priority',
                    value: this.model.get('priority') || 5,
                    options: [
                        { value: 10, label: '10 — Critical' },
                        { value: 9, label: '9 — Critical' },
                        { value: 8, label: '8 — High' },
                        { value: 7, label: '7 — High' },
                        { value: 6, label: '6 — Medium' },
                        { value: 5, label: '5 — Medium' },
                        { value: 4, label: '4 — Low' },
                        { value: 3, label: '3 — Low' },
                        { value: 2, label: '2 — Info' },
                        { value: 1, label: '1 — Info' },
                    ]
                }
            ]
        });
        if (!data) return;

        await this.model.save({ priority: parseInt(data.priority) });
        this.getApp()?.toast?.success(`Priority changed to ${data.priority}`);
        this._handleIncidentUpdated();
    }

    // ── Edit ──

    async onActionEditIncident() {
        const resp = await Dialog.showModelForm({
            title: `Edit Incident #${this.model.id}`,
            model: this.model,
            formConfig: IncidentForms.edit,
        });
        if (resp) {
            this._handleIncidentUpdated();
        }
    }

    // ── IP actions ──

    async onActionBlockSourceIp() {
        if (!this._sourceIP) return;

        const geoModel = await GeoLocatedIP.lookup(this._sourceIP);
        if (!geoModel) {
            this.getApp()?.toast?.error('Could not find GeoIP record for this IP');
            return;
        }

        const data = await Dialog.showForm({
            title: `Block IP — ${this._sourceIP}`,
            icon: 'bi-slash-circle',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', required: true, value: `Blocked from incident #${this.model.id}` },
                {
                    name: 'ttl', type: 'select', label: 'Duration',
                    options: [
                        { value: 3600, label: '1 hour' },
                        { value: 21600, label: '6 hours' },
                        { value: 86400, label: '24 hours' },
                        { value: 604800, label: '7 days' },
                        { value: 2592000, label: '30 days' },
                        { value: 0, label: 'Permanent' }
                    ],
                    value: 86400
                }
            ]
        });
        if (!data) return;

        const resp = await geoModel.save({
            block: { reason: data.reason, ttl: parseInt(data.ttl) }
        });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`IP ${this._sourceIP} blocked fleet-wide`);
        } else {
            this.getApp()?.toast?.error('Failed to block IP');
        }
    }

    async onActionViewSourceGeoip() {
        if (this._sourceIP) {
            await GeoIPView.show(this._sourceIP);
        }
    }

    // ── Ticket ──

    async onActionCreateTicket() {
        this._handleCreateTicket();
    }

    async _handleCreateTicket() {
        const title = `Incident #${this.model.get('id')}: ${this.model.get('category') || this.model.get('title') || 'Investigation'}`;

        const data = await Dialog.showForm({
            ...TicketForms.create,
            fields: TicketForms.create.fields.map(f => {
                if (f.name === 'title') return { ...f, value: title };
                if (f.name === 'category') return { ...f, value: 'incident' };
                if (f.name === 'priority') return { ...f, value: this.model.get('priority') || 5 };
                if (f.name === 'incident') return { ...f, value: this.model.get('id'), type: 'hidden' };
                return f;
            })
        });
        if (!data) return;

        const ticket = new Ticket();
        const resp = await ticket.save({ ...data, incident: this.model.get('id') });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('Ticket created');
        } else {
            this.getApp()?.toast?.error('Failed to create ticket');
        }
    }

    // ── Merge ──

    async onActionMergeIncidents() {
        const data = await Dialog.showForm({
            title: 'Merge Incidents',
            icon: 'bi-union',
            size: 'sm',
            fields: [
                {
                    name: 'merge_ids', type: 'text', label: 'Incident IDs to merge into this one',
                    required: true,
                    placeholder: 'e.g., 102, 105, 108',
                    help: 'Comma-separated IDs. Events from those incidents will be merged here.'
                }
            ]
        });
        if (!data) return;

        const mergeIds = data.merge_ids.split(',').map(s => parseInt(s.trim())).filter(n => n && n !== this.model.id);
        if (mergeIds.length === 0) return;

        const resp = await this.model.save({ merge: mergeIds });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`Merged ${mergeIds.length} incident(s)`);
            this._handleIncidentUpdated();
        } else {
            this.getApp()?.toast?.error('Merge failed');
        }
    }

    // ── LLM Analysis ──

    async onActionAnalyzeLlm() {
        await this._handleAnalyzeLlm();
    }

    async _handleAnalyzeLlm() {
        const confirmed = await Dialog.confirm(
            'Run LLM analysis on this incident? The AI agent will review all events, ' +
            'attempt to merge related incidents, and propose a new rule to catch similar patterns. ' +
            'The incident status will be set to "investigating".',
            'LLM Analysis',
            { confirmText: 'Analyze', confirmClass: 'btn-info' }
        );
        if (!confirmed) return;

        const app = this.getApp();
        app?.showLoading('Starting LLM analysis...');

        try {
            const resp = await this.model.save({ analyze: 1 });

            if (!resp.success && resp.status !== 200) {
                const errorMsg = resp.data?.error || resp.error || 'Failed to start analysis';
                app?.toast?.error(errorMsg);
                return;
            }

            app?.toast?.success('LLM analysis started — polling for results in the background...');

            // Poll in the background — don't block the UI
            this._pollAnalysisProgress();

        } catch (error) {
            app?.toast?.error(`Analysis failed: ${error.message}`);
        } finally {
            app?.hideLoading();
        }
    }

    _pollAnalysisProgress() {
        const maxAttempts = 60;  // 5 minutes at 5s intervals
        const pollInterval = 5000;
        let attempt = 0;

        const poll = () => {
            attempt++;
            if (attempt > maxAttempts) {
                this.getApp()?.toast?.error('Analysis is taking longer than expected. Check back later.');
                return;
            }

            setTimeout(() => {
                this.model.fetch().then(() => {
                    const metadata = this.model.get('metadata') || {};

                    if (!metadata.analysis_in_progress) {
                        if (metadata.llm_analysis) {
                            this.getApp()?.toast?.success('LLM analysis complete — refreshing view');
                        } else {
                            this.getApp()?.toast?.success('Analysis finished');
                        }
                        this._handleIncidentUpdated();
                        return;
                    }
                    poll();
                }).catch(() => {
                    // Fetch failed — keep polling
                    poll();
                });
            }, pollInterval);
        };

        poll();
    }

    // ── Delete ──

    async onActionDeleteIncident() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to delete incident #${this.model.id}? This action cannot be undone.`,
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

    // ── Update handler ──

    _handleIncidentUpdated() {
        this.incidentIcon = getHeaderIcon(this.model.get('status'));
        this.statusCfg = getStatusConfig(this.model.get('status'));
        this.priorityCfg = getPriorityConfig(this.model.get('priority'));
        this.render();
        this.emit('incident:updated', { model: this.model });
    }
}

Incident.VIEW_CLASS = IncidentView;

export default IncidentView;
