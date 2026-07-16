# Planning Workspace

One kind of work item. Bugs, features, and chores differ only by a `type` field —
not by folder, template, or counter. The **folder is the stage**; moving the file
is the only way the stage changes.

## Pipeline

```
inbox/  →  confirmed/  →  done/
```

- **`inbox/`** — new, unscoped items (no id yet). Drop a file here from
  `_template.md`, or let `/scope` create it from a description.
- **`confirmed/`** — scoped, active items (have a `WM-###` id and an agreed
  plan in `## Notes`).
- **`done/`** — closed items (resolved history — never reformat or renumber).

Plus two parking folders, not part of the active pipeline:

- **`future/`** — parked ideas (no id, no skill drives them).
- **`rejected/`** — declined items, kept for the rationale.

Reference material (not work items): `mockups/` (HTML/UI sketches) and `notes/`
(audits, longer-form planning notes).

## How items move (use the scripts — don't hand-move files)

| Action | Command |
|---|---|
| See the whole pipeline | `scripts/board.sh [inbox\|confirmed\|done]` |
| Scope an inbox item (assign id + move to `confirmed/`) | `/scope`, which runs `scripts/intake.sh planning/inbox/<file>.md` |
| Check an item's `depends_on` are satisfied | `scripts/ready.sh planning/confirmed/<file>.md` |
| Close a confirmed item (stamp Resolution + move to `done/`) | `/build`, which runs `scripts/close.sh planning/confirmed/<file>.md` |

`scripts/close.sh` moves to `done/`. To park an item instead, `git mv` it to
`future/` or `rejected/` by hand.

## IDs

Every scoped item gets `WM-###` (prefix from `planning/.config`, fallback
`ITEM` when the file is absent), allocated once from `planning/.next_id`
(a single bare integer) by `scripts/intake.sh` — never hand-assigned, never
reused. `.next_id` reconciles against the tree, so it self-corrects.

## Item format

Start from `_template.md`. YAML frontmatter:

```yaml
id: WM-014        # blank in inbox; /scope assigns it
type: bug         # feature | bug | chore
title: ...
priority: P2      # P0 | P1 | P2 | P3
effort: M         # XS | S | M | L | XL
owner: ...
opened: 2026-06-05
depends_on: []    # hard blockers: [WM-003, nativemojo/django-mojo#DM-007]
related: []       # soft links
links: []         # external URLs
```

Then `## What & Why`, `## Acceptance Criteria`, `## Repro — bugs only`,
`## Notes` (filled during `/scope`), and `## Resolution` (filled at close).

## Reference notation
- Same-repo item → `WM-001`
- Item in another repo → `nativemojo/django-mojo#DM-007` (that repo's own prefix)
- External thing (PR, design doc, tracker issue) → a full URL, in `links`
