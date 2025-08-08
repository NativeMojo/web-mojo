/**
 * RestModel Unit Tests
 * Tests for the RestModel class functionality
 */

module.exports = async function(testContext) {
    const { describe, it, expect, assert } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    
    await testHelpers.setupModules();

    describe('RestModel Core Functionality', () => {
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
            class TestUser extends RestModel {
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
            global.RestModel.Rest = mockRest;
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
                
                expect(model.id).toBe(1);
                expect(model.attributes).toEqual({ name: 'John Doe', email: 'john@example.com' });
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
        }

        describe('Attribute Management', () => {
            let model;

            function setupAttributeTest() {
                setupTest();
                model = new TestModel({ id: 1, name: 'John', email: 'john@test.com' });
            });

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
            }

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

            function setupCrudTest() {
                setupTest();
                model = new TestModel({ id: 1, name: 'John' });
            });

            describe('fetch()', () => {
                it('should fetch model data successfully', async () => {
                    setupCrudTest();
                    const responseData = { id: 1, name: 'John Updated', email: 'john@example.com' };
                    mockRest.GET.mockResolvedValue({
                        success: true,
                        data: responseData
                    });

                    const result = await model.fetch();
                    
                    expect(mockRest.GET).toHaveBeenCalledWith('/api/users/1', undefined);
                    expect(model.get('name')).toBe('John Updated');
                    expect(model.get('email')).toBe('john@example.com');
                    expect(model.originalAttributes).toEqual(responseData);
                    expect(result).toBe(model);
                });

                it('should handle fetch errors', async () => {
                    setupCrudTest();
                    mockRest.GET.mockResolvedValue({
                        success: false,
                        message: 'User not found',
                        errors: { fetch: 'Not found' }
                    });

                    try {
                        await model.fetch();
                        assert.fail('Should have thrown error');
                    } catch (error) {
                        expect(error.message).toBe('User not found');
                        expect(model.errors).toEqual({ fetch: 'Not found' });
                    }
                });

                it('should require ID for fetch', async () => {
                    setupTest();
                    const modelWithoutId = new TestModel();
                    
                    try {
                        await modelWithoutId.fetch();
                        assert.fail('Should have thrown error');
                    } catch (error) {
                        expect(error.message).toBe('Cannot fetch model without ID');
                    }
                });

                it('should accept ID in options', async () => {
                    setupCrudTest();
                    mockRest.GET.mockResolvedValue({
                        success: true,
                        data: { id: 2, name: 'Jane' }
                    });

                    await model.fetch({ id: 2 });
                    
                    expect(mockRest.GET).toHaveBeenCalledWith('/api/users/2', undefined);
                });
            });

            describe('save()', () => {
                it('should create new model (POST)', async () => {
                    setupTest();
                    const newModel = new TestModel({ name: 'New User', email: 'new@example.com' });
                    
                    mockRest.POST.mockResolvedValue({
                        success: true,
                        data: { id: 2, name: 'New User', email: 'new@example.com' }
                    });

                    const result = await newModel.save();
                    
                    expect(mockRest.POST).toHaveBeenCalledWith('/api/users', expect.objectContaining({
                        name: 'New User',
                        email: 'new@example.com',
                        created_at: expect.any(String),
                        updated_at: expect.any(String)
                    }), undefined);
                    expect(newModel.id).toBe(2);
                    expect(result).toBe(newModel);
                });

                it('should update existing model (PUT)', async () => {
                    setupCrudTest();
                    model.set('name', 'John Updated');
                    
                    mockRest.PUT.mockResolvedValue({
                        success: true,
                        data: { id: 1, name: 'John Updated' }
                    });

                    await model.save();
                    
                    expect(mockRest.PUT).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({
                        name: 'John Updated',
                        updated_at: expect.any(String)
                    }), undefined);
                });

                it('should only send changed attributes', async () => {
                    setupCrudTest();
                    model.originalAttributes = { id: 1, name: 'John', email: 'john@test.com' };
                    model.set('name', 'John Updated');
                    
                    mockRest.PUT.mockResolvedValue({
                        success: true,
                        data: { id: 1, name: 'John Updated' }
                    });

                    await model.save();
                    
                    const sentData = mockRest.PUT.mock.calls[0][1];
                    expect(sentData).toHaveProperty('name', 'John Updated');
                    expect(sentData).toHaveProperty('updated_at');
                    expect(sentData).not.toHaveProperty('email'); // unchanged
                });

                it('should handle save errors', async () => {
                    setupTest();
                    mockRest.POST.mockResolvedValue({
                        success: false,
                        message: 'Validation failed',
                        errors: { name: 'Name is required' }
                    });

                    const newModel = new TestModel();
                    
                    try {
                        await newModel.save();
                        assert.fail('Should have thrown error');
                    } catch (error) {
                        expect(error.message).toBe('Validation failed');
                        expect(newModel.errors).toEqual({ name: 'Name is required' });
                    }
                });
            });

            describe('destroy()', () => {
                it('should delete model successfully', async () => {
                    setupCrudTest();
                    mockRest.DELETE.mockResolvedValue({
                        success: true,
                        data: null
                    });

                    const result = await model.destroy();
                    
                    expect(mockRest.DELETE).toHaveBeenCalledWith('/api/users/1', undefined);
                    expect(model.id).toBe(null);
                    expect(model.attributes).toEqual({});
                    expect(model.originalAttributes).toEqual({});
                    expect(result).toBe(true);
                }

                it('should handle destroy errors', async () => {
                    setupCrudTest();
                    mockRest.DELETE.mockResolvedValue({
                        success: false,
                        message: 'Cannot delete user',
                        errors: { destroy: 'Has dependencies' }
                    });

                    try {
                        await model.destroy();
                        assert.fail('Should have thrown error');
                    } catch (error) {
                        expect(error.message).toBe('Cannot delete user');
                        expect(model.errors).toEqual({ destroy: 'Has dependencies' });
                    }
                });

                it('should require ID for destroy', async () => {
                    setupTest();
                    const modelWithoutId = new TestModel();
                    
                    try {
                        await modelWithoutId.destroy();
                        assert.fail('Should have thrown error');
                    } catch (error) {
                        expect(error.message).toBe('Cannot destroy model without ID');
                    }
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
            });

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
            }

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
                
                model.set('name', 'John');
                model.validateField('name', [{ required: true, message: 'Name is required' }]);
                expect(model.errors).not.toHaveProperty('name');
            });

            it('should handle custom validation functions', () => {
                setupTest();
                class CustomModel extends RestModel {
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
            });

            it('should build URL without ID', () => {
                setupUrlTest();
                const url = model.buildUrl();
                expect(url).toBe('/api/users');
            });

            it('should build URL with ID', () => {
                setupUrlTest();
                const url = model.buildUrl(123);
                expect(url).toBe('/api/users/123');
            }

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
                    data: { id: 1, name: 'John' }
                });

                const model = await TestModel.find(1);
                
                expect(mockRest.GET).toHaveBeenCalledWith('/api/users/1', undefined);
                expect(model).toBeInstanceOf(TestModel);
                expect(model.id).toBe(1);
                expect(model.get('name')).toBe('John');
            });

            it('should create model instance', () => {
                setupTest();
                const data = { name: 'John', email: 'john@test.com' };
                const model = TestModel.create(data);
                
                expect(model).toBeInstanceOf(TestModel);
                expect(model.get('name')).toBe('John');
                expect(model.get('email')).toBe('john@test.com');
            });
        }

        describe('Loading States', () => {
            let model;

            function setupLoadingTest() {
                setupTest();
                model = new TestModel({ id: 1 });
            });

            it('should set loading state during fetch', async () => {
                setupLoadingTest();
                let loadingDuringRequest = false;
                
                mockRest.GET.mockImplementation(async () => {
                    loadingDuringRequest = model.loading;
                    return {
                        success: true,
                        data: { id: 1, name: 'John' }
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
                        data: { id: 1, name: 'John' }
                    };
                });

                await model.save();
                
                expect(loadingDuringRequest).toBe(true);
                expect(model.loading).toBe(false);
            });

            it('should clear loading state on error', async () => {
                setupLoadingTest();
                mockRest.GET.mockRejectedValue(new Error('Network error'));

                try {
                    await model.fetch();
                } catch (error) {
                    // Expected
                }
                
                expect(model.loading).toBe(false);
            });
        });

        describe('Error Handling', () => {
            let model;

            function setupErrorTest() {
                setupTest();
                model = new TestModel({ id: 1 });
            });

            it('should handle network errors in fetch', async () => {
                setupErrorTest();
                mockRest.GET.mockRejectedValue(new Error('Network error'));

                try {
                    await model.fetch();
                    assert.fail('Should have thrown error');
                } catch (error) {
                    expect(error.message).toBe('Network error');
                    expect(model.errors).toEqual({ fetch: 'Network error' });
                }
            });

            it('should handle network errors in save', async () => {
                setupTest();
                mockRest.POST.mockRejectedValue(new Error('Network error'));

                const newModel = new TestModel({ name: 'John' });
                
                try {
                    await newModel.save();
                    assert.fail('Should have thrown error');
                } catch (error) {
                    expect(error.message).toBe('Network error');
                    expect(newModel.errors).toEqual({ save: 'Network error' });
                }
            });

            it('should handle network errors in destroy', async () => {
                setupErrorTest();
                mockRest.DELETE.mockRejectedValue(new Error('Network error'));

                try {
                    await model.destroy();
                    assert.fail('Should have thrown error');
                } catch (error) {
                    expect(error.message).toBe('Network error');
                    expect(model.errors).toEqual({ destroy: 'Network error' });
                }
            });
        });
    });
};