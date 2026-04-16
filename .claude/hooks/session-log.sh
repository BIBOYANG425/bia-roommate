#!/bin/bash
# Stop hook — appends a turn entry to a shared team log at
# $CLAUDE_PROJECT_DIR/.claude/session-logs/YYYY-MM-DD.md.
# Captures the last user prompt, tools used, and Claude's final text so the team
# can review what was done and the reasoning after the fact.

set -u

INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty')
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

[ "$STOP_ACTIVE" = "true" ] && exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$HOME}"
LOG_DIR="$PROJECT_DIR/.claude/session-logs"
mkdir -p "$LOG_DIR" 2>/dev/null || exit 0
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).md"

TS=$(date +"%H:%M:%S")
SHORT_SESSION=$(echo "$SESSION" | cut -c1-8)

USER_MSG=""
ASSISTANT_TXT=""
TOOLS=""

if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  TAIL=$(tail -300 "$TRANSCRIPT" 2>/dev/null)
  USER_MSG=$(printf '%s\n' "$TAIL" | jq -r 'select(.type=="user" and .message.role=="user") | if (.message.content | type) == "string" then .message.content else (.message.content[]? | select(.type=="text") | .text) end' 2>/dev/null | tail -1 | tr '\n' ' ' | cut -c1-300)
  ASSISTANT_TXT=$(printf '%s\n' "$TAIL" | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="text") | .text' 2>/dev/null | tail -1 | cut -c1-800)
  TOOLS=$(printf '%s\n' "$TAIL" | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | .name' 2>/dev/null | sort -u | paste -sd ', ' -)
fi

[ ! -f "$LOG_FILE" ] && {
  {
    echo "# Session log — $(date +%Y-%m-%d)"
    echo ""
    echo "Shared team log. Each entry captures what Claude did and why. Add your own notes under each turn."
    echo ""
  } > "$LOG_FILE"
}

{
  echo ""
  echo "## ${TS} — session ${SHORT_SESSION}"
  echo ""
  echo "**Prompt:** ${USER_MSG:-(none captured)}"
  echo ""
  if [ -n "$TOOLS" ]; then
    echo "**Tools:** $TOOLS"
    echo ""
  fi
  echo "**Claude's reasoning / summary:**"
  echo ""
  echo "${ASSISTANT_TXT:-(no final text captured)}"
  echo ""
  echo "_Team notes:_"
  echo ""
  echo "---"
} >> "$LOG_FILE"

exit 0
