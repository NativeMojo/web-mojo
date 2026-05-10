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
            'DjangoLookups',
            'Model',
            'RestModel',
            'Collection',
            'View',
            'Page',
            'ListViewItem',
            'ListGroupHeaderView',
            'grouping',
            'SegmentControl',
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
            'ThemeManager': {
                path: path.join(this.sourceRoot, 'core/utils/ThemeManager.js'),
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
                dependencies: ['MOJOUtils', 'EventDelegate', 'MojoMustache', 'EventEmitter']
            },
            'Page': {
                path: path.join(this.sourceRoot, 'core/Page.js'),
                dependencies: ['View']
            },
            'ListViewItem': {
                path: path.join(this.sourceRoot, 'core/views/list/ListViewItem.js'),
                dependencies: ['View']
            },
            'ListGroupHeaderView': {
                path: path.join(this.sourceRoot, 'core/views/list/ListGroupHeaderView.js'),
                dependencies: ['View']
            },
            'grouping': {
                path: path.join(this.sourceRoot, 'core/views/list/grouping.js'),
                dependencies: ['dataFormatter']
            },
            'DjangoLookups': {
                path: path.join(this.sourceRoot, 'core/utils/DjangoLookups.js'),
                dependencies: []
            },
            'SegmentControl': {
                path: path.join(this.sourceRoot, 'core/views/navigation/SegmentControl.js'),
                dependencies: ['View']
            },
            'ListView': {
                path: path.join(this.sourceRoot, 'core/views/list/ListView.js'),
                dependencies: ['View', 'Collection', 'Modal', 'DjangoLookups', 'ListViewItem', 'ListGroupHeaderView', 'SegmentControl']
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
            },
            'User': {
                path: path.join(this.sourceRoot, 'core/models/User.js'),
                dependencies: ['Model', 'Collection']
            },
            'Member': {
                path: path.join(this.sourceRoot, 'core/models/Member.js'),
                dependencies: ['Model', 'Collection']
            },
            'dateFns': {
                path: path.join(this.sourceRoot, 'core/utils/dateFns.js'),
                dependencies: []
            },
            'Calendar': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/calendar/Calendar.js'),
                dependencies: ['View', 'dateFns']
            },
            'CalendarPopover': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/calendar/CalendarPopover.js'),
                dependencies: []
            },
            'PresetSidebar': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/calendar/PresetSidebar.js'),
                dependencies: ['View', 'dateFns']
            },
            'DatePicker': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/DatePicker.js'),
                dependencies: ['View', 'Calendar', 'CalendarPopover', 'dateFns']
            },
            'DateRangePicker': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/DateRangePicker.js'),
                dependencies: ['View', 'Calendar', 'CalendarPopover', 'PresetSidebar', 'dateFns']
            },
            'ComboBox': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/ComboBox.js'),
                dependencies: ['View']
            },
            'TimezoneSelect': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/TimezoneSelect.js'),
                dependencies: ['View', 'ComboBox']
            },
            'TimePicker': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/TimePicker.js'),
                dependencies: ['View', 'CalendarPopover', 'TimezoneSelect', 'dateFns']
            },
            'DateTimePicker': {
                path: path.join(this.sourceRoot, 'core/forms/inputs/DateTimePicker.js'),
                dependencies: ['View', 'Calendar', 'CalendarPopover', 'TimePicker', 'TimezoneSelect', 'dateFns']
            },
            'TableView': {
                // TableView now genuinely extends ListView (toolbar / filter /
                // pagination machinery moved up into the parent). Load ListView
                // first so the inheritance chain is real and prototype lookups
                // for inherited methods (e.g. buildFilterDialogField) resolve.
                path: path.join(this.sourceRoot, 'core/views/table/TableView.js'),
                dependencies: ['View', 'ListView', 'TableRow', 'dataFormatter', 'DjangoLookups']
            },
            'SegmentControl': {
                path: path.join(this.sourceRoot, 'core/views/navigation/SegmentControl.js'),
                dependencies: ['View']
            },
            'TabView': {
                path: path.join(this.sourceRoot, 'core/views/navigation/TabView.js'),
                dependencies: ['View']
            },
            'MetricCard': {
                path: path.join(this.sourceRoot, 'core/views/data/MetricCard.js'),
                dependencies: ['View']
            },
            'StatusPanel': {
                path: path.join(this.sourceRoot, 'core/views/data/StatusPanel.js'),
                dependencies: ['View']
            },
            'Timeline': {
                path: path.join(this.sourceRoot, 'core/views/data/Timeline.js'),
                dependencies: ['View']
            },
            'FlowStrip': {
                path: path.join(this.sourceRoot, 'core/views/data/FlowStrip.js'),
                dependencies: ['View']
            },
            'KnownFieldsCard': {
                path: path.join(this.sourceRoot, 'core/views/data/KnownFieldsCard.js'),
                dependencies: ['View', 'dataFormatter']
            },
            'SideNavView': {
                path: path.join(this.sourceRoot, 'core/views/navigation/SideNavView.js'),
                dependencies: ['View']
            },
            'DetailView': {
                path: path.join(this.sourceRoot, 'core/views/data/DetailView.js'),
                dependencies: ['View', 'SideNavView']
            },
            'JobDetailsView': {
                // TableView is intentionally NOT a dependency here — the real
                // TableView extends ListView which the simple-module-loader
                // doesn't register, and instantiating it inside the
                // JobDetailsView constructor blows up on `this.options.showExport`.
                // Tests stub `global.TableView` before calling loadModule.
                path: path.join(this.sourceRoot, 'extensions/admin/jobs/JobDetailsView.js'),
                dependencies: ['View', 'DetailView', 'Modal', 'StatusPanel', 'Timeline', 'MOJOUtils']
            },
            'ShortLinkView': {
                // Same TableView caveat as JobDetailsView. Tests must stub
                // `global.TableView`, `global.MetricsChart` (or
                // `global.ChartsStub.MetricsChart`), and the model imports
                // (`global.ShortLinkModelsStub`) before loadModule.
                path: path.join(this.sourceRoot, 'extensions/admin/shortlinks/ShortLinkView.js'),
                dependencies: ['View', 'DetailView', 'Modal', 'MetricCard', 'KnownFieldsCard', 'MOJOUtils', 'dataFormatter']
            },
            'RunnerDetailsView': {
                // Same TableView caveat as JobDetailsView — tests stub
                // `global.TableView` plus the model-import stubs
                // (`global.JobModelsStub`, `global.JobRunnerModelsStub`)
                // before loadModule.
                path: path.join(this.sourceRoot, 'extensions/admin/jobs/RunnerDetailsView.js'),
                dependencies: ['View', 'DetailView', 'Modal', 'StatusPanel', 'KnownFieldsCard', 'MOJOUtils']
            },
            'IncidentView': {
                // Same TableView caveat as JobDetailsView. Tests must stub
                // `global.TableView`, the model-import stubs
                // (`global.IncidentModelsStub`, `global.TicketsModelsStub`,
                // `global.SystemModelsStub`), the sibling-view stubs
                // (`global.GeoIPViewStub`, `global.RuleSetViewStub`,
                // `global.IncidentHistoryAdapterStub`), and the assistant
                // helper (`global.AssistantContextChatStub`) before
                // loadModule.
                path: path.join(this.sourceRoot, 'extensions/admin/incidents/IncidentView.js'),
                dependencies: [
                    'View', 'DetailView', 'Modal', 'StatusPanel', 'Timeline',
                    'KnownFieldsCard', 'MetricCard', 'MOJOUtils'
                ]
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
            // Declare unresolved import as a stub class so module-load doesn't
            // ReferenceError when names appear in `class X extends Y` etc.
            // The stub is callable and extendable; tests must register a
            // proper module if they invoke methods on it.
            return `const ${importName} = class { constructor(){} }; // (unresolved import stub)\n`;
        });

        // Named imports: `import { a, b as c } from 'path';`
        code = code.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"];?\s*\n?/g, (match, imports, importPath) => {
            const globalName = this.importPathToGlobal(importPath);
            // Each entry may be `Name` or `Name as Alias` — bind the local name (the alias if present).
            const entries = imports.split(',').map(n => n.trim()).filter(Boolean).map(spec => {
                const m = spec.match(/^(\S+)\s+as\s+(\S+)$/);
                return m ? { source: m[1], local: m[2] } : { source: spec, local: spec };
            });
            if (globalName) {
                // Try the named export first, then fall back to the module
                // itself when the named binding is undefined. This handles
                // modules that expose a single class via both `export class X`
                // and `export default X` — at test time the module value
                // is the class, so `global.X.X` is undefined.
                return entries.map(e => `const ${e.local} = (global.${globalName} && global.${globalName}.${e.source}) || global.${globalName};`).join('\n') + '\n';
            }
            // Unresolved relative import: declare locals as undefined so module-load
            // doesn't ReferenceError when names appear in metadata literals.
            return entries.map(e => `const ${e.local} = undefined;`).join('\n') + '\n';
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
                Collection: 'Collection',
                User: 'User',
                Member: 'Member',
                dateFns: 'dateFns',
                Calendar: 'Calendar',
                CalendarPopover: 'CalendarPopover',
                PresetSidebar: 'PresetSidebar',
                DatePicker: 'DatePicker',
                DateRangePicker: 'DateRangePicker',
                ComboBox: 'ComboBox',
                TimezoneSelect: 'TimezoneSelect',
                TimePicker: 'TimePicker',
                DateTimePicker: 'DateTimePicker',
                TableView: 'TableView'
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
            { test: /ListGroupHeaderView/, name: 'ListGroupHeaderView' },
            { test: /ListViewItem/, name: 'ListViewItem' },
            { test: /\/ListView(\.js)?$/, name: 'ListView' },
            { test: /\/grouping(\.js)?$/, name: 'grouping' },
            { test: /TableRow/, name: 'TableRow' },
            { test: /DjangoLookups/, name: 'DjangoLookups' },
            { test: /\/Dialog(\.js)?$/, name: 'Dialog' },
            { test: /\/Modal(\.js)?$/, name: 'Modal' },
            { test: /\/View(\.js)?$/, name: 'View' },
            { test: /\/Page(\.js)?$/, name: 'Page' },
            { test: /dateFns(\.js)?$/, name: 'dateFns' },
            { test: /\/Calendar(\.js)?$/, name: 'Calendar' },
            { test: /CalendarPopover(\.js)?$/, name: 'CalendarPopover' },
            { test: /PresetSidebar(\.js)?$/, name: 'PresetSidebar' },
            { test: /\/ComboBox(\.js)?$/, name: 'ComboBox' },
            { test: /TimezoneSelect(\.js)?$/, name: 'TimezoneSelect' },
            { test: /\/TimePicker(\.js)?$/, name: 'TimePicker' },
            { test: /\/DateTimePicker(\.js)?$/, name: 'DateTimePicker' },
            { test: /\/TableView(\.js)?$/, name: 'TableView' },
            { test: /\/SideNavView(\.js)?$/, name: 'SideNavView' },
            { test: /\/ContextMenu(\.js)?$/, name: 'ContextMenu' },
            { test: /\/SegmentControl(\.js)?$/, name: 'SegmentControl' },
            { test: /\/MetricCard(\.js)?$/, name: 'MetricCard' },
            { test: /\/StatusPanel(\.js)?$/, name: 'StatusPanel' },
            { test: /\/Timeline(\.js)?$/, name: 'Timeline' },
            { test: /\/FlowStrip(\.js)?$/, name: 'FlowStrip' },
            { test: /\/KnownFieldsCard(\.js)?$/, name: 'KnownFieldsCard' },
            { test: /\/DetailView(\.js)?$/, name: 'DetailView' },
            { test: /admin\/models\/JobRunner(\.js)?$/, name: 'JobRunnerModelsStub' },
            { test: /admin\/models\/Job(\.js)?$/, name: 'JobModelsStub' },
            { test: /core\/models\/ShortLink(\.js)?$/, name: 'ShortLinkModelsStub' },
            { test: /admin\/models\/Incident(\.js)?$/, name: 'IncidentModelsStub' },
            { test: /admin\/models\/Tickets(\.js)?$/, name: 'TicketsModelsStub' },
            { test: /core\/models\/System(\.js)?$/, name: 'SystemModelsStub' },
            { test: /devices\/GeoIPView(\.js)?$/, name: 'GeoIPViewStub' },
            { test: /\/RuleSetView(\.js)?$/, name: 'RuleSetViewStub' },
            { test: /adapters\/IncidentHistoryAdapter(\.js)?$/, name: 'IncidentHistoryAdapterStub' },
            { test: /assistant\/AssistantContextChat(\.js)?$/, name: 'AssistantContextChatStub' },
            { test: /\/ChatView(\.js)?$/, name: 'ChatViewStub' },
            { test: /\/StackTraceView(\.js)?$/, name: 'StackTraceViewStub' },
            { test: /\/DataView(\.js)?$/, name: 'DataViewStub' },
            { test: /charts\/index(\.js)?$/, name: 'ChartsStub' }
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
