/**
 * GroupGeofenceSection - GroupView sidebar section for the group's geofence
 * rules (`Group.metadata.geofence`).
 *
 * Shows three layers so an operator always sees the effective policy, never
 * just the fragment they can edit:
 *   1. the platform floor (read-only, from GET /api/geo/rules?group_uuid=),
 *   2. this group's additional rules (editable — they can only tighten),
 *   3. the effective policy (floor + group, each clause tagged by source).
 *
 * Saves go through the standard group REST. django deep-merges the metadata
 * JSONField (a null value deletes a key; nested __replace is NOT supported),
 * so the payload is built by geofenceData.buildGroupRulePayload — the new
 * rule plus explicit nulls for anything removed. The server validates the
 * merged rule and 400s with a human-readable message, surfaced inline.
 *
 * Mirrors GroupAuthConfigSection: embedded FormView, explicit Save, inline
 * status + toast on failure, `_onModelChange` no-op so a model change never
 * rebuilds the form under the user.
 */
import View from '@core/View.js';
import FormView from '@core/forms/FormView.js';
import {
    describeRule,
    ruleToForm,
    formToRule,
    isAdvancedRule,
    coerceRuleInput,
    buildGroupRulePayload
} from '@ext/admin/security/geofence/geofenceData.js';
import { buildRuleFields, countryName } from '@ext/admin/security/geofence/GeofenceRuleForm.js';

// Editing the group layer needs either the global geofence grant or group
// management rights (the group REST enforces its own save perms — a 403
// from it still surfaces inline).
const GROUP_GEOFENCE_EDIT_PERMS = ['sys.manage_geofence', 'sys.security', 'sys.manage_groups', 'sys.groups'];

const CLAUSE_ICONS = { block: 'bi-slash-circle', warn: 'bi-exclamation-triangle', ok: 'bi-check-circle' };

class GroupGeofenceSection extends View {
    constructor(options = {}) {
        super({
            className: 'group-geofence-section',
            template: `
                <div class="detail-section-eyebrow">Geofencing</div>
                <p class="text-secondary small mb-3">
                    Rules here apply only to this group and can only <b>tighten</b> the
                    platform rules — they can't loosen the platform floor.
                </p>

                <div class="card bg-body-tertiary mb-3">
                    <div class="card-header d-flex align-items-center">
                        <span class="fw-semibold"><i class="bi bi-lock me-2"></i>Platform floor — read only</span>
                    </div>
                    <div class="card-body">
                        {{#floorClauses}}
                        <div class="geofence-clause geofence-clause-{{.tone}}"><i class="bi {{.icon}}"></i><span>{{.text}}</span></div>
                        {{/floorClauses}}
                        {{^floorClauses}}
                        <div class="text-secondary small">{{floorEmptyText}}</div>
                        {{/floorClauses}}
                    </div>
                </div>

                {{#canEdit|bool}}
                <div class="card mb-3">
                    <div class="card-header"><span class="fw-semibold">This group's additional rules</span></div>
                    <div class="card-body">
                        {{#advancedForced|bool}}
                        <div class="alert alert-warning py-2 small mb-3">
                            <i class="bi bi-braces me-1"></i>This group's rule uses options the guided editor
                            can't represent, so it's shown as JSON. Edits are still validated by the server on save.
                        </div>
                        {{/advancedForced|bool}}
                        <div data-container="group-geofence-form"></div>
                        <div class="d-flex align-items-center justify-content-end gap-3 mt-3 pt-3 border-top">
                            <span class="ggs-status small text-secondary"></span>
                            <button type="button" class="btn btn-primary btn-sm" data-action="save-group-geofence">
                                <i class="bi bi-check-lg me-1"></i>Save group rules
                            </button>
                        </div>
                    </div>
                </div>
                {{/canEdit|bool}}
                {{^canEdit}}
                <div class="card mb-3">
                    <div class="card-body text-secondary small">
                        <i class="bi bi-eye me-1"></i>You have read-only access to this group's geofence rules.
                    </div>
                </div>
                {{/canEdit}}

                <div class="card">
                    <div class="card-header d-flex align-items-center">
                        <span class="fw-semibold">Effective policy for this group</span>
                        <span class="geofence-eyebrow ms-auto">what a visitor experiences</span>
                    </div>
                    <div class="card-body">
                        {{#effectiveClauses}}
                        <div class="geofence-clause geofence-clause-{{.tone}}">
                            <i class="bi {{.icon}}"></i><span>{{.text}}</span>
                            <span class="badge {{.sourceClass}} ms-2">{{.source}}</span>
                        </div>
                        {{/effectiveClauses}}
                        {{^effectiveClauses}}
                        <div class="text-secondary small">No rules apply — all locations are allowed.</div>
                        {{/effectiveClauses}}
                    </div>
                </div>
            `,
            ...options
        });

        this._floorRule = {};
        this._groupRule = {};
        this.floorClauses = [];
        this.effectiveClauses = [];
        this.floorEmptyText = 'Loading platform rules…';
        this.canEdit = false;
        this.advancedForced = false;
        this.formView = null;
    }

    async onInit() {
        this.canEdit = this.checkPermissions(GROUP_GEOFENCE_EDIT_PERMS);
        this._groupRule = this.model?.get?.('metadata')?.geofence || {};
        await this._fetchFloor();
        this._prepare();
        if (this.canEdit) {
            this.formView = this._buildFormView(this._groupRule);
            this.addChild(this.formView);
        }
    }

    /**
     * The embedded FormView owns its state; a model `change` (this section's
     * own save, or another section's edit) must not rebuild the form and wipe
     * user input. Same guard as GroupAuthConfigSection.
     */
    _onModelChange() {
        // intentionally a no-op
    }

    /** Platform floor + the server's view of this group's rule. */
    async _fetchFloor() {
        const app = this.getApp();
        const uuid = this.model?.get?.('uuid');
        if (!app?.rest || !uuid) {
            this.floorEmptyText = 'Platform rules unavailable.';
            return;
        }
        try {
            const resp = await app.rest.GET('/api/geo/rules', { group_uuid: uuid });
            if (resp?.success) {
                const cfg = resp.data?.data || {};
                this._floorRule = cfg.system?.rule || {};
                if (cfg.group && cfg.group.rule !== undefined) {
                    this._groupRule = cfg.group.rule || {};
                }
                this.floorEmptyText = 'No platform rules — the floor allows all locations.';
                return;
            }
            this.floorEmptyText = 'Platform rules unavailable (requires the global geofence permission).';
        } catch {
            this.floorEmptyText = 'Platform rules unavailable.';
        }
    }

    _prepare() {
        const decorate = (clauses) => clauses.map(c => ({ ...c, icon: CLAUSE_ICONS[c.tone] || CLAUSE_ICONS.block }));
        this.floorClauses = decorate(describeRule(this._floorRule, { countryName }));
        this.advancedForced = isAdvancedRule(this._groupRule);

        const floor = this.floorClauses.map(c => ({
            ...c, source: 'Platform', sourceClass: 'text-bg-secondary'
        }));
        const group = decorate(describeRule(this._groupRule, { countryName })).map(c => ({
            ...c, source: 'This group', sourceClass: 'text-bg-primary'
        }));
        this.effectiveClauses = [...floor, ...group];
    }

    _buildFormView(rule) {
        if (this.advancedForced) {
            return new FormView({
                containerId: 'group-geofence-form',
                fields: [{
                    name: 'rule_json',
                    type: 'json',
                    label: 'Group rule (JSON)',
                    help: 'Top-level keys: country, region, abuse. Operators: in, not_in, eq.',
                    rows: 8,
                    columns: 12
                }],
                data: { rule_json: JSON.stringify(rule || {}, null, 2) }
            });
        }
        const form = ruleToForm(rule);
        return new FormView({
            containerId: 'group-geofence-form',
            fields: buildRuleFields(form),
            data: { ...form }
        });
    }

    async onActionSaveGroupGeofence() {
        if (!this.formView) return true;
        const app = this.getApp();
        const fd = await this.formView.getFormData();

        let newRule;
        if (this.advancedForced) {
            newRule = coerceRuleInput(fd.rule_json);
            if (newRule === null) {
                this._fail('Not saved — the rule must be a valid JSON object.');
                return true;
            }
        } else {
            newRule = formToRule(fd);
        }

        const payload = buildGroupRulePayload(this._groupRule, newRule);
        if (payload === null) {
            this._setStatus('No changes to save.');
            return true;
        }

        this._setStatus('Saving…');
        app?.showLoading?.();
        let resp;
        try {
            resp = await this.model.save({ metadata: { geofence: payload } });
        } catch {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }

        if (resp && resp.status === 200) {
            this._groupRule = newRule;
            this.advancedForced = isAdvancedRule(newRule);
            this._prepare();
            // Rebuild the section so the effective policy and the re-baselined
            // form reflect the saved state (post-mount children need explicit
            // render).
            if (this.formView) { this.removeChild(this.formView); this.formView = null; }
            await this.render();
            if (this.canEdit) {
                this.formView = this._buildFormView(this._groupRule);
                this.addChild(this.formView);
                await this.formView.render();
            }
            this._setStatus('All changes saved.', 'success');
            app?.toast?.success('Group geofence rules saved');
        } else {
            this._fail(resp?.message || resp?.data?.error || 'Failed to save the group rules');
        }
        return true;
    }

    _fail(msg) {
        this._setStatus(msg, 'danger');
        this.getApp()?.toast?.error(msg);
    }

    _setStatus(text, tone) {
        const el = this.element?.querySelector('.ggs-status');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'ggs-status small '
            + (tone === 'danger' ? 'text-danger'
                : tone === 'success' ? 'text-success'
                : 'text-secondary');
    }
}

export default GroupGeofenceSection;
