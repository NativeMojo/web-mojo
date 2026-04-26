# Assistant chat view drops tool calls and intermediate text from WS responses

| Field | Value |
|-------|-------|
| Type | bug |
| Status | done |
| Date | 2026-04-25 |
| Severity | high |

## Description

After comparing the live WebSocket stream with the REST history of the same conversation (id 34, messages 1506–1517), the live assistant chat view is **missing two distinct pieces of information** that the REST history contains. One is a backend bug, one is a view bug.

### 1. Backend / WS bug — intermediate assistant text is never emitted

When the assistant produces multiple turns inside a single user request (assistant text → tool calls → tool results → assistant text → tool calls → … → final assistant text), the REST history stores **each turn as its own message row**. Notably, an intermediate assistant turn can carry user-visible prose inside `tool_calls[].type === 'text'` while its `content` field is empty.

For conversation 34, message **1515** is the substantive answer to the user's question:

```json
{
  "id": 1515, "role": "assistant", "content": "",
  "tool_calls": [
    { "type": "text",
      "text": "Both are totally benign — just users who mistyped their username:\n\n**172.58.128.51 — \"0300dj@gmail.com\"** ..." },
    { "type": "tool_use", "name": "bulk_update_incidents", "input": { ... } }
  ]
}
```

Then message **1517** is the closing wrap-up: "Done. The queue is now fully cleared. ..."

But over the WebSocket only **one** `assistant_response` event arrives, carrying the text from 1517. The text from 1515 ("Both are totally benign — just users who mistyped...") is **not emitted at all** — there is no `assistant_response` for the intermediate turn, and the WS shape has no `text` field on `assistant_tool_call` events to carry it.

Result: live users see the wrap-up but never see the actual analysis. Refreshing the page (which goes through REST → `_transformMessage` → text extraction) reveals the missing turn after the fact, which is the strongest signal that the backend is the source of the gap.

### 2. View bug — `tool_calls_made` is silently filtered out

The single `assistant_response` event carries a flat `tool_calls_made` array using shape `{ tool, input }` (no `id`, no `type`). The view layer's `_transformMessage` filters tool calls with `tc.type === 'tool_use'`, which keeps the Anthropic-API shape used by REST history but drops every entry from `tool_calls_made`. Even if the filter were relaxed, `ChatMessageView._getToolCallsTemplate` reads `tc.name`, not `tc.tool`, so badges would render with the literal text "tool".

Net effect: the final live bubble shows the wrap-up text but no "N tool calls" collapse — the user has no signal that any work happened, in addition to having lost the intermediate analysis.

## Context

- **User flow:** Open the admin assistant (panel, fullscreen, or context chat), send a question that requires multi-step tool use (e.g. "look at the IP for login:unknown — has anyone else logged in from this IP?"), watch the chat in real time.
- **Symptom:** Live chat ends with a short wrap-up message and no tool-call indicators. Refreshing the page reloads the conversation via REST and the actual analysis appears as an additional bubble. The user sees "the answer" only after a refresh.
- **Why the prior fix did not catch this:** [planning/done/assistant-empty-response-bubble.md](planning/done/assistant-empty-response-bubble.md) explicitly chose **not** to normalize `tool_calls_made` because it was assumed to contain only internal orchestration tools (`create_plan`, `update_plan`, `load_tools`). The new trace shows that assumption was wrong — `tool_calls_made` carries every user-facing tool call (`query_ip_history`, `query_model`, `describe_model`, `bulk_update_incidents`), and the intermediate text turn never reaches the client at all.

## Acceptance Criteria

**Backend:**
- For multi-turn assistant responses, every assistant message that carries either `content` or a `text`-type entry in `tool_calls` is delivered to the client in real time. There is no per-turn data that exists in the REST history but is missing from the WS stream.
- The mechanism is consistent: either the existing `assistant_response` event fires once per assistant message row, or a new event type carries intermediate text. The frontend should not need to "reconstruct" turn boundaries from the flat `assistant_tool_call` stream.

**Frontend:**
- When the WS payload format is fixed, the view consumes it without needing the `{ tool, input }` flat shape. If the backend keeps emitting `tool_calls_made` for any reason, the view normalizes the entries (`tool` → `name`, defaults `type` to `'tool_use'`) before they reach the filter so they survive transformation and render with a real label.
- Internal orchestration tools (`create_plan`, `update_plan`, `load_tools`) continue to be hidden — same suppression `_collapseMessages` already applies on the REST path.
- Empty-message guard from the prior fix still holds (no bubble when content + blocks + post-filter tool_calls are all empty).
- Behavior is consistent across all three assistant entry points: `AssistantView`, `AssistantPanelView`, `AssistantContextChat`.

## Investigation

- **Primary root cause (backend):** the WS `assistant_response` event represents the *final* assistant turn only. There is no event for intermediate assistant turns whose only content lives inside a `text`-type tool-call entry (REST id 1515 in the captured trace). The `assistant_tool_call` event also has no `text` field. So the intermediate turn's prose has no transport.
- **Secondary root cause (frontend):** `_transformMessage()` filters tool calls with `tc.type === 'tool_use'`. The WS `tool_calls_made` array uses shape `{ tool, input }` with no `type`, so every entry is dropped before reaching `ChatMessageView`.
- **Tertiary issue (frontend):** `ChatMessageView._getToolCallsTemplate` reads `tc.name || tc.function?.name`, never `tc.tool`. Even if the filter were removed, badges from `tool_calls_made` would render with no tool name.
- **Tertiary issue (frontend):** in all three `_onResponse` handlers, the synthesized message reads `created: data.timestamp || new Date().toISOString()`, but the WS field is `data.created`. Live messages are timestamped "now" instead of using the server's `created` time. Cheap to fix in the same patch.
- **Confidence:** high. Cross-checked against the REST history sample provided in the bug report.
- **Code path:**
  - [src/extensions/admin/assistant/AssistantView.js:520-544](src/extensions/admin/assistant/AssistantView.js:520) — `_onResponse()` (treats one WS event as one assistant turn — incorrect when the backend collapsed multiple turns)
  - [src/extensions/admin/assistant/AssistantView.js:628-672](src/extensions/admin/assistant/AssistantView.js:628) — `_transformMessage()`; line 644 is the `tc.type === 'tool_use'` filter
  - [src/extensions/admin/assistant/AssistantPanelView.js:569-591](src/extensions/admin/assistant/AssistantPanelView.js:569) — same `_onResponse()` shape
  - [src/extensions/admin/assistant/AssistantPanelView.js:676-716](src/extensions/admin/assistant/AssistantPanelView.js:676) — same filter at line 690
  - [src/extensions/admin/assistant/AssistantContextChat.js:438-459](src/extensions/admin/assistant/AssistantContextChat.js:438) — `_onResponse()` delegating to `adapter._transformMessage`
  - [src/core/views/chat/ChatMessageView.js:120-146](src/core/views/chat/ChatMessageView.js:120) — `_getToolCallsTemplate()`; line 130 reads `tc.name`, never `tc.tool`
  - [src/extensions/admin/assistant/AssistantView.js:681-713](src/extensions/admin/assistant/AssistantView.js:681) — `_collapseMessages()`; precedent for `INTERNAL_TOOLS` filtering on the REST path
- **Backend repo:** the WS emitter for `assistant_response` lives outside this repo (web-mojo is the client framework). The fix for #1 must happen wherever the assistant runner produces these WS events. This planning doc captures the client-side observation; the actual change ticket should be filed against the backend repo with this trace attached.
- **Regression test:** not feasible inside web-mojo for #1 (cross-repo) or for the live WS path of #2 (current `node test/test-runner.js` harness has no WebSocket simulation). A pure unit test on `_transformMessage` is feasible if the function is exercised in isolation — design step should decide whether to extract it for testability.
- **Related files:**
  - `src/extensions/admin/assistant/AssistantView.js`
  - `src/extensions/admin/assistant/AssistantPanelView.js`
  - `src/extensions/admin/assistant/AssistantContextChat.js`
  - `src/extensions/admin/assistant/AssistantMessageView.js`
  - `src/core/views/chat/ChatMessageView.js`
  - `planning/done/assistant-empty-response-bubble.md` (prior decision not to normalize — needs revisiting in light of new trace)

## Plan

### Objective

Make the assistant chat view render tool-call badges from live WebSocket `assistant_response` events, with proper labels and the same internal-tool suppression already applied to historical messages. Also fix the wrong-field timestamp bug on live messages so they display the server's `created` time instead of "now."

The fix is purely client-side normalization. It is forward-compatible with the django-mojo backend bug fix (if the backend later switches `tool_calls_made` to the Anthropic `{type, name, input}` shape, the normalize step becomes a no-op).

Out of scope: the missing intermediate-text turn — that requires a backend change tracked at `django-mojo/planning/issues/assistant-ws-drops-intermediate-assistant-text.md`.

### Steps

1. **`src/extensions/admin/assistant/AssistantView.js:628-672`** — In `_transformMessage`, inside the `if (toolCalls.length > 0)` block (~line 637-645), add a normalization pass *before* the existing text/tool_use filtering:
   - For each entry where `!tc.type && tc.tool`, replace with `{ type: 'tool_use', name: tc.tool, input: tc.input }`. Other shapes pass through untouched.
   - After the existing `toolCalls = toolCalls.filter(tc => tc.type === 'tool_use')` line, also filter out internal orchestration tools using a shared `AssistantView.INTERNAL_TOOLS` static (added in step 4): `.filter(tc => !AssistantView.INTERNAL_TOOLS.has(tc.name))`.

2. **`src/extensions/admin/assistant/AssistantView.js:520-544`** — In `_onResponse`, change the synthesized `created` source from `data.timestamp || new Date().toISOString()` to `data.created || data.timestamp || new Date().toISOString()` so live messages get the WS event's actual `created` ISO string.

3. **`src/extensions/admin/assistant/AssistantView.js:681-713`** — In `_collapseMessages`, replace the inline `const INTERNAL_TOOLS = new Set([...])` with a reference to `AssistantView.INTERNAL_TOOLS`. Net behavior unchanged — single source of truth.

4. **`src/extensions/admin/assistant/AssistantView.js`** (after the class, near the `_blockCounter` precedent in AssistantMessageView style) — Add a static: `AssistantView.INTERNAL_TOOLS = new Set(['create_plan', 'update_plan', 'load_tools']);`. This is the only abstraction the change introduces; it consolidates a set already defined locally in `_collapseMessages`.

5. **`src/extensions/admin/assistant/AssistantPanelView.js:676-716`** — Apply the same normalization + internal-tools filter inside its `_transformMessage` (same lines as step 1, but in this file). It already imports `AssistantView`, so it can reference `AssistantView.INTERNAL_TOOLS` directly.

6. **`src/extensions/admin/assistant/AssistantPanelView.js:569-591`** — Same `data.created || data.timestamp || ...` fix in `_onResponse`.

7. **`src/extensions/admin/assistant/AssistantContextChat.js:78-126`** — Apply the same normalization + internal-tools filter inside `AssistantContextAdapter._transformMessage`. The file already imports `AssistantView`, so it can reference `AssistantView.INTERNAL_TOOLS` directly.

8. **`src/extensions/admin/assistant/AssistantContextChat.js:438-460`** — Same `data.created || data.timestamp || ...` fix in `_onResponse`.

### Design Decisions

- **Normalize at the transform boundary, not in `ChatMessageView`.** `ChatMessageView` is a generic component shared by non-assistant chats; it should not learn about Anthropic's `{type, name, input}` shape or the WS `{tool, input}` shape. Normalization belongs where the assistant-specific filter already lives — `_transformMessage`. This matches the precedent set by `_parseBlocks` and `_collapseMessages` (also assistant-specific, also kept out of `ChatMessageView`).
- **Filter internal tools in `_transformMessage`, not only in `_collapseMessages`.** Today `_collapseMessages` runs only on REST history. Moving the `INTERNAL_TOOLS` filter into `_transformMessage` makes it apply to both REST and live paths, so live `assistant_response` events with internal tools (e.g. `create_plan`) don't render orphan badges. `_collapseMessages` keeps its other responsibilities (empty-message skip, consecutive-tool-call merging).
- **Hoist `INTERNAL_TOOLS` to a static on `AssistantView`, not a new file.** It is the only piece of state shared across `_transformMessage` callers, and `AssistantView` is already the de-facto owner (the other two views import from it for `_collapseMessages` and `_parseBlocks`). Avoids introducing a new util file for a 3-element set.
- **Do not unify the three `_transformMessage` copies.** They were already duplicated before this bug. Refactoring them into a shared helper is out of scope per the core rule "Don't refactor unrelated files while fulfilling a request." Plan keeps the duplication, just fixes it in three places.
- **No change to `ChatMessageView._getToolCallsTemplate`.** Once entries are normalized to `{type:'tool_use', name, input}`, the existing `tc.name || tc.function?.name || 'tool'` fallback chain works correctly. No `tc.tool` branch needed.
- **Forward-compatible with the backend fix.** If django-mojo later normalizes `tool_calls_made` server-side (per the companion bug's acceptance criteria), the `if (!tc.type && tc.tool)` guard makes our normalize step a no-op — no follow-up cleanup needed on this side.

### Edge Cases

- **`tool_calls_made` items where the model returned an unrelated shape (e.g. `{name, input}` without `type`).** The normalization only fires when `!tc.type && tc.tool` — anything else passes through. If a future server emits `{name, input}` without `type`, those entries fail the `tc.type === 'tool_use'` filter and disappear silently. Acceptable: not in any current shape, would be a backend bug if it happened.
- **Empty assistant_response** (no `response`, empty `tool_calls_made`, no `blocks`). The prior fix's empty-message guard in `_onResponse` (`if (msg && (msg.content || msg.blocks?.length || msg.tool_calls?.length))`) still applies — no bubble. Confirmed in all three files.
- **Internal-only tool calls** (e.g. response with only `create_plan`). After the new INTERNAL_TOOLS filter, `tool_calls` becomes `[]`. If `content` and `blocks` are also empty, the existing empty-message guard prevents an orphan bubble. If `content` is non-empty, the bubble renders without a tool-calls badge — matches REST behavior.
- **Historical fetch path unchanged.** Anthropic-shaped entries (`{type:'tool_use', name, input}`) bypass the `if (!tc.type && tc.tool)` branch. The `_collapseMessages` line that referenced the local `INTERNAL_TOOLS` becomes a reference to `AssistantView.INTERNAL_TOOLS` — same set, same behavior.
- **Timestamp formats.** REST stores `created` as a Unix timestamp (number); WS sends ISO string. `_transformMessage` already passes through both formats unchanged via `msg.created || msg.timestamp`. The Mustache `|relative` formatter handles both. No format conversion in this fix.
- **Tool call without `input`** (`{tool: 'foo'}`). Normalized to `{type:'tool_use', name:'foo', input: undefined}`. Renders a badge with name "foo"; no downstream code reads `input` for badge display. Safe.

### Testing

- **Lint:** `npm run lint` — must stay clean on the four changed files.
- **Unit/build suites:** `npm run test:unit` and `npm run test:build` — no test currently covers `_transformMessage` directly, and the WS path requires WebSocket simulation that the harness doesn't have. A regression test for the normalization is **not feasible** with the current test runner; flagged in the issue file. Should not break any existing test.
- **Manual verification:**
  1. Open the admin assistant panel.
  2. Ask a question that triggers tool use (e.g. the IP query in the bug report).
  3. After the response arrives, confirm the assistant bubble shows a "N tool calls" collapse with one badge per non-internal tool, each badge labelled with the actual tool name (`query_ip_history`, `query_model`, etc.).
  4. Confirm internal tools (`create_plan`, `update_plan`, `load_tools`) do not appear in badges if any are emitted.
  5. Confirm the message timestamp matches the server time, not the client's "just now" of when the WS arrived.
  6. Refresh the page and confirm the historical view still renders correctly (no double-filtering, no missing badges, no empty-bubble regressions).
  7. Repeat the verification in `AssistantView` (fullscreen) and `AssistantContextChat` (model-context dialog).

### Docs Impact

- **No `docs/web-mojo/` change.** The assistant extension is admin-internal and not documented in the public framework docs.
- **No `CHANGELOG.md` entry.** Bug fix in an unreleased internal feature; matches the precedent set by `assistant-empty-response-bubble.md`.

## Resolution

Landed in commit `2ad579d` — *Assistant: render tool-call badges from live WS responses.*

### What was implemented
Followed the plan exactly. In all three assistant entry points, `_transformMessage` now normalizes WS `tool_calls_made` entries (`{ tool, input }` → `{ type: 'tool_use', name: tc.tool, input: tc.input }`) before the existing `type === 'tool_use'` filter, then drops internal orchestration tools via the new `AssistantView.INTERNAL_TOOLS` static. `_onResponse` now reads `data.created` first in the timestamp fallback chain so live messages display the server's `created` ISO string instead of "now". `AssistantView._collapseMessages` was updated to reference the hoisted static so REST history filtering uses the same set.

### Files changed
- `src/extensions/admin/assistant/AssistantView.js`
- `src/extensions/admin/assistant/AssistantPanelView.js`
- `src/extensions/admin/assistant/AssistantContextChat.js`

### Tests and validation
- **Lint:** clean on all three changed files (`npx eslint`). Pre-existing 16 errors in `src/core/Model.js`, `src/core/PortalApp.js`, `src/core/WebApp.js` are unchanged.
- **Unit:** `npm run test:unit` — 411/411 passed. No regression test added — `_transformMessage` requires WS simulation that the harness does not support, flagged in the issue.
- **Integration / build:** test-runner agent ran the full suite. Pre-existing failures in `DataFormatter.integration.test.js`, `framework.test.js`, `phase2.test.js`, and several build tests that depend on missing scaffolding (`dist/index.html`, `src/mojo.js`, `test/build/dist/`). None reference the assistant extension; none caused by this change.
- **Browser preview verification:** dynamically imported all three modules and ran `_transformMessage` against representative WS and REST payloads. Confirmed: WS `{tool, input}` entries normalize to `{type, name, input}`, `create_plan`/`update_plan`/`load_tools` are filtered, REST `{type:'text', text:...}` entries still extract to `content`, and timestamps pass through both as Unix number (REST) and ISO string (WS).

### Agent findings

- **docs-updater:** No changes warranted. `docs/web-mojo/extensions/Admin.md` documents the public event API but no `tool_calls_made`/`_transformMessage` implementation details. The fix realigns runtime behavior with the documented contract — no doc text is wrong. CHANGELOG precedent (assistant-empty-response-bubble.md) was to skip; followed.
- **security-review:** Rated *minor*. `ChatMessageView._getToolCallsTemplate` correctly escapes `tc.name` via `div.textContent` before injection — no XSS path. `INTERNAL_TOOLS` filter is shape-tight; both WS and Anthropic shapes are caught. Pre-existing triple-brace `{{{message.content}}}` rendering noted as context, not introduced by this diff.
- **security-review (acted on / declined):** The agent recommended dropping `tc.input` from the normalized object since the renderer doesn't read it, to limit PII exposure (tool inputs can contain IPs/emails/IDs). **Declined** — REST-loaded historical messages already carry `tc.input` for the same lifetime, so dropping it only on the WS path would diverge the two shapes (defeating the purpose of normalization) without solving the underlying concern. PII scrubbing of in-memory `tool_calls` is a real but separate issue; if pursued it should land as one pass over both transports plus the `Message.tool_calls` JSONField, not as an asymmetric strip in the WS adapter. Filed mentally as a follow-up rather than in this commit.

### Companion bug

`django-mojo/planning/issues/assistant-ws-drops-intermediate-assistant-text.md` — backend WS does not emit intermediate assistant text turns (e.g. message 1515 in the trace). Out of scope for this client-side fix; user will still need that backend fix to see all intermediate analysis text in real time without a refresh.
