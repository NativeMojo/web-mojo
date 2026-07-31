/**
 * RegistrantContact.test.js - the pure registrant-contact rules (#952).
 *
 * registrantData.js is dependency-free ESM; load it through the
 * simple-module-loader transform, same as DnsData.test.js.
 *
 * The invariants here are the ones where being wrong has a consequence beyond
 * a bad error message: a payload that resurrects a cleared field, a payload
 * that DROPS a key the form never rendered, and — the sharp one — a payload
 * that carries one scope's private keys into another scope's row.
 */
module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const path = require('path');
    const { moduleLoader } = require('../utils/simple-module-loader');

    const registrantData = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/extensions/admin/dns/registrantData.js'),
        'registrantData'
    );
    const {
        CONTACT_FIELDS,
        CONTACT_TYPES,
        validateContact,
        contactToForm,
        preservedKeys,
        buildContactPayload,
        buildContactFields
    } = registrantData;

    /** A contact that passes every rule — mutate a copy to test one at a time. */
    const VALID = {
        FirstName: 'Ada',
        LastName: 'Lovelace',
        ContactType: 'COMPANY',
        OrganizationName: 'NativeMojo',
        AddressLine1: '1 Analytical Way',
        City: 'London',
        CountryCode: 'GB',
        ZipCode: 'W1A 1AA',
        PhoneNumber: '+44.2071234567',
        Email: 'ops@example.com'
    };

    const fieldsWithProblems = (contact) => validateContact(contact).map(p => p.field);

    describe('registrantData', () => {

        describe('validateContact — required fields', () => {
            it('accepts a complete contact', () => {
                expect(validateContact(VALID)).toEqual([]);
            });

            it('names every missing required field', () => {
                const fields = fieldsWithProblems({});
                ['FirstName', 'LastName', 'ContactType', 'AddressLine1',
                    'City', 'CountryCode', 'ZipCode', 'PhoneNumber', 'Email']
                    .forEach(field => expect(fields).toContain(field));
            });

            it('does not require the optional fields', () => {
                const fields = fieldsWithProblems({});
                expect(fields).not.toContain('OrganizationName');
                expect(fields).not.toContain('AddressLine2');
            });

            it('treats a whitespace-only value as missing, matching the server', () => {
                expect(fieldsWithProblems({ ...VALID, City: '   ' })).toContain('City');
                expect(fieldsWithProblems({ ...VALID, Email: '\t\n' })).toContain('Email');
            });

            it('treats null and undefined as missing without throwing', () => {
                expect(fieldsWithProblems({ ...VALID, City: null })).toContain('City');
                expect(fieldsWithProblems({ ...VALID, City: undefined })).toContain('City');
                expect(() => validateContact(null)).not.toThrow();
            });
        });

        describe('validateContact — State is conditional on the country', () => {
            it('requires State for the United States and Canada', () => {
                expect(fieldsWithProblems({ ...VALID, CountryCode: 'US', ZipCode: '94107' }))
                    .toContain('State');
                expect(fieldsWithProblems({ ...VALID, CountryCode: 'CA', ZipCode: 'M5V 2T6' }))
                    .toContain('State');
            });

            it('does not require State elsewhere', () => {
                expect(fieldsWithProblems(VALID)).not.toContain('State');
            });

            it('accepts a State for a country that does not require one', () => {
                // AWS accepts a state anywhere. The form never hides the field,
                // so a filled value must not become an error.
                expect(validateContact({ ...VALID, State: 'Greater London' })).toEqual([]);
            });

            it('is satisfied once State is supplied for US', () => {
                expect(validateContact({
                    ...VALID, CountryCode: 'US', ZipCode: '94107', State: 'CA'
                })).toEqual([]);
            });
        });

        describe('validateContact — shape rules', () => {
            it('accepts every ContactType in the Route53 enum', () => {
                CONTACT_TYPES.forEach(type => {
                    expect(validateContact({ ...VALID, ContactType: type })).toEqual([]);
                });
            });

            it('rejects a ContactType outside the enum', () => {
                expect(fieldsWithProblems({ ...VALID, ContactType: 'INDIVIDUAL' }))
                    .toContain('ContactType');
                // Case matters — the server compares against the exact enum.
                expect(fieldsWithProblems({ ...VALID, ContactType: 'person' }))
                    .toContain('ContactType');
            });

            it('accepts an ICANN-format phone number', () => {
                expect(validateContact({ ...VALID, PhoneNumber: '+1.5551234567' })).toEqual([]);
                expect(validateContact({ ...VALID, PhoneNumber: '+44.2071234567' })).toEqual([]);
            });

            it('rejects phone numbers that are not ICANN format', () => {
                ['555-123-4567', '+15551234567', '+1.555', '15551234567', '+1.555123456789012345']
                    .forEach(phone => {
                        expect(fieldsWithProblems({ ...VALID, PhoneNumber: phone }))
                            .toContain('PhoneNumber');
                    });
            });

            it('rejects a CountryCode that is not two letters', () => {
                expect(fieldsWithProblems({ ...VALID, CountryCode: 'usa' })).toContain('CountryCode');
                expect(fieldsWithProblems({ ...VALID, CountryCode: 'U1' })).toContain('CountryCode');
                expect(fieldsWithProblems({ ...VALID, CountryCode: 'G' })).toContain('CountryCode');
            });

            it('never echoes a value in a problem message', () => {
                // The server keeps this discipline (#951) because a problem list
                // is rendered to a reader who may not be entitled to the value
                // that caused it. Ours must match or the UI reintroduces the leak.
                const problems = validateContact({
                    ...VALID,
                    ContactType: 'SECRET-ORG-NAME',
                    PhoneNumber: '555-SECRET',
                    CountryCode: 'secretcode'
                });
                expect(problems.length).toBeGreaterThan(0);
                problems.forEach(problem => {
                    expect(problem.message).not.toContain('SECRET');
                    expect(problem.message).not.toContain('secret');
                });
            });
        });

        describe('contactToForm', () => {
            it('returns every editable field as a string', () => {
                const form = contactToForm(VALID);
                CONTACT_FIELDS.forEach(field => {
                    expect(typeof form[field]).toBe('string');
                });
                expect(form.FirstName).toBe('Ada');
                expect(form.AddressLine2).toBe('');
            });

            it('handles a null contact', () => {
                const form = contactToForm(null);
                expect(Object.keys(form).length).toBe(CONTACT_FIELDS.length);
                expect(form.Email).toBe('');
            });

            it('does not carry keys the form cannot edit', () => {
                const form = contactToForm({ ...VALID, Fax: '+44.2071234568' });
                expect(form.Fax).toBeUndefined();
            });
        });

        describe('preservedKeys', () => {
            it('lists only the keys the form does not render', () => {
                expect(preservedKeys({ ...VALID, Fax: '+1.5551110000', ExtraParams: [] }))
                    .toEqual(['Fax', 'ExtraParams']);
            });

            it('is empty for a contact with no extras, and for null', () => {
                expect(preservedKeys(VALID)).toEqual([]);
                expect(preservedKeys(null)).toEqual([]);
            });
        });

        describe('buildContactPayload', () => {
            const EXTRAS = {
                Fax: '+44.2071234568',
                ExtraParams: [{ Name: 'CA_LEGAL_TYPE', Value: 'CCT' }]
            };

            it('carries keys the form never rendered', () => {
                // save_contact REPLACES the stored value, so a dropped key is
                // deleted. ccTLD deployments rely on ExtraParams.
                const payload = buildContactPayload({ ...VALID, ...EXTRAS }, contactToForm(VALID));
                expect(payload.Fax).toBe(EXTRAS.Fax);
                expect(payload.ExtraParams).toEqual(EXTRAS.ExtraParams);
            });

            it('omits a blank optional field rather than sending an empty string', () => {
                const payload = buildContactPayload(null, contactToForm(VALID));
                expect(payload).not.toHaveProperty('AddressLine2');
                expect(payload).not.toHaveProperty('State');
            });

            it('drops a CLEARED optional field instead of restoring it from raw', () => {
                // The regression that makes "remove my organization name"
                // possible at all: a naive {...raw, ...form} merge resurrects it.
                const raw = { ...VALID, OrganizationName: 'NativeMojo' };
                const form = { ...contactToForm(raw), OrganizationName: '' };
                const payload = buildContactPayload(raw, form);
                expect(payload).not.toHaveProperty('OrganizationName');
            });

            it('takes edited values over the raw contact', () => {
                const form = { ...contactToForm(VALID), City: 'Manchester' };
                expect(buildContactPayload(VALID, form).City).toBe('Manchester');
            });

            it('trims what it sends', () => {
                const form = { ...contactToForm(VALID), City: '  Bristol  ' };
                expect(buildContactPayload(null, form).City).toBe('Bristol');
            });

            it('sends scalars as text — the server rejects an int ZipCode', () => {
                const form = { ...contactToForm(VALID), ZipCode: 94107 };
                expect(buildContactPayload(null, form).ZipCode).toBe('94107');
            });

            it('carries NO extras when raw is null — the cross-scope PII rule', () => {
                // The failure this pins: the page is opened on the house scope
                // (raw = the operator's contact, including ExtraParams, where AWS
                // carries date of birth and national ID), the user switches to a
                // tenant group with no contact of its own, fills the form and
                // saves. If raw is still the house contact, save_contact replaces
                // the TENANT's whole row with a payload carrying the operator's
                // private keys — readable afterwards by any manage_dns holder on
                // that group, through the backend's own legitimate own-row read.
                //
                // The page's defence is to clear its stashed copy on every scope
                // change; this asserts the helper honours a null.
                const payload = buildContactPayload(null, contactToForm(VALID));
                expect(payload).not.toHaveProperty('Fax');
                expect(payload).not.toHaveProperty('ExtraParams');
                expect(Object.keys(payload).sort()).toEqual(
                    ['AddressLine1', 'City', 'ContactType', 'CountryCode', 'Email',
                        'FirstName', 'LastName', 'OrganizationName', 'PhoneNumber', 'ZipCode']
                );
            });

            it('round-trips a well-formed contact through form and back', () => {
                const payload = buildContactPayload(null, contactToForm(VALID));
                expect(payload).toEqual(VALID);
                expect(validateContact(payload)).toEqual([]);
            });
        });

        describe('buildContactFields', () => {
            it('covers exactly the editable field set', () => {
                const names = buildContactFields([]).map(field => field.name);
                expect(names.sort()).toEqual(CONTACT_FIELDS.slice().sort());
            });

            it('offers ContactType and CountryCode as selects, not free text', () => {
                const fields = buildContactFields([{ value: 'GB', label: 'United Kingdom' }]);
                const byName = Object.fromEntries(fields.map(field => [field.name, field]));
                expect(byName.ContactType.type).toBe('select');
                expect(byName.ContactType.options.map(o => o.value)).toEqual(CONTACT_TYPES);
                expect(byName.CountryCode.type).toBe('select');
                expect(byName.CountryCode.options.map(o => o.value)).toContain('GB');
            });

            it('never marks State required — the rule is conditional and lives in validateContact', () => {
                const state = buildContactFields([]).find(field => field.name === 'State');
                expect(state.required).toBeUndefined();
            });

            it('marks the unconditionally-required fields required', () => {
                const byName = Object.fromEntries(buildContactFields([]).map(f => [f.name, f]));
                ['FirstName', 'LastName', 'ContactType', 'AddressLine1', 'City',
                    'CountryCode', 'ZipCode', 'PhoneNumber', 'Email']
                    .forEach(field => expect(byName[field].required).toBe(true));
                expect(byName.OrganizationName.required).toBeUndefined();
                expect(byName.AddressLine2.required).toBeUndefined();
            });
        });
    });
};
