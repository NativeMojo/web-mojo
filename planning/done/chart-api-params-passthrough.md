# Chart `apiParams` Passthrough

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
| Date | 2026-05-07 |
| Priority | medium |

## Description

Add an `apiParams` constructor option (and matching `setApiParams()` runtime setter) to `MetricsChart` and `MetricsMiniChart` so callers can attach arbitrary query-string params to the `/api/metrics/fetch` request without us hard-coding a new constructor field every time. `MetricsMiniChartWidget` forwards the option to its inner chart. The hardcoded options (`granularity`, `account`, `slugs`, `category`, `dr_start` / `dr_end`, `with_labels`, `with_delta`, `child_kind`, `breakdown`) always win over anything in `apiParams` — `apiParams` is a base layer for unknown / forward-compatible keys.

## Context

`buildApiParams()` on both chart components currently emits a fixed set of params — anything else needs a code change to pass through. As the metrics endpoint grows (or callers want to attach feature-flag-style filters, A/B-bucket markers, debug toggles, future pagination knobs, etc.), every new server-side param is a round-trip back into the framework. An `apiParams` escape hatch keeps the framework forward-compatible without forcing a release for every new backend knob.

The recently-added `childKind` / `breakdown` options were a textbook example: a backend feature shipped, then we did a framework release to expose two new constructor fields. With `apiParams` callers could have used the new params from day one (`apiParams: { child_kind: 'location', breakdown: true }`) and we'd have promoted them to first-class options later, on our own schedule.

## Acceptance Criteria

- [ ] `MetricsChart` accepts `apiParams: object` constructor option. Defaults to `{}`.
- [ ] `MetricsMiniChart` accepts the same `apiParams: object` option.
- [ ] `MetricsMiniChartWidget` passes `apiParams` through to its inner `MetricsMiniChart` via `chartOptions` (same one-line pattern used for `childKind`).
- [ ] `buildApiParams()` on both chart components spreads `this.apiParams` first, then layers the hardcoded params on top. Hardcoded keys win; the cache-buster `_` is still applied last.
- [ ] `MetricsChart.setApiParams(next)` and `MetricsMiniChart.setApiParams(next)` runtime setters that replace (not merge) the field and trigger `fetchData()`. Callers wanting a merge do `chart.setApiParams({ ...chart.apiParams, key: value })` explicitly.
- [ ] `getStats()` on `MetricsChart` includes `apiParams` in its output (mirroring how `childKind` / `breakdown` are reported).
- [ ] Docs updated:
  - `docs/web-mojo/extensions/Charts.md` — option entry + a short "Forward-compatible params" subsection that explains the precedence rule and the trust boundary (developer-controlled, not user-controlled).
  - `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — option entry under "Chart (forwarded to MetricsMiniChart)".
- [ ] `CHANGELOG.md` — release-facing entry.
- [ ] Tests cover precedence, setter, pass-through, and that omitted/empty `apiParams` is byte-identical to today's output.

## Investigation

### What exists

- `MetricsChart.buildApiParams` (MetricsChart.js:598-622) constructs a fresh `params` object, populates it from `this.granularity` / `this.account` / etc. with `if (this.X)` gates, and stamps `params._ = Date.now();` last.
- `MetricsMiniChart.buildApiParams` (MetricsMiniChart.js:52-87) follows the same pattern with the same hardcoded keys + the `_` stamp.
- `MetricsMiniChartWidget` (MetricsMiniChartWidget.js:95-135) builds a `chartOptions` block that fan-outs every chart-relevant constructor option to the inner `MetricsMiniChart` — same pattern we used to add `childKind` last cycle (one-line addition).
- The pattern of "spread base, layer overrides" is already used elsewhere in the codebase (e.g. `KPIStrip.refresh` REST tile params at `KPIStrip.js:173`: `const params = { ...(spec.rest.params || {}), _: Date.now() };`), so the precedence rule is consistent with the rest of the framework.

### What changes

| File | Change |
|---|---|
| `src/extensions/charts/MetricsChart.js` | Constructor reads `this.apiParams = options.apiParams || {};`. `buildApiParams` starts with `const params = { ...this.apiParams };` then applies the existing hardcoded population. `_` cache-buster still last. New `setApiParams(next)` setter. `getStats()` exposes `apiParams`. |
| `src/extensions/charts/MetricsMiniChart.js` | Same constructor + `buildApiParams` change + `setApiParams` setter. |
| `src/extensions/charts/MetricsMiniChartWidget.js` | One-line `apiParams: options.apiParams` in the `chartOptions` block. |
| `docs/web-mojo/extensions/Charts.md` | Option entry under MetricsChart "Additional options" table + a short "Forward-compatible params" subsection. |
| `docs/web-mojo/extensions/MetricsMiniChartWidget.md` | Option entry under "Chart (forwarded to MetricsMiniChart)". |
| `CHANGELOG.md` | Release entry. |
| `test/unit/MetricsChart.test.js` | Precedence + empty + setter tests. |
| `test/unit/MetricsMiniChartWidget.test.js` | Pass-through test (mirrors the `childKind` pattern added last cycle). |

### Constraints

- **Hardcoded wins.** The whole point is to support unknown / future-compatible keys without letting `apiParams` accidentally clobber framework-managed behavior. Document the rule once; don't try to be clever about per-key precedence.
- **`_` cache-buster wins absolutely.** Even if a caller passes `apiParams: { _: 'foo' }`, the hardcoded `_ = Date.now()` overwrites it (it's stamped last today, and the new pattern preserves that).
- **Trust boundary: developer-controlled, not user-controlled.** Mirror the trust note already on the `title:` option (MetricsChart.js:30-33). `apiParams` flows straight to the URL — never feed user input through it without sanitizing first. Callers passing user-typed values must sanitize at the call site.
- **No client-side validation of unknown keys.** Don't enumerate "known" backend params and warn on misspellings. The backend ignores unknowns or returns 400, which surfaces in the existing error overlay. The whole point is to *not* know about them in the framework.
- **Empty / omitted is a no-op.** `apiParams: {}` (the default) must produce identical query strings to today — protects every existing caller.
- **REST API convention:** standard `/api/metrics/fetch` endpoint, no admin variant.

### Related files

- `src/extensions/charts/MetricsChart.js`
- `src/extensions/charts/MetricsMiniChart.js`
- `src/extensions/charts/MetricsMiniChartWidget.js`
- `src/core/Rest.js` — `buildQueryString` URL-encodes via `URLSearchParams` (confirmed in the prior fan-out security review), so values containing `&` / `?` / `=` can't smuggle extra params. No change needed here, but worth knowing for the docs trust-boundary note.
- `docs/web-mojo/extensions/Charts.md`
- `docs/web-mojo/extensions/MetricsMiniChartWidget.md`
- `test/unit/MetricsChart.test.js`
- `test/unit/MetricsMiniChartWidget.test.js`

### Endpoints

No new endpoints. Existing `/api/metrics/fetch` (and `/api/metrics/series` when `withDelta=true`) gain whatever client-emitted params the caller sets.

### Tests required

- `MetricsChart.buildApiParams` empty regression: omitting `apiParams` produces identical output to today (no `apiParams` key, no extra params leaked). Critical — protects every existing caller.
- `MetricsChart.buildApiParams` precedence: `apiParams: { granularity: 'minutes', foo: 'bar' }` with constructor `granularity: 'days'` → `params.granularity === 'days'`, `params.foo === 'bar'`.
- `MetricsChart.buildApiParams` `_` precedence: `apiParams: { _: 'forever' }` → `typeof params._ === 'number'` (Date.now wins).
- `MetricsChart.setApiParams` triggers `fetchData()` and replaces (not merges) the field.
- `getStats()` includes `apiParams`.
- `MetricsMiniChart.buildApiParams` precedence — single mirror of the MetricsChart precedence test.
- `MetricsMiniChartWidget` propagates `apiParams` through `chartOptions` (mirrors the `childKind` pass-through test).

### Out of scope

- **`KPIStrip` `apiParams`** — the strip builds two parameter blocks (series + sparkline) and the use case is different. Defer until requested. Single-component changes are easier to review.
- **Per-request `apiParams`** — e.g. `chart.fetchData({ apiParams: { … } })` for one-off overrides without mutating the instance. Not asked for; nobody's hit the limitation. Lean YAGNI.
- **Param-transform callback** — e.g. `paramsTransform: (params) => params` for callers who need to compute something at fetch time. Overkill for a passthrough escape hatch; revisit if a real use case appears.
- **Validation / lint of unknown keys** — the framework intentionally doesn't know about them. Misspellings surface as backend 400s in the error overlay, same as today.
- **Migrating `child_kind` / `breakdown` to live inside `apiParams`** — they're first-class now, leave them. `apiParams` complements them; it doesn't replace them. (A future major version could collapse the surface, but that's its own conversation.)

---

## Plan

### Objective

Add `apiParams: object` to `MetricsChart` and `MetricsMiniChart` (with passthrough on `MetricsMiniChartWidget`) so callers can attach arbitrary query params to `/api/metrics/fetch` without us promoting every new backend knob to a first-class constructor option. Hardcoded options always win over `apiParams`; the `_` cache-buster wins absolutely. A `setApiParams(next)` setter mirrors the other runtime setters.

### Steps

1. **`src/extensions/charts/MetricsChart.js`**
   - Constructor (after the new fan-out fields at MetricsChart.js:65-78): read `this.apiParams = options.apiParams || {};`. Add a one-line trust-boundary comment matching the `title:` pattern at MetricsChart.js:30-33 — "⚠️ developer-controlled. Do not feed user input through this; values land directly in the URL."
   - `buildApiParams` (MetricsChart.js:598): change the opening line from `const params = { ... };` to `const params = { ...this.apiParams };` and continue populating with the existing `granularity`, `account`, `with_labels` literals, then the existing `if (...)` blocks. The `_` cache-buster stays last. Hardcoded keys overwrite anything in `apiParams`.
   - Public API: add `setApiParams(next)` next to `setBreakdown` (MetricsChart.js:813). Body: `this.apiParams = next || {}; return this.fetchData();` — replaces (not merges); callers wanting a merge do `chart.setApiParams({ ...chart.apiParams, key: value })`.
   - `getStats()` (MetricsChart.js:822): add `apiParams: { ...this.apiParams }` to the returned object — defensive copy.

2. **`src/extensions/charts/MetricsMiniChart.js`**
   - Constructor (after MetricsMiniChart.js:21 — the new `childKind` line): read `this.apiParams = options.apiParams || {};` with the same trust-boundary comment.
   - `buildApiParams` (MetricsMiniChart.js:55): change the opening to `const params = { ...this.apiParams, granularity: this.granularity, account: this.account, with_labels: true };`. Existing `if (...)` blocks remain. `_` stamped last (unchanged).
   - Add `setApiParams(next)` setter next to the new `setChildKind` (MetricsMiniChart.js:225).

3. **`src/extensions/charts/MetricsMiniChartWidget.js`**
   - One-line addition to `chartOptions` (MetricsMiniChartWidget.js:95-135), right after the new `childKind` line: `apiParams: options.apiParams`. Mirrors the `childKind` passthrough exactly.

4. **`test/unit/MetricsChart.test.js`** — extend with a new `describe('MetricsChart — apiParams passthrough', ...)` block:
   - **Empty regression** (most important): omitting `apiParams` produces a `params` object with keys identical to today.
   - **Forward-compatible passthrough**: `apiParams: { foo: 'bar', region: 'us-east' }` → both keys present.
   - **Hardcoded wins**: `apiParams: { granularity: 'minutes', account: 'public' }` with constructor `granularity: 'days'`, `account: 'group-1'` → constructor values win.
   - **Cache-buster wins absolutely**: `apiParams: { _: 'forever' }` → `typeof params._ === 'number'`.
   - **`setApiParams` triggers fetchData and replaces (not merges)**: spy on `fetchData`, set `apiParams: { a: 1 }`, call `setApiParams({ b: 2 })`, assert chart has `b` only, fetchData called once.
   - **`getStats` exposes `apiParams` as a defensive copy**: mutating the returned object doesn't change `chart.apiParams`.

5. **`test/unit/MetricsMiniChartWidget.test.js`** — extend:
   - **`MetricsMiniChart` precedence**: hardcoded-wins mirror.
   - **`MetricsMiniChart` empty regression**: omitting `apiParams` yields no extra keys.
   - **`MetricsMiniChartWidget` propagation**: `apiParams` round-trips through `chartOptions` (mirror of the `childKind` propagation test).

6. **`docs/web-mojo/extensions/Charts.md`** — add `apiParams` to the MetricsChart "Additional options" table (around Charts.md:343-346). Insert a "Forward-compatible params (`apiParams`)" subsection after the "Group fan-out" subsection: explain precedence rule, give a constructor + `setApiParams` example, and surface the trust-boundary note (developer-controlled, not user-controlled — same as `title:`).

7. **`docs/web-mojo/extensions/MetricsMiniChartWidget.md`** — add an `apiParams` option entry under "Chart (forwarded to MetricsMiniChart)" (around MetricsMiniChartWidget.md:271, next to `childKind`) with a one-line pointer to the Charts.md "Forward-compatible params" subsection.

8. **`CHANGELOG.md`** — single Unreleased entry under `### Charts — apiParams passthrough`.

### Design Decisions

- **Spread-then-overlay precedence** matches the existing `KPIStrip.refresh` pattern (KPIStrip.js:173: `const params = { ...(spec.rest.params || {}), _: Date.now() };`). One rule, applies to every key, no per-key overrides.
- **`setApiParams(next)` replaces, doesn't merge.** Mirrors `setMetrics(slugs)` which also replaces (`this.slugs = [...slugs]`). Callers who want a merge do it explicitly.
- **`getStats()` returns a defensive copy** (`{ ...this.apiParams }`). Stats is a read-only view of chart state today; the new field follows the same contract.
- **Trust boundary documented at the option site, not just in docs.** A `// ⚠️` comment matching the `title:` precedent at MetricsChart.js:30-33 puts the warning where future maintainers will see it before reaching for `apiParams` to plumb user input.
- **No client-side validation of unknown keys.** The whole point is forward-compatibility — knowing about backend params would defeat the purpose. Misspellings surface as backend 400s in the existing error overlay.
- **`childKind` / `breakdown` stay first-class.** Two reasons: (1) public-API stability — the request explicitly leaves them alone — and (2) `breakdown` has runtime semantics inside the chart (`processMetricsData` no-recase branch), not just URL semantics. `apiParams` is purely a URL concern.
- **`KPIStrip` deferred.** Two separate parameter blocks (series + sparkline) — `apiParams` semantics would split. Different request when a real need shows up.

### Edge Cases

- **Empty / omitted `apiParams`** — most important regression check. Default `{}`, spread is a no-op, output byte-identical to today. Covered by a test.
- **Hardcoded key in `apiParams`** — overwritten by population. Covered.
- **Cache-buster `_` in `apiParams`** — `Date.now()` wins, stamped last. Covered.
- **`apiParams: null` / `undefined`** — `options.apiParams || {}` coalesces to `{}`.
- **`apiParams` has a `null` value** — `URLSearchParams` renders as `"null"` (existing framework behavior). Caller's responsibility to filter.
- **Cross-talk with `childKind` / `breakdown`** — constructor options win symmetrically.
- **`apiParams: { with_delta: true }` doesn't switch the endpoint** — `withDelta` constructor option drives endpoint resolution at construction (MetricsChart.js:101-104), not via `buildApiParams`. Document explicitly: `apiParams` is purely query-string; non-URL side effects (endpoint switching, label-format defaults) require the first-class option.
- **`setApiParams(null)` / `setApiParams(undefined)`** — clears via `next || {}`.
- **`getStats()` mutation immunity** — defensive copy. Covered.

### Testing

Narrowest relevant command:

```bash
npm run test:unit
```

ESLint:

```bash
npm run lint
```

Browser smoke not required — `apiParams` has no UI surface. The existing Mode 2/3 example charts exercise param emission; any regression there would blank the charts.

### Docs Impact

- `docs/web-mojo/extensions/Charts.md` — new option row + "Forward-compatible params" subsection with precedence rule and trust boundary.
- `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — option entry under "Chart (forwarded to MetricsMiniChart)".
- `CHANGELOG.md` — single `### Charts — apiParams passthrough` Unreleased entry.

---

## Resolution
**Status**: Resolved — 2026-05-07

**Files changed**:
- `src/extensions/charts/MetricsChart.js` — `apiParams` constructor field (with trust-boundary comment); `buildApiParams` spreads it first; `setApiParams(next)` setter (replace, not merge); `getStats()` returns a defensive copy with one-level array cloning.
- `src/extensions/charts/MetricsMiniChart.js` — same `apiParams` field, same `buildApiParams` spread, `setApiParams(next)` setter.
- `src/extensions/charts/MetricsMiniChartWidget.js` — pass `apiParams: options.apiParams` through `chartOptions`.
- `test/unit/MetricsChart.test.js` — 8 new test cases: empty regression, passthrough, hardcoded-wins, cache-buster wins, setter replace-not-merge, setter clears with `null`, defensive copy, **array-clone regression** (added after security review).
- `test/unit/MetricsMiniChartWidget.test.js` — 4 new test cases: mini-chart empty regression, mini-chart hardcoded-wins, mini-chart setter, widget propagation.
- `docs/web-mojo/extensions/Charts.md` — `apiParams` row in the "Additional options" table + new "Forward-compatible params (`apiParams`)" subsection.
- `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — option entry under "Chart (forwarded to MetricsMiniChart)".
- `CHANGELOG.md` — Unreleased entry.

**Commits**:
- `80981f9` — main feature: `apiParams` passthrough across MetricsChart / MetricsMiniChart / MetricsMiniChartWidget; tests; docs; CHANGELOG.
- `805a627` — security follow-up: deep-clone array values in `MetricsChart.getStats().apiParams` (caught by security review). Adds regression test.

**Tests run**:
- `npm run test:unit` — 693/693 passed (12 new tests across the two suites; +1 from the array-clone regression added in the follow-up commit).
- `npm run lint` — no new violations from changed files (16 pre-existing errors / 55 pre-existing warnings in unrelated files unchanged).

**Agent findings**:
- **test-runner**: full suite — unit 692/692 (pre-fix), 693/693 (post-fix); integration and build suites have pre-existing infrastructure failures (alias resolution outside the loader; `dist/` not built) unrelated to this commit. No regressions; no fixes required.
- **docs-updater**: no edits required. Verified Charts.md row + subsection, MetricsMiniChartWidget.md option entry, and CHANGELOG entry against the diff. KPIStrip.md correctly omits `apiParams` (deferred). README.md needs no updates.
- **security-review**: three of four flagged risks clear (URL encoding via `URLSearchParams`, prototype-pollution via own-property spread, trust-boundary documentation). One low-severity finding accepted: `getStats().apiParams` was a shallow copy — array values shared references. Fixed in commit `805a627` by replacing the spread with `Object.fromEntries(... Array.isArray(v) ? [...v] : v ...)` and adding an explicit regression test.

**Validation**:
- Empty-`apiParams` regression test proves every existing caller produces byte-identical query strings to today.
- Precedence tests cover hardcoded-wins (granularity, account both pinned at constructor level) and the `_` cache-buster's absolute precedence.
- Setter test verifies replace-not-merge semantics + fetchData call.
- Defensive-copy tests verify both shallow mutation immunity and the array-clone fix from the security review.
- Widget-propagation test verifies `MetricsMiniChartWidget` round-trips `apiParams` through `chartOptions` (mirrors the prior `childKind` propagation pattern).

**Out of scope (already documented)**:
- `KPIStrip` `apiParams` — series + sparkline have separate parameter blocks; semantics would split. File a follow-up when a real need shows up.
- Per-request `apiParams` overrides via `fetchData({ apiParams: {…} })`.
- A `paramsTransform(params)` callback hook.
- Client-side validation of unknown keys.
- Migrating `childKind` / `breakdown` into `apiParams` (they have runtime semantics beyond the URL — `breakdown` drives the no-recase branch in `processMetricsData`).
