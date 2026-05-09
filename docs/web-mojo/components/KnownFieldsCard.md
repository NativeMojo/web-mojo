# KnownFieldsCard

**Promote known JSON keys, keep the raw blob accessible.** Many records carry blob-shaped JSON fields — `metadata`, `ip_info`, `device_info`, `payload`, `og_metadata` — that contain a few keys the framework knows about plus an open-ended bag of extras. The Detail / Metadata sections of admin views typically want to:

1. Promote the known keys to a clean 2-column label/value layout.
2. Keep the raw JSON accessible but visually subordinated.

That's the pattern this primitive captures. Built on the existing `.detail-flat-row` family for the known-keys grid and a native `<details>` element for the collapsible raw blob.

```
┌──────────────────────────────────────────────┐
│ Created by      ian@example.com              │
│ Reasoning       brute-force from same /24    │
│ Last resolved   2026-04-21 11:42             │
│                                              │
│ ▶ Raw metadata                               │
└──────────────────────────────────────────────┘
```

---

## Quick Start

```js
import KnownFieldsCard from 'web-mojo/KnownFieldsCard';

const card = new KnownFieldsCard({
    data: model.get('metadata') || {},
    knownKeys: [
        { key: 'created_by',     label: 'Created by' },
        { key: 'last_resolved',  label: 'Resolved',     formatter: 'datetime' },
        { key: 'reasoning',      label: 'Reasoning'  },
        { key: 'agent_prompt',   label: 'Agent prompt',
          formatter: (v) => `<code>${v}</code>` }
    ],
    rawLabel: 'Raw metadata'
});
parent.addChild(card, { containerId: 'metadata-card' });
```

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `data` | `object \| (model) => object` | `{}` | The JSON blob to promote and dump. |
| `knownKeys` | `Array \| (model) => Array` | `[]` | Promoted keys, in display order. Each entry: `{ key, label, formatter?, hideEmpty? }`. |
| `rawCollapsed` | `boolean` | `true` | Whether the raw `<details>` block starts collapsed. |
| `rawLabel` | `string` | `'Raw JSON'` | Summary text on the raw block. Customize per use (`'Raw metadata'`, `'Raw payload'`, etc.). |
| `showRaw` | `boolean` | `true` | Set `false` to omit the raw block entirely (when callers handle it themselves). |
| `emptyText` | `string` | `'No data.'` | Fallback shown when both `data` and `knownKeys` are empty. |
| `model` | `Model` | — | Standard `View.model`. Required when `data` or `knownKeys` is a function. |

### Known-key spec

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Lookup key on `data`. Supports dotted paths (`os.family`, `user_agent.major`) for nested objects. |
| `label` | `string` | Row label. Falls back to the `key` itself when omitted. Escaped. |
| `formatter` | `string \| function` | Optional formatting. **String** values look up a `DataFormatter` pipe by name (`'datetime'`, `'relative'`, `'filesize'`, `'phone'`, etc.) and the result is rendered as **trusted HTML**. **Function** values receive `(value, key, data)` and must return a string (also trusted HTML). When omitted, the value is escaped via `String(value)`. |
| `hideEmpty` | `boolean` | When `true`, omit the row entirely when the value is null/undefined/''. Default `false` — the row renders with a muted "—" placeholder so the grid stays consistent. |

---

## Common Patterns

### Incident metadata

```js
const card = new KnownFieldsCard({
    data: model.get('metadata') || {},
    knownKeys: [
        { key: 'created_by',    label: 'Created by' },
        { key: 'reasoning',     label: 'Reasoning' },
        { key: 'last_resolved', label: 'Last resolved', formatter: 'datetime' },
        { key: 'agent_prompt',  label: 'Agent prompt',
          formatter: (v) => `<code class="text-secondary">${escapeHtml(v).slice(0, 120)}…</code>` },
        { key: 'do_not_delete', label: 'Protected',     formatter: 'yesnoicon', hideEmpty: true }
    ],
    rawLabel: 'Raw metadata'
});
```

### Device info (nested keys)

```js
const card = new KnownFieldsCard({
    data: model.get('device_info') || {},
    knownKeys: [
        { key: 'user_agent.family', label: 'Browser' },
        { key: 'user_agent.major',  label: 'Browser version' },
        { key: 'os.family',         label: 'OS' },
        { key: 'device.brand',      label: 'Device brand', hideEmpty: true },
        { key: 'device.family',     label: 'Device' }
    ],
    rawLabel: 'Raw device payload'
});
```

### IP intel

```js
const card = new KnownFieldsCard({
    data: model.get('ip_info') || {},
    knownKeys: [
        { key: 'country', label: 'Country' },
        { key: 'region',  label: 'Region' },
        { key: 'city',    label: 'City' },
        { key: 'asn',     label: 'ASN',     formatter: (v) => `<code>${v}</code>` },
        { key: 'isp',     label: 'ISP' },
        { key: 'is_vpn',  label: 'VPN',     formatter: 'yesnoicon', hideEmpty: true }
    ],
    rawLabel: 'Raw IP intel'
});
```

---

## Notes

- The CSS lives in [`src/core/css/core.css`](../../src/core/css/core.css) under `KnownFieldsCard` (the raw-block styling) and the `Flat labeled-section primitives` block (the known-keys grid).
- Function-valued formatters receive the original (unescaped) value — escape it yourself if you're interpolating into HTML. String formatters delegate to `DataFormatter`, which knows the right escape rules per pipe.
- The raw `<details>` block uses native HTML for collapse — no JS, fully accessible, works without keyboard listeners.
- Empty data + empty `knownKeys` renders the `emptyText` placeholder and skips the raw block. Empty data with non-empty `knownKeys` still renders the placeholder rows ("—"), which is usually what you want for a stable layout.
- Set `showRaw: false` when the parent view already shows raw JSON elsewhere (e.g. a dedicated "Detail" subsection).

---

## Related Documentation

- [DetailView](DetailView.md) — the record-viewer layout that hosts KnownFieldsCard
- [DataFormatter](../core/DataFormatter.md) — the 80+ pipe formatters string-mode `formatter` looks up
- [StatusPanel](StatusPanel.md) — hero-state primitive for "what state is this in"
- [Timeline](Timeline.md) — vertical event-feed for "what happened over time"
