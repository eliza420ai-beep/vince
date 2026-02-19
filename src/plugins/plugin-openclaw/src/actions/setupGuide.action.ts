import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

/**
 * Curated OpenClaw setup guide (single source of truth for the action).
 * Sourced from: docs.openclaw.ai, OPENCLAW_ADAPTER.md, HOW-TO-RUN, clawd-security, Sentinel openclawKnowledge.
 */
const OPENCLAW_SETUP_GUIDE_MD = `# OpenClaw setup guide

## What is OpenClaw?

OpenClaw is a **self-hosted gateway** that connects chat apps (WhatsApp, Telegram, Discord, Slack, iMessage, and more) to AI agents. One Gateway process (default port **18789**) is the control plane. Formerly ClawdBot and MoltBot.

- **Docs:** https://docs.openclaw.ai  
- **Getting started:** https://docs.openclaw.ai/start/getting-started  
- **Onboarding:** https://docs.openclaw.ai/start/onboarding-overview  
- **Wizard:** https://docs.openclaw.ai/start/wizard  
- **Gateway runbook:** https://docs.openclaw.ai/gateway  
- **CLI:** https://docs.openclaw.ai/cli  
- **Releases:** https://github.com/openclaw/openclaw/releases (latest version, changelog)
- **ClawIndex:** https://clawindex.org/ (ecosystem directory, verified projects, integrations)
- **steipete (OpenClaw lead):** https://github.com/steipete

## Quick start

1. **Install**
   \`\`\`bash
   npm install -g openclaw@latest
   \`\`\`

2. **Onboard** (one-time setup, install daemon if you want)
   \`\`\`bash
   openclaw onboard --install-daemon
   \`\`\`

3. **Start the Gateway** (required for CLI agent runs and for this plugin’s Gateway status/research)
   \`\`\`bash
   openclaw gateway --port 18789
   # or: openclaw gateway start
   \`\`\`

4. **Optional: Dashboard**
   \`\`\`bash
   openclaw dashboard
   \`\`\`

## Security (important)

- **Bind to loopback** — Use \`bind=loopback\` (127.0.0.1) so only the same machine can reach the Gateway. In config: \`gateway.bind = "loopback"\`, \`gateway.port = 18789\`.
- **Set auth** — Set \`gateway.auth.token\` or \`OPENCLAW_GATEWAY_TOKEN\` so the Gateway and any client (including this plugin) use a shared secret.
- **Do not expose** — Do not expose the Gateway to the internet without a proper proxy and auth.
- **Prompt injection** — ZeroLeaks: 91% success rate. Install ACIP, PromptGuard, SkillGuard. Full guide: https://ai.ethereum.foundation/blog/openclaw-security-guide
- **MEMORY.md and credentials** — \`~/.openclaw/workspace/MEMORY.md\` accumulates personal data. Protect \`~/.openclaw\` with \`chmod 700\`. Use a credential vault (1Password, pass) for API keys.
- **Operational** — Never paste secrets into chat. Use CRITICAL in SOUL.md for hard rules. Run \`openclaw security audit --deep\` regularly.

Full guides in this repo: \`knowledge/setup-guides/openclaw-security.md\`, \`knowledge/setup-guides/clawd-security.md\`.

## This plugin (plugin-openclaw)

- **In-process research (default):** No Gateway required. Research runs inside ElizaOS (LLM + Hyperliquid, etc.). Set nothing.
- **Gateway status / optional research via Gateway:** Set \`OPENCLAW_GATEWAY_URL\` (e.g. \`http://127.0.0.1:18789\`) and optionally \`OPENCLAW_GATEWAY_TOKEN\`. Ask for “gateway status” or “OpenClaw status” to check health. Optionally set \`OPENCLAW_RESEARCH_VIA_GATEWAY=true\` to run research via the Gateway instead of in-process.

## openclaw-agents (this repo)

- **Orchestrator:** From repo root: \`node openclaw-agents/orchestrator.js alpha SOL BTC\`, \`market\`, \`onchain\`, \`news\`, or \`all\`. Output is saved to \`openclaw-agents/last-briefing.md\`.
- **Workspace flows:** Brain → Muscles → Bones → DNA → Soul → Eyes → Heartbeat → Nerves. See \`openclaw-agents/HOW-TO-RUN.md\` and \`openclaw-agents/ARCHITECTURE.md\`.
- **Last-briefing in VINCE:** Set \`OPENCLAW_USE_LAST_BRIEFING=true\` and optionally \`OPENCLAW_LAST_BRIEFING_MAX_AGE_MS=3600000\` so “all” research can serve the last orchestrator briefing when fresh.

## ElizaOS ↔ OpenClaw (openclaw-adapter)

To run Eliza plugins *inside* an OpenClaw agent (e.g. wallet, Solana, EVM):

- **Adapter repo:** https://github.com/elizaOS/openclaw-adapter  
- **In this repo:** \`knowledge/sentinel-docs/OPENCLAW_ADAPTER.md\`  
- **Quick:** \`npm install @elizaos/openclaw-adapter @elizaos/plugin-evm\` and add the adapter to your OpenClaw config with \`plugins\` and \`settings\`.
`;

export const openclawSetupGuideAction: Action = {
  name: "OPENCLAW_SETUP_GUIDE",
  similes: [
    "OPENCLAW_GUIDE",
    "OPENCLAW_SETUP",
    "OPENCLAW_INSTALL",
    "GATEWAY_SETUP",
  ],
  description:
    "Return OpenClaw setup guide from docs.openclaw.ai and OPENCLAW_ADAPTER.md (install, onboard, gateway, security, plugin env). Use when the user asks how to set up OpenClaw, install OpenClaw, or configure the gateway.",
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text =
      (message?.content?.text ?? "").toLowerCase() +
      (state?.text ?? "").toLowerCase();
    return (
      /openclaw\s+setup/i.test(text) ||
      /(how\s+to\s+)?(set\s+up|install|configure)\s+openclaw/i.test(text) ||
      /install\s+openclaw/i.test(text) ||
      /gateway\s+setup/i.test(text) ||
      /claw\s+setup/i.test(text) ||
      /openclaw\s+(guide|install|config)/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const intro = "Here's how to get OpenClaw running—";
    const out = intro + "\n\n" + OPENCLAW_SETUP_GUIDE_MD;
    if (callback)
      await callback({ text: out, actions: ["OPENCLAW_SETUP_GUIDE"] });
    return { success: true, text: out };
  },
  examples: [
    [
      { name: "{{user}}", content: { text: "How do I set up OpenClaw?" } },
      {
        name: "{{agent}}",
        content: {
          text: OPENCLAW_SETUP_GUIDE_MD.slice(0, 500) + "...",
          actions: ["OPENCLAW_SETUP_GUIDE"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "OpenClaw setup guide" } },
      {
        name: "{{agent}}",
        content: {
          text: OPENCLAW_SETUP_GUIDE_MD.slice(0, 500) + "...",
          actions: ["OPENCLAW_SETUP_GUIDE"],
        },
      },
    ],
  ],
};
