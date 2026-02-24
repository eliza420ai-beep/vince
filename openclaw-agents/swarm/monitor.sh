#!/usr/bin/env bash
# monitor.sh — VINCE Swarm Monitoring Loop
#
# Run every 10 minutes via cron:
#   */10 * * * * /path/to/vince/openclaw-agents/swarm/monitor.sh >> /tmp/vince-swarm-monitor.log 2>&1
#
# Checks:
#   1. Are tmux sessions alive?
#   2. Any new completed PRs on swarm branches?
#   3. CI status for tracked branches
#   4. Stuck agents (running >2hr)
#   5. Auto-respawn failed agents (max 3 attempts)
#
# "The monitoring loop is the unsung hero. A cron job runs every ten minutes,
#  checks if tmux sessions are alive, checks for open PRs on tracked branches,
#  checks CI status via the GitHub CLI, and auto-respawns failed agents with a
#  maximum of three attempts. It doesn't poll the agents directly — that would
#  burn tokens. It reads the task registry JSON and checks external signals.
#  Deterministic. Token-efficient. Only alerts when something needs human attention."
#   — "One Month With the Swarm" (ikigaistudio.substack.com)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REGISTRY="$SCRIPT_DIR/task-registry.json"
LOG_FILE="/tmp/vince-swarm-monitor.log"
REPO="eliza420ai-beep/vince"
MAX_RETRIES=3
STUCK_THRESHOLD_MINUTES=120
ORCHESTRATOR="bun run $SCRIPT_DIR/swarm-orchestrator.ts"

# ─── Helpers ──────────────────────────────────────────────────────────────────

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

alert() {
  # Send alert via OpenClaw (Telegram/Discord/etc.)
  local msg="$1"
  log "ALERT: $msg"
  openclaw system event --text "🚨 VINCE Swarm: $msg" --mode now 2>/dev/null || true
}

notify() {
  local msg="$1"
  log "NOTIFY: $msg"
  openclaw system event --text "🤖 VINCE Swarm: $msg" --mode now 2>/dev/null || true
}

# Check if jq is available
if ! command -v jq &>/dev/null; then
  log "ERROR: jq not found. Install: brew install jq"
  exit 1
fi

# Check if registry exists
if [[ ! -f "$REGISTRY" ]]; then
  log "Registry not found: $REGISTRY — no tasks to monitor"
  exit 0
fi

# ─── Main Monitor Loop ────────────────────────────────────────────────────────

log "=== VINCE Swarm Monitor ==="

TASKS=$(jq -c '.tasks[]' "$REGISTRY" 2>/dev/null || echo "")
if [[ -z "$TASKS" ]]; then
  log "No tasks in registry"
  exit 0
fi

CHANGES_NEEDED=false

while IFS= read -r TASK; do
  TASK_ID=$(echo "$TASK" | jq -r '.id')
  STATUS=$(echo "$TASK" | jq -r '.status')
  TMUX_SESSION=$(echo "$TASK" | jq -r '.tmuxSession')
  DESCRIPTION=$(echo "$TASK" | jq -r '.description' | head -c 60)
  STARTED_AT=$(echo "$TASK" | jq -r '.startedAt')
  ATTEMPTS=$(echo "$TASK" | jq -r '.attempts')
  PR_NUMBER=$(echo "$TASK" | jq -r '.prNumber // empty')
  BRANCH=$(echo "$TASK" | jq -r '.branch')

  log "Checking task [$STATUS]: $TASK_ID — $DESCRIPTION"

  # Skip already terminal tasks
  if [[ "$STATUS" == "done" || "$STATUS" == "failed" ]]; then
    log "  → Skipping (terminal status: $STATUS)"
    continue
  fi

  # ── 1. tmux Session Check ──────────────────────────────────────────────────
  if [[ "$STATUS" == "running" ]]; then
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
      log "  ✅ tmux session alive: $TMUX_SESSION"

      # Check if stuck (running > threshold)
      STARTED_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${STARTED_AT%.*}" "+%s" 2>/dev/null || \
                      date -d "$STARTED_AT" "+%s" 2>/dev/null || echo "0")
      NOW_EPOCH=$(date "+%s")
      AGE_MINUTES=$(( (NOW_EPOCH - STARTED_EPOCH) / 60 ))

      if (( AGE_MINUTES > STUCK_THRESHOLD_MINUTES )); then
        alert "Task $TASK_ID stuck for ${AGE_MINUTES}min: $DESCRIPTION"
        alert "Check: tmux attach -t $TMUX_SESSION"
      fi
    else
      log "  ❌ tmux session DEAD: $TMUX_SESSION"

      # Check if a PR was created (agent may have finished and exited cleanly)
      if gh pr list --repo "$REPO" --head "$BRANCH" --json number --jq '.[0].number' 2>/dev/null | grep -q '^[0-9]'; then
        FOUND_PR=$(gh pr list --repo "$REPO" --head "$BRANCH" --json number --jq '.[0].number')
        log "  📬 PR found: #$FOUND_PR — agent finished successfully"
        # Update registry via jq
        TMP=$(mktemp)
        jq --arg id "$TASK_ID" --argjson pr "$FOUND_PR" \
          '(.tasks[] | select(.id == $id)) |= . + {status: "pr-open", prNumber: $pr, updatedAt: now | todate}' \
          "$REGISTRY" > "$TMP" && mv "$TMP" "$REGISTRY"
        jq '.stats.totalPRs += 1' "$REGISTRY" > "$TMP" && mv "$TMP" "$REGISTRY"
        notify "PR #$FOUND_PR created for: $DESCRIPTION"
        CHANGES_NEEDED=true
      else
        # Agent died without creating a PR — auto-respawn if within retry limit
        if (( ATTEMPTS < MAX_RETRIES )); then
          log "  🔄 Auto-respawning (attempt $((ATTEMPTS + 1))/$MAX_RETRIES)..."
          cd "$REPO_ROOT"
          $ORCHESTRATOR respawn "$TASK_ID" "Previous attempt exited without creating a PR" 2>&1 | log
          CHANGES_NEEDED=true
        else
          log "  ❌ Max retries reached — marking failed"
          TMP=$(mktemp)
          jq --arg id "$TASK_ID" \
            '(.tasks[] | select(.id == $id)) |= . + {status: "failed", updatedAt: now | todate}' \
            "$REGISTRY" > "$TMP" && mv "$TMP" "$REGISTRY"
          jq '.stats.failed += 1' "$REGISTRY" > "$TMP" && mv "$TMP" "$REGISTRY"
          alert "Task $TASK_ID FAILED after $MAX_RETRIES attempts: $DESCRIPTION"
          CHANGES_NEEDED=true
        fi
      fi
    fi
  fi

  # ── 2. PR Status Check ──────────────────────────────────────────────────────
  if [[ "$STATUS" == "pr-open" || "$STATUS" == "reviewing" ]] && [[ -n "$PR_NUMBER" ]]; then
    PR_STATE=$(gh pr view "$PR_NUMBER" --repo "$REPO" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")
    CI_STATE=$(gh pr checks "$PR_NUMBER" --repo "$REPO" --json state --jq '[.[].state] | unique | join(",")' 2>/dev/null || echo "unknown")

    log "  PR #$PR_NUMBER: state=$PR_STATE CI=$CI_STATE"

    if [[ "$PR_STATE" == "MERGED" ]]; then
      log "  🎉 PR merged! Marking done."
      TMP=$(mktemp)
      jq --arg id "$TASK_ID" \
        '(.tasks[] | select(.id == $id)) |= . + {status: "done", completedAt: now | todate, updatedAt: now | todate}' \
        "$REGISTRY" > "$TMP" && mv "$TMP" "$REGISTRY"
      jq '.stats.completed += 1' "$REGISTRY" > "$TMP" && mv "$TMP" "$REGISTRY"
      notify "PR #$PR_NUMBER merged ✅: $DESCRIPTION"
      CHANGES_NEEDED=true

    elif [[ "$PR_STATE" == "OPEN" ]]; then
      # Check if all AI reviews are posted
      REVIEW_COUNT=$(gh pr view "$PR_NUMBER" --repo "$REPO" --json comments \
        --jq '[.comments[].body | select(contains("vince-swarm-reviewer"))] | length' 2>/dev/null || echo "0")

      if (( REVIEW_COUNT < 3 )); then
        log "  🔍 Only $REVIEW_COUNT/3 AI reviews. Triggering review..."
        cd "$REPO_ROOT"
        $ORCHESTRATOR review "$PR_NUMBER" 2>&1 | log
        CHANGES_NEEDED=true
      else
        log "  ✅ All 3 AI reviews posted"
      fi

      if [[ "$CI_STATE" == *"FAILURE"* ]]; then
        alert "PR #$PR_NUMBER CI failing for: $DESCRIPTION"
      fi
    fi
  fi

done <<< "$TASKS"

if [[ "$CHANGES_NEEDED" == "true" ]]; then
  log "Changes made to registry — verify: cat $REGISTRY | jq '.tasks[] | {id, status, description}'"
fi

log "=== Monitor complete ===\n"
