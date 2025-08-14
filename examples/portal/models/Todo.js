import Collection from '../../../src/core/Collection.js';
import Model from '../../../src/core/Model.js';

window.Model = Model;

const TodoForms = {
    create: {
        title: 'Create Todo',
        fields: [
            { name: 'name', type: 'text', label: 'Name' },
            { name: 'description', type: 'textarea', label: 'Description' },
            { name: 'kind', type: 'select', label: 'Kind', options: ['task', 'event', 'reminder'] }
        ]
    }
};

// Simple Todo Model
class Todo extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/example/todo'
        });
    }
}


// Todo Collection with localStorage persistence
class TodoList extends Collection {
    constructor(options = {}) {
        super(Todo, {
            ...options
        });
    }
}

export { Todo, TodoList, TodoForms };
window.Todo = Todo;
window.TodoList = TodoList;
