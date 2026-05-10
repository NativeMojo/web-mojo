import { Page, ListView, Collection } from 'web-mojo';

/**
 * ListViewRowStripeExample — severity-coded left-edge stripe.
 *
 * Doc:    docs/web-mojo/components/ListView.md#row-stripe-severity-coded-left-edge-color
 * Route:  components/list-view/row-stripe
 *
 * Demonstrates:
 *   1. Real audit-feed use case — `level` thresholds map to danger / warning /
 *      info / success / null. Stripe re-applies automatically on `model.set()`
 *      because View binds `model:change → render()` in the base class.
 *   2. Token reference — all six Bootstrap variant tokens side-by-side so the
 *      consumer can pick the right one for their domain.
 *   3. `refreshStripes()` — external-state threshold control. The callback
 *      reads a closure variable (not the model); a Min Severity button group
 *      flips that variable and calls `refreshStripes()` to re-paint every row.
 */

const NOW = Date.now();
const MIN = 60 * 1000;

const SEED_EVENTS = [
    { id: 1, level: 5, message: 'Failed login from new IP · 5 attempts',  actor: 'unknown',       ts: NOW - 2 * MIN },
    { id: 2, level: 4, message: 'Rate limit exceeded on /api/export',     actor: 'api-key-7f3a',  ts: NOW - 14 * MIN },
    { id: 3, level: 3, message: 'Password changed',                       actor: 'alice@ex.com',  ts: NOW - 38 * MIN },
    { id: 4, level: 2, message: 'User signed in',                         actor: 'ben@ex.com',    ts: NOW - 52 * MIN },
    { id: 5, level: 5, message: 'Webhook signature mismatch',             actor: 'billing-svc',   ts: NOW - 71 * MIN },
    { id: 6, level: 1, message: 'Session expired',                        actor: 'carla@ex.com',  ts: NOW - 92 * MIN },
    { id: 7, level: 3, message: 'MFA enrolled · TOTP',                    actor: 'dan@ex.com',    ts: NOW - 118 * MIN },
    { id: 8, level: 4, message: 'Permission denied · /admin/users',       actor: 'grace@ex.com',  ts: NOW - 140 * MIN },
];

const TOKEN_REFERENCE = [
    { id: 't-danger',    token: 'danger',    label: 'danger',    when: 'Critical · blocking · destructive' },
    { id: 't-warning',   token: 'warning',   label: 'warning',   when: 'Caution · degraded · throttled' },
    { id: 't-info',      token: 'info',      label: 'info',      when: 'Notable · audit-worthy' },
    { id: 't-success',   token: 'success',   label: 'success',   when: 'Positive · completed' },
    { id: 't-primary',   token: 'primary',   label: 'primary',   when: 'Branded accent · highlight' },
    { id: 't-secondary', token: 'secondary', label: 'secondary', when: 'Muted · low-emphasis' },
];

const EVENT_TEMPLATE = `
    <div class="d-flex align-items-center gap-3 p-3 border-bottom">
        <span class="badge text-bg-light font-monospace" style="min-width: 2.25rem;">L{{model.level}}</span>
        <div class="flex-grow-1">
            <div class="fw-semibold">{{model.message}}</div>
            <div class="small text-muted">{{model.actor}} · {{model.ts|relative}}</div>
        </div>
    </div>
`;

const TOKEN_TEMPLATE = `
    <div class="d-flex align-items-center gap-3 p-3 border-bottom">
        <code class="fs-6">{{model.label}}</code>
        <div class="small text-muted flex-grow-1">{{model.when}}</div>
    </div>
`;

function stripeForLevel(level) {
    if (level >= 5) return 'danger';
    if (level >= 4) return 'warning';
    if (level >= 3) return 'info';
    return null;
}

class ListViewRowStripeExample extends Page {
    static pageName = 'components/list-view/row-stripe';
    static route = 'components/list-view/row-stripe';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ListViewRowStripeExample.pageName,
            route: ListViewRowStripeExample.route,
            title: 'ListView row stripe',
            template: ListViewRowStripeExample.TEMPLATE,
        });
        this.minSeverity = 3;
    }

    async onInit() {
        await super.onInit();

        // Section 1 — severity-coded audit feed (the marquee use case)
        this.feedList = new ListView({
            containerId: 'feed-slot',
            collection: new Collection(SEED_EVENTS),
            itemTemplate: EVENT_TEMPLATE,
            rowStripe: (model) => stripeForLevel(model.get('level')),
        });
        this.addChild(this.feedList);

        // Section 2 — token reference, one row per built-in token
        this.tokenList = new ListView({
            containerId: 'tokens-slot',
            collection: new Collection(TOKEN_REFERENCE),
            itemTemplate: TOKEN_TEMPLATE,
            rowStripe: (model) => model.get('token'),
        });
        this.addChild(this.tokenList);

        // Section 3 — refreshStripes() driven by external state (a threshold)
        this.thresholdList = new ListView({
            containerId: 'threshold-slot',
            collection: new Collection(SEED_EVENTS),
            itemTemplate: EVENT_TEMPLATE,
            rowStripe: (model) => {
                const level = model.get('level');
                if (level < this.minSeverity) return null;
                return stripeForLevel(level);
            },
        });
        this.addChild(this.thresholdList);
    }

    onActionSetMinSeverity(_event, element) {
        const next = Number(element.getAttribute('data-min'));
        if (Number.isNaN(next)) return;
        this.minSeverity = next;

        const group = this.element.querySelector('[data-min-group]');
        group?.querySelectorAll('[data-min]').forEach((btn) => {
            const active = Number(btn.getAttribute('data-min')) === next;
            btn.classList.toggle('active', active);
            btn.classList.toggle('btn-primary', active);
            btn.classList.toggle('btn-outline-primary', !active);
        });

        this.thresholdList.refreshStripes();
    }

    onActionRandomize() {
        this.feedList.collection.forEach((model) => {
            const next = 1 + Math.floor(Math.random() * 5);
            model.set('level', next);
        });
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView row stripe</h1>
            <p class="example-summary">
                <code>rowStripe: (model) =&gt; token | className | null</code> paints a
                4px theme-aware left-edge stripe on each row. Six Bootstrap variant
                tokens map to canonical classes; any other non-empty string is treated
                as a consumer-defined class name. Re-applies automatically on
                <code>model.set()</code>; use <code>refreshStripes()</code> for
                external-state callbacks.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md#row-stripe-severity-coded-left-edge-color">
                    docs/web-mojo/components/ListView.md
                </a>
            </p>

            <h5 class="mt-4">Severity-coded audit feed</h5>
            <p class="text-secondary small mb-3">
                <code>L5 → danger</code>, <code>L4 → warning</code>, <code>L3 → info</code>,
                below → no stripe. Click <em>Randomize levels</em> to re-roll — the stripes
                follow because each row re-renders on <code>model.set()</code>.
            </p>
            <div class="card mb-2">
                <div class="card-body p-0">
                    <div data-container="feed-slot"></div>
                </div>
            </div>
            <div class="mb-4">
                <button class="btn btn-sm btn-outline-secondary" data-action="randomize">
                    <i class="bi bi-shuffle"></i> Randomize levels
                </button>
            </div>

            <h5 class="mt-5">Token reference</h5>
            <p class="text-secondary small mb-3">
                The six Bootstrap variant tokens accepted by <code>rowStripe</code>.
                Each resolves to <code>var(--bs-&lt;token&gt;)</code>, so light + dark
                themes track automatically.
            </p>
            <div class="card mb-4">
                <div class="card-body p-0">
                    <div data-container="tokens-slot"></div>
                </div>
            </div>

            <h5 class="mt-5">External state · <code>refreshStripes()</code></h5>
            <p class="text-secondary small mb-3">
                The stripe callback reads <code>this.minSeverity</code> — a closure
                variable, not a model field. Changing it has no model event, so the
                page calls <code>refreshStripes()</code> to re-evaluate every row.
            </p>
            <div class="d-flex align-items-center gap-2 mb-2" data-min-group>
                <span class="small text-secondary">Min severity:</span>
                <button class="btn btn-sm btn-outline-primary"  data-action="set-min-severity" data-min="1">L1</button>
                <button class="btn btn-sm btn-outline-primary"  data-action="set-min-severity" data-min="2">L2</button>
                <button class="btn btn-sm btn-primary active"   data-action="set-min-severity" data-min="3">L3</button>
                <button class="btn btn-sm btn-outline-primary"  data-action="set-min-severity" data-min="4">L4</button>
                <button class="btn btn-sm btn-outline-primary"  data-action="set-min-severity" data-min="5">L5</button>
            </div>
            <div class="card">
                <div class="card-body p-0">
                    <div data-container="threshold-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default ListViewRowStripeExample;
