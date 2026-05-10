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
 * Shipped helpers:
 *   - `groupByDay`      — chronological feeds (Today / Yesterday / May 5 / May 5, 2025)
 *   - `groupByField`    — categorical bucketing with explicit label maps
 *   - `groupByRecency`  — six fixed buckets (Today / Yesterday / This week / This month / Earlier this year / Older)
 *   - `groupByBoolean`  — binary on/off split with consumer-supplied labels
 *
 * Additional helpers (`groupByMonth`, `groupByYear`, `groupByLetter`, etc.)
 * are tracked in `planning/requests/listview-grouping-helpers.md` and ship
 * when a real consumer asks.
 */

import dataFormatter from '@core/utils/DataFormatter.js';

/**
 * Resolve the raw value off a model — accept either a field-name string
 * (resolved via `model.get(field)`) or an accessor function. Shared by
 * every helper in this module — do not duplicate when adding new ones.
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
 * Shared by all date-bucket helpers — do not duplicate when adding new ones.
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

/**
 * Categorical-field bucketing helper.
 *
 * Buckets each model on the raw value at `fieldOrAccessor`, coerced to a
 * string (`String(raw)`) for deterministic equality. Three optional
 * formatting controls drive the displayed header:
 *
 *   - `labels`   — explicit map: `{ active: 'Active', resolved: 'Resolved' }`
 *   - `format`   — fallback transform applied when no `labels` entry matches
 *   - `fallback` — bucket key used when raw is `null` / `undefined` / `''`
 *                  (omitted by default → ungrouped tail)
 *
 * `labels` wins over `format` when both are passed.
 *
 * **Falsy-but-stringable raw values** (`0`, `false`) coerce to non-empty
 * strings (`'0'`, `'false'`) and DO produce buckets — only `null` /
 * `undefined` / `''` go to the fallback / null-bucket path. If you want
 * `0` collapsed into the ungrouped tail, pass a custom accessor that
 * returns `null` for those values.
 *
 * @param {string|Function} fieldOrAccessor - Model field name or accessor
 * @param {object} [opts]
 * @param {Object<string,string>} [opts.labels] - Explicit `rawKey → display` map
 * @param {Function} [opts.format] - `(rawKey) => display` fallback formatter
 * @param {string} [opts.fallback] - Bucket key when raw is null/undefined/''
 * @returns {{ groupBy: Function, groupHeaderLabel: Function }}
 *
 * @example
 * new ListView({
 *   collection: incidents,
 *   itemTemplate: '...',
 *   ...groupByField('status', {
 *     labels: { active: 'Active', resolved: 'Resolved', closed: 'Closed' },
 *     fallback: 'Other'
 *   })
 * });
 */
export function groupByField(fieldOrAccessor, opts = {}) {
  const access = resolveAccessor(fieldOrAccessor);
  const { labels, format, fallback } = opts;

  return {
    groupBy: (model) => {
      const raw = access(model);
      if (raw == null || raw === '') {
        return fallback != null ? String(fallback) : null;
      }
      return String(raw);
    },
    groupHeaderLabel: (key) => {
      if (labels && Object.prototype.hasOwnProperty.call(labels, key)) {
        return labels[key];
      }
      if (typeof format === 'function') {
        return format(key);
      }
      return key;
    }
  };
}

// Sort-ordered bucket keys so descending-by-date sort renders buckets in
// natural reading order (Today on top, Older on bottom).
const RECENCY_LABELS = {
  'recency-0-today': 'Today',
  'recency-1-yesterday': 'Yesterday',
  'recency-2-this-week': 'This week',
  'recency-3-this-month': 'This month',
  'recency-4-this-year': 'Earlier this year',
  'recency-5-older': 'Older'
};

/**
 * Map a Date into one of six fixed recency buckets relative to local "now".
 * @private
 */
function recencyBucketKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const dateKey = isoDayKey(date);
  const todayKey = isoDayKey(now);
  if (dateKey === todayKey) return 'recency-0-today';

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dateKey === isoDayKey(yesterday)) return 'recency-1-yesterday';

  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  if (date >= sevenDaysAgo) return 'recency-2-this-week';

  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return 'recency-3-this-month';
  }

  if (date.getFullYear() === now.getFullYear()) {
    return 'recency-4-this-year';
  }

  return 'recency-5-older';
}

/**
 * Recency-bucketing helper for chronological feeds.
 *
 * Buckets each model into one of six fixed buckets relative to the local
 * current time:
 *
 *   - 'Today'              — same local calendar day as now
 *   - 'Yesterday'          — day before today
 *   - 'This week'          — within the previous 7 calendar days
 *   - 'This month'         — earlier in the current calendar month
 *   - 'Earlier this year'  — earlier in the current calendar year
 *   - 'Older'              — prior calendar years
 *
 * Bucket keys are sort-ordered (`'recency-0-today'`, `'recency-1-yesterday'`, …)
 * so a descending-by-date sort renders buckets in natural reading order.
 *
 * V1 is opinionated — no `opts` parameter. If you need different bucket
 * thresholds, override `groupHeaderLabel` after the spread (label-only
 * customization) or write an inline `groupBy` (bucket-set customization).
 *
 * **Future dates** (rare) bucket as 'Today' if same calendar day,
 * otherwise 'This week' (because `date >= sevenDaysAgo` trivially holds
 * for any future date).
 *
 * @param {string|Function} fieldOrAccessor - Model field name or accessor
 * @returns {{ groupBy: Function, groupHeaderLabel: Function }}
 *
 * @example
 * new ListView({
 *   collection: notifications,
 *   itemTemplate: '...',
 *   ...groupByRecency('created')
 * });
 */
export function groupByRecency(fieldOrAccessor) {
  const access = resolveAccessor(fieldOrAccessor);
  return {
    groupBy: (model) => recencyBucketKey(toDate(access(model))),
    groupHeaderLabel: (key) => RECENCY_LABELS[key] || key
  };
}

// Common JSON-string-as-boolean forms. Lower-cased + trimmed before match.
const STRING_FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

/**
 * Coerce a raw value into a boolean for `groupByBoolean` bucketing.
 * Returns `null` for missing / empty inputs so they fall into the
 * ungrouped tail rather than a misleading "false" bucket.
 * @private
 */
function coerceBoolean(raw) {
  if (raw == null) return null;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if (lower === '') return null;
    return !STRING_FALSE_VALUES.has(lower);
  }
  return Boolean(raw);
}

/**
 * Binary-flag bucketing helper.
 *
 * Buckets each model into `'true'` / `'false'` based on the raw value at
 * `fieldOrAccessor`. Missing / empty raw values (`null`, `undefined`,
 * empty string) drop into the ungrouped tail rather than misleadingly
 * collapsing to "false".
 *
 * **String-false carve-out:** raw string values `'false'`, `'0'`, `'no'`,
 * `'off'` (case-insensitive, trimmed) coerce to `false`. Catches the
 * common backend pattern of returning JSON booleans as strings, which
 * pure JS truthy-coercion would mis-bucket.
 *
 * Defaults to `'Yes'` / `'No'` labels — most admin-UI cases (Active /
 * Inactive, Verified / Unverified, Paid / Unpaid) will override.
 *
 * @param {string|Function} fieldOrAccessor - Model field name or accessor
 * @param {object} [opts]
 * @param {string} [opts.trueLabel='Yes']  - Display label for the `true` bucket
 * @param {string} [opts.falseLabel='No']  - Display label for the `false` bucket
 * @returns {{ groupBy: Function, groupHeaderLabel: Function }}
 *
 * @example
 * new ListView({
 *   collection: users,
 *   itemTemplate: '...',
 *   ...groupByBoolean('is_active', { trueLabel: 'Active', falseLabel: 'Inactive' })
 * });
 */
export function groupByBoolean(fieldOrAccessor, opts = {}) {
  const access = resolveAccessor(fieldOrAccessor);
  const trueLabel = opts.trueLabel != null ? opts.trueLabel : 'Yes';
  const falseLabel = opts.falseLabel != null ? opts.falseLabel : 'No';

  return {
    groupBy: (model) => {
      const b = coerceBoolean(access(model));
      if (b === null) return null;
      return b ? 'true' : 'false';
    },
    groupHeaderLabel: (key) => {
      if (key === 'true') return trueLabel;
      if (key === 'false') return falseLabel;
      return key;
    }
  };
}

// Default export is the helper bag — convenient for environments that
// can't resolve the named export directly (test simple-module-loader,
// non-ESM consumers, etc.). Keep both forms in sync as helpers are added.
export default {
  groupByDay,
  groupByField,
  groupByRecency,
  groupByBoolean
};
