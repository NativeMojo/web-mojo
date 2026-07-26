/**
 * DomainPurchaseTablePage - Admin > DNS > Purchases (route: system/dns/purchases).
 *
 * A read-only money ledger. The backend declares CAN_CREATE / CAN_UPDATE /
 * CAN_DELETE all False and writes these rows only from the registrar service,
 * so this page offers no add, edit or delete anywhere.
 *
 * Row expand rather than a detail view: nothing here is editable, so a modal
 * would be an empty frame around four fields.
 *
 * Two shapes worth knowing while reading this file:
 *  - A ledger row can OUTLIVE its domain. A failed registration deletes the
 *    Domain row and keeps this one with its error, which is the whole point of
 *    the ledger — so nothing here may assume a joinable domain.
 *  - `confirm_token` is NO_SHOW on the backend and absent from every graph.
 *    There is no column for it and never will be.
 */

import TablePage from '@core/pages/TablePage.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { DomainPurchaseList, PurchaseStatusOptions } from '@ext/admin/models/Dns.js';

const escapeHtml = MOJOUtils.escapeHtml;

class DomainPurchaseTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_dns_purchases',
            pageName: 'Domain Purchases',
            router: 'admin/dns/purchases',
            Collection: DomainPurchaseList,

            defaultQuery: { sort: '-created' },

            columns: [
                { key: 'created|datetime', label: 'Created', width: '170px', sortable: true },
                { key: 'domain_name', label: 'Domain', sortable: true },
                { key: 'kind', label: 'Kind', width: '100px' },
                {
                    key: 'status', label: 'Status', width: '120px', sortable: true,
                    formatter: (value) => {
                        const tone = value === 'completed' ? 'success'
                            : value === 'failed' ? 'danger'
                                : value === 'expired' ? 'secondary' : 'warning';
                        return `<span class="badge bg-${tone} bg-opacity-25 text-body">${escapeHtml(value)}</span>`;
                    },
                    filter: { type: 'select', options: PurchaseStatusOptions }
                },
                {
                    key: 'price', label: 'Price', width: '110px', align: 'right',
                    formatter: (value, row) => (value === null || value === undefined
                        ? '<span class="text-secondary">—</span>'
                        : escapeHtml(`${value} ${row?.attributes?.currency || ''}`.trim()))
                },
                {
                    key: 'cost', label: 'Cost', width: '110px', align: 'right', visibility: 'xl',
                    formatter: "default('—')"
                },
                { key: 'years', label: 'Years', width: '80px', align: 'right', visibility: 'lg' }
            ],

            // Read-only: no add, no row edit, no row delete.
            showAdd: false,
            showExport: true,
            showRefresh: true,
            searchable: true,
            searchPlaceholder: 'Search domain or status',
            sortable: true,
            filterable: true,
            paginated: true,

            rowExpand: (model) => {
                const attrs = model.attributes || {};
                const row = (label, value, tone) => `
                    <div class="d-flex gap-3 py-1 small">
                        <div class="text-secondary" style="width:11rem">${escapeHtml(label)}</div>
                        <div class="${tone || ''} font-monospace">${escapeHtml(value ?? '—')}</div>
                    </div>`;
                return `
                    <div class="px-3 py-2">
                        ${row('Operation id', attrs.operation_id)}
                        ${row('Quote expires', attrs.quote_expires)}
                        ${attrs.error ? row('Error', attrs.error, 'text-danger') : ''}
                        ${attrs.status === 'failed' ? `
                            <div class="alert alert-secondary py-2 px-3 small mt-2 mb-0">
                                The domain row for this attempt was removed, so this ledger entry is the
                                whole audit trail — and the name is free to try again.
                            </div>
                        ` : ''}
                    </div>`;
            },

            emptyMessage: 'No domain purchases recorded.',

            tableOptions: { striped: true, bordered: false, hover: true, responsive: false }
        });
    }
}

export default DomainPurchaseTablePage;
