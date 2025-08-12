import Collection from '../../../src/core/Collection.js';
import Model from '../../../src/core/Model.js';

window.Model = Model;

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

export { Todo, TodoList };
window.Todo = Todo;
window.TodoList = TodoList;