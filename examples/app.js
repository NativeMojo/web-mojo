/**
 * MOJO Framework Examples Application
 * A clean, simple demonstration of the MOJO framework
 */

import MOJO from '../src/mojo.js';

// Import framework components
import App from '../src/app/WebApp.js';
import TopNav from '../src/components/TopNav.js';
import Sidebar from '../src/components/Sidebar.js';
import MainContent from '../src/components/MainContent.js';

// Import example pages - Phase 1: Core concepts
import HomePage from './pages/home/HomePage.js';
import ViewBasicsPage from './pages/view-basics/ViewBasicsPage.js';
import ComponentsPage from './pages/components/ComponentsPage.js';
import PagesRoutingPage from './pages/routing/PagesRoutingPage.js';

/**
 * Initialize the examples application
 */
async function initApp() {
  console.log('Initializing MOJO Examples App...');

  // Create the main application
  const app = new App({
    container: '#app',
    name: 'MOJO Examples',
    version: '2.0.0'
  });

  // Configure navigation items
  const navConfig = {
    brand: {
      name: 'MOJO Examples',
      icon: 'bi-lightning-charge',
      href: '?page=home'
    },
    items: [
      {
        label: 'Home',
        icon: 'bi-house',
        page: 'home'
      },
      {
        label: 'Core Concepts',
        icon: 'bi-box',
        items: [
          {
            label: 'View Basics',
            page: 'view-basics',
            icon: 'bi-layers',
            description: 'Learn the fundamentals of Views'
          },
          {
            label: 'Components',
            page: 'components',
            icon: 'bi-puzzle',
            description: 'Explore built-in components'
          },
          {
            label: 'Pages & Routing',
            page: 'pages-routing',
            icon: 'bi-signpost-2',
            description: 'Navigation and routing patterns'
          }
        ]
      }
    ],
    rightNav: [
      {
        label: 'Documentation',
        icon: 'bi-book',
        href: '../docs/',
        external: true
      },
      {
        label: 'GitHub',
        icon: 'bi-github',
        href: 'https://github.com/yourusername/mojo',
        external: true
      }
    ]
  };

  // Initialize the app with navigation configuration
  await app.init({
    navigation: navConfig,
    router: {
      mode: 'param',  // Use param mode for static hosting
      defaultPage: 'home'
    }
  });

  // Register pages with the router
  app.router.addPages([
    HomePage,
    ViewBasicsPage,
    ComponentsPage,
    PagesRoutingPage
  ]);

  // Start the application
  await app.start();

  // Make app globally available for debugging
  window.MOJO_APP = app;

  console.log('MOJO Examples app initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export app for use in other modules if needed
export default initApp;
