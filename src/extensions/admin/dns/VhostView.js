/** Detail and structured mutations for one VHost. */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    Vhost, VhostRoute, VhostRouteList, UpstreamList, WebAppList,
    VHOST_KIND_MATRIX, VhostKindOptions,
    buildRoutePayload, classifyActionResponse, isLiteralSuperuser
} from '@ext/admin/models/Edge.js';
import VhostForm from './VhostForm.js';

const escapeHtml = MOJOUtils.escapeHtml;
const MANAGE_PERMS = ['manage_dns', 'security'];

const kindLabel = value => VhostKindOptions.find(entry => entry.value === value)?.label || value;

class VhostOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'vhost-overview',
            template: `
                <div class="detail-section-eyebrow">Serving configuration</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Server name</div>
                    <div class="detail-flat-row-value font-monospace">{{model.server_name}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Domain</div>
                    <div class="detail-flat-row-value">{{domainName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Label</div>
                    <div class="detail-flat-row-value font-monospace">{{labelName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Shape</div>
                    <div class="detail-flat-row-value">{{kindDisplay}}</div></div>
                {{#isApi|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Declared upstream</div>
                    <div class="detail-flat-row-value">{{upstreamName}}</div></div>
                {{/isApi|bool}}
                {{#isRedirect|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Redirects to</div>
                    <div class="detail-flat-row-value font-monospace">{{model.redirect_to}}</div></div>
                {{/isRedirect|bool}}
                {{#showSpa|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">SPA fallback</div>
                    <div class="detail-flat-row-value">{{spaDisplay}}</div></div>
                {{/showSpa|bool}}
                {{#showServeStatic|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Platform static</div>
                    <div class="detail-flat-row-value">{{serveStaticDisplay}}</div></div>
                {{/showServeStatic|bool}}
                {{#showBodySize|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Max upload</div>
                    <div class="detail-flat-row-value">{{bodySizeDisplay}}</div></div>
                {{/showBodySize|bool}}
                {{#showQuietPaths|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Quiet paths</div>
                    <div class="detail-flat-row-value font-monospace">{{{quietPathsDisplay}}}</div></div>
                {{/showQuietPaths|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Certificate</div>
                    <div class="detail-flat-row-value">{{certificateName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Fleet pool</div>
                    <div class="detail-flat-row-value font-monospace">{{model.pool}}</div></div>
                {{#claimsReserved|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Reserved name</div>
                    <div class="detail-flat-row-value">Claimed by the platform (house override)</div></div>
                {{/claimsReserved|bool}}
                <div class="detail-flat-row"><div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">{{statusLabel}}</div></div>

                <div class="alert alert-light border small mt-4 mb-0">
                    Server names, web roots, and proxy destinations are derived from these structured
                    records. Raw nginx configuration is not editable here.
                </div>
            `,
            ...options
        });
    }

    rules() { return VHOST_KIND_MATRIX[this.model?.get?.('kind')] || null; }

    get domainName() { return this.model?._owningDomain?.get?.('name') || this.model?.get?.('domain')?.name || '—'; }
    get labelName() { return this.model?.get?.('label') || '(apex)'; }
    get kindDisplay() {
        const kind = this.model?.get?.('kind');
        return kind ? `${kind} · ${kindLabel(kind)}` : '—';
    }
    get isApi() { return this.model?.get?.('kind') === 'api'; }
    get isRedirect() { return this.model?.get?.('kind') === 'redirect'; }
    get showSpa() { return this.rules()?.spa === true; }
    get showServeStatic() { return this.rules()?.serve_static === true; }
    get showBodySize() { return this.rules()?.body_size === true; }
    get showQuietPaths() { return this.rules()?.quiet_paths === true; }
    get spaDisplay() { return this.model?.get?.('spa') ? 'On — unknown paths serve index.html' : 'Off'; }
    get serveStaticDisplay() { return this.model?.get?.('serve_static') ? 'Served at /static/' : 'Off'; }
    get bodySizeDisplay() { return `${this.model?.get?.('body_size_mb') ?? 50} MB`; }
    get quietPathsDisplay() {
        const paths = this.model?.get?.('quiet_paths');
        if (!Array.isArray(paths) || !paths.length) return '—';
        return paths.map(path => escapeHtml(path)).join('<br>');
    }
    get claimsReserved() { return this.model?.get?.('claims_reserved') === true; }
    get upstreamName() { return this.model?.get?.('upstream')?.name || '—'; }
    get certificateName() {
        const value = this.model?.get?.('certificate');
        return value?.common_name || value?.id || value || '—';
    }
    get statusLabel() { return this.model?.get?.('is_enabled') ? 'Enabled' : 'Disabled'; }
}

/**
 * site_api proxied prefixes: list, declare, retire. Writes gate on the same
 * MANAGE_PERMS as the vhost itself; the server re-checks everything.
 */
class VhostRoutesSection extends View {
    constructor(options = {}) {
        super({ className: 'vhost-routes', ...options });
        this.routes = new VhostRouteList({ size: 200, params: { vhost: this.model?.id } });
        this.upstreams = [];
        this.loading = true;
        this.loadError = null;
        this.draftPrefix = '';
        this.draftUpstream = null;
        this.draftError = null;
    }

    async onInit() {
        await Promise.all([this.loadRoutes(), this.loadUpstreams()]);
        this.loading = false;
        this.render();
    }

    async loadRoutes() {
        const response = await this.routes.fetch();
        if (!classifyActionResponse(response, this.routes).ok) {
            this.loadError = 'Could not load the declared routes.';
        }
    }

    async loadUpstreams() {
        const group = this.model?._owningDomain?.get?.('group');
        const groupId = group?.id || group || null;
        const upstreams = new UpstreamList({
            size: 200,
            params: { is_enabled: true, ...(groupId ? { group: groupId } : { group__isnull: true }) }
        });
        const response = await upstreams.fetch();
        if (classifyActionResponse(response, upstreams).ok) {
            this.upstreams = upstreams.models.map(model => ({
                id: model.id,
                label: model.get('name') + (model.get('group') ? '' : ' (shared)')
            }));
        }
    }

    get canManage() { return this.checkPermissions(MANAGE_PERMS); }

    /** Quiet paths on the vhost no longer covered by any declared prefix. */
    strandedQuietPaths() {
        const paths = this.model?.get?.('quiet_paths');
        if (!Array.isArray(paths) || !paths.length) return [];
        const prefixes = this.routes.models.map(model => model.get('path_prefix')).filter(Boolean);
        return paths.filter(path => !prefixes.some(prefix => path.startsWith(prefix)));
    }

    getTemplate() {
        if (this.loading) return '<div class="text-secondary small py-3">Loading routes…</div>';
        const stranded = this.strandedQuietPaths();
        return `
            <div class="detail-section-eyebrow">Proxied path prefixes</div>
            ${this.loadError ? `<div class="alert alert-warning py-2 px-3 small">${escapeHtml(this.loadError)}</div>` : ''}
            ${this.routes.models.length ? this.routes.models.map(route => `
                <div class="d-flex align-items-center gap-2 border rounded px-3 py-2 mb-2">
                    <span class="font-monospace small">${escapeHtml(route.get('path_prefix') || '')}</span>
                    <i class="bi bi-arrow-right text-secondary"></i>
                    <span class="small">${escapeHtml(route.get('upstream')?.name || `Upstream ${route.get('upstream')?.id ?? ''}`)}</span>
                    ${this.canManage ? `
                        <button type="button" class="btn btn-sm btn-link text-danger ms-auto p-0"
                                data-action="remove-route" data-route-id="${escapeHtml(String(route.id))}"
                                aria-label="Delete route"><i class="bi bi-x-lg"></i></button>` : ''}
                </div>
            `).join('') : `
                <p class="text-secondary small">
                    No prefixes are declared yet — the site serves everything until a prefix proxies to an upstream.
                </p>`}
            ${stranded.length ? `
                <div class="alert alert-warning py-2 px-3 small">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Quiet path${stranded.length === 1 ? '' : 's'}
                    <span class="font-monospace">${stranded.map(path => escapeHtml(path)).join(', ')}</span>
                    no longer sit${stranded.length === 1 ? 's' : ''} under any declared prefix — the next
                    edit of this VHost will be refused until they are removed or covered.
                </div>` : ''}
            ${this.canManage ? `
                <div class="d-flex gap-2 mt-2 flex-wrap">
                    <input type="text" class="form-control form-control-sm font-monospace" placeholder="/api"
                           style="max-width: 180px;" value="${escapeHtml(this.draftPrefix)}"
                           data-action="draft-prefix-changed">
                    <select class="form-select form-select-sm" style="max-width: 240px;"
                            data-action="draft-upstream-changed" ${this.upstreams.length ? '' : 'disabled'}>
                        <option value="">Choose an upstream…</option>
                        ${this.upstreams.map(entry => `
                            <option value="${escapeHtml(String(entry.id))}"
                                    ${this.draftUpstream === entry.id ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
                        `).join('')}
                    </select>
                    <button type="button" class="btn btn-sm btn-outline-primary" data-action="add-route">
                        <i class="bi bi-plus-lg me-1"></i>Add route
                    </button>
                </div>
                ${this.draftError ? `<div class="text-danger small mt-2">${escapeHtml(this.draftError)}</div>` : ''}
            ` : ''}
            <div class="form-text mt-2">
                Longest prefix wins at request time. Quiet paths must sit under a declared prefix.
            </div>
        `;
    }

    onActionDraftPrefixChanged(event, element) { this.draftPrefix = element.value; }

    onActionDraftUpstreamChanged(event, element) {
        this.draftUpstream = element.value ? Number(element.value) : null;
    }

    async onActionAddRoute() {
        if (!this.checkPermissions(MANAGE_PERMS)) return true;
        this.draftError = null;
        let payload;
        try {
            payload = buildRoutePayload({
                vhost: this.model.id, path_prefix: this.draftPrefix.trim(), upstream: this.draftUpstream
            });
        } catch (error) {
            this.draftError = error.message;
            this.render();
            return true;
        }
        const route = new VhostRoute();
        const response = await route.save(payload);
        const verdict = classifyActionResponse(response, route);
        if (!verdict.ok) {
            this.draftError = verdict.error || 'The route was not created.';
            this.render();
            return true;
        }
        this.draftPrefix = '';
        this.draftUpstream = null;
        await this.loadRoutes();
        this.getApp()?.toast?.success('Route declared');
        this.render();
        return true;
    }

    async onActionRemoveRoute(event, element) {
        if (!this.checkPermissions(MANAGE_PERMS)) return true;
        const app = this.getApp();
        const route = this.routes.get(Number(element.dataset.routeId));
        if (!route) return true;
        const confirmed = await app.confirm({
            title: 'Delete route',
            message: `Stop proxying ${route.get('path_prefix')}? Requests under it will serve the site instead.`,
            confirmLabel: 'Delete route', confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;
        const response = await route.remove();
        const verdict = classifyActionResponse(response, route);
        if (!verdict.ok) {
            Modal.showError(verdict.error || 'The route was not deleted.');
            return true;
        }
        await this.loadRoutes();
        app?.toast?.success('Route deleted');
        this.render();
        return true;
    }
}

class VhostView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Vhost(options.data || {});
        const overviewSection = new VhostOverviewSection({ model });
        const routesSection = model.get('kind') === 'site_api'
            ? new VhostRoutesSection({ model }) : null;
        const sections = [
            { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection }
        ];
        if (routesSection) {
            sections.push({ key: 'Routes', label: 'Routes', icon: 'bi-signpost-2', view: routesSection });
        }
        super({
            className: 'vhost-view',
            ...options,
            model,
            header: {
                icon: 'bi-hdd-network',
                titleField: 'server_name',
                subtitleFn: m => `${kindLabel(m.get('kind'))} · ${m.get('pool')}`,
                chips: [
                    { text: m => kindLabel(m.get('kind')), variant: 'info' },
                    {
                        text: m => m.get('is_enabled') ? 'Enabled' : 'Disabled',
                        variant: m => m.get('is_enabled') ? 'success' : 'secondary'
                    },
                    {
                        text: 'Reserved name', variant: 'warning', icon: 'bi-bookmark-star',
                        when: m => m.get('claims_reserved') === true,
                        tooltip: 'This house VHost claims a reserved server name.'
                    }
                ],
                contextMenu: {
                    items: [
                        { label: 'Edit VHost', action: 'edit-vhost', icon: 'bi-pencil', permissions: MANAGE_PERMS },
                        {
                            // Platform-operations only: literal superuser AND a
                            // house (group-less) owning domain — the server
                            // refuses everything else, so nobody else sees it.
                            label: 'Claim reserved name', action: 'claim-reserved', icon: 'bi-bookmark-star',
                            when: m => isLiteralSuperuser(m._edgeApp)
                                && m._owningDomain?.get?.('group') == null
                                && m.get('claims_reserved') !== true
                        },
                        {
                            label: 'Release reserved claim', action: 'release-reserved', icon: 'bi-bookmark-x',
                            when: m => isLiteralSuperuser(m._edgeApp)
                                && m._owningDomain?.get?.('group') == null
                                && m.get('claims_reserved') === true
                        },
                        { type: 'divider' },
                        {
                            label: 'Delete VHost', action: 'delete-vhost', icon: 'bi-trash',
                            danger: true, permissions: MANAGE_PERMS
                        }
                    ]
                }
            },
            sections,
            activeSection: 'Overview'
        });
        this.overviewSection = overviewSection;
        this.routesSection = routesSection;
        this.collection = options.collection || model.collection || null;
    }

    async resolveOwningDomain() {
        const ref = this.model.get('domain');
        const domain = await VhostForm.resolveDomain(ref?.id || ref, this.getApp());
        if (domain) this.model._owningDomain = domain;
        return domain;
    }

    async refreshAfterMutation() {
        await this.model.fetch();
        await this.headerView?.render?.();
        await this.overviewSection?.render?.();
        await this.routesSection?.render?.();
    }

    async onActionEditVhost() {
        if (!await this.resolveOwningDomain()) {
            Modal.showError('VHost details are unavailable.');
            return true;
        }
        await VhostForm.open({
            app: this.getApp(), existing: this.model, collection: this.collection
        });
        await this.headerView?.render?.();
        await this.overviewSection?.render?.();
        await this.routesSection?.render?.();
        return true;
    }

    /** Claim or release the reserved-name house override (superuser + house only). */
    async toggleReservedClaim(release) {
        const app = this.getApp();
        if (!isLiteralSuperuser(app)) return true;
        if (!await this.resolveOwningDomain()) {
            Modal.showError('VHost details are unavailable.');
            return true;
        }
        const name = this.model.get('server_name');
        const confirmed = await app.confirm({
            title: release ? 'Release reserved claim' : 'Claim reserved name',
            message: release
                ? `Release the reserved-name override for ${name}? The reserved-name check applies again the next time it is enabled.`
                : `Let ${name} claim a name on the deployment's reserved list? This suspends the shadowing defence for exactly this VHost.`,
            confirmLabel: release ? 'Release claim' : 'Claim name',
            confirmClass: release ? 'btn-danger' : 'btn-primary'
        });
        if (!confirmed) return true;

        app.showLoading?.();
        try {
            const response = await this.model.claimReserved(release);
            const verdict = classifyActionResponse(response, this.model);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The reserved-name override was not changed.');
                return true;
            }
            await this.refreshAfterMutation();
            app.toast?.success(release ? 'Reserved claim released' : 'Reserved name claimed');
        } finally {
            app.hideLoading?.();
        }
        return true;
    }

    onActionClaimReserved() { return this.toggleReservedClaim(false); }
    onActionReleaseReserved() { return this.toggleReservedClaim(true); }

    async onActionDeleteVhost() {
        const app = this.getApp();
        if (!await this.resolveOwningDomain()) {
            Modal.showError('VHost details are unavailable.');
            return true;
        }
        const name = this.model.get('server_name');

        // A WebApp serving through this vhost goes dark on delete
        // (WebApp.vhost is SET_NULL and the web root derives from the vhost's
        // own id) — say so by name before asking.
        let linkedWarning = '';
        const linked = new WebAppList({ size: 1, params: { vhost: this.model.id } });
        const linkedResponse = await linked.fetch();
        if (classifyActionResponse(linkedResponse, linked).ok && linked.models.length) {
            const slug = linked.models[0].get('slug') || `WebApp ${linked.models[0].id}`;
            linkedWarning = ` The WebApp "${slug}" serves through it and will be unlinked and dark until re-linked.`;
        }

        const confirmed = await app.confirm({
            title: 'Delete VHost',
            message: `Delete the structured serving record for ${name}?${linkedWarning} The domain and certificate remain intact.`,
            confirmLabel: 'Delete VHost', confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        app.showLoading?.();
        try {
            const response = await this.model.remove();
            const verdict = classifyActionResponse(response, this.model);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The VHost was not deleted.');
                return true;
            }
            const refresh = await this.collection?.fetch?.();
            if (refresh && !classifyActionResponse(refresh, this.collection).ok) {
                Modal.showError('The VHost was deleted, but the authoritative list could not be refreshed.');
                return true;
            }
            app.toast?.success('VHost deleted');
            this.emit('deleted', { model: this.model });
            const dialog = this.element?.closest('.modal');
            if (dialog) window.bootstrap?.Modal?.getInstance(dialog)?.hide();
        } finally {
            app.hideLoading?.();
        }
        return true;
    }
}

Vhost.VIEW_CLASS = VhostView;
VhostView.DIALOG_OPTIONS = { size: 'lg' };
export default VhostView;
