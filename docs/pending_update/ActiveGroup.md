# ActiveGroup - Context-Aware Portal Navigation

## Overview

The ActiveGroup feature provides context-aware navigation in MOJO Portal applications. It allows users to work within specific group contexts (organizations, teams, departments, merchants, etc.) with sidebar menus that dynamically adapt based on the selected group's type.

## Key Features

- **Dynamic Group Selection**: Clean sidebar interface for selecting groups when none is active
- **Context-Aware Menus**: Sidebar menus that show/hide based on active group's `kind`
- **Persistent State**: Selected group persists across browser sessions
- **Seamless Switching**: Easy group switching via group header in sidebar
- **Bootstrap Integration**: Uses existing MOJO/Bootstrap components

## Architecture

```
PortalApp
├── activeGroup (Group model instance)
├── setActiveGroup(group)
├── getActiveGroup()
└── Sidebar
    ├── GroupSelectionSidebarView (when no activeGroup)
    ├── Regular menus (when activeGroup exists)
    └── Group header (for switching groups)
```

## Basic Usage

### 1. Configure Group-Specific Menus

```javascript
const app = new PortalApp({
  container: '#app',
  title: 'My Portal',
  
  sidebar: {
    menus: {
      // Default menu (no groupKind - always available)
      default: {
        items: [
          {
            text: 'Dashboard',
            route: '/dashboard',
            icon: 'bi bi-speedometer2'
          }
        ]
      },

      // Organization-specific menu
      orgMenu: {
        groupKind: 'org',  // Only shows when activeGroup.kind === 'org'
        items: [
          {
            text: 'Dashboard',
            route: '/dashboard',
            icon: 'bi bi-speedometer2'
          },
          {
            text: 'User Management',
            route: '/users',
            icon: 'bi bi-people'
          },
          {
            text: 'Company Settings',
            route: '/settings',
            icon: 'bi bi-gear'
          }
        ]
      },

      // Team-specific menu
      teamMenu: {
        groupKind: 'team',  // Only shows when activeGroup.kind === 'team'
        items: [
          {
            text: 'Dashboard',
            route: '/dashboard',
            icon: 'bi bi-speedometer2'
          },
          {
            text: 'Projects',
            route: '/projects',
            icon: 'bi bi-kanban'
          },
          {
            text: 'Team Chat',
            route: '/chat',
            icon: 'bi bi-chat-dots'
          }
        ]
      }
    }
  }
});
```

### 2. Access Active Group in Pages

```javascript
class DashboardPage extends Page {
  async getViewData() {
    const baseData = await super.getViewData();
    const app = this.getApp();
    const activeGroup = app.getActiveGroup();

    return {
      ...baseData,
      groupName: activeGroup ? activeGroup.get('name') : 'None',
      groupKind: activeGroup ? activeGroup.get('kind') : 'N/A',
      isOrgGroup: activeGroup && activeGroup.get('kind') === 'org'
    };
  }
}
```

### 3. Programmatically Set Active Group

```javascript
// Set active group
const group = new Group({ id: 123, name: 'My Team', kind: 'team' });
await app.setActiveGroup(group);

// Clear active group
await app.clearActiveGroup();

// Get current active group
const activeGroup = app.getActiveGroup();
```

## Group Selection Flow

### When No Active Group is Set

1. **Sidebar shows GroupSelectionSidebarView** instead of regular menus
2. **Clean interface** with search functionality for group selection
3. **Main content** can show welcome page or instructions
4. **User selects group** → `app.setActiveGroup(group)` called
5. **Sidebar switches** to appropriate menu based on `group.kind`

### Group Selection UI Components

```html
<!-- Automatically rendered when no activeGroup -->
<div class="group-selection-sidebar">
  <div class="p-3 border-bottom bg-light">
    <h6>Select a Group</h6>
    <input type="text" class="form-control" placeholder="Search groups...">
  </div>
  
  <div class="flex-grow-1 overflow-auto">
    <div class="group-item p-3" data-action="select-group">
      <div class="fw-semibold">Acme Corporation</div>
      <small class="text-muted">org</small>
    </div>
    <!-- More groups... -->
  </div>
</div>
```

## API Reference

### PortalApp Methods

#### `async setActiveGroup(group)`
Sets the active group and updates the sidebar accordingly.

**Parameters:**
- `group` (Group): Group model instance

**Events Emitted:**
- `group:changed` - When group changes
- `group:cleared` - When group is cleared

```javascript
const group = new Group({ id: 1, name: 'Engineering', kind: 'team' });
await app.setActiveGroup(group);
```

#### `getActiveGroup()`
Returns the current active group or `null`.

```javascript
const activeGroup = app.getActiveGroup();
if (activeGroup) {
  console.log('Current group:', activeGroup.get('name'));
}
```

#### `async clearActiveGroup()`
Clears the active group and shows group selection interface.

```javascript
await app.clearActiveGroup();
```

#### `needsGroupSelection()`
Returns `true` if no active group is set.

```javascript
if (app.needsGroupSelection()) {
  console.log('User needs to select a group');
}
```

### Event System

```javascript
// Listen for group changes
app.events.on('group:changed', ({ group, previousGroup }) => {
  console.log(`Switched from ${previousGroup?.get('name')} to ${group.get('name')}`);
});

// Listen for group cleared
app.events.on('group:cleared', ({ previousGroup }) => {
  console.log(`Cleared group: ${previousGroup.get('name')}`);
});
```

## Menu Configuration

### Menu Structure with groupKind

```javascript
const menuConfig = {
  // Menu name (unique identifier)
  merchantMenu: {
    // Group kind filter - only show when activeGroup.kind matches
    groupKind: 'merchant',
    
    // Optional header content
    header: '<div class="p-3">Merchant Tools</div>',
    
    // Menu items
    items: [
      {
        text: 'Orders',
        route: '/orders',
        icon: 'bi bi-bag-check'
      },
      {
        text: 'Inventory',
        route: '/inventory',
        icon: 'bi bi-boxes'
      },
      '', // Divider
      {
        text: 'Store Settings',
        icon: 'bi bi-gear',
        children: [
          {
            text: 'Payment Methods',
            route: '/settings/payments',
            icon: 'bi bi-credit-card'
          }
        ]
      }
    ],
    
    // Optional footer content
    footer: '<div class="p-2 text-center small text-muted">v1.0</div>'
  }
};
```

### Group Header

When an active group is set, the sidebar automatically adds a group header to matching menus:

```html
<div class="group-header">
  <div class="d-flex align-items-center justify-content-between cursor-pointer" 
       data-action="change-group">
    <div>
      <div class="fw-semibold">Engineering Team</div>
      <small class="text-muted">team</small>
    </div>
    <i class="bi bi-chevron-down"></i>
  </div>
</div>
```

## Storage and Persistence

### LocalStorage Integration

Active group ID is automatically saved to localStorage with app-specific keys:

```javascript
// Storage key format: {app_title}_active_group_id
// Example: "my_portal_active_group_id"

// Automatically handled by PortalApp:
localStorage.setItem('my_portal_active_group_id', '123');
```

### Custom Storage Keys

```javascript
// Override storage key generation
class CustomPortalApp extends PortalApp {
  getActiveGroupStorageKey() {
    return `custom_app_${this.version}_group`;
  }
}
```

## Group Model Requirements

Your Group model should have these properties for proper activeGroup functionality:

```javascript
class Group extends Model {
  constructor(data = {}) {
    super(data, {
      endpoint: '/api/groups'
    });
  }
}

// Required properties:
const group = new Group({
  id: 123,           // Unique identifier
  name: 'My Team',   // Display name
  kind: 'team'       // Group type (org, team, department, merchant, etc.)
});
```

## Styling

### CSS Classes

The activeGroup feature uses these CSS classes (included in `portal.css`):

```css
/* Group selection interface */
.group-selection-sidebar { /* Main container */ }
.group-item { /* Individual group items */ }
.group-item:hover { /* Hover effects */ }

/* Group header in menus */
.group-header { /* Header container */ }
.group-header .cursor-pointer { /* Clickable area */ }
```

### Customization

```css
/* Custom group item styling */
.group-item {
  border-radius: 0.5rem;
  margin: 0.25rem;
}

.group-item:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
```

## Best Practices

### 1. Menu Organization

```javascript
// Good: Clear menu names and consistent groupKind values
const menus = {
  orgAdminMenu: { groupKind: 'org', items: [...] },
  teamCollabMenu: { groupKind: 'team', items: [...] },
  merchantStoreMenu: { groupKind: 'merchant', items: [...] }
};
```

### 2. Group Selection UX

```javascript
// Good: Provide helpful empty states
if (!app.getActiveGroup()) {
  app.showInfo('Please select a group to continue using the portal.');
}
```

### 3. Permission Integration

```javascript
// Combine with existing permission system
const menuItems = [
  {
    text: 'Admin Panel',
    route: '/admin',
    icon: 'bi bi-shield',
    permissions: ['admin']  // Requires both group context AND permission
  }
];
```

### 4. Error Handling

```javascript
try {
  await app.setActiveGroup(group);
  app.showSuccess(`Switched to ${group.get('name')}`);
} catch (error) {
  console.error('Group switch failed:', error);
  app.showError('Failed to switch groups. Please try again.');
}
```

## Migration Guide

### From Regular PortalApp

1. **Add groupKind to existing menus:**
```javascript
// Before
sidebar: {
  items: [...]
}

// After
sidebar: {
  menus: {
    default: { items: [...] },
    teamMenu: { groupKind: 'team', items: [...] }
  }
}
```

2. **Update pages to use activeGroup:**
```javascript
// Add to existing pages
async getViewData() {
  const data = await super.getViewData();
  const activeGroup = this.getApp().getActiveGroup();
  return { ...data, activeGroup };
}
```

3. **Handle group selection flow:**
```javascript
// Let PortalApp handle automatically, or customize:
if (app.needsGroupSelection()) {
  // Custom logic for group-less users
}
```

## Common Patterns

### Multi-Level Group Hierarchies

```javascript
// Parent-child group relationships
const parentGroup = new Group({ id: 1, name: 'Acme Corp', kind: 'org' });
const childGroup = new Group({ 
  id: 2, 
  name: 'Engineering', 
  kind: 'team',
  parent_id: 1 
});
```

### Dynamic Menu Items

```javascript
// Menus that adapt to group properties
const menu = {
  groupKind: 'merchant',
  items: [
    {
      text: activeGroup.get('store_type') === 'online' ? 'Website' : 'POS System',
      route: '/store-management',
      icon: 'bi bi-shop'
    }
  ]
};
```

### Cross-Group Navigation

```javascript
// Allow users to switch groups from within pages
async handleActionSwitchGroup(event, element) {
  const targetGroupId = element.getAttribute('data-group-id');
  const group = await Group.fetch(targetGroupId);
  await this.getApp().setActiveGroup(group);
}
```

This activeGroup system provides a powerful, flexible way to create context-aware portal applications that adapt to user's current working context while maintaining clean, intuitive navigation patterns.