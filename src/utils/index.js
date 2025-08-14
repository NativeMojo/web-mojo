/**
 * MOJO Framework - Utilities Index
 * Export all utility functions and classes for easier imports
 */

// Event Management
export { default as EventBus } from './EventBus.js';

// Template Engine
export { default as mustache } from './mustache.js';

// Data Formatting
export { default as DataFormatter } from './DataFormatter.js';
export { default as MustacheFormatter } from './MustacheFormatter.js';

// General Utilities
export { default as MOJOUtils, DataWrapper } from './MOJOUtils.js';

// Re-export everything as a namespace for convenience
import EventBus from './EventBus.js';
import mustache from './mustache.js';
import DataFormatter from './DataFormatter.js';
import MustacheFormatter from './MustacheFormatter.js';
import MOJOUtils, { DataWrapper } from './MOJOUtils.js';

export const Utils = {
  EventBus,
  mustache,
  DataFormatter,
  MustacheFormatter,
  MOJOUtils,
  DataWrapper
};

// Default export for convenience
export default Utils;