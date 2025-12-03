/**
 * DjangoLookups - Utility for Django-style filter lookup parsing and formatting
 * 
 * Provides utilities to parse filter keys like "status__in" or "created__gte"
 * and format them into human-readable display text for filter pills.
 * 
 * @example
 * parseFilterKey('status__in')  // { field: 'status', lookup: 'in' }
 * formatFilterDisplay('status__in', 'new,open', 'Status')  // "Status in 'new', 'open'"
 */

/**
 * Supported Django-style lookups with display configurations
 * Only includes commonly used lookups (KISS principle)
 */
export const LOOKUPS = {
  // Comparison
  'exact': { 
    display: 'is',
    description: 'Exact match'
  },
  'in': { 
    display: 'in',
    description: 'Match any of the values (comma-separated)'
  },
  'not': { 
    display: 'is not',
    description: 'Does not match'
  },
  'not_in': { 
    display: 'not in',
    description: 'Does not match any of the values'
  },
  'gt': { 
    display: '>',
    description: 'Greater than'
  },
  'gte': { 
    display: '>=',
    description: 'Greater than or equal to'
  },
  'lt': { 
    display: '<',
    description: 'Less than'
  },
  'lte': { 
    display: '<=',
    description: 'Less than or equal to'
  },
  
  // String operations
  'contains': { 
    display: 'contains',
    description: 'Contains substring (case-sensitive)'
  },
  'icontains': { 
    display: 'contains',
    description: 'Contains substring (case-insensitive)'
  },
  'startswith': { 
    display: 'starts with',
    description: 'Starts with substring (case-sensitive)'
  },
  'istartswith': { 
    display: 'starts with',
    description: 'Starts with substring (case-insensitive)'
  },
  'endswith': { 
    display: 'ends with',
    description: 'Ends with substring (case-sensitive)'
  },
  'iendswith': { 
    display: 'ends with',
    description: 'Ends with substring (case-insensitive)'
  },
  
  // Null checks
  'isnull': { 
    display: (val) => val === 'true' || val === true ? 'is null' : 'is not null',
    description: 'Check if value is null or not'
  },
  
  // Range operations
  'range': { 
    display: 'between',
    description: 'Between two values (comma-separated)'
  }
};

/**
 * Parse a filter key into field name and lookup operator
 * 
 * @param {string} paramKey - Filter parameter key (e.g., "status__in", "created__gte")
 * @returns {Object} Object with field and lookup properties
 * 
 * @example
 * parseFilterKey('status__in')  // { field: 'status', lookup: 'in' }
 * parseFilterKey('status')      // { field: 'status', lookup: null }
 * parseFilterKey('user__profile__name__icontains')  // { field: 'user__profile__name', lookup: 'icontains' }
 */
export function parseFilterKey(paramKey) {
  if (!paramKey || typeof paramKey !== 'string') {
    return { field: paramKey, lookup: null };
  }

  const parts = paramKey.split('__');
  
  // Single part, no lookup
  if (parts.length === 1) {
    return { field: paramKey, lookup: null };
  }
  
  // Check if last part is a valid lookup
  const possibleLookup = parts[parts.length - 1];
  if (LOOKUPS[possibleLookup]) {
    return { 
      field: parts.slice(0, -1).join('__'), 
      lookup: possibleLookup 
    };
  }
  
  // No valid lookup found, treat entire string as field name
  return { field: paramKey, lookup: null };
}

/**
 * Format a filter key and value into human-readable display text
 * 
 * @param {string} paramKey - Filter parameter key (e.g., "status__in")
 * @param {string|Array} value - Filter value(s)
 * @param {string} label - Human-readable field label
 * @returns {string} Formatted display text
 * 
 * @example
 * formatFilterDisplay('status__in', 'new,open', 'Status')  
 * // "Status in 'new', 'open'"
 * 
 * formatFilterDisplay('created__gte', '2025-01-01', 'Created')  
 * // "Created >= '2025-01-01'"
 * 
 * formatFilterDisplay('name__icontains', 'john', 'Name')  
 * // "Name contains 'john'"
 */
export function formatFilterDisplay(paramKey, value, label) {
  if (!paramKey || value === null || value === undefined) {
    return '';
  }

  const { field, lookup } = parseFilterKey(paramKey);
  const lookupDef = LOOKUPS[lookup];
  
  // Convert array to comma-separated string if needed
  const valueStr = Array.isArray(value) ? value.join(',') : String(value);
  
  // No lookup or exact lookup - simple "is" format
  if (!lookup || lookup === 'exact') {
    return `${label} is '${valueStr}'`;
  }
  
  // Multi-value lookups (in, not_in)
  if (lookup === 'in' || lookup === 'not_in') {
    const values = valueStr.split(',').map(v => v.trim()).filter(v => v);
    if (values.length === 0) {
      return `${label} ${lookupDef.display}`;
    }
    const formattedValues = values.map(v => `'${v}'`).join(', ');
    return `${label} ${lookupDef.display} ${formattedValues}`;
  }
  
  // Range lookup - special formatting
  if (lookup === 'range') {
    const values = valueStr.split(',').map(v => v.trim()).filter(v => v);
    if (values.length === 2) {
      return `${label} between '${values[0]}' and '${values[1]}'`;
    }
    return `${label} ${lookupDef.display} '${valueStr}'`;
  }
  
  // Null check - dynamic display based on value
  if (lookup === 'isnull') {
    const displayText = typeof lookupDef.display === 'function' 
      ? lookupDef.display(valueStr) 
      : lookupDef.display;
    return `${label} ${displayText}`;
  }
  
  // Standard lookup with operator
  if (lookupDef) {
    return `${label} ${lookupDef.display} '${valueStr}'`;
  }
  
  // Fallback for unknown lookups
  return `${label} is '${valueStr}'`;
}

/**
 * Get a user-friendly description of a lookup operator
 * 
 * @param {string} lookup - Lookup operator (e.g., "in", "gte", "icontains")
 * @returns {string} Human-readable description
 * 
 * @example
 * getLookupDescription('in')  // "Match any of the values (comma-separated)"
 * getLookupDescription('gte')  // "Greater than or equal to"
 */
export function getLookupDescription(lookup) {
  const lookupDef = LOOKUPS[lookup];
  return lookupDef ? lookupDef.description : 'Exact match';
}

/**
 * Check if a string is a valid lookup operator
 * 
 * @param {string} lookup - Potential lookup operator
 * @returns {boolean} True if valid lookup
 * 
 * @example
 * isValidLookup('in')  // true
 * isValidLookup('foo')  // false
 */
export function isValidLookup(lookup) {
  return lookup && LOOKUPS.hasOwnProperty(lookup);
}

/**
 * Get all available lookup operators
 * 
 * @returns {Array<string>} Array of lookup operator names
 * 
 * @example
 * getAvailableLookups()  // ['exact', 'in', 'not', 'not_in', 'gt', ...]
 */
export function getAvailableLookups() {
  return Object.keys(LOOKUPS);
}

/**
 * Build a filter key from field name and lookup operator
 * 
 * @param {string} field - Field name
 * @param {string} lookup - Lookup operator (optional)
 * @returns {string} Combined filter key
 * 
 * @example
 * buildFilterKey('status', 'in')  // "status__in"
 * buildFilterKey('status')        // "status"
 */
export function buildFilterKey(field, lookup = null) {
  if (!field) return '';
  if (!lookup) return field;
  return `${field}__${lookup}`;
}

export default {
  LOOKUPS,
  parseFilterKey,
  formatFilterDisplay,
  getLookupDescription,
  isValidLookup,
  getAvailableLookups,
  buildFilterKey
};
