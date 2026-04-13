/**
 * AssistantContextChat - Scoped AI assistant chat for any model view
 *
 * Opens a single-conversation assistant chat in a Dialog, scoped to a specific
 * model instance via POST /api/assistant/context. The conversation_id is
 * persisted in the model's metadata for session resumption.
 *
 * Usage from any view:
 *   import { openAssistantChat } from '@ext/admin/assistant/AssistantContextChat.js';
 *   await openAssistantChat(this, 'incident.Ticket');
 */

import View from '@core/View.js';
import ChatView from '@core/views/chat/ChatView.js';
import { AssistantConversation } from '@core/models/Assistant.js';
import AssistantMessageView from './AssistantMessageView.js';
import AssistantView from './AssistantView.js';
import Dialog from '@core/views/feedback/Dialog.js';


// ── Adapter ────────────────────────────────────────────────

/**
 * ChatView adapter for context-scoped assistant conversations.
 * Implements the { fetch(), addNote() } interface expected by ChatView.
 */
class AssistantContextAdapter {
    constructor({ app, modelName, pk, conversationId }) {
        this.app = app;
        this.modelName = modelName;
        this.pk = pk;
        this.conversationId = conversationId;
        this._messageIdCounter = 0;
        this._onConversationCreated = null;
    }

    async fetch() {
        // Create or retrieve conversation on first fetch
        if (!this.conversationId) {
            try {
                const resp = await this.app.rest.post('/api/assistant/context', {
                    model: this.modelName,
                    pk: this.pk
                });
                const data = resp?.data?.data || resp?.data || resp;
                this.conversationId = data.conversation_id;
                if (this._onConversationCreated) {
                    this._onConversationCreated(this.conversationId);
                }
            } catch (_err) {
                return [];
            }
        }

        // Fetch conversation messages
        try {
            const conversation = new AssistantConversation({ id: this.conversationId });
            await conversation.fetch({ graph: 'detail' });
            const messages = conversation.get('messages') || [];
            const transformed = messages.map(msg => this._transformMessage(msg)).filter(Boolean);
            return AssistantView._collapseMessages(transformed);
        } catch (_err) {
            // Stale conversation — clear and retry once
            if (_err.status === 404 && this.conversationId && !this._fetchRetried) {
                this._fetchRetried = true;
                this.conversationId = null;
                return this.fetch();
            }
            return [];
        }
    }

    async addNote(data) {
        if (!data.text || !data.text.trim()) return { success: false };
        return { success: true };
    }

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

        // Parse embedded blocks from content if not provided
        if (blocks.length === 0 && content.includes('assistant_block')) {
            const BLOCK_RE = /```assistant_block\s*\n([\s\S]*?)```/g;
            const VALID_TYPES = new Set(['table', 'chart', 'stat', 'action', 'list', 'alert', 'progress', 'file']);
            let match;
            while ((match = BLOCK_RE.exec(content)) !== null) {
                try {
                    const block = JSON.parse(match[1].trim());
                    if (block && VALID_TYPES.has(block.type)) blocks.push(block);
                } catch (_e) { /* skip */ }
            }
            content = content.replace(BLOCK_RE, '').replace(/\n{3,}/g, '\n\n').trim();
        }

        return {
            id: msg.id,
            role: msg.role || 'user',
            author: msg.role === 'assistant'
                ? { name: 'Assistant' }
                : msg.author || {
                    name: msg.user?.display_name || this.app?.activeUser?.get('display_name') || 'You',
                    id: msg.user?.id || this.app?.activeUser?.id
                },
            content,
            timestamp: msg.created || msg.timestamp,
            blocks,
            tool_calls: toolCalls,
            _conversationId: this.conversationId
        };
    }
}


// ── Context Chat View ──────────────────────────────────────

/**
 * Self-contained assistant chat view with custom input and WebSocket streaming.
 * No conversation sidebar — always a single conversation.
 */
class AssistantContextChat extends View {
    constructor(options = {}) {
        super({
            className: 'assistant-context-chat',
            ...options
        });

        this.app = options.app;
        this.ws = this.app?.ws;
        this.adapter = options.adapter;
        this._wsHandlers = {};
        this._messageIdCounter = 0;
        this._activePlans = {};

        this.template = `
            <div class="d-flex flex-column h-100">
                <div class="flex-grow-1" style="min-height: 0;" data-container="chat-area"></div>
                <div class="assistant-input-wrapper border-top p-2">
                    <div class="assistant-input-status d-none" data-ref="input-status"></div>
                    <div class="d-flex gap-2 align-items-end">
                        <textarea class="form-control" placeholder="Ask the AI assistant..." rows="1" data-ref="input" style="resize: none; max-height: 150px;"></textarea>
                        <button class="btn btn-primary" data-action="send" type="button" data-ref="send-btn">
                            <i class="bi bi-arrow-up"></i>
                        </button>
                        <button class="btn btn-outline-danger d-none" data-action="stop" type="button" data-ref="stop-btn">
                            <i class="bi bi-stop-fill"></i>
                        </button>
                    </div>
                    <div class="d-flex align-items-center gap-2 mt-1">
                        <span class="assistant-connection-indicator" data-ref="status">
                            <span class="status-dot connected" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #198754;"></span>
                        </span>
                        <span class="text-muted small">Enter to send, Shift+Enter for new line</span>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        this.chatView = new ChatView({
            containerId: 'chat-area',
            theme: 'compact',
            messageViewClass: AssistantMessageView,
            currentUserId: this.app?.activeUser?.id,
            showFileInput: false,
            showInput: false,
            adapter: this.adapter
        });
        this.addChild(this.chatView);

        // Safety net: whenever an assistant message with content arrives,
        // re-enable input regardless of which path delivered it.
        const origAddMessage = this.chatView.addMessage.bind(this.chatView);
        this.chatView.addMessage = (msg, scroll) => {
            origAddMessage(msg, scroll);
            if (msg.role === 'assistant' && (msg.content || msg.blocks?.length)) {
                this.chatView.hideThinking();
                this._setInputEnabled(true);
            }
        };

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
    }

    // ── Input ────────────────────────────────────────────────

    _autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    _handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this._sendMessage();
        }
    }

    onActionSend() {
        this._sendMessage();
    }

    async _sendMessage() {
        const textarea = this.element.querySelector('[data-ref="input"]');
        if (!textarea) return;

        const text = textarea.value.trim();
        if (!text) return;

        // Clear input
        textarea.value = '';
        textarea.style.height = 'auto';

        // Ensure conversation exists
        if (!this.adapter.conversationId) {
            await this.adapter.fetch();
            if (!this.adapter.conversationId) {
                this.app?.toast?.error('Failed to create conversation');
                return;
            }
        }

        // Add user message to chat
        const userMsg = {
            id: `local-${++this._messageIdCounter}`,
            role: 'user',
            author: {
                id: this.app?.activeUser?.id,
                name: this.app?.activeUser?.get('display_name') || 'You'
            },
            content: text,
            timestamp: new Date().toISOString()
        };
        this.chatView.addMessage(userMsg);

        // Show thinking immediately — don't wait for server event
        this.chatView.showThinking('Thinking...');
        this._setInputEnabled(false, 'Waiting for response…');

        // Send via WebSocket or REST fallback
        if (this.ws && this.ws.isConnected) {
            this.ws.send({
                type: 'assistant_message',
                message: text,
                conversation_id: this.adapter.conversationId
            });
        } else {
            try {
                const resp = await this.app.rest.post('/api/assistant', {
                    message: text,
                    conversation_id: this.adapter.conversationId
                });
                const respData = resp?.data?.data || resp?.data || resp;
                if (respData.response) {
                    this.chatView.addMessage(this.adapter._transformMessage({
                        id: respData.message_id || `resp-${++this._messageIdCounter}`,
                        role: 'assistant',
                        content: respData.response,
                        blocks: respData.blocks || [],
                        created: new Date().toISOString()
                    }));
                }
                this._setInputEnabled(true);
            } catch (_err) {
                this.app?.toast?.error('Failed to send message');
                this._setInputEnabled(true);
            }
        }
    }

    onActionStop() {
        this.chatView.hideThinking();
        this._setInputEnabled(true);
        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();
    }

    _setInputEnabled(enabled, reason) {
        const textarea = this.element?.querySelector('[data-ref="input"]');
        const sendBtn = this.element?.querySelector('[data-ref="send-btn"]');
        const stopBtn = this.element?.querySelector('[data-ref="stop-btn"]');

        if (textarea) textarea.disabled = !enabled;
        if (sendBtn) sendBtn.classList.toggle('d-none', !enabled);
        if (stopBtn) stopBtn.classList.toggle('d-none', enabled);

        // Show/hide status bar with reason
        const statusEl = this.element?.querySelector('[data-ref="input-status"]');
        if (statusEl) {
            if (!enabled && reason) {
                const esc = (t) => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
                statusEl.innerHTML = `${esc(reason)} <span class="assistant-input-status-dismiss">Click to dismiss</span>`;
                statusEl.classList.remove('d-none');
                if (!statusEl._hasDismiss) {
                    statusEl._hasDismiss = true;
                    statusEl.addEventListener('click', () => {
                        this.chatView.hideThinking();
                        this._setInputEnabled(true);
                        const ta = this.element?.querySelector('[data-ref="input"]');
                        if (ta) ta.focus();
                    });
                }
            } else {
                statusEl.classList.add('d-none');
                statusEl.innerHTML = '';
            }
        }

        if (this._responseTimeout) clearTimeout(this._responseTimeout);
        if (!enabled) {
            this._responseTimeout = setTimeout(() => {
                this.chatView.hideThinking();
                this._setInputEnabled(true);
                this.app?.toast?.warning('Request timed out');
            }, 60000);
        }
    }

    // ── WebSocket ────────────────────────────────────────────

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
            disconnected: () => this._updateConnectionStatus()
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
        this._wsHandlers = {};
    }

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
        if (!this.adapter.conversationId) return true;
        return String(data.conversation_id) === String(this.adapter.conversationId);
    }

    _onThinking(data) {
        if (!this._isMyConversation(data)) return;
        this.chatView.showThinking('Thinking...');
        this._setInputEnabled(false, 'Assistant is thinking…');
    }

    _onToolCall(data) {
        if (!this._isMyConversation(data)) return;
        this.chatView.showThinking(`Using ${data.tool || data.name || 'tool'}...`);
        this._resetResponseTimeout();
    }

    /**
     * Reset the safety timeout without changing input enabled state.
     * @private
     */
    _resetResponseTimeout() {
        if (this._responseTimeout) {
            clearTimeout(this._responseTimeout);
            this._responseTimeout = setTimeout(() => {
                this.chatView.hideThinking();
                this._setInputEnabled(true);
                this.app?.toast?.warning('Request timed out');
            }, 60000);
        }
    }

    _onResponse(data) {
        if (!this._isMyConversation(data)) return;

        this.chatView.hideThinking();
        this._setInputEnabled(true);

        const textarea = this.element?.querySelector('[data-ref="input"]');
        if (textarea) textarea.focus();

        const msg = this.adapter._transformMessage({
            id: data.message_id || `resp-${++this._messageIdCounter}`,
            role: 'assistant',
            content: data.response || data.content || data.message || '',
            blocks: data.blocks || [],
            tool_calls: data.tool_calls_made || data.tool_calls || [],
            created: data.timestamp || new Date().toISOString()
        });

        // Skip empty messages (e.g. plan-only responses where all tool calls are internal)
        if (msg && (msg.content || msg.blocks?.length || msg.tool_calls?.length)) {
            this.chatView.addMessage(msg);
        }
    }

    _onError(data) {
        if (!this._isMyConversation(data)) return;

        this.chatView.hideThinking();
        this._setInputEnabled(true);

        console.error('[AssistantContextChat] WS error:', data.error || data.message);
        this.app?.toast?.error('The assistant encountered an error. Please try again.');
    }

    _onPlan(data) {
        if (!this._isMyConversation(data)) return;

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
            tool_calls: [],
            _conversationId: this.adapter.conversationId
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

    _updateConnectionStatus() {
        const dot = this.element?.querySelector('.status-dot');
        if (!dot) return;

        if (this.ws?.isConnected) {
            dot.style.background = '#198754';
            dot.title = 'Connected';
            // Re-enable input on reconnect if no pending request
            if (!this._responseTimeout) {
                this._setInputEnabled(true);
            } else {
                this._setInputEnabled(false, 'Waiting for response…');
            }
        } else {
            dot.style.background = '#dc3545';
            dot.title = 'Disconnected';
            // Disable input visually but don't start response timeout
            const textarea = this.element?.querySelector('[data-ref="input"]');
            const sendBtn = this.element?.querySelector('[data-ref="send-btn"]');
            if (textarea) textarea.disabled = true;
            if (sendBtn) sendBtn.classList.add('d-none');
            const statusEl = this.element?.querySelector('[data-ref="input-status"]');
            if (statusEl) {
                statusEl.textContent = 'Disconnected — reconnecting…';
                statusEl.classList.remove('d-none');
            }
        }
    }

    async onBeforeDestroy() {
        this._unsubscribeWS();
        if (this._responseTimeout) {
            clearTimeout(this._responseTimeout);
            this._responseTimeout = null;
        }
    }
}


// ── Helper ─────────────────────────────────────────────────

/**
 * Open a context-scoped assistant chat for any model view.
 *
 * @param {View} view - The calling view (must have this.model with metadata)
 * @param {string} modelName - Backend model name, e.g. 'incident.Ticket'
 */
async function openAssistantChat(view, modelName) {
    const app = view.getApp();
    if (!app) return;

    const model = view.model;
    const pk = model.get('id');
    const metadata = model.get('metadata') || {};
    const conversationId = metadata.assistant_conversation_id || null;

    const adapter = new AssistantContextAdapter({
        app,
        modelName,
        pk,
        conversationId
    });

    // Persist conversation_id on first creation
    adapter._onConversationCreated = async (newConversationId) => {
        try {
            await model.save({ metadata: { assistant_conversation_id: newConversationId } });
        } catch (_err) {
            // Non-fatal — chat still works, just won't resume next time
        }
    };

    const chatView = new AssistantContextChat({
        app,
        adapter
    });

    const dialog = new Dialog({
        header: true,
        title: 'AI Assistant',
        size: 'xl',
        body: chatView,
        buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
    });

    await dialog.render(true, document.body);
    dialog.show();
}


export { AssistantContextAdapter, AssistantContextChat, openAssistantChat };
export default AssistantContextChat;
