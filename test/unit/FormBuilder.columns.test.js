/**
 * FormBuilder column-class generation tests.
 *
 * The framework docs (forms/FieldTypes.md, forms/README.md, pages/FormPage.md)
 * advertise two ways to set a field's Bootstrap column width:
 *   columns: 6                          // integer — emits `col-6`
 *   columns: { xs: 12, md: 4 }          // responsive object — emits `col-12 col-md-4`
 *
 * The integer form has always worked; the object form silently stringified to
 * `col-[object Object]` (Bootstrap drops it). These tests pin both forms so the
 * documented responsive syntax stays wired up.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
  const { describe, it, expect, beforeEach } = testContext;

  await testHelpers.setup();

  // FormBuilder pulls in FormPlugins (a singleton registry) and TabView (only
  // used for tabset rendering). Stub both before loading — the test paths only
  // exercise plain field rendering.
  global.FormPlugins = {};
  global.TabView = class {};

  const FormBuilder = loadModule('FormBuilder');

  // Extract the wrapper's class attribute from buildFieldHTML's output.
  // Output shape: `<div class="..."${attrs}${style}>${fieldHTML}</div>`.
  function wrapperClass(html) {
    const match = html.match(/^<div class="([^"]*)"/);
    return match ? match[1].trim() : '';
  }

  describe('FormBuilder column class generation', () => {
    let builder;

    beforeEach(() => {
      builder = new FormBuilder({ fields: [] });
    });

    it('emits col-N for integer columns (legacy)', () => {
      const field = { type: 'text', name: 'x', label: 'X', columns: 6 };
      const html = builder.buildFieldHTML(field);
      expect(wrapperClass(html)).toBe('col-6');
    });

    it('emits col-12 col-md-4 for { xs: 12, md: 4 }', () => {
      const field = { type: 'text', name: 'city', label: 'City',
        columns: { xs: 12, md: 4 } };
      const html = builder.buildFieldHTML(field);
      expect(wrapperClass(html)).toBe('col-12 col-md-4');
    });

    it('emits col-md-6 for { md: 6 } (no xs key)', () => {
      const field = { type: 'text', name: 'a', label: 'A', columns: { md: 6 } };
      const html = builder.buildFieldHTML(field);
      expect(wrapperClass(html)).toBe('col-md-6');
    });

    it('emits all six breakpoint classes when every key is set', () => {
      const field = { type: 'text', name: 'a', label: 'A',
        columns: { xs: 12, sm: 6, md: 4, lg: 3, xl: 2, xxl: 2 } };
      const html = builder.buildFieldHTML(field);
      expect(wrapperClass(html))
        .toBe('col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 col-xxl-2');
    });

    it('falls back to col-12 for an empty object', () => {
      const field = { type: 'text', name: 'a', label: 'A', columns: {} };
      const html = builder.buildFieldHTML(field);
      expect(wrapperClass(html)).toBe('col-12');
    });

    it('preserves field.class alongside responsive classes', () => {
      const field = { type: 'text', name: 'a', label: 'A',
        columns: { xs: 12, md: 4 }, class: 'mb-3' };
      const html = builder.buildFieldHTML(field);
      expect(wrapperClass(html)).toBe('col-12 col-md-4 mb-3');
    });

    it('preserves field.class alongside integer column (legacy unchanged)', () => {
      const field = { type: 'text', name: 'a', label: 'A',
        columns: 6, class: 'mb-3' };
      const html = builder.buildFieldHTML(field);
      expect(wrapperClass(html)).toBe('col-6 mb-3');
    });
  });
};
