# Assistant Chat Datetime Rendering Broken

| Field | Value |
|-------|-------|
| Type | bug |
| Status | done |
| Date | 2026-04-06 |
| Severity | medium |

## Description
The AI assistant conversation list displays incorrect dates for all conversations. Timestamps show as January 1970 dates because the `AssistantConversationListView` passes Unix epoch **seconds** directly to `new Date()`, which expects **milliseconds**. This causes:
- All conversations grouped under "Earlier" instead of "Today" / "Yesterday"
- Relative time strings showing wrong dates (e.g., "Jan 21" instead of "2h ago")

## Context
The API returns `created` and `modified` as Unix epoch seconds (e.g., `1775464285`). The `AssistantConversationListView` uses manual `new Date()` calls in two methods without converting to milliseconds first. The framework's `DataFormatter.normalizeEpoch()` handles this conversion correctly and is used by the template pipe formatters (`|relative`, `|datetime`), but the conversation list view bypasses DataFormatter entirely.

Chat message timestamps rendered via Mustache templates (`{{message.timestamp|relative}}`) are **not affected** — those flow through `DataFormatter.relative()` which calls `normalizeEpoch()` to detect and convert epoch seconds.

## Acceptance Criteria
- Conversation list items display correct relative timestamps (e.g., "2h ago", "1d ago")
- Conversations are grouped correctly into Today / Yesterday / Earlier
- Both epoch seconds from the API and ISO strings from local messages render correctly
- Use `DataFormatter` utilities per `docs/web-mojo/core/DataFormatter.md` instead of manual date parsing

## Investigation
- **Likely root cause:** `_groupByDate()` and `_relativeTime()` use raw `new Date(epochSeconds)` which interprets the value as milliseconds, producing 1970 dates
- **Confidence:** high
- **Code path:**
  - `src/extensions/admin/assistant/AssistantConversationListView.js:120` — `_groupByDate()`: `new Date(model.get('created'))` passes epoch seconds to `new Date()`
  - `src/extensions/admin/assistant/AssistantConversationListView.js:196-197` — `_relativeTime()`: `new Date(dateStr)` same issue
  - `src/core/utils/DataFormatter.js:722-736` — `normalizeEpoch()` correctly handles epoch seconds (< 1e11 → multiply by 1000)
  - `src/core/utils/DataFormatter.js:781-783` — `relative()` calls `normalizeEpoch()` before `new Date()` — template-rendered timestamps work correctly
- **Regression test:** not feasible — UI rendering in conversation list uses manual DOM, not easily testable with current harness
- **Related files:**
  - `src/extensions/admin/assistant/AssistantConversationListView.js` (primary fix target)
  - `src/extensions/admin/assistant/AssistantView.js` (uses `_transformMessage` — not affected)
  - `src/extensions/admin/assistant/AssistantContextChat.js` (uses `_transformMessage` — not affected)
  - `src/core/views/chat/ChatMessageView.js` (templates use `|relative` pipe — not affected)
  - `src/core/utils/DataFormatter.js` (has `normalizeEpoch()` utility to reuse)
  - `docs/web-mojo/core/DataFormatter.md` (documents `epoch` pipe and best practices)
