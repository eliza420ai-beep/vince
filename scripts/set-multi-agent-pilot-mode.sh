#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
APPLY="${2:-}"
ENV_FILE=".env"

if [[ -z "$MODE" ]]; then
  echo "Usage: $0 <baseline|phase2-autonomous> [--apply]"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE in repo root."
  exit 1
fi

case "$MODE" in
  baseline)
    TARGET=(
      "SENTINEL_ENABLE_AGENT_ORCHESTRATOR=true"
      "SENTINEL_ENABLE_AUTONOMOUS=false"
      "KELLY_ENABLE_AUTONOMOUS=false"
      "VINCE_ENABLE_PRESENCE=false"
      "ECHO_ENABLE_PRESENCE=false"
      "ENABLE_PRESENCE_BRIDGE=false"
    )
    ;;
  phase2-autonomous)
    TARGET=(
      "SENTINEL_ENABLE_AGENT_ORCHESTRATOR=true"
      "SENTINEL_ENABLE_AUTONOMOUS=true"
      "KELLY_ENABLE_AUTONOMOUS=true"
      "VINCE_ENABLE_PRESENCE=false"
      "ECHO_ENABLE_PRESENCE=false"
      "ENABLE_PRESENCE_BRIDGE=false"
    )
    ;;
  *)
    echo "Unsupported mode: $MODE"
    echo "Supported modes: baseline, phase2-autonomous"
    exit 1
    ;;
esac

upsert_env_kv() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"

  if grep -q "^${key}=" "$file"; then
    awk -v key="$key" -v value="$value" 'BEGIN{FS=OFS="="} $1==key {$0=key"="value} {print}' "$file" >"$tmp"
  else
    cat "$file" >"$tmp"
    printf "\n%s=%s\n" "$key" "$value" >>"$tmp"
  fi
  mv "$tmp" "$file"
}

echo "== Multi-Agent Pilot Mode =="
echo "Mode: $MODE"
echo "Apply: ${APPLY:-preview}"
echo

for kv in "${TARGET[@]}"; do
  key="${kv%%=*}"
  desired="${kv#*=}"
  current="$(grep -E "^${key}=" "$ENV_FILE" | head -n1 | cut -d'=' -f2- || true)"
  echo "  ${key}: ${current:-<unset>} -> ${desired}"
done

if [[ "$APPLY" != "--apply" ]]; then
  echo
  echo "Preview only. Re-run with --apply to write .env"
  exit 0
fi

for kv in "${TARGET[@]}"; do
  key="${kv%%=*}"
  desired="${kv#*=}"
  upsert_env_kv "$ENV_FILE" "$key" "$desired"
done

echo
echo "Applied ${MODE} to ${ENV_FILE}."
