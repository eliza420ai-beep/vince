#!/usr/bin/env bash
# spawn-task.sh — Quick CLI wrapper for spawning VINCE swarm tasks
#
# Usage:
#   ./spawn-task.sh "Add Execute Vince Signal quick action to Otaku"
#   ./spawn-task.sh "Fix Kelly flywheel score calculation" --codex
#   ./spawn-task.sh "Update Leaderboard UI to show regime profile" --ui
#   ./spawn-task.sh "Add Monte Carlo war room to Oracle" --codex --ui
#
# Flags:
#   --codex    Use Codex agent instead of Claude (default)
#   --ui       Mark task as having UI changes (requires screenshots in PR)
#   --dry-run  Print what would be spawned without actually spawning
#
# Setup cron monitor (run once):
#   echo "*/10 * * * * $(pwd)/openclaw-agents/swarm/monitor.sh >> /tmp/vince-swarm-monitor.log 2>&1" | crontab -

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ORCHESTRATOR="$SCRIPT_DIR/swarm-orchestrator.ts"

# ─── Parse Args ───────────────────────────────────────────────────────────────

DESCRIPTION=""
AGENT_FLAG=""
UI_FLAG=""
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --codex) AGENT_FLAG="--codex" ;;
    --ui)    UI_FLAG="--ui" ;;
    --dry-run) DRY_RUN=true ;;
    -*) echo "Unknown flag: $arg"; exit 1 ;;
    *)  DESCRIPTION="$arg" ;;
  esac
done

if [[ -z "$DESCRIPTION" ]]; then
  cat <<'EOF'
spawn-task.sh — VINCE Swarm Task Spawner

Usage:
  ./spawn-task.sh "description" [--codex] [--ui] [--dry-run]

Examples:
  ./spawn-task.sh "Add Execute Vince Signal quick action to Otaku"
  ./spawn-task.sh "Fix Kelly flywheel score when no trades exist" --codex
  ./spawn-task.sh "Update Leaderboard trading bot tab with regime" --ui

Flags:
  --codex     Use Codex agent (great for logic/edge cases)
  --ui        Task changes UI (screenshots required in PR)
  --dry-run   Print what would run without spawning

Setup cron (one-time):
  echo "*/10 * * * * $(realpath openclaw-agents/swarm/monitor.sh) >> /tmp/vince-swarm-monitor.log 2>&1" | crontab -

Monitor live:
  tail -f /tmp/vince-swarm-monitor.log

Attach to running agent:
  tmux attach -t vince-<task-id>
EOF
  exit 0
fi

# ─── Dry Run ──────────────────────────────────────────────────────────────────

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN — would spawn:"
  echo "  Description: $DESCRIPTION"
  echo "  Agent: ${AGENT_FLAG:-claude (default)}"
  echo "  UI changes: ${UI_FLAG:-no}"
  exit 0
fi

# ─── Preflight ────────────────────────────────────────────────────────────────

# Check we're in repo root
if [[ ! -f "$REPO_ROOT/package.json" ]]; then
  echo "❌ Not in VINCE repo root. Run from: $REPO_ROOT"
  exit 1
fi

# Check OpenClaw gateway
if ! openclaw gateway status 2>/dev/null | grep -q "running"; then
  echo "⚠️  OpenClaw gateway not running. Starting..."
  openclaw gateway start
  sleep 2
fi

# Check tmux
if ! command -v tmux &>/dev/null; then
  echo "❌ tmux not found. Install: brew install tmux"
  exit 1
fi

# ─── Spawn ────────────────────────────────────────────────────────────────────

echo "🚀 Spawning VINCE swarm task..."
echo "   Description: $DESCRIPTION"
echo "   Agent: ${AGENT_FLAG:-claude}"
echo ""

cd "$REPO_ROOT"
bun run "$ORCHESTRATOR" spawn "$DESCRIPTION" $AGENT_FLAG $UI_FLAG

echo ""
echo "📋 Monitor all tasks: bun run $ORCHESTRATOR status"
echo "📋 Watch monitor log: tail -f /tmp/vince-swarm-monitor.log"
