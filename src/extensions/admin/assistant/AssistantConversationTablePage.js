/**
 * AssistantConversationTablePage - Conversation history using TablePage
 */

import TablePage from '@core/pages/TablePage.js';
import { AssistantConversationList } from '@core/models/Assistant.js';
import AssistantConversationView from './AssistantConversationView.js';
import Dialog from '@core/views/feedback/Dialog.js';

class AssistantConversationTablePage extends TablePage {
    constructor(options = {}) {
        super({
            name: 'assistant_conversations',
            pageName: 'Conversation History',
            router: 'admin/assistant/conversations',
            Collection: AssistantConversationList,
            itemViewClass: AssistantConversationView,

            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            defaultQuery: {
                sort: '-modified'
            },

            columns: [
                { key: 'id', label: 'ID', width: '70px', sortable: true, class: 'text-muted' },
                { key: 'user.username', label: 'User', sortable: true },
                { key: 'title', label: 'Title', sortable: true, formatter: "truncate:80" },
                { key: 'created', label: 'Created', sortable: true, formatter: 'datetime' },
                { key: 'modified', label: 'Last Active', sortable: true, formatter: 'relative' }
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: false,
            paginated: true,

            // Toolbar — conversations are created via chat
            showRefresh: true,
            showAdd: false,
            showExport: false,

            // Batch actions
            batchActions: [
                { label: 'Delete', action: 'delete', icon: 'bi bi-trash', class: 'text-danger' }
            ],

            // Empty state
            emptyMessage: 'No conversations yet. Start a conversation with the assistant.',

            // Table display
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            },
            ...options,
        });
    }

    async onActionBatchDelete() {
        const selected = this.tableView.getSelectedItems();
        if (!selected || selected.length === 0) return;

        const confirmed = await Dialog.confirm(
            `Delete ${selected.length} conversation${selected.length > 1 ? 's' : ''}? This cannot be undone.`,
            'Delete Conversations',
            { confirmText: 'Delete', confirmClass: 'btn-danger' }
        );
        if (!confirmed) return;

        let deleted = 0;
        for (const item of selected) {
            try {
                await item.destroy();
                deleted++;
            } catch (_e) {
                // continue
            }
        }

        this.getApp()?.toast?.success(`Deleted ${deleted} conversation${deleted !== 1 ? 's' : ''}`);
        await this.tableView.refresh();
    }
}

export default AssistantConversationTablePage;
