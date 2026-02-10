import View from '@core/views/View.js';
import { formsMenu } from '../../menus/formsMenu.js';

/**
 * FormsSection - Main container for forms documentation/examples
 * 
 * This view serves as the main container and router for all forms-related pages.
 * It automatically switches the sidebar to the forms menu and handles routing.
 */
class FormsSection extends View {
  async onInit() {
    await super.onInit();
    
    // Get sidebar from app
    const app = this.getApp();
    this.sidebar = app.sidebar;
    
    // Switch to forms menu
    if (this.sidebar && !this.sidebar.hasMenu('forms')) {
      this.sidebar.addMenu(formsMenu);
    }
    
    if (this.sidebar) {
      await this.sidebar.setActiveMenu('forms');
    }
  }
  
  getTemplate() {
    return `
      <div class="forms-section">
        <!-- Header -->
        <div class="page-header mb-4">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <h1 class="h2 mb-1">
                <i class="bi bi-ui-checks-grid me-2 text-primary"></i>
                Forms Documentation & Examples
              </h1>
              <p class="text-muted mb-0">
                Interactive examples and live code demonstrations for WEB-MOJO forms
              </p>
            </div>
          </div>
        </div>
        
        <!-- Main Content Area -->
        <div id="forms-content-area">
          <!-- Child pages render here -->
        </div>
      </div>
    `;
  }
  
  async onAfterRender() {
    await super.onAfterRender();
    
    // Set up route listener for sub-pages
    const app = this.getApp();
    const router = app?.router;
    
    if (router) {
      this.routeListener = router.on('route', this.handleRouteChange.bind(this));
    }
  }
  
  async handleRouteChange(route) {
    // Handle forms sub-routes
    console.log('Forms route changed:', route);
    
    // Update active item in sidebar
    if (this.sidebar) {
      await this.sidebar.setActiveItemByRoute(route);
    }
  }
  
  async onBeforeDestroy() {
    // Clean up route listener
    if (this.routeListener) {
      this.routeListener.off();
    }
    
    await super.onBeforeDestroy();
  }
}

export default FormsSection;
