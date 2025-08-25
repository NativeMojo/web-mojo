/**
 * MOJO Framework - Components Index
 * Export all UI components for easier imports
 */

// Navigation Components
export { default as TopNav } from './TopNav.js';
export { default as Sidebar } from './Sidebar.js';
export { default as MainContent } from './MainContent.js';

// Data Display Components
export { default as Table } from './Table.js';
export { default as TablePage } from './TablePage.js';

// Form Components
export { FormBuilder } from '../forms/FormBuilder.js';
export { default as FormView } from '../forms/FormView.js';

// UI Components
export { default as TabView } from './TabView.js';
export { default as FileView } from './FileView.js';
export { default as TagInputView } from '../forms/inputs/TagInput.js';

// Dialog/Modal Components
export { default as Dialog } from './Dialog.js';

// Page Components
export { default as DeniedPage } from './DeniedPage.js';
export { default as NotFoundPage } from './NotFoundPage.js';

// Mixins
export { default as applyFileDropMixin, FileDropMixin } from './FileDropMixin.js';

// Re-export everything as a namespace for convenience
import TopNav from './TopNav.js';
import Sidebar from './Sidebar.js';
import MainContent from './MainContent.js';
import Table from './Table.js';
import TablePage from './TablePage.js';
import { FormBuilder } from '../forms/FormBuilder.js';
import FormView from '../forms/FormView.js';
import TabView from './TabView.js';
import FileView from './FileView.js';
import TagInputView from '../forms/inputs/TagInput.js';
import Dialog from './Dialog.js';
import DeniedPage from './DeniedPage.js';
import NotFoundPage from './NotFoundPage.js';
import applyFileDropMixin, { FileDropMixin } from './FileDropMixin.js';

export const Components = {
  TopNav,
  Sidebar,
  MainContent,
  Table,
  TablePage,
  FormBuilder,
  FormView,
  TabView,
  FileView,
  TagInputView,
  Dialog,
  DeniedPage,
  NotFoundPage,
  applyFileDropMixin,
  FileDropMixin
};

// Default export for convenience
export default Components;