/**
 * AssistantConversationTablePage - Conversation history using TablePage
 */

import TablePage from '@core/pages/TablePage.js';
import { AssistantConversation, AssistantConversationList } from '@ext/admin/models/Assistant.js';
import AssistantConversationView from './AssistantConversationView.js';

AssistantConversation.VIEW_CLASS = AssistantConversationView;

class AssistantConversationTablePage extends TablePage {
    constructor(options = {}) {
        super({
            name: 'assistant_conversations',
            pageName: 'Conversation History',
            router: 'admin/assistant/conversations',
            Collection: AssistantConversationList,

            viewDialogOptions: {
                header: false,
                size: 'xl'
            },

            defaultQuery: {
                sort: '-modified'
            },

            dayRangeFilter: { field: 'modified', value: '7d' },
            searchPlaceholder: 'Search title or user',

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

    onActionBatchDelete() {
        return this.batchAction({ destroy: true, label: 'Delete' });
    }
}

export default AssistantConversationTablePage;
