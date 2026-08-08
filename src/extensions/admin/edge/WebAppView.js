/** Safe WebApp detail, immutable release history, and named operator actions. */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import {
    VhostList, WebApp, WebAppReleaseList,
    WEBAPP_BUCKET_MAX_LENGTH, buildWebAppPayload, canManageWebApp,
    classifyActionResponse, releaseActionFor
} from '@ext/admin/models/Edge.js';

const WRITE_PERMS = ['manage_dns', 'security'];
const activeGroupId = app => app?.getActiveGroupId?.() || app?.activeGroup?.id || null;
const idOf = value => value && typeof value === 'object' ? value.id : value;

export async function openWebAppForm({ app, existing = null, collection = null }) {
    const creating = !existing;
    const group = activeGroupId(app);
    if (creating && !group) {
        Modal.showError('Select an active group before creating a WebApp.');
        return null;
    }
    const scope = creating ? group : idOf(existing.get('group')) || group;
    const vhosts = new VhostList({ size: 200, params: { group: scope, graph: 'basic' } });
    const vhostResponse = await vhosts.fetch();
    if (!classifyActionResponse(vhostResponse, vhosts).ok) {
        Modal.showError('Could not load VHosts for this site.');
        return null;
    }
    const fields = [
        { name: 'slug', type: 'text', label: 'Site slug', required: true, columns: 12,
          value: existing?.get?.('slug') || '', attributes: { maxlength: 64 },
          help: 'A tenant-scoped label; it is never used as a filesystem path.' },
        ...(creating ? [{ name: 'bucket', type: 'text', label: 'Release bucket', required: true,
            columns: 12, attributes: { maxlength: WEBAPP_BUCKET_MAX_LENGTH },
            help: 'Enter a server-declared release bucket. The server validates its allowlist; the bucket is immutable after creation.' }] : []),
        { name: 'vhost', type: 'select', label: 'VHost', columns: 12,
          options: [{ value: '', label: 'None (served outside the Edge fleet)' },
              ...vhosts.models.map(model => ({ value: model.id, label: model.get('server_name') || `VHost ${model.id}` }))],
          value: idOf(existing?.get?.('vhost')) || '',
          help: 'Optional. The server enforces tenant scope and one site per VHost.' },
        { name: 'auto_promote', type: 'switch', label: 'Auto-promote verified releases', columns: 12,
          value: existing?.get?.('auto_promote') === true }
    ];
    const result = await app.showForm({
        title: creating ? 'Create WebApp' : `Edit ${existing.get('slug')}`,
        size: 'md', fields
    });
    if (!result) return null;

    let payload;
    try {
        payload = buildWebAppPayload({ ...result, group }, { create: creating });
    } catch (error) {
        Modal.showError(error.message);
        return { ok: false, error: error.message };
    }
    const model = existing || new WebApp();
    app.showLoading?.();
    try {
        const response = await model.save(payload);
        const verdict = classifyActionResponse(response, model);
        if (!verdict.ok) {
            Modal.showError(verdict.error || 'The WebApp was not saved.');
            return { ...verdict, response, model };
        }
        const refresh = await (collection?.fetch?.() || model.fetch({ graph: 'default' }));
        if (!classifyActionResponse(refresh, collection || model).ok) {
            Modal.showError('The WebApp was saved, but authoritative state could not be refreshed.');
            return { ok: false, refreshRequired: true, response, model };
        }
        app.toast?.success(creating ? 'WebApp created' : 'WebApp updated');
        return { ok: true, response, model };
    } finally {
        app.hideLoading?.();
    }
}

class WebAppOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'edge-webapp-overview',
            template: `
                <div class="detail-section-eyebrow">Hosted site</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Slug</div><div class="detail-flat-row-value font-monospace">{{model.slug}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">VHost</div><div class="detail-flat-row-value">{{vhostName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Release bucket</div><div class="detail-flat-row-value font-monospace text-break">{{model.bucket}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Storage prefix</div><div class="detail-flat-row-value font-monospace text-break">{{model.prefix}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Current release</div><div class="detail-flat-row-value font-monospace">{{currentVersion}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Auto-promote</div><div class="detail-flat-row-value">{{autoPromoteLabel}}</div></div>
                <div class="alert alert-light border small mt-4 mb-0">CI transfer and node controls are intentionally outside this operator UI.</div>
            `,
            ...options
        });
    }
    get vhostName() { return this.model?.get?.('vhost')?.server_name || 'None (external delivery)'; }
    get currentVersion() { return this.model?.get?.('current_release')?.version || 'No live release'; }
    get autoPromoteLabel() { return this.model?.get?.('auto_promote') ? 'Enabled' : 'Disabled'; }
}

class WebAppReleasesSection extends View {
    constructor(options = {}) {
        super({
            className: 'edge-release-history',
            template: `
                <div class="edge-release-list">
                {{#rows}}
                  <div class="edge-release-row">
                    <div class="min-width-0"><div class="font-monospace text-break fw-semibold">{{version}}</div><div class="small text-secondary">{{created|epoch|datetime}}</div></div>
                    <span class="badge {{badgeClass}}">{{statusLabel}}</span>
                    {{#showAction}}<button class="btn btn-sm btn-outline-primary" data-action="release-action" data-release-id="{{id}}">{{actionLabel}}</button>{{/showAction}}
                    {{#current}}<span class="small text-success"><i class="bi bi-check-circle me-1"></i>Current</span>{{/current}}
                  </div>
                {{/rows}}
                {{^hasRows|bool}}<div class="text-secondary text-center py-4">No releases have been registered.</div>{{/hasRows|bool}}
                </div>
            `,
            ...options
        });
        this.collection = options.collection;
        this.webAppView = options.webAppView;
    }

    get rows() {
        // This section is constructed before DetailView adopts its child views,
        // so resolve the mounted parent first instead of depending on a global app.
        const allowed = canManageWebApp(this.model?._edgeApp
            || this.webAppView?.getApp?.() || this.getApp());
        return (this.collection?.models || []).map(model => {
            const status = model.get('status');
            const action = releaseActionFor(status);
            return {
                id: model.id, version: model.get('version'), created: model.get('created'),
                current: status === 'live', showAction: allowed && !!action,
                actionLabel: action === 'rollback' ? 'Roll back' : 'Promote',
                statusLabel: status === 'pending' ? 'Pending upload' : status,
                badgeClass: status === 'live' ? 'text-bg-success' : status === 'uploaded'
                    ? 'text-bg-primary' : status === 'superseded' ? 'text-bg-secondary' : 'text-bg-warning'
            };
        });
    }
    get hasRows() { return this.rows.length > 0; }

    onActionReleaseAction(event, element) {
        return this.webAppView?.promoteRelease(element?.dataset?.releaseId);
    }
}

class WebAppView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new WebApp(options.data || {});
        const releases = options.releases || new WebAppReleaseList({ webapp: model.id, size: 100 });
        const overviewSection = new WebAppOverviewSection({ model });
        const releasesSection = new WebAppReleasesSection({ model, collection: releases });
        super({
            className: 'edge-webapp-view', ...options, model,
            header: {
                icon: 'bi-window-stack', titleField: 'slug',
                subtitleFn: m => m.get('vhost')?.server_name || 'External delivery',
                chips: [{ text: m => m.get('current_release')?.version || 'No live release', variant: 'info' }],
                contextMenu: { items: [
                    { label: 'Edit site', action: 'edit-webapp', icon: 'bi-pencil', permissions: WRITE_PERMS },
                    { label: 'Link new CI key', action: 'link-key', icon: 'bi-key', when: m => canManageWebApp(m._edgeApp) },
                    { type: 'divider' },
                    { label: 'Delete site', action: 'delete-webapp', icon: 'bi-trash', danger: true, permissions: WRITE_PERMS }
                ] }
            },
            sections: [
                { key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection },
                { key: 'Releases', label: 'Releases', icon: 'bi-clock-history', view: releasesSection }
            ],
            activeSection: 'Overview'
        });
        releasesSection.webAppView = this;
        this.collection = options.collection || model.collection || null;
        this.releases = releases;
        this.overviewSection = overviewSection;
        this.releasesSection = releasesSection;
    }

    async onInit() {
        this.model._edgeApp = this.getApp();
        await this.releases.fetch();
        await super.onInit();
    }

    async onActionEditWebapp() {
        await openWebAppForm({ app: this.getApp(), existing: this.model,
            collection: this.collection });
        await this.headerView?.render?.();
        await this.overviewSection?.render?.();
        return true;
    }

    async onActionLinkKey() {
        const app = this.getApp();
        if (!canManageWebApp(app)) return true;
        const confirmed = await app.confirm({
            title: 'Link a new CI key',
            message: `Create a new one-time key for ${this.model.get('slug')}? Any previous key is revoked immediately. Update CI before leaving the one-time handoff.`,
            confirmLabel: 'Link new key', confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;
        app.showLoading?.();
        let token = null;
        try {
            const response = await this.model.linkKey(this.releases);
            const verdict = classifyActionResponse(response);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The CI key was not linked.');
                return true;
            }
            token = response?.data?.data?.token;
            if (!token) {
                Modal.showError('The key was linked, but no one-time token was returned.');
                return true;
            }
            try {
                await navigator.clipboard.writeText(token);
                await Modal.alert({
                    title: 'CI key copied', type: 'success', backdrop: 'static', keyboard: false,
                    message: 'The one-time CI key was copied directly to your clipboard. It will not be shown again.'
                });
            } catch {
                const escaped = MOJOUtils.escapeHtml(token);
                await Modal.dialog({
                    title: 'Copy the one-time CI key', backdrop: 'static', keyboard: false, size: 'lg',
                    body: `<div class="alert alert-warning">Clipboard access failed. Select and copy this key before closing; it cannot be shown again.</div><div class="edge-one-time-key user-select-all font-monospace text-break" tabindex="0">${escaped}</div>`,
                    buttons: [{ text: 'I copied the key', class: 'btn-primary', dismiss: true }]
                });
            }
        } finally {
            token = null;
            app.hideLoading?.();
            await this.headerView?.render?.();
            await this.overviewSection?.render?.();
            await this.releasesSection?.render?.();
        }
        return true;
    }

    async promoteRelease(releaseId) {
        const app = this.getApp();
        if (!canManageWebApp(app)) return true;
        const release = this.releases.get(releaseId) || this.releases.get(Number(releaseId));
        const action = releaseActionFor(release?.get?.('status'));
        if (!release || !action) return true;
        const version = release.get('version');
        const rollback = action === 'rollback';
        const confirmed = await app.confirm({
            title: rollback ? 'Roll back release' : 'Promote release',
            message: `${rollback ? 'Roll back' : 'Promote'} ${this.model.get('slug')} to exact version ${version}?`,
            confirmLabel: rollback ? 'Roll back' : 'Promote',
            confirmClass: rollback ? 'btn-warning' : 'btn-primary'
        });
        if (!confirmed) return true;
        app.showLoading?.();
        try {
            const response = await this.model.promote(release, this.releases);
            const verdict = classifyActionResponse(response);
            if (!verdict.ok) Modal.showError(verdict.error || 'The release was not promoted.');
            else app.toast?.success(rollback ? `Rolled back to ${version}` : `Promoted ${version}`);
        } finally {
            app.hideLoading?.();
            await this.headerView?.render?.();
            await this.overviewSection?.render?.();
            await this.releasesSection?.render?.();
        }
        return true;
    }

    async onActionDeleteWebapp() {
        const app = this.getApp();
        if (!this.checkPermissions(WRITE_PERMS)) return true;
        const slug = this.model.get('slug');
        if (!await app.confirm({ title: 'Delete WebApp', message: `Delete ${slug} and its immutable release history?`, confirmLabel: 'Delete WebApp', confirmClass: 'btn-danger' })) return true;
        app.showLoading?.();
        try {
            const response = await this.model.destroy();
            if (response?.success === false) Modal.showError(response?.data?.error || response?.message || 'The WebApp was not deleted.');
            else {
                await this.collection?.fetch?.();
                app.toast?.success('WebApp deleted');
                this.emit('deleted', { model: this.model });
                const dialog = this.element?.closest('.modal');
                if (dialog) window.bootstrap?.Modal?.getInstance(dialog)?.hide();
            }
        } finally { app.hideLoading?.(); }
        return true;
    }
}

WebApp.VIEW_CLASS = WebAppView;
WebAppView.DIALOG_OPTIONS = { size: 'xl' };
export default WebAppView;
