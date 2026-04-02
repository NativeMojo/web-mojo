import ChatMessageView from '@core/views/chat/ChatMessageView.js';
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

/**
 * AssistantMessageView - Extended message view for assistant responses
 *
 * Renders structured data blocks inline within chat messages:
 * - table blocks → TableView (inline collection, no pagination)
 * - chart blocks → SeriesChart or PieChart via setData()
 * - stat blocks → Bootstrap card row
 */
class AssistantMessageView extends ChatMessageView {
    constructor(options = {}) {
        super(options);
        this._blockViews = [];
        this._needsMarkdown = this.message.role === 'assistant' && !!this.message.content;
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Render markdown → HTML for assistant messages
        if (this._needsMarkdown) {
            this._needsMarkdown = false;
            await this._renderMarkdown();
        }

        if (!this.message.blocks || this.message.blocks.length === 0) return;

        const blocksContainer = this.element.querySelector(
            `[data-container="blocks-${this.message.id || this.id}"]`
        );
        if (!blocksContainer) return;

        for (let i = 0; i < this.message.blocks.length; i++) {
            const block = this.message.blocks[i];
            const wrapper = document.createElement('div');
            wrapper.className = 'assistant-block mb-3';
            blocksContainer.appendChild(wrapper);

            try {
                if (block.type === 'table') {
                    await this._renderTableBlock(block, wrapper);
                } else if (block.type === 'chart') {
                    await this._renderChartBlock(block, wrapper);
                } else if (block.type === 'stat') {
                    this._renderStatBlock(block, wrapper);
                }
            } catch (err) {
                console.error('Failed to render block:', block.type, err);
                const errEl = document.createElement('div');
                errEl.className = 'alert alert-warning small';
                errEl.textContent = `Failed to render ${block.type} block`;
                wrapper.appendChild(errEl);
            }
        }
    }

    /**
     * Create a collapsible card wrapper for a block.
     * Returns { body, onShow } — append content into body.
     * onShow(callback) registers a one-time callback for when the collapse first opens,
     * useful for rendering charts that need visible dimensions.
     * @private
     */
    _createCollapsibleCard(container, { icon, title, subtitle }) {
        const collapseId = `block-${this.message.id || this.id}-${++AssistantMessageView._blockCounter}`;
        const esc = this._escapeHtml.bind(this);

        const card = document.createElement('div');
        card.className = 'assistant-collapsible-block';
        card.innerHTML = `
            <a class="assistant-block-toggle collapsed" data-bs-toggle="collapse"
               href="#${collapseId}" role="button" aria-expanded="false">
                <span class="assistant-block-toggle-icon">
                    <i class="bi ${icon}"></i>
                </span>
                <span class="assistant-block-toggle-text">
                    <span class="assistant-block-toggle-title">${esc(title || 'Data')}</span>
                    ${subtitle ? `<span class="assistant-block-toggle-subtitle">${esc(subtitle)}</span>` : ''}
                </span>
                <i class="bi bi-chevron-down assistant-block-chevron"></i>
            </a>
            <div class="collapse" id="${collapseId}">
                <div class="assistant-block-body"></div>
            </div>
        `;
        container.appendChild(card);

        const collapseEl = card.querySelector('.collapse');
        let showCallbacks = [];

        // Fire callbacks once when collapse is fully shown (elements are visible + sized)
        collapseEl.addEventListener('shown.bs.collapse', () => {
            showCallbacks.forEach(cb => cb());
            showCallbacks = [];
        }, { once: true });

        return {
            body: card.querySelector('.assistant-block-body'),
            onShow: (cb) => showCallbacks.push(cb)
        };
    }

    /**
     * Render a table block using TableView inside a collapsible card
     * @private
     */
    async _renderTableBlock(block, container) {
        const { default: TableView } = await import('@core/views/table/TableView.js');

        const rowCount = (block.rows || []).length;
        const colCount = (block.columns || []).length;
        const { body } = this._createCollapsibleCard(container, {
            icon: 'bi-table',
            title: block.title || 'Table',
            subtitle: `${rowCount} rows · ${colCount} columns`
        });

        const columns = (block.columns || []).map(col => {
            if (typeof col === 'string') return { key: col, label: col };
            return col;
        });
        const columnKeys = columns.map(c => c.key);

        const models = (block.rows || []).map((row, idx) => {
            const data = { id: idx };
            columnKeys.forEach((key, ci) => {
                data[key] = row[ci] !== undefined ? row[ci] : '';
            });
            return new Model(data);
        });

        const collection = new Collection({ preloaded: true });
        collection.add(models);

        const tableView = new TableView({
            collection,
            columns,
            paginated: false,
            sortable: false,
            searchable: false,
            filterable: false,
            showRefresh: false,
            showAdd: false
        });

        this._blockViews.push(tableView);
        this.addChild(tableView);
        body.appendChild(tableView.element);
        tableView.render(false);
    }

    /**
     * Render a chart block using MiniPieChart or MiniSeriesChart inside a collapsible card
     * @private
     */
    async _renderChartBlock(block, container) {
        const chartType = block.chart_type || 'line';
        const chartIcons = { line: 'bi-graph-up', bar: 'bi-bar-chart-fill', pie: 'bi-pie-chart-fill', area: 'bi-graph-up' };
        const chartLabels = { line: 'Line Chart', bar: 'Bar Chart', pie: 'Pie Chart', area: 'Area Chart' };

        const seriesCount = (block.series || []).length;
        const pointCount = block.labels?.length || 0;
        const isPie = chartType === 'pie';

        const { body, onShow } = this._createCollapsibleCard(container, {
            icon: chartIcons[chartType] || 'bi-graph-up',
            title: block.title || chartLabels[chartType] || 'Chart',
            subtitle: isPie
                ? `${pointCount} segments`
                : `${seriesCount} series · ${pointCount} points`
        });

        const chartContainer = document.createElement('div');
        chartContainer.className = 'assistant-chart-body';
        body.appendChild(chartContainer);

        const chartData = {
            labels: block.labels || [],
            datasets: (block.series || []).map(s => ({
                label: s.name,
                data: s.values
            }))
        };

        if (isPie) {
            // MiniPieChart is SVG-based — no Chart.js canvas sizing issues.
            // Render immediately (works fine in hidden containers).
            const { default: MiniPieChart } = await import('../../charts/MiniPieChart.js');
            const chartView = new MiniPieChart({
                width: 180,
                height: 180,
                legendPosition: 'right',
                data: chartData
            });

            this._blockViews.push(chartView);
            this.addChild(chartView);
            chartContainer.appendChild(chartView.element);
            chartView.render(false);
        } else {
            // MiniSeriesChart is SVG-based — no Chart.js canvas sizing issues.
            const { default: MiniSeriesChart } = await import('../../charts/MiniSeriesChart.js');
            const chartView = new MiniSeriesChart({
                chartType: chartType === 'area' ? 'line' : chartType,
                fill: chartType === 'area',
                height: 200,
                legendPosition: 'top',
                data: chartData
            });

            this._blockViews.push(chartView);
            this.addChild(chartView);
            chartContainer.appendChild(chartView.element);
            chartView.render(false);
        }
    }

    /**
     * Render a stat block as Bootstrap cards
     * @private
     */
    _renderStatBlock(block, container) {
        const items = block.items || [];
        const row = document.createElement('div');
        row.className = 'd-flex flex-wrap gap-2';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'assistant-stat-card card';
            card.innerHTML = `
                <div class="card-body text-center py-2 px-3">
                    <div class="text-muted small">${this._escapeHtml(item.label)}</div>
                    <div class="fw-bold fs-5">${this._escapeHtml(String(item.value))}</div>
                </div>
            `;
            row.appendChild(card);
        });

        container.appendChild(row);
    }

    /**
     * Render markdown content via the docit API, with frontend fallback.
     * @private
     */
    async _renderMarkdown() {
        const textEl = this.element?.querySelector('.message-text');
        if (!textEl) return;

        const raw = this.message.content;
        try {
            const app = this.getApp();
            const resp = await app.rest.post('/api/docit/render', { markdown: raw });
            const html = resp?.data?.data?.html || resp?.data?.html;
            if (html) {
                textEl.innerHTML = html;
                return;
            }
        } catch (_e) {
            // API unavailable — use frontend fallback
        }
        textEl.innerHTML = AssistantMessageView.markdownToHtml(raw);
    }

    /**
     * Escape HTML to prevent XSS in stat blocks
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Lightweight markdown → HTML for LLM assistant responses.
     * Handles the common patterns: headings, bold, italic, code,
     * horizontal rules, bullet lists, and paragraphs.
     * @static
     */
    static markdownToHtml(text) {
        // Escape HTML first to prevent XSS
        const div = document.createElement('div');
        div.textContent = text;
        let html = div.innerHTML;

        // Code blocks (``` ... ```)
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g,
            (_m, _lang, code) => `<pre class="assistant-code-block"><code>${code.trim()}</code></pre>`);

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code class="assistant-inline-code">$1</code>');

        // Headings (###, ##, #)
        html = html.replace(/^### (.+)$/gm, '<h6 class="assistant-heading mt-3 mb-1">$1</h6>');
        html = html.replace(/^## (.+)$/gm, '<h5 class="assistant-heading mt-3 mb-1">$1</h5>');
        html = html.replace(/^# (.+)$/gm, '<h4 class="assistant-heading mt-3 mb-2">$1</h4>');

        // Horizontal rules
        html = html.replace(/^---+$/gm, '<hr class="my-2 opacity-25">');

        // Bold + italic
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Bullet lists — collect consecutive lines starting with "- "
        html = html.replace(/((?:^- .+$\n?)+)/gm, (match) => {
            const items = match.trim().split('\n').map(line => {
                const content = line.replace(/^- /, '');
                return `<li>${content}</li>`;
            }).join('');
            return `<ul class="assistant-list mb-2">${items}</ul>`;
        });

        // Paragraphs — convert double newlines to paragraph breaks
        html = html.replace(/\n{2,}/g, '</p><p>');
        // Remaining single newlines to <br>
        html = html.replace(/\n/g, '<br>');
        // Wrap in paragraph
        html = `<p>${html}</p>`;
        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        // Don't wrap block elements in <p>
        html = html.replace(/<p>\s*(<h[456]|<hr|<ul|<pre|<\/ul>|<\/pre>)/g, '$1');
        html = html.replace(/(<\/h[456]>|<hr[^>]*>|<\/ul>|<\/pre>)\s*<\/p>/g, '$1');

        return html;
    }
}

AssistantMessageView._blockCounter = 0;

export default AssistantMessageView;
