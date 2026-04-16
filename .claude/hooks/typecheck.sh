#!/bin/bash
# PostToolUse hook — runs tsc --noEmit on the package containing the edited file.
# Walks up from the file to the nearest tsconfig.json so it works across repos.
# Async + asyncRewake: runs in background; only wakes Claude if errors found.

set -u

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE" in
  *.ts|*.tsx|*.mts|*.cts) ;;
  *) exit 0 ;;
esac

[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

DIR=$(dirname "$FILE")
while [ "$DIR" != "/" ] && [ "$DIR" != "." ]; do
  if [ -f "$DIR/tsconfig.json" ]; then
    break
  fi
  DIR=$(dirname "$DIR")
done
[ ! -f "$DIR/tsconfig.json" ] && exit 0

cd "$DIR" || exit 0
OUTPUT=$(npx --no-install tsc --noEmit 2>&1)
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "[typecheck] errors in $DIR (triggered by edit to $(basename "$FILE")):" >&2
  echo "$OUTPUT" | grep -E "error TS|: error" | head -15 >&2
  exit 2
fi
exit 0
