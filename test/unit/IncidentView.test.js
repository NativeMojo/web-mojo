/**
 * IncidentView regression tests
 *
 * Verifies the Wave 3 C2 migration:
 *   - Overview's `data-container="ov-status"` mounts a StatusPanel
 *     instance (the legacy IncidentStatusPanel is gone).
 *   - The "What happened next" card mounts a Timeline (no hand-built
 *     `<ol class="detail-timeline">`).
 *   - The Metadata section mounts a KnownFieldsCard (replaces the
 *     legacy IncidentDetailSection's bordered raw `<pre>` block).
 *   - The view registers the expected sectionsConfig keys.
 *   - Header `auxFn` renders a state-aware right-gutter readout.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();

    // ── Stub all of IncidentView's heavy/admin imports ─────

    class IncidentStub {
        constructor(data = {}) {
            this._data = { ...data };
            this.attributes = this._data;
        }
        get(k) { return this._data[k]; }
        set(k, v) {
            if (typeof k === 'object') Object.assign(this._data, k);
            else this._data[k] = v;
        }
        async fetch() { return { success: true }; }
        async save()  { return { success: true, status: 200 }; }
        on() {} off() {}
    }
    class IncidentEventListStub {
        constructor(opts = {}) { this.options = opts; this.params = opts.params || {}; }
        async fetch() { return { success: true }; }
        get models() { return []; }
        on() {} off() {}
    }
    class IncidentListStub extends IncidentEventListStub {}
    class RelatedIncidentsListStub extends IncidentListStub {
        constructor(opts = {}) {
            super(opts);
            this.sourceIp = opts.sourceIp;
            this.ruleSet  = opts.ruleSet;
            this.group    = opts.group;
            this.hostname = opts.hostname;
            this.category = opts.category;
        }
    }
    class RuleSetStub {
        constructor(data = {}) { this._d = { ...data }; }
        get(k) { return this._d[k]; }
        async fetch() { return { success: true }; }
    }
    class RuleStub  {
        async save() { return { success: true, status: 200 }; }
    }
    class RuleListStub extends IncidentEventListStub {}

    global.IncidentModelsStub = {
        Incident:           IncidentStub,
        IncidentForms:      { create: { fields: [] }, edit: { fields: [] } },
        IncidentEventList:  IncidentEventListStub,
        IncidentList:       IncidentListStub,
        RuleSet:            RuleSetStub,
        RuleSetForms:       { create: { fields: [] }, edit: { fields: [] } },
        Rule:               RuleStub,
        RuleList:           RuleListStub,
        BundleByOptions:    [],
        MatchByOptions:     [],
        RelatedIncidentsList: RelatedIncidentsListStub
    };

    class TicketStub {
        constructor(data = {}) { this._d = { ...data }; }
        get(k) { return this._d[k]; }
        async save() { return { success: true, status: 200 }; }
        async fetch() { return { success: true }; }
    }
    class TicketListStub extends IncidentEventListStub {}
    global.TicketsModelsStub = {
        Ticket: TicketStub,
        TicketList: TicketListStub,
        TicketForms: { create: { fields: [] } }
    };

    class GeoLocatedIPStub {
        constructor(data = {}) { this._d = { ...data }; this.attributes = data; }
        get(k) { return this._d[k]; }
        static async lookup() { return null; }
    }
    global.SystemModelsStub = { GeoLocatedIP: GeoLocatedIPStub };

    // Sibling-view + adapter stubs
    global.GeoIPViewStub = class { static async show() {} };
    global.RuleSetViewStub = class { constructor() {} };
    global.IncidentHistoryAdapterStub = class { constructor() {} };
    global.AssistantContextChatStub = { openAssistantChat: async () => {} };

    // Heavy framework views — stub minimally
    global.ChatViewStub = class {
        constructor(options = {}) {
            this.options = options;
            Object.assign(this, options);
            this.element = document.createElement('div');
        }
        async render() { return this; }
        isMounted() { return false; }
        on() {} off() {}
        async addChild() {}
        get parent() { return null; }
    };
    global.StackTraceViewStub = global.ChatViewStub;
    global.DataViewStub = global.ChatViewStub;

    // Load primitives so the loader satisfies IncidentView's deps
    loadModule('View');
    const StatusPanel    = loadModule('StatusPanel');
    const Timeline       = loadModule('Timeline');
    const KnownFieldsCard = loadModule('KnownFieldsCard');
    loadModule('MetricCard');
    loadModule('DetailView');
    loadModule('Modal');
    loadModule('MOJOUtils');

    // Stub TableView (real one extends ListView, not registered here)
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

    const IncidentView = loadModule('IncidentView');

    // ── Fixture model ────────────────────────────────────────
    function makeIncidentModel(attrs = {}) {
        const data = {
            id: 1234,
            title: 'Brute force on /api/login',
            category: 'auth',
            scope: 'auth',
            status: 'new',
            priority: 7,
            hostname: 'web-1',
            event_count: 3,
            source_count: 1,
            related_count: 0,
            created: Math.floor(Date.now() / 1000) - 600,
            modified: Math.floor(Date.now() / 1000) - 60,
            metadata: {
                source_ip: '203.0.113.5',
                http_method: 'POST',
                http_path: '/api/login',
                handler_chain: 'block_ip,notify',
                blocked_ip: '203.0.113.5',
                user: 'attacker@example.com'
            },
            rule_set: { id: 7, name: 'Brute force detector' },
            ...attrs
        };
        const handlers = new Map();
        return {
            id: data.id,
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
            async fetch() { return { success: true }; },
            async save()  { return { success: true, status: 200 }; },
            async destroy() { return { success: true }; }
        };
    }

    describe('IncidentView (Wave 3 C2)', () => {
        let view;
        let model;

        beforeEach(async () => {
            model = makeIncidentModel();
            view = new IncidentView({ model });
            await view.render(false);
        });

        it('Overview status slot mounts a StatusPanel', () => {
            const overview = view.overviewSection;
            expect(overview).toBeTruthy();
            expect(overview.statusPanel).toBeInstanceOf(StatusPanel);
            const panel = overview.element.querySelector('.detail-status-panel');
            expect(panel).toBeTruthy();
        });

        it('Overview response card mounts a Timeline (no hand-built <ol>)', () => {
            const responseCard = view.overviewSection.responseCard;
            expect(responseCard).toBeTruthy();
            expect(responseCard.timeline).toBeInstanceOf(Timeline);
            // The Timeline renders an `<ol class="detail-timeline">` rooted
            // inside the response card. Fixture has handler_chain +
            // blocked_ip → at least 2 timeline items.
            const tl = responseCard.element.querySelector('ol.detail-timeline');
            expect(tl).toBeTruthy();
            expect(tl.querySelectorAll('.detail-timeline-item').length).toBeGreaterThanOrEqual(2);
        });

        it('Metadata section mounts a KnownFieldsCard', async () => {
            const metaSection = view.metadataSection;
            expect(metaSection).toBeTruthy();
            // Sections initialise lazily on activation. Switch to Metadata
            // so its `onInit()` runs.
            await view.sideNav.showSection('Metadata');
            expect(metaSection.metadataCard).toBeInstanceOf(KnownFieldsCard);
        });

        it('registers Overview / Events / Source / Request / Rule Engine / Tickets / History / Related / Metadata sections', () => {
            const cfg = view.sectionsConfig;
            expect(Array.isArray(cfg)).toBe(true);
            const keys = cfg.filter(s => s.key).map(s => s.key);
            expect(keys).toContain('Overview');
            expect(keys).toContain('Events');
            expect(keys).toContain('Source');     // sourceIP present in fixture
            expect(keys).toContain('Request');    // http_method present
            expect(keys).toContain('RuleEngine');
            expect(keys).toContain('Tickets');
            expect(keys).toContain('History');
            expect(keys).toContain('Related');
            expect(keys).toContain('Metadata');

            const dividers = cfg.filter(s => s.type === 'divider').map(d => d.label);
            expect(dividers).toContain('Investigation');
            expect(dividers).toContain('Response');
            expect(dividers).toContain('Related');
        });

        it('header `actions` is empty (StatusPanel owns Resolve / Assign / Re-open)', () => {
            expect(view.headerView.actions).toEqual([]);
        });

        it('header auxFn renders a state-aware readout for new status', () => {
            const aux = view.headerView.element.querySelector('.dh-aux');
            expect(aux).toBeTruthy();
            // status === 'new' → headline label is "New"
            expect(aux.textContent).toContain('New');
        });

        it('passes RelatedIncidentsList filter args (sourceIp / ruleSet / hostname)', () => {
            const rel = view.relatedCollection;
            expect(rel.sourceIp).toBe('203.0.113.5');
            expect(rel.ruleSet).toBe(7);
            expect(rel.hostname).toBe('web-1');
            // No `user` filter — Incident has no user FK.
            expect(rel.user).toBeUndefined();
        });
    });
};
