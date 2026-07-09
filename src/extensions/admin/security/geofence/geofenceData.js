/**
 * geofenceData - pure data + mapping helpers for the Geofencing admin UI.
 *
 * Everything here is dependency-free on purpose: the friendly rules editor is
 * a lossy projection of the backend rule DSL, and these functions are the one
 * place that projection is defined — so they carry unit tests
 * (test/unit/GeofenceData.test.js) and no framework imports.
 *
 * Rule DSL (django-mojo services/geofence/dsl.py):
 *   {
 *     country: { in: [..] } | { not_in: [..] } | { eq: 'US' },
 *     region:  { in: [..] } | { not_in: [..] } | { eq: 'US-CA' },   // ISO 3166-2
 *     abuse:   { tor: false, vpn: false, datacenter: false, proxy: false }
 *   }
 * Abuse flag semantics: false → block when detected; true → require the flag
 * (rare — not expressible in the friendly editor); absent/null → don't care.
 */

// ── Permissions ─────────────────────────────────────────────────────────────
// Geofence config is PLATFORM-WIDE: the backend only honors global user
// grants, so the UI gates with `sys.`-prefixed keys (User.hasPermission skips
// member/group grants for those). Superuser and the `admin` wildcard pass.

export const GEOFENCE_VIEW_PERMS = ['sys.view_geofence', 'sys.manage_geofence', 'sys.security'];
export const GEOFENCE_MANAGE_PERMS = ['sys.manage_geofence', 'sys.security'];
// Change history / blocks log read incident events, which need view_security.
export const SECURITY_EVENTS_PERMS = ['sys.view_security', 'sys.security'];

// ── US states (ISO 3166-2 region codes) ────────────────────────────────────

export const US_STATES = [
    { value: 'US-AL', label: 'Alabama' },
    { value: 'US-AK', label: 'Alaska' },
    { value: 'US-AZ', label: 'Arizona' },
    { value: 'US-AR', label: 'Arkansas' },
    { value: 'US-CA', label: 'California' },
    { value: 'US-CO', label: 'Colorado' },
    { value: 'US-CT', label: 'Connecticut' },
    { value: 'US-DE', label: 'Delaware' },
    { value: 'US-DC', label: 'District of Columbia' },
    { value: 'US-FL', label: 'Florida' },
    { value: 'US-GA', label: 'Georgia' },
    { value: 'US-HI', label: 'Hawaii' },
    { value: 'US-ID', label: 'Idaho' },
    { value: 'US-IL', label: 'Illinois' },
    { value: 'US-IN', label: 'Indiana' },
    { value: 'US-IA', label: 'Iowa' },
    { value: 'US-KS', label: 'Kansas' },
    { value: 'US-KY', label: 'Kentucky' },
    { value: 'US-LA', label: 'Louisiana' },
    { value: 'US-ME', label: 'Maine' },
    { value: 'US-MD', label: 'Maryland' },
    { value: 'US-MA', label: 'Massachusetts' },
    { value: 'US-MI', label: 'Michigan' },
    { value: 'US-MN', label: 'Minnesota' },
    { value: 'US-MS', label: 'Mississippi' },
    { value: 'US-MO', label: 'Missouri' },
    { value: 'US-MT', label: 'Montana' },
    { value: 'US-NE', label: 'Nebraska' },
    { value: 'US-NV', label: 'Nevada' },
    { value: 'US-NH', label: 'New Hampshire' },
    { value: 'US-NJ', label: 'New Jersey' },
    { value: 'US-NM', label: 'New Mexico' },
    { value: 'US-NY', label: 'New York' },
    { value: 'US-NC', label: 'North Carolina' },
    { value: 'US-ND', label: 'North Dakota' },
    { value: 'US-OH', label: 'Ohio' },
    { value: 'US-OK', label: 'Oklahoma' },
    { value: 'US-OR', label: 'Oregon' },
    { value: 'US-PA', label: 'Pennsylvania' },
    { value: 'US-RI', label: 'Rhode Island' },
    { value: 'US-SC', label: 'South Carolina' },
    { value: 'US-SD', label: 'South Dakota' },
    { value: 'US-TN', label: 'Tennessee' },
    { value: 'US-TX', label: 'Texas' },
    { value: 'US-UT', label: 'Utah' },
    { value: 'US-VT', label: 'Vermont' },
    { value: 'US-VA', label: 'Virginia' },
    { value: 'US-WA', label: 'Washington' },
    { value: 'US-WV', label: 'West Virginia' },
    { value: 'US-WI', label: 'Wisconsin' },
    { value: 'US-WY', label: 'Wyoming' }
];

const US_STATE_NAMES = Object.fromEntries(US_STATES.map(s => [s.value, s.label]));
const US_STATE_CODES = new Set(US_STATES.map(s => s.value));

/** State/region code → display name ('US-WA' → 'Washington'; unknown → code). */
export function regionName(code) {
    if (!code) return '';
    return US_STATE_NAMES[String(code).toUpperCase()] || String(code);
}

// ── Abuse flags ─────────────────────────────────────────────────────────────

export const ABUSE_FLAGS = [
    { key: 'vpn',        label: 'VPN connections' },
    { key: 'tor',        label: 'Tor connections' },
    { key: 'proxy',      label: 'Open proxies' },
    { key: 'datacenter', label: 'Datacenter IPs' }
];

// ── Endpoint scopes ─────────────────────────────────────────────────────────
// Scopes are deployment-defined strings — django-mojo core ships only 'auth'.
// Friendly labels for the ones we know; raw name for everything else.

const SCOPE_LABELS = { auth: 'Sign-in endpoints (auth)' };

export function scopeLabel(scope) {
    if (!scope) return 'All endpoints';
    return SCOPE_LABELS[scope] || `${scope} endpoints`;
}

/** Unique scope list from a GET /api/geo/rules payload (enforced_endpoints ∪ fail_closed_scopes). */
export function collectScopes(config) {
    const scopes = new Set();
    (config?.enforced_endpoints || []).forEach(e => { if (e && e.scope) scopes.add(e.scope); });
    (config?.posture?.fail_closed_scopes || []).forEach(s => { if (s) scopes.add(s); });
    return [...scopes].sort();
}

// ── Decision reasons → plain language ───────────────────────────────────────

function countryPhrase(decision) {
    return decision?.country || decision?.country_code || 'this country';
}

function regionPhrase(decision) {
    const code = decision?.region_code;
    if (code && US_STATE_NAMES[String(code).toUpperCase()]) {
        return US_STATE_NAMES[String(code).toUpperCase()];
    }
    return decision?.region || code || 'this region';
}

const REASON_TEXT = {
    no_rules:            () => 'Allowed — no geofence rules are configured.',
    disabled:            () => 'Allowed — geofencing is turned off.',
    bypass:              () => 'Allowed — this user bypasses geofencing.',
    passed:              () => 'Allowed — no rules match this location.',
    private_ip:          () => 'Allowed — private/internal network address.',
    lookup_failed:       d => (d && d.allowed === false)
        ? 'Blocked — location lookup unavailable (fail-closed endpoint).'
        : 'Allowed while location lookup was unavailable (fail-open).',
    country_not_allowed: d => `Blocked — ${countryPhrase(d)} is not allowed by the rules.`,
    region_not_allowed:  d => `Blocked — ${regionPhrase(d)} is not allowed by the rules.`,
    tor_detected:        () => 'Blocked — Tor connection detected.',
    vpn_detected:        () => 'Blocked — VPN connection detected.',
    proxy_detected:      () => 'Blocked — open proxy detected.',
    datacenter_detected: () => 'Blocked — datacenter IP detected.',
    rule_invalid:        () => 'Request denied — an invalid rule reached the engine. Check recent rule edits.',
    group_inactive:      () => 'This group is inactive — platform rules were applied.',
    ip_allowlisted:      d => {
        const why = d?.allowlist_reason ? ` (${d.allowlist_reason})` : '';
        return `Allowed by exemption${why}.`;
    }
};

/**
 * Plain-language sentence for a decision-ish object `{ reason, allowed, ... }`.
 * Also used for blocks-log rows, where the event metadata carries the same
 * reason codes. Unknown codes degrade to a readable fallback, never throw.
 */
export function describeDecision(decision) {
    const reason = decision?.reason;
    const fn = reason ? REASON_TEXT[reason] : null;
    if (fn) return fn(decision);
    const verb = decision?.allowed === false ? 'Blocked' : (decision?.allowed ? 'Allowed' : 'Decision');
    return reason ? `${verb} — reason: ${String(reason).replace(/_/g, ' ')}.` : `${verb}.`;
}

/** "Would otherwise block" line for exempted decisions; '' when not applicable. */
export function describeWouldBlock(decision) {
    if (!decision || decision.reason !== 'ip_allowlisted' || !decision.would_block) return '';
    const why = decision.would_block_reason
        ? describeDecision({ ...decision, reason: decision.would_block_reason, allowed: false })
        : 'Blocked.';
    return `Without this exemption the request would be blocked: ${why.replace(/^Blocked — /, '').replace(/\.$/, '')}.`;
}

// ── Rule ↔ friendly-form mapping ────────────────────────────────────────────

const RULE_TOP_KEYS = ['country', 'region', 'abuse'];
const MATCHER_OPS = ['in', 'not_in', 'eq'];

const EMPTY_FORM = Object.freeze({
    country_mode: '',        // '' | 'allow' | 'block'
    countries: [],           // ISO2 codes
    blocked_states: [],      // 'US-XX' codes
    block_vpn: false,
    block_tor: false,
    block_proxy: false,
    block_datacenter: false
});

/**
 * True when a rule uses DSL shapes the friendly editor cannot represent —
 * the editor must flip to advanced-JSON mode instead of silently rewriting:
 *   - unknown top-level keys / non-dict bodies
 *   - country: eq, multiple operators, or an allow+block mix
 *   - region: anything other than a single not_in of US state codes
 *   - abuse: a `true` (require-flag) value or unknown flags
 */
export function isAdvancedRule(rule) {
    if (rule === null || rule === undefined) return false;
    if (typeof rule !== 'object' || Array.isArray(rule)) return true;
    for (const key of Object.keys(rule)) {
        if (!RULE_TOP_KEYS.includes(key)) return true;
        const body = rule[key];
        if (!body || typeof body !== 'object' || Array.isArray(body)) return true;
        if (key === 'abuse') {
            for (const [flag, val] of Object.entries(body)) {
                if (!ABUSE_FLAGS.some(f => f.key === flag)) return true;
                if (val !== false && val !== null) return true; // `true` = require-flag → advanced
            }
            continue;
        }
        const ops = Object.keys(body);
        if (ops.some(op => !MATCHER_OPS.includes(op))) return true;
        if (ops.length > 1) return true;
        if (key === 'country') {
            if (ops[0] === 'eq') return true;
            if (ops.length && !Array.isArray(body[ops[0]])) return true;
        }
        if (key === 'region') {
            if (ops[0] !== 'not_in') return true;
            if (!Array.isArray(body.not_in)) return true;
            if (body.not_in.some(c => !US_STATE_CODES.has(String(c).toUpperCase()))) return true;
        }
    }
    return false;
}

/**
 * Project a representable rule onto the friendly form values. Call
 * `isAdvancedRule` first — unrepresentable shapes are projected best-effort.
 */
export function ruleToForm(rule) {
    const form = { ...EMPTY_FORM, countries: [], blocked_states: [] };
    if (!rule || typeof rule !== 'object') return form;

    const country = rule.country;
    if (country && typeof country === 'object') {
        if (Array.isArray(country.in)) {
            form.country_mode = 'allow';
            form.countries = country.in.map(c => String(c).toUpperCase());
        } else if (Array.isArray(country.not_in)) {
            form.country_mode = 'block';
            form.countries = country.not_in.map(c => String(c).toUpperCase());
        }
    }

    const region = rule.region;
    if (region && typeof region === 'object' && Array.isArray(region.not_in)) {
        form.blocked_states = region.not_in.map(c => String(c).toUpperCase());
    }

    const abuse = rule.abuse;
    if (abuse && typeof abuse === 'object') {
        for (const f of ABUSE_FLAGS) {
            form[`block_${f.key}`] = abuse[f.key] === false;
        }
    }
    return form;
}

/** Assemble the canonical rule object from friendly form values. */
export function formToRule(form) {
    const rule = {};
    const countries = (form?.countries || []).map(c => String(c).toUpperCase()).filter(Boolean);
    if (form?.country_mode === 'allow' && countries.length) {
        rule.country = { in: countries };
    } else if (form?.country_mode === 'block' && countries.length) {
        rule.country = { not_in: countries };
    }

    const states = (form?.blocked_states || []).map(c => String(c).toUpperCase()).filter(Boolean);
    if (states.length) {
        rule.region = { not_in: states };
    }

    const abuse = {};
    for (const f of ABUSE_FLAGS) {
        if (form?.[`block_${f.key}`]) abuse[f.key] = false;
    }
    if (Object.keys(abuse).length) rule.abuse = abuse;
    return rule;
}

// ── Plain-language rule summary ─────────────────────────────────────────────

function nameList(codes, toName) {
    return (codes || []).map(toName).join(', ');
}

/**
 * Plain-language clauses for a rule, for read-only display.
 * Returns [] for an empty/absent rule (caller renders its own empty state).
 */
export function describeRule(rule, { countryName } = {}) {
    const cname = countryName || (code => code);
    const clauses = [];
    if (!rule || typeof rule !== 'object') return clauses;

    const country = rule.country || {};
    if (Array.isArray(country.in)) {
        clauses.push({ tone: 'block', text: `Only these countries are allowed: ${nameList(country.in, cname)}.` });
    } else if (Array.isArray(country.not_in)) {
        clauses.push({ tone: 'block', text: `Blocked countries: ${nameList(country.not_in, cname)}.` });
    } else if (typeof country.eq === 'string') {
        clauses.push({ tone: 'block', text: `Only allowed country: ${cname(country.eq)}.` });
    }

    const region = rule.region || {};
    if (Array.isArray(region.not_in)) {
        clauses.push({ tone: 'block', text: `Blocked US states / regions: ${nameList(region.not_in, regionName)}.` });
    } else if (Array.isArray(region.in)) {
        clauses.push({ tone: 'block', text: `Only these regions are allowed: ${nameList(region.in, regionName)}.` });
    } else if (typeof region.eq === 'string') {
        clauses.push({ tone: 'block', text: `Only allowed region: ${regionName(region.eq)}.` });
    }

    const abuse = rule.abuse || {};
    const blockedFlags = ABUSE_FLAGS.filter(f => abuse[f.key] === false).map(f => f.label);
    if (blockedFlags.length) {
        clauses.push({ tone: 'block', text: `${blockedFlags.join(', ')} are blocked.` });
    }
    const requiredFlags = ABUSE_FLAGS.filter(f => abuse[f.key] === true).map(f => f.label);
    if (requiredFlags.length) {
        clauses.push({ tone: 'warn', text: `Required (unusual): ${requiredFlags.join(', ')}.` });
    }
    return clauses;
}

// ── Group-rule save payload (merge-safe) ────────────────────────────────────

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Build the `metadata.geofence` payload that makes the stored group rule equal
 * `newRule` under django's JSONField deep merge (objict.merge_dicts):
 * nested dicts merge recursively and a `null` value DELETES the key — nested
 * `__replace` is NOT supported and must never be sent (it would be stored into
 * the rule and fail validation).
 *
 * So: send the new value for every kept key, plus explicit nulls for any
 * top-level constraint or matcher-operator/abuse-flag that existed in
 * `oldRule` but not in `newRule`. Returns null when nothing changed.
 *
 * Sub-keys are ALLOWLISTED (matcher operators for country/region, the four
 * abuse flags for abuse): `newRule` can come from the advanced JSON editor,
 * so anything outside the DSL — a nested `__replace`, `protected`, etc. —
 * is dropped here instead of riding the PATCH into stored metadata.
 */
export function buildGroupRulePayload(oldRule, newRule) {
    const oldR = (oldRule && typeof oldRule === 'object') ? oldRule : {};
    const newR = (newRule && typeof newRule === 'object') ? newRule : {};
    if (deepEqual(normalizeRule(oldR), normalizeRule(newR))) return null;

    const payload = {};
    for (const key of RULE_TOP_KEYS) {
        const allowedSubs = key === 'abuse' ? ABUSE_FLAGS.map(f => f.key) : MATCHER_OPS;
        const oldBody = (oldR[key] && typeof oldR[key] === 'object') ? oldR[key] : null;
        const newBody = (newR[key] && typeof newR[key] === 'object') ? newR[key] : null;
        if (newBody) {
            const body = {};
            for (const sub of allowedSubs) {
                if (sub in newBody) body[sub] = newBody[sub];
            }
            // Null out stale sub-keys (a switched operator / cleared abuse
            // flag) so the recursive merge can't leave both behind.
            for (const sub of Object.keys(oldBody || {})) {
                if (allowedSubs.includes(sub) && !(sub in body)) body[sub] = null;
            }
            payload[key] = body;
        } else if (oldBody) {
            payload[key] = null;
        }
    }
    return payload;
}

/** Stable ordering so deepEqual doesn't depend on key insertion order. */
function normalizeRule(rule) {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return rule;
    const out = {};
    for (const key of Object.keys(rule).sort()) {
        out[key] = normalizeRule(rule[key]);
    }
    return out;
}

/**
 * Coerce the advanced editor's value into a rule object, or null when
 * invalid. The FormBuilder `json` field returns a parsed object when the
 * content is valid JSON and the raw string otherwise — accept both, plus
 * ''/null as an empty rule.
 */
export function coerceRuleInput(raw) {
    if (raw === '' || raw === null || raw === undefined) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null;
        } catch {
            return null;
        }
    }
    return null;
}

// ── Simulate request body ───────────────────────────────────────────────────

/**
 * Build the POST /api/geo/simulate body. `input`:
 *   { mode: 'ip'|'geo', ip, country, state, flags: {vpn,tor,proxy,datacenter},
 *     group_uuid, scope }
 * IP mode sends `ip` (allowlist consulted); geo mode sends a geo dict
 * (`is_<flag>` keys — the engine reads geo.is_vpn etc.).
 */
export function buildSimulateBody(input) {
    const body = {};
    if (input?.mode === 'ip') {
        body.ip = String(input.ip || '').trim();
    } else {
        const geo = {};
        if (input?.country) geo.country_code = String(input.country).toUpperCase();
        if (input?.state) geo.region_code = String(input.state).toUpperCase();
        for (const f of ABUSE_FLAGS) {
            if (input?.flags?.[f.key]) geo[`is_${f.key}`] = true;
        }
        body.geo = geo;
    }
    if (input?.group_uuid) body.group_uuid = input.group_uuid;
    if (input?.scope) body.scope = input.scope;
    return body;
}

// Aggregate default export — lets the unit-test module loader (which returns
// only a module's default export) load this file; runtime code uses the
// named exports above.
export default {
    GEOFENCE_VIEW_PERMS,
    GEOFENCE_MANAGE_PERMS,
    SECURITY_EVENTS_PERMS,
    US_STATES,
    ABUSE_FLAGS,
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
    buildSimulateBody,
    coerceRuleInput
}
