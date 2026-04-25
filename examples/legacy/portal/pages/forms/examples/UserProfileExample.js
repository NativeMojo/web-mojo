import { Page, FormView } from 'web-mojo';

/**
 * UserProfileExample - Real-world user profile form
 * 
 * Demonstrates a complete user profile form with:
 * - Field groups for organization
 * - Mixed field types
 * - Validation
 * - Column layouts
 */
class UserProfileExample extends Page {
  static pageName = 'forms/examples/profile';
  
  constructor(options = {}) {
    super({
      title: 'User Profile Form Example',
      icon: 'bi-person-circle',
      pageDescription: 'Complete user profile form with validation and groups',
      ...options
    });
  }
  
  async onActionSaveProfile(event, element) {
    event.preventDefault();
    
    const isValid = await this.profileForm.validate();
    if (isValid) {
      const data = await this.profileForm.getFormData();
      console.log('Profile submitted:', data);
      this.getApp().toast.success('Profile updated successfully!');
      
      // Show submitted data
      const output = document.getElementById('profile-output');
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Profile Updated!
          </h5>
          <hr>
          <pre class="mb-0"><code>${JSON.stringify(data, null, 2)}</code></pre>
        </div>
      `;
    }
  }
  
  async onActionCancelEdit(event, element) {
    event.preventDefault();
    this.getApp().toast.info('Changes cancelled');
    this.profileForm.reset();
  }
  
  async onInit() {
    await super.onInit();
    
    // Create comprehensive profile form
    this.profileForm = new FormView({
      fields: [
        // Basic Information Group
        {
          type: 'group',
          columns: 12,
          title: 'Basic Information',
          class: 'mb-4',
          fields: [
            {
              type: 'text',
              name: 'first_name',
              label: 'First Name',
              required: true,
              columns: 6,
              placeholder: 'John',
              value: 'John'
            },
            {
              type: 'text',
              name: 'last_name',
              label: 'Last Name',
              required: true,
              columns: 6,
              placeholder: 'Doe',
              value: 'Doe'
            },
            {
              type: 'text',
              name: 'username',
              label: 'Username',
              required: true,
              columns: 6,
              pattern: '^[a-zA-Z0-9_]{3,20}$',
              help: '3-20 characters, letters, numbers, and underscores only',
              value: 'johndoe'
            },
            {
              type: 'text',
              name: 'title',
              label: 'Job Title',
              columns: 6,
              placeholder: 'Software Engineer',
              value: 'Full Stack Developer'
            },
            {
              type: 'textarea',
              name: 'bio',
              label: 'Bio',
              columns: 12,
              rows: 4,
              maxlength: 500,
              help: 'Tell us about yourself (max 500 characters)',
              value: 'Passionate developer with 5+ years of experience building web applications.'
            }
          ]
        },
        
        // Contact Information Group
        {
          type: 'group',
          columns: 12,
          title: 'Contact Information',
          class: 'mb-4',
          fields: [
            {
              type: 'email',
              name: 'email',
              label: 'Email Address',
              required: true,
              columns: 12,
              value: 'john.doe@example.com'
            },
            {
              type: 'tel',
              name: 'phone',
              label: 'Phone Number',
              columns: 6,
              pattern: '\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}',
              placeholder: '(555) 123-4567',
              value: '(555) 987-6543'
            },
            {
              type: 'url',
              name: 'website',
              label: 'Website',
              columns: 6,
              placeholder: 'https://example.com',
              value: 'https://johndoe.dev'
            }
          ]
        },
        
        // Account Settings Group
        {
          type: 'group',
          columns: 12,
          title: 'Account Settings',
          class: 'mb-4',
          fields: [
            {
              type: 'select',
              name: 'language',
              label: 'Language',
              columns: 6,
              options: [
                { value: 'en', text: 'English' },
                { value: 'es', text: 'Español' },
                { value: 'fr', text: 'Français' },
                { value: 'de', text: 'Deutsch' }
              ],
              value: 'en'
            },
            {
              type: 'select',
              name: 'timezone',
              label: 'Timezone',
              columns: 6,
              options: [
                { value: 'America/New_York', text: 'Eastern Time (ET)' },
                { value: 'America/Chicago', text: 'Central Time (CT)' },
                { value: 'America/Denver', text: 'Mountain Time (MT)' },
                { value: 'America/Los_Angeles', text: 'Pacific Time (PT)' }
              ],
              value: 'America/New_York'
            }
          ]
        },
        
        // Notification Preferences Group
        {
          type: 'group',
          columns: 12,
          title: 'Notification Preferences',
          class: 'mb-4',
          fields: [
            {
              type: 'switch',
              name: 'email_notifications',
              label: 'Email Notifications',
              columns: 4,
              help: 'Receive updates via email',
              value: true
            },
            {
              type: 'switch',
              name: 'push_notifications',
              label: 'Push Notifications',
              columns: 4,
              help: 'Receive browser push notifications',
              value: false
            },
            {
              type: 'switch',
              name: 'marketing_emails',
              label: 'Marketing Emails',
              columns: 4,
              help: 'Receive promotional content',
              value: true
            }
          ]
        },
        
        // Buttons
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Save Profile',
          action: 'save-profile',
          buttonClass: 'btn-primary btn-lg',
          icon: 'bi-check2-circle'
        },
        {
          type: 'button',
          label: 'Cancel',
          action: 'cancel-edit',
          buttonClass: 'btn-outline-secondary btn-lg ms-2',
          icon: 'bi-x-circle'
        }
      ]
    });
    
    this.addChild(this.profileForm, { containerId: 'profile-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="user-profile-example-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-person-circle me-2 text-primary"></i>
            User Profile Form Example
          </h1>
          <p class="text-muted">
            A complete user profile form demonstrating groups, validation, and mixed field types
          </p>
        </div>
        
        <!-- Info Alert -->
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>Features Demonstrated</h6>
          <ul class="mb-0">
            <li><strong>Field Groups:</strong> Related fields organized with <code>type: 'group'</code></li>
            <li><strong>Column Layouts:</strong> Fields sized with <code>columns: 6</code> for responsive layouts</li>
            <li><strong>Mixed Field Types:</strong> Text, email, tel, select, textarea, switch fields</li>
            <li><strong>Validation:</strong> Required fields, email format, phone patterns, username patterns</li>
            <li><strong>Pre-filled Data:</strong> Form loaded with existing user data</li>
          </ul>
        </div>
        
        <!-- Form -->
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <h3 class="h5 mb-0">
              <i class="bi bi-pencil-square me-2"></i>
              Edit Profile
            </h3>
          </div>
          <div class="card-body">
            <div id="profile-form-container"></div>
          </div>
        </div>
        
        <!-- Output -->
        <div id="profile-output"></div>
        
        <!-- Code Example -->
        <div class="card bg-dark text-light mb-4">
          <div class="card-header bg-dark border-secondary">
            <h5 class="h6 mb-0">
              <i class="bi bi-code-slash me-2"></i>
              Implementation Code
            </h5>
          </div>
          <div class="card-body bg-dark">
            <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">const profileForm = new FormView({
  fields: [
    // Use type: 'group' to organize fields
    {
      type: 'group',
      columns: 12,
      title: 'Basic Information',
      fields: [
        {
          type: 'text',
          name: 'first_name',
          label: 'First Name',
          required: true,
          columns: 6  // Half width
        },
        {
          type: 'text',
          name: 'last_name',
          label: 'Last Name',
          required: true,
          columns: 6  // Half width
        },
        {
          type: 'textarea',
          name: 'bio',
          label: 'Bio',
          columns: 12  // Full width
        }
      ]
    },
    {
      type: 'group',
      columns: 12,
      title: 'Contact Information',
      fields: [
        {
          type: 'email',
          name: 'email',
          label: 'Email',
          required: true,
          columns: 12
        }
      ]
    },
    {
      type: 'button',
      label: 'Save Profile',
      action: 'save-profile',
      buttonClass: 'btn-primary'
    }
  ]
});</code></pre>
          </div>
        </div>
        
        <!-- Best Practices -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-stars me-2"></i>
              Best Practices for Profile Forms
            </h3>
          </div>
          <div class="card-body">
            <h6>User Experience</h6>
            <ul>
              <li>Group related fields with <code>type: 'group'</code> and descriptive titles</li>
              <li>Use column widths (<code>columns: 6</code>) for efficient space usage</li>
              <li>Pre-fill with existing data when editing</li>
              <li>Provide helpful placeholder text and help messages</li>
              <li>Use appropriate input types (email, tel, url) for better mobile keyboards</li>
            </ul>
            
            <h6 class="mt-3">Validation</h6>
            <ul>
              <li>Mark required fields clearly</li>
              <li>Use patterns for structured data (phone, username)</li>
              <li>Provide immediate feedback on validation errors</li>
              <li>Don't lose user data on validation failure</li>
            </ul>
            
            <h6 class="mt-3">Layout</h6>
            <ul>
              <li>Use <code>columns: 6</code> for fields that can share a row</li>
              <li>Use <code>columns: 12</code> for fields that need full width</li>
              <li>Add <code>class: 'mb-4'</code> to groups for spacing</li>
              <li>Groups automatically render with proper styling</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

export default UserProfileExample;
