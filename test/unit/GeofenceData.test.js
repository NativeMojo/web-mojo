/**
 * GeofenceData.test.js - unit tests for the pure geofence rule/decision
 * mapping helpers behind the Admin › Security › Geofencing UI (ITEM-023).
 *
 * geofenceData.js is dependency-free ESM; load it through the
 * simple-module-loader transform (same mechanism as the framework classes).
 */
module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');

    const gd = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/security/geofence/geofenceData.js'),
        'geofenceData'
    );
    const {
        US_STATES,
        ABUSE_FLAGS,
        coerceRuleInput,
        regionName,
        scopeLabel,
        collectScopes,
        describeDecision,
        describeWouldBlock,
        isAdvancedRule,
        ruleToForm,
        formToRule,
        describeRule,
        buildGroupRulePayload,
        buildSimulateBody
    } = gd;

    describe('geofenceData', () => {

        describe('static data', () => {
            it('ships 51 US states/DC with US- prefixed codes', () => {
                expect(US_STATES).toHaveLength(51);
                expect(US_STATES.every(s => /^US-[A-Z]{2}$/.test(s.value))).toBe(true);
                expect(regionName('US-WA')).toBe('Washington');
                expect(regionName('us-wa')).toBe('Washington');
                expect(regionName('CA-ON')).toBe('CA-ON'); // unknown → raw code
                expect(regionName('')).toBe('');
            });

            it('labels known scopes and falls back to the raw scope name', () => {
                expect(scopeLabel('auth')).toBe('Sign-in endpoints (auth)');
                expect(scopeLabel('payments')).toBe('payments endpoints');
                expect(scopeLabel('')).toBe('All endpoints');
            });

            it('collects scopes from enforced_endpoints and fail_closed_scopes', () => {
                const config = {
                    enforced_endpoints: [
                        { endpoint: 'a', scope: 'auth' },
                        { endpoint: 'b', scope: 'auth' },
                        { endpoint: 'c', scope: 'payments' }
                    ],
                    posture: { fail_closed_scopes: ['payments', 'checkout'] }
                };
                expect(collectScopes(config)).toEqual(['auth', 'checkout', 'payments']);
                expect(collectScopes({})).toEqual([]);
                expect(collectScopes(null)).toEqual([]);
            });
        });

        describe('describeDecision', () => {
            it('covers every documented reason code with a plain-language sentence', () => {
                const cases = {
                    no_rules: 'Allowed — no geofence rules are configured.',
                    disabled: 'Allowed — geofencing is turned off.',
                    bypass: 'Allowed — this user bypasses geofencing.',
                    passed: 'Allowed — no rules match this location.',
                    private_ip: 'Allowed — private/internal network address.',
                    tor_detected: 'Blocked — Tor connection detected.',
                    vpn_detected: 'Blocked — VPN connection detected.',
                    proxy_detected: 'Blocked — open proxy detected.',
                    datacenter_detected: 'Blocked — datacenter IP detected.',
                    rule_invalid: 'Request denied — an invalid rule reached the engine. Check recent rule edits.',
                    group_inactive: 'This group is inactive — platform rules were applied.'
                };
                for (const [reason, text] of Object.entries(cases)) {
                    expect(describeDecision({ reason })).toBe(text);
                }
            });

            it('renders region_not_allowed with the state name from the region code', () => {
                const msg = describeDecision({ reason: 'region_not_allowed', region_code: 'US-WA', allowed: false });
                expect(msg).toBe('Blocked — Washington is not allowed by the rules.');
            });

            it('renders country_not_allowed with the country field when present', () => {
                expect(describeDecision({ reason: 'country_not_allowed', country: 'Belarus' }))
                    .toBe('Blocked — Belarus is not allowed by the rules.');
                expect(describeDecision({ reason: 'country_not_allowed', country_code: 'BY' }))
                    .toBe('Blocked — BY is not allowed by the rules.');
            });

            it('splits lookup_failed by fail posture (allowed flag)', () => {
                expect(describeDecision({ reason: 'lookup_failed', allowed: true })).toMatch(/fail-open/);
                expect(describeDecision({ reason: 'lookup_failed', allowed: false })).toMatch(/fail-closed/);
            });

            it('renders ip_allowlisted with the exemption reason', () => {
                expect(describeDecision({ reason: 'ip_allowlisted', allowlist_reason: 'office egress' }))
                    .toBe('Allowed by exemption (office egress).');
                expect(describeDecision({ reason: 'ip_allowlisted' }))
                    .toBe('Allowed by exemption.');
            });

            it('degrades safely on unknown reason codes', () => {
                expect(describeDecision({ reason: 'brand_new_code', allowed: false }))
                    .toBe('Blocked — reason: brand new code.');
                expect(describeDecision({ reason: 'brand_new_code', allowed: true }))
                    .toBe('Allowed — reason: brand new code.');
                expect(describeDecision(null)).toBe('Decision.');
            });
        });

        describe('describeWouldBlock', () => {
            it('explains the shadow outcome for exempted decisions', () => {
                const msg = describeWouldBlock({
                    reason: 'ip_allowlisted',
                    would_block: true,
                    would_block_reason: 'country_not_allowed',
                    country: 'France'
                });
                expect(msg).toBe('Without this exemption the request would be blocked: France is not allowed by the rules.');
            });

            it('returns empty when not an exempted-with-shadow decision', () => {
                expect(describeWouldBlock({ reason: 'passed' })).toBe('');
                expect(describeWouldBlock({ reason: 'ip_allowlisted', would_block: false })).toBe('');
                expect(describeWouldBlock(null)).toBe('');
            });
        });

        describe('isAdvancedRule', () => {
            it('accepts everything the friendly editor can produce', () => {
                expect(isAdvancedRule(null)).toBe(false);
                expect(isAdvancedRule(undefined)).toBe(false);
                expect(isAdvancedRule({})).toBe(false);
                expect(isAdvancedRule({ country: { not_in: ['BY', 'RU'] } })).toBe(false);
                expect(isAdvancedRule({ country: { in: ['US', 'CA'] } })).toBe(false);
                expect(isAdvancedRule({ region: { not_in: ['US-WA', 'US-MI'] } })).toBe(false);
                expect(isAdvancedRule({ abuse: { vpn: false, tor: false } })).toBe(false);
                expect(isAdvancedRule({
                    country: { in: ['US'] },
                    region: { not_in: ['US-WA'] },
                    abuse: { vpn: false }
                })).toBe(false);
            });

            it('flags DSL shapes the editor cannot represent', () => {
                expect(isAdvancedRule({ country: { eq: 'US' } })).toBe(true);                  // eq
                expect(isAdvancedRule({ country: { in: ['US'], not_in: ['RU'] } })).toBe(true); // multi-op
                expect(isAdvancedRule({ region: { in: ['US-FL'] } })).toBe(true);               // region allow-list
                expect(isAdvancedRule({ region: { not_in: ['CA-ON'] } })).toBe(true);           // non-US region
                expect(isAdvancedRule({ abuse: { vpn: true } })).toBe(true);                    // require-flag
                expect(isAdvancedRule({ abuse: { residential: false } })).toBe(true);           // unknown flag
                expect(isAdvancedRule({ city: { in: ['SEA'] } })).toBe(true);                   // unknown key
                expect(isAdvancedRule({ country: 'US' })).toBe(true);                           // non-dict body
                expect(isAdvancedRule([])).toBe(true);                                          // non-dict rule
            });
        });

        describe('formToRule / ruleToForm round-trip', () => {
            it('round-trips every representable combination', () => {
                const forms = [
                    { country_mode: 'block', countries: ['BY', 'RU'], blocked_states: [], block_vpn: false, block_tor: false, block_proxy: false, block_datacenter: false },
                    { country_mode: 'allow', countries: ['US', 'CA'], blocked_states: [], block_vpn: false, block_tor: false, block_proxy: false, block_datacenter: false },
                    { country_mode: '', countries: [], blocked_states: ['US-WA', 'US-MI'], block_vpn: false, block_tor: false, block_proxy: false, block_datacenter: false },
                    { country_mode: '', countries: [], blocked_states: [], block_vpn: true, block_tor: true, block_proxy: false, block_datacenter: false },
                    { country_mode: 'block', countries: ['BY'], blocked_states: ['US-WA'], block_vpn: true, block_tor: true, block_proxy: true, block_datacenter: true }
                ];
                for (const form of forms) {
                    const rule = formToRule(form);
                    expect(isAdvancedRule(rule)).toBe(false);
                    expect(ruleToForm(rule)).toEqual(form);
                }
            });

            it('produces an empty rule from an empty form', () => {
                expect(formToRule({ country_mode: '', countries: [], blocked_states: [] })).toEqual({});
            });

            it('ignores a country mode with no countries selected', () => {
                expect(formToRule({ country_mode: 'block', countries: [], blocked_states: [] })).toEqual({});
            });

            it('uppercases codes on assembly', () => {
                expect(formToRule({ country_mode: 'block', countries: ['by'], blocked_states: ['us-wa'] }))
                    .toEqual({ country: { not_in: ['BY'] }, region: { not_in: ['US-WA'] } });
            });
        });

        describe('describeRule', () => {
            it('renders plain-language clauses with names', () => {
                const clauses = describeRule(
                    { country: { not_in: ['BY'] }, region: { not_in: ['US-WA'] }, abuse: { vpn: false, tor: false } },
                    { countryName: c => (c === 'BY' ? 'Belarus' : c) }
                );
                const texts = clauses.map(c => c.text);
                expect(texts).toContain('Blocked countries: Belarus.');
                expect(texts).toContain('Blocked US states / regions: Washington.');
                expect(texts).toContain('VPN connections, Tor connections are blocked.');
            });

            it('returns no clauses for an empty rule', () => {
                expect(describeRule({})).toEqual([]);
                expect(describeRule(null)).toEqual([]);
            });

            it('describes advanced shapes it cannot edit (read-only display)', () => {
                const texts = describeRule({ country: { eq: 'US' }, abuse: { vpn: true } }).map(c => c.text);
                expect(texts).toContain('Only allowed country: US.');
                expect(texts).toContain('Required (unusual): VPN connections.');
            });
        });

        describe('buildGroupRulePayload (merge-safe null-diff)', () => {
            it('returns null when nothing changed (key order ignored)', () => {
                const oldRule = { region: { not_in: ['US-WA'] }, abuse: { vpn: false } };
                const newRule = { abuse: { vpn: false }, region: { not_in: ['US-WA'] } };
                expect(buildGroupRulePayload(oldRule, newRule)).toBe(null);
            });

            it('nulls a removed top-level constraint', () => {
                const payload = buildGroupRulePayload(
                    { country: { not_in: ['BY'] }, region: { not_in: ['US-WA'] } },
                    { region: { not_in: ['US-WA', 'US-TX'] } }
                );
                expect(payload).toEqual({ country: null, region: { not_in: ['US-WA', 'US-TX'] } });
            });

            it('nulls the stale operator when the country mode flips', () => {
                // Without in:null the server deep-merge would keep BOTH operators.
                const payload = buildGroupRulePayload(
                    { country: { in: ['US'] } },
                    { country: { not_in: ['BY'] } }
                );
                expect(payload).toEqual({ country: { not_in: ['BY'], in: null } });
            });

            it('nulls a cleared abuse flag but keeps the kept ones', () => {
                const payload = buildGroupRulePayload(
                    { abuse: { vpn: false, tor: false } },
                    { abuse: { vpn: false } }
                );
                expect(payload).toEqual({ abuse: { vpn: false, tor: null } });
            });

            it('clears everything when the new rule is empty', () => {
                const payload = buildGroupRulePayload(
                    { country: { not_in: ['BY'] }, abuse: { vpn: false } },
                    {}
                );
                expect(payload).toEqual({ country: null, abuse: null });
            });

            it('never emits __replace', () => {
                const payload = buildGroupRulePayload(
                    { country: { in: ['US'] } },
                    { region: { not_in: ['US-WA'] } }
                );
                expect(JSON.stringify(payload)).not.toContain('__replace');
            });

            it('drops smuggled sub-keys from advanced-editor input (nested __replace / protected / unknown ops)', () => {
                // The advanced JSON editor lets an admin type arbitrary JSON;
                // only DSL sub-keys may reach the metadata PATCH.
                const payload = buildGroupRulePayload(
                    {},
                    {
                        country: { in: ['US'], __replace: true, protected: { escalate: true } },
                        abuse: { vpn: false, __replace: true, residential: false }
                    }
                );
                expect(payload).toEqual({ country: { in: ['US'] }, abuse: { vpn: false } });
                expect(JSON.stringify(payload)).not.toContain('__replace');
                expect(JSON.stringify(payload)).not.toContain('protected');
                expect(JSON.stringify(payload)).not.toContain('residential');
            });

            it('never nulls sub-keys outside the DSL allowlist', () => {
                // Even a stored rule polluted with junk keys must not cause
                // the payload to reference them.
                const payload = buildGroupRulePayload(
                    { country: { in: ['US'], junk: 1 } },
                    { country: { not_in: ['BY'] } }
                );
                expect(payload).toEqual({ country: { not_in: ['BY'], in: null } });
            });
        });

        describe('buildSimulateBody', () => {
            it('builds a geo body from location inputs with is_<flag> keys', () => {
                const body = buildSimulateBody({
                    mode: 'geo', country: 'us', state: 'us-wa',
                    flags: { vpn: true, tor: false }
                });
                expect(body).toEqual({ geo: { country_code: 'US', region_code: 'US-WA', is_vpn: true } });
            });

            it('builds an ip body in ip mode (ip XOR geo)', () => {
                const body = buildSimulateBody({ mode: 'ip', ip: ' 198.51.100.23 ' });
                expect(body).toEqual({ ip: '198.51.100.23' });
                expect(body.geo).toBeUndefined();
            });

            it('passes through group_uuid and scope only when set', () => {
                const body = buildSimulateBody({ mode: 'ip', ip: '1.2.3.4', group_uuid: 'abc', scope: 'payments' });
                expect(body.group_uuid).toBe('abc');
                expect(body.scope).toBe('payments');
                const bare = buildSimulateBody({ mode: 'ip', ip: '1.2.3.4' });
                expect(bare.group_uuid).toBeUndefined();
                expect(bare.scope).toBeUndefined();
            });

            it('omits region when no state picked', () => {
                const body = buildSimulateBody({ mode: 'geo', country: 'CA', flags: {} });
                expect(body).toEqual({ geo: { country_code: 'CA' } });
            });
        });

        describe('coerceRuleInput (advanced editor value)', () => {
            it('accepts an already-parsed object (json field returns objects for valid JSON)', () => {
                const rule = { country: { not_in: ['BY'] } };
                expect(coerceRuleInput(rule)).toBe(rule);
            });

            it('parses a JSON string', () => {
                expect(coerceRuleInput('{"abuse":{"vpn":false}}')).toEqual({ abuse: { vpn: false } });
            });

            it('treats empty as an empty rule', () => {
                expect(coerceRuleInput('')).toEqual({});
                expect(coerceRuleInput(null)).toEqual({});
                expect(coerceRuleInput(undefined)).toEqual({});
            });

            it('returns null for invalid input', () => {
                expect(coerceRuleInput('{oops')).toBe(null);
                expect(coerceRuleInput('"a string"')).toBe(null);
                expect(coerceRuleInput('[1,2]')).toBe(null);
                expect(coerceRuleInput([1, 2])).toBe(null);
                expect(coerceRuleInput(42)).toBe(null);
            });
        });

        describe('ABUSE_FLAGS', () => {
            it('matches the DSL flag set', () => {
                expect(ABUSE_FLAGS.map(f => f.key).sort()).toEqual(['datacenter', 'proxy', 'tor', 'vpn']);
            });
        });
    });
};
