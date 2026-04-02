# Changelog

## Unreleased

### Added
- **PortalWebApp** — New opinionated base class extending `PortalApp` with auth-gated lifecycle, automatic WebSocket setup, and clean events. Auth is checked before the router starts; if it fails, a configurable countdown redirect is shown. WebSocket connects automatically after auth using `WebSocketClient.deriveURL()`. New events: `user:ready`, `user:logout`, `ws:ready`, `ws:lost`, `ws:reconnecting`. Config-driven: `auth: { loginUrl }` (default `/login`), `ws: true/false` (default `true`). Overridable `onAuthFailed(error)` hook. Exported from `src/index.js`.
- **Admin Assistant** — Fullscreen modal chat interface for LLM-powered admin queries. Triggered via `registerAssistant(app)` which adds a `bi-robot` icon to the topbar (requires `view_admin` permission). Two-panel layout: conversation list (left, REST-backed) + real-time chat area (right, WebSocket). Supports structured response blocks rendered inline: `table` blocks as `TableView`, `chart` blocks as `SeriesChart`/`PieChart`, and `stat` blocks as Bootstrap stat cards.
- **AssistantView** — New view exported from `web-mojo/admin`. Manages WebSocket subscriptions for `assistant_thinking`, `assistant_tool_call`, `assistant_response`, and `assistant_error` events. Unsubscribes on destroy to prevent leaks.
- **AssistantConversation & AssistantConversationList** — New models exported from `web-mojo/models`. Endpoint `/api/assistant/conversation`. Conversation history loaded via REST; messages sent via WebSocket.
- **IPSetTablePage & IPSetView** — New admin pages/views for managing kernel-level IP blocking sets (country blocks, AbuseIPDB feeds, datacenter ranges, custom CIDR lists). Route: `system/security/ipsets`. Registered automatically by `registerSystemPages()`.
- **IP Sets menu entry** — Added "IP Sets" (`bi-shield-shaded`) to the Security section of the admin sidebar, requiring `view_security` permission.
- **ChatView: `showThinking(text?)`** — Appends an animated bouncing-dots thinking indicator to the messages area. Subsequent calls update the text without adding a second indicator.
- **ChatView: `hideThinking()`** — Removes the thinking indicator.
- **ChatView: `setInputEnabled(enabled)`** — Enables or disables the chat textarea and send button.
- **ChatView: `messageViewClass` option** — Constructor option (default `ChatMessageView`) allowing consumers to supply a custom message view class.
- **ChatView: `showFileInput` option** — Constructor option (default `true`). When `false`, hides the file drop zone and disables the `FileDropMixin` in `ChatInputView`.
- **ChatInputView: `setEnabled(enabled)`** — Disables or re-enables the textarea and send button. Distinct from `setBusy()` (which shows a spinner).
- **ChatMessageView: `role` support** — Applies `message-assistant` or `message-user` CSS class based on `message.role`. Assistant messages display a `bi-robot` icon/avatar instead of user initials.
- **ChatMessageView: `blocks` container** — Renders a `data-container="blocks-{id}"` slot after message text for attaching block child views (used by `AssistantMessageView`).
- **ChatMessageView: `tool_calls` display** — If `message.tool_calls` is present, renders a collapsible Bootstrap collapse section showing tool names as badges.
- **FormBuilder: `showWhen` field option** — Conditionally shows/hides a field based on another field's value. Hidden fields are excluded from form submission data and their `required` attributes are suppressed during validation.

### Fixed
- **GeoIPView block/unblock/whitelist actions** — Converted from ad hoc `rest.POST` calls to `model.save()` with action payloads; added optional chaining on `toast` calls to avoid errors in non-portal contexts.

## [Previous]
- **User Profile Extension** (`web-mojo/user-profile`) — Moved all user profile views from `src/core/views/user/` into a standalone extension at `src/extensions/user-profile/`. Available as `import { ... } from 'web-mojo/user-profile'` or via `@ext/user-profile/index.js` internally.
- **ProfilePersonalSection** — Editable first/last name, display name, DOB (with verified/unverified badge), timezone, and address (stored in `user.metadata`)
- **ProfileConnectedSection** — Lists OAuth provider connections (Google, GitHub, Microsoft, etc.) with unlink capability and lockout guard
- **ProfileSecurityEventsSection** — TableView of auth events (logins, failed attempts, password changes) with color-coded severity badges and custom `SecurityEventRow`
- **ProfileNotificationsSection** — Per-kind, per-channel toggle grid for notification preferences (in-app, email, push)
- **ProfileApiKeysSection** — Generate, list, copy, and delete personal API keys with IP restriction and expiration options; token shown once with copy-to-clipboard
- **Recovery Codes** in ProfileSecuritySection — View masked codes, regenerate with TOTP verification, copy-all support
- **Revoke All Sessions** in ProfileSecuritySection — Password-confirmed session revocation with automatic token refresh
- **Passkey model centralization** — `Passkey.register(friendlyName)` and `Passkey.suggestName()` static methods on the Passkey model, shared by both `PasskeySetupView` and `ProfileSecuritySection`
- **Rich passkey dialogs** — Passkey registration uses polished dialogs for name input (with auto-suggested device name), success confirmation, and error display instead of toasts
- **UserProfileView nav** updated to 11 sections across 3 groups: Profile, Personal, Security, Connected | Sessions, Devices, Security Events | Notifications, API Keys, Groups, Permissions

### Changed
- **ProfileSessionsSection** — Rewritten with TableView (paginated, size 10) and custom `SessionRow` with rich two-line column templates: browser + device on top, location + IP + threat flags below
- **ProfileDevicesSection** — Rewritten with TableView (paginated, size 10) and custom `DeviceRow` with rich two-line column templates: device name + model on top, browser + OS + IP below
- **ProfileOverviewSection** — Removed personal fields (moved to Personal section), removed username edit (read-only), added account deactivation, relaxed phone number format placeholder
- **PortalApp** — Dynamic imports updated from `@core/views/user/index.js` to `@ext/user-profile/index.js`; removed duplicate `onActionChangePassword` handler that caused double dialog
- `src/core/views/user/index.js` now re-exports from extension for backward compatibility (marked `@deprecated`)

### Fixed
- **Passkey registration flow** — Name is now collected before the WebAuthn API call (was previously asking after OS biometric prompt)
- **Passkey REST calls** — Added `dataOnly: true` to prevent double-wrapped response (`resp.data.data`) causing "Failed to start" errors
- **Double password dialog** — Removed duplicate `onActionChangePassword` from `UserProfileView` that conflicted with `ProfileSecuritySection`'s handler
- **Phone number format** — Changed placeholder from E.164 format (`+14155550123`) to friendly format (`(415) 555-0123`) since backend normalizes
- **MetricsChart gear dropdown** — Chart type toggle now returns `true` from action handlers for EventDelegate auto-close; chart type moved back to SeriesChart's built-in switcher
