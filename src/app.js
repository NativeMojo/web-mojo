/**
 * MOJO Framework - Application Entry Point
 * This file provides the main application classes and utilities
 */

// Export application classes
export { default as WebApp } from './app/WebApp.js';
export { default as PortalApp } from './app/PortalApp.js';

// Export authentication utilities
export { default as TokenManager } from './auth/TokenManager.js';

// Export core framework components needed for apps
export { default as Router } from './core/Router.js';
export { default as Page } from './core/Page.js';
export { default as View } from './core/View.js';
export { default as Dialog } from './core/Dialog.js';

// Export commonly used pages
export { default as NotFoundPage } from './pages/NotFoundPage.js';
export { default as ErrorPage } from './pages/ErrorPage.js';
export { default as DeniedPage } from './pages/DeniedPage.js';

// Export navigation components commonly used in apps
export { TopNav, Sidebar } from './views/navigation/index.js';

// Export utilities
export { default as EventBus } from './utils/EventBus.js';

// Default export with app essentials
export default {
  WebApp: await import('./app/WebApp.js').then(m => m.default),
  PortalApp: await import('./app/PortalApp.js').then(m => m.default),
  TokenManager: await import('./auth/TokenManager.js').then(m => m.default),
  Router: await import('./core/Router.js').then(m => m.default),
  Page: await import('./core/Page.js').then(m => m.default),
  View: await import('./core/View.js').then(m => m.default),
  Dialog: await import('./core/Dialog.js').then(m => m.default),
  NotFoundPage: await import('./pages/NotFoundPage.js').then(m => m.default),
  ErrorPage: await import('./pages/ErrorPage.js').then(m => m.default),
  DeniedPage: await import('./pages/DeniedPage.js').then(m => m.default),
  EventBus: await import('./utils/EventBus.js').then(m => m.default)
};