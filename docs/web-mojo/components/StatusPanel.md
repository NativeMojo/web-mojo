# StatusPanel

**Hero "current state" panel for record-detail views.** The big colored panel that opens an Overview section with a dot+state read-out, a primary headline, a secondary meta line, and a row of action buttons.

Pair with [`DetailView`](DetailView.md) — typical use is as the first child of an Overview section, answering the operator's first question: *"What state is this in and what do I do next?"*

```
┌───────────────────────────────────────────────────────────┐
│  ● State label                       [ primary ] [ alt ]  │
│  Headline line                                            │
│  Optional supporting meta line · with <code>fragments</code>
└───────────────────────────────────────────────────────────┘
```

---

## Quick Start

```js
import StatusPanel from 'web-mojo/StatusPanel';

const panel = new StatusPanel({
    model,
    tone:     'danger',
    state:    'Failed',
    headline: 'Failed after 38s',
    meta:     'Attempt <strong>2</strong> of <strong>3</strong> · retry available',
    actions: [
        { label: 'Retry now', action: 'retry-job',  icon: 'bi-arrow-clockwise', variant: 'primary' },
        { label: 'Cancel',    action: 'cancel-job', variant: 'outline-danger' }
    ]
});
parent.addChild(panel, { containerId: 'status' });
```

Action buttons render with `data-action="<action>"` — handlers live on whichever ancestor wants to react (typically the parent section view or the containing `DetailView` subclass), via the standard MOJO action pipeline.

---

## State-driven panels (function-valued options)

Every option may be a static value **or** a function of `model`. State changes that flip tone, headline, or available actions show up correctly on the next render.

```js
const panel = new StatusPanel({
    model,
    tone:     m => m.get('status') === 'failed' ? 'danger' : 'info',
    state:    m => m.get('status'),
    headline: m => `On ${m.get('runner_id') || '—'}`,
    meta:     m => `Attempt <strong>${m.get('attempt')}</strong> of <strong>${m.get('max_retries')}</strong>`,
    actions:  m => [
        m.canRetry?.()  && { label: 'Retry now', action: 'retry-job',  icon: 'bi-arrow-clockwise', variant: 'primary' },
        m.canCancel?.() && { label: 'Cancel',    action: 'cancel-job', variant: 'outline-danger' }
    ].filter(Boolean)
});
```

When the model fires a `change` event the parent `DetailView` re-renders the header automatically — call `panel.render()` from the section view if the StatusPanel sits inside an Overview that doesn't otherwise re-render on `change`.

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `model` | `Model` | required for function-valued options | Standard `View.model` — the panel reads it via `get()`. |
| `tone` | `string \| (model) => string` | `'default'` | One of `default`, `primary`, `success`, `info`, `warning`, `danger`, `secondary`. Tints the background + border with the matching Bootstrap semantic color. |
| `state` | `string \| (model) => string` | `''` | Short uppercase eyebrow above the headline (e.g. `Active`, `Running`, `Failed`). Renders to the left of the dot/icon. |
| `headline` | `string \| (model) => string` | `''` | Primary descriptor line — the dominant text in the panel. |
| `meta` | `string \| (model) => string` | `''` | Secondary supporting line. **Trusted HTML** — caller is in source code, not user input. Use this for inline `<code>` fragments, `<strong>`, etc. |
| `icon` | `string \| (model) => string` | `null` | Optional Bootstrap Icons class. When set, replaces the default `.detail-status-dot` left of the state label. |
| `actions` | `Array \| (model) => Array` | `[]` | List of `{ label, action, icon?, variant? }` button configs. `variant` defaults to `primary`; pass `outline-secondary`, `outline-danger`, etc. for ghost styles. Falsy entries are filtered, so `m.canRetry?.() && { … }` works as a one-liner. |

### Action button shape

```js
{
    label: 'Retry now',         // visible button text (escaped)
    action: 'retry-job',        // becomes data-action; handler runs on an ancestor
    icon:   'bi-arrow-clockwise', // optional Bootstrap Icons class
    variant: 'primary'          // 'primary' | 'outline-secondary' | 'outline-danger' | …
}
```

The `action` becomes the button's `data-action` attribute and bubbles via the standard MOJO event delegation. The StatusPanel itself doesn't handle action clicks — define `onActionRetryJob(event, el)` on whatever ancestor view should react.

---

## Tones

| Tone | Background | State eyebrow color | Use for |
|---|---|---|---|
| `default` | `--bs-tertiary-bg` | `--bs-secondary-color` | Neutral / unknown state. |
| `primary` | `--bs-primary` tint | `--bs-primary` | Brand-affirmative state (e.g. configured, ready). |
| `success` | `--bs-success` tint | `--bs-success` | Completed / healthy. |
| `info` | `--bs-info` tint | `--bs-info` | In-progress / informational. |
| `warning` | `--bs-warning` tint | `--bs-warning` | Scheduled / degraded / attention. |
| `danger` | `--bs-danger` tint | `--bs-danger` | Failed / firing / critical. |
| `secondary` | `--bs-secondary` light tint | `--bs-secondary` | Inactive / cancelled. |

All tones use Bootstrap CSS variables, so dark theme works automatically — see [`.claude/rules/theming.md`](../../.claude/rules/theming.md).

---

## Common Patterns

### Inside a Job overview

```js
import StatusPanel from 'web-mojo/StatusPanel';

class JobOverviewSection extends View {
    template = `
        <div data-container="job-status"></div>
        <div class="detail-kpi-grid">…</div>
    `;

    onInit() {
        this.statusPanel = new StatusPanel({
            containerId: 'job-status',
            model: this.model,
            tone:     m => m.get('status') === 'failed' ? 'danger' : 'info',
            state:    m => m.get('status'),
            headline: m => m.getNarrative(),
            actions:  m => [
                m.canRetry?.()  && { label: 'Retry now', action: 'retry-job', variant: 'primary' },
                m.canCancel?.() && { label: 'Cancel',    action: 'cancel-job', variant: 'outline-danger' }
            ].filter(Boolean)
        });
        this.addChild(this.statusPanel);
    }
}
```

The parent `DetailView` subclass handles `onActionRetryJob` and `onActionCancelJob` — clean separation between presentation (StatusPanel) and policy (parent).

### Scheduled vs running narratives

For records with multiple lifecycle states, compute the narrative server-side or in a Model method:

```js
class Job extends Model {
    getNarrative() {
        if (this.isScheduled()) return `Runs ${formatRelative(this.get('run_at'))}`;
        if (this.get('status') === 'running') return `Running on ${this.get('runner_id')}`;
        // …
    }
}
```

Then pass `headline: m => m.getNarrative()` — keeps the StatusPanel template-free.

---

## Notes

- The CSS lives in [`src/core/css/core.css`](../../src/core/css/core.css) under `StatusPanel`. Do not duplicate the rules in admin.css or component-specific stylesheets — they're framework-wide.
- The `meta` option is rendered as **trusted HTML** because callers commonly want to interpolate `<code>` and `<strong>` for keys/values. Don't pass user-provided content through unfiltered. `state`, `headline`, and action `label` are escaped automatically.
- StatusPanel has no built-in fetching — it reads the model you give it. Re-render via `panel.render()` after `model.set(...)` if the surrounding view doesn't already re-render on `model:change`.

---

## Related Documentation

- [DetailView](DetailView.md) — the record-viewer layout that hosts StatusPanel
- [MetricCard](MetricCard.md) — the KPI tile primitive that pairs with StatusPanel in Overview rows
- [Templates](../core/Templates.md) — Mustache + DataFormatter pipes (handy for computing `headline` / `meta`)
