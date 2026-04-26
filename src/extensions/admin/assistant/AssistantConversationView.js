/**
 * AssistantConversationView - Detail view for a conversation's message history
 *
 * Displays the full message thread using ChatView with AssistantMessageView
 * for rendering structured blocks (tables, charts, stats, etc.).
 */

import View from '@core/View.js';
import ChatView from '@core/views/chat/ChatView.js';
import { AssistantConversation } from '@ext/admin/models/Assistant.js';
import AssistantMessageView from './AssistantMessageView.js';
import AssistantView from './AssistantView.js';
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

        // Use the conversation's user ID, not the admin's
        const conversationUser = this.model.get('user');
        const currentUserId = conversationUser?.id;
        const transformedMessages = AssistantView._collapseMessages(
            messages
                .filter(msg => msg.role !== 'tool_result')
                .map(msg => this._transformMessage(msg, conversationUser))
        );

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

    _transformMessage(msg, conversationUser) {
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

        // Parse blocks from content if API didn't return them (legacy format)
        if (blocks.length === 0 && content.includes('assistant_block')) {
            const parsed = AssistantView._parseBlocks(content);
            content = parsed.content;
            blocks = parsed.blocks;
        }

        // Build author from message data or conversation-level user
        let author;
        if (msg.role === 'assistant') {
            author = { name: 'Assistant' };
        } else if (msg.author) {
            author = msg.author;
        } else {
            const user = msg.user || conversationUser;
            const avatarUrl = user?.avatar?.thumbnail || user?.avatar?.url || '';
            author = {
                name: user?.display_name || 'Unknown',
                id: user?.id,
                ...(avatarUrl ? { avatarUrl } : {})
            };
        }

        return {
            id: msg.id,
            role: msg.role || 'user',
            author,
            content,
            timestamp: msg.created || msg.timestamp,
            blocks,
            tool_calls: toolCalls,
            _conversationId: this.model.get('id')
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
