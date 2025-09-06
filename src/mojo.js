/**
 * MOJO Framework - Main Entry Point
 * This file serves as the primary entry point for the MOJO framework
 */

// Export everything from the main index
export * from './index.js';

// Also provide a default export
import MOJO from './index.js';
export default MOJO;

// Log version info in development
import { VERSION_INFO } from './version.js';

if (typeof window !== 'undefined' && window.console) {
  console.log(`MOJO Framework ${VERSION_INFO.version} loaded`);
}