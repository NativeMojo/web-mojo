---
name: ContextMenu unit tests stale after openAt body re-parent rewrite
description: Two ContextMenu tests still query the trigger button for the position styles that openAt now applies to the dropdown-menu element instead.
type: bug
status: resolved
date: 2026-04-26
severity: low
---

# ContextMenu unit tests stale after openAt body re-parent rewrite

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-04-26 |
| Severity | low |

## Description
Two unit tests in [test/unit/ContextMenu.test.js](test/unit/ContextMenu.test.js) fail every run, dropping the unit suite from 522/522 to 520/522:

1. `ContextMenu.openAt > renders the menu, positions the trigger at (x, y), and shows the dropdown` — fails on `expect(trigger.style.position).toBe('fixed')`.
2. `ContextMenu.attachToRightClick > wires a contextmenu listener that prevents default and opens the menu at the cursor` — fails on `expect(trigger.style.left).toBe('200px')`.

These are not real product regressions — the ContextMenu works correctly in the live portal (right-click menus open at the cursor and dispatch actions). The tests are simply asserting against the **old** implementation contract.

## Context
Commit `a5cc2f9` ("Fix ContextMenu/Timeline/Lightbox bugs surfaced in examples portal") rewrote `ContextMenu.openAt()` to bypass Popper entirely:

- Old behavior: position styles (`fixed`, `left`, `top`) were applied to the `[data-bs-toggle="dropdown"]` trigger button so Bootstrap/Popper could position the menu relative to it.
- New behavior: the inner `.dropdown-menu` `<ul>` is re-parented to `document.body` and pinned with `position: fixed; left/top` directly. The trigger button is never styled.

See [src/core/views/feedback/ContextMenu.js:218-256](src/core/views/feedback/ContextMenu.js:218):

```js
const menuEl = this.element?.querySelector('.dropdown-menu');
...
menuEl.style.position = 'fixed';
menuEl.style.left = `${x}px`;
menuEl.style.top = `${y}px`;
```

The source change was committed without updating the test, so the assertions still target `menu.element.querySelector('[data-bs-toggle="dropdown"]')` and check that **its** style was set. Since that element is no longer touched by `openAt`, the assertions read empty strings and fail.

The `git log` for `test/unit/ContextMenu.test.js` confirms the test file has not been touched since `29728f4`, two commits before the `openAt` rewrite.

## Acceptance Criteria
- The two failing assertions are updated to query `.dropdown-menu` (the element that actually receives `position: fixed; left/top`) instead of the trigger button.
- The "shows the dropdown" assertion is reconsidered — `shownTriggers` is fed by the Bootstrap stub's `Dropdown.show()`, but the new `openAt` does not call `Dropdown.show()`. It manually adds `.show` to the menu element. The test should assert on `menuEl.classList.contains('show')` instead, or be removed.
- The `reuses a pre-built ContextMenu` and `detachRightClick` tests still pass without changes.
- `npm run test:unit` reports 522/522 passing.

## Investigation
- **Likely root cause:** Source rewrite in `a5cc2f9` moved positioning from trigger button to `.dropdown-menu`. Test was not updated in that commit and still asserts the old contract.
- **Confidence:** high
- **Code path:**
  - Test assertions: [test/unit/ContextMenu.test.js:78-84](test/unit/ContextMenu.test.js:78) and [test/unit/ContextMenu.test.js:174-177](test/unit/ContextMenu.test.js:174)
  - Implementation: [src/core/views/feedback/ContextMenu.js:218-256](src/core/views/feedback/ContextMenu.js:218) — only `menuEl` (the `<ul>`) gets `position`, `left`, `top` set; the trigger `<button>` is untouched.
  - Bootstrap stub `show` tracking: [test/unit/ContextMenu.test.js:33-37](test/unit/ContextMenu.test.js:33) — driven by `Dropdown.getOrCreateInstance(...).show()`, but `openAt` never calls `.show()` on the Dropdown instance after the rewrite (it manually adds the `show` class). `onAfterRender` calls `getOrCreateInstance` (creating the entry in the stub map) but does NOT call `show()`, so `shownTriggers` stays empty.
- **Regression test:** Not feasible — the bug *is* in the existing tests. The fix is to align the assertions with the rewritten implementation.
- **Related files:**
  - [src/core/views/feedback/ContextMenu.js](src/core/views/feedback/ContextMenu.js)
  - [test/unit/ContextMenu.test.js](test/unit/ContextMenu.test.js)
  - Commit `a5cc2f9` (source rewrite that diverged from the test)

## Plan

### Objective
Bring the two stale unit tests in `test/unit/ContextMenu.test.js` into alignment with the rewritten `ContextMenu.openAt()` contract so the unit suite passes 522/522. No production code changes — `openAt()` already behaves correctly in the live portal.

### Steps

1. **[test/unit/ContextMenu.test.js:74-85](test/unit/ContextMenu.test.js:74)** — Rewrite the `'renders the menu, positions the trigger at (x, y), and shows the dropdown'` assertions:
   - Rename the test to `'renders the menu, positions the dropdown at (x, y), and shows it'` (the "trigger" wording is now misleading).
   - Query `menuEl = menu.element.querySelector('.dropdown-menu')` instead of the trigger button.
   - Assert `menuEl.style.position === 'fixed'`, `menuEl.style.left === '123px'`, `menuEl.style.top === '456px'`.
   - Replace `expect(shownTriggers).toHaveLength(1)` / `expect(shownTriggers[0]).toBe(trigger)` with `expect(menuEl.classList.contains('show')).toBe(true)` — that is the visibility signal `openAt` actually emits ([src/core/views/feedback/ContextMenu.js:255](src/core/views/feedback/ContextMenu.js:255)).
   - Also assert `menuEl.parentElement === document.body` to lock in the re-parent contract documented in the `openAt` JSDoc.

2. **[test/unit/ContextMenu.test.js:174-177](test/unit/ContextMenu.test.js:174)** — Same shape of fix in the `attachToRightClick` test:
   - Query `.dropdown-menu` and assert `left === '200px'`, `top === '300px'`.
   - Replace `expect(shownTriggers).toContain(trigger)` with `expect(menuEl.classList.contains('show')).toBe(true)`.

3. **No changes** to the Bootstrap stub itself. It is still load-bearing for `onAfterRender` (which calls `Dropdown.getOrCreateInstance`) and `closeDropdown` (which calls `Dropdown.getInstance(...).hide()`). Leaving `shownTriggers` / `createdInstances` declared but unread is fine and keeps the diff minimal; out-of-scope to prune.

4. **No changes** to the other four `openAt` tests, the `attachToRightClick` reuse/throws/detach tests, or any source file.

### Design Decisions
- **Test-only fix.** The rewrite in commit `a5cc2f9` is the desired behavior (documented in the file's own JSDoc and motivated by real portal layout bugs). The tests simply got out of sync.
- **Assert on `.show` class, not on Bootstrap stub calls.** `openAt` deliberately bypasses Popper/Dropdown.show() — asserting on a Bootstrap mock would re-couple the test to a path the source no longer uses. The DOM class is the actual visibility contract.
- **Add the body re-parent assertion in step 1 only.** The "appends to document.body" test ([test/unit/ContextMenu.test.js:105](test/unit/ContextMenu.test.js:105)) covers the *outer view element*; the new assertion covers the inner `.dropdown-menu` re-parent — distinct contracts, both worth pinning.
- **Keep Bootstrap stub intact.** Pruning unused stub state is unrelated cleanup; CLAUDE.md `core.md` rule "Do not refactor unrelated files" applies.

### Edge Cases
- `onAfterRender` runs on every render (including inside `openAt`) and calls `Dropdown.getOrCreateInstance(trigger)`. The stub already handles this, so no test churn there.
- The "does not throw when window.bootstrap is missing" test ([test/unit/ContextMenu.test.js:117](test/unit/ContextMenu.test.js:117)) already exercises the `Dropdown?.` guard path and remains valid.
- `menu.element.remove()` cleanup in test 1: since `openAt` re-parents the `.dropdown-menu` to `<body>`, `menu.element.remove()` no longer removes the menu `<ul>` — only the (now-empty) outer container. The first test currently has no cleanup, so this isn't a regression. If lint/leak detection complains, also remove the orphaned `menuEl` in cleanup; otherwise leave it (jsdom is torn down per file).

### Testing
- `npm run test:unit` — must report 522/522 passing, 0 failures.
- No need for integration or build suites; the change is isolated to one unit test file.

### Docs Impact
- None. Public `ContextMenu` API is unchanged. `CHANGELOG.md` already records the `openAt` rewrite under commit `a5cc2f9`. No `docs/web-mojo/` updates required.

### Out of Scope
- Pruning unused `shownTriggers` / `createdInstances` from the stub.
- Rewriting `closeDropdown` lifecycle tests (none exist; not requested).
- Touching `ContextMenu.js` source.

## Resolution

### What was implemented
Realigned the two stale assertions in [test/unit/ContextMenu.test.js](test/unit/ContextMenu.test.js) with the post-`a5cc2f9` `ContextMenu.openAt()` contract:

- Both tests now look up the menu via `document.body.querySelector(\`[aria-labelledby="context-menu-${menu.id}"]\`)`, which is scoped to the specific menu's auto-generated id and immune to leakage from prior tests (an issue surfaced during build — the first attempt at `body.querySelector('.dropdown-menu')` matched a leftover element from a previous test).
- Assertions now check `menuEl.style.position`, `left`, `top`, and `menuEl.classList.contains('show')` — the actual visibility signal `openAt` emits — instead of the trigger button's style and the Bootstrap stub's `shownTriggers` (which `openAt` no longer drives).
- Test 1 now also asserts `menuEl.parentElement === document.body` to lock in the re-parent contract documented in the `openAt` JSDoc.
- Both tests clean up the body-attached `menuEl` so subsequent tests start from a clean DOM.

The Bootstrap stub itself was left intact (still load-bearing for `onAfterRender` and `closeDropdown`), and no `src/` files were modified — this was purely a test-alignment fix.

### Files changed
- [test/unit/ContextMenu.test.js](test/unit/ContextMenu.test.js)

### Tests run and results
- `npm run test:unit` — 522/522 passing (was 520/522).
- `npm test` (via test-runner agent) — full suite green: 522/522 unit + 3/3 integration files + 4/4 build files. No regressions.

### Agent findings
- **test-runner**: All suites pass; no regressions.
- **docs-updater**: No doc changes needed. `docs/web-mojo/components/ContextMenu.md` already documents the post-rewrite behavior. No CHANGELOG entry warranted (test-only change with no user-visible effect).
- **security-review**: No security concerns. `menu.id` is an auto-incremented integer assigned by the `View` base class — never attacker-controlled — so the template-literal in the attribute selector cannot be abused.

### Commit
- `7e0432e` — Tests: align ContextMenu unit tests with openAt body re-parent rewrite
