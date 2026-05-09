# FlowStrip

**Horizontal "STEP 1 → STEP 2 → STEP 3" flow primitive.** Used for records that describe a process — RuleSet triggering (Match → Bundle → Threshold → Re-trigger), incident triage flow, anywhere a sequence of stages reads better as a left-to-right strip than a flat field list.

```
┌──────────┬──────────┬──────────┬──────────┐
│ STEP 1   │ STEP 2   │ STEP 3   │ STEP 4   │
│ Match    │ Bundle   │ Threshold│ Re-trigger│
│ value    │ value    │ value    │ value    │
│ hint     │ hint     │ hint     │ hint     │
└──────────┴──────────┴──────────┴──────────┘
```

Cells are separated by chevron arrows in the desktop layout. The strip wraps to 2 columns on tablet and 1 on mobile.

---

## Quick Start

```js
import FlowStrip from 'web-mojo/FlowStrip';

const flow = new FlowStrip({
    steps: [
        {
            num: 'STEP 1',
            title: 'Match',
            value: '<code>category=auth.failed</code>',
            hint:  'Each condition under "Conditions" must match the event for the rule to apply.',
            action: 'edit-step',
            actionData: { tab: 'general' }
        },
        {
            num: 'STEP 2',
            title: 'Bundle',
            value: 'No bundling',
            hint:  'Each event becomes its own incident.'
        },
        {
            num: 'STEP 3',
            title: 'Threshold',
            value: 'Fires immediately',
            empty: true,
            hint:  'Handler chain runs as soon as the first matching event arrives.'
        }
    ]
});
parent.addChild(flow, { containerId: 'triggering-flow' });
```

---

## State-driven flows (function-valued steps)

`steps` accepts a static array OR a function of `model`. State changes that flip values, hints, or the empty modifier show up correctly on re-render.

```js
const flow = new FlowStrip({
    model,
    steps: (m) => [
        {
            num: 'STEP 3',
            title: 'Threshold',
            value: m.get('trigger_count')
                ? `After <strong>${m.get('trigger_count')}</strong> events`
                : 'Fires immediately',
            empty: !m.get('trigger_count'),
            hint:  m.get('trigger_window') == null
                ? 'No time window — events accumulate indefinitely.'
                : `Counted within <strong>${m.get('trigger_window')}</strong> minutes.`,
            action: 'edit-step',
            actionData: { tab: 'thresholds' }
        }
    ]
});
```

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `steps` | `Array \| (model) => Array` | `[]` | List of step entries. Falsy entries filtered. |
| `model` | `Model` | — | Standard `View.model`. Required when `steps` is a function. |

### Step shape

| Field | Type | Description |
|---|---|---|
| `num` | `string` | Small uppercase eyebrow ("STEP 1", "TRIGGER", "PHASE A", …). Falls back to `STEP {N+1}` when omitted. Escaped. |
| `title` | `string` | Step heading. Escaped. |
| `value` | `string` | Primary value line. **Trusted HTML** — caller is in source code; pass `<code>`, `<strong>`, etc. as desired. |
| `hint` | `string` | Optional small descriptor below the value. **Trusted HTML.** Omitting the field hides the row. |
| `empty` | `boolean` | When `true`, value renders with the `.flow-strip-empty` muted-italic style. Use for "Fires immediately" / "No bundling" / "Fire once only" sentinels that mean "this stage isn't configured" without it being an error. |
| `action` | `string` | Optional `data-action` for an inline pencil button to the right of the title. Bubbles via the standard MOJO action pipeline. |
| `actionIcon` | `string` | Override the default `bi-pencil` icon class. |
| `actionData` | `object` | Extra `data-*` attributes attached to the pencil button. Keys become `data-<key>` after lowercasing. Common use: `{ tab: 'thresholds' }` for routing the edit form to a specific tab. |

---

## Instance Methods

### `setSteps(steps)`

Replace the steps source and re-render. Accepts the same shape as the constructor's `steps` option (array or function). Returns the render `Promise`.

---

## Common Patterns

### RuleSetView triggering flow

```js
class RuleSetTriggeringSection extends View {
    template = `<div data-container="flow"></div>`;

    onInit() {
        this.flow = new FlowStrip({
            containerId: 'flow',
            model: this.model,
            steps: (m) => [
                { num: 'STEP 1', title: 'Match',
                  value: matchByLabel(m.get('match_by')),
                  hint:  'Each condition under "Conditions" must match the event.',
                  action: 'edit-step', actionData: { tab: 'general' } },

                { num: 'STEP 2', title: 'Bundle',
                  value: bundleLabel(m),
                  hint:  m.get('bundle_by') === 0
                      ? 'Each event becomes its own incident.'
                      : `Group events from the same source.`,
                  action: 'edit-step', actionData: { tab: 'bundling' } },

                { num: 'STEP 3', title: 'Threshold',
                  value: m.get('trigger_count')
                      ? `After <strong>${m.get('trigger_count')}</strong> events`
                      : 'Fires immediately',
                  empty: !m.get('trigger_count'),
                  hint:  thresholdHint(m),
                  action: 'edit-step', actionData: { tab: 'thresholds' } },

                { num: 'STEP 4', title: 'Re-trigger',
                  value: m.get('retrigger_every') == null
                      ? 'Fire once only'
                      : `Every <strong>${m.get('retrigger_every')}</strong> events`,
                  empty: m.get('retrigger_every') == null,
                  hint:  m.get('retrigger_every') == null
                      ? 'Handler runs once when the threshold is crossed.'
                      : 'Re-fires the handler chain after every N additional events.',
                  action: 'edit-step', actionData: { tab: 'thresholds' } }
            ]
        });
        this.addChild(this.flow);
    }
}
```

### Variable column count

The strip's grid columns default to 4. Override per-instance via the `--flow-strip-cols` CSS variable on the container if you need 3 or 5:

```html
<div class="detail-flow-strip" style="--flow-strip-cols: 3;">…</div>
```

(That said, 4 covers the vast majority of cases — RuleSet has 4, incident triage has 4, job lifecycle is 5 but reads better as a Timeline.)

---

## Notes

- The CSS lives in [`src/core/css/core.css`](../../src/core/css/core.css) under `FlowStrip`. Do not duplicate the rules.
- `value` and `hint` are rendered as **trusted HTML**; `num`, `title`, `action`, `actionIcon`, and `actionData` keys/values are escaped.
- For long, time-ordered sequences (job events, audit history) prefer [`Timeline`](Timeline.md). FlowStrip is for short configuration sequences where each cell describes a stable stage of the record.
- The legacy `.rs-flow*` CSS in `admin.css` predates this primitive and remains for `RuleSetView` until that view is migrated to `FlowStrip` (see `planning/requests/detailview-migration-rethink.md`).

---

## Related Documentation

- [DetailView](DetailView.md) — the record-viewer layout that hosts FlowStrip
- [StatusPanel](StatusPanel.md) — hero-state primitive for "what state is this in"
- [Timeline](Timeline.md) — vertical event-feed for "what happened over time"
