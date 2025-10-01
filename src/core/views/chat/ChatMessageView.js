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
        
        // Add theme-specific class
        if (this.theme === 'bubbles') {
            this.className += this.isCurrentUser ? ' message-right' : ' message-left';
        }
    }

    getTemplate() {
        // System event messages (same for both themes)
        if (this.message.type === 'system_event') {
            return `
                <div class="chat-message-system text-center text-muted small py-2">
                    <i class="bi bi-info-circle me-1"></i>
                    {{message.content}} on {{message.timestamp|datetime}}
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
        
        return `
            <div class="message-item">
                <div class="message-avatar ${userClass}">
                    {{#message.author.avatarUrl}}
                        <img src="{{message.author.avatarUrl}}" alt="{{message.author.name}}" class="w-100 h-100 rounded-circle">
                    {{/message.author.avatarUrl}}
                    {{^message.author.avatarUrl}}
                        {{message.author.name|initials}}
                    {{/message.author.avatarUrl}}
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <div class="message-author">
                            {{message.author.name}}
                            {{#isCurrentUser}}
                                <span class="badge bg-primary badge-sm ms-1">You</span>
                            {{/isCurrentUser}}
                        </div>
                        <div class="message-time text-muted">{{message.timestamp|relative}}</div>
                    </div>
                    <div class="message-text">{{{message.content}}}</div>
                    <div data-container="attachments"></div>
                </div>
            </div>
        `;
    }

    /**
     * Get bubbles theme template (Option 1 - Modern Chat Bubbles)
     */
    getBubblesTemplate() {
        return `
            <div class="message-bubble-wrapper">
                <div class="message-meta">
                    <strong>{{message.author.name}}</strong>
                    <span class="text-muted">· {{message.timestamp|relative}}</span>
                </div>
                <div class="message-bubble">
                    <div class="message-text">{{{message.content}}}</div>
                    <div data-container="attachments"></div>
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
