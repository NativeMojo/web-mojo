/**
 * ImagePage - Complete image processing workflow demonstration
 * Shows: Upload -> Crop -> Edit -> Results pipeline
 */

import Page from '../../../src/core/Page.js';
import ImageUploadView from '../../../src/lightbox/ImageUploadView.js';
import ImageCropView from '../../../src/lightbox/ImageCropView.js';
import ImageEditor from '../../../src/lightbox/ImageEditor.js';

class ImagePage extends Page {
    static pageName = 'image-processing';
    static title = 'Image Processing - Portal Example';
    static icon = 'bi-image';
    static route = 'image';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ImagePage.pageName,
            route: ImagePage.route,
            pageIcon: ImagePage.icon,
            template: 'templates/ImagePage.mst'
        });

        // Workflow state
        this.currentStep = 'upload'; // upload -> crop -> edit -> results
        this.workflowData = {
            originalFile: null,
            originalImageUrl: null,
            croppedImageUrl: null,
            editedImageUrl: null
        };

        // Child views
        this.uploadView = null;
        this.cropView = null;
        this.editorView = null;

        // Template properties
        this.stepUpload = true;
        this.stepCrop = false;
        this.stepEdit = false;
        this.stepResults = false;
        this.showResultsSection = false;
    }

    async onInit() {
        // Page title and description
        this.pageTitle = 'Image Processing Workflow';
        this.pageDescription = 'Complete workflow: Upload → Crop → Edit → Results';
        
        // Step descriptions
        this.steps = [
            {
                id: 'upload',
                title: 'Upload Image',
                description: 'Select or drop an image file',
                icon: 'bi-cloud-upload',
                active: true,
                completed: false
            },
            {
                id: 'crop',
                title: 'Crop & Scale',
                description: 'Adjust image dimensions',
                icon: 'bi-crop',
                active: false,
                completed: false
            },
            {
                id: 'edit',
                title: 'Edit & Enhance',
                description: 'Apply filters and transformations',
                icon: 'bi-magic',
                active: false,
                completed: false
            },
            {
                id: 'results',
                title: 'View Results',
                description: 'Compare and download',
                icon: 'bi-check-circle',
                active: false,
                completed: false
            }
        ];

        // Initialize upload view
        await this.initializeUploadView();
    }

    async initializeUploadView() {
        this.uploadView = new ImageUploadView({
            containerId: 'upload-container',
            autoUpload: false, // We handle files locally
            maxFileSize: 10 * 1024 * 1024, // 10MB
            acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            onUpload: async (file, progressCallback) => {
                // Simulate progress for UI feedback
                progressCallback(50);
                await new Promise(resolve => {
                    setTimeout(() => resolve(), 200);
                });
                progressCallback(100);
                
                // Return success - we're handling locally
                return {
                    success: true,
                    url: URL.createObjectURL(file),
                    filename: file.name
                };
            }
        });

        this.addChild(this.uploadView);

        // Listen for file selection (not upload completion)
        const app = this.getApp();
        if (app?.events) {
            app.events.on('imageupload:preview', (data) => {
                if (data.view === this.uploadView) {
                    this.handleFileSelected(data.file);
                }
            });

            app.events.on('imageupload:upload-success', (data) => {
                if (data.view === this.uploadView) {
                    this.handleUploadComplete(data.file, data.result);
                }
            });
        }
    }

    async handleFileSelected(file) {
        // Store the original file
        this.workflowData.originalFile = file;
        this.workflowData.originalImageUrl = URL.createObjectURL(file);
        
        // Update step status
        this.updateStepStatus('upload', true);
        this.enableStep('crop');
    }

    async handleUploadComplete(_file, _result) {
        // Move to crop step
        await this.goToStep('crop');
    }

    async goToStep(stepId) {
        this.currentStep = stepId;
        
        // Update template state
        this.stepUpload = stepId === 'upload';
        this.stepCrop = stepId === 'crop';
        this.stepEdit = stepId === 'edit';
        this.stepResults = stepId === 'results';

        // Initialize the appropriate view
        switch (stepId) {
            case 'crop':
                await this.initializeCropView();
                break;
            case 'edit':
                await this.initializeEditorView();
                break;
            case 'results':
                await this.showResults();
                break;
        }

        // Re-render to show current step
        await this.render();
    }

    async initializeCropView() {
        if (!this.workflowData.originalImageUrl) return;

        this.cropView = new ImageCropView({
            containerId: 'crop-container',
            imageUrl: this.workflowData.originalImageUrl,
            cropAndScale: { width: 800, height: 600 }, // Standard output size
            showGrid: true,
            allowPan: true,
            allowZoom: true
        });

        this.addChild(this.cropView);



        // Update step status
        this.updateStepStatus('crop', false);
        this.setStepActive('crop');
    }

    async initializeEditorView() {
        if (!this.workflowData.croppedImageUrl) return;

        this.editorView = new ImageEditor({
            containerId: 'editor-container',
            imageUrl: this.workflowData.croppedImageUrl,
            showToolbar: true,
            allowTransform: true,
            allowCrop: false, // Already cropped
            allowFilters: true,
            allowExport: false, // We'll handle export
            allowHistory: true,
            startMode: 'filters'
        });

        this.addChild(this.editorView);

        // Update step status
        this.updateStepStatus('edit', false);
        this.setStepActive('edit');
    }

    async showResults() {
        this.showResultsSection = true;
        
        // Prepare result data for template
        this.results = {
            original: {
                url: this.workflowData.originalImageUrl,
                filename: this.workflowData.originalFile?.name || 'Original',
                size: this.workflowData.originalFile ? this.formatFileSize(this.workflowData.originalFile.size) : 'Unknown'
            },
            cropped: {
                url: this.workflowData.croppedImageUrl,
                filename: 'Cropped Image',
                size: 'Estimated'
            },
            edited: {
                url: this.workflowData.editedImageUrl,
                filename: 'Final Result',
                size: 'Estimated'
            }
        };

        this.updateStepStatus('results', true);
        this.setStepActive('results');
    }

    // Action handlers
    async onActionGoToStep(action, event, element) {
        const step = element.getAttribute('data-step');
        if (step) {
            await this.goToStep(step);
        }
    }

    async onActionDownloadResult(action, event, element) {
        // Debug logging to understand what's being passed
        console.log('[ImagePage] onActionDownloadResult called with:', {
            action,
            event: event?.type,
            element: element?.tagName,
            eventTarget: event?.target?.tagName,
            eventCurrentTarget: event?.currentTarget?.tagName
        });
        
        // Handle case where element might be undefined
        let type = 'edited'; // default fallback
        
        if (element && element.getAttribute) {
            type = element.getAttribute('data-type') || 'edited';
            console.log('[ImagePage] Got type from element:', type);
        } else if (event && event.target && event.target.getAttribute) {
            // Fallback to event.target if element is not provided
            type = event.target.getAttribute('data-type') || 'edited';
            console.log('[ImagePage] Got type from event.target:', type);
        } else {
            console.warn('[ImagePage] No element provided for download-result action, using default');
        }
        
        await this.downloadResult(type);
    }

    async onActionCropComplete(_action, _event, _element) {
        if (!this.cropView) {
            console.warn('[ImagePage] No crop view available');
            return;
        }

        try {
            // Get cropped image as blob
            const blob = await this.cropView.exportImageBlob();
            if (!blob) {
                throw new Error('Failed to export cropped image');
            }
            
            this.workflowData.croppedImageUrl = URL.createObjectURL(blob);
        
            // Exit crop mode to clean up UI
            this.cropView.exitCropMode();
        
            // Update step and move to edit
            this.updateStepStatus('crop', true);
            this.enableStep('edit');
            await this.goToStep('edit');
        } catch (error) {
            console.error('[ImagePage] Crop failed:', error);
            const app = this.getApp();
            if (app) {
                app.showError(`Failed to apply crop: ${error.message}`);
            }
        }
    }

    async onActionEditComplete(_action, _event, _element) {
        if (!this.editorView) {
            console.warn('[ImagePage] No editor view available');
            return;
        }

        try {
            // Get edited image data URL
            const imageData = this.editorView.getCurrentImageData();
            if (!imageData) {
                throw new Error('Failed to export edited image');
            }
            
            // If it's already a data URL, use it directly; otherwise convert blob to URL
            if (typeof imageData === 'string') {
                this.workflowData.editedImageUrl = imageData;
            } else {
                // Handle blob case
                this.workflowData.editedImageUrl = URL.createObjectURL(imageData);
            }
            
            // Update step and show results
            this.updateStepStatus('edit', true);
            this.enableStep('results');
            await this.goToStep('results');
        } catch (error) {
            console.error('[ImagePage] Edit failed:', error);
            const app = this.getApp();
            if (app) {
                app.showError(`Failed to complete editing: ${error.message}`);
            }
        }
    }

    async onActionRestart(_action, _event, _element) {
        try {
            // Clean up URLs
            if (this.workflowData.originalImageUrl) {
                URL.revokeObjectURL(this.workflowData.originalImageUrl);
            }
            if (this.workflowData.croppedImageUrl) {
                URL.revokeObjectURL(this.workflowData.croppedImageUrl);
            }
            if (this.workflowData.editedImageUrl) {
                URL.revokeObjectURL(this.workflowData.editedImageUrl);
            }

            // Reset state
            this.workflowData = {
                originalFile: null,
                originalImageUrl: null,
                croppedImageUrl: null,
                editedImageUrl: null
            };

            // Reset steps
            this.steps.forEach(step => {
                step.active = step.id === 'upload';
                step.completed = false;
            });

            this.showResultsSection = false;
            await this.goToStep('upload');
            
            const app = this.getApp();
            if (app) {
                app.showInfo('Workflow restarted');
            }
        } catch (error) {
            console.error('[ImagePage] Restart failed:', error);
        }
    }

    async downloadResult(type = 'edited') {
        const url = this.workflowData[`${type}ImageUrl`];
        if (!url) {
            console.warn(`[ImagePage] No ${type} image available for download`);
            const app = this.getApp();
            if (app) {
                app.showWarning(`No ${type} image available for download`);
            }
            return;
        }

        try {
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-image.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            const app = this.getApp();
            if (app) {
                app.showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} image downloaded`);
            }
        } catch (error) {
            console.error(`[ImagePage] Download failed:`, error);
            const app = this.getApp();
            if (app) {
                app.showError('Failed to download image');
            }
        }
    }

    // Catch-all action handler for debugging
    async onActionDefault(action, event, element) {
        // Known child view actions that we don't need to handle
        const childViewActions = ['apply-preset', 'set-aspect-ratio', 'toggle-auto-fit', 'switch-mode', 'undo', 'redo', 'reset', 'export'];
        
        if (childViewActions.includes(action)) {
            // Silently ignore child view actions - they handle their own
            return;
        }
        
        // Only log and warn about actions that might be meant for ImagePage
        console.warn(`[ImagePage] Unhandled action: ${action}`, { event, element });
        // Don't show user warning - just log for debugging
    }

    // Helper methods
    updateStepStatus(stepId, completed) {
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.completed = completed;
        }
    }

    setStepActive(stepId) {
        this.steps.forEach(step => {
            step.active = step.id === stepId;
        });
    }

    enableStep(stepId) {
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.enabled = true;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Cleanup
    async onDestroy() {
        // Clean up object URLs
        if (this.workflowData.originalImageUrl) {
            URL.revokeObjectURL(this.workflowData.originalImageUrl);
        }
        if (this.workflowData.croppedImageUrl) {
            URL.revokeObjectURL(this.workflowData.croppedImageUrl);
        }
        if (this.workflowData.editedImageUrl) {
            URL.revokeObjectURL(this.workflowData.editedImageUrl);
        }

        await super.onDestroy();
    }
}

export default ImagePage;