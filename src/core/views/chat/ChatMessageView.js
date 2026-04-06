import View from '@core/View.js';
import FilePreviewView from '@core/views/data/FilePreviewView.js';

/**
 * ChatMessageView - Individual message display with theme support
 * 
 * Supports two themes:
 * - 'compact': List-based admin/activity feed style
 * - 'bubbles': Chat bubble style with left/right positioning
 */
class ChatMessageView extends View {
    constructor(options = {}) {
        super({
            className: 'chat-message',
            ...options
        });
        
        this.message = options.message || {};
        this.theme = options.theme || 'compact';
        this.isCurrentUser = options.isCurrentUser || false;
        this.role = this.message.role || (this.isCurrentUser ? 'user' : null);

        // Add theme-specific and role-specific classes
        if (this.theme === 'bubbles') {
            this.className += this.isCurrentUser ? ' message-right' : ' message-left';
        }
        if (this.role === 'assistant') {
            this.className += ' message-assistant';
        } else if (this.role === 'user') {
            this.className += ' message-user';
        }
    }

    getTemplate() {
        // System event messages (same for both themes)
        if (this.message.type === 'system_event') {
            return `
                <div class="chat-message-system text-center text-muted small py-2">
                    <i class="bi bi-info-circle me-1"></i>
                    {{message.content}}
                </div>
            `;
        }

        // Theme-specific templates
        if (this.theme === 'bubbles') {
            return this.getBubblesTemplate();
        } else {
            return this.getCompactTemplate();
        }
    }

    /**
     * Get compact theme template (Option 4 - Admin/Activity Feed Style)
     */
    getCompactTemplate() {
        const userClass = this.isCurrentUser ? 'bg-primary' : 'bg-secondary';
        const isAssistant = this.role === 'assistant';

        return `
            <div class="message-item">
                <div class="message-avatar ${isAssistant ? 'bg-dark' : userClass}">
                    ${isAssistant ? '<i class="bi bi-robot"></i>' : `
                    {{#message.author.avatarUrl}}
                        <img src="{{message.author.avatarUrl}}" alt="{{message.author.name}}" class="w-100 h-100 rounded-circle">
                    {{/message.author.avatarUrl}}
                    {{^message.author.avatarUrl}}
                        {{message.author.name|initials}}
                    {{/message.author.avatarUrl}}
                    `}
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <div class="message-author">
                            ${isAssistant ? 'Assistant' : '{{message.author.name}}'}
                            {{#isCurrentUser}}
                                <span class="badge bg-primary badge-sm ms-1">You</span>
                            {{/isCurrentUser}}
                        </div>
                        <div class="message-time text-muted">{{message.timestamp|relative}}</div>
                    </div>
                    <div class="message-text">{{{message.content}}}</div>
                    ${this._getToolCallsTemplate()}
                    <div data-container="blocks-${this.message.id || this.id}"></div>
                    <div data-container="attachments"></div>
                </div>
            </div>
        `;
    }

    /**
     * Get bubbles theme template (Option 1 - Modern Chat Bubbles)
     */
    getBubblesTemplate() {
        const isAssistant = this.role === 'assistant';

        return `
            <div class="message-bubble-wrapper">
                <div class="message-meta">
                    <strong>${isAssistant ? '<i class="bi bi-robot me-1"></i>Assistant' : '{{message.author.name}}'}</strong>
                    <span class="text-muted">· {{message.timestamp|relative}}</span>
                </div>
                <div class="message-bubble">
                    <div class="message-text">{{{message.content}}}</div>
                    ${this._getToolCallsTemplate()}
                    <div data-container="blocks-${this.message.id || this.id}"></div>
                    <div data-container="attachments"></div>
                </div>
            </div>
        `;
    }

    /**
     * Get tool calls display template (collapsible section showing tool usage)
     * @private
     */
    _getToolCallsTemplate() {
        if (!this.message.tool_calls || this.message.tool_calls.length === 0) {
            return '';
        }
        const esc = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };
        const toolBadges = this.message.tool_calls.map(tc => {
            const name = esc(tc.name || tc.function?.name || 'tool');
            const statusClass = tc.status === 'error' ? 'bg-danger' : 'bg-info';
            return `<span class="badge ${statusClass} me-1">${name}</span>`;
        }).join('');

        const collapseId = `tools-${this.message.id || this.id}`;
        return `
            <div class="message-tool-calls mt-1">
                <a class="text-muted small" data-bs-toggle="collapse" href="#${collapseId}" role="button" aria-expanded="false">
                    <i class="bi bi-tools me-1"></i>${this.message.tool_calls.length} tool call${this.message.tool_calls.length > 1 ? 's' : ''}
                </a>
                <div class="collapse" id="${collapseId}">
                    <div class="mt-1">${toolBadges}</div>
                </div>
            </div>
        `;
    }

    async onAfterRender() {
        // Render attachments if any
        if (this.message.attachments && this.message.attachments.length > 0) {
            const attachmentsContainer = this.element.querySelector('[data-container="attachments"]');
            if (attachmentsContainer) {
                this.message.attachments.forEach(file => {
                    const filePreview = new FilePreviewView({ file });
                    this.addChild(filePreview);
                    filePreview.render(true, attachmentsContainer);
                });
            }
        }
    }
}

export default ChatMessageView;
