# `View.mount()` `replaceChildren()` clobbers sibling children sharing one container

**Type**: bug
**Status**: open
**Date**: 2026-04-25

## Description

`View.mount` (`src/core/View.js:323`) calls `container.replaceChildren(this.element)`. When two child views share the same `containerId` (e.g. a parent iterating over a Collection and adding one child per model into a single `data-container="rows"` slot), the second child mounts and wipes out the first. Only the last-mounted sibling renders.

## Reproduction

```js
class Parent extends View {
    async onInit() {
        for (const item of [{name:'a'}, {name:'b'}, {name:'c'}]) {
            const child = new ChildView({ containerId: 'rows', name: item.name });
            this.addChild(child);
        }
    }
}
// Template: <div data-container="rows"></div>
// Result: only 'c' renders. 'a' and 'b' are gone.
```

## Workaround

Emit one `data-container` per model:

```html
{{#items}}
  <div data-container="row-{{id}}"></div>
{{/items}}
```

Then `addChild(child, { containerId: 'row-' + id })`.

This works but is awkward. It should be straightforward to attach multiple children to one container.

## Expected Behavior

Either:
- `mount` appends instead of replacing when the container already has children that are managed mounts (track which elements were placed by which child), OR
- A documented escape hatch like `addChild(child, { containerId: 'rows', append: true })`.

The replace-children behavior IS correct for the common case of one child per container — the container is "owned" by one child. But the iteration case is common enough (lists, tables, child rows) that the framework should support it directly. ListView/TableView already use a different code path; it's user-code views that hit this.

## Affected Area
- `src/core/View.js:323` (`replaceChildren`)
- `docs/web-mojo/core/ViewChildViews.md` (currently doesn't warn about this)

## Surfaced By

Wave 2.5 rewrite of `examples/portal/examples/core/ViewChildViews/ViewChildViewsExample.js` — the natural collection-iteration pattern broke; the example uses the per-model containerId workaround and documents the gotcha.

---
## Resolution
**Status**: Resolved (docs only) — 2026-04-25
**Files changed**: `docs/web-mojo/core/ViewChildViews.md`, `.claude/rules/views.md`
**Fix**: Documented the gotcha and the per-id container workaround as a new "Repeating Children (Iterating a Collection)" section, with a matching ⚠️ entry in Common Pitfalls and a TOC update (+94 lines in the doc). Also tightened the misleading "no manual `child.render()` after `addChild()`" rule in `views.md` (+1 line) — the rule applies only to children added before the parent's first render; children added later in action handlers DO need `await child.render()`. Cross-linked the runnable example. **Framework code is NOT changed** — `View.mount`'s `replaceChildren` semantics stand, but documented properly. A future framework change to support an "append" mode is out of scope for this resolution.
