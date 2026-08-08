/**
 * Material-safe certificate/delegation helpers for the DNS admin surface.
 *
 * Certificate API responses are treated as hostile at every browser ingress.
 * This module positively selects the small status graph the UI needs; it never
 * copies unknown keys or recursively preserves a server-supplied object graph.
 */

const CERTIFICATE_FIELDS = [
    'id', 'created', 'modified', 'common_name', 'status', 'issuer', 'serial',
    'not_before', 'not_after', 'renew_after', 'attempts', 'days_remaining'
];

const DOMAIN_FIELDS = ['id', 'name', 'provider', 'status', 'expires'];
const GROUP_FIELDS = ['id', 'name'];
const CREDENTIAL_FIELDS = ['id', 'name', 'provider', 'is_active', 'verified'];
const DELEGATION_FIELDS = [
    'id', 'created', 'modified', 'domain', 'domain_name', 'source', 'target',
    'state', 'verified_at', 'last_error_code'
];

const TERMINAL_CERTIFICATE_STATES = ['failed', 'revoked'];
const IN_FLIGHT_CERTIFICATE_STATES = ['pending', 'issuing'];
const MAX_SANS = 100;
const MAX_ERROR_LENGTH = 2000;

function scalar(value) {
    return value === null || ['string', 'number', 'boolean'].includes(typeof value)
        ? value
        : undefined;
}

function projectScalars(raw, fields) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    fields.forEach(field => {
        const value = scalar(raw[field]);
        if (value !== undefined) out[field] = value;
    });
    return out;
}

export function sanitizeCertificateError(value) {
    if (value === null || value === undefined || value === '') return null;
    let text = String(value)
        .replace(/[\x00-\x1f\x7f]/g, ' ')
        .replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, '$1 [REDACTED]')
        .replace(/\b([a-z0-9_.-]*(?:token|key|secret|password|credential)[a-z0-9_.-]*)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
            '$1=[REDACTED]')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length > MAX_ERROR_LENGTH) text = text.slice(0, MAX_ERROR_LENGTH);
    return text || null;
}

export function normalizeDnsName(value) {
    return String(value === null || value === undefined ? '' : value)
        .trim().toLowerCase().replace(/\.+$/, '');
}

function validSanName(name) {
    if (!name || name.length > 253) return false;
    const labels = name.split('.');
    if (labels.length < 2) return false;
    return labels.every((label, index) => {
        if (label === '*') return index === 0;
        return label.length > 0 && label.length <= 63
            && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
    });
}

export function normalizeCertificateSans(input, options = {}) {
    const apex = normalizeDnsName(options.apex);
    const source = Array.isArray(input) ? input : (input === null || input === undefined ? [] : [input]);
    const names = [];
    const errors = [];

    source.slice(0, MAX_SANS + 1).forEach(value => {
        const name = normalizeDnsName(value);
        if (!name || names.includes(name)) return;
        if (!validSanName(name)) {
            errors.push(`"${name}" is not a valid certificate name.`);
            return;
        }
        const bare = name.startsWith('*.') ? name.slice(2) : name;
        if (apex && bare !== apex && !bare.endsWith(`.${apex}`)) {
            errors.push(`"${name}" is outside the ${apex} domain.`);
            return;
        }
        names.push(name);
    });

    if (source.length > MAX_SANS) errors.push(`A certificate may contain at most ${MAX_SANS} names.`);
    if (options.profile === 'apex_wildcard' && apex) {
        const expected = [apex, `*.${apex}`];
        if (names.length !== expected.length || expected.some(name => !names.includes(name))) {
            errors.push(`Delegated issuance accepts exactly ${apex} and *.${apex}.`);
        }
    }
    return { ok: errors.length === 0, names: names.slice(0, MAX_SANS), errors };
}

export function projectDomain(raw) {
    const out = projectScalars(raw, DOMAIN_FIELDS);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    if (raw.group === null) out.group = null;
    else if (raw.group && typeof raw.group === 'object' && !Array.isArray(raw.group)) {
        out.group = projectScalars(raw.group, GROUP_FIELDS);
    }
    if (raw.credential === null) out.credential = null;
    else if (raw.credential && typeof raw.credential === 'object' && !Array.isArray(raw.credential)) {
        out.credential = projectScalars(raw.credential, CREDENTIAL_FIELDS);
    }
    return out;
}

export function projectCertificate(raw) {
    const out = projectScalars(raw, CERTIFICATE_FIELDS);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    if (Object.prototype.hasOwnProperty.call(raw, 'sans')) {
        out.sans = normalizeCertificateSans(raw.sans).names;
    }
    const lastError = sanitizeCertificateError(raw.last_error);
    if (lastError) out.last_error = lastError;
    else if (Object.prototype.hasOwnProperty.call(raw, 'last_error')
        && (raw.last_error === null || raw.last_error === '')) out.last_error = null;
    if (raw.domain && typeof raw.domain === 'object' && !Array.isArray(raw.domain)) {
        out.domain = projectDomain(raw.domain);
    } else if (Object.prototype.hasOwnProperty.call(raw, 'domain')) {
        const domain = scalar(raw.domain);
        if (domain !== undefined) out.domain = domain;
    }
    return out;
}

export function projectCertificateResponse(response) {
    if (!response || typeof response !== 'object') return response;
    const out = { ...response };
    if (!response.data || typeof response.data !== 'object') return out;
    out.data = { ...response.data };
    if (Array.isArray(response.data.data)) {
        out.data.data = response.data.data.map(projectCertificate);
    } else if (response.data.data && typeof response.data.data === 'object') {
        out.data.data = projectCertificate(response.data.data);
    }
    return out;
}

export function projectDelegation(raw) {
    return projectScalars(raw, DELEGATION_FIELDS);
}

export function normalizeDelegationResponse(response) {
    const data = response?.data?.data;
    const rows = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);
    return rows.map(projectDelegation).filter(row => row.id !== undefined);
}

export function isInteractiveSuperuser(appOrUser) {
    const user = appOrUser?.activeUser || appOrUser;
    return user?.get?.('is_superuser') === true;
}

function credentialReady(domain) {
    const credential = domain?.credential;
    return !!(credential && credential.is_active === true && credential.verified === true);
}

/**
 * Derive whether the request/revoke controls are safe to offer.
 *
 * A successful empty delegation read is an authoritative direct-DNS answer.
 * An unsupported-route 404 is accepted only when the exact capability says
 * delegation is unavailable; every other unknown/broken state fails closed.
 */
export function certificateReadiness(options = {}) {
    const caps = options.caps || {};
    const domain = projectDomain(options.domain || {});
    const delegatedCaps = caps.delegated_acme;
    if (options.capabilitiesLoaded !== true) {
        return { ready: false, mode: 'blocked', reason: 'Certificate capabilities could not be loaded.' };
    }
    if (domain.status !== 'active') {
        return { ready: false, mode: 'blocked', reason: 'The domain must be active before requesting a certificate.' };
    }
    if (domain.provider === 'godaddy' && !credentialReady(domain)) {
        return { ready: false, mode: 'blocked', reason: 'The domain needs an active verified provider credential.' };
    }

    const delegation = options.delegation ? projectDelegation(options.delegation) : null;
    if (delegation) {
        if (delegation.state === 'verified') {
            return { ready: true, mode: 'delegated', profile: delegatedCaps?.profile || null, delegation };
        }
        return { ready: false, mode: 'blocked', reason: 'The ACME delegation is not verified.', delegation };
    }
    if (options.delegationLoaded === true) {
        if (domain.provider === 'mojo') {
            return { ready: false, mode: 'blocked', reason: 'This certificate-only domain needs a verified ACME delegation.' };
        }
        return { ready: true, mode: 'direct', profile: null };
    }
    if (options.delegationUnsupported === true && delegatedCaps?.available !== true) {
        if (domain.provider === 'mojo') {
            return { ready: false, mode: 'blocked', reason: 'Delegated ACME is unavailable for this domain.' };
        }
        return { ready: true, mode: 'legacy-direct', profile: null };
    }
    return { ready: false, mode: 'blocked', reason: 'ACME delegation status could not be confirmed.' };
}

export function certificateNeedsPolling(raw, now = Date.now()) {
    const certificate = projectCertificate(raw || {});
    if (IN_FLIGHT_CERTIFICATE_STATES.includes(certificate.status)) return true;
    if (certificate.status !== 'active' || !certificate.renew_after) return false;
    const due = Date.parse(certificate.renew_after);
    return Number.isFinite(due) && due <= now;
}

export function certificateLifecycleSignature(raw) {
    const certificate = projectCertificate(raw || {});
    return JSON.stringify([
        certificate.id, certificate.domain?.id || certificate.domain,
        certificate.status, certificate.modified, certificate.not_after,
        certificate.renew_after, certificate.attempts, certificate.last_error
    ]);
}

export function isTerminalCertificate(raw) {
    return TERMINAL_CERTIFICATE_STATES.includes(projectCertificate(raw || {}).status);
}

export default {
    sanitizeCertificateError,
    normalizeDnsName,
    normalizeCertificateSans,
    projectDomain,
    projectCertificate,
    projectCertificateResponse,
    projectDelegation,
    normalizeDelegationResponse,
    isInteractiveSuperuser,
    certificateReadiness,
    certificateNeedsPolling,
    certificateLifecycleSignature,
    isTerminalCertificate
};
