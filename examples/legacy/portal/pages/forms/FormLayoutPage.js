import { Page, FormView } from 'web-mojo';

/**
 * FormLayoutPage - Demonstrates form layout options
 * 
 * Shows columns, groups, tabsets, and dividers for organizing forms
 */
class FormLayoutPage extends Page {
  static pageName = 'forms/layout';
  
  constructor(options = {}) {
    super({
      title: 'Form Layout',
      icon: 'bi-grid',
      pageDescription: 'Organize forms with columns, groups, tabs, and dividers',
      ...options
    });
  }
  
  async onActionSubmitColumnForm(event, element) {
    event.preventDefault();
    const isValid = await this.columnForm.validate();
    if (isValid) {
      const data = await this.columnForm.getFormData();
      console.log('Column form:', data);
      this.getApp().toast.success('Form submitted!');
    }
  }
  
  async onActionSubmitGroupForm(event, element) {
    event.preventDefault();
    const isValid = await this.groupForm.validate();
    if (isValid) {
      const data = await this.groupForm.getFormData();
      console.log('Group form:', data);
      this.getApp().toast.success('Profile saved!');
    }
  }
  
  async onActionSubmitTabForm(event, element) {
    event.preventDefault();
    const isValid = await this.tabForm.validate();
    if (isValid) {
      const data = await this.tabForm.getFormData();
      console.log('Tab form:', data);
      this.getApp().toast.success('Settings saved!');
    }
  }
  
  async onActionSubmitDividerForm(event, element) {
    event.preventDefault();
    const isValid = await this.dividerForm.validate();
    if (isValid) {
      const data = await this.dividerForm.getFormData();
      console.log('Divider form:', data);
      this.getApp().toast.success('Submitted!');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // 1. Column Layout Example
    this.columnForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Column Layout Example',
          level: 5
        },
        {
          type: 'text',
          name: 'first_name',
          label: 'First Name',
          required: true,
          columns: 6,
          placeholder: 'John'
        },
        {
          type: 'text',
          name: 'last_name',
          label: 'Last Name',
          required: true,
          columns: 6,
          placeholder: 'Doe'
        },
        {
          type: 'email',
          name: 'email',
          label: 'Email Address',
          required: true,
          columns: 12, // Full width
          placeholder: 'john.doe@example.com'
        },
        {
          type: 'tel',
          name: 'phone',
          label: 'Phone',
          columns: 6,
          placeholder: '(555) 123-4567'
        },
        {
          type: 'select',
          name: 'country',
          label: 'Country',
          columns: 6,
          options: [
            { value: '', text: 'Select...' },
            { value: 'us', text: 'United States' },
            { value: 'ca', text: 'Canada' },
            { value: 'uk', text: 'United Kingdom' }
          ]
        },
        {
          type: 'button',
          label: 'Submit',
          action: 'submit-column-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.columnForm, { containerId: 'column-form-container' });
    
    // 2. Field Groups Example
    this.groupForm = new FormView({
      fields: [
        {
          type: 'group',
          columns: 12,
          title: 'Personal Information',
          class: 'mb-4',
          fields: [
            {
              type: 'text',
              name: 'full_name',
              label: 'Full Name',
              required: true,
              columns: 6,
              placeholder: 'John Doe'
            },
            {
              type: 'email',
              name: 'user_email',
              label: 'Email',
              required: true,
              columns: 6,
              placeholder: 'john@example.com'
            },
            {
              type: 'textarea',
              name: 'bio',
              label: 'Bio',
              columns: 12,
              rows: 3,
              placeholder: 'Tell us about yourself...'
            }
          ]
        },
        {
          type: 'group',
          columns: 12,
          title: 'Account Settings',
          class: 'mb-4',
          fields: [
            {
              type: 'switch',
              name: 'newsletter',
              label: 'Subscribe to newsletter'
            },
            {
              type: 'switch',
              name: 'notifications',
              label: 'Enable notifications'
            }
          ]
        },
        {
          type: 'button',
          label: 'Save Profile',
          action: 'submit-group-form',
          buttonClass: 'btn-success',
          icon: 'bi-save'
        }
      ]
    });
    
    this.addChild(this.groupForm, { containerId: 'group-form-container' });
    
    // 3. Tabset Example
    this.tabForm = new FormView({
      fields: [
        {
          type: 'tabset',
          tabs: [
            {
              label: 'Basic',
              icon: 'bi-person',
              fields: [
                {
                  type: 'text',
                  name: 'display_name',
                  label: 'Display Name',
                  required: true,
                  placeholder: 'Your name'
                },
                {
                  type: 'email',
                  name: 'contact_email',
                  label: 'Email',
                  required: true,
                  placeholder: 'email@example.com'
                },
                {
                  type: 'select',
                  name: 'language',
                  label: 'Language',
                  options: [
                    { value: 'en', text: 'English' },
                    { value: 'es', text: 'Spanish' },
                    { value: 'fr', text: 'French' }
                  ]
                }
              ]
            },
            {
              label: 'Advanced',
              icon: 'bi-gear',
              fields: [
                {
                  type: 'select',
                  name: 'timezone',
                  label: 'Timezone',
                  options: [
                    { value: 'UTC', text: 'UTC' },
                    { value: 'EST', text: 'Eastern' },
                    { value: 'PST', text: 'Pacific' }
                  ]
                },
                {
                  type: 'radio',
                  name: 'theme',
                  label: 'Theme',
                  options: [
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'auto', label: 'Auto' }
                  ],
                  value: 'auto'
                },
                {
                  type: 'switch',
                  name: 'advanced_mode',
                  label: 'Enable advanced features'
                }
              ]
            },
            {
              label: 'Privacy',
              icon: 'bi-shield-lock',
              fields: [
                {
                  type: 'switch',
                  name: 'public_profile',
                  label: 'Make profile public'
                },
                {
                  type: 'switch',
                  name: 'show_email',
                  label: 'Show email on profile'
                },
                {
                  type: 'switch',
                  name: 'analytics',
                  label: 'Enable analytics tracking'
                }
              ]
            }
          ]
        },
        {
          type: 'button',
          label: 'Save Settings',
          action: 'submit-tab-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.tabForm, { containerId: 'tab-form-container' });
    
    // 4. Dividers Example
    this.dividerForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Contact Form',
          level: 5
        },
        {
          type: 'text',
          name: 'contact_name',
          label: 'Name',
          required: true,
          placeholder: 'Your name'
        },
        {
          type: 'email',
          name: 'contact_email_addr',
          label: 'Email',
          required: true,
          placeholder: 'you@example.com'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Message',
          level: 6
        },
        {
          type: 'select',
          name: 'subject',
          label: 'Subject',
          options: [
            { value: '', text: 'Select subject...' },
            { value: 'support', text: 'Support Request' },
            { value: 'sales', text: 'Sales Inquiry' },
            { value: 'feedback', text: 'Feedback' }
          ]
        },
        {
          type: 'textarea',
          name: 'message',
          label: 'Message',
          required: true,
          rows: 5,
          placeholder: 'Type your message here...'
        },
        {
          type: 'divider'
        },
        {
          type: 'switch',
          name: 'copy_me',
          label: 'Send me a copy of this message'
        },
        {
          type: 'button',
          label: 'Send Message',
          action: 'submit-divider-form',
          buttonClass: 'btn-primary',
          icon: 'bi-send'
        }
      ]
    });
    
    this.addChild(this.dividerForm, { containerId: 'divider-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="form-layout-page">
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-grid me-2 text-primary"></i>
            Form Layout
          </h1>
          <p class="text-muted">
            Organize forms using columns, groups, tabs, and dividers
          </p>
        </div>
        
        <!-- Column Layout -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-layout-three-columns me-2"></i>
              Column Layout
            </h3>
          </div>
          <div class="card-body">
            <p class="text-muted mb-3">
              Use <code>columns: 6</code> on fields to create multi-column layouts (Bootstrap 12-column grid).
            </p>
            <div id="column-form-container"></div>
          </div>
        </div>
        
        <div class="card mb-4 bg-dark text-light">
          <div class="card-header bg-dark border-secondary">
            <h5 class="h6 mb-0"><i class="bi bi-code-slash me-2"></i>Column Layout Code</h5>
          </div>
          <div class="card-body bg-dark">
            <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">const form = new FormView({
  fields: [
    {
      type: 'text',
      name: 'first_name',
      label: 'First Name',
      columns: 6  // Half width
    },
    {
      type: 'text',
      name: 'last_name',
      label: 'Last Name',
      columns: 6  // Half width
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      columns: 12  // Full width
    }
  ]
});</code></pre>
          </div>
        </div>
        
        <!-- Field Groups -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-collection me-2"></i>
              Field Groups
            </h3>
          </div>
          <div class="card-body">
            <p class="text-muted mb-3">
              Use <code>type: 'group'</code> to organize related fields with titles and sections.
            </p>
            <div id="group-form-container"></div>
          </div>
        </div>
        
        <div class="card mb-4 bg-dark text-light">
          <div class="card-header bg-dark border-secondary">
            <h5 class="h6 mb-0"><i class="bi bi-code-slash me-2"></i>Field Groups Code</h5>
          </div>
          <div class="card-body bg-dark">
            <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">const form = new FormView({
  fields: [
    {
      type: 'group',
      columns: 12,
      title: 'Personal Information',
      class: 'mb-4',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Name',
          columns: 6
        },
        {
          type: 'email',
          name: 'email',
          label: 'Email',
          columns: 6
        }
      ]
    },
    {
      type: 'group',
      columns: 12,
      title: 'Settings',
      fields: [
        {
          type: 'switch',
          name: 'newsletter',
          label: 'Subscribe'
        }
      ]
    }
  ]
});</code></pre>
          </div>
        </div>
        
        <!-- Tabset -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-folder me-2"></i>
              Tabbed Organization
            </h3>
          </div>
          <div class="card-body">
            <p class="text-muted mb-3">
              Use <code>type: 'tabset'</code> to organize fields into tabs for complex forms.
            </p>
            <div id="tab-form-container"></div>
          </div>
        </div>
        
        <div class="card mb-4 bg-dark text-light">
          <div class="card-header bg-dark border-secondary">
            <h5 class="h6 mb-0"><i class="bi bi-code-slash me-2"></i>Tabset Code</h5>
          </div>
          <div class="card-body bg-dark">
            <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">const form = new FormView({
  fields: [
    {
      type: 'tabset',
      tabs: [
        {
          label: 'Basic',
          icon: 'bi-person',
          fields: [
            { type: 'text', name: 'name', label: 'Name' },
            { type: 'email', name: 'email', label: 'Email' }
          ]
        },
        {
          label: 'Advanced',
          icon: 'bi-gear',
          fields: [
            { type: 'select', name: 'timezone', label: 'Timezone', options: [...] },
            { type: 'switch', name: 'advanced', label: 'Advanced Mode' }
          ]
        }
      ]
    }
  ]
});</code></pre>
          </div>
        </div>
        
        <!-- Dividers -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-dash-lg me-2"></i>
              Dividers & Headers
            </h3>
          </div>
          <div class="card-body">
            <p class="text-muted mb-3">
              Use <code>type: 'divider'</code> and <code>type: 'header'</code> to visually separate form sections.
            </p>
            <div id="divider-form-container"></div>
          </div>
        </div>
        
        <div class="card mb-4 bg-dark text-light">
          <div class="card-header bg-dark border-secondary">
            <h5 class="h6 mb-0"><i class="bi bi-code-slash me-2"></i>Dividers & Headers Code</h5>
          </div>
          <div class="card-body bg-dark">
            <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">const form = new FormView({
  fields: [
    { type: 'header', text: 'Section Title', level: 5 },
    { type: 'text', name: 'field1', label: 'Field 1' },
    { type: 'text', name: 'field2', label: 'Field 2' },
    
    { type: 'divider' },  // Horizontal line separator
    
    { type: 'header', text: 'Another Section', level: 6 },
    { type: 'textarea', name: 'message', label: 'Message' }
  ]
});</code></pre>
          </div>
        </div>
        
        <!-- Layout Reference -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-info-circle me-2"></i>
              Layout Options Reference
            </h3>
          </div>
          <div class="card-body">
            <h6>Column Layout</h6>
            <ul>
              <li><code>columns: 6</code> - Field spans 6 of 12 columns (half width)</li>
              <li><code>columns: 4</code> - Field spans 4 of 12 columns (third width)</li>
              <li><code>columns: 12</code> - Field spans full width</li>
              <li>Uses Bootstrap's 12-column grid system</li>
              <li>Automatically stacks on mobile devices</li>
            </ul>
            
            <h6 class="mt-3">Field Groups</h6>
            <ul>
              <li><code>type: 'group'</code> - Creates a field group</li>
              <li><code>title</code> - Group heading text</li>
              <li><code>columns</code> - Group width in grid (typically 12)</li>
              <li><code>class</code> - Additional CSS classes (e.g., 'mb-4' for spacing)</li>
              <li><code>fields: []</code> - Array of fields within the group</li>
              <li>Groups can have their own column layouts</li>
            </ul>
            
            <h6 class="mt-3">Tabset</h6>
            <ul>
              <li><code>type: 'tabset'</code> - Creates tabbed organization</li>
              <li><code>tabs: []</code> - Array of tab objects</li>
              <li>Each tab has: <code>label</code>, <code>icon</code>, <code>fields</code></li>
              <li>Perfect for complex forms with many fields</li>
              <li>Keeps forms organized without overwhelming users</li>
            </ul>
            
            <h6 class="mt-3">Structural Elements</h6>
            <ul>
              <li><code>type: 'header'</code> - Section heading (h1-h6)</li>
              <li><code>type: 'divider'</code> - Horizontal line separator</li>
              <li><code>type: 'html'</code> - Custom HTML content</li>
              <li>Use to visually organize long forms</li>
            </ul>
            
            <h6 class="mt-3">Best Practices</h6>
            <ul>
              <li>Use 2-column layouts (columns: 6) for most forms</li>
              <li>Make long text fields (textarea) span full width (columns: 12)</li>
              <li>Group related fields together</li>
              <li>Use tabs for forms with 20+ fields or distinct sections</li>
              <li>Add dividers between unrelated sections</li>
              <li>Keep labels concise and aligned</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

export default FormLayoutPage;
