# Git Rules

## Branches & Worktrees
- Every code build uses a dedicated `codex/<item>` branch in its own Git
  worktree. Never edit from the primary `main` checkout or share a checkout
  between concurrent builds.
- Keep the primary checkout on `main` for integration. After scoped
  verification is green, merge the completed branch into local `main`.
- Cleanup is part of done: verify the branch is merged, remove that exact
  worktree, delete that exact merged local branch, run `git worktree prune`,
  and confirm neither remains. Never bulk-delete worktrees or branches owned by
  other sessions.
- Pushing remains opt-in. A local merge into `main` does not authorize a push.

## Parallel checkouts
One worktree owns one claimed item and its build/test processes. Different
worktrees may build concurrently; never split one item across worktrees or run
two agents in the same checkout.

## Commits
- **Commit when you finish a request.** Commit verified work on its item branch,
  then merge it into local `main` and perform the mandatory cleanup above.
  Stage specific files by name — never `git add -A` / `.`.
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
