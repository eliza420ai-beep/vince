import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

/**
 * openclaw-agents guide: orchestrator, 8-pillar flows (Brain → Nerves), HOW-TO-RUN, agent specs.
 * Sourced from: openclaw-agents/README.md, HOW-TO-RUN.md, ARCHITECTURE.md.
 */
const OPENCLAW_AGENTS_GUIDE_MD = `# openclaw-agents guide

## What is openclaw-agents?

openclaw-agents adds **OpenClaw sub-agents** for specialized, isolated research and hosts the **Brain**, **Muscles**, **Bones**, **DNA**, **Soul**, **Eyes**, **Heartbeat**, and **Nerves** flows—operator mapping, AI system architect, codebase intelligence, behavioral architect, personality architect, activation architect, evolution architect, context efficiency architect.

## Orchestrator (research agents)

From repo root:

\`\`\`bash
node openclaw-agents/orchestrator.js alpha SOL BTC
node openclaw-agents/orchestrator.js market ETH
node openclaw-agents/orchestrator.js onchain BONK
node openclaw-agents/orchestrator.js news
node openclaw-agents/orchestrator.js all SOL BTC ETH
\`\`\`

Output is saved to \`openclaw-agents/last-briefing.md\`.

**Agents:**

| Agent | Role |
|-------|------|
| alpha-research | X/Twitter sentiment, KOL tracking, narratives |
| market-data | Prices, volume, funding, OI |
| onchain | Whale flows, smart money, DEX liquidity |
| news | News aggregation, sentiment |

## 8-pillar workspace flows (Brain → Nerves)

Run in order. Each writes or updates files under \`openclaw-agents/workspace/\`.

1. **Brain** (operator mapping, init) — \`bun run openclaw-agents/brain/run-brain.ts\`
2. **Muscles** (system architect) — \`bun run openclaw-agents/muscles/run-muscles.ts\`
3. **Bones** (codebase intelligence) — \`bun run openclaw-agents/bones/run-bones.ts\`
4. **DNA** (behavioral architect) — \`bun run openclaw-agents/dna/run-dna.ts\`
5. **Soul** (personality architect) — \`bun run openclaw-agents/soul/run-soul.ts\`
6. **Eyes** (activation architect) — \`bun run openclaw-agents/eyes/run-eyes.ts\`
7. **Heartbeat** (evolution architect) — \`bun run openclaw-agents/heartbeat/run-heartbeat.ts\`
8. **Nerves** (context efficiency architect) — \`bun run openclaw-agents/nerves/run-nerves.ts\`

See \`openclaw-agents/HOW-TO-RUN.md\` and \`openclaw-agents/ARCHITECTURE.md\` for details.
`;

export const openclawAgentsGuideAction: Action = {
  name: "OPENCLAW_AGENTS_GUIDE",
  similes: ["OPENCLAW_AGENTS", "ORCHESTRATOR_GUIDE", "8_PILLARS", "BRAIN_MUSCLES_BONES"],
  description:
    "Return openclaw-agents guide from ARCHITECTURE.md and HOW-TO-RUN.md (orchestrator, 8-pillar flows Brain→Nerves). Use when the user asks about openclaw agents, orchestrator, brain muscles bones, 8 pillars.",
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text = (message?.content?.text ?? "").toLowerCase() + (state?.text ?? "").toLowerCase();
    return (
      /openclaw\s+agents/i.test(text) ||
      /orchestrator/i.test(text) ||
      /(brain|muscles|bones|8\s*pillars)/i.test(text) ||
      /how\s+to\s+run\s+openclaw/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    if (callback) await callback({ text: OPENCLAW_AGENTS_GUIDE_MD, actions: ["OPENCLAW_AGENTS_GUIDE"] });
    return { success: true, text: OPENCLAW_AGENTS_GUIDE_MD };
  },
  examples: [
    [
      { name: "user", content: { text: "Tell me about openclaw agents" } },
      { name: "assistant", content: { text: OPENCLAW_AGENTS_GUIDE_MD.slice(0, 400) + "...", actions: ["OPENCLAW_AGENTS_GUIDE"] } },
    ],
    [
      { name: "user", content: { text: "How do I run the orchestrator?" } },
      { name: "assistant", content: { text: OPENCLAW_AGENTS_GUIDE_MD.slice(0, 400) + "...", actions: ["OPENCLAW_AGENTS_GUIDE"] } },
    ],
  ],
};
