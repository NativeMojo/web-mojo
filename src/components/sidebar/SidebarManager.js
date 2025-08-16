/**
 * SidebarManager - Central manager for sidebar configurations
 * Handles registration, switching, and management of different sidebar layouts
 * Integrates with MOJO's event system and user authentication
 */

import EventEmitter from '../../utils/EventEmitter.js';
import DefaultSidebarConfig from './configs/DefaultSidebarConfig.js';
import AdminSidebarConfig from './configs/AdminSidebarConfig.js';

class SidebarManager {
    constructor(options = {}) {
        this.options = {
            persistConfig: true,
            storageKey: 'mojo_sidebar_config',
            autoSwitchByRole: true,
            defaultConfig: 'default',
            ...options
        };

        // Configuration registry
        this.configs = new Map();
        this.currentConfigName = null;
        this.currentConfig = null;

        // User context
        this.currentUser = null;
        this.userRoles = [];
        this.userPermissions = [];

        // State management
        this.initialized = false;
        this.locked = false;

        // Event system via EventEmitter mixin
        Object.assign(this, EventEmitter);

        // Register default configurations
        this.registerDefaultConfigs();
    }

    /**
     * Initialize the sidebar manager
     */
    async initialize(user = null) {
        if (this.initialized) {
            return this;
        }

        // Set user context
        this.setUser(user);

        // Load persisted configuration or determine default
        const savedConfig = this.loadPersistedConfig();
        const targetConfig = savedConfig || this.determineDefaultConfig();

        // Set initial configuration
        await this.setConfiguration(targetConfig);

        this.initialized = true;
        this.emit('initialized', { manager: this, config: this.currentConfig });

        return this;
    }

    /**
     * Register default sidebar configurations
     */
    registerDefaultConfigs() {
        this.registerConfiguration('default', DefaultSidebarConfig);
        this.registerConfiguration('admin', AdminSidebarConfig);
    }

    /**
     * Register a sidebar configuration
     */
    registerConfiguration(name, ConfigClass, options = {}) {
        if (typeof ConfigClass === 'function') {
            // Store class constructor
            this.configs.set(name, {
                ConfigClass,
                options,
                instance: null,
                metadata: {
                    name,
                    description: options.description || `${name} sidebar configuration`,
                    roles: options.roles || [],
                    permissions: options.permissions || [],
                    priority: options.priority || 0
                }
            });
        } else if (ConfigClass && typeof ConfigClass === 'object') {
            // Store instance
            this.configs.set(name, {
                ConfigClass: null,
                options,
                instance: ConfigClass,
                metadata: {
                    name,
                    description: options.description || `${name} sidebar configuration`,
                    roles: options.roles || [],
                    permissions: options.permissions || [],
                    priority: options.priority || 0
                }
            });
        } else {
            throw new Error(`Invalid configuration provided for ${name}`);
        }

        this.emit('config-registered', { name, manager: this });
        return this;
    }

    /**
     * Get a configuration instance by name
     */
    getConfiguration(name) {
        const configData = this.configs.get(name);
        if (!configData) {
            throw new Error(`Sidebar configuration '${name}' not found`);
        }

        // Return existing instance or create new one
        if (configData.instance) {
            return configData.instance;
        }

        if (configData.ConfigClass) {
            configData.instance = new configData.ConfigClass(configData.options);
            return configData.instance;
        }

        throw new Error(`Unable to create configuration instance for '${name}'`);
    }

    /**
     * Set the active configuration
     */
    async setConfiguration(name, force = false) {
        if (this.locked && !force) {
            console.warn('SidebarManager is locked, cannot change configuration');
            return this;
        }

        if (!this.configs.has(name)) {
            throw new Error(`Sidebar configuration '${name}' not found`);
        }

        // Check permissions if user is set
        if (this.currentUser && !this.canUseConfiguration(name)) {
            console.warn(`User does not have permission to use configuration '${name}'`);
            return this;
        }

        const previousConfigName = this.currentConfigName;
        const previousConfig = this.currentConfig;

        try {
            // Get new configuration instance
            const newConfig = this.getConfiguration(name);

            // Apply user context to new configuration
            this.applyUserContext(newConfig);

            // Update current state
            this.currentConfigName = name;
            this.currentConfig = newConfig;

            // Persist configuration if enabled
            if (this.options.persistConfig) {
                this.persistConfig(name);
            }

            // Emit change event
            this.emit('config-changed', {
                previous: { name: previousConfigName, config: previousConfig },
                current: { name, config: newConfig },
                manager: this
            });

            return this;

        } catch (error) {
            console.error('Failed to set sidebar configuration:', error);
            throw error;
        }
    }

    /**
     * Get the current active configuration
     */
    getCurrentConfiguration() {
        return {
            name: this.currentConfigName,
            config: this.currentConfig
        };
    }

    /**
     * Set user context and potentially switch configuration
     */
    setUser(user) {
        this.currentUser = user;
        this.userRoles = user?.roles || [];
        this.userPermissions = user?.permissions || [];

        // Apply user context to current configuration
        if (this.currentConfig) {
            this.applyUserContext(this.currentConfig);
        }

        // Auto-switch configuration based on roles if enabled
        if (this.options.autoSwitchByRole && this.initialized) {
            const recommendedConfig = this.getRecommendedConfiguration();
            if (recommendedConfig && recommendedConfig !== this.currentConfigName) {
                this.setConfiguration(recommendedConfig);
            }
        }

        this.emit('user-changed', { user, manager: this });
        return this;
    }

    /**
     * Apply user context to a configuration
     */
    applyUserContext(config) {
        if (!config || !this.currentUser) {
            return;
        }

        // Filter navigation items by permissions
        const navConfig = config.getConfig().navigation;
        if (navConfig && navConfig.items) {
            navConfig.items = config.filterByPermissions(navConfig.items, this.userPermissions);
        }

        return config;
    }

    /**
     * Check if current user can use a specific configuration
     */
    canUseConfiguration(name) {
        const configData = this.configs.get(name);
        if (!configData || !this.currentUser) {
            return false;
        }

        const { roles, permissions } = configData.metadata;

        // Check roles
        if (roles.length > 0) {
            const hasRequiredRole = roles.some(role => this.userRoles.includes(role));
            if (!hasRequiredRole) {
                return false;
            }
        }

        // Check permissions
        if (permissions.length > 0) {
            const hasRequiredPermission = permissions.some(permission => 
                this.userPermissions.includes(permission)
            );
            if (!hasRequiredPermission) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get recommended configuration based on user roles
     */
    getRecommendedConfiguration() {
        if (!this.currentUser) {
            return this.options.defaultConfig;
        }

        // Sort configurations by priority and role match
        const availableConfigs = Array.from(this.configs.entries())
            .filter(([name]) => this.canUseConfiguration(name))
            .sort((a, b) => {
                const [, configA] = a;
                const [, configB] = b;
                
                // Higher priority first
                const priorityDiff = configB.metadata.priority - configA.metadata.priority;
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }
                
                // More role matches first
                const roleMatchA = configA.metadata.roles.filter(role => 
                    this.userRoles.includes(role)
                ).length;
                const roleMatchB = configB.metadata.roles.filter(role => 
                    this.userRoles.includes(role)
                ).length;
                
                return roleMatchB - roleMatchA;
            });

        return availableConfigs.length > 0 ? availableConfigs[0][0] : this.options.defaultConfig;
    }

    /**
     * Get list of available configurations for current user
     */
    getAvailableConfigurations() {
        return Array.from(this.configs.entries())
            .filter(([name]) => this.canUseConfiguration(name))
            .map(([name, data]) => ({
                name,
                ...data.metadata
            }));
    }

    /**
     * Determine default configuration based on user context
     */
    determineDefaultConfig() {
        return this.getRecommendedConfiguration() || this.options.defaultConfig;
    }

    /**
     * Lock/unlock configuration switching
     */
    lock() {
        this.locked = true;
        this.emit('locked', { manager: this });
        return this;
    }

    unlock() {
        this.locked = false;
        this.emit('unlocked', { manager: this });
        return this;
    }

    isLocked() {
        return this.locked;
    }

    /**
     * Persist current configuration to storage
     */
    persistConfig(configName) {
        if (!this.options.persistConfig) {
            return;
        }

        try {
            const data = {
                configName,
                timestamp: Date.now(),
                userId: this.currentUser?.id || null
            };
            
            localStorage.setItem(this.options.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to persist sidebar configuration:', error);
        }
    }

    /**
     * Load persisted configuration from storage
     */
    loadPersistedConfig() {
        if (!this.options.persistConfig) {
            return null;
        }

        try {
            const stored = localStorage.getItem(this.options.storageKey);
            if (!stored) {
                return null;
            }

            const data = JSON.parse(stored);
            
            // Check if config is for current user (if user-specific persistence)
            if (data.userId && this.currentUser && data.userId !== this.currentUser.id) {
                return null;
            }

            // Verify configuration still exists
            if (!this.configs.has(data.configName)) {
                return null;
            }

            return data.configName;
        } catch (error) {
            console.warn('Failed to load persisted sidebar configuration:', error);
            return null;
        }
    }

    /**
     * Clear persisted configuration
     */
    clearPersistedConfig() {
        try {
            localStorage.removeItem(this.options.storageKey);
        } catch (error) {
            console.warn('Failed to clear persisted sidebar configuration:', error);
        }
    }

    /**
     * Update configuration at runtime
     */
    updateCurrentConfig(updates) {
        if (!this.currentConfig) {
            throw new Error('No active configuration to update');
        }

        this.currentConfig.updateConfig(updates);
        this.emit('config-updated', { 
            config: this.currentConfig, 
            updates, 
            manager: this 
        });
        
        return this;
    }

    /**
     * Clone current configuration with modifications
     */
    cloneCurrentConfig(newName, modifications = {}) {
        if (!this.currentConfig) {
            throw new Error('No active configuration to clone');
        }

        const cloned = this.currentConfig.clone(newName);
        if (Object.keys(modifications).length > 0) {
            cloned.updateConfig(modifications);
        }

        this.registerConfiguration(newName, cloned, {
            description: `Cloned from ${this.currentConfigName}`,
            temporary: true
        });

        return cloned;
    }

    /**
     * Remove a configuration
     */
    unregisterConfiguration(name) {
        if (name === this.currentConfigName) {
            throw new Error('Cannot unregister the currently active configuration');
        }

        const removed = this.configs.delete(name);
        if (removed) {
            this.emit('config-unregistered', { name, manager: this });
        }
        
        return removed;
    }

    /**
     * Reset to factory defaults
     */
    reset() {
        this.clearPersistedConfig();
        this.configs.clear();
        this.currentConfigName = null;
        this.currentConfig = null;
        this.initialized = false;
        this.locked = false;

        this.registerDefaultConfigs();
        this.emit('reset', { manager: this });
        
        return this;
    }

    /**
     * Get manager statistics and info
     */
    getInfo() {
        return {
            initialized: this.initialized,
            locked: this.locked,
            currentConfig: this.currentConfigName,
            availableConfigs: this.getAvailableConfigurations().length,
            totalConfigs: this.configs.size,
            user: this.currentUser?.id || null,
            persistConfig: this.options.persistConfig
        };
    }
}

export default SidebarManager;