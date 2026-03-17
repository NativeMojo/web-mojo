import TableRow from '../../src/core/views/table/TableRow.js';

describe('TableRow', () => {
  test('applies function formatters to duplicate-key columns independently', async () => {
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
      get(key) {
        return modelData[key];
      }
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
