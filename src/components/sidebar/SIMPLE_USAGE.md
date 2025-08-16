# Simple Sidebar Usage Guide

The new MOJO Sidebar maintains **100% backward compatibility** while adding powerful new features. Your existing configuration works exactly the same!

## 🚀 **Quick Start - Your Exact Format Works!**

```javascript
import Sidebar from './components/Sidebar.js';

const sidebar = new Sidebar({
    container: '#sidebar'
});

// Your original config format - works exactly the same!
await sidebar.setSimpleConfig({
    brand: 'Navigation',
    brandIcon: 'bi-grid-3x3-gap',
    brandSubtext: 'Main Menu',
    items: [
        {
            text: 'Home',
            route: '?page=home',
            icon: 'bi-house'
        },
        {
            text: 'Dashboard',
            route: '?page=dashboard',
            icon: 'bi-speedometer2'
        },
        {
            text: 'Reports',
            icon: 'bi-graph-up',
            children: [
                {
                    text: 'Sales Report',
                    route: '?page=sales',
                    icon: 'bi-currency-dollar'
                },
                {
                    text: 'Analytics',
                    route: '?page=analytics',
                    icon: 'bi-bar-chart'
                },
                {
                    text: 'Performance',
                    route: '?page=performance',
                    icon: 'bi-speedometer'
                }
            ]
        },
        {
            text: 'Settings',
            route: '?page=settings',
            icon: 'bi-gear'
        },
        {
            text: 'Templates',
            route: '?page=templates',
            icon: 'bi-code-slash'
        },
        {
            text: 'Todos',
            route: '?page=todos',
            icon: 'bi-check2-square'
        },
        {
            text: 'Forms',
            route: '?page=forms',
            icon: 'bi-input-cursor-text'
        },
        {
            text: 'Dialogs',
            route: '?page=dialogs',
            icon: 'bi-input-cursor-text'
        }
    ],
    footer: '<div class="text-center text-muted small">v1.0.0</div>'
});

this.addChild(sidebar);
```

## 📝 **Simple API Reference**

### **Basic Setup**
```javascript
// Method 1: Set config after creation
const sidebar = new Sidebar({ container: '#sidebar' });
await sidebar.setSimpleConfig(yourConfig);

// Method 2: One-liner creation
const sidebar = Sidebar.createWithSimpleConfig({
    container: '#sidebar',
    config: yourConfig
});

// Method 3: Multiple menus
sidebar.addMenu('main', yourMainConfig);
sidebar.addMenu('admin', yourAdminConfig);
```

### **Configuration Format**
```javascript
{
    // Branding
    brand: 'App Name',              // Header text
    brandIcon: 'bi-app',            // Icon class
    brandSubtext: 'Version 1.0',    // Subtitle
    
    // Navigation Items
    items: [
        {
            text: 'Home',           // Display text
            route: '/home',         // Navigation route
            icon: 'bi-house',       // Icon class
            badge: {                // Optional notification badge
                text: '5',
                class: 'badge bg-danger'
            },
            children: [             // Optional submenu
                { text: 'Sub Item', route: '/sub', icon: 'bi-dot' }
            ]
        }
    ],
    
    // Footer (optional)
    footer: '<div>Footer HTML</div>'
}
```

## 🎯 **Common Patterns**

### **Basic Menu**
```javascript
const basicConfig = {
    brand: 'My App',
    items: [
        { text: 'Home', route: '/', icon: 'bi-house' },
        { text: 'About', route: '/about', icon: 'bi-info-circle' }
    ]
};
```

### **Menu with Submenus**
```javascript
const menuWithSubs = {
    brand: 'Dashboard',
    items: [
        { text: 'Overview', route: '/dashboard', icon: 'bi-speedometer2' },
        {
            text: 'Reports',
            icon: 'bi-graph-up',
            children: [
                { text: 'Sales', route: '/reports/sales', icon: 'bi-currency-dollar' },
                { text: 'Users', route: '/reports/users', icon: 'bi-people' }
            ]
        }
    ]
};
```

### **E-commerce Example**
```javascript
const ecommerceMenu = {
    brand: 'ShopAdmin',
    brandIcon: 'bi-shop',
    brandSubtext: 'Store Management',
    items: [
        { text: 'Dashboard', route: '/dashboard', icon: 'bi-speedometer2' },
        { text: 'Orders', route: '/orders', icon: 'bi-bag-check' },
        { text: 'Customers', route: '/customers', icon: 'bi-people' },
        {
            text: 'Products',
            icon: 'bi-box-seam',
            children: [
                { text: 'All Products', route: '/products', icon: 'bi-grid' },
                { text: 'Categories', route: '/products/categories', icon: 'bi-tags' },
                { text: 'Inventory', route: '/products/inventory', icon: 'bi-boxes' }
            ]
        },
        { text: 'Settings', route: '/settings', icon: 'bi-gear' }
    ],
    footer: '<small class="text-center">ShopAdmin v2.0</small>'
};
```

## ✨ **Advanced Features (Optional)**

### **Multiple Menus**
```javascript
// Add different menus for different user roles
sidebar.addMenu('user', {
    brand: 'User Portal',
    items: [
        { text: 'Dashboard', route: '/', icon: 'bi-house' },
        { text: 'Profile', route: '/profile', icon: 'bi-person' }
    ]
});

sidebar.addMenu('admin', {
    brand: 'Admin Panel', 
    brandIcon: 'bi-shield-check',
    items: [
        { text: 'Users', route: '/admin/users', icon: 'bi-people' },
        { text: 'Settings', route: '/admin/settings', icon: 'bi-gear' }
    ],
    roles: ['admin']  // Only show to admins
});
```

### **Phase 2: Organization Selector**
```javascript
const multiTenantConfig = {
    brand: 'Multi-Org App',
    enableGroupSelector: true,  // Enable organization selector
    groups: {
        endpoint: '/api/organizations',
        placeholder: 'Select Organization...'
    },
    items: [
        { text: 'Dashboard', route: '/', icon: 'bi-speedometer2' },
        { text: 'Team', route: '/team', icon: 'bi-people' }
    ]
};

// Listen for organization changes
sidebar.on('group-selected', (data) => {
    console.log('Selected org:', data.group.name);
    // Update your app context
});
```

### **Dynamic Updates**
```javascript
// Update brand
sidebar.setBrand('New App Name', 'bi-star', 'v2.0');

// Add more items
sidebar.addNavItems([
    { text: 'New Feature', route: '/new', icon: 'bi-plus' }
]);

// Update footer
sidebar.setFooter('<div class="text-success">Connected</div>');
```

## 🔄 **Migration from Old Sidebar**

**No changes needed!** Your existing config works exactly the same:

```javascript
// OLD CODE - Still works!
const sidebar = new Sidebar({
    data: {
        brandText: 'My App',
        navItems: [...]
    }
});

// NEW EQUIVALENT
await sidebar.setSimpleConfig({
    brand: 'My App',        // brandText → brand
    items: [...]            // navItems → items
});
```

### **Property Mapping**
- `brandText` → `brand`
- `navItems` → `items` 
- `footerContent` → `footer`
- All other properties work the same

## 🎨 **Styling & Icons**

### **Bootstrap Icons**
The sidebar uses Bootstrap Icons. Common ones:
- `bi-house` - Home
- `bi-speedometer2` - Dashboard  
- `bi-people` - Users
- `bi-gear` - Settings
- `bi-graph-up` - Reports
- `bi-envelope` - Messages
- `bi-calendar` - Calendar
- `bi-folder` - Files

### **Badge Examples**
```javascript
{
    text: 'Messages',
    route: '/messages',
    icon: 'bi-envelope',
    badge: { text: '5', class: 'badge bg-danger' }    // Red notification
}
```

## 🚨 **Common Patterns**

### **Admin Section**
```javascript
{
    text: 'Admin',
    icon: 'bi-shield-lock',
    permissions: ['admin'],  // Only show to admins
    children: [
        { text: 'Users', route: '/admin/users' },
        { text: 'Settings', route: '/admin/settings' }
    ]
}
```

### **Dividers and Sections**
```javascript
items: [
    { text: 'Dashboard', route: '/', icon: 'bi-house' },
    
    { type: 'divider', label: 'Management' },  // Section divider
    
    { text: 'Users', route: '/users', icon: 'bi-people' },
    { text: 'Settings', route: '/settings', icon: 'bi-gear' }
]
```

### **External Links**
```javascript
{
    text: 'Documentation',
    route: 'https://docs.example.com',
    icon: 'bi-book',
    external: true,
    target: '_blank'
}
```

## 🎯 **Quick Examples**

### **CRM System**
```javascript
sidebar.addMenu('crm', {
    brand: 'CRM Pro',
    brandIcon: 'bi-person-rolodex',
    items: [
        { text: 'Dashboard', route: '/', icon: 'bi-speedometer2' },
        { text: 'Contacts', route: '/contacts', icon: 'bi-person-lines-fill' },
        { text: 'Companies', route: '/companies', icon: 'bi-building' },
        { text: 'Deals', route: '/deals', icon: 'bi-currency-dollar' },
        { text: 'Reports', route: '/reports', icon: 'bi-graph-up' }
    ]
});
```

### **Project Management**
```javascript
sidebar.addMenu('pm', {
    brand: 'ProjectPro',
    brandIcon: 'bi-kanban',
    items: [
        { text: 'Dashboard', route: '/', icon: 'bi-speedometer2' },
        {
            text: 'Projects',
            icon: 'bi-folder',
            children: [
                { text: 'Active', route: '/projects/active' },
                { text: 'Completed', route: '/projects/completed' },
                { text: 'Archived', route: '/projects/archived' }
            ]
        },
        { text: 'Team', route: '/team', icon: 'bi-people' },
        { text: 'Calendar', route: '/calendar', icon: 'bi-calendar' }
    ]
});
```

That's it! Your existing sidebar config works exactly the same, but now you have access to powerful new features when you need them. 🎉