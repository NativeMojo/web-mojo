/**
 * MOJO Lightbox Extension - Entry (2.1.0)
 */

// Bundle lightbox CSS
import '@ext/lightbox/css/lightbox.css';

// Export all lightbox components
export { default as ImageViewer } from '@ext/lightbox/ImageViewer.js';
export { default as ImageEditor } from '@ext/lightbox/ImageEditor.js';
export { default as ImageCropView } from '@ext/lightbox/ImageCropView.js';
export { default as ImageCanvasView } from '@ext/lightbox/ImageCanvasView.js';
export { default as ImageFiltersView } from '@ext/lightbox/ImageFiltersView.js';
export { default as ImageTransformView } from '@ext/lightbox/ImageTransformView.js';
export { default as ImageUploadView } from '@ext/lightbox/ImageUploadView.js';
export { default as LightboxGallery } from '@ext/lightbox/LightboxGallery.js';
export { default as PDFViewer } from '@ext/lightbox/PDFViewer.js';

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