/**
 * ProfilePage - User profile management page
 * Allows users to view and edit their profile information
 */

import Page from '../../../src/core/Page.js';

export default class ProfilePage extends Page {
    static pageName = 'profile';
    static title = 'My Profile';
    static icon = 'bi-person-circle';
    static route = 'profile';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ProfilePage.pageName,
            route: ProfilePage.route,
            pageIcon: ProfilePage.icon,
            template: 'pages/ProfilePage.mst'
        });

        // Get auth manager from app
        this.authManager = this.app?.auth;
    }

    async onInit() {
        // Initialize page data
        this.data = {
            user: null,
            isEditing: false,
            isSaving: false,
            hasChanges: false,

            // Form fields (will be populated from user data)
            formData: {
                name: '',
                email: '',
                phone: '',
                bio: '',
                location: '',
                website: ''
            },

            // Original data for comparison
            originalData: null,

            // Passkey status
            hasPasskey: false,

            // Profile stats
            stats: {
                joined: 'January 2024',
                lastActive: 'Today',
                projectsCount: 8,
                tasksCompleted: 42
            }
        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${ProfilePage.title} - ${this.app.name}`;

        // Get current user
        const user = this.authManager?.getUser();
        if (user) {
            // Populate form data with user info
            const formData = {
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                bio: user.bio || '',
                location: user.location || '',
                website: user.website || ''
            };

            this.updateData({
                user,
                formData,
                originalData: { ...formData }
            });
        }

        // Reset editing state
        this.updateData({
            isEditing: false,
            isSaving: false,
            hasChanges: false
        });
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Initialize tooltips
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            new bootstrap.Tooltip(el);
        });
    }

    /**
     * Toggle edit mode
     */
    async onActionToggleEdit(event) {
        event.preventDefault();

        const isEditing = !this.data.isEditing;

        if (!isEditing && this.data.hasChanges) {
            // Canceling edit with unsaved changes
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
            // Reset to original data
            this.updateData({
                formData: { ...this.data.originalData },
                hasChanges: false
            });
        }

        this.updateData({ isEditing });

        // Focus first input when entering edit mode
        if (isEditing) {
            setTimeout(() => {
                const firstInput = this.element.querySelector('input:not([disabled])');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }

    /**
     * Handle form field updates
     */
    async onActionUpdateField(event, element) {
        const field = element.dataset.field;
        const value = element.value;

        // Update form data
        const formData = { ...this.data.formData, [field]: value };

        // Check if data has changed
        const hasChanges = JSON.stringify(formData) !== JSON.stringify(this.data.originalData);

        this.updateData({ formData, hasChanges });
    }

    /**
     * Save profile changes
     */
    async onActionSaveProfile(event) {
        event.preventDefault();

        this.updateData({ isSaving: true });

        try {
            // Validate required fields
            if (!this.data.formData.name || !this.data.formData.email) {
                throw new Error('Name and email are required');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.data.formData.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In a real app, this would call an API to update the user profile
            // For now, we'll just update the local state
            const updatedUser = {
                ...this.data.user,
                ...this.data.formData
            };

            // Update auth manager if available
            if (this.authManager) {
                this.authManager.currentUser = updatedUser;
            }

            // Update page state
            this.updateData({
                user: updatedUser,
                originalData: { ...this.data.formData },
                hasChanges: false,
                isEditing: false,
                isSaving: false
            });

            this.app.showSuccess('Profile updated successfully');

        } catch (error) {
            console.error('Save profile error:', error);
            this.app.showError(error.message || 'Failed to save profile');
            this.updateData({ isSaving: false });
        }
    }

    /**
     * Setup passkey
     */
    async onActionSetupPasskey(event) {
        event.preventDefault();

        if (!this.authManager) {
            this.app.showError('Authentication service not available');
            return;
        }

        if (!this.authManager.isPasskeySupported()) {
            this.app.showWarning('Passkey authentication is not supported on this device');
            return;
        }

        try {
            this.app.showInfo('Setting up passkey...');
            const result = await this.authManager.setupPasskey();

            if (result.success) {
                this.updateData({ hasPasskey: true });
                this.app.showSuccess('Passkey has been set up successfully');
            }
        } catch (error) {
            console.error('Passkey setup error:', error);
            this.app.showError('Failed to setup passkey. Please try again.');
        }
    }

    /**
     * Change password
     */
    async onActionChangePassword(event) {
        event.preventDefault();
        this.app.showInfo('Password change feature coming soon!');
    }

    /**
     * Upload avatar
     */
    async onActionUploadAvatar(event) {
        event.preventDefault();
        this.app.showInfo('Avatar upload feature coming soon!');
    }

    /**
     * Delete account
     */
    async onActionDeleteAccount(event) {
        event.preventDefault();

        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
                this.app.showWarning('Account deletion feature coming soon!');
            }
        }
    }

    /**
     * Export data
     */
    async onActionExportData(event) {
        event.preventDefault();

        // Create a JSON blob with user data
        const exportData = {
            user: this.data.user,
            exportDate: new Date().toISOString(),
            appName: this.app.name
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `profile-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.app.showSuccess('Profile data exported successfully');
    }

    async onExit() {
        await super.onExit();

        // Clean up tooltips
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });

        // Check for unsaved changes
        if (this.data.hasChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
                return false; // Prevent navigation
            }
        }
    }
}
