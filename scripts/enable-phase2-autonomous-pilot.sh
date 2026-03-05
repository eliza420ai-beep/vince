#!/usr/bin/env bash
set -euo pipefail

exec ./scripts/set-multi-agent-pilot-mode.sh phase2-autonomous "${1:-}"
