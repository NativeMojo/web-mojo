/**
 * Built-in `groupBy*` helpers for ListView.
 *
 * Each helper returns an object `{ groupBy, groupHeaderLabel }` ready to
 * spread into the ListView constructor:
 *
 *   import { groupByDay } from '@core/views/list/grouping.js';
 *
 *   new ListView({
 *     collection: loginEvents,
 *     itemTemplate: '...',
 *     ...groupByDay('created')
 *   });
 *
 * Helpers always produce a stable bucket key (deterministic equality
 * regardless of input format) and a separate display formatter for the
 * `{{key}}` slot in the header template.
 *
 * Additional helpers (`groupByField`, `groupByMonth`, `groupByYear`,
 * `groupByLetter`) are tracked in `planning/requests/listview-grouping-helpers.md`
 * and ship when a real consumer asks.
 */

import dataFormatter from '@core/utils/DataFormatter.js';

/**
 * Resolve the raw value off a model — accept either a field-name string
 * (resolved via `model.get(field)`) or an accessor function.
 * @private
 */
function resolveAccessor(fieldOrAccessor) {
  if (typeof fieldOrAccessor === 'function') return fieldOrAccessor;
  if (typeof fieldOrAccessor === 'string') {
    return (model) => (model && typeof model.get === 'function' ? model.get(fieldOrAccessor) : null);
  }
  throw new TypeError('grouping helper expects a field name string or an accessor function');
}

/**
 * Convert a raw date-ish value (epoch seconds / epoch ms / ISO string /
 * Date instance) into a JavaScript Date in local time, or null when the
 * value is missing / unparseable. Uses `dataFormatter.normalizeEpoch`
 * (matches the existing AssistantConversationListView convention).
 * @private
 */
function toDate(raw) {
  if (raw == null || raw === '') return null;
  try {
    const ms = dataFormatter.normalizeEpoch(raw);
    if (ms === '' || ms == null || Number.isNaN(ms)) return null;
    const d = ms instanceof Date ? ms : new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch (_err) {
    return null;
  }
}

/**
 * Format a YYYY-MM-DD bucket key into a human display label, relative to
 * the local "today" / "yesterday" anchor:
 *   - 2026-05-09  → "Today"          (when today is 2026-05-09)
 *   - 2026-05-08  → "Yesterday"
 *   - 2026-04-25  → "Apr 25"         (current year)
 *   - 2025-12-19  → "Dec 19, 2025"   (prior year)
 * @private
 */
function formatDayLabel(bucketKey) {
  if (!bucketKey || typeof bucketKey !== 'string') return '';

  const parts = bucketKey.split('-');
  if (parts.length !== 3) return bucketKey;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return bucketKey;

  const now = new Date();
  const todayKey = isoDayKey(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = isoDayKey(yesterdayDate);

  if (bucketKey === todayKey) return 'Today';
  if (bucketKey === yesterdayKey) return 'Yesterday';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = months[month - 1] || '';
  if (year === now.getFullYear()) {
    return `${monthLabel} ${day}`;
  }
  return `${monthLabel} ${day}, ${year}`;
}

/**
 * Build a stable YYYY-MM-DD bucket key from a Date — local time, so the
 * bucket aligns with the user's idea of "the day this happened" rather
 * than UTC.
 * @private
 */
function isoDayKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Day-bucketing helper for chronological feeds.
 *
 * Buckets each model into its local-day ISO key (e.g. `'2026-05-09'`).
 * Stable keys make equality deterministic regardless of input format
 * (epoch / ISO / Date). The label formatter renders 'Today' / 'Yesterday'
 * / 'May 5' / 'May 5, 2025' depending on how recent the bucket is.
 *
 * @param {string|Function} fieldOrAccessor - Model field name or accessor
 * @returns {{ groupBy: Function, groupHeaderLabel: Function }}
 *
 * @example
 * new ListView({
 *   collection: loginEvents,
 *   itemTemplate: '...',
 *   ...groupByDay('created')
 * });
 *
 * @example
 * // Custom accessor for fallback fields
 * ...groupByDay((m) => m.get('updated') || m.get('created'))
 */
export function groupByDay(fieldOrAccessor) {
  const access = resolveAccessor(fieldOrAccessor);
  return {
    groupBy: (model) => {
      const date = toDate(access(model));
      return date ? isoDayKey(date) : null;
    },
    groupHeaderLabel: (key) => formatDayLabel(key)
  };
}

// Default export is the helper bag — convenient for environments that
// can't resolve the named export directly (test simple-module-loader,
// non-ESM consumers, etc.). Keep both forms in sync as helpers are added.
export default {
  groupByDay
};
