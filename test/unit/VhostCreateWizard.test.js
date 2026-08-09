module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');
    const { testHelpers } = require('../utils/test-helpers');

    await testHelpers.setup();
    const jest = global.jest;
    const restMock = { GET: jest.fn(), POST: jest.fn(), DELETE: jest.fn() };

    // The wizard runs against the REAL Edge model layer (payload builders,
    // matrix, Vhost/VhostList/VhostRoute) with Rest mocked underneath.
    global.Rest = restMock;
    global.Collection = moduleLoader.loadModule('Collection');
    global.Model = moduleLoader.loadModule('Model');
    const Edge = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/models/Edge.js'),
        'EdgeModelsForWizard'
    );
    global.EdgeModelsStub = Edge;
    global.DnsModelsStub = { CertificateList: class { async fetch() { return { success: true }; } } };
    global.VhostFormStub = class {
        static async listDomainChoices() { return { ok: true, error: null, domains: [] }; }
        static async resolveDomain() { return null; }
    };
    const VhostCreateWizard = moduleLoader.loadModule('VhostCreateWizard');
    delete global.EdgeModelsStub;
    delete global.DnsModelsStub;
    delete global.VhostFormStub;
    delete global.Rest;
    delete global.Collection;
    delete global.Model;

    const okEnvelope = { success: true, status: 200, data: { status: true } };

    // The wizard's network edges are the Edge model classes it closed over at
    // load — mock at that seam (Model/Collection here are the loader-cached
    // ones bound to the real Rest singleton, so HTTP-level mocks can't reach).
    const originals = {
        vhostSave: Edge.Vhost.prototype.save,
        routeSave: Edge.VhostRoute.prototype.save,
        listFetch: Edge.VhostList.prototype.fetch
    };

    const makeWizard = () => {
        const wizard = new VhostCreateWizard({});
        wizard.render = () => {};                    // drive state, not DOM
        wizard.getApp = () => null;
        wizard.domain = { id: 7, get: key => (key === 'name' ? 'nativemojo.com' : null) };
        wizard.certificateId = 9;
        return wizard;
    };

    describe('VhostCreateWizard', () => {
        beforeEach(() => {
            restMock.GET.mockReset();
            restMock.POST.mockReset();
            restMock.DELETE.mockReset();
        });

        afterEach(() => {
            Edge.Vhost.prototype.save = originals.vhostSave;
            Edge.VhostRoute.prototype.save = originals.routeSave;
            Edge.VhostList.prototype.fetch = originals.listFetch;
        });

        it('starts at shape and only continues once a shape is picked', () => {
            const wizard = makeWizard();
            expect(wizard.step).toBe('shape');
            expect(wizard.kind).toBeNull();
            wizard.onActionContinueDetails();
            expect(wizard.step).toBe('shape');
            wizard.onActionPickShape(null, { dataset: { kind: 'site_api' } });
            expect(wizard.kind).toBe('site_api');
            wizard.onActionContinueDetails();
            expect(wizard.step).toBe('details');
        });

        it('derives the server name for apex, wildcard, and labelled hosts', () => {
            const wizard = makeWizard();
            wizard.label = '';
            expect(wizard.buildServerName()).toBe('nativemojo.com');
            wizard.label = '*';
            expect(wizard.buildServerName()).toBe('*.nativemojo.com');
            wizard.label = ' app ';
            expect(wizard.buildServerName()).toBe('app.nativemojo.com');
        });

        it('never collects quiet paths for site_api at create — only api sends them', () => {
            const wizard = makeWizard();
            wizard.kind = 'site_api';
            wizard.quietPathsText = '/api/healthz';
            expect(wizard.collectInput().quiet_paths).toEqual([]);
            wizard.kind = 'api';
            expect(wizard.collectInput().quiet_paths).toBe('/api/healthz');
        });

        it('validates the active shape with the real payload builder before review', () => {
            const wizard = makeWizard();
            wizard.kind = 'api';
            wizard.step = 'details';
            wizard.onActionGoReview();
            expect(wizard.step).toBe('details');
            expect(wizard.detailsError).toBe('An API host requires a declared upstream.');
            wizard.upstreamId = 8;
            wizard.runDuplicateCheck = async () => {};
            wizard.onActionGoReview();
            expect(wizard.step).toBe('review');
            expect(wizard.detailsError).toBeNull();
        });

        it('vets route drafts and refuses duplicates before they join the list', () => {
            const wizard = makeWizard();
            wizard.kind = 'site_api';
            wizard.upstreams = [{ id: 8, label: 'api-core (shared)' }];

            wizard.routeDraftPrefix = 'api';
            wizard.routeDraftUpstream = 8;
            wizard.onActionAddRoute();
            expect(wizard.routes).toHaveLength(0);
            expect(wizard.routeError).toContain("must start with '/'");

            wizard.routeDraftPrefix = '/';
            wizard.onActionAddRoute();
            expect(wizard.routeError).toContain("cannot be '/'");

            wizard.routeDraftPrefix = '/api';
            wizard.onActionAddRoute();
            expect(wizard.routes).toEqual([{ path_prefix: '/api', upstream: 8, upstreamLabel: 'api-core (shared)' }]);
            expect(wizard.routeDraftPrefix).toBe('');
            expect(wizard.routeDraftUpstream).toBeNull();

            wizard.routeDraftPrefix = '/api';
            wizard.routeDraftUpstream = 8;
            wizard.onActionAddRoute();
            expect(wizard.routes).toHaveLength(1);
            expect(wizard.routeError).toBe('That prefix is already declared.');
        });

        it('flags a duplicate enabled server name, including the apex label', async () => {
            const wizard = makeWizard();
            wizard.enabled = true;
            wizard.label = '';
            let fetches = 0;
            Edge.VhostList.prototype.fetch = async function() {
                fetches += 1;
                this.models = [
                    { get: key => ({ server_name: 'nativemojo.com' })[key] },
                    { get: key => ({ server_name: 'app.nativemojo.com' })[key] }
                ];
                this.errors = {};
                return okEnvelope;
            };
            await wizard.runDuplicateCheck();
            expect(wizard.duplicate).toBe('nativemojo.com');

            wizard.label = 'fresh';
            await wizard.runDuplicateCheck();
            expect(wizard.duplicate).toBeNull();

            wizard.enabled = false;
            wizard.label = '';
            fetches = 0;
            await wizard.runDuplicateCheck();
            expect(wizard.duplicate).toBeNull();
            expect(fetches).toBe(0);
        });

        it('creates the vhost first, then routes in row order, and reports done', async () => {
            const wizard = makeWizard();
            wizard.kind = 'site_api';
            wizard.spa = true;
            wizard.routes = [
                { path_prefix: '/api', upstream: 8, upstreamLabel: 'api-core' },
                { path_prefix: '/api/ws', upstream: 12, upstreamLabel: 'api-realtime' }
            ];
            wizard.collection = { fetch: jest.fn().mockResolvedValue({ success: true }) };
            const calls = [];
            Edge.Vhost.prototype.save = async function(payload) {
                calls.push(['vhost', payload]);
                this.id = 42;
                this.attributes = { ...this.attributes, id: 42, server_name: 'nativemojo.com' };
                this.errors = {};
                return okEnvelope;
            };
            Edge.VhostRoute.prototype.save = async function(payload) {
                calls.push(['route', payload]);
                this.errors = {};
                return okEnvelope;
            };

            await wizard.runCreate();

            expect(calls).toHaveLength(3);
            expect(calls[0][0]).toBe('vhost');
            expect(calls[0][1].kind).toBe('site_api');
            expect(calls[0][1].spa).toBe(true);
            expect(calls[0][1].quiet_paths).toEqual([]);
            expect(calls[1]).toEqual(['route', { vhost: 42, path_prefix: '/api', upstream: 8 }]);
            expect(calls[2]).toEqual(['route', { vhost: 42, path_prefix: '/api/ws', upstream: 12 }]);
            expect(wizard.collection.fetch).toHaveBeenCalledTimes(1);
            expect(wizard.step).toBe('done');
        });

        it('lands on partial when a route is refused, keeping the vhost and the rest', async () => {
            const wizard = makeWizard();
            wizard.kind = 'site_api';
            wizard.routes = [
                { path_prefix: '/api', upstream: 8, upstreamLabel: 'api-core' },
                { path_prefix: '/bad', upstream: 8, upstreamLabel: 'api-core' }
            ];
            Edge.Vhost.prototype.save = async function() {
                this.id = 42;
                this.attributes = { ...this.attributes, id: 42, server_name: 'nativemojo.com' };
                this.errors = {};
                return okEnvelope;
            };
            let routeSaves = 0;
            Edge.VhostRoute.prototype.save = async function() {
                routeSaves += 1;
                this.errors = {};
                if (routeSaves === 2) {
                    return {
                        success: true, status: 200,
                        data: { status: false, error: 'the upstream must be a shared one' }
                    };
                }
                return okEnvelope;
            };

            await wizard.runCreate();

            expect(wizard.step).toBe('partial');
            expect(wizard.result.routeResults[0].ok).toBe(true);
            expect(wizard.result.routeResults[1].ok).toBe(false);
            expect(wizard.result.routeResults[1].error).toBe('the upstream must be a shared one');
        });

        it('stays on review with the server error when the vhost itself is refused', async () => {
            const wizard = makeWizard();
            wizard.kind = 'site';
            wizard.step = 'review';
            Edge.Vhost.prototype.save = async function() {
                this.errors = {};
                return {
                    success: true, status: 200,
                    data: { status: false, error: 'a vhost requires a domain' }
                };
            };
            await wizard.runCreate();
            expect(wizard.step).toBe('review');
            expect(wizard.createError).toBe('a vhost requires a domain');
            expect(wizard.result).toBeNull();
        });
    });
};
