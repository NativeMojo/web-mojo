/**
 * DialogsPage - Comprehensive showcase of Dialog component features
 * Including the new context menu functionality with permissions
 */

import Page from '/src/core/Page.js';
import View from '/src/core/View.js';
import Dialog from '/src/core/Dialog.js';

// Mock user with permission system for context menu demonstration
class MockUser {
    constructor() {
        this.isAdmin = false;
        this.permissions = new Set(['view_basic', 'edit_content']);
    }

    hasPermission(permission) {
        if (this.isAdmin) return true;
        return this.permissions.has(permission);
    }

    setAdmin(isAdmin) {
        this.isAdmin = isAdmin;
        if (isAdmin) {
            this.permissions.add('view_admin');
            this.permissions.add('manage_users');
            this.permissions.add('system_settings');
        } else {
            this.permissions.delete('view_admin');
            this.permissions.delete('manage_users');
            this.permissions.delete('system_settings');
        }
    }

    togglePermission(permission) {
        if (this.permissions.has(permission)) {
            this.permissions.delete(permission);
        } else {
            this.permissions.add(permission);
        }
    }
}

// Initialize mock user in global scope for permission system
let mockUser = null;

// Initialize mock user when needed
function ensureMockUser() {
    if (!mockUser) {
        mockUser = new MockUser();
    }
    return mockUser;
}

// Global getApp fallback for permission system
if (!window.getApp) {
    window.getApp = () => ({
        activeUser: ensureMockUser()
    });
}

class DialogsPage extends Page {
    constructor(options = {}) {
        super({
            name: 'dialogs',
            title: 'Dialogs - MOJO Examples',
            template: 'templates/dialogs.mst',
            className: 'p-4',
            ...options
        });
    }

    async onAfterMount() {
        await super.onAfterMount();
        // Initialize permission status display
        this.updatePermissionStatus();
    }

    updatePermissionStatus() {
        // Get user from app state or use mock user
        let user;
        try {
            const app = this.getApp();
            user = app.activeUser || app.getState('activeUser');
        } catch (error) {
            // Fallback to mock user if WebApp not available
            user = null;
        }

        if (!user) {
            user = ensureMockUser();
            // Store in app state if possible
            try {
                this.getApp().setState('activeUser', user);
            } catch (error) {
                // Ignore if can't set state
            }
        }

        const statusEl = document.getElementById('permission-status');
        if (statusEl && user) {
            const permissions = user.permissions ? Array.from(user.permissions).join(', ') : 'none';
            statusEl.innerHTML = `
                <strong>Current Status:</strong> ${user.isAdmin ? 'Admin' : 'Regular User'}<br>
                <strong>Permissions:</strong> ${permissions}
            `;
        }
    }

    // ===========================================
    // SIZE EXAMPLES
    // ===========================================

    async onActionShowSmall() {
        const dialog = new Dialog({
            title: 'Small Dialog',
            size: 'sm',
            body: '<div class="p-3"><p>This is a small dialog. Perfect for simple confirmations or alerts.</p></div>',
            buttons: [
                { text: 'Close', class: 'btn-secondary', dismiss: true }
            ]
        });
        await this.showDialog(dialog);
    }

    async onActionShowDefault() {
        const dialog = new Dialog({
            title: 'Default Size Dialog',
            body: '<div class="p-3"><p>This is the default dialog size. It works well for most content.</p></div>',
            buttons: [
                { text: 'Got it', class: 'btn-primary', dismiss: true }
            ]
        });
        await this.showDialog(dialog);
    }

    async onActionShowLarge() {
        const dialog = new Dialog({
            title: 'Large Dialog',
            size: 'lg',
            body: `
                <div class="p-3">
                    <p>This is a large dialog. Great for forms, detailed content, or when you need more space.</p>
                    <div class="row">
                        <div class="col-md-6">
                            <h5>Column 1</h5>
                            <p>Content can be organized in columns in larger dialogs.</p>
                        </div>
                        <div class="col-md-6">
                            <h5>Column 2</h5>
                            <p>This provides better organization for complex content.</p>
                        </div>
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                { text: 'Save', class: 'btn-primary', dismiss: true }
            ]
        });
        await this.showDialog(dialog);
    }

    async onActionShowXl() {
        const dialog = new Dialog({
            title: 'Extra Large Dialog',
            size: 'xl',
            body: `
                <div class="p-3">
                    <p>This is an extra large dialog. Perfect for dashboards, data tables, or complex forms.</p>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Section 1</h6>
                                    <p class="card-text">Content area 1</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Section 2</h6>
                                    <p class="card-text">Content area 2</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Section 3</h6>
                                    <p class="card-text">Content area 3</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Close', class: 'btn-secondary', dismiss: true }
            ]
        });
        await this.showDialog(dialog);
    }

    async onActionShowFullscreen() {
        const dialog = new Dialog({
            title: 'Fullscreen Dialog',
            size: 'fullscreen',
            body: `
                <div class="p-4">
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="alert alert-info">
                                <h5 class="alert-heading">Fullscreen Mode</h5>
                                <p>This dialog takes up the entire viewport. Perfect for complex applications, forms, or when you need maximum screen real estate.</p>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-8">
                            <h4>Main Content Area</h4>
                            <p>This is where your primary content would go. You have the entire screen available.</p>
                            <div class="mb-3">
                                <label class="form-label">Sample Form Field</label>
                                <input type="text" class="form-control" placeholder="Enter some text">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Textarea</label>
                                <textarea class="form-control" rows="4" placeholder="Enter longer text here"></textarea>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <h4>Sidebar</h4>
                            <div class="list-group">
                                <div class="list-group-item">
                                    <h6>Option 1</h6>
                                    <p class="mb-1">Description of option 1</p>
                                </div>
                                <div class="list-group-item">
                                    <h6>Option 2</h6>
                                    <p class="mb-1">Description of option 2</p>
                                </div>
                                <div class="list-group-item">
                                    <h6>Option 3</h6>
                                    <p class="mb-1">Description of option 3</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                { text: 'Save Changes', class: 'btn-primary', dismiss: true }
            ]
        });
        await this.showDialog(dialog);
    }

    // ===========================================
    // RESPONSIVE FULLSCREEN EXAMPLES
    // ===========================================

    async onActionShowFullscreenSm() {
        const dialog = new Dialog({
            title: 'Fullscreen Below SM',
            size: 'fullscreen-sm-down',
            body: '<div class="p-3"><p>This dialog becomes fullscreen on small screens (below 576px) but remains modal on larger screens.</p></div>',
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await this.showDialog(dialog);
    }

    async onActionShowFullscreenMd() {
        const dialog = new Dialog({
            title: 'Fullscreen Below MD',
            size: 'fullscreen-md-down',
            body: '<div class="p-3"><p>This dialog becomes fullscreen on medium and smaller screens (below 768px).</p></div>',
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await this.showDialog(dialog);
    }

    async onActionShowFullscreenLg() {
        const dialog = new Dialog({
            title: 'Fullscreen Below LG',
            size: 'fullscreen-lg-down',
            body: '<div class="p-3"><p>This dialog becomes fullscreen on large and smaller screens (below 992px).</p></div>',
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await this.showDialog(dialog);
    }

    async onActionShowFullscreenXl() {
        const dialog = new Dialog({
            title: 'Fullscreen Below XL',
            size: 'fullscreen-xl-down',
            body: '<div class="p-3"><p>This dialog becomes fullscreen on extra large and smaller screens (below 1200px).</p></div>',
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await this.showDialog(dialog);
    }

    // ===========================================
    // DIALOG OPTIONS
    // ===========================================

    async onActionShowCentered() {
        const dialog = new Dialog({
            title: 'Centered Dialog',
            centered: true,
            body: '<div class="p-3"><p>This dialog is vertically centered in the viewport using Bootstrap\'s modal-dialog-centered class.</p></div>',
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await this.showDialog(dialog);
    }

    async onActionShowScrollable() {
        const dialog = new Dialog({
            title: 'Scrollable Dialog',
            scrollable: true,
            body: `
                <div class="p-3">
                    <p>This dialog has scrollable content within the modal body. When content exceeds the available height, the body becomes scrollable while the header and footer remain fixed.</p>
                    ${Array.from({length: 20}, (_, i) => `<p>Content line ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`).join('')}
                </div>
            `,
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await this.showDialog(dialog);
    }

    async onActionShowStatic() {
        const dialog = new Dialog({
            title: 'Static Backdrop',
            backdrop: 'static',
            keyboard: false,
            body: '<div class="p-3"><p>This dialog has a static backdrop. You cannot close it by clicking outside or pressing Escape. You must use the Close button.</p></div>',
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await this.showDialog(dialog);
    }

    async onActionShowNoFade() {
        const dialog = new Dialog({
            title: 'No Fade Animation',
            fade: false,
            body: '<div class="p-3"><p>This dialog appears immediately without the fade animation.</p></div>',
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }]
        });
        await this.showDialog(dialog);
    }

    // ===========================================
    // CONTEXT MENU EXAMPLES (NEW FEATURE)
    // ===========================================

    async onActionShowBasicContextMenu() {
        const dialog = new Dialog({
            title: 'Basic Context Menu',
            body: `
                <div class="p-3">
                    <h5>Dialog with Basic Context Menu</h5>
                    <p>This dialog demonstrates a basic context menu in the header. Click the three dots (⋮) in the header to see the menu options.</p>
                    <div class="alert alert-info">
                        <strong>Menu Features:</strong>
                        <ul class="mb-0">
                            <li>Save Document - triggers an action</li>
                            <li>Print - another action</li>
                            <li>Divider - visual separator</li>
                            <li>Close - closes the dialog</li>
                        </ul>
                    </div>
                </div>
            `,
            contextMenu: {
                items: [
                    {
                        id: 'save',
                        icon: 'bi-save',
                        action: 'save-document',
                        label: 'Save Document'
                    },
                    {
                        id: 'print',
                        icon: 'bi-printer',
                        action: 'print-document',
                        label: 'Print'
                    },
                    {
                        type: 'divider'
                    },
                    {
                        id: 'close',
                        icon: 'bi-x-lg',
                        action: 'close-dialog',
                        label: 'Close'
                    }
                ]
            }
        });

        // Add action handlers to the dialog
        dialog.onActionSaveDocument = async () => {
            this.getApp().showSuccess('Document saved successfully!');
        };

        dialog.onActionPrintDocument = async () => {
            this.getApp().showInfo('Printing document...');
        };

        dialog.onActionCloseDialog = async () => {
            dialog.hide();
        };

        await this.showDialog(dialog);
    }

    async onActionShowAdvancedContextMenu() {
        const user = this.getUser();
        const dialog = new Dialog({
            title: 'Advanced Context Menu with Permissions',
            body: `
                <div class="p-3">
                    <h5>Advanced Context Menu Features</h5>
                    <p>This dialog demonstrates advanced context menu capabilities:</p>
                    <ul>
                        <li><strong>Permission-based items</strong> - Admin panel only shows if you have admin permissions</li>
                        <li><strong>External links</strong> - Help link opens in a new tab</li>
                        <li><strong>Visual dividers</strong> - Separate menu sections</li>
                        <li><strong>Custom data attributes</strong> - Items can carry additional data</li>
                    </ul>
                    <div class="alert alert-secondary">
                        <strong>Current Status:</strong> ${user.isAdmin ? 'Admin User' : 'Regular User'}<br>
                        <strong>Permissions:</strong> ${Array.from(user.attributes.permissions).join(', ')}
                    </div>
                    <p><small class="text-muted">Try toggling admin mode using the buttons below to see how the context menu changes.</small></p>
                </div>
            `,
            contextMenu: {
                items: [
                    {
                        id: 'admin',
                        icon: 'bi-wrench',
                        action: 'admin-panel',
                        label: 'Admin Panel',
                        permissions: 'view_admin'
                    },
                    {
                        id: 'users',
                        icon: 'bi-people',
                        action: 'manage-users',
                        label: 'Manage Users',
                        permissions: 'manage_users',
                        'data-section': 'users'
                    },
                    {
                        id: 'settings',
                        icon: 'bi-gear',
                        action: 'system-settings',
                        label: 'System Settings',
                        permissions: 'system_settings'
                    },
                    {
                        type: 'divider'
                    },
                    {
                        id: 'help',
                        icon: 'bi-question-circle',
                        href: 'https://github.com/your-org/mojo-framework',
                        label: 'Help & Documentation',
                        target: '_blank'
                    },
                    {
                        id: 'feedback',
                        icon: 'bi-chat-square-text',
                        action: 'send-feedback',
                        label: 'Send Feedback'
                    },
                    {
                        type: 'divider'
                    },
                    {
                        id: 'close',
                        icon: 'bi-x-lg',
                        action: 'close-dialog',
                        label: 'Close'
                    }
                ]
            }
        });

        // Add action handlers
        dialog.onActionAdminPanel = async () => {
            this.getApp().showInfo('Opening admin panel...');
        };

        dialog.onActionManageUsers = async (event, el) => {
            const section = el.getAttribute('data-section');
            this.getApp().showInfo(`Managing ${section} section`);
        };

        dialog.onActionSystemSettings = async () => {
            this.getApp().showWarning('System settings require elevated privileges');
        };

        dialog.onActionSendFeedback = async () => {
            this.getApp().showSuccess('Feedback form would open here');
        };

        dialog.onActionCloseDialog = async () => {
            dialog.hide();
        };

        await this.showDialog(dialog);
    }

    async onActionShowCustomContextMenu() {
        const dialog = new Dialog({
            title: 'Custom Styled Context Menu',
            body: `
                <div class="p-3">
                    <h5>Custom Context Menu Styling</h5>
                    <p>This context menu demonstrates custom styling options:</p>
                    <ul>
                        <li>Custom trigger icon (gear ⚙ instead of three dots)</li>
                        <li>Custom button styling with borders</li>
                        <li>Themed menu items</li>
                    </ul>
                    <div class="alert alert-success">
                        The context menu appearance can be completely customized to match your application's design.
                    </div>
                </div>
            `,
            contextMenu: {
                icon: 'bi-gear-fill',
                buttonClass: 'btn btn-outline-light border-2',
                items: [
                    {
                        id: 'settings',
                        icon: 'bi-sliders',
                        action: 'open-settings',
                        label: 'Settings'
                    },
                    {
                        id: 'theme',
                        icon: 'bi-palette',
                        action: 'change-theme',
                        label: 'Change Theme'
                    },
                    {
                        id: 'export',
                        icon: 'bi-download',
                        action: 'export-data',
                        label: 'Export Data'
                    },
                    {
                        type: 'divider'
                    },
                    {
                        id: 'close',
                        icon: 'bi-x-lg',
                        action: 'close-dialog',
                        label: 'Close'
                    }
                ]
            }
        });

        dialog.onActionOpenSettings = async () => {
            this.getApp().showInfo('Settings panel would open here');
        };

        dialog.onActionChangeTheme = async () => {
            this.getApp().showInfo('Theme selector would appear here');
        };

        dialog.onActionExportData = async () => {
            this.getApp().showSuccess('Data export initiated');
        };

        dialog.onActionCloseDialog = async () => {
            dialog.hide();
        };

        await this.showDialog(dialog);
    }

    // Permission management actions
    async onActionToggleAdmin() {
        const user = this.getUser();
        user.setAdmin(!user.isAdmin);
        this.updatePermissionStatus();
        this.getApp().showSuccess(`Admin mode ${user.isAdmin ? 'enabled' : 'disabled'}`);
    }

    async onActionTogglePermission(event, element) {
        const permission = element.dataset.permission;
        const user = this.getUser();
        user.togglePermission(permission);
        this.updatePermissionStatus();
        this.getApp().showInfo(`Permission '${permission}' ${user.hasPermission(permission) ? 'granted' : 'revoked'}`);
    }

    // ===========================================
    // VIEW INSTANCES AS BODY
    // ===========================================

    async onActionShowViewDialog() {
        // Counter View component
        class CounterView extends View {
            constructor() {
                super();
                this.count = 0;
            }

            async getTemplate() {
                return `
                    <div class="text-center p-4">
                        <h3>Interactive Counter</h3>
                        <p>This is a View component inside a Dialog. It maintains its own state and handles user interactions.</p>
                        <div class="display-4 mb-3 text-primary">{{count}}</div>
                        <button class="btn btn-outline-primary me-2" data-action="decrement">
                            <i class="bi bi-dash"></i> Decrement
                        </button>
                        <button class="btn btn-outline-primary" data-action="increment">
                            <i class="bi bi-plus"></i> Increment
                        </button>
                    </div>
                `;
            }

            async onActionIncrement() {
                this.count++;
                await this.render();
            }

            async onActionDecrement() {
                this.count--;
                await this.render();
            }
        }

        const counterView = new CounterView();
        const dialog = new Dialog({
            title: 'Dialog with View Component',
            body: counterView,
            size: 'lg',
            buttons: [
                { text: 'Reset', class: 'btn-warning', action: 'reset-counter' },
                { text: 'Close', class: 'btn-secondary', dismiss: true }
            ]
        });

        dialog.onActionResetCounter = async () => {
            counterView.count = 0;
            await counterView.render();
        };

        await this.showDialog(dialog);
    }

    async onActionShowFormView() {
        class FormView extends View {
            async getTemplate() {
                return `
                    <div class="p-3">
                        <h5>User Information Form</h5>
                        <form id="user-form">
                            <div class="mb-3">
                                <label for="name" class="form-label">Full Name</label>
                                <input type="text" class="form-control" id="name" name="name" required>
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="email" name="email" required>
                            </div>
                            <div class="mb-3">
                                <label for="role" class="form-label">Role</label>
                                <select class="form-select" id="role" name="role">
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="moderator">Moderator</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="active" name="active" checked>
                                    <label class="form-check-label" for="active">Active User</label>
                                </div>
                            </div>
                        </form>
                    </div>
                `;
            }

            getFormData() {
                const form = this.element.querySelector('form');
                const formData = new FormData(form);
                return Object.fromEntries(formData.entries());
            }
        }

        const formView = new FormView();
        const dialog = new Dialog({
            title: 'Form Dialog Example',
            body: formView,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                { text: 'Save User', class: 'btn-primary', action: 'save-user' }
            ]
        });

        dialog.onActionSaveUser = async () => {
            const data = formView.getFormData();
            console.log('Form data:', data);
            this.getApp().showSuccess(`User ${data.name} saved successfully!`);
            dialog.hide();
        };

        await this.showDialog(dialog);
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    async onActionShowAlert() {
        await Dialog.alert('This is an alert dialog. It provides important information to users.', 'Alert Dialog');
    }

    async onActionShowConfirm() {
        const result = await Dialog.confirm('Are you sure you want to delete this item? This action cannot be undone.', 'Confirm Action');
        this.getApp().showInfo(`User clicked: ${result ? 'OK' : 'Cancel'}`);
    }

    async onActionShowPrompt() {
        const result = await Dialog.prompt('Please enter your name:', 'User Input', 'John Doe');
        if (result !== null) {
            this.getApp().showSuccess(`Hello, ${result}!`);
        } else {
            this.getApp().showInfo('User cancelled the prompt');
        }
    }

    async onActionShowCodeExample() {
        const jsCode = `
// Example of creating a dialog with context menu
const dialog = new Dialog({
  title: 'My Dialog',
  body: '<p>Hello World!</p>',
  contextMenu: {
    icon: 'bi-three-dots-vertical', // Optional: customize icon
    buttonClass: 'btn btn-link', // Optional: customize styling
    items: [
      {
        id: 'save',
        icon: 'bi-save',
        action: 'save-document',
        label: 'Save',
        permissions: 'edit_content' // Optional: require permission
      },
      {
        type: 'divider' // Visual separator
      },
      {
        id: 'help',
        icon: 'bi-question-circle',
        href: '/help',
        label: 'Help',
        target: '_blank' // External link
      }
    ]
  }
});

// Add action handlers
dialog.onActionSaveDocument = async () => {
  console.log('Save clicked');
};

dialog.show();
        `;

        await Dialog.showCode({
            code: jsCode,
            title: 'Context Menu Dialog Example',
            language: 'javascript'
        });
    }

    // ===========================================
    // PROMISE-BASED DIALOGS
    // ===========================================

    async onActionShowForm() {
        const formHtml = `
            <form id="sample-form">
                <div class="mb-3">
                    <label for="title" class="form-label">Title</label>
                    <input type="text" class="form-control" id="title" name="title" required>
                </div>
                <div class="mb-3">
                    <label for="description" class="form-label">Description</label>
                    <textarea class="form-control" id="description" name="description" rows="3"></textarea>
                </div>
                <div class="mb-3">
                    <label for="category" class="form-label">Category</label>
                    <select class="form-select" id="category" name="category">
                        <option value="general">General</option>
                        <option value="technical">Technical</option>
                        <option value="business">Business</option>
                    </select>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="urgent" name="urgent">
                    <label class="form-check-label" for="urgent">Urgent</label>
                </div>
            </form>
        `;

        try {
            const result = await Dialog.showForm(formHtml, 'Create New Item', {
                submitText: 'Create Item',
                submitClass: 'btn-success'
            });

            console.log('Form result:', result);
            this.getApp().showSuccess(`Item "${result.title}" created successfully!`);
        } catch (error) {
            this.getApp().showInfo('Form was cancelled');
        }
    }

    async onActionShowPromiseDialog() {
        const dialog = new Dialog({
            title: 'Promise-based Dialog',
            body: `
                <div class="p-3">
                    <p>This dialog demonstrates promise-based interaction. Click one of the buttons below to see the result.</p>
                    <div class="alert alert-info">
                        The dialog returns a promise that resolves with information about which button was clicked.
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Option A', class: 'btn-primary', result: 'option-a' },
                { text: 'Option B', class: 'btn-success', result: 'option-b' },
                { text: 'Option C', class: 'btn-warning', result: 'option-c' },
                { text: 'Cancel', class: 'btn-secondary', dismiss: true }
            ]
        });

        try {
            const result = await this.showDialogPromise(dialog);
            this.getApp().showSuccess(`You selected: ${result}`);
        } catch (error) {
            this.getApp().showInfo('Dialog was cancelled');
        }
    }

    // ===========================================
    // ADVANCED EXAMPLES
    // ===========================================

    async onActionShowWizard() {
        let currentStep = 1;
        const totalSteps = 3;

        const dialog = new Dialog({
            title: `Setup Wizard - Step ${currentStep} of ${totalSteps}`,
            size: 'lg',
            backdrop: 'static',
            body: this.getWizardStep(currentStep),
            buttons: [
                { text: 'Previous', class: 'btn-secondary', action: 'prev-step', disabled: currentStep === 1 },
                { text: currentStep === totalSteps ? 'Finish' : 'Next', class: 'btn-primary', action: 'next-step' },
                { text: 'Cancel', class: 'btn-outline-secondary', dismiss: true }
            ]
        });

        dialog.onActionPrevStep = async () => {
            if (currentStep > 1) {
                currentStep--;
                dialog.setTitle(`Setup Wizard - Step ${currentStep} of ${totalSteps}`);
                await dialog.setContent(this.getWizardStep(currentStep));

                // Update buttons
                const prevBtn = dialog.element.querySelector('[data-action="prev-step"]');
                const nextBtn = dialog.element.querySelector('[data-action="next-step"]');
                prevBtn.disabled = currentStep === 1;
                nextBtn.textContent = currentStep === totalSteps ? 'Finish' : 'Next';
            }
        };

        dialog.onActionNextStep = async () => {
            if (currentStep < totalSteps) {
                currentStep++;
                dialog.setTitle(`Setup Wizard - Step ${currentStep} of ${totalSteps}`);
                await dialog.setContent(this.getWizardStep(currentStep));

                // Update buttons
                const prevBtn = dialog.element.querySelector('[data-action="prev-step"]');
                const nextBtn = dialog.element.querySelector('[data-action="next-step"]');
                prevBtn.disabled = currentStep === 1;
                nextBtn.textContent = currentStep === totalSteps ? 'Finish' : 'Next';
            } else {
                this.getApp().showSuccess('Wizard completed successfully!');
                dialog.hide();
            }
        };

        await this.showDialog(dialog);
    }

    async onActionShowLoading() {
        const dialog = new Dialog({
            title: 'Loading State Example',
            body: `
                <div class="p-3">
                    <p>This dialog demonstrates loading states and dynamic content updates.</p>
                    <div id="load-content">
                        <p>Click "Load Data" to see the loading indicator in action.</p>
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Load Data', class: 'btn-primary', action: 'load-data' },
                { text: 'Close', class: 'btn-secondary', dismiss: true }
            ]
        });

        dialog.onActionLoadData = async (event, element) => {
            // Disable the button and show loading
            element.disabled = true;
            element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

            // Set dialog loading state
            dialog.setLoading(true, 'Fetching data from server...');

            try {
                // Simulate async operation
                await new Promise(resolve => setTimeout(resolve, 2500));

                // Update content
                const content = `
                    <div class="p-3">
                        <div class="alert alert-success">
                            <i class="bi bi-check-circle me-2"></i>Data loaded successfully!
                        </div>
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Sample Data</h6>
                                <p class="card-text">Here's some dynamically loaded content.</p>
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span>Item 1</span>
                                        <span class="badge bg-primary">Active</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span>Item 2</span>
                                        <span class="badge bg-success">Complete</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span>Item 3</span>
                                        <span class="badge bg-warning">Pending</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                `;

                await dialog.setContent(content);

                // Update buttons
                const buttonsHtml = `
                    <button type="button" class="btn btn-success" data-bs-dismiss="modal">Great!</button>
                    <button type="button" class="btn btn-outline-secondary" data-action="reload-data">Reload</button>
                `;
                dialog.updateButtons(buttonsHtml);

            } catch (error) {
                this.getApp().showError('Failed to load data: ' + error.message);
            } finally {
                dialog.setLoading(false);
            }
        };

        await this.showDialog(dialog);
    }

    async onActionShowNested() {
        const dialog = new Dialog({
            title: 'Dialog with Nested Actions',
            body: `
                <div class="p-3">
                    <p>This dialog demonstrates various action handlers and nested interactions.</p>
                    <div class="d-grid gap-2 mb-3">
                        <button class="btn btn-info" data-action="show-info">Show Info Message</button>
                        <button class="btn btn-warning" data-action="show-warning">Show Warning</button>
                        <button class="btn btn-danger" data-action="show-error">Show Error</button>
                        <button class="btn btn-success" data-action="open-nested">Open Nested Dialog</button>
                    </div>
                    <div id="message-area"></div>
                </div>
            `,
            buttons: [
                { text: 'Clear Messages', class: 'btn-outline-secondary', action: 'clear-messages' },
                { text: 'Close', class: 'btn-secondary', dismiss: true }
            ]
        });

        dialog.onActionShowInfo = async () => {
            const messageArea = dialog.element.querySelector('#message-area');
            messageArea.innerHTML += '<div class="alert alert-info mt-2"><i class="bi bi-info-circle me-2"></i>Info message added!</div>';
        };

        dialog.onActionShowWarning = async () => {
            const messageArea = dialog.element.querySelector('#message-area');
            messageArea.innerHTML += '<div class="alert alert-warning mt-2"><i class="bi bi-exclamation-triangle me-2"></i>Warning message added!</div>';
        };

        dialog.onActionShowError = async () => {
            const messageArea = dialog.element.querySelector('#message-area');
            messageArea.innerHTML += '<div class="alert alert-danger mt-2"><i class="bi bi-x-circle me-2"></i>Error message added!</div>';
        };

        dialog.onActionOpenNested = async () => {
            const nestedDialog = new Dialog({
                title: 'Nested Dialog',
                body: '<div class="p-3"><p>This is a dialog opened from another dialog!</p></div>',
                buttons: [
                    { text: 'Close Nested', class: 'btn-primary', dismiss: true }
                ]
            });
            await this.showDialog(nestedDialog);
        };

        dialog.onActionClearMessages = async () => {
            const messageArea = dialog.element.querySelector('#message-area');
            messageArea.innerHTML = '';
        };

        await this.showDialog(dialog);
    }

    // ===========================================
    // SOURCE CODE EXAMPLES
    // ===========================================

    async onActionShowSizesSource() {
        const code = `// Dialog Size Examples

// Small dialog
const smallDialog = new Dialog({
  title: 'Small Dialog',
  size: 'sm',
  body: '<p>Perfect for confirmations</p>'
});

// Large dialog
const largeDialog = new Dialog({
  title: 'Large Dialog',
  size: 'lg',
  body: '<p>Great for forms and detailed content</p>'
});

// Extra large dialog
const xlDialog = new Dialog({
  title: 'Extra Large Dialog',
  size: 'xl',
  body: '<p>Maximum space for complex interfaces</p>'
});

// Fullscreen dialog
const fullscreenDialog = new Dialog({
  title: 'Fullscreen Dialog',
  size: 'fullscreen',
  body: '<p>Takes entire viewport</p>'
});

// Responsive fullscreen (fullscreen below md breakpoint)
const responsiveDialog = new Dialog({
  title: 'Responsive Dialog',
  size: 'fullscreen-md-down',
  body: '<p>Fullscreen on mobile, modal on desktop</p>'
});`;

        await Dialog.showCode({
            code: code,
            title: 'Dialog Sizes Source Code',
            language: 'javascript'
        });
    }

    async onActionShowOptionsSource() {
        const code = `// Dialog Options Examples

// Centered dialog
const centeredDialog = new Dialog({
  title: 'Centered Dialog',
  centered: true,
  body: '<p>Vertically centered in viewport</p>'
});

// Scrollable dialog
const scrollableDialog = new Dialog({
  title: 'Scrollable Dialog',
  scrollable: true,
  body: '<p>Long content that scrolls within modal body</p>'
});

// Static backdrop (cannot close by clicking outside)
const staticDialog = new Dialog({
  title: 'Static Dialog',
  backdrop: 'static',
  keyboard: false,
  body: '<p>Must use buttons to close</p>'
});

// No fade animation
const noFadeDialog = new Dialog({
  title: 'No Animation',
  fade: false,
  body: '<p>Appears immediately without animation</p>'
});

// Custom classes and attributes
const customDialog = new Dialog({
  title: 'Custom Dialog',
  className: 'my-custom-modal',
  attributes: {
    'data-custom': 'value',
    'aria-describedby': 'my-description'
  },
  body: '<p>Custom styled dialog</p>'
});`;

        await Dialog.showCode({
            code: code,
            title: 'Dialog Options Source Code',
            language: 'javascript'
        });
    }

    async onActionShowContextMenuSource() {
        const code = `// Context Menu Examples

// Basic context menu
const basicDialog = new Dialog({
  title: 'Dialog with Context Menu',
  body: '<p>Click the three dots in the header</p>',
  contextMenu: {
    items: [
      {
        id: 'save',
        icon: 'bi-save',
        action: 'save-document',
        label: 'Save Document'
      },
      {
        type: 'divider'
      },
      {
        id: 'close',
        icon: 'bi-x-lg',
        action: 'close-dialog',
        label: 'Close'
      }
    ]
  }
});

// Advanced context menu with permissions
const advancedDialog = new Dialog({
  title: 'Advanced Context Menu',
  body: '<p>Permission-based menu items</p>',
  contextMenu: {
    icon: 'bi-gear-fill', // Custom trigger icon
    buttonClass: 'btn btn-outline-light', // Custom styling
    items: [
      {
        id: 'admin',
        icon: 'bi-wrench',
        action: 'admin-panel',
        label: 'Admin Panel',
        permissions: 'view_admin' // Requires permission
      },
      {
        id: 'help',
        icon: 'bi-question-circle',
        href: '/help',
        label: 'Help',
        target: '_blank' // External link
      }
    ]
  }
});

// Add action handlers
basicDialog.onActionSaveDocument = async () => {
  console.log('Save clicked');
};

basicDialog.onActionCloseDialog = async () => {
  basicDialog.hide();
};`;

        await Dialog.showCode({
            code: code,
            title: 'Context Menu Source Code',
            language: 'javascript'
        });
    }

    // ===========================================
    // HELPER METHODS
    // ===========================================

    getWizardStep(step) {
        const steps = {
            1: `
                <div class="p-3">
                    <h5>Step 1: Personal Information</h5>
                    <p>Please provide your basic information to get started.</p>
                    <div class="mb-3">
                        <label for="wizard-name" class="form-label">Full Name *</label>
                        <input type="text" class="form-control" id="wizard-name" placeholder="Enter your full name">
                    </div>
                    <div class="mb-3">
                        <label for="wizard-email" class="form-label">Email Address *</label>
                        <input type="email" class="form-control" id="wizard-email" placeholder="Enter your email">
                    </div>
                    <div class="mb-3">
                        <label for="wizard-phone" class="form-label">Phone Number</label>
                        <input type="tel" class="form-control" id="wizard-phone" placeholder="(optional)">
                    </div>
                </div>
            `,
            2: `
                <div class="p-3">
                    <h5>Step 2: Preferences</h5>
                    <p>Configure your account preferences and settings.</p>
                    <div class="mb-3">
                        <label for="wizard-theme" class="form-label">Theme Preference</label>
                        <select class="form-select" id="wizard-theme">
                            <option value="light">Light Theme</option>
                            <option value="dark">Dark Theme</option>
                            <option value="auto">Auto (System Preference)</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="wizard-language" class="form-label">Language</label>
                        <select class="form-select" id="wizard-language">
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                            <option value="de">Deutsch</option>
                        </select>
                    </div>
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="wizard-notifications" checked>
                        <label class="form-check-label" for="wizard-notifications">
                            Enable email notifications
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="wizard-updates">
                        <label class="form-check-label" for="wizard-updates">
                            Subscribe to product updates
                        </label>
                    </div>
                </div>
            `,
            3: `
                <div class="p-3">
                    <h5>Step 3: Review & Confirm</h5>
                    <p>Please review your information before completing the setup.</p>
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle me-2"></i>
                        Everything looks good! Review the details below and click Finish to complete your setup.
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <strong>Account Summary</strong>
                        </div>
                        <div class="card-body">
                            <dl class="row mb-0">
                                <dt class="col-sm-4">Name:</dt>
                                <dd class="col-sm-8">John Doe</dd>
                                <dt class="col-sm-4">Email:</dt>
                                <dd class="col-sm-8">john.doe@example.com</dd>
                                <dt class="col-sm-4">Theme:</dt>
                                <dd class="col-sm-8">Light</dd>
                                <dt class="col-sm-4">Language:</dt>
                                <dd class="col-sm-8">English</dd>
                                <dt class="col-sm-4">Notifications:</dt>
                                <dd class="col-sm-8">Enabled</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            `
        };
        return steps[step] || '<p>Invalid step</p>';
    }

    async showDialog(dialog) {
        await dialog.render();
        document.body.appendChild(dialog.element);
        await dialog.mount();
        dialog.show();

        // Clean up when hidden
        dialog.on('hidden', () => {
            dialog.destroy();
            if (dialog.element && dialog.element.parentNode) {
                dialog.element.remove();
            }
        });

        return dialog;
    }

    async showDialogPromise(dialog) {
        return new Promise((resolve, reject) => {
            // Handle button clicks
            dialog.buttons?.forEach(button => {
                if (button.result) {
                    dialog.on(`action:${button.action || 'button'}`, () => {
                        resolve(button.result);
                        dialog.hide();
                    });
                }
            });

            // Handle dismissal
            dialog.on('hidden', () => {
                reject(new Error('Dialog dismissed'));
            });

            // Show dialog
            this.showDialog(dialog);
        });
    }

    showSuccess(message) {
        this.getApp().showSuccess(message);
    }

    showInfo(message) {
        this.getApp().showInfo(message);
    }

    showWarning(message) {
        this.getApp().showWarning(message);
    }

    showError(message) {
        this.getApp().showError(message);
    }

    // Helper method to get user consistently
    getUser() {
        let user;
        try {
            const app = this.getApp();
            user = app.activeUser || app.getState('activeUser');
        } catch (error) {
            user = null;
        }

        if (!user) {
            user = ensureMockUser();
            try {
                this.getApp().setState('activeUser', user);
            } catch (error) {
                // Ignore if can't set state
            }
        }

        return user;
    }
}

export default DialogsPage;
