/**
 * DataFormatter - Universal data formatting utility for MOJO Framework
 * Provides consistent formatting with clean APIs and pipe syntax support
 * @version 1.0.0
 */

// A generic, gray, person icon SVG, encoded as a Base64 data URI.
// This is used as a fallback for the avatar formatter when no image URL is provided.
const GENERIC_AVATAR_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NlZDRkYSI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==';

class DataFormatter {
  constructor() {
    this.formatters = new Map();
    this.registerBuiltInFormatters();
  }

  escapeHtml(str) {
    if (str === null || str === undefined) {
        return '';
    }
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(str).replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Register all built-in formatters
   */
  registerBuiltInFormatters() {
    // Date/Time formatters
    this.register('date', this.date.bind(this));
    this.register('time', this.time.bind(this));
    this.register('datetime', this.datetime.bind(this));
    this.register('datetime_tz', this.datetime_tz.bind(this));
    this.register('datatime_tz', this.datetime_tz.bind(this)); // Alias for common typo
    this.register('relative', this.relative.bind(this));
    this.register('fromNow', this.relative.bind(this)); // Alias
    this.register('iso', this.iso.bind(this));
    this.register('epoch', (v) => {
      if (v === null || v === undefined || v === '') return v;
      const num = parseFloat(v);
      if (isNaN(num)) return v;
      // Convert seconds to milliseconds
      return num * 1000;
    });

    // Number formatters
    this.register('number', this.number.bind(this));
    this.register('currency', this.currency.bind(this));
    this.register('percent', this.percent.bind(this));
    this.register('filesize', this.filesize.bind(this));
    this.register('ordinal', this.ordinal.bind(this));
    this.register('compact', this.compact.bind(this));

    // String formatters
    this.register('uppercase', (v) => String(v).toUpperCase());
    this.register('lowercase', (v) => String(v).toLowerCase());
    this.register('upper', (v) => String(v).toUpperCase());
    this.register('lower', (v) => String(v).toLowerCase());
    this.register('capitalize', this.capitalize.bind(this));
    this.register('caps', this.capitalize.bind(this));
    this.register('truncate', this.truncate.bind(this));
    this.register('truncate_middle', this.truncate_middle.bind(this));
    this.register('slug', this.slug.bind(this));
    this.register('initials', this.initials.bind(this));
    this.register('mask', this.mask.bind(this));
    this.register('hex', this.hex.bind(this));
    this.register('tohex', this.hex.bind(this));
    this.register('unhex', this.unhex.bind(this));
    this.register('fromhex', this.unhex.bind(this));

    // HTML/Web formatters
    this.register('email', this.email.bind(this));
    this.register('phone', this.phone.bind(this));
    this.register('url', this.url.bind(this));
    this.register('badge', this.badge.bind(this));
    this.register('status', this.status.bind(this));
    this.register('status_text', this.status_text.bind(this));
    this.register('status_icon', this.status_icon.bind(this));
    this.register('boolean', this.boolean.bind(this));
    this.register('bool', this.boolean.bind(this));
    this.register('yesno', (v) => this.boolean(v, 'Yes', 'No'));
    this.register('yesnoicon', this.yesnoicon.bind(this));
    this.register('icon', this.icon.bind(this));
    this.register('avatar', this.avatar.bind(this));
    this.register('image', this.image.bind(this));
    this.register('tooltip', this.tooltip.bind(this));

    // Utility formatters
    this.register('default', this.default.bind(this));
    this.register('equals', this.equals.bind(this));
    this.register('json', this.json.bind(this));
    this.register('raw', (v) => v);
    this.register('custom', (v, fn) => typeof fn === 'function' ? fn(v) : v);
    this.register('iter', this.iter.bind(this));
    this.register('keys', (v) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        return Object.keys(v);
      }
      return null;
    });
    this.register('values', (v) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        return Object.values(v);
      }
      return null;
    });

    // Text/Content formatters
    this.register('plural', this.plural.bind(this));
    this.register('list', this.formatList.bind(this));
    this.register('duration', this.duration.bind(this));
    this.register('hash', this.hash.bind(this));
    this.register('stripHtml', this.stripHtml.bind(this));
    this.register('highlight', this.highlight.bind(this));
    this.register('pre', (v) => `<pre class="bg-light p-2 rounded border">${this.escapeHtml(String(v))}</pre>`);
  }

  /**
   * Register a custom formatter
   * @param {string} name - Formatter name
   * @param {Function} formatter - Formatter function
   * @returns {DataFormatter} This instance for chaining
   */
  register(name, formatter) {
    if (typeof formatter !== 'function') {
      throw new Error(`Formatter must be a function, got ${typeof formatter}`);
    }
    this.formatters.set(name.toLowerCase(), formatter);
    return this;
  }

  /**
   * Apply a formatter
   * @param {string} name - Formatter name
   * @param {*} value - Value to format
   * @param {...*} args - Additional arguments
   * @returns {*} Formatted value
   */
  apply(name, value, ...args) {
    try {
      const formatter = this.formatters.get(name.toLowerCase());
      if (!formatter) {
        console.warn(`Formatter '${name}' not found`);
        return value;
      }
      return formatter(value, ...args);
    } catch (error) {
      console.error(`Error in formatter '${name}':`, error);
      return value;
    }
  }

  /**
   * Process pipe string
   * @param {*} value - Value to format
   * @param {string} pipeString - Pipe string (e.g., "date('YYYY-MM-DD')|uppercase")
   * @param {object} context - Optional context for resolving variables in formatter arguments
   * @returns {*} Formatted value
   */
  pipe(value, pipeString, context = null) {
    if (!pipeString) return value;

    // Split by pipe and process each formatter
    const pipes = this.parsePipeString(pipeString, context);

    return pipes.reduce((currentValue, pipe) => {
      return this.apply(pipe.name, currentValue, ...pipe.args);
    }, value);
  }

  /**
   * Parse pipe string into formatter calls
   * @param {string} pipeString - Pipe string
   * @param {object} context - Optional context for resolving variables
   * @returns {Array} Array of {name, args} objects
   */
  parsePipeString(pipeString, context = null) {
    const pipes = [];
    const tokens = pipeString.split('|').map(s => s.trim());

    for (const token of tokens) {
      const parsed = this.parseFormatter(token, context);
      if (parsed) {
        pipes.push(parsed);
      }
    }

    return pipes;
  }

  /**
   * Parse individual formatter with arguments
   * Supports both syntaxes:
   *   - Parentheses: formatter('arg1', 'arg2', 3)
   *   - Colon: formatter:'arg1':'arg2':3
   *
   * @param {string} token - Formatter token
   * @param {object} context - Optional context for resolving variables
   * @returns {Object} {name, args} object
   */
  parseFormatter(token, context = null) {
    // Try parentheses syntax first: formatter(arg1, arg2)
    const parenMatch = token.match(/^([a-zA-Z_]\w*)\s*\((.*)\)$/);
    if (parenMatch) {
      const [, name, argsString] = parenMatch;
      const args = argsString ? this.parseArguments(argsString, context) : [];
      return { name, args };
    }

    // Try colon syntax: formatter:arg1:arg2
    const colonMatch = token.match(/^([a-zA-Z_]\w*)(?::(.+))?$/);
    if (colonMatch) {
      const [, name, argsString] = colonMatch;
      const args = argsString ? this.parseColonArguments(argsString, context) : [];
      return { name, args };
    }

    return null;
  }

  /**
   * Parse formatter arguments (comma-separated, parentheses syntax)
   * @param {string} argsString - Arguments string
   * @param {object} context - Optional context for resolving variables
   * @returns {Array} Parsed arguments
   */
  parseArguments(argsString, context = null) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = null;
    let depth = 0;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar && argsString[i - 1] !== '\\') {
        inQuotes = false;
        quoteChar = null;
        current += char;
      } else if (!inQuotes && char === '{') {
        depth++;
        current += char;
      } else if (!inQuotes && char === '}') {
        depth--;
        current += char;
      } else if (!inQuotes && depth === 0 && char === ',') {
        args.push(this.parseValue(current.trim(), context));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.parseValue(current.trim(), context));
    }

    return args;
  }

  /**
   * Parse formatter arguments (colon-separated syntax)
   * Handles quoted strings with colons inside them
   * @param {string} argsString - Arguments string
   * @param {object} context - Optional context for resolving variables
   * @returns {Array} Parsed arguments
   */
  parseColonArguments(argsString, context = null) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar && argsString[i - 1] !== '\\') {
        inQuotes = false;
        quoteChar = null;
        current += char;
      } else if (!inQuotes && char === ':') {
        args.push(this.parseValue(current.trim(), context));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.parseValue(current.trim(), context));
    }

    return args;
  }

  /**
   * Parse a single value
   * @param {string} value - Value string
   * @param {object} context - Optional context for resolving variables
   * @returns {*} Parsed value
   */
  parseValue(value, context = null) {
    // Remove quotes if present - quoted strings are always literals
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Boolean values
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    // Numbers
    if (!isNaN(value) && value !== '') {
      return Number(value);
    }

    // Objects
    if (value.startsWith('{') && value.endsWith('}')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // Not valid JSON, continue
      }
    }

    // Try to resolve from context if available
    // This allows: {{value|tooltip:title:'top'}} where title is a context variable
    // Also supports dot notation: {{value|tooltip:model.email}}
    if (context && this.isIdentifier(value)) {
      // For simple identifiers, try direct property access
      if (!value.includes('.')) {
        if (Object.prototype.hasOwnProperty.call(context, value)) {
          return context[value];
        }
      }

      // Try get() method (for Models/Views) - handles dot notation
      if (context.get && typeof context.get === 'function') {
        const contextValue = context.get(value);
        if (contextValue !== undefined) {
          return contextValue;
        }
      }
      // Try getContextValue() method - handles dot notation
      if (context.getContextValue && typeof context.getContextValue === 'function') {
        const contextValue = context.getContextValue(value);
        if (contextValue !== undefined) {
          return contextValue;
        }
      }

      // For dot notation on plain objects, use MOJOUtils
      if (value.includes('.')) {
        // Import MOJOUtils if needed for nested property access
        const MOJOUtils = window.MOJOUtils || (typeof require !== 'undefined' ? require('./MOJOUtils.js').default : null);
        if (MOJOUtils) {
          const contextValue = MOJOUtils.getNestedValue(context, value);
          if (contextValue !== undefined) {
            return contextValue;
          }
        }
      }
    }

    // Fall back to treating as literal string
    return value;
  }

  /**
   * Check if a value is a valid identifier (variable name or dot-notation path)
   * @param {string} value - Value to check
   * @returns {boolean} True if valid identifier or path
   */
  isIdentifier(value) {
    // Valid JavaScript identifier or dot notation path
    // Examples: "email", "model.email", "user.profile.name"
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(value);
  }

  // ============= Date/Time Formatters =============

  /**
   * Format date
   * @param {*} value - Date value
   * @param {string} format - Date format pattern
   * @returns {string} Formatted date
   */
  date(value, format = 'MM/DD/YYYY') {
    if (!value) return '';
    value = this.normalizeEpoch(value);
    let date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      // Handle date strings more carefully to avoid timezone issues
      // If it's a date-only string (YYYY-MM-DD), parse as local time
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(value);
      }
    } else {
      date = new Date(value);
    }

    if (isNaN(date.getTime())) return String(value);

    // Build replacements with placeholders to avoid corruption
    const tokens = {
      'YYYY': date.getFullYear(),
      'YY': String(date.getFullYear()).slice(-2),
      'MMMM': date.toLocaleDateString('en-US', { month: 'long' }),
      'MMM': date.toLocaleDateString('en-US', { month: 'short' }),
      'MM': String(date.getMonth() + 1).padStart(2, '0'),
      'M': date.getMonth() + 1,
      'dddd': date.toLocaleDateString('en-US', { weekday: 'long' }),
      'ddd': date.toLocaleDateString('en-US', { weekday: 'short' }),
      'DD': String(date.getDate()).padStart(2, '0'),
      'D': date.getDate()
    };

    // Replace tokens using a single pass with placeholders
    let result = format;
    const tokenPattern = new RegExp(`(${Object.keys(tokens).join('|')})`, 'g');
    result = result.replace(tokenPattern, (match) => tokens[match] || match);

    return result;
  }

  /**
   * Format time
   * @param {*} value - Time value
   * @param {string} format - Time format pattern
   * @returns {string} Formatted time
   */
  time(value, format = 'HH:mm:ss') {
    if (!value) return '';
    value = this.normalizeEpoch(value);
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);

    const hours = date.getHours();
    const replacements = {
      'HH': String(hours).padStart(2, '0'),
      'H': hours,
      'hh': String(hours % 12 || 12).padStart(2, '0'),
      'h': hours % 12 || 12,
      'mm': String(date.getMinutes()).padStart(2, '0'),
      'm': date.getMinutes(),
      'ss': String(date.getSeconds()).padStart(2, '0'),
      's': date.getSeconds(),
      'A': hours >= 12 ? 'PM' : 'AM',
      'a': hours >= 12 ? 'pm' : 'am'
    };

    let result = format;
    const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      result = result.replace(new RegExp(key, 'g'), replacements[key]);
    }

    return result;
  }

  /**
   * Format date and time
   * @param {*} value - DateTime value
   * @param {string} dateFormat - Date format
   * @param {string} timeFormat - Time format
   * @returns {string} Formatted datetime
   */
  datetime(value, dateFormat = 'MM/DD/YYYY', timeFormat = 'HH:mm:ss') {
    value = this.normalizeEpoch(value);
    const dateStr = this.date(value, dateFormat);
    const timeStr = this.time(value, timeFormat);
    return dateStr && timeStr ? `${dateStr} ${timeStr}` : '';
  }

  /**
   * Format date and time with short timezone abbreviation (e.g., EST, PDT)
   * @param {*} value - DateTime value
   * @param {string} dateFormat - Date format
   * @param {string} timeFormat - Time format
   * @param {Object} options - Options: { timeZone?: string, locale?: string }
   * @returns {string} Formatted datetime with timezone abbreviation
   */
  datetime_tz(value, dateFormat = 'MM/DD/YYYY', timeFormat = 'HH:mm:ss', options = {}) {
    if (!value) return '';
    value = this.normalizeEpoch(value);
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);

    const locale = (options && options.locale) || 'en-US';
    const timeZone = options && options.timeZone ? options.timeZone : undefined;

    // Helper: build short TZ abbreviation in the requested zone
    const getTzAbbr = () => {
      let abbr = '';
      try {
        const parts = new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
          ...(timeZone ? { timeZone } : {})
        }).formatToParts(date);
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        abbr = tzPart ? tzPart.value : '';

        // Try to avoid GMT offsets if browser returns them
        if (abbr && /^GMT[+-]/i.test(abbr)) {
          try {
            const parts2 = new Intl.DateTimeFormat(locale, {
              timeStyle: 'short',
              timeZoneName: 'short',
              ...(timeZone ? { timeZone } : {})
            }).formatToParts(date);
            const tz2 = parts2.find(p => p.type === 'timeZoneName');
            if (tz2 && tz2.value && !/^GMT[+-]/i.test(tz2.value)) {
              abbr = tz2.value;
            }
          } catch (e) { void 0; }
        }
        // Collapse long names like "Eastern Daylight Time" to initials "EDT"
        if (abbr && /\s/.test(abbr)) {
          const initials = abbr.split(/\s+/).map(w => w[0]).join('').toUpperCase();
          if (initials.length >= 2 && initials.length <= 4) {
            abbr = initials;
          }
        }
      } catch (e) {
        abbr = '';
      }
      return abbr;
    };

    // If no specific timeZone requested, fall back to existing date/time logic
    if (!timeZone) {
      const dateStr = this.date(date, dateFormat);
      const timeStr = this.time(date, timeFormat);
      const abbr = getTzAbbr();
      return dateStr && timeStr ? `${dateStr} ${timeStr} ${abbr}`.trim() : '';
    }

    // With a specific timeZone, generate tokens from Intl parts in that zone
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const get = (type) => {
      const p = parts.find(pt => pt.type === type);
      return p ? p.value : '';
    };

    const y4 = get('year');
    const M2 = get('month'); // '01'..'12'
    const D2 = get('day');   // '01'..'31'
    const H2 = get('hour');  // '00'..'23'
    const m2 = get('minute');
    const s2 = get('second');

    const M = M2 ? String(parseInt(M2, 10)) : '';
    const D = D2 ? String(parseInt(D2, 10)) : '';
    const H = H2 ? String(parseInt(H2, 10)) : '';
    const hNum = H2 ? ((parseInt(H2, 10) % 12) || 12) : '';
    const A = H2 ? (parseInt(H2, 10) >= 12 ? 'PM' : 'AM') : '';
    const a = A ? A.toLowerCase() : '';

    const monthLong = new Intl.DateTimeFormat(locale, { timeZone, month: 'long' }).format(date);
    const monthShort = new Intl.DateTimeFormat(locale, { timeZone, month: 'short' }).format(date);
    const weekdayLong = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(date);
    const weekdayShort = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short' }).format(date);

    const dateTokens = {
      'YYYY': y4,
      'YY': y4 ? y4.slice(-2) : '',
      'MMMM': monthLong,
      'MMM': monthShort,
      'MM': M2,
      'M': M,
      'dddd': weekdayLong,
      'ddd': weekdayShort,
      'DD': D2,
      'D': D
    };
    const timeTokens = {
      'HH': H2,
      'H': H,
      'hh': hNum !== '' ? String(hNum).padStart(2, '0') : '',
      'h': hNum !== '' ? String(hNum) : '',
      'mm': m2,
      'm': m2 ? String(parseInt(m2, 10)) : '',
      'ss': s2,
      's': s2 ? String(parseInt(s2, 10)) : '',
      'A': A,
      'a': a
    };

    const replaceTokens = (fmt, tokens) => {
      if (!fmt) return '';
      const pattern = new RegExp(`(${Object.keys(tokens).sort((a, b) => b.length - a.length).join('|')})`, 'g');
      return fmt.replace(pattern, (match) => tokens[match] ?? match);
    };

    const dateStr = replaceTokens(dateFormat, dateTokens);
    const timeStr = replaceTokens(timeFormat, timeTokens);
    const abbr = getTzAbbr();

    return dateStr && timeStr ? `${dateStr} ${timeStr} ${abbr}`.trim() : '';
  }

  normalizeEpoch(value) {
    if (typeof value !== "number") value = Number(value);

    // Check if the number is valid
    if (isNaN(value)) return '';

    // treat anything smaller than year 2000 in ms as seconds
    if (value < 1e11) {   // less than ~Sat Mar 03 1973 09:46:40 GMT
      return value * 1000; // seconds → ms
    } else if (value > 1e12 && value < 1e13) {
      return value; // already ms
    } else {
      throw new Error("Value doesn't look like epoch seconds or ms");
    }
  }

  /**
   * Format relative time
   * @param {*} value - Date value
   * @param {boolean} short - Use short format
   * @returns {string} Relative time string
   */
  relative(value, short = false) {
    if (!value) return '';
    value = this.normalizeEpoch(value);
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);

    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (short) {
      if (diffDays > 365) return Math.floor(diffDays / 365) + 'y';
      if (diffDays > 30) return Math.floor(diffDays / 30) + 'mo';
      if (diffDays > 7) return Math.floor(diffDays / 7) + 'w';
      if (diffDays > 0) return diffDays + 'd';
      if (diffHours > 0) return diffHours + 'h';
      if (diffMins > 0) return diffMins + 'm';
      return 'now';
    }

    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      return years + ' year' + (years > 1 ? 's' : '') + ' ago';
    }
    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return months + ' month' + (months > 1 ? 's' : '') + ' ago';
    }
    if (diffDays > 7) {
      const weeks = Math.floor(diffDays / 7);
      return weeks + ' week' + (weeks > 1 ? 's' : '') + ' ago';
    }
    if (diffDays === 1) return 'yesterday';
    if (diffDays > 0) return diffDays + ' days ago';
    if (diffHours > 0) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
    if (diffMins > 0) return diffMins + ' minute' + (diffMins > 1 ? 's' : '') + ' ago';
    if (diffSecs > 30) return diffSecs + ' seconds ago';

    return 'just now';
  }

  /**
   * Format ISO date
   * @param {*} value - Date value
   * @param {boolean} dateOnly - Return date only
   * @returns {string} ISO date string
   */
  iso(value, dateOnly = false) {
    if (!value) return '';
    value = this.normalizeEpoch(value);
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return String(value);

    if (dateOnly) {
      return date.toISOString().split('T')[0];
    }
    return date.toISOString();
  }

  // ============= Number Formatters =============

  /**
   * Format number
   * @param {*} value - Number value
   * @param {number} decimals - Decimal places
   * @param {string} locale - Locale string
   * @returns {string} Formatted number
   */
  number(value, decimals = 2, locale = 'en-US') {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);

    return num.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Format currency
   * @param {*} value - Number value in cents
   * @param {string} symbol - Currency symbol
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted currency
   */
  currency(value, symbol = '$', decimals = 2) {
    const num = parseInt(value);
    if (isNaN(num)) return String(value);

    // Convert cents to dollars using string manipulation to avoid floating point issues
    const centsStr = Math.abs(num).toString();
    const sign = num < 0 ? '-' : '';

    let dollars, cents;
    if (centsStr.length <= 2) {
      dollars = '0';
      cents = centsStr.padStart(2, '0');
    } else {
      dollars = centsStr.slice(0, -2);
      cents = centsStr.slice(-2);
    }

    // Add thousands separators to dollars part
    dollars = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Format based on requested decimals
    let formatted;
    if (decimals === 0) {
      // Round to nearest dollar
      const totalCents = parseInt(cents);
      if (totalCents >= 50) {
        dollars = (parseInt(dollars.replace(/,/g, '')) + 1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      formatted = dollars;
    } else if (decimals === 2) {
      formatted = `${dollars}.${cents}`;
    } else {
      // For other decimal places, truncate or pad cents as needed
      const adjustedCents = cents.slice(0, decimals).padEnd(decimals, '0');
      formatted = `${dollars}.${adjustedCents}`;
    }

    return sign + symbol + formatted;
  }

  /**
   * Format percentage
   * @param {*} value - Number value
   * @param {number} decimals - Decimal places
   * @param {boolean} multiply - Multiply by 100
   * @returns {string} Formatted percentage
   */
  percent(value, decimals = 0, multiply = true) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);

    const percent = multiply ? num * 100 : num;
    return this.number(percent, decimals) + '%';
  }

  /**
   * Format file size
   * @param {*} value - Size in bytes
   * @param {boolean} binary - Use binary units (1024)
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted file size
   */
  filesize(value, binary = false, decimals = 1) {
    const bytes = parseInt(value);
    if (isNaN(bytes)) return String(value);

    const units = binary ?
      ['B', 'KiB', 'MiB', 'GiB', 'TiB'] :
      ['B', 'KB', 'MB', 'GB', 'TB'];
    const divisor = binary ? 1024 : 1000;

    let size = bytes;
    let unitIndex = 0;

    while (size >= divisor && unitIndex < units.length - 1) {
      size /= divisor;
      unitIndex++;
    }

    const decimalPlaces = unitIndex === 0 ? 0 : decimals;
    return `${size.toFixed(decimalPlaces)} ${units[unitIndex]}`;
  }

  /**
   * Format ordinal number
   * @param {*} value - Number value
   * @param {boolean} suffixOnly - Return suffix only
   * @returns {string} Ordinal number
   */
  ordinal(value, suffixOnly = false) {
    const num = parseInt(value);
    if (isNaN(num)) return String(value);

    const j = num % 10;
    const k = num % 100;

    let suffix = 'th';
    if (j === 1 && k !== 11) suffix = 'st';
    else if (j === 2 && k !== 12) suffix = 'nd';
    else if (j === 3 && k !== 13) suffix = 'rd';

    return suffixOnly ? suffix : num + suffix;
  }

  /**
   * Format compact number
   * @param {*} value - Number value
   * @param {number} decimals - Decimal places
   * @returns {string} Compact number
   */
  compact(value, decimals = 1) {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);

    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (abs >= 1e9) {
      return sign + (abs / 1e9).toFixed(decimals) + 'B';
    }
    if (abs >= 1e6) {
      return sign + (abs / 1e6).toFixed(decimals) + 'M';
    }
    if (abs >= 1e3) {
      return sign + (abs / 1e3).toFixed(decimals) + 'K';
    }

    return String(num);
  }

  // ============= String Formatters =============

  /**
   * Capitalize string
   * @param {*} value - String value
   * @param {boolean} all - Capitalize all words (default: true). If false, only capitalizes first letter
   * @returns {string} Capitalized string
   */
  capitalize(value, all = true) {
    const str = String(value);
    if (!str) return '';

    if (all) {
      return str.replace(/\b\w/g, c => c.toUpperCase());
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Truncate string
   * @param {*} value - String value
   * @param {number} length - Max length
   * @param {string} suffix - Suffix to append
   * @returns {string} Truncated string
   */
  truncate(value, length = 50, suffix = '...') {
    const str = String(value);
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  }

  /**
   * Truncate string in the middle
   * @param {*} value - String value
   * @param {number} size - The total number of characters to keep (half for the start, half for the end).
   * @param {string} replace - The character(s) to use for the middle part.
   * @returns {string} Truncated string
   */
  truncate_middle(value, size = 8, replace = '***') {
    const str = String(value);
    if (str.length <= size) {
      return str;
    }

    const halfSize = Math.floor(size / 2);
    const front = str.substring(0, halfSize);
    const back = str.substring(str.length - halfSize);

    return `${front}${replace}${back}`;
  }

  /**
   * Create slug from string
   * @param {*} value - String value
   * @param {string} separator - Word separator
   * @returns {string} Slug
   */
  slug(value, separator = '-') {
    const str = String(value);
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, separator)
      .replace(new RegExp(`${separator}+`, 'g'), separator)
      .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');
  }

  /**
   * Get initials from string
   * @param {*} value - String value
   * @param {number} count - Number of initials
   * @returns {string} Initials
   */
  initials(value, count = 2) {
    const str = String(value);
    const words = str.split(/\s+/).filter(w => w.length > 0);
    return words
      .slice(0, count)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Mask string
   * @param {*} value - String value
   * @param {string} char - Mask character
   * @param {number} showLast - Number of chars to show at end
   * @returns {string} Masked string
   */
  mask(value, char = '*', showLast = 4) {
    const str = String(value);
    if (str.length <= showLast) return str;

    const masked = char.repeat(Math.max(0, str.length - showLast));
    const visible = str.slice(-showLast);
    return masked + visible;
  }

  // ============= HTML/Web Formatters =============

  /**
   * Format email
   * @param {*} value - Email value
   * @param {Object} options - Options
   * @returns {string} Formatted email
   */
  email(value, options = {}) {
    const email = String(value).trim();
    if (!email) return '';

    if (options.link === false) {
      return email;
    }

    const subject = options.subject ? `?subject=${encodeURIComponent(options.subject)}` : '';
    const body = options.body ? `&body=${encodeURIComponent(options.body)}` : '';
    const className = options.class ? ` class="${options.class}"` : '';

    return `<a href="mailto:${email}${subject}${body}"${className}>${email}</a>`;
  }

  /**
   * Format phone number
   * @param {*} value - Phone value
   * @param {string} format - Format type
   * @param {boolean} link - Create tel link
   * @returns {string} Formatted phone
   */
  phone(value, format = 'US', link = true) {
    let phone = String(value).replace(/\D/g, '');

    let formatted = phone;
    if (format === 'US') {
      if (phone.length === 10) {
        formatted = `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
      } else if (phone.length === 11 && phone[0] === '1') {
        formatted = `+1 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
      }
    }

    if (!link) {
      return formatted;
    }

    return `<a href="tel:${phone}">${formatted}</a>`;
  }

  /**
   * Format URL
   * @param {*} value - URL value
   * @param {string} text - Link text
   * @param {boolean} newWindow - Open in new window
   * @returns {string} Formatted URL
   */
  url(value, text = null, newWindow = true) {
    let url = String(value).trim();
    if (!url) return '';

    // Add protocol if missing
    if (!/^https?:\/\//.test(url)) {
      url = 'https://' + url;
    }

    const linkText = text || url;
    const target = newWindow ? ' target="_blank"' : '';
    const rel = newWindow ? ' rel="noopener noreferrer"' : '';

    return `<a href="${url}"${target}${rel}>${linkText}</a>`;
  }

  /**
   * Format as badge
   * @param {*} value - Badge text
   * @param {string} type - Badge type
   * @returns {string} Badge HTML
   */
  badge(value, type = 'auto') {
    // If the value is an array, map over it and create a badge for each item.
    if (Array.isArray(value)) {
      return value.map(item => this.badge(item, type)).join(' ');
    }

    const text = String(value);
    const badgeType = type === 'auto' ? this.inferBadgeType(text) : type;
    const className = badgeType ? `bg-${badgeType}` : 'bg-secondary';

    return `<span class="badge ${className}">${text}</span>`;
  }

  /**
   * Get badge CSS class for a value
   * @param {*} value - Value to get badge class for
   * @param {string} type - Badge type (optional, auto-detected if not specified)
   * @returns {string} Badge CSS class
   */
  badgeClass(value, type = 'auto') {
    const text = String(value);
    const badgeType = type === 'auto' ? this.inferBadgeType(text) : type;
    return badgeType ? `bg-${badgeType}` : 'bg-secondary';
  }

  /**
   * Infer badge type from text
   * @param {string} text - Badge text
   * @returns {string} Badge type
   */
  inferBadgeType(text) {
    const lowered = text.toLowerCase();
    if (['active', 'success', 'complete', 'completed', 'approved', 'done', 'true', 'on', 'yes'].includes(lowered)) return 'success';
    if (['error', 'failed', 'rejected', 'deleted', 'cancelled', 'false', 'off', 'no', 'declined'].includes(lowered)) return 'danger';
    if (['warning', 'pending', 'review', 'processing', 'uploading'].includes(lowered)) return 'warning';
    if (['info', 'new', 'draft'].includes(lowered)) return 'info';
    if (['inactive', 'disabled', 'archived', 'suspended'].includes(lowered)) return 'secondary';
    return 'secondary';
  }

  status(value) {
      return this._status(value);
  }

  status_icon(value) {
      return this._status(value, {}, {}, false, true);
  }

  status_text(value) {
      return this._status(value, {}, {}, true, false);
  }

  /**
   * Format status
   * @param {*} value - Status value
   * @param {Object} icons - Icon mapping
   * @param {Object} colors - Color mapping
   * @param {boolean} noIcons - Whether to include icons
   * @param {boolean} noText - Whether to include text
   * @returns {string} Status HTML
   */
  _status(value, icons = {}, colors = {}, noIcons = false, noText = false) {
    const status = String(value).toLowerCase();

    const defaultIcons = {
      'active': 'bi bi-check-circle-fill',
      'approved': 'bi bi-check-circle-fill',
      'declined': 'bi bi-x-circle-fill',
      'inactive': 'bi bi-pause-circle-fill',
      'pending': 'bi bi-clock-fill',
      'success': 'bi bi-check-circle-fill',
      'error': 'bi bi-exclamation-triangle-fill',
      'warning': 'bi bi-exclamation-triangle-fill'
    };

    const defaultColors = {
      'active': 'success',
      "approved": "success",
      "declined": "danger",
      'inactive': 'secondary',
      'pending': 'warning',
      'success': 'success',
      'error': 'danger',
      'warning': 'warning'
    };

    const iconClass = icons[status] || defaultIcons[status] || '';
    const color = colors[status] || defaultColors[status] || 'secondary';

    let icon = '';
    if (!noIcons && iconClass) {
      icon = `<i class="${iconClass}"></i>`;
    }
    let text = '';
    if (!noText) {
      text = value;
    }

    return `<span class="text-${color}">${icon}${icon ? ' ' : ''}${text}</span>`;
  }

  /**
   * Format boolean
   * @param {*} value - Boolean value
   * @param {string} trueText - Text for true
   * @param {string} falseText - Text for false
   * @returns {string} Boolean text
   */
  boolean(value, trueText = 'True', falseText = 'False', colored = false) {
    const text = value ? trueText : falseText;
    return colored ? `<span class="text-${value ? 'success' : 'danger'}">${text}</span>` : text;
  }

  /**
   * Format icon
   * @param {*} value - Icon key
   * @param {Object} mapping - Icon mapping
   * @returns {string} Icon HTML
   */
  icon(value, mapping = {}) {
    const key = String(value).toLowerCase();
    const icon = mapping[key] || '';
    return icon ? `<i class="${icon}"></i>` : '';
  }

  /**
   * Format boolean as a yes/no icon
   * @param {*} value - Boolean value
   * @returns {string} Icon HTML
   */
  yesnoicon(value, yesIcon = 'bi bi-check-circle-fill text-success', noIcon = 'bi bi-x-circle-fill text-danger') {
    if (value) { // Handles true, 1, "true", "on", etc.
      return `<i class="${yesIcon}"></i>`;
    }
    // Handles false, 0, "", null, undefined
    return `<i class="${noIcon}"></i>`;
  }

  /**
   * Format value as Bootstrap 5 image with optional rendition support
   * @param {string|object} value - URL string or file object with renditions
   * @param {string} rendition - Desired rendition (thumbnail, thumbnail_sm, etc.)
   * @param {string} classes - Additional CSS classes
   * @param {string} alt - Alt text for the image
   * @returns {string} Bootstrap image HTML
   */
  image(value, rendition = 'thumbnail', classes = 'img-fluid', alt = '') {
    const url = this._extractImageUrl(value, rendition);
    if (!url) return '';

    return `<img src="${url}" class="${classes}" alt="${alt}" />`;
  }

  /**
   * Format value as Bootstrap 5 avatar (circular image)
   * @param {string|object} value - URL string or file object with renditions
   * @param {string} size - Avatar size (xs, sm, md, lg, xl)
   * @param {string} classes - Additional CSS classes
   * @param {string} alt - Alt text for the avatar
   * @returns {string} Bootstrap avatar HTML
   */
  avatar(value, size = 'md', classes = 'rounded-circle', alt = '') {
    const url = this._extractImageUrl(value, 'square_sm') || GENERIC_AVATAR_SVG;

    // Bootstrap avatar sizing
    const sizeClasses = {
      'xs': 'width: 1.5rem; height: 1.5rem;',
      'sm': 'width: 2rem; height: 2rem;',
      'md': 'width: 3rem; height: 3rem;',
      'lg': 'width: 4rem; height: 4rem;',
      'xl': 'width: 5rem; height: 5rem;'
    };

    const sizeStyle = sizeClasses[size] || sizeClasses['md'];
    const baseClasses = 'object-fit-cover';
    const allClasses = `${baseClasses} ${classes}`.trim();

    return `<img src="${url}" class="${allClasses}" style="${sizeStyle}" alt="${alt}" />`;
  }

  /**
   * Tooltip formatter - wraps value with Bootstrap tooltip
   * Usage:
   *   {{value|tooltip:'Tooltip text'}}
   *   {{value|tooltip:'Help text':top}}
   *   {{value|tooltip:'Info':bottom:html}}
   *
   * @param {*} value - Value to display (not escaped, works with formatter chains)
   * @param {string} text - Tooltip text content
   * @param {string} placement - Tooltip placement: top, bottom, left, right (default: top)
   * @param {string} html - 'html' to allow HTML in tooltip (default: text only)
   * @returns {string} HTML with tooltip
   */
  tooltip(value, text = '', placement = 'top', html = '') {
    if (value === null || value === undefined) return '';

    // Don't escape value - it may be HTML from previous formatters in the chain
    const displayValue = String(value);
    const tooltipText = html === 'html' ? text : this.escapeHtml(text);
    const dataAttr = html === 'html' ? 'data-bs-html="true"' : '';

    return `<span data-bs-toggle="tooltip" data-bs-placement="${placement}" ${dataAttr} data-bs-title="${tooltipText}">${displayValue}</span>`;
  }

  /**
   * Helper method to extract image URL from string or file object
   * @param {string|object} value - URL string or file object with renditions
   * @param {string} preferredRendition - Preferred rendition name
   * @returns {string|null} Image URL or null if not found
   */
  _extractImageUrl(value, preferredRendition = 'thumbnail') {
    // Handle null/undefined
    if (!value) return null;

    // Handle string URL directly
    if (typeof value === 'string') {
      return value;
    }

    // Handle file object with renditions
    if (typeof value === 'object') {

      if (value.attributes) value = value.attributes;
      if (preferredRendition === "thumbnail" && value.thumbnail && typeof value.thumbnail === 'string') {
          return value.thumbnail;
      }
      // Check if it has renditions
      if (value.renditions && typeof value.renditions === 'object') {
        // Try to get preferred rendition
        const rendition = value.renditions[preferredRendition];
        if (rendition && rendition.url) {
          return rendition.url;
        }

        // Fallback to any available rendition
        const availableRenditions = Object.values(value.renditions);
        if (availableRenditions.length > 0 && availableRenditions[0].url) {
          return availableRenditions[0].url;
        }
      }

      // Fallback to original file URL
      if (value.url) {
        return value.url;
      }
    }

    return null;
  }

  // ============= Utility Formatters =============

  /**
   * Apply default value
   * @param {*} value - Value
   * @param {*} defaultValue - Default value
   * @returns {*} Value or default
   */
  default(value, defaultValue = '') {
    return value === null || value === undefined || value === '' ? defaultValue : value;
  }

  /**
   * Compare value and return one of two results based on equality
   * Useful for conditional CSS classes, text, or any conditional output
   * 
   * @param {*} value - Value to compare
   * @param {*} compareValue - Value to compare against
   * @param {*} trueResult - Result if values are equal
   * @param {*} falseResult - Result if values are not equal (optional, defaults to empty string)
   * @returns {*} trueResult or falseResult
   * 
   * @example
   * // CSS classes
   * {{status|equals:1:'text-success':'text-secondary'}}
   * {{model.state|equals:'active':'badge-success':'badge-secondary'}}
   * 
   * // Text output
   * {{role|equals:'admin':'Administrator':'User'}}
   * 
   * // Numbers
   * {{count|equals:0:'No items':'Has items'}}
   */
  equals(value, compareValue, trueResult, falseResult = '') {
    // Handle loose equality for common cases (1 == '1', true == 'true', etc.)
    // eslint-disable-next-line eqeqeq
    return value == compareValue ? trueResult : falseResult;
  }

  /**
   * Format as JSON
   * @param {*} value - Value to stringify
   * @param {number} indent - Indentation
   * @returns {string} JSON string
   */
  /**
   * Format pluralization based on count
   * @param {number} count - The count value
   * @param {string} singular - Singular form of the word
   * @param {string|null} plural - Plural form (defaults to singular + 's')
   * @param {boolean} includeCount - Whether to include the count in output
   * @returns {string} Formatted plural string
   */
  plural(count, singular, plural = null, includeCount = true) {
    if (count === null || count === undefined || singular === null || singular === undefined) {
      return includeCount ? `${count} ${singular}` : (singular || '');
    }

    const num = parseInt(count);
    if (isNaN(num)) {
      return includeCount ? `${count} ${singular}` : (singular || '');
    }

    const word = Math.abs(num) === 1 ? singular : (plural || singular + 's');
    return includeCount ? `${num} ${word}` : word;
  }

  /**
   * Format array as a human-readable list
   * @param {Array} array - Array to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted list string
   */
  formatList(array, options = {}) {
    if (!Array.isArray(array)) {
      return String(array);
    }

    const { conjunction = 'and', limit = null, moreText = 'others' } = options;

    if (array.length === 0) return '';
    if (array.length === 1) return String(array[0]);

    let items = array.slice();
    let hasMore = false;

    if (limit && array.length > limit) {
      items = array.slice(0, limit);
      hasMore = true;
    }

    if (hasMore) {
      const remaining = array.length - limit;
      return `${items.join(', ')}, ${conjunction} ${remaining} ${moreText}`;
    }

    if (items.length === 2) {
      return `${items[0]} ${conjunction} ${items[1]}`;
    }

    return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
  }

  /**
   * Format duration in milliseconds to human-readable format
   * @param {number} milliseconds - Duration in milliseconds
   * @param {Object} options - Formatting options
   * @returns {string} Formatted duration string
   */
  duration(milliseconds, options = {}) {
    const { short = false, precision = 2 } = options;

    if (milliseconds === null || milliseconds === undefined) return '';

    const ms = parseInt(milliseconds);
    if (isNaN(ms)) return String(milliseconds);

    const units = [
      { name: 'day', short: 'd', value: 86400000 },
      { name: 'hour', short: 'h', value: 3600000 },
      { name: 'minute', short: 'm', value: 60000 },
      { name: 'second', short: 's', value: 1000 }
    ];

    if (ms === 0) return short ? '0s' : '0 seconds';

    const absMs = Math.abs(ms);
    const sign = ms < 0 ? '-' : '';
    const parts = [];
    let remaining = absMs;

    for (const unit of units) {
      if (remaining >= unit.value) {
        const count = Math.floor(remaining / unit.value);
        remaining = remaining % unit.value;

        const unitName = short ? unit.short : (count === 1 ? unit.name : unit.name + 's');
        parts.push(short ? `${count}${unitName}` : `${count} ${unitName}`);

        if (parts.length >= precision) break;
      }
    }

    if (parts.length === 0) {
      return short ? `${Math.round(absMs)}ms` : `${Math.round(absMs)} milliseconds`;
    }

    return sign + (short ? parts.join('') : parts.join(' '));
  }

  /**
   * Format long strings/IDs with truncation
   * @param {string} value - Value to format
   * @param {number} length - Maximum length before truncation
   * @param {string} prefix - Prefix to add
   * @param {string} suffix - Suffix for truncated strings
   * @returns {string} Formatted hash string
   */
  hash(value, length = 8, prefix = '', suffix = '...') {
    if (value === null || value === undefined) return '';

    const str = String(value);
    if (str.length <= length) return prefix + str;
    return prefix + str.substring(0, length) + suffix;
  }

  /**
   * Strip HTML tags from text
   * @param {string} html - HTML string to strip
   * @returns {string} Plain text without HTML tags
   */
  stripHtml(html) {
    if (html === null || html === undefined) return '';
    return String(html).replace(/<[^>]*>/g, '');
  }

  /**
   * Highlight search terms in text
   * @param {string} text - Text to search in
   * @param {string} searchTerm - Term to highlight
   * @param {string} className - CSS class for highlighting
   * @returns {string} Text with highlighted terms
   */
  highlight(text, searchTerm, className = 'highlight') {
    if (text === null || text === undefined || !searchTerm) {
      return String(text || '');
    }

    const escapedTerm = String(searchTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return String(text).replace(regex, `<mark class="${className}">$1</mark>`);
  }

  /**
   * Encode a value as a hex string.
   * - Strings are encoded as UTF-8 bytes, then hex-encoded
   * - Numbers are converted to base-16 (padded to even length)
   * - Uint8Array/ArrayBuffer/number[] are treated as bytes
   *
   * @param {*} value - The value to encode
   * @param {boolean} uppercase - Uppercase hex letters (A-F)
   * @param {boolean} withPrefix - Prefix with '0x'
   * @returns {string} Hex string
   */
  hex(value, uppercase = false, withPrefix = false) {
    if (value === null || value === undefined) return '';

    let hexStr = '';

    const toHexFromBytes = (bytes) =>
      Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

    if (typeof value === 'number') {
      let hex = Math.abs(Math.trunc(value)).toString(16);
      if (hex.length % 2) hex = '0' + hex;
      hexStr = hex;
    } else if (value instanceof Uint8Array) {
      hexStr = toHexFromBytes(value);
    } else if (value instanceof ArrayBuffer) {
      hexStr = toHexFromBytes(new Uint8Array(value));
    } else if (Array.isArray(value) && value.every(n => typeof n === 'number')) {
      hexStr = toHexFromBytes(Uint8Array.from(value.map(n => n & 0xFF)));
    } else {
      // Treat everything else as string and encode to UTF-8
      const enc = new TextEncoder();
      const bytes = enc.encode(String(value));
      hexStr = toHexFromBytes(bytes);
    }

    if (uppercase) hexStr = hexStr.toUpperCase();
    return (withPrefix ? '0x' : '') + hexStr;
  }

  /**
   * Decode a hex string into UTF-8 text.
   * Accepts optional '0x' prefix and ignores whitespace.
   *
   * @param {string} value - Hex string
   * @returns {string} Decoded UTF-8 string (or original value on parse error)
   */
  unhex(value) {
    if (value === null || value === undefined) return '';

    let str = String(value).trim();
    if (str.startsWith('0x') || str.startsWith('0X')) str = str.slice(2);
    str = str.replace(/\s+/g, '');

    if (str.length === 0) return '';

    // If odd length, pad with leading zero
    if (str.length % 2 !== 0) str = '0' + str;

    const bytes = new Uint8Array(str.length / 2);
    for (let i = 0; i < str.length; i += 2) {
      const byte = parseInt(str.slice(i, i + 2), 16);
      if (Number.isNaN(byte)) {
        return String(value);
      }
      bytes[i / 2] = byte;
    }

    try {
      const dec = new TextDecoder();
      return dec.decode(bytes);
    } catch (e) {
      // Fallback if TextDecoder is unavailable
      let text = '';
      for (const b of bytes) text += String.fromCharCode(b);
      return text;
    }
  }

  json(value, indent = 2) {
    try {
      return JSON.stringify(value, null, indent);
    } catch (e) {
      return String(value);
    }
  }

  /**
   * Check if formatter exists
   * @param {string} name - Formatter name
   * @returns {boolean} True if exists
   */
  has(name) {
    return this.formatters.has(name.toLowerCase());
  }

  /**
   * Remove a formatter
   * @param {string} name - Formatter name
   * @returns {boolean} True if removed
   */
  unregister(name) {
    return this.formatters.delete(name.toLowerCase());
  }

  /**
   * Get all formatter names
   * @returns {Array} Formatter names
   */
  listFormatters() {
    return Array.from(this.formatters.keys()).sort();
  }

  iter(v) {
      if (v === null || v === undefined) {
        return [];
      }

      // If it's already an array, return as-is
      if (Array.isArray(v)) {
        return v;
      }

      // If it's an object, convert to key-value pairs
      if (typeof v === 'object') {
        return Object.entries(v).map(([key, value]) => ({
          key: key,
          value: value
        }));
      }

      // For primitive values, wrap in array with single item
      return [{ key: '0', value: v }];
  }
}

// Create singleton instance
const dataFormatter = new DataFormatter();
window.dataFormatter = dataFormatter;

// Export both class and instance
export { DataFormatter };
export default dataFormatter;
