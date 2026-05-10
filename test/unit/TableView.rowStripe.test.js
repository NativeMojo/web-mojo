/**
 * TableView `rowStripe:` callback — severity-coded left-edge color.
 *
 * Token-mapping + custom-class logic lives in ListView and is fully
 * covered by `ListView.rowStripe.test.js`. This suite exercises the
 * inheritance path: TableRow → ListViewItem.onAfterRender →
 * ListView._applyRowStripe applied to a `<tr>` element.
 */

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const TableView = loadModule('TableView');

  function seed() {
    return new Collection([
      { id: 1, name: 'A', level: 3 },
      { id: 2, name: 'B', level: 5 }
    ]);
  }

  function bySeverity(model) {
    const level = model.get('level');
    if (level >= 5) return 'danger';
    if (level >= 4) return 'warning';
    if (level >= 3) return 'info';
    return null;
  }

  describe('TableView rowStripe', () => {
    it('applies the stripe class to the <tr> element', async () => {
      const tv = new TableView({
        collection: seed(),
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'level', label: 'Level' }
        ],
        rowStripe: bySeverity
      });
      await tv.render();
      const row1 = tv.itemViews.get(1);
      const row2 = tv.itemViews.get(2);
      expect(row1.element.tagName).toBe('TR');
      expect(row1.element.classList.contains('list-row-stripe-info')).toBe(true);
      expect(row2.element.classList.contains('list-row-stripe-danger')).toBe(true);
    });

    it('re-applies the stripe on model change without manual refresh', async () => {
      // Mount to the DOM so View's `_onModelChange → render()` path
      // (gated on `isMounted()`) fires when model.set runs.
      const host = document.createElement('div');
      document.body.appendChild(host);
      const tv = new TableView({
        collection: new Collection([{ id: 1, name: 'X', level: 3 }]),
        columns: [{ key: 'name', label: 'Name' }],
        rowStripe: bySeverity
      });
      host.appendChild(tv.element);
      await tv.render();
      const row = tv.itemViews.get(1);
      expect(row.element.classList.contains('list-row-stripe-info')).toBe(true);
      row.model.set('level', 5);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(row.element.classList.contains('list-row-stripe-info')).toBe(false);
      expect(row.element.classList.contains('list-row-stripe-danger')).toBe(true);
      document.body.removeChild(host);
    });

    it('applies no stripe class when the callback returns null', async () => {
      const tv = new TableView({
        collection: new Collection([{ id: 1, name: 'X', level: 0 }]),
        columns: [{ key: 'name', label: 'Name' }],
        rowStripe: () => null
      });
      await tv.render();
      const row = tv.itemViews.get(1);
      const stripes = Array.from(row.element.classList).filter(c => c.startsWith('list-row-stripe'));
      expect(stripes).toEqual([]);
    });

    it('applies a custom (non-token) class name verbatim', async () => {
      const tv = new TableView({
        collection: new Collection([{ id: 1, name: 'X' }]),
        columns: [{ key: 'name', label: 'Name' }],
        rowStripe: () => 'my-custom-stripe'
      });
      await tv.render();
      const row = tv.itemViews.get(1);
      expect(row.element.classList.contains('my-custom-stripe')).toBe(true);
    });

    it('refreshStripes() re-evaluates on external state', async () => {
      let threshold = 5;
      const tv = new TableView({
        collection: new Collection([{ id: 1, name: 'X', level: 4 }]),
        columns: [{ key: 'name', label: 'Name' }],
        rowStripe: (m) => (m.get('level') >= threshold ? 'danger' : null)
      });
      await tv.render();
      const row = tv.itemViews.get(1);
      expect(row.element.classList.contains('list-row-stripe-danger')).toBe(false);
      threshold = 4;
      tv.refreshStripes();
      expect(row.element.classList.contains('list-row-stripe-danger')).toBe(true);
    });
  });
};
