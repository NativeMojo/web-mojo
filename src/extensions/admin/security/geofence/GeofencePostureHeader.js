/**
 * GeofencePostureHeader - read-only "is geofencing active" header for the
 * Geofencing admin page. Renders the enforcement status, rules source,
 * per-scope fail posture (scopes are deployment-defined — one chip per scope
 * found in the config, never hardcoded), cache TTL, exemption summary, last
 * config change, and a collapsible list of protected endpoints.
 */
import View from '@core/View.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { scopeLabel, collectScopes } from './geofenceData.js';

class GeofencePostureHeader extends View {
    constructor(options = {}) {
        super({
            className: 'geofence-posture card',
            template: `
                <div class="card-body">
                    {{#loading|bool}}
                        <div class="text-secondary small">
                            <span class="spinner-border spinner-border-sm me-2"></span>Loading geofencing status…
                        </div>
                    {{/loading|bool}}
                    {{#error|bool}}
                        <div class="d-flex align-items-start gap-2">
                            <i class="bi bi-plug text-secondary fs-4"></i>
                            <div>
                                <div class="fw-semibold">Geofencing administration unavailable</div>
                                <div class="text-secondary small">{{error}}</div>
                            </div>
                        </div>
                    {{/error|bool}}
                    {{#ready|bool}}
                        <div class="d-flex flex-wrap align-items-center gap-3">
                            <span class="geofence-picon"><i class="bi bi-globe-americas"></i></span>
                            <div class="me-auto">
                                <h4 class="mb-0">Geofencing</h4>
                                <div class="text-secondary small">Location-based access rules for this deployment's protected endpoints.</div>
                            </div>
                            <span class="badge rounded-pill {{statusClass}} geofence-status-pill">
                                <i class="bi {{statusIcon}} me-1"></i>{{statusText}}
                            </span>
                        </div>
                        <div class="d-flex flex-wrap gap-2 mt-3">
                            {{#chips}}
                                <span class="geofence-chip {{.tone}}">{{.label}} <b>{{.value}}</b></span>
                            {{/chips}}
                        </div>
                        {{#endpointCount|bool}}
                            <details class="mt-3 geofence-endpoints">
                                <summary class="small fw-semibold text-primary">{{endpointCount}} protected endpoint{{endpointPlural}}</summary>
                                <div class="geofence-endpoint-list mt-2">
                                    {{#endpoints}}
                                        <div class="geofence-endpoint small">
                                            <span class="badge text-bg-secondary me-2">{{.scope}}</span><code>{{.endpoint}}</code>
                                        </div>
                                    {{/endpoints}}
                                </div>
                            </details>
                        {{/endpointCount|bool}}
                        {{^endpointCount}}
                            <div class="text-secondary small mt-3">
                                <i class="bi bi-info-circle me-1"></i>No endpoints on this server are gated by geofencing.
                            </div>
                        {{/endpointCount}}
                    {{/ready|bool}}
                </div>
            `,
            ...options
        });

        this.loading = true;
        this.ready = false;
        this.error = '';
        this.chips = [];
        this.endpoints = [];
        this.endpointCount = 0;
        this.endpointPlural = 's';
    }

    /** Render an explanatory panel instead of posture (backend missing / errored). */
    async setError(message) {
        this.loading = false;
        this.ready = false;
        this.error = message || 'The geofence admin API is not available on this server.';
        await this.render();
    }

    /**
     * `config` is the GET /api/geo/rules payload; `lastChange` an optional
     * geofence_config incident event (omitted when the viewer lacks
     * security-events access).
     */
    async setConfig(config, lastChange = null) {
        this.loading = false;
        this.error = '';
        this.ready = true;

        const posture = config?.posture || {};
        const enabled = !!posture.enabled;
        this.statusText = enabled ? 'Enforcing' : 'Off — rules staged, not enforcing';
        this.statusClass = enabled ? 'text-bg-success' : 'text-bg-secondary';
        this.statusIcon = enabled ? 'bi-shield-check' : 'bi-shield-slash';

        const chips = [];
        const source = config?.system?.source || 'none';
        const sourceLabels = { setting: 'Portal (database)', conf: 'Deploy file', none: 'No rules configured' };
        chips.push({
            label: 'Rules source',
            value: sourceLabels[source] || source,
            tone: source === 'conf' ? 'warn' : ''
        });

        // One chip per deployment-defined scope; fail posture per scope.
        const failClosedScopes = posture.fail_closed_scopes || [];
        for (const scope of collectScopes(config)) {
            const closed = !!posture.fail_closed || failClosedScopes.includes(scope);
            chips.push({
                label: scopeLabel(scope),
                value: closed ? 'fail closed' : 'fail open',
                tone: closed ? 'warn' : ''
            });
        }

        const ttl = posture.cache_ttl;
        if (ttl !== undefined && ttl !== null) {
            chips.push({ label: 'Decision cache', value: this._ttlLabel(ttl), tone: '' });
        }

        const al = config?.allowlist_summary || {};
        chips.push({
            label: 'Exemptions',
            value: `${al.setting_entries || 0} range${al.setting_entries === 1 ? '' : 's'} · ${al.geoip_active || 0} IP${al.geoip_active === 1 ? '' : 's'}`,
            tone: ''
        });

        if (lastChange) {
            let when = '';
            try { when = dataFormatter.pipe(lastChange.created, 'datetime') || ''; } catch { when = String(lastChange.created || ''); }
            const who = lastChange.metadata?.username || lastChange.metadata?.user || '';
            chips.push({ label: 'Last change', value: who ? `${when} · ${who}` : when, tone: '' });
        }
        this.chips = chips;

        const endpoints = (config?.enforced_endpoints || []).map(e => ({
            scope: e.scope || '—',
            // Strip the framework prefix so the list scans; keep enough path
            // to be unambiguous in a compliance screenshot.
            endpoint: String(e.endpoint || '').replace(/^mojo\.apps\./, '')
        }));
        this.endpoints = endpoints;
        this.endpointCount = endpoints.length;
        this.endpointPlural = endpoints.length === 1 ? '' : 's';

        await this.render();
    }

    _ttlLabel(ttl) {
        const n = Number(ttl);
        if (!Number.isFinite(n) || n <= 0) return 'off';
        if (n % 60 === 0) return `${n / 60} min`;
        return `${n}s`;
    }
}

export default GeofencePostureHeader;
