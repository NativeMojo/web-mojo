/**
 * Router Test Suite
 * Tests both class and instance registration approaches
 */

import { Router, Page } from '../src/mojo.js';
import assert from 'assert';

// Mock browser globals for Node.js environment
global.window = {
  location: {
    search: '',
    hash: '',
    pathname: '/',
    href: 'http://localhost/'
  },
  history: {
    pushState: () => {},
    replaceState: () => {},
    back: () => {},
    forward: () => {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  MOJO: {
    eventBus: {
      emit: () => {},
      on: () => {},
      off: () => {}
    }
  }
};

global.document = {
  querySelector: () => ({
    innerHTML: '',
    appendChild: () => {},
    removeChild: () => {},
    classList: {
      add: () => {},
      remove: () => {}
    }
  }),
  getElementById: () => null,
  createElement: () => ({
    innerHTML: '',
    appendChild: () => {},
    classList: {
      add: () => {},
      remove: () => {}
    }
  }),
  title: '',
  body: {
    classList: {
      add: () => {},
      remove: () => {}
    }
  },
  head: {
    appendChild: () => {}
  }
};

// Test utilities
class TestTracker {
  constructor() {
    this.events = [];
  }

  log(event) {
    this.events.push(event);
    console.log(`  ✓ ${event}`);
  }

  clear() {
    this.events = [];
  }

  includes(event) {
    return this.events.includes(event);
  }
}

const tracker = new TestTracker();

// Test Page Classes
class TestPageClass extends Page {
  constructor(options = {}) {
    super({
      ...options,
      pageName: 'testclass',
      route: '/testclass'
    });
    tracker.log('TestPageClass constructor');
    this.instanceId = Math.random().toString(36).substr(2, 9);
  }

  async onEnter() {
    await super.onEnter();
    tracker.log(`TestPageClass.onEnter (instance: ${this.instanceId})`);
  }

  async onExit() {
    await super.onExit();
    tracker.log(`TestPageClass.onExit (instance: ${this.instanceId})`);
  }

  async getTemplate() {
    return '<div>Test Page Class</div>';
  }
}

class TestPageInstance extends Page {
  constructor(options = {}) {
    super({
      ...options,
      pageName: 'testinstance',
      route: '/testinstance'
    });
    tracker.log('TestPageInstance constructor');
    this.instanceId = Math.random().toString(36).substr(2, 9);
    this.visitCount = 0;
  }

  async onEnter() {
    await super.onEnter();
    this.visitCount++;
    tracker.log(`TestPageInstance.onEnter (instance: ${this.instanceId}, visit: ${this.visitCount})`);
  }

  async onExit() {
    await super.onExit();
    tracker.log(`TestPageInstance.onExit (instance: ${this.instanceId})`);
  }

  async getTemplate() {
    return `<div>Test Page Instance - Visit ${this.visitCount}</div>`;
  }
}

// Run tests
async function runTests() {
  console.log('\n🧪 Router Test Suite\n');
  console.log('━'.repeat(50));
  
  // Test 1: Class Registration
  console.log('\n📝 Test 1: Class Registration\n');
  tracker.clear();
  
  const router1 = new Router({
    container: '#test-container',
    mode: 'hash'
  });
  
  // Register as class
  router1.addRoute(TestPageClass);
  
  // Should NOT instantiate until navigation
  assert(!tracker.includes('TestPageClass constructor'), 'Class should not be instantiated on registration');
  console.log('  ✓ Class not instantiated on registration');
  
  // Navigate to the page
  await router1.executeRoute(
    router1.routes.get('/testclass'),
    {},
    {}
  );
  
  assert(tracker.includes('TestPageClass constructor'), 'Class should be instantiated on first navigation');
  assert(tracker.includes('TestPageClass.onEnter'), 'onEnter should be called');
  
  // Navigate away
  await router1.executeRoute(
    router1.routes.get('/testclass'),
    {},
    {}
  );
  
  console.log('\n✅ Test 1 Passed: Classes are instantiated on navigation\n');
  
  // Test 2: Instance Registration
  console.log('━'.repeat(50));
  console.log('\n📝 Test 2: Instance Registration\n');
  tracker.clear();
  
  const router2 = new Router({
    container: '#test-container',
    mode: 'hash'
  });
  
  // Create instance
  const pageInstance = new TestPageInstance();
  const originalInstanceId = pageInstance.instanceId;
  
  assert(tracker.includes('TestPageInstance constructor'), 'Instance should be created immediately');
  
  // Register instance
  router2.addRoute(pageInstance);
  
  // Navigate to the page
  await router2.executeRoute(
    router2.routes.get('/testinstance'),
    {},
    {}
  );
  
  assert(tracker.includes(`TestPageInstance.onEnter (instance: ${originalInstanceId}, visit: 1)`), 'onEnter should be called with same instance');
  
  // Navigate to the same page again
  await router2.executeRoute(
    router2.routes.get('/testinstance'),
    {},
    {}
  );
  
  assert(pageInstance.visitCount === 2, 'Visit count should be preserved in instance');
  console.log(`  ✓ Instance preserved state (visit count: ${pageInstance.visitCount})`);
  
  console.log('\n✅ Test 2 Passed: Instances maintain state across navigations\n');
  
  // Test 3: Mixed Registration
  console.log('━'.repeat(50));
  console.log('\n📝 Test 3: Mixed Registration\n');
  tracker.clear();
  
  const router3 = new Router({
    container: '#test-container',
    mode: 'hash'
  });
  
  // Register both class and instance
  router3.addRoute(TestPageClass);
  const mixedInstance = new TestPageInstance();
  router3.addRoute(mixedInstance);
  
  // Navigate between them
  await router3.executeRoute(
    router3.routes.get('/testclass'),
    {},
    {}
  );
  
  assert(tracker.includes('TestPageClass.onEnter'), 'Class page should enter');
  
  await router3.executeRoute(
    router3.routes.get('/testinstance'),
    {},
    {}
  );
  
  assert(tracker.includes('TestPageClass.onExit'), 'Previous page should exit');
  assert(tracker.includes('TestPageInstance.onEnter'), 'New page should enter');
  
  console.log('\n✅ Test 3 Passed: Mixed registration works correctly\n');
  
  // Test 4: addPages Helper
  console.log('━'.repeat(50));
  console.log('\n📝 Test 4: addPages Helper Method\n');
  tracker.clear();
  
  const router4 = new Router({
    container: '#test-container',
    mode: 'hash'
  });
  
  router4.addPages([
    TestPageClass,
    new TestPageInstance({ customOption: true })
  ]);
  
  assert(router4.routes.has('/testclass'), 'Class route should be registered');
  assert(router4.routes.has('/testinstance'), 'Instance route should be registered');
  console.log('  ✓ addPages registered both class and instance');
  
  console.log('\n✅ Test 4 Passed: addPages helper works with mixed types\n');
  
  // Summary
  console.log('━'.repeat(50));
  console.log('\n🎉 All Tests Passed!\n');
  console.log('Summary:');
  console.log('  • Classes are instantiated on first navigation');
  console.log('  • Instances maintain state across navigations');
  console.log('  • Mixed registration works seamlessly');
  console.log('  • addPages helper supports both types');
  console.log('  • Lifecycle methods (onEnter/onExit) work correctly\n');
}

// Run the tests
runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});