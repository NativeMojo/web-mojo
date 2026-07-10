/**
 * FileDropMixin.resolveMaxUploadSize — precedence unit tests (ITEM-024)
 *
 * The mixin file has no internal imports, so it loads cleanly via
 * moduleLoader.loadModuleFromFile. Loading directly (instead of a registry
 * loadModule) avoids touching the shared global/module cache — FormView
 * tests stub `global.FileDropMixin` and must not see the real applier.
 *
 * Contract under test — first positive finite number wins:
 *   explicit view/page option → app config `max_upload_size` → caller fallback
 * with a 10MB mixin baseline if every candidate is invalid.
 */

const path = require('path');
const { moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;

    const mixinPath = path.resolve(__dirname, '../../src/core/mixins/FileDropMixin.js');
    const applyFileDropMixin = moduleLoader.loadModuleFromFile(mixinPath, 'FileDropMixin');

    class Dummy {}
    applyFileDropMixin(Dummy);
    const resolve = Dummy.prototype.resolveMaxUploadSize;

    const MB = 1024 * 1024;
    const GB = 1024 * MB;

    // Minimal `this` for the resolver: it only touches getApp()?.config.
    function makeCtx(appConfig) {
        return { getApp: () => (appConfig === null ? null : { config: appConfig }) };
    }

    describe('FileDropMixin.resolveMaxUploadSize', () => {
        it('is installed on view classes via applyFileDropMixin', () => {
            expect(typeof resolve).toBe('function');
            expect(typeof Dummy.prototype.enableFileDrop).toBe('function');
        });

        it('explicit option wins over app config and fallback', () => {
            const ctx = makeCtx({ max_upload_size: 5 * MB });
            expect(resolve.call(ctx, 200 * MB, GB)).toBe(200 * MB);
        });

        it('uses app config max_upload_size when no explicit option is set', () => {
            const ctx = makeCtx({ max_upload_size: 5 * MB });
            expect(resolve.call(ctx, undefined, GB)).toBe(5 * MB);
        });

        it('falls back to the caller default when neither option nor app config is set', () => {
            expect(resolve.call(makeCtx({}), undefined, GB)).toBe(GB);
        });

        it('skips non-positive and non-numeric candidates', () => {
            expect(resolve.call(makeCtx({ max_upload_size: -1 }), 0, GB)).toBe(GB);
            expect(resolve.call(makeCtx({ max_upload_size: 'huge' }), NaN, GB)).toBe(GB);
        });

        it('accepts numeric strings in app config', () => {
            expect(resolve.call(makeCtx({ max_upload_size: '1048576' }), undefined, GB)).toBe(MB);
        });

        it('survives a missing app or missing getApp', () => {
            expect(resolve.call(makeCtx(null), undefined, GB)).toBe(GB);
            expect(resolve.call({}, undefined, GB)).toBe(GB);
        });

        it('returns the 10MB mixin baseline when every candidate is garbage', () => {
            expect(resolve.call({}, 'x', 'y')).toBe(10 * MB);
        });
    });
};
