#!/usr/bin/env bash
set -euo pipefail

# mark-merged.sh — Mark a task as merged after you've reviewed and merged the PR.
# Usage: ./mark-merged.sh <task-id>

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASKS="$SCRIPT_DIR/active-tasks.json"

TASK_ID="${1:?Usage: mark-merged.sh <task-id>}"

EXISTING=$(jq -r --arg id "$TASK_ID" '.[] | select(.id == $id) | .id' "$TASKS")
if [ -z "$EXISTING" ]; then
  echo "ERROR: No task found with id '$TASK_ID'"
  exit 1
fi

temp=$(mktemp)
jq --arg id "$TASK_ID" \
  '(.[] | select(.id == $id)) |= (.status = "merged" | .mergedAt = (now * 1000 | floor))' \
  "$TASKS" > "$temp"
mv "$temp" "$TASKS"

echo "Task '$TASK_ID' marked as merged."
echo "Run .clawdbot/cleanup-worktrees.sh to remove the worktree and branch."
