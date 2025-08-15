/**
 * MOJO Framework - Main Library Entry Point
 * Export all public APIs for external consumption
 * Package: web-mojo
 */

// Import CSS files so they are included in the build
import './styles/mojo.css';
import './app/portal.css';

// Main MOJO import
import MOJO from './mojo.js';

// Core classes
export { default as View } from './core/View.js';
export { default as Page } from './core/Page.js';
export { default as Router } from './core/Router.js';
export { default as Model } from './core/Model.js';
export { default as Collection } from './core/Collection.js';
export { default as Rest } from './core/Rest.js';

// Components
export { default as Table } from './components/Table.js';
export { default as TablePage } from './components/TablePage.js';
export { default as Dialog } from './components/Dialog.js';
export { default as TopNav } from './components/TopNav.js';
export { default as Sidebar } from './components/Sidebar.js';
export { default as MainContent } from './components/MainContent.js';
export { FormBuilder } from './components/FormBuilder.js';
export { default as FormView } from './components/FormView.js';
export { DataView } from './DataView.js';

// Utilities
export { default as EventBus } from './utils/EventBus.js';
export { default as mustache } from './utils/mustache.js';
export { default as DataFormatter } from './utils/DataFormatter.js';
export { default as MustacheFormatter } from './utils/MustacheFormatter.js';
export { default as MOJOUtils, DataWrapper } from './utils/MOJOUtils.js';
export { default as JWTUtils } from './utils/JWTUtils.js';

// Services
export { default as AuthService } from './services/AuthService.js';

// App classes
export { default as WebApp } from './app/WebApp.js';
export { default as Portal } from './app/Portal.js';

// Pages
export { default as NotFoundPage } from './pages/NotFoundPage.js';
export { default as ErrorPage } from './pages/ErrorPage.js';

// Main MOJO class
export { MOJO };  // Now we're exporting the imported MOJO

// Re-export all named exports from mojo.js for backward compatibility
export {
  View as ViewClass,
  Page as PageClass,
  Router as RouterClass,
  EventBus as EventBusClass,
  Model as RestModel,  // Alias for backward compatibility
  Collection as DataList  // Alias for backward compatibility
} from './mojo.js';

/**
 * Create and initialize a new MOJO application
 * @param {Object} config - Configuration options
 * @returns {MOJO} Initialized MOJO instance
 */
export function createMOJO(config = {}) {
  // Use the statically imported MOJO class
  const mojo = MOJO.create(config);

  // Make MOJO globally available if specified (default: true for backward compatibility)
  if (config.global !== false) {
    window.MOJO = mojo;
  }

  return mojo;
}

// Export version
export const VERSION = '2.0.0';

// Export framework metadata
export const FRAMEWORK_NAME = 'MOJO';
export const PACKAGE_NAME = 'web-mojo';

// Default export
export default MOJO;
