#!/usr/bin/env bash
# Verify public health vs /api gating against a running VINCE / ElizaOS server.
# Usage:
#   ./scripts/verify-api-gating.sh http://127.0.0.1:3000
#   ELIZA_SERVER_AUTH_TOKEN=secret ./scripts/verify-api-gating.sh https://staging.example.com
set -euo pipefail

BASE="${1:-http://127.0.0.1:3000}"
BASE="${BASE%/}"

echo "Base: $BASE"

code="$(curl -sS -o /tmp/vince-hz.json -w "%{http_code}" "$BASE/healthz")"
echo "GET /healthz -> HTTP $code"
test "$code" = "200" || { echo "FAIL: expected 200 from /healthz"; exit 1; }
grep -q '"status"' /tmp/vince-hz.json || { echo "FAIL: /healthz body"; exit 1; }

if [[ -n "${ELIZA_SERVER_AUTH_TOKEN:-}" ]]; then
  code_no="$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/agents")"
  echo "GET /api/agents (no X-API-KEY) -> HTTP $code_no"
  test "$code_no" = "401" || { echo "FAIL: expected 401 without API key"; exit 1; }

  code_ok="$(curl -sS -o /tmp/vince-agents.json -w "%{http_code}" \
    -H "X-API-KEY: ${ELIZA_SERVER_AUTH_TOKEN}" "$BASE/api/agents")"
  echo "GET /api/agents (with X-API-KEY) -> HTTP $code_ok"
  test "$code_ok" = "200" || { echo "FAIL: expected 200 with valid API key"; exit 1; }
else
  echo "ELIZA_SERVER_AUTH_TOKEN unset — skipping /api 401/200 checks (set it to verify gating)."
fi

echo "OK"
