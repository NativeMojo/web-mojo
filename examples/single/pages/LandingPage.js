/**
 * LandingPage - Landing page for single page example
 */

import Page from '../../../src/core/Page.js';

class LandingPage extends Page {
    static pageName = 'landing';
    static title = 'MOJO Framework - Modern JavaScript UI Framework';
    static icon = 'bi-house';
    static route = 'landing';

    constructor(options = {}) {
        super({
            ...options,
            pageName: LandingPage.pageName,
            route: LandingPage.route,
            pageIcon: LandingPage.icon,
            template: "templates/landing.html"
        });
    }

    async onInit() {
        // Initialize page data
        this.data = {
            title: 'Build Modern Web Apps',
            subtitle: 'With MOJO Framework',
            description: 'A lightweight, component-based JavaScript framework built on Bootstrap 5. Create professional business applications with clean architecture and minimal boilerplate.',

            user: null, // Will be populated from app state

            features: [
                {
                    icon: 'bi-lightning-charge',
                    color: 'primary',
                    title: 'Lightning Fast',
                    description: 'Built with ES6+ for optimal performance'
                },
                {
                    icon: 'bi-puzzle',
                    color: 'success',
                    title: 'Component-Based',
                    description: 'Reusable components with clean lifecycle'
                },
                {
                    icon: 'bi-bootstrap',
                    color: 'info',
                    title: 'Bootstrap Native',
                    description: 'Professional UI out of the box'
                },
                {
                    icon: 'bi-code-slash',
                    color: 'warning',
                    title: 'Developer Friendly',
                    description: 'Simple API and clear patterns'
                }
            ],

            stats: {
                components: 25,
                downloads: 10,
                stars: 500,
                contributors: 12
            }
        };
    }

    async onEnter() {
        await super.onEnter();
        console.log('LandingPage entered');

        // Set page title
        document.title = LandingPage.title;

        // Get current user from app state
        if (window.APP) {
            const user = window.APP.getState('user');
            if (user) {
                this.updateData({ user });
            }
        }
    }

    async onActionLogout(event) {
        event.preventDefault();

        if (window.APP) {
            // Clear user state
            window.APP.setState('user', null);

            // Emit logout event
            window.APP.eventBus.emit('auth:logout');

            // Update view
            this.updateData({ user: null });
        }
    }

    async onActionLearnMore(event) {
        event.preventDefault();

        if (window.APP) {
            window.APP.showInfo('Learn more section - documentation coming soon!');
        }

        // Smooth scroll to features section
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async onActionViewDocs(event) {
        event.preventDefault();

        if (window.APP) {
            window.APP.showInfo('Documentation will be available soon!');
        }

        // In a real app, this would navigate to docs or open in new tab
        console.log('View documentation clicked');
    }

    async onAfterMount() {
        await super.onAfterMount();

        // Add smooth scrolling for anchor links
        const anchorLinks = this.element.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
}

export default LandingPage;
