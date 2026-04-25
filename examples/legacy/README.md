# Legacy Examples — Frozen

Everything in this directory is **frozen** as of the examples rewrite (2026-04-25). It is kept for historical reference and to preserve git blame, not for active development.

## Where the new examples live

- **Portal:** [`examples/portal/`](../portal/) — single canonical PortalWebApp showcase, one folder per documented component, manifest-driven.
- **Auth:** [`examples/auth/`](../auth/) — minimal login flow.

The new portal mirrors the `docs/web-mojo/` taxonomy. To find the canonical example for any component, walk to:

```
examples/portal/examples/<area>/<Component>/<Component>Example.js
```

## What's here

| Path | What it was |
|---|---|
| `portal/` | The previous portal example app (~13k LOC across 37 pages + 17 templates). Mixed mock systems with demos. |
| `auth/` | Older standalone auth demo (login/passkey/privacy/tos pages). |
| `*.html` | One-off HTML demos (image-editor, image-upload, lightbox, lightbox-gallery, simple-charts, activegroup-demo, user-view-example, index). Most predate the previous portal. |
| `circular-progress/`, `docit/`, `file-components/`, `file-drop/`, `lite/`, `loader/`, `location/`, `mojo-auth/`, `table-batch-location/` | Standalone demos for specific components or build outputs. |

## Why we moved them

The legacy portal pages averaged 500–1000 LOC and conflated multiple concerns per file (mock permission systems, debug UI, multiple component demos, external `.mst` template paths). They were not suitable as canonical "copy this to use Component X" references — neither for humans nor for the LLMs that consume the docs via the `find-example` skill.

The new portal at `examples/portal/` collapses each component to a single-file canonical-and-demo Page with an inline template, ≤150 LOC per file, organized to mirror the docs taxonomy. See the audit report at [`planning/notes/examples-rewrite-audit.md`](../../planning/notes/examples-rewrite-audit.md) for the legacy-to-new mapping.

## Caveats

- These files may break as the framework evolves. Imports, module paths, and APIs are not guaranteed to keep working.
- Do not file bugs against legacy code. If you need a working pattern, look in the new portal.
- Do not port code _from_ legacy without verifying APIs against the current source. The audit surfaced cases where legacy code called methods that no longer exist (`FormView.setData`, `Collection.setFilters`, `Collection.query`).
