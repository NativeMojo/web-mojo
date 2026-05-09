/**
 * RunnerDetailsView regression tests
 *
 * Verifies the Wave 3 C3 migration:
 *   - Overview's `data-container="runner-status"` mounts a StatusPanel
 *     instance (not the legacy local RunnerStatusPanel).
 *   - StatusPanel tone tracks the runner's health (alive + heartbeat).
 *   - Hand-rolled tables (Active Jobs / Logs) became TableView instances.
 *   - The view registers the expected sections (Overview / System /
 *     Channels / Active Jobs / [History] / Job History / Logs /
 *     [Control] / Actions).
 *   - Header `auxFn` renders a state-aware right-gutter readout.
 *   - Header `actions[]` is empty (Ping / Drain / Shutdown live on the
 *     StatusPanel).
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();

    // ── Stubs for `@ext/admin/models/Job.js` and `@ext/admin/models/JobRunner.js`
    // The simple-module-loader maps those import paths to globals.
    class JobRunnerStub {
        constructor(data = {}) {
            this.attributes = { ...data };
            if (data.runner_id && !data.id) this.attributes.id = data.runner_id;
            this._handlers = new Map();
        }
        get(k) { return this.attributes[k]; }
        set(k, v) {
            if (typeof k === 'object') Object.assign(this.attributes, k);
            else this.attributes[k] = v;
            (this._handlers.get('change') || []).forEach(fn => fn());
        }
        on(ev, fn) {
            if (!this._handlers.has(ev)) this._handlers.set(ev, []);
            this._handlers.get(ev).push(fn);
        }
        off(ev, fn) {
            const arr = this._handlers.get(ev) || [];
            const i = arr.indexOf(fn);
            if (i >= 0) arr.splice(i, 1);
        }
        toJSON() { return { ...this.attributes }; }
        async fetch() { return { success: true }; }
        async save()  { return { success: true, status: 200 }; }
    }
    class JobRunnerListStub {
        constructor(opts = {}) { this.options = opts; this.params = opts.params || {}; this.models = []; }
        async fetch() { return { success: true }; }
    }
    global.JobRunnerModelsStub = {
        JobRunner: JobRunnerStub,
        JobRunnerList: JobRunnerListStub,
        JobRunnerForms: {}
    };

    class JobListStub {
        constructor(opts = {}) {
            this.options = opts;
            this.params = opts.params || {};
            this.models = [];
            this._h = new Map();
        }
        on(ev, fn) {
            if (!this._h.has(ev)) this._h.set(ev, []);
            this._h.get(ev).push(fn);
        }
        async fetch() { return { success: true }; }
    }
    class ActiveJobsListStub extends JobListStub {
        constructor(opts = {}) {
            super(opts);
            const { runnerId, params = {}, ...rest } = opts;
            this.options = { ...rest, runnerId, params };
            this.params = {
                status: 'running',
                ...(runnerId != null ? { runner_id: runnerId } : {}),
                ...params
            };
        }
    }
    class JobLogListStub extends JobListStub {}
    class JobStub {
        constructor(data = {}) { this._data = data; }
    }

    global.JobModelsStub = {
        Job: JobStub,
        JobList: JobListStub,
        JobLogList: JobLogListStub,
        ActiveJobsList: ActiveJobsListStub,
        JobForms: {}
    };

    // Load primitives first
    loadModule('View');
    const StatusPanel = loadModule('StatusPanel');
    loadModule('KnownFieldsCard');
    loadModule('DetailView');
    loadModule('Modal');
    loadModule('MOJOUtils');

    // Stub TableView — same approach as JobDetailsView tests
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

    const RunnerDetailsView = loadModule('RunnerDetailsView');

    // ── Fixture model ─────────────────────────────────────────
    function makeRunnerModel(attrs = {}) {
        return new JobRunnerStub({
            runner_id: 'runner-7',
            alive: true,
            last_heartbeat: new Date(Date.now() - 10 * 1000).toISOString(),
            started: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            jobs_processed: 1000,
            jobs_failed: 4,
            channels: ['default', 'priority'],
            version: '1.2.3',
            ...attrs
        });
    }

    describe('RunnerDetailsView (Wave 3 C3)', () => {
        let view;
        let model;

        beforeEach(async () => {
            model = makeRunnerModel();
            view = new RunnerDetailsView({ model });
            await view.render(false);
            // Skip onAfterBuild's fetch chain — we only care about structure.
        });

        it('Overview status slot mounts a StatusPanel instance', () => {
            const overview = view.overviewSection;
            expect(overview).toBeTruthy();
            expect(overview.statusPanel).toBeInstanceOf(StatusPanel);

            const slot = overview.element.querySelector('[data-container="runner-status"]');
            expect(slot).toBeTruthy();

            const panelEl = overview.element.querySelector('.detail-status-panel');
            expect(panelEl).toBeTruthy();
        });

        it('StatusPanel tone is success for a healthy runner', () => {
            const panel = view.overviewSection.statusPanel;
            const el = panel.element;
            expect(el.classList.contains('tone-success')).toBe(true);
        });

        it('StatusPanel tone is danger when runner is down', async () => {
            const downModel = makeRunnerModel({ alive: false });
            const v2 = new RunnerDetailsView({ model: downModel });
            await v2.render(false);
            const el = v2.overviewSection.statusPanel.element;
            expect(el.classList.contains('tone-danger')).toBe(true);
        });

        it('StatusPanel tone is warning for stale heartbeat', async () => {
            const staleModel = makeRunnerModel({
                alive: true,
                last_heartbeat: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5m old
            });
            const v3 = new RunnerDetailsView({ model: staleModel });
            await v3.render(false);
            const el = v3.overviewSection.statusPanel.element;
            expect(el.classList.contains('tone-warning')).toBe(true);
        });

        it('Active Jobs and Job History and Logs are TableView instances', () => {
            expect(view.activeJobsSection).toBeInstanceOf(TableViewStub);
            expect(view.jobHistorySection).toBeInstanceOf(TableViewStub);
            expect(view.logsSection).toBeInstanceOf(TableViewStub);
        });

        it('Active Jobs TableView is wired to ActiveJobsList with the runner id', () => {
            const coll = view.activeJobsCollection;
            expect(coll).toBeInstanceOf(ActiveJobsListStub);
            expect(coll.params.runner_id).toBe('runner-7');
            expect(coll.params.status).toBe('running');
        });

        it('registers the expected 9 sections (7 keyed + 2 dividers)', () => {
            const cfg = view.sectionsConfig;
            expect(Array.isArray(cfg)).toBe(true);
            expect(cfg.length).toBe(9);

            const keys = cfg.filter(s => s.key).map(s => s.key);
            expect(keys).toEqual([
                'Overview', 'System', 'Channels', 'Active Jobs',
                'Job History', 'Logs', 'Actions'
            ]);

            const dividers = cfg.filter(s => s.type === 'divider').map(d => d.label);
            expect(dividers).toEqual(['History', 'Control']);
        });

        it('header auxFn renders a state-aware "Up X · failure" readout for a healthy runner', () => {
            const aux = view.headerView.element.querySelector('.dh-aux');
            expect(aux).toBeTruthy();
            expect(aux.textContent).toContain('Up');
            expect(aux.textContent).toContain('failure');
            expect(aux.textContent).toContain('heartbeat');
        });

        it('header auxFn surfaces "Down" when the runner is offline', async () => {
            const downModel = makeRunnerModel({ alive: false });
            const v = new RunnerDetailsView({ model: downModel });
            await v.render(false);
            const aux = v.headerView.element.querySelector('.dh-aux');
            expect(aux).toBeTruthy();
            expect(aux.textContent).toContain('Down');
        });

        it('keeps header `actions` empty (StatusPanel owns Ping / Drain / Shutdown)', () => {
            expect(view.headerView.actions).toEqual([]);
        });

        it('Channels section is constructed with the runner channels', () => {
            const ch = view.channelsSection;
            expect(ch).toBeTruthy();
            // Channels section is a deferred SideNav child — its onInit runs
            // when it becomes the active section. Verify the model + getter
            // structure is wired correctly so once activated it renders rows.
            expect(ch._channels).toEqual(['default', 'priority']);
            expect(ch.hasChannels).toBe(true);
        });

        it('System section is wired to a KnownFieldsCard for the raw sysinfo blob', () => {
            const sys = view.systemSection;
            expect(sys).toBeTruthy();
            // System section is also a deferred SideNav child — verify the
            // sysinfo / error / loading getters resolve from the model and
            // the section is ready to mount KnownFieldsCard on activation.
            expect(typeof sys.sysinfoFn).toBe('function');
            expect(typeof sys.errorFn).toBe('function');
            expect(typeof sys.loadingFn).toBe('function');
        });
    });
};
