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

        // Collapsible long messages — check after markdown renders
        this._setupCollapsibleMessage();

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
                } else if (block.type === 'action') {
                    this._renderActionBlock(block, wrapper);
                } else if (block.type === 'list') {
                    this._renderListBlock(block, wrapper);
                } else if (block.type === 'alert') {
                    this._renderAlertBlock(block, wrapper);
                } else if (block.type === 'progress') {
                    this._renderProgressBlock(block, wrapper);
                } else if (block.type === 'file') {
                    this._renderFileBlock(block, wrapper);
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
            // PieChart is native SVG — no canvas sizing issues, renders fine
            // even in hidden containers.
            const { default: PieChart } = await import('../../charts/PieChart.js');
            const chartView = new PieChart({
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
            // SeriesChart is native SVG — no canvas sizing issues.
            const { default: SeriesChart } = await import('../../charts/SeriesChart.js');
            const chartView = new SeriesChart({
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
     * Render an action confirmation card with buttons.
     * @private
     */
    _renderActionBlock(block, container) {
        const esc = this._escapeHtml.bind(this);
        const card = document.createElement('div');
        card.className = 'assistant-action-card';

        card.innerHTML = `
            <div class="assistant-action-header">${esc(block.title || 'Action Required')}</div>
            ${block.description ? `<div class="assistant-action-desc">${esc(block.description)}</div>` : ''}
            <div class="assistant-action-buttons"></div>
        `;

        const btnRow = card.querySelector('.assistant-action-buttons');
        const actions = block.actions || [];

        actions.forEach((action, index) => {
            const btn = document.createElement('button');
            btn.className = index === 0 ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-secondary';
            btn.textContent = action.label;
            btn.addEventListener('click', () => {
                // Replace buttons with confirmation text
                btnRow.innerHTML = `
                    <div class="assistant-action-chosen-label">
                        <i class="bi bi-check-circle-fill me-1"></i>
                        You chose: <strong>${esc(action.label)}</strong>
                    </div>
                `;

                // Send choice via WS
                const app = this.getApp();
                if (app?.ws?.isConnected) {
                    app.ws.send({
                        type: 'assistant_action',
                        conversation_id: this.message._conversationId,
                        action_id: block.action_id,
                        value: action.value
                    });
                }
            });
            btnRow.appendChild(btn);
        });

        container.appendChild(card);
    }

    /**
     * Render a key/value detail list card.
     * @private
     */
    _renderListBlock(block, container) {
        const esc = this._escapeHtml.bind(this);
        const card = document.createElement('div');
        card.className = 'assistant-list-card';

        let html = '';
        if (block.title) {
            html += `<div class="assistant-list-title">${esc(block.title)}</div>`;
        }
        html += '<dl class="assistant-list-items">';
        (block.items || []).forEach(item => {
            html += `
                <div class="assistant-list-row">
                    <dt>${esc(item.label)}</dt>
                    <dd>${esc(String(item.value ?? ''))}</dd>
                </div>`;
        });
        html += '</dl>';
        card.innerHTML = html;
        container.appendChild(card);
    }

    /**
     * Render a severity-colored alert banner.
     * @private
     */
    _renderAlertBlock(block, container) {
        const esc = this._escapeHtml.bind(this);
        const level = block.level || 'info';
        const icons = { info: 'bi-info-circle-fill', success: 'bi-check-circle-fill', warning: 'bi-exclamation-triangle-fill', error: 'bi-x-circle-fill' };
        const bsClass = { info: 'alert-info', success: 'alert-success', warning: 'alert-warning', error: 'alert-danger' };

        const alert = document.createElement('div');
        alert.className = `assistant-alert alert ${bsClass[level] || 'alert-info'}`;
        alert.innerHTML = `
            <i class="bi ${icons[level] || icons.info} me-2"></i>
            <div class="assistant-alert-content">
                ${block.title ? `<strong>${esc(block.title)}</strong>` : ''}
                <div>${esc(block.message || '')}</div>
            </div>
        `;
        container.appendChild(alert);
    }

    /**
     * Render a multi-step progress tracker.
     * @private
     */
    _renderProgressBlock(block, container) {
        const esc = this._escapeHtml.bind(this);
        const steps = block.steps || [];
        const doneCount = steps.filter(s => s.status === 'done').length;
        const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'assistant-progress-card';
        if (block.plan_id) card.dataset.planId = block.plan_id;

        let stepsHtml = '';
        const statusIcons = { pending: 'bi-circle', in_progress: 'bi-arrow-repeat', done: 'bi-check-circle-fill', skipped: 'bi-slash-circle' };

        steps.forEach(step => {
            stepsHtml += `
                <div class="assistant-progress-step step-${step.status}" data-step-id="${step.id}">
                    <i class="bi ${statusIcons[step.status] || statusIcons.pending} step-icon"></i>
                    <div class="step-content">
                        <span class="step-description">${esc(step.description)}</span>
                        ${step.summary ? `<span class="step-summary">${esc(step.summary)}</span>` : ''}
                    </div>
                </div>`;
        });

        card.innerHTML = `
            <div class="assistant-progress-header">
                <span class="assistant-progress-title">${esc(block.title || 'Plan')}</span>
                <span class="assistant-progress-counter">${doneCount} of ${steps.length}</span>
            </div>
            <div class="progress" style="height: 4px; margin-bottom: 10px;">
                <div class="progress-bar" role="progressbar" style="width: ${pct}%"></div>
            </div>
            <div class="assistant-progress-steps">${stepsHtml}</div>
        `;
        container.appendChild(card);
    }

    /**
     * Render a downloadable file attachment card.
     * @private
     */
    _renderFileBlock(block, container) {
        if (!block.filename || !block.url) {
            console.warn('File block missing required fields (filename, url). type:', block.type);
            return;
        }

        // URL scheme validation — prevent javascript:, data:, and protocol-relative XSS
        let url;
        try {
            const parsed = new URL(block.url, window.location.href);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                console.warn('File block URL rejected (invalid scheme).');
                return;
            }
            url = block.url;
        } catch {
            console.warn('File block URL rejected (unparseable).');
            return;
        }

        const esc = this._escapeHtml.bind(this);
        const formatIcons = {
            csv: 'bi-filetype-csv',
            xlsx: 'bi-file-earmark-spreadsheet',
            pdf: 'bi-filetype-pdf',
            json: 'bi-filetype-json'
        };
        const icon = formatIcons[block.format] || 'bi-file-earmark-arrow-down';

        const card = document.createElement('a');
        card.className = 'assistant-file-card';
        card.href = url;
        card.download = block.filename;
        card.target = '_blank';
        card.rel = 'noopener';

        // Split metadata: file stats (size, rows) vs expiry
        const stats = [];
        if (block.size != null) stats.push(this._formatBytes(block.size));
        if (block.row_count != null) stats.push(`${Number(block.row_count).toLocaleString()} rows`);

        card.innerHTML = `
            <span class="assistant-file-icon">
                <i class="bi ${icon}"></i>
            </span>
            <div class="assistant-file-info">
                <span class="assistant-file-name">${esc(block.filename)}</span>
                ${stats.length ? `<span class="assistant-file-stats">${stats.join(' · ')}</span>` : ''}
                ${block.expires_in ? `<span class="assistant-file-expiry"><i class="bi bi-clock me-1"></i>${esc(block.expires_in)}</span>` : ''}
            </div>
            <span class="assistant-file-download" title="Download">
                <i class="bi bi-download"></i>
            </span>
        `;

        container.appendChild(card);
    }

    /**
     * Format byte count to human-readable string.
     * @private
     */
    _formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    /**
     * Update a single step inside an existing progress block (called from WS events).
     * @param {string} planId
     * @param {number} stepId
     * @param {string} status
     * @param {string|null} summary
     */
    updateProgressStep(planId, stepId, status, summary) {
        const card = this.element?.querySelector(`[data-plan-id="${planId}"]`);
        if (!card) return;

        const statusIcons = { pending: 'bi-circle', in_progress: 'bi-arrow-repeat', done: 'bi-check-circle-fill', skipped: 'bi-slash-circle' };
        const row = card.querySelector(`[data-step-id="${stepId}"]`);
        if (row) {
            row.className = `assistant-progress-step step-${status}`;
            const icon = row.querySelector('.step-icon');
            if (icon) icon.className = `bi ${statusIcons[status] || statusIcons.pending} step-icon`;

            let summaryEl = row.querySelector('.step-summary');
            if (summary) {
                if (!summaryEl) {
                    summaryEl = document.createElement('span');
                    summaryEl.className = 'step-summary';
                    row.querySelector('.step-content').appendChild(summaryEl);
                }
                summaryEl.textContent = summary;
            }
        }

        // Update counter and progress bar
        const allSteps = card.querySelectorAll('.assistant-progress-step');
        const doneCount = card.querySelectorAll('.step-done').length;
        const counter = card.querySelector('.assistant-progress-counter');
        if (counter) counter.textContent = `${doneCount} of ${allSteps.length}`;
        const bar = card.querySelector('.progress-bar');
        if (bar) bar.style.width = `${allSteps.length > 0 ? Math.round((doneCount / allSteps.length) * 100) : 0}%`;
    }

    /**
     * Add expand/collapse toggle for long assistant messages.
     * @private
     */
    _setupCollapsibleMessage() {
        if (this.message.role !== 'assistant') return;

        const textEl = this.element?.querySelector('.message-text');
        if (!textEl || !textEl.textContent.trim()) return;

        // Use requestAnimationFrame to measure after layout
        requestAnimationFrame(() => {
            const MAX_HEIGHT = 300;
            if (textEl.scrollHeight <= MAX_HEIGHT) return;

            textEl.classList.add('message-collapsed');
            textEl.style.setProperty('--collapse-height', MAX_HEIGHT + 'px');

            const toggle = document.createElement('button');
            toggle.className = 'message-expand-toggle';
            toggle.innerHTML = '<i class="bi bi-chevron-down me-1"></i>Show more';
            toggle.addEventListener('click', () => {
                const collapsed = textEl.classList.toggle('message-collapsed');
                toggle.innerHTML = collapsed
                    ? '<i class="bi bi-chevron-down me-1"></i>Show more'
                    : '<i class="bi bi-chevron-up me-1"></i>Show less';
            });

            textEl.parentNode.insertBefore(toggle, textEl.nextSibling);
        });
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
