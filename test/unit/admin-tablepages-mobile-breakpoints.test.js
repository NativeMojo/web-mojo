/**
 * Admin TablePages — mobile-breakpoint regression tests.
 *
 * Source-level assertions that lock the phone-first `visibility:` tags
 * added by the admin-tablepages-mobile-breakpoint-pass. The pass strengthens
 * column breakpoints across 13 admin TablePage files so each table renders
 * at most three real data columns on a 375px-wide phone (primary identifier
 * + state + timestamp). Everything else hides at `md` (≤768px) or `lg`
 * (≤992px).
 *
 * Pattern mirrors `admin-tablepages-bugfixes.test.js`: read source via
 * `fs.readFileSync`, regex-match the column object literal, no module
 * instantiation (admin-extension models aren't registered with the
 * simple-module-loader).
 *
 * The `expectVisibility` helper finds `key: '<key>'` and looks forward for
 * `visibility: '<breakpoint>'` before the next `key:` declaration, so it
 * works regardless of nested `{}` inside `filter:` / `formatter:` / template
 * literals.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ADMIN = path.join(ROOT, 'src/extensions/admin');

function read(relPath) {
    return fs.readFileSync(path.join(ADMIN, relPath), 'utf8');
}

function hasVisibility(src, key, breakpoint) {
    const escKey = key.replace(/[.\\]/g, '\\$&');
    const re = new RegExp(
        `key:\\s*['"]${escKey}['"](?:(?!key:\\s*['"]).)*?visibility:\\s*['"]${breakpoint}['"]`,
        's'
    );
    return re.test(src);
}

// Matrix: { file: [ [key, breakpoint], ... ] }
const MOBILE_BREAKPOINTS = {
    'account/devices/UserDeviceTablePage.js': [
        ['device_info.user_agent.family', 'md'],
    ],
    'incidents/IncidentTablePage.js': [
        ['scope', 'md'],
        ['category', 'md'],
        ['priority', 'lg'],
    ],
    'incidents/EventTablePage.js': [
        ['scope', 'md'],
        ['category', 'md'],
    ],
    'monitoring/LogTablePage.js': [
        ['method', 'md'],
        ['path', 'md'],
        ['username', 'md'],
        ['ip', 'lg'],
        ['duid', 'lg'],
    ],
    'security/IPSetTablePage.js': [
        ['cidr_count', 'md'],
        ['source', 'md'],
    ],
    'messaging/email/EmailMailboxTablePage.js': [
        ['domain.name', 'md'],
    ],
    'messaging/sms/PhoneNumberTablePage.js': [
        ['carrier', 'md'],
        ['is_mobile', 'md'],
    ],
    'security/BouncerSignalTablePage.js': [
        ['page_type', 'md'],
        ['stage', 'md'],
        ['risk_score', 'lg'],
        ['muid', 'lg'],
    ],
    'security/BouncerDeviceTablePage.js': [
        ['last_seen_ip', 'md'],
    ],
    'messaging/push/PushDeliveryTablePage.js': [
        ['user.display_name', 'md'],
    ],
    'messaging/push/PushDeviceTablePage.js': [
        ['push_enabled', 'md'],
    ],
    'shortlinks/ShortLinkTablePage.js': [
        ['is_active', 'md'],
        ['source', 'md'],
        ['track_clicks', 'md'],
        ['expires_at', 'lg'],
    ],
    'shortlinks/ShortLinkClickTablePage.js': [
        ['shortlink.url', 'md'],
        ['is_bot', 'md'],
    ],
};

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    Object.entries(MOBILE_BREAKPOINTS).forEach(([rel, entries]) => {
        describe(rel, () => {
            const src = read(rel);
            entries.forEach(([key, breakpoint]) => {
                it(`column \`${key}\` is hidden below \`${breakpoint}\``, () => {
                    expect(hasVisibility(src, key, breakpoint)).toBe(true);
                });
            });
        });
    });
};
