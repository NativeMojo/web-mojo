/**
 * Sidebar - Collapsible sidebar navigation component for MOJO framework
 * Provides responsive left sidebar with navigation items
 */

import View from '../core/View.js';

class Sidebar extends View {
    constructor(options = {}) {
        super({
            tagName: 'nav',
            className: 'sidebar',
            template: `
                <div class="sidebar-brand">
                    <h5 class="text-white mb-0">
                        {{#data.brandIcon}}<i class="{{data.brandIcon}} me-2"></i>{{/data.brandIcon}}
                        {{data.brandText}}
                    </h5>
                    {{#data.brandSubtext}}<small class="text-muted">{{data.brandSubtext}}</small>{{/data.brandSubtext}}
                </div>

                <ul class="nav nav-pills flex-column sidebar-nav">
                    {{#data.navItems}}
                    <li class="nav-item">
                        {{#.children}}
                        <a class="nav-link {{#active}}active{{/active}}"
                           data-bs-toggle="collapse"
                           href="#collapse-{{id}}"
                           role="button"
                           aria-expanded="false">
                            {{#icon}}<i class="{{icon}} me-2"></i>{{/icon}}
                            {{text}}
                            <i class="bi bi-chevron-down float-end"></i>
                        </a>
                        <div class="collapse" id="collapse-{{id}}">
                            <ul class="nav flex-column ms-3">
                                {{#.children|iter}}
                                <li class="nav-item">
                                    <a class="nav-link {{#active}}active{{/active}}" href="{{route}}">
                                        {{#icon}}<i class="{{icon}} me-2"></i>{{/icon}}
                                        {{text}}
                                    </a>
                                </li>
                                {{/.children|iter}}
                            </ul>
                        </div>
                        {{/.children}}
                        {{^.children}}
                        <a class="nav-link {{#active}}active{{/active}}" href="{{route}}">
                            {{#icon}}<i class="{{icon}} me-2"></i>{{/icon}}
                            {{text}}
                        </a>
                        {{/.children}}
                    </li>
                    {{/data.navItems}}
                </ul>

                {{#data.footerContent}}
                <div class="position-absolute bottom-0 w-100 p-3 border-top border-secondary">
                    {{{data.footerContent}}}
                </div>
                {{/data.footerContent}}
            `,
            ...options
        });

        // Default configuration - merge with passed data
        this.data = {
            brandText: 'MOJO Sidebar',
            brandSubtext: 'Navigation Example',
            brandIcon: 'bi bi-play-circle',
            navItems: [],
            footerContent: null,
            layoutMode: 'push', // 'overlay' or 'push'
            ...this.data  // This will override defaults with passed data
        };

        // Process nav items to add IDs for collapse (only for items with children)
        if (this.data.navItems) {
            this.data.navItems = this.data.navItems.map((item, index) => {
                // Only add ID if item has children (for collapse functionality)
                if (item.children && item.children.length > 0) {
                    return {
                        ...item,
                        id: `nav-${index}`
                    };
                }
                return item;
            });
        }
    }

    updateActiveItem(currentRoute) {
        // Normalize routes for comparison
        const normalizeRoute = (route) => {
            if (!route) return '/';
            return route.startsWith('/') ? route : `/${route}`;
        };

        const normalizedCurrentRoute = normalizeRoute(currentRoute);

        // Update active states with improved matching
        const navItems = this.data.navItems.map((item, index) => {
            const processItem = (navItem) => {
                const normalizedItemRoute = normalizeRoute(navItem.route);

                // Check for active state
                let isActive = false;

                if (normalizedItemRoute === '/' && normalizedCurrentRoute === '/') {
                    // Exact match for home route
                    isActive = true;
                } else if (normalizedItemRoute !== '/' && normalizedCurrentRoute !== '/') {
                    // For non-home routes, check if current route starts with nav item route
                    isActive = normalizedCurrentRoute.startsWith(normalizedItemRoute) ||
                              normalizedCurrentRoute === normalizedItemRoute;
                }

                return {
                    ...navItem,
                    active: isActive
                };
            };

            const processed = {
                ...processItem(item),
                id: `nav-${index}`
            };

            // Process children if they exist
            if (item.children) {
                processed.children = item.children.map(processItem);
            }

            return processed;
        });

        this.updateData({ navItems }, true);
    }

    async onAfterMount() {
        await super.onAfterMount();

        // Add required CSS if not present
        this.addSidebarStyles();
    }

    addSidebarStyles() {
        const styleId = 'mojo-sidebar-styles';

        if (document.getElementById(styleId)) {
            return; // Styles already added
        }

        const style = document.createElement('style');
        style.id = styleId;

        style.textContent = `
            .sidebar {
                position: fixed;
                top: 0;
                left: 0;
                height: 100vh;
                width: 250px;
                background-color: #212529;
                transition: transform 0.3s ease;
                z-index: 1040;
                overflow-y: auto;
            }

            .sidebar-brand {
                padding: 1rem;
                border-bottom: 1px solid #495057;
            }
            .sidebar-nav { padding: 0.5rem 0; }
            .sidebar-nav .nav-link { color: #adb5bd; padding: 0.75rem 1rem; border: none; border-radius: 0; transition: all 0.2s ease; }
            .sidebar-nav .nav-link:hover, .sidebar-nav .nav-link.active { color: #fff; background-color: #495057; }
            .sidebar-nav .nav-link i { width: 20px; text-align: center; }

            /* Collapse submenu styles */
            .sidebar-nav .collapse .nav-link { padding: 0.5rem 1rem; font-size: 0.9rem; }
            .sidebar-nav .bi-chevron-down { transition: transform 0.3s; }
            .sidebar-nav .nav-link[aria-expanded="true"] .bi-chevron-down { transform: rotate(180deg); }

            /* Mobile responsive handled by mojo.css */
        `;

        document.head.appendChild(style);
    }
}

export default Sidebar;
