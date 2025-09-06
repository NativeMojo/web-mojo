/**
 * TemplateResolver - Smart template path resolution and loading
 * Handles template loading in development, production, and when installed as npm package
 */

class TemplateResolver {
    constructor(options = {}) {
        this.cache = new Map();
        this.basePath = options.basePath || this.detectBasePath();
        this.environment = options.environment || this.detectEnvironment();
        this.templateRoot = options.templateRoot || this.detectTemplateRoot();
        this.fetchOptions = options.fetchOptions || {};
        this.debug = options.debug || false;
        
        // Preloaded templates (for bundled scenarios)
        this.bundledTemplates = new Map();
        
        // Template path mappings
        this.pathMappings = new Map([
            // Map source paths to distribution paths
            ['/src/auth/pages/LoginPage.mst', 'auth/pages/LoginPage.mst'],
            ['/src/auth/pages/RegisterPage.mst', 'auth/pages/RegisterPage.mst'],
            ['/src/auth/pages/ForgotPasswordPage.mst', 'auth/pages/ForgotPasswordPage.mst'],
            ['/src/components/TablePage.mst', 'components/TablePage.mst'],
            // Add more mappings as needed
        ]);
        
        // Initialize with options
        if (options.templates) {
            this.registerTemplates(options.templates);
        }
        
        // Bind methods
        this.resolve = this.resolve.bind(this);
        this.load = this.load.bind(this);
    }
    
    /**
     * Detect the current environment
     * @returns {string} 'development', 'production', or 'cdn'
     */
    detectEnvironment() {
        // Check if we're in development mode
        if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
            return 'development';
        }
        
        // Check if running from localhost
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return 'development';
            }
        }
        
        // Check if loaded from CDN
        if (typeof document !== 'undefined') {
            const scripts = document.getElementsByTagName('script');
            for (let script of scripts) {
                if (script.src && (script.src.includes('unpkg.com') || script.src.includes('jsdelivr.net'))) {
                    return 'cdn';
                }
            }
        }
        
        return 'production';
    }
    
    /**
     * Detect the base path for the application
     * @returns {string} Base path URL
     */
    detectBasePath() {
        if (typeof window === 'undefined') {
            return '';
        }
        
        // Try to find the base path from script tags
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src) {
                // Look for web-mojo script
                if (script.src.includes('web-mojo')) {
                    const url = new URL(script.src);
                    const pathParts = url.pathname.split('/');
                    
                    // Remove the filename and dist/src folder
                    pathParts.pop(); // Remove filename
                    if (pathParts[pathParts.length - 1] === 'dist' || 
                        pathParts[pathParts.length - 1] === 'src') {
                        pathParts.pop();
                    }
                    
                    return url.origin + pathParts.join('/');
                }
            }
        }
        
        // Default to current origin
        return window.location.origin;
    }
    
    /**
     * Detect the template root directory
     * @returns {string} Template root path
     */
    detectTemplateRoot() {
        const env = this.environment;
        
        if (env === 'development') {
            // In development, templates are in src/
            return `${this.basePath}/src`;
        } else if (env === 'cdn') {
            // For CDN, templates are in dist/templates/
            const scripts = document.getElementsByTagName('script');
            for (let script of scripts) {
                if (script.src && script.src.includes('web-mojo')) {
                    const baseUrl = script.src.substring(0, script.src.lastIndexOf('/'));
                    return `${baseUrl}/templates`;
                }
            }
        } else {
            // In production/npm, templates are in node_modules/web-mojo/dist/templates/
            // Try to detect if we're in node_modules
            if (typeof window !== 'undefined' && window.location.pathname.includes('node_modules')) {
                return `${this.basePath}/node_modules/web-mojo/dist/templates`;
            }
            
            // Default production path
            return `${this.basePath}/dist/templates`;
        }
    }
    
    /**
     * Register bundled templates
     * @param {Object} templates - Map of template paths to content
     */
    registerTemplates(templates) {
        if (typeof templates === 'object') {
            Object.entries(templates).forEach(([path, content]) => {
                this.bundledTemplates.set(path, content);
            });
        }
    }
    
    /**
     * Resolve a template path to its actual location
     * @param {string} templatePath - Original template path
     * @returns {string} Resolved template path
     */
    resolve(templatePath) {
        if (!templatePath) return null;
        
        // Check if it's already a bundled template
        if (this.bundledTemplates.has(templatePath)) {
            return templatePath;
        }
        
        // Handle different path formats
        let normalizedPath = templatePath;
        
        // Remove leading slash if present
        if (normalizedPath.startsWith('/')) {
            normalizedPath = normalizedPath.substring(1);
        }
        
        // Check if this is a source path that needs mapping
        if (this.pathMappings.has(templatePath)) {
            normalizedPath = this.pathMappings.get(templatePath);
        }
        
        // Handle src/ paths
        if (normalizedPath.startsWith('src/')) {
            if (this.environment === 'development') {
                // In development, use as-is
                return `${this.basePath}/${normalizedPath}`;
            } else {
                // In production, strip src/ and look in templates/
                normalizedPath = normalizedPath.replace('src/', '');
                
                // Special handling for auth and components
                if (normalizedPath.startsWith('auth/')) {
                    return `${this.templateRoot}/${normalizedPath}`;
                } else if (normalizedPath.startsWith('components/')) {
                    return `${this.templateRoot}/${normalizedPath}`;
                } else {
                    return `${this.templateRoot}/${normalizedPath}`;
                }
            }
        }
        
        // Handle web-mojo package paths
        if (normalizedPath.includes('web-mojo/templates/')) {
            // Extract the template path after web-mojo/templates/
            const parts = normalizedPath.split('web-mojo/templates/');
            if (parts.length > 1) {
                return `${this.templateRoot}/${parts[1]}`;
            }
        }
        
        // If it's already a full URL, return as-is
        if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
            return normalizedPath;
        }
        
        // Default resolution
        if (this.environment === 'development') {
            // Try both with and without src/ prefix
            if (!normalizedPath.startsWith('src/')) {
                return `${this.basePath}/src/${normalizedPath}`;
            }
            return `${this.basePath}/${normalizedPath}`;
        } else {
            // In production, look in template root
            return `${this.templateRoot}/${normalizedPath}`;
        }
    }
    
    /**
     * Load a template (from cache, bundle, or fetch)
     * @param {string} templatePath - Template path to load
     * @returns {Promise<string>} Template content
     */
    async load(templatePath) {
        if (!templatePath) {
            throw new Error('Template path is required');
        }
        
        // Check cache first
        if (this.cache.has(templatePath)) {
            if (this.debug) console.log(`Template loaded from cache: ${templatePath}`);
            return this.cache.get(templatePath);
        }
        
        // Check bundled templates
        if (this.bundledTemplates.has(templatePath)) {
            const content = this.bundledTemplates.get(templatePath);
            this.cache.set(templatePath, content);
            if (this.debug) console.log(`Template loaded from bundle: ${templatePath}`);
            return content;
        }
        
        // Resolve the actual path
        const resolvedPath = this.resolve(templatePath);
        
        if (this.debug) {
            console.log(`Loading template: ${templatePath}`);
            console.log(`Resolved to: ${resolvedPath}`);
        }
        
        // Check if already cached with resolved path
        if (this.cache.has(resolvedPath)) {
            return this.cache.get(resolvedPath);
        }
        
        try {
            // Fetch the template
            const response = await fetch(resolvedPath, this.fetchOptions);
            
            if (!response.ok) {
                throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
            }
            
            const content = await response.text();
            
            // Cache with both original and resolved paths
            this.cache.set(templatePath, content);
            this.cache.set(resolvedPath, content);
            
            if (this.debug) console.log(`Template fetched and cached: ${templatePath}`);
            
            return content;
            
        } catch (error) {
            // Try fallback paths
            const fallbackPaths = this.getFallbackPaths(templatePath);
            
            for (const fallbackPath of fallbackPaths) {
                try {
                    if (this.debug) console.log(`Trying fallback path: ${fallbackPath}`);
                    
                    const response = await fetch(fallbackPath, this.fetchOptions);
                    if (response.ok) {
                        const content = await response.text();
                        
                        // Cache with all paths
                        this.cache.set(templatePath, content);
                        this.cache.set(resolvedPath, content);
                        this.cache.set(fallbackPath, content);
                        
                        if (this.debug) console.log(`Template loaded from fallback: ${fallbackPath}`);
                        
                        return content;
                    }
                } catch (fallbackError) {
                    // Continue to next fallback
                }
            }
            
            // If all attempts failed, throw error
            throw new Error(`Failed to load template: ${templatePath}\nResolved path: ${resolvedPath}\nError: ${error.message}`);
        }
    }
    
    /**
     * Get fallback paths for a template
     * @param {string} templatePath - Original template path
     * @returns {string[]} Array of fallback paths to try
     */
    getFallbackPaths(templatePath) {
        const fallbacks = [];
        
        // Extract just the filename
        const filename = templatePath.split('/').pop();
        
        // Common locations to check
        const locations = [
            '/templates',
            '/dist/templates',
            '/node_modules/web-mojo/dist/templates',
            '/src/templates',
            '/src/auth/pages',
            '/src/components',
            '../templates',
            './templates'
        ];
        
        // Add fallback paths
        locations.forEach(location => {
            fallbacks.push(`${this.basePath}${location}/${filename}`);
            
            // Also try with subdirectories
            if (templatePath.includes('auth/')) {
                fallbacks.push(`${this.basePath}${location}/auth/pages/${filename}`);
            }
            if (templatePath.includes('components/')) {
                fallbacks.push(`${this.basePath}${location}/components/${filename}`);
            }
        });
        
        return [...new Set(fallbacks)]; // Remove duplicates
    }
    
    /**
     * Preload multiple templates
     * @param {string[]} templatePaths - Array of template paths
     * @returns {Promise<void>}
     */
    async preload(templatePaths) {
        const promises = templatePaths.map(path => 
            this.load(path).catch(error => {
                console.warn(`Failed to preload template: ${path}`, error);
                return null;
            })
        );
        
        await Promise.all(promises);
    }
    
    /**
     * Clear the template cache
     * @param {string} [templatePath] - Optional specific template to clear
     */
    clearCache(templatePath) {
        if (templatePath) {
            this.cache.delete(templatePath);
            const resolved = this.resolve(templatePath);
            if (resolved) {
                this.cache.delete(resolved);
            }
        } else {
            this.cache.clear();
        }
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            bundled: this.bundledTemplates.size,
            environment: this.environment,
            basePath: this.basePath,
            templateRoot: this.templateRoot
        };
    }
}

// Create a singleton instance
const templateResolver = new TemplateResolver();

// Export both the class and singleton
export { TemplateResolver };
export default templateResolver;