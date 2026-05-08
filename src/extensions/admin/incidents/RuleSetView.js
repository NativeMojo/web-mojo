/**
 * RuleSetView - Rich detail view for an incident RuleSet record
 *
 * SideNavView layout:
 *   Overview · Conditions · Triggering · Handler · Agent Prompt
 *   Activity → Incidents
 *   Detail   → Metadata
 *
 * Uses the framework primitives shipped with this redesign:
 *   - SideNavView with badge support (live counts on Conditions / Incidents)
 *   - SegmentControl (7d / 30d / 90d range picker on the Incidents section)
 *   - MetricCard (Overview at-a-glance row)
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import SegmentControl from '@core/views/navigation/SegmentControl.js';
import MetricCard from '@core/views/data/MetricCard.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
import {
    RuleSet, RuleList, IncidentList,
    BundleByOptions, MatchByOptions, BundleMinutesOptions,
    CommonCategoryOptions
} from '@ext/admin/models/Incident.js';
import HandlerBuilderView from '../security/HandlerBuilderView.js';

// Re-import HANDLER_TYPES indirectly: HandlerBuilderView keeps the array
// internal. We re-declare a lightweight icon/label map here keyed by
// scheme prefix — kept in sync with HandlerBuilderView; if the canonical
// list moves to a shared module later, swap this for an import.
const HANDLER_META = {
    block:  { label: 'Block IP',          icon: 'bi-slash-circle', tone: 'danger'  },
    email:  { label: 'Email',             icon: 'bi-envelope',     tone: 'info'    },
    sms:    { label: 'SMS',               icon: 'bi-chat-dots',    tone: 'info'    },
    notify: { label: 'Push notification', icon: 'bi-bell',         tone: 'info'    },
    ticket: { label: 'Create ticket',     icon: 'bi-ticket-detailed', tone: 'warning' },
    job:    { label: 'Run job',           icon: 'bi-gear-wide-connected', tone: 'primary' },
    llm:    { label: 'LLM triage',        icon: 'bi-stars',        tone: 'primary' }
};

// ── Helpers ────────────────────────────────────────────────

function parseHandlerChain(handlerString) {
    if (!handlerString || typeof handlerString !== 'string') return [];
    return handlerString.split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(raw => {
            const match = raw.match(/^([a-zA-Z]+):\/\/(.*)$/);
            const scheme = match ? match[1].toLowerCase() : null;
            const meta = scheme && HANDLER_META[scheme]
                ? HANDLER_META[scheme]
                : { label: raw, icon: 'bi-question-circle', tone: 'default' };
            return {
                raw,
                scheme,
                label: meta.label,
                icon: meta.icon,
                tone: meta.tone,
                detail: match ? match[2] : ''
            };
        });
}

function formatRelative(epochSeconds) {
    if (!epochSeconds) return '';
    const now = Math.floor(Date.now() / 1000);
    const delta = now - Number(epochSeconds);
    if (delta < 60) return 'just now';
    if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
}

function bundleByLabel(value) {
    const opt = BundleByOptions.find(o => o.value === value);
    return opt ? opt.label : (value === 0 || value === undefined ? 'No bundling' : String(value));
}

function bundleMinutesLabel(value) {
    const opt = BundleMinutesOptions.find(o => o.value === value);
    if (opt) return opt.label;
    if (value === null || value === undefined) return 'No limit — bundle forever';
    return `${value} minutes`;
}

function matchByLabel(value) {
    const opt = MatchByOptions.find(o => o.value === value);
    return opt ? opt.label : String(value);
}


// ── Overview section ───────────────────────────────────────

class RuleSetOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-overview-section p-3',
            template: `
                <div class="ruleset-kpi-grid mb-2">
                    <div data-container="kpi-status"></div>
                    <div data-container="kpi-incidents"></div>
                    <div data-container="kpi-last-fired"></div>
                    <div data-container="kpi-match"></div>
                </div>
                <div class="ruleset-overview-pair">
                    <div class="card ruleset-overview-card">
                        <h6><i class="bi bi-funnel me-1"></i>What triggers this rule</h6>
                        <ul>
                            <li>Event category is <code>{{model.category}}</code></li>
                            <li>{{bundleSummary}}</li>
                            <li>{{thresholdSummary}}</li>
                            <li>{{retriggerSummary}}</li>
                        </ul>
                    </div>
                    <div class="card ruleset-overview-card">
                        <h6><i class="bi bi-tools me-1"></i>What happens when it fires</h6>
                        <ul id="overview-handler-summary"><!-- filled in onInit --></ul>
                    </div>
                </div>
            `,
            ...options
        });

        // Shared IncidentList from RuleSetView — Overview reads its count.
        this.incidentsCollection = options.incidentsCollection || null;
    }

    async onInit() {
        const m = this.model;
        const isActive = !!m.get('is_active');
        const triggerCount = m.get('trigger_count');
        const triggerWindow = m.get('trigger_window');
        const retrigger = m.get('retrigger_every');
        const bundleByVal = m.get('bundle_by');
        const bundleMinutes = m.get('bundle_minutes');

        // Summary lines for the "What triggers this rule" card
        if (bundleByVal === 0 || bundleByVal === undefined) {
            this.bundleSummary = 'Each event creates its own incident (no bundling)';
        } else {
            this.bundleSummary = `Bundles by ${bundleByLabel(bundleByVal).replace(/^By\s+/i, '').toLowerCase()} for ${bundleMinutesLabel(bundleMinutes).toLowerCase()}`;
        }
        if (triggerCount == null || triggerCount === 0) {
            this.thresholdSummary = 'Fires immediately on the first event';
        } else if (triggerWindow == null) {
            this.thresholdSummary = `Fires after ${triggerCount} events accumulate`;
        } else {
            this.thresholdSummary = `Fires after ${triggerCount} events within ${triggerWindow} minutes`;
        }
        this.retriggerSummary = retrigger == null
            ? 'Fires once per bundle (no re-trigger)'
            : `Re-fires every ${retrigger} additional events`;

        // Pull initial values from the shared collection (may already be fetched)
        const initialCount = this._readIncidentCount();
        const initialLastFired = this._readLastFired();

        // KPI cards — compact rendering: badge-style Status, icon + small value text
        this.kpiStatus = new MetricCard({
            containerId: 'kpi-status',
            label: 'Status',
            value: isActive ? 'Active' : 'Inactive',
            valueIcon: isActive ? 'bi-check-circle-fill' : 'bi-pause-circle-fill',
            tone: isActive ? 'success' : 'default'
        });
        this.kpiIncidents = new MetricCard({
            containerId: 'kpi-incidents',
            label: 'Incidents (30d)',
            value: initialCount == null ? '—' : initialCount,
            tone: initialCount > 0 ? 'warning' : 'default',
            action: 'view-incidents'
        });
        this.kpiLastFired = new MetricCard({
            containerId: 'kpi-last-fired',
            label: 'Last fired',
            value: initialLastFired ? formatRelative(initialLastFired) : 'Never'
        });
        this.kpiMatch = new MetricCard({
            containerId: 'kpi-match',
            label: 'Match logic',
            value: this._shortMatchLabel(m.get('match_by'))
        });

        this.addChild(this.kpiStatus);
        this.addChild(this.kpiIncidents);
        this.addChild(this.kpiLastFired);
        this.addChild(this.kpiMatch);

        // React to shared-collection fetches
        if (this.incidentsCollection) {
            this.incidentsCollection.on('fetch:success', () => this._refreshFromCollection(), this);
        }
    }

    /** Compact match-logic label for the KPI card */
    _shortMatchLabel(value) {
        return value === 1 ? 'ANY rule matches' : 'ALL rules match';
    }

    _readIncidentCount() {
        if (!this.incidentsCollection) return null;
        return this.incidentsCollection.totalCount
            ?? this.incidentsCollection.models?.length
            ?? null;
    }

    _readLastFired() {
        const m = this.incidentsCollection?.models?.[0];
        return m?.get?.('created') ?? null;
    }

    _refreshFromCollection() {
        const count = this._readIncidentCount();
        const last = this._readLastFired();
        if (this.kpiIncidents) this.kpiIncidents.setValue(count == null ? '—' : count);
        if (this.kpiLastFired) this.kpiLastFired.setValue(last ? formatRelative(last) : 'Never');
    }

    async onAfterRender() {
        await super.onAfterRender();
        // Fill in the handler summary list (parsed)
        const summary = this.element?.querySelector('#overview-handler-summary');
        if (!summary) return;
        const chain = parseHandlerChain(this.model.get('handler'));
        if (!chain.length) {
            summary.innerHTML = '<li>No handler configured — incidents are recorded but no action is taken</li>';
            return;
        }
        const hasLlm = chain.some(s => s.scheme === 'llm');
        const items = chain.map(s => `<li><i class="bi ${s.icon} me-1 text-body-secondary"></i>${this.escapeHtml(s.label)}${s.detail ? ` <code class="small">${this.escapeHtml(s.detail)}</code>` : ''}</li>`);
        if (!hasLlm) {
            items.push(`<li class="text-body-secondary"><i class="bi bi-stars me-1"></i>No LLM triage configured — <a href="#" data-action="go-agent">add an agent prompt</a></li>`);
        }
        summary.innerHTML = items.join('');
    }

    async onActionGoAgent(event) {
        event.preventDefault();
        this.emit('navigate', 'Agent');
    }

    async onActionViewIncidents(event) {
        event?.preventDefault?.();
        this.emit('navigate', 'Incidents');
    }
}


// ── Conditions section ─────────────────────────────────────

class RuleSetConditionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-conditions-section p-3',
            template: `<div data-container="conditions-table"></div>`,
            ...options
        });

        this.rulesetId = options.rulesetId;
        // Shared with RuleSetView so the sidebar badge can populate before
        // the user ever navigates to this section.
        this.collection = options.collection;
    }

    async onInit() {
        this.tableView = new TableView({
            containerId: 'conditions-table',
            collection: this.collection,
            title: 'Conditions',
            eyebrow: this._buildEyebrowLabel(),
            showFullscreen: false,
            searchable: false,
            tableOptions: { striped: false, hover: true },
            hideActivePillNames: ['parent'],
            columns: [
                { key: 'id',         label: 'ID',    width: '60px',
                    template: `<span class="text-body-tertiary font-monospace">{{model.id}}</span>` },
                { key: 'name',       label: 'Name' },
                { key: 'field_name', label: 'Field',
                    template: `<code>{{model.field_name}}</code>` }
            ],
            showAdd: true,
            clickAction: 'edit',
            actions: ['edit', 'delete'],
            contextMenu: [
                { label: 'Edit Rule', action: 'edit', icon: 'bi-pencil' },
                { label: 'Duplicate Rule', action: 'duplicate', icon: 'bi-files' },
                { divider: true },
                { label: 'Delete Rule', action: 'delete', icon: 'bi-trash', danger: true }
            ],
            addFormDefaults: { parent: this.rulesetId }
        });
        this.addChild(this.tableView);

        // Update the toolbar eyebrow whenever the collection refreshes.
        // Pull initial state in case the shared collection already fetched.
        this.collection.on('fetch:success', () => this._updateCount(), this);
        if (this.collection.models?.length) this._updateCount();
    }

    _buildEyebrowLabel() {
        const n = this.collection?.models?.length ?? 0;
        const matchByVal = this.parent?.model?.get('match_by') ?? this.model?.get?.('match_by');
        const matchSuffix = matchByVal === 1 ? 'ANY must match' : 'ALL must match';
        if (n === 0) return `Loading conditions…`;
        return `${n} ${n === 1 ? 'condition' : 'conditions'} · ${matchSuffix}`;
    }

    _updateCount() {
        this.tableView?.setEyebrow(this._buildEyebrowLabel());
        this.emit('count:changed', this.collection?.models?.length ?? 0);
    }
}


// ── Triggering section ─────────────────────────────────────

class RuleSetTriggeringSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-triggering-section p-3',
            ...options
        });

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const matchByVal = m.get('match_by');
        const bundleByVal = m.get('bundle_by');
        const bundleMinutes = m.get('bundle_minutes');
        const triggerCount = m.get('trigger_count');
        const triggerWindow = m.get('trigger_window');
        const retrigger = m.get('retrigger_every');

        const matchValue = matchByLabel(matchByVal);
        const bundleValue = (bundleByVal === 0 || bundleByVal === undefined)
            ? 'No bundling'
            : bundleByLabel(bundleByVal).replace(/^By\s+/i, '');
        const bundleHint = bundleByVal === 0
            ? 'Each event becomes its own incident.'
            : `Group events from the same source over <strong>${this.escapeHtml(bundleMinutesLabel(bundleMinutes).toLowerCase())}</strong> into one incident.`;

        const thresholdEmpty = triggerCount == null || triggerCount === 0;
        const thresholdValue = thresholdEmpty
            ? `<span class="rs-flow-empty">Fires immediately</span>`
            : `After <strong>${this.escapeHtml(String(triggerCount))}</strong> events`;
        const thresholdHint = thresholdEmpty
            ? 'Handler chain runs as soon as the first matching event arrives.'
            : (triggerWindow == null
                ? 'All events counted (no time window). Until the threshold, the incident stays in <code>pending</code>.'
                : `Counted within <strong>${this.escapeHtml(String(triggerWindow))}</strong> minutes.`);

        const retriggerEmpty = retrigger == null;
        const retriggerValue = retriggerEmpty
            ? `<span class="rs-flow-empty">Fire once only</span>`
            : `Every <strong>${this.escapeHtml(String(retrigger))}</strong> events`;
        const retriggerHint = retriggerEmpty
            ? 'Handler runs once when the threshold is first crossed; subsequent events are appended silently.'
            : 'Re-fires the handler chain after every N additional events.';

        return `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">Match → Bundle → Threshold → Re-trigger</div>
                    <h5 class="mb-0">Triggering</h5>
                </div>
                <button class="btn btn-outline-secondary btn-sm" data-action="edit-all"><i class="bi bi-pencil"></i> Edit all</button>
            </div>
            <div class="rs-flow">
                <div class="rs-flow-step">
                    <div class="rs-flow-num">STEP 1</div>
                    <div class="rs-flow-title">Match <button class="btn btn-link p-0 text-body-secondary" data-action="edit-step" data-tab="general"><i class="bi bi-pencil"></i></button></div>
                    <div class="rs-flow-value">${matchValue}</div>
                    <div class="rs-flow-hint">Each condition under "Conditions" must match the event for the rule to apply.</div>
                </div>
                <div class="rs-flow-step">
                    <div class="rs-flow-num">STEP 2</div>
                    <div class="rs-flow-title">Bundle <button class="btn btn-link p-0 text-body-secondary" data-action="edit-step" data-tab="bundling"><i class="bi bi-pencil"></i></button></div>
                    <div class="rs-flow-value">${this.escapeHtml(bundleValue)}</div>
                    <div class="rs-flow-hint">${bundleHint}</div>
                </div>
                <div class="rs-flow-step">
                    <div class="rs-flow-num">STEP 3</div>
                    <div class="rs-flow-title">Threshold <button class="btn btn-link p-0 text-body-secondary" data-action="edit-step" data-tab="thresholds"><i class="bi bi-pencil"></i></button></div>
                    <div class="rs-flow-value">${thresholdValue}</div>
                    <div class="rs-flow-hint">${thresholdHint}</div>
                </div>
                <div class="rs-flow-step">
                    <div class="rs-flow-num">STEP 4</div>
                    <div class="rs-flow-title">Re-trigger <button class="btn btn-link p-0 text-body-secondary" data-action="edit-step" data-tab="thresholds"><i class="bi bi-pencil"></i></button></div>
                    <div class="rs-flow-value">${retriggerValue}</div>
                    <div class="rs-flow-hint">${retriggerHint}</div>
                </div>
            </div>
            <div class="alert alert-secondary small mb-0">
                <i class="bi bi-info-circle me-1 text-primary"></i>
                Events accumulate in <code>pending</code> status. Once the trigger count is crossed, the
                <a href="#" data-action="go-handler">handler chain</a> fires and the incident becomes <code>new</code>.
                Leave Threshold empty to fire on the first event.
            </div>
        `;
    }

    async onActionEditStep(event, element) {
        const step = element?.dataset?.tab || 'general';
        this.emit('action:edit-step', step);
    }
    async onActionEditAll() { this.emit('action:edit-ruleset'); }
    async onActionGoHandler(event) { event.preventDefault(); this.emit('navigate', 'Handler'); }
}


// ── Handler chain section ──────────────────────────────────

class RuleSetHandlerChainSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-handler-section p-3',
            ...options
        });

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const chain = parseHandlerChain(this.model.get('handler'));
        const empty = chain.length === 0;

        return `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">${empty ? '0 handlers in chain' : (chain.length === 1 ? '1 handler in chain' : `${chain.length} handlers in chain`)}</div>
                    <h5 class="mb-0">Handler</h5>
                </div>
                <button class="btn btn-primary btn-sm" data-action="edit-chain"><i class="bi bi-tools me-1"></i>Edit chain</button>
            </div>
            ${empty ? `
                <div class="text-center text-body-secondary py-4 border rounded">
                    <i class="bi bi-tools fs-1 d-block mb-2"></i>
                    <p class="mb-3">No handler configured. Incidents are recorded but no action runs.</p>
                    <button class="btn btn-primary" data-action="edit-chain"><i class="bi bi-plus-lg me-1"></i>Configure handler chain</button>
                </div>
            ` : `
                <div class="rs-chain">
                    ${chain.map(step => `
                        <div class="rs-chain-step tone-${step.tone}">
                            <div class="rs-chain-icon"><i class="bi ${step.icon}"></i></div>
                            <div style="min-width: 0;">
                                <div class="rs-chain-label">${this.escapeHtml(step.label)}</div>
                                ${step.detail ? `<div class="rs-chain-detail">${this.escapeHtml(step.detail)}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="rs-chain-raw">{{model.handler}}</div>
            `}
            <div class="alert alert-secondary small mt-3 mb-0">
                <strong>Tip:</strong>
                Chain handlers with commas — e.g. <code>block://?ttl=86400, ticket://?priority=8, llm://</code>.
                Add <code>llm://</code> to use the prompt configured in <a href="#" data-action="go-agent">Agent Prompt</a>.
            </div>
        `;
    }

    async onActionEditChain() { this.emit('action:edit-handler'); }
    async onActionGoAgent(event) { event.preventDefault(); this.emit('navigate', 'Agent'); }
}


// ── Agent Prompt section ───────────────────────────────────

class RuleSetAgentPromptSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-agent-section p-3',
            ...options
        });

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const prompt = this.model.get('metadata')?.agent_prompt || '';
        const chain = parseHandlerChain(this.model.get('handler'));
        const hasLlm = chain.some(s => s.scheme === 'llm');
        const charCount = prompt.length;

        return `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">metadata.agent_prompt</div>
                    <h5 class="mb-0">Agent Prompt</h5>
                </div>
                <button class="btn btn-primary btn-sm" data-action="save-prompt" id="rs-prompt-save">
                    <i class="bi bi-save me-1"></i>Save prompt
                </button>
            </div>
            ${hasLlm ? `
                <div class="alert alert-info small d-flex align-items-center mb-3">
                    <i class="bi bi-stars me-2"></i>
                    <span>Used by the <code>llm://</code> handler in your chain when triaging incidents.</span>
                </div>
            ` : `
                <div class="alert alert-warning small d-flex align-items-center mb-3">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <span>Add <code>llm://</code> to your <a href="#" data-action="go-handler">handler chain</a> to use this prompt — it's saved either way.</span>
                </div>
            `}
            <textarea class="rs-prompt" data-action="prompt-input" data-action-debounce="200" spellcheck="false" placeholder="You are a security analyst triaging…">${this.escapeHtml(prompt)}</textarea>
            <div class="d-flex justify-content-between align-items-center mt-2">
                <small class="text-body-secondary">
                    <i class="bi bi-info-circle me-1"></i>
                    The LLM handler receives this prompt plus a structured incident summary on every fire.
                </small>
                <small class="text-body-secondary font-monospace" id="rs-prompt-counter">${charCount} chars</small>
            </div>
        `;
    }

    async onAfterRender() {
        await super.onAfterRender();
        this._lastSaved = this.model.get('metadata')?.agent_prompt || '';
        this._currentValue = this._lastSaved;
    }

    async onActionPromptInput(event, element) {
        this._currentValue = element.value;
        const counter = this.element?.querySelector('#rs-prompt-counter');
        if (counter) counter.textContent = `${this._currentValue.length} chars`;
    }

    async onActionGoHandler(event) {
        event.preventDefault();
        this.emit('navigate', 'Handler');
    }

    async onActionSavePrompt(event, element) {
        const value = this._currentValue ?? '';
        element.disabled = true;
        try {
            // Backend auto-merges JSONFields (per project memory) — partial write is safe.
            const resp = await this.model.save({ 'metadata.agent_prompt': value });
            if (resp && resp.status && resp.status >= 400) {
                throw new Error('Save failed');
            }
            this._lastSaved = value;
            // Mutate the in-memory metadata so re-renders show the saved value
            const meta = { ...(this.model.get('metadata') || {}), agent_prompt: value };
            this.model.set('metadata', meta);
            this.getApp()?.toast?.success('Agent prompt saved');
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to save: ${err.message}`);
        } finally {
            element.disabled = false;
        }
    }

    /** Re-render banner + textarea when handler chain changes */
    async refresh() {
        if (this.isMounted()) await this.render();
    }

    focusTextarea() {
        const ta = this.element?.querySelector('.rs-prompt');
        if (ta) ta.focus();
    }
}


// ── Incidents section ──────────────────────────────────────

class RuleSetIncidentsSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-incidents-section p-3',
            template: `<div data-container="incidents-table"></div>`,
            ...options
        });

        this.rulesetId = options.rulesetId;
        this.collection = options.collection;        // shared from RuleSetView
        this.rangeValue = options.range || '30d';
    }

    async onInit() {
        // Build the SegmentControl FIRST so we can pass it as TableView's toolbarRight
        this.range = new SegmentControl({
            options: [
                { value: '1d', label: '1d' },
                { value: '7d', label: '7d' },
                { value: '30d', label: '30d' },
                { value: '90d', label: '90d' }
            ],
            value: this.rangeValue,
            ariaLabel: 'Time range'
        });
        this.range.on('change', ({ value }) => this._applyRange(value));

        this.tableView = new TableView({
            containerId: 'incidents-table',
            collection: this.collection,
            title: 'Incidents',
            eyebrow: this._buildEyebrowLabel(),
            showFullscreen: false,
            showRefresh: true,
            tableOptions: { striped: false, hover: true },
            hideActivePillNames: ['rule_set', 'created__gte'],
            columns: [
                {
                    key: 'created', label: 'Created', sortable: true, width: '140px',
                    template: `<div class="font-monospace small">{{{model.created|epoch|datetime}}}</div><div class="text-body-secondary small">{{{model.created|epoch|relative}}}</div>`
                },
                { key: 'status', label: 'Status', width: '90px', formatter: 'badge' },
                {
                    key: 'priority', label: 'Pri', width: '60px',
                    template: `{{{priorityPill}}}`,
                    formatter: (value) => _priorityPillHtml(value)
                },
                {
                    key: 'title', label: 'Title',
                    class: 'rs-incident-title',
                    formatter: "default('—')"
                }
            ],
            showAdd: false,
            paginated: true,
            size: 10,
            searchable: false,
            filterable: false,
            toolbarRight: this.range
        });
        this.addChild(this.tableView);

        this.collection.on('fetch:success', () => this._updateEyebrow(), this);
    }

    async _applyRange(value) {
        this.rangeValue = value;
        const days = value === '1d' ? 1 : value === '7d' ? 7 : value === '90d' ? 90 : 30;
        const since = Math.floor(Date.now() / 1000) - days * 86400;
        this.collection.setParams({
            rule_set: this.rulesetId,
            created__gte: since,
            sort: '-created'
        });
        await this.collection.fetch();
    }

    _buildEyebrowLabel() {
        const count = this.collection?.totalCount ?? this.collection?.models?.length ?? 0;
        const days = this.rangeValue === '1d' ? 1 : this.rangeValue === '7d' ? 7 : this.rangeValue === '90d' ? 90 : 30;
        return `${count} ${count === 1 ? 'incident' : 'incidents'} in last ${days} ${days === 1 ? 'day' : 'days'}`;
    }

    _updateEyebrow() {
        this.tableView?.setEyebrow(this._buildEyebrowLabel());
    }
}

/** Render a priority value as a colored pill. Used by the Incidents column formatter. */
function _priorityPillHtml(value) {
    const p = parseInt(value, 10);
    if (isNaN(p)) return `<span class="text-body-tertiary">—</span>`;
    let bg, text;
    if (p >= 8)      { bg = 'bg-danger';  text = 'text-danger-emphasis'; }
    else if (p >= 5) { bg = 'bg-warning'; text = 'text-warning-emphasis'; }
    else             { bg = 'bg-secondary'; text = 'text-secondary-emphasis'; }
    return `<span class="badge ${bg} ${text} font-monospace">${p}</span>`;
}


// ── Metadata section ───────────────────────────────────────

class RuleSetMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-metadata-section p-3',
            ...options
        });

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const meta = this.model.get('metadata') || {};
        const keys = Object.keys(meta);
        const isEmpty = keys.length === 0;
        const known = ['reasoning', 'assistant_proposed', 'delete_on_resolution', 'agent_prompt'];
        const hasKnown = known.some(k => meta[k] !== undefined && meta[k] !== null && meta[k] !== '');

        return `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">${isEmpty ? 'No metadata yet' : 'Every key on ruleset.metadata'}</div>
                    <h5 class="mb-0">Metadata</h5>
                </div>
                <button class="btn btn-primary btn-sm" data-action="edit-metadata">
                    <i class="bi bi-pencil me-1"></i>${isEmpty ? 'Add metadata' : 'Edit JSON'}
                </button>
            </div>
            ${isEmpty ? `
                <div class="text-center text-body-secondary py-4 border rounded">
                    <i class="bi bi-braces fs-1 d-block mb-2"></i>
                    <p class="mb-3 small">No metadata is set on this RuleSet. Use metadata for arbitrary configuration the framework doesn't know about — runbook URLs, on-call rotations, custom flags, etc.</p>
                    <button class="btn btn-primary btn-sm" data-action="edit-metadata">
                        <i class="bi bi-plus-lg me-1"></i>Add metadata
                    </button>
                </div>
            ` : `
                ${hasKnown ? `
                    <h6 class="text-body-secondary small text-uppercase mt-2 mb-2" style="letter-spacing: 0.06em;">Known fields</h6>
                    <div data-container="metadata-known"></div>
                ` : ''}
                <h6 class="text-body-secondary small text-uppercase mt-3 mb-2" style="letter-spacing: 0.06em;">Raw JSON</h6>
                <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="white-space: pre-wrap; word-break: break-word;"><code>{{model.metadata|json}}</code></pre>
            `}
        `;
    }

    async onInit() {
        await this._buildKnownView();
    }

    async _buildKnownView() {
        const meta = this.model.get('metadata') || {};
        const known = ['reasoning', 'assistant_proposed', 'delete_on_resolution', 'agent_prompt'];
        const hasKnown = known.some(k => meta[k] !== undefined && meta[k] !== null && meta[k] !== '');
        if (!hasKnown) return;

        const promptLen = typeof meta.agent_prompt === 'string' ? meta.agent_prompt.length : 0;

        // Synthetic model so DataView can use field names that map to dotted metadata paths
        const metaModel = {
            get: (key) => meta[key],
            attributes: meta,
            on() {}, off() {}
        };

        const fields = [];
        if (meta.reasoning !== undefined && meta.reasoning !== null && meta.reasoning !== '') {
            fields.push({ name: 'reasoning', label: 'Reasoning', cols: 12 });
        }
        if (meta.assistant_proposed !== undefined) {
            fields.push({ name: 'assistant_proposed', label: 'Assistant Proposed', formatter: 'yesnoicon', cols: 6 });
        }
        if (meta.delete_on_resolution !== undefined) {
            fields.push({ name: 'delete_on_resolution', label: 'Delete on Resolution', formatter: 'yesnoicon', cols: 6 });
        }
        if (meta.agent_prompt !== undefined && meta.agent_prompt !== null) {
            fields.push({
                name: 'agent_prompt',
                label: 'Agent Prompt',
                template: meta.agent_prompt
                    ? `<span class="badge text-bg-success"><i class="bi bi-check2 me-1"></i>Configured · ${promptLen} chars</span>`
                    : `<span class="badge text-bg-secondary">Not configured</span>`,
                cols: 6
            });
        }

        this.knownView = new DataView({
            containerId: 'metadata-known',
            model: metaModel,
            columns: 2,
            showEmptyValues: false,
            fields
        });
        this.addChild(this.knownView);
    }
}


// ── RuleSetView (assembly) ─────────────────────────────────

class RuleSetView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new RuleSet(options.data || {});
        const rulesetId = model.get('id');

        // Shared collections — Overview KPI + Incidents section share one
        // IncidentList; Conditions section + sidebar badge share one RuleList.
        // Created here (before super) so the section views can be configured
        // with them in the `sections` array below.
        const incidentsCollection = new IncidentList({
            params: { rule_set: rulesetId, created__gte: Math.floor(Date.now()/1000) - 30*86400, sort: '-created' }
        });
        const conditionsCollection = new RuleList({ params: { parent: rulesetId } });

        // Section view instances
        const overviewSection   = new RuleSetOverviewSection({ model, incidentsCollection });
        const conditionsSection = new RuleSetConditionsSection({ model, rulesetId, collection: conditionsCollection });
        const triggeringSection = new RuleSetTriggeringSection({ model });
        const handlerSection    = new RuleSetHandlerChainSection({ model });
        const agentSection      = new RuleSetAgentPromptSection({ model });
        const incidentsSection  = new RuleSetIncidentsSection({ model, rulesetId, collection: incidentsCollection });
        const metadataSection   = new RuleSetMetadataSection({ model });

        const sections = [
            { key: 'Overview',     label: 'Overview',     icon: 'bi-grid-1x2',           view: overviewSection },
            { key: 'Conditions',   label: 'Conditions',   icon: 'bi-funnel',             view: conditionsSection },
            { key: 'Triggering',   label: 'Triggering',   icon: 'bi-stopwatch',          view: triggeringSection },
            { key: 'Handler',      label: 'Handler',      icon: 'bi-tools',              view: handlerSection },
            { key: 'Agent',        label: 'Agent Prompt', icon: 'bi-stars',              view: agentSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Incidents',    label: 'Incidents',    icon: 'bi-shield-exclamation', view: incidentsSection },
            { type: 'divider', label: 'Detail' },
            { key: 'Metadata',     label: 'Metadata',     icon: 'bi-braces',             view: metadataSection }
        ];

        super({
            className: 'ruleset-view',
            ...options,
            model,
            header: {
                icon: 'bi-gear-wide-connected',
                titleField: 'name',
                subtitlePath: 'metadata.reasoning',
                subtitlePlaceholder: 'No reasoning provided — click to add one',
                subtitleEditAction: 'edit-header',
                chips: [
                    { icon: 'bi-tag-fill',     textPath: 'category', variant: 'primary' },
                    { icon: 'bi-flag',         text: m => `Priority ${m.get('priority')}`, variant: 'secondary' },
                    { icon: 'bi-hash',         text: m => `ID ${m.get('id')}`, variant: 'light' },
                    { icon: 'bi-stars',        text: 'AI-proposed', variant: 'warning',
                      when: m => m.get('metadata')?.assistant_proposed },
                    { icon: 'bi-clock-history', text: m => {
                          const mod = m.get('modified');
                          return mod ? `Modified ${formatRelative(mod)}` : null;
                      }, variant: 'light' }
                ],
                activeField: 'is_active',
                actions: [
                    { label: 'Edit', icon: 'bi-pencil', action: 'edit-header', title: 'Edit details' }
                ],
                contextMenu: {
                    items: [
                        { label: 'Edit RuleSet',       action: 'edit-ruleset',       icon: 'bi-pencil' },
                        { label: 'Edit Handler Chain', action: 'edit-handler',       icon: 'bi-tools' },
                        { label: 'Edit Agent Prompt',  action: 'edit-agent-prompt',  icon: 'bi-stars' },
                        { type: 'divider' },
                        { label: 'View Incidents',     action: 'view-incidents',     icon: 'bi-shield-exclamation' },
                        { type: 'divider' },
                        { label: 'Delete RuleSet',     action: 'delete-ruleset',     icon: 'bi-trash', danger: true }
                    ]
                }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.incidentsCollection = incidentsCollection;
        this.conditionsCollection = conditionsCollection;
        this.overviewSection = overviewSection;
        this.conditionsSection = conditionsSection;
        this.triggeringSection = triggeringSection;
        this.handlerSection = handlerSection;
        this.agentSection = agentSection;
        this.incidentsSection = incidentsSection;
        this.metadataSection = metadataSection;

        // Fire-and-forget initial fetches so badges/KPIs populate without waiting for navigation
        this.incidentsCollection.fetch().catch(() => { /* fail silent */ });
        this.conditionsCollection.fetch().catch(() => { /* fail silent */ });
    }

    async onAfterBuild() {
        // Cross-section "navigate" events route through SideNav.showSection
        const navHandler = (key) => this.showSection(key);
        this.overviewSection.on('navigate', navHandler);
        this.triggeringSection.on('navigate', navHandler);
        this.handlerSection.on('navigate', navHandler);
        this.agentSection.on('navigate', navHandler);

        // Per-section edit affordances bubble up to this view's action handlers
        this.triggeringSection.on('action:edit-step',    (tab) => this.onActionEditTriggeringStep(tab));
        this.triggeringSection.on('action:edit-ruleset', () => this.onActionEditRuleset());
        this.handlerSection.on('action:edit-handler',    () => this.onActionEditHandler());
        // Metadata's edit-metadata is handled directly by RuleSetView's
        // onActionEditMetadata via click delegation — no event hookup needed
        // (avoids double-fire from section + parent both dispatching).

        // Live sidebar badge updates from the shared collections
        const updateConditionsBadge = () => {
            const n = this.conditionsCollection.models?.length ?? 0;
            this.setBadge('Conditions', n > 0 ? { text: String(n), variant: 'muted' } : null);
        };
        this.conditionsCollection.on('fetch:success', updateConditionsBadge, this);
        if (this.conditionsCollection.models?.length) updateConditionsBadge();

        const updateIncidentsBadge = () => {
            const count = this.incidentsCollection.totalCount ?? this.incidentsCollection.models?.length ?? 0;
            this.setBadge('Incidents', count > 0 ? { text: String(count), variant: count > 10 ? 'warning' : 'muted' } : null);
        };
        this.incidentsCollection.on('fetch:success', updateIncidentsBadge, this);
        if (this.incidentsCollection.models?.length) updateIncidentsBadge();
    }

    /** Header pencil — focused mini-form for the fields visible in the header */
    async onActionEditHeader() {
        const resp = await Modal.modelForm({
            title: 'Edit RuleSet details',
            model: this.model,
            size: 'md',
            formConfig: {
                fields: [
                    { name: 'name', type: 'text', label: 'Name', required: true, columns: 12 },
                    {
                        name: 'category', type: 'combo', label: 'Scope / Category',
                        options: CommonCategoryOptions, allowCustom: true, required: true, columns: 8
                    },
                    { name: 'priority', type: 'number', label: 'Priority', required: true, columns: 4 },
                    {
                        name: 'metadata.reasoning', type: 'textarea', label: 'Reasoning',
                        rows: 4, columns: 12,
                        tooltip: 'Why this rule exists — shown as the header subtitle.'
                    }
                ]
            }
        });
        if (resp) await this._fullRefresh();
    }

    /** Triggering section pencils — focused mini-form per step */
    async onActionEditTriggeringStep(step) {
        const formConfig = this._triggeringMiniForm(step);
        if (!formConfig) return;
        const resp = await Modal.modelForm({
            title: formConfig.title,
            model: this.model,
            size: 'md',
            formConfig: { fields: formConfig.fields }
        });
        if (resp) await this._fullRefresh();
    }

    _triggeringMiniForm(step) {
        switch (step) {
            case 'general':
            case 'match':
                return {
                    title: 'Edit match logic',
                    fields: [
                        { type: 'html', columns: 12, html: `<p class="small text-body-secondary mb-2">Controls how multiple <strong>conditions</strong> combine when evaluating an event.</p>` },
                        {
                            name: 'match_by', type: 'select', label: 'Match Logic',
                            options: MatchByOptions, columns: 12,
                            tooltip: 'ALL = every condition must match. ANY = at least one'
                        }
                    ]
                };
            case 'bundling':
            case 'bundle':
                return {
                    title: 'Edit bundling',
                    fields: [
                        { type: 'html', columns: 12, html: `<p class="small text-body-secondary mb-2">How matched events are grouped into a single incident.</p>` },
                        {
                            name: 'bundle_by', type: 'select', label: 'Bundle By',
                            options: BundleByOptions, columns: 6,
                            tooltip: 'How to group related events into one incident'
                        },
                        {
                            name: 'bundle_minutes', type: 'select', label: 'Bundle Window',
                            options: BundleMinutesOptions, columns: 6,
                            tooltip: 'Events outside this window create a new incident'
                        },
                        {
                            name: 'bundle_by_rule_set', type: 'switch', label: 'Bundle by RuleSet',
                            columns: 12,
                            tooltip: 'Group events matched by this rule into the same incident'
                        }
                    ]
                };
            case 'thresholds':
            case 'threshold':
                return {
                    title: 'Edit threshold',
                    fields: [
                        { type: 'html', columns: 12, html: `<p class="small text-body-secondary mb-2">Events accumulate in <code>pending</code> until this threshold is reached. Leave empty to fire on the first event.</p>` },
                        {
                            name: 'trigger_count', type: 'number', label: 'Trigger Count',
                            placeholder: 'Empty = fire immediately', columns: 6,
                            tooltip: 'Number of events before the handler fires'
                        },
                        {
                            name: 'trigger_window', type: 'number', label: 'Trigger Window (min)',
                            placeholder: 'Empty = no time limit', columns: 6,
                            tooltip: 'Only count events within this many minutes'
                        }
                    ]
                };
            case 'retrigger':
                return {
                    title: 'Edit re-trigger',
                    fields: [
                        { type: 'html', columns: 12, html: `<p class="small text-body-secondary mb-2">After the threshold is crossed, re-fire the handler chain every N additional events.</p>` },
                        {
                            name: 'retrigger_every', type: 'number', label: 'Re-trigger Every',
                            placeholder: 'Empty = fire once only', columns: 12,
                            tooltip: 'Re-fire handler every N additional events after initial trigger'
                        }
                    ]
                };
            default:
                return null;
        }
    }

    /** Edit the entire metadata blob as JSON — power-user escape hatch */
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
                        Free-form JSON object. Known keys are also editable from their own sections (Reasoning from header Edit, Agent Prompt from its tab) — use this for anything else.
                    </div>`
                },
                {
                    name: 'metadata_json', type: 'textarea', label: 'Metadata',
                    rows: 16, columns: 12,
                    value: initial,
                    placeholder: '{ "key": "value" }',
                    tooltip: 'Must be a valid JSON object'
                }
            ],
            submitText: 'Save',
            cancelText: 'Cancel'
        });

        if (!resp) return;

        // Parse + validate
        let parsed;
        try {
            parsed = JSON.parse(resp.metadata_json);
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Metadata must be a JSON object (e.g. `{}`), not an array or scalar.');
            }
        } catch (err) {
            this.getApp()?.toast?.error(`Invalid JSON: ${err.message}`);
            return;
        }

        // Replace the metadata wholesale — backend can still merge, but here
        // the user's intent is "this is the new metadata".
        try {
            const saveResp = await this.model.save({ metadata: parsed });
            if (saveResp && saveResp.status && saveResp.status >= 400) {
                throw new Error('Save failed');
            }
            this.model.set('metadata', parsed);
            this.getApp()?.toast?.success('Metadata updated');
            await this._fullRefresh();
            // Re-render the metadata section so the JSON dump shows the new value
            if (this.metadataSection?.isMounted()) await this.metadataSection.render();
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to save metadata: ${err.message}`);
        }
    }

    /** Context menu's full-form escape hatch — kept for advanced edits */
    async onActionEditRuleset() {
        const resp = await Modal.modelForm({
            title: `Edit RuleSet — ${this.model.get('name')}`,
            model: this.model,
            formConfig: RuleSet.EDIT_FORM
        });
        if (resp) {
            await this._fullRefresh();
        }
    }

    async onActionEditHandler() {
        const builder = new HandlerBuilderView({
            value: this.model.get('handler') || ''
        });

        const result = await Modal.dialog({
            title: 'Configure Handler Chain',
            body: builder,
            size: 'md',
            scrollable: true,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                { text: 'Save', class: 'btn-primary', action: 'save' }
            ]
        });

        if (result === 'save') {
            const handlerString = builder.getValue();
            if (!handlerString) return;
            const resp = await this.model.save({ handler: handlerString });
            if (resp && resp.status && resp.status >= 400) {
                this.getApp()?.toast?.error('Failed to update handler');
                return;
            }
            this.getApp()?.toast?.success('Handler updated');
            await this._fullRefresh();
        }
    }

    async onActionEditAgentPrompt() {
        await this.showSection('Agent');
        this.agentSection?.focusTextarea();
    }

    async onActionViewIncidents() {
        await this.showSection('Incidents');
    }

    async onActionDeleteRuleset() {
        const confirmed = await Modal.confirm({
            title: 'Delete RuleSet',
            message: `Are you sure you want to delete "${this.model.get('name')}"? This cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return;
        try {
            await this.model.destroy();
            this.getApp()?.toast?.success('RuleSet deleted');
            const dialog = this.element?.closest('.modal');
            if (dialog) {
                const bsModal = window.bootstrap?.Modal?.getInstance(dialog);
                if (bsModal) bsModal.hide();
            }
            this.emit('ruleset:deleted', { model: this.model });
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to delete: ${err.message}`);
        }
    }

    /**
     * Re-render the whole view after a save that affects multiple sections
     * (handler chain, name, category, thresholds…).
     */
    async _fullRefresh() {
        // Re-render each section that depends on the model's read-only fields
        await this.headerView.render();
        await this.triggeringSection.render();
        await this.handlerSection.render();
        await this.agentSection.refresh();
        // Overview's "What happens when it fires" reads handler chain — re-render
        if (this.overviewSection.isMounted()) await this.overviewSection.render();
        // Conditions / Incidents tables refresh from their own collections
    }
}

RuleSetView.VIEW_CLASS = RuleSetView;
RuleSet.MODEL_REF = 'incident.RuleSet';

export default RuleSetView;
