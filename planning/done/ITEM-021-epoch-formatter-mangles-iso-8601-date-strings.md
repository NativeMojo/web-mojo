---
id: ITEM-021
type: bug
title: epoch formatter mangles ISO-8601 date strings
priority: P1
effort: XS
owner: core
opened: 2026-06-15
depends_on: []
related: []
links: []
---

# epoch formatter mangles ISO-8601 date strings

## What & Why
The `epoch` pipe formatter is meant to convert **epoch seconds → milliseconds** so
downstream `datetime` / `relative` formatters can parse the value
(`{{created|epoch|datetime}}`). But it uses `parseFloat()`, which is too lenient:
`parseFloat("2026-06-15T14:23:13.513746+00:00")` returns `2026` (the leading year
digits) instead of `NaN`. So when the API returns an **ISO-8601 string** rather than
an epoch number, `epoch` turns it into `2026 * 1000` and the date renders as wild
garbage.

Observed in `MemberView` — a membership `created: "2026-06-15T..."` renders as
**"Joined 03/14/2034 18:46:40 · 56 years ago"** (KPI card, "This membership" row,
and header subtitle all wrong).

This is **framework-wide**, not a MemberView bug: `epoch|datetime` / `epoch|relative`
is piped in 20+ call sites across the admin views (Member, Group, File, Device, Job,
S3 bucket, FileManager tables, etc.). Every one of them silently corrupts any field
the backend serializes as an ISO string instead of epoch seconds. Fix the formatter
once and they all heal.

The agreed fix is to **make `epoch` smart**: detect when the value is not a plain
epoch number (e.g. an ISO date string or Date) and pass it through unchanged, so the
downstream date formatter parses it via its normal `Date.parse` path. Only multiply
by 1000 when the value really is numeric epoch seconds.

## Acceptance Criteria
- [ ] `epoch` passes ISO-8601 strings (e.g. `"2026-06-15T14:23:13.513746+00:00"`)
      through **unchanged** rather than reading leading digits as a number.
- [ ] `epoch` still converts genuine epoch **seconds** (number `1718462593` or the
      numeric string `"1718462593"`) → milliseconds (`× 1000`).
- [ ] `epoch` leaves `null` / `undefined` / `''` / `Date` instances untouched as today.
- [ ] `{{model.created|epoch|datetime}}` and `{{model.created|epoch|relative}}` in
      MemberView render the correct join date/relative for an ISO `created`.
- [ ] No regression to the existing epoch-seconds call sites (file/device/job tables).
- [ ] Regression test added in `test/unit/` (fails before, passes after).

## Repro — bugs only
1. Open the admin members area and view a membership whose `created` is an ISO
   string, e.g. `"2026-06-15T14:23:13.513746+00:00"`.
2. Look at the Overview → "Joined" KPI card, the "This membership → Joined" row, and
   the header subtitle.
- Expected: Joined ~today (06/15/2026), "just now" / minutes ago.
- Actual: "03/14/2034 18:46:40 · 56 years ago" (garbage — leading `2026` of the ISO
  string was read by `parseFloat` and multiplied).

## Notes
- Root cause (confidence: **confirmed**): `src/core/utils/DataFormatter.js:48-54` —
  the `epoch` formatter does `const num = parseFloat(v); if (isNaN(num)) return v;
  return num * 1000;`. `parseFloat` parses the leading numeric run of an ISO string
  (`"2026-…"` → `2026`) so the `isNaN` guard never fires for ISO input.
- Minimal fix: replace lenient `parseFloat` with a strict numeric check. `Number(v)`
  returns `NaN` for ISO strings (so `return v` unchanged), while still parsing pure
  numeric strings/numbers. Equivalent: guard strings against a `/^\s*-?\d+(\.\d+)?\s*$/`
  test before converting; pass non-matching strings (and `Date` instances) through.
- `normalizeEpoch()` (`DataFormatter.js:730`) already recovers ISO strings correctly
  via `Date.parse`, so once `epoch` stops corrupting the value the downstream
  `datetime`/`relative` path works as-is.
- Do NOT fix this by editing the ~20 call sites (removing `epoch|`); the formatter is
  the single correct place — many call sites legitimately still receive epoch seconds
  from other endpoints.
- Affected call sites to sanity-check after the fix (non-exhaustive): MemberView,
  GroupView, FileView, FileManagerView, BouncerDeviceView, JobDetailsView,
  Member/Group/File/Bucket/Device TablePages.

## Scope Plan (agreed 2026-06-15)

**Goal:** Make the `epoch` pipe formatter format-agnostic so a value the backend may
serialize as *either* epoch seconds *or* an ISO-8601 string formats correctly — keep
`epoch|datetime` / `epoch|relative` everywhere; do **not** strip `epoch|` from any
call site.

**What exists**
- `src/core/utils/DataFormatter.js:48-54` — `epoch` formatter (the bug: `parseFloat`).
- `src/core/utils/DataFormatter.js:730-760` — `normalizeEpoch()`, already ISO-aware
  via `Date.parse` and already does seconds-vs-ms detection. This is why fixing
  `epoch` alone is sufficient: downstream `datetime`/`date`/`time`/`relative` all run
  values through `normalizeEpoch`.
- `src/utils/DataFormatter.js` — re-export shim only; real code is under `core/`.
- `test/unit/DataFormatter.test.js` — has Date/Time tests but **no** `describe('epoch')`
  block today.

**What changes (2 files)**
1. `src/core/utils/DataFormatter.js` — rewrite the `epoch` formatter to:
   - return `null`/`undefined`/`''` unchanged (as today);
   - return `Date` instances unchanged (NEW guard — required: `Number(date)` is ms and
     would be wrongly `×1000`'d; today `parseFloat(date)`→NaN passes it through, so the
     guard preserves current behavior under the stricter numeric path);
   - pass any string that is not *entirely* numeric (ISO-8601 dates, etc.) through
     untouched, via `/^\s*[+-]?\d+(\.\d+)?\s*$/`;
   - only for plain numbers / fully-numeric strings: `Number(v) * 1000` (epoch
     seconds → ms), guarded by `Number.isFinite`.
2. `test/unit/DataFormatter.test.js` — add a `describe('epoch')` block (the regression).

**Design decisions**
- Fix lives in the formatter, not the ~20 call sites — the formatter is the single
  correct seam and the backend toggle means a given field can legitimately arrive in
  either shape. This is the explicit project preference (keep `epoch`, make it smart).
- Strict regex over bare `Number(v)`: bare `Number` already fixes the reported ISO
  case, but the explicit decimal regex documents intent and avoids surprises from JS
  coercions (`Number('0x10')`→16, `Number('1e3')`→1000, `Number('  ')`→0). Anything
  ambiguous is passed through for the downstream date parser, which fails safe to `''`.
- `Date`-instance guard is mandatory to avoid a regression vs. the lenient `parseFloat`
  behavior.
- No change to `normalizeEpoch` — it already handles ISO strings and seconds/ms.

**Edge cases**
- ISO with microseconds + offset (`2026-06-15T14:23:13.513746+00:00`) → passes through →
  `Date.parse` ok. (The exact reported failure.)
- Epoch seconds as number (`1718462593`) and as numeric string (`"1718462593"`) → `×1000`.
- Epoch **ms** mistakenly piped through `epoch` → `×1000` then `normalizeEpoch` rejects
  (>1e13) — unchanged pre-existing behavior, not in scope; the contract is seconds-in.
- `Date` instance, `null`, `undefined`, `''` → unchanged.
- Non-date garbage string (`'invalid'`) → passes through → downstream yields `''`.

**Tests needed (regression in `test/unit/DataFormatter.test.js`)**
- `apply('epoch', '2026-06-15T14:23:13.513746+00:00')` returns the string unchanged
  (NOT `2026000`) — fails before, passes after.
- Full pipe `apply('2026-06-15T14:23:13.513746+00:00', ['epoch','datetime'])` renders the
  correct 2026 date (not 2034); and `['epoch','relative']` is recent, not "56 years ago".
- `apply('epoch', 1718462593)` === `1718462593000`; same for the numeric string.
- `apply('epoch', null/undefined/'')` returns the input unchanged.
- `apply('epoch', new Date(...))` returns the same Date instance.

**Docs affected**
- `docs/web-mojo/core/DataFormatter.md` — `epoch` section (~line 372): note it now passes
  ISO/date strings (and Dates) through unchanged and only converts numeric epoch seconds.
- `CHANGELOG.md` — add an `### Core · …(ITEM-021)` entry under `## Unreleased`.

**Open questions:** none — approach confirmed by the user (keep `epoch`, make it robust,
don't strip).

## Resolution
- closed: 2026-06-15
- branch: main
- files changed: CHANGELOG.md,docs/web-mojo/README.md,docs/web-mojo/admin/Admin-Dashboard-Page.md,docs/web-mojo/admin/Admin-Model-Page.md,docs/web-mojo/components/ListView.md,docs/web-mojo/components/TableView.md,docs/web-mojo/core/Model.md,docs/web-mojo/core/View.md,docs/web-mojo/forms/AutoSave.md,docs/web-mojo/forms/FormView.md,docs/web-mojo/forms/README.md,docs/web-mojo/models/BuiltinModels.md,docs/web-mojo/pages/TablePage.md,memory.md,package.json,planning/.next_id,planning/done/ITEM-016-inline-formview-autosave-rerenders-parent-view-and.md,planning/done/ITEM-017-fix-the-9-pre-existing-unit-test-failures-incident.md,planning/done/ITEM-018-write-docs-web-mojo-forms-autosave-md-dangling-lin.md,planning/done/ITEM-019-admin-full-access-permission-is-mislabeled-log-adm.md,planning/done/ITEM-020-tableview-gating-never-runs-checkpermissions-is-a-.md,src/core/Model.js,src/core/View.js,src/core/forms/FormView.js,src/core/models/Member.js,src/core/models/User.js,src/core/models/index.js,src/core/pages/TablePage.js,src/core/views/data/DataView.js,src/core/views/feedback/ModalView.js,src/core/views/list/ListView.js,src/core/views/table/TableRow.js,src/core/views/table/TableView.js,src/extensions/admin/models/index.js,src/extensions/admin/monitoring/MetricsPermissionsTablePage.js,src/extensions/admin/storage/FileManagerTablePage.js,src/templates.js,src/version.js,test/unit/FormView.autosaveSkipRender.test.js,test/unit/IncidentView.test.js,test/unit/Member.test.js,test/unit/TableView.permissionGating.test.js,test/unit/User.test.js,test/utils/simple-module-loader.js
- tests added: `test/unit/DataFormatter.test.js` — `describe('epoch')` (6 cases): ISO passthrough, `epoch|datetime` renders correct year, epoch-seconds number → ms, numeric string → ms, null/undefined/'' untouched, Date passthrough.
