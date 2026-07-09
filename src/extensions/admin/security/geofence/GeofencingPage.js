/**
 * GeofencingPage - Admin › Security › Geofencing (route: system/security/geofencing).
 *
 * Posture header (the "is geofencing active" answer) over four tabs:
 * Rules · Simulator · Blocks log · Exemptions. Config comes from
 * GET /api/geo/rules on every visit (pages are cached — fetch in onEnter);
 * the "last change" chip additionally reads the newest geofence_config event
 * when the viewer has security-events access, and is quietly omitted
 * otherwise. A backend without the geofence admin API (pre v1.2.42) gets an
 * explanatory panel instead of a broken page.
 */
import Page from '@core/Page.js';
import TabView from '@core/views/navigation/TabView.js';
import GeofencePostureHeader from './GeofencePostureHeader.js';
import GeofenceRulesView from './GeofenceRulesView.js';
import GeofenceSimulatorView from './GeofenceSimulatorView.js';
import GeofenceBlocksView from './GeofenceBlocksView.js';
import GeofenceExemptionsView from './GeofenceExemptionsView.js';
import { SECURITY_EVENTS_PERMS } from './geofenceData.js';

class GeofencingPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'Geofencing',
            className: 'geofencing-page',
            template: `
                <div class="container-lg py-3">
                    <div data-container="geofence-posture"></div>
                    <div data-container="geofence-tabs" class="mt-3"></div>
                </div>
            `
        });
    }

    async onInit() {
        this.postureHeader = new GeofencePostureHeader({ containerId: 'geofence-posture' });
        this.addChild(this.postureHeader);

        this.rulesView = new GeofenceRulesView();
        this.simulatorView = new GeofenceSimulatorView();
        this.blocksView = new GeofenceBlocksView();
        this.exemptionsView = new GeofenceExemptionsView();

        // Rules saves / override removal change the effective config —
        // refetch so the posture header and policy summary stay truthful.
        this.rulesView.on('config-changed', () => { this.refreshConfig(); });

        this.tabView = new TabView({
            containerId: 'geofence-tabs',
            tabs: {
                'Rules': this.rulesView,
                'Simulator': this.simulatorView,
                'Blocks log': this.blocksView,
                'Exemptions': this.exemptionsView
            },
            activeTab: 'Rules'
        });
        this.addChild(this.tabView);

        // TabView adopted the tab views before it had an app reference, so
        // propagate it explicitly — their permission checks (checkPermissions
        // → activeUser) must not depend on a window-global fallback.
        const app = this.getApp();
        if (app) {
            [this.rulesView, this.simulatorView, this.blocksView, this.exemptionsView]
                .forEach(v => { v.app = app; });
        }
    }

    async onEnter() {
        // Base Page.onEnter maintains the isActive/_wasExited render guard —
        // skipping it would blank the page on every revisit.
        await super.onEnter();
        // Kick the fetch off WITHOUT awaiting: showPage renders only after
        // onEnter returns, so awaiting here would blank the page until the
        // API answers. The posture header shows its loading state instead.
        // On the FIRST visit onEnter also fires before the page's first
        // render (onInit/children don't exist yet) — stash and let
        // onAfterMount do the one-shot apply.
        this._fetchConfigData().then(data => {
            if (this.postureHeader && this.element) {
                return this._applyConfig(data);
            }
            this._pendingConfig = data;
        }).catch(() => {});
    }

    async onAfterMount() {
        if (this._pendingConfig) {
            const data = this._pendingConfig;
            this._pendingConfig = null;
            await this._applyConfig(data);
        }
    }

    /** Rules-save / override-removal hook: refetch + reapply. */
    async refreshConfig() {
        await this._applyConfig(await this._fetchConfigData());
    }

    /** Fetch the effective config (+ last-change event). No child access. */
    async _fetchConfigData() {
        const rest = this.getApp()?.rest;
        if (!rest) return { error: 'No API client available.' };

        let resp;
        try {
            resp = await rest.GET('/api/geo/rules');
        } catch {
            resp = null;
        }

        if (!resp?.success) {
            const error = resp?.status === 404
                ? 'This server does not expose the geofence admin API — it needs django-mojo v1.2.42 or newer.'
                : (resp?.data?.error || resp?.message || 'Could not load the geofence configuration.');
            return { error };
        }

        const config = resp.data?.data || {};

        // Newest config-change event → "Last change" chip. Needs
        // security-events access; skipped (not errored) without it.
        let lastChange = null;
        if (this.checkPermissions(SECURITY_EVENTS_PERMS)) {
            try {
                const er = await rest.GET('/api/incident/event', {
                    category: 'geofence_config', size: 1, sort: '-created'
                });
                const rows = er?.data?.data;
                if (Array.isArray(rows) && rows.length) lastChange = rows[0];
            } catch { /* chip is optional */ }
        }
        return { config, lastChange };
    }

    /** Fan fetched config out to the header + tabs (children must exist). */
    async _applyConfig(data) {
        if (!this.postureHeader) return;
        if (data.error) {
            await this.postureHeader.setError(data.error);
            return;
        }
        this.config = data.config;
        await this.postureHeader.setConfig(data.config, data.lastChange);
        await this.rulesView.setConfig(data.config);
        await this.simulatorView.setConfig(data.config);
        this.blocksView?.refresh();
        this.exemptionsView?.refresh();
    }
}

export default GeofencingPage;
