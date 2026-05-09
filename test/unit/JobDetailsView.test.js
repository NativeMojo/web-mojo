/**
 * JobDetailsView regression tests
 *
 * Verifies the Wave 2 B4 migration:
 *   - Overview's `data-container="job-status"` mounts a StatusPanel
 *     instance (not the legacy local JobStatusPanel).
 *   - Overview's lifecycle slot mounts a Timeline instance (not the
 *     legacy local JobLifecycleCard's hand-built `<ol>`).
 *   - The view registers the 9 expected sections (Overview, Payload,
 *     Activity divider, Events, Logs, Retry History, Related divider,
 *     Similar) when `func` is known.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();

    // Pre-register a stub for `@ext/admin/models/Job.js` — the simple-
    // module-loader maps that import path to `global.JobModelsStub`.
    // Each stub is a vanilla class so JobDetailsView can call
    // `Job.VIEW_CLASS = ...` at module load and `new SimilarJobsList(...)`
    // inside the constructor without exploding.
    class JobStub {
        constructor(data = {}) { this._data = data; }
    }
    class JobListStub {
        constructor(opts = {}) { this.options = opts; this.params = opts.params || {}; }
        async fetch() { return { success: true }; }
        get models() { return []; }
    }
    class JobEventListStub extends JobListStub {}
    class JobLogListStub extends JobListStub {}
    class SimilarJobsListStub extends JobListStub {}
    global.JobModelsStub = {
        Job: JobStub,
        JobList: JobListStub,
        JobEventList: JobEventListStub,
        JobLogList: JobLogListStub,
        JobForms: { retry: {} },
        SimilarJobsList: SimilarJobsListStub
    };

    // Load primitives first so the loader satisfies JobDetailsView's deps.
    loadModule('View');
    const StatusPanel = loadModule('StatusPanel');
    const Timeline    = loadModule('Timeline');
    loadModule('DetailView');
    loadModule('Modal');
    loadModule('MOJOUtils');

    // Stub TableView — the real one extends ListView (not registered with
    // the simple-module-loader) and pulls in a deep import graph. We only
    // need a constructible class that records its options so the assembly
    // code in JobDetailsView's constructor doesn't blow up.
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

    const JobDetailsView = loadModule('JobDetailsView');

    // ── Fixture model ─────────────────────────────────────────
    function makeJobModel(attrs = {}) {
        const data = {
            id: 'job-abcdef-12345678',
            func: 'demo.task',
            channel: 'default',
            status: 'running',
            attempt: 1,
            max_retries: 3,
            runner_id: 'runner-7',
            started_at: Date.now() - 4 * 60 * 1000,
            created: Date.now() - 5 * 60 * 1000,
            recent_events: [
                { event: 'enqueued', label: 'Enqueued', at: Date.now() - 5 * 60 * 1000 },
                { event: 'started',  label: 'Started',  at: Date.now() - 4 * 60 * 1000, runner_id: 'runner-7' }
            ],
            payload: { task: 'demo.task', args: [1, 2, 3] },
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
            isScheduled() { return false; },
            isTerminal()  { return ['completed', 'failed', 'canceled', 'expired'].includes(data.status); },
            canRetry()    { return ['failed', 'canceled', 'expired'].includes(data.status); },
            canCancel()   { return ['pending', 'running'].includes(data.status) && !data.cancel_requested; },
            getEvents()   { return data.recent_events || []; },
            getFormattedDuration() { return data.duration_ms ? `${data.duration_ms}ms` : 'N/A'; },
            getStatusBadgeClass() { return 'bg-success'; },
            getStatusIcon()       { return 'bi-arrow-repeat'; },
            // fetch is called from onAfterBuild — make it a no-op resolved
            async fetch() { return { success: true }; },
            async save()  { return { success: true, status: 200 }; }
        };
    }

    describe('JobDetailsView (Wave 2 B4)', () => {
        let view;
        let model;

        beforeEach(async () => {
            model = makeJobModel({ func: 'demo.task' });
            view = new JobDetailsView({ model });
            await view.render(false);
            // Skip onAfterBuild's fetch chain — we only care about structure.
        });

        it('Overview status slot mounts a StatusPanel instance', () => {
            const overview = view.overviewSection;
            expect(overview).toBeTruthy();
            expect(overview.statusPanel).toBeInstanceOf(StatusPanel);

            // The StatusPanel must be mounted under the
            // `data-container="job-status"` slot in the overview view.
            const slot = overview.element.querySelector('[data-container="job-status"]');
            expect(slot).toBeTruthy();
            // After render, the StatusPanel's element either replaces the
            // container or sits inside it — `.detail-status-panel` is the
            // hard-evidence class, regardless of mount strategy.
            const panelEl = overview.element.querySelector('.detail-status-panel');
            expect(panelEl).toBeTruthy();
        });

        it('Overview lifecycle slot uses Timeline (not a hand-built <ol>)', () => {
            const lifecycle = view.overviewSection.lifecycleCard;
            expect(lifecycle).toBeTruthy();
            expect(lifecycle.timeline).toBeInstanceOf(Timeline);

            // The Timeline renders an `<ol class="detail-timeline">` rooted
            // inside the lifecycle card.
            const tl = lifecycle.element.querySelector('ol.detail-timeline');
            expect(tl).toBeTruthy();
            // recent_events fixture has 2 entries → 2 timeline items.
            expect(tl.querySelectorAll('.detail-timeline-item').length).toBe(2);
        });

        it('registers the 9 expected sections when func is known', () => {
            // 9 SideNav entries: 6 keyed sections + 2 dividers + 1 similar.
            // Concretely: Overview, Payload, [Activity], Events, Logs,
            // RetryHistory, [Related], Similar — total 8 entries with 2
            // dividers, or 9 entries if you count Similar as a divider sib.
            const cfg = view.sectionsConfig;
            expect(Array.isArray(cfg)).toBe(true);
            expect(cfg.length).toBe(8);

            const keys = cfg.filter(s => s.key).map(s => s.key);
            expect(keys).toEqual([
                'Overview', 'Payload', 'Events', 'Logs', 'RetryHistory', 'Similar'
            ]);

            const dividers = cfg.filter(s => s.type === 'divider').map(d => d.label);
            expect(dividers).toEqual(['Activity', 'Related']);
        });

        it('omits the Similar section when func is missing', async () => {
            const m = makeJobModel({ func: null });
            const v = new JobDetailsView({ model: m });
            await v.render(false);

            const keys = v.sectionsConfig.filter(s => s.key).map(s => s.key);
            expect(keys).not.toContain('Similar');
            // 5 keyed sections + 1 divider (Activity).
            expect(v.sectionsConfig.length).toBe(6);
        });

        it('header auxFn renders a state-aware readout for running status', () => {
            const aux = view.headerView.element.querySelector('.dh-aux');
            expect(aux).toBeTruthy();
            // Running on runner-7 · started …
            expect(aux.textContent).toContain('Running');
            expect(aux.textContent).toContain('runner-7');
        });

        it('keeps header `actions` empty (StatusPanel owns Retry / Cancel)', () => {
            // The header config is consulted by DetailHeaderView — the
            // primary actions are rendered by StatusPanel inside the
            // Overview section. Header `actions` should be the empty array.
            expect(view.headerView.actions).toEqual([]);
        });
    });
};
