# Map: option to disable scroll/zoom interaction

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-26 |
| Priority | medium |

## Description
Add constructor options to `MapView` (Leaflet) and `MapLibreView` (MapLibre GL) that disable user interaction with the map — scroll-wheel zoom, drag-pan, double-click zoom, keyboard, and touch gestures — for use cases where the map should be a static / read-only display.

The headline option is `interactive: false`, which freezes the map entirely. Granular per-handler flags are also exposed for the common "embedded in a scrolling page, kill wheel-zoom only" case.

Both options propagate through `MetricsCountryMapView` via its existing `mapOptions` pass-through.

## Context
Today, both map views always allow full interaction. `showZoomControl` / `showNavigationControl` only hide the +/− UI buttons — they do not disable scroll-wheel zoom, drag-panning, or double-click zoom.

This causes two real problems:
- Embedded maps inside a scrolling page (e.g. dashboard tiles, incident detail panels) hijack the page's scroll wheel as soon as the cursor enters the map.
- Static "thumbnail" map embeds have no way to prevent the user from accidentally panning/zooming away from the intended view.

Leaflet and MapLibre both expose native handler-disable APIs at construction time; we just need to surface them as constructor options on our wrappers.

## Acceptance Criteria
- `new MapView({ interactive: false })` produces a map where scroll-wheel zoom, drag-pan, double-click zoom, box-zoom, keyboard, and touch zoom are all disabled.
- `new MapLibreView({ interactive: false })` produces an equivalent fully-frozen MapLibre map.
- Granular flags also work independently and default to `true` (current behavior preserved):
  - `scrollZoom` — disables scroll-wheel zoom
  - `dragPan` — disables click-and-drag panning
  - `doubleClickZoom` — disables double-click zoom
  - `keyboard` — disables keyboard arrow/+/- navigation
  - `touchZoom` — disables pinch-to-zoom on touch devices
- Existing maps with no new options behave identically (no regression in default interaction).
- `showZoomControl` / `showNavigationControl` remain independent of these flags — UI controls can still be shown on a non-interactive map and hidden on an interactive one (existing behavior).
- `MetricsCountryMapView` forwards these options through `mapOptions` to its inner `MapLibreView`.
- Docs in `docs/web-mojo/extensions/MapView.md` and `MapLibreView.md` describe the new options with at least one example each.

## Investigation
- **What exists:**
  - [MapView.js:153-184](src/extensions/map/MapView.js:153) constructs the Leaflet map with only `center`, `zoom`, and `zoomControl`. All Leaflet handlers default to enabled.
  - [MapLibreView.js:174-186](src/extensions/map/MapLibreView.js:174) constructs the MapLibre map with `style`, `center`, `zoom`, `pitch`, `bearing`. Optionally adds `NavigationControl`. All interaction handlers default to enabled.
  - [MetricsCountryMapView.js:42-53](src/extensions/map/MetricsCountryMapView.js:42) wraps `MapLibreView` and reads several knobs from `this.mapOptions`.

- **What changes:**
  - `MapView` constructor: read new options into instance fields; pass through to Leaflet map constructor (or call `.disable()` on the corresponding handler post-construction).
    - Leaflet handler mapping: `scrollZoom` → `scrollWheelZoom`, `dragPan` → `dragging`, `doubleClickZoom` → `doubleClickZoom`, `keyboard` → `keyboard`, `touchZoom` → `touchZoom`. `interactive: false` disables all of these plus `boxZoom` and `tap`.
  - `MapLibreView` constructor: read new options; pass `interactive` and per-handler options to the `maplibregl.Map` constructor.
    - MapLibre handler mapping: `scrollZoom` → `scrollZoom`, `dragPan` → `dragPan`, `doubleClickZoom` → `doubleClickZoom`, `keyboard` → `keyboard`, `touchZoom` → `touchZoomRotate`. MapLibre's native `interactive: false` already covers the master switch.
  - `MetricsCountryMapView`: forward `interactive` and the granular flags from `this.mapOptions` to the `MapLibreView` constructor (additive — no behavior change when omitted).

- **Constraints:**
  - Constructor-time only. No runtime `setInteractive()` API in this request.
  - Granular flag names are normalized across the two backends (`scrollZoom`, `dragPan`, `touchZoom` on our wrapper API), with the wrapper translating to each library's native handler name. This keeps the public surface consistent regardless of which view is in use.
  - Defaults preserve today's fully-interactive behavior — every flag defaults to `true`.
  - Match existing option-parsing style (`options.foo !== false` for default-true, `options.foo === true` for default-false).

- **Related files:**
  - [src/extensions/map/MapView.js](src/extensions/map/MapView.js)
  - [src/extensions/map/MapLibreView.js](src/extensions/map/MapLibreView.js)
  - [src/extensions/map/MetricsCountryMapView.js](src/extensions/map/MetricsCountryMapView.js)
  - [docs/web-mojo/extensions/MapView.md](docs/web-mojo/extensions/MapView.md)
  - [docs/web-mojo/extensions/MapLibreView.md](docs/web-mojo/extensions/MapLibreView.md)
  - [docs/web-mojo/extensions/Map.md](docs/web-mojo/extensions/Map.md)

- **Endpoints:** None. Pure client-side option plumbing.

- **Tests required:**
  - Unit-style: construct a `MapView` with `interactive: false` and assert each Leaflet handler is disabled (`map.scrollWheelZoom.enabled() === false`, etc.). Same shape for `MapLibreView`.
  - Unit-style: construct with each granular flag set to `false` independently and assert only that handler is off.
  - Regression: construct with no new options and assert all handlers remain enabled.
  - DOM-dependent assertions may need to live in an integration-style test since both libraries require a real container. If real-DOM testing isn't practical here, document a manual verification recipe in the request and skip automated coverage.

- **Out of scope:**
  - Runtime toggling (`setInteractive()`, `enableScrollZoom()`, etc.).
  - Per-handler control over MapLibre-only features (`dragRotate`, `touchPitch`).
  - Changes to `showZoomControl` / `showNavigationControl` semantics.
  - A "click-to-activate" overlay pattern (where the map only becomes interactive after a tap/click).
  - Any changes to marker, popup, or tile-layer behavior.

## Plan

### Objective
Add constructor-time options to disable user interaction on `MapView` (Leaflet) and `MapLibreView` (MapLibre GL): a master `interactive` switch and granular per-handler flags (`scrollZoom`, `dragPan`, `doubleClickZoom`, `keyboard`, `touchZoom`). Defaults preserve today's fully-interactive behavior. `MetricsCountryMapView` forwards them via existing `mapOptions`. No runtime toggling. No changes to marker, popup, tile-layer, or zoom-control UI behavior.

### Steps

1. **[src/extensions/map/MapView.js](src/extensions/map/MapView.js)** — extend constructor option parsing and apply to Leaflet's `L.map()` constructor.
   - In the constructor (around line 33–46), after the existing `showZoomControl`/`tileLayer`/etc. block, parse:
     ```
     const interactive = options.interactive !== false;
     this.interactive = interactive;
     this.scrollZoom       = options.scrollZoom       !== undefined ? !!options.scrollZoom       : interactive;
     this.dragPan          = options.dragPan          !== undefined ? !!options.dragPan          : interactive;
     this.doubleClickZoom  = options.doubleClickZoom  !== undefined ? !!options.doubleClickZoom  : interactive;
     this.keyboard         = options.keyboard         !== undefined ? !!options.keyboard         : interactive;
     this.touchZoom        = options.touchZoom        !== undefined ? !!options.touchZoom        : interactive;
     ```
   - In `initializeMap()` (line 169), extend the `L.map()` options object to translate cross-cutting names → Leaflet handler names:
     ```
     {
       center: mapCenter,
       zoom: this.zoom,
       zoomControl: this.showZoomControl,
       scrollWheelZoom: this.scrollZoom,
       dragging: this.dragPan,
       doubleClickZoom: this.doubleClickZoom,
       keyboard: this.keyboard,
       touchZoom: this.touchZoom,
       boxZoom: interactive,   // tied to master switch only — not separately surfaced
       tap: interactive
     }
     ```
   - Why this approach: Leaflet accepts every handler as a constructor option. No post-construction `.disable()` calls needed. Aligns with existing `zoomControl: this.showZoomControl` pattern already in place at line 173.

2. **[src/extensions/map/MapLibreView.js](src/extensions/map/MapLibreView.js)** — extend constructor option parsing and apply to `maplibregl.Map` constructor.
   - In the constructor (around line 34–47), after the existing options block, parse the same five granular flags plus `interactive` using the same cascade pattern as step 1.
   - In `initializeMap()` (line 174), extend the `new maplibregl.Map({...})` options:
     ```
     {
       container: mapElement,
       style: this.getMapStyle(),
       center: mapCenter,
       zoom: this.zoom,
       pitch: this.pitch,
       bearing: this.bearing,
       interactive: this.interactive,
       scrollZoom: this.scrollZoom,
       dragPan: this.dragPan,
       doubleClickZoom: this.doubleClickZoom,
       keyboard: this.keyboard,
       touchZoomRotate: this.touchZoom
     }
     ```
   - Note: MapLibre's `interactive: false` already disables all handlers internally, but we also pass the granular flags so a user can opt one handler back on (e.g. `interactive: false, dragPan: true`) — MapLibre's master switch makes that combo a no-op, which is fine; the granular flags only matter when `interactive` is left `true` (default) and individual handlers are turned off.

3. **[src/extensions/map/MetricsCountryMapView.js](src/extensions/map/MetricsCountryMapView.js)** — forward new options from `mapOptions` to the inner `MapLibreView`.
   - In `onInit()` (line 42–52), append to the `MapLibreView` options:
     ```
     interactive:      this.mapOptions.interactive,
     scrollZoom:       this.mapOptions.scrollZoom,
     dragPan:          this.mapOptions.dragPan,
     doubleClickZoom:  this.mapOptions.doubleClickZoom,
     keyboard:         this.mapOptions.keyboard,
     touchZoom:        this.mapOptions.touchZoom
     ```
   - When omitted, these are `undefined` and `MapLibreView`'s parser cascades them from its own `interactive` default — preserves current behavior.

4. **[docs/web-mojo/extensions/MapView.md](docs/web-mojo/extensions/MapView.md)** — add the new options to the Constructor Options block (around line 117–139) and add a short "Disabling Interaction" subsection with two examples: fully static (`interactive: false`) and "kill scroll-wheel zoom only" (`scrollZoom: false`). Note that `showZoomControl` is independent — UI buttons can still be hidden/shown regardless.

5. **[docs/web-mojo/extensions/MapLibreView.md](docs/web-mojo/extensions/MapLibreView.md)** — same shape as step 4, in the Constructor Options block (around line 122–151).

6. **[docs/web-mojo/extensions/Map.md](docs/web-mojo/extensions/Map.md)** — if this overview doc lists the per-view option matrix, add the new options there as well; otherwise no change. (Verify on edit.)

7. **[CHANGELOG.md](CHANGELOG.md)** — release-facing addition: "MapView/MapLibreView: add `interactive`, `scrollZoom`, `dragPan`, `doubleClickZoom`, `keyboard`, `touchZoom` options to disable interaction at construction time."

### Design Decisions

- **Cross-cutting names, not native names.** Public API uses `scrollZoom` / `dragPan` / `touchZoom` regardless of backend. The wrapper translates to `scrollWheelZoom` / `dragging` / `touchZoom` for Leaflet and `scrollZoom` / `dragPan` / `touchZoomRotate` for MapLibre. This means callers can swap `MapView` for `MapLibreView` (or vice versa) without rewriting interaction options.
- **Master + granular cascade.** `interactive` sets the default for every handler; granular flags override individually. Matches MapLibre's own model and is intuitive: `interactive: false` is the headline "static map" switch, and granular flags handle the "embedded in a scrolling page" case (`scrollZoom: false`).
- **Default-true preservation.** Every flag defaults to `true` and mirrors today's behavior bit-for-bit when no new option is passed. Existing call sites (e.g. [MetricsCountryMapView.js:42](src/extensions/map/MetricsCountryMapView.js:42)) stay unchanged in behavior.
- **Constructor-time only.** No `setInteractive()` / `enableScrollZoom()` runtime API. If needed later, both libraries already expose `.scrollZoom.disable()` / `.scrollWheelZoom.disable()` post-construction, but that is explicitly out of scope.
- **`boxZoom` and `tap` (Leaflet) and `dragRotate` / `touchPitch` (MapLibre) are not surfaced individually.** They follow the master `interactive` flag only. Surfacing them would inflate the API for niche cases; can be added later if a real need appears.
- **`showZoomControl` / `showNavigationControl` stay independent.** A non-interactive map can still display (greyed-out) zoom buttons; an interactive map can hide them. This matches how the existing options are wired and is the least-surprising behavior.

### Edge Cases

- **Conflicting options (`interactive: false` + `dragPan: true`).** Documented behavior: granular flag wins for the wrapper's bookkeeping, but on MapLibre the native `interactive: false` is a hard master that disables everything regardless. We accept this minor inconsistency — `interactive: false` always means "no interaction" in practice, and explicitly re-enabling a sub-handler under `interactive: false` is a developer error we don't need to support.
- **`MetricsCountryMapView.mapOptions` not specifying any of the new keys.** Each lookup yields `undefined`, which `MapLibreView`'s parser treats as "fall through to the cascade from `interactive`," which itself defaults to `true`. Net behavior: identical to today.
- **Leaflet not yet loaded when `initializeMap()` runs.** Existing guard at [MapView.js:155](src/extensions/map/MapView.js:155) (`if (!mapElement || !window.L) return;`) is unchanged. New options are only applied if the map is constructed.
- **Touch-only devices with `touchZoom: false` but `interactive: true`.** Pinch-zoom is disabled but drag-pan still works — matches the granular intent.
- **`MapLibreView` `setView()` / `flyTo()` programmatic calls.** Programmatic camera changes are not gated by `interactive` in either library — this remains true. The new flags only affect *user* interaction, not API-driven camera moves. Worth a one-line note in the docs.

### Testing

- **Primary:** `npm run test:unit`. No existing tests cover the map views (verified — no `MapView.test.js` / `MapLibreView.test.js`), and adding meaningful coverage requires loading Leaflet/MapLibre from CDN, which the unit harness doesn't support. Pragmatic plan: add a thin **option-parsing** test that constructs the views (without rendering) and asserts the cascaded properties (`view.scrollZoom`, `view.dragPan`, etc.) resolve correctly from `interactive` plus per-handler overrides. This exercises the cascade logic without needing a real map.
- **Skipped (integration-level):** asserting the actual Leaflet/MapLibre map has handlers disabled — would need a JSDOM-with-canvas setup the harness doesn't have. Document a manual verification recipe: open a demo page, set `interactive: false`, confirm scroll-wheel/drag/double-click are inert.
- **Lint:** `npm run lint` over the three changed source files.
- **Regression check:** the existing `MetricsCountryMapView` continues to pan/zoom on the dashboard — manual smoke check, since this is the only consumer in-repo.

### Docs Impact

- **Update:** [docs/web-mojo/extensions/MapView.md](docs/web-mojo/extensions/MapView.md), [docs/web-mojo/extensions/MapLibreView.md](docs/web-mojo/extensions/MapLibreView.md) — Constructor Options blocks plus a short "Disabling Interaction" subsection with two examples each.
- **Update:** [docs/web-mojo/extensions/Map.md](docs/web-mojo/extensions/Map.md) — only if it includes a per-view option matrix; verify on edit.
- **Update:** [CHANGELOG.md](CHANGELOG.md) — one-line entry under the next unreleased version.
- **No changes** to [docs/web-mojo/AGENT.md](docs/web-mojo/AGENT.md), [docs/web-mojo/README.md](docs/web-mojo/README.md), or any non-map extension docs.

## Resolution

Commits: **25616a2** (feature) + **d6ee686** (docs follow-up).

### What was implemented

- `MapView` (Leaflet) and `MapLibreView` (MapLibre GL) accept six new
  constructor options: `interactive` (master) and granular
  `scrollZoom`, `dragPan`, `doubleClickZoom`, `keyboard`, `touchZoom`.
  All default to `true`, so existing call sites are unchanged.
- Cross-cutting names are translated per backend: `scrollZoom` →
  Leaflet `scrollWheelZoom`, `dragPan` → Leaflet `dragging`, `touchZoom`
  → MapLibre `touchZoomRotate`. `boxZoom` and `tap` (Leaflet) follow
  the master switch only.
- `MetricsCountryMapView` forwards the six options through `mapOptions`
  to the inner `MapLibreView`.
- The portal example pages `extensions/map-view` and
  `extensions/map-libre-view` got a second card showing two side-by-side
  small maps: one with `interactive: false` (frozen thumbnail) and one
  with `scrollZoom: false` (page owns the wheel).
- Docs updated: `MapView.md`, `MapLibreView.md`, `Map.md` (per-view
  option tables + a `mapOptions` clarification on `MetricsCountryMapView`),
  plus a `CHANGELOG.md` Unreleased entry.

### Files changed

**Source (3):**
- `src/extensions/map/MapView.js` — option parsing + Leaflet constructor wiring
- `src/extensions/map/MapLibreView.js` — option parsing + MapLibre constructor wiring
- `src/extensions/map/MetricsCountryMapView.js` — forward through `mapOptions`

**Examples (2):**
- `examples/portal/examples/extensions/MapView/MapViewExample.js`
- `examples/portal/examples/extensions/MapLibreView/MapLibreViewExample.js`

**Docs (3):**
- `docs/web-mojo/extensions/MapView.md`
- `docs/web-mojo/extensions/MapLibreView.md`
- `docs/web-mojo/extensions/Map.md`

**Release (1):**
- `CHANGELOG.md`

### Tests run and results

- **`npm run lint`** — zero new warnings/errors in any of the 3 source files
  or 2 example files. Existing repo-wide lint output unchanged.
- **`npm run test:unit`** — 530/531 passing, identical to pre-change baseline.
  The 1 pre-existing failure (`includes granularity, account, slugs, date range`)
  is unrelated.
- **Browser preview verification** — exercised both example pages against
  real Leaflet + MapLibre instances. All 12 handler combinations behave
  correctly:
  - **Default** (all flags omitted): every handler enabled — no regression.
  - **`interactive: false`**: every Leaflet/MapLibre interaction handler
    reports `enabled() === false` / `isEnabled() === false`.
  - **`scrollZoom: false`** alone: only `scrollWheelZoom` (Leaflet) /
    `scrollZoom` (MapLibre) disabled; pan, double-click, keyboard,
    touch-zoom all still enabled.
- **No synthetic unit test added.** The `simple-module-loader` doesn't
  cover map extensions and would require mocking Leaflet/MapLibre. The
  browser verification against real library instances is stronger than
  the test would have been.

### Agent findings

- **test-runner:** No new failures introduced. Three pre-existing
  failures (1 unit, 3 integration infrastructure issues — missing
  `@core/` alias resolution / missing `dist` artifacts) — all unrelated.
- **security-review:** Clean. All six options are coerced via `!!` so
  no prototype-pollution path; no auth, network, storage, or
  user-input surface is touched. Popup HTML in the example pages is
  hardcoded literals, not user input.
- **docs-updater:** Found one gap — the `mapOptions` row in
  `Map.md`'s `MetricsCountryMapView` options table didn't tell readers
  the new flags are reachable through it. Fixed in d6ee686. All other
  doc surfaces (`AGENT.md`, `README.md`, `examples.md`, `Location.md`)
  either already covered the change or reference maps at too high a
  level to need option-level updates.
