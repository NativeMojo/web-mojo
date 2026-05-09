/**
 * ShortLinkView regression tests
 *
 * Verifies the Wave 3 C8 sweep:
 *   - Overview Section mounts four MetricCard KPIs (Hits 30d / 7d / today
 *     / top country) — default size, no metric-card-lg.
 *   - Overview's Slack/iMessage preview renders inline (NO outer .card
 *     wrapper) with the borderless `.sl-preview` tinted region.
 *   - Metadata section mounts a KnownFieldsCard (raw JSON in the
 *     framework's collapsible <details> block).
 *   - The view registers the 8 expected sections + 2 dividers.
 *   - viewDialogOptions does NOT force `size: 'xl'` (lg is the default).
 *   - Header `auxFn` renders the right-gutter readout slot.
 *   - Click History TableView shows the disabled-tracking empty message
 *     when track_clicks=false.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();

    // Stub the @core/models/ShortLink imports — the loader maps that import
    // path to `global.ShortLinkModelsStub`. Each stub is a vanilla class so
    // ShortLinkView can call `ShortLink.VIEW_CLASS = ...` at module load
    // and `new ShortLinkClickList(...)` inside the constructor without
    // exploding.
    class ShortLinkStub {
        constructor(data = {}) { this._data = data; }
    }
    class ShortLinkClickListStub {
        constructor(opts = {}) {
            this.options = opts;
            this.params = opts.params || {};
            this.models = [];
            this._handlers = new Map();
        }
        async fetch() { return { success: true }; }
        on(ev, fn) {
            if (!this._handlers.has(ev)) this._handlers.set(ev, []);
            this._handlers.get(ev).push(fn);
        }
        off() {}
    }
    global.ShortLinkModelsStub = {
        ShortLink: ShortLinkStub,
        ShortLinkClickList: ShortLinkClickListStub,
        ShortLinkForms: { edit: { title: 'Edit', fields: [] } },
        SHORTLINK_SOURCE_OPTIONS: [{ value: 'admin', label: 'Admin' }],
        TWITTER_CARD_OPTIONS: [],
        flattenShortLinkMetadata: (m = {}) => ({
            og_title: m['og:title'] || '',
            og_description: m['og:description'] || '',
            og_image: m['og:image'] || '',
            twitter_card: m['twitter:card'] || '',
            twitter_title: m['twitter:title'] || '',
            twitter_description: m['twitter:description'] || '',
            twitter_image: m['twitter:image'] || ''
        }),
        buildShortLinkMetadata: (form = {}) => {
            const out = {};
            if (form.og_title) out['og:title'] = form.og_title;
            if (form.og_description) out['og:description'] = form.og_description;
            if (form.og_image) out['og:image'] = form.og_image;
            return out;
        },
        extractShortLinkPayload: (form = {}) => ({ ...form })
    };

    // Stub the chart import — MetricsChart only matters for Metrics
    // section's track_clicks=true branch; our fixture leaves it false so
    // the chart never instantiates. A constructible class is sufficient.
    class MetricsChartStub {
        constructor(opts = {}) { this.options = opts; }
        async render() { return this; }
    }
    global.ChartsStub = { MetricsChart: MetricsChartStub };

    // Load primitives first so the loader satisfies ShortLinkView's deps.
    loadModule('View');
    const MetricCard = loadModule('MetricCard');
    const KnownFieldsCard = loadModule('KnownFieldsCard');
    loadModule('DetailView');
    loadModule('Modal');
    loadModule('MOJOUtils');
    loadModule('dataFormatter');

    // Stub TableView — same as JobDetailsView.test.js. The real TableView
    // extends ListView which isn't registered, so we replace it with a
    // constructible class that records its options.
    class TableViewStub {
        constructor(options = {}) {
            this.options = options;
            Object.assign(this, options);
            this.element = document.createElement('div');
            this.element.className = 'table-view-component';
        }
        async render() { return this; }
        isMounted() { return false; }
        on() {} off() {}
    }
    global.TableView = TableViewStub;

    const ShortLinkView = loadModule('ShortLinkView');

    // ── Fixture model ─────────────────────────────────────────
    function makeShortLinkModel(attrs = {}) {
        const data = {
            id: 'sl-12345',
            code: 'abc123',
            url: 'https://example.com/very-long-destination-url',
            short_link: 'https://s.io/s/abc123',
            source: 'admin',
            track_clicks: false,
            bot_passthrough: false,
            is_protected: false,
            is_active: true,
            hit_count: 42,
            created: Date.now() - 5 * 86400000,
            modified: Date.now() - 3 * 60 * 1000,
            metadata: {
                'og:title': 'Sample Title',
                'og:description': 'Sample description for Slack/iMessage preview',
                'og:image': 'https://example.com/preview.jpg',
                custom_key: 'custom_value'
            },
            ...attrs
        };
        const handlers = new Map();
        return {
            attributes: data,
            get(k) { return data[k]; },
            set(k, v) {
                if (typeof k === 'object') Object.assign(data, k);
                else data[k] = v;
                handlers.get('change')?.forEach(fn => fn());
            },
            on(ev, fn) {
                if (!handlers.has(ev)) handlers.set(ev, []);
                handlers.get(ev).push(fn);
            },
            off(ev, fn) {
                const arr = handlers.get(ev) || [];
                const i = arr.indexOf(fn);
                if (i >= 0) arr.splice(i, 1);
            },
            toJSON() { return { ...data }; },
            async fetch() { return { success: true }; },
            async save()  { return { success: true, status: 200 }; }
        };
    }

    describe('ShortLinkView (Wave 3 C8)', () => {
        let view;
        let model;

        beforeEach(async () => {
            model = makeShortLinkModel();
            view = new ShortLinkView({ model });
            await view.render(false);
            // Skip onAfterBuild's fetch chain — we only care about structure.
        });

        it('Overview mounts four MetricCard KPIs', () => {
            const overview = view.overviewSection;
            expect(overview).toBeTruthy();
            expect(overview.kpi30).toBeInstanceOf(MetricCard);
            expect(overview.kpi7).toBeInstanceOf(MetricCard);
            expect(overview.kpiToday).toBeInstanceOf(MetricCard);
            expect(overview.kpiCountry).toBeInstanceOf(MetricCard);

            // Default-size MetricCard — verify the metric-card root has
            // NO `metric-card-lg` modifier class.
            const cards = overview.element.querySelectorAll('.metric-card');
            expect(cards.length).toBe(4);
            cards.forEach((c) => {
                expect(c.classList.contains('metric-card-lg')).toBe(false);
            });
        });

        it('Overview Slack/iMessage preview renders without a card wrapper', () => {
            const overview = view.overviewSection;
            // Borderless tinted region — the framework class is `.sl-preview`,
            // NOT a Bootstrap `.card`. The fixture has og:title/description
            // /image set, so the preview block should render.
            const preview = overview.element.querySelector('.sl-preview');
            expect(preview).toBeTruthy();

            // No nested `.card` ancestor inside Overview — Wave 3 design
            // language forbids stacked card wrappers around section content.
            const cardAncestor = overview.element.querySelector('.card');
            expect(cardAncestor).toBeNull();

            // Domain text should reflect the destination URL.
            const domainEl = preview.querySelector('.sl-preview-domain');
            expect(domainEl).toBeTruthy();
            expect(domainEl.textContent).toContain('example.com');
        });

        it('Metadata section mounts a KnownFieldsCard with raw JSON block', async () => {
            const meta = view.metadataSection;
            expect(meta).toBeTruthy();

            // Sections render lazily — Overview is active by default, so the
            // Metadata section view's onInit hasn't fired yet. Navigate to it
            // to trigger the mount.
            await view.showSection('Metadata');

            expect(meta.knownFields).toBeInstanceOf(KnownFieldsCard);

            // The raw JSON block lives inside the framework's
            // <details>/<summary> wrapper. Confirm the slot is present.
            const slot = meta.element.querySelector('[data-container="sl-metadata-card"]');
            expect(slot).toBeTruthy();
            const card = meta.element.querySelector('.detail-known-fields-card');
            expect(card).toBeTruthy();
        });

        it('registers the 8 expected sections + 2 dividers', () => {
            const cfg = view.sectionsConfig;
            expect(Array.isArray(cfg)).toBe(true);
            expect(cfg.length).toBe(8);

            const keys = cfg.filter(s => s.key).map(s => s.key);
            expect(keys).toEqual([
                'Overview', 'Configuration', 'ClickHistory',
                'Metrics', 'OgSocial', 'Metadata'
            ]);

            const dividers = cfg.filter(s => s.type === 'divider').map(d => d.label);
            expect(dividers).toEqual(['Activity', 'Detail']);
        });

        it('does NOT force `size: xl` on the dialog (inherits Modal.detail default lg)', () => {
            // Per Wave 3 design rule #8: per-view viewDialogOptions must NOT
            // include size: 'xl'. The view itself doesn't set it, and the
            // ShortLinkTablePage's viewDialogOptions also doesn't include
            // size — so the modal inherits the framework's `lg` default.
            // (We only have access to the view here; assert no `size`
            // override leaked onto the view's own options.)
            expect(view.options?.size).not.toBe('xl');
        });

        it('header auxFn renders the right-gutter readout slot', () => {
            const aux = view.headerView.element.querySelector('.dh-aux');
            expect(aux).toBeTruthy();
            // 42 hits fixture → "42 hits" main label
            expect(aux.textContent).toContain('42 hits');
        });

        it('keeps Click History empty-message tracking-aware when track_clicks=false', () => {
            // The fixture has track_clicks: false → empty message should
            // explain *why* the table is empty.
            const tv = view.clickHistorySection;
            expect(tv.tableOptions.emptyMessage).toContain('disabled');
        });

        it('switches Click History empty-message when track_clicks=true', async () => {
            const m = makeShortLinkModel({ track_clicks: true });
            const v = new ShortLinkView({ model: m });
            await v.render(false);
            expect(v.clickHistorySection.tableOptions.emptyMessage).toBe(
                'No clicks recorded yet.'
            );
        });
    });
};
