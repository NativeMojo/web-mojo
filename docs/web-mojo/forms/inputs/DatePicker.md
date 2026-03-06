# DatePicker Component

Enhanced date selection component powered by [Easepick](https://easepick.com/). Provides a consistent, feature-rich date picker across all browsers.

**Field Type:** `datepicker`

---

## Quick Start

```javascript
{
  type: 'datepicker',
  name: 'start_date',
  label: 'Start Date',
  format: 'YYYY-MM-DD',
  placeholder: 'Select a date...'
}
```

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

```css
:root {
  --easepick-primary-color: #007bff;
  --easepick-secondary-color: #6c757d;
  --easepick-border-color: #dee2e6;
  --easepick-border-radius: 0.375rem;
}
```

### Dark Theme

```css
[data-bs-theme="dark"] {
  --easepick-primary-color: #0d6efd;
  --easepick-bg-color: #212529;
  --easepick-text-color: #f8f9fa;
}
```

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

DatePicker works consistently across all browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

Unlike native `<input type="date">`, DatePicker provides identical UX everywhere.

---

## Related Documentation

- [DateRangePicker.md](./DateRangePicker.md) - Date range selection
- [BasicTypes.md](../BasicTypes.md#date---date-picker) - Native date input
- [FieldTypes.md](../FieldTypes.md) - All field types
- [Validation.md](../Validation.md) - Validation system
