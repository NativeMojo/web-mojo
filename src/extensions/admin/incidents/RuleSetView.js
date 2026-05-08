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
import SideNavView from '@core/views/navigation/SideNavView.js';
import SegmentControl from '@core/views/navigation/SegmentControl.js';
import MetricCard from '@core/views/data/MetricCard.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Modal from '@core/views/feedback/Modal.js';
import {
    RuleSet, RuleList, IncidentList,
    BundleByOptions, MatchByOptions, BundleMinutesOptions
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


// ── Header section ─────────────────────────────────────────

class RuleSetHeaderSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-header card',
            ...options
        });

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const reasoning = m.get('metadata')?.reasoning || '';
        const proposed = !!m.get('metadata')?.assistant_proposed;
        const isActive = !!m.get('is_active');
        const modified = m.get('modified');
        const modifiedRel = modified ? formatRelative(modified) : '';

        return `
            <style>
                .ruleset-header.card {
                    border: 1px solid var(--bs-border-color);
                    background: var(--bs-tertiary-bg);
                    margin-bottom: 1rem;
                }
                .ruleset-header .ruleset-icon {
                    width: 48px; height: 48px;
                    border-radius: 0.5rem;
                    background: rgba(13, 110, 253, 0.10);
                    color: var(--bs-primary);
                    display: inline-flex; align-items: center; justify-content: center;
                    font-size: 1.5rem;
                    flex-shrink: 0;
                }
                .ruleset-header .ruleset-name {
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin: 0 0 0.15rem;
                    color: var(--bs-emphasis-color, var(--bs-body-color));
                }
                .ruleset-header .ruleset-reasoning {
                    color: var(--bs-secondary-color);
                    font-size: 0.9rem;
                    margin: 0 0 0.5rem;
                    max-width: 720px;
                }
                .ruleset-header .ruleset-chips {
                    display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;
                }
                .rs-active-switch {
                    display: inline-flex; align-items: center; gap: 0.5rem;
                    cursor: pointer; user-select: none;
                    font-size: 0.85rem; color: var(--bs-secondary-color);
                }
                .rs-active-switch input { display: none; }
                .rs-active-switch .rs-track {
                    width: 36px; height: 20px;
                    background: var(--bs-secondary-bg);
                    border-radius: 999px;
                    position: relative; transition: background 0.15s;
                }
                .rs-active-switch .rs-track::after {
                    content: '';
                    position: absolute; top: 2px; left: 2px;
                    width: 16px; height: 16px;
                    background: #fff; border-radius: 999px;
                    transition: transform 0.15s;
                }
                .rs-active-switch input:checked + .rs-track { background: var(--bs-success); }
                .rs-active-switch input:checked + .rs-track::after { transform: translateX(16px); }
                .rs-active-switch input:checked ~ .rs-track-label { color: var(--bs-body-color); font-weight: 500; }
                [data-bs-theme="dark"] .ruleset-header .ruleset-icon {
                    background: rgba(77, 139, 255, 0.16);
                }
            </style>
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start gap-3">
                    <div class="d-flex align-items-start gap-3" style="min-width: 0; flex: 1;">
                        <div class="ruleset-icon"><i class="bi bi-gear-wide-connected"></i></div>
                        <div style="min-width: 0;">
                            <h2 class="ruleset-name">{{model.name}}</h2>
                            ${reasoning ? `<p class="ruleset-reasoning">{{model.metadata.reasoning}}</p>` : ''}
                            <div class="ruleset-chips">
                                <span class="badge text-bg-primary"><i class="bi bi-tag-fill me-1"></i>{{model.category}}</span>
                                <span class="badge text-bg-secondary"><i class="bi bi-flag me-1"></i>Priority {{model.priority}}</span>
                                <span class="badge bg-secondary-subtle text-body-secondary border"><i class="bi bi-hash me-1"></i>ID {{model.id}}</span>
                                ${proposed ? `<span class="badge text-bg-warning"><i class="bi bi-stars me-1"></i>AI-proposed</span>` : ''}
                                ${modifiedRel ? `<span class="badge bg-secondary-subtle text-body-secondary"><i class="bi bi-clock-history me-1"></i>Modified ${this.escapeHtml(modifiedRel)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <label class="rs-active-switch" data-bs-toggle="tooltip" title="Toggle whether this ruleset processes incoming events">
                            <input type="checkbox" data-action="toggle-active" ${isActive ? 'checked' : ''}>
                            <span class="rs-track"></span>
                            <span class="rs-track-label">Active</span>
                        </label>
                        <button class="btn btn-outline-secondary btn-sm" data-action="edit-ruleset">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <div data-container="ruleset-context-menu"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async onActionToggleActive(event, element) {
        const checked = !!element.checked;
        element.disabled = true;
        try {
            this.model.set('is_active', checked);
            const resp = await this.model.save();
            if (resp && resp.status && resp.status >= 400) {
                throw new Error('Save failed');
            }
            this.getApp()?.toast?.success(`RuleSet ${checked ? 'enabled' : 'disabled'}`);
            this.emit('ruleset:updated');
        } catch (err) {
            // Revert on failure
            this.model.set('is_active', !checked);
            element.checked = !checked;
            this.getApp()?.toast?.error(`Failed to update RuleSet: ${err.message}`);
        } finally {
            element.disabled = false;
        }
    }

    async onActionEditRuleset() {
        this.emit('action:edit-ruleset');
    }
}


// ── Overview section ───────────────────────────────────────

class RuleSetOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-overview-section p-3',
            template: `
                <div class="row g-3 mb-3">
                    <div class="col-6 col-md-3" data-container="kpi-status"></div>
                    <div class="col-6 col-md-3" data-container="kpi-incidents"></div>
                    <div class="col-6 col-md-3" data-container="kpi-last-fired"></div>
                    <div class="col-6 col-md-3" data-container="kpi-match"></div>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-body">
                                <h6 class="mb-2"><i class="bi bi-funnel me-1"></i>What triggers this rule</h6>
                                <ul class="mb-0 ps-3 small text-body-secondary">
                                    <li>Event category is <code>{{model.category}}</code></li>
                                    <li>{{bundleSummary}}</li>
                                    <li>{{thresholdSummary}}</li>
                                    <li>{{retriggerSummary}}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-body">
                                <h6 class="mb-2"><i class="bi bi-tools me-1"></i>What happens when it fires</h6>
                                <ul class="mb-0 ps-3 small text-body-secondary" id="overview-handler-summary">
                                    <!-- filled in onInit -->
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        this.recentIncidentCount = options.recentIncidentCount ?? null;
        this.lastFiredEpoch = options.lastFiredEpoch ?? null;
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

        // KPI cards
        this.kpiStatus = new MetricCard({
            containerId: 'kpi-status',
            label: 'Status',
            value: isActive ? 'Active' : 'Inactive',
            icon: isActive ? 'bi-check-circle-fill' : 'bi-pause-circle-fill',
            tone: isActive ? 'success' : 'default'
        });
        this.kpiIncidents = new MetricCard({
            containerId: 'kpi-incidents',
            label: 'Incidents (30d)',
            value: this.recentIncidentCount == null ? '—' : this.recentIncidentCount,
            tone: this.recentIncidentCount > 0 ? 'warning' : 'default',
            action: 'view-incidents'
        });
        this.kpiLastFired = new MetricCard({
            containerId: 'kpi-last-fired',
            label: 'Last fired',
            value: this.lastFiredEpoch ? formatRelative(this.lastFiredEpoch) : 'Never',
            tone: 'default'
        });
        this.kpiMatch = new MetricCard({
            containerId: 'kpi-match',
            label: 'Match logic',
            value: matchByLabel(m.get('match_by'))
        });

        this.addChild(this.kpiStatus);
        this.addChild(this.kpiIncidents);
        this.addChild(this.kpiLastFired);
        this.addChild(this.kpiMatch);
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

    /** Update the "Incidents (30d)" KPI card after the Incidents section fetches */
    setRecentIncidentCount(count, lastFiredEpoch) {
        this.recentIncidentCount = count;
        this.lastFiredEpoch = lastFiredEpoch ?? this.lastFiredEpoch;
        if (this.kpiIncidents) this.kpiIncidents.setValue(count == null ? '—' : count);
        if (this.kpiLastFired) this.kpiLastFired.setValue(this.lastFiredEpoch ? formatRelative(this.lastFiredEpoch) : 'Never');
    }
}


// ── Conditions section ─────────────────────────────────────

class RuleSetConditionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-conditions-section p-3',
            template: `
                <div class="d-flex justify-content-between align-items-baseline mb-3">
                    <div>
                        <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">{{rulesCountLabel}}</div>
                        <h5 class="mb-0">Conditions</h5>
                    </div>
                </div>
                <div data-container="conditions-table"></div>
            `,
            ...options
        });

        this.rulesetId = options.rulesetId;
    }

    async onInit() {
        const collection = new RuleList({ params: { parent: this.rulesetId } });
        this.collection = collection;

        this.tableView = new TableView({
            containerId: 'conditions-table',
            collection,
            hideActivePillNames: ['parent'],
            columns: [
                { key: 'id', label: 'ID', width: '70px' },
                { key: 'name', label: 'Name' },
                { key: 'field_name', label: 'Field' },
                { key: 'comparator', label: 'Comparator', width: '120px' },
                { key: 'value', label: 'Value' },
                { key: 'value_type', label: 'Type', width: '100px' }
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

        // Listen for collection length to update the eyebrow + emit count up
        collection.on('fetch:success', () => this._updateCount());
    }

    _updateCount() {
        const n = this.collection?.models?.length ?? 0;
        this.rulesCountLabel = n === 1 ? '1 condition' : `${n} conditions`;
        const matchByVal = this.parent?.model?.get('match_by');
        const matchSuffix = matchByVal === 1 ? ' · ANY must match' : ' · ALL must match';
        this.rulesCountLabel += matchSuffix;
        const eyebrow = this.element?.querySelector('.text-body-secondary.text-uppercase');
        if (eyebrow) eyebrow.textContent = this.rulesCountLabel;
        this.emit('count:changed', n);
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
            <style>
                .rs-flow {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    background: var(--bs-tertiary-bg);
                    border: 1px solid var(--bs-border-color);
                    border-radius: 0.5rem;
                    overflow: hidden;
                    margin-bottom: 1rem;
                }
                .rs-flow-step {
                    padding: 1rem 1.05rem;
                    background: var(--bs-body-bg);
                    position: relative;
                    min-width: 0;
                }
                .rs-flow-step + .rs-flow-step { border-left: 1px solid var(--bs-border-color); }
                .rs-flow-step::after {
                    content: '';
                    position: absolute;
                    right: -8px; top: 50%;
                    transform: translateY(-50%) rotate(45deg);
                    width: 14px; height: 14px;
                    background: var(--bs-body-bg);
                    border-top: 1px solid var(--bs-border-color);
                    border-right: 1px solid var(--bs-border-color);
                    z-index: 1;
                }
                .rs-flow-step:last-child::after { display: none; }
                .rs-flow-num {
                    font-family: var(--bs-font-monospace);
                    font-size: 0.7rem;
                    color: var(--bs-tertiary-color, var(--bs-secondary-color));
                    font-weight: 600;
                }
                .rs-flow-title {
                    font-size: 0.95rem;
                    font-weight: 600;
                    margin: 0.15rem 0 0.4rem;
                    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
                    color: var(--bs-emphasis-color, var(--bs-body-color));
                }
                .rs-flow-title .btn { padding: 0.1rem 0.4rem; font-size: 0.75rem; }
                .rs-flow-value { font-size: 0.95rem; color: var(--bs-body-color); font-weight: 500; }
                .rs-flow-empty { color: var(--bs-secondary-color); font-style: italic; font-weight: 400; }
                .rs-flow-hint { font-size: 0.78rem; color: var(--bs-secondary-color); margin-top: 0.3rem; }
                @media (max-width: 768px) {
                    .rs-flow { grid-template-columns: 1fr 1fr; }
                    .rs-flow-step:nth-child(2)::after { display: none; }
                }
                @media (max-width: 480px) {
                    .rs-flow { grid-template-columns: 1fr; }
                    .rs-flow-step + .rs-flow-step { border-left: none; border-top: 1px solid var(--bs-border-color); }
                    .rs-flow-step::after { display: none; }
                }
            </style>
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

    async onActionEditStep() { this.emit('action:edit-ruleset'); }
    async onActionEditAll()  { this.emit('action:edit-ruleset'); }
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
            <style>
                .rs-chain {
                    display: flex;
                    gap: 0.6rem;
                    flex-wrap: wrap;
                    align-items: stretch;
                    margin-bottom: 0.75rem;
                }
                .rs-chain-step {
                    flex: 1 1 200px;
                    background: var(--bs-tertiary-bg);
                    border: 1px solid var(--bs-border-color);
                    border-left-width: 3px;
                    border-radius: 0.5rem;
                    padding: 0.85rem 0.95rem;
                    display: flex;
                    gap: 0.7rem;
                    align-items: flex-start;
                    position: relative;
                }
                .rs-chain-step.tone-info    { border-left-color: var(--bs-info); }
                .rs-chain-step.tone-warning { border-left-color: var(--bs-warning); }
                .rs-chain-step.tone-danger  { border-left-color: var(--bs-danger); }
                .rs-chain-step.tone-primary { border-left-color: var(--bs-primary); }
                .rs-chain-icon {
                    width: 32px; height: 32px;
                    border-radius: 0.375rem;
                    display: inline-flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    font-size: 1rem;
                    background: var(--bs-secondary-bg);
                    color: var(--bs-body-color);
                }
                .rs-chain-step.tone-info    .rs-chain-icon { background: rgba(13, 110, 253, 0.12); color: var(--bs-info); }
                .rs-chain-step.tone-warning .rs-chain-icon { background: rgba(255, 193, 7, 0.16);  color: var(--bs-warning); }
                .rs-chain-step.tone-danger  .rs-chain-icon { background: rgba(220, 53, 69, 0.16);  color: var(--bs-danger); }
                .rs-chain-step.tone-primary .rs-chain-icon { background: rgba(13, 110, 253, 0.12); color: var(--bs-primary); }
                .rs-chain-label  { font-weight: 600; font-size: 0.9rem; color: var(--bs-emphasis-color, var(--bs-body-color)); }
                .rs-chain-detail { font-size: 0.8rem; color: var(--bs-secondary-color); word-break: break-all; }
                .rs-chain-raw {
                    margin-top: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: var(--bs-secondary-bg);
                    border-radius: 0.375rem;
                    font-family: var(--bs-font-monospace);
                    font-size: 0.78rem;
                    color: var(--bs-secondary-color);
                    word-break: break-all;
                }
            </style>
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
            <style>
                .rs-prompt {
                    width: 100%;
                    min-height: 220px;
                    background: var(--bs-secondary-bg);
                    color: var(--bs-body-color);
                    border: 1px solid var(--bs-border-color);
                    border-radius: 0.5rem;
                    padding: 0.85rem 1rem;
                    font-family: var(--bs-font-monospace);
                    font-size: 0.85rem;
                    line-height: 1.5;
                    resize: vertical;
                }
                .rs-prompt:focus { outline: 2px solid var(--bs-primary); outline-offset: -1px; border-color: transparent; }
            </style>
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
            template: `
                <div class="d-flex justify-content-between align-items-baseline mb-3 gap-2 flex-wrap">
                    <div>
                        <div class="text-body-secondary text-uppercase small fw-semibold" id="rs-incidents-eyebrow" style="letter-spacing: 0.05em;">Incidents fired by this rule</div>
                        <h5 class="mb-0">Incidents</h5>
                    </div>
                    <div data-container="incidents-range"></div>
                </div>
                <div data-container="incidents-table"></div>
            `,
            ...options
        });

        this.rulesetId = options.rulesetId;
        this.range = '30d';
    }

    async onInit() {
        this.collection = new IncidentList({ params: this._buildParams() });
        this.tableView = new TableView({
            containerId: 'incidents-table',
            collection: this.collection,
            hideActivePillNames: ['rule_set', 'created__gte'],
            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true },
                {
                    key: 'created', label: 'Created', sortable: true, width: '180px',
                    template: `<div>{{{model.created|epoch|datetime}}}</div><div class="text-body-secondary small">{{{model.created|epoch|relative}}}</div>`
                },
                { key: 'status', label: 'Status', width: '110px', formatter: 'badge' },
                { key: 'priority', label: 'Priority', width: '90px' },
                { key: 'title', label: 'Title', formatter: "truncate(80)|default('—')" },
                { key: 'event_count', label: 'Events', width: '90px' }
            ],
            showAdd: false,
            actions: ['view'],
            paginated: true,
            size: 10
        });
        this.addChild(this.tableView);

        this.range = new SegmentControl({
            containerId: 'incidents-range',
            options: [
                { value: '7d', label: '7d' },
                { value: '30d', label: '30d' },
                { value: '90d', label: '90d' }
            ],
            value: '30d',
            ariaLabel: 'Time range'
        });
        this.range.on('change', ({ value }) => this._applyRange(value));
        this.addChild(this.range);

        this.collection.on('fetch:success', () => this._updateEyebrow());
    }

    _buildParams() {
        const days = this.range === '7d' ? 7 : this.range === '90d' ? 90 : 30;
        const since = Math.floor(Date.now() / 1000) - days * 86400;
        return {
            rule_set: this.rulesetId,
            created__gte: since,
            sort: '-created'
        };
    }

    async _applyRange(value) {
        this.range = value;
        this.collection.setParams(this._buildParams());
        await this.collection.fetch();
    }

    _updateEyebrow() {
        const count = this.collection?.totalCount ?? this.collection?.models?.length ?? 0;
        const days = this.range === '7d' ? 7 : this.range === '90d' ? 90 : 30;
        const eyebrow = this.element?.querySelector('#rs-incidents-eyebrow');
        if (eyebrow) eyebrow.textContent = `${count} incident${count === 1 ? '' : 's'} in last ${days} days`;
        const last = this.collection?.models?.[0]?.get?.('created');
        this.emit('count:changed', { count, lastFired: last });
    }
}


// ── Metadata section ───────────────────────────────────────

class RuleSetMetadataSection extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-metadata-section p-3',
            template: `
                <div class="mb-3">
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">Every key on ruleset.metadata</div>
                    <h5 class="mb-0">Metadata</h5>
                </div>
                {{#hasKnown|bool}}
                    <h6 class="text-body-secondary small text-uppercase mt-3 mb-2" style="letter-spacing: 0.06em;">Known fields</h6>
                    <div data-container="metadata-known"></div>
                {{/hasKnown|bool}}
                <h6 class="text-body-secondary small text-uppercase mt-4 mb-2" style="letter-spacing: 0.06em;">Raw JSON</h6>
                <pre class="bg-body-tertiary border rounded p-3 small mb-0" style="white-space: pre-wrap; word-break: break-word;"><code>{{model.metadata|json}}</code></pre>
            `,
            ...options
        });

        const meta = options.model?.get?.('metadata') || {};
        const known = ['reasoning', 'assistant_proposed', 'delete_on_resolution', 'agent_prompt'];
        this.hasKnown = known.some(k => meta[k] !== undefined && meta[k] !== null && meta[k] !== '');
    }

    async onInit() {
        if (!this.hasKnown) return;
        const meta = this.model.get('metadata') || {};
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

class RuleSetView extends View {
    constructor(options = {}) {
        super({
            className: 'ruleset-view',
            ...options
        });

        this.model = options.model || new RuleSet(options.data || {});

        this.template = `
            <div class="ruleset-view-container">
                <div data-container="ruleset-header"></div>
                <div data-container="ruleset-sidenav"></div>
            </div>
        `;
    }

    async onInit() {
        // Header
        this.headerView = new RuleSetHeaderSection({
            containerId: 'ruleset-header',
            model: this.model
        });
        this.headerView.on('ruleset:updated', () => this._refreshFromHeader());
        this.headerView.on('action:edit-ruleset', () => this.onActionEditRuleset());
        this.addChild(this.headerView);

        // Section views
        this.overviewSection   = new RuleSetOverviewSection({ model: this.model });
        this.conditionsSection = new RuleSetConditionsSection({ model: this.model, rulesetId: this.model.get('id') });
        this.triggeringSection = new RuleSetTriggeringSection({ model: this.model });
        this.handlerSection    = new RuleSetHandlerChainSection({ model: this.model });
        this.agentSection      = new RuleSetAgentPromptSection({ model: this.model });
        this.incidentsSection  = new RuleSetIncidentsSection({ model: this.model, rulesetId: this.model.get('id') });
        this.metadataSection   = new RuleSetMetadataSection({ model: this.model });

        // Cross-section navigation events
        const navHandler = (key) => this.sideNav?.showSection(key);
        this.overviewSection.on('navigate', navHandler);
        this.triggeringSection.on('navigate', navHandler);
        this.handlerSection.on('navigate', navHandler);
        this.agentSection.on('navigate', navHandler);

        // Bubble up edit-ruleset / edit-handler from sections to this view
        this.triggeringSection.on('action:edit-ruleset', () => this.onActionEditRuleset());
        this.handlerSection.on('action:edit-handler', () => this.onActionEditHandler());

        // Live count updates
        this.conditionsSection.on('count:changed', (n) => {
            this.sideNav?.setBadge('Conditions', n > 0 ? { text: String(n), variant: 'muted' } : null);
        });
        this.incidentsSection.on('count:changed', ({ count, lastFired }) => {
            this.sideNav?.setBadge('Incidents', count > 0 ? { text: String(count), variant: count > 10 ? 'warning' : 'muted' } : null);
            this.overviewSection?.setRecentIncidentCount(count, lastFired);
        });

        // Metadata section is hidden if metadata is empty
        const meta = this.model.get('metadata') || {};
        const hasMetadata = Object.keys(meta).length > 0;

        const sections = [
            { key: 'Overview',     label: 'Overview',     icon: 'bi-grid-1x2',           view: this.overviewSection },
            { key: 'Conditions',   label: 'Conditions',   icon: 'bi-funnel',             view: this.conditionsSection },
            { key: 'Triggering',   label: 'Triggering',   icon: 'bi-stopwatch',          view: this.triggeringSection },
            { key: 'Handler',      label: 'Handler',      icon: 'bi-tools',              view: this.handlerSection },
            { key: 'Agent',        label: 'Agent Prompt', icon: 'bi-stars',              view: this.agentSection },
            { type: 'divider', label: 'Activity' },
            { key: 'Incidents',    label: 'Incidents',    icon: 'bi-shield-exclamation', view: this.incidentsSection }
        ];
        if (hasMetadata) {
            sections.push({ type: 'divider', label: 'Detail' });
            sections.push({ key: 'Metadata', label: 'Metadata', icon: 'bi-braces', view: this.metadataSection });
        }

        this.sideNav = new SideNavView({
            containerId: 'ruleset-sidenav',
            sections,
            activeSection: 'Overview',
            navWidth: 200,
            contentPadding: '0',
            enableResponsive: true,
            minWidth: 600
        });
        this.addChild(this.sideNav);
    }

    /** Refresh after the header toggles is_active */
    async _refreshFromHeader() {
        // Re-render only the header (model state is already saved)
        await this.headerView.render();
    }

    /** ContextMenu actions live on the header — nothing here for now;
     *  context menu is wired in onAfterRender so the model is available. */
    async onAfterRender() {
        await super.onAfterRender();
        if (this._contextMenuMounted) return;
        this._contextMenuMounted = true;

        const contextMenu = new ContextMenu({
            containerId: 'ruleset-context-menu',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit RuleSet',       action: 'edit-ruleset',       icon: 'bi-pencil' },
                    { label: 'Edit Handler Chain', action: 'edit-handler',       icon: 'bi-tools' },
                    { label: 'Edit Agent Prompt',  action: 'edit-agent-prompt',  icon: 'bi-stars' },
                    { type: 'divider' },
                    { label: 'View Incidents',     action: 'view-incidents',     icon: 'bi-shield-exclamation' },
                    { type: 'divider' },
                    { label: 'Disable',            action: 'disable-ruleset',    icon: 'bi-toggle-off' },
                    { label: 'Delete RuleSet',     action: 'delete-ruleset',     icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.headerView.addChild(contextMenu);
        await contextMenu.render();
    }

    // ── Action handlers ────────────────────────────────────

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
        await this.sideNav?.showSection('Agent');
        this.agentSection?.focusTextarea();
    }

    async onActionViewIncidents() {
        await this.sideNav?.showSection('Incidents');
    }

    async onActionDisableRuleset() {
        const isActive = this.model.get('is_active');
        const newStatus = !isActive;
        try {
            this.model.set('is_active', newStatus);
            await this.model.save();
            this.getApp()?.toast?.success(`RuleSet ${newStatus ? 'enabled' : 'disabled'}`);
            await this._fullRefresh();
        } catch (err) {
            this.getApp()?.toast?.error(`Failed to update RuleSet: ${err.message}`);
        }
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
