# Admin TablePages — Mobile Breakpoint Pass

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
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
