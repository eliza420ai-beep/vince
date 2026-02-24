#!/usr/bin/env bash
set -euo pipefail

# list-agents.sh — Show status of all tasks in the swarm.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASKS="$SCRIPT_DIR/active-tasks.json"

TOTAL=$(jq 'length' "$TASKS")

if [ "$TOTAL" -eq 0 ]; then
  echo "No tasks in registry. Spawn one with:"
  echo "  .clawdbot/spawn-agent.sh <task-id> <branch> \"<description>\" [agent] [effort]"
  exit 0
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  VINCE Agent Swarm — Task Registry                          "
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Status colors
STATUS_RUNNING="🟢"
STATUS_PR="🔵"
STATUS_REVIEW="🟡"
STATUS_DONE="✅"
STATUS_FAILED="🔴"
STATUS_OTHER="⚪"

jq -r '.[] | [.status, .id, .agent, .description, .branch, (.pr // "-"), (.respawnCount // 0)] | @tsv' "$TASKS" | \
while IFS=$'\t' read -r status id agent desc branch pr respawns; do
  case "$status" in
    running)          icon="$STATUS_RUNNING" ;;
    pr_created)       icon="$STATUS_PR" ;;
    ready_for_review) icon="$STATUS_REVIEW" ;;
    completed|merged) icon="$STATUS_DONE" ;;
    failed)           icon="$STATUS_FAILED" ;;
    *)                icon="$STATUS_OTHER" ;;
  esac

  echo "$icon [$status] $id"
  echo "    Agent: $agent | Branch: $branch | PR: $pr | Respawns: $respawns"
  echo "    $desc"
  echo ""
done

echo "---"
RUNNING_COUNT=$(jq '[.[] | select(.status == "running")] | length' "$TASKS")
echo "Running: $RUNNING_COUNT | Total: $TOTAL"
echo ""
echo "Commands:"
echo "  Spawn:    .clawdbot/spawn-agent.sh <id> <branch> \"desc\" [agent] [effort]"
echo "  Redirect: .clawdbot/redirect-agent.sh <id> \"instruction\""
echo "  Attach:   tmux attach -t agent-<id>"
echo "  Monitor:  .clawdbot/check-agents.sh"
echo "  Cleanup:  .clawdbot/cleanup-worktrees.sh"
