/**
 * FileUpload - File upload service with progress tracking and UI integration
 *
 * Features:
 * - Auto-start upload process
 * - Progress tracking with detailed information
 * - Promise interface with cancellation support
 * - Toast integration for user feedback
 * - Three-stage upload process (initiate → upload → complete)
 *
 * @example
 * const file = new File();
 * const upload = file.upload({
 *   file: fileObject,
 *   name: 'avatar.jpg',
 *   group: 'profile-pics',
 *   description: 'User avatar',
 *   onProgress: ({ progress, loaded, total, percentage }) => {
 *     console.log(`${percentage}% complete`);
 *   }
 * });
 *
 * upload.then(result => console.log('Success!'))
 *       .catch(error => console.error('Failed:', error));
 */

import ToastService from './ToastService.js';
import ProgressView from '../components/ProgressView.js';

class FileUpload {
    constructor(fileModel, options = {}) {
        this.fileModel = fileModel;
        this.options = {
            file: null,
            name: null,
            group: null,
            description: null,
            onProgress: null,
            onComplete: null,
            onError: null,
            showToast: true,
            ...options
        };

        // Validation
        if (!this.options.file || !(this.options.file instanceof File)) {
            throw new Error('FileUpload requires a valid File object');
        }

        // State management
        this.cancelled = false;
        this.uploadRequest = null;
        this.progressToast = null;
        this.progressView = null;
        this.toastService = null;

        // Initialize toast service if needed
        if (this.options.showToast) {
            this.toastService = new ToastService();
        }

        // Auto-start upload (Option 3 behavior)
        this.promise = this._startUpload();
    }

    /**
     * Main upload orchestration
     * @returns {Promise} Upload promise
     * @private
     */
    async _startUpload() {
        try {
            if (this.options.showToast) {
                this._showProgressToast();
            }

            // Stage 1: Initiate upload and get signed URL
            let uploadData;
            try {
                uploadData = await this._initiateUpload();
            } catch (error) {
                throw new Error(`Failed to initiate upload: ${error.message}`);
            }
            
            if (this.cancelled) {
                throw new Error('Upload cancelled');
            }

            // Validate upload data
            if (!uploadData || !uploadData.upload_url) {
                throw new Error('Invalid upload response: missing upload URL');
            }

            // Stage 2: Upload file to signed URL
            let result;
            try {
                result = await this._performUpload(uploadData.upload_url);
            } catch (error) {
                throw new Error(`File upload failed: ${error.message}`);
            }
            
            if (this.cancelled) {
                throw new Error('Upload cancelled');
            }

            // Stage 3: Mark upload as completed
            try {
                await this._completeUpload();
            } catch (error) {
                console.warn('Failed to mark upload as completed:', error);
                // Don't fail the entire upload for completion marking errors
                // The file was successfully uploaded
            }

            // Handle success
            this._onComplete(result);
            return result;

        } catch (error) {
            if (error.message !== 'Upload cancelled') {
                this._onError(error);
            }
            throw error;
        }
    }

    /**
     * Initiate upload by calling the API to get signed URL
     * @returns {Promise<Object>} Upload initiation data
     * @private
     */
    async _initiateUpload() {
        try {
            const payload = {
                filename: this.options.name || this.options.file.name,
                file_size: this.options.file.size,
                content_type: this.options.file.type,
            };

            if (this.options.group) payload.group = this.options.group;
            if (this.options.description) payload.description = this.options.description;

            const response = await this.fileModel.rest.POST('/api/fileman/upload/initiate', payload);

            if (!response) {
                throw new Error('No response from upload initiation API');
            }

            if (!response.data) {
                throw new Error('Upload initiation response missing data');
            }

            // Check server response first (prefer server error messages)
            if (!response.data.status) {
                const errorMessage = response.data.error || 'Upload initiation failed';
                throw new Error(errorMessage);
            }

            if (!response.data.data) {
                throw new Error('Upload initiation response missing data payload');
            }

            // Set model ID for completion step
            if (response.data.data.id) {
                this.fileModel.set('id', response.data.data.id);
            }

            return response.data.data; // { id, upload_url }

        } catch (error) {
            // Re-throw with more context if it's a generic error
            if (error.message === 'Network Error' || error.name === 'TypeError') {
                throw new Error('Network error during upload initiation. Please check your connection.');
            }
            throw error;
        }
    }

    /**
     * Upload file to signed URL with direct XHR control for cancellation
     * @param {string} uploadUrl - Signed upload URL
     * @returns {Promise} Upload result
     * @private
     */
    async _performUpload(uploadUrl) {
        return new Promise((resolve, reject) => {
            // Validate input
            if (!(this.options.file instanceof File)) {
                reject(new Error('Only single File objects are supported'));
                return;
            }

            const xhr = new XMLHttpRequest();
            this.uploadRequest = xhr; // Store XHR for cancellation

            // Set up progress tracking
            xhr.upload.onprogress = (event) => {
                if (this.cancelled) return;

                const progressInfo = {
                    progress: event.loaded / event.total,
                    loaded: event.loaded,
                    total: event.total,
                    percentage: Math.round((event.loaded / event.total) * 100)
                };

                this._onProgress(progressInfo);
            };

            // Set up response handlers
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        data: xhr.response,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        xhr: xhr
                    });
                } else {
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error('Upload failed: Network error'));
            };

            xhr.ontimeout = () => {
                reject(new Error('Upload failed: Timeout'));
            };

            xhr.onabort = () => {
                reject(new Error('Upload cancelled'));
            };

            xhr.ontimeout = () => {
                reject(new Error('Upload timeout - file may be too large or connection too slow'));
            };

            // Configure request - use PUT method with raw file data
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', this.options.file.type);

            // Set timeout if specified (30 seconds default)
            xhr.timeout = 30000;

            // Send the raw file data
            xhr.send(this.options.file);
        });
    }

    /**
     * Mark upload as completed in the API
     * @returns {Promise} Completion result
     * @private
     */
    async _completeUpload() {
        try {
            const response = await this.fileModel.save({ action: 'mark_as_completed' });
            
            if (!response) {
                throw new Error('No response from upload completion API');
            }
            
            // Check server response format (prefer server errors over HTTP errors)
            if (response.data && !response.data.status) {
                const errorMessage = response.data.error || 'Failed to mark upload as completed';
                throw new Error(errorMessage);
            }
            
            return response;
        } catch (error) {
            // Re-throw with more context
            if (error.message === 'Network Error' || error.name === 'TypeError') {
                throw new Error('Network error during upload completion. The file may have uploaded successfully.');
            }
            throw error;
        }
    }

    /**
     * Handle progress updates
     * @param {Object} progressInfo - Progress information
     * @private
     */
    _onProgress(progressInfo) {
        // Update progress toast if shown
        if (this.progressToast && this.progressToast.updateProgress) {
            this.progressToast.updateProgress(progressInfo);
        }

        // Call user-provided progress callback
        if (typeof this.options.onProgress === 'function') {
            this.options.onProgress(progressInfo);
        }
    }

    /**
     * Handle successful upload completion
     * @param {Object} result - Upload result
     * @private
     */
    _onComplete(result) {
        // Mark progress view as completed
        if (this.progressView) {
            this.progressView.markCompleted('Upload completed successfully!');
        }

        // Auto-hide progress toast after a delay
        if (this.progressToast) {
            setTimeout(() => {
                try {
                    if (this.progressToast && typeof this.progressToast.hide === 'function') {
                        this.progressToast.hide();
                    }
                } catch (error) {
                    console.warn('Error hiding progress toast:', error);
                }
            }, 2000);
        }

        // Call user-provided completion callback
        if (typeof this.options.onComplete === 'function') {
            this.options.onComplete(result);
        }
    }

    /**
     * Handle upload errors
     * @param {Error} error - Error object
     * @private
     */
    _onError(error) {
        // Hide progress toast immediately and show error toast
        if (this.progressToast) {
            try {
                this.progressToast.hide();
            } catch (error) {
                console.warn('Error hiding progress toast on error:', error);
            }
        }

        // Show error toast with immediate feedback
        if (this.toastService) {
            this.toastService.error(`Upload failed: ${error.message}`);
        }

        // Call user-provided error callback
        if (typeof this.options.onError === 'function') {
            this.options.onError(error);
        }
    }

    /**
     * Show progress toast with ProgressView component
     * @private
     */
    _showProgressToast() {
        // Create progress view with file information
        this.progressView = new ProgressView({
            filename: this.options.name || this.options.file.name,
            filesize: this.options.file.size,
            showCancel: true,
            onCancel: () => this.cancel()
        });

        // Show progress view in toast
        this.progressToast = this.toastService.showView(this.progressView, 'info', {
            title: 'File Upload',
            autohide: false,
            dismissible: false
        });
    }

    /**
     * Cancel the upload
     * @returns {boolean} True if cancelled, false if already completed
     */
    cancel() {
        if (this.cancelled) {
            return false;
        }

        this.cancelled = true;

        // Cancel the upload request if in progress
        if (this.uploadRequest && typeof this.uploadRequest.abort === 'function') {
            this.uploadRequest.abort();
        }

        // Mark progress view as cancelled
        if (this.progressView) {
            this.progressView.markCancelled();
        }

        // Hide progress toast after a delay
        if (this.progressToast) {
            setTimeout(() => {
                try {
                    if (this.progressToast && typeof this.progressToast.hide === 'function') {
                        this.progressToast.hide();
                    }
                } catch (error) {
                    console.warn('Error hiding progress toast on cancel:', error);
                }
            }, 1500);
        }

        return true;
    }

    /**
     * Check if upload is cancelled
     * @returns {boolean} True if cancelled
     */
    isCancelled() {
        return this.cancelled;
    }

    /**
     * Promise interface - then
     * @param {function} onSuccess - Success handler
     * @param {function} onError - Error handler
     * @returns {Promise} Promise chain
     */
    then(onSuccess, onError) {
        return this.promise.then(onSuccess, onError);
    }

    /**
     * Promise interface - catch
     * @param {function} onError - Error handler
     * @returns {Promise} Promise chain
     */
    catch(onError) {
        return this.promise.catch(onError);
    }

    /**
     * Promise interface - finally
     * @param {function} onFinally - Finally handler
     * @returns {Promise} Promise chain
     */
    finally(onFinally) {
        return this.promise.finally(onFinally);
    }

    /**
     * Get upload statistics
     * @returns {Object} Upload stats
     */
    getStats() {
        return {
            filename: this.options.file.name,
            size: this.options.file.size,
            type: this.options.file.type,
            cancelled: this.cancelled,
            group: this.options.group,
            description: this.options.description
        };
    }
}

export default FileUpload;
