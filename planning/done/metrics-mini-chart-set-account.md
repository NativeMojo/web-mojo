# MetricsMiniChartWidget.setAccount(account)

**Type**: request
**Status**: resolved
**Date**: 2026-05-03

## Description
Add a `setAccount(account)` method on `MetricsMiniChartWidget` that mutates `chartOptions.account` AND triggers an internal refresh in one call.

## Why
Callers (e.g. dashboards switching account context) had to mutate `chartOptions.account` and then remember to call the refresh themselves. Easy to forget; the omission is silent. A single `widget.setAccount('group-N')` makes the refetch automatic.

## Notes
- Same shape as the eventual `TopNav` `theme: 'auto'` request — a small ergonomics fix that moves a "remember to also do X" responsibility into the widget.

---

## Resolution
**Status**: Resolved — 2026-05-04

**Files changed**:
- `src/extensions/charts/MetricsMiniChart.js` — new `setAccount(account)` method following the existing `setGranularity` / `setMetrics` shape.
- `src/extensions/charts/MetricsMiniChartWidget.js` — new `setAccount(account)` method that mutates `chartOptions.account` and delegates to `chart.setAccount()`. Also fixed a latent bug in `refresh()` and `onActionRefreshChart()` where account propagation was gated on `this.account` (never set) instead of `this.chartOptions.account`.
- `test/unit/MetricsMiniChartWidget.test.js` — new test file covering the contract for both classes.
- `docs/web-mojo/extensions/MetricsMiniChartWidget.md` — added a `Methods` section documenting `setAccount` and `refresh`.
- `CHANGELOG.md` — Unreleased entry under "Charts".

**Tests run**:
- `node test/test-runner.js --suite unit` — three new tests pass; remaining failures pre-date this change and are unrelated.

**Validation**:
- `MetricsMiniChart.setAccount(x)` sets `this.account = x` and calls `fetchData()`, returning the resulting promise.
- `MetricsMiniChartWidget.setAccount(x)` mutates `chartOptions.account`, delegates to `chart.setAccount()`, and returns the promise — including a safe no-op path when the chart has not yet been attached.
