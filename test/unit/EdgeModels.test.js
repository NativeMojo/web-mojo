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
            ['Vhost', 'VhostList', 'VhostRoute', 'VhostRouteList',
                'BlocklistEntry', 'BlocklistEntryList', 'Upstream', 'UpstreamList',
                'VhostKindOptions', 'VHOST_KIND_MATRIX', 'BODY_SIZE_BOUNDS',
                'BlocklistKindOptions', 'BlocklistModeOptions', 'UpstreamKindOptions'].forEach(name => {
                expect(Edge[name]).toBeDefined();
            });
            expect(Edge.VhostKindOptions.map(option => option.value))
                .toEqual(['api', 'site', 'site_api', 'redirect']);
        });

        it('builds an allowlisted api VHost body and requires its upstream', () => {
            const payload = Edge.buildVhostPayload({
                domain: { id: 7 }, label: 'www', kind: 'api', upstream: { id: 8 },
                certificate: { id: 9 }, pool: 'blue_pool', is_enabled: true,
                serve_static: true, quiet_paths: '/healthz\n/metrics',
                server_name: 'attacker.example', root_slug: '../../other', nginx: 'return 200;'
            }, { create: true });
            expect(payload).toEqual({
                domain: 7, label: 'www', kind: 'api', upstream: 8,
                certificate: 9, pool: 'blue_pool', is_enabled: true,
                spa: false, serve_static: true, quiet_paths: ['/healthz', '/metrics'],
                body_size_mb: 50, redirect_to: null
            });
            expect(payload).not.toHaveProperty('server_name');
            expect(payload).not.toHaveProperty('root_slug');
            expect(payload).not.toHaveProperty('nginx');
            expect(payload).not.toHaveProperty('claims_reserved');
            expect(() => Edge.buildVhostPayload({
                kind: 'api', certificate: 9, pool: 'default'
            })).toThrow('An API host requires a declared upstream.');
        });

        it('defaults to site, omits domain on update, and neutralizes off-matrix knobs', () => {
            const payload = Edge.buildVhostPayload({
                domain: 99, label: '', upstream: 8, redirect_to: 'old.example',
                spa: true, serve_static: true, quiet_paths: ['/stale'],
                certificate: 9, pool: '', is_enabled: false
            });
            expect(payload.kind).toBe('site');
            expect(payload).not.toHaveProperty('domain');
            expect(payload.upstream).toBeNull();
            expect(payload.redirect_to).toBeNull();
            expect(payload.spa).toBe(true);
            expect(payload.serve_static).toBe(false);
            expect(payload.quiet_paths).toEqual([]);
            expect(payload.pool).toBe('default');
        });

        it('carries the full site_api knob set', () => {
            const payload = Edge.buildVhostPayload({
                kind: 'site_api', certificate: 9, spa: true, serve_static: true,
                quiet_paths: '/api/healthz', body_size_mb: '200'
            });
            expect(payload.spa).toBe(true);
            expect(payload.serve_static).toBe(true);
            expect(payload.quiet_paths).toEqual(['/api/healthz']);
            expect(payload.body_size_mb).toBe(200);
            expect(payload.upstream).toBeNull();
        });

        it('requires and validates the redirect target as a bare host', () => {
            const payload = Edge.buildVhostPayload({
                kind: 'redirect', certificate: 9, redirect_to: ' NativeMojo.com '
            });
            expect(payload.redirect_to).toBe('nativemojo.com');
            expect(() => Edge.buildVhostPayload({ kind: 'redirect', certificate: 9 }))
                .toThrow('A redirect VHost requires a target host.');
            ['https://x.com', 'x.com/path', 'x.com:8443', 'a b.com'].forEach(bad => {
                expect(() => Edge.validateRedirectTarget(bad))
                    .toThrow('Target must be a bare host — drop the scheme, path, or port.');
            });
            expect(() => Edge.validateRedirectTarget('*.example.com'))
                .toThrow('A redirect target cannot be a wildcard.');
            expect(() => Edge.validateRedirectTarget('-bad-.example'))
                .toThrow('Enter a valid hostname, like example.com.');
        });

        it('mirrors the body_size_mb bounds and defaults', () => {
            const build = value => Edge.buildVhostPayload({
                kind: 'site_api', certificate: 9, body_size_mb: value
            });
            expect(build(undefined).body_size_mb).toBe(50);
            expect(build('').body_size_mb).toBe(50);
            expect(build(1).body_size_mb).toBe(1);
            expect(build(4096).body_size_mb).toBe(4096);
            [0, 4097, 12.5, 'ten'].forEach(bad => {
                expect(() => build(bad)).toThrow('Upload cap must be a whole number from 1 to 4096 MB.');
            });
        });

        it('parses quiet paths from textarea text and refuses unsafe ones', () => {
            expect(Edge.parseQuietPaths(' /healthz \n\n/metrics\n')).toEqual(['/healthz', '/metrics']);
            expect(Edge.parseQuietPaths(['/ok'])).toEqual(['/ok']);
            const charsetError = "A quiet path must start with '/' and use only letters, "
                + "digits, '.', '_', '-' and '/' (max 128 characters).";
            expect(() => Edge.parseQuietPaths('healthz')).toThrow(charsetError);
            expect(() => Edge.parseQuietPaths('/a b')).toThrow(charsetError);
            expect(() => Edge.parseQuietPaths('/a//b')).toThrow("A quiet path may not contain '//'.");
            expect(() => Edge.parseQuietPaths('/a/../b')).toThrow("A quiet path may not contain a '..' segment.");
            expect(() => Edge.parseQuietPaths('/a\n/a')).toThrow('Quiet paths contain a duplicate.');
            expect(Edge.formatQuietPaths(['/a', '/b'])).toBe('/a\n/b');
        });

        it('builds route bodies and refuses a bare / prefix', () => {
            expect(Edge.buildRoutePayload({
                vhost: { id: 3 }, path_prefix: ' /api ', upstream: { id: 8 }
            })).toEqual({ vhost: 3, path_prefix: '/api', upstream: 8 });
            expect(() => Edge.buildRoutePayload({ vhost: 3, path_prefix: '/', upstream: 8 }))
                .toThrow("A route prefix cannot be '/' — use the API host shape for a whole-host proxy.");
            expect(() => Edge.buildRoutePayload({ vhost: 3, path_prefix: '/api' }))
                .toThrow('Choose an upstream for this route.');
            expect(() => Edge.buildRoutePayload({ path_prefix: '/api', upstream: 8 }))
                .toThrow('A route requires a VHost.');
        });

        it('builds blocklist bodies log-first and mirrors the ua charset', () => {
            expect(Edge.buildBlocklistPayload({ value: ' 10.1.2.3/8 ' }))
                .toEqual({ kind: 'ip', value: '10.1.2.3/8', mode: 'log', note: '' });
            expect(Edge.buildBlocklistPayload({
                kind: 'ua', value: '(curl|wget)/', mode: 'enforce', note: ' cli probes '
            })).toEqual({ kind: 'ua', value: '(curl|wget)/', mode: 'enforce', note: 'cli probes' });
            expect(Edge.buildBlocklistPayload({ kind: 'ua', value: 'a\\\\' }).value).toBe('a\\\\');
            const uaCharsetError = 'A user-agent pattern may use letters, digits and the '
                + 'regex characters ()[]|?^.*+-/_\\ only (max 256 characters — no spaces, '
                + 'quotes, or braces).';
            ['bad value', 'quote"', 'brace{', 'dollar$'].forEach(bad => {
                expect(() => Edge.buildBlocklistPayload({ kind: 'ua', value: bad }))
                    .toThrow(uaCharsetError);
            });
            expect(() => Edge.buildBlocklistPayload({ kind: 'ua', value: 'a\\' }))
                .toThrow('A user-agent pattern cannot end with an unescaped backslash.');
            expect(() => Edge.buildBlocklistPayload({ kind: 'ip', value: '' }))
                .toThrow('Enter a value for the rule.');
            expect(() => Edge.buildBlocklistPayload({ value: 'x', mode: 'block' }))
                .toThrow('Choose a valid rule mode.');
        });

        it('posts claim_reserved with the exact endpoint and release flag', async () => {
            restMock.POST.mockResolvedValue({ success: true, data: { status: true } });
            const vhost = new Edge.Vhost({ id: 5 });
            await vhost.claimReserved();
            await vhost.claimReserved(true);
            expect(restMock.POST.mock.calls[0]).toEqual([
                '/api/edge/vhost/claim_reserved', { vhost: 5 }
            ]);
            expect(restMock.POST.mock.calls[1]).toEqual([
                '/api/edge/vhost/claim_reserved', { vhost: 5, release: true }
            ]);
            const unsaved = new Edge.Vhost();
            const refused = await unsaved.claimReserved();
            expect(refused.success).toBe(false);
            expect(restMock.POST).toHaveBeenCalledTimes(2);
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
            expect(() => release.save()).toThrow('WebApp releases are immutable.');
            expect(() => release.destroy()).toThrow('WebApp releases are immutable.');
            expect(new Edge.WebAppReleaseList().params.id).toBe('__no_webapp__');
            expect(new Edge.WebAppReleaseList({ webapp: 3 }).params.webapp).toBe(3);
        });

        it('uses distinct create/update allowlists and nulls a blank VHost', () => {
            const create = Edge.buildWebAppPayload({
                group: { id: 8 }, slug: ' portal ', bucket: ' releases ', vhost: '',
                auto_promote: true, prefix: '../../escape', api_key: 'secret', current_release: 99
            }, { create: true });
            expect(create).toEqual({ group: 8, slug: 'portal', bucket: 'releases', vhost: null, auto_promote: true });
            expect(create).not.toHaveProperty('prefix');
            const update = Edge.buildWebAppPayload({
                group: 9, slug: 'portal-2', bucket: 'other', vhost: '', auto_promote: false
            });
            expect(update).toEqual({ slug: 'portal-2', vhost: null, auto_promote: false });
            expect(update).not.toHaveProperty('group');
            expect(update).not.toHaveProperty('bucket');
            expect(() => Edge.buildWebAppPayload({ group: 8, slug: 'x', bucket: ' ' }, {
                create: true
            })).toThrow('Enter a release bucket.');
            expect(() => Edge.buildWebAppPayload({ group: 8, slug: 'x', bucket: `ok\nnot-ok` }, {
                create: true
            })).toThrow('Release bucket cannot contain control characters.');
            expect(() => Edge.buildWebAppPayload({ group: 8, slug: 'x', bucket: 'x'.repeat(256) }, {
                create: true
            })).toThrow('Release bucket must be 255 characters or fewer.');
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
            const site = new Edge.WebApp({ id: 3, slug: 'portal' });
            const siteFetch = jest.spyOn(site, 'fetch').mockResolvedValue({ success: true });
            const releases = { fetch: jest.fn().mockResolvedValue({ success: true }) };

            let resolveLink;
            restMock.POST.mockReturnValue(new Promise(resolve => { resolveLink = resolve; }));
            const firstLink = site.linkKey(releases);
            const secondLink = site.linkKey(releases);
            expect(firstLink).toBe(secondLink);
            expect(restMock.POST).toHaveBeenCalledTimes(1);
            expect(restMock.POST).toHaveBeenCalledWith('/api/edge/webapp/link_key', { webapp: 3 });
            resolveLink({ success: true, data: { status: true, data: { token: 'once' } } });
            await firstLink;
            expect(siteFetch).toHaveBeenCalledTimes(1);
            expect(releases.fetch).toHaveBeenCalledTimes(1);

            restMock.POST.mockReset();
            let resolvePromote;
            restMock.POST.mockReturnValue(new Promise(resolve => { resolvePromote = resolve; }));
            const firstPromote = site.promote({ id: 7 }, releases);
            const secondPromote = site.promote({ id: 7 }, releases);
            expect(firstPromote).toBe(secondPromote);
            expect(restMock.POST).toHaveBeenCalledTimes(1);
            expect(restMock.POST).toHaveBeenCalledWith('/api/edge/webapp/promote', {
                webapp: 3, release: 7
            });
            resolvePromote({ success: true, data: { status: true } });
            await firstPromote;
            expect(siteFetch).toHaveBeenCalledTimes(2);
            expect(releases.fetch).toHaveBeenCalledTimes(2);
        });
    });
};
