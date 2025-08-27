/**
 * TabView - Simple tabbed interface component for MOJO framework
 * Displays multiple views in a tabbed interface with clean navigation
 *
 * Features:
 * - Simple tab-based navigation
 * - Child view management with proper mounting/unmounting
 * - Bootstrap 5 styling
 * - Keyboard navigation support
 * - Event-driven tab switching
 *
 * Example Usage:
 * ```javascript
 * const tabView = new TabView({
 *   tabs: {
 *     'Profile': new UserProfileView({ data: userData }),
 *     'Settings': new UserSettingsView({ data: settings }),
 *     'Activity': new UserActivityView({ data: activity })
 *   },
 *   activeTab: 'Profile' // Optional: set initial active tab
 * });
 * ```
 */

import View from '../core/View.js';

class TabView extends View {
  constructor(options = {}) {
    const {
      tabs,
      activeTab,
      tabsClass,
      contentClass,
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: 'tab-view',
      ...viewOptions
    });

    // Tab configuration
    this.tabs = tabs || {};
    this.tabLabels = Object.keys(this.tabs);
    this.activeTab = activeTab || this.tabLabels[0] || null;

    // CSS classes
    this.tabsClass = tabsClass || 'nav nav-tabs mb-3';
    this.contentClass = contentClass || 'tab-content';

    // Validate tabs
    if (this.tabLabels.length === 0) {
      console.warn('TabView: No tabs provided');
    }

    // Initialize tabs by adding them as child views
    for (const [label, view] of Object.entries(this.tabs)) {
        this.addTab(label, view);
    }
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
   * Build the tab navigation HTML
   * @returns {string} Tab navigation HTML
   */
  buildTabNavigation() {
    if (this.tabLabels.length === 0) {
      return '';
    }

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
      <ul class="${this.tabsClass}" role="tablist">
        ${tabItems}
      </ul>
    `;
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
  async showTab(tabLabel) {
    // Validate tab exists
    if (!this.tabs[tabLabel]) {
      console.warn(`TabView: Tab "${tabLabel}" does not exist`);
      return false;
    }

    // Skip if already active
    if (this.activeTab === tabLabel) {
      return true;
    }

    const previousTab = this.activeTab;
    this.activeTab = tabLabel;

    try {
      // Update tab navigation
      this.updateTabNavigation(tabLabel, previousTab);

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
  updateTabNavigation(activeTabLabel, previousTabLabel) {
    if (!this.element) return;

    // Remove active state from previous tab
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

    // Hide previous tab pane
    if (previousTabId) {
      const prevPane = this.element.querySelector(`#${previousTabId}`);
      if (prevPane) {
        prevPane.classList.remove('show', 'active');
      }
    }

    // Show active tab pane
    const activePane = this.element.querySelector(`#${activeTabId}`);
    if (activePane) {
      activePane.classList.add('show', 'active');
    }

    // Mount the active tab's view
    const activeView = this.tabs[activeTabLabel];
    if (activeView) {
      const container = this.element.querySelector(`[data-container="${activeTabId}-content"]`);
      if (container && !activeView.isMounted()) {
        await activeView.render(true, container);
      }
      if (activeView.onTabActivated) {
        await activeView.onTabActivated();
      }
    }
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
   * Initialize active tab after rendering
   */
  async onAfterRender() {
    await super.onAfterRender();

    // Show the active tab after initial render
    if (this.activeTab && this.tabs[this.activeTab]) {
      await this.showTab(this.activeTab);
    }
  }

  /**
   * Mount child views after tab view is mounted
   */
  async onAfterMount() {
    await super.onAfterMount();

    // Mount the initially active tab's view
    if (this.activeTab && this.tabs[this.activeTab]) {
      const activeTabId = this.getTabId(this.activeTab);
      const container = this.element.querySelector(`[data-container="${activeTabId}-content"]`);
      const activeView = this.tabs[this.activeTab];

      if (container && activeView && !activeView.isMounted()) {
        await activeView.mount(container);
      }
    }
  }

  /**
   * Clean up child views when destroying
   */
  async onBeforeDestroy() {
    await super.onBeforeDestroy();

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

    this.tabs[label] = view;
    this.addChild(view);
    view.containerId = this.getTabId(label);
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
   * Static factory method
   * @param {object} options - TabView options
   * @returns {TabView} New TabView instance
   */
  static create(options = {}) {
    return new TabView(options);
  }
}

export default TabView;
