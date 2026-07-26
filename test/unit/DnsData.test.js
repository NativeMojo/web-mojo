/**
 * DnsData.test.js - unit tests for the general dnsman admin helpers (#394).
 *
 * dnsData.js is dependency-free ESM; load it through the simple-module-loader
 * transform, same as GeofenceData.test.js. Record parsing/validation lives in
 * DnsRecordValidation.test.js — this file covers the rest.
 */
module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');

    const dnsData = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/dns/dnsData.js'),
        'dnsData'
    );
    const {
        DNS_RECORD_TYPES,
        DEFAULT_CAPABILITIES,
        providerLabel,
        isManagementOnly,
        requiresCredential,
        availabilityState,
        exceedsPriceCap,
        certExpiryTone,
        recordKey,
        isSpentAcmeChallenge,
        isAcmeChallenge,
        isIPv4,
        isIPv6,
        isHostname,
        toFqdn,
        isInZone,
        hasValidLabels
    } = dnsData;

    // The shipped provider matrix from GET /api/dnsman/config (v1.2.55).
    const CAPS = {
        ...DEFAULT_CAPABILITIES,
        max_domain_price: '20.00',
        cert_renew_days: 30,
        providers: [
            { name: 'route53', purchase: true, requires_credential: false },
            { name: 'godaddy', purchase: false, requires_credential: true }
        ]
    };

    describe('dnsData', () => {

        describe('IP and hostname primitives', () => {
            it('accepts valid IPv4 and rejects out-of-range octets', () => {
                expect(isIPv4('203.0.113.10')).toBe(true);
                expect(isIPv4('0.0.0.0')).toBe(true);
                expect(isIPv4('256.0.0.1')).toBe(false);
                expect(isIPv4('203.0.113')).toBe(false);
                expect(isIPv4('::1')).toBe(false);
            });

            it('accepts valid IPv6 including compressed and v4-tailed forms', () => {
                expect(isIPv6('2606:4700:4700::1111')).toBe(true);
                expect(isIPv6('::1')).toBe(true);
                expect(isIPv6('::ffff:203.0.113.10')).toBe(true);
                expect(isIPv6('2606::4700::1111')).toBe(false); // two '::'
                expect(isIPv6('203.0.113.10')).toBe(false);
            });

            it('treats an IP as not a hostname', () => {
                expect(isHostname('mail.example.com')).toBe(true);
                expect(isHostname('_acme-challenge.example.com')).toBe(true);
                expect(isHostname('203.0.113.10')).toBe(false);
                expect(isHostname('::1')).toBe(false);
                expect(isHostname('localhost')).toBe(false); // needs a dot
            });
        });

        describe('names and zones', () => {
            it('resolves relative, apex and FQDN forms to the same record', () => {
                expect(toFqdn('www', 'example.com')).toBe('www.example.com');
                expect(toFqdn('@', 'example.com')).toBe('example.com');
                expect(toFqdn('', 'example.com')).toBe('example.com');
                expect(toFqdn('www.example.com.', 'example.com')).toBe('www.example.com');
                expect(toFqdn('WWW', 'example.com')).toBe('www.example.com');
            });

            it('does not re-suffix an out-of-zone FQDN', () => {
                // The backend guards this explicitly; silently producing
                // www.attacker.com.example.com would accept a request meant for
                // somewhere else entirely.
                expect(toFqdn('www.attacker.com', 'example.com')).toBe('www.attacker.com');
                expect(isInZone('www.attacker.com', 'example.com')).toBe(false);
                expect(isInZone('www.example.com', 'example.com')).toBe(true);
                expect(isInZone('example.com', 'example.com')).toBe(true);
                expect(isInZone('notexample.com', 'example.com')).toBe(false);
            });

            it('allows a wildcard only as the leftmost label', () => {
                expect(hasValidLabels('*.example.com')).toBe(true);
                expect(hasValidLabels('www.example.com')).toBe(true);
                expect(hasValidLabels('a.*.example.com')).toBe(false);
                expect(hasValidLabels('bad label.example.com')).toBe(false);
                expect(hasValidLabels('-lead.example.com')).toBe(false);
            });
        });

        describe('provider capabilities', () => {
            it('reads management-only from the server provider matrix', () => {
                expect(isManagementOnly({ provider: 'godaddy' }, CAPS)).toBe(true);
                expect(isManagementOnly({ provider: 'route53' }, CAPS)).toBe(false);
                expect(requiresCredential('godaddy', CAPS)).toBe(true);
                expect(requiresCredential('route53', CAPS)).toBe(false);
            });

            it('honours a hypothetical third purchasing provider without a code change', () => {
                const caps = { providers: [{ name: 'gandi', purchase: true, requires_credential: true }] };
                expect(isManagementOnly({ provider: 'gandi' }, caps)).toBe(false);
                expect(requiresCredential('gandi', caps)).toBe(true);
            });

            it('falls back to the route53 test when capabilities are unavailable', () => {
                expect(isManagementOnly({ provider: 'godaddy' }, DEFAULT_CAPABILITIES)).toBe(true);
                expect(isManagementOnly({ provider: 'route53' }, DEFAULT_CAPABILITIES)).toBe(false);
                expect(isManagementOnly({ provider: 'godaddy' }, null)).toBe(true);
            });

            it('reads a provider off a Model-shaped object', () => {
                const model = { get: key => (key === 'provider' ? 'godaddy' : null) };
                expect(isManagementOnly(model, CAPS)).toBe(true);
            });

            it('labels known providers and title-cases unknown ones', () => {
                expect(providerLabel('route53')).toBe('Route 53');
                expect(providerLabel('godaddy')).toBe('GoDaddy');
                expect(providerLabel('gandi')).toBe('Gandi');
            });
        });

        describe('availabilityState — the tri-state guard', () => {
            it('maps a definite yes and a definite no', () => {
                expect(availabilityState({ available: true, tld_supported: true })).toBe('available');
                expect(availabilityState({ available: false, tld_supported: true })).toBe('taken');
            });

            it('NEVER reports null as taken', () => {
                // Telling a user a buyable name is gone is the worst failure
                // this surface can produce.
                expect(availabilityState({ available: null, tld_supported: true })).toBe('unknown');
                expect(availabilityState({ available: undefined })).toBe('unknown');
                expect(availabilityState({})).toBe('unknown');
                expect(availabilityState(null)).toBe('unknown');
            });

            it('reports an unsold TLD as unsupported, not taken', () => {
                expect(availabilityState({ available: false, tld_supported: false })).toBe('unsupported');
            });

            it('gives an unanswered registry precedence over TLD support, matching the backend', () => {
                // registrar._reason_for checks available is None first.
                expect(availabilityState({ available: null, tld_supported: false })).toBe('unknown');
            });
        });

        describe('exceedsPriceCap', () => {
            it('compares against max_domain_price arriving as a string', () => {
                // The backend sends str(Decimal).
                expect(exceedsPriceCap({ price: 39 }, CAPS)).toBe(true);
                expect(exceedsPriceCap({ price: 14 }, CAPS)).toBe(false);
                expect(exceedsPriceCap({ price: 20 }, CAPS)).toBe(false); // equal is not over
            });

            it('is false when either side is missing', () => {
                expect(exceedsPriceCap({ price: null }, CAPS)).toBe(false);
                expect(exceedsPriceCap({}, CAPS)).toBe(false);
                expect(exceedsPriceCap({ price: 100 }, DEFAULT_CAPABILITIES)).toBe(false);
                expect(exceedsPriceCap({ price: 100 }, null)).toBe(false);
            });
        });

        describe('certExpiryTone', () => {
            it('derives its thresholds from the server renewal window', () => {
                expect(certExpiryTone(70, CAPS)).toBe('success');
                expect(certExpiryTone(25, CAPS)).toBe('warning');
                expect(certExpiryTone(10, CAPS)).toBe('danger');
                expect(certExpiryTone(0, CAPS)).toBe('danger');
                expect(certExpiryTone(-3, CAPS)).toBe('danger');
            });

            it('moves with cert_renew_days rather than hardcoding 14/30', () => {
                const long = { ...CAPS, cert_renew_days: 60 };
                // 25 days is comfortable at a 30-day window and urgent at a 60-day one.
                expect(certExpiryTone(25, CAPS)).toBe('warning');
                expect(certExpiryTone(25, long)).toBe('danger');
                expect(certExpiryTone(45, long)).toBe('warning');
                expect(certExpiryTone(70, long)).toBe('success');
            });

            it('is secondary when days_remaining is null', () => {
                expect(certExpiryTone(null, CAPS)).toBe('secondary');
                expect(certExpiryTone(undefined, CAPS)).toBe('secondary');
                expect(certExpiryTone('', CAPS)).toBe('secondary');
            });
        });

        describe('record identity and spent challenges', () => {
            it('builds a stable synthetic id, case and trailing dot insensitive', () => {
                expect(recordKey({ type: 'a', name: 'WWW.example.com.' })).toBe('A|www.example.com');
                expect(recordKey({ type: 'A', name: 'www.example.com' }))
                    .toBe(recordKey({ type: 'a', name: 'www.example.com.' }));
            });

            it('recognises ONLY the exact retired placeholder as spent', () => {
                const spent = { type: 'TXT', name: '_acme-challenge.example.com', record_values: ['retired'] };
                const live = { type: 'TXT', name: '_acme-challenge.example.com', record_values: ['gX9k2QaKt7Lz1'] };
                const two = { type: 'TXT', name: '_acme-challenge.example.com', record_values: ['retired', 'gX9k2'] };
                expect(isSpentAcmeChallenge(spent)).toBe(true);
                expect(isSpentAcmeChallenge(live)).toBe(false);
                expect(isSpentAcmeChallenge(two)).toBe(false);
                expect(isSpentAcmeChallenge({ type: 'A', name: '_acme-challenge.example.com', record_values: ['retired'] })).toBe(false);
                expect(isSpentAcmeChallenge(null)).toBe(false);
            });

            it('identifies a challenge record regardless of whether it is spent', () => {
                expect(isAcmeChallenge({ type: 'TXT', name: '_acme-challenge.example.com' })).toBe(true);
                expect(isAcmeChallenge({ type: 'TXT', name: 'www.example.com' })).toBe(false);
            });
        });

        describe('defaults', () => {
            it('ships the eight backend record types', () => {
                expect(DNS_RECORD_TYPES).toEqual(['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'SRV', 'CAA', 'NS']);
            });

            it('defaults to batch-unsupported so an old backend degrades to one row', () => {
                expect(DEFAULT_CAPABILITIES.search_batch_limit).toBe(0);
                expect(DEFAULT_CAPABILITIES.suggestions_enabled).toBe(false);
                // ...but permissive everywhere else, so nothing blanks out.
                expect(DEFAULT_CAPABILITIES.purchase_enabled).toBe(true);
                expect(DEFAULT_CAPABILITIES.acme.configured).toBe(true);
            });
        });
    });
};
