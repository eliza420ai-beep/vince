# plugin-openclaw

**AI-obsessed plugin with OpenClaw as core expertise.** AI 2027, AGI timelines, research agents, alignment—plus setup, gateway status, openclaw-agents, tips, use cases, workspace sync. The canonical ElizaOS bridge to OpenClaw.

## AI 2027

[AI 2027](https://ai-2027.com/) is a scenario-type prediction of superhuman AI impact by 2027. Authors: Daniel Kokotajlo, Scott Alexander, Thomas Larsen, Eli Lifland, Romeo Dean. Key themes: research agents that "scour the Internet to answer your question," AGI timelines, takeoff, alignment, OpenBrain, Agent-1→4. OpenClaw + openclaw-agents enable research agents today. Ask Clawterm "What's AI 2027?" or "Research agents?"

## What is OpenClaw?

OpenClaw is a **self-hosted gateway** that connects chat apps (WhatsApp, Telegram, Discord, Slack, iMessage, and more) to AI agents. One Gateway process (default port **18789**) is the control plane for sessions, channels, and tools. Formerly known as ClawdBot and MoltBot. Docs: [docs.openclaw.ai](https://docs.openclaw.ai) · [Getting started](https://docs.openclaw.ai/start/getting-started).

**First use case:** Fork and improve the VINCE repo ([eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince)). For the story behind the names and the original vision (ClawdBot as local bio-digital hub), see [OpenClaw vision and lore](../../../docs/OPENCLAW_VISION.md).

## What this plugin does

- **Data integrity** — All responses sourced from actions; no hallucination.
1. **AI 2027** — Scenario summary (superhuman AI, AGI timelines, OpenBrain, Agent progression, alignment, takeoff).
2. **Research agents** — AI 2027 framing + how OpenClaw + openclaw-agents enable them.
3. **Setup guide** — Ask for "OpenClaw setup" or "OpenClaw setup guide" for step-by-step install.
4. **Security guide** — Ask for "OpenClaw security" for prompt injection hardening, ACIP/PromptGuard/SkillGuard, MEMORY.md protection.
5. **Gateway status** — When `OPENCLAW_GATEWAY_URL` is set, ask for "gateway status" to check health.
6. **OpenClaw-agents guide** — Orchestrator, 8 pillars, HOW-TO-RUN.
7. **Tips** — Fresh Mac setup, tips.
8. **Use cases** — Research agents (AI 2027 style), fork VINCE, bio-digital hub.
9. **Workspace sync** — Sync workspace files between repo and OpenClaw.

Clawterm is the sole agent that loads this plugin. AI-obsessed, OpenClaw expert.

## Quick start (OpenClaw)

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw gateway --port 18789
openclaw dashboard
```

See [Onboarding overview](https://docs.openclaw.ai/start/onboarding-overview) and [CLI wizard](https://docs.openclaw.ai/start/wizard).

## Environment

| Variable | Description |
|----------|-------------|
| `OPENCLAW_GATEWAY_URL` | Gateway base URL (e.g. `http://127.0.0.1:18789`). When set, gateway status and health are available. |
| `OPENCLAW_GATEWAY_TOKEN` | Optional. Auth token if your Gateway uses `gateway.auth.token`. |

## Security

- **Bind to loopback** — Use `bind=loopback` (127.0.0.1) so only the same machine can reach the Gateway.
- **Set auth** — Configure `gateway.auth.token` or `OPENCLAW_GATEWAY_TOKEN`.
- **Do not expose** — Do not expose the Gateway to the internet without a proper proxy and auth.
- **Prompt injection** — ZeroLeaks: 91% success rate. Install ACIP, PromptGuard, SkillGuard. Full guide: [Ethereum Foundation dAI blog](https://ai.ethereum.foundation/blog/openclaw-security-guide).

Full guides: [openclaw-security.md](../../knowledge/setup-guides/openclaw-security.md), [clawd-security.md](../../knowledge/setup-guides/clawd-security.md). Runbook: [Gateway](https://docs.openclaw.ai/gateway).

## References

- **Official:** [Channels](https://docs.openclaw.ai/channels) · [Architecture](https://docs.openclaw.ai/concepts/architecture) · [Tools](https://docs.openclaw.ai/tools) · [Gateway](https://docs.openclaw.ai/gateway) · [CLI](https://docs.openclaw.ai/cli)
- **ElizaOS:** [openclaw-adapter](https://github.com/elizaOS/openclaw-adapter)
- **This repo:** [openclaw-agents/](../../openclaw-agents/README.md) (orchestrator, workspace sync, HOW-TO-RUN)

See also [OPENCLAW.md](OPENCLAW.md) in this directory for a longer reference.

## Actions

| Action | Description |
|--------|-------------|
| OPENCLAW_AI_2027 | AI 2027 scenario summary (AGI timelines, OpenBrain, alignment, takeoff) |
| OPENCLAW_AI_RESEARCH_AGENTS | Research agents (AI 2027 framing), how OpenClaw enables them |
| OPENCLAW_SETUP_GUIDE | Step-by-step install and configuration |
| OPENCLAW_SECURITY_GUIDE | Security: prompt injection, ACIP/PromptGuard/SkillGuard, MEMORY.md, EF dAI guide |
| OPENCLAW_GATEWAY_STATUS | Gateway health and status (when URL set) |
| OPENCLAW_AGENTS_GUIDE | Orchestrator, 8 pillars, HOW-TO-RUN |
| OPENCLAW_TIPS | Fresh Mac setup, tips |
| OPENCLAW_USE_CASES | Research agents (AI 2027 style), fork VINCE, bio-digital hub |
| OPENCLAW_WORKSPACE_SYNC | Sync workspace files |

## Files

```
src/plugins/plugin-openclaw/
├── src/
│   ├── index.ts
│   ├── actions/
│   │   ├── ai2027.action.ts
│   │   ├── aiResearchAgents.action.ts
│   │   ├── setupGuide.action.ts
│   │   ├── openclawSecurityGuide.action.ts
│   │   ├── gatewayStatus.action.ts
│   │   ├── openclawAgentsGuide.action.ts
│   │   ├── openclawTips.action.ts
│   │   ├── openclawUseCases.action.ts
│   │   └── openclawWorkspaceSync.action.ts
│   ├── providers/
│   │   └── openclawContext.provider.ts
│   └── services/
│       ├── index.ts
│       └── gatewayClient.service.ts
├── matcher.ts
├── README.md
└── OPENCLAW.md
```

## Stats

- **9 actions**
- **1 service** (gatewayClient)
- **1 provider** (openclawContext)
