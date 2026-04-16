# Assistant File Block Type

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-13 |
| Priority | medium |

## Description

Add a `file` block type to the AI assistant chat so the backend can include downloadable file attachments (CSV exports, PDFs, spreadsheets) inline in assistant responses. The block renders as a styled card with filename, icon, metadata, and a download link.

## Context

The assistant already supports 7 structured block types (table, chart, stat, action, list, alert, progress) rendered by `AssistantMessageView`. File blocks let the assistant offer generated exports (e.g. "Here's your user export") as first-class downloadable items rather than bare URLs in markdown text. The URL is either a shortlink (`/s/Xk9mR2p`) that resolves a fresh S3 pre-signed URL on click, or a direct pre-signed URL — no auth headers needed, just a plain `<a>` link.

## Acceptance Criteria

- New block type `file` recognized in `AssistantMessageView.onAfterRender()` block switch
- Required fields: `type`, `filename`, `url`
- Optional fields: `size` (bytes), `format` (csv/xlsx/pdf/etc.), `row_count`, `expires_in` (human-readable string)
- Renders as a non-collapsible inline card (like stat/action blocks, not collapsible like table/chart)
- Shows: format-aware Bootstrap Icon, filename, metadata line (size, row count, expiry), download icon
- `<a>` tag with `href` pointing to `block.url`, `download` attribute set to `block.filename`
- All user-supplied text escaped via `_escapeHtml()` to prevent XSS
- CSS classes follow existing `assistant-*` naming convention
- Works in both `compact` and `bubbles` chat themes

## Investigation

- **What exists:**
  - `AssistantMessageView` (`src/extensions/admin/assistant/AssistantMessageView.js`) — block switch at lines 46-60, 7 block types
  - `_createCollapsibleCard()` helper — but file blocks should NOT be collapsible (similar to stat/action/alert)
  - `_escapeHtml()` already available on the class
  - CSS in `src/extensions/admin/css/admin.css` lines 1218+ — all block styles use `assistant-*` prefix
  - `AssistantMessageView._blockCounter` static counter for unique IDs

- **What changes:**
  - `src/extensions/admin/assistant/AssistantMessageView.js` — add `else if (block.type === 'file')` branch + `_renderFileBlock()` method
  - `src/extensions/admin/css/admin.css` — add `.assistant-file-card` styles

- **Constraints:**
  - Use Bootstrap Icons (`bi-file-earmark-text`, `bi-filetype-csv`, `bi-filetype-pdf`, `bi-file-earmark-spreadsheet`, `bi-download`) — no emoji icons
  - Use `_escapeHtml()` for filename, format, expires_in — never inject raw block data into innerHTML
  - URL goes straight into `href` — no fetch/auth needed
  - Follow the non-collapsible pattern used by `_renderStatBlock`, `_renderActionBlock`, `_renderAlertBlock`
  - `formatBytes()` utility should be a private method on the class (or inline), not a new utils export

- **Related files:**
  - `src/extensions/admin/assistant/AssistantMessageView.js` (primary)
  - `src/extensions/admin/css/admin.css` (styles)
  - `src/extensions/admin/assistant/AssistantContextChat.js` (block parsing — no changes needed, blocks come from backend)
  - `src/core/views/chat/ChatMessageView.js` (base class — no changes needed)

- **Block schema:**
  ```json
  {
    "type": "file",
    "filename": "export_users_2026-04-13.csv",
    "url": "https://yourdomain.com/s/Xk9mR2p",
    "size": 45230,
    "format": "csv",
    "row_count": 1250,
    "expires_in": "14 days"
  }
  ```

- **Endpoints:** None — file blocks are delivered via existing assistant message/block pipeline

- **Tests required:** None strictly needed — this is a new render branch in an extension view, not a reusable framework primitive. Manual verification in assistant chat with a test block payload is sufficient.

- **Out of scope:**
  - File preview/inline rendering (PDF viewer, CSV table preview)
  - File upload from this block (upload is handled by ChatInputView)
  - Expiry countdown or auto-disable of expired links
  - Backend changes (block is already defined server-side)

## Plan

### Objective

Add a `file` block type to the assistant chat that renders downloadable file attachments as styled inline cards with format-aware icon, filename, metadata, and download link.

### Steps

1. **`src/extensions/admin/assistant/AssistantContextChat.js` ~line 100** — Add `'file'` to the `VALID_TYPES` set so file blocks embedded in markdown `assistant_block` fences are not silently dropped.

2. **`src/extensions/admin/assistant/AssistantView.js` ~line 722** — Same change: add `'file'` to the second `VALID_TYPES` set.

3. **`src/extensions/admin/assistant/AssistantMessageView.js` ~line 58** — Add `else if (block.type === 'file')` branch calling `this._renderFileBlock(block, wrapper)`.

4. **`src/extensions/admin/assistant/AssistantMessageView.js`** — Add `_renderFileBlock(block, container)` method. Non-collapsible card (matching the action-card/alert pattern), structured as:
   - Outer `<a>` with `href=block.url`, `download=block.filename`, `target="_blank"`, `rel="noopener"`
   - Format-aware Bootstrap Icon in a 30px icon box (reuse `.assistant-block-toggle-icon` sizing)
   - Filename text (truncated with ellipsis via CSS)
   - Metadata line: formatted size, row count, expiry — joined with ` · ` separator
   - Download arrow icon (`bi-download`) on the right
   - All text escaped via `_escapeHtml()`
   - URL validated: must start with `https://`, `http://`, or `/` — otherwise skip the block and log a warning (prevents `javascript:` XSS)

5. **`src/extensions/admin/assistant/AssistantMessageView.js`** — Add `_formatBytes(bytes)` private method (simple B/KB/MB formatter, stays on the class — not a utils export).

6. **`src/extensions/admin/css/admin.css`** — Add `.assistant-file-card` styles after the action block section (~line 1698). Layout: flex row, border + rounded corners, hover highlight, matching existing card patterns. Icon map by format:
   - `csv` → `bi-filetype-csv`
   - `xlsx` → `bi-file-earmark-spreadsheet`
   - `pdf` → `bi-filetype-pdf`
   - `json` → `bi-filetype-json`
   - fallback → `bi-file-earmark-arrow-down`

### Design Decisions

- **Non-collapsible** — File blocks have no expandable content (unlike tables/charts). Follows the action/alert/list pattern of direct DOM construction, no `_createCollapsibleCard()`.
- **`<a>` as outer element** — The entire card is the click target. Uses native `<a>` with `download` attribute rather than a button + JS fetch. This matches the requirement that no auth headers are needed.
- **`target="_blank"` + `rel="noopener"`** — For cross-origin S3 pre-signed URLs, the browser will navigate to the URL (triggering S3's `Content-Disposition` header). For same-origin shortlinks, the server redirect handles it. The `download` attribute is a hint that may be ignored on cross-origin redirects, but is harmless.
- **URL scheme validation** — Blocks come from the backend/LLM, and a `javascript:` URL in an href is an XSS vector. Whitelisting `http(s)://` and `/` is a simple defense-in-depth measure.
- **Bootstrap Icons only** — No emoji. `bi-filetype-csv`, `bi-filetype-pdf`, `bi-file-earmark-spreadsheet` already used elsewhere in the codebase (TableView export, FileView, etc.).
- **`_formatBytes` on the class** — Used only here. No reason to add to `MOJOUtils` or create a new utils file.

### Edge Cases

- **Missing required fields** — If `filename` or `url` is missing, skip the block and log a console warning (same pattern as the existing `catch` block for render failures).
- **URL XSS** — Validate URL starts with `https://`, `http://`, or `/` before setting `href`. Reject otherwise.
- **Very long filenames** — CSS `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap` on `.assistant-file-name`.
- **`size: 0`** — Show "0 B" (valid — could be an empty export). Only omit size from metadata line when `size` is `undefined`/`null`.
- **`row_count: 0`** — Show "0 rows" (valid — empty result set). Only omit when `row_count` is `undefined`/`null`.
- **Unknown format** — Falls through to `bi-file-earmark-arrow-down` fallback icon. No error.
- **`download` attribute on cross-origin** — Browsers ignore `download` for cross-origin URLs. The S3 response's `Content-Disposition` header controls whether it downloads vs. displays. This is expected and documented by the request ("just link to it").
- **Expired pre-signed URL** — Out of scope. Click will result in S3 403. No client-side handling needed.
- **Multiple file blocks in one message** — Each renders independently, same as other block types.

### Testing

- Manual: inject a test message with a `file` block payload via the assistant chat (both with all optional fields and with only required fields).
- `npm run lint` — verify no lint issues in changed files.
- No automated test needed — this is a new render branch in an extension view, not a reusable primitive.

### Docs Impact

- `CHANGELOG.md` — Add entry for new `file` block type under the next version.
- No `docs/web-mojo/` changes needed — block types are not currently documented in the framework docs (they're an extension feature, not a core API).

## Resolution

### What was implemented
- New `file` block type in the assistant chat rendering pipeline
- Non-collapsible inline card with format-aware Bootstrap Icon, filename (ellipsis-truncated), metadata line (size/rows/expiry), and download link
- URL validation via `URL` constructor to block `javascript:`, `data:`, and protocol-relative (`//evil.com`) XSS vectors
- `_formatBytes()` private helper for human-readable file sizes

### Files changed
- `src/extensions/admin/assistant/AssistantContextChat.js` — added `'file'` to `VALID_TYPES` whitelist
- `src/extensions/admin/assistant/AssistantView.js` — added `'file'` to `VALID_TYPES` whitelist
- `src/extensions/admin/assistant/AssistantMessageView.js` — added block switch branch, `_renderFileBlock()`, `_formatBytes()`
- `src/extensions/admin/css/admin.css` — added `.assistant-file-card` styles
- `CHANGELOG.md` — added entry in Unreleased section
- `docs/web-mojo/extensions/Admin.md` — added `file` row to block types table

### Tests and validation
- `npm run lint` — clean (no new issues)
- `npm run build` via dev server — compiles without errors
- Full test suite — all failures are pre-existing infrastructure issues, none related to this change

### Agent findings
- **Security review:** Found critical URL regex bypass (protocol-relative URLs). Fixed in follow-up commit using `URL` constructor. Also reduced console.warn verbosity to avoid leaking pre-signed URLs.
- **Docs updater:** Updated CHANGELOG.md and Admin.md extension docs.
- **Test runner:** 53/182 unit tests pass; all failures pre-existing (module alias resolution, ES/CJS mismatch, missing source files).
