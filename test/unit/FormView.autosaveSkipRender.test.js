/**
 * ITEM-016 regression — inline FormView autosave must not trigger the
 * automatic model-change rerender on OTHER views sharing the model.
 *
 * Bug: FormView (autosaveModelField: true) saves a field → model emits
 * 'change' → every parent/sibling View sharing the model auto-renders
 * (View._onModelChange), rebuilding TabView/tabset DOM and snapping the
 * active tab back to the first tab (admin UserView → Permissions).
 *
 * Fix: Model.set()/save() forward their options object to 'change'
 * listeners; View._onModelChange skips the automatic render when
 * options.skipRender is true; FormView's autosave batch path passes
 * { skipRender: true }. Explicit form submits (saveModel/handleSubmit)
 * intentionally keep the rerender behavior.
 */

const path = require('path');
const { testHelpers } = require('../utils/test-helpers');
const { loadModule, moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;

    await testHelpers.setup();

    const Model = loadModule('Model');
    const View = loadModule('View');

    // FormView isn't in the loader registry. Its module body calls
    // applyFileDropMixin(FormView) and reads FormPlugins hooks via optional
    // chaining — stub both globals before the file executes, then load the
    // real class directly. We never construct it (the constructor pulls in
    // the whole input toolchain); we drive prototype methods on a minimal
    // stub `this`, same pattern as TablePage.batchAction tests.
    global.FormPlugins = {};
    global.FileDropMixin = (cls) => cls;
    const FormView = moduleLoader.loadModuleFromFile(
        path.resolve(__dirname, '../../src/core/forms/FormView.js'),
        'FormView'
    );

    // A mounted view whose render() is a spy — stands in for the parent
    // DetailView / section views that share the model with the form.
    function makeMountedView(model) {
        const view = new View({});
        view.isMounted = () => true;
        view.render = jest.fn();
        view.setModel(model); // setModel itself triggers one render
        view.render.mockClear();
        return view;
    }

    function makeRestStub(responseData) {
        return {
            PUT: jest.fn().mockResolvedValue({
                success: true,
                data: { status: true, data: responseData }
            }),
            POST: jest.fn()
        };
    }

    // DataView wires its own 'change' listener (it bypasses View.setModel),
    // so it must honor skipRender independently of View._onModelChange.
    const DataView = moduleLoader.loadModuleFromFile(
        path.resolve(__dirname, '../../src/core/views/data/DataView.js'),
        'DataView'
    );

    describe('ITEM-016: autosave skipRender', () => {

        describe('Model option forwarding', () => {
            it('set() forwards its options object to change listeners', () => {
                const model = new Model({ id: 1, name: 'a' });
                const spy = jest.fn();
                model.on('change', spy);

                model.set({ name: 'b' }, null, { skipRender: true });

                expect(spy).toHaveBeenCalledWith(model, { skipRender: true });
            });

            it('save() forwards options into the post-save set()', async () => {
                const model = new Model({ id: 7, name: 'a' }, { endpoint: '/api/things' });
                model.rest = makeRestStub({ name: 'from-server' });
                const spy = jest.fn();
                model.on('change', spy);

                await model.save({ name: 'from-server' }, { skipRender: true });

                expect(spy).toHaveBeenCalledWith(
                    model,
                    expect.objectContaining({ skipRender: true })
                );
            });
        });

        describe('View auto-render suppression', () => {
            it('skips the automatic render when change options have skipRender', () => {
                const model = new Model({ id: 1, name: 'a' });
                const view = makeMountedView(model);

                model.set({ name: 'b' }, null, { skipRender: true });
                expect(view.render).not.toHaveBeenCalled();
            });

            it('still renders on normal set() calls', () => {
                const model = new Model({ id: 1, name: 'a' });
                const view = makeMountedView(model);

                model.set({ name: 'b' });
                expect(view.render).toHaveBeenCalledTimes(1);
            });

            it('DataView (own change listener) also honors skipRender', () => {
                const model = new Model({ id: 1, name: 'a' });
                const dataView = new DataView({ model, data: { name: 'a' } });
                dataView.model = model;
                dataView.isMounted = () => true;
                dataView.render = jest.fn();
                dataView.onInit(); // attaches DataView's own 'change' listener

                model.set({ name: 'b' }, null, { skipRender: true });
                expect(dataView.render).not.toHaveBeenCalled();

                model.set({ name: 'c' });
                expect(dataView.render).toHaveBeenCalledTimes(1);
            });
        });

        describe('FormView autosave batch path (the regression)', () => {
            it('executeBatchSave() does not rerender other views sharing the model', async () => {
                const model = new Model(
                    { id: 7, permissions: { admin: false } },
                    { endpoint: '/api/account/users' }
                );
                model.rest = makeRestStub({ permissions: { admin: true } });

                // Parent section/DetailView sharing the model — before the
                // fix this rerenders on autosave, resetting tab state.
                const parent = makeMountedView(model);

                const form = Object.create(FormView.prototype);
                form.model = model;
                form.isSaving = false;
                form.pendingSaveFields = new Map([['permissions.admin', true]]);
                form.batchSaveTimeout = null;
                form.getFieldStatusManager = () => ({ showStatus: () => {} });
                form.getApp = () => null;
                form.revertFields = () => {};

                await form.executeBatchSave();

                expect(model.rest.PUT).toHaveBeenCalled();
                expect(parent.render).not.toHaveBeenCalled();
            });

            it('executeBatchSave() without a save() method sets with skipRender', async () => {
                // Plain data model (no REST save) — autosave falls back to set()
                const model = new Model({ id: 1, permissions: { admin: false } });
                model.save = undefined;
                const parent = makeMountedView(model);

                const form = Object.create(FormView.prototype);
                form.model = model;
                form.isSaving = false;
                form.pendingSaveFields = new Map([['permissions.admin', true]]);
                form.batchSaveTimeout = null;
                form.getFieldStatusManager = () => ({ showStatus: () => {} });
                form.getApp = () => null;
                form.revertFields = () => {};

                await form.executeBatchSave();

                expect(parent.render).not.toHaveBeenCalled();
                expect(model.get('permissions.admin')).toBe(true);
            });
        });
    });
};
