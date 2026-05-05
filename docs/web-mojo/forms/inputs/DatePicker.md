# DatePicker Component

In-house single-value date picker. Renders a tokened, Bootstrap-themed calendar that supports day / month / year precision via a single `precision` option, plus drill-down zoom (click the header label to move from day-grid → month-grid → year-grid). Uniform behavior across browsers — no runtime CDN dependency.

**Field Types:** `datepicker` (default day precision), `monthpicker` (precision: 'month'), `yearpicker` (precision: 'year')

---

## Quick Start

```javascript
// Day precision (default)
{
  type: 'datepicker',
  name: 'start_date',
  label: 'Start Date',
  format: 'YYYY-MM-DD',
  placeholder: 'Select a date...'
}

// Month precision — stores 'YYYY-MM'
{
  type: 'monthpicker',
  name: 'period',
  label: 'Period',
}

// Year precision — stores 'YYYY'
{
  type: 'yearpicker',
  name: 'fiscal_year',
  label: 'Fiscal Year',
}
```

## Precision

`precision: 'year' | 'month' | 'day'` (default `'day'`) controls what the user can select.

| Precision | Stored value | Default display | Field-type alias |
|---|---|---|---|
| `day` | `YYYY-MM-DD` | `MMM DD, YYYY` | `datepicker` |
| `month` | `YYYY-MM` | `MMM YYYY` | `monthpicker` |
| `year` | `YYYY` | `YYYY` | `yearpicker` |

Drill-down navigation is uniform: clicking the header label of a day-grid zooms out to a month-grid; clicking that header zooms out to a year-grid. The picker commits at whichever precision was configured.

---

## Configuration Options

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Field name |
| `label` | string | - | Field label |
| `placeholder` | string | `'Select date...'` | Placeholder text |
| `value` | string/Date | - | Initial date |
| `format` | string | `'YYYY-MM-DD'` | Date storage format |
| `displayFormat` | string | `'MMM DD, YYYY'` | Display format |

### Date Constraints

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `min` | string/Date | - | Minimum selectable date |
| `max` | string/Date | - | Maximum selectable date |
| `disabledDates` | array | `[]` | Specific dates to disable |
| `enabledDates` | array | `[]` | Only these dates selectable |

### Calendar Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `inline` | boolean | `false` | Show calendar inline (always visible) |
| `months` | number | `1` | Number of months to show |
| `firstDay` | number | `0` | First day of week (0=Sunday, 1=Monday) |
| `lang` | string | `'en-US'` | Language/locale |

### Behavior

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `required` | boolean | `false` | Require date selection |
| `disabled` | boolean | `false` | Disable picker |
| `readonly` | boolean | `false` | Make read-only |
| `autoApply` | boolean | `true` | Apply date immediately on select |

---

## Usage Examples

### Basic Date Picker

```javascript
{
  type: 'datepicker',
  name: 'birth_date',
  label: 'Birth Date',
  placeholder: 'MM/DD/YYYY',
  displayFormat: 'MM/DD/YYYY'
}
```

### With Min/Max Dates

```javascript
{
  type: 'datepicker',
  name: 'appointment',
  label: 'Appointment Date',
  min: new Date(), // Today or later
  max: '2025-12-31', // Before end of year
  help: 'Select a date within the next year'
}
```

### Future Dates Only

```javascript
{
  type: 'datepicker',
  name: 'event_date',
  label: 'Event Date',
  min: new Date().toISOString().split('T')[0], // Today
  placeholder: 'Select future date...'
}
```

### Past Dates Only

```javascript
{
  type: 'datepicker',
  name: 'graduation_date',
  label: 'Graduation Date',
  max: new Date(), // Today or earlier
  placeholder: 'Select past date...'
}
```

### Inline Calendar

```javascript
{
  type: 'datepicker',
  name: 'check_in',
  label: 'Check-in Date',
  inline: true, // Always visible
  months: 2 // Show 2 months
}
```

### Disabled Dates

```javascript
{
  type: 'datepicker',
  name: 'meeting_date',
  label: 'Meeting Date',
  disabledDates: [
    '2025-01-01', // New Year
    '2025-12-25', // Christmas
    '2025-07-04'  // July 4th
  ],
  help: 'Holidays are not available'
}
```

### European Format

```javascript
{
  type: 'datepicker',
  name: 'start_date',
  label: 'Start Date',
  format: 'DD/MM/YYYY',
  displayFormat: 'DD/MM/YYYY',
  firstDay: 1, // Monday
  lang: 'en-GB'
}
```

---

## Date Formats

### Common Formats

| Format | Example | Use Case |
|--------|---------|----------|
| `YYYY-MM-DD` | 2025-01-15 | ISO format, database storage |
| `MM/DD/YYYY` | 01/15/2025 | US format |
| `DD/MM/YYYY` | 15/01/2025 | European format |
| `MMM DD, YYYY` | Jan 15, 2025 | Display format |
| `MMMM DD, YYYY` | January 15, 2025 | Long display format |
| `DD MMM YYYY` | 15 Jan 2025 | Short international |

### Format Tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `YYYY` | 4-digit year | 2025 |
| `YY` | 2-digit year | 25 |
| `MMMM` | Full month name | January |
| `MMM` | Short month name | Jan |
| `MM` | 2-digit month | 01 |
| `M` | Month number | 1 |
| `DD` | 2-digit day | 15 |
| `D` | Day number | 15 |
| `dddd` | Full day name | Monday |
| `ddd` | Short day name | Mon |

---

## Value Handling

### Setting Initial Value

```javascript
// String
{ type: 'datepicker', name: 'date', value: '2025-01-15' }

// Date object
{ type: 'datepicker', name: 'date', value: new Date() }

// From model
const form = new FormView({
  model: event,
  formConfig: {
    fields: [
      { type: 'datepicker', name: 'start_date' }
    ]
  }
});
```

### Getting Value

```javascript
const data = await form.getFormData();
console.log(data.start_date); // "2025-01-15" (format specified)
```

### Updating Value Programmatically

```javascript
// Set to today
form.setFieldValue('start_date', new Date().toISOString().split('T')[0]);

// Set to specific date
form.setFieldValue('start_date', '2025-06-15');

// Clear date
form.setFieldValue('start_date', '');
```

---

## Validation

### Required Date

```javascript
{
  type: 'datepicker',
  name: 'start_date',
  label: 'Start Date',
  required: true,
  validation: {
    required: true
  }
}
```

### Date Range Validation

```javascript
{
  type: 'datepicker',
  name: 'event_date',
  label: 'Event Date',
  validation: {
    custom: (value) => {
      const date = new Date(value);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6);
      
      if (date < today) {
        return 'Date must be in the future';
      }
      if (date > maxDate) {
        return 'Date must be within 6 months';
      }
      return true;
    }
  }
}
```

### Weekday Validation

```javascript
{
  type: 'datepicker',
  name: 'meeting_date',
  label: 'Meeting Date',
  validation: {
    custom: (value) => {
      const date = new Date(value);
      const day = date.getDay();
      if (day === 0 || day === 6) {
        return 'Please select a weekday';
      }
      return true;
    }
  }
}
```

---

## Events

```javascript
// Date selected
form.on('field:change:start_date', (value) => {
  console.log('Date selected:', value); // "2025-01-15"
});

// Calendar opened
datePicker.on('show', () => {
  console.log('Calendar opened');
});

// Calendar closed
datePicker.on('hide', () => {
  console.log('Calendar closed');
});
```

---

## Styling & Themes

### Custom CSS Variables

The picker uses Bootstrap 5.3 tokens directly — no separate namespace. To customise, override the `--bs-*` variables (or set picker-scoped overrides):

```css
.mojo-date-picker {
  --mojo-cal-radius: 12px;
  --mojo-cal-anchor-fill: var(--bs-primary);
  --mojo-cal-range-fill: rgba(13, 110, 253, 0.10);
}
```

### Dark Theme

Dark theme is automatic — the calendar reads `[data-bs-theme="dark"]` from the document root and adjusts surface, text, range, and tooltip colors. No additional setup required.

---

## Integration Examples

### With Date Range

Use two DatePickers for start/end dates:

```javascript
fields: [
  {
    type: 'datepicker',
    name: 'start_date',
    label: 'Start Date',
    max: formData => formData.end_date // Can't be after end date
  },
  {
    type: 'datepicker',
    name: 'end_date',
    label: 'End Date',
    min: formData => formData.start_date // Can't be before start date
  }
]
```

### Booking System

```javascript
{
  type: 'datepicker',
  name: 'check_in',
  label: 'Check-in',
  min: new Date(),
  disabledDates: bookedDates, // Array of unavailable dates
  inline: true,
  months: 2
}
```

---

## Browser Support

DatePicker works consistently across all modern browsers:
- ✅ Chrome / Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

Unlike native `<input type="date">`, DatePicker provides identical UX everywhere. No runtime CDN dependency.

---

## Related Documentation

- [DateRangePicker.md](./DateRangePicker.md) - Date range selection
- [BasicTypes.md](../BasicTypes.md#date---date-picker) - Native date input
- [FieldTypes.md](../FieldTypes.md) - All field types
- [Validation.md](../Validation.md) - Validation system

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/forms/inputs/DatePicker/DatePickerExample.js`](../../../../examples/portal/examples/forms/inputs/DatePicker/DatePickerExample.js) — Calendar date picker with min/max, inline mode, and custom formats.

<!-- examples:cross-link end -->
