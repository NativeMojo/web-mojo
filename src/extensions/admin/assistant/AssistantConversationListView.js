import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import dataFormatter from '@core/utils/DataFormatter.js';

/**
 * AssistantConversationListView - Left panel showing past conversations
 *
 * Displays conversations grouped by date (Today / Yesterday / Earlier).
 * Includes search input (debounced) and "Load more" pagination.
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
        this._searchTimeout = null;
    }

    getTemplate() {
        return `
            <div class="conversation-list-header">
                <div class="conversation-search-wrapper mb-2">
                    <input type="text" class="form-control form-control-sm conversation-search-input"
                           placeholder="Search conversations..." data-ref="search-input">
                </div>
                <button class="btn btn-outline-secondary w-100" data-action="new-conversation">
                    <i class="bi bi-plus-lg me-1"></i> New conversation
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

        // Wire search input
        const searchInput = this.element.querySelector('[data-ref="search-input"]');
        if (searchInput) {
            searchInput.addEventListener('input', () => this._onSearchInput(searchInput));
        }
    }

    /**
     * Handle search input with debounce
     * @private
     */
    _onSearchInput(input) {
        if (this._searchTimeout) clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(async () => {
            const query = input.value.trim();
            if (query) {
                this.collection.params.search = query;
            } else {
                delete this.collection.params.search;
            }
            this.collection.params.start = 0;
            await this.collection.fetch();
            this._renderItems();
        }, 300);
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
                const modified = model.get('modified') || model.get('created');
                const timeStr = this._relativeTime(modified);
                const isActive = id === this.activeId;
                const user = model.get('user');
                const userName = user?.display_name || '';
                const avatarUrl = user?.avatar?.thumbnail || user?.avatar?.url || '';

                const item = document.createElement('div');
                item.className = `conversation-item px-3 py-2${isActive ? ' active' : ''}`;
                item.dataset.id = id;
                item.innerHTML = `
                    <div class="d-flex align-items-start">
                        ${avatarUrl
                            ? `<img src="${this._escapeHtml(avatarUrl)}" alt="" class="conversation-avatar">`
                            : `<div class="conversation-avatar conversation-avatar-initials">${this._escapeHtml(this._initials(userName))}</div>`
                        }
                        <div class="flex-grow-1 overflow-hidden">
                            <div class="text-truncate conversation-title">${this._escapeHtml(title)}</div>
                            <div class="conversation-meta text-muted">
                                ${userName ? `<span>${this._escapeHtml(userName)}</span>` : ''}
                                ${timeStr ? `<span>${timeStr}</span>` : ''}
                            </div>
                        </div>
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

        // "Load more" button when there are more pages
        if (this.collection.hasMore) {
            const loadMore = document.createElement('div');
            loadMore.className = 'conversation-load-more text-center py-2';
            loadMore.innerHTML = '<button class="btn btn-sm btn-link text-muted" data-action="load-more">Load more</button>';
            container.appendChild(loadMore);
        }
    }

    /**
     * Load next page of conversations and append
     */
    async onActionLoadMore() {
        await this.collection.nextPage();
        this._renderItems();
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
            const raw = model.get('created') || model.get('modified');
            const created = new Date(dataFormatter.normalizeEpoch(raw));
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
     * Format a date string as relative time (e.g. "2m ago", "3h ago", "Jan 5")
     * @private
     */
    _relativeTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dataFormatter.normalizeEpoch(dateStr));
        if (isNaN(date)) return '';

        const now = Date.now();
        const diff = now - date.getTime();
        const seconds = Math.floor(diff / 1000);

        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;

        // Older than a week — show short date
        const month = date.toLocaleString('default', { month: 'short' });
        return `${month} ${date.getDate()}`;
    }

    /**
     * Get initials from a display name (e.g. "Internal Use" → "IU")
     * @private
     */
    _initials(name) {
        if (!name) return '?';
        return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
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
