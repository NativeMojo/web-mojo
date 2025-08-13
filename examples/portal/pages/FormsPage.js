/**
 * FormsPage - Demonstrates FormBuilder component usage
 */

import Page from '../../../src/core/Page.js';
import { FormView } from '../../../src/components/FormView.js';

class FormsPage extends Page {
    static pageName = 'forms';
    static title = 'Forms - Portal Example';
    static icon = 'bi-input-cursor-text';
    static route = 'forms';

    constructor(options = {}) {
        super({
            ...options,
            pageName: FormsPage.pageName,
            route: FormsPage.route,
            pageIcon: FormsPage.icon,
            template: 'templates/FormsPage.mst'
        });

        this.basicFormView = null;
        this.advancedFormView = null;
        this.validationFormView = null;
    }

    async onInit() {
        // Basic form configuration
        this.basicFormConfig = {
            id: 'basic-form',
            fields: [
                {
                    name: 'firstName',
                    label: 'First Name',
                    type: 'text',
                    required: true,
                    placeholder: 'Enter your first name',
                    width: '6'
                },
                {
                    name: 'lastName',
                    label: 'Last Name',
                    type: 'text',
                    required: true,
                    placeholder: 'Enter your last name',
                    width: '6'
                },
                {
                    name: 'email',
                    label: 'Email Address',
                    type: 'email',
                    required: true,
                    placeholder: 'user@example.com',
                    helpText: 'We\'ll never share your email with anyone else.'
                },
                {
                    name: 'phone',
                    label: 'Phone Number',
                    type: 'tel',
                    placeholder: '(555) 123-4567',
                    width: '6'
                },
                {
                    name: 'birthDate',
                    label: 'Date of Birth',
                    type: 'date',
                    width: '6'
                },
                {
                    name: 'country',
                    label: 'Country',
                    type: 'select',
                    options: [
                        { value: '', text: 'Choose...' },
                        { value: 'us', text: 'United States' },
                        { value: 'ca', text: 'Canada' },
                        { value: 'uk', text: 'United Kingdom' },
                        { value: 'au', text: 'Australia' },
                        { value: 'de', text: 'Germany' },
                        { value: 'fr', text: 'France' }
                    ]
                },
                {
                    name: 'bio',
                    label: 'Biography',
                    type: 'textarea',
                    rows: 3,
                    placeholder: 'Tell us about yourself...'
                },
                {
                    name: 'newsletter',
                    label: 'Subscribe to newsletter',
                    type: 'checkbox',
                    helpText: 'Get updates about new features'
                }
            ],
            buttons: [
                {
                    text: 'Submit',
                    type: 'submit',
                    className: 'btn-primary',
                    icon: 'bi-check-circle'
                },
                {
                    text: 'Reset',
                    type: 'reset',
                    className: 'btn-secondary',
                    icon: 'bi-arrow-clockwise'
                }
            ]
        };

        // Advanced form configuration
        this.advancedFormConfig = {
            id: 'advanced-form',
            fields: [
                {
                    name: 'username',
                    label: 'Username',
                    type: 'text',
                    required: true,
                    pattern: '^[a-zA-Z0-9_]{3,20}$',
                    placeholder: 'alphanumeric and underscore only',
                    helpText: 'Must be 3-20 characters',
                    width: '6'
                },
                {
                    name: 'password',
                    label: 'Password',
                    type: 'password',
                    required: true,
                    minLength: 8,
                    placeholder: 'At least 8 characters',
                    width: '6'
                },
                {
                    name: 'website',
                    label: 'Website',
                    type: 'url',
                    placeholder: 'https://example.com',
                    width: '6'
                },
                {
                    name: 'age',
                    label: 'Age',
                    type: 'number',
                    min: 18,
                    max: 120,
                    placeholder: 'Must be 18 or older',
                    width: '6'
                },
                {
                    name: 'color',
                    label: 'Favorite Color',
                    type: 'color',
                    value: '#007bff',
                    width: '4'
                },
                {
                    name: 'startDate',
                    label: 'Start Date',
                    type: 'datetime-local',
                    width: '8'
                },
                {
                    name: 'experience',
                    label: 'Experience Level',
                    type: 'radio',
                    options: [
                        { value: 'beginner', text: 'Beginner' },
                        { value: 'intermediate', text: 'Intermediate' },
                        { value: 'advanced', text: 'Advanced' },
                        { value: 'expert', text: 'Expert' }
                    ]
                },
                {
                    name: 'skills',
                    label: 'Skills',
                    type: 'select',
                    multiple: true,
                    size: 5,
                    options: [
                        { value: 'javascript', text: 'JavaScript' },
                        { value: 'python', text: 'Python' },
                        { value: 'java', text: 'Java' },
                        { value: 'csharp', text: 'C#' },
                        { value: 'php', text: 'PHP' },
                        { value: 'ruby', text: 'Ruby' },
                        { value: 'go', text: 'Go' },
                        { value: 'rust', text: 'Rust' }
                    ],
                    helpText: 'Hold Ctrl/Cmd to select multiple'
                },
                {
                    name: 'budget',
                    label: 'Budget Range',
                    type: 'range',
                    min: 0,
                    max: 10000,
                    step: 100,
                    value: 5000,
                    helpText: 'Slide to select budget'
                },
                {
                    name: 'availability',
                    label: 'Available for Work',
                    type: 'switch'
                }
            ],
            buttons: [
                {
                    text: 'Validate',
                    type: 'submit',
                    className: 'btn-success',
                    icon: 'bi-shield-check'
                },
                {
                    text: 'Clear',
                    type: 'reset',
                    className: 'btn-outline-secondary',
                    icon: 'bi-eraser'
                }
            ]
        };

        // Validation form configuration
        this.validationFormConfig = {
            id: 'validation-form',
            className: 'needs-validation',
            noValidate: true,
            fields: [
                {
                    name: 'fullName',
                    label: 'Full Name',
                    type: 'text',
                    required: true,
                    minLength: 3,
                    maxLength: 50,
                    pattern: '^[a-zA-Z\\s]+$',
                    placeholder: 'Letters and spaces only',
                    validFeedback: 'Looks good!',
                    invalidFeedback: 'Please enter a valid name (letters and spaces only)',
                    columns: 6
                },
                {
                    name: 'email',
                    label: 'Email',
                    type: 'email',
                    required: true,
                    placeholder: 'name@example.com',
                    validFeedback: 'Valid email!',
                    invalidFeedback: 'Please enter a valid email address',
                    columns: 6
                },
                {
                    name: 'zipCode',
                    label: 'ZIP Code',
                    type: 'text',
                    required: true,
                    pattern: '^\\d{5}(-\\d{4})?$',
                    placeholder: '12345 or 12345-6789',
                    validFeedback: 'Valid ZIP code!',
                    invalidFeedback: 'Please enter a valid ZIP code',
                    width: '4'
                },
                {
                    name: 'creditCard',
                    label: 'Credit Card',
                    type: 'text',
                    required: true,
                    pattern: '^\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}$',
                    placeholder: '1234 5678 9012 3456',
                    validFeedback: 'Valid format!',
                    invalidFeedback: 'Please enter a valid credit card number',
                    width: '8'
                },
                {
                    name: 'terms',
                    label: 'I agree to the terms and conditions',
                    type: 'checkbox',
                    required: true,
                    invalidFeedback: 'You must agree before submitting'
                }
            ],
            buttons: [
                {
                    text: 'Submit Form',
                    type: 'submit',
                    className: 'btn-primary',
                    icon: 'bi-send'
                }
            ]
        };

        // Initialize data
        this.updateData({
            title: 'Form Examples',
            subtitle: 'Showcase of FormBuilder component capabilities'
        });

        // Create form views as children
        this.basicFormView = new FormView({
            id: 'basic-form-container',
            formConfig: this.basicFormConfig
        });
        this.addChild(this.basicFormView);

        this.advancedFormView = new FormView({
            id: 'advanced-form-container',
            formConfig: this.advancedFormConfig
        });
        this.addChild(this.advancedFormView);

        this.validationFormView = new FormView({
            id: 'validation-form-container',
            formConfig: this.validationFormConfig
        });
        this.addChild(this.validationFormView);
    }



    async onAfterMount() {
        await super.onAfterMount();

        // Setup form event handlers
        this.basicFormView.on('submit', (data) => {
            this.showResult('Basic Form Submitted', data, 'success');
        });

        this.advancedFormView.on('submit', (data) => {
            this.showResult('Advanced Form Validated', data, 'success');
        });

        this.validationFormView.on('submit', (data) => {
            const form = this.validationFormView.getFormElement();
            if (form && form.checkValidity()) {
                this.showResult('Validation Passed!', data, 'success');
            } else {
                if (form) {
                    form.classList.add('was-validated');
                }
                this.showResult('Validation Failed', {
                    message: 'Please fix the errors and try again'
                }, 'danger');
            }
        });

        // Update range value display
        const rangeInput = document.querySelector('input[name="budget"]');
        if (rangeInput) {
            rangeInput.addEventListener('input', (e) => {
                const helpText = e.target.parentElement.querySelector('.form-text');
                if (helpText) {
                    helpText.textContent = `Slide to select budget: $${e.target.value}`;
                }
            });
        }
    }

    async onActionFillSample() {
        this.basicFormView.setValues({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567',
            birthDate: '1990-01-15',
            country: 'us',
            bio: 'I am a software developer with 10 years of experience in web technologies.',
            newsletter: true
        });

        this.showInfo('Sample data filled successfully!');
    }

    async onActionGetBasicValues() {
        const values = this.basicFormView.getValues();
        this.showResult('Basic Form Values', values, 'info');
    }

    async onActionGetAdvancedValues() {
        const values = this.advancedFormView.getValues();
        this.showResult('Advanced Form Values', values, 'warning');
    }

    showResult(title, data, type = 'primary') {
        const resultRow = document.getElementById('result-row');
        const resultHeader = document.getElementById('result-header');
        const resultContent = document.getElementById('result-content');

        // Set header color based on type
        const headerClasses = {
            'success': 'bg-success text-white',
            'danger': 'bg-danger text-white',
            'warning': 'bg-warning text-dark',
            'info': 'bg-info text-white',
            'primary': 'bg-primary text-white'
        };

        resultHeader.className = `card-header ${headerClasses[type] || headerClasses.primary}`;
        resultHeader.innerHTML = `
            <h5 class="mb-0">
                <i class="bi bi-terminal me-2"></i>
                ${title}
            </h5>
        `;

        // Format and display data
        resultContent.textContent = JSON.stringify(data, null, 2);

        // Show result
        resultRow.style.display = 'block';

        // Smooth scroll to result
        resultRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showInfo(message) {
        // Use the app's notification system if available
        if (window.app && window.app.showInfo) {
            window.app.showInfo(message);
        } else {
            console.info(message);
        }
    }

    async onBeforeDestroy() {
        // FormView instances will be cleaned up automatically as children
        await super.onBeforeDestroy();
    }
}

export default FormsPage;
