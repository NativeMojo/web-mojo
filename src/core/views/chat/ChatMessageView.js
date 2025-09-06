import View from '@core/View.js';
import FilePreviewView from '@core/views/data/FilePreviewView.js';

class ChatMessageView extends View {
    constructor(options = {}) {
        super({
            className: 'chat-message mb-3',
            ...options
        });
        this.item = options.item || {};
    }

    getTemplate() {
        if (this.item.type === 'system_event') {
            return `
                <div class="text-center text-muted small my-3">
                    <i class="bi bi-info-circle me-1"></i>
                    {{item.content}} on {{item.timestamp|datetime}}
                </div>
            `;
        }

        return `
            <div class="d-flex align-items-start">
                <div class="flex-shrink-0">
                    {{{item.author.avatarUrl|avatar('sm')}}}
                </div>
                <div class="ms-3">
                    <div class="fw-bold">{{item.author.name}}</div>
                    <div class="text-muted small">{{item.timestamp|relative}}</div>
                    <div class="mt-1">{{{item.content}}}</div>
                    <div data-container="attachments"></div>
                </div>
            </div>
        `;
    }

    onAfterRender() {
        if (this.item.attachments && this.item.attachments.length > 0) {
            const attachmentsContainer = this.element.querySelector('[data-container="attachments"]');
            this.item.attachments.forEach(file => {
                const filePreview = new FilePreviewView({ file });
                this.addChild(filePreview);
                filePreview.render(true, attachmentsContainer);
            });
        }
    }
}

export default ChatMessageView;
