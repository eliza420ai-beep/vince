#!/usr/bin/env bash
set -euo pipefail

exec ./scripts/set-multi-agent-pilot-mode.sh baseline "${1:-}"
