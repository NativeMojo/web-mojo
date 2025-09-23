import View from '@core/View.js';
import applyFileDropMixin from '@core/mixins/FileDropMixin.js';
import FileUpload from '@core/services/FileUpload.js';
import { File } from '@core/models/Files.js';

class ChatInputView extends View {
    constructor(options = {}) {
        super({
            className: 'chat-input',
            ...options
        });
        this.uploads = [];
        this.buttonText = options.buttonText || 'Send';
    }

    getTemplate() {
        return `
            <div class="chat-input-container border-top pt-3">
                <textarea class="form-control" placeholder="Type a message..." rows="3"></textarea>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted">Drag & drop files to attach.</small>
                    <button class="btn btn-primary" data-action="send-message">${this.buttonText}</button>
                </div>
                <div class="uploads-container mt-2"></div>
            </div>
        `;
    }

    onAfterRender() {
        this.enableFileDrop({ dropZoneSelector: '.chat-input-container' });
    }

    async onFileDrop(files) {
        for (const file of files) {
            const fileModel = new File();
            const upload = fileModel.upload({
                file: file,
                onProgress: (progress) => {
                    // TODO: Update UI with progress
                },
                onComplete: (result) => {
                    this.uploads.push(result);
                }
            });
        }
    }

    async onActionSendMessage() {
        const textarea = this.element.querySelector('textarea');
        const text = textarea.value.trim();
        if (text || this.uploads.length > 0) {
            this.emit('note:submit', { text, files: this.uploads });
            textarea.value = '';
            this.uploads = [];
            this.element.querySelector('.uploads-container').innerHTML = '';
        }
    }
}

applyFileDropMixin(ChatInputView);

export default ChatInputView;
