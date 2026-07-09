/**
 * GeofenceRulesView - "Rules" tab of the Geofencing admin page.
 *
 * Left: the platform rules editor (guided plain-language form; a validated
 * JSON view for advanced shapes). Rules are written ONLY through
 * POST /api/geo/rules — server-validated with human-readable 400s that
 * surface inline (never a generic Settings editor, which bypasses rule
 * validation). Right: the current policy in plain language plus the change
 * history (geofence_config incident events; needs security-events access).
 *
 * The editor requires the global manage-geofence grant; view-only users get
 * the policy/summary side only.
 */
import View from '@core/View.js';
import FormView from '@core/forms/FormView.js';
import TableView from '@core/views/table/TableView.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import Modal from '@core/views/feedback/Modal.js';
import { IncidentEventList } from '@ext/admin/models/Incident.js';
import {
    describeRule,
    ruleToForm,
    formToRule,
    isAdvancedRule,
    coerceRuleInput,
    GEOFENCE_MANAGE_PERMS,
    SECURITY_EVENTS_PERMS
} from './geofenceData.js';
import { buildRuleFields, countryName } from './GeofenceRuleForm.js';

const CLAUSE_ICONS = {
    block: 'bi-slash-circle',
    warn: 'bi-exclamation-triangle',
    ok: 'bi-check-circle'
};

class GeofenceRulesView extends View {
    constructor(options = {}) {
        super({
            className: 'geofence-rules-view',
            template: `
                <div class="row g-3">
                    <div class="col-lg-7">
                        {{^configLoaded}}
                        <div class="card">
                            <div class="card-body text-secondary small">
                                <span class="spinner-border spinner-border-sm me-2"></span>
                                Waiting for the geofence configuration — if it can't be loaded,
                                the status above explains why.
                            </div>
                        </div>
                        {{/configLoaded}}
                        {{#configLoaded|bool}}
                        {{#canManage|bool}}
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                <span class="fw-semibold">Edit platform rules</span>
                                <span class="geofence-eyebrow ms-auto">applies to every group</span>
                            </div>
                            <div class="card-body">
                                {{#confSource|bool}}
                                <div class="alert alert-info py-2 small mb-3">
                                    <i class="bi bi-lock me-1"></i>These rules come from the <b>deployment file</b>.
                                    Saving here creates a portal-managed override that takes precedence;
                                    removing the override falls back to the deploy-file rules.
                                </div>
                                {{/confSource|bool}}
                                {{#advancedForced|bool}}
                                <div class="alert alert-warning py-2 small mb-3">
                                    <i class="bi bi-braces me-1"></i>These rules use options the guided editor
                                    can't represent, so they're shown as JSON. Edits are still validated by
                                    the server on save.
                                </div>
                                {{/advancedForced|bool}}
                                <div data-container="rules-form"></div>
                                {{^advancedForced}}
                                <button type="button" class="btn btn-link btn-sm px-1 mt-1" data-action="toggle-advanced">
                                    {{#advancedMode|bool}}Back to the guided editor{{/advancedMode|bool}}{{^advancedMode|bool}}Edit as JSON (advanced){{/advancedMode|bool}}
                                </button>
                                {{/advancedForced}}
                                <div class="d-flex align-items-center gap-2 border-top pt-3 mt-2 flex-wrap">
                                    <button type="button" class="btn btn-primary btn-sm" data-action="save-rules">
                                        <i class="bi bi-check-lg me-1"></i>Save rules
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" data-action="discard-rules">Discard changes</button>
                                    <span class="geofence-rules-status small text-secondary"></span>
                                    {{#isSettingSource|bool}}
                                    <button type="button" class="btn btn-link btn-sm text-danger ms-auto px-1" data-action="remove-override">Remove portal override…</button>
                                    {{/isSettingSource|bool}}
                                </div>
                            </div>
                        </div>
                        {{/canManage|bool}}
                        {{^canManage}}
                        <div class="card">
                            <div class="card-body text-secondary small">
                                <i class="bi bi-eye me-1"></i>You have read-only access to geofencing.
                                Editing platform rules requires the manage-geofence permission.
                            </div>
                        </div>
                        {{/canManage}}
                        {{/configLoaded|bool}}
                    </div>
                    <div class="col-lg-5">
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                <span class="fw-semibold">Current policy</span>
                                <span class="geofence-eyebrow ms-auto">plain language</span>
                            </div>
                            <div class="card-body">
                                {{#clauses}}
                                    <div class="geofence-clause geofence-clause-{{.tone}}">
                                        <i class="bi {{.icon}}"></i><span>{{.text}}</span>
                                    </div>
                                {{/clauses}}
                                {{^clauses}}
                                    <div class="text-secondary small">No rules configured — all locations are allowed.</div>
                                {{/clauses}}
                                <div class="geofence-clause geofence-clause-note">
                                    <i class="bi bi-plus-circle"></i><span>Groups may add stricter rules of their own on top.</span>
                                </div>
                            </div>
                        </div>
                        <div class="card mt-3">
                            <div class="card-header"><span class="fw-semibold">Change history</span></div>
                            {{#canSeeHistory|bool}}
                                <div data-container="rules-history"></div>
                                <div class="card-footer text-secondary small py-2">Every save is recorded with who and when.</div>
                            {{/canSeeHistory|bool}}
                            {{^canSeeHistory}}
                                <div class="card-body text-secondary small">Change history requires security-events access.</div>
                            {{/canSeeHistory}}
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        this.config = null;
        this.configLoaded = false;
        this.rule = {};
        this.clauses = [];
        this.canManage = false;
        this.canSeeHistory = false;
        this.advancedMode = false;
        this.advancedForced = false;
        this.confSource = false;
        this.isSettingSource = false;
        this.formView = null;
        this.historyTable = null;
    }

    /** Rebuild the whole tab from a GET /api/geo/rules payload. */
    async setConfig(config) {
        this.config = config || {};
        this.configLoaded = true;
        this.rule = this.config.system?.rule || {};
        const source = this.config.system?.source || 'none';

        this.canManage = this.checkPermissions(GEOFENCE_MANAGE_PERMS);
        this.canSeeHistory = this.checkPermissions(SECURITY_EVENTS_PERMS);
        this.confSource = source === 'conf';
        this.isSettingSource = source === 'setting';
        this.advancedForced = isAdvancedRule(this.rule);
        this.advancedMode = this.advancedForced;
        this.clauses = this._prepareClauses(this.rule);

        if (this.formView) { this.removeChild(this.formView); this.formView = null; }
        if (this.historyTable) { this.removeChild(this.historyTable); this.historyTable = null; }

        await this.render();

        if (this.canManage) {
            this.formView = this._buildFormView(this.rule);
            this.addChild(this.formView);
            await this.formView.render();
        }
        if (this.canSeeHistory) {
            this.historyCollection = new IncidentEventList({
                params: { category: 'geofence_config', size: 10, sort: '-created' }
            });
            this.historyTable = new TableView({
                containerId: 'rules-history',
                collection: this.historyCollection,
                showFullscreen: false,
                searchable: false,
                hideActivePillNames: ['category'],
                emptyMessage: 'No changes recorded.',
                columns: [
                    { key: 'created', label: 'When', formatter: 'datetime', width: '160px' },
                    // Function-formatter output lands in cell.innerHTML raw —
                    // escape the server-sourced fields.
                    { key: 'metadata.username', label: 'Who', formatter: (v) => MOJOUtils.escapeHtml(String(v || '—')) },
                    { key: 'title', label: 'What changed', formatter: (v) => MOJOUtils.escapeHtml(String(v || '')) }
                ]
            });
            this.addChild(this.historyTable);
            await this.historyTable.render();
            this.historyCollection.fetch().catch(() => {});
        }
    }

    _prepareClauses(rule) {
        return describeRule(rule, { countryName })
            .map(c => ({ ...c, icon: CLAUSE_ICONS[c.tone] || CLAUSE_ICONS.block }));
    }

    _buildFormView(rule) {
        if (this.advancedMode) {
            const json = JSON.stringify(rule || {}, null, 2);
            return new FormView({
                containerId: 'rules-form',
                fields: [{
                    name: 'rule_json',
                    type: 'json',
                    label: 'Rule (JSON)',
                    help: "Top-level keys: country, region, abuse. Operators: in, not_in, eq.",
                    rows: 10,
                    columns: 12
                }],
                data: { rule_json: json }
            });
        }
        const form = ruleToForm(rule);
        return new FormView({
            containerId: 'rules-form',
            fields: buildRuleFields(form),
            data: { ...form }
        });
    }

    /** Assemble the rule from the current editor state; null on invalid JSON. */
    async _assembleRule() {
        const fd = await this.formView.getFormData();
        if (this.advancedMode) {
            return coerceRuleInput(fd.rule_json);
        }
        return formToRule(fd);
    }

    async onActionToggleAdvanced() {
        if (!this.formView) return true;
        if (this.advancedMode) {
            // JSON → guided: only when the JSON parses AND is representable.
            const rule = await this._assembleRule();
            if (rule === null) {
                this._fail('Fix the JSON before switching back to the guided editor.');
                return true;
            }
            if (isAdvancedRule(rule)) {
                this._fail("This rule uses options the guided editor can't represent.");
                return true;
            }
            this.advancedMode = false;
            await this._swapForm(rule);
        } else {
            // Guided → JSON: carry the unsaved edits across.
            const rule = formToRule(await this.formView.getFormData());
            this.advancedMode = true;
            await this._swapForm(rule);
        }
        return true;
    }

    /** Replace the embedded form (mode switch / discard) without a data reload. */
    async _swapForm(rule) {
        this.removeChild(this.formView);
        await this.render();
        this.formView = this._buildFormView(rule);
        this.addChild(this.formView);
        await this.formView.render();
    }

    async onActionSaveRules() {
        if (!this.formView) return true;
        const rule = await this._assembleRule();
        if (rule === null) {
            this._fail('Not saved — the JSON is invalid.');
            return true;
        }

        const app = this.getApp();
        this._setStatus('Saving…');
        app?.showLoading?.();
        let resp;
        try {
            resp = await app.rest.POST('/api/geo/rules', { rule });
        } catch {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success) {
            this._setStatus('Saved — rules are live.', 'success');
            app?.toast?.success('Platform rules saved');
            this.emit('config-changed');
        } else {
            this._fail(resp?.data?.error || resp?.message || 'Failed to save rules');
        }
        return true;
    }

    async onActionDiscardRules() {
        await this.setConfig(this.config);
        return true;
    }

    async onActionRemoveOverride() {
        const ok = await Modal.confirm(
            'Remove the portal-managed rules? The server falls back to the deploy-file rules (or none). Cached decisions are invalidated immediately.',
            'Remove portal override',
            { confirmText: 'Remove override', confirmClass: 'btn-danger' }
        );
        if (!ok) return true;

        const app = this.getApp();
        app?.showLoading?.();
        let resp;
        try {
            resp = await app.rest.DELETE('/api/geo/rules');
        } catch {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success) {
            app?.toast?.success('Portal override removed');
            this.emit('config-changed');
        } else {
            this._fail(resp?.data?.error || resp?.message || 'Failed to remove the override');
        }
        return true;
    }

    _fail(msg) {
        this._setStatus(msg, 'danger');
        this.getApp()?.toast?.error(msg);
    }

    _setStatus(text, tone) {
        const el = this.element?.querySelector('.geofence-rules-status');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'geofence-rules-status small '
            + (tone === 'danger' ? 'text-danger'
                : tone === 'success' ? 'text-success'
                : 'text-secondary');
    }
}

export default GeofenceRulesView;
