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
export { FormBuilder } from './FormBuilder.js';
export { default as FormView } from './FormView.js';

// Dialog/Modal Components
export { default as Dialog } from './Dialog.js';

// Page Components
export { default as DeniedPage } from './DeniedPage.js';

// Re-export everything as a namespace for convenience
import TopNav from './TopNav.js';
import Sidebar from './Sidebar.js';
import MainContent from './MainContent.js';
import Table from './Table.js';
import TablePage from './TablePage.js';
import { FormBuilder } from './FormBuilder.js';
import FormView from './FormView.js';
import Dialog from './Dialog.js';
import DeniedPage from './DeniedPage.js';

export const Components = {
  TopNav,
  Sidebar,
  MainContent,
  Table,
  TablePage,
  FormBuilder,
  FormView,
  Dialog,
  DeniedPage
};

// Default export for convenience
export default Components;