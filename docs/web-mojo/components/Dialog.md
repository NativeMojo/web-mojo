# Dialog

> **⚠️ Deprecated — `Dialog` is now a compatibility shim.**
>
> The `Dialog.js` god-class has been split into a focused View ([`ModalView`](ModalView.md)) and a canonical static API ([`Modal`](Modal.md)). The default export from `@core/views/feedback/Dialog.js` re-exports `ModalView`, and every static method (`Dialog.alert`, `Dialog.showDialog`, `Dialog.showForm`, etc.) is a one-line forward to the matching `Modal.*` method.
>
> Existing `new Dialog({...})` and `Dialog.show*()` callers continue to work unchanged — but **new code should use [`Modal.*`](Modal.md) directly** (or `app.modal.*` from any view).
>
> ```js
> // ❌ Old
> import Dialog from '@core/views/feedback/Dialog.js';
> const dialog = new Dialog({ body: view, size: 'lg' });
> await dialog.render(true, document.body);
> dialog.show();
> await Dialog.confirm('Sure?');
>
> // ✅ New
> import Modal from '@core/views/feedback/Modal.js';
> await Modal.show(view);
> await Modal.confirm('Sure?');
>
> // ✅ Or via app instance
> await app.modal.show(view);
> await app.modal.confirm('Delete?');
> ```

---

## Architecture

```
Consumer code
     │
     ├─→  Modal.*           (canonical static API — use this in new code)
     │       │
     │       └─→  new ModalView({...})   (the actual View class)
     │
     └─→  Dialog.*          (compat shim — routes everything to Modal.*)
             │
             ├─ Dialog (default export)  →  ModalView    (so new Dialog() still works)
             └─ Dialog.alert / showForm / ... → Modal.alert / form / ...
```

The split lives across five files in `src/core/views/feedback/`:

| File | Responsibility |
|---|---|
| [`ModalView.js`](ModalView.md) | Bootstrap 5 modal mechanics — lifecycle, sizing, stacking, header/body/footer composition, button rendering, context menu |
| [`Modal.js`](Modal.md) | Canonical static API — `alert`, `confirm`, `prompt`, `dialog`, `show`, `showModel`, `form`, `modelForm`, `data`, `code`, `htmlPreview`, `loading` |
| `BusyIndicator.js` | Singleton frosted-glass loading overlay used by `Modal.loading()` / `Modal.showBusy()` |
| `CodeViewer.js` | Syntax-highlighted code block (Prism.js) used by `Modal.code()` |
| `HtmlPreview.js` | Sandboxed iframe preview used by `Modal.htmlPreview()` |
| `Dialog.js` | Compat shim (this file) |

---

## Migration Reference

### Static methods

| Old | New | Notes |
|---|---|---|
| `Dialog.alert(...)` | `Modal.alert(...)` | Identical signature |
| `Dialog.confirm(...)` | `Modal.confirm(...)` | Identical signature |
| `Dialog.prompt(...)` | `Modal.prompt(...)` | Identical signature |
| `Dialog.showDialog(opts)` | `Modal.dialog(opts)` | Identical options |
| `Dialog.showForm(opts)` | `Modal.form(opts)` | Identical options |
| `Dialog.showModelForm(opts)` | `Modal.modelForm(opts)` | Identical options |
| `Dialog.showData(opts)` | `Modal.data(opts)` | Identical options |
| `Dialog.showCode(opts)` | `Modal.code(opts)` | Identical options |
| `Dialog.showHtmlPreview(opts)` | `Modal.htmlPreview(opts)` | Identical options |
| `Dialog.showModelView(model, opts)` | `Modal.showModelView(model, opts)` | Read-only model display |
| `Dialog.updateModelImage(opts, fieldOpts)` | `Modal.updateModelImage(opts, fieldOpts)` | Avatar uploader |
| `Dialog.showBusy(opts?)` | `Modal.loading(opts?)` *(or `Modal.showBusy`)* | One overlay style now (the modern frosted card) |
| `Dialog.hideBusy(force?)` | `Modal.hideLoading(force?)` *(or `Modal.hideBusy`)* | Counter semantics unchanged |
| `Dialog.formatCode(code, lang)` | `CodeViewer.formatCode(code, lang)` | Use the import directly |
| `Dialog.highlightCodeBlocks(el)` | `CodeViewer.highlightCodeBlocks(el)` | Use the import directly |
| `Dialog.getFullscreenAwareZIndex()` | `ModalView.getFullscreenAwareZIndex()` | Same return shape |
| `Dialog.fixAllBackdropStacking()` | `ModalView.fixAllBackdropStacking()` | Same behaviour |
| `Dialog._openDialogs` | `ModalView._openDialogs` | **Same array** — the shim aliases it |

### Direct instantiation

```js
// ❌ Old
const dialog = new Dialog({ body: view, buttons: [...] });
await dialog.render(true, document.body);
dialog.show();
dialog.on('action:save', () => { ... });

// ✅ New — most cases collapse to a one-liner via Modal.dialog
const result = await Modal.dialog({
  body: view,
  buttons: [
    { text: 'Save', class: 'btn-primary', action: 'save', value: 'save' },
    { text: 'Cancel', class: 'btn-secondary', dismiss: true }
  ]
});
if (result === 'save') { ... }

// ✅ Or — when you genuinely need the instance handle (post-show event
// wiring, dynamic setContent, streaming updates), use ModalView directly
import ModalView from '@core/views/feedback/ModalView.js';
const modal = new ModalView({ body: view, buttons: [...] });
await modal.render(true, document.body);
modal.show();
modal.on('action:save', () => { ... });
```

See the [legacy migration request](../../../planning/requests/migrate-legacy-dialog-callers.md) for the in-progress sweep of `src/`.

---

## Related Documentation

- **[Modal](Modal.md)** — Canonical static API. **Use this in new code.**
- **[ModalView](ModalView.md)** — The underlying View class for direct instantiation or subclassing.
- **[WebApp](../core/WebApp.md)** — `app.modal` exposes the Modal API on every view.
- **[View](../core/View.md)** — Base View class that `ModalView` extends.
- **[ToastService](../services/ToastService.md)** — Non-blocking alternative for lightweight notifications.
