/**
 * MOJO Framework - Main Library Entry Point
 * Export all public APIs for external consumption
 * Package: web-mojo
 */

// Import CSS files so they are included in the build
import './css/core.css';
import './css/portal.css';
import './css/table.css';
import './css/toast.css';

// Import version information
import { VERSION_INFO, VERSION, VERSION_MAJOR, VERSION_MINOR, VERSION_REVISION, BUILD_TIME } from './version.js';

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
export { DataView } from './components/DataView.js';
export { TabView } from './components/TabView.js';

// Utilities
export { default as EventBus } from './utils/EventBus.js';
export { default as mustache } from './utils/mustache.js';
export { default as DataFormatter } from './utils/DataFormatter.js';
export { default as MustacheFormatter } from './utils/MustacheFormatter.js';
export { default as MOJOUtils, DataWrapper } from './utils/MOJOUtils.js';
export { default as TokenManager } from './auth/TokenManager.js';


// App classes
export { default as WebApp } from './app/WebApp.js';
export { default as PortalApp } from './app/PortalApp.js';

// Pages
export { default as NotFoundPage } from './pages/NotFoundPage.js';
export { default as ErrorPage } from './pages/ErrorPage.js';

// Export framework metadata
export const FRAMEWORK_NAME = 'MOJO';
export const PACKAGE_NAME = 'web-mojo';

// Export version information
export { VERSION_INFO, VERSION_MAJOR, VERSION_MINOR, VERSION_REVISION, BUILD_TIME };
