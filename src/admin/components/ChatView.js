import View from '../../core/View.js';
import ChatMessageView from './ChatMessageView.js';
import ChatInputView from './ChatInputView.js';

class ChatView extends View {
    constructor(options = {}) {
        super({
            className: 'chat-view d-flex flex-column h-100',
            ...options
        });
        this.adapter = options.adapter;
        this.items = [];
    }

    getTemplate() {
        return `
            <div class="chat-history flex-grow-1" style="overflow-y: auto;"></div>
            <div class="chat-input-container flex-shrink-0"></div>
        `;
    }

    async onInit() {
        this.items = await this.adapter.fetch();
    }

    onAfterRender() {
        const historyContainer = this.element.querySelector('.chat-history');
        this.items.forEach(item => {
            const messageView = new ChatMessageView({ item });
            this.addChild(messageView);
            messageView.render(true, historyContainer);
        });

        const inputContainer = this.element.querySelector('.chat-input-container');
        this.inputView = new ChatInputView();
        this.addChild(this.inputView);
        this.inputView.render(true, inputContainer);

        this.inputView.on('note:submit', async (data) => {
            await this.adapter.addNote(data);
            this.items = await this.adapter.fetch();
            this.render();
        });
    }
}

export default ChatView;
