# MetricCard

**Compact at-a-glance KPI card** — a label, a big value, an optional icon and hint, and an optional left-border tone accent. Designed to compose in a row of 3-4 cards for "Overview" sections in record detail views (RuleSetView, IncidentView) and dashboards.

> **When to use MetricCard vs DataView:**
> Use `MetricCard` for a few prominent numbers above the fold ("Status / Incidents / Last fired / Match logic"). Use [`DataView`](DataView.md) for a labeled grid of many fields.

---

## Quick Start

```js
import { MetricCard } from 'web-mojo';

const card = new MetricCard({
    label: 'Incidents (30d)',
    value: 42,
    icon: 'bi-shield-exclamation',
    tone: 'warning',
    hint: '14 minutes ago',
    action: 'view-incidents' // optional — emits via parent's onActionViewIncidents
});

this.addChild(card, { containerId: 'kpi-1' });
```

Compose a row using a Bootstrap grid in the parent template:

```html
<div class="row g-3">
    <div class="col-6 col-md-3" data-container="kpi-status"></div>
    <div class="col-6 col-md-3" data-container="kpi-incidents"></div>
    <div class="col-6 col-md-3" data-container="kpi-last-fired"></div>
    <div class="col-6 col-md-3" data-container="kpi-match"></div>
</div>
```

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `''` | Small uppercase eyebrow above the value |
| `value` | `string\|number\|{text}` | — | The primary metric. `null`/`undefined` renders an em-dash |
| `icon` | `string` | — | Bootstrap Icons class shown next to the label |
| `tone` | `'default'\|'success'\|'warning'\|'danger'\|'info'\|'primary'` | `'default'` | Sets the left-border accent color |
| `hint` | `string` | — | Optional secondary line below the value (e.g. "14 minutes ago") |
| `action` | `string` | — | If set, the root element is a `<button>` with `data-action="<value>"`. Click events bubble through the standard MOJO action pipeline → parent's `onAction<KebabCase>(event, element)` |

Plus standard View options (`containerId`, `className`, `id`, …).

---

## Instance Methods

### `setValue(value)`

Update the displayed value without re-rendering the rest of the card. Useful when the metric is fetched after the card mounts (live counts).

```js
card.setValue(57);
card.setValue({ text: '57 ↑' });
```

### `setHint(hint)`

Add, replace, or remove the hint line. Pass `null`/`''` to remove.

```js
card.setHint('1h ago');
card.setHint(null); // remove
```

---

## Tones

Tones map to Bootstrap CSS variables and apply to the left border only — the rest of the card stays neutral. This keeps a row of cards visually quiet while still letting one or two cards draw the eye.

| Tone | Border color |
|---|---|
| `default` | `var(--bs-border-color)` (no accent) |
| `success` | `var(--bs-success)` |
| `warning` | `var(--bs-warning)` |
| `danger` | `var(--bs-danger)` |
| `info` | `var(--bs-info)` |
| `primary` | `var(--bs-primary)` |

All tones are dark-theme aware automatically.

---

## Click Behavior

When `action` is set, the card renders as a `<button>` and emits its action through MOJO's standard `data-action` pipeline. Handle it on the parent view:

```js
const card = new MetricCard({
    label: 'Incidents',
    value: 42,
    action: 'view-incidents'
});
this.addChild(card, { containerId: 'kpi' });

// On the parent view:
async onActionViewIncidents(event, element) {
    await this.sideNav.showSection('Incidents');
}
```

When `action` is not set, the card is a `<div>` with no hover or focus styles — purely informational.

---

## Common Patterns

### Live count populated after fetch

```js
class OverviewSection extends View {
    async onInit() {
        this.kpi = new MetricCard({ containerId: 'kpi', label: 'Incidents (30d)', value: '—' });
        this.addChild(this.kpi);
    }

    setRecentIncidentCount(count) {
        this.kpi.setValue(count == null ? '—' : count);
        this.kpi.tone = count > 10 ? 'warning' : 'default';
    }
}
```

### Tone derived from value

```js
const card = new MetricCard({
    label: 'Open errors',
    value: errorCount,
    tone: errorCount > 0 ? 'danger' : 'success'
});
```

---

## Notes

- HTML in `label` and `value` is escaped — pass plain strings.
- The card has no internal grid; arrange siblings with the parent's Bootstrap grid (`row g-3` + `col-*`).
- For dense compact layouts, set the parent container's font-size or override `.metric-card-value` in scoped CSS.
