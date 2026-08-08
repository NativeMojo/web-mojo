/**
 * Dns - models, collections and REST helpers for the dnsman admin surface (#394).
 *
 * Backend: `mojo.apps.dnsman` under `/api/dnsman`. Three shapes matter here and
 * none of them is a plain CRUD resource:
 *
 *  - **Domains and credentials are not creatable over REST** (`CAN_CREATE=False`
 *    on both). Rows come into existence through the registrar/onboarding
 *    services, so the create paths below are named after what they do
 *    (`link`, `adopt`, `registerExisting`, `purchase`) rather than `save()`.
 *  - **DNS records are not mirrored in the database.** `GET /api/dnsman/dns`
 *    reads the provider zone live and returns an id-less array, so
 *    `DnsRecordList` overrides `parse()` and synthesises an id per record set.
 *  - **Capabilities come from the server.** `registrar.capabilities()` is the
 *    single place any view asks what this deployment supports; no view carries
 *    a version check.
 */

import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import rest from '@core/Rest.js';

import {
    DNS_RECORD_TYPES,
    DEFAULT_CAPABILITIES,
    CAA_TAGS,
    recordKey
} from '@ext/admin/dns/dnsData.js';
import {
    normalizeCertificateSans,
    normalizeDelegationResponse,
    projectCertificate,
    projectCertificateResponse,
    projectDelegation,
    sanitizeCertificateError
} from '@ext/admin/dns/certificateData.js';
import { dnsMutations } from '@ext/admin/dns/DnsMutationCoordinator.js';

const BASE = '/api/dnsman';

const responseRows = (response) => {
    const payload = response?.data?.data;
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
};

const sanitizeErrorField = (data = {}) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)
        || !Object.prototype.hasOwnProperty.call(data, 'last_error')) return data;
    return { ...data, last_error: sanitizeCertificateError(data.last_error) };
};

/* =========================
 * Constants
 * ========================= */

export const DomainProviderOptions = [
    { value: 'route53', label: 'Route 53' },
    { value: 'godaddy', label: 'GoDaddy' },
    { value: 'mojo', label: 'Mojo delegated ACME (certificate only)' }
];

// `failed` is deliberately absent: a failed registration DELETES its domain row
// and keeps the purchase-ledger row instead, so no `failed` domain ever
// persists and offering the filter would guarantee an empty result.
export const DomainStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'registering', label: 'Registering' },
    { value: 'active', label: 'Active' }
];

export const CertificateStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'issuing', label: 'Issuing' },
    { value: 'active', label: 'Active' },
    { value: 'failed', label: 'Failed' },
    { value: 'revoked', label: 'Revoked' }
];

export const PurchaseStatusOptions = [
    { value: 'quoted', label: 'Quoted' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'expired', label: 'Expired' }
];

/* =========================
 * Domain
 * ========================= */

class Domain extends Model {
    constructor(data = {}, options = {}) {
        super(sanitizeErrorField(data), { endpoint: `${BASE}/domain`, ...options });
    }

    set(key, value, options = {}) {
        if (key && typeof key === 'object') return super.set(sanitizeErrorField(key), value, options);
        if (key === 'last_error') return super.set(key, sanitizeCertificateError(value), options);
        return super.set(key, value, options);
    }

    get isActive() {
        return this.get('status') === 'active';
    }
}

class DomainList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: Domain, endpoint: `${BASE}/domain`, ...options });
    }
}

/* =========================
 * DnsCredential
 * ========================= */

class DnsCredential extends Model {
    constructor(data = {}, options = {}) {
        super(sanitizeErrorField(data), { endpoint: `${BASE}/credential`, ...options });
    }

    set(key, value, options = {}) {
        if (key && typeof key === 'object') return super.set(sanitizeErrorField(key), value, options);
        if (key === 'last_error') return super.set(key, sanitizeCertificateError(value), options);
        return super.set(key, value, options);
    }

    /**
     * Link a new provider credential, or rotate an existing one in place by
     * passing `credential: <pk>`.
     *
     * The same endpoint does both because the key/secret IS the proof of
     * control: it is verified against the provider before anything is stored,
     * so a failed first link persists nothing and a failed rotation leaves the
     * old pair in place.
     */
    static link(data = {}, options = {}) {
        const mutate = () => rest.POST(`${BASE}/credential/link`, {
            group: data.group,
            provider: data.provider,
            name: data.name,
            api_key: data.api_key,
            api_secret: data.api_secret,
            ...(data.credential ? { credential: data.credential } : {})
        });
        if (typeof options.reconcile !== 'function') return mutate();
        const key = `credential:${data.credential || `link:${data.group}:${data.provider}`}`;
        return dnsMutations.run(key, {
            mutate,
            reconcile: options.reconcile,
            classify: options.classify
        });
    }
}

class DnsCredentialList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: DnsCredential, endpoint: `${BASE}/credential`, ...options });
    }
}

class DnsGroupChoice extends Model {
    constructor(data = {}, options = {}) {
        super(data, { endpoint: `${BASE}/credential/group-choice`, ...options });
    }
}

class DnsGroupChoiceList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: DnsGroupChoice, endpoint: `${BASE}/credential/group-choice`, ...options });
    }

    parse(response) {
        const rows = responseRows(response);
        const payload = response?.data?.data || {};
        this.meta = {
            start: payload.start || 0,
            size: payload.size || rows.length,
            count: payload.count === undefined ? rows.length : payload.count
        };
        return rows.map(row => ({ id: row.id, name: row.name }));
    }

    /** Hydrate one selected choice through the route's exact `?id=` contract. */
    async fetchChoice(id) {
        const response = await rest.GET(`${BASE}/credential/group-choice`, { id });
        const row = responseRows(response)[0];
        return row ? new DnsGroupChoice({ id: row.id, name: row.name }) : null;
    }
}

/* =========================
 * DomainPurchase — read-only ledger
 * ========================= */

class DomainPurchase extends Model {
    constructor(data = {}, options = {}) {
        super(data, { endpoint: `${BASE}/purchase`, ...options });
    }
}

class DomainPurchaseList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: DomainPurchase, endpoint: `${BASE}/purchase`, ...options });
    }
}

/* =========================
 * Certificate
 * ========================= */

class Certificate extends Model {
    constructor(data = {}, options = {}) {
        super(projectCertificate(data), { endpoint: `${BASE}/certificate`, ...options });
    }

    set(key, value, options = {}) {
        if (key && typeof key === 'object') return super.set(projectCertificate(key), value, options);
        const projected = projectCertificate({ [key]: value });
        if (!Object.prototype.hasOwnProperty.call(projected, key)) return;
        return super.set(key, projected[key], options);
    }

    /** Queue issuance. Runs as a background job — returns a `pending` row. */
    static request(data = {}, options = {}) {
        const normalized = normalizeCertificateSans(data.names, { apex: options.apex, profile: options.profile });
        if (data.names !== undefined && !normalized.ok) {
            return Promise.resolve({
                success: false,
                data: { status: false, error: normalized.errors[0] }
            });
        }
        const payload = { domain: data.domain };
        if (data.names !== undefined) payload.names = normalized.names;
        const mutate = async () => projectCertificateResponse(
            await rest.POST(`${BASE}/certificate/request`, payload));
        if (typeof options.reconcile !== 'function') return mutate();
        return dnsMutations.run(`certificate:request:${data.domain}`, {
            mutate,
            reconcile: options.reconcile,
            classify: options.classify
        });
    }

    revoke(options = {}) {
        const mutate = async () => projectCertificateResponse(
            await rest.POST(`${BASE}/certificate/revoke`, { certificate: this.id }));
        if (typeof options.reconcile !== 'function') return mutate();
        return dnsMutations.run(`certificate:revoke:${this.id}`, {
            mutate,
            reconcile: options.reconcile,
            classify: options.classify
        });
    }

    // NOTE: there is deliberately no `material()` helper. The backend's
    // certificate/material endpoint exists for serving hosts pulling with their
    // own API key after a `certificate_updated` broadcast; handing a private
    // key to a browser is not something this admin does at any permission level.
}

class CertificateList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: Certificate, endpoint: `${BASE}/certificate`, ...options });
    }

    parse(response) {
        return super.parse(response).map(projectCertificate);
    }
}

class AcmeDelegation extends Model {
    constructor(data = {}, options = {}) {
        super(projectDelegation(data), { endpoint: `${BASE}/delegation`, ...options });
    }

    set(key, value, options = {}) {
        if (key && typeof key === 'object') return super.set(projectDelegation(key), value, options);
        const projected = projectDelegation({ [key]: value });
        if (!Object.prototype.hasOwnProperty.call(projected, key)) return;
        return super.set(key, projected[key], options);
    }
}

class AcmeDelegationList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: AcmeDelegation, endpoint: `${BASE}/delegation`, ...options });
    }

    parse(response) {
        const rows = normalizeDelegationResponse(response);
        this.meta = { ...this.meta, count: rows.length };
        return rows;
    }
}

/* =========================
 * DNS records — live provider read, no ids
 * ========================= */

class DnsRecord extends Model {
    constructor(data = {}, options = {}) {
        // No endpoint: record sets are written through DnsRecordList.upsert /
        // .remove, which post to the domain-scoped dns routes rather than to a
        // per-record URL that does not exist.
        super(data, options);
    }

    get values() {
        const list = this.get('record_values');
        return Array.isArray(list) ? list : [];
    }
}

class DnsRecordList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: DnsRecord,
            endpoint: `${BASE}/dns`,
            params: {},
            ...options
        });
        this.provider = null;
        this.domainName = null;
    }

    /**
     * `GET /api/dnsman/dns?domain=<pk>` answers
     * `{domain, provider, records:[{type,name,record_values,ttl}]}` — a live
     * provider read with no ids and no paging. Synthesising `id` from
     * `type|name` is what lets TableView give each record set its own row model.
     */
    parse(response) {
        const payload = (response && response.data && response.data.data) || {};
        const records = Array.isArray(payload.records) ? payload.records : [];
        this.provider = payload.provider || null;
        this.domainName = payload.domain || null;
        this.meta = {
            ...this.meta,
            provider: payload.provider || null,
            domain: payload.domain || null,
            count: records.length
        };
        return records.map(record => ({ ...record, id: recordKey(record) }));
    }

    /** Create or REPLACE a record set — `record_values` is the complete list. */
    upsert(domainId, record = {}, options = {}) {
        const mutate = () => rest.POST(`${BASE}/dns`, {
            domain: domainId,
            type: record.type,
            name: record.name,
            record_values: record.record_values,
            ttl: record.ttl
        });
        if (typeof options.reconcile !== 'function') return mutate();
        const mutationKey = options.mutationKey || `dns:${domainId}:${recordKey(record)}`;
        return dnsMutations.run(mutationKey, {
            mutate,
            reconcile: options.reconcile,
            classify: options.classify
        });
    }

    /** Delete a record set, or just the listed values from it. */
    remove(domainId, record = {}, options = {}) {
        const body = { domain: domainId, type: record.type, name: record.name };
        if (record.record_values) body.record_values = record.record_values;
        const mutate = () => rest.POST(`${BASE}/dns/delete`, body);
        if (typeof options.reconcile !== 'function') return mutate();
        const mutationKey = options.mutationKey || `dns:${domainId}:${recordKey(record)}`;
        return dnsMutations.run(mutationKey, {
            mutate,
            reconcile: options.reconcile,
            classify: options.classify
        });
    }
}

/* =========================
 * Registrar + capabilities
 * ========================= */

const _capabilities = new Map();
const _capabilitiesPromises = new Map();
const _capabilityStates = new Map();

const capabilityKey = (group) => String(group === null || group === undefined ? '' : group);

export const registrar = {
    /**
     * `GET /api/dnsman/config` — the one place any view asks what this
     * deployment supports (django-mojo >= v1.2.55).
     *
     * Cached for the app session, KEYED BY GROUP. Most of the answer is
     * operator configuration that does not vary per tenant, but
     * `registrant_contact_configured` does: since #951 a group with its own
     * registrant contact answers for that contact, and one without answers for
     * whatever it inherits. Calling this with no argument returns the
     * deployment-wide answer — which is what every caller wanting
     * `allowed_record_types` / `cert_renew_days` / `acme` should use. Pass a
     * group only when the decision is per-tenant, i.e. "can THIS group buy a
     * domain right now".
     *
     * A backend without the endpoint gets DEFAULT_CAPABILITIES, which is
     * deliberately permissive everywhere except `search_batch_limit` /
     * `suggestions_enabled` — so an older server degrades to its previous
     * behaviour instead of blanking. An older server also simply ignores
     * `?group=` and answers globally, which is the pre-#951 behaviour.
     */
    async capabilities(group = null) {
        const key = capabilityKey(group);
        if (_capabilities.has(key)) return _capabilities.get(key);
        if (_capabilitiesPromises.has(key)) return _capabilitiesPromises.get(key);
        const promise = Promise.resolve()
            .then(() => rest.GET(`${BASE}/config`, group ? { group } : {}))
            .then(resp => {
                const data = resp && resp.success && resp.data && resp.data.data;
                const caps = data
                    ? { ...DEFAULT_CAPABILITIES, ...data }
                    : { ...DEFAULT_CAPABILITIES };
                _capabilityStates.set(key, {
                    loaded: !!data,
                    status: resp?.status || null,
                    unsupported: !data && resp?.status === 404
                });
                _capabilities.set(key, caps);
                return caps;
            })
            .catch(error => {
                const caps = { ...DEFAULT_CAPABILITIES };
                _capabilityStates.set(key, {
                    loaded: false,
                    status: error?.status || null,
                    unsupported: false
                });
                _capabilities.set(key, caps);
                return caps;
            })
            .finally(() => {
                _capabilitiesPromises.delete(key);
            });
        _capabilitiesPromises.set(key, promise);
        return promise;
    },

    /**
     * Test seam + a way for a settings change to take effect without a reload.
     *
     * Clears EVERY scope, deliberately: saving the house contact changes the
     * effective answer for every group that has none of its own.
     */
    resetCapabilities() {
        _capabilities.clear();
        _capabilitiesPromises.clear();
        _capabilityStates.clear();
    },

    capabilityState(group = null) {
        return _capabilityStates.get(capabilityKey(group)) || {
            loaded: false, status: null, unsupported: false
        };
    },

    /** Single name. Returns the flat row — unchanged across all backend versions. */
    search(domain) {
        return rest.POST(`${BASE}/registrar/search`, { domain });
    },

    /** Batch: one base name against a TLD list. Returns `{results:[row,...]}`. */
    searchBatch({ domain, tlds }) {
        return rest.POST(`${BASE}/registrar/search`, { domain, tlds });
    },

    /** Alternate names with availability. Same row shape as search. */
    suggest({ domain, count = 10, only_available = true }) {
        return rest.POST(`${BASE}/registrar/suggest`, { domain, count, only_available });
    },

    /**
     * Step one of two. The response carries a single-use `confirm_token` that
     * is shown EXACTLY ONCE and is never retrievable again — only its hash is
     * stored. Callers must keep it in memory and nowhere else.
     */
    quote({ group, domain, years = 1 }) {
        return rest.POST(`${BASE}/registrar/quote`, { group, domain, years });
    },

    /** Step two of two — the irreversible, real-money mutation. */
    purchase({ group, purchase, confirm_token }) {
        return rest.POST(`${BASE}/registrar/purchase`, { group, purchase, confirm_token });
    },

    /** Claim a domain already held at a provider; the credential is the proof. */
    registerExisting({ group, domain, credential }) {
        return rest.POST(`${BASE}/registrar/register-existing`, { group, domain, credential });
    },

    /** Platform superuser only — hands a group control of a house hosted zone. */
    adopt({ group, domain, create_zone = false }) {
        return rest.POST(`${BASE}/registrar/adopt`, { group, domain, create_zone });
    }
};

/* =========================
 * Registrant contact — portal-managed, per group with a house fallback
 * ========================= */

/**
 * `GET`/`POST /api/dnsman/registrant` (django-mojo #951).
 *
 * Two scopes on one path, selected by the framework's standard `?group=`:
 * omit it and you are addressing the HOUSE contact (platform superusers only,
 * enforced by the backend's `require_platform_admin`); supply it and you are
 * addressing that group's own contact.
 *
 * **`group` is omitted, never sent as null.** The backend guards a supplied
 * -but-unresolvable group with a readable 400, and its check is
 * `"group" in request.DATA` — so a JSON body carrying `group: null` trips it
 * on every house-scope save. Query strings are safe either way (Rest drops
 * null params), bodies are not.
 *
 * The response describes THIS scope's own row only — `contact: null`,
 * `source: "none"` and an empty `problems` for a group that inherits. It never
 * echoes an inherited contact's values, and neither may we.
 */
export const registrantContact = {
    get(group = null) {
        return rest.GET(`${BASE}/registrant`, group ? { group } : {});
    },

    save(contact, group = null) {
        return rest.POST(`${BASE}/registrant`, group ? { group, contact } : { contact });
    },

    /** Revert a group to whatever it inherits. Never offered for the house scope. */
    clear(group = null) {
        return rest.POST(`${BASE}/registrant`, group ? { group, clear: true } : { clear: true });
    }
};

/* =========================
 * WHOIS
 * ========================= */

export const whois = {
    /**
     * Registrar-held contacts. Gated on manage_dns rather than view_dns on the
     * backend, because the registrar returns the real registrant name, address,
     * phone and email regardless of WHOIS privacy — the UI must gate its WHOIS
     * section to match.
     */
    get(domainId) {
        return rest.GET(`${BASE}/whois`, { domain: domainId });
    },

    update(domainId, contact) {
        return rest.POST(`${BASE}/whois`, { domain: domainId, contact });
    },

    setPrivacy(domainId, enabled) {
        return rest.POST(`${BASE}/whois/privacy`, { domain: domainId, enabled: !!enabled });
    }
};

/* =========================
 * Forms
 * ========================= */

export const DomainForms = {
    edit: {
        title: 'Domain settings',
        size: 'md',
        fields: [
            { name: 'auto_renew', type: 'switch', label: 'Auto-renew', columns: 12 },
            { name: 'privacy', type: 'switch', label: 'WHOIS privacy', columns: 12 }
        ]
    },

    registerExisting: {
        title: 'Register an existing domain',
        size: 'md',
        fields: [
            {
                name: 'domain', type: 'text', label: 'Domain name', required: true,
                placeholder: 'example.com', columns: 12,
                help: 'A domain you already hold at the provider. Ownership is confirmed against the linked credential.'
            },
            {
                name: 'credential', type: 'select', label: 'Provider credential', required: true,
                columns: 12, options: [],
                help: 'The linked account that holds this domain.'
            }
        ]
    },

    adopt: {
        title: 'Adopt a hosted zone',
        size: 'md',
        fields: [
            {
                name: 'domain', type: 'text', label: 'Domain name', required: true,
                placeholder: 'example.com', columns: 12,
                help: 'An existing hosted zone in the platform AWS account.'
            },
            {
                name: 'create_zone', type: 'switch', label: 'Create the zone if it does not exist',
                columns: 12
            }
        ]
    }
};

export const DnsCredentialForms = {
    link: {
        title: 'Link a provider credential',
        size: 'md',
        fields: [
            { name: 'name', type: 'text', label: 'Label', required: true, placeholder: 'Acme Corp GoDaddy', columns: 12 },
            {
                name: 'provider', type: 'select', label: 'Provider', required: true, columns: 12,
                options: DomainProviderOptions.filter(option => option.value !== 'route53'),
                value: 'godaddy',
                help: 'Route 53 uses the platform credentials and needs no key here.'
            },
            { name: 'api_key', type: 'password', label: 'API key', required: true, columns: 12 },
            {
                name: 'api_secret', type: 'password', label: 'API secret', required: true, columns: 12,
                help: 'Verified against the provider before anything is stored. A failed link saves nothing.'
            }
        ]
    }
};

export const CertificateForms = {
    request: {
        title: 'Request a certificate',
        size: 'md',
        fields: [
            { name: 'domain', type: 'select', label: 'Domain', required: true, columns: 12, options: [] },
            {
                name: 'names', type: 'taginput', label: 'Names', columns: 12,
                help: 'Defaults to the domain plus its wildcard. Issuance runs in the background and takes a few minutes.'
            }
        ]
    }
};

export {
    Domain, DomainList,
    DnsCredential, DnsCredentialList, DnsGroupChoice, DnsGroupChoiceList,
    DomainPurchase, DomainPurchaseList,
    Certificate, CertificateList, AcmeDelegation, AcmeDelegationList,
    DnsRecord, DnsRecordList,
    DNS_RECORD_TYPES, CAA_TAGS
};

// Aggregate default — the unit-test module loader returns a module's default
// binding, so exporting the Domain class alone would hide every other class
// from the tests. Same shape as geofenceData.js; runtime code uses the named
// exports above.
//
// Keep the phrase "export"+"default" out of comments in this file: the test
// harness rewrites that token pair wherever it appears, comments included, and
// silently emits a `return` above the real declaration (memory: WM-024).
export default {
    Domain, DomainList,
    DnsCredential, DnsCredentialList, DnsGroupChoice, DnsGroupChoiceList,
    DomainPurchase, DomainPurchaseList,
    Certificate, CertificateList, AcmeDelegation, AcmeDelegationList,
    DnsRecord, DnsRecordList,
    registrar, whois, registrantContact,
    DomainForms, DnsCredentialForms, CertificateForms,
    DomainProviderOptions, DomainStatusOptions,
    CertificateStatusOptions, PurchaseStatusOptions,
    DNS_RECORD_TYPES, CAA_TAGS
};
