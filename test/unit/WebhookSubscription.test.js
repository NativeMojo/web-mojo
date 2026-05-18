/**
 * WebhookSubscription Model — Unit Tests
 *
 * Pins:
 *   - Production model endpoint string matches `/api/group/webhook_subscriptions`.
 *   - Form schemas declare the expected fields with the expected types
 *     (url / tags / switch / textarea), so a future refactor that drops
 *     the chip input falls out as a failing test.
 *   - `normalizePayload` converts a comma-separated `events` string into
 *     an array, leaves arrays untouched, and is the single source of
 *     truth used by both surfaces. We test this against the actual
 *     `WebhookSubscriptionForms.normalizePayload` extracted from source.
 *   - `toggleActive` PUTs the negated `is_active`.
 *
 * Why we don't `loadModule('WebhookSubscription')`:
 *   `simple-module-loader.js` exposes a fixed module map and the loader
 *   has no entry for this file. Adding one for every new model isn't
 *   worth it. Instead we (1) source-text-assert the production file
 *   shape and (2) eval `normalizePayload` from the source file body so
 *   the test exercises the production logic without rewriting it
 *   locally. The same pattern is used by `admin-model-statics.test.js`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MODEL_SOURCE = fs.readFileSync(
    path.join(ROOT, 'src/core/models/WebhookSubscription.js'),
    'utf8'
);

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    const { loadModule } = require('../utils/simple-module-loader');

    await testHelpers.setup();
    const Model = loadModule('Model');

    // ── Production source-shape assertions ────────────────

    describe('WebhookSubscription source shape', () => {
        it('declares the correct REST endpoint', () => {
            expect(/endpoint:\s*['"]\/api\/group\/webhook_subscriptions['"]/.test(MODEL_SOURCE)).toBe(true);
        });

        it('Collection class declares the matching endpoint', () => {
            // Both Model and Collection point at the same endpoint.
            const matches = MODEL_SOURCE.match(/\/api\/group\/webhook_subscriptions/g) || [];
            expect(matches.length).toBeGreaterThanOrEqual(2);
        });

        it('Collection class declares ModelClass: WebhookSubscription', () => {
            expect(/ModelClass:\s*WebhookSubscription/.test(MODEL_SOURCE)).toBe(true);
        });

        it('create form declares a required https url field', () => {
            expect(/name:\s*'url'[\s\S]*?type:\s*'url'[\s\S]*?required:\s*true/.test(MODEL_SOURCE)).toBe(true);
        });

        it('create form declares an events tags field', () => {
            expect(/name:\s*'events'[\s\S]*?type:\s*'tags'/.test(MODEL_SOURCE)).toBe(true);
        });

        it('create form declares an is_active switch field', () => {
            expect(/name:\s*'is_active'[\s\S]*?type:\s*'switch'/.test(MODEL_SOURCE)).toBe(true);
        });

        it('edit form declares a metadata JSON textarea', () => {
            expect(/name:\s*'metadata'[\s\S]*?type:\s*'textarea'/.test(MODEL_SOURCE)).toBe(true);
        });

        it('exposes a normalizePayload helper', () => {
            expect(/normalizePayload\s*\(\s*formData\s*\)/.test(MODEL_SOURCE)).toBe(true);
        });

        it('exposes a toggleActive method that flips is_active', () => {
            expect(/toggleActive\s*\(\s*\)/.test(MODEL_SOURCE)).toBe(true);
            expect(/is_active:\s*!this\.get\(['"]is_active['"]\)/.test(MODEL_SOURCE)).toBe(true);
        });

        it('exports WebhookSubscription, WebhookSubscriptionList, WebhookSubscriptionForms', () => {
            expect(/export\s*\{\s*WebhookSubscription,\s*WebhookSubscriptionList,\s*WebhookSubscriptionForms\s*\}/.test(MODEL_SOURCE)).toBe(true);
        });
    });

    // ── Functional: normalizePayload extracted from source ─────────

    /**
     * Extract `normalizePayload(formData) { ... }` out of the production
     * source and turn it into a callable function. This keeps the test
     * exercising the SAME logic that ships, not a parallel copy.
     */
    function extractNormalizePayload() {
        const start = MODEL_SOURCE.indexOf('normalizePayload(formData) {');
        if (start < 0) throw new Error('normalizePayload not found in source');
        // Walk braces to find the matching close.
        let depth = 0;
        let i = MODEL_SOURCE.indexOf('{', start);
        let end = -1;
        for (; i < MODEL_SOURCE.length; i++) {
            const c = MODEL_SOURCE[i];
            if (c === '{') depth++;
            else if (c === '}') {
                depth--;
                if (depth === 0) { end = i + 1; break; }
            }
        }
        if (end < 0) throw new Error('normalizePayload body not balanced');
        const body = MODEL_SOURCE.substring(MODEL_SOURCE.indexOf('{', start) + 1, end - 1);
        // eslint-disable-next-line no-new-func
        return new Function('formData', body);
    }

    describe('WebhookSubscriptionForms.normalizePayload', () => {
        const normalize = extractNormalizePayload();

        it('splits a comma-separated events string into a trimmed array', () => {
            const out = normalize({ events: 'invoice.paid, verification.completed ,refund.created' });
            expect(out.events).toEqual(['invoice.paid', 'verification.completed', 'refund.created']);
        });

        it('drops empty entries and stray whitespace', () => {
            const out = normalize({ events: ' , a , , b , ' });
            expect(out.events).toEqual(['a', 'b']);
        });

        it('leaves an array-valued events field untouched', () => {
            const out = normalize({ events: ['x', 'y'] });
            expect(out.events).toEqual(['x', 'y']);
        });

        it('does not crash when events is absent', () => {
            const out = normalize({ url: 'https://example.com/webhook' });
            expect(out).toEqual({ url: 'https://example.com/webhook' });
        });

        it('returns a new object (does not mutate input)', () => {
            const input = { events: 'a,b' };
            const out = normalize(input);
            expect(input.events).toBe('a,b');
            expect(out).not.toBe(input);
        });

        it('handles a null/undefined input safely', () => {
            expect(normalize(null)).toEqual({});
            expect(normalize(undefined)).toEqual({});
        });
    });

    // ── Functional: TestWebhookSubscription extends Model ──────────

    /**
     * Mirrors the production class shape just enough to verify the
     * endpoint plumbing and `toggleActive()` behaviour. Kept in sync
     * with `src/core/models/WebhookSubscription.js` by the source-shape
     * tests above — if the production endpoint changes, the regex
     * pinning fails and the developer updates this copy too.
     */
    class TestWebhookSubscription extends Model {
        constructor(data = {}, options = {}) {
            super(data, { endpoint: '/api/group/webhook_subscriptions', ...options });
        }
        toggleActive() {
            return this.save({ is_active: !this.get('is_active') });
        }
    }

    describe('WebhookSubscription functional behaviour', () => {
        it('constructs with the right endpoint', () => {
            const m = new TestWebhookSubscription();
            expect(m.endpoint).toBe('/api/group/webhook_subscriptions');
        });

        it('toggleActive PUTs the negated is_active', async () => {
            const m = new TestWebhookSubscription({ id: 7, is_active: true });
            const spy = jest.spyOn(m, 'save').mockResolvedValue({ status: 200, success: true });
            await m.toggleActive();
            expect(spy).toHaveBeenCalledWith({ is_active: false });
            spy.mockRestore();

            m.set('is_active', false);
            const spy2 = jest.spyOn(m, 'save').mockResolvedValue({ status: 200, success: true });
            await m.toggleActive();
            expect(spy2).toHaveBeenCalledWith({ is_active: true });
            spy2.mockRestore();
        });
    });
};
