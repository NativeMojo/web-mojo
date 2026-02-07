/**
 * TabView - Responsive tabbed interface component with smooth transitions
 * Displays multiple views in a tabbed interface with automatic responsive adaptation
 *
 * Features:
 * - Responsive tab navigation with automatic dropdown mode
 * - Smooth fade transitions between tabs (Bootstrap compatible)
 * - Child view management with proper mounting/unmounting
 * - Bootstrap 5 styling
 * - Keyboard navigation support
 * - Event-driven tab switching
 * - ResizeObserver for efficient responsive detection
 *
 * Example Usage:
 * ```javascript
 * const tabView = new TabView({
 *   tabs: {
 *     'Profile': new UserProfileView({ data: userData }),
 *     'Settings': new UserSettingsView({ data: settings }),
 *     'Activity': new UserActivityView({ data: activity })
 *   },
 *   activeTab: 'Profile',        // Optional: set initial active tab
 *   enableTransitions: true,     // Optional: enable fade transitions (default: true)
 *   transitionDuration: 150,     // Optional: transition duration in ms (default: 150)
 *   enableResponsive: true,      // Optional: enable responsive mode (default: true)
 *   dropdownStyle: 'select'      // Optional: 'select' or 'button' (default: 'select')
 * });
 * ```
 */

import View from '@core/View.js';

class TabView extends View {
  constructor(options = {}) {
    const {
      tabs,
      activeTab,
      tabsClass,
      contentClass,
      minWidth,
      enableResponsive,
      tabPadding,
      dropdownStyle, // 'button' (default) or 'select'
      enableTransitions, // Enable fade transitions (default: true)
      transitionDuration, // Transition duration in ms (default: 150, Bootstrap default)
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: 'tab-view',
      ...viewOptions
    });

    // Tab configuration
    this.tabs = {};
    this.tabLabels = Object.keys(this.tabs);
    this.activeTab = activeTab || this.tabLabels[0] || null;

    // CSS classes
    this.tabsClass = tabsClass || 'nav nav-tabs mb-3';
    this.contentClass = contentClass || 'tab-content';

    // Transition configuration
    this.enableTransitions = enableTransitions !== false; // Default to enabled
    this.transitionDuration = transitionDuration || 150; // Bootstrap default

    // Responsive configuration
    this.dropdownStyle = dropdownStyle || 'select'; // 'button' or 'select'
    this.minWidth = minWidth || 300; // Minimum width before switching to dropdown
    this.enableResponsive = enableResponsive !== false; // Default to enabled
    this.tabPadding = tabPadding || 80; // Estimated padding per tab (16px * 2)
    this.currentMode = 'tabs'; // 'tabs' or 'dropdown'

    // Width calculation cache
    this.tabWidthCache = new Map();
    this.lastContainerWidth = 0;
    this.resizeObserver = null;
    this._measurementSpan = null; // Reusable measurement element
    this._tabComputedStyle = null; // To store computed styles



    // State tracking
    this.isMobileMode = false;
    this.hasOverflow = false;

    // Initialize tabs by adding them as child views
    for (const [label, view] of Object.entries(tabs)) {
        this.addTab(label, view);
    }

    // Bind resize handler
    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * Render the tab navigation and content areas
   */
  async renderTemplate() {
    const tabNavigation = this.buildTabNavigation();
    const tabContent = this.buildTabContent();

    return `
      <div class="tab-view-container">
        ${tabNavigation}
        ${tabContent}
      </div>
    `;
  }

  /**
   * Build the tab navigation HTML - supports both tab and dropdown modes
   * @returns {string} Tab navigation HTML
   */
  buildTabNavigation() {
    if (this.tabLabels.length === 0) {
      return '';
    }

    if (this.currentMode === 'dropdown') {
      return this.buildDropdownNavigation();
    } else {
      return this.buildTabsNavigation();
    }
  }

  /**
   * Build traditional tab navigation
   * @returns {string} Tab navigation HTML
   */
  buildTabsNavigation() {
    const tabItems = this.tabLabels.map(label => {
      const isActive = label === this.activeTab;
      const tabId = this.getTabId(label);

      return `
        <li class="nav-item" role="presentation">
          <button class="nav-link ${isActive ? 'active' : ''}"
                  id="${tabId}-tab"
                  data-action="show-tab"
                  data-tab-label="${this.escapeHtml(label)}"
                  type="button"
                  role="tab"
                  aria-controls="${tabId}"
                  aria-selected="${isActive}">
            ${this.escapeHtml(label)}
          </button>
        </li>
      `;
    }).join('');

    return `
      <ul class="${this.tabsClass}" role="tablist" data-tab-mode="tabs">
        ${tabItems}
      </ul>
    `;
  }

  /**
   * Build dropdown navigation for mobile/narrow screens
   * @returns {string} Dropdown navigation HTML
   */
  buildDropdownNavigation() {
    const activeLabel = this.activeTab || this.tabLabels[0];
    const dropdownItems = this.tabLabels.map(label => {
      const isActive = label === this.activeTab;
      return `
        <li>
          <button class="dropdown-item ${isActive ? 'active' : ''}"
                  data-action="show-tab"
                  data-tab-label="${this.escapeHtml(label)}"
                  type="button">
            ${this.escapeHtml(label)}
            ${isActive ? '<i class="bi bi-check-lg ms-2"></i>' : ''}
          </button>
        </li>
      `;
    }).join('');

    let buttonHtml;
    if (this.dropdownStyle === 'select') {
      // New "select" style button
      buttonHtml = `
        <button class="btn tab-view-select-style dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                id="tab-dropdown-${this.id}">
          <span class="tab-view-select-label">${this.escapeHtml(activeLabel)}</span>
        </button>
      `;
    } else {
      // Original "button" style
      buttonHtml = `
        <button class="btn btn-outline-secondary dropdown-toggle w-100 w-sm-auto"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                id="tab-dropdown-${this.id}">
          <i class="bi bi-list me-2"></i>
          ${this.escapeHtml(activeLabel)}
        </button>
      `;
    }

    return `
      <div class="dropdown mb-3" data-tab-mode="dropdown">
        ${buttonHtml}
        <ul class="dropdown-menu" aria-labelledby="tab-dropdown-${this.id}">
          ${dropdownItems}
        </ul>
      </div>
    `;
  }

  /**
   * Build mobile dropdown navigation
   * @returns {string} Mobile dropdown HTML
   */
  buildMobileDropdownNavigation() {
    const activeLabel = this.activeTab || this.tabLabels[0];
    const dropdownItems = this.tabLabels.map(label => {
      const isActive = label === this.activeTab;
      return `
        <li>
          <button class="dropdown-item ${isActive ? 'active' : ''}"
                  data-action="show-tab"
                  data-tab-label="${this.escapeHtml(label)}"
                  type="button">
            ${this.escapeHtml(label)}
            ${isActive ? '<i class="bi bi-check ms-2"></i>' : ''}
          </button>
        </li>
      `;
    }).join('');

    return `
      <div class="dropdown mb-3" data-tab-navigation="mobile">
        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false">
          <i class="bi bi-list me-2"></i>
          ${this.escapeHtml(activeLabel)}
        </button>
        <ul class="dropdown-menu w-100">
          ${dropdownItems}
        </ul>
      </div>
    `;
  }

  /**
   * Determine if mobile dropdown should be used
   * @returns {boolean} True if mobile dropdown should be used
   */
  shouldUseMobileDropdown() {
    if (!this.enableMobileDropdown) return false;

    // Check viewport width
    const viewportWidth = window.innerWidth;
    if (viewportWidth < this.mobileBreakpoint) {
      return true;
    }

    // Check for overflow in desktop mode
    return this.hasOverflow && viewportWidth < 992; // Bootstrap lg breakpoint
  }

  /**
   * Build the tab content area HTML
   * @returns {string} Tab content HTML
   */
  buildTabContent() {
    if (this.tabLabels.length === 0) {
      return '<div class="alert alert-info">No tabs to display</div>';
    }

    const tabPanes = this.tabLabels.map(label => {
      const isActive = label === this.activeTab;
      const tabId = this.getTabId(label);

      return `
        <div class="tab-pane fade ${isActive ? 'show active' : ''}"
             id="${tabId}"
             role="tabpanel"
             aria-labelledby="${tabId}-tab"
             data-tab-label="${this.escapeHtml(label)}">
          <div data-container="${tabId}-content"></div>
        </div>
      `;
    }).join('');

    return `
      <div class="${this.contentClass}">
        ${tabPanes}
      </div>
    `;
  }

  /**
   * Generate a safe DOM ID for a tab
   * @param {string} label - Tab label
   * @returns {string} Safe DOM ID
   */
  getTabId(label) {
    return `tab-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${this.id}`;
  }

  /**
   * Show a specific tab
   * @param {string} tabLabel - Label of the tab to show
   * @returns {Promise<boolean>} True if tab was shown successfully
   */
  async showTab(tabLabel, options = {}) {
    const { force = false } = options;

    // Validate tab exists
    if (!this.tabs[tabLabel]) {
      console.warn(`TabView: Tab "${tabLabel}" does not exist`);
      return false;
    }

    // Skip if already active and not being forced
    // This prevents re-rendering the same tab on repeated clicks, but allows
    // for forced re-mounting after a parent view render.
    if (this.activeTab === tabLabel && !force) {
      // As a safeguard, ensure the view is actually in the DOM.
      // If not, proceed to re-mount it.
      const activeView = this.tabs[tabLabel];
      if (activeView && activeView.isMounted() && this.element.contains(activeView.element)) {
        return true;
      }
    }

    const previousTab = this.activeTab;
    this.activeTab = tabLabel;

    try {
      // Update tab navigation
      await this.updateTabNavigation(tabLabel, previousTab);

      // Update tab content
      await this.updateTabContent(tabLabel, previousTab);

      // Emit tab change event
      this.emit('tab:changed', {
        activeTab: tabLabel,
        previousTab: previousTab
      });

      return true;
    } catch (error) {
      console.error('TabView: Error showing tab:', error);
      this.activeTab = previousTab; // Revert on error
      return false;
    }
  }

  /**
   * Update tab navigation visual state
   * @param {string} activeTabLabel - New active tab
   * @param {string} previousTabLabel - Previous active tab
   */
  async updateTabNavigation(activeTabLabel, previousTabLabel) {
    if (!this.element) return;

    // In dropdown mode, re-render the navigation to update the button label and items
    if (this.currentMode === 'dropdown') {
      await this.reRenderNavigation();
      return; // Re-rendering handles all visual updates for navigation
    }

    // In tabs mode, just toggle classes for efficiency
    if (previousTabLabel) {
      const prevTabButton = this.element.querySelector(`[data-tab-label="${previousTabLabel}"]`);
      if (prevTabButton) {
        prevTabButton.classList.remove('active');
        prevTabButton.setAttribute('aria-selected', 'false');
      }
    }

    // Add active state to new tab
    const activeTabButton = this.element.querySelector(`[data-tab-label="${activeTabLabel}"]`);
    if (activeTabButton) {
      activeTabButton.classList.add('active');
      activeTabButton.setAttribute('aria-selected', 'true');
    }
  }

  /**
   * Update tab content area and manage child views
   * @param {string} activeTabLabel - New active tab
   * @param {string} previousTabLabel - Previous active tab
   */
  async updateTabContent(activeTabLabel, previousTabLabel) {
    if (!this.element) return;

    const activeTabId = this.getTabId(activeTabLabel);
    const previousTabId = previousTabLabel ? this.getTabId(previousTabLabel) : null;

    const activePane = this.element.querySelector(`#${activeTabId}`);
    const prevPane = previousTabId ? this.element.querySelector(`#${previousTabId}`) : null;

    // Handle transitions if enabled
    if (this.enableTransitions) {
      // Start fade-out transition for previous pane
      if (prevPane && prevPane.classList.contains('show')) {
        // Remove 'show' to trigger fade-out (but keep 'active' so it stays visible during transition)
        prevPane.classList.remove('show');
        
        // Wait for fade-out transition to complete
        await new Promise(resolve => {
          const duration = this._getTransitionDuration(prevPane) || this.transitionDuration;
          setTimeout(resolve, duration);
        });
        
        // Now remove 'active' to fully hide the pane
        prevPane.classList.remove('active');
      }

      // Mount the active tab's view before showing it (prevents flash of empty content)
      const activeView = this.tabs[activeTabLabel];
      if (activeView) {
        const container = this.element.querySelector(`[data-container="${activeTabId}-content"]`);
        if (container && !activeView.isMounted()) {
          await activeView.render(true, container);
        }
      }

      // Start fade-in transition for active pane
      if (activePane) {
        // Add 'active' to make it the active pane (but not visible yet)
        activePane.classList.add('active');
        
        // Force reflow to ensure the 'active' class is applied before 'show'
        // This is necessary for CSS transitions to work properly
        void activePane.offsetHeight;
        
        // Add 'show' to trigger fade-in transition
        activePane.classList.add('show');
      }
    } else {
      // No transitions - instant switch
      if (prevPane) {
        prevPane.classList.remove('show', 'active');
      }

      // Mount the active tab's view
      const activeView = this.tabs[activeTabLabel];
      if (activeView) {
        const container = this.element.querySelector(`[data-container="${activeTabId}-content"]`);
        if (container && !activeView.isMounted()) {
          await activeView.render(true, container);
        }
      }

      if (activePane) {
        activePane.classList.add('show', 'active');
      }
    }

    // Call onTabActivated hook after the view is mounted and visible
    if (activeView && activeView.onTabActivated) {
      await activeView.onTabActivated();
    }
  }

  /**
   * Get CSS transition duration for an element
   * @param {HTMLElement} element - Element to check
   * @returns {number} Transition duration in milliseconds
   * @private
   */
  _getTransitionDuration(element) {
    if (!element || typeof window === 'undefined' || !window.getComputedStyle) {
      return 0;
    }

    const computedStyle = window.getComputedStyle(element);
    const duration = computedStyle.transitionDuration || '0s';
    
    // Parse duration (can be in seconds or milliseconds)
    const matches = duration.match(/^([0-9.]+)(m?s)$/);
    if (!matches) return 0;
    
    const value = parseFloat(matches[1]);
    const unit = matches[2];
    
    // Convert to milliseconds
    return unit === 's' ? value * 1000 : value;
  }

  /**
   * Handle tab click events
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Clicked element
   */
  async onActionShowTab(event, element) {
    const tabLabel = element.getAttribute('data-tab-label');
    if (tabLabel) {
      await this.showTab(tabLabel);
    }
  }

  /**
   * Initialize measurement styles by reading computed styles from a rendered tab
   */
  _initializeMeasurementStyles() {
    if (!this.element || this._tabComputedStyle) return;

    const tabButton = this.element.querySelector('.nav-link');
    if (tabButton && typeof window.getComputedStyle === 'function') {
      const style = window.getComputedStyle(tabButton);
      this._tabComputedStyle = {
        font: style.font,
        letterSpacing: style.letterSpacing,
      };

      // Calculate horizontal padding from computed styles
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      this.tabPadding = paddingLeft + paddingRight + 12; // Update with real value
    }
  }

  /**
   * Initialize active tab after rendering
   */
  async onAfterRender() {
    await super.onAfterRender();

    // Initialize styles for accurate width calculation before setting up responsive handling
    this._initializeMeasurementStyles();

    // Set up responsive behavior
    if (this.enableResponsive) {
      this.setupResponsiveHandling();
    }

    // Show the active tab after initial render. Forcing ensures the content is
    // correctly re-mounted if the TabView itself was re-rendered.
    if (this.activeTab && this.tabs[this.activeTab]) {
      await this.showTab(this.activeTab, { force: true });
    }
  }

  /**
   * Mount child views after tab view is mounted
   */
  async onAfterMount() {
    await super.onAfterMount();

    // The active tab's content is now mounted via the onAfterRender -> showTab flow,
    // which correctly handles both initial renders and subsequent re-renders.
    // The logic previously here was redundant.
  }

  /**
   * Clean up child views when destroying
   */
  async onBeforeDestroy() {
    await super.onBeforeDestroy();

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove window resize listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }

    // Remove measurement span if it exists
    if (this._measurementSpan && this._measurementSpan.parentElement) {
      this._measurementSpan.parentElement.removeChild(this._measurementSpan);
    }
    this._measurementSpan = null;

    // Destroy all child tab views
    for (const [label, view] of Object.entries(this.tabs)) {
      if (view && typeof view.destroy === 'function') {
        await view.destroy();
      }
    }
  }

  /**
   * Get the currently active tab label
   * @returns {string|null} Active tab label
   */
  getActiveTab() {
    return this.activeTab;
  }

  /**
   * Get all tab labels
   * @returns {string[]} Array of tab labels
   */
  getTabLabels() {
    return [...this.tabLabels];
  }

  /**
   * Get a specific tab's view by label
   * @param {string} label - Tab label
   * @returns {View|null} The tab's view instance or null if not found
   */
  getTab(label) {
    return this.tabs[label] || null;
  }

  /**
   * Add a new tab
   * @param {string} label - Tab label
   * @param {View} view - View instance for tab content
   * @param {boolean} makeActive - Whether to make this tab active
   * @returns {Promise<boolean>} True if tab was added successfully
   */
  async addTab(label, view, makeActive = false) {
    if (this.tabs[label]) {
      console.warn(`TabView: Tab "${label}" already exists`);
      return false;
    }

    if (view.options.permissions && !this.getApp().activeUser.hasPerm(view.options.permissions)) {
      return false;
    }

    this.tabs[label] = view;
    // this.addChild(view);
    view.containerId = this.getTabId(label);
    view.parent = this;
    this.tabLabels = Object.keys(this.tabs);

    // Set as active tab if it's the first tab or explicitly requested
    if (!this.activeTab || makeActive) {
      this.activeTab = label;
    }

    // Re-render if mounted
    if (this.isMounted()) {
      await this.render();

      if (makeActive || this.activeTab === label) {
        await this.showTab(label);
      }
    }

    this.emit('tab:added', { label, view });
    return true;
  }

  /**
   * Remove a tab
   * @param {string} label - Tab label to remove
   * @returns {Promise<boolean>} True if tab was removed successfully
   */
  async removeTab(label) {
    if (!this.tabs[label]) {
      console.warn(`TabView: Tab "${label}" does not exist`);
      return false;
    }

    const view = this.tabs[label];

    // Destroy the view
    if (view && typeof view.destroy === 'function') {
      await view.destroy();
    }

    // Remove from tabs
    delete this.tabs[label];
    this.tabLabels = Object.keys(this.tabs);

    // Handle active tab removal
    if (this.activeTab === label) {
      this.activeTab = this.tabLabels[0] || null;
    }

    // Re-render if mounted
    if (this.isMounted()) {
      await this.render();

      if (this.activeTab) {
        await this.showTab(this.activeTab);
      }
    }

    this.emit('tab:removed', { label, view });
    return true;
  }

  /**
   * Calculate estimated width needed for a tab label
   * @param {string} label - Tab label text
   * @returns {number} Estimated width in pixels
   */
  calculateTabWidth(label) {
    if (this.tabWidthCache.has(label)) {
      return this.tabWidthCache.get(label);
    }

    // Fallback for non-browser environments
    if (typeof document === 'undefined') {
      const estimatedWidth = label.length * 8 + this.tabPadding; // Original fallback
      this.tabWidthCache.set(label, estimatedWidth);
      return estimatedWidth;
    }

    // Create a reusable measurement span if it doesn't exist
    if (!this._measurementSpan) {
      this._measurementSpan = document.createElement('span');
      this._measurementSpan.style.visibility = 'hidden';
      this._measurementSpan.style.position = 'absolute';
      this._measurementSpan.style.whiteSpace = 'nowrap';
    }

    const span = this._measurementSpan;

    // Apply computed styles if available, otherwise use defaults
    if (this._tabComputedStyle) {
      span.style.font = this._tabComputedStyle.font;
      span.style.letterSpacing = this._tabComputedStyle.letterSpacing;
    } else {
      // Fallback to original hardcoded styles if computed style not yet available
      span.style.fontSize = '14px';
      span.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    }

    span.textContent = label;
    document.body.appendChild(span);
    const width = span.offsetWidth + this.tabPadding;
    document.body.removeChild(span);

    this.tabWidthCache.set(label, width);
    return width;
  }

  /**
   * Calculate total width needed for all tabs
   * @returns {number} Total width in pixels
   */
  getTotalTabWidth() {
    return this.tabLabels.reduce((total, label) => {
      return total + this.calculateTabWidth(label);
    }, 0);
  }

  /**
   * Get current container width
   * @returns {number} Container width in pixels
   */
  getContainerWidth() {
    if (!this.element) {
      return this.minWidth;
    }

    const container = this.element.parentElement || this.element;
    return container.offsetWidth || this.minWidth;
  }

  /**
   * Determine if dropdown mode should be used
   * @returns {boolean} True if dropdown mode should be used
   */
  shouldUseDropdown() {
    if (!this.enableResponsive) {
      return false;
    }

    const containerWidth = this.getContainerWidth();
    const totalTabWidth = this.getTotalTabWidth();

    // Use dropdown if tabs would overflow or container is too narrow
    return containerWidth < Math.max(totalTabWidth, this.minWidth);
  }

  /**
   * Setup responsive handling with ResizeObserver
   */
  setupResponsiveHandling() {
    if (!this.element || !this.enableResponsive) {
      return;
    }

    // Set initial mode
    this.updateNavigationMode();

    // Use ResizeObserver for better performance
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });

      const container = this.element.parentElement || this.element;
      this.resizeObserver.observe(container);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', this.handleResize);
    }
  }

  /**
   * Handle resize events
   */
  async handleResize() {
    const containerWidth = this.getContainerWidth();

    // Only update if width changed significantly (avoid excessive updates)
    if (Math.abs(containerWidth - this.lastContainerWidth) > 50) {
      this.lastContainerWidth = containerWidth;
      await this.updateNavigationMode();
    }
  }

  /**
   * Update navigation mode based on current space
   */
  async updateNavigationMode() {
    const shouldUseDropdown = this.shouldUseDropdown();
    const newMode = shouldUseDropdown ? 'dropdown' : 'tabs';

    if (newMode !== this.currentMode) {
      this.currentMode = newMode;

      // Re-render navigation if mounted
      if (this.isMounted()) {
        await this.reRenderNavigation();
      }

      // Emit mode change event
      this.emit('navigation:modeChanged', {
        mode: this.currentMode,
        containerWidth: this.getContainerWidth(),
        totalTabWidth: this.getTotalTabWidth()
      });
    }
  }

  /**
   * Re-render just the navigation part
   */
  async reRenderNavigation() {
    if (!this.element) return;

    const navigationContainer = this.element.querySelector('[data-tab-mode]');
    if (navigationContainer) {
      const newNavigation = this.buildTabNavigation();
      navigationContainer.outerHTML = newNavigation;
    }
  }

  /**
   * Get current navigation mode
   * @returns {string} Current mode ('tabs' or 'dropdown')
   */
  getNavigationMode() {
    return this.currentMode;
  }

  /**
   * Force a specific navigation mode
   * @param {string} mode - 'tabs' or 'dropdown'
   */
  async setNavigationMode(mode) {
    if (mode !== 'tabs' && mode !== 'dropdown') {
      console.warn('TabView: Invalid navigation mode. Use "tabs" or "dropdown"');
      return;
    }

    this.currentMode = mode;

    if (this.isMounted()) {
      await this.reRenderNavigation();
    }
  }

  /**
   * Clear the tab width cache (useful when tab labels change)
   */
  clearWidthCache() {
    this.tabWidthCache.clear();
  }

  /**
   * Static factory method
   * @param {object} options - TabView options
   * @returns {TabView} New TabView instance
   */
  static create(options = {}) {
    return new TabView(options);
  }
}

export default TabView;
