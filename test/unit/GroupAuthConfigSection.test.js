/**
 * GroupAuthConfigSection — contract parity, inheritance, rich rows, and save
 * reconciliation. Tests deliberately exercise pure seams plus small JSDOM
 * form shells; no backend or Bootstrap runtime is required.
 */
const path = require('path');
const { SimpleModuleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    await testHelpers.setup();
    const jest = global.jest;

    let formSequence = 0;
    class FakeFormView {
        constructor(config = {}) {
            this.id = `fake-form-${++formSequence}`;
            this.containerId = config.containerId;
            this.fields = config.fields || [];
            this.data = { ...(config.data || {}) };
            this.element = document.createElement('div');
            this.errors = {};
            this.destroyed = false;
            this.rendered = false;
            this.listeners = {};
            this._buildTabs();
        }

        _buildTabs() {
            const tabs = this.fields[0]?.tabs || [];
            this.element.innerHTML = `
                <form><div class="mojo-form-tabset">
                    <div class="nav">${tabs.map((tab, index) => `<button type="button" role="tab" class="nav-link${index === 0 ? ' active' : ''}" data-bs-target="#fake-pane-${this.id}-${index}" aria-selected="${index === 0}">${tab.label}</button>`).join('')}</div>
                    ${tabs.map((tab, index) => `<div id="fake-pane-${this.id}-${index}" class="tab-pane${index === 0 ? ' show active' : ''}" data-tab-index="${index}"></div>`).join('')}
                </div></form>`;
        }

        async render() {
            this.rendered = true;
            this._buildTabs();
            return this;
        }

        async getFormData() { return { ...this.data }; }
        on(name, callback, context) {
            if (!this.listeners[name]) this.listeners[name] = [];
            this.listeners[name].push({ callback, context });
        }
        off(name, callback, context) {
            this.listeners[name] = (this.listeners[name] || []).filter(listener => (
                listener.callback !== callback || listener.context !== context
            ));
        }
        emit(name, payload) {
            (this.listeners[name] || []).slice().forEach(listener => {
                listener.callback.call(listener.context || this, payload);
            });
        }
        validate() { return true; }
        focusFirstError() {}
        destroy() { this.destroyed = true; this.element.remove(); }
    }

    class FakeGroup {}

    const loader = new SimpleModuleLoader();
    loader.loadModule('View');
    global.FormView = FakeFormView;
    global.GroupModelsStub = { Group: FakeGroup };
    const Section = loader.loadModuleFromFile(
        path.resolve(__dirname, '../../src/extensions/admin/account/groups/GroupAuthConfigSection.js'),
        'GroupAuthConfigSection'
    );
    delete global.FormView;
    delete global.GroupModelsStub;

    // Load the real FormView class for the native/custom field event-contract
    // test. Construction is unnecessary there; a prototype-backed instance
    // drives the production handleFieldChange() path without initializing the
    // unrelated file/date/image component toolchain.
    global.FormPlugins = {};
    global.FileDropMixin = cls => cls;
    const ActualFormView = loader.loadModuleFromFile(
        path.resolve(__dirname, '../../src/core/forms/FormView.js'),
        'FormView'
    );
    delete global.FormPlugins;
    delete global.FileDropMixin;

    function makeModel(attributes = {}, save = null) {
        const model = {
            id: attributes.id || 10,
            attributes: { id: attributes.id || 10, ...attributes },
            errors: {},
            on() {},
            off() {},
            get(key) {
                if (key === 'id') return this.id;
                return key.split('.').reduce((value, part) => value && value[part], this.attributes);
            },
            toJSON() { return { ...this.attributes }; },
            set(data) { this.attributes = { ...this.attributes, ...data }; this.id = this.attributes.id || this.id; },
            save: save || jest.fn().mockResolvedValue({ success: true, status: 200, data: { status: true } })
        };
        return model;
    }

    function makeApp(defaults = {}) {
        return {
            rest: { GET: jest.fn().mockResolvedValue({ success: true, data: { data: defaults } }) },
            showLoading: jest.fn(),
            hideLoading: jest.fn(),
            toast: { success: jest.fn(), error: jest.fn() }
        };
    }

    function newSection(attributes = {}, app = makeApp()) {
        return new Section({ model: makeModel(attributes), app });
    }

    function seed(section, own = {}, ancestors = []) {
        section._deploymentDefaults = {
            theme: {
                app_title: 'Deploy', auth_provider_name: 'Deploy', logo_url: '', favicon_url: '',
                hero_image_url: '', hero_image_url_light: '', hero_image_url_dark: '',
                hero_headline: 'Hello', hero_subheadline: '', hero_image_position: 'center',
                back_to_website_url: '', back_to_website_label: 'Back', terms_url: '',
                layout: 'minimal', appearance: 'system', accent_color: '#6384ff',
                api_base: '', success_redirect: '/', custom_css: '', custom_css_url: ''
            },
            login: { methods: ['password'], heading: 'Sign In', supporting_copy: '' },
            registration: {
                enabled: true, fields: null, extra_fields: [], identity_field: '', min_age: null,
                methods: ['password'], passkey_prompt: 'off'
            }
        };
        section._ancestorLayers = ancestors;
        section._rawOwn = JSON.parse(JSON.stringify(own));
        section._ancestryCertain = true;
        section._draftResets = new Set();
        section._extraErrors = [];
        section._deriveEffectiveState();
        section._baseline = section._buildBaseline(section._effective);
        const extra = section._effective.registration.extra_fields;
        section._baselineExtraWire = Array.isArray(extra) ? JSON.parse(JSON.stringify(extra)) : [];
        section._extraRows = section._extraRowsFromArray(section._baselineExtraWire);
        section._seedExtraRows(section._baseline, section._extraRows);
        section.formView = section._buildFormView(section._baseline);
        section._wireFormView(section.formView);
        section.children[section.formView.id] = section.formView;
        section.formView.parent = section;
        section.element.innerHTML = '<span class="gac-status"></span><div data-container="auth-config-form"></div>';
        return section;
    }

    function collectNamed(fields, out = []) {
        for (const field of fields || []) {
            if (field.name) out.push(field);
            if (field.fields) collectNamed(field.fields, out);
            for (const tab of field.tabs || []) collectNamed(tab.fields, out);
        }
        return out;
    }

    let hosts = [];
    beforeEach(() => { hosts = []; });
    afterEach(() => {
        hosts.forEach(host => host.remove());
        hosts = [];
    });

    describe('full hosted-auth contract and unknown tokens', () => {
        it('renders all 20 public theme leaves plus login copy and GitHub methods', () => {
            const section = seed(newSection());
            const fields = section._buildFields();
            expect(fields[0].tabs.map(tab => tab.label)).toEqual([
                'Appearance', 'Login', 'Registration', 'Advanced'
            ]);
            const named = collectNamed(fields);
            const names = named.map(field => field.name);
            const themeNames = [
                'app_title', 'auth_provider_name', 'logo_url', 'favicon_url', 'hero_image_url',
                'hero_image_url_light', 'hero_image_url_dark', 'hero_headline', 'hero_subheadline',
                'hero_image_position', 'back_to_website_url', 'back_to_website_label', 'terms_url',
                'layout', 'appearance', 'accent_color', 'api_base', 'success_redirect', 'custom_css',
                'custom_css_url'
            ];
            themeNames.forEach(name => expect(names).toContain(name));
            expect(themeNames).toHaveLength(20);
            expect(names).toContain('login_heading');
            expect(names).toContain('login_supporting_copy');
            const login = named.find(field => field.name === 'login_methods');
            const registration = named.find(field => field.name === 'reg_methods');
            expect(login.options.map(option => option.value)).toContain('github');
            expect(registration.options.map(option => option.value)).toContain('github');
        });

        it('adds configured unknown select, method, identity, and verify values as visible options', () => {
            const section = seed(newSection(), {
                theme: { layout: 'cinematic' },
                login: { methods: ['password', 'saml'] },
                registration: {
                    identity_field: 'username',
                    fields: [{ name: 'email', verify: 'carrier-pigeon' }, { name: 'password' }]
                }
            });
            const named = collectNamed(section._buildFields());
            expect(named.find(field => field.name === 'layout').options.map(option => option.value)).toContain('cinematic');
            expect(named.find(field => field.name === 'login_methods').options.map(option => option.value)).toContain('saml');
            expect(named.find(field => field.name === 'reg_identity_field').options.map(option => option.value)).toContain('username');
            expect(named.find(field => field.name === 'regf_email_vfy').options.map(option => option.value)).toContain('carrier-pigeon');
            expect(section._diffPayload({ ...section._baseline })).toBeNull();
        });
    });

    describe('effective merge and provenance', () => {
        it('merges deployment → root → parent → own and keeps false, empty, zero, and [] overrides', () => {
            const section = seed(newSection(), {
                theme: { app_title: '' },
                registration: { enabled: false, min_age: 0, methods: [] },
                login: { supporting_copy: '' }
            }, [
                { id: 1, name: 'Root', config: { theme: { hero_headline: 'Root hero', app_title: 'Root' } } },
                { id: 2, name: 'Parent', config: { theme: { app_title: 'Parent' }, registration: { min_age: 18 } } }
            ]);
            expect(section._effective.theme.app_title).toBe('');
            expect(section._effective.theme.hero_headline).toBe('Root hero');
            expect(section._effective.registration.enabled).toBe(false);
            expect(section._effective.registration.min_age).toBe(0);
            expect(section._effective.registration.methods).toEqual([]);
            expect(section._effective.login.supporting_copy).toBe('');
            expect(section._provenance['theme.app_title'].kind).toBe('own');
            expect(section._provenance['theme.hero_headline'].label).toBe('Root');
            expect(section._inherited.theme.app_title).toBe('Parent');
        });

        it('surfaces per-leaf source and disables reset when ancestry is uncertain', () => {
            const section = seed(newSection(), { theme: { app_title: 'Own' } });
            expect(section._provenanceHtml('theme.app_title')).toContain('Overridden by this group');
            expect(section._provenanceHtml('theme.app_title')).toContain('data-action="reset-auth-field"');
            section._ancestryCertain = false;
            expect(section._provenanceHtml('theme.app_title')).toContain(' disabled');
        });
    });

    describe('raw ancestor traversal', () => {
        it('handles roots without REST reads and walks UUID-less/inactive ancestors by parent id', async () => {
            const section = newSection();
            section._fetchRawGroup = jest.fn().mockImplementation(async id => {
                if (id === 20) return {
                    ok: true,
                    attributes: { id: 20, name: 'Inactive parent', uuid: null, is_active: false, parent: { id: 10 }, metadata: { auth_config: { theme: { app_title: 'Parent' } } } }
                };
                return {
                    ok: true,
                    attributes: { id: 10, name: 'UUID-less root', uuid: null, is_active: false, parent: null, metadata: { auth_config: { theme: { hero_headline: 'Root' } } } }
                };
            });
            const root = await section._walkRawAncestors(null);
            expect(root.certain).toBe(true);
            expect(root.layers).toEqual([]);
            const child = await section._walkRawAncestors(20);
            expect(section._fetchRawGroup.mock.calls.map(call => call[0])).toEqual([20, 10]);
            expect(child.layers.map(layer => layer.id)).toEqual([10, 20]);
            expect(child.certain).toBe(true);
        });

        it('guards missing/read failures, cycles, and excessive depth', async () => {
            const missing = newSection();
            missing._fetchRawGroup = jest.fn().mockResolvedValue({ ok: false });
            expect((await missing._walkRawAncestors(9)).certain).toBe(false);

            const cycle = newSection();
            cycle._fetchRawGroup = jest.fn().mockImplementation(async id => ({
                ok: true,
                attributes: { id, name: `G${id}`, parent: { id: id === 1 ? 2 : 1 }, metadata: {} }
            }));
            const result = await cycle._walkRawAncestors(1);
            expect(result.certain).toBe(false);
            expect(result.message).toContain('cycle');

            const deep = newSection();
            deep._fetchRawGroup = jest.fn().mockImplementation(async id => ({
                ok: true,
                attributes: { id, parent: { id: id + 1 }, metadata: {} }
            }));
            expect((await deep._walkRawAncestors(1)).message).toContain('depth');
        });

        it('fetches deployment defaults once without a group UUID', async () => {
            const app = makeApp({ theme: { app_title: 'Configured deployment' } });
            const section = newSection({}, app);
            const defaults = await section._fetchDeploymentDefaults();
            expect(app.rest.GET).toHaveBeenCalledTimes(1);
            expect(app.rest.GET.mock.calls[0]).toEqual(['/api/auth/config']);
            expect(defaults.theme.app_title).toBe('Configured deployment');
        });
    });

    describe('leaf reset and tab-safe rebuilds', () => {
        it('queues one null leaf without disturbing an independent draft field', async () => {
            const section = seed(newSection(), {
                theme: { app_title: 'Own title' },
                login: { heading: 'Own heading' }
            });
            section.formView.data = { ...section._baseline, login_heading: 'Draft heading' };
            await section.onActionResetAuthField(null, { dataset: { path: 'theme.app_title' } });
            expect([...section._draftResets]).toEqual(['theme.app_title']);
            expect(section.formView.data.login_heading).toBe('Draft heading');
            const payload = section._diffPayload(section.formView.data);
            expect(payload.theme.app_title).toBeNull();
            expect(payload.login.heading).toBe('Draft heading');
        });

        it('restores the active tab and destroys the replaced form/listeners', async () => {
            const section = seed(newSection());
            const host = document.createElement('div');
            document.body.appendChild(host);
            hosts.push(host);
            host.appendChild(section.element);
            const old = section.formView;
            section._restoreActiveTab(2);
            expect(section._captureActiveTab()).toBe(2);
            await section._rebuildForm({ ...section._baseline, login_heading: 'Draft' }, 2);
            expect(old.destroyed).toBe(true);
            expect(section.formView).not.toBe(old);
            expect(section.formView.rendered).toBe(true);
            expect(section._captureActiveTab()).toBe(2);
        });
    });

    describe('ordered structured extra fields', () => {
        it('round-trips order, legacy strings, labels, and required flags', () => {
            const section = seed(newSection(), {
                registration: {
                    extra_fields: ['promo', { name: 'ref', label: 'Referral code', required: true }]
                }
            });
            const data = { ...section._baseline };
            expect(section._assembleExtraFields(data)).toEqual([
                'promo',
                { name: 'ref', label: 'Referral code', required: true }
            ]);
            data.reg_extra_0_label = 'Promotion';
            expect(section._assembleExtraFields(data)).toEqual([
                { name: 'promo', label: 'Promotion', required: false },
                { name: 'ref', label: 'Referral code', required: true }
            ]);
            section._extraRows = [{ name: 'tracking', label: '', required: true, original: undefined }];
            const optionalLabel = {};
            section._seedExtraRows(optionalLabel, section._extraRows);
            expect(section._assembleExtraFields(optionalLabel)).toEqual([
                { name: 'tracking', required: true }
            ]);
            expect(section._renderExtraFields()).toContain('name="reg_extra_0_name"');
            expect(section._renderExtraFields()).toContain('type="checkbox"');
        });

        it('validates blank/invalid/canonical/duplicate names visibly by row index', () => {
            const section = seed(newSection());
            section._extraRows = [
                { name: '', label: '', required: false },
                { name: 'email', label: '', required: false },
                { name: 'bad name', label: '', required: false },
                { name: 'promo', label: '', required: false },
                { name: 'promo', label: '', required: false }
            ];
            const data = {};
            section._seedExtraRows(data, section._extraRows);
            const errors = section._validateExtraFields(data);
            expect(errors.map(error => error.index)).toEqual([0, 1, 2, 4]);
            section._extraErrors = errors;
            const html = section._renderExtraFields();
            expect(html).toContain('is-invalid');
            expect(html).toContain('duplicated');
        });

        it('adds/removes indexed rows without reordering surviving values', async () => {
            const section = seed(newSection(), {
                registration: { extra_fields: ['first', 'second'] }
            });
            section.formView.data = { ...section._baseline };
            await section.onActionRemoveRegistrationExtra(null, { dataset: { index: '0' } });
            expect(section._extraRows.map(row => row.name)).toEqual(['second']);
            await section.onActionAddRegistrationExtra();
            expect(section._extraRows.map(row => row.name)).toEqual(['second', '']);
        });
    });

    describe('registration.fields legal empty-list semantics', () => {
        it('displays django defaults for [] without turning an untouched [] into a write', () => {
            const section = seed(newSection(), { registration: { fields: [] } });
            expect(section._baseline.regf_email_inc).toBe(true);
            expect(section._baseline.regf_password_inc).toBe(true);
            expect(section._diffPayload({ ...section._baseline })).toBeNull();
        });

        it('allows a user-cleared schema to serialize [] and validates passwordless phone+SMS', () => {
            const section = seed(newSection());
            const empty = { ...section._baseline };
            for (const field of ['first_name', 'last_name', 'email', 'phone', 'dob', 'password']) {
                empty[`regf_${field}_inc`] = false;
            }
            expect(section._diffPayload(empty).registration.fields).toEqual([]);
            expect(section._validateDraft(empty)).toBe('');

            const passwordless = { ...empty, regf_phone_inc: true, regf_phone_req: true, regf_phone_vfy: '' };
            expect(section._validateDraft(passwordless)).toContain('Verify set to SMS');
            passwordless.regf_phone_vfy = 'sms';
            expect(section._validateDraft(passwordless)).toBe('');
        });
    });

    describe('client-visible backend validation', () => {
        it('mirrors accent, navigation, external/inline CSS, and nonblank copy guards', () => {
            const section = seed(newSection());
            const base = { ...section._baseline };
            expect(section._validateDraft({ ...base, accent_color: 'red' })).toContain('six-digit');
            expect(section._validateDraft({ ...base, back_to_website_url: 'javascript:alert(1)' })).toContain('HTTP(S)');
            expect(section._validateDraft({ ...base, custom_css_url: 'http://cdn.test/a.css' })).toContain('https://');
            expect(section._validateDraft({ ...base, custom_css: '@import url(data:text/css,x)' })).toContain('Inline CSS');
            expect(section._validateDraft({ ...base, auth_provider_name: '   ' })).toContain('provider');
            expect(section._validateDraft({ ...base, back_to_website_label: '' })).toContain('label');
            expect(section._validateDraft({ ...base, login_heading: '' })).toContain('heading');
        });
    });

    describe('concurrent raw rebase and verified save', () => {
        it('uses detached raw state to save only sparse intent leaves', async () => {
            const section = seed(newSection());
            const latest = {
                theme: { app_title: 'Own', logo_url: 'concurrent.svg' },
                future_section: { token: 1 }
            };
            const intent = {
                theme: { app_title: null },
                login: { heading: 'Draft' }
            };
            await section._saveRebased(intent, latest);
            const payload = section.model.save.mock.calls[0][0].metadata.auth_config;
            expect(payload.theme.logo_url).toBeUndefined();
            expect(payload.theme.app_title).toBeNull();
            expect(payload.login.heading).toBe('Draft');
            expect(payload.future_section).toBeUndefined();
        });

        it('prunes an already-absent reset and performs no write', async () => {
            const section = seed(newSection());
            expect(section._rebaseRawBranch(
                { theme: { logo_url: 'keep.svg' } },
                { theme: { app_title: null } }
            )).toEqual({});
            const result = await section._saveRebased(
                { theme: { app_title: null } },
                { theme: { logo_url: 'keep.svg' } }
            );
            expect(result.skipped).toBe(true);
            expect(section.model.save).not.toHaveBeenCalled();
        });

        it('preserves the draft and baseline when detached refresh or save fails', async () => {
            const save = jest.fn().mockResolvedValue({ success: false, error: 'conflict' });
            const section = seed(new Section({
                model: makeModel({ id: 10 }, save),
                app: makeApp()
            }));
            section.formView.data = { ...section._baseline, login_heading: 'Unsaved draft' };
            const form = section.formView;
            section._fetchRawGroup = jest.fn().mockResolvedValue({ ok: true, attributes: { id: 10, parent: null, metadata: { auth_config: {} } } });
            await section.onActionSaveAuthConfig();
            expect(save).toHaveBeenCalledTimes(1);
            expect(section.formView).toBe(form);
            expect(section.formView.data.login_heading).toBe('Unsaved draft');
            expect(section._baseline.login_heading).toBe('Sign In');
            expect(section.element.querySelector('.gac-status').textContent).toContain('conflict');
        });

        it('preserves an invalid draft in place and does not begin a save', async () => {
            const save = jest.fn();
            const section = seed(new Section({
                model: makeModel({ id: 10 }, save),
                app: makeApp()
            }));
            section.formView.data = { ...section._baseline, accent_color: 'not-a-color' };
            const form = section.formView;
            section._fetchRawGroup = jest.fn();
            await section.onActionSaveAuthConfig();
            expect(section.formView).toBe(form);
            expect(section.formView.data.accent_color).toBe('not-a-color');
            expect(section._fetchRawGroup).not.toHaveBeenCalled();
            expect(save).not.toHaveBeenCalled();
        });

        it('retries one persisted-null cleanup, refreshes, rebaselines, and restores the tab', async () => {
            const save = jest.fn().mockResolvedValue({ success: true, status: 200, data: { status: true } });
            const app = makeApp();
            const section = seed(new Section({
                model: makeModel({ id: 10, parent: null, metadata: { auth_config: { theme: { app_title: 'Own' } } } }, save),
                app
            }), { theme: { app_title: 'Own' } });
            const host = document.createElement('div');
            document.body.appendChild(host);
            hosts.push(host);
            host.appendChild(section.element);
            section.formView.data = { ...section._baseline, app_title: 'Deploy' };
            section._draftResets.add('theme.app_title');
            section._restoreActiveTab(2);

            const snapshots = [
                { id: 10, parent: null, metadata: { auth_config: { theme: { app_title: 'Own' } } } },
                { id: 10, parent: null, metadata: { auth_config: { theme: { app_title: null } } } },
                { id: 10, parent: null, metadata: { auth_config: { theme: {} } } }
            ];
            section._fetchRawGroup = jest.fn().mockImplementation(async () => ({ ok: true, attributes: snapshots.shift() }));
            await section.onActionSaveAuthConfig();

            expect(save).toHaveBeenCalledTimes(2);
            expect(save.mock.calls[0][0].metadata.auth_config.theme.app_title).toBeNull();
            expect(save.mock.calls[1][0].metadata.auth_config.theme.app_title).toBeNull();
            expect(section._draftResets.size).toBe(0);
            expect(section._baseline.app_title).toBe('Deploy');
            expect(section._captureActiveTab()).toBe(2);
            expect(app.toast.success).toHaveBeenCalledWith('Auth config saved');
        });
    });

    describe('private workspace event contract', () => {
        const flush = () => new Promise(resolve => setTimeout(resolve, 0));

        it('emits one canonical changed payload for text, select, toggle, and multiselect FormView changes', async () => {
            const section = seed(newSection());
            section._unwireFormView(section.formView);
            const actualForm = Object.create(ActualFormView.prototype);
            actualForm.data = { ...section._baseline };
            actualForm.model = null;
            actualForm.autosaveModelField = false;
            actualForm.options = {};
            actualForm._listeners = {};
            actualForm._updateShowWhen = () => {};
            actualForm.getFormData = async () => ({ ...actualForm.data });
            section.formView = actualForm;
            section._wireFormView(actualForm);
            const events = [];
            section.on('auth-config:changed', payload => events.push(payload));
            for (const [field, value] of [
                ['app_title', 'Draft title'],
                ['layout', 'editorial'],
                ['reg_enabled', false],
                ['login_methods', ['password', 'magic']]
            ]) {
                actualForm.handleFieldChange(field, value);
                await flush();
            }
            expect(events).toHaveLength(4);
            expect(events[0].diff.theme.app_title).toBe('Draft title');
            expect(events[1].diff.theme.layout).toBe('editorial');
            expect(events[2].diff.registration.enabled).toBe(false);
            expect(events[3].diff.login.methods).toEqual(['password', 'magic']);
            expect(events.every(event => event.dirty)).toBe(true);
        });

        it('emits structured-row changes once through explicit input/toggle listeners', async () => {
            const section = seed(newSection(), { registration: { extra_fields: ['promo'] } });
            section.formView.element.innerHTML = section._renderExtraFields();
            section._wireStructuredRows();
            const events = [];
            section.on('auth-config:changed', payload => events.push(payload));

            const label = section.formView.element.querySelector('[name="reg_extra_0_label"]');
            label.value = 'Promotion code';
            section.formView.data.reg_extra_0_label = label.value;
            label.dispatchEvent(new Event('input', { bubbles: true }));
            await flush();
            const toggle = section.formView.element.querySelector('[name="reg_extra_0_required"]');
            toggle.checked = true;
            section.formView.data.reg_extra_0_required = true;
            toggle.dispatchEvent(new Event('change', { bubbles: true }));
            await flush();

            expect(events).toHaveLength(2);
            expect(events[0].diff.registration.extra_fields[0].label).toBe('Promotion code');
            expect(events[1].diff.registration.extra_fields[0].required).toBe(true);
        });

        it('discards stale async getFormData completions during rapid changes', async () => {
            const section = seed(newSection());
            const resolvers = [];
            section.formView.getFormData = () => new Promise(resolve => resolvers.push(resolve));
            const events = [];
            section.on('auth-config:changed', payload => events.push(payload));
            section.formView.emit('field:change', { field: 'app_title', value: 'first' });
            await Promise.resolve();
            section.formView.emit('field:change', { field: 'app_title', value: 'second' });
            await Promise.resolve();
            resolvers[1]({ ...section._baseline, app_title: 'second' });
            resolvers[0]({ ...section._baseline, app_title: 'first' });
            await flush();
            expect(events).toHaveLength(1);
            expect(events[0].formData.app_title).toBe('second');
        });

        it('emits resolved once on readiness and saved only after refresh/rebuild', async () => {
            const section = newSection({ id: 10, parent: null, metadata: { auth_config: {} } });
            section._fetchDeploymentDefaults = jest.fn().mockResolvedValue(section._deploymentDefaults);
            section._walkRawAncestors = jest.fn().mockResolvedValue({ layers: [], certain: true, message: '' });
            const order = [];
            section.on('auth-config:resolved', payload => order.push(['resolved', payload]));
            section.on('auth-config:saved', payload => order.push(['saved', payload]));
            await section.onInit();
            expect(order.map(item => item[0])).toEqual(['resolved']);

            section.formView.data = { ...section._baseline, login_heading: 'Saved heading' };
            section._fetchRawGroup = jest.fn()
                .mockResolvedValueOnce({ ok: true, attributes: { id: 10, parent: null, metadata: { auth_config: {} } } })
                .mockResolvedValueOnce({ ok: true, attributes: { id: 10, parent: null, metadata: { auth_config: { login: { heading: 'Saved heading' } } } } });
            await section.onActionSaveAuthConfig();
            expect(order.map(item => item[0])).toEqual(['resolved', 'saved']);
            expect(order[1][1].dirty).toBe(false);
            expect(order[1][1].resolvedConfig.login.heading).toBe('Saved heading');
        });

        it('unwires replaced and destroyed forms so one later input emits once', async () => {
            const section = seed(newSection());
            const old = section.formView;
            await section._rebuildForm({ ...section._baseline }, 0);
            expect(old.listeners['field:change'] || []).toHaveLength(0);
            const events = [];
            section.on('auth-config:changed', payload => events.push(payload));
            section.formView.data.app_title = 'Only once';
            section.formView.emit('field:change', { field: 'app_title', value: 'Only once' });
            await flush();
            expect(events).toHaveLength(1);
            const current = section.formView;
            await section.destroy();
            expect(current.listeners['field:change'] || []).toHaveLength(0);
        });

        it('does not emit saved for no-op or failed saves and retains dirty state', async () => {
            const failed = seed(new Section({
                model: makeModel({ id: 10 }, jest.fn().mockResolvedValue({ success: false, error: 'nope' })),
                app: makeApp()
            }));
            const saved = [];
            failed.on('auth-config:saved', payload => saved.push(payload));
            failed.formView.data.app_title = 'Dirty';
            failed._fetchRawGroup = jest.fn().mockResolvedValue({ ok: true, attributes: { id: 10, parent: null, metadata: { auth_config: {} } } });
            await failed.onActionSaveAuthConfig();
            expect(saved).toHaveLength(0);
            expect(failed.formView.data.app_title).toBe('Dirty');

            const noOp = seed(newSection());
            noOp.on('auth-config:saved', payload => saved.push(payload));
            await noOp.onActionSaveAuthConfig();
            expect(saved).toHaveLength(0);
        });
    });
};
