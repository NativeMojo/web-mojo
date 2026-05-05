# Modal.alert eyebrow / smart-suppression tests failing on main

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-05-04 |
| Severity | medium |

## Description

Six tests in [test/unit/Modal.alert.test.js](test/unit/Modal.alert.test.js) currently fail on main. They cover the eyebrow / smart-title-suppression behavior introduced in commit `083a4ba` (`Modal.alert: default eyebrow per type with smart suppression`) and refined in `662654a` and `6b7b390`. Either the production code never landed the contract the tests express, or it has since drifted.

## Failing tests

- `honors a caller-supplied eyebrow override via inline --mojo-eyebrow style` (line 133)
- `strips quotes/backslashes from custom eyebrow to keep the CSS string valid` (line 144)
- `clears the band content when caller passes eyebrow: false` (line 152)
- `suppresses the header title when it would just duplicate the eyebrow` (line 158)
- `suppresses on case-insensitive match` (line 171)
- `forwards to Modal.alert with type: error and suppresses the duplicate title` (line 189)

The first three fail because `lastOpts.style` is `undefined` — the code path that wires the eyebrow into the modal root via inline `--mojo-eyebrow` style isn't being executed (or the Modal mock isn't capturing it). The latter three fail because `lastOpts.title` doesn't equal `''` when the title would duplicate the eyebrow — the smart-suppression branch isn't matching.

## Context

These tests have been failing as of the date of the prior DatePicker rebuild handoff (`planning/done/date-picker-rebuild.md`, `**Tests run:**` section): `the 7 failing tests are all pre-existing on main (Modal.alert eyebrow tests for an unimplemented feature, MetricsChart slugs format change)`. They have not been triaged since.

This was first surfaced when the user noticed test count discrepancies and asked for the failures to be tracked.

## Reproduction

```bash
npm run test:unit
```

Six of the seven currently failing tests are in this file.

## Expected Behavior

`Modal.alert(msg, title, { type, eyebrow })` should:

1. When `eyebrow` is omitted, set `--mojo-eyebrow` on the modal root to the type's default label (`'SUCCESS'`, `'ERROR'`, `'WARNING'`, `'INFO'`).
2. When `eyebrow` is a string, use it after stripping quotes/backslashes for CSS safety.
3. When `eyebrow` is `false`, set `--mojo-eyebrow: ''` so the band renders empty.
4. Suppress the rendered header title (`opts.title === ''`) when the title and eyebrow would visually duplicate (case-insensitive match — `'Error'` vs `'ERROR'`).
5. `Modal.showError(msg)` is a thin wrapper that calls `Modal.alert(msg, 'Error', { type: 'error' })` with the same suppression applied.

## Investigation needed

- Check whether `_buildAlertTitle` / `_buildAlertOptions` (or whatever the helper is named in `src/core/Modal.js`) actually computes and forwards `style: '--mojo-eyebrow: ...'` to the underlying Dialog open call.
- Confirm the title-suppression case-insensitive comparison matches the eyebrow string against the `title` arg.
- Reconcile against the spec the tests assert — if the tests describe a feature that was never implemented, decide whether to land the feature or skip the tests until the feature is scheduled.

## Out of scope for this issue

- Any rework of the alert UI itself.
- The remaining MetricsChart failure — see `metricschart-buildapiparams-test-failing.md`.

## Resolution

The tests were testing a **deleted feature**, not an unimplemented one. Commit `9ae43c2` ("Modal: pivot from eyebrow band → stripe + outline icon + tint", 2026-05-01) explicitly removed:

- the eyebrow band markup
- the `--mojo-eyebrow`, `--mojo-current-eyebrow-fg`, `--mojo-current-tint` CSS variables
- all `eyebrow` params on `Modal.*` helpers
- `Modal.setEyebrowEnabled` / `isEyebrowEnabled`
- `modal-bandless` and `mojo-no-eyebrow` CSS classes

The current alert chrome is a 4px top accent stripe + outline leading icon + soft full-card tint (`src/core/css/core.css:1444-1479`). There is no `--mojo-eyebrow` CSS reading the inline style anywhere in the codebase, and the title-suppression branch only made sense when the band was rendering the eyebrow text separately.

**Action taken:** deleted the 6 stale tests from `test/unit/Modal.alert.test.js` and rewrote the `Modal.showError` test to match the current title structure (icon + headline span, no suppression). `Modal.js` was not modified — the production code is correct as-is.

Test count drops from 653 → 646. The remaining single failure is the MetricsChart one, tracked separately.
