#!/usr/bin/env bash
set -euo pipefail

# check-agents.sh — Monitoring loop for the agent swarm.
# Runs every N minutes via cron. 100% deterministic, zero tokens burned.
#
# Checks:
#   1. tmux sessions alive for running tasks
#   2. Open PRs on tracked branches — CI status
#   3. Auto-respawns failed agents (up to max attempts)
#   4. Alerts only when human attention needed
#
# Cron example (every 10 min):
#   */10 * * * * /Users/macbookpro16/vince/.clawdbot/check-agents.sh >> /Users/macbookpro16/vince/.clawdbot/monitor.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG="$SCRIPT_DIR/config.json"
TASKS="$SCRIPT_DIR/active-tasks.json"
LOG="$SCRIPT_DIR/monitor.log"
MAX_RESPAWN="$(jq -r '.maxRespawnAttempts' "$CONFIG")"

NOW=$(date +%s)
echo ""
echo "=== Agent Monitor Check: $(date) ==="

ALERTS=()

# --- 1. Check tmux sessions for running tasks ---
RUNNING_TASKS=$(jq -c '.[] | select(.status == "running")' "$TASKS")

if [ -z "$RUNNING_TASKS" ]; then
  echo "[monitor] No running tasks."
else
  echo "$RUNNING_TASKS" | while IFS= read -r task; do
    TASK_ID=$(echo "$task" | jq -r '.id')
    SESSION=$(echo "$task" | jq -r '.tmuxSession')
    AGENT=$(echo "$task" | jq -r '.agent')
    RESPAWNS=$(echo "$task" | jq -r '.respawnCount // 0')

    if tmux has-session -t "$SESSION" 2>/dev/null; then
      STARTED=$(echo "$task" | jq -r '.startedAt')
      ELAPSED=$(( (NOW * 1000 - STARTED) / 60000 ))
      echo "[monitor] $TASK_ID [$AGENT] — running (${ELAPSED}m elapsed)"
    else
      echo "[monitor] $TASK_ID [$AGENT] — tmux session '$SESSION' DEAD"

      if [ "$RESPAWNS" -lt "$MAX_RESPAWN" ]; then
        echo "[monitor] Respawning $TASK_ID (attempt $((RESPAWNS + 1))/$MAX_RESPAWN) ..."
        PROMPT_FILE="$SCRIPT_DIR/prompts/$TASK_ID.md"
        WORKTREE_DIR="$(jq -r '.worktreeDir' "$CONFIG")"
        WORKTREE_PATH="$REPO_ROOT/$WORKTREE_DIR/$TASK_ID"
        EFFORT="$(echo "$task" | jq -r '.effort // "high"')"

        if [ -d "$WORKTREE_PATH" ] && [ -f "$PROMPT_FILE" ]; then
          tmux new-session -d -s "$SESSION" -c "$WORKTREE_PATH" \
            "$SCRIPT_DIR/run-agent.sh '$TASK_ID' '$AGENT' '$EFFORT' '$PROMPT_FILE'"

          temp=$(mktemp)
          jq --arg id "$TASK_ID" \
            '(.[] | select(.id == $id)) |= (.respawnCount = (.respawnCount + 1))' \
            "$TASKS" > "$temp"
          mv "$temp" "$TASKS"

          echo "[monitor] Respawned $TASK_ID in session $SESSION"
        else
          echo "[monitor] Cannot respawn — missing worktree or prompt file"
          ALERTS+=("DEAD: $TASK_ID — cannot auto-respawn (missing files)")
        fi
      else
        echo "[monitor] $TASK_ID exceeded max respawn attempts ($MAX_RESPAWN). Marking failed."
        temp=$(mktemp)
        jq --arg id "$TASK_ID" \
          '(.[] | select(.id == $id)) |= (.status = "failed" | .note = "Exceeded max respawn attempts")' \
          "$TASKS" > "$temp"
        mv "$temp" "$TASKS"
        ALERTS+=("FAILED: $TASK_ID — exceeded $MAX_RESPAWN respawn attempts")
      fi
    fi
  done
fi

# --- 2. Check PRs for pr_created tasks ---
PR_TASKS=$(jq -c '.[] | select(.status == "pr_created")' "$TASKS")

if [ -n "$PR_TASKS" ]; then
  echo ""
  echo "[monitor] Checking CI for open PRs ..."
  echo "$PR_TASKS" | while IFS= read -r task; do
    TASK_ID=$(echo "$task" | jq -r '.id')
    PR_NUM=$(echo "$task" | jq -r '.pr')
    BRANCH=$(echo "$task" | jq -r '.branch')

    cd "$REPO_ROOT"

    # Check CI status
    CI_STATUS=$(gh pr checks "$PR_NUM" --json name,state -q '.[].state' 2>/dev/null | sort -u || echo "unknown")

    if echo "$CI_STATUS" | grep -q "FAILURE"; then
      echo "[monitor] PR #$PR_NUM ($TASK_ID) — CI FAILED"
      ALERTS+=("CI FAILED: PR #$PR_NUM ($TASK_ID) on branch $BRANCH")
    elif echo "$CI_STATUS" | grep -q "PENDING"; then
      echo "[monitor] PR #$PR_NUM ($TASK_ID) — CI pending"
    elif echo "$CI_STATUS" | grep -q "SUCCESS"; then
      echo "[monitor] PR #$PR_NUM ($TASK_ID) — CI passed. Ready for human review."

      temp=$(mktemp)
      jq --arg id "$TASK_ID" \
        '(.[] | select(.id == $id)) |= (.status = "ready_for_review" | .checks = {"ciPassed": true})' \
        "$TASKS" > "$temp"
      mv "$temp" "$TASKS"

      ALERTS+=("READY: PR #$PR_NUM ($TASK_ID) — CI passed, ready to merge")
    else
      echo "[monitor] PR #$PR_NUM ($TASK_ID) — status: $CI_STATUS"
    fi
  done
fi

# --- 3. Print summary ---
TOTAL=$(jq 'length' "$TASKS")
RUNNING_COUNT=$(jq '[.[] | select(.status == "running")] | length' "$TASKS")
PR_COUNT=$(jq '[.[] | select(.status == "pr_created")] | length' "$TASKS")
REVIEW_COUNT=$(jq '[.[] | select(.status == "ready_for_review")] | length' "$TASKS")
DONE_COUNT=$(jq '[.[] | select(.status == "completed" or .status == "merged")] | length' "$TASKS")
FAILED_COUNT=$(jq '[.[] | select(.status == "failed")] | length' "$TASKS")

echo ""
echo "=== Summary ==="
echo "  Total tasks:      $TOTAL"
echo "  Running:          $RUNNING_COUNT"
echo "  PRs open:         $PR_COUNT"
echo "  Ready for review: $REVIEW_COUNT"
echo "  Completed:        $DONE_COUNT"
echo "  Failed:           $FAILED_COUNT"

# --- 4. Send alerts ---
if [ ${#ALERTS[@]} -gt 0 ]; then
  echo ""
  echo "=== ALERTS (need human attention) ==="
  for alert in "${ALERTS[@]}"; do
    echo "  ! $alert"
  done

  # Telegram notification (if configured)
  TG_ENABLED=$(jq -r '.notifications.telegram' "$CONFIG")
  if [ "$TG_ENABLED" = "true" ]; then
    TG_TOKEN=$(jq -r '.notifications.telegramBotToken' "$CONFIG")
    TG_CHAT=$(jq -r '.notifications.telegramChatId' "$CONFIG")
    MSG="🤖 *VINCE Swarm Alert*%0A"
    for alert in "${ALERTS[@]}"; do
      MSG+="• ${alert}%0A"
    done
    curl -s "https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_CHAT}&text=${MSG}&parse_mode=Markdown" > /dev/null 2>&1 || true
  fi
fi

echo ""
echo "=== Monitor check complete ==="
