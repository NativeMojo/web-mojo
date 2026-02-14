/**
 * Forms Menu Configuration for Developer Portal
 * 
 * Organized sidebar menu for forms documentation and examples
 */

export const formsMenu = {
  name: 'forms',
  className: 'sidebar sidebar-dark sidebar-forms',
  header: `
    <div class="text-center pt-3">
      <div class="fs-5 fw-bold sidebar-collapse-hide">
        <i class="bi bi-ui-checks-grid me-2"></i>Forms
      </div>
      <div class="text-muted small sidebar-collapse-hide">Components & Examples</div>
    </div>
  `,
  items: [
    // Overview
    {
      type: 'label',
      text: 'Overview'
    },
    {
      text: 'Getting Started',
      icon: 'bi-rocket-takeoff',
      route: '?page=forms-section',
      description: 'Quick start guide'
    },
    {
      text: 'FormView Basics',
      icon: 'bi-file-earmark-code',
      route: '/forms/formview-basics',
      description: 'FormView component essentials'
    },
    
    // Basic Inputs - Collapsible
    {
      type: 'divider'
    },
    {
      text: 'Basic Inputs',
      icon: 'bi-input-cursor',
      children: [
        {
          text: 'Text Inputs',
          icon: 'bi-input-cursor-text',
          route: '/forms/text-inputs',
          badge: '8 types'
        },
        {
          text: 'Multi-line Text',
          icon: 'bi-textarea-t',
          route: '/forms/textarea-fields',
          badge: '3 types'
        },
        {
          text: 'Selection Fields',
          icon: 'bi-ui-checks',
          route: '/forms/selection-fields',
          badge: '8 types'
        },
        {
          text: 'Date & Time',
          icon: 'bi-calendar-event',
          route: '/forms/date-time-fields',
          badge: '5 types'
        },
        {
          text: 'Files & Media',
          icon: 'bi-file-earmark-arrow-up',
          route: '/forms/file-media-fields',
          badge: '2 types'
        },
        {
          text: 'Structural Fields',
          icon: 'bi-layers',
          route: '/forms/structural-fields',
          badge: '5 types'
        },
        {
          text: 'Other Inputs',
          icon: 'bi-palette',
          route: '/forms/other-inputs',
          badge: '2 types'
        }
      ]
    },
    
    // Advanced Inputs - Collapsible
    {
      text: 'Advanced Inputs',
      icon: 'bi-star',
      children: [
        {
          text: 'TagInput',
          icon: 'bi-tags',
          route: '/forms/tag-input'
        },
        {
          text: 'DatePicker',
          icon: 'bi-calendar3',
          route: '/forms/date-picker'
        },
        {
          text: 'DateRangePicker',
          icon: 'bi-calendar-range',
          route: '/forms/date-range-picker'
        },
        {
          text: 'MultiSelect',
          icon: 'bi-check2-square',
          route: '/forms/multiselect'
        },
        {
          text: 'ComboInput',
          icon: 'bi-search',
          route: '/forms/combo-input'
        },
        {
          text: 'CollectionSelect',
          icon: 'bi-database',
          route: '/forms/collection-select'
        },
        {
          text: 'ImageField',
          icon: 'bi-image',
          route: '/forms/image-field'
        }
      ]
    },
    
    // Features & Patterns - Collapsible
    {
      text: 'Features & Patterns',
      icon: 'bi-gear',
      children: [
        {
          text: 'Validation',
          icon: 'bi-shield-check',
          route: '/forms/validation'
        },
        {
          text: 'Form Layout',
          icon: 'bi-grid',
          route: '/forms/layout'
        },
        {
          text: 'File Handling',
          icon: 'bi-cloud-upload',
          route: '/forms/file-handling',
          badge: 'Coming Soon'
        },
        {
          text: 'Model Integration',
          icon: 'bi-diagram-3',
          route: '/forms/model-integration',
          badge: 'Coming Soon'
        }
      ]
    },
    
    // Form Playground - Root Level
    {
      type: 'divider'
    },
    {
      text: 'Form Playground',
      icon: 'bi-box',
      route: '/forms/playground',
      badge: 'Coming Soon',
      description: 'Build & test forms live'
    },
    
    // Navigation
    {
      type: 'spacer'
    },
    {
      text: 'Back to Main Menu',
      action: 'exit_forms',
      icon: 'bi-arrow-bar-left',
      handler: async (action, event, el, app) => {
        console.log("Exiting forms menu");
        app.sidebar.setActiveMenu("default");
      }
    }
  ]
};

/**
 * Helper function to register the forms menu to a sidebar
 * @param {Sidebar} sidebar - The sidebar instance
 */
export function registerFormsMenu(sidebar) {
  sidebar.addMenu(formsMenu);
}

/**
 * Get flat list of all form routes (for registration)
 */
export function getFormRoutes() {
  const routes = [];
  
  function extractRoutes(items) {
    for (const item of items) {
      if (item.route) {
        routes.push(item.route);
      }
      if (item.children) {
        extractRoutes(item.children);
      }
    }
  }
  
  extractRoutes(formsMenu.items);
  return routes;
}

export default formsMenu;
