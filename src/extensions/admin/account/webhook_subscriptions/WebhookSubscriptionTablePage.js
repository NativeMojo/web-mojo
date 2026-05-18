/**
 * WebhookSubscriptionTablePage - Cross-group webhook subscription
 * management for system admins. Mirrors the ApiKeyTablePage shape.
 *
 * Group-scoped operators land here from the per-group Webhooks
 * section inside GroupView; system admins can filter by `?group=` to
 * scope the table.
 */

import TablePage from '@core/pages/TablePage.js';
import {
    WebhookSubscription,
    WebhookSubscriptionList,
    WebhookSubscriptionForms
} from '@core/models/WebhookSubscription.js';
import WebhookSubscriptionView from './WebhookSubscriptionView.js';

// Register the add/edit forms on the model class so TableView can
// find them automatically — same pattern as ApiKey.
WebhookSubscription.ADD_FORM = WebhookSubscriptionForms.create;
WebhookSubscription.EDIT_FORM = WebhookSubscriptionForms.edit;

class WebhookSubscriptionTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_webhook_subscriptions',
            pageName: 'Webhook Subscriptions',
            router: 'admin/webhook-subscriptions',
            Collection: WebhookSubscriptionList,

            itemViewClass: WebhookSubscriptionView,
            viewDialogOptions: {
                header: false,
                size: 'lg'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                {
                    key: 'url',
                    label: 'URL',
                    sortable: true,
                    class: 'font-monospace text-truncate',
                    style: 'max-width: 320px;'
                },
                {
                    key: 'events',
                    label: 'Events',
                    visibility: 'lg',
                    formatter: 'badge'
                },
                { key: 'group.name', label: 'Group', sortable: true, formatter: "default('—')" },
                {
                    key: 'is_active',
                    label: 'Status',
                    formatter: "boolean('Active|bg-success','Inactive|bg-secondary')|badge",
                    width: '100px'
                },
                { key: 'created', label: 'Created', formatter: 'datetime', sortable: true }
            ],

            selectable: true,
            searchable: true,
            searchPlaceholder: 'Search URL or group',
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: true,
            showExport: false,

            addButtonLabel: 'New Subscription',

            emptyMessage: 'No webhook subscriptions found.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    /**
     * Override the generic Add flow so we can route the raw form data
     * through `WebhookSubscriptionForms.normalizePayload` — the events
     * field arrives as a comma-separated string from TagInput and
     * needs to be split into an array before the server sees it.
     */
    async onActionAdd() {
        const app = this.getApp();
        const model = new WebhookSubscription();
        const result = await app.showForm({
            model,
            ...WebhookSubscriptionForms.create
        });
        if (!result) return;

        const payload = WebhookSubscriptionForms.normalizePayload(result);
        const resp = await model.save(payload);
        if (!resp?.data?.status) {
            app.showError(resp?.data?.error || 'Failed to create webhook subscription');
            return;
        }

        this.collection.add(model);
        this.tableView?.refresh();
    }
}

export default WebhookSubscriptionTablePage;
