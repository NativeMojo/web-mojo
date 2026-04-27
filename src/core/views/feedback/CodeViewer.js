/**
 * CodeViewer — syntax-highlighted code block as a View.
 *
 * Used by `Modal.code()` to render arbitrary source code with optional
 * Prism.js highlighting and a VS Code-flavored dark theme. Falls back
 * to escaped plain text when Prism is not loaded.
 */

import View from '@core/View.js';

const CODE_STYLES = `
  max-height: 60vh;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1.25rem;
  border-radius: 0.5rem;
  margin: 0;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  border: 1px solid #2d2d30;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
`.replace(/\s+/g, ' ').trim();

const PRISM_OVERRIDES = `
  .dialog-code-block .token.comment { color: #6a9955; }
  .dialog-code-block .token.string { color: #ce9178; }
  .dialog-code-block .token.keyword { color: #569cd6; }
  .dialog-code-block .token.function { color: #dcdcaa; }
  .dialog-code-block .token.number { color: #b5cea8; }
  .dialog-code-block .token.operator { color: #d4d4d4; }
  .dialog-code-block .token.class-name { color: #4ec9b0; }
  .dialog-code-block .token.punctuation { color: #d4d4d4; }
  .dialog-code-block .token.boolean { color: #569cd6; }
  .dialog-code-block .token.property { color: #9cdcfe; }
  .dialog-code-block .token.tag { color: #569cd6; }
  .dialog-code-block .token.attr-name { color: #9cdcfe; }
  .dialog-code-block .token.attr-value { color: #ce9178; }
  .dialog-code-block ::selection { background: #264f78; }
`;

class CodeViewer extends View {
    constructor(options = {}) {
        super({ tagName: 'div', className: 'mojo-code-viewer', ...options });
        this.code = options.code || '';
        this.language = options.language || 'javascript';
    }

    async getTemplate() {
        return CodeViewer.formatCode(this.code, this.language);
    }

    /**
     * Format `code` as a highlighted HTML block. Returns a string suitable
     * for embedding directly into a modal body.
     */
    static formatCode(code, language = 'javascript') {
        let highlighted;

        if (window.Prism && window.Prism.languages[language]) {
            highlighted = window.Prism.highlight(code, window.Prism.languages[language], language);
        } else {
            highlighted = String(code)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        const prismClass = window.Prism ? `language-${language}` : '';

        return `
      <style>${PRISM_OVERRIDES}</style>
      <pre class="${prismClass} dialog-code-block" style="${CODE_STYLES}">
        <code class="${prismClass}" style="color: inherit; background: transparent; text-shadow: none;">${highlighted}</code>
      </pre>
    `;
    }

    /**
     * Trigger Prism highlighting on already-rendered `<code>` blocks under
     * `container`. No-op when Prism isn't loaded.
     */
    static highlightCodeBlocks(container = document) {
        if (window.Prism && window.Prism.highlightAllUnder) {
            window.Prism.highlightAllUnder(container);
        }
    }
}

export default CodeViewer;
