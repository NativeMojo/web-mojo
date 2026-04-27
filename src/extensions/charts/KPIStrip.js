/**
 * KPIStrip — orchestrator for a row of KPITiles.
 *
 * One batched fetch to `/api/metrics/series?with_delta=true` populates
 * the value and delta on every metric tile. Optional REST count tiles
 * (e.g. "open incidents" — not a time-series counter, just a list count)
 * issue parallel REST GETs. Optional sparkline fetch makes one batched
 * `/api/metrics/fetch` call for the trailing N days of data per slug.
 *
 * The tile spec list shape:
 *   tiles: [
 *     { slug: 'incidents',  label: 'Incidents',  tone: 'bad' },
 *     { slug: 'auth:failures', label: 'Failed Auth', tone: 'bad', severity: 'warn' },
 *     { rest: { endpoint: '/api/incident/incident', params: { status: 'open', size: 1 } },
 *       label: 'Open Incidents', tone: 'bad', severity: 'critical', key: 'open-incidents' }
 *   ]
 *
 * For metric tiles: `slug` identifies which entry in the `series` and
 * `fetch` responses to read. For REST count tiles: `rest` provides the
 * endpoint/params and the strip reads `data.count` from the response.
 *
 * Click on any tile re-emits as `tile:click` from the strip with
 * `{ tile, slug, key }`.
 */

import View from '@core/View.js';
import KPITile from './KPITile.js';

class KPIStrip extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `mojo-kpi-strip ${options.className || ''}`.trim()
        });

        this.tiles = Array.isArray(options.tiles) ? options.tiles : [];
        this.account = options.account || 'incident';
        this.granularity = options.granularity || 'days';
        this.sparklineDays = options.sparklineDays ?? 7;
        this.sparklineGranularity = options.sparklineGranularity || 'days';
        this.seriesEndpoint = options.seriesEndpoint || '/api/metrics/series';
        this.fetchEndpoint = options.fetchEndpoint || '/api/metrics/fetch';
        this.includeSparkline = options.includeSparkline !== false;
        this.tileHeight = options.tileHeight || 36;

        this._tileViews = []; // matches `this.tiles` order
    }

    async getTemplate() {
        return `<div class="mojo-kpi-strip-grid" data-container="grid"></div>`;
    }

    async onInit() {
        // Build one KPITile per spec; mount under a single grid container.
        // We use containerId='grid' on the strip and append children manually
        // by wrapping each in its own dynamic container div.
        for (let i = 0; i < this.tiles.length; i++) {
            const spec = this.tiles[i];
            const containerId = `kpi-tile-${i}`;
            const tile = new KPITile({
                containerId,
                slug: spec.slug || spec.key || `tile-${i}`,
                label: spec.label || spec.slug || '',
                severity: spec.severity || null,
                tone: spec.tone || null,
                sparklineHeight: this.tileHeight,
                formatter: spec.formatter || null
            });
            tile.on?.('tile:click', (data) => {
                this.emit?.('tile:click', { ...data, key: spec.key || spec.slug });
            });
            this._tileViews.push(tile);
            this.addChild(tile);
        }
    }

    async getViewData() {
        // Inject per-tile container divs into the grid template before render.
        return {
            ...this.data,
            tilesHtml: this._tileViews.map((_, i) =>
                `<div data-container="kpi-tile-${i}" class="mojo-kpi-strip-cell"></div>`
            ).join('')
        };
    }

    // We can't do template variables for child containers safely (the grid
    // needs N data-container slots known at template time). Override the
    // template to build the grid markup at render-time.
    async renderTemplate() {
        const cells = this._tileViews.map((_, i) =>
            `<div data-container="kpi-tile-${i}" class="mojo-kpi-strip-cell"></div>`
        ).join('');
        return `<div class="mojo-kpi-strip-grid">${cells}</div>`;
    }

    async onAfterRender() {
        await this.refresh();
    }

    /**
     * Refresh all tiles from the backend. One series call + parallel REST
     * count calls + (optional) one sparkline fetch.
     */
    async refresh() {
        const rest = this.getApp()?.rest;
        if (!rest) return;

        const metricSpecs = this.tiles.filter(t => t.slug);
        const restSpecs   = this.tiles.filter(t => t.rest);
        const slugs       = metricSpecs.map(t => t.slug);

        const promises = [];

        // 1) Batched series call with deltas
        let seriesPromise = null;
        if (slugs.length) {
            const params = {
                'slugs[]': slugs,
                account: this.account,
                granularity: this.granularity,
                with_delta: true,
                _: Date.now()
            };
            seriesPromise = rest.GET(this.seriesEndpoint, params).catch(err => {
                console.warn('[KPIStrip] series fetch failed:', err);
                return null;
            });
            promises.push(seriesPromise);
        }

        // 2) Batched fetch for sparkline data
        let sparkPromise = null;
        if (this.includeSparkline && slugs.length) {
            const drStart = new Date(Date.now() - this.sparklineDays * 86400000);
            const sparkParams = {
                'slugs[]': slugs,
                account: this.account,
                granularity: this.sparklineGranularity,
                with_labels: true,
                dr_start: Math.floor(drStart.getTime() / 1000),
                _: Date.now()
            };
            sparkPromise = rest.GET(this.fetchEndpoint, sparkParams).catch(err => {
                console.warn('[KPIStrip] sparkline fetch failed:', err);
                return null;
            });
            promises.push(sparkPromise);
        }

        // 3) Parallel REST count calls
        const restPromises = restSpecs.map(spec => {
            const params = { ...(spec.rest.params || {}), _: Date.now() };
            return rest.GET(spec.rest.endpoint, params).catch(err => {
                console.warn(`[KPIStrip] count fetch failed for ${spec.label}:`, err);
                return null;
            });
        });
        promises.push(...restPromises);

        await Promise.allSettled(promises);

        // ── distribute results ───────────────────────────────────────
        const seriesResp = seriesPromise ? await seriesPromise : null;
        const sparkResp  = sparkPromise  ? await sparkPromise  : null;
        // /api/metrics/series → response.data = { status, data: {slug: N},
        //                       prev_data, deltas: {slug: {delta, delta_pct?}}, ... }
        // /api/metrics/fetch  → response.data = { status, data: { labels: [...],
        //                       data: { slug: [...values], ... } } }
        const seriesData = this._unwrap(seriesResp);     // -> response.data
        const sparkInner = this._unwrap(sparkResp)?.data; // -> { labels, data: {slug:[]}}

        // metric tiles
        for (const spec of metricSpecs) {
            const tileIdx = this.tiles.indexOf(spec);
            const tile = this._tileViews[tileIdx];
            if (!tile) continue;

            const value = seriesData?.data?.[spec.slug] ?? null;
            const deltaInfo = seriesData?.deltas?.[spec.slug] || {};
            const delta = deltaInfo.delta ?? null;
            // delta_pct is intentionally omitted by backend when prev=0
            const deltaPct = deltaInfo.delta_pct ?? null;

            // Sparkline values: prefer slug key; fall back to 'default' which
            // the backend uses when a single-slug fetch is collapsed.
            const slugSeries = sparkInner?.data?.[spec.slug];
            const fallbackSeries = sparkInner?.data?.default;
            const sparkSeries = Array.isArray(slugSeries)
                ? slugSeries
                : (Array.isArray(fallbackSeries) ? fallbackSeries : []);

            tile.setData({
                value,
                delta,
                deltaPct,
                sparkline: sparkSeries
            });
        }

        // REST count tiles
        let restIdx = 0;
        for (const spec of restSpecs) {
            const tileIdx = this.tiles.indexOf(spec);
            const tile = this._tileViews[tileIdx];
            if (!tile) continue;
            const resp = await restPromises[restIdx++];
            const count = this._readRestCount(resp);
            tile.setData({ value: count, delta: null, deltaPct: null });
        }

        this.emit?.('strip:refreshed');
    }

    _unwrap(response) {
        if (!response) return null;
        // Standard mojo response: { success, data: { status, data, deltas, ... } }
        if (response.success && response.data) return response.data;
        return response;
    }

    _readRestCount(response) {
        if (!response) return null;
        const body = response.data || response;
        if (typeof body?.count === 'number') return body.count;
        if (typeof body?.data?.count === 'number') return body.data.count;
        return null;
    }
}

export default KPIStrip;
