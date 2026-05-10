# UserProfileView — Sessions / Devices / Security Events ListView migration

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | 2026-05-10 |
| Priority | medium |

## Description

Migrate three customer-facing sections under the user-profile extension from `TableView` to `ListView`, adopt `dayRangeFilter` + `groupByDay`, and redesign the row templates to read as a customer-friendly feed rather than an admin data grid.

The three sections:

1. **Sessions** — `ProfileSessionsSection.js` — "your recent sign-ins" list, each row a session with browser/device/location/IP. Click → detail dialog. Should support "Sign out this session" affordance.
2. **Devices** — `ProfileDevicesSection.js` — "your registered devices" list. Click → detail dialog. Should support "Remove device" affordance.
3. **Security Events** — `ProfileSecurityEventsSection.js` — auth-relevant event feed (logins, password changes, failed attempts). Color-coded by severity.

This is parallel to the admin TablePages UX sweep but lives in `src/extensions/user-profile/` and is customer-facing, not admin-facing. The admin sweep prioritized power-user features (dense columns, multi-select, batch actions); this one prioritizes calm, scannable UX appropriate for end users opening their profile settings.

## Context

### Why ListView over TableView for these surfaces

TableView's value proposition — sortable columns, batch actions, dense column packing, footer totals — is the wrong fit for customer-facing profile sections. End users opening "Recent Sessions" in their profile don't want a sortable data grid; they want a list that reads like "your iPhone, signed in from San Francisco, 2 hours ago — sign out?" That's a `ListView` with rich item templates and per-item action affordances.

Both today's TableView implementations and the proposed ListView implementations use the same underlying primitives (`itemTemplate`, `dayRangeFilter`, `groupBy`, item-level click and action wiring) — the migration is mostly about dropping the table chrome (column headers, `<tr>`/`<td>` structure, alignment) and letting the item template breathe.

### Current state

Each of the three sections today:

- Wraps a `TableView` instance with a hand-rolled `TableRow` subclass (`SessionRow`, `DeviceRow`, `SecurityEventRow`).
- Renders a "rich two-line row" via inline `template:` strings in the column config — primary line on top, secondary metadata below.
- Has `searchable: false`, `filterable: false`, `selectable: false`, `actions: null` — none of the table-grid features are actually used.
- Wires `clickAction: 'view'` plus a custom `onItemView: (model) => this._showSessionDetail(model)` (or equivalent), which opens a hand-rolled `Modal.dialog` with a row-by-row label/value detail table.
- No date-range filtering. No grouping. No mobile-specific tweaks.

The TableView shape was the wrong tool — these sections were never going to grow into "sort by column, select multiple, batch delete." They're chronological feeds with one action per row.

### What changes

- **TableView → ListView** in all three sections. `TableRow` subclasses become `ListViewItem` subclasses (or, more likely, get dropped entirely in favor of a single `itemTemplate` string + computed properties on the wrapping `View`).
- **`dayRangeFilter: true`** on each section. Sessions and Security Events are chronological feeds where a 1d/7d/30d/90d segment is natural. Devices uses `{ field: 'last_seen', value: '30d' }` since "all my devices ever" isn't a useful default — recent-30d is.
- **`...groupByDay('last_seen')`** on Sessions and Devices; **`...groupByDay('created')`** on Security Events. Headers read "Today / Yesterday / May 5" — same as the admin audit feeds adopted in the original sweep.
- **Row design redesign.** See "Row design principles" below — bigger tap targets, primary action prominent, secondary metadata muted, no table-grid scaffolding.
- **Modal detail dialogs** stay (clicking a row to see ISP/ASN/threat-level remains useful) but get a customer-friendly polish — drop the inline `<div class="up-detail-row">` flat-rows in favor of `Modal.detail()` with the canonical DetailView envelope (or a simpler KnownFieldsCard if DetailView is overkill).

## Acceptance Criteria

### A. ProfileSessionsSection — list of recent sign-ins

- Migrate `ProfileSessionsSection.js` from TableView to ListView.
- Drop `SessionRow extends TableRow`; replace with computed properties on the wrapping View, fed into an `itemTemplate` string. (Or keep a `ListViewItem` subclass if computed-getter ergonomics matter; choice during build.)
- Adopt `dayRangeFilter: true` (writes `created__gte`) and `...groupByDay('last_seen')`.
- Each row shows:
  - **Tonal icon column** (44×44, matches DetailView header `iconHtml` slot pattern) — phone or laptop icon, neutral background.
  - **Primary line:** "Chrome 122 on iPhone 13" — browser + device, larger type.
  - **Secondary line:** "San Francisco, CA · 192.168.1.1 · 2 hours ago" — location, IP, relative time, muted.
  - **Threat-flag chips** (VPN / Tor / Proxy) inline at the end of the secondary line, only when present. Same chip pattern from DetailView.
  - **"This device" badge** on the row matching the current session (resolved via app context or a model `is_current` flag).
  - **Per-row "Sign out" action** — small ghost-icon button on the right side of the row (data-action="sign-out"). Routes to `model.destroy()` or whatever the API requires. Confirms via `Modal.confirm` if and only if the row is the current device.
- Click anywhere on the row body (outside the Sign-Out button) → existing detail modal flow.
- Modal detail: replace the hand-rolled `up-detail-row` flat-rows with `Modal.detail()` envelope hosting a `KnownFieldsCard` for Identity (Browser / Device / OS / IP / Location / ISP / ASN) and a compact threat-flag chip strip if applicable. Same chip cards / KnownFieldsCard pattern UserView uses.

### B. ProfileDevicesSection — list of registered devices

- Migrate `ProfileDevicesSection.js` from TableView to ListView.
- Drop `DeviceRow extends TableRow`; same approach as Sessions.
- Adopt `dayRangeFilter: { field: 'last_seen', value: '30d' }` so the default view is "devices seen in the last 30 days" (sets the expectation that older devices are rolled off; user can switch to 90d for "all" effectively).
- Adopt `...groupByDay('last_seen')` for the chronological feed shape.
- Each row shows:
  - **Tonal icon column** — phone or laptop, neutral background.
  - **Primary line:** "Apple iPhone 13" (brand + family + optional model).
  - **Secondary line:** "Safari 17 · iOS 17.4 · last seen 2 hours ago" — browser, OS, relative time.
  - **"Trusted" badge** for devices marked trusted (if the model carries that flag).
  - **Per-row "Remove" action** (ghost-icon trash button, data-action="remove"). Confirms via `Modal.confirm`. Calls `model.destroy()` and refreshes.
- Click anywhere on the row body → existing detail modal flow (refreshed with the same DetailView/KnownFieldsCard pattern).

### C. ProfileSecurityEventsSection — auth event feed

- Migrate `ProfileSecurityEventsSection.js` from TableView to ListView.
- Drop `SecurityEventRow extends TableRow`; keep the `kindBadgeClass` / `kindLabel` / `kindIcon` getter logic — they're domain-specific and well-factored — but compute them either on a `ListViewItem` subclass or via an `itemTemplate`-driven `View` wrapper.
- Adopt `dayRangeFilter: true` and `...groupByDay('created')`.
- Each row shows:
  - **Severity-tonal icon column** — green for SUCCESS_KINDS, red for DANGER_KINDS, neutral grey for the rest. Larger than today's tiny inline badge — 32×32 minimum tap target on mobile.
  - **Primary line:** the human-readable kind label ("Login", "Invalid Password", "Email Verified") with no badge wrapper — the icon column carries the severity color.
  - **Secondary line:** the `summary` field + `ip` + `created|relative`. Muted.
  - **No per-row action** (security events are immutable audit history — same principle as the admin LogTablePage cleanup in the original sweep).
- Replace the existing `kind` column badge template (`<span class="badge {{kindBadgeClass}}">...</span>`) with the icon-column severity scheme, since the badge approach repeats the same color twice and crowds the row.

### D. Row design principles (apply to all three sections)

This is the "make ListItem design clean and customer friendly" piece. Per-section details above; the cross-cutting principles:

- **Bigger tap targets on mobile.** Per-row action buttons need ≥40×40px touch surface. The current table-cell inline buttons are too small for phone use.
- **No table chrome.** No column headers, no zebra striping, no `<th>` rows. ListView's natural shape — a vertical stack of card-like rows.
- **Tonal icon column** on the left of every row, matching the DetailView header `iconHtml` slot pattern (44×44 with neutral or severity-tinted background). This is a strong scannable anchor across the three sections.
- **Two-line text block** — primary line in `--bs-body-color`, secondary line in `--bs-secondary-color`. Same scale as DetailView's flat-rows.
- **Action affordance on the right** — ghost-icon button (Sign Out / Remove), only one action per row, no overflow menu (these surfaces are simple enough that an overflow ⋮ is overkill).
- **Dark theme** — every color / surface uses Bootstrap tokens (`--bs-body-bg`, `--bs-tertiary-bg`, `--bs-border-color`, etc.) so the rows track the `[data-bs-theme]` value without per-component overrides. Already the project rule (`.claude/rules/theming.md`); this just locks it in for the new templates.
- **Empty state** — friendly copy on each list ("No active sessions" → "You're not signed in on any other devices."). Customer-facing surface, not admin tone.

### E. Tests

- Unit: instantiation tests for each migrated section asserting the ListView is constructed with the expected `dayRangeFilter` / `groupBy` shape (regression for the original sweep's "TablePage drops options silently" bug — verify the same options actually arrive on the inner ListView, not just on the section's config).
- Unit: row-template smoke tests — render with a fixture model, assert the primary line contains the expected text and the secondary line contains location / IP / browser as appropriate.
- Manual: open the user-profile page in `npm run dev` (the examples portal includes a profile demo), verify all three sections render, day-range segment toggles, group headers appear, per-row actions confirm.

### F. Documentation + CHANGELOG

- CHANGELOG entry under "User Profile extension" (or "User profile views") — single bullet group covering the three migrations.
- No new framework features to document — this consumes existing ListView / DetailView / KnownFieldsCard primitives. The user-profile section docs (if they exist under `docs/web-mojo/extensions/`) get a small refresh noting the ListView shape.

## Investigation

### What exists

- `src/extensions/user-profile/views/ProfileSessionsSection.js` (158 LOC) — TableView + SessionRow + `_showSessionDetail`.
- `src/extensions/user-profile/views/ProfileDevicesSection.js` (136 LOC) — TableView + DeviceRow + `_showDeviceDetail`.
- `src/extensions/user-profile/views/ProfileSecurityEventsSection.js` (106 LOC) — TableView + SecurityEventRow.
- All three already import their collections from `@core/models/User.js` (`UserDeviceLocationList`, `UserDeviceList`) or define a local `SecurityEventList`.
- The `dayRangeFilter` and `groupByDay` features land via ListView (TableView inherits them); ListView accepts the same option names, so the migration is mostly "swap the parent class and rewrite the item template."

### Constraints

- **No backend / API contract changes.** Sessions/devices/security-events endpoints stay as-is.
- **Modal detail flow preserved.** Customers may already have muscle memory for clicking a row and seeing a detail dialog; keep the click → detail behavior but polish the dialog body.
- **Theme compliance** — every new template + CSS rule must follow `.claude/rules/theming.md` (Bootstrap tokens, paired light + dark overrides for any inline `<style>` blocks).
- **No new external CSS files** if it can be avoided. The new row design should land in `src/core/css/core.css` if it's reusable across consumers (likely — this is the canonical "customer-feed row" pattern), or in `src/extensions/user-profile/css/` if it's profile-specific. Avoid inline `<style>` blocks in the section View files.
- **Public behavior preserved** — list contents stay identical; only the rendering shape changes. Existing tests that interrogate model data should keep passing.

### Related files

- `src/extensions/user-profile/views/{ProfileSessionsSection,ProfileDevicesSection,ProfileSecurityEventsSection}.js` — the three section files being migrated.
- `src/extensions/user-profile/css/` (if it exists) or `src/core/css/core.css` — for the new row design rules.
- `src/extensions/user-profile/views/UserProfileView.js` — verify the section embedding pattern still works (probably no change needed; sections are addChild'd into containers).
- `docs/web-mojo/components/ListView.md` — no doc change needed; this consumes existing ListView features.
- `CHANGELOG.md` — new bullet group.

### Endpoints

None added or modified.

### Out of scope

- **Other profile sections.** `ProfileGroupsSection`, `ProfileApiKeysSection`, `ProfileNotificationsSection`, `ProfileActivitySection`, `ProfilePersonalSection`, `ProfilePermissionsSection`, `ProfileSecuritySection`, `ProfileConnectedSection`, `ProfileOverviewSection` — none of these are in scope. If they have similar issues, file separately or extend this request when a concrete need is observed.
- **`UserProfileView.js` itself.** The top-level profile page that hosts the sections — not touched unless the section migration reveals a wiring issue.
- **Profile editing flows** — personal info edit modals, password change UI, etc. — separate concerns.
- **PasskeySetupView** — separate flow with its own UX requirements.
- **"Sign out all other sessions" bulk action** — could be a natural follow-up after Sessions migrates. Defer to a separate request once the per-row Sign Out behavior is shipped and we can observe how often a "sign out all" affordance is requested.
- **Device-trust workflow** — if devices have a "trusted" toggle, that's its own UX problem (when does a device become trusted? does the user confirm? what does losing trust mean?). The "Trusted" badge in Acceptance B is read-only display of the existing flag; managing trust is out of scope.
- **Push notification preferences per device** — out of scope; lives in `ProfileNotificationsSection`.
- **Mobile responsive layout** at the section / page level — keep what's there; the row design changes are mobile-friendly per-row but the surrounding profile-page layout isn't this request's concern.

### Open questions for the build phase

- **Is there an `is_current` flag on `UserDeviceLocation` models** to mark the current session, or does the client need to resolve it from app context (browser fingerprint vs. session record)? Build phase verifies. If no flag exists, defer the "This device" badge to a follow-up rather than inventing a backend dependency.
- **Sessions per-row "Sign out" — what's the actual API call?** `model.destroy()` (REST DELETE on the session) is the natural framework shape, but some backends model session revocation as a state change rather than a delete. Verify against the consuming app's API before wiring.
- **DetailView vs. KnownFieldsCard vs. inline `Modal.dialog` body** — three options for the detail-dialog body shape, ranked: DetailView is the canonical envelope (matches IncidentView / ShortLinkView / UserView), KnownFieldsCard is lighter weight (just the identity flat-rows), inline HTML is what exists today. Build phase picks the right one based on how much real estate the detail content actually fills.
- **Where the row-design CSS lives** — `core.css` if it's a reusable "customer-feed row" pattern, `user-profile.css` if it's tied to this extension. If it ends up reusable, file a small follow-up to extract the class names into a documented `.customer-row` / `.cfr-icon` / `.cfr-primary` / `.cfr-secondary` pattern so other consumer surfaces (the chat extension's threads list, perhaps) can pick it up.

If any of these turn out to be larger than judgment calls during build, stop and flag rather than expanding scope.
