/**
 * SettingsPage - Application settings management page
 * Allows users to configure app preferences and settings
 */

import Page from '../../../src/core/Page.js';

export default class SettingsPage extends Page {
    static pageName = 'settings';
    static title = 'Settings';
    static icon = 'bi-gear';
    static route = 'settings';

    constructor(options = {}) {
        super({
            ...options,
            pageName: SettingsPage.pageName,
            route: SettingsPage.route,
            pageIcon: SettingsPage.icon,
            template: 'pages/SettingsPage.mst'
        });

        // Get auth manager from app
        this.authManager = this.app?.auth;
    }

    async onInit() {
        // Initialize page data with settings
        this.data = {
            // Notification settings
            notifications: {
                email: {
                    enabled: true,
                    newProjects: true,
                    taskUpdates: true,
                    weeklyDigest: false,
                    marketing: false
                },
                push: {
                    enabled: false,
                    desktop: false,
                    mobile: false
                }
            },

            // Appearance settings
            appearance: {
                theme: 'light', // light, dark, auto
                fontSize: 'medium', // small, medium, large
                compactMode: false,
                animations: true
            },

            // Privacy settings
            privacy: {
                profileVisibility: 'public', // public, private, team
                showEmail: false,
                showActivity: true,
                allowIndexing: true
            },

            // Data & Storage
            storage: {
                autoSave: true,
                saveInterval: 5, // minutes
                cacheEnabled: true,
                offlineMode: false
            },

            // Language & Region
            locale: {
                language: 'en-US',
                timezone: 'America/New_York',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h' // 12h, 24h
            },

            // Integrations
            integrations: {
                slack: {
                    connected: false,
                    workspace: null
                },
                github: {
                    connected: false,
                    username: null
                },
                calendar: {
                    connected: false,
                    type: null
                }
            },

            // UI state
            hasChanges: false,
            isSaving: false,
            activeTab: 'general'
        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${SettingsPage.title} - ${this.app.name}`;

        // Load saved settings (in real app, from API)
        this.loadSettings();

        // Reset UI state
        this.updateData({
            hasChanges: false,
            isSaving: false,
            activeTab: 'general'
        });
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Initialize Bootstrap tabs if present
        const tabElements = this.element.querySelectorAll('[data-bs-toggle="tab"]');
        tabElements.forEach(el => {
            el.addEventListener('shown.bs.tab', (event) => {
                const tabId = event.target.getAttribute('data-bs-target').replace('#', '');
                this.updateData({ activeTab: tabId });
            });
        });

        // Initialize tooltips
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            new bootstrap.Tooltip(el);
        });
    }

    /**
     * Load saved settings
     */
    loadSettings() {
        // In a real app, this would load from API
        // For demo, we'll use localStorage
        const savedSettings = localStorage.getItem('app_settings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                this.updateData({ ...settings, hasChanges: false, isSaving: false });
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    }

    /**
     * Handle toggle switches
     */
    async onActionToggleSetting(event, element) {
        const setting = element.dataset.setting;
        const category = element.dataset.category;
        const isChecked = element.checked;

        // Update the specific setting
        const newData = { ...this.data };
        const keys = setting.split('.');
        let current = newData[category];

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = isChecked;

        newData.hasChanges = true;
        this.updateData(newData);
    }

    /**
     * Handle select/dropdown changes
     */
    async onActionUpdateSetting(event, element) {
        const setting = element.dataset.setting;
        const category = element.dataset.category;
        const value = element.value;

        // Update the specific setting
        const newData = { ...this.data };
        newData[category][setting] = value;
        newData.hasChanges = true;

        this.updateData(newData);

        // Apply theme immediately if changed
        if (category === 'appearance' && setting === 'theme') {
            this.applyTheme(value);
        }
    }

    /**
     * Apply theme changes
     */
    applyTheme(theme) {
        // Remove existing theme classes
        document.body.classList.remove('theme-light', 'theme-dark');

        if (theme === 'dark') {
            document.body.classList.add('theme-dark');
            this.app.showInfo('Dark theme applied');
        } else if (theme === 'light') {
            document.body.classList.add('theme-light');
            this.app.showInfo('Light theme applied');
        } else {
            // Auto - use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
            this.app.showInfo('Auto theme applied based on system preference');
        }
    }

    /**
     * Save all settings
     */
    async onActionSaveSettings(event) {
        event.preventDefault();

        this.updateData({ isSaving: true });

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In a real app, this would save to API
            // For demo, we'll use localStorage
            const settingsToSave = {
                notifications: this.data.notifications,
                appearance: this.data.appearance,
                privacy: this.data.privacy,
                storage: this.data.storage,
                locale: this.data.locale
            };

            localStorage.setItem('app_settings', JSON.stringify(settingsToSave));

            this.updateData({
                hasChanges: false,
                isSaving: false
            });

            this.app.showSuccess('Settings saved successfully');

        } catch (error) {
            console.error('Save settings error:', error);
            this.app.showError('Failed to save settings');
            this.updateData({ isSaving: false });
        }
    }

    /**
     * Reset settings to defaults
     */
    async onActionResetSettings(event) {
        event.preventDefault();

        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
            return;
        }

        // Reset to initial values
        await this.onInit();
        this.render();

        this.app.showInfo('Settings reset to defaults');
    }

    /**
     * Connect integration
     */
    async onActionConnectIntegration(event, element) {
        event.preventDefault();
        const integration = element.dataset.integration;

        this.app.showInfo(`Connecting to ${integration}...`);

        // Simulate connection process
        setTimeout(() => {
            const newData = { ...this.data };
            newData.integrations[integration].connected = true;
            newData.hasChanges = true;

            // Set mock data
            if (integration === 'slack') {
                newData.integrations.slack.workspace = 'example-workspace';
            } else if (integration === 'github') {
                newData.integrations.github.username = 'johndoe';
            } else if (integration === 'calendar') {
                newData.integrations.calendar.type = 'Google Calendar';
            }

            this.updateData(newData);
            this.app.showSuccess(`Connected to ${integration} successfully`);
        }, 1500);
    }

    /**
     * Disconnect integration
     */
    async onActionDisconnectIntegration(event, element) {
        event.preventDefault();
        const integration = element.dataset.integration;

        if (!confirm(`Are you sure you want to disconnect ${integration}?`)) {
            return;
        }

        const newData = { ...this.data };
        newData.integrations[integration].connected = false;
        newData.integrations[integration].workspace = null;
        newData.integrations[integration].username = null;
        newData.integrations[integration].type = null;
        newData.hasChanges = true;

        this.updateData(newData);
        this.app.showInfo(`Disconnected from ${integration}`);
    }

    /**
     * Export settings
     */
    async onActionExportSettings(event) {
        event.preventDefault();

        const exportData = {
            settings: {
                notifications: this.data.notifications,
                appearance: this.data.appearance,
                privacy: this.data.privacy,
                storage: this.data.storage,
                locale: this.data.locale
            },
            exportDate: new Date().toISOString(),
            appName: this.app.name,
            version: this.app.version
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settings-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.app.showSuccess('Settings exported successfully');
    }

    /**
     * Import settings
     */
    async onActionImportSettings(event) {
        event.preventDefault();

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const importData = JSON.parse(text);

                if (!importData.settings) {
                    throw new Error('Invalid settings file');
                }

                // Update settings
                this.updateData({
                    ...importData.settings,
                    hasChanges: true,
                    isSaving: false
                });

                this.app.showSuccess('Settings imported successfully');

            } catch (error) {
                console.error('Import error:', error);
                this.app.showError('Failed to import settings. Please check the file format.');
            }
        };

        input.click();
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
