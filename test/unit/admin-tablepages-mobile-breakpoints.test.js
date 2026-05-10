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
// Shifted one notch up from the initial pass (md→lg, lg→xl) because the
// admin shell's persistent sidebar shaves ~250-300px off the table viewport
// at lower nav levels, so an apparent ≥768px viewport renders at ≤500px of
// usable table width. Effective rule of thumb: a `visibility: 'lg'` column
// hides whenever the *table* is narrower than ~992px.
const MOBILE_BREAKPOINTS = {
    'account/devices/UserDeviceTablePage.js': [
        ['device_info.user_agent.family', 'lg'],
    ],
    'incidents/IncidentTablePage.js': [
        ['scope', 'lg'],
        ['category', 'lg'],
        ['priority', 'xl'],
    ],
    'incidents/EventTablePage.js': [
        ['scope', 'lg'],
        ['category', 'lg'],
    ],
    'monitoring/LogTablePage.js': [
        ['method', 'lg'],
        ['path', 'lg'],
        ['username', 'lg'],
        ['ip', 'xl'],
        ['duid', 'xl'],
    ],
    'security/IPSetTablePage.js': [
        ['cidr_count', 'lg'],
        ['source', 'lg'],
    ],
    'messaging/email/EmailMailboxTablePage.js': [
        ['domain.name', 'lg'],
    ],
    'messaging/sms/PhoneNumberTablePage.js': [
        ['carrier', 'lg'],
        ['is_mobile', 'lg'],
    ],
    'security/BouncerSignalTablePage.js': [
        ['page_type', 'lg'],
        ['stage', 'lg'],
        ['risk_score', 'xl'],
        ['muid', 'xl'],
    ],
    'security/BouncerDeviceTablePage.js': [
        ['last_seen_ip', 'lg'],
    ],
    'messaging/push/PushDeliveryTablePage.js': [
        ['user.display_name', 'lg'],
    ],
    'messaging/push/PushDeviceTablePage.js': [
        ['push_enabled', 'lg'],
    ],
    'shortlinks/ShortLinkTablePage.js': [
        ['is_active', 'lg'],
        ['source', 'lg'],
        ['track_clicks', 'lg'],
        ['expires_at', 'xl'],
    ],
    'shortlinks/ShortLinkClickTablePage.js': [
        ['shortlink.url', 'lg'],
        ['is_bot', 'lg'],
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
