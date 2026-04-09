import View from '@core/View.js';
import ChatView from '@core/views/chat/ChatView.js';
import { AssistantConversation, AssistantConversationList } from '@core/models/Assistant.js';
import AssistantMessageView from './AssistantMessageView.js';
import AssistantConversationListView from './AssistantConversationListView.js';
import AssistantView from './AssistantView.js';

/**
 * AssistantPanelView - Chat-only sidebar panel for the admin assistant
 *
 * Compact layout for the right sidebar panel. No conversation list by default —
 * a hamburger toggle switches between chat and conversation history.
 *
 * Emits:
 *   panel:close — when the close button is clicked
 */
class AssistantPanelView extends View {
    constructor(options = {}) {
        super({
            className: 'assistant-panel-view',
            ...options
        });

        this.app = options.app;
        this.ws = this.app?.ws;
        this.conversationId = options.conversationId || this.app?._assistantConversationId || null;
        this._wsHandlers = {};
        this._messageIdCounter = 0;
        this._hasMessages = false;
        this._activePlans = {};
        this._requestStartTime = null;
        this._showingHistory = false;
    }

    getTemplate() {
        const userName = this._escapeHtml(
            this.app?.activeUser?.get('first_name') || 'there'
        );

        return `
            <div class="assistant-panel-layout">
                <div class="assistant-panel-header">
                    <button class="assistant-panel-header-btn" data-action="toggle-history" type="button" title="Conversation history">
                        <i class="bi bi-list"></i>
                    </button>
                    <span class="assistant-panel-title text-truncate" data-ref="panel-title">New conversation</span>
                    <div class="d-flex gap-1 ms-auto">
                        <button class="assistant-panel-header-btn" data-action="new-conversation" type="button" title="New conversation">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                        <button class="assistant-panel-header-btn" data-action="close-panel" type="button" title="Close">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                <div class="assistant-panel-history d-none" data-ref="history" data-container="conversation-list"></div>

                <div class="assistant-panel-chat" data-ref="chat-wrapper">
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
                            <span class="text-muted">Enter to send</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        // Conversation list for history panel
        this.conversations = new AssistantConversationList();
        this.conversations.params.user = this.app?.activeUser?.id;
        this.conversationListView = new AssistantConversationListView({
            containerId: 'conversation-list',
            collection: this.conversations
        });
        this.addChild(this.conversationListView);

        // Chat view
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

        // Safety net: re-enable input on assistant message
        const origAddMessage = this.chatView.addMessage.bind(this.chatView);
        this.chatView.addMessage = (msg, scroll) => {
            origAddMessage(msg, scroll);
            if (msg.role === 'assistant' && (msg.content || msg.blocks?.length)) {
                this.chatView.hideThinking();
                this._setInputEnabled(true);
            }
        };

        // Wire conversation list events
        this.conversationListView.on('conversation:select', (data) => {
            this._onConversationSelect(data);
            this._toggleHistory(false);
        });
        this.conversationListView.on('conversation:new', () => {
            this._onNewConversation();
            this._toggleHistory(false);
        });
        this.conversationListView.on('conversation:deleted', (data) => this._onConversationDeleted(data));

        // Load existing conversation if we have an ID
        if (this.conversationId) {
            this._showChatArea();
            await this.chatView.refresh();
        }

        this._subscribeWS();
    }

    async onAfterRender() {
        await super.onAfterRender();

        const textarea = this.element.querySelector('[data-ref="input"]');
        if (textarea) {
            textarea.addEventListener('input', () => this._autoResize(textarea));
            textarea.addEventListener('keydown', (e) => this._handleKeydown(e));
            setTimeout(() => textarea.focus(), 100);
        }

        this._updateConnectionStatus();
        this._updateTitle();
    }

    // ── Actions ──────────────────────────────────────────────

    onActionToggleHistory() {
        this._toggleHistory(!this._showingHistory);
    }

    onActionNewConversation() {
        this._onNewConversation();
        if (this._showingHistory) this._toggleHistory(false);
    }

    onActionClosePanel() {
        this.emit('panel:close');
    }

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

    onActionSend() {
        this._sendMessage();
    }

    onActionStop() {
        this.chatView.hideThinking();
        this._setInputEnabled(true);
        this._showSystemMessage('Response cancelled.');
        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();
    }

    // ── History Toggle ───────────────────────────────────────

    _toggleHistory(show) {
        this._showingHistory = show;
        const history = this.element?.querySelector('[data-ref="history"]');
        const chat = this.element?.querySelector('[data-ref="chat-wrapper"]');
        const toggleBtn = this.element?.querySelector('[data-action="toggle-history"] i');

        if (history) history.classList.toggle('d-none', !show);
        if (chat) chat.classList.toggle('d-none', show);
        if (toggleBtn) toggleBtn.className = show ? 'bi bi-chat-dots' : 'bi bi-list';

        if (show) {
            this.conversationListView.refresh();
        }
    }

    // ── Input Handling ───────────────────────────────────────

    _autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }

    _handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this._sendMessage();
        }
    }

    async _sendMessage() {
        const textarea = this.element.querySelector('[data-ref="input"]');
        if (!textarea) return;

        const text = textarea.value.trim();
        if (!text) return;

        textarea.value = '';
        textarea.style.height = 'auto';
        this._showChatArea();
        await this.chatView.adapter.addNote({ text, files: [] });
    }

    _showChatArea() {
        if (this._hasMessages) return;
        this._hasMessages = true;

        const welcome = this.element.querySelector('[data-ref="welcome"]');
        const chatArea = this.element.querySelector('[data-container="chat-area"]');
        if (welcome) welcome.classList.add('d-none');
        if (chatArea) chatArea.classList.remove('d-none');
    }

    _showWelcome() {
        this._hasMessages = false;

        const welcome = this.element.querySelector('[data-ref="welcome"]');
        const chatArea = this.element.querySelector('[data-container="chat-area"]');
        if (welcome) welcome.classList.remove('d-none');
        if (chatArea) chatArea.classList.add('d-none');
    }

    _setInputEnabled(enabled, reason) {
        const textarea = this.element?.querySelector('[data-ref="input"]');
        const sendBtn = this.element?.querySelector('[data-ref="send-btn"]');
        const stopBtn = this.element?.querySelector('[data-ref="stop-btn"]');

        if (textarea) textarea.disabled = !enabled;
        if (sendBtn) sendBtn.classList.toggle('d-none', !enabled);
        if (stopBtn) stopBtn.classList.toggle('d-none', enabled);

        this._setInputStatus(enabled ? null : reason);

        if (this._responseTimeout) clearTimeout(this._responseTimeout);
        if (!enabled) {
            this._responseTimeout = setTimeout(() => this._onResponseTimeout(), 60000);
        } else {
            this._requestStartTime = null;
        }
    }

    _setInputStatus(message) {
        const el = this.element?.querySelector('[data-ref="input-status"]');
        if (!el) return;
        if (message) {
            el.innerHTML = `${this._escapeHtml(message)} <span class="assistant-input-status-dismiss">Click to dismiss</span>`;
            el.classList.remove('d-none');
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

    _onResponseTimeout() {
        this._responseTimeout = null;
        this.chatView.hideThinking();
        this._setInputEnabled(true);
        this._showSystemMessage('Request timed out. Please try again.');
    }

    // ── Title ────────────────────────────────────────────────

    _updateTitle(title) {
        const el = this.element?.querySelector('[data-ref="panel-title"]');
        if (!el) return;
        el.textContent = title || (this.conversationId ? 'Assistant' : 'New conversation');
    }

    // ── Chat Adapter ─────────────────────────────────────────

    _createAdapter() {
        return {
            fetch: async () => {
                if (!this.conversationId) return [];
                try {
                    const conversation = new AssistantConversation({ id: this.conversationId });
                    await conversation.fetch({ graph: 'detail' });
                    const title = conversation.get('title') || conversation.get('summary');
                    if (title) this._updateTitle(title);
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

                this.chatView.showThinking('Thinking...');
                this._requestStartTime = Date.now();
                this._setInputEnabled(false, 'Waiting for response…');

                if (this.ws && this.ws.isConnected) {
                    this.ws.send({
                        type: 'assistant_message',
                        message: data.text,
                        conversation_id: this.conversationId
                    });
                } else {
                    try {
                        const resp = await this.app.rest.post('/api/assistant', {
                            message: data.text,
                            conversation_id: this.conversationId
                        });
                        const respData = resp?.data?.data || resp?.data || resp;
                        if (respData.conversation_id) {
                            this.conversationId = respData.conversation_id;
                            this.app._assistantConversationId = this.conversationId;
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

    // ── WebSocket Subscriptions ───────────────────────────────

    _subscribeWS() {
        if (!this.ws) return;

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

        this.ws.on('message:assistant_thinking', this._wsHandlers.thinking);
        this.ws.on('message:assistant_tool_call', this._wsHandlers.tool_call);
        this.ws.on('message:assistant_response', this._wsHandlers.response);
        this.ws.on('message:assistant_error', this._wsHandlers.error);
        this.ws.on('message:assistant_plan', this._wsHandlers.plan);
        this.ws.on('message:assistant_plan_update', this._wsHandlers.plan_update);
        this.ws.on('message:message', this._wsHandlers.message);
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

    // ── WS Event Handlers ────────────────────────────────────

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

    _isMyConversation(data) {
        if (!data.conversation_id) return true;
        if (!this.conversationId) return true;
        return String(data.conversation_id) === String(this.conversationId);
    }

    _adoptConversationId(data) {
        if (data.conversation_id && !this.conversationId) {
            this.conversationId = data.conversation_id;
            this.app._assistantConversationId = this.conversationId;
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
        this._resetResponseTimeout();
    }

    _resetResponseTimeout() {
        if (this._responseTimeout) {
            if (this._requestStartTime && (Date.now() - this._requestStartTime) >= 300000) {
                this._onResponseTimeout();
                return;
            }
            clearTimeout(this._responseTimeout);
            this._responseTimeout = setTimeout(() => this._onResponseTimeout(), 60000);
        }
    }

    _onResponse(data) {
        if (!this._isMyConversation(data)) return;

        this.chatView.hideThinking();
        this._setInputEnabled(true);
        this._adoptConversationId(data);

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

        if (msg && (msg.content || msg.blocks?.length || msg.tool_calls?.length)) {
            this.chatView.addMessage(msg);
        }
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

        const msgView = this.chatView.messageViews.get(`plan-${data.plan_id}`);
        if (msgView?.updateProgressStep) {
            msgView.updateProgressStep(data.plan_id, data.step_id, data.status, data.summary);
        }
        this._resetResponseTimeout();
    }

    // ── Conversation Management ──────────────────────────────

    async _onConversationSelect(data) {
        this.conversationId = data.id;
        this.app._assistantConversationId = this.conversationId;
        this.conversationListView.setActive(data.id);
        this._showChatArea();
        this._updateTitle(data.model?.get('title') || data.model?.get('summary'));
        await this.chatView.refresh();
    }

    _onNewConversation() {
        this.conversationId = null;
        this.app._assistantConversationId = null;
        this.conversationListView.setActive(null);
        this.chatView.clearMessages();
        this._setInputEnabled(true);
        this._showWelcome();
        this._updateTitle();

        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();
    }

    _onConversationDeleted(data) {
        if (String(data.id) === String(this.conversationId)) {
            this._onNewConversation();
        }
    }

    // ── Helpers ──────────────────────────────────────────────

    _transformMessage(msg) {
        if (msg.role === 'tool_result') return null;

        let content = msg.content || msg.text || '';
        let blocks = msg.blocks || [];
        let toolCalls = msg.tool_calls || [];

        if (toolCalls.length > 0) {
            const textParts = toolCalls
                .filter(tc => tc.type === 'text' && tc.text)
                .map(tc => tc.text);
            if (!content && textParts.length > 0) {
                content = textParts.join('\n\n');
            }
            toolCalls = toolCalls.filter(tc => tc.type === 'tool_use');
        }

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

    _updateConnectionStatus() {
        const dot = this.element?.querySelector('.status-dot');
        if (!dot) return;

        if (this.ws?.isConnected) {
            dot.className = 'status-dot connected';
            dot.title = 'Connected';
            if (!this._responseTimeout) {
                this._setInputEnabled(true);
            } else {
                this._setInputEnabled(false, 'Waiting for response…');
            }
        } else if (this.ws?.isReconnecting) {
            dot.className = 'status-dot reconnecting';
            dot.title = 'Reconnecting...';
            this._setInputEnabled(false, 'Reconnecting…');
            if (this._responseTimeout) {
                clearTimeout(this._responseTimeout);
                this._responseTimeout = null;
            }
        } else {
            dot.className = 'status-dot disconnected';
            dot.title = 'Disconnected';
            this._setInputEnabled(false, 'Disconnected — reconnecting…');
            if (this._responseTimeout) {
                clearTimeout(this._responseTimeout);
                this._responseTimeout = null;
            }
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Focus the input textarea — called externally when reopening the panel.
     */
    focusInput() {
        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();
    }

    async onBeforeDestroy() {
        this._unsubscribeWS();
        if (this._responseTimeout) {
            clearTimeout(this._responseTimeout);
            this._responseTimeout = null;
        }
    }
}

export default AssistantPanelView;
