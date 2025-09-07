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
      },
      trackDevice: true, // New setting to control DUID tracking
      duidHeader: 'X-Mojo-UID', // Header name for the DUID
      duidTransport: 'header' // How to send the DUID: 'payload' or 'header'
    };

    this.interceptors = {
      request: [],
      response: []
    };

    this.duid = null;
    if (this.config.trackDevice) {
      this._initializeDuid();
    }
  }

  /**
   * Initialize or generate the Device Unique ID (DUID)
   * @private
   */
  _initializeDuid() {
    const storageKey = 'mojo_device_uid';
    try {
      let storedDuid = localStorage.getItem(storageKey);
      if (storedDuid) {
        this.duid = storedDuid;
      } else {
        this.duid = this._generateDuid();
        localStorage.setItem(storageKey, this.duid);
      }
    } catch (e) {
      console.error("Could not access localStorage to get/set DUID.", e);
      // Use a non-persistent DUID as a fallback
      this.duid = this._generateDuid();
    }
  }

  /**
   * Generate a new DUID (UUID v4)
   * @private
   * @returns {string} A new UUID
   */
  _generateDuid() {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Configure the REST client
   * @param {object} config - Configuration object
   */
  configure(config) {
    if (config.baseUrl) config.baseURL = config.baseUrl;
    const oldTrackDevice = this.config.trackDevice;

    this.config = {
      ...this.config,
      ...config,
      headers: {
        ...this.config.headers,
        ...config.headers
      }
    };

    // Initialize DUID if tracking is newly enabled
    if (this.config.trackDevice && !oldTrackDevice) {
      this._initializeDuid();
    }
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
   * Categorize error into common reason codes
   * @param {Error} error - The error object
   * @param {number} status - HTTP status code (if available)
   * @returns {object} Object with reason code and user-friendly message
   */
  categorizeError(error, status = 0) {
    // Network/connection errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        reason: 'not_reachable',
        message: 'Service is not reachable - please check your connection'
      };
    }

    if (error.name === 'AbortError') {
      return {
        reason: 'cancelled',
        message: 'Request was cancelled'
      };
    }

    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        reason: 'timed_out',
        message: 'Request timed out - please try again'
      };
    }

    // HTTP status-based categorization
    if (status >= 400) {
      if (status === 400) {
        return {
          reason: 'bad_request',
          message: 'Invalid request data'
        };
      }
      if (status === 401) {
        return {
          reason: 'unauthorized',
          message: 'Authentication required'
        };
      }
      if (status === 403) {
        return {
          reason: 'forbidden',
          message: 'Access denied'
        };
      }
      if (status === 404) {
        return {
          reason: 'not_found',
          message: 'Resource not found'
        };
      }
      if (status === 409) {
        return {
          reason: 'conflict',
          message: 'Resource conflict'
        };
      }
      if (status === 422) {
        return {
          reason: 'validation_error',
          message: 'Validation failed'
        };
      }
      if (status === 429) {
        return {
          reason: 'rate_limited',
          message: 'Too many requests - please wait'
        };
      }
      if (status >= 500) {
        return {
          reason: 'server_error',
          message: 'Server error - please try again later'
        };
      }
      if (status >= 400) {
        return {
          reason: 'client_error',
          message: 'Request error'
        };
      }
    }

    // Generic network errors
    if (error.message.includes('CORS')) {
      return {
        reason: 'cors_error',
        message: 'Cross-origin request blocked'
      };
    }

    if (error.message.includes('DNS') || error.message.includes('ENOTFOUND')) {
      return {
        reason: 'dns_error',
        message: 'Unable to resolve server address'
      };
    }

    // Default fallback
    return {
      reason: 'unknown_error',
      message: `Network error: ${error.message}`
    };
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
      message: null,
      reason: null
    };

    // Parse response body
    try {
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const jsonData = await response.json();
        responseData.data = jsonData;

        // Handle API error responses
        if (!response.ok) {
          const errorInfo = this.categorizeError(new Error('HTTP Error'), response.status);
          responseData.errors = jsonData.errors || {};
          responseData.message = jsonData.message || errorInfo.message;
          responseData.reason = errorInfo.reason;
        }
      } else {
        responseData.data = await response.text();

        if (!response.ok) {
          const errorInfo = this.categorizeError(new Error('HTTP Error'), response.status);
          responseData.message = errorInfo.message;
          responseData.reason = errorInfo.reason;
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

    // Add DUID if tracking is enabled
    if (this.config.trackDevice && this.duid) {
      if (this.config.duidTransport === 'header') {
        // Always add as a header
        request.headers[this.config.duidHeader] = this.duid;
      } else { // 'payload' transport (default)
        if (request.method === 'GET') {
          // For GET requests, add as a query parameter
          const url = new URL(request.url);
          url.searchParams.append('duid', this.duid);
          request.url = url.toString();
        } else if (request.data && typeof request.data === 'object' && !(request.data instanceof FormData)) {
          // For POST/PUT/PATCH with JSON body, add to the data payload
          request.data.duid = this.duid;
        }
        // Note: For other request types like FormData, the duid is not sent in 'payload' mode.
      }
    }

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

      // Categorize the error
      const errorInfo = this.categorizeError(error);

      // Handle network and timeout errors
      const errorResponse = {
        success: false,
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: null,
        errors: { network: error.message },
        message: errorInfo.message,
        reason: errorInfo.reason
      };

      // Create mock response for interceptor processing
      const mockResponse = {
        ok: false,
        status: 0,
        statusText: 'Network Error',
        headers: new Headers(),
        json: async () => ({}),
        text: async () => ''
      };

      // Process through interceptors and return the categorized error
      await this.processResponseInterceptors(mockResponse, request);
      return errorResponse;
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
   * Download a file from a URL
   * @param {string} url - Request URL
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves when download is initiated
   */
  async download(url, params = {}, options = {}) {
    const requestUrl = this.buildUrl(url) + this.buildQueryString(params);
    const request = {
      method: 'GET',
      url: requestUrl,
      headers: {
        ...this.config.headers,
        'Accept': '*/*', // Default, can be overridden by options
        ...options.headers
      },
      options: {
        ...options
      }
    };
    // Remove content-type for GET request
    delete request.headers['Content-Type'];

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        signal: request.options.signal
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const contentDisposition = response.headers.get('content-disposition');
      let filename = options.filename || 'download';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      // Create download without loading entire file into memory
      const reader = response.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function pump() {
            return reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              return pump();
            });
          }
          return pump();
        }
      });

      const blob = await new Response(stream).blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

      return { success: true, message: 'Download initiated' };

    } catch (error) {
      console.error('Download error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Download a file from a URL by fetching the entire content into a Blob.
   * @param {string} url - Request URL
   * @param {object} params - Query parameters
   * @param {object} options - Request options
   * @returns {Promise} Promise that resolves when download is initiated
   */
  async downloadBlob(url, params = {}, options = {}) {
    const requestUrl = this.buildUrl(url) + this.buildQueryString(params);
    const request = {
      method: 'GET',
      url: requestUrl,
      headers: {
        ...this.config.headers,
        'Accept': '*/*', // Default, can be overridden by options
        ...options.headers
      },
      options: {
        ...options
      }
    };
    // Remove content-type for GET request
    delete request.headers['Content-Type'];

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        signal: request.options.signal
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = options.filename || 'download';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

      return { success: true, message: 'Download initiated' };

    } catch (error) {
      console.error('Download error:', error);
      return { success: false, message: error.message };
    }
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

  /**
   * Check if an error is retryable (network issues that might resolve)
   * @param {object} response - Response object with reason field
   * @returns {boolean} True if error can be retried
   */
  isRetryableError(response) {
    const retryableReasons = [
      'not_reachable',
      'timed_out',
      'server_error',
      'dns_error'
    ];
    return retryableReasons.includes(response.reason);
  }

  /**
   * Check if error requires authentication
   * @param {object} response - Response object with reason field
   * @returns {boolean} True if authentication is required
   */
  requiresAuth(response) {
    return response.reason === 'unauthorized';
  }

  /**
   * Check if error is network-related
   * @param {object} response - Response object with reason field
   * @returns {boolean} True if it's a network error
   */
  isNetworkError(response) {
    const networkReasons = [
      'not_reachable',
      'timed_out',
      'cancelled',
      'cors_error',
      'dns_error'
    ];
    return networkReasons.includes(response.reason);
  }

  /**
   * Get user-friendly error message based on reason
   * @param {object} response - Response object with reason field
   * @returns {string} User-friendly error message
   */
  getUserMessage(response) {
    if (response.message) {
      return response.message;
    }

    const messages = {
      'not_reachable': 'Unable to connect to the server. Please check your internet connection.',
      'timed_out': 'The request took too long. Please try again.',
      'cancelled': 'The request was cancelled.',
      'unauthorized': 'Please log in to continue.',
      'forbidden': 'You don\'t have permission to perform this action.',
      'not_found': 'The requested resource was not found.',
      'validation_error': 'Please check your input and try again.',
      'rate_limited': 'Too many requests. Please wait a moment before trying again.',
      'server_error': 'Server error. Please try again later.',
      'cors_error': 'Access blocked by security policy.',
      'dns_error': 'Unable to reach the server.',
      'unknown_error': 'An unexpected error occurred.'
    };

    return messages[response.reason] || 'An error occurred. Please try again.';
  }
}

// Create singleton instance
const rest = new Rest();

export default rest;
