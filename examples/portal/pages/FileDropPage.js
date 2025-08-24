/**
 * FileDropPage - Comprehensive showcase of FileDropMixin functionality
 * Demonstrates various drag-and-drop file handling patterns in MOJO framework
 */

import Page from '/src/core/Page.js';
import View from '/src/core/View.js';
import applyFileDropMixin from '/src/components/FileDropMixin.js';

// Apply FileDropMixin to View class
applyFileDropMixin(View);

export default class FileDropPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            title: 'FileDropMixin Examples',
            description: 'Comprehensive examples of drag-and-drop file functionality using FileDropMixin'
        });

        // Store child views for cleanup
        this.dropViews = {};
    }

    async getTemplate() {
        return `
            <div class="container-fluid">
                <!-- Page Header -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 class="h3 mb-2">
                                    <i class="bi bi-cloud-arrow-up text-primary"></i>
                                    FileDropMixin Examples
                                </h1>
                                <p class="text-muted">Comprehensive examples showing how to use FileDropMixin to add drag-and-drop functionality to any MOJO View</p>
                            </div>
                            <div class="text-end">
                                <button class="btn btn-outline-secondary btn-sm" data-action="clear-all-logs">
                                    <i class="bi bi-trash"></i> Clear All Results
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Feature Overview -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card border-info">
                            <div class="card-header bg-info text-white">
                                <h5 class="mb-0"><i class="bi bi-info-circle"></i> FileDropMixin Features</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-4">
                                        <h6>Configuration Options</h6>
                                        <ul class="list-unstyled">
                                            <li><i class="bi bi-check-circle text-success"></i> File type validation</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Size limits</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Multiple file support</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Custom drop zones</li>
                                        </ul>
                                    </div>
                                    <div class="col-md-4">
                                        <h6>Visual Feedback</h6>
                                        <ul class="list-unstyled">
                                            <li><i class="bi bi-check-circle text-success"></i> Drag-over styling</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Active drag states</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Configurable classes</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Optional disable</li>
                                        </ul>
                                    </div>
                                    <div class="col-md-4">
                                        <h6>Framework Integration</h6>
                                        <ul class="list-unstyled">
                                            <li><i class="bi bi-check-circle text-success"></i> Automatic cleanup</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Event callbacks</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Error handling</li>
                                            <li><i class="bi bi-check-circle text-success"></i> Validation system</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Examples Grid -->
                <div class="row">
                    <!-- Example 1: Basic Image Drop -->
                    <div class="col-lg-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-image text-primary"></i>
                                    Basic Image Drop
                                </h5>
                                <small class="text-muted">Images only, single file, auto-validation</small>
                            </div>
                            <div class="card-body">
                                <div data-container="basic-drop"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Example 2: Multiple Documents -->
                    <div class="col-lg-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-files text-success"></i>
                                    Multiple Documents
                                </h5>
                                <small class="text-muted">PDF, DOC, TXT files - multiple allowed</small>
                            </div>
                            <div class="card-body">
                                <div data-container="multiple-drop"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Example 3: Custom Drop Zone -->
                    <div class="col-lg-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-bullseye text-warning"></i>
                                    Custom Drop Zone
                                </h5>
                                <small class="text-muted">Specific drop area, any file type</small>
                            </div>
                            <div class="card-body">
                                <div data-container="custom-drop"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Example 4: Error Handling -->
                    <div class="col-lg-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-exclamation-triangle text-danger"></i>
                                    Error Handling
                                </h5>
                                <small class="text-muted">Strict validation, error demonstration</small>
                            </div>
                            <div class="card-body">
                                <div data-container="error-drop"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Example 5: No Visual Feedback -->
                    <div class="col-lg-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-eye-slash text-secondary"></i>
                                    No Visual Feedback
                                </h5>
                                <small class="text-muted">Disabled drag styling, custom validation</small>
                            </div>
                            <div class="card-body">
                                <div data-container="no-feedback-drop"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Example 6: Large Files -->
                    <div class="col-lg-6 mb-4">
                        <div class="card h-100">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-hdd text-info"></i>
                                    Large File Support
                                </h5>
                                <small class="text-muted">Up to 100MB, progress simulation</small>
                            </div>
                            <div class="card-body">
                                <div data-container="large-drop"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Activity Log -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">
                                    <i class="bi bi-activity text-primary"></i>
                                    Activity Log
                                </h5>
                                <button class="btn btn-outline-secondary btn-sm" data-action="clear-log">
                                    <i class="bi bi-trash"></i> Clear Log
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="log-container bg-light p-3 rounded" style="max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 0.9rem;">
                                    <div class="log-entry text-success">
                                        <strong>[${new Date().toLocaleTimeString()}]</strong> FileDropMixin examples loaded. Try dropping files above!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        await super.onInit();

        // Set global reference for file removal functionality
        window.fileDropPage = this;

        // Initialize all drop examples
        await this.initializeExamples();
    }

    async initializeExamples() {
        try {
            this.log('Initializing FileDropMixin examples...', 'info');

            // Example 1: Basic Image Drop
            this.dropViews.basic = new BasicImageDropView({ containerId: 'basic-drop' });
            this.addChild(this.dropViews.basic);

            // Example 2: Multiple Documents
            this.dropViews.multiple = new MultipleDocumentsView({ containerId: 'multiple-drop' });
            this.addChild(this.dropViews.multiple);

            // Example 3: Custom Drop Zone
            this.dropViews.custom = new CustomDropZoneView({ containerId: 'custom-drop' });
            this.addChild(this.dropViews.custom);

            // Example 4: Error Handling
            this.dropViews.error = new ErrorHandlingView({ containerId: 'error-drop' });
            this.addChild(this.dropViews.error);

            // Example 5: No Visual Feedback
            this.dropViews.noFeedback = new NoFeedbackView({ containerId: 'no-feedback-drop' });
            this.addChild(this.dropViews.noFeedback);

            // Example 6: Large Files
            this.dropViews.large = new LargeFileView({ containerId: 'large-drop' });
            this.addChild(this.dropViews.large);

            this.log('All FileDropMixin examples initialized successfully!', 'success');

        } catch (error) {
            this.log(`Error initializing examples: ${error.message}`, 'error');
            console.error('FileDropPage initialization error:', error);
        }
    }

    // Logging utility
    log(message, type = 'info') {
        const logContainer = this.element.querySelector('.log-container');
        if (!logContainer) return;

        const timestamp = new Date().toLocaleTimeString();
        const icons = {
            success: '✓',
            error: '✗',
            info: 'ℹ',
            warning: '⚠'
        };
        const colors = {
            success: 'text-success',
            error: 'text-danger',
            info: 'text-info',
            warning: 'text-warning'
        };

        const entry = document.createElement('div');
        entry.className = `log-entry ${colors[type] || colors.info}`;
        entry.innerHTML = `<strong>[${timestamp}]</strong> ${icons[type] || icons.info} ${message}`;

        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;

        // Limit log entries to prevent memory issues
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[0].remove();
        }

        console.log(`[FileDropPage] ${message}`);
    }

    // Action handlers
    async onActionClearLog() {
        const logContainer = this.element.querySelector('.log-container');
        if (logContainer) {
            logContainer.innerHTML = '<div class="log-entry text-info"><strong>[' + new Date().toLocaleTimeString() + ']</strong> ℹ Log cleared</div>';
        }
    }

    async onActionClearAllLogs() {
        // Clear main log
        await this.onActionClearLog();

        // Clear all example results
        Object.values(this.dropViews).forEach(view => {
            if (view && typeof view.clearResults === 'function') {
                view.clearResults();
            }
        });

        this.log('All results and logs cleared', 'info');
    }

    // Utility method for child views
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async onBeforeDestroy() {
        // Clean up global reference
        if (window.fileDropPage === this) {
            delete window.fileDropPage;
        }

        // Clean up child views
        Object.values(this.dropViews).forEach(async (view) => {
            if (view && typeof view.destroy === 'function') {
                await view.destroy();
            }
        });

        await super.onBeforeDestroy();
    }
}

// Example View Classes

// Example 1: Basic Image Drop
class BasicImageDropView extends View {
    constructor(options) {
        super(options);

        this.enableFileDrop({
            acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            maxFileSize: 5 * 1024 * 1024, // 5MB
            multiple: false,
            validateOnDrop: true
        });
    }

    async getTemplate() {
        return `
            <div class="drop-zone border-2 border-dashed rounded p-4 text-center" style="min-height: 200px; border-color: #dee2e6; transition: all 0.2s ease;">
                <i class="bi bi-cloud-upload" style="font-size: 3rem; color: #6c757d;"></i>
                <h6 class="mt-3">Drop an image here</h6>
                <p class="text-muted mb-0">Accepts: JPEG, PNG, GIF, WebP (max 5MB)</p>
            </div>
            <div class="result-area mt-3"></div>
        `;
    }

    async onFileDrop(files, event, validation) {
        this.parent.log(`Basic example: Received ${files.length} file(s)`, 'success');

        const file = files[0];
        const resultArea = this.element.querySelector('.result-area');

        resultArea.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle"></i>
                <strong>File dropped:</strong> ${file.name} (${this.parent.formatFileSize(file.size)})
                <br><small>Type: ${file.type}</small>
            </div>
        `;

        // Show image preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                resultArea.innerHTML += `
                    <div class="text-center">
                        <img src="${e.target.result}" class="img-thumbnail" style="max-height: 200px;">
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    }

    async onFileDropError(error, event, files) {
        this.parent.log(`Basic example error: ${error.message}`, 'error');
        const resultArea = this.element.querySelector('.result-area');
        resultArea.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    }

    clearResults() {
        const resultArea = this.element.querySelector('.result-area');
        if (resultArea) resultArea.innerHTML = '';
    }
}

// Example 2: Multiple Documents
class MultipleDocumentsView extends View {
    constructor(options) {
        super(options);

        this.droppedFiles = [];

        this.enableFileDrop({
            acceptedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            multiple: true,
            validateOnDrop: true
        });
    }

    async getTemplate() {
        return `
            <div class="drop-zone border-2 border-dashed rounded p-4 text-center" style="min-height: 200px; border-color: #dee2e6; transition: all 0.2s ease;">
                <i class="bi bi-file-earmark-text" style="font-size: 3rem; color: #6c757d;"></i>
                <h6 class="mt-3">Drop documents here</h6>
                <p class="text-muted mb-0">Accepts: PDF, DOC, TXT (multiple files, max 10MB each)</p>
            </div>
            <div class="file-list mt-3" style="max-height: 300px; overflow-y: auto;"></div>
        `;
    }

    async onFileDrop(files, event, validation) {
        this.parent.log(`Multiple files example: Received ${files.length} file(s)`, 'success');

        this.droppedFiles.push(...files);
        this.updateFileList();
    }

    async onFileDropError(error, event, files) {
        this.parent.log(`Multiple files error: ${error.message}`, 'error');
    }

    updateFileList() {
        const fileList = this.element.querySelector('.file-list');

        if (this.droppedFiles.length === 0) {
            fileList.innerHTML = '<p class="text-muted text-center">No files dropped yet</p>';
            return;
        }

        fileList.innerHTML = this.droppedFiles.map((file, index) => `
            <div class="d-flex align-items-center justify-content-between p-2 border rounded mb-2 bg-light">
                <div class="d-flex align-items-center">
                    <i class="bi bi-file-earmark-text text-primary me-2"></i>
                    <div>
                        <div class="fw-bold">${file.name}</div>
                        <small class="text-muted">${this.parent.formatFileSize(file.size)}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="window.fileDropPage.dropViews.multiple.removeFile(${index})">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `).join('');
    }

    removeFile(index) {
        this.droppedFiles.splice(index, 1);
        this.updateFileList();
        this.parent.log(`Removed file at index ${index}`, 'info');
    }

    clearResults() {
        this.droppedFiles = [];
        this.updateFileList();
    }
}

// Example 3: Custom Drop Zone
class CustomDropZoneView extends View {
    constructor(options) {
        super(options);

        this.enableFileDrop({
            acceptedTypes: ['*/*'], // Any file type
            maxFileSize: 50 * 1024 * 1024, // 50MB
            dropZoneSelector: '.custom-drop-area',
            multiple: false,
            validateOnDrop: true
        });
    }

    async getTemplate() {
        return `
            <p class="mb-3">Drop files anywhere in this area, but only the green zone will accept them:</p>
            <div class="custom-drop-area border-2 border-success rounded p-3 text-center bg-light-success" style="min-height: 120px; display: flex; align-items: center; justify-content: center; background-color: #d4edda;">
                <div>
                    <strong><i class="bi bi-download text-success"></i> Custom Drop Zone</strong>
                    <br><small>Any file type accepted here</small>
                </div>
            </div>
            <p class="text-muted mt-2 mb-3">This area won't accept drops ↑</p>
            <div class="result-area"></div>
        `;
    }

    async onFileDrop(files, event, validation) {
        this.parent.log(`Custom drop zone: Received file in custom zone`, 'success');

        const file = files[0];
        const resultArea = this.element.querySelector('.result-area');
        resultArea.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i>
                <strong>Dropped in custom zone:</strong> ${file.name}
                <br><small>Size: ${this.parent.formatFileSize(file.size)} | Type: ${file.type}</small>
            </div>
        `;
    }

    async onFileDropError(error, event, files) {
        this.parent.log(`Custom drop zone error: ${error.message}`, 'error');
    }

    clearResults() {
        const resultArea = this.element.querySelector('.result-area');
        if (resultArea) resultArea.innerHTML = '';
    }
}

// Example 4: Error Handling
class ErrorHandlingView extends View {
    constructor(options) {
        super(options);

        this.enableFileDrop({
            acceptedTypes: ['image/png'], // Only PNG
            maxFileSize: 1024 * 1024, // 1MB - very strict
            multiple: false,
            validateOnDrop: true
        });
    }

    async getTemplate() {
        return `
            <div class="drop-zone border-2 border-dashed rounded p-4 text-center" style="min-height: 200px; border-color: #dee2e6; transition: all 0.2s ease;">
                <i class="bi bi-shield-exclamation" style="font-size: 3rem; color: #6c757d;"></i>
                <h6 class="mt-3">Strict validation zone</h6>
                <p class="text-muted mb-0">Only PNG files under 1MB accepted</p>
            </div>
            <div class="result-area mt-3"></div>
        `;
    }

    async onFileDrop(files, event, validation) {
        this.parent.log(`Error example: PNG file accepted`, 'success');

        const file = files[0];
        const resultArea = this.element.querySelector('.result-area');
        resultArea.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check2-circle"></i>
                <strong>Validation passed:</strong> ${file.name}
                <br><small>This file met all strict requirements</small>
            </div>
        `;
    }

    async onFileDropError(error, event, files) {
        this.parent.log(`Error example: ${error.message}`, 'error');

        const file = files ? files[0] : null;
        let details = '';

        if (file) {
            details = `<br><small>File: ${file.name} (${this.parent.formatFileSize(file.size)}, ${file.type})</small>`;
        }

        const resultArea = this.element.querySelector('.result-area');
        resultArea.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-shield-exclamation"></i>
                <strong>Validation failed:</strong> ${error.message}
                ${details}
            </div>
        `;
    }

    clearResults() {
        const resultArea = this.element.querySelector('.result-area');
        if (resultArea) resultArea.innerHTML = '';
    }
}

// Example 5: No Visual Feedback
class NoFeedbackView extends View {
    constructor(options) {
        super(options);

        this.enableFileDrop({
            acceptedTypes: ['text/javascript', 'text/html', 'text/css', 'application/json'],
            maxFileSize: 1 * 1024 * 1024, // 1MB
            multiple: false,
            visualFeedback: false, // Disable visual feedback
            validateOnDrop: false // We'll do custom validation
        });
    }

    async getTemplate() {
        return `
            <div class="drop-zone border-2 border-dashed rounded p-4 text-center" style="min-height: 200px; border-color: #dee2e6; transition: all 0.2s ease;">
                <i class="bi bi-file-code" style="font-size: 3rem; color: #6c757d;"></i>
                <h6 class="mt-3">Drop code files here</h6>
                <p class="text-muted mb-0">No visual feedback, custom validation</p>
            </div>
            <div class="result-area mt-3"></div>
        `;
    }

    async onFileDrop(files, event, validation) {
        const file = files[0];

        // Custom validation
        if (!file.name.match(/\.(js|html|css|json)$/i)) {
            this.onFileDropError(new Error('Only code files (.js, .html, .css, .json) are allowed'), event, files);
            return;
        }

        this.parent.log(`No feedback example: Code file accepted`, 'success');

        const resultArea = this.element.querySelector('.result-area');
        resultArea.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-code-square"></i>
                <strong>Code file accepted:</strong> ${file.name}
                <br><small>No visual feedback was shown during drag</small>
            </div>
        `;
    }

    async onFileDropError(error, event, files) {
        this.parent.log(`No feedback error: ${error.message}`, 'error');
        const resultArea = this.element.querySelector('.result-area');
        resultArea.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle"></i>
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    }

    clearResults() {
        const resultArea = this.element.querySelector('.result-area');
        if (resultArea) resultArea.innerHTML = '';
    }
}

// Example 6: Large File Support
class LargeFileView extends View {
    constructor(options) {
        super(options);

        this.enableFileDrop({
            acceptedTypes: ['*/*'],
            maxFileSize: 100 * 1024 * 1024, // 100MB
            multiple: false,
            validateOnDrop: true
        });
    }

    async getTemplate() {
        return `
            <div class="drop-zone border-2 border-dashed rounded p-4 text-center" style="min-height: 200px; border-color: #dee2e6; transition: all 0.2s ease;">
                <i class="bi bi-database" style="font-size: 3rem; color: #6c757d;"></i>
                <h6 class="mt-3">Drop large files here</h6>
                <p class="text-muted mb-0">Up to 100MB accepted</p>
            </div>
            <div class="result-area mt-3"></div>
        `;
    }

    async onFileDrop(files, event, validation) {
        const file = files[0];
        this.parent.log(`Large files example: Processing ${file.name} (${this.parent.formatFileSize(file.size)})`, 'success');

        const resultArea = this.element.querySelector('.result-area');

        // Show progress simulation for large files
        if (file.size > 10 * 1024 * 1024) { // > 10MB
            resultArea.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-clock"></i>
                    <strong>Processing large file:</strong> ${file.name}
                    <div class="progress mt-2">
                        <div class="progress-bar progress-bar-striped progress-bar-animated"
                             role="progressbar" style="width: 0%"></div>
                    </div>
                </div>
            `;

            // Simulate progress
            const progressBar = resultArea.querySelector('.progress-bar');
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);

                    setTimeout(() => {
                        resultArea.innerHTML = `
                            <div class="alert alert-success">
                                <i class="bi bi-check-circle"></i>
                                <strong>Large file processed:</strong> ${file.name}
                                <br><small>Size: ${this.parent.formatFileSize(file.size)}</small>
                            </div>
                        `;
                    }, 500);
                }
                progressBar.style.width = `${progress}%`;
            }, 200);
        } else {
            resultArea.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i>
                    <strong>File accepted:</strong> ${file.name}
                    <br><small>Size: ${this.parent.formatFileSize(file.size)}</small>
                </div>
            `;
        }
    }

    async onFileDropError(error, event, files) {
        this.parent.log(`Large files error: ${error.message}`, 'error');
        const resultArea = this.element.querySelector('.result-area');
        resultArea.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle"></i>
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    }

    clearResults() {
        const resultArea = this.element.querySelector('.result-area');
        if (resultArea) resultArea.innerHTML = '';
    }
}
