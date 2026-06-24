#!/usr/bin/env bash
# effect-kit: Effect/tsgo diagnostics on packages with staged files.
# Reports diagnostics from the staged files only; blocks the commit only on errors.
set -uo pipefail
[ $# -eq 0 ] && exit 0

pattern=$(printf '%s\n' "$@" | sed 's/[.[\*^$()+?{}|]/\\&/g' | paste -sd'|' -)
tsconfigs=$(for f in "$@"; do
  d="$f"; while [ "$d" != "." ]; do d=$(dirname "$d"); [ -f "$d/tsconfig.json" ] && echo "$d/tsconfig.json" && break; done
done | sort -u)
[ -z "$tsconfigs" ] && exit 0

out=$(mktemp); trap 'rm -f "$out"' EXIT
while IFS= read -r tc; do
  [ -z "$tc" ] && continue
  npx @typescript/native-preview --noEmit --project "$tc" >> "$out" 2>&1
done <<< "$tsconfigs"

grep -E "($pattern).*: (error|warning) " "$out" || true
if grep -E "($pattern).*: error " "$out" >/dev/null; then exit 1; fi
exit 0
