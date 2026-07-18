/**
 * TableView `rowExpand:` — expandable inline detail rows (WM-036).
 *
 * Exercises the chevron toggle cell (TableRow) + the detail-row machinery
 * (TableView): render gating, expand/collapse, single vs multiple mode,
 * colspan math, string vs View payloads, survival across a pure re-render,
 * collapse on page change, and the opt-out (no `rowExpand`) no-markup-delta
 * guarantee.
 *
 * Follows the TableView.rowStripe.test.js pattern: a preloaded (non-REST)
 * Collection renders synchronously and item views are reachable via
 * `tv.itemViews.get(id)`.
 */

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const View = loadModule('View');
  const TableView = loadModule('TableView');

  const COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'level', label: 'Level' }
  ];

  function seed() {
    return new Collection([
      { id: 1, name: 'Alpha', level: 3 },
      { id: 2, name: 'Beta', level: 5 },
      { id: 3, name: 'Gamma', level: 1 }
    ]);
  }

  // Simulate a chevron click by invoking the row's action handler with a
  // stopPropagation-capable event (matches the real EventDelegate dispatch).
  async function clickChevron(tv, id) {
    const row = tv.itemViews.get(id);
    let stopped = false;
    await row.onActionToggleExpand({ stopPropagation: () => { stopped = true; } }, null);
    return stopped;
  }

  function detailRow(tv, id) {
    return tv.element.querySelector(`tr.mojo-detail-row[data-detail-for="${id}"]`);
  }

  describe('TableView rowExpand', () => {
    it('renders a chevron toggle cell per row + header only when rowExpand is set', async () => {
      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        rowExpand: (m) => `<b>${m.get('name')}</b>`
      });
      await tv.render();

      // Header gains a leading empty expand column.
      const headerCells = tv.element.querySelectorAll('thead th');
      expect(headerCells.length).toBe(COLUMNS.length + 1);
      expect(headerCells[0].classList.contains('col-expand')).toBe(true);

      // Every data row has a chevron toggle as its first cell.
      [1, 2, 3].forEach((id) => {
        const row = tv.itemViews.get(id);
        const firstCell = row.element.querySelector('td');
        expect(firstCell.classList.contains('col-expand')).toBe(true);
        expect(row.element.querySelector('.mojo-expand-toggle')).toBeTruthy();
      });
    });

    it('omitted rowExpand → no chevron column and no markup delta', async () => {
      const tv = new TableView({ collection: seed(), columns: COLUMNS });
      await tv.render();

      const headerCells = tv.element.querySelectorAll('thead th');
      expect(headerCells.length).toBe(COLUMNS.length);
      expect(tv.element.querySelector('.col-expand')).toBeNull();
      expect(tv.element.querySelector('.mojo-expand-toggle')).toBeNull();

      const row = tv.itemViews.get(1);
      expect(row.element.querySelectorAll('td').length).toBe(COLUMNS.length);
      expect(tv.isRowExpandEnabled()).toBe(false);
    });

    it('toggle expands then collapses the detail row', async () => {
      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        rowExpand: (m) => `<span class="qk">quick ${m.get('name')}</span>`
      });
      await tv.render();

      expect(detailRow(tv, 1)).toBeNull();

      const stopped = await clickChevron(tv, 1);
      expect(stopped).toBe(true); // handler stops propagation
      const dr = detailRow(tv, 1);
      expect(dr).toBeTruthy();
      expect(dr.querySelector('.mojo-detail-panel .qk').textContent).toBe('quick Alpha');
      expect(tv.itemViews.get(1).element.classList.contains('expanded')).toBe(true);
      expect(tv.expandedRows.has(1)).toBe(true);

      await clickChevron(tv, 1);
      expect(detailRow(tv, 1)).toBeNull();
      expect(tv.itemViews.get(1).element.classList.contains('expanded')).toBe(false);
      expect(tv.expandedRows.has(1)).toBe(false);
    });

    it('single-open by default: opening a second row closes the first', async () => {
      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        rowExpand: (m) => `row ${m.get('name')}`
      });
      await tv.render();

      await clickChevron(tv, 1);
      await clickChevron(tv, 2);

      expect(tv.expandedRows.has(1)).toBe(false);
      expect(tv.expandedRows.has(2)).toBe(true);
      expect(tv.expandedRows.size).toBe(1);
      expect(detailRow(tv, 1)).toBeNull();
      expect(detailRow(tv, 2)).toBeTruthy();
    });

    it('rowExpandMultiple: true keeps several rows open', async () => {
      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        rowExpandMultiple: true,
        rowExpand: (m) => `row ${m.get('name')}`
      });
      await tv.render();

      await clickChevron(tv, 1);
      await clickChevron(tv, 2);

      expect(tv.expandedRows.size).toBe(2);
      expect(detailRow(tv, 1)).toBeTruthy();
      expect(detailRow(tv, 2)).toBeTruthy();
    });

    it('colspan spans data + chevron columns (no selection)', async () => {
      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        rowExpand: (m) => `x ${m.get('name')}`
      });
      await tv.render();
      await clickChevron(tv, 1);

      const td = detailRow(tv, 1).querySelector('td');
      // chevron (1) + data columns (2) = 3
      expect(td.getAttribute('colspan')).toBe(String(COLUMNS.length + 1));
    });

    it('colspan adds one for the selection column when selectable', async () => {
      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        selectable: true,
        batchActions: [{ action: 'archive', label: 'Archive', icon: 'bi bi-archive' }],
        rowExpand: (m) => `x ${m.get('name')}`
      });
      await tv.render();
      expect(tv.isSelectable()).toBe(true);
      await clickChevron(tv, 1);

      const td = detailRow(tv, 1).querySelector('td');
      // chevron (1) + selection (1) + data columns (2) = 4
      expect(td.getAttribute('colspan')).toBe(String(COLUMNS.length + 2));
    });

    it('renders a View payload via addChild + explicit render', async () => {
      class DetailView extends View {
        constructor(options = {}) {
          super({ template: '<div class="detail-child">detail for {{model.name}}</div>', ...options });
        }
      }

      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        rowExpand: (m) => new DetailView({ model: m })
      });
      await tv.render();

      await clickChevron(tv, 2);
      const dr = detailRow(tv, 2);
      expect(dr).toBeTruthy();
      const child = dr.querySelector('.mojo-detail-panel .detail-child');
      expect(child).toBeTruthy();
      expect(child.textContent).toContain('detail for Beta');
      // A View payload is tracked so it can be torn down on collapse.
      expect(tv.expandChildViews.has(2)).toBe(true);

      await clickChevron(tv, 2);
      expect(detailRow(tv, 2)).toBeNull();
      expect(tv.expandChildViews.has(2)).toBe(false);
    });

    it('expanded state survives a pure re-render', async () => {
      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        rowExpand: (m) => `<i class="persisted">keep ${m.get('name')}</i>`
      });
      await tv.render();
      await clickChevron(tv, 1);
      expect(detailRow(tv, 1)).toBeTruthy();

      // A re-render (e.g. from an unrelated state change) wipes innerHTML;
      // the detail row must be re-materialized from `expandedRows` state.
      await tv.render();

      expect(tv.expandedRows.has(1)).toBe(true);
      expect(detailRow(tv, 1)).toBeTruthy();
      expect(detailRow(tv, 1).querySelector('.persisted').textContent).toBe('keep Alpha');
      expect(tv.itemViews.get(1).element.classList.contains('expanded')).toBe(true);
    });

    it('page change collapses all expanded rows', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const tv = new TableView({
        collection: seed(),
        columns: COLUMNS,
        rowExpand: (m) => `page ${m.get('name')}`
      });
      host.appendChild(tv.element);
      await tv.render();

      await clickChevron(tv, 1);
      expect(tv.expandedRows.has(1)).toBe(true);

      // Simulate advancing to a new page: the collection resets to a fresh
      // set of models (different ids), rebuilding the item views.
      tv.collection.reset([
        { id: 10, name: 'Delta', level: 2 },
        { id: 11, name: 'Epsilon', level: 4 }
      ]);
      // Let the reset-driven render settle.
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(tv.expandedRows.size).toBe(0);
      expect(tv.element.querySelector('tr.mojo-detail-row')).toBeNull();

      document.body.removeChild(host);
    });
  });
};
