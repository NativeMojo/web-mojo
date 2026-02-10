import { Page, FormView } from 'web-mojo';

/**
 * FormViewBasics - Demonstrates core FormView concepts
 * 
 * Shows how to create forms, define fields, handle submissions, and work with models
 */
class FormViewBasics extends Page {
  static pageName = 'forms/formview-basics';
  static title = 'FormView Basics';
  static icon = 'bi-file-earmark-code';
  static description = 'Learn the fundamentals of creating forms with MOJO\'s FormView component';
  async onInit() {
    await super.onInit();
    
    // Create a simple contact form
    this.contactForm = new FormView({
      fields: [
        {
          name: 'name',
          label: 'Full Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your full name'
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'you@example.com'
        },
        {
          name: 'message',
          label: 'Message',
          type: 'textarea',
          required: true,
          placeholder: 'Your message here...',
          rows: 4
        }
      ],
      submitLabel: 'Send Message',
      onSubmit: async (data) => {
        console.log('Form submitted:', data);
        alert(`Thank you, ${data.name}! Your message has been received.`);
        return true; // Return true to indicate success
      }
    });
    
    this.addChild(this.contactForm, { containerId: 'contact-form-container' });
    
    // Create a form with validation
    this.validationForm = new FormView({
      fields: [
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          minlength: 3,
          maxlength: 20,
          pattern: '^[a-zA-Z0-9_]+$',
          help: 'Letters, numbers, and underscores only'
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          minlength: 8,
          help: 'At least 8 characters'
        },
        {
          name: 'age',
          label: 'Age',
          type: 'number',
          required: true,
          min: 18,
          max: 120,
          help: 'Must be 18 or older'
        }
      ],
      submitLabel: 'Create Account',
      onSubmit: async (data) => {
        console.log('Validation form submitted:', data);
        alert('Account created successfully!');
        return true;
      }
    });
    
    this.addChild(this.validationForm, { containerId: 'validation-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="forms-basics-page">
        <!-- Introduction -->
        <div class="card mb-4">
          <div class="card-body">
            <h3 class="h5 card-title">What is FormView?</h3>
            <p>
              <strong>FormView</strong> is MOJO's powerful form component that handles:
            </p>
            <ul>
              <li><strong>Form rendering</strong> - Automatic generation of form fields from configuration</li>
              <li><strong>Data binding</strong> - Two-way binding with Model/Collection objects</li>
              <li><strong>Validation</strong> - Built-in HTML5 and custom validators</li>
              <li><strong>Submission</strong> - Async form submission with error handling</li>
              <li><strong>File handling</strong> - Support for file uploads (base64 or multipart)</li>
            </ul>
          </div>
        </div>
        
        <!-- Example 1: Simple Contact Form -->
        <div class="row mb-4">
          <div class="col-lg-6">
            <div class="card">
              <div class="card-header">
                <h4 class="h6 mb-0">
                  <i class="bi bi-1-circle me-2"></i>
                  Simple Contact Form
                </h4>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  A basic form with text input, email, and textarea fields.
                </p>
                <div id="contact-form-container"></div>
              </div>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="card bg-dark text-light">
              <div class="card-header bg-dark border-secondary">
                <h5 class="h6 mb-0">
                  <i class="bi bi-code-slash me-2"></i>
                  Code
                </h5>
              </div>
              <div class="card-body bg-dark">
                <pre class="mb-0 bg-dark"><code class="language-javascript text-light">const contactForm = new FormView({
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your full name'
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'you@example.com'
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      rows: 4
    }
  ],
  submitLabel: 'Send Message',
  onSubmit: async (data) => {
    console.log('Form submitted:', data);
    alert(\`Thank you, \${data.name}!\`);
    return true;
  }
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Example 2: Form with Validation -->
        <div class="row mb-4">
          <div class="col-lg-6">
            <div class="card">
              <div class="card-header">
                <h4 class="h6 mb-0">
                  <i class="bi bi-2-circle me-2"></i>
                  Form with Validation
                </h4>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  Demonstrates built-in HTML5 validation: required, minlength, pattern, min/max.
                </p>
                <div id="validation-form-container"></div>
              </div>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="card bg-dark text-light">
              <div class="card-header bg-dark border-secondary">
                <h5 class="h6 mb-0">
                  <i class="bi bi-code-slash me-2"></i>
                  Code
                </h5>
              </div>
              <div class="card-body bg-dark">
                <pre class="mb-0 bg-dark"><code class="language-javascript text-light">const validationForm = new FormView({
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
      minlength: 3,
      maxlength: 20,
      pattern: '^[a-zA-Z0-9_]+$',
      help: 'Letters, numbers, underscores'
    },
    {
      name: 'password',
      type: 'password',
      required: true,
      minlength: 8,
      help: 'At least 8 characters'
    },
    {
      name: 'age',
      type: 'number',
      required: true,
      min: 18,
      max: 120,
      help: 'Must be 18 or older'
    }
  ],
  submitLabel: 'Create Account',
  onSubmit: async (data) => {
    // Handle submission
    return true;
  }
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Key Concepts -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-lightbulb me-2"></i>
              Key Concepts
            </h3>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6 mb-3">
                <h4 class="h6">Field Configuration</h4>
                <p class="small text-muted">
                  Each field is defined as an object with properties like <code>name</code>, 
                  <code>type</code>, <code>label</code>, <code>required</code>, etc.
                </p>
              </div>
              <div class="col-md-6 mb-3">
                <h4 class="h6">Async Submission</h4>
                <p class="small text-muted">
                  The <code>onSubmit</code> handler is async and should return <code>true</code> 
                  for success or <code>false</code> to prevent form reset.
                </p>
              </div>
              <div class="col-md-6 mb-3">
                <h4 class="h6">Built-in Validation</h4>
                <p class="small text-muted">
                  Use HTML5 attributes: <code>required</code>, <code>minlength</code>, 
                  <code>maxlength</code>, <code>pattern</code>, <code>min</code>, <code>max</code>
                </p>
              </div>
              <div class="col-md-6 mb-3">
                <h4 class="h6">Help Text</h4>
                <p class="small text-muted">
                  Add <code>help</code> property to show guidance text below the field.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Next Steps -->
        <div class="card border-primary">
          <div class="card-body">
            <h3 class="h5 card-title">
              <i class="bi bi-arrow-right-circle me-2"></i>
              Next Steps
            </h3>
            <p class="mb-2">Explore more form capabilities:</p>
            <ul class="mb-0">
              <li><strong>Text Inputs</strong> - 8 different input types with examples</li>
              <li><strong>Selection Fields</strong> - Select, checkbox, radio, toggle</li>
              <li><strong>Advanced Components</strong> - TagInput, DatePicker, MultiSelect</li>
              <li><strong>Validation</strong> - Custom validators and async validation</li>
              <li><strong>Model Integration</strong> - Bind forms to Model/Collection data</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

export default FormViewBasics;
