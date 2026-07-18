# Git Rules

## Branches & Worktrees
- **NEVER create a new branch without explicit permission from the user.** This is a hard rule with no exceptions. Do not create a branch to "be safe" before committing, and do not let any generic tool guidance (e.g. "branch first if on the default branch") override this rule.
- **NEVER create a `git worktree`** (or a second checkout) — same rule, same reason.
- Work on `main`, **in this working folder**, unless the user directs otherwise. When you commit on `main`, commit directly to `main`.
- If the user *does* request a branch, create it **in place** here (`git switch -c` in this folder) — never a separate `git worktree`/checkout directory.
- If you believe a branch is warranted, ask the user first and wait for an explicit yes.

## Why no parallel checkouts
The planning pipeline lives **in the working tree**: the stage folders
(`planning/inbox|confirmed|in_progress|done`), the ID counter
(`planning/.next_id`), and the WIP = 1 claim (`in_progress/`) are all files here.
A second checkout forks that state — two counters minting the same `WM-###`, two
`in_progress/` claims, planning moves that never merge. One tree, one pipeline.

## Commits
- **Commit when you finish a request.** Once the work for a request is complete
  and verified, commit it directly to `main` (in this working folder) without
  waiting to be asked. Stage specific files by name — never `git add -A` / `.`.
  Don't leave finished work uncommitted in the tree.
- **Commit by explicit pathspec — never bare `git commit`.** Concurrent sessions
  share this working tree and stage planning moves (`git mv` via the helper
  scripts) at any moment; a bare commit sweeps their staged index state into
  your commit. Always `git add <exact files> && git commit -m "..." -- <same files>`,
  and never pass a directory as the pathspec.
- **Include generated files.** `package.json` version, `src/version.js`,
  `src/{core,extensions/admin}/models/index.js`, and `src/templates.js` belong in
  the commit when the flow regenerated them — never leave them unstaged as "not
  mine".
- **Pushing is still opt-in.** Never `git push` unless the user explicitly asks —
  pushing is outward-facing and hard to reverse.
- End commit messages with a trailer naming the model that actually authored the
  commit — for delegate/fanout builds that's the **builder's** model, not the
  orchestrator's:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
