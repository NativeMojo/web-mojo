---
# id is assigned by /scope on pickup — leave it blank
id: WM-028
type: chore
title: Adopt config-driven item ID prefixes (WM-###) from the updated canonical workflow spec
priority: P2
effort: S
owner: ian
opened: 2026-07-16
depends_on: []         # django-mojo's DM-041 (done) defined the pattern
related: []            # nativemojo/django-mojo#DM-041
links: []
---

# Adopt config-driven item ID prefixes (WM-###) from the updated canonical workflow spec

## What & Why
Item ids here are generic `ITEM-###` — meaningless to the user and ambiguous
across the projects that share this workflow. The canonical spec
(`/Users/ians/Projects/ai_project_setup.md`) is now config-driven: a
`planning/.config` file (shell-sourceable, `PREFIX=WM` for this repo) supplies
the id prefix; the scripts fall back to `ITEM` when it's absent. django-mojo
already landed this as DM-041 (commit `4ac6243` there) — this item is the
web-mojo rollout, keeping the scripts byte-identical with the spec.

Decisions already made (with the user, 2026-07-16, during DM-041):
- Prefix for this repo: `WM`. Keep 3-digit zero-padding. Numbers unchanged.
- Rename ALL existing `ITEM-*` items (files via `git mv` + frontmatter `id:` +
  `depends_on:`/`related:`/prose refs). Cross-repo `repo#ITEM-###` refs are
  preserved verbatim (rewrite rule: `perl -pe 's/(?<!#)\bITEM-(\d+)/WM-$1/g'`).
- Counter (`planning/.next_id`) stays a bare integer, untouched.
- This repo's intake.sh/ready.sh are older, simpler variants than the spec's —
  the rollout REPLACES them with the spec versions verbatim (that's the point:
  no more drift), same for any other drifted script.

## Acceptance Criteria
- [ ] `planning/.config` exists with `PREFIX=WM`.
- [ ] All five scripts match the canonical spec verbatim (copy, don't retype);
      intake mints `WM-###`, ready.sh normalizes `WM-` ids.
- [ ] All existing `ITEM-*` items renamed to `WM-*` in every stage folder,
      frontmatter ids + local refs rewritten, cross-repo refs preserved.
- [ ] Workflow docs in this repo (CLAUDE.md / skills / template / memory) swept
      for `ITEM-` references, including any drifted "fresh session" hand-off
      prose (see spec's corrected wording).
- [ ] Smoke test: `bash -n scripts/*.sh`; throwaway intake mints the next
      sequential `WM-###` (counter currently 28 → expect `WM-028`); board.sh /
      ready.sh clean.

## Repro — bugs only
n/a

## Notes
Full pattern, rationale, and the exact rewrite/rename commands live in
django-mojo's closed item `planning/done/DM-041-*.md` and the updated spec docs
(`/Users/ians/Projects/ai_project_setup.md`,
`/Users/ians/Projects/migrate-agent-workflow.md`). wmx_portal / wmx_api get the
same treatment (proposed prefixes `WP` / `WA`, pending confirmation); the five
older repos (hamp-backend, legacy-portal, reseaudent_api, android-mojo,
wmx_test_client) need the full `migrate-agent-workflow.md` migration instead.

## Resolution
- closed: 2026-07-16
- branch: main
- files changed:
- tests added: none (workflow tooling; smoke-tested via this very intake)
