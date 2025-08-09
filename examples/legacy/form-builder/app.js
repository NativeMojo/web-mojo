/**
 * MOJO Framework - Form Builder Example
 * Dynamic form generation with validation and Bootstrap 5 styling
 */

// Import MOJO framework components
import View from '../../src/core/View.js';

// Configuration Panel Component
class ConfigurationPanel extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="config-panel">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Form Title</label>
                        <input type="text" class="form-control form-control-sm" 
                               value="{{formTitle}}" data-action="updateFormTitle">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Form Description</label>
                        <textarea class="form-control form-control-sm" rows="2" 
                                  data-action="updateFormDescription">{{formDescription}}</textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Submit Button Text</label>
                        <input type="text" class="form-control form-control-sm" 
                               value="{{submitText}}" data-action="updateSubmitText">
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Form Style</label>
                        <select class="form-select form-select-sm" data-action="updateFormStyle">
                            <option value="default" {{#isDefault}}selected{{/isDefault}}>Default</option>
                            <option value="bordered" {{#isBordered}}selected{{/isBordered}}>Bordered</option>
                            <option value="floating" {{#isFloating}}selected{{/isFloating}}>Floating Labels</option>
                        </select>
                    </div>
                    
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary btn-sm" data-action="generateForm">
                            <i class="bi bi-magic me-1"></i>Generate Form
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" data-action="resetForm">
                            <i class="bi bi-arrow-clockwise me-1"></i>Reset
                        </button>
                    </div>
                </div>
            `,
            data: {
                formTitle: 'My Custom Form',
                formDescription: 'Please fill out this form with your information.',
                submitText: 'Submit Form',
                formStyle: 'default',
                isDefault: true,
                isBordered: false,
                isFloating: false
            },
            className: 'configuration-panel',
            replaceContent: true,
            ...options
        });
        
        this.formBuilder = options.formBuilder;
    }

    async onActionUpdateFormTitle(event, element) {
        this.updateData({ formTitle: element.value });
        this.formBuilder.updateFormConfig({ title: element.value });
    }

    async onActionUpdateFormDescription(event, element) {
        this.updateData({ formDescription: element.value });
        this.formBuilder.updateFormConfig({ description: element.value });
    }

    async onActionUpdateSubmitText(event, element) {
        this.updateData({ submitText: element.value });
        this.formBuilder.updateFormConfig({ submitText: element.value });
    }

    async onActionUpdateFormStyle(event, element) {
        const style = element.value;
        this.updateData({ 
            formStyle: style,
            isDefault: style === 'default',
            isBordered: style === 'bordered',
            isFloating: style === 'floating'
        });
        this.formBuilder.updateFormConfig({ style: style });
    }

    async onActionGenerateForm(event, element) {
        this.formBuilder.generateForm();
        this.showSuccess('Form generated successfully!');
    }

    async onActionResetForm(event, element) {
        this.formBuilder.resetForm();
        this.showInfo('Form reset to defaults');
    }
}

// Field Library Component
class FieldLibrary extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="field-library">
                    <div class="mb-2">
                        <small class="text-muted fw-bold d-block">INPUT FIELDS</small>
                        <div class="d-grid gap-1">
                            {{#inputFields}}
                            <button class="btn btn-outline-secondary btn-sm text-start" 
                                    data-action="addField" data-field-type="{{type}}">
                                <i class="bi bi-{{icon}} me-1"></i>{{name}}
                            </button>
                            {{/inputFields}}
                        </div>
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-muted fw-bold d-block">SELECTION FIELDS</small>
                        <div class="d-grid gap-1">
                            {{#selectionFields}}
                            <button class="btn btn-outline-secondary btn-sm text-start" 
                                    data-action="addField" data-field-type="{{type}}">
                                <i class="bi bi-{{icon}} me-1"></i>{{name}}
                            </button>
                            {{/selectionFields}}
                        </div>
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-muted fw-bold d-block">LAYOUT</small>
                        <div class="d-grid gap-1">
                            {{#layoutFields}}
                            <button class="btn btn-outline-secondary btn-sm text-start" 
                                    data-action="addField" data-field-type="{{type}}">
                                <i class="bi bi-{{icon}} me-1"></i>{{name}}
                            </button>
                            {{/layoutFields}}
                        </div>
                    </div>
                </div>
            `,
            data: {
                inputFields: [
                    { type: 'text', name: 'Text Input', icon: 'type' },
                    { type: 'email', name: 'Email', icon: 'envelope' },
                    { type: 'password', name: 'Password', icon: 'lock' },
                    { type: 'number', name: 'Number', icon: '123' },
                    { type: 'tel', name: 'Phone', icon: 'telephone' },
                    { type: 'textarea', name: 'Textarea', icon: 'text-paragraph' }
                ],
                selectionFields: [
                    { type: 'select', name: 'Dropdown', icon: 'menu-down' },
                    { type: 'radio', name: 'Radio Group', icon: 'record-circle' },
                    { type: 'checkbox', name: 'Checkboxes', icon: 'check-square' },
                    { type: 'switch', name: 'Toggle Switch', icon: 'toggle-on' }
                ],
                layoutFields: [
                    { type: 'heading', name: 'Heading', icon: 'type-h1' },
                    { type: 'divider', name: 'Divider', icon: 'dash-lg' },
                    { type: 'spacer', name: 'Spacer', icon: 'arrows-expand' }
                ]
            },
            className: 'field-library',
            replaceContent: true,
            ...options
        });
        
        this.formBuilder = options.formBuilder;
    }

    async onActionAddField(event, element) {
        const fieldType = element.dataset.fieldType;
        this.formBuilder.addField(fieldType);
        
        // Visual feedback
        element.classList.add('btn-success');
        setTimeout(() => {
            element.classList.remove('btn-success');
        }, 200);
        
        this.showSuccess(`Added ${fieldType} field`);
    }
}

// Form Preview Component
class FormPreview extends View {
    constructor(options = {}) {
        super({
            template: `
                <div class="form-preview">
                    {{#showForm}}
                    <form class="{{formClass}}" data-action="submitForm">
                        <div class="mb-3">
                            <h5>{{config.title}}</h5>
                            {{#config.description}}
                            <p class="text-muted">{{config.description}}</p>
                            {{/config.description}}
                        </div>
                        
                        {{#fields}}
                        <div class="mb-3">
                            {{#isText}}
                            <label class="form-label">{{label}} {{#required}}<span class="text-danger">*</span>{{/required}}</label>
                            <input type="{{inputType}}" class="form-control" name="{{name}}" 
                                   placeholder="{{placeholder}}" {{#required}}required{{/required}}>
                            {{/isText}}
                            
                            {{#isTextarea}}
                            <label class="form-label">{{label}} {{#required}}<span class="text-danger">*</span>{{/required}}</label>
                            <textarea class="form-control" name="{{name}}" rows="3" 
                                      placeholder="{{placeholder}}" {{#required}}required{{/required}}></textarea>
                            {{/isTextarea}}
                            
                            {{#isSelect}}
                            <label class="form-label">{{label}} {{#required}}<span class="text-danger">*</span>{{/required}}</label>
                            <select class="form-select" name="{{name}}" {{#required}}required{{/required}}>
                                <option value="">Choose...</option>
                                {{#options}}
                                <option value="{{value}}">{{label}}</option>
                                {{/options}}
                            </select>
                            {{/isSelect}}
                            
                            {{#isRadio}}
                            <label class="form-label">{{label}} {{#required}}<span class="text-danger">*</span>{{/required}}</label>
                            <div>
                                {{#options}}
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="{{../name}}" value="{{value}}" id="{{../name}}_{{@index}}">
                                    <label class="form-check-label" for="{{../name}}_{{@index}}">{{label}}</label>
                                </div>
                                {{/options}}
                            </div>
                            {{/isRadio}}
                            
                            {{#isCheckbox}}
                            <label class="form-label">{{label}}</label>
                            <div>
                                {{#options}}
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="{{../name}}[]" value="{{value}}" id="{{../name}}_{{@index}}">
                                    <label class="form-check-label" for="{{../name}}_{{@index}}">{{label}}</label>
                                </div>
                                {{/options}}
                            </div>
                            {{/isCheckbox}}
                            
                            {{#isHeading}}
                            <h{{level}} class="{{headingClass}}">{{text}}</h{{level}}>
                            {{/isHeading}}
                            
                            {{#isDivider}}
                            <hr class="{{dividerClass}}">
                            {{/isDivider}}
                            
                            {{#isSpacer}}
                            <div style="height: {{height}}px;"></div>
                            {{/isSpacer}}
                        </div>
                        {{/fields}}
                        
                        {{#hasFields}}
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button type="button" class="btn btn-outline-secondary" data-action="resetFormData">
                                <i class="bi bi-arrow-clockwise me-1"></i>Reset
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-check-circle me-1"></i>{{config.submitText}}
                            </button>
                        </div>
                        {{/hasFields}}
                    </form>
                    {{/showForm}}
                    
                    {{^showForm}}
                    <div class="text-center py-5">
                        <i class="bi bi-plus-circle display-1 text-muted"></i>
                        <h6 class="mt-3 text-muted">No Form Fields Yet</h6>
                        <p class="text-muted mb-0">
                            Use the Field Library to add form fields
                            <br>
                            <small>Or try one of the quick demo buttons above</small>
                        </p>
                    </div>
                    {{/showForm}}
                </div>
            `,
            data: {
                showForm: false,
                hasFields: false,
                formClass: 'needs-validation',
                config: {
                    title: 'My Custom Form',
                    description: '',
                    submitText: 'Submit Form'
                },
                fields: []
            },
            className: 'form-preview',
            replaceContent: true,
            ...options
        });
        
        this.formBuilder = options.formBuilder;
    }

    updateForm(config, fields) {
        const hasFields = fields.length > 0;
        this.updateData({
            showForm: hasFields,
            hasFields: hasFields,
            config: config,
            fields: fields,
            formClass: `needs-validation ${config.style === 'bordered' ? 'border p-3 rounded' : ''}`
        });
    }

    async onActionSubmitForm(event, element) {
        event.preventDefault();
        
        const formData = new FormData(element);
        const data = Object.fromEntries(formData.entries());
        
        console.log('Form submitted with data:', data);
        
        // Simulate form submission
        element.classList.add('was-validated');
        
        if (element.checkValidity()) {
            this.showSuccess('Form submitted successfully! Check console for data.');
            setTimeout(() => {
                element.classList.remove('was-validated');
                element.reset();
            }, 2000);
        } else {
            this.showError('Please fill in all required fields correctly.');
        }
    }

    async onActionResetFormData(event, element) {
        const form = element.closest('form');
        form.classList.remove('was-validated');
        form.reset();
        this.showInfo('Form data cleared');
    }
}

// Main Form Builder Application
class FormBuilderApp {
    constructor() {
        this.config = {
            title: 'My Custom Form',
            description: 'Please fill out this form with your information.',
            submitText: 'Submit Form',
            style: 'default'
        };
        
        this.fields = [];
        this.fieldCounter = 0;
        this.changeCounter = 0;
        
        // Components
        this.configPanel = null;
        this.fieldLibrary = null;
        this.formPreview = null;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Form Builder App...');
            
            // Initialize components
            this.configPanel = new ConfigurationPanel({ formBuilder: this });
            this.fieldLibrary = new FieldLibrary({ formBuilder: this });
            this.formPreview = new FormPreview({ formBuilder: this });
            
            // Clear containers first
            const configContainer = document.getElementById('config-panel');
            if (configContainer) {
                configContainer.innerHTML = '';
            }
            
            const libraryContainer = document.getElementById('field-library');
            if (libraryContainer) {
                libraryContainer.innerHTML = '';
            }
            
            const previewContainer = document.getElementById('form-preview');
            if (previewContainer) {
                previewContainer.innerHTML = '';
            }
            
            // Render components
            await this.configPanel.render('#config-panel');
            await this.fieldLibrary.render('#field-library');
            await this.formPreview.render('#form-preview');
            
            // Setup demo buttons
            this.setupDemoButtons();
            
            // Setup statistics
            this.updateStatistics();
            
            console.log('✅ Form Builder initialized successfully!');
            
            // Make accessible for debugging
            window.formBuilder = this;
            
        } catch (error) {
            console.error('❌ Failed to initialize Form Builder:', error);
            this.showError('Failed to initialize form builder');
        }
    }

    setupDemoButtons() {
        // Contact Form Demo
        document.getElementById('demo-contact').addEventListener('click', () => {
            this.loadDemo('contact');
        });
        
        // Registration Form Demo
        document.getElementById('demo-registration').addEventListener('click', () => {
            this.loadDemo('registration');
        });
        
        // Survey Form Demo
        document.getElementById('demo-survey').addEventListener('click', () => {
            this.loadDemo('survey');
        });
    }

    loadDemo(demoType) {
        console.log(`📋 Loading ${demoType} form demo...`);
        
        this.resetForm();
        
        const demos = {
            contact: {
                config: {
                    title: 'Contact Us',
                    description: 'Get in touch with our team. We\'d love to hear from you!',
                    submitText: 'Send Message',
                    style: 'default'
                },
                fields: [
                    { type: 'text', label: 'Full Name', required: true },
                    { type: 'email', label: 'Email Address', required: true },
                    { type: 'tel', label: 'Phone Number', required: false },
                    { type: 'select', label: 'Subject', required: true, options: [
                        { value: 'general', label: 'General Inquiry' },
                        { value: 'support', label: 'Technical Support' },
                        { value: 'sales', label: 'Sales Question' }
                    ]},
                    { type: 'textarea', label: 'Message', required: true }
                ]
            },
            registration: {
                config: {
                    title: 'Account Registration',
                    description: 'Create your new account to get started.',
                    submitText: 'Create Account',
                    style: 'bordered'
                },
                fields: [
                    { type: 'heading', text: 'Personal Information', level: 4 },
                    { type: 'text', label: 'First Name', required: true },
                    { type: 'text', label: 'Last Name', required: true },
                    { type: 'email', label: 'Email Address', required: true },
                    { type: 'divider' },
                    { type: 'heading', text: 'Account Security', level: 4 },
                    { type: 'password', label: 'Password', required: true },
                    { type: 'password', label: 'Confirm Password', required: true },
                    { type: 'checkbox', label: 'Preferences', options: [
                        { value: 'newsletter', label: 'Subscribe to newsletter' },
                        { value: 'terms', label: 'I agree to the terms and conditions' }
                    ]}
                ]
            },
            survey: {
                config: {
                    title: 'User Experience Survey',
                    description: 'Help us improve by sharing your feedback.',
                    submitText: 'Submit Survey',
                    style: 'floating'
                },
                fields: [
                    { type: 'radio', label: 'How satisfied are you with our service?', required: true, options: [
                        { value: '5', label: 'Very Satisfied' },
                        { value: '4', label: 'Satisfied' },
                        { value: '3', label: 'Neutral' },
                        { value: '2', label: 'Unsatisfied' },
                        { value: '1', label: 'Very Unsatisfied' }
                    ]},
                    { type: 'checkbox', label: 'Which features do you use most?', options: [
                        { value: 'dashboard', label: 'Dashboard' },
                        { value: 'reports', label: 'Reports' },
                        { value: 'settings', label: 'Settings' },
                        { value: 'support', label: 'Support' }
                    ]},
                    { type: 'textarea', label: 'Additional Comments', required: false }
                ]
            }
        };
        
        const demo = demos[demoType];
        if (demo) {
            // Update configuration
            this.config = { ...demo.config };
            this.configPanel.updateData({
                formTitle: demo.config.title,
                formDescription: demo.config.description,
                submitText: demo.config.submitText,
                formStyle: demo.config.style,
                isDefault: demo.config.style === 'default',
                isBordered: demo.config.style === 'bordered',
                isFloating: demo.config.style === 'floating'
            });
            
            // Add fields
            demo.fields.forEach((fieldConfig, index) => {
                this.addFieldFromConfig(fieldConfig);
            });
            
            this.generateForm();
            this.configPanel.showSuccess(`${demoType} form demo loaded!`);
        }
    }

    addFieldFromConfig(fieldConfig) {
        const field = {
            id: `field_${++this.fieldCounter}`,
            name: `field_${this.fieldCounter}`,
            ...fieldConfig
        };
        
        // Add type-specific properties
        this.processFieldType(field);
        
        this.fields.push(field);
        this.changeCounter++;
    }

    addField(fieldType) {
        console.log(`➕ Adding ${fieldType} field...`);
        
        const fieldDefaults = {
            text: { label: 'Text Field', placeholder: 'Enter text...' },
            email: { label: 'Email Address', placeholder: 'Enter email...' },
            password: { label: 'Password', placeholder: 'Enter password...' },
            number: { label: 'Number', placeholder: 'Enter number...' },
            tel: { label: 'Phone Number', placeholder: 'Enter phone...' },
            textarea: { label: 'Text Area', placeholder: 'Enter details...' },
            select: { label: 'Dropdown', options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
            ]},
            radio: { label: 'Radio Group', options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
            ]},
            checkbox: { label: 'Checkboxes', options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
            ]},
            heading: { text: 'Section Heading', level: 3 },
            divider: {},
            spacer: { height: 20 }
        };
        
        const defaults = fieldDefaults[fieldType] || {};
        
        const field = {
            id: `field_${++this.fieldCounter}`,
            name: `field_${this.fieldCounter}`,
            type: fieldType,
            required: fieldType !== 'heading' && fieldType !== 'divider' && fieldType !== 'spacer',
            ...defaults
        };
        
        // Add type-specific properties
        this.processFieldType(field);
        
        this.fields.push(field);
        this.changeCounter++;
        this.updateStatistics();
        
        // Auto-generate if there are fields
        if (this.fields.length > 0) {
            this.generateForm();
        }
    }

    processFieldType(field) {
        // Set input type for text-based fields
        if (['text', 'email', 'password', 'number', 'tel'].includes(field.type)) {
            field.isText = true;
            field.inputType = field.type;
        } else if (field.type === 'textarea') {
            field.isTextarea = true;
        } else if (field.type === 'select') {
            field.isSelect = true;
        } else if (field.type === 'radio') {
            field.isRadio = true;
        } else if (field.type === 'checkbox') {
            field.isCheckbox = true;
        } else if (field.type === 'heading') {
            field.isHeading = true;
            field.headingClass = `h${field.level} mb-3`;
        } else if (field.type === 'divider') {
            field.isDivider = true;
            field.dividerClass = 'my-4';
        } else if (field.type === 'spacer') {
            field.isSpacer = true;
        }
    }

    updateFormConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.changeCounter++;
        this.updateStatistics();
    }

    generateForm() {
        console.log('🏗️ Generating form with config:', this.config);
        console.log('📋 Form fields:', this.fields);
        
        this.formPreview.updateForm(this.config, this.fields);
        this.updateStatistics();
    }

    resetForm() {
        console.log('🔄 Resetting form...');
        
        this.fields = [];
        this.fieldCounter = 0;
        this.changeCounter = 0;
        
        this.config = {
            title: 'My Custom Form',
            description: 'Please fill out this form with your information.',
            submitText: 'Submit Form',
            style: 'default'
        };
        
        // Reset components
        this.configPanel.updateData({
            formTitle: this.config.title,
            formDescription: this.config.description,
            submitText: this.config.submitText,
            formStyle: 'default',
            isDefault: true,
            isBordered: false,
            isFloating: false
        });
        
        this.formPreview.updateForm(this.config, this.fields);
        this.updateStatistics();
    }

    updateStatistics() {
        const validationCount = this.fields.filter(f => f.required).length;
        const sectionCount = this.fields.filter(f => f.type === 'heading').length;
        
        document.getElementById('field-count').textContent = this.fields.length;
        document.getElementById('validation-count').textContent = validationCount;
        document.getElementById('section-count').textContent = sectionCount;
        document.getElementById('changes-count').textContent = this.changeCounter;
    }

    showError(message) {
        console.error('❌', message);
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM ready, starting Form Builder app...');
    
    const app = new FormBuilderApp();
    await app.initialize();
});

// Export for debugging
export { FormBuilderApp, ConfigurationPanel, FieldLibrary, FormPreview };