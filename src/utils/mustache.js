/**
 * MOJO Mustache - Clean ES6 Template Engine
 * Simplified mustache implementation for MOJO Framework
 * Based on mustache.js logic-less templates
 */

// Utility functions
const objectToString = Object.prototype.toString;
const isArray = Array.isArray || function(obj) {
  return objectToString.call(obj) === '[object Array]';
};

const isFunction = function(obj) {
  return typeof obj === 'function';
};

const isObject = function(obj) {
  return obj != null && typeof obj === 'object';
};

const escapeHtml = function(string) {
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return String(string).replace(/[&<>"'`=\/]/g, function(s) {
    return entityMap[s];
  });
};

// Scanner class for parsing templates
class Scanner {
  constructor(string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  eos() {
    return this.tail === '';
  }

  scan(re) {
    const match = this.tail.match(re);
    if (!match || match.index !== 0) {
      return '';
    }

    const string = match[0];
    this.tail = this.tail.substring(string.length);
    this.pos += string.length;
    return string;
  }

  scanUntil(re) {
    const index = this.tail.search(re);
    let match;

    switch (index) {
      case -1:
        match = this.tail;
        this.tail = '';
        break;
      case 0:
        match = '';
        break;
      default:
        match = this.tail.substring(0, index);
        this.tail = this.tail.substring(index);
    }

    this.pos += match.length;
    return match;
  }
}

// Context class for variable resolution
class Context {
  constructor(view, parentContext) {
    this.view = view;
    this.cache = { '.': this.view };
    this.parent = parentContext;
  }

  push(view) {
    return new Context(view, this);
  }

  lookup(name) {
    const cache = this.cache;

    let value;
    if (cache.hasOwnProperty(name)) {
      value = cache[name];
    } else {
      let context = this;
      let intermediateValue;
      let names;
      let index;
      let lookupHit = false;

      while (context) {
        // Check if view has a get method for unified access
        if (context.view && typeof context.view.get === 'function') {
          try {
            intermediateValue = context.view.get(name);
            if (intermediateValue !== undefined) {
              lookupHit = true;
            }
          } catch (e) {
            // If get throws, fall back to standard lookup
            lookupHit = false;
          }
        }
        
        // Fall back to standard property lookup if get method didn't work
        if (!lookupHit) {
          if (name.indexOf('.') > 0) {
            intermediateValue = context.view;
            names = name.split('.');
            index = 0;

            while (intermediateValue != null && index < names.length) {
              // Check if intermediate value has a get method
              if (intermediateValue && typeof intermediateValue.get === 'function' && index < names.length) {
                try {
                  const remainingPath = names.slice(index).join('.');
                  intermediateValue = intermediateValue.get(remainingPath);
                  index = names.length; // Skip to end
                } catch (e) {
                  // Fall back to property access
                  if (index === names.length - 1) {
                    lookupHit = (
                      hasProperty(intermediateValue, names[index]) ||
                      primitiveHasOwnProperty(intermediateValue, names[index])
                    );
                  }
                  intermediateValue = intermediateValue[names[index++]];
                }
              } else {
                if (index === names.length - 1) {
                  lookupHit = (
                    hasProperty(intermediateValue, names[index]) ||
                    primitiveHasOwnProperty(intermediateValue, names[index])
                  );
                }
                intermediateValue = intermediateValue[names[index++]];
              }
            }
          } else {
            intermediateValue = context.view[name];
            lookupHit = hasProperty(context.view, name);
          }
        }

        if (lookupHit) {
          value = intermediateValue;
          break;
        }

        context = context.parent;
      }

      cache[name] = value;
    }

    if (isFunction(value)) value = value.call(this.view);

    return value;
  }
}

// Helper functions
function hasProperty(obj, propName) {
  return obj != null && typeof obj === 'object' && (propName in obj);
}

function primitiveHasOwnProperty(primitive, propName) {
  return (
    primitive != null &&
    typeof primitive !== 'object' &&
    primitive.hasOwnProperty &&
    primitive.hasOwnProperty(propName)
  );
}

// Writer class for rendering
class Writer {
  constructor() {
    this.templateCache = new Map();
  }

  clearCache() {
    this.templateCache.clear();
  }

  parse(template, tags) {
    tags = tags || ['{{', '}}'];
    
    const cacheKey = template + ':' + tags.join(':');
    let tokens = this.templateCache.get(cacheKey);

    if (tokens == null) {
      tokens = this.parseTemplate(template, tags);
      this.templateCache.set(cacheKey, tokens);
    }

    return tokens;
  }

  parseTemplate(template, tags) {
    if (!template) return [];

    const openingTag = tags[0];
    const closingTag = tags[1];
    const scanner = new Scanner(template);
    const tokens = [];
    let start, type, value, chr, token;
    
    const openingTagRe = new RegExp(escapeRegExp(openingTag) + '\\s*');
    const closingTagRe = new RegExp('\\s*' + escapeRegExp(closingTag));
    const closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + closingTag));

    while (!scanner.eos()) {
      start = scanner.pos;

      // Match text before tags
      value = scanner.scanUntil(openingTagRe);

      if (value) {
        for (let i = 0; i < value.length; ++i) {
          chr = value.charAt(i);
          
          if (chr === '\n') {
            tokens.push(['text', chr]);
          } else {
            tokens.push(['text', chr]);
          }
        }
      }

      if (!scanner.scan(openingTagRe)) break;

      type = scanner.scan(/[#^\/>{&=!]/);
      if (!type) type = 'name';

      scanner.scan(/\s*/);

      if (type === '=') {
        value = scanner.scanUntil(/\s*=/);
        scanner.scan(/\s*=/);
        scanner.scanUntil(closingTagRe);
      } else if (type === '{') {
        value = scanner.scanUntil(closingCurlyRe);
        scanner.scan(closingCurlyRe);
        type = '&';
      } else {
        value = scanner.scanUntil(closingTagRe);
      }

      scanner.scan(closingTagRe);

      if (type === '#' || type === '^') {
        token = [type, value, start, scanner.pos];
        tokens.push(token);
      } else if (type === '/') {
        // Find matching opening section
        let openSection;
        for (let i = tokens.length - 1; i >= 0; --i) {
          if (tokens[i][0] === '#' || tokens[i][0] === '^') {
            if (tokens[i][1] === value) {
              openSection = tokens[i];
              break;
            }
          }
        }
        
        if (openSection) {
          // Add closing position if token doesn't have it yet
          if (openSection.length === 4) {
            openSection.push(scanner.pos);
          }
        }
        // Add closing token for nestSections processing
        tokens.push([type, value, start, scanner.pos]);
      } else {
        tokens.push([type, value, start, scanner.pos]);
      }
    }

    return this.nestSections(this.squashTokens(tokens));
  }

  squashTokens(tokens) {
    const squashedTokens = [];
    let token, lastToken;

    for (let i = 0; i < tokens.length; ++i) {
      token = tokens[i];

      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          squashedTokens.push(token);
          lastToken = token;
        }
      }
    }

    return squashedTokens;
  }

  nestSections(tokens) {
    const nestedTokens = [];
    let collector = nestedTokens;
    const sections = [];

    for (let i = 0; i < tokens.length; ++i) {
      const token = tokens[i];

      switch (token[0]) {
        case '#':
        case '^':
          // Create section token with proper structure: [type, name, start, end, children, closing]
          const sectionToken = [
            token[0],           // type ('#' or '^')
            token[1],           // section name
            token[2],           // start position
            token[3],           // end position after opening tag
            [],                 // children array
            token[4] || null    // closing position (if set during parsing)
          ];
          
          collector.push(sectionToken);
          sections.push(sectionToken);
          collector = sectionToken[4]; // children array
          break;
        case '/':
          const section = sections.pop();
          if (section) {
            // Set closing position
            section[5] = token[2];
            // Return to parent collector
            collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
          }
          break;
        default:
          collector.push(token);
      }
    }

    return nestedTokens;
  }

  render(template, view, partials, config) {
    const tags = this.getConfigTags(config) || ['{{', '}}'];
    const tokens = this.parse(template, tags);
    return this.renderTokens(tokens, new Context(view), partials, template, config);
  }

  renderTokens(tokens, context, partials, originalTemplate, config) {
    let buffer = '';

    for (let i = 0; i < tokens.length; ++i) {
      const token = tokens[i];
      let value;

      switch (token[0]) {
        case '#':
          value = context.lookup(token[1]);
          if (!value) continue;

          // Ensure we have child tokens
          const childTokens = token[4];
          if (!childTokens || !isArray(childTokens)) {
            console.warn(`MUSTACHE WARNING - Section ${token[1]} has no child tokens:`, token);
            continue;
          }

          if (isArray(value)) {
            // Process each array item
            for (let j = 0; j < value.length; ++j) {
              const itemContext = context.push(value[j]);
              const itemResult = this.renderTokens(childTokens, itemContext, partials, originalTemplate, config);
              buffer += itemResult;
            }
          } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
            buffer += this.renderTokens(childTokens, context.push(value), partials, originalTemplate, config);
          } else if (isFunction(value)) {
            const text = originalTemplate == null ? null : originalTemplate.slice(token[3], token[5]);
            value = value.call(context.view, text, (template) => this.render(template, context.view, partials, config));
            if (value != null) buffer += value;
          } else if (value) {
            // Handle boolean true and other truthy values
            buffer += this.renderTokens(childTokens, context, partials, originalTemplate, config);
          }
          break;

        case '^':
          value = context.lookup(token[1]);
          if (!value || (isArray(value) && value.length === 0)) {
            // Ensure we have child tokens for inverted sections too
            const childTokens = token[4];
            if (childTokens && isArray(childTokens)) {
              buffer += this.renderTokens(childTokens, context, partials, originalTemplate, config);
            }
          }
          break;

        case '>':
          if (!partials) continue;
          value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
          if (value != null) {
            buffer += this.render(value, context.view, partials, config);
          }
          break;

        case '&':
          value = context.lookup(token[1]);
          if (value != null) buffer += value;
          break;

        case 'name':
          value = context.lookup(token[1]);
          if (value != null) buffer += escapeHtml(value);
          break;

        case 'text':
          buffer += token[1];
          break;
      }
    }

    return buffer;
  }

  getConfigTags(config) {
    if (isObject(config) && isArray(config.tags)) {
      return config.tags;
    }
    return null;
  }
}

function escapeRegExp(string) {
  return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
}

// Default writer instance
const defaultWriter = new Writer();

// Main Mustache object
const Mustache = {
  name: 'MOJO Mustache',
  version: '1.0.0',
  tags: ['{{', '}}'],

  Scanner,
  Context,
  Writer,

  escape: escapeHtml,

  clearCache() {
    return defaultWriter.clearCache();
  },

  parse(template, tags) {
    return defaultWriter.parse(template, tags);
  },

  render(template, view, partials, config) {
    if (typeof template !== 'string') {
      throw new TypeError('Invalid template! Template should be a "string"');
    }
    return defaultWriter.render(template, view, partials, config);
  }
};

// ES6 Module Export
export default Mustache;