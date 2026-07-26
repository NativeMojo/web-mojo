/**
 * DomainPurchaseWizard - search, quote, confirm, buy (#394).
 *
 * Five steps rendered as distinct states of ONE view, so the shown-once
 * confirm token never crosses a component boundary.
 *
 * Things here that look like detail but are not:
 *
 *  - **A typed TLD never collapses the grid.** `nativemojo.com` and
 *    `nativemojo` produce the same three sections; the full form just pins an
 *    exact-match row on top. `.com` is the likeliest name to be taken, so
 *    answering a full-name search with a single "already registered" row is
 *    precisely the dead end this screen exists to remove — the alternatives
 *    have to be on screen at the moment the bad news is.
 *  - **`available` is TRI-STATE.** Every row renders through
 *    `availabilityState()`; `null` means the registry did not answer and must
 *    never read as taken.
 *  - **The confirm token lives in instance state and nowhere else.** Never
 *    localStorage, never a URL, never a log line. It is shown exactly once by
 *    the backend and only its hash is stored, so if this view goes away the
 *    quote is simply gone and a new one is taken.
 *  - **A quote redeems exactly once.** The purchase button disables on click
 *    and never auto-retries: a second attempt returns a uniform 400 that
 *    deliberately does not say which check failed, so retrying could only
 *    mislead.
 */

import View from '@core/View.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { DomainPurchase, registrar } from '@ext/admin/models/Dns.js';
import {
    DEFAULT_TLDS,
    availabilityState,
    exceedsPriceCap
} from './dnsData.js';

const escapeHtml = MOJOUtils.escapeHtml;

const STATE_LABELS = {
    available: { text: 'Available', tone: 'success' },
    taken: { text: 'Already registered', tone: 'danger' },
    unknown: { text: "Registry hasn't answered", tone: 'warning' },
    unsupported: { text: 'Not sold here', tone: 'secondary' }
};

class DomainPurchaseWizard extends View {
    constructor(options = {}) {
        super({ className: 'domain-purchase-wizard', ...options });

        this.caps = options.caps || {};
        this.step = 'search';
        this.query = '';
        this.searching = false;
        this.searchError = null;

        this.exactRow = null;      // the name typed, when it carried a TLD
        this.tldRows = [];
        this.suggestRows = [];
        this.suggestError = null;
        this.batchSupported = true;

        this.selected = null;
        this.years = 1;
        this.group = options.group || null;

        // Quote state — the token is here and NOWHERE else.
        this.quote = null;
        this.confirmToken = null;
        this.quoteError = null;
        this.confirmInput = '';

        this.purchasing = false;
        this.purchaseError = null;
        this.result = null;
        this.pollTimer = null;
        this.pollDelay = 5000;
    }

    // ── Step 1: search ─────────────────────────────────────────────────

    /** Split a typed value into its label and the TLD, if one was given. */
    splitQuery(value) {
        const raw = String(value || '').trim().toLowerCase().replace(/^\.+|\.+$/g, '');
        if (!raw) return { label: '', tld: null };
        const dot = raw.indexOf('.');
        if (dot === -1) return { label: raw, tld: null };
        return { label: raw.slice(0, dot), tld: raw.slice(dot + 1) };
    }

    get tldList() {
        // Never send more names than the server will accept; over the cap it
        // 400s naming the limit.
        const limit = Number(this.caps.search_batch_limit) || 0;
        const list = DEFAULT_TLDS.slice();
        return limit > 0 ? list.slice(0, limit) : list;
    }

    async runSearch() {
        const { label, tld } = this.splitQuery(this.query);
        if (!label) return;

        this.searching = true;
        this.searchError = null;
        this.exactRow = null;
        this.tldRows = [];
        this.suggestRows = [];
        this.suggestError = null;
        this.render();

        const batchCapable = Number(this.caps.search_batch_limit) > 0
            && this.caps.suggestions_enabled !== false;

        if (!batchCapable) {
            await this.runSingleSearch(tld ? `${label}.${tld}` : `${label}.com`);
            this.batchSupported = false;
            this.searching = false;
            this.render();
            return;
        }

        // One call for the exact row plus the TLD grid. search_batch answers in
        // REQUEST ORDER, so putting the typed name first makes it row 1 and the
        // section split a slice — no client-side sorting.
        const tlds = tld
            ? [tld, ...this.tldList.filter(entry => entry !== tld)]
            : this.tldList;

        const resp = await registrar.searchBatch({ domain: label, tlds });
        const payload = resp && resp.data && resp.data.data;

        if (!resp || !resp.success || !payload) {
            this.searchError = (resp && resp.data && resp.data.error)
                || 'The availability search failed. Try again in a moment.';
            this.searching = false;
            this.render();
            return;
        }

        if (!Array.isArray(payload.results)) {
            // An older backend ignores `tlds` and answers with the flat single
            // row. Degrade to exactly that rather than reimplementing the grid
            // client-side (see D10 in the workspec).
            this.batchSupported = false;
            this.exactRow = payload;
            this.searching = false;
            this.render();
            return;
        }

        this.batchSupported = true;
        const rows = payload.results;
        if (tld) {
            this.exactRow = rows[0] || null;
            this.tldRows = rows.slice(1);
        } else {
            this.exactRow = null;
            this.tldRows = rows;
        }
        this.searching = false;
        this.render();

        this.loadSuggestions(tld ? `${label}.${tld}` : `${label}.com`);
    }

    async runSingleSearch(name) {
        const resp = await registrar.search(name);
        const payload = resp && resp.data && resp.data.data;
        if (!resp || !resp.success || !payload) {
            this.searchError = (resp && resp.data && resp.data.error)
                || 'The availability search failed. Try again in a moment.';
            return;
        }
        this.exactRow = payload;
    }

    async loadSuggestions(name) {
        if (this.caps.suggestions_enabled === false) return;
        const resp = await registrar.suggest({ domain: name });
        const payload = resp && resp.data && resp.data.data;
        if (!resp || !resp.success || !payload || !Array.isArray(payload.results)) {
            // Most likely the route53domains:GetDomainSuggestions IAM grant is
            // missing on a first deploy. Say "unavailable" — an empty block
            // would read as "no similar names exist", which is a different and
            // wrong statement.
            this.suggestError = (resp && resp.data && resp.data.error)
                || 'Suggestions are unavailable right now.';
        } else {
            this.suggestRows = payload.results;
        }
        this.render();
    }

    // ── Step 2/3: quote and confirm ────────────────────────────────────

    async takeQuote(row) {
        const app = this.getApp();
        this.selected = row;
        this.quoteError = null;
        this.step = 'quote';
        this.render();

        const group = this.group || app?.getActiveGroupId?.() || app?.activeGroup?.id;
        const resp = await registrar.quote({ group, domain: row.name, years: this.years });
        const payload = resp && resp.data && resp.data.data;

        if (!resp || !resp.success || !payload) {
            this.quoteError = (resp && resp.data && resp.data.error)
                || 'Could not price that domain.';
            this.render();
            return;
        }

        this.quote = payload;
        this.confirmToken = payload.token || null;
        this.step = 'confirm';
        this.confirmInput = '';
        this.render();
    }

    async runPurchase() {
        if (this.purchasing) return;      // a quote redeems exactly once
        if (!this.confirmToken || !this.quote) return;

        const app = this.getApp();
        this.purchasing = true;
        this.purchaseError = null;
        this.step = 'provisioning';
        this.render();

        const group = this.group || app?.getActiveGroupId?.() || app?.activeGroup?.id;
        const resp = await registrar.purchase({
            group,
            purchase: this.quote.purchase,
            confirm_token: this.confirmToken
        });

        // Spent either way: the token cannot be redeemed twice, so holding it
        // any longer serves no purpose.
        this.confirmToken = null;

        const payload = resp && resp.data && resp.data.data;
        if (!resp || !resp.success || !payload) {
            this.purchaseError = (resp && resp.data && resp.data.error)
                || 'The purchase could not be completed.';
            this.step = 'failed';
            this.purchasing = false;
            this.render();
            return;   // deliberately NO retry
        }

        this.result = payload;
        this.render();
        this.pollPurchase();
    }

    /**
     * Registration is asynchronous at the registrar. Self-terminating tick —
     * cached-page unmount does not fire child onBeforeUnmount (WM-034), so the
     * loop stops itself rather than relying on teardown.
     */
    pollPurchase() {
        if (this.pollTimer) return;
        const tick = async () => {
            this.pollTimer = null;
            if (!this.isMounted?.() || !this.result) return;

            const model = new DomainPurchase({ id: this.result.purchase });
            const resp = await model.fetch();
            const row = resp && resp.data && resp.data.data;
            if (row) {
                this.result = { ...this.result, status: row.status, error: row.error };
                if (row.status === 'completed') {
                    this.step = 'done';
                    this.purchasing = false;
                    this.emit('purchased', { purchase: row });
                    this.render();
                    return;
                }
                if (row.status === 'failed' || row.status === 'expired') {
                    this.purchaseError = row.error || `The registration ${row.status}.`;
                    this.step = 'failed';
                    this.purchasing = false;
                    this.render();
                    return;
                }
                this.render();
            }
            this.pollDelay = Math.min(this.pollDelay * 1.5, 30000);
            this.pollTimer = setTimeout(tick, this.pollDelay);
        };
        this.pollTimer = setTimeout(tick, this.pollDelay);
    }

    onBeforeUnmount() {
        if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
        // The token dies with the view, deliberately.
        this.confirmToken = null;
    }

    // ── Rendering ──────────────────────────────────────────────────────

    getTemplate() {
        return `
            <div class="p-3">
                ${this.renderHeader()}
                ${this.renderSteps()}
                <div class="pt-3">${this.renderBody()}</div>
            </div>
        `;
    }

    renderHeader() {
        const titles = {
            search: 'Buy a domain', quote: 'Pricing…', confirm: 'Confirm purchase',
            provisioning: 'Registering', done: 'Registered', failed: 'Registration failed'
        };
        return `
            <div class="d-flex align-items-start gap-3 mb-3">
                <span class="d-grid" style="width:44px;height:44px;border-radius:11px;place-items:center;
                      background:rgba(var(--bs-primary-rgb),.12); color:var(--bs-primary)">
                    <i class="bi bi-globe2 fs-5"></i>
                </span>
                <div>
                    <h5 class="mb-0">${escapeHtml(titles[this.step] || 'Buy a domain')}</h5>
                    <div class="text-secondary small">Availability and live registry pricing.</div>
                </div>
                <button type="button" class="btn btn-link text-secondary ms-auto p-0"
                        data-bs-dismiss="modal" aria-label="Close"><i class="bi bi-x-lg"></i></button>
            </div>
        `;
    }

    renderSteps() {
        const order = ['search', 'quote', 'confirm', 'provisioning'];
        const labels = { search: 'Search', quote: 'Quote', confirm: 'Confirm', provisioning: 'Register' };
        const current = this.step === 'done' || this.step === 'failed' ? 'provisioning' : this.step;
        const index = order.indexOf(current);
        return `
            <div class="d-flex gap-3 flex-wrap border-top border-bottom py-2">
                ${order.map((key, i) => {
                    const done = i < index;
                    const on = i === index;
                    const tone = done ? 'bg-success bg-opacity-25 text-success'
                        : on ? 'bg-primary text-white' : 'bg-secondary bg-opacity-10 text-secondary';
                    return `<span class="d-flex align-items-center gap-2 small ${on ? 'fw-semibold' : 'text-secondary'}">
                        <span class="d-grid rounded-circle ${tone}" style="width:20px;height:20px;place-items:center;font-size:.7rem">
                            ${done ? '&check;' : i + 1}
                        </span>${escapeHtml(labels[key])}</span>`;
                }).join('')}
            </div>
        `;
    }

    renderBody() {
        switch (this.step) {
            case 'quote': return this.renderQuoting();
            case 'confirm': return this.renderConfirm();
            case 'provisioning': return this.renderProvisioning();
            case 'done': return this.renderDone();
            case 'failed': return this.renderFailed();
            default: return this.renderSearch();
        }
    }

    renderSearch() {
        return `
            <div class="mb-3">
                <label class="form-label small text-secondary">Name</label>
                <div class="input-group">
                    <input type="text" class="form-control font-monospace" value="${escapeHtml(this.query)}"
                           placeholder="nativemojo" data-action="query-changed"
                           data-action-debounce="400">
                    <button class="btn btn-primary" data-action="run-search">Search</button>
                </div>
                <div class="form-text">
                    A TLD is optional. Either way you get the full comparison — typing one just pins it to the top.
                </div>
            </div>

            ${this.searching ? '<div class="text-secondary small py-3">Checking the registry…</div>' : ''}
            ${this.searchError ? `<div class="alert alert-danger py-2 px-3 small">${escapeHtml(this.searchError)}</div>` : ''}

            ${this.exactRow ? `
                <div class="text-uppercase text-secondary fw-semibold mb-1" style="font-size:.68rem;letter-spacing:.08em">
                    What you asked for
                </div>
                ${this.renderRows([this.exactRow])}
            ` : ''}

            ${this.tldRows.length ? `
                <div class="text-uppercase text-secondary fw-semibold mb-1 mt-3" style="font-size:.68rem;letter-spacing:.08em">
                    Other TLDs
                </div>
                ${this.renderRows(this.tldRows)}
            ` : ''}

            ${!this.batchSupported && !this.searching ? `
                <div class="alert alert-secondary py-2 px-3 small mt-3 mb-0">
                    <i class="bi bi-info-circle me-1"></i>
                    Comparing TLDs and suggesting similar names needs django-mojo v1.2.55 or newer.
                    This server can only check one name at a time.
                </div>
            ` : ''}

            ${this.suggestRows.length ? `
                <div class="text-uppercase text-secondary fw-semibold mb-1 mt-3" style="font-size:.68rem;letter-spacing:.08em">
                    Similar names
                </div>
                ${this.renderRows(this.suggestRows)}
            ` : ''}
            ${this.suggestError ? `
                <div class="text-secondary small mt-2">${escapeHtml(this.suggestError)}</div>
            ` : ''}
        `;
    }

    renderRows(rows) {
        return `
            <div class="list-group mb-2">
                ${rows.map((row, index) => this.renderRow(row, index, rows)).join('')}
            </div>
        `;
    }

    renderRow(row, index, rows) {
        const state = availabilityState(row);
        const label = STATE_LABELS[state];
        const overCap = state === 'available' && exceedsPriceCap(row, this.caps);
        const rowIndex = this.rowIndexOf(row, index, rows);

        return `
            <div class="list-group-item d-flex align-items-center gap-3 flex-wrap">
                <span class="font-monospace">${escapeHtml(row.name || '')}</span>
                <span class="badge bg-${label.tone} bg-opacity-25 text-body">${escapeHtml(label.text)}</span>
                ${row.reason ? `<span class="text-secondary small">${escapeHtml(row.reason)}</span>` : ''}
                <span class="ms-auto d-flex align-items-center gap-2">
                    ${row.price !== null && row.price !== undefined
                        ? `<span class="fw-semibold">${escapeHtml(String(row.price))} ${escapeHtml(row.currency || '')}</span>`
                        : ''}
                    ${overCap ? `
                        <span class="badge bg-warning bg-opacity-25 text-body"
                              title="Over the configured purchase cap of ${escapeHtml(String(this.caps.max_domain_price))}">
                            over cap
                        </span>` : ''}
                    ${state === 'unknown' ? `
                        <button class="btn btn-sm btn-outline-secondary" data-action="run-search">Retry</button>
                    ` : ''}
                    ${state === 'available' && !overCap ? `
                        <button class="btn btn-sm btn-primary" data-action="select-row" data-row="${rowIndex}">Select</button>
                    ` : ''}
                </span>
            </div>
        `;
    }

    /** Stable index into a single flat list of every rendered row. */
    rowIndexOf(row) {
        return this.allRows().findIndex(entry => entry === row);
    }

    allRows() {
        return [
            ...(this.exactRow ? [this.exactRow] : []),
            ...this.tldRows,
            ...this.suggestRows
        ];
    }

    renderQuoting() {
        if (this.quoteError) {
            return `
                <div class="alert alert-warning py-2 px-3 small">${escapeHtml(this.quoteError)}</div>
                <button class="btn btn-secondary btn-sm" data-action="back-to-search">Back to search</button>
            `;
        }
        return '<div class="text-secondary small py-4">Pricing this domain…</div>';
    }

    renderConfirm() {
        const quote = this.quote || {};
        const privacy = quote.privacy_supported === false
            ? `<div class="alert alert-warning py-2 px-3 small">
                   <i class="bi bi-exclamation-triangle me-1"></i>
                   .${escapeHtml(String(quote.name || '').split('.').pop())} does not offer WHOIS privacy —
                   your registrant details will be public.
               </div>`
            : '';
        return `
            ${privacy}
            <div class="border rounded overflow-hidden mb-3">
                ${this.confirmLine('Domain', quote.name)}
                ${this.confirmLine('Term', `${quote.years || 1} year${(quote.years || 1) === 1 ? '' : 's'}`)}
                ${this.confirmLine('WHOIS privacy', quote.privacy_supported === false ? 'Not available' : 'Will be enabled')}
                <div class="d-flex justify-content-between px-3 py-2 fw-semibold bg-body-tertiary">
                    <span>Total charged now</span>
                    <span>${escapeHtml(String(quote.price))} ${escapeHtml(quote.currency || '')}</span>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label small text-secondary">
                    Type <code>${escapeHtml(quote.name || '')}</code> to confirm
                </label>
                <input type="text" class="form-control font-monospace" value="${escapeHtml(this.confirmInput)}"
                       data-action="confirm-input-changed" placeholder="${escapeHtml(quote.name || '')}">
                <div class="form-text">
                    This quote is held briefly and can be used once. Close this dialog and it is
                    simply discarded — you would take a new one. Nothing is charged until you confirm.
                </div>
            </div>

            <div class="d-flex gap-2">
                <button class="btn btn-secondary" data-action="back-to-search">Back</button>
                <button class="btn btn-primary ms-auto" data-action="do-purchase"
                        ${this.confirmInput.trim().toLowerCase() === String(quote.name || '').toLowerCase() ? '' : 'disabled'}>
                    Buy ${escapeHtml(quote.name || '')} — ${escapeHtml(String(quote.price))} ${escapeHtml(quote.currency || '')}
                </button>
            </div>
        `;
    }

    confirmLine(label, value) {
        return `<div class="d-flex justify-content-between px-3 py-2 border-bottom small">
            <span class="text-secondary">${escapeHtml(label)}</span>
            <span class="font-monospace">${escapeHtml(String(value ?? '—'))}</span>
        </div>`;
    }

    renderProvisioning() {
        return `
            <div class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-primary mb-3" role="status"></div>
                <h6 class="mb-1">This usually takes a few minutes</h6>
                <p class="text-secondary small mb-0">
                    You can close this window — the purchase appears on the Purchases ledger and the
                    domain shows up under Domains as soon as the registrar confirms.
                </p>
            </div>
            ${this.result?.operation_id ? `
                <div class="small text-secondary text-center font-monospace">${escapeHtml(this.result.operation_id)}</div>
            ` : ''}
        `;
    }

    renderDone() {
        const downgraded = this.result && this.result.privacy_downgraded;
        return `
            <div class="text-center py-3">
                <div class="mb-2"><i class="bi bi-check-circle fs-2 text-success"></i></div>
                <h6 class="mb-1">${escapeHtml(this.result?.name || 'Your domain')} is yours</h6>
                <p class="text-secondary small mb-0">Registered and active.</p>
            </div>
            ${downgraded ? `
                <div class="alert alert-warning py-2 px-3 small">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Registered without WHOIS privacy — this TLD does not offer it.
                </div>
            ` : ''}
            <div class="d-flex gap-2">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button class="btn btn-primary ms-auto" data-action="manage-dns">Manage DNS</button>
            </div>
        `;
    }

    renderFailed() {
        return `
            <div class="alert alert-danger py-2 px-3 small">
                ${escapeHtml(this.purchaseError || 'The registration failed.')}
            </div>
            <p class="text-secondary small">
                The name is still available — the attempt is recorded on the Purchases ledger, and
                nothing blocks trying again.
            </p>
            <div class="d-flex gap-2">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button class="btn btn-outline-secondary ms-auto" data-action="back-to-search">Start over</button>
            </div>
        `;
    }

    // ── Actions ────────────────────────────────────────────────────────

    onActionQueryChanged(event, element) {
        this.query = element.value;
    }

    onActionRunSearch() {
        return this.runSearch();
    }

    onActionSelectRow(event, element) {
        const row = this.allRows()[Number(element.dataset.row)];
        if (row) return this.takeQuote(row);
        return true;
    }

    onActionConfirmInputChanged(event, element) {
        this.confirmInput = element.value;
        const button = this.element?.querySelector('[data-action="do-purchase"]');
        if (button) {
            const match = this.confirmInput.trim().toLowerCase()
                === String(this.quote?.name || '').toLowerCase();
            button.disabled = !match;
        }
    }

    onActionDoPurchase(event, element) {
        // Disable immediately: a quote can be redeemed exactly once, so a
        // double click must not become a second attempt.
        if (element) element.disabled = true;
        return this.runPurchase();
    }

    onActionBackToSearch() {
        this.step = 'search';
        this.quote = null;
        this.confirmToken = null;
        this.quoteError = null;
        this.purchaseError = null;
        this.purchasing = false;
        this.render();
        return true;
    }

    onActionManageDns() {
        const app = this.getApp();
        const domainId = this.result && this.result.domain;
        this.emit('purchased', { purchase: this.result });
        if (domainId) app?.navigate?.(`?page=system/dns/records&domain=${domainId}`);
        const dialog = this.element?.closest('.modal');
        if (dialog) window.bootstrap?.Modal?.getInstance(dialog)?.hide();
        return true;
    }
}

export default DomainPurchaseWizard;
