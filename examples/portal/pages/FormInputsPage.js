/**
 * FormInputsPage - Comprehensive showcase of all FormBuilder input types
 * Demonstrates every field type available with examples and documentation
 */

import Page from '../../../src/core/Page.js';
import FormView from '../../../src/forms/FormView.js';
import { GroupList } from '/src/models/Group.js';

export default class FormInputsPage extends Page {
  static pageName = 'form-inputs';
  static title = 'Form Input Types';
  static icon = 'bi-ui-checks-grid';
  static route = '/form-inputs';

  constructor(options = {}) {
    super(options);
    this.forms = {};
  }

  async renderTemplate() {
    return `
      <div class="container-fluid py-4">
        <div class="row">
          <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 class="h2 mb-1">Form Input Types</h1>
                <p class="text-muted">Comprehensive showcase of all FormBuilder field types</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <ul class="nav nav-tabs mb-4" id="inputTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="text-tab" data-bs-toggle="tab" data-bs-target="#text-inputs"
                    type="button" role="tab">Text Inputs</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="selection-tab" data-bs-toggle="tab" data-bs-target="#selection-inputs"
                    type="button" role="tab">Selection Inputs</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="date-tab" data-bs-toggle="tab" data-bs-target="#date-inputs"
                    type="button" role="tab">Date & Time</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="file-tab" data-bs-toggle="tab" data-bs-target="#file-inputs"
                    type="button" role="tab">File & Media</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="special-tab" data-bs-toggle="tab" data-bs-target="#special-inputs"
                    type="button" role="tab">Special Inputs</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="layout-tab" data-bs-toggle="tab" data-bs-target="#layout-elements"
                    type="button" role="tab">Layout Elements</button>
          </li>
        </ul>

        <div class="tab-content" id="inputTabsContent">
          <!-- Text Inputs Tab -->
          <div class="tab-pane fade show active" id="text-inputs" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Text Input Types</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="text-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Documentation</h6>
                  </div>
                  <div class="card-body">
                    <h6>Text Input Types</h6>
                    <ul class="small">
                      <li><strong>text</strong> - Basic text input</li>
                      <li><strong>email</strong> - Email validation</li>
                      <li><strong>password</strong> - Hidden text input</li>
                      <li><strong>tel</strong> - Phone number input</li>
                      <li><strong>url</strong> - URL validation</li>
                      <li><strong>search</strong> - Search input with clear button</li>
                      <li><strong>textarea</strong> - Multi-line text</li>
                      <li><strong>number</strong> - Numeric input with min/max</li>
                      <li><strong>tag/tags</strong> - Tag input with autocomplete</li>
                    </ul>

                    <h6 class="mt-3">Common Properties</h6>
                    <ul class="small">
                      <li><code>placeholder</code> - Input placeholder text</li>
                      <li><code>required</code> - Required field validation</li>
                      <li><code>disabled</code> - Disable the input</li>
                      <li><code>readonly</code> - Read-only input</li>
                      <li><code>help</code> - Help text below input</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Selection Inputs Tab -->
          <div class="tab-pane fade" id="selection-inputs" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Selection Input Types</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="selection-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Documentation</h6>
                  </div>
                  <div class="card-body">
                    <h6>Selection Types</h6>
                    <ul class="small">
                      <li><strong>select</strong> - Dropdown selection</li>
                      <li><strong>checkbox</strong> - Single checkbox</li>
                      <li><strong>switch</strong> - Toggle switch</li>
                      <li><strong>radio</strong> - Radio button group</li>
                      <li><strong>collection</strong> - Searchable collection dropdown</li>
                    </ul>

                    <h6 class="mt-3">Select Options</h6>
                    <ul class="small">
                      <li><code>options</code> - Array of {value, text}</li>
                      <li><code>multiple</code> - Multiple selection</li>
                      <li><code>searchable</code> - Add search input</li>
                    </ul>

                    <h6 class="mt-3">Switch Sizes</h6>
                    <ul class="small">
                      <li><code>size: 'sm'</code> - Small switch</li>
                      <li><code>size: 'md'</code> - Default size</li>
                      <li><code>size: 'lg'</code> - Large switch</li>
                    </ul>

                    <h6 class="mt-3">Tag Input Options</h6>
                    <ul class="small">
                      <li><code>maxTags</code> - Maximum number of tags</li>
                      <li><code>separator</code> - Tag separator character</li>
                      <li><code>allowDuplicates</code> - Allow duplicate tags</li>
                    </ul>

                    <h6 class="mt-3">Collection Options</h6>
                    <ul class="small">
                      <li><code>Collection</code> - Collection class to use</li>
                      <li><code>labelField</code> - Field for display text</li>
                      <li><code>valueField</code> - Field for form value</li>
                      <li><code>maxItems</code> - Max dropdown items</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Date & Time Tab -->
          <div class="tab-pane fade" id="date-inputs" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Date & Time Input Types</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="date-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Documentation</h6>
                  </div>
                  <div class="card-body">
                    <h6>Date & Time Types</h6>
                    <ul class="small">
                      <li><strong>date</strong> - Native HTML5 date picker</li>
                      <li><strong>datetime</strong> - Date and time picker</li>
                      <li><strong>time</strong> - Time picker</li>
                      <li><strong>datepicker</strong> - Enhanced date picker with Easepick</li>
                      <li><strong>daterange</strong> - Date range picker with Easepick</li>
                    </ul>

                    <h6 class="mt-3">Date Properties</h6>
                    <ul class="small">
                      <li><code>min</code> - Minimum date</li>
                      <li><code>max</code> - Maximum date</li>
                      <li><code>value</code> - Default date (ISO format)</li>
                    </ul>

                    <h6 class="mt-3">Time Properties</h6>
                    <ul class="small">
                      <li><code>step</code> - Time step in seconds</li>
                      <li><code>value</code> - Default time (HH:MM format)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- File & Media Tab -->
          <div class="tab-pane fade" id="file-inputs" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">File & Media Input Types</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="file-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Documentation</h6>
                  </div>
                  <div class="card-body">
                    <h6>File & Media Types</h6>
                    <ul class="small">
                      <li><strong>file</strong> - File upload</li>
                      <li><strong>image</strong> - Image upload with preview</li>
                    </ul>

                    <h6 class="mt-3">File Properties</h6>
                    <ul class="small">
                      <li><code>accept</code> - File type restrictions</li>
                      <li><code>multiple</code> - Multiple file selection</li>
                    </ul>

                    <h6 class="mt-3">Image Properties</h6>
                    <ul class="small">
                      <li><code>size</code> - 'sm', 'md', 'lg', 'xl'</li>
                      <li><code>accept</code> - Image types (default: image/*)</li>
                      <li><code>placeholder</code> - Placeholder text</li>
                      <li><code>allowDrop</code> - Enable drag & drop</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Special Inputs Tab -->
          <div class="tab-pane fade" id="special-inputs" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Special Input Types</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="special-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Documentation</h6>
                  </div>
                  <div class="card-body">
                    <h6>Special Types</h6>
                    <ul class="small">
                      <li><strong>range</strong> - Slider input</li>
                      <li><strong>color</strong> - Color picker</li>
                      <li><strong>hidden</strong> - Hidden input</li>
                      <li><strong>button</strong> - Custom button</li>
                      <li><strong>tag/tags</strong> - Enhanced tag input</li>
                      <li><strong>datepicker</strong> - Enhanced date picker</li>
                      <li><strong>daterange</strong> - Date range picker</li>
                    </ul>

                    <h6 class="mt-3">Range Properties</h6>
                    <ul class="small">
                      <li><code>min</code> - Minimum value</li>
                      <li><code>max</code> - Maximum value</li>
                      <li><code>step</code> - Step increment</li>
                      <li><code>value</code> - Default value</li>
                    </ul>

                    <h6 class="mt-3">Button Properties</h6>
                    <ul class="small">
                      <li><code>action</code> - Button action name</li>
                      <li><code>class</code> - Bootstrap button classes</li>
                    </ul>

                    <h6 class="mt-3">Enhanced Inputs</h6>
                    <ul class="small">
                      <li><strong>Tag Input:</strong> <code>maxTags</code>, <code>separator</code>, <code>allowDuplicates</code></li>
                      <li><strong>Date Picker:</strong> <code>format</code>, <code>displayFormat</code>, Easepick integration</li>
                      <li><strong>Date Range:</strong> <code>startDate</code>, <code>endDate</code>, <code>separator</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Layout Elements Tab -->
          <div class="tab-pane fade" id="layout-elements" role="tabpanel">
            <div class="row">
              <div class="col-lg-8">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Layout Elements</h5>
                  </div>
                  <div class="card-body">
                    <div data-container="layout-form"></div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="card-title mb-0">Documentation</h6>
                  </div>
                  <div class="card-body">
                    <h6>Layout Elements</h6>
                    <ul class="small">
                      <li><strong>header</strong> - Section headers</li>
                      <li><strong>divider</strong> - Horizontal rules</li>
                      <li><strong>html</strong> - Custom HTML content</li>
                    </ul>

                    <h6 class="mt-3">Header Properties</h6>
                    <ul class="small">
                      <li><code>text</code> - Header text</li>
                      <li><code>level</code> - Header level (1-6)</li>
                      <li><code>id</code> - HTML id attribute</li>
                      <li><code>class</code> - Additional CSS classes</li>
                    </ul>

                    <h6 class="mt-3">HTML Properties</h6>
                    <ul class="small">
                      <li><code>html</code> - Raw HTML content</li>
                      <li><code>class</code> - Container CSS classes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async onInit() {
      await this.initializeForms();
  }

  async initializeForms() {
    await this.initializeTextForm();
    await this.initializeSelectionForm();
    await this.initializeDateForm();
    await this.initializeFileForm();
    await this.initializeSpecialForm();
    await this.initializeLayoutForm();
  }

  async initializeTextForm() {
    const textForm = new FormView({
      containerId: 'text-form',
      config: {
        fields: [
          {
            type: 'text',
            name: 'basic_text',
            label: 'Basic Text Input',
            placeholder: 'Enter some text...',
            help: 'This is a basic text input field',
            columns: 6
          },
          {
            type: 'text',
            name: 'required_text',
            label: 'Required Text',
            placeholder: 'This field is required',
            required: true,
            columns: 6
          },
          {
            type: 'email',
            name: 'email',
            label: 'Email Address',
            placeholder: 'user@example.com',
            help: 'Built-in email validation',
            columns: 6
          },
          {
            type: 'password',
            name: 'password',
            label: 'Password',
            placeholder: 'Enter password',
            help: 'Text is hidden for security',
            columns: 6
          },
          {
            type: 'tel',
            name: 'phone',
            label: 'Phone Number',
            placeholder: '(555) 123-4567',
            help: 'Optimized for phone number input',
            columns: 6
          },
          {
            type: 'url',
            name: 'website',
            label: 'Website URL',
            placeholder: 'https://example.com',
            help: 'Built-in URL validation',
            columns: 6
          },
          {
            type: 'search',
            name: 'search',
            label: 'Search Input',
            placeholder: 'Search for something...',
            help: 'Includes clear button on most browsers',
            columns: 6
          },
          {
            type: 'number',
            name: 'age',
            label: 'Age',
            placeholder: '25',
            min: 1,
            max: 120,
            help: 'Number input with min/max validation',
            columns: 6
          },
          {
            type: 'textarea',
            name: 'description',
            label: 'Description',
            placeholder: 'Enter a detailed description...',
            rows: 4,
            help: 'Multi-line text input',
            columns: 12
          },
          {
            type: 'tag',
            name: 'skills',
            label: 'Skills & Technologies',
            placeholder: 'Add skills (press Enter or comma)',
            maxTags: 20,
            separator: ',',
            help: 'Add relevant skills and technologies',
            columns: 12
          }
        ],
        options: {
          submitButton: false,
          resetButton: false
        }
      }
    });
    this.addChild(textForm);
  }

  async initializeSelectionForm() {
    const selectionForm = new FormView({
      containerId: 'selection-form',
      config: {
        fields: [
          {
            type: 'select',
            name: 'country',
            label: 'Country',
            options: [
              { value: '', text: 'Select a country...' },
              { value: 'us', text: 'United States' },
              { value: 'ca', text: 'Canada' },
              { value: 'uk', text: 'United Kingdom' },
              { value: 'de', text: 'Germany' },
              { value: 'fr', text: 'France' }
            ],
            help: 'Basic dropdown selection',
            columns: 6
          },
          {
            type: 'select',
            name: 'skills',
            label: 'Skills',
            options: [
              { value: 'js', text: 'JavaScript' },
              { value: 'python', text: 'Python' },
              { value: 'java', text: 'Java' },
              { value: 'csharp', text: 'C#' },
              { value: 'php', text: 'PHP' },
              { value: 'go', text: 'Go' }
            ],
            multiple: true,
            help: 'Multiple selection dropdown',
            columns: 6
          },
          {
            type: 'select',
            name: 'searchable',
            label: 'Searchable Select',
            options: [
              { value: 'apple', text: 'Apple' },
              { value: 'banana', text: 'Banana' },
              { value: 'cherry', text: 'Cherry' },
              { value: 'date', text: 'Date' },
              { value: 'elderberry', text: 'Elderberry' },
              { value: 'fig', text: 'Fig' }
            ],
            searchable: true,
            help: 'Dropdown with search functionality',
            columns: 6
          },
          {
            type: 'checkbox',
            name: 'newsletter',
            label: 'Subscribe to Newsletter',
            value: 'yes',
            help: 'Single checkbox for opt-in',
            columns: 6
          },
          {
            type: 'switch',
            name: 'notifications_small',
            label: 'Small Notifications',
            size: 'sm',
            help: 'Small toggle switch',
            columns: 4
          },
          {
            type: 'switch',
            name: 'notifications_normal',
            label: 'Normal Notifications',
            size: 'md',
            help: 'Default size toggle',
            columns: 4
          },
          {
            type: 'switch',
            name: 'notifications_large',
            label: 'Large Notifications',
            size: 'lg',
            help: 'Large toggle switch',
            columns: 4
          },
          {
            type: 'radio',
            name: 'theme',
            label: 'Theme Preference',
            options: [
              { value: 'light', text: 'Light Theme' },
              { value: 'dark', text: 'Dark Theme' },
              { value: 'auto', text: 'Auto (System)' }
            ],
            value: 'auto',
            help: 'Radio button group for single selection',
            columns: 6
          },
          {
            type: 'radio',
            name: 'size',
            label: 'Size Preference',
            options: [
              { value: 'small', text: 'Small' },
              { value: 'medium', text: 'Medium' },
              { value: 'large', text: 'Large' }
            ],
            inline: true,
            help: 'Inline radio buttons',
            columns: 6
          },
          {
              type: 'collection',
              name: 'parent',
              label: 'Parent Group (type=collection)',
              Collection: GroupList,  // Collection class
              labelField: 'name',          // Field to display in dropdown
              valueField: 'id',            // Field to use as value
              maxItems: 10,                // Max items to show in dropdown
              placeholder: 'Search groups...',
              emptyFetch: false,
              debounceMs: 300,             // Search debounce delay
          },
        ],
        options: {
          submitButton: false,
          resetButton: false
        }
      }
    });
    this.addChild(selectionForm);
  }

  async initializeDateForm() {
    const dateForm = new FormView({
      containerId: 'date-form',
      config: {
        fields: [
          {
            type: 'date',
            name: 'birth_date',
            label: 'Birth Date',
            help: 'Select your date of birth',
            columns: 4
          },
          {
            type: 'date',
            name: 'start_date',
            label: 'Project Start Date',
            min: new Date().toISOString().split('T')[0],
            help: 'Cannot be in the past',
            columns: 4
          },
          {
            type: 'date',
            name: 'end_date',
            label: 'Project End Date',
            min: new Date().toISOString().split('T')[0],
            help: 'Cannot be in the past',
            columns: 4
          },
          {
            type: 'time',
            name: 'start_time',
            label: 'Start Time',
            help: 'When does it start?',
            columns: 4
          },
          {
            type: 'time',
            name: 'end_time',
            label: 'End Time',
            help: 'When does it end?',
            columns: 4
          },
          {
            type: 'time',
            name: 'precise_time',
            label: 'Precise Time',
            step: 1,
            help: 'Includes seconds',
            columns: 4
          },
          {
            type: 'datetime',
            name: 'appointment',
            label: 'Appointment Date & Time',
            help: 'Select both date and time',
            columns: 6
          },
          {
            type: 'datetime',
            name: 'deadline',
            label: 'Deadline',
            min: new Date().toISOString().slice(0, 16),
            help: 'Cannot be in the past',
            columns: 6
          },
          {
            type: 'datepicker',
            name: 'enhanced_date',
            label: 'Enhanced Date Picker',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            help: 'Enhanced date picker with Easepick',
            columns: 6
          },
          {
            type: 'daterange',
            name: 'project_duration',
            label: 'Project Duration',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            separator: ' to ',
            help: 'Date range picker with Easepick',
            columns: 6
          },
          {
            type: 'daterange',
            startName: 'dr_start',
            endName: 'dr_end',
            label: 'Separate Field Names',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            separator: ' to ',
            help: 'Uses startName/endName instead of name',
            columns: 6
          },
          {
            type: 'daterange',
            startName: 'epoch_start',
            endName: 'epoch_end',
            label: 'Epoch Output Format',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            outputFormat: 'epoch',
            separator: ' to ',
            help: 'Outputs Unix timestamps',
            columns: 6
          }
        ],
        options: {
          submitButton: false,
          resetButton: false
        }
      }
    });
    this.addChild(dateForm);
  }

  async initializeFileForm() {
    const fileForm = new FormView({
      containerId: 'file-form',
      config: {
        fields: [
          {
            type: 'file',
            name: 'document',
            label: 'Document Upload',
            accept: '.pdf,.doc,.docx',
            help: 'Upload PDF or Word documents',
            columns: 6
          },
          {
            type: 'file',
            name: 'attachments',
            label: 'Multiple Files',
            multiple: true,
            help: 'Select multiple files',
            columns: 6
          },
          {
            type: 'image',
            name: 'avatar',
            label: 'Profile Picture',
            size: 'md',
            placeholder: 'Click or drag to upload',
            help: 'Upload your profile picture',
            columns: 4
          },
          {
            type: 'image',
            name: 'logo',
            label: 'Company Logo',
            size: 'lg',
            placeholder: 'Upload logo',
            allowDrop: true,
            help: 'Large image field with drag & drop',
            columns: 4
          },
          {
            type: 'image',
            name: 'thumbnail',
            label: 'Thumbnail',
            size: 'sm',
            placeholder: 'Small image',
            help: 'Small image field',
            columns: 4
          }
        ],
        options: {
          submitButton: false,
          resetButton: false
        }
      }
    });
    this.addChild(fileForm);
  }

  async initializeSpecialForm() {
    const specialForm = new FormView({
      containerId: 'special-form',
      config: {
        fields: [
          {
            type: 'range',
            name: 'volume',
            label: 'Volume',
            min: 0,
            max: 100,
            step: 5,
            value: 50,
            help: 'Drag to adjust volume',
            columns: 6
          },
          {
            type: 'range',
            name: 'price_range',
            label: 'Price Range',
            min: 0,
            max: 1000,
            step: 50,
            value: 250,
            help: 'Select price range',
            columns: 6
          },
          {
            type: 'color',
            name: 'brand_color',
            label: 'Brand Color',
            value: '#007bff',
            help: 'Pick your brand color',
            columns: 6
          },
          {
            type: 'color',
            name: 'accent_color',
            label: 'Accent Color',
            value: '#28a745',
            help: 'Pick an accent color',
            columns: 6
          },
          {
            type: 'button',
            name: 'custom_action',
            label: 'Custom Action',
            action: 'custom-action',
            class: 'btn-warning',
            help: 'Custom button with action',
            columns: 4
          },
          {
            type: 'button',
            name: 'another_action',
            label: 'Another Action',
            action: 'another-action',
            class: 'btn-info',
            columns: 4
          },
          {
            type: 'button',
            name: 'danger_action',
            label: 'Danger Action',
            action: 'danger-action',
            class: 'btn-outline-danger',
            columns: 4
          },
          {
            type: 'tag',
            name: 'demo_tags',
            label: 'Demo Tags',
            placeholder: 'Add tags (press Enter or comma)',
            maxTags: 10,
            value: 'javascript,html,css',
            help: 'Enhanced tag input component',
            columns: 6
          },
          {
            type: 'datepicker',
            name: 'demo_date',
            label: 'Enhanced Date Picker',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            placeholder: 'Select date...',
            help: 'Date picker with Easepick integration',
            columns: 6
          },
          {
            type: 'daterange',
            name: 'demo_daterange',
            label: 'Date Range Picker',
            format: 'YYYY-MM-DD',
            displayFormat: 'MMM DD, YYYY',
            separator: ' to ',
            placeholder: 'Select date range...',
            help: 'Date range picker with Easepick',
            columns: 12
          },
          {
            type: 'hidden',
            name: 'user_id',
            value: '12345'
          }
        ],
        options: {
          submitButton: false,
          resetButton: false
        }
      }
    });
    this.addChild(specialForm);
  }

  async initializeLayoutForm() {
    const layoutForm = new FormView({
      containerId: 'layout-form',
      config: {
        fields: [
          {
            type: 'header',
            text: 'Personal Information',
            level: 3,
            class: 'text-primary border-bottom pb-2 mb-3',
            columns: 12
          },
          {
            type: 'text',
            name: 'first_name',
            label: 'First Name',
            placeholder: 'John',
            columns: 6
          },
          {
            type: 'text',
            name: 'last_name',
            label: 'Last Name',
            placeholder: 'Doe',
            columns: 6
          },
          {
            type: 'divider',
            class: 'my-4',
            columns: 12
          },
          {
            type: 'header',
            text: 'Contact Information',
            level: 4,
            class: 'text-secondary',
            columns: 12
          },
          {
            type: 'email',
            name: 'email_contact',
            label: 'Email',
            placeholder: 'john@example.com',
            columns: 6
          },
          {
            type: 'tel',
            name: 'phone_contact',
            label: 'Phone',
            placeholder: '(555) 123-4567',
            columns: 6
          },
          {
            type: 'html',
            html: '<div class="alert alert-info mt-3"><i class="bi bi-info-circle me-2"></i>This is custom HTML content that can include any markup, components, or styling you need.</div>',
            columns: 12
          },
          {
            type: 'divider',
            class: 'my-3',
            columns: 12
          },
          {
            type: 'header',
            text: 'Additional Notes',
            level: 5,
            columns: 12
          },
          {
            type: 'textarea',
            name: 'notes',
            label: 'Notes',
            placeholder: 'Any additional information...',
            rows: 3,
            columns: 12
          }
        ],
        options: {
          submitButton: false,
          resetButton: false
        }
      }
    });
    this.addChild(layoutForm);
  }

  async onActionCustomAction(action, event, element) {
    this.showSuccess('Custom action triggered!');
  }

  async onActionAnotherAction(action, event, element) {
    this.showInfo('Another action was performed!');
  }

  async onActionDangerAction(action, event, element) {
    this.showWarning('Danger action - be careful!');
  }

  async onBeforeDestroy() {
    // Clean up forms
    Object.values(this.forms).forEach(form => {
      if (form && typeof form.destroy === 'function') {
        form.destroy();
      }
    });
    super.onBeforeDestroy();
  }
}
