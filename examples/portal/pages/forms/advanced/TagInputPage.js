import { Page, FormView } from 'web-mojo';

/**
 * TagInputPage - Demonstrates tag/chip input field
 *
 * Shows the tag field type for entering multiple values as tags
 */
class TagInputPage extends Page {
  static pageName = 'forms/tag-input';

  constructor(options = {}) {
    super({
      title: 'Tag Input',
      icon: 'bi-tags',
      pageDescription: 'Tag/chip input for multiple values',
      ...options
    });
  }

  async onActionSubmitTagForm(event, element) {
    event.preventDefault();

    const isValid = await this.tagForm.validate();
    if (isValid) {
      const data = await this.tagForm.getFormData();
      console.log('Tag form submitted:', data);

      const output = document.getElementById('tag-output');
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

    // Create form with tag inputs
    this.tagForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Tag Input Examples',
          level: 5
        },
        {
          type: 'tag',
          name: 'skills',
          label: 'Skills',
          placeholder: 'Type and press Enter to add tags',
          help: 'Enter skills one at a time, press Enter after each',
          value: 'JavaScript,Python,React'
        },
        {
          type: 'tags',
          name: 'interests',
          label: 'Interests',
          placeholder: 'Add your interests',
          help: 'Type an interest and press Enter',
          value: 'Web Development,Design,Gaming'
        },
        {
          type: 'tag',
          name: 'keywords',
          label: 'Keywords',
          required: true,
          placeholder: 'Add keywords',
          help: 'At least one keyword is required',
          value: 'mojo,framework'
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Submit',
          action: 'submit-tag-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });

    this.addChild(this.tagForm, { containerId: 'tag-form-container' });
  }

  getTemplate() {
    return `
      <div class="tag-input-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-tags me-2 text-primary"></i>
            Tag Input
          </h1>
          <p class="text-muted">
            Enter multiple values as tags/chips with easy add/remove
          </p>
        </div>

        <!-- Quick Reference -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-info-circle me-2"></i>
              Tag Input Overview
            </h3>
          </div>
          <div class="card-body">
            <p>The <code>tag</code> or <code>tags</code> field type allows users to enter multiple values as visual tags/chips.</p>

            <h6 class="mt-3">Key Features</h6>
            <ul>
              <li>Add tags by typing and pressing Enter</li>
              <li>Remove tags by clicking the X button</li>
              <li>Visual chips/badges for each tag</li>
              <li>Returns array of string values</li>
              <li>Supports pre-filled values</li>
              <li>Can be marked as required</li>
            </ul>

            <h6 class="mt-3">Common Use Cases</h6>
            <ul>
              <li>Skills and expertise</li>
              <li>Keywords and labels</li>
              <li>Interests and hobbies</li>
              <li>Categories and classifications</li>
              <li>Email recipients (To/CC)</li>
            </ul>
          </div>
        </div>

        <!-- Interactive Demo -->
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
                <p class="text-muted mb-3">
                  Type values and press Enter to add tags. Click the X to remove them.
                </p>
                <div id="tag-form-container"></div>
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
                <div id="tag-output" class="text-muted">
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
      type: 'tag',
      name: 'skills',
      label: 'Skills',
      placeholder: 'Add skills',
      value: 'JavaScript,Python',
      help: 'Press Enter to add'
    },
    {
      type: 'tags',
      name: 'keywords',
      label: 'Keywords',
      required: true,
      placeholder: 'Add keywords'
    }
  ]
});

// Get data (returns comma-separated string)
const data = await form.getFormData();
// { skills: 'JavaScript,Python,React',
//   keywords: 'web,framework' }</code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Field Options -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-sliders me-2"></i>
              Field Options
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
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>type</code></td>
                    <td>String</td>
                    <td><code>'tag'</code> or <code>'tags'</code></td>
                  </tr>
                  <tr>
                    <td><code>name</code></td>
                    <td>String</td>
                    <td>Field name for form data</td>
                  </tr>
                  <tr>
                    <td><code>label</code></td>
                    <td>String</td>
                    <td>Display label</td>
                  </tr>
                  <tr>
                    <td><code>placeholder</code></td>
                    <td>String</td>
                    <td>Input placeholder text</td>
                  </tr>
                  <tr>
                    <td><code>value</code></td>
                    <td>String</td>
                    <td>Initial tag values (comma-separated string)</td>
                  </tr>
                  <tr>
                    <td><code>required</code></td>
                    <td>Boolean</td>
                    <td>Whether at least one tag is required</td>
                  </tr>
                  <tr>
                    <td><code>help</code></td>
                    <td>String</td>
                    <td>Help text below field</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Best Practices -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-stars me-2"></i>
              Best Practices
            </h3>
          </div>
          <div class="card-body">
            <h6>User Experience</h6>
            <ul>
              <li>Provide clear placeholder text explaining how to add tags</li>
              <li>Include help text: "Press Enter to add"</li>
              <li>Pre-fill with common/suggested values when appropriate</li>
              <li>Make it obvious how to remove tags (X button)</li>
            </ul>

            <h6 class="mt-3">Validation</h6>
            <ul>
              <li>Use <code>required: true</code> to ensure at least one tag</li>
              <li>Consider validating individual tag format if needed</li>
              <li>Don't allow empty/whitespace-only tags</li>
            </ul>

            <h6 class="mt-3">Data Handling</h6>
            <ul>
              <li>Tag fields return comma-separated strings</li>
              <li>Use <code>value.split(',')</code> to convert to array if needed</li>
              <li>Set initial values as comma-separated strings: <code>'tag1,tag2,tag3'</code></li>
              <li>Handle empty strings when no tags entered</li>
              <li>Whitespace is automatically trimmed from tag values</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

export default TagInputPage;
