/**
 * DnsCapabilities.test.js - the group-keyed capability cache and the
 * registrant-contact client (#952).
 *
 * `registrant_contact_configured` stopped being a deployment-wide fact in
 * django-mojo #951: a group with its own registrant contact answers for that
 * contact. A cache that ignores the group therefore answers "yes, you can buy
 * a domain" for a tenant whose own contact is incomplete — the gate passes and
 * the quote fails. That is what this file pins.
 *
 * The other invariant here is small and load-bearing: `group` is OMITTED from
 * a house-scope POST body, never sent as null. The backend's guard is
 * `"group" in request.DATA`, so a null trips a readable-but-wrong 400 on every
 * house-scope save.
 */
module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');
    const { testHelpers } = require('../utils/test-helpers');

    // setup() installs `jest` as a global; it does not exist before this line.
    await testHelpers.setup();
    const jest = global.jest;

    const dnsData = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/dns/dnsData.js'),
        'dnsData'
    );

    const restMock = { GET: jest.fn(), POST: jest.fn() };

    // Captured at load time by the loader's `const rest = global.Rest`
    // transform, so it must be assigned BEFORE the module is loaded. The
    // module keeps its captured reference, which is why the same object can be
    // re-armed per test below.
    global.dnsData = dnsData;
    global.Rest = restMock;
    global.Collection = moduleLoader.loadModule('Collection');
    global.Model = moduleLoader.loadModule('Model');

    // A distinct cache name: loadModuleFromFile caches by name, and a cache hit
    // does NOT re-run the transform — reusing 'Dns' would hand back the
    // instance DnsRecordList.test.js loaded against a different global.Rest.
    const Dns = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/models/Dns.js'),
        'DnsCapabilities'
    );

    // Capture-then-delete: a lingering global leaks into later test files.
    delete global.dnsData;
    delete global.Rest;
    delete global.Collection;
    delete global.Model;

    const registrar = Dns && (Dns.registrar || (Dns.default && Dns.default.registrar));
    const registrantContact = Dns
        && (Dns.registrantContact || (Dns.default && Dns.default.registrantContact));

    /** The real mojo envelope: rest.GET puts the JSON body on response.data. */
    const envelope = (payload) => ({
        success: true,
        data: { status: true, code: 200, data: payload }
    });

    describe('registrar.capabilities — group-keyed cache', () => {

        beforeEach(() => {
            registrar.resetCapabilities();
            restMock.GET.mockReset();
            restMock.POST.mockReset();
        });

        it('is exported alongside resetCapabilities', () => {
            expect(typeof registrar.capabilities).toBe('function');
            expect(typeof registrar.resetCapabilities).toBe('function');
        });

        it('sends no group param when called with no argument', async () => {
            restMock.GET.mockResolvedValue(envelope({ purchase_enabled: true }));
            await registrar.capabilities();
            expect(restMock.GET).toHaveBeenCalledTimes(1);
            expect(restMock.GET.mock.calls[0][0]).toBe('/api/dnsman/config');
            expect(restMock.GET.mock.calls[0][1]).toEqual({});
        });

        it('sends ?group= when called with a group', async () => {
            restMock.GET.mockResolvedValue(envelope({ purchase_enabled: true }));
            await registrar.capabilities(7);
            expect(restMock.GET.mock.calls[0][1]).toEqual({ group: 7 });
        });

        it('serves a repeat call for the same scope from cache', async () => {
            restMock.GET.mockResolvedValue(envelope({ purchase_enabled: true }));
            await registrar.capabilities(7);
            await registrar.capabilities(7);
            expect(restMock.GET).toHaveBeenCalledTimes(1);
        });

        it('does NOT serve one group from another group\'s cache entry', async () => {
            restMock.GET.mockResolvedValue(envelope({ registrant_contact_configured: true }));
            await registrar.capabilities();
            await registrar.capabilities(7);
            await registrar.capabilities(8);
            expect(restMock.GET).toHaveBeenCalledTimes(3);
        });

        it('keeps each scope\'s answer separate', async () => {
            // The whole point: the house contact is configured, this tenant's
            // own row is not. Reading the house answer for the tenant opens a
            // purchase wizard that cannot quote.
            restMock.GET.mockImplementation((url, params) => Promise.resolve(
                envelope({ registrant_contact_configured: !params || !params.group })
            ));
            const house = await registrar.capabilities();
            const tenant = await registrar.capabilities(7);
            expect(house.registrant_contact_configured).toBe(true);
            expect(tenant.registrant_contact_configured).toBe(false);
        });

        it('coalesces concurrent calls for the same scope into one request', async () => {
            restMock.GET.mockResolvedValue(envelope({ purchase_enabled: true }));
            const [a, b] = await Promise.all([registrar.capabilities(7), registrar.capabilities(7)]);
            expect(restMock.GET).toHaveBeenCalledTimes(1);
            expect(a).toBe(b);
        });

        it('resetCapabilities clears every scope, not just the global one', async () => {
            restMock.GET.mockResolvedValue(envelope({ purchase_enabled: true }));
            await registrar.capabilities();
            await registrar.capabilities(7);
            expect(restMock.GET).toHaveBeenCalledTimes(2);

            registrar.resetCapabilities();
            await registrar.capabilities();
            await registrar.capabilities(7);
            expect(restMock.GET).toHaveBeenCalledTimes(4);
        });

        it('falls back to DEFAULT_CAPABILITIES when the endpoint is absent', async () => {
            restMock.GET.mockResolvedValue({ success: false, status: 404, data: null });
            const caps = await registrar.capabilities();
            expect(caps.registrant_contact_configured).toBe(true);
            expect(caps.allowed_record_types.length).toBeGreaterThan(0);
        });

        it('falls back when the request throws outright', async () => {
            restMock.GET.mockRejectedValue(new Error('network down'));
            const caps = await registrar.capabilities(7);
            expect(caps.purchase_enabled).toBe(true);
        });
    });

    describe('registrantContact client', () => {

        beforeEach(() => {
            restMock.GET.mockReset();
            restMock.POST.mockReset();
            restMock.GET.mockResolvedValue(envelope({}));
            restMock.POST.mockResolvedValue(envelope({}));
        });

        it('reads the house scope with no group param', async () => {
            await registrantContact.get();
            expect(restMock.GET.mock.calls[0][0]).toBe('/api/dnsman/registrant');
            expect(restMock.GET.mock.calls[0][1]).toEqual({});
        });

        it('reads a group scope with ?group=', async () => {
            await registrantContact.get(42);
            expect(restMock.GET.mock.calls[0][1]).toEqual({ group: 42 });
        });

        it('OMITS group from a house-scope save body — never sends null', async () => {
            // The backend guard is `"group" in request.DATA`, so a null key
            // earns a readable-but-wrong 400 on every house-scope save.
            await registrantContact.save({ FirstName: 'Ada' });
            const body = restMock.POST.mock.calls[0][1];
            expect(body).not.toHaveProperty('group');
            expect(body.contact).toEqual({ FirstName: 'Ada' });
        });

        it('includes group in a group-scope save body', async () => {
            await registrantContact.save({ FirstName: 'Ada' }, 42);
            expect(restMock.POST.mock.calls[0][1]).toEqual({
                group: 42, contact: { FirstName: 'Ada' }
            });
        });

        it('clears a group scope with {clear:true}', async () => {
            await registrantContact.clear(42);
            expect(restMock.POST.mock.calls[0][1]).toEqual({ group: 42, clear: true });
        });

        it('omits group from a house-scope clear too', async () => {
            await registrantContact.clear();
            expect(restMock.POST.mock.calls[0][1]).not.toHaveProperty('group');
        });
    });
};
