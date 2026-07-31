/**
 * RegistrantContactPage.test.js - the registrant-contact editor (#952).
 *
 * Handler-driven off an Object.create(prototype) instance (WM-026), the
 * GroupAuthConfigSection pattern: no constructor, no DOM, no app.
 *
 * The invariants here are the ones where being wrong discloses or destroys
 * somebody's personal data, not the ones about markup:
 *
 *   - the house contact's values must never reach a group-scoped view
 *   - a scope change must not carry the previous scope's private keys into the
 *     row being saved
 *   - a group that merely INHERITS a contact must not learn which of its
 *     fields are malformed
 *   - the house scope must gate on the same thing the backend gates on
 */
const path = require('path');
const { SimpleModuleLoader } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach } = testContext;
    const fs = require('fs');

    const loader = new SimpleModuleLoader();
    loader.loadModule('Page');      // sets global.Page so `extends Page` resolves
    loader.loadModule('MOJOUtils');

    const pagePath = path.resolve(
        __dirname, '../../src/extensions/admin/dns/RegistrantContactPage.js');

    // The real rules module — the page's correctness is mostly delegated to it.
    global.registrantData = loader.loadModuleFromFile(
        path.resolve(__dirname, '../../src/extensions/admin/dns/registrantData.js'),
        'registrantDataForPage'
    );

    // Recorders for everything the page reaches out to.
    const calls = { get: [], save: [], clear: [], reset: 0, caps: [], confirm: [] };
    let nextGet = { success: true, data: { data: {} } };
    let nextWrite = { success: true, data: { data: {} } };
    let confirmAnswer = true;

    global.DnsModelsStub = {
        registrar: {
            capabilities: (group) => { calls.caps.push(group); return Promise.resolve({}); },
            resetCapabilities: () => { calls.reset += 1; }
        },
        registrantContact: {
            get: (group) => { calls.get.push(group); return Promise.resolve(nextGet); },
            save: (contact, group) => { calls.save.push({ contact, group }); return Promise.resolve(nextWrite); },
            clear: (group) => { calls.clear.push(group); return Promise.resolve(nextWrite); }
        }
    };
    global.GeofenceRuleFormStub = { COUNTRIES: [{ value: 'GB', label: 'United Kingdom' }] };
    global.GroupModelsStub = { GroupList: class {} };
    global.FormView = class { constructor(o) { Object.assign(this, o); } };
    global.Modal = {
        confirm: (...args) => { calls.confirm.push(args); return Promise.resolve(confirmAnswer); }
    };

    const RegistrantContactPage = loader.loadModuleFromFile(pagePath, 'RegistrantContactPage');

    // Capture-then-delete: a lingering global leaks into later test files.
    delete global.registrantData;
    delete global.DnsModelsStub;
    delete global.GeofenceRuleFormStub;
    delete global.GroupModelsStub;
    delete global.FormView;
    delete global.Modal;

    const rawSource = fs.readFileSync(pagePath, 'utf8');
    const stripComments = (text) => text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map(line => line.replace(/(^|\s)\/\/.*$/, '$1'))
        .join('\n');
    const source = stripComments(rawSource);

    /**
     * An instance with only the state the methods under test read. render() and
     * the mount helpers are stubbed — this file is about decisions, not markup.
     */
    const make = (overrides = {}) => Object.assign(Object.create(RegistrantContactPage.prototype), {
        scope: 'house',
        groupId: null,
        groupLabel: '',
        state: 'loading',
        forbiddenMessage: '',
        payload: null,
        problems: [],
        preserved: [],
        caps: {},
        _raw: null,
        canChooseScope: true,
        contactForm: null,
        groupForm: null,
        element: null,
        render: async function() { this.renderCount = (this.renderCount || 0) + 1; },
        mountGroupPicker: async function() { this.pickerMounted = true; },
        mountContactForm: async function(contact) { this.mountedWith = contact; },
        getApp: () => ({ activeGroup: { id: 9, get: () => 'Acme' } }),
        setStatus() {},
        clearProblems() {},
        showProblems(list) { this.shown = list; },
        fail(message) { this.failed = message; },
        ...overrides
    });

    const HOUSE_CONTACT = {
        FirstName: 'Ian', LastName: 'Starnes', ContactType: 'COMPANY',
        AddressLine1: '1 House Way', City: 'Austin', State: 'TX',
        CountryCode: 'US', ZipCode: '78701',
        PhoneNumber: '+1.5125550100', Email: 'house-ops@example.com',
        Fax: '+1.5125550101',
        ExtraParams: [{ Name: 'BIRTH_DATE_IN_YYYY_MM_DD', Value: '1970-01-01' }]
    };

    beforeEach(() => {
        calls.get.length = 0;
        calls.save.length = 0;
        calls.clear.length = 0;
        calls.caps.length = 0;
        calls.confirm.length = 0;
        calls.reset = 0;
        nextGet = { success: true, data: { data: {} } };
        nextWrite = { success: true, data: { data: {} } };
        confirmAnswer = true;
    });

    describe('RegistrantContactPage', () => {

        describe('scope gating — the house scope follows the backend boundary', () => {
            it('offers the scope control to a superuser', async () => {
                const page = make({ canChooseScope: false });
                page.getApp = () => ({ activeUser: { get: (k) => k === 'is_superuser' } });
                await page.onInit();
                expect(page.canChooseScope).toBe(true);
                expect(page.scope).toBe('house');
            });

            it('does NOT offer it to a permission-only admin', async () => {
                // require_platform_admin checks the literal is_superuser
                // attribute, not a permission — `admin` is the broader wildcard
                // grant, so gating on it would render a control that 403s. Same
                // reasoning as the Adopt button on DomainTablePage.
                const page = make({ canChooseScope: true });
                page.getApp = () => ({
                    activeUser: {
                        get: (k) => (k === 'is_superuser' ? false : undefined),
                        hasPermission: () => true,
                        permissions: { admin: true, manage_dns: true }
                    },
                    activeGroup: { id: 4, get: () => 'Acme' }
                });
                await page.onInit();
                expect(page.canChooseScope).toBe(false);
                expect(page.scope).toBe('group');
                expect(page.groupId).toBe(4);
            });

            it('reads is_superuser, never hasPermission, to decide it', () => {
                const init = source.slice(source.indexOf('async onInit()'));
                const body = init.slice(0, init.indexOf('async onEnter'));
                expect(body).toContain("is_superuser");
                expect(body).not.toContain('hasPermission');
                expect(body).not.toContain('checkPermissions');
            });
        });

        describe('loadScope — never reads a scope other than the current one', () => {
            it('requests the house scope with no group', async () => {
                const page = make({ scope: 'house' });
                await page.loadScope();
                expect(calls.get).toEqual([null]);
            });

            it('requests a group scope with its id', async () => {
                const page = make({ scope: 'group', groupId: 7 });
                await page.loadScope();
                expect(calls.get).toEqual([7]);
            });

            it('issues NO request at all while the group is unpicked', async () => {
                const page = make({ scope: 'group', groupId: null });
                const result = await page.loadScope();
                expect(calls.get).toEqual([]);
                expect(result).toEqual({ state: 'ready', payload: null });
            });

            it('never falls back to a house read when a group scope is refused', async () => {
                nextGet = { success: false, status: 403, data: { error: 'nope' } };
                const page = make({ scope: 'group', groupId: 7 });
                const result = await page.loadScope();
                expect(result.state).toBe('forbidden');
                expect(calls.get).toEqual([7]);   // exactly one read, for the asked scope
            });

            it('reports an absent endpoint as unsupported, not as an empty form', async () => {
                nextGet = { success: false, status: 404, data: null };
                const page = make({ scope: 'house' });
                expect((await page.loadScope()).state).toBe('unsupported');
            });

            it('demotes a house-scope 403 to the group scope instead of dead-ending', async () => {
                nextGet = { success: false, status: 403, data: { error: 'platform admins only' } };
                const page = make({ scope: 'house' });
                expect((await page.loadScope()).state).toBe('demote');
            });

            it('surfaces a transport failure without assuming anything', async () => {
                nextGet = { success: false, status: 0, data: null, message: 'Network Error' };
                const page = make({ scope: 'house' });
                const result = await page.loadScope();
                expect(result.state).toBe('forbidden');
                expect(result.message).toBe('Network Error');
            });

            it('clears the preserved-key carrier before the request goes out', async () => {
                const page = make({ scope: 'group', groupId: 7, _raw: HOUSE_CONTACT });
                await page.loadScope();
                expect(page._raw).toBeNull();
            });

            it('has capabilities resolved by the time it returns', async () => {
                // Fire-and-forget would land after the render that shows the
                // purchase-disabled note, so the note would miss its own paint.
                const page = make({ scope: 'group', groupId: 7, caps: null });
                await page.loadScope();
                expect(calls.caps).toEqual([7]);
                expect(page.caps).toEqual({});
            });
        });

        describe('applyPayload — an inherited contact discloses nothing', () => {
            const inherited = {
                state: 'ready',
                payload: {
                    scope: 'group', group: 7, contact: null, source: 'none',
                    inherited: true, effective_configured: true, problems: []
                }
            };

            it('renders an empty form and flags the inheritance', async () => {
                const page = make({ scope: 'group', groupId: 7 });
                await page.applyPayload(inherited);
                expect(page.isInherited).toBe(true);
                expect(page.mountedWith).toBeNull();
                expect(page._raw).toBeNull();
                expect(page.preserved).toEqual([]);
            });

            it('suppresses problems for an inherited contact', async () => {
                // The backend already scopes `problems` to the scope's own row,
                // but a server that regressed must not turn this page into a
                // read-out of which fields of the HOUSE contact are broken.
                const page = make({ scope: 'group', groupId: 7 });
                await page.applyPayload({
                    state: 'ready',
                    payload: {
                        ...inherited.payload,
                        problems: ['Email is required.', 'Phone number must be in the form +1.5551234567.']
                    }
                });
                expect(page.problems).toEqual([]);
                expect(page.hasProblems).toBe(false);
            });

            it('keeps problems for a contact the scope actually owns', async () => {
                const page = make({ scope: 'group', groupId: 7 });
                await page.applyPayload({
                    state: 'ready',
                    payload: {
                        contact: { FirstName: 'Ada' }, source: 'database',
                        inherited: false, effective_configured: false,
                        problems: ['Email is required.']
                    }
                });
                expect(page.problems).toEqual(['Email is required.']);
            });

            it('stashes the raw contact ONLY for a record this scope owns', async () => {
                const page = make({ scope: 'group', groupId: 7 });
                await page.applyPayload({
                    state: 'ready',
                    payload: {
                        contact: HOUSE_CONTACT, source: 'database',
                        inherited: false, effective_configured: true, problems: []
                    }
                });
                expect(page._raw).toBe(HOUSE_CONTACT);
                expect(page.preserved).toEqual(['Fax', 'ExtraParams']);
            });

            it('offers the clear control only for a group row that exists', async () => {
                const own = {
                    state: 'ready',
                    payload: { contact: { FirstName: 'Ada' }, source: 'database', problems: [] }
                };
                const group = make({ scope: 'group', groupId: 7 });
                await group.applyPayload(own);
                expect(group.canClear).toBe(true);

                const house = make({ scope: 'house' });
                await house.applyPayload(own);
                expect(house.canClear).toBe(false);   // never offered for the house scope

                const borrowing = make({ scope: 'group', groupId: 7 });
                await borrowing.applyPayload(inherited);
                expect(borrowing.canClear).toBe(false);   // nothing to remove
            });
        });

        describe('saving — the cross-scope PII rule', () => {
            it('omits group from a house-scope save', async () => {
                const page = make({ scope: 'house', contactForm: { getFormData: async () => ({}) } });
                await page.onActionSaveContact();
                // validateContact refuses an empty contact before any request.
                expect(calls.save).toEqual([]);
                expect(page.shown.length).toBeGreaterThan(0);
            });

            it('sends a valid contact with group=null for the house scope', async () => {
                const form = global.__validForm || {
                    FirstName: 'Ada', LastName: 'Lovelace', ContactType: 'COMPANY',
                    AddressLine1: '1 Way', City: 'London', CountryCode: 'GB',
                    ZipCode: 'W1A 1AA', PhoneNumber: '+44.2071234567', Email: 'a@example.com'
                };
                const page = make({ scope: 'house', contactForm: { getFormData: async () => form } });
                await page.onActionSaveContact();
                expect(calls.save).toHaveLength(1);
                expect(calls.save[0].group).toBeNull();
            });

            it('a house→group switch drops the house private keys before any save', async () => {
                // THE regression. The page opens on the house scope, so _raw is
                // the operator's contact — including ExtraParams, which carries
                // date of birth and national ID and is rendered nowhere. If it
                // survives the switch, the tenant's row is REPLACED with a
                // payload carrying it, readable afterwards by any manage_dns
                // holder on that group through the backend's own legitimate
                // own-row read.
                const page = make({
                    scope: 'house',
                    _raw: HOUSE_CONTACT,
                    payload: { contact: HOUSE_CONTACT, source: 'database', problems: [] },
                    contactForm: { getFormData: async () => ({}) }
                });
                expect(page._raw).toBe(HOUSE_CONTACT);

                await page.onActionScopeChanged({}, { dataset: { scope: 'group' } });
                expect(page.scope).toBe('group');
                expect(page._raw).toBeNull();

                // and a save from here carries none of it
                page.groupId = 7;
                page.contactForm = {
                    getFormData: async () => ({
                        FirstName: 'Tenant', LastName: 'Admin', ContactType: 'COMPANY',
                        AddressLine1: '2 Tenant St', City: 'Leeds', CountryCode: 'GB',
                        ZipCode: 'LS1 1AA', PhoneNumber: '+44.1132345678', Email: 'tenant@example.com'
                    })
                };
                await page.onActionSaveContact();
                expect(calls.save).toHaveLength(1);
                expect(calls.save[0].contact).not.toHaveProperty('ExtraParams');
                expect(calls.save[0].contact).not.toHaveProperty('Fax');
                expect(calls.save[0].contact.Email).toBe('tenant@example.com');
            });

            it('carries the CURRENT scope\'s own extras across a save', async () => {
                const own = { ...HOUSE_CONTACT };
                const page = make({
                    scope: 'group', groupId: 7, _raw: own,
                    payload: { contact: own, source: 'database', problems: [] },
                    contactForm: { getFormData: async () => ({ ...own, ContactType: 'PERSON' }) }
                });
                await page.onActionSaveContact();
                expect(calls.save[0].contact.Fax).toBe(own.Fax);
                expect(calls.save[0].contact.ExtraParams).toEqual(own.ExtraParams);
                expect(calls.save[0].contact.ContactType).toBe('PERSON');
            });

            it('refuses a bad contact locally and never issues the request', async () => {
                const page = make({
                    scope: 'group', groupId: 7,
                    contactForm: { getFormData: async () => ({
                        FirstName: 'Ada', LastName: 'L', ContactType: 'COMPANY',
                        AddressLine1: '1 Way', City: 'London', CountryCode: 'GB',
                        ZipCode: 'W1A 1AA', PhoneNumber: '555-1234', Email: 'a@example.com'
                    }) }
                });
                await page.onActionSaveContact();
                expect(calls.save).toEqual([]);
                expect(page.shown.map(p => p.field)).toContain('PhoneNumber');
            });

            it('surfaces a server refusal instead of claiming success', async () => {
                nextWrite = { success: false, status: 400, data: { error: 'State is required' } };
                const page = make({
                    scope: 'group', groupId: 7,
                    contactForm: { getFormData: async () => ({
                        FirstName: 'Ada', LastName: 'L', ContactType: 'COMPANY',
                        AddressLine1: '1 Way', City: 'London', CountryCode: 'GB',
                        ZipCode: 'W1A 1AA', PhoneNumber: '+44.2071234567', Email: 'a@example.com'
                    }) }
                });
                await page.onActionSaveContact();
                expect(page.failed).toBe('State is required');
                expect(calls.reset).toBe(0);   // nothing changed, nothing to invalidate
            });
        });

        describe('capability invalidation', () => {
            const validForm = {
                FirstName: 'Ada', LastName: 'Lovelace', ContactType: 'COMPANY',
                AddressLine1: '1 Way', City: 'London', CountryCode: 'GB',
                ZipCode: 'W1A 1AA', PhoneNumber: '+44.2071234567', Email: 'a@example.com'
            };

            it('resets capabilities after a successful save', async () => {
                const page = make({
                    scope: 'group', groupId: 7,
                    contactForm: { getFormData: async () => validForm }
                });
                await page.onActionSaveContact();
                expect(calls.reset).toBe(1);
            });

            it('resets capabilities after a successful clear too', async () => {
                // Clearing changes this group's effective answer as much as
                // saving does — it becomes whatever it inherits, possibly nothing.
                const page = make({
                    scope: 'group', groupId: 7,
                    payload: { contact: { FirstName: 'Ada' }, source: 'database', problems: [] }
                });
                await page.onActionClearContact();
                expect(calls.clear).toEqual([7]);
                expect(calls.reset).toBe(1);
            });

            it('asks before clearing, and does nothing when declined', async () => {
                confirmAnswer = false;
                const page = make({
                    scope: 'group', groupId: 7,
                    payload: { contact: { FirstName: 'Ada' }, source: 'database', problems: [] }
                });
                await page.onActionClearContact();
                expect(calls.confirm).toHaveLength(1);
                expect(calls.clear).toEqual([]);
                expect(calls.reset).toBe(0);
            });
        });

        describe('the template actually compiles and branches', () => {
            // The three examples-* build suites check a route's REGISTRATION
            // only, so a page whose template is malformed — an unbalanced
            // section, a mistyped pipe — ships green and blows up on mount
            // (#298). Rendering it here for each state closes that gap without
            // a browser and a live backend.
            const Mustache = require('../../src/utils/mustache.js').default;

            // The template is passed to super() in the constructor, so read it
            // off the source rather than constructing a real Page.
            const start = rawSource.indexOf('template: `');
            const end = rawSource.indexOf('`\n        });', start);
            const TEMPLATE = rawSource.slice(start + 'template: `'.length, end);

            /** Mirror View's context: the view instance IS the context. */
            const render = (page) => Mustache.render(TEMPLATE, page);

            it('extracted the whole template, not a truncated slice', () => {
                // Without this the suite below could pass vacuously on a prefix
                // that happens to contain the strings it looks for.
                expect(start).toBeGreaterThan(-1);
                expect(end).toBeGreaterThan(start);
                expect(TEMPLATE).toContain('Registrant Contact');       // the top
                expect(TEMPLATE).toContain('clear-contact');            // the bottom
                expect(TEMPLATE).toContain('{{/isUnsupported}}');       // the closing section
                // Every opened section is closed.
                const opens = (TEMPLATE.match(/\{\{[#^]/g) || []).length;
                const closes = (TEMPLATE.match(/\{\{\//g) || []).length;
                expect(opens).toBe(closes);
            });

            it('renders the loading state', () => {
                const html = render(make({ state: 'loading' }));
                expect(html).toContain('Loading the contact for this scope');
                expect(html).not.toContain('Save contact');
            });

            it('renders the unsupported state and nothing editable', () => {
                const html = render(make({ state: 'unsupported' }));
                expect(html).toContain('DNSMAN_REGISTRANT_CONTACT');
                expect(html).not.toContain('Save contact');
                expect(html).not.toContain('data-container="contact-form"');
            });

            it('renders the forbidden state with the server\'s reason', () => {
                const html = render(make({
                    state: 'forbidden', forbiddenMessage: 'platform administrators only'
                }));
                expect(html).toContain('platform administrators only');
                expect(html).not.toContain('Save contact');
            });

            it('renders the scope control for a superuser only', () => {
                expect(render(make({ state: 'ready', canChooseScope: true, scope: 'house' })))
                    .toContain('data-action="scope-changed"');
                const pinned = render(make({
                    state: 'ready', canChooseScope: false, scope: 'group',
                    groupId: 4, groupLabel: 'Acme',
                    payload: { contact: null, source: 'none', effective_configured: true }
                }));
                expect(pinned).not.toContain('data-action="scope-changed"');
                expect(pinned).toContain('Acme');
            });

            it('renders the editor with the form container once a scope resolves', () => {
                const html = render(make({
                    state: 'ready', scope: 'house',
                    payload: { contact: { FirstName: 'Ada' }, source: 'database', effective_configured: true }
                }));
                expect(html).toContain('data-container="contact-form"');
                expect(html).toContain('data-action="save-contact"');
                expect(html).toContain('Purchases can proceed for this scope');
            });

            it('renders the inherited banner without any contact values', () => {
                const page = make({
                    state: 'ready', scope: 'group', groupId: 7,
                    payload: {
                        contact: null, source: 'none', inherited: true,
                        effective_configured: true, problems: []
                    }
                });
                const html = render(page);
                expect(html).toContain('has no contact of its own');
                expect(html).toContain('are not shown here');
            });

            it('escapes a hostile problem string rather than emitting it raw', () => {
                const page = make({
                    state: 'ready', scope: 'house',
                    problems: ['<img src=x onerror=alert(1)>'],
                    payload: { contact: {}, source: 'database', effective_configured: false }
                });
                const html = render(page);
                expect(html).not.toContain('<img src=x');
                expect(html).toContain('&lt;img');
            });

            it('names preserved keys without emitting their values', () => {
                const page = make({
                    state: 'ready', scope: 'house',
                    preserved: ['Fax', 'ExtraParams'],
                    payload: { contact: {}, source: 'database', effective_configured: true }
                });
                const html = render(page);
                expect(html).toContain('Fax, ExtraParams');
                expect(html).toContain('preserved when you save');
            });

            it('shows the purchase-disabled note only when the server says so', () => {
                const base = {
                    state: 'ready', scope: 'house',
                    payload: { contact: {}, source: 'database', effective_configured: true }
                };
                expect(render(make({ ...base, caps: { purchase_enabled: false } })))
                    .toContain('Purchasing is turned off for this deployment');
                expect(render(make({ ...base, caps: {} })))
                    .not.toContain('Purchasing is turned off');
            });

            it('does not strand a pinned user who has no active group', () => {
                // needsGroup with no picker to satisfy it would be a dead end:
                // a message telling them to pick, and nothing to pick with.
                const html = render(make({
                    state: 'ready', scope: 'group', groupId: null, canChooseScope: false
                }));
                expect(html).not.toContain('Pick a group to edit');
                expect(html).toContain('No group is currently selected');
                expect(html).not.toContain('data-action="save-contact"');
            });

            it('offers the clear control only when there is a group row to clear', () => {
                const owned = render(make({
                    state: 'ready', scope: 'group', groupId: 7,
                    payload: { contact: { FirstName: 'A' }, source: 'database', effective_configured: true }
                }));
                expect(owned).toContain('data-action="clear-contact"');
                const house = render(make({
                    state: 'ready', scope: 'house',
                    payload: { contact: { FirstName: 'A' }, source: 'database', effective_configured: true }
                }));
                expect(house).not.toContain('data-action="clear-contact"');
            });
        });

        describe('PII handling in the page itself', () => {
            it('never stores anything in localStorage', () => {
                expect(source).not.toContain('localStorage');
                expect(source).not.toContain('sessionStorage');
            });

            it('never puts a contact in the URL', () => {
                // A group id is fine and deep-links the page; contact values are
                // not. The only navigate/param traffic is the group.
                expect(source).not.toMatch(/navigate\([^)]*contact/i);
                expect(source).not.toMatch(/getParam\(['"](?!group)/);
            });

            it('never logs the contact', () => {
                expect(source).not.toContain('console.log');
                expect(source).not.toContain('console.debug');
            });

            it('escapes the server strings it renders itself', () => {
                // problemItems is interpolated with triple braces, so each item
                // must be escaped individually.
                expect(source).toContain('get problemItems()');
                const getter = source.slice(source.indexOf('get problemItems()'));
                expect(getter.slice(0, getter.indexOf('}\n'))).toContain('escapeHtml');
            });
        });
    });
};
