---
globs: ["src/core/Rest.js", "src/core/Model.js", "src/core/Collection.js", "src/core/models/**/*.js"]
---

# REST API & Data Layer Rules

## Models and Collections
- Models extend `Model`; collections extend `Collection`.
- Model constructors usually call `super(data, { endpoint, idAttribute })`.
- Access model data with `this.model.get('field')` and mutate with `set()`.
- Collection classes typically declare `ModelClass` and `endpoint`.
- If a new model file is added under `src/core/models/`, run the model export generator flow used by the repo.

## REST API Conventions
- The API uses standard CRUD endpoints for all access — admin and user alike. Permissions (User → Group → Member) handle authorization.
- Admins filter with query params (e.g., `/api/account/api_keys?user=123`). Never create or assume separate admin-scoped endpoints like `/api/user/{id}/resource`.
- Prefer existing `Model`, `Collection`, and `app.rest` patterns over ad hoc request code.
- Preserve response-shape handling already used in the target area.

## Response Handling
- `Rest` responses are often nested; payload is commonly at `resp.data.data`.
- Use `{ dataOnly: true }` where appropriate when you need the inner payload directly.
- `Collection` has no `toArray()`; use `collection.models` or `collection.toJSON()`.

## Security
- Do not hardcode secrets, tokens, or environment-specific credentials.
