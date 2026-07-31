/**
 * registrantData - pure data, validation and mapping helpers for the dnsman
 * registrant contact (#952).
 *
 * Dependency-free on purpose, exactly like dnsData.js: the rules that can be
 * wrong here are worth testing without a DOM, a framework or a network
 * (test/unit/RegistrantContact.test.js).
 *
 * Two things it is NOT:
 *
 *  - It is not a replacement for server validation. django-mojo's
 *    `registrar.validate_contact()` (#951) enforces the same rules and its
 *    refusal is always authoritative — it also rejects unknown keys and
 *    non-text scalars, and it runs again at quote time before any AWS spend.
 *    The mirrored checks here exist so a user never round-trips a 400 for
 *    something we could have said instantly.
 *  - It is not a country-name source. `buildContactFields()` takes the option
 *    list as an argument rather than importing one, so this module stays
 *    dependency-free (the dnsData.js "helpers take `caps` as an argument"
 *    convention).
 *
 * The rule with real consequences lives in `buildContactPayload`: see its
 * docstring. Getting it wrong writes the operator's personal data into a
 * tenant's row.
 */

// ── The AWS ContactDetail shape ─────────────────────────────────────────────
//
// `CONTACT_FIELDS` is what this form edits. AWS's ContactDetail also carries
// `Fax` and `ExtraParams`, which the form deliberately does not render — see
// buildContactPayload for why they still have to survive a save.

export const CONTACT_FIELDS = [
    'FirstName', 'LastName', 'ContactType', 'OrganizationName',
    'AddressLine1', 'AddressLine2', 'City', 'State',
    'CountryCode', 'ZipCode', 'PhoneNumber', 'Email'
];

export const REQUIRED_FIELDS = [
    'FirstName', 'LastName', 'ContactType', 'AddressLine1',
    'City', 'CountryCode', 'ZipCode', 'PhoneNumber', 'Email'
];

/** Route53's enum, verified against the botocore model in #951. */
export const CONTACT_TYPES = ['PERSON', 'COMPANY', 'ASSOCIATION', 'PUBLIC_BODY', 'RESELLER'];

export const CONTACT_TYPE_OPTIONS = [
    { value: 'PERSON', label: 'Person' },
    { value: 'COMPANY', label: 'Company' },
    { value: 'ASSOCIATION', label: 'Association' },
    { value: 'PUBLIC_BODY', label: 'Public body' },
    { value: 'RESELLER', label: 'Reseller' }
];

/** ICANN requires a state/province for these; AWS accepts one for any country. */
export const STATE_REQUIRED_COUNTRIES = ['US', 'CA'];

/** ICANN dotted form: `+1.5551234567`. */
export const PHONE_RE = /^\+\d{1,3}\.\d{4,15}$/;

export const COUNTRY_CODE_RE = /^[A-Z]{2}$/;

const FIELD_LABELS = {
    FirstName: 'First name',
    LastName: 'Last name',
    ContactType: 'Contact type',
    OrganizationName: 'Organization',
    AddressLine1: 'Address line 1',
    AddressLine2: 'Address line 2',
    City: 'City',
    State: 'State / province',
    CountryCode: 'Country',
    ZipCode: 'Postal code',
    PhoneNumber: 'Phone number',
    Email: 'Email'
};

export function fieldLabel(field) {
    return FIELD_LABELS[field] || field;
}

function str(value) {
    return value === null || value === undefined ? '' : String(value);
}

function trimmed(contact, field) {
    return str(contact && contact[field]).trim();
}

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a contact. Returns `[{ field, message }]` — empty means valid.
 *
 * Mirrors django-mojo's `registrar.validate_contact()` (#951 D4). Messages
 * name FIELDS, never values: the same discipline the server keeps, because a
 * problem list is rendered in a UI whose reader may not be entitled to the
 * value that caused it.
 *
 * The server remains the authority. Where this disagrees with it, the server's
 * 400 is what the user sees — so a check that is not certain belongs on the
 * server side of the line, not here.
 */
export function validateContact(contact) {
    const problems = [];
    const add = (field, message) => problems.push({ field, message });

    REQUIRED_FIELDS.forEach(field => {
        if (trimmed(contact, field) === '') {
            add(field, `${fieldLabel(field)} is required.`);
        }
    });

    const country = trimmed(contact, 'CountryCode').toUpperCase();
    if (country !== '' && !COUNTRY_CODE_RE.test(country)) {
        add('CountryCode', 'Country must be a two-letter country code.');
    }
    if (STATE_REQUIRED_COUNTRIES.includes(country) && trimmed(contact, 'State') === '') {
        add('State', `${fieldLabel('State')} is required for this country.`);
    }

    const type = trimmed(contact, 'ContactType');
    if (type !== '' && !CONTACT_TYPES.includes(type)) {
        add('ContactType', `${fieldLabel('ContactType')} must be one of: ${CONTACT_TYPES.join(', ')}.`);
    }

    const phone = trimmed(contact, 'PhoneNumber');
    if (phone !== '' && !PHONE_RE.test(phone)) {
        add('PhoneNumber', 'Phone number must be in the form +1.5551234567 — a country code, a dot, then digits.');
    }

    return problems;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

/** Server contact → flat form data. Every editable field present as a string. */
export function contactToForm(contact) {
    const form = {};
    CONTACT_FIELDS.forEach(field => { form[field] = str(contact && contact[field]); });
    return form;
}

/** Keys of a stored contact this form does not render. */
export function preservedKeys(raw) {
    if (!raw || typeof raw !== 'object') return [];
    return Object.keys(raw).filter(key => !CONTACT_FIELDS.includes(key));
}

/**
 * Form data → the contact to POST.
 *
 * `save_contact` REPLACES the whole stored value (#951) — it does not merge —
 * so anything absent from this payload is deleted. Two consequences, and they
 * pull in opposite directions:
 *
 *  - A key the form does not render (`Fax`, `ExtraParams`, anything a future
 *    AWS shape adds) must be carried across, or the first edit of a contact
 *    created outside the portal silently destroys it. ccTLD deployments use
 *    `ExtraParams`.
 *  - A field the user CLEARED must not be resurrected from `raw`, or an
 *    optional field can never be emptied. Hence blank form values are omitted
 *    rather than sent as `""` — which also keeps `OrganizationName: ""` away
 *    from Route53.
 *
 * **`raw` MUST be the contact loaded for the scope being saved, or null.**
 * Passing the previously-loaded scope's contact here writes its `ExtraParams`
 * — where AWS carries date of birth and national ID — into the row being
 * saved. None of those keys is rendered, so nothing on screen would show it
 * happening. The page clears its stashed copy on every scope change and only
 * repopulates it from a `source: "database"` load of the current scope; when
 * in doubt pass null.
 */
export function buildContactPayload(raw, form) {
    const payload = {};
    preservedKeys(raw).forEach(key => { payload[key] = raw[key]; });
    CONTACT_FIELDS.forEach(field => {
        const value = str(form && form[field]).trim();
        if (value !== '') payload[field] = value;
    });
    return payload;
}

// ── Form definition ─────────────────────────────────────────────────────────

/**
 * FormView fields for the contact editor.
 *
 * `countryOptions` is passed in ([{value,label}], ISO2 → name) so this module
 * needs no import. `State` is never marked required even though it is required
 * for US/CA: native `required` cannot express a conditional, and hiding the
 * field for other countries would be wrong twice over — AWS accepts a state
 * anywhere, and hiding a filled field invites dropping its value. The
 * conditional rule lives in validateContact(), which is the only save gate.
 */
export function buildContactFields(countryOptions = []) {
    return [
        { name: 'FirstName', type: 'text', label: fieldLabel('FirstName'), required: true, columns: 6 },
        { name: 'LastName', type: 'text', label: fieldLabel('LastName'), required: true, columns: 6 },
        {
            name: 'ContactType', type: 'select', label: fieldLabel('ContactType'), required: true,
            options: CONTACT_TYPE_OPTIONS, columns: 6,
            help: 'How the registry classifies the registrant.'
        },
        {
            name: 'OrganizationName', type: 'text', label: fieldLabel('OrganizationName'), columns: 6,
            help: 'Optional — required by some registries for a company registrant.'
        },
        { name: 'AddressLine1', type: 'text', label: fieldLabel('AddressLine1'), required: true, columns: 12 },
        { name: 'AddressLine2', type: 'text', label: fieldLabel('AddressLine2'), columns: 12 },
        { name: 'City', type: 'text', label: fieldLabel('City'), required: true, columns: 6 },
        {
            name: 'State', type: 'text', label: fieldLabel('State'), columns: 6,
            help: 'Required for the United States and Canada.'
        },
        {
            name: 'CountryCode', type: 'select', label: fieldLabel('CountryCode'), required: true,
            options: [{ value: '', label: 'Select a country…' }, ...countryOptions], columns: 6
        },
        { name: 'ZipCode', type: 'text', label: fieldLabel('ZipCode'), required: true, columns: 6 },
        {
            name: 'PhoneNumber', type: 'text', label: fieldLabel('PhoneNumber'), required: true, columns: 6,
            placeholder: '+1.5551234567',
            help: 'ICANN format: country code, a dot, then the number.'
        },
        {
            name: 'Email', type: 'email', label: fieldLabel('Email'), required: true, columns: 6,
            help: 'ICANN sends the registrant verification here. An unverified address suspends the domain after 15 days.'
        }
    ];
}

// Aggregate default export — the unit-test module loader returns a module's
// default binding; runtime code uses the named exports above.
export default {
    CONTACT_FIELDS,
    REQUIRED_FIELDS,
    CONTACT_TYPES,
    CONTACT_TYPE_OPTIONS,
    STATE_REQUIRED_COUNTRIES,
    PHONE_RE,
    COUNTRY_CODE_RE,
    fieldLabel,
    validateContact,
    contactToForm,
    preservedKeys,
    buildContactPayload,
    buildContactFields
};
