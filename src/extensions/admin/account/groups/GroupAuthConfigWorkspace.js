/**
 * GroupAuthConfigWorkspace - private GroupView auth editor + hosted-page
 * visual comparison surface.
 *
 * The preview is deliberately noninteractive. It probes only a same-origin,
 * exact server-rendered representation, then loads that URL into an empty
 * sandbox. Hosted auth remains an external page integration; any uncertainty
 * becomes a named fallback with the exact external URL.
 */
import View from '@core/View.js';
import GroupAuthConfigSection from './GroupAuthConfigSection.js';

const PAGE_PATHS = {
    login: '/auth',
    registration: '/register',
    passkey: '/passkey'
};
const VIEWPORTS = {
    desktop: { width: 1280, height: 800, label: 'Desktop · 1280 × 800' },
    phone: { width: 390, height: 844, label: 'Phone · 390 × 844' }
};
const LAYOUTS = new Map([
    ['minimal', 'minimal'],
    ['compact', 'compact'],
    ['branded-panel', 'branded-panel'],
    ['editorial', 'editorial'],
    ['card', 'compact'],
    ['fullscreen', 'branded-panel']
]);
const APPEARANCES = new Set(['light', 'dark', 'system']);
const PROBE_TIMEOUT_MS = 5000;

function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function ownPath(obj, path) {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (!current || typeof current !== 'object'
            || !Object.prototype.hasOwnProperty.call(current, key)) return false;
        current = current[key];
    }
    return true;
}

function header(response, name) {
    return String(response?.headers?.get?.(name) || '').trim();
}

class GroupAuthConfigWorkspace extends View {
    constructor(options = {}) {
        super({
            className: 'group-auth-config-workspace',
            template: `
                <style>
                    .gacw-shell { height: min(78vh, 860px); min-height: 620px; overflow: hidden; }
                    .gacw-grid { display: grid; grid-template-columns: minmax(430px, 0.9fr) minmax(480px, 1.1fr); height: 100%; }
                    .gacw-editor { min-width: 0; overflow-y: auto; padding: 1.25rem; border-right: 1px solid var(--bs-border-color); }
                    .gacw-preview-column { min-width: 0; height: 100%; overflow-y: auto; padding: 1rem; background: var(--bs-tertiary-bg); }
                    .gacw-preview-panel { position: sticky; top: 0; }
                    .gacw-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
                    .gacw-stage { position: relative; min-height: 360px; height: calc(min(78vh, 860px) - 162px); overflow: auto; border: 1px solid var(--bs-border-color); border-radius: .5rem; background: var(--bs-body-bg); }
                    .gacw-canvas { position: relative; transform-origin: top left; }
                    .gacw-frame { position: absolute; inset: 0 auto auto 0; border: 0; transform-origin: top left; pointer-events: none; background: var(--bs-body-bg); }
                    .gacw-shield { position: absolute; inset: 0; z-index: 2; pointer-events: none; border: 1px solid var(--bs-border-color-translucent); }
                    .gacw-shield-label { position: sticky; top: .5rem; display: inline-block; margin: .5rem; padding: .2rem .45rem; border-radius: .25rem; background: var(--bs-body-bg); color: var(--bs-secondary-color); font-size: .72rem; box-shadow: 0 0 0 1px var(--bs-border-color-translucent); }
                    .gacw-fallback { min-height: 240px; display: flex; align-items: center; justify-content: center; padding: 2rem; text-align: center; }
                    .gacw-focus-exit { display: none; }
                    .gacw-shell.is-preview-focused .gacw-grid { grid-template-columns: 1fr; }
                    .gacw-shell.is-preview-focused .gacw-editor { display: none; }
                    .gacw-shell.is-preview-focused .gacw-focus-exit { display: inline-flex; }
                    @media (max-width: 1099.98px) {
                        .gacw-shell { height: min(82vh, 900px); min-height: 0; overflow-y: auto; }
                        .gacw-grid { display: block; height: auto; }
                        .gacw-editor { overflow: visible; border-right: 0; border-bottom: 1px solid var(--bs-border-color); }
                        .gacw-preview-column { height: auto; overflow: visible; }
                        .gacw-preview-panel { position: static; }
                        .gacw-stage { height: 560px; }
                    }
                </style>
                <div class="gacw-shell">
                    <div class="gacw-grid">
                        <section class="gacw-editor" aria-label="Auth configuration editor">
                            <div data-container="auth-config-editor"></div>
                        </section>
                        <aside class="gacw-preview-column" aria-label="Hosted auth visual preview">
                            <div class="gacw-preview-panel">
                                <div class="d-flex align-items-start justify-content-between gap-3 mb-2">
                                    <div>
                                        <div class="detail-section-eyebrow mt-0">Hosted page preview</div>
                                        <p class="small text-secondary mb-0">Best-effort static server-rendered first paint. This frame is never interactive.</p>
                                    </div>
                                    <a class="btn btn-sm btn-outline-primary gacw-external" target="_blank" rel="noopener noreferrer" aria-disabled="true">
                                        <i class="bi bi-box-arrow-up-right me-1"></i>Open exact page
                                    </a>
                                </div>
                                <div class="gacw-toolbar mb-2">
                                    <div class="btn-group btn-group-sm" role="group" aria-label="Hosted auth page">
                                        <button type="button" class="btn btn-outline-secondary active" data-action="preview-page" data-page="login">Login</button>
                                        <button type="button" class="btn btn-outline-secondary" data-action="preview-page" data-page="registration">Registration</button>
                                        <button type="button" class="btn btn-outline-secondary" data-action="preview-page" data-page="passkey">Passkey</button>
                                    </div>
                                    <div class="btn-group btn-group-sm" role="group" aria-label="Preview viewport">
                                        <button type="button" class="btn btn-outline-secondary active" data-action="preview-viewport" data-viewport="desktop"><i class="bi bi-display me-1"></i>Desktop</button>
                                        <button type="button" class="btn btn-outline-secondary" data-action="preview-viewport" data-viewport="phone"><i class="bi bi-phone me-1"></i>Phone</button>
                                    </div>
                                    <button type="button" class="btn btn-sm btn-outline-secondary gacw-focus d-none" data-action="focus-preview">Focus preview</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary gacw-focus-exit" data-action="focus-preview">Back to editor</button>
                                    <span class="small text-secondary gacw-dirty"></span>
                                </div>
                                <div class="small text-secondary mb-2 gacw-status" role="status">Waiting for saved auth config…</div>
                                <div class="gacw-stage">
                                    <div class="gacw-fallback">
                                        <div><i class="bi bi-window fs-2 text-secondary"></i><p class="small text-secondary mt-2 mb-0">Preview not loaded.</p></div>
                                    </div>
                                </div>
                                <p class="small text-secondary mt-2 mb-0">The static frame omits JavaScript-driven extra rows, passkey/session behavior, and every credential interaction. Save refreshes the server-resolved view.</p>
                            </div>
                        </aside>
                    </div>
                </div>
            `,
            ...options
        });

        this.page = 'login';
        this.viewport = 'desktop';
        this.url = '';
        this.registrationEnabled = true;
        this.dirty = false;
        this.layoutOverride = '';
        this.appearanceOverride = '';
        this.resolved = null;
        this.generation = 0;
        this.abortController = null;
        this.loading = false;
        this.fallback = { name: 'waiting', message: 'Waiting for saved auth config.' };
        this.previewScale = 1;
        this._resizeObserver = null;
        this._resizeHandler = null;
        this._frame = null;
        this._frameLoadHandler = null;
        this._destroyed = false;
        this.probeTimeout = options.probeTimeout || PROBE_TIMEOUT_MS;
    }

    async onInit() {
        this.editor = new GroupAuthConfigSection({
            containerId: 'auth-config-editor',
            model: this.model
        });
        this.editor.on('auth-config:resolved', this._onConfigResolved, this);
        this.editor.on('auth-config:changed', this._onConfigChanged, this);
        this.editor.on('auth-config:saved', this._onConfigSaved, this);
        this.addChild(this.editor);
    }

    async onAfterMount() {
        await super.onAfterMount();
        this._observeStage();
        this._syncControls();
        if (this.resolved) this._refreshPreview(true);
    }

    _onConfigResolved(payload) {
        this.resolved = clone(payload?.resolvedConfig) || {};
        this.registrationEnabled = payload?.registrationEnabled !== false;
        this.dirty = false;
        this.layoutOverride = '';
        this.appearanceOverride = '';
        this._syncControls();
        if (this.isMounted()) this._refreshPreview(true);
    }

    _onConfigChanged(payload = {}) {
        this.dirty = !!payload.dirty;
        const diff = payload.diff || {};
        const form = payload.formData || {};
        this.layoutOverride = ownPath(diff, 'theme.layout')
            ? (LAYOUTS.get(String(form.layout || '')) || '') : '';
        this.appearanceOverride = ownPath(diff, 'theme.appearance')
            && APPEARANCES.has(String(form.appearance || ''))
            ? String(form.appearance) : '';
        this._syncControls();
        if (this.isMounted()) this._refreshPreview(false);
    }

    _onConfigSaved(payload = {}) {
        this.resolved = clone(payload.resolvedConfig) || {};
        this.registrationEnabled = payload.registrationEnabled !== false;
        this.dirty = false;
        this.layoutOverride = '';
        this.appearanceOverride = '';
        this._syncControls();
        if (this.isMounted()) this._refreshPreview(true);
    }

    _candidateOrigin(raw, { allowRelative = false, requireOriginOnly = false } = {}) {
        const value = String(raw ?? '').trim();
        if (!value || value.startsWith('//') || value.includes('\\')) return null;
        if (allowRelative && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) && !value.startsWith('/')) return null;
        try {
            const base = allowRelative ? window.location.origin : undefined;
            const parsed = base ? new URL(value, base) : new URL(value);
            if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
            if (requireOriginOnly) {
                const normalized = parsed.origin + '/';
                if (parsed.href !== normalized || parsed.search || parsed.hash) return null;
            }
            return parsed.origin;
        } catch {
            return null;
        }
    }

    _resolveOrigin() {
        const app = this.getApp();
        const config = app?.config || {};
        if (Object.prototype.hasOwnProperty.call(config, 'hosted_auth_origin')) {
            const origin = this._candidateOrigin(config.hosted_auth_origin, { requireOriginOnly: true });
            return origin ? { ok: true, origin, source: 'hosted_auth_origin' }
                : { ok: false, name: 'invalid-origin', message: 'hosted_auth_origin must be an HTTP(S) origin without credentials, path, query, or hash.' };
        }
        const restBase = app?.rest?.config?.baseURL;
        if (restBase) {
            const origin = this._candidateOrigin(restBase, { allowRelative: true });
            return origin ? { ok: true, origin, source: 'rest-base-url' }
                : { ok: false, name: 'invalid-origin', message: 'The REST base URL does not resolve to a safe HTTP(S) origin.' };
        }
        const origin = this._candidateOrigin(window.location.origin);
        return origin ? { ok: true, origin, source: 'window-origin' }
            : { ok: false, name: 'invalid-origin', message: 'The current page does not have a safe HTTP(S) origin.' };
    }

    _safeHostedPath(raw) {
        const value = String(raw ?? '');
        if (!value.startsWith('/') || value.startsWith('//') || value.includes('?')
            || value.includes('#') || value.includes('\\')) return null;
        const segments = value.split('/');
        for (const segment of segments) {
            let decoded = segment;
            for (let pass = 0; pass < 3; pass++) {
                try { decoded = decodeURIComponent(decoded); } catch { return null; }
                if (decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) return null;
                if (!decoded.includes('%')) break;
            }
        }
        try {
            const normalized = new URL(value, 'https://host.invalid').pathname;
            if (normalized !== value) return null;
        } catch {
            return null;
        }
        return value;
    }

    _resolvePaths() {
        const configured = this.getApp()?.config?.hosted_auth_paths;
        if (configured !== undefined && (!configured || typeof configured !== 'object' || Array.isArray(configured))) {
            return { ok: false, name: 'invalid-path', message: 'hosted_auth_paths must be an object of root-relative paths.' };
        }
        const paths = {};
        for (const page of Object.keys(PAGE_PATHS)) {
            const raw = configured && Object.prototype.hasOwnProperty.call(configured, page)
                ? configured[page] : PAGE_PATHS[page];
            const path = this._safeHostedPath(raw);
            if (!path) {
                return { ok: false, name: 'invalid-path', message: `The configured ${page} hosted-auth path is unsafe.` };
            }
            paths[page] = path;
        }
        return { ok: true, paths };
    }

    _groupUuid() {
        const value = this.model?.get?.('uuid') ?? this.model?.attributes?.uuid;
        return typeof value === 'string' ? value.trim() : '';
    }

    _buildPreviewTarget() {
        const origin = this._resolveOrigin();
        if (!origin.ok) return origin;
        const paths = this._resolvePaths();
        if (!paths.ok) return paths;
        const uuid = this._groupUuid();
        if (!uuid) return { ok: false, name: 'missing-uuid', message: 'This group needs a UUID before a hosted auth page can be previewed.' };

        const url = new URL(paths.paths[this.page], origin.origin);
        url.search = '';
        url.hash = '';
        url.searchParams.set('group_uuid', uuid);
        if (this.layoutOverride) url.searchParams.set('auth_theme', this.layoutOverride);
        if (this.appearanceOverride) url.searchParams.set('auth_appearance', this.appearanceOverride);
        return {
            ok: true,
            url: url.href,
            sameOrigin: url.origin === window.location.origin,
            origin: origin.origin,
            path: paths.paths[this.page]
        };
    }

    _beginGeneration() {
        this.generation += 1;
        this.abortController?.abort?.();
        this.abortController = null;
        this._clearFrame();
        return this.generation;
    }

    async _refreshPreview(force = false) {
        if (this._destroyed) return;
        const target = this._buildPreviewTarget();
        const previousUrl = this.url;
        this.url = target.ok ? target.url : '';
        this._syncExternalLink();
        if (!target.ok) {
            const generation = this._beginGeneration();
            this._showFallback(target.name, target.message, generation);
            return;
        }
        if (!force && target.url === previousUrl) return;

        const generation = this._beginGeneration();
        if (!target.sameOrigin) {
            this._showFallback('cross-origin', 'Inline preview is available only when the hosted page is on this exact origin.', generation);
            return;
        }
        if (this.page === 'registration' && !this.registrationEnabled) {
            this._showFallback('registration-disabled', 'Registration is disabled in the saved resolved config. Save an enabled state before previewing it.', generation);
            return;
        }
        await this._probe(target.url, generation);
    }

    async _probe(url, generation) {
        const controller = new AbortController();
        this.abortController = controller;
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, this.probeTimeout);
        this.loading = true;
        this._setStatus('Checking the exact saved page before framing…');
        this._showLoading();
        try {
            const response = await fetch(url, {
                credentials: 'same-origin',
                cache: 'no-store',
                redirect: 'manual',
                signal: controller.signal
            });
            if (generation !== this.generation || this._destroyed) return;
            const refusal = await this._validateProbeResponse(response, url);
            if (refusal) {
                this._showFallback(refusal.name, refusal.message, generation);
                return;
            }
            const html = await response.text();
            if (generation !== this.generation || this._destroyed) return;
            const pageRefusal = this._validateHostedMarkup(html, this.page);
            if (pageRefusal) {
                this._showFallback(pageRefusal.name, pageRefusal.message, generation);
                return;
            }
            this._mountFrame(url, generation);
        } catch (error) {
            if (generation !== this.generation || this._destroyed) return;
            this._showFallback(
                timedOut ? 'timeout' : 'network',
                timedOut ? 'The hosted-page check timed out.' : `The hosted-page check failed: ${error?.message || 'network error'}.`,
                generation
            );
        } finally {
            clearTimeout(timer);
            if (this.abortController === controller) this.abortController = null;
        }
    }

    async _validateProbeResponse(response, requestedUrl) {
        if (response?.redirected || response?.type === 'opaqueredirect' || response?.status === 0) {
            return { name: 'redirect', message: 'The hosted page redirected or returned an opaque redirect.' };
        }
        if (!response || response.status < 200 || response.status >= 300) {
            return { name: 'http-status', message: `The hosted page returned HTTP ${response?.status || 'unknown'}.` };
        }
        let finalUrl;
        try { finalUrl = new URL(response.url).href; } catch { finalUrl = ''; }
        if (!finalUrl || finalUrl !== new URL(requestedUrl).href) {
            return { name: 'redirect', message: 'The hosted page did not return the exact requested URL.' };
        }
        if (!/^text\/html(?:\s*;|$)/i.test(header(response, 'content-type'))) {
            return { name: 'content-type', message: 'The hosted endpoint did not return an HTML document.' };
        }
        const csp = header(response, 'content-security-policy');
        // Report-only policy is intentionally ignored. An enforcing policy is
        // rejected only when framing is declared or multiple policies have
        // been collapsed into an ambiguous combined value.
        if (csp.includes(',')) {
            return { name: 'csp-ambiguous', message: 'Multiple or ambiguous enforcing CSP policies prevent a safe inline preview.' };
        }
        if (/\bframe-ancestors\b/i.test(csp)) {
            return { name: 'csp-frame-ancestors', message: 'The hosted page enforces a frame-ancestors policy and cannot be previewed inline.' };
        }
        if (header(response, 'x-frame-options')) {
            return { name: 'x-frame-options', message: 'The hosted page refuses framing through X-Frame-Options.' };
        }
        return null;
    }

    _validateHostedMarkup(html, page) {
        const source = String(html || '');
        if (/id=["']mbg-root["']|Verifying your connection|mojo-bouncer/i.test(source)) {
            return { name: 'challenge', message: 'The bouncer returned its script-driven challenge, not the hosted auth page.' };
        }
        if (/id=["']decoy-form["']|class=["'][^"']*ma-page\b/i.test(source)) {
            return { name: 'decoy', message: 'The bouncer returned a decoy page, not the hosted auth page.' };
        }
        const shell = /class=["'][^"']*mat-page\b/i.test(source)
            && /class=["'][^"']*mat-card\b/i.test(source);
        const sentinel = page === 'login' ? /id=["']view-signin["']/i
            : page === 'registration' ? /id=["']view-(?:register|reg-step1)["']/i
                : /id=["']view-passkey["']/i;
        if (!shell || !sentinel.test(source)) {
            return { name: 'unexpected-page', message: 'The response was HTML but not the expected hosted auth shell and page.' };
        }
        return null;
    }

    _mountFrame(url, generation) {
        if (generation !== this.generation || this._destroyed) return;
        const stage = this.element?.querySelector('.gacw-stage');
        if (!stage) return;
        stage.replaceChildren();
        const viewport = VIEWPORTS[this.viewport];
        const canvas = document.createElement('div');
        canvas.className = 'gacw-canvas';
        const frame = document.createElement('iframe');
        frame.className = 'gacw-frame';
        frame.title = `${this.page} hosted auth static visual preview`;
        frame.width = String(viewport.width);
        frame.height = String(viewport.height);
        frame.setAttribute('sandbox', '');
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.setAttribute('tabindex', '-1');
        frame.style.pointerEvents = 'none';
        frame.style.transformOrigin = 'top left';
        const shield = document.createElement('div');
        shield.className = 'gacw-shield';
        shield.setAttribute('aria-hidden', 'true');
        shield.innerHTML = '<span class="gacw-shield-label">Static, noninteractive first paint</span>';
        canvas.append(frame, shield);
        stage.append(canvas);
        this._frame = frame;
        this._frameLoadHandler = () => {
            if (generation !== this.generation || frame !== this._frame || frame.src !== url) return;
            this.loading = false;
            this.fallback = null;
            this._setStatus('Frame load completed. This is a best-effort static first paint, not proof of interactive auth behavior.');
        };
        frame.addEventListener('load', this._frameLoadHandler);
        this._applyScale();
        // Navigate only after every representation and framing check passed.
        frame.src = url;
    }

    _clearFrame() {
        if (this._frame && this._frameLoadHandler) {
            this._frame.removeEventListener('load', this._frameLoadHandler);
        }
        if (this._frame) this._frame.src = 'about:blank';
        this._frame = null;
        this._frameLoadHandler = null;
    }

    _showLoading() {
        const stage = this.element?.querySelector('.gacw-stage');
        if (!stage) return;
        stage.innerHTML = '<div class="gacw-fallback"><div><span class="spinner-border spinner-border-sm" aria-hidden="true"></span><p class="small text-secondary mt-2 mb-0">Checking hosted page…</p></div></div>';
    }

    _showFallback(name, message, generation = this.generation) {
        if (generation !== this.generation || this._destroyed) return;
        this.loading = false;
        this.fallback = { name, message };
        this._setStatus(`${name}: ${message}`);
        const stage = this.element?.querySelector('.gacw-stage');
        if (!stage) return;
        const text = document.createElement('p');
        text.className = 'small text-secondary mt-2 mb-0';
        text.textContent = message;
        const code = document.createElement('code');
        code.className = 'badge text-bg-secondary';
        code.textContent = name;
        const wrap = document.createElement('div');
        wrap.append(code, text);
        const fallback = document.createElement('div');
        fallback.className = 'gacw-fallback';
        fallback.append(wrap);
        stage.replaceChildren(fallback);
    }

    _setStatus(message) {
        const status = this.element?.querySelector('.gacw-status');
        if (status) status.textContent = message || '';
    }

    _syncExternalLink() {
        const link = this.element?.querySelector('.gacw-external');
        if (!link) return;
        if (this.url) {
            link.href = this.url;
            link.removeAttribute('aria-disabled');
        } else {
            link.removeAttribute('href');
            link.setAttribute('aria-disabled', 'true');
        }
    }

    _syncControls() {
        this.element?.querySelectorAll('[data-action="preview-page"]').forEach(button => {
            button.classList.toggle('active', button.dataset.page === this.page);
        });
        this.element?.querySelectorAll('[data-action="preview-viewport"]').forEach(button => {
            button.classList.toggle('active', button.dataset.viewport === this.viewport);
        });
        const dirty = this.element?.querySelector('.gacw-dirty');
        if (dirty) dirty.textContent = this.dirty
            ? 'Unsaved layout/appearance enums compare temporarily; all other preview content remains saved.' : 'Showing saved config.';
        this._syncExternalLink();
    }

    _observeStage() {
        const stage = this.element?.querySelector('.gacw-stage');
        if (!stage) return;
        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver(() => this._applyScale());
            this._resizeObserver.observe(stage);
        } else {
            this._resizeHandler = () => this._applyScale();
            window.addEventListener('resize', this._resizeHandler);
        }
    }

    _applyScale() {
        const stage = this.element?.querySelector('.gacw-stage');
        const canvas = stage?.querySelector('.gacw-canvas');
        const frame = this._frame;
        if (!stage || !canvas || !frame) return;
        const viewport = VIEWPORTS[this.viewport];
        const availableWidth = Math.max(1, stage.clientWidth - 2);
        const availableHeight = Math.max(1, stage.clientHeight - 2);
        const fit = Math.min(availableWidth / viewport.width, availableHeight / viewport.height, 1);
        const sideBySide = window.matchMedia?.('(min-width: 1100px)')?.matches !== false;
        this.previewScale = Math.max(0.3, fit);
        frame.width = String(viewport.width);
        frame.height = String(viewport.height);
        frame.style.width = `${viewport.width}px`;
        frame.style.height = `${viewport.height}px`;
        frame.style.transform = `scale(${this.previewScale})`;
        canvas.style.width = `${viewport.width * this.previewScale}px`;
        canvas.style.height = `${viewport.height * this.previewScale}px`;
        const shield = canvas.querySelector('.gacw-shield');
        if (shield) {
            shield.style.width = `${viewport.width * this.previewScale}px`;
            shield.style.height = `${viewport.height * this.previewScale}px`;
        }
        const focus = this.element?.querySelector('.gacw-focus');
        focus?.classList.toggle('d-none', !(sideBySide && fit < 0.45));
    }

    async onActionPreviewPage(_event, element) {
        const page = element?.dataset?.page;
        if (!Object.prototype.hasOwnProperty.call(PAGE_PATHS, page)) return true;
        if (page === 'registration' && !this.registrationEnabled) {
            this.page = page;
            this._syncControls();
            this._refreshPreview(true);
            return true;
        }
        this.page = page;
        this._syncControls();
        await this._refreshPreview(true);
        return true;
    }

    async onActionPreviewViewport(_event, element) {
        const viewport = element?.dataset?.viewport;
        if (!Object.prototype.hasOwnProperty.call(VIEWPORTS, viewport)) return true;
        this.viewport = viewport;
        this._syncControls();
        this._applyScale();
        return true;
    }

    async onActionFocusPreview() {
        this.element?.querySelector('.gacw-shell')?.classList.toggle('is-preview-focused');
        if (window.requestAnimationFrame) window.requestAnimationFrame(() => this._applyScale());
        else setTimeout(() => this._applyScale(), 0);
        return true;
    }

    async destroy() {
        this._destroyed = true;
        this._beginGeneration();
        this._resizeObserver?.disconnect?.();
        this._resizeObserver = null;
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
        this.editor?.off?.('auth-config:resolved', this._onConfigResolved, this);
        this.editor?.off?.('auth-config:changed', this._onConfigChanged, this);
        this.editor?.off?.('auth-config:saved', this._onConfigSaved, this);
        return super.destroy();
    }
}

export default GroupAuthConfigWorkspace;
