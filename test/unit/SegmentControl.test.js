/**
 * SegmentControl smoke tests
 *
 * Verifies render, click → change emit, programmatic setValue, and the
 * silent flag. Loads via the simple-module-loader so @core/View.js
 * resolves correctly in a Node sandbox.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach } = testContext;

    await testHelpers.setup();
    const SegmentControl = loadModule('SegmentControl');

    const OPTIONS = [
        { value: '7d',  label: '7 days' },
        { value: '30d', label: '30 days' },
        { value: '90d', label: '90 days' }
    ];

    describe('SegmentControl', () => {
        let sc;

        beforeEach(() => {
            sc = new SegmentControl({ options: OPTIONS, value: '30d' });
        });

        it('renders one button per option with the active class on the current value', async () => {
            await sc.render(false);
            const buttons = sc.element.querySelectorAll('button[data-value]');
            expect(buttons).toHaveLength(3);
            const active = sc.element.querySelector('.btn-primary');
            expect(active).toBeTruthy();
            expect(active.dataset.value).toBe('30d');
        });

        it('emits change with { value, previous } on click and updates active styling', async () => {
            await sc.render(false);

            let payload = null;
            sc.on('change', (data) => { payload = data; });

            const sevenDay = sc.element.querySelector('button[data-value="7d"]');
            await sc.onActionSelect({}, sevenDay);

            expect(payload).toEqual({ value: '7d', previous: '30d' });
            expect(sc.getValue()).toBe('7d');
            expect(sevenDay.classList.contains('btn-primary')).toBe(true);
            expect(sc.element.querySelector('button[data-value="30d"]').classList.contains('btn-outline-secondary')).toBe(true);
        });

        it('clicking the already-active button does not emit', async () => {
            await sc.render(false);

            let emitted = false;
            sc.on('change', () => { emitted = true; });

            const current = sc.element.querySelector('button[data-value="30d"]');
            await sc.onActionSelect({}, current);
            expect(emitted).toBe(false);
        });

        it('setValue updates state and emits by default', async () => {
            await sc.render(false);

            let payload = null;
            sc.on('change', (data) => { payload = data; });

            const ok = sc.setValue('90d');
            expect(ok).toBe(true);
            expect(sc.getValue()).toBe('90d');
            expect(payload).toEqual({ value: '90d', previous: '30d' });
        });

        it('setValue with silent: true suppresses the change event', async () => {
            await sc.render(false);

            let emitted = false;
            sc.on('change', () => { emitted = true; });

            sc.setValue('7d', { silent: true });
            expect(sc.getValue()).toBe('7d');
            expect(emitted).toBe(false);
        });

        it('setValue with an unknown value returns false and does not change state', async () => {
            await sc.render(false);
            const ok = sc.setValue('1y');
            expect(ok).toBe(false);
            expect(sc.getValue()).toBe('30d');
        });
    });
};
