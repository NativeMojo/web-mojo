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
    }

    async onAfterRender() {
        await super.onAfterRender();

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
     * Render a table block using TableView
     * @private
     */
    async _renderTableBlock(block, container) {
        const { default: TableView } = await import('@core/views/table/TableView.js');

        // Build models from rows using column names as keys
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

        if (block.title) {
            const title = document.createElement('div');
            title.className = 'fw-semibold small mb-1';
            title.textContent = block.title;
            container.appendChild(title);
        }

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
        container.appendChild(tableView.element);
        tableView.render(false);
    }

    /**
     * Render a chart block using SeriesChart or PieChart
     * @private
     */
    async _renderChartBlock(block, container) {
        const chartType = block.chart_type || 'line';

        if (block.title) {
            const title = document.createElement('div');
            title.className = 'fw-semibold small mb-1';
            title.textContent = block.title;
            container.appendChild(title);
        }

        const chartContainer = document.createElement('div');
        chartContainer.style.height = '250px';
        container.appendChild(chartContainer);

        // Build Chart.js data format
        const chartData = {
            labels: block.labels || [],
            datasets: (block.series || []).map(s => ({
                label: s.name,
                data: s.values
            }))
        };

        let chartView;
        if (chartType === 'pie') {
            const { default: PieChart } = await import('../../charts/PieChart.js');
            chartView = new PieChart({
                height: 250,
                showRefreshButton: false,
                data: chartData
            });
        } else {
            const { default: SeriesChart } = await import('../../charts/SeriesChart.js');
            chartView = new SeriesChart({
                chartType: chartType === 'area' ? 'line' : chartType,
                fill: chartType === 'area',
                height: 250,
                showTypeSwitch: false,
                showRefreshButton: false,
                data: chartData
            });
        }

        this._blockViews.push(chartView);
        this.addChild(chartView);
        chartContainer.appendChild(chartView.element);
        chartView.render(false);
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
     * Escape HTML to prevent XSS in stat blocks
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default AssistantMessageView;
