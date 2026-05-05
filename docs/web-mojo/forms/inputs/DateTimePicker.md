# DateTimePicker Component

Combined date + time picker in a single popover. Calendar on the left,
HH:MM stepper on the right, optional IANA timezone stacked below the time
strip. Single field type — the timezone is part of the picker via the
`timezone` option, not a separate field.

**Field Type:** `datetimepicker`

---

## Quick Start

```javascript
{
  type: 'datetimepicker',
  name: 'event_at',
  label: 'Event date & time',
  value: '2026-05-04 14:30'
}
```

```javascript
// 12-hour with timezone
{
  type: 'datetimepicker',
  name: 'meeting',
  label: 'Meeting',
  timeFormat: '12h',
  timezone: true,
  value: '2026-05-04 09:30'
}
```

---

## Storage Format

The default is **ISO 8601** — a single string that backends already
understand and JSON serializes natively.

| Configuration | Stored value |
|---|---|
| default, no timezone | `'2026-05-04T14:30:00'` |
| `timezone: true` (default `outputFormat: 'iso'`) | `'2026-05-04T14:30:00-07:00'` |
| `outputFormat: 'iana'` (legacy) | `'2026-05-04 14:30 America/Los_Angeles'` |
| `outputFormat: 'object'` | `{ date, time, timezone? }` |

Time is 24h canonical `HH:MM`. The `timeFormat` option only affects display,
not storage. Use `'iana'` only when the consumer needs the zone name
preserved (e.g. cross-DST scheduling rules that depend on the city, not
the offset).

If a user selects a date but no time, the time defaults to `00:00`.

---

## Configuration Options

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Field name |
| `label` | string | – | Field label |
| `value` | string \| object | – | Initial value |
| `displayFormat` | string | `'MMM DD, YYYY'` | Date display format |
| `timeFormat` | `'24h'` \| `'12h'` | `'24h'` | Time display format |
| `timeStep` | number | `1` | Minute increment for stepper |
| `min` | string | – | Earliest selectable date (`YYYY-MM-DD`) |
| `max` | string | – | Latest selectable date (`YYYY-MM-DD`) |
| `placeholder` | string | `'Pick date & time...'` | Placeholder text |
| `disabled` | boolean | `false` | Disable the picker |
| `readonly` | boolean | `false` | Read-only mode |
| `required` | boolean | `false` | Mark as required |
| `disabledDates` | string[] | `[]` | Dates to disable in the calendar |
| `firstDay` | number | `1` | Week start day (0=Sun, 1=Mon) |
| `lang` | string | `'en-US'` | Locale for month/weekday names |

### Timezone Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timezone` | boolean \| string[] | `false` | Enable the IANA timezone combobox |
| `timezones` | string[] | – | Fixed list of zones to show |
| `outputFormat` | `'iso'` \| `'iana'` \| `'object'` | `'iso'` | How `getFormValue()` returns the value. `'iso'` (default) → ISO 8601 with offset. `'iana'` (legacy) → space-separated with IANA zone name. `'object'` → `{ date, time, timezone? }`. |

---

## Public API

```javascript
const dtp = formView.getCustomComponent('event_at');

dtp.getValue();
// '2026-05-04T14:30:00-07:00' (default ISO with offset)
// '2026-05-04 14:30 America/Los_Angeles' (outputFormat: 'iana')
// { date, time, timezone? } (outputFormat: 'object')

dtp.setValue('2026-06-15 09:30');
dtp.getFormattedValue();   // displayFormat-rendered string
dtp.clear();
dtp.setMin('2026-01-01');
dtp.setMax('2026-12-31');

dtp.on('change', (data) => {
  console.log(data.value, data.formatted, data.oldValue);
});
```

---

## Layout

The popover lays out as a horizontal flex row at desktop widths:

```
┌──────────────┬───────────────┐
│   Calendar   │   Time spinner│
│              │ ▲    :    ▲   │
│              │ 14        30  │
│              │ ▼         ▼   │
│              │ HOUR    MIN   │
│              │  AM   PM      │  (12h only)
│              ├───────────────┤
│              │ Timezone combo│  (when timezone: true)
└──────────────┴───────────────┘
        Now                Done
```

Below 640px the row wraps vertically — the time strip stacks under the
calendar. The popover portal-mounts to `document.body` so it escapes
clipping containers (modals, overflow:hidden tables).

---

## Theming

All styling uses Bootstrap 5.3 surface tokens. Renders correctly under both
`[data-bs-theme="light"]` and `[data-bs-theme="dark"]` from day one.

---

## Related

- [DatePicker](./DatePicker.md) — single-value date picker (day / month / year)
- [DateRangePicker](./DateRangePicker.md) — date ranges
- [TimePicker](./TimePicker.md) — standalone time picker
