/**
 * HtmlPreview — sandboxed HTML preview as a View.
 *
 * Used by `Modal.htmlPreview()` to render arbitrary HTML inside a
 * sandboxed `<iframe>` with a Refresh control. The iframe write happens
 * in `onAfterMount` because `iframe.contentDocument` is only reachable
 * after the element is attached to the DOM.
 */

import View from '@core/View.js';

class HtmlPreview extends View {
    constructor(options = {}) {
        super({ tagName: 'div', className: 'mojo-html-preview', ...options });
        this.html = options.html || options.content || '';
        this.height = options.height || 500;
    }

    async getTemplate() {
        return `
      <div class="html-preview-container">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <small class="text-muted">Preview (sandboxed)</small>
          <button type="button" class="btn btn-sm btn-outline-secondary" data-action="refresh">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
        <iframe
          class="border rounded w-100 mojo-html-preview-frame"
          style="height: ${this.height}px; background: white;"
          sandbox="allow-same-origin"
          frameborder="0"
        ></iframe>
      </div>
    `;
    }

    async onAfterMount() {
        await super.onAfterMount();
        this._writeIframe();
    }

    onActionRefresh() {
        this._writeIframe();
    }

    _writeIframe() {
        const iframe = this.element?.querySelector('.mojo-html-preview-frame');
        if (!iframe) return;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        doc.open();
        doc.write(this.html);
        doc.close();
    }

    setHtml(html) {
        this.html = html;
        this._writeIframe();
    }
}

export default HtmlPreview;
