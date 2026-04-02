import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/* =========================
 * Constants
 * ========================= */

const IPSetKindOptions = [
    { value: 'country', label: 'Country — Block all traffic from a country' },
    { value: 'abuse', label: 'Abuse Feed — Import known attacker IPs' },
    { value: 'datacenter', label: 'Datacenter — Block datacenter/hosting ranges' },
    { value: 'custom', label: 'Custom — Define your own CIDR list' },
];

const IPSetKindBadgeOptions = [
    { value: 'country', label: 'Country' },
    { value: 'abuse', label: 'Abuse Feed' },
    { value: 'datacenter', label: 'Datacenter' },
    { value: 'custom', label: 'Custom' },
];

const IPSetSourceOptions = [
    { value: 'ipdeny', label: 'IPDeny (Country Zones)' },
    { value: 'abuseipdb', label: 'AbuseIPDB' },
    { value: 'manual', label: 'Manual' },
];

const CommonBlockCountries = [
    { value: 'cn', label: 'China' },
    { value: 'ru', label: 'Russia' },
    { value: 'kp', label: 'North Korea' },
    { value: 'ir', label: 'Iran' },
    { value: 'ng', label: 'Nigeria' },
    { value: 'ro', label: 'Romania' },
    { value: 'br', label: 'Brazil' },
    { value: 'in', label: 'India' },
    { value: 'pk', label: 'Pakistan' },
    { value: 'id', label: 'Indonesia' },
    { value: 'vn', label: 'Vietnam' },
    { value: 'ua', label: 'Ukraine' },
    { value: 'th', label: 'Thailand' },
    { value: 'ph', label: 'Philippines' },
    { value: 'bd', label: 'Bangladesh' },
    { value: 'eg', label: 'Egypt' },
    { value: 'tr', label: 'Turkey' },
    { value: 'mx', label: 'Mexico' },
    { value: 'ar', label: 'Argentina' },
    { value: 'co', label: 'Colombia' },
];

/* =========================
 * IPSet Model
 * ========================= */

class IPSet extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/incident/ipset',
        });
    }
}

/* =========================
 * IPSet Collection
 * ========================= */

class IPSetList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: IPSet,
            endpoint: '/api/incident/ipset',
            ...options,
        });
    }
}

/* =========================
 * Forms
 * ========================= */

const IPSetForms = {
    create: {
        title: 'Create IP Set',
        size: 'md',
        fields: [
            {
                name: 'kind',
                type: 'select',
                label: 'What do you want to block?',
                required: true,
                options: IPSetKindOptions,
                value: 'country',
                columns: 12
            },
            // ── Country fields ──
            {
                name: 'country_code',
                type: 'select',
                label: 'Country',
                required: true,
                options: CommonBlockCountries,
                help: 'Select a country to block. CIDRs are fetched automatically from IPDeny.',
                columns: 8,
                showWhen: { field: 'kind', value: 'country' }
            },
            // ── Abuse feed fields ──
            {
                name: 'source_key',
                type: 'text',
                label: 'API Key',
                required: true,
                placeholder: 'Your AbuseIPDB API key',
                help: 'Get a free key at abuseipdb.com. Never stored in plaintext.',
                columns: 12,
                showWhen: { field: 'kind', value: 'abuse' }
            },
            // ── Datacenter fields ──
            {
                name: 'source_url',
                type: 'url',
                label: 'Source URL',
                required: true,
                placeholder: 'https://example.com/datacenter-ranges.txt',
                help: 'URL to a plain text file with one CIDR per line.',
                columns: 12,
                showWhen: { field: 'kind', value: 'datacenter' }
            },
            // ── Custom fields ──
            {
                name: 'data',
                type: 'textarea',
                label: 'CIDR List',
                rows: 8,
                placeholder: '# One CIDR per line\n192.0.2.0/24\n198.51.100.0/24\n203.0.113.0/24',
                help: 'Enter IP ranges in CIDR notation. Lines starting with # are ignored.',
                columns: 12,
                showWhen: { field: 'kind', value: 'custom' }
            },
            // ── Shared fields (non-country) ──
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                placeholder: 'e.g., abuse_ips, dc_aws',
                help: 'Unique identifier. Used as the kernel ipset name.',
                columns: 6,
                showWhen: { field: 'kind', value: 'country', negate: true }
            },
            {
                name: 'description',
                type: 'text',
                label: 'Description',
                placeholder: 'Human-readable label',
                columns: 6,
                showWhen: { field: 'kind', value: 'country', negate: true }
            },
            // ── Always visible ──
            {
                name: 'is_enabled',
                type: 'switch',
                label: 'Enable immediately',
                value: true,
                help: 'When enabled, CIDRs are synced to the fleet and traffic is blocked.',
                columns: 4
            },
        ]
    },

    edit: {
        title: 'Edit IP Set',
        size: 'md',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Name',
                required: true,
                columns: 6
            },
            {
                name: 'kind',
                type: 'select',
                label: 'Kind',
                options: IPSetKindBadgeOptions,
                disabled: true,
                columns: 3
            },
            {
                name: 'is_enabled',
                type: 'switch',
                label: 'Enabled',
                columns: 3
            },
            {
                name: 'description',
                type: 'text',
                label: 'Description',
                columns: 12
            },
            {
                name: 'source',
                type: 'select',
                label: 'Source',
                options: IPSetSourceOptions,
                columns: 6
            },
            {
                name: 'source_url',
                type: 'url',
                label: 'Source URL',
                columns: 6
            },
            {
                name: 'source_key',
                type: 'text',
                label: 'API Key',
                placeholder: 'Leave blank to keep current key',
                help: 'Write-only — current value is never shown.',
                columns: 12
            },
        ]
    }
};

IPSet.EDIT_FORM = IPSetForms.edit;

export {
    IPSet,
    IPSetList,
    IPSetForms,
    IPSetKindOptions,
    IPSetKindBadgeOptions,
    IPSetSourceOptions,
    CommonBlockCountries
};
