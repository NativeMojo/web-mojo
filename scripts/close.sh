#!/usr/bin/env bash
# Close a confirmed item: stamp its Resolution block, then move it to done/.
# Usage: scripts/close.sh planning/confirmed/<file>.md [base-ref]   (from repo root)
# base-ref (default origin/main) is only used to list changed files.
set -uo pipefail
src="${1:?usage: scripts/close.sh <item-file> [base-ref]}"
[ -f "$src" ] || { echo "no such file: $src" >&2; exit 1; }
base="${2:-origin/main}"
case "$src" in planning/confirmed/*) ;; *) echo "warning: $src is not in planning/confirmed/" >&2 ;; esac

today="$(date +%F)"
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
changed="$(git diff --name-only "$base"...HEAD 2>/dev/null | paste -sd, - 2>/dev/null || true)"

# Replace "- <key>: ..." in the Resolution block. \Q…\E quotes the key (so a key
# with spaces like "files changed" is literal); key/value pass via env so shell
# metacharacters in paths/branches stay literal.
set_kv() {
  K="$1" V="$2" perl -i -pe 'BEGIN{($k,$v)=@ENV{qw/K V/}} s/^- \Q$k\E:.*/- $k: $v/' "$src"
}
grep -q '^- closed:' "$src" || echo "warning: no Resolution block in $src (nothing stamped)" >&2
set_kv "closed" "$today"
[ -z "$branch" ]  || set_kv "branch" "$branch"
[ -z "$changed" ] || set_kv "files changed" "$changed"

dest="planning/done/$(basename "$src")"
mkdir -p planning/done
# git mv only works on tracked files; fall back to plain mv otherwise.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
   && git ls-files --error-unmatch "$src" >/dev/null 2>&1; then
  git mv "$src" "$dest"
else
  mv "$src" "$dest"
fi
echo "closed -> $dest"
