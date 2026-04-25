import { Page, FormView } from 'web-mojo';

/**
 * ComboInputPage - Demonstrates combo/autocomplete field
 * 
 * Shows the combo input field for type-ahead autocomplete functionality
 */
class ComboInputPage extends Page {
  static pageName = 'forms/combo-input';
  
  constructor(options = {}) {
    super({
      title: 'ComboInput',
      icon: 'bi-search',
      pageDescription: 'Autocomplete and type-ahead search input',
      ...options
    });
  }
  
  async onActionSubmitComboForm(event, element) {
    event.preventDefault();
    
    const isValid = await this.comboForm.validate();
    if (isValid) {
      const data = await this.comboForm.getFormData();
      console.log('Combo form submitted:', data);
      
      const output = document.getElementById('combo-output');
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
    
    // Create form with combo/autocomplete fields
    this.comboForm = new FormView({
      fields: [
        {
          type: 'combo',
          name: 'city',
          label: 'City',
          required: true,
          placeholder: 'Start typing a city name...',
          options: [
            { value: 'nyc', label: 'New York City' },
            { value: 'la', label: 'Los Angeles' },
            { value: 'chicago', label: 'Chicago' },
            { value: 'houston', label: 'Houston' },
            { value: 'phoenix', label: 'Phoenix' },
            { value: 'philadelphia', label: 'Philadelphia' },
            { value: 'san_antonio', label: 'San Antonio' },
            { value: 'san_diego', label: 'San Diego' },
            { value: 'dallas', label: 'Dallas' },
            { value: 'san_jose', label: 'San Jose' },
            { value: 'austin', label: 'Austin' },
            { value: 'jacksonville', label: 'Jacksonville' },
            { value: 'fort_worth', label: 'Fort Worth' },
            { value: 'columbus', label: 'Columbus' },
            { value: 'charlotte', label: 'Charlotte' },
            { value: 'san_francisco', label: 'San Francisco' },
            { value: 'indianapolis', label: 'Indianapolis' },
            { value: 'seattle', label: 'Seattle' },
            { value: 'denver', label: 'Denver' },
            { value: 'boston', label: 'Boston' }
          ],
          help: 'Type to filter and select a city'
        },
        {
          type: 'combobox',
          name: 'product',
          label: 'Product',
          placeholder: 'Search for a product...',
          options: [
            { value: 'laptop', label: 'Laptop Computer' },
            { value: 'desktop', label: 'Desktop Computer' },
            { value: 'tablet', label: 'Tablet' },
            { value: 'smartphone', label: 'Smartphone' },
            { value: 'monitor', label: 'Monitor' },
            { value: 'keyboard', label: 'Keyboard' },
            { value: 'mouse', label: 'Mouse' },
            { value: 'headphones', label: 'Headphones' },
            { value: 'webcam', label: 'Webcam' },
            { value: 'speakers', label: 'Speakers' }
          ]
        },
        {
          type: 'autocomplete',
          name: 'language',
          label: 'Programming Language',
          placeholder: 'Type to search...',
          options: [
            { value: 'javascript', label: 'JavaScript' },
            { value: 'typescript', label: 'TypeScript' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
            { value: 'csharp', label: 'C#' },
            { value: 'php', label: 'PHP' },
            { value: 'ruby', label: 'Ruby' },
            { value: 'go', label: 'Go' },
            { value: 'rust', label: 'Rust' },
            { value: 'swift', label: 'Swift' },
            { value: 'kotlin', label: 'Kotlin' }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Submit',
          action: 'submit-combo-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.comboForm, { containerId: 'combo-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="combo-input-page">
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-search me-2 text-primary"></i>
            ComboInput (Autocomplete)
          </h1>
          <p class="text-muted">
            Type-ahead autocomplete with search filtering and suggestions
          </p>
        </div>
        
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>About ComboInput</h6>
          <p class="mb-0">The <code>combo</code>, <code>combobox</code>, and <code>autocomplete</code> field types (all aliases) provide type-ahead functionality that filters options as you type, perfect for large option lists or search-as-you-type experiences.</p>
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
                <div id="combo-form-container"></div>
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
                <div id="combo-output" class="text-muted">
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
      type: 'combo',  // or 'combobox' or 'autocomplete'
      name: 'city',
      label: 'City',
      required: true,
      placeholder: 'Start typing...',
      options: [
        { value: 'nyc', label: 'New York City' },
        { value: 'la', label: 'Los Angeles' },
        { value: 'chicago', label: 'Chicago' }
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
              <li>Real-time filtering as you type</li>
              <li>Dropdown suggestions based on input</li>
              <li>Keyboard navigation (arrow keys, Enter, Escape)</li>
              <li>Works with large option lists</li>
              <li>Can allow custom values or restrict to options</li>
              <li>Better UX than standard select for many options</li>
            </ul>
            
            <h6 class="mt-3">Field Type Aliases</h6>
            <p>All of these type values work identically:</p>
            <ul>
              <li><code>type: 'combo'</code></li>
              <li><code>type: 'combobox'</code></li>
              <li><code>type: 'autocomplete'</code></li>
            </ul>
            
            <h6 class="mt-3">When to Use</h6>
            <ul>
              <li>Large lists (50+ options) where scrolling is tedious</li>
              <li>City/location selection</li>
              <li>Product search and selection</li>
              <li>User/contact search</li>
              <li>Tag or category selection with many options</li>
              <li>Any search-as-you-type scenario</li>
            </ul>
            
            <h6 class="mt-3">vs. MultiSelect</h6>
            <p><strong>ComboInput:</strong> Single selection with type-ahead search</p>
            <p><strong>MultiSelect:</strong> Multiple selections with checkboxes and tags</p>
          </div>
        </div>
      </div>
    `;
  }
}

export default ComboInputPage;
