module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');
    const { testHelpers } = require('../utils/test-helpers');

    await testHelpers.setup();
    const jest = global.jest;
    const restMock = { GET: jest.fn(), POST: jest.fn(), DELETE: jest.fn() };
    global.Rest = restMock;
    global.Collection = moduleLoader.loadModule('Collection');
    global.Model = moduleLoader.loadModule('Model');
    const Edge = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/models/Edge.js'),
        'EdgeModels'
    );
    delete global.Rest;
    delete global.Collection;
    delete global.Model;

    describe('Edge model contracts', () => {
        beforeEach(() => {
            restMock.GET.mockReset();
            restMock.POST.mockReset();
            restMock.DELETE.mockReset();
        });

        it('exports the public model and option surface', () => {
            ['Vhost', 'VhostList', 'Upstream', 'UpstreamList',
                'VhostKindOptions', 'UpstreamKindOptions'].forEach(name => {
                expect(Edge[name]).toBeDefined();
            });
        });

        it('builds an allowlisted proxy VHost body', () => {
            const payload = Edge.buildVhostPayload({
                domain: { id: 7 }, label: 'www', kind: 'proxy', upstream: { id: 8 },
                certificate: { id: 9 }, pool: 'blue_pool', is_enabled: true,
                server_name: 'attacker.example', root_slug: '../../other', nginx: 'return 200;'
            }, { create: true });
            expect(payload).toEqual({
                domain: 7, label: 'www', kind: 'proxy', upstream: 8,
                certificate: 9, pool: 'blue_pool', is_enabled: true
            });
            expect(payload).not.toHaveProperty('server_name');
            expect(payload).not.toHaveProperty('root_slug');
            expect(payload).not.toHaveProperty('nginx');
        });

        it('omits domain on update and nulls a stale non-proxy upstream', () => {
            const payload = Edge.buildVhostPayload({
                domain: 99, label: '', kind: 'spa', upstream: 8,
                certificate: 9, pool: '', is_enabled: false
            });
            expect(payload).not.toHaveProperty('domain');
            expect(payload.upstream).toBeNull();
            expect(payload.pool).toBe('default');
        });

        it('requires a declared upstream for proxy', () => {
            expect(() => Edge.buildVhostPayload({
                kind: 'proxy', certificate: 9, pool: 'default'
            })).toThrow('requires a declared upstream');
        });

        it('enforces the pool 1–32 bound and rejects final newlines', () => {
            expect(Edge.isValidVhostPool('a')).toBe(true);
            expect(Edge.isValidVhostPool('a'.repeat(32))).toBe(true);
            expect(Edge.isValidVhostPool('')).toBe(false);
            expect(Edge.isValidVhostPool('a'.repeat(33))).toBe(false);
            expect(Edge.isValidVhostPool('default\n')).toBe(false);
            expect(Edge.isValidVhostPool('default\r\n')).toBe(false);
        });

        it('builds HTTP declare without socket_path and coerces integer port', () => {
            expect(Edge.buildUpstreamDeclarePayload({
                group: 4, name: 'api', kind: 'http', host: '127.0.0.1',
                port: '8000', socket_path: '/stale.sock'
            })).toEqual({
                group: 4, name: 'api', kind: 'http', host: '127.0.0.1', port: 8000
            });
        });

        it('builds Unix declare without host or port and omits null group', () => {
            const payload = Edge.buildUpstreamDeclarePayload({
                group: null, name: 'api_socket', kind: 'unix',
                host: 'stale', port: 80, socket_path: '/run/mojo/api.sock'
            });
            expect(payload).toEqual({
                name: 'api_socket', kind: 'unix', socket_path: '/run/mojo/api.sock'
            });
            expect(payload).not.toHaveProperty('group');
            expect(payload).not.toHaveProperty('host');
            expect(payload).not.toHaveProperty('port');
        });

        it('classifies transport, envelope, and model-error failures', () => {
            expect(Edge.classifyActionResponse({ success: false }).ok).toBe(false);
            expect(Edge.classifyActionResponse({
                success: true, data: { status: false, error: 'refused' }
            }).ok).toBe(false);
            expect(Edge.classifyActionResponse({ success: true, data: { status: true } }, {
                errors: { field: 'bad' }
            }).ok).toBe(false);
            expect(Edge.classifyActionResponse({
                success: true, data: { status: true, data: {} }
            }).ok).toBe(true);
        });

        it('uses only the named declare and retire endpoints', async () => {
            restMock.POST.mockResolvedValue({ success: true, data: { status: true } });
            await Edge.Upstream.declare({ name: 'api', kind: 'http', host: 'localhost', port: 80 });
            const upstream = new Edge.Upstream({ id: 5 });
            await upstream.retire();
            expect(restMock.POST.mock.calls[0]).toEqual([
                '/api/edge/upstream/declare',
                { name: 'api', kind: 'http', host: 'localhost', port: 80 }
            ]);
            expect(restMock.POST.mock.calls[1]).toEqual([
                '/api/edge/upstream/retire', { upstream: 5 }
            ]);
        });

        it('exports safe WebApp and immutable release contracts', () => {
            ['WebApp', 'WebAppList', 'WebAppRelease', 'WebAppReleaseList']
                .forEach(name => expect(Edge[name]).toBeDefined());
            const projected = Edge.projectWebAppRelease({
                id: 4, version: 'abc1234', status: 'uploaded', file_count: 3,
                manifest: [{ path: 'index.html' }], uploads: ['secret-url']
            });
            expect(projected).toEqual({
                id: 4, version: 'abc1234', status: 'uploaded', created: null,
                modified: null, file_count: 3, created_by: null
            });
            expect(projected).not.toHaveProperty('manifest');
            expect(projected).not.toHaveProperty('uploads');
            const release = new Edge.WebAppRelease({ id: 4 });
            release.set({ id: 4, version: 'safe', status: 'live', manifest: ['hidden'] });
            expect(release.get('manifest')).toBeUndefined();
            expect(() => release.save()).toThrow('immutable');
            expect(() => release.destroy()).toThrow('immutable');
            expect(new Edge.WebAppReleaseList().params.id).toBe('__no_webapp__');
            expect(new Edge.WebAppReleaseList({ webapp: 3 }).params.webapp).toBe(3);
        });

        it('uses distinct create/update allowlists and nulls a blank VHost', () => {
            const create = Edge.buildWebAppPayload({
                group: { id: 8 }, slug: ' portal ', bucket: 'releases', vhost: '',
                auto_promote: true, prefix: '../../escape', api_key: 'secret', current_release: 99
            }, { create: true, allowedBuckets: ['releases'] });
            expect(create).toEqual({ group: 8, slug: 'portal', bucket: 'releases', vhost: null, auto_promote: true });
            expect(create).not.toHaveProperty('prefix');
            const update = Edge.buildWebAppPayload({
                group: 9, slug: 'portal-2', bucket: 'other', vhost: '', auto_promote: false
            });
            expect(update).toEqual({ slug: 'portal-2', vhost: null, auto_promote: false });
            expect(update).not.toHaveProperty('group');
            expect(update).not.toHaveProperty('bucket');
            expect(() => Edge.buildWebAppPayload({ group: 8, slug: 'x', bucket: 'other' }, {
                create: true, allowedBuckets: ['releases']
            })).toThrow('allowed');
        });

        it('maps only uploaded and superseded releases to actions', () => {
            expect(Edge.releaseActionFor('pending')).toBeNull();
            expect(Edge.releaseActionFor('uploaded')).toBe('promote');
            expect(Edge.releaseActionFor('live')).toBeNull();
            expect(Edge.releaseActionFor('superseded')).toBe('rollback');
        });

        it('requires manage_webapp AND instance write authority', () => {
            const user = grants => ({ hasPermission: name => grants.includes(name) });
            expect(Edge.canManageWebApp(user([]))).toBe(false);
            expect(Edge.canManageWebApp(user(['manage_webapp']))).toBe(false);
            expect(Edge.canManageWebApp(user(['manage_dns']))).toBe(false);
            expect(Edge.canManageWebApp(user(['security']))).toBe(false);
            expect(Edge.canManageWebApp(user(['manage_webapp', 'manage_dns']))).toBe(true);
            expect(Edge.canManageWebApp(user(['manage_webapp', 'security']))).toBe(true);
        });

        it('posts link/promote once while in flight and reconciles in finally', async () => {
            let resolveAction;
            restMock.POST.mockReturnValue(new Promise(resolve => { resolveAction = resolve; }));
            restMock.GET.mockResolvedValue({ success: true, data: { status: true, data: { id: 3 } } });
            const site = new Edge.WebApp({ id: 3, slug: 'portal' });
            const first = site.linkKey();
            const second = site.linkKey();
            expect(first).toBe(second);
            expect(restMock.POST).toHaveBeenCalledTimes(1);
            resolveAction({ success: true, data: { status: true, data: { token: 'once' } } });
            await first;
            expect(restMock.GET).toHaveBeenCalled();
        });
    });
};
