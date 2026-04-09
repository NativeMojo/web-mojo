# Assistant renders empty message bubble when response has only tool calls

| Field | Value |
|-------|-------|
| Type | bug |
| Status | done |
| Date | 2026-04-09 |
| Severity | medium |

## Description

When the AI assistant completes a plan-based workflow (e.g. security overview), the final `assistant_response` WebSocket message arrives with `response: ""` and all work captured in `tool_calls_made`. The frontend renders an empty "Assistant" bubble below the plan progress card because:

1. `_transformMessage()` filters tool calls by `tc.type === 'tool_use'`, but `tool_calls_made` items use the shape `{ tool: "name", input: {...} }` with no `type` field — so all entries are silently dropped.
2. After transformation the message has empty content, empty tool_calls, and no blocks.
3. `_onResponse()` passes this empty message to `chatView.addMessage()` unconditionally.
4. `ChatView.addMessage()` has no empty-message guard — it creates and mounts the view.
5. The `_collapseMessages()` empty-check only runs on historical fetches, not real-time WS messages.

The result: the user sees the plan steps complete but an empty assistant bubble appears below with no response text (visible in screenshot).

## Context

- **User flow:** Ask the assistant a question that triggers a multi-step plan. All steps complete via `assistant_plan_update` WS messages. The final `assistant_response` arrives with `response: ""` and `tool_calls_made` containing all orchestration calls.
- **The plan progress block already shows all step summaries**, so the tool call data in the response is redundant display-wise. The missing piece is: if there's truly nothing to say beyond the plan, don't render an empty bubble.

## Acceptance Criteria

- When `assistant_response` arrives and produces an empty message after transformation (no content, no blocks, no tool_calls), no message bubble is rendered.
- Plan-only responses still show the plan progress card (already working via `_onPlan` / `_onPlanUpdate`).
- Historical message loading continues to work (the existing `_collapseMessages` logic is unaffected).
- If the backend later sends actual response text alongside tool_calls_made, it renders normally.

## Investigation

- **Likely root cause:** `_onResponse()` unconditionally calls `chatView.addMessage()` without checking if the transformed message is empty. The `_transformMessage` method also drops all `tool_calls_made` entries because they lack `type: 'tool_use'`.
- **Confidence:** high
- **Code path:**
  - `src/extensions/admin/assistant/AssistantView.js:520-539` — `_onResponse()` handler
  - `src/extensions/admin/assistant/AssistantView.js:624-668` — `_transformMessage()` filter at line 640
  - `src/extensions/admin/assistant/AssistantView.js:677-709` — `_collapseMessages()` (historical only)
  - `src/core/views/chat/ChatView.js:151-168` — `addMessage()` has no empty guard
- **Regression test:** not feasible — requires WebSocket simulation not supported by current test harness
- **Related files:**
  - `src/extensions/admin/assistant/AssistantMessageView.js`
  - `src/core/views/chat/ChatMessageView.js`
  - `src/core/views/chat/ChatView.js`

## Plan

### Objective

Prevent an empty "Assistant" message bubble from rendering when `assistant_response` arrives with no displayable content (empty response text, no blocks, and only internal tool calls that get filtered out by `_transformMessage`).

### Steps

1. **`src/extensions/admin/assistant/AssistantView.js:520-539`** — In `_onResponse()`, after calling `_transformMessage()`, check if the resulting message is empty (no content, no blocks, no tool_calls). If empty, skip the `chatView.addMessage()` call. The guard should come after the `_transformMessage` call at line 531 and before `addMessage` at line 539. The rest of `_onResponse` (hideThinking, setInputEnabled, focus) must still execute — only the `addMessage` is conditional.

2. **`src/extensions/admin/assistant/AssistantContextChat.js:438-455`** — Same fix in the context chat's `_onResponse()`. After `_transformMessage()` at line 447, guard the `addMessage()` call at line 455 with the same empty check.

### Design Decisions

- **Guard in `_onResponse`, not in `ChatView.addMessage`** — The empty-message check is assistant-specific logic. `ChatView` is a generic component used elsewhere and should remain neutral. This matches the existing pattern where `_collapseMessages` (also assistant-specific) already has the same empty check for historical messages.
- **No normalization of `tool_calls_made` format** — The `tool_calls_made` items (`{ tool, input }`) are all internal orchestration tools (`create_plan`, `update_plan`, `load_tools`) that `_collapseMessages` already strips from history. The plan progress UI displays their results. Normalizing them just so they pass the `type === 'tool_use'` filter would add complexity for no visible benefit — they'd still be internal-only calls with no user-facing value.
- **Reuse the same emptiness check from `_collapseMessages`** — `!!msg.content || msg.tool_calls?.length > 0 || msg.blocks?.length > 0`. Consistent logic between real-time and historical paths.

### Edge Cases

- **Response with actual text alongside tool_calls_made** — The guard only skips when ALL three (content, blocks, tool_calls) are empty. If the backend sends response text, it renders normally.
- **`_transformMessage` returns `null`** — Already possible for `tool_result` messages (line 626). The guard should also handle `null` from transform (skip addMessage).
- **Input re-enable still fires** — The `hideThinking()`, `_setInputEnabled(true)`, and focus logic at lines 522-529 execute before the guard, so the UI always recovers from thinking state regardless of whether a message is rendered.
- **Blocks parsed from content** — If `_transformMessage` extracts blocks from embedded fences, those count as non-empty. No false suppression.

### Testing

- Not feasible with current test harness (requires WebSocket simulation). Manual verification: trigger a plan-based assistant query and confirm no empty bubble appears after the plan completes.

### Docs Impact

- None. This is an internal rendering fix with no public API change. No CHANGELOG entry needed (bug fix in unreleased assistant feature).

### Out of Scope

- Normalizing the `tool_calls_made` format to match Anthropic API shape — no user-facing benefit.
- Adding empty-message guards to `ChatView.addMessage()` — generic component, shouldn't embed assistant-specific logic.
- Historical message loading — already handled correctly by `_collapseMessages`.

## Resolution

### What was implemented
Added an empty-message guard in `_onResponse()` in both assistant chat views. After `_transformMessage()`, the code now only calls `chatView.addMessage()` if the message has content, blocks, or tool_calls. This prevents rendering an empty "Assistant" bubble when the response contains only internal orchestration tool calls that get filtered out during transformation.

### Files changed
- `src/extensions/admin/assistant/AssistantView.js` — guarded `addMessage()` at line 539
- `src/extensions/admin/assistant/AssistantContextChat.js` — same guard at line 455

### Tests and validation
- ESLint: clean on both changed files
- Full test suite: all failures pre-existing (ESM/CJS infra issues), none related to this change
- Security review: no concerns introduced
- Docs review: no updates needed (private internal fix)
