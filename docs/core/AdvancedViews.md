# Advanced Views

**Advanced patterns for complex view implementations**

This guide covers advanced View patterns including custom render logic, Canvas/WebGL integration, state management, performance optimization, and complex component patterns.

---

## Table of Contents

### Custom Rendering
- [Overview](#custom-rendering-overview)
- [Overriding renderTemplate()](#overriding-rendertemplate)
- [Custom Render Logic](#custom-render-logic)
- [Bypassing Templates Entirely](#bypassing-templates-entirely)

### Canvas & WebGL Views
- [Canvas View Pattern](#canvas-view-pattern)
- [Animation Loop](#animation-loop)
- [WebGL Integration](#webgl-integration)
- [Performance Tips](#canvas-performance-tips)

### State Management
- [Local View State](#local-view-state)
- [Shared State Patterns](#shared-state-patterns)
- [State Change Detection](#state-change-detection)
- [Optimistic Updates](#optimistic-updates)

### Complex Patterns
- [Dynamic Child Views](#dynamic-child-views)
- [View Recycling](#view-recycling)
- [Virtual Scrolling](#virtual-scrolling)
- [Lazy Loading Content](#lazy-loading-content)

### Performance Optimization
- [Render Throttling](#render-throttling)
- [Selective Re-rendering](#selective-re-rendering)
- [Memory Management](#memory-management)
- [Profiling Views](#profiling-views)

### Advanced Lifecycle
- [Async Initialization](#async-initialization)
- [Cleanup Patterns](#cleanup-patterns)
- [View State Tracking](#view-state-tracking)

---

## Custom Rendering Overview

MOJO views use Mustache templates by default, but you can override rendering for complete control over how your view generates HTML.

**When to use custom rendering:**
- Canvas/WebGL/SVG manipulation
- Third-party libraries that manage their own DOM
- Performance-critical views with complex DOM updates
- Dynamic HTML generation beyond Mustache capabilities

**Key methods to override:**
- `renderTemplate()` - Change how template is processed
- `render()` - Full control over entire render process
- `onAfterRender()` - Post-render DOM manipulation

---

## Overriding renderTemplate()

Override `renderTemplate()` to customize template processing while keeping the standard render flow:

```javascript
import { View } from 'web-mojo/core';

class CustomTemplateView extends View {
  template = `
    <div>
      <h2>{{title}}</h2>
      <div class="content"></div>
    </div>
  `;
  
  async renderTemplate() {
    // Get base template HTML
    const templateContent = await this.getTemplate();
    if (!templateContent) return '';
    
    // Custom processing before Mustache
    const processedData = this.preprocessData();
    
    // Render with custom context
    const partials = this.getPartials();
    const html = Mustache.render(templateContent, processedData, partials);
    
    // Post-process HTML
    return this.postprocessHTML(html);
  }
  
  preprocessData() {
    // Transform data before template rendering
    return {
      ...this,
      title: this.model.get('title').toUpperCase(),
      computedValue: this.expensiveCalculation()
    };
  }
  
  postprocessHTML(html) {
    // Modify HTML after rendering
    return html.replace(/\[ICON:(\w+)\]/g, (match, icon) => {
      return `<i class="bi bi-${icon}"></i>`;
    });
  }
}
```

**Use cases:**
- Pre-processing data for templates
- Custom placeholder replacements
- Integrating non-Mustache template engines
- Adding syntax extensions

---

## Custom Render Logic

Override `render()` for complete control (use sparingly):

```javascript
class FullCustomView extends View {
  async render(allowMount = true, container = null) {
    if (!this.canRender()) return this;
    
    this.isRendering = true;
    
    try {
      // Initialize if needed
      if (!this.initialized) await this.onInitView();
      
      // Unbind events before manipulating DOM
      this.unbindEvents();
      
      // Custom lifecycle hook
      await this.onBeforeRender();
      
      // YOUR CUSTOM RENDER LOGIC HERE
      this.element.innerHTML = this.buildCustomHTML();
      
      // Mount if needed
      if (allowMount && !this.isMounted()) {
        await this.mount(container);
      }
      
      // Render children (if any)
      await this._renderChildren();
      
      // Post-render lifecycle
      await this.onAfterRender();
      
      // Rebind events
      this.bindEvents();
      
    } catch (e) {
      console.error(`Render error in ${this.id}`, e);
    } finally {
      this.isRendering = false;
    }
    
    return this;
  }
  
  buildCustomHTML() {
    // Build HTML without templates
    const items = this.model.get('items') || [];
    
    return `
      <div class="custom-view">
        <h2>${this.escapeHTML(this.model.get('title'))}</h2>
        <ul>
          ${items.map(item => `
            <li data-id="${item.id}">
              ${this.escapeHTML(item.name)}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

**⚠️ Important:** When overriding `render()`, you must:
1. Call lifecycle hooks in correct order
2. Handle `isRendering` flag
3. Unbind/rebind events
4. Render children if needed
5. Handle errors properly

---

## Bypassing Templates Entirely

For views that don't need templates (Canvas, third-party libraries):

```javascript
class NoTemplateView extends View {
  constructor(options = {}) {
    super({
      template: '', // Empty template
      ...options
    });
  }
  
  async onAfterRender() {
    await super.onAfterRender();
    
    // Element exists, do custom initialization
    this.initializeCustomContent();
  }
  
  initializeCustomContent() {
    // Create custom content directly
    this.element.innerHTML = `
      <div class="wrapper">
        <canvas id="myCanvas"></canvas>
      </div>
    `;
    
    this.canvas = this.element.querySelector('#myCanvas');
    this.setupCanvas();
  }
  
  setupCanvas() {
    // Canvas setup logic
  }
}
```

---

## Canvas View Pattern

Standard pattern for Canvas-based views:

```javascript
class CanvasView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="canvas-container">
          <canvas id="canvas" width="800" height="600"></canvas>
        </div>
      `,
      ...options
    });
    
    this.animationId = null;
    this.isAnimating = false;
  }
  
  async onAfterRender() {
    await super.onAfterRender();
    
    this.canvas = this.getChildElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Handle high DPI displays
    this.setupHighDPI();
    
    // Initial draw
    this.draw();
    
    // Start animation if needed
    if (this.options.animate) {
      this.startAnimation();
    }
  }
  
  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // Set actual size in memory
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // Scale context to match
    this.ctx.scale(dpr, dpr);
    
    // Set display size
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }
  
  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw content
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 10, 100, 100);
    
    // Draw text
    ctx.fillStyle = '#000';
    ctx.font = '16px sans-serif';
    ctx.fillText('Canvas View', 10, 140);
  }
  
  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }
  
  animate() {
    if (!this.isAnimating) return;
    
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  stopAnimation() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Clean up animation
    this.stopAnimation();
    
    // Release canvas context
    this.ctx = null;
    this.canvas = null;
  }
}
```

---

## Animation Loop

Optimized animation pattern with delta time:

```javascript
class AnimatedCanvasView extends CanvasView {
  constructor(options = {}) {
    super(options);
    
    this.lastFrameTime = 0;
    this.fps = 60;
    this.frameInterval = 1000 / this.fps;
  }
  
  animate(timestamp = 0) {
    if (!this.isAnimating) return;
    
    // Calculate delta time
    const deltaTime = timestamp - this.lastFrameTime;
    
    // Throttle to target FPS
    if (deltaTime >= this.frameInterval) {
      this.lastFrameTime = timestamp - (deltaTime % this.frameInterval);
      
      // Update state
      this.update(deltaTime);
      
      // Render
      this.draw();
    }
    
    this.animationId = requestAnimationFrame((ts) => this.animate(ts));
  }
  
  update(deltaTime) {
    // Update animation state
    // deltaTime is time since last frame in milliseconds
    this.rotation = (this.rotation || 0) + (deltaTime * 0.001);
  }
  
  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Save state
    ctx.save();
    
    // Transform
    ctx.translate(width / 2, height / 2);
    ctx.rotate(this.rotation);
    
    // Draw
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-50, -50, 100, 100);
    
    // Restore state
    ctx.restore();
  }
}
```

---

## WebGL Integration

Pattern for WebGL views:

```javascript
class WebGLView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="webgl-container">
          <canvas id="webgl-canvas"></canvas>
        </div>
      `,
      ...options
    });
  }
  
  async onAfterRender() {
    await super.onAfterRender();
    
    this.canvas = this.getChildElementById('webgl-canvas');
    this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
    
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }
    
    this.initWebGL();
    this.startAnimation();
  }
  
  initWebGL() {
    const gl = this.gl;
    
    // Create shader program
    const vertexShader = this.createShader(gl.VERTEX_SHADER, `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `);
    
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `);
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    
    // Setup buffers
    this.setupBuffers();
    
    // Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }
  
  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  createProgram(vertexShader, fragmentShader) {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }
  
  setupBuffers() {
    const gl = this.gl;
    
    // Create buffer with triangle vertices
    const positions = new Float32Array([
      0.0,  0.5,
      -0.5, -0.5,
      0.5, -0.5
    ]);
    
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  }
  
  draw() {
    const gl = this.gl;
    
    // Clear
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use program
    gl.useProgram(this.program);
    
    // Setup attributes
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Clean up WebGL resources
    const gl = this.gl;
    if (gl && this.program) {
      gl.deleteProgram(this.program);
      gl.deleteBuffer(this.buffer);
    }
    
    this.gl = null;
    this.canvas = null;
  }
}
```

---

## Canvas Performance Tips

1. **Use OffscreenCanvas for complex operations:**

```javascript
class OptimizedCanvasView extends CanvasView {
  async onAfterRender() {
    await super.onAfterRender();
    
    // Create offscreen canvas for complex drawing
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = this.canvas.width;
    this.offscreen.height = this.canvas.height;
    this.offscreenCtx = this.offscreen.getContext('2d');
  }
  
  draw() {
    // Draw complex stuff on offscreen canvas
    this.offscreenCtx.clearRect(0, 0, this.offscreen.width, this.offscreen.height);
    this.drawComplexContent(this.offscreenCtx);
    
    // Copy to main canvas (fast)
    this.ctx.drawImage(this.offscreen, 0, 0);
  }
}
```

2. **Batch drawing operations:**

```javascript
draw() {
  const ctx = this.ctx;
  
  // Group operations by style
  ctx.fillStyle = '#3498db';
  this.items.filter(i => i.type === 'blue').forEach(item => {
    ctx.fillRect(item.x, item.y, item.w, item.h);
  });
  
  ctx.fillStyle = '#e74c3c';
  this.items.filter(i => i.type === 'red').forEach(item => {
    ctx.fillRect(item.x, item.y, item.w, item.h);
  });
}
```

3. **Use integer coordinates:**

```javascript
draw() {
  // Round coordinates for better performance
  const x = Math.floor(this.position.x);
  const y = Math.floor(this.position.y);
  
  this.ctx.fillRect(x, y, 100, 100);
}
```

---

## Local View State

Manage view-specific state:

```javascript
class StatefulView extends View {
  constructor(options = {}) {
    super(options);
    
    // Initialize state
    this.state = {
      selectedId: null,
      filterText: '',
      sortBy: 'name',
      isLoading: false
    };
  }
  
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Trigger re-render if state changed
    if (this.shouldUpdate(oldState, this.state)) {
      this.render();
    }
  }
  
  shouldUpdate(oldState, newState) {
    // Only re-render if relevant state changed
    return oldState.selectedId !== newState.selectedId ||
           oldState.filterText !== newState.filterText ||
           oldState.sortBy !== newState.sortBy;
  }
  
  // Event handler
  onSelectItem(e) {
    const id = e.target.dataset.id;
    this.setState({ selectedId: id });
  }
  
  // Computed properties based on state
  getFilteredItems() {
    let items = this.model.get('items') || [];
    
    // Filter
    if (this.state.filterText) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(this.state.filterText.toLowerCase())
      );
    }
    
    // Sort
    items.sort((a, b) => {
      const field = this.state.sortBy;
      return a[field] > b[field] ? 1 : -1;
    });
    
    return items;
  }
  
  async onBeforeRender() {
    await super.onBeforeRender();
    
    // Make filtered items available to template
    this.filteredItems = this.getFilteredItems();
  }
}
```

---

## Shared State Patterns

Share state across multiple views:

```javascript
// StateManager.js
class StateManager {
  constructor() {
    this.state = {};
    this.listeners = [];
  }
  
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }
  
  getState() {
    return { ...this.state };
  }
  
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  notify() {
    this.listeners.forEach(callback => callback(this.state));
  }
}

export const appState = new StateManager();

// Using in views
class ConnectedView extends View {
  constructor(options = {}) {
    super(options);
    
    // Subscribe to state changes
    this.unsubscribe = appState.subscribe((state) => {
      this.onStateChange(state);
    });
  }
  
  onStateChange(state) {
    // Handle state changes
    if (state.currentUser !== this.currentUser) {
      this.currentUser = state.currentUser;
      this.render();
    }
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Unsubscribe from state
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
```

---

## State Change Detection

Efficient state change detection:

```javascript
class SmartView extends View {
  constructor(options = {}) {
    super(options);
    
    this.previousState = null;
  }
  
  async onBeforeRender() {
    await super.onBeforeRender();
    
    // Capture current state
    const currentState = this.captureState();
    
    // Compare with previous
    if (this.previousState) {
      const changes = this.detectChanges(this.previousState, currentState);
      
      if (changes.length === 0) {
        // No changes, skip render
        this.skipRender = true;
        return;
      }
      
      console.log('State changes:', changes);
    }
    
    this.previousState = currentState;
  }
  
  captureState() {
    return {
      modelData: this.model.toJSON(),
      viewState: { ...this.state },
      timestamp: Date.now()
    };
  }
  
  detectChanges(oldState, newState) {
    const changes = [];
    
    // Compare model data
    for (const key in newState.modelData) {
      if (oldState.modelData[key] !== newState.modelData[key]) {
        changes.push({ type: 'model', key, old: oldState.modelData[key], new: newState.modelData[key] });
      }
    }
    
    // Compare view state
    for (const key in newState.viewState) {
      if (oldState.viewState[key] !== newState.viewState[key]) {
        changes.push({ type: 'state', key, old: oldState.viewState[key], new: newState.viewState[key] });
      }
    }
    
    return changes;
  }
}
```

---

## Optimistic Updates

Handle optimistic UI updates:

```javascript
class OptimisticView extends View {
  async saveChanges(data) {
    // Show immediate feedback
    this.setState({ isSaving: true });
    
    // Optimistically update UI
    const originalData = this.model.toJSON();
    this.model.set(data);
    await this.render();
    
    try {
      // Save to server
      await this.model.save();
      
      // Success
      this.setState({ isSaving: false, saveError: null });
      
    } catch (error) {
      // Rollback on error
      this.model.set(originalData);
      await this.render();
      
      this.setState({ 
        isSaving: false, 
        saveError: error.message 
      });
    }
  }
  
  template = `
    <div>
      {{#state.isSaving}}
        <div class="saving">Saving...</div>
      {{/state.isSaving}}
      
      {{#state.saveError}}
        <div class="error">{{state.saveError}}</div>
      {{/state.saveError}}
      
      <input value="{{model.name}}" data-action="change:updateName">
    </div>
  `;
  
  updateName(e) {
    this.saveChanges({ name: e.target.value });
  }
}
```

---

## Dynamic Child Views

Add/remove child views dynamically:

```javascript
class DynamicListView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="list">
          <button data-action="click:addItem">Add Item</button>
          <div id="items-container"></div>
        </div>
      `,
      ...options
    });
    
    this.itemViews = [];
  }
  
  async onInit() {
    await super.onInit();
    
    // Create initial items
    const items = this.model.get('items') || [];
    items.forEach(item => this.addItemView(item));
  }
  
  addItemView(itemData) {
    const itemView = new ItemView({ 
      model: new ItemModel(itemData),
      containerId: 'items-container'
    });
    
    // Track for cleanup
    this.itemViews.push(itemView);
    
    // Add as child
    this.addChild(itemView);
    
    // Listen for remove
    itemView.on('remove', () => this.removeItemView(itemView));
  }
  
  removeItemView(itemView) {
    // Remove from tracking
    const index = this.itemViews.indexOf(itemView);
    if (index > -1) {
      this.itemViews.splice(index, 1);
    }
    
    // Remove from children
    this.removeChild(itemView);
  }
  
  addItem() {
    const newItem = { id: Date.now(), name: 'New Item' };
    this.addItemView(newItem);
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Clean up all item views
    this.itemViews.forEach(view => view.destroy());
    this.itemViews = [];
  }
}
```

---

## View Recycling

Reuse view instances for better performance:

```javascript
class RecyclingListView extends View {
  constructor(options = {}) {
    super(options);
    
    this.viewPool = [];
    this.activeViews = [];
  }
  
  getView() {
    // Try to reuse from pool
    if (this.viewPool.length > 0) {
      return this.viewPool.pop();
    }
    
    // Create new view
    return new ItemView();
  }
  
  recycleView(view) {
    // Reset view state
    view.model = null;
    view.element.innerHTML = '';
    
    // Return to pool
    this.viewPool.push(view);
  }
  
  async renderItems(items) {
    // Recycle all active views
    this.activeViews.forEach(view => {
      this.removeChild(view);
      this.recycleView(view);
    });
    this.activeViews = [];
    
    // Render new items
    items.forEach(item => {
      const view = this.getView();
      view.model = item;
      view.containerId = 'items-container';
      
      this.addChild(view);
      this.activeViews.push(view);
    });
    
    await this.render();
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Destroy all views (active + pool)
    [...this.activeViews, ...this.viewPool].forEach(view => view.destroy());
    this.activeViews = [];
    this.viewPool = [];
  }
}
```

---

## Virtual Scrolling

Efficient rendering for large lists:

```javascript
class VirtualScrollView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="virtual-scroll">
          <div class="scroll-container" data-action="scroll:onScroll">
            <div class="spacer-top" style="height: {{topHeight}}px"></div>
            <div id="visible-items"></div>
            <div class="spacer-bottom" style="height: {{bottomHeight}}px"></div>
          </div>
        </div>
      `,
      ...options
    });
    
    this.itemHeight = options.itemHeight || 50;
    this.bufferSize = options.bufferSize || 5;
    this.visibleRange = { start: 0, end: 0 };
  }
  
  async onAfterRender() {
    await super.onAfterRender();
    
    this.scrollContainer = this.element.querySelector('.scroll-container');
    this.updateVisibleRange();
  }
  
  onScroll() {
    requestAnimationFrame(() => this.updateVisibleRange());
  }
  
  updateVisibleRange() {
    const scrollTop = this.scrollContainer.scrollTop;
    const containerHeight = this.scrollContainer.clientHeight;
    const items = this.model.get('items') || [];
    
    // Calculate visible range
    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    const end = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.bufferSize);
    
    // Only update if range changed
    if (start === this.visibleRange.start && end === this.visibleRange.end) {
      return;
    }
    
    this.visibleRange = { start, end };
    this.renderVisibleItems();
  }
  
  async onBeforeRender() {
    await super.onBeforeRender();
    
    const items = this.model.get('items') || [];
    const { start, end } = this.visibleRange;
    
    // Calculate spacer heights
    this.topHeight = start * this.itemHeight;
    this.bottomHeight = (items.length - end) * this.itemHeight;
    
    // Get visible items
    this.visibleItems = items.slice(start, end);
  }
  
  renderVisibleItems() {
    const container = this.element.querySelector('#visible-items');
    if (!container) return;
    
    // Render only visible items
    const html = this.visibleItems.map((item, index) => `
      <div class="item" style="height: ${this.itemHeight}px" data-index="${this.visibleRange.start + index}">
        ${this.renderItem(item)}
      </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Update spacers
    this.element.querySelector('.spacer-top').style.height = `${this.topHeight}px`;
    this.element.querySelector('.spacer-bottom').style.height = `${this.bottomHeight}px`;
  }
  
  renderItem(item) {
    return `<span>${item.name}</span>`;
  }
}
```

---

## Lazy Loading Content

Load content on demand:

```javascript
class LazyContentView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="lazy-content">
          <div class="header">{{title}}</div>
          
          {{#isLoading|bool}}
            <div class="loading">Loading...</div>
          {{/isLoading|bool}}
          
          {{#content|bool}}
            <div class="content">{{{content}}}</div>
          {{/content|bool}}
          
          {{^loaded|bool}}
            <button data-action="click:loadContent">Load Content</button>
          {{/loaded|bool}}
        </div>
      `,
      ...options
    });
    
    this.loaded = false;
    this.isLoading = false;
    this.content = null;
  }
  
  async loadContent() {
    if (this.loaded || this.isLoading) return;
    
    this.isLoading = true;
    await this.render();
    
    try {
      // Simulate async load
      const response = await fetch(`/api/content/${this.model.id}`);
      this.content = await response.text();
      this.loaded = true;
      
    } catch (error) {
      console.error('Failed to load content:', error);
      this.content = '<p class="error">Failed to load content</p>';
      
    } finally {
      this.isLoading = false;
      await this.render();
    }
  }
}
```

---

## Render Throttling

Prevent excessive re-renders:

```javascript
class ThrottledView extends View {
  constructor(options = {}) {
    super(options);
    
    this.renderTimeout = null;
    this.minRenderInterval = 16; // ~60fps
    this.lastRenderTime = 0;
  }
  
  async render(allowMount = true, container = null) {
    const now = Date.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    
    // Throttle renders
    if (timeSinceLastRender < this.minRenderInterval) {
      // Schedule render for later
      if (!this.renderTimeout) {
        this.renderTimeout = setTimeout(() => {
          this.renderTimeout = null;
          this.render(allowMount, container);
        }, this.minRenderInterval - timeSinceLastRender);
      }
      return this;
    }
    
    this.lastRenderTime = now;
    return super.render(allowMount, container);
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Clear pending render
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
  }
}
```

---

## Selective Re-rendering

Update specific parts without full re-render:

```javascript
class SelectiveRenderView extends View {
  template = `
    <div class="dashboard">
      <div class="header" id="header">{{title}}</div>
      <div class="stats" id="stats"></div>
      <div class="content" id="content"></div>
    </div>
  `;
  
  updateTitle(newTitle) {
    this.title = newTitle;
    
    // Update only header
    const header = this.getChildElementById('header');
    if (header) {
      header.textContent = newTitle;
    }
  }
  
  updateStats(stats) {
    this.stats = stats;
    
    // Update only stats section
    const statsEl = this.getChildElementById('stats');
    if (statsEl) {
      statsEl.innerHTML = this.renderStatsHTML(stats);
    }
  }
  
  renderStatsHTML(stats) {
    return `
      <div class="stat">
        <label>Total</label>
        <value>${stats.total}</value>
      </div>
      <div class="stat">
        <label>Active</label>
        <value>${stats.active}</value>
      </div>
    `;
  }
  
  // Full render only when necessary
  async fullRender() {
    await this.render();
  }
}
```

---

## Memory Management

Prevent memory leaks:

```javascript
class MemoryAwareView extends View {
  constructor(options = {}) {
    super(options);
    
    // Track resources
    this.timers = [];
    this.intervals = [];
    this.listeners = [];
    this.requests = [];
  }
  
  setTimeout(callback, delay) {
    const id = setTimeout(callback, delay);
    this.timers.push(id);
    return id;
  }
  
  setInterval(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervals.push(id);
    return id;
  }
  
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }
  
  async fetch(url, options) {
    const controller = new AbortController();
    this.requests.push(controller);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      const index = this.requests.indexOf(controller);
      if (index > -1) {
        this.requests.splice(index, 1);
      }
    }
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Clear timers
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];
    
    // Clear intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
    
    // Remove listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    
    // Abort pending requests
    this.requests.forEach(controller => controller.abort());
    this.requests = [];
  }
}
```

---

## Profiling Views

Measure view performance:

```javascript
class ProfiledView extends View {
  constructor(options = {}) {
    super(options);
    
    this.metrics = {
      renderCount: 0,
      totalRenderTime: 0,
      avgRenderTime: 0,
      maxRenderTime: 0
    };
  }
  
  async render(allowMount = true, container = null) {
    const startTime = performance.now();
    
    try {
      return await super.render(allowMount, container);
    } finally {
      const renderTime = performance.now() - startTime;
      this.updateMetrics(renderTime);
    }
  }
  
  updateMetrics(renderTime) {
    this.metrics.renderCount++;
    this.metrics.totalRenderTime += renderTime;
    this.metrics.avgRenderTime = this.metrics.totalRenderTime / this.metrics.renderCount;
    this.metrics.maxRenderTime = Math.max(this.metrics.maxRenderTime, renderTime);
    
    // Log slow renders
    if (renderTime > 100) {
      console.warn(`Slow render (${renderTime.toFixed(2)}ms) in ${this.constructor.name}`);
    }
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
  
  resetMetrics() {
    this.metrics = {
      renderCount: 0,
      totalRenderTime: 0,
      avgRenderTime: 0,
      maxRenderTime: 0
    };
  }
}
```

---

## Async Initialization

Handle complex async initialization:

```javascript
class AsyncInitView extends View {
  constructor(options = {}) {
    super(options);
    
    this.initPromise = null;
    this.initError = null;
  }
  
  async onInit() {
    await super.onInit();
    
    // Create initialization promise
    this.initPromise = this.initialize();
    
    try {
      await this.initPromise;
    } catch (error) {
      this.initError = error;
      console.error('Initialization failed:', error);
    }
  }
  
  async initialize() {
    // Load dependencies in parallel
    const [userData, configData, themeData] = await Promise.all([
      this.loadUserData(),
      this.loadConfig(),
      this.loadTheme()
    ]);
    
    this.userData = userData;
    this.config = configData;
    this.theme = themeData;
    
    // Setup with loaded data
    this.setupWithData();
  }
  
  async loadUserData() {
    const response = await fetch('/api/user');
    return response.json();
  }
  
  async loadConfig() {
    const response = await fetch('/api/config');
    return response.json();
  }
  
  async loadTheme() {
    const response = await fetch('/api/theme');
    return response.json();
  }
  
  setupWithData() {
    // Configure view with loaded data
    this.applyTheme(this.theme);
    this.configureFeatures(this.config);
  }
  
  template = `
    <div>
      {{#initError}}
        <div class="error">Initialization failed: {{initError}}</div>
      {{/initError}}
      
      {{^initError}}
        <div class="content">
          <!-- Normal content -->
        </div>
      {{/initError}}
    </div>
  `;
}
```

---

## Cleanup Patterns

Comprehensive cleanup:

```javascript
class CleanView extends View {
  constructor(options = {}) {
    super(options);
    
    this.subscriptions = [];
    this.observers = [];
    this.workers = [];
  }
  
  async onInit() {
    await super.onInit();
    
    // Setup with cleanup tracking
    this.setupModelListeners();
    this.setupObservers();
    this.setupWorkers();
  }
  
  setupModelListeners() {
    // Track model subscriptions
    const onChange = () => this.render();
    this.model.on('change', onChange);
    this.subscriptions.push(() => this.model.off('change', onChange));
  }
  
  setupObservers() {
    // Mutation observer
    const observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
    
    observer.observe(this.element, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(observer);
  }
  
  setupWorkers() {
    // Web worker
    const worker = new Worker('/workers/data-processor.js');
    worker.onmessage = (e) => this.handleWorkerMessage(e);
    this.workers.push(worker);
  }
  
  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    // Unsubscribe all
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
    
    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Terminate workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
  }
}
```

---

## View State Tracking

Track view lifecycle state:

```javascript
class StatefulLifecycleView extends View {
  constructor(options = {}) {
    super(options);
    
    this.lifecycleState = 'created';
    this.stateHistory = ['created'];
  }
  
  setState(state) {
    this.lifecycleState = state;
    this.stateHistory.push(state);
    this.emit('statechange', state);
  }
  
  async onInit() {
    this.setState('initializing');
    await super.onInit();
    this.setState('initialized');
  }
  
  async render(allowMount, container) {
    this.setState('rendering');
    await super.render(allowMount, container);
    this.setState('rendered');
    return this;
  }
  
  async mount(container) {
    this.setState('mounting');
    await super.mount(container);
    this.setState('mounted');
    return this;
  }
  
  async destroy() {
    this.setState('destroying');
    await super.destroy();
    this.setState('destroyed');
  }
  
  getState() {
    return this.lifecycleState;
  }
  
  getStateHistory() {
    return [...this.stateHistory];
  }
  
  isState(state) {
    return this.lifecycleState === state;
  }
}
```

---

## Summary

Advanced view patterns extend MOJO's core capabilities:

**Custom Rendering:**
- Override `renderTemplate()` for custom template processing
- Override `render()` for complete control (use sparingly)
- Use empty template for Canvas/WebGL views

**Canvas & WebGL:**
- Standard Canvas pattern with high DPI support
- Animation loop with delta time
- WebGL integration with shader management
- Performance optimization with offscreen canvas

**State Management:**
- Local view state with setState()
- Shared state with StateManager
- Change detection and optimistic updates

**Complex Patterns:**
- Dynamic child views with add/remove
- View recycling for performance
- Virtual scrolling for large lists
- Lazy loading content

**Performance:**
- Render throttling
- Selective re-rendering
- Memory leak prevention
- Performance profiling

**Related Documentation:**
- [View.md](./View.md) - Core view concepts
- [ViewChildViews.md](./ViewChildViews.md) - Child view patterns
- [Templates.md](./Templates.md) - Template system
- [Events.md](./Events.md) - Event handling
