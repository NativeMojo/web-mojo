/**
 * Simple Module Loader for MOJO Framework Tests
 * Loads and transforms ES6 modules for use in Node.js test environment
 */

const fs = require('fs');
const path = require('path');

class SimpleModuleLoader {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.sourceRoot = path.join(this.projectRoot, 'src');
        this.loadedModules = new Map();
        
        // Module dependency order
        this.moduleOrder = ['EventBus', 'Router', 'Rest', 'dataFormatter', 'MOJOUtils', 'Model', 'RestModel', 'DataList', 'View', 'Page', 'Table', 'MOJO'];
        
        // Set up global environment
        this.setupGlobals();
    }

    /**
     * Set up global environment for modules
     */
    setupGlobals() {
        // Ensure DOM globals are available (will be set up by test helpers)
        if (typeof global.window === 'undefined') {
            // DOM globals will be set up by testHelpers.setup() - this is expected during module loading
        }

        // Mock Mustache if not available
        if (typeof global.Mustache === 'undefined') {
            global.Mustache = {
                render: (template, data = {}, partials = {}) => {
                    let result = template;
                    
                    // Simple variable substitution
                    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                        return data[key] || '';
                    });
                    
                    // Simple section handling
                    result = result.replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs, (match, key, content) => {
                        const value = data[key];
                        if (Array.isArray(value)) {
                            return value.map(item => 
                                content.replace(/\{\{(\w+)\}\}/g, (m, k) => item[k] || '')
                            ).join('');
                        } else if (value) {
                            return content;
                        }
                        return '';
                    });
                    
                    return result;
                }
            };
        }
    }

    /**
     * Load a module
     * @param {string} moduleName - Name of the module to load
     * @returns {*} Loaded module
     */
    loadModule(moduleName) {
        // Check if already loaded
        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        // Special handling for RestModel - load Model and alias it
        if (moduleName === 'RestModel') {
            const Model = this.loadModule('Model');
            this.loadedModules.set('RestModel', Model);
            global.RestModel = Model;
            return Model;
        }

        const moduleInfo = this.getModuleInfo(moduleName);
        if (!moduleInfo) {
            throw new Error(`Unknown module: ${moduleName}`);
        }

        // Load dependencies first
        for (const dep of moduleInfo.dependencies) {
            this.loadModule(dep);
        }

        // Load the module
        const module = this.loadModuleFromFile(moduleInfo.path, moduleName);
        this.loadedModules.set(moduleName, module);
        
        // Set as global
        global[moduleName] = module;
        
        return module;
    }

    /**
     * Get module configuration
     * @param {string} moduleName - Module name
     * @returns {object} Module info
     */
    getModuleInfo(moduleName) {
        const modules = {
            'EventBus': {
                path: path.join(this.sourceRoot, 'utils/EventBus.js'),
                dependencies: []
            },
            'Router': {
                path: path.join(this.sourceRoot, 'core/Router.js'),
                dependencies: []
            },
            'Rest': {
                path: path.join(this.sourceRoot, 'core/Rest.js'),
                dependencies: []
            },
            'dataFormatter': {
                path: path.join(this.sourceRoot, 'utils/DataFormatter.js'),
                dependencies: []
            },
            'MOJOUtils': {
                path: path.join(this.sourceRoot, 'utils/MOJOUtils.js'),
                dependencies: ['dataFormatter']
            },
            'Model': {
                path: path.join(this.sourceRoot, 'core/Model.js'),
                dependencies: ['Rest', 'dataFormatter', 'MOJOUtils']
            },
            'RestModel': {
                path: path.join(this.sourceRoot, 'core/Model.js'),
                dependencies: ['Rest']
            },
            'DataList': {
                path: path.join(this.sourceRoot, 'core/DataList.js'),
                dependencies: ['RestModel', 'Rest']
            },
            'View': {
                path: path.join(this.sourceRoot, 'core/View.js'),
                dependencies: ['MOJOUtils']
            },
            'Page': {
                path: path.join(this.sourceRoot, 'core/Page.js'),
                dependencies: ['View']
            },
            'Table': {
                path: path.join(this.sourceRoot, 'components/Table.js'),
                dependencies: ['View']
            },
            'MOJO': {
                path: path.join(this.sourceRoot, 'mojo.js'),
                dependencies: ['View', 'Page', 'Router', 'EventBus', 'Rest', 'RestModel', 'DataList', 'Table']
            }
        };

        return modules[moduleName];
    }

    /**
     * Load module from file
     * @param {string} filePath - Path to module file
     * @param {string} moduleName - Name of the module
     * @returns {*} Loaded module
     */
    loadModuleFromFile(filePath, moduleName) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Module file not found: ${filePath}`);
        }

        try {
            const sourceCode = fs.readFileSync(filePath, 'utf8');
            const transformedCode = this.transformModule(sourceCode, moduleName);
            
            // Create a simple context without conflicting names
            const sandbox = {
                // Node.js globals
                require,
                module: { exports: {} },
                exports: {},
                __filename: filePath,
                __dirname: path.dirname(filePath),
                console,
                Buffer,
                process,
                global,
                
                // Browser globals
                window: global.window,
                document: global.document,
                HTMLElement: global.HTMLElement,
                Event: global.Event,
                CustomEvent: global.CustomEvent,
                fetch: global.fetch,
                Mustache: global.Mustache,
                setTimeout: global.setTimeout || setTimeout,
                clearTimeout: global.clearTimeout || clearTimeout,
                setInterval: global.setInterval || setInterval,
                clearInterval: global.clearInterval || clearInterval
            };

            // Create function with just the sandbox context
            const contextKeys = Object.keys(sandbox);
            const contextValues = Object.values(sandbox);
            
            // Execute the transformed code
            const moduleFunction = new Function(...contextKeys, transformedCode);
            const result = moduleFunction(...contextValues);
            
            return result;
        } catch (error) {
            throw new Error(`Failed to load module ${moduleName} from ${filePath}: ${error.message}\n${error.stack}`);
        }
    }

    /**
     * Transform ES6 module syntax to work in our context
     * @param {string} sourceCode - Original source code
     * @param {string} moduleName - Module name for context
     * @returns {string} Transformed code
     */
    transformModule(sourceCode, moduleName) {
        let code = sourceCode;

        // Remove import statements and replace with access to globals
        code = code.replace(/import\s+([^'"\s]+)\s+from\s+['"]([^'"]+)['"];?\s*\n?/g, (match, importName, importPath) => {
            if (importPath.includes('mustache')) {
                return `// Using global Mustache\n`;
            } else if (importPath.includes('View')) {
                return `const ${importName} = global.View;\n`;
            } else if (importPath.includes('Page')) {
                return `const ${importName} = global.Page;\n`;
            } else if (importPath.includes('EventBus')) {
                return `const ${importName} = global.EventBus;\n`;
            }
            return `// Import: ${match}\n`;
        });

        // Handle named imports
        code = code.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"];?\s*\n?/g, (match, imports, importPath) => {
            return `// Named imports: ${imports} from ${importPath}\n`;
        });

        // Handle named export statements first (remove them, we only care about default export)
        code = code.replace(/export\s*\{\s*([^}]+)\s*\};?\s*$/gm, (match, exports) => {
            return `// Named exports removed: ${exports}`;
        });

        // Handle export default - wrap everything and return the default export
        if (code.includes('export default')) {
            // Replace export default with a variable assignment
            code = code.replace(/export\s+default\s+([^;]+);?\s*$/gm, (match, exportValue) => {
                return `const __moduleExport = ${exportValue};\nreturn __moduleExport;`;
            });
        } else {
            // If no explicit export default, return the main class/function
            if (moduleName === 'EventBus') {
                code += '\nreturn EventBus;';
            } else if (moduleName === 'View') {
                code += '\nreturn View;';
            } else if (moduleName === 'Page') {
                code += '\nreturn Page;';
            } else if (moduleName === 'MOJO') {
                code += '\nreturn MOJO;';
            } else if (moduleName === 'dataFormatter') {
                code += '\nreturn dataFormatter;';
            } else if (moduleName === 'MOJOUtils') {
                code += '\nreturn MOJOUtils;';
            }
        }

        // Handle export const/let/var/class/function
        code = code.replace(/^export\s+(const|let|var|class|function)\s+/gm, '$1 ');

        return code;
    }

    /**
     * Load all modules in dependency order
     * @returns {object} Object containing all loaded modules
     */
    loadAllModules() {
        const modules = {};
        
        for (const moduleName of this.moduleOrder) {
            try {
                modules[moduleName] = this.loadModule(moduleName);
            } catch (error) {
                console.error(`Failed to load ${moduleName}:`, error.message);
                // Continue loading other modules
                modules[moduleName] = null;
            }
        }
        
        return modules;
    }

    /**
     * Clear the module cache
     */
    clearCache() {
        this.loadedModules.clear();
        // Clear globals
        for (const moduleName of this.moduleOrder) {
            delete global[moduleName];
        }
    }

    /**
     * Get diagnostic information
     * @returns {object} Diagnostic data
     */
    getDiagnostics() {
        const diagnostics = {
            projectRoot: this.projectRoot,
            sourceRoot: this.sourceRoot,
            loadedModules: Array.from(this.loadedModules.keys()),
            globalModules: this.moduleOrder.filter(name => global[name]),
            moduleFiles: {},
            globalState: {
                hasWindow: typeof global.window !== 'undefined',
                hasDocument: typeof global.document !== 'undefined',
                hasMustache: typeof global.Mustache !== 'undefined',
                hasFetch: typeof global.fetch !== 'undefined'
            }
        };

        // Check which module files exist
        for (const moduleName of this.moduleOrder) {
            const info = this.getModuleInfo(moduleName);
            if (info) {
                diagnostics.moduleFiles[moduleName] = {
                    path: info.path,
                    exists: fs.existsSync(info.path),
                    size: fs.existsSync(info.path) ? fs.statSync(info.path).size : 0,
                    dependencies: info.dependencies
                };
            }
        }

        return diagnostics;
    }

    /**
     * Validate a loaded module
     * @param {*} module - Module to validate
     * @param {string} expectedType - Expected type ('class' or 'function')
     * @returns {boolean} Whether module is valid
     */
    validateModule(module, expectedType = 'class') {
        if (!module) return false;
        
        if (expectedType === 'class') {
            return typeof module === 'function' && module.prototype;
        }
        
        if (expectedType === 'function') {
            return typeof module === 'function';
        }
        
        return true;
    }
}

// Create singleton instance
const moduleLoader = new SimpleModuleLoader();

/**
 * Load a specific module
 * @param {string} moduleName - Module name
 * @returns {*} Loaded module
 */
function loadModule(moduleName) {
    return moduleLoader.loadModule(moduleName);
}

/**
 * Load all MOJO modules
 * @returns {object} All loaded modules
 */
function loadAllModules() {
    return moduleLoader.loadAllModules();
}

/**
 * Set up modules for testing
 * @param {object} testContext - Test context to populate
 * @returns {object} Loaded modules
 */
function setupModules(testContext = {}) {
    try {
        console.log('Loading MOJO modules...');
        const modules = moduleLoader.loadAllModules();
        
        // Validate modules
        const validationResults = {};
        validationResults.EventBus = moduleLoader.validateModule(modules.EventBus, 'class');
        validationResults.View = moduleLoader.validateModule(modules.View, 'class');
        validationResults.Page = moduleLoader.validateModule(modules.Page, 'class');
        validationResults.MOJO = moduleLoader.validateModule(modules.MOJO, 'class');
        
        const failedModules = Object.entries(validationResults)
            .filter(([name, valid]) => !valid)
            .map(([name]) => name);
            
        if (failedModules.length > 0) {
            console.warn('Some modules failed validation:', failedModules);
            const diagnostics = moduleLoader.getDiagnostics();
            console.log('Diagnostics:', JSON.stringify(diagnostics, null, 2));
        } else {
            console.log('All modules loaded successfully');
        }
        
        // Add to test context
        Object.assign(testContext, modules);
        
        // Make available globally
        Object.assign(global, modules);
        
        return modules;
    } catch (error) {
        console.error('Failed to setup modules:', error);
        const diagnostics = moduleLoader.getDiagnostics();
        console.log('Diagnostics:', JSON.stringify(diagnostics, null, 2));
        throw error;
    }
}

module.exports = {
    SimpleModuleLoader,
    moduleLoader,
    loadModule,
    loadAllModules,
    setupModules
};