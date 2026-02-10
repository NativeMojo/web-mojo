import { Page } from 'web-mojo';
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
  static title = 'Forms Documentation';
  static icon = 'bi-book';
  static description = 'Build powerful, flexible forms with minimal code. Declarative configuration, built-in validation, and seamless model integration.';
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
    this.addChild(this.overviewView, { containerId: 'forms-content-area' });
  }
  
  getTemplate() {
    return `
      <div class="forms-section">
        <div id="forms-content-area">
          <!-- FormsOverview renders here -->
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
