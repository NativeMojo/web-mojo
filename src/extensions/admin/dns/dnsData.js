/**
 * dnsData - pure data, validation and mapping helpers for the dnsman admin UI.
 *
 * Dependency-free on purpose, exactly like geofenceData.js: this module carries
 * essentially all the correctness of the DNS admin surface, so it is testable
 * without a DOM, a framework or a network (test/unit/DnsData.test.js and
 * test/unit/DnsRecordValidation.test.js).
 *
 * Two things it is NOT:
 *
 *  - It is not a replacement for server validation. django-mojo's
 *    `services/dns.py` + `services/naming.py` already enforce zone containment,
 *    apex NS/SOA refusal, DNS label charset and wildcard position, and their
 *    refusal is always authoritative. The mirrored checks here exist so a user
 *    never round-trips a 400 for something we could have said instantly.
 *  - It is not a place for hardcoded server configuration. Provider
 *    capabilities, allowed record types, the price cap, the ACME state and the
 *    certificate renewal window all come from `GET /api/dnsman/config`
 *    (django-mojo >= v1.2.55) and are passed in as `caps`. Every helper that
 *    needs one takes it as an argument rather than baking in a constant the
 *    server owns.
 *
 * What the backend deliberately does NOT check, and this module therefore does:
 * that an A record holds IPv4, that MX carries a priority, that SRV has four
 * fields, that a CNAME is not colliding, and that a TXT value is not carrying
 * user-added quotes (Route53 re-quotes and 255-chunks TXT itself, so
 * double-quoting breaks SPF/DKIM and ACME validation *silently*).
 */

// ── Capability defaults ─────────────────────────────────────────────────────
// Used when `GET /api/dnsman/config` is unavailable (django-mojo < v1.2.55).
// Deliberately permissive: an older backend should degrade to its previous
// behaviour, not to a blank page. `search_batch_limit: 0` and
// `suggestions_enabled: false` are the two flags that switch the buy wizard's
// TLD grid back to a single exact-name row.

export const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'SRV', 'CAA', 'NS'];

export const DEFAULT_TLDS = ['com', 'net', 'org', 'io', 'dev', 'app', 'co', 'ai'];

export const DEFAULT_CAPABILITIES = {
    purchase_enabled: true,
    registrant_contact_configured: true,
    max_domain_price: null,
    currency: 'USD',
    quote_ttl_minutes: 15,
    allowed_record_types: DNS_RECORD_TYPES.slice(),
    search_batch_limit: 0,
    suggestions_enabled: false,
    providers: [],
    acme: { configured: true, staging: false },
    delegated_acme: { available: false, profile: null },
    cert_renew_days: 30
};

// ── Small primitives ────────────────────────────────────────────────────────

// Built from char codes on purpose: written literally these are invisible in
// source, and a linter or an editor's whitespace pass would silently eat them.
const ZERO_WIDTH = [0x200b, 0x200c, 0x200d, 0xfeff].map(code => String.fromCharCode(code));
const NBSP = String.fromCharCode(0xa0);
const SMART_QUOTES = [[0x2018, "'"], [0x2019, "'"], [0x201c, '"'], [0x201d, '"']]
    .map(pair => [String.fromCharCode(pair[0]), pair[1]]);

const LABEL_RE = /^[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?$/i;

function str(value) {
    return value === null || value === undefined ? '' : String(value);
}

export function isIPv4(value) {
    const parts = str(value).trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

export function isIPv6(value) {
    const raw = str(value).trim();
    if (!raw.includes(':')) return false;
    // One '::' at most; every group 1-4 hex digits. A trailing IPv4 tail is legal.
    if ((raw.match(/::/g) || []).length > 1) return false;
    const tail = raw.split(':').pop();
    const body = tail.includes('.') ? raw.slice(0, raw.length - tail.length - 1) : raw;
    if (tail.includes('.') && !isIPv4(tail)) return false;
    return body.split(':').every(group => group === '' || /^[0-9a-f]{1,4}$/i.test(group));
}

export function isIP(value) {
    return isIPv4(value) || isIPv6(value);
}

/** A dotted hostname with legal labels. Wildcards are a record NAME concern, not a target. */
export function isHostname(value) {
    const raw = str(value).trim().replace(/\.$/, '');
    if (!raw || raw.length > 253 || isIP(raw)) return false;
    const labels = raw.split('.');
    if (labels.length < 2) return false;
    return labels.every(label => label.length <= 63 && LABEL_RE.test(label));
}

function isUint(value, max) {
    const raw = str(value).trim();
    if (!/^\d+$/.test(raw)) return false;
    const n = Number(raw);
    return n >= 0 && n <= max;
}

// ── Names and zones ─────────────────────────────────────────────────────────

/** Normalize a record name to an in-zone FQDN. Mirrors naming._resolve_name. */
export function toFqdn(name, zone) {
    const raw = str(name).trim().toLowerCase().replace(/\.+$/, '');
    const zoneName = str(zone).trim().toLowerCase().replace(/\.+$/, '');
    if (raw === '' || raw === '@') return zoneName;
    if (raw.includes('.') && isInZone(raw, zoneName)) return raw;
    if (raw.includes('.')) return raw; // out of zone — validation reports it
    return zoneName ? `${raw}.${zoneName}` : raw;
}

export function isInZone(recordName, zone) {
    const name = str(recordName).trim().toLowerCase().replace(/\.+$/, '');
    const zoneName = str(zone).trim().toLowerCase().replace(/\.+$/, '');
    if (!zoneName) return false;
    return name === zoneName || name.endsWith(`.${zoneName}`);
}

/** A wildcard is legal only as the leftmost label. Mirrors naming.validate_record_labels. */
export function hasValidLabels(fqdn) {
    const labels = str(fqdn).split('.');
    if (!labels.length) return false;
    return labels.every((label, index) => {
        if (label === '*') return index === 0;
        return LABEL_RE.test(label);
    });
}

// ── Provider capabilities ───────────────────────────────────────────────────

function providerOf(domain) {
    if (typeof domain === 'string') return domain;
    if (!domain) return '';
    if (typeof domain.get === 'function') return str(domain.get('provider'));
    return str(domain.provider);
}

function providerEntry(provider, caps) {
    const list = (caps && caps.providers) || [];
    return list.find(entry => entry && entry.name === provider) || null;
}

export function providerLabel(provider) {
    const known = { route53: 'Route 53', godaddy: 'GoDaddy' };
    const key = str(provider).toLowerCase();
    return known[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '—');
}

/**
 * True when the provider is management-only: DNS is managed here but registrar
 * operations (purchase, WHOIS, privacy) live with the provider.
 *
 * Reads the server's provider matrix rather than testing `!== 'route53'`, so a
 * third provider gaining purchase support needs no web-mojo change. Falls back
 * to the old test only when capabilities are unavailable.
 */
export function isManagementOnly(domain, caps) {
    const provider = providerOf(domain).toLowerCase();
    if (!provider) return false;
    const entry = providerEntry(provider, caps);
    if (entry) return entry.purchase === false;
    return provider !== 'route53';
}

export function requiresCredential(provider, caps) {
    const key = str(provider).toLowerCase();
    if (!key) return false;
    const entry = providerEntry(key, caps);
    if (entry) return entry.requires_credential === true;
    return key !== 'route53';
}

// ── Availability (tri-state) ────────────────────────────────────────────────

/**
 * Collapse a search/suggest row into a render state.
 *
 * `available` is TRI-STATE: true / false / null, where null means the registry
 * did not answer. Rendering null as "taken" would tell a user a buyable name is
 * gone — the worst failure this surface can produce — so the guard lives here,
 * in one tested function, and no template ever branches on `available` directly.
 *
 * Precedence mirrors the backend's `registrar._reason_for` exactly.
 */
export function availabilityState(row) {
    if (!row) return 'unknown';
    if (row.available === null || row.available === undefined) return 'unknown';
    if (row.tld_supported === false) return 'unsupported';
    if (row.available === false) return 'taken';
    return 'available';
}

/** True when a row's price is over the server's configured purchase cap. */
export function exceedsPriceCap(row, caps) {
    const cap = Number(caps && caps.max_domain_price);
    const price = Number(row && row.price);
    if (!Number.isFinite(cap) || cap <= 0) return false;
    if (!Number.isFinite(price)) return false;
    return price > cap;
}

// ── Certificates ────────────────────────────────────────────────────────────

/**
 * Bootstrap tone for a certificate's remaining life.
 *
 * Thresholds derive from the server's own renewal window (`cert_renew_days`)
 * rather than hardcoded numbers that would silently disagree with the renewal
 * scan once an operator retunes it.
 */
export function certExpiryTone(daysRemaining, caps) {
    if (daysRemaining === null || daysRemaining === undefined || daysRemaining === '') return 'secondary';
    const days = Number(daysRemaining);
    if (!Number.isFinite(days)) return 'secondary';
    const renewDays = Number((caps && caps.cert_renew_days) || DEFAULT_CAPABILITIES.cert_renew_days);
    const window = Number.isFinite(renewDays) && renewDays > 0 ? renewDays : DEFAULT_CAPABILITIES.cert_renew_days;
    if (days <= window / 2) return 'danger';
    if (days <= window) return 'warning';
    return 'success';
}

// ── Records: identity and the spent-challenge case ──────────────────────────

/** Stable synthetic id for a provider record set — the API returns none. */
export function recordKey(record) {
    if (!record) return '';
    const type = str(record.type).toUpperCase();
    const name = str(record.name).toLowerCase().replace(/\.+$/, '');
    return `${type}|${name}`;
}

/**
 * True for a spent ACME challenge — inert, not a live validation record.
 *
 * GoDaddy cannot delete the last record of a type, so certificate issuance
 * overwrites the challenge TXT with a single `retired` placeholder instead of
 * removing it. Such a row needs no action and must never be surfaced as an
 * error or a pending challenge.
 */
export function isSpentAcmeChallenge(record) {
    if (!record) return false;
    if (str(record.type).toUpperCase() !== 'TXT') return false;
    if (!str(record.name).toLowerCase().startsWith('_acme-challenge')) return false;
    const values = Array.isArray(record.record_values) ? record.record_values : [];
    return values.length === 1 && str(values[0]).trim() === 'retired';
}

export function isAcmeChallenge(record) {
    if (!record) return false;
    return str(record.type).toUpperCase() === 'TXT'
        && str(record.name).toLowerCase().startsWith('_acme-challenge');
}

// ── Record type model ───────────────────────────────────────────────────────
//
// The single source of truth for the structured editor. A free-text values box
// makes the user assemble `10 mail.example.com` and `0 issue "letsencrypt.org"`
// by hand; per-type fields delete that whole error class.

export const CAA_TAGS = ['issue', 'issuewild', 'iodef'];

export const RECORD_SPECS = {
    A: {
        multi: true, valuesLabel: 'IPv4 addresses',
        fields: [{ key: 'ip', label: 'IPv4 address', kind: 'ipv4', grow: true }]
    },
    AAAA: {
        multi: true, valuesLabel: 'IPv6 addresses',
        fields: [{ key: 'ip', label: 'IPv6 address', kind: 'ipv6', grow: true }]
    },
    CNAME: {
        // A CNAME set is single-valued by definition; the editor suppresses the
        // add-row control rather than letting a user build a set the provider
        // will reject.
        multi: false, valuesLabel: 'Alias target',
        fields: [{ key: 'target', label: 'Target', kind: 'hostname', grow: true }]
    },
    MX: {
        multi: true, valuesLabel: 'Mail servers',
        fields: [
            { key: 'priority', label: 'Priority', kind: 'uint16', default: '10', width: '96px' },
            { key: 'target', label: 'Target', kind: 'hostname', grow: true }
        ]
    },
    SRV: {
        multi: true, valuesLabel: 'Service targets',
        fields: [
            { key: 'priority', label: 'Priority', kind: 'uint16', default: '10', width: '96px' },
            { key: 'weight', label: 'Weight', kind: 'uint16', default: '10', width: '96px' },
            { key: 'port', label: 'Port', kind: 'port', width: '96px' },
            { key: 'target', label: 'Target', kind: 'hostname', grow: true }
        ]
    },
    CAA: {
        multi: true, valuesLabel: 'Certificate authorities',
        fields: [
            { key: 'flags', label: 'Flags', kind: 'uint8', default: '0', width: '86px' },
            { key: 'tag', label: 'Tag', kind: 'enum', options: CAA_TAGS, default: 'issue', width: '130px' },
            { key: 'value', label: 'Value', kind: 'quoted', grow: true }
        ]
    },
    TXT: {
        multi: true, valuesLabel: 'Text values',
        fields: [{ key: 'text', label: 'Value', kind: 'text', grow: true }]
    },
    NS: {
        multi: true, valuesLabel: 'Nameservers',
        fields: [{ key: 'target', label: 'Nameserver', kind: 'hostname', grow: true }]
    }
};

export function specFor(type) {
    return RECORD_SPECS[str(type).toUpperCase()] || null;
}

export function blankValue(type) {
    const spec = specFor(type);
    if (!spec) return {};
    const out = {};
    spec.fields.forEach(field => { out[field.key] = field.default !== undefined ? field.default : ''; });
    return out;
}

/** Wire string → structured object keyed by the type's field keys. */
export function parseRecordValue(type, wire) {
    const spec = specFor(type);
    const raw = str(wire).trim();
    if (!spec) return { text: raw };
    if (spec.fields.length === 1) {
        const key = spec.fields[0].key;
        return { [key]: spec.fields[0].kind === 'quoted' ? stripQuotes(raw) : raw };
    }
    // Multi-field types are whitespace separated with the final field greedy.
    const parts = raw.split(/\s+/);
    const out = {};
    spec.fields.forEach((field, index) => {
        const isLast = index === spec.fields.length - 1;
        let value = isLast ? parts.slice(index).join(' ') : (parts[index] || '');
        if (field.kind === 'quoted') value = stripQuotes(value);
        out[field.key] = value === undefined ? '' : value;
    });
    return out;
}

/** Structured object → wire string. `format(parse(v)) === v` for well-formed v. */
export function formatRecordValue(type, value) {
    const spec = specFor(type);
    if (!spec) return str(value && value.text).trim();
    return spec.fields
        .map(field => {
            const raw = str(value && value[field.key]).trim();
            return field.kind === 'quoted' && raw !== '' ? `"${stripQuotes(raw)}"` : raw;
        })
        .filter(part => part !== '')
        .join(' ')
        .trim();
}

function stripQuotes(value) {
    const raw = str(value).trim();
    if (raw.length >= 2 && raw.charAt(0) === '"' && raw.charAt(raw.length - 1) === '"') {
        return raw.slice(1, -1);
    }
    return raw;
}

// ── Autofix ─────────────────────────────────────────────────────────────────

function cleanInvisibles(value, fixes) {
    let out = str(value);

    const stripped = ZERO_WIDTH.reduce((acc, ch) => acc.split(ch).join(''), out);
    if (stripped !== out) {
        out = stripped;
        fixes.push('Removed invisible characters');
    }
    if (out.indexOf(NBSP) !== -1) {
        out = out.split(NBSP).join(' ');
        fixes.push('Replaced non-breaking spaces');
    }
    const quoted = SMART_QUOTES.reduce((acc, pair) => acc.split(pair[0]).join(pair[1]), out);
    if (quoted !== out) {
        out = quoted;
        fixes.push('Replaced curly quotes with plain quotes');
    }
    const trimmed = out.trim();
    if (trimmed !== out) fixes.push('Trimmed surrounding whitespace');
    return trimmed;
}

/** Clean one field value by its kind. Returns { value, fixes }. */
export function autofixFieldValue(kind, raw) {
    const fixes = [];
    let value = cleanInvisibles(raw, fixes);

    if (kind === 'hostname') {
        const withoutScheme = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
        if (withoutScheme !== value) { value = withoutScheme; fixes.push('Removed the URL scheme from the target'); }
        const slash = value.indexOf('/');
        if (slash !== -1) { value = value.slice(0, slash); fixes.push('Removed the path from the target'); }
        const withoutDot = value.replace(/\.+$/, '');
        if (withoutDot !== value) { value = withoutDot; fixes.push('Removed the trailing dot'); }
        const lowered = value.toLowerCase();
        if (lowered !== value) { value = lowered; fixes.push('Lowercased the hostname'); }
    } else if (kind === 'ipv4' || kind === 'ipv6') {
        const unbracketed = value.replace(/^\[/, '').replace(/\]$/, '');
        if (unbracketed !== value) { value = unbracketed; fixes.push('Removed the square brackets around the address'); }
    } else if (kind === 'text') {
        // Route53 quotes and 255-chunks TXT itself. A pasted value that already
        // carries quotes gets double-quoted and breaks SPF/DKIM and ACME
        // validation with NO error surfaced anywhere — strip them here.
        const unquoted = stripQuotes(value);
        if (unquoted !== value) { value = unquoted; fixes.push('Removed the surrounding quotes (they are added automatically)'); }
    } else if (kind === 'quoted') {
        value = stripQuotes(value);
    } else if (kind === 'enum') {
        value = value.toLowerCase();
    }

    return { value, fixes };
}

/**
 * Clean a whole wire value for a record type. Returns { value, fixes }.
 *
 * Never silent — every change is reported so the UI can list what it did.
 * Parsing first means a bare `10 mail.example.com` dropped into MX splits into
 * priority + target rather than being rejected as a bad hostname.
 */
export function autofixRecordValue(type, raw) {
    const spec = specFor(type);
    const fixes = [];
    const cleaned = cleanInvisibles(raw, fixes);
    if (!spec) return { value: cleaned, fixes };

    const parsed = parseRecordValue(type, cleaned);
    const out = {};
    spec.fields.forEach(field => {
        const result = autofixFieldValue(field.kind, parsed[field.key]);
        out[field.key] = result.value;
        result.fixes.forEach(fix => { if (!fixes.includes(fix)) fixes.push(fix); });
    });
    return { value: formatRecordValue(type, out), fixes, parts: out };
}

/** textarea / string / array → trimmed, de-duplicated, blank-free array. */
export function normalizeRecordValues(input) {
    let list;
    if (Array.isArray(input)) list = input.slice();
    else if (input === null || input === undefined) list = [];
    else list = str(input).split('\n');
    const out = [];
    list.forEach(entry => {
        const value = str(entry).trim();
        if (value !== '' && !out.includes(value)) out.push(value);
    });
    return out;
}

// ── Validation ──────────────────────────────────────────────────────────────

function fieldError(index, field, message, fix) {
    const err = { index, field, message };
    if (fix) err.fix = fix;
    return err;
}

function validateOneValue(type, wire, index, errors) {
    const spec = specFor(type);
    if (!spec) return;
    const parts = parseRecordValue(type, wire);

    spec.fields.forEach(field => {
        const value = str(parts[field.key]).trim();
        if (value === '') {
            errors.push(fieldError(index, field.key, `${field.label} is required.`));
            return;
        }
        if (field.kind === 'ipv4' && !isIPv4(value)) {
            const fix = isIPv6(value)
                ? { action: 'change-type', type: 'AAAA', label: 'Change type to AAAA' }
                : null;
            errors.push(fieldError(index, field.key,
                isIPv6(value)
                    ? "That's an IPv6 address — an A record holds IPv4."
                    : `"${value}" is not a valid IPv4 address.`, fix));
        } else if (field.kind === 'ipv6' && !isIPv6(value)) {
            const fix = isIPv4(value)
                ? { action: 'change-type', type: 'A', label: 'Change type to A' }
                : null;
            errors.push(fieldError(index, field.key,
                isIPv4(value)
                    ? "That's an IPv4 address — an AAAA record holds IPv6."
                    : `"${value}" is not a valid IPv6 address.`, fix));
        } else if (field.kind === 'hostname' && !isHostname(value)) {
            errors.push(fieldError(index, field.key, isIP(value)
                ? `${field.label} must be a hostname, not an IP address.`
                : `"${value}" is not a valid hostname.`));
        } else if (field.kind === 'uint16' && !isUint(value, 65535)) {
            errors.push(fieldError(index, field.key, `${field.label} must be a whole number from 0 to 65535.`));
        } else if (field.kind === 'uint8' && !isUint(value, 255)) {
            errors.push(fieldError(index, field.key, `${field.label} must be a whole number from 0 to 255.`));
        } else if (field.kind === 'port' && (!isUint(value, 65535) || Number(value) === 0)) {
            errors.push(fieldError(index, field.key, 'Port must be a whole number from 1 to 65535.'));
        } else if (field.kind === 'enum' && field.options && !field.options.includes(value.toLowerCase())) {
            errors.push(fieldError(index, field.key,
                `${field.label} must be one of: ${field.options.join(', ')}.`));
        }
    });
}

/**
 * Validate a whole record set. Returns { ok, errors: [{index, field, message, fix?}] }.
 *
 * `index` is null for record-level errors (name, type, ttl) and the value index
 * for per-value errors. `fix` carries an actionable one-click correction where
 * one exists — an IPv6 address in an A record is the right value with the wrong
 * type, and an error message alone makes the user do that reasoning.
 */
export function validateRecordSet(options = {}) {
    const { name, values, ttl, zone, existingRecords, caps } = options;
    const type = str(options.type).toUpperCase();
    const errors = [];

    const allowed = (caps && caps.allowed_record_types && caps.allowed_record_types.length)
        ? caps.allowed_record_types.map(entry => str(entry).toUpperCase())
        : DNS_RECORD_TYPES;

    if (!type) {
        errors.push(fieldError(null, 'type', 'A record type is required.'));
        return { ok: false, errors };
    }
    if (!allowed.includes(type)) {
        errors.push(fieldError(null, 'type',
            `${type} is not an allowed record type (${allowed.join(', ')}).`));
    }

    // ── Name ──
    const zoneName = str(zone).trim().toLowerCase().replace(/\.+$/, '');
    const fqdn = toFqdn(name, zoneName);
    const isApex = !!zoneName && fqdn === zoneName;

    if (!fqdn) {
        errors.push(fieldError(null, 'name', 'A record name is required.'));
    } else if (zoneName && !isInZone(fqdn, zoneName)) {
        // The backend treats ANY dotted name as fully qualified and refuses it
        // when it falls outside the zone — otherwise "www.attacker.com" would
        // be helpfully rewritten to "www.attacker.com.example.com" and a
        // request meant for somewhere else would quietly succeed. That is the
        // right call, but its bare refusal strands anyone who typed a relative
        // multi-label name like "_sip._tcp", so say what they probably meant.
        errors.push(fieldError(null, 'name',
            `"${fqdn}" is not inside the ${zoneName} zone. `
            + `To create it inside this zone, use "${fqdn}.${zoneName}".`,
            { action: 'set-name', name: `${fqdn}.${zoneName}`, label: `Use ${fqdn}.${zoneName}` }));
    } else if (!hasValidLabels(fqdn)) {
        errors.push(fieldError(null, 'name',
            str(fqdn).split('.').includes('*') && !str(fqdn).startsWith('*.')
                ? 'A wildcard may only be the leftmost label.'
                : `"${fqdn}" is not a valid record name.`));
    }

    if (isApex && (type === 'NS' || type === 'SOA')) {
        errors.push(fieldError(null, 'type',
            `The apex ${type} record set cannot be changed — it would take the domain off the internet.`));
    }
    if (isApex && type === 'CNAME') {
        errors.push(fieldError(null, 'name',
            "A CNAME can't sit at the apex — it would collide with the zone's own SOA and NS records."));
    }

    // ── Collisions against the already-loaded zone ──
    const existing = Array.isArray(existingRecords) ? existingRecords : [];
    const sameName = existing.filter(record =>
        str(record.name).toLowerCase().replace(/\.+$/, '') === fqdn
        && str(record.type).toUpperCase() !== type);
    if (type === 'CNAME' && sameName.length) {
        errors.push(fieldError(null, 'name',
            `${fqdn} already has ${sameName.map(r => str(r.type).toUpperCase()).join(', ')}. `
            + "A CNAME can't coexist with another record at the same name."));
    }
    if (type !== 'CNAME' && sameName.some(record => str(record.type).toUpperCase() === 'CNAME')) {
        errors.push(fieldError(null, 'name',
            `${fqdn} is a CNAME. No other record type can share a name with a CNAME.`));
    }

    // ── Values ──
    const list = normalizeRecordValues(values);
    const spec = specFor(type);
    if (!list.length) {
        errors.push(fieldError(null, 'values', 'At least one value is required.'));
    } else if (spec && spec.multi === false && list.length > 1) {
        errors.push(fieldError(null, 'values',
            `A ${type} record holds exactly one value; ${list.length} were given.`));
    }
    list.forEach((wire, index) => validateOneValue(type, wire, index, errors));

    // ── TTL ──
    if (ttl !== undefined && ttl !== null && ttl !== '') {
        const seconds = Number(ttl);
        if (!Number.isFinite(seconds) || !Number.isInteger(seconds) || seconds < 60 || seconds > 86400) {
            errors.push(fieldError(null, 'ttl', 'TTL must be a whole number of seconds from 60 to 86400.'));
        }
    }

    return { ok: errors.length === 0, errors };
}

/**
 * Non-blocking warnings — the "are you sure" set. Returned as plain strings;
 * the caller shows them in the save confirm and requires an explicit proceed.
 */
export function recordWarnings(options = {}) {
    const { name, values, ttl, zone, existingRecords, before, deleting } = options;
    const type = str(options.type).toUpperCase();
    const zoneName = str(zone).trim().toLowerCase().replace(/\.+$/, '');
    const fqdn = toFqdn(name, zoneName);
    const warnings = [];

    const existing = Array.isArray(existingRecords) ? existingRecords : [];
    const current = existing.find(record =>
        recordKey(record) === `${type}|${fqdn}`) || null;

    // A live ACME challenge — the spent `retired` placeholder is inert.
    if (isAcmeChallenge({ type, name: fqdn }) && current && !isSpentAcmeChallenge(current)) {
        warnings.push('This is a live _acme-challenge record. Changing it can fail a certificate issuance that is currently in flight.');
    }

    const list = normalizeRecordValues(values);
    const isAddress = type === 'A' || type === 'AAAA';
    const isFrontDoor = !!zoneName && (fqdn === zoneName || fqdn === `www.${zoneName}`);
    if (isAddress && isFrontDoor && (deleting || !list.length)) {
        warnings.push(`Removing the ${type} record for ${fqdn} will take that address offline.`);
    }
    if (type === 'MX') {
        warnings.push('Changing MX records changes where mail for this domain is delivered.');
    }
    if (str(fqdn).startsWith('*.')) {
        warnings.push('This is a wildcard record — it answers for every name that has no more specific record.');
    }
    if (ttl !== undefined && ttl !== null && ttl !== '' && Number(ttl) < 300 && Number(ttl) >= 60) {
        warnings.push(`A TTL of ${ttl}s is very short — resolvers will re-query constantly.`);
    }
    if (type === 'SRV' && fqdn && !/^_[^.]+\._[^.]+\./.test(fqdn)) {
        warnings.push('SRV names are normally _service._protocol.name — this one is not.');
    }

    // Only warn when the set actually SHRINKS. Swapping one value for another
    // (the ordinary edit — changing an A record's address) removes a value too,
    // and warning about it would train people to click through the one warning
    // that matters: the 3-to-1 case where two values disappear unnoticed.
    // The save dialog still shows the full diff either way.
    const before_ = normalizeRecordValues(before);
    const removed = diffRecordValues(before_, list).removed;
    if (removed.length && !deleting && list.length < before_.length) {
        const lost = before_.length - list.length;
        warnings.push(`${lost} existing ${lost === 1 ? 'value' : 'values'} will be removed.`);
    }
    return warnings;
}

/**
 * Compare two value sets. Returns { added, removed, unchanged }.
 *
 * Both providers REPLACE the entire record set on write, so a user editing one
 * value of a three-value set silently destroys the other two unless the
 * removals are shown. This drives the save confirm.
 */
export function diffRecordValues(before, after) {
    const from = normalizeRecordValues(before);
    const to = normalizeRecordValues(after);
    return {
        added: to.filter(value => !from.includes(value)),
        removed: from.filter(value => !to.includes(value)),
        unchanged: from.filter(value => to.includes(value))
    };
}

/** Canonical provider row used for preflight drift and post-write evidence. */
export function canonicalRecord(record = {}) {
    return {
        type: str(record.type).toUpperCase(),
        name: str(record.name).trim().toLowerCase().replace(/\.+$/, ''),
        record_values: normalizeRecordValues(record.record_values).sort(),
        ttl: Number.isFinite(Number(record.ttl)) ? Number(record.ttl) : null
    };
}

export function recordMutationSnapshot(records, target = {}) {
    const intended = canonicalRecord(target);
    const rows = (Array.isArray(records) ? records : [])
        .map(canonicalRecord)
        .filter(row => row.name === intended.name)
        .sort((a, b) => recordKey(a).localeCompare(recordKey(b)));
    return {
        key: recordKey(intended),
        exact: rows.find(row => recordKey(row) === recordKey(intended)) || null,
        sameOwner: rows
    };
}

export function recordSnapshotMatches(left, right) {
    return JSON.stringify(left || null) === JSON.stringify(right || null);
}

/**
 * Classify only from the authoritative records observed after a write.
 * Transport success/failure is deliberately not an input.
 */
export function classifyRecordMutation(observedRecords, options = {}) {
    const before = options.before || { exact: null, sameOwner: [] };
    const target = canonicalRecord(options.target || {});
    const observed = recordMutationSnapshot(observedRecords, target);
    const intendedExact = options.deleting ? null : target;

    if (recordSnapshotMatches(observed.exact, intendedExact)) {
        const hasCname = observed.sameOwner.some(row => row.type === 'CNAME');
        if (!hasCname || observed.sameOwner.length === 1) return 'applied';
    }
    if (recordSnapshotMatches(observed, before)) return 'not-applied';
    return 'unconfirmed';
}

// Aggregate default export — the unit-test module loader returns a module's
// default export; runtime code uses the named exports above.
export default {
    DNS_RECORD_TYPES,
    DEFAULT_TLDS,
    DEFAULT_CAPABILITIES,
    CAA_TAGS,
    RECORD_SPECS,
    isIPv4,
    isIPv6,
    isIP,
    isHostname,
    toFqdn,
    isInZone,
    hasValidLabels,
    providerLabel,
    isManagementOnly,
    requiresCredential,
    availabilityState,
    exceedsPriceCap,
    certExpiryTone,
    recordKey,
    isSpentAcmeChallenge,
    isAcmeChallenge,
    specFor,
    blankValue,
    parseRecordValue,
    formatRecordValue,
    autofixFieldValue,
    autofixRecordValue,
    normalizeRecordValues,
    validateRecordSet,
    recordWarnings,
    diffRecordValues,
    canonicalRecord,
    recordMutationSnapshot,
    recordSnapshotMatches,
    classifyRecordMutation
};
