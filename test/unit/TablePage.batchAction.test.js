/**
 * TablePage.batchAction unit tests.
 *
 * Covers the helper that collapses the confirm → save/destroy → toast →
 * refresh pattern used by every admin batch handler. Strategy: don't
 * instantiate TablePage (its constructor pulls in routing + collection
 * machinery the test doesn't need). Instead, call the prototype method
 * with a stub `this` that owns a mock tableView and a mock getApp().
 *
 * Modal.confirm is spied on by replacing the static method on the loaded
 * Modal singleton — same shape as test/unit/Modal.alert.test.js.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule, moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;

  await testHelpers.setup();
  const jest = global.jest;

  // Force a fresh Modal load so prior tests' spies are discarded.
  moduleLoader.loadedModules.delete('Modal');
  delete global.Modal;
  const Modal = loadModule('Modal');
  const TablePage = loadModule('TablePage');

  let confirmSpy;
  let toastSpies;

  // Build a fresh stub `this` for each test — its only requirements are
  // `tableView` (with the three methods batchAction touches) and
  // `getApp()` (used to find the toast service).
  function makeStub({ items = [] } = {}) {
    const tableView = {
      getSelectedItems: jest.fn(() => items),
      clearSelection: jest.fn(),
      refresh: jest.fn(() => Promise.resolve())
    };
    const app = {
      toast: {
        success: jest.fn(),
        warning: jest.fn(),
        error: jest.fn()
      }
    };
    const stub = {
      tableView,
      getApp: () => app
    };
    return { stub, tableView, app };
  }

  // Build a model stub with save() and destroy() that resolve unless
  // `reject` is set, in which case they reject with the given error.
  function makeModelItem({ saveReject = null, destroyReject = null } = {}) {
    return {
      model: {
        save: jest.fn(() =>
          saveReject ? Promise.reject(saveReject) : Promise.resolve({ data: { status: 'OK' } })
        ),
        destroy: jest.fn(() =>
          destroyReject ? Promise.reject(destroyReject) : Promise.resolve({ data: { status: 'OK' } })
        )
      }
    };
  }

  beforeEach(() => {
    confirmSpy = jest.fn(() => Promise.resolve(true));
    Modal.confirm = confirmSpy;
    toastSpies = null;
  });

  afterEach(() => {
    confirmSpy?.mockClear();
  });

  describe('TablePage.batchAction — empty selection', () => {
    it('returns 0 and does not open Modal.confirm', async () => {
      const { stub, tableView } = makeStub({ items: [] });

      const count = await TablePage.prototype.batchAction.call(stub, {
        field: 'status',
        value: 'resolved',
        label: 'Resolve'
      });

      expect(count).toBe(0);
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(tableView.clearSelection).not.toHaveBeenCalled();
      expect(tableView.refresh).not.toHaveBeenCalled();
    });
  });

  describe('TablePage.batchAction — confirm cancel', () => {
    it('returns 0 and does not save when user cancels', async () => {
      confirmSpy = jest.fn(() => Promise.resolve(false));
      Modal.confirm = confirmSpy;

      const items = [makeModelItem(), makeModelItem()];
      const { stub, tableView } = makeStub({ items });

      const count = await TablePage.prototype.batchAction.call(stub, {
        field: 'status',
        value: 'resolved',
        label: 'Resolve'
      });

      expect(count).toBe(0);
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(items[0].model.save).not.toHaveBeenCalled();
      expect(tableView.refresh).not.toHaveBeenCalled();
    });
  });

  describe('TablePage.batchAction — save mode', () => {
    it('calls model.save({ [field]: value }) per item and refreshes once', async () => {
      const items = [makeModelItem(), makeModelItem(), makeModelItem()];
      const { stub, tableView, app } = makeStub({ items });

      const count = await TablePage.prototype.batchAction.call(stub, {
        field: 'status',
        value: 'resolved',
        label: 'Resolve'
      });

      expect(count).toBe(3);
      expect(items[0].model.save).toHaveBeenCalledWith({ status: 'resolved' });
      expect(items[1].model.save).toHaveBeenCalledWith({ status: 'resolved' });
      expect(items[2].model.save).toHaveBeenCalledWith({ status: 'resolved' });
      expect(tableView.clearSelection).toHaveBeenCalledTimes(1);
      expect(tableView.refresh).toHaveBeenCalledTimes(1);
      expect(app.toast.success).toHaveBeenCalledTimes(1);
      expect(app.toast.warning).not.toHaveBeenCalled();
      expect(app.toast.error).not.toHaveBeenCalled();
    });
  });

  describe('TablePage.batchAction — destroy mode', () => {
    it('calls model.destroy() per item, never save()', async () => {
      const items = [makeModelItem(), makeModelItem()];
      const { stub, tableView, app } = makeStub({ items });

      const count = await TablePage.prototype.batchAction.call(stub, {
        destroy: true,
        label: 'Delete'
      });

      expect(count).toBe(2);
      expect(items[0].model.destroy).toHaveBeenCalledTimes(1);
      expect(items[1].model.destroy).toHaveBeenCalledTimes(1);
      expect(items[0].model.save).not.toHaveBeenCalled();
      expect(items[1].model.save).not.toHaveBeenCalled();
      expect(tableView.refresh).toHaveBeenCalledTimes(1);
      expect(app.toast.success).toHaveBeenCalledTimes(1);
    });
  });

  describe('TablePage.batchAction — handler mode', () => {
    it('calls the custom handler(model) per item', async () => {
      const items = [makeModelItem(), makeModelItem(), makeModelItem()];
      const handler = jest.fn(() => Promise.resolve('done'));
      const { stub, tableView, app } = makeStub({ items });

      const count = await TablePage.prototype.batchAction.call(stub, {
        handler,
        label: 'Custom'
      });

      expect(count).toBe(3);
      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenCalledWith(items[0].model);
      expect(handler).toHaveBeenCalledWith(items[1].model);
      expect(handler).toHaveBeenCalledWith(items[2].model);
      expect(items[0].model.save).not.toHaveBeenCalled();
      expect(items[0].model.destroy).not.toHaveBeenCalled();
      expect(tableView.refresh).toHaveBeenCalledTimes(1);
      expect(app.toast.success).toHaveBeenCalledTimes(1);
    });
  });

  describe('TablePage.batchAction — partial failure', () => {
    it('returns the success count and warns when some items fail', async () => {
      const items = [
        makeModelItem(),
        makeModelItem({ saveReject: new Error('boom') }),
        makeModelItem()
      ];
      const { stub, tableView, app } = makeStub({ items });

      const count = await TablePage.prototype.batchAction.call(stub, {
        field: 'status',
        value: 'resolved',
        label: 'Resolve'
      });

      expect(count).toBe(2);
      // refresh still runs so the table reflects the partial state.
      expect(tableView.refresh).toHaveBeenCalledTimes(1);
      expect(app.toast.warning).toHaveBeenCalledTimes(1);
      expect(app.toast.success).not.toHaveBeenCalled();
      expect(app.toast.error).not.toHaveBeenCalled();
    });

    it('errors out when every item fails', async () => {
      const items = [
        makeModelItem({ saveReject: new Error('boom') }),
        makeModelItem({ saveReject: new Error('boom') })
      ];
      const { stub, tableView, app } = makeStub({ items });

      const count = await TablePage.prototype.batchAction.call(stub, {
        field: 'status',
        value: 'resolved',
        label: 'Resolve'
      });

      expect(count).toBe(0);
      expect(tableView.refresh).toHaveBeenCalledTimes(1);
      expect(app.toast.error).toHaveBeenCalledTimes(1);
      expect(app.toast.success).not.toHaveBeenCalled();
      expect(app.toast.warning).not.toHaveBeenCalled();
    });
  });

  describe('TablePage.batchAction — confirm: false', () => {
    it('skips Modal.confirm and proceeds directly', async () => {
      const items = [makeModelItem()];
      const { stub, tableView } = makeStub({ items });

      const count = await TablePage.prototype.batchAction.call(stub, {
        field: 'status',
        value: 'resolved',
        label: 'Resolve',
        confirm: false
      });

      expect(count).toBe(1);
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(items[0].model.save).toHaveBeenCalledTimes(1);
      expect(tableView.refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('TablePage.batchAction — custom message', () => {
    it('uses the supplied message instead of the default', async () => {
      const items = [makeModelItem(), makeModelItem()];
      const { stub } = makeStub({ items });

      await TablePage.prototype.batchAction.call(stub, {
        field: 'status',
        value: 'resolved',
        label: 'Resolve',
        message: 'Really resolve these incidents?'
      });

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledWith('Really resolve these incidents?');
    });
  });
};
