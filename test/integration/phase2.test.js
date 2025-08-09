/**
 * Phase 2 Integration Tests
 * Tests for Phase 2 data layer component interactions
 */

module.exports = async function(testContext) {
    const { describe, it, expect, assert, beforeEach } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    
    // Import Phase 2 components
    const MOJO = require('../../src/mojo.js').default;
    const RestModel = require('../../src/core/RestModel.js').default;
    const DataList = require('../../src/core/DataList.js').default;
    const Rest = require('../../src/core/Rest.js').default;
    
    await testHelpers.setup();

    describe('Phase 2 Data Layer Integration', () => {
        let app;
        let mockFetch;
        let mockResponse;
        let originalFetch;

        beforeEach(() => {
            // Create MOJO app instance
            app = new MOJO({
                container: '#test-container',
                debug: true,
                api: {
                    baseURL: 'https://api.example.com',
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            });

            // Mock fetch for testing
            mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']]),
                json: jest.fn().mockResolvedValue({ success: true, data: [] }),
                text: jest.fn().mockResolvedValue('OK')
            };

            mockFetch = jest.fn().mockResolvedValue(mockResponse);
            originalFetch = global.fetch;
            global.fetch = mockFetch;
            global.AbortSignal = {
                timeout: jest.fn().mockReturnValue({ aborted: false })
            };
        });

        afterEach(() => {
            global.fetch = originalFetch;
            delete global.AbortSignal;
        });

        describe('MOJO Framework Data Layer Integration', () => {
            it('should integrate Rest client with framework configuration', () => {
                expect(app.rest).toBeDefined();
                expect(app.rest.config.baseURL).toBe('https://api.example.com');
                expect(app.rest.config.timeout).toBe(30000);
                expect(app.rest.config.headers['Content-Type']).toBe('application/json');
            });

            it('should inject Rest client into model classes', () => {
                expect(RestModel.Rest).toBe(app.rest);
                expect(DataList.Rest).toBe(app.rest);
            });

            it('should register and create models', () => {
                class TestUser extends RestModel {
                    static endpoint = '/api/users';
                }

                app.registerModel('User', TestUser);
                expect(app.getModel('User')).toBe(TestUser);

                const user = app.createModel('User', { name: 'John', email: 'john@test.com' });
                expect(user).toBeInstanceOf(TestUser);
                expect(user.get('name')).toBe('John');
            });

            it('should register and create collections', () => {
                class TestUser extends RestModel {
                    static endpoint = '/api/users';
                }

                class TestUsers extends DataList {
                    constructor(options = {}) {
                        super(TestUser, { endpoint: '/api/users', ...options });
                    }
                }

                app.registerModel('User', TestUser);
                app.registerCollection('Users', TestUsers);
                
                expect(app.getCollection('Users')).toBe(TestUsers);

                const users = app.createCollection('Users', TestUser);
                expect(users).toBeInstanceOf(TestUsers);
            });

            it('should include Phase 2 stats in framework stats', () => {
                class TestUser extends RestModel {}
                class TestUsers extends DataList {}

                app.registerModel('User', TestUser);
                app.registerCollection('Users', TestUsers);

                const stats = app.getStats();
                
                expect(stats.version).toBe('2.0.0-phase2');
                expect(stats.registeredModels).toBe(1);
                expect(stats.registeredCollections).toBe(1);
                expect(stats.restClient).toBeDefined();
                expect(stats.restClient.baseURL).toBe('https://api.example.com');
                expect(stats.restClient.timeout).toBe(30000);
                expect(stats.restClient.requestInterceptors).toBe(0);
                expect(stats.restClient.responseInterceptors).toBe(0);
            });
        });

        describe('RestModel and Rest Client Integration', () => {
            let User;
            let user;

            beforeEach(() => {
                class TestUser extends RestModel {
                    static endpoint = '/api/users';
                    static validations = {
                        name: [{ required: true, message: 'Name is required' }],
                        email: [{ required: true, message: 'Email is required' }]
                    };
                }

                User = TestUser;
                user = new User({ id: 1, name: 'John', email: 'john@test.com' });
            });

            it('should perform successful CRUD operations', async () => {
                // Test fetch
                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: { id: 1, name: 'John Updated', email: 'john@test.com' }
                });

                await user.fetch();
                expect(global.fetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/users/1',
                    expect.objectContaining({
                        method: 'GET'
                    })
                );
                expect(user.get('name')).toBe('John Updated');

                // Test save (update)
                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: { id: 1, name: 'John Modified', email: 'john@test.com' }
                });

                user.set('name', 'John Modified');
                await user.save();
                
                expect(global.fetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/users/1',
                    expect.objectContaining({
                        method: 'PUT',
                        body: expect.stringContaining('John Modified')
                    })
                );

                // Test destroy
                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: null
                });

                await user.destroy();
                expect(global.fetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/users/1',
                    expect.objectContaining({
                        method: 'DELETE'
                    })
                );
            });

            it('should handle validation before API calls', async () => {
                const newUser = new User();
                
                // Should validate before save
                mockResponse.json.mockResolvedValueOnce({
                    success: false,
                    message: 'Validation failed',
                    errors: { name: 'Name is required', email: 'Email is required' }
                });

                try {
                    await newUser.save();
                } catch (error) {
                    expect(error.message).toBe('Validation failed');
                    expect(newUser.errors).toHaveProperty('name');
                    expect(newUser.errors).toHaveProperty('email');
                }
            });

            it('should handle API error responses', async () => {
                mockResponse.ok = false;
                mockResponse.status = 404;
                mockResponse.json.mockResolvedValueOnce({
                    message: 'User not found',
                    errors: { fetch: 'Not found' }
                });

                try {
                    await user.fetch();
                } catch (error) {
                    expect(error.message).toBe('User not found');
                    expect(user.errors).toEqual({ fetch: 'Not found' });
                }
            });
        });

        describe('DataList and RestModel Integration', () => {
            let User;
            let Users;
            let collection;

            beforeEach(() => {
                class TestUser extends RestModel {
                    static endpoint = '/api/users';
                    
                    isActive() {
                        return this.get('status') === 'active';
                    }
                }

                class TestUsers extends DataList {
                    constructor(options = {}) {
                        super(TestUser, { endpoint: '/api/users', ...options });
                    }

                    getActiveUsers() {
                        return this.where(user => user.isActive());
                    }
                }

                User = TestUser;
                Users = TestUsers;
                collection = new Users();
            });

            it('should fetch and populate collection with models', async () => {
                const userData = [
                    { id: 1, name: 'John', email: 'john@test.com', status: 'active' },
                    { id: 2, name: 'Jane', email: 'jane@test.com', status: 'active' },
                    { id: 3, name: 'Bob', email: 'bob@test.com', status: 'inactive' }
                ];

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: userData,
                    total: 3,
                    page: 1,
                    per_page: 10,
                    total_pages: 1
                });

                await collection.fetch({ params: { page: 1, limit: 10 } });

                expect(global.fetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/users?page=1&limit=10',
                    expect.objectContaining({
                        method: 'GET'
                    })
                );

                expect(collection.length()).toBe(3);
                expect(collection.models[0]).toBeInstanceOf(User);
                expect(collection.models[0].get('name')).toBe('John');
                expect(collection.meta.total).toBe(3);
            });

            it('should perform operations on collection models', async () => {
                const userData = [
                    { id: 1, name: 'John', status: 'active' },
                    { id: 2, name: 'Jane', status: 'active' },
                    { id: 3, name: 'Bob', status: 'inactive' }
                ];

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: userData
                });

                await collection.fetch();

                // Test custom collection method
                const activeUsers = collection.getActiveUsers();
                expect(activeUsers).toHaveLength(2);
                expect(activeUsers[0].get('name')).toBe('John');
                expect(activeUsers[1].get('name')).toBe('Jane');

                // Test model operations within collection
                const user = collection.get(1);
                expect(user.isActive()).toBe(true);

                // Test filtering
                const inactiveUsers = collection.where({ status: 'inactive' });
                expect(inactiveUsers).toHaveLength(1);
                expect(inactiveUsers[0].get('name')).toBe('Bob');
            });

            it('should handle collection events when models change', (done) => {
                let eventsFired = 0;
                const expectedEvents = ['add', 'update'];
                
                collection.on('add', (data) => {
                    expect(data.models).toHaveLength(1);
                    expect(data.models[0]).toBeInstanceOf(User);
                    eventsFired++;
                    if (eventsFired === expectedEvents.length) done();
                });

                collection.on('update', (data) => {
                    expect(data.collection).toBe(collection);
                    eventsFired++;
                    if (eventsFired === expectedEvents.length) done();
                });

                const user = new User({ id: 1, name: 'John' });
                collection.add(user);
            });

            it('should sync model saves with collection', async () => {
                const user = new User({ id: 1, name: 'John', email: 'john@test.com' });
                collection.add(user);

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: { id: 1, name: 'John Updated', email: 'john@test.com' }
                });

                // Save model
                user.set('name', 'John Updated');
                await user.save();

                // Collection should reflect the change
                const collectionUser = collection.get(1);
                expect(collectionUser).toBe(user);
                expect(collectionUser.get('name')).toBe('John Updated');
            });
        });

        describe('Authentication Integration', () => {
            it('should set auth token via framework configuration', () => {
                const appWithAuth = new MOJO({
                    api: {
                        baseURL: 'https://api.example.com'
                    },
                    auth: {
                        token: 'test-token-123',
                        type: 'Bearer'
                    }
                });

                expect(appWithAuth.rest.config.headers['Authorization']).toBe('Bearer test-token-123');
            });

            it('should use auth token in model requests', async () => {
                app.rest.setAuthToken('test-token-456');

                class User extends RestModel {
                    static endpoint = '/api/users';
                }

                const user = new User({ id: 1 });

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: { id: 1, name: 'John' }
                });

                await user.fetch();

                expect(global.fetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'Authorization': 'Bearer test-token-456'
                        })
                    })
                );
            });
        });

        describe('Error Handling Integration', () => {
            let User;
            let user;

            beforeEach(() => {
                class TestUser extends RestModel {
                    static endpoint = '/api/users';
                }
                User = TestUser;
                user = new User({ id: 1 });
            });

            it('should handle network errors across the stack', async () => {
                global.fetch.mockRejectedValueOnce(new Error('Network error'));

                try {
                    await user.fetch();
                } catch (error) {
                    expect(error.message).toBe('Network error');
                    expect(user.errors).toEqual({ fetch: 'Network error' });
                    expect(user.loading).toBe(false);
                }
            });

            it('should handle API errors with proper status codes', async () => {
                mockResponse.ok = false;
                mockResponse.status = 422;
                mockResponse.statusText = 'Unprocessable Entity';
                mockResponse.json.mockResolvedValueOnce({
                    message: 'Validation failed',
                    errors: {
                        name: 'Name is required',
                        email: 'Invalid email format'
                    }
                });

                try {
                    await user.save();
                } catch (error) {
                    expect(error.message).toBe('Validation failed');
                    expect(user.errors).toEqual({
                        name: 'Name is required',
                        email: 'Invalid email format'
                    });
                }
            });

            it('should handle collection fetch errors', async () => {
                const Users = class extends DataList {};
                const collection = new Users(User);

                global.fetch.mockRejectedValueOnce(new Error('Server unavailable'));

                try {
                    await collection.fetch();
                } catch (error) {
                    expect(error.message).toBe('Server unavailable');
                    expect(collection.errors).toEqual({ fetch: 'Server unavailable' });
                    expect(collection.loading).toBe(false);
                }
            });
        });

        describe('Interceptors Integration', () => {
            let User;

            beforeEach(() => {
                class TestUser extends RestModel {
                    static endpoint = '/api/users';
                }
                User = TestUser;
            });

            it('should apply request interceptors to model requests', async () => {
                // Add request interceptor
                app.rest.addInterceptor('request', (request) => {
                    request.headers['X-Request-ID'] = 'req-12345';
                    request.headers['X-Timestamp'] = '2024-01-01T00:00:00Z';
                    return request;
                });

                const user = new User({ id: 1 });

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: { id: 1, name: 'John' }
                });

                await user.fetch();

                expect(global.fetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'X-Request-ID': 'req-12345',
                            'X-Timestamp': '2024-01-01T00:00:00Z'
                        })
                    })
                );
            });

            it('should apply response interceptors to model responses', async () => {
                let responseIntercepted = false;

                // Add response interceptor
                app.rest.addInterceptor('response', (response) => {
                    responseIntercepted = true;
                    response.intercepted = true;
                    return response;
                });

                const user = new User({ id: 1 });

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: { id: 1, name: 'John' }
                });

                await user.fetch();

                expect(responseIntercepted).toBe(true);
            });
        });

        describe('Data Validation and Transformation', () => {
            it('should validate data across model and collection operations', async () => {
                class ValidatedUser extends RestModel {
                    static endpoint = '/api/users';
                    static validations = {
                        name: [{ required: true, message: 'Name is required' }],
                        email: [
                            { required: true, message: 'Email is required' },
                            { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                        ]
                    };
                }

                class ValidatedUsers extends DataList {
                    constructor(options = {}) {
                        super(ValidatedUser, { endpoint: '/api/users', ...options });
                    }

                    add(data, options = {}) {
                        // Validate before adding to collection
                        if (Array.isArray(data)) {
                            data = data.filter(item => {
                                const model = new ValidatedUser(item);
                                return model.validate();
                            });
                        } else if (!(data instanceof ValidatedUser)) {
                            const model = new ValidatedUser(data);
                            if (!model.validate()) {
                                console.warn('Invalid model data:', model.errors);
                                return [];
                            }
                        }
                        
                        return super.add(data, options);
                    }
                }

                const collection = new ValidatedUsers();

                // Valid data should be added
                const validUsers = [
                    { id: 1, name: 'John', email: 'john@test.com' },
                    { id: 2, name: 'Jane', email: 'jane@test.com' }
                ];

                collection.add(validUsers);
                expect(collection.length()).toBe(2);

                // Invalid data should be filtered out
                const invalidUsers = [
                    { id: 3, name: '', email: 'invalid-email' }, // Invalid name and email
                    { id: 4, name: 'Bob', email: 'bob@test.com' } // Valid
                ];

                collection.add(invalidUsers);
                expect(collection.length()).toBe(3); // Only one valid user added
            });
        });

        describe('Memory Management and Cleanup', () => {
            it('should properly clean up models and collections', async () => {
                class TestUser extends RestModel {
                    static endpoint = '/api/users';
                }

                class TestUsers extends DataList {
                    constructor(options = {}) {
                        super(TestUser, { endpoint: '/api/users', ...options });
                    }
                }

                // Create models and collection
                const users = [
                    new TestUser({ id: 1, name: 'John' }),
                    new TestUser({ id: 2, name: 'Jane' })
                ];

                const collection = new TestUsers();
                collection.add(users);

                expect(collection.length()).toBe(2);
                expect(collection.models[0].get('name')).toBe('John');

                // Reset collection
                collection.reset();

                expect(collection.length()).toBe(0);
                expect(collection.models).toEqual([]);
                expect(collection.isEmpty()).toBe(true);

                // Verify models are cleaned up
                expect(users[0].get('name')).toBe('John'); // Original models unchanged
                expect(users[1].get('name')).toBe('Jane');
            });
        });

        describe('Complete CRUD Workflow', () => {
            it('should perform complete CRUD workflow with validation and events', async () => {
                class User extends RestModel {
                    static endpoint = '/api/users';
                    static validations = {
                        name: [{ required: true }],
                        email: [{ required: true }]
                    };
                }

                class Users extends DataList {
                    constructor(options = {}) {
                        super(User, { endpoint: '/api/users', ...options });
                    }
                }

                const collection = new Users();
                let eventsReceived = [];

                // Set up event listeners
                collection.on('add', () => eventsReceived.push('add'));
                collection.on('remove', () => eventsReceived.push('remove'));
                collection.on('update', () => eventsReceived.push('update'));

                // 1. Fetch initial data
                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: [
                        { id: 1, name: 'John', email: 'john@test.com' },
                        { id: 2, name: 'Jane', email: 'jane@test.com' }
                    ]
                });

                await collection.fetch();
                expect(collection.length()).toBe(2);

                // 2. Create new user
                const newUser = new User({ name: 'Bob', email: 'bob@test.com' });
                expect(newUser.validate()).toBe(true);

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: { id: 3, name: 'Bob', email: 'bob@test.com' }
                });

                await newUser.save();
                collection.add(newUser);
                expect(collection.length()).toBe(3);

                // 3. Update existing user
                const userToUpdate = collection.get(1);
                userToUpdate.set('name', 'John Updated');

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: { id: 1, name: 'John Updated', email: 'john@test.com' }
                });

                await userToUpdate.save();
                expect(collection.get(1).get('name')).toBe('John Updated');

                // 4. Delete user
                const userToDelete = collection.get(2);

                mockResponse.json.mockResolvedValueOnce({
                    success: true,
                    data: null
                });

                await userToDelete.destroy();
                collection.remove(userToDelete);
                expect(collection.length()).toBe(2);
                expect(collection.get(2)).toBeUndefined();

                // Verify events were fired
                expect(eventsReceived).toContain('add');
                expect(eventsReceived).toContain('remove');
                expect(eventsReceived).toContain('update');
            });
        });
    });
};