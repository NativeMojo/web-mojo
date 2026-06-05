#!/usr/bin/env bash
# Show the planning pipeline at a glance. Reads frontmatter; only this output
# costs tokens, not the files it scans.
# Usage: scripts/board.sh [inbox|confirmed|done]   (run from repo root)
set -uo pipefail
filter="${1:-}"

fm() { awk -v k="$2" '
  /^---[[:space:]]*$/{f++; next}
  f==1 && index($0, k":")==1 { sub(/^[^:]*:[[:space:]]*/,""); print; exit }
' "$1"; }

row() {  # file, stage
  local f="$1" stage="$2" id type pri title flag="-"
  id="$(fm "$f" id)"; [ -n "$id" ] || id="$(basename "$f" .md)"
  type="$(fm "$f" type)"; pri="$(fm "$f" priority)"; title="$(fm "$f" title)"
  title="${title%\"}"; title="${title#\"}"   # strip surrounding quotes if present
  if [ "$stage" = confirmed ]; then
    if scripts/ready.sh "$f" >/dev/null 2>&1; then flag=ready; else flag=BLOCKED; fi
  fi
  printf '%-10s %-9s %-8s %-4s %-8s %s\n' "$id" "$stage" "${type:--}" "${pri:--}" "$flag" "${title:--}"
}

printf '%-10s %-9s %-8s %-4s %-8s %s\n' ID STAGE TYPE PRI STATE TITLE
for stage in inbox confirmed done; do
  [ -z "$filter" ] || [ "$filter" = "$stage" ] || continue
  for f in planning/"$stage"/*.md; do
    [ -e "$f" ] || continue
    case "$(basename "$f")" in _*) continue;; esac
    row "$f" "$stage"
  done
done
