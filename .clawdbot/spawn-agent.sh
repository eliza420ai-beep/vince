#!/usr/bin/env bash
set -euo pipefail

# spawn-agent.sh — Create a worktree, install deps, and launch a coding agent in tmux.
# Usage: ./spawn-agent.sh <task-id> <branch-name> "<description>" [agent] [effort]
#
# Examples:
#   ./spawn-agent.sh fix-echo-ratelimit feat/fix-echo-ratelimit "Fix ECHO X rate-limit handling" codex high
#   ./spawn-agent.sh otaku-quick-action feat/otaku-execute-signal "Add Execute Vince Signal action to Otaku" claude medium

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG="$SCRIPT_DIR/config.json"
TASKS="$SCRIPT_DIR/active-tasks.json"

# --- Args ---
TASK_ID="${1:?Usage: spawn-agent.sh <task-id> <branch-name> \"<description>\" [agent] [effort]}"
BRANCH="${2:?Missing branch name}"
DESCRIPTION="${3:?Missing description}"
AGENT="${4:-codex}"
EFFORT="${5:-high}"

# --- Derived ---
WORKTREE_DIR="$(jq -r '.worktreeDir' "$CONFIG")"
WORKTREE_PATH="$REPO_ROOT/$WORKTREE_DIR/$TASK_ID"
TMUX_SESSION="agent-$TASK_ID"
PKG_MANAGER="$(jq -r '.packageManager' "$CONFIG")"
DEFAULT_BRANCH="$(jq -r '.defaultBranch' "$CONFIG")"
MAX_AGENTS="$(jq -r '.maxConcurrentAgents' "$CONFIG")"

# --- Preflight ---
if ! command -v tmux &>/dev/null; then
  echo "ERROR: tmux is required. Install with: brew install tmux"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required. Install with: brew install jq"
  exit 1
fi

# Check concurrent agent limit
RUNNING=$(jq '[.[] | select(.status == "running")] | length' "$TASKS")
if [ "$RUNNING" -ge "$MAX_AGENTS" ]; then
  echo "ERROR: Already running $RUNNING agents (max: $MAX_AGENTS). Kill one first or raise the limit."
  echo "Running agents:"
  jq -r '.[] | select(.status == "running") | "  - \(.id) [\(.agent)] \(.description)"' "$TASKS"
  exit 1
fi

# Check if task ID already exists and is running
EXISTING=$(jq -r --arg id "$TASK_ID" '.[] | select(.id == $id and .status == "running") | .id' "$TASKS")
if [ -n "$EXISTING" ]; then
  echo "ERROR: Task '$TASK_ID' is already running. Use redirect-agent.sh to change its direction."
  exit 1
fi

echo "=== Spawning agent ==="
echo "  Task:        $TASK_ID"
echo "  Branch:      $BRANCH"
echo "  Agent:       $AGENT"
echo "  Effort:      $EFFORT"
echo "  Description: $DESCRIPTION"
echo ""

# --- Create worktree ---
echo "[1/4] Creating worktree at $WORKTREE_PATH ..."
mkdir -p "$(dirname "$WORKTREE_PATH")"

if [ -d "$WORKTREE_PATH" ]; then
  echo "  Worktree already exists, reusing..."
else
  cd "$REPO_ROOT"
  git worktree add "$WORKTREE_PATH" -b "$BRANCH" "origin/$DEFAULT_BRANCH" 2>/dev/null || \
  git worktree add "$WORKTREE_PATH" "$BRANCH" 2>/dev/null || \
  git worktree add "$WORKTREE_PATH" -b "$BRANCH" "$DEFAULT_BRANCH"
fi

# --- Install deps ---
echo "[2/4] Installing dependencies with $PKG_MANAGER ..."
cd "$WORKTREE_PATH"
$PKG_MANAGER install --frozen-lockfile 2>/dev/null || $PKG_MANAGER install

# --- Build prompt file ---
echo "[3/4] Building agent prompt ..."
PROMPT_FILE="$SCRIPT_DIR/prompts/$TASK_ID.md"
mkdir -p "$SCRIPT_DIR/prompts"

cat > "$PROMPT_FILE" << PROMPT_EOF
# Task: $DESCRIPTION

## Context
- Repository: VINCE (ElizaOS multi-agent system)
- Branch: $BRANCH
- Package manager: $PKG_MANAGER
- Working directory: $WORKTREE_PATH

## Instructions
$DESCRIPTION

## Definition of Done
- [ ] Implementation complete and type-checks (\`bun run type-check\` or \`npx tsc --noEmit\`)
- [ ] Any new/modified actions have proper validate + handler + examples
- [ ] No lint errors introduced
- [ ] Create a PR to \`$DEFAULT_BRANCH\` when done using \`gh pr create\`
- [ ] PR title should be descriptive (not just the branch name)
- [ ] Include a summary of changes in the PR body

## Key Files
- Agent definitions: src/agents/*.ts
- Plugins: src/plugins/plugin-*/
- Knowledge: knowledge/
- Docs: docs/

## Brand Voice Rules
- Benefit-led (Apple-style), confident (Porsche OG), zero AI-slop
- See knowledge/teammate/NO-AI-SLOP.md for banned phrases
PROMPT_EOF

echo "  Prompt written to $PROMPT_FILE"

# --- Launch in tmux ---
echo "[4/4] Launching $AGENT in tmux session '$TMUX_SESSION' ..."

tmux new-session -d -s "$TMUX_SESSION" -c "$WORKTREE_PATH" \
  "$SCRIPT_DIR/run-agent.sh '$TASK_ID' '$AGENT' '$EFFORT' '$PROMPT_FILE'"

# --- Update task registry ---
TIMESTAMP=$(date +%s)000
TEMP_TASKS=$(mktemp)
jq --arg id "$TASK_ID" \
   --arg session "$TMUX_SESSION" \
   --arg agent "$AGENT" \
   --arg desc "$DESCRIPTION" \
   --arg worktree "$TASK_ID" \
   --arg branch "$BRANCH" \
   --arg started "$TIMESTAMP" \
   '. += [{
     "id": $id,
     "tmuxSession": $session,
     "agent": $agent,
     "description": $desc,
     "repo": "vince",
     "worktree": $worktree,
     "branch": $branch,
     "startedAt": ($started | tonumber),
     "status": "running",
     "respawnCount": 0,
     "notifyOnComplete": true
   }]' "$TASKS" > "$TEMP_TASKS"
mv "$TEMP_TASKS" "$TASKS"

echo ""
echo "=== Agent spawned ==="
echo "  tmux attach: tmux attach -t $TMUX_SESSION"
echo "  Redirect:    .clawdbot/redirect-agent.sh $TASK_ID \"New instructions here\""
echo "  Monitor:     .clawdbot/list-agents.sh"
echo "  Kill:        tmux kill-session -t $TMUX_SESSION"
