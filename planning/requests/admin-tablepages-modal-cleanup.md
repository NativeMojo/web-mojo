# Admin TablePages — Hand-Rolled Modal Cleanup Follow-Up

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | 2026-05-10 |
| Priority | medium |

## Description

Follow-up to the [admin TablePages UX sweep](../done/admin-tablepages-ux-sweep.md) that landed on `main` as 11 commits. The first sweep collapsed 14 hand-rolled batch handlers into `TablePage.batchAction()` calls, but **deferred** the heavier modal-flow refactors — those needed a focused pass rather than being bundled with the cross-cutting cleanup. This request is that focused pass.

The unifying pattern across all six items: form configuration and domain-specific transforms currently live as inline literals inside page action handlers, when they should live as static properties on the model class (mirroring the `Model.ADD_FORM` / `Model.EDIT_FORM` / `Model.VIEW_CLASS` pattern adopted in commit 3 of the original sweep). Page handlers shrink from 20–40 lines of bespoke `Modal.form({...}) → save → toast → refresh` boilerplate down to 2–5 lines that name the form and let the model handle the work.

The user-visible payoff is small per page (the modals look the same), but the maintenance payoff compounds: the next person to add a UserTablePage password-reset variant copies one model static, not 30 lines of Modal.form scaffolding. The forms also become reusable from non-page surfaces (a contextual chat assistant action, a bulk-import flow, a programmatic test) without re-implementing the same Modal.form invocation.

## Context

The original sweep's resolution called these out explicitly under "Out of scope, deferred to a follow-up request":

> Hand-rolled modal flows in `UserTablePage` (password / permissions / invite), `EmailDomainTablePage` (onboard / audit / reconcile), `EmailMailboxTablePage` (send-email / send-template-email collapse), `FileManagerTablePage` (6 context-menu actions), `ShortLinkTablePage` (metadata flatten/unflatten), `IPSetTablePage` (country-code transform), and `GeoIP` / `PhoneNumber` lookup forms. All keep their existing `onAdd:` / `onItemEdit:` / context-menu handlers; moving the form configs onto model statics is a focused review pass for a separate request.

This request bundles those items, with two carve-outs:

- **`GeoIP` / `PhoneNumber` lookup forms** — the original plan called for a possible `lookup-and-create` TablePage primitive with two consumers. Two callers don't justify a new primitive. Defer until a third use case surfaces; out of scope here.
- **`UserDeviceLocationTablePage` → extract `LoginEventTableView`** — pure churn until a second consumer of that table shape exists. Out of scope here.

That leaves **6 real cleanups** across 5 admin pages and 4 model files.

## Acceptance Criteria

### A. UserTablePage modal flows → User.{PASSWORD,PERMISSIONS,INVITE}_FORM

Three context-menu actions today implement their entire form + save flow inline (`UserTablePage.js:172–258`):

- `onActionEditPermissions` (~10 lines) — already passes `UserForms.permissions.fields` but reaches inside the page to wire up `Modal.modelForm`. Promote to `User.PERMISSIONS_FORM` and shrink the handler to 2–3 lines.
- `onActionChangePassword` (~45 lines including the recursive `onPasswordChange` retry) — inline form config + `MOJOUtils.checkPasswordStrength` validation + custom toast wording + recursive retry on weak password. The form config moves to `User.PASSWORD_FORM` (or `UserForms.password`); the strength validation moves to the form's `onSubmit` hook so the recursion logic disappears (the form simply doesn't close on weak input). Toast wording stays.
- `onActionSendInvite` (~15 lines) — calls `item.save({send_invite: true})` and toasts the result. Doesn't need a form, but the toast wording + error-handling pattern repeats the same shape as the password handler. Either keep as-is (no form to extract) or fold into a tiny `User.sendInvite()` instance method that owns the API call + toast wording.

**Files touched:** `src/extensions/admin/account/users/UserTablePage.js`, `src/core/models/User.js` (add statics + optionally `User.sendInvite()`).

### B. EmailDomainTablePage instance-method extraction

Three context-menu actions today wrap thin model-method calls in identical try/catch + toast scaffolding (`EmailDomainTablePage.js:128–204`):

- `onActionOnboard` calls `model.onboard(formData)` after collecting form input via `Modal.form(EmailDomainForms.onboard)`. The form config already lives on `EmailDomainForms`; the page handler is pure boilerplate around that.
- `onActionAudit` calls `model.audit()` and pipes the result into a `Modal.dialog` body that's a hand-rolled `View` instance defined inline. The audit-result View shape should land on the model file as `EmailDomain.AUDIT_VIEW` (a small `View` subclass exported from `Email.js` or a sibling file).
- `onActionReconcile` calls `model.reconcile()` and toasts. Symmetric with onboard.

The pattern post-cleanup: each page handler is 2–3 lines that delegate to a model instance method (`onboard()`, `audit()`, `reconcile()`) which already exists on the model — they just need to consistently return a normalized `{success, error?, data?}` shape and let the page surface the toast. The audit-report dialog uses `EmailDomain.AUDIT_VIEW` registered as a static.

**Files touched:** `src/extensions/admin/messaging/email/EmailDomainTablePage.js`, `src/extensions/admin/models/Email.js`, possibly a new `src/extensions/admin/messaging/email/EmailDomainAuditView.js` for the audit-result View.

### C. EmailMailboxTablePage send-email collapse

`onActionSendEmail` and `onActionSendTemplateEmail` (`EmailMailboxTablePage.js:67–120`) are nearly identical — same `Modal.form({...})` shape, same `Mailbox.sendEmail(data)` call, same error-message-precedence handling (`details` > `error` > generic), same toast wording. The only difference is which fields the form prompts for.

The cleanup:

- Add `Mailbox.SEND_EMAIL_FORM` and `Mailbox.SEND_TEMPLATE_FORM` statics on the model file.
- Add a single page-level `_sendMail(formStatic)` helper that takes the form config, runs the modal, calls `Mailbox.sendEmail`, and surfaces the toast.
- Both `onActionSendEmail` and `onActionSendTemplateEmail` become 2-line wrappers that pass the appropriate static into the helper.

Net: ~50 lines of duplicated boilerplate collapse to ~15.

**Files touched:** `src/extensions/admin/messaging/email/EmailMailboxTablePage.js`, `src/extensions/admin/models/Email.js`.

### D. FileManagerTablePage 6 context-menu actions → model statics + instance methods

The page (`FileManagerTablePage.js:116–196`) carries six context-menu handlers that each follow a similar shape: `Modal.form` or `Modal.modelForm` with a config from `FileManagerForms`, then a `model.save({flag: true})` call, then a result-dispatched toast. The forms already live on `FileManagerForms`; the pattern is to promote them to `FileManager.{CREDENTIALS,OWNERS}_FORM` statics and let the page handlers shrink. The "side-effect" actions (`check-cors`, `fix-cors`, `test-connection`, `clone`) are pure `model.save({flag})` wrappers that don't need a form — they're candidates for `FileManager` instance methods (`checkCors()`, `testConnection()`, `clone()`) so the page handler just calls the method and surfaces the toast.

Per handler:

- `onActionEditOwners` → `FileManager.OWNERS_FORM` static + 2-line page handler.
- `onActionEditCredentials` → `FileManager.CREDENTIALS_FORM` static + 2-line page handler.
- `onActionCheckCors` → `FileManager.checkCors()` instance method + 2-line page handler that opens `Modal.data` on success.
- `onActionTestConnection` → `FileManager.testConnection()` instance method + 2-line page handler.
- `onActionClone` → `FileManager.clone()` instance method (handles the confirm + save) + 1-line page handler.
- `fix-cors` declared as a context menu action but I don't see a corresponding `onActionFixCors` handler in the file — verify whether it's wired up via base class or is dead config; either fix or drop the menu entry.

**Files touched:** `src/extensions/admin/storage/FileManagerTablePage.js`, `src/core/models/Files.js`.

### E. ShortLinkTablePage metadata transform → ShortLink.toForm() / fromForm()

`ShortLinkTablePage._handleAdd` and `_handleEdit` use the helper functions `flattenShortLinkMetadata(model)` and `extractShortLinkPayload(formData)` (imported from `@core/models/ShortLink.js`) to translate between the model's nested `metadata.{og_title,og_description,og_image}` shape and the form's flat `og_title` / `og_description` / `og_image` fields.

Two options:

- **Option A (preferred):** Move the helpers onto the `ShortLink` model class as instance methods — `model.toForm()` returns the flat shape, `ShortLink.fromForm(formData)` returns the nested-metadata payload. The page handlers become 4–5 lines of `Modal.form({ data: model.toForm() })` then `model.save(ShortLink.fromForm(result))`.
- **Option B:** Add `formTransformIn` / `formTransformOut` callback hooks to FormView's config so the page can pass them inline. More framework surface; reject unless option A turns out to be ugly.

**Files touched:** `src/extensions/admin/shortlinks/ShortLinkTablePage.js`, `src/core/models/ShortLink.js`. The `flattenShortLinkMetadata` / `extractShortLinkPayload` named exports stay (downstream consumers may import them) — they just become thin wrappers around the model methods or get marked deprecated.

### F. IPSetTablePage country-code transform → IPSet.fromCountryCode()

`IPSetTablePage._handleAdd` (custom Add flow) takes a country code from a form, looks it up against the `CommonBlockCountries` map imported from `@ext/admin/models/IPSet.js`, and constructs a model with `name`, `source`, and `description` populated from the lookup before saving.

Cleanup: move the country-code → name/source/description transform onto the model as a static factory: `IPSet.fromCountryCode(code, countryName)` returns a fresh `IPSet` instance with the right fields populated. The page's `_handleAdd` shrinks from ~25 lines (form prompt + lookup + field assembly + save + error handling) to ~5 lines (form prompt → `IPSet.fromCountryCode` → save).

The plan also mentions adding `IPSet.LOOKUP_FORM` as the form config for the country-code prompt — yes, do that, register at the bottom of `IPSet.js` next to the existing `IPSet.EDIT_FORM`.

**Files touched:** `src/extensions/admin/security/IPSetTablePage.js`, `src/extensions/admin/models/IPSet.js`.

### G. Tests

- Unit: each new model static (`User.PASSWORD_FORM`, `User.PERMISSIONS_FORM`, `Mailbox.SEND_EMAIL_FORM`, `Mailbox.SEND_TEMPLATE_FORM`, `FileManager.CREDENTIALS_FORM`, `FileManager.OWNERS_FORM`, `IPSet.LOOKUP_FORM`) gets a one-line "static is exported and shaped right" assertion in `test/unit/admin-model-statics.test.js` (extending the existing file from the original sweep).
- Unit: each new instance method (`User.sendInvite()`, `EmailDomain.audit()/reconcile()/onboard()` if they don't already exist as bare REST wrappers, `FileManager.checkCors()/testConnection()/clone()`, `ShortLink.toForm()`, `IPSet.fromCountryCode()`) gets a tiny test that exercises the happy path against a stub model + stub Rest. Existing tests for these methods (where they already exist) must keep passing.
- Regression: source-level assertions in `test/unit/admin-tablepages-bugfixes.test.js` (or a new `admin-tablepages-modal-cleanup.test.js`) that the migrated pages no longer carry the inline form literals (e.g. `expect(src).not.toMatch(/await Modal\.form\(\{[\s\S]*name: 'new_password'/)`). These are intentionally narrow — a future contributor should be able to refactor the model statics without these tests fighting them, but bringing back inline `Modal.form` configs in the page should fail.

### H. Documentation

- Update `docs/web-mojo/pages/TablePage.md` "Canonical pattern: model statics" section if any new static name (`PASSWORD_FORM`, `LOOKUP_FORM`, `SEND_EMAIL_FORM` etc.) is worth listing in the table of recommended registration locations. Probably yes for the most common ones (PASSWORD_FORM, LOOKUP_FORM); the domain-specific ones (SEND_TEMPLATE_FORM) stay undocumented.
- CHANGELOG entry under "Admin extension" — single bullet group listing the cleanups, mirroring the original sweep's rollup style.

## Investigation

### What exists today

Each item in the Acceptance Criteria above already cites the specific file + line range of the inline boilerplate. The forms generally already exist as exports from `*Forms.js` modules — the migration is mostly mechanical (move the form to a model static, drop the inline `Modal.form({...fields})` literal in the page handler). The harder pieces:

- **`MOJOUtils.checkPasswordStrength` placement.** The original sweep flagged this as an open question. Two viable shapes: (a) thin wrapper in the form's `onSubmit` (form refuses to close on weak input, page never sees weak data); (b) form-field `validator:` callback that runs inline as the user types. Option (a) is simpler and matches how the rest of the framework's validation works. Pick (a) unless lint or testing reveals friction.
- **`EmailDomain.AUDIT_VIEW` shape.** The current audit-report dialog body is a hand-rolled `new View({ template: '<pre>{{{data.result|json}}}</pre>', data: { result } })`. Promoting it to an exported View class is a small file (15–20 LOC). The static can register at the top of `EmailDomainTablePage` (page-coupled) or bottom of `Email.js` (shared) — page-coupled is fine since no other consumer exists.
- **FileManager `fix-cors` orphan handler.** Listed in the context menu but no corresponding `onActionFixCors` method visible. Verify whether (a) it's handled by an inherited method, (b) it's silently broken (dead config), or (c) it should be a `FileManager.fixCors()` instance method paired with a fresh handler. If (b), this becomes another silent-bug cleanup like the ones in commit 2 of the original sweep.

### Constraints

- **No backend / API contract changes.** All endpoints stay as-is. The model instance methods that wrap REST calls (`model.audit()`, `model.reconcile()`, `model.onboard()`, etc.) already exist; this request just standardizes their return shape and consumes them via thinner page handlers.
- **No new framework primitives.** All cleanups consume existing patterns (`Model.X_FORM` statics, instance methods on the model, the `TablePage.batchAction()` helper from the original sweep). If a primitive turns out to be necessary mid-build, stop and file a separate request rather than expanding scope.
- **Public behavior preserved.** Modal copy, toast wording, error handling all stay the same per page. The cleanup is invisible to admin users — it's a code-organization change.
- **`*Forms.js` named exports stay.** The forms already exported from `UserForms`, `EmailDomainForms`, `FileManagerForms` etc. remain exported (downstream consumers may import them directly). The migration is "where the page reaches for the form config", not "where the form lives." Same call as the original sweep.

### Related files

- `src/extensions/admin/account/users/UserTablePage.js`, `src/core/models/User.js`
- `src/extensions/admin/messaging/email/EmailDomainTablePage.js`, `src/extensions/admin/messaging/email/EmailMailboxTablePage.js`, `src/extensions/admin/models/Email.js`, possibly new `EmailDomainAuditView.js`
- `src/extensions/admin/storage/FileManagerTablePage.js`, `src/core/models/Files.js`
- `src/extensions/admin/shortlinks/ShortLinkTablePage.js`, `src/core/models/ShortLink.js`
- `src/extensions/admin/security/IPSetTablePage.js`, `src/extensions/admin/models/IPSet.js`
- `test/unit/admin-model-statics.test.js` (extend), possibly new `test/unit/admin-tablepages-modal-cleanup.test.js`
- `docs/web-mojo/pages/TablePage.md`, `CHANGELOG.md`

### Endpoints

None added or modified.

### Tests required

Per the "Tests" section above. Bias toward small, narrow assertions — these are mostly mechanical migrations and the existing 1172-test suite covers the underlying machinery already. The new tests exist to lock the registration shape and prevent regression of the inline-literal pattern.

### Out of scope

- **`UserTablePage` invite-flow domain logic** beyond moving the wiring — invite tokens, email send rendering, audit logging are domain features. If `User.sendInvite()` exists today as a bare REST wrapper, fine; if it needs to grow, that's a separate request.
- **FormView `formTransformIn` / `formTransformOut` framework feature.** ShortLinkTablePage option B above. Reject unless option A blocks.
- **`lookup-and-create` TablePage primitive.** The original plan deferred this to a "third use case appears" trigger. GeoIP and PhoneNumber stay page-level for now.
- **`UserDeviceLocationTablePage` → `LoginEventTableView` extraction.** No second consumer; pure churn.
- **Inline cell editing rollout** beyond the existing TicketTablePage usage. Different UX problem; separate request.
- **Filter presets** ("Last 24h errors") on `EventTablePage` / `IncidentTablePage`. Different UX problem; separate request.
- **Migrating any `*Forms.js` module to be defined inline on the model class.** The forms stay where they are; this is purely about where the page reaches for them.
