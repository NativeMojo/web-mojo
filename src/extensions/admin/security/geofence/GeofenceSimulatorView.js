/**
 * GeofenceSimulatorView - "Simulator" tab: what-if decisions via
 * POST /api/geo/simulate. Pick a location (or paste an IP), optionally a
 * group and an endpoint scope, and render the full decision with a
 * plain-language reason — including the exempt case's would-have-blocked
 * shadow outcome. Simulations are uncached, never emit evidence events, and
 * work while enforcement is off (staged-rules preview).
 *
 * Endpoint-scope options are derived from the live config — scopes are
 * deployment-defined strings, never hardcoded.
 */
import View from '@core/View.js';
import FormView from '@core/forms/FormView.js';
import { GroupList } from '@core/models/Group.js';
import {
    US_STATES,
    ABUSE_FLAGS,
    buildSimulateBody,
    describeDecision,
    describeWouldBlock,
    scopeLabel,
    collectScopes,
    regionName
} from './geofenceData.js';
import { COUNTRIES, countryName } from './GeofenceRuleForm.js';

// ── Result card ─────────────────────────────────────────────────────────────

class GeofenceSimResult extends View {
    constructor(options = {}) {
        super({
            className: 'geofence-sim-result-wrap',
            template: `
                {{#hasResult|bool}}
                <div class="geofence-sim-result {{tone}}">
                    <div class="geofence-sim-band"><i class="bi {{icon}}"></i><span>{{headline}}</span></div>
                    <div class="geofence-sim-body">
                        {{#wouldLine|bool}}<div class="geofence-sim-would small">{{wouldLine}}</div>{{/wouldLine|bool}}
                        {{#disabledNotice|bool}}
                        <div class="alert alert-secondary py-2 small mb-2">
                            <i class="bi bi-info-circle me-1"></i>Geofencing is currently <b>off</b> —
                            this shows what would happen once it's turned on.
                        </div>
                        {{/disabledNotice|bool}}
                        <div class="geofence-sim-meta small text-secondary">
                            {{#meta}}<span class="me-3">{{.label}} <b>{{.value}}</b></span>{{/meta}}
                        </div>
                    </div>
                </div>
                {{/hasResult|bool}}
                {{^hasResult}}
                <div class="geofence-sim-placeholder text-secondary small">
                    Run a test to see the decision here. Tests never affect real traffic,
                    are never cached, and leave no log entries.
                </div>
                {{/hasResult}}
            `,
            ...options
        });
        this.hasResult = false;
    }

    async setDecision(decision) {
        this.hasResult = true;
        const exempt = decision?.reason === 'ip_allowlisted';
        const allowed = decision?.allowed !== false;
        this.tone = exempt ? 'exempt' : (allowed ? 'allowed' : 'blocked');
        this.icon = exempt ? 'bi-shield-check' : (allowed ? 'bi-check-circle' : 'bi-x-circle');
        this.headline = describeDecision(decision);
        this.wouldLine = describeWouldBlock(decision);
        this.disabledNotice = decision?.posture?.enabled === false;

        const meta = [];
        const place = [decision?.region_code ? regionName(decision.region_code) : (decision?.region || ''),
            decision?.country || countryName(decision?.country_code)]
            .filter(Boolean).join(', ');
        if (place) meta.push({ label: 'Location', value: place });
        if (decision?.ip) meta.push({ label: 'IP', value: decision.ip });
        if (decision?.rule_level) meta.push({ label: 'Rule level', value: decision.rule_level === 'system' ? 'Platform' : decision.rule_level });
        if (decision?.posture?.scope) meta.push({ label: 'Endpoint scope', value: decision.posture.scope });
        if (decision?.reason) meta.push({ label: 'Reason code', value: decision.reason });
        this.meta = meta;

        await this.render();
    }
}

// ── Simulator ───────────────────────────────────────────────────────────────

class GeofenceSimulatorView extends View {
    constructor(options = {}) {
        super({
            className: 'geofence-simulator-view',
            template: `
                <div class="row g-3">
                    <div class="col-lg-5">
                        <div class="card">
                            <div class="card-header"><span class="fw-semibold">Test a scenario</span></div>
                            <div class="card-body">
                                <div data-container="sim-form"></div>
                                <div class="d-flex align-items-center gap-2 border-top pt-3 mt-2">
                                    <button type="button" class="btn btn-primary btn-sm" data-action="run-simulation">
                                        <i class="bi bi-play-fill me-1"></i>Run test
                                    </button>
                                    <span class="geofence-sim-status small text-secondary"></span>
                                </div>
                                <div class="text-secondary small mt-2">
                                    Tests never affect real traffic, are never cached, and leave no log entries.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-7">
                        <div data-container="sim-result"></div>
                    </div>
                </div>
            `,
            ...options
        });
        this.scopes = [];
        this.formView = null;
    }

    async onInit() {
        this.resultView = new GeofenceSimResult({ containerId: 'sim-result' });
        this.addChild(this.resultView);
        // The form works without config (scopes just absent) — build it now
        // so the tab is usable even when the config fetch fails.
        this.formView = this._buildFormView();
        this.addChild(this.formView);
    }

    /** Store config-derived options and rebuild the form when they change. */
    async setConfig(config) {
        const scopes = collectScopes(config);
        if (JSON.stringify(scopes) === JSON.stringify(this.scopes)) return;
        this.scopes = scopes;
        if (this.formView) { this.removeChild(this.formView); this.formView = null; }
        this.formView = this._buildFormView();
        this.addChild(this.formView);
        if (this.element) {
            await this.formView.render();
        }
    }

    _buildFormView() {
        const fields = [
            {
                name: 'mode',
                type: 'buttongroup',
                label: 'Test by',
                options: [
                    { value: 'geo', label: 'Location' },
                    { value: 'ip', label: 'IP address' }
                ],
                columns: 12
            },
            {
                name: 'country',
                type: 'select',
                label: 'Country',
                options: [{ value: '', label: 'Select a country…' }, ...COUNTRIES],
                showWhen: { field: 'mode', value: 'geo' },
                columns: 12
            },
            {
                name: 'state',
                type: 'select',
                label: 'US state / region',
                options: [{ value: '', label: '— None —' }, ...US_STATES],
                showWhen: { field: 'mode', value: 'geo' },
                columns: 12
            },
            ...ABUSE_FLAGS.map(f => ({
                name: `sim_${f.key}`,
                type: 'toggle',
                label: `Appears to be: ${f.label.toLowerCase()}`,
                showWhen: { field: 'mode', value: 'geo' },
                columns: 6
            })),
            {
                name: 'ip',
                type: 'text',
                label: 'IP address',
                placeholder: '203.0.113.7',
                help: 'The IP is resolved and checked against exemptions too.',
                showWhen: { field: 'mode', value: 'ip' },
                columns: 12
            },
            {
                name: 'group_uuid',
                type: 'collection',
                label: 'Group (optional)',
                help: 'Include a group to test its extra rules; leave empty for platform rules only.',
                Collection: GroupList,
                labelField: 'name',
                valueField: 'uuid',
                columns: 12
            }
        ];
        if (this.scopes.length) {
            fields.push({
                name: 'scope',
                type: 'select',
                label: 'Endpoint type',
                help: 'Options reflect the endpoint types this server actually gates.',
                options: [
                    { value: '', label: 'Any endpoint' },
                    ...this.scopes.map(s => ({ value: s, label: scopeLabel(s) }))
                ],
                columns: 12
            });
        }
        return new FormView({
            containerId: 'sim-form',
            fields,
            data: { mode: 'geo', country: '', state: '', ip: '' }
        });
    }

    async onActionRunSimulation() {
        if (!this.formView) return true;
        const fd = await this.formView.getFormData();
        const mode = fd.mode || 'geo';

        if (mode === 'ip' && !String(fd.ip || '').trim()) {
            this._setStatus('Enter an IP address to test.', 'danger');
            return true;
        }
        if (mode === 'geo' && !fd.country) {
            this._setStatus('Pick a country to test.', 'danger');
            return true;
        }

        const flags = {};
        for (const f of ABUSE_FLAGS) flags[f.key] = !!fd[`sim_${f.key}`];
        const body = buildSimulateBody({
            mode,
            ip: fd.ip,
            country: fd.country,
            state: fd.state,
            flags,
            group_uuid: fd.group_uuid || null,
            scope: fd.scope || null
        });

        const app = this.getApp();
        this._setStatus('Testing…');
        app?.showLoading?.();
        let resp;
        try {
            resp = await app.rest.POST('/api/geo/simulate', body);
        } catch {
            resp = null;
        } finally {
            app?.hideLoading?.();
        }

        if (resp?.success) {
            this._setStatus('');
            await this.resultView.setDecision(resp.data?.data || resp.data || {});
        } else {
            const msg = resp?.data?.error || resp?.message || 'Simulation failed';
            this._setStatus(msg, 'danger');
            app?.toast?.error(msg);
        }
        return true;
    }

    _setStatus(text, tone) {
        const el = this.element?.querySelector('.geofence-sim-status');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'geofence-sim-status small '
            + (tone === 'danger' ? 'text-danger' : 'text-secondary');
    }
}

export default GeofenceSimulatorView;
