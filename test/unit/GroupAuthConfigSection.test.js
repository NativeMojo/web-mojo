/**
 * GroupAuthConfigSection — registration.extra_fields editing.
 *
 * The full section needs an app/model context the lightweight runner can't
 * synthesize, so we load the class via the module loader (FormView resolves to
 * a harmless stub; View is loaded for the `extends` chain) and exercise the
 * pure transform/baseline/diff methods on an Object.create(prototype) instance —
 * no constructor, no DOM.
 *
 * Locks in the comma-string ⇄ [{name}] round-trip and the per-group diff so a
 * future refactor can't silently drop extra-field capture from the admin UI.
 */
const path = require('path');
const { SimpleModuleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    const loader = new SimpleModuleLoader();
    loader.loadModule('View'); // sets global.View so `extends View` resolves
    const Section = loader.loadModuleFromFile(
        path.resolve(__dirname, '../../src/extensions/admin/account/groups/GroupAuthConfigSection.js'),
        'GroupAuthConfigSection'
    );
    const make = () => Object.create(Section.prototype);

    describe('_assembleExtraFields', () => {
        it('parses a comma string into [{name}], trimming + deduping', () => {
            const out = make()._assembleExtraFields({ reg_extra_fields: 'promo, ref ,promo' });
            expect(out).toEqual([{ name: 'promo' }, { name: 'ref' }]);
        });

        it('drops canonical-colliding names and invalid identifiers and blanks', () => {
            const out = make()._assembleExtraFields({
                reg_extra_fields: 'promo,email,phone,bad name!,1abc,,ok_1'
            });
            // email/phone collide with canonical; 'bad name!' and '1abc' fail the
            // identifier rule; blank dropped; promo + ok_1 survive.
            expect(out).toEqual([{ name: 'promo' }, { name: 'ok_1' }]);
        });

        it('accepts an already-split array and an empty value', () => {
            expect(make()._assembleExtraFields({ reg_extra_fields: ['promo', 'ref'] }))
                .toEqual([{ name: 'promo' }, { name: 'ref' }]);
            expect(make()._assembleExtraFields({ reg_extra_fields: '' })).toEqual([]);
            expect(make()._assembleExtraFields({})).toEqual([]);
        });
    });

    describe('_extraNamesFromArray', () => {
        it('joins names from a [{name}] array, dropping empties', () => {
            const s = make();
            expect(s._extraNamesFromArray([{ name: 'promo' }, { name: 'ref' }])).toBe('promo,ref');
            expect(s._extraNamesFromArray([{ name: '' }, { foo: 1 }, { name: 'x' }])).toBe('x');
            expect(s._extraNamesFromArray([])).toBe('');
            expect(s._extraNamesFromArray(null)).toBe('');
        });
    });

    describe('_buildBaseline — reg_extra_fields', () => {
        it('uses the group own override when present', () => {
            const own = { registration: { extra_fields: [{ name: 'promo' }, { name: 'ref' }] } };
            const base = make()._buildBaseline(own, {});
            expect(base.reg_extra_fields).toBe('promo,ref');
        });

        it('falls back to the resolved/inherited value when no own override', () => {
            const resolved = { registration: { extra_fields: [{ name: 'tracking' }] } };
            const base = make()._buildBaseline({}, resolved);
            expect(base.reg_extra_fields).toBe('tracking');
        });

        it('is empty when neither own nor resolved specify extra_fields', () => {
            const base = make()._buildBaseline({}, {});
            expect(base.reg_extra_fields).toBe('');
        });
    });

    describe('_diffPayload — registration.extra_fields', () => {
        it('emits extra_fields only when changed from baseline', () => {
            const s = make();
            s._baseline = s._buildBaseline({ registration: { extra_fields: [{ name: 'promo' }] } }, {});
            // Unchanged → no extra_fields in the payload.
            const same = s._diffPayload({ ...s._baseline });
            expect(same === null || !(same.registration && 'extra_fields' in same.registration)).toBe(true);
            // Added 'ref' → payload carries the full new array.
            const changed = s._diffPayload({ ...s._baseline, reg_extra_fields: 'promo,ref' });
            expect(changed.registration.extra_fields).toEqual([{ name: 'promo' }, { name: 'ref' }]);
        });

        it('sends [] when an inherited/own list is cleared', () => {
            const s = make();
            s._baseline = s._buildBaseline({ registration: { extra_fields: [{ name: 'promo' }] } }, {});
            const cleared = s._diffPayload({ ...s._baseline, reg_extra_fields: '' });
            expect(cleared.registration.extra_fields).toEqual([]);
        });
    });
};
