/**
 * File Model Helpers — Unit Tests
 *
 * Covers the category inference and rendition helpers on the `File` model.
 *
 * Why we don't loadModule('File'):
 *   `simple-module-loader.js` exposes a fixed module map. Files.js imports
 *   `@core/services/FileUpload.js`, `@core/models/User.js`, and
 *   `@core/models/Group.js` — none of which the loader knows about. Also,
 *   setting `global.File = …` would clobber `globalThis.File` (the DOM File
 *   constructor the test runner installs at startup). So instead we load the
 *   real `Model` class via the loader and define a small subclass here with
 *   the same helper bodies as the production `File` class. The subclass is
 *   kept verbatim in sync with `src/core/models/Files.js`; if those helpers
 *   change, update the copy here too and the real ones.
 */

module.exports = async function (testContext) {
    const { describe, it, expect } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    const { loadModule } = require('../utils/simple-module-loader');

    await testHelpers.setup();
    const Model = loadModule('Model');

    // ──────────────────────────────────────────────────────────────────
    // Local copy of File helpers — must stay in sync with Files.js
    // ──────────────────────────────────────────────────────────────────

    class TestFile extends Model {
        constructor(data = {}, options = {}) {
            super(data, { endpoint: '/api/fileman/file', ...options });
        }

        isImage() { return this.get('category') === 'image'; }

        getCategory() {
            return this.get('category') || this._inferCategoryFromContentType();
        }

        _inferCategoryFromContentType() {
            const ct = (this.get('content_type') || '').toLowerCase();
            if (!ct) return 'other';
            if (ct.startsWith('image/')) return 'image';
            if (ct.startsWith('video/')) return 'video';
            if (ct.startsWith('audio/')) return 'audio';
            if (ct === 'application/pdf') return 'pdf';
            if (ct.startsWith('text/') ||
                ct === 'application/msword' ||
                ct.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml') ||
                ct === 'application/vnd.oasis.opendocument.text') return 'document';
            if (ct === 'application/vnd.ms-excel' ||
                ct.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml') ||
                ct === 'application/vnd.oasis.opendocument.spreadsheet') return 'spreadsheet';
            if (ct === 'application/vnd.ms-powerpoint' ||
                ct.startsWith('application/vnd.openxmlformats-officedocument.presentationml') ||
                ct === 'application/vnd.oasis.opendocument.presentation') return 'presentation';
            if (ct === 'application/zip' ||
                ct === 'application/x-rar-compressed' ||
                ct === 'application/x-7z-compressed' ||
                ct === 'application/x-tar' ||
                ct === 'application/gzip') return 'archive';
            return 'other';
        }

        hasRenditions() {
            const r = this.get('renditions');
            return !!(r && Object.keys(r).length);
        }

        isUploadPending() {
            const status = this.get('upload_status');
            return !!(status && status !== 'completed' && status !== 'failed');
        }

        regenerateRenditions(roles) {
            const id = this.id || this.get('id');
            if (!id) return Promise.reject(new Error('Cannot regenerate renditions on an unsaved file'));
            const body = (Array.isArray(roles) && roles.length)
                ? { regenerate_renditions: roles }
                : { regenerate_renditions: true };
            return this.rest.POST(`${this.endpoint}/${id}`, body);
        }

        share(options = true) {
            const id = this.id || this.get('id');
            if (!id) return Promise.reject(new Error('Cannot share an unsaved file'));
            return this.rest.POST(`${this.endpoint}/${id}`, { share: options });
        }

        getRenditions() {
            const r = this.get('renditions');
            return r ? Object.values(r) : [];
        }

        getBestImageRendition() {
            const images = this.getRenditions().filter(
                r => r && typeof r.content_type === 'string' && r.content_type.startsWith('image/')
            );
            if (!images.length) return null;
            return images.reduce((best, current) => {
                const bestArea = (parseInt(best.width) || 0) * (parseInt(best.height) || 0);
                const currentArea = (parseInt(current.width) || 0) * (parseInt(current.height) || 0);
                return currentArea > bestArea ? current : best;
            });
        }

        getThumbnailUrl() {
            const renditions = this.get('renditions') || {};
            if (renditions.thumbnail && renditions.thumbnail.url) {
                return renditions.thumbnail.url;
            }
            const best = this.getBestImageRendition();
            return best ? best.url : null;
        }
    }

    // ──────────────────────────────────────────────────────────────────

    describe('File.getCategory()', () => {
        it('prefers backend-provided category', () => {
            const f = new TestFile({ category: 'pdf', content_type: 'image/png' });
            expect(f.getCategory()).toBe('pdf');
        });

        it('falls back to image/* content_type', () => {
            const f = new TestFile({ content_type: 'image/jpeg' });
            expect(f.getCategory()).toBe('image');
        });

        it('falls back to video/* content_type', () => {
            const f = new TestFile({ content_type: 'video/mp4' });
            expect(f.getCategory()).toBe('video');
        });

        it('falls back to audio/* content_type', () => {
            const f = new TestFile({ content_type: 'audio/mpeg' });
            expect(f.getCategory()).toBe('audio');
        });

        it('maps application/pdf to pdf', () => {
            const f = new TestFile({ content_type: 'application/pdf' });
            expect(f.getCategory()).toBe('pdf');
        });

        it('maps Word content types to document', () => {
            expect(new TestFile({ content_type: 'application/msword' }).getCategory()).toBe('document');
            expect(new TestFile({
                content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }).getCategory()).toBe('document');
            expect(new TestFile({ content_type: 'text/plain' }).getCategory()).toBe('document');
        });

        it('maps Excel content types to spreadsheet', () => {
            expect(new TestFile({ content_type: 'application/vnd.ms-excel' }).getCategory()).toBe('spreadsheet');
            expect(new TestFile({
                content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }).getCategory()).toBe('spreadsheet');
        });

        it('maps zip/tar/gzip to archive', () => {
            expect(new TestFile({ content_type: 'application/zip' }).getCategory()).toBe('archive');
            expect(new TestFile({ content_type: 'application/x-tar' }).getCategory()).toBe('archive');
            expect(new TestFile({ content_type: 'application/gzip' }).getCategory()).toBe('archive');
        });

        it('returns "other" when both category and content_type are missing', () => {
            expect(new TestFile({}).getCategory()).toBe('other');
        });

        it('returns "other" for unrecognized content_type', () => {
            expect(new TestFile({ content_type: 'application/x-custom-thing' }).getCategory()).toBe('other');
        });
    });

    describe('File.isUploadPending()', () => {
        it('returns true while the upload is in flight', () => {
            expect(new TestFile({ upload_status: 'pending' }).isUploadPending()).toBe(true);
            expect(new TestFile({ upload_status: 'uploading' }).isUploadPending()).toBe(true);
        });

        it('returns false once the upload is complete (renditions, if any, are done)', () => {
            expect(new TestFile({ upload_status: 'completed' }).isUploadPending()).toBe(false);
            expect(new TestFile({ upload_status: 'completed', renditions: {} }).isUploadPending()).toBe(false);
            expect(new TestFile({
                upload_status: 'completed',
                renditions: { thumbnail: { url: 'x' } }
            }).isUploadPending()).toBe(false);
        });

        it('returns false for failed and missing statuses', () => {
            expect(new TestFile({ upload_status: 'failed' }).isUploadPending()).toBe(false);
            expect(new TestFile({}).isUploadPending()).toBe(false);
        });
    });

    describe('File.regenerateRenditions()', () => {
        function stubRest() {
            const calls = [];
            return {
                calls,
                rest: {
                    POST: (url, body) => {
                        calls.push({ url, body });
                        return Promise.resolve({ success: true, data: {} });
                    },
                },
            };
        }

        it('POSTs {regenerate_renditions: true} for all default roles', () => {
            const f = new TestFile({ id: 42 });
            const { rest, calls } = stubRest();
            f.rest = rest;
            f.regenerateRenditions();
            expect(calls).toHaveLength(1);
            expect(calls[0].url).toBe('/api/fileman/file/42');
            expect(calls[0].body).toEqual({ regenerate_renditions: true });
        });

        it('POSTs the roles array when supplied', () => {
            const f = new TestFile({ id: 42 });
            const { rest, calls } = stubRest();
            f.rest = rest;
            f.regenerateRenditions(['thumbnail', 'preview']);
            expect(calls[0].body).toEqual({ regenerate_renditions: ['thumbnail', 'preview'] });
        });

        it('falls back to true when the roles array is empty', () => {
            const f = new TestFile({ id: 42 });
            const { rest, calls } = stubRest();
            f.rest = rest;
            f.regenerateRenditions([]);
            expect(calls[0].body).toEqual({ regenerate_renditions: true });
        });

        it('rejects when the file has no id', async () => {
            const f = new TestFile({});
            let caught = null;
            try { await f.regenerateRenditions(); } catch (err) { caught = err; }
            expect(caught).toBeInstanceOf(Error);
            expect(caught.message).toMatch(/unsaved/i);
        });
    });

    describe('File.share()', () => {
        it('POSTs {share: true} by default', async () => {
            const f = new TestFile({ id: 7 });
            const calls = [];
            f.rest = {
                POST: (url, body) => {
                    calls.push({ url, body });
                    return Promise.resolve({ success: true, data: { url: 'https://x/s/abc' } });
                },
            };
            const resp = await f.share();
            expect(calls[0].url).toBe('/api/fileman/file/7');
            expect(calls[0].body).toEqual({ share: true });
            expect(resp.data.url).toBe('https://x/s/abc');
        });

        it('forwards options as the share dict', async () => {
            const f = new TestFile({ id: 7 });
            const calls = [];
            f.rest = { POST: (url, body) => { calls.push({ url, body }); return Promise.resolve({ success: true, data: {} }); } };
            await f.share({ expire_days: 30, track_clicks: true, note: 'hello' });
            expect(calls[0].body).toEqual({ share: { expire_days: 30, track_clicks: true, note: 'hello' } });
        });

        it('rejects when the file has no id', async () => {
            const f = new TestFile({});
            let caught = null;
            try { await f.share(); } catch (err) { caught = err; }
            expect(caught).toBeInstanceOf(Error);
            expect(caught.message).toMatch(/unsaved/i);
        });
    });

    describe('File.hasRenditions()', () => {
        it('returns false when renditions is missing', () => {
            expect(new TestFile({}).hasRenditions()).toBe(false);
        });

        it('returns false for an empty renditions object', () => {
            expect(new TestFile({ renditions: {} }).hasRenditions()).toBe(false);
        });

        it('returns true when there is at least one rendition', () => {
            const f = new TestFile({ renditions: { thumbnail: { url: 'x', content_type: 'image/png' } } });
            expect(f.hasRenditions()).toBe(true);
        });
    });

    describe('File.getRenditions()', () => {
        it('returns [] when renditions is missing', () => {
            expect(new TestFile({}).getRenditions()).toEqual([]);
        });

        it('flattens the renditions object to an array', () => {
            const f = new TestFile({
                renditions: {
                    thumbnail: { url: 'a' },
                    preview: { url: 'b' }
                }
            });
            const out = f.getRenditions();
            expect(out).toHaveLength(2);
            expect(out.map(r => r.url).sort()).toEqual(['a', 'b']);
        });
    });

    describe('File.getBestImageRendition()', () => {
        it('returns null when there are no image renditions', () => {
            const f = new TestFile({
                renditions: { preview: { url: 'x', content_type: 'application/pdf' } }
            });
            expect(f.getBestImageRendition()).toBeNull();
        });

        it('returns null when renditions is missing entirely', () => {
            expect(new TestFile({}).getBestImageRendition()).toBeNull();
        });

        it('picks the largest-area image rendition', () => {
            const small  = { url: 's', content_type: 'image/jpeg', width: 100, height: 100 };
            const medium = { url: 'm', content_type: 'image/jpeg', width: 400, height: 400 };
            const large  = { url: 'l', content_type: 'image/jpeg', width: 1920, height: 1080 };
            const f = new TestFile({ renditions: { small, medium, large } });
            expect(f.getBestImageRendition().url).toBe('l');
        });

        it('treats missing width/height as zero area', () => {
            const nolabel = { url: 'n', content_type: 'image/png' };
            const sized   = { url: 's', content_type: 'image/png', width: 50, height: 50 };
            const f = new TestFile({ renditions: { nolabel, sized } });
            expect(f.getBestImageRendition().url).toBe('s');
        });

        it('ignores non-image renditions', () => {
            const img = { url: 'i', content_type: 'image/jpeg', width: 10, height: 10 };
            const vid = { url: 'v', content_type: 'video/mp4', width: 9999, height: 9999 };
            const f = new TestFile({ renditions: { img, vid } });
            expect(f.getBestImageRendition().url).toBe('i');
        });
    });

    describe('File.getThumbnailUrl()', () => {
        it('prefers the explicit thumbnail rendition URL', () => {
            const f = new TestFile({
                renditions: {
                    thumbnail: { url: 'THUMB', content_type: 'image/jpeg', width: 100, height: 100 },
                    large:     { url: 'LARGE', content_type: 'image/jpeg', width: 4000, height: 3000 }
                }
            });
            expect(f.getThumbnailUrl()).toBe('THUMB');
        });

        it('falls back to the best image rendition URL when no thumbnail role exists', () => {
            const f = new TestFile({
                renditions: {
                    small: { url: 'SMALL', content_type: 'image/jpeg', width: 100, height: 100 },
                    large: { url: 'LARGE', content_type: 'image/jpeg', width: 4000, height: 3000 }
                }
            });
            expect(f.getThumbnailUrl()).toBe('LARGE');
        });

        it('returns null when there are no image renditions and no thumbnail role', () => {
            expect(new TestFile({}).getThumbnailUrl()).toBeNull();
            expect(new TestFile({
                renditions: { preview: { url: 'x', content_type: 'application/pdf' } }
            }).getThumbnailUrl()).toBeNull();
        });
    });
};
