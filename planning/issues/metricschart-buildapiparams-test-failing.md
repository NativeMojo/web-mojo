# MetricsChart.buildApiParams test failing on main

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-05-04 |
| Severity | low |

## Description

One unit test in [test/unit/MetricsChart.test.js](test/unit/MetricsChart.test.js) currently fails on main:

- `MetricsChart — buildApiParams › includes granularity, account, slugs, date range` (line 105)

The test asserts that `buildApiParams()` returns an object containing `slugs[]: ['x', 'y']`. Either the production code returns a different parameter name (e.g. `slug` or `slugs` without brackets), or the date range fields don't match the expected shape.

## Context

Carried as a known failure since the DatePicker rebuild handoff (`planning/done/date-picker-rebuild.md`): `MetricsChart slugs format change`. The likely explanation is a parameter format change that didn't get pushed back into the test fixture.

Surfaced again when the user asked for visibility into the pre-existing test failures.

## Reproduction

```bash
npm run test:unit
```

The failure appears under `MetricsChart — buildApiParams`.

## Expected Behavior

The test expectations:

```javascript
expect(params['slugs[]']).toEqual(['x', 'y']);
expect(typeof params.dr_start).toBe('number');
expect(typeof params.dr_end).toBe('number');
expect(params.dr_end).toBeGreaterThan(params.dr_start);
```

If the production parameter format has legitimately changed (e.g. backend now expects `slug` or `slugs` without bracket suffix), the test should be updated to match. Otherwise the regression should be fixed in `MetricsChart`.

## Investigation needed

- Read the current `buildApiParams` in `src/extensions/charts/MetricsChart.js` (or wherever it now lives).
- Confirm what the backend metrics endpoint actually expects today.
- Update either the test or the production code so they agree, and document the parameter contract in the relevant chart docs.

## Out of scope for this issue

- The Modal.alert eyebrow test failures — see `modal-alert-eyebrow-tests-failing.md`.

## Resolution

The test was asserting a legacy parameter format. Git history shows the slugs param shape evolved across three commits and landed at its current form in `c85c23b` ("Charts: /api/metrics/fetch also requires slugs= (plural), not slug="). `MetricsChart.buildApiParams` (`src/extensions/charts/MetricsChart.js:335-343`) has a detailed comment explaining the backend contract:

- `slugs=a,b,c` (plural, comma-joined string) — works on both `/api/metrics/fetch` and `/api/metrics/series`
- `slug=…` (singular) — returns 400 "missing required parameter" on production
- `slugs[]=…` (PHP-style bracketed array, what the test was asserting) — returns 400 / collapses to 'default'

So the production code is correct as documented. The test was simply not updated when the backend contract was finalized.

**Action taken:** updated the assertion in `test/unit/MetricsChart.test.js:116` from `expect(params['slugs[]']).toEqual(['x', 'y'])` to `expect(params.slugs).toBe('x,y')`, with a comment pointing back to the source comment that documents the contract. `MetricsChart.js` was not modified.

All 646 unit tests now pass.
