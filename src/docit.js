/**
 * MOJO DocIt Extension - Entry (2.1.0)
 */

// Bundle docit CSS
import '@ext/docit/styles/docit.css';

// DocIt App
export { default as DocItApp } from '@ext/docit/DocItApp.js';

// DocIt Pages
export { default as DocHomePage } from '@ext/docit/pages/DocHomePage.js';
export { default as DocPage } from '@ext/docit/pages/DocPage.js';
export { default as DocEditPage } from '@ext/docit/pages/DocEditPage.js';

// DocIt Models
export { DocitBook, DocitBookList } from '@ext/docit/models/Book.js';
export { DocitPage, DocitPageList } from '@ext/docit/models/Page.js';

// DocIt Views
export { default as DocNavSidebar } from '@ext/docit/views/DocNavSidebar.js';

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