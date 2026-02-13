import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

/**
 * OpenClaw tips, fresh MacBook Pro setup, best skills from openclaw-agents.
 * Sourced from: docs.openclaw.ai, setupGuide, Brain/Muscles/Bones READMEs.
 */
const OPENCLAW_TIPS_MD = `# OpenClaw tips and tricks

## Fresh MacBook Pro setup

1. **Node 22+** — \`node --version\` (check).
2. **Install OpenClaw** — \`curl -fsSL https://openclaw.ai/install.sh | bash\` or \`npm install -g openclaw@latest\`.
3. **Onboard** — \`openclaw onboard --install-daemon\` (configures auth, gateway, optional channels).
4. **Gateway** — \`openclaw gateway --port 18789\` or \`openclaw gateway start\`.
5. **Dashboard** — \`openclaw dashboard\` (Control UI in browser).
6. **Forked repo** — Clone VINCE, run \`bun install && bun run build && bun start\`. Set \`OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789\` if using Gateway.

## Best skills from openclaw-agents

- **Brain first** — Run Brain before any other pillar. It maps the operator and produces USER, SOUL, IDENTITY, initial AGENTS/TOOLS/MEMORY/HEARTBEAT.
- **Order matters** — Brain → Muscles → Bones → DNA → Soul → Eyes → Heartbeat → Nerves. Each builds on the previous.
- **Workspace sync** — After each run, copy \`openclaw-agents/workspace/*.md\` to \`knowledge/teammate/\` for VINCE and to \`~/.openclaw/workspace/\` for OpenClaw CLI.
- **Orchestrator vs plugin** — Use orchestrator for CLI research (\`node openclaw-agents/orchestrator.js all SOL BTC\`). Use plugin-openclaw in VINCE for in-app research. Set \`OPENCLAW_USE_LAST_BRIEFING=true\` to serve last-briefing when fresh.
- **Bind loopback** — Never expose Gateway. Use \`bind=loopback\` (127.0.0.1).
`;

export const openclawTipsAction: Action = {
  name: "OPENCLAW_TIPS",
  similes: ["OPENCLAW_TIPS", "OPENCLAW_TRICKS", "FRESH_MAC_SETUP", "BEST_SKILLS"],
  description:
    "Return OpenClaw tips from docs.openclaw.ai and openclaw-agents READMEs (fresh Mac setup, best skills). Use when the user asks for tips, tricks, fresh mac setup, best skills.",
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text = (message?.content?.text ?? "").toLowerCase() + (state?.text ?? "").toLowerCase();
    return (
      /openclaw\s+(tips|tricks)/i.test(text) ||
      /tips\s+(for\s+)?openclaw/i.test(text) ||
      /fresh\s+(mac|macbook)/i.test(text) ||
      /best\s+skills/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    if (callback) await callback({ text: OPENCLAW_TIPS_MD, actions: ["OPENCLAW_TIPS"] });
    return { success: true, text: OPENCLAW_TIPS_MD };
  },
  examples: [
    [
      { name: "user", content: { text: "Tips for OpenClaw?" } },
      { name: "assistant", content: { text: OPENCLAW_TIPS_MD.slice(0, 400) + "...", actions: ["OPENCLAW_TIPS"] } },
    ],
    [
      { name: "user", content: { text: "Fresh MacBook Pro setup for OpenClaw" } },
      { name: "assistant", content: { text: OPENCLAW_TIPS_MD.slice(0, 400) + "...", actions: ["OPENCLAW_TIPS"] } },
    ],
  ],
};
