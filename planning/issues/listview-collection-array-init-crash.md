# ListView crashes when `collection:` option is a raw array

**Type**: bug
**Status**: open
**Date**: 2026-04-25

## Description

Passing a plain array to `new ListView({ collection: [...] })` crashes during the View's first render with `TypeError: Cannot read properties of null (reading 'ModelClass')`.

## Reproduction

```js
import { ListView } from 'web-mojo';
const list = new ListView({
    containerId: 'slot',
    collection: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Ben' }],
});
parent.addChild(list);
```

## Expected Behavior

ListView's docstring (and `_initCollection` itself) explicitly documents three input shapes for `collection`: a Collection instance, a Collection class, or an array of data. The array path should auto-wrap the array in a generic `Collection`.

## Actual Behavior

`ListView._initCollection` (`src/core/views/list/ListView.js:125`) calls:

```js
const collection = new Collection(null, {}, collectionOrClass);
```

`Collection` only accepts two arguments: `(options = {}, data = null)`. Passing `null` as the first argument crashes line 61:

```js
this.ModelClass = options.ModelClass || Model;
```

Because `options` is `null`, the property read fails.

## Affected Area
- **Files**: `src/core/views/list/ListView.js:125`, `src/core/Collection.js:51-69`
- **Layer**: View
- **Related docs**: `docs/web-mojo/components/ListView.md`

## Acceptance Criteria

- [ ] Passing an array as `collection` to ListView no longer crashes.
- [ ] `_initCollection` either calls `new Collection({}, array)` (matching Collection's actual signature) or Collection's constructor handles the `null, {}, array` shape gracefully.
- [ ] Regression test in `test/unit/` covers the array shape.

## Surfaced By

The Wave 2 `examples/portal/examples/components/ListView/ListViewExample.js` originally used the array shape per the docstring; it crashed and was rewritten to wrap the array in a Collection as a workaround. The doc shape should work as documented.

---
## Resolution
**Status**: open
