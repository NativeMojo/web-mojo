/**
 * Timeline smoke tests
 *
 * Verifies the vertical event-feed primitive renders items with tone
 * classes, supports function-valued items, escapes the headline,
 * preserves detail HTML, falls back to an empty placeholder, and
 * honors the limit option.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();
    const Timeline = loadModule('Timeline');

    function makeModel(attrs = {}) {
        const data = { id: 1, events: [], ...attrs };
        return {
            attributes: data,
            get(k) { return data[k]; },
            set(k, v) { data[k] = v; },
            on() {}, off() {}
        };
    }

    describe('Timeline', () => {
        it('renders an <ol> root with .detail-timeline class', async () => {
            const tl = new Timeline({ items: [{ headline: 'A' }] });
            await tl.render(false);
            expect(tl.element.tagName).toBe('OL');
            expect(tl.element.classList.contains('detail-timeline')).toBe(true);
        });

        it('renders one .detail-timeline-item per entry with the right tone class', async () => {
            const tl = new Timeline({
                items: [
                    { tone: 'success', headline: 'Started',  detail: 'on runner-7', when: '2h ago' },
                    { tone: 'danger',  headline: 'Failed',   detail: '<code>EHOSTUNREACH</code>', when: '1h ago' },
                    { tone: 'info',    headline: 'Retried',                              when: '12m ago' }
                ]
            });
            await tl.render(false);
            const items = tl.element.querySelectorAll('.detail-timeline-item');
            expect(items.length).toBe(3);
            expect(items[0].classList.contains('tone-success')).toBe(true);
            expect(items[1].classList.contains('tone-danger')).toBe(true);
            expect(items[2].classList.contains('tone-info')).toBe(true);
            expect(items[0].querySelector('.detail-timeline-headline').textContent).toBe('Started');
            expect(items[0].querySelector('.detail-timeline-when').textContent).toBe('2h ago');
            // detail is trusted HTML — `<code>` survives.
            expect(items[1].querySelector('.detail-timeline-detail').innerHTML).toContain('<code>EHOSTUNREACH</code>');
        });

        it('omits the detail node when no detail is given and the when node when no when', async () => {
            const tl = new Timeline({
                items: [{ headline: 'No detail or when' }]
            });
            await tl.render(false);
            const item = tl.element.querySelector('.detail-timeline-item');
            expect(item.querySelector('.detail-timeline-detail')).toBeNull();
            expect(item.querySelector('.detail-timeline-when')).toBeNull();
        });

        it('renders the empty placeholder when items is empty', async () => {
            const tl = new Timeline({ items: [], emptyText: 'Nothing yet.' });
            await tl.render(false);
            const empty = tl.element.querySelector('.detail-timeline-empty');
            expect(empty).toBeTruthy();
            expect(empty.textContent).toContain('Nothing yet.');
            expect(tl.element.querySelectorAll('.detail-timeline-item').length).toBe(0);
        });

        it('resolves function-valued items against the model', async () => {
            const m = makeModel({ events: [
                { event: 'started', label: 'Started', at: '2h ago' },
                { event: 'failed',  label: 'Failed',  at: '1h ago' }
            ]});
            const tl = new Timeline({
                model: m,
                items: (model) => model.get('events').map(ev => ({
                    tone:     ev.event === 'failed' ? 'danger' : 'success',
                    headline: ev.label,
                    when:     ev.at
                }))
            });
            await tl.render(false);
            expect(tl.element.querySelectorAll('.detail-timeline-item').length).toBe(2);

            // Mutate model + re-render
            m.set('events', m.get('events').concat({ event: 'retry', label: 'Retried', at: '12m ago' }));
            await tl.render();
            const items = tl.element.querySelectorAll('.detail-timeline-item');
            expect(items.length).toBe(3);
            expect(items[2].querySelector('.detail-timeline-headline').textContent).toBe('Retried');
        });

        it('honors the `limit` option', async () => {
            const tl = new Timeline({
                items: [
                    { headline: '1' }, { headline: '2' }, { headline: '3' },
                    { headline: '4' }, { headline: '5' }
                ],
                limit: 3
            });
            await tl.render(false);
            const items = tl.element.querySelectorAll('.detail-timeline-item');
            expect(items.length).toBe(3);
            expect(items[0].textContent).toContain('1');
            expect(items[2].textContent).toContain('3');
        });

        it('escapes the headline and the when text', async () => {
            const tl = new Timeline({
                items: [{ headline: '<script>x</script>', when: '<b>now</b>' }]
            });
            await tl.render(false);
            const html = tl.element.innerHTML;
            expect(html).not.toContain('<script>x</script>');
            expect(html).not.toContain('<b>now</b>');
        });

        it('setItems replaces the source and re-renders', async () => {
            const tl = new Timeline({ items: [{ headline: 'A' }] });
            await tl.render(false);
            expect(tl.element.querySelectorAll('.detail-timeline-item').length).toBe(1);

            await tl.setItems([{ headline: 'X' }, { headline: 'Y' }, { headline: 'Z' }]);
            const items = tl.element.querySelectorAll('.detail-timeline-item');
            expect(items.length).toBe(3);
            expect(items[0].textContent).toContain('X');
        });
    });
};
