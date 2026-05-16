# UserView Groups list duplicates each member row's permissions block N times

| Field | Value |
|-------|-------|
| Type | bug |
| Status | done |
| Date | 2026-05-16 |
| Severity | medium |

## Description

In `UserView`'s **Groups** section, every member-of-group row renders the **entire permission badges list** N times — once per permission — instead of rendering it once with N badges inside.

A member with 5 permissions renders 5 identical `<div class="user-feed-body">` blocks back-to-back, each containing the full set of 5 badges. With 10 permissions you'd get 10 duplicate blocks of 10 badges, and so on (quadratic visual noise). The page is functionally usable but visually broken — the row balloons vertically, the permission set looks suspiciously repeated, and the layout collapses on rows with many permissions.

Reported HTML for `Demo Account` (5 permissions: `view_verify`, `manage_group`, `view_metrics`, `view_pos_txs`, `admin_compliance`):

```html
<div id="view_..." class="list-view-item clickable">
    <div class="user-feed-row" role="button">
        <div class="user-feed-meta">
            <strong>Demo Account</strong>
            <span class="badge text-bg-secondary">org</span>
            <span class="ms-auto text-secondary small">Joined 02/28/2026</span>
        </div>
        <div class="user-feed-body small text-secondary">
            <span class="badge…">view_verify</span> … <span class="badge…">admin_compliance</span>
        </div>
        <!-- ↑ this exact <div class="user-feed-body"> block then repeats 4 MORE times,
             once per permission key, each containing all 5 badges -->
    </div>
</div>
```

## Context

- **User flow**: Admin → open `UserView` for any user with at least one group membership (`Modal.detail(new UserView({ model }))`) → side-nav → **Groups**.
- The Groups section is a `ListView` of `MemberList` scoped by `{ user: userId }`, declared inline inside `UserView`'s constructor at `src/extensions/admin/account/users/UserView.js:1248-1274`. The `itemTemplate` is a Mustache string.
- Affected layer: **View / template** (extension `admin`, no framework changes needed).

## Acceptance Criteria

- [ ] Each member row in the Groups list renders exactly **one** `<div class="user-feed-body">` containing one badge per permission key.
- [ ] When a member has zero permissions, the `<div class="user-feed-body">` block is omitted (or rendered empty — pick one and match existing conventions).
- [ ] The Mustache template uses `|bool` for the truthy gate, per the framework's documented `Templates.md` rule (see line 232+: "Boolean Checks Need |bool").
- [ ] No regression to the row's name / kind badge / joined-date header.
- [ ] No new tests required (bug surface is a template string; existing harness doesn't render Mustache for this kind of assertion). A trivial regex-level source assertion ("template uses `|bool` for the outer section") is optional.

## Investigation

- **Likely root cause:** Classic Mustache "array used as a section header that should have been a `|bool` truthy check" mistake. At `src/extensions/admin/account/users/UserView.js:1267-1271` the template is:

  ```mustache
  {{#model.permissions|keys}}
      <div class="user-feed-body small text-secondary">
          {{#model.permissions|keys}}<span class="badge text-bg-light border me-1">{{.}}</span>{{/model.permissions|keys}}
      </div>
  {{/model.permissions|keys}}
  ```

  - The `|keys` formatter returns the **array** of permission key strings (per `docs/web-mojo/core/DataFormatter.md:1200-1208`).
  - Mustache treats an array section header as an **iteration** — the body renders once per element, with the per-element value as the local context.
  - So the outer block renders N times. Inside, the inner section iterates the same array again and emits all N badges per outer pass. Hence: N × N rendering, presented as N stacked `user-feed-body` divs each with N badges.
  - The same file uses the correct `|bool` pattern everywhere else (`{{#hasEmail|bool}}`, `{{#isAdminCaller|bool}}`, `{{#model.is_active|bool}}` — see lines 213-475). The Groups section is the only place this rule is violated.
  - `docs/web-mojo/core/Templates.md` flags this exact mistake as **CRITICAL** at line 232 ("Boolean Checks Need |bool"). The `.claude/rules/views.md` rule restates it: "Use `{{#flag|bool}}` for boolean checks. Plain `{{#flag}}` can iterate arrays/objects."

- **Confidence:** high. The template / output mapping is mechanical and reproduces with N permissions → N copies of the badge block. The fix is a single `|bool` insertion on the outer section header.

- **Code path:**
  - Section construction: `src/extensions/admin/account/users/UserView.js:1248-1274` (`ListView` with the bad `itemTemplate`).
  - The collection: `MemberList` scoped to `{ user: userId, size: 10 }`, set up nearby (search the same file for `membersCollection = new MemberList`).
  - Template engine: `src/utils/mustache.js` (the framework's Mustache wrapper) + `src/core/utils/DataFormatter.js:1200-1208` for the `|keys` formatter.
  - Rule references: `docs/web-mojo/core/Templates.md:232+`, `.claude/rules/views.md` Template Rules.

- **Likely fix shape (for design phase, not prescriptive):** Convert the outer section to a boolean truthy gate while preserving the inner iteration:

  ```mustache
  {{#model.permissions|keys|bool}}
      <div class="user-feed-body small text-secondary">
          {{#model.permissions|keys}}<span class="badge text-bg-light border me-1">{{.}}</span>{{/model.permissions|keys}}
      </div>
  {{/model.permissions|keys|bool}}
  ```

  Alternatively (slightly more efficient — no double evaluation of `|keys`): drop the outer wrapper entirely and always emit the `<div class="user-feed-body">`, letting the inner iteration render zero badges when the permission map is empty. Design decision: do we want the empty wrapper to render or not? Match whatever the row above (`user-feed-meta`) does for empty fields.

- **Regression test:** Not feasible in the current unit-test harness — the bug surface is a Mustache template inside an inline `itemTemplate` string passed to `ListView`'s constructor. The runner does not exercise Mustache rendering of inline `itemTemplate` strings. A meaningful assertion would either need a DOM-level render test (not supported here) or a tautological regex check on the source. The fix is verifiable by manual reproduction: load any user with ≥2 group memberships and confirm exactly one `user-feed-body` block per member row.

- **Related files:**
  - `src/extensions/admin/account/users/UserView.js` (the only file that needs editing)
  - `docs/web-mojo/core/Templates.md` (rule reference)
  - `docs/web-mojo/core/DataFormatter.md` (`|keys` formatter docs)
  - `.claude/rules/views.md` (Template Rules)
  - `src/utils/mustache.js` (engine — read-only reference)

## Resolution

Fixed in commit `cd6daad` (`fix(admin): UserView Groups — render permission badges once, not N×N`). One-token Mustache template edit at `src/extensions/admin/account/users/UserView.js:1267,1271`: the outer section header changed from `{{#model.permissions|keys}}` to `{{#model.permissions|keys|bool}}` (with the matching close tag updated). The inner iteration that emits one `<span class="badge">` per permission key is unchanged.

### Validation

- **Lint** — `npx eslint src/extensions/admin/account/users/UserView.js`: clean.
- **Dev server** — already running from the prior session. No new console errors, no build errors after the edit.
- **UI smoke** — **not exercised here.** The affected template renders inside the authenticated admin `UserView` → Groups list, which requires a real backend session. The framework-source dev server lands on the unauthenticated test client. Manual verification path for a reviewer: load any user with ≥2 group memberships and confirm exactly one `<div class="user-feed-body">` per member row.
- **Tests** — no new regression test. The bug surface is an inline `itemTemplate` Mustache string; the current unit harness does not exercise Mustache rendering of inline `itemTemplate` strings. A tautological source-regex check was not worth adding.

### Out of Scope

- No similar Mustache iteration bugs were swept for elsewhere in the codebase. If desired, a follow-up could grep for `{{#...|keys}}...{{/...|keys}}` patterns lacking `|bool` to confirm there are no other instances.
