# DateRangePicker Component

Select a start/end range at day, month, or year precision. Built on the same in-house `Calendar` engine as `DatePicker`. Defaults to a two-month side-by-side day-grid; supports a Stripe-style preset sidebar; cross-page anchor persistence so the user can pick start in May and end in June without losing the start cell off-screen.

**Field Types:** `daterange` (default day precision), `monthrange` (precision: 'month'), `yearrange` (precision: 'year')

---

## Quick Start

```javascript
// Day-precision range, two-month layout (default)
{
  type: 'daterange',
  name: 'date_range',
  startName: 'start_date',
  endName: 'end_date',
  label: 'Date Range',
}

// With Stripe-style presets sidebar
{
  type: 'daterange',
  name: 'period',
  label: 'Reporting period',
  presets: 'default',   // Today, Last 7 days, Last 30 days, This month, etc.
}

// Month-precision range — stores YYYY-MM
{
  type: 'monthrange',
  name: 'period',
  label: 'Period',
  presets: 'default',   // YTD, Last 12 months, etc.
}

// Year-precision range
{
  type: 'yearrange',
  name: 'years',
  label: 'Years',
}
```

## Precision

`precision: 'year' | 'month' | 'day'` (default `'day'`) controls the resolution of the range.

| Precision | Stored values | Default display | Field-type alias |
|---|---|---|---|
| `day` | `YYYY-MM-DD` × 2 | `MMM DD, YYYY` | `daterange` |
| `month` | `YYYY-MM` × 2 | `MMM YYYY` | `monthrange` |
| `year` | `YYYY` × 2 | `YYYY` | `yearrange` |

## Cross-page anchor persistence

When the user clicks a start anchor and then pages forward (or backward) with the calendar arrows or PageUp/PageDown, the anchor is remembered. They can commit the end cell on a different page; hover preview tints visible cells up to the cursor even when the anchor is off-screen, and the "N days / months / years" tooltip updates against the persisted anchor. Backwards selection (later cell first, then earlier) auto-swaps on commit.

## Presets

Set `presets: 'default'` (or `true`) to render a precision-appropriate sidebar with quick ranges:

- **Day:** Today, Yesterday, Last 7 days, Last 30 days, Last 90 days, This month, Last month, This year
- **Month:** This month, Last month, Last 3 months, Last 6 months, YTD, Last 12 months
- **Year:** This year, Last year, Last 3 years, Last 5 years, Last 10 years

Or supply a custom array:

```javascript
{
  type: 'daterange',
  presets: [
    { label: 'Today', range: () => { const t = new Date(); return { start: t, end: t }; } },
    { label: 'My custom range', range: () => ({ start: '2025-01-01', end: '2025-12-31' }) },
  ]
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

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/forms/inputs/DateRangePicker/DateRangePickerExample.js`](../../../../examples/portal/examples/forms/inputs/DateRangePicker/DateRangePickerExample.js) — Start/end date range in a single combined picker.

<!-- examples:cross-link end -->
