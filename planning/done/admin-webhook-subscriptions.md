# Admin: Webhook Subscriptions management UI

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
| Date | 2026-05-18 |
| Priority | medium |

## Description

Add an admin-portal UI for managing the **`account.WebhookSubscription`** rows that landed on django-mojo last commit (52f2e74 / b5a2cfd). Operators currently have to hand-call `POST /api/group/webhook_subscriptions` to register a receiver — there is no UI surface in the admin portal yet.

Two surfaces, mirroring the existing ApiKey pattern:

1. **Per-group section** inside `GroupView` — a "Webhook Subscriptions" side-nav entry showing the rows for *this* group, with create / edit / toggle / delete / inspect actions.
2. **Standalone `WebhookSubscriptionTablePage`** for system-level admins who want a cross-group view (filterable by `group=`, mirrors `ApiKeyTablePage` shape).

Bundled into the same change: a small **webhook secret panel** in the Group view that exposes the existing `POST /api/group/webhook_secret` endpoint — read (one-time reveal) and rotate (with a destructive-action confirm). The secret is what consumers use to verify deliveries; without a UI today operators have no way to hand it to a consumer.

## Context

### What just landed on the backend

- Commit `52f2e74` — `account: Group-scoped webhook subscriptions with async fan-out dispatcher`. Adds:
  - `account.WebhookSubscription` model: FK `group → account.Group` (CASCADE), `url` (https-only), `events` (JSON list of strings, free-form), `is_active` (BoolField, default `True`), `metadata` (JSON dict), `created`, `modified`. Storage in `mojo_secrets` blob is N/A here — there is **no per-subscription secret**.
  - REST CRUD at `/api/group/webhook_subscriptions` and `/api/group/webhook_subscriptions/<int:pk>`. Permission: `manage_group` / `manage_groups` / `groups` (same threshold as ApiKey CRUD).
  - `mojo.apps.account.services.webhooks.dispatch(group, event_type, data, *, idempotency_key=None)` — sync entry, queues a fan-out job; the worker-side handler queries matching active subscriptions and publishes one signed `jobs.publish_webhook(group=...)` per row.
  - Two channels: `webhook_fanout` (DB query + per-row enqueue) and `webhooks` (HTTP delivery).
  - Per-row publish failures and missing-group conditions report to the **incident app** (`category="webhook:fanout:error"` / `webhook:fanout:group_missing"`); `error_repr` is truncated to 500 chars.
- Commit `b5a2cfd` — security follow-ups (https-only with explicit credential rejection, bounded `error_repr`, documented SSRF trust model).

Webhook **signing** (the per-Group HMAC secret used by receivers to verify deliveries) shipped earlier in the same session:

- `POST /api/group/webhook_secret` — empty body returns the current secret (auto-mints on first call); `{"rotate": true}` mints a new one. Same permission threshold.
- Response shape: `{"status": true, "data": {"secret": "wsec_…", "created_at": "…", "last_rotated_at": "…"}}`.

### Source-of-truth docs (read these before scoping the UI)

- `django-mojo/docs/django_developer/account/webhook_subscriptions.md` — end-to-end flow, REST contract, security notes.
- `django-mojo/docs/django_developer/account/webhook_signing.md` — secret semantics, rotation behavior.
- `django-mojo/docs/web_developer/account/webhook_subscriptions.md` — REST contract from the consumer side.
- `django-mojo/docs/web_developer/account/webhook_signing.md` — multi-language verify recipes; we don't implement these but the doc explains receiver behavior.

### Why a UI now

Today an operator has to:
1. Get an ApiKey for the target Group (admin can do this in `GroupView`).
2. `curl POST /api/group/webhook_secret` to fetch the signing secret.
3. `curl POST /api/group/webhook_subscriptions` with a JSON body of url + events.
4. Hand the secret to the consumer out of band.

That's all infrastructure-engineer ergonomics. The admin portal is the operator-friendly path. The backend is stable; the gating factor on adoption is the UI.

### Mirroring the ApiKey pattern

The two-surface shape (per-group section + standalone TablePage) is exactly what ApiKey did:

- `src/extensions/admin/account/api_keys/ApiKeyTablePage.js` — standalone page (cross-group; system admins).
- `src/extensions/admin/account/api_keys/ApiKeyView.js` — detail/edit view.
- `src/extensions/admin/account/groups/GroupView.js:780-1000` (approx) — per-group section inside GroupView.
- `src/core/models/ApiKey.js` — model + Forms + Collection.

`WebhookSubscription` admin UI should sit alongside, with the same file layout and naming.

## Acceptance Criteria

### A. Model + Collection (`src/core/models/WebhookSubscription.js`)

- New file, mirror `src/core/models/ApiKey.js` shape.
- `WebhookSubscription` class, `WebhookSubscriptionList` collection, `WebhookSubscriptionForms.create` form config.
- Endpoint base: `'/api/group/webhook_subscriptions'`.
- Fields exposed: `id`, `created`, `modified`, `url`, `events`, `is_active`, `metadata` (optional / detail graph), `group`.
- Form fields (create + edit share the schema):
  - `url` — required, type `url`, with a helper-text line: "Must be https://".
  - `events` — see section D for the input UX decision.
  - `is_active` — type `switch`, default `true`.
  - (Detail-only) `metadata` — JSON textarea, optional.
- The form must **not** include a `group` field when used inside `GroupView` (filter pattern from `groupview-create-api-key-flow-broken.md`).

### B. Per-group section inside `GroupView`

- New side-nav entry titled **"Webhooks"** (or **"Webhook Subscriptions"** if there's room — match neighbouring labels for length).
- Order: place it after **API Keys** in the nav.
- KPI card optional but recommended: count of active subscriptions for this Group, mirrors `kpiApiKeys` at `GroupView.js:162`.
- Section content: a TableView of subscriptions scoped to `group=this.model.id`. Columns:
  - `url` (sortable, formatted with `text-break`; mono-font is nice).
  - `events` (formatter renders the list as inline badges — max ~3 visible, "+N more" tooltip beyond that).
  - `is_active` (switch toggle inline; flip → PUT `{"is_active": !current}` → refresh row).
  - `created` (formatter `datetime`, sortable).
- Toolbar: **Create Subscription** button + the standard search/sort affordances.
- Row click → `WebhookSubscriptionView` modal (edit form for everything but URL/events; or full edit — see D).
- Row inline action: **Delete** trash icon (same pattern as the API Keys section after the fix in `cabc4aa`).
- Empty state: "No webhook subscriptions yet. Click 'Create Subscription' to add one."

### C. Standalone `WebhookSubscriptionTablePage`

- `src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionTablePage.js`.
- Mirrors `ApiKeyTablePage` — cross-group view, includes a Group column, requires a `group` filter for non-system admins.
- Admin nav registration: under the same parent as **API Keys** (probably "Account" → "Webhook Subscriptions").
- Reuses the same `WebhookSubscriptionForms.create` and `WebhookSubscriptionView`.

### D. Events input UX

The backend imposes **no event vocabulary** — events is a free-form list of strings. Two viable UX shapes; pick one in the build phase:

- **(D1, recommended)** Tag-style chip input. Operator types an event name, presses Enter / comma to commit a chip, can remove chips with ×. Stores as `string[]`. Lower error surface than free-text JSON.
- **(D2)** Comma-separated text input. Simpler to implement, but ugly when the list grows and easy to typo.

Either way, include a helper line in the field: "Event names are free-form strings published by the service emitting the webhooks. See your service's documentation for the supported names (e.g. `invoice.paid`, `verification.completed`)."

**No autocomplete from a registry** — there is no central registry on the backend (deliberate design decision documented in the django doc). If a deployment wants per-service event hints, that's a future feature (see Open Questions).

### E. Webhook secret panel

A separate small panel inside the same `GroupView` section (above the table, or in a card at the top of the page). Two actions:

- **Reveal current secret** — calls `POST /api/group/webhook_secret` with empty body, opens a Modal.dialog showing the secret with the **same UX as the API Key token reveal** in `cabc4aa`:
  - `backdrop: 'static'` + `keyboard: false` (no accidental dismiss).
  - Monospaced `user-select-all` block.
  - Inline copy button using the `clipboard` DataFormatter (from `374ad6f`).
  - Footnote: "Treat this like a password. Consumers use it to verify webhook signatures."
- **Rotate secret** — destructive confirm dialog first ("Rotating immediately invalidates the old secret. Consumers using the old secret will fail to verify until they refetch and update their cache. Continue?"), then `POST /api/group/webhook_secret {"rotate": true}` and reveal the new value in the same reveal dialog (label: "Secret rotated").

The panel should show metadata: `created_at` and `last_rotated_at` (returned by the same endpoint) — formatted as relative time ("3 weeks ago"). If the operator never called the endpoint and the Group has no secret yet, the panel reads "No secret minted yet — click Reveal to generate one."

### F. Theme, accessibility, mobile

- Bootstrap tokens only (`.claude/rules/theming.md`). Light + dark both work day one.
- The events chip input must support keyboard nav (Tab into / arrows between chips / Backspace to remove last).
- Mobile: chips wrap; switch toggles are ≥40×40 tap targets.

### G. Programmatic API on the model

- `WebhookSubscription` class supports `toggleActive()` — convenience that PUTs `{is_active: !this.get('is_active')}`. Optional but used by the inline switch wiring.

### H. Tests

- `test/unit/WebhookSubscription.test.js` — model URL field is wired, form filter helper works (`WebhookSubscriptionForms.createInGroup` if D1 needs a separate variant), Collection endpoint resolves correctly.
- `test/unit/WebhookSubscriptionTablePage.test.js` — page registers correctly, columns render given a stubbed Collection.
- `GroupView` integration: not feasible in current harness (per `groupview-create-api-key-flow-broken.md` — Modal modals aren't covered). Call this out explicitly.

### I. Documentation

- New section in `docs/web-mojo/admin/account/webhook_subscriptions.md` (matches the `api_keys.md` doc shape if one exists, or create alongside).
- CHANGELOG entry under `## Unreleased`.

## Investigation

### Existing patterns to mirror

- **ApiKey two-surface UI**: `src/extensions/admin/account/api_keys/{ApiKeyTablePage.js,ApiKeyView.js}` + `GroupView.js` API Keys section. Single most relevant prior art — same backend shape (Group-scoped + system-level), same permission threshold, same dual-surface UX. Read `planning/done/groupview-create-api-key-flow-broken.md` for the lessons learned (especially: `Model.save(payload)` sends `payload` verbatim — do NOT rely on constructor attributes).
- **Token reveal dialog**: `_showApiKeyTokenDialog` inside `GroupView.js` (added in commit `cabc4aa`, refined in `374ad6f` to use the `clipboard` DataFormatter). The webhook-secret reveal should be a near-clone — same `backdrop: 'static'` + `keyboard: false`, same body shape, same inline copy button.
- **Destructive confirm**: existing pattern for rotate-style operations — search the codebase for `Modal.confirm` callers and pick the most idiomatic one.
- **Inline switch toggle** for `is_active`: see how user disable/enable rows work (`UserTablePage`, possibly `UserView`).

### Files this request will create

- `src/core/models/WebhookSubscription.js`
- `src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionTablePage.js`
- `src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionView.js`
- `test/unit/WebhookSubscription.test.js`
- `test/unit/WebhookSubscriptionTablePage.test.js`
- `docs/web-mojo/admin/account/webhook_subscriptions.md` (new)

### Files this request will modify

- `src/extensions/admin/account/groups/GroupView.js` — add Webhooks section + secret panel.
- `src/extensions/admin/index.js` (or wherever the admin nav is registered) — add the standalone TablePage to the menu.
- `CHANGELOG.md`.

### Backend reference (do not modify)

- `django-mojo/mojo/apps/account/models/webhook_subscription.py` — model + RestMeta + on_rest_pre_save validation.
- `django-mojo/mojo/apps/account/rest/webhook_subscription.py` — CRUD endpoint.
- `django-mojo/mojo/apps/account/services/webhooks.py` — dispatch + handle_fanout (for context, not consumed by frontend).
- `django-mojo/mojo/apps/account/models/group.py:147-200` — webhook secret accessors.
- `django-mojo/mojo/apps/account/rest/group.py` — `POST /api/group/webhook_secret` endpoint.

### Backend response shapes

`GET /api/group/webhook_subscriptions?group=42` →
```json
{"status": true, "data": [{"id": 7, "url": "https://...", "events": ["invoice.paid"], "is_active": true, "created": "...", "modified": "..."}, ...], "count": N}
```

`POST /api/group/webhook_subscriptions` with body `{"group": 42, "url": "...", "events": [...]}` → 200 with the created row. Validation failure (non-https, embedded credentials, malformed events): 400 with `{"status": false, "error": "..."}`.

`POST /api/group/webhook_secret` with body `{}` → `{"status": true, "data": {"secret": "wsec_...", "created_at": "...", "last_rotated_at": "..."}}`.

`POST /api/group/webhook_secret` with body `{"rotate": true}` → same shape, new `secret` + bumped `last_rotated_at`.

## Constraints

- **Permission threshold is `manage_group` / `manage_groups` / `groups`** — enforced server-side. Don't show the Webhooks section to operators who lack the permission (mirror the same gating logic the API Keys section uses).
- **No client-side URL validation beyond the basics.** The server is the source of truth (https-only, no userinfo, valid URL syntax). Surface server errors via toast; don't pre-validate beyond a trivial `startsWith('https://')` to catch obvious typos before submit.
- **SSRF disclosure**: the server accepts any https URL (internal IPs, metadata endpoints, etc.) — same trust model as ApiKey CRUD. Don't add allow-list UI; if a deployment needs allow-listing, that's a separate request scoped to the operator portal.
- **Webhook secret is show-once-with-warning**. Same UX gravity as API Key tokens. Static backdrop, explicit dismiss button.
- **Rotation invalidates immediately** (no overlap window). The confirm copy must say so clearly.
- **No event-vocabulary autocomplete** in v1. The backend has no central registry by design.
- **Channel config is operator concern**, not portal concern. Adding `webhook_fanout` to `JOBS_CHANNELS` is a deployment ops step; if we want to surface it as a setup-page warning later, that's a follow-up.

## Notes

### Related artifacts

- `django-mojo` commits: `52f2e74` (feature), `b5a2cfd` (security follow-ups), `9841bc0` (resolution).
- `django-mojo` planning doc: `planning/done/group_webhook_subscriptions.md` — full design rationale + deltas from the original proposal.
- Prior art for the dual-surface admin UI: `planning/done/groupview-create-api-key-flow-broken.md` (lessons + token reveal recipe), `planning/done/admin-tablepages-ux-sweep.md` (table page conventions).

### Open Questions for design phase

- **Events input shape (D1 vs D2)** — chip input is much nicer but adds a small custom component. Comma-separated text is one-line but ergonomically poor when the list grows. Lean: D1 with a fallback to D2 in the edit-detail view (where the user has more space and can paste).
- **Where does the secret panel live?** Options: (a) at the top of the Webhooks section, before the table; (b) a separate "Webhook Settings" side-nav entry; (c) collapsed by default behind a "Manage Secret" button. Lean: (a) — it's directly relevant to the table contents below it, and an operator setting up a new subscription will want both at once.
- **Should the secret panel show usage stats?** ("Used N times in the last 7 days" — derived from Job records). Could be useful to confirm receivers are actually using the current secret. Out of scope for v1; nice-to-have follow-up.
- **Should `WebhookSubscriptionView` (detail modal) show a "Recent deliveries" tab** sourced from `Job` records filtered by `payload.sign_group_id == this.group_id AND payload.url == this.url`? Useful, but it's a join across two unindexed JSON payload keys — performance is probably bad without a backend-side query. Out of scope for v1; file separately if there's demand.
- **Test-send button** — a "Send a test event to this URL" action on a subscription that fires a synthetic payload (e.g. `{"event": "test.ping", "timestamp": "..."}`) via `dispatch()`. Saves the operator from having to wait for a real event. Out of scope for v1, but a good follow-up — would require a small backend endpoint or could be done entirely client-side by hand-firing `POST` from the browser (no signing then though, defeating the point).

### Out of Scope

- Recent-deliveries / delivery-history dashboard.
- Test-send button.
- Per-event-type subscription filtering UI (the backend matches on exact string; advanced filters are application-layer policy).
- Bulk import/export of subscriptions.
- A "subscribe to all events" affordance — operators must enumerate event names.
- Anything that changes the django-mojo backend.

## Plan

### Objective

Add an operator-friendly admin UI for `account.WebhookSubscription` rows and the per-Group webhook signing secret. Two surfaces mirror the existing ApiKey pattern:
1. A per-group **Webhooks** section inside `GroupView` (secret panel above a subscription list).
2. A standalone cross-group `WebhookSubscriptionTablePage` (system admins; filterable by `?group=`).

Backend is stable — this is admin-portal wiring only.

### Files to create

```
src/core/models/WebhookSubscription.js
src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionTablePage.js
src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionView.js
test/unit/WebhookSubscription.test.js
test/unit/WebhookSubscriptionTablePage.test.js
docs/web-mojo/extensions/admin-webhook-subscriptions.md
```

### Files to modify

```
src/core/models/index.js              (regenerated via npm run generate:models)
src/extensions/admin/index.js         (export the new TablePage + View)
src/extensions/admin/account/groups/GroupView.js (Webhooks section + secret panel)
src/admin.js                          (registerSystemPages + sidebar menu entry)
docs/web-mojo/models/BuiltinModels.md (new section, mirror ApiKey)
docs/web-mojo/extensions/Admin.md     (link new doc from Account pages list)
CHANGELOG.md                          (Unreleased entry)
```

### Steps

**1. `src/core/models/WebhookSubscription.js` — new.** Mirror [src/core/models/ApiKey.js](src/core/models/ApiKey.js).
- `WebhookSubscription extends Model`, endpoint `'/api/group/webhook_subscriptions'`.
- `WebhookSubscriptionList extends Collection` with `size: 25` (sort applied by caller).
- `WebhookSubscriptionForms.create`:
  - `url` — `type: 'url'`, required, `placeholder: 'https://example.com/webhooks/mojo'`, `help: 'Must use https://'`.
  - `events` — `type: 'tags'` (reuses the framework's `TagInput`), label `Events`, `help: 'Event names are free-form strings published by the emitting service (e.g. invoice.paid, verification.completed). See your service's documentation.'`.
  - `is_active` — `type: 'switch'`, default `true`.
  - `group` — `type: 'number'`; the `GroupView` flow filters this out (`fields.filter(f => f.name !== 'group')`, same pattern as `ApiKeyForms.create`).
- `WebhookSubscriptionForms.edit` — same fields minus `group`, plus an optional `metadata` JSON textarea.
- **Shared helper** `WebhookSubscriptionForms.normalizePayload(formData)` — copies `formData` and converts `events: 'a, b, c'` → `['a','b','c']` (trim, drop empties); leaves array-valued `events` untouched. Used by both surfaces so the transform lives in one place and is pinned by a test.
- Prototype convenience `toggleActive()` → `this.save({ is_active: !this.get('is_active') })`.
- Exports `{ WebhookSubscription, WebhookSubscriptionList, WebhookSubscriptionForms }`.

**2. `src/core/models/index.js`** — re-run `npm run generate:models` so the auto-generated re-export picks up the new file (per `.claude/rules/api.md`; the header comment says "Do not edit manually"). Verify the diff is a single `export * from './WebhookSubscription.js';` line.

**3. `src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionTablePage.js` — new.** Mirror [ApiKeyTablePage.js](src/extensions/admin/account/api_keys/ApiKeyTablePage.js).
- `name: 'admin_webhook_subscriptions'`, `pageName: 'Webhook Subscriptions'`, `router: 'admin/webhook-subscriptions'`, `Collection: WebhookSubscriptionList`, `itemViewClass: WebhookSubscriptionView`, `viewDialogOptions: { header: false, size: 'lg' }`.
- Set `WebhookSubscription.ADD_FORM = WebhookSubscriptionForms.create` and `EDIT_FORM = WebhookSubscriptionForms.edit` so TableView's generic add/edit picks them up.
- Columns (left-to-right): `id` (70px, muted), `url` (sortable, `class: 'text-truncate font-monospace'`, `style: 'max-width: 320px;'`), `events` (custom inline template rendering up to 3 badges + `+N more`; `visibility: 'lg'` per the recent admin breakpoint sweep), `group.name` (`formatter: "default('—')"`, sortable), `is_active` (badge formatter `boolean('Active|bg-success','Inactive|bg-secondary')|badge`, 100px), `created` (`datetime`, sortable).
- Override `onActionAdd()` (mirror the ApiKeyTablePage pattern) so the form payload is run through `WebhookSubscriptionForms.normalizePayload` before `model.save(payload)`. Toast `resp?.data?.error` on failure. No one-time-token reveal — subscriptions don't ship a secret.
- `addButtonLabel: 'New Subscription'`, `emptyMessage: 'No webhook subscriptions found.'`, `searchPlaceholder: 'Search URL or group'`.

**4. `src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionView.js` — new.** Mirror [ApiKeyView.js](src/extensions/admin/account/api_keys/ApiKeyView.js).
- Header icon `bi-broadcast`, title = URL (truncated, mono), subtitle `Group: {{model.group.name|default(model.group)}}`, status badge.
- Body sections: full URL (mono, breakable), Events (inline badge list — same iteration pattern as `ApiKeyListItem.permsList`, returning `{key}` objects so Mustache's `{{key}}` lookup doesn't tickle the pipe-formatter resolver), Metadata (`<pre>{{model.metadata|json}}</pre>` when present), Created / Modified rows.
- ContextMenu actions:
  - `Edit Subscription` → `app.showModelForm({ title, model, formConfig: WebhookSubscriptionForms.edit })`. On submit, run `WebhookSubscriptionForms.normalizePayload(data)` before save.
  - `Activate` / `Deactivate` → `model.toggleActive()` then `this.render()`.
  - `Delete Subscription` (danger) → confirm + `model.destroy()` + `emit('deleted')` (mirror ApiKeyView).
- Bottom of file: `WebhookSubscription.VIEW_CLASS = WebhookSubscriptionView` so `TableView.clickAction: 'view'` resolves the modal class.

**5. `src/extensions/admin/account/groups/GroupView.js` — modify** (~200 new lines).

5a. **Imports** alongside the existing ApiKey imports (~line 41):
```js
import { WebhookSubscription, WebhookSubscriptionList, WebhookSubscriptionForms }
    from '@core/models/WebhookSubscription.js';
import WebhookSubscriptionView from '../webhook_subscriptions/WebhookSubscriptionView.js';
```

5b. **New inline subview classes** (near the existing `ApiKeyListItem` ~line 740):
- `WebhookSubscriptionListItem extends ListViewItem` — card row matching `ApiKeyListItem`: `bi-broadcast-pin` icon, URL (mono, truncated), inline event badges via `eventsList` getter (returns `[{key}]` objects, same Mustache-friendly pattern as `permsList`), `is_active` toggle (`data-action="toggle-subscription-active"`), trash button (`data-action="delete"`), muted `Created {{model.created|datetime}}` line.
- `WebhookSecretPanel extends View` — small Bootstrap card. Template emits an inline `<style>` block with light defaults + `[data-bs-theme="dark"]` overrides per `.claude/rules/theming.md` (use Bootstrap surface tokens). Two buttons: `Reveal Secret` (`data-action="reveal-webhook-secret"`) and `Rotate Secret` (`data-action="rotate-webhook-secret"`, danger styling). Meta line: `Created {{secretMeta.created_at|epoch|relative}} · Last rotated {{secretMeta.last_rotated_at|epoch|relative}}` when known; otherwise `No secret minted yet — click Reveal to generate one.` Exposes `setMeta(meta)` which sets `this._secretMeta` and re-renders. Bubbles button clicks up to `GroupView` (un-handled `data-action` events bubble in the framework's delegation chain).
- `WebhookSection extends View` — thin container view:
  ```js
  template: `
      <div data-container="webhook-secret-panel" class="mb-3"></div>
      <div data-container="webhook-subscriptions-list"></div>
  `
  ```
  Adds the panel and list as children via `addChild()` in the constructor (set before first render — framework auto-renders).

5c. **In `GroupView.constructor`** (~line 880-1020):
- New collection: `const webhookSubscriptionsCollection = new WebhookSubscriptionList({ params: { group: groupId, size: 25, sort: '-created' } });`.
- Build `webhookSubscriptionsListView = new ListView({ collection: webhookSubscriptionsCollection, title: 'Webhook Subscriptions', itemClass: WebhookSubscriptionListItem, clickAction: 'view', itemView: WebhookSubscriptionView, viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] }, hideActivePillNames: ['group'], showAdd: true, addButtonLabel: 'Create Subscription', showRefresh: true, emptyMessage: 'No webhook subscriptions yet. Click "Create Subscription" to add one.' });`.
- Build `webhookSecretPanel = new WebhookSecretPanel({ model });`.
- Build `webhookSection = new WebhookSection({ model, secretPanel: webhookSecretPanel, subscriptionsList: webhookSubscriptionsListView });` (containerId-wired in 5b).
- Insert a new entry into the `sections` array, immediately **after** the existing API Keys row (~line 1029):
  ```js
  { key: 'Webhooks', label: 'Webhooks', icon: 'bi-broadcast',
    view: webhookSection, permissions: 'manage_group' },
  ```
  DetailView already filters sections by `permissions` against `app.activeUser.hasPermission`.
- Stash refs: `this.webhookSubscriptionsCollection`, `this.webhookSection`, `this.webhookSecretPanel`, `this.webhookSubscriptionsListView`.

5d. **In `onAfterBuild`** (~line 1135):
- `this.webhookSubscriptionsListView.options.onAdd = (event) => this._createWebhookSubscription(event);`
- `this.webhookSubscriptionsListView.options.onItemDelete = (model) => this._deleteWebhookSubscription(model);`
- Sidebar badge updater `updateWebhooksBadge` → `this.setBadge('Webhooks', n > 0 ? { text: String(n), variant: 'muted' } : null);` wired on `webhookSubscriptionsCollection.on('fetch:success', ...)`.
- Fire-and-forget initial fetch: `this.webhookSubscriptionsCollection.fetch().catch(() => {});`
- **Do NOT** auto-fetch the secret on mount — `POST /api/group/webhook_secret` auto-mints if absent, so a render-time call would mint secrets the operator didn't ask for.

5e. **New action handlers on `GroupView`**:
- `async _createWebhookSubscription(event)` — `event?.preventDefault/stopPropagation`. `Modal.form({ title: 'Create Webhook Subscription', size: 'md', fields: WebhookSubscriptionForms.create.fields.filter(f => f.name !== 'group') })`. Run result through `WebhookSubscriptionForms.normalizePayload`; add `group: this.model.id`; `await new WebhookSubscription().save(payload)`. Toast `resp?.data?.error` on failure; refetch on success.
- `async _deleteWebhookSubscription(model)` — `Modal.confirm` with copy `Delete webhook to <code>${escapeHtml(model.get('url'))}</code>? Future events will no longer be delivered to this URL.`, `confirmText: 'Delete'`, `confirmClass: 'btn-danger'`. Then `model.destroy()` + toast + refetch (mirror `_deleteApiKey`).
- `async onActionToggleSubscriptionActive(event, element)` — read the row's model id from the closest `[data-list-item-id]`, look it up via `webhookSubscriptionsCollection.get(id)`. Optimistic `model.set('is_active', checked)` + `model.save({ is_active: checked })`; revert on failure (mirror `onActionToggleActive`).
- `async onActionRevealWebhookSecret()` — `app.showLoading()`; `resp = await app.rest.POST('/api/group/webhook_secret', { group: this.model.id })`; on `resp?.data?.status`, call `this.webhookSecretPanel.setMeta(resp.data.data)` then `this._showWebhookSecretDialog(resp.data.data.secret, 'Webhook Secret')`. Toast `resp?.data?.error` on failure. (Confirm in build phase whether the body shape uses `{ group: id }` or relies on context — the request doc shows empty body, but the standalone endpoint isn't group-scoped via URL.)
- `async onActionRotateWebhookSecret()` — destructive `Modal.confirm`: `'Rotating immediately invalidates the old secret. Consumers using the old secret will fail to verify until they refetch and update their cache. Continue?'`, `confirmText: 'Rotate'`, `confirmClass: 'btn-danger'`. Then `app.rest.POST('/api/group/webhook_secret', { rotate: true, group: this.model.id })` → `setMeta` + `_showWebhookSecretDialog(secret, 'Secret Rotated — Save Your New Secret')`.
- `async _showWebhookSecretDialog(secret, title)` — near-clone of `_showApiKeyTokenDialog`. `Modal.dialog({ title, size: 'lg', backdrop: 'static', keyboard: false, body, buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }] })`. Body = warning banner + monospaced `user-select-all` block themed with `var(--bs-tertiary-bg)` + inline `data-action="copy-to-clipboard"` + `data-clipboard="${escapeHtml(secret)}"` button (handled by inherited `View.onActionCopyToClipboard` — no custom JS) + footnote `Treat this like a password. Consumers use it to verify webhook signatures.`

**6. `src/admin.js` — modify**:
- Import `WebhookSubscriptionTablePageClass` alongside `ApiKeyTablePageClass` (~line 139).
- Add the two `export { default as ... }` lines alongside the existing ApiKey ones (~line 16 / 78).
- In `registerSystemPages` (~line 251, immediately after the `system/api-keys` registration):
  ```js
  app.registerPage('system/webhook-subscriptions', WebhookSubscriptionTablePageClass,
      { permissions: ["manage_groups", "manage_group"] });
  ```
- In the System sidebar group (~line 441, immediately after the `API Keys` menu entry):
  ```js
  { text: 'Webhook Subscriptions', route: '?page=system/webhook-subscriptions',
    icon: 'bi-broadcast', permissions: ["manage_groups", "manage_group"] },
  ```

**7. `src/extensions/admin/index.js`** — add the two new exports alongside the ApiKey ones (~line 14-15).

**8. Tests**:
- `test/unit/WebhookSubscription.test.js` (CommonJS via `loadModule`):
  - `WebhookSubscription` constructor sets `endpoint` to `/api/group/webhook_subscriptions`.
  - `WebhookSubscriptionList` exposes a `WebhookSubscription` ModelClass.
  - `WebhookSubscriptionForms.create.fields` includes a `url` field with `type: 'url'` and `required: true`, an `events` field with `type: 'tags'`, an `is_active` field with `type: 'switch'`.
  - `WebhookSubscriptionForms.normalizePayload({ events: 'a, b , c, ' })` → `{ events: ['a','b','c'] }`.
  - `WebhookSubscriptionForms.normalizePayload({ events: ['x','y'] })` is a no-op.
  - `WebhookSubscriptionForms.normalizePayload({})` returns `{}` (no `events` key, no crash).
  - `toggleActive()` calls `save` with the negated `is_active`. Use `jest.spyOn(WebhookSubscription.prototype, 'save')`.
- `test/unit/WebhookSubscriptionTablePage.test.js`:
  - Page constructor sets `name`, `router`, `Collection`, `itemViewClass` correctly.
  - `columns` contains `id`, `url`, `events`, `is_active`, `created`, `group.name` (order asserted via `columns.map(c => c.key)`).
  - `onActionAdd` normalizes the events string before save — `jest.spyOn` `model.save`, stub `app.showForm` to return `{ url: 'https://x', events: 'a, b' }`, assert `save` is called with `events: ['a','b']`.
- **No GroupView integration test** — acceptance criterion H notes Modal pipelines aren't covered by the harness; called out explicitly in the build summary.

**9. Docs**:
- New `docs/web-mojo/extensions/admin-webhook-subscriptions.md` — covers both surfaces, the events chip input, the secret reveal/rotate UX, the permission gate, and the no-auto-mint behaviour. Link from `docs/web-mojo/extensions/Admin.md` Account pages list (~line 305-330).
- `docs/web-mojo/models/BuiltinModels.md` — new `## WebhookSubscription & WebhookSubscriptionList` section directly after the `## ApiKey & ApiKeyList` block (~line 614), mirroring its shape (fields, endpoint, code example, `toggleActive()` note).
- `CHANGELOG.md` — new `## Unreleased` entry titled **"Admin · Webhook Subscriptions management UI"** in the existing style (problem → surfaces → key UX → files).

### Design Decisions

- **Reuse `TagInput` (`type: 'tags'`)** for the events chip input rather than building a new component. It's the framework's existing chip primitive and is already wired into `FormView.initializeTagInputs()`. Its `change` event emits a comma-separated string in `data.value` — we centralize the string→array conversion in `WebhookSubscriptionForms.normalizePayload` so both surfaces share one code path and a single test pins the behaviour.
- **Secret panel does not auto-fetch on mount.** Backend's `POST /api/group/webhook_secret` auto-mints if absent (per the request doc) — fire-and-forget on render would silently mint secrets the operator never asked for. Panel starts empty; metadata populates only after Reveal or Rotate.
- **Webhooks section sits inside `GroupView` directly after API Keys** in the Access divider — same permission threshold, same operator workflow shape.
- **ListView (not TableView) for the per-group subscription list** — matches the recent API Keys section reshape (commit `cabc4aa` lineage) for typical 1–10 rows per group; lighter chrome than a TableView.
- **`WebhookSubscription.VIEW_CLASS = WebhookSubscriptionView` registered at file load** so `TableView.clickAction: 'view'` resolves the modal class automatically, matching `ApiKey.VIEW_CLASS`.
- **Secret reveal dialog reuses the proven `clipboard` DataFormatter affordance** from `cabc4aa` / `374ad6f` — `data-action="copy-to-clipboard"` + `data-clipboard="<secret>"` invokes the inherited `View.onActionCopyToClipboard` handler. No custom JS needed for the copy / success-flash behaviour.
- **No client-side https validation** beyond the field's `type: 'url'` HTML5 default. The server is the source of truth (https-only, no userinfo). Toast `resp?.data?.error` from validation failures (same pattern as API Key flow).
- **Section visibility is permission-gated.** DetailView filters out section entries whose `permissions:` the active user lacks; admins without `manage_group` won't see the Webhooks rail entry at all.
- **`normalizePayload` lives on the Forms object** (not on the Model class) so the standalone TablePage and the GroupView flow can call it without import-cycle risk.

### Edge Cases

- **`events` may arrive from the backend as an array** (GET response) but be submitted as a comma-separated string (TagInput `change` payload). `normalizePayload` accepts both shapes; the row-template `eventsList` getter tolerates both (split on `,` if string, return verbatim if array).
- **Empty `events`** — backend accepts an empty list. Render the row as `<span class="text-secondary fst-italic">No events</span>` (mirror the `permsList` empty-state pattern in `ApiKeyListItem`).
- **Secret panel initial state.** "No secret minted yet — click Reveal to generate one." until the operator clicks Reveal or Rotate.
- **Rotation double-click race.** Disable the Rotate button while the POST is in flight; re-enable in `finally`.
- **`POST /api/group/webhook_secret` failure modes.** Surface `resp?.data?.error` via toast; the reveal dialog only opens on `resp?.data?.status === true`.
- **Long URLs.** TablePage `url` column uses `text-truncate` + `style: 'max-width: 320px;'` + tooltip; the inline ListView template uses `text-break` mono.
- **No event-vocabulary autocomplete** — intentional per Constraints. TagInput accepts arbitrary strings.
- **Per-row Active toggle race.** Optimistic save + silent revert on failure mirroring `GroupView.onActionToggleActive` — the bounce IS the feedback.
- **Permission gate for the standalone TablePage** — non-system admins must supply `?group=` via URL filters (TablePage URL sync already handles this). Backend enforces.
- **Open question to resolve during build:** does `POST /api/group/webhook_secret` require the group in the body (`{ group: id }`), in the URL, or read from session context? The request doc shows an empty body; the build phase will confirm against `django-mojo/mojo/apps/account/rest/group.py` before wiring.

### Testing

- `npm run test:unit` after temporarily isolating the new files per `.claude/rules/testing.md`. The two new files pin: model endpoint, form schema (`url`/`events`/`is_active`), `normalizePayload` round-trip in both directions, `toggleActive` behaviour, and TablePage column wiring + add-flow event normalization.
- `npm run lint` — full source pass.
- Manual verification via `npm run dev`:
  - Open a group → Webhooks rail entry visible (for users with `manage_group`).
  - Reveal secret → static-backdrop modal with mono `user-select-all` block, inline copy button works, panel meta-line populates afterward.
  - Rotate secret → destructive confirm with required copy, then reveal dialog with new value and bumped `last_rotated_at`.
  - Create subscription → form with URL field + chip-input events + active switch + helper text; submit; row appears.
  - Inline active toggle / row click → detail modal / delete with confirm all behave.
  - Theme flip light ↔ dark via topbar Theme settings — the secret reveal dialog and event chip badges render correctly under both, per `.claude/rules/theming.md` audit signals.
- Out-of-harness (called out explicitly): GroupView Modal-pipeline integration test — not feasible per acceptance criterion H.

### Docs Impact

- **New** `docs/web-mojo/extensions/admin-webhook-subscriptions.md`.
- **Modify** `docs/web-mojo/extensions/Admin.md` Account pages list to link to the new doc.
- **Modify** `docs/web-mojo/models/BuiltinModels.md` — add `WebhookSubscription & WebhookSubscriptionList` section after `ApiKey & ApiKeyList`.
- **Modify** `CHANGELOG.md` under `## Unreleased`: new entry in the standard problem/surface/files style.

### Out of Scope (call-outs)

Recent-deliveries dashboard, test-send button, per-event-type filtering UI, bulk import/export, "subscribe to all events" affordance, any backend changes. The framework's existing `TagInput` is reused as-is — no new primitives.

### Open Questions Resolved

- **D1 vs D2 (chip vs comma-string).** Chosen D1, via the framework's existing `type: 'tags'` (TagInput). Comma-separated paste-split flows for free since TagInput already supports it.
- **Secret panel placement.** Chosen (a) — inside the Webhooks section, above the table. An operator setting up a new subscription wants both surfaces in view at once.
- **`metadata` field.** Edit-only JSON textarea. Optional; no client-side validation.

## Resolution

Landed in two commits on `main`:

- `41e01dc` — `feat(admin): Webhook Subscriptions UI (per-group section + standalone TablePage)`
- `1bbd0fc` — `security(admin): escape url in WebhookSubscriptionView dialog title/message`

### What was implemented

All acceptance criteria from sections A–G + I are covered. Section H (GroupView Modal integration test) was explicitly out-of-harness and is replaced with source-text regex pinning in `WebhookSubscriptionTablePage.test.js` for the GroupView wiring invariants.

- **Model** at `src/core/models/WebhookSubscription.js`: `WebhookSubscription`, `WebhookSubscriptionList`, `WebhookSubscriptionForms.{create,edit,normalizePayload}`, `toggleActive()` prototype method. Endpoint `/api/group/webhook_subscriptions`. Events field uses the framework's existing `TagInput` (`type: 'tags'`).
- **Per-group section inside GroupView**: new `WebhookSection` / `WebhookSecretPanel` / `WebhookSubscriptionListItem` subviews registered under **Webhooks** in the Access divider, gated on `manage_group`. Inline active toggle + delete + create + click-to-edit all wired through GroupView so we own the confirm copy, toast feedback, and refetch. Secret panel does NOT auto-fetch on mount (the backend auto-mints on first POST).
- **Reveal/rotate dialogs** in GroupView (`_showWebhookSecretDialog`) — static backdrop, keyboard disabled, monospaced `user-select-all` block themed via Bootstrap surface tokens, inline `copy-to-clipboard` action (handled by inherited `View.onActionCopyToClipboard`).
- **Standalone TablePage** at `system/webhook-subscriptions` with columns id · url · events (badge) · group · status · created. Add flow calls `WebhookSubscriptionForms.normalizePayload` before save so the events transform is identical on both surfaces.
- **WebhookSubscriptionView** detail modal — header with `bi-broadcast` icon, ContextMenu with Edit / Activate-Deactivate / Delete. `WebhookSubscription.VIEW_CLASS = WebhookSubscriptionView` registered at file load. URLs are escaped via `MOJOUtils.escapeHtml` before interpolation into dialog title/message (security follow-up — see below).
- **Admin nav**: `app.registerPage('system/webhook-subscriptions', ...)` plus a System sidebar entry next to API Keys, both gated on `manage_groups` / `manage_group`.
- **Tests**: `test/unit/WebhookSubscription.test.js` and `test/unit/WebhookSubscriptionTablePage.test.js`. Source-text-pins the model endpoint, form schemas, normalize-payload contract, TablePage shape, GroupView wiring, the no-auto-fetch-secret invariant, the static-backdrop reveal dialog, and the destructive-rotate confirm. `normalizePayload` is extracted from the live source via brace-walking so the test exercises the production function (not a parallel copy).
- **Docs**: new `WebhookSubscription & WebhookSubscriptionList` section in `BuiltinModels.md`, new `Webhook Subscriptions` section in `extensions/Admin.md`, README index updated, CHANGELOG `Unreleased` entry.

### Files changed

```
A  src/core/models/WebhookSubscription.js
M  src/core/models/index.js                                              (regenerated)
A  src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionTablePage.js
A  src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionView.js
M  src/extensions/admin/account/groups/GroupView.js
M  src/admin.js
M  src/extensions/admin/index.js
A  test/unit/WebhookSubscription.test.js
A  test/unit/WebhookSubscriptionTablePage.test.js
M  docs/web-mojo/extensions/Admin.md
M  docs/web-mojo/models/BuiltinModels.md
M  docs/web-mojo/README.md
M  CHANGELOG.md
```

### Tests run

- `npx node test/test-runner.js` → 1299/1306 pass. 7 failures, all pre-existing in `test/unit/IncidentView.test.js` (same set as the pre-commit `main` baseline — confirmed via `git stash` comparison).
- `npx eslint` on the changed files → 0 errors, 1 pre-existing warning in `src/admin.js`.
- New tests:
  - `WebhookSubscription.test.js` — model endpoint, Forms field types (url/tags/switch/textarea), `normalizePayload` (comma split + trim/empty drop + array passthrough + missing key + no-mutate + null input), `toggleActive`.
  - `WebhookSubscriptionTablePage.test.js` — page identity, column order, normalize-before-save in `onActionAdd`, VIEW_CLASS registration, admin nav registration, GroupView Webhooks section ordering + permission gate, no-auto-fetch-secret invariant, static-backdrop reveal dialog, destructive rotate confirm, escapeHtml-applied-to-url-in-dialogs (regression).

### Agent findings

- **test-runner**: 1299/1306, 7 pre-existing IncidentView failures, no new regressions. ✅
- **docs-updater**: one additional edit — `docs/web-mojo/README.md` line 108 model-name list now includes `WebhookSubscription`. Everything else already covered by the commit. ✅
- **security-review**: one MEDIUM finding — `Modal.confirm` interpolates its `message` option directly into `<p>${message}</p>` without escaping, and `ModalView` does the same with `title`. The original `onActionDeleteSubscription` and `onActionEditSubscription` in `WebhookSubscriptionView.js` passed the user-controlled `url` straight into both → stored XSS if a malicious url was ever saved. **Fixed in `1bbd0fc`** by importing `MOJOUtils.escapeHtml` and wrapping the url at both call sites; new regression test pins the fix. All other reviewed areas (secret reveal dialog, list-item template, event chips, normalizePayload, permission gate, CSRF/auth, no-auto-mint) were clean.

### Follow-ups

None within scope. Out-of-scope items remain as documented in the request (recent-deliveries dashboard, test-send button, per-event-type filtering UI, bulk import/export, "subscribe to all events" affordance).
