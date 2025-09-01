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

// Core framework classes
export { default as View } from './core/View.js';
export { default as Page } from './core/Page.js';
export { default as Router } from './core/Router.js';
export { default as Model } from './core/Model.js';
export { default as Collection } from './core/Collection.js';
export { default as Rest } from './core/Rest.js';
export { default as Dialog } from './core/Dialog.js';
export { default as EventDelegate } from './core/EventDelegate.js';

// Views - Export all view components
export * from './views/index.js';

// Individual view exports for backward compatibility
export { Table, TableView, TableRow } from './views/table/index.js';
export { ListView, ListViewItem } from './views/list/index.js';
export { ChatView, ChatInputView, ChatMessageView } from './views/chat/index.js';
export { TopNav, Sidebar, TabView, SimpleSearchView } from './views/navigation/index.js';
export { DataView, FileView } from './views/data/index.js';
export { ProgressView, ContextMenu } from './views/feedback/index.js';
export { FilePreviewView } from './views/file/index.js';

// Pages
export * from './pages/index.js';
export { default as NotFoundPage } from './pages/NotFoundPage.js';
export { default as ErrorPage } from './pages/ErrorPage.js';
export { default as DeniedPage } from './pages/DeniedPage.js';
export { default as TablePage } from './pages/TablePage.js';

// Forms
export * from './forms/index.js';
export { default as FormBuilder } from './forms/FormBuilder.js';
export { default as FormView } from './forms/FormView.js';

// Charts
export * from './charts/index.js';

// Mixins
export * from './mixins/index.js';
export { default as FileDropMixin, default as applyFileDropMixin } from './mixins/FileDropMixin.js';

// Utilities
export { default as EventBus } from './utils/EventBus.js';
export { default as mustache } from './utils/mustache.js';
export { default as DataFormatter } from './utils/DataFormatter.js';
export { default as MustacheFormatter } from './utils/MustacheFormatter.js';
export { default as MOJOUtils, DataWrapper } from './utils/MOJOUtils.js';

// Authentication
export { default as TokenManager } from './auth/TokenManager.js';

// App classes
export { default as WebApp } from './app/WebApp.js';
export { default as PortalApp } from './app/PortalApp.js';

// Services
export { default as FileUpload } from './services/FileUpload.js';

// Export framework metadata
export const FRAMEWORK_NAME = 'MOJO';
export const PACKAGE_NAME = 'web-mojo';

// Export version information
export { VERSION_INFO, VERSION, VERSION_MAJOR, VERSION_MINOR, VERSION_REVISION, BUILD_TIME };

// Re-export namespaces for convenience
export {
  TableComponents,
  ListComponents,
  ChatComponents,
  NavigationComponents,
  DataComponents,
  FeedbackComponents,
  FileComponents
} from './views/index.js';

// Default export with all components organized by category
export default {
  // Framework info
  FRAMEWORK_NAME,
  PACKAGE_NAME,
  VERSION_INFO,
  VERSION,
  VERSION_MAJOR,
  VERSION_MINOR,
  VERSION_REVISION,
  BUILD_TIME
};
