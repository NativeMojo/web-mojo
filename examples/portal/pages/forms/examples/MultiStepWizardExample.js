import { Page, FormView } from 'web-mojo';

/**
 * MultiStepWizardExample - Multi-step form wizard
 * 
 * Demonstrates a wizard pattern with:
 * - Multiple steps with validation
 * - Forward/backward navigation
 * - Data persistence across steps
 * - Progress indicator
 * - Final review before submission
 */
class MultiStepWizardExample extends Page {
  static pageName = 'forms/examples/wizard';
  
  constructor(options = {}) {
    super({
      title: 'Multi-Step Wizard Example',
      icon: 'bi-arrow-right-circle',
      pageDescription: 'Progressive multi-step form with validation',
      ...options
    });
    
    this.currentStep = 1;
    this.totalSteps = 4;
    this.wizardData = {};
  }
  
  async onActionNextStep(event, element) {
    event.preventDefault();
    
    // Validate current step
    const isValid = await this.currentForm.validate();
    if (!isValid) {
      this.getApp().toast.error('Please fill in all required fields');
      return;
    }
    
    // Save current step data
    const stepData = await this.currentForm.getFormData();
    Object.assign(this.wizardData, stepData);
    
    // Custom validation for step 1 (password match)
    if (this.currentStep === 1 && stepData.password !== stepData.confirm_password) {
      this.getApp().toast.error('Passwords do not match');
      return;
    }
    
    // Move to next step
    this.currentStep++;
    this.renderStep();
  }
  
  async onActionPrevStep(event, element) {
    event.preventDefault();
    
    // Save current step data (no validation)
    const stepData = await this.currentForm.getFormData();
    Object.assign(this.wizardData, stepData);
    
    // Move to previous step
    this.currentStep--;
    this.renderStep();
  }
  
  async onActionSubmitWizard(event, element) {
    event.preventDefault();
    
    console.log('Wizard submitted:', this.wizardData);
    this.getApp().toast.success('Registration completed successfully!');
    
    // Show success message
    const output = document.getElementById('wizard-output');
    output.innerHTML = `
      <div class="alert alert-success">
        <h5 class="alert-heading">
          <i class="bi bi-check-circle me-2"></i>
          Registration Complete!
        </h5>
        <hr>
        <pre class="mb-0"><code>${JSON.stringify(this.wizardData, null, 2)}</code></pre>
      </div>
    `;
    
    // Reset wizard
    this.currentStep = 1;
    this.wizardData = {};
    this.renderStep();
  }
  
  renderStep() {
    // Remove existing form
    if (this.currentForm) {
      this.removeChild(this.currentForm);
      this.currentForm = null;
    }
    
    // Create form for current step
    const stepConfig = this.getStepConfig(this.currentStep);
    this.currentForm = new FormView(stepConfig);
    this.addChild(this.currentForm, { containerId: 'wizard-step-container' });
    
    // Update progress and navigation
    this.updateProgress();
    this.updateNavigation();
  }
  
  updateProgress() {
    const progressPercent = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
    const progressBar = this.element.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.width = progressPercent + '%';
      progressBar.setAttribute('aria-valuenow', progressPercent);
    }
    
    const stepIndicator = this.element.querySelector('.step-indicator');
    if (stepIndicator) {
      stepIndicator.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }
    
    // Update step circles
    for (let i = 1; i <= this.totalSteps; i++) {
      const circle = this.element.querySelector(`#step-circle-${i}`);
      if (circle) {
        if (i < this.currentStep) {
          circle.className = 'step-circle completed';
        } else if (i === this.currentStep) {
          circle.className = 'step-circle active';
        } else {
          circle.className = 'step-circle';
        }
      }
    }
  }
  
  updateNavigation() {
    const prevBtn = this.element.querySelector('[data-action="prev-step"]');
    const nextBtn = this.element.querySelector('[data-action="next-step"]');
    const submitBtn = this.element.querySelector('[data-action="submit-wizard"]');
    
    if (prevBtn) prevBtn.style.display = this.currentStep > 1 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = this.currentStep < this.totalSteps ? 'inline-block' : 'none';
    if (submitBtn) submitBtn.style.display = this.currentStep === this.totalSteps ? 'inline-block' : 'none';
  }
  
  getStepConfig(step) {
    switch (step) {
      case 1:
        return {
          fields: [
            {
              type: 'header',
              text: 'Step 1: Account Information',
              level: 4
            },
            {
              name: 'username',
              label: 'Username',
              type: 'text',
              required: true,
              placeholder: 'Choose a username',
              value: this.wizardData.username || '',
              help: 'This will be your unique identifier'
            },
            {
              name: 'email',
              label: 'Email Address',
              type: 'email',
              required: true,
              placeholder: 'you@example.com',
              value: this.wizardData.email || ''
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              required: true,
              placeholder: 'Enter a strong password',
              value: this.wizardData.password || '',
              help: 'Minimum 8 characters'
            },
            {
              name: 'confirm_password',
              label: 'Confirm Password',
              type: 'password',
              required: true,
              placeholder: 'Re-enter your password',
              value: this.wizardData.confirm_password || ''
            }
          ]
        };
        
      case 2:
        return {
          fields: [
            {
              type: 'header',
              text: 'Step 2: Personal Details',
              level: 4
            },
            {
              name: 'first_name',
              label: 'First Name',
              type: 'text',
              required: true,
              placeholder: 'John',
              value: this.wizardData.first_name || ''
            },
            {
              name: 'last_name',
              label: 'Last Name',
              type: 'text',
              required: true,
              placeholder: 'Doe',
              value: this.wizardData.last_name || ''
            },
            {
              name: 'phone',
              label: 'Phone Number',
              type: 'tel',
              placeholder: '(555) 123-4567',
              value: this.wizardData.phone || ''
            },
            {
              name: 'country',
              label: 'Country',
              type: 'select',
              required: true,
              value: this.wizardData.country || '',
              options: [
                { value: '', text: 'Select a country...' },
                { value: 'us', text: 'United States' },
                { value: 'ca', text: 'Canada' },
                { value: 'uk', text: 'United Kingdom' },
                { value: 'au', text: 'Australia' }
              ]
            }
          ]
        };
        
      case 3:
        return {
          fields: [
            {
              type: 'header',
              text: 'Step 3: Preferences',
              level: 4
            },
            {
              name: 'account_type',
              label: 'Account Type',
              type: 'select',
              required: true,
              value: this.wizardData.account_type || '',
              options: [
                { value: '', text: 'Select...' },
                { value: 'personal', text: 'Personal' },
                { value: 'business', text: 'Business' }
              ]
            },
            {
              name: 'interests',
              label: 'Interests',
              type: 'textarea',
              rows: 3,
              placeholder: 'Tell us about your interests...',
              value: this.wizardData.interests || ''
            },
            {
              name: 'newsletter',
              label: 'Subscribe to newsletter',
              type: 'checkbox',
              checked: this.wizardData.newsletter || false
            },
            {
              name: 'terms',
              label: 'I agree to the Terms of Service',
              type: 'checkbox',
              required: true,
              checked: this.wizardData.terms || false
            }
          ]
        };
        
      case 4:
        const reviewHtml = `
          <div class="review-summary">
            <h4>Review Your Information</h4>
            <p class="text-muted">Please review your information before submitting.</p>
            
            <div class="card mb-3">
              <div class="card-header"><strong>Account Information</strong></div>
              <div class="card-body">
                <p><strong>Username:</strong> ${this.wizardData.username || 'N/A'}</p>
                <p><strong>Email:</strong> ${this.wizardData.email || 'N/A'}</p>
              </div>
            </div>
            
            <div class="card mb-3">
              <div class="card-header"><strong>Personal Details</strong></div>
              <div class="card-body">
                <p><strong>Name:</strong> ${this.wizardData.first_name || ''} ${this.wizardData.last_name || ''}</p>
                <p><strong>Phone:</strong> ${this.wizardData.phone || 'N/A'}</p>
                <p><strong>Country:</strong> ${this.wizardData.country || 'N/A'}</p>
              </div>
            </div>
            
            <div class="card mb-3">
              <div class="card-header"><strong>Preferences</strong></div>
              <div class="card-body">
                <p><strong>Account Type:</strong> ${this.wizardData.account_type || 'N/A'}</p>
                <p><strong>Newsletter:</strong> ${this.wizardData.newsletter ? 'Yes' : 'No'}</p>
                <p><strong>Terms Accepted:</strong> ${this.wizardData.terms ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        `;
        
        return {
          fields: [
            {
              type: 'html',
              content: reviewHtml
            }
          ]
        };
        
      default:
        return { fields: [] };
    }
  }
  
  async onInit() {
    await super.onInit();
    this.renderStep();
  }
  
  getTemplate() {
    return `
      <div class="multi-step-wizard-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-arrow-right-circle me-2 text-primary"></i>
            Multi-Step Wizard Example
          </h1>
          <p class="text-muted">
            Complete registration in ${this.totalSteps} easy steps
          </p>
        </div>
        
        <!-- Info Alert -->
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>Features Demonstrated</h6>
          <ul class="mb-0">
            <li><strong>Step Validation:</strong> Each step validates before proceeding</li>
            <li><strong>Data Persistence:</strong> Data saved as you move between steps</li>
            <li><strong>Navigation:</strong> Move forward and backward through steps</li>
            <li><strong>Progress Indicator:</strong> Visual progress bar and step indicators</li>
            <li><strong>Review Step:</strong> Final confirmation before submission</li>
          </ul>
        </div>
        
        <!-- Wizard Container -->
        <div class="card mb-4">
          <div class="card-body">
            <!-- Progress Bar -->
            <div class="mb-4">
              <div class="d-flex justify-content-between mb-2">
                <div class="text-center flex-fill">
                  <div id="step-circle-1" class="step-circle active">1</div>
                  <div class="small mt-1">Account</div>
                </div>
                <div class="text-center flex-fill">
                  <div id="step-circle-2" class="step-circle">2</div>
                  <div class="small mt-1">Personal</div>
                </div>
                <div class="text-center flex-fill">
                  <div id="step-circle-3" class="step-circle">3</div>
                  <div class="small mt-1">Preferences</div>
                </div>
                <div class="text-center flex-fill">
                  <div id="step-circle-4" class="step-circle">4</div>
                  <div class="small mt-1">Review</div>
                </div>
              </div>
              <div class="progress" style="height: 6px;">
                <div class="progress-bar bg-primary" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
              <div class="text-center mt-2 text-muted small step-indicator">Step 1 of ${this.totalSteps}</div>
            </div>
            
            <!-- Step Content -->
            <div id="wizard-step-container"></div>
            
            <!-- Navigation -->
            <div class="d-flex justify-content-between mt-4">
              <button type="button" class="btn btn-secondary" data-action="prev-step" style="display: none;">
                <i class="bi bi-arrow-left me-2"></i>Previous
              </button>
              <div class="ms-auto">
                <button type="button" class="btn btn-primary" data-action="next-step">
                  Next<i class="bi bi-arrow-right ms-2"></i>
                </button>
                <button type="button" class="btn btn-success" data-action="submit-wizard" style="display: none;">
                  <i class="bi bi-check2-circle me-2"></i>Submit Registration
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Output -->
        <div id="wizard-output"></div>
        
        <!-- Implementation Notes -->
        <div class="card bg-dark text-light mb-4">
          <div class="card-header bg-dark border-secondary">
            <h5 class="h6 mb-0">
              <i class="bi bi-lightbulb me-2"></i>
              Implementation Pattern
            </h5>
          </div>
          <div class="card-body bg-dark">
            <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">class MultiStepWizard extends Page {
  constructor() {
    this.currentStep = 1;
    this.wizardData = {};
  }
  
  async onActionNextStep() {
    // Validate current step
    const isValid = await this.currentForm.validate();
    if (!isValid) return;
    
    // Save step data
    const data = await this.currentForm.getFormData();
    Object.assign(this.wizardData, data);
    
    // Move to next step
    this.currentStep++;
    this.renderStep();
  }
  
  renderStep() {
    // Remove old form
    this.removeChild(this.currentForm);
    
    // Create new form for current step
    const config = this.getStepConfig(this.currentStep);
    this.currentForm = new FormView(config);
    this.addChild(this.currentForm, { containerId: 'step' });
  }
}</code></pre>
          </div>
        </div>
        
        <style>
          .step-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid #dee2e6;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #6c757d;
            background: white;
          }
          .step-circle.active {
            border-color: #0d6efd;
            color: #0d6efd;
            background: #e7f1ff;
          }
          .step-circle.completed {
            border-color: #198754;
            background: #198754;
            color: white;
          }
        </style>
      </div>
    `;
  }
}

export default MultiStepWizardExample;
