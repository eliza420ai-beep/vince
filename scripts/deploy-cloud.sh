#!/usr/bin/env bash
# Deploy to Eliza Cloud with required env vars from .env (no keys in the command).
# Usage:
#   bun run deploy:cloud           # project: vince
#   bun run deploy:cloud vince2   # project: vince2 (e.g. when "vince" stack already exists)

set -e
cd "$(dirname "$0")/.."

PROJECT_NAME="${1:-vince}"

if [[ ! -f .env ]]; then
  echo "Error: .env not found. Copy .env.example to .env and fill in values."
  exit 1
fi

# Required for VINCE: LLMs + Postgres
REQUIRED_VARS=(ANTHROPIC_API_KEY OPENAI_API_KEY POSTGRES_URL)
for v in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${v}=.\+" .env 2>/dev/null; then
    echo "Error: .env must set ${v} (required for deploy)."
    exit 1
  fi
done

# Build --env flags from .env (only vars we care about; no comments or empty lines)
get_env() { grep -E "^${1}=" .env | cut -d= -f2- | tr -d '\r'; }

ENV_ANTHROPIC="ANTHROPIC_API_KEY=$(get_env ANTHROPIC_API_KEY)"
ENV_OPENAI="OPENAI_API_KEY=$(get_env OPENAI_API_KEY)"
ENV_POSTGRES="POSTGRES_URL=$(get_env POSTGRES_URL)"

# Optional: uncomment and add get_env if you want these in cloud
# ENV_BIRDEYE="BIRDEYE_API_KEY=$(get_env BIRDEYE_API_KEY)"
# ENV_COINGLASS="COINGLASS_API_KEY=$(get_env COINGLASS_API_KEY)"

echo "Deploying to Eliza Cloud (project: ${PROJECT_NAME}) with POSTGRES_URL and LLM keys from .env..."
elizaos deploy --project-name "$PROJECT_NAME" \
  --env "$ENV_ANTHROPIC" \
  --env "$ENV_OPENAI" \
  --env "$ENV_POSTGRES"

echo "Done. URL: https://44feb837-${PROJECT_NAME}.containers.elizacloud.ai"
