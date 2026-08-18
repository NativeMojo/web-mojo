/**
 * GroupAuthConfigWorkspace — URL closure, conservative representation probe,
 * inert frame, scaling, generation, and cleanup. Fetch is always mocked.
 */
const path = require('path');
const { SimpleModuleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    await testHelpers.setup();
    const jest = global.jest;

    const originalFetch = global.fetch;
    let fetchImpl;
    global.fetch = (...args) => fetchImpl(...args);
    const loader = new SimpleModuleLoader();
    loader.loadModule('View');
    const Workspace = loader.loadModuleFromFile(
        path.resolve(__dirname, '../../src/extensions/admin/account/groups/GroupAuthConfigWorkspace.js'),
        'GroupAuthConfigWorkspace'
    );

    const AUTH_HTML = '<!doctype html><div class="mat-page"><div class="mat-card"><div id="view-signin"></div></div></div>';
    const REGISTER_HTML = '<!doctype html><div class="mat-page"><div class="mat-card"><div id="view-register"></div></div></div>';
    const PASSKEY_HTML = '<!doctype html><div class="mat-page"><div class="mat-card"><div id="view-passkey"></div></div></div>';

    function headers(values = {}) {
        const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
        return { get: name => normalized[String(name).toLowerCase()] || null };
    }

    function response(url, body = AUTH_HTML, options = {}) {
        return {
            status: options.status ?? 200,
            redirected: !!options.redirected,
            type: options.type || 'basic',
            url: options.url ?? url,
            headers: headers({ 'content-type': 'text/html; charset=utf-8', ...(options.headers || {}) }),
            text: jest.fn().mockResolvedValue(body)
        };
    }

    function app(config = {}, baseURL = '') {
        return { config, rest: { config: { baseURL } }, showPage() {} };
    }

    function model(uuid = '7d179fa7-bb25-45e3-9e45-4f8683cfd79d') {
        return {
            attributes: { id: 12, uuid },
            on() {}, off() {},
            get(name) { return this.attributes[name]; }
        };
    }

    function workspace(config = {}, baseURL = '', uuid) {
        const view = new Workspace({ app: app(config, baseURL), model: model(uuid) });
        view.element.innerHTML = view.template;
        return view;
    }

    beforeEach(() => {
        fetchImpl = jest.fn();
        global.fetch = (...args) => fetchImpl(...args);
    });

    afterEach(() => {
        delete global.ResizeObserver;
        global.fetch = originalFetch;
    });

    describe('origin, path, UUID, and closed query construction', () => {
        it('uses hosted origin, then REST origin, then window origin with exact validation', () => {
            expect(workspace({ hosted_auth_origin: 'https://auth.example.test' })._resolveOrigin()).toEqual({
                ok: true, origin: 'https://auth.example.test', source: 'hosted_auth_origin'
            });
            expect(workspace({}, 'https://api.example.test/v1')._resolveOrigin().origin).toBe('https://api.example.test');
            expect(workspace()._resolveOrigin().origin).toBe(window.location.origin);
            for (const value of [
                '//evil.test', 'javascript:alert(1)', 'https://user:pass@auth.test',
                'https://auth.test/path', 'https://auth.test/?x=1', 'not a url'
            ]) {
                expect(workspace({ hosted_auth_origin: value })._resolveOrigin().name).toBe('invalid-origin');
            }
        });

        it('accepts only root-relative query/hash-free dot-safe hosted paths', () => {
            const valid = workspace({ hosted_auth_paths: { login: '/access', registration: '/join', passkey: '/secure/passkey' } });
            expect(valid._resolvePaths().paths).toEqual({ login: '/access', registration: '/join', passkey: '/secure/passkey' });
            for (const value of ['auth', '//evil.test/x', '/a?x=1', '/a#x', '/a/../b', '/a/%2e%2e/b', '/a\\b']) {
                const view = workspace({ hosted_auth_paths: { login: value } });
                expect(view._resolvePaths().name).toBe('invalid-path');
            }
        });

        it('builds every URL with only group_uuid and canonical enum overrides', () => {
            const view = workspace({ hosted_auth_paths: { login: '/access' } });
            view.layoutOverride = 'editorial';
            view.appearanceOverride = 'dark';
            const target = view._buildPreviewTarget();
            const url = new URL(target.url);
            expect(url.pathname).toBe('/access');
            expect([...url.searchParams.keys()]).toEqual(['group_uuid', 'auth_theme', 'auth_appearance']);
            expect(url.searchParams.get('group_uuid')).toBe(model().attributes.uuid);
            expect(url.searchParams.get('auth_theme')).toBe('editorial');
            expect(url.searchParams.get('auth_appearance')).toBe('dark');
        });

        it('falls back for a missing UUID and maps only changed known layout/appearance enums', () => {
            const missing = workspace({}, '', '');
            expect(missing._buildPreviewTarget().name).toBe('missing-uuid');

            const view = workspace();
            view._onConfigChanged({
                dirty: true,
                formData: { layout: 'card', appearance: 'neon', app_title: 'Draft' },
                diff: { theme: { layout: 'card', appearance: 'neon', app_title: 'Draft' } }
            });
            expect(view.layoutOverride).toBe('compact');
            expect(view.appearanceOverride).toBe('');
            const url = new URL(view._buildPreviewTarget().url);
            expect(url.searchParams.get('auth_theme')).toBe('compact');
            expect(url.searchParams.has('auth_appearance')).toBe(false);
            expect(url.searchParams.has('app_title')).toBe(false);
        });
    });

    describe('representation and framing refusal', () => {
        it('detects bouncer challenge, decoy, and wrong hosted-page sentinels', () => {
            const view = workspace();
            expect(view._validateHostedMarkup('<div id="mbg-root">Verifying your connection</div>', 'login').name).toBe('challenge');
            expect(view._validateHostedMarkup('<div class="ma-page"><form id="decoy-form"></form></div>', 'login').name).toBe('decoy');
            expect(view._validateHostedMarkup(REGISTER_HTML, 'login').name).toBe('unexpected-page');
            expect(view._validateHostedMarkup(AUTH_HTML, 'login')).toBeNull();
            expect(view._validateHostedMarkup(REGISTER_HTML, 'registration')).toBeNull();
            expect(view._validateHostedMarkup(PASSKEY_HTML, 'passkey')).toBeNull();
        });

        it('rejects redirects, status, content type, framing headers, and ambiguous enforcing CSP', async () => {
            const view = workspace();
            const url = view._buildPreviewTarget().url;
            const cases = [
                [response(url, AUTH_HTML, { redirected: true }), 'redirect'],
                [response(url, AUTH_HTML, { type: 'opaqueredirect', status: 0 }), 'redirect'],
                [response(url, AUTH_HTML, { url: `${url}&extra=1` }), 'redirect'],
                [response(url, AUTH_HTML, { status: 403 }), 'http-status'],
                [response(url, AUTH_HTML, { headers: { 'content-type': 'application/json' } }), 'content-type'],
                [response(url, AUTH_HTML, { headers: { 'content-security-policy': "default-src 'self'; frame-ancestors 'none'" } }), 'csp-frame-ancestors'],
                [response(url, AUTH_HTML, { headers: { 'content-security-policy': "default-src 'self', img-src 'self'" } }), 'csp-ambiguous'],
                [response(url, AUTH_HTML, { headers: { 'x-frame-options': 'DENY' } }), 'x-frame-options']
            ];
            for (const [candidate, name] of cases) {
                expect((await view._validateProbeResponse(candidate, url)).name).toBe(name);
            }
            const reportOnly = response(url, AUTH_HTML, { headers: {
                'content-security-policy-report-only': "frame-ancestors 'none'"
            } });
            expect(await view._validateProbeResponse(reportOnly, url)).toBeNull();
        });

        it('refuses disabled saved registration before fetch and cross-origin inline preview', async () => {
            const disabled = workspace();
            disabled.registrationEnabled = false;
            disabled._syncControls();
            const registrationButton = disabled.element.querySelector('[data-page="registration"]');
            expect(registrationButton.disabled).toBe(false);
            await disabled.onActionPreviewPage(null, registrationButton);
            expect(disabled.fallback.name).toBe('registration-disabled');
            expect(fetchImpl).not.toHaveBeenCalled();
            expect(disabled.element.querySelector('.gacw-external').href).toBe(disabled.url);

            const external = workspace({ hosted_auth_origin: 'https://auth.example.test' });
            await external._refreshPreview(true);
            expect(external.fallback.name).toBe('cross-origin');
            expect(fetchImpl).not.toHaveBeenCalled();
            expect(external.element.querySelector('.gacw-external').href).toBe(external.url);
        });

        it('uses a no-auth same-origin fetch contract and names network and timeout failures', async () => {
            const view = workspace();
            const url = view._buildPreviewTarget().url;
            fetchImpl.mockRejectedValueOnce(new Error('offline'));
            await view._probe(url, view._beginGeneration());
            expect(view.fallback.name).toBe('network');
            const options = fetchImpl.mock.calls[0][1];
            expect(options.credentials).toBe('same-origin');
            expect(options.cache).toBe('no-store');
            expect(options.redirect).toBe('manual');
            expect(options.headers).toBeUndefined();

            view.probeTimeout = 1;
            fetchImpl.mockImplementationOnce((_request, requestOptions) => new Promise((resolve, reject) => {
                requestOptions.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
            }));
            await view._probe(url, view._beginGeneration());
            expect(view.fallback.name).toBe('timeout');
        });
    });

    describe('inert frame, controls, scaling, generations, and cleanup', () => {
        it('mounts an empty-sandbox, no-referrer, untabbable pointer-inert frame only after success', async () => {
            const view = workspace();
            const url = view._buildPreviewTarget().url;
            fetchImpl.mockResolvedValue(response(url));
            await view._probe(url, view._beginGeneration());
            const frame = view.element.querySelector('iframe');
            expect(frame.getAttribute('sandbox')).toBe('');
            expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
            expect(frame.getAttribute('tabindex')).toBe('-1');
            expect(frame.style.pointerEvents).toBe('none');
            expect(frame.src).toBe(url);
            expect(view.element.querySelector('.gacw-shield')).toBeTruthy();
        });

        it('tracks page/viewport buttons and retains fixed dimensions while scaling from top-left', () => {
            const view = workspace();
            const url = view._buildPreviewTarget().url;
            view._mountFrame(url, view._beginGeneration());
            const stage = view.element.querySelector('.gacw-stage');
            Object.defineProperty(stage, 'clientWidth', { configurable: true, value: 420 });
            Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 500 });
            view.viewport = 'phone';
            view._syncControls();
            view._applyScale();
            const frame = view.element.querySelector('iframe');
            expect(frame.width).toBe('390');
            expect(frame.height).toBe('844');
            expect(frame.style.transform).toContain('scale(');
            expect(frame.style.transformOrigin).toBe('top left');
            expect(view.previewScale).toBeGreaterThanOrEqual(0.3);
            expect(view.element.querySelector('[data-viewport="phone"]').classList.contains('active')).toBe(true);
        });

        it('keeps the external action equal to the exact current URL with safe new-tab attributes', () => {
            const view = workspace();
            view.url = view._buildPreviewTarget().url;
            view._syncExternalLink();
            const link = view.element.querySelector('.gacw-external');
            expect(link.href).toBe(view.url);
            expect(link.target).toBe('_blank');
            expect(link.rel).toContain('noopener');
            expect(link.rel).toContain('noreferrer');
        });

        it('suppresses stale probes and reloads only after the latest page/save generation', async () => {
            const view = workspace();
            const first = {};
            first.promise = new Promise(resolve => { first.resolve = resolve; });
            fetchImpl.mockImplementationOnce(() => first.promise);
            const oldUrl = view._buildPreviewTarget().url;
            const oldProbe = view._probe(oldUrl, view._beginGeneration());
            view.page = 'passkey';
            const newUrl = view._buildPreviewTarget().url;
            fetchImpl.mockResolvedValueOnce(response(newUrl, PASSKEY_HTML));
            await view._probe(newUrl, view._beginGeneration());
            first.resolve(response(oldUrl));
            await oldProbe;
            expect(view._frame.src).toBe(newUrl);

            view.mounted = true;
            view._refreshPreview = jest.fn().mockResolvedValue();
            view._onConfigSaved({
                resolvedConfig: { theme: { layout: 'minimal', appearance: 'system' }, registration: { enabled: true } },
                registrationEnabled: true
            });
            expect(view._refreshPreview).toHaveBeenCalledWith(true);
            expect(view.dirty).toBe(false);
        });

        it('disconnects observers, aborts probes, removes listeners, and invalidates late work on destroy', async () => {
            const view = workspace();
            const disconnect = jest.fn();
            view._resizeObserver = { disconnect };
            view.abortController = new AbortController();
            const signal = view.abortController.signal;
            view.editor = { off: jest.fn() };
            await view.destroy();
            expect(signal.aborted).toBe(true);
            expect(disconnect).toHaveBeenCalledTimes(1);
            expect(view.editor.off).toHaveBeenCalledTimes(3);
            expect(view._destroyed).toBe(true);
        });
    });
};
