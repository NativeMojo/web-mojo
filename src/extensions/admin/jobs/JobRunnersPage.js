/**
 * JobRunnersPage - Runners table with click-to-detail
 *
 * Wraps JobRunnersSection. Clicking a runner row opens
 * RunnerDetailsView in a dialog (5-tab inspector).
 *
 * Route: system/jobs/runners
 */
import Page from '@core/Page.js';
import JobRunnersSection from './sections/JobRunnersSection.js';

export default class JobRunnersPage extends Page {
    constructor(options = {}) {
        super({
            title: 'Job Runners',
            pageName: 'Job Runners',
            className: 'job-runners-page',
            ...options
        });

        this.template = `
            <div class="job-runners-container">
                <p class="text-muted mb-3">Registered job runners and their heartbeat status</p>
                <div data-container="runners-section"></div>
            </div>
        `;
    }

    async onInit() {
        this.runnersSection = new JobRunnersSection({
            containerId: 'runners-section'
        });
        this.addChild(this.runnersSection);
    }
}
