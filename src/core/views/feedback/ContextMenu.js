/**
 * ContextMenu - A reusable context menu component for MOJO
 *
 * Renders a Bootstrap 5 dropdown menu based on a configuration object.
 * This component is designed to be easily embedded in any other View.
 * It supports the same configuration syntax as the Dialog's contextMenu.
 *
 * Features:
 * - Renders a dropdown button with a configurable icon.
 * - Generates menu items from a configuration array.
 * - Supports dividers, icons, labels, and links.
 * - Handles actions via inline handlers or by emitting an 'action' event.
 * - Supports right-click usage via `openAt(x, y, contextItem)` and the
 *   `ContextMenu.attachToRightClick()` static helper.
 *
 * @example
 * const contextMenu = new ContextMenu({
 *   config: {
 *     icon: 'bi-gear', // Optional: custom trigger icon
 *     items: [
 *       { label: 'Edit', action: 'edit', icon: 'bi-pencil' },
 *       { label: 'Delete', action: 'delete', icon: 'bi-trash', danger: true },
 *       { type: 'divider' },
 *       {
 *         label: 'Custom Action',
 *         action: 'custom',
 *         icon: 'bi-star',
 *         handler: (context) => {
 *           console.log('Inline handler called with context:', context);
 *         }
 *       }
 *     ]
 *   },
 *   context: { id: 123, name: 'My Item' } // Optional data to pass to handlers/events
 * });
 *
 * // Listen for actions from the parent view
 * contextMenu.on('action', (data) => {
 *   console.log(`Action '${data.action}' triggered for context:`, data.context);
 *   if (data.action === 'edit') {
 *     // handle edit
 *   }
 * });
 */

import View from '@core/View.js';

class ContextMenu extends View {
    /**
     * Set `ContextMenu.DEBUG = true` from the browser console (or in a
     * downstream app's bootstrap) to trace menu-item clicks, parent
     * dispatch, and Bootstrap auto-attach. Off by default.
     */
    static DEBUG = false;

    constructor(options = {}) {
        super({
            tagName: 'div',
            className: 'context-menu-view dropdown',
            ...options
        });

        this.config = options.contextMenu || options.config || {};
        this.context = options.context || {}; // Optional data to pass to handlers/events
    }

    /**
     * After every render, ensure the Bootstrap Dropdown instance is wired
     * to our trigger button. Bootstrap's data-API is supposed to handle
     * this via document delegation, but doesn't reliably attach to
     * dynamically rendered View markup — without this hook, clicking the
     * three-dots trigger button silently does nothing.
     */
    async onAfterRender() {
        await super.onAfterRender();
        if (!this.element) return;
        const Dropdown = window.bootstrap?.Dropdown;
        if (!Dropdown) return;
        const trigger = this.element.querySelector('[data-bs-toggle="dropdown"]');
        if (trigger) Dropdown.getOrCreateInstance(trigger);
    }

    /**
     * Build the dropdown menu HTML from the configuration.
     */
    async renderTemplate() {
        const menuItems = this.config.items || [];
        if (menuItems.length === 0) {
            return ''; // Don't render anything if there are no items
        }

        const triggerIcon = this.config.icon || 'bi-three-dots';
        const buttonClass = this.config.buttonClass || 'btn btn-link text-secondary ps-3 pe-0 pt-0 pb-1';
        const dropdownId = `context-menu-${this.id}`;

        const menuItemsHtml = menuItems.map(item => this.buildMenuItemHTML(item)).join('');

        return `
            <button class="${buttonClass}" type="button" id="${dropdownId}" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="${triggerIcon}"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="${dropdownId}">
                ${menuItemsHtml}
            </ul>
        `;
    }

    /**
     * Build the HTML for a single menu item.
     * @param {object} item - The menu item configuration.
     * @returns {string} The HTML string for the list item.
     */
    buildMenuItemHTML(item) {
        if (item.type === 'divider' || item.separator) {
            return '<li><hr class="dropdown-divider"></li>';
        }

        const icon = item.icon ? `<i class="${item.icon} me-2"></i>` : '';
        const label = item.label || '';
        const itemClass = `dropdown-item ${item.danger ? 'text-danger' : ''} ${item.disabled ? 'disabled' : ''}`;
        const action = item.action || '';

        if (item.href) {
            return `<li><a class="${itemClass}" href="${item.href}" target="${item.target || '_self'}">${icon}${label}</a></li>`;
        }

        return `<li><a class="${itemClass}" href="#" data-action="menu-item-click" data-item-action="${action}">${icon}${label}</a></li>`;
    }

    /**
     * Handle clicks on menu items.
     * @param {Event} event - The click event.
     * @param {HTMLElement} element - The clicked anchor element.
     */
    async onActionMenuItemClick(event, element) {
        event.preventDefault();
        const action = element.getAttribute('data-item-action');
        const debug = ContextMenu.DEBUG;
        if (debug) console.log('[ContextMenu] menu-item-click', { action, hasParent: !!this.parent, parentClass: this.parent?.constructor?.name });
        if (!action) return;

        const menuItem = this.config.items.find(item => item.action === action);
        if (!menuItem || menuItem.disabled) {
            if (debug) console.log('[ContextMenu] no matching item or disabled', { action, found: !!menuItem, disabled: menuItem?.disabled });
            return;
        }

        // Support for inline handlers
        if (typeof menuItem.handler === 'function') {
            if (debug) console.log('[ContextMenu] inline handler', action);
            menuItem.handler(this.context, event, element);
        } else if (this.parent && this.parent.events) {
            if (debug) console.log('[ContextMenu] dispatching to parent', { action, parentClass: this.parent.constructor?.name });
            this.parent.events.dispatch(action, event, element);
        } else if (debug) {
            console.warn('[ContextMenu] no handler and no parent.events — action lost', { action });
        }
        this.closeDropdown();
    }

    closeDropdown() {
        // Manual-mode close: undo what openAt did (re-parent, strip
        // .show, drop the outside-click listener). Falls through to the
        // Bootstrap path so the trigger-button case keeps working.
        const menuEl = this.element?.querySelector('.dropdown-menu')
            || this._menuOrigParent?.querySelector?.('.dropdown-menu');
        if (menuEl && menuEl.classList.contains('show') && menuEl.parentElement === document.body) {
            menuEl.classList.remove('show');
            menuEl.style.position = '';
            menuEl.style.left = '';
            menuEl.style.top = '';
            menuEl.style.transform = '';
            menuEl.style.inset = '';
            menuEl.style.margin = '';
            menuEl.style.zIndex = '';
            if (this._menuOrigParent) {
                if (this._menuOrigNextSibling && this._menuOrigNextSibling.parentElement === this._menuOrigParent) {
                    this._menuOrigParent.insertBefore(menuEl, this._menuOrigNextSibling);
                } else {
                    this._menuOrigParent.appendChild(menuEl);
                }
            }
        }
        if (this._outsideHandler) {
            document.removeEventListener('mousedown', this._outsideHandler, true);
            this._outsideHandler = null;
        }

        // Bootstrap-trigger case (visible three-dots button).
        const dropdownTrigger = this.element?.querySelector('[data-bs-toggle="dropdown"]');
        if (dropdownTrigger) {
            const dropdownInstance = window.bootstrap?.Dropdown.getInstance(dropdownTrigger);
            dropdownInstance?.hide();
        }
    }

    /**
     * Open the menu at viewport coordinates (x, y), without needing a
     * visible trigger button. Used for right-click / programmatic patterns.
     *
     * Implementation note — we deliberately do NOT delegate positioning to
     * Bootstrap's Dropdown / Popper here. Two reasons:
     *   1. Hosts often mount the ContextMenu inside a wrapper that hides
     *      the (otherwise visible) trigger button. Wrappers like
     *      `.visually-hidden` apply `clip: rect(0,0,0,0)` and
     *      `overflow: hidden`, which clip the popped-out menu's paint even
     *      though Popper places it correctly.
     *   2. Portal layouts paint sidebars/offcanvas at z-index 1050 above
     *      the dropdown's default 1000.
     * Re-parenting the menu to `document.body` and pinning it with
     * `position: fixed` + a high z-index sidesteps both.
     *
     * @param {number} x - Viewport X coordinate (e.g. event.clientX)
     * @param {number} y - Viewport Y coordinate (e.g. event.clientY)
     * @param {*} [contextItem] - Optional context to attach for the handler/dispatch path
     * @returns {Promise<this>}
     */
    async openAt(x, y, contextItem) {
        if (typeof contextItem !== 'undefined') {
            this.context = contextItem;
        }

        // Make sure the menu is rendered and in the DOM.
        if (!this.isMounted()) {
            if (!this.parent && !this.containerId && !this.container) {
                this.options.allowAppendToBody = true;
            }
            await this.render();
        }

        const menuEl = this.element?.querySelector('.dropdown-menu');
        if (!menuEl) return this;

        // Re-parent the menu to <body> on first openAt so no host wrapper
        // can clip or stack above it. Stash the original parent so we can
        // re-attach on close (keeps the DOM tidy and the View's children
        // model coherent).
        if (menuEl.parentElement !== document.body) {
            this._menuOrigParent = menuEl.parentElement;
            this._menuOrigNextSibling = menuEl.nextSibling;
            document.body.appendChild(menuEl);
        }

        // Manual positioning + visibility — no Popper involvement.
        // NOTE: `inset` is shorthand for top/right/bottom/left, so set it
        // FIRST and then override left/top — otherwise inset:auto would
        // clobber the coordinates we just assigned.
        menuEl.style.transform = 'none';
        menuEl.style.inset = 'auto';
        menuEl.style.position = 'fixed';
        menuEl.style.left = `${x}px`;
        menuEl.style.top = `${y}px`;
        menuEl.style.margin = '0';
        menuEl.style.zIndex = '1080';
        menuEl.classList.add('show');

        // The menu is now a document.body child, so its `data-action`
        // clicks no longer bubble up to `this.element` where the View's
        // EventDelegate listens. Wire menu-item dispatch directly.
        if (this._menuClickHandler) {
            menuEl.removeEventListener('click', this._menuClickHandler);
        }
        this._menuClickHandler = (ev) => {
            const item = ev.target.closest('[data-action="menu-item-click"]');
            if (!item) return;
            this.onActionMenuItemClick(ev, item);
        };
        menuEl.addEventListener('click', this._menuClickHandler);

        // Click/contextmenu outside closes the menu. We listen on the next
        // tick so the contextmenu event that opened us doesn't immediately
        // close us.
        if (this._outsideHandler) {
            document.removeEventListener('mousedown', this._outsideHandler, true);
        }
        this._outsideHandler = (ev) => {
            if (!menuEl.contains(ev.target)) this.closeDropdown();
        };
        setTimeout(() => {
            document.addEventListener('mousedown', this._outsideHandler, true);
        }, 0);

        return this;
    }

    /**
     * Wire a `contextmenu` (right-click) event on `element` to open a
     * ContextMenu at the cursor. Returns the ContextMenu instance so
     * callers can keep a handle for cleanup or further configuration.
     *
     * Two ways to supply the menu:
     *   1. Pass a pre-built ContextMenu via `menuOptions.menu`.
     *   2. Pass a plain options object (config / context / etc.) and a
     *      fresh ContextMenu will be constructed.
     *
     * @param {HTMLElement} element - The element that should respond to right-click
     * @param {Function} getContextItem - Callback invoked with the contextmenu event;
     *        the return value is stored on `menu.context` for the dispatch path.
     * @param {object} [menuOptions] - Either a ContextMenu options object
     *        (`{ config, context, ... }`) or `{ menu: existingContextMenuInstance }`.
     * @returns {ContextMenu} The ContextMenu instance bound to the element.
     */
    static attachToRightClick(element, getContextItem, menuOptions = {}) {
        if (!element) {
            throw new Error('ContextMenu.attachToRightClick: element is required');
        }

        const menu = menuOptions.menu instanceof ContextMenu
            ? menuOptions.menu
            : new ContextMenu(menuOptions);

        const handler = (event) => {
            event.preventDefault();
            const contextItem = typeof getContextItem === 'function'
                ? getContextItem(event)
                : getContextItem;
            menu.openAt(event.clientX, event.clientY, contextItem);
        };

        element.addEventListener('contextmenu', handler);

        // Stash the handler so callers can remove it if they need to.
        menu._rightClickHandler = handler;
        menu._rightClickElement = element;

        return menu;
    }

    /**
     * Detach a previously attached right-click handler. Safe to call
     * multiple times. Does not destroy the ContextMenu itself.
     */
    detachRightClick() {
        if (this._rightClickElement && this._rightClickHandler) {
            this._rightClickElement.removeEventListener('contextmenu', this._rightClickHandler);
            this._rightClickElement = null;
            this._rightClickHandler = null;
        }
        return this;
    }
}

export default ContextMenu;
