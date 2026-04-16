#!/bin/bash
# PreToolUse hook — before `git commit` or `git push`, surface the repo/branch/remote
# so Claude can verify it's committing to the right place. Advisory (exit 0) except
# when git toplevel and CLAUDE_PROJECT_DIR clearly disagree.

set -u

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

echo "$CMD" | grep -qE "(^|&&|;|\|\|) *git +(commit|push)" || exit 0

TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null || echo "(not a git repo)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(unknown)")
REMOTE=$(git remote get-url origin 2>/dev/null || echo "(no origin)")

{
  echo "[git-guard] about to run: $CMD"
  echo "  repo:    $TOPLEVEL"
  echo "  branch:  $BRANCH"
  echo "  remote:  $REMOTE"
  echo "  project: ${CLAUDE_PROJECT_DIR:-(unset)}"
} >&2

if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ "$TOPLEVEL" != "(not a git repo)" ] && [ "$TOPLEVEL" != "$CLAUDE_PROJECT_DIR" ]; then
  case "$CLAUDE_PROJECT_DIR/" in
    "$TOPLEVEL"/*) ;;
    *)
      echo "[git-guard] BLOCKED: git toplevel ($TOPLEVEL) is not $CLAUDE_PROJECT_DIR — wrong repo?" >&2
      exit 2
      ;;
  esac
fi
exit 0
