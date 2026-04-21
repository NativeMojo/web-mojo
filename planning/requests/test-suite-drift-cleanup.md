# Unit Test Suite — Drift Cleanup

**Type**: request
**Status**: open
**Date**: 2026-04-21

## Description

The custom unit-test runner (`node test/test-runner.js --suite unit`) now passes **277/471** tests. The harness itself is sound — the remaining 194 failures are real test-vs-implementation drift from tests that predate the current framework code. Update (or delete) these tests so the suite returns to a trustworthy green-is-green state.

## Context

This follows up on the test-harness cleanup in commit `61efce3` ("test cleanup"), which fixed concurrent-execution races, ESM support, dead-reference test files, `@core/…` alias resolution, and beefed up `jest.fn()` / `expect` matchers. That work eliminated every infra-level failure; the failures left are assertion-level drift.

The rules in [`.claude/rules/testing.md`](.claude/rules/testing.md) and the "Test harness notes" section added there describe the current conventions (module loader, sequential execution, supported mock/matcher surface).

Authoritative sources when updating tests:
1. `docs/web-mojo/` (framework docs)
2. Current code under `src/core/` and `src/core/utils/`
3. `CHANGELOG.md` for why behaviour changed

Do **not** reshape the production code to match stale tests — fix the tests.

## Failure Breakdown (post-harness-fix baseline: 2026-04-21)

| File | Fail | Nature |
|---|---|---|
| `View.test.js` / `View-get.test.js` / `View-pipes.test.js` | ~138 | `View` API surface changed — missing helpers (`createElement`, `setContainer`, `capitalize`, `generateId`, `findById`, `getHierarchy`, `updateState`, `getViewData`, `handleAction`, `View.create` static), container-resolution semantics, `children` storage (Map vs array), `onInit` dispatch, render error recovery |
| `Collection.test.js` | ~30 | Model data shape (id is split from `attributes` in `Model.originalAttributes`); collection emits via `emit` (not `this.trigger`); reset-event payload shape; `Collection.from` no longer exists; iterator/JSON include leading empty model from constructor signature edge cases |
| `Model.test.js` | ~18 | `save()`/`fetch()`/`destroy()` call the shared `rest` singleton, not a per-model injected `mockRest`; `attributes` excludes `id`; loading-state transitions; validation error shape |
| `Model-events.test.js` | ~12 | EventEmitter mixin API — `trigger` renamed to `emit`; context binding via third `on()` argument; once-listener argument shape |
| `Router.test.js` | ~21 | Renamed / removed internals: `router.removeRoute`, `router.parseQuery`, `router.handleRoute`, `router.getCurrentUrl`, `urlParams` iteration; plus `Router` default options drift (`mode`, `base`, `pageParam`, `container`) |
| `PageEvents.test.js` | 7 | `Page` activate/deactivate lifecycle renamed (`onEnter`/`onExit` vs `onActivate`/`onDeactivate`); `page:before-change` / `page:changed` emitter path changed; document-title update flow |
| `MOJOUtils.test.js` | ~12 | Namespace access + pipe integration tests against changed `getContextData`/`wrapData` shape |
| `DataFormatter.test.js` | ~9 | `currency` default precision changed; `status` renders Bootstrap Icons (`<i class="bi bi-check-circle-fill">`) instead of glyphs; `capitalize` now title-cases; `listFormatters` shape |

## Acceptance Criteria

- [ ] `npm run test:unit` reports `X/X passed` with `X >= 460` (allow up to ~10 tests removed or skipped with a documented reason)
- [ ] No test asserts behaviour that contradicts `docs/web-mojo/` or current code
- [ ] No production code changes unless a bug is found — then file a separate issue under `planning/issues/` and link it here
- [ ] `npm run lint` clean on any files touched
- [ ] `.claude/rules/testing.md` still accurate after changes (update if new patterns emerge)

## Constraints

- **Never "fix" a test to hide a bug** — if a test legitimately exposes wrong behaviour, raise an issue instead of weakening the assertion.
- Deletion is acceptable for tests describing APIs that have been intentionally removed (flag these in the commit message).
- Keep each area (View, Collection, Model, Router, Page, DataFormatter) as a **separate commit** so diffs stay reviewable.
- Do not reintroduce concurrent-test patterns — the runner is now sequential by design; new tests can safely rely on `global.fetch` / `localStorage` between `beforeEach` calls.
- Stick to the mock/matcher surface documented in `.claude/rules/testing.md`; if a matcher is missing, add it to `test/test-runner.js` rather than working around it.

## Notes

- Suggested order (highest yield first): DataFormatter (9 small formatter-output updates) → Model-events (rename `trigger` → `emit`) → Collection (one signature fix cascades to ~25) → Model → Router → PageEvents → View / View-get / View-pipes (largest, do last).
- `docs/web-mojo/core/View.md`, `docs/web-mojo/core/Model.md`, `docs/web-mojo/core/Collection.md`, `docs/web-mojo/pages/Page.md`, `docs/web-mojo/core/DataFormatter.md` document the current APIs.
- `test/unit/EventBus.test.js` (30/30) and `test/unit/TokenManager.test.js` (10/10) are good reference patterns for the current harness style.

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: open
