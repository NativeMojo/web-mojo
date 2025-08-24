/**
 * Rest - HTTP client for API communication
 * Provides methods for making REST API calls with interceptors and error handling
 */

class Rest {
  constructor() {
    this.config = {
      baseURL: '',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    this.interceptors = {
      request: [],
      response: []
    };
  }

  /**
   * Configure the REST client
   * @param {object} config - Configuration object
   */
  configure(config) {
    if (config.baseUrl) config.baseURL = config.baseUrl;
    this.config = {
      ...this.config,
      ...config,
      headers: {
        ...this.config.headers,
        ...config.headers
      }
    };

  }

  /**
   * Add request or response interceptor
   * @param {string} type - 'request' or 'response'
   * @param {function} interceptor - Interceptor function
   */
  addInterceptor(type, interceptor) {
    if (this.interceptors[type]) {
      this.interceptors[type].push(interceptor);
    }
  }

  /**
   * Build complete URL
   * @param {string} url - Endpoint URL
   * @returns {string} Complete URL
   */
  buildUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }


    const baseURL = this.config.baseURL.endsWith('/')
      ? this.config.baseURL.slice(0, -1)
      : this.config.baseURL;

    const endpoint = url.startsWith('/') ? url : `/${url}`;

    return `${baseURL}${endpoint}`;
  }

  /**
   * Build query string from parameters
   * @param {object} params - Query parameters
   * @returns {string} Query string
   */
  buildQueryString(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(`${key}[]`, v));
        } else {
          searchParams.append(key, value);
        }
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Process request through interceptors
   * @param {object} request - Request configuration
   * @returns {object} Processed request configuration
   */
  async processRequestInterceptors(request) {
    let processedRequest = { ...request };

    for (const interceptor of this.interceptors.request) {
      try {
        processedRequest = await interceptor(processedRequest);
      } catch (error) {
        console.error('Request interceptor error:', error);
        throw error;
      }
    }

    return processedRequest;
  }

  /**
   * Process response through interceptors
   * @param {Response} response - Fetch response object
   * @param {object} request - Original request configuration
   * @returns {object} Processed response data
   */
  async processResponseInterceptors(response, request) {
    let responseData = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: null,
      errors: null,
      message: null
    };

    // Parse response body
    try {
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const jsonData = await response.json();
        responseData.data = jsonData;

        // Handle API error responses
        if (!response.ok) {
          responseData.errors = jsonData.errors || {};
          responseData.message = jsonData.message || `HTTP ${response.status}: ${response.statusText}`;
        }
      } else {
        responseData.data = await response.text();

        if (!response.ok) {
          responseData.message = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
    } catch (error) {
      responseData.errors = { parse: 'Failed to parse response' };
      responseData.message = 'Invalid response format';
    }

    // Process through response interceptors
    for (const interceptor of this.interceptors.response) {
      try {
        responseData = await interceptor(responseData, request);
      } catch (error) {
        console.error('Response interceptor error:', error);
      }
    }

    return responseData;
  }

  /**
   * Make HTTP request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {object} data - Request body data
   * @param {object} params - Query parameters
   * @param {object} options - Additional request options
   * @returns {Promise} Promise that resolves with response data
   */
  async request(method, url, data = null, params = {}, options = {}) {
    // Build request configuration
    let request = {
      method: method.toUpperCase(),
      url: this.buildUrl(url) + this.buildQueryString(params),
      headers: {
        ...this.config.headers,
        ...options.headers
      },
      data,
      options: {
        timeout: this.config.timeout,
        ...options
      }
    };

    // Process request interceptors
    request = await this.processRequestInterceptors(request);

    // Prepare fetch options
    const fetchOptions = {
      method: request.method,
      headers: request.headers
    };

    // Handle abort signals - combine timeout and external signal if provided
    const signals = [];

    // Add timeout signal
    if (request.options.timeout) {
      signals.push(AbortSignal.timeout(request.options.timeout));
    }

    // Add external signal if provided
    if (request.options.signal) {
      signals.push(request.options.signal);
    }

    // Combine signals or use single signal
    if (signals.length > 1) {
      fetchOptions.signal = AbortSignal.any ? AbortSignal.any(signals) : signals[0];
    } else if (signals.length === 1) {
      fetchOptions.signal = signals[0];
    }

    // Add body for methods that support it
    if (request.data && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      if (request.data instanceof FormData) {
        fetchOptions.body = request.data;
        // Remove Content-Type header for FormData (browser sets it with boundary)
        delete fetchOptions.headers['Content-Type'];
      } else if (typeof request.data === 'object') {
        fetchOptions.body = JSON.stringify(request.data);
      } else {
        fetchOptions.body = request.data;
      }
    }

    try {
      // Make the request
      const response = await fetch(request.url, fetchOptions);

      // Process response through interceptors
      const responseData = await this.processResponseInterceptors(response, request);

      return responseData;

    } catch (error) {
      // Handle AbortError (cancellation) - re-throw to be handled by caller
      if (error.name === 'AbortError') {
        throw error;
      }

      // Handle network and timeout errors
      const errorResponse = {
        success: false,
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: null,
        errors: { network: error.message },
        message: error.name === 'TimeoutError'
          ? `Request timeout after ${request.options.timeout}ms`
          : `Network error: ${error.message}`
      };

      // Process error through response interceptors
      return await this.processResponseInterceptors(
        { ok: false, status: 0, statusText: 'Network Error', headers: new Headers() },
        request
      );
    }
  }

  /**
   * GET request
   * @param {string} url - Request URL
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with response data
   */
  async GET(url, params = {}, options = {}) {
    return this.request('GET', url, null, params, options);
  }

  /**
   * POST request
   * @param {string} url - Request URL
   * @param {object} data - Request body data
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with response data
   */
  async POST(url, data = {}, params = {}, options = {}) {
    return this.request('POST', url, data, params, options);
  }

  /**
   * PUT request
   * @param {string} url - Request URL
   * @param {object} data - Request body data
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with response data
   */
  async PUT(url, data = {}, params = {}, options = {}) {
    return this.request('PUT', url, data, params, options);
  }

  /**
   * PATCH request
   * @param {string} url - Request URL
   * @param {object} data - Request body data
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with response data
   */
  async PATCH(url, data = {}, params = {}, options = {}) {
    return this.request('PATCH', url, data, params, options);
  }

  /**
   * DELETE request
   * @param {string} url - Request URL
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with response data
   */
  async DELETE(url, params = {}, options = {}) {
    return this.request('DELETE', url, null, params, options);
  }

  /**
   * Upload file with raw PUT request (compatible with legacy backend)
   * @param {string} url - Upload URL
   * @param {File} file - Single file to upload
   * @param {object} options - Request options
   * @param {function} options.onProgress - Progress callback function(event)
   * @returns {Promise} Promise that resolves with response data
   */
  async upload(url, file, options = {}) {
    return new Promise((resolve, reject) => {
      // Validate input - only accept single File objects
      if (!(file instanceof File)) {
        reject(new Error('Only single File objects are supported for legacy backend compatibility'));
        return;
      }

      const xhr = new XMLHttpRequest();

      // Set up progress tracking if callback provided
      if (options.onProgress && typeof options.onProgress === 'function') {
        xhr.upload.onprogress = options.onProgress;
      }

      // Set up response handlers
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            data: xhr.response,
            status: xhr.status,
            statusText: xhr.statusText,
            xhr: xhr
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = function() {
        reject(new Error('Upload failed: Network error'));
      };

      xhr.ontimeout = function() {
        reject(new Error('Upload failed: Timeout'));
      };

      // Configure request - use PUT method with raw file data
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);

      // Set timeout if specified
      if (options.timeout) {
        xhr.timeout = options.timeout;
      }

      // Send the raw file data
      xhr.send(file);
    });
  }

  /**
   * Upload multiple files with multipart/form-data (for modern backends)
   * @param {string} url - Upload URL
   * @param {File|FileList|FormData} files - File(s) to upload
   * @param {object} additionalData - Additional form fields
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves with response data
   */
  async uploadMultipart(url, files, additionalData = {}, options = {}) {
    const formData = new FormData();

    // Add files to form data
    if (files instanceof FileList) {
      Array.from(files).forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
    } else if (files instanceof File) {
      formData.append('file', files);
    } else if (files instanceof FormData) {
      // Use provided FormData directly
      return this.POST(url, files, {}, options);
    }

    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this.POST(url, formData, {}, options);
  }

  /**
   * Set authentication token
   * @param {string} token - JWT or API token
   * @param {string} type - Token type ('Bearer', 'Token', etc.)
   */
  setAuthToken(token, type = 'Bearer') {
    if (token) {
      this.config.headers['Authorization'] = `${type} ${token}`;
    } else {
      delete this.config.headers['Authorization'];
    }
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    delete this.config.headers['Authorization'];
  }
}

// Create singleton instance
const rest = new Rest();

export default rest;
