/**
 * MOJO Framework Module Loader for Tests
 * Loads and transforms ES6 modules for use in Node.js test environment
 */

const fs = require('fs');
const path = require('path');
const { VM } = require('vm2');

class ModuleLoader {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.sourceRoot = path.join(this.projectRoot, 'src');
        this.loadedModules = new Map();
        this.moduleCache = new Map();
        
        // Set up sandbox environment
        this.setupSandbox();
    }

    /**
     * Set up sandbox environment for module execution
     */
    setupSandbox() {
        this.sandbox = {
            // Node.js globals
            console,
            Buffer,
            process,
            global,
            require,
            __dirname,
            __filename,
            
            // Browser-like globals (will be provided by test setup)
            window: global.window,
            document: global.document,
            HTMLElement: global.HTMLElement,
            Event: global.Event,
            CustomEvent: global.CustomEvent,
            fetch: global.fetch,
            
            // Mock Mustache
            Mustache: global.Mustache || {
                render: (template, data) => {
                    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
                }
            },
            
            // Module storage
            _modules: {},
            _exports: {},
            
            // Export helper
            _export: (name, value) => {
                this.sandbox._exports[name] = value;
            }
        };
    }

    /**
     * Load a MOJO framework module
     * @param {string} moduleName - Module name (e.g., 'EventBus', 'View', 'Page', 'MOJO')
     * @returns {*} Loaded module
     */
    loadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        const moduleInfo = this.getModuleInfo(moduleName);
        if (!moduleInfo) {
            throw new Error(`Unknown module: ${moduleName}`);
        }

        const module = this.loadModuleFromFile(moduleInfo.path, moduleInfo.dependencies);
        this.loadedModules.set(moduleName, module);
        
        return module;
    }

    /**
     * Get module information
     * @param {string} moduleName - Module name
     * @returns {object} Module info with path and dependencies
     */
    getModuleInfo(moduleName) {
        const moduleMap = {
            'EventBus': {
                path: path.join(this.sourceRoot, 'utils/EventBus.js'),
                dependencies: []
            },
            'View': {
                path: path.join(this.sourceRoot, 'core/View.js'),
                dependencies: []
            },
            'Page': {
                path: path.join(this.sourceRoot, 'core/Page.js'),
                dependencies: ['View']
            },
            'MOJO': {
                path: path.join(this.sourceRoot, 'mojo.js'),
                dependencies: ['View', 'Page', 'EventBus']
            }
        };

        return moduleMap[moduleName];
    }

    /**
     * Load module from file
     * @param {string} filePath - Path to module file
     * @param {array} dependencies - Module dependencies
     * @returns {*} Loaded module
     */
    loadModuleFromFile(filePath, dependencies = []) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Module file not found: ${filePath}`);
        }

        // Load dependencies first
        const loadedDeps = {};
        for (const dep of dependencies) {
            loadedDeps[dep] = this.loadModule(dep);
        }

        // Read and transform source code
        const sourceCode = fs.readFileSync(filePath, 'utf8');
        const transformedCode = this.transformModule(sourceCode, loadedDeps, filePath);

        // Execute in sandbox
        const vm = new VM({
            timeout: 10000,
            sandbox: {
                ...this.sandbox,
                ...loadedDeps
            }
        });

        try {
            const result = vm.run(transformedCode);
            return result || this.sandbox._exports.default || this.sandbox._exports;
        } catch (error) {
            throw new Error(`Failed to load module ${filePath}: ${error.message}`);
        }
    }

    /**
     * Transform ES6 module to work in test environment
     * @param {string} sourceCode - Original source code
     * @param {object} dependencies - Loaded dependencies
     * @param {string} filePath - File path for context
     * @returns {string} Transformed code
     */
    transformModule(sourceCode, dependencies, filePath) {
        let transformedCode = sourceCode;

        // Handle imports
        transformedCode = transformedCode.replace(/import\s+([^'"\s]+)\s+from\s+['"]([^'"]+)['"];?/g, (match, importName, importPath) => {
            // Skip external imports that should be available globally
            if (importPath.includes('mustache')) {
                return `// ${match} (using global Mustache)`;
            }
            
            // Handle local imports
            const depName = this.getDepNameFromPath(importPath);
            if (dependencies[depName]) {
                return `const ${importName} = ${depName};`;
            }
            
            return `// ${match} (dependency not loaded)`;
        });

        // Handle named imports
        transformedCode = transformedCode.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"];?/g, (match, namedImports, importPath) => {
            const depName = this.getDepNameFromPath(importPath);
            if (dependencies[depName]) {
                const imports = namedImports.split(',').map(imp => imp.trim());
                return imports.map(imp => `const ${imp} = ${depName}.${imp};`).join('\n');
            }
            
            return `// ${match} (dependency not loaded)`;
        });

        // Handle default exports
        transformedCode = transformedCode.replace(/export\s+default\s+([^;]+);?/g, (match, exportValue) => {
            return `return ${exportValue};`;
        });

        // Handle named exports
        transformedCode = transformedCode.replace(/export\s*\{\s*([^}]+)\s*\};?/g, (match, namedExports) => {
            const exports = namedExports.split(',').map(exp => exp.trim());
            return exports.map(exp => `_export('${exp}', ${exp});`).join('\n');
        });

        // Handle export const/let/var
        transformedCode = transformedCode.replace(/export\s+(const|let|var)\s+([^=\s]+)\s*=/g, (match, keyword, varName) => {
            return `${keyword} ${varName} = `;
        });

        // Handle export class
        transformedCode = transformedCode.replace(/export\s+class\s+([^\s{]+)/g, (match, className) => {
            return `class ${className}`;
        });

        // Handle export function
        transformedCode = transformedCode.replace(/export\s+function\s+([^\s(]+)/g, (match, functionName) => {
            return `function ${functionName}`;
        });

        // Wrap in IIFE to avoid global pollution
        transformedCode = `
            (function() {
                ${transformedCode}
                
                // Auto-detect and return the main class/function
                if (typeof EventBus !== 'undefined') return EventBus;
                if (typeof View !== 'undefined') return View;
                if (typeof Page !== 'undefined') return Page;
                if (typeof MOJO !== 'undefined') return MOJO;
                
                // Return exports object if no main class found
                return _exports;
            })();
        `;

        return transformedCode;
    }

    /**
     * Get dependency name from import path
     * @param {string} importPath - Import path
     * @returns {string} Dependency name
     */
    getDepNameFromPath(importPath) {
        if (importPath.includes('EventBus')) return 'EventBus';
        if (importPath.includes('View')) return 'View';
        if (importPath.includes('Page')) return 'Page';
        if (importPath.includes('mojo')) return 'MOJO';
        
        return null;
    }

    /**
     * Load all core MOJO modules
     * @returns {object} Object with all loaded modules
     */
    loadAllModules() {
        const modules = {};
        
        // Load in dependency order
        modules.EventBus = this.loadModule('EventBus');
        modules.View = this.loadModule('View');
        modules.Page = this.loadModule('Page');
        modules.MOJO = this.loadModule('MOJO');
        
        return modules;
    }

    /**
     * Clear module cache
     */
    clearCache() {
        this.loadedModules.clear();
        this.moduleCache.clear();
    }

    /**
     * Validate that a module was loaded correctly
     * @param {*} module - Loaded module
     * @param {string} expectedType - Expected type ('class' or 'function')
     * @returns {boolean} True if valid
     */
    validateModule(module, expectedType = 'class') {
        if (!module) {
            return false;
        }

        if (expectedType === 'class') {
            return typeof module === 'function' && module.prototype;
        }

        if (expectedType === 'function') {
            return typeof module === 'function';
        }

        return true;
    }

    /**
     * Get module loading diagnostics
     * @returns {object} Diagnostic information
     */
    getDiagnostics() {
        const diagnostics = {
            loadedModules: Array.from(this.loadedModules.keys()),
            sourceRoot: this.sourceRoot,
            modulesFound: {},
            sandboxGlobals: Object.keys(this.sandbox)
        };

        // Check which module files exist
        const moduleNames = ['EventBus', 'View', 'Page', 'MOJO'];
        for (const name of moduleNames) {
            const info = this.getModuleInfo(name);
            if (info) {
                diagnostics.modulesFound[name] = {
                    path: info.path,
                    exists: fs.existsSync(info.path),
                    dependencies: info.dependencies
                };
            }
        }

        return diagnostics;
    }
}

// Create singleton instance
const moduleLoader = new ModuleLoader();

/**
 * Convenience function to load a single module
 * @param {string} moduleName - Module name
 * @returns {*} Loaded module
 */
function loadModule(moduleName) {
    return moduleLoader.loadModule(moduleName);
}

/**
 * Convenience function to load all modules
 * @returns {object} All loaded modules
 */
function loadAllModules() {
    return moduleLoader.loadAllModules();
}

/**
 * Set up modules in test context
 * @param {object} testContext - Test context to populate
 * @returns {object} Loaded modules
 */
function setupModules(testContext = {}) {
    try {
        const modules = loadAllModules();
        
        // Add to test context
        Object.assign(testContext, modules);
        
        // Make available globally for tests
        global.EventBus = modules.EventBus;
        global.View = modules.View;
        global.Page = modules.Page;
        global.MOJO = modules.MOJO;
        
        return modules;
    } catch (error) {
        console.error('Failed to setup modules:', error);
        throw error;
    }
}

module.exports = {
    ModuleLoader,
    moduleLoader,
    loadModule,
    loadAllModules,
    setupModules
};