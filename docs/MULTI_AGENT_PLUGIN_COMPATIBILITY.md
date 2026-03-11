# Multi-Agent Plugin Compatibility Matrix

This document is the implementation gate for adopting three external plugins in VINCE:

- `@elizaos/plugin-agent-orchestrator`
- `@elizaos/plugin-autonomous`
- `@elizaos/plugin-presence`

It defines what exists today, where each plugin fits, what can break, and how to roll out safely with kill switches.

## Current Baseline (VINCE)

- Runtime composition is centralized in `src/index.ts` and every runtime gets `plugin-inter-agent`.
- Cross-runtime A2A (`ASK_AGENT`) and standups are owned by `plugin-inter-agent`.
- Discord Option C (one app ID per agent) is required for distinct identities.
- Current standup reliability depends on custom `messageService` behavior in `plugin-inter-agent` docs and implementation.

## Boundaries (Do Not Cross)

- `plugin-inter-agent` remains the owner of cross-runtime routing (`Kelly -> Vince`, `Sentinel -> Solus`, etc.).
- `plugin-agent-orchestrator` is same-runtime coding-task orchestration; it does not replace cross-runtime A2A.
- `plugin-autonomous` is traffic/response/cost orchestration; it must not silently break standup turn-taking.
- `plugin-presence` is context only in phase one (who is around), not auto-reply automation.

## Compatibility Matrix

| Plugin | Primary Value in VINCE | Integration Scope | Key Risk | Mitigation | Rollback Switch |
| --- | --- | --- | --- | --- | --- |
| `plugin-agent-orchestrator` | PTY coding agents + workspace/PR lifecycle for dev-worker flows | Sentinel-only pilot | Misusing orchestrator as A2A replacement | Keep orchestrator local to Sentinel runtime; keep `plugin-inter-agent` unchanged | `SENTINEL_ENABLE_AGENT_ORCHESTRATOR=false` |
| `plugin-autonomous` | Response coordination, brevity in busy rooms, optional budgeting | Kelly + Sentinel pilot | Message service override colliding with standup custom flow | Start with conservative mode (`cooperative`), disable Phase 3, monitor standup behavior and logs | `KELLY_ENABLE_AUTONOMOUS=false`, `SENTINEL_ENABLE_AUTONOMOUS=false` |
| `plugin-presence` | Shared "who is currently around" prompt context | Vince + Echo read-only pilot | Stale/noisy presence context | Use low TTL cache, minimal source registration (agent registry), no actions tied to presence | `VINCE_ENABLE_PRESENCE=false`, `ECHO_ENABLE_PRESENCE=false` |

## Rollout Order

1. **Orchestrator on Sentinel only**
   - Add plugin behind env gate.
   - Validate no impact on standup/A2A paths.
2. **Autonomous on Kelly + Sentinel**
   - Enable coordination and brevity behavior first.
   - Keep full autonomous loop mode disabled unless explicitly enabled.
3. **Presence on Vince + Echo**
   - Register a lightweight source that exposes currently active agents from runtime registry.
   - Use provider context only; do not trigger behavior from presence state.

## Validation Checks Per Phase

- **A2A correctness:** `ASK_AGENT` still routes to target runtime and returns responses.
- **Standup stability:** Kelly kickoff, round-robin, day report generation, and summary push still function.
- **Discord identity:** Option C uniqueness checks still pass.
- **Noise control:** no new ping-pong behavior or responder pile-on.
- **Cost/latency:** compare baseline vs pilot metrics in `docs/standup/standup-metrics.jsonl`.

## Rollback Rules

Immediately disable the plugin flag if any of these occur:

- Standup kickoff fails or round-robin stalls.
- `ASK_AGENT` timeouts rise materially versus baseline.
- Agent response pile-on increases in standup channels.
- Runtime startup becomes unstable (service init errors, repeated restarts).

Keep flags in `.env` so rollback is one change and restart, not a code revert.
