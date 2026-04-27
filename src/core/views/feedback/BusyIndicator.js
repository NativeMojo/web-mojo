/**
 * BusyIndicator — global full-screen loading overlay.
 *
 * Singleton frosted-glass card with a spinner and a configurable message.
 * Reference-counted so nested call sites compose cleanly:
 *   show('Saving...')
 *     show('Uploading...')   // updates the message
 *     hide()                  // counter: 2 → 1 (still visible)
 *   hide()                    // counter: 1 → 0 (fades out)
 *
 * Z-index is read from `ModalView.getFullscreenAwareZIndex()` so the
 * spinner always stacks above any open modal (and inside an active
 * `.table-fullscreen` element when one exists).
 */

import ModalView from './ModalView.js';

let _el = null;
let _counter = 0;
let _timeout = null;

const STYLE = `
  .mojo-loading-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s ease;
  }
  .mojo-loading-overlay.show { opacity: 1; }
  .mojo-loading-card {
    display: flex; align-items: center; gap: 0.85rem;
    background: #fff;
    border: 1px solid #e9ecef;
    border-radius: 12px;
    padding: 1rem 1.5rem;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
  }
  .mojo-loading-spinner {
    width: 22px; height: 22px;
    border: 2.5px solid #e9ecef;
    border-top-color: #0d6efd;
    border-radius: 50%;
    animation: mojo-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .mojo-loading-message {
    font-size: 0.88rem;
    font-weight: 500;
    color: #495057;
    white-space: nowrap;
  }
  @keyframes mojo-spin { to { transform: rotate(360deg); } }
`;

const BusyIndicator = {
    /**
     * Show the overlay. Increments the reference counter.
     * @param {string|object} [options] - message string or { message, timeout }
     */
    show(options) {
        if (typeof options === 'string') options = { message: options };
        const { message = 'Loading...', timeout = 30000 } = options || {};

        _counter++;

        if (_counter === 1) {
            if (_timeout) clearTimeout(_timeout);

            // Z-index needs to clear any open modal; recompute on every
            // first-show so a modal opened after the spinner still loses.
            const zBase = ModalView.getFullscreenAwareZIndex();
            const overlayZ = zBase.modal + 1000;

            if (!_el) {
                _el = document.createElement('div');
                _el.className = 'mojo-loading-overlay';
                _el.innerHTML = `
                    <div class="mojo-loading-card">
                        <div class="mojo-loading-spinner"></div>
                        <div class="mojo-loading-message">${message}</div>
                    </div>
                    <style>${STYLE}</style>
                `;
                document.body.appendChild(_el);
            }

            _el.style.zIndex = String(overlayZ);

            const msgEl = _el.querySelector('.mojo-loading-message');
            if (msgEl) msgEl.textContent = message;

            requestAnimationFrame(() => {
                if (_el) _el.classList.add('show');
            });

            if (timeout > 0) {
                _timeout = setTimeout(() => {
                    console.error('BusyIndicator timed out.');
                    BusyIndicator.hide(true);
                }, timeout);
            }
        } else {
            // Already shown — just update the message text.
            if (_el) {
                const msgEl = _el.querySelector('.mojo-loading-message');
                if (msgEl) msgEl.textContent = message;
            }
        }
    },

    /**
     * Hide the overlay. Decrements the counter; only removes when it
     * reaches zero. Pass `true` to force-hide regardless of counter.
     */
    hide(force = false) {
        if (force) {
            _counter = 0;
        } else {
            _counter--;
        }

        if (_counter > 0) return;
        _counter = 0;

        if (_timeout) {
            clearTimeout(_timeout);
            _timeout = null;
        }

        if (_el) {
            _el.classList.remove('show');
            setTimeout(() => {
                if (_el && _counter === 0) {
                    _el.remove();
                    _el = null;
                }
            }, 200);
        }
    },

    isShown() {
        return _el !== null && _counter > 0;
    }
};

export default BusyIndicator;
