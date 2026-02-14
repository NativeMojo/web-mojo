import { Page, FormView } from 'web-mojo';

/**
 * MultiSelectPage - Demonstrates multiselect field
 * 
 * Shows the multiselect field for selecting multiple options with search
 */
class MultiSelectPage extends Page {
  static pageName = 'forms/multiselect';
  
  constructor(options = {}) {
    super({
      title: 'MultiSelect',
      icon: 'bi-ui-checks',
      pageDescription: 'Select multiple options with search and filtering',
      ...options
    });
  }
  
  async onActionSubmitMultiSelectForm(event, element) {
    event.preventDefault();
    
    const isValid = await this.multiSelectForm.validate();
    if (isValid) {
      const data = await this.multiSelectForm.getFormData();
      console.log('MultiSelect form submitted:', data);
      
      const output = document.getElementById('multiselect-output');
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Form Submitted!
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
    
    // Create form with multiselect fields
    this.multiSelectForm = new FormView({
      fields: [
        {
          type: 'multiselect',
          name: 'skills',
          label: 'Skills',
          required: true,
          placeholder: 'Select your skills',
          options: [
            { value: 'javascript', label: 'JavaScript' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'csharp', label: 'C#' },
            { value: 'php', label: 'PHP' },
            { value: 'ruby', label: 'Ruby' },
            { value: 'go', label: 'Go' },
            { value: 'rust', label: 'Rust' },
            { value: 'swift', label: 'Swift' },
            { value: 'kotlin', label: 'Kotlin' }
          ],
          help: 'Select all programming languages you know'
        },
        {
          type: 'multiselect',
          name: 'countries',
          label: 'Countries Visited',
          placeholder: 'Select countries',
          options: [
            { value: 'us', label: 'United States' },
            { value: 'uk', label: 'United Kingdom' },
            { value: 'ca', label: 'Canada' },
            { value: 'fr', label: 'France' },
            { value: 'de', label: 'Germany' },
            { value: 'it', label: 'Italy' },
            { value: 'es', label: 'Spain' },
            { value: 'jp', label: 'Japan' },
            { value: 'cn', label: 'China' },
            { value: 'au', label: 'Australia' },
            { value: 'br', label: 'Brazil' },
            { value: 'in', label: 'India' }
          ]
        },
        {
          type: 'multiselect',
          name: 'interests',
          label: 'Interests',
          placeholder: 'Select your interests',
          options: [
            { value: 'sports', label: 'Sports' },
            { value: 'music', label: 'Music' },
            { value: 'movies', label: 'Movies' },
            { value: 'gaming', label: 'Gaming' },
            { value: 'reading', label: 'Reading' },
            { value: 'travel', label: 'Travel' },
            { value: 'cooking', label: 'Cooking' },
            { value: 'photography', label: 'Photography' }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Submit',
          action: 'submit-multi-select-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.multiSelectForm, { containerId: 'multiselect-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="multiselect-page">
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-ui-checks me-2 text-primary"></i>
            MultiSelect
          </h1>
          <p class="text-muted">
            Select multiple options from a dropdown with search and filtering
          </p>
        </div>
        
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>About MultiSelect</h6>
          <p class="mb-0">The <code>multiselect</code> field provides an enhanced dropdown for selecting multiple options with search capabilities, checkboxes, and a clean tag display for selected items.</p>
        </div>
        
        <div class="row">
          <div class="col-lg-6">
            <div class="card mb-4">
              <div class="card-header">
                <h3 class="h5 mb-0">
                  <i class="bi bi-pencil-square me-2"></i>
                  Try It Out
                </h3>
              </div>
              <div class="card-body">
                <div id="multiselect-form-container"></div>
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
                <div id="multiselect-output" class="text-muted">
                  <em>Submit the form to see the data output here...</em>
                </div>
              </div>
            </div>
            
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
      type: 'multiselect',
      name: 'skills',
      label: 'Skills',
      required: true,
      placeholder: 'Select your skills',
      options: [
        { value: 'javascript', label: 'JavaScript' },
        { value: 'python', label: 'Python' },
        { value: 'java', label: 'Java' }
      ]
    }
  ]
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-info-circle me-2"></i>
              Key Features
            </h3>
          </div>
          <div class="card-body">
            <ul>
              <li>Select multiple options from dropdown</li>
              <li>Search/filter options in real-time</li>
              <li>Checkboxes for clear selection state</li>
              <li>Selected items displayed as tags</li>
              <li>Remove selections with tag close buttons</li>
              <li>Keyboard navigation support</li>
              <li>Better UX than native multi-select</li>
            </ul>
            
            <h6 class="mt-3">When to Use</h6>
            <ul>
              <li>Selecting multiple skills, categories, or tags</li>
              <li>Assigning multiple users or roles</li>
              <li>Choosing multiple countries, regions, or locations</li>
              <li>Filter forms with multiple criteria</li>
              <li>Any scenario requiring 3+ selections from many options</li>
            </ul>
            
            <h6 class="mt-3">Data Format</h6>
            <p>The field returns an array of selected values:</p>
            <pre class="bg-light p-2 rounded"><code>{
  "skills": ["javascript", "python", "java"]
}</code></pre>
          </div>
        </div>
      </div>
    `;
  }
}

export default MultiSelectPage;
