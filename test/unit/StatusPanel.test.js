/**
 * StatusPanel smoke tests
 *
 * Verifies the hero state-banner primitive renders state, headline,
 * meta line, action buttons, and the right tone class — and that
 * function-valued options re-resolve against the model.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const StatusPanel = loadModule('StatusPanel');

    function makeModel(attrs = {}) {
        const data = { id: 1, status: 'running', attempt: 1, max_retries: 3, ...attrs };
        return {
            attributes: data,
            get(k) { return data[k]; },
            set(k, v) { data[k] = v; },
            on() {}, off() {}
        };
    }

    describe('StatusPanel', () => {
        it('renders state, headline, and meta with the requested tone', async () => {
            const panel = new StatusPanel({
                model: makeModel(),
                tone: 'info',
                state: 'Running',
                headline: 'On runner-7 · 4m ago',
                meta: 'Attempt <strong>1</strong> of <strong>3</strong>'
            });
            await panel.render(false);
            expect(panel.element.classList.contains('detail-status-panel')).toBe(true);
            expect(panel.element.classList.contains('tone-info')).toBe(true);
            expect(panel.element.querySelector('.detail-status-state').textContent).toContain('Running');
            expect(panel.element.querySelector('.detail-status-line').textContent).toContain('On runner-7');
            // meta is trusted HTML — `<strong>` survives.
            expect(panel.element.querySelector('.detail-status-meta').innerHTML).toContain('<strong>1</strong>');
        });

        it('renders the dot when no icon is given and an icon when set', async () => {
            const dotPanel = new StatusPanel({ model: makeModel(), state: 'Running' });
            await dotPanel.render(false);
            expect(dotPanel.element.querySelector('.detail-status-dot')).toBeTruthy();
            expect(dotPanel.element.querySelector('.detail-status-icon')).toBeNull();

            const iconPanel = new StatusPanel({
                model: makeModel(),
                state: 'Running',
                icon: 'bi-arrow-repeat'
            });
            await iconPanel.render(false);
            const i = iconPanel.element.querySelector('.detail-status-icon');
            expect(i).toBeTruthy();
            expect(i.classList.contains('bi-arrow-repeat')).toBe(true);
        });

        it('renders an action row with data-action attributes', async () => {
            const panel = new StatusPanel({
                model: makeModel(),
                state: 'Failed',
                tone: 'danger',
                actions: [
                    { label: 'Retry now', action: 'retry-job', icon: 'bi-arrow-clockwise', variant: 'primary' },
                    { label: 'Cancel',    action: 'cancel-job', variant: 'outline-danger' }
                ]
            });
            await panel.render(false);
            const buttons = panel.element.querySelectorAll('.detail-status-actions button');
            expect(buttons.length).toBe(2);
            expect(buttons[0].getAttribute('data-action')).toBe('retry-job');
            expect(buttons[0].textContent).toContain('Retry now');
            expect(buttons[0].classList.contains('btn-primary')).toBe(true);
            expect(buttons[1].classList.contains('btn-outline-danger')).toBe(true);
        });

        it('resolves function-valued options against the model', async () => {
            const m = makeModel({ status: 'failed', attempt: 2, max_retries: 3 });
            const panel = new StatusPanel({
                model: m,
                tone:     mm => mm.get('status') === 'failed' ? 'danger' : 'info',
                state:    mm => mm.get('status') === 'failed' ? 'Failed' : 'Running',
                headline: mm => `Attempt ${mm.get('attempt')} of ${mm.get('max_retries')}`
            });
            await panel.render(false);
            expect(panel.element.classList.contains('tone-danger')).toBe(true);
            expect(panel.element.querySelector('.detail-status-state').textContent).toContain('Failed');
            expect(panel.element.querySelector('.detail-status-line').textContent).toContain('Attempt 2 of 3');

            // After model mutation + re-render the resolved values update.
            m.set('status', 'completed');
            m.set('attempt', 3);
            await panel.render();
            expect(panel.element.classList.contains('tone-danger')).toBe(false);
            expect(panel.element.classList.contains('tone-info')).toBe(true);
            expect(panel.element.querySelector('.detail-status-state').textContent).toContain('Running');
            expect(panel.element.querySelector('.detail-status-line').textContent).toContain('Attempt 3 of 3');
        });

        it('omits the action row when actions resolve to empty', async () => {
            const a = new StatusPanel({ model: makeModel(), state: 'Running' });
            await a.render(false);
            expect(a.element.querySelector('.detail-status-actions')).toBeNull();

            const b = new StatusPanel({
                model: makeModel(),
                state: 'Running',
                actions: () => []
            });
            await b.render(false);
            expect(b.element.querySelector('.detail-status-actions')).toBeNull();
        });

        it('escapes HTML in state, headline, label, and action labels', async () => {
            const panel = new StatusPanel({
                model: makeModel(),
                state: '<script>x</script>',
                headline: '<img onerror="alert(1)">',
                actions: [{ label: '<b>Go</b>', action: 'go' }]
            });
            await panel.render(false);
            const html = panel.element.innerHTML;
            expect(html).not.toContain('<script>x</script>');
            expect(html).not.toContain('<img onerror=');
            expect(html).not.toContain('<b>Go</b>');
        });
    });
};
