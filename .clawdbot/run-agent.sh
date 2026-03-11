#!/usr/bin/env bash
set -euo pipefail

# run-agent.sh — Execute the appropriate coding agent with the task prompt.
# Called by spawn-agent.sh inside a tmux session. Do not run directly.
#
# Usage: run-agent.sh <task-id> <agent> <effort> <prompt-file>

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$SCRIPT_DIR/config.json"
TASKS="$SCRIPT_DIR/active-tasks.json"

TASK_ID="$1"
AGENT="$2"
EFFORT="$3"
PROMPT_FILE="$4"

PROMPT=$(cat "$PROMPT_FILE")

echo "╔══════════════════════════════════════════════════╗"
echo "║  VINCE Agent Swarm — $AGENT                     "
echo "║  Task: $TASK_ID                                  "
echo "║  Effort: $EFFORT                                 "
echo "║  Started: $(date)                                "
echo "╚══════════════════════════════════════════════════╝"
echo ""

update_status() {
  local status="$1"
  local note="${2:-}"
  local temp
  temp=$(mktemp)
  if [ -n "$note" ]; then
    jq --arg id "$TASK_ID" --arg s "$status" --arg n "$note" \
      '(.[] | select(.id == $id)) |= (.status = $s | .note = $n | .completedAt = (now * 1000 | floor))' \
      "$TASKS" > "$temp"
  else
    jq --arg id "$TASK_ID" --arg s "$status" \
      '(.[] | select(.id == $id)) |= (.status = $s)' \
      "$TASKS" > "$temp"
  fi
  mv "$temp" "$TASKS"
}

run_codex() {
  echo "[agent] Running Codex in APPROVAL MODE (model: gpt-5.3-codex, effort: $EFFORT) ..."
  echo "[agent] You must be attached to this tmux session to approve commands."
  echo "[agent]   tmux attach -t agent-$TASK_ID"
  echo ""
  codex --model gpt-5.3-codex \
    -c "model_reasoning_effort=$EFFORT" \
    "$PROMPT"
}

run_claude() {
  echo "[agent] Running Claude Code in APPROVAL MODE ..."
  echo "[agent] You must be attached to this tmux session to approve commands."
  echo "[agent]   tmux attach -t agent-$TASK_ID"
  echo ""
  claude --model claude-sonnet-4-20250514 \
    -p "$PROMPT"
}

run_gemini() {
  echo "[agent] Running Gemini ..."
  echo ""
  gemini \
    -p "$PROMPT"
}

notify_discord() {
  local msg="$1"
  local channel_id
  channel_id=$(jq -r '.notifications.discordChannelId // empty' "$CONFIG")
  local discord_enabled
  discord_enabled=$(jq -r '.notifications.discord // false' "$CONFIG")
  if [ "$discord_enabled" = "true" ] && [ -n "$channel_id" ]; then
    /Users/vince/.npm-global/bin/openclaw message send \
      --channel discord \
      --target "channel:$channel_id" \
      --message "$msg" 2>/dev/null || true
  fi
}

trap 'update_status "failed" "Agent process exited with error"; notify_discord "⚠️ **clawdbot** | Task \`'"$TASK_ID"'\` failed (agent: '"$AGENT"')"' ERR

case "$AGENT" in
  codex)
    run_codex
    ;;
  claude)
    run_claude
    ;;
  gemini)
    run_gemini
    ;;
  *)
    echo "ERROR: Unknown agent '$AGENT'. Supported: codex, claude, gemini"
    update_status "failed" "Unknown agent type: $AGENT"
    exit 1
    ;;
esac

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  # Check if a PR was created
  PR_URL=$(gh pr list --head "$(git branch --show-current)" --json url -q '.[0].url' 2>/dev/null || echo "")
  if [ -n "$PR_URL" ]; then
    PR_NUM=$(echo "$PR_URL" | grep -oE '[0-9]+$')
    echo ""
    echo "=== PR Created: $PR_URL ==="
    
    temp=$(mktemp)
    jq --arg id "$TASK_ID" --arg pr "$PR_NUM" --arg url "$PR_URL" \
      '(.[] | select(.id == $id)) |= (.status = "pr_created" | .pr = ($pr | tonumber) | .prUrl = $url | .completedAt = (now * 1000 | floor))' \
      "$TASKS" > "$temp"
    mv "$temp" "$TASKS"
    notify_discord "✅ **clawdbot** | Task \`$TASK_ID\` done — PR #$PR_NUM ready for review
$PR_URL"
  else
    update_status "completed" "Agent finished but no PR detected"
    notify_discord "✅ **clawdbot** | Task \`$TASK_ID\` complete (no PR detected — check tmux: \`tmux attach -t agent-$TASK_ID\`)"
  fi
else
  update_status "failed" "Agent exited with code $EXIT_CODE"
  notify_discord "⚠️ **clawdbot** | Task \`$TASK_ID\` failed (exit $EXIT_CODE) — check tmux: \`tmux attach -t agent-$TASK_ID\`"
fi

echo ""
echo "=== Agent session complete. This tmux session will stay open for inspection. ==="
echo "Kill with: tmux kill-session -t agent-$TASK_ID"
