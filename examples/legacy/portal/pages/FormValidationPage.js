/**
 * FormValidationPage - Comprehensive showcase of form validation
 * Demonstrates various validation techniques and error handling
 */

import { Page, FormView } from 'web-mojo';

export default class FormValidationPage extends Page {
  static pageName = 'form-validation';
  static title = 'Form Validation';
  static icon = 'bi-shield-check';
  static route = '/form-validation';

  constructor(options = {}) {
    super(options);
    this.forms = {};
  }

  async renderTemplate() {
    return `
      <div class="container-fluid py-4">
        <div class="row">
          <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 class="h2 mb-1">Form Validation</h1>
                <p class="text-muted">Comprehensive examples of form validation techniques</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <ul class="nav nav-tabs mb-4" id="validationTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="basic-tab" data-bs-toggle="tab" data-bs-target="#basic-validation"
                    type="button" role="tab">Basic Validation</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="advanced-tab" data-bs-toggle="tab" data-bs-target="#advanced-validation"
                    type="button" role="tab">Advanced Validation</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="custom-tab" data-bs-toggle="tab" data-bs-target="#custom-validation"
                    type="button" role="tab">Custom Validation</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="realtime-tab" data-bs-toggle="tab" data-bs-target="#realtime-validation"
                    type="button" role="tab">Real-time Validation</button>
          </li>
        </ul>

        <div class="tab-content" id="validationTabsContent">
          <!-- Basic Validation Tab -->
          <div class="tab-pane fade show active" id="basic-validation" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Basic Validation Examples</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="basic-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Validation Rules</h6>
                  </div>
                  <div class="card-body">
                    <h6>Required Fields</h6>
                    <ul class="small">
                      <li>Add <code>required: true</code> to make field mandatory</li>
                      <li>Shows validation error on submit if empty</li>
                      <li>Displays red asterisk (*) in label</li>
                    </ul>

                    <h6 class="mt-3">Built-in HTML5 Validation</h6>
                    <ul class="small">
                      <li><strong>email</strong> - Validates email format</li>
                      <li><strong>url</strong> - Validates URL format</li>
                      <li><strong>number</strong> - Validates numeric input</li>
                      <li><strong>tel</strong> - Validates phone format</li>
                    </ul>

                    <h6 class="mt-3">Number Constraints</h6>
                    <ul class="small">
                      <li><code>min</code> - Minimum value</li>
                      <li><code>max</code> - Maximum value</li>
                      <li><code>step</code> - Step increment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Advanced Validation Tab -->
          <div class="tab-pane fade" id="advanced-validation" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Advanced Validation Patterns</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="advanced-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Pattern Matching</h6>
                  </div>
                  <div class="card-body">
                    <h6>Regular Expressions</h6>
                    <ul class="small">
                      <li>Use <code>pattern</code> attribute for regex validation</li>
                      <li>HTML5 pattern matching with custom messages</li>
                    </ul>

                    <h6 class="mt-3">Common Patterns</h6>
                    <ul class="small">
                      <li><strong>Phone:</strong> <code>^\\d{3}-\\d{3}-\\d{4}$</code></li>
                      <li><strong>ZIP Code:</strong> <code>^\\d{5}(-\\d{4})?$</code></li>
                      <li><strong>Username:</strong> <code>^[a-zA-Z0-9_]{3,16}$</code></li>
                    </ul>

                    <h6 class="mt-3">Length Validation</h6>
                    <ul class="small">
                      <li><code>minlength</code> - Minimum character count</li>
                      <li><code>maxlength</code> - Maximum character count</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Custom Validation Tab -->
          <div class="tab-pane fade" id="custom-validation" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Custom Validation Logic</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="custom-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Custom Validation</h6>
                  </div>
                  <div class="card-body">
                    <h6>Implementation</h6>
                    <ul class="small">
                      <li>Override <code>validateField()</code> method</li>
                      <li>Add custom validation logic</li>
                      <li>Return error messages for invalid fields</li>
                    </ul>

                    <h6 class="mt-3">Cross-field Validation</h6>
                    <ul class="small">
                      <li>Password confirmation matching</li>
                      <li>Date range validation</li>
                      <li>Conditional required fields</li>
                    </ul>

                    <h6 class="mt-3">Async Validation</h6>
                    <ul class="small">
                      <li>Server-side validation</li>
                      <li>Username availability check</li>
                      <li>Email domain validation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Real-time Validation Tab -->
          <div class="tab-pane fade" id="realtime-validation" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Real-time Validation</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="realtime-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Live Validation</h6>
                  </div>
                  <div class="card-body">
                    <h6>Features</h6>
                    <ul class="small">
                      <li>Validates as user types</li>
                      <li>Immediate feedback</li>
                      <li>Visual indicators (green/red borders)</li>
                      <li>Dynamic error messages</li>
                    </ul>

                    <h6 class="mt-3">Events</h6>
                    <ul class="small">
                      <li><code>onChangeValidateField</code> - Real-time validation</li>
                      <li><code>onBlur</code> - Validation on focus loss</li>
                      <li><code>onInput</code> - Validation on input</li>
                    </ul>

                    <h6 class="mt-3">Performance</h6>
                    <ul class="small">
                      <li>Debounced validation to reduce server calls</li>
                      <li>Client-side validation first</li>
                      <li>Async validation for complex checks</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Validation Summary -->
        <div class="row mt-4">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h5 class="card-title mb-0">Form Submission Results</h5>
              </div>
              <div class="card-body">
                <div id="validation-results" class="d-none">
                  <h6>Last Form Submission:</h6>
                  <pre id="form-data" class="bg-light p-3 rounded"></pre>
                </div>
                <div id="no-results" class="text-muted">
                  Submit any form to see validation results here...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async onInit() {
    await this.initializeForms();
  }

  async initializeForms() {
    await this.initializeBasicForm();
    await this.initializeAdvancedForm();
    await this.initializeCustomForm();
    await this.initializeRealtimeForm();
  }

  async initializeBasicForm() {
    const basicForm = new FormView({
      containerId: 'basic-form',
      config: {
        fields: [
          {
            type: 'text',
            name: 'full_name',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            required: true,
            help: 'This field is required',
            columns: 6
          },
          {
            type: 'email',
            name: 'email',
            label: 'Email Address',
            placeholder: 'user@example.com',
            required: true,
            help: 'Valid email address required',
            columns: 6
          },
          {
            type: 'url',
            name: 'website',
            label: 'Website (Optional)',
            placeholder: 'https://example.com',
            help: 'Must be a valid URL if provided',
            columns: 6
          },
          {
            type: 'tel',
            name: 'phone',
            label: 'Phone Number',
            placeholder: '(555) 123-4567',
            required: true,
            help: 'Phone number is required',
            columns: 6
          },
          {
            type: 'number',
            name: 'age',
            label: 'Age',
            placeholder: '25',
            min: 13,
            max: 120,
            required: true,
            help: 'Age must be between 13 and 120',
            columns: 4
          },
          {
            type: 'number',
            name: 'experience',
            label: 'Years of Experience',
            placeholder: '5',
            min: 0,
            max: 50,
            step: 0.5,
            help: 'Can include half years (e.g., 2.5)',
            columns: 4
          },
          {
            type: 'select',
            name: 'country',
            label: 'Country',
            options: [
              { value: '', text: 'Select your country...' },
              { value: 'us', text: 'United States' },
              { value: 'ca', text: 'Canada' },
              { value: 'uk', text: 'United Kingdom' }
            ],
            required: true,
            help: 'Country selection is required',
            columns: 4
          }
        ],
        options: {
          submitButton: 'Validate Basic Form',
          resetButton: 'Reset Form'
        }
      }
    });

    // Override form submission to show results
    basicForm.handleSubmit = async (formData) => {
      this.showFormResults('Basic Form', formData);
      return { success: true };
    };

    this.addChild(basicForm);
    this.forms.basic = basicForm;
  }

  async initializeAdvancedForm() {
    const advancedForm = new FormView({
      containerId: 'advanced-form',
      config: {
        fields: [
          {
            type: 'text',
            name: 'username',
            label: 'Username',
            placeholder: 'john_doe123',
            required: true,
            attributes: {
              pattern: '^[a-zA-Z0-9_]{3,16}$',
              title: 'Username must be 3-16 characters, letters, numbers, and underscores only'
            },
            help: '3-16 characters: letters, numbers, underscores only',
            columns: 6
          },
          {
            type: 'text',
            name: 'phone_formatted',
            label: 'Phone (Formatted)',
            placeholder: '555-123-4567',
            required: true,
            attributes: {
              pattern: '^\\d{3}-\\d{3}-\\d{4}$',
              title: 'Phone must be in format: 555-123-4567'
            },
            help: 'Format: 555-123-4567',
            columns: 6
          },
          {
            type: 'text',
            name: 'zipcode',
            label: 'ZIP Code',
            placeholder: '12345 or 12345-6789',
            attributes: {
              pattern: '^\\d{5}(-\\d{4})?$',
              title: 'ZIP code must be 5 digits or 5+4 format'
            },
            help: '5-digit or 5+4 ZIP code format',
            columns: 6
          },
          {
            type: 'password',
            name: 'password_strong',
            label: 'Strong Password',
            placeholder: 'Enter strong password',
            required: true,
            attributes: {
              minlength: '8',
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
              title: 'Password must be 8+ characters with uppercase, lowercase, number, and special character'
            },
            help: '8+ chars: uppercase, lowercase, number, special character',
            columns: 6
          },
          {
            type: 'text',
            name: 'credit_card',
            label: 'Credit Card (Demo)',
            placeholder: '4111-1111-1111-1111',
            attributes: {
              pattern: '^\\d{4}-\\d{4}-\\d{4}-\\d{4}$',
              title: 'Credit card format: 1234-5678-9012-3456'
            },
            help: 'Format: 1234-5678-9012-3456 (demo only)',
            columns: 6
          },
          {
            type: 'textarea',
            name: 'bio',
            label: 'Biography',
            placeholder: 'Tell us about yourself...',
            required: true,
            attributes: {
              minlength: '50',
              maxlength: '500'
            },
            help: 'Between 50 and 500 characters',
            rows: 4,
            columns: 12
          }
        ],
        options: {
          submitButton: 'Validate Advanced Form',
          resetButton: 'Reset Form'
        }
      }
    });

    advancedForm.handleSubmit = async (formData) => {
      this.showFormResults('Advanced Form', formData);
      return { success: true };
    };

    this.addChild(advancedForm);
    this.forms.advanced = advancedForm;
  }

  async initializeCustomForm() {
    const customForm = new FormView({
      containerId: 'custom-form',
      config: {
        fields: [
          {
            type: 'text',
            name: 'username_check',
            label: 'Username (Availability Check)',
            placeholder: 'Enter desired username',
            required: true,
            help: 'We\'ll check if this username is available',
            columns: 6
          },
          {
            type: 'email',
            name: 'email_domain',
            label: 'Email (Domain Validation)',
            placeholder: 'user@company.com',
            required: true,
            help: 'Only company domains allowed',
            columns: 6
          },
          {
            type: 'password',
            name: 'new_password',
            label: 'New Password',
            placeholder: 'Enter new password',
            required: true,
            help: 'Enter your new password',
            columns: 6
          },
          {
            type: 'password',
            name: 'confirm_password',
            label: 'Confirm Password',
            placeholder: 'Confirm password',
            required: true,
            help: 'Must match the password above',
            columns: 6
          },
          {
            type: 'date',
            name: 'start_date_custom',
            label: 'Start Date',
            required: true,
            help: 'Project start date',
            columns: 6
          },
          {
            type: 'date',
            name: 'end_date_custom',
            label: 'End Date',
            required: true,
            help: 'Must be after start date',
            columns: 6
          },
          {
            type: 'checkbox',
            name: 'terms_agreement',
            label: 'I agree to the terms and conditions',
            required: true,
            help: 'You must agree to continue',
            columns: 12
          }
        ],
        options: {
          submitButton: 'Validate Custom Form',
          resetButton: 'Reset Form'
        }
      }
    });

    // Override validation for custom logic
    customForm.validateField = (name, value, field) => {
      const formData = customForm.getFormData();

      switch (name) {
        case 'username_check':
          // Simulate username availability check
          const unavailableUsernames = ['admin', 'root', 'test', 'user'];
          if (unavailableUsernames.includes(value.toLowerCase())) {
            return 'This username is not available';
          }
          if (value.length < 3) {
            return 'Username must be at least 3 characters';
          }
          break;

        case 'email_domain':
          // Custom domain validation
          const allowedDomains = ['company.com', 'organization.org', 'business.net'];
          const emailDomain = value.split('@')[1];
          if (value && !allowedDomains.includes(emailDomain)) {
            return 'Only company email addresses are allowed';
          }
          break;

        case 'confirm_password':
          // Password confirmation
          if (value !== formData.new_password) {
            return 'Passwords do not match';
          }
          break;

        case 'end_date_custom':
          // Date range validation
          const startDate = new Date(formData.start_date_custom);
          const endDate = new Date(value);
          if (startDate && endDate && endDate <= startDate) {
            return 'End date must be after start date';
          }
          break;

        case 'terms_agreement':
          // Custom checkbox validation
          if (!value || value !== 'on') {
            return 'You must agree to the terms and conditions';
          }
          break;
      }

      // Call parent validation for standard checks
      return super.validateField ? super.validateField.call(this, name, value, field) : null;
    };

    customForm.handleSubmit = async (formData) => {
      this.showFormResults('Custom Form', formData);
      return { success: true };
    };

    this.addChild(customForm);
    this.forms.custom = customForm;
  }

  async initializeRealtimeForm() {
    const realtimeForm = new FormView({
      containerId: 'realtime-form',
      config: {
        fields: [
          {
            type: 'text',
            name: 'realtime_name',
            label: 'Name (Real-time)',
            placeholder: 'Type your name...',
            required: true,
            help: 'Validates as you type',
            columns: 6
          },
          {
            type: 'email',
            name: 'realtime_email',
            label: 'Email (Real-time)',
            placeholder: 'user@example.com',
            required: true,
            help: 'Email format checked live',
            columns: 6
          },
          {
            type: 'text',
            name: 'realtime_username',
            label: 'Username (Live Check)',
            placeholder: 'username',
            required: true,
            help: 'Availability checked as you type',
            columns: 6
          },
          {
            type: 'password',
            name: 'realtime_password',
            label: 'Password (Strength)',
            placeholder: 'Enter password',
            required: true,
            help: 'Password strength shown live',
            columns: 6
          },
          {
            type: 'number',
            name: 'realtime_age',
            label: 'Age (Range Check)',
            placeholder: '25',
            min: 18,
            max: 65,
            required: true,
            help: 'Must be 18-65 (validated live)',
            columns: 6
          },
          {
            type: 'url',
            name: 'realtime_website',
            label: 'Website (URL Check)',
            placeholder: 'https://example.com',
            help: 'URL format validated live',
            columns: 6
          }
        ],
        options: {
          submitButton: 'Submit Real-time Form',
          resetButton: 'Reset Form'
        }
      }
    });

    // Enhanced real-time validation
    realtimeForm.onChangeValidateField = async (action, event, element) => {
      const field = element.name;
      const value = element.value;

      // Add visual feedback for real-time validation
      const fieldElement = element;
      fieldElement.classList.remove('is-valid', 'is-invalid');

      // Perform validation
      const error = this.validateRealtimeField(field, value);

      if (error) {
        fieldElement.classList.add('is-invalid');
        this.showFieldError(field, error);
      } else if (value) {
        fieldElement.classList.add('is-valid');
        this.clearFieldError(field);
      }
    };

    realtimeForm.handleSubmit = async (formData) => {
      this.showFormResults('Real-time Form', formData);
      return { success: true };
    };

    this.addChild(realtimeForm);
    this.forms.realtime = realtimeForm;
  }

  validateRealtimeField(field, value) {
    switch (field) {
      case 'realtime_name':
        if (!value) return 'Name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Name can only contain letters and spaces';
        break;

      case 'realtime_email':
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Invalid email format';
        break;

      case 'realtime_username':
        if (!value) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        // Simulate availability check
        const taken = ['admin', 'test', 'user'];
        if (taken.includes(value.toLowerCase())) return 'Username not available';
        break;

      case 'realtime_password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain a number';
        break;

      case 'realtime_age':
        const age = parseInt(value);
        if (!value) return 'Age is required';
        if (isNaN(age)) return 'Age must be a number';
        if (age < 18) return 'Must be at least 18 years old';
        if (age > 65) return 'Must be 65 or younger';
        break;

      case 'realtime_website':
        if (value && !/^https?:\/\/.+\..+/.test(value)) {
          return 'Must be a valid URL (http:// or https://)';
        }
        break;
    }
    return null;
  }

  showFieldError(fieldName, error) {
    const fieldElement = document.querySelector(`[name="${fieldName}"]`);
    if (!fieldElement) return;

    // Find or create error element
    let errorElement = fieldElement.parentElement.querySelector('.invalid-feedback');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'invalid-feedback';
      fieldElement.parentElement.appendChild(errorElement);
    }
    errorElement.textContent = error;
  }

  clearFieldError(fieldName) {
    const fieldElement = document.querySelector(`[name="${fieldName}"]`);
    if (!fieldElement) return;

    const errorElement = fieldElement.parentElement.querySelector('.invalid-feedback');
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  showFormResults(formName, formData) {
    const resultsElement = document.getElementById('validation-results');
    const noResultsElement = document.getElementById('no-results');
    const formDataElement = document.getElementById('form-data');

    // Show results
    noResultsElement.classList.add('d-none');
    resultsElement.classList.remove('d-none');

    // Display form data
    const dataWithMeta = {
      form: formName,
      timestamp: new Date().toISOString(),
      data: formData
    };

    formDataElement.textContent = JSON.stringify(dataWithMeta, null, 2);

    // Show success message
    this.showSuccess(`${formName} validation successful! Data shown below.`);
  }

  async onBeforeDestroy() {
    // Clean up forms
    Object.values(this.forms).forEach(form => {
      if (form && typeof form.destroy === 'function') {
        form.destroy();
      }
    });
    super.onBeforeDestroy();
  }
}
