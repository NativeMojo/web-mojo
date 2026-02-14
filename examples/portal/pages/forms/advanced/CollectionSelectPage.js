import { Page, FormView } from 'web-mojo';

/**
 * CollectionSelectPage - Demonstrates collection field
 * 
 * Shows the collection field for loading options from a backend Collection
 */
class CollectionSelectPage extends Page {
  static pageName = 'forms/collection-select';
  
  constructor(options = {}) {
    super({
      title: 'CollectionSelect',
      icon: 'bi-database',
      pageDescription: 'Dynamic options loaded from backend Collections',
      ...options
    });
  }
  
  async onActionSubmitCollectionForm(event, element) {
    event.preventDefault();
    
    const isValid = await this.collectionForm.validate();
    if (isValid) {
      const data = await this.collectionForm.getFormData();
      console.log('Collection form submitted:', data);
      
      const output = document.getElementById('collection-output');
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
    
    // Create demo form (Note: requires backend Collection setup)
    this.collectionForm = new FormView({
      fields: [
        {
          type: 'html',
          html: `
            <div class="alert alert-warning">
              <h6 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Backend Required</h6>
              <p class="mb-0">The collection field type requires a backend MOJO Collection with REST API. The examples below show the configuration syntax.</p>
            </div>
          `
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Submit',
          action: 'submit-collection-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.collectionForm, { containerId: 'collection-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="collection-select-page">
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-database me-2 text-primary"></i>
            CollectionSelect
          </h1>
          <p class="text-muted">
            Load select options dynamically from backend MOJO Collections
          </p>
        </div>
        
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>About CollectionSelect</h6>
          <p class="mb-0">The <code>collection</code> field type integrates directly with MOJO Collections to dynamically load options from your backend API. Perfect for user lists, categories, or any data managed in your database.</p>
        </div>
        
        <div class="row">
          <div class="col-lg-6">
            <div class="card mb-4">
              <div class="card-header">
                <h3 class="h5 mb-0">
                  <i class="bi bi-pencil-square me-2"></i>
                  Demo Form
                </h3>
              </div>
              <div class="card-body">
                <div id="collection-form-container"></div>
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
                <div id="collection-output" class="text-muted">
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
                <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">import { UserCollection } from './collections/UserCollection.js';

const userCollection = new UserCollection();

const form = new FormView({
  fields: [
    {
      type: 'collection',
      name: 'assigned_user',
      label: 'Assign To User',
      required: true,
      collection: userCollection,
      valueField: 'id',
      labelField: 'name'
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
              <i class="bi bi-gear me-2"></i>
              Configuration
            </h3>
          </div>
          <div class="card-body">
            <h6>Required Properties</h6>
            <ul>
              <li><code>collection</code> - Instance of a MOJO Collection class</li>
              <li><code>valueField</code> - Model property to use as option value (e.g., 'id')</li>
              <li><code>labelField</code> - Model property to display as option label (e.g., 'name', 'title')</li>
            </ul>
            
            <h6 class="mt-3">Optional Properties</h6>
            <ul>
              <li><code>filters</code> - Object with filter criteria for the collection query</li>
              <li><code>orderBy</code> - Field to sort options by</li>
              <li><code>searchable</code> - Enable type-ahead search (default: true for 10+ items)</li>
            </ul>
          </div>
        </div>
        
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-code-square me-2"></i>
              Complete Example
            </h3>
          </div>
          <div class="card-body">
            <pre class="bg-light p-3 rounded"><code>// Define your Collection
class CategoryCollection extends Collection {
  static url = '/api/categories';
}

const categoryCollection = new CategoryCollection();

// Use in form
const form = new FormView({
  fields: [
    {
      type: 'collection',
      name: 'category_id',
      label: 'Category',
      required: true,
      collection: categoryCollection,
      valueField: 'id',
      labelField: 'name',
      filters: { status: 'active' },
      orderBy: 'name',
      help: 'Select a category for this item'
    }
  ]
});

// The field will:
// 1. Fetch data from /api/categories?status=active&order_by=name
// 2. Build options using id as value, name as label
// 3. Enable search if there are 10+ categories</code></pre>
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
              <li>Dynamically loads options from backend API</li>
              <li>Integrates seamlessly with MOJO Collections</li>
              <li>Supports filtering and ordering</li>
              <li>Automatic search for large option lists</li>
              <li>Options stay synchronized with backend data</li>
              <li>No need to manually maintain static option lists</li>
            </ul>
            
            <h6 class="mt-3">When to Use</h6>
            <ul>
              <li>User assignment fields (select from all users)</li>
              <li>Category/tag selection from database</li>
              <li>Parent/child relationships (select parent item)</li>
              <li>Any dropdown where options come from your database</li>
              <li>Dynamic options that change frequently</li>
            </ul>
            
            <h6 class="mt-3">Backend Requirements</h6>
            <p>Your Collection must:</p>
            <ul>
              <li>Extend MOJO's Collection class</li>
              <li>Have a valid REST API endpoint</li>
              <li>Return data in standard MOJO format</li>
              <li>Support query parameters if using filters/ordering</li>
            </ul>
          </div>
        </div>
        
        <div class="card mb-4 border-primary">
          <div class="card-header bg-primary text-white">
            <h3 class="h5 mb-0">
              <i class="bi bi-lightbulb me-2"></i>
              Pro Tips
            </h3>
          </div>
          <div class="card-body">
            <h6>Performance with Large Datasets</h6>
            <p>For collections with 100+ items, consider:</p>
            <ul>
              <li>Using pagination on the backend</li>
              <li>Implementing server-side search</li>
              <li>Adding filters to reduce option count</li>
              <li>Using ComboInput with AJAX search instead</li>
            </ul>
            
            <h6 class="mt-3">Preloading Collections</h6>
            <p>If you use the same collection in multiple forms, preload it once:</p>
            <pre class="bg-light p-2 rounded"><code>// Preload in app initialization
await categoryCollection.reset();

// Now all forms using this collection will be instant</code></pre>
          </div>
        </div>
      </div>
    `;
  }
}

export default CollectionSelectPage;
