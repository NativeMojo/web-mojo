import View from '@core/View.js';
import ChatMessageView from './ChatMessageView.js';
import ChatInputView from './ChatInputView.js';

/**
 * ChatView - Modern chat interface with theme support
 * 
 * Themes:
 * - 'compact' (default): Admin/activity feed style, list-based layout
 * - 'bubbles': Modern chat bubbles with left/right positioning
 * 
 * Usage:
 * const chat = new ChatView({
 *   adapter: myAdapter,
 *   theme: 'compact',  // or 'bubbles'
 *   currentUserId: 123,
 *   inputPlaceholder: 'Add a comment...',
 *   inputButtonText: 'Send'
 * });
 */
class ChatView extends View {
    constructor(options = {}) {
        super({
            className: 'chat-view',
            ...options
        });
        
        this.adapter = options.adapter;
        this.theme = options.theme || 'compact'; // 'compact' or 'bubbles'
        this.currentUserId = options.currentUserId;
        this.inputPlaceholder = options.inputPlaceholder || 'Type a message...';
        this.inputButtonText = options.inputButtonText || 'Send';
        this.messages = [];
        this.messageViews = new Map(); // Track message views by ID
    }

    getTemplate() {
        return `
            <div class="chat-container chat-theme-${this.theme}">
                <div class="chat-messages" data-container="messages"></div>
                <div class="chat-input-wrapper" data-container="input"></div>
            </div>
        `;
    }

    async onInit() {
        // Initial fetch of messages
        this.messages = await this.adapter.fetch();
        
        // Create input view
        this.inputView = new ChatInputView({
            containerId: 'input',
            placeholder: this.inputPlaceholder,
            buttonText: this.inputButtonText
        });
        this.addChild(this.inputView);
        
        // Listen for new messages
        this.inputView.on('message:send', async (data) => {
            await this.handleSendMessage(data);
        });
    }

    async onAfterRender() {
        // Build message views
        this._buildMessageViews();
        
        // Render children (like ListView does)
        await this._renderChildren();
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Render child message views (similar to ListView._renderChildren)
     * @private
     */
    async _renderChildren() {
        await super._renderChildren();
        const messagesContainer = this.element.querySelector('[data-container="messages"]');
        if (!messagesContainer) {
            console.error('ChatView: messages container not found');
            return;
        }
        
        // Append each message view to the container and render it
        this.messageViews.forEach((messageView) => {
            messagesContainer.appendChild(messageView.element);
            messageView.render(false);
        });
    }

    /**
     * Build message views for all messages (similar to ListView._buildItems)
     * @private
     */
    _buildMessageViews() {
        if (!this.messages || this.messages.length === 0) return;
        
        this.messages.forEach(message => {
            if (!this.messageViews.has(message.id)) {
                this._createMessageView(message);
            }
        });
    }

    /**
     * Create a message view (similar to ListView._createItemView)
     * @private
     */
    _createMessageView(message) {
        if (this.messageViews.has(message.id)) return;
        
        const isCurrentUser = message.author && message.author.id === this.currentUserId;
        
        const messageView = new ChatMessageView({
            message: message,
            theme: this.theme,
            isCurrentUser: isCurrentUser
        });
        
        this.addChild(messageView);
        this.messageViews.set(message.id, messageView);
        
        return messageView;
    }

    /**
     * Add a new message to the chat (for real-time updates)
     * @param {Object} message - Message data
     * @param {boolean} scroll - Whether to scroll to bottom after adding
     */
    addMessage(message, scroll = true) {
        if (this.messageViews.has(message.id)) return;
        
        const messageView = this._createMessageView(message);
        
        // If already rendered, append to DOM immediately
        if (this.isMounted()) {
            const messagesContainer = this.element.querySelector('[data-container="messages"]');
            if (messagesContainer) {
                messagesContainer.appendChild(messageView.element);
                messageView.render(false);
            }
        }
        
        if (scroll) {
            this.scrollToBottom();
        }
    }

    /**
     * Handle sending a new message
     * @param {Object} data - Message data {text, files}
     * @private
     */
    async handleSendMessage(data) {
        try {
            // If there's text, send it as a note
            if (data.text && data.text.trim()) {
                const result = await this.adapter.addNote({
                    text: data.text,
                    files: data.files && data.files.length > 0 ? [data.files[0]] : []
                });
                
                if (!result.success) {
                    throw new Error('Failed to send message');
                }
            }
            
            // If there are multiple files, or files without text, create a note for each
            const startIndex = (data.text && data.text.trim() && data.files.length > 0) ? 1 : 0;
            
            for (let i = startIndex; i < (data.files?.length || 0); i++) {
                const file = data.files[i];
                const result = await this.adapter.addNote({
                    text: '', // Empty text, just the file
                    files: [file]
                });
                
                if (!result.success) {
                    console.error('Failed to upload file:', file);
                }
            }
            
            // Fetch updated messages
            this.messages = await this.adapter.fetch();
            
            // Find the new message(s) and add them
            this.messages.forEach(message => {
                if (!this.messageViews.has(message.id)) {
                    this.addMessage(message, true);
                }
            });
            
            // Clear input (this also resets busy state)
            this.inputView.clearInput();
            
        } catch (error) {
            console.error('Failed to send message:', error);
            // Reset busy state on error
            this.inputView.setBusy(false);
            // TODO: Show error feedback to user
        }
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        const container = this.element.querySelector('.chat-messages');
        if (container) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.messageViews.forEach(view => view.destroy());
        this.messageViews.clear();
        this.messages = [];
        
        const container = this.element.querySelector('[data-container="messages"]');
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Refresh messages from adapter
     */
    async refresh() {
        this.clearMessages();
        this.messages = await this.adapter.fetch();
        this._buildMessageViews();
        
        if (this.isMounted()) {
            await this._renderChildren();
            this.scrollToBottom();
        }
    }
}

export default ChatView;
