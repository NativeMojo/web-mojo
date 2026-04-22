/**
 * PublicMessageTablePage - Admin page for reviewing visitor-submitted
 * contact and support messages (bouncer-gated /contact submissions).
 *
 * Read + status-update only. No create, no delete.
 */

import TablePage from '@core/pages/TablePage.js';
import {
    PublicMessageList,
    PublicMessageKindOptions,
    PublicMessageStatusOptions,
} from '@core/models/PublicMessage.js';
import PublicMessageView from './PublicMessageView.js';

class PublicMessageTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_public_messages',
            pageName: 'Contact Messages',
            router: 'admin/messaging/public-messages',
            Collection: PublicMessageList,

            itemViewClass: PublicMessageView,
            viewDialogOptions: {
                header: false,
                size: 'lg',
                scrollable: true,
            },

            defaultQuery: {
                sort: '-created',
            },

            columns: [
                {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    formatter: 'badge',
                    filter: {
                        type: 'multiselect',
                        placeHolder: 'Select Status',
                        options: PublicMessageStatusOptions.map(o => o.value),
                    },
                },
                {
                    key: 'kind',
                    label: 'Kind',
                    sortable: true,
                    formatter: 'badge',
                    filter: {
                        type: 'multiselect',
                        placeHolder: 'Select Kind',
                        options: PublicMessageKindOptions.map(o => o.value),
                    },
                },
                { key: 'name', label: 'Name', sortable: true, formatter: 'truncate(30)' },
                { key: 'email', label: 'Email', sortable: true },
                { key: 'subject', label: 'Subject', sortable: true, formatter: "truncate(60)|default('—')" },
                { key: 'group.name', label: 'Group', sortable: true, formatter: "default('—')" },
                { key: 'created', label: 'Created', sortable: true, formatter: 'relative' },
            ],

            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            showRefresh: true,
            showAdd: false,
            showExport: true,

            emptyMessage: 'No contact or support messages yet. Visitors submit these through the bouncer-gated /contact page.',

            batchBarLocation: 'top',
            batchActions: [
                { label: 'Mark Closed', icon: 'bi bi-check-circle', action: 'mark-closed' },
            ],

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false,
            },
        });
    }

    async onActionBatchMarkClosed() {
        const selected = this.tableView.getSelectedItems();
        if (!selected.length) return;

        const confirmed = await this.getApp().confirm(
            `Mark ${selected.length} message${selected.length > 1 ? 's' : ''} as closed?`
        );
        if (!confirmed) return;

        const results = await Promise.allSettled(selected.map(item =>
            item.model.save({ status: 'closed' })
        ));
        const failed = results.filter(r => r.status === 'rejected').length;
        const succeeded = results.length - failed;
        if (succeeded) {
            this.getApp().toast.success(`${succeeded} message(s) closed`);
        }
        if (failed) {
            this.getApp().toast.error(`${failed} message(s) failed to update`);
        }
        this.tableView.collection.fetch();
    }
}

export default PublicMessageTablePage;
