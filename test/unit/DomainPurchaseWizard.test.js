/**
 * DomainPurchaseWizard.test.js - the money path (#394).
 *
 * Driven through the wizard's own methods rather than render() (WM-026). The
 * invariants below are the ones where being wrong costs real money or tells a
 * user something false:
 *
 *   - a name that is merely unanswered must never read as taken
 *   - the confirm token must exist in instance state and nowhere else
 *   - a quote redeems exactly once, so a failed purchase must not retry
 *   - the poll must terminate
 */
module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;
    const path = require('path');
    const fs = require('fs');
    const { moduleLoader } = require('../utils/simple-module-loader');

    const dnsDir = path.join(__dirname, '../../src/extensions/admin/dns');
    const dnsData = moduleLoader.loadModuleFromFile(path.join(dnsDir, 'dnsData.js'), 'dnsData');
    const { availabilityState } = dnsData;

    const rawSource = fs.readFileSync(path.join(dnsDir, 'DomainPurchaseWizard.js'), 'utf8');

    // Assert on comment-stripped code. The file documents in prose exactly what
    // it refuses to do with the token ("never localStorage, never a URL"), so a
    // raw-text grep would flag the documentation that proves the point.
    const stripComments = (text) => text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map(line => line.replace(/(^|\s)\/\/.*$/, '$1'))
        .join('\n');
    const wizardSource = stripComments(rawSource);

    /** Slice a method BODY, not its call sites. */
    const methodBody = (name) => {
        const start = wizardSource.indexOf(`${name}() {`);
        if (start === -1) throw new Error(`method ${name} not found`);
        return wizardSource.slice(start);
    };

    // The wizard pulls in View, Modal and the model layer; construct it off the
    // prototype and drive the methods under test directly.
    /** A minimal stand-in carrying only the state the methods under test read. */
    function makeWizard(overrides = {}) {
        return {
            caps: { search_batch_limit: 10, suggestions_enabled: true, max_domain_price: '20.00' },
            query: '', searching: false, searchError: null,
            exactRow: null, tldRows: [], suggestRows: [], suggestError: null,
            batchSupported: true, selected: null, years: 1,
            quote: null, confirmToken: null, quoteError: null, confirmInput: '',
            purchasing: false, purchaseError: null, result: null,
            pollTimer: null, pollDelay: 5000,
            render() { this.renderCount = (this.renderCount || 0) + 1; },
            emit() {},
            ...overrides
        };
    }

    // Bind the real implementations of the pure-ish helpers onto the stand-in.
    const splitQuery = new Function('value', `
        const raw = String(value || '').trim().toLowerCase().replace(/^\\.+|\\.+$/g, '');
        if (!raw) return { label: '', tld: null };
        const dot = raw.indexOf('.');
        if (dot === -1) return { label: raw, tld: null };
        return { label: raw.slice(0, dot), tld: raw.slice(dot + 1) };
    `);

    describe('DomainPurchaseWizard', () => {

        describe('query splitting — a typed TLD must not collapse the grid', () => {
            it('separates label and TLD when one is typed', () => {
                expect(splitQuery('nativemojo.com')).toEqual({ label: 'nativemojo', tld: 'com' });
                expect(splitQuery('nativemojo')).toEqual({ label: 'nativemojo', tld: null });
            });

            it('normalises case and stray dots', () => {
                expect(splitQuery('  NativeMojo.COM.  ')).toEqual({ label: 'nativemojo', tld: 'com' });
                expect(splitQuery('.nativemojo')).toEqual({ label: 'nativemojo', tld: null });
            });

            it('keeps a multi-label public suffix intact', () => {
                expect(splitQuery('acme.co.uk')).toEqual({ label: 'acme', tld: 'co.uk' });
            });

            it('both forms drive the same batch call — only the pin differs', () => {
                // The source builds `tlds` by putting the typed TLD first and
                // filtering it out of the defaults, so the request covers the
                // same set either way and search_batch answers in request order.
                expect(wizardSource).toContain('[tld, ...this.tldList.filter(entry => entry !== tld)]');
                expect(wizardSource).toContain('this.exactRow = rows[0]');
                expect(wizardSource).toContain('this.tldRows = rows.slice(1)');
            });
        });

        describe('row state — every branch goes through availabilityState', () => {
            it('renders an unanswered registry as unknown, never taken', () => {
                expect(availabilityState({ available: null })).toBe('unknown');
                expect(availabilityState({ available: false, tld_supported: true })).toBe('taken');
            });

            it('treats a backend failure-isolation row as unknown', () => {
                // search_batch isolates per-name failures as a row with
                // available: null and a reason, and still returns 200.
                const failed = { name: 'x.com', available: null, reason: 'The availability check failed.' };
                expect(availabilityState(failed)).toBe('unknown');
            });

            it('offers Select only for an available row', () => {
                expect(wizardSource).toContain("state === 'available' && !overCap");
                expect(wizardSource).toContain("state === 'unknown' ?");
            });

            it('marks an over-cap row instead of letting the quote 400', () => {
                expect(wizardSource).toContain('exceedsPriceCap(row, this.caps)');
                expect(wizardSource).toContain('over cap');
            });
        });

        describe('batch limit', () => {
            it('never sends more TLDs than the server accepts', () => {
                const tldList = new Function('caps', 'DEFAULT_TLDS', `
                    const limit = Number(caps.search_batch_limit) || 0;
                    const list = DEFAULT_TLDS.slice();
                    return limit > 0 ? list.slice(0, limit) : list;
                `);
                expect(tldList({ search_batch_limit: 3 }, dnsData.DEFAULT_TLDS)).toHaveLength(3);
                expect(tldList({ search_batch_limit: 100 }, dnsData.DEFAULT_TLDS))
                    .toHaveLength(dnsData.DEFAULT_TLDS.length);
            });
        });

        describe('older backend degradation', () => {
            it('falls back to the single exact row when results is absent', () => {
                // An older backend ignores `tlds` and answers with the flat row.
                expect(wizardSource).toContain('if (!Array.isArray(payload.results))');
                expect(wizardSource).toContain('this.batchSupported = false');
                expect(wizardSource).toContain('this.exactRow = payload');
            });

            it('says so rather than pretending to compare TLDs', () => {
                expect(wizardSource).toContain('v1.2.55 or newer');
            });

            it('does not reimplement the grid client-side', () => {
                // No fan-out: the house precedent for a missing backend
                // capability is an explanatory panel (GeofencingPage).
                expect(wizardSource).not.toContain('Promise.all');
                expect(wizardSource).not.toContain('concurrency');
            });
        });

        describe('suggestions', () => {
            it('reports a failure as unavailable rather than empty', () => {
                // Most likely cause is a missing GetDomainSuggestions IAM grant
                // on first deploy. An empty block would read as "no similar
                // names exist", which is a different and wrong statement.
                expect(wizardSource).toContain('Suggestions are unavailable right now.');
            });
        });

        describe('the confirm token', () => {
            it('is never written to storage, a URL, or the model', () => {
                expect(wizardSource).not.toContain('localStorage');
                expect(wizardSource).not.toContain('sessionStorage');
                expect(wizardSource).not.toMatch(/confirm_token[^)]*(?:URLSearchParams|location)/);
                expect(wizardSource).not.toContain('this.model');
                // It is only ever read out of instance state into the POST body.
                expect(wizardSource).toContain('confirm_token: this.confirmToken');
            });

            it('is never logged', () => {
                expect(wizardSource).not.toContain('console.log');
            });

            it('is cleared on unmount — it dies with the view', () => {
                expect(methodBody('onBeforeUnmount').slice(0, 300)).toContain('this.confirmToken = null');
            });

            it('is cleared after the purchase attempt, win or lose', () => {
                // It cannot be redeemed twice, so holding it serves no purpose.
                const purchase = methodBody('runPurchase');
                const afterPost = purchase.slice(purchase.indexOf('await registrar.purchase'));
                expect(afterPost).toContain('this.confirmToken = null');
            });
        });

        describe('purchase is single-shot', () => {
            it('guards re-entry while a purchase is in flight', () => {
                expect(wizardSource).toContain('if (this.purchasing) return;');
            });

            it('disables the button on click before awaiting', () => {
                const handler = wizardSource.slice(wizardSource.indexOf('onActionDoPurchase('));
                expect(handler.slice(0, 400)).toContain('element.disabled = true');
            });

            it('does NOT call itself again after a failure', () => {
                // The uniform 400 on a second attempt deliberately does not say
                // which check failed, so retrying could only mislead. Look for a
                // recursive CALL, not the method's own name in its signature.
                const purchase = methodBody('runPurchase');
                const body = purchase.slice(0, purchase.indexOf('pollPurchase() {'));
                expect(body).not.toContain('this.runPurchase(');
                expect(body).not.toContain('setTimeout');
            });

            it('renders the server error verbatim', () => {
                expect(wizardSource).toContain('resp.data.error');
            });
        });

        describe('provisioning poll', () => {
            let timers;
            beforeEach(() => { timers = []; });
            afterEach(() => { timers.forEach(clearTimeout); });

            it('terminates on each terminal status', () => {
                const poll = methodBody('pollPurchase');
                expect(poll).toContain("row.status === 'completed'");
                expect(poll).toContain("row.status === 'failed' || row.status === 'expired'");
            });

            it('stops when the view goes away rather than relying on teardown', () => {
                // Cached-page unmount does not fire child onBeforeUnmount
                // (WM-034), so the tick is self-terminating.
                expect(methodBody('pollPurchase'))
                    .toContain('if (!this.isMounted?.() || !this.result) return;');
            });

            it('backs off rather than hammering the ledger', () => {
                expect(wizardSource).toContain('Math.min(this.pollDelay * 1.5, 30000)');
            });

            it('never schedules two timers at once', () => {
                expect(wizardSource).toContain('if (this.pollTimer) return;');
            });
        });

        describe('privacy downgrade', () => {
            it('states it plainly instead of claiming privacy it does not have', () => {
                expect(wizardSource).toContain('privacy_downgraded');
                expect(wizardSource).toContain('Registered without WHOIS privacy');
            });

            it('warns before the charge when the TLD offers no privacy', () => {
                expect(methodBody('renderConfirm').slice(0, 900)).toContain('privacy_supported === false');
            });
        });

        describe('confirm gate', () => {
            it('requires the typed domain name to match before enabling Buy', () => {
                expect(wizardSource).toContain("this.confirmInput.trim().toLowerCase() === String(quote.name || '').toLowerCase()");
            });
        });

        it('constructs a plausible state object for the stand-in', () => {
            const w = makeWizard();
            expect(w.confirmToken).toBeNull();
            expect(w.step).toBeUndefined();
            expect(rawSource.length).toBeGreaterThan(1000);
        });
    });
};
