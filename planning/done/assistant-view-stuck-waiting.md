# Assistant view gets stuck in "Waiting for response" state

| Field | Value |
|-------|-------|
| Type | bug |
| Status | done |
| Date | 2026-04-08 |
| Severity | high |

## Description
The AssistantView UI gets stuck showing "Waiting for response..." with no send button and no stop button. The user cannot interact at all and must reload the entire web app to recover. The stuck state can persist for hours.

## Context
The bug is in `src/extensions/admin/assistant/AssistantView.js`. It manifests in the two-panel assistant chat interface when the WebSocket connection drops and reconnects while a message request is pending (or the server re-sends thinking events on reconnection). Common triggers: laptop sleep/wake, network changes, long-running server-side AI operations, or extended idle periods.

## Acceptance Criteria
- After any WS disconnect/reconnect cycle, the input area must be in a valid state (either fully enabled with send button, or fully disabled with stop button)
- A hard maximum timeout must exist that cannot be indefinitely extended by server events
- The user must always have a clear, obvious way to recover from a stuck state
- The `_updateConnectionStatus()` connected branch must fully restore UI state, not just status text

## Investigation
- **Likely root cause:** Three compounding issues in `_updateConnectionStatus()` and the response timeout system
- **Confidence:** high
- **Code path:** `src/extensions/admin/assistant/AssistantView.js:753-780` (status handler), `:242-261` (input enable/disable), `:504-509` (timeout reset)
- **Regression test:** not feasible — requires WebSocket connection lifecycle simulation not available in current test harness
- **Related files:**
  - `src/extensions/admin/assistant/AssistantView.js` (primary)
  - `src/core/services/WebSocketClient.js` (no `isReconnecting` property)
  - `src/core/views/chat/ChatView.js` (showThinking/hideThinking)

### Root Cause Details

**Bug 1 — Incomplete state restoration on reconnect (primary cause of missing buttons)**

`_updateConnectionStatus()` line 761-766: When WS reconnects while `_responseTimeout` is active, only `_setInputStatus('Waiting for response…')` is called. Button visibility and textarea disabled state are NOT restored. The prior disconnected handler (line 770-779) hid the send button directly, so after reconnect both buttons end up hidden.

```js
// Line 761-766 — connected branch, pending timeout
} else {
    // BUG: only updates text, doesn't restore buttons
    this._setInputStatus('Waiting for response…');
}
```

**Bug 2 — Disconnected handler bypasses `_setInputEnabled()`**

Line 770-779: The disconnected handler directly manipulates the send button and textarea without going through `_setInputEnabled()`, creating inconsistent state that the reconnect handler doesn't know how to clean up.

```js
// Line 774-778 — directly manipulates DOM, not through _setInputEnabled
const textarea = this.element?.querySelector('[data-ref="input"]');
const sendBtn = this.element?.querySelector('[data-ref="send-btn"]');
if (textarea) textarea.disabled = true;
if (sendBtn) sendBtn.classList.add('d-none');
// stop button NOT managed here
```

**Bug 3 — No hard maximum timeout (enables "stuck for hours")**

`_resetResponseTimeout()` (line 504-509) is called on every `assistant_tool_call` and `assistant_plan_update` WS event, resetting the 60s safety timer. If the server keeps sending intermediate events — or re-sends `assistant_thinking` events when the WS reconnects — the timeout is perpetually deferred and never fires. This is what allows the stuck state to persist for hours rather than recovering after 60 seconds.

**Bug 4 — `isReconnecting` dead code**

Line 767: `this.ws?.isReconnecting` is always undefined because `WebSocketClient` has no `isReconnecting` property. The reconnecting branch never executes. During reconnection, execution always falls to the else/disconnected branch. This is cosmetic but means the status dot never shows "reconnecting" state.

## Resolution

### What was implemented

**Commit 236c76a** — Fix AssistantView getting stuck in "Waiting for response" state
**Commit f40d298** — Move `_requestStartTime` assignment to addNote send path (security hardening)

Four fixes across two files:

1. **`WebSocketClient.js`** — Added `isReconnecting` computed getter that returns true when the client is between reconnect attempts. Enables the reconnecting UI branch in AssistantView that was previously dead code.

2. **`AssistantView.js` `_updateConnectionStatus()`** — All three branches (connected, reconnecting, disconnected) now route UI state through `_setInputEnabled()` instead of direct DOM manipulation. This ensures buttons, textarea, and status bar are always in a consistent state after any connection change. Response timeouts are cleared on disconnect/reconnect since they only govern active requests over a live connection.

3. **`AssistantView.js` `_resetResponseTimeout()`** — Added a hard 5-minute cap (`_requestStartTime`) that cannot be deferred by intermediate server events. Prevents the "stuck for hours" scenario.

4. **`AssistantView.js` `addNote`** — `_requestStartTime` is set only when sending an actual message request, not on reconnect/disconnect state changes. Prevents the hard cap baseline from being corrupted by connection flapping.

### Files changed
- `src/core/services/WebSocketClient.js` — added `isReconnecting` getter
- `src/extensions/admin/assistant/AssistantView.js` — fixed state management in `_updateConnectionStatus()`, `_setInputEnabled()`, `_resetResponseTimeout()`, and `addNote` adapter
- `docs/web-mojo/services/WebSocketClient.md` — added `isReconnecting` to Instance Properties table (docs agent)
- `CHANGELOG.md` — added bugfix entry (docs agent)

### Tests run and results
- **Lint:** Clean — no issues in changed files
- **Full test suite:** 53/182 unit tests pass; all failures are pre-existing infrastructure issues unrelated to this change. Confirmed identical results on parent commit.

### Agent findings
- **Security review:** Identified that `_requestStartTime` was being set in `_setInputEnabled()` (triggered by reconnect paths), corrupting the 5-minute hard cap baseline. Fixed in commit f40d298. Two other warnings (pre-existing: conversation ID acceptance window, error text sanitization) are out of scope.
- **Docs updater:** Updated `WebSocketClient.md` and `CHANGELOG.md`.
- **Test runner:** All failures pre-existing; no regressions introduced.
