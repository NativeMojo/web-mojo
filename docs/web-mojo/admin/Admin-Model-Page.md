# Building an Admin Portal Page for a Backend Model

A complete admin portal page requires three interconnected files: a **Model** (data + forms), a **ModelView** (detail inspector), and a **TablePage** (list management). This guide explains the exact pattern.

---

## Step 1: Define the Model & Collection

**File:** `src/core/models/YourModel.js`  
**Read first:** [Model.md](../core/Model.md), [Collection.md](../core/Collection.md)

The Model defines the REST endpoint and shared field definitions. The Collection defines the list endpoint and default page size. **Do not skip the Collection**—it's required by TablePage.

### Rules
- Model constructor must call `super(data, { endpoint: '/api/yourmodel' })`
- Collection must extend `Collection` with `ModelClass` and `endpoint`
- Define shared field objects (not inside forms) so inline editors and modal forms never drift
- Export form configs as static getters that return fresh field arrays on each call (FormBuilder mutates them)
- Define enum maps (e.g., `STATUS_OPTIONS`) once as a single source of truth; reference by name in forms

### Example

```javascript
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

class YourModel extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/yourmodel'
        });
    }
}

class YourModelList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: YourModel,
            endpoint: '/api/yourmodel',
            size: 10,
            ...options
        });
    }
}

// Canonical enum (shared source of truth)
const StatusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' }
];

// Shared field definitions (fresh copy on each form access)
function yourModelFields() {
    return {
        name:        { name: 'name', type: 'text', label: 'Name', required: true, columns: 12 },
        status:      { name: 'status', type: 'select', label: 'Status', options: StatusOptions, columns: 6 },
        description: { name: 'description', type: 'textarea', label: 'Description', columns: 12 },
        enabled:     { name: 'is_enabled', type: 'switch', label: 'Enabled', columns: 6 }
    };
}

// Form configs
const YourModelForms = {
    get create() {
        const f = yourModelFields();
        return {
            title: 'Create Item',
            fields: [f.name, f.status]
        };
    },

    get edit() {
        const f = yourModelFields();
        return {
            title: 'Edit Item',
            fields: [f.name, f.status, f.description, f.enabled]
        };
    }
};

// Register form configs on the Model
YourModel.ADD_FORM = YourModelForms.create;
YourModel.EDIT_FORM = YourModelForms.edit;

export { YourModel, YourModelList, YourModelForms, StatusOptions };
```

---

## Step 2: Build the ModelView (Detail Inspector)

**File:** `src/extensions/admin/yourmodels/YourModelView.js`  
**Read first:** [DetailView.md](../components/DetailView.md), [Templates.md](../core/Templates.md), [DataFormatter.md](../core/utils/DataFormatter.md), [TabView.md](../components/TabView.md)

The ModelView extends View and uses DetailView as its layout primitive. It displays a record with a clean header (title + context menu), organized sections, and nested lists or tables.

### Rules
- Always extend `View` (not `DetailView`); compose DetailView + sections manually for full control
- Header left: icon + title + eyebrow/breadcrumb. Header right: status badge or toggle (compact)
- Use **Mustache template syntax** for all display (`{{model.field}}`, `{{model.field|formatter}}`)
- Compute display fields as getters bound to `this`, NOT in the template
- Use `DataFormatter` pipes in templates: `{{model.created|epoch|datetime}}`, `{{model.count|default:'—'}}`
- Nested lists: use `ListView` (compact, scrollable) over `TableView` (only if many columns needed)
- Modal opens with `noBodyPadding: true` → content sits flush. Use `modal-body-flush` class on sections
- Context menu: keep actions minimal. Use "API actions" (e.g., `model.save({ action_key: true })`) instead of separate endpoints
- Avoid clutter: hide secondary info behind toggles or modals
- **Sidenav grouping**: If the sidenav has **5+ sections**, group related content using `TabView` (e.g., "Membership" tab groups Members + Sub-Groups; "Access" tab groups API Keys + Permissions)

### Example

```javascript
import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import ListView from '@core/views/list/ListView.js';
import Modal from '@core/views/feedback/Modal.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { YourModel, YourModelList, YourModelForms } from '@core/models/YourModel.js';

class YourModelView extends View {
    constructor(options = {}) {
        super({
            className: 'yourmodel-view',
            template: '', // Built by getTemplate()
            ...options
        });
    }

    async getTemplate() {
        return `
            <div class="detail-view">
                <div class="detail-header">
                    <div class="detail-header-left">
                        <i class="bi bi-box fs-4 text-primary"></i>
                        <div>
                            <h5 class="mb-0">{{model.name}}</h5>
                            <small class="text-secondary">{{statusLabel}}</small>
                        </div>
                    </div>
                    <div class="detail-header-right">
                        {{#model.is_enabled|bool}}
                            <span class="badge text-bg-success">Enabled</span>
                        {{/model.is_enabled|bool}}
                        {{^model.is_enabled|bool}}
                            <span class="badge text-bg-secondary">Disabled</span>
                        {{/model.is_enabled|bool}}
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-eyebrow">Overview</div>
                    <div class="detail-flat-row">
                        <div class="detail-flat-row-label">Status</div>
                        <div class="detail-flat-row-value">{{statusLabel|default:'—'}}</div>
                    </div>
                    <div class="detail-flat-row">
                        <div class="detail-flat-row-label">Created</div>
                        <div class="detail-flat-row-value">{{model.created|epoch|datetime}}</div>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="detail-section-eyebrow">Description</div>
                    <p>{{model.description|default:'<span class="text-secondary fst-italic">No description</span>'}}</p>
                </div>

                <div data-container="related-items"></div>
            </div>
        `;
    }

    async onInit() {
        const detailView = new DetailView({
            model: this.model,
            headerIcon: 'bi-box',
            title: this.model.get('name'),
            contextMenu: {
                items: [
                    { icon: 'bi-pencil', label: 'Edit', action: 'edit' },
                    { type: 'divider' },
                    { icon: 'bi-power', label: 'Toggle State', action: 'toggle-state', red: false }
                ]
            }
        });
        this.addChild(detailView);

        // Nested list example
        const itemsList = new ListView({
            collection: new ItemList({ parent: this.model.id }),
            title: 'Items',
            itemClass: ItemListItem,
            clickAction: 'view',
            viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] },
            searchable: true,
            showAdd: true
        });
        this.addChild(itemsList, { containerId: 'related-items' });
    }

    // Computed properties bound by Mustache
    get statusLabel() {
        const status = this.model?.get?.('status');
        const map = { draft: 'Draft', active: 'Active', archived: 'Archived' };
        return map[status] || '—';
    }

    // Action handlers
    async onActionEdit() {
        const form = await Modal.modelForm({
            model: this.model,
            fields: YourModelForms.edit.fields,
            title: 'Edit Item'
        });
        if (form) {
            await this.model.save(form);
            this.render(); // Re-render to reflect changes
        }
    }

    async onActionToggleState() {
        this.model.set('is_enabled', !this.model.get('is_enabled'));
        await this.model.save({ action: 'toggle' }); // API action
        this.render();
    }
}

// Wire the view to the model
YourModel.VIEW_CLASS = YourModelView;

export default YourModelView;
```

### Using TabView to Group Sections

When your ModelView has **5+ sidenav sections**, use `TabView` to group related content and keep the interface clean. Common groupings: "Overview", "Membership" (members + sub-groups), "Access" (API keys + permissions), "Activity" (events + audit).

**Example: Grouped sections with TabView**

```javascript
import TabView from '@core/views/tabs/TabView.js';

class YourModelView extends View {
    // ... same as above ...

    async onInit() {
        // Overview section (standalone)
        const overviewSection = new YourModelOverviewSection({
            model: this.model,
            itemsCollection: this.itemsCollection
        });
        this.addChild(overviewSection, { containerId: 'overview' });

        // Group "Membership" content into a tab
        const membersSection = new ListView({ /* members */ });
        const subGroupsSection = new ListView({ /* sub-groups */ });

        const membershipTab = new TabView({
            tabs: {
                'Members': membersSection,
                'Sub-Groups': subGroupsSection
            },
            variant: 'minimal'
        });
        this.addChild(membershipTab, { containerId: 'membership' });

        // Group "Access" content into a tab
        const apiKeysSection = new ListView({ /* API keys */ });
        const permissionsSection = new View({
            template: '<div>Permissions editor</div>'
        });

        const accessTab = new TabView({
            tabs: {
                'API Keys': apiKeysSection,
                'Permissions': permissionsSection
            },
            variant: 'minimal'
        });
        this.addChild(accessTab, { containerId: 'access' });

        // Activity section (standalone)
        const auditSection = new Timeline({
            collection: this.auditCollection
        });
        this.addChild(auditSection, { containerId: 'activity' });
    }
}
```

**Template:**
```html
<div class="detail-view">
    <div class="detail-header">...</div>
    <div data-container="overview"></div>
    <div data-container="membership"></div>
    <div data-container="access"></div>
    <div data-container="activity"></div>
</div>
```

This keeps the page organized without overwhelming the user with a 10+ item sidenav. See [TabView.md](../components/TabView.md) for full API and variants.

---

## Step 3: Build the TablePage (List Management)

**File:** `src/extensions/admin/yourmodels/YourModelTablePage.js`  
**Read first:** [TablePage.md](../pages/TablePage.md)

TablePage manages a collection in a data table with sorting, filtering, batch actions, and row-click modal detail views.

### Rules
- Set `Collection` and `VIEW_CLASS` on the Model before instantiating TablePage
- Columns: **keep to 5–7 max**. Hide secondary columns behind `visibility: 'lg'` / `'xl'` (responsive)
- Use `DataFormatter` pipes in column keys: `'created|epoch|datetime'`, `'status|badge'`, `'count|default:"—"'`
- Formatters must be defined in `DataFormatter.js`; never use inline template logic in column configs
- Filters: ask the user what they need. Boolean filters are common; text filters require backend support
- Search: keep the placeholder clear: `'Search name or UUID'` (tell user what fields are searchable)
- Batch actions: only include actions the user actually needs. Common: delete, activate/deactivate, export
- `defaultQuery`: set default filter state (e.g., `is_active: 'true'` to show active items by default)
- Context menu: duplicate key row actions (edit, delete); only add unique bulk/admin actions

### Example

```javascript
import TablePage from '@core/pages/TablePage.js';
import { YourModel, YourModelList, YourModelForms } from '@core/models/YourModel.js';
import YourModelView from './YourModelView.js';

// Register form configs and view class on the Model
YourModel.ADD_FORM = YourModelForms.create;
YourModel.EDIT_FORM = YourModelForms.edit;
YourModel.VIEW_CLASS = YourModelView;

class YourModelTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_yourmodels',
            pageName: 'Manage Items',
            router: 'admin/yourmodels',
            Collection: YourModelList,

            // Modal for row-click detail view
            viewDialogOptions: {
                header: false,
                noBodyPadding: true,
                buttons: []
            },

            // Default filters applied on page load
            defaultQuery: {
                sort: '-id',
                is_enabled: 'true' // Show enabled items by default
            },

            // Column definitions (5–7 max for readability)
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    sortable: true,
                    class: 'text-muted fs-8'
                },
                {
                    key: 'name',
                    label: 'Name',
                    sortable: true
                },
                {
                    key: 'status|badge',
                    label: 'Status',
                    sortable: true,
                    filter: {
                        type: 'select',
                        options: YourModel.StatusOptions
                    }
                },
                {
                    key: 'is_enabled|yesnoicon',
                    label: 'Enabled',
                    sortable: true,
                    visibility: 'lg'
                },
                {
                    key: 'created|epoch|datetime',
                    label: 'Created',
                    sortable: true,
                    visibility: 'xl',
                    class: 'text-muted fs-8'
                }
            ],

            // Filters (what the user can filter by)
            filters: [
                {
                    key: 'is_enabled',
                    label: 'Enabled',
                    type: 'boolean',
                    trueLabel: 'Enabled',
                    falseLabel: 'Disabled'
                },
                {
                    key: 'status',
                    label: 'Status',
                    type: 'select',
                    options: YourModel.StatusOptions
                }
            ],

            // Search fields
            searchPlaceholder: 'Search name or description',

            // Row-click context menu
            contextMenu: [
                { icon: 'bi-pencil', action: 'edit', label: 'Edit' },
                { icon: 'bi-eye', action: 'view', label: 'View Details' },
                { type: 'divider' },
                { icon: 'bi-trash', action: 'delete', label: 'Delete', red: true }
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: false, // Set to true if backend supports CSV export

            // Empty state message
            emptyMessage: 'No items found. Click "Add" to create your first one.',

            // Batch actions (only what users actually need)
            batchBarLocation: 'top',
            batchActions: [
                { label: 'Delete', icon: 'bi-trash', action: 'batch-delete' },
                { label: 'Activate', icon: 'bi-check-circle', action: 'batch-activate' },
                { label: 'Deactivate', icon: 'bi-x-circle', action: 'batch-deactivate' }
            ],

            // Table display
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }

    // Batch action handlers (optional custom logic)
    async onActionBatchActivate(items) {
        await Promise.all(items.map(item =>
            item.save({ action: 'activate' })
        ));
        await this.collection.fetch(); // Refresh
    }

    async onActionBatchDeactivate(items) {
        await Promise.all(items.map(item =>
            item.save({ action: 'deactivate' })
        ));
        await this.collection.fetch();
    }
}

export default YourModelTablePage;
```

---

## Wiring It All Together

1. **Export the Model, Collection, and Form config** from `src/core/models/YourModel.js`
2. **Register the View and Forms on the Model** before using:
   ```javascript
   YourModel.VIEW_CLASS = YourModelView;
   YourModel.ADD_FORM = YourModelForms.create;
   YourModel.EDIT_FORM = YourModelForms.edit;
   ```
3. **Import and wire in TablePage**:
   ```javascript
   import { YourModel } from '@core/models/YourModel.js';
   import YourModelView from './YourModelView.js';
   YourModel.VIEW_CLASS = YourModelView;
   ```

---

## Key Patterns & Anti-Patterns

### ✅ Do
- **One source of truth**: Define enums and field configs once; reference by name everywhere
- **Fresh form copies**: Use getters that return new arrays so forms never share mutable state
- **Lean headers**: Title + context menu on left; status badge + toggle on right. Nothing else
- **API actions**: Use `model.save({ action_key: true })` instead of separate POST endpoints
- **Minimal columns**: Keep table to 5–7 columns; hide tertiary data behind `visibility: 'lg'` / `'xl'`
- **Compact lists**: Prefer `ListView` over `TableView` for narrow modal detail views
- **DataFormatter**: Use pipes in templates and column keys; define custom formatters in `DataFormatter.js`
- **Mustache bindings**: Use `{{model.field|formatter}}` for all display; compute complex fields as getters

### ❌ Don't
- Import `web-mojo` from inside framework source (use `@core` / `@ext` instead)
- Fetch data in `onAfterRender()` / `onAfterMount()` (fetch in `onInit()` or action handlers)
- Manually call `render()` / `mount()` on child views after `addChild()` (let the framework manage)
- Hard-code enums and field definitions in multiple places (define once, export, reference by name)
- Use inline template logic (compute in getters and bind to `this`)
- Mix table columns and table rows (responsive `visibility` hides columns; don't swap to ListView mid-page)
- Clutter the header with secondary info (use collapsible sections or modals instead)
- Create separate admin endpoints (use query params on standard CRUD endpoints; e.g., `GET /api/user?_admin=true`)

---

## Testing & Verification

- **Unit tests**: Test Model constructors, Collection endpoints, and form field definitions
- **Integration**: Open TablePage → click add → fill form → save → verify list updates
- **Modal detail**: Click row → inspect header layout, sections, nested lists
- **Responsive**: Resize browser; verify `visibility: 'lg'` columns hide, `visibility: 'xl'` columns hide
- **Dark theme**: Flip theme toggle; verify contrast and all elements render in both light and dark

---

## References

- [Model.md](../core/Model.md) — Model and Collection API
- [DetailView.md](../components/DetailView.md) — Detail view layout primitive
- [TablePage.md](../pages/TablePage.md) — Table page configuration
- [Templates.md](../core/Templates.md) — Mustache template syntax and formatters
- [DataFormatter.md](../core/utils/DataFormatter.js) — Formatter pipes (80+ built-in formatters)
- [Modal.md](../components/Modal.md) — Modal static API (`Modal.alert`, `Modal.form`, `Modal.detail`, etc.)
- [TabView.md](../components/TabView.md) — Tabbed interface for grouping related sections (when sidenav has 5+ items)
