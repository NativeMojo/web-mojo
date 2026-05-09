/**
 * KnownFieldsCard smoke tests
 *
 * Verifies the "promote known JSON keys + raw blob below" pattern:
 * known keys render in a 2-column grid, missing values show "—",
 * formatters (string + function), nested-key dot lookup, the
 * raw <details> block, and rendering nothing when data is empty.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const KnownFieldsCard = loadModule('KnownFieldsCard');

    function makeModel(attrs = {}) {
        const data = { id: 1, ...attrs };
        return {
            attributes: data,
            get(k) { return data[k]; },
            set(k, v) { data[k] = v; },
            on() {}, off() {}
        };
    }

    describe('KnownFieldsCard', () => {
        it('renders one .detail-flat-row per known key with the matching label/value', async () => {
            const card = new KnownFieldsCard({
                data: {
                    created_by: 'ian@example.com',
                    reasoning: 'brute-force from same /24',
                    extra: 'something not promoted'
                },
                knownKeys: [
                    { key: 'created_by', label: 'Created by' },
                    { key: 'reasoning',  label: 'Reasoning'  }
                ]
            });
            await card.render(false);
            const rows = card.element.querySelectorAll('.detail-flat-row');
            expect(rows.length).toBe(2);
            expect(rows[0].querySelector('.detail-flat-row-label').textContent).toBe('Created by');
            expect(rows[0].querySelector('.detail-flat-row-value').textContent).toBe('ian@example.com');
            expect(rows[1].querySelector('.detail-flat-row-value').textContent).toContain('brute-force');
        });

        it('renders the muted "—" placeholder for missing values', async () => {
            const card = new KnownFieldsCard({
                data: { created_by: 'ian@example.com' },
                knownKeys: [
                    { key: 'created_by',    label: 'Created by' },
                    { key: 'last_resolved', label: 'Resolved' }
                ]
            });
            await card.render(false);
            const rows = card.element.querySelectorAll('.detail-flat-row');
            expect(rows.length).toBe(2);
            expect(rows[1].querySelector('.detail-flat-row-value').textContent).toContain('—');
        });

        it('omits a row entirely when hideEmpty is set and the value is missing', async () => {
            const card = new KnownFieldsCard({
                data: { created_by: 'ian@example.com' },
                knownKeys: [
                    { key: 'created_by',    label: 'Created by' },
                    { key: 'last_resolved', label: 'Resolved', hideEmpty: true }
                ]
            });
            await card.render(false);
            const rows = card.element.querySelectorAll('.detail-flat-row');
            expect(rows.length).toBe(1);
            expect(rows[0].querySelector('.detail-flat-row-label').textContent).toBe('Created by');
        });

        it('applies a function-valued formatter and treats its output as trusted HTML', async () => {
            const card = new KnownFieldsCard({
                data: { agent_prompt: 'investigate brute-force' },
                knownKeys: [{
                    key: 'agent_prompt',
                    label: 'Agent prompt',
                    formatter: (v) => `<code>${v}</code>`
                }]
            });
            await card.render(false);
            const value = card.element.querySelector('.detail-flat-row-value');
            expect(value.innerHTML).toContain('<code>investigate brute-force</code>');
        });

        it('looks up dotted-path keys', async () => {
            const card = new KnownFieldsCard({
                data: {
                    os: { family: 'macOS', major: '14' },
                    user_agent: { family: 'Chrome', major: '122' }
                },
                knownKeys: [
                    { key: 'os.family',        label: 'OS' },
                    { key: 'user_agent.family', label: 'Browser' }
                ]
            });
            await card.render(false);
            const rows = card.element.querySelectorAll('.detail-flat-row');
            expect(rows[0].querySelector('.detail-flat-row-value').textContent).toBe('macOS');
            expect(rows[1].querySelector('.detail-flat-row-value').textContent).toBe('Chrome');
        });

        it('renders the raw <details> block when showRaw is true (default) and data is non-empty', async () => {
            const card = new KnownFieldsCard({
                data: { a: 1, b: 'x' },
                knownKeys: [{ key: 'a', label: 'A' }],
                rawLabel: 'Raw payload'
            });
            await card.render(false);
            const details = card.element.querySelector('.detail-known-fields-raw');
            expect(details).toBeTruthy();
            expect(details.tagName).toBe('DETAILS');
            // Defaults to collapsed
            expect(details.hasAttribute('open')).toBe(false);
            expect(details.querySelector('summary').textContent).toBe('Raw payload');
            const body = details.querySelector('.detail-known-fields-raw-body');
            expect(body.textContent).toContain('"b": "x"');
        });

        it('starts the raw block expanded when rawCollapsed is false', async () => {
            const card = new KnownFieldsCard({
                data: { a: 1 },
                knownKeys: [{ key: 'a', label: 'A' }],
                rawCollapsed: false
            });
            await card.render(false);
            expect(card.element.querySelector('.detail-known-fields-raw').hasAttribute('open')).toBe(true);
        });

        it('omits the raw block entirely when showRaw is false', async () => {
            const card = new KnownFieldsCard({
                data: { a: 1 },
                knownKeys: [{ key: 'a', label: 'A' }],
                showRaw: false
            });
            await card.render(false);
            expect(card.element.querySelector('.detail-known-fields-raw')).toBeNull();
        });

        it('renders the empty-text placeholder when data and knownKeys are both empty', async () => {
            const card = new KnownFieldsCard({
                data: {},
                knownKeys: [],
                emptyText: 'No metadata.'
            });
            await card.render(false);
            expect(card.element.textContent).toContain('No metadata.');
        });

        it('resolves function-valued data and knownKeys against the model', async () => {
            const m = makeModel({ metadata: { stage: 'pending' } });
            const card = new KnownFieldsCard({
                model: m,
                data: (model) => model.get('metadata') || {},
                knownKeys: (model) => model.get('metadata')?.stage === 'pending'
                    ? [{ key: 'stage', label: 'Stage' }]
                    : [{ key: 'stage', label: 'Stage' }, { key: 'final', label: 'Final' }]
            });
            await card.render(false);
            expect(card.element.querySelectorAll('.detail-flat-row').length).toBe(1);

            m.set('metadata', { stage: 'final', final: 'resolved' });
            await card.render();
            const rows = card.element.querySelectorAll('.detail-flat-row');
            expect(rows.length).toBe(2);
            expect(rows[1].querySelector('.detail-flat-row-value').textContent).toBe('resolved');
        });

        it('renders nested objects with a JSON code fragment when no formatter is set', async () => {
            const card = new KnownFieldsCard({
                data: { dimensions: { w: 1024, h: 768 } },
                knownKeys: [{ key: 'dimensions', label: 'Dimensions' }]
            });
            await card.render(false);
            const value = card.element.querySelector('.detail-flat-row-value');
            expect(value.innerHTML).toContain('<code');
            expect(value.textContent).toContain('1024');
        });

        it('escapes values when no formatter is given', async () => {
            const card = new KnownFieldsCard({
                data: { note: '<script>x</script>' },
                knownKeys: [{ key: 'note', label: 'Note' }]
            });
            await card.render(false);
            expect(card.element.innerHTML).not.toContain('<script>x</script>');
        });
    });
};
