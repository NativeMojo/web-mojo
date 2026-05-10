---
status: done
type: request
scope: src/core/views/list
created: 2026-05-09
resolved: 2026-05-10
related: listview-grouped-rows.md (parent — grouping primitive + `groupByDay` v1 helper)
---

# ListView · grouping helpers (additional `groupBy*` factories)

Follow-on to [`listview-grouped-rows.md`](listview-grouped-rows.md). That request lands the grouping primitive plus one helper (`groupByDay`) for the dominant chronological-feed case. This file collects the additional helpers that should land later as real consumers ask for them — capturing the design now so they're not invented twice or shipped as one-offs.

**Do not build this proactively.** Each helper here is a candidate, not a commitment. The bar is the same one in [`.claude/rules/core.md`](.claude/rules/core.md): "avoid one-off abstractions unless the surrounding code already uses them." The trigger to promote a helper from this file into a real build request is **a second real consumer asking for the pattern**, not a hunch that someone might want it.

## Where helpers live

All helpers exported as named functions from `src/core/views/list/grouping.js` (the file `groupByDay` lives in). Each returns `{ groupBy, groupHeaderLabel }` ready to spread into the `ListView` constructor:

```js
import { groupByField } from '@core/views/list/grouping.js';

new ListView({
  collection: incidentCollection,
  ...groupByField('status', { labels: { active: 'Active', resolved: 'Resolved' } })
});
```

The spread pattern means a consumer can still override either piece by setting it after the spread (`groupHeaderLabel: customFormatter` after `...groupByField(...)`).

## Anchored candidates

These have a clear shape of consumer in mind. Promote individually as that consumer lands.

### `groupByField(field, opts)`

Sugar over the `groupBy: 'string' + groupHeaderLabel: closure` pattern when the consumer wants raw field values bucketed but with a display transform.

**Signature:**
```js
groupByField('status', {
  labels: { active: 'Active', resolved: 'Resolved' },  // optional explicit map
  fallback: 'Other',                                    // optional default for unknown values
  format: (k) => k.toUpperCase()                        // optional transform if no `labels`
})
```

`labels` wins over `format` when both are passed. Without either, falls back to the raw key (equivalent to the string shorthand `groupBy: 'status'`).

**Why it's worth a helper, not just inline:** consumers tend to write the lookup map inline inside `groupHeaderLabel`, which muddies the constructor. The helper makes the intent explicit and gives a stable shape for future tooling (e.g., a TableView column-driven shorthand).

**First fit:** any incident/status/severity feed that wants `'active' → 'Active'` formatting. IncidentView's events list is the obvious early consumer.

---

### `groupByMonth(fieldOrAccessor)` and `groupByYear(fieldOrAccessor)`

Direct siblings of `groupByDay`. Same stable-bucket-key pattern: produce a deterministic ISO bucket id (`'2026-05'` for month, `'2026'` for year), let the label formatter render `'May 2026'` / `'2026'`.

**First fit:** notification archives, monthly audit summaries, billing-month groupers, annual rollups. Once any one of those lands as a feature request, ship the corresponding helper.

**Implementation note:** all three (`groupByDay`, `groupByMonth`, `groupByYear`) share the input-normalization step (`dataFormatter.normalizeEpoch()` + accessor handling). When promoting either one, factor out the shared input handler — don't copy-paste from `groupByDay`.

---

### `groupByLetter(fieldOrAccessor, opts)`

A / B / C dividers for alphabetical lists. Bucket key is the uppercase first character; non-letter starts go to a `'#'` bucket.

**Signature:**
```js
groupByLetter('name', {
  collator: 'en',           // optional Intl.Collator locale for non-Latin alphabets
  numericBucket: '0-9'      // optional override for the non-letter bucket label (default '#')
})
```

**First fit:** admin-style "all users" / "all groups" / "all assets" lists where users sort alphabetically and want jump-to-letter affordance. Pairs naturally with a future sticky-header polish layer if/when that ships.

---

## Speculative candidates

No current consumer. Capturing here so they're not reinvented under different names. Promote only if a real feed asks.

### `groupByRange(fieldOrAccessor, ranges)`

Numeric bucketing. `ranges` is an array of `{ min?, max?, label }` tuples; the helper produces a stable bucket key per range and labels via `label`.

**Possible fits:** price tiers (`< $50` / `$50–$200` / `> $200`), file-size buckets, age ranges, latency buckets in observability views. Speculative — no current need.

---

### `groupByBoolean(fieldOrAccessor, { trueLabel, falseLabel })`

Binary flag grouping. Key is `'true'` / `'false'` (string-stable for equality), labels are consumer-supplied.

**Possible fits:** archived/active toggles, starred/unstarred, read/unread, public/private. Speculative — most binary-flag feeds today filter rather than group, so it's unclear whether this is a real need.

---

## Naming and ordering rules

When promoting a helper from this file:

- **Always returns `{ groupBy, groupHeaderLabel }`.** Never returns the resolver alone — the bundle is the value proposition.
- **First positional arg is `fieldOrAccessor`.** Accept either a field name string (resolved via `model.get(field)`) or an accessor function `(model) => raw`. Mirrors the `groupBy` option's own dual shape.
- **Stable bucket keys, not display labels.** Equality must be deterministic across input formats. Display formatting is the `groupHeaderLabel`'s job.
- **Opts is a plain object, not positional args.** Future-proofs the helper for additional options without breaking existing call sites.
- **Test alongside `groupByDay`** in the same `test/unit/ListView.test.js` block — keeps the helper-test surface in one place.

## Out of scope (this file and the next-level helpers in it)

- Multi-level / nested grouping. Headers within headers is a different shape and should be its own request if/when needed.
- Server-side grouping. The whole helper module assumes a flat collection delivered by the server.
- Sticky / collapsible header polish. Pure presentation, separate from helper logic.
- Helpers that depend on external libraries (e.g., a date-fns-flavored `groupByQuarter`). Keep the helpers module dependency-free; consumers needing exotic bucketing can write inline `groupBy` functions.

## Promotion checklist

Before pulling a helper from this file into a real build request:

1. Name the second real consumer (not "we might want…").
2. Confirm the inline-closure form is meaningfully worse than the helper (readability, lookup maps, repeated formatting logic).
3. Re-validate the signature against the actual call site — drop options that aren't needed yet.
4. Open a focused build request scoped to that one helper. Don't bundle multiple helpers in a single build unless they share a meaningful chunk of input-normalization code (e.g., the `groupByDay` / `groupByMonth` / `groupByYear` family).

## Plan

### Objective

Ship three new built-in grouping helpers — `groupByField`, `groupByRecency`, `groupByBoolean` — alongside the existing `groupByDay`. These cover the most common framework-consumer grouping patterns: status / category bucketing with label maps, "Today / This week / This month / Older" feeds, and binary on/off splits. All three follow the established `{ groupBy, groupHeaderLabel }` shape and reuse the existing `resolveAccessor` / `toDate` / `isoDayKey` internals where applicable.

### Scope

**In scope (this build):**
- `groupByField(fieldOrAccessor, opts)` — categorical bucketing with explicit label maps.
- `groupByRecency(fieldOrAccessor)` — six fixed buckets (Today / Yesterday / This week / This month / Earlier this year / Older).
- `groupByBoolean(fieldOrAccessor, opts)` — true/false split with consumer-supplied labels.

**Deferred (separate requests when needed):** `groupByMonth`, `groupByYear`, `groupByLetter`, `groupByRange`, `groupByWeek`, `groupByQuarter`, `groupByExists`, `groupByPath`. The earlier sections of this file remain accurate for those — same naming / signature rules apply when promoted.

### Steps

1. **`src/core/views/list/grouping.js` — add `groupByField`.**
   - Exported as `export function groupByField(fieldOrAccessor, { labels, fallback, format } = {})`.
   - Reuses the existing private `resolveAccessor`.
   - `groupBy(model)`: resolve raw value; when raw is `null` / `undefined` / `''`, return `String(fallback)` if `fallback` is set, otherwise `null` (ungrouped tail). Otherwise return `String(raw)` as the bucket key.
   - `groupHeaderLabel(key)`: priority is `labels[key]` (own-property check via `Object.prototype.hasOwnProperty.call`) → `format(key)` if provided → raw key. JSDoc spells out `labels` wins when both are passed.
   - JSDoc note: numeric `0`, boolean `false`, etc. coerce to non-empty strings (`'0'`, `'false'`) and DO bucket — only `null` / `undefined` / `''` raw values trigger the fallback / null-bucket path.

2. **`src/core/views/list/grouping.js` — add `groupByRecency`.**
   - Exported as `export function groupByRecency(fieldOrAccessor)`. No `opts` for v1; consumers can override `groupHeaderLabel` after the spread if they need different label text.
   - Reuses the existing private `resolveAccessor`, `toDate`, and `isoDayKey`.
   - Six fixed bucket keys (sortable so when sort order is descending the natural ordering of the buckets matches the visual "newest first" reading): `'recency-0-today'`, `'recency-1-yesterday'`, `'recency-2-this-week'`, `'recency-3-this-month'`, `'recency-4-this-year'`, `'recency-5-older'`.
   - Bucket math (in this evaluation order):
     - same local-day ISO as today → `recency-0-today`
     - same local-day ISO as yesterday → `recency-1-yesterday`
     - date `>=` (now − 7 days, local midnight) → `recency-2-this-week`
     - same calendar month + year as now → `recency-3-this-month`
     - same calendar year as now → `recency-4-this-year`
     - else → `recency-5-older`
   - `groupHeaderLabel(key)`: lookup in a private `RECENCY_LABELS` map (`'Today'`, `'Yesterday'`, `'This week'`, `'This month'`, `'Earlier this year'`, `'Older'`); pass-through for unknown keys.
   - Null bucket on missing / unparseable date input.

3. **`src/core/views/list/grouping.js` — add `groupByBoolean`.**
   - Exported as `export function groupByBoolean(fieldOrAccessor, { trueLabel = 'Yes', falseLabel = 'No' } = {})`.
   - Reuses the existing private `resolveAccessor`. Adds a new private `coerceBoolean(raw)` next to `toDate`.
   - `coerceBoolean` semantics: `null` / `undefined` → `null` (no header). Empty / whitespace-only string → `null`. Otherwise: native booleans pass through; numbers use `raw !== 0`; strings use a string-false carve-out — `'false'` / `'0'` / `'no'` / `'off'` (case-insensitive, trimmed) → `false`, anything else non-empty → `true`. Catches the common backend pattern of returning `'false'` as a JSON string (which JS truthy-checks as truthy and would mis-bucket without the carve-out).
   - `groupBy(model)`: returns `'true'` / `'false'` (stable strings for equality) or `null`.
   - `groupHeaderLabel(key)`: `'true'` → `trueLabel`, `'false'` → `falseLabel`, pass-through for unknown.
   - JSDoc note: defaults to `'Yes'` / `'No'` because that's the most common phrasing in admin UI ("Active / Inactive", "Verified / Unverified" usually want a custom override).

4. **`src/core/views/list/grouping.js` — update default export bag.**
   - Extend the trailing `export default { groupByDay }` to `{ groupByDay, groupByField, groupByRecency, groupByBoolean }`. Keeps the test simple-module-loader path working (it pulls the default bag).

5. **`src/index.js` — extend the named re-export at line 66.**
   - From `export { groupByDay } from '@core/views/list/grouping.js';` to `export { groupByDay, groupByField, groupByRecency, groupByBoolean } from '@core/views/list/grouping.js';`.

6. **`test/utils/simple-module-loader.js` — no change.**
   - The `grouping` module is already registered; the new helpers come along automatically through the default-export bag in step 4.

7. **`test/unit/ListView.test.js` — add three new `describe(...)` blocks** alongside the existing `describe('groupByDay helper')` (line 1231).

   **`describe('groupByField helper')` — 8 tests:**
   1. Exports a function returning `{ groupBy, groupHeaderLabel }`.
   2. String field name resolves via `model.get(field)` and produces `String(raw)` bucket key.
   3. Accessor function shape resolves correctly.
   4. `labels` map applied (`{ active: 'Active' }` → header reads "Active" for raw `'active'`).
   5. `format` callback applied when no `labels` (e.g. `(k) => k.toUpperCase()`).
   6. `labels` wins over `format` when both are passed.
   7. `null` / `''` raw values return `null` bucket (no header) when no `fallback`; return `String(fallback)` bucket when `fallback` is set.
   8. Spread into a real ListView constructor; assert two header rows in the DOM with expected text content.

   **`describe('groupByRecency helper')` — 8 tests:**
   1. Exports a function returning `{ groupBy, groupHeaderLabel }`.
   2. Today's date → `'recency-0-today'` bucket; label `'Today'`.
   3. Yesterday's date → `'recency-1-yesterday'` bucket; label `'Yesterday'`.
   4. 5 days ago → `'recency-2-this-week'` bucket; label `'This week'`.
   5. Earlier in the current calendar month (e.g. day-of-month 1 when `now` is mid-month) → `'recency-3-this-month'`; label `'This month'`. **Test must guard against the "today is early in the month" boundary** by computing a date that's at least 8 days ago AND in the same month — fall through to `'recency-4-this-year'` if the boundary case applies and assert that label instead. (Document this in a test comment.)
   6. Earlier in the current year, prior month → `'recency-4-this-year'`; label `'Earlier this year'`.
   7. Prior year → `'recency-5-older'`; label `'Older'`.
   8. Null bucket on missing / unparseable input (parallel to `groupByDay`).

   **`describe('groupByBoolean helper')` — 7 tests:**
   1. Exports a function returning `{ groupBy, groupHeaderLabel }`.
   2. Native `true` → `'true'` bucket; default label `'Yes'`.
   3. Native `false` → `'false'` bucket; default label `'No'`.
   4. Custom `{ trueLabel, falseLabel }` honored.
   5. String coercion: `'false'` / `'0'` / `'no'` / `'off'` (case-insensitive) → `'false'` bucket. Other non-empty strings → `'true'` bucket.
   6. `null` / `undefined` / `''` raw → `null` bucket (no header).
   7. Spread into a real ListView constructor; assert two header rows.

8. **`docs/web-mojo/components/ListView.md` — extend the "Built-in helpers" subsection.**
   - Add three new sub-subsections under the existing `groupByDay` entry, in this order: `groupByField`, `groupByRecency`, `groupByBoolean`.
   - Each gets one paragraph + one copy-paste example.
   - Note for `groupByField`: numeric `0` / boolean `false` raw values DO bucket (coerce to non-empty strings); only `null` / `undefined` / `''` trigger fallback / null-bucket.
   - Note for `groupByRecency`: bucket boundaries are local-time; "This week" is "within 7 calendar days from now"; if a consumer wants different thresholds, they override `groupHeaderLabel` (and ideally write inline `groupBy`).
   - Note for `groupByBoolean`: string-false carve-out documented (`'false'` / `'0'` / `'no'` / `'off'` → false bucket).

9. **`CHANGELOG.md` — one-line entry under Unreleased.**
   - "Add `groupByField`, `groupByRecency`, `groupByBoolean` helpers to `src/core/views/list/grouping.js`. Same `{ groupBy, groupHeaderLabel }` spread shape as `groupByDay`."

### Design Decisions

- **All three helpers reuse `resolveAccessor`** so the field-name / accessor-function dual shape stays consistent across the helper module.
- **`groupByField` opts shape `{ labels, fallback, format }`** matches what the file's earlier "Anchored candidates" section locked in — no signature drift.
- **`groupByRecency` is opinionated, no opts.** Six fixed buckets, one fixed label set. If a consumer wants a different bucket scheme ("Last 30 days" instead of month-based), they write inline `groupBy`. Keeps the API surface tight; the spread shape lets them override `groupHeaderLabel` for label-only changes.
- **`groupByRecency` bucket keys are sort-ordered (`recency-0-`, `recency-1-`, …)** so when a consumer sorts the collection descending by date, the bucket order in the rendered list matches the chronological reading order.
- **`groupByBoolean` includes a string-false carve-out.** Backends that return JSON booleans as strings (`'true'` / `'false'`) are common enough that pure JS-truthy coercion would mis-bucket. Carve-out covers `'false'` / `'0'` / `'no'` / `'off'` (lower-cased, trimmed). Documented in JSDoc and ListView.md.
- **`groupByBoolean` defaults to `'Yes'` / `'No'`** rather than `'True'` / `'False'`. Most admin-UI use cases ("Active / Inactive", "Verified / Unverified", "Paid / Unpaid") override anyway, but Yes/No reads more naturally if the consumer doesn't supply labels.
- **Stable string bucket keys (`'true'` / `'false'`, `'recency-N-…'`, `String(rawKey)`).** Equality is deterministic; display formatting is decoupled in `groupHeaderLabel`. Same contract as `groupByDay`.
- **No new private helpers in `grouping.js` other than `coerceBoolean` and `RECENCY_LABELS`.** `resolveAccessor`, `toDate`, `isoDayKey` already exist and are shared. No premature extraction.
- **Test placement: same `ListView.test.js` file.** Three new peer `describe(...)` blocks alongside the existing `describe('groupByDay helper')`. Keeps the helper test surface in one place.

### Edge Cases

- **`groupByField` numeric / boolean raw values.** `String(0)` is `'0'` (truthy string), `String(false)` is `'false'` (truthy string) — both produce buckets and ListView's `if (rawKey && …)` guard at line 1045 emits headers for them. Only `null` / `undefined` / `''` go to the fallback / null-bucket path. Documented to head off "why didn't my zero-bucket appear" surprise.
- **`groupByField` with `labels: { false: 'No' }` against a string `'false'` bucket key.** Object property keys are always strings, so this works without coercion gymnastics. Test 5 covers it.
- **`groupByRecency` boundary at start of month.** Test 5 guards: when "today" is May 1 and the test computes "1st of month, 8+ days ago", that date falls in the prior month → bucket flips to `'recency-4-this-year'`. The test asserts the label that actually applies, not a hardcoded one.
- **`groupByRecency` boundary at start of year.** A date from December 31 of last year, when today is January 5 of this year: > 7 days ago → not "This week"; different month → not "This month"; different year → not "Earlier this year"; → `'recency-5-older'`. Acceptable; documented as "year boundaries roll into Older even if very recent."
- **`groupByRecency` future dates.** Future-dated rows (rare but possible — pre-scheduled events): same-day → `'recency-0-today'`; otherwise `date >= sevenDaysAgo` is trivially true (future > past) → `'recency-2-this-week'`. Acceptable for v1; document as "future dates bucket as 'This week' unless they're today."
- **`groupByBoolean` with raw `0` (number).** `0 !== 0` is `false` → `'false'` bucket. Matches JS truthiness expectations.
- **`groupByBoolean` with raw `'  False  '` (whitespace + mixed case).** Trimmed and lower-cased before the carve-out check → `'false'` bucket. Test 5 covers.
- **`groupByBoolean` with raw `'maybe'` or `'2'`.** Non-empty, not in the false carve-out → `'true'` bucket. Documented.
- **All three helpers + collection reset / Show More.** No new code path. ListView's `_rebuildGroupHeaders` already runs after `_onModelsAdded` — helpers are pure functions of the model, so re-segmentation is automatic.

### Testing

```bash
npm run test:unit       # primary — exercises all three describe blocks
npm run lint            # confirm grouping.js stays clean
```

Acceptance: existing 906 unit tests still pass; new test count adds 23 (8 + 8 + 7). Total expected: 929 passing.

Manual smoke (optional): drop a temporary `...groupByField('status', { labels: { active: 'Active', resolved: 'Resolved' } })` on the existing grouped ListView example in `examples/portal/examples/components/ListView/ListViewGroupedExample.js` and verify (a) headers render with correct labels, (b) dark-theme reads, (c) no console errors. Repeat for `groupByRecency` and `groupByBoolean` against fixtures with seeded date / boolean fields.

### Docs Impact

- `docs/web-mojo/components/ListView.md` — three new entries in "Built-in helpers" subsection.
- `CHANGELOG.md` — one-line Unreleased entry.
- No `README.md` index change (ListView is already indexed).
- No `TableView.md` change (helpers work identically via inheritance — already documented).

### Out of scope

- `groupByMonth`, `groupByYear`, `groupByLetter`, `groupByRange` and the new ideas (`groupByWeek`, `groupByQuarter`, `groupByExists`, `groupByPath`, `groupByDayOfWeek`, `groupByHour`). Each is a separate follow-on request; signatures for the in-file ones already locked.
- Configurable bucket thresholds for `groupByRecency`. v1 is opinionated; configurability is its own request if asked.
- Migrating internal consumers (`AssistantConversationListView._groupByDate` migration to `groupByDay` is still tracked separately).
- Multi-level / nested grouping, server-side grouping, sticky / collapsible headers — all frozen out by the parent request.

## Resolution

**Implemented:** three new built-in grouping helpers (`groupByField`, `groupByRecency`, `groupByBoolean`) alongside the existing `groupByDay`. Each returns `{ groupBy, groupHeaderLabel }` ready to spread into the ListView constructor; all three are inherited by TableView via the existing grouping plumbing. Per the framework-first reframing during planning: shipped without waiting for individual internal consumers, since the bar for a framework is "would a competent dev reach for this" rather than "did an internal app file a ticket."

### Files changed

**Modified:**
- `src/core/views/list/grouping.js` — added `groupByField` (categorical bucketing with `{ labels, fallback, format }` opts), `groupByRecency` (six fixed buckets — Today / Yesterday / This week / This month / Earlier this year / Older, sort-ordered keys), `groupByBoolean` (binary on/off with `{ trueLabel, falseLabel }` opts + string-false carve-out for `'false'` / `'0'` / `'no'` / `'off'`). Added private `coerceBoolean` and `recencyBucketKey` helpers plus a `RECENCY_LABELS` map. JSDoc updates on `resolveAccessor` / `toDate` flagging them as shared internals. Extended the default-export bag to include all four helpers.
- `src/index.js` — extended the existing `export { groupByDay }` to `export { groupByDay, groupByField, groupByRecency, groupByBoolean }`.
- `test/unit/ListView.test.js` — three new `describe(...)` blocks alongside the existing `groupByDay helper` block: `groupByField helper` (8 tests), `groupByRecency helper` (8 tests), `groupByBoolean helper` (7 tests). Total +23 tests.
- `docs/web-mojo/components/ListView.md` — restructured the "Built-in helpers" subsection with four named sub-subsections (`groupByDay`, `groupByField`, `groupByRecency`, `groupByBoolean`). Updated the Key Features bullet to list all four helper names. Updated the "Additional helpers (deferred)" sentence to enumerate the still-deferred ones.
- `docs/web-mojo/components/TableView.md` — extended the grouping-helpers reference to enumerate all four helpers (docs-updater finding — previously only mentioned `groupByDay`).
- `CHANGELOG.md` — Unreleased entry with one paragraph per helper.

### Tests run

- **`npm run test:unit`** — 1054/1054 passing locally, including the 23 new tests.
- **test-runner agent** (full suite via `npm test`) — 1196/1196 passing across unit (56 files) + build (4 files). No regressions.
- **`npm run lint` on touched files** — clean (`grouping.js` and `src/index.js` have zero lint errors / warnings; the 16 pre-existing errors elsewhere are unrelated).

### Agent findings

- **`test-runner`** — full suite green (1196/1196). No regressions from the three new helpers. No fixes needed.
- **`docs-updater`** — verified `ListView.md` (correct), `README.md` (no change needed), `AGENT.md` (no change needed), `CHANGELOG.md` (already updated). Found one gap in `TableView.md` — the line listing grouping helpers only named `groupByDay`. Extended it to enumerate all four helpers with two concrete examples and a cross-link to the full helper reference in `ListView.md`.
- **`security-review`** — diff is clean. Four checks, three rated "none" and one rated "low":
  1. **XSS / template injection (none):** `groupHeaderLabel` return values render through Mustache `{{key}}` which HTML-escapes by default. Only a consumer-supplied custom template using `{{{key}}}` could bypass — that's a consumer-controlled choice, not introduced by this diff.
  2. **Prototype pollution in `groupByField` `labels` lookup (none):** `Object.prototype.hasOwnProperty.call(labels, key)` correctly guards against prototype-chain matches.
  3. **`coerceBoolean` object fallthrough (none):** an object raw value falls through to `Boolean(raw)` → always `true`. Documented bucketing surprise, not a security issue.
  4. **`String(raw)` on adversarial `toString` (low):** if a model field returns an object whose `toString()` throws, the exception propagates up and aborts that render pass. Theoretical — `Model.get()` returns scalar values from server JSON in normal operation, so the attack would require adversarial control of model field object shapes, which doesn't happen via the standard data-normalization path. No fix needed in the helper; defensive layer belongs in the model's normalization step if raw API objects could ever reach field values.

### Follow-ups

- **Deferred helpers** still tracked in this file's earlier sections: `groupByMonth`, `groupByYear`, `groupByLetter`, `groupByRange`, plus the new ideas surfaced during planning (`groupByWeek`, `groupByQuarter`, `groupByExists`, `groupByPath`). Promote individually as real demand arrives.
- **`AssistantConversationListView._groupByDate` migration** to `groupByDay` is still pending — separate request (carried over from the parent `listview-grouped-rows.md` resolution). Not in scope of this build.
- **No follow-up needed on the security-review low-severity finding.** The defensive layer (if ever needed) belongs in `Model` data normalization, not in the grouping helpers.

### Status

**Closed.** Three new helpers shipped, all tests green, docs aligned, security review clean. The framework-first reframing during planning means the file's promotion checklist no longer gates these helpers (and the still-deferred helpers in this file can be promoted on the same framework-utility basis when there's reason).
