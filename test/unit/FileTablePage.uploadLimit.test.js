/**
 * FileTablePage upload-limit wiring — source-shape pinning (ITEM-024)
 *
 * The real FileTablePage can't load under the lightweight runner
 * (unregistered module, unresolved `@core` aliases, module-scope
 * `File.VIEW_CLASS` assignment), so — same approach as
 * WebhookSubscriptionTablePage.test.js — we pin the source shape:
 *
 *   - no hardcoded 100MB limit remains anywhere in the page
 *   - the limit is resolved exactly once via
 *     resolveMaxUploadSize(options.maxFileSize → app config → 1GB default)
 *   - both upload paths (drag-drop config + file-picker handler) use the
 *     resolved value, including the error message
 *
 * Behavioral precedence coverage lives in
 * FileDropMixin.resolveMaxUploadSize.test.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function read(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    const PAGE = read('src/extensions/admin/storage/FileTablePage.js');
    const MIXIN = read('src/core/mixins/FileDropMixin.js');

    describe('FileTablePage upload limit wiring', () => {
        it('no hardcoded 100MB limit remains', () => {
            expect(/100\s*\*\s*1024\s*\*\s*1024/.test(PAGE)).toBe(false);
        });

        it('declares the 1GB default constant', () => {
            expect(/DEFAULT_MAX_UPLOAD_SIZE\s*=\s*1024\s*\*\s*1024\s*\*\s*1024/.test(PAGE)).toBe(true);
        });

        it('resolves the limit once: page option → app config → default', () => {
            expect(/this\.maxUploadSize\s*=\s*this\.resolveMaxUploadSize\(this\.options\.maxFileSize,\s*DEFAULT_MAX_UPLOAD_SIZE\)/.test(PAGE)).toBe(true);
        });

        it('drag-drop config uses the resolved limit', () => {
            expect(/maxFileSize:\s*this\.maxUploadSize/.test(PAGE)).toBe(true);
        });

        it('file-picker path checks and reports the resolved limit', () => {
            expect(/file\.size\s*>\s*this\.maxUploadSize/.test(PAGE)).toBe(true);
            expect(/_formatFileSize\(this\.maxUploadSize\)/.test(PAGE)).toBe(true);
        });
    });

    describe('FileDropMixin resolver shape', () => {
        it('reads the app config key max_upload_size', () => {
            expect(/resolveMaxUploadSize\(/.test(MIXIN)).toBe(true);
            expect(/config\?\.max_upload_size/.test(MIXIN)).toBe(true);
        });

        it('keeps the 10MB enableFileDrop default untouched (chat/form surfaces)', () => {
            expect(/maxFileSize:\s*config\.maxFileSize\s*\|\|\s*10\s*\*\s*1024\s*\*\s*1024/.test(MIXIN)).toBe(true);
        });
    });
};
