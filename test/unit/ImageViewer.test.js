/**
 * ImageViewer Unit Tests
 *
 * Regression test for: planning/done/imageviewer-canvas-renders-image-twice.md
 *
 * The bug: setupCanvas() sized the canvas backing-store to viewport*0.8
 * regardless of the actual container size. The canvas template uses
 * `class="w-100 h-100"`, so the displayed CSS dimensions are the
 * container's content box — which differs from viewport*0.8 in a
 * fullscreen modal. The mismatch caused drawImage output to be
 * stretched/duplicated by the browser when scaling the backing store
 * to fit the CSS box.
 *
 * The fix: resizeCanvas() now reads containerElement.clientWidth /
 * .clientHeight and uses those (times devicePixelRatio) for the
 * backing-store dimensions, so backing-store and CSS-displayed size
 * always agree.
 */

const fs = require('fs');
const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

/**
 * Mini-loader for ImageViewer.
 *
 * The shared simple-module-loader's transform pipeline doesn't understand
 * `export default class Foo extends Bar { ... }` (the regex assumes the
 * default export is a single expression terminated by `;`), and Modal
 * is at a path the loader doesn't know about. So strip the imports we
 * care about, drop everything else, and run the file in a sandbox where
 * View is the View we already loaded and Modal is a stub (the test
 * never calls the static methods that use it).
 */
function loadImageViewer(View) {
    const filePath = path.resolve(
        __dirname,
        '../../src/extensions/lightbox/ImageViewer.js'
    );
    let src = fs.readFileSync(filePath, 'utf8');

    // Replace import lines with const declarations bound to our stubs.
    src = src.replace(
        /import\s+View\s+from\s+['"][^'"]+['"];?/,
        'const View = __View;'
    );
    src = src.replace(
        /import\s+Modal\s+from\s+['"][^'"]+['"];?/,
        'const Modal = __Modal;'
    );

    // Strip `export default` from the class declaration so the class
    // is just a local binding we can reference at the end.
    src = src.replace(/^export\s+default\s+/m, '');

    // Append a return at the end so the function returns the class.
    src += '\nreturn ImageViewer;';

    const factory = new Function(
        '__View', '__Modal', 'window', 'document', 'console', 'global', 'setTimeout',
        src
    );

    const ModalStub = { dialog: () => Promise.resolve(null), show: () => Promise.resolve(null) };
    return factory(View, ModalStub, global.window, global.document, console, global, setTimeout);
}

module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    // Make sure View is loaded — ImageViewer extends it.
    const View = loadModule('View');
    const ImageViewer = loadImageViewer(View);

    const HTMLCanvasElement = window.HTMLCanvasElement;
    const make2DContextStub = () => ({
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low',
        setTransform: () => {},
        clearRect: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        drawImage: () => {}
    });

    describe('ImageViewer canvas sizing', () => {
        let container;
        let viewer;
        let originalResizeObserver;
        let originalGetContext;

        beforeEach(() => {
            // jsdom doesn't ship ResizeObserver — install a no-op stub so
            // setupCanvas() can construct one without throwing. The test
            // drives resizeCanvas() directly, so observer behavior isn't
            // exercised.
            originalResizeObserver = global.ResizeObserver;
            global.ResizeObserver = class {
                observe() {}
                disconnect() {}
                unobserve() {}
            };

            // jsdom doesn't implement HTMLCanvasElement.getContext — stub it.
            originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function() {
                return make2DContextStub();
            };

            container = document.createElement('div');
            container.id = 'image-viewer-test-host';
            container.style.cssText = 'position:absolute; width:600px; height:400px;';
            document.body.appendChild(container);
        });

        afterEach(async () => {
            if (viewer && typeof viewer.destroy === 'function') {
                try { await viewer.destroy(); } catch (_) { /* ignore */ }
            }
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
            viewer = null;
            container = null;

            if (typeof originalResizeObserver === 'undefined') {
                delete global.ResizeObserver;
            } else {
                global.ResizeObserver = originalResizeObserver;
            }
            HTMLCanvasElement.prototype.getContext = originalGetContext;
        });

        it('sizes canvas backing-store to container * devicePixelRatio', async () => {
            // No imageUrl — we're testing canvas sizing only, and
            // jsdom doesn't ship a usable HTMLImageElement constructor.
            viewer = new ImageViewer({
                showControls: false,
                allowDownload: false
            });

            await viewer.render(true, container);

            // The viewer's `image-viewer-content` element is the actual
            // sizing target — pin its measured dimensions deterministically.
            const contentEl = viewer.element.querySelector('.image-viewer-content');
            expect(contentEl).toBeDefined();
            Object.defineProperty(contentEl, 'clientWidth',  { configurable: true, get: () => 600 });
            Object.defineProperty(contentEl, 'clientHeight', { configurable: true, get: () => 400 });

            // Pin DPR so the assertion is stable regardless of the
            // jsdom default (which is 1, but be explicit).
            const originalDPR = window.devicePixelRatio;
            Object.defineProperty(window, 'devicePixelRatio', {
                configurable: true,
                get: () => 2
            });

            try {
                viewer.resizeCanvas();

                // Logical size = container content box
                expect(viewer.canvasWidth).toBe(600);
                expect(viewer.canvasHeight).toBe(400);

                // Backing store = logical * DPR
                expect(viewer.canvas.width).toBe(1200);
                expect(viewer.canvas.height).toBe(800);

                // CSS display size matches logical size (so backing
                // store and CSS box agree — the fix invariant).
                expect(viewer.canvas.style.width).toBe('600px');
                expect(viewer.canvas.style.height).toBe('400px');
            } finally {
                Object.defineProperty(window, 'devicePixelRatio', {
                    configurable: true,
                    get: () => originalDPR
                });
            }
        });

        it('updates backing store when the container resizes', async () => {
            // No imageUrl — we're testing canvas sizing only, and
            // jsdom doesn't ship a usable HTMLImageElement constructor.
            viewer = new ImageViewer({
                showControls: false,
                allowDownload: false
            });

            await viewer.render(true, container);

            const contentEl = viewer.element.querySelector('.image-viewer-content');
            let measuredWidth = 600;
            let measuredHeight = 400;
            Object.defineProperty(contentEl, 'clientWidth',  { configurable: true, get: () => measuredWidth });
            Object.defineProperty(contentEl, 'clientHeight', { configurable: true, get: () => measuredHeight });

            const originalDPR = window.devicePixelRatio;
            Object.defineProperty(window, 'devicePixelRatio', {
                configurable: true,
                get: () => 1
            });

            try {
                viewer.resizeCanvas();
                expect(viewer.canvas.width).toBe(600);
                expect(viewer.canvas.height).toBe(400);

                measuredWidth = 1024;
                measuredHeight = 768;
                viewer.resizeCanvas();

                expect(viewer.canvasWidth).toBe(1024);
                expect(viewer.canvasHeight).toBe(768);
                expect(viewer.canvas.width).toBe(1024);
                expect(viewer.canvas.height).toBe(768);
            } finally {
                Object.defineProperty(window, 'devicePixelRatio', {
                    configurable: true,
                    get: () => originalDPR
                });
            }
        });
    });

};
