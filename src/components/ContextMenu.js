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

import View from '../core/View.js';

class ContextMenu extends View {
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
     * Build the dropdown menu HTML from the configuration.
     */
    async renderTemplate() {
        const menuItems = this.config.items || [];
        if (menuItems.length === 0) {
            return ''; // Don't render anything if there are no items
        }

        const triggerIcon = this.config.icon || 'bi-three-dots-vertical';
        const buttonClass = this.config.buttonClass || 'btn btn-sm btn-link text-secondary p-0';
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
        if (!action) return;

        const menuItem = this.config.items.find(item => item.action === action);
        if (!menuItem || menuItem.disabled) return;

        // Support for inline handlers
        if (typeof menuItem.handler === 'function') {
            menuItem.handler(this.context, event, element);
        } else {
            // Emit a general event for parent views to listen to
            // this.emit('action', {
            //     action: action,
            //     context: this.context,
            //     sourceEvent: event
            // });
            this.parent.events.dispatch(action, event, element);
        }
        this.closeDropdown();
    }

    closeDropdown() {
        const dropdownTrigger = this.element.querySelector('[data-bs-toggle="dropdown"]');
        if (dropdownTrigger) {
            const dropdownInstance = window.bootstrap?.Dropdown.getInstance(dropdownTrigger);
            dropdownInstance?.hide();
        }
    }
}

export default ContextMenu;
