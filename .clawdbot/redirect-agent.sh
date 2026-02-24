#!/usr/bin/env bash
set -euo pipefail

# redirect-agent.sh — Send mid-task instructions to a running agent via tmux.
# Faster and cheaper than killing and respawning. The agent adjusts without
# losing the context it has already built.
#
# Usage: ./redirect-agent.sh <task-id> "<instruction>"
#
# Examples:
#   ./redirect-agent.sh fix-echo-ratelimit "Stop. Focus on the API layer first, not the UI."
#   ./redirect-agent.sh otaku-quick-action "The schema is in src/types/template.ts. Use that."
#   ./redirect-agent.sh fix-echo-ratelimit "The test file is at src/plugins/plugin-x-research/__tests__/ratelimit.test.ts"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASKS="$SCRIPT_DIR/active-tasks.json"

TASK_ID="${1:?Usage: redirect-agent.sh <task-id> \"<instruction>\"}"
INSTRUCTION="${2:?Missing instruction}"

SESSION=$(jq -r --arg id "$TASK_ID" '.[] | select(.id == $id) | .tmuxSession' "$TASKS")

if [ -z "$SESSION" ] || [ "$SESSION" = "null" ]; then
  echo "ERROR: No task found with id '$TASK_ID'"
  echo "Active tasks:"
  jq -r '.[] | select(.status == "running") | "  \(.id) — \(.description)"' "$TASKS"
  exit 1
fi

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "ERROR: tmux session '$SESSION' is not running."
  echo "The agent may have finished or crashed. Check: .clawdbot/list-agents.sh"
  exit 1
fi

echo "[redirect] Sending to $TASK_ID (session: $SESSION):"
echo "  \"$INSTRUCTION\""
echo ""

tmux send-keys -t "$SESSION" "$INSTRUCTION" Enter

echo "[redirect] Sent. Attach to watch: tmux attach -t $SESSION"
