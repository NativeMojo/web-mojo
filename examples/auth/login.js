import { Page, FormView, Rest as rest } from 'web-mojo';

/**
 * Standalone login example for the web-mojo examples portal.
 *
 * Doc:    docs/web-mojo/services/Rest.md, src/extensions/auth/index.js
 * Mounts: examples/auth/index.html → #app
 *
 * Posts `{ username, password }` to `<API_BASE>/login` (the same endpoint the
 * `web-mojo/auth` mountAuth() helper uses — see `src/extensions/auth/index.js`
 * for the canonical endpoint definition: `EP.login = '/login'`).
 *
 * On success: stores `access_token` (and `refresh_token` / `user` if present)
 * in localStorage, then redirects to `/examples/portal/`.
 *
 * On failure: shows the server's error message inline; does NOT swallow it.
 *
 * NOT registered in the portal registry — this is the page the portal will
 * eventually point its `loginUrl` at.
 */

const DEV_API = 'http://127.0.0.1:9009/api';
const PROD_API = '/api';
const API_BASE = window.location.hostname === 'localhost' ? DEV_API : PROD_API;
const REDIRECT_AFTER_LOGIN = '/examples/portal/';

rest.configure({ baseURL: API_BASE });

class LoginPage extends Page {
    static pageName = 'auth/login';
    static route = 'auth/login';

    constructor(options = {}) {
        super({
            ...options,
            pageName: LoginPage.pageName,
            route: LoginPage.route,
            title: 'Sign in',
            template: LoginPage.TEMPLATE,
            containerId: 'app',
        });
        this.error = null;
        this.busy = false;
    }

    async onInit() {
        await super.onInit();
        this.form = new FormView({
            containerId: 'login-form',
            fields: [
                { type: 'text', name: 'username', label: 'Email or username',
                    autocomplete: 'username', required: true },
                { type: 'password', name: 'password', label: 'Password',
                    autocomplete: 'current-password', required: true },
            ],
        });
        this.addChild(this.form);
    }

    async onActionLogin(event) {
        event.preventDefault();
        if (this.busy) return;
        if (!this.form.validate()) {
            this.form.focusFirstError();
            return;
        }
        const data = await this.form.getFormData();

        this.busy = true;
        this.error = null;
        await this.render();

        // Rest.POST returns the parsed response shape: resp.success / resp.data
        const resp = await rest.POST('/login', {
            username: data.username,
            password: data.password,
        });

        // Server sometimes wraps the auth payload one level deep — normalize.
        const body = (resp && resp.data && resp.data.data) || (resp && resp.data) || resp;

        if (resp && resp.success && body && body.access_token) {
            localStorage.setItem('access_token', body.access_token);
            if (body.refresh_token) localStorage.setItem('refresh_token', body.refresh_token);
            if (body.user) localStorage.setItem('user', JSON.stringify(body.user));
            window.location.href = REDIRECT_AFTER_LOGIN;
            return;
        }

        this.error = body?.message || body?.error || resp?.statusText
            || 'Invalid credentials. Please try again.';
        this.busy = false;
        await this.render();
    }

    static TEMPLATE = `
        <div class="card shadow-sm">
            <div class="card-body p-4">
                <h1 class="h4 mb-1">Sign in</h1>
                <p class="text-muted small mb-3">
                    Posts to <code>{{apiBase}}/login</code>; redirects to
                    <code>/examples/portal/</code> on success.
                </p>

                {{#error|bool}}
                    <div class="alert alert-danger py-2 small mb-3">
                        <i class="bi bi-exclamation-triangle"></i> {{error}}
                    </div>
                {{/error|bool}}

                <div data-container="login-form"></div>

                <button type="button" class="btn btn-primary w-100 mt-3"
                        data-action="login" {{#busy|bool}}disabled{{/busy|bool}}>
                    {{#busy|bool}}
                        <span class="spinner-border spinner-border-sm me-2"></span>Signing in…
                    {{/busy|bool}}
                    {{^busy|bool}}
                        <i class="bi bi-box-arrow-in-right"></i> Sign in
                    {{/busy|bool}}
                </button>
            </div>
        </div>
    `;

    get apiBase() { return API_BASE; }
}

const page = new LoginPage();
await page.render();
