import View from '@core/View.js';
import applyFileDropMixin from '@core/mixins/FileDropMixin.js';
import { File } from '@core/models/Files.js';

/**
 * ChatInputView - Input area with file drop support and attachment preview
 */
class ChatInputView extends View {
    constructor(options = {}) {
        super({
            className: 'chat-input-view',
            ...options
        });
        
        this.placeholder = options.placeholder || 'Type a message...';
        this.buttonText = options.buttonText || 'Send';
        this.attachments = []; // Array of uploaded file data
        this.pendingUploads = new Map(); // Track in-progress uploads
    }

    getTemplate() {
        return `
            <div class="chat-input-container">
                <div class="chat-input-attachments" data-container="attachments"></div>
                <div class="chat-input-wrapper">
                    <textarea 
                        class="chat-input form-control" 
                        placeholder="${this.placeholder}" 
                        rows="1"></textarea>
                    <button class="chat-send-btn btn btn-primary" data-action="send-message" type="button">
                        <i class="bi bi-send-fill"></i>
                    </button>
                </div>
                <div class="chat-input-footer">
                    <small class="text-muted">
                        <i class="bi bi-paperclip"></i> 
                        Drag & drop files to attach
                    </small>
                </div>
            </div>
        `;
    }

    async onAfterRender() {
        // Enable file drop on the entire input container
        this.enableFileDrop({
            dropZoneSelector: '.chat-input-container',
            multiple: true,
            acceptedTypes: ['*/*'], // Accept all file types
            visualFeedback: true,
            dragOverClass: 'drag-over',
            dragActiveClass: 'drag-active'
        });
        
        // Auto-resize textarea as user types and handle Enter key
        const textarea = this.element.querySelector('.chat-input');
        if (textarea) {
            textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));
            textarea.addEventListener('keydown', (e) => this.handleKeydown(e));
        }
    }

    /**
     * Handle textarea keydown (send on Enter without Shift)
     */
    handleKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.onActionSendMessage(event, event.target);
        }
    }

    /**
     * Handle file drop
     * @param {File[]} files - Dropped files
     */
    async onFileDrop(files) {
        for (const file of files) {
            await this.uploadFile(file);
        }
    }

    /**
     * Upload a file
     * @param {File} file - File to upload
     */
    async uploadFile(file) {
        const fileModel = new File();
        const uploadId = Date.now() + Math.random();
        
        // Add preview immediately
        this.addFilePreview(uploadId, file, 0);
        this.pendingUploads.set(uploadId, { file, fileModel });
        
        try {
            const result = await fileModel.upload({
                file: file,
                onProgress: (progress) => {
                    this.updateFileProgress(uploadId, progress);
                },
                onComplete: (uploadResult) => {
                    this.handleUploadComplete(uploadId, uploadResult);
                }
            });
            
            // If upload completes synchronously
            if (result && result.success) {
                this.handleUploadComplete(uploadId, result.data);
            }
        } catch (error) {
            console.error('File upload failed:', error);
            this.handleUploadError(uploadId, error);
        }
    }

    /**
     * Add file preview to UI
     * @param {string} uploadId - Unique upload ID
     * @param {File} file - File object
     * @param {number} progress - Upload progress (0-100)
     */
    addFilePreview(uploadId, file, progress) {
        const container = this.element.querySelector('[data-container="attachments"]');
        if (!container) return;
        
        const preview = document.createElement('div');
        preview.className = 'attachment-preview';
        preview.dataset.uploadId = uploadId;
        preview.innerHTML = `
            <div class="attachment-info">
                <i class="bi bi-file-earmark"></i>
                <span class="attachment-name">${this.escapeHtml(file.name)}</span>
                <span class="attachment-size">(${this.formatFileSize(file.size)})</span>
            </div>
            <div class="attachment-progress">
                <div class="progress" style="height: 4px;">
                    <div class="progress-bar" role="progressbar" style="width: ${progress}%"></div>
                </div>
            </div>
            <button class="attachment-remove btn btn-sm btn-link text-danger" data-action="remove-attachment" data-upload-id="${uploadId}" type="button">
                <i class="bi bi-x"></i>
            </button>
        `;
        
        container.appendChild(preview);
    }

    /**
     * Update file upload progress
     * @param {string} uploadId - Upload ID
     * @param {number} progress - Progress (0-100)
     */
    updateFileProgress(uploadId, progress) {
        const preview = this.element.querySelector(`[data-upload-id="${uploadId}"]`);
        if (preview) {
            const progressBar = preview.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }
    }

    /**
     * Handle upload completion
     * @param {string} uploadId - Upload ID
     * @param {Object} result - Upload result data (contains file.id)
     */
    handleUploadComplete(uploadId, result) {
        // Store the file data with its ID
        this.attachments.push({
            id: result.id || result.file?.id || result,
            name: result.name || this.pendingUploads.get(uploadId)?.file.name,
            uploadId: uploadId
        });
        this.pendingUploads.delete(uploadId);
        
        const preview = this.element.querySelector(`[data-upload-id="${uploadId}"]`);
        if (preview) {
            preview.classList.add('upload-complete');
            const progressContainer = preview.querySelector('.attachment-progress');
            if (progressContainer) {
                progressContainer.remove();
            }
        }
    }

    /**
     * Handle upload error
     * @param {string} uploadId - Upload ID
     * @param {Error} error - Error object
     */
    handleUploadError(uploadId, error) {
        this.pendingUploads.delete(uploadId);
        
        const preview = this.element.querySelector(`[data-upload-id="${uploadId}"]`);
        if (preview) {
            preview.classList.add('upload-error');
            preview.querySelector('.attachment-info').innerHTML += 
                `<span class="text-danger ms-2">Upload failed</span>`;
        }
    }

    /**
     * Remove attachment
     */
    async onActionRemoveAttachment(event, element) {
        const uploadId = element.dataset.uploadId;
        
        // Remove from pending uploads
        this.pendingUploads.delete(uploadId);
        
        // Remove from completed attachments
        const preview = this.element.querySelector(`[data-upload-id="${uploadId}"]`);
        if (preview) {
            // TODO: Get the file ID from the preview and remove from attachments array
            preview.remove();
        }
    }



    /**
     * Send message
     */
    async onActionSendMessage(event, element) {
        const textarea = this.element.querySelector('.chat-input');
        const text = textarea.value.trim();
        
        // Don't send if empty and no attachments
        if (!text && this.attachments.length === 0) {
            return;
        }
        
        // Don't send if uploads are pending
        if (this.pendingUploads.size > 0) {
            // TODO: Show message that uploads are in progress
            return;
        }
        
        // Emit event with message data
        this.emit('message:send', {
            text: text,
            files: this.attachments
        });
        
        // Note: Don't clear here - let the parent ChatView call clearInput() after successful send
    }

    /**
     * Clear input and attachments
     */
    clearInput() {
        const textarea = this.element.querySelector('.chat-input');
        if (textarea) {
            textarea.value = '';
            textarea.style.height = 'auto';
        }
        
        const container = this.element.querySelector('[data-container="attachments"]');
        if (container) {
            container.innerHTML = '';
        }
        
        this.attachments = [];
        this.pendingUploads.clear();
    }

    /**
     * Auto-resize textarea based on content
     * @param {HTMLTextAreaElement} textarea
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    /**
     * Format file size for display
     * @param {number} bytes
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Apply FileDropMixin
applyFileDropMixin(ChatInputView);

export default ChatInputView;
