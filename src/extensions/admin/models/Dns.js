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

const BASE = '/api/dnsman';

/* =========================
 * Constants
 * ========================= */

export const DomainProviderOptions = [
    { value: 'route53', label: 'Route 53' },
    { value: 'godaddy', label: 'GoDaddy' }
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
        super(data, { endpoint: `${BASE}/domain`, ...options });
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
        super(data, { endpoint: `${BASE}/credential`, ...options });
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
    static link(data = {}) {
        return rest.POST(`${BASE}/credential/link`, data);
    }
}

class DnsCredentialList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: DnsCredential, endpoint: `${BASE}/credential`, ...options });
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
        super(data, { endpoint: `${BASE}/certificate`, ...options });
    }

    /** Queue issuance. Runs as a background job — returns a `pending` row. */
    static request(data = {}) {
        return rest.POST(`${BASE}/certificate/request`, data);
    }

    revoke() {
        return rest.POST(`${BASE}/certificate/revoke`, { certificate: this.id });
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
    upsert(domainId, record = {}) {
        return rest.POST(`${BASE}/dns`, {
            domain: domainId,
            type: record.type,
            name: record.name,
            record_values: record.record_values,
            ttl: record.ttl
        });
    }

    /** Delete a record set, or just the listed values from it. */
    remove(domainId, record = {}) {
        const body = { domain: domainId, type: record.type, name: record.name };
        if (record.record_values) body.record_values = record.record_values;
        return rest.POST(`${BASE}/dns/delete`, body);
    }
}

/* =========================
 * Registrar + capabilities
 * ========================= */

let _capabilities = null;
let _capabilitiesPromise = null;

export const registrar = {
    /**
     * `GET /api/dnsman/config` — the one place any view asks what this
     * deployment supports (django-mojo >= v1.2.55).
     *
     * Cached for the app session: the answer is operator configuration, not
     * tenant data, and it does not vary per group. A backend without the
     * endpoint gets DEFAULT_CAPABILITIES, which is deliberately permissive
     * everywhere except `search_batch_limit` / `suggestions_enabled` — so an
     * older server degrades to its previous behaviour instead of blanking.
     */
    async capabilities() {
        if (_capabilities) return _capabilities;
        if (_capabilitiesPromise) return _capabilitiesPromise;
        _capabilitiesPromise = (async () => {
            let resp = null;
            try {
                resp = await rest.GET(`${BASE}/config`);
            } catch {
                resp = null;
            }
            const data = resp && resp.success && resp.data && resp.data.data;
            _capabilities = data
                ? { ...DEFAULT_CAPABILITIES, ...data }
                : { ...DEFAULT_CAPABILITIES };
            _capabilitiesPromise = null;
            return _capabilities;
        })();
        return _capabilitiesPromise;
    },

    /** Test seam + a way for a settings change to take effect without a reload. */
    resetCapabilities() {
        _capabilities = null;
        _capabilitiesPromise = null;
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
    DnsCredential, DnsCredentialList,
    DomainPurchase, DomainPurchaseList,
    Certificate, CertificateList,
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
    DnsCredential, DnsCredentialList,
    DomainPurchase, DomainPurchaseList,
    Certificate, CertificateList,
    DnsRecord, DnsRecordList,
    registrar, whois,
    DomainForms, DnsCredentialForms, CertificateForms,
    DomainProviderOptions, DomainStatusOptions,
    CertificateStatusOptions, PurchaseStatusOptions,
    DNS_RECORD_TYPES, CAA_TAGS
};
