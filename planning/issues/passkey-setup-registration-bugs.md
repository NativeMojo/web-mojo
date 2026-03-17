# PasskeySetupView Registration Bugs
**Type**: bug
**Status**: resolved
**Date**: 2026-03-16

## Description
PasskeySetupView.js had multiple bugs in the passkey registration flow: wrong response field checks, double-unwrapped response data, incorrect base64 encoding, and the friendly name prompt appeared after the OS credential was already created.

## Steps to Reproduce
1. Log in and trigger passkey setup prompt
2. Click "Create Passkey"
3. OS biometric prompt appears and credential is created on device
4. Only then does the "Name this passkey" dialog appear
5. Registration may fail due to malformed base64 in the complete request

## Expected Behavior
- Name prompt appears before the OS passkey dialog
- Credential data is encoded as base64url (URL-safe, no padding)
- Response status is checked correctly (`resp.status`, not `resp.success`)
- `resp.data` is destructured once to get `{ challenge_id, publicKey }`

## Actual Behavior
- `beginResp.success` checked but REST returns `status` not `success`
- `beginResp.data.data || beginResp.data` double-unwraps the response
- `btoa()` produces standard base64 (`+`, `/`, `=`) instead of base64url (`-`, `_`, no padding)
- `navigator.credentials.create()` called before name prompt — credential created on device before user names it
- Cancelling the name prompt still leaves an orphaned credential on the device

## Context
- File: `src/core/views/user/PasskeySetupView.js`
- API: `POST /api/account/passkeys/register/begin` → `POST /api/account/passkeys/register/complete`
- REST service returns `{ status, data, code }` envelope
- WebAuthn spec requires base64url encoding for credential fields

---
## Resolution
**Status**: Resolved — 2026-03-16
**Root cause**: Multiple issues from initial implementation: wrong response property names, unnecessary double-unwrap from a previous `dataOnly` attempt, standard base64 instead of base64url, and flow ordering (name prompt after OS credential creation).
**Files changed**: `src/core/views/user/PasskeySetupView.js`
**Tests added**: —
**Validation**: Manual — verify name prompt appears first, credential encodes as base64url, registration completes successfully
