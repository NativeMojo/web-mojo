/**
 * FormatterPage - Demonstrates DataFormatter capabilities
 * Shows various formatting options for dates, numbers, strings, and more
 */

import Page from '../../../src/core/Page.js';
import Table from '../../../src/components/Table.js';
import Model from '../../../src/core/Model.js';
import dataFormatter from '../../../src/utils/DataFormatter.js';

class FormatterPage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      name: 'formatter-page',
      title: 'DataFormatter Examples'
    });

    // Sample data for demonstrations
    this.sampleData = {
      date: new Date('2024-01-15T14:30:45.000Z'),
      price: 1234.56,
      percent: 0.857,
      fileSize: 1048576,
      name: 'john doe',
      email: 'JOHN@EXAMPLE.COM',
      phone: '5551234567',
      description: 'This is a very long description that needs to be truncated for display',
      status: 'active',
      nullValue: null
    };

    // Register custom formatters for demo
    this.registerCustomFormatters();
  }

  registerCustomFormatters() {
    // Custom priority formatter
    dataFormatter.register('priority', (value) => {
      const priorities = {
        high: { color: 'danger', icon: '🔴' },
        medium: { color: 'warning', icon: '🟡' },
        low: { color: 'success', icon: '🟢' }
      };
      const priority = priorities[value?.toLowerCase()] || { color: 'secondary', icon: '⚪' };
      return `<span class="text-${priority.color}">${priority.icon} ${value}</span>`;
    });

    // Custom rating formatter
    dataFormatter.register('stars', (value, max = 5) => {
      const rating = Math.min(Math.max(0, value), max);
      const fullStars = '★'.repeat(Math.floor(rating));
      const emptyStars = '☆'.repeat(max - Math.floor(rating));
      return `<span class="text-warning">${fullStars}</span><span class="text-muted">${emptyStars}</span>`;
    });
  }

  async onInit() {
    // Create sample models
    this.userModel = new Model({
      id: 1,
      firstName: 'jane',
      lastName: 'smith',
      email: 'JANE.SMITH@EXAMPLE.COM',
      joinedAt: new Date('2023-06-15'),
      score: 0.923,
      profileSize: 2457600,
      status: 'active',
      priority: 'high'
    });

    // Create table with formatters
    this.formatterTable = new Table({
      columns: [
        {
          key: 'type',
          label: 'Formatter Type',
          formatter: 'capitalize'
        },
        {
          key: 'input',
          label: 'Input Value',
          formatter: (value) => `<code>${JSON.stringify(value)}</code>`
        },
        {
          key: 'formatter',
          label: 'Formatter',
          formatter: (value) => `<code>${value}</code>`
        },
        {
          key: 'output',
          label: 'Output',
          formatter: 'raw'
        }
      ]
    });
  }

  getTemplate() {
    return `
      <div class="container-fluid p-3">
        <h2 class="mb-4">DataFormatter Examples</h2>
        
        <!-- Basic Formatters -->
        <div class="card mb-3">
          <div class="card-header">
            <h5 class="mb-0">Basic Formatters</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Date/Time Formatters</h6>
                <table class="table table-sm">
                  <tr>
                    <td><code>date</code></td>
                    <td>{{sampleData.date|date}}</td>
                  </tr>
                  <tr>
                    <td><code>date('YYYY-MM-DD')</code></td>
                    <td>{{sampleData.date|date('YYYY-MM-DD')}}</td>
                  </tr>
                  <tr>
                    <td><code>time</code></td>
                    <td>{{sampleData.date|time}}</td>
                  </tr>
                  <tr>
                    <td><code>datetime</code></td>
                    <td>{{sampleData.date|datetime}}</td>
                  </tr>
                  <tr>
                    <td><code>relative</code></td>
                    <td>{{sampleData.date|relative}}</td>
                  </tr>
                  <tr>
                    <td><code>iso</code></td>
                    <td class="text-truncate" style="max-width: 200px">{{sampleData.date|iso}}</td>
                  </tr>
                </table>
              </div>
              
              <div class="col-md-6">
                <h6>Number Formatters</h6>
                <table class="table table-sm">
                  <tr>
                    <td><code>number</code></td>
                    <td>{{sampleData.price|number}}</td>
                  </tr>
                  <tr>
                    <td><code>currency</code></td>
                    <td>{{sampleData.price|currency}}</td>
                  </tr>
                  <tr>
                    <td><code>currency('€', 0)</code></td>
                    <td>{{sampleData.price|currency('€', 0)}}</td>
                  </tr>
                  <tr>
                    <td><code>percent</code></td>
                    <td>{{sampleData.percent|percent}}</td>
                  </tr>
                  <tr>
                    <td><code>filesize</code></td>
                    <td>{{sampleData.fileSize|filesize}}</td>
                  </tr>
                  <tr>
                    <td><code>ordinal</code></td>
                    <td>21 → {{ordinalExample|ordinal}}</td>
                  </tr>
                </table>
              </div>
            </div>
            
            <div class="row mt-3">
              <div class="col-md-6">
                <h6>String Formatters</h6>
                <table class="table table-sm">
                  <tr>
                    <td><code>uppercase</code></td>
                    <td>{{sampleData.name|uppercase}}</td>
                  </tr>
                  <tr>
                    <td><code>lowercase</code></td>
                    <td>{{sampleData.email|lowercase}}</td>
                  </tr>
                  <tr>
                    <td><code>capitalize</code></td>
                    <td>{{sampleData.name|capitalize}}</td>
                  </tr>
                  <tr>
                    <td><code>truncate(20)</code></td>
                    <td>{{sampleData.description|truncate(20)}}</td>
                  </tr>
                  <tr>
                    <td><code>slug</code></td>
                    <td>{{slugExample|slug}}</td>
                  </tr>
                  <tr>
                    <td><code>initials</code></td>
                    <td>{{sampleData.name|initials}}</td>
                  </tr>
                </table>
              </div>
              
              <div class="col-md-6">
                <h6>HTML/Web Formatters</h6>
                <table class="table table-sm">
                  <tr>
                    <td><code>email</code></td>
                    <td>{{{sampleData.email|lowercase|email}}}</td>
                  </tr>
                  <tr>
                    <td><code>phone</code></td>
                    <td>{{{sampleData.phone|phone}}}</td>
                  </tr>
                  <tr>
                    <td><code>url</code></td>
                    <td>{{{urlExample|url('Visit Site')}}}</td>
                  </tr>
                  <tr>
                    <td><code>badge</code></td>
                    <td>{{{sampleData.status|badge}}}</td>
                  </tr>
                  <tr>
                    <td><code>boolean</code></td>
                    <td>{{boolExample|boolean}}</td>
                  </tr>
                  <tr>
                    <td><code>default('N/A')</code></td>
                    <td>{{sampleData.nullValue|default('N/A')}}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Pipe Chaining -->
        <div class="card mb-3">
          <div class="card-header">
            <h5 class="mb-0">Pipe Chaining</h5>
          </div>
          <div class="card-body">
            <p>Chain multiple formatters together using the pipe syntax:</p>
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Expression</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>name|uppercase|truncate(5)</code></td>
                  <td>{{sampleData.name|uppercase|truncate(5)}}</td>
                </tr>
                <tr>
                  <td><code>email|lowercase|truncate(15)|default('No Email')</code></td>
                  <td>{{sampleData.email|lowercase|truncate(15)|default('No Email')}}</td>
                </tr>
                <tr>
                  <td><code>price|currency|default('Free')</code></td>
                  <td>{{sampleData.price|currency|default('Free')}}</td>
                </tr>
                <tr>
                  <td><code>nullValue|currency|default('Free')</code></td>
                  <td>{{sampleData.nullValue|currency|default('Free')}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Model Integration -->
        <div class="card mb-3">
          <div class="card-header">
            <h5 class="mb-0">Model Integration</h5>
          </div>
          <div class="card-body">
            <p>Use formatters directly in Model.get() calls:</p>
            <div class="row">
              <div class="col-md-6">
                <pre><code>// Model data:
{
  firstName: 'jane',
  lastName: 'smith',
  email: 'JANE.SMITH@EXAMPLE.COM',
  joinedAt: '2023-06-15',
  score: 0.923,
  profileSize: 2457600,
  status: 'active',
  priority: 'high'
}</code></pre>
              </div>
              <div class="col-md-6">
                <table class="table table-sm">
                  <tr>
                    <td><code>model.get('firstName|capitalize')</code></td>
                    <td id="model-firstName"></td>
                  </tr>
                  <tr>
                    <td><code>model.get('email|lowercase')</code></td>
                    <td id="model-email"></td>
                  </tr>
                  <tr>
                    <td><code>model.get('joinedAt|date')</code></td>
                    <td id="model-joinedAt"></td>
                  </tr>
                  <tr>
                    <td><code>model.get('score|percent(1)')</code></td>
                    <td id="model-score"></td>
                  </tr>
                  <tr>
                    <td><code>model.get('profileSize|filesize')</code></td>
                    <td id="model-profileSize"></td>
                  </tr>
                  <tr>
                    <td><code>model.get('priority|priority')</code></td>
                    <td id="model-priority"></td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Table Integration -->
        <div class="card mb-3">
          <div class="card-header">
            <h5 class="mb-0">Table Integration</h5>
          </div>
          <div class="card-body">
            <p>Tables support formatters in column definitions:</p>
            <div id="formatter-table"></div>
          </div>
        </div>

        <!-- Custom Formatters -->
        <div class="card mb-3">
          <div class="card-header">
            <h5 class="mb-0">Custom Formatters</h5>
          </div>
          <div class="card-body">
            <p>Register custom formatters for domain-specific formatting:</p>
            <pre><code>// Register a custom priority formatter
dataFormatter.register('priority', (value) => {
  const priorities = {
    high: { color: 'danger', icon: '🔴' },
    medium: { color: 'warning', icon: '🟡' },
    low: { color: 'success', icon: '🟢' }
  };
  const priority = priorities[value?.toLowerCase()];
  return \`&lt;span class="text-\${priority.color}">\${priority.icon} \${value}&lt;/span>\`;
});</code></pre>
            
            <table class="table table-sm">
              <tr>
                <td>High Priority</td>
                <td>{{{highPriority|priority}}}</td>
              </tr>
              <tr>
                <td>Medium Priority</td>
                <td>{{{mediumPriority|priority}}}</td>
              </tr>
              <tr>
                <td>Low Priority</td>
                <td>{{{lowPriority|priority}}}</td>
              </tr>
              <tr>
                <td>Rating (4/5)</td>
                <td>{{{ratingExample|stars}}}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- API Reference -->
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Quick Reference</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-4">
                <h6>In Models</h6>
                <pre><code>model.get('field|formatter')
model.get('field|formatter(args)')
model.get('field|fmt1|fmt2')</code></pre>
              </div>
              <div class="col-md-4">
                <h6>In Templates</h6>
                <pre><code>\{{value|formatter}}
\{{value|formatter('arg')}}
\{{{html|formatter}}}</code></pre>
              </div>
              <div class="col-md-4">
                <h6>In Tables</h6>
                <pre><code>columns: [{
  key: 'field',
  formatter: 'name' // or
  formatter: func // or
  formatter: {name, args}
}]</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async onAfterMount() {
    // Display model formatting examples
    if (this.userModel) {
      this.updateElement('model-firstName', this.userModel.get('firstName|capitalize'));
      this.updateElement('model-email', this.userModel.get('email|lowercase'));
      this.updateElement('model-joinedAt', this.userModel.get('joinedAt|date'));
      this.updateElement('model-score', this.userModel.get('score|percent(1)'));
      this.updateElement('model-profileSize', this.userModel.get('profileSize|filesize'));
      this.updateElement('model-priority', this.userModel.get('priority|priority'));
    }

    // Render formatter table
    if (this.formatterTable) {
      const tableData = [
        {
          type: 'date',
          input: this.sampleData.date,
          formatter: 'date',
          output: dataFormatter.apply('date', this.sampleData.date)
        },
        {
          type: 'currency',
          input: this.sampleData.price,
          formatter: 'currency',
          output: dataFormatter.apply('currency', this.sampleData.price)
        },
        {
          type: 'percent',
          input: this.sampleData.percent,
          formatter: 'percent(2)',
          output: dataFormatter.apply('percent', this.sampleData.percent, 2)
        },
        {
          type: 'email',
          input: this.sampleData.email,
          formatter: 'lowercase|email',
          output: dataFormatter.pipe(this.sampleData.email, 'lowercase|email')
        },
        {
          type: 'phone',
          input: this.sampleData.phone,
          formatter: 'phone',
          output: dataFormatter.apply('phone', this.sampleData.phone)
        },
        {
          type: 'truncate',
          input: this.sampleData.description,
          formatter: 'truncate(30)',
          output: dataFormatter.apply('truncate', this.sampleData.description, 30)
        }
      ];

      // Add data to table
      tableData.forEach(row => this.formatterTable.collection?.add?.(row) || this.formatterTable.data?.push(row));
      
      const tableContainer = this.container.querySelector('#formatter-table');
      if (tableContainer) {
        this.formatterTable.container = tableContainer;
        this.formatterTable.render();
      }
    }
  }

  updateElement(id, content) {
    const element = this.container.querySelector(`#${id}`);
    if (element) {
      element.innerHTML = content;
    }
  }

  getViewData() {
    return {
      ...super.getViewData(),
      sampleData: this.sampleData,
      ordinalExample: 21,
      slugExample: 'Hello World & Friends!',
      urlExample: 'example.com',
      boolExample: true,
      highPriority: 'high',
      mediumPriority: 'medium',
      lowPriority: 'low',
      ratingExample: 4
    };
  }
}

export default FormatterPage;