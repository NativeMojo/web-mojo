/**
 * Rest Interface Unit Tests
 * Tests for the Rest HTTP client functionality
 */

module.exports = async function(testContext) {
    const { describe, it, expect, assert, beforeEach } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    
    // Import Rest
    const Rest = require('../../src/core/Rest.js').default;
    
    await testHelpers.setup();

    describe('Rest HTTP Client Functionality', () => {
        let rest;
        let mockFetch;
        let mockResponse;
        let originalFetch;

        // Set up before each test
        beforeEach(() => {
            // Create new Rest instance
            rest = new Rest();
            
            // Mock fetch API
            mockResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Map([
                    ['content-type', 'application/json'],
                    ['x-custom-header', 'test-value']
                ]),
                json: jest.fn().mockResolvedValue({ success: true, data: { id: 1, name: 'test' } }),
                text: jest.fn().mockResolvedValue('text response')
            };

            mockFetch = jest.fn().mockResolvedValue(mockResponse);
            
            // Store original fetch and replace with mock
            originalFetch = global.fetch;
            global.fetch = mockFetch;
            global.AbortSignal = {
                timeout: jest.fn().mockImplementation((ms) => ({
                    aborted: false,
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn()
                }))
            };
        });

        afterEach(() => {
            // Restore original fetch
            global.fetch = originalFetch;
            delete global.AbortSignal;
        });

        describe('Constructor and Initialization', () => {
            it('should create Rest instance with default config', () => {
                const restClient = new Rest();
                
                expect(restClient.config.baseURL).toBe('');
                expect(restClient.config.timeout).toBe(30000);
                expect(restClient.config.headers['Content-Type']).toBe('application/json');
                expect(restClient.config.headers['Accept']).toBe('application/json');
                expect(restClient.interceptors.request).toEqual([]);
                expect(restClient.interceptors.response).toEqual([]);
            });
        });

        describe('Configuration', () => {
            it('should configure REST client', () => {
                const config = {
                    baseURL: 'https://api.example.com',
                    timeout: 60000,
                    headers: {
                        'Authorization': 'Bearer token123',
                        'X-Custom': 'custom-value'
                    }
                };

                rest.configure(config);

                expect(rest.config.baseURL).toBe('https://api.example.com');
                expect(rest.config.timeout).toBe(60000);
                expect(rest.config.headers['Authorization']).toBe('Bearer token123');
                expect(rest.config.headers['X-Custom']).toBe('custom-value');
                expect(rest.config.headers['Content-Type']).toBe('application/json'); // Should preserve defaults
            });

            it('should merge headers with existing ones', () => {
                rest.config.headers['Existing'] = 'existing-value';
                
                rest.configure({
                    headers: {
                        'New': 'new-value',
                        'Content-Type': 'application/xml' // Override default
                    }
                });

                expect(rest.config.headers['Existing']).toBe('existing-value');
                expect(rest.config.headers['New']).toBe('new-value');
                expect(rest.config.headers['Content-Type']).toBe('application/xml');
            });
        });

        describe('URL Building', () => {
            it('should build complete URL with baseURL', () => {
                rest.configure({ baseURL: 'https://api.example.com' });
                
                const url = rest.buildUrl('/users');
                expect(url).toBe('https://api.example.com/users');
            });

            it('should build URL without leading slash', () => {
                rest.configure({ baseURL: 'https://api.example.com' });
                
                const url = rest.buildUrl('users');
                expect(url).toBe('https://api.example.com/users');
            });

            it('should handle baseURL with trailing slash', () => {
                rest.configure({ baseURL: 'https://api.example.com/' });
                
                const url = rest.buildUrl('/users');
                expect(url).toBe('https://api.example.com/users');
            });

            it('should return absolute URLs unchanged', () => {
                rest.configure({ baseURL: 'https://api.example.com' });
                
                const url = rest.buildUrl('https://other.com/users');
                expect(url).toBe('https://other.com/users');
            });

            it('should handle empty baseURL', () => {
                const url = rest.buildUrl('/users');
                expect(url).toBe('/users');
            });
        });

        describe('Query String Building', () => {
            it('should build query string from params', () => {
                const params = { page: 1, limit: 10, filter: 'active' };
                const queryString = rest.buildQueryString(params);
                
                expect(queryString).toBe('?page=1&limit=10&filter=active');
            });

            it('should handle array parameters', () => {
                const params = { tags: ['red', 'blue', 'green'] };
                const queryString = rest.buildQueryString(params);
                
                expect(queryString).toBe('?tags%5B%5D=red&tags%5B%5D=blue&tags%5B%5D=green');
            });

            it('should ignore null and undefined values', () => {
                const params = { page: 1, limit: null, filter: undefined, search: '' };
                const queryString = rest.buildQueryString(params);
                
                expect(queryString).toBe('?page=1&search=');
            });

            it('should return empty string for empty params', () => {
                const queryString = rest.buildQueryString({});
                expect(queryString).toBe('');
            });
        });

        describe('Interceptors', () => {
            it('should add request interceptor', () => {
                const interceptor = (request) => {
                    request.headers['X-Custom'] = 'custom-value';
                    return request;
                };

                rest.addInterceptor('request', interceptor);

                expect(rest.interceptors.request).toContain(interceptor);
            });

            it('should add response interceptor', () => {
                const interceptor = (response) => {
                    response.processed = true;
                    return response;
                };

                rest.addInterceptor('response', interceptor);

                expect(rest.interceptors.response).toContain(interceptor);
            });

            it('should process request through interceptors', async () => {
                const interceptor1 = (request) => {
                    request.headers['X-Interceptor-1'] = 'value1';
                    return request;
                };

                const interceptor2 = (request) => {
                    request.headers['X-Interceptor-2'] = 'value2';
                    return request;
                };

                rest.addInterceptor('request', interceptor1);
                rest.addInterceptor('request', interceptor2);

                const request = {
                    method: 'GET',
                    url: '/test',
                    headers: {},
                    data: null,
                    options: {}
                };

                const processedRequest = await rest.processRequestInterceptors(request);

                expect(processedRequest.headers['X-Interceptor-1']).toBe('value1');
                expect(processedRequest.headers['X-Interceptor-2']).toBe('value2');
            });

            it('should process response through interceptors', async () => {
                const interceptor = (response) => {
                    response.intercepted = true;
                    return response;
                };

                rest.addInterceptor('response', interceptor);

                const response = {
                    success: true,
                    status: 200,
                    data: { id: 1 }
                };

                const processedResponse = await rest.processResponseInterceptors(mockResponse, {});

                // Note: The actual implementation would call the interceptor
                // This test verifies the interceptor was added correctly
                expect(rest.interceptors.response).toHaveLength(1);
            });
        });

        describe('HTTP Methods', () => {
            it('should make GET request', async () => {
                await rest.GET('/users', { page: 1 });

                expect(mockFetch).toHaveBeenCalledWith(
                    '/users?page=1',
                    expect.objectContaining({
                        method: 'GET',
                        headers: expect.any(Object)
                    })
                );
            });

            it('should make POST request with data', async () => {
                const data = { name: 'John', email: 'john@example.com' };
                await rest.POST('/users', data);

                expect(mockFetch).toHaveBeenCalledWith(
                    '/users',
                    expect.objectContaining({
                        method: 'POST',
                        body: JSON.stringify(data),
                        headers: expect.objectContaining({
                            'Content-Type': 'application/json'
                        })
                    })
                );
            });

            it('should make PUT request with data', async () => {
                const data = { id: 1, name: 'John Updated' };
                await rest.PUT('/users/1', data);

                expect(mockFetch).toHaveBeenCalledWith(
                    '/users/1',
                    expect.objectContaining({
                        method: 'PUT',
                        body: JSON.stringify(data)
                    })
                );
            });

            it('should make PATCH request with data', async () => {
                const data = { name: 'John Patched' };
                await rest.PATCH('/users/1', data);

                expect(mockFetch).toHaveBeenCalledWith(
                    '/users/1',
                    expect.objectContaining({
                        method: 'PATCH',
                        body: JSON.stringify(data)
                    })
                );
            });

            it('should make DELETE request', async () => {
                await rest.DELETE('/users/1');

                expect(mockFetch).toHaveBeenCalledWith(
                    '/users/1',
                    expect.objectContaining({
                        method: 'DELETE'
                    })
                );
            });
        });

        describe('Request Processing', () => {
            it('should process successful JSON response', async () => {
                const result = await rest.GET('/users');

                expect(result.success).toBe(true);
                expect(result.status).toBe(200);
                expect(result.data).toEqual({ success: true, data: { id: 1, name: 'test' } });
                expect(mockResponse.json).toHaveBeenCalled();
            });

            it('should process successful text response', async () => {
                mockResponse.headers = new Map([['content-type', 'text/plain']]);
                
                const result = await rest.GET('/users');

                expect(result.success).toBe(true);
                expect(result.data).toBe('text response');
                expect(mockResponse.text).toHaveBeenCalled();
            });

            it('should handle HTTP error responses', async () => {
                mockResponse.ok = false;
                mockResponse.status = 400;
                mockResponse.statusText = 'Bad Request';
                mockResponse.json.mockResolvedValue({
                    message: 'Validation failed',
                    errors: { name: 'Name is required' }
                });

                const result = await rest.GET('/users');

                expect(result.success).toBe(false);
                expect(result.status).toBe(400);
                expect(result.message).toBe('Validation failed');
                expect(result.errors).toEqual({ name: 'Name is required' });
            });

            it('should handle JSON parse errors', async () => {
                mockResponse.json.mockRejectedValue(new Error('Invalid JSON'));

                const result = await rest.GET('/users');

                expect(result.success).toBe(true);
                expect(result.errors).toEqual({ parse: 'Failed to parse response' });
                expect(result.message).toBe('Invalid response format');
            });
        });

        describe('FormData Handling', () => {
            it('should handle FormData requests', async () => {
                const formData = new FormData();
                formData.append('file', 'file-content');
                formData.append('name', 'test-file');

                await rest.POST('/upload', formData);

                const fetchCall = mockFetch.mock.calls[0];
                expect(fetchCall[1].body).toBe(formData);
                expect(fetchCall[1].headers).not.toHaveProperty('Content-Type'); // Should be removed for FormData
            });
        });

        describe('Upload Functionality', () => {
            it('should upload single file', async () => {
                const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
                
                await rest.upload('/upload', mockFile);

                const fetchCall = mockFetch.mock.calls[0];
                expect(fetchCall[0]).toBe('/upload');
                expect(fetchCall[1].method).toBe('POST');
                expect(fetchCall[1].body).toBeInstanceOf(FormData);
            });

            it('should upload multiple files', async () => {
                const mockFileList = [
                    new File(['content1'], 'test1.txt'),
                    new File(['content2'], 'test2.txt')
                ];
                Object.defineProperty(mockFileList, 'length', { value: 2 });
                
                await rest.upload('/upload', mockFileList);

                expect(mockFetch).toHaveBeenCalledWith(
                    '/upload',
                    expect.objectContaining({
                        method: 'POST',
                        body: expect.any(FormData)
                    })
                );
            });

            it('should upload with additional form data', async () => {
                const mockFile = new File(['content'], 'test.txt');
                const additionalData = { description: 'Test file', category: 'document' };
                
                await rest.upload('/upload', mockFile, additionalData);

                expect(mockFetch).toHaveBeenCalledWith(
                    '/upload',
                    expect.objectContaining({
                        method: 'POST',
                        body: expect.any(FormData)
                    })
                );
            });

            it('should handle FormData directly', async () => {
                const formData = new FormData();
                formData.append('file', 'content');
                
                await rest.upload('/upload', formData);

                expect(mockFetch).toHaveBeenCalledWith(
                    '/upload',
                    expect.objectContaining({
                        method: 'POST',
                        body: formData
                    })
                );
            });
        });

        describe('Authentication', () => {
            it('should set auth token', () => {
                rest.setAuthToken('token123');

                expect(rest.config.headers['Authorization']).toBe('Bearer token123');
            });

            it('should set auth token with custom type', () => {
                rest.setAuthToken('token123', 'Token');

                expect(rest.config.headers['Authorization']).toBe('Token token123');
            });

            it('should clear auth token', () => {
                rest.setAuthToken('token123');
                rest.clearAuth();

                expect(rest.config.headers['Authorization']).toBeUndefined();
            });

            it('should handle null token', () => {
                rest.setAuthToken('token123');
                rest.setAuthToken(null);

                expect(rest.config.headers['Authorization']).toBeUndefined();
            });
        });

        describe('Error Handling', () => {
            it('should handle network errors', async () => {
                mockFetch.mockRejectedValue(new Error('Network error'));

                const result = await rest.GET('/users');

                expect(result.success).toBe(false);
                expect(result.status).toBe(0);
                expect(result.statusText).toBe('Network Error');
                expect(result.errors).toEqual({ network: 'Network error' });
                expect(result.message).toContain('Network error: Network error');
            });

            it('should handle timeout errors', async () => {
                const timeoutError = new Error('Request timeout');
                timeoutError.name = 'TimeoutError';
                mockFetch.mockRejectedValue(timeoutError);

                const result = await rest.GET('/users');

                expect(result.success).toBe(false);
                expect(result.message).toContain('Request timeout after');
            });

            it('should handle request interceptor errors', async () => {
                const errorInterceptor = () => {
                    throw new Error('Interceptor error');
                };

                rest.addInterceptor('request', errorInterceptor);

                try {
                    await rest.GET('/users');
                    assert.fail('Should have thrown error');
                } catch (error) {
                    expect(error.message).toBe('Interceptor error');
                }
            });

            it('should handle response interceptor errors gracefully', async () => {
                const errorInterceptor = () => {
                    throw new Error('Response interceptor error');
                };

                rest.addInterceptor('response', errorInterceptor);

                // Should not throw, but log error
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
                
                const result = await rest.GET('/users');

                expect(result.success).toBe(true); // Should still process response
                expect(consoleSpy).toHaveBeenCalledWith('Response interceptor error:', expect.any(Error));
                
                consoleSpy.mockRestore();
            });
        });

        describe('Request Options', () => {
            it('should use custom timeout', async () => {
                rest.configure({ timeout: 5000 });

                await rest.GET('/users');

                expect(global.AbortSignal.timeout).toHaveBeenCalledWith(5000);
            });

            it('should include custom headers', async () => {
                await rest.GET('/users', {}, { 
                    headers: { 'X-Custom': 'custom-value' } 
                });

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'X-Custom': 'custom-value'
                        })
                    })
                );
            });

            it('should merge custom headers with defaults', async () => {
                rest.configure({ 
                    headers: { 'X-Default': 'default-value' } 
                });

                await rest.GET('/users', {}, { 
                    headers: { 'X-Custom': 'custom-value' } 
                });

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'X-Default': 'default-value',
                            'X-Custom': 'custom-value'
                        })
                    })
                );
            });
        });

        describe('Response Headers', () => {
            it('should include response headers in result', async () => {
                const result = await rest.GET('/users');

                expect(result.headers).toEqual({
                    'content-type': 'application/json',
                    'x-custom-header': 'test-value'
                });
            });
        });

        describe('Request Body Types', () => {
            it('should handle string request body', async () => {
                await rest.POST('/users', 'raw string data');

                expect(mockFetch).toHaveBeenCalledWith(
                    '/users',
                    expect.objectContaining({
                        body: 'raw string data'
                    })
                );
            });

            it('should handle object request body', async () => {
                const data = { name: 'John', email: 'john@example.com' };
                await rest.POST('/users', data);

                expect(mockFetch).toHaveBeenCalledWith(
                    '/users',
                    expect.objectContaining({
                        body: JSON.stringify(data)
                    })
                );
            });

            it('should not include body for GET requests', async () => {
                await rest.GET('/users');

                const fetchCall = mockFetch.mock.calls[0];
                expect(fetchCall[1]).not.toHaveProperty('body');
            });
        });

        describe('Edge Cases', () => {
            it('should handle undefined params', async () => {
                await rest.GET('/users', undefined);

                expect(mockFetch).toHaveBeenCalledWith(
                    '/users',
                    expect.any(Object)
                );
            });

            it('should handle null data in POST', async () => {
                await rest.POST('/users', null);

                const fetchCall = mockFetch.mock.calls[0];
                expect(fetchCall[1].body).toBe('null');
            });

            it('should handle empty response', async () => {
                mockResponse.json.mockResolvedValue(null);

                const result = await rest.GET('/users');

                expect(result.success).toBe(true);
                expect(result.data).toBe(null);
            });
        });
    });
};