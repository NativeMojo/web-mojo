/**
 * KnownFieldsCard - "Known JSON keys promoted, raw blob below" pattern.
 *
 * Many records carry blob-shaped JSON fields — `metadata`, `ip_info`,
 * `device_info`, `payload`, `og_metadata` — that contain a few keys
 * the framework knows about plus an open-ended bag of extras. The
 * Detail / Metadata sections of admin views typically want to:
 *
 *   1. Promote the known keys to a clean 2-column label/value layout.
 *   2. Keep the raw JSON accessible but visually subordinated.
 *
 * That's the pattern this primitive captures. Built on the existing
 * `.detail-flat-row` family for the known-keys grid and a native
 * `<details>` for the collapsible raw blob.
 *
 * ┌──────────────────────────────────────────────┐
 * │ Created by      ian@example.com              │
 * │ Reasoning       brute-force from same /24    │
 * │ Last resolved   2026-04-21 11:42             │
 * │                                              │
 * │ ▶ Raw metadata                               │
 * └──────────────────────────────────────────────┘
 *
 * @example
 *   const card = new KnownFieldsCard({
 *       data: model.get('metadata') || {},      // OR (model) => object
 *       knownKeys: [
 *           { key: 'created_by',     label: 'Created by' },
 *           { key: 'last_resolved',  label: 'Resolved',  formatter: 'datetime' },
 *           { key: 'reasoning',      label: 'Reasoning' },
 *           { key: 'agent_prompt',   label: 'Agent prompt',
 *             formatter: (v) => `<code>${escapeHtml(v)}</code>` }
 *       ],
 *       rawLabel: 'Raw metadata',
 *       rawCollapsed: true
 *   });
 *   parent.addChild(card, { containerId: 'metadata-card' });
 *
 * `data` may be a plain object OR a function of `model`. `knownKeys`
 * may be a plain array OR a function of `model` for state-dependent
 * key sets.
 *
 * `formatter` per known-key may be:
 *   - a string — looked up via DataFormatter.apply (e.g. 'datetime',
 *     'relative', 'filesize', 'phone'). Returns trusted HTML.
 *   - a function `(value, key, data) => string` — returns trusted HTML.
 *   - omitted — the value is rendered as escaped text via String(value).
 *
 * Missing keys render with the muted "—" placeholder so the row grid
 * stays visually consistent. Pass `hideEmpty: true` on a key to omit
 * the row entirely when the value is null/undefined/''.
 */

import View from '@core/View.js';
import dataFormatter from '@core/utils/DataFormatter.js';

class KnownFieldsCard extends View {
    constructor(options = {}) {
        const {
            data        = {},
            knownKeys   = [],
            rawCollapsed = true,
            rawLabel    = 'Raw JSON',
            emptyText   = 'No data.',
            showRaw     = true,
            ...viewOptions
        } = options;

        super({
            tagName: 'div',
            className: 'detail-known-fields-card',
            ...viewOptions
        });

        this._dataOpt        = data;
        this._knownKeysOpt   = knownKeys;
        this.rawCollapsed    = rawCollapsed !== false;
        this.rawLabel        = rawLabel;
        this.emptyText       = emptyText;
        this.showRaw         = showRaw !== false;

        this.template = () => this._buildTemplate();
    }

    // ── Resolvers ──────────────────────────────────────────────

    _resolveData() {
        const raw = (typeof this._dataOpt === 'function')
            ? this._dataOpt(this.model)
            : this._dataOpt;
        return (raw && typeof raw === 'object') ? raw : {};
    }

    _resolveKnownKeys() {
        const raw = (typeof this._knownKeysOpt === 'function')
            ? this._knownKeysOpt(this.model)
            : this._knownKeysOpt;
        return Array.isArray(raw) ? raw.filter(Boolean) : [];
    }

    // ── Rendering ──────────────────────────────────────────────

    _buildTemplate() {
        const data       = this._resolveData();
        const knownKeys  = this._resolveKnownKeys();
        const isEmpty    = !knownKeys.length && Object.keys(data).length === 0;

        if (isEmpty) {
            return `<div class="text-secondary small">${this.escapeHtml(this.emptyText)}</div>`;
        }

        const rowsHtml = knownKeys
            .map(spec => this._renderRow(spec, data))
            .filter(Boolean)
            .join('');

        const knownHtml = rowsHtml
            ? `<div class="detail-known-fields-grid">${rowsHtml}</div>`
            : '';

        const rawHtml = this.showRaw
            ? this._renderRaw(data)
            : '';

        return `${knownHtml}${rawHtml}`;
    }

    _renderRow(spec, data) {
        if (!spec || !spec.key) return '';

        const value = this._lookup(data, spec.key);
        const isMissing = value == null || value === '';

        if (isMissing && spec.hideEmpty) return '';

        const label = String(spec.label ?? spec.key);
        const valueHtml = isMissing
            ? '<span class="text-secondary fst-italic">—</span>'
            : this._formatValue(value, spec, data);

        return `
            <div class="detail-flat-row">
                <div class="detail-flat-row-label">${this.escapeHtml(label)}</div>
                <div class="detail-flat-row-value">${valueHtml}</div>
            </div>
        `;
    }

    _renderRaw(data) {
        // Empty object — skip raw block entirely.
        if (!data || Object.keys(data).length === 0) return '';

        let json;
        try {
            json = JSON.stringify(data, null, 2);
        } catch (err) {
            json = String(data);
        }

        const openAttr = this.rawCollapsed ? '' : ' open';
        return `
            <details class="detail-known-fields-raw"${openAttr}>
                <summary class="detail-known-fields-raw-summary">${this.escapeHtml(this.rawLabel)}</summary>
                <pre class="detail-known-fields-raw-body">${this.escapeHtml(json)}</pre>
            </details>
        `;
    }

    // Looks up a dotted path on the data object so knownKeys can reference
    // nested keys like `os.family`. Falls back to a flat lookup when the
    // path doesn't traverse anything.
    _lookup(data, key) {
        if (!key || data == null) return undefined;
        if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
        if (key.indexOf('.') === -1) return undefined;
        const parts = key.split('.');
        let cursor = data;
        for (const part of parts) {
            if (cursor == null || typeof cursor !== 'object') return undefined;
            cursor = cursor[part];
        }
        return cursor;
    }

    _formatValue(value, spec, data) {
        const formatter = spec.formatter;

        if (typeof formatter === 'function') {
            try {
                const out = formatter(value, spec.key, data);
                return out == null ? '' : String(out);
            } catch (err) {
                return this.escapeHtml(String(value));
            }
        }

        if (typeof formatter === 'string' && formatter.length) {
            try {
                const out = dataFormatter.apply(formatter, value);
                return out == null ? '' : String(out);
            } catch (err) {
                return this.escapeHtml(String(value));
            }
        }

        // Default — escaped scalar / JSON.
        if (value && typeof value === 'object') {
            return `<code class="text-secondary">${this.escapeHtml(JSON.stringify(value))}</code>`;
        }
        return this.escapeHtml(String(value));
    }
}

// Stylesheet for KnownFieldsCard lives in src/core/css/core.css under "KnownFieldsCard".

export default KnownFieldsCard;
export { KnownFieldsCard };
