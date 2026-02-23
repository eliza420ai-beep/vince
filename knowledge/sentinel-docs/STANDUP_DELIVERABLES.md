# Standup Deliverables (Code/Features)

When standup action items are parsed as **build** (e.g. "build feature X", "write a script for Y"), the worker runs code delivery instead of sending a chat reminder. **North-star deliverables** (essay, tweets, x_article, trades, good_life) are generated in-VINCE and written to subdirs under the same deliverables directory — see [NORTH_STAR_DELIVERABLES.md](NORTH_STAR_DELIVERABLES.md). This doc describes the contract, env vars, and safety.

## Contract: Milaidy Gateway (optional)

If you run [Milaidy](https://github.com/milady-ai/milaidy) (ElizaOS-based personal AI) and want standup build items to be executed there:

- **Endpoint:** `POST {MILAIDY_GATEWAY_URL}/api/standup-action`
- **Request body:** `{ "description": "string", "assigneeAgentName": "string (optional)", "source": "vince-standup" }`
- **Response (success):** Optional `deliverablePath` (file path) and/or `message` (short human-readable string). Optional `accepted: true` if the job was accepted but path not yet available.
- **Response (not implemented):** 404 or non-JSON — VINCE falls back to in-VINCE code gen when `STANDUP_BUILD_FALLBACK_TO_VINCE` is not `false`.

VINCE does not implement this endpoint; it only calls it. If Milaidy (or any compatible service) exposes it, the worker will POST there first. No change to the Milaidy repo is required for VINCE to work; fallback runs when the Gateway is unset or the request fails.

## Env vars

| Variable                          | Purpose                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `MILAIDY_GATEWAY_URL`             | Base URL of Milaidy Gateway (e.g. `http://localhost:18789`). When set, build items are POSTed here first.         |
| `STANDUP_DELIVERABLES_DIR`        | Directory for fallback-generated files (default: `./docs/standup`). Relative paths are resolved from process cwd. |
| `STANDUP_BUILD_FALLBACK_TO_VINCE` | When `false`, disable in-VINCE code gen; build items only go to Milaidy. Default: `true`.                         |

## Fallback: in-VINCE code generation

When Milaidy is not used or returns an error:

1. The worker calls the runtime LLM with a prompt to produce a single TypeScript/JavaScript file.
2. The result is written to `STANDUP_DELIVERABLES_DIR` with a sanitized filename (date, assignee, description slug).
3. An entry is appended to `manifest.md` in the same directory (date, assignee, description, filename).
4. A notification is pushed to the same channels as the standup summary (e.g. "Standup deliverable: … → `path` (from AgentName)").

## Manifest format

`manifest.md` in the deliverables directory is a markdown table:

| Date       | Assignee | Description              | File                                           |
| ---------- | -------- | ------------------------ | ---------------------------------------------- |
| 2026-02-10 | Sentinel | add a small script to... | `2026-02-10-sentinel-add-a-small-script-to.ts` |

## Agent suggestions

If the standup parse returns `suggestions` (agent-proposed improvements: new topics, tools, or process changes), they are appended to `docs/standup/agent-suggestions.md` (or `STANDUP_DELIVERABLES_DIR/agent-suggestions.md`) with date and list. No automatic application; human reviews and can adopt.

## Safety

- Generated code is **written to disk only**. It is **not executed** automatically. Review and run at your discretion.
- Deliverables are stored under a dedicated directory; do not set `STANDUP_DELIVERABLES_DIR` to a system or repo-critical path.
