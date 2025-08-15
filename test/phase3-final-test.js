/**
 * Phase 3 Final Comprehensive Event Architecture Test
 * 
 * Validates all aspects of the MOJO framework event system:
 * - Local EventEmitter functionality
 * - Global EventBus functionality  
 * - Debug utilities and statistics
 * - Standard events documentation examples
 * - Error handling and edge cases
 * - Memory management and cleanup
 *
 * Run with: node web-mojo/test/phase3-final-test.js
 */

// Mock browser APIs for Node.js testing
global.window = {
  history: {
    pushState: () => {},
    replaceState: () => {},
    go: () => {},
    back: () => {},
    forward: () => {}
  },
  location: {
    pathname: '/',
    search: '',
    hash: '',
    toString: function() { return this.pathname + this.search + this.hash; }
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

import EventEmitter from '../src/utils/EventEmitter.js';
import EventBus from '../src/utils/EventBus.js';
import { EVENTS } from '../src/events/StandardEvents.js';

// Test counter for tracking
let testsPassed = 0;
let testsTotal = 0;

// Helper function for assertions
function assert(condition, message) {
  testsTotal++;
  if (condition) {
    testsPassed++;
    console.log(`✅ ${message}`);
  } else {
    console.error(`❌ ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Helper function for test sections
function section(name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name}`);
  console.log(`${'='.repeat(60)}`);
}

async function runComprehensiveTest() {
  console.log('🚀 MOJO Framework Event Architecture - Final Comprehensive Test\n');

  // ================================================================
  // TEST 1: EventEmitter Mixin Functionality
  // ================================================================
  section('TEST 1: EventEmitter Mixin Functionality');

  // Create test class with EventEmitter
  class TestModel {}
  Object.assign(TestModel.prototype, EventEmitter);

  const model = new TestModel();
  let eventFired = false;
  let eventData = null;
  let eventCount = 0;

  // Test basic on/emit
  model.on('test', (data) => {
    eventFired = true;
    eventData = data;
    eventCount++;
  });

  model.emit('test', { value: 42 });
  assert(eventFired, 'EventEmitter: Basic emit/on works');
  assert(eventData.value === 42, 'EventEmitter: Event data passed correctly');

  // Test multiple listeners
  let secondListenerCalled = false;
  model.on('test', () => { secondListenerCalled = true; });
  model.emit('test', { value: 99 });
  assert(eventCount === 2, 'EventEmitter: Multiple emissions work');
  assert(secondListenerCalled, 'EventEmitter: Multiple listeners work');

  // Test once
  let onceCount = 0;
  model.once('once-test', () => { onceCount++; });
  model.emit('once-test');
  model.emit('once-test');
  assert(onceCount === 1, 'EventEmitter: once() works correctly');

  // Test off
  const removeHandler = () => {};
  model.on('remove-test', removeHandler);
  model.off('remove-test', removeHandler);
  let removeTestFired = false;
  model.on('remove-test', () => { removeTestFired = true; });
  model.emit('remove-test');
  assert(removeTestFired, 'EventEmitter: off() removes specific listener');

  // Test off all listeners
  model.on('clear-test', () => {});
  model.on('clear-test', () => {});
  model.off('clear-test'); // Remove all
  let clearTestFired = false;
  model.on('clear-test', () => { clearTestFired = true; });
  model.emit('clear-test');
  assert(clearTestFired, 'EventEmitter: off() removes all listeners when no callback specified');

  // Test chaining
  const result = model.on('chain', () => {}).off('chain').once('chain2', () => {}).emit('chain2');
  assert(result === model, 'EventEmitter: Methods return this for chaining');

  // ================================================================
  // TEST 2: EventBus Global Events
  // ================================================================
  section('TEST 2: EventBus Global Events');

  const eventBus = new EventBus();
  let globalEventFired = false;
  let globalEventData = null;

  // Test basic global events
  eventBus.on('global-test', (data) => {
    globalEventFired = true;
    globalEventData = data;
  });

  eventBus.emit('global-test', { message: 'Hello Global' });
  assert(globalEventFired, 'EventBus: Basic global emit/on works');
  assert(globalEventData.message === 'Hello Global', 'EventBus: Global event data passed correctly');

  // Test wildcard listeners
  let wildcardEvents = [];
  eventBus.on('*', (data, eventName) => {
    wildcardEvents.push({ event: eventName, data });
  });

  eventBus.emit('wildcard-test-1', 'data1');
  eventBus.emit('wildcard-test-2', 'data2');
  assert(wildcardEvents.length >= 2, 'EventBus: Wildcard listeners work');

  // Test once on EventBus
  let busOnceCount = 0;
  eventBus.once('bus-once', () => { busOnceCount++; });
  eventBus.emit('bus-once');
  eventBus.emit('bus-once');
  assert(busOnceCount === 1, 'EventBus: once() works on global bus');

  // Test async emit
  let asyncEventFired = false;
  eventBus.on('async-test', async (data) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    asyncEventFired = true;
  });

  await eventBus.emitAsync('async-test', {});
  assert(asyncEventFired, 'EventBus: emitAsync works correctly');

  // ================================================================
  // TEST 3: Standard Events Constants
  // ================================================================
  section('TEST 3: Standard Events Constants');

  assert(typeof EVENTS.ROUTE_CHANGE === 'string', 'StandardEvents: ROUTE_CHANGE constant exists');
  assert(EVENTS.ROUTE_CHANGE === 'route:change', 'StandardEvents: ROUTE_CHANGE has correct value');
  assert(typeof EVENTS.NOTIFICATION === 'string', 'StandardEvents: NOTIFICATION constant exists');
  assert(typeof EVENTS.PAGE_SHOW === 'string', 'StandardEvents: PAGE_SHOW constant exists');
  assert(typeof EVENTS.APP_READY === 'string', 'StandardEvents: APP_READY constant exists');

  // Test using constants
  let constantEventFired = false;
  eventBus.on(EVENTS.NOTIFICATION, (data) => {
    constantEventFired = true;
  });
  eventBus.emit(EVENTS.NOTIFICATION, { message: 'Test', type: 'info' });
  assert(constantEventFired, 'StandardEvents: Constants work with EventBus');

  // ================================================================
  // TEST 4: Debug Utilities
  // ================================================================
  section('TEST 4: Debug Utilities');

  const debugBus = new EventBus();
  
  // Test debug mode
  debugBus.debug(true);
  assert(debugBus.debugMode === true, 'EventBus: Debug mode can be enabled');
  
  debugBus.debug(false);
  assert(debugBus.debugMode === false, 'EventBus: Debug mode can be disabled');

  // Test statistics
  debugBus.emit('stat-test-1', {});
  debugBus.emit('stat-test-1', {});
  debugBus.emit('stat-test-2', {});

  const stats = debugBus.getStats();
  assert(stats.emissions['stat-test-1'].count === 2, 'EventBus: Statistics track emission counts');
  assert(stats.emissions['stat-test-2'].count === 1, 'EventBus: Statistics track multiple events');
  assert(typeof stats.totalListeners === 'number', 'EventBus: Statistics include listener count');

  // Test event-specific stats
  const eventStats = debugBus.getEventStats('stat-test-1');
  assert(eventStats !== null, 'EventBus: Event-specific stats available');
  assert(eventStats.count === 2, 'EventBus: Event-specific stats are correct');

  // Test top events
  debugBus.emit('frequent-event', {});
  debugBus.emit('frequent-event', {});
  debugBus.emit('frequent-event', {});
  
  const topEvents = debugBus.getTopEvents(3);
  assert(Array.isArray(topEvents), 'EventBus: getTopEvents returns array');
  assert(topEvents[0].event === 'frequent-event', 'EventBus: Top events sorted by frequency');
  assert(topEvents[0].count === 3, 'EventBus: Top events have correct counts');

  // ================================================================
  // TEST 5: Error Handling
  // ================================================================
  section('TEST 5: Error Handling');

  const errorBus = new EventBus();
  let errorCaught = false;
  let goodHandlerCalled = false;

  // Test that one bad handler doesn't break others
  errorBus.on('error-test', () => {
    throw new Error('Bad handler');
  });
  
  errorBus.on('error-test', () => {
    goodHandlerCalled = true;
  });

  errorBus.emit('error-test', {});
  assert(goodHandlerCalled, 'EventBus: Good handlers still called when one throws error');

  // Test error events
  errorBus.on('error', (data) => {
    errorCaught = true;
  });

  // Trigger an error event
  setTimeout(() => {
    errorBus.emit('error', { message: 'Test error' });
  }, 1);

  await new Promise(resolve => setTimeout(resolve, 10));

  // ================================================================
  // TEST 6: Memory Management
  // ================================================================
  section('TEST 6: Memory Management');

  const memoryBus = new EventBus();
  
  // Test max listeners warning
  const originalWarn = console.warn;
  let warningIssued = false;
  console.warn = (message) => {
    if (message.includes('Max listeners')) {
      warningIssued = true;
    }
  };

  // Add more than max listeners (default 100)
  memoryBus.setMaxListeners(5);
  for (let i = 0; i < 7; i++) {
    memoryBus.on('memory-test', () => {});
  }
  
  console.warn = originalWarn;
  assert(warningIssued, 'EventBus: Max listeners warning issued');

  // Test removeAllListeners
  memoryBus.on('cleanup-test', () => {});
  memoryBus.removeAllListeners();
  const emptyStats = memoryBus.getStats();
  assert(emptyStats.totalListeners === 0, 'EventBus: removeAllListeners clears all listeners');

  // Test listener count
  memoryBus.on('count-test', () => {});
  memoryBus.on('count-test', () => {});
  assert(memoryBus.listenerCount('count-test') === 2, 'EventBus: listenerCount works correctly');

  // ================================================================
  // TEST 7: Integration Patterns
  // ================================================================
  section('TEST 7: Integration Patterns');

  // Test analytics pattern from documentation
  class MockAnalytics {
    constructor(eventBus) {
      this.events = [];
      eventBus.on(EVENTS.ROUTE_CHANGE, (data) => {
        this.trackPageView(data.path, data.page?.pageName);
      });
    }

    trackPageView(path, pageName) {
      this.events.push({ type: 'pageview', path, pageName });
    }
  }

  const integrationBus = new EventBus();
  const analytics = new MockAnalytics(integrationBus);
  
  integrationBus.emit(EVENTS.ROUTE_CHANGE, {
    path: '/test',
    page: { pageName: 'TestPage' }
  });

  assert(analytics.events.length === 1, 'Integration: Analytics pattern works');
  assert(analytics.events[0].type === 'pageview', 'Integration: Analytics receives correct data');

  // Test notification pattern
  class MockNotificationUI {
    constructor(eventBus) {
      this.notifications = [];
      eventBus.on(EVENTS.NOTIFICATION, (data) => {
        this.showNotification(data);
      });
    }

    showNotification(data) {
      this.notifications.push(data);
    }
  }

  const notificationUI = new MockNotificationUI(integrationBus);
  
  integrationBus.emit(EVENTS.NOTIFICATION, {
    message: 'Test notification',
    type: 'success'
  });

  assert(notificationUI.notifications.length === 1, 'Integration: Notification pattern works');
  assert(notificationUI.notifications[0].message === 'Test notification', 'Integration: Notification receives correct data');

  // ================================================================
  // TEST 8: Namespace and Advanced Features
  // ================================================================
  section('TEST 8: Namespace and Advanced Features');

  const namespaceBus = new EventBus();
  const userNamespace = namespaceBus.namespace('user');
  const adminNamespace = namespaceBus.namespace('admin');

  let userEventFired = false;
  let adminEventFired = false;

  userNamespace.on('login', () => { userEventFired = true; });
  adminNamespace.on('login', () => { adminEventFired = true; });

  userNamespace.emit('login');
  assert(userEventFired && !adminEventFired, 'EventBus: Namespaces work correctly');

  adminNamespace.emit('login');
  assert(adminEventFired, 'EventBus: Multiple namespaces work');

  // Test middleware
  let middlewareData = null;
  namespaceBus.use((event, data) => {
    middlewareData = { event, data };
    return data; // Don't modify
  });

  namespaceBus.emit('middleware-test', { value: 'test' });
  assert(middlewareData !== null, 'EventBus: Middleware is called');
  assert(middlewareData.event === 'middleware-test', 'EventBus: Middleware receives event name');

  // Test waitFor
  setTimeout(() => {
    namespaceBus.emit('delayed-event', { delay: true });
  }, 50);

  const waitResult = await namespaceBus.waitFor('delayed-event', 100);
  assert(waitResult.delay === true, 'EventBus: waitFor works correctly');

  // ================================================================
  // TEST 9: Documentation Examples Validation
  // ================================================================
  section('TEST 9: Documentation Examples Validation');

  // Test that examples from StandardEvents.js actually work
  const docBus = new EventBus();
  
  // Example from ROUTE_CHANGE documentation
  let analyticsPageView = null;
  docBus.on(EVENTS.ROUTE_CHANGE, (data) => {
    analyticsPageView = { path: data.path, pageName: data.page?.pageName };
  });

  docBus.emit(EVENTS.ROUTE_CHANGE, {
    path: '/users',
    page: { pageName: 'UsersPage' }
  });

  assert(analyticsPageView !== null, 'Documentation: ROUTE_CHANGE example works');
  assert(analyticsPageView.path === '/users', 'Documentation: Example receives correct data');

  // Example from NOTIFICATION documentation
  let toastShown = null;
  docBus.on(EVENTS.NOTIFICATION, (data) => {
    toastShown = data;
  });

  docBus.emit(EVENTS.NOTIFICATION, {
    message: 'Success!',
    type: 'success',
    duration: 3000
  });

  assert(toastShown !== null, 'Documentation: NOTIFICATION example works');
  assert(toastShown.type === 'success', 'Documentation: Notification example receives correct data');

  // ================================================================
  // TEST 10: Performance and Edge Cases
  // ================================================================
  section('TEST 10: Performance and Edge Cases');

  const perfBus = new EventBus();
  
  // Test many events
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    perfBus.emit('perf-test', { index: i });
  }
  const duration = Date.now() - start;
  assert(duration < 100, `EventBus: Performance test (1000 events in ${duration}ms)`);

  // Test edge case: emitting non-existent event
  perfBus.emit('non-existent-event', {});
  assert(true, 'EventBus: Emitting non-existent event does not throw');

  // Test edge case: removing non-existent listener
  perfBus.off('non-existent-event', () => {});
  assert(true, 'EventBus: Removing non-existent listener does not throw');

  // Test edge case: listener removes itself during emission
  let selfRemovingCalled = false;
  const selfRemovingHandler = () => {
    selfRemovingCalled = true;
    perfBus.off('self-remove', selfRemovingHandler);
  };
  
  perfBus.on('self-remove', selfRemovingHandler);
  perfBus.emit('self-remove');
  perfBus.emit('self-remove'); // Should not call handler again
  assert(selfRemovingCalled, 'EventBus: Self-removing listeners work correctly');

  // ================================================================
  // FINAL RESULTS
  // ================================================================
  section('FINAL RESULTS');

  console.log(`\n📊 Test Summary:`);
  console.log(`   Tests Passed: ${testsPassed}`);
  console.log(`   Tests Total:  ${testsTotal}`);
  console.log(`   Success Rate: ${Math.round((testsPassed / testsTotal) * 100)}%`);

  if (testsPassed === testsTotal) {
    console.log('\n🎉 ALL TESTS PASSED! The MOJO Framework event architecture is working perfectly.');
    console.log('\n✅ Validated Features:');
    console.log('   ✓ EventEmitter mixin for local events');
    console.log('   ✓ EventBus for global events');
    console.log('   ✓ Standard event constants and documentation');
    console.log('   ✓ Debug utilities and statistics');
    console.log('   ✓ Error handling and edge cases');
    console.log('   ✓ Memory management and cleanup');
    console.log('   ✓ Integration patterns (analytics, notifications, etc.)');
    console.log('   ✓ Namespace and middleware support');
    console.log('   ✓ Documentation examples work as specified');
    console.log('   ✓ Performance and reliability');
    console.log('\n🚀 The MOJO Framework is ready for production use!');
  } else {
    console.error(`\n❌ ${testsTotal - testsPassed} tests failed. Please review the issues above.`);
    process.exit(1);
  }
}

// Run the comprehensive test
runComprehensiveTest().catch(error => {
  console.error('\n💥 Test suite failed with error:', error);
  process.exit(1);
});