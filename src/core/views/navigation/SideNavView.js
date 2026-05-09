/**
 * SideNavView - Left sidebar navigation with content panel
 *
 * A reusable navigation component that displays a vertical sidebar with
 * nav links, optional group labels, and icons. The content panel mounts
 * one child view at a time, switching on nav click.
 *
 * Features:
 * - Left sidebar with nav links, icons, and group dividers
 * - Active state with accent border
 * - Mount/unmount child views on section switch
 * - Responsive: collapses to dropdown on narrow containers
 * - Permission-aware: skips sections the user lacks permission for
 * - Configurable nav width and content padding
 * - Smooth fade transitions between sections
 *
 * Example Usage:
 * ```javascript
 * const sideNav = new SideNavView({
 *     sections: [
 *         { key: 'profile', label: 'Profile', icon: 'bi-person', view: profileView },
 *         { key: 'security', label: 'Security', icon: 'bi-shield-lock', view: securityView },
 *         { type: 'divider', label: 'Activity' },
 *         { key: 'sessions', label: 'Sessions', icon: 'bi-clock-history', view: sessionsView },
 *     ],
 *     activeSection: 'profile',
 *     navWidth: 200,
 *     contentPadding: '1.5rem 2.5rem',
 *     enableResponsive: true
 * });
 * ```
 */

import View from '@core/View.js';

class SideNavView extends View {
    constructor(options = {}) {
        const {
            sections = [],
            activeSection,
            navWidth,
            contentPadding,
            enableResponsive,
            minWidth,
            ...viewOptions
        } = options;

        super({
            tagName: 'div',
            className: 'side-nav-view',
            ...viewOptions
        });

        // Configuration
        this.navWidth = navWidth || 200;
        this.contentPadding = contentPadding || '1.5rem 2.5rem';
        this.enableResponsive = enableResponsive !== false;
        this.minWidth = minWidth || 500;

        // State
        this.sectionConfigs = [];   // Full config array (including dividers)
        this.sectionViews = {};     // key → view instance
        this.sectionKeys = [];      // Ordered navigable section keys
        this.activeSection = null;
        this.currentMode = 'sidebar'; // 'sidebar' or 'dropdown'
        this.resizeObserver = null;
        this.lastContainerWidth = 0;

        // Process sections config
        for (const config of sections) {
            this._addSectionConfig(config);
        }

        // Set initial active section
        this.activeSection = activeSection || this.sectionKeys[0] || null;

        // Bind resize handler
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Process and store a section config entry
     * @param {object} config - Section config (navigable or divider)
     * @private
     */
    _addSectionConfig(config) {
        if (config.type === 'divider') {
            this.sectionConfigs.push({ type: 'divider', label: config.label });
            return;
        }

        // Skip if user lacks required permission
        if (config.permissions && !this._hasPermission(config.permissions)) {
            return;
        }

        this.sectionConfigs.push(config);
        this.sectionKeys.push(config.key);

        if (config.view) {
            this.sectionViews[config.key] = config.view;
            config.view.parent = this;
        }
    }

    /**
     * Check if the current user has a permission
     * @param {string} perm - Permission string
     * @returns {boolean}
     * @private
     */
    _hasPermission(perm) {
        try {
            return this.getApp().activeUser.hasPerm(perm);
        } catch {
            return true; // If app isn't available yet, allow — will be checked at render
        }
    }

    // ───────────────────────────────────────────────
    // Template
    // ───────────────────────────────────────────────

    async renderTemplate() {
        // Stylesheet lives in src/core/css/core.css under "SideNavView".
        // Two instance-specific values (`navWidth`, `contentPadding`) are
        // applied as inline `style="..."` attributes below.
        const nav = this.currentMode === 'dropdown'
            ? this._buildDropdownNav()
            : this._buildSidebarNav();

        const navWidthStyle = `width: ${this.navWidth}px`;
        const contentPaddingStyle = `padding: ${this.contentPadding}`;

        return `
            ${this.currentMode === 'dropdown' ? `
                <div class="snv-dropdown">${nav}</div>
                <div class="snv-content" data-container="snv-content" style="${contentPaddingStyle}"></div>
            ` : `
                <div class="snv-layout">
                    <nav class="snv-nav" style="${navWidthStyle}">${nav}</nav>
                    <div class="snv-content" data-container="snv-content" style="${contentPaddingStyle}"></div>
                </div>
            `}
        `;
    }

    /**
     * Normalize a badge config value into { text, variant } or null.
     * Accepts: number, string, { text, variant }, or falsy → null.
     * @param {*} badge
     * @returns {{text: string, variant: string} | null}
     * @private
     */
    _normalizeBadge(badge) {
        if (badge === null || badge === undefined || badge === false || badge === '') return null;
        if (typeof badge === 'number' || typeof badge === 'string') {
            return { text: String(badge), variant: 'muted' };
        }
        if (typeof badge === 'object' && badge.text !== undefined && badge.text !== null && badge.text !== '') {
            const variant = badge.variant || 'muted';
            return { text: String(badge.text), variant };
        }
        return null;
    }

    /**
     * Render a badge HTML fragment for a section config.
     * @param {object} config
     * @returns {string}
     * @private
     */
    _renderBadge(config) {
        const badge = this._normalizeBadge(config.badge);
        if (!badge) return '';
        return `<span class="snv-badge snv-badge-${this.escapeHtml(badge.variant)}">${this.escapeHtml(badge.text)}</span>`;
    }

    /**
     * Build sidebar navigation HTML
     * @returns {string}
     * @private
     */
    _buildSidebarNav() {
        return this.sectionConfigs.map(config => {
            if (config.type === 'divider') {
                return `<div class="snv-nav-label">${this.escapeHtml(config.label)}</div>`;
            }
            const isActive = config.key === this.activeSection;
            const icon = config.icon ? `<i class="bi ${this.escapeHtml(config.icon)}"></i>` : '';
            const badge = this._renderBadge(config);
            return `<a role="button" class="${isActive ? 'active' : ''}" data-action="navigate" data-section="${this.escapeHtml(config.key)}">${icon} ${this.escapeHtml(config.label)}${badge}</a>`;
        }).join('');
    }

    /**
     * Build dropdown navigation HTML (responsive mode)
     * @returns {string}
     * @private
     */
    _buildDropdownNav() {
        const activeConfig = this.sectionConfigs.find(c => c.key === this.activeSection);
        const activeLabel = activeConfig ? activeConfig.label : this.sectionKeys[0];

        const items = this.sectionConfigs
            .filter(c => c.type !== 'divider')
            .map(config => {
                const isActive = config.key === this.activeSection;
                const badge = this._renderBadge(config);
                return `
                    <li>
                        <button class="dropdown-item ${isActive ? 'active' : ''}"
                                data-action="navigate"
                                data-section="${this.escapeHtml(config.key)}"
                                type="button">
                            ${config.icon ? `<i class="bi ${this.escapeHtml(config.icon)} me-2"></i>` : ''}
                            ${this.escapeHtml(config.label)}
                            ${badge}
                            ${isActive ? '<i class="bi bi-check-lg ms-2"></i>' : ''}
                        </button>
                    </li>
                `;
            }).join('');

        return `
            <div class="dropdown">
                <button class="snv-select-btn" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false">
                    ${activeConfig?.icon ? `<i class="bi ${activeConfig.icon}"></i>` : ''}
                    <span>${this.escapeHtml(activeLabel)}</span>
                </button>
                <ul class="dropdown-menu w-100">${items}</ul>
            </div>
        `;
    }

    // ───────────────────────────────────────────────
    // Lifecycle
    // ───────────────────────────────────────────────

    async onAfterRender() {
        await super.onAfterRender();

        // Mount the active section
        if (this.activeSection) {
            await this._mountSection(this.activeSection);
        }

        // Set up responsive behavior
        if (this.enableResponsive) {
            this._setupResponsive();
        }
    }

    async onBeforeDestroy() {
        await super.onBeforeDestroy();

        // Clean up resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this.handleResize);
        }

        // Destroy all section views
        for (const view of Object.values(this.sectionViews)) {
            if (view && typeof view.destroy === 'function') {
                await view.destroy();
            }
        }
    }

    // ───────────────────────────────────────────────
    // Section switching
    // ───────────────────────────────────────────────

    /**
     * Navigate to a section
     * @param {string} key - Section key
     * @returns {Promise<boolean>}
     */
    async showSection(key) {
        if (!this.sectionViews[key]) {
            console.warn(`SideNavView: Section "${key}" does not exist`);
            return false;
        }

        if (key === this.activeSection) {
            // Already active — but ensure it's mounted
            const view = this.sectionViews[key];
            if (view && view.isMounted() && this.element?.contains(view.element)) {
                return true;
            }
        }

        const previousSection = this.activeSection;
        this.activeSection = key;

        // Unmount previous section
        if (previousSection && previousSection !== key) {
            await this._unmountSection(previousSection);
        }

        // Mount new section
        await this._mountSection(key);

        // Call onSectionActivated hook after the view is mounted and visible
        const activeView = this.sectionViews[key];
        if (activeView?.onSectionActivated) {
            await activeView.onSectionActivated();
        }

        // Update nav visual state
        this._updateNavState(key);

        this.emit('section:changed', {
            activeSection: key,
            previousSection
        });

        return true;
    }

    /**
     * Mount a section view into the content area
     * @param {string} key - Section key
     * @private
     */
    async _mountSection(key) {
        const view = this.sectionViews[key];
        if (!view) return;

        const container = this.element?.querySelector('[data-container="snv-content"]');
        if (!container) return;

        if (!view.isMounted()) {
            this._showContentLoading(container);
            try {
                await view.render(true, container);
            } finally {
                this._hideContentLoading(container);
            }
        }
    }

    /**
     * Show a lightweight spinner in the content panel
     * @param {HTMLElement} container
     * @private
     */
    _showContentLoading(container) {
        if (!container) return;
        let spinner = container.querySelector('.snv-loading');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.className = 'snv-loading';
            spinner.innerHTML = '<div class="spinner-border spinner-border-sm text-secondary" role="status"><span class="visually-hidden">Loading...</span></div>';
            spinner.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:3rem;';
            container.prepend(spinner);
        }
    }

    /**
     * Remove the content panel spinner
     * @param {HTMLElement} container
     * @private
     */
    _hideContentLoading(container) {
        if (!container) return;
        const spinner = container.querySelector('.snv-loading');
        if (spinner) spinner.remove();
    }

    /**
     * Unmount a section view
     * @param {string} key - Section key
     * @private
     */
    async _unmountSection(key) {
        const view = this.sectionViews[key];
        if (!view || !view.isMounted()) return;

        await view.unmount();
    }

    /**
     * Update nav link active state
     * @param {string} activeKey - Active section key
     * @private
     */
    _updateNavState(activeKey) {
        if (!this.element) return;

        // Update sidebar links
        this.element.querySelectorAll('.snv-nav a, .dropdown-item').forEach(link => {
            const section = link.dataset.section;
            if (section) {
                link.classList.toggle('active', section === activeKey);
            }
        });

        // Update dropdown button label
        const selectBtn = this.element.querySelector('.snv-select-btn span');
        if (selectBtn) {
            const config = this.sectionConfigs.find(c => c.key === activeKey);
            if (config) {
                selectBtn.textContent = config.label;
            }
        }
    }

    // ───────────────────────────────────────────────
    // Action handlers
    // ───────────────────────────────────────────────

    async onActionNavigate(event, el) {
        event.preventDefault();
        const section = el.dataset.section;
        if (section) {
            await this.showSection(section);
        }
        return true;
    }

    // ───────────────────────────────────────────────
    // Responsive
    // ───────────────────────────────────────────────

    /**
     * Set up responsive width detection
     * @private
     */
    _setupResponsive() {
        if (!this.element || !this.enableResponsive) return;

        this._updateMode();

        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });
            const container = this.element.parentElement || this.element;
            this.resizeObserver.observe(container);
        } else {
            window.addEventListener('resize', this.handleResize);
        }
    }

    /**
     * Handle resize events
     */
    async handleResize() {
        const containerWidth = this._getContainerWidth();
        if (Math.abs(containerWidth - this.lastContainerWidth) > 50) {
            this.lastContainerWidth = containerWidth;
            await this._updateMode();
        }
    }

    /**
     * Get the container width
     * @returns {number}
     * @private
     */
    _getContainerWidth() {
        if (!this.element) return this.minWidth;
        const container = this.element.parentElement || this.element;
        return container.offsetWidth || this.minWidth;
    }

    /**
     * Check and switch between sidebar and dropdown modes
     * @private
     */
    async _updateMode() {
        const containerWidth = this._getContainerWidth();
        const newMode = containerWidth < this.minWidth ? 'dropdown' : 'sidebar';

        if (newMode !== this.currentMode) {
            this.currentMode = newMode;
            if (this.isMounted()) {
                await this.render();
            }
            this.emit('navigation:modeChanged', {
                mode: this.currentMode,
                containerWidth
            });
        }
    }

    // ───────────────────────────────────────────────
    // Public API
    // ───────────────────────────────────────────────

    /**
     * Get the active section key
     * @returns {string|null}
     */
    getActiveSection() {
        return this.activeSection;
    }

    /**
     * Get all navigable section keys
     * @returns {string[]}
     */
    getSectionKeys() {
        return [...this.sectionKeys];
    }

    /**
     * Get a section's view by key
     * @param {string} key - Section key
     * @returns {View|null}
     */
    getSection(key) {
        return this.sectionViews[key] || null;
    }

    /**
     * Add a section dynamically
     * @param {object} config - Section config
     * @param {boolean} makeActive - Whether to activate the section
     * @returns {Promise<boolean>}
     */
    async addSection(config, makeActive = false) {
        if (config.key && this.sectionViews[config.key]) {
            console.warn(`SideNavView: Section "${config.key}" already exists`);
            return false;
        }

        this._addSectionConfig(config);

        if (this.isMounted()) {
            await this.render();
            if (makeActive && config.key) {
                await this.showSection(config.key);
            }
        }

        this.emit('section:added', { config });
        return true;
    }

    /**
     * Remove a section dynamically
     * @param {string} key - Section key to remove
     * @returns {Promise<boolean>}
     */
    async removeSection(key) {
        const view = this.sectionViews[key];
        if (!view) {
            console.warn(`SideNavView: Section "${key}" does not exist`);
            return false;
        }

        // Destroy the view
        if (typeof view.destroy === 'function') {
            await view.destroy();
        }

        // Remove from data structures
        delete this.sectionViews[key];
        this.sectionKeys = this.sectionKeys.filter(k => k !== key);
        this.sectionConfigs = this.sectionConfigs.filter(c => c.key !== key);

        // Handle active section removal
        if (this.activeSection === key) {
            this.activeSection = this.sectionKeys[0] || null;
        }

        if (this.isMounted()) {
            await this.render();
        }

        this.emit('section:removed', { key });
        return true;
    }

    /**
     * Update a section's badge dynamically without re-rendering the whole nav.
     * Accepts the same shapes as the schema: number, string, { text, variant }, or falsy to clear.
     * @param {string} key - Section key
     * @param {*} value - Badge value
     * @returns {boolean} true if the section exists and was updated
     */
    setBadge(key, value) {
        const config = this.sectionConfigs.find(c => c.key === key);
        if (!config) return false;

        config.badge = value;

        if (!this.element) return true; // not rendered yet — schema update is enough

        // Update both sidebar (<a>) and dropdown-item (<button>) instances
        const links = this.element.querySelectorAll(`[data-section="${key}"]`);
        links.forEach(link => {
            const existing = link.querySelector('.snv-badge');
            const html = this._renderBadge(config);
            if (existing) existing.remove();
            if (html) link.insertAdjacentHTML('beforeend', html);
        });
        return true;
    }

    /**
     * Prevent model changes from triggering a full re-render.
     * Section views manage their own model reactivity.
     */
    _onModelChange() {
        // no-op — same pattern as UserView
    }

    static create(options = {}) {
        return new SideNavView(options);
    }
}

export default SideNavView;
