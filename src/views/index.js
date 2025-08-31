/**
 * Views Module - All reusable view components for the MOJO framework
 */

// Export all view categories
export * from './table/index.js';
export * from './list/index.js';
export * from './chat/index.js';
export * from './navigation/index.js';
export * from './data/index.js';
export * from './feedback/index.js';
export * from './file/index.js';

// Named exports for direct access to common components
export { Table, TableView, TableRow } from './table/index.js';
export { ListView, ListViewItem } from './list/index.js';
export { ChatView, ChatInputView, ChatMessageView } from './chat/index.js';
export { TopNav, Sidebar, TabView, SimpleSearchView } from './navigation/index.js';
export { DataView, FileView } from './data/index.js';
export { ProgressView, ContextMenu } from './feedback/index.js';
export { FilePreviewView } from './file/index.js';

// Export as namespaces for convenience
import * as TableComponents from './table/index.js';
import * as ListComponents from './list/index.js';
import * as ChatComponents from './chat/index.js';
import * as NavigationComponents from './navigation/index.js';
import * as DataComponents from './data/index.js';
import * as FeedbackComponents from './feedback/index.js';
import * as FileComponents from './file/index.js';

export {
  TableComponents,
  ListComponents,
  ChatComponents,
  NavigationComponents,
  DataComponents,
  FeedbackComponents,
  FileComponents
};
