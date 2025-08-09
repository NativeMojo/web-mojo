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
                        {{#brandIcon}}<i class="{{brandIcon}} me-2"></i>{{/brandIcon}}
                        {{brandText}}
                    </h5>
                    {{#brandSubtext}}<small class="text-muted">{{brandSubtext}}</small>{{/brandSubtext}}
                </div>

                <ul class="nav nav-pills flex-column sidebar-nav">
                    {{#navItems}}
                    <li class="nav-item">
                        <a class="nav-link {{#active}}active{{/active}}" href="{{route}}">
                            {{#icon}}<i class="{{icon}} me-2"></i>{{/icon}}
                            {{text}}
                        </a>
                    </li>
                    {{/navItems}}
                </ul>

                {{#footerContent}}
                <div class="position-absolute bottom-0 w-100 p-3 border-top border-secondary">
                    {{{footerContent}}}
                </div>
                {{/footerContent}}
            `,
            ...options
        });

        // Default configuration
        this.updateData({
            brandText: 'MOJO Sidebar',
            brandSubtext: 'Navigation Example',
            brandIcon: 'bi bi-play-circle',
            navItems: [],
            footerContent: null,
            layoutMode: 'push', // 'overlay' or 'push'
            ...this.data
        });
    }

    updateActiveItem(currentRoute) {
        // Normalize routes for comparison
        const normalizeRoute = (route) => {
            if (!route) return '/';
            return route.startsWith('/') ? route : `/${route}`;
        };

        const normalizedCurrentRoute = normalizeRoute(currentRoute);
        
        // Update active states with improved matching
        const navItems = this.data.navItems.map(item => {
            const normalizedItemRoute = normalizeRoute(item.route);
            
            // Check for active state
            let isActive = false;
            
            if (normalizedItemRoute === '/' && normalizedCurrentRoute === '/') {
                // Exact match for home route
                isActive = true;
            } else if (normalizedItemRoute !== '/' && normalizedCurrentRoute !== '/') {
                // For non-home routes, check if current route starts with nav item route
                // This allows /users to be active when on /users/123
                isActive = normalizedCurrentRoute.startsWith(normalizedItemRoute) || 
                          normalizedCurrentRoute === normalizedItemRoute;
            }
            
            return {
                ...item,
                active: isActive
            };
        });

        this.updateData({ navItems }, true);
    }

    toggle() {
        if (this.element) {
            this.element.classList.toggle('show');
        }
    }

    collapse() {
        if (this.element) {
            this.element.classList.toggle('collapsed');
            
            // Update main content for push mode
            if (this.data.layoutMode === 'push') {
                this.updateMainContentLayout();
            }
        }
    }

    updateMainContentLayout() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent && this.data.layoutMode === 'push') {
            const isCollapsed = this.element.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Sidebar is collapsed, expand main content to full width
                mainContent.style.marginLeft = '0px';
                mainContent.style.transition = 'margin-left 0.3s ease';
            } else {
                // Sidebar is open, main content should have left margin
                mainContent.style.marginLeft = '250px';
                mainContent.style.transition = 'margin-left 0.3s ease';
            }
        }
    }

    onAfterMount() {
        super.onAfterMount();
        
        // Add required CSS if not present
        this.addSidebarStyles();
        
        // Set initial layout state for push mode
        setTimeout(() => {
            if (this.data.layoutMode === 'push') {
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    // Initially sidebar is expanded (not collapsed), so main content needs left margin
                    mainContent.style.marginLeft = '250px';
                    mainContent.style.transition = 'margin-left 0.3s ease';
                }
            }
        }, 50);
    }

    addSidebarStyles() {
        const styleId = 'mojo-sidebar-styles';
        
        if (document.getElementById(styleId)) {
            return; // Styles already added
        }

        const style = document.createElement('style');
        style.id = styleId;
        
        const isPushMode = this.data.layoutMode === 'push';
        
        style.textContent = `
            .sidebar {
                position: fixed;
                top: 0;
                left: 0;
                height: 100vh;
                width: 250px;
                background-color: #212529;
                transition: transform 0.3s ease;
                z-index: 1000;
            }
            .sidebar.collapsed { transform: translateX(-100%); }
            .sidebar-brand { padding: 1rem; border-bottom: 1px solid #495057; }
            .sidebar-nav { padding: 0.5rem 0; }
            .sidebar-nav .nav-link { color: #adb5bd; padding: 0.75rem 1rem; border: none; border-radius: 0; transition: all 0.2s ease; }
            .sidebar-nav .nav-link:hover, .sidebar-nav .nav-link.active { color: #fff; background-color: #495057; }
            .sidebar-nav .nav-link i { width: 20px; text-align: center; }
            
            ${isPushMode ? `
            /* Push mode: Initial margin-left will be set via JavaScript for reliability */
            .main-content {
                transition: margin-left 0.3s ease;
            }
            ` : ''}
            
            /* Mobile responsive */
            @media (max-width: 768px) { 
                .sidebar { transform: translateX(-100%); } 
                .sidebar.show { transform: translateX(0); }
                ${isPushMode ? '.main-content { margin-left: 0 !important; }' : ''}
            }
        `;
        
        document.head.appendChild(style);
    }
}

export default Sidebar;