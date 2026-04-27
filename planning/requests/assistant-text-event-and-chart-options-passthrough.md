# Assistant: handle `assistant_text` event + forward new chart options

**Type**: request
**Status**: planned
**Date**: 2026-04-26
**Priority**: medium

## Description

Two coordinated client-side changes to take advantage of recently-shipped django-mojo work. Both are non-breaking — missing either change just falls back to today's behaviour, no regressions.

### 1. New `assistant_text` WebSocket event

When the LLM writes prose alongside tool calls in the same turn (e.g. *"Both IPs are benign — bulk-updating now"* → `bulk_update_incidents`), `django-mojo` now publishes that intermediate prose as a new `assistant_text` event before the tool calls fire. Without a client handler the bubble is silently dropped on the wire — same observable behaviour as today, but the fix only takes effect once the client subscribes to the event.

### 2. Chart block — forward new SeriesChart / PieChart options

`django-mojo` now teaches the LLM about `stacked`, `crosshair_tracking`, `cutout`, `colors`, `show_labels`, `show_percentages`, etc., and validates the chart block server-side. The model is already emitting these fields; `AssistantMessageView._renderChartBlock` doesn't forward them to the chart constructor yet, so users see no visible difference. This change closes that loop.

## Context

### Existing WS event wiring

[`src/extensions/admin/assistant/AssistantView.js`](src/extensions/admin/assistant/AssistantView.js) already subscribes to `assistant_thinking`, `assistant_tool_call`, `assistant_response`, `assistant_error`, `assistant_plan`, `assistant_plan_update`. The pattern (lines 399–442) registers a handler in `this._wsHandlers`, subscribes via `ws.on('message:<type>', …)`, mirrors in `_unsubscribeWS`, and adds a `case` in `_dispatchWSMessage` (lines 451–463) for the wrapped envelope path used by background threads via `send_to_user`. The new `assistant_text` event needs the same five touch points.

### Event order per turn (when intermediate text is present)

```
assistant_thinking
  → assistant_text          [NEW — currently silently dropped]
  → assistant_tool_call (×N)
  → ...
  → assistant_response      [terminal — clears thinking, re-enables input]
```

`assistant_response` is still terminal. `assistant_text` MUST NOT clear the thinking indicator or re-enable input.

### Existing chart-block renderer

[`src/extensions/admin/assistant/AssistantMessageView.js`](src/extensions/admin/assistant/AssistantMessageView.js) — `_renderChartBlock` around line 194 currently maps the LLM block into chart-constructor options. Today only `chart_type`, `title`, `labels`, and `series[].name`/`series[].values` are forwarded. The new `SeriesChart`/`PieChart` (post-Chart.js rebuild) accept many more options that the server validator already guarantees are well-formed.

Stale doc comment at line 169 still says "MiniPieChart or MiniSeriesChart" — the components were renamed to `PieChart` / `SeriesChart` in the SVG rebuild. One-line fix.

### Server-side reference docs

- `django-mojo/docs/web_developer/assistant/README.md` — event table + lifecycle.
- `django-mojo/docs/web_developer/assistant/blocks.md` — chart-block schema.

## Acceptance Criteria

### `assistant_text` handler

- [ ] **`src/extensions/admin/assistant/AssistantView.js`** — register the new event in all five places where every other `assistant_*` event is wired:
  1. `this._wsHandlers.text = (data) => this._onText(data)` in the handlers map (~line 399).
  2. `this.ws.on('message:assistant_text', this._wsHandlers.text)` in `_subscribeWS` (~line 413).
  3. `this.ws.off('message:assistant_text', this._wsHandlers.text)` in `_unsubscribeWS` (~line 430).
  4. `case 'assistant_text': this._onText(inner); break;` in `_dispatchWSMessage` (~line 455).
  5. New `_onText(data)` method that:
     - Accepts payload `{ conversation_id, text, blocks }`.
     - Filters by `_isForThisConversation(data)` (existing helper around line 466) so cross-conversation events don't leak.
     - Appends an assistant bubble using the same path that `_onResponse` uses to render finished messages — the `text` is already cleaned by `_parse_blocks` server-side, and `blocks` may contain `assistant_block` JSON parsed from the intermediate text. Both render through the existing `renderBlocks()` dispatcher used by `assistant_response`.
     - **Does NOT** clear the thinking indicator and **does NOT** re-enable input (those remain `assistant_response`'s responsibility).
- [ ] Update the file-header JSDoc comment at line 14 from
      `WS events: assistant_thinking, assistant_tool_call, assistant_response, assistant_error`
      to include `assistant_text`. Order them to match the per-turn sequence.
- [ ] No regression on the legacy text-buried-in-`tool_calls` path — old conversations that emit prose inside `tool_calls` already render via the existing extraction path; that fallback must keep working.

### Chart-block options passthrough

- [ ] **`src/extensions/admin/assistant/AssistantMessageView.js`** — in `_renderChartBlock` (around line 194), forward the following block fields into the chart constructor.

      For `SeriesChart` (`chart_type` ∈ `line` | `bar` | `area`):

      | Block field (snake_case) | Constructor option (camelCase) |
      |---|---|
      | `stacked`            | `stacked` |
      | `grouped`            | `grouped` |
      | `crosshair_tracking` | `crosshairTracking` |
      | `colors`             | `colors` |
      | `show_legend`        | `showLegend` |
      | `legend_position`    | `legendPosition` |

      For `PieChart` (`chart_type` === `pie`):

      | Block field (snake_case) | Constructor option (camelCase) |
      |---|---|
      | `cutout`            | `cutout` |
      | `show_labels`       | `showLabels` |
      | `show_percentages`  | `showPercentages` |
      | `colors`            | `colors` |
      | `legend_position`   | `legendPosition` |

      Use a small map-and-conditional-spread helper so missing fields don't override the framework defaults — only forward keys that are present on `block`.

- [ ] **Per-series passthrough** — extend the existing series mapping to copy through `color`, `fill`, `smoothing` when present:
      ```js
      const datasets = (block.series || []).map(s => {
          const d = { label: s.name, data: s.values };
          if (s.color !== undefined) d.color = s.color;
          if (s.fill !== undefined) d.fill = s.fill;
          if (s.smoothing !== undefined) d.smoothing = s.smoothing;
          return d;
      });
      ```

- [ ] **Stale-doc fix at `AssistantMessageView.js:169`** — comment reads `Render a chart block using MiniPieChart or MiniSeriesChart`; replace with `PieChart or SeriesChart`.

### Tests / verification

- [ ] No new unit tests required — both changes are passthrough/event-routing code with no logic to assert beyond manual verification.
- [ ] Manual verification of the **`assistant_text`** change:
  - Trigger a multi-step prompt that emits intermediate prose: e.g. *"look up my last 5 incidents and merge any duplicates"* — the model summarises before the merge tool call.
  - Confirm the analysis bubble appears **before** the tool-call status indicators (not after a refresh).
  - Confirm `assistant_response` still clears the thinking indicator and re-enables input.
  - Old conversations (no `assistant_text` event) render unchanged.
- [ ] Manual verification of the **chart options** change:
  - *"show events by severity over the last week"* → expect a stacked bar chart, 3 series stacked by default, severity-mapped colors via per-series `color`.
  - *"breakdown of incidents by category as a doughnut"* → pie chart with `cutout: 0.5` (or similar non-zero).
  - *"plot job success rate over 24 hours with crosshair tracking"* → line chart with floating-crosshair tooltip.
  - Existing minimal chart blocks (no new fields) render identically to today.
- [ ] `npm run test:unit` passes (no chart-related regressions; the existing `SeriesChart.test.js` / `PieChart.test.js` cover the framework side).
- [ ] `npm run lint` clean.

## Constraints

- **Non-breaking on both axes.** `assistant_text` is additive (silent today, visible after the handler ships). Chart-block fields are optional (existing minimal blocks must render identically).
- **Do not duplicate `assistant_response`'s side effects.** Specifically: do not toggle the thinking indicator off, do not re-enable input, do not mark the conversation as idle.
- **Do not change the chart constructor itself.** All new options were already added to `SeriesChart` / `PieChart` during the chart rebuild — this request is purely about forwarding them through.
- **Cross-conversation safety.** `_onText` must filter via the same `_isForThisConversation` predicate every other handler uses. Without it, intermediate text from a sibling tab would leak into the active conversation.
- **Trust the server-side validator.** `django-mojo`'s `_validate_chart_block` already enforces `chart_type` enum, `labels`/`series` shape, soft-field clamping. The renderer should pass values straight through without re-validating.

## Out of Scope

- Touch-event support for `crosshairTracking` (still the same scope as the original chart request — out for now).
- Animation tuning (`animationDuration`, `animate: false`) for assistant-emitted charts. Defaults are good and these are not LLM-controlled in the schema.
- Surfacing tool-call streaming progress (e.g. partial tool output) inside the new `assistant_text` bubble — server doesn't emit that today.
- Server-side schema additions — those landed in `django-mojo` already.
- A new chart_type (radar, polar, bubble) — `SeriesChart`/`PieChart` don't support them.

## Notes

- Suggested PR shape: single PR, two commits.
  1. `assistant: handle assistant_text intermediate events` — new WS handler + `_onText` method + JSDoc comment update.
  2. `assistant: forward new chart options to SeriesChart / PieChart` — passthrough mapping in `_renderChartBlock`, per-series field copy, stale-comment fix.
- Reference for the WS event payload shape and lifecycle: `django-mojo/docs/web_developer/assistant/README.md` and `blocks.md`. Coordinate with that team if the payload shape doesn't match what's documented here.
- After landing this, watch for the LLM under-using `colors`. If it always falls back to the default palette even when status/severity data is in play, the django-mojo prompt may need a tighter rule. That's a server-side follow-up, not a `web-mojo` issue.
- The `AssistantContextChat.js` and `AssistantPanelView.js` files also have WS event listeners — verify they don't need the same `assistant_text` wiring. (Quick grep: if they only forward to a parent view that handles WS, no change. If they hold their own subscriptions, mirror the AssistantView change there.)

## Plan

### Objective

Land two coordinated, non-breaking client-side changes:

1. Subscribe to and render the new `assistant_text` intermediate-prose WebSocket event across all three places that own assistant WS subscriptions (`AssistantView`, `AssistantPanelView`, `AssistantContextChat`). Currently the event is silently dropped on the wire.
2. Forward the new chart-block options (`stacked`, `grouped`, `crosshair_tracking`, `cutout`, `show_labels`, `show_percentages`, `colors`, `show_legend`, `legend_position`, plus per-series `color`/`fill`/`smoothing`) from the LLM's chart blocks into the `SeriesChart` / `PieChart` constructor in `AssistantMessageView._renderChartBlock`. Validator on the django-mojo side already guarantees shape; this is pure passthrough via a strict snake_case → camelCase allowlist.

Existing behaviour must remain intact in both directions: any conversation that doesn't emit `assistant_text` is unchanged; any chart block without the new fields renders identically to today.

### Steps

**Phase A — `assistant_text` event in `AssistantView.js`**

1. **`src/extensions/admin/assistant/AssistantView.js:14`** — update the file-header JSDoc `WS events:` line to include `assistant_text`. Order: `assistant_thinking, assistant_text, assistant_tool_call, assistant_response, assistant_error`.

2. **`src/extensions/admin/assistant/AssistantView.js:399`** — add `text: (data) => this._onText(data)` to the `_wsHandlers` map.

3. **`src/extensions/admin/assistant/AssistantView.js:413`** — `this.ws.on('message:assistant_text', this._wsHandlers.text)` immediately after the `assistant_thinking` subscription.

4. **`src/extensions/admin/assistant/AssistantView.js:430`** — mirror in `_unsubscribeWS`: `this.ws.off('message:assistant_text', this._wsHandlers.text)` immediately after the `assistant_thinking` `.off`.

5. **`src/extensions/admin/assistant/AssistantView.js:455`** — add `case 'assistant_text': this._onText(inner); break;` to `_dispatchWSMessage` between `thinking` and `tool_call` (matches wire order).

6. **`src/extensions/admin/assistant/AssistantView.js`** — new method `_onText(data)`, placed below `_onThinking` (~line 487):
    - Filter via `if (!this._isMyConversation(data)) return;`
    - `this._adoptConversationId(data);`
    - `this._resetResponseTimeout();` — server is still working, prevents false 60s timeout during long intermediate text in tool-heavy turns. Same rationale as `_onToolCall`.
    - Construct the assistant bubble via `_transformMessage`, mirroring `_onResponse`:
      ```js
      const msg = this._transformMessage({
          id: data.message_id || `text-${++this._messageIdCounter}`,
          role: 'assistant',
          content: data.text || '',
          blocks: data.blocks || [],
          tool_calls: [],
          created: data.created || data.timestamp || new Date().toISOString()
      });
      if (msg && (msg.content || msg.blocks?.length)) {
          this.chatView.addMessage(msg);
      }
      ```
    - **Do NOT** call `this.chatView.hideThinking()`, `this._setInputEnabled(true)`, or focus the input. `assistant_response` keeps that responsibility.

**Phase B — Same wiring in `AssistantPanelView.js`**

7. **`src/extensions/admin/assistant/AssistantPanelView.js`** — apply the same five wiring edits in their counterpart locations (handler map ~474, `.on` ~487, `.off` ~502, dispatch switch ~521, new `_onText` method below `_onThinking` ~544). The body of `_onText` is identical to Phase A step 6 — same `_isMyConversation`, `_adoptConversationId`, `_resetResponseTimeout`, `_transformMessage` are all present.

**Phase C — Same wiring in `AssistantContextChat.js`** (with a small consistency fix)

8. **`src/extensions/admin/assistant/AssistantContextChat.js`** — same five-edit pattern (handler map ~362, `.on` ~373, `.off` ~387, dispatch switch ~403, new `_onText` method below `_onThinking` ~419). Notes:
    - **Add a small `_adoptConversationId(data)` helper** to this view (currently absent — adapter manages the ID, but for consistency with the other two views, we mirror them so all three behave identically). Implementation:
      ```js
      _adoptConversationId(data) {
          if (data.conversation_id && this.adapter && !this.adapter.conversationId) {
              this.adapter.conversationId = data.conversation_id;
          }
      }
      ```
      Place above `_onThinking`, just below `_isMyConversation`. ~5 LOC.
    - `_onText` calls `_adoptConversationId(data)` and uses `this.adapter._transformMessage(...)` (this file's transform lives on the adapter, line 455).

**Phase D — Chart-block options passthrough in `AssistantMessageView.js`**

9. **`src/extensions/admin/assistant/AssistantMessageView.js:169`** — fix stale doc comment: replace `MiniPieChart or MiniSeriesChart` with `PieChart or SeriesChart`.

10. **`src/extensions/admin/assistant/AssistantMessageView.js:172` (`_renderChartBlock`)** — restructure how options are built:

    a. Extend the `datasets` mapping (~line 195) to copy through per-series fields when present:
    ```js
    const datasets = (block.series || []).map(s => {
        const d = { label: s.name, data: s.values };
        if (s.color !== undefined) d.color = s.color;
        if (s.fill !== undefined) d.fill = s.fill;
        if (s.smoothing !== undefined) d.smoothing = s.smoothing;
        return d;
    });
    ```

    b. Build a small chart-options object via a strict snake_case → camelCase allowlist. Inline at the top of the method:
    ```js
    const FORWARD_SERIES = {
        stacked:            'stacked',
        grouped:            'grouped',
        crosshair_tracking: 'crosshairTracking',
        colors:             'colors',
        show_legend:        'showLegend',
        legend_position:    'legendPosition'
    };
    const FORWARD_PIE = {
        cutout:           'cutout',
        show_labels:      'showLabels',
        show_percentages: 'showPercentages',
        colors:           'colors',
        legend_position:  'legendPosition'
    };
    const forward = (map) => Object.entries(map).reduce((acc, [snake, camel]) => {
        if (block[snake] !== undefined) acc[camel] = block[snake];
        return acc;
    }, {});
    ```

    c. In the pie branch (~line 205), spread the forwarded options after the defaults but before `data` (so the LLM can override `legendPosition` but never replace the parsed `data`):
    ```js
    new PieChart({
        width: 180,
        height: 180,
        legendPosition: 'right',
        ...forward(FORWARD_PIE),
        data: chartData
    });
    ```

    d. In the series branch (~line 219), same structure:
    ```js
    new SeriesChart({
        chartType: chartType === 'area' ? 'line' : chartType,
        fill: chartType === 'area',
        height: 200,
        legendPosition: 'top',
        ...forward(FORWARD_SERIES),
        data: chartData
    });
    ```

### Design Decisions

- **Three-file replication, not extraction.** Same WS subscription pattern lives in three views, each with subtle local conventions. A shared mixin would entangle three views that already manage themselves cleanly. Match each file's existing handlers — extraction is a separate refactor.
- **All three views adopt the conversation-id consistently.** `AssistantContextChat` gets a small new `_adoptConversationId` helper (~5 LOC) so the WS event-handling pattern is uniform across the three. The adapter still owns the canonical `conversationId` — the helper just writes through to it.
- **`_onText` mirrors `_onResponse`'s data path, not its side effects.** Reuses `_transformMessage` so the bubble looks identical to a final response. Drops the three side effects that mark turn completion: `hideThinking()`, `_setInputEnabled(true)`, `textarea.focus()`. `assistant_response` remains terminal.
- **Reset the safety timeout on `assistant_text`.** Long intermediate prose during a tool-heavy turn must not trip the 60s response timeout. `_onToolCall` already does this for the same reason.
- **Strict snake_case → camelCase allowlist for chart options.** Three reasons: (1) server-side validator owns the schema and any expansion is a coordinated PR anyway — wildcard's "future-proof" upside is theoretical; (2) we already need rename mapping (`crosshair_tracking` → `crosshairTracking`), so a wildcard would pass keys under the wrong name and silently do nothing; (3) defense-in-depth — the server validator catches malformed blocks today, but an explicit frontend allowlist prevents a server bug from becoming a frontend bug. Cost of being wrong is one 5-line PR per future schema field — cheap.
- **Forwarded values go after defaults, before `data:`.** Default `legendPosition: 'right'`/`'top'` are mostly correct, but the LLM can override them. `data: chartData` always wins over any block field with that name.
- **Stale-comment fix bundled with passthrough.** Same file, same method, ~3 lines apart. Splitting would be churn.
- **No new unit tests.** Both changes are passthrough/event-routing code with no logic to assert. Manual verification via the django-mojo dev environment is the right validation. Existing chart unit tests cover the framework side.

### Edge Cases

- **Cross-conversation events.** `_isMyConversation` predicates already guard. Test with two browser tabs against different conversations.
- **`assistant_text` payload missing both `text` and `blocks`.** Skip the `addMessage` call when `msg && (msg.content || msg.blocks?.length)` is false. Mirrors `_onResponse` pattern.
- **Block-fence-buried-in-content.** `_transformMessage` already runs `_parseBlocks` if `blocks` is empty (line ~657). Safety net catches a server that forgets to populate `blocks`.
- **Multiple consecutive `assistant_text` events in one turn.** Each renders as its own bubble — that's the intended UX. No coalescing.
- **`assistant_text` carrying a chart block.** Chart-block passthrough applies regardless of which event delivers the block — same `renderBlocks()` dispatcher in `AssistantMessageView`. Both changes compose naturally.
- **Old conversations replayed from history.** History loads via REST and runs through `_transformMessage` directly (no WS path). Old text-buried-in-`tool_calls` extracts via the existing `textParts` block at line 644. Confirmed unchanged.
- **Block field with explicit `null`.** `block[snake] !== undefined` accepts `null` and forwards it — correct, the chart treats `null` as "use default".
- **`crosshairTracking` on a bar chart.** `SeriesChart` already ignores the flag for `chartType: 'bar'`. No special case in passthrough.
- **`AssistantContextChat._adoptConversationId` racing with adapter.** The adapter is the source of truth. The helper only writes to `this.adapter.conversationId` if it's currently empty — no race risk.

### Testing

- `npm run test:unit` — confirms no regression in existing chart tests (passthrough only, no logic changes).
- `npm run lint` — confirms the new helper / spread syntax doesn't trip lint.
- **Manual verification**:
  - **`assistant_text`** — fire a multi-step prompt that emits intermediate prose: "look up my last 5 incidents and merge any duplicates" or "summarise today's failed jobs and cancel any older than 1 hour". Expect the analysis bubble to appear **before** the tool-call status indicators; `assistant_response` (the wrap-up) still clears the thinking indicator and re-enables input.
  - **Chart options** — three test prompts:
    - *"show events by severity over the last week"* → stacked bar chart, severity-mapped colors.
    - *"breakdown of incidents by category as a doughnut"* → pie chart with `cutout`.
    - *"plot job success rate over 24 hours with crosshair tracking"* → line chart with floating crosshair.
  - **Backwards compatibility** — replay an old conversation that pre-dates `assistant_text` (history). Open a new conversation that emits a minimal chart block (just `chart_type` + `labels` + `series`). Both must render identically to today.

### Docs Impact

- `CHANGELOG.md` — one bullet under `## Unreleased > ### Added`: "Assistant: handles new `assistant_text` intermediate-prose WS event; chart blocks now forward `stacked`, `crosshair_tracking`, `cutout`, `colors`, and per-series `color`/`fill`/`smoothing` to the chart constructor."
- No `docs/web-mojo/` updates — `AssistantView` / `AssistantMessageView` are admin-extension internals; not user-facing API.
- No README / architecture changes.

### Out of Scope

- Touch support for `crosshairTracking` (still out, same as the parent chart request).
- Animation tuning (`animationDuration`, `animate`) for assistant-emitted charts. Not in the assistant block schema.
- Surfacing partial tool-call output in the new `assistant_text` bubble — server doesn't emit partials.
- Server-side schema additions — already shipped in django-mojo.
- New chart_types — frontend doesn't support radar/polar/bubble.
- Extracting the WS-handler pattern into a shared mixin across the three views — separate refactor.

---
## Resolution
**Status**: open
