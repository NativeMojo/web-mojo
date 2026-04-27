/**
 * Dialog — backwards-compatibility shim.
 *
 * @deprecated Use {@link Modal} (canonical static API) and
 *   {@link ModalView} (the underlying View class) instead.
 *
 * The old Dialog.js god-class has been split into:
 *   - `ModalView.js`     — modal mechanics (lifecycle, sizing, stacking)
 *   - `Modal.js`         — canonical static API (alert, confirm, dialog, ...)
 *   - `BusyIndicator.js` — full-screen loading overlay
 *   - `CodeViewer.js`    — syntax-highlighted code block
 *   - `HtmlPreview.js`   — sandboxed iframe preview
 *
 * This shim re-exports `ModalView` as the default export so existing
 * `new Dialog({...})` callers keep working, and provides 1-line
 * delegations for every static method that used to live here. New code
 * should import `Modal` (or use `app.modal.*`) directly.
 *
 * @example
 * // ❌ Old
 * import Dialog from '@core/views/feedback/Dialog.js';
 * const dialog = new Dialog({ body: view });
 * await Dialog.confirm('Sure?');
 *
 * // ✅ New
 * import Modal from '@core/views/feedback/Modal.js';
 * await Modal.show(view);
 * await Modal.confirm('Sure?');
 */

import ModalView from './ModalView.js';
import Modal from './Modal.js';
import CodeViewer from './CodeViewer.js';

// Mix the legacy static API onto the ModalView class so that both
// `new Dialog(opts)` and `Dialog.alert(...)` keep working from a single
// default export.

// ── Generic dialog ─────────────────────────────────────────────
ModalView.showDialog = (...args) => Modal.dialog(...args);

// ── Alert / confirm / prompt ───────────────────────────────────
// Modal owns the canonical implementation; the legacy names route here.
ModalView.alert = (...args) => Modal.alert(...args);
ModalView.confirm = (...args) => Modal.confirm(...args);
ModalView.prompt = (...args) => Modal.prompt(...args);
ModalView.showError = (...args) => Modal.showError(...args);

// ── Form / data / model display ────────────────────────────────
ModalView.showForm = (...args) => Modal.form(...args);
ModalView.showModelForm = (...args) => Modal.modelForm(...args);
ModalView.showData = (...args) => Modal.data(...args);
ModalView.showModelView = (...args) => Modal.showModelView(...args);
ModalView.updateModelImage = (...args) => Modal.updateModelImage(...args);

// ── Code / HTML preview ────────────────────────────────────────
ModalView.showCode = (...args) => Modal.code(...args);
ModalView.showHtmlPreview = (...args) => Modal.htmlPreview(...args);
ModalView.formatCode = (...args) => CodeViewer.formatCode(...args);
ModalView.highlightCodeBlocks = (...args) => CodeViewer.highlightCodeBlocks(...args);

// ── Busy indicator ─────────────────────────────────────────────
ModalView.showBusy = (...args) => Modal.showBusy(...args);
ModalView.hideBusy = (...args) => Modal.hideBusy(...args);

// ── Legacy aliases that older code may reference ───────────────
ModalView.showConfirm = ModalView.confirm;

// Note: getFullscreenAwareZIndex, fixAllBackdropStacking,
// updateAllBackdropStacking, _openDialogs, _baseZIndex are already
// defined as ModalView statics — no shim needed; they are reachable
// as Dialog.* via the default export below.

export default ModalView;
