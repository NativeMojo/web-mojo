/**
 * AssistantConversationView - Detail view for a conversation's message history
 *
 * Displays the full message thread using ChatView with AssistantMessageView
 * for rendering structured blocks (tables, charts, stats, etc.).
 */

import View from '@core/View.js';
import ChatView from '@core/views/chat/ChatView.js';
import { AssistantConversation } from '@core/models/Assistant.js';
import AssistantMessageView from './AssistantMessageView.js';
import Dialog from '@core/views/feedback/Dialog.js';

class AssistantConversationView extends View {
    constructor(options = {}) {
        super({
            className: 'assistant-conversation-view',
            ...options
        });

        this.model = options.model || new AssistantConversation(options.data || {});

        this.template = `
            <div class="d-flex flex-column h-100">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-3 flex-shrink-0">
                    <div class="flex-grow-1" style="min-width: 0;">
                        <h4 class="mb-1 text-truncate">{{model.title}}</h4>
                        <div class="text-muted small d-flex align-items-center gap-3 flex-wrap">
                            <span><i class="bi bi-hash me-1"></i>Conversation #{{model.id}}</span>
                            {{#model.created}}
                                <span><i class="bi bi-clock me-1"></i>{{model.created|relative}}</span>
                            {{/model.created}}
                            {{#model.modified}}
                                <span><i class="bi bi-pencil me-1"></i>Last active {{model.modified|relative}}</span>
                            {{/model.modified}}
                            {{#messageCount}}
                                <span><i class="bi bi-chat-left-text me-1"></i>{{messageCount}} messages</span>
                            {{/messageCount}}
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <button class="btn btn-outline-danger btn-sm" data-action="delete-conversation">
                            <i class="bi bi-trash me-1"></i>Delete
                        </button>
                    </div>
                </div>

                <!-- Messages -->
                <div class="flex-grow-1 border rounded" style="min-height: 200px;" data-container="chat-view"></div>
            </div>
        `;
    }

    async onInit() {
        // Fetch full message history
        try {
            await this.model.fetch({ params: { graph: 'detail' } });
        } catch (_e) {
            // Use whatever data we have
        }

        const messages = this.model.get('messages') || [];
        this.messageCount = messages.length;

        // Build adapter that returns the already-fetched messages
        const currentUserId = window.app?.state?.user?.id;
        const transformedMessages = messages
            .filter(msg => msg.role !== 'tool_result')
            .map(msg => this._transformMessage(msg, currentUserId));

        this.chatView = new ChatView({
            containerId: 'chat-view',
            theme: 'compact',
            messageViewClass: AssistantMessageView,
            currentUserId,
            showInput: false,
            showFileInput: false,
            adapter: {
                fetch: async () => transformedMessages,
                addNote: async () => ({ success: false })
            }
        });
        this.addChild(this.chatView);
    }

    _transformMessage(msg, currentUserId) {
        let content = msg.content || '';
        let blocks = msg.blocks || [];
        let toolCalls = msg.tool_calls || [];

        // Extract text from tool_call entries
        if (toolCalls.length > 0) {
            const textParts = toolCalls
                .filter(tc => tc.type === 'text' && tc.text)
                .map(tc => tc.text);
            if (!content && textParts.length > 0) {
                content = textParts.join('\n\n');
            }
            toolCalls = toolCalls.filter(tc => tc.type === 'tool_use');
        }

        return {
            id: msg.id,
            role: msg.role || 'user',
            author: msg.role === 'assistant'
                ? { name: 'Assistant' }
                : { name: 'You', id: currentUserId },
            content,
            timestamp: msg.created,
            blocks,
            tool_calls: toolCalls
        };
    }

    async onActionDeleteConversation() {
        const confirmed = await Dialog.confirm(
            `Delete this conversation? This cannot be undone.`,
            'Delete Conversation',
            { confirmText: 'Delete', confirmClass: 'btn-danger' }
        );
        if (!confirmed) return;

        try {
            await this.model.destroy();
            this.getApp()?.toast?.success('Conversation deleted');
            this.emit('item:deleted', { id: this.model.get('id') });
        } catch (_e) {
            this.getApp()?.toast?.error('Failed to delete conversation');
        }
    }
}

export default AssistantConversationView;
