# Changelog

## Unreleased

### Added
- **UserProfileView** — Rich multi-section user profile shown in a fullscreen Dialog, replacing the previous `Dialog.showModelForm()` profile editor in `PortalApp.showProfile()`
  - **Profile** section: avatar upload, editable display name and timezone, email/phone verification status with verify actions, account status, permissions peek
  - **Security** section: compact card dashboard linking to detail dialogs for password change, passkeys (WebAuthn registration, edit, delete), active sessions (with revoke), devices, and activity log
  - **Groups** section: group membership list with role badges fetched from MemberList
  - **Permissions** section: read-only role bar and flat permission tag cloud from `User.PERMISSIONS`
- **PasskeySetupView** — Post-login passkey prompt with create/skip/"don't ask again" for encouraging WebAuthn adoption
- `PortalApp.showPasskeySetup()` — Shows the passkey setup prompt (respects localStorage dismissal)
- New `src/core/views/user/` directory with barrel exports via `index.js`
- Exported `UserProfileView` and `PasskeySetupView` from `src/index.js`
