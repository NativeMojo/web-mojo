# ImageViewer canvas renders the image twice (visible repeat)

**Type**: bug
**Status**: resolved
**Date**: 2026-04-25

## Description

`ImageViewer` (in `src/extensions/lightbox/ImageViewer.js`) renders the loaded image inside its `<canvas class="image-viewer-canvas w-100 h-100">`. When opened via `ImageViewer.showDialog(url, { size: 'fullscreen' })`, the canvas's drawn content visibly tiles — the image appears twice side-by-side with a dim band between them.

## Reproduction

1. Open the new examples portal at `?page=extensions/light-box`.
2. Click any thumbnail.
3. The fullscreen modal opens with the river image rendered duplicated across the canvas.

## Expected Behavior

A single, fitted copy of the image fills the canvas; the toolbar overlays it cleanly.

## Suspected Cause

Likely one of:
- `setupCanvas()` sets the backing-store dimensions wrong and `drawImage()` is called with a width that's smaller than the visible area, causing the browser to display the canvas's last frame tiled.
- `autoFit: true` calculation uses the wrong source dimensions and draws the image twice during an in-progress zoom-fit transition.

## Affected Area
- `src/extensions/lightbox/ImageViewer.js` — `setupCanvas`, `drawImage`, `fitImage`.

## Surfaced By

Wave 2.5 LightBoxExample. Confirmed in browser screenshot — the canvas DOM contains exactly one canvas element but renders the image as two visible side-by-side copies.

---
## Resolution
**Status**: resolved

**Root cause.** `resizeCanvas()` was sizing the canvas backing store to `window.innerWidth * 0.8` × `window.innerHeight * 0.8`, regardless of the actual container. The canvas template uses `class="image-viewer-canvas w-100 h-100"`, and Bootstrap's `w-100`/`h-100` carry `!important`, so the canvas's CSS-displayed size always equals the container's content box (the dialog body) — not 80% of the viewport. When the backing store and the CSS-displayed box disagreed in aspect ratio, the browser scaled the rendered pixels to fit the CSS box and the image visibly tiled / duplicated. The two-thousand-millisecond `setTimeout` in `setupCanvas()` also delayed the first sizing pass long enough that draws could land at default 300×150 backing-store dimensions briefly.

**Fix.** `resizeCanvas()` now reads `containerElement.clientWidth` / `.clientHeight` and sets the backing store to `containerSize × devicePixelRatio`, with `setTransform(dpr, ...)` so render math stays in logical pixels. `setupCanvas()` runs synchronously (no 2-second wait) and registers a `ResizeObserver` on the container so the backing store stays in sync when the modal opens, animates, or the window resizes. `handleImageLoad()` no longer waits 2 seconds for the dialog — it uses `requestAnimationFrame` for the first paint and trusts the observer for subsequent layout changes. `onBeforeDestroy()` disconnects the observer.

**Patch.** `src/extensions/lightbox/ImageViewer.js`:
- `setupCanvas()` — synchronous resize + `ResizeObserver` install
- `resizeCanvas()` — uses `containerElement.clientWidth/Height` instead of viewport×0.8
- `handleImageLoad()` — drops the 2000 ms wait, uses rAF
- `onBeforeDestroy()` — cleans up the observer

**Test.** `test/unit/ImageViewer.test.js` — mounts an `ImageViewer` into a 600×400 container, pins `devicePixelRatio` to 2, and asserts the canvas backing store ends up `1200×800` (logical × DPR) with CSS dimensions `600px×400px`. A second case verifies the backing store updates when the container's `clientWidth`/`clientHeight` change. Both fail against the pre-fix code (which sets backing store to `819×614` regardless of container).

**Example restored.** `examples/portal/examples/extensions/LightBox/LightBoxExample.js` — `onActionViewImage` now calls `ImageViewer.showDialog(image.src, { size: 'fullscreen', ... })` directly again, no longer routing through `LightboxGallery.show`.
