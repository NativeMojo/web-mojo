/**
 * ProgressView - File upload progress component
 * 
 * Shows upload progress with progress bar, filename, and cancellation option
 * Integrates with FileUpload service for real-time progress updates
 * 
 * Features:
 * - Bootstrap progress bar with percentage
 * - File information (name, size)
 * - Bytes uploaded/total display
 * - Cancel button with confirmation
 * - Responsive design
 * 
 * Events:
 * - 'cancel' - Emitted when user cancels upload
 * 
 * @example
 * const progressView = new ProgressView({
 *   filename: 'document.pdf',
 *   filesize: 1024000,
 *   onCancel: () => fileUpload.cancel()
 * });
 * 
 * // Update progress
 * progressView.updateProgress({ progress: 0.5, loaded: 512000, total: 1024000 });
 */

import View from '../core/View.js';
import dataFormatter from '../utils/DataFormatter.js';

class ProgressView extends View {
    constructor(options = {}) {
        super({
            template: 'progress-view-template',
            ...options
        });

        // Initialize progress data
        this.filename = options.filename || 'Unknown file';
        this.filesize = options.filesize || 0;
        this.filesizeFormatted = dataFormatter.pipe(this.filesize, 'filesize');
        
        // Progress state
        this.progress = 0;
        this.percentage = 0;
        this.loaded = 0;
        this.total = this.filesize;
        this.loadedFormatted = '0 B';
        this.totalFormatted = this.filesizeFormatted;
        this.status = 'Starting upload...';
        
        // Options
        this.showCancel = options.showCancel !== false;
        this.onCancel = options.onCancel || null;
        
        // State
        this.cancelled = false;
        this.completed = false;
    }

    /**
     * Get template for the progress view
     */
    getTemplate() {
        return `
            <div class="progress-view">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="flex-grow-1 min-width-0">
                        <div class="fw-medium text-truncate" title="{{filename}}">
                            <i class="bi bi-file-earmark me-1"></i>
                            {{filename}}
                        </div>
                        <small class="text-muted">{{status}}</small>
                    </div>
                    {{#showCancel}}
                    <button type="button" 
                            class="btn btn-sm btn-outline-secondary ms-2" 
                            data-action="cancel"
                            {{#cancelled}}disabled{{/cancelled}}>
                        <i class="bi bi-x"></i>
                    </button>
                    {{/showCancel}}
                </div>
                
                <div class="progress mb-2" style="height: 8px;">
                    <div class="progress-bar" 
                         role="progressbar" 
                         style="width: {{percentage}}%"
                         aria-valuenow="{{percentage}}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
                
                <div class="d-flex justify-content-between">
                    <small class="text-muted">
                        {{loadedFormatted}} / {{totalFormatted}}
                    </small>
                    <small class="text-muted">
                        {{percentage}}%
                    </small>
                </div>
            </div>
        `;
    }

    /**
     * Update progress information
     * @param {Object} progressInfo - Progress data
     * @param {number} progressInfo.progress - Progress as decimal (0-1)
     * @param {number} progressInfo.loaded - Bytes loaded
     * @param {number} progressInfo.total - Total bytes
     * @param {number} progressInfo.percentage - Progress as percentage (0-100)
     */
    updateProgress(progressInfo) {
        if (this.cancelled || this.completed) {
            return;
        }

        this.progress = progressInfo.progress;
        this.percentage = progressInfo.percentage;
        this.loaded = progressInfo.loaded;
        this.total = progressInfo.total || this.filesize;
        
        // Format bytes for display
        this.loadedFormatted = dataFormatter.pipe(this.loaded, 'filesize');
        this.totalFormatted = dataFormatter.pipe(this.total, 'filesize');
        
        // Update status message
        if (this.percentage < 100) {
            this.status = `Uploading... ${this.percentage}%`;
        } else {
            this.status = 'Finalizing upload...';
        }

        // Re-render to show updated progress
        this.render();
    }

    /**
     * Mark upload as completed
     * @param {string} message - Success message
     */
    markCompleted(message = 'Upload completed!') {
        this.completed = true;
        this.progress = 1;
        this.percentage = 100;
        this.status = message;
        this.render();
    }

    /**
     * Mark upload as failed
     * @param {string} message - Error message
     */
    markFailed(message = 'Upload failed') {
        this.status = message;
        this.render();
    }

    /**
     * Mark upload as cancelled
     */
    markCancelled() {
        this.cancelled = true;
        this.status = 'Upload cancelled';
        this.render();
    }

    /**
     * Handle cancel button click
     * @param {string} action - Action name
     * @param {Event} event - Click event
     * @param {Element} element - Button element
     */
    async onActionCancel(action, event, element) {
        if (this.cancelled || this.completed) {
            return;
        }

        // Disable button immediately
        element.disabled = true;
        
        // Mark as cancelled
        this.markCancelled();
        
        // Emit cancel event
        this.emit('cancel');
        
        // Call cancel callback if provided
        if (typeof this.onCancel === 'function') {
            try {
                await this.onCancel();
            } catch (error) {
                console.error('Error in cancel callback:', error);
            }
        }
    }

    /**
     * Set filename
     * @param {string} filename - New filename
     */
    setFilename(filename) {
        this.filename = filename;
        this.render();
    }

    /**
     * Set file size
     * @param {number} size - File size in bytes
     */
    setFilesize(size) {
        this.filesize = size;
        this.filesizeFormatted = dataFormatter.pipe(size, 'filesize');
        this.total = size;
        this.totalFormatted = this.filesizeFormatted;
        this.render();
    }

    /**
     * Get current progress as percentage
     * @returns {number} Progress percentage (0-100)
     */
    getPercentage() {
        return this.percentage;
    }

    /**
     * Check if upload is completed
     * @returns {boolean} True if completed
     */
    isCompleted() {
        return this.completed;
    }

    /**
     * Check if upload is cancelled
     * @returns {boolean} True if cancelled
     */
    isCancelled() {
        return this.cancelled;
    }

    /**
     * Get upload statistics
     * @returns {Object} Upload stats
     */
    getStats() {
        return {
            filename: this.filename,
            filesize: this.filesize,
            progress: this.progress,
            percentage: this.percentage,
            loaded: this.loaded,
            total: this.total,
            cancelled: this.cancelled,
            completed: this.completed,
            status: this.status
        };
    }
}

export default ProgressView;