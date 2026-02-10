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
      route: '/forms',
      description: 'Quick start guide'
    },
    {
      text: 'FormView Basics',
      icon: 'bi-file-earmark-code',
      route: '/forms/formview-basics',
      description: 'FormView component essentials'
    },
    
    // Basic Field Types
    {
      type: 'divider'
    },
    {
      type: 'label',
      text: 'Basic Fields'
    },
    {
      text: 'Text Inputs',
      icon: 'bi-input-cursor-text',
      route: '/forms/text-inputs',
      badge: '8 types',
      children: [
        { text: 'Text', route: '/forms/text-inputs#text' },
        { text: 'Email', route: '/forms/text-inputs#email' },
        { text: 'Password', route: '/forms/text-inputs#password' },
        { text: 'Tel', route: '/forms/text-inputs#tel' },
        { text: 'URL', route: '/forms/text-inputs#url' },
        { text: 'Search', route: '/forms/text-inputs#search' },
        { text: 'Number', route: '/forms/text-inputs#number' },
        { text: 'Hex', route: '/forms/text-inputs#hex' }
      ]
    },
    {
      text: 'Text Areas',
      icon: 'bi-textarea-t',
      route: '/forms/text-areas',
      badge: '3 types',
      children: [
        { text: 'Textarea', route: '/forms/text-areas#textarea' },
        { text: 'HTML Preview', route: '/forms/text-areas#htmlpreview' },
        { text: 'JSON Editor', route: '/forms/text-areas#json' }
      ]
    },
    {
      text: 'Selection Fields',
      icon: 'bi-ui-checks',
      route: '/forms/selection-fields',
      badge: '4 types',
      children: [
        { text: 'Select', route: '/forms/selection-fields#select' },
        { text: 'Checkbox', route: '/forms/selection-fields#checkbox' },
        { text: 'Radio', route: '/forms/selection-fields#radio' },
        { text: 'Toggle', route: '/forms/selection-fields#toggle' }
      ]
    },
    {
      text: 'Date & Time',
      icon: 'bi-calendar-event',
      route: '/forms/date-time',
      badge: '3 types',
      children: [
        { text: 'Date', route: '/forms/date-time#date' },
        { text: 'DateTime', route: '/forms/date-time#datetime' },
        { text: 'Time', route: '/forms/date-time#time' }
      ]
    },
    {
      text: 'Files & Media',
      icon: 'bi-file-earmark-arrow-up',
      route: '/forms/files',
      badge: '1 type',
      children: [
        { text: 'File Upload', route: '/forms/files#file' }
      ]
    },
    {
      text: 'Other Inputs',
      icon: 'bi-sliders',
      route: '/forms/other-inputs',
      badge: '2 types',
      children: [
        { text: 'Color Picker', route: '/forms/other-inputs#color' },
        { text: 'Range Slider', route: '/forms/other-inputs#range' }
      ]
    },
    
    // Advanced Components
    {
      type: 'divider'
    },
    {
      type: 'label',
      text: 'Advanced Components'
    },
    {
      text: 'TagInput',
      icon: 'bi-tags',
      route: '/forms/tag-input',
      badge: 'NEW',
      description: 'Tag/chip input component'
    },
    {
      text: 'DatePicker',
      icon: 'bi-calendar3',
      route: '/forms/date-picker',
      badge: 'Enhanced',
      description: 'Easepick date picker'
    },
    {
      text: 'DateRangePicker',
      icon: 'bi-calendar-range',
      route: '/forms/date-range-picker',
      description: 'Select date ranges'
    },
    {
      text: 'MultiSelect',
      icon: 'bi-check2-square',
      route: '/forms/multiselect',
      description: 'Multi-select dropdown'
    },
    {
      text: 'ComboInput',
      icon: 'bi-search',
      route: '/forms/combo-input',
      description: 'Autocomplete/editable dropdown'
    },
    {
      text: 'CollectionSelect',
      icon: 'bi-database',
      route: '/forms/collection-select',
      description: 'Select from API/Collection'
    },
    {
      text: 'ImageField',
      icon: 'bi-image',
      route: '/forms/image-field',
      description: 'Image upload with preview'
    },
    
    // Form Features
    {
      type: 'divider'
    },
    {
      type: 'label',
      text: 'Features & Patterns'
    },
    {
      text: 'Validation',
      icon: 'bi-check-circle',
      route: '/forms/validation',
      children: [
        { text: 'Built-in Validators', route: '/forms/validation#builtin' },
        { text: 'Custom Validators', route: '/forms/validation#custom' },
        { text: 'Async Validation', route: '/forms/validation#async' },
        { text: 'Cross-field Validation', route: '/forms/validation#crossfield' }
      ]
    },
    {
      text: 'File Handling',
      icon: 'bi-cloud-upload',
      route: '/forms/file-handling',
      children: [
        { text: 'Base64 Mode', route: '/forms/file-handling#base64' },
        { text: 'Multipart Mode', route: '/forms/file-handling#multipart' },
        { text: 'File Validation', route: '/forms/file-handling#validation' }
      ]
    },
    {
      text: 'Form Layout',
      icon: 'bi-grid',
      route: '/forms/layout',
      children: [
        { text: 'Responsive Grid', route: '/forms/layout#grid' },
        { text: 'Field Groups', route: '/forms/layout#groups' },
        { text: 'Tabbed Forms', route: '/forms/layout#tabs' }
      ]
    },
    {
      text: 'Model Integration',
      icon: 'bi-diagram-3',
      route: '/forms/model-integration',
      description: 'Forms with Models/Collections'
    },
    
    // Examples & Patterns
    {
      type: 'divider'
    },
    {
      type: 'label',
      text: 'Real-World Examples'
    },
    {
      text: 'User Profile Form',
      icon: 'bi-person-circle',
      route: '/forms/examples/profile'
    },
    {
      text: 'Multi-Step Wizard',
      icon: 'bi-arrow-right-circle',
      route: '/forms/examples/wizard'
    },
    {
      text: 'Search & Filter Form',
      icon: 'bi-funnel',
      route: '/forms/examples/filters'
    },
    {
      text: 'Settings Form',
      icon: 'bi-gear',
      route: '/forms/examples/settings'
    },
    {
      text: 'Login & Signup',
      icon: 'bi-key',
      route: '/forms/examples/auth'
    },
    
    // Testing & Playground
    {
      type: 'divider'
    },
    {
      type: 'label',
      text: 'Testing & Tools'
    },
    {
      text: 'Form Playground',
      icon: 'bi-box',
      route: '/forms/playground',
      badge: 'Interactive',
      description: 'Build & test forms live'
    },
    {
      text: 'Field Type Tester',
      icon: 'bi-gear-wide-connected',
      route: '/forms/field-tester',
      description: 'Test all field types'
    },
    {
      text: 'Validation Tester',
      icon: 'bi-shield-check',
      route: '/forms/validation-tester',
      description: 'Test validation rules'
    },
    
    // Reference
    {
      type: 'spacer'
    },
    {
      type: 'divider'
    },
    {
      text: 'API Reference',
      icon: 'bi-book',
      route: '/forms/api-reference',
      children: [
        { text: 'FormView API', route: '/forms/api/formview' },
        { text: 'FormBuilder API', route: '/forms/api/formbuilder' },
        { text: 'Field Options', route: '/forms/api/field-options' }
      ]
    },
    {
      text: 'Best Practices',
      icon: 'bi-award',
      route: '/forms/best-practices'
    },
    {
      text: 'Troubleshooting',
      icon: 'bi-question-circle',
      route: '/forms/troubleshooting'
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
