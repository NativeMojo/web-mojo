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
    this.register('capitalize', this.capitalize.bind(this));
    this.register('truncate', this.truncate.bind(this));
    this.register('truncate_middle', this.truncate_middle.bind(this));
    this.register('slug', this.slug.bind(this));
    this.register('initials', this.initials.bind(this));
    this.register('mask', this.mask.bind(this));

    // HTML/Web formatters
    this.register('email', this.email.bind(this));
    this.register('phone', this.phone.bind(this));
    this.register('url', this.url.bind(this));
    this.register('badge', this.badge.bind(this));
    this.register('status', this.status.bind(this));
    this.register('boolean', this.boolean.bind(this));
    this.register('bool', this.boolean.bind(this));
    this.register('yesno', (v) => this.boolean(v, 'Yes', 'No'));
    this.register('yesnoicon', this.yesnoicon.bind(this));
    this.register('icon', this.icon.bind(this));
    this.register('avatar', this.avatar.bind(this));
    this.register('image', this.image.bind(this));

    // Utility formatters
    this.register('default', this.default.bind(this));
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
   * @returns {*} Formatted value
   */
  pipe(value, pipeString) {
    if (!pipeString) return value;

    // Split by pipe and process each formatter
    const pipes = this.parsePipeString(pipeString);

    return pipes.reduce((currentValue, pipe) => {
      return this.apply(pipe.name, currentValue, ...pipe.args);
    }, value);
  }

  /**
   * Parse pipe string into formatter calls
   * @param {string} pipeString - Pipe string
   * @returns {Array} Array of {name, args} objects
   */
  parsePipeString(pipeString) {
    const pipes = [];
    const tokens = pipeString.split('|').map(s => s.trim());

    for (const token of tokens) {
      const parsed = this.parseFormatter(token);
      if (parsed) {
        pipes.push(parsed);
      }
    }

    return pipes;
  }

  /**
   * Parse individual formatter with arguments
   * @param {string} token - Formatter token
   * @returns {Object} {name, args} object
   */
  parseFormatter(token) {
    // Match formatter with optional arguments
    const match = token.match(/^([a-zA-Z_]\w*)\s*(?:\((.*)\))?$/);
    if (!match) return null;

    const [, name, argsString] = match;
    const args = argsString ? this.parseArguments(argsString) : [];

    return { name, args };
  }

  /**
   * Parse formatter arguments
   * @param {string} argsString - Arguments string
   * @returns {Array} Parsed arguments
   */
  parseArguments(argsString) {
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
        args.push(this.parseValue(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.parseValue(current.trim()));
    }

    return args;
  }

  /**
   * Parse a single value
   * @param {string} value - Value string
   * @returns {*} Parsed value
   */
  parseValue(value) {
    // Remove quotes if present
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
        // Not valid JSON, return as string
      }
    }

    return value;
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
  datetime(value, dateFormat = 'MM/DD/YYYY', timeFormat = 'HH:mm') {
    value = this.normalizeEpoch(value);
    const dateStr = this.date(value, dateFormat);
    const timeStr = this.time(value, timeFormat);
    return dateStr && timeStr ? `${dateStr} ${timeStr}` : '';
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

  /**
   * Format status
   * @param {*} value - Status value
   * @param {Object} icons - Icon mapping
   * @param {Object} colors - Color mapping
   * @returns {string} Status HTML
   */
  status(value, icons = {}, colors = {}) {
    const status = String(value).toLowerCase();

    const defaultIcons = {
      'active': '✓',
      'inactive': '✗',
      'pending': '⏳',
      'success': '✓',
      'error': '✗',
      'warning': '⚠'
    };

    const defaultColors = {
      'active': 'success',
      'inactive': 'secondary',
      'pending': 'warning',
      'success': 'success',
      'error': 'danger',
      'warning': 'warning'
    };

    const icon = icons[status] || defaultIcons[status] || '';
    const color = colors[status] || defaultColors[status] || 'secondary';

    return `<span class="text-${color}">${icon}${icon ? ' ' : ''}${value}</span>`;
  }

  /**
   * Format boolean
   * @param {*} value - Boolean value
   * @param {string} trueText - Text for true
   * @param {string} falseText - Text for false
   * @returns {string} Boolean text
   */
  boolean(value, trueText = 'True', falseText = 'False') {
    return value ? trueText : falseText;
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
