/**
 * DnsRecordList.test.js - the live-provider record collection (#394).
 *
 * `GET /api/dnsman/dns` is the one endpoint in dnsman that is not a CRUD
 * resource: it reads the provider zone live and answers an ID-LESS array inside
 * a non-standard envelope. DnsRecordList.parse() is what turns that into
 * something TableView can render, so it carries the tests.
 */
module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');
    const { testHelpers } = require('../utils/test-helpers');

    await testHelpers.setup();

    // dnsData is a plain dependency-free module; load it first and expose it so
    // the Dns.js transform can resolve its `@ext/admin/dns/dnsData.js` import.
    const dnsData = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/dns/dnsData.js'),
        'dnsData'
    );
    global.dnsData = dnsData;
    const Collection = moduleLoader.loadModule('Collection');
    const Model = moduleLoader.loadModule('Model');
    global.Collection = Collection;
    global.Model = Model;

    const Dns = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/models/Dns.js'),
        'Dns'
    );

    // Capture-then-delete: a lingering global leaks into later test files.
    delete global.dnsData;
    delete global.Collection;
    delete global.Model;

    const DnsRecordList = Dns && (Dns.DnsRecordList || (Dns.default && Dns.default.DnsRecordList));

    // The real mojo envelope: decorators/http.py wraps a returned dict as
    // {status, code, data}, and rest.GET puts the JSON body on response.data.
    const envelope = (payload) => ({
        success: true,
        data: { status: true, code: 200, data: payload }
    });

    describe('DnsRecordList.parse', () => {

        it('is exported and constructs without a network call', () => {
            expect(typeof DnsRecordList).toBe('function');
            const list = new DnsRecordList();
            expect(list.endpoint).toBe('/api/dnsman/dns');
        });

        it('lifts records out of the envelope and gives each a synthetic id', () => {
            const list = new DnsRecordList();
            const rows = list.parse(envelope({
                domain: 'example.com',
                provider: 'route53',
                records: [
                    { type: 'A', name: 'example.com', record_values: ['203.0.113.10'], ttl: 300 },
                    { type: 'A', name: 'www.example.com', record_values: ['203.0.113.10'], ttl: 300 }
                ]
            }));
            expect(rows).toHaveLength(2);
            expect(rows[0].id).toBe('A|example.com');
            expect(rows[1].id).toBe('A|www.example.com');
            // Distinct ids matter: Collection.add() dedupes on id, so a
            // collision would silently drop a record set from the table.
            expect(rows[0].id === rows[1].id).toBe(false);
        });

        it('keeps a single-value record_values as a one-element array', () => {
            const list = new DnsRecordList();
            const rows = list.parse(envelope({
                domain: 'example.com', provider: 'route53',
                records: [{ type: 'CNAME', name: 'www.example.com', record_values: ['t.example.net'], ttl: 300 }]
            }));
            expect(Array.isArray(rows[0].record_values)).toBe(true);
            expect(rows[0].record_values).toEqual(['t.example.net']);
        });

        it('preserves a legitimately multi-valued TXT set', () => {
            // A wildcard and its apex share one _acme-challenge name.
            const list = new DnsRecordList();
            const rows = list.parse(envelope({
                domain: 'example.com', provider: 'route53',
                records: [{
                    type: 'TXT', name: '_acme-challenge.example.com',
                    record_values: ['gX9k2QaKt7Lz1', '7Lm4pZt8Nx2Qv'], ttl: 60
                }]
            }));
            expect(rows[0].record_values).toHaveLength(2);
        });

        it('yields an empty array for an empty zone, not one junk row', () => {
            const list = new DnsRecordList();
            expect(list.parse(envelope({ domain: 'example.com', provider: 'route53', records: [] })))
                .toEqual([]);
        });

        it('survives a malformed or empty payload without throwing', () => {
            const list = new DnsRecordList();
            expect(list.parse(envelope({}))).toEqual([]);
            expect(list.parse({ success: true, data: {} })).toEqual([]);
            expect(list.parse({})).toEqual([]);
        });

        it('captures the provider and domain off the payload', () => {
            const list = new DnsRecordList();
            list.parse(envelope({ domain: 'acme-legacy.net', provider: 'godaddy', records: [] }));
            expect(list.provider).toBe('godaddy');
            expect(list.domainName).toBe('acme-legacy.net');
            expect(list.meta.provider).toBe('godaddy');
        });

        it('reports a count so the toolbar can show one', () => {
            const list = new DnsRecordList();
            list.parse(envelope({
                domain: 'example.com', provider: 'route53',
                records: [
                    { type: 'A', name: 'example.com', record_values: ['203.0.113.10'], ttl: 300 },
                    { type: 'MX', name: 'example.com', record_values: ['10 m.example.net'], ttl: 300 }
                ]
            }));
            expect(list.meta.count).toBe(2);
        });
    });
};
