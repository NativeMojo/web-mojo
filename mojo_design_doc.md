# MOJO Framework Design Document v2

## Overview
MOJO is a lightweight, modern ES6 JavaScript UI framework built on Bootstrap 5. It follows MVC architecture patterns with clean folder structures, RESTful API integration, and component-based development with advanced table, form, and dashboard capabilities.

## Core Design Principles
- **Simplicity**: Clean, intuitive API with minimal boilerplate
- **Modularity**: Component-based architecture with clear separation of concerns
- **Modern**: ES6+ features, async/await, modules
- **Lightweight**: Minimal overhead, tree-shakable
- **Convention over Configuration**: Sensible defaults with customization options
- **Bootstrap 5 Native**: Full integration with Bootstrap components and utilities

## Build System (Node.js)

### Package Structure
```
mojo-framework/
├── package.json
├── webpack.config.js
├── babel.config.js
├── postcss.config.js
├── src/                        # Framework source
└── examples/                   # Example applications
    └── myapp/                  # Sample app structure
```

### Build Dependencies
- **Webpack 5**: Module bundling and dev server
- **Babel**: ES6+ transpilation
- **Sass**: SCSS compilation with Bootstrap 5 integration
- **PostCSS**: CSS optimization and autoprefixing
- **ESLint**: Code quality and consistency
- **Mustache.js**: Template engine
- **Chart.js**: Dashboard widgets
- **Easepick**: Modern date/daterange picker
- **date-fns-tz**: Modern datetime with timezone support

## Framework Structure

```
mojo-framework/
├── src/
│   ├── core/
│   │   ├── app.js              # WebApp class
│   │   ├── router.js           # URL routing system
│   │   ├── event-bus.js        # Global event system
│   │   ├── portal.js           # Portal layout (TopNav, Sidebar)
│   │   └── utils.js            # Core utilities
│   ├── mvc/
│   │   ├── model.js            # RestModel class
│   │   ├── collection.js       # DataList class
│   │   ├── view.js             # Base View class
│   │   └── page.js             # Page class (extends View)
│   ├── pages/
│   │   ├── login.js            # Generic Login Page (JWT, Passkeys, Google)
│   │   ├── table.js            # Generic Table Page
│   │   └── dashboard.js        # Dashboard Page
│   ├── components/
│   │   ├── table/
│   │   │   ├── table.js        # Advanced Table with your exact syntax
│   │   │   ├── pagination.js   # Pagination component
│   │   │   └── filters.js      # Table filtering system
│   │   ├── forms/
│   │   │   ├── form-builder.js # Dynamic form generation
│   │   │   ├── form-view.js    # FormView component
│   │   │   └── fields/         # Form field components
│   │   │       ├── text.js
│   │   │       ├── select.js
│   │   │       ├── toggle.js
│   │   │       ├── date.js
│   │   │       ├── daterange.js
│   │   │       └── searchable-dropdown.js
│   │   ├── widgets/
│   │   │   ├── chart-view.js   # Chart.js wrapper as View
│   │   │   ├── line-chart.js   # Line chart widget
│   │   │   └── bar-chart.js    # Bar chart widget
│   │   ├── ui/
│   │   │   ├── dialog.js       # Bootstrap modal wrapper
│   │   │   ├── toast.js        # Bootstrap toast wrapper
│   │   │   ├── searchable-dropdown.js # Searchable dropdown
│   │   │   ├── top-nav.js      # Portal TopNav with user dropdown
│   │   │   └── sidebar.js      # Sidebar navigation
│   │   └── list-view.js        # ListView component
│   ├── rest/
│   │   ├── client.js           # MOJO.Rest API client
│   │   └── interceptors.js     # Request/response interceptors
│   ├── auth/
│   │   ├── jwt.js              # JWT authentication
│   │   ├── passkeys.js         # WebAuthn/Passkeys support
│   │   └── google-auth.js      # Google OAuth integration
│   ├── localization/
│   │   ├── formatter.js        # Data formatters with your pipe syntax
│   │   ├── filters.js          # Template filter system
│   │   ├── datetime.js         # date-fns-tz integration
│   │   └── i18n.js             # Internationalization support
│   ├── templating/
│   │   ├── mustache-engine.js  # Mustache.js wrapper
│   │   └── template-loader.js  # Template loading system
│   └── styles/
│       ├── _variables.scss     # SCSS variables
│       ├── _components.scss    # Component styles
│       ├── _tables.scss        # Table-specific styles
│       ├── _forms.scss         # Form-specific styles
│       ├── _portal.scss        # Portal layout styles
│       ├── _utilities.scss     # Utility classes
│       └── mojo.scss           # Main SCSS entry point
```

## Application Structure (Your Exact Requirements)

```
myapp/
├── app.json                    # App configuration
├── models/
│   ├── mydatamodel.js         # Your exact naming
│   ├── user.js                # User RestModel
│   └── user-list.js           # User DataList
├── pages/
│   ├── home/
│   │   ├── home.js            # Your exact Home class syntax
│   │   ├── home.html          # Your exact HTML with data-action
│   │   └── home.scss          # Home page styles
│   └── users/
│       ├── users.js           # Your exact Users table syntax
│       ├── users.html         # Optional template override
│       └── users.scss         # Users page styles
├── views/
│   ├── mychart/               # Your exact naming
│   │   ├── mychart.js         # Chart view component
│   │   ├── mychart.scss       # Chart styles
│   │   └── mychart.html       # Chart template
│   └── user-profile/
│       ├── user-profile.js    # User profile view
│       ├── user-profile.html  # Profile template
│       └── user-profile.scss  # Profile styles
├── assets/
│   ├── images/
│   └── fonts/
└── dist/
    ├── app.min.js             # Compiled app
    └── app.min.css            # Compiled styles
```

## Core Classes & APIs (Updated with Your Exact Syntax)

### 1. RestModel Class (Your Exact Requirements)
```javascript
class RestModel {
  endpoint = "/api/user"  // Base URL - id appended for fetch/POST
  id = null              // Model ID field
  attributes = {}        // Model data
  
  // Your exact method signatures
  get(key, defaultValue, localize) {
    // Supports "my.dot.notation" nested objects
    // Example: model.get("amount|currency('USD')")
  }
  
  set(key, value) {
    // Supports "my.dot.notation" nested objects
  }
  
  fetch(params) {
    // Fetches from endpoint + id if exists
  }
  
  save() { /* POST/PUT logic */ }
  destroy() { /* DELETE logic */ }
}
```

### 2. DataList Class (Your Collection Requirements)
```javascript
class DataList {
  ModelClass = null      // Takes ModelClass for endpoint
  endpoint = ""          // Base URL from ModelClass
  models = []            // Array of RestModel instances
  
  fetch(params) {
    // Returns collection from base_url
    // Supports your API structure: {data: [...], status, size, count, start}
  }
}
```

### 3. Page Class (Your Exact Syntax)
```javascript
class Page extends View {
  template = ".pages.home"  // Your dot notation
  page_name = "home"        // Your exact property
  route = "home"           // Your routing
  
  // Your exact lifecycle methods
  on_init() {}
  on_params() {
    this.options = { ...this.defaults, ...this.params };
  }
  
  // Your exact action handling
  on_action_hello() {
    MOJO.toast("Notification", "Hello!", "info");
  }
  
  on_action_default() {
    // Fallback for unhandled actions
  }
}
```

### 4. Table Page (Your Exact Syntax)
```javascript
class MOJO.Pages.Table extends Page {
  // Your exact properties and methods from users.js example
  Collection = null        // MOJO.Data.UserList
  columns = []            // Your exact column syntax
  filters = []            // Your exact filter syntax
  collection_params = {}   // Your pagination/sorting params
  group_filtering = false  // Your exact property
  list_options = {}       // Your table options
  view = null             // Detail view for dialogs
  
  // Your exact methods
  on_item_clicked(item) {
    // Your dialog logic
  }
  
  on_item_dlg(item, dlg) {
    // Your dialog customization
  }
}
```

### 5. Form Builder (Your Exact Field Syntax)
```javascript
class FormBuilder {
  fields = [
    {
      label: "Full Name",
      name: "full_name",
      type: "text",          // default
      required: true,
      columns: 6,            // Bootstrap columns
      placeholder: "Enter Your Full Name"
    },
    {
      label: "Email",
      name: "email",
      required: true,
      validate: "email",      // Built-in validation
      columns: 6,
      placeholder: "Enter Email"
    },
    {
      label: "Bio",
      name: "bio",
      type: "textarea",
      placeholder: "Tell us about yourself"
    },
    {
      label: "Gender",
      name: "gender",
      type: "select",
      options: [
        { label: "Select Gender", value: "" },
        "male",               // String shorthand
        "female",
        "other"
      ]
    },
    {
      name: "metadata.permissions.manage_processor", // Nested support
      label: "Manage Processor",
      help: "Allow user to manage processing",
      requires_perm: ["sys.manage_groups"], // Permission-based fields
      type: "toggle",         // Your toggle switch
      columns: 6
    },
    {
      name: "date",
      placeholder: "Select Date",
      type: "date"           // Easepick integration
    },
    {
      name: "daterange",
      placeholder: "Select Date Range", 
      type: "daterange"      // Easepick daterange
    },
    {
      name: "search_user",
      label: "Select User",
      type: "searchable-dropdown", // New component
      endpoint: "/api/users",
      search_field: "username",
      display_field: "display_name"
    }
  ]
}
```

### 6. Dashboard Widgets (Chart.js Integration)
```javascript
class ChartView extends View {
  chart_type = "line"      // line, bar, pie, doughnut
  chart_data = {}          // Chart.js data structure
  chart_options = {}       // Chart.js options
  
  // Widget-specific methods
  updateData(newData) {}
  resize() {}
  destroy() {}
}

class LineChart extends ChartView {
  chart_type = "line"
}

class BarChart extends ChartView {
  chart_type = "bar"
}
```

### 7. Portal Layout Components

#### TopNav with User Dropdown
```javascript
class TopNav extends View {
  user_menu = [
    { label: "Profile", action: "profile" },
    { label: "Settings", action: "settings" },
    { separator: true },
    { label: "Logout", action: "logout" }
  ]
  
  notifications = true
  search = true
  
  on_action_profile() {}
  on_action_logout() {}
}
```

#### Sidebar Navigation
```javascript
class Sidebar extends View {
  menu_items = [
    { label: "Dashboard", icon: "dashboard", route: "dashboard" },
    { label: "Users", icon: "users", route: "users" },
    { 
      label: "Reports", 
      icon: "chart-bar", 
      children: [
        { label: "Sales", route: "reports/sales" },
        { label: "Analytics", route: "reports/analytics" }
      ]
    }
  ]
  
  collapsible = true
  user_preferences = true  // Remember collapsed state
}
```

### 8. Authentication System

#### Login Page (Generic)
```javascript
class LoginPage extends Page {
  auth_methods = ["jwt", "passkeys", "google"]
  
  // JWT Authentication
  on_jwt_login(credentials) {}
  
  // Passkeys/WebAuthn
  on_passkey_login() {}
  on_passkey_register() {}
  
  // Google OAuth
  on_google_login() {}
  
  // Multi-factor support
  on_mfa_verify(code) {}
}
```

### 9. Localization & Formatting (Your Exact Pipe Syntax)

#### Built-in Filters (Your Examples)
```javascript
// Your exact syntax examples:
// "amount|currency('USD')" 
// "avatar|image('/web-mojo/plugins/media/empty_avatar.jpg', 'rounded image-sm', 'thumbnail_sm')"
// "last_activity|ago"

const FILTERS = {
  currency(value, code = 'USD', locale = 'en-US') {
    // Convert cents to currency: 1230 → "$12.30"
  },
  
  image(value, fallback, classes = '', size = '') {
    // Return Bootstrap image HTML with fallback
  },
  
  ago(value) {
    // Relative time: timestamp → "2 hours ago"
  },
  
  date(value, format = 'MM/dd/yyyy', timezone = null) {
    // date-fns-tz formatting with timezone support
  }
}
```

### 10. MOJO.Rest Interface (Your Exact API Structure)
```javascript
MOJO.Rest = {
  baseURL: '/api',
  
  // Your HTTP methods
  GET(url, params, options) {
    // Returns your API structure: {data: [...], status, size, count, start}
  },
  
  POST(url, data, options) {
    // Handles single model: {data: {...}, status, graph}
  },
  
  PUT(url, data, options) {},
  PATCH(url, data, options) {},
  DELETE(url, options) {},
  
  // Configuration
  configure(options) {},
  addInterceptor(type, handler) {}
}
```

## Advanced Components

### Searchable Dropdown
```javascript
class SearchableDropdown extends View {
  endpoint = null          // API endpoint for search
  search_field = "name"    // Field to search on
  display_field = "label"  // Field to display
  value_field = "id"       // Field for value
  min_chars = 2           // Minimum characters to search
  debounce = 300          // Search debounce ms
  
  // Can be used as form field or standalone component
}
```

### Advanced Table Features (Your Exact Column Syntax)
```javascript
// Your exact column configuration from users.js
columns: [
  {
    label: "Avatar",
    no_sort: true,
    field: "avatar|image('/web-mojo/plugins/media/empty_avatar.jpg', 'rounded image-md')",
    classes: "d-table-cell d-sm-none tc-min"
  },
  {
    label: "User", 
    sort: "username",
    template: "<div>{{model.display_name}} {{{model.icons}}}</div><div class='text-muted'>{{model.username}}</div><div class='text-muted'>{{model.last_activity|ago}}</div>",
    classes: "d-table-cell d-sm-none"
  },
  {
    label: "Last Activity",
    field: "last_activity|ago",
    sort_field: "last_activity",
    classes: "d-none d-sm-table-cell"
  }
]

// Your exact filter syntax
filters: [
  {
    label: "Filter By",
    name: "filter", 
    type: "select",
    editable: true,
    options: [
      { label: "Active", value: "" },
      { label: "Disabled", value: "is_active:0" },
      { label: "Staff", value: "is_staff:1" }
    ],
    operator: "is"
  }
]
```

## Configuration Files

### app.json (Enhanced)
```json
{
  "name": "My Application",
  "version": "1.0.0",
  "api": {
    "baseURL": "/api",
    "timeout": 30000,
    "headers": {}
  },
  "auth": {
    "methods": ["jwt", "passkeys", "google"],
    "jwt": {
      "tokenKey": "access_token",
      "refreshKey": "refresh_token"
    },
    "google": {
      "clientId": "your-google-client-id"
    }
  },
  "portal": {
    "topnav": true,
    "sidebar": true,
    "user_dropdown": true,
    "notifications": true,
    "search": true
  },
  "routing": {
    "mode": "history",
    "base": "/"
  },
  "theme": {
    "primary": "#007bff",
    "sidebar_width": "250px",
    "topnav_height": "60px"
  },
  "localization": {
    "locale": "en-US",
    "currency": "USD", 
    "timezone": "America/New_York",
    "dateFormat": "MM/dd/yyyy"
  },
  "components": {
    "charts": true,
    "tables": true,
    "forms": true,
    "searchable_dropdown": true,
    "daterange_picker": true
  }
}
```

## Build Scripts (package.json)
```json
{
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production", 
    "build:watch": "webpack --mode development --watch",
    "scss": "sass src/styles/mojo.scss dist/mojo.css --watch",
    "lint": "eslint src/**/*.js",
    "test": "jest"
  },
  "dependencies": {
    "bootstrap": "^5.3.0",
    "mustache": "^4.2.0",
    "chart.js": "^4.0.0",
    "date-fns-tz": "^2.0.0",
    "easepick": "^1.2.0"
  },
  "devDependencies": {
    "webpack": "^5.0.0",
    "webpack-cli": "^5.0.0", 
    "webpack-dev-server": "^4.0.0",
    "babel-loader": "^9.0.0",
    "sass": "^1.60.0",
    "sass-loader": "^13.0.0",
    "css-loader": "^6.0.0",
    "eslint": "^8.0.0"
  }
}
```

This comprehensive design now includes all your exact syntax requirements, the portal layout, authentication methods, dashboard widgets, advanced form fields, and modern datetime/daterange support. The build system uses Node.js with all the necessary tooling for a professional framework development experience.