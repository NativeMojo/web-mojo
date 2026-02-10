import Page from '@core/Page.js';
import { formsMenu } from '../../menus/formsMenu.js';
import FormsOverview from './FormsOverview.js';

/**
 * FormsSection - Main container for forms documentation/examples
 * 
 * This page serves as the main container for all forms-related pages.
 * It automatically switches the sidebar to the forms menu.
 */
class FormsSection extends Page {
  static pageName = 'forms-section';
  static title = 'Forms Portal';
  static icon = 'bi-ui-checks-grid';
  async onInit() {
    await super.onInit();
    
    // Get sidebar from app
    const app = this.getApp();
    this.sidebar = app.sidebar;
    
    // Add forms menu if not already present
    if (this.sidebar && !this.sidebar.hasMenu('forms')) {
      this.sidebar.addMenu(formsMenu);
    }
    
    // Switch to forms menu
    if (this.sidebar) {
      await this.sidebar.setActiveMenu('forms');
    }
    
    // Create and render the overview page
    this.overviewView = new FormsOverview();
    this.addChild('overview', this.overviewView, '#forms-content-area');
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
  
  async onBeforeDestroy() {
    // Switch back to default menu when leaving
    if (this.sidebar) {
      await this.sidebar.setActiveMenu('default');
    }
    
    await super.onBeforeDestroy();
  }
}

export default FormsSection;
