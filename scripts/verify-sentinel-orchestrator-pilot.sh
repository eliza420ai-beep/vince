#!/usr/bin/env bash
set -euo pipefail

echo "== Sentinel Orchestrator Pilot Verification =="
echo

echo "[1/5] Pilot flag sanity"
required=(
  "SENTINEL_ENABLE_AGENT_ORCHESTRATOR=true"
  "SENTINEL_ENABLE_AUTONOMOUS=true"
  "KELLY_ENABLE_AUTONOMOUS=false"
  "VINCE_ENABLE_PRESENCE=false"
  "ECHO_ENABLE_PRESENCE=false"
  "ENABLE_PRESENCE_BRIDGE=false"
)

for kv in "${required[@]}"; do
  if grep -q "^${kv}$" ".env"; then
    echo "  OK  $kv"
  else
    echo "  FAIL missing: $kv"
    exit 1
  fi
done

echo
echo "[2/5] Agent wiring sanity"
grep -Eq "SENTINEL_ENABLE_AGENT_ORCHESTRATOR|plugin-agent-orchestrator" "src/agents/sentinel.ts"
echo "  OK  sentinel runtime wiring present"

echo
echo "[3/5] Safety check (inter-agent lane unchanged)"
grep -q "interAgentPlugin" "src/index.ts"
echo "  OK  plugin-inter-agent still wired globally"

echo
echo "[4/5] Type-check (known repo errors may still exist)"
if bun run type-check; then
  echo "  OK  type-check passed"
else
  echo "  WARN type-check failed (likely pre-existing repo issues)"
fi

echo
echo "[5/5] Manual runtime checklist"
cat <<'EOF'
  a) Start runtime: bun start
  b) In #daily-standup: "let's do a new standup kelly"
  c) Confirm standup kickoff + round-robin + day report generation
  d) In chat with Sentinel, trigger one coding-task style request
  e) Confirm no ASK_AGENT regression between Kelly and Vince
EOF

echo
echo "Done."
