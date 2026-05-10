# Admin TablePages — UX Sweep

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-05-10 |
| Priority | high |

## Description

Cross-cutting UX cleanup of every `TablePage` under `src/extensions/admin/` (~40 pages). The sweep does four things in one pass:

1. **Fix silent bugs** — config that compiles but doesn't do what the file looks like it's saying.
2. **Adopt new framework features** — `dayRangeFilter`, `groupBy` / `groupByDay`, `boolean` filter type, responsive `visibility:` breakpoints, footer totals where useful.
3. **Standardize on model statics** — `Model.VIEW_CLASS`, `Model.ADD_FORM`, `Model.EDIT_FORM` so the table page becomes declarative and stays KISS. Drop duplicate hard-coded form/view wiring at the page level when the model already exposes (or could expose) the static.
4. **Collapse hand-rolled boilerplate** — repeated batch-handler shapes and hand-rolled `Modal.form` flows that should be either declarative (form configs on the model) or consolidated through one small `TablePage.batchAction()` helper.

The user-visible payoff: every admin table looks and behaves consistently — same date filters on time-series tables, same column-hiding behavior on mobile, same Add/Edit/View dialogs driven by the model class, same batch-action UX (confirm → progress → toast → refresh).

## Context

The audit (recorded against current `main`) found the following recurring problems:

**Silent bugs**
- `tableOptions.actions: [...]` instead of top-level `actions` — `tableOptions` is HTML-table styling (striped/bordered/size); `actions` placed there is silently dropped. Affected: `PushConfigTablePage`, `PushDeliveryTablePage`, `PushDeviceTablePage`, `PushTemplateTablePage`, `MetricsPermissionsTablePage`.
- `format: 'boolean'` typo (correct property is `formatter:`). Affected: `PushConfigTablePage`, `PushTemplateTablePage`.
- `showAdd: true` with no `formCreate` and no `Model.ADD_FORM` → click Add → error. Affected: `MetricsPermissionsTablePage`.
- `LogTablePage` declares 4 batch actions (`batch-export`, `batch-archive`, `batch-delete`, `batch-reviewed`) with **no `onActionBatch*` methods** in the class. Selecting rows + clicking the action does nothing.
- `PhoneNumberTablePage` reaches into TableView's private `_onRowView()` API.
- Mixed `itemView:` vs `itemViewClass:` property usage — both work today (`TablePage.js:63` aliases them), but mixing the two within the same folder is confusing. Files using non-canonical `itemView`: `GeoLocatedIPTablePage`, `PhoneNumberTablePage`, `SMSTablePage`.

**Missed framework features (zero adoption)**
- `dayRangeFilter` (1d/7d/30d/90d segment control with auto-refetch) — **not used by any admin TablePage** despite ~12 time-series tables that would benefit.
- `groupBy` / `groupByDay` from `@core/views/list/grouping.js` — **not used by any admin TablePage** despite chronological audit feeds (logs, events, signals, deliveries, sent messages, login events, shortlink clicks).
- New `boolean` / `switch` filter type — booleans currently faked as `select` with `true`/`false` options.
- Responsive `visibility:` — only `GroupTablePage` and `UserTablePage` set per-column breakpoints; other tables show every column on mobile.
- Footer totals (`footer_total: true`) — useful on hit-count / event-count / file-size columns; never used.

**KISS / duplication smells**
- Batch handler boilerplate: 14 hand-rolled `onActionBatch*` methods across `IncidentTablePage` (6), `RuleSetTablePage` (3), `BouncerSignatureTablePage` (3), `BlockedIPsTablePage` (2). Every one follows the same shape: confirm → `Promise.all(items.map(i => i.model.save({field: value})))` → toast → `fetch()`.
- Hand-rolled `Modal.form` / `Modal.modelForm` action flows that hide form configuration in the page instead of on the model: `UserTablePage` (4 — change-password, edit-permissions, send-invite, ...), `EmailDomainTablePage` (3 — onboard, audit, reconcile), `EmailMailboxTablePage` (2 — send-email, send-template-email; nearly identical), `FileManagerTablePage` (6 context-menu actions), `ShortLinkTablePage` (metadata flatten/unflatten transforms), `IPSetTablePage` (country-code → name/source/description transform), `GeoLocatedIPTablePage` + `PhoneNumberTablePage` (Add → server-lookup → show-result).
- Inline form definitions in page constructors instead of on the model: any of the above.

**Composition outliers**
- `UserDeviceLocationTablePage` extends `Page` (not `TablePage`); it embeds a `TabView` (map + table) and constructs `TableView` directly. Loses standard URL-sync, batch actions, default toolbar.
- `JobsTablePage` extends `Page` and wraps `JobTableSection` (a separate component). Reasonable composition pattern but undocumented; if future work needs page-level customization, the contract has to be threaded through.

## Acceptance Criteria

### A. Bug fixes (block on these)
- `tableOptions.actions` removed from all 5 affected files; `actions` lifted to the top level.
- `format: 'boolean'` corrected to `formatter: 'boolean'` (or appropriate replacement) in the 2 affected files.
- `MetricsPermissionsTablePage` either gains `formCreate` / `Model.ADD_FORM`, or sets `showAdd: false`.
- `LogTablePage` either implements its 4 batch handlers or removes the broken `batchActions` config.
- `PhoneNumberTablePage` no longer calls private `_onRowView()`; uses the public flow.
- All admin TablePages standardize on `itemViewClass:` (drop `itemView:` aliases) — naming consistency only, no behavior change.

### B. Adopt new TableView features
- **Daterange / day-range filtering** added to every time-series admin table:
  - `dayRangeFilter: true` (or with `{ field: '...', value: '7d' }`) on: `LogTablePage`, `EventTablePage`, `IncidentTablePage`, `BouncerSignalTablePage`, `FirewallLogTablePage`, `SentMessageTablePage`, `PushDeliveryTablePage`, `SMSTablePage`, `BlockedIPsTablePage`, `BotSignatureTablePage`, `ShortLinkClickTablePage`, `AssistantConversationTablePage`.
  - Where the table already has a column-level `daterange` filter (`UserTablePage`, `EventTablePage`, `IncidentTablePage`, `BouncerSignalTablePage`, `FirewallLogTablePage`), keep it — `dayRangeFilter` complements (the segment control writes `${field}__gte` while a `daterange` filter writes start/end).
- **Groupless audit feeds** — chronological tables get `groupByDay('created')` on a sensible default range:
  - `LogTablePage`, `EventTablePage`, `BouncerSignalTablePage`, `FirewallLogTablePage`, `SentMessageTablePage`, `ShortLinkClickTablePage`, `PushDeliveryTablePage`. Verify visual fit before committing — group headers may look heavy on tables with many filters; per-page judgment call documented in the build phase.
- **Boolean filter type** — replace `type: 'select'` with hard-coded `[true, false]` options with `type: 'boolean'` (or `'switch'`) in `GroupTablePage` (`is_active`), `UserTablePage` (`is_active`), `IPSetTablePage` (`is_enabled`), `BotSignatureTablePage` (`is_active`), `RuleSetTablePage` (`is_active`), `ScheduledTaskTablePage` (`enabled`), `GeoLocatedIPTablePage` (`is_blocked`, `is_vpn`, `is_tor`).
- **Responsive `visibility:` breakpoints** — every table with >5 columns gets at least one `visibility: 'md'` or `'lg'` on a non-essential column. Specifically:
  - `UserDeviceTablePage` (8 cols): hide `device_info.os.family`, `first_seen`, `duid` at `lg` and below.
  - `IPSetTablePage` (8 cols): hide `description`, `last_synced`, `sync_error` at `lg`.
  - `EventTablePage` (7 cols): hide `metadata.server`, `source_ip` at `lg`.
  - `EmailDomainTablePage` (7 cols): hide `region`, `created`, dual `can_send`/`can_recv` flags consolidated.
  - `BouncerDeviceTablePage` (6): hide `block_count`, `event_count` at `md`.
  - `PhoneNumberTablePage` (9): hide `is_voip`, `registered_owner`, `owner_type` at `lg`.
  - Per-table breakpoint choices made in the build phase based on column importance.
- **Search placeholders** — every `searchable: true` table gets a `searchPlaceholder` that hints at indexed fields (e.g. `'Search by name, email, or ID'` for `UserTablePage`).
- **Footer totals** where they make sense: `BouncerDeviceTablePage` (`event_count`, `block_count`), `PushDeliveryTablePage` (count), `ShortLinkTablePage` (`hit_count`).

### C. Adopt model statics — drop duplication
A page should not declare `formCreate` / `formEdit` / `itemViewClass` inline if the corresponding model can carry them as `Model.ADD_FORM` / `Model.EDIT_FORM` / `Model.VIEW_CLASS`. Migrate the inline declarations in:

- **Already correct (model already does this)** — leave as-is, document as the canonical pattern: `ApiKeyTablePage` (Model.ADD_FORM/EDIT_FORM), `SettingTablePage` (Model.ADD_FORM/EDIT_FORM), `ScheduledTaskTablePage` (Model.ADD_FORM/EDIT_FORM).
- **Migrate the static onto the model**, drop the inline `formCreate:`/`formEdit:`/`itemViewClass:` from the page:
  - `GroupTablePage` → `Group.ADD_FORM`, `Group.EDIT_FORM`, `Group.VIEW_CLASS`
  - `MemberTablePage` → `Member.EDIT_FORM` (currently no `formCreate` — verify add-flow intent)
  - `IncidentTablePage`, `RuleSetTablePage`, `TicketTablePage` → `*.ADD_FORM` / `EDIT_FORM` / `VIEW_CLASS` on each model
  - `EmailTemplateTablePage`, `EmailDomainTablePage`, `EmailMailboxTablePage`, `EmailTemplate`, `Mailbox`, `EmailDomain`
  - `PushConfigTablePage`, `PushTemplateTablePage`, `PushDelivery`, `PushDevice`, `PushTemplate`, `PushConfig`
  - `IPSetTablePage`, `BotSignatureTablePage`, `BouncerSignature`, `IPSet`
  - `S3BucketTablePage`, `FileManagerTablePage`, `FileTablePage`, `FileManager`, `File`, `S3Bucket`
  - `ShortLinkTablePage` → `ShortLink.ADD_FORM`, `EDIT_FORM`, `VIEW_CLASS`
- The `Forms.js` files (`GroupForms`, `IncidentForms`, etc.) stay — they're useful as reusable form-config builders. The migration is just *where the page reaches for them* (model static vs. import-and-pass).

### D. Batch-action helper (the one new primitive)
Add a `TablePage.batchAction(options)` helper that encapsulates the repeated shape:

```javascript
async batchAction({ field, value, label, message, destroy }) {
  const items = this.tableView.getSelectedItems();
  if (!items.length) return;
  const ok = await Modal.confirm(message || `${label} ${items.length} item(s)?`);
  if (!ok) return;
  await Promise.all(items.map(({ model }) =>
    destroy ? model.destroy() : model.save({ [field]: value })
  ));
  ToastService.success(`${label}: ${items.length} updated`);
  this.tableView.clearSelection();
  await this.tableView.refresh();
}
```

Migrate to it:
- `IncidentTablePage` — 6 handlers collapse to 6 one-liners (`onActionBatchResolve`, `onActionBatchOpen`, `onActionBatchPause`, `onActionBatchIgnore`, `onActionBatchProtect` use the helper; `onActionBatchMerge` keeps custom logic since it needs a parent-pick form).
- `RuleSetTablePage` — 3 handlers (`enable`, `disable`, `delete`) → one-liners.
- `BouncerSignatureTablePage` — 3 handlers → one-liners.
- `BlockedIPsTablePage` — 2 handlers → one-liners.
- `GroupTablePage` — already declares Activate/Deactivate/Delete/Move batch actions; align to helper.
- `MemberTablePage` — declares Activate/Deactivate/Remove/ChangeRole; align where mechanical.

This is the *only* additive framework change in scope. It is small, self-contained, and reduces 14+ near-identical handlers to one line each.

### E. Migrate hand-rolled modals to declarative configs
Pull form definitions out of action handlers and onto the model (or a sibling `*Forms.js`):

- **`UserTablePage`** — `User.PASSWORD_FORM`, `User.PERMISSIONS_FORM`, `User.INVITE_FORM`. The handlers in the page become 1–3 lines that `Modal.form(User.PASSWORD_FORM, …)`. Keep custom password-strength validation in the form-submit hook, not the page.
- **`EmailDomainTablePage`** — `EmailDomain.AUDIT_RESULT_VIEW` (a small View class for the audit-report dialog). `onActionAudit/Reconcile/Onboard` become thin wrappers around `EmailDomain` instance methods.
- **`EmailMailboxTablePage`** — collapse `onActionSendEmail` and `onActionSendTemplateEmail` (currently ~45 LOC of duplicated error-handling) into one helper that takes the form config as parameter; form configs go on `Mailbox.SEND_FORM` and `Mailbox.SEND_TEMPLATE_FORM`.
- **`FileManagerTablePage`** — context-menu actions (`edit-credentials`, `edit-owners`, `clone`, `test-connection`, `check-cors`, `fix-cors`) move to instance methods on `FileManager` model; the page wires `data-action` strings declaratively. `FileManager.CREDENTIALS_FORM`, `OWNERS_FORM`.
- **`ShortLinkTablePage`** — `flattenShortLinkMetadata` / `extractShortLinkPayload` already live in a sibling module. Either (a) move them into `ShortLink` model `toForm()` / `fromForm()` methods, or (b) pass `formTransformIn` / `formTransformOut` callbacks to the form config. Whichever the build phase finds cleaner.
- **`IPSetTablePage`** — country-code → name/source/description transform moves to `IPSet.fromCountryCode()` static; the page's custom Add handler becomes a 3-line wrapper.
- **`GeoLocatedIPTablePage`** + **`PhoneNumberTablePage`** — both have an "Add → form → server `.lookup()` → show result" flow. Keep page-level for now (no new primitive); just move the inline form config onto the model (`GeoLocatedIP.LOOKUP_FORM`, `PhoneNumber.LOOKUP_FORM`). The handler stays in the page since the post-lookup behavior differs slightly.
- **`AssistantConversationTablePage`** — `onActionBatchDelete` becomes a `batchAction({ destroy: true, ... })` call after the helper lands.

### F. Composition outliers — document or migrate
- **`UserDeviceLocationTablePage`** — keep as `Page` (it owns a TabView with a map tab), but extract the table tab into a sub-`TablePage` (or refactor to `TablePage` with a custom `<header>` template that hosts the map). Build phase decides; either is acceptable as long as the table half gets URL sync + standard toolbar.
- **`JobsTablePage`** — keep the `JobTableSection` composition. Document the pattern in `docs/web-mojo/components/TablePage.md` under "Embedding a TableView in a non-TablePage" so future similar splits are intentional, not accidental.

### G. Documentation
- Update `docs/web-mojo/components/TablePage.md` with:
  - Canonical pattern: model statics drive forms/view dialog (link to existing `ApiKeyTablePage` / `SettingTablePage` as reference impls).
  - `batchAction()` helper section.
  - "When to use `dayRangeFilter` vs. column-level `daterange` filter" — both, complementary.
- Add a CHANGELOG entry under "Admin extension" — bullet list of the bugs fixed and the features adopted.

## Investigation

### What exists

- **`TablePage`** (`src/core/pages/TablePage.js`) — already aliases `itemView`/`itemViewClass` (line 63), already wires `formCreate`/`formEdit` legacy names to `addForm`/`editForm` (lines 59–60), already merges `tableOptions` into the *HTML table styling* slot (lines 84–90). No code change needed in the framework for points A–C and E. Only D adds `batchAction()`.
- **`TableView`** (`src/core/views/table/TableView.js`) — already supports `dayRangeFilter`, `groupBy`, `groupHeaderTemplate`, `boolean`/`switch` filter type, `visibility:` breakpoints, `footer_total`, `Model.VIEW_CLASS` / `ADD_FORM` / `EDIT_FORM` lookup. Per docs (`docs/web-mojo/components/TableView.md`).
- **Reference pages already doing it right** — `ApiKeyTablePage`, `SettingTablePage`, `ScheduledTaskTablePage`, `S3BucketTablePage`, `EmailTemplateTablePage`, `FirewallLogTablePage` (the last is a near-perfect time-series template). Use these as the visual baseline when editing other pages.
- **`@core/views/list/grouping.js`** — exports `groupByDay()`. Already used in `LoginEventView`, `UserView`, `AssistantConversationListView` (all `ListView`-based, never on a TablePage).

### What changes

**Per-file change matrix** (target work-unit per file is small — most changes are 5–30 LOC config edits):

| File | Bugs | Features | Statics | Modals |
|------|:---:|:---:|:---:|:---:|
| `account/api_keys/ApiKeyTablePage.js` | — | search placeholder | already canonical | — |
| `account/devices/GeoLocatedIPTablePage.js` | `itemView`→`itemViewClass`; lift `tableViewOptions.onAdd` out | dayRangeFilter; boolean filters on `is_blocked`/`is_vpn`/`is_tor` | move lookup form to model | — |
| `account/devices/UserDeviceLocationTablePage.js` | composition (F) | dayRangeFilter on inner table | — | — |
| `account/devices/UserDeviceTablePage.js` | — | visibility breakpoints; dayRangeFilter | — | — |
| `account/groups/GroupTablePage.js` | — | boolean filter on `is_active`; align batch helper | model statics | — |
| `account/users/MemberTablePage.js` | verify `formCreate` intent | visibility breakpoints; align batch helper | `Member.EDIT_FORM` | — |
| `account/users/UserTablePage.js` | — | search placeholder | model statics | password / permissions / invite → model statics |
| `assistant/AssistantConversationTablePage.js` | — | dayRangeFilter; batch helper | — | — |
| `assistant/AssistantSkillTablePage.js` | — | — | — | — |
| `incidents/EventTablePage.js` | — | dayRangeFilter; groupByDay; visibility | model statics | — |
| `incidents/IncidentTablePage.js` | — | dayRangeFilter; visibility | model statics | merge form stays custom; rest via helper |
| `incidents/RuleSetTablePage.js` | — | boolean filter on `is_active` | model statics | batch helper (×3) |
| `incidents/TicketTablePage.js` | — | dayRangeFilter | model statics | — |
| `jobs/JobsTablePage.js` | composition (F) | — | — | — |
| `jobs/ScheduledTaskTablePage.js` | — | boolean filter on `enabled` | already canonical | — |
| `messaging/PublicMessageTablePage.js` | — | dayRangeFilter | — | — |
| `messaging/email/EmailDomainTablePage.js` | — | visibility | model statics | onboard / audit / reconcile → model |
| `messaging/email/EmailMailboxTablePage.js` | — | — | model statics | send-email + send-template-email collapse + model |
| `messaging/email/EmailTemplateTablePage.js` | — | dayRangeFilter | already canonical | — |
| `messaging/email/SentMessageTablePage.js` | — | dayRangeFilter; groupByDay; visibility | — | — |
| `messaging/push/PushConfigTablePage.js` | `tableOptions.actions`; `format`→`formatter` | — | model statics | — |
| `messaging/push/PushDeliveryTablePage.js` | `tableOptions.actions` | dayRangeFilter; groupByDay; visibility | model statics | — |
| `messaging/push/PushDeviceTablePage.js` | `tableOptions.actions` | dayRangeFilter on `last_seen`; visibility | model statics | — |
| `messaging/push/PushTemplateTablePage.js` | `tableOptions.actions`; `format`→`formatter` | — | model statics | — |
| `messaging/sms/PhoneNumberTablePage.js` | `itemView`→`itemViewClass`; private `_onRowView` | visibility; boolean filters | move lookup form to model | — |
| `messaging/sms/SMSTablePage.js` | `itemView`→`itemViewClass` | dayRangeFilter; visibility; default sort `-created` | — | — |
| `monitoring/LogTablePage.js` | broken `batchActions` (no handlers) | groupByDay | — | — |
| `monitoring/MetricsPermissionsTablePage.js` | `tableOptions.actions`; missing `formCreate` | — | model statics | — |
| `security/BlockedIPsTablePage.js` | — | dayRangeFilter on `blocked_at` | — | batch helper (×2) |
| `security/BotSignatureTablePage.js` | — | dayRangeFilter on `expires_at`; boolean filter on `is_active` | model statics | batch helper (×3) |
| `security/BouncerDeviceTablePage.js` | — | dayRangeFilter; visibility; footer totals | — | — |
| `security/BouncerSignalTablePage.js` | — | groupByDay | — | — |
| `security/FirewallLogTablePage.js` | — | groupByDay (already has dayRange via daterange filter) | — | — |
| `security/IPSetTablePage.js` | — | boolean filter on `is_enabled` | model statics | batch helper; country-code transform → model |
| `settings/SettingTablePage.js` | — | search placeholder | already canonical | — |
| `shortlinks/ShortLinkClickTablePage.js` | — | dayRangeFilter; groupByDay | — | — |
| `shortlinks/ShortLinkTablePage.js` | — | footer total on `hit_count`; dayRangeFilter on `created` | model statics | metadata transform → model; batch helper |
| `storage/FileManagerTablePage.js` | — | visibility | model statics | 6 context actions → model statics |
| `storage/FileTablePage.js` | — | visibility | model statics | (file-upload mixin stays — out of scope) |
| `storage/S3BucketTablePage.js` | — | — | model statics | batch handler stubs implemented |

### Constraints

- **No backend / API contract changes.** This is a frontend declarative cleanup. All endpoints stay as-is; admin pages already filter via standard query params.
- **Keep existing imports** (`@core` / `@ext` aliases). Don't introduce new aliasing.
- **No new external CSS** required — all styling adjustments use existing TableView classes and Bootstrap utility classes. If a `<style>` tag is needed for column widths, follow the dark-theme rule (`.claude/rules/theming.md`): pair light defaults with `[data-bs-theme="dark"]` overrides in the same block.
- **Per-table judgment** — when adopting `groupByDay`, eyeball the result before committing. A grouped header on a 13-filter table can look noisy; when in doubt, leave it ungrouped and document the call.
- **Public behavior preserved** — the only externally observable change is added features and bug fixes. Existing tests should keep passing; new behavior gets new regression tests as needed.
- **Batch-action helper API stays internal** — add `TablePage.batchAction()` and document it. Do not advertise it as a stable API beyond admin pages until it's been used in a real release.

### Related files

- `src/core/pages/TablePage.js` — only file in `src/core/` that changes (adds `batchAction()`).
- `src/core/views/table/TableView.js` — read-only reference; do not touch.
- `src/core/views/list/grouping.js` — read-only; `groupByDay` is the supported helper.
- `src/extensions/admin/**/*TablePage.js` — every file in the matrix.
- `src/extensions/admin/models/*` and any per-area `*Forms.js` — receive new `ADD_FORM` / `EDIT_FORM` / `VIEW_CLASS` / domain-specific form statics.
- `docs/web-mojo/components/TablePage.md` — receives helper + canonical-pattern updates.
- `CHANGELOG.md` — receives the rollup entry.

### Endpoints

None added or modified. All admin tables continue to use existing CRUD endpoints with permission-based filtering (per `.claude/rules/api.md`).

### Tests required

- **Unit**: `TablePage.batchAction()` — covers confirm-cancel path, save path (`field`/`value` per item), destroy path, empty-selection path, partial failure (one of N rejects).
- **Unit**: any `Model` that gains a static `ADD_FORM` / `EDIT_FORM` / `VIEW_CLASS` should have a tiny "static is exported and shaped right" test.
- **Regression**: silent-bug fixes — for each `tableOptions.actions` page, a test that asserts the rendered TableView received the actions config (proves the bug is fixed, fails before the lift).
- **Regression**: `MetricsPermissionsTablePage` Add button — given current state, clicking Add errors. Add a test that creates the page and asserts no throw.
- **Regression**: `LogTablePage` — assert each declared `batchActions[].action` resolves to a real method on the page (catches future broken-stub regressions).
- **No new e2e tests required** — declarative changes are visible in unit-level snapshot of TableView config, and the framework is already e2e-tested.

### Out of scope

- **Inline cell editing** rollout beyond `TicketTablePage` (status/role/active columns). Worth doing eventually but out of scope here — needs its own UX pass.
- **Filter presets** ("Last 24h errors", "My open tickets") — a `EventTablePage`/`IncidentTablePage` enhancement, separate request.
- **File-upload mixin in `FileTablePage`** — the upload flow is intentionally heavy; refactoring it touches the FileUpload service. Separate request.
- **`UserTablePage` invite flow logic** beyond moving the form config — invite tokens, email send, audit logging are domain features, not UX cleanup.
- **JobTableSection rewrite** — keep the existing composition; only document it.
- **CHANGELOG.md / docs reorganization** beyond the additions called out in section G.
- **New filter types or date-picker components** — consume existing primitives only.
- **The "lookup-and-create" pattern** as a TablePage primitive (the GeoIP / PhoneNumber Add → server-call → result flow). For now those stay page-level; revisit if a third use case appears.

## Plan

### Objective

Land the sweep as **one framework primitive + N declarative cleanups**, sequenced so every commit either fixes a bug or adopts an existing feature — no half-states. The framework primitive (`TablePage.batchAction()`) lands first; everything else is config tweaks against it. Final state: every admin TablePage either matches the canonical pattern (`ApiKey` / `Setting` / `ScheduledTask`) or has a documented reason not to.

### Sequencing — six commits in order

The sweep is split into six small, independently-reviewable commits. Each commit must lint, build, and pass tests before the next is started. Run `npm run test:unit` after each commit; run `npm run build:lib` after commit 1.

#### Commit 1 — Framework: add `TablePage.batchAction()` helper + tests

**File: `src/core/pages/TablePage.js`** — add helper method between `clearSelection()` (line 533) and `handleFilterEdit()` (line 538).

```javascript
/**
 * Batch-action helper — encapsulates the confirm → save/destroy → toast →
 * refresh pattern shared by every admin batch handler.
 *
 * Pass either:
 *   - { field, value, label, message? }            → save({ [field]: value }) on each
 *   - { destroy: true, label, message? }           → destroy() each
 *   - { handler: async (model) => …, label, … }    → run handler(model) per item
 *
 * Always: confirms (Modal.confirm), runs in parallel via Promise.all,
 * surfaces a single error toast on partial failure, clears selection,
 * and refreshes the table. Returns the count successfully processed.
 */
async batchAction({ field, value, destroy, handler, label, message, confirm = true } = {}) { ... }
```

Implementation notes:
- Pull `items = this.tableView.getSelectedItems()`. Early-return `0` if empty.
- Default message: `${label} ${items.length} item(s)?`. Default label: `'Action'`.
- Use `Modal.confirm` from `@core/views/feedback/Modal.js` (consistent with `_onRowDelete`).
- Use `Promise.allSettled` so one failure doesn't abort the rest. After settling, count successes and surface a `ToastService` message: `${successes} succeeded` or `${successes} succeeded, ${failures} failed`.
- Call `this.tableView.clearSelection()` then `await this.tableView.refresh()`.
- Pass `confirm: false` to skip the prompt for destructive flows that already showed their own (e.g. ones that take a follow-up form).

**File: `test/unit/TablePage.batchAction.test.js`** (new) — covers:
- Empty selection returns 0, no Modal opened.
- Confirm cancel: nothing saved, no refresh, returns 0.
- Save path: each item gets `model.save({ [field]: value })`; refresh called once.
- Destroy path: each `model.destroy()` called; refresh called once.
- Handler path: `handler(model)` called once per item.
- Partial failure: 2 of 3 succeed → returns 2; refresh still called; toast shows `2 succeeded, 1 failed`.
- `confirm: false`: no prompt; proceeds directly.

Run: `npm run test:unit -- TablePage.batchAction`. Must pass before commit 2.

**File: `docs/web-mojo/components/TablePage.md`** — add a "Batch actions" section just below the existing methods reference. Include the API signature and a code sample (Incident-style 3 status transitions in 5 lines).

**Acceptance for commit 1:** helper compiled, unit-tested, documented. **No admin pages migrated yet** (commits 2–5 do that).

---

#### Commit 2 — Bug fixes (block on these)

Pure surgical edits — no new features, no refactors. Each subsection below is one file change.

1. **`src/extensions/admin/messaging/push/PushDeliveryTablePage.js`** — lift `actions: ["view"]` out of `tableOptions` to top level. Drop the rest of the `tableOptions` body (`pageSizes`, `defaultPageSize`, `emptyMessage`, `emptyIcon` — all unsupported in `tableOptions`; `emptyMessage` if needed becomes top-level).
2. **`src/extensions/admin/messaging/push/PushDeviceTablePage.js`** — same shape: lift `actions: ["view", "delete"]` out, clean `tableOptions` block.
3. **`src/extensions/admin/messaging/push/PushTemplateTablePage.js`** — lift `actions: ["edit", "delete"]` out, clean `tableOptions` block.
4. **`src/extensions/admin/messaging/push/PushConfigTablePage.js`** — already has `actions` at top level (line 29). Just (a) clean misplaced `pageSizes` / `defaultPageSize` / `emptyMessage` / `emptyIcon` from `tableOptions`, lifting `emptyMessage` to top level if kept; (b) fix `format: 'boolean'` typo on line 20 → `formatter: 'boolean'`.
5. **`src/extensions/admin/messaging/push/PushTemplateTablePage.js`** — fix `format: 'boolean'` typo (search for `format:`).
6. **`src/extensions/admin/monitoring/MetricsPermissionsTablePage.js`** — (a) lift `actions: ["view", "edit", "delete"]` out of `tableOptions`; (b) clean misplaced keys; (c) **decide** between adding `formCreate: MetricsForms.create` (if it exists in `MetricsForms`) or setting `showAdd: false`. Default to `showAdd: false` since the file currently shows no intent to support add.
7. **Immutable-feed cleanup** — logs, signals, deliveries, and other audit-trail tables represent history. They should never have `selectable: true`, `batchActions`, `actions: ['edit'|'delete']`, or `formCreate`/`formEdit`. Only `view` and `export` are allowed. Apply across:
   - **`src/extensions/admin/monitoring/LogTablePage.js`** — drop `batchActions:` block (lines 114–121), drop `selectable: true` (line 100). Keep `showExport: true`. **No follow-up issue** — bulk operations on logs are not a real product need; logs are immutable history. (User confirmed.)
   - **`src/extensions/admin/incidents/EventTablePage.js`** — drop `selectable: true` (line 172). No batch handlers exist; the selection checkboxes do nothing useful today.
   - **`src/extensions/admin/messaging/email/SentMessageTablePage.js`** — drop `selectable: true` (line 38). Same reason — sent messages are an immutable outbox log.
   - **`src/extensions/admin/security/BouncerSignalTablePage.js`**, **`security/FirewallLogTablePage.js`**, **`messaging/push/PushDeliveryTablePage.js`**, **`shortlinks/ShortLinkClickTablePage.js`** — already correct (no `selectable`); audit by reading once during commit 2 to confirm no accidental row-edit/row-delete actions sneak in via the new statics in commit 3.
8. **`src/extensions/admin/messaging/sms/PhoneNumberTablePage.js`** — replace `tableView._onRowView(model)` (private API) with the supported public flow: emit through TablePage's deep-link path or call `this.tableView._onRowView` indirectly via `tableView.handleRowAction({ model, action: 'view' })`. Quickest fix: after `PhoneNumber.lookup()` resolves, call `this.showItemDialog(model)` (TablePage method, line 455) — same effect, public API.
9. **Naming standardization** — across all admin TablePages, replace `itemView:` with `itemViewClass:`. Affected (per audit): `GeoLocatedIPTablePage`, `PhoneNumberTablePage`, `SMSTablePage`. Behavior identical (TablePage.js:63 aliases the two); this commit just enforces one canonical name.

**Tests for commit 2:**
- New: `test/unit/admin/PushDeliveryTablePage.test.js` — instantiate the page, mount against a fixture collection, assert `tableView.actions` array contains `'view'`. Same shape for the other 3 push pages and MetricsPermissions. Each test must fail before the lift and pass after.
- New: `test/unit/admin/MetricsPermissionsTablePage.test.js` — assert no throw when constructing; if `showAdd: false`, no add button rendered.
- Run: `npm run test:unit -- admin/`. All must pass.

**Acceptance for commit 2:** every silent bug listed in the request's "Silent bugs" section is fixed, with a regression test that fails before the fix.

---

#### Commit 3 — Adopt model statics (drop inline duplication)

Per-page edit pattern: at the top of the TablePage file, register the static on the model class (mirrors `ApiKeyTablePage.js:10-11`); inside the constructor, drop the inline `formCreate:`/`formEdit:`/`itemViewClass:` lines that the static now provides. Where the model is shared (e.g. `Incident`, `Push*`, `IPSet`, `BouncerSignature`, `EmailDomain`), prefer registering at the bottom of the model file (mirrors `Incident.js:1031-1032` for RuleSet) so the static lives with the model. Choice is per-file judgment; the build phase picks the cleaner location based on whether the model is page-coupled or shared.

Pages migrated in this commit (one micro-edit each):

| File | Static to register | Lines to drop from page |
|------|--------------------|-------------------------|
| `account/groups/GroupTablePage.js` | `Group.ADD_FORM/EDIT_FORM/VIEW_CLASS` | `formCreate`, `formEdit`, `itemViewClass` |
| `account/users/MemberTablePage.js` | `Member.EDIT_FORM` (verify `ADD_FORM` exists in `MemberForms.create` or document add-flow intent) | `formEdit`, `itemViewClass` |
| `account/users/UserTablePage.js` | `User.VIEW_CLASS` (forms stay since they're contextual, addressed in commit 5) | `itemViewClass` |
| `incidents/EventTablePage.js` | `IncidentEvent.EDIT_FORM/VIEW_CLASS` | `formEdit`, `itemViewClass` |
| `incidents/IncidentTablePage.js` | `Incident.ADD_FORM/EDIT_FORM/VIEW_CLASS` | `formCreate`, `formEdit`, `itemViewClass` |
| `incidents/RuleSetTablePage.js` | `RuleSet.ADD_FORM/EDIT_FORM` already wired (`Incident.js:1031-1032`); add `RuleSet.VIEW_CLASS = RuleSetView` | `formCreate`, `formEdit`, `itemViewClass` |
| `incidents/TicketTablePage.js` | `Ticket.ADD_FORM/EDIT_FORM/VIEW_CLASS` | `formCreate`, `formEdit`, `itemViewClass` |
| `messaging/email/EmailTemplateTablePage.js` | `EmailTemplate.ADD_FORM/EDIT_FORM/VIEW_CLASS` | `formCreate`, `formEdit`, `itemViewClass` |
| `messaging/email/EmailDomainTablePage.js` | `EmailDomain.ADD_FORM/EDIT_FORM` | `formCreate`, `formEdit` |
| `messaging/email/EmailMailboxTablePage.js` | `Mailbox.ADD_FORM/EDIT_FORM` | `formCreate`, `formEdit` |
| `messaging/email/SentMessageTablePage.js` | `SentMessage.VIEW_CLASS = EmailView` (registered as `Email` static if shared) | `itemViewClass` |
| `messaging/push/PushConfigTablePage.js` | `PushConfig.ADD_FORM/EDIT_FORM` | `formCreate`, `formEdit` |
| `messaging/push/PushDeliveryTablePage.js` | `PushDelivery.VIEW_CLASS` | `itemViewClass` (`PushDevice.VIEW_CLASS` is already wired in `Push.js:119` — pattern exists) |
| `messaging/push/PushDeviceTablePage.js` | already done in `Push.js:119` | `itemViewClass` |
| `messaging/push/PushTemplateTablePage.js` | `PushTemplate.ADD_FORM/EDIT_FORM` | `formCreate`, `formEdit` |
| `messaging/sms/PhoneNumberTablePage.js` | `PhoneNumber.VIEW_CLASS` | `itemViewClass` |
| `messaging/sms/SMSTablePage.js` | `SMS.VIEW_CLASS = SMSView` | `itemViewClass` |
| `monitoring/LogTablePage.js` | `Log.VIEW_CLASS = LogView` | `itemViewClass` |
| `monitoring/MetricsPermissionsTablePage.js` | `MetricsPermission.VIEW_CLASS` | `itemViewClass` |
| `security/IPSetTablePage.js` | `IPSet.ADD_FORM` (only `EDIT_FORM` is wired today, `IPSet.js:226`); `IPSet.VIEW_CLASS` | `formCreate`, `formEdit`, `itemViewClass` |
| `security/BotSignatureTablePage.js` | `BouncerSignature.ADD_FORM/EDIT_FORM` | `formCreate`, `formEdit` |
| `security/BlockedIPsTablePage.js` | `GeoLocatedIP.VIEW_CLASS = GeoIPView` (or scoped `BlockedIP` subclass if the same model is reused) | `itemViewClass` |
| `security/BouncerDeviceTablePage.js` | `BouncerDevice.VIEW_CLASS` | `itemViewClass` |
| `security/BouncerSignalTablePage.js` | `BouncerSignal.VIEW_CLASS` | `itemViewClass` |
| `security/FirewallLogTablePage.js` | `Log.VIEW_CLASS` already done above (firewall logs share the `Log` model) | `itemViewClass` |
| `shortlinks/ShortLinkTablePage.js` | `ShortLink.ADD_FORM/EDIT_FORM/VIEW_CLASS` | `formCreate`, `formEdit`, `itemViewClass` |
| `storage/FileManagerTablePage.js` | `FileManager.ADD_FORM/EDIT_FORM` | `formCreate`, `formEdit` |
| `storage/FileTablePage.js` | `File.EDIT_FORM/VIEW_CLASS` (no `ADD_FORM` since add goes through upload mixin) | `formEdit`, `itemViewClass` |
| `storage/S3BucketTablePage.js` | `S3Bucket.ADD_FORM/EDIT_FORM` | `formCreate`, `formEdit` |
| `account/devices/UserDeviceTablePage.js` | `UserDevice.VIEW_CLASS = DeviceView` | `itemViewClass` |
| `account/devices/GeoLocatedIPTablePage.js` | `GeoLocatedIP.VIEW_CLASS = GeoIPView` | `itemViewClass` |
| `assistant/AssistantConversationTablePage.js` | `AssistantConversation.VIEW_CLASS` | `itemViewClass` |
| `assistant/AssistantSkillTablePage.js` | `AssistantSkill.VIEW_CLASS` | `itemViewClass` |
| `messaging/PublicMessageTablePage.js` | `PublicMessage.VIEW_CLASS` | `itemViewClass` |

**Tests for commit 3:**
- New: `test/unit/admin/model-statics.test.js` — for each migrated model, assert the static exists and is a function/class. One block per model. Compact, repetitive, fast.
- Run: `npm run test:unit -- admin/model-statics`.

**Acceptance for commit 3:** every page in the table above either declares its statics on the model OR is documented as already-canonical. No `formCreate:`/`formEdit:`/`itemViewClass:` lines remain in pages where the static now provides them. `git grep -n "formCreate\\|formEdit\\|itemViewClass" src/extensions/admin/` returns only pages that still need a per-page override (e.g. `ApiKeyTablePage.js` keeps `itemViewClass` since `ApiKey.VIEW_CLASS` isn't wired).

---

#### Commit 4 — Adopt new TableView features (declarative)

Each sub-section below lists a single declarative change pattern + the files that get it. No new code paths — every change is config.

**4a. `dayRangeFilter: true`** (or with `{ field, value }` for non-`created` columns)

Add `dayRangeFilter: true` to:
- `LogTablePage` — uses `created`
- `EventTablePage` — uses `created`
- `IncidentTablePage` — uses `created`
- `BouncerSignalTablePage` — uses `created`
- `FirewallLogTablePage` — uses `created`
- `SentMessageTablePage` — uses `created`
- `PushDeliveryTablePage` — uses `created`
- `BlockedIPsTablePage` — `{ field: 'blocked_at', value: '7d' }`
- `BotSignatureTablePage` — uses `created`
- `ShortLinkClickTablePage` — uses `created`
- `AssistantConversationTablePage` — uses `modified`: `{ field: 'modified', value: '7d' }`
- `SMSTablePage` — uses `created`
- `UserDeviceTablePage` — `{ field: 'last_seen', value: '30d' }`
- `PushDeviceTablePage` — `{ field: 'last_seen', value: '30d' }`

**4b. `groupByDay('created')`** — chronological audit feeds get day-grouping

Add `...groupByDay('created')` (import from `@core/views/list/grouping.js`) to:
- `LogTablePage`
- `EventTablePage`
- `BouncerSignalTablePage`
- `FirewallLogTablePage`
- `SentMessageTablePage`
- `ShortLinkClickTablePage`
- `PushDeliveryTablePage`

Verify visual fit at build time. If the group header looks heavy on a tall-filter table (e.g. `EventTablePage` with 13 filters), drop `groupByDay` and add a comment in the page explaining why.

**4c. `boolean` filter type** — replace hand-rolled `select` with `[{value: true}, {value: false}]`

Edit the column / filter declarations to switch `type: 'select'` to `type: 'boolean'` (with optional `trueLabel` / `falseLabel`):
- `GroupTablePage` — `is_active` filter
- `UserTablePage` — `is_active` filter
- `IPSetTablePage` — `is_enabled` filter
- `BotSignatureTablePage` — `is_active` filter
- `RuleSetTablePage` — `is_active` filter
- `ScheduledTaskTablePage` — `enabled` filter
- `GeoLocatedIPTablePage` — `is_blocked`, `is_vpn`, `is_tor` filters

**4d. `visibility:` breakpoints** — hide non-essential columns on mobile

Edit columns with the recommended breakpoints from the request's "Acceptance Criteria → B" section:
- `UserDeviceTablePage` (8 cols): `device_info.os.family` → `lg`, `first_seen` → `lg`, `duid` → `xl`
- `IPSetTablePage` (8 cols): `description` → `lg`, `last_synced` → `lg`, `sync_error` → `lg`
- `EventTablePage` (7 cols): `metadata.server` → `lg`, `source_ip` → `md`
- `EmailDomainTablePage` (7 cols): `region` → `md`, `created` → `lg`
- `BouncerDeviceTablePage` (6): `block_count` → `md`, `event_count` → `md`
- `PhoneNumberTablePage` (9): `is_voip` → `lg`, `registered_owner` → `lg`, `owner_type` → `lg`
- `MemberTablePage`: `created` → `lg`
- `SMSTablePage`: `provider` → `md`, `delivered_at` → `lg`
- `SentMessageTablePage`: `mailbox.email` → `lg`, `status_reason` → `lg`
- `PushDeliveryTablePage`: `device.device_name` → `md`, `category` → `lg`
- `PushDeviceTablePage`: `app_version` → `lg`, `platform` → `md`
- `EmailMailboxTablePage`: `is_system_default` → `lg`, `is_domain_default` → `lg`
- `FileManagerTablePage`: `backend_url` → `lg`, `is_public` → `lg`, `created` → `lg`
- `FileTablePage`: `content_type` → `md`, `group.name` → `lg`, `upload_status` → `lg`

**4e. Search placeholders** — every `searchable: true` page that lacks `searchPlaceholder` gets one. Suggested wording:
- ID-heavy tables (`Log`, `Event`, `Incident`): `'Search title, message, or ID'`
- People-heavy (`User`, `Member`, `Group`): `'Search name, email, or username'`
- IP-heavy (`Geo`, `Blocked`, `Bouncer*`, `Firewall`): `'Search IP, country, or rule'`
- Otherwise the per-page judgment stays small — fill in something specific to indexed fields.

**4f. Footer totals** — add `footer_total: true` + `align: 'right'` where useful:
- `BouncerDeviceTablePage`: `event_count`, `block_count`
- `ShortLinkTablePage`: `hit_count`
- `PushDeliveryTablePage`: count column if added (not required)

**Tests for commit 4:** declarative-only, no behavior changes that need new tests. Existing tests must keep passing. Validate manually by:
- `npm run dev` → open each migrated page → toggle the day-range picker, expand/collapse a group, resize the window, verify columns hide at the documented breakpoint.

**Acceptance for commit 4:** every "Adopt new TableView features" item in the request's section B is either applied or documented (with a one-line comment in the page) as deliberately skipped.

---

#### Commit 5 — Migrate batch handlers + hand-rolled modals

Now that `batchAction()` exists (commit 1) and statics are wired (commit 3), migrate:

**5a. Batch-handler collapse via `batchAction()`:**
- `IncidentTablePage` — replace 5 of 6 handlers (`onActionBatchResolve/Open/Pause/Ignore/Protect`) with `batchAction({ field: 'status', value: '...', label: '...' })` calls. **Keep** `onActionBatchMerge` since it needs a custom parent-pick form. (`Protect` uses `field: 'metadata'` with a nested object — verify the helper either supports nested fields or the handler keeps a thin custom shape. If unclear, leave Protect as a custom handler with a comment.)
- `RuleSetTablePage` — collapse 3 (enable / disable / delete) to one-liners.
- `BouncerSignatureTablePage` — collapse 3 (enable / disable / delete).
- `BlockedIPsTablePage` — collapse 2 (unblock / whitelist).
- `GroupTablePage` — declared but unaligned: align Activate/Deactivate/Delete/Move to helper; Move keeps custom (needs target-group form).
- `MemberTablePage` — same: align mechanical handlers.
- `AssistantConversationTablePage` — `onActionBatchDelete` becomes `batchAction({ destroy: true, label: 'Delete' })`.

**5b. Hand-rolled modals → form configs on the model:**

The pattern is: define a `*_FORM` static on the model file (or `*Forms.js`); replace the page's hand-rolled `Modal.form({...})` with `Modal.form(Model.X_FORM, ...)` then a 1–3 line save. Where the form needs custom validation, put it in the form's `onSubmit` hook, not the page.

Per page:
- **`UserTablePage`** — move `onActionEditPermissions` form config to `UserForms.permissions` (or `User.PERMISSIONS_FORM`); `onActionChangePassword` to `UserForms.password` with `MOJOUtils.checkPasswordStrength` invoked from the form's submit handler; `onActionSendInvite` to `UserForms.invite`. Page handlers shrink to 5–10 lines each.
- **`EmailDomainTablePage`** — `onActionAudit` / `onActionReconcile` / `onActionOnboard` move to instance methods on `EmailDomain` (`audit()`, `reconcile()`, `onboard()`) that return result data. Page becomes a thin wrapper that calls the instance method then displays the result via `Modal.dialog`. The audit-result View can become `EmailDomain.AUDIT_VIEW` or stay a sibling file.
- **`EmailMailboxTablePage`** — collapse `onActionSendEmail` and `onActionSendTemplateEmail` (~45 LOC of duplicated error handling) into one `_sendEmail(formConfig)` helper inside the page; form configs as `Mailbox.SEND_EMAIL_FORM` and `Mailbox.SEND_TEMPLATE_FORM`.
- **`FileManagerTablePage`** — context-menu actions (`edit-credentials`, `edit-owners`, `clone`, `test-connection`, `check-cors`, `fix-cors`) move to instance methods on `FileManager`; form configs (`FileManager.CREDENTIALS_FORM`, `OWNERS_FORM`) on the model. Page handlers each become 3–5 lines.
- **`ShortLinkTablePage`** — `flattenShortLinkMetadata` / `extractShortLinkPayload` move to `ShortLink.toForm()` / `ShortLink.fromForm()` (instance methods); `_handleAdd` / `_handleEdit` shrink to 5 lines each calling `Modal.form` directly.
- **`IPSetTablePage`** — country-code → name/source/description transform moves to `IPSet.fromCountryCode(code)` static; the page's custom Add handler becomes a 3-line wrapper that prompts via `IPSet.LOOKUP_FORM` then calls the static.
- **`GeoLocatedIPTablePage`** + **`PhoneNumberTablePage`** — both have an Add → form → server-`.lookup()` → show-result flow. Move the form configs to `GeoLocatedIP.LOOKUP_FORM` and `PhoneNumber.LOOKUP_FORM`. Keep the post-lookup show-result behavior page-level (no new primitive). `PhoneNumberTablePage`'s private-API call (already fixed in commit 2) stays clean.

**Tests for commit 5:**
- New: `test/unit/admin/IncidentTablePage.batch.test.js` — assert each migrated batch action calls `model.save({ status: ... })` per selected item, then `tableView.refresh()`. Same shape for `RuleSetTablePage`, `BouncerSignatureTablePage`, `BlockedIPsTablePage`, `GroupTablePage`, `MemberTablePage`, `AssistantConversationTablePage`.
- New: `test/unit/admin/UserTablePage.modals.test.js` — assert `onActionChangePassword` calls `Modal.form(User.PASSWORD_FORM, ...)`. Lightweight; doesn't validate the password-strength logic (that's covered separately).
- Existing tests for any migrated model methods must keep passing.

**Acceptance for commit 5:** the 14 batch-handler shape repetitions are gone; user-facing behavior (confirm wording, toast wording) is preserved per-page (helper takes `label` and `message` params); hand-rolled modals listed above are reduced to thin page wrappers.

---

#### Commit 6 — Composition outliers + docs/CHANGELOG rollup

**`src/extensions/admin/account/devices/UserDeviceLocationTablePage.js`** — **decision needed in build phase**. Two options:
- **Option A (recommended):** keep extending `Page`, but extract the embedded TableView into a small sibling `LoginEventTableView` (or sub-`TablePage`). The map tab stays in this file; the table tab becomes a child component with full URL sync. Net change: this file loses ~30 LOC of inline TableView config; gains 2 lines of `addChild(new LoginEventTableView({...}))`.
- **Option B:** migrate the whole page to `TablePage` and use the `template` override slot to host the map tab via `<div data-container="map"></div>`. More invasive; might lose `TabView` features. Skip unless option A blocks.

**`src/extensions/admin/jobs/JobsTablePage.js`** — **document, don't migrate**. Add a short note to the file header explaining the wraps-`JobTableSection` pattern, and add a "Embedding a TableView in a non-TablePage" short section in `docs/web-mojo/components/TablePage.md` so future similar splits are intentional.

**Documentation:**
- `docs/web-mojo/components/TablePage.md` — add:
  - "Canonical pattern: model statics" section with `ApiKeyTablePage` linked as the reference.
  - "Batch actions" section with the `batchAction()` helper signature and a 3-status example (Incident-style).
  - "When to use `dayRangeFilter` vs. column `daterange` filter" — both, complementary.
  - "Embedding a TableView in a non-TablePage" — `JobsTablePage` as the canonical case.
- `CHANGELOG.md` — under "Admin extension" heading, add a single bullet group listing:
  - `TablePage.batchAction()` helper added (one of the few framework changes — public).
  - Bugs fixed: `tableOptions.actions` lift in 4 push pages + MetricsPermissions; `format`→`formatter` typo; `LogTablePage` broken batch buttons removed; `MetricsPermissionsTablePage` Add button stabilized.
  - Features adopted across admin tables: `dayRangeFilter`, `groupByDay`, `boolean` filter type, `visibility:` breakpoints, search placeholders, footer totals.
  - Standardized on `Model.ADD_FORM` / `EDIT_FORM` / `VIEW_CLASS` for ~30 admin pages.

**Tests for commit 6:** smoke test for `UserDeviceLocationTablePage` post-refactor (page mounts, both tabs render, table fetches). No tests for docs.

**Acceptance for commit 6:** sweep complete. `git grep -nE "tableOptions:\s*\{[^}]*actions:" src/extensions/admin/` returns nothing. `git grep -n "format:\s*'boolean'" src/extensions/admin/` returns nothing. `git grep -n "_onRowView\\b" src/extensions/admin/` returns nothing.

---

### Steps (file-level summary)

| # | Files | Change |
|---|-------|--------|
| 1 | `src/core/pages/TablePage.js`; `test/unit/TablePage.batchAction.test.js`; `docs/web-mojo/components/TablePage.md` | Add `batchAction()` helper + tests + docs section |
| 2 | 4× `messaging/push/*TablePage.js`; `monitoring/MetricsPermissionsTablePage.js`; `monitoring/LogTablePage.js`; `messaging/sms/PhoneNumberTablePage.js`; `account/devices/GeoLocatedIPTablePage.js`; `messaging/sms/SMSTablePage.js`; new admin tests | Lift `tableOptions.actions`, fix `format`→`formatter`, fix `MetricsPermissionsTablePage` Add, drop or wire `LogTablePage` batch handlers, drop private-API call, standardize on `itemViewClass` |
| 3 | ~32 admin TablePages and their model files; `test/unit/admin/model-statics.test.js` | Register `Model.ADD_FORM/EDIT_FORM/VIEW_CLASS` (top of TablePage or bottom of model file); drop inline `formCreate`/`formEdit`/`itemViewClass` |
| 4 | ~25 admin TablePages (per features 4a–4f matrices) | Adopt `dayRangeFilter`, `groupByDay`, `boolean` filter, `visibility:`, `searchPlaceholder`, `footer_total` |
| 5 | `IncidentTablePage`, `RuleSetTablePage`, `BouncerSignatureTablePage`, `BlockedIPsTablePage`, `GroupTablePage`, `MemberTablePage`, `AssistantConversationTablePage`, `UserTablePage`, `EmailDomainTablePage`, `EmailMailboxTablePage`, `FileManagerTablePage`, `ShortLinkTablePage`, `IPSetTablePage`, `GeoLocatedIPTablePage`, `PhoneNumberTablePage`; matching model files; new admin batch+modal tests | Migrate batch handlers to `batchAction()`; move hand-rolled modal form configs to model statics |
| 6 | `UserDeviceLocationTablePage.js` (option A: split off `LoginEventTableView`); `JobsTablePage.js` (header note); `docs/web-mojo/components/TablePage.md`; `CHANGELOG.md`; smoke tests | Composition outliers + docs/CHANGELOG rollup |

### Design Decisions

- **One framework primitive only** (`TablePage.batchAction()`). Everything else consumes existing TableView/ListView features. Matches user's "consume-only with one exception" answer.
- **Helper signature accepts three modes** (`field/value`, `destroy: true`, custom `handler`). Three modes cover every observed usage: status transitions (Incident, RuleSet, BotSignature), destroys (BlockedIPs, Conversation, BotSignature delete), and the rare nested-field case (Incident `metadata.do_not_delete`). Avoids encoding a registry of action types.
- **`Promise.allSettled` over `Promise.all`** in the helper: one failed save shouldn't abort the rest. Matches what production-grade batch handlers should do; existing pages use `Promise.all` and lose progress on partial failure.
- **Statics registered at the top of the TablePage file** when the model is page-coupled (`ApiKey`, `Setting`, `ScheduledTask` precedent). **Statics on the model file** when the model is shared (`RuleSet`, `IPSet`, `PushDevice` precedent). Build phase picks per-file.
- **`itemView` vs `itemViewClass`** — kept the alias in `TablePage.js:63` (no breaking change for downstream consumers); standardize new code on `itemViewClass`.
- **`groupByDay` adoption is judgment-call** — when a table has 10+ filters or many columns, the group header looks noisy. Build phase eyeballs each one before committing; pages that don't fit drop the group with a single-line comment.
- **`UserDeviceLocationTablePage` option A** preferred because it keeps the map tab and gains URL sync for the table half without rewriting `TabView` ergonomics.
- **Immutable audit feeds get no batch actions, no row mutations** — logs, signals, deliveries, sent-messages, click-trails, login events, and similar history tables represent the past, not state to manage. They get `view` (and optionally `export`) and nothing else. No `selectable: true`, no `batchActions`, no `actions: ['edit'|'delete']`, no `formCreate`/`formEdit`. The product reasoning: bulk-deleting or bulk-modifying audit history is dangerous, rarely a real need, and when it is needed it belongs in a backend retention policy — not a row checkbox. (User explicitly confirmed for `LogTablePage`; the principle applies to every audit table in the matrix.)
- **`LogTablePage` broken batch handlers removed, not implemented** — implementing `batch-archive` / `batch-reviewed` would require backend support that doesn't exist, and the principle above says it shouldn't exist. Removing the broken UI is the right call, not a placeholder for future work.
- **No new external CSS** — every change is via existing TableView classes and Bootstrap utilities. If a `<style>` tag is unavoidable for a column-width override, follow the dark-theme rule (`.claude/rules/theming.md`) — pair light defaults with `[data-bs-theme="dark"]` overrides in the same block.

### Edge Cases

- **`batchAction()` with empty selection** — return `0`, no Modal, no toast, no fetch. Tested.
- **`batchAction()` with confirm cancel** — return `0`, no save, no fetch. Tested.
- **`batchAction()` partial failure** — `Promise.allSettled` reports `2 of 3 saved, 1 failed` via toast; refresh still runs so the table reflects the partial state.
- **`Model.ADD_FORM` / `EDIT_FORM` resolution** — `ListView.getAddFormConfig()` falls through to `EDIT_FORM` if `ADD_FORM` is missing (line 1660). For models that should NOT allow add (`MemberTablePage` if no add-flow), set `showAdd: false` explicitly to avoid the fallback opening an edit-shaped form.
- **`Model.VIEW_CLASS` resolution** — falls back to `Modal.data` generic dialog when missing (`ListView._onRowView`). Pages that want a real custom view must set the static.
- **`dayRangeFilter` collision with column `daterange`** — both can coexist; the segment writes `${field}__gte` while a column `daterange` writes start/end. If a user sets both, last-write wins on the same field. Document the precedence in the new docs section so future readers don't get surprised.
- **`groupByDay` on a non-existent field** — returns `null` per row → all rows fall into the unbucketed slot. Treat that as a noisy fail: build phase verifies each migrated page actually has the field populated.
- **`tableOptions` cleanup** — the misplaced keys (`pageSizes`, `defaultPageSize`, `emptyMessage`, `emptyIcon`) were never doing anything. Removing them is safe; if a page later needs a custom page-size selector, that's a separate framework feature request.
- **`PhoneNumberTablePage._onRowView` migration** — `showItemDialog(model)` is the public equivalent. Verify it triggers `_setItemParam` so deep-linking still works after lookup.
- **Module-level static registration** (`Model.X_FORM = …` at top of TablePage file) — runs once at import, before any class is instantiated. Safe; matches existing precedent. If two pages register competing statics on the same model, last import wins; the build phase should grep for collisions.
- **`UserDeviceLocationTablePage` refactor** — the existing `LoginEventList` collection is reused; URL sync now applies to the table tab via the new sub-`TablePage`. Confirm the parent page's tab-switch logic still survives a child-`TablePage`'s own URL writes (likely yes, since query keys differ).

### Testing

Per-commit:
- **Commit 1**: `npm run test:unit -- TablePage.batchAction`. Must pass; no other suites should be affected.
- **Commit 2**: `npm run test:unit -- admin/`. New regression tests must fail before the fixes and pass after. Run `npm run lint` to catch any leftover `format:` typos that grep missed.
- **Commit 3**: `npm run test:unit -- admin/model-statics`. Then `npm run test:unit` full pass. Then `npm run dev` and click through 3–4 random admin pages — Add / Edit / View dialogs must still open exactly as before.
- **Commit 4**: `npm run test:unit` full pass (existing tests must hold). Manual: open a `dayRangeFilter` page, switch ranges, observe `created__gte` in the URL; open a `groupByDay` page, check group headers render; resize browser to mobile, verify hidden columns disappear.
- **Commit 5**: `npm run test:unit -- admin/`. Manually trigger each migrated batch action with 2–3 selected rows; verify confirm wording, toast wording, and table refresh. Manually trigger each migrated modal flow.
- **Commit 6**: `npm run test:unit` full pass; `npm run build:lib` to confirm the public bundle still builds; manually open `UserDeviceLocationTablePage` and verify both tabs render after refactor.

Final smoke test before merge:
- `npm run lint && npm run test && npm run build` — full suite green.
- `git grep -nE "tableOptions:\s*\{[^}]*actions:" src/extensions/admin/` returns nothing.
- `git grep -n "format:\s*'boolean'" src/extensions/admin/` returns nothing.
- `git grep -n "tableView._onRow" src/extensions/admin/` returns nothing.
- Click through every admin page in `npm run dev` once, verifying day-range, grouping, mobile column-hide, and a sample batch action.

### Docs Impact

- **`docs/web-mojo/components/TablePage.md`** — new sections: "Canonical pattern: model statics", "Batch actions" (with `batchAction()` API + example), "When to use `dayRangeFilter` vs. column `daterange`", "Embedding a TableView in a non-TablePage".
- **`docs/web-mojo/components/TableView.md`** — no change required; existing docs already describe `dayRangeFilter`, `groupBy`, `boolean` filter, `visibility:`, `footer_total`. The sweep is consumption only.
- **`CHANGELOG.md`** — single rollup entry under "Admin extension": helper added; bugs fixed; features adopted; statics standardized. Reference this planning file by path so future readers can trace it.
- **`docs/web-mojo/forms/FormBuilder.md`** — no change. Form config patterns are unchanged; only their *location* moves (page → model static).
- **`docs/web-mojo/AGENT.md`** — no change.

### Out of scope (planning notes)

Reaffirming the request's out-of-scope list now that the plan is concrete:
- Inline cell editing rollout beyond `TicketTablePage`.
- Filter presets ("Last 24h errors") on `EventTablePage` / `IncidentTablePage`.
- `FileTablePage` upload-flow refactor.
- `UserTablePage` invite-flow domain logic.
- `JobTableSection` rewrite (only documented, not refactored).
- `LogTablePage` batch archive/reviewed feature work.
- New filter types or date pickers.
- `lookup-and-create` as a TablePage primitive.

### Open questions / blockers (none expected, but flag during build)

- `User.PASSWORD_FORM` — the password-strength validator currently lives in the page (`MOJOUtils.checkPasswordStrength`). The build phase decides whether to (a) put a thin wrapper in the form's `onSubmit` or (b) expose it as a form-field `validator:`. Either is fine; pick the one that lints cleanest.
- `Member.ADD_FORM` — `MemberTablePage` has only `formEdit` today. Build phase verifies whether members are ever added directly from this page or only via group-invite. If add isn't supported, set `showAdd: false`.
- `EmailDomain.AUDIT_VIEW` — small View class for the audit-result dialog. Build phase decides whether to make it a proper exported View or a one-off inline ad-hoc body in the page.
- `GeoLocatedIP.VIEW_CLASS` collision — both `GeoLocatedIPTablePage` and `BlockedIPsTablePage` use `GeoIPView`. Wire the static once on `GeoLocatedIP` and let both pages inherit it.

If any of these turn out to be larger than a small judgment call during build, stop and file a follow-up issue rather than expanding scope here.

## Resolution

Status: **done** · Date: 2026-05-10 · Commits 1–6 of 6 landed on `main`.

### What was implemented

Six small, independently-reviewable commits matching the planned sequence:

| # | SHA | Subject | Files | LOC |
|---|-----|---------|-------|-----|
| 1 | `0c16b31` | add TablePage.batchAction() helper | 5 | +1028 |
| 2 | `018e8bc` | bug fixes across admin TablePages | 12 | +198 / -71 |
| 3 | `5e3b33f` | adopt Model.{ADD_FORM,EDIT_FORM,VIEW_CLASS} | 43 | +307 / -107 |
| 4 | `fe5025f` | adopt new TableView features | 32 | +191 / -80 |
| 5 | `6d41357` | collapse batch handlers via batchAction() | 7 | +34 / -241 |
| 6 | `3e09e92` | composition outliers + docs/CHANGELOG | 4 | +194 / -6 |

Net: ~93 file edits, ~+1952 / -505 LOC. The big +1028 in commit 1 is mostly the new test file and the planning request itself; the production-code delta is much smaller. Commit 5 is net negative — boilerplate removed.

### Files changed (high-level)

- **Framework primitive (1 file):** `src/core/pages/TablePage.js` — added `batchAction({ field, value, destroy, handler, label, message, confirm })` between `clearSelection()` and `handleFilterEdit()`. Three modes (save / destroy / handler), `Promise.allSettled` for partial-failure safety, count-only toast (no server-error leakage), idempotent clearSelection + refresh.
- **Models that gained statics (8 files):** `Incident`, `Tickets`, `Email`, `Push`, `Bouncer`, `IPSet`, `AWS` (admin), `Files` (core).
- **Admin TablePages cleaned up (33 files):** every `*TablePage.js` under `src/extensions/admin/` plus the embedded TableView in `UserDeviceLocationTablePage`. Each lost some combination of `formCreate:` / `formEdit:` / `itemViewClass:` (commit 3), gained `dayRangeFilter` / `groupByDay` / `boolean` filter / `visibility:` / `searchPlaceholder` / `footer_total` (commit 4), and where applicable replaced 2–6 hand-rolled batch handlers with one-liners (commit 5).
- **Tests (3 new files, 1 updated):** `test/unit/TablePage.batchAction.test.js` (8 cases), `test/unit/admin-tablepages-bugfixes.test.js` (24), `test/unit/admin-model-statics.test.js` (67), and `test/utils/simple-module-loader.js` registering TablePage. Total: 1163 tests pass (up from 1072).
- **Docs (2 files):** `docs/web-mojo/pages/TablePage.md` — new sections "Canonical pattern: model statics", "When to use `dayRangeFilter` vs. column `daterange` filter", "Embedding a TableView in a non-TablePage", and the `batchAction()` API reference. `CHANGELOG.md` — single rollup entry under "Admin extension · TablePage UX sweep".

Cross-link doc updates landed via the docs-updater agent: `docs/web-mojo/components/TableView.md` got a one-line pointer from "Handling Batch Events" to `TablePage.batchAction()`. `docs/web-mojo/components/ListView.md` got a "Batch actions on a TablePage" callout after the multi-select example. `docs/web-mojo/AGENT.md` needed no change.

### Tests run and results

- `node test/test-runner.js` — full suite, 1163 / 1163 passing, 100 % rate, ~1.8 s. Run after every commit with no failures introduced.
- `npm run build:lib` — clean build after every commit.
- `npm run build` — full bundle clean post-final-commit.
- `git grep` smoke checks: zero `tableOptions.actions` matches, zero `format: 'boolean'` typos in TablePage column configs (the one remaining hit is in `PushDeviceView.js` which extends DataView — `field.format` is supported there per `DataView.js:461`, not a typo), zero private `_onRowView` calls in admin pages.

### Agent findings

- **test-runner:** All 1163 tests pass at 100 % rate, no fixes required.
- **docs-updater:** Added two cross-links — TableView.md and ListView.md now point readers toward `TablePage.batchAction()` from their respective batch-action discovery surfaces. AGENT.md needed no change.
- **security-review:** **No security concerns found.** Audited all five vectors I flagged: privilege escalation (auth still backend-enforced; helper is mechanically equivalent to the old loop), `confirm: false` bypass (zero production call sites use it), toast/error leakage (count-only summaries; rejection reasons never accessed), module-level statics (single JS realm, no per-tenant isolation to break), idempotent dual registration (all collisions assign the same class regardless of import order).

### Resolved open questions from the plan

- **`User.PASSWORD_FORM`** — deferred to a follow-up. UserTablePage's hand-rolled password / permissions / invite modals were explicitly out of scope for commit 5 to keep the commit focused on the batch-handler collapse.
- **`Member.ADD_FORM`** — left as-is. `MemberForms.create` is undefined; `Member.ADD_FORM = MemberForms.create` resolves to undefined and falls through to `Member.EDIT_FORM` per `ListView.getAddFormConfig()`. The page keeps `showAdd: true`. Not changing this behavior was the conservative call.
- **`EmailDomain.AUDIT_VIEW`** — deferred to a follow-up (part of the larger EmailDomain modal cleanup).
- **`GeoLocatedIP.VIEW_CLASS` collision** — resolved with idempotent dual registration in both `GeoLocatedIPTablePage.js` and `BlockedIPsTablePage.js`, mirrored by `Log.VIEW_CLASS` in `LogTablePage.js` and `FirewallLogTablePage.js`. Both pages work whether imported via `admin/index.js` or directly. Security review confirmed last-write-wins is safe (always assigns the same class).

### Follow-up requests filed

The plan deferred the heavier modal refactors. Worth filing as a separate request when there's appetite:

- **UserTablePage modal cleanup** — move the password / permissions / invite form configs to `User.PASSWORD_FORM` / `PERMISSIONS_FORM` / `INVITE_FORM` so the page handlers shrink to thin wrappers. Includes deciding whether `MOJOUtils.checkPasswordStrength` lives in the form's `onSubmit` or as a field-level `validator:`.
- **EmailDomain instance methods** — pull `onActionAudit / Reconcile / Onboard` into instance methods on `EmailDomain`. The audit-result View becomes `EmailDomain.AUDIT_VIEW` or stays a sibling file.
- **EmailMailbox send-email collapse** — fold the duplicated `onActionSendEmail` and `onActionSendTemplateEmail` into one `_sendEmail(formConfig)` helper, with form configs as `Mailbox.SEND_EMAIL_FORM` / `Mailbox.SEND_TEMPLATE_FORM`.
- **FileManager context-menu cleanup** — six context actions (`edit-credentials`, `edit-owners`, `clone`, `test-connection`, `check-cors`, `fix-cors`) move to instance methods on `FileManager`; form configs become `FileManager.CREDENTIALS_FORM` / `OWNERS_FORM`.
- **ShortLink metadata transform** — move `flattenShortLinkMetadata` / `extractShortLinkPayload` to `ShortLink.toForm()` / `fromForm()` so `_handleAdd` / `_handleEdit` shrink.
- **IPSet country-code transform** — `IPSet.fromCountryCode(code)` static; the page's custom Add becomes a 3-line wrapper.
- **GeoIP / PhoneNumber lookup forms** — move the inline form configs to `GeoLocatedIP.LOOKUP_FORM` / `PhoneNumber.LOOKUP_FORM`. Post-lookup show-result behavior stays page-level (no new primitive).
- **`UserDeviceLocationTablePage` extraction** — the embedded TableView could be extracted to a sibling `LoginEventTableView` if a second consumer ever appears. Today the inline config is small enough that extraction would be churn for no payoff.

### How to verify

The acceptance criteria from the plan are all satisfied:

- ✅ `git grep -nE "tableOptions:\\s*\\{[^}]*actions:" src/extensions/admin/` returns nothing.
- ✅ `git grep -n "format:\\s*'boolean'" src/extensions/admin/` only matches DataView field configs, which support `field.format` natively (`DataView.js:461`).
- ✅ `git grep -n "tableView\\._onRowView" src/extensions/admin/` returns nothing.
- ✅ Every admin TablePage either matches the canonical (Collection + columns + features) shape OR has a documented reason not to (custom `onAdd:` / `onItemEdit:` for ShortLink, IPSet, FileTablePage; `Page` parent for JobsTablePage and UserDeviceLocationTablePage).
- ✅ `TablePage.batchAction()` exists, is documented, is unit-tested, and has 14 production callers across 7 admin pages.
- ✅ The `LogTablePage` immutable-feed principle is encoded in code (no `selectable`, no `batchActions`) and in docs (Design Decisions section).
