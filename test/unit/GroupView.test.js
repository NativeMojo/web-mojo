const path = require('path');

module.exports = async function ({ describe, it, expect }) {
    const { createServer } = await import('vite');
    const root = path.resolve(__dirname, '../..');
    const vite = await createServer({
        root,
        configFile: false,
        resolve: {
            alias: {
                '@core': path.join(root, 'src/core'),
                '@ext': path.join(root, 'src/extensions')
            }
        },
        optimizeDeps: { noDiscovery: true },
        server: { middlewareMode: true, watch: null, ws: false }
    });
    let GroupView, Group, DetailHeaderView, ContextMenu, Modal;
    try {
        ({ default: GroupView } = await vite.ssrLoadModule('/src/extensions/admin/account/groups/GroupView.js'));
        ({ Group } = await vite.ssrLoadModule('/src/core/models/Group.js'));
        ({ DetailHeaderView } = await vite.ssrLoadModule('/src/core/views/data/DetailView.js'));
        ({ default: ContextMenu } = await vite.ssrLoadModule('/src/core/views/feedback/ContextMenu.js'));
        ({ default: Modal } = await vite.ssrLoadModule('/src/core/views/feedback/Modal.js'));
    } finally {
        await vite.close();
    }

    function makeView() {
        return new GroupView({
            model: new Group({
                id: 42,
                name: 'Retail Markets',
                kind: 'brand',
                parent: { id: 7, name: 'Brand' },
                is_active: true
            }),
            app: { activeUser: { hasPermission: () => true } }
        });
    }

    describe('GroupView settings for a child group', () => {
        it('identifies the parent in the header and uses group actions in the menu', () => {
            const view = makeView();
            const header = new DetailHeaderView({ ...view.headerConfig, model: view.model });
            const menu = new ContextMenu({
                config: view.headerConfig.contextMenu,
                context: view.model,
                app: view.getApp()
            });
            const labels = () => menu.visibleItems().filter(item => item.action).map(item => item.label);
            expect(header._resolveTitle()).toBe('Retail Markets');
            expect(header._resolveSubtitle()).toBe('Parent group · Brand');
            expect(labels()).toEqual([
                'Edit Group', 'Invite Member', 'Add Sub-Group', 'Configure Auth', 'View Parent', 'Deactivate Group'
            ]);

            view.model.set({ is_active: false, parent: null });
            expect(labels()).toContain('Activate Group');
            expect(labels()).not.toContain('Deactivate Group');
            expect(labels()).not.toContain('View Parent');
            expect(header._resolveSubtitle()).toBe('');
        });

        it('opens the edit form for the displayed group', async () => {
            const view = makeView();
            const modelForm = Modal.modelForm;
            let editOptions;
            Modal.modelForm = async options => { editOptions = options; };
            try {
                await view.onActionEditGroup();
                expect(editOptions.model).toBe(view.model);
                expect(editOptions.title).toBe('Edit Group — Retail Markets');
            } finally {
                Modal.modelForm = modelForm;
            }
        });

        it('sends a confirmed deactivation to the displayed group ID', async () => {
            const view = makeView();
            const confirm = Modal.confirm;
            let confirmation;
            const requests = [];
            Modal.confirm = async (...args) => {
                confirmation = args;
                return true;
            };
            view.model.rest = {
                PUT: async (url, data) => {
                    requests.push({ url, data });
                    return { success: true, data: { status: true, data } };
                }
            };
            try {
                await view.onActionStateToggle();
                expect(requests).toEqual([{ url: '/api/group/42', data: { is_active: false } }]);
                expect(confirmation[0]).toContain('<strong>Retail Markets</strong>');
                expect(confirmation[1]).toBe('Deactivate Group');
            } finally {
                Modal.confirm = confirm;
            }
        });
    });
};
