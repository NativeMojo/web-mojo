# ModalView

**ModalView** is the underlying [View](../core/View.md) class behind every modal in WEB-MOJO. It owns the Bootstrap 5 modal mechanics — lifecycle, sizing, z-index stacking, header/body/footer composition, button rendering, and the optional header context menu.

> **Most callers should use [`Modal.*`](Modal.md), not `new ModalView()`.** The static API handles render → show → resolve → cleanup in one promise call.
>
> Use `new ModalView({...})` directly only when you need a long-lived instance handle for:
> - **Streaming updates** — `modal.setContent(newView)` while the dialog is open
> - **External event wiring** — listening for `modal.on('shown', ...)` / `'hidden'` / custom `'action:foo'` events on the instance
> - **Subclassing** — `class MyDialog extends ModalView` for app-specific modal types

---

## Quick Start

```js
import ModalView from '@core/views/feedback/ModalView.js';

const modal = new ModalView({
    title: 'Hello',
    body: '<p>World</p>',
    size: 'md',
    centered: true,
    buttons: [
        { text: 'OK', class: 'btn-primary', dismiss: true }
    ]
});

await modal.render(true, document.body);
modal.show();

modal.on('hidden', () => {
    modal.destroy();
    modal.element?.remove();
});
```

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `''` | Header title (HTML allowed) |
| `body` | `string \| View \| Function \| Promise<View>` | `''` | Body content. Aliases: `view`, `message`, `content`. Priority: body > view > message > content |
| `header` | `boolean \| string \| View` | `true` | `false` to hide the header; a string/View overrides the entire header |
| `headerContent` | `string \| View \| Function` | `null` | Custom header inside the modal-header wrapper |
| `footer` | `string \| View \| null` | `null` | Custom footer (overrides the buttons array) |
| `buttons` | `Array<ButtonConfig>` | `null` | Footer buttons (see below) |
| `size` | `string` | `''` | `'sm'`, `'md'`, `'lg'`, `'xl'`, `'xxl'`, `'fullscreen'`, `'fullscreen-{breakpoint}-down'`, or `'auto'` |
| `centered` | `boolean` | `false` | Vertically center the modal |
| `scrollable` | `boolean` | `false` | Enable scrollable body |
| `autoSize` | `boolean` | `false` | Auto-size to content. Implied when `size: 'auto'` |
| `backdrop` | `boolean \| 'static'` | `true` | `'static'` prevents close-on-backdrop-click |
| `keyboard` | `boolean` | `true` | Close on ESC |
| `focus` | `boolean` | `true` | Auto-focus first input on shown |
| `closeButton` | `boolean` | `true` | Render the X close button when no `contextMenu` |
| `contextMenu` | `object` | `null` | `{ items: [...], icon?, buttonClass? }` — header dropdown |
| `noBodyPadding` | `boolean` | `false` | Strip the default `modal-body` padding |
| `bodyClass` | `string` | `''` | Extra classes on the body wrapper |
| `footerClass` | `string` | `''` | Extra classes on the footer wrapper |
| `className` | `string` | `''` | Extra classes on the modal root |
| `id` | `string` | *generated* | DOM id for the modal root |
| `fade` | `boolean` | `true` | Bootstrap fade animation. `false` for instant show/hide |
| `autoShow` | `boolean` | `false` | Show on mount without an explicit `.show()` call |
| `maxHeight` / `minWidth` / `minHeight` | `number` | — | Auto-sizing constraints (px) |
| `maxWidthPercent` / `maxHeightPercent` | `number` | `0.9` / `0.8` | Auto-sizing viewport caps |
| `onShow` / `onShown` / `onHide` / `onHidden` / `onHidePrevented` | `function` | `null` | Bootstrap event callbacks |

### Button Configuration

```js
{
    text: 'Save',                 // button label
    class: 'btn-primary',         // bootstrap button class
    icon: 'bi-floppy',            // optional bootstrap icon class
    action: 'save',               // emits action:save when clicked
    value: 'saved',               // resolves the promise (when used with Modal.dialog)
    dismiss: true,                // adds data-bs-dismiss="modal"
    disabled: false,
    id: 'save-btn',
    type: 'button'                // 'button' | 'submit'
}
```

---

## Instance Methods

| Method | Description |
|---|---|
| `await modal.render(allowMount?, container?)` | Render the modal. Pass `true` and a container to mount immediately |
| `modal.show(relatedTarget?)` | Open the modal |
| `modal.hide()` | Close the modal (Bootstrap animation) |
| `modal.toggle()` | Toggle visibility |
| `modal.isShown()` | Whether the modal is currently visible |
| `modal.getModal()` | The underlying `bootstrap.Modal` instance |
| `await modal.setContent(content)` | Replace body. Accepts string/HTML or a View instance |
| `modal.setTitle(title)` | Update the header title text |
| `modal.setLoading(loading?, message?)` | Replace body with a centered spinner; pass `false` to restore |
| `modal.handleUpdate()` | Tell Bootstrap to recalculate position after dynamic content |
| `await modal.destroy()` | Dispose Bootstrap, clean up child views, restore focus |

### Events (via `modal.on(event, handler)`)

| Event | Payload | Fires when |
|---|---|---|
| `mounted` | `{ view }` | After `mount()` completes |
| `show` | `{ dialog, relatedTarget }` | Bootstrap `show.bs.modal` |
| `shown` | `{ dialog, relatedTarget }` | Bootstrap `shown.bs.modal` (animation done) |
| `hide` | `{ dialog }` | Bootstrap `hide.bs.modal` |
| `hidden` | `{ dialog }` | Bootstrap `hidden.bs.modal` (fully closed) |
| `hidePrevented` | `{ dialog }` | Backdrop/ESC blocked by static backdrop |
| `action:<name>` | `(event, element)` | Footer button or context-menu item with matching `action` is clicked |

---

## Static Methods

| Method | Description |
|---|---|
| `ModalView.getFullscreenAwareZIndex()` | Returns `{ backdrop, modal }`. Higher values when a `.table-fullscreen` element is active |
| `ModalView.fixAllBackdropStacking()` | Recompute backdrop z-indexes for the current open stack |
| `ModalView.updateAllBackdropStacking()` | Alias of `fixAllBackdropStacking` |
| `ModalView.getMountTarget()` | Returns the active `.table-fullscreen` element or `document.body` |
| `ModalView._openDialogs` | The shared open-modal stack. Aliased by `Dialog._openDialogs` |
| `ModalView._baseZIndex` | `{ backdrop: 1050, modal: 1055 }` — the default Bootstrap-aligned base |

---

## Z-Index & Stacking

`ModalView` automatically manages z-index when multiple modals are open simultaneously:

- Each new modal gets a higher z-index than existing modals (`base + index * 20`).
- Backdrop z-index is coordinated to sit between modals.
- Inside an active `.table-fullscreen` element, the base jumps to `10050` so modals stack above the fullscreen container.

---

## Subclassing

```js
import ModalView from '@core/views/feedback/ModalView.js';

class WizardModal extends ModalView {
    constructor(opts) {
        super({
            size: 'lg',
            centered: true,
            buttons: [
                { text: 'Back',   action: 'wizard-back',   class: 'btn-outline-secondary' },
                { text: 'Next',   action: 'wizard-next',   class: 'btn-primary' },
                { text: 'Finish', action: 'wizard-finish', class: 'btn-success' }
            ],
            ...opts
        });
        this.steps = opts.steps;
        this.currentStep = 0;
    }

    onActionWizardNext() { /* ... */ }
    onActionWizardBack() { /* ... */ }
    onActionWizardFinish() { /* ... */ }
}
```

---

## Related Documentation

- **[Modal](Modal.md)** — Canonical static API. Use this in most cases instead of `new ModalView()`.
- **[Dialog](Dialog.md)** — Backwards-compatibility shim. `Dialog` is `ModalView` re-exported.
- **[View](../core/View.md)** — Base View class.
- **[ContextMenu](ContextMenu.md)** — Reusable dropdown menu used by the modal header `contextMenu` option.
