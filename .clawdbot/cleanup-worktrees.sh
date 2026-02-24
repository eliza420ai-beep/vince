#!/usr/bin/env bash
set -euo pipefail

# cleanup-worktrees.sh — Remove worktrees and registry entries for completed/failed tasks.
# Safe to run as a daily cron job.
#
# Cron example (daily at 3am):
#   0 3 * * * /Users/macbookpro16/vince/.clawdbot/cleanup-worktrees.sh >> /Users/macbookpro16/vince/.clawdbot/cleanup.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG="$SCRIPT_DIR/config.json"
TASKS="$SCRIPT_DIR/active-tasks.json"
WORKTREE_DIR="$(jq -r '.worktreeDir' "$CONFIG")"
WORKTREE_BASE="$REPO_ROOT/$WORKTREE_DIR"

echo "=== Worktree Cleanup: $(date) ==="

# Only clean tasks that are completed, merged, or failed
CLEANABLE=$(jq -c '.[] | select(.status == "completed" or .status == "merged" or .status == "failed")' "$TASKS")

if [ -z "$CLEANABLE" ]; then
  echo "[cleanup] Nothing to clean."
  exit 0
fi

CLEANED=0
echo "$CLEANABLE" | while IFS= read -r task; do
  TASK_ID=$(echo "$task" | jq -r '.id')
  SESSION=$(echo "$task" | jq -r '.tmuxSession')
  WORKTREE_PATH="$WORKTREE_BASE/$TASK_ID"
  BRANCH=$(echo "$task" | jq -r '.branch')

  echo "[cleanup] Cleaning $TASK_ID ..."

  # Kill tmux session if still alive
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION"
    echo "  Killed tmux session $SESSION"
  fi

  # Remove worktree
  if [ -d "$WORKTREE_PATH" ]; then
    cd "$REPO_ROOT"
    git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
    echo "  Removed worktree $WORKTREE_PATH"
  fi

  # Remove prompt file
  PROMPT_FILE="$SCRIPT_DIR/prompts/$TASK_ID.md"
  if [ -f "$PROMPT_FILE" ]; then
    rm "$PROMPT_FILE"
    echo "  Removed prompt file"
  fi

  # Delete local branch if merged
  STATUS=$(echo "$task" | jq -r '.status')
  if [ "$STATUS" = "merged" ]; then
    cd "$REPO_ROOT"
    git branch -d "$BRANCH" 2>/dev/null && echo "  Deleted branch $BRANCH" || true
  fi

  CLEANED=$((CLEANED + 1))
done

# Remove cleaned tasks from registry
temp=$(mktemp)
jq '[.[] | select(.status != "completed" and .status != "merged" and .status != "failed")]' "$TASKS" > "$temp"
mv "$temp" "$TASKS"

echo ""
echo "[cleanup] Done. Cleaned tasks removed from registry."
echo "=== Cleanup complete ==="
