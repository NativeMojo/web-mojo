/**
 * MOJO Framework Examples Application
 * Main application file that sets up routing and layout
 */

import MOJO, { 
  Router, 
  View,
  Page,
  Dialog,
  EventBus
} from '../src/mojo.js';

// Import example pages
import HomePage from './pages/home/HomePage.js';
import ComponentsPage from './pages/components/ComponentsPage.js';
import DialogsPage from './pages/dialogs/DialogsPage.js';
import TablesPage from './pages/tables/TablesPage.js';
import FormsPage from './pages/forms/FormsPage.js';
import NavigationPage from './pages/navigation/NavigationPage.js';
import ModelsPage from './pages/models/ModelsPage.js';
import TemplatesPage from './pages/templates/TemplatesPage.js';

// Navigation configuration
const navItems = [
  { 
    label: 'Home', 
    icon: 'bi-house', 
    page: 'home' 
  },
  { 
    label: 'Core Concepts',
    icon: 'bi-box',
    items: [
      { label: 'Components', page: 'components', icon: 'bi-puzzle' },
      { label: 'Pages & Routing', page: 'navigation', icon: 'bi-signpost-2' },
      { label: 'Templates', page: 'templates', icon: 'bi-file-code' },
      { label: 'Models & Data', page: 'models', icon: 'bi-database' }
    ]
  },
  {
    label: 'UI Components',
    icon: 'bi-palette',
    items: [
      { label: 'Dialogs', page: 'dialogs', icon: 'bi-window-stack' },
      { label: 'Forms', page: 'forms', icon: 'bi-input-cursor-text' },
      { label: 'Tables', page: 'tables', icon: 'bi-table' }
    ]
  }
];

/**
 * Simple TopNav component
 */
class TopNav extends View {
  constructor(options = {}) {
    super({
      ...options,
      tagName: 'nav',
      className: 'navbar navbar-expand-lg navbar-dark bg-primary fixed-top'
    });
    
    this.brand = options.brand || 'MOJO Examples';
    this.brandIcon = options.brandIcon || 'bi-lightning-charge';
  }
  
  async getTemplate() {
    return `
      <div class="container-fluid">
        <a class="navbar-brand" href="?page=home">
          <i class="bi ${this.brandIcon} me-2"></i>
          ${this.brand}
        </a>
        <button class="navbar-toggler d-lg-none" type="button" data-action="toggle-sidebar">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="navbar-nav ms-auto">
          <a class="nav-link" href="../docs/" target="_blank">
            <i class="bi bi-book me-1"></i>
            Documentation
          </a>
          <a class="nav-link" href="https://github.com/yourusername/mojo" target="_blank">
            <i class="bi bi-github me-1"></i>
            GitHub
          </a>
        </div>
      </div>
    `;
  }
  
  async onActionToggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.toggle('show');
    }
  }
}

/**
 * Simple Sidebar component
 */
class Sidebar extends View {
  constructor(options = {}) {
    super({
      ...options,
      tagName: 'aside',
      className: 'sidebar'
    });
    
    this.items = options.items || [];
    this.router = options.router;
    this.currentPage = null;
  }
  
  async getTemplate() {
    return `
      <nav class="nav flex-column p-3">
        ${this.renderNavItems(this.items)}
      </nav>
    `;
  }
  
  renderNavItems(items, isNested = false) {
    return items.map(item => {
      if (item.items) {
        // Collapsible group
        const groupId = `nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`;
        return `
          <div class="nav-item">
            <a class="nav-link" data-bs-toggle="collapse" href="#${groupId}" role="button">
              <i class="${item.icon}"></i>
              ${item.label}
              <i class="bi bi-chevron-down float-end"></i>
            </a>
            <div class="collapse show" id="${groupId}">
              <nav class="nav flex-column">
                ${this.renderNavItems(item.items, true)}
              </nav>
            </div>
          </div>
        `;
      } else {
        // Regular nav item
        const activeClass = this.currentPage === item.page ? 'active' : '';
        return `
          <a class="nav-link ${activeClass}" href="?page=${item.page}" data-page="${item.page}">
            <i class="${item.icon}"></i>
            ${item.label}
          </a>
        `;
      }
    }).join('');
  }
  
  setActivePage(pageName) {
    this.currentPage = pageName;
    
    // Update active state in DOM
    if (this.element) {
      this.element.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
          link.classList.add('active');
        }
      });
    }
  }
}

/**
 * Main content container
 */
class MainContent extends View {
  constructor(options = {}) {
    super({
      ...options,
      tagName: 'main',
      className: 'main-content'
    });
  }
  
  async getTemplate() {
    return '<div id="page-container"></div>';
  }
}

/**
 * Initialize the examples application
 */
async function initApp() {
  console.log('Initializing MOJO Examples App...');
  
  // Get the app container
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }
  
  // Clear loading message
  appContainer.innerHTML = '';
  
  // Create layout structure
  const layoutHTML = `
    <div class="app-layout">
      <div id="topnav"></div>
      <div class="content-wrapper">
        <div id="sidebar"></div>
        <div id="main"></div>
      </div>
    </div>
  `;
  appContainer.innerHTML = layoutHTML;
  
  // Create and mount TopNav
  const topNav = new TopNav({
    brand: 'MOJO Examples',
    brandIcon: 'bi-lightning-charge'
  });
  topNav.setContainer('#topnav');
  await topNav.render();
  await topNav.mount();
  
  // Create router with param mode (default for MOJO)
  const router = new Router({
    container: '#page-container',
    mode: 'param'
  });
  
  // Create and mount Sidebar
  const sidebar = new Sidebar({
    items: navItems,
    router: router
  });
  sidebar.setContainer('#sidebar');
  await sidebar.render();
  await sidebar.mount();
  
  // Create and mount MainContent
  const mainContent = new MainContent();
  mainContent.setContainer('#main');
  await mainContent.render();
  await mainContent.mount();
  
  // Ensure MOJO eventBus is available
  if (!window.MOJO) {
    window.MOJO = {};
  }
  if (!window.MOJO.eventBus) {
    window.MOJO.eventBus = new EventBus();
  }
  
  // Listen for route changes to update sidebar
  window.MOJO.eventBus.on('page:changed', (data) => {
    if (data.page && data.page.page_name) {
      sidebar.setActivePage(data.page.page_name.toLowerCase());
    }
  });
  
  // Register routes
  router.addRoute('home', HomePage);
  router.addRoute('components', ComponentsPage);
  router.addRoute('dialogs', DialogsPage);
  router.addRoute('tables', TablesPage);
  router.addRoute('forms', FormsPage);
  router.addRoute('navigation', NavigationPage);
  router.addRoute('models', ModelsPage);
  router.addRoute('templates', TemplatesPage);
  
  // Set default route
  router.addRoute('', HomePage); // Root route
  
  // Start router
  router.start();
  
  // Navigate to home if no page param
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.get('page')) {
    router.navigate('home');
  }
  
  // Make router globally available for navigation
  window.MOJO.router = router;
  
  // Make components globally available for debugging
  window.MOJO_APP = {
    router,
    topNav,
    sidebar,
    mainContent,
    Dialog
  };
  
  console.log('Examples app initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for use in pages
export { navItems };