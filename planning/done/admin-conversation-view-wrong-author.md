# Admin AssistantConversationView shows "You" instead of actual user and skips message post-processing

| Field | Value |
|-------|-------|
| Type | bug |
| Status | done |
| Date | 2026-04-09 |
| Severity | medium |

## Description
The admin `AssistantConversationView` displays "You" as the author for all user messages instead of the actual user who sent them. This is an admin-only view used to review *other users'* conversations, so "You" is always wrong. It also lacks the message post-processing (`_collapseMessages`, `_parseBlocks`) that the user-facing `AssistantView` applies, resulting in noisier output with internal tool calls visible and blocks not parsed from older content formats.

## Context
- Triggered when an admin selects a conversation in the assistant admin panel.
- The conversation model already has user data at `model.get('user')` with `display_name` and `avatar` fields (confirmed by `AssistantConversationListView` which uses it correctly at line 77-79).
- Individual messages may also carry `msg.author` or `msg.user` objects from the API.

## Acceptance Criteria
- User messages show the actual user's display name, not "You"
- User messages show the user's avatar when available
- `currentUserId` should not be set to the admin's own ID — it should reflect the conversation's user so ChatView's `isCurrentUser` logic renders correctly
- Internal tool calls (`create_plan`, `update_plan`, `load_tools`) are collapsed out of view
- Blocks embedded in older content formats are parsed and rendered as structured blocks

## Investigation
- **Likely root cause:** `_transformMessage()` at line 106-108 unconditionally overwrites the author with `{ name: 'You', id: currentUserId }` where `currentUserId` is the *admin's* ID from `window.app.state.user.id`. It should instead use `msg.author`, `msg.user`, or the conversation-level `user` object.
- **Confidence:** high
- **Code path:**
  - `AssistantConversationView.js:67` — sets `currentUserId` to admin's own ID
  - `AssistantConversationView.js:106-108` — hardcodes author as `{ name: 'You', id: currentUserId }`
  - `AssistantConversationView.js:70` — no `_collapseMessages` call on transformed messages
  - `AssistantConversationView.js:87-113` — no `_parseBlocks` call for legacy content
- **Regression test:** not feasible — no test harness for rendered view output with mock conversation data
- **Related files:**
  - `src/extensions/admin/assistant/AssistantView.js:651-668` — correct `_transformMessage` pattern
  - `src/extensions/admin/assistant/AssistantContextChat.js:111-126` — another correct implementation
  - `src/extensions/admin/assistant/AssistantConversationListView.js:77-79` — shows user data is on the model
  - `src/core/views/chat/ChatView.js:130-132` — `isCurrentUser` logic based on `author.id` vs `currentUserId`
  - `src/core/views/chat/ChatMessageView.js:67-71` — template expects `message.author.avatarUrl`

## Plan

### Objective
Fix the admin AssistantConversationView so user messages display the actual user's name and avatar (not "You"), and apply the same message post-processing (`_collapseMessages`, `_parseBlocks`) that the user-facing AssistantView uses.

### Steps
1. **AssistantConversationView.js — Import AssistantView** for its static `_collapseMessages` and `_parseBlocks` methods.
2. **onInit() — Fix `currentUserId`** from `window.app?.state?.user?.id` (admin) to `this.model.get('user')?.id` (conversation's user).
3. **_transformMessage() — Fix author** using `msg.author || { built from msg.user/conversation user }` with `avatarUrl`.
4. **_transformMessage() — Add `_parseBlocks`** safety net for legacy content.
5. **onInit() — Add `_collapseMessages`** call after transform.
6. **_transformMessage() — Add `_conversationId`** for action block callbacks.

### Design Decisions
- Reuse AssistantView static methods rather than duplicating (matches AssistantContextChat pattern).
- Derive `currentUserId` from conversation model, not admin session.
- Build `avatarUrl` from `user.avatar.thumbnail || user.avatar.url` (same as list view).

### Edge Cases
- No user object → author falls back to `{ name: 'Unknown' }`, no "You" badge.
- Pre-populated `msg.author` → respected as-is.
- No avatar → ChatMessageView falls back to initials.

### Testing
- `npm run lint`

### Docs Impact
- `CHANGELOG.md` — bug fix entry
