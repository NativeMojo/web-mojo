import { Dialog } from 'web-mojo';
import { Page } from 'web-mojo';

class FormDialogsPage extends Page {
  static pageName = 'Form Dialogs';
  static title = 'Form Dialog Tests';
  static icon = 'chat-square-text';
  static route = 'form-dialogs';

  constructor(options = {}) {
    super({
      ...options,
      tagName: 'div',
      className: 'form-dialogs-page container-fluid py-4'
    });
  }

  async renderTemplate() {
    return `
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="h2">
              <i class="bi bi-chat-square-text me-2"></i>
              Form Dialog Tests
            </h1>
          </div>

          <div class="row g-4">
            <!-- Basic Form Dialog -->
            <div class="col-lg-6">
              <div class="card h-100">
                <div class="card-header">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-window-plus me-2"></i>
                    Basic Form Dialog
                  </h5>
                </div>
                <div class="card-body">
                  <p class="card-text">Test basic form inputs with validation.</p>
                  <button class="btn btn-primary" data-action="show-basic-form">
                    <i class="bi bi-plus-circle me-2"></i>
                    Open Basic Form
                  </button>
                </div>
              </div>
            </div>

            <!-- Date Range Forms -->
            <div class="col-lg-6">
              <div class="card h-100">
                <div class="card-header">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-calendar-range me-2"></i>
                    Date Range Dialog
                  </h5>
                </div>
                <div class="card-body">
                  <p class="card-text">Test enhanced date range picker with different configurations.</p>
                  <button class="btn btn-success" data-action="show-daterange-form">
                    <i class="bi bi-calendar3 me-2"></i>
                    Open Date Range Form
                  </button>
                </div>
              </div>
            </div>

            <!-- File Upload Dialog -->
            <div class="col-lg-6">
              <div class="card h-100">
                <div class="card-header">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-cloud-upload me-2"></i>
                    File Upload Dialog
                  </h5>
                </div>
                <div class="card-body">
                  <p class="card-text">Test file uploads and image handling in dialogs.</p>
                  <button class="btn btn-info" data-action="show-file-form">
                    <i class="bi bi-upload me-2"></i>
                    Open File Form
                  </button>
                </div>
              </div>
            </div>

            <!-- Advanced Mixed Form -->
            <div class="col-lg-6">
              <div class="card h-100">
                <div class="card-header">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-gear-wide me-2"></i>
                    Advanced Mixed Form
                  </h5>
                </div>
                <div class="card-body">
                  <p class="card-text">Test complex form with all input types and validation.</p>
                  <button class="btn btn-warning" data-action="show-advanced-form">
                    <i class="bi bi-lightning me-2"></i>
                    Open Advanced Form
                  </button>
                </div>
              </div>
            </div>

            <!-- HTML Preview Dialog -->
            <div class="col-lg-6">
              <div class="card h-100">
                <div class="card-header">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-code-square me-2"></i>
                    HTML Preview Dialog
                  </h5>
                </div>
                <div class="card-body">
                  <p class="card-text">Test HTML preview field with live preview in sandboxed iframe.</p>
                  <button class="btn btn-danger" data-action="show-html-preview-form">
                    <i class="bi bi-eye me-2"></i>
                    Open HTML Preview Form
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Results Display -->
          <div class="row mt-4">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-code-slash me-2"></i>
                    Last Form Result
                  </h5>
                </div>
                <div class="card-body">
                  <pre id="form-result" class="bg-light p-3 rounded">No form submitted yet...</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async onActionShowBasicForm(action, event, element) {
    try {
      const formData = await Dialog.showForm({
        title: 'Basic User Information',
        size: 'md',
        fields: [
          {
            type: 'text',
            name: 'firstName',
            label: 'First Name',
            required: true,
            placeholder: 'Enter your first name',
            help: 'Your given name'
          },
          {
            type: 'text',
            name: 'lastName', 
            label: 'Last Name',
            required: true,
            placeholder: 'Enter your last name',
            help: 'Your family name'
          },
          {
            type: 'email',
            name: 'email',
            label: 'Email Address',
            required: true,
            placeholder: 'user@example.com',
            help: 'We will never share your email'
          },
          {
            type: 'select',
            name: 'department',
            label: 'Department',
            required: true,
            options: [
              { value: '', text: 'Select Department...' },
              { value: 'engineering', text: 'Engineering' },
              { value: 'marketing', text: 'Marketing' },
              { value: 'sales', text: 'Sales' },
              { value: 'support', text: 'Customer Support' }
            ],
            help: 'Choose your department'
          },
          {
            type: 'switch',
            name: 'newsletter',
            label: 'Subscribe to Newsletter',
            help: 'Receive monthly updates'
          }
        ]
      });

      if (formData) {
        this.displayFormResult('Basic Form', formData);
        this.getApp().showSuccess('Basic form submitted successfully!');
      } else {
        this.getApp().showInfo('Form was cancelled');
      }
    } catch (error) {
      console.error('Basic form error:', error);
      this.getApp().showError('Failed to show basic form');
    }
  }

  async onActionShowDaterangeForm(action, event, element) {
    try {
      const formData = await Dialog.showForm({
        title: 'Date Range Testing',
        size: 'lg',
        fields: [
          {
            type: 'text',
            name: 'eventName',
            label: 'Event Name',
            required: true,
            placeholder: 'Enter event name',
            columns: 12
          },
          {
            type: 'daterange',
            name: 'project_duration',
            label: 'Standard Date Range (Combined Display)',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            separator: ' to ',
            help: 'Returns formatted display string and hidden start/end fields',
            columns: 6
          },
          {
            type: 'daterange',
            startName: 'event_start',
            endName: 'event_end',
            label: 'Separate Field Names',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            separator: ' → ',
            help: 'Returns separate start/end date fields',
            columns: 6
          },
          {
            type: 'daterange',
            startName: 'booking_start_epoch',
            endName: 'booking_end_epoch',
            label: 'Epoch Timestamps',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            outputFormat: 'epoch',
            separator: ' through ',
            help: 'Returns Unix timestamps for database storage',
            columns: 6
          },
          {
            type: 'daterange',
            startName: 'iso_start',
            endName: 'iso_end',
            label: 'ISO Date Format',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            outputFormat: 'iso',
            separator: ' until ',
            help: 'Returns ISO 8601 formatted dates',
            columns: 6
          },
          {
            type: 'textarea',
            name: 'notes',
            label: 'Additional Notes',
            placeholder: 'Enter any additional details...',
            rows: 3,
            help: 'Optional event details',
            columns: 12
          }
        ]
      });

      if (formData) {
        this.displayFormResult('Date Range Form', formData);
        this.getApp().showSuccess('Date range form submitted successfully!');
      } else {
        this.getApp().showInfo('Date range form was cancelled');
      }
    } catch (error) {
      console.error('Date range form error:', error);
      this.getApp().showError('Failed to show date range form');
    }
  }

  async onActionShowFileForm(action, event, element) {
    try {
      const formData = await Dialog.showForm({
        title: 'File Upload Form',
        size: 'md',
        fileHandling: 'base64',
        fields: [
          {
            type: 'text',
            name: 'documentTitle',
            label: 'Document Title',
            required: true,
            placeholder: 'Enter document title'
          },
          {
            type: 'file',
            name: 'document',
            label: 'Upload Document',
            accept: '.pdf,.doc,.docx,.txt',
            help: 'Supported formats: PDF, DOC, DOCX, TXT'
          },
          {
            type: 'image',
            name: 'thumbnail',
            label: 'Thumbnail Image',
            accept: '.jpg,.jpeg,.png,.gif',
            help: 'Optional thumbnail image'
          },
          {
            type: 'select',
            name: 'category',
            label: 'Document Category',
            required: true,
            options: [
              { value: '', text: 'Select category...' },
              { value: 'contract', text: 'Contract' },
              { value: 'invoice', text: 'Invoice' },
              { value: 'report', text: 'Report' },
              { value: 'presentation', text: 'Presentation' }
            ]
          }
        ]
      });

      if (formData) {
        // For display purposes, truncate base64 data
        const displayData = { ...formData };
        if (displayData.document && typeof displayData.document === 'string' && displayData.document.startsWith('data:')) {
          displayData.document = displayData.document.substring(0, 100) + '... [base64 data truncated]';
        }
        if (displayData.thumbnail && typeof displayData.thumbnail === 'string' && displayData.thumbnail.startsWith('data:')) {
          displayData.thumbnail = displayData.thumbnail.substring(0, 100) + '... [base64 data truncated]';
        }
        
        this.displayFormResult('File Upload Form', displayData);
        this.getApp().showSuccess('File upload form submitted successfully!');
      } else {
        this.getApp().showInfo('File upload form was cancelled');
      }
    } catch (error) {
      console.error('File form error:', error);
      this.getApp().showError('Failed to show file form');
    }
  }

  async onActionShowAdvancedForm(action, event, element) {
    try {
      const formData = await Dialog.showForm({
        title: 'Advanced Mixed Form',
        size: 'xl',
        fields: [
          {
            type: 'header',
            text: 'Personal Information',
            columns: 12
          },
          {
            type: 'text',
            name: 'fullName',
            label: 'Full Name',
            required: true,
            placeholder: 'John Doe',
            columns: 6
          },
          {
            type: 'email',
            name: 'contactEmail',
            label: 'Email Address',
            required: true,
            placeholder: 'john@example.com',
            columns: 6
          },
          {
            type: 'tel',
            name: 'phone',
            label: 'Phone Number',
            placeholder: '+1 (555) 123-4567',
            columns: 4
          },
          {
            type: 'number',
            name: 'age',
            label: 'Age',
            min: 18,
            max: 120,
            placeholder: '25',
            columns: 4
          },
          {
            type: 'range',
            name: 'experience',
            label: 'Years of Experience',
            min: 0,
            max: 50,
            value: 5,
            columns: 4
          },
          {
            type: 'divider',
            columns: 12
          },
          {
            type: 'header',
            text: 'Event Planning',
            columns: 12
          },
          {
            type: 'datepicker',
            name: 'eventDate',
            label: 'Event Date',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            help: 'Enhanced single date picker',
            columns: 6
          },
          {
            type: 'time',
            name: 'eventTime',
            label: 'Event Time',
            help: 'What time does the event start?',
            columns: 6
          },
          {
            type: 'daterange',
            startName: 'availability_start',
            endName: 'availability_end',
            label: 'Availability Window',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            separator: ' through ',
            help: 'When are you available?',
            columns: 6
          },
          {
            type: 'daterange',
            startName: 'booking_epoch_start',
            endName: 'booking_epoch_end',
            label: 'Booking Period (Epoch)',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            outputFormat: 'epoch',
            separator: ' to ',
            help: 'Stored as Unix timestamps',
            columns: 6
          },
          {
            type: 'divider',
            columns: 12
          },
          {
            type: 'header',
            text: 'Preferences & Options',
            columns: 12
          },
          {
            type: 'radio',
            name: 'priority',
            label: 'Priority Level',
            required: true,
            options: [
              { value: 'low', text: 'Low Priority' },
              { value: 'medium', text: 'Medium Priority' },
              { value: 'high', text: 'High Priority' },
              { value: 'urgent', text: 'Urgent' }
            ],
            columns: 6
          },
          {
            type: 'checkbox',
            name: 'notifications',
            label: 'Notification Preferences',
            options: [
              { value: 'email', text: 'Email notifications' },
              { value: 'sms', text: 'SMS notifications' },
              { value: 'push', text: 'Push notifications' },
              { value: 'calendar', text: 'Calendar reminders' }
            ],
            columns: 6
          },
          {
            type: 'color',
            name: 'themeColor',
            label: 'Theme Color',
            value: '#007bff',
            help: 'Choose your preferred color',
            columns: 4
          },
          {
            type: 'switch',
            name: 'publicEvent',
            label: 'Make Event Public',
            help: 'Allow others to see this event',
            columns: 4
          },
          {
            type: 'switch',
            name: 'sendReminders',
            label: 'Send Reminders',
            value: true,
            help: 'Automatically send reminder notifications',
            columns: 4
          },
          {
            type: 'textarea',
            name: 'description',
            label: 'Event Description',
            placeholder: 'Describe the event, requirements, or any additional details...',
            rows: 4,
            help: 'Provide detailed information about the event',
            columns: 12
          }
        ]
      });

      if (formData) {
        this.displayFormResult('Advanced Mixed Form', formData);
        this.getApp().showSuccess('Advanced form submitted successfully!');
      } else {
        this.getApp().showInfo('Advanced form was cancelled');
      }
    } catch (error) {
      console.error('Advanced form error:', error);
      this.getApp().showError('Failed to show advanced form');
    }
  }

  async onActionShowHtmlPreviewForm(action, event, element) {
    try {
      // Sample HTML email template
      const sampleHtml = `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 30px;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        .feature-box {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🎉 Welcome to Our Platform!</h1>
        </div>
        <div class="content">
            <h2>Hello there!</h2>
            <p>We're thrilled to have you join our community. This is a sample HTML email template that demonstrates the power of the HTML preview feature.</p>
            
            <div class="feature-box">
                <strong>✨ What you can do:</strong>
                <ul>
                    <li>Edit HTML in real-time</li>
                    <li>Preview changes instantly</li>
                    <li>Use full CSS styling</li>
                    <li>Create beautiful emails</li>
                </ul>
            </div>
            
            <p>Click the button below to get started:</p>
            <center>
                <a href="#" class="button">Get Started Now</a>
            </center>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br><strong>The Team</strong></p>
        </div>
        <div class="footer">
            <p>© 2024 Your Company. All rights reserved.</p>
            <p>123 Main Street, City, State 12345</p>
        </div>
    </div>
</body>
</html>`;

      const formData = await Dialog.showForm({
        title: 'HTML Email Template Editor',
        size: 'xl',
        defaults: {
          template_name: 'Welcome Email',
          template_type: 'email',
          html_content: sampleHtml,
          notes: 'This is a sample welcome email template with modern styling.'
        },
        fields: [
          {
            type: 'text',
            name: 'template_name',
            label: 'Template Name',
            required: true,
            placeholder: 'e.g., Welcome Email, Newsletter...',
            help: 'A descriptive name for this HTML template',
            columns: 6
          },
          {
            type: 'select',
            name: 'template_type',
            label: 'Template Type',
            required: true,
            options: [
              { value: 'email', text: 'Email Template' },
              { value: 'newsletter', text: 'Newsletter' },
              { value: 'notification', text: 'Notification' },
              { value: 'marketing', text: 'Marketing' },
              { value: 'other', text: 'Other' }
            ],
            help: 'Select the type of template',
            columns: 6
          },
          {
            type: 'htmlpreview',
            name: 'html_content',
            label: 'HTML Content',
            required: true,
            rows: 12,
            placeholder: 'Enter your HTML code here...',
            help: 'Write your HTML code and click the Preview button (eye icon) to see the rendered output in a popup',
            columns: 12
          },
          {
            type: 'textarea',
            name: 'notes',
            label: 'Template Notes',
            placeholder: 'Optional notes about this template...',
            rows: 3,
            help: 'Internal notes or documentation about this template',
            columns: 12
          }
        ]
      });

      if (formData) {
        this.displayFormResult('HTML Preview Form', formData);
        this.getApp().showSuccess('HTML template form submitted successfully!');
      } else {
        this.getApp().showInfo('HTML preview form was cancelled');
      }
    } catch (error) {
      console.error('HTML preview form error:', error);
      this.getApp().showError('Failed to show HTML preview form');
    }
  }

  displayFormResult(formType, data) {
    const resultElement = this.element.querySelector('#form-result');
    if (resultElement) {
      const formattedData = JSON.stringify(data, null, 2);
      resultElement.textContent = `${formType} Result:\n\n${formattedData}`;
      
      // Also show in a separate dialog for better visibility
      Dialog.show({
        title: `${formType} - Form Data Result`,
        body: `
          <div class="alert alert-success mb-3">
            <i class="bi bi-check-circle me-2"></i>
            Form submitted successfully!
          </div>
          <h6>Raw JSON Data:</h6>
          <pre class="bg-light p-3 rounded border" style="max-height: 400px; overflow-y: auto;"><code>${this.escapeHtml(formattedData)}</code></pre>
        `,
        size: 'lg',
        buttons: [
          { text: 'Copy to Clipboard', class: 'btn-secondary', action: 'copy' },
          { text: 'Close', class: 'btn-primary', action: 'close' }
        ]
      }).then((result) => {
        if (result === 'copy') {
          navigator.clipboard.writeText(formattedData).then(() => {
            this.getApp().showSuccess('Form data copied to clipboard!');
          }).catch(() => {
            this.getApp().showError('Failed to copy to clipboard');
          });
        }
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default FormDialogsPage;