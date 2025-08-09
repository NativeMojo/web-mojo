import Page from '../../../src/core/Page.js';
import { Rest } from '../../../src/mojo.js';
import Todo from '../../models/Todo.js';
import TodoCollection from '../../models/TodoCollection.js';

// API Configuration (imported from models)
const API_BASE = 'http://0.0.0.0:8881';
const API_ENDPOINT = '/api/example/todo';

export default class ModelsPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            page_name: 'models',
            title: 'Models & Data Management'
        });
        
        // Initialize collections
        this.todoCollection = new TodoCollection();
        this.selectedTodo = null;
        this.newTodo = null;
        
        // Sample data for creation
        this.sampleTodoData = {
            kind: 'task',
            description: 'Sample TODO item',
            priority: 'medium',
            date: new Date().toISOString().split('T')[0]
        };
    }

    async onInit() {
        // Initialize REST client
        Rest.configure({
            baseURL: API_BASE,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    getTemplate() {
        return `
            <div class="container-fluid p-3">
                <h2 class="mb-4">MOJO Models & Data Management</h2>
                
                <!-- RestModel Overview -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">RestModel - TODO Example</h5>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i> 
                            This example demonstrates MOJO's RestModel and DataList classes using a real TODO API.
                            The API endpoint is: <code>${API_BASE}${API_ENDPOINT}</code>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-8">
                                <h6>Todo Collection</h6>
                                <div class="mb-2">
                                    <button class="btn btn-sm btn-primary" data-action="fetchTodos">
                                        <i class="bi bi-arrow-clockwise"></i> Fetch TODOs
                                    </button>
                                    <button class="btn btn-sm btn-success ms-2" data-action="createTodo">
                                        <i class="bi bi-plus-circle"></i> Create New TODO
                                    </button>
                                    <button class="btn btn-sm btn-warning ms-2" data-action="clearCollection">
                                        <i class="bi bi-x-circle"></i> Clear Collection
                                    </button>
                                </div>
                                
                                <div class="table-responsive">
                                    <table class="table table-sm table-hover">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Kind</th>
                                                <th>Description</th>
                                                <th>Priority</th>
                                                <th>Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="todos-table">
                                            <tr>
                                                <td colspan="6" class="text-center text-muted">
                                                    Click "Fetch TODOs" to load data
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div class="col-md-4">
                                <h6>Selected TODO Details</h6>
                                <div id="todo-details" class="bg-light p-3 rounded">
                                    <p class="text-muted mb-0">Select a TODO to view details</p>
                                </div>
                                
                                <h6 class="mt-3">Collection Info</h6>
                                <div id="collection-info" class="bg-light p-2 rounded">
                                    <dl class="row mb-0">
                                        <dt class="col-sm-6">Total Items:</dt>
                                        <dd class="col-sm-6" id="total-items">0</dd>
                                        <dt class="col-sm-6">Loaded:</dt>
                                        <dd class="col-sm-6" id="loaded-items">0</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Model Creation -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Model Creation & Updates</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Create New TODO</h6>
                                <form id="todo-form">
                                    <div class="mb-2">
                                        <label class="form-label">Description</label>
                                        <input type="text" id="todo-description" class="form-control form-control-sm" 
                                               value="New TODO item from MOJO">
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label">Kind</label>
                                            <select id="todo-kind" class="form-select form-select-sm">
                                                <option value="task">Task</option>
                                                <option value="bug">Bug</option>
                                                <option value="feature">Feature</option>
                                                <option value="ticket">Ticket</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6 mb-2">
                                            <label class="form-label">Priority</label>
                                            <select id="todo-priority" class="form-select form-select-sm">
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label">Date</label>
                                        <input type="date" id="todo-date" class="form-control form-control-sm">
                                    </div>
                                    <button type="button" class="btn btn-sm btn-success" data-action="saveTodo">
                                        <i class="bi bi-save"></i> Save TODO
                                    </button>
                                </form>
                            </div>
                            <div class="col-md-6">
                                <h6>Model Data (JSON)</h6>
                                <pre id="model-json" class="bg-dark text-light p-2 rounded" style="max-height: 200px; overflow-y: auto;">
{
  // Model data will appear here
}</pre>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- API Operations Log -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">API Operations Log</h5>
                    </div>
                    <div class="card-body">
                        <div id="api-log" class="bg-dark text-light p-2 rounded" style="height: 200px; overflow-y: auto; font-size: 0.8rem;">
                            <div class="text-muted">API operations will appear here...</div>
                        </div>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-secondary" data-action="clearLog">
                                <i class="bi bi-trash"></i> Clear Log
                            </button>
                        </div>
                    </div>
                </div>

                <!-- RestModel Reference -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">RestModel & DataList Reference</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>RestModel Methods</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td><code>get(key)</code></td>
                                        <td>Get attribute value</td>
                                    </tr>
                                    <tr>
                                        <td><code>set(key, value)</code></td>
                                        <td>Set attribute value</td>
                                    </tr>
                                    <tr>
                                        <td><code>fetch()</code></td>
                                        <td>Load from API</td>
                                    </tr>
                                    <tr>
                                        <td><code>save()</code></td>
                                        <td>Save to API</td>
                                    </tr>
                                    <tr>
                                        <td><code>destroy()</code></td>
                                        <td>Delete from API</td>
                                    </tr>
                                    <tr>
                                        <td><code>validate()</code></td>
                                        <td>Validate model data</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6>DataList Methods</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td><code>fetch(options)</code></td>
                                        <td>Load collection</td>
                                    </tr>
                                    <tr>
                                        <td><code>add(model)</code></td>
                                        <td>Add model to collection</td>
                                    </tr>
                                    <tr>
                                        <td><code>remove(model)</code></td>
                                        <td>Remove from collection</td>
                                    </tr>
                                    <tr>
                                        <td><code>get(id)</code></td>
                                        <td>Get model by ID</td>
                                    </tr>
                                    <tr>
                                        <td><code>filter(fn)</code></td>
                                        <td>Filter models</td>
                                    </tr>
                                    <tr>
                                        <td><code>toJSON()</code></td>
                                        <td>Export as JSON</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTodos() {
        if (!this.todoCollection.models || this.todoCollection.models.length === 0) {
            return `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No TODOs loaded
                    </td>
                </tr>
            `;
        }
        
        return this.todoCollection.models.map(todo => `
            <tr>
                <td>${todo.get('id')}</td>
                <td>${todo.getStatusBadge()}</td>
                <td>${todo.getShortDescription()}</td>
                <td>${todo.getPriorityBadge()}</td>
                <td>${todo.getFormattedDate()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" data-action="selectTodo" data-id="${todo.get('id')}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" data-action="deleteTodo" data-id="${todo.get('id')}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async onAfterMount() {
        // Set today's date as default
        const dateInput = document.getElementById('todo-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    async onActionFetchTodos() {
        this.logApiCall('GET', `${API_ENDPOINT}`, null, 'Fetching TODOs...');
        
        try {
            await this.todoCollection.fetch({
                per_page: 20,
                page: 1
            });
            
            // Update table
            document.getElementById('todos-table').innerHTML = this.renderTodos();
            
            // Update collection info
            this.updateCollectionInfo();
            
            this.logApiCall('SUCCESS', `${API_ENDPOINT}`, null, 
                `Loaded ${this.todoCollection.models.length} TODOs`);
        } catch (error) {
            this.logApiCall('ERROR', `${API_ENDPOINT}`, null, error.message);
        }
    }

    async onActionCreateTodo() {
        const todoData = {
            description: 'Sample TODO created from MOJO',
            kind: 'task',
            priority: 'medium',
            date: new Date().toISOString()
        };
        
        this.logApiCall('POST', `${API_ENDPOINT}`, todoData, 'Creating new TODO...');
        
        try {
            const todo = new Todo(todoData);
            await todo.save();
            
            // Add to collection
            this.todoCollection.add(todo);
            
            // Update table
            document.getElementById('todos-table').innerHTML = this.renderTodos();
            this.updateCollectionInfo();
            
            this.logApiCall('SUCCESS', `${API_ENDPOINT}`, todo.attributes, 
                `Created TODO with ID: ${todo.get('id')}`);
        } catch (error) {
            this.logApiCall('ERROR', `${API_ENDPOINT}`, todoData, error.message);
        }
    }

    async onActionSaveTodo() {
        const todoData = {
            description: document.getElementById('todo-description').value,
            kind: document.getElementById('todo-kind').value,
            priority: document.getElementById('todo-priority').value,
            date: document.getElementById('todo-date').value
        };
        
        // Display model data
        document.getElementById('model-json').textContent = JSON.stringify(todoData, null, 2);
        
        this.logApiCall('POST', `${API_ENDPOINT}`, todoData, 'Saving TODO...');
        
        try {
            const todo = new Todo(todoData);
            await todo.save();
            
            // Add to collection
            this.todoCollection.add(todo);
            
            // Update table
            document.getElementById('todos-table').innerHTML = this.renderTodos();
            this.updateCollectionInfo();
            
            this.logApiCall('SUCCESS', `${API_ENDPOINT}`, todo.attributes, 
                `Saved TODO with ID: ${todo.get('id')}`);
            
            // Clear form
            document.getElementById('todo-form').reset();
            document.getElementById('todo-date').value = new Date().toISOString().split('T')[0];
        } catch (error) {
            this.logApiCall('ERROR', `${API_ENDPOINT}`, todoData, error.message);
        }
    }

    async onActionSelectTodo(event, element) {
        const todoId = parseInt(element.dataset.id);
        this.selectedTodo = this.todoCollection.get(todoId);
        
        if (this.selectedTodo) {
            const detailsHtml = `
                <h6>TODO #${this.selectedTodo.get('id')}</h6>
                <dl class="row mb-0">
                    <dt class="col-sm-4">Kind:</dt>
                    <dd class="col-sm-8">${this.selectedTodo.getStatusBadge()}</dd>
                    <dt class="col-sm-4">Priority:</dt>
                    <dd class="col-sm-8">${this.selectedTodo.getPriorityBadge()}</dd>
                    <dt class="col-sm-4">Date:</dt>
                    <dd class="col-sm-8">${this.selectedTodo.getFormattedDate()}</dd>
                    <dt class="col-sm-4">Description:</dt>
                    <dd class="col-sm-8">${this.selectedTodo.get('description') || 'No description'}</dd>
                </dl>
                <button class="btn btn-sm btn-primary mt-2" data-action="editTodo">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            `;
            
            document.getElementById('todo-details').innerHTML = detailsHtml;
            
            // Display model JSON
            document.getElementById('model-json').textContent = 
                JSON.stringify(this.selectedTodo.attributes, null, 2);
        }
    }

    async onActionDeleteTodo(event, element) {
        const todoId = parseInt(element.dataset.id);
        const todo = this.todoCollection.get(todoId);
        
        if (todo) {
            this.logApiCall('DELETE', `${API_ENDPOINT}/${todoId}`, null, 'Deleting TODO...');
            
            try {
                await todo.destroy();
                
                // Remove from collection
                this.todoCollection.remove(todo);
                
                // Update table
                document.getElementById('todos-table').innerHTML = this.renderTodos();
                this.updateCollectionInfo();
                
                this.logApiCall('SUCCESS', `${API_ENDPOINT}/${todoId}`, null, 
                    `Deleted TODO #${todoId}`);
                
                // Clear details if this was selected
                if (this.selectedTodo && this.selectedTodo.get('id') === todoId) {
                    this.selectedTodo = null;
                    document.getElementById('todo-details').innerHTML = 
                        '<p class="text-muted mb-0">Select a TODO to view details</p>';
                }
            } catch (error) {
                this.logApiCall('ERROR', `${API_ENDPOINT}/${todoId}`, null, error.message);
            }
        }
    }

    async onActionEditTodo() {
        if (this.selectedTodo) {
            // Populate form with selected todo data
            document.getElementById('todo-description').value = this.selectedTodo.get('description') || '';
            document.getElementById('todo-kind').value = this.selectedTodo.get('kind') || 'task';
            document.getElementById('todo-priority').value = this.selectedTodo.get('priority') || 'medium';
            document.getElementById('todo-date').value = this.selectedTodo.get('date') || '';
            
            // Scroll to form
            document.getElementById('todo-form').scrollIntoView({ behavior: 'smooth' });
        }
    }

    async onActionClearCollection() {
        this.todoCollection.reset();
        document.getElementById('todos-table').innerHTML = this.renderTodos();
        this.updateCollectionInfo();
        this.logApiCall('INFO', 'Collection', null, 'Collection cleared (local only)');
    }

    async onActionClearLog() {
        document.getElementById('api-log').innerHTML = 
            '<div class="text-muted">API operations will appear here...</div>';
    }

    updateCollectionInfo() {
        document.getElementById('total-items').textContent = 
            this.todoCollection.total || this.todoCollection.models.length;
        document.getElementById('loaded-items').textContent = 
            this.todoCollection.models.length;
    }

    logApiCall(method, url, body, response) {
        const logDiv = document.getElementById('api-log');
        if (!logDiv) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const methodColor = {
            GET: 'text-info',
            POST: 'text-success',
            PUT: 'text-warning',
            DELETE: 'text-danger',
            SUCCESS: 'text-success',
            ERROR: 'text-danger',
            INFO: 'text-info'
        }[method] || 'text-light';
        
        const logEntry = `
            <div class="mb-2">
                <div class="${methodColor}">[${timestamp}] ${method} ${url}</div>
                ${body ? `<div class="text-muted small">Request: ${JSON.stringify(body)}</div>` : ''}
                <div class="text-light small">${response}</div>
            </div>
        `;
        
        // Clear initial message if present
        if (logDiv.querySelector('.text-muted')) {
            logDiv.innerHTML = '';
        }
        
        logDiv.innerHTML = logEntry + logDiv.innerHTML;
    }
}