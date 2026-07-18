# Planning Workspace

One kind of work item. Bugs, features, and chores differ only by a `type` field —
not by folder, template, or counter. The **folder is the stage**; moving the file
is the only way the stage changes — and only the scripts move it.
Full architecture: `WORKFLOW.md` (repo root); command reference: `AI_DEV.md`.

## Pipeline

```
inbox/  →  confirmed/  →  in_progress/  →  done/
(raw)      (scoped)       (building)        (closed)
```

- **`inbox/`** — new, unscoped items (no id yet). Drop a file here from
  `_template.md`, or let `/request` / `/scope` create it from a description.
- **`confirmed/`** — scoped items (have a `WM-###` id). Planned once `/scope`
  writes the self-contained `## Plan` and deletes the `PLAN PENDING` marker;
  until then the board shows `UNPLANNED` and `/build` refuses the item.
- **`in_progress/`** — actively being built (claimed by `/build` via
  `scripts/start.sh`; WIP = 1, resume-safe).
- **`done/`** — closed items (resolved history — never reformat or renumber).

Plus two parking folders, not part of the active pipeline:

- **`future/`** — parked ideas (no id required, no skill drives them).
- **`rejected/`** — declined items, kept for the rationale.

Reference material (not work items): `mockups/` (HTML/UI sketches — the
approval gate for UI-heavy items) and `notes/` (audits, longer-form planning
notes).

## How items move (use the scripts — don't hand-move files)

| Action | Command |
|---|---|
| See the whole pipeline | `scripts/board.sh [inbox\|confirmed\|in_progress\|done\|future\|rejected]` |
| Intake an inbox item (assign id + move to `confirmed/`) | `/scope`, which runs `scripts/intake.sh planning/inbox/<file>.md` |
| Check an item's `depends_on` are satisfied | `scripts/ready.sh planning/confirmed/<file>.md` |
| Claim a planned item (move to `in_progress/`, WIP = 1) | `/build`, which runs `scripts/start.sh planning/confirmed/<file>.md` |
| Close a built item (stamp Resolution + move to `done/`) | `/build`, which runs `scripts/close.sh planning/in_progress/<file>.md` |
| Park / decline an item (no Resolution stamp) | `scripts/close.sh <file> future` / `scripts/close.sh <file> rejected` |

To revive a parked item, move it back to `inbox/` by hand — intake assigns its
id then (or keeps the one it already burned).

## IDs

Every scoped item gets `WM-###` (prefix from `planning/.config`, fallback
`ITEM` when the file is absent), allocated once from `planning/.next_id`
(a single bare integer) by `scripts/intake.sh` — never hand-assigned, never
reused. `.next_id` reconciles against the tree, so it self-corrects.

## Item format

Start from `_template.md`. YAML frontmatter:

```yaml
id: WM-014             # blank in inbox; /scope assigns it
type: bug              # feature | bug | chore
title: ...
priority: P2           # P0 | P1 | P2 | P3
effort: M              # XS | S | M | L | XL
owner: ...
opened: 2026-06-05
depends_on: []         # hard blockers: [WM-003, nativemojo/django-mojo#DM-007]
related: []            # soft links
links: []              # external URLs
build_strategy: inline # optional — inline | delegate | fanout (stamped by /scope)
build_model: sonnet    # optional — sonnet | opus | fable
```

Then `## What & Why`, `## Acceptance Criteria`, `## Repro — bugs only`,
`## Plan` (filled by `/scope`, which deletes the `PLAN PENDING` marker —
the build gate), `## Notes` (scratch space), and `## Resolution` (stamped by
`scripts/close.sh` at close).

## Reference notation
- Same-repo item → `WM-001`
- Item in another repo → `nativemojo/django-mojo#DM-007` (that repo's own prefix)
- External thing (PR, design doc, tracker issue) → a full URL, in `links`
