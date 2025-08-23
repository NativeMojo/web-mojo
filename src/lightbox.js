/**
 * MOJO Lightbox Package - Media viewer components
 * Package: web-mojo/lightbox
 */

// Import lightbox CSS
import './css/lightbox.css';

// Export lightbox components
export { default as ImageViewer } from './lightbox/ImageViewer.js';
export { default as ImageEditor } from './lightbox/ImageEditor.js';
export { default as PDFViewer } from './lightbox/PDFViewer.js';

// Package metadata
export const LIGHTBOX_PACKAGE_NAME = 'web-mojo/lightbox';
export const LIGHTBOX_VERSION = '1.0.0';