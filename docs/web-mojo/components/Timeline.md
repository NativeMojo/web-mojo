# Timeline

**Vertical event-feed primitive.** A list with a hairline connector and tone-colored dots — the standard "this happened, then this, then this" layout for incident history, job lifecycle events, recent activity in user/group overviews, and audit trails.

```
┌──────────────────────────────────────────────────┐
│ ●  Headline line                       4m ago    │
│ │  Optional supporting detail                    │
│                                                  │
│ ●  Headline line                       1h ago    │
│ │  Detail line                                   │
└──────────────────────────────────────────────────┘
```

---

## Quick Start

```js
import Timeline from 'web-mojo/Timeline';

const tl = new Timeline({
    items: [
        { tone: 'success', headline: 'Started',  detail: 'on runner-7',  when: '2h ago' },
        { tone: 'danger',  headline: 'Failed',   detail: '<code>EHOSTUNREACH</code>', when: '1h ago' },
        { tone: 'info',    headline: 'Retried',                          when: '12m ago' }
    ]
});
parent.addChild(tl, { containerId: 'lifecycle' });
```

`items` may be a static array OR a function of `model`:

```js
const tl = new Timeline({
    model,
    items: (m) => m.getEvents().map(ev => ({
        tone:     EVENT_TONE[ev.event] || 'default',
        headline: ev.label || ev.event,
        detail:   ev.details || '',
        when:     formatRelative(ev.at)
    }))
});
```

When function-valued, `items` re-resolves on every `render()` so the feed reflects the latest model state.

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `items` | `Array \| (model) => Array` | `[]` | Entries to render. Each entry is `{ headline, detail?, when?, tone? }`. Falsy entries are filtered. |
| `emptyText` | `string` | `'No events yet.'` | Muted fallback shown when `items` is empty. |
| `limit` | `number` | `null` | Optional max number of entries rendered. Useful for "Recent activity" cards that should show the latest N only. |
| `model` | `Model` | — | Standard `View.model`. Required when `items` is a function. |

### Item shape

| Field | Type | Description |
|---|---|---|
| `headline` | `string` | Primary line (escaped). |
| `detail` | `string` | Optional secondary line. **Trusted HTML** — caller is in source code. Use for inline `<code>`, `<a>`, `<strong>`, etc. |
| `when` | `string` | Optional right-aligned timestamp / relative-time label (escaped, monospace). |
| `tone` | `string` | One of `default`, `primary`, `success`, `info`, `warning`, `danger`, `secondary`. Tints only the dot — the rest of the row stays neutral. |

The `label` field is also accepted as a fallback for `headline` when porting from existing `recent_events`-style data.

---

## Instance Methods

### `setItems(items)`

Replace the items source and re-render. Accepts the same shape as the constructor's `items` option (array or function). Returns the render `Promise` for awaiting.

```js
events.on('change', () => this.tl.setItems(events.getEntries()));
```

---

## Common Patterns

### Inside a Job Lifecycle card

```js
import Timeline from 'web-mojo/Timeline';

class JobLifecycleCard extends View {
    template = `
        <div class="card">
            <div class="card-body">
                <div class="card-title"><i class="bi bi-list-ul"></i>Lifecycle</div>
                <div data-container="lifecycle"></div>
            </div>
        </div>
    `;

    onInit() {
        this.timeline = new Timeline({
            containerId: 'lifecycle',
            model: this.model,
            limit: 8,
            items: (m) => (m.getEvents() || []).map(ev => ({
                tone:     EVENT_TONE[(ev.event || '').toLowerCase()] || 'default',
                headline: ev.label || ev.event || 'event',
                detail:   ev.details
                    ? (typeof ev.details === 'string' ? ev.details : `<code>${escapeHtml(JSON.stringify(ev.details))}</code>`)
                    : '',
                when:     formatRelative(ev.at)
            }))
        });
        this.addChild(this.timeline);
    }
}
```

### Recent activity in an Overview

```js
const tl = new Timeline({
    model,
    limit: 5,
    emptyText: 'No recent activity.',
    items: (m) => (m.get('recent_audit') || []).map(row => ({
        tone:     row.severity === 'error' ? 'danger' : 'info',
        headline: row.message,
        when:     formatRelative(row.created)
    }))
});
```

### Data-formatter pipes inside detail

The Timeline's `detail` field is trusted HTML, so DataFormatter pipes (which sometimes return HTML) compose nicely:

```js
items: (m) => m.get('changes').map(c => ({
    headline: `${c.user} changed ${c.field}`,
    detail:   `from <code>${escapeHtml(c.from)}</code> to <code>${escapeHtml(c.to)}</code>`,
    when:     formatRelative(c.at)
}))
```

---

## Notes

- The CSS lives in [`src/core/css/core.css`](../../src/core/css/core.css) under `Timeline`. Do not duplicate the rules in admin.css or component-specific stylesheets — they're framework-wide.
- `detail` is rendered as **trusted HTML**; `headline`, `when`, and `emptyText` are escaped automatically. Don't pass user-provided strings into `detail` without your own escaping.
- The dot-only tone styling keeps a long timeline readable — heavy row tinting would compete with the headline text. If you need a more emphatic state read-out for a single record, use [`StatusPanel`](StatusPanel.md) instead.
- Empty timelines render as a single `<li class="detail-timeline-empty">` rather than the bare `<ol>` so the rail's vertical hairline still draws — visual consistency with populated timelines.

---

## Related Documentation

- [DetailView](DetailView.md) — the record-viewer layout that hosts Timeline
- [StatusPanel](StatusPanel.md) — the hero-state primitive that often pairs with Timeline in Overview rows
- [DataFormatter](../core/DataFormatter.md) — `relative`, `datetime`, etc. for formatting `when` values
