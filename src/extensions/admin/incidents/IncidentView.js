/**
 * IncidentView - Security operations view for an Incident record.
 *
 * Built on the DetailView primitive with @core/views/data/* primitives:
 *   - Overview leads with `StatusPanel` (state/headline/meta/actions)
 *   - 4 KPIs (Events / Sources / Last fired / Related) via `MetricCard`
 *   - "What triggered this" + "What happened next" pair cards (the second
 *     uses `Timeline` from @core for the handler-chain feed)
 *   - Source / Request / Stack Trace investigation sections
 *   - Rule Engine, Tickets, History (ChatView wrapper) response sections
 *   - Related incidents (`TableView` from `RelatedIncidentsList`)
 *   - Metadata (`KnownFieldsCard`) for the JSON blob
 *
 * Open via `Modal.detail(new IncidentView({ model }))`. Inherits the
 * `'lg'` size default from `Modal.detail()`. EventView (sibling file) is
 * the per-row inspector for IncidentEvent records and follows the same
 * Mustache + DataFormatter conventions.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import StackTraceView from '@core/views/data/StackTraceView.js';
import StatusPanel from '@core/views/data/StatusPanel.js';
import Timeline from '@core/views/data/Timeline.js';
import KnownFieldsCard from '@core/views/data/KnownFieldsCard.js';
import MetricCard from '@core/views/data/MetricCard.js';
import ChatView from '@core/views/chat/ChatView.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    Incident, IncidentForms, IncidentEventList,
    RuleSet, RuleSetForms, Rule, RuleList,
    BundleByOptions, MatchByOptions,
    RelatedIncidentsList
} from '@ext/admin/models/Incident.js';
import { GeoLocatedIP } from '@core/models/System.js';
import { Ticket, TicketList, TicketForms } from '@ext/admin/models/Tickets.js';
import GeoIPView from '../account/devices/GeoIPView.js';
import RuleSetView from './RuleSetView.js';
import IncidentHistoryAdapter from './adapters/IncidentHistoryAdapter.js';
import { openAssistantChat } from '../assistant/AssistantContextChat.js';

const escapeHtml = MOJOUtils.escapeHtml;


// ── Module Helpers ──────────────────────────────────────────

/** Infer Rule value_type from a JS value (used by RuleEngineSection picker) */
function _inferValueType(val) {
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
    const num = Number(val);
    if (val !== '' && !isNaN(num)) return Number.isInteger(num) ? 'int' : 'float';
    return 'str';
}

function _truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
}

/** Render markdown to HTML via the docit API, with plain-text fallback */
async function _renderMarkdown(view, markdown) {
    if (!markdown) return '';
    try {
        const app = view.getApp();
        const resp = await app.rest.post('/api/docit/render', { markdown });
        const html = resp?.data?.data?.html || resp?.data?.html;
        if (html) return html;
    } catch (_e) { /* API unavailable — fall through */ }
    return `<pre class="detail-error-block">${escapeHtml(markdown)}</pre>`;
}

function _formatRelative(epochSeconds) {
    if (!epochSeconds) return '';
    const ts = Number(epochSeconds);
    const now = Math.floor(Date.now() / 1000);
    const delta = now - ts;
    if (delta < 60)    return delta <= 1 ? 'just now' : `${delta}s ago`;
    if (delta < 3600)  return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
}

function _formatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    if (s < 60)    return `${s}s`;
    if (s < 3600)  return `${Math.floor(s / 60)}m ${s % 60}s`;
    if (s < 86400) {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h}h ${m}m`;
    }
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    return `${d}d ${h}h`;
}

function _resolveSourceIPSync(incident) {
    const metadata = incident.get('metadata') || {};
    return metadata.source_ip || metadata.ip || metadata.ip_address || null;
}


// ── Status & Priority Helpers ──────────────────────────────

const STATUS_CONFIG = {
    new:           { tone: 'danger',  icon: 'bi-bell-fill',          label: 'New',           help: 'Unhandled — needs triage' },
    open:          { tone: 'danger',  icon: 'bi-folder2-open',       label: 'Open',          help: 'Claimed by an operator for investigation' },
    investigating: { tone: 'warning', icon: 'bi-search',             label: 'Investigating', help: 'Actively being investigated' },
    paused:        { tone: 'info',    icon: 'bi-pause-circle-fill',  label: 'Paused',        help: 'On hold — waiting for external input' },
    resolved:      { tone: 'success', icon: 'bi-check-circle-fill',  label: 'Resolved',      help: 'Root cause addressed' },
    closed:        { tone: 'success', icon: 'bi-x-circle-fill',      label: 'Closed',        help: 'Closed — archived' },
    ignored:       { tone: 'info',    icon: 'bi-eye-slash-fill',     label: 'Ignored',       help: 'Noise — review periodically' },
    pending:       { tone: 'warning', icon: 'bi-hourglass-split',    label: 'Pending',       help: 'Below trigger threshold — accumulating events' }
};

const ACTIVE_STATUSES = new Set(['new', 'open', 'investigating', 'pending']);

function getStatusConfig(status) {
    return STATUS_CONFIG[(status || '').toLowerCase()] || STATUS_CONFIG.new;
}

function getPriorityChip(priority) {
    const p = parseInt(priority, 10) || 5;
    if (p >= 8) return { variant: 'danger',    label: 'Critical' };
    if (p >= 6) return { variant: 'danger',    label: 'High' };
    if (p >= 4) return { variant: 'warning',   label: 'Medium' };
    if (p >= 2) return { variant: 'secondary', label: 'Low' };
    return { variant: 'secondary', label: 'Info' };
}

function getHeaderIconStyle(status) {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'closed') {
        return { icon: 'bi-shield-check', tone: 'success' };
    }
    if (s === 'paused' || s === 'ignored') {
        return { icon: 'bi-shield', tone: null };
    }
    if (s === 'investigating') {
        return { icon: 'bi-shield-exclamation', tone: 'warning' };
    }
    return { icon: 'bi-shield-exclamation', tone: 'danger' };
}

/** StatusPanel tone selection driven by status + priority */
function _resolvePanelTone(model) {
    const status = (model.get('status') || '').toLowerCase();
    const priority = parseInt(model.get('priority'), 10) || 5;
    if (ACTIVE_STATUSES.has(status)) return priority >= 6 ? 'danger' : 'warning';
    if (status === 'resolved' || status === 'closed') return 'success';
    if (status === 'paused' || status === 'ignored') return 'info';
    return 'primary';
}


// ── Overview Section ────────────────────────────────────────

class IncidentOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'incident-overview-section',
            template: `
                <div data-container="ov-status"></div>
                <div data-container="ov-llm-analysis"></div>
                <div class="detail-kpi-grid">
                    <div data-container="ov-kpi-events"></div>
                    <div data-container="ov-kpi-sources"></div>
                    <div data-container="ov-kpi-last"></div>
                    <div data-container="ov-kpi-related"></div>
                </div>
                <div class="detail-pair">
                    <div data-container="ov-trigger"></div>
                    <div data-container="ov-response"></div>
                </div>
            `,
            ...options
        });
    }

    async onInit() {
        const m = this.model;

        // StatusPanel hero — function-valued options re-resolve against the
        // current model on each render.
        this.statusPanel = new StatusPanel({
            containerId: 'ov-status',
            model: m,
            tone:     mm => _resolvePanelTone(mm),
            state:    mm => this._panelState(mm),
            headline: mm => this._panelHeadline(mm),
            meta:     mm => this._panelMeta(mm),
            actions:  mm => this._panelActions(mm)
        });
        this.addChild(this.statusPanel);

        // LLM analysis (if available) — keyed under its own container
        this._mountLlmAnalysis();

        // KPI cards (default size; no metric-card-lg)
        const eventCount = m.get('event_count') ?? 0;
        const sourceCount = m.get('source_count') ?? (_resolveSourceIPSync(m) ? 1 : 0);
        const relatedCount = m.get('related_count');
        const lastFired = _formatRelative(m.get('modified') || m.get('created')) || '—';

        this.kpiEvents = new MetricCard({
            containerId: 'ov-kpi-events',
            label: 'Events',
            value: String(eventCount),
            tone: eventCount > 10 ? 'danger' : (eventCount > 0 ? 'warning' : 'default')
        });
        this.kpiSources = new MetricCard({
            containerId: 'ov-kpi-sources',
            label: 'Sources',
            value: String(sourceCount)
        });
        this.kpiLast = new MetricCard({
            containerId: 'ov-kpi-last',
            label: 'Last fired',
            value: lastFired
        });
        this.kpiRelated = new MetricCard({
            containerId: 'ov-kpi-related',
            label: 'Related',
            value: relatedCount != null ? String(relatedCount) : '—'
        });
        [this.kpiEvents, this.kpiSources, this.kpiLast, this.kpiRelated].forEach(c => this.addChild(c));

        // Trigger + response cards
        this.triggerCard = new IncidentTriggerCard({
            containerId: 'ov-trigger',
            model: m
        });
        this.triggerCard.on('action:view-ruleset',   () => this.emit('action:view-ruleset'));
        this.triggerCard.on('action:view-source-ip', () => this.emit('action:view-source-ip'));
        this.triggerCard.on('action:view-user', (u)  => this.emit('action:view-user', u));
        this.addChild(this.triggerCard);

        this.responseCard = new IncidentResponseCard({
            containerId: 'ov-response',
            model: m
        });
        this.responseCard.on('action:view-ticket', (t) => this.emit('action:view-ticket', t));
        this.addChild(this.responseCard);
    }

    _mountLlmAnalysis() {
        const metadata = this.model.get('metadata') || {};
        const llmAnalysis = metadata.llm_analysis;
        if (llmAnalysis && !this.llmResultsView) {
            this.llmResultsView = new LLMAnalysisResultsView({
                containerId: 'ov-llm-analysis',
                analysis: llmAnalysis
            });
            this.llmResultsView.on('analyze-llm', () => this.emit('action:analyze-llm'));
            this.addChild(this.llmResultsView);
        }
    }

    /** Re-mount LLM block after async analysis returns */
    async refreshAnalysis() {
        if (this.llmResultsView) {
            this.removeChild(this.llmResultsView);
            this.llmResultsView = null;
        }
        if (this.isMounted()) await this.render();
    }

    // ── StatusPanel narrative resolvers ─────────────────────

    _panelState(model) {
        const status = (model.get('status') || '').toLowerCase();
        const cfg = getStatusConfig(status);
        const created = Number(model.get('created')) || 0;
        const duration = (created && ACTIVE_STATUSES.has(status))
            ? _formatDuration(Math.max(0, Math.floor(Date.now() / 1000) - created))
            : '';
        return duration ? `${cfg.label} · ${duration}` : cfg.label;
    }

    _panelHeadline(model) {
        const status = (model.get('status') || '').toLowerCase();
        const cfg = getStatusConfig(status);
        const created = Number(model.get('created')) || 0;
        const modified = Number(model.get('modified')) || 0;

        if (ACTIVE_STATUSES.has(status)) {
            const duration = created
                ? _formatDuration(Math.max(0, Math.floor(Date.now() / 1000) - created))
                : '';
            return duration ? `In flight for ${duration}` : 'In flight';
        }
        if (status === 'resolved' || status === 'closed') {
            return `Resolved ${_formatRelative(modified)}`;
        }
        return cfg.help || cfg.label;
    }

    /**
     * StatusPanel `meta` is trusted HTML — the framework hands callers a
     * trusted-HTML slot for `<strong>` / `<code>` interpolation. Every
     * model field reaching the slot is escaped via `MOJOUtils.escapeHtml`.
     */
    _panelMeta(model) {
        const cfg = getStatusConfig(model.get('status'));
        const eventCount = model.get('event_count') ?? 0;
        const sourceIp = _resolveSourceIPSync(model);
        const sourceCount = model.get('source_count') ?? (sourceIp ? 1 : 0);
        const modified = Number(model.get('modified')) || 0;
        const lastEventAgo = modified ? _formatRelative(modified) : '';

        const bits = [];
        if (lastEventAgo) bits.push(`Last event <strong>${escapeHtml(lastEventAgo)}</strong>`);
        if (eventCount) {
            const eventLabel = eventCount === 1 ? 'event' : 'events';
            const sourceLabel = sourceCount === 1 ? 'source' : 'sources';
            const tail = sourceCount ? ` from ${escapeHtml(String(sourceCount))} ${sourceLabel}` : '';
            bits.push(`${escapeHtml(String(eventCount))} ${eventLabel}${tail}`);
        }
        if (!bits.length) bits.push(escapeHtml(cfg.help || ''));
        return bits.join(' · ');
    }

    _panelActions(model) {
        const status = (model.get('status') || '').toLowerCase();
        const out = [];
        if (ACTIVE_STATUSES.has(status)) {
            out.push({ label: 'Resolve', action: 'resolve', icon: 'bi-check2-circle', variant: 'success' });
            out.push({ label: 'Assign',  action: 'assign',  icon: 'bi-person',        variant: 'outline-secondary' });
        } else if (status === 'resolved' || status === 'closed') {
            out.push({ label: 'Re-open', action: 'reopen',  icon: 'bi-arrow-counterclockwise', variant: 'outline-primary' });
        } else {
            out.push({ label: 'Resolve', action: 'resolve', icon: 'bi-check2-circle', variant: 'success' });
        }
        return out;
    }

    // StatusPanel actions bubble via standard MOJO action pipeline
    async onActionResolve() { this.emit('action:resolve'); }
    async onActionAssign()  { this.emit('action:assign'); }
    async onActionReopen()  { this.emit('action:reopen'); }
}


// ── "What triggered this" card ─────────────────────────────

/**
 * Card with the rule / category / source / target rows that explain why
 * this incident fired. Mustache template with getter properties; each
 * row is a labelled flat row.
 */
class IncidentTriggerCard extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-funnel"></i>What triggered this</div>
                        {{#hasRows|bool}}
                        <div class="trigger-rows">
                            {{#hasRule|bool}}
                            <div class="detail-flat-row">
                                <div class="detail-flat-row-label">Rule</div>
                                <div class="detail-flat-row-value">
                                    <a href="#" data-action="view-ruleset">{{ruleLabel}}</a>
                                </div>
                            </div>
                            {{/hasRule|bool}}
                            {{#hasCategory|bool}}
                            <div class="detail-flat-row">
                                <div class="detail-flat-row-label">Category</div>
                                <div class="detail-flat-row-value"><code>{{model.category}}</code></div>
                            </div>
                            {{/hasCategory|bool}}
                            {{#hasScope|bool}}
                            <div class="detail-flat-row">
                                <div class="detail-flat-row-label">Scope</div>
                                <div class="detail-flat-row-value"><code>{{model.scope}}</code></div>
                            </div>
                            {{/hasScope|bool}}
                            {{#hasSourceIp|bool}}
                            <div class="detail-flat-row">
                                <div class="detail-flat-row-label">Source IP</div>
                                <div class="detail-flat-row-value">
                                    <a href="#" data-action="view-source-ip"><code>{{sourceIp}}</code></a>
                                </div>
                            </div>
                            {{/hasSourceIp|bool}}
                            {{#hasTargetUser|bool}}
                            <div class="detail-flat-row">
                                <div class="detail-flat-row-label">Targeted user</div>
                                <div class="detail-flat-row-value">
                                    <a href="#" data-action="view-user" data-user="{{targetUser}}">{{targetUser}}</a>
                                </div>
                            </div>
                            {{/hasTargetUser|bool}}
                            {{#hasHostname|bool}}
                            <div class="detail-flat-row">
                                <div class="detail-flat-row-label">Hostname</div>
                                <div class="detail-flat-row-value"><code>{{model.hostname}}</code></div>
                            </div>
                            {{/hasHostname|bool}}
                            {{#hasEventCount|bool}}
                            <div class="detail-flat-row">
                                <div class="detail-flat-row-label">Events</div>
                                <div class="detail-flat-row-value"><strong>{{model.event_count}}</strong></div>
                            </div>
                            {{/hasEventCount|bool}}
                        </div>
                        {{/hasRows|bool}}
                        {{^hasRows|bool}}
                        <div class="text-secondary small">No trigger context recorded.</div>
                        {{/hasRows|bool}}
                    </div>
                </div>
            `,
            ...options
        });
    }

    // ── Computed properties (Mustache reads them off `this`) ──

    get _ruleSet() { return this.model?.get?.('rule_set'); }
    get hasRule() {
        const rs = this._ruleSet;
        return !!(rs && (typeof rs === 'object' ? (rs.id || rs.name) : rs));
    }
    get ruleLabel() {
        const rs = this._ruleSet;
        if (!rs) return '';
        if (typeof rs === 'object' && rs.name) return rs.name;
        const id = typeof rs === 'object' ? rs.id : rs;
        return id ? `RuleSet #${id}` : '';
    }
    get hasCategory() { return !!this.model?.get?.('category'); }
    get hasScope()    { return !!this.model?.get?.('scope'); }
    get hasHostname() { return !!this.model?.get?.('hostname'); }
    get hasEventCount() {
        const c = this.model?.get?.('event_count');
        return c != null;
    }
    get sourceIp()    { return _resolveSourceIPSync(this.model) || ''; }
    get hasSourceIp() { return !!this.sourceIp; }
    get targetUser() {
        const md = this.model?.get?.('metadata') || {};
        return md.user || md.email || md.username || '';
    }
    get hasTargetUser() { return !!this.targetUser; }
    get hasRows() {
        return this.hasRule || this.hasCategory || this.hasScope ||
               this.hasSourceIp || this.hasTargetUser || this.hasHostname ||
               this.hasEventCount;
    }

    async onActionViewRuleset()   { this.emit('action:view-ruleset'); }
    async onActionViewSourceIp()  { this.emit('action:view-source-ip'); }
    async onActionViewUser(event, element) {
        const user = element?.dataset?.user;
        this.emit('action:view-user', user);
    }
}


// ── "What happened next" card (handler-chain Timeline) ─────

/**
 * Card wrapping a `Timeline` of handler-chain events. The Timeline
 * primitive renders the list; this card supplies the title shell.
 */
class IncidentResponseCard extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-tools"></i>What happened next</div>
                        <div data-container="response-timeline"></div>
                    </div>
                </div>
            `,
            ...options
        });
    }

    async onInit() {
        this.timeline = new Timeline({
            containerId: 'response-timeline',
            model: this.model,
            emptyText: 'No handler activity recorded yet.',
            items: (m) => this._buildItems(m)
        });
        this.addChild(this.timeline);
    }

    /**
     * Build the timeline-item list from the incident's `metadata` block.
     * `detail` is trusted HTML — every model-controlled field is escaped
     * here before interpolation (per Timeline's security note).
     */
    _buildItems(model) {
        const m = model || this.model;
        const metadata = m.get('metadata') || {};
        const items = [];

        const handler = metadata.handler_chain || metadata.handler ||
            (m.get('rule_set') && typeof m.get('rule_set') === 'object' ? m.get('rule_set').handler : null);
        if (handler) {
            const chainHtml = String(handler).split(',')
                .map(h => `<code>${escapeHtml(h.trim())}</code>`)
                .join(' → ');
            items.push({
                tone: 'danger',
                headline: 'Handler chain fired',
                detail: chainHtml,
                when: _formatRelative(m.get('created'))
            });
        }

        if (metadata.blocked_ip || metadata.ip_blocked) {
            const ip = metadata.blocked_ip || _resolveSourceIPSync(m);
            const ttl = metadata.block_ttl ? ` · expires in ${escapeHtml(_formatDuration(metadata.block_ttl))}` : '';
            items.push({
                tone: 'warning',
                headline: 'Source IP blocked',
                detail: `<code>${escapeHtml(String(ip || ''))}</code>${ttl}`,
                when: _formatRelative(metadata.blocked_at || m.get('created'))
            });
        }

        const ticketId = metadata.ticket_id || metadata.ticket;
        if (ticketId) {
            items.push({
                tone: 'warning',
                headline: 'Ticket created',
                detail: `<a href="#" data-action="view-ticket" data-ticket="${escapeHtml(String(ticketId))}">#${escapeHtml(String(ticketId))}</a>`,
                when: _formatRelative(metadata.ticket_created_at || m.get('created'))
            });
        }

        const llm = metadata.llm_analysis;
        if (llm) {
            const verdict = llm.verdict || llm.classification || '';
            const conf = llm.confidence != null ? ` · confidence ${escapeHtml(String(llm.confidence))}` : '';
            items.push({
                tone: 'info',
                headline: 'LLM triage completed',
                detail: verdict ? `Verdict: <strong>${escapeHtml(String(verdict))}</strong>${conf}` : 'Analysis complete',
                when: _formatRelative(metadata.llm_analyzed_at || m.get('modified'))
            });
        } else if (metadata.analysis_in_progress) {
            items.push({
                tone: 'info',
                headline: 'LLM triage in progress',
                detail: 'Polling for results…',
                when: 'just now'
            });
        }

        return items;
    }

    async onActionViewTicket(event, element) {
        event.preventDefault();
        const id = element?.dataset?.ticket;
        if (id) this.emit('action:view-ticket', id);
    }
}


// ── LLM Analysis Results (Mustache; bubbles parent actions) ─

class LLMAnalysisResultsView extends View {
    constructor(options = {}) {
        const { analysis = {}, ...rest } = options;
        super({
            className: 'llm-analysis-results mb-3',
            template: `
                <div class="card border-info shadow-sm">
                    <div class="card-header bg-info bg-opacity-10 d-flex align-items-center justify-content-between">
                        <div>
                            <i class="bi bi-robot me-2 text-info"></i>
                            <strong>LLM Analysis</strong>
                            <span class="text-secondary small ms-2">AI-generated triage</span>
                        </div>
                        <button class="btn btn-outline-info btn-sm" data-action="re-analyze">
                            <i class="bi bi-arrow-clockwise me-1"></i>Re-analyze
                        </button>
                    </div>
                    <div class="card-body">
                        {{#summary}}
                        <div class="mb-3">
                            <h6 class="text-secondary mb-2"><i class="bi bi-chat-left-text me-1"></i>Summary</h6>
                            <div class="bg-body-tertiary rounded llm-summary-content">{{{summaryHtml}}}</div>
                        </div>
                        {{/summary}}
                        {{#mergedCount}}
                        <div class="mb-3">
                            <span class="badge bg-primary"><i class="bi bi-union me-1"></i>{{mergedCount}} incident(s) merged</span>
                            <span class="text-secondary small ms-2">IDs: {{mergedIds}}</span>
                        </div>
                        {{/mergedCount}}
                        {{#hasProposedRule|bool}}
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-success"><i class="bi bi-gear me-1"></i>Proposed Rule</span>
                            <button class="btn btn-outline-primary btn-sm" data-action="view-proposed-rule">
                                <i class="bi bi-box-arrow-up-right me-1"></i>View Proposed RuleSet #{{proposedRulesetId}}
                            </button>
                        </div>
                        {{/hasProposedRule|bool}}
                    </div>
                </div>
            `,
            ...rest
        });

        this.analysis = analysis;
        this.summary = analysis.summary || '';
        this.summaryHtml = '';
        this.hasProposedRule = !!(analysis.proposed_ruleset_id);
        this.proposedRulesetId = analysis.proposed_ruleset_id;
        this.mergedCount = (analysis.merged_incidents || []).length;
        this.mergedIds = (analysis.merged_incidents || []).join(', ');
    }

    async onBeforeRender() {
        if (this.summary && !this.summaryHtml) {
            this.summaryHtml = await _renderMarkdown(this, this.summary);
        }
    }

    async onActionReAnalyze() { this.emit('analyze-llm'); }

    async onActionViewProposedRule() {
        if (!this.proposedRulesetId) return;
        try {
            const ruleset = new RuleSet({ id: this.proposedRulesetId });
            await ruleset.fetch();
            await Modal.detail(new RuleSetView({ model: ruleset }));
        } catch (_e) {
            this.getApp()?.toast?.error('Could not load proposed RuleSet');
        }
    }
}


// ── Source Section (IP intel + GeoIP summary) ──────────────

/**
 * Source IP / GeoIP summary section. Mustache template against view-
 * level getter properties; subviews mount via `data-container` slots.
 */
class IncidentSourceSection extends View {
    constructor(options = {}) {
        const { sourceIP, ipInfo, ...rest } = options;
        super({
            className: 'incident-source-section',
            template: `
                {{^hasSourceIp|bool}}
                <div class="text-center text-secondary py-5">
                    <i class="bi bi-globe fs-1 d-block mb-2"></i>
                    <p class="mb-0">No source IP available for this incident.</p>
                </div>
                {{/hasSourceIp|bool}}
                {{#hasSourceIp|bool}}
                {{^hasGeoData|bool}}
                <div class="text-secondary py-3">
                    <i class="bi bi-globe me-2"></i>No GeoIP data available for {{sourceIP}}
                </div>
                {{/hasGeoData|bool}}
                {{#hasGeoData|bool}}
                <div class="detail-section-eyebrow">
                    Source IP
                    <span class="ms-auto">
                        {{{badgesHtml}}}
                    </span>
                </div>
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Address</div>
                    <div class="detail-flat-row-value">
                        <a role="button" class="font-monospace fw-semibold text-decoration-none" data-action="view-geoip">{{sourceIP}}</a>
                    </div>
                </div>
                {{#hasGeoLine|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Location</div>
                    <div class="detail-flat-row-value">{{geoLine}}</div>
                </div>
                {{/hasGeoLine|bool}}
                {{#hasIspLine|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">ISP</div>
                    <div class="detail-flat-row-value">{{ispLine}}</div>
                </div>
                {{/hasIspLine|bool}}
                {{#hasRiskScore|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Risk score</div>
                    <div class="detail-flat-row-value"><code>{{riskScore}}</code></div>
                </div>
                {{/hasRiskScore|bool}}

                <div class="incident-source-actions d-flex flex-wrap gap-2">
                    {{{actionsHtml}}}
                </div>

                <div data-container="src-network"></div>
                <div data-container="src-threat"></div>
                <div data-container="src-flags"></div>
                <div data-container="src-block"></div>
                {{/hasGeoData|bool}}
                {{/hasSourceIp|bool}}
            `,
            ...rest
        });

        this.sourceIP = sourceIP;
        this.ipInfo = ipInfo || null;
        this.geoData = null;
        this.threatLevel = 'Unknown';
        this.threatBadgeClass = 'bg-secondary';
        this.isBlocked = false;
        this.isWhitelisted = false;
        this.blockedReason = '';
        this.geoModel = null;
    }

    // ── Computed properties (Mustache reads them off `this`) ──

    get hasSourceIp() { return !!this.sourceIP; }
    get hasGeoData()  { return !!this.geoData; }
    get geoLine() {
        if (!this.geoData) return '';
        const g = this.geoData;
        return [g.city, g.country_name, g.country_code ? `(${g.country_code})` : null]
            .filter(Boolean).join(' · ');
    }
    get hasGeoLine() { return !!this.geoLine; }
    get ispLine() {
        if (!this.geoData) return '';
        const g = this.geoData;
        return [g.isp, g.asn, g.connection_type].filter(Boolean).join(' · ');
    }
    get hasIspLine() { return !!this.ispLine; }
    get riskScore() { return this.geoData?.risk_score != null ? String(this.geoData.risk_score) : ''; }
    get hasRiskScore() { return this.geoData?.risk_score != null; }
    get badgesHtml() {
        // Trusted-HTML slot — flag badges + threat-level + block/whitelist.
        // Only `threatLevel` (uppercased status text) and the boolean flags
        // come from external data; both sides are escaped before output.
        const g = this.geoData || {};
        const flags = [
            g.is_tor          && `<span class="badge bg-danger-subtle text-danger" title="TOR Exit Node">TOR</span>`,
            g.is_vpn          && `<span class="badge bg-warning-subtle text-warning" title="VPN Detected">VPN</span>`,
            g.is_proxy        && `<span class="badge bg-info-subtle text-info" title="Proxy">Proxy</span>`,
            g.is_datacenter   && `<span class="badge bg-secondary-subtle text-secondary" title="Datacenter">DC</span>`,
            g.is_known_attacker && `<span class="badge bg-danger" title="Known Attacker">Attacker</span>`,
            g.is_known_abuser   && `<span class="badge bg-danger-subtle text-danger" title="Known Abuser">Abuser</span>`
        ].filter(Boolean).join(' ');
        const threat = `<span class="badge ${this.threatBadgeClass}">${escapeHtml(this.threatLevel)}</span>`;
        const blocked = this.isBlocked
            ? `<span class="badge bg-danger ms-1" title="${escapeHtml(this.blockedReason)}"><i class="bi bi-slash-circle me-1"></i>Blocked</span>` : '';
        const wl = this.isWhitelisted
            ? `<span class="badge bg-success ms-1"><i class="bi bi-check-circle me-1"></i>Whitelisted</span>` : '';
        return `${flags} ${threat}${blocked}${wl}`.trim();
    }
    get actionsHtml() {
        // Trusted-HTML slot — every interpolated value is a fixed literal
        // or a normalized number/coordinate (no user-typed strings here).
        const g = this.geoData || {};
        const out = [];
        if (this.isBlocked) {
            out.push(`<button class="btn btn-outline-success btn-sm" data-action="unblock-ip"><i class="bi bi-unlock me-1"></i>Unblock IP</button>`);
        } else {
            out.push(`<button class="btn btn-outline-danger btn-sm" data-action="block-ip"><i class="bi bi-slash-circle me-1"></i>Block IP</button>`);
        }
        if (!this.isWhitelisted) {
            out.push(`<button class="btn btn-outline-primary btn-sm" data-action="whitelist-ip"><i class="bi bi-check-circle me-1"></i>Whitelist</button>`);
        }
        out.push(`<button class="btn btn-outline-secondary btn-sm" data-action="view-geoip"><i class="bi bi-box-arrow-up-right me-1"></i>Open GeoIP details</button>`);
        if (g.latitude != null && g.longitude != null) {
            const lat = encodeURIComponent(g.latitude);
            const lon = encodeURIComponent(g.longitude);
            out.push(`<a class="btn btn-outline-secondary btn-sm" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=10/${lat}/${lon}"><i class="bi bi-geo-alt me-1"></i>View on map</a>`);
        }
        return out.join('');
    }

    async onInit() {
        if (!this.sourceIP) return;
        if (this.ipInfo) {
            this.geoData = this.ipInfo;
            this.geoModel = new GeoLocatedIP(this.ipInfo);
        } else {
            try {
                this.geoModel = await GeoLocatedIP.lookup(this.sourceIP);
                if (this.geoModel) this.geoData = this.geoModel.attributes;
            } catch (_e) { /* no data */ }
        }
        if (this.geoData) {
            this.threatLevel = (this.geoData.threat_level || 'unknown').toUpperCase();
            this.threatBadgeClass = this._threatBadgeClass(this.geoData.threat_level);
            this.isBlocked = !!this.geoData.is_blocked;
            this.isWhitelisted = !!this.geoData.is_whitelisted;
            this.blockedReason = this.geoData.blocked_reason || 'Blocked';
        }
    }

    async onAfterRender() {
        await super.onAfterRender();
        if (!this.geoData) return;
        const ip = this.geoData;
        const ipModel = { get: (key) => ip[key], attributes: ip, on() {}, off() {} };

        if (!this._detailsBuilt) {
            this.networkView = new DataView({
                containerId: 'src-network',
                model: ipModel,
                columns: 2,
                showEmptyValues: false,
                title: 'Network',
                fields: [
                    { name: 'ip_address', label: 'IP Address', cols: 6 },
                    { name: 'subnet', label: 'Subnet', cols: 6 },
                    { name: 'isp', label: 'ISP', cols: 6 },
                    { name: 'asn', label: 'ASN', cols: 3 },
                    { name: 'asn_org', label: 'ASN Org', cols: 3 },
                    { name: 'mobile_carrier', label: 'Mobile Carrier', cols: 6 },
                    { name: 'connection_type', label: 'Connection Type', cols: 6 }
                ]
            });
            this.addChild(this.networkView);
            await this.networkView.render();

            this.threatView = new DataView({
                containerId: 'src-threat',
                model: ipModel,
                columns: 2,
                showEmptyValues: false,
                title: 'Threat assessment',
                fields: [
                    { name: 'threat_level', label: 'Threat Level', formatter: 'badge', cols: 4 },
                    { name: 'risk_score',   label: 'Risk Score', cols: 4 },
                    { name: 'is_threat',    label: 'Threat', formatter: 'yesnoicon', cols: 2 },
                    { name: 'is_suspicious', label: 'Suspicious', formatter: 'yesnoicon', cols: 2 }
                ]
            });
            this.addChild(this.threatView);
            await this.threatView.render();

            this.flagsView = new DataView({
                containerId: 'src-flags',
                model: ipModel,
                columns: 2,
                showEmptyValues: false,
                title: 'Threat flags',
                fields: [
                    { name: 'is_tor', label: 'TOR', formatter: 'yesnoicon', cols: 3 },
                    { name: 'is_vpn', label: 'VPN', formatter: 'yesnoicon', cols: 3 },
                    { name: 'is_proxy', label: 'Proxy', formatter: 'yesnoicon', cols: 3 },
                    { name: 'is_datacenter', label: 'Datacenter', formatter: 'yesnoicon', cols: 3 },
                    { name: 'is_mobile', label: 'Mobile', formatter: 'yesnoicon', cols: 3 },
                    { name: 'is_cloud', label: 'Cloud', formatter: 'yesnoicon', cols: 3 },
                    { name: 'is_known_attacker', label: 'Known Attacker', formatter: 'yesnoicon', cols: 3 },
                    { name: 'is_known_abuser', label: 'Known Abuser', formatter: 'yesnoicon', cols: 3 }
                ]
            });
            this.addChild(this.flagsView);
            await this.flagsView.render();

            this.blockView = new DataView({
                containerId: 'src-block',
                model: ipModel,
                columns: 2,
                showEmptyValues: false,
                title: 'Block status',
                fields: [
                    { name: 'is_blocked', label: 'Blocked', formatter: 'yesnoicon', cols: 3 },
                    { name: 'block_count', label: 'Block Count', cols: 3 },
                    { name: 'is_whitelisted', label: 'Whitelisted', formatter: 'yesnoicon', cols: 3 },
                    { name: 'blocked_reason', label: 'Block Reason', cols: 3 },
                    { name: 'blocked_at', label: 'Blocked At', formatter: 'epoch|datetime', cols: 6 },
                    { name: 'blocked_until', label: 'Blocked Until', formatter: 'epoch|datetime', cols: 6 },
                    { name: 'whitelisted_reason', label: 'Whitelist Reason', cols: 12 }
                ]
            });
            this.addChild(this.blockView);
            await this.blockView.render();
            this._detailsBuilt = true;
        }
    }

    _threatBadgeClass(level) {
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
        const data = await Modal.form({
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
        const resp = await this.geoModel.save({ block: { reason: data.reason, ttl: parseInt(data.ttl) } });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`IP ${this.sourceIP} blocked`);
            await this.geoModel.fetch();
            this.geoData = this.geoModel.attributes;
            this.isBlocked = true;
            this.blockedReason = data.reason;
            this._detailsBuilt = false;
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to block IP');
        }
        return true;
    }

    async onActionUnblockIp() {
        const data = await Modal.form({
            title: `Unblock IP — ${this.sourceIP}`,
            icon: 'bi-unlock',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', placeholder: 'e.g., False positive' }
            ]
        });
        if (!data) return true;
        if (!this.geoModel) return true;
        const resp = await this.geoModel.save({ unblock: data.reason || 'Unblocked from incident view' });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`IP ${this.sourceIP} unblocked`);
            await this.geoModel.fetch();
            this.geoData = this.geoModel.attributes;
            this.isBlocked = false;
            this._detailsBuilt = false;
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to unblock IP');
        }
        return true;
    }

    async onActionWhitelistIp() {
        const data = await Modal.form({
            title: `Whitelist IP — ${this.sourceIP}`,
            icon: 'bi-check-circle',
            size: 'sm',
            fields: [
                { name: 'reason', type: 'text', label: 'Reason', required: true, placeholder: 'e.g., Known office IP' }
            ]
        });
        if (!data) return true;
        if (!this.geoModel) return true;
        const resp = await this.geoModel.save({ whitelist: data.reason });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`IP ${this.sourceIP} whitelisted`);
            await this.geoModel.fetch();
            this.geoData = this.geoModel.attributes;
            this.isWhitelisted = true;
            this.isBlocked = false;
            this._detailsBuilt = false;
            await this.render();
        } else {
            this.getApp()?.toast?.error('Failed to whitelist IP');
        }
        return true;
    }
}


// ── Request Section (HTTP capture, conditional) ────────────

/**
 * HTTP request capture. Flat-row layout via Mustache + getter properties;
 * Headers and Body blocks live below the metadata rows.
 */
class IncidentRequestSection extends View {
    constructor(options = {}) {
        const { metadata = {}, ...rest } = options;
        super({
            className: 'incident-request-section',
            template: `
                <div class="detail-section-eyebrow">Request</div>
                {{#hasAnyField|bool}}
                {{#hasMethod|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Method</div>
                    <div class="detail-flat-row-value"><span class="badge bg-info text-dark">{{httpMethod}}</span></div>
                </div>
                {{/hasMethod|bool}}
                {{#hasStatus|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value"><code>{{httpStatus}}</code></div>
                </div>
                {{/hasStatus|bool}}
                {{#hasHost|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Host</div>
                    <div class="detail-flat-row-value"><code>{{httpHost}}</code></div>
                </div>
                {{/hasHost|bool}}
                {{#hasPath|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Path</div>
                    <div class="detail-flat-row-value"><code>{{httpPath}}</code></div>
                </div>
                {{/hasPath|bool}}
                {{#hasUrl|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">URL</div>
                    <div class="detail-flat-row-value"><code>{{httpUrl}}</code></div>
                </div>
                {{/hasUrl|bool}}
                {{#hasProtocol|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Protocol</div>
                    <div class="detail-flat-row-value"><code>{{httpProtocol}}</code></div>
                </div>
                {{/hasProtocol|bool}}
                {{#hasQueryString|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">Query string</div>
                    <div class="detail-flat-row-value"><code>{{httpQueryString}}</code></div>
                </div>
                {{/hasQueryString|bool}}
                {{#hasUserAgent|bool}}
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label">User agent</div>
                    <div class="detail-flat-row-value"><code>{{httpUserAgent}}</code></div>
                </div>
                {{/hasUserAgent|bool}}
                {{/hasAnyField|bool}}
                {{^hasAnyField|bool}}
                <div class="text-secondary small">No HTTP request fields recorded.</div>
                {{/hasAnyField|bool}}

                {{#hasHeaders|bool}}
                <div class="detail-section-eyebrow">Headers</div>
                <pre class="detail-payload-block"><code>{{headersText}}</code></pre>
                {{/hasHeaders|bool}}

                {{#hasBody|bool}}
                <div class="detail-section-eyebrow">Body</div>
                <pre class="detail-payload-block"><code>{{bodyText}}</code></pre>
                {{/hasBody|bool}}
            `,
            ...rest
        });

        this.metadata = metadata;
    }

    // ── Computed properties ────────────────────────────────

    get httpMethod()       { return this.metadata.http_method || ''; }
    get httpStatus()       { return this.metadata.http_status != null ? String(this.metadata.http_status) : ''; }
    get httpHost()         { return this.metadata.http_host || ''; }
    get httpPath()         { return this.metadata.http_path || ''; }
    get httpUrl()          { return this.metadata.http_url || ''; }
    get httpProtocol()     { return this.metadata.http_protocol || ''; }
    get httpQueryString()  { return this.metadata.http_query_string || ''; }
    get httpUserAgent()    { return this.metadata.http_user_agent || ''; }
    get hasMethod()        { return !!this.httpMethod; }
    get hasStatus()        { return this.metadata.http_status != null; }
    get hasHost()          { return !!this.httpHost; }
    get hasPath()          { return !!this.httpPath; }
    get hasUrl()           { return !!this.httpUrl; }
    get hasProtocol()      { return !!this.httpProtocol; }
    get hasQueryString()   { return !!this.httpQueryString; }
    get hasUserAgent()     { return !!this.httpUserAgent; }
    get hasAnyField() {
        return this.hasMethod || this.hasStatus || this.hasHost || this.hasPath ||
               this.hasUrl || this.hasProtocol || this.hasQueryString || this.hasUserAgent;
    }
    get hasHeaders()  { return !!this.metadata.http_headers; }
    get headersText() {
        const h = this.metadata.http_headers;
        return typeof h === 'string' ? h : JSON.stringify(h, null, 2);
    }
    get hasBody()     { return !!this.metadata.http_body; }
    get bodyText() {
        const b = this.metadata.http_body;
        return typeof b === 'string' ? b : JSON.stringify(b, null, 2);
    }
}


// ── Stack Trace Section (conditional) ──────────────────────

class IncidentStackTraceSection extends View {
    constructor(options = {}) {
        const { stackTrace = '', ...rest } = options;
        super({
            className: 'incident-stack-trace-section',
            template: `
                <div class="detail-section-eyebrow">Stack Trace</div>
                <div data-container="stack-trace-body"></div>
            `,
            ...rest
        });
        this.stackTrace = stackTrace;
    }

    async onInit() {
        try {
            this.body = new StackTraceView({
                containerId: 'stack-trace-body',
                stackTrace: this.stackTrace
            });
            this.addChild(this.body);
        } catch (_e) {
            this.body = new View({
                containerId: 'stack-trace-body',
                template: `<pre class="detail-error-block">{{stackTrace}}</pre>`
            });
            this.body.stackTrace = this.stackTrace;
            this.addChild(this.body);
        }
    }
}


// ── Rule Engine Section ────────────────────────────────────

/**
 * Linked-RuleSet inspector. Already idiomatic Mustache; tightens the
 * eyebrow + button-group layout to match the Wave 3 design language.
 */
class RuleEngineSection extends View {
    constructor(options = {}) {
        const { incident, ...rest } = options;
        super({
            className: 'rule-engine-section',
            template: `
                {{#hasRuleset|bool}}
                    {{#autoDeleteEnabled|bool}}
                        {{^incidentProtected|bool}}
                            <div class="alert alert-warning d-flex align-items-center mb-3" role="alert">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                <div>This incident will be <strong>permanently deleted</strong> when resolved or closed.</div>
                            </div>
                        {{/incidentProtected|bool}}
                        {{#incidentProtected|bool}}
                            <div class="alert alert-info d-flex align-items-center mb-3" role="alert">
                                <i class="bi bi-shield-fill-check me-2"></i>
                                <div>Auto-delete is enabled on this rule, but this incident is <strong>protected</strong> from deletion.</div>
                            </div>
                        {{/incidentProtected|bool}}
                    {{/autoDeleteEnabled|bool}}
                    <div class="detail-section-eyebrow">
                        Linked RuleSet
                        <span class="ms-auto d-flex gap-2">
                            <button class="btn btn-outline-primary btn-sm" data-action="edit-linked-ruleset">
                                <i class="bi bi-pencil me-1"></i>Edit
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" data-action="view-linked-ruleset">
                                <i class="bi bi-box-arrow-up-right me-1"></i>Open
                            </button>
                            <button class="btn btn-outline-success btn-sm" data-action="create-rule-from-incident">
                                <i class="bi bi-plus-circle me-1"></i>New rule
                            </button>
                        </span>
                    </div>
                    <div data-container="ruleset-data"></div>
                    <div class="detail-section-eyebrow">Rule Conditions</div>
                    <div data-container="ruleset-rules"></div>
                {{/hasRuleset|bool}}
                {{^hasRuleset|bool}}
                    <div class="text-center py-5">
                        <div class="text-secondary mb-3"><i class="bi bi-gear fs-1"></i></div>
                        <h6 class="text-secondary">No RuleSet Linked</h6>
                        <p class="text-secondary small mb-3">
                            This incident was not created by a rule engine match.<br>
                            Create a new rule to catch similar events automatically.
                        </p>
                        <button class="btn btn-primary" data-action="create-rule-from-incident">
                            <i class="bi bi-plus-circle me-1"></i>Create Rule from Incident
                        </button>
                    </div>
                {{/hasRuleset|bool}}
            `,
            ...rest
        });

        this.incident = incident;
        const ruleSet = this.incident.get('rule_set');
        this.rulesetId = ruleSet && typeof ruleSet === 'object' ? ruleSet.id : ruleSet;
        this.rulesetModel = null;
        this.hasRuleset = false;
        this.autoDeleteEnabled = false;
        this.incidentProtected = !!(this.incident.get('metadata')?.do_not_delete);
    }

    async onInit() {
        if (!this.rulesetId) return;
        try {
            this.rulesetModel = new RuleSet({ id: this.rulesetId });
            await this.rulesetModel.fetch();
            this.hasRuleset = true;
            this.autoDeleteEnabled = !!(this.rulesetModel.get('metadata')?.delete_on_resolution);
        } catch (_e) {
            return;
        }

        const matchByValue = this.rulesetModel.get('match_by');
        const matchByOption = MatchByOptions.find(opt => opt.value === matchByValue);
        const bundleByValue = this.rulesetModel.get('bundle_by');
        const bundleByOption = BundleByOptions.find(opt => opt.value === bundleByValue);

        this.rulesetDataView = new DataView({
            containerId: 'ruleset-data',
            model: this.rulesetModel,
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
                { name: 'handler', label: 'Handler', cols: 12 }
            ]
        });
        this.addChild(this.rulesetDataView);

        const rulesCollection = new RuleList({ params: { parent: this.rulesetId } });
        this.rulesTable = new TableView({
            containerId: 'ruleset-rules',
            collection: rulesCollection,
            hideActivePillNames: ['parent'],
            columns: [
                { key: 'name', label: 'Name' },
                { key: 'field_name', label: 'Field' },
                { key: 'comparator', label: 'Comparator', width: '110px' },
                { key: 'value', label: 'Value' },
                { key: 'value_type', label: 'Type', width: '80px' }
            ],
            showAdd: false,
            size: 10,
            paginated: false
        });
        this.addChild(this.rulesTable);
    }

    async onActionEditLinkedRuleset() {
        if (!this.rulesetModel) return;
        const resp = await Modal.modelForm({
            title: `Edit RuleSet — ${this.rulesetModel.get('name')}`,
            model: this.rulesetModel,
            formConfig: RuleSetForms.edit
        });
        if (resp) {
            await this.render();
            this.getApp()?.toast?.success('RuleSet updated');
        }
    }

    async onActionViewLinkedRuleset() {
        if (!this.rulesetModel) return;
        await Modal.detail(new RuleSetView({ model: this.rulesetModel }));
    }

    async onActionCreateRuleFromIncident() {
        const incident = this.incident;
        const category = incident.get('category') || '';
        const scope = incident.get('scope') || '';
        const metadata = incident.get('metadata') || {};

        const resp = await Modal.form({
            title: 'Create RuleSet from Incident',
            icon: 'bi-gear-wide-connected',
            formConfig: RuleSetForms.create,
            size: 'lg',
            data: {
                name: `Rule: ${category || 'custom'} (from incident #${incident.get('id')})`,
                category: scope || category,
                priority: 10,
                is_active: false,
                bundle_by: metadata.source_ip ? 4 : 0,
                bundle_minutes: 30,
                match_by: 0
            }
        });
        if (!resp) return;

        const ruleset = new RuleSet();
        const saveResp = await ruleset.save({
            ...resp,
            bundle_by: parseInt(resp.bundle_by),
            bundle_minutes: parseInt(resp.bundle_minutes) || 30,
            match_by: parseInt(resp.match_by) || 0
        });
        if (!saveResp.success && saveResp.status !== 200) {
            this.getApp()?.toast?.error('Failed to create RuleSet');
            return;
        }

        await this.incident.save({ rule_set: ruleset.id });
        this.rulesetId = ruleset.id;
        this.rulesetModel = ruleset;
        this.hasRuleset = true;

        const rulesCreated = await this._showMetadataRulePicker(ruleset, metadata);
        this.getApp()?.toast?.success(rulesCreated
            ? `RuleSet created with ${rulesCreated} rule condition(s)`
            : 'RuleSet created — add rule conditions to activate');

        await Modal.detail(new RuleSetView({ model: ruleset }));
    }

    async _showMetadataRulePicker(ruleset, metadata) {
        const EXCLUDE_FIELDS = new Set([
            'title', 'details', 'scope', 'category', 'source_ip', 'hostname',
            'model_name', 'model_id', 'country_code', 'country_name',
            'latitude', 'longitude', 'stack_trace', 'traceback',
            'do_not_delete', 'delete_on_resolution'
        ]);

        const entries = Object.entries(metadata)
            .filter(([key, val]) => !EXCLUDE_FIELDS.has(key) && val !== null && val !== '' && typeof val !== 'object')
            .map(([key, val]) => ({ key, value: val, type: _inferValueType(val) }));
        if (!entries.length) return 0;

        const fields = [
            {
                type: 'html', columns: 12,
                html: `<div class="text-secondary small mb-3">
                    Select metadata fields to create as rule conditions.
                    Each selected field becomes an <code>==</code> match rule.
                </div>`
            },
            ...entries.map(e => ({
                name: `rule__${e.key}`,
                type: 'switch',
                label: `${e.key}  =  ${_truncate(String(e.value), 30)}`,
                tooltip: `${e.type}: ${String(e.value)}`,
                value: false,
                columns: 6
            }))
        ];

        const pickerResp = await Modal.form({
            title: 'Create Rules from Metadata',
            icon: 'bi-list-check',
            size: 'lg',
            fields,
            submitText: 'Create Rules',
            cancelText: 'Skip'
        });
        if (!pickerResp) return 0;

        const selected = entries.filter(e => pickerResp[`rule__${e.key}`]);
        if (!selected.length) return 0;

        const app = this.getApp();
        try {
            await Promise.all(selected.map((e, i) => {
                const rule = new Rule();
                return rule.save({
                    parent: ruleset.id,
                    name: `Match ${e.key}`,
                    field_name: e.key,
                    comparator: '==',
                    value: String(e.value),
                    value_type: e.type,
                    index: i
                });
            }));
        } catch (_err) {
            app?.toast?.warning('Some rule conditions failed to save');
        }
        return selected.length;
    }
}


// ── Tickets Section ─────────────────────────────────────────

class IncidentTicketsSection extends View {
    constructor(options = {}) {
        const { incident, collection, ...rest } = options;
        super({
            className: 'incident-tickets-section',
            template: `
                <div class="detail-section-eyebrow">
                    Related Tickets
                    <span class="ms-auto">
                        <button class="btn btn-primary btn-sm" data-action="create-ticket">
                            <i class="bi bi-plus-circle me-1"></i>Create Ticket
                        </button>
                    </span>
                </div>
                <div data-container="tickets-table"></div>
            `,
            ...rest
        });

        this.incident = incident;
        this.collection = collection || new TicketList({
            params: { incident: this.incident.get('id'), sort: '-created' }
        });
    }

    async onInit() {
        this.ticketsTable = new TableView({
            containerId: 'tickets-table',
            collection: this.collection,
            hideActivePillNames: ['incident'],
            columns: [
                { key: 'id', label: 'ID', width: '60px', sortable: true },
                { key: 'created', label: 'Created', formatter: 'epoch|datetime', sortable: true, width: '160px' },
                { key: 'status', label: 'Status', formatter: 'badge', width: '100px' },
                { key: 'category', label: 'Category', formatter: 'badge', width: '120px' },
                { key: 'priority', label: 'Priority', width: '80px', sortable: true },
                { key: 'title', label: 'Title' }
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
        this.emit('action:create-ticket');
    }
}


// ── Related Incidents Section (RelatedIncidentsList) ───────

class RelatedIncidentsSection extends View {
    constructor(options = {}) {
        const { collection, ...rest } = options;
        super({
            className: 'related-incidents-section',
            template: `
                <div class="detail-section-eyebrow">Related Incidents</div>
                <div class="text-secondary small mb-2">Incidents sharing the same source IP, rule, host, or category.</div>
                <div data-container="related-table"></div>
            `,
            ...rest
        });

        this.collection = collection;
    }

    async onInit() {
        this.relatedTable = new TableView({
            containerId: 'related-table',
            collection: this.collection,
            hideActivePillNames: [
                'id__not', 'source_ip', 'rule_set', 'group',
                'hostname', 'category', 'status'
            ],
            columns: [
                { key: 'id', label: 'ID', width: '60px', sortable: true },
                { key: 'created', label: 'Created', formatter: 'epoch|datetime', sortable: true, width: '160px' },
                { key: 'status', label: 'Status', formatter: 'badge', width: '100px' },
                { key: 'category', label: 'Category', formatter: 'badge' },
                { key: 'priority', label: 'Priority', width: '80px', sortable: true },
                { key: 'title', label: 'Title', formatter: "truncate(60)|default('—')" }
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


// ── History Section (ChatView wrapper) ─────────────────────

/**
 * History section — wraps the existing `ChatView` adapter for the
 * incident audit / comments / status-change feed. Adds a labelled
 * eyebrow above the chat surface to match the section pattern.
 */
class IncidentHistorySection extends View {
    constructor(options = {}) {
        const { incidentId, ...rest } = options;
        super({
            className: 'incident-history-section',
            template: `
                <div class="detail-section-eyebrow">History</div>
                <div data-container="history-chat"></div>
            `,
            ...rest
        });
        this.incidentId = incidentId;
    }

    async onInit() {
        this.adapter = new IncidentHistoryAdapter(this.incidentId);
        this.chatView = new ChatView({
            containerId: 'history-chat',
            adapter: this.adapter
        });
        this.addChild(this.chatView);
    }
}


// ── Metadata Section (KnownFieldsCard) ─────────────────────

/**
 * Metadata section — promotes well-known JSON keys via the framework's
 * `KnownFieldsCard` primitive. The card handles the labelled-row grid
 * + collapsible raw `<details>` block; this section just wraps it with
 * an eyebrow and the edit affordance.
 */
class IncidentMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'incident-metadata-section',
            template: `
                <div class="detail-section-eyebrow">
                    Metadata
                    <button class="detail-section-action" data-action="edit-metadata" title="{{#hasMetadata|bool}}Edit JSON{{/hasMetadata|bool}}{{^hasMetadata|bool}}Add metadata{{/hasMetadata|bool}}">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
                {{^hasMetadata|bool}}
                <div class="text-secondary small">No metadata is set on this incident.</div>
                {{/hasMetadata|bool}}
                {{#hasMetadata|bool}}
                <div data-container="metadata-card"></div>
                {{/hasMetadata|bool}}
            `,
            ...options
        });
    }

    get hasMetadata() {
        const md = this.model?.get?.('metadata') || {};
        return Object.keys(md).length > 0;
    }

    async onInit() {
        // KnownFieldsCard handles the labelled grid + collapsible raw blob.
        // `data` is function-valued so it re-resolves against the latest
        // metadata when the parent re-renders this section after an edit.
        this.metadataCard = new KnownFieldsCard({
            containerId: 'metadata-card',
            model: this.model,
            data: (m) => m.get('metadata') || {},
            knownKeys: [
                { key: 'source_ip',     label: 'Source IP',     formatter: (v) => `<code>${escapeHtml(String(v))}</code>` },
                { key: 'hostname',      label: 'Hostname',      formatter: (v) => `<code>${escapeHtml(String(v))}</code>` },
                { key: 'user_agent',    label: 'User agent' },
                { key: 'http_url',      label: 'URL',           formatter: (v) => `<code>${escapeHtml(String(v))}</code>` },
                { key: 'http_method',   label: 'HTTP method',   formatter: (v) => `<span class="badge bg-info text-dark">${escapeHtml(String(v))}</span>` },
                { key: 'http_status',   label: 'HTTP status',   formatter: (v) => `<code>${escapeHtml(String(v))}</code>` },
                { key: 'country_code',  label: 'Country' },
                { key: 'region',        label: 'Region' },
                { key: 'city',          label: 'City' },
                { key: 'request_path',  label: 'Request path',  formatter: (v) => `<code>${escapeHtml(String(v))}</code>` },
                { key: 'user',          label: 'User' },
                { key: 'component',     label: 'Component' },
                { key: 'component_id',  label: 'Component ID' },
                { key: 'error_class',   label: 'Error class',   formatter: (v) => `<code>${escapeHtml(String(v))}</code>` },
                { key: 'error_message', label: 'Error message' },
                { key: 'rule_id',       label: 'Rule ID' },
                { key: 'risk_score',    label: 'Risk score' },
                { key: 'action',        label: 'Action' },
                { key: 'trigger',       label: 'Trigger' },
                { key: 'do_not_delete', label: 'Protected',     formatter: 'yesnoicon', hideEmpty: true }
            ],
            rawLabel: 'Raw metadata'
        });
        this.addChild(this.metadataCard);
    }

    async onActionEditMetadata() {
        this.emit('action:edit-metadata');
    }
}


// ── IncidentView (assembly) ────────────────────────────────

class IncidentView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Incident(options.data || {});
        const incidentId = model.get('id');
        const sourceIP = _resolveSourceIPSync(model);
        const metadata = model.get('metadata') || {};

        // Pre-create shared collections
        const eventsCollection = new IncidentEventList({ params: { incident: incidentId } });
        const ticketsCollection = new TicketList({
            params: { incident: incidentId, sort: '-created' }
        });
        const relatedCollection = new RelatedIncidentsList({
            sourceIp: sourceIP || undefined,
            ruleSet:  (model.get('rule_set') && typeof model.get('rule_set') === 'object'
                ? model.get('rule_set').id
                : model.get('rule_set')) || undefined,
            group:    model.get('group') || undefined,
            hostname: model.get('hostname') || undefined,
            category: !sourceIP ? (model.get('category') || undefined) : undefined,
            params: { id__not: incidentId, size: 10 }
        });

        // ── Section views ─────────────────────────────────
        const overviewSection = new IncidentOverviewSection({ model });

        const eventsSection = new TableView({
            collection: eventsCollection,
            hideActivePillNames: ['incident'],
            columns: [
                { key: 'id', label: 'ID', width: '50px', sortable: true },
                {
                    key: 'created', label: 'Date / Category', sortable: true, width: '160px',
                    template: `<div>{{{model.created|epoch|datetime}}}</div><div class="text-secondary small">{{{model.category|badge}}}</div>`
                },
                {
                    key: 'source_ip', label: 'Source', sortable: true, width: '130px',
                    template: `<div>{{model.hostname}}</div><div class="text-secondary small">{{model.source_ip}}</div>`,
                    filter: { type: 'text' }
                },
                { key: 'title', label: 'Title', sortable: true, formatter: "truncate(80)|default('—')" },
                { key: 'level', label: 'Level', sortable: true, width: '60px', filter: { type: 'text' } }
            ],
            showAdd: false,
            actions: ['view'],
            paginated: true,
            size: 10
        });

        const sourceSection = sourceIP
            ? new IncidentSourceSection({ sourceIP, ipInfo: model.get('ip_info') })
            : null;

        const hasHttp = !!(metadata.http_method || metadata.http_path || metadata.http_url);
        const requestSection = hasHttp ? new IncidentRequestSection({ metadata }) : null;

        const stackTraceText = metadata.stack_trace || metadata.traceback || '';
        const stackTraceSection = stackTraceText ? new IncidentStackTraceSection({ stackTrace: stackTraceText }) : null;

        const ruleEngineSection = new RuleEngineSection({ incident: model });
        const ticketsSection = new IncidentTicketsSection({ incident: model, collection: ticketsCollection });
        const historySection = new IncidentHistorySection({ incidentId });
        const relatedSection = new RelatedIncidentsSection({ collection: relatedCollection });
        const metadataSection = new IncidentMetadataSection({ model });

        // ── Sections list ─────────────────────────────────
        const sections = [
            { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection },
            { key: 'Events',   label: 'Events',   icon: 'bi-list-ul',  view: eventsSection }
        ];
        if (sourceSection || requestSection || stackTraceSection) {
            sections.push({ type: 'divider', label: 'Investigation' });
            if (sourceSection) {
                sections.push({ key: 'Source', label: 'Source', icon: 'bi-globe2', view: sourceSection });
            }
            if (requestSection) {
                sections.push({ key: 'Request', label: 'Request', icon: 'bi-funnel', view: requestSection });
            }
            if (stackTraceSection) {
                sections.push({ key: 'StackTrace', label: 'Stack Trace', icon: 'bi-code-square', view: stackTraceSection });
            }
        }

        sections.push({ type: 'divider', label: 'Response' });
        sections.push({ key: 'RuleEngine', label: 'Rule Engine', icon: 'bi-tools',           view: ruleEngineSection });
        sections.push({ key: 'Tickets',    label: 'Tickets',     icon: 'bi-ticket-detailed', view: ticketsSection });
        sections.push({ key: 'History',    label: 'History',     icon: 'bi-chat-left-text',  view: historySection });

        sections.push({ type: 'divider', label: 'Related' });
        sections.push({ key: 'Related',  label: 'Related',  icon: 'bi-diagram-2', view: relatedSection });
        sections.push({ key: 'Metadata', label: 'Metadata', icon: 'bi-braces',    view: metadataSection });

        // ── Header config ────────────────────────────────
        const chips = [
            { icon: 'bi-flag-fill', text: m => {
                const p = parseInt(m.get('priority'), 10);
                if (!p) return null;
                return `P${p} · ${getPriorityChip(p).label}`;
              }, variant: m => getPriorityChip(parseInt(m.get('priority'), 10) || 5).variant },
            { icon: 'bi-circle-fill', text: m => getStatusConfig(m.get('status')).label,
              variant: m => {
                  const tone = getStatusConfig(m.get('status')).tone;
                  return tone === 'success' ? 'success' : (tone === 'danger' ? 'danger' : (tone === 'warning' ? 'warning' : 'light'));
              } },
            { icon: 'bi-tag-fill', textPath: 'category', variant: 'light',
              when: m => !!m.get('category') },
            { textPath: 'scope', variant: 'light',
              when: m => !!m.get('scope') && m.get('scope') !== m.get('category') },
            { icon: 'bi-hdd-network', textPath: 'hostname', variant: 'light',
              when: m => !!m.get('hostname') },
            { icon: 'bi-list-ul', text: m => {
                const c = m.get('event_count');
                return c != null ? `${c} ${c === 1 ? 'event' : 'events'}` : null;
              }, variant: 'light' },
            { icon: 'bi-shield-fill-check', text: 'Protected', variant: 'warning',
              when: m => !!(m.get('metadata')?.do_not_delete) }
        ];

        // Context menu — long-tail; primary actions live on the StatusPanel.
        const cmItems = [];
        cmItems.push({ label: 'Re-run handler chain', action: 'rerun-handler', icon: 'bi-arrow-clockwise' });
        if (sourceIP) {
            cmItems.push({ label: `View source IP (${sourceIP})`, action: 'view-source-geoip', icon: 'bi-globe' });
        }
        const targetUser = metadata.user || metadata.email || metadata.username;
        if (targetUser) {
            cmItems.push({ label: `View user (${_truncate(String(targetUser), 30)})`, action: 'view-user', icon: 'bi-person' });
        }
        if (model.get('rule_set')) {
            cmItems.push({ label: 'View ruleset', action: 'view-ruleset', icon: 'bi-gear-wide-connected' });
        }
        cmItems.push({ type: 'divider' });
        cmItems.push({ label: 'Mark as duplicate', action: 'mark-duplicate', icon: 'bi-files' });
        cmItems.push({ label: 'Snooze',            action: 'snooze',         icon: 'bi-moon' });
        cmItems.push({ label: 'Edit Incident',     action: 'edit-incident',  icon: 'bi-pencil' });
        cmItems.push({ label: 'Change Priority',   action: 'change-priority', icon: 'bi-arrow-up-circle' });
        if (metadata.do_not_delete) {
            cmItems.push({ label: 'Remove Protection', action: 'remove-protection', icon: 'bi-shield' });
        } else {
            cmItems.push({ label: 'Protect from Deletion', action: 'protect-incident', icon: 'bi-shield-fill-check' });
        }
        cmItems.push({ label: 'Create Ticket',     action: 'create-ticket', icon: 'bi-ticket-perforated' });
        cmItems.push({ label: 'Merge Incidents',   action: 'merge-incidents', icon: 'bi-union' });
        cmItems.push({ type: 'divider' });
        cmItems.push({ label: 'Ask AI',            action: 'ask-ai',        icon: 'bi-chat-dots' });
        cmItems.push({ label: 'LLM Analyze',       action: 'analyze-llm',   icon: 'bi-robot' });
        cmItems.push({ type: 'divider' });
        cmItems.push({
            label: metadata.do_not_delete ? 'Delete Incident (protected)' : 'Delete Incident',
            action: 'delete-incident',
            icon: 'bi-trash',
            danger: true,
            disabled: !!metadata.do_not_delete
        });

        super({
            className: 'incident-view',
            ...options,
            model,
            header: {
                icon: getHeaderIconStyle(model.get('status')).icon,
                iconToneFn: m => getHeaderIconStyle(m.get('status')).tone,
                titleFn: m => m.get('title') || m.get('category') || `Incident #${m.get('id') || ''}`.trim(),
                subtitleFn: m => _buildSubtitle(m),
                chips: IncidentView._adaptChips(chips),
                // auxFn — state-aware right-gutter readout. Trusted HTML;
                // model fields escaped before interpolation.
                auxFn: m => _buildHeaderAux(m),
                actions: [], // Primary actions live on the StatusPanel; header keeps overflow + close
                contextMenu: { items: cmItems }
            },
            sections,
            activeSection: 'Overview',
            navWidth: 200,
            minWidth: 600
        });

        // Stash references
        this.eventsCollection = eventsCollection;
        this.ticketsCollection = ticketsCollection;
        this.relatedCollection = relatedCollection;
        this.overviewSection = overviewSection;
        this.eventsSection = eventsSection;
        this.sourceSection = sourceSection;
        this.requestSection = requestSection;
        this.stackTraceSection = stackTraceSection;
        this.ruleEngineSection = ruleEngineSection;
        this.ticketsSection = ticketsSection;
        this.historySection = historySection;
        this.relatedSection = relatedSection;
        this.metadataSection = metadataSection;
        this._sourceIP = sourceIP;
    }

    /**
     * `DetailHeaderView` chip schema accepts a function for `text` but
     * expects `variant` to be a static string. Pre-resolve dynamic
     * variants by snapshotting the model in `text` and exposing the
     * variant via a getter.
     */
    static _adaptChips(chips) {
        return chips.map(chip => {
            if (typeof chip.variant !== 'function') return chip;
            const adapted = { ...chip };
            const variantFn = chip.variant;
            let _model;
            const origText = chip.text;
            adapted.text = (m) => { _model = m; return typeof origText === 'function' ? origText(m) : origText; };
            Object.defineProperty(adapted, 'variant', {
                get() { return _model ? variantFn(_model) : 'light'; },
                enumerable: true
            });
            return adapted;
        });
    }

    async onAfterBuild() {
        // Wire overview action emits to top-level handlers
        this.overviewSection.on('action:resolve',       () => this.onActionResolve());
        this.overviewSection.on('action:assign',        () => this.onActionAssign());
        this.overviewSection.on('action:reopen',        () => this.onActionReopen());
        this.overviewSection.on('action:view-ruleset',  () => this.onActionViewRuleset());
        this.overviewSection.on('action:view-source-ip', () => this.onActionViewSourceGeoip());
        this.overviewSection.on('action:view-user',     (u) => this._openUser(u));
        this.overviewSection.on('action:view-ticket',   (t) => this._openTicket(t));
        this.overviewSection.on('action:analyze-llm',   () => this.onActionAnalyzeLlm());

        this.ticketsSection.on('action:create-ticket', () => this._handleCreateTicket());
        this.metadataSection.on('action:edit-metadata',  () => this.onActionEditMetadata());

        // Sidebar badges
        this._updateBadges();
        this.eventsCollection.on('fetch:success',  () => this._updateBadges(), this);
        this.ticketsCollection.on('fetch:success', () => this._updateBadges(), this);
        this.relatedCollection.on('fetch:success', () => this._updateBadges(), this);

        // Fetch the detailed graph + activity tables
        try {
            this.getApp()?.showLoading?.();
            await this.model.fetch({ params: { graph: 'detailed' } });
        } catch (_e) { /* fail silent */ }
        finally { this.getApp()?.hideLoading?.(); }

        // Background fetches for tables
        this.eventsCollection.fetch().catch(() => {});
        this.ticketsCollection.fetch().catch(() => {});
        this.relatedCollection.fetch().catch(() => {});

        // Header may need to re-render with detailed-graph fields
        if (this.headerView?.isMounted()) await this.headerView.render();
    }

    _updateBadges() {
        const eventCount = this.eventsCollection.totalCount ?? this.eventsCollection.models?.length ?? 0;
        const ticketCount = this.ticketsCollection.totalCount ?? this.ticketsCollection.models?.length ?? 0;
        const relatedCount = this.relatedCollection.totalCount ?? this.relatedCollection.models?.length ?? 0;

        if (eventCount > 0) {
            this.setBadge('Events', { text: String(eventCount), variant: eventCount > 10 ? 'danger' : 'muted' });
        }
        if (ticketCount > 0) {
            this.setBadge('Tickets', { text: String(ticketCount), variant: 'warning' });
        }
        if (relatedCount > 0) {
            this.setBadge('Related', { text: String(relatedCount), variant: 'muted' });
        }
    }

    /** Re-render the header + overview after a status / metadata change */
    async _refreshFromModel() {
        // Refresh the header icon glyph for the new status (tone is handled
        // by iconToneFn automatically on header re-render).
        this.headerView.icon = getHeaderIconStyle(this.model.get('status')).icon;
        if (this.headerView?.isMounted()) await this.headerView.render();
        if (this.overviewSection?.isMounted()) await this.overviewSection.render();
    }

    // ── Actions ────────────────────────────────────────────

    async onActionResolve() {
        await this._setStatus('resolved');
    }

    async onActionAssign() {
        const data = await Modal.form({
            title: `Assign Incident #${this.model.get('id')}`,
            icon: 'bi-person',
            size: 'sm',
            fields: [
                { name: 'assignee', type: 'text', label: 'Assignee (username or email)', required: true }
            ]
        });
        if (!data) return;
        await this.model.save({ 'metadata.assignee': data.assignee, status: 'investigating' });
        this.getApp()?.toast?.success(`Assigned to ${data.assignee}`);
        await this._refreshFromModel();
        this.emit('detail:updated');
    }

    async onActionReopen() {
        await this._setStatus('open');
    }

    async _setStatus(status) {
        await this.model.save({ status });
        this.getApp()?.toast?.success(`Status changed to ${status}`);
        await this._refreshFromModel();
        this.emit('detail:updated');
    }

    async onActionRerunHandler() {
        const ok = await Modal.confirm(
            'Re-run the handler chain for this incident? The configured handlers will fire again as if the incident just triggered.',
            'Re-run handler chain'
        );
        if (!ok) return;
        try {
            const resp = await this.model.save({ rerun_handler: 1 });
            if (resp.success || resp.status === 200) {
                this.getApp()?.toast?.success('Handler chain re-run requested');
                await this.model.fetch({ params: { graph: 'detailed' } });
                await this._refreshFromModel();
            } else {
                this.getApp()?.toast?.error('Failed to re-run handler chain');
            }
        } catch (err) {
            this.getApp()?.toast?.error(err.message || 'Failed to re-run handler chain');
        }
    }

    async onActionViewSourceGeoip() {
        if (this._sourceIP) await GeoIPView.show(this._sourceIP);
    }

    async onActionViewUser() {
        const metadata = this.model.get('metadata') || {};
        const user = metadata.user || metadata.email || metadata.username;
        await this._openUser(user);
    }

    async _openUser(user) {
        if (!user) {
            this.getApp()?.toast?.warning('No user attached to this incident');
            return;
        }
        try {
            const { default: UserView } = await import('../account/users/UserView.js');
            const { User } = await import('@core/models/User.js');
            const userModel = new User({ email: user });
            try { await userModel.fetch({ params: { email: user } }); } catch (_) {}
            await Modal.detail(new UserView({ model: userModel }));
        } catch (_e) {
            this.getApp()?.toast?.info(`User: ${user}`);
        }
    }

    async _openTicket(ticketId) {
        if (!ticketId) return;
        try {
            const ticket = new Ticket({ id: ticketId });
            await ticket.fetch();
            const { default: TicketView } = await import('./TicketView.js');
            await Modal.show(new TicketView({ model: ticket }), { size: 'lg' });
        } catch (_e) {
            this.getApp()?.toast?.error('Could not load ticket');
        }
    }

    async onActionViewRuleset() {
        const ruleSet = this.model.get('rule_set');
        const id = (ruleSet && typeof ruleSet === 'object') ? ruleSet.id : ruleSet;
        if (!id) return;
        try {
            const rs = new RuleSet({ id });
            await rs.fetch();
            await Modal.detail(new RuleSetView({ model: rs }));
        } catch (_e) {
            this.getApp()?.toast?.error('Could not load RuleSet');
        }
    }

    async onActionMarkDuplicate() {
        const data = await Modal.form({
            title: 'Mark as duplicate',
            icon: 'bi-files',
            size: 'sm',
            fields: [
                { name: 'parent_id', type: 'number', label: 'Parent incident ID', required: true,
                  help: 'Events from this incident will be merged into the parent.' }
            ]
        });
        if (!data) return;
        const parentId = parseInt(data.parent_id, 10);
        if (!parentId || parentId === this.model.id) return;
        try {
            const parent = new Incident({ id: parentId });
            const resp = await parent.save({ merge: [this.model.id] });
            if (resp.success || resp.status === 200) {
                this.getApp()?.toast?.success(`Marked as duplicate of #${parentId}`);
                this.emit('incident:deleted', { model: this.model });
                this._closeModal();
            } else {
                this.getApp()?.toast?.error('Failed to mark as duplicate');
            }
        } catch (err) {
            this.getApp()?.toast?.error(err.message || 'Failed to mark as duplicate');
        }
    }

    async onActionSnooze() {
        const data = await Modal.form({
            title: 'Snooze incident',
            icon: 'bi-moon',
            size: 'sm',
            fields: [
                {
                    name: 'until', type: 'select', label: 'Snooze for',
                    options: [
                        { value: 3600,    label: '1 hour' },
                        { value: 14400,   label: '4 hours' },
                        { value: 86400,   label: '24 hours' },
                        { value: 604800,  label: '7 days' }
                    ],
                    value: 86400
                }
            ]
        });
        if (!data) return;
        const until = Math.floor(Date.now() / 1000) + parseInt(data.until, 10);
        await this.model.save({ status: 'paused', 'metadata.snooze_until': until });
        this.getApp()?.toast?.success('Incident snoozed');
        await this._refreshFromModel();
    }

    async onActionEditIncident() {
        const resp = await Modal.modelForm({
            title: `Edit Incident #${this.model.id}`,
            model: this.model,
            formConfig: IncidentForms.edit
        });
        if (resp) {
            await this._refreshFromModel();
            this.emit('detail:updated');
        }
    }

    async onActionChangePriority() {
        const data = await Modal.form({
            title: 'Change Priority',
            icon: 'bi-arrow-up-circle',
            size: 'sm',
            fields: [
                {
                    name: 'priority', type: 'select', label: 'Priority',
                    value: this.model.get('priority') || 5,
                    options: [
                        { value: 10, label: '10 — Critical' },
                        { value: 9,  label: '9 — Critical' },
                        { value: 8,  label: '8 — High' },
                        { value: 7,  label: '7 — High' },
                        { value: 6,  label: '6 — Medium' },
                        { value: 5,  label: '5 — Medium' },
                        { value: 4,  label: '4 — Low' },
                        { value: 3,  label: '3 — Low' },
                        { value: 2,  label: '2 — Info' },
                        { value: 1,  label: '1 — Info' }
                    ]
                }
            ]
        });
        if (!data) return;
        await this.model.save({ priority: parseInt(data.priority) });
        this.getApp()?.toast?.success(`Priority changed to ${data.priority}`);
        await this._refreshFromModel();
    }

    async onActionProtectIncident() {
        await this.model.save({ 'metadata.do_not_delete': true });
        this.getApp()?.toast?.success('Incident protected from deletion');
        await this._refreshFromModel();
    }

    async onActionRemoveProtection() {
        await this.model.save({ 'metadata.do_not_delete': false });
        this.getApp()?.toast?.success('Deletion protection removed');
        await this._refreshFromModel();
    }

    async onActionCreateTicket() {
        await this._handleCreateTicket();
    }

    async _handleCreateTicket() {
        const incident = this.model;
        const title = `Incident #${incident.get('id')}: ${incident.get('category') || incident.get('title') || 'Investigation'}`;

        const data = await Modal.form({
            ...TicketForms.create,
            fields: TicketForms.create.fields.map(f => {
                if (f.name === 'title') return { ...f, value: title };
                if (f.name === 'category') return { ...f, value: 'incident' };
                if (f.name === 'priority') return { ...f, value: incident.get('priority') || 5 };
                if (f.name === 'incident') return { ...f, value: incident.get('id'), type: 'hidden' };
                return f;
            })
        });
        if (!data) return;

        const ticket = new Ticket();
        const resp = await ticket.save({ ...data, incident: incident.get('id') });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success('Ticket created');
            this.ticketsCollection.fetch();
        } else {
            this.getApp()?.toast?.error('Failed to create ticket');
        }
    }

    async onActionMergeIncidents() {
        const data = await Modal.form({
            title: 'Merge Incidents',
            icon: 'bi-union',
            size: 'sm',
            fields: [
                {
                    name: 'merge_ids', type: 'text', label: 'Incident IDs to merge into this one',
                    required: true,
                    placeholder: 'e.g., 102, 105, 108',
                    help: 'Comma-separated IDs.'
                }
            ]
        });
        if (!data) return;
        const mergeIds = data.merge_ids.split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => n && n !== this.model.id);
        if (!mergeIds.length) return;

        const resp = await this.model.save({ merge: mergeIds });
        if (resp.success || resp.status === 200) {
            this.getApp()?.toast?.success(`Merged ${mergeIds.length} incident(s)`);
            await this._refreshFromModel();
        } else {
            this.getApp()?.toast?.error('Merge failed');
        }
    }

    async onActionAskAi() {
        await openAssistantChat(this, 'incident.Incident');
    }

    async onActionAnalyzeLlm() {
        const confirmed = await Modal.confirm(
            'Run LLM analysis on this incident? The AI agent will review all events, ' +
            'attempt to merge related incidents, and propose a new rule. ' +
            'Status will be set to "investigating".',
            'LLM Analysis',
            { confirmText: 'Analyze', confirmClass: 'btn-info' }
        );
        if (!confirmed) return;

        const app = this.getApp();
        app?.showLoading?.('Starting LLM analysis...');
        try {
            const resp = await this.model.save({ analyze: 1 });
            if (!resp.success && resp.status !== 200) {
                app?.toast?.error(resp.data?.error || resp.error || 'Failed to start analysis');
                return;
            }
            app?.toast?.success('LLM analysis started — polling for results…');
            this._pollAnalysisProgress();
        } catch (error) {
            app?.toast?.error(`Analysis failed: ${error.message}`);
        } finally {
            app?.hideLoading?.();
        }
    }

    _pollAnalysisProgress() {
        const maxAttempts = 60;
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
                            this.getApp()?.toast?.success('LLM analysis complete');
                            this.overviewSection?.refreshAnalysis();
                        } else {
                            this.getApp()?.toast?.success('Analysis finished');
                        }
                        this._refreshFromModel();
                        return;
                    }
                    poll();
                }).catch(() => poll());
            }, pollInterval);
        };
        poll();
    }

    async onActionEditMetadata() {
        const current = this.model.get('metadata') || {};
        const initial = JSON.stringify(current, null, 2);

        const resp = await Modal.form({
            title: 'Edit metadata (JSON)',
            icon: 'bi-braces',
            size: 'lg',
            fields: [
                {
                    type: 'html', columns: 12,
                    html: `<div class="alert alert-info small mb-3">
                        <i class="bi bi-info-circle me-1"></i>
                        Free-form JSON object. Backend auto-merges keys.
                    </div>`
                },
                {
                    name: 'metadata_json', type: 'textarea', label: 'Metadata',
                    rows: 16, columns: 12, value: initial,
                    placeholder: '{ "key": "value" }'
                }
            ],
            submitText: 'Save',
            cancelText: 'Cancel'
        });
        if (!resp) return;

        let parsed;
        try {
            parsed = JSON.parse(resp.metadata_json);
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Metadata must be a JSON object.');
            }
        } catch (err) {
            this.getApp()?.toast?.error(`Invalid JSON: ${err.message}`);
            return;
        }
        try {
            const saveResp = await this.model.save({ metadata: parsed });
            if (saveResp && saveResp.status && saveResp.status >= 400) {
                throw new Error('Save failed');
            }
            this.model.set('metadata', parsed);
            this.getApp()?.toast?.success('Metadata updated');
            await this._refreshFromModel();
            if (this.metadataSection?.isMounted()) await this.metadataSection.render();
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to save metadata: ${err.message}`);
        }
    }

    async onActionDeleteIncident() {
        if (this.model.get('metadata')?.do_not_delete) {
            this.getApp()?.toast?.warning('Remove protection before deleting');
            return;
        }
        const confirmed = await Modal.confirm(
            `Are you sure you want to delete incident #${this.model.id}? This cannot be undone.`,
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (!confirmed) return;
        const resp = await this.model.destroy();
        if (resp.success) {
            this.emit('incident:deleted', { model: this.model });
            this._closeModal();
        }
    }

    _closeModal() {
        const dialog = this.element?.closest('.modal');
        if (dialog) {
            const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
            if (bsModal) bsModal.hide();
        }
    }
}


// ── Header subtitle / aux helpers ──────────────────────────

/**
 * Compose the header subtitle line — "Triggered by rule X · scope Y · #ID".
 * Plain text only; the framework escapes the result before output.
 */
function _buildSubtitle(model) {
    const parts = [];
    const ruleSet = model.get('rule_set');
    const ruleName = (ruleSet && typeof ruleSet === 'object') ? ruleSet.name : null;
    const category = model.get('category');
    if (ruleName) parts.push(`Triggered by rule ${ruleName}`);
    else if (ruleSet) parts.push(`Rule #${typeof ruleSet === 'object' ? ruleSet.id : ruleSet}`);
    if (category)  parts.push(`scope ${category}`);
    if (model.get('id')) parts.push(`#${model.get('id')}`);
    return parts.join(' · ');
}

/**
 * Trusted-HTML aux block — presence-style dot + main label + muted relative
 * line. Every model field is escaped before composition (per the auxFn
 * security note in DetailView).
 */
function _buildHeaderAux(model) {
    const status = (model.get('status') || '').toLowerCase();
    const cfg = getStatusConfig(status);
    const headerStyle = getHeaderIconStyle(status);
    const tone = headerStyle.tone || 'secondary';

    const created = Number(model.get('created')) || 0;
    const modified = Number(model.get('modified')) || 0;

    let main = cfg.label;
    let sub = '';

    if (ACTIVE_STATUSES.has(status)) {
        const duration = created
            ? _formatDuration(Math.max(0, Math.floor(Date.now() / 1000) - created))
            : '';
        sub = duration ? `in flight ${duration}` : '';
    } else if (status === 'resolved' || status === 'closed') {
        sub = modified ? `${_formatRelative(modified)}` : '';
    } else if (modified) {
        sub = `updated ${_formatRelative(modified)}`;
    }

    if (!main) return '';
    const dotCls = tone && tone !== 'default' ? ` dh-aux-dot-${tone}` : '';
    return `
        <span class="dh-aux-presence">
            <span class="dh-aux-dot${dotCls}"></span>
            <span>${escapeHtml(main)}</span>
        </span>
        ${sub ? `<span class="dh-aux-meta">${escapeHtml(sub)}</span>` : ''}
    `;
}

Incident.VIEW_CLASS = IncidentView;
Incident.MODEL_REF = 'incident.Incident';

export default IncidentView;
export {
    IncidentView,
    IncidentOverviewSection,
    IncidentTriggerCard,
    IncidentResponseCard,
    IncidentSourceSection,
    IncidentRequestSection,
    IncidentStackTraceSection,
    RuleEngineSection,
    IncidentTicketsSection,
    RelatedIncidentsSection,
    IncidentHistorySection,
    IncidentMetadataSection
};
