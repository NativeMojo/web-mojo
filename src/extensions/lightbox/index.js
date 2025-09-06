/**
 * MOJO Lightbox Extension - Entry (2.1.0)
 * Media viewers and image editing components for the MOJO framework
 * Automatically registers plugins with core for optional integration
 */

// Bundle lightbox CSS
import '@ext/lightbox/css/lightbox.css';

// Import all lightbox components
import ImageViewer from './ImageViewer.js';
import ImageEditor from './ImageEditor.js';
import ImageCropView from './ImageCropView.js';
import ImageCanvasView from './ImageCanvasView.js';
import ImageFiltersView from './ImageFiltersView.js';
import ImageTransformView from './ImageTransformView.js';
import ImageUploadView from './ImageUploadView.js';
import LightboxGallery from './LightboxGallery.js';
import PDFViewer from './PDFViewer.js';

// Import WebApp for plugin registration
import WebApp from '@core/WebApp.js';

// Register plugins with core for optional integration
WebApp.registerPlugin('ImageCropView', ImageCropView);
WebApp.registerPlugin('LightboxGallery', LightboxGallery);
WebApp.registerPlugin('PDFViewer', PDFViewer);
WebApp.registerPlugin('ImageViewer', ImageViewer);
WebApp.registerPlugin('ImageEditor', ImageEditor);

// Version info passthrough
export {
  VERSION_INFO,
  VERSION,
  VERSION_MAJOR,
  VERSION_MINOR,
  VERSION_REVISION,
  BUILD_TIME
} from '../../version.js';

// Export all components for direct use
export {
  ImageViewer,
  ImageEditor,
  ImageCropView,
  ImageCanvasView,
  ImageFiltersView,
  ImageTransformView,
  ImageUploadView,
  LightboxGallery,
  PDFViewer
};

// Default export for convenience
export default {
  ImageViewer,
  ImageEditor,
  ImageCropView,
  ImageCanvasView,
  ImageFiltersView,
  ImageTransformView,
  ImageUploadView,
  LightboxGallery,
  PDFViewer
};