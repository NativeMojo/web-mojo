/**
 * DialogsPage - Comprehensive examples of the Dialog component
 */

import Page from '../../../src/core/Page.js';
import View from '../../../src/core/View.js';
import Dialog from '../../../src/components/Dialog.js';


class DialogsPage extends Page {
    constructor(options = {}) {
        super({
            name: 'dialogs',
            title: 'Dialogs - MOJO Examples',
            template: 'templates/dialogs.mst',
            className: 'p-4',
            ...options
        });
    }

  // Size examples
  async onActionShowSmall() {
    const dialog = new Dialog({
      title: 'Small Dialog',
      size: 'sm',
      body: '<p>This is a small dialog. Perfect for simple confirmations or alerts.</p>',
      buttons: [
        { text: 'Close', class: 'btn-secondary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowDefault() {
    const dialog = new Dialog({
      title: 'Default Size Dialog',
      body: '<p>This is the default dialog size. It works well for most content.</p>',
      buttons: [
        { text: 'Got it', class: 'btn-primary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowLarge() {
    const dialog = new Dialog({
      title: 'Large Dialog',
      size: 'lg',
      body: `
        <div class="row">
          <div class="col-md-6">
            <h5>Left Column</h5>
            <p>Large dialogs are great for displaying more complex content or forms that need more space.</p>
          </div>
          <div class="col-md-6">
            <h5>Right Column</h5>
            <p>You can use Bootstrap's grid system within the dialog body.</p>
          </div>
        </div>
      `,
      buttons: [
        { text: 'Close', class: 'btn-secondary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowXl() {
    const dialog = new Dialog({
      title: 'Extra Large Dialog',
      size: 'xl',
      body: `
        <h5>Extra Large Content Area</h5>
        <p>Extra large dialogs provide maximum space for complex interfaces, detailed forms, or data tables.</p>
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          This dialog size is perfect for displaying tables, charts, or detailed information.
        </div>
      `,
      buttons: [
        { text: 'Close', class: 'btn-secondary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowFullscreen() {
    const dialog = new Dialog({
      title: 'Fullscreen Dialog',
      size: 'fullscreen',
      body: `
        <div class="container-fluid">
          <h3>Fullscreen Mode</h3>
          <p>This dialog takes up the entire viewport. Great for immersive experiences or complex workflows.</p>
          <div class="row mt-4">
            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">Card 1</h5>
                  <p class="card-text">Content in fullscreen mode.</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">Card 2</h5>
                  <p class="card-text">More content here.</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">Card 3</h5>
                  <p class="card-text">Even more content.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      buttons: [
        { text: 'Exit Fullscreen', class: 'btn-primary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  // Responsive fullscreen examples
  async onActionShowFullscreenSm() {
    const dialog = new Dialog({
      title: 'Fullscreen on Small Devices',
      size: 'fullscreen-sm-down',
      body: '<p>This dialog is fullscreen on devices smaller than 576px (sm breakpoint).</p>',
      buttons: [
        { text: 'Close', class: 'btn-primary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowFullscreenMd() {
    const dialog = new Dialog({
      title: 'Fullscreen on Medium Devices',
      size: 'fullscreen-md-down',
      body: '<p>This dialog is fullscreen on devices smaller than 768px (md breakpoint).</p>',
      buttons: [
        { text: 'Close', class: 'btn-primary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowFullscreenLg() {
    const dialog = new Dialog({
      title: 'Fullscreen on Large Devices',
      size: 'fullscreen-lg-down',
      body: '<p>This dialog is fullscreen on devices smaller than 992px (lg breakpoint).</p>',
      buttons: [
        { text: 'Close', class: 'btn-primary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowFullscreenXl() {
    const dialog = new Dialog({
      title: 'Fullscreen on Extra Large Devices',
      size: 'fullscreen-xl-down',
      body: '<p>This dialog is fullscreen on devices smaller than 1200px (xl breakpoint).</p>',
      buttons: [
        { text: 'Close', class: 'btn-primary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  // Options examples
  async onActionShowCentered() {
    const dialog = new Dialog({
      title: 'Vertically Centered',
      centered: true,
      body: '<p>This dialog is vertically centered in the viewport.</p>',
      buttons: [
        { text: 'Nice!', class: 'btn-success', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowScrollable() {
    const longContent = Array(20).fill(0).map((_, i) =>
      `<p>This is paragraph ${i + 1}. The dialog body will scroll when content exceeds the viewport height.</p>`
    ).join('');

    const dialog = new Dialog({
      title: 'Scrollable Dialog',
      scrollable: true,
      body: `
        <h5>Long Content</h5>
        ${longContent}
        <p><strong>You've reached the end!</strong></p>
      `,
      buttons: [
        { text: 'Close', class: 'btn-primary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowStatic() {
    const dialog = new Dialog({
      title: 'Static Backdrop',
      backdrop: 'static',
      keyboard: false,
      body: `
        <p>This dialog cannot be closed by clicking outside or pressing ESC.</p>
        <p>You must click the close button to dismiss it.</p>
      `,
      buttons: [
        { text: 'I understand', class: 'btn-primary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  async onActionShowNoFade() {
    const dialog = new Dialog({
      title: 'No Fade Animation',
      fade: false,
      body: '<p>This dialog appears instantly without fade animation.</p>',
      buttons: [
        { text: 'Close', class: 'btn-secondary', dismiss: true }
      ]
    });

    await this.showDialog(dialog);
  }

  // View as body examples
  async onActionShowViewDialog() {
    // Create a custom View component
    class CounterView extends View {
      constructor() {
        super();
        this.data = { count: 0 };
      }

      async getTemplate() {
        return `
          <div class="text-center p-4">
            <h3>Counter: {{count}}</h3>
            <div class="btn-group mt-3">
              <button class="btn btn-danger" data-action="decrement">
                <i class="bi bi-dash"></i>
              </button>
              <button class="btn btn-primary" data-action="increment">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
        `;
      }

      async onActionIncrement() {
        this.updateData({ count: this.data.count + 1 });
      }

      async onActionDecrement() {
        this.updateData({ count: Math.max(0, this.data.count - 1) });
      }
    }

    const counterView = new CounterView();

    const dialog = new Dialog({
      title: 'Interactive View Component',
      body: counterView,
      buttons: [
        { text: 'Reset', class: 'btn-warning', action: 'reset' },
        { text: 'Close', class: 'btn-secondary', dismiss: true }
      ]
    });

    dialog.on('action:reset', () => {
      counterView.updateData({ count: 0 });
    });

    await this.showDialog(dialog);
  }

  async onActionShowFormView() {
    class FormView extends View {
      async getTemplate() {
        return `
          <form id="demo-form">
            <div class="mb-3">
              <label class="form-label">Name</label>
              <input type="text" class="form-control" name="name" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" name="email" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Message</label>
              <textarea class="form-control" name="message" rows="3"></textarea>
            </div>
          </form>
        `;
      }

      getFormData() {
        const form = this.element.querySelector('#demo-form');
        return new FormData(form);
      }
    }

    const formView = new FormView();

    const dialog = new Dialog({
      title: 'Form as View Component',
      body: formView,
      buttons: [
        { text: 'Submit', class: 'btn-primary', action: 'submit' },
        { text: 'Cancel', class: 'btn-secondary', dismiss: true }
      ]
    });

    dialog.on('action:submit', () => {
      const formData = formView.getFormData();
      const data = Object.fromEntries(formData);
      console.log('Form data:', data);
      this.showSuccess(`Form submitted for ${data.name}`);
      dialog.hide();
    });

    await this.showDialog(dialog);
  }

  // Utility method examples
  async onActionShowAlert() {
    await Dialog.alert(
      'This is a simple alert dialog. It displays a message and waits for the user to acknowledge it.',
      'Alert Example'
    );
    this.showInfo('Alert closed');
  }

  async onActionShowConfirm() {
    const confirmed = await Dialog.confirm(
      'Are you sure you want to proceed? This action cannot be undone.',
      'Confirm Action'
    );

    if (confirmed) {
      this.showSuccess('Action confirmed!');
    } else {
      this.showWarning('Action cancelled');
    }
  }

  async onActionShowPrompt() {
    const name = await Dialog.prompt(
      'Please enter your name:',
      'User Input',
      {
        placeholder: 'John Doe',
        defaultValue: ''
      }
    );

    if (name) {
      this.showSuccess(`Hello, ${name}!`);
    } else {
      this.showInfo('No name provided');
    }
  }

  async onActionShowForm() {
    try {
      const formData = await Dialog.showForm({
        title: 'User Registration',
        size: 'lg',
        formConfig: {
          fields: [
            {
              name: 'username',
              label: 'Username',
              type: 'text',
              required: true,
              placeholder: 'Enter username'
            },
            {
              name: 'email',
              label: 'Email Address',
              type: 'email',
              required: true,
              placeholder: 'user@example.com'
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              required: true,
              placeholder: 'Enter password'
            },
            {
              name: 'role',
              label: 'User Role',
              type: 'select',
              options: [
                { value: 'user', label: 'Regular User' },
                { value: 'admin', label: 'Administrator' },
                { value: 'moderator', label: 'Moderator' }
              ]
            },
            {
              name: 'newsletter',
              label: 'Subscribe to newsletter',
              type: 'checkbox',
              value: true
            }
          ]
        },
        validateBeforeSubmit: true
      });
      
      await Dialog.alert({
        message: `Form submitted successfully! Data: ${JSON.stringify(formData, null, 2)}`,
        title: 'Success',
        type: 'success'
      });
    } catch (error) {
      console.log('Form cancelled or dismissed');
    }
  }

  async onActionShowPromiseDialog() {
    try {
      const result = await Dialog.showDialog({
        title: 'Save Changes?',
        body: '<p>You have unsaved changes. What would you like to do?</p>',
        size: 'md',
        buttons: [
          { text: 'Cancel', class: 'btn-secondary', value: 'cancel' },
          { text: 'Discard Changes', class: 'btn-warning', value: 'discard' },
          { text: 'Save', class: 'btn-primary', value: 'save' }
        ]
      });
      
      let message = '';
      switch(result) {
        case 'save':
          message = 'Changes saved successfully!';
          break;
        case 'discard':
          message = 'Changes discarded.';
          break;
        case 'cancel':
          message = 'Action cancelled.';
          break;
      }
      
      await Dialog.alert({
        message: message,
        title: 'Result',
        type: result === 'save' ? 'success' : 'info'
      });
    } catch (error) {
      console.log('Dialog dismissed');
    }
  }

  async onActionShowCodeExample() {
    const exampleCode = `// Example Dialog Creation
const dialog = new Dialog({
  title: 'My Dialog',
  size: 'lg',
  centered: true,
  body: '<p>Dialog content here</p>',
  buttons: [
    { text: 'Save', class: 'btn-primary', action: 'save' },
    { text: 'Cancel', class: 'btn-secondary', dismiss: true }
  ]
});

// Handle save action
dialog.on('action:save', () => {
  console.log('Save clicked');
  dialog.hide();
});

// Show the dialog
await dialog.render();
document.body.appendChild(dialog.element);
await dialog.mount();
dialog.show();`;

    await Dialog.showCode({
      title: 'Dialog Example Code',
      code: exampleCode,
      language: 'javascript'
    });
  }

  // Advanced examples
  async onActionShowWizard() {
    let currentStep = 1;
    const totalSteps = 3;

    const dialog = new Dialog({
      title: 'Multi-Step Wizard',
      size: 'lg',
      backdrop: 'static',
      body: this.getWizardStep(1),
      buttons: [
        { text: 'Previous', class: 'btn-secondary', action: 'prev', id: 'prev-btn', disabled: true },
        { text: 'Next', class: 'btn-primary', action: 'next', id: 'next-btn' },
        { text: 'Cancel', class: 'btn-outline-secondary', dismiss: true }
      ]
    });

    dialog.on('action:next', () => {
      if (currentStep < totalSteps) {
        currentStep++;
        dialog.setContent(this.getWizardStep(currentStep));
        dialog.setTitle(`Multi-Step Wizard (Step ${currentStep}/${totalSteps})`);

        // Update buttons
        const prevBtn = dialog.element.querySelector('#prev-btn');
        const nextBtn = dialog.element.querySelector('#next-btn');
        prevBtn.disabled = currentStep === 1;
        nextBtn.textContent = currentStep === totalSteps ? 'Finish' : 'Next';
      } else {
        this.showSuccess('Wizard completed!');
        dialog.hide();
      }
    });

    dialog.on('action:prev', () => {
      if (currentStep > 1) {
        currentStep--;
        dialog.setContent(this.getWizardStep(currentStep));
        dialog.setTitle(`Multi-Step Wizard (Step ${currentStep}/${totalSteps})`);

        // Update buttons
        const prevBtn = dialog.element.querySelector('#prev-btn');
        const nextBtn = dialog.element.querySelector('#next-btn');
        prevBtn.disabled = currentStep === 1;
        nextBtn.textContent = 'Next';
      }
    });

    await this.showDialog(dialog);
  }

  async onActionShowLoading() {
    const dialog = new Dialog({
      title: 'Loading Example',
      body: '<p>Click the button to simulate loading...</p>',
      buttons: [
        { text: 'Load Data', class: 'btn-primary', action: 'load' },
        { text: 'Close', class: 'btn-secondary', dismiss: true }
      ]
    });

    dialog.on('action:load', async () => {
      dialog.setLoading(true, 'Fetching data...');

      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 2000));

      dialog.setContent('<p class="text-success">Data loaded successfully!</p>');
    });

    await this.showDialog(dialog);
  }

  async onActionShowNested() {
    const dialog = new Dialog({
      title: 'Dialog with Actions',
      size: 'lg',
      body: `
        <p>This dialog demonstrates various action handlers.</p>
        <div class="d-grid gap-2">
          <button class="btn btn-info" data-action="info">Show Info</button>
          <button class="btn btn-warning" data-action="warning">Show Warning</button>
          <button class="btn btn-danger" data-action="error">Show Error</button>
        </div>
      `,
      buttons: [
        { text: 'Close', class: 'btn-secondary', dismiss: true }
      ]
    });

    dialog.on('action:info', () => {
      dialog.setContent(dialog.body + '<div class="alert alert-info mt-3">Info message!</div>');
    });

    dialog.on('action:warning', () => {
      dialog.setContent(dialog.body + '<div class="alert alert-warning mt-3">Warning message!</div>');
    });

    dialog.on('action:error', () => {
      dialog.setContent(dialog.body + '<div class="alert alert-danger mt-3">Error message!</div>');
    });

    await this.showDialog(dialog);
  }

  // Source code viewing
  async onActionShowSizesSource() {
    const code = `// Small Dialog
const dialog = new Dialog({
  title: 'Small Dialog',
  size: 'sm',
  body: '<p>Small dialog content</p>'
});

// Large Dialog
const dialog = new Dialog({
  title: 'Large Dialog',
  size: 'lg',
  body: '<p>Large dialog content</p>'
});

// Fullscreen Dialog
const dialog = new Dialog({
  title: 'Fullscreen Dialog',
  size: 'fullscreen',
  body: '<p>Fullscreen content</p>'
});`;

    await Dialog.showCode({
      title: 'Dialog Sizes Source',
      code: code,
      language: 'javascript'
    });
  }

  async onActionShowOptionsSource() {
    const code = `// Centered Dialog
const dialog = new Dialog({
  title: 'Centered',
  centered: true,
  body: '<p>Vertically centered</p>'
});

// Scrollable Dialog
const dialog = new Dialog({
  title: 'Scrollable',
  scrollable: true,
  body: '<p>Long content here...</p>'
});

// Static Backdrop
const dialog = new Dialog({
  title: 'Static',
  backdrop: 'static',
  keyboard: false,
  body: '<p>Cannot close by clicking outside</p>'
});`;

    await Dialog.showCode({
      title: 'Dialog Options Source',
      code: code,
      language: 'javascript'
    });
  }

  // Helper methods
  getWizardStep(step) {
    const steps = {
      1: `
        <h5>Step 1: Basic Information</h5>
        <div class="mb-3">
          <label class="form-label">Name</label>
          <input type="text" class="form-control" placeholder="Enter your name">
        </div>
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" placeholder="Enter your email">
        </div>
      `,
      2: `
        <h5>Step 2: Preferences</h5>
        <div class="mb-3">
          <label class="form-label">Theme</label>
          <select class="form-select">
            <option>Light</option>
            <option>Dark</option>
            <option>Auto</option>
          </select>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="notifications">
          <label class="form-check-label" for="notifications">
            Enable notifications
          </label>
        </div>
      `,
      3: `
        <h5>Step 3: Review</h5>
        <div class="alert alert-success">
          <i class="bi bi-check-circle me-2"></i>
          Everything looks good! Click Finish to complete the wizard.
        </div>
        <ul>
          <li>Name: John Doe</li>
          <li>Email: john@example.com</li>
          <li>Theme: Light</li>
          <li>Notifications: Enabled</li>
        </ul>
      `
    };

    return steps[step] || '';
  }

  async showDialog(dialog) {
    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();
    dialog.show();

    // Clean up when hidden
    dialog.on('hidden', () => {
      dialog.destroy();
      dialog.element.remove();
    });
  }
}

export default DialogsPage;
