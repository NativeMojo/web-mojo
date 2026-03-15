# Advanced User Profile

## Objective

Replace the current `PortalApp.showProfile()` model form dialog with a rich, multi-section `UserProfileView` shown in a fullscreen Dialog. Add a `PasskeySetupView` for post-login passkey prompting. All new views go in `src/core/views/user/` and are exported from `src/index.js`.

## UX Principles

- **KISS** — Show less, click to see more
- **Progressive disclosure** — Security is a dashboard of clickable cards; details open in nested Dialogs
- **4 nav sections, not 8** — Profile, Security, Groups, Permissions
- **Dialogs for detail views** — Passkeys, Sessions, Devices, Activity each open in their own Dialog
- **Fullscreen modal** — The profile view fills the screen (new pattern for the framework)

## Mockups

See `planning/mockups/`:

**Main sections (fullscreen modal with left nav):**
- `profile-overview.html` — Field rows: avatar, contact, personal, account info, permissions peek
- `profile-security.html` — Clickable card dashboard: password, passkeys, sessions, devices, activity
- `profile-groups.html` — Clean membership list with role badges
- `profile-permissions.html` — Role bar + flat permission tag cloud

**Detail dialogs (opened from Security cards):**
- `dialog-passkeys.html` — List passkeys, add/edit/delete
- `dialog-sessions.html` — Active sessions with revoke
- `dialog-devices.html` — Registered devices
- `dialog-activity.html` — Compact activity log with date separators

**Post-login prompt:**
- `passkey-setup.html` — Compact centered dialog, icon + one-liner + create/skip/don't ask

## Scope

### In Scope
- `src/core/views/user/` — New directory with all profile views
- `src/core/views/user/index.js` — Barrel exports
- `src/core/PortalApp.js` — Update `showProfile()`, add `showPasskeySetup()`
- `src/index.js` — Add exports

### Out of Scope
- Email change flow (complex verification — future)
- Phone change flow (complex verification — future)
- SMS/TOTP 2FA setup (display status only)
- Backend API changes
- Activity log API (structure only, graceful fallback if 404)

## Context

- Current `showProfile()` at `PortalApp.js:752-899` uses `Dialog.showModelForm()` with inline field config
- User model: `src/core/models/User.js` — endpoint `/api/user`, `hasPermission()`, static `PERMISSIONS` list
- Passkey model: `src/core/models/Passkeys.js` — `Passkey`, `PasskeyList`, `registerBegin()`/`registerComplete()`
- Device model: `src/core/models/User.js` — `UserDevice`, `UserDeviceList`, endpoint `/api/user/device`
- Member model: `src/core/models/Member.js` — `MemberList`, endpoint `/api/group/member`
- No `src/core/views/user/` directory exists yet
- Framework: View + `addChild()` + `containerId`, Mustache templates, `data-action` handlers

## Architecture

### View Hierarchy

```
UserProfileView (fullscreen Dialog body)
├── Left nav (in template, manages section switching)
├── ProfileOverviewSection  (default child, containerId: "profile-section")
├── ProfileSecuritySection  (swapped in on nav click)
├── ProfileGroupsSection
└── ProfilePermissionsSection

Detail Dialogs (opened from SecuritySection cards):
├── Dialog → PasskeyListView body
├── Dialog → SessionListView body
├── Dialog → DeviceListView body
└── Dialog → ActivityListView body

PasskeySetupView (standalone Dialog body, post-login)
```

### Navigation Pattern

UserProfileView has 4 nav items. Section switching:
1. Template: left nav + `<div id="profile-section">` content area
2. `this.activeSection` tracks current section name
3. `data-action="navigate"` with `data-section="profile|security|groups|permissions"`
4. `onActionNavigate(e, el)` — removes current section child, creates new one, adds + renders
5. Active nav class toggled

### Data Flow

- UserProfileView receives `model` (User) in constructor
- `onBeforeRender()`: `await this.model.fetch({params:{graph: 'full'}})`
- Sections share the same model via `addChild()`
- Detail views (passkeys, sessions, etc.) create their own collections in `onInit()` and are shown in nested Dialogs

## Implementation Steps

### Step 1: Create directory

```
src/core/views/user/
├── UserProfileView.js
├── ProfileOverviewSection.js
├── ProfileSecuritySection.js
├── ProfileGroupsSection.js
├── ProfilePermissionsSection.js
├── PasskeySetupView.js
└── index.js
```

Note: No separate files for detail dialog views (passkeys, sessions, devices, activity) — those are simple enough to define inline or as lightweight Views within SecuritySection. KISS.

### Step 2: UserProfileView.js — Main Container

- Extends `View`
- Constructor: `{ model }` (User instance)
- Template:
  - Top bar: close button (`data-action="close"`) + "Account" title + 3-dot context menu
  - Left nav (200px): Profile, Security, Groups, Permissions
  - Content area: `<div id="profile-section">`
- CSS: inline `<style>` in template (matches mockup layout styles)
- `onBeforeRender()`: `await this.model.fetch({params:{graph: 'full'}})`
- `onInit()`: creates `ProfileOverviewSection` as default child in `profile-section`
- `onActionNavigate(e, el)`:
  ```js
  const section = el.dataset.section;
  if (section === this.activeSection) return true;
  // remove current child
  if (this.sectionView) this.removeChild(this.sectionView);
  // create new section
  const SectionClass = this.getSectionClass(section);
  this.sectionView = new SectionClass({ model: this.model, containerId: 'profile-section' });
  this.addChild(this.sectionView);
  await this.sectionView.render();
  this.activeSection = section;
  // update nav active class
  this.element.querySelectorAll('.profile-nav .nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === section);
  });
  return true;
  ```
- `getSectionClass(name)` — returns class map: `{ profile: ProfileOverviewSection, security: ProfileSecuritySection, groups: ProfileGroupsSection, permissions: ProfilePermissionsSection }`
- `onActionClose()` — emits event or resolves dialog (the parent Dialog handles close)

### Step 3: ProfileOverviewSection.js

- Extends `View`
- Shared model from parent
- Template: field rows (see mockup `profile-overview.html`)
  - Avatar + name header
  - Contact: email (with verification badge + verify action), phone (with add/verify)
  - Personal: display name (editable), timezone (editable), organization (read-only)
  - Account: status badge, role, last login
  - Permissions peek: first 5 permission pills + "+N more" link
- View methods:
  - `getPermissionPeek()` — returns `{ items: [...first 5 labels], remaining: N }`
  - `isEmailVerified()` / `isPhoneVerified()` — boolean helpers for template
  - `hasPhone()` — checks if phone_number is set
- Actions:
  - `onActionChangeAvatar()` — opens file input, uploads via `model.save()` with base64
  - `onActionEditName()` — `Dialog.prompt('Display Name', ...)` → `model.save({display_name})`
  - `onActionEditTimezone()` — `Dialog.showForm()` with timezone select → `model.save()`
  - `onActionVerifyEmail()` — `rest.POST('/api/account/email/verify/send')` → toast
  - `onActionVerifyPhone()` — `rest.POST('/api/account/phone/verify/send')` → toast
  - `onActionAddPhone()` — toast "Coming soon" (out of scope)

### Step 4: ProfileSecuritySection.js

- Extends `View`
- Template: clickable card rows (see mockup `profile-security.html`)
  - Password card: icon, "Last changed X ago", "Change" badge
  - Passkeys card: icon, "N passkeys registered", chevron
  - Sessions card: icon, "N active sessions", chevron
  - Devices card: icon, "N registered devices", chevron
  - Activity card: icon, "Last sign-in X ago from Y", chevron
- View methods:
  - `getPasskeyCount()` — fetches count from `/api/account/passkeys?size=0` or stored
  - `getSessionCount()` — similar
  - `getDeviceCount()` — similar
- Actions (each opens a nested Dialog):
  - `onActionChangePassword()` — delegates to `this.getApp().changePassword()`
  - `onActionManagePasskeys()` — creates `PasskeyList`, fetches, builds simple View, shows in `Dialog.showDialog({ body: view, size: 'md' })`
  - `onActionViewSessions()` — fetches `/api/account/sessions`, builds View, shows in Dialog
  - `onActionViewDevices()` — creates `UserDeviceList`, fetches, builds View, shows in Dialog
  - `onActionViewActivity()` — fetches `/api/account/activity`, builds View, shows in Dialog (graceful 404 fallback)

For the detail Dialog views, use lightweight inline View classes or helper methods that create a View on the fly:

```js
async onActionManagePasskeys() {
    const collection = new PasskeyList();
    await collection.fetch();

    const view = new View({
        template: `
            {{#items}}
            <div class="pk-row">...</div>
            {{/items}}
            {{^items|bool}}
            <div class="empty-state">No passkeys registered</div>
            {{/items|bool}}
        `
    });
    view.items = collection.toArray();

    const result = await Dialog.showDialog({
        title: 'Passkeys',
        body: view,
        size: 'md',
        buttons: [
            { text: 'Add Passkey', icon: 'bi-plus-lg', class: 'btn-primary', value: 'add' },
            { text: 'Close', class: 'btn-outline-secondary', dismiss: true }
        ]
    });

    if (result === 'add') {
        await this.registerPasskey();
    }
    return true;
}
```

### Step 5: ProfileGroupsSection.js

- Extends `View`
- `onInit()`: creates `MemberList`, fetches with `params: {user: this.model.id}`
- Template: section label + group rows with avatar initials, name, kind, member count, role badge
- View method: `getMemberships()` — returns collection as array for template iteration

### Step 6: ProfilePermissionsSection.js

- Extends `View`
- Pure template — no fetching (permissions already on user model)
- Template:
  - Role bar: "Superuser — full system access" if `model.is_superuser`
  - Section label + permission tag grid
- View method: `getPermissionTags()` — maps `model.permissions` object to `[{name, label}]` array using `User.PERMISSIONS` static list

### Step 7: PasskeySetupView.js

- Extends `View`
- Standalone view for Dialog body
- Template: icon + title + one-liner + Create button + Skip button + "Don't ask again" checkbox
- Actions:
  - `onActionCreatePasskey()` — runs WebAuthn flow via `Passkey.registerBegin()` / `registerComplete()`
  - `onActionSkip()` — resolves dialog (dismiss)
  - `onActionDontAsk()` — sets `localStorage.setItem('passkey_setup_dismissed', '1')`

### Step 8: Update PortalApp.js

Replace `showProfile()` (lines 752-899):

```js
async showProfile() {
    if (!this.activeUser) {
        this.showError("No user is currently logged in");
        return;
    }

    const { UserProfileView } = await import('@core/views/user/index.js');
    const profileView = new UserProfileView({ model: this.activeUser });

    await Dialog.showDialog({
        body: profileView,
        size: 'fullscreen',
        class: 'p-0',
        scrollable: false,
        buttons: [],
        contextMenu: [
            { icon: 'bi-lock', label: 'Change Password', action: 'change-password', value: 'change-password' },
            { icon: 'bi-envelope', label: 'Update Email', action: 'update-email', value: 'update-email' },
            { icon: 'bi-phone', label: 'Update Phone', action: 'update-phone', value: 'update-phone' },
        ]
    });
}
```

Add `showPasskeySetup()`:

```js
async showPasskeySetup() {
    if (localStorage.getItem('passkey_setup_dismissed')) return;

    const { PasskeySetupView } = await import('@core/views/user/index.js');
    const setupView = new PasskeySetupView();

    await Dialog.showDialog({
        body: setupView,
        size: 'sm',
        centered: true,
        buttons: []
    });
}
```

### Step 9: Update exports

`src/core/views/user/index.js`:
```js
export { default as UserProfileView } from './UserProfileView.js';
export { default as PasskeySetupView } from './PasskeySetupView.js';
```

`src/index.js` — add:
```js
export { UserProfileView, PasskeySetupView } from '@core/views/user/index.js';
```

### Step 10: CSS Strategy

Inline styles in templates. The profile layout CSS is self-contained:
- Flexbox layout (nav + content)
- Field rows, section labels, badges — all simple CSS
- No external CSS file needed
- Bootstrap utility classes for everything else

## Edge Cases

- **No passkeys/sessions/devices API**: Detail dialogs catch fetch errors, show "No data" or "Not available"
- **Activity API returns 404**: Show "Activity log coming soon" in dialog
- **User has no phone**: Show "Not set" + "Add" action (which toasts "Coming soon")
- **User has no avatar**: Show initials circle via `{{model.display_name|initials}}` formatter
- **Mobile/narrow viewport**: Left nav + content may need to stack. Consider hiding nav below 768px and showing a dropdown or tabs instead. Can be a follow-up.
- **Context menu actions**: `change-password` → existing `PortalApp.changePassword()`. `update-email`/`update-phone` → toast "Coming soon"
- **Permissions empty**: Show "No permissions assigned" text
- **Model fetch fails**: Show error via `Dialog.alert()`, close profile

## Deliverable

1. `src/core/views/user/` directory with all view files
2. `PortalApp.showProfile()` updated to fullscreen Dialog with UserProfileView
3. `PasskeySetupView` + `showPasskeySetup()` on PortalApp
4. Exports in `src/core/views/user/index.js` and `src/index.js`
5. `CHANGELOG.md` updated
6. Verify: `app.showProfile()` in console → fullscreen profile with 4 nav sections
