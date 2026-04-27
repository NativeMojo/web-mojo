# User Profile Extension

**Pre-built profile dialog with eleven sections (Profile, Personal, Security, Connected, Sessions, Devices, Security Events, Notifications, API Keys, Groups, Permissions) plus a post-login Passkey setup prompt.**

`web-mojo/user-profile` is a thin extension on top of the framework `View` system. The two headline classes — `UserProfileView` and `PasskeySetupView` — are mounted inside a `Dialog` and call REST endpoints exposed by the existing built-in `User`, `Passkeys`, and `Files` models. There is no separate registration step, no required `app.start()` hook, and no global state.

## Table of Contents

- [Overview](#overview)
- [Quick Start — Profile Dialog](#quick-start--profile-dialog)
- [Quick Start — Passkey Prompt](#quick-start--passkey-prompt)
- [`UserProfileView`](#userprofileview)
- [`PasskeySetupView`](#passkeysetupview)
- [Section Views](#section-views)
- [Models Used](#models-used)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

| Class | Purpose | Typical surface |
|---|---|---|
| `UserProfileView` | Full profile/settings dialog. Left rail of section links, right pane shows the active section. Loads the active user's full record on render. | Triggered from a topbar avatar menu, from a sidebar item, or after `setActiveUser`. |
| `PasskeySetupView` | One-shot post-login prompt. Three actions — *Create*, *Not now*, *Don't ask again*. Hands off to `Passkey` model for WebAuthn registration. | Shown once after login if the user has no passkey and hasn't dismissed it. |
| 11 `Profile*Section` views | Composable sections inside `UserProfileView`. Listed below — useful when you want a slimmed profile that omits some sections, or when a different host page wants to re-use one section. | Inside a custom profile shell, or as a standalone page. |

Both top-level views are `View` subclasses. Mount them with `Modal.dialog` (or `app.modal.dialog`).

## Quick Start — Profile Dialog

```js
import Modal from '@core/views/feedback/Modal.js';
import { UserProfileView } from 'web-mojo/user-profile';

const profile = new UserProfileView({ model: app.activeUser });

await Modal.dialog({
    body: profile,
    size: 'xl',
    header: null,
    buttons: [],
    noBodyPadding: true,
});
```

`UserProfileView` reads the user from `this.model`. It refetches on render so any changes since `setActiveUser` are picked up. The avatar slot is clickable — clicking it opens the avatar editor (writes a new `File` via the built-in `File` model and updates `model.avatar`).

## Quick Start — Passkey Prompt

```js
import Modal from '@core/views/feedback/Modal.js';
import { PasskeySetupView } from 'web-mojo/user-profile';

// Right after a successful login, if the user has no passkey:
if (!app.activeUser.get('passkey_count')) {
    const view = new PasskeySetupView();
    Modal.dialog({
        body: view,
        size: 'sm',
        centered: true,
        header: null,
        buttons: [],
    });
}
```

Three actions are wired:

- **Create Passkey** (`data-action="create-passkey"`) — prompts for a passkey name, then calls `Passkey.register()`. On success, shows a success dialog and closes.
- **Not now** (`data-action="skip"`) — closes the dialog. Will be shown again next login.
- **Don't ask again** checkbox (`data-action="dont-ask"`) — sets a `localStorage` flag the host can read to skip future prompts.

The view also exposes two static helpers used by the Create flow:

- `PasskeySetupView.showSuccess(name)` — confirmation dialog after registration.
- `PasskeySetupView.showError(message)` — error dialog on registration failure.

## `UserProfileView`

```js
new UserProfileView({
    model: User,           // required: the user record. Re-fetched on render.
    activeSection: string, // optional: which section to open initially. Defaults to 'profile'.
    sections: object,      // optional: override which sections render. Map section key → View class.
})
```

Section keys (and their default classes):

| Key | Default class |
|---|---|
| `profile` | `ProfileOverviewSection` |
| `personal` | `ProfilePersonalSection` |
| `security` | `ProfileSecuritySection` |
| `connected` | `ProfileConnectedSection` |
| `sessions` | `ProfileSessionsSection` |
| `devices` | `ProfileDevicesSection` |
| `security_events` | `ProfileSecurityEventsSection` |
| `notifications` | `ProfileNotificationsSection` |
| `api_keys` | `ProfileApiKeysSection` |
| `groups` | `ProfileGroupsSection` |
| `permissions` | `ProfilePermissionsSection` |

Override the `sections` option to drop, swap, or add custom panes. Each value is a `View` subclass that receives `{ model }` (the user) as constructor options.

## `PasskeySetupView`

```js
new PasskeySetupView()
```

No constructor options. The view reads no model — it's a pure prompt. Side effects all flow through the `Passkey` model.

Static methods:

| Method | Returns |
|---|---|
| `PasskeySetupView.showSuccess(name)` | Promise — confirmation dialog with "Done" button. |
| `PasskeySetupView.showError(message)` | Promise — error dialog. |

## Section Views

Eleven `View` subclasses, each renders one pane of the profile dialog. Use them directly when you want a sub-feature without the full shell.

| Class | Renders | Endpoint(s) |
|---|---|---|
| `ProfileOverviewSection` | Name, email, status badges, account summary. | `/api/user/{id}` |
| `ProfilePersonalSection` | Editable name, phone, locale, timezone. | `/api/user/{id}` |
| `ProfileSecuritySection` | Password change, MFA toggle, passkeys list. | `/api/user/{id}`, `/api/passkeys` |
| `ProfileConnectedSection` | OAuth providers + linked accounts. | `/api/user/{id}/connected` |
| `ProfileSessionsSection` | Active sessions; revoke individual or all. | `/api/account/sessions` |
| `ProfileDevicesSection` | Known devices (DUID, last seen, location). | `/api/account/devices` |
| `ProfileSecurityEventsSection` | Recent login events with geolocation. | `/api/account/logins` |
| `ProfileNotificationsSection` | Email/push notification preferences. | `/api/user/{id}/notifications` |
| `ProfileApiKeysSection` | List + create/revoke API keys. | `/api/account/api_keys` |
| `ProfileGroupsSection` | Group memberships and roles. | `/api/member` |
| `ProfilePermissionsSection` | Effective permission set per group. | `/api/user/{id}/permissions` |

All sections take `{ model: user }` and are mounted via the standard `addChild()` + `containerId` pattern when used outside `UserProfileView`.

## Models Used

The extension depends on three built-in models — already shipped via `web-mojo`:

- `User` / `UserList` — primary record. ([Built-in Models](../models/BuiltinModels.md#user--userlist))
- `Passkeys` (`Passkey` / `PasskeyList`) — WebAuthn registration and listing. ([Built-in Models](../models/BuiltinModels.md#passkeys))
- `Files` (`File`) — avatar uploads. ([Built-in Models](../models/BuiltinModels.md#files--fileslist))

No admin-only models are touched. The extension is safe in non-admin apps.

## Common Pitfalls

- **`UserProfileView` requires `model`.** It refetches the user on render — passing a stale record is fine, but a missing one will break the section views. Use `app.activeUser` after `setActiveUser`.
- **Section overrides receive only `{ model }`.** A custom section that needs more state should grab it from `this.getApp()` or the global event bus, not from constructor options.
- **`PasskeySetupView` doesn't track its own dismissal.** If you want "Don't ask again" to actually be honored, wire the `dont-ask` action handler in the host: read the checkbox, save to `localStorage`, and check that flag before mounting the view next time.
- **Mounting outside a Dialog works**, but the styles assume a modal-sized container — embed inside a `card`, `tab`, or `Dialog` body to get the right layout.

## Related Docs

- [`core/View.md`](../core/View.md) — the base class everything extends.
- [`components/Dialog.md`](../components/Dialog.md) — the host shell. `UserProfileView` is built to live inside one.
- [`models/BuiltinModels.md`](../models/BuiltinModels.md) — `User`, `Passkeys`, `Files`.
- [`extensions/Auth.md`](./Auth.md) — sign-in flow that runs *before* this extension shows up.
