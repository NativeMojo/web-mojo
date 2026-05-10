# Admin TablePages — High-Leverage Redesign

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | 2026-05-10 |
| Priority | high |

## Description

Targeted column + filter redesign of the three highest-traffic admin TablePages — `IncidentTablePage`, `EventTablePage`, and `S3BucketTablePage`. These are the pages where the original sweep's column choices were either unchanged-but-already-cognitively-overloaded (Incident / Event have 11–13 filters with no entry points) or genuinely too thin to be useful (S3Bucket has only 3 columns: ID / Name / Created).

This is NOT a sweep across all admin pages — those pages get touched as drive-bys or as part of the mobile breakpoint pass. This request is bounded to three pages where the UX delta is largest.

Two items depend on framework primitives that ship separately:
- **Filter presets** on Incident + Event depend on `framework-listview-filter-presets.md`.
- **Severity stripe** on Event depends on `framework-listview-severity-stripe.md`.

Land those first or sequence accordingly; this request can land its non-blocked items (S3Bucket columns, Incident priority chip, Event "Show OSSEC" toggle) standalone.

## Context

The original sweep ([planning/done/admin-tablepages-ux-sweep.md](../done/admin-tablepages-ux-sweep.md)) was deliberately structural — model statics, batchAction helper, dayRangeFilter / groupByDay adoption, responsive visibility. It did NOT make column-design judgment calls about *which* columns each page should show. That judgment is what this request brings.

After the sweep, three pages remain visibly under-served:

- **IncidentTablePage** — 11+ filters with no presets, no Owner/Assignee column, numeric `priority` rendered as a bare number rather than a severity chip. Admins live in this page during incidents; the cognitive load is real.
- **EventTablePage** — 13+ filters with no presets, no severity color encoding beyond the level badge, the default-filter `category__not: "ossec"` is buried in `defaultQuery` rather than a visible toggle.
- **S3BucketTablePage** — 3 columns (ID / Name / Created). You can't make any decision about a bucket from this view. Region / object count / total size / public-or-private status are basic operational questions left unanswered.

Mobile context already saved as a guardrail: any column changes here must include `visibility:` breakpoints (memory `feedback_mobile_first_columns.md`). The "≤3 columns on phone" rule applies to all three pages.

## Acceptance Criteria

### A. IncidentTablePage redesign

#### A1. Priority as a severity chip (independent — can ship now)

- Replace the bare `priority` column (currently renders the integer) with a chip that color-codes by bucket: 8+ red (`bg-danger`), 5–7 amber (`bg-warning`), 1–4 muted (`bg-secondary`). Use the existing chip / badge styling patterns from `IncidentView`.
- Keep the column sortable.
- `visibility: 'lg'` — priority is secondary on phones; status + title carry the urgency signal there.

#### A2. Owner / Assignee column (blocks on backend)

- Add an **"Owner"** column that surfaces the currently-assigned engineer/owner for the incident. If `Incident` doesn't carry this field today, the work is two parts:
  - Backend: add `owner` (FK to User or member) to the Incident model + nest in the standard CRUD response.
  - Frontend: display as `{ key: 'owner.display_name', label: 'Owner', sortable: true, visibility: 'md', formatter: "default('Unassigned')" }`.
- Backend change is out-of-scope for this UX request — file the backend gap separately if it doesn't exist. Frontend change lands once the field is exposed.

#### A3. "Last activity" column

- Add `{ key: 'modified', label: 'Last Activity', formatter: 'relative', sortable: true, visibility: 'md' }`. Tells admins "is this stale?" — every other incident-tracking system has this column for a reason.

#### A4. Filter presets (blocked on `framework-listview-filter-presets.md`)

Once the primitive lands, wire these presets on IncidentTablePage:

```javascript
filterPresets: [
  { key: 'open-high',      label: 'Open & High',         icon: 'bi-fire',         params: { status__in: 'new,open', priority__gte: 8 } },
  { key: 'resolved-week',  label: 'Resolved this week',  icon: 'bi-check-circle', params: { status: 'resolved', created__gte: '7d' } },
  { key: 'stale',          label: 'Stale > 24h',         icon: 'bi-clock-history', params: { status__in: 'new,open', modified__lte: '1d_ago' } },
  { key: 'mine',           label: 'Mine',                icon: 'bi-person-fill',   params: { owner: '@me' } }
]
```

The `@me` token is a placeholder — needs framework support for "current user id" substitution. If that's not in scope for the filter-presets primitive, drop the "Mine" preset for now.

#### A5. Group by priority bucket (optional, judgment call)

- Consider `groupBy` callback that buckets incidents into "High / Medium / Low" sections. Visually surfaces hot incidents at the top of the list without requiring a sort. Build phase eyeballs whether it crowds the existing groupByDay-or-no-grouping shape; if it's noisy, skip.

### B. EventTablePage redesign

#### B1. Severity stripe (blocks on `framework-listview-severity-stripe.md`)

- Once the framework primitive lands, configure a row-level severity stripe based on `level`:
  - level 5 (critical) → `var(--bs-danger)`
  - level 4 (warning) → `var(--bs-warning)`
  - level 3 (info) → `var(--bs-info)`
  - level ≤2 → no stripe (muted)
- Replaces the redundant `level|badge` column visual weight — the stripe reads faster than scanning a column.

#### B2. "Show OSSEC events" visible toggle (independent — can ship now)

- The default filter `category__not: "ossec"` is buried in `defaultQuery`. Surface it as a visible toolbar toggle (segment control or named filter pill) so admins can see at a glance "OSSEC events are currently hidden — click to include."
- Implementation: lift the default-filter into the named-filters array as a `boolean` filter type with a friendly label, OR add a `toolbarButtons:` entry that toggles the param.

#### B3. Filter presets (blocks on `framework-listview-filter-presets.md`)

```javascript
filterPresets: [
  { key: 'errors-24h',     label: 'Errors last 24h',     icon: 'bi-exclamation-triangle', params: { level__gte: 4, created__gte: '1d' } },
  { key: 'auth-failures',  label: 'Auth failures',       icon: 'bi-shield-lock',          params: { category: 'auth' } },
  { key: 'api-errors',     label: 'API errors',          icon: 'bi-server',               params: { category: 'api_error' } }
]
```

#### B4. Search placeholder specificity

- Already added `'Search title, message, or ID'` in the original sweep, but verify the backend search actually hits `metadata.message` (not just `title`). If the indexed-search fields are narrower, narrow the placeholder copy accordingly. Honesty about what's searchable matters more than a comprehensive-looking placeholder.

### C. S3BucketTablePage redesign

S3Bucket currently has 3 columns total. Add four operationally-meaningful columns:

- `{ key: 'region', label: 'Region', sortable: true }` — always visible. Operational primary signal.
- `{ key: 'object_count', label: 'Objects', sortable: true, align: 'right', visibility: 'md', formatter: 'number' }` — answers "is this bucket in use?"
- `{ key: 'total_size', label: 'Size', sortable: true, align: 'right', visibility: 'md', formatter: 'filesize' }` — answers "is this expensive?"
- `{ key: 'is_public', label: 'Public', formatter: 'yesnoicon', visibility: 'lg', filter: { type: 'boolean' } }` — security signal; should never need to click into a bucket to know its public/private status.

Backend dependency: `region`, `object_count`, `total_size`, `is_public` fields must be exposed on the S3Bucket REST response. If any are missing, file the backend gap and ship the columns that exist; don't block the whole redesign on the worst-case missing field.

Mobile shape (≤375px): Name + Region + Default-or-Active-badge — same 3-column rule.

### D. Tests

- Source-level regression assertions for each new column option (`align`, `formatter`, `visibility`, `filter.type`) in `test/unit/admin-tablepages-bugfixes.test.js` or a new dedicated file.
- Manual verification per page: open in `npm run dev`, resize to mobile + tablet + desktop, verify column visibility matches the spec; for Incident filter presets, click each preset and confirm the URL + filter pills reflect the bundled params; for Event severity stripe, scroll the table and verify the stripe color follows the level.

### E. Documentation

- CHANGELOG entry under "Admin extension" — single bullet group covering the three redesigns. Reference the framework requests (filter presets, severity stripe) for the items that depend on them.
- No new framework docs (those land in their own requests). `docs/web-mojo/pages/TablePage.md` may grow a "Filter presets" example referencing the Incident config above, once the primitive lands.

## Investigation

### What exists

- IncidentTablePage today: 11 filters, status default to "new", sort default `-id`, custom batch handlers (now using `batchAction()`), `dayRangeFilter: true`. Reference impl for follow-up redesign.
- EventTablePage today: 13 filters, `dayRangeFilter: true`, `...groupByDay('created')`, no-selectable / no-batch (immutable feed).
- S3BucketTablePage today: 3 columns, model statics wired (`S3Bucket.ADD_FORM` / `EDIT_FORM`). Bare bones.
- The filter-presets and severity-stripe primitives don't exist yet — see the two framework requests filed alongside this one.

### Constraints

- **No inline edits.** Status / priority / owner columns stay as display-only; edits flow through the existing view → edit-modal path (memory `feedback_no_inline_edits.md`).
- **No new context menus.** If a row-level action affordance is needed (e.g. "Acknowledge incident"), it lives inside the entity's view dialog, not as a context menu (memory `feedback_no_row_context_menus.md`).
- **Mobile-first.** Every column gets a `visibility:` decision at the time of declaration (memory `feedback_mobile_first_columns.md`).
- **No modal form refactor.** Existing inline `Modal.form` flows in batch / merge handlers stay as-is (memory `feedback_avoid_modal_form_refactor.md`).
- **Theme compliance.** Severity chip colors use Bootstrap tokens (`var(--bs-danger)` etc.), not hex literals.

### Related files

- `src/extensions/admin/incidents/IncidentTablePage.js`
- `src/extensions/admin/incidents/EventTablePage.js`
- `src/extensions/admin/storage/S3BucketTablePage.js`
- `src/extensions/admin/models/Incident.js` — possibly new `owner` field handling (frontend only — backend dep)
- `src/extensions/admin/models/AWS.js` — possibly new fields surfaced
- `test/unit/admin-tablepages-bugfixes.test.js` (or new dedicated test file)
- `CHANGELOG.md`

### Endpoints

None added or modified. Backend gaps (Incident.owner, S3Bucket.object_count etc.) are out of scope; file separately.

### Tests required

Per "Tests" above. Narrow source-level assertions; existing test suite covers underlying machinery.

### Out of scope

- **Other admin TablePages** that have column-design issues (Member permissions-count, User auth-methods chip, EmailDomain status-chip consolidation, etc.). Land as drive-bys or in a low-priority "polish backlog" request.
- **Backend additions** (Incident.owner, S3Bucket.object_count, total_size). File separately if not already on the roadmap.
- **Filter presets framework primitive itself.** Its own request.
- **Severity stripe framework primitive itself.** Its own request.
- **Removing context menus** from any of these pages (none of the three have context menus today, so not relevant here).
- **Modal form refactor** in any handler.
- **Migration to ListView** — these stay as TableView (column-grid shape is right for power-user admin work).
