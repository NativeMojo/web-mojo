# Charts — Stage 4: final Chart.js cleanup + bundle audit

**Type**: request
**Status**: superseded — 2026-04-26 — consolidated into planning/requests/charts-native-rebuild.md
**Date**: 2026-04-25
**Priority**: low

## Description

Final stage of dropping the Chart.js dependency. After Stages 1–3 land (MiniChart features → native PieChart → SeriesChart/MetricsChart rebuilt), this stage is the cleanup pass.

## Acceptance Criteria

- [ ] `chart.js` removed from `package.json` `dependencies` (confirm Stage 3 already did this; if not, do it here).
- [ ] No remaining `import 'chart.js'` or `import {Chart} from 'chart.js'` anywhere in `src/`. Grep confirms zero matches.
- [ ] `src/extensions/charts/BaseChart.js` deleted if it was Chart.js-specific (Stage 3 may have already done this).
- [ ] All Chart.js-specific Vite/Rollup config removed (e.g. external markers, separate bundle chunking, alias for `chart.js`).
- [ ] `dist/charts.es.js` size measured before and after — record the delta in CHANGELOG.
- [ ] `dist/web-mojo.lite.js` size measured — confirm the lite bundle dropped if it ever pulled charts.
- [ ] CHANGELOG entry in the next release section: "Chart.js dependency removed. All chart components are now native SVG. Bundle drops ~XX KB minified."
- [ ] `package.json` `peerDependencies` and `devDependencies` audited — remove any chart-js companion packages (chartjs-adapter-date-fns, chartjs-plugin-datalabels, etc.) if any were added.
- [ ] `npm install` from a fresh clone succeeds without Chart.js.

## Out of Scope

- Re-introducing any Chart.js plugin functionality not requested by current callers.
- Bundler tweaks unrelated to charting.

## Notes

This stage is mostly verification. If Stage 3 was thorough, this PR is small — a few file deletions, a package.json line, a CHANGELOG entry, and a bundle-size audit.

---
## Resolution
**Status**: open
