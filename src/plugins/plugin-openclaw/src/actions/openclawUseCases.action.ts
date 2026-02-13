import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

/**
 * Best use cases for OpenClaw (fork VINCE, bio-digital hub, vision).
 * Sourced from: docs/OPENCLAW_VISION.md, plugin-openclaw README.
 */
const OPENCLAW_USE_CASES_MD = `# OpenClaw best use cases

## 1. Run research agents (AI 2027 style)

AI 2027 describes research agents that "scour the Internet to answer your question." OpenClaw + openclaw-agents enable that today: Gateway connects chat apps to AI agents; orchestrator runs alpha, market, onchain, news. \`node openclaw-agents/orchestrator.js all SOL BTC\` — output to last-briefing.md.

## 2. Fork and improve the VINCE repo (AI-powered multi-agent platform)

Fork [eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince) — 420+ commits. Hybrid mode (VINCE + OpenClaw sub-agents), plugin-openclaw (optional Gateway), openclaw-agents (orchestrator, Brain/Muscles/Bones/…).

**Fresh MacBook Pro workflow:** Clone fork, \`bun install && bun run build && bun start\`. Run \`openclaw onboard --install-daemon\`, then \`openclaw gateway start\`. Use orchestrator for research: \`node openclaw-agents/orchestrator.js all SOL BTC\`. Sync workspace files so VINCE and OpenClaw share the same operator profile.

## 3. Bio-digital optimization hub (ClawdBot vision)

OpenClaw evolved from **ClawdBot** / **MoltBot**: a Claude-powered assistant running 24/7 on a Mac Mini with full local tool access—browser, file system, screen capture, cron, voice. It bridges what ElizaOS agents never touch:

- **Smart home** — Hue, EightSleep, Home Assistant
- **Music & audio** — Spotify, Whisper, system audio
- **Biometrics** — Oura Ring, readiness, sleep

ClawdBot optimizes the human: dims lights when HRV is low, cools the bed before crash time, queues alpha-hunting playlists. All of it flows back into knowledge. See \`docs/OPENCLAW_VISION.md\` for the full Jan 2024 vision.

## 4. Multi-channel messaging gateway

One Gateway connects WhatsApp, Telegram, Discord, Slack, Signal, iMessage, WebChat. Control-plane clients (CLI, web UI, macOS app) connect over WebSocket. Sessions are isolated; parallel execution; clean task boundaries. Best for: deep-dive research, cost control, session-scoped memory.

## 5. ElizaOS ↔ OpenClaw interop

The **openclaw-adapter** runs Eliza plugins (e.g. plugin-evm, plugin-solana) *inside* an OpenClaw agent. Same plugin codebase powers both Eliza (VINCE) and OpenClaw. Use when an OpenClaw-based agent needs wallet or connector logic. See \`knowledge/sentinel-docs/OPENCLAW_ADAPTER.md\`.
`;

export const openclawUseCasesAction: Action = {
  name: "OPENCLAW_USE_CASES",
  similes: ["OPENCLAW_USE_CASES", "BEST_FOR", "WHAT_CAN_OPENCLAW"],
  description:
    "Return OpenClaw use cases from OPENCLAW_VISION.md and plugin README (fork VINCE, bio-digital hub, multi-channel). Use when the user asks use case, best for, what can OpenClaw do.",
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text = (message?.content?.text ?? "").toLowerCase() + (state?.text ?? "").toLowerCase();
    return (
      /openclaw\s+use\s+case/i.test(text) ||
      /(best|good)\s+for\s+openclaw/i.test(text) ||
      /what\s+can\s+openclaw/i.test(text) ||
      /use\s+case/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    if (callback) await callback({ text: OPENCLAW_USE_CASES_MD, actions: ["OPENCLAW_USE_CASES"] });
    return { success: true, text: OPENCLAW_USE_CASES_MD };
  },
  examples: [
    [
      { name: "user", content: { text: "What are OpenClaw use cases?" } },
      { name: "assistant", content: { text: OPENCLAW_USE_CASES_MD.slice(0, 400) + "...", actions: ["OPENCLAW_USE_CASES"] } },
    ],
    [
      { name: "user", content: { text: "What is OpenClaw best for?" } },
      { name: "assistant", content: { text: OPENCLAW_USE_CASES_MD.slice(0, 400) + "...", actions: ["OPENCLAW_USE_CASES"] } },
    ],
  ],
};
