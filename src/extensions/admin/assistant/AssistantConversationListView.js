import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';

/**
 * AssistantConversationListView - Left panel showing past conversations
 *
 * Displays conversations grouped by date (Today / Yesterday / Earlier).
 * Emits events for conversation selection, creation, and deletion.
 */
class AssistantConversationListView extends View {
    constructor(options = {}) {
        super({
            className: 'assistant-conversation-list',
            ...options
        });

        this.collection = options.collection;
        this.activeId = null;
    }

    getTemplate() {
        return `
            <div class="conversation-list-header p-3">
                <button class="btn btn-primary btn-sm w-100" data-action="new-conversation">
                    <i class="bi bi-plus-lg me-1"></i> New Conversation
                </button>
            </div>
            <div class="conversation-list-items" data-container="items"></div>
        `;
    }

    async onInit() {
        await this.collection.fetch();
    }

    async onAfterRender() {
        this._renderItems();
    }

    /**
     * Render conversation items grouped by date
     * @private
     */
    _renderItems() {
        const container = this.element.querySelector('[data-container="items"]');
        if (!container) return;

        container.innerHTML = '';

        const models = this.collection.models || [];
        if (models.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted small p-4">
                    No conversations yet.<br>Start by typing a message.
                </div>
            `;
            return;
        }

        const groups = this._groupByDate(models);

        for (const [label, items] of groups) {
            // Date group header
            const header = document.createElement('div');
            header.className = 'conversation-date-header px-3 py-1 text-muted small fw-semibold text-uppercase';
            header.textContent = label;
            container.appendChild(header);

            // Conversation items
            items.forEach(model => {
                const id = model.get('id');
                const title = model.get('title') || model.get('summary') || 'New conversation';
                const isActive = id === this.activeId;

                const item = document.createElement('div');
                item.className = `conversation-item px-3 py-2${isActive ? ' active' : ''}`;
                item.dataset.id = id;
                item.innerHTML = `
                    <div class="d-flex align-items-center">
                        <div class="flex-grow-1 text-truncate conversation-title">${this._escapeHtml(title)}</div>
                        <button class="btn btn-sm btn-link text-muted p-0 ms-2 conversation-delete" data-action="delete-conversation" data-id="${id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;

                // Click on the item (not the delete button) to select
                item.addEventListener('click', (e) => {
                    if (e.target.closest('[data-action="delete-conversation"]')) return;
                    this.setActive(id);
                    this.emit('conversation:select', { id, model });
                });

                container.appendChild(item);
            });
        }
    }

    /**
     * Group models by date: Today, Yesterday, Earlier
     * @private
     */
    _groupByDate(models) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = new Map();
        groups.set('Today', []);
        groups.set('Yesterday', []);
        groups.set('Earlier', []);

        models.forEach(model => {
            const created = new Date(model.get('created') || model.get('modified'));
            const createdDate = new Date(created.getFullYear(), created.getMonth(), created.getDate());

            if (createdDate >= today) {
                groups.get('Today').push(model);
            } else if (createdDate >= yesterday) {
                groups.get('Yesterday').push(model);
            } else {
                groups.get('Earlier').push(model);
            }
        });

        // Remove empty groups
        const result = [];
        for (const [label, items] of groups) {
            if (items.length > 0) result.push([label, items]);
        }
        return result;
    }

    /**
     * Set the active conversation
     * @param {number|string} id - Conversation ID to highlight
     */
    setActive(id) {
        this.activeId = id;
        const items = this.element.querySelectorAll('.conversation-item');
        items.forEach(item => {
            item.classList.toggle('active', String(item.dataset.id) === String(id));
        });
    }

    /**
     * Handle new conversation action
     */
    onActionNewConversation() {
        this.setActive(null);
        this.emit('conversation:new');
    }

    /**
     * Handle delete conversation action
     */
    async onActionDeleteConversation(event, element) {
        const id = element.dataset.id;
        const confirmed = await Dialog.confirm({
            title: 'Delete Conversation',
            message: 'Are you sure you want to delete this conversation? This cannot be undone.',
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });

        if (!confirmed) return;

        const model = this.collection.models.find(m => String(m.get('id')) === String(id));
        if (model) {
            await model.destroy();
            await this.refresh();
            this.emit('conversation:deleted', { id });
        }
    }

    /**
     * Refresh the conversation list
     */
    async refresh() {
        await this.collection.fetch();
        this._renderItems();
    }

    /**
     * Escape HTML
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default AssistantConversationListView;
