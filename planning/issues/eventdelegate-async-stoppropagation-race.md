# EventDelegate: async action handlers can't reliably stop event propagation

**Type**: bug
**Status**: open
**Date**: 2026-05-08

## Description

`EventDelegate.dispatch` calls action handlers via `await v[generic](event, el)` and only calls `event.stopPropagation()` *after* the await resolves. For an `async` handler, the await yields to the event loop — the click event has already finished its propagation phase by the time `stopPropagation()` is called. As a result, when multiple ancestor Views have the same `onAction<Name>` handler, **all of them fire** for a single click, even if the inner handler returns truthy.

This was discovered while wiring "Add metadata" in `RuleSetView`: a click on a button inside `RuleSetMetadataSection` was opening the edit modal twice, because both the section's handler and `RuleSetView`'s handler were dispatched.

## Context

Pattern at risk: any time a child View handles an action AND a parent View has the same `onAction<Name>` method (or is itself a `View` subclass that inherits one), the parent's handler will also fire. The current convention in the codebase — "section emits an event, parent listens via `section.on(...)`" — assumes that the section's `dispatch` blocks propagation, which it doesn't for async handlers.

This is particularly bad with the new [`DetailView`](../../src/core/views/data/DetailView.js) layout because:

- The view hierarchy stacks deeply: `DetailView` → `SideNavView` → section → buttons inside the section
- Each level's `EventDelegate` listens for clicks on its own root element
- A click bubbles through every level
- If any *two* of those levels have a matching handler, the action runs twice

## Reproduction

1. Open a `DetailView` whose section has a button with `data-action="X"` and an async `onActionX` that just emits an event.
2. The parent `DetailView` subclass also defines an `onActionX` (which opens a modal, saves a model, etc.).
3. Click the button.
4. Observe both handlers run — the parent's `onActionX` fires once via the bubbling click AND once via the section's event emit (if the parent listens for `section.on('action:X', ...)`).

Confirmed live in the smoke harness — clicking "Add metadata" produced two stacked `Edit metadata (JSON)` modals before the temporary fix landed (remove the section's handler and let the click bubble straight to `RuleSetView`).

## Expected Behavior

`EventDelegate.dispatch` should reliably stop propagation when the inner handler "owns" the action, regardless of whether the handler is sync or async.

## Actual Behavior

`event.stopPropagation()` is called inside the `try` block after `await v[generic](event, el)`. By the time the `await` resolves, the synchronous propagation phase is complete and `stopPropagation()` is a no-op. Outer delegates see the same event and dispatch their own matching handlers.

```js
// EventDelegate.js — current dispatch
const generic = `onAction${cap(action)}`;
if (typeof v[generic] === 'function') {
    try {
        if (await v[generic](event, el)) {       // ← await yields, propagation continues
            …
            event.preventDefault();
            event.stopPropagation();              // ← too late for sync events
            return true;
        }
        return false;
    } catch (e) { … }
}
```

## Affected Area

- **Files / classes**: `src/core/mixins/EventDelegate.js` (`dispatch`, `dispatchChange`, click handler), every `View` subclass that has an `onAction*` method
- **Layer**: View
- **Related docs**: `docs/web-mojo/core/View.md` (action handlers section), `docs/web-mojo/components/DetailView.md` (which encourages the parent-listens pattern)

## Acceptance Criteria

- [ ] Clicking a `[data-action]` element whose closest action-handling View returns truthy from its handler does NOT also dispatch on ancestor Views with the same `onAction*` method
- [ ] Behavior is identical for both sync and async handlers
- [ ] Existing test cases in `test/unit/View*.test.js` still pass
- [ ] A new regression test covers the parent/child handler-collision case
- [ ] If the contract changes (e.g., `stopPropagation` becomes the default for any handled action), call it out in the View docs

## Possible Fixes (sketch only — design before implementing)

1. **Capture-phase opt-in**: bind a capture-phase click listener on each View's root that pre-decides whether the inner handler will own the action and synchronously calls `stopPropagation()` before the bubble phase. The async handler then runs without competing dispatches.
2. **Synchronous gate**: have `dispatch` synchronously check `typeof v[generic]` and call `stopPropagation()` BEFORE awaiting the handler. Tradeoff: a thrown `onAction*` would still have stopped propagation. Probably acceptable.
3. **One-delegate-per-element guard**: when `EventDelegate.bind` runs, mark each `[data-action]` element that's been seen by an inner delegate so outer delegates skip it. More complex.

Option (2) is likely the smallest, lowest-risk fix. The behavior change is subtle — currently a thrown handler doesn't stop propagation; under (2) it would. Worth documenting either way.

## Notes

- Current convention in the codebase (section emits → parent listens) is *fragile*. Consumers writing new Views with `DetailView` are likely to hit this. Worth fixing at the framework level rather than asking every consumer to handle the action one-level-deep only.
- Workaround used in the RuleSetView redesign: removed the section's `onActionEditMetadata` entirely; the click bubbles straight to `RuleSetView`'s delegate. Single dispatch. But this only works when the parent has the handler — it doesn't address the general pattern of section-level dispatch + parent listener.

---

<!-- Filled in on resolution -->
## Resolution

**Status**: Resolved — YYYY-MM-DD
**Root cause**: ...
**Files changed**: ...
**Tests added/updated**: ...
**Validation**: ...
