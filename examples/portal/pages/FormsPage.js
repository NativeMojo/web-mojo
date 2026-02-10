/**
 * FormsPage - Demonstrates new FormBuilder/FormView architecture
 * Showcases group layouts, enhanced fields, EventDelegate integration
 */

import { Page } from 'web-mojo';
import FormView from '@core/forms/FormView.js';
import { TagInput } from '@core/forms/inputs/index.js';

class FormsPage extends Page {
    static pageName = 'forms';
    static title = 'Forms - Enhanced Components';
    static icon = 'bi-input-cursor-text';
    static route = 'forms';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FormsPage.pageName,
            route: FormsPage.route,
            pageIcon: FormsPage.icon
        });

        this.profileForm = null;
        this.productForm = null;
        this.settingsForm = null;
        this.tagInputDemo = null;
    }

    async renderTemplate() {
        return `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h1 class="h3 mb-0">Enhanced Form Components</h1>
                                <p class="text-muted">New FormBuilder/FormView architecture with group layouts</p>
                            </div>
                            <div>
                                <button class="btn btn-outline-info btn-sm me-2" data-action="toggle-debug">
                                    <i class="bi bi-bug"></i> Debug Mode
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" data-action="reset-all">
                                    <i class="bi bi-arrow-clockwise"></i> Reset All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Debug Panel -->
                <div class="row mb-4" id="debug-panel" style="display: none;">
                    <div class="col-12">
                        <div class="card border-info">
                            <div class="card-header bg-info text-white">
                                <h6 class="mb-0"><i class="bi bi-terminal me-2"></i>Debug Console</h6>
                            </div>
                            <div class="card-body">
                                <pre id="debug-output" class="bg-dark text-light p-3 rounded" style="max-height: 200px; overflow-y: auto;"></pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Profile Form with Group Layout -->
                <div class="row mb-5">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-person me-2"></i>
                                    User Profile Form
                                    <small class="text-muted ms-2">Group Layout + Enhanced Fields</small>
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="profile-form"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Product Form with Advanced Fields -->
                <div class="row mb-5">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-box me-2"></i>
                                    Product Management Form
                                    <small class="text-muted ms-2">Image Upload + Switch + Search</small>
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="product-form"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Form -->
                <div class="row mb-5">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-gear me-2"></i>
                                    Application Settings
                                    <small class="text-muted ms-2">Switches + Range + Validation</small>
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="settings-form"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tag Input Demo -->
                <div class="row mb-5">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-tags me-2"></i>
                                    Tag Input Component
                                    <small class="text-muted ms-2">Advanced Field Component</small>
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label class="form-label">Skills</label>
                                        <div id="tag-input-demo"></div>
                                        <div class="form-text">Try typing: javascript,react,node (comma separated)</div>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Tag Events</h6>
                                        <div id="tag-events" class="bg-light p-3 rounded small" style="height: 200px; overflow-y: auto;">
                                            <em>Tag events will appear here...</em>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Inputs Demo -->
                <div class="row mb-5">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-stars me-2"></i>
                                    Enhanced Input Types
                                    <small class="text-muted ms-2">Date Pickers, Collections, Tags</small>
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="enhanced-form"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Form Values Display -->
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="bi bi-code me-2"></i>
                                    Form Values
                                    <small class="text-muted ms-2">Live Data Display</small>
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <h6>Profile Form</h6>
                                        <pre id="profile-values" class="bg-light p-2 small" style="max-height: 300px; overflow-y: auto;">{}</pre>
                                    </div>
                                    <div class="col-md-3">
                                        <h6>Product Form</h6>
                                        <pre id="product-values" class="bg-light p-2 small" style="max-height: 300px; overflow-y: auto;">{}</pre>
                                    </div>
                                    <div class="col-md-3">
                                        <h6>Settings Form</h6>
                                        <pre id="settings-values" class="bg-light p-2 small" style="max-height: 300px; overflow-y: auto;">{}</pre>
                                    </div>
                                    <div class="col-md-3">
                                        <h6>Enhanced Form</h6>
                                        <pre id="enhanced-values" class="bg-light p-2 small" style="max-height: 300px; overflow-y: auto;">{}</pre>
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

        // Initialize all forms
        this.initializeProfileForm();
        this.initializeProductForm();
        this.initializeSettingsForm();
        this.initializeTagInputDemo();
        this.initializeEnhancedForm();

        // Set up debug logging
        this.debugMode = false;
        this.setupDebugLogging();
    }

    // ========================================
    // Form Initialization
    // ========================================

    initializeProfileForm() {
        this.profileForm = new FormView({
            fileHandling: 'base64', // Use base64 for small cropped images like avatars
            formConfig: {
                fields: [
                    // Header
                    {
                        type: 'header',
                        text: 'Personal Information',
                        level: 4,
                        class: 'text-primary mb-3'
                    },

                    // Avatar + Basic Info Group
                    {
                        type: 'group',
                        columns: { xs: 12, sm: 12, md: 4, lg: 3 },
                        title: 'Avatar',
                        fields: [
                            {
                                type: 'image',
                                name: 'avatar',
                                size: 'lg',
                                imageSize: { width: 200, height: 200 },
                                placeholder: 'Upload avatar',
                                help: 'Square images work best'
                            },
                            {
                                type: 'switch',
                                name: 'is_active',
                                label: 'Active Profile',
                                size: 'lg'
                            }
                        ]
                    },

                    // Details Group
                    {
                        type: 'group',
                        columns: { xs: 12, sm: 12, md: 8, lg: 9 },
                        title: 'Details',
                        fields: [
                            {
                                type: 'text',
                                name: 'first_name',
                                label: 'First Name',
                                required: true,
                                columns: 6,
                                placeholder: 'Enter first name'
                            },
                            {
                                type: 'text',
                                name: 'last_name',
                                label: 'Last Name',
                                required: true,
                                columns: 6,
                                placeholder: 'Enter last name'
                            },
                            {
                                type: 'email',
                                name: 'email',
                                label: 'Email Address',
                                required: true,
                                columns: 8,
                                placeholder: 'user@example.com'
                            },
                            {
                                type: 'tel',
                                name: 'phone',
                                label: 'Phone',
                                columns: 4,
                                placeholder: '(555) 123-4567'
                            },
                            {
                                type: 'textarea',
                                name: 'bio',
                                label: 'Biography',
                                rows: 4,
                                placeholder: 'Tell us about yourself...'
                            }
                        ]
                    }
                ],
                buttons: [
                    { type: 'submit', label: 'Save Profile', class: 'btn-primary' },
                    { type: 'reset', label: 'Reset', class: 'btn-outline-secondary' }
                ]
            },
            containerId: 'profile-form'
        });

        // Event handlers
        this.profileForm.on('submit', (data) => {
            this.log('Profile form submitted (JSON with base64 files):', {
                submissionType: 'base64',
                dataType: 'JSON object',
                hasFiles: this.profileForm.hasFiles(data.data),
                sampleData: this.getSampleFormData(data.data),
                data: data
            });
            this.showSuccess('Profile saved successfully!');
        });

        this.profileForm.on('change', async (data) => {
            this.updateFormValues('profile', data.data || await this.profileForm.getFormData());
        });

        this.profileForm.on('switch:toggle', (data) => {
            this.log('Switch toggled:', data);
        });

        this.profileForm.on('image:selected', (data) => {
            if (data.cropped) {
                this.log(`Image cropped for ${data.field} (will convert to base64):`, {
                    field: data.field,
                    submissionType: 'base64',
                    originalFileName: data.originalFile?.name,
                    croppedFileName: data.file?.name,
                    fileSize: data.file?.size,
                    cropData: data.cropData
                });
            } else {
                this.log('Image selected (will convert to base64):', { 
                    field: data.field, 
                    fileName: data.file?.name,
                    fileSize: data.file?.size,
                    submissionType: 'base64'
                });
            }
        });

        this.profileForm.on('image:dropped', (data) => {
            this.log('Image dropped:', { field: data.field, fileName: data.file?.name });
        });

        this.addChild(this.profileForm);
    }

    initializeProductForm() {
        this.productForm = new FormView({
            fileHandling: 'multipart', // Use multipart for larger product images
            formConfig: {
                fields: [
                    // Product Images Group
                    {
                        type: 'group',
                        columns: { xs: 12, sm: 12, md: 5, lg: 4 },
                        title: 'Product Images',
                        fields: [
                            {
                                type: 'image',
                                name: 'main_image',
                                label: 'Main Image',
                                size: 'xl',
                                imageSize: { width: 400, height: 300 },
                                required: true,
                                placeholder: 'Drop main product image'
                            },
                            {
                                type: 'image',
                                name: 'thumbnail',
                                label: 'Thumbnail',
                                size: 'sm',
                                imageSize: { width: 100, height: 100 },
                                placeholder: 'Small thumbnail image',
                                help: 'Square thumbnail for listings'
                            }
                        ]
                    },

                    // Product Details Group
                    {
                        type: 'group',
                        columns: { xs: 12, sm: 12, md: 7, lg: 8 },
                        title: 'Product Information',
                        fields: [
                            {
                                type: 'text',
                                name: 'product_name',
                                label: 'Product Name',
                                required: true,
                                columns: 8,
                                placeholder: 'Enter product name'
                            },
                            {
                                type: 'switch',
                                name: 'featured',
                                label: 'Featured Product',
                                columns: 4
                            },
                            {
                                type: 'select',
                                name: 'category',
                                label: 'Category',
                                searchable: true,
                                columns: 6,
                                options: [
                                    { value: 'electronics', label: 'Electronics' },
                                    { value: 'clothing', label: 'Clothing' },
                                    { value: 'books', label: 'Books' },
                                    { value: 'home', label: 'Home & Garden' },
                                    { value: 'sports', label: 'Sports & Outdoors' },
                                    { value: 'toys', label: 'Toys & Games' }
                                ]
                            },
                            {
                                type: 'number',
                                name: 'price',
                                label: 'Price ($)',
                                min: 0,
                                step: 0.01,
                                columns: 3,
                                placeholder: '0.00'
                            },
                            {
                                type: 'number',
                                name: 'stock',
                                label: 'Stock',
                                min: 0,
                                columns: 3,
                                placeholder: '0'
                            },
                            {
                                type: 'textarea',
                                name: 'description',
                                label: 'Description',
                                rows: 4,
                                placeholder: 'Product description...'
                            }
                        ]
                    },

                    // Additional Images
                    {
                        type: 'group',
                        columns: 12,
                        title: 'Additional Images',
                        fields: [
                            {
                                type: 'image',
                                name: 'image_1',
                                label: 'Image 1',
                                size: 'md',
                                columns: 3
                            },
                            {
                                type: 'image',
                                name: 'image_2',
                                label: 'Image 2',
                                size: 'md',
                                columns: 3
                            },
                            {
                                type: 'image',
                                name: 'image_3',
                                label: 'Image 3',
                                size: 'md',
                                columns: 3
                            },
                            {
                                type: 'image',
                                name: 'image_4',
                                label: 'Image 4',
                                size: 'md',
                                columns: 3
                            }
                        ]
                    }
                ],
                buttons: [
                    { type: 'submit', label: 'Save Product', class: 'btn-success' },
                    { type: 'button', label: 'Preview', class: 'btn-info', action: 'preview-product' },
                    { type: 'reset', label: 'Clear', class: 'btn-outline-secondary' }
                ]
            },
            containerId: 'product-form'
        });

        // Event handlers
        this.productForm.on('submit', (data) => {
            this.log('Product form submitted (FormData with File objects):', {
                submissionType: 'multipart',
                dataType: 'FormData',
                hasFiles: this.productForm.hasFiles(data.data),
                formDataEntries: this.getFormDataEntries(data.data),
                data: data
            });
            this.showSuccess('Product saved successfully!');
        });

        this.productForm.on('change', async (data) => {
            this.updateFormValues('product', data.data || await this.productForm.getFormData());
        });

        this.productForm.on('image:selected', (data) => {
            if (data.cropped) {
                this.log(`Image cropped for ${data.field} (will submit as multipart):`, {
                    field: data.field,
                    submissionType: 'multipart',
                    originalFileName: data.originalFile?.name,
                    croppedFileName: data.file?.name,
                    fileSize: data.file?.size,
                    cropData: data.cropData
                });
                this.showInfo(`Image cropped and resized for ${data.field}`);
            } else {
                this.log('Image selected (will submit as multipart):', { 
                    field: data.field, 
                    fileName: data.file?.name,
                    fileSize: data.file?.size,
                    submissionType: 'multipart'
                });
            }
        });

        this.addChild(this.productForm);
    }

    initializeSettingsForm() {
        this.settingsForm = new FormView({
            formConfig: {
                fields: [
                    // Notifications Group
                    {
                        type: 'group',
                        columns: { xs: 12, sm: 12, md: 6, lg: 4, xl: 3 },
                        title: 'Notifications',
                        fields: [
                            {
                                type: 'switch',
                                name: 'email_notifications',
                                label: 'Email Notifications',
                                size: 'md'
                            },
                            {
                                type: 'switch',
                                name: 'push_notifications',
                                label: 'Push Notifications',
                                size: 'md'
                            },
                            {
                                type: 'switch',
                                name: 'sms_notifications',
                                label: 'SMS Notifications',
                                size: 'md'
                            }
                        ]
                    },

                    // Preferences Group
                    {
                        type: 'group',
                        columns: { xs: 12, sm: 12, md: 6, lg: 8, xl: 9 },
                        title: 'Preferences',
                        fields: [
                            {
                                type: 'select',
                                name: 'theme',
                                label: 'Theme',
                                options: [
                                    { value: 'light', label: 'Light' },
                                    { value: 'dark', label: 'Dark' },
                                    { value: 'auto', label: 'Auto' }
                                ]
                            },
                            {
                                type: 'select',
                                name: 'language',
                                label: 'Language',
                                options: [
                                    { value: 'en', label: 'English' },
                                    { value: 'es', label: 'Spanish' },
                                    { value: 'fr', label: 'French' },
                                    { value: 'de', label: 'German' }
                                ]
                            },
                            {
                                type: 'range',
                                name: 'font_size',
                                label: 'Font Size',
                                min: 12,
                                max: 24,
                                value: 16,
                                help: 'Adjust font size preference'
                            }
                        ]
                    },

                    // Security Settings
                    {
                        type: 'group',
                        columns: 12,
                        title: 'Security Settings',
                        fields: [
                            {
                                type: 'checkbox',
                                name: 'two_factor',
                                label: 'Enable Two-Factor Authentication',
                                columns: 4
                            },
                            {
                                type: 'checkbox',
                                name: 'login_alerts',
                                label: 'Login Alerts',
                                columns: 4
                            },
                            {
                                type: 'checkbox',
                                name: 'session_timeout',
                                label: 'Auto Session Timeout',
                                columns: 4
                            }
                        ]
                    }
                ],
                buttons: [
                    { type: 'submit', label: 'Save Settings', class: 'btn-primary' },
                    { type: 'button', label: 'Export', class: 'btn-outline-info', action: 'export-settings' },
                    { type: 'reset', label: 'Reset to Defaults', class: 'btn-outline-warning' }
                ]
            },
            containerId: 'settings-form'
        });

        // Event handlers
        this.settingsForm.on('submit', (data) => {
            this.log('Settings form submitted:', data);
            this.showSuccess('Settings saved successfully!');
        });

        this.settingsForm.on('change', async (data) => {
            this.updateFormValues('settings', data.data || await this.settingsForm.getFormData());
        });

        this.settingsForm.on('range:changed', (data) => {
            this.log('Range changed:', data);
        });

        this.addChild(this.settingsForm);
    }

    initializeTagInputDemo() {
        this.tagInputDemo = new TagInput({
            name: 'skills',
            placeholder: 'Add skills...',
            maxTags: 20,
            value: 'javascript,html,css',
            containerId: 'tag-input-demo'
        });

        // Event handlers for tag input
        this.tagInputDemo.on('tag:added', (data) => {
            this.logTagEvent('Tag Added', data.tag);
        });

        this.tagInputDemo.on('tag:removed', (data) => {
            this.logTagEvent('Tag Removed', data.tag);
        });

        this.tagInputDemo.on('change', (data) => {
            this.logTagEvent('Tags Changed', data.tags.join(', '));
        });

        this.addChild(this.tagInputDemo);
    }

    initializeEnhancedForm() {
        this.enhancedForm = new FormView({
            formConfig: {
                fields: [
                    // Header
                    {
                        type: 'header',
                        text: 'Enhanced Input Types',
                        level: 4,
                        class: 'text-primary mb-3'
                    },

                    // Tag Input Field
                    {
                        type: 'tag',
                        name: 'project_tags',
                        label: 'Project Tags',
                        placeholder: 'Add tags (press Enter or comma)',
                        maxTags: 15,
                        separator: ',',
                        allowDuplicates: false,
                        help: 'Enhanced tag input with autocomplete',
                        columns: 6
                    },

                    // Collection Select Field (placeholder - would need actual collection)
                    {
                        type: 'collection',
                        name: 'category',
                        label: 'Category',
                        placeholder: 'Search categories...',
                        labelField: 'name',
                        valueField: 'id',
                        maxItems: 10,
                        help: 'Searchable collection dropdown (requires Collection class)',
                        columns: 6
                    },

                    // Enhanced Date Picker
                    {
                        type: 'datepicker',
                        name: 'start_date',
                        label: 'Project Start Date',
                        format: 'YYYY-MM-DD',
                        displayFormat: 'MMM DD, YYYY',
                        placeholder: 'Select start date...',
                        help: 'Enhanced date picker with Easepick',
                        columns: 6
                    },

                    // Date Range Picker
                    {
                        type: 'daterange',
                        name: 'project_duration',
                        label: 'Project Duration',
                        format: 'YYYY-MM-DD',
                        displayFormat: 'MMM DD, YYYY',
                        separator: ' to ',
                        placeholder: 'Select date range...',
                        help: 'Date range picker with Easepick',
                        columns: 6
                    },

                    // Divider
                    {
                        type: 'divider',
                        columns: 12
                    },

                    // Standard date field for comparison
                    {
                        type: 'date',
                        name: 'standard_date',
                        label: 'Standard HTML5 Date',
                        help: 'Native HTML5 date picker for comparison',
                        columns: 6
                    },

                    // Notes
                    {
                        type: 'textarea',
                        name: 'project_notes',
                        label: 'Project Notes',
                        placeholder: 'Enter project details...',
                        rows: 3,
                        help: 'Additional project information',
                        columns: 6
                    }
                ],
                buttons: [
                    { type: 'submit', label: 'Save Enhanced Data', class: 'btn-primary' },
                    { type: 'reset', label: 'Clear Form', class: 'btn-outline-secondary' }
                ]
            },
            containerId: 'enhanced-form'
        });

        // Event handlers
        this.enhancedForm.on('submit', (data) => {
            this.log('Enhanced form submitted:', data);
            this.showSuccess('Enhanced form data saved!');
        });

        this.enhancedForm.on('change', async (data) => {
            this.updateFormValues('enhanced', data.data || await this.enhancedForm.getFormData());
        });

        this.enhancedForm.on('field:change', (data) => {
            this.log(`Enhanced form field changed: ${data.field} = ${data.value}`);
        });

        this.addChild(this.enhancedForm);
    }

    // ========================================
    // Event Handlers
    // ========================================

    async onActionToggleDebug(_event, element) {
        this.debugMode = !this.debugMode;
        const panel = this.element.querySelector('#debug-panel');
        const icon = element.querySelector('i');

        if (this.debugMode) {
            panel.style.display = 'block';
            icon.className = 'bi bi-bug-fill';
            element.classList.add('btn-info');
            element.classList.remove('btn-outline-info');
            this.log('Debug mode enabled');
        } else {
            panel.style.display = 'none';
            icon.className = 'bi bi-bug';
            element.classList.remove('btn-info');
            element.classList.add('btn-outline-info');
        }
    }

    async onActionResetAll(_event, _element) {
        if (this.profileForm) this.profileForm.reset();
        if (this.productForm) this.productForm.reset();
        if (this.settingsForm) this.settingsForm.reset();
        if (this.enhancedForm) this.enhancedForm.reset();
        if (this.tagInputDemo) await this.tagInputDemo.clearTags();

        // Clear value displays
        this.updateFormValues('profile', {});
        this.updateFormValues('product', {});
        this.updateFormValues('settings', {});
        this.updateFormValues('enhanced', {});

        this.showInfo('All forms reset');
        this.log('All forms reset');
    }

    async onActionPreviewProduct(_event, _element) {
        const productData = await this.productForm.getFormData();
        this.log('Product preview requested:', productData);
        this.showInfo('Product preview - check debug console');
    }

    async onActionExportSettings(_event, _element) {
        const settingsData = await this.settingsForm.getFormData();
        const dataStr = JSON.stringify(settingsData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'settings.json';
        a.click();

        URL.revokeObjectURL(url);
        this.showSuccess('Settings exported successfully');
    }

    // ========================================
    // Debug Helpers
    // ========================================

    getSampleFormData(data) {
        if (data instanceof FormData) {
            return 'FormData object - see formDataEntries';
        }
        
        // Show sample of JSON data, truncating base64 strings
        const sample = {};
        Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'string' && value.startsWith('data:image/')) {
                sample[key] = value.substring(0, 50) + '... (base64 image)';
            } else {
                sample[key] = value;
            }
        });
        return sample;
    }

    getFormDataEntries(data) {
        if (!(data instanceof FormData)) {
            return 'Not FormData';
        }
        
        const entries = {};
        for (const [key, value] of data.entries()) {
            if (value instanceof File) {
                entries[key] = `File: ${value.name} (${value.size} bytes, ${value.type})`;
            } else {
                entries[key] = value;
            }
        }
        return entries;
    }

    // ========================================
    // Helper Methods
    // ========================================

    setupDebugLogging() {
        // Capture console.log for debug panel
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            originalConsoleLog.apply(console, args);
            if (this.debugMode) {
                const output = this.element.querySelector('#debug-output');
                if (output) {
                    const timestamp = new Date().toLocaleTimeString();
                    const message = args.map(arg =>
                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                    ).join(' ');
                    output.textContent += `[${timestamp}] ${message}\n`;
                    output.scrollTop = output.scrollHeight;
                }
            }
        };
    }

    log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const output = this.element.querySelector('#debug-output');
        if (output && this.debugMode) {
            const logMessage = data
                ? `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}\n`
                : `[${timestamp}] ${message}\n`;
            output.textContent += logMessage;
            output.scrollTop = output.scrollHeight;
        }

        // Also log to console
        if (data) {
            this.originalLog?.(message, data) || console.log(message, data);
        } else {
            this.originalLog?.(message) || console.log(message);
        }
    }

    logTagEvent(eventType, data) {
        const tagEvents = this.element.querySelector('#tag-events');
        if (tagEvents) {
            const timestamp = new Date().toLocaleTimeString();
            const eventDiv = document.createElement('div');
            eventDiv.innerHTML = `<strong>[${timestamp}]</strong> ${eventType}: ${data}`;
            tagEvents.appendChild(eventDiv);
            tagEvents.scrollTop = tagEvents.scrollHeight;
        }
    }

    updateFormValues(formName, data) {
        const container = this.element.querySelector(`#${formName}-values`);
        if (container) {
            // Clean up data for display (remove File objects, etc.)
            const cleanData = {};
            Object.entries(data).forEach(([key, value]) => {
                if (value instanceof File) {
                    cleanData[key] = { name: value.name, size: value.size, type: value.type };
                } else if (value instanceof FileList) {
                    cleanData[key] = Array.from(value).map(f => ({ name: f.name, size: f.size, type: f.type }));
                } else {
                    cleanData[key] = value;
                }
            });
            container.textContent = JSON.stringify(cleanData, null, 2);
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 4000);
    }

    async onBeforeDestroy() {
        // Restore original console.log
        if (this.originalLog) {
            console.log = this.originalLog;
        }

        await super.onBeforeDestroy();
    }
}

export default FormsPage;
