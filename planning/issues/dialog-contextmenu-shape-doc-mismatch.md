# Dialog `contextMenu` option shape: code vs. docs disagree

**Type**: bug
**Status**: open
**Date**: 2026-04-25

## Description

`Dialog`'s header `contextMenu` option is documented as a bare array of items (`docs/web-mojo/components/Dialog.md:627`), but the source code requires an object with an `items` array (`src/core/Dialog.js:434, :492`). Passing the documented bare-array form silently fails — no error, no menu rendered.

## Reproduction

```js
import { Dialog } from 'web-mojo';

// Documented form — silently does nothing
Dialog.showDialog({
    title: 'Demo',
    contextMenu: [
        { label: 'Edit', action: 'edit' },
        { label: 'Delete', action: 'delete' },
    ],
});

// Actually-supported form
Dialog.showDialog({
    title: 'Demo',
    contextMenu: {
        items: [
            { label: 'Edit', action: 'edit' },
            { label: 'Delete', action: 'delete' },
        ],
    },
});
```

## Expected Behavior

Either:
- `Dialog.showDialog({ contextMenu: [...] })` works as the doc says, OR
- The doc is updated to show the `{ items: [...] }` form, and ideally Dialog accepts both for backward compatibility.

## Affected Area
- `src/core/views/feedback/Dialog.js:434, :492`
- `docs/web-mojo/components/Dialog.md:627`

## Surfaced By

Wave 2 `examples/portal/examples/components/Dialog/DialogContextMenuExample.js` originally followed the doc and rendered no menu at all. The rewrite uses `{ items: [...] }`.

---
## Resolution
**Status**: open
