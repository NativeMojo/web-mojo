/**
 * JobsTablePage - All jobs, filterable by status
 *
 * Wraps JobTableSection with no status filter (shows all jobs)
 * and full column config, search, and filter support.
 *
 * Route: system/jobs/list
 */
import Page from '@core/Page.js';
import JobTableSection from './sections/JobTableSection.js';

export default class JobsTablePage extends Page {
    constructor(options = {}) {
        super({
            title: 'Jobs',
            pageName: 'Jobs',
            className: 'jobs-table-page',
            ...options
        });

        this.template = `
            <div class="jobs-table-container">
                <p class="text-muted mb-3">All jobs across all channels and statuses</p>
                <div data-container="jobs-section"></div>
            </div>
        `;
    }

    async onInit() {
        this.jobTableSection = new JobTableSection({
            containerId: 'jobs-section',
            sort: '-created',
            title: 'All Jobs',
            // Enable per-row checkboxes + the top batch-action bar with
            // "Cancel Jobs" wired up. JobTableSection's onInit handles the
            // batch-cancel-jobs action by calling model.cancel() on each
            // selected row in parallel.
            selectable: true
        });
        this.addChild(this.jobTableSection);
    }
}
