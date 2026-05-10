/**
 * Admin TablePages — silent-bug regression tests.
 *
 * These tests fail before the bug-fix commit (commit 2 of the
 * admin-tablepages-ux-sweep request) and pass after. Each one is a
 * source-level assertion against an admin TablePage file. We don't
 * instantiate the pages because the admin-extension models aren't
 * registered with the simple-module-loader; the source-text checks
 * are the cheapest way to lock in the cleanup and catch any
 * accidental regressions.
 *
 * Bugs covered:
 *   1. `tableOptions: { actions: [...] }` — wrong slot, silently dropped
 *      by TableView. Affected: 4 push pages + MetricsPermissions.
 *   2. `format: 'boolean'` typo (correct prop is `formatter:`). Affected:
 *      PushConfig + PushTemplate.
 *   3. `MetricsPermissionsTablePage`: `showAdd: true` with no formCreate /
 *      Model.ADD_FORM → click Add → throw. Fix: `showAdd: false`.
 *   4. `LogTablePage`: declared 4 batch actions with no handlers. Fix:
 *      drop the `batchActions` block entirely (logs are immutable).
 *   5. `EventTablePage`, `SentMessageTablePage`: `selectable: true` with
 *      no batch handlers — checkboxes did nothing. Immutable feeds get
 *      no selection at all.
 *   6. `PhoneNumberTablePage`, `GeoLocatedIPTablePage`: reach into
 *      `tableView._onRowView()` (private). Fix: use public
 *      `this.showItemDialog(model)`.
 *   7. Naming: standardize on `itemViewClass:`. Affected:
 *      PhoneNumberTablePage, SMSTablePage, GeoLocatedIPTablePage.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ADMIN = path.join(ROOT, 'src/extensions/admin');

function read(relPath) {
  return fs.readFileSync(path.join(ADMIN, relPath), 'utf8');
}

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;

  describe('Bug #1: tableOptions.actions silently dropped', () => {
    const offenders = [
      'messaging/push/PushDeliveryTablePage.js',
      'messaging/push/PushDeviceTablePage.js',
      'messaging/push/PushTemplateTablePage.js',
      'messaging/push/PushConfigTablePage.js',
      'monitoring/MetricsPermissionsTablePage.js'
    ];

    offenders.forEach((rel) => {
      it(`${rel} — does not place \`actions:\` inside \`tableOptions\``, () => {
        const src = read(rel);
        // Look for tableOptions: { ... actions: ... } across multiple lines.
        const tableOptionsBlock = /tableOptions\s*:\s*\{[^}]*actions\s*:/s;
        expect(tableOptionsBlock.test(src)).toBe(false);
      });
    });
  });

  describe('Bug #2: `format:` typo (should be `formatter:`)', () => {
    const offenders = [
      'messaging/push/PushConfigTablePage.js',
      'messaging/push/PushTemplateTablePage.js',
      'messaging/push/PushDeviceTablePage.js'
    ];

    offenders.forEach((rel) => {
      it(`${rel} — uses \`formatter:\` not \`format:\``, () => {
        const src = read(rel);
        // Catch `format: 'whatever'` standalone (not formatter:).
        // The negative lookbehind ensures we don't match `formatter:`.
        const typo = /(?<!format)\bformat\s*:\s*['"]/;
        expect(typo.test(src)).toBe(false);
      });
    });
  });

  describe('Bug #3: MetricsPermissionsTablePage Add button stabilized', () => {
    it('sets `showAdd: false` (no formCreate / Model.ADD_FORM is wired)', () => {
      const src = read('monitoring/MetricsPermissionsTablePage.js');
      expect(/showAdd\s*:\s*false/.test(src)).toBe(true);
      expect(/showAdd\s*:\s*true/.test(src)).toBe(false);
    });
  });

  describe('Bug #4: LogTablePage broken batchActions removed', () => {
    it('LogTablePage has no `batchActions:` block', () => {
      const src = read('monitoring/LogTablePage.js');
      expect(/batchActions\s*:/.test(src)).toBe(false);
    });

    it('LogTablePage has no `selectable: true`', () => {
      const src = read('monitoring/LogTablePage.js');
      expect(/selectable\s*:\s*true/.test(src)).toBe(false);
    });
  });

  describe('Bug #5: immutable audit feeds do not enable `selectable`', () => {
    const immutableFeeds = [
      'monitoring/LogTablePage.js',
      'incidents/EventTablePage.js',
      'messaging/email/SentMessageTablePage.js'
    ];

    immutableFeeds.forEach((rel) => {
      it(`${rel} — does not declare \`selectable: true\``, () => {
        const src = read(rel);
        expect(/selectable\s*:\s*true/.test(src)).toBe(false);
      });

      it(`${rel} — does not declare \`batchActions:\``, () => {
        const src = read(rel);
        expect(/batchActions\s*:/.test(src)).toBe(false);
      });
    });
  });

  describe('Bug #6: private `_onRowView` API not used', () => {
    const offenders = [
      'messaging/sms/PhoneNumberTablePage.js',
      'account/devices/GeoLocatedIPTablePage.js'
    ];

    offenders.forEach((rel) => {
      it(`${rel} — does not call private \`tableView._onRowView()\``, () => {
        const src = read(rel);
        expect(/tableView\._onRowView/.test(src)).toBe(false);
      });

      it(`${rel} — uses public \`showItemDialog\` for post-lookup display`, () => {
        const src = read(rel);
        expect(/showItemDialog\(/.test(src)).toBe(true);
      });
    });
  });

  describe('Bug #7: legacy `itemView:` config alias', () => {
    // After commit 3, several admin pages drop `itemViewClass:` entirely
    // because Model.VIEW_CLASS now provides the dialog. The standing rule
    // is just: never use the legacy `itemView:` (without `Class`) form.
    const offenders = [
      'messaging/sms/PhoneNumberTablePage.js',
      'messaging/sms/SMSTablePage.js',
      'account/devices/GeoLocatedIPTablePage.js'
    ];

    offenders.forEach((rel) => {
      it(`${rel} — does not use the legacy \`itemView:\` constructor key`, () => {
        const src = read(rel);
        // Match the bare config-key shape: `itemView:` immediately after
        // whitespace at the start of a line, NOT followed by `Class`.
        const legacy = /^\s*itemView\s*:(?!\s*\w*Class)/m;
        expect(legacy.test(src)).toBe(false);
      });
    });
  });
};
