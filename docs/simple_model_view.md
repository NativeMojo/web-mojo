# Building a Simple Model View

This guide demonstrates how to create a view that displays and manages a single model instance with tabbed content areas, using the MOJO framework patterns.

## Basic Structure

A model view typically consists of:
- A header section displaying key model information
- A context menu for model actions
- Tabbed sections for organizing different aspects of the model
- Integration with DataView, FormView, and TableView components

## Step-by-Step Implementation

### 1. Define the View Class

```js
import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import FormView from '@core/forms/FormView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { YourModel } from '@core/models/YourModel.js';

class YourModelView extends View {
    constructor(options = {}) {
        super({
            className: 'your-model-view',
            ...options
        });

        // Store the model instance
        this.model = options.model || new YourModel(options.data || {});

        // Define child view references
        this.tabView = null;
        this.headerView = null;

        // Set the main template with containers
        this.template = `
            <div class="model-view-container">
                <div data-container="model-header"></div>
                <div data-container="model-tabs"></div>
            </div>
        `;
    }
}
```

### 2. Create the Header View

The header displays key model information and status:

```js
async onInit() {
    // Create header view with model information
    this.headerView = new View({
        containerId: 'model-header',
        template: `
            <div class="d-flex justify-content-between align-items-start mb-4">
                <!-- Left: Primary Identity -->
                <div class="d-flex align-items-center gap-3">
                    {{{model.avatar|avatar('md','rounded-circle')}}}
                    <div>
                        <h3 class="mb-0">{{model.name|default('Unnamed')}}</h3>
                        <div class="text-muted small">{{model.email}}</div>
                    </div>
                </div>

                <!-- Right: Status & Actions -->
                <div class="d-flex align-items-start gap-4">
                    <div class="text-end">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-circle-fill fs-8 {{model.is_active|boolean('text-success','text-secondary')}}"></i>
                            <span>{{model.is_active|boolean('Active','Inactive')}}</span>
                        </div>
                        {{#model.last_updated}}
                            <div class="text-muted small mt-1">Updated {{model.last_updated|relative}}</div>
                        {{/model.last_updated}}
                    </div>
                    <div data-container="context-menu"></div>
                </div>
            </div>
        `
    });

    this.headerView.setModel(this.model);
    this.addChild(this.headerView);
}
```

### 3. Add Context Menu

Create a context menu for model actions:

```js
const contextMenu = new ContextMenu({
    containerId: 'context-menu',
    className: "context-menu-view header-menu-absolute",
    context: this.model,
    config: {
        icon: 'bi-three-dots-vertical',
        items: [
            { label: 'Edit', action: 'edit-model', icon: 'bi-pencil' },
            { label: 'Delete', action: 'delete-model', icon: 'bi-trash' },
            { type: 'divider' },
            this.model.get('is_active')
                ? { label: 'Deactivate', action: 'deactivate', icon: 'bi-x-circle' }
                : { label: 'Activate', action: 'activate', icon: 'bi-check-circle' }
        ]
    }
});
this.addChild(contextMenu);
```

### 4. Create Tab Content Views

#### Profile Tab (DataView)
Display read-only model data:

```js
this.profileView = new DataView({
    model: this.model,
    className: "p-3",
    showEmptyValues: true,
    fields: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email', formatter: 'email' },
        { key: 'created', label: 'Created', formatter: 'datetime' },
        { key: 'status', label: 'Status' }
    ]
});
```

#### Settings Tab (FormView)
Allow editing model fields:

```js
this.settingsView = new FormView({
    fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'is_active', label: 'Active', type: 'checkbox' }
    ],
    model: this.model,
    autosaveModelField: true // Enable auto-save with status indicators
});
```

#### Related Data Tab (TableView)
Show related models in a table:

```js
const relatedCollection = new RelatedModelList({
    params: { 
        parent_id: this.model.get('id'),
        size: 10
    }
});

this.relatedView = new TableView({
    collection: relatedCollection,
    hideActivePillNames: ['parent_id'],
    columns: [
        { key: 'id', label: 'ID', sortable: true, width: '60px' },
        { key: 'created', label: 'Created', formatter: 'datetime', sortable: true },
        { key: 'name', label: 'Name', sortable: true },
        { key: 'status|badge', label: 'Status' }
    ]
});
```

### 5. Assemble TabView

Combine all tab views:

```js
this.tabView = new TabView({
    tabs: {
        'Profile': this.profileView,
        'Settings': this.settingsView,
        'Related Data': this.relatedView
    },
    activeTab: 'Profile',
    containerId: 'model-tabs',
    enableResponsive: true,
    dropdownStyle: "select",
    minWidth: 300
});

this.addChild(this.tabView);
```

### 6. Implement Action Handlers

Handle context menu and other actions:

```js
async onActionEditModel() {
    const resp = await Dialog.showModelForm({
        title: `Edit ${this.model.get('name')}`,
        model: this.model,
        formConfig: YourModel.FORM_CONFIG
    });
    if (resp) {
        this.render();
    }
}

async onActionDeleteModel() {
    const confirmed = await Dialog.confirm({
        title: 'Delete Model',
        message: 'Are you sure you want to delete this model?'
    });
    if (confirmed) {
        await this.model.destroy();
        // Navigate away or emit event
    }
}

async onActionDeactivate() {
    await this.model.save({ is_active: false });
    this.render();
}

async onActionActivate() {
    await this.model.save({ is_active: true });
    this.render();
}
```

### 7. Prevent Unnecessary Re-renders

Override `_onModelChange` to prevent full view re-renders on model changes:

```js
_onModelChange() {
    // Do nothing - child views handle their own model changes
    // This prevents the entire view from re-rendering on every model update
}
```

### 8. Add Static Factory Method

Register the view class with the model:

```js
static create(options = {}) {
    return new YourModelView(options);
}
```

At the end of the file:
```js
YourModel.VIEW_CLASS = YourModelView;
export default YourModelView;
```

## Complete Example Template

```js
import View from '@core/View.js';
import TabView from '@core/views/navigation/TabView.js';
import DataView from '@core/views/data/DataView.js';
import FormView from '@core/forms/FormView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { YourModel, RelatedModelList } from '@core/models/YourModel.js';

class YourModelView extends View {
    constructor(options = {}) {
        super({
            className: 'your-model-view',
            ...options
        });

        this.model = options.model || new YourModel(options.data || {});
        this.tabView = null;

        this.template = `
            <div class="model-view-container">
                <div data-container="model-header"></div>
                <div data-container="model-tabs"></div>
            </div>
        `;
    }

    async onInit() {
        // Create header
        this.headerView = new View({
            containerId: 'model-header',
            template: `
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="d-flex align-items-center gap-3">
                        <div>
                            <h3 class="mb-0">{{model.name}}</h3>
                            <div class="text-muted small">{{model.description}}</div>
                        </div>
                    </div>
                    <div data-container="context-menu"></div>
                </div>
            `
        });
        this.headerView.setModel(this.model);
        this.addChild(this.headerView);

        // Create context menu
        const contextMenu = new ContextMenu({
            containerId: 'context-menu',
            className: "context-menu-view header-menu-absolute",
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'Edit', action: 'edit-model', icon: 'bi-pencil' },
                    { label: 'Delete', action: 'delete-model', icon: 'bi-trash' }
                ]
            }
        });
        this.addChild(contextMenu);

        // Create tab views
        this.profileView = new DataView({
            model: this.model,
            className: "p-3",
            fields: [
                { key: 'id', label: 'ID' },
                { key: 'name', label: 'Name' }
            ]
        });

        // Create TabView
        this.tabView = new TabView({
            tabs: {
                'Profile': this.profileView
            },
            activeTab: 'Profile',
            containerId: 'model-tabs',
            enableResponsive: true
        });

        this.addChild(this.tabView);
    }

    async onActionEditModel() {
        const resp = await Dialog.showModelForm({
            title: `Edit ${this.model.get('name')}`,
            model: this.model,
            formConfig: YourModel.FORM_CONFIG
        });
        if (resp) {
            this.render();
        }
    }

    _onModelChange() {
        // Prevent full view re-renders
    }

    static create(options = {}) {
        return new YourModelView(options);
    }
}

YourModel.VIEW_CLASS = YourModelView;
export default YourModelView;
```

## Key Patterns

1. **Container-based composition**: Use `data-container` attributes for child view mounting
2. **Model-aware header**: Pass model to header view with `setModel()`
3. **Tab organization**: Group related functionality in tabs (profile, settings, related data)
4. **Component reuse**: Leverage DataView, FormView, and TableView for common patterns
5. **Action handling**: Use kebab-case `data-action` attributes with `onAction*` handlers
6. **Prevent over-rendering**: Override `_onModelChange()` to let child views handle updates
7. **Factory pattern**: Register view class with model via `MODEL.VIEW_CLASS`

## Reference

See `src/extensions/admin/views/UserView.js` for a comprehensive real-world example.
