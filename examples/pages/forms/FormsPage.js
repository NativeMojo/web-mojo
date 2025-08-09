import Page from '../../../src/core/Page.js';
import { FormBuilder } from '../../../src/components/FormBuilder.js';

export default class FormsPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            page_name: 'forms',
            title: 'Forms'
        });
        this.formBuilder = null;
        this.basicForm = null;
        this.validationForm = null;
    }

    async onInit() {
        // Initialize form configurations
        this.basicFormConfig = {
            fields: [
                {
                    name: 'firstName',
                    label: 'First Name',
                    type: 'text',
                    required: true,
                    placeholder: 'Enter your first name'
                },
                {
                    name: 'lastName',
                    label: 'Last Name',
                    type: 'text',
                    required: true,
                    placeholder: 'Enter your last name'
                },
                {
                    name: 'email',
                    label: 'Email Address',
                    type: 'email',
                    required: true,
                    placeholder: 'user@example.com'
                },
                {
                    name: 'phone',
                    label: 'Phone Number',
                    type: 'tel',
                    placeholder: '(555) 123-4567'
                },
                {
                    name: 'birthDate',
                    label: 'Date of Birth',
                    type: 'date'
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
                        { value: 'au', text: 'Australia' }
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
                    type: 'checkbox'
                }
            ]
        };

        this.advancedFormConfig = {
            fields: [
                {
                    name: 'username',
                    label: 'Username',
                    type: 'text',
                    required: true,
                    pattern: '^[a-zA-Z0-9_]{3,20}$',
                    placeholder: 'alphanumeric and underscore only',
                    helpText: 'Must be 3-20 characters'
                },
                {
                    name: 'password',
                    label: 'Password',
                    type: 'password',
                    required: true,
                    minLength: 8,
                    placeholder: 'At least 8 characters'
                },
                {
                    name: 'confirmPassword',
                    label: 'Confirm Password',
                    type: 'password',
                    required: true,
                    placeholder: 'Re-enter your password'
                },
                {
                    name: 'age',
                    label: 'Age',
                    type: 'number',
                    min: 18,
                    max: 120,
                    placeholder: 'Must be 18 or older'
                },
                {
                    name: 'website',
                    label: 'Website',
                    type: 'url',
                    placeholder: 'https://example.com'
                },
                {
                    name: 'color',
                    label: 'Favorite Color',
                    type: 'color',
                    value: '#007bff'
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
                        { value: 'go', text: 'Go' }
                    ]
                },
                {
                    name: 'availability',
                    label: 'Available for Work',
                    type: 'switch'
                },
                {
                    name: 'startDate',
                    label: 'Start Date',
                    type: 'datetime-local'
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
                }
            ]
        };
    }

    getTemplate() {
        return `
            <div class="container-fluid p-3">
                <h2 class="mb-4">Forms Examples</h2>
                
                <!-- Basic Form Example -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Basic Form</h5>
                    </div>
                    <div class="card-body">
                        <div id="basic-form-container"></div>
                        <div class="mt-3">
                            <button class="btn btn-sm btn-primary" data-action="submitBasic">
                                <i class="bi bi-check-circle"></i> Submit
                            </button>
                            <button class="btn btn-sm btn-secondary ms-2" data-action="resetBasic">
                                <i class="bi bi-arrow-clockwise"></i> Reset
                            </button>
                            <button class="btn btn-sm btn-info ms-2" data-action="fillSample">
                                <i class="bi bi-pencil-square"></i> Fill Sample Data
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Advanced Form Example -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Advanced Form Controls</h5>
                    </div>
                    <div class="card-body">
                        <div id="advanced-form-container"></div>
                        <div class="mt-3">
                            <button class="btn btn-sm btn-success" data-action="validateAdvanced">
                                <i class="bi bi-shield-check"></i> Validate
                            </button>
                            <button class="btn btn-sm btn-warning ms-2" data-action="getValues">
                                <i class="bi bi-code-square"></i> Get Values
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Form Validation Example -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Form Validation</h5>
                    </div>
                    <div class="card-body">
                        <form id="validation-form" class="needs-validation" novalidate>
                            <div class="row">
                                <div class="col-md-6 mb-2">
                                    <label for="validationCustom01" class="form-label">First name</label>
                                    <input type="text" class="form-control form-control-sm" id="validationCustom01" required>
                                    <div class="valid-feedback">
                                        Looks good!
                                    </div>
                                    <div class="invalid-feedback">
                                        Please provide a valid first name.
                                    </div>
                                </div>
                                <div class="col-md-6 mb-2">
                                    <label for="validationCustom02" class="form-label">Last name</label>
                                    <input type="text" class="form-control form-control-sm" id="validationCustom02" required>
                                    <div class="valid-feedback">
                                        Looks good!
                                    </div>
                                    <div class="invalid-feedback">
                                        Please provide a valid last name.
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-2">
                                    <label for="validationCustomUsername" class="form-label">Username</label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text">@</span>
                                        <input type="text" class="form-control" id="validationCustomUsername" required>
                                        <div class="invalid-feedback">
                                            Please choose a username.
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-2">
                                    <label for="validationCustom03" class="form-label">City</label>
                                    <input type="text" class="form-control form-control-sm" id="validationCustom03" required>
                                    <div class="invalid-feedback">
                                        Please provide a valid city.
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-12 mb-2">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="invalidCheck" required>
                                        <label class="form-check-label" for="invalidCheck">
                                            Agree to terms and conditions
                                        </label>
                                        <div class="invalid-feedback">
                                            You must agree before submitting.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-primary" type="submit">Submit form</button>
                        </form>
                    </div>
                </div>

                <!-- Form Result Display -->
                <div class="card" id="result-card" style="display: none;">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0">Form Data Result</h5>
                    </div>
                    <div class="card-body">
                        <pre id="form-result" class="bg-light p-2 rounded"></pre>
                    </div>
                </div>
            </div>
        `;
    }

    async onAfterMount() {
        // Initialize basic form
        this.basicForm = new FormBuilder(this.basicFormConfig);
        await this.basicForm.mount(document.getElementById('basic-form-container'));

        // Initialize advanced form
        this.advancedForm = new FormBuilder(this.advancedFormConfig);
        await this.advancedForm.mount(document.getElementById('advanced-form-container'));

        // Setup validation form
        this.setupValidationForm();
    }

    setupValidationForm() {
        const form = document.getElementById('validation-form');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (form.checkValidity()) {
                this.showResult({
                    message: 'Validation form submitted successfully!',
                    data: {
                        firstName: form.querySelector('#validationCustom01').value,
                        lastName: form.querySelector('#validationCustom02').value,
                        username: form.querySelector('#validationCustomUsername').value,
                        city: form.querySelector('#validationCustom03').value,
                        terms: form.querySelector('#invalidCheck').checked
                    }
                });
            }
            
            form.classList.add('was-validated');
        });
    }

    async onActionSubmitBasic() {
        const data = this.basicForm.getValues();
        this.showResult({
            message: 'Basic form submitted!',
            data: data
        });
    }

    async onActionResetBasic() {
        this.basicForm.reset();
        document.getElementById('result-card').style.display = 'none';
    }

    async onActionFillSample() {
        this.basicForm.setValues({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567',
            birthDate: '1990-01-15',
            country: 'us',
            bio: 'I am a software developer with 10 years of experience in web technologies.',
            newsletter: true
        });
    }

    async onActionValidateAdvanced() {
        const form = this.advancedForm.getFormElement();
        const isValid = form.checkValidity();
        
        if (isValid) {
            this.showResult({
                message: 'Advanced form is valid!',
                data: this.advancedForm.getValues()
            });
        } else {
            form.classList.add('was-validated');
            this.showResult({
                message: 'Please fix validation errors',
                error: true
            });
        }
    }

    async onActionGetValues() {
        const values = this.advancedForm.getValues();
        this.showResult({
            message: 'Current form values:',
            data: values
        });
    }

    showResult(result) {
        const card = document.getElementById('result-card');
        const resultElement = document.getElementById('form-result');
        
        card.style.display = 'block';
        
        if (result.error) {
            card.querySelector('.card-header').className = 'card-header bg-danger text-white';
        } else {
            card.querySelector('.card-header').className = 'card-header bg-success text-white';
        }
        
        resultElement.textContent = JSON.stringify(result, null, 2);
        
        // Scroll to result
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async onBeforeDestroy() {
        if (this.basicForm) {
            await this.basicForm.destroy();
        }
        if (this.advancedForm) {
            await this.advancedForm.destroy();
        }
    }
}