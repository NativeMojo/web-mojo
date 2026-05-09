/**
 * FlowStrip smoke tests
 *
 * Verifies the horizontal "STEP 1 → STEP 2 → …" flow primitive
 * renders one cell per step, escapes structural text, preserves
 * value/hint trusted HTML, applies the `.flow-strip-empty` modifier,
 * resolves function-valued steps against the model, and wires the
 * optional pencil action with arbitrary data-* attributes.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const FlowStrip = loadModule('FlowStrip');

    function makeModel(attrs = {}) {
        const data = { id: 1, ...attrs };
        return {
            attributes: data,
            get(k) { return data[k]; },
            set(k, v) { data[k] = v; },
            on() {}, off() {}
        };
    }

    describe('FlowStrip', () => {
        it('renders one .flow-strip-step per step with eyebrow / title / value / hint', async () => {
            const fs = new FlowStrip({
                steps: [
                    { num: 'STEP 1', title: 'Match',     value: '<code>category=auth.failed</code>', hint: 'Each condition must match.' },
                    { num: 'STEP 2', title: 'Bundle',    value: 'No bundling',                       hint: 'Each event becomes its own incident.' },
                    { num: 'STEP 3', title: 'Threshold', value: 'After <strong>5</strong> events',   hint: 'Within 60s.' }
                ]
            });
            await fs.render(false);
            expect(fs.element.classList.contains('detail-flow-strip')).toBe(true);
            const steps = fs.element.querySelectorAll('.flow-strip-step');
            expect(steps.length).toBe(3);
            expect(steps[0].querySelector('.flow-strip-num').textContent).toBe('STEP 1');
            expect(steps[0].querySelector('.flow-strip-title').textContent).toContain('Match');
            // value/hint are trusted HTML
            expect(steps[0].querySelector('.flow-strip-value').innerHTML).toContain('<code>category=auth.failed</code>');
            expect(steps[2].querySelector('.flow-strip-value').innerHTML).toContain('<strong>5</strong>');
            expect(steps[1].querySelector('.flow-strip-hint').textContent).toContain('Each event');
        });

        it('omits the hint node when no hint is given', async () => {
            const fs = new FlowStrip({
                steps: [{ num: 'STEP 1', title: 'X', value: 'y' }]
            });
            await fs.render(false);
            expect(fs.element.querySelector('.flow-strip-hint')).toBeNull();
        });

        it('falls back to "STEP N" when num is omitted', async () => {
            const fs = new FlowStrip({
                steps: [
                    { title: 'A', value: 'a' },
                    { title: 'B', value: 'b' },
                    { title: 'C', value: 'c' }
                ]
            });
            await fs.render(false);
            const nums = fs.element.querySelectorAll('.flow-strip-num');
            expect(nums[0].textContent).toBe('STEP 1');
            expect(nums[1].textContent).toBe('STEP 2');
            expect(nums[2].textContent).toBe('STEP 3');
        });

        it('renders the .flow-strip-empty modifier when step.empty is true', async () => {
            const fs = new FlowStrip({
                steps: [
                    { num: 'STEP 1', title: 'Threshold', value: 'Fires immediately', empty: true },
                    { num: 'STEP 2', title: 'Bundle',    value: 'No bundling' }
                ]
            });
            await fs.render(false);
            const values = fs.element.querySelectorAll('.flow-strip-value');
            expect(values[0].classList.contains('flow-strip-empty')).toBe(true);
            expect(values[1].classList.contains('flow-strip-empty')).toBe(false);
        });

        it('renders an action pencil with the supplied data-action and data-* attrs', async () => {
            const fs = new FlowStrip({
                steps: [{
                    num: 'STEP 1', title: 'Match', value: 'x',
                    action: 'edit-step',
                    actionData: { tab: 'general', step: '1' }
                }]
            });
            await fs.render(false);
            const btn = fs.element.querySelector('.flow-strip-action');
            expect(btn).toBeTruthy();
            expect(btn.getAttribute('data-action')).toBe('edit-step');
            expect(btn.getAttribute('data-tab')).toBe('general');
            expect(btn.getAttribute('data-step')).toBe('1');
            expect(btn.querySelector('i').classList.contains('bi-pencil')).toBe(true);
        });

        it('resolves function-valued steps against the model', async () => {
            const m = makeModel({ trigger_count: 0 });
            const fs = new FlowStrip({
                model: m,
                steps: (model) => [{
                    num: 'STEP 3',
                    title: 'Threshold',
                    value: model.get('trigger_count')
                        ? `After <strong>${model.get('trigger_count')}</strong> events`
                        : 'Fires immediately',
                    empty: !model.get('trigger_count')
                }]
            });
            await fs.render(false);
            expect(fs.element.querySelector('.flow-strip-value').classList.contains('flow-strip-empty')).toBe(true);

            m.set('trigger_count', 5);
            await fs.render();
            const after = fs.element.querySelector('.flow-strip-value');
            expect(after.classList.contains('flow-strip-empty')).toBe(false);
            expect(after.innerHTML).toContain('<strong>5</strong>');
        });

        it('escapes title and num text', async () => {
            const fs = new FlowStrip({
                steps: [{
                    num: '<script>x</script>',
                    title: '<b>Match</b>',
                    value: 'safe'
                }]
            });
            await fs.render(false);
            const html = fs.element.innerHTML;
            expect(html).not.toContain('<script>x</script>');
            expect(html).not.toContain('<b>Match</b>');
        });

        it('renders nothing for an empty steps array', async () => {
            const fs = new FlowStrip({ steps: [] });
            await fs.render(false);
            expect(fs.element.querySelectorAll('.flow-strip-step').length).toBe(0);
            expect(fs.element.innerHTML.trim()).toBe('');
        });

        it('setSteps replaces the source and re-renders', async () => {
            const fs = new FlowStrip({
                steps: [{ title: 'A', value: 'a' }]
            });
            await fs.render(false);
            expect(fs.element.querySelectorAll('.flow-strip-step').length).toBe(1);

            await fs.setSteps([
                { title: 'X', value: 'x' },
                { title: 'Y', value: 'y' }
            ]);
            const steps = fs.element.querySelectorAll('.flow-strip-step');
            expect(steps.length).toBe(2);
            expect(steps[0].textContent).toContain('X');
        });
    });
};
