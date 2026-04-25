import { Page, TabView, Dialog } from 'web-mojo';
import View from '@core/View.js';

/**
 * TabViewPage - Demonstrates TabView features and usage
 */
class TabViewPage extends Page {
  static pageName = 'TabView Demo';
  static title = 'TabView Component';
  static icon = 'ui-checks-grid';
  static route = 'tabview';

  constructor(options = {}) {
    super({
      ...options,
      tagName: 'div',
      className: 'tabview-page container-fluid py-4'
    });
    
    this.dynamicTabCounter = 3;
  }

  async renderTemplate() {
    return `
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="h2">
              <i class="bi bi-ui-checks-grid me-2"></i>
              TabView Component Demo
            </h1>
          </div>

          <div class="alert alert-info mb-4">
            <i class="bi bi-info-circle me-2"></i>
            <strong>About TabView:</strong> A responsive tabbed interface component that automatically adapts to screen size,
            switching between horizontal tabs and dropdown navigation on smaller screens.
          </div>

          <!-- Basic Example -->
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">
                <i class="bi bi-1-circle me-2"></i>
                Basic Tabbed Interface
              </h5>
            </div>
            <div class="card-body">
              <p class="text-muted">Simple tabbed interface with three tabs and smooth transitions.</p>
              <div id="basic-tabs-container"></div>
            </div>
          </div>

          <!-- Responsive Example -->
          <div class="card mb-4">
            <div class="card-header bg-success text-white">
              <h5 class="mb-0">
                <i class="bi bi-2-circle me-2"></i>
                Responsive Tabs (Resize to See Dropdown)
              </h5>
            </div>
            <div class="card-body">
              <p class="text-muted">
                This tab view has many tabs and will automatically switch to dropdown mode when space is limited.
                <strong>Try resizing your browser window!</strong>
              </p>
              <div id="responsive-tabs-container"></div>
            </div>
          </div>

          <!-- Dynamic Tab Management -->
          <div class="card mb-4">
            <div class="card-header bg-warning text-dark">
              <h5 class="mb-0">
                <i class="bi bi-3-circle me-2"></i>
                Dynamic Tab Management
              </h5>
            </div>
            <div class="card-body">
              <p class="text-muted">Add and remove tabs programmatically.</p>
              <div class="mb-3">
                <button class="btn btn-primary btn-sm me-2" data-action="add-dynamic-tab">
                  <i class="bi bi-plus-circle me-1"></i> Add Tab
                </button>
                <button class="btn btn-danger btn-sm" data-action="remove-dynamic-tab">
                  <i class="bi bi-dash-circle me-1"></i> Remove Last Tab
                </button>
              </div>
              <div id="dynamic-tabs-container"></div>
            </div>
          </div>

          <!-- Transition Styles -->
          <div class="card mb-4">
            <div class="card-header bg-info text-white">
              <h5 class="mb-0">
                <i class="bi bi-4-circle me-2"></i>
                Transition Effects
              </h5>
            </div>
            <div class="card-body">
              <p class="text-muted">TabView supports smooth fade transitions between tabs.</p>
              <div id="transition-tabs-container"></div>
            </div>
          </div>

          <!-- Dropdown Styles -->
          <div class="card mb-4">
            <div class="card-header bg-danger text-white">
              <h5 class="mb-0">
                <i class="bi bi-5-circle me-2"></i>
                Dropdown Styles (Button vs Select)
              </h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <h6>Button Style (Default)</h6>
                  <p class="text-muted small">Uses Bootstrap dropdown button</p>
                  <div id="button-dropdown-tabs-container"></div>
                </div>
                <div class="col-md-6 mb-3">
                  <h6>Select Style</h6>
                  <p class="text-muted small">Uses native select element</p>
                  <div id="select-dropdown-tabs-container"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- View Lifecycle Example -->
          <div class="card mb-4">
            <div class="card-header bg-secondary text-white">
              <h5 class="mb-0">
                <i class="bi bi-6-circle me-2"></i>
                View Lifecycle & Tab Activation
              </h5>
            </div>
            <div class="card-body">
              <p class="text-muted">
                Views can implement <code>onTabActivated()</code> to load data when the tab becomes active.
                Check the console to see lifecycle events.
              </p>
              <div id="lifecycle-tabs-container"></div>
              <div class="mt-3">
                <h6>Event Log:</h6>
                <div id="event-log" class="bg-light p-3 rounded" style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 0.85rem;">
                  <div class="text-muted">Events will appear here...</div>
                </div>
              </div>
            </div>
          </div>

          <!-- API Methods -->
          <div class="card mb-4">
            <div class="card-header bg-dark text-white">
              <h5 class="mb-0">
                <i class="bi bi-7-circle me-2"></i>
                API Methods Demo
              </h5>
            </div>
            <div class="card-body">
              <p class="text-muted">Interact with TabView programmatically using its API.</p>
              <div class="mb-3">
                <button class="btn btn-primary btn-sm me-2" data-action="api-show-tab-2">Show Tab 2</button>
                <button class="btn btn-success btn-sm me-2" data-action="api-get-active">Get Active Tab</button>
                <button class="btn btn-info btn-sm me-2" data-action="api-get-labels">Get All Labels</button>
                <button class="btn btn-warning btn-sm" data-action="api-get-mode">Get Nav Mode</button>
              </div>
              <div id="api-tabs-container"></div>
              <div class="mt-3" id="api-result"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async onInit() {
    await super.onInit();
    
    // Initialize all tab examples as child views
    this.initBasicTabs();
    this.initResponsiveTabs();
    this.initDynamicTabs();
    this.initTransitionTabs();
    this.initDropdownStyleTabs();
    this.initLifecycleTabs();
    this.initApiTabs();
  }

  // ===================================
  // Example 1: Basic Tabs
  // ===================================
  initBasicTabs() {
    const basicTabs = new TabView({
      containerId: 'basic-tabs-container',
      tabs: {
        'Profile': new View({
          template: `
            <div class="p-4">
              <h4><i class="bi bi-person-circle me-2"></i>User Profile</h4>
              <p>This is the profile tab content. Here you would display user information.</p>
              <div class="card">
                <div class="card-body">
                  <h5>John Doe</h5>
                  <p class="text-muted mb-1">john.doe@example.com</p>
                  <p class="text-muted">Member since: January 2024</p>
                  <button class="btn btn-primary btn-sm">Edit Profile</button>
                </div>
              </div>
            </div>
          `
        }),
        'Settings': new View({
          template: `
            <div class="p-4">
              <h4><i class="bi bi-gear me-2"></i>Settings</h4>
              <p>Configure your preferences and account settings.</p>
              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="notifications" checked>
                <label class="form-check-label" for="notifications">
                  Enable email notifications
                </label>
              </div>
              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="darkMode">
                <label class="form-check-label" for="darkMode">
                  Dark mode
                </label>
              </div>
              <button class="btn btn-primary btn-sm">Save Settings</button>
            </div>
          `
        }),
        'Activity': new View({
          template: `
            <div class="p-4">
              <h4><i class="bi bi-clock-history me-2"></i>Recent Activity</h4>
              <p>View your recent actions and history.</p>
              <ul class="list-group">
                <li class="list-group-item">
                  <strong>Logged in</strong> - 2 hours ago
                </li>
                <li class="list-group-item">
                  <strong>Updated profile</strong> - Yesterday
                </li>
                <li class="list-group-item">
                  <strong>Changed password</strong> - 3 days ago
                </li>
              </ul>
            </div>
          `
        })
      },
      activeTab: 'Profile',
      enableTransitions: true
    });

    this.addChild(basicTabs);
  }

  // ===================================
  // Example 2: Responsive Tabs
  // ===================================
  initResponsiveTabs() {
    this.responsiveTabs = new TabView({
      containerId: 'responsive-tabs-container',
      tabs: {
        'Dashboard': new View({ template: '<div class="p-4"><h4>Dashboard</h4><p>Overview of your account metrics and statistics.</p></div>' }),
        'Analytics': new View({ template: '<div class="p-4"><h4>Analytics</h4><p>Detailed analytics and reporting tools.</p></div>' }),
        'Reports': new View({ template: '<div class="p-4"><h4>Reports</h4><p>Generate and view various reports.</p></div>' }),
        'Users': new View({ template: '<div class="p-4"><h4>Users</h4><p>Manage user accounts and permissions.</p></div>' }),
        'Settings': new View({ template: '<div class="p-4"><h4>Settings</h4><p>System configuration and preferences.</p></div>' }),
        'Logs': new View({ template: '<div class="p-4"><h4>Logs</h4><p>View system logs and activity.</p></div>' }),
        'Security': new View({ template: '<div class="p-4"><h4>Security</h4><p>Security settings and audit logs.</p></div>' }),
        'API': new View({ template: '<div class="p-4"><h4>API</h4><p>API keys and documentation.</p></div>' })
      },
      activeTab: 'Dashboard',
      enableResponsive: true,
      minWidth: 120,
      enableTransitions: true
    });

    this.addChild(this.responsiveTabs);
  }

  // ===================================
  // Example 3: Dynamic Tab Management
  // ===================================
  initDynamicTabs() {
    this.dynamicTabs = new TabView({
      containerId: 'dynamic-tabs-container',
      tabs: {
        'Tab 1': new View({ template: '<div class="p-4"><h4>Tab 1</h4><p>This is the first tab.</p></div>' }),
        'Tab 2': new View({ template: '<div class="p-4"><h4>Tab 2</h4><p>This is the second tab.</p></div>' }),
        'Tab 3': new View({ template: '<div class="p-4"><h4>Tab 3</h4><p>This is the third tab.</p></div>' })
      },
      activeTab: 'Tab 1',
      enableTransitions: true
    });

    this.addChild(this.dynamicTabs);
  }

  async onActionAddDynamicTab() {
    this.dynamicTabCounter++;
    const newLabel = `Tab ${this.dynamicTabCounter}`;
    const newView = new View({
      template: `<div class="p-4"><h4>${newLabel}</h4><p>This tab was added dynamically at ${new Date().toLocaleTimeString()}!</p></div>`
    });
    
    await this.dynamicTabs.addTab(newLabel, newView, true);
    this.getApp().showSuccess(`Added ${newLabel}`);
  }

  async onActionRemoveDynamicTab() {
    const labels = this.dynamicTabs.getTabLabels();
    if (labels.length <= 1) {
      this.getApp().showWarning('Cannot remove the last tab!');
      return;
    }
    
    const lastLabel = labels[labels.length - 1];
    await this.dynamicTabs.removeTab(lastLabel);
    this.getApp().showSuccess(`Removed ${lastLabel}`);
  }

  // ===================================
  // Example 4: Transition Effects
  // ===================================
  initTransitionTabs() {
    const transitionTabs = new TabView({
      containerId: 'transition-tabs-container',
      tabs: {
        'Fast (200ms)': new View({
          template: `
            <div class="p-4">
              <h4>Fast Transition</h4>
              <p>This tab uses a 200ms transition duration.</p>
              <div class="alert alert-info">
                <i class="bi bi-lightning-fill me-2"></i>
                Quick and snappy transitions for better responsiveness.
              </div>
            </div>
          `
        }),
        'Normal (300ms)': new View({
          template: `
            <div class="p-4">
              <h4>Normal Transition</h4>
              <p>This tab uses the default 300ms transition duration.</p>
              <div class="alert alert-success">
                <i class="bi bi-check-circle-fill me-2"></i>
                Balanced transition speed - smooth yet responsive.
              </div>
            </div>
          `
        }),
        'Slow (500ms)': new View({
          template: `
            <div class="p-4">
              <h4>Slow Transition</h4>
              <p>This tab uses a slower 500ms transition duration.</p>
              <div class="alert alert-warning">
                <i class="bi bi-hourglass-split me-2"></i>
                More noticeable fade effect, better for dramatic transitions.
              </div>
            </div>
          `
        })
      },
      activeTab: 'Normal (300ms)',
      enableTransitions: true,
      transitionDuration: 300
    });

    this.addChild(transitionTabs);
  }

  // ===================================
  // Example 5: Dropdown Styles
  // ===================================
  initDropdownStyleTabs() {
    // Button style dropdown (default)
    this.buttonDropdown = new TabView({
      containerId: 'button-dropdown-tabs-container',
      tabs: {
        'Option 1': new View({ template: '<div class="p-3"><h6>Option 1</h6><p>Button style dropdown navigation.</p></div>' }),
        'Option 2': new View({ template: '<div class="p-3"><h6>Option 2</h6><p>Uses Bootstrap dropdown button.</p></div>' }),
        'Option 3': new View({ template: '<div class="p-3"><h6>Option 3</h6><p>Better for touch interfaces.</p></div>' })
      },
      enableResponsive: false,
      dropdownStyle: 'button'
    });

    this.addChild(this.buttonDropdown);

    // Select style dropdown
    this.selectDropdown = new TabView({
      containerId: 'select-dropdown-tabs-container',
      tabs: {
        'Choice A': new View({ template: '<div class="p-3"><h6>Choice A</h6><p>Select style dropdown navigation.</p></div>' }),
        'Choice B': new View({ template: '<div class="p-3"><h6>Choice B</h6><p>Uses native select element.</p></div>' }),
        'Choice C': new View({ template: '<div class="p-3"><h6>Choice C</h6><p>More compact appearance.</p></div>' })
      },
      enableResponsive: false,
      dropdownStyle: 'select'
    });

    this.addChild(this.selectDropdown);
  }

  async onAfterMount() {
    await super.onAfterMount();
    
    // Force dropdown mode after mounting
    if (this.buttonDropdown) {
      await this.buttonDropdown.setNavigationMode('dropdown');
    }
    if (this.selectDropdown) {
      await this.selectDropdown.setNavigationMode('dropdown');
    }
  }

  // ===================================
  // Example 6: View Lifecycle
  // ===================================
  initLifecycleTabs() {
    const page = this;
    
    const logEvent = (message) => {
      const logContainer = page.element?.querySelector('#event-log');
      if (!logContainer) return;
      
      const timestamp = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'mb-1';
      entry.innerHTML = `<span class="text-muted">[${timestamp}]</span> ${message}`;
      logContainer.insertBefore(entry, logContainer.firstChild);
    };

    class DashboardView extends View {
      constructor() {
        super({
          template: `
            <div class="p-4">
              <h4><i class="bi bi-speedometer2 me-2"></i>Dashboard</h4>
              <p>This view implements <code>onTabActivated()</code> to load fresh data.</p>
              <div id="dashboard-data" class="alert alert-info">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Loading dashboard data...
              </div>
            </div>
          `
        });
      }

      async onTabActivated() {
        logEvent('<strong>Dashboard:</strong> onTabActivated() called - fetching data...');
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const dataDiv = this.element?.querySelector('#dashboard-data');
        if (dataDiv) {
          dataDiv.innerHTML = `
            <i class="bi bi-check-circle-fill text-success me-2"></i>
            Data loaded successfully at ${new Date().toLocaleTimeString()}
          `;
        }
        
        logEvent('<strong>Dashboard:</strong> Data fetched and rendered');
      }
    }

    class ReportsView extends View {
      constructor() {
        super({
          template: `
            <div class="p-4">
              <h4><i class="bi bi-file-earmark-bar-graph me-2"></i>Reports</h4>
              <p>This view also uses <code>onTabActivated()</code>.</p>
              <div id="reports-data" class="alert alert-secondary">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Loading reports...
              </div>
            </div>
          `
        });
      }

      async onTabActivated() {
        logEvent('<strong>Reports:</strong> onTabActivated() called - generating reports...');
        
        await new Promise(resolve => setTimeout(resolve, 700));
        
        const dataDiv = this.element?.querySelector('#reports-data');
        if (dataDiv) {
          dataDiv.innerHTML = `
            <i class="bi bi-check-circle-fill text-success me-2"></i>
            Reports generated at ${new Date().toLocaleTimeString()}
          `;
        }
        
        logEvent('<strong>Reports:</strong> Reports generated');
      }
    }

    this.lifecycleTabs = new TabView({
      containerId: 'lifecycle-tabs-container',
      tabs: {
        'Dashboard': new DashboardView(),
        'Reports': new ReportsView(),
        'Static': new View({
          template: `
            <div class="p-4">
              <h4><i class="bi bi-file-text me-2"></i>Static Content</h4>
              <p>This tab doesn't use <code>onTabActivated()</code> - its content is always the same.</p>
              <div class="alert alert-light">
                <i class="bi bi-info-circle me-2"></i>
                No lifecycle methods needed for static content.
              </div>
            </div>
          `
        })
      },
      activeTab: 'Dashboard',
      enableTransitions: true
    });

    this.lifecycleTabs.on('tab:changed', (data) => {
      logEvent(`<span class="text-primary"><strong>Event:</strong> tab:changed - "${data.previousTab}" → "${data.tab}"</span>`);
    });

    this.addChild(this.lifecycleTabs);
  }

  async onAfterRender() {
    await super.onAfterRender();
    
    // Initialize event log
    const logContainer = this.element?.querySelector('#event-log');
    if (logContainer) {
      logContainer.innerHTML = '';
      const timestamp = new Date().toLocaleTimeString();
      logContainer.innerHTML = `<div class="text-success mb-1"><span class="text-muted">[${timestamp}]</span> <strong>System:</strong> Lifecycle demo initialized</div>`;
    }
  }

  // ===================================
  // Example 7: API Methods
  // ===================================
  initApiTabs() {
    this.apiTabs = new TabView({
      containerId: 'api-tabs-container',
      tabs: {
        'Tab 1': new View({ template: '<div class="p-4"><h4>Tab 1</h4><p>First tab content</p></div>' }),
        'Tab 2': new View({ template: '<div class="p-4"><h4>Tab 2</h4><p>Second tab content</p></div>' }),
        'Tab 3': new View({ template: '<div class="p-4"><h4>Tab 3</h4><p>Third tab content</p></div>' })
      },
      activeTab: 'Tab 1',
      enableTransitions: true
    });

    this.addChild(this.apiTabs);
  }

  async onActionApiShowTab2() {
    await this.apiTabs.showTab('Tab 2');
    this.showApiResult('Called <code>showTab("Tab 2")</code> - tab switched successfully', 'success');
  }

  async onActionApiGetActive() {
    const activeTab = this.apiTabs.getActiveTab();
    this.showApiResult(`Called <code>getActiveTab()</code><br>Result: <strong>"${activeTab}"</strong>`, 'info');
  }

  async onActionApiGetLabels() {
    const labels = this.apiTabs.getTabLabels();
    this.showApiResult(`Called <code>getTabLabels()</code><br>Result: <strong>[${labels.map(l => `"${l}"`).join(', ')}]</strong>`, 'info');
  }

  async onActionApiGetMode() {
    const mode = this.apiTabs.getNavigationMode();
    this.showApiResult(`Called <code>getNavigationMode()</code><br>Result: <strong>"${mode}"</strong>`, 'info');
  }

  showApiResult(message, type = 'info') {
    const resultDiv = this.element?.querySelector('#api-result');
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div class="alert alert-${type} mb-0">
          <i class="bi bi-code-slash me-2"></i>
          ${message}
        </div>
      `;
    }
  }
}

export default TabViewPage;
