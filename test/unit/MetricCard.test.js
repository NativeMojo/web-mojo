/**
 * MetricCard smoke tests
 *
 * Verifies render, value escaping, tone class application, setValue
 * partial update, and the action vs. inert root-element behavior.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const MetricCard = loadModule('MetricCard');

    describe('MetricCard', () => {
        it('renders label and value, defaulting to a div with no action', async () => {
            const card = new MetricCard({ label: 'Incidents', value: 42 });
            await card.render(false);
            expect(card.element.tagName).toBe('DIV');
            expect(card.element.querySelector('.metric-card-label').textContent).toContain('Incidents');
            expect(card.element.querySelector('.metric-card-value').textContent).toBe('42');
        });

        it('uses a <button> root when action is set and exposes data-action', async () => {
            const card = new MetricCard({ label: 'X', value: 1, action: 'view-incidents' });
            await card.render(false);
            expect(card.element.tagName).toBe('BUTTON');
            expect(card.element.getAttribute('data-action')).toBe('view-incidents');
        });

        it('applies the tone class from the tone option', async () => {
            const card = new MetricCard({ label: 'X', value: 1, tone: 'warning' });
            await card.render(false);
            expect(card.element.classList.contains('metric-card-tone-warning')).toBe(true);
        });

        it('renders a "—" placeholder when value is null or undefined', async () => {
            const card = new MetricCard({ label: 'X', value: null });
            await card.render(false);
            expect(card.element.querySelector('.metric-card-value').textContent).toContain('—');
        });

        it('escapes HTML in label and value', async () => {
            const card = new MetricCard({ label: '<b>Open</b>', value: '<script>x</script>' });
            await card.render(false);
            const html = card.element.innerHTML;
            expect(html).not.toContain('<script>x</script>');
            expect(html).not.toContain('<b>Open</b>');
        });

        it('setValue updates the value slot without a full re-render', async () => {
            const card = new MetricCard({ label: 'X', value: 1 });
            await card.render(false);
            const slot = card.element.querySelector('.metric-card-value');
            const node = slot;            // capture identity
            card.setValue(99);
            expect(card.element.querySelector('.metric-card-value')).toBe(node);
            expect(node.textContent).toBe('99');
        });

        it('renders hint when provided and setHint can add/remove it', async () => {
            const card = new MetricCard({ label: 'X', value: 1, hint: '5m ago' });
            await card.render(false);
            expect(card.element.querySelector('.metric-card-hint').textContent).toBe('5m ago');
            card.setHint(null);
            expect(card.element.querySelector('.metric-card-hint')).toBeNull();
            card.setHint('1h ago');
            expect(card.element.querySelector('.metric-card-hint').textContent).toBe('1h ago');
        });
    });
};
