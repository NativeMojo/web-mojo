/**
 * ComponentsPage - Basic MOJO component examples
 */

import Page from '../../../src/core/Page.js';
import View from '../../../src/core/View.js';
import Dialog from '../../../src/components/Dialog.js';

class ComponentsPage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      page_name: 'components',
      title: 'Components - MOJO Examples'
    });
  }
  
  async getTemplate() {
    return `
      <div class="example-page">
        <h1 class="mb-4">Basic Components</h1>
        <p class="lead">Learn about View components, lifecycle hooks, data binding, and event handling in MOJO.</p>
        
        <!-- Lifecycle Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Component Lifecycle</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-lifecycle-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>MOJO components follow a predictable lifecycle with hooks for initialization, rendering, and cleanup.</p>
          
          <div class="example-demo">
            <div id="lifecycle-demo"></div>
            <div class="lifecycle-log mt-3" id="lifecycle-log">
              <strong>Lifecycle Events:</strong>
            </div>
          </div>
        </div>
        
        <!-- Data Binding Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Data Binding</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-databinding-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Components automatically re-render when data changes using the updateData() method.</p>
          
          <div class="example-demo">
            <div id="data-demo"></div>
          </div>
        </div>
        
        <!-- Event Handling Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Event Handling</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-events-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Handle user interactions with data-action attributes and onAction methods.</p>
          
          <div class="example-demo">
            <div id="events-demo"></div>
          </div>
        </div>
        
        <!-- Child Components Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Child Components</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-children-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Components can contain and manage child components with proper lifecycle management.</p>
          
          <div class="example-demo">
            <div id="children-demo"></div>
          </div>
        </div>
        
        <!-- Custom Events Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Custom Events</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-custom-events-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Components can emit and listen to custom events for inter-component communication.</p>
          
          <div class="example-demo">
            <div id="custom-events-demo"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  async onAfterMount() {
    await super.onAfterMount();
    
    // Create all demo components
    this.createLifecycleDemo();
    this.createDataBindingDemo();
    this.createEventHandlingDemo();
    this.createChildrenDemo();
    this.createCustomEventsDemo();
  }
  
  createLifecycleDemo() {
    const logEl = this.element.querySelector('#lifecycle-log');
    const containerEl = this.element.querySelector('#lifecycle-demo');
    
    class LifecycleDemo extends View {
      constructor() {
        super({
          tagName: 'div',
          className: 'alert alert-info'
        });
      }
      
      onInit() {
        this.addLog('onInit() - Component initialized');
      }
      
      async onBeforeRender() {
        this.addLog('onBeforeRender() - Before template rendering');
      }
      
      async onAfterRender() {
        this.addLog('onAfterRender() - After template rendering');
      }
      
      async onBeforeMount() {
        this.addLog('onBeforeMount() - Before DOM mounting');
      }
      
      async onAfterMount() {
        this.addLog('onAfterMount() - After DOM mounting');
      }
      
      async getTemplate() {
        return `
          <p><strong>Lifecycle Demo Component</strong></p>
          <p>Check the log below to see the lifecycle events!</p>
          <button class="btn btn-sm btn-warning" data-action="refresh">
            Re-render Component
          </button>
        `;
      }
      
      async onActionRefresh() {
        this.addLog('Re-rendering component...');
        await this.render();
      }
      
      addLog(message) {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'small text-muted';
        logEntry.innerHTML = `<code>[${time}]</code> ${message}`;
        logEl.appendChild(logEntry);
        logEl.scrollTop = logEl.scrollHeight;
      }
    }
    
    const demo = new LifecycleDemo();
    demo.setContainer(containerEl);
    demo.init();
    demo.render();
  }
  
  createDataBindingDemo() {
    const containerEl = this.element.querySelector('#data-demo');
    
    class DataBindingDemo extends View {
      constructor() {
        super({
          tagName: 'div'
        });
        this.data = {
          count: 0,
          message: 'Click the buttons to update the data!',
          items: ['Item 1', 'Item 2', 'Item 3']
        };
      }
      
      async getTemplate() {
        return `
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Count: {{count}}</h5>
              <p class="card-text">{{message}}</p>
              
              <div class="mb-3">
                <h6>Items:</h6>
                <ul class="list-group list-group-flush">
                  ${this.data.items.map(item => 
                    `<li class="list-group-item">${item}</li>`
                  ).join('')}
                </ul>
              </div>
              
              <div class="btn-group">
                <button class="btn btn-primary" data-action="increment">
                  <i class="bi bi-plus"></i> Increment
                </button>
                <button class="btn btn-danger" data-action="decrement">
                  <i class="bi bi-dash"></i> Decrement
                </button>
                <button class="btn btn-success" data-action="add-item">
                  <i class="bi bi-plus-circle"></i> Add Item
                </button>
                <button class="btn btn-secondary" data-action="reset">
                  <i class="bi bi-arrow-clockwise"></i> Reset
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      async onActionIncrement() {
        this.updateData({
          count: this.data.count + 1,
          message: `Count increased to ${this.data.count + 1}!`
        });
      }
      
      async onActionDecrement() {
        this.updateData({
          count: Math.max(0, this.data.count - 1),
          message: `Count decreased to ${Math.max(0, this.data.count - 1)}!`
        });
      }
      
      async onActionAddItem() {
        const newItems = [...this.data.items, `Item ${this.data.items.length + 1}`];
        this.updateData({
          items: newItems,
          message: `Added item! Total items: ${newItems.length}`
        });
      }
      
      async onActionReset() {
        this.updateData({
          count: 0,
          message: 'Data reset!',
          items: ['Item 1', 'Item 2', 'Item 3']
        });
      }
    }
    
    const demo = new DataBindingDemo();
    demo.setContainer(containerEl);
    demo.init();
    demo.render();
  }
  
  createEventHandlingDemo() {
    const containerEl = this.element.querySelector('#events-demo');
    
    class EventHandlingDemo extends View {
      constructor() {
        super();
        this.data = {
          lastAction: 'None',
          clickCount: 0,
          inputValue: '',
          selectedOption: 'option1'
        };
      }
      
      async getTemplate() {
        return `
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Event Handling Demo</h5>
              
              <div class="alert alert-light">
                <strong>Last Action:</strong> {{lastAction}}<br>
                <strong>Click Count:</strong> {{clickCount}}<br>
                <strong>Input Value:</strong> {{inputValue}}<br>
                <strong>Selected Option:</strong> {{selectedOption}}
              </div>
              
              <div class="mb-3">
                <button class="btn btn-primary me-2" data-action="click">
                  Click Me
                </button>
                <button class="btn btn-info me-2" data-action="double" data-value="test">
                  Button with Data
                </button>
                <button class="btn btn-warning" data-action="async">
                  Async Action
                </button>
              </div>
              
              <div class="mb-3">
                <input type="text" 
                       class="form-control" 
                       placeholder="Type something..." 
                       data-action="input"
                       value="{{inputValue}}">
              </div>
              
              <div class="mb-3">
                <select class="form-select" data-action="select">
                  <option value="option1">Option 1</option>
                  <option value="option2">Option 2</option>
                  <option value="option3">Option 3</option>
                </select>
              </div>
            </div>
          </div>
        `;
      }
      
      async onActionClick(event, element) {
        this.updateData({
          lastAction: 'Button clicked',
          clickCount: this.data.clickCount + 1
        });
      }
      
      async onActionDouble(event, element) {
        const value = element.dataset.value;
        this.updateData({
          lastAction: `Button with data-value="${value}" clicked`,
          clickCount: this.data.clickCount + 1
        });
      }
      
      async onActionAsync(event, element) {
        this.updateData({ lastAction: 'Async action started...' });
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.updateData({ 
          lastAction: 'Async action completed!',
          clickCount: this.data.clickCount + 1
        });
      }
      
      async onActionInput(event, element) {
        this.updateData({
          inputValue: element.value,
          lastAction: `Input changed to: "${element.value}"`
        });
      }
      
      async onActionSelect(event, element) {
        this.updateData({
          selectedOption: element.value,
          lastAction: `Selected: ${element.value}`
        });
      }
    }
    
    const demo = new EventHandlingDemo();
    demo.setContainer(containerEl);
    demo.init();
    demo.render();
  }
  
  createChildrenDemo() {
    const containerEl = this.element.querySelector('#children-demo');
    
    class ChildComponent extends View {
      constructor(options = {}) {
        super(options);
        this.data = {
          name: options.name || 'Child',
          color: options.color || 'primary'
        };
      }
      
      async getTemplate() {
        return `
          <div class="badge bg-{{color}} me-2 mb-2">
            {{name}}
            <button type="button" class="btn-close btn-close-white ms-2" 
                    data-action="remove" aria-label="Remove"></button>
          </div>
        `;
      }
      
      async onActionRemove() {
        this.emit('remove', { child: this });
      }
    }
    
    class ParentComponent extends View {
      constructor() {
        super();
        this.childCount = 0;
        this.colors = ['primary', 'success', 'danger', 'warning', 'info'];
      }
      
      async getTemplate() {
        return `
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Parent Component</h5>
              <p>Children: ${this.children.length}</p>
              
              <div class="mb-3" id="children-container">
                <!-- Children will be rendered here -->
              </div>
              
              <button class="btn btn-success" data-action="add-child">
                <i class="bi bi-plus-circle"></i> Add Child
              </button>
              <button class="btn btn-danger" data-action="remove-all">
                <i class="bi bi-trash"></i> Remove All
              </button>
            </div>
          </div>
        `;
      }
      
      async onAfterRender() {
        await super.onAfterRender();
        
        // Render existing children
        const container = this.element.querySelector('#children-container');
        for (const child of this.children) {
          child.setContainer(container);
          await child.render();
        }
      }
      
      async onActionAddChild() {
        this.childCount++;
        const color = this.colors[this.childCount % this.colors.length];
        
        const child = new ChildComponent({
          name: `Child ${this.childCount}`,
          color: color
        });
        
        // Listen for remove event
        child.on('remove', async (data) => {
          this.removeChild(data.child);
          await this.render();
        });
        
        this.addChild(child);
        
        // Render the new child
        const container = this.element.querySelector('#children-container');
        child.setContainer(container);
        await child.render();
        await child.mount();
      }
      
      async onActionRemoveAll() {
        // Remove all children
        while (this.children.length > 0) {
          const child = this.children[0];
          await child.destroy();
          this.removeChild(child);
        }
        this.childCount = 0;
        await this.render();
      }
    }
    
    const demo = new ParentComponent();
    demo.setContainer(containerEl);
    demo.init();
    demo.render();
  }
  
  createCustomEventsDemo() {
    const containerEl = this.element.querySelector('#custom-events-demo');
    
    class EventEmitter extends View {
      async getTemplate() {
        return `
          <div class="card mb-2">
            <div class="card-body">
              <h6>Event Emitter</h6>
              <div class="btn-group">
                <button class="btn btn-sm btn-primary" data-action="emit-info">
                  Emit Info
                </button>
                <button class="btn btn-sm btn-success" data-action="emit-success">
                  Emit Success
                </button>
                <button class="btn btn-sm btn-danger" data-action="emit-error">
                  Emit Error
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      async onActionEmitInfo() {
        this.emit('custom:message', { 
          type: 'info', 
          message: 'Information event emitted!' 
        });
      }
      
      async onActionEmitSuccess() {
        this.emit('custom:message', { 
          type: 'success', 
          message: 'Success event emitted!' 
        });
      }
      
      async onActionEmitError() {
        this.emit('custom:message', { 
          type: 'error', 
          message: 'Error event emitted!' 
        });
      }
    }
    
    class EventListener extends View {
      constructor() {
        super();
        this.data = {
          messages: []
        };
      }
      
      async getTemplate() {
        return `
          <div class="card">
            <div class="card-body">
              <h6>Event Listener</h6>
              <div class="event-log" style="max-height: 200px; overflow-y: auto;">
                ${this.data.messages.length === 0 ? 
                  '<p class="text-muted">No events received yet...</p>' :
                  this.data.messages.map(msg => `
                    <div class="alert alert-${msg.type === 'error' ? 'danger' : msg.type} py-1 px-2 mb-1">
                      <small>${msg.time}: ${msg.message}</small>
                    </div>
                  `).join('')
                }
              </div>
              <button class="btn btn-sm btn-secondary mt-2" data-action="clear">
                Clear Log
              </button>
            </div>
          </div>
        `;
      }
      
      handleCustomMessage(data) {
        const messages = [...this.data.messages];
        messages.push({
          ...data,
          time: new Date().toLocaleTimeString()
        });
        
        // Keep only last 10 messages
        if (messages.length > 10) {
          messages.shift();
        }
        
        this.updateData({ messages });
      }
      
      async onActionClear() {
        this.updateData({ messages: [] });
      }
    }
    
    // Create and connect components
    const emitter = new EventEmitter();
    const listener = new EventListener();
    
    // Connect events
    emitter.on('custom:message', (data) => {
      listener.handleCustomMessage(data);
    });
    
    // Create container
    const wrapper = document.createElement('div');
    containerEl.appendChild(wrapper);
    
    // Render both components
    const emitterContainer = document.createElement('div');
    const listenerContainer = document.createElement('div');
    wrapper.appendChild(emitterContainer);
    wrapper.appendChild(listenerContainer);
    
    emitter.setContainer(emitterContainer);
    listener.setContainer(listenerContainer);
    
    emitter.init();
    emitter.render();
    listener.init();
    listener.render();
  }
  
  // Source code viewing actions
  async onActionShowLifecycleSource() {
    const code = `class LifecycleDemo extends View {
  onInit() {
    console.log('Component initialized');
  }
  
  async onBeforeRender() {
    console.log('Before render');
  }
  
  async onAfterRender() {
    console.log('After render');
  }
  
  async onBeforeMount() {
    console.log('Before mount');
  }
  
  async onAfterMount() {
    console.log('After mount');
  }
  
  async onBeforeDestroy() {
    console.log('Before destroy');
  }
  
  async onAfterDestroy() {
    console.log('After destroy');
  }
}`;
    
    await Dialog.showCode({
      title: 'Component Lifecycle Source',
      code: code,
      language: 'javascript'
    });
  }
  
  async onActionShowDatabindingSource() {
    const code = `class DataBindingDemo extends View {
  constructor() {
    super();
    this.data = {
      count: 0,
      message: 'Initial message'
    };
  }
  
  async getTemplate() {
    return \`
      <div>
        <h3>Count: {{count}}</h3>
        <p>{{message}}</p>
        <button data-action="increment">Increment</button>
      </div>
    \`;
  }
  
  async onActionIncrement() {
    // Update data triggers re-render
    this.updateData({
      count: this.data.count + 1,
      message: \`Count is now \${this.data.count + 1}\`
    });
  }
}`;
    
    await Dialog.showCode({
      title: 'Data Binding Source',
      code: code,
      language: 'javascript'
    });
  }
  
  async onActionShowEventsSource() {
    const code = `class EventHandlingDemo extends View {
  async getTemplate() {
    return \`
      <button data-action="click">Click Me</button>
      <input data-action="input" placeholder="Type...">
      <select data-action="select">
        <option>Option 1</option>
        <option>Option 2</option>
      </select>
    \`;
  }
  
  // Handle button click
  async onActionClick(event, element) {
    console.log('Button clicked!', element);
  }
  
  // Handle input change
  async onActionInput(event, element) {
    console.log('Input value:', element.value);
  }
  
  // Handle select change
  async onActionSelect(event, element) {
    console.log('Selected:', element.value);
  }
}`;
    
    await Dialog.showCode({
      title: 'Event Handling Source',
      code: code,
      language: 'javascript'
    });
  }
  
  async onActionShowChildrenSource() {
    const code = `class ParentComponent extends View {
  constructor() {
    super();
    // Children array is built-in
  }
  
  async onActionAddChild() {
    const child = new ChildComponent();
    
    // Add child to parent
    this.addChild(child);
    
    // Render child in container
    child.setContainer(container);
    await child.render();
  }
  
  async onActionRemoveChild(child) {
    // Remove child
    await child.destroy();
    this.removeChild(child);
  }
}

class ChildComponent extends View {
  async getTemplate() {
    return '<div>I am a child component</div>';
  }
}`;
    
    await Dialog.showCode({
      title: 'Child Components Source',
      code: code,
      language: 'javascript'
    });
  }
  
  async onActionShowCustomEventsSource() {
    const code = `class EventEmitter extends View {
  async onActionEmit() {
    // Emit custom event
    this.emit('custom:message', {
      type: 'info',
      message: 'Hello from emitter!'
    });
  }
}

class EventListener extends View {
  constructor() {
    super();
    this.messages = [];
  }
  
  handleMessage(data) {
    this.messages.push(data);
    this.render(); // Re-render to show new message
  }
}

// Connect components
const emitter = new EventEmitter();
const listener = new EventListener();

// Listen for custom events
emitter.on('custom:message', (data) => {
  listener.handleMessage(data);
});`;
    
    await Dialog.showCode({
      title: 'Custom Events Source',
      code: code,
      language: 'javascript'
    });
  }
}

export default ComponentsPage;