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
        this._activePlans = {};
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
                        <div class="assistant-input-status d-none" data-ref="input-status"></div>
                        <div class="assistant-input-box">
                            <textarea class="assistant-input" placeholder="Message the assistant..." rows="1" data-ref="input"></textarea>
                            <button class="assistant-send-btn" data-action="send" type="button" title="Send message" data-ref="send-btn">
                                <i class="bi bi-arrow-up"></i>
                            </button>
                            <button class="assistant-stop-btn d-none" data-action="stop" type="button" title="Stop generating" data-ref="stop-btn">
                                <i class="bi bi-stop-fill"></i>
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
        // Conversation list — scoped to current user
        this.conversations = new AssistantConversationList();
        this.conversations.params.user = this.app?.activeUser?.id;
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
            currentUserId: this.app?.activeUser?.id,
            showFileInput: false,
            showInput: false,
            adapter: this._createAdapter()
        });
        this.addChild(this.chatView);

        // Safety net: whenever an assistant message is added to the chat
        // from any source (WS, fetch, etc.), re-enable input.
        const origAddMessage = this.chatView.addMessage.bind(this.chatView);
        this.chatView.addMessage = (msg, scroll) => {
            origAddMessage(msg, scroll);
            if (msg.role === 'assistant' && (msg.content || msg.blocks?.length)) {
                this.chatView.hideThinking();
                this._setInputEnabled(true);
            }
        };

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
     * Set input enabled/disabled state and toggle send/stop buttons
     * @private
     */
    _setInputEnabled(enabled, reason) {
        const textarea = this.element?.querySelector('[data-ref="input"]');
        const sendBtn = this.element?.querySelector('[data-ref="send-btn"]');
        const stopBtn = this.element?.querySelector('[data-ref="stop-btn"]');

        if (textarea) textarea.disabled = !enabled;

        // Toggle send/stop button visibility
        if (sendBtn) sendBtn.classList.toggle('d-none', !enabled);
        if (stopBtn) stopBtn.classList.toggle('d-none', enabled);

        // Show/hide status bar with reason
        this._setInputStatus(enabled ? null : reason);

        // Clear or set safety timeout
        if (this._responseTimeout) clearTimeout(this._responseTimeout);
        if (!enabled) {
            this._responseTimeout = setTimeout(() => this._onResponseTimeout(), 60000);
        }
    }

    /**
     * Show or hide the input status bar.
     * @param {string|null} message - Status text, or null to hide.
     * @private
     */
    _setInputStatus(message) {
        const el = this.element?.querySelector('[data-ref="input-status"]');
        if (!el) return;
        if (message) {
            el.innerHTML = `${this._escapeHtml(message)} <span class="assistant-input-status-dismiss">Click to dismiss</span>`;
            el.classList.remove('d-none');
            // Click to dismiss — escape hatch for stuck state
            if (!el._hasDismiss) {
                el._hasDismiss = true;
                el.addEventListener('click', () => {
                    this.chatView.hideThinking();
                    this._setInputEnabled(true);
                    const textarea = this.element?.querySelector('[data-ref="input"]');
                    if (textarea) textarea.focus();
                });
            }
        } else {
            el.classList.add('d-none');
            el.innerHTML = '';
        }
    }

    /**
     * Handle stop button click — abort waiting for response
     */
    onActionStop() {
        this.chatView.hideThinking();
        this._setInputEnabled(true);
        this._showSystemMessage('Response cancelled.');

        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();
    }

    /**
     * Safety timeout — re-enable input if server never responds
     * @private
     */
    _onResponseTimeout() {
        this._responseTimeout = null;
        this.chatView.hideThinking();
        this._setInputEnabled(true);
        this._showSystemMessage('Request timed out. Please try again.');
    }

    // ── Chat Adapter ─────────────────────────────────────

    _createAdapter() {
        return {
            fetch: async () => {
                if (!this.conversationId) return [];
                try {
                    const conversation = new AssistantConversation({ id: this.conversationId });
                    await conversation.fetch({ graph: 'detail' });
                    const messages = conversation.get('messages') || [];
                    const transformed = messages.map(msg => this._transformMessage(msg)).filter(Boolean);
                    return AssistantView._collapseMessages(transformed);
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

                // Show thinking immediately — don't wait for server event
                this.chatView.showThinking('Thinking...');
                this._setInputEnabled(false, 'Waiting for response…');

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

        // Server sends events two ways:
        // 1. Direct WS response: {"type":"assistant_thinking", ...}
        //    → WebSocketClient emits "message:assistant_thinking"
        // 2. Background thread via send_to_user: {"type":"message","data":{"type":"assistant_*",...}}
        //    → WebSocketClient emits "message:message"
        this._wsHandlers = {
            thinking: (data) => this._onThinking(data),
            tool_call: (data) => this._onToolCall(data),
            response: (data) => this._onResponse(data),
            error: (data) => this._onError(data),
            plan: (data) => this._onPlan(data),
            plan_update: (data) => this._onPlanUpdate(data),
            message: (envelope) => this._dispatchWSMessage(envelope),
            connected: () => this._updateConnectionStatus(),
            disconnected: () => this._updateConnectionStatus(),
            reconnecting: () => this._updateConnectionStatus()
        };

        // Direct events (from WS handler return)
        this.ws.on('message:assistant_thinking', this._wsHandlers.thinking);
        this.ws.on('message:assistant_tool_call', this._wsHandlers.tool_call);
        this.ws.on('message:assistant_response', this._wsHandlers.response);
        this.ws.on('message:assistant_error', this._wsHandlers.error);
        this.ws.on('message:assistant_plan', this._wsHandlers.plan);
        this.ws.on('message:assistant_plan_update', this._wsHandlers.plan_update);
        // Wrapped events (from background thread via send_to_user)
        this.ws.on('message:message', this._wsHandlers.message);
        // Connection status
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
        this.ws.off('message:assistant_plan', this._wsHandlers.plan);
        this.ws.off('message:assistant_plan_update', this._wsHandlers.plan_update);
        this.ws.off('message:message', this._wsHandlers.message);
        this.ws.off('connected', this._wsHandlers.connected);
        this.ws.off('disconnected', this._wsHandlers.disconnected);
        this.ws.off('reconnecting', this._wsHandlers.reconnecting);

        this._wsHandlers = {};
    }

    // ── WS Event Handlers ────────────────────────────────

    /**
     * Dispatch an incoming WS message envelope to the correct handler.
     * Envelope shape: { type: "message", data: { type: "assistant_*", ... }, timestamp }
     * @private
     */
    _dispatchWSMessage(envelope) {
        const inner = envelope?.data;
        if (!inner?.type) return;

        switch (inner.type) {
            case 'assistant_thinking':    this._onThinking(inner); break;
            case 'assistant_tool_call':   this._onToolCall(inner); break;
            case 'assistant_response':    this._onResponse(inner); break;
            case 'assistant_error':       this._onError(inner); break;
            case 'assistant_plan':        this._onPlan(inner); break;
            case 'assistant_plan_update': this._onPlanUpdate(inner); break;
        }
    }

    /**
     * Check if a WS event belongs to this view's conversation.
     * Accept if: no conversation_id on event, or matches ours, or we have none yet (new conversation).
     * @private
     */
    _isMyConversation(data) {
        if (!data.conversation_id) return true;
        if (!this.conversationId) return true; // new conversation — accept server-assigned ID
        return String(data.conversation_id) === String(this.conversationId);
    }

    /**
     * Adopt a conversation ID from a WS event if we don't have one yet.
     * @private
     */
    _adoptConversationId(data) {
        if (data.conversation_id && !this.conversationId) {
            this.conversationId = data.conversation_id;
            this.conversationListView.refresh();
        }
    }

    _onThinking(data) {
        if (!this._isMyConversation(data)) return;
        this._adoptConversationId(data);
        this._showChatArea();
        this.chatView.showThinking('Thinking...');
        this._setInputEnabled(false, 'Assistant is thinking…');
    }

    _onToolCall(data) {
        if (!this._isMyConversation(data)) return;
        this.chatView.showThinking(`Using ${data.tool || data.name || 'tool'}...`);
        // Reset the safety timeout — server is still working
        this._resetResponseTimeout();
    }

    /**
     * Reset the safety timeout without changing input enabled state.
     * Called on intermediate events (tool_call, plan_update) to prevent
     * false "Request timed out" while the server is still processing.
     * @private
     */
    _resetResponseTimeout() {
        if (this._responseTimeout) {
            clearTimeout(this._responseTimeout);
            this._responseTimeout = setTimeout(() => this._onResponseTimeout(), 60000);
        }
    }

    _onResponse(data) {
        if (!this._isMyConversation(data)) return;

        this.chatView.hideThinking();
        this._setInputEnabled(true);
        this._adoptConversationId(data);

        // Focus input after response
        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();

        const msg = this._transformMessage({
            id: data.message_id || `resp-${++this._messageIdCounter}`,
            role: 'assistant',
            content: data.response || data.content || data.message || '',
            blocks: data.blocks || [],
            tool_calls: data.tool_calls_made || data.tool_calls || [],
            created: data.timestamp || new Date().toISOString()
        });
        this.chatView.addMessage(msg);
    }

    _onError(data) {
        if (!this._isMyConversation(data)) return;

        this.chatView.hideThinking();
        this._setInputEnabled(true);
        this._adoptConversationId(data);

        const errorText = data.error || data.message || 'An error occurred';
        this._showSystemMessage(errorText);
    }

    _onPlan(data) {
        if (!this._isMyConversation(data)) return;
        this._adoptConversationId(data);
        this._showChatArea();

        const plan = data.plan;
        if (!plan) return;

        this._activePlans[plan.plan_id] = plan;

        // Add as a message with a progress block
        this.chatView.addMessage({
            id: `plan-${plan.plan_id}`,
            role: 'assistant',
            author: { name: 'Assistant' },
            content: '',
            timestamp: new Date().toISOString(),
            blocks: [{ type: 'progress', ...plan }],
            tool_calls: []
        });
    }

    _onPlanUpdate(data) {
        if (!this._isMyConversation(data)) return;

        const plan = this._activePlans[data.plan_id];
        if (plan) {
            const step = plan.steps.find(s => s.id === data.step_id);
            if (step) {
                step.status = data.status;
                step.summary = data.summary;
            }
        }

        // Update the rendered step in-place
        const msgView = this.chatView.messageViews.get(`plan-${data.plan_id}`);
        if (msgView?.updateProgressStep) {
            msgView.updateProgressStep(data.plan_id, data.step_id, data.status, data.summary);
        }
        this._resetResponseTimeout();
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
        // Skip tool_result messages — they are internal API artifacts
        if (msg.role === 'tool_result') return null;

        let content = msg.content || msg.text || '';
        let blocks = msg.blocks || [];
        let toolCalls = msg.tool_calls || [];

        // Extract thinking text from tool_call entries and separate tool_use entries
        if (toolCalls.length > 0) {
            const textParts = toolCalls
                .filter(tc => tc.type === 'text' && tc.text)
                .map(tc => tc.text);
            if (!content && textParts.length > 0) {
                content = textParts.join('\n\n');
            }
            toolCalls = toolCalls.filter(tc => tc.type === 'tool_use');
        }

        // Safety net: parse blocks from content if API didn't return them
        // (e.g. WS events or older API responses that still embed fences).
        if (blocks.length === 0 && content.includes('assistant_block')) {
            const parsed = AssistantView._parseBlocks(content);
            content = parsed.content;
            blocks = parsed.blocks;
        }

        const currentUserId = this.app?.activeUser?.id;

        return {
            id: msg.id,
            role: msg.role || 'user',
            author: msg.role === 'assistant'
                ? { name: 'Assistant' }
                : msg.author || {
                    name: msg.user?.display_name || this.app?.activeUser?.get('display_name') || 'You',
                    id: msg.user?.id || currentUserId
                },
            content,
            timestamp: msg.created || msg.timestamp,
            blocks,
            tool_calls: toolCalls,
            _conversationId: this.conversationId
        };
    }

    /**
     * Post-process transformed messages to reduce noise:
     * 1. Strip internal orchestration tool calls (create_plan, update_plan, load_tools)
     * 2. Drop messages that become empty after stripping
     * 3. Merge consecutive tool-call-only assistant messages into one
     * @static
     */
    static _collapseMessages(messages) {
        const INTERNAL_TOOLS = new Set(['create_plan', 'update_plan', 'load_tools']);
        const result = [];

        for (const msg of messages) {
            // Only process assistant messages with tool_calls
            if (msg.role === 'assistant' && msg.tool_calls?.length > 0) {
                msg.tool_calls = msg.tool_calls.filter(tc => !INTERNAL_TOOLS.has(tc.name));
            }

            const hasContent = !!msg.content;
            const hasTools = msg.tool_calls?.length > 0;
            const hasBlocks = msg.blocks?.length > 0;

            // Skip empty assistant messages (no content, no tools, no blocks)
            if (msg.role === 'assistant' && !hasContent && !hasTools && !hasBlocks) {
                continue;
            }

            // Merge consecutive tool-call-only assistant messages
            if (msg.role === 'assistant' && !hasContent && hasTools && !hasBlocks) {
                const prev = result[result.length - 1];
                if (prev?.role === 'assistant' && !prev.content && prev.tool_calls?.length > 0 && !prev.blocks?.length) {
                    prev.tool_calls = [...prev.tool_calls, ...msg.tool_calls];
                    continue;
                }
            }

            result.push(msg);
        }

        return result;
    }

    /**
     * Parse assistant_block fences from message content.
     * Mirrors the server-side _parse_blocks() logic.
     * @static
     */
    static _parseBlocks(text) {
        const BLOCK_RE = /```assistant_block\s*\n([\s\S]*?)```/g;
        const VALID_TYPES = new Set(['table', 'chart', 'stat', 'action', 'list', 'alert', 'progress']);
        const blocks = [];
        let match;

        while ((match = BLOCK_RE.exec(text)) !== null) {
            try {
                const block = JSON.parse(match[1].trim());
                if (block && VALID_TYPES.has(block.type)) {
                    blocks.push(block);
                }
            } catch (_e) {
                // Skip malformed blocks
            }
        }

        const content = text.replace(BLOCK_RE, '').replace(/\n{3,}/g, '\n\n').trim();
        return { content, blocks };
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
            // Re-enable input on reconnect if no pending request
            if (!this._responseTimeout) {
                this._setInputEnabled(true);
            } else {
                // Still waiting — clear the disconnect message, keep the request status
                this._setInputStatus('Waiting for response…');
            }
        } else if (this.ws?.isReconnecting) {
            dot.className = 'status-dot reconnecting';
            dot.title = 'Reconnecting...';
        } else {
            dot.className = 'status-dot disconnected';
            dot.title = 'Disconnected';
            // Disable input visually but do NOT start the response timeout —
            // the timeout is only for pending message requests, not connection state.
            const textarea = this.element?.querySelector('[data-ref="input"]');
            const sendBtn = this.element?.querySelector('[data-ref="send-btn"]');
            if (textarea) textarea.disabled = true;
            if (sendBtn) sendBtn.classList.add('d-none');
            this._setInputStatus('Disconnected — reconnecting…');
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async onBeforeDestroy() {
        this._unsubscribeWS();
        if (this._responseTimeout) {
            clearTimeout(this._responseTimeout);
            this._responseTimeout = null;
        }
    }
}

export default AssistantView;
