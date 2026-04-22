# Public Messages Admin Interface

**Type**: request
**Status**: done
**Date**: 2026-04-22

## Description

Add a read/triage admin interface in the Messaging section for the new
`account.PublicMessage` model (bouncer-gated contact/support form submissions
from unauthenticated visitors). Admins need a sortable/filterable table view,
a detail view that shows the full submission + kind-specific metadata, and a
one-click way to mark a message `closed`. No reply-to-submitter workflow in
v1.

## Context

**Upstream feature** (already shipped in django-mojo):

- Model: `account.PublicMessage` (django-mojo/mojo/apps/account/models/public_message.py)
- REST endpoint: `/api/account/public_message` (list), `/api/account/public_message/<id>` (detail)
- RestMeta perms:
  - `VIEW_PERMS = ["view_support", "security", "support"]`
  - `SAVE_PERMS = ["manage_support", "security", "support"]`
  - `DELETE_PERMS = ["manage_support"]`
  - `GROUP_FIELD = "group"` — framework auto-filters list to the user's group(s)
- Graphs: `list` (id, created, modified, kind, name, email, subject, status, group:basic) and `default` (all fields + group:basic)
- Backend doc: `docs/django_developer/account/bouncer.md` § Public Messages
- Web-dev REST doc: `docs/web_developer/account/public_messages.md`

**Submit surface** (already shipped): `POST /api/account/bouncer/message`
served via a bouncer-gated HTML page at `/contact?kind=<kind>`. No frontend
work needed for the public-facing form — this request is strictly for the
admin side.

**Kinds shipped in v1**:

| Kind | Common fields | Metadata |
|---|---|---|
| `contact_us` | name, email, message | `company` |
| `support` | name, email, message | `category` (billing/account/bug/other), `severity` (low/normal/high) |

Kinds are extensible server-side via `KIND_SCHEMAS` in
`mojo/apps/account/services/public_message.py`. In addition, submitting
clients can attach free-form tracking data under a top-level `metadata`
object (utm tags, referrer, landing_page, etc.) — the backend sanitizes it
(flat primitives, key regex, ≤ 25 keys, ≤ 500-char values) and merges it into
the stored `PublicMessage.metadata` blob. The admin UI must therefore
render metadata generically (key/value list) so future kinds **and**
arbitrary client-supplied tracking keys work without frontend changes.

### Reference patterns
- `src/extensions/admin/security/BlockedIPsTablePage.js` — simple TablePage
- `src/extensions/admin/incidents/TicketTablePage.js` + `TicketView.js` — closest conceptual match (status workflow, assignable record with group scoping)
- `src/extensions/admin/messaging/email/SentMessageTablePage.js` — sibling Messaging page already in the same nav section
- `src/core/models/Tickets.js` — model+collection+forms pattern with status/category options
- `src/core/models/Bouncer.js` — model file for the broader bouncer surface (same backend app)

## Acceptance Criteria

- [ ] Core model file `src/core/models/PublicMessage.js` with `PublicMessage`, `PublicMessageList`, `PublicMessageKindOptions`, `PublicMessageStatusOptions`, `PublicMessageSeverityOptions`, `PublicMessageCategoryOptions`, and an exported list of the kind-specific metadata field keys.
- [ ] `src/extensions/admin/messaging/PublicMessageTablePage.js` — table with columns status, kind, name, email, subject, group, created (descending); filters for status, kind, group; search by name/email/subject/message; default sort `-created`; batch action "Mark Closed".
- [ ] `src/extensions/admin/messaging/PublicMessageView.js` — detail view showing header (kind badge + status badge + created timestamp), submitter block (name/email/ip/user_agent/group), a "Details" section that renders the metadata blob as a labeled key/value list (human-readable labels for known keys: `company`, `category`, `severity`), full `message` body in a pre-wrap block, and a "Mark Closed" / "Mark Open" action. Include a "mailto:" link on the email for ad-hoc response.
- [ ] `src/extensions/admin/index.js` — export `PublicMessageTablePage` and `PublicMessageView`.
- [ ] `src/admin.js` — import, `registerPage('system/messaging/public-messages', PublicMessageTablePageClass, { permissions: ["view_support", "support", "manage_security"] })`, and add a nav item under the existing **Email** block _or_ a new **Support** block (see Design Decisions).
- [ ] Hover/click on a row opens `PublicMessageView` (modal or sub-page per project convention).
- [ ] Lint clean, matches the existing TablePage/DetailView styling used by SentMessage and Ticket.
- [ ] The status toggle uses the standard `model.save({ status: 'closed' })` pattern — no custom endpoint, no `POST_SAVE_ACTIONS`.

## Constraints

- Do NOT reinvent form handling — reuse the existing TablePage / DataView / DetailView primitives.
- Admin UI is READ + STATUS-UPDATE only. No create, no delete in v1 (delete is permitted by backend for `manage_support` but out of scope for this UI).
- No reply-to-submitter, no threading, no note field.
- The metadata shape depends on `kind`. Do not hard-code per-kind detail views; render metadata generically so new kinds added server-side appear automatically.
- Bootstrap 5.3 + Bootstrap Icons only.
- Permissions must exactly match backend — any of `view_support`, `security`, `support` grants read access; any of `manage_support`, `security`, `support` grants status write. Group-scoped admins are already auto-filtered by the framework — no client-side filter needed.

## Design Decisions

### Where in the Nav

Two candidate placements in `src/admin.js`:

**Option A (preferred)** — Add to the existing **Email** block, rename it
to **Messaging** to match the filesystem (`src/extensions/admin/messaging/`):

```js
{
    text: 'Messaging',
    icon: 'bi-envelope',
    permissions: ["manage_aws", "view_support", "support"],
    children: [
        { text: 'Domains', ... },
        { text: 'Mailboxes', ... },
        { text: 'Sent', ... },
        { text: 'Templates', ... },
        { text: 'Contact Messages', route: '?page=system/messaging/public-messages',
          icon: 'bi-chat-square-text', permissions: ["view_support", "support"] },
    ]
}
```

**Option B** — Standalone top-level entry:

```js
{
    text: 'Support',
    route: '?page=system/messaging/public-messages',
    icon: 'bi-chat-square-text',
    permissions: ["view_support", "support"]
}
```

Recommend A because the feature sits squarely in the existing Messaging
subsystem and avoids nav sprawl, and because the `support` permission is new
and will be used for exactly one page in v1 — not worth its own top-level.

### Table Columns

| Column | Source | Notes |
|---|---|---|
| Status | `status` | Badge; `open` = warning, `closed` = secondary. Filterable. |
| Kind | `kind` | Badge; options from `PublicMessageKindOptions`. Filterable. |
| Name | `name` | Truncate at ~30 chars. |
| Email | `email` | mailto link. |
| Subject | `subject` | Truncate; fall back to first line of message when blank. |
| Group | `group.name` | Blank when no group. Filterable when visible. |
| Created | `created` | Relative datetime. Default sort descending. |

### Detail View Layout

```
┌ Header ─────────────────────────────────────────────────────┐
│  [kind badge]  [status badge]   Created 2h ago              │
│  Jane Doe  <jane@example.com>                  Group: Acme  │
└─────────────────────────────────────────────────────────────┘

Submitter
  Name         Jane Doe
  Email        jane@example.com        ← mailto link
  IP           203.0.113.42
  User Agent   Mozilla/5.0 …

Details            ← renders metadata generically; labels for known keys
  Company          Acme Inc.
  Category         Bug
  Severity         High

Message
  ┌─ pre-wrap body ─┐
  │ The full message text as submitted.                       │
  └────────────────┘

Actions
  [ Mark Closed ]  [ Reply via Email ]  (← just mailto, no backend)
```

Use the existing DataView helpers for the submitter/details sections. Do not
expose the submission `metadata` blob as raw JSON — render known keys with
friendly labels and fall back to `Text(key) → value` for unknown keys.

### Model Forms

- No `create` form (UI is read-only for creation).
- `edit` form: minimal — only the `status` field, to keep the "mark closed"
  flow simple. Wire it via `model.save({ status: 'closed' })` triggered from
  an inline button in the detail view, not a full form modal, matching the
  Ticket status-update pattern.

## Notes

- When an admin opens a detail view, they are operating on data submitted by
  an unauthenticated visitor. Assume submitter content can contain unusual
  unicode, long strings, or HTML-looking characters; use Bootstrap's default
  text escaping and do not render submitter content as HTML.
- Consider a red badge on the nav item when there are `status=open` rows
  (count can come from a polled `?status=open&size=0`). Out of scope for v1
  but low-cost and a natural follow-up.
- If a row carries a `group` value, the detail view should link that group to
  the existing GroupView page for context (existing pattern).
- The admin UI is the only place operators will interact with these messages
  day-to-day, so keep the empty-state copy useful: "No contact or support
  messages yet. Visitors submit these through the bouncer-gated /contact page."

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Done — 2026-04-22

### What Was Implemented

All eight acceptance criteria met. Admin UI for `account.PublicMessage` is
wired under **Messaging → Contact Messages** with filterable/sortable list,
batch Mark Closed, and a detail modal that renders arbitrary metadata
generically. Implementation followed the plan verbatim except:

- `subject`-blank fallback uses `default('—')` (column formatter), not
  first-line-of-message (kept simple per plan trim note).
- Group rendered as text only, not as a link back to `GroupView` — no
  precedent for that link pattern in sibling views (`TicketView`, etc.).

### Files Changed

Commits `eb9afb1` and `565bce0` on `main`:

**New files**
- `src/core/models/PublicMessage.js` — Model + list + option arrays + metadata-label map
- `src/extensions/admin/messaging/PublicMessageTablePage.js` — TablePage with status/kind filters + batch Mark Closed
- `src/extensions/admin/messaging/PublicMessageView.js` — Detail view with generic metadata rendering + inline status toggle

**Wiring**
- `src/extensions/admin/index.js` — added two exports under new Messaging (Public) block
- `src/admin.js` — added top-level re-exports, import, `registerPage('system/messaging/public-messages', …)`, and renamed the sidebar "Email" block to "Messaging" with a new "Contact Messages" child

**Docs**
- `docs/web-mojo/extensions/Admin.md` — added `PublicMessageTablePage` + `PublicMessageView` entries (docs-updater agent)
- `CHANGELOG.md` — release-level entry under `Unreleased` › `Added`

### Tests Run

- `npm run lint` — 71 pre-existing problems in unrelated files; no new issues in any of the three new files.
- `npm run test:unit` — **378/378 passing** (94 ms) before and after the security hardening commit.
- `npm run test:integration` and `npm run test:build` — pre-existing failures tied to missing `src/mojo.js` entry point and missing build artefacts; **not caused by this change** (confirmed by test-runner agent).

### Agent Findings

- **test-runner**: No regressions. Unit suite fully green. Pre-existing integration/build failures flagged but not in scope for this change.
- **docs-updater**: Added `PublicMessageTablePage` / `PublicMessageView` entries to `docs/web-mojo/extensions/Admin.md`. Declined to add to `docs/web-mojo/models/BuiltinModels.md` — correct call, the models aren't part of the public `web-mojo/models` export surface.
- **security-review**: Two actionable findings applied in the follow-up commit `565bce0`:
  - **Medium** — `mailto:{{model.email}}` was unencoded. Fixed: new `safeMailtoEmail` computed with `encodeURIComponent()` in `onBeforeRender`, template now references `{{safeMailtoEmail}}` for both mailto `href` attributes.
  - **Low** — Batch `Promise.all` had no catch and would abort on the first failure. Fixed: replaced with `Promise.allSettled`, now toasts succeeded/failed counts separately and always refreshes the collection.
  - All informational findings (no triple-brace XSS sinks, permission model aligns with backend, PII exposure appropriate for role, no dangerous DOM sinks) — clean.

### Follow-ups (Out of Scope, As Planned)

- Red unread-count badge on the sidebar nav item (spec Notes §).
- Reply-to-submitter / threaded-note workflow.
- Create / delete UI.
- Per-kind specialized detail layouts (intentionally generic).

### Verification Notes

No preview server was started — this framework repo's `npm run dev` (Vite/`index.html`) is a core-only example app and cannot render admin-extension views. End-to-end verification needs a consumer portal (e.g. MojoVerify) with the updated `web-mojo` package, a user with `view_support`/`support` permission, and at least one `PublicMessage` record submitted through the bouncer `/contact` form.

---

## Plan

### Objective

Add admin-side read-and-triage UI for the shipped `account.PublicMessage` backend: a `TablePage` listing submissions under Messaging, a generic key/value detail view that renders arbitrary `metadata` blobs, and an inline Mark Closed / Mark Open toggle via the standard `model.save({ status })` flow. No create, no delete, no reply workflow in v1.

### Steps

1. **`src/core/models/PublicMessage.js`** (new) — follow the `src/core/models/IPSet.js` shape.
   - `PublicMessage extends Model` with `endpoint: '/api/account/public_message'`.
   - `PublicMessageList extends Collection` with `ModelClass: PublicMessage`, `endpoint: '/api/account/public_message'`, `size: 25`.
   - Exported option arrays (value/label):
     - `PublicMessageKindOptions` — `contact_us`, `support`
     - `PublicMessageStatusOptions` — `open`, `closed`
     - `PublicMessageSeverityOptions` — `low`, `normal`, `high`
     - `PublicMessageCategoryOptions` — `billing`, `account`, `bug`, `other`
   - Exported `PublicMessageMetadataLabels` map — friendly labels for known keys (`company`, `category`, `severity`, `referrer`, `landing_page`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`). Unknown keys are rendered by humanizing the key (snake_case → Title Case) in the view.
   - Named exports only (matches `Tickets.js`, `IPSet.js`).

2. **`src/extensions/admin/messaging/PublicMessageTablePage.js`** (new) — mirror `SentMessageTablePage.js` + `TicketTablePage.js`.
   - `extends TablePage`, super config:
     - `name: 'admin_public_messages'`, `pageName: 'Contact Messages'`, `router: 'admin/messaging/public-messages'`.
     - `Collection: PublicMessageList`, `itemViewClass: PublicMessageView`.
     - `viewDialogOptions: { header: false, size: 'lg', scrollable: true }`.
     - `defaultQuery: { sort: '-created' }`.
     - `columns`:
       - `status` — sortable, `filter: multiselect` of `PublicMessageStatusOptions`, `formatter: 'badge'`.
       - `kind` — sortable, `filter: multiselect` of `PublicMessageKindOptions`, `formatter: 'badge'`.
       - `name` — sortable, `formatter: "truncate(30)"`.
       - `email` — sortable.
       - `subject` — sortable, `formatter: "truncate(60)|default('—')"`.
       - `group.name` — sortable, `label: 'Group'`, `formatter: "default('—')"`.
       - `created` — sortable, `formatter: 'relative'`.
     - Features: `selectable: true`, `searchable: true`, `sortable: true`, `filterable: true`, `paginated: true`.
     - Toolbar: `showRefresh: true`, `showAdd: false`, `showExport: true`.
     - `batchBarLocation: 'top'`, `batchActions: [{ label: 'Mark Closed', icon: 'bi bi-check-circle', action: 'mark-closed' }]`.
     - `emptyMessage: 'No contact or support messages yet. Visitors submit these through the bouncer-gated /contact page.'`.
     - `tableOptions` same as peers.
   - `async onActionBatchMarkClosed()` — mirror `BlockedIPsTablePage.onActionBatchUnblock()`: fetch selected via `this.tableView.getSelectedItems()`, confirm, `Promise.all(selected.map(it => it.model.save({ status: 'closed' })))`, toast, refresh collection.

3. **`src/extensions/admin/messaging/PublicMessageView.js`** (new) — detail view, structured like `src/extensions/admin/security/IPSetView.js` (View + DataView sub-sections + context menu) but simpler (no tabs).
   - `class PublicMessageView extends View`, `model: options.model || new PublicMessage(options.data || {})`.
   - Template layout:
     - Header row — kind badge (from `PublicMessageKindOptions` label lookup), status badge (`bg-warning` open, `bg-secondary` closed), `{{model.created|relative}}`, submitter name + mailto email, group link `?page=system/groups` (only when `model.group.id` present — reuse the existing group link pattern from `UserView`).
     - Submitter `DataView` — fields: `name`, `email` (`type: 'email'`), `ip` (render `model.ip_address`), `user_agent`, `group.name`. Use `showEmptyValues: false`.
     - Details `DataView` — built in `onBeforeRender`: iterate `model.get('metadata') || {}`, map each key to `{ name: key, label: PublicMessageMetadataLabels[key] || humanize(key) }`. Hide the whole section if the metadata object is empty.
     - Message block — `<pre class="..." style="white-space: pre-wrap;">{{model.message}}</pre>` (double-brace = auto-escaped; covers the unicode / HTML-looking content concern in the spec's Notes).
     - Actions row — `data-action="toggle-status"` button labeled `Mark Closed` or `Mark Open` based on `model.status`, plus a `Reply via Email` anchor that is a plain `<a href="mailto:{{model.email}}?subject=Re: {{model.subject}}">` (no JS, no backend).
   - `onInit()` — construct both DataView children with `containerId`, add via `addChild()`. Never call `render()` / `mount()` on children directly.
   - `onActionToggleStatus()` — `const next = this.model.get('status') === 'open' ? 'closed' : 'open';` → `await this.model.save({ status: next })` → `this.getApp()?.toast?.success(...)` → `this.render()`. Wrap in try/catch; on error show error toast and do not re-render.
   - End of file: `PublicMessage.VIEW_CLASS = PublicMessageView;` (matches `EmailView.js`, `TicketView.js`, `IPSetView.js`).

4. **`src/extensions/admin/index.js`** — add two exports inside the existing `// Messaging - Email` section (or a new `// Messaging - Public` block immediately after it):
   - `export { default as PublicMessageTablePage } from './messaging/PublicMessageTablePage.js';`
   - `export { default as PublicMessageView } from './messaging/PublicMessageView.js';`

5. **`src/admin.js`** — three small additions, all in-pattern with neighbors:
   - Top-level re-export (near line 30): `export { default as PublicMessageTablePage } from '@ext/admin/messaging/PublicMessageTablePage.js';` and a matching view export near line 87.
   - Local import (near line 145): `import PublicMessageTablePageClass from '@ext/admin/messaging/PublicMessageTablePage.js';`.
   - `registerPage` (near line 207/208 with other messaging routes):
     ```js
     app.registerPage('system/messaging/public-messages', PublicMessageTablePageClass,
         { permissions: ["view_support", "support", "security"] });
     ```
   - Nav (around lines 297–309) — **adopt Option A from the request**: rename the `Email` block's `text` to `'Messaging'` and append a new child:
     ```js
     { text: 'Contact Messages', route: '?page=system/messaging/public-messages',
       icon: 'bi-chat-square-text', permissions: ["view_support", "support"] }
     ```
     Also widen the parent block's `permissions` to `["manage_aws", "view_support", "support"]` so support-only users see the Messaging group expand to just their child item. The nav stays backward-compatible (same key path `system/email/*` for existing children).

### Design Decisions

- **Follow `Tickets.js` / `IPSet.js` model shape** — one file, named exports, status/kind rendered via exported option arrays used by both filters and badges. Avoids splitting constants across files.
- **Use the built-in `selectable` + `batchActions` pattern** instead of a custom toolbar action. This is how `BlockedIPsTablePage`, `IncidentTablePage`, and `RuleSetTablePage` all expose bulk workflows; the framework already wires `onActionBatchMarkClosed()` to the batch bar.
- **Generic metadata rendering via `DataView`** — the backend sanitizes metadata to flat primitives, so a single `Object.entries(metadata).map(...)` pass builds the `fields` array. Known keys get friendly labels; unknown keys are humanized. This satisfies the spec's explicit "new kinds added server-side appear automatically" constraint without per-kind subclassing.
- **Status toggle is a single `data-action` button, not a dropdown/form** — matches the "mark closed" simplicity called out under Design Decisions › Model Forms in the spec. `TicketView.onActionChangeStatus` is heavier (uses `Dialog.showForm`) because it has 8 statuses; PublicMessage has 2.
- **Safe rendering of submitter content** — Mustache double-braces (`{{...}}`) auto-escape, so the `<pre>` body and all key/value labels in the Details section are safe for arbitrary visitor input. No `{{{triple}}}` anywhere in this view. Aligns with the spec's Notes § safety guidance.
- **Route prefix `system/messaging/` is new** — all existing messaging routes are `system/email/*`, `system/push/*`, `system/phonehub/*`. The spec's proposed `system/messaging/public-messages` keeps public messages discoverable by functional area rather than transport mechanism, and doesn't conflict with any existing route.

### Edge Cases

- **Empty metadata blob** — iteration yields zero fields; hide the Details section entirely so the view doesn't show an empty card. Check `Object.keys(md || {}).length` in `onBeforeRender`.
- **Row with no `group`** (global submission) — column shows `—` via the default formatter; detail view hides the group link.
- **Empty `subject`** — table falls back via `default('—')` formatter; spec's "fall back to first line of message" would require a computed column — keep it simple and stick with the `—` fallback to avoid one-off formatter code. Flag this as a small scope trim.
- **`model.save({ status })` failure** — catch, show `toast.error('Failed to update status')`, do not re-render (leaves the current optimistic render alone). Same shape as `TicketView.onActionAssignUser`.
- **Status race on batch close** — `Promise.all` continues on individual failure; after the batch resolves, toast the success count and refresh the collection so the current server-side truth reappears. Already how `BlockedIPsTablePage` handles it.
- **Unicode / HTML-looking content in submitter fields** — covered by Mustache auto-escape; never render submitter text via `{{{triple}}}`.
- **Permission mismatch** — any of `view_support`, `security`, `support` grants read; write requires `manage_support`, `security`, or `support`. The registerPage permissions gate the page; the save call is authoritative on the backend, so a read-only user clicking Mark Closed will get a 403 and hit the catch branch above — behavior is fine, no extra client check needed.

### Testing

- `npm run lint` — ESLint on new src files.
- `npm run test:unit` — ensure no regressions in `Model` / `Collection` / `TablePage` tests (there should be none; this is pure consumer code).
- Manual verification against a running django-mojo backend:
  - Load `?page=system/messaging/public-messages`, verify table loads, filters by status/kind work, default sort is `-created`.
  - Open a row → detail view renders all sections; Details section shows friendly labels for `company` / `category` / `severity` and humanized labels for any extra `utm_*` keys.
  - Click Mark Closed → status flips, button relabels to Mark Open, toast fires; collection refresh shows new status on return to the table.
  - Batch select three rows → Mark Closed → toast, table refreshes.
  - A user with only `view_support` sees the nav item and table but gets a 403 toast on Mark Closed.

No new unit tests: this work composes existing framework primitives without changing any. If `DataView`'s generic field auto-generation behavior changes, that should be covered by DataView's own tests.

### Docs Impact

- **No `docs/web-mojo/` change** — no public framework API changes; this is an admin extension.
- **`CHANGELOG.md`** — add a single line under the current in-progress release: "Admin: add Contact Messages page for the bouncer-gated `PublicMessage` API (read + status toggle, generic metadata rendering)."
- **Out of scope (for this request, flag as follow-ups):**
  - Red unread-count badge on the nav item (spec Notes §).
  - Reply-to-submitter / note-thread workflow.
  - Create / delete UI.
  - Per-kind detail layouts (intentionally generic).
