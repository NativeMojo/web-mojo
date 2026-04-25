import { Page, FormView } from 'web-mojo';

/**
 * SelectionFieldsPage - Demonstrates all selection field types
 * 
 * Shows select, checkbox, radio, toggle/switch, multiselect, buttongroup, checklistdropdown
 */
class SelectionFieldsPage extends Page {
  static pageName = 'forms/selection-fields';
  
  constructor(options = {}) {
    super({
      title: 'Selection Fields',
      icon: 'bi-check2-square',
      pageDescription: 'Explore all selection field types: select, checkbox, radio, toggle, and more',
      ...options
    });
  }
  
  async onActionSubmitSelectionForm(event, element) {
    const isValid = await this.selectionForm.validate();
    if (isValid) {
      const data = await this.selectionForm.getFormData();
      console.log('Selection form submitted:', data);
      
      // Show the submitted data
      const output = document.getElementById('selection-output');
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Form Submitted Successfully!
          </h5>
          <hr>
          <pre class="mb-0"><code>${JSON.stringify(data, null, 2)}</code></pre>
        </div>
      `;
      
      this.getApp().toast.success('Form submitted successfully!');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // Create form with all selection field types
    this.selectionForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Single Selection',
          level: 5
        },
        {
          name: 'country',
          label: 'Country (Select)',
          type: 'select',
          required: true,
          help: 'Standard dropdown selection',
          options: [
            { value: '', label: '-- Select Country --' },
            { value: 'us', label: 'United States' },
            { value: 'ca', label: 'Canada' },
            { value: 'mx', label: 'Mexico' },
            { value: 'uk', label: 'United Kingdom' },
            { value: 'de', label: 'Germany' },
            { value: 'fr', label: 'France' },
            { value: 'jp', label: 'Japan' }
          ]
        },
        {
          name: 'size',
          label: 'Size (Radio)',
          type: 'radio',
          required: true,
          help: 'Radio buttons for single selection',
          options: [
            { value: 'xs', label: 'Extra Small' },
            { value: 's', label: 'Small' },
            { value: 'm', label: 'Medium' },
            { value: 'l', label: 'Large' },
            { value: 'xl', label: 'Extra Large' }
          ]
        },
        {
          name: 'priority',
          label: 'Priority (Button Group)',
          type: 'buttongroup',
          required: true,
          help: 'Button-style selection',
          options: [
            { value: 'low', label: 'Low', icon: 'bi-arrow-down' },
            { value: 'medium', label: 'Medium', icon: 'bi-dash' },
            { value: 'high', label: 'High', icon: 'bi-arrow-up' },
            { value: 'urgent', label: 'Urgent', icon: 'bi-exclamation-triangle' }
          ],
          variant: 'outline-primary'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Multiple Selection',
          level: 5
        },
        {
          name: 'interests',
          label: 'Interests (Checkbox)',
          type: 'checkbox',
          help: 'Select multiple options with checkboxes',
          options: [
            { value: 'sports', label: 'Sports' },
            { value: 'music', label: 'Music' },
            { value: 'reading', label: 'Reading' },
            { value: 'travel', label: 'Travel' },
            { value: 'technology', label: 'Technology' },
            { value: 'cooking', label: 'Cooking' }
          ]
        },
        {
          name: 'skills',
          label: 'Skills (Multi-Select)',
          type: 'multiselect',
          help: 'Multi-select dropdown (if available)',
          placeholder: 'Select skills...',
          options: [
            { value: 'js', label: 'JavaScript' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'csharp', label: 'C#' },
            { value: 'php', label: 'PHP' },
            { value: 'ruby', label: 'Ruby' }
          ]
        },
        {
          name: 'languages',
          label: 'Languages (Checklist Dropdown)',
          type: 'checklistdropdown',
          help: 'Compact multi-select dropdown',
          buttonText: 'Select Languages',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'zh', label: 'Chinese' },
            { value: 'ja', label: 'Japanese' }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Boolean/Toggle',
          level: 5
        },
        {
          name: 'newsletter',
          label: 'Subscribe to Newsletter',
          type: 'checkbox',
          help: 'Single checkbox for boolean value',
          checked: true
        },
        {
          name: 'notifications',
          label: 'Enable Notifications',
          type: 'toggle',
          help: 'Toggle switch for on/off setting',
          checked: false,
          size: 'default'
        },
        {
          name: 'dark_mode',
          label: 'Dark Mode',
          type: 'switch',
          help: 'Switch alias for toggle',
          checked: false
        },
        {
          type: 'button',
          label: 'Submit Selection Form',
          action: 'submit-selection-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check-circle'
        }
      ]
    });
    
    this.addChild(this.selectionForm, { containerId: 'selection-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="selection-fields-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-check2-square me-2 text-primary"></i>
            Selection Fields
          </h1>
          <p class="text-muted">
            Explore all selection field types: select, checkbox, radio, toggle, and more
          </p>
        </div>
        
        <!-- Quick Reference -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-table me-2"></i>
              Selection Types Quick Reference
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Use Case</th>
                    <th>Single/Multiple</th>
                    <th>Visual Style</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>select</code></td>
                    <td>Standard dropdown</td>
                    <td>Single (or multiple)</td>
                    <td>Native browser dropdown</td>
                  </tr>
                  <tr>
                    <td><code>radio</code></td>
                    <td>Few options, single choice</td>
                    <td>Single</td>
                    <td>Radio buttons (inline or stacked)</td>
                  </tr>
                  <tr>
                    <td><code>buttongroup</code></td>
                    <td>Icon-based selection</td>
                    <td>Single</td>
                    <td>Button group with icons</td>
                  </tr>
                  <tr>
                    <td><code>checkbox</code></td>
                    <td>Multiple selections or boolean</td>
                    <td>Multiple or single</td>
                    <td>Checkboxes (inline or stacked)</td>
                  </tr>
                  <tr>
                    <td><code>multiselect</code></td>
                    <td>Many options, multiple choice</td>
                    <td>Multiple</td>
                    <td>Enhanced dropdown</td>
                  </tr>
                  <tr>
                    <td><code>checklistdropdown</code></td>
                    <td>Compact multi-select</td>
                    <td>Multiple</td>
                    <td>Bootstrap dropdown with checkboxes</td>
                  </tr>
                  <tr>
                    <td><code>toggle</code> / <code>switch</code></td>
                    <td>On/off settings</td>
                    <td>Single boolean</td>
                    <td>Toggle switch</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Interactive Demo -->
        <div class="row">
          <div class="col-lg-6">
            <div class="card mb-4">
              <div class="card-header">
                <h3 class="h5 mb-0">
                  <i class="bi bi-ui-checks me-2"></i>
                  Try All Selection Types
                </h3>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  Interact with each selection type to see their behavior and styling.
                </p>
                <div id="selection-form-container"></div>
              </div>
            </div>
          </div>
          
          <div class="col-lg-6">
            <div class="card mb-4">
              <div class="card-header">
                <h3 class="h5 mb-0">
                  <i class="bi bi-terminal me-2"></i>
                  Submitted Data
                </h3>
              </div>
              <div class="card-body">
                <div id="selection-output" class="text-muted">
                  <em>Submit the form to see the data output here...</em>
                </div>
              </div>
            </div>
            
            <!-- Code Example -->
            <div class="card bg-dark text-light">
              <div class="card-header bg-dark border-secondary">
                <h5 class="h6 mb-0">
                  <i class="bi bi-code-slash me-2"></i>
                  Example Code
                </h5>
              </div>
              <div class="card-body bg-dark">
                <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">const form = new FormView({
  fields: [
    {
      name: 'country',
      label: 'Country',
      type: 'select',
      options: [
        { value: 'us', label: 'United States' },
        { value: 'ca', label: 'Canada' }
      ]
    },
    {
      name: 'size',
      label: 'Size',
      type: 'radio',
      options: [
        { value: 's', label: 'Small' },
        { value: 'm', label: 'Medium' },
        { value: 'l', label: 'Large' }
      ]
    },
    {
      name: 'interests',
      label: 'Interests',
      type: 'checkbox',
      options: [
        { value: 'sports', label: 'Sports' },
        { value: 'music', label: 'Music' }
      ]
    },
    {
      name: 'notifications',
      label: 'Enable Notifications',
      type: 'toggle',
      checked: false
    }
  ]
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Selection Tips -->
        <div class="row">
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  When to Use Select
                </h4>
                <ul class="small mb-0">
                  <li>5+ options in a list</li>
                  <li>Space-saving dropdown needed</li>
                  <li>Familiar, standard UI pattern</li>
                  <li>Mobile-friendly (native picker)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  When to Use Radio
                </h4>
                <ul class="small mb-0">
                  <li>2-5 options only</li>
                  <li>All options should be visible</li>
                  <li>Single selection required</li>
                  <li>Options are mutually exclusive</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  When to Use Checkbox
                </h4>
                <ul class="small mb-0">
                  <li>Multiple selections allowed</li>
                  <li>2-5 options that fit on screen</li>
                  <li>All options should be visible</li>
                  <li>Or single boolean (agree/enable)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  When to Use Toggle
                </h4>
                <ul class="small mb-0">
                  <li>On/off settings</li>
                  <li>Enable/disable features</li>
                  <li>Immediate visual feedback</li>
                  <li>Settings pages and preferences</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Common Options -->
        <div class="card">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-gear me-2"></i>
              Common Options for Selection Fields
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>options</code></td>
                    <td>array</td>
                    <td>List of selectable options</td>
                    <td><code>[{value: 'a', label: 'Option A'}]</code></td>
                  </tr>
                  <tr>
                    <td><code>value</code></td>
                    <td>any</td>
                    <td>Initial selected value</td>
                    <td><code>value: 'us'</code></td>
                  </tr>
                  <tr>
                    <td><code>checked</code></td>
                    <td>boolean</td>
                    <td>Initial checked state (toggle/checkbox)</td>
                    <td><code>checked: true</code></td>
                  </tr>
                  <tr>
                    <td><code>multiple</code></td>
                    <td>boolean</td>
                    <td>Allow multiple selections (select)</td>
                    <td><code>multiple: true</code></td>
                  </tr>
                  <tr>
                    <td><code>inline</code></td>
                    <td>boolean</td>
                    <td>Display options inline (radio/checkbox)</td>
                    <td><code>inline: true</code></td>
                  </tr>
                  <tr>
                    <td><code>variant</code></td>
                    <td>string</td>
                    <td>Button style (buttongroup)</td>
                    <td><code>variant: 'outline-primary'</code></td>
                  </tr>
                  <tr>
                    <td><code>size</code></td>
                    <td>string</td>
                    <td>Toggle size (toggle/switch)</td>
                    <td><code>size: 'sm' | 'default' | 'lg'</code></td>
                  </tr>
                  <tr>
                    <td><code>required</code></td>
                    <td>boolean</td>
                    <td>Makes field required</td>
                    <td><code>required: true</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default SelectionFieldsPage;
