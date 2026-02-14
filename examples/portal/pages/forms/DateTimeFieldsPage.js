import { Page, FormView } from 'web-mojo';

/**
 * DateTimeFieldsPage - Demonstrates all date and time field types
 * 
 * Shows date, datetime-local, time, datepicker, daterange
 */
class DateTimeFieldsPage extends Page {
  static pageName = 'forms/date-time-fields';
  
  constructor(options = {}) {
    super({
      title: 'Date & Time Fields',
      icon: 'bi-calendar',
      pageDescription: 'Explore date and time input types: date, datetime-local, time, and enhanced pickers',
      ...options
    });
  }
  
  async onActionSubmitDateTimeForm(event, element) {
    const isValid = await this.dateTimeForm.validate();
    if (isValid) {
      const data = await this.dateTimeForm.getFormData();
      console.log('Date/Time form submitted:', data);
      
      // Show the submitted data
      const output = document.getElementById('datetime-output');
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
    
    // Get date strings for examples
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    // Create form with all date/time field types
    this.dateTimeForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Native HTML5 Date/Time Fields',
          level: 5
        },
        {
          name: 'birth_date',
          label: 'Birth Date',
          type: 'date',
          required: true,
          help: 'Native HTML5 date picker',
          max: todayStr
        },
        {
          name: 'appointment',
          label: 'Appointment Date & Time',
          type: 'datetime-local',
          required: true,
          help: 'Native HTML5 datetime picker',
          min: todayStr
        },
        {
          name: 'meeting_time',
          label: 'Meeting Time',
          type: 'time',
          help: 'Native HTML5 time picker',
          step: 900 // 15 minute intervals
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Enhanced Date Pickers',
          level: 5
        },
        {
          name: 'event_date',
          label: 'Event Date (Enhanced)',
          type: 'datepicker',
          help: 'Enhanced date picker with calendar UI (Easepick library)',
          value: tomorrowStr,
          minDate: todayStr,
          maxDate: nextWeekStr
        },
        {
          name: 'vacation',
          label: 'Vacation Date Range',
          type: 'daterange',
          help: 'Select start and end dates',
          startName: 'vacation_start',
          endName: 'vacation_end'
        },
        {
          type: 'button',
          label: 'Submit Date/Time Form',
          action: 'submit-date-time-form',
          buttonClass: 'btn-primary',
          icon: 'bi-calendar-check'
        }
      ]
    });
    
    this.addChild(this.dateTimeForm, { containerId: 'datetime-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="datetime-fields-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-calendar me-2 text-primary"></i>
            Date & Time Fields
          </h1>
          <p class="text-muted">
            Explore date and time input types: date, datetime-local, time, and enhanced pickers
          </p>
        </div>
        
        <!-- Quick Reference -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-table me-2"></i>
              Date & Time Types Quick Reference
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Format</th>
                    <th>Use Case</th>
                    <th>Browser Support</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>date</code></td>
                    <td>YYYY-MM-DD</td>
                    <td>Simple date selection</td>
                    <td>All modern browsers</td>
                  </tr>
                  <tr>
                    <td><code>datetime-local</code></td>
                    <td>YYYY-MM-DDTHH:mm</td>
                    <td>Date and time (no timezone)</td>
                    <td>All modern browsers</td>
                  </tr>
                  <tr>
                    <td><code>time</code></td>
                    <td>HH:mm</td>
                    <td>Time selection only</td>
                    <td>All modern browsers</td>
                  </tr>
                  <tr>
                    <td><code>datepicker</code></td>
                    <td>YYYY-MM-DD</td>
                    <td>Enhanced calendar UI</td>
                    <td>All (with Easepick)</td>
                  </tr>
                  <tr>
                    <td><code>daterange</code></td>
                    <td>Start + End dates</td>
                    <td>Date range selection</td>
                    <td>All (with Easepick)</td>
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
                  <i class="bi bi-calendar-event me-2"></i>
                  Try All Date/Time Types
                </h3>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  Interact with each date/time field type to see their behavior.
                </p>
                <div id="datetime-form-container"></div>
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
                <div id="datetime-output" class="text-muted">
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
      name: 'birth_date',
      label: 'Birth Date',
      type: 'date',
      required: true,
      max: '2024-12-31'
    },
    {
      name: 'appointment',
      label: 'Appointment',
      type: 'datetime-local',
      min: '2024-01-01T00:00'
    },
    {
      name: 'meeting_time',
      label: 'Meeting Time',
      type: 'time',
      step: 900 // 15 min intervals
    },
    {
      name: 'event_date',
      label: 'Event Date',
      type: 'datepicker',
      minDate: '2024-01-01',
      maxDate: '2024-12-31'
    },
    {
      name: 'vacation',
      label: 'Vacation Range',
      type: 'daterange',
      startName: 'start_date',
      endName: 'end_date'
    }
  ]
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Field Tips -->
        <div class="row">
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Native vs Enhanced Pickers
                </h4>
                <ul class="small mb-0">
                  <li><strong>Native</strong> - No dependencies, works everywhere, but UI varies by browser</li>
                  <li><strong>Enhanced</strong> - Consistent UI, more features, but requires library</li>
                  <li>Use native for simple forms</li>
                  <li>Use enhanced for better UX</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Date Format Tips
                </h4>
                <ul class="small mb-0">
                  <li><code>date</code> expects YYYY-MM-DD format</li>
                  <li><code>datetime-local</code> expects YYYY-MM-DDTHH:mm</li>
                  <li><code>time</code> expects HH:mm (24-hour format)</li>
                  <li>Use ISO 8601 format for consistency</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Validation Options
                </h4>
                <ul class="small mb-0">
                  <li><code>min</code> - Minimum date/time allowed</li>
                  <li><code>max</code> - Maximum date/time allowed</li>
                  <li><code>step</code> - Time interval in seconds (time field)</li>
                  <li><code>required</code> - Make field mandatory</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Time Step Values
                </h4>
                <ul class="small mb-0">
                  <li><code>60</code> - 1 minute intervals</li>
                  <li><code>300</code> - 5 minute intervals</li>
                  <li><code>900</code> - 15 minute intervals</li>
                  <li><code>1800</code> - 30 minute intervals</li>
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
              Common Options for Date/Time Fields
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Applies To</th>
                    <th>Description</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>min</code></td>
                    <td>date, datetime-local, time</td>
                    <td>Minimum allowed value</td>
                    <td><code>min: '2024-01-01'</code></td>
                  </tr>
                  <tr>
                    <td><code>max</code></td>
                    <td>date, datetime-local, time</td>
                    <td>Maximum allowed value</td>
                    <td><code>max: '2024-12-31'</code></td>
                  </tr>
                  <tr>
                    <td><code>step</code></td>
                    <td>time</td>
                    <td>Interval in seconds</td>
                    <td><code>step: 900</code> (15 min)</td>
                  </tr>
                  <tr>
                    <td><code>minDate</code></td>
                    <td>datepicker, daterange</td>
                    <td>Minimum selectable date</td>
                    <td><code>minDate: '2024-01-01'</code></td>
                  </tr>
                  <tr>
                    <td><code>maxDate</code></td>
                    <td>datepicker, daterange</td>
                    <td>Maximum selectable date</td>
                    <td><code>maxDate: '2024-12-31'</code></td>
                  </tr>
                  <tr>
                    <td><code>startName</code></td>
                    <td>daterange</td>
                    <td>Field name for start date</td>
                    <td><code>startName: 'start_date'</code></td>
                  </tr>
                  <tr>
                    <td><code>endName</code></td>
                    <td>daterange</td>
                    <td>Field name for end date</td>
                    <td><code>endName: 'end_date'</code></td>
                  </tr>
                  <tr>
                    <td><code>value</code></td>
                    <td>All</td>
                    <td>Initial/default value</td>
                    <td><code>value: '2024-06-15'</code></td>
                  </tr>
                  <tr>
                    <td><code>required</code></td>
                    <td>All</td>
                    <td>Makes field mandatory</td>
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

export default DateTimeFieldsPage;
