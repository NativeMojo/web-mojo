# TimePicker Component

In-house HH:MM time picker built on the Calendar engine's popover wrapper.
Stepper-style hour and minute columns with direct numeric typing, optional
12h/24h display, and an optional IANA timezone selector.

**Field Type:** `timepicker`

---

## Quick Start

```javascript
{
  type: 'timepicker',
  name: 'meeting_time',
  label: 'Meeting time',
  value: '14:30'
}
```

```javascript
// 12-hour display with timezone
{
  type: 'timepicker',
  name: 'meeting_time',
  label: 'Meeting time',
  format: '12h',
  timezone: true,
  value: '09:00'
}
```

---

## Storage Format

Time is **always stored as 24h canonical `HH:MM`** regardless of `format`. The
display format only changes what the user sees in the trigger.

| Configuration | Stored value | Trigger displays |
|---|---|---|
| default | `'14:30'` | `14:30` |
| `format: '12h'` | `'14:30'` | `2:30 PM` |
| `timezone: true` (default `outputFormat: 'iso'`) | `'14:30-07:00'` | `2:30 PM America/Los_Angeles` |
| `timezone: true`, `outputFormat: 'iana'` (legacy) | `'14:30 America/Los_Angeles'` | (same as above) |
| `timezone: true`, `outputFormat: 'object'` | `{ time: '14:30', timezone: 'America/Los_Angeles' }` | (same as above) |

**ISO output is the default and recommended for backend interop** — it gives
you a single string with an unambiguous UTC offset that JSON / Postgres /
most ORMs already understand. Use `'iana'` only when the consumer needs the
zone name preserved (e.g. for display rules that depend on city names rather
than offsets), and `'object'` when you want both the time and the IANA zone
on separate fields.

---

## Configuration Options

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Field name |
| `label` | string | – | Field label |
| `value` | string \| `{time, timezone}` | – | Initial value |
| `format` | `'24h'` \| `'12h'` | `'24h'` | Display format |
| `step` | number | `1` | Minute increment for stepper |
| `min` | string | – | Minimum time (`'HH:MM'`) |
| `max` | string | – | Maximum time (`'HH:MM'`) |
| `placeholder` | string | auto | Placeholder text |
| `disabled` | boolean | `false` | Disable the picker |
| `readonly` | boolean | `false` | Read-only mode |
| `required` | boolean | `false` | Mark as required |
| `help` | string | – | Helper text under the field |

### Timezone Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timezone` | boolean \| string[] | `false` | `true` enables the IANA combobox; an array supplies a fixed list |
| `timezones` | string[] | – | Same as passing an array to `timezone` |
| `outputFormat` | `'iso'` \| `'iana'` \| `'object'` | `'iso'` | How `getFormValue()` returns the value when timezone is enabled. `'iso'` (default) → `'HH:MM±HH:MM'`. `'iana'` (legacy) → `'HH:MM IANA/Zone'`. `'object'` → `{ time, timezone }`. |

When `timezone: true`, the IANA combobox renders below the time stepper inside
the popover. The default selected zone is the user's local zone via
`Intl.DateTimeFormat().resolvedOptions().timeZone`.

---

## Stepper Interaction

- **Up/Down arrows** on the stepper buttons or the value field
- **Click the value** to type directly (numbers only)
- **Tab** moves between hour → minute → AM/PM (12h)
- **Enter** commits typed input
- **Now** button sets the current local time
- **Set** button closes the popover with the current value

The minute stepper honors the `step` option (e.g. `step: 15` increments by
15 minutes). Direct numeric typing is allowed at any granularity.

---

## Public API

```javascript
const tp = formView.getCustomComponent('meeting_time');

tp.getValue();          // '14:30' / '14:30-07:00' / { time, timezone } per outputFormat
tp.setValue('09:00');
tp.getFormattedValue(); // display-format string
tp.clear();
tp.setMin('09:00');
tp.setMax('17:00');
tp.setEnabled(true);
tp.setReadonly(false);
tp.focus();
tp.show();              // open popover
tp.hide();              // close popover

tp.on('change', (data) => {
  console.log(data.value, data.formatted, data.oldValue);
});
```

---

## Theming

All styling uses Bootstrap 5.3 surface tokens
(`var(--bs-tertiary-bg)`, `var(--bs-border-color)`, etc.) and renders
correctly under both `data-bs-theme="light"` and `[data-bs-theme="dark"]` from
day one. The popover portal-mounts to `document.body`, so it escapes
clipping containers like modals and overflow:hidden tables.

---

## Related

- [DatePicker](./DatePicker.md) — single-value date picker (day / month / year)
- [DateRangePicker](./DateRangePicker.md) — date ranges
- [DateTimePicker](./DateTimePicker.md) — combined date + time + timezone
