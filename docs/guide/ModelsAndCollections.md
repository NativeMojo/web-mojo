# Models and Collections

This guide explains how to define, fetch, save, and manage your data using `Model` and `Collection`. It also covers events, validation, nested attributes, pagination, and best practices. The examples are concise and battle-tested to fit how `@core/Model.js` and `@core/Collection.js` operate in MOJO.

- Model = a single resource (CRUD, events, validation, dirty tracking)
- Collection = an ordered set of Models (fetch lists, paging, add/remove, parsing)

Related source:
- core Model: src/core/Model.js
- core Collection: src/core/Collection.js
- example model & collection: src/core/models/Group.js

---

## Quick start

- Define a Model by extending `Model` and specifying an API `endpoint`.
- Define a Collection by extending `Collection`, setting `ModelClass` and an `endpoint`.
- Use `model.fetch()`, `model.save()`, `model.destroy()` for CRUD.
- Use `collection.fetch()` with `params` like `{ start, size }` for pagination.
- Listen to `change`, `add`, `remove`, `update`, `reset` events to keep the UI in sync.

```/dev/null/examples/QuickStart.js#L1-200
import Model from '@core/Model.js';
import Collection from '@core/Collection.js';

// 1) Define a model
class User extends Model {
  constructor(data = {}) {
    super(data, {
      endpoint: '/api/users',   // GET /api/users/:id, POST/PUT /api/users
      idAttribute: 'id'
    });
  }

  // Optional: validation
  validate() {
    const errs = {};
    if (!this.get('name') || !String(this.get('name')).trim()) {
      errs.name = 'Name is required';
    }
    return Object.keys(errs).length ? errs : null;
  }
}

// 2) Define a collection
class UserList extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: User,
      endpoint: '/api/users',
      size: 20,
      ...options
    });
  }
}

// 3) Use it
const users = new UserList();
await users.fetch(); // GET /api/users?start=0&size=20
console.log('Users:', users.toJSON());

const user = new User({ name: 'Alice', email: 'alice@example.com' });
await user.save(); // POST /api/users
console.log('Saved user id:', user.get('id'));
```

---

## Model

`Model` encapsulates a single resource with attributes, REST operations, validation, and events.

### Define a Model

Set your `endpoint` (required for REST), and optionally `idAttribute`, `timestamps`, etc.

```/dev/null/examples/models/User.js#L1-120
import Model from '@core/Model.js';

class User extends Model {
  constructor(data = {}) {
    super(data, {
      endpoint: '/api/users',
      idAttribute: 'id',  // default is 'id'
      timestamps: true    // included in options; whether server manages timestamps
    });
  }
}

export default User;
```

A real example from this repo (simplified):

```/Users/ians/Projects/mojo/web-mojo/src/core/models/Group.js#L1-40
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

class Group extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/group'
        });
    }
}
```

### Reading and writing attributes

- `get(key)` supports dot-notation (e.g. `metadata.owner.name`)
- `set(key, value)` or `set({ ... })` updates attributes and emits events
- Nested attributes are synced to both `attributes` and to convenience instance fields

```/dev/null/examples/models/Attributes.js#L1-160
const user = new User({ id: 123, name: 'Alice', metadata: { profile: { title: 'CTO' } } });

// read
console.log(user.get('name'));                        // 'Alice'
console.log(user.get('metadata.profile.title'));      // 'CTO'

// write single
user.set('name', 'Alicia');                           // emits 'change' and 'change:name'

// write nested
user.set('metadata.profile.title', 'Chief Tech');     // emits 'change' and 'change:metadata.profile.title'

// write multiple
user.set({ name: 'Ally', active: true });
```

### Events

`Model` uses an event emitter and emits:

- `change` when any attribute changes
- `change:<fieldName>` when a specific field changes

```/dev/null/examples/models/Events.js#L1-160
user.on('change', () => console.log('User changed'));
user.on('change:name', (val) => console.log('Name changed to', val));

user.set('name', 'New Name');
```

### REST operations

- `await model.fetch()` → GET `endpoint/:id`
- `await model.save([data])` → POST or PUT/PATCH based on presence of `id`
- `await model.destroy()` → DELETE `endpoint/:id`
- `model.cancel()` aborts in-flight requests, `model.isFetching()` indicates state

```/dev/null/examples/models/Rest.js#L1-220
const user = new User({ id: 5 });

await user.fetch();        // loads user 5 from /api/users/5
user.set('name', 'Updated');
await user.save();         // saves to server (PUT/PATCH /api/users/5)

const newUser = new User({ name: 'Newbie' });
await newUser.save();      // creates to /api/users (POST)

await user.destroy();      // deletes /api/users/5

// Abort a long-running fetch
const promise = user.fetch();
user.cancel();
await promise.catch(() => {}); // aborted
```

Notes:
- `buildUrl()` composes your request URL from `endpoint` and `id`.
- The internal REST client is provided by `@core/Rest.js`.

### Validation

Override `validate()` and/or `validateField(name, value)`:

```/dev/null/examples/models/Validation.js#L1-180
class Product extends Model {
  constructor(data = {}) {
    super(data, { endpoint: '/api/products' });
  }

  validate() {
    const errors = {};
    if (!this.get('name')) errors.name = 'Name is required';
    if (this.get('price') < 0) errors.price = 'Price must be >= 0';
    return Object.keys(errors).length ? errors : null;
  }

  validateField(name, value) {
    if (name === 'price' && value < 0) {
      return 'Price must be >= 0';
    }
    return null;
  }
}
```

- If `validate()` returns errors, `save()` may surface them (via `this.errors`) and decline the request depending on your REST implementation.
- Use `model.errors` to inspect errors after a failed validation or server error.

### Dirty tracking and change introspection

- `model.isDirty()` whether attributes differ from the original snapshot
- `model.getChangedAttributes()` returns a diff object
- `model.reset()` resets attributes back to the original snapshot

```/dev/null/examples/models/Dirty.js#L1-120
const m = new User({ id: 1, name: 'Alice' });
console.log(m.isDirty());                 // false
m.set('name', 'Alicia');
console.log(m.isDirty());                 // true
console.log(m.getChangedAttributes());    // { name: { from: 'Alice', to: 'Alicia' } }
m.reset();                                // revert
```

### Static utilities

The base `Model` exposes a couple of static helpers you can leverage:

```/dev/null/examples/models/StaticHelpers.js#L1-120
// Find or create patterns (availability depends on your Rest API conventions):

const found = await User.find({ email: 'a@example.com' }); // convenience search if supported by server
const created = User.create({ name: 'New', email: 'n@example.com' }); // returns instance (unsaved) or may persist based on base implementation
```

Exact semantics depend on how your REST layer is configured; treat them as conveniences rather than strict contracts.

---

## Collection

`Collection` manages an ordered set of `Model` instances with REST fetching, parsing, pagination, and change events.

### Define a Collection

Provide `ModelClass`, `endpoint`, and optional defaults like `size` and initial `params`.

```/Users/ians/Projects/mojo/web-mojo/src/core/models/Group.js#L42-72
class GroupList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Group,
            endpoint: '/api/group',
            size: 10,
            ...options
        });
    }
}
```

```/dev/null/examples/collections/UserList.js#L1-140
import Collection from '@core/Collection.js';
import User from './User.js';

class UserList extends Collection {
  constructor(options = {}) {
    super({
      ModelClass: User,
      endpoint: '/api/users',
      size: 20,
      params: { start: 0, size: 20 }, // default paging
      ...options
    });
  }
}

export default UserList;
```

### Fetching, params, and pagination

- `await collection.fetch(additionalParams?)`
- `await collection.setParams(params)` merges and triggers a fetch if needed
- `await collection.updateParams(patch)` merges incremental changes
- Default params include `start` and `size`

```/dev/null/examples/collections/FetchPaging.js#L1-200
const users = new UserList();

// Initial fetch
await users.fetch(); // GET /api/users?start=0&size=20

// Next page
await users.setParams({ start: 20 }); // GET /api/users?start=20&size=20

// Filter + reset paging
await users.setParams({ start: 0, role: 'admin' });

// On-the-fly params (one-off)
await users.fetch({ search: 'alice' });
```

The base collection:
- Cancels the previous request when a new, different request starts (prevents race conditions).
- Deduplicates in-flight requests with the same key.
- Supports minimal rate-limiting if enabled via options.

### Parsing server responses

Override `parse(response)` to map the server payload to models and metadata. By default it tries to extract data arrays and fill `this.meta`.

```/dev/null/examples/collections/Parse.js#L1-200
class Orders extends Collection {
  constructor(options = {}) {
    super({ ModelClass: Order, endpoint: '/api/orders', ...options });
  }

  parse(response) {
    // Example response: { data: [...], meta: { total: 123 } }
    const items = response?.data ?? response ?? [];
    this.meta = response?.meta || {};
    return items;
  }
}
```

### Managing models

- `add(modelsOrData)` accepts Model instances or plain objects
- `remove(modelsOrIds)` removes by reference or by id
- `reset(modelsOrData)` replaces the entire collection
- Events: `add`, `remove`, `update`, `reset`

```/dev/null/examples/collections/Manage.js#L1-220
const list = new UserList({ preloaded: true });

list.on('add', ({ models }) => console.log('Added', models.length));
list.on('remove', ({ models }) => console.log('Removed', models.length));
list.on('reset', () => console.log('Collection reset'));
list.on('update', () => console.log('Collection updated'));

list.add([{ name: 'A' }, { name: 'B' }]);   // emits 'add' and 'update'
list.remove(list.at(0));                     // emits 'remove' and 'update'
list.reset([{ name: 'Z' }]);                 // emits 'reset'
```

### Querying and iteration

- `where(predicate)` returns a filtered array
- `findWhere(predicate)` returns the first match
- `sort(comparator)` sorts in-place
- `forEach(callback)` iterates over models
- `toJSON()` returns plain array of attributes
- `length()`, `isEmpty()`, `get(id)`, `at(index)` helpers

```/dev/null/examples/collections/Query.js#L1-200
const admins = users.where(u => u.get('role') === 'admin');
const alice = users.findWhere(u => u.get('email') === 'alice@example.com');

users.sort((a, b) => String(a.get('name')).localeCompare(b.get('name')));

for (const user of users) {
  console.log(user.get('name'));
}
```

### Fetching a single item and downloads

- `await collection.fetchOne(id)` fetches one record (and typically adds/replaces it locally)
- `await collection.download(params)` delegates to REST for file downloads when supported

```/dev/null/examples/collections/FetchOne.js#L1-160
const orders = new Orders();
const res = await orders.fetchOne(123); // GET /api/orders/123
console.log(res.success, orders.get(123));
```

---

## Putting it together: Group model and collection

This repo includes a `Group` model and `GroupList` collection illustrating typical setup:

```/Users/ians/Projects/mojo/web-mojo/src/core/models/Group.js#L1-72
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

class Group extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/group'
        });
    }
}

class GroupList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: Group,
            endpoint: '/api/group',
            size: 10,
            ...options
        });
    }
}
```

You can plug `GroupList` into form fields that support remote collections:

```/dev/null/examples/forms/GroupCollectionField.js#L1-200
import { GroupList } from '@core/models/Group.js';

const formConfig = {
  fields: [
    {
      type: 'collection',
      name: 'parent',
      label: 'Parent Group',
      Collection: GroupList,
      labelField: 'name',
      valueField: 'id',
      maxItems: 10,
      placeholder: 'Search groups...',
      emptyFetch: false,
      debounceMs: 300
    }
  ]
};
```

---

## Best practices

- Endpoint consistency
  - Keep `Model.endpoint` and `Collection.endpoint` aligned (ideally the same base path).
  - Prefer plural endpoints for collections (e.g., `/api/users`) and singular for detail routes (`/api/users/:id`).

- Validation
  - Put synchronous rules in `validate()` and `validateField()`.
  - Surface server-side validation errors back into `model.errors`.

- Nested attributes
  - Use dot notation (`a.b.c`) in `get()` and `set()` for deep reads/writes.

- Pagination and params
  - Use `collection.setParams({ start, size, ...filters })` before `fetch()` to avoid race conditions.
  - The base class cancels previous requests when a new different one begins.

- Events and UI updates
  - Re-render views on `model.change` and `collection.update/reset`.
  - For fine-grained updates, use `change:<field>` listeners.

- Dirty tracking and forms
  - Use `model.isDirty()` and `getChangedAttributes()` to enable/disable Save buttons.
  - Call `model.reset()` to revert form changes to the last fetched/saved snapshot.

- Error handling and cancellation
  - Call `model.cancel()` / `collection.cancel()` to abort pending requests during rapid navigation.
  - Check `model.isFetching()` / `collection.isFetching()` to adjust UI loading states.

---

## API cheat sheet

Model
- constructor(data?, { endpoint, idAttribute='id', timestamps=true, ... }?)
- get(key) with dot support
- set(key, value, { silent }?) | set(object, { silent }?)
- getId(), getData(), toJSON()
- fetch(), save(data?), destroy()
- validate(), validateField(name, value)
- isDirty(), getChangedAttributes(), reset()
- cancel(), isFetching()
- buildUrl()
- Events: 'change', 'change:<field>'

Collection
- constructor({ ModelClass, endpoint, size=10, params, ... }?, data?)
- fetch(additionalParams?)
- setParams(params), updateParams(patch)
- fetchOne(id), download(params?)
- parse(response)
- add(modelsOrData), remove(modelsOrIds), reset(modelsOrData)
- get(id), at(index), length(), isEmpty()
- where(fn), findWhere(fn), sort(fn), forEach(fn), toJSON()
- cancel(), isFetching(), buildUrl()
- Events: 'add', 'remove', 'update', 'reset'

---

## Troubleshooting

- “My collection doesn’t fetch from REST”
  - Ensure `endpoint` is set (or provided by `ModelClass.endpoint`). REST is auto-enabled only when an endpoint exists.

- “I get stale or duplicated list responses”
  - Use `setParams()` before `fetch()` and avoid firing multiple overlapping requests with changing params.
  - The base class cancels the previous request when new params are used.

- “My form needs remote options”
  - Use `type: 'collection'` form fields and pass your `Collection` class with `labelField` and `valueField`.

- “I need to map non-standard API responses”
  - Override `parse(response)` in your Collection and normalize to an array plus optional `this.meta`.

---

Happy building!