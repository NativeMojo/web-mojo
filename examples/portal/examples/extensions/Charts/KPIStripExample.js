import { Page } from 'web-mojo';
import { KPITile, KPIStrip } from 'web-mojo/charts';

/**
 * KPIStripExample — compact dashboard tiles fed by one batched fetch.
 *
 * Doc:   docs/web-mojo/extensions/Charts.md (KPIStrip section)
 * Route: extensions/charts/kpi-strip
 *
 * Two demos:
 *
 * 1. **Standalone KPITile** — pure presentation. You pass `value`, `delta`,
 *    `deltaPct`, and `sparkline` directly. No fetch. Useful when the
 *    surrounding panel already has data.
 *
 * 2. **KPIStrip** — orchestrator. One batched call to
 *    `/api/metrics/series?with_delta=true` populates N tiles, plus
 *    parallel REST count calls for non-time-series tiles. Sparklines come
 *    from a single batched `/api/metrics/fetch`. Click any tile to see
 *    the `tile:click` event in the live log.
 *
 * Hits `/api/metrics/series` and `/api/metrics/fetch` on the backend at
 * localhost:9009. With no backend, tiles render with no values — that's
 * expected (the empty-state is a flat row of "—" placeholders).
 */
class KPIStripExample extends Page {
    static pageName = 'extensions/charts/kpi-strip';
    static route = 'extensions/charts/kpi-strip';

    constructor(options = {}) {
        super({
            ...options,
            pageName: KPIStripExample.pageName,
            route: KPIStripExample.route,
            title: 'KPITile + KPIStrip — compact dashboard tiles',
            template: KPIStripExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        // ── Demo 1: standalone KPITiles with hand-rolled data ────────
        this.addChild(new KPITile({
            containerId: 'standalone-1',
            slug: 'demo-events',
            label: 'Events Today',
            value: 4219,
            deltaPct: 8.4,
            tone: 'bad',                  // rising-is-bad → +8.4% renders red
            sparkline: [3812, 3900, 3600, 4100, 3950, 4188, 4219]
        }));

        this.addChild(new KPITile({
            containerId: 'standalone-2',
            slug: 'demo-incidents',
            label: 'Open Incidents',
            value: 23,
            delta: 5,                     // no deltaPct: prev was 0 → "+5" not "Infinity%"
            tone: 'bad',
            severity: 'critical',         // adds the red left stripe
            sparkline: [12, 14, 13, 17, 19, 21, 23]
        }));

        this.addChild(new KPITile({
            containerId: 'standalone-3',
            slug: 'demo-resolved',
            label: 'Resolved Today',
            value: 47,
            deltaPct: -12.5,
            tone: 'good',                 // falling resolved is bad → −12.5% renders red
            sparkline: [62, 58, 55, 51, 49, 50, 47]
        }));

        this.addChild(new KPITile({
            containerId: 'standalone-4',
            slug: 'demo-flat',
            label: 'New-Country Logins',
            value: 7,
            delta: 0,                     // exactly flat → "±0" with neutral grey
            tone: 'bad',
            sparkline: [4, 6, 5, 8, 6, 7, 7]
        }));

        // ── Demo 2: KPIStrip with batched backend fetch ──────────────
        // The strip makes ONE /api/metrics/series call for all `slug` tiles,
        // ONE /api/metrics/fetch for sparkline trails, and parallel REST
        // GETs for `rest:` count tiles. Click any tile to see the event.
        this.strip = new KPIStrip({
            containerId: 'strip',
            account: 'incident',
            granularity: 'days',
            sparklineDays: 7,
            tiles: [
                { slug: 'incident_events',  label: 'Events',           tone: 'bad' },
                { slug: 'incidents',        label: 'Incidents',        tone: 'bad', severity: 'warn' },
                { slug: 'auth:failures',    label: 'Failed Auth',      tone: 'bad' },
                { slug: 'firewall:blocks',  label: 'Firewall Blocks',  tone: 'bad' },
                { slug: 'bouncer:blocks',   label: 'Bouncer Blocks',   tone: 'bad' },
                { slug: 'login:new_country',label: 'New-Country Logins', tone: 'bad' },
                {
                    rest: { endpoint: '/api/incident/incident', params: { status: 'open', size: 1 } },
                    key: 'open-incidents',
                    label: 'Open Incidents',
                    severity: 'critical',
                    tone: 'bad'
                },
                {
                    rest: { endpoint: '/api/account/geolocated_ip', params: { is_blocked: true, size: 1 } },
                    key: 'active-blocks',
                    label: 'Active Blocks',
                    tone: 'bad'
                },
            ]
        });
        this.strip.on?.('tile:click', ({ slug, key }) => {
            this._log(`tile:click → slug=${slug || '(rest)'} key=${key || ''}`);
        });
        this.strip.on?.('strip:refreshed', () => {
            this._log('strip:refreshed');
        });
        this.addChild(this.strip);
    }

    async onActionRefresh() {
        this._log('manual refresh');
        await this.strip?.refresh();
    }

    _log(msg) {
        const log = this.element?.querySelector('[data-region="log"]');
        if (!log) return;
        const time = new Date().toLocaleTimeString();
        log.textContent = `[${time}] ${msg}\n` + log.textContent;
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>KPITile + KPIStrip</h1>
            <p class="example-summary">
                Compact dashboard tiles. <code>KPITile</code> is presentation-only —
                pass <code>value</code>, <code>delta</code>/<code>deltaPct</code>, and
                <code>sparkline</code> directly. <code>KPIStrip</code> wraps N tiles
                with one batched <code>/api/metrics/series?with_delta=true</code> call,
                one batched <code>/api/metrics/fetch</code> for sparklines, and
                parallel REST count calls for non-time-series tiles.
            </p>
            <p class="example-docs-link">
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/Charts.md">
                    <i class="bi bi-book"></i> docs/web-mojo/extensions/Charts.md
                </a>
            </p>

            <h2 class="h6 text-uppercase text-muted mt-4 mb-2">1. Standalone KPITiles (no fetch)</h2>
            <p class="small text-muted">Hand-rolled data demonstrates delta rendering rules.</p>
            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3"><div data-container="standalone-1"></div></div>
                <div class="col-6 col-md-3"><div data-container="standalone-2"></div></div>
                <div class="col-6 col-md-3"><div data-container="standalone-3"></div></div>
                <div class="col-6 col-md-3"><div data-container="standalone-4"></div></div>
            </div>

            <div class="d-flex justify-content-between align-items-center mt-4 mb-2">
                <h2 class="h6 text-uppercase text-muted mb-0">2. KPIStrip (batched fetch)</h2>
                <button class="btn btn-outline-secondary btn-sm" data-action="refresh">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>
            <p class="small text-muted">
                One <code>series?with_delta=true</code> call fills all metric tiles.
                Click any tile to see the event in the log below.
            </p>
            <div data-container="strip" class="mb-3"></div>

            <h2 class="h6 text-uppercase text-muted mt-4 mb-2">Event log</h2>
            <pre class="bg-body-tertiary border rounded p-2 small" style="height: 140px; overflow: auto;" data-region="log">(no events yet)</pre>

            <p class="text-muted small mt-3">
                <i class="bi bi-info-circle"></i>
                Without the backend at <code>localhost:9009</code>, tiles render with
                <code>—</code> placeholders. The standalone tiles above always render
                because they don't fetch.
            </p>
        </div>
    `;
}

export default KPIStripExample;
