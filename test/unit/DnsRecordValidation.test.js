/**
 * DnsRecordValidation.test.js - the DNS record editor's correctness (#394).
 *
 * DNS record editing is where people break production, and the backend
 * deliberately validates STRUCTURE (zone containment, apex NS/SOA, label
 * charset, wildcard position) but never VALUE SYNTAX. Everything asserted here
 * is the layer that closes that gap, plus the two guards against silent
 * failure: TXT double-quoting and the whole-set-replace diff.
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
        RECORD_SPECS,
        parseRecordValue,
        formatRecordValue,
        autofixRecordValue,
        autofixFieldValue,
        normalizeRecordValues,
        validateRecordSet,
        recordWarnings,
        diffRecordValues,
        blankValue
    } = dnsData;

    const ZONE = 'example.com';
    const CAPS = { allowed_record_types: ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'SRV', 'CAA', 'NS'] };

    const ok = (opts) => validateRecordSet({ zone: ZONE, caps: CAPS, ...opts });
    const messages = (result) => result.errors.map(e => e.message).join(' | ');

    describe('dnsData record editor', () => {

        // ── Round trip ──────────────────────────────────────────────────────
        // The property that keeps the structured editor honest: a value loaded
        // from the provider, split into fields, and re-serialised must be
        // byte-identical, or editing one field would corrupt the others.

        describe('parse/format round trip', () => {
            const CASES = [
                ['A', '203.0.113.10'],
                ['AAAA', '2606:4700:4700::1111'],
                ['CNAME', 'target.example.net'],
                ['NS', 'ns-102.awsdns-12.com'],
                ['TXT', 'v=spf1 include:amazonses.com ~all'],
                ['MX', '10 inbound-smtp.us-west-2.amazonaws.com'],
                ['SRV', '10 5 443 sip.example.net'],
                ['CAA', '0 issue "letsencrypt.org"']
            ];

            CASES.forEach(([type, wire]) => {
                it(`round-trips ${type}`, () => {
                    expect(formatRecordValue(type, parseRecordValue(type, wire))).toBe(wire);
                });
            });

            it('splits multi-field types into their named parts', () => {
                expect(parseRecordValue('MX', '10 mail.example.net'))
                    .toEqual({ priority: '10', target: 'mail.example.net' });
                expect(parseRecordValue('SRV', '10 5 443 sip.example.net'))
                    .toEqual({ priority: '10', weight: '5', port: '443', target: 'sip.example.net' });
                expect(parseRecordValue('CAA', '0 issue "letsencrypt.org"'))
                    .toEqual({ flags: '0', tag: 'issue', value: 'letsencrypt.org' });
            });

            it('keeps a TXT value with internal spaces whole', () => {
                const wire = 'v=spf1 include:amazonses.com ~all';
                expect(parseRecordValue('TXT', wire)).toEqual({ text: wire });
            });

            it('seeds sensible defaults for a new value', () => {
                expect(blankValue('MX')).toEqual({ priority: '10', target: '' });
                expect(blankValue('CAA')).toEqual({ flags: '0', tag: 'issue', value: '' });
            });

            it('marks CNAME as single-valued in the spec', () => {
                expect(RECORD_SPECS.CNAME.multi).toBe(false);
                expect(RECORD_SPECS.MX.multi).toBe(true);
            });
        });

        // ── Autofix ─────────────────────────────────────────────────────────

        describe('autofix', () => {
            it('strips a pasted URL down to the hostname', () => {
                const result = autofixRecordValue('CNAME', 'https://mail.example.com/inbox');
                expect(result.value).toBe('mail.example.com');
                expect(result.fixes.join(' ')).toContain('scheme');
                expect(result.fixes.join(' ')).toContain('path');
            });

            it('lowercases hostnames and drops the trailing dot', () => {
                const result = autofixRecordValue('CNAME', 'Mail.Example.COM.');
                expect(result.value).toBe('mail.example.com');
                expect(result.fixes.length).toBeGreaterThan(0);
            });

            it('replaces curly quotes', () => {
                const curly = 'v=spf1 ' + String.fromCharCode(0x201c) + 'x' + String.fromCharCode(0x201d);
                const result = autofixRecordValue('TXT', curly);
                expect(result.value).toBe('v=spf1 "x"');
                expect(result.fixes.join(' ')).toContain('curly quotes');
            });

            it('removes zero-width and non-breaking characters', () => {
                const dirty = '203.0.113.10' + String.fromCharCode(0x200b);
                const result = autofixRecordValue('A', dirty);
                expect(result.value).toBe('203.0.113.10');
                expect(result.fixes.join(' ')).toContain('invisible');

                const nbsp = autofixRecordValue('MX', '10' + String.fromCharCode(0xa0) + 'mail.example.net');
                expect(nbsp.value).toBe('10 mail.example.net');
                expect(nbsp.fixes.join(' ')).toContain('non-breaking');
            });

            it('unbrackets an IPv6 address', () => {
                const result = autofixRecordValue('AAAA', '[2606:4700:4700::1111]');
                expect(result.value).toBe('2606:4700:4700::1111');
                expect(result.fixes.join(' ')).toContain('square brackets');
            });

            it('splits a bare "10 mail.example.net" into MX priority and target', () => {
                const result = autofixRecordValue('MX', '10 mail.example.net');
                expect(result.parts).toEqual({ priority: '10', target: 'mail.example.net' });
            });

            it('reports every change — a silent autofix is a bug', () => {
                const clean = autofixRecordValue('A', '203.0.113.10');
                expect(clean.fixes).toEqual([]);
                const dirty = autofixRecordValue('CNAME', '  HTTPS://Mail.Example.com/x  ');
                expect(dirty.fixes.length).toBeGreaterThanOrEqual(3);
            });

            describe('TXT quoting — the silent-breakage guard', () => {
                it('strips quotes the user added around a TXT value', () => {
                    // Route53 re-quotes and 255-chunks TXT itself; a
                    // double-quoted value breaks SPF/DKIM and ACME validation
                    // with NO error surfaced anywhere.
                    const result = autofixRecordValue('TXT', '"v=spf1 include:amazonses.com ~all"');
                    expect(result.value).toBe('v=spf1 include:amazonses.com ~all');
                    expect(result.fixes.join(' ')).toContain('surrounding quotes');
                });

                it('leaves legitimate inner quotes alone', () => {
                    const result = autofixRecordValue('TXT', 'k=rsa; p="MIIB" tail');
                    expect(result.value).toBe('k=rsa; p="MIIB" tail');
                    expect(result.fixes.join(' ')).not.toContain('surrounding quotes');
                });

                it('does not treat a lone quote as a wrapper', () => {
                    expect(autofixFieldValue('text', '"unbalanced').value).toBe('"unbalanced');
                });
            });
        });

        describe('normalizeRecordValues', () => {
            it('accepts textarea, array and single-string input', () => {
                expect(normalizeRecordValues('a\nb')).toEqual(['a', 'b']);
                expect(normalizeRecordValues(['a', 'b'])).toEqual(['a', 'b']);
                expect(normalizeRecordValues('a')).toEqual(['a']);
                expect(normalizeRecordValues(null)).toEqual([]);
            });

            it('drops blanks and duplicates and trims', () => {
                expect(normalizeRecordValues('a\n\n  b  \na')).toEqual(['a', 'b']);
            });
        });

        // ── Blocking validation ─────────────────────────────────────────────

        describe('value syntax the backend does not check', () => {
            it('rejects IPv6 in an A record and offers the type swap', () => {
                const result = ok({ type: 'A', name: 'www', values: ['2606:4700:4700::1111'] });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('IPv6');
                const swap = result.errors.find(e => e.fix);
                expect(swap.fix.action).toBe('change-type');
                expect(swap.fix.type).toBe('AAAA');
            });

            it('rejects IPv4 in an AAAA record and offers the reverse swap', () => {
                const result = ok({ type: 'AAAA', name: 'www', values: ['203.0.113.10'] });
                expect(result.ok).toBe(false);
                expect(result.errors.find(e => e.fix).fix.type).toBe('A');
            });

            it('offers no swap for a value that is neither', () => {
                const result = ok({ type: 'A', name: 'www', values: ['not-an-ip'] });
                expect(result.ok).toBe(false);
                expect(result.errors.some(e => e.fix)).toBe(false);
            });

            it('rejects an IP where a hostname belongs', () => {
                const result = ok({ type: 'CNAME', name: 'www', values: ['203.0.113.10'] });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('hostname, not an IP');
            });

            it('requires every field of a multi-field type', () => {
                expect(ok({ type: 'MX', name: '@', values: ['mail.example.net'] }).ok).toBe(false);
                expect(ok({ type: 'MX', name: '@', values: ['10 mail.example.net'] }).ok).toBe(true);
                // A dotted name is fully qualified to the backend, so an SRV
                // name has to carry the zone (see the out-of-zone test below).
                expect(ok({ type: 'SRV', name: '_sip._tcp.example.com', values: ['10 5 sip.example.net'] }).ok).toBe(false);
                expect(ok({ type: 'SRV', name: '_sip._tcp.example.com', values: ['10 5 443 sip.example.net'] }).ok).toBe(true);
            });

            it('enforces numeric ranges', () => {
                expect(ok({ type: 'MX', name: '@', values: ['70000 mail.example.net'] }).ok).toBe(false);
                expect(ok({ type: 'CAA', name: '@', values: ['300 issue "x.example.com"'] }).ok).toBe(false);
                expect(ok({ type: 'SRV', name: '_sip._tcp.example.com', values: ['10 5 0 sip.example.net'] }).ok).toBe(false);
            });

            it('enforces the CAA tag vocabulary', () => {
                expect(ok({ type: 'CAA', name: '@', values: ['0 issue "letsencrypt.org"'] }).ok).toBe(true);
                const bad = ok({ type: 'CAA', name: '@', values: ['0 nonsense "letsencrypt.org"'] });
                expect(bad.ok).toBe(false);
                expect(messages(bad)).toContain('issue, issuewild, iodef');
            });

            it('bounds TTL', () => {
                expect(ok({ type: 'A', name: 'www', values: ['203.0.113.10'], ttl: 300 }).ok).toBe(true);
                expect(ok({ type: 'A', name: 'www', values: ['203.0.113.10'], ttl: 30 }).ok).toBe(false);
                expect(ok({ type: 'A', name: 'www', values: ['203.0.113.10'], ttl: 999999 }).ok).toBe(false);
            });
        });

        describe('CNAME rules', () => {
            it('refuses a CNAME at the apex', () => {
                const result = ok({ type: 'CNAME', name: '@', values: ['target.example.net'] });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('apex');
            });

            it('refuses more than one value', () => {
                const result = ok({ type: 'CNAME', name: 'www', values: ['a.example.net', 'b.example.net'] });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('exactly one value');
            });

            it('refuses a CNAME colliding with an existing record at that name', () => {
                const existing = [{ type: 'A', name: 'www.example.com', record_values: ['203.0.113.10'] }];
                const result = ok({ type: 'CNAME', name: 'www', values: ['t.example.net'], existingRecords: existing });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain("can't coexist");
            });

            it('refuses another type at a name that already holds a CNAME', () => {
                const existing = [{ type: 'CNAME', name: 'www.example.com', record_values: ['t.example.net'] }];
                const result = ok({ type: 'A', name: 'www', values: ['203.0.113.10'], existingRecords: existing });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('CNAME');
            });

            it('allows editing the CNAME that is already there', () => {
                const existing = [{ type: 'CNAME', name: 'www.example.com', record_values: ['old.example.net'] }];
                const result = ok({ type: 'CNAME', name: 'www', values: ['new.example.net'], existingRecords: existing });
                expect(result.ok).toBe(true);
            });
        });

        describe('rules mirrored from the backend', () => {
            it('refuses the apex NS record set', () => {
                const result = ok({ type: 'NS', name: '@', values: ['ns-1.awsdns-01.com'] });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('off the internet');
            });

            it('allows a delegated sub-zone NS', () => {
                expect(ok({ type: 'NS', name: 'sub', values: ['ns-1.awsdns-01.com'] }).ok).toBe(true);
            });

            it('refuses a name outside the zone and suggests the in-zone form', () => {
                // The backend treats any dotted name as an FQDN and refuses it
                // rather than re-suffixing, which would silently accept a write
                // meant for another domain. Its message stops there; ours does
                // not, because a relative "_sip._tcp" hits the same wall.
                const result = ok({ type: 'A', name: 'www.attacker.com', values: ['203.0.113.10'] });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('not inside');
                const fix = result.errors.find(e => e.fix);
                expect(fix.fix.action).toBe('set-name');
                expect(fix.fix.name).toBe('www.attacker.com.example.com');
            });

            it('refuses a misplaced wildcard inside the zone', () => {
                const result = ok({ type: 'A', name: 'a.*.example.com', values: ['203.0.113.10'] });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('leftmost');
            });

            it('accepts a leftmost wildcard', () => {
                expect(ok({ type: 'A', name: '*', values: ['203.0.113.10'] }).ok).toBe(true);
            });

            it('refuses a type outside the server allowlist', () => {
                const narrow = { allowed_record_types: ['A', 'TXT'] };
                const result = validateRecordSet({
                    type: 'MX', name: '@', values: ['10 m.example.net'], zone: ZONE, caps: narrow
                });
                expect(result.ok).toBe(false);
                expect(messages(result)).toContain('not an allowed record type');
            });

            it('requires at least one value', () => {
                expect(ok({ type: 'A', name: 'www', values: [] }).ok).toBe(false);
            });
        });

        // ── Warnings ────────────────────────────────────────────────────────

        describe('warnings do not block', () => {
            const warn = (opts) => recordWarnings({ zone: ZONE, ...opts });

            it('warns on a LIVE acme challenge but not a spent one', () => {
                const live = [{ type: 'TXT', name: '_acme-challenge.example.com', record_values: ['gX9k2'] }];
                const spent = [{ type: 'TXT', name: '_acme-challenge.example.com', record_values: ['retired'] }];
                expect(warn({ type: 'TXT', name: '_acme-challenge', values: ['new'], existingRecords: live })
                    .join(' ')).toContain('in flight');
                expect(warn({ type: 'TXT', name: '_acme-challenge', values: ['new'], existingRecords: spent })
                    .join(' ')).not.toContain('in flight');
            });

            it('warns when the apex or www address record is being removed', () => {
                expect(warn({ type: 'A', name: '@', values: [], deleting: true }).join(' ')).toContain('offline');
                expect(warn({ type: 'A', name: 'www', values: [], deleting: true }).join(' ')).toContain('offline');
                expect(warn({ type: 'A', name: 'staging', values: [], deleting: true }).join(' ')).not.toContain('offline');
            });

            it('warns on any MX change and on wildcards and short TTLs', () => {
                expect(warn({ type: 'MX', name: '@', values: ['10 m.example.net'] }).join(' ')).toContain('mail');
                expect(warn({ type: 'A', name: '*', values: ['203.0.113.10'] }).join(' ')).toContain('wildcard');
                expect(warn({ type: 'A', name: 'www', values: ['203.0.113.10'], ttl: 60 }).join(' ')).toContain('short');
            });

            it('warns when the value set SHRINKS — the 3-to-1 footgun', () => {
                const out = warn({
                    type: 'TXT', name: 'x', before: ['a', 'b', 'c'], values: ['a']
                });
                expect(out.join(' ')).toContain('2 existing values will be removed');
            });

            it('stays quiet on a same-size swap, so the real warning keeps its weight', () => {
                // Changing an A record's address removes a value too. Warning
                // on that trains people to click through the one that matters.
                expect(warn({ type: 'A', name: 'staging', before: ['203.0.113.9'], values: ['203.0.113.10'], ttl: 300 }))
                    .toEqual([]);
                expect(warn({ type: 'TXT', name: 'x', before: ['a', 'b'], values: ['c', 'd'] }))
                    .toEqual([]);
            });
        });

        // ── Diff — the whole-set-replace guard ──────────────────────────────

        describe('diffRecordValues', () => {
            it('reports the three-to-one shrink the confirm exists to catch', () => {
                const diff = diffRecordValues(['a', 'b', 'c'], ['a', 'd']);
                expect(diff.removed).toEqual(['b', 'c']);
                expect(diff.added).toEqual(['d']);
                expect(diff.unchanged).toEqual(['a']);
            });

            it('reports nothing removed for a pure addition', () => {
                const diff = diffRecordValues(['a'], ['a', 'b']);
                expect(diff.removed).toEqual([]);
                expect(diff.added).toEqual(['b']);
            });

            it('handles an empty before (a brand new record)', () => {
                expect(diffRecordValues([], ['a']).removed).toEqual([]);
                expect(diffRecordValues(null, ['a']).added).toEqual(['a']);
            });

            it('treats a full delete as every value removed', () => {
                expect(diffRecordValues(['a', 'b'], []).removed).toEqual(['a', 'b']);
            });
        });
    });
};
