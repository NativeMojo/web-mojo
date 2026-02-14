/**
 * MOJO Framework - Core Entry (2.1.0)
 */

// Bundle core CSS
import '@core/css/core.css';
import '@core/css/portal.css';
import '@core/css/table.css';
import '@core/css/toast.css';
import '@core/css/chat.css';

import ConsoleSilencer from '@core/utils/ConsoleSilencer.js';
// Reduce console noise globally: errors only by default (suppress logs, info, and warnings)
ConsoleSilencer.install({ level: 'warn' });

// Version info
export {
  VERSION_INFO,
  VERSION,
  VERSION_MAJOR,
  VERSION_MINOR,
  VERSION_REVISION,
  BUILD_TIME
} from './version.js';

// Core runtime
export { default as View } from '@core/View.js';
export { default as Page } from '@core/Page.js';
export { default as Router } from '@core/Router.js';
export { default as Model } from '@core/Model.js';
export { default as Collection } from '@core/Collection.js';
export { default as Rest } from '@core/Rest.js';

// Core Models - re-export everything from models/
export * from '@core/models/AWS.js';
export * from '@core/models/Email.js';
export * from '@core/models/Files.js';
export * from '@core/models/Group.js';
export * from '@core/models/Incident.js';
export * from '@core/models/Job.js';
export * from '@core/models/JobRunner.js';
export * from '@core/models/Log.js';
export * from '@core/models/Member.js';
export * from '@core/models/Metrics.js';
export * from '@core/models/Push.js';
export * from '@core/models/System.js';
export * from '@core/models/Tickets.js';
export * from '@core/models/User.js';

// App classes
export { default as WebApp } from '@core/WebApp.js';
export { default as PortalApp } from '@core/PortalApp.js';

// UI helper
export { default as Dialog } from '@core/views/feedback/Dialog.js';

// Selected views (curated for tree-shaking)
export { default as TableView } from '@core/views/table/TableView.js';
export { default as TableRow } from '@core/views/table/TableRow.js';
export { default as TablePage } from '@core/pages/TablePage.js';
export { default as ListView } from '@core/views/list/ListView.js';
export { default as ListViewItem } from '@core/views/list/ListViewItem.js';
export { default as TopNav } from '@core/views/navigation/TopNav.js';
export { default as Sidebar } from '@core/views/navigation/Sidebar.js';
export { default as TabView } from '@core/views/navigation/TabView.js';
export { default as SimpleSearchView } from '@core/views/navigation/SimpleSearchView.js';
export { default as DataView } from '@core/views/data/DataView.js';
export { default as FormView } from '@core/forms/FormView.js';
export { default as FormPage } from '@core/forms/FormPage.js';
export { default as FilePreviewView } from '@core/views/data/FilePreviewView.js';
export { default as ChatView } from '@core/views/chat/ChatView.js';
export { default as ChatMessageView } from '@core/views/chat/ChatMessageView.js';
export { default as ChatInputView } from '@core/views/chat/ChatInputView.js';

// Services, utils, mixins
export { default as FileUpload } from '@core/services/FileUpload.js';
export { default as applyFileDropMixin } from '@core/mixins/FileDropMixin.js';
export { default as TokenManager } from '@core/services/TokenManager.js';
export { default as ToastService } from '@core/services/ToastService.js';
export { default as WebSocketClient } from '@core/services/WebSocketClient.js';
export { default as EventDelegate } from '@core/mixins/EventDelegate.js';
export { default as EventBus } from '@core/utils/EventBus.js';
export { default as dataFormatter } from '@core/utils/DataFormatter.js';
export { default as MustacheFormatter } from '@core/utils/MustacheFormatter.js';
export { default as MOJOUtils, DataWrapper } from '@core/utils/MOJOUtils.js';
export { default as ConsoleSilencer } from '@core/utils/ConsoleSilencer.js';
export { installConsoleSilencer } from '@core/utils/ConsoleSilencer.js';
export { default as DjangoLookups, parseFilterKey, formatFilterDisplay, LOOKUPS } from '@core/utils/DjangoLookups.js';

// Additional views
export { default as ProgressView } from '@core/views/feedback/ProgressView.js';
export { default as ContextMenu } from '@core/views/feedback/ContextMenu.js';

// Names
export const FRAMEWORK_NAME = 'MOJO';
export const PACKAGE_NAME = 'web-mojo';

export default {
  FRAMEWORK_NAME,
  PACKAGE_NAME,
};
