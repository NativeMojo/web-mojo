/**
 * WebhookSubscriptionTablePage — Unit Tests (source-shape pinning)
 *
 * The full TablePage harness needs an app/router context that the
 * lightweight test runner can't synthesize without significant
 * stubbing. So we pin the page's *shape* via source-text regex
 * assertions — the same approach used by `admin-model-statics.test.js`.
 *
 * What we lock in:
 *   - page name / pageName / router string match the admin nav wiring
 *   - Collection class is wired (WebhookSubscriptionList)
 *   - itemViewClass is wired (WebhookSubscriptionView)
 *   - column keys appear in the documented order
 *   - the standalone Add flow calls `WebhookSubscriptionForms.normalizePayload`
 *     before `model.save(...)` — this is the events string→array transform
 *     that the per-group GroupView flow ALSO relies on; if it goes missing
 *     here, the standalone surface silently posts a comma-string and the
 *     server stores garbage
 *   - the model statics `ADD_FORM` / `EDIT_FORM` are registered
 *   - `WebhookSubscription.VIEW_CLASS = WebhookSubscriptionView` is set
 *     by the View file (so TableView.clickAction: 'view' resolves)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function read(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    const TABLE_PAGE = read('src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionTablePage.js');
    const VIEW       = read('src/extensions/admin/account/webhook_subscriptions/WebhookSubscriptionView.js');
    const ADMIN_JS   = read('src/admin.js');
    const GROUP_VIEW = read('src/extensions/admin/account/groups/GroupView.js');

    describe('WebhookSubscriptionTablePage source shape', () => {
        it('declares the expected admin page identity', () => {
            expect(/name:\s*'admin_webhook_subscriptions'/.test(TABLE_PAGE)).toBe(true);
            expect(/pageName:\s*'Webhook Subscriptions'/.test(TABLE_PAGE)).toBe(true);
            expect(/router:\s*'admin\/webhook-subscriptions'/.test(TABLE_PAGE)).toBe(true);
        });

        it('wires WebhookSubscriptionList as the Collection', () => {
            expect(/Collection:\s*WebhookSubscriptionList/.test(TABLE_PAGE)).toBe(true);
        });

        it('wires WebhookSubscriptionView as the itemViewClass', () => {
            expect(/itemViewClass:\s*WebhookSubscriptionView/.test(TABLE_PAGE)).toBe(true);
        });

        it('registers ADD_FORM and EDIT_FORM on the model', () => {
            expect(/WebhookSubscription\.ADD_FORM\s*=\s*WebhookSubscriptionForms\.create/.test(TABLE_PAGE)).toBe(true);
            expect(/WebhookSubscription\.EDIT_FORM\s*=\s*WebhookSubscriptionForms\.edit/.test(TABLE_PAGE)).toBe(true);
        });

        it('declares columns in the documented order', () => {
            const colsBlock = TABLE_PAGE.match(/columns:\s*\[[\s\S]*?\]/)?.[0] || '';
            const keys = [...colsBlock.matchAll(/key:\s*'([^']+)'/g)].map(m => m[1]);
            expect(keys).toEqual([
                'id', 'url', 'events', 'group.name', 'is_active', 'created'
            ]);
        });

        it('renders events as badges (array values map through the badge formatter)', () => {
            // The TableRow formatter pipe `events|badge` matches whatever
            // shape the column uses — we just need a badge-style renderer
            // on the events column.
            const colsBlock = TABLE_PAGE.match(/columns:\s*\[[\s\S]*?\]/)?.[0] || '';
            expect(/key:\s*'events'[\s\S]*?formatter:\s*'badge'/.test(colsBlock)).toBe(true);
        });

        it('overrides onActionAdd to normalize the events payload before save', () => {
            // We can't reliably regex out the whole method body (brace
            // nesting isn't regular). Instead, locate the method start
            // and check that within the next ~60 lines we see both the
            // normalize call AND a model.save(payload) call.
            const start = TABLE_PAGE.indexOf('async onActionAdd(');
            expect(start).toBeGreaterThan(-1);
            const tail = TABLE_PAGE.substring(start, start + 1200);
            expect(/WebhookSubscriptionForms\.normalizePayload\(/.test(tail)).toBe(true);
            expect(/model\.save\(payload\)/.test(tail)).toBe(true);
        });
    });

    describe('WebhookSubscriptionView source shape', () => {
        it('registers VIEW_CLASS on the model so clickAction: "view" resolves', () => {
            expect(/WebhookSubscription\.VIEW_CLASS\s*=\s*WebhookSubscriptionView/.test(VIEW)).toBe(true);
        });

        it('exposes Edit / Activate / Deactivate / Delete context-menu actions', () => {
            expect(/action:\s*'edit-subscription'/.test(VIEW)).toBe(true);
            expect(/action:\s*'activate-subscription'/.test(VIEW)).toBe(true);
            expect(/action:\s*'deactivate-subscription'/.test(VIEW)).toBe(true);
            expect(/action:\s*'delete-subscription'/.test(VIEW)).toBe(true);
        });

        it('escapes user-controlled url before interpolating into dialog title/message', () => {
            // Regression: `Modal.confirm` interpolates `message` directly into
            // `<p>${message}</p>` without escaping, and `ModalView` does the
            // same with `title`. If we ever drop the `escapeHtml(...)` wrap
            // around `model.get('url')` in the edit / delete handlers, a
            // crafted url ("<img src=x onerror=...>") would execute when an
            // operator opens the dialog.
            expect(/import MOJOUtils/.test(VIEW)).toBe(true);
            const editBlock = VIEW.substring(
                VIEW.indexOf('async onActionEditSubscription'),
                VIEW.indexOf('async onActionDeactivateSubscription')
            );
            expect(/escapeHtml\(\s*this\.model\.get\(['"]url['"]\)/.test(editBlock)).toBe(true);

            const deleteBlock = VIEW.substring(
                VIEW.indexOf('async onActionDeleteSubscription'),
                VIEW.indexOf('async onActionDeleteSubscription') + 1500
            );
            expect(/escapeHtml\(\s*this\.model\.get\(['"]url['"]\)/.test(deleteBlock)).toBe(true);
        });
    });

    describe('Admin nav registration', () => {
        it('registers the page at system/webhook-subscriptions', () => {
            expect(/app\.registerPage\(\s*['"]system\/webhook-subscriptions['"]/.test(ADMIN_JS)).toBe(true);
        });

        it('adds the System sidebar entry under "Webhook Subscriptions"', () => {
            expect(/text:\s*'Webhook Subscriptions'/.test(ADMIN_JS)).toBe(true);
            expect(/route:\s*'\?page=system\/webhook-subscriptions'/.test(ADMIN_JS)).toBe(true);
        });

        it('uses the manage_groups / manage_group permission threshold', () => {
            const reg = ADMIN_JS.match(/registerPage\(['"]system\/webhook-subscriptions['"][\s\S]*?\)/)?.[0] || '';
            expect(/manage_groups/.test(reg)).toBe(true);
            expect(/manage_group/.test(reg)).toBe(true);
        });
    });

    describe('GroupView Webhooks section wiring', () => {
        it('imports WebhookSubscription model + Forms + View', () => {
            expect(/from '@core\/models\/WebhookSubscription\.js'/.test(GROUP_VIEW)).toBe(true);
            expect(/import WebhookSubscriptionView/.test(GROUP_VIEW)).toBe(true);
        });

        it('creates a WebhookSubscriptionList scoped to the current group', () => {
            expect(/new WebhookSubscriptionList\(\s*\{\s*params:\s*\{\s*group:\s*groupId/.test(GROUP_VIEW)).toBe(true);
        });

        it('registers the Webhooks section under the Access divider', () => {
            const sections = GROUP_VIEW.match(/const sections\s*=\s*\[[\s\S]*?\]/)?.[0] || '';
            const accessIdx   = sections.indexOf("label: 'Access'");
            const apiKeysIdx  = sections.indexOf("key: 'ApiKeys'");
            const webhooksIdx = sections.indexOf("key: 'Webhooks'");
            const activityIdx = sections.indexOf("label: 'Activity'");
            expect(accessIdx).toBeGreaterThan(-1);
            expect(webhooksIdx).toBeGreaterThan(apiKeysIdx);
            expect(webhooksIdx).toBeLessThan(activityIdx);
            // permission gate matches the backend threshold
            expect(/key:\s*'Webhooks'[\s\S]*?permissions:\s*'manage_group'/.test(sections)).toBe(true);
        });

        it('wires onAdd / onItemDelete on the Webhook Subscriptions list', () => {
            expect(/webhookSubscriptionsListView\.options\.onAdd\s*=/.test(GROUP_VIEW)).toBe(true);
            expect(/webhookSubscriptionsListView\.options\.onItemDelete\s*=/.test(GROUP_VIEW)).toBe(true);
        });

        it('does NOT auto-fetch the webhook secret on mount', () => {
            // If we ever start auto-fetching the secret, that's a regression
            // — the backend auto-mints, and a render-time call would silently
            // create a secret no one asked for.
            expect(/webhookSecret(Panel)?\.fetch\(\)/.test(GROUP_VIEW)).toBe(false);
            expect(/rest\.POST\(['"]\/api\/group\/webhook_secret['"][^)]*\)/.test(GROUP_VIEW)).toBe(true);
            // The reveal call sits inside an explicit user-action handler.
            expect(/onActionRevealWebhookSecret/.test(GROUP_VIEW)).toBe(true);
        });

        it('reveal/rotate handlers use static-backdrop dialogs', () => {
            const dialogBlock = GROUP_VIEW.match(/_showWebhookSecretDialog[\s\S]*?Modal\.dialog\(\{[\s\S]*?\}\);/)?.[0] || '';
            expect(/backdrop:\s*'static'/.test(dialogBlock)).toBe(true);
            expect(/keyboard:\s*false/.test(dialogBlock)).toBe(true);
        });

        it('rotate flow requires destructive confirmation', () => {
            const rotateBlock = GROUP_VIEW.match(/onActionRotateWebhookSecret\s*\([^)]*\)\s*\{[\s\S]*?\n    \}/)?.[0] || '';
            expect(rotateBlock.length).toBeGreaterThan(0);
            expect(/Modal\.confirm\(/.test(rotateBlock)).toBe(true);
            expect(/confirmClass:\s*'btn-danger'/.test(rotateBlock)).toBe(true);
        });
    });
};
