/**
 * DialogsPage - Comprehensive examples of the Dialog component
 */

import Page from '../../../src/core/Page.js';
import View from '../../../src/core/View.js';
import Dialog from '../../../src/components/Dialog.js';

class DialogsPage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      page_name: 'dialogs',
      title: 'Dialogs - MOJO Examples'
    });
  }
  
  async getTemplate() {
    return `
      <div class="example-page">
        <h1 class="mb-4">Dialog Component</h1>
        <p class="lead">Full Bootstrap 5 modal support with all features including sizes, fullscreen, scrollable content, and View instance support.</p>
        
        <!-- Sizes Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Dialog Sizes</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-sizes-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Dialogs support all Bootstrap modal sizes: small, default, large, extra large, and fullscreen.</p>
          
          <div class="example-demo">
            <button class="btn btn-primary me-2" data-action="show-small">
              Small (sm)
            </button>
            <button class="btn btn-primary me-2" data-action="show-default">
              Default
            </button>
            <button class="btn btn-primary me-2" data-action="show-large">
              Large (lg)
            </button>
            <button class="btn btn-primary me-2" data-action="show-xl">
              Extra Large (xl)
            </button>
            <button class="btn btn-primary" data-action="show-fullscreen">
              Fullscreen
            </button>
          </div>
        </div>
        
        <!-- Responsive Fullscreen Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Responsive Fullscreen</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-responsive-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Fullscreen modals that respond to viewport breakpoints.</p>
          
          <div class="example-demo">
            <button class="btn btn-info me-2" data-action="show-fullscreen-sm">
              Fullscreen below sm
            </button>
            <button class="btn btn-info me-2" data-action="show-fullscreen-md">
              Fullscreen below md
            </button>
            <button class="btn btn-info me-2" data-action="show-fullscreen-lg">
              Fullscreen below lg
            </button>
            <button class="btn btn-info" data-action="show-fullscreen-xl">
              Fullscreen below xl
            </button>
          </div>
        </div>
        
        <!-- Options Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Dialog Options</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-options-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Various configuration options for dialogs.</p>
          
          <div class="example-demo">
            <button class="btn btn-secondary me-2" data-action="show-centered">
              Centered Dialog
            </button>
            <button class="btn btn-secondary me-2" data-action="show-scrollable">
              Scrollable Dialog
            </button>
            <button class="btn btn-secondary me-2" data-action="show-static">
              Static Backdrop
            </button>
            <button class="btn btn-secondary" data-action="show-no-fade">
              No Fade Animation
            </button>
          </div>
        </div>
        
        <!-- View as Body Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>View Instance as Body</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-view-body-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Dialogs can accept View instances as body content for complex interactive content.</p>
          
          <div class="example-demo">
            <button class="btn btn-success me-2" data-action="show-view-dialog">
              Dialog with View Component
            </button>
            <button class="btn btn-success" data-action="show-form-view">
              Form as View Component
            </button>
          </div>
        </div>
        
        <!-- Utility Methods Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Utility Methods</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-utilities-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Static utility methods for common dialog patterns.</p>
          
          <div class="example-demo">
            <button class="btn btn-warning me-2" data-action="show-alert">
              Alert Dialog
            </button>
            <button class="btn btn-warning me-2" data-action="show-confirm">
              Confirm Dialog
            </button>
            <button class="btn btn-warning me-2" data-action="show-prompt">
              Prompt Dialog
            </button>
            <button class="btn btn-warning" data-action="show-code-example">
              Code Viewer Dialog
            </button>
          </div>
        </div>
        
        <!-- Advanced Examples Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Advanced Examples</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-advanced-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Complex dialog implementations and patterns.</p>
          
          <div class="example-demo">
            <button class="btn btn-dark me-2" data-action="show-wizard">
              Multi-Step Wizard
            </button>
            <button class="btn btn-dark me-2" data-action="show-loading">
              Loading State
            </button>
            <button class="btn btn-dark" data-action="show-nested">
              Dialog Actions
            </button>
          </div>
        </div>
      </div>
    `;
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