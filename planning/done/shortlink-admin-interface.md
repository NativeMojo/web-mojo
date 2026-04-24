# ShortLink Admin Interface

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-23 |
| Priority | medium |

## Description

Add an admin UI to `src/admin.js` for managing the django-mojo `shortlink` app. Administrators with `manage_shortlinks` should be able to:

- List all shortlinks with sorting, filtering, search, pagination.
- Create new shortlinks (URL + OG metadata + expiry options).
- Edit, enable/disable, and delete existing shortlinks.
- Open a detail view that shows full config, OG metadata, click history, and a metrics chart of click activity over time.
- Browse a global click-history table (`/api/shortlink/history`).

All pages are registered via `registerSystemPages(app)` in `src/admin.js` and added to the portal sidebar under a new top-level **Shortlinks** section.

## Context

The backend ships a fully functional shortlink system (docs: `django-mojo/docs/web_developer/shortlink/README.md`) with REST CRUD at `/api/shortlink/link`, a quick-create helper at `/api/shortlink/link/create`, and click-history at `/api/shortlink/history`. Today web-mojo has no UI for any of it — links can only be created programmatically or via `curl`. Admins need a way to audit outbound shortlinks (what they point to, who created them, how often they're hit) and to create/tweak messaging links without a backend shell.

Per-link metrics are recorded as `sl:click:<code>` under the link owner's `user-<id>` account, so the detail-view chart will use the existing `SeriesChart` extension against the metrics API.

## Acceptance Criteria

- [ ] Registering `registerSystemPages(app)` registers three new routes:
  - `system/shortlinks/links` → `ShortLinkTablePage`
  - `system/shortlinks/clicks` → `ShortLinkClickTablePage`
  - (detail view opens in a modal from the links table; no separate route needed)
- [ ] New **Shortlinks** sidebar group with icon `bi-link-45deg`, gated by `manage_shortlinks`, containing two children: *Links* and *Click History*.
- [ ] `ShortLinkTablePage` columns: `code` (with copy-to-clipboard), `url` (truncated), `source`, `hit_count`, `expires_at` (formatted date), `is_active` (yes/no icon), `created`. Searchable, sortable, paginated, exportable. `showAdd` enabled.
- [ ] Create dialog collects: `url` (required, URL input), `source` (text), `expire_days`, `expire_hours`, `track_clicks` (switch), `bot_passthrough` (switch), `is_protected` (switch), and OG metadata fields (`og:title`, `og:description`, `og:image`). On submit, POSTs to `/api/shortlink/link` (standard Model.save).
- [ ] Edit dialog collects the same fields plus `is_active` switch. PUT/POSTs to `/api/shortlink/link/<id>`.
- [ ] Detail view (`ShortLinkView`) uses `TabView` with four tabs:
  1. **Details** — DataView of id, code, url, source, hit_count, expires_at, is_active, user, group, created, modified. Header shows full short URL (`{base}/s/<code>`) with copy button.
  2. **Metadata** — Editable OG/Twitter card fields (og:title, og:description, og:image, twitter:card, etc.). Saves back to `metadata` field on the model.
  3. **Click History** — Embedded `TableView` bound to `ShortLinkClickList` with `defaultQuery: { shortlink: model.id }`. Columns: created, ip, is_bot, user_agent (truncated), referer. Read-only.
  4. **Metrics** — `SeriesChart` querying `/api/metrics/fetch?slugs=sl:click:<code>&account=user-<user_id>&granularity=days&with_labels=true`. Gracefully handles links without `track_clicks` or without a `user` by showing an informational empty state.
- [ ] `ShortLinkView` context menu: *Copy Short URL*, *Open Destination*, *Enable/Disable* (toggle `is_active`), *Edit*, divider, *Delete*.
- [ ] `ShortLinkClickTablePage` (global click history) — columns: created, shortlink.code, shortlink.url (truncated), ip, is_bot (yes/no), user_agent (truncated), referer. Filterable by `shortlink` id (URL param). Read-only — no create/edit/delete actions.
- [ ] All named exports added to `src/admin.js` alongside existing page/view exports.
- [ ] No regressions in existing admin page registration or sidebar behavior.

## Investigation

### What exists

- `src/admin.js` — central admin entry point. Exports page classes, wires `registerSystemPages(app)` and `registerAssistant(app)`. Sidebar menu items are declared inline in that function.
- Existing TablePage templates to model after:
  - `src/extensions/admin/security/IPSetTablePage.js` + `IPSetView.js` — closest shape (table + detail modal + context menu + custom create flow).
  - `src/extensions/admin/messaging/push/PushTemplateTablePage.js` — simple table + form.
  - `src/extensions/admin/storage/FileTablePage.js` — table + detail view pattern.
- Existing model files follow the pattern in `src/core/models/IPSet.js` and `src/core/models/Push.js`: `Model` subclass with `endpoint`, `Collection` subclass with `ModelClass`/`endpoint`, plus a `XxxForms` object with `create` and `edit` field arrays. Re-exported via `src/core/models/index.js` (auto-generated; re-run the model export generator after adding the file).
- `SeriesChart` is available via the Charts extension (`src/extensions/Charts.js`) — used throughout existing admin dashboards.
- Permissions model: admin pages pass `{permissions: ["..."]}` to `app.registerPage`. The sidebar menu entries pass their own `permissions` array for visibility gating. Permission is evaluated OR-style across the listed perms.

### What changes

- **New model file:** `src/core/models/ShortLink.js` — exports `ShortLink`, `ShortLinkList`, `ShortLinkClick`, `ShortLinkClickList`, `ShortLinkForms` (create/edit).
- **Regenerate** `src/core/models/index.js` via the existing model export generator (the file header says "auto-generated" and "run 'npm run generate:models' to regenerate").
- **New admin extension dir:** `src/extensions/admin/shortlinks/`
  - `ShortLinkTablePage.js` — extends `TablePage`, Collection=`ShortLinkList`, itemViewClass=`ShortLinkView`, formCreate/formEdit from `ShortLinkForms`.
  - `ShortLinkView.js` — detail view with TabView (Details / Metadata / Click History / Metrics). Mirrors `IPSetView.js` structure.
  - `ShortLinkClickTablePage.js` — read-only table over `ShortLinkClickList`, no add/edit/delete controls.
- **Update** `src/admin.js`:
  - Import the three new page classes + `ShortLinkView`.
  - Add named re-exports.
  - Add three `app.registerPage(...)` calls with `{ permissions: ["manage_shortlinks"] }`.
  - Insert a new top-level sidebar menu entry `Shortlinks` with `bi-link-45deg` icon and the two children, placed sensibly in the menu order (proposed: between **Push Notifications** and **Phone Hub**).
- **No backend changes required** — all endpoints already exist.

### Constraints

- **REST conventions:** Use the existing `/api/shortlink/link` and `/api/shortlink/history` endpoints with query-param filtering. Do not propose admin-scoped mirror endpoints.
- **Model-first templates:** Views must use `this.model` (not custom names like `this.link`) and read values via `{{model.code}}` / `this.model.get('code')`.
- **Child view lifecycle:** Use `addChild()` with `containerId`. No manual `render()` / `mount()` after `addChild()`.
- **Actions:** `data-action="kebab-case"` on interactive elements; no `data-action` on `<form>`.
- **Styling:** Bootstrap 5.3 + Bootstrap Icons only. No new CSS files unless unavoidable.
- **Metrics tab:** Must tolerate shortlinks that have no metrics stream (link created without `track_clicks` or without an owning user) — render an informational empty state, not an error.
- **Short URL base:** The full short URL (`{base}/s/<code>`) should be constructed from backend-provided data. If the API does not return a base URL on the record, the detail view should read it from `app.config?.shortlinkBaseUrl` or fall back to `window.location.origin`. Prefer a backend field if present; otherwise leave a TODO for the design step to resolve.

### Related files

- `src/admin.js` — registration point and sidebar menu definition.
- `src/core/models/IPSet.js`, `src/core/models/Push.js` — reference model/form patterns.
- `src/extensions/admin/security/IPSetTablePage.js`, `IPSetView.js` — reference page/detail view patterns (TabView + DataView + ContextMenu + modal detail view).
- `src/extensions/admin/messaging/push/PushTemplateTablePage.js` — simpler TablePage reference.
- `src/extensions/Charts.js` — SeriesChart import for the metrics tab.
- `docs/web-mojo/components/TablePage.md`, `components/TableView.md`, `components/DataView.md`, `extensions/TabView.md`, `extensions/Charts.md`.
- `django-mojo/docs/web_developer/shortlink/README.md` — backend API contract.

### Endpoints

All endpoints already exist — no new ones required.

| Method | Path | Use |
|---|---|---|
| GET | `/api/shortlink/link` | List (ShortLinkList.fetch) |
| GET | `/api/shortlink/link/<id>?graph=default` | Detail load for full metadata |
| POST | `/api/shortlink/link` | Create (Model.save) |
| POST/PUT | `/api/shortlink/link/<id>` | Update (Model.save) |
| DELETE | `/api/shortlink/link/<id>` | Delete (Model.destroy) |
| GET | `/api/shortlink/history?shortlink=<id>` | Click history tab + global page |
| GET | `/api/metrics/fetch?slugs=sl:click:<code>&account=user-<uid>&granularity=days` | Metrics tab chart |

### Tests required

- No automated tests for new admin pages are required (repo convention — admin pages are plumbing on top of framework primitives already covered by unit tests).
- Manual verification:
  - Render the Links page as a user with `manage_shortlinks` — table loads, filters work.
  - Create a link via the dialog — verify it appears in the list and resolves at `/s/<code>`.
  - Open detail view — all four tabs render, metadata edits save, click history loads.
  - Toggle Enable/Disable and Delete from the context menu.
  - Confirm the Shortlinks sidebar group is hidden for users without `manage_shortlinks`.

### Out of scope

- Creating shortlinks from files in `FileView` / FileManager (the create form is URL-only per scoping).
- A public-facing / per-user "My Shortlinks" page — admin only.
- Any backend (django-mojo) changes — the backend surface is treated as frozen.
- Bulk-import / CSV upload of shortlinks.
- Editing the raw `metadata` JSON for non-OG keys via a free-form JSON editor — the Metadata tab exposes a fixed set of OG/Twitter fields only.
- QR-code generation for short URLs (noted as a possible follow-up).
- Splitting `manage_shortlinks` into view/manage variants (backend would need to change first).

---

## Plan

### Objective

Deliver a complete admin UI for shortlink management — a **Links** table page, a detail-view modal with five tabs (Details, Preview, Metadata, Click History, Metrics), and a read-only global **Click History** page — all gated by `manage_shortlinks`, registered through `registerSystemPages(app)`, and reachable from a new top-level **Shortlinks** sidebar group (placed between *Push Notifications* and *Phone Hub*).

No backend changes. Uses the existing `/api/shortlink/link`, `/api/shortlink/history`, and `/api/metrics/fetch` endpoints.

### UX intent (so the code matches the design)

Who uses this and for what:

1. **Audit** — Admin lands on *Shortlinks → Links*, scans the table for links with high/low hit counts, near-expiry, inactive, or coming from unexpected `source` values.
2. **Create** — Admin clicks *Add*, enters a URL + optional OG title/description/image, chooses expiry & tracking, and gets back a ready-to-paste short URL via a success toast (one-click copy).
3. **Inspect** — Admin clicks a row → detail modal. The **short URL is the hero** (large, monospaced, prominent copy button). Tabs in priority order:
   - **Details** — core fields at a glance.
   - **Preview** — visual mock-up of the Slack/iMessage bot card rendered from OG metadata (the killer feature — this is *why* shortlinks exist).
   - **Metadata** — editable form for `og:*` / `twitter:*` keys flattened from `metadata`.
   - **Click History** — per-link recent clicks with bot flag and referer.
   - **Metrics** — time-series chart of clicks (gracefully degrades when the link has no `track_clicks` / no owning user).
4. **Intervene** — Context-menu: *Copy Short URL*, *Open Destination*, *Enable/Disable*, *Edit*, *Delete*. Disable is the common case when a link is being abused.
5. **Forensics** — *Shortlinks → Click History* top-level page shows every click across all links, filterable by `shortlink` id.

### Short URL resolution (base URL)

The backend does not return the composed short URL on list/detail responses — only `code`. To build `{base}/s/<code>` on the client:

1. Prefer `this.getApp().config?.shortlink_base_url` (app-level config that tenants may set).
2. Fall back to `window.location.origin`.

Encapsulate in a small helper in `ShortLinkView.js` (`getShortUrl(model, app)`). If the backend later adds a `short_link` field, the helper trivially prefers it.

### Steps

1. **`src/core/models/ShortLink.js` (NEW)**
   - `ShortLink extends Model` with `endpoint: '/api/shortlink/link'`.
   - `ShortLinkList extends Collection` with `ModelClass: ShortLink`, same endpoint.
   - `ShortLinkClick extends Model` with `endpoint: '/api/shortlink/history'` (read-only semantics — do not call `destroy()` or `save()` on it).
   - `ShortLinkClickList extends Collection` with `ModelClass: ShortLinkClick`, same endpoint.
   - `SHORTLINK_SOURCE_OPTIONS` constant: `email`, `sms`, `push`, `fileman`, `admin`, `api`, `other` (used for filter + source select).
   - `ShortLinkForms` object:
     - `create` — fields: `url` (required URL), `source` (text, default 'admin'), `expire_days` (number, default 3), `expire_hours` (number, default 0), `track_clicks` (switch, default false), `bot_passthrough` (switch, default false), `is_protected` (switch, default false), and — under a visual *OG Metadata (optional)* section/heading — `og_title` (text), `og_description` (textarea, rows 2), `og_image` (text, URL).
     - `edit` — same plus `is_active` (switch). Custom create/edit handlers (see step 2) flatten the `og_*` fields into `metadata`.
   - Bottom of file: `ShortLink.VIEW_CLASS = ShortLinkView` wiring is deferred to `ShortLinkView.js` itself (matches `IPSetView.js:286` pattern) to avoid a circular import.

2. **Regenerate `src/core/models/index.js`** — run `npm run generate:models`. This picks up the new file and adds the standard `export * from './ShortLink.js'` + default export lines. The file header explicitly says *"auto-generated"*, so do not hand-edit.

3. **`src/extensions/admin/shortlinks/ShortLinkTablePage.js` (NEW)**
   - Extends `TablePage`.
   - Constructor config:
     - `name: 'admin_shortlinks'`, `pageName: 'Shortlinks'`, `router: 'admin/shortlinks/links'`.
     - `Collection: ShortLinkList`, `itemViewClass: ShortLinkView`.
     - `viewDialogOptions: { header: false, size: 'xl' }`.
     - `defaultQuery: { sort: '-created' }`.
     - Columns (see **UX intent** — hero data):
       - `is_active` — 70px, `yesnoicon`, filter: select {true,false}.
       - `code` — custom `template` rendering `<code>{{model.code}}</code>` + a copy button (`<button data-action="copy-code" data-code="{{model.code}}">`) using a row action pattern; sortable.
       - `url` — formatter `truncate(60)|default('—')`, sortable; cell tooltip via `title` shows full URL.
       - `source` — 100px, filter: select (SHORTLINK_SOURCE_OPTIONS).
       - `hit_count` — 80px, sortable, right-aligned.
       - `track_clicks` — 80px, `yesnoicon`.
       - `expires_at|datetime` — 160px, sortable; style expiring-soon rows (<24h) via a `cellClass` callback if feasible; otherwise plain.
       - `created|datetime` — 160px, sortable, `visibility: 'lg'`.
     - `searchable: true` (search on code + url), `sortable: true`, `filterable: true`, `paginated: true`, `showAdd: true`, `showExport: true`, `showRefresh: true`.
     - `tableOptions: { actions: ['edit', 'delete'], striped: true, hover: true, emptyMessage: 'No shortlinks yet — create one to share a link with rich previews.', emptyIcon: 'bi-link-45deg' }`.
     - `batchActions`: *Disable*, *Enable*, *Delete* (mirrors `IPSetTablePage` pattern).
   - Override `onAdd()` with a custom handler `_handleAdd()` that:
     1. Calls `Modal.form({...ShortLinkForms.create})`.
     2. If result is returned, transforms `{og_title, og_description, og_image, ...rest}` → `rest.metadata = {'og:title': og_title, 'og:description': og_description, 'og:image': og_image}` (omit falsy keys; do not send `metadata` at all if empty — lets backend auto-scrape).
     3. `await new ShortLink().save(rest)` → on success, toast `Short URL: {shortUrl} [Copy]` (use `app.toast.success` with an action if supported, else plain text + rely on auto-copy-to-clipboard like `PushTemplateTablePage` does). Reuse `getShortUrl()` from `ShortLinkView.js`.
     4. Refresh the collection.
   - Override `onItemEdit()` similarly so the edit dialog flattens/unflattens `metadata`.
   - Batch actions:
     - `onActionBatchDisable` — `model.save({ is_active: false })` for each selected, toast, refresh.
     - `onActionBatchEnable` — inverse.
     - `onActionBatchDelete` — `Dialog.confirm` then `Promise.all(selected.map(item => item.model.destroy()))`, toast, refresh.
   - `onActionCopyCode(event, element)` — read `element.dataset.code`, compose full URL with `getShortUrl`, `navigator.clipboard.writeText(url)`, toast `Copied: {url}`.

4. **`src/extensions/admin/shortlinks/ShortLinkView.js` (NEW)**
   - Extends `View`. Header is the hero: large short URL with copy, badges (is_active / source / expired), and a context menu on the right.
   - Exports `getShortUrl(model, app)` helper used elsewhere (also used by the TablePage's create handler).
   - Template outline (match `IPSetView.js` pattern):
     ```html
     <div class="shortlink-view-container">
       <div class="d-flex justify-content-between align-items-start mb-3">
         <div class="d-flex align-items-center gap-3 flex-grow-1">
           <div class="fs-1 text-primary"><i class="bi bi-link-45deg"></i></div>
           <div class="flex-grow-1">
             <div class="input-group input-group-lg mb-2" style="max-width: 560px;">
               <input type="text" class="form-control font-monospace" readonly value="{{shortUrl}}" data-container="short-url-input">
               <button class="btn btn-outline-primary" data-action="copy-short-url" title="Copy short URL"><i class="bi bi-clipboard"></i></button>
               <a class="btn btn-outline-secondary" href="{{shortUrl}}" target="_blank" rel="noreferrer" title="Open in new tab"><i class="bi bi-box-arrow-up-right"></i></a>
             </div>
             <div class="text-muted small text-truncate" style="max-width: 560px;">
               <i class="bi bi-arrow-right"></i> {{model.url}}
             </div>
             <div class="d-flex align-items-center gap-2 mt-2">
               <span class="badge {{activeBadge}}">{{activeLabel}}</span>
               {{#model.source}}<span class="badge bg-secondary">{{model.source}}</span>{{/model.source}}
               {{#model.hit_count}}<span class="badge bg-light text-dark border">{{model.hit_count}} hits</span>{{/model.hit_count}}
               {{#isExpired|bool}}<span class="badge bg-danger">Expired</span>{{/isExpired|bool}}
             </div>
           </div>
         </div>
         <div data-container="shortlink-context-menu"></div>
       </div>
       <div data-container="shortlink-tabs"></div>
     </div>
     ```
   - `onInit()` builds the five tab views (no data fetches in `onAfterRender`):
     - **Details tab** — `new DataView({ model: this.model, className: 'p-3', columns: 2, showEmptyValues: true, emptyValueText: '—', fields: [...] })`. Fields: `code` (monospace template), `url` (type: 'url'), `source`, `hit_count`, `is_active` (yesnoicon), `track_clicks` (yesnoicon), `bot_passthrough` (yesnoicon), `is_protected` (yesnoicon), `expires_at` (format datetime), `user.username` (fallback '—'), `group.name`, `created` (datetime), `modified` (datetime).
     - **Preview tab** — inline `new View({ template, ...metadata fields })` that renders a card approximating the Slack/iMessage preview:
       ```html
       <div class="p-3">
         <p class="text-muted small">Preview of how this link looks when shared in Slack, iMessage, WhatsApp, etc.</p>
         <div class="card" style="max-width: 500px; border-left: 4px solid #0d6efd;">
           {{#ogImage}}<img src="{{ogImage}}" class="card-img-top" style="max-height: 240px; object-fit: cover;" onerror="this.style.display='none'">{{/ogImage}}
           <div class="card-body">
             <div class="text-muted small mb-1">{{domain}}</div>
             <h5 class="card-title mb-1">{{ogTitle}}</h5>
             <p class="card-text small text-muted mb-0">{{ogDescription}}</p>
           </div>
         </div>
         {{^hasOg|bool}}<div class="alert alert-info mt-3 mb-0 small"><i class="bi bi-info-circle me-1"></i>No OG metadata set. The backend will auto-scrape the destination URL, or add custom values in the <strong>Metadata</strong> tab.</div>{{/hasOg|bool}}
       </div>
       ```
       Data is read from `this.model.get('metadata') || {}` in the view's constructor and exposed as `ogTitle`, `ogDescription`, `ogImage`, `hasOg`, `domain` (derived from `new URL(url).hostname`).
     - **Metadata tab** — `FormView` child with fields `og_title`, `og_description` (textarea rows 3), `og_image` (URL), `twitter_card` (select: summary, summary_large_image), `twitter_title`, `twitter_description`, `twitter_image`. Mount with `containerId: 'shortlink-tabs'`-style child usage inside the tab. On submit: compose `metadata = {'og:title': og_title, 'og:description': og_description, 'og:image': og_image, 'twitter:card': twitter_card, ...}` (drop empties), then `model.save({ metadata })`. Toast on success, re-render the Preview tab to reflect changes (use `tabView.getTab('Preview')` + `.render()`).
     - **Click History tab** — inline `new View` that lazily creates a `TableView` in `onTabActivated()` to avoid fetching on mount of the parent. TableView options:
       - `collection: new ShortLinkClickList({ params: { shortlink: this.model.id, sort: '-created' } })`.
       - Columns: `created|datetime` (180px, sortable), `ip` (monospace), `is_bot` (80px, yesnoicon, filter: select {true,false}), `user_agent` (truncate 40), `referer` (truncate 40, default '—').
       - `paginated: true`, `searchable: false`, `filterable: true`, `sortable: true`, `tableOptions: { emptyMessage: this.model.get('track_clicks') ? 'No clicks recorded yet.' : 'Click tracking is disabled for this link.' }`.
       - Call `tableView.refresh()` on `onTabActivated()` (cheap if already loaded).
     - **Metrics tab** — inline View:
       - If `!model.get('track_clicks') || !model.get('user')`: render an info panel explaining metrics require both and link to the Edit dialog to enable tracking.
       - Otherwise: `new MetricsChart({ containerId: 'metrics-chart', title: 'Clicks', slugs: [`sl:click:${code}`], account: `user-${userId}`, granularity: 'days', defaultDateRange: '30d', yAxis: { label: 'Clicks', beginAtZero: true }, tooltip: { y: 'number' } })` and `addChild()`.
   - Assemble `this.tabView = new TabView({ containerId: 'shortlink-tabs', tabs: { Details, Preview, Metadata, 'Click History', Metrics }, activeTab: 'Details' })` and `addChild(this.tabView)`.
   - Context menu (match `IPSetView.js:181-200`) — `new ContextMenu({ containerId: 'shortlink-context-menu', context: this.model, config: { icon: 'bi-three-dots-vertical', items: [...] } })`. Items: Copy Short URL, Open Destination (opens `model.url`), divider, Enable/Disable (conditional), Edit Shortlink, divider, Delete Shortlink (danger).
   - Actions:
     - `onActionCopyShortUrl` — clipboard write + toast.
     - `onActionOpenDestination` — `window.open(model.url, '_blank', 'noopener,noreferrer')`.
     - `onActionEnableShortlink` / `onActionDisableShortlink` — `model.save({ is_active: !current })`, toast, `this.render()`.
     - `onActionEditShortlink` — `Dialog.showModelForm({ title, model, formConfig: ShortLinkForms.edit, transform: flattenMetadataForForm, onSubmit: unflattenMetadata })` — if showModelForm supports transforms; otherwise open the form with pre-populated og_* fields seeded from `model.get('metadata')` and handle reshaping in the submit callback.
     - `onActionDeleteShortlink` — confirm, `model.destroy()`, emit `shortlink:deleted`, close modal (find ancestor `.modal` and hide).
   - At the bottom of the file: `ShortLink.VIEW_CLASS = ShortLinkView;` and `export default ShortLinkView;`.

5. **`src/extensions/admin/shortlinks/ShortLinkClickTablePage.js` (NEW)**
   - Extends `TablePage`.
   - `name: 'admin_shortlink_clicks'`, `pageName: 'Click History'`, `router: 'admin/shortlinks/clicks'`.
   - `Collection: ShortLinkClickList`, no `itemViewClass` (read-only list).
   - `defaultQuery: { sort: '-created' }`.
   - Columns: `created|datetime`, `shortlink.code` (monospace, link to `?page=system/shortlinks/links&search=<code>`), `shortlink.url` (truncate 50), `ip` (monospace, width 140), `is_bot` (80px, yesnoicon, filter: select), `user_agent|truncate(40)`, `referer|truncate(40)|default('—')`.
   - `searchable: false`, `sortable: true`, `filterable: true`, `paginated: true`, `showAdd: false`, `showExport: true`.
   - `tableOptions: { actions: [], emptyMessage: 'No clicks recorded. Click tracking is only captured when `track_clicks=true` on the shortlink.', emptyIcon: 'bi-cursor' }`.
   - Accept `?shortlink=<id>` URL param — TablePage's `urlSyncEnabled` handles this automatically as a filter.

6. **`src/admin.js` (MODIFY)**
   - Add imports: `ShortLinkTablePage`, `ShortLinkView`, `ShortLinkClickTablePage` (named + default-to-class imports matching the existing style).
   - Add named re-exports alongside the existing blocks (after the Storage exports).
   - Inside `registerSystemPages(app)`:
     ```js
     app.registerPage('system/shortlinks/links',  ShortLinkTablePageClass,       { permissions: ["manage_shortlinks"] });
     app.registerPage('system/shortlinks/clicks', ShortLinkClickTablePageClass,  { permissions: ["manage_shortlinks"] });
     ```
   - Insert a new sidebar entry in `adminMenuItems`, **after Push Notifications and before Phone Hub**:
     ```js
     {
       text: 'Shortlinks',
       route: null,
       icon: 'bi-link-45deg',
       permissions: ["manage_shortlinks"],
       children: [
         { text: 'Links',         route: '?page=system/shortlinks/links',  icon: 'bi-link',   permissions: ["manage_shortlinks"] },
         { text: 'Click History', route: '?page=system/shortlinks/clicks', icon: 'bi-cursor', permissions: ["manage_shortlinks"] },
       ]
     },
     ```

### Design Decisions

- **Modal detail view (not a dedicated page route).** Matches `IPSetTablePage` + `IPSetView`. Keeps navigation tight, avoids routing complexity for a feature that's always accessed from the list. No separate `view_shortlink` page is registered — the row click opens the modal via `itemViewClass`.
- **Tabs over a long scroll.** `TabView` pattern (`IPSetView`, `IncidentView`) isolates concerns and lazy-mounts heavy content (Click History table + Metrics chart). `onTabActivated()` hooks (documented in `TabView.md`) drive lazy data fetching.
- **OG fields flattened for form UX, re-nested in save.** Admins shouldn't hand-edit a JSON blob to set `og:title`. Flatten `metadata.og:*` into sibling fields on the form and re-nest in the `onSubmit` / `onAdd` handler. This matches how `IPSetTablePage._handleAdd` transforms `country_code` into kind-specific fields.
- **Hero short URL.** The most valuable data to a shortlink admin is the short URL itself. Surface it in an `input-group` with a copy button and "open" button so the action is one click regardless of context.
- **Preview tab before Metadata tab.** Default tab is Details, but *Preview* appears second — before *Metadata* — so admins can immediately see the rendered card before deciding whether to edit metadata. This is the "why shortlinks exist" workflow.
- **Backend-owned auto-scrape preserved.** By sending an empty / missing `metadata` on create (when no OG fields entered), we let the backend's auto-scraper populate on create. Only send `metadata` when the admin explicitly set fields.
- **Click history read-only.** `ShortLinkClick` has no forms, no row actions, no `itemViewClass`. Backend docs explicitly say clicks are not writable.
- **Metrics tab gracefully degrades.** A link without `track_clicks=true` or without a `user` has no metrics stream. The tab shows an informational state rather than an empty chart or an error.
- **Base URL resolution with `window.location.origin` fallback.** No backend change required. Tenants using custom shortener domains (e.g., `itf.io`) can set `app.config.shortlink_base_url` on app init.
- **No new CSS file.** All styling uses Bootstrap 5.3 utilities + Bootstrap Icons. Custom classes (`shortlink-view-container`) use existing admin styles; if isolated style tweaks are needed, add them to `src/extensions/admin/css/admin.css`.

### Edge Cases

- **No OG metadata on a link.** Preview tab shows an info alert + the auto-scrape explanation. Details tab still shows `url`. Nothing breaks.
- **Destination URL is malformed.** `new URL(model.url)` in the Preview view is wrapped in `try/catch` — fall back to the raw string for `domain`.
- **Link has `expires_at` in the past.** Show an "Expired" badge in the header; don't block actions (admins may still want to inspect or re-enable by editing).
- **Backend returns `short_link` field in a future version.** Helper prefers `model.get('short_link')` before falling back to `{base}/s/<code>`.
- **User hits Edit from the table while the detail modal is open.** Not possible via UX (edit in the modal uses the same dialog); no lock needed.
- **User without `manage_shortlinks`.** Menu group is hidden (permissions gate in sidebar definition). Direct URL navigation returns a permission error from the existing page guard — no special handling needed.
- **Metrics account mismatch.** If the current user lacks access to `user-<ownerId>` metrics, the metrics fetch will 403. `MetricsChart` already emits `chart:error` — catch at the tab view level and render an info panel "Metrics unavailable for this link's owner".
- **Model.save() returns 400 (e.g., backend validation rejects a URL).** `Model.save` rejects or returns `{status: false, error}` — reuse the IPSet handler pattern (`Modal.showError(resp?.data?.error || ...)`).
- **Clipboard API unavailable (older browsers / insecure context).** Wrap `navigator.clipboard.writeText` in try/catch; on failure, fall back to selecting the input in the header and showing a toast "Select the URL and press Cmd/Ctrl+C".
- **Copy-Code column button inside sortable row.** Ensure the button uses `data-action="copy-code"` and stops propagation so it doesn't trigger the row-click view handler. The framework's `data-action` delegation handles this, but verify during build.
- **Long destination URLs in Click History.** `truncate(40)` columns with a `title` attribute (browser tooltip) keep the table scannable.

### Testing

- No automated test additions (admin pages are plumbing; framework primitives already unit-tested). Run `npm run lint` on changed files.
- Regenerate models: `npm run generate:models` — confirm `src/core/models/index.js` includes ShortLink exports with no unrelated diff.
- Manual verification in the dev server (`npm run dev`):
  1. Log in as a user with `manage_shortlinks`. *Shortlinks* group appears in sidebar.
  2. Open *Links*. Table loads (may be empty). Filter by source + is_active, sort by hit_count, search by code.
  3. Click *Add*. Enter a real URL (e.g., a news article) + OG title/description/image. Submit. Toast shows the short URL. Row appears in the list.
  4. Visit the short URL in another tab — redirects to destination.
  5. Click the row. Detail modal opens. Header shows short URL + copy. Tabs cycle through:
     - Details: all fields populated.
     - Preview: card renders your OG title/description/image.
     - Metadata: edit `og:title`, submit. Preview tab re-renders.
     - Click History: empty initially. Reload the redirect a few times, refresh — clicks appear (if track_clicks was enabled).
     - Metrics: if track_clicks + user, chart renders. Otherwise info panel.
  6. Context menu → Disable. Badge flips to *Disabled*. Redirect now hits fallback.
  7. Context menu → Delete. Confirm. Modal closes, row removed.
  8. Navigate to *Click History* page. Filter by `shortlink` id (set via URL `?shortlink=<id>`).
  9. Log in as a user without `manage_shortlinks`. *Shortlinks* group is hidden.
- Spot-check in a narrow viewport — TabView switches to dropdown mode.

### Docs Impact

- Add to `CHANGELOG.md` under the next version: `- Admin: shortlink management interface (list, create, detail-view with OG preview, click history, metrics). Register via `registerSystemPages(app)` — requires `manage_shortlinks` permission.`
- Add `docs/web-mojo/extensions/Admin.md` entry (if that file enumerates admin pages) listing Shortlinks + Click History.
- No new public API docs — all new classes are admin extensions, not framework primitives.
- Do not add any `docs/pending_update/` file.


---

## Resolution

**Status:** Resolved — 2026-04-23

### What was implemented

Delivered the full admin surface described in the plan: a `manage_shortlinks`-gated top-level *Shortlinks* sidebar group with two pages (*Links*, *Click History*), a detail modal with five tabs (Details, Preview, Metadata, Click History, Metrics), OG metadata flattening/unflattening on create/edit, a short-URL copy button in the list and modal header, and a context menu for common operations. No backend changes required.

### Files changed

**New:**
- `src/core/models/ShortLink.js` — `ShortLink`, `ShortLinkList`, `ShortLinkClick`, `ShortLinkClickList`, `ShortLinkForms`, plus metadata helpers (`flattenShortLinkMetadata`, `buildShortLinkMetadata`, `extractShortLinkPayload`).
- `src/extensions/admin/shortlinks/ShortLinkTablePage.js` — CRUD table page with batch Enable/Disable/Delete and custom Add/Edit handlers that transform `og_*` / `twitter_*` form fields into the API's `metadata` map.
- `src/extensions/admin/shortlinks/ShortLinkView.js` — detail modal with TabView (Details / Preview / Metadata / Click History / Metrics), context menu, and actions. Exports `getShortUrl(model, app)` helper (prefers `model.short_link`, then `app.config.shortlink_base_url`, then `window.location.origin`).
- `src/extensions/admin/shortlinks/ShortLinkClickTablePage.js` — read-only global click history table.

**Modified:**
- `src/admin.js` — three new exports, two `registerPage` calls, new sidebar menu entry between *Push Notifications* and *Phone Hub*.
- `src/core/models/index.js` — regenerated via `npm run generate:models`.

**Docs:**
- `CHANGELOG.md` — entries for the new admin UI and the models.
- `docs/web-mojo/extensions/Admin.md` — documents the new page and view classes.
- `docs/web-mojo/models/BuiltinModels.md` — documents `ShortLink`, `ShortLinkClick`, forms, and metadata helpers.

### Commits

- `154861d` — Admin: add shortlink management UI (list, detail, click history)
- `e37f780` — ShortLinkView: block javascript: URLs in Open Destination
- `71d2a4d` — Docs: document shortlink admin UI + built-in models

### Tests run

- `npm run lint` on the five touched files — clean.
- `npm run test:unit` — 407/407 passed.
- `npm run build:lib` — built cleanly (600 kB admin chunk).
- `npm run generate:models` — index regenerated with ShortLink exports.
- Browser-side import smoke test via Vite dev server — `ShortLinkTablePage`, `ShortLinkClickTablePage`, `ShortLinkView` all load as functions; `ShortLink` model endpoint resolves correctly; `extractShortLinkPayload` round-trips OG metadata (nests when set, omits when empty so backend auto-scrape still runs).
- `npm test` (full suite via test-runner agent) — zero new failures; pre-existing integration/build failures are unrelated (`@core` alias gap in integration runner, stale `src/mojo.js` path, missing `dist/` artefacts).

### Agent findings

- **test-runner:** 407/407 unit pass; all integration/build failures pre-existing and unrelated.
- **docs-updater:** updated `CHANGELOG.md`, `docs/web-mojo/extensions/Admin.md`, `docs/web-mojo/models/BuiltinModels.md` (committed in `71d2a4d`).
- **security-review:** one actionable finding — `onActionOpenDestination` could launch `javascript:` URLs. Fixed in `e37f780` with a `/^https?:\/\//i` guard. Other items (OG image `onerror`, anchor `href`, `data-code`) analyzed as safe due to Mustache escaping + composed (non-user) short-URL origin. `model.toJSON()` spread into edit form seed flagged as info — the backend already filters unknown fields.

### Validation

Final behavior verified via module imports in the Vite dev server and lint/build/unit tests. No end-to-end admin-app harness is available in the framework source repo — admins consuming `web-mojo` will see the new Shortlinks group in their portal sidebar after upgrading, with all functionality described above.
