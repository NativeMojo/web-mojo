/**
 * Collection Unit Tests
 * Tests for the Collection class functionality
 */

module.exports = async function(testContext) {
    const { describe, it, expect, assert, beforeEach } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    const { loadModule } = require('../utils/simple-module-loader');

    await testHelpers.setup();

    const Model = loadModule('Model');
    const Collection = loadModule('Collection');

    describe('Collection Core Functionality', () => {
        let mockRest;
        let TestModel;
        let collection;

        // Set up before each test
        beforeEach(() => {
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
            }

            TestModel = TestUser;

            // Create collection instance
            collection = new Collection({ ModelClass: TestModel, endpoint: '/api/users' });

            // Collection and Model both hold a reference to the shared `rest`
            // singleton on `this.rest`. Replace it on the instance so tests
            // can drive fetch/save/destroy through mockRest.
            collection.rest = mockRest;
        });

        describe('Constructor and Initialization', () => {
            it('should create empty collection', () => {
                const col = new Collection({ ModelClass: TestModel });
                
                expect(col.ModelClass).toBe(TestModel);
                expect(col.endpoint).toBe('/api/users');
                expect(col.models).toEqual([]);
                expect(col.loading).toBe(false);
                expect(col.errors).toEqual({});
                expect(col.meta).toEqual({});
            });

            it('should use custom endpoint', () => {
                const col = new Collection({ ModelClass: TestModel, endpoint: '/api/custom' });

                expect(col.endpoint).toBe('/api/custom');
            });

            it('should set default options', () => {
                const col = new Collection({ ModelClass: TestModel });

                expect(col.options.parse).toBe(true);
                expect(col.options.reset).toBe(true);
            });

            it('should accept custom options', () => {
                const col = new Collection({
                    ModelClass: TestModel,
                    parse: false,
                    reset: false
                });
                
                expect(col.options.parse).toBe(false);
                expect(col.options.reset).toBe(false);
            });
        });

        describe('Fetch Functionality', () => {
            // The current REST response shape nests the array under
            // response.data.data, with pagination fields alongside it.
            // _performFetch only accepts the success branch when
            // response.data.status is truthy (typically 'ok').
            const successResponse = (models, extra = {}) => ({
                success: true,
                data: {
                    data: models,
                    status: 'ok',
                    size: 10,
                    start: 0,
                    count: models.length,
                    ...extra
                }
            });

            it('should fetch collection data successfully', async () => {
                const responseData = [
                    { id: 1, name: 'John', email: 'john@test.com' },
                    { id: 2, name: 'Jane', email: 'jane@test.com' }
                ];

                mockRest.GET.mockResolvedValue(successResponse(responseData));

                await collection.fetch();

                // Fetch calls rest.GET(url, params, options). Default params
                // include start/size from the constructor; don't over-assert
                // the exact shape — just verify the URL and that it was called.
                expect(mockRest.GET).toHaveBeenCalled();
                expect(mockRest.GET.mock.calls[0][0]).toBe('/api/users');
                expect(collection.models).toHaveLength(2);
                expect(collection.models[0]).toBeInstanceOf(TestModel);
                expect(collection.models[0].get('name')).toBe('John');
            });

            it('should pass additional query parameters to rest.GET', async () => {
                mockRest.GET.mockResolvedValue(successResponse([]));

                await collection.fetch({ page: 2, limit: 5 });

                const sentParams = mockRest.GET.mock.calls[0][1];
                expect(sentParams.page).toBe(2);
                expect(sentParams.limit).toBe(5);
            });

            it('should populate meta from a paginated response', async () => {
                mockRest.GET.mockResolvedValue(successResponse(
                    [{ id: 1, name: 'John' }],
                    { count: 100, size: 10, start: 10 }
                ));

                await collection.fetch();

                // parse() populates meta with size/start/count/status/graph
                expect(collection.meta.count).toBe(100);
                expect(collection.meta.size).toBe(10);
                expect(collection.meta.start).toBe(10);
                expect(collection.meta.status).toBe('ok');
            });

            it('should add models from a paginated response', async () => {
                const responseData = [
                    { id: 1, name: 'John' },
                    { id: 2, name: 'Jane' }
                ];

                mockRest.GET.mockResolvedValue(successResponse(responseData));

                await collection.fetch();

                expect(collection.models).toHaveLength(2);
            });

            it('should record errors when the response is unsuccessful', async () => {
                // _performFetch no longer throws on an error response — it
                // records errors and emits a fetch:error event.
                mockRest.GET.mockResolvedValue({
                    success: false,
                    message: 'Server error',
                    errors: { server: 'Internal error' }
                });

                const result = await collection.fetch();

                expect(collection.errors).toEqual({ server: 'Internal error' });
                expect(result.success).toBe(false);
            });

            it('should clear loading state when fetch completes', async () => {
                mockRest.GET.mockResolvedValue(successResponse([]));

                expect(collection.loading).toBe(false);
                await collection.fetch();
                expect(collection.loading).toBe(false);
            });
        });

        describe('Model Management', () => {
            let user1, user2, user3;

            beforeEach(() => {
                user1 = new TestModel({ id: 1, name: 'John', email: 'john@test.com' });
                user2 = new TestModel({ id: 2, name: 'Jane', email: 'jane@test.com' });
                user3 = new TestModel({ id: 3, name: 'Bob', email: 'bob@test.com' });
            });

            describe('add()', () => {
                it('should add single model', () => {
                    const added = collection.add(user1);
                    
                    expect(collection.models).toContain(user1);
                    expect(collection.length()).toBe(1);
                    expect(added).toEqual([user1]);
                });

                it('should add multiple models', () => {
                    const added = collection.add([user1, user2]);
                    
                    expect(collection.models).toEqual([user1, user2]);
                    expect(collection.length()).toBe(2);
                    expect(added).toEqual([user1, user2]);
                });

                it('should add plain object data', () => {
                    const userData = { id: 1, name: 'John' };
                    const added = collection.add(userData);
                    
                    expect(collection.length()).toBe(1);
                    expect(collection.models[0]).toBeInstanceOf(TestModel);
                    expect(collection.models[0].get('name')).toBe('John');
                    expect(added[0]).toBeInstanceOf(TestModel);
                });

                it('should merge existing models by default', () => {
                    collection.add(user1);
                    
                    const updatedUser = new TestModel({ id: 1, name: 'John Updated', email: 'john@test.com' });
                    collection.add(updatedUser);
                    
                    expect(collection.length()).toBe(1);
                    expect(collection.models[0].get('name')).toBe('John Updated');
                });

                it('should not merge if merge option is false', () => {
                    collection.add(user1);
                    
                    const updatedUser = new TestModel({ id: 1, name: 'John Updated' });
                    collection.add(updatedUser, { merge: false });
                    
                    expect(collection.length()).toBe(1);
                    expect(collection.models[0].get('name')).toBe('John');
                });
            });

            describe('remove()', () => {
                beforeEach(() => {
                    collection.add([user1, user2, user3]);
                });

                it('should remove model by instance', () => {
                    const removed = collection.remove(user2);
                    
                    expect(collection.models).not.toContain(user2);
                    expect(collection.length()).toBe(2);
                    expect(removed).toEqual([user2]);
                });

                it('should remove model by ID', () => {
                    const removed = collection.remove(2);
                    
                    expect(collection.get(2)).toBeUndefined();
                    expect(collection.length()).toBe(2);
                    expect(removed[0]).toBe(user2);
                });

                it('should remove multiple models', () => {
                    const removed = collection.remove([user1, user3]);
                    
                    expect(collection.models).toEqual([user2]);
                    expect(collection.length()).toBe(1);
                    expect(removed).toEqual([user1, user3]);
                });

                it('should remove multiple models by ID', () => {
                    const removed = collection.remove([1, 3]);
                    
                    expect(collection.models).toEqual([user2]);
                    expect(collection.length()).toBe(1);
                    expect(removed).toHaveLength(2);
                });
            });

            describe('reset()', () => {
                beforeEach(() => {
                    collection.add([user1, user2]);
                });

                it('should reset collection to empty', () => {
                    const previousModels = [...collection.models];
                    collection.reset();
                    
                    expect(collection.models).toEqual([]);
                    expect(collection.length()).toBe(0);
                });

                it('should reset collection with new models', () => {
                    collection.reset([user3]);
                    
                    expect(collection.models).toEqual([user3]);
                    expect(collection.length()).toBe(1);
                });
            });
        });

        describe('Collection Queries', () => {
            let users;

            beforeEach(() => {
                users = [
                    new TestModel({ id: 1, name: 'John', age: 25, status: 'active' }),
                    new TestModel({ id: 2, name: 'Jane', age: 30, status: 'active' }),
                    new TestModel({ id: 3, name: 'Bob', age: 35, status: 'inactive' }),
                    new TestModel({ id: 4, name: 'Alice', age: 28, status: 'active' })
                ];
                collection.add(users);
            });

            describe('get()', () => {
                it('should get model by ID', () => {
                    const user = collection.get(2);
                    
                    expect(user).toBe(users[1]);
                    expect(user.get('name')).toBe('Jane');
                });

                it('should return undefined for non-existent ID', () => {
                    const user = collection.get(999);
                    expect(user).toBeUndefined();
                });
            });

            describe('at()', () => {
                it('should get model by index', () => {
                    const user = collection.at(1);
                    
                    expect(user).toBe(users[1]);
                    expect(user.get('name')).toBe('Jane');
                });

                it('should return undefined for invalid index', () => {
                    const user = collection.at(999);
                    expect(user).toBeUndefined();
                });
            });

            describe('where()', () => {
                it('should filter by object criteria', () => {
                    const activeUsers = collection.where({ status: 'active' });
                    
                    expect(activeUsers).toHaveLength(3);
                    expect(activeUsers.every(user => user.get('status') === 'active')).toBe(true);
                });

                it('should filter by function', () => {
                    const youngUsers = collection.where(user => user.get('age') < 30);
                    
                    expect(youngUsers).toHaveLength(2);
                    expect(youngUsers[0].get('name')).toBe('John');
                    expect(youngUsers[1].get('name')).toBe('Alice');
                });

                it('should return empty array for no matches', () => {
                    const matches = collection.where({ status: 'deleted' });
                    expect(matches).toEqual([]);
                });
            });

            describe('findWhere()', () => {
                it('should find first matching model', () => {
                    const activeUser = collection.findWhere({ status: 'active' });
                    
                    expect(activeUser).toBe(users[0]);
                    expect(activeUser.get('name')).toBe('John');
                });

                it('should return undefined for no matches', () => {
                    const match = collection.findWhere({ status: 'deleted' });
                    expect(match).toBeUndefined();
                });
            });

            describe('sort()', () => {
                it('should sort by attribute name', () => {
                    collection.sort('age');
                    
                    const ages = collection.models.map(user => user.get('age'));
                    expect(ages).toEqual([25, 28, 30, 35]);
                });

                it('should sort by comparator function', () => {
                    collection.sort((a, b) => {
                        return b.get('age') - a.get('age'); // Descending
                    });
                    
                    const ages = collection.models.map(user => user.get('age'));
                    expect(ages).toEqual([35, 30, 28, 25]);
                });
            });
        });

        describe('Collection Properties', () => {
            it('should return correct length', () => {
                expect(collection.length()).toBe(0);
                
                collection.add(new TestModel({ id: 1, name: 'John' }));
                expect(collection.length()).toBe(1);
                
                collection.add(new TestModel({ id: 2, name: 'Jane' }));
                expect(collection.length()).toBe(2);
            });

            it('should detect empty state', () => {
                expect(collection.isEmpty()).toBe(true);
                
                collection.add(new TestModel({ id: 1, name: 'John' }));
                expect(collection.isEmpty()).toBe(false);
                
                collection.reset();
                expect(collection.isEmpty()).toBe(true);
            });
        });

        describe('JSON Serialization', () => {
            it('should convert to JSON array', () => {
                const users = [
                    new TestModel({ id: 1, name: 'John', email: 'john@test.com' }),
                    new TestModel({ id: 2, name: 'Jane', email: 'jane@test.com' })
                ];
                collection.add(users);

                const json = collection.toJSON();
                
                expect(json).toEqual([
                    { id: 1, name: 'John', email: 'john@test.com' },
                    { id: 2, name: 'Jane', email: 'jane@test.com' }
                ]);
            });

            it('should return empty array for empty collection', () => {
                const json = collection.toJSON();
                expect(json).toEqual([]);
            });
        });

        describe('URL Building', () => {
            it('should build collection URL', () => {
                const url = collection.buildUrl();
                expect(url).toBe('/api/users');
            });
        });

        describe('Event System', () => {
            let eventCallback;

            beforeEach(() => {
                eventCallback = jest.fn();
            });

            it('should trigger add event when models added', () => {
                collection.on('add', eventCallback);
                
                const user = new TestModel({ id: 1, name: 'John' });
                collection.add(user);
                
                expect(eventCallback).toHaveBeenCalledWith({
                    models: [user],
                    collection
                });
            });

            it('should trigger remove event when models removed', () => {
                const user = new TestModel({ id: 1, name: 'John' });
                collection.add(user, { silent: true });
                collection.on('remove', eventCallback);
                
                collection.remove(user);
                
                expect(eventCallback).toHaveBeenCalledWith({
                    models: [user],
                    collection
                });
            });

            it('should trigger reset event when collection reset', () => {
                const users = [
                    new TestModel({ id: 1, name: 'John' }),
                    new TestModel({ id: 2, name: 'Jane' })
                ];
                collection.add(users, { silent: true });
                collection.on('reset', eventCallback);
                
                collection.reset();
                
                expect(eventCallback).toHaveBeenCalledWith({
                    collection,
                    previousModels: users
                });
            });

            it('should trigger update event after add/remove', () => {
                collection.on('update', eventCallback);
                
                const user = new TestModel({ id: 1, name: 'John' });
                collection.add(user);
                
                expect(eventCallback).toHaveBeenCalledWith({ collection });
            });

            it('should trigger sort event when sorted', () => {
                const users = [
                    new TestModel({ id: 1, name: 'Bob' }),
                    new TestModel({ id: 2, name: 'Alice' })
                ];
                collection.add(users, { silent: true });
                collection.on('sort', eventCallback);
                
                collection.sort('name');
                
                expect(eventCallback).toHaveBeenCalledWith({ collection });
            });

            it('should not trigger events when silent', () => {
                collection.on('add', eventCallback);
                collection.on('update', eventCallback);
                
                const user = new TestModel({ id: 1, name: 'John' });
                collection.add(user, { silent: true });
                
                expect(eventCallback).not.toHaveBeenCalled();
            });

            it('should remove event listeners', () => {
                collection.on('add', eventCallback);
                collection.off('add', eventCallback);
                
                const user = new TestModel({ id: 1, name: 'John' });
                collection.add(user);
                
                expect(eventCallback).not.toHaveBeenCalled();
            });

            it('should remove all listeners for event', () => {
                const callback1 = jest.fn();
                const callback2 = jest.fn();
                
                collection.on('add', callback1);
                collection.on('add', callback2);
                collection.off('add'); // Remove all
                
                const user = new TestModel({ id: 1, name: 'John' });
                collection.add(user);
                
                expect(callback1).not.toHaveBeenCalled();
                expect(callback2).not.toHaveBeenCalled();
            });
        });

        describe('Iterator Support', () => {
            it('should be iterable with for...of', () => {
                const users = [
                    new TestModel({ id: 1, name: 'John' }),
                    new TestModel({ id: 2, name: 'Jane' }),
                    new TestModel({ id: 3, name: 'Bob' })
                ];
                collection.add(users);

                const names = [];
                for (const user of collection) {
                    names.push(user.get('name'));
                }

                expect(names).toEqual(['John', 'Jane', 'Bob']);
            });
        });

        describe('Static Methods', () => {
            it('should create collection from array', () => {
                const data = [
                    { id: 1, name: 'John', email: 'john@test.com' },
                    { id: 2, name: 'Jane', email: 'jane@test.com' }
                ];

                const col = Collection.fromArray(TestModel, data);
                
                expect(col).toBeInstanceOf(Collection);
                expect(col.length()).toBe(2);
                expect(col.models[0]).toBeInstanceOf(TestModel);
                expect(col.models[0].get('name')).toBe('John');
            });

            it('should create empty collection from empty array', () => {
                const col = Collection.fromArray(TestModel, []);
                
                expect(col).toBeInstanceOf(Collection);
                expect(col.length()).toBe(0);
                expect(col.isEmpty()).toBe(true);
            });
        });

        describe('Error Handling', () => {
            it('should record network errors on collection.errors', async () => {
                // fetch() no longer throws — it catches the error, records it,
                // emits fetch:error, and returns a { success: false } result.
                mockRest.GET.mockRejectedValue(new Error('Network error'));

                const result = await collection.fetch();

                expect(result.success).toBe(false);
                expect(result.error).toBe('Network error');
                expect(collection.errors).toEqual({ fetch: 'Network error' });
            });

            it('should clear loading state on error', async () => {
                mockRest.GET.mockRejectedValue(new Error('Network error'));

                await collection.fetch();

                expect(collection.loading).toBe(false);
            });
        });

        describe('Custom Parse Method', () => {
            it('should use custom parse method', async () => {
                class CustomCollection extends Collection {
                    parse(response) {
                        if (response.data && response.data.users) {
                            this.meta = response.data.pagination;
                            return response.data.users;
                        }
                        return super.parse(response);
                    }
                }

                const customCol = new CustomCollection({
                    ModelClass: TestModel,
                    endpoint: '/api/users'
                });
                customCol.rest = mockRest;

                // _performFetch still requires response.data.status to enter
                // the success branch — the custom parse() shape is otherwise
                // unused.
                mockRest.GET.mockResolvedValue({
                    success: true,
                    data: {
                        status: 'ok',
                        users: [{ id: 1, name: 'John' }],
                        pagination: { total: 1, page: 1 }
                    }
                });

                await customCol.fetch();

                expect(customCol.length()).toBe(1);
                expect(customCol.meta).toEqual({ total: 1, page: 1 });
            });
        });
    });
};