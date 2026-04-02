import View from '@core/View.js';
import ChatView from '@core/views/chat/ChatView.js';
import { AssistantConversation, AssistantConversationList } from '@core/models/Assistant.js';
import AssistantMessageView from './AssistantMessageView.js';
import AssistantConversationListView from './AssistantConversationListView.js';

/**
 * AssistantView - Polished admin assistant chat interface
 *
 * Two-panel layout shown inside a fullscreen modal:
 * - Left: conversation history sidebar
 * - Right: chat area with welcome state, messages, and prominent input
 *
 * WS events: assistant_thinking, assistant_tool_call, assistant_response, assistant_error
 */
class AssistantView extends View {
    constructor(options = {}) {
        super({
            className: 'assistant-view',
            ...options
        });

        this.app = options.app;
        this.ws = this.app?.ws;
        this.conversationId = null;
        this._wsHandlers = {};
        this._messageIdCounter = 0;
        this._hasMessages = false;
    }

    getTemplate() {
        const userName = this._escapeHtml(
            this.app?.activeUser?.get('first_name') || 'there'
        );

        return `
            <div class="assistant-layout">
                <div class="assistant-sidebar" data-container="conversation-list"></div>
                <div class="assistant-main">
                    <div class="assistant-welcome" data-ref="welcome">
                        <div class="assistant-welcome-content">
                            <div class="assistant-welcome-icon">
                                <i class="bi bi-stars"></i>
                            </div>
                            <h3 class="assistant-welcome-title">Hi ${userName}</h3>
                            <p class="assistant-welcome-subtitle">How can I help you today?</p>
                            <div class="assistant-suggestions">
                                <button class="assistant-suggestion" data-action="use-suggestion" data-text="Show me a summary of recent activity">
                                    <i class="bi bi-activity"></i>
                                    <span>Recent activity summary</span>
                                </button>
                                <button class="assistant-suggestion" data-action="use-suggestion" data-text="How many active users are there?">
                                    <i class="bi bi-people"></i>
                                    <span>Active user count</span>
                                </button>
                                <button class="assistant-suggestion" data-action="use-suggestion" data-text="Show me system health metrics">
                                    <i class="bi bi-heart-pulse"></i>
                                    <span>System health check</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="assistant-chat-area" data-container="chat-area"></div>
                    <div class="assistant-input-wrapper">
                        <div class="assistant-input-box">
                            <textarea class="assistant-input" placeholder="Message the assistant..." rows="1" data-ref="input"></textarea>
                            <button class="assistant-send-btn" data-action="send" type="button" title="Send message">
                                <i class="bi bi-arrow-up"></i>
                            </button>
                        </div>
                        <div class="assistant-input-footer">
                            <span class="assistant-connection-indicator" data-ref="status">
                                <span class="status-dot connected"></span>
                            </span>
                            <span class="text-muted">Press Enter to send, Shift+Enter for new line</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        // Conversation list
        this.conversations = new AssistantConversationList();
        this.conversationListView = new AssistantConversationListView({
            containerId: 'conversation-list',
            collection: this.conversations
        });
        this.addChild(this.conversationListView);

        // Chat view — input hidden, we use our own
        this.chatView = new ChatView({
            containerId: 'chat-area',
            theme: 'compact',
            messageViewClass: AssistantMessageView,
            showFileInput: false,
            showInput: false,
            adapter: this._createAdapter()
        });
        this.addChild(this.chatView);

        // Wire conversation list events
        this.conversationListView.on('conversation:select', (data) => this._onConversationSelect(data));
        this.conversationListView.on('conversation:new', () => this._onNewConversation());
        this.conversationListView.on('conversation:deleted', (data) => this._onConversationDeleted(data));

        // Subscribe to WS events
        this._subscribeWS();
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Setup our custom input
        const textarea = this.element.querySelector('[data-ref="input"]');
        if (textarea) {
            textarea.addEventListener('input', () => this._autoResize(textarea));
            textarea.addEventListener('keydown', (e) => this._handleKeydown(e));
            // Focus the input
            setTimeout(() => textarea.focus(), 100);
        }

        this._updateConnectionStatus();
    }

    // ── Custom Input Handling ─────────────────────────────

    /**
     * Auto-resize textarea to fit content
     * @private
     */
    _autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }

    /**
     * Handle keydown: Enter sends, Shift+Enter adds newline
     * @private
     */
    _handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this._sendMessage();
        }
    }

    /**
     * Handle suggestion button clicks
     */
    onActionUseSuggestion(_event, element) {
        const text = element.dataset.text || element.closest('[data-text]')?.dataset.text;
        if (!text) return;

        const textarea = this.element.querySelector('[data-ref="input"]');
        if (textarea) {
            textarea.value = text;
            this._autoResize(textarea);
        }
        this._sendMessage();
    }

    /**
     * Handle send button click
     */
    onActionSend() {
        this._sendMessage();
    }

    /**
     * Send the current input text
     * @private
     */
    async _sendMessage() {
        const textarea = this.element.querySelector('[data-ref="input"]');
        if (!textarea) return;

        const text = textarea.value.trim();
        if (!text) return;

        // Clear input immediately
        textarea.value = '';
        textarea.style.height = 'auto';

        // Show chat area, hide welcome
        this._showChatArea();

        // Send through adapter
        await this.chatView.adapter.addNote({ text, files: [] });
    }

    /**
     * Show chat area and hide welcome screen
     * @private
     */
    _showChatArea() {
        if (this._hasMessages) return;
        this._hasMessages = true;

        const welcome = this.element.querySelector('[data-ref="welcome"]');
        const chatArea = this.element.querySelector('[data-container="chat-area"]');
        if (welcome) welcome.classList.add('d-none');
        if (chatArea) chatArea.classList.remove('d-none');
    }

    /**
     * Show welcome screen and hide chat area
     * @private
     */
    _showWelcome() {
        this._hasMessages = false;

        const welcome = this.element.querySelector('[data-ref="welcome"]');
        const chatArea = this.element.querySelector('[data-container="chat-area"]');
        if (welcome) welcome.classList.remove('d-none');
        if (chatArea) chatArea.classList.add('d-none');
    }

    /**
     * Set input enabled/disabled state
     * @private
     */
    _setInputEnabled(enabled) {
        const textarea = this.element?.querySelector('[data-ref="input"]');
        const button = this.element?.querySelector('[data-action="send"]');
        if (textarea) textarea.disabled = !enabled;
        if (button) button.disabled = !enabled;
    }

    // ── Chat Adapter ─────────────────────────────────────

    _createAdapter() {
        return {
            fetch: async () => {
                if (!this.conversationId) return [];
                try {
                    const conversation = new AssistantConversation({ id: this.conversationId });
                    await conversation.fetch();
                    const messages = conversation.get('messages') || [];
                    return messages.map(msg => this._transformMessage(msg));
                } catch (_err) {
                    if (_err.status === 404) {
                        this._onNewConversation();
                        this._showSystemMessage('Conversation not found.');
                    }
                    return [];
                }
            },
            addNote: async (data) => {
                if (!data.text || !data.text.trim()) return { success: false };

                // Add user message to chat immediately
                const userMsg = {
                    id: `local-${++this._messageIdCounter}`,
                    role: 'user',
                    author: {
                        id: this.app?.activeUser?.id,
                        name: this.app?.activeUser?.get('display_name') || 'You'
                    },
                    content: data.text,
                    timestamp: new Date().toISOString()
                };
                this.chatView.addMessage(userMsg);

                // Disable input while waiting for response
                this._setInputEnabled(false);

                // Send via WebSocket
                if (this.ws && this.ws.isConnected) {
                    this.ws.send({
                        type: 'assistant_message',
                        message: data.text,
                        conversation_id: this.conversationId
                    });
                } else {
                    // Fallback: REST POST
                    try {
                        const resp = await this.app.rest.post('/api/assistant', {
                            message: data.text,
                            conversation_id: this.conversationId
                        });
                        const respData = resp?.data?.data || resp?.data || resp;
                        if (respData.conversation_id) {
                            this.conversationId = respData.conversation_id;
                        }
                        if (respData.response) {
                            this.chatView.addMessage(this._transformMessage(respData.response));
                        }
                        this._setInputEnabled(true);
                    } catch (_err) {
                        this._handleAPIError(_err);
                    }
                }

                return { success: true };
            }
        };
    }

    // ── WebSocket Subscriptions ───────────────────────────

    _subscribeWS() {
        if (!this.ws) return;

        this._wsHandlers = {
            thinking: (data) => this._onThinking(data),
            tool_call: (data) => this._onToolCall(data),
            response: (data) => this._onResponse(data),
            error: (data) => this._onError(data),
            connected: () => this._updateConnectionStatus(),
            disconnected: () => this._updateConnectionStatus(),
            reconnecting: () => this._updateConnectionStatus()
        };

        this.ws.on('message:assistant_thinking', this._wsHandlers.thinking);
        this.ws.on('message:assistant_tool_call', this._wsHandlers.tool_call);
        this.ws.on('message:assistant_response', this._wsHandlers.response);
        this.ws.on('message:assistant_error', this._wsHandlers.error);
        this.ws.on('connected', this._wsHandlers.connected);
        this.ws.on('disconnected', this._wsHandlers.disconnected);
        this.ws.on('reconnecting', this._wsHandlers.reconnecting);
    }

    _unsubscribeWS() {
        if (!this.ws || !this._wsHandlers) return;

        this.ws.off('message:assistant_thinking', this._wsHandlers.thinking);
        this.ws.off('message:assistant_tool_call', this._wsHandlers.tool_call);
        this.ws.off('message:assistant_response', this._wsHandlers.response);
        this.ws.off('message:assistant_error', this._wsHandlers.error);
        this.ws.off('connected', this._wsHandlers.connected);
        this.ws.off('disconnected', this._wsHandlers.disconnected);
        this.ws.off('reconnecting', this._wsHandlers.reconnecting);

        this._wsHandlers = {};
    }

    // ── WS Event Handlers ────────────────────────────────

    _onThinking(data) {
        if (data.conversation_id && data.conversation_id !== this.conversationId) return;
        this._showChatArea();
        this.chatView.showThinking('Thinking...');
        this._setInputEnabled(false);
    }

    _onToolCall(data) {
        if (data.conversation_id && data.conversation_id !== this.conversationId) return;
        this.chatView.showThinking(`Using ${data.tool || data.name || 'tool'}...`);
    }

    _onResponse(data) {
        if (data.conversation_id && data.conversation_id !== this.conversationId) return;

        this.chatView.hideThinking();
        this._setInputEnabled(true);

        // Focus input after response
        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();

        // Set conversation ID if this is a new conversation
        if (data.conversation_id && !this.conversationId) {
            this.conversationId = data.conversation_id;
            this.conversationListView.refresh();
        }

        const msg = this._transformMessage({
            id: data.message_id || `resp-${++this._messageIdCounter}`,
            role: 'assistant',
            content: data.content || data.message || '',
            blocks: data.blocks || [],
            tool_calls: data.tool_calls || [],
            created: data.timestamp || new Date().toISOString()
        });
        this.chatView.addMessage(msg);
    }

    _onError(data) {
        if (data.conversation_id && data.conversation_id !== this.conversationId) return;

        this.chatView.hideThinking();
        this._setInputEnabled(true);

        const errorText = data.error || data.message || 'An error occurred';
        this._showSystemMessage(errorText);
    }

    // ── Conversation Management ──────────────────────────

    async _onConversationSelect(data) {
        this.conversationId = data.id;
        this.conversationListView.setActive(data.id);
        this._showChatArea();
        await this.chatView.refresh();
    }

    _onNewConversation() {
        this.conversationId = null;
        this.conversationListView.setActive(null);
        this.chatView.clearMessages();
        this._setInputEnabled(true);
        this._showWelcome();

        // Focus input
        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();
    }

    _onConversationDeleted(data) {
        if (String(data.id) === String(this.conversationId)) {
            this._onNewConversation();
        }
    }

    // ── Helpers ──────────────────────────────────────────

    _transformMessage(msg) {
        return {
            id: msg.id,
            role: msg.role || 'user',
            author: msg.role === 'assistant'
                ? { name: 'Assistant' }
                : msg.author || { name: msg.user?.display_name || 'You', id: msg.user?.id },
            content: msg.content || msg.text || '',
            timestamp: msg.created || msg.timestamp,
            blocks: msg.blocks || [],
            tool_calls: msg.tool_calls || []
        };
    }

    _showSystemMessage(text) {
        this._showChatArea();
        this.chatView.addMessage({
            id: `sys-${++this._messageIdCounter}`,
            type: 'system_event',
            content: text,
            timestamp: new Date().toISOString()
        });
    }

    _handleAPIError(_err) {
        if (_err.status === 404) {
            this._showSystemMessage('Assistant is not enabled on this server.');
        } else if (_err.status === 503) {
            this._showSystemMessage('LLM API key not configured. Contact your administrator.');
        } else {
            this._showSystemMessage('Failed to send message. Please try again.');
        }
        this._setInputEnabled(true);
    }

    /**
     * Update the connection status indicator
     * @private
     */
    _updateConnectionStatus() {
        const dot = this.element?.querySelector('.status-dot');
        if (!dot) return;

        if (this.ws?.isConnected) {
            dot.className = 'status-dot connected';
            dot.title = 'Connected';
        } else if (this.ws?.isReconnecting) {
            dot.className = 'status-dot reconnecting';
            dot.title = 'Reconnecting...';
        } else {
            dot.className = 'status-dot disconnected';
            dot.title = 'Disconnected';
            this._setInputEnabled(false);
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async onBeforeDestroy() {
        this._unsubscribeWS();
    }
}

export default AssistantView;
