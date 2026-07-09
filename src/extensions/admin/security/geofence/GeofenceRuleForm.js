/**
 * GeofenceRuleForm - shared FormView field definitions for editing a geofence
 * rule in plain language (country policy, blocked US states, anonymizer
 * toggles). Used by the platform rules editor (GeofenceRulesView) and the
 * per-group panel (GroupGeofenceSection) so both speak the same language and
 * share one rule↔form mapping (geofenceData.js).
 */
import { COUNTRY_CENTROIDS } from '@ext/map/countryCentroids.js';
import { US_STATES, ABUSE_FLAGS } from './geofenceData.js';

// Country options derived from the map extension's centroid table
// (ISO2 → { name }) — the only country-name source in the framework.
export const COUNTRIES = Object.entries(COUNTRY_CENTROIDS)
    .map(([code, info]) => ({ value: code, label: info?.name || code }))
    .sort((a, b) => a.label.localeCompare(b.label));

const COUNTRY_NAMES = Object.fromEntries(COUNTRIES.map(c => [c.value, c.label]));

/** ISO2 country code → display name (unknown → raw code). */
export function countryName(code) {
    if (!code) return '';
    return COUNTRY_NAMES[String(code).toUpperCase()] || String(code);
}

export const COUNTRY_MODE_OPTS = [
    { value: '',      label: 'No country rule' },
    { value: 'block', label: 'Block the listed countries' },
    { value: 'allow', label: 'Allow only the listed countries' }
];

const ABUSE_HELP = {
    vpn: 'Commercial VPN exit addresses.',
    tor: 'Tor exit nodes.',
    proxy: 'Open/anonymous proxies.',
    datacenter: 'Cloud-hosted addresses (AWS, GCP, …) — can affect legitimate automation.'
};

/**
 * FormView fields for the friendly rule editor. `form` is the flat baseline
 * from geofenceData.ruleToForm(rule); multiselects need their value passed in
 * the field config as well as the FormView data.
 */
export function buildRuleFields(form) {
    const fields = [
        {
            name: 'country_mode',
            type: 'select',
            label: 'Country policy',
            options: COUNTRY_MODE_OPTS,
            columns: 12
        },
        {
            name: 'countries',
            type: 'multiselect',
            label: 'Countries',
            help: 'Countries are matched by ISO code; pick them by name.',
            options: COUNTRIES,
            value: form.countries || [],
            showWhen: { field: 'country_mode', value: ['allow', 'block'] },
            columns: 12
        },
        {
            name: 'blocked_states',
            type: 'multiselect',
            label: 'Blocked US states',
            help: 'States are matched by region code (Washington → US-WA).',
            options: US_STATES,
            value: form.blocked_states || [],
            columns: 12
        },
        { type: 'header', text: 'Anonymized connections', level: 6, class: 'mt-2' }
    ];
    for (const f of ABUSE_FLAGS) {
        fields.push({
            name: `block_${f.key}`,
            type: 'toggle',
            label: `Block ${f.label.toLowerCase()}`,
            help: ABUSE_HELP[f.key] || '',
            columns: 6
        });
    }
    return fields;
}
