/**
 * MOJO Framework - Application Entry Point
 * This file provides the main application classes and utilities
 */

// Export application classes
import WebApp from './app/WebApp.js';
import PortalApp from './app/PortalApp.js';
export { default as WebApp } from './app/WebApp.js';
export { default as PortalApp } from './app/PortalApp.js';

// Export authentication utilities
import TokenManager from './auth/TokenManager.js';
export { default as TokenManager } from './auth/TokenManager.js';

// Export core framework components needed for apps
import Router from './core/Router.js';
import Page from './core/Page.js';
import View from './core/View.js';
import Dialog from './core/Dialog.js';
export { default as Router } from './core/Router.js';
export { default as Page } from './core/Page.js';
export { default as View } from './core/View.js';
export { default as Dialog } from './core/Dialog.js';

// Export commonly used pages
import NotFoundPage from './pages/NotFoundPage.js';
import ErrorPage from './pages/ErrorPage.js';
import DeniedPage from './pages/DeniedPage.js';
export { default as NotFoundPage } from './pages/NotFoundPage.js';
export { default as ErrorPage } from './pages/ErrorPage.js';
export { default as DeniedPage } from './pages/DeniedPage.js';

// Export navigation components commonly used in apps
export { TopNav, Sidebar } from './views/navigation/index.js';

// Export utilities
import EventBus from './utils/EventBus.js';
export { default as EventBus } from './utils/EventBus.js';

// Default export with app essentials
export default {
  WebApp,
  PortalApp,
  TokenManager,
  Router,
  Page,
  View,
  Dialog,
  NotFoundPage,
  ErrorPage,
  DeniedPage,
  EventBus
};