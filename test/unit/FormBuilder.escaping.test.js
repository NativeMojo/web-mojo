/**
 * FormBuilder label-escaping regression.
 *
 * switch/checkbox labels (and help/tooltip/error) are rendered through
 * Mustache `{{…}}`, which HTML-escapes. The render methods used to ALSO
 * pre-escape with `escapeHtml()`, so a label like "Verification & Compliance"
 * double-escaped to "Verification &amp;amp; Compliance" (the browser then
 * showed the literal "&amp;"). These pin single-escaping.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
  const { describe, it, expect, beforeEach } = testContext;

  await testHelpers.setup();

  global.FormPlugins = {};
  global.TabView = class {};

  const FormBuilder = loadModule('FormBuilder');

  describe('FormBuilder label escaping (no double-escape)', () => {
    let builder;
    beforeEach(() => { builder = new FormBuilder({ fields: [] }); });

    it('switch label with "&" is escaped exactly once', () => {
      const html = builder.renderSwitchField({ name: 'verify', type: 'switch', label: 'Verification & Compliance' });
      expect(html).toContain('Verification &amp; Compliance');
      expect(html).not.toContain('&amp;amp;');
    });

    it('checkbox label with "&" is escaped exactly once', () => {
      const html = builder.renderCheckboxField({ name: 'wallet', type: 'checkbox', label: 'Wallet & Billing' });
      expect(html).toContain('Wallet &amp; Billing');
      expect(html).not.toContain('&amp;amp;');
    });

    it('switch tooltip with "&" / "<" is escaped exactly once', () => {
      const html = builder.renderSwitchField({ name: 'x', type: 'switch', label: 'X', tooltip: 'Q&A <tag>' });
      expect(html).toContain('Q&amp;A &lt;tag&gt;');
      expect(html).not.toContain('&amp;amp;');
    });

    it('text input label / placeholder with "&" are escaped exactly once', () => {
      const html = builder.renderTextField({ name: 'x', type: 'text', label: 'R&D notes', placeholder: 'e.g. A & B' });
      expect(html).toContain('R&amp;D notes');
      expect(html).toContain('placeholder="e.g. A &amp; B"');
      expect(html).not.toContain('&amp;amp;');
    });

    it('text input value with "&" is escaped exactly once (not double)', () => {
      const html = builder.renderTextField({ name: 'x', type: 'text', label: 'X', value: 'Tom & Jerry' });
      expect(html).toContain('value="Tom &amp; Jerry"');
      expect(html).not.toContain('&amp;amp;');
    });

    it('select field label with "&" is escaped exactly once', () => {
      const html = builder.renderSelectField({
        name: 's', type: 'select', label: 'Risk & Compliance',
        options: [{ value: 'a', label: 'A & B' }]
      });
      expect(html).toContain('Risk &amp; Compliance');
      expect(html).not.toContain('&amp;amp;');
    });
  });
};
