/**
 * UsersPage - User management page for administrators
 * Allows viewing and managing system users
 */

import Page from '../../../src/core/Page.js';

export default class UsersPage extends Page {
    static pageName = 'users';
    static title = 'Users';
    static icon = 'bi-people';
    static route = 'users';

    constructor(options = {}) {
        super({
            ...options,
            pageName: UsersPage.pageName,
            route: UsersPage.route,
            pageIcon: UsersPage.icon,
            template: 'pages/UsersPage.mst'
        });

        // Get auth manager from app
        this.authManager = this.app?.auth;
    }

    async onInit() {
        // Initialize page data
        this.data = {
            users: [],
            filteredUsers: [],
            searchQuery: '',
            sortBy: 'name',
            sortOrder: 'asc',
            selectedUser: null,
            isLoading: true,

            // Pagination
            currentPage: 1,
            itemsPerPage: 10,
            totalPages: 1,

            // Filters
            filters: {
                status: 'all', // all, active, inactive
                role: 'all' // all, admin, user, moderator
            },

            // Stats
            stats: {
                total: 0,
                active: 0,
                inactive: 0,
                admins: 0
            }
        };
    }

    async onEnter() {
        await super.onEnter();

        // Set page title
        document.title = `${UsersPage.title} - ${this.app.name}`;

        // Check if user has admin privileges
        if (!this.checkAdminAccess()) {
            this.app.navigate('dashboard');
            this.app.showError('Access denied. Admin privileges required.');
            return;
        }

        // Load users data
        await this.loadUsers();
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Initialize tooltips
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            new bootstrap.Tooltip(el);
        });
    }

    /**
     * Check if current user has admin access
     */
    checkAdminAccess() {
        // In a real app, this would check actual permissions
        // For demo, we'll allow access
        return true;
    }

    /**
     * Load users data
     */
    async loadUsers() {
        this.updateData({ isLoading: true });

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock users data
            const users = [
                {
                    id: 1,
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    role: 'admin',
                    status: 'active',
                    lastActive: '2 hours ago',
                    joinDate: '2024-01-15',
                    avatar: null
                },
                {
                    id: 2,
                    name: 'Jane Smith',
                    email: 'jane.smith@example.com',
                    role: 'user',
                    status: 'active',
                    lastActive: '1 day ago',
                    joinDate: '2024-02-20',
                    avatar: null
                },
                {
                    id: 3,
                    name: 'Bob Johnson',
                    email: 'bob.johnson@example.com',
                    role: 'moderator',
                    status: 'inactive',
                    lastActive: '1 week ago',
                    joinDate: '2023-12-10',
                    avatar: null
                },
                {
                    id: 4,
                    name: 'Alice Brown',
                    email: 'alice.brown@example.com',
                    role: 'user',
                    status: 'active',
                    lastActive: '5 minutes ago',
                    joinDate: '2024-03-01',
                    avatar: null
                },
                {
                    id: 5,
                    name: 'Charlie Wilson',
                    email: 'charlie.wilson@example.com',
                    role: 'user',
                    status: 'active',
                    lastActive: '3 days ago',
                    joinDate: '2024-01-25',
                    avatar: null
                }
            ];

            // Calculate stats
            const stats = {
                total: users.length,
                active: users.filter(u => u.status === 'active').length,
                inactive: users.filter(u => u.status === 'inactive').length,
                admins: users.filter(u => u.role === 'admin').length
            };

            this.updateData({
                users,
                filteredUsers: users,
                stats,
                isLoading: false,
                totalPages: Math.ceil(users.length / this.data.itemsPerPage)
            });

            // Apply filters
            this.applyFilters();

        } catch (error) {
            console.error('Load users error:', error);
            this.app.showError('Failed to load users');
            this.updateData({ isLoading: false });
        }
    }

    /**
     * Apply filters and search
     */
    applyFilters() {
        let filtered = [...this.data.users];

        // Apply search
        if (this.data.searchQuery) {
            const query = this.data.searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.role.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (this.data.filters.status !== 'all') {
            filtered = filtered.filter(user => user.status === this.data.filters.status);
        }

        // Apply role filter
        if (this.data.filters.role !== 'all') {
            filtered = filtered.filter(user => user.role === this.data.filters.role);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const aVal = a[this.data.sortBy];
            const bVal = b[this.data.sortBy];

            if (this.data.sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // Update pagination
        const totalPages = Math.ceil(filtered.length / this.data.itemsPerPage);
        const currentPage = Math.min(this.data.currentPage, totalPages || 1);

        this.updateData({
            filteredUsers: filtered,
            totalPages,
            currentPage
        });
    }

    /**
     * Get paginated users
     */
    getPaginatedUsers() {
        const start = (this.data.currentPage - 1) * this.data.itemsPerPage;
        const end = start + this.data.itemsPerPage;
        return this.data.filteredUsers.slice(start, end);
    }

    /**
     * Handle search input
     */
    async onActionSearch(event, element) {
        const query = element.value;
        this.updateData({ searchQuery: query, currentPage: 1 });
        this.applyFilters();
    }

    /**
     * Handle filter change
     */
    async onActionUpdateFilter(event, element) {
        const filterType = element.dataset.filter;
        const value = element.value;

        const filters = { ...this.data.filters, [filterType]: value };
        this.updateData({ filters, currentPage: 1 });
        this.applyFilters();
    }

    /**
     * Handle sort change
     */
    async onActionSort(event, element) {
        event.preventDefault();
        const sortBy = element.dataset.sort;

        // Toggle order if same column
        const sortOrder = this.data.sortBy === sortBy && this.data.sortOrder === 'asc' ? 'desc' : 'asc';

        this.updateData({ sortBy, sortOrder });
        this.applyFilters();
    }

    /**
     * Handle pagination
     */
    async onActionChangePage(event, element) {
        event.preventDefault();
        const page = parseInt(element.dataset.page);

        if (page >= 1 && page <= this.data.totalPages) {
            this.updateData({ currentPage: page });
        }
    }

    /**
     * View user details
     */
    async onActionViewUser(event, element) {
        event.preventDefault();
        const userId = parseInt(element.dataset.userId);
        const user = this.data.users.find(u => u.id === userId);

        if (user) {
            this.updateData({ selectedUser: user });
            // In a real app, this might open a modal or navigate to user details
            this.app.showInfo(`Viewing user: ${user.name}`);
        }
    }

    /**
     * Edit user
     */
    async onActionEditUser(event, element) {
        event.preventDefault();
        const userId = parseInt(element.dataset.userId);
        const user = this.data.users.find(u => u.id === userId);

        if (user) {
            this.app.showInfo(`Edit feature coming soon for: ${user.name}`);
        }
    }

    /**
     * Toggle user status
     */
    async onActionToggleStatus(event, element) {
        event.preventDefault();
        const userId = parseInt(element.dataset.userId);
        const user = this.data.users.find(u => u.id === userId);

        if (user) {
            // Toggle status
            user.status = user.status === 'active' ? 'inactive' : 'active';

            // Update stats
            const stats = {
                total: this.data.users.length,
                active: this.data.users.filter(u => u.status === 'active').length,
                inactive: this.data.users.filter(u => u.status === 'inactive').length,
                admins: this.data.users.filter(u => u.role === 'admin').length
            };

            this.updateData({ users: [...this.data.users], stats });
            this.applyFilters();

            this.app.showSuccess(`User ${user.status === 'active' ? 'activated' : 'deactivated'}: ${user.name}`);
        }
    }

    /**
     * Delete user
     */
    async onActionDeleteUser(event, element) {
        event.preventDefault();
        const userId = parseInt(element.dataset.userId);
        const user = this.data.users.find(u => u.id === userId);

        if (user && confirm(`Are you sure you want to delete user: ${user.name}?`)) {
            // Remove user
            const users = this.data.users.filter(u => u.id !== userId);

            // Update stats
            const stats = {
                total: users.length,
                active: users.filter(u => u.status === 'active').length,
                inactive: users.filter(u => u.status === 'inactive').length,
                admins: users.filter(u => u.role === 'admin').length
            };

            this.updateData({ users, stats });
            this.applyFilters();

            this.app.showSuccess(`User deleted: ${user.name}`);
        }
    }

    /**
     * Add new user
     */
    async onActionAddUser(event) {
        event.preventDefault();
        this.app.showInfo('Add user feature coming soon!');
    }

    /**
     * Export users
     */
    async onActionExportUsers(event) {
        event.preventDefault();

        const exportData = {
            users: this.data.filteredUsers,
            exportDate: new Date().toISOString(),
            totalCount: this.data.filteredUsers.length
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.app.showSuccess('Users exported successfully');
    }

    /**
     * Refresh users list
     */
    async onActionRefresh(event) {
        event.preventDefault();
        await this.loadUsers();
        this.app.showSuccess('Users list refreshed');
    }

    async onExit() {
        await super.onExit();

        // Clean up tooltips
        const tooltips = this.element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(el);
            if (tooltipInstance) {
                tooltipInstance.dispose();
            }
        });
    }
}
