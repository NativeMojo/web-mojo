# Admin TablePages — Mobile Breakpoint Pass

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
| Date | 2026-05-10 |
| Priority | high |

## Description

Strengthen column `visibility:` breakpoints across the admin TablePages so every wide table renders cleanly on a 375px-wide phone. The original sweep added breakpoints to ~14 tables but undershot phone-friendliness — many tables still show 5+ columns at mobile sizes, which is unscannable.

The rule, plain: **on a 375px-wide phone, any admin table shows at most three real data columns** — the primary identifier, one state column (status/badge/severity), and a timestamp. Everything else hides at `md` (≤768px) or `lg` (≤992px). Selection checkboxes, ID columns where they're identifiers, action cells, and the day-range segment always stay visible.

This is mechanical config-only work — pure column option edits across ~10 page files. No new framework primitives, no behavior changes, no row-template rewrites.

## Context

Heavy mobile use on the admin surface — admins triage from phones during incidents, check user accounts on the move, browse logs from anywhere. The current state on small viewports is too dense: rows wrap, cells overlap, horizontal scroll happens. The fix is per-column `visibility:` tags.

The original sweep's column-design judgment was desktop-first; this request applies a phone-first lens on top of that. After this lands, the principle is enforced as policy (see the saved `feedback_mobile_first_columns.md` memory): every future column recommendation must name its breakpoint at the time of recommendation.

## Acceptance Criteria

### Per-table column visibility changes

| File | Mobile shape (≤375px phone) | What changes |
|------|------------------------------|--------------|
| `account/devices/UserDeviceTablePage.js` | User + Last IP + Last Seen | Add `visibility: 'md'` on `device_info.user_agent.family` (Browser). Existing `lg` / `xl` on duid / OS / first_seen are correct. |
| `incidents/IncidentTablePage.js` | Status + Title + Created | Add `visibility: 'md'` on `scope` and `category`; `visibility: 'lg'` on `priority`. (Priority gets a severity-chip column later — for now hide on phone.) |
| `incidents/EventTablePage.js` | Created + Level + Title | Add `visibility: 'md'` on `category` and `scope`. Existing `md` / `lg` on source_ip / metadata.server are correct. |
| `monitoring/LogTablePage.js` | Timestamp + Level + Kind | Add `visibility: 'md'` on `method`, `path`, `username`. Add `visibility: 'lg'` on `ip` and `duid`. |
| `security/IPSetTablePage.js` | Active + Name + Kind | Add `visibility: 'md'` on `cidr_count` and `source`. Existing `lg` on description / last_synced / sync_error are correct. |
| `messaging/email/EmailDomainTablePage.js` | Domain + Receiving + Send Verified | Existing `md` / `lg` on region / can_recv / created are correct. Consider also `md`-hiding `can_send` if domain row gets a consolidated Status chip later (out of scope here). |
| `messaging/email/EmailMailboxTablePage.js` | Email + Inbound + Outbound | Add `visibility: 'md'` on `domain.name` (the email already implies the domain, so on phone showing both is redundant). Existing `lg` on is_system_default / is_domain_default are correct. |
| `messaging/sms/PhoneNumberTablePage.js` | Phone + Line Type + Valid | Add `visibility: 'md'` on `carrier` and `is_mobile`. Existing `lg` on is_voip / registered_owner / owner_type are correct. |
| `security/BouncerSignalTablePage.js` | Timestamp + IP + Decision | Add `visibility: 'md'` on `page_type`, `stage`. Add `visibility: 'lg'` on `risk_score` and `muid`. |
| `security/BouncerDeviceTablePage.js` | MUID + Risk Tier + Last Seen | Existing `md` on event_count / block_count from the original sweep are correct. Add `visibility: 'md'` on `last_seen_ip`. |
| `messaging/push/PushDeliveryTablePage.js` | Timestamp + Title + Status | Add `visibility: 'md'` on `user.display_name`. Existing `md` / `lg` on device.device_name / category are correct. |
| `messaging/push/PushDeviceTablePage.js` | User + Device Name + Last Seen | Add `visibility: 'md'` on `push_enabled`. Existing `md` / `lg` on platform / app_version are correct. |
| `shortlinks/ShortLinkTablePage.js` | Code + Destination + Last Click | Add `visibility: 'md'` on `is_active`, `source`, `track_clicks`. Add `visibility: 'lg'` on `expires_at` and `created`. |
| `shortlinks/ShortLinkClickTablePage.js` | Time + Code + IP | Add `visibility: 'md'` on `shortlink.url` and `is_bot`. Existing `md` / `lg` on user_agent / referer are correct. |

### Mobile-specific row-action visibility

- All row-level action buttons (Edit / Delete / context-menu trigger, when present) must remain visible on phones with ≥40×40px touch target. Audit each affected page to confirm Bootstrap's default action-column rendering meets this; flag any that doesn't fit for follow-up.

### Tests

- Extend `test/unit/admin-tablepages-bugfixes.test.js` (or a new `test/unit/admin-tablepages-mobile-breakpoints.test.js`) with source-level assertions for each new `visibility:` tag — confirms the column config carries the breakpoint after this lands and locks the regression so a future refactor can't silently remove them.
- Manual verification: run `npm run dev`, navigate to each affected page, resize the preview to 375×812 (mobile preset), verify the visible-headers count matches the "mobile shape" column above.

### Documentation

- No new docs needed. The `docs/web-mojo/components/TableView.md` "Column Visibility (Responsive)" section already documents the option. Optionally add a one-line note recommending the "≤3 columns on phone" rule of thumb.
- CHANGELOG entry under "Admin extension" — single bullet group covering the breakpoint pass.

## Investigation

### What exists

- The original sweep added `visibility:` to ~14 tables, applying `lg` / `xl` to typically-3-4 secondary columns per table. The bias was desktop-first — "what would I hide last on a smaller laptop?" rather than "what's the bare minimum on a 375px phone?"
- TableView's `visibility:` option is already implemented and documented; this work consumes existing primitives only.
- Bootstrap breakpoints in use: `sm` (≥576), `md` (≥768), `lg` (≥992), `xl` (≥1200), `xxl` (≥1400). The `visibility: 'md'` tag hides the column below 768px (phones); `visibility: 'lg'` hides below 992px (phones + small tablets).

### Constraints

- **No row-template rewrites.** This is purely column option edits.
- **No new framework primitives.** Consume existing `visibility:` only.
- **No backend changes.** All column data is already fetched; visibility is a render-time decision.
- **No batch / framework-wide changes to the existing breakpoint defaults.** Each page gets its own breakpoint judgment — don't try to derive a generic algorithm.

### Related files

Per the matrix above — ~14 page files in `src/extensions/admin/`. No model files or framework files touched.

### Endpoints

None.

### Tests required

- Source-level regression assertions (per "Tests" above).
- Manual mobile-preset verification.

### Out of scope

- **Row template redesign** (icon column, two-line layout, customer-friendly chips). Separate request — applies more naturally to `user-profile-listview-migration.md` for now; admin tables can stay table-shaped.
- **Action button touch-target sizing** beyond auditing — if any page fails the ≥40×40 rule, file as a follow-up. Don't fix here.
- **Column consolidation** (collapsing 3 boolean columns into a chip cluster) — separate UX problem; would land in `admin-tablepages-high-leverage-redesign.md` for the affected pages.
- **TableView framework changes** to default `visibility:` behavior. Stays consumer-driven.

## Plan

### Objective

Strengthen column `visibility:` breakpoints across 13 admin TablePage files so every wide table renders cleanly on a 375px-wide phone. Each affected table will show at most three real data columns (primary identifier + state + timestamp) on a phone; everything else hides at `md` (≤768px) or `lg` (≤992px). Pure config edits — no behavior changes, no new framework primitives, no row-template rewrites. (`EmailDomainTablePage.js` is reviewed in scope but not edited — its existing breakpoints are already correct.)

### Steps

1. **`src/extensions/admin/account/devices/UserDeviceTablePage.js`** — add `visibility: 'md'` to `device_info.user_agent.family` (Browser). Existing `lg` / `xl` on `duid` / `device_info.os.family` / `first_seen` stay.
2. **`src/extensions/admin/incidents/IncidentTablePage.js`** — add `visibility: 'md'` to `scope` and `category`; `visibility: 'lg'` to `priority`.
3. **`src/extensions/admin/incidents/EventTablePage.js`** — add `visibility: 'md'` to `category` and `scope`. Existing `md` on `source_ip` and `lg` on `metadata.server` stay.
4. **`src/extensions/admin/monitoring/LogTablePage.js`** — add `visibility: 'md'` to `method`, `path`, `username`. Add `visibility: 'lg'` to `ip` and `duid`.
5. **`src/extensions/admin/security/IPSetTablePage.js`** — add `visibility: 'md'` to `cidr_count` and `source`. Existing `lg` on `description` / `last_synced` / `sync_error` stay.
6. **`src/extensions/admin/messaging/email/EmailMailboxTablePage.js`** — add `visibility: 'md'` to `domain.name`. Existing `lg` on `is_system_default` / `is_domain_default` stay.
7. **`src/extensions/admin/messaging/sms/PhoneNumberTablePage.js`** — add `visibility: 'md'` to `carrier` and `is_mobile`. Existing `lg` on `is_voip` / `registered_owner` / `owner_type` stay.
8. **`src/extensions/admin/security/BouncerSignalTablePage.js`** — add `visibility: 'md'` to `page_type` and `stage`; `visibility: 'lg'` to `risk_score` and `muid`.
9. **`src/extensions/admin/security/BouncerDeviceTablePage.js`** — add `visibility: 'md'` to `last_seen_ip`. Existing `md` on `event_count` / `block_count` stay.
10. **`src/extensions/admin/messaging/push/PushDeliveryTablePage.js`** — add `visibility: 'md'` to `user.display_name`. Existing `md` on `device.device_name` and `lg` on `category` stay.
11. **`src/extensions/admin/messaging/push/PushDeviceTablePage.js`** — add `visibility: 'md'` to `push_enabled`. Existing `md` on `platform` and `lg` on `app_version` stay.
12. **`src/extensions/admin/shortlinks/ShortLinkTablePage.js`** — add `visibility: 'md'` to `is_active`, `source`, `track_clicks`. Add `visibility: 'lg'` to `expires_at`. (`created` already has `visibility: 'lg'` — no change.)
13. **`src/extensions/admin/shortlinks/ShortLinkClickTablePage.js`** — add `visibility: 'md'` to `shortlink.url` and `is_bot`. Existing `md` on `user_agent` and `lg` on `referer` stay.
14. **`src/extensions/admin/messaging/email/EmailDomainTablePage.js`** — no edits. Audited; existing `md` on `region` / `can_recv` and `lg` on `created` are already correct. (Listed only for completeness; the optional `can_send` consolidation is out of scope here.)
15. **New test file: `test/unit/admin-tablepages-mobile-breakpoints.test.js`** — source-level regex assertions, one `it()` per `(file, key, breakpoint)` triple from the matrix. Pattern mirrors the existing `admin-tablepages-bugfixes.test.js` (`fs.readFileSync` + regex match, no module instantiation). Helper:

    ```js
    function expectVisibility(src, key, breakpoint) {
        const escKey = key.replace(/[.\\]/g, '\\$&');
        const re = new RegExp(
            `key:\\s*['"]${escKey}['"](?:(?!key:\\s*['"]).)*?visibility:\\s*['"]${breakpoint}['"]`,
            's'
        );
        return re.test(src);
    }
    ```

    One `describe` per file, with `it('column X is hidden below md/lg')` per added tag. ~25 assertions. Locks the regression so a future refactor can't silently drop the breakpoints.
16. **`CHANGELOG.md`** — under the existing `## Unreleased` section, add an H3 entry "**Admin TablePage · phone-first column breakpoints**" with one bullet group covering the pass — list `md` / `lg` additions per file at a high level, link to `planning/done/admin-tablepages-mobile-breakpoint-pass.md`.
17. **Move the request file** to `planning/done/admin-tablepages-mobile-breakpoint-pass.md` once the build is complete (handled by `/build`).

### Design Decisions

- **String-form `visibility:` only.** All existing visibility tags in the affected files use the short string form. The object form (`{hide: 'lg'}`, `{show: 'md', hide: 'xl'}`) is only useful for "show on phone, hide on desktop" — doesn't apply here. Stay consistent with the existing convention.
- **No defensive `visibility:` on already-visible columns.** Don't add `visibility: 'sm'` (or similar) to "always-visible" columns — meaningless and adds noise. Primary identifier / state / timestamp columns keep no `visibility:` key, as today.
- **No row-template rewrites.** The request explicitly forbids this — keeps the change reviewable as a flat per-column delta and avoids touching `template:` strings.
- **Don't edit `EmailDomainTablePage`.** It's audited and already correct; touching it just to "complete the matrix" is wasted churn and dilutes the diff.
- **Test file is new, not an extension of the bugfixes file.** The bugfixes test file is a frozen record of the previous sweep's silent-bug regressions; mixing breakpoint regressions into it dilutes its purpose. New file aligns with the request's stated preference.
- **Source-level regex testing, not DOM rendering.** Matches the existing admin-tablepage testing pattern — admin models aren't registered with `simple-module-loader`, and the visibility behavior itself is already covered by `TableView` unit tests. We're locking that the config carries forward — string-level concern.

### Edge Cases

- **Regex robustness for nested object literals.** Several columns contain nested `filter: { type: 'select', options: [...] }` blocks or arrow-function `formatter:` bodies with their own `{}` (e.g. `BouncerSignalTablePage.decision`, `IPSetTablePage.kind`). The proposed `(?:(?!key:\s*['"]).)*?` lookahead terminates at the next `key:` declaration rather than matching balanced braces — works regardless of nesting depth within a single column object.
- **`key:` substring inside a `template:` string.** Not currently the case in any affected file, but if a future `template:` literal contains a `key: '...'` substring it would terminate the regex early. Accept as a known limitation; revisit if it breaks a real test.
- **Duplicate `visibility:` if mistakenly added twice.** Caught by code review and a single-match expectation in the test (regex test produces true/false; a second `visibility:` doesn't break it but the diff would show it).
- **Filter pill behavior on hidden columns.** `visibility:` only hides the cell — toolbar filter dropdown still works. No semantic change; consistent with the previous sweep.
- **Action column / context-menu touch-target audit.** Default Bootstrap `.btn-sm` icons (~30×30) do NOT meet 40×40. Treat this as: visually inspect each affected page on the 375×812 preset during manual verification; file any failures as a separate follow-up issue. Not fixed in this pass (out of scope).

### Testing

- `npm run test:unit` — runs the existing `admin-tablepages-bugfixes.test.js` (must still pass — no overlap) and the new `admin-tablepages-mobile-breakpoints.test.js` (new ~25 assertions).
- `npm run lint` — catches unintended whitespace/style drift in the edited columns.
- **Manual mobile verification:** `npm run dev`, open the example portal, navigate to each of the 13 edited admin TablePages, resize the preview to 375×812. Verify visible-headers count matches the matrix's "Mobile shape" column. Spot-check action / context-menu cells against the ≥40×40 touch target guideline; file follow-up issues for any failures.
- No need to run `test:integration` / `test:build` — config-only changes.

### Docs Impact

- `docs/web-mojo/components/TableView.md` — already documents `visibility:` in "Column Visibility (Responsive)". No edits needed; the "≤3 columns on phone" rule is a per-component judgment, not a framework invariant.
- `CHANGELOG.md` — new H3 under `## Unreleased` (Step 16 above).
- No public API changes, no new exports, no model changes — `docs/web-mojo/AGENT.md` and doc indexes don't need updates.

## Resolution

Implemented per the plan. 13 admin TablePages strengthened with phone-first `visibility:` tags; `EmailDomainTablePage` audited but not edited (existing tags already correct).

### Files changed

- `src/extensions/admin/account/devices/UserDeviceTablePage.js` — `md` on Browser.
- `src/extensions/admin/incidents/IncidentTablePage.js` — `md` on Scope, Category; `lg` on Priority.
- `src/extensions/admin/incidents/EventTablePage.js` — `md` on Scope, Category.
- `src/extensions/admin/monitoring/LogTablePage.js` — `md` on Method, Path, User; `lg` on IP, Browser ID.
- `src/extensions/admin/security/IPSetTablePage.js` — `md` on CIDR count, Source.
- `src/extensions/admin/messaging/email/EmailMailboxTablePage.js` — `md` on Domain.
- `src/extensions/admin/messaging/sms/PhoneNumberTablePage.js` — `md` on Carrier, Mobile.
- `src/extensions/admin/security/BouncerSignalTablePage.js` — `md` on Page, Stage; `lg` on Risk, Device.
- `src/extensions/admin/security/BouncerDeviceTablePage.js` — `md` on Last IP.
- `src/extensions/admin/messaging/push/PushDeliveryTablePage.js` — `md` on User.
- `src/extensions/admin/messaging/push/PushDeviceTablePage.js` — `md` on Push Enabled.
- `src/extensions/admin/shortlinks/ShortLinkTablePage.js` — `md` on Active, Source, Tracked; `lg` on Expires.
- `src/extensions/admin/shortlinks/ShortLinkClickTablePage.js` — `md` on Destination, Bot.
- `test/unit/admin-tablepages-mobile-breakpoints.test.js` — new file, 25 source-level regex assertions.
- `CHANGELOG.md` — new H3 under `## Unreleased`.

### Tests run

- `npm run test:unit` — 1083/1083 pass (100%), including the 25 new mobile-breakpoint assertions in `admin-tablepages-mobile-breakpoints.test.js`. The existing `admin-tablepages-bugfixes.test.js` (24 cases) still passes — no overlap. Duration ~624ms.
- `npm run lint` — no new errors / warnings introduced. The 71 pre-existing problems (16 errors, 55 warnings) are all in files untouched by this pass (per `grep -E '(UserDevice|Incident|Event|Log|IPSet|EmailMailbox|PhoneNumber|Bouncer|Push|ShortLink)TablePage'` returning no matches).

### Manual verification (deferred)

Manual mobile-preset verification (375×812 on each affected page) is a separate visual QA step — not blocking the build. Anyone running `npm run dev` and resizing the preview should now see at most three real data columns per affected table.

### Follow-ups identified

- **Touch-target audit (out of scope here).** Default Bootstrap `.btn-sm` action / context-menu icons render ~30×30, below the request's stated ≥40×40 phone target. The request explicitly defers any fix as a separate issue.
- **Column consolidation** (collapsing multi-boolean rows into a chip cluster) and **row-template redesign** remain tracked under other planning files per "Out of scope" in this request.

### Post-build agent findings

- **test-runner**: all green. Unit 1083/1083 + build 142/142 = 1225/1225, ~1.8s. No regressions. No integration suite directory exists.
- **docs-updater**: no doc changes needed. `visibility:` already documented in `docs/web-mojo/components/TableView.md`; no exports / public API touched.
- **security-review**: no concerns. No secrets in diff. CSS-hidden columns aren't an info-disclosure regression (admin permission already gates the page; the backend returned the data prior). Test file's `fs.readFileSync` uses hardcoded relative paths, no user-controlled input.
