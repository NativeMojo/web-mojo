module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');
    const { testHelpers } = require('../utils/test-helpers');

    await testHelpers.setup();
    const jest = global.jest;
    const restMock = { POST: jest.fn(), DELETE: jest.fn() };
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
    });
};
