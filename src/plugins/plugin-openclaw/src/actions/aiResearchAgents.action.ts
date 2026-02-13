import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

/**
 * Research agents — AI 2027 framing + OpenClaw as the practical bridge.
 */
const AI_RESEARCH_AGENTS_MD = `# AI Research Agents

## AI 2027 framing

> "Research agents spend half an hour scouring the Internet to answer your question."

AI 2027 ([ai-2027.com](https://ai-2027.com/)) describes a near future where coding agents and research agents are routine: they take instructions, browse the web, run experiments, and return answers. In the scenario, they start unreliable but improve rapidly—eventually becoming superhuman coders and AI researchers.

## OpenClaw as the bridge

**OpenClaw** is the gateway that connects chat apps (WhatsApp, Telegram, Discord, Slack, iMessage, WebChat) to AI agents. One Gateway process, one control plane.

**openclaw-agents** (orchestrator + 8 pillars: Brain, Muscles, Bones, DNA, Soul, Eyes, Heartbeat, Nerves) runs research today:

\`\`\`bash
node openclaw-agents/orchestrator.js alpha SOL BTC
node openclaw-agents/orchestrator.js market
node openclaw-agents/orchestrator.js onchain
node openclaw-agents/orchestrator.js news
node openclaw-agents/orchestrator.js all SOL BTC
\`\`\`

Output saved to \`openclaw-agents/last-briefing.md\`. You get alpha, market, onchain, news research—research agents that scour sources and return a briefing.

## Setup

1. \`openclaw onboard --install-daemon\`
2. \`openclaw gateway --port 18789\`
3. Fork VINCE repo, run orchestrator. See openclaw-agents/HOW-TO-RUN.md.

OpenClaw + openclaw-agents = research agents, today.`;

export const openclawAiResearchAgentsAction: Action = {
  name: "OPENCLAW_AI_RESEARCH_AGENTS",
  similes: ["OPENCLAW_AI_RESEARCH_AGENTS", "AI_RESEARCH_AGENTS", "RESEARCH_AGENT_GUIDE"],
  description:
    "Explain research agents from ai-2027.com and OpenClaw docs (AI 2027 framing, Gateway + openclaw-agents orchestrator). Use when the user asks about research agent, AI agent, coding agent, automate research.",
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text = (message?.content?.text ?? "").toLowerCase() + (state?.text ?? "").toLowerCase();
    return (
      /research\s*agent/i.test(text) ||
      /(?:ai|coding)\s*agent/i.test(text) ||
      /automate\s*research/i.test(text) ||
      /agent\s*that\s*scour/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    if (callback) await callback({ text: AI_RESEARCH_AGENTS_MD, actions: ["OPENCLAW_AI_RESEARCH_AGENTS"] });
    return { success: true, text: AI_RESEARCH_AGENTS_MD };
  },
  examples: [
    [
      { name: "user", content: { text: "What are research agents?" } },
      { name: "assistant", content: { text: AI_RESEARCH_AGENTS_MD.slice(0, 500) + "...", actions: ["OPENCLAW_AI_RESEARCH_AGENTS"] } },
    ],
    [
      { name: "user", content: { text: "How does OpenClaw relate to AI agents?" } },
      { name: "assistant", content: { text: AI_RESEARCH_AGENTS_MD.slice(0, 500) + "...", actions: ["OPENCLAW_AI_RESEARCH_AGENTS"] } },
    ],
  ],
};
