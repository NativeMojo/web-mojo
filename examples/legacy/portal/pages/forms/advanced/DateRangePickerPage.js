import { Page, FormView } from 'web-mojo';

/**
 * DateRangePickerPage - Demonstrates daterange field
 * 
 * Shows the date range picker for selecting start and end dates
 */
class DateRangePickerPage extends Page {
  static pageName = 'forms/date-range-picker';
  
  constructor(options = {}) {
    super({
      title: 'DateRangePicker',
      icon: 'bi-calendar-range',
      pageDescription: 'Select date ranges with dual calendar UI',
      ...options
    });
  }
  
  async onActionSubmitDateRangeForm(event, element) {
    event.preventDefault();
    
    const isValid = await this.dateRangeForm.validate();
    if (isValid) {
      const data = await this.dateRangeForm.getFormData();
      console.log('Date range form submitted:', data);
      
      const output = document.getElementById('daterange-output');
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
      
      this.getApp().toast.success('Date range submitted successfully!');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // Create form with daterange fields
    this.dateRangeForm = new FormView({
      fields: [
        {
          type: 'daterange',
          name: 'vacation_period',
          label: 'Vacation Period',
          required: true,
          placeholder: 'Select date range',
          help: 'Choose your vacation start and end dates'
        },
        {
          type: 'daterange',
          name: 'project_timeline',
          label: 'Project Timeline',
          placeholder: 'Select project duration'
        },
        {
          type: 'daterange',
          name: 'reporting_period',
          label: 'Reporting Period',
          placeholder: 'Select reporting range',
          help: 'Choose the date range for your report'
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Submit',
          action: 'submit-date-range-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.dateRangeForm, { containerId: 'daterange-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="daterange-picker-page">
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-calendar-range me-2 text-primary"></i>
            DateRangePicker
          </h1>
          <p class="text-muted">
            Select date ranges with start and end dates using dual calendar interface
          </p>
        </div>
        
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>About DateRangePicker</h6>
          <p class="mb-0">The <code>daterange</code> field allows users to select a start and end date in a single input, perfect for booking systems, vacation planners, and reporting periods.</p>
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
                <div id="daterange-form-container"></div>
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
                <div id="daterange-output" class="text-muted">
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
      type: 'daterange',
      name: 'vacation_period',
      label: 'Vacation Period',
      required: true,
      placeholder: 'Select date range'
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
              <li>Select start and end dates in one input</li>
              <li>Dual calendar view for range selection</li>
              <li>Visual feedback showing selected range</li>
              <li>Validates that end date is after start date</li>
              <li>Keyboard navigation support</li>
              <li>Mobile-friendly interface</li>
            </ul>
            
            <h6 class="mt-3">When to Use</h6>
            <ul>
              <li>Vacation and leave booking systems</li>
              <li>Project timeline planning</li>
              <li>Report date range selection</li>
              <li>Event scheduling with duration</li>
              <li>Booking systems (hotels, rentals, etc.)</li>
              <li>Financial reporting periods</li>
            </ul>
            
            <h6 class="mt-3">Data Format</h6>
            <p>The field returns an object with start and end dates:</p>
            <pre class="bg-light p-2 rounded"><code>{
  "vacation_period": {
    "start": "2024-01-15",
    "end": "2024-01-22"
  }
}</code></pre>
          </div>
        </div>
      </div>
    `;
  }
}

export default DateRangePickerPage;
