---
status: open
type: request
scope: src/core/views/list
created: 2026-05-09
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
