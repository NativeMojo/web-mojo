# ProgressView

**File-upload progress UI: progress bar, filename, byte counter, and cancel button.**

`ProgressView` is the visual progress component shown by `FileUpload` toasts. It's a thin `View` subclass — drop it into a `Dialog`, `Modal`, or any container, and call `updateProgress()` from your upload code to drive the bar.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [API](#api)
- [Events](#events)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

`ProgressView` does one thing: render Bootstrap progress UI for a single file. It tracks four pieces of state — filename, total size, bytes loaded, and a status message — and re-renders when `updateProgress()` is called.

It's the canonical component for any progress UI in `web-mojo` — file uploads, but also data exports, long-running imports, or any operation with a known total. The `cancel` event lets you wire a stop button.

## Quick Start

```js
import { ProgressView } from 'web-mojo';

const progress = new ProgressView({
    filename: 'report.pdf',
    filesize: 2_400_000,
    showCancel: true,
    onCancel: () => uploadController.abort(),
});

// Mount in a container, modal, or toast.
this.addChild(progress, { containerId: 'upload-slot' });

// Drive it from your upload code:
xhr.upload.addEventListener('progress', (e) => {
    progress.updateProgress({
        progress: e.loaded / e.total,
        loaded: e.loaded,
        total: e.total,
    });
});

xhr.onload = () => progress.markCompleted('Saved.');
xhr.onerror = () => progress.markFailed('Upload failed.');
```

## API

### Constructor

```js
new ProgressView({
    filename,        // string. Display label. Default 'Unknown file'.
    filesize,        // number. Total bytes. Used for the byte counter.
    showCancel,      // boolean. Show the cancel button. Default true.
    onCancel,        // function. Called when the user clicks cancel.
})
```

The component formats `filesize` through `dataFormatter` (`'1.5 MB'`, `'12 KB'`) on construction; pass raw bytes.

### Update methods

| Method | Purpose |
|---|---|
| `updateProgress({ progress, loaded, total, percentage })` | Update the bar. Pass `progress` (0–1) **or** `percentage` (0–100); pass `loaded` + `total` if you want the byte counter to update. No-op after `markCompleted` / `markCancelled` / `markFailed`. |
| `markCompleted(message = 'Upload completed!')` | Lock the bar at 100%, show a check, set status. |
| `markFailed(message = 'Upload failed')` | Lock the bar, show an error icon, set status. |
| `markCancelled()` | Set the cancelled state. Disables the cancel button so it can't fire twice. |
| `setFilename(filename)` | Update the displayed filename. |
| `setFilesize(size)` | Update the total. Recomputes the byte counter formatting. |

### Inspection methods

| Method | Returns |
|---|---|
| `getPercentage()` | Current percentage as a number 0–100. |
| `isCompleted()` | `true` after `markCompleted`. |
| `isCancelled()` | `true` after `markCancelled` (or after the user clicks cancel). |
| `getStats()` | Snapshot `{ filename, filesize, progress, percentage, loaded, total, status, completed, cancelled }` for logging/telemetry. |

## Events

`ProgressView` emits via `EventEmitter` (the View mixin):

| Event | Payload | When |
|---|---|---|
| `cancel` | `{ view }` | The user clicked the cancel button. The `onCancel` constructor option also fires. |
| `progress` | `{ progress, loaded, total, percentage }` | Every `updateProgress()` call. |
| `completed` | `{ message }` | After `markCompleted()`. |
| `failed` | `{ message }` | After `markFailed()`. |

Use `progress.on('progress', ...)` if you want to mirror the bar in another widget; the constructor's `onCancel` is enough for the common case.

## Common Pitfalls

- **`updateProgress` after completion is a no-op.** Once `markCompleted`, `markFailed`, or `markCancelled` runs, the view ignores further updates. This is intentional — late-arriving network events shouldn't reset the bar.
- **Pass either `progress` (0–1) or `percentage` (0–100), not both.** If both are passed, `percentage` wins.
- **The cancel button doesn't actually cancel anything.** It just emits `cancel` and calls `onCancel`. Wiring the abort logic (XHR `abort()`, `AbortController.abort()`, `fetch` cancellation) is your job.
- **Bootstrap progress styles assume a parent with width.** When mounting in a tight space (e.g. a toast), give the parent a fixed or min width or the bar collapses to ~0.
- **For multi-file uploads, mount one `ProgressView` per file.** The component is single-file by design; render N views inside a list.

## Related Docs

- [`services/FileUpload.md`](../services/FileUpload.md) — uses `ProgressView` for upload toasts.
- [`core/View.md`](../core/View.md) — the base class. `ProgressView` is a standard View; the lifecycle rules apply.
- [`core/DataFormatter.md`](../core/DataFormatter.md) — the `filesize` formatter that renders byte counts.
