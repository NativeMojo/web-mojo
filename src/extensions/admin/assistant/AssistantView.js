import View from '@core/View.js';
import ChatView from '@core/views/chat/ChatView.js';
import { AssistantConversation, AssistantConversationList } from '@core/models/Assistant.js';
import AssistantMessageView from './AssistantMessageView.js';
import AssistantConversationListView from './AssistantConversationListView.js';

/**
 * AssistantView - Main admin assistant interface
 *
 * Two-panel layout shown inside a fullscreen modal:
 * - Left: conversation list (REST-backed)
 * - Right: chat area with WebSocket real-time messaging
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
    }

    getTemplate() {
        return `
            <div class="assistant-layout">
                <div class="assistant-sidebar" data-container="conversation-list"></div>
                <div class="assistant-main">
                    <div class="assistant-status-bar">
                        <div class="assistant-connection-status">
                            <span class="status-dot"></span>
                            <span class="status-text text-muted small">Connected</span>
                        </div>
                    </div>
                    <div class="assistant-chat-area" data-container="chat-area"></div>
                </div>
            </div>
        `;
    }

    async onInit() {
        // Create conversation list
        this.conversations = new AssistantConversationList();

        this.conversationListView = new AssistantConversationListView({
            containerId: 'conversation-list',
            collection: this.conversations
        });
        this.addChild(this.conversationListView);

        // Create chat view with custom adapter
        this.chatView = new ChatView({
            containerId: 'chat-area',
            theme: 'compact',
            messageViewClass: AssistantMessageView,
            showFileInput: false,
            inputPlaceholder: 'Ask the assistant anything...',
            inputButtonText: 'Send',
            adapter: this._createAdapter()
        });
        this.addChild(this.chatView);

        // Wire conversation list events
        this.conversationListView.on('conversation:select', (data) => this._onConversationSelect(data));
        this.conversationListView.on('conversation:new', () => this._onNewConversation());
        this.conversationListView.on('conversation:deleted', (data) => this._onConversationDeleted(data));

        // Subscribe to WebSocket events
        this._subscribeWS();

        // Update connection status
        this._updateConnectionStatus();
    }

    /**
     * Create the chat adapter for WS-based messaging
     * @private
     */
    _createAdapter() {
        return {
            fetch: async () => {
                if (!this.conversationId) return [];
                try {
                    const conversation = new AssistantConversation({ id: this.conversationId });
                    await conversation.fetch();
                    const messages = conversation.get('messages') || [];
                    return messages.map(msg => this._transformMessage(msg));
                } catch (err) {
                    if (err.status === 404) {
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
                    } catch (err) {
                        this._handleAPIError(err);
                    }
                }

                // Input cleared by ChatView after addNote returns
                return { success: true };
            }
        };
    }

    /**
     * Subscribe to WebSocket assistant events
     * @private
     */
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

    /**
     * Unsubscribe from WebSocket events
     * @private
     */
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

    // ── WS Event Handlers ─────────────────────────────────

    _onThinking(data) {
        if (data.conversation_id && data.conversation_id !== this.conversationId) return;
        this.chatView.showThinking('Thinking...');
        this.chatView.setInputEnabled(false);
    }

    _onToolCall(data) {
        if (data.conversation_id && data.conversation_id !== this.conversationId) return;
        const toolName = data.tool || data.name || 'tool';
        this.chatView.showThinking(`Calling ${toolName}...`);
    }

    _onResponse(data) {
        if (data.conversation_id && data.conversation_id !== this.conversationId) return;

        this.chatView.hideThinking();
        this.chatView.setInputEnabled(true);

        // Update conversation ID if this is a new conversation
        if (data.conversation_id && !this.conversationId) {
            this.conversationId = data.conversation_id;
            this.conversationListView.refresh();
        }

        // Add assistant message
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
        this.chatView.setInputEnabled(true);

        const errorText = data.error || data.message || 'An error occurred';
        this._showSystemMessage(errorText);
    }

    // ── Conversation Management ───────────────────────────

    async _onConversationSelect(data) {
        this.conversationId = data.id;
        this.conversationListView.setActive(data.id);
        await this.chatView.refresh();
    }

    _onNewConversation() {
        this.conversationId = null;
        this.conversationListView.setActive(null);
        this.chatView.clearMessages();
        this.chatView.setInputEnabled(true);
    }

    _onConversationDeleted(data) {
        if (String(data.id) === String(this.conversationId)) {
            this._onNewConversation();
        }
    }

    // ── Helpers ───────────────────────────────────────────

    /**
     * Transform a backend message to ChatView format
     * @private
     */
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

    /**
     * Show a system message in the chat
     * @private
     */
    _showSystemMessage(text) {
        this.chatView.addMessage({
            id: `sys-${++this._messageIdCounter}`,
            type: 'system_event',
            content: text,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle REST API errors
     * @private
     */
    _handleAPIError(err) {
        if (err.status === 404) {
            this._showSystemMessage('Assistant is not enabled on this server.');
        } else if (err.status === 503) {
            this._showSystemMessage('LLM API key not configured. Contact your administrator.');
        } else {
            this._showSystemMessage('Failed to send message. Please try again.');
        }
        this.chatView.setInputEnabled(true);
    }

    /**
     * Update the connection status indicator
     * @private
     */
    _updateConnectionStatus() {
        const dot = this.element?.querySelector('.status-dot');
        const text = this.element?.querySelector('.status-text');
        if (!dot || !text) return;

        if (this.ws?.isConnected) {
            dot.className = 'status-dot connected';
            text.textContent = 'Connected';
            this.chatView?.setInputEnabled(true);
        } else if (this.ws?.isReconnecting) {
            dot.className = 'status-dot reconnecting';
            text.textContent = 'Reconnecting...';
        } else {
            dot.className = 'status-dot disconnected';
            text.textContent = 'Disconnected';
            this.chatView?.setInputEnabled(false);
        }
    }

    async onBeforeDestroy() {
        this._unsubscribeWS();
    }
}

export default AssistantView;
