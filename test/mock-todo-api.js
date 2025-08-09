/**
 * Mock TODO API for testing
 * This module provides mock REST responses for the TodoTablePage
 * when the actual API server is not running
 */

import { Rest } from '../src/mojo.js';

// Store the original GET method
const originalGET = Rest.GET ? Rest.GET.bind(Rest) : null;

// Mock data storage
let mockTodos = [];
let mockEnabled = false;

/**
 * Generate mock todo items
 * @param {number} count - Number of todos to generate
 * @returns {Array} Array of todo objects
 */
function generateMockTodos(count = 50) {
    const kinds = ['task', 'bug', 'feature', 'ticket'];
    const priorities = ['low', 'medium', 'high'];
    const descriptions = [
        'Fix login form validation',
        'Add user profile page',
        'Update documentation',
        'Review pull request',
        'Optimize database queries',
        'Implement search feature',
        'Fix responsive layout',
        'Add unit tests',
        'Update dependencies',
        'Refactor authentication',
        'Add export functionality',
        'Improve error handling',
        'Create admin dashboard',
        'Fix memory leak',
        'Add dark mode support'
    ];
    
    const todos = [];
    for (let i = 1; i <= count; i++) {
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 60 - 30));
        
        todos.push({
            id: i,
            kind: kinds[Math.floor(Math.random() * kinds.length)],
            description: descriptions[Math.floor(Math.random() * descriptions.length)] + ` #${i}`,
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            date: date.toISOString().split('T')[0],
            note: Math.random() > 0.5 ? `Additional notes for item ${i}` : '',
            completed: Math.random() > 0.8,
            assignee: Math.random() > 0.5 ? `User ${Math.floor(Math.random() * 5 + 1)}` : null,
            tags: Math.random() > 0.5 ? ['important', 'review'][Math.floor(Math.random() * 2)] : null,
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    return todos;
}

/**
 * Mock GET method that intercepts REST calls
 * @param {string} url - The URL being called
 * @param {object} params - Query parameters
 * @returns {Promise} Promise that resolves with mock data
 */
async function mockGET(url, params = {}) {
    console.log('🎭 [MockAPI] Intercepting GET:', url, params);
    
    // Check if this is a TODO API call
    if (url.includes('/api/example/todo')) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Parse parameters
        const page = parseInt(params.page) || 1;
        const size = parseInt(params.size) || parseInt(params.per_page) || 10;
        const start = parseInt(params.start) || ((page - 1) * size);
        const search = params.search || '';
        const sort = params.sort || 'id';
        const order = params.order || 'asc';
        
        // Filter todos based on search
        let filteredTodos = [...mockTodos];
        if (search) {
            filteredTodos = filteredTodos.filter(todo => 
                todo.description.toLowerCase().includes(search.toLowerCase()) ||
                todo.kind.toLowerCase().includes(search.toLowerCase()) ||
                (todo.note && todo.note.toLowerCase().includes(search.toLowerCase()))
            );
        }
        
        // Sort todos
        filteredTodos.sort((a, b) => {
            let aVal = a[sort];
            let bVal = b[sort];
            
            // Handle null values
            if (aVal === null) return 1;
            if (bVal === null) return -1;
            
            // Compare values
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Paginate
        const paginatedTodos = filteredTodos.slice(start, start + size);
        
        // Return mock response in expected format
        const response = {
            data: paginatedTodos,
            total: filteredTodos.length,
            page: page,
            per_page: size,
            total_pages: Math.ceil(filteredTodos.length / size),
            success: true,
            message: 'Mock data loaded successfully'
        };
        
        console.log('🎭 [MockAPI] Returning mock response:', {
            count: paginatedTodos.length,
            total: filteredTodos.length,
            page: page
        });
        
        return response;
    }
    
    // For non-TODO API calls, use original method if available
    if (originalGET) {
        return originalGET(url, params);
    }
    
    // Default to empty response
    return { data: [], total: 0, success: false, message: 'No mock data available' };
}

/**
 * Enable mock API
 * @param {number} todoCount - Number of mock todos to generate
 */
export function enableMockAPI(todoCount = 50) {
    if (mockEnabled) {
        console.log('🎭 [MockAPI] Already enabled');
        return;
    }
    
    console.log(`🎭 [MockAPI] Enabling mock API with ${todoCount} todos`);
    
    // Generate mock data
    mockTodos = generateMockTodos(todoCount);
    
    // Replace REST.GET with mock
    if (Rest && typeof Rest.GET === 'function') {
        Rest.GET = mockGET;
        mockEnabled = true;
        console.log('🎭 [MockAPI] Mock API enabled successfully');
    } else {
        console.error('🎭 [MockAPI] Failed to enable - Rest.GET not found');
    }
}

/**
 * Disable mock API and restore original REST methods
 */
export function disableMockAPI() {
    if (!mockEnabled) {
        console.log('🎭 [MockAPI] Not enabled');
        return;
    }
    
    console.log('🎭 [MockAPI] Disabling mock API');
    
    // Restore original method
    if (Rest && originalGET) {
        Rest.GET = originalGET;
        mockEnabled = false;
        console.log('🎭 [MockAPI] Mock API disabled, original REST restored');
    }
    
    // Clear mock data
    mockTodos = [];
}

/**
 * Get current mock status
 * @returns {object} Mock API status
 */
export function getMockStatus() {
    return {
        enabled: mockEnabled,
        todoCount: mockTodos.length,
        hasOriginalGET: !!originalGET
    };
}

/**
 * Add a todo to mock data
 * @param {object} todo - Todo object to add
 */
export function addMockTodo(todo) {
    const newTodo = {
        id: mockTodos.length + 1,
        ...todo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    mockTodos.push(newTodo);
    return newTodo;
}

/**
 * Update a todo in mock data
 * @param {number} id - Todo ID
 * @param {object} updates - Updates to apply
 */
export function updateMockTodo(id, updates) {
    const index = mockTodos.findIndex(todo => todo.id === id);
    if (index !== -1) {
        mockTodos[index] = {
            ...mockTodos[index],
            ...updates,
            updated_at: new Date().toISOString()
        };
        return mockTodos[index];
    }
    return null;
}

/**
 * Delete a todo from mock data
 * @param {number} id - Todo ID
 */
export function deleteMockTodo(id) {
    const index = mockTodos.findIndex(todo => todo.id === id);
    if (index !== -1) {
        const deleted = mockTodos.splice(index, 1)[0];
        return deleted;
    }
    return null;
}

/**
 * Get all mock todos
 * @returns {Array} All mock todos
 */
export function getMockTodos() {
    return [...mockTodos];
}

/**
 * Reset mock data
 * @param {number} count - Number of todos to regenerate
 */
export function resetMockData(count = 50) {
    mockTodos = generateMockTodos(count);
    console.log(`🎭 [MockAPI] Reset with ${mockTodos.length} mock todos`);
}

// Export for testing
export default {
    enableMockAPI,
    disableMockAPI,
    getMockStatus,
    addMockTodo,
    updateMockTodo,
    deleteMockTodo,
    getMockTodos,
    resetMockData
};