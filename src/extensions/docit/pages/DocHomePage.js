/**
 * DocHomePage - The default landing page for the documentation portal.
 * Instructs the user to select a book to begin.
 */

import Page from '@core/Page.js';

class DocHomePage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'home',
            title: 'Documentation',
            className: 'docit-home-page',
            ...options
        });
    }

    async getTemplate() {
        return `
            <div class="docit-empty-state vh-100 d-flex flex-column align-items-center justify-content-center">
                <i class="bi bi-collection" style="font-size: 4rem;"></i>
                <h3 class="mt-4">Welcome to the Documentation Portal</h3>
                <p class="text-muted">Please select a book from the sidebar to get started.</p>
            </div>
        `;
    }
}

export default DocHomePage;