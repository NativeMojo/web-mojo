/**
 * MOJO Loader Extension - Entry (2.1.0)
 * Standalone loading animation script for app initialization
 */

// Note: loader.js is a standalone script, not a module export
// Include it via script tag: <script src="web-mojo/loader"></script>

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