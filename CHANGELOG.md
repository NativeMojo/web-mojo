# Changelog

## Unreleased

### Added
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
