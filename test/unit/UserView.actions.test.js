/**
 * WM-027 regression tests — UserView admin account actions.
 *
 * The original bug: kebab/profile actions hardcoded REST paths that don't
 * exist on the django-mojo backend (`/api/auth/password/reset`,
 * `/api/auth/magic-link`, `/api/user/<id>/sessions/revoke`,
 * `/api/auth/impersonate`) and 404'd. These tests pin the exact outgoing
 * URL + payload per action variant against the real backend routes
 * (django-mojo mojo/apps/account/rest/user.py):
 *
 *   magic link      → POST /api/auth/magic/send        { email | phone_number, method? }
 *   password reset  → POST /api/auth/forgot            { email | phone_number, method, channel? }
 *   revoke sessions → POST /api/user/<id>              { revoke_sessions: {} }
 *   resend invite   → POST /api/user/<id>              { send_invite: true }
 *   reset MFA       → POST /api/user/<id>              { disable_totp: true, requires_mfa?: false }
 *   verify email    → POST /api/auth/email/verify/send { email }   (NOT /api/auth/verify/email/send — that route is self-only)
 *
 * Handlers are exercised via `UserView.prototype.onActionX.call(stub)` —
 * they only touch `this.model`, `this.getApp()`, the module-scoped `rest`
 * singleton (global.Rest) and `Modal` (object stub captured at load).
 * The kebab describe constructs a full UserView (stubbed child classes)
 * to pin the `when` / `permissions` gating on the new menu items.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();

    loadModule('View');
    loadModule('ContextMenu');
    loadModule('DetailView');
    loadModule('dataFormatter');
    loadModule('MOJOUtils');
    loadModule('grouping');
    loadModule('Member');
    const rest = loadModule('Rest');

    // ── Constructible stubs for everything the constructor news up ────
    class ViewStub {
        constructor(options = {}) { this.options = options; Object.assign(this, options); }
        async render() { return this; }
        isMounted() { return false; }
        on() {} off() {} emit() {}
    }
    class CollectionStub {
        constructor(options = {}) { this.options = options; this.params = options.params; this.models = []; }
        on() {} off() {}
        async fetch() { return { success: true }; }
    }
    class UserStub {
        constructor(data = {}) { this.data = data; }
    }
    UserStub.SYSTEM_PERMISSION_FIELDS = [];
    UserStub.APP_PERMISSION_FIELDS = [];
    UserStub.EDIT_FORM = { fields: [] };

    // Modal stub — the transformed module captures this OBJECT at load
    // time, so per-test overrides swap methods on the same object.
    const Modal = {
        confirm: async () => true,
        form: async () => null,
        prompt: async () => null,
        alert: async () => {},
        dialog: async () => null,
        detail: async () => null,
        modelForm: async () => null,
        updateModelImage: async () => null
    };

    global.Modal = Modal;
    global.ListView = ViewStub;
    global.TableView = ViewStub;
    global.TabView = ViewStub;
    global.FormView = ViewStub;
    global.MetricCard = ViewStub;
    global.Timeline = ViewStub;
    global.LogList = CollectionStub;
    global.UserModelsStub = { User: UserStub, UserDeviceList: CollectionStub };
    global.GroupModelsStub = { Group: class {} };
    global.PasskeysModelsStub = { PasskeyList: CollectionStub, PasskeyForms: { edit: { fields: [] } } };
    global.PushModelsStub = { PushDeviceList: CollectionStub };
    global.LoginEventModelsStub = { LoginEventList: CollectionStub };
    global.IncidentModelsStub = { IncidentEventList: CollectionStub };

    const UserView = loadModule('UserView');

    // Captured by the module above — don't leak into later test files.
    delete global.Modal;
    delete global.ListView;
    delete global.TableView;
    delete global.TabView;
    delete global.FormView;
    delete global.MetricCard;
    delete global.Timeline;
    delete global.LogList;
    delete global.UserModelsStub;
    delete global.GroupModelsStub;
    delete global.PasskeysModelsStub;
    delete global.PushModelsStub;
    delete global.LoginEventModelsStub;
    delete global.IncidentModelsStub;

    // ── Fixtures ───────────────────────────────────────────────────────
    function makeModel(attrs = {}) {
        const data = {
            id: 42,
            email: 'alice@example.com',
            phone_number: '+15550001234',
            display_name: 'Alice',
            requires_mfa: true,
            last_login: null,
            is_email_verified: false,
            ...attrs
        };
        return {
            id: data.id,
            attributes: data,
            get(k) { return data[k]; },
            set(k, v) { if (typeof k === 'object') Object.assign(data, k); else data[k] = v; },
            on() {}, off() {},
            toJSON() { return { ...data }; }
        };
    }

    function makeCtx(model) {
        const toasts = { success: [], error: [], info: [] };
        const ctx = {
            model,
            getApp: () => ({
                toast: {
                    success: (m) => toasts.success.push(m),
                    error: (m) => toasts.error.push(m),
                    info: (m) => toasts.info.push(m)
                }
            }),
            headerView: { isMounted: () => false },
            profileSection: { isMounted: () => false },
            overviewSection: { isMounted: () => false },
            _refreshComputedFields() {},
            async _fullRefresh() {}
        };
        return { ctx, toasts };
    }

    describe('UserView admin account actions (WM-027)', () => {
        let posts;
        let savedPOST;
        let formCalls;

        beforeEach(() => {
            posts = [];
            formCalls = [];
            savedPOST = rest.POST;
            rest.POST = async (url, body) => {
                posts.push({ url, body });
                return { success: true, status: 200, data: { status: true } };
            };
            Modal.confirm = async () => true;
            Modal.form = async (opts) => { formCalls.push(opts); return null; };
        });

        afterEach(() => {
            rest.POST = savedPOST;
        });

        // ── Magic login link ───────────────────────────────────────

        it('magic link, email only → POST /api/auth/magic/send { email }', async () => {
            const { ctx } = makeCtx(makeModel({ phone_number: null }));
            await UserView.prototype.onActionSendMagicLink.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].url).toBe('/api/auth/magic/send');
            expect(posts[0].body).toEqual({ email: 'alice@example.com' });
        });

        it('magic link, both channels + SMS chosen → { email, method: "sms" }', async () => {
            Modal.form = async (opts) => { formCalls.push(opts); return { channel: 'sms' }; };
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionSendMagicLink.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].url).toBe('/api/auth/magic/send');
            expect(posts[0].body).toEqual({ email: 'alice@example.com', method: 'sms' });
        });

        it('magic link, both channels + email chosen → { email } (no method key)', async () => {
            Modal.form = async () => ({ channel: 'email' });
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionSendMagicLink.call(ctx);
            expect(posts[0].body).toEqual({ email: 'alice@example.com' });
        });

        it('magic link, phone only → { phone_number, method: "sms" }', async () => {
            const { ctx } = makeCtx(makeModel({ email: null }));
            await UserView.prototype.onActionSendMagicLink.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].body).toEqual({ phone_number: '+15550001234', method: 'sms' });
        });

        it('magic link, no contact on file → error toast, no POST', async () => {
            const { ctx, toasts } = makeCtx(makeModel({ email: null, phone_number: null }));
            await UserView.prototype.onActionSendMagicLink.call(ctx);
            expect(posts).toHaveLength(0);
            expect(toasts.error).toHaveLength(1);
        });

        // ── Password reset (forgot) ────────────────────────────────

        it('reset, email link chosen → POST /api/auth/forgot { email, method: "link" }', async () => {
            Modal.form = async (opts) => { formCalls.push(opts); return { delivery: 'link' }; };
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResetPassword.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].url).toBe('/api/auth/forgot');
            expect(posts[0].body).toEqual({ email: 'alice@example.com', method: 'link' });
        });

        it('reset, email code chosen → { email, method: "code" }', async () => {
            Modal.form = async () => ({ delivery: 'code' });
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResetPassword.call(ctx);
            expect(posts[0].body).toEqual({ email: 'alice@example.com', method: 'code' });
        });

        it('reset, SMS code chosen → { email, method: "code", channel: "sms" }', async () => {
            Modal.form = async () => ({ delivery: 'sms-code' });
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResetPassword.call(ctx);
            expect(posts[0].body).toEqual({ email: 'alice@example.com', method: 'code', channel: 'sms' });
        });

        it('reset offers SMS only when a phone is on file', async () => {
            Modal.form = async (opts) => { formCalls.push(opts); return null; };
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResetPassword.call(ctx);
            const withPhone = formCalls[0].fields[0].options.map(o => o.value);
            expect(withPhone).toEqual(['link', 'code', 'sms-code']);

            formCalls = [];
            const { ctx: ctx2 } = makeCtx(makeModel({ phone_number: null }));
            await UserView.prototype.onActionResetPassword.call(ctx2);
            const emailOnly = formCalls[0].fields[0].options.map(o => o.value);
            expect(emailOnly).toEqual(['link', 'code']);
        });

        it('reset, phone only → confirm path → { phone_number, method: "code", channel: "sms" }', async () => {
            const { ctx } = makeCtx(makeModel({ email: null }));
            await UserView.prototype.onActionResetPassword.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].url).toBe('/api/auth/forgot');
            expect(posts[0].body).toEqual({ phone_number: '+15550001234', method: 'code', channel: 'sms' });
        });

        it('reset, dialog cancelled → no POST', async () => {
            Modal.form = async () => null;
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResetPassword.call(ctx);
            expect(posts).toHaveLength(0);
        });

        it('reset, no contact on file → error toast, no POST', async () => {
            const { ctx, toasts } = makeCtx(makeModel({ email: null, phone_number: null }));
            await UserView.prototype.onActionResetPassword.call(ctx);
            expect(posts).toHaveLength(0);
            expect(toasts.error).toHaveLength(1);
        });

        // ── Revoke all sessions (POST_SAVE_ACTION body, not a nested path) ──

        it('revoke sessions → POST /api/user/<id> { revoke_sessions: {} }', async () => {
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionRevokeAllSessions.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].url).toBe('/api/user/42');
            expect(posts[0].body).toEqual({ revoke_sessions: {} });
        });

        it('revoke sessions cancelled → no POST', async () => {
            Modal.confirm = async () => false;
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionRevokeAllSessions.call(ctx);
            expect(posts).toHaveLength(0);
        });

        // ── Resend invite ──────────────────────────────────────────

        it('resend invite → POST /api/user/<id> { send_invite: true }', async () => {
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResendInvite.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].url).toBe('/api/user/42');
            expect(posts[0].body).toEqual({ send_invite: true });
        });

        it('resend invite without an email → error toast, no POST', async () => {
            const { ctx, toasts } = makeCtx(makeModel({ email: null }));
            await UserView.prototype.onActionResendInvite.call(ctx);
            expect(posts).toHaveLength(0);
            expect(toasts.error).toHaveLength(1);
        });

        // ── Reset MFA (disable TOTP) ───────────────────────────────

        it('reset MFA, keep requirement (default) → { disable_totp: true } only', async () => {
            Modal.form = async () => ({ clear_requirement: false });
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResetMfa.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].url).toBe('/api/user/42');
            expect(posts[0].body).toEqual({ disable_totp: true });
        });

        it('reset MFA, clear requirement checked → { disable_totp: true, requires_mfa: false }', async () => {
            Modal.form = async () => ({ clear_requirement: true });
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResetMfa.call(ctx);
            expect(posts[0].body).toEqual({ disable_totp: true, requires_mfa: false });
        });

        it('reset MFA cancelled → no POST', async () => {
            Modal.form = async () => null;
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionResetMfa.call(ctx);
            expect(posts).toHaveLength(0);
        });

        // ── Send verification email (path trap: admin-targetable route) ──

        it('send verification email → POST /api/auth/email/verify/send { email }', async () => {
            const { ctx } = makeCtx(makeModel());
            await UserView.prototype.onActionSendVerificationEmail.call(ctx);
            expect(posts).toHaveLength(1);
            expect(posts[0].url).toBe('/api/auth/email/verify/send');
            expect(posts[0].body).toEqual({ email: 'alice@example.com' });
        });

        // ── Impersonate is dead code — removed ─────────────────────

        it('the impersonate handler is gone (no backend route exists)', () => {
            expect(UserView.prototype.onActionImpersonate).toBeUndefined();
        });
    });

    describe('UserView kebab menu gating (WM-027)', () => {
        function kebabItems(model) {
            const view = new UserView({ model });
            return view.headerConfig.contextMenu.items;
        }

        it('Resend Invite: admin-gated, shown only for email + never-logged-in', () => {
            const item = kebabItems(makeModel()).find(i => i.action === 'resend-invite');
            expect(item).toBeDefined();
            expect(item.permissions).toEqual(['users', 'manage_users']);
            expect(!!item.when(makeModel())).toBe(true);
            expect(!!item.when(makeModel({ last_login: '2026-01-01T00:00:00Z' }))).toBe(false);
            expect(!!item.when(makeModel({ email: null }))).toBe(false);
        });

        it('Reset MFA: admin-gated, shown only when requires_mfa', () => {
            const item = kebabItems(makeModel()).find(i => i.action === 'reset-mfa');
            expect(item).toBeDefined();
            expect(item.permissions).toEqual(['users', 'manage_users']);
            expect(!!item.when(makeModel({ requires_mfa: true }))).toBe(true);
            expect(!!item.when(makeModel({ requires_mfa: false }))).toBe(false);
        });

        it('no impersonate item in the kebab', () => {
            expect(kebabItems(makeModel()).some(i => i.action === 'impersonate')).toBe(false);
        });
    });
};
