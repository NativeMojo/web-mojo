/**
 * VhostCreateWizard - pick a shape, fill that shape's knobs, review, create (#1620).
 *
 * The template plane forces a domain into one of four known-good shapes, so
 * creation walks that instead of offering a kind dropdown over an all-fields
 * form. Steps are distinct states of ONE view, DomainPurchaseWizard-style.
 *
 * Things here that look like detail but are not:
 *
 *  - **site_api collects routes, never quiet paths.** The server validates
 *    quiet-path coverage against DECLARED routes, and routes reference the
 *    vhost FK — so at create time there is nothing to cover and any quiet
 *    path would 400. The wizard creates the vhost, then its routes, and the
 *    edit form offers quiet paths once prefixes exist.
 *  - **The duplicate pre-check is the only friendly path.** A duplicate
 *    enabled (domain, label) trips a DB unique constraint that surfaces as an
 *    opaque 500 "system error" (django-mojo #1621) — so entering review
 *    fetches the domain's enabled vhosts and compares server names client
 *    side. The constraint stays the backstop for the race.
 *  - **Partial success is a first-class end state.** Routes are created
 *    sequentially after the vhost; a failed route leaves the vhost and the
 *    routes that landed in place, names what failed, and points at the
 *    detail view. Deleting on partial failure would fight the operator.
 */

import View from '@core/View.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { CertificateList } from '@ext/admin/models/Dns.js';
import {
    Vhost, VhostList, VhostRoute, UpstreamList,
    VHOST_KIND_MATRIX, BODY_SIZE_BOUNDS,
    buildVhostPayload, buildRoutePayload, classifyActionResponse
} from '@ext/admin/models/Edge.js';
import VhostForm from './VhostForm.js';

const escapeHtml = MOJOUtils.escapeHtml;

export const VHOST_SHAPES = [
    {
        kind: 'api', icon: 'bi-arrow-left-right', name: 'API host',
        blurb: 'The whole host proxies to a declared upstream.'
    },
    {
        kind: 'site', icon: 'bi-window', name: 'Site',
        blurb: 'A static site or single-page app.'
    },
    {
        kind: 'site_api', icon: 'bi-window-split', name: 'Site + API paths',
        blurb: 'A marketing site with chosen path prefixes proxied to upstreams.'
    },
    {
        kind: 'redirect', icon: 'bi-signpost-split', name: 'Redirect',
        blurb: 'www → apex and friends. A 301 that preserves the path.'
    }
];

class VhostCreateWizard extends View {
    constructor(options = {}) {
        super({ className: 'vhost-create-wizard', ...options });
        this.collection = options.collection || null;

        this.step = 'shape';
        this.kind = null;

        // Scope choices; the selected Domain is resolved through
        // VhostForm.resolveDomain so the house guard stays in one place.
        this.domains = [];
        this.domainsError = null;
        this.domain = null;
        this.certificates = [];
        this.certificateId = null;
        this.upstreams = [];
        this.loadingScope = false;

        // Common knobs.
        this.label = '';
        this.pool = 'default';
        this.enabled = true;

        // Per-kind knobs (only the active kind's values are ever sent).
        this.upstreamId = null;
        this.bodySize = String(BODY_SIZE_BOUNDS.default);
        this.serveStatic = false;
        this.quietPathsText = '';
        this.spa = false;
        this.redirectTo = '';

        // site_api routes editor.
        this.routes = [];
        this.routeDraftPrefix = '';
        this.routeDraftUpstream = null;
        this.routeError = null;

        this.detailsError = null;
        this.duplicate = null;
        this.checkingDuplicate = false;
        this.createError = null;
        this.creating = false;
        this.result = null;
    }

    async onInit() {
        await this.loadDomains();
    }

    matrix() {
        return VHOST_KIND_MATRIX[this.kind] || null;
    }

    shape() {
        return VHOST_SHAPES.find(entry => entry.kind === this.kind) || null;
    }

    // ── Data loading ───────────────────────────────────────────────────

    async loadDomains() {
        const app = this.getApp();
        const choices = await VhostForm.listDomainChoices(app);
        if (!choices.ok) {
            this.domainsError = choices.error;
        } else {
            this.domains = choices.domains;
            this.domainsError = this.domains.length
                ? null : 'No active domains are available in this scope.';
        }
        this.render();
    }

    async selectDomain(domainId) {
        this.domain = null;
        this.certificates = [];
        this.certificateId = null;
        this.upstreams = [];
        this.upstreamId = null;
        this.detailsError = null;
        if (!domainId) { this.render(); return; }

        this.loadingScope = true;
        this.render();
        const domain = await VhostForm.resolveDomain(domainId, this.getApp());
        if (!domain) {
            this.loadingScope = false;
            this.detailsError = 'That domain is not available in this scope.';
            this.render();
            return;
        }
        this.domain = domain;
        await this.loadScopeChoices();
    }

    async loadScopeChoices() {
        const group = this.domain.get('group');
        const groupId = group?.id || group || null;
        const certificates = new CertificateList({ size: 200, params: { domain: this.domain.id } });
        const upstreams = new UpstreamList({
            size: 200,
            params: { is_enabled: true, ...(groupId ? { group: groupId } : { group__isnull: true }) }
        });
        const [certificateResponse, upstreamResponse] = await Promise.all([
            certificates.fetch(), upstreams.fetch()
        ]);
        this.loadingScope = false;
        if (!classifyActionResponse(certificateResponse, certificates).ok
            || !classifyActionResponse(upstreamResponse, upstreams).ok) {
            this.detailsError = 'Could not load the safe certificate and upstream choices.';
            this.render();
            return;
        }
        this.certificates = certificates.models.map(model => ({
            id: model.id,
            label: `${model.get('common_name') || model.get('sans')?.[0] || `Certificate ${model.id}`}`
                + ` (${model.get('status') || 'unknown'})`
        }));
        this.certificateId = this.certificates.length === 1 ? this.certificates[0].id : null;
        this.upstreams = upstreams.models.map(model => ({
            id: model.id,
            label: model.get('name') + (model.get('group') ? '' : ' (shared)')
        }));
        this.render();
    }

    // ── Derived state ──────────────────────────────────────────────────

    buildServerName() {
        const name = this.domain?.get?.('name');
        if (!name) return null;
        const label = this.label.trim();
        if (!label) return name;
        if (label === '*') return `*.${name}`;
        return `${label}.${name}`;
    }

    collectInput() {
        return {
            domain: this.domain?.id,
            kind: this.kind,
            label: this.label.trim(),
            certificate: this.certificateId,
            pool: this.pool,
            is_enabled: this.enabled,
            upstream: this.upstreamId,
            spa: this.spa,
            serve_static: this.serveStatic,
            // site_api quiet paths are deliberately NOT collected at create —
            // see the header note. Only api sends the textarea.
            quiet_paths: this.kind === 'api' ? this.quietPathsText : [],
            body_size_mb: this.bodySize,
            redirect_to: this.redirectTo
        };
    }

    /**
     * The domain's enabled vhosts, compared by server name client-side (the
     * apex label is '' and cannot travel as a query param). Sets `duplicate`
     * to the conflicting server name, or null.
     */
    async runDuplicateCheck() {
        this.duplicate = null;
        if (!this.enabled || !this.domain) { this.render(); return; }
        this.checkingDuplicate = true;
        this.render();
        const existing = new VhostList({
            size: 200,
            params: { domain: this.domain.id, is_enabled: true }
        });
        const response = await existing.fetch();
        this.checkingDuplicate = false;
        if (classifyActionResponse(response, existing).ok) {
            const serverName = this.buildServerName();
            const hit = existing.models.find(model => model.get('server_name') === serverName);
            this.duplicate = hit ? serverName : null;
        }
        this.render();
    }

    // ── Create sequencing: vhost first, then routes in row order ───────

    async runCreate() {
        if (this.creating) return;
        let payload;
        try {
            payload = buildVhostPayload(this.collectInput(), { create: true });
        } catch (error) {
            this.createError = error.message;
            this.render();
            return;
        }

        this.creating = true;
        this.createError = null;
        this.step = 'creating';
        this.render();

        const vhost = new Vhost();
        const response = await vhost.save(payload);
        const verdict = classifyActionResponse(response, vhost);
        if (!verdict.ok) {
            this.creating = false;
            this.step = 'review';
            this.createError = verdict.error || 'The VHost was not created.';
            this.render();
            return;
        }

        const routeResults = [];
        for (const row of this.routes) {
            const route = new VhostRoute();
            let ok = false;
            let error = null;
            try {
                // eslint-disable-next-line no-await-in-loop -- routes are created sequentially, in row order, on purpose
                const routeResponse = await route.save(buildRoutePayload({
                    vhost: vhost.id, path_prefix: row.path_prefix, upstream: row.upstream
                }));
                const routeVerdict = classifyActionResponse(routeResponse, route);
                ok = routeVerdict.ok;
                error = routeVerdict.error;
            } catch (err) {
                error = err.message;
            }
            routeResults.push({
                prefix: row.path_prefix,
                upstreamLabel: row.upstreamLabel,
                ok,
                error: ok ? null : (error || 'The route was not created.')
            });
        }

        await this.collection?.fetch?.();
        this.result = { vhost, routeResults };
        this.creating = false;
        this.step = routeResults.every(entry => entry.ok) ? 'done' : 'partial';
        this.emit('created', { vhost });
        this.render();
    }

    // ── Rendering ──────────────────────────────────────────────────────

    getTemplate() {
        return `
            <style>
                .vhost-create-wizard .shape-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
                @media (max-width: 560px) { .vhost-create-wizard .shape-grid { grid-template-columns: 1fr; } }
                .vhost-create-wizard .shape-card {
                    border: 1px solid var(--bs-border-color); border-radius: 0.65rem;
                    background: var(--bs-body-bg); padding: 0.9rem 1rem; cursor: pointer;
                    display: flex; gap: 0.85rem; align-items: flex-start; text-align: left; width: 100%;
                }
                .vhost-create-wizard .shape-card:hover { border-color: var(--bs-primary); }
                .vhost-create-wizard .shape-card.is-selected {
                    border-color: var(--bs-primary);
                    background: rgba(var(--bs-primary-rgb), 0.06);
                    box-shadow: inset 0 0 0 1px var(--bs-primary);
                }
                .vhost-create-wizard .shape-icon {
                    width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center;
                    flex: 0 0 auto; background: var(--bs-secondary-bg); color: var(--bs-secondary-color);
                }
                .vhost-create-wizard .shape-card.is-selected .shape-icon {
                    background: rgba(var(--bs-primary-rgb), 0.15); color: var(--bs-primary);
                }
                .vhost-create-wizard .knob-block {
                    border: 1px solid var(--bs-border-color); border-radius: 0.65rem;
                    background: var(--bs-body-bg); padding: 1rem 1.1rem; margin-top: 1.1rem;
                }
                .vhost-create-wizard .knob-title {
                    font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em;
                    text-transform: uppercase; color: var(--bs-secondary-color); margin-bottom: 0.75rem;
                }
                .vhost-create-wizard .route-row {
                    display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.6rem;
                    border: 1px solid var(--bs-border-color-translucent); border-radius: 0.5rem;
                    margin-bottom: 0.45rem;
                }
                .vhost-create-wizard .review-line {
                    display: flex; justify-content: space-between; gap: 1rem; font-size: 0.875rem;
                    padding: 0.55rem 0.9rem; border-bottom: 1px solid var(--bs-border-color-translucent);
                }
                .vhost-create-wizard .review-line:last-child { border-bottom: 0; }
            </style>
            <div class="p-3">
                ${this.renderHeader()}
                ${this.renderSteps()}
                <div class="pt-3">${this.renderBody()}</div>
            </div>
        `;
    }

    renderHeader() {
        const shape = this.shape();
        const titles = {
            shape: 'Create a VHost',
            details: shape ? shape.name : 'Details',
            review: 'Review and create',
            creating: 'Creating…',
            done: 'VHost created',
            partial: 'VHost created — routes need attention'
        };
        const subtitles = {
            shape: 'A domain is served in one of four known-good shapes.',
            details: shape ? shape.blurb : '',
            review: 'Nothing is written until you create.',
            creating: 'Writing the structured serving records.',
            done: 'The fleet converges on the new configuration.',
            partial: 'The VHost exists; finish its routes from the detail view.'
        };
        const icon = this.step === 'shape' || !shape ? 'bi-hdd-network' : shape.icon;
        return `
            <div class="d-flex align-items-start gap-3 mb-3">
                <span class="d-grid" style="width:44px;height:44px;border-radius:11px;place-items:center;
                      background:rgba(var(--bs-primary-rgb),.12); color:var(--bs-primary)">
                    <i class="bi ${escapeHtml(icon)} fs-5"></i>
                </span>
                <div>
                    <h5 class="mb-0">${escapeHtml(titles[this.step] || 'Create a VHost')}</h5>
                    <div class="text-secondary small">${escapeHtml(subtitles[this.step] || '')}</div>
                </div>
                <button type="button" class="btn btn-link text-secondary ms-auto p-0"
                        data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg"></i></button>
            </div>
        `;
    }

    renderSteps() {
        const order = ['shape', 'details', 'review'];
        const labels = { shape: 'Shape', details: 'Details', review: 'Review' };
        const current = order.includes(this.step) ? this.step : 'review';
        const index = order.indexOf(current);
        const terminal = !order.includes(this.step);
        return `
            <div class="d-flex gap-3 flex-wrap border-top border-bottom py-2">
                ${order.map((key, i) => {
                    const done = terminal || i < index;
                    const on = !terminal && i === index;
                    const tone = done ? 'bg-success bg-opacity-25 text-success'
                        : on ? 'bg-primary text-white' : 'bg-secondary bg-opacity-10 text-secondary';
                    return `<span class="d-flex align-items-center gap-2 small ${on ? 'fw-semibold' : 'text-secondary'}">
                        <span class="d-grid rounded-circle ${tone}" style="width:20px;height:20px;place-items:center;font-size:.7rem">
                            ${done ? '&check;' : i + 1}
                        </span>${escapeHtml(labels[key])}</span>`;
                }).join('')}
            </div>
        `;
    }

    renderBody() {
        switch (this.step) {
            case 'details': return this.renderDetails();
            case 'review': return this.renderReview();
            case 'creating': return this.renderCreating();
            case 'done': return this.renderDone();
            case 'partial': return this.renderPartial();
            default: return this.renderShape();
        }
    }

    renderShape() {
        return `
            <div class="shape-grid">
                ${VHOST_SHAPES.map(entry => `
                    <button type="button" class="shape-card ${this.kind === entry.kind ? 'is-selected' : ''}"
                            data-action="pick-shape" data-kind="${escapeHtml(entry.kind)}">
                        <span class="shape-icon"><i class="bi ${escapeHtml(entry.icon)}"></i></span>
                        <span>
                            <span class="d-flex align-items-baseline gap-2">
                                <span class="fw-semibold">${escapeHtml(entry.name)}</span>
                                <span class="font-monospace text-secondary" style="font-size:.6875rem">${escapeHtml(entry.kind)}</span>
                            </span>
                            <span class="d-block small text-secondary mt-1">${escapeHtml(entry.blurb)}</span>
                        </span>
                    </button>
                `).join('')}
            </div>
            <div class="d-flex mt-3">
                <button class="btn btn-primary ms-auto" data-action="continue-details"
                        ${this.kind ? '' : 'disabled'}>
                    Continue<i class="bi bi-arrow-right ms-2"></i>
                </button>
            </div>
        `;
    }

    renderDetails() {
        const rules = this.matrix();
        if (!rules) return this.renderShape();
        return `
            ${this.domainsError ? `<div class="alert alert-warning py-2 px-3 small">${escapeHtml(this.domainsError)}</div>` : ''}
            ${this.detailsError ? `<div class="alert alert-danger py-2 px-3 small">${escapeHtml(this.detailsError)}</div>` : ''}
            <div class="row g-3">
                <div class="col-md-7">
                    <label class="form-label small text-secondary">Domain</label>
                    <select class="form-select" data-action="domain-changed">
                        <option value="">Choose a domain…</option>
                        ${this.domains.map(entry => `
                            <option value="${escapeHtml(String(entry.id))}"
                                    ${this.domain?.id === entry.id ? 'selected' : ''}>${escapeHtml(entry.name)}</option>
                        `).join('')}
                    </select>
                    <div class="form-text">Owns the VHost and cannot be changed later.</div>
                </div>
                <div class="col-md-5">
                    <label class="form-label small text-secondary">Host label</label>
                    <input type="text" class="form-control font-monospace" value="${escapeHtml(this.label)}"
                           placeholder="www" data-action="label-changed">
                    <div class="form-text">
                        Blank = apex · <code>*</code> = wildcard${this.buildServerName()
                            ? ` → <span class="font-monospace">${escapeHtml(this.buildServerName())}</span>` : ''}
                    </div>
                </div>
                <div class="col-md-7">
                    <label class="form-label small text-secondary">Certificate</label>
                    <select class="form-select" data-action="certificate-changed" ${this.certificates.length ? '' : 'disabled'}>
                        <option value="">${this.loadingScope ? 'Loading…' : 'Choose a certificate…'}</option>
                        ${this.certificates.map(entry => `
                            <option value="${escapeHtml(String(entry.id))}"
                                    ${this.certificateId === entry.id ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
                        `).join('')}
                    </select>
                    ${this.domain && !this.loadingScope && !this.certificates.length
                        ? `<div class="form-text text-warning">Issue a certificate for ${escapeHtml(this.domain.get('name'))} before creating a VHost.</div>`
                        : ''}
                </div>
                <div class="col-md-3">
                    <label class="form-label small text-secondary">Fleet pool</label>
                    <input type="text" class="form-control font-monospace" value="${escapeHtml(this.pool)}"
                           maxlength="32" data-action="pool-changed">
                </div>
                <div class="col-md-2 d-flex align-items-end">
                    <div class="form-check form-switch mb-2">
                        <input class="form-check-input" type="checkbox" id="vw-enabled"
                               data-action="enabled-changed" ${this.enabled ? 'checked' : ''}>
                        <label class="form-check-label small" for="vw-enabled">Enabled</label>
                    </div>
                </div>
            </div>
            ${this.renderKindKnobs(rules)}
            <div class="d-flex mt-3">
                <button class="btn btn-secondary" data-action="back-to-shape">
                    <i class="bi bi-arrow-left me-2"></i>Back
                </button>
                <button class="btn btn-primary ms-auto" data-action="go-review">
                    Review<i class="bi bi-arrow-right ms-2"></i>
                </button>
            </div>
        `;
    }

    renderKindKnobs(rules) {
        const blocks = [];
        if (rules.spa || rules.serve_static || rules.body_size) {
            blocks.push(`
                <div class="knob-block">
                    <div class="knob-title">${this.kind === 'api' ? 'Proxy behavior' : 'Site behavior'}</div>
                    <div class="row g-3">
                        ${rules.spa ? `
                            <div class="col-md-4">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="vw-spa"
                                           data-action="spa-changed" ${this.spa ? 'checked' : ''}>
                                    <label class="form-check-label small" for="vw-spa">SPA history fallback</label>
                                </div>
                                <div class="form-text">Unknown paths serve <code>index.html</code> instead of 404.</div>
                            </div>` : ''}
                        ${rules.serve_static ? `
                            <div class="col-md-4">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="vw-static"
                                           data-action="serve-static-changed" ${this.serveStatic ? 'checked' : ''}>
                                    <label class="form-check-label small" for="vw-static">Serve platform static</label>
                                </div>
                                <div class="form-text">Serve Django static at <code>/static/</code> instead of proxying it.</div>
                            </div>` : ''}
                        ${rules.body_size ? `
                            <div class="col-md-4">
                                <label class="form-label small text-secondary">Max upload size (MB)</label>
                                <input type="number" class="form-control" value="${escapeHtml(this.bodySize)}"
                                       min="${BODY_SIZE_BOUNDS.min}" max="${BODY_SIZE_BOUNDS.max}"
                                       data-action="body-size-changed">
                                <div class="form-text">${BODY_SIZE_BOUNDS.min}–${BODY_SIZE_BOUNDS.max}.</div>
                            </div>` : ''}
                    </div>
                </div>
            `);
        }
        if (this.kind === 'api') {
            blocks.push(`
                <div class="knob-block">
                    <div class="knob-title">Declared upstream</div>
                    <select class="form-select" data-action="upstream-changed" ${this.upstreams.length ? '' : 'disabled'}>
                        <option value="">${this.loadingScope ? 'Loading…' : 'Choose an upstream…'}</option>
                        ${this.upstreams.map(entry => `
                            <option value="${escapeHtml(String(entry.id))}"
                                    ${this.upstreamId === entry.id ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
                        `).join('')}
                    </select>
                    ${this.domain && !this.loadingScope && !this.upstreams.length ? `
                        <div class="form-text text-warning">
                            No active upstream is declared for this scope — an API host needs one.
                            Platform administrators declare upstreams on the Upstreams page.
                        </div>` : `
                        <div class="form-text">Only destinations the platform already allows are selectable.</div>`}
                    <label class="form-label small text-secondary mt-3">Quiet paths <span class="text-secondary">(optional, one per line)</span></label>
                    <textarea class="form-control font-monospace" rows="2" placeholder="/healthz"
                              data-action="quiet-paths-changed">${escapeHtml(this.quietPathsText)}</textarea>
                    <div class="form-text">Exact request paths kept out of the main access log (health checks).</div>
                </div>
            `);
        }
        if (rules.routes) {
            blocks.push(`
                <div class="knob-block">
                    <div class="knob-title">Proxied path prefixes</div>
                    ${this.routes.map((row, index) => `
                        <div class="route-row">
                            <span class="font-monospace small">${escapeHtml(row.path_prefix)}</span>
                            <i class="bi bi-arrow-right text-secondary"></i>
                            <span class="small">${escapeHtml(row.upstreamLabel)}</span>
                            <button type="button" class="btn btn-sm btn-link text-danger ms-auto p-0"
                                    data-action="remove-route" data-index="${index}" aria-label="Remove route">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    `).join('')}
                    <div class="d-flex gap-2 mt-2 flex-wrap">
                        <input type="text" class="form-control form-control-sm font-monospace" placeholder="/api"
                               style="max-width: 180px;" value="${escapeHtml(this.routeDraftPrefix)}"
                               data-action="route-prefix-changed">
                        <select class="form-select form-select-sm" style="max-width: 240px;"
                                data-action="route-upstream-changed" ${this.upstreams.length ? '' : 'disabled'}>
                            <option value="">Choose an upstream…</option>
                            ${this.upstreams.map(entry => `
                                <option value="${escapeHtml(String(entry.id))}"
                                        ${this.routeDraftUpstream === entry.id ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
                            `).join('')}
                        </select>
                        <button type="button" class="btn btn-sm btn-outline-primary" data-action="add-route">
                            <i class="bi bi-plus-lg me-1"></i>Add route
                        </button>
                    </div>
                    ${this.routeError ? `<div class="text-danger small mt-2">${escapeHtml(this.routeError)}</div>` : ''}
                    <div class="form-text mt-2">
                        Longest prefix wins, so <code>/api</code> and <code>/api/ws</code> can point at
                        different upstreams. Quiet paths (log silencing) are added after creation from the
                        VHost detail — each must sit under a declared prefix.
                    </div>
                </div>
            `);
        }
        if (this.kind === 'redirect') {
            blocks.push(`
                <div class="knob-block">
                    <div class="knob-title">Redirect target</div>
                    <input type="text" class="form-control font-monospace" placeholder="example.com"
                           value="${escapeHtml(this.redirectTo)}" data-action="redirect-changed">
                    <div class="form-text">
                        A bare hostname — no scheme, path, or port. A 301 preserving the request path is rendered.
                    </div>
                </div>
            `);
        }
        return blocks.join('');
    }

    renderReview() {
        const rules = this.matrix() || {};
        const shape = this.shape();
        const lines = [];
        lines.push(['Shape', `${this.kind} · ${shape ? shape.name : ''}`]);
        if (rules.upstream) {
            lines.push(['Upstream', this.upstreams.find(entry => entry.id === this.upstreamId)?.label || '—']);
        }
        if (this.kind === 'redirect') lines.push(['Redirects to', this.redirectTo.trim().toLowerCase()]);
        if (rules.spa) lines.push(['SPA fallback', this.spa ? 'on' : 'off']);
        if (rules.serve_static) lines.push(['Platform static', this.serveStatic ? 'served at /static/' : 'off']);
        if (rules.routes) {
            lines.push(['Routes', this.routes.length
                ? this.routes.map(row => `${row.path_prefix} → ${row.upstreamLabel}`).join('<br>')
                : 'none yet']);
        }
        if (this.kind === 'api' && this.quietPathsText.trim()) {
            lines.push(['Quiet paths', this.quietPathsText.trim().split('\n').filter(Boolean).join('<br>')]);
        }
        if (rules.body_size) lines.push(['Max upload', `${escapeHtml(this.bodySize)} MB`]);
        lines.push(['Certificate', this.certificates.find(entry => entry.id === this.certificateId)?.label || '—']);
        lines.push(['Fleet pool', this.pool]);
        lines.push(['Enabled', this.enabled ? 'yes' : 'no']);

        return `
            ${this.createError ? `<div class="alert alert-danger py-2 px-3 small">${escapeHtml(this.createError)}</div>` : ''}
            ${this.duplicate ? `
                <div class="alert alert-warning py-2 px-3 small">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    An enabled VHost already claims <span class="font-monospace">${escapeHtml(this.duplicate)}</span>
                    — disable it first, or stage this one disabled.
                </div>` : ''}
            ${this.checkingDuplicate ? '<div class="text-secondary small mb-2">Checking for name collisions…</div>' : ''}
            <div class="border rounded overflow-hidden mb-3">
                <div class="px-3 py-2 border-bottom bg-body-tertiary">
                    <div class="text-uppercase text-secondary fw-semibold" style="font-size:.6875rem;letter-spacing:.08em">Will serve</div>
                    <div class="font-monospace">${escapeHtml(this.buildServerName() || '—')}</div>
                </div>
                ${lines.map(([key, value]) => `
                    <div class="review-line">
                        <span class="text-secondary">${escapeHtml(key)}</span>
                        <span class="font-monospace text-end">${value}</span>
                    </div>
                `).join('')}
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-secondary" data-action="back-to-details">
                    <i class="bi bi-arrow-left me-2"></i>Back
                </button>
                <button class="btn btn-primary ms-auto" data-action="do-create"
                        ${this.duplicate || this.checkingDuplicate ? 'disabled' : ''}>
                    <i class="bi bi-plus-lg me-2"></i>Create VHost
                </button>
            </div>
        `;
    }

    renderCreating() {
        return `
            <div class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-primary mb-3" role="status"></div>
                <h6 class="mb-1">Creating ${escapeHtml(this.buildServerName() || 'the VHost')}</h6>
                <p class="text-secondary small mb-0">${this.routes.length
                    ? `Then declaring ${this.routes.length} route${this.routes.length === 1 ? '' : 's'}.` : ''}</p>
            </div>
        `;
    }

    renderDone() {
        return `
            <div class="text-center py-3">
                <div class="mb-2"><i class="bi bi-check-circle fs-2 text-success"></i></div>
                <h6 class="mb-1">${escapeHtml(this.result?.vhost?.get?.('server_name') || this.buildServerName() || 'VHost')} is configured</h6>
                <p class="text-secondary small mb-0">
                    The fleet converges on the new configuration within the normal window.
                </p>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button class="btn btn-primary ms-auto" data-action="open-vhost">Open VHost</button>
            </div>
        `;
    }

    renderPartial() {
        const failed = (this.result?.routeResults || []).filter(entry => !entry.ok);
        return `
            <div class="alert alert-warning py-2 px-3 small">
                <i class="bi bi-exclamation-triangle me-1"></i>
                The VHost was created, but ${failed.length} of its route${failed.length === 1 ? ' was' : 's were'} refused.
            </div>
            <div class="border rounded overflow-hidden mb-3">
                ${(this.result?.routeResults || []).map(entry => `
                    <div class="review-line">
                        <span class="font-monospace">${escapeHtml(entry.prefix)}</span>
                        <span class="small ${entry.ok ? 'text-success' : 'text-danger'} text-end">
                            ${entry.ok ? 'declared' : escapeHtml(entry.error || 'refused')}
                        </span>
                    </div>
                `).join('')}
            </div>
            <p class="text-secondary small">Finish the remaining routes from the VHost's Routes section.</p>
            <div class="d-flex gap-2">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button class="btn btn-primary ms-auto" data-action="open-vhost">Open VHost to finish</button>
            </div>
        `;
    }

    // ── Actions ────────────────────────────────────────────────────────

    onActionPickShape(event, element) {
        this.kind = element.dataset.kind;
        this.render();
        return true;
    }

    onActionContinueDetails() {
        if (!this.kind) return true;
        this.step = 'details';
        this.render();
        return true;
    }

    onActionDomainChanged(event, element) {
        return this.selectDomain(element.value ? Number(element.value) : null);
    }

    onActionCertificateChanged(event, element) {
        this.certificateId = element.value ? Number(element.value) : null;
    }

    onActionUpstreamChanged(event, element) {
        this.upstreamId = element.value ? Number(element.value) : null;
    }

    onActionLabelChanged(event, element) { this.label = element.value; }
    onActionPoolChanged(event, element) { this.pool = element.value; }
    onActionBodySizeChanged(event, element) { this.bodySize = element.value; }
    onActionQuietPathsChanged(event, element) { this.quietPathsText = element.value; }
    onActionRedirectChanged(event, element) { this.redirectTo = element.value; }
    onActionEnabledChanged(event, element) { this.enabled = element.checked; }
    onActionSpaChanged(event, element) { this.spa = element.checked; }
    onActionServeStaticChanged(event, element) { this.serveStatic = element.checked; }
    onActionRoutePrefixChanged(event, element) { this.routeDraftPrefix = element.value; }

    onActionRouteUpstreamChanged(event, element) {
        this.routeDraftUpstream = element.value ? Number(element.value) : null;
    }

    onActionAddRoute() {
        this.routeError = null;
        const prefix = this.routeDraftPrefix.trim();
        try {
            // 'pending' stands in for the vhost id, which does not exist until
            // create; only the prefix/upstream validation is wanted here.
            buildRoutePayload({ vhost: 'pending', path_prefix: prefix, upstream: this.routeDraftUpstream });
        } catch (error) {
            this.routeError = error.message;
            this.render();
            return true;
        }
        if (this.routes.some(row => row.path_prefix === prefix)) {
            this.routeError = 'That prefix is already declared.';
            this.render();
            return true;
        }
        this.routes.push({
            path_prefix: prefix,
            upstream: this.routeDraftUpstream,
            upstreamLabel: this.upstreams.find(entry => entry.id === this.routeDraftUpstream)?.label || ''
        });
        this.routeDraftPrefix = '';
        this.routeDraftUpstream = null;
        this.render();
        return true;
    }

    onActionRemoveRoute(event, element) {
        this.routes.splice(Number(element.dataset.index), 1);
        this.render();
        return true;
    }

    onActionBackToShape() {
        this.step = 'shape';
        this.render();
        return true;
    }

    onActionBackToDetails() {
        this.step = 'details';
        this.createError = null;
        this.render();
        return true;
    }

    onActionGoReview() {
        this.detailsError = null;
        if (!this.domain) {
            this.detailsError = 'Choose a domain.';
            this.render();
            return true;
        }
        try {
            buildVhostPayload(this.collectInput(), { create: true });
        } catch (error) {
            this.detailsError = error.message;
            this.render();
            return true;
        }
        this.createError = null;
        this.step = 'review';
        this.render();
        this.runDuplicateCheck();
        return true;
    }

    onActionDoCreate(event, element) {
        // Disable immediately: the constraint backstop answers a duplicate
        // race with an opaque 500, so a double click must not become one.
        if (element) element.disabled = true;
        return this.runCreate();
    }

    onActionOpenVhost() {
        const app = this.getApp();
        const id = this.result?.vhost?.id;
        if (id) app?.navigate?.(`?page=system/dns/vhosts&item=${id}`);
        const dialog = this.element?.closest('.modal');
        if (dialog) window.bootstrap?.Modal?.getInstance(dialog)?.hide();
        return true;
    }
}

export default VhostCreateWizard;
