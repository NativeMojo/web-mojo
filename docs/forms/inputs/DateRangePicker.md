# DateRangePicker Component

Select start and end dates in a single, intuitive interface. Perfect for date range filters, booking systems, and report generation.

**Field Type:** `daterange`

---

## Quick Start

```javascript
{
  type: 'daterange',
  name: 'date_range',
  startName: 'start_date',
  endName: 'end_date',
  label: 'Date Range',
  placeholder: 'Select date range...'
}
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Base field name |
| `startName` | string | `name + '_start'` | Start date field name |
| `endName` | string | `name + '_end'` | End date field name |
| `label` | string | - | Field label |
| `startDate` | string/Date | - | Initial start date |
| `endDate` | string/Date | - | Initial end date |
| `min` | string/Date | - | Minimum selectable date |
| `max` | string/Date | - | Maximum selectable date |
| `format` | string | `'YYYY-MM-DD'` | Date storage format |
| `displayFormat` | string | `'MMM DD, YYYY'` | Display format |
| `separator` | string | `' - '` | Separator between dates |
| `outputFormat` | string | `'date'` | Output format: `'date'`, `'string'`, `'object'` |

---

## Usage Examples

### Basic Date Range

```javascript
{
  type: 'daterange',
  startName: 'start_date',
  endName: 'end_date',
  label: 'Report Period',
  placeholder: 'Select start and end dates...'
}
```

### Booking Dates

```javascript
{
  type: 'daterange',
  name: 'booking',
  label: 'Check-in / Check-out',
  min: new Date(), // Future dates only
  displayFormat: 'MMM DD',
  separator: ' → ',
  help: 'Select your stay dates'
}
```

### Last 30 Days

```javascript
{
  type: 'daterange',
  name: 'period',
  label: 'Date Range',
  startDate: (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  })(),
  endDate: new Date().toISOString().split('T')[0]
}
```

---

## Output Formats

### Date Format (default)

```javascript
{
  type: 'daterange',
  name: 'period',
  outputFormat: 'date'
}

// Returns:
{
  start_date: '2025-01-01',
  end_date: '2025-01-31'
}
```

### String Format

```javascript
{
  type: 'daterange',
  name: 'period',
  outputFormat: 'string',
  separator: ' to '
}

// Returns:
{
  period: '2025-01-01 to 2025-01-31'
}
```

### Object Format

```javascript
{
  type: 'daterange',
  name: 'period',
  outputFormat: 'object'
}

// Returns:
{
  period: {
    start: '2025-01-01',
    end: '2025-01-31'
  }
}
```

---

## Validation

```javascript
{
  type: 'daterange',
  name: 'period',
  label: 'Date Range',
  validation: {
    custom: (value) => {
      const start = new Date(value.start);
      const end = new Date(value.end);
      const days = (end - start) / (1000 * 60 * 60 * 24);
      
      if (days > 90) {
        return 'Date range cannot exceed 90 days';
      }
      if (days < 1) {
        return 'End date must be after start date';
      }
      return true;
    }
  }
}
```

---

## Common Patterns

### Filter Form

```javascript
fields: [
  {
    type: 'daterange',
    name: 'date_filter',
    label: 'Date Range',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    colClass: 'col-md-6'
  },
  {
    type: 'select',
    name: 'status',
    label: 'Status',
    options: ['Active', 'Pending', 'Completed'],
    colClass: 'col-md-6'
  }
]
```

### Report Generator

```javascript
{
  type: 'daterange',
  name: 'report_period',
  label: 'Report Period',
  displayFormat: 'MMMM DD, YYYY',
  max: new Date(), // Can't select future dates
  help: 'Select date range for report generation'
}
```

---

## Related Documentation

- [DatePicker.md](./DatePicker.md) - Single date selection
- [FieldTypes.md](../FieldTypes.md) - All field types
- [Validation.md](../Validation.md) - Validation system
