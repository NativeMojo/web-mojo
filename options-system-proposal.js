// Proposed Options System for MOJO Views
// This demonstrates a cleaner approach to handling options

export class View {
  constructor(opts = {}) {
    // Initialize options system first
    this.options = this.mergeOptions(opts);
    
    // Extract commonly used properties for direct access
    this.tagName = this.options.tagName;
    this.className = this.options.className;
    this.style = this.options.style;
    this.id = this.options.id;
    this.containerId = this.options.containerId;
    this.container = this.options.container;
    this.parent = this.options.parent;
    this.children = this.options.children;
    this.template = this.options.template || this.options.templateUrl;
    this.data = this.options.data;
    this.debug = this.options.debug;
    this.app = this.options.app;
    this.cacheTemplate = this.options.cacheTemplate;
    
    // Keep full options for reference and dynamic access
    this.element = this._ensureElement();
    this.events = new EventDelegate(this);
    
    if (this.options.model) this.setModel(this.options.model);
  }

  // Define default options for this class
  static get defaultOptions() {
    return {
      tagName: "div",
      className: "mojo-view",
      style: null,
      id: null,
      containerId: null,
      container: null,
      parent: null,
      children: {},
      template: "",
      templateUrl: "",
      data: {},
      debug: false,
      app: null,
      cacheTemplate: true,
      renderCooldown: 0,
      noAppend: false
    };
  }

  // Merge options with defaults hierarchy
  mergeOptions(opts = {}) {
    // Get defaults from the class hierarchy (most specific first)
    const defaults = this.constructor.getOptionsHierarchy();
    
    // Merge: class defaults -> instance options -> constructor args
    const merged = Object.assign({}, defaults, opts);
    
    // Handle special cases
    if (!merged.id) {
      merged.id = View._genId();
    }
    
    // Handle container string conversion
    if (typeof merged.container === 'string') {
      merged.containerId = merged.container;
      merged.container = null;
    }
    
    return merged;
  }

  // Get default options from class hierarchy
  static getOptionsHierarchy() {
    const hierarchy = [];
    let currentClass = this;
    
    // Walk up the prototype chain collecting defaultOptions
    while (currentClass && currentClass.defaultOptions) {
      hierarchy.unshift(currentClass.defaultOptions);
      currentClass = Object.getPrototypeOf(currentClass);
    }
    
    // Merge from base class up to most specific
    return Object.assign({}, ...hierarchy);
  }

  // Helper to get option with fallback
  getOption(key, fallback = null) {
    return this.options[key] ?? fallback;
  }

  // Helper to set option and update related properties
  setOption(key, value) {
    this.options[key] = value;
    
    // Update direct property if it exists
    if (this.hasOwnProperty(key)) {
      this[key] = value;
    }
    
    return this;
  }

  // Helper to check if option is enabled
  isEnabled(key) {
    return Boolean(this.options[key]);
  }
  
  // Helper to merge new options (useful for updates)
  updateOptions(newOpts = {}) {
    Object.assign(this.options, newOpts);
    
    // Update direct properties
    Object.keys(newOpts).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = newOpts[key];
      }
    });
    
    return this;
  }
}

// Extended example for Page class
export class Page extends View {
  static get defaultOptions() {
    return {
      tagName: 'main',
      className: 'mojo-page',
      requiresAuth: false,
      title: '',
      description: '',
      pageIcon: 'bi bi-file-text',
      displayName: '',
      pageDescription: ''
    };
  }

  constructor(options = {}) {
    // Handle special page naming logic before calling super
    const pageName = options.pageName || '';
    if (pageName && !options.id) {
      options.id = 'page_' + pageName.toLowerCase().replace(/\s+/g, '_');
    }
    
    super(options);
    
    // Page-specific properties from options
    this.pageName = this.options.pageName || this.constructor.pageName || '';
    this.route = this.options.route || this.constructor.route || '';
    this.title = this.options.title || this.pageName || '';
    
    // Page metadata
    this.pageIcon = this.options.pageIcon;
    this.displayName = this.options.displayName || this.constructor.displayName || this.pageName;
    this.pageDescription = this.options.pageDescription || this.constructor.pageDescription || '';
    
    // Page options object (could be flattened into main options)
    this.pageOptions = {
      title: this.options.title || this.pageName || 'Untitled Page',
      description: this.options.description || '',
      requiresAuth: this.options.requiresAuth,
      ...this.options.pageOptions
    };
  }
}

// Extended example for TableView class  
export class TableView extends ListView {
  static get defaultOptions() {
    return {
      className: 'table-view-component',
      selectable: false,
      emptyMessage: 'No data available',
      searchable: true,
      sortable: true,
      filterable: true,
      paginated: true,
      clickAction: "view",
      searchPlacement: 'toolbar',
      searchPlaceholder: 'Search...',
      batchBarLocation: "bottom",
      addButtonLabel: 'Add',
      exportSource: 'remote',
      hideActivePills: false,
      hideActivePillNames: [],
      tableOptions: {
        striped: true,
        bordered: false,
        hover: true,
        responsive: false,
        size: null
      },
      formDialogConfig: {},
      viewDialogOptions: {}
    };
  }

  constructor(options = {}) {
    // Pre-process options before calling super
    const tableOptions = {
      selectionMode: options.selectable ? 'multiple' : 'none',
      itemClass: options.itemClass || TableRow,
      ...options
    };

    super(tableOptions);

    // Table-specific properties - now all from this.options
    this.columns = this.options.columns || [];
    this.actions = this.options.actions || null;
    this.contextMenu = this.options.contextMenu || null;
    this.batchActions = this.options.batchActions || null;
    
    // Boolean flags
    this.searchable = this.options.searchable;
    this.sortable = this.options.sortable;
    this.filterable = this.options.filterable;
    this.paginated = this.options.paginated;
    this.clickAction = this.options.clickAction;

    // Configuration objects
    this.tableOptions = { ...this.constructor.defaultOptions.tableOptions, ...this.options.tableOptions };
    this.formDialogConfig = this.options.formDialogConfig;
    this.viewDialogOptions = this.options.viewDialogOptions;
    
    // Export configuration
    this.exportOptions = this.options.exportOptions || 
      (this.options.showExport ? this.getDefaultExportOptions() : null);
    this.exportSource = this.options.exportSource;

    // Filter configuration  
    this.filters = {};
    this.additionalFilters = this.options.filters || [];
    this.hideActivePills = this.options.hideActivePills;
    this.hideActivePillNames = this.options.hideActivePillNames;
    
    // Additional configuration
    this.searchPlacement = this.options.searchPlacement;
    this.searchPlaceholder = this.options.searchPlaceholder;
    this.batchBarLocation = this.options.batchBarLocation;

    // Initialize and build template
    this.initializeColumns();
    this.extractColumnFilters();
    this.template = this.buildTableTemplate();
  }
  
  getDefaultExportOptions() {
    return [
      { format: 'csv', label: 'Export as CSV', icon: 'bi bi-file-earmark-spreadsheet' },
      { format: 'json', label: 'Export as JSON', icon: 'bi bi-file-earmark-code' }
    ];
  }
}

// Usage examples:

// Simple usage
const view = new View({
  tagName: 'section',
  className: 'my-custom-view',
  debug: true
});

// Page usage
const page = new Page({
  pageName: 'UserProfile',
  title: 'User Profile Page',
  requiresAuth: true,
  template: '/templates/user-profile.html'
});

// TableView usage
const table = new TableView({
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' }
  ],
  searchable: true,
  filterable: true,
  showAdd: true,
  addButtonLabel: 'Add User',
  tableOptions: {
    striped: false,
    hover: true,
    size: 'sm'
  }
});

// Access patterns:
console.log(view.getOption('debug')); // true
console.log(page.isEnabled('requiresAuth')); // true
console.log(table.options.addButtonLabel); // 'Add User'

// Update options:
table.setOption('searchable', false);
view.updateOptions({ className: 'updated-view', debug: false });