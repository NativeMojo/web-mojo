/**
 * MOJO Timeline Extension
 * 
 * Timeline components for displaying chronological events
 * 
 * @module web-mojo/timeline
 * @example
 * import { TimelineView, TimelineViewItem } from 'web-mojo/timeline';
 * import 'web-mojo/timeline/style.css';
 */

// Export timeline components
export { default as TimelineView } from './extensions/timeline/TimelineView.js';
export { default as TimelineViewItem } from './extensions/timeline/TimelineViewItem.js';

// Re-export core dependencies that might be needed
export { default as ListView } from './core/views/list/ListView.js';
export { default as ListViewItem } from './core/views/list/ListViewItem.js';
export { default as View } from './core/View.js';
export { default as Collection } from './core/Collection.js';
export { default as Model } from './core/Model.js';
