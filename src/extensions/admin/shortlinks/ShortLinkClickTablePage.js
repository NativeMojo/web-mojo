/**
 * ShortLinkClickTablePage - Global shortlink click history
 *
 * Read-only table of every recorded click across all tracked shortlinks.
 * Filterable by shortlink id via URL param (?shortlink=<id>).
 *
 * Route: system/shortlinks/clicks
 */

import TablePage from '@core/pages/TablePage.js';
import { ShortLinkClickList } from '@core/models/ShortLink.js';

class ShortLinkClickTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_shortlink_clicks',
            pageName: 'Shortlink Click History',
            router: 'admin/shortlinks/clicks',
            Collection: ShortLinkClickList,

            defaultQuery: {
                sort: '-created',
            },

            columns: [
                {
                    key: 'created',
                    label: 'Time',
                    width: '180px',
                    sortable: true,
                    formatter: 'datetime',
                },
                {
                    key: 'shortlink.code',
                    label: 'Code',
                    width: '130px',
                    template: '<code>{{model.shortlink.code}}</code>',
                },
                {
                    key: 'shortlink.url',
                    label: 'Destination',
                    formatter: "truncate(50)|default('—')",
                },
                {
                    key: 'ip',
                    label: 'IP',
                    width: '140px',
                    template: '<code>{{model.ip}}</code>',
                },
                {
                    key: 'is_bot',
                    label: 'Bot',
                    width: '80px',
                    formatter: 'yesnoicon',
                    filter: {
                        type: 'select',
                        options: [
                            { value: 'true', label: 'Bots only' },
                            { value: 'false', label: 'Humans only' },
                        ],
                    },
                },
                {
                    key: 'user_agent',
                    label: 'User-Agent',
                    formatter: 'truncate(50)',
                    visibility: 'md',
                },
                {
                    key: 'referer',
                    label: 'Referer',
                    formatter: "truncate(40)|default('—')",
                    visibility: 'lg',
                },
            ],

            searchable: false,
            sortable: true,
            filterable: true,
            paginated: true,
            selectable: false,
            showRefresh: true,
            showAdd: false,
            showExport: true,

            emptyMessage: 'No click history recorded. Clicks are only captured on shortlinks created with track_clicks=true.',

            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false,
                actions: [],
                pageSizes: [25, 50, 100],
                defaultPageSize: 50,
                emptyIcon: 'bi-cursor',
            },
        });
    }
}

export default ShortLinkClickTablePage;
