/**
 * Simple event system test for MOJO framework (Node.js, no browser needed)
 *
 * Run with:  node web-mojo/test/event-test.js
 */

import EventEmitter from '../src/utils/EventEmitter.js';
import EventBus from '../src/utils/EventBus.js';

// ---- Local EventEmitter test (simulate a model) ----
class DummyModel {}
Object.assign(DummyModel.prototype, EventEmitter);

const model = new DummyModel();

let modelFooFired = false;
model.on('foo', (data) => {
  modelFooFired = true;
  console.log('Model foo event:', data);
});
model.emit('foo', { bar: 1 });

let onceCount = 0;
model.once('bar', () => { onceCount++; });
model.emit('bar');
model.emit('bar');

if (!modelFooFired) throw new Error("Model foo event did not fire!");
if (onceCount !== 1) throw new Error("Model once event did not fire exactly once!");

// ---- Local for Collection ----
class DummyCollection {}
Object.assign(DummyCollection.prototype, EventEmitter);

const coll = new DummyCollection();
let addCalled = 0;
coll.on('add', (val) => { addCalled += val; });
coll.emit('add', 42);

if (addCalled !== 42) throw new Error("Collection add event did not update value!");

// ---- Global EventBus test (simulate app.events) ----
const events = new EventBus();

let notificationReceived = false;
events.on('notification', ({ message, type }) => {
  notificationReceived = true;
  console.log(`NOTIFICATION: [${type}] ${message}`);
});
events.emit('notification', { message: "Everything is working!", type: "success" });
if (!notificationReceived) throw new Error("Global notification event failed!");

// Test once on EventBus
let busOnce = 0;
events.once('magic', (data) => { busOnce += data; });
events.emit('magic', 40);
events.emit('magic', 2);
if (busOnce !== 40) throw new Error("EventBus once handler did not fire correctly!");

console.log('All event tests passed. 🔥');

// To verify, you should see:
// Model foo event: { bar: 1 }
// NOTIFICATION: [success] Everything is working!
// All event tests passed. 🔥