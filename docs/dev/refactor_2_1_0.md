# MOJO 2.1.0 Refactor Plan (core + extensions)

This document tracks the final steps to complete the “core + extensions” restructuring in v2.1.0. It consolidates what’s done and what remains, with concrete commands and code snippets.

Goals
- Clear boundaries:
  - core: stable runtime and building blocks (no extension deps)
  - extensions: feature sets that depend on core and may depend on each other via public surfaces
- Safer dependency graph:
  - Avoid circular imports; lazy-load heavy UI helpers (Dialog) only where needed
- Keep existing build system and subpath exports
- Introduce explicit aliases (@core, @ext) and prefer direct imports over barrels
- Preserve lazy-loading of Dialog and heavy features

What’s already in place
- Aliases added to Vite (dev and lib):
  - @core → src/core
  - @ext → src/extensions
- Dialog moved to core and lazy-loaded via WebApp helpers
  - Path: src/core/views/feedback/Dialog.js
  - WebApp uses dynamic import for Dialog to avoid cycles and reduce initial payload
- chunkFileNames configured for clearer output in library builds
  - chunks/[name]-[hash].js
- View delegates showError/showSuccess/showInfo/showWarning to WebApp; no Dialog import in View
- Partially updated imports to use @core paths

Remaining tasks (checklist)
1) Complete folder moves (verify on your machine, should be done)
   - core (should contain):
     - View.js, Page.js, Router.js, Model.js, Collection.js, Rest.js
     - WebApp.js, PortalApp.js
     - pages/* (from src/pages)
     - models/* (from src/models)
     - forms/* (from src/forms)
     - utils/* (from src/utils)
     - mixins/* (from src/mixins)
     - services/* (from src/services)
     - views/* (from src/views: navigation, list, table, data, file, feedback)
     - css/* (core.css, portal.css, table.css, toast.css) [optional now, see CSS section]
   - extensions (should contain):
     - auth/* (from src/auth)
     - lightbox/* (from src/lightbox)
     - charts/* (from src/charts)
     - admin/* (from src/admin)
     - loader/* (from src/loader)
     - docit/* (from src/docit)

2) Root entry files (recreate; minimal and explicit)
   - src/index.js (core package entry)
     - Import core CSS
     - Export core runtime, selected views, services, and utils
     - Export Dialog (UI helper) from @core/views/feedback/Dialog.js
     - Export version constants from ./version.js
   - src/auth.js (auth subpath entry)
     - Import extensions/auth CSS
     - Export AuthApp and plugins from @ext/auth
     - Re-export WebApp from @core (convenience)
     - Export version constants

   Suggested src/index.js:
   ```
   /**
    * MOJO Framework - Core Entry (2.1.0)
    */
   
   // Bundle core CSS
   import '@core/css/core.css';
   import '@core/css/portal.css';
   import '@core/css/table.css';
   import '@core/css/toast.css';
   
   // Version info
   export {
     VERSION_INFO,
     VERSION,
     VERSION_MAJOR,
     VERSION_MINOR,
     VERSION_REVISION,
     BUILD_TIME
   } from './version.js';
   
   // Core runtime
   export { default as View } from '@core/View.js';
   export { default as Page } from '@core/Page.js';
   export { default as Router } from '@core/Router.js';
   export { default as Model } from '@core/Model.js';
   export { default as Collection } from '@core/Collection.js';
   export { default as Rest } from '@core/Rest.js';
   
   // App classes
   export { default as WebApp } from '@core/WebApp.js';
   export { default as PortalApp } from '@core/PortalApp.js';
   
   // UI helper
   export { default as Dialog } from '@core/views/feedback/Dialog.js';
   
   // Selected views (curated for tree-shaking)
   export { default as TableView } from '@core/views/table/TableView.js';
   export { default as TableRow } from '@core/views/table/TableRow.js';
   export { default as ListView } from '@core/views/list/ListView.js';
   export { default as ListViewItem } from '@core/views/list/ListViewItem.js';
   export { default as TopNav } from '@core/views/navigation/TopNav.js';
   export { default as Sidebar } from '@core/views/navigation/Sidebar.js';
   export { default as TabView } from '@core/views/navigation/TabView.js';
   export { default as SimpleSearchView } from '@core/views/navigation/SimpleSearchView.js';
   export { default as DataView } from '@core/views/data/DataView.js';
   export { default as FilePreviewView } from '@core/views/file/FilePreviewView.js';
   
   // Services, utils, mixins
   export { default as FileUpload } from '@core/services/FileUpload.js';
   export { default as EventDelegate } from '@core/mixins/EventDelegate.js';
   export { default as EventBus } from '@core/utils/EventBus.js';
   export { default as DataFormatter } from '@core/utils/DataFormatter.js';
   export { default as MustacheFormatter } from '@core/utils/MustacheFormatter.js';
   export { default as MOJOUtils, DataWrapper } from '@core/utils/MOJOUtils.js';
   
   // Names
   export const FRAMEWORK_NAME = 'MOJO';
   export const PACKAGE_NAME = 'web-mojo';
   
   export default {
     FRAMEWORK_NAME,
     PACKAGE_NAME,
   };
   ```

   Suggested src/auth.js:
   ```
   /**
    * MOJO Auth Extension - Entry (2.1.0)
    */
   
   // Bundle auth CSS
   import '@ext/auth/css/auth.css';
   
   export { default as AuthApp } from '@ext/auth/AuthApp.js';
   export { default as PasskeyPlugin } from '@ext/auth/plugins/PasskeyPlugin.js';
   
   // Convenience
   export { default as WebApp } from '@core/WebApp.js';
   
   // Version info passthrough
   export {
     VERSION_INFO,
     VERSION,
     VERSION_MAJOR,
     VERSION_MINOR,
     VERSION_REVISION,
     BUILD_TIME
   } from './version.js';
   ```

3) CSS relocation (optional now; recommended, move is done, need to update config)
   - Move CSS from src/css to:
     - src/core/css: core.css, portal.css, table.css, toast.css
     - src/extensions/auth/css: auth.css
     - src/extensions/lightbox/css: lightbox.css
     - src/extensions/charts/css: charts.css
     - src/extensions/admin/css: admin.css
   - Update package.json build:css script to copy from new paths:
     ```
     "build:css": "cp src/core/css/core.css dist/core.css && cp src/core/css/portal.css dist/portal.css && cp src/core/css/table.css dist/table.css && cp src/core/css/toast.css dist/toast.css && cp src/extensions/auth/css/auth.css dist/auth.css && cp src/extensions/lightbox/css/lightbox.css dist/lightbox.css && cp src/extensions/charts/css/charts.css dist/charts.css && cp src/extensions/admin/css/admin.css dist/admin.css"
     ```
   - Update exports in package.json for CSS (optional, but recommended for subpath imports):
     ```
     "./css/core": "./dist/core.css",
     "./css/portal": "./dist/portal.css",
     "./css/table": "./dist/table.css",
     "./css/toast": "./dist/toast.css",
     "./css/auth": "./dist/auth.css",
     "./css/lightbox": "./dist/lightbox.css",
     "./css/charts": "./dist/charts.css",
     "./css/admin": "./dist/admin.css",
     ```

4) Convert all imports to aliases
   - Replace relative imports that traverse out of a folder to point to @core or @ext
   - Rules:
     - Anything now under src/core → @core/…
     - Anything now under src/extensions/<name> → @ext/<name>/…
     - Dialog everywhere → @core/views/feedback/Dialog.js
     - WebApp/PortalApp → @core/WebApp.js and @core/PortalApp.js
   - Tip: Run a grep for patterns like:
     - ../core/, ../../core/, /src/core/, ../views/, ../forms/, ../utils/, ../models/, ../services/, ../mixins/
     - And replace with the correct @core or @ext paths.

5) Dialog lazy-load internals (optional but recommended)
   - In src/core/views/feedback/Dialog.js:
     - Replace top-level imports of FormView and DataView with dynamic imports inside the methods that need them:
       - showForm/showModelForm → const FormView = (await import('@core/forms/FormView.js')).default;
       - showData → const DataView = (await import('@core/views/data/DataView.js')).default;
   - Keep: import View from '@core/View.js' (static) for instanceof checks.

6) Template scanning updates
   - If you have tooling that scans for templates, include:
     - src/core/pages/** (instead of src/pages/**)
     - src/extensions/**/pages/** (for extension templates)
   - Update scripts/build-templates.js or vite-plugin-templates.js accordingly.

7) Package.json alignment
   - Fields must match generated outputs:
     - "main": "./dist/index.cjs.js"
     - "module": "./dist/index.es.js"
     - "browser": "./dist/index.es.js"
   - "exports" should match final outputs and CSS paths:
     ```
     "exports": {
       ".": { "import": "./dist/index.es.js", "require": "./dist/index.cjs.js" },
       "./loader": { "import": "./dist/loader.es.js", "require": "./dist/loader.umd.js" },
       "./auth": { "import": "./dist/auth.es.js", "require": "./dist/auth.cjs.js" },
       "./templates": "./dist/templates/index.js",
       "./templates/*": "./dist/templates/*",
       "./style.css": "./dist/css/web-mojo.css",
     
       // CSS subpaths (if added)
       "./css/core": "./dist/core.css",
       "./css/portal": "./dist/portal.css",
       "./css/table": "./dist/table.css",
       "./css/toast": "./dist/toast.css",
       "./css/auth": "./dist/auth.css",
       "./css/lightbox": "./dist/lightbox.css",
       "./css/charts": "./dist/charts.css",
       "./css/admin": "./dist/admin.css",
     
       "./package.json": "./package.json"
     }
     ```
   - Do not expose "types" unless you actually generate d.ts.

8) ESLint boundaries (optional; recommended)
   - Keep dynamic import banned by default but allow in:
     - src/core/WebApp.js
     - src/core/views/feedback/Dialog.js
   - Add no-restricted-imports and no-cycle (eslint-plugin-import) to enforce:
     - Use @core and @ext instead of deep relative paths
     - Avoid cross-extension deep imports; import via the extension’s public module only

9) Fix Examples

   - Fix examples/portal/* to use correct imports, and css
   - Fix examples/auth/* to use correct imports, and css

10) Document

    1) Document project QUICK_START.md to cover all the basics of the new layout and how to develop with the framework wether local or remote.

11) Dev/test notes
    - When using npm link or a workspace, always build the package before linking to avoid dev bundlers crawling src directly
    - In consumer Vite config:
      ```
      optimizeDeps: { exclude: ['web-mojo'] },
      ssr: { noExternal: ['web-mojo'] }
      ```
    - For the most accurate local simulation of publish, use `npm pack` and install the .tgz into your consumer app

Validation steps
1) npm run build:dist
   - No unresolved import errors
   - Output contains: dist/index.es.js, dist/index.cjs.js, dist/auth.es.js, dist/auth.cjs.js, and chunks under dist/chunks/…
2) npm run lint
   - No errors from alias rules or disallowed dynamic imports
3) Spot-check consuming app
   - Import from 'web-mojo' and 'web-mojo/auth'
   - Verify Dialog loads lazily on first use and there are no circular init errors
   - Verify CSS:
     - Bundled CSS (style emitted by Vite) applied when importing JS entries
     - Direct-link CSS works via dist/*.css if used

FAQ
- Do we need index.js files inside every folder?
  - No. Prefer direct imports via @core/* and @ext/* for clarity. Only add barrels where they define a clean public surface (e.g., @core/views/table/index.js).
- Why keep lazy-loading only in WebApp and Dialog?
  - It breaks cycles, reduces initial JS, and centralizes UX helpers in the app layer.

Appendix: Quick grep commands
- Find legacy imports to fix:
  - `grep -R \"\\./\\.?\\./core/\\|\\./\\.?\\./views/\\|\\./\\.?\\./forms/\\|\\./\\.?\\./utils/\\|\\./\\.?\\./models/\\|\\./\\.?\\./services/\\|\\./\\.?\\./mixins/\" src -n`
- Find Dialog imports:
  - `grep -R \"from '.*Dialog.js'\" src -n`

Once these steps are complete, the core + extensions boundary will be explicit, bundle outputs will be predictable, and lazy-load points are controlled and safe.