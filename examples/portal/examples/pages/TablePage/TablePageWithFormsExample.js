import { TablePage, Collection, Modal } from 'web-mojo';

/**
 * TablePageWithFormsExample — TablePage with Add and Edit forms.
 *
 * Doc:    docs/web-mojo/components/TablePage.md#forms
 * Route:  pages/table-page/forms
 *
 * Setting `addForm` and `editForm` on a TablePage wires the toolbar's "+ Add"
 * button and each row's pencil-edit action to a `Modal.form` dialog. With a
 * server-backed Model, TableView would auto-save via `model.save(result)`.
 *
 * For an in-memory Collection there is no save endpoint, so this demo
 * intercepts via `onAdd` (toolbar) and `onItemEdit` (row) and writes the
 * results straight back to the Collection. The two forms re-use the same
 * field array — the only difference is whether we create a model or update
 * an existing one.
 */
const SEED_PROJECTS = [
    { id: 1, name: 'Atlas', owner: 'Alice Adams', priority: 'high', stage: 'design' },
    { id: 2, name: 'Borealis', owner: 'Ben Bryant', priority: 'medium', stage: 'build' },
    { id: 3, name: 'Catalyst', owner: 'Carla Cruz', priority: 'low', stage: 'review' },
    { id: 4, name: 'Drift', owner: 'Dan Dietrich', priority: 'medium', stage: 'build' },
    { id: 5, name: 'Echo', owner: 'Eve Estrada', priority: 'high', stage: 'design' },
    { id: 6, name: 'Fjord', owner: 'Frank Fischer', priority: 'low', stage: 'launch' },
    { id: 7, name: 'Glacier', owner: 'Grace Gomez', priority: 'medium', stage: 'review' },
    { id: 8, name: 'Halo', owner: 'Hank Huang', priority: 'high', stage: 'build' },
    { id: 9, name: 'Iris', owner: 'Iris Ito', priority: 'low', stage: 'design' },
    { id: 10, name: 'Jet', owner: 'Jack Jensen', priority: 'medium', stage: 'launch' },
    { id: 11, name: 'Kestrel', owner: 'Kira Klein', priority: 'high', stage: 'review' },
    { id: 12, name: 'Lumen', owner: 'Liam Lopez', priority: 'low', stage: 'design' },
];

const PROJECT_FIELDS = [
    { type: 'text', name: 'name', label: 'Project name', required: true, placeholder: 'My new project' },
    { type: 'text', name: 'owner', label: 'Owner', required: true, placeholder: 'Ada Lovelace' },
    {
        type: 'select', name: 'priority', label: 'Priority', required: true,
        options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
        ],
    },
    {
        type: 'select', name: 'stage', label: 'Stage', required: true,
        options: [
            { value: 'design', label: 'Design' },
            { value: 'build', label: 'Build' },
            { value: 'review', label: 'Review' },
            { value: 'launch', label: 'Launch' },
        ],
    },
];

class TablePageWithFormsExample extends TablePage {
    static pageName = 'pages/table-page/forms';
    static route = 'pages/table-page/forms';

    constructor(options = {}) {
        const projects = new Collection(SEED_PROJECTS);

        super({
            ...options,
            pageName: TablePageWithFormsExample.pageName,
            route: TablePageWithFormsExample.route,
            title: 'TablePage — with Add / Edit forms',
            description: 'Toolbar "+ Add" and row-edit open Modal.form dialogs that persist to the in-memory Collection.',

            collection: projects,
            defaultQuery: { sort: 'name', size: 8 },

            columns: [
                { key: 'id', label: 'ID', sortable: true },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'owner', label: 'Owner', sortable: true, visibility: 'md' },
                {
                    key: 'priority',
                    label: 'Priority',
                    sortable: true,
                    formatter: 'badge:high=danger,medium=warning,low=secondary',
                    filter: { type: 'select', options: ['low', 'medium', 'high'] },
                },
                {
                    key: 'stage',
                    label: 'Stage',
                    sortable: true,
                    visibility: 'md',
                    formatter: 'badge:design=info,build=primary,review=warning,launch=success',
                    filter: { type: 'select', options: ['design', 'build', 'review', 'launch'] },
                },
            ],

            actions: ['edit'],
            searchable: true,
            paginated: true,
            showAdd: true,
            showExport: false,
            tableOptions: { striped: true, hover: true, size: 'sm' },
            urlSyncEnabled: true,
        });

        // Hold the collection so the action handlers can mutate it.
        this._projects = projects;
    }

    /**
     * Toolbar "+ Add" handler — TablePage delegates here via tableViewConfig.onAdd.
     */
    async onAdd() {
        const result = await Modal.form({
            title: 'Add project',
            fields: PROJECT_FIELDS,
            defaults: { priority: 'medium', stage: 'design' },
        });
        if (!result) return; // cancelled

        const nextId = (this._projects.models.reduce((m, p) => Math.max(m, p.id || 0), 0)) + 1;
        this._projects.add({ id: nextId, ...result });
    }

    /**
     * Row-edit handler — TablePage delegates here via instance lookup.
     */
    async onItemEdit(model) {
        const result = await Modal.form({
            title: `Edit ${model.get('name')}`,
            fields: PROJECT_FIELDS,
            data: model.toJSON(),
        });
        if (!result) return; // cancelled

        model.set(result);
        // Re-render so any visible row reflects the new badge colors.
        this.tableView.render();
    }
}

export default TablePageWithFormsExample;
