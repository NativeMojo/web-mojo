// EventDelegate.js
export class EventDelegate {
  constructor(view) {
    this.view = view;
    this.domListeners = [];
    this.debounceTimers = new Map();
  }

  // Synchronously claim a slot in the per-event dispatch chain. MUST be
  // called at the top of each event listener — before any `await` — so
  // ancestor delegates whose listeners run synchronously after us see our
  // promise and wait for our work to finish before checking
  // `event.handledByChild`. Returns `{ prior, done }`: caller awaits `prior`
  // (if set) before its own work, and MUST call `done()` in a `finally` so
  // ancestors never deadlock.
  _enterDispatchChain(event) {
    const prior = event._mojoDispatch;
    let resolve;
    event._mojoDispatch = new Promise(r => { resolve = r; });
    return { prior, done: resolve };
  }

  bind(rootEl) {
    this.unbind();
    if (!rootEl) return;

    const onClick = async (event) => {
      const { prior, done } = this._enterDispatchChain(event);
      try {
        if (prior) await prior;

        const actionEl = event.target.closest('[data-action]');
        if (actionEl && this.shouldHandle(actionEl, event)) {
          const action = actionEl.getAttribute('data-action');

          // Prevent default immediately for anchor tags to avoid navigation
          // before async dispatch completes (e.g. <a href="#" data-action="...">)
          if (actionEl.tagName === 'A') {
            event.preventDefault();
          }

          // Hide any tooltips on the clicked element
          this.hideTooltip(actionEl);

          const handled = await this.dispatch(action, event, actionEl);
          if (handled) {
            event.preventDefault();
            event.stopPropagation();
            event.handledByChild = true;
            return;
          }
        }
        const navEl = event.target.closest('a[href], [data-page]');
        if (navEl && !navEl.hasAttribute('data-action') && this.shouldHandle(navEl, event)) {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) return;
          if (navEl.tagName === 'A') {
            const href = navEl.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('#') &&
                (this.view.isExternalLink(href) || navEl.hasAttribute('data-external'))) return;
          }

          // Hide any tooltips on the clicked element before navigation
          this.hideTooltip(navEl);

          event.preventDefault();
          event.stopPropagation();
          event.handledByChild = true;
          if (navEl.hasAttribute('data-page')) await this.view.handlePageNavigation(navEl);
          else await this.view.handleHrefNavigation(navEl);
        }
      } finally {
        done();
      }
    };

    const onChange = async (event) => {
      const { prior, done } = this._enterDispatchChain(event);
      try {
        if (prior) await prior;

        // `data-change-action` always wins for change events (existing behavior).
        const changeEl = event.target.closest('[data-change-action]');
        if (changeEl && this.shouldHandle(changeEl, event)) {
          const action = changeEl.getAttribute('data-change-action');
          const handled = await this.dispatchChange(action, event, changeEl);
          if (handled) {
            event.stopPropagation();
            event.handledByChild = true;
          }
          return;
        }

        // Fallback: `data-action` on a form control fires onAction* on change.
        const actionEl = event.target.closest('[data-action]');
        if (actionEl && this.isFormControl(actionEl) && this.shouldHandle(actionEl, event)) {
          const action = actionEl.getAttribute('data-action');
          const handled = await this.dispatch(action, event, actionEl);
          if (handled) {
            event.stopPropagation();
            event.handledByChild = true;
          }
        }
      } finally {
        done();
      }
    };

    const onInput = (event) => {
      // Existing `data-change-action` + `data-filter="live-search"` path.
      const changeEl = event.target.closest('[data-change-action]');
      if (changeEl && this.shouldHandle(changeEl, event) &&
          event.target.matches('[data-filter="live-search"]')) {
        const action = changeEl.getAttribute('data-change-action');
        const debounceMs = parseInt(changeEl.getAttribute('data-filter-debounce')) || 300;
        const timerId = `change-${action}-${changeEl.getAttribute('data-container') || 'default'}`;

        if (this.debounceTimers.has(timerId)) {
          clearTimeout(this.debounceTimers.get(timerId));
        }

        const timer = setTimeout(() => {
          this.debounceTimers.delete(timerId);
          this.dispatchChange(action, event, changeEl).then((handled) => {
            if (handled) {
              event.stopPropagation();
              event.handledByChild = true;
            }
          });
        }, debounceMs);

        this.debounceTimers.set(timerId, timer);
        return;
      }

      // New: `data-action` on a form control fires onAction* on input
      // (keystrokes for text-like inputs/textarea, value updates for select).
      // `data-change-action` takes precedence above, so this only runs when
      // the element doesn't carry a change-action.
      const actionEl = event.target.closest('[data-action]');
      if (!actionEl || !this.isFormControl(actionEl)) return;
      if (actionEl.hasAttribute('data-change-action')) return;
      if (!this.shouldHandle(actionEl, event)) return;

      const action = actionEl.getAttribute('data-action');
      const debounceAttr = actionEl.getAttribute('data-action-debounce');
      const debounceMs = debounceAttr != null ? parseInt(debounceAttr) || 0 : 0;

      if (debounceMs > 0) {
        const timerId = `action-${action}-${actionEl.getAttribute('data-container') || 'default'}`;
        if (this.debounceTimers.has(timerId)) {
          clearTimeout(this.debounceTimers.get(timerId));
        }
        const timer = setTimeout(() => {
          this.debounceTimers.delete(timerId);
          this.dispatch(action, event, actionEl).then((handled) => {
            if (handled) {
              event.stopPropagation();
              event.handledByChild = true;
            }
          });
        }, debounceMs);
        this.debounceTimers.set(timerId, timer);
        return;
      }

      this.dispatch(action, event, actionEl).then((handled) => {
        if (handled) {
          event.stopPropagation();
          event.handledByChild = true;
        }
      });
    };

    const onKeyDown = async (event) => {
      if (event.target.matches('[data-filter="search"]')) return;
      const el = event.target.closest('[data-keydown-action]') || event.target.closest('[data-change-action]');
      if (!el) return;

      const { prior, done } = this._enterDispatchChain(event);
      try {
        if (prior) await prior;
        if (!this.shouldHandle(el, event)) return;

        let changeKeys = ["Enter"];
        if (el.getAttribute('data-change-keys')) {
            changeKeys = el.getAttribute('data-change-keys').split(',').map(key => key.trim());
        }
        if (changeKeys.includes('*') || changeKeys.includes(event.key)) {
          const action = el.getAttribute('data-keydown-action') || el.getAttribute('data-change-action');
          const handled = await this.dispatch(action, event, el);
          if (handled) {
            event.preventDefault();
            event.stopPropagation();
            event.handledByChild = true;
          }
        }
      } finally {
        done();
      }
    };

    const onSubmit = (event) => {
      const form = event.target.closest('form[data-action]');
      if (!form || !this.shouldHandle(form, event)) return;
      event.preventDefault();
      const action = form.getAttribute('data-action');
      this.dispatch(action, event, form);
    };

    rootEl.addEventListener('click', onClick);
    rootEl.addEventListener('change', onChange);
    rootEl.addEventListener('input', onInput);
    rootEl.addEventListener('keydown', onKeyDown);
    rootEl.addEventListener('submit', onSubmit);

    this.domListeners.push(
      { el: rootEl, type: 'click', fn: onClick },
      { el: rootEl, type: 'change', fn: onChange },
      { el: rootEl, type: 'input', fn: onInput },
      { el: rootEl, type: 'keydown', fn: onKeyDown },
      { el: rootEl, type: 'submit', fn: onSubmit },
    );
  }

  unbind() {
    for (const { el, type, fn } of this.domListeners) el.removeEventListener(type, fn);
    this.domListeners = [];

    // Clear any pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  hideDropdown(element) {
    const dropdownMenu = element.closest('.dropdown-menu');
    const dropdown = dropdownMenu.closest('.dropdown');
    if (!dropdown) {
        return;
    }

    const dropdownBtn = dropdown.querySelector('[data-bs-toggle="dropdown"]');
    if (dropdownBtn && window.bootstrap?.Dropdown) {
      const dropdownInstance = window.bootstrap.Dropdown.getInstance(dropdownBtn);
      dropdownInstance?.hide();
    }
  }

  hideTooltip(element) {
    // Hide tooltip on the clicked element
    if (element && window.bootstrap?.Tooltip) {
      const tooltip = window.bootstrap.Tooltip.getInstance(element);
      if (tooltip) {
          tooltip.dispose();
        // tooltip.hide();
      }
    }
  }

  hideAllTooltips() {
    // Hide all visible tooltips in the document
    if (window.bootstrap?.Tooltip) {
      const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      tooltips.forEach(el => {
        const tooltip = window.bootstrap.Tooltip.getInstance(el);
        if (tooltip) {
          tooltip.hide();
        }
      });
    }
  }

  async dispatch(action, event, el) {
    const v = this.view;
    const cap = (s) => (s.includes('-') ? s.split('-').map(w => w[0].toUpperCase()+w.slice(1)).join('') : s[0].toUpperCase()+s.slice(1));

    const specific = `handleAction${cap(action)}`;
    if (typeof v[specific] === 'function') {
      try { event.preventDefault(); await v[specific](event, el); return true; }
      catch (e) { console.error(`Error in action ${action}:`, e); v.handleActionError(action, e, event, el); return true; }
    }

    const generic = `onAction${cap(action)}`;
    if (typeof v[generic] === 'function') {
      try {
          if (await v[generic](event, el)) {
              const isInDropdown = !!el.closest('.dropdown-menu');
              if (isInDropdown) this.hideDropdown(el);
              event.preventDefault();
              event.stopPropagation();
              return true;
          }
          return false;
      }
      catch (e) { console.error(`Error in action ${action}:`, e); v.handleActionError(action, e, event, el); return true; }
    }

    const passThru = `onPassThruAction${cap(action)}`;
    if (typeof v[passThru] === 'function') {
      try { await v[passThru](event, el); return false; }
      catch (e) { console.error(`Error in action ${action}:`, e); v.handleActionError(action, e, event, el); return true; }
    }

    if (typeof v.onActionDefault === 'function') {
      try { return await v.onActionDefault(action, event, el); }
      catch (e) { console.error(`Error in default action handler for ${action}:`, e); v.handleActionError(action, e, event, el); return true; }
    }

    v.emit?.(`action:${action}`, { action, event, element: el });
    return false;
  }

  async dispatchChange(action, event, el) {
    const v = this.view;
    const cap = (s) => (s.includes('-') ? s.split('-').map(w => w[0].toUpperCase()+w.slice(1)).join('') : s[0].toUpperCase()+s.slice(1));

    const changeHandler = `onChange${cap(action)}`;
    if (typeof v[changeHandler] === 'function') {
      try {
        await v[changeHandler](event, el);
        return true;
      }
      catch (e) {
        console.error(`Error in onChange ${action}:`, e);
        v.handleActionError?.(action, e, event, el);
        return true;
      }
    }

    // Fall back to regular dispatch if no onChange handler exists
    return await this.dispatch(action, event, el);
  }

  isFormControl(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  shouldHandle(el, event) {
    if (this.owns(el)) return true;
    if (this.contains(el) && !event.handledByChild) return true;
    return false;
  }

  owns(el) {
    const root = this.view.element;
    if (!root || !root.contains(el)) return false;
    for (const child of Object.values(this.view.children)) {
        if (child.element && child.element.contains(el)) return false;
    }
    return true;
  }

  contains(el) { return !!this.view.element && this.view.element.contains(el); }
}

export default EventDelegate;
