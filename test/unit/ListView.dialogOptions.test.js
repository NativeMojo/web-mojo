/**
 * ListView — view-dialog sizing via `ViewClass.DIALOG_OPTIONS`.
 *
 * A detail View can declare a static `DIALOG_OPTIONS` to control how its
 * row-view modal is presented (size, centered, scrollable, …). ListView's
 * `_onRowView()` spreads it onto `Modal.dialog()` so the size lives with
 * the View instead of being repeated in every page's `viewDialogOptions`.
 *
 * Precedence (later wins):
 *   defaults (size: 'lg') → Model.FORM_DIALOG_CONFIG
 *     → ViewClass.DIALOG_OPTIONS → page/instance viewDialogOptions
 *
 * Strategy: spy on the shared `Modal` class's static `dialog` method
 * (ListView holds a reference to that same class object), then drive
 * `_onRowView()` directly and inspect the merged options object.
 *
 * `TablePage.showItemDialog()` uses the identical spread — exercising
 * the ListView path here locks the merge semantics for both.
 */

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const ListView = loadModule('ListView');
  // Same cached Modal class object that ListView captured at load time.
  const Modal = loadModule('Modal');

  // A minimal stand-in for a detail View — `_onRowView` only `new`s it and
  // hands the instance to Modal.dialog as `body`, which is mocked away.
  function makeViewClass(dialogOptions) {
    const ViewClass = class {
      constructor(options = {}) { this.options = options; }
    };
    if (dialogOptions !== undefined) ViewClass.DIALOG_OPTIONS = dialogOptions;
    return ViewClass;
  }

  function makeListView(options = {}) {
    const collection = new Collection([{ id: 1, name: 'A' }]);
    const listView = new ListView({
      collection,
      itemTemplate: '<div>{{model.name}}</div>',
      fetchOnView: false, // skip the pre-open model.fetch() network call
      ...options
    });
    return { listView, model: collection.models[0] };
  }

  describe('ListView view dialog — ViewClass.DIALOG_OPTIONS', () => {
    let dialogSpy;

    beforeEach(() => {
      dialogSpy = jest.spyOn(Modal, 'dialog');
      dialogSpy.mockResolvedValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('spreads ViewClass.DIALOG_OPTIONS onto the view dialog', async () => {
      const { listView, model } = makeListView({
        itemView: makeViewClass({ size: 'fullscreen' })
      });

      await listView._onRowView({ model, event: {} });

      expect(dialogSpy).toHaveBeenCalledTimes(1);
      expect(dialogSpy.mock.calls[0][0].size).toBe('fullscreen');
    });

    it('a View with no DIALOG_OPTIONS keeps the default size "lg"', async () => {
      const { listView, model } = makeListView({
        itemView: makeViewClass(undefined)
      });

      await listView._onRowView({ model, event: {} });

      expect(dialogSpy.mock.calls[0][0].size).toBe('lg');
    });

    it('page-level viewDialogOptions overrides ViewClass.DIALOG_OPTIONS', async () => {
      const { listView, model } = makeListView({
        itemView: makeViewClass({ size: 'xl' }),
        viewDialogOptions: { size: 'fullscreen' }
      });

      await listView._onRowView({ model, event: {} });

      expect(dialogSpy.mock.calls[0][0].size).toBe('fullscreen');
    });

    it('DIALOG_OPTIONS forwards non-size keys too (centered, scrollable)', async () => {
      const { listView, model } = makeListView({
        itemView: makeViewClass({ size: 'xl', centered: true, scrollable: true })
      });

      await listView._onRowView({ model, event: {} });

      const opts = dialogSpy.mock.calls[0][0];
      expect(opts.size).toBe('xl');
      expect(opts.centered).toBe(true);
      expect(opts.scrollable).toBe(true);
    });
  });
};
