/**
 * Model Unit Tests
 * Tests for the Model class functionality
 */

module.exports = async function(testContext) {
    const { describe, it, expect, assert } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    const { loadModule } = require('../utils/simple-module-loader');

    await testHelpers.setup();
    const Model = loadModule('Model');

    // Make Model available globally for tests
    global.Model = Model;

    describe('Model Core Functionality', () => {
        let mockRest;
        let TestModel;

        // Set up for each test
        function setupTest() {
            // Create mock REST client
            mockRest = {
                GET: jest.fn(),
                POST: jest.fn(), 
                PUT: jest.fn(),
                PATCH: jest.fn(),
                DELETE: jest.fn()
            };

            // Create test model class
            class TestUser extends Model {
                static endpoint = '/api/users';
                static validations = {
                    name: [
                        { required: true, message: 'Name is required' },
                        { minLength: 2, message: 'Name must be at least 2 characters' }
                    ],
                    email: [
                        { required: true, message: 'Email is required' },
                        { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
                    ]
                };
            }

            TestModel = TestUser;
            TestModel.Rest = mockRest;
            Model.Rest = mockRest;
        }

        describe('Constructor and Initialization', () => {
            it('should create model with empty data', () => {
                setupTest();
                const model = new TestModel();
                
                expect(model.id).toBe(null);
                expect(model.attributes).toEqual({});
                expect(model.originalAttributes).toEqual({});
                expect(model.errors).toEqual({});
                expect(model.loading).toBe(false);
            });

            it('should create model with initial data', () => {
                setupTest();
                const data = { id: 1, name: 'John Doe', email: 'john@example.com' };
                const model = new TestModel(data);

                // Model spreads all incoming data into both `attributes` and
                // `originalAttributes` (id is not extracted from attributes).
                expect(model.id).toBe(1);
                expect(model.attributes).toEqual(data);
                expect(model.originalAttributes).toEqual(data);
            });

            it('should set endpoint from class or options', () => {
                setupTest();
                const model1 = new TestModel();
                expect(model1.endpoint).toBe('/api/users');

                const model2 = new TestModel({}, { endpoint: '/api/custom' });
                expect(model2.endpoint).toBe('/api/custom');
            });

            it('should set default options', () => {
                setupTest();
                const model = new TestModel();
                
                expect(model.options.idAttribute).toBe('id');
                expect(model.options.timestamps).toBe(true);
            });
        });

        describe('Attribute Management', () => {
            let model;

            function setupAttributeTest() {
                setupTest();
                model = new TestModel({ id: 1, name: 'John', email: 'john@test.com' });
            }

            it('should get attribute values', () => {
                setupAttributeTest();
                expect(model.get('id')).toBe(1);
                expect(model.get('name')).toBe('John');
                expect(model.get('email')).toBe('john@test.com');
                expect(model.get('nonexistent')).toBeUndefined();
            });

            it('should set single attribute', () => {
                setupAttributeTest();
                model.set('name', 'Jane');
                
                expect(model.get('name')).toBe('Jane');
                expect(model.attributes.name).toBe('Jane');
            });

            it('should set multiple attributes', () => {
                setupAttributeTest();
                model.set({ name: 'Jane', age: 30 });
                
                expect(model.get('name')).toBe('Jane');
                expect(model.get('age')).toBe(30);
            });

            it('should set id attribute specially', () => {
                setupAttributeTest();
                model.set('id', 999);
                expect(model.id).toBe(999);
                
                model.set({ id: 888 });
                expect(model.id).toBe(888);
            });
        });

        describe('CRUD Operations', () => {
            let model;

            // Every Model instance holds a reference to the shared `rest`
            // singleton on this.rest — replace it on the instance to route
            // CRUD through the mock. A successful CRUD response looks like
            // { success: true, data: { status: 'ok', data: <payload> } }
            // in the current codebase; everything else records errors on
            // this.errors and returns the response (no throw).
            function setupCrudTest() {
                setupTest();
                model = new TestModel({ id: 1, name: 'John' });
                model.rest = mockRest;
            }
            const crudOk = (data) => ({
                success: true,
                data: { status: 'ok', data }
            });

            describe('fetch()', () => {
                it('should fetch model data successfully', async () => {
                    setupCrudTest();
                    const responseData = { id: 1, name: 'John Updated', email: 'john@example.com' };
                    mockRest.GET.mockResolvedValue(crudOk(responseData));

                    await model.fetch();

                    expect(mockRest.GET).toHaveBeenCalled();
                    expect(mockRest.GET.mock.calls[0][0]).toBe('/api/users/1');
                    expect(model.get('name')).toBe('John Updated');
                    expect(model.get('email')).toBe('john@example.com');
                });

                it('should record fetch errors without throwing', async () => {
                    setupCrudTest();
                    mockRest.GET.mockResolvedValue({
                        success: false,
                        errors: { fetch: 'Not found' }
                    });

                    const result = await model.fetch();

                    expect(result.success).toBe(false);
                    expect(model.errors).toEqual({ fetch: 'Not found' });
                });

                it('should throw when fetching a model without an ID', async () => {
                    setupTest();
                    const modelWithoutId = new TestModel();
                    modelWithoutId.rest = mockRest;

                    let caught;
                    try {
                        await modelWithoutId.fetch();
                    } catch (e) { caught = e; }
                    expect(caught).toBeDefined();
                    expect(caught.message).toContain('ID is required');
                });

                it('should accept an explicit ID in options', async () => {
                    setupCrudTest();
                    mockRest.GET.mockResolvedValue(crudOk({ id: 2, name: 'Jane' }));

                    await model.fetch({ id: 2 });

                    expect(mockRest.GET.mock.calls[0][0]).toBe('/api/users/2');
                });
            });

            describe('save()', () => {
                it('should create new model (POST)', async () => {
                    setupTest();
                    const newModel = new TestModel({ name: 'New User', email: 'new@example.com' });
                    newModel.rest = mockRest;

                    mockRest.POST.mockResolvedValue(crudOk({ id: 2, name: 'New User', email: 'new@example.com' }));

                    await newModel.save(newModel.attributes);

                    expect(mockRest.POST).toHaveBeenCalled();
                    const [url, body] = mockRest.POST.mock.calls[0];
                    expect(url).toBe('/api/users');
                    expect(body).toEqual(expect.objectContaining({
                        name: 'New User',
                        email: 'new@example.com'
                    }));
                    expect(newModel.id).toBe(2);
                });

                it('should update existing model (PUT)', async () => {
                    setupCrudTest();
                    model.set('name', 'John Updated');

                    mockRest.PUT.mockResolvedValue(crudOk({ id: 1, name: 'John Updated' }));

                    await model.save({ name: 'John Updated' });

                    expect(mockRest.PUT).toHaveBeenCalled();
                    const [url, body] = mockRest.PUT.mock.calls[0];
                    expect(url).toBe('/api/users/1');
                    expect(body).toEqual(expect.objectContaining({ name: 'John Updated' }));
                });

                it('should send whatever data argument the caller passes', async () => {
                    setupCrudTest();
                    mockRest.PUT.mockResolvedValue(crudOk({ id: 1, name: 'John Updated' }));

                    const patch = { name: 'John Updated' };
                    await model.save(patch);

                    expect(mockRest.PUT.mock.calls[0][1]).toBe(patch);
                });

                it('should record save errors without throwing', async () => {
                    setupTest();
                    mockRest.POST.mockResolvedValue({
                        success: false,
                        errors: { name: 'Name is required' }
                    });

                    const newModel = new TestModel();
                    newModel.rest = mockRest;

                    const result = await newModel.save({});

                    expect(result.success).toBe(false);
                    expect(newModel.errors).toEqual({ name: 'Name is required' });
                });
            });

            describe('destroy()', () => {
                it('should delete model successfully', async () => {
                    setupCrudTest();
                    mockRest.DELETE.mockResolvedValue(crudOk(null));

                    await model.destroy();

                    expect(mockRest.DELETE).toHaveBeenCalled();
                    expect(mockRest.DELETE.mock.calls[0][0]).toBe('/api/users/1');
                    expect(model.id).toBe(null);
                    expect(model.attributes).toEqual({});
                    expect(model.originalAttributes).toEqual({});
                });

                it('should record destroy errors without throwing', async () => {
                    setupCrudTest();
                    mockRest.DELETE.mockResolvedValue({
                        success: false,
                        errors: { destroy: 'Has dependencies' }
                    });

                    const result = await model.destroy();

                    expect(result.success).toBe(false);
                    expect(model.errors).toEqual({ destroy: 'Has dependencies' });
                });

                it('should return an error response when destroying a model without an ID', async () => {
                    setupTest();
                    const modelWithoutId = new TestModel();
                    modelWithoutId.rest = mockRest;

                    const result = await modelWithoutId.destroy();

                    expect(result.success).toBe(false);
                    expect(result.error).toContain('without ID');
                });
            });
        });

        describe('Change Tracking', () => {
            let model;

            function setupChangeTest() {
                setupTest();
                model = new TestModel({ id: 1, name: 'John', email: 'john@test.com' });
                model.originalAttributes = { id: 1, name: 'John', email: 'john@test.com' };
            }

            it('should detect dirty state', () => {
                setupChangeTest();
                expect(model.isDirty()).toBe(false);
                
                model.set('name', 'Jane');
                expect(model.isDirty()).toBe(true);
            });

            it('should get changed attributes', () => {
                setupChangeTest();
                model.set({ name: 'Jane', age: 30 });
                
                const changed = model.getChangedAttributes();
                expect(changed).toEqual({
                    name: 'Jane',
                    age: 30
                });
            });

            it('should reset to original state', () => {
                setupChangeTest();
                model.set({ name: 'Jane', age: 30 });
                model.errors = { test: 'error' };
                
                model.reset();
                
                expect(model.get('name')).toBe('John');
                expect(model.get('age')).toBeUndefined();
                expect(model.errors).toEqual({});
            });
        });

        describe('Validation', () => {
            let model;

            function setupValidationTest() {
                setupTest();
                model = new TestModel();
            }

            it('should validate required fields', () => {
                setupValidationTest();
                const isValid = model.validate();
                
                expect(isValid).toBe(false);
                expect(model.errors).toHaveProperty('name', 'Name is required');
                expect(model.errors).toHaveProperty('email', 'Email is required');
            });

            it('should validate field formats', () => {
                setupValidationTest();
                model.set({ name: 'A', email: 'invalid-email' });
                
                const isValid = model.validate();
                
                expect(isValid).toBe(false);
                expect(model.errors).toHaveProperty('name', 'Name must be at least 2 characters');
                expect(model.errors).toHaveProperty('email', 'Invalid email format');
            });

            it('should pass validation with valid data', () => {
                setupValidationTest();
                model.set({ name: 'John Doe', email: 'john@example.com' });
                
                const isValid = model.validate();
                
                expect(isValid).toBe(true);
                expect(model.errors).toEqual({});
            });

            it('should validate individual fields', () => {
                setupValidationTest();
                model.validateField('name', [{ required: true, message: 'Name is required' }]);
                expect(model.errors).toHaveProperty('name', 'Name is required');

                // validateField only *adds* errors; it does not clear prior
                // errors when a rule now passes. Callers typically call
                // validate() which resets this.errors first. Mirror that.
                model.set('name', 'John');
                delete model.errors.name;
                model.validateField('name', [{ required: true, message: 'Name is required' }]);
                expect(model.errors).not.toHaveProperty('name');
            });

            it('should handle custom validation functions', () => {
                setupTest();
                class CustomModel extends Model {
                    static validations = {
                        age: [
                            (value) => {
                                if (value < 18) return 'Must be 18 or older';
                                return true;
                            }
                        ]
                    };
                }
                CustomModel.Rest = mockRest;

                const customModel = new CustomModel({ age: 15 });
                const isValid = customModel.validate();
                
                expect(isValid).toBe(false);
                expect(customModel.errors).toHaveProperty('age', 'Must be 18 or older');
            });
        });

        describe('URL Building', () => {
            let model;

            function setupUrlTest() {
                setupTest();
                model = new TestModel();
            }

            it('should build URL without ID', () => {
                setupUrlTest();
                const url = model.buildUrl();
                expect(url).toBe('/api/users');
            });

            it('should build URL with ID', () => {
                setupUrlTest();
                const url = model.buildUrl(123);
                expect(url).toBe('/api/users/123');
            });

            it('should handle trailing slash in endpoint', () => {
                setupUrlTest();
                model.endpoint = '/api/users/';
                const url = model.buildUrl(123);
                expect(url).toBe('/api/users/123');
            });
        });

        describe('JSON Serialization', () => {
            it('should convert to JSON', () => {
                setupTest();
                const model = new TestModel({ id: 1, name: 'John', email: 'john@test.com' });
                
                const json = model.toJSON();
                
                expect(json).toEqual({
                    id: 1,
                    name: 'John',
                    email: 'john@test.com'
                });
            });
        });

        describe('Static Methods', () => {
            it('should find model by ID', async () => {
                setupTest();
                mockRest.GET.mockResolvedValue({
                    success: true,
                    data: { status: 'ok', data: { id: 1, name: 'John' } }
                });

                // Model.find() creates a new model whose constructor assigns
                // this.rest = rest (the shared singleton). We can't intercept
                // that from the outside, so we mutate the singleton directly:
                // load the singleton via the module loader and temporarily
                // swap its GET for the mock.
                const restSingleton = global.Rest;
                const originalGet = restSingleton.GET;
                restSingleton.GET = mockRest.GET;
                try {
                    const model = await TestModel.find(1);

                    expect(mockRest.GET).toHaveBeenCalled();
                    expect(mockRest.GET.mock.calls[0][0]).toBe('/api/users/1');
                    expect(model).toBeInstanceOf(TestModel);
                    expect(model.id).toBe(1);
                    expect(model.get('name')).toBe('John');
                } finally {
                    restSingleton.GET = originalGet;
                }
            });

            it('should create model instance', () => {
                setupTest();
                const data = { name: 'John', email: 'john@test.com' };
                const model = TestModel.create(data);

                expect(model).toBeInstanceOf(TestModel);
                expect(model.get('name')).toBe('John');
                expect(model.get('email')).toBe('john@test.com');
            });
        });

        describe('Loading States', () => {
            let model;

            function setupLoadingTest() {
                setupTest();
                model = new TestModel({ id: 1 });
                model.rest = mockRest;
            }

            it('should set loading state during fetch', async () => {
                setupLoadingTest();
                let loadingDuringRequest = false;

                mockRest.GET.mockImplementation(async () => {
                    loadingDuringRequest = model.loading;
                    return {
                        success: true,
                        data: { status: 'ok', data: { id: 1, name: 'John' } }
                    };
                });

                await model.fetch();

                expect(loadingDuringRequest).toBe(true);
                expect(model.loading).toBe(false);
            });

            it('should set loading state during save', async () => {
                setupLoadingTest();
                let loadingDuringRequest = false;

                mockRest.PUT.mockImplementation(async () => {
                    loadingDuringRequest = model.loading;
                    return {
                        success: true,
                        data: { status: 'ok', data: { id: 1, name: 'John' } }
                    };
                });

                await model.save({ name: 'John' });

                expect(loadingDuringRequest).toBe(true);
                expect(model.loading).toBe(false);
            });

            it('should clear loading state on error', async () => {
                setupLoadingTest();
                mockRest.GET.mockRejectedValue(new Error('Network error'));

                await model.fetch();

                expect(model.loading).toBe(false);
            });
        });

        describe('Error Handling', () => {
            let model;

            function setupErrorTest() {
                setupTest();
                model = new TestModel({ id: 1 });
                model.rest = mockRest;
            }

            // None of fetch/save/destroy throw on network errors anymore; they
            // catch, populate model.errors, and return { success: false, ... }.

            it('should record network errors in fetch', async () => {
                setupErrorTest();
                mockRest.GET.mockRejectedValue(new Error('Network error'));

                const result = await model.fetch();

                expect(result.success).toBe(false);
                expect(model.errors).toEqual({ fetch: 'Network error' });
            });

            it('should record network errors in save', async () => {
                setupTest();
                mockRest.POST.mockRejectedValue(new Error('Network error'));

                const newModel = new TestModel({ name: 'John' });
                newModel.rest = mockRest;

                const result = await newModel.save(newModel.attributes);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Network error');
            });

            it('should record network errors in destroy', async () => {
                setupErrorTest();
                mockRest.DELETE.mockRejectedValue(new Error('Network error'));

                const result = await model.destroy();

                expect(result.success).toBe(false);
                expect(result.error).toBe('Network error');
            });
        });
    });
};