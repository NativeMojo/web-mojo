/**
 * TableRow Unit Tests
 *
 * TableRow lives under src/core/views/table and imports its deps via
 * @core/... aliases that Node's ESM loader can't resolve. We load it
 * through the simple-module-loader which transforms those imports,
 * same as for View/Model/Collection.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
  const { describe, it, expect } = testContext;

  await testHelpers.setup();
  const TableRow = loadModule('TableRow');

  describe('TableRow', () => {
    it('applies function formatters to duplicate-key columns independently', async () => {
      const modelData = {
        id: 42,
        device_info: {
          device: { family: 'MacBook Pro' },
          user_agent: { family: 'Chrome', major: '122' },
          os: { family: 'macOS' }
        }
      };

      const model = {
        id: modelData.id,
        get(key) { return modelData[key]; }
      };

      const row = new TableRow({
        model,
        tableView: {
          isSelectable: () => false,
          rowAction: null
        },
        columns: [
          { key: 'device_info', label: 'Device', formatter: (val) => `device:${val.device.family}` },
          { key: 'device_info', label: 'Browser', formatter: (val) => `browser:${val.user_agent.family}` },
          { key: 'device_info', label: 'OS', formatter: (val) => `os:${val.os.family}` }
        ]
      });

      await row.render(false);

      const cells = Array.from(row.element.querySelectorAll('td'));
      expect(cells).toHaveLength(3);
      expect(cells[0].textContent).toContain('device:MacBook Pro');
      expect(cells[1].textContent).toContain('browser:Chrome');
      expect(cells[2].textContent).toContain('os:macOS');

      await row.destroy();
    });
  });
};
