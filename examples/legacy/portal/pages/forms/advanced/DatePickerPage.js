import { Page, FormView } from 'web-mojo';

/**
 * DatePickerPage - Demonstrates datepicker field
 * 
 * Shows the enhanced datepicker field using Easepick library
 */
class DatePickerPage extends Page {
  static pageName = 'forms/date-picker';
  
  constructor(options = {}) {
    super({
      title: 'DatePicker',
      icon: 'bi-calendar3',
      pageDescription: 'Enhanced date picker with calendar UI',
      ...options
    });
  }
  
  async onActionSubmitDateForm(event, element) {
    event.preventDefault();
    
    const isValid = await this.dateForm.validate();
    if (isValid) {
      const data = await this.dateForm.getFormData();
      console.log('Date form submitted:', data);
      
      const output = document.getElementById('date-output');
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
    
    // Create form with datepicker fields
    this.dateForm = new FormView({
      fields: [
        {
          type: 'datepicker',
          name: 'event_date',
          label: 'Event Date',
          required: true,
          placeholder: 'Select a date',
          help: 'Click to open calendar picker'
        },
        {
          type: 'datepicker',
          name: 'start_date',
          label: 'Start Date',
          placeholder: 'Select start date'
        },
        {
          type: 'datepicker',
          name: 'end_date',
          label: 'End Date',
          placeholder: 'Select end date'
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Submit',
          action: 'submit-date-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.dateForm, { containerId: 'date-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="datepicker-page">
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-calendar3 me-2 text-primary"></i>
            DatePicker
          </h1>
          <p class="text-muted">
            Enhanced date picker with visual calendar UI powered by Easepick
          </p>
        </div>
        
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>About DatePicker</h6>
          <p class="mb-0">The <code>datepicker</code> field uses the Easepick library to provide a rich calendar interface for date selection, offering better UX than the native HTML5 date input.</p>
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
                <div id="date-form-container"></div>
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
                <div id="date-output" class="text-muted">
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
      type: 'datepicker',
      name: 'event_date',
      label: 'Event Date',
      required: true,
      placeholder: 'Select a date'
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
              <li>Visual calendar popup for date selection</li>
              <li>Better UX than native date input</li>
              <li>Keyboard navigation support</li>
              <li>Customizable date formats</li>
              <li>Min/max date constraints</li>
              <li>Mobile-friendly interface</li>
            </ul>
            
            <h6 class="mt-3">When to Use</h6>
            <ul>
              <li>Event dates and scheduling</li>
              <li>Booking and reservation forms</li>
              <li>When you need enhanced calendar UI</li>
              <li>Cross-browser consistent date picking</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

export default DatePickerPage;
