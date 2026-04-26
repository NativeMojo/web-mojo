# ImageViewer canvas renders the image twice (visible repeat)

**Type**: bug
**Status**: open
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
**Status**: open
