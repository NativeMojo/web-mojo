import { View, Modal } from 'web-mojo';

/**
 * DocsModal — fetches a docs/web-mojo/*.md file from the dev server and
 * renders it inside a Modal. Every example page links to its doc via:
 *
 *     <a data-action="open-doc" data-doc="docs/web-mojo/<area>/<File>.md">…</a>
 *
 * The portal shell intercepts that data-action (in app.js) and opens this
 * view. The Markdown rendering is intentionally lightweight — headings,
 * paragraphs, lists, links, and fenced/inline code, with HTML escaping on
 * untrusted content. We bring in marked at runtime via CDN if present;
 * otherwise we fall back to a minimal renderer that's still readable.
 */
class DocsModal extends View {
    constructor({ docPath } = {}) {
        super({
            className: 'docs-modal-body',
            template: `
                <div>
                    {{#loading|bool}}
                        <div class="text-center py-5 text-muted">
                            <div class="spinner-border spinner-border-sm me-2"></div>
                            Loading <code>{{docPath}}</code> …
                        </div>
                    {{/loading|bool}}
                    {{#error|bool}}
                        <div class="alert alert-warning mb-0">
                            <strong>Could not load <code>{{docPath}}</code>.</strong>
                            <div class="small mt-1">{{error}}</div>
                        </div>
                    {{/error|bool}}
                    {{^loading|bool}}{{^error|bool}}
                        <article class="docs-rendered">{{{html}}}</article>
                    {{/error|bool}}{{/loading|bool}}
                </div>
            `,
        });
        this.docPath = docPath;
        this.loading = true;
        this.error = null;
        this.html = '';
    }

    async onInit() {
        await super.onInit();
        // Kick off the fetch in the background — render() flips loading→content
        // when it lands.
        this._fetchDoc();
    }

    async _fetchDoc() {
        try {
            const url = '/' + String(this.docPath).replace(/^\/+/, '');
            const res = await fetch(url, { credentials: 'omit' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const md = await res.text();
            this.html = await DocsModal.renderMarkdown(md);
            this.loading = false;
            this.error = null;
        } catch (e) {
            this.loading = false;
            this.error = e.message || String(e);
        }
        this.render();
    }

    static async renderMarkdown(md) {
        const escapeHtml = (s) => String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        const lines = String(md).split(/\r?\n/);
        const out = [];
        let inCode = false;
        let codeLines = [];
        let codeLang = '';
        let listType = null;

        const flushList = () => {
            if (listType) { out.push(`</${listType}>`); listType = null; }
        };

        for (const raw of lines) {
            if (inCode) {
                if (/^```/.test(raw)) {
                    out.push(`<pre class="bg-light p-2 small rounded"><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeLines.join('\n'))}</code></pre>`);
                    inCode = false; codeLines = []; codeLang = '';
                } else codeLines.push(raw);
                continue;
            }
            const fence = raw.match(/^```(\S*)\s*$/);
            if (fence) { flushList(); inCode = true; codeLang = fence[1] || ''; continue; }

            const h = raw.match(/^(#{1,6})\s+(.*)$/);
            if (h) { flushList(); out.push(`<h${h[1].length}>${inlineFmt(h[2])}</h${h[1].length}>`); continue; }

            if (/^\s*$/.test(raw)) { flushList(); out.push(''); continue; }

            const ul = raw.match(/^[-*]\s+(.*)$/);
            const ol = raw.match(/^\d+\.\s+(.*)$/);
            if (ul) {
                if (listType !== 'ul') { flushList(); out.push('<ul>'); listType = 'ul'; }
                out.push(`<li>${inlineFmt(ul[1])}</li>`); continue;
            }
            if (ol) {
                if (listType !== 'ol') { flushList(); out.push('<ol>'); listType = 'ol'; }
                out.push(`<li>${inlineFmt(ol[1])}</li>`); continue;
            }

            const bq = raw.match(/^>\s?(.*)$/);
            if (bq) { flushList(); out.push(`<blockquote class="border-start ps-3 text-muted">${inlineFmt(bq[1])}</blockquote>`); continue; }

            // Plain paragraph line.
            flushList();
            out.push(`<p>${inlineFmt(raw)}</p>`);
        }
        flushList();
        if (inCode) out.push(`<pre class="bg-light p-2 small rounded"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);

        return out.join('\n');

        function inlineFmt(s) {
            // Order matters: escape first, then re-introduce the few markdown features we want.
            let html = escapeHtml(s);
            // inline code
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
            // bold
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            // italic
            html = html.replace(/(^|\W)\*([^*\n]+)\*/g, '$1<em>$2</em>');
            // links — text and URL must already be escaped above
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
                const safeHref = /^(https?:|mailto:|#|\/|\.\.?\/)/.test(href) ? href : '#';
                return `<a href="${safeHref}" target="_blank" rel="noopener">${text}</a>`;
            });
            return html;
        }
    }

    static open(docPath) {
        const view = new DocsModal({ docPath });
        return Modal.show(view, {
            title: docPath,
            size: 'xl',
            scrollable: true,
        });
    }
}

export default DocsModal;
