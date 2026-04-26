/**
 * Simple Module Loader for MOJO Framework Tests
 * Loads and transforms ES6 modules for use in Node.js test environment
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SOURCE_ROOT = path.join(PROJECT_ROOT, 'src');

class SimpleModuleLoader {
    constructor() {
        this.projectRoot = PROJECT_ROOT;
        this.sourceRoot = SOURCE_ROOT;
        this.loadedModules = new Map();

        // Module dependency order (only modules that actually exist)
        this.moduleOrder = [
            'EventBus',
            'EventEmitter',
            'EventDelegate',
            'Router',
            'Rest',
            'dataFormatter',
            'MOJOUtils',
            'MojoMustache',
            'Model',
            'RestModel',
            'Collection',
            'View',
            'Page',
            'ListViewItem',
            'TableRow'
        ];

        // Set up global environment
        this.setupGlobals();
    }

    /**
     * Set up global environment for modules
     */
    setupGlobals() {
        // Mock localStorage so Rest's DUID init doesn't throw.
        // Always install — tests may have clobbered it with a plain object mock.
        const store = new Map();
        const localStorageStub = {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => { store.set(k, String(v)); },
            removeItem: (k) => { store.delete(k); },
            clear: () => { store.clear(); }
        };
        global.localStorage = localStorageStub;
        // Node >= 20 has globalThis.localStorage sometimes set to undefined;
        // make sure our stub is visible to ESM-imported source files too.
        if (typeof globalThis.localStorage === 'undefined' ||
            typeof globalThis.localStorage.getItem !== 'function') {
            globalThis.localStorage = localStorageStub;
        }

        // Mock Mustache if not available
        if (typeof global.Mustache === 'undefined') {
            global.Mustache = {
                render: (template, data = {}) => {
                    let result = template;

                    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                        return data[key] || '';
                    });

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
        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        // RestModel is just an alias for Model
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

        const module = this.loadModuleFromFile(moduleInfo.path, moduleName);
        this.loadedModules.set(moduleName, module);
        global[moduleName] = module;

        // Install MojoMustache as the global Mustache the moment it loads,
        // so anything loaded after (View, Page, etc.) captures the real
        // implementation in its sandbox rather than the stub.
        if (moduleName === 'MojoMustache' && module && typeof module.render === 'function') {
            global.Mustache = module;
        }

        return module;
    }

    /**
     * Get module configuration
     */
    getModuleInfo(moduleName) {
        const modules = {
            'EventBus': {
                path: path.join(this.sourceRoot, 'core/utils/EventBus.js'),
                dependencies: []
            },
            'EventEmitter': {
                path: path.join(this.sourceRoot, 'core/mixins/EventEmitter.js'),
                dependencies: []
            },
            'EventDelegate': {
                path: path.join(this.sourceRoot, 'core/mixins/EventDelegate.js'),
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
                path: path.join(this.sourceRoot, 'core/utils/DataFormatter.js'),
                dependencies: []
            },
            'MOJOUtils': {
                path: path.join(this.sourceRoot, 'core/utils/MOJOUtils.js'),
                dependencies: ['dataFormatter']
            },
            'MojoMustache': {
                path: path.join(this.sourceRoot, 'core/utils/mustache.js'),
                dependencies: ['MOJOUtils']
            },
            'Model': {
                path: path.join(this.sourceRoot, 'core/Model.js'),
                dependencies: ['Rest', 'dataFormatter', 'MOJOUtils', 'EventEmitter']
            },
            'RestModel': {
                path: path.join(this.sourceRoot, 'core/Model.js'),
                dependencies: ['Rest']
            },
            'Collection': {
                path: path.join(this.sourceRoot, 'core/Collection.js'),
                dependencies: ['Model', 'Rest', 'EventEmitter']
            },
            'View': {
                path: path.join(this.sourceRoot, 'core/View.js'),
                dependencies: ['MOJOUtils', 'EventDelegate', 'MojoMustache']
            },
            'Page': {
                path: path.join(this.sourceRoot, 'core/Page.js'),
                dependencies: ['View']
            },
            'ListViewItem': {
                path: path.join(this.sourceRoot, 'core/views/list/ListViewItem.js'),
                dependencies: ['View']
            },
            'TableRow': {
                path: path.join(this.sourceRoot, 'core/views/table/TableRow.js'),
                dependencies: ['ListViewItem', 'dataFormatter']
            },
            'TopNav': {
                path: path.join(this.sourceRoot, 'core/views/navigation/TopNav.js'),
                dependencies: ['View']
            },
            'ContextMenu': {
                path: path.join(this.sourceRoot, 'core/views/feedback/ContextMenu.js'),
                dependencies: ['View']
            },
            // Modal is the canonical dialog/modal surface. Tests typically
            // pre-set `global.Dialog` to a mock before loading Modal so the
            // transformed `import Dialog from './Dialog.js'` picks it up.
            'Modal': {
                path: path.join(this.sourceRoot, 'core/views/feedback/Modal.js'),
                dependencies: []
            }
        };

        return modules[moduleName];
    }

    /**
     * Load module from file by transforming ES6 module syntax so it can
     * execute in a Node.js function sandbox.
     */
    loadModuleFromFile(filePath, moduleName) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Module file not found: ${filePath}`);
        }

        try {
            const sourceCode = fs.readFileSync(filePath, 'utf8');
            const transformedCode = this.transformModule(sourceCode, moduleName);

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

                // Browser globals (some may be undefined before testHelpers.setup())
                window: global.window,
                document: global.document,
                HTMLElement: global.HTMLElement,
                Event: global.Event,
                CustomEvent: global.CustomEvent,
                fetch: global.fetch,
                localStorage: global.localStorage,
                setTimeout: global.setTimeout || setTimeout,
                clearTimeout: global.clearTimeout || clearTimeout,
                setInterval: global.setInterval || setInterval,
                clearInterval: global.clearInterval || clearInterval
            };

            // Only expose Mustache to modules that don't declare their own
            // `const Mustache = ...` at module scope (mustache.js itself
            // does). Otherwise the sandbox parameter shadows/conflicts.
            if (!/\bconst\s+Mustache\b/.test(sourceCode)) {
                sandbox.Mustache = global.Mustache;
            }

            const contextKeys = Object.keys(sandbox);
            const contextValues = Object.values(sandbox);

            const moduleFunction = new Function(...contextKeys, transformedCode);
            const result = moduleFunction(...contextValues);

            return result;
        } catch (error) {
            throw new Error(`Failed to load module ${moduleName} from ${filePath}: ${error.message}\n${error.stack}`);
        }
    }

    /**
     * Transform ES6 module syntax to work in our context
     */
    transformModule(sourceCode, moduleName) {
        let code = sourceCode;

        // Default imports: `import Foo from 'path';`
        code = code.replace(/import\s+([^'"\s{][^'"\s]*)\s+from\s+['"]([^'"]+)['"];?\s*\n?/g, (match, importName, importPath) => {
            if (importPath.includes('mustache')) return `// Using global Mustache\n`;

            // Map import paths to global module names
            const globalName = this.importPathToGlobal(importPath);
            if (globalName) {
                return `const ${importName} = global.${globalName};\n`;
            }
            return `// Import (unresolved): ${match}\n`;
        });

        // Named imports: `import { a, b } from 'path';`
        code = code.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"];?\s*\n?/g, (match, imports, importPath) => {
            const globalName = this.importPathToGlobal(importPath);
            if (globalName) {
                const names = imports.split(',').map(n => n.trim()).filter(Boolean);
                return names.map(n => `const ${n} = global.${globalName} && global.${globalName}.${n};`).join('\n') + '\n';
            }
            return `// Named imports (unresolved): ${imports} from ${importPath}\n`;
        });

        // Named export statements: `export { a, b };` — drop them
        code = code.replace(/export\s*\{\s*[^}]+\s*\};?\s*$/gm, '// (named export removed)');

        // `export default <expr>;` — capture and return
        if (/export\s+default\s+/.test(code)) {
            code = code.replace(/export\s+default\s+([^;]+);?\s*$/gm, (match, exportValue) => {
                return `const __moduleExport = ${exportValue};\nreturn __moduleExport;`;
            });
        } else {
            // Fallback returns by well-known module name
            const fallbackReturns = {
                EventBus: 'EventBus',
                View: 'View',
                Page: 'Page',
                dataFormatter: 'dataFormatter',
                MOJOUtils: 'MOJOUtils',
                EventEmitter: 'EventEmitter',
                EventDelegate: 'EventDelegate',
                Router: 'Router',
                Rest: 'Rest',
                Model: 'Model',
                Collection: 'Collection'
            };
            if (fallbackReturns[moduleName]) {
                code += `\nreturn ${fallbackReturns[moduleName]};`;
            }
        }

        // `export const/let/var/class/function` — strip the export keyword
        code = code.replace(/^export\s+(const|let|var|class|function|async)\s+/gm, '$1 ');

        return code;
    }

    /**
     * Map an import path to the global module variable name set up by the loader.
     */
    importPathToGlobal(importPath) {
        const rules = [
            { test: /EventBus/i, name: 'EventBus' },
            { test: /EventEmitter/, name: 'EventEmitter' },
            { test: /EventDelegate/, name: 'EventDelegate' },
            { test: /Collection/, name: 'Collection' },
            { test: /Model/, name: 'Model' },
            { test: /Router/, name: 'Router' },
            { test: /Rest/, name: 'Rest' },
            { test: /DataFormatter/, name: 'dataFormatter' },
            { test: /MOJOUtils/, name: 'MOJOUtils' },
            { test: /ListViewItem/, name: 'ListViewItem' },
            { test: /TableRow/, name: 'TableRow' },
            { test: /\/Dialog(\.js)?$/, name: 'Dialog' },
            { test: /\/Modal(\.js)?$/, name: 'Modal' },
            { test: /\/View(\.js)?$/, name: 'View' },
            { test: /\/Page(\.js)?$/, name: 'Page' }
        ];
        for (const rule of rules) {
            if (rule.test.test(importPath)) return rule.name;
        }
        return null;
    }

    /**
     * Load all modules in dependency order
     */
    loadAllModules() {
        const modules = {};

        for (const moduleName of this.moduleOrder) {
            try {
                modules[moduleName] = this.loadModule(moduleName);
            } catch (error) {
                console.error(`Failed to load ${moduleName}:`, error.message);
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
        for (const moduleName of this.moduleOrder) {
            delete global[moduleName];
        }
    }

    /**
     * Get diagnostic information
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
     */
    validateModule(module, expectedType = 'class') {
        if (!module) return false;
        if (expectedType === 'class') return typeof module === 'function' && module.prototype;
        if (expectedType === 'function') return typeof module === 'function';
        return true;
    }
}

// Singleton instance
const moduleLoader = new SimpleModuleLoader();

function loadModule(moduleName) {
    return moduleLoader.loadModule(moduleName);
}

function loadAllModules() {
    return moduleLoader.loadAllModules();
}

function setupModules(testContext = {}) {
    try {
        const modules = moduleLoader.loadAllModules();

        const validationResults = {
            EventBus: moduleLoader.validateModule(modules.EventBus, 'class'),
            View: moduleLoader.validateModule(modules.View, 'class'),
            Page: moduleLoader.validateModule(modules.Page, 'class')
        };

        const failedModules = Object.entries(validationResults)
            .filter(([, valid]) => !valid)
            .map(([name]) => name);

        if (failedModules.length > 0) {
            console.warn('Some modules failed validation:', failedModules);
        }

        // Replace the setupGlobals() stub Mustache with the real MOJO
        // Mustache implementation once it's loaded. The stub doesn't
        // understand dotted paths or pipe formatters, so template tests
        // would otherwise fail even with a correct source tree.
        if (modules.MojoMustache && typeof modules.MojoMustache.render === 'function') {
            global.Mustache = modules.MojoMustache;
        }

        // MojoMustache's pipe support looks up DataFormatter via window
        // (window.MOJO?.dataFormatter or window.dataFormatter). Expose the
        // loaded dataFormatter singleton there so `{{foo|pipe}}` actually
        // formats in template tests.
        if (modules.dataFormatter && global.window) {
            global.window.dataFormatter = modules.dataFormatter;
            global.window.MOJO = global.window.MOJO || {};
            global.window.MOJO.dataFormatter = modules.dataFormatter;
        }

        Object.assign(testContext, modules);
        Object.assign(global, modules);

        return modules;
    } catch (error) {
        console.error('Failed to setup modules:', error);
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
